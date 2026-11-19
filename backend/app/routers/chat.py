from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.user import User
from app.schemas.chat import ChatRequest
from app.services import rag_service
from app.services.auth_service import get_optional_user
from app.config import settings

router = APIRouter()


@router.post("/chat/stream")
async def chat_stream(
    payload: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    # 1. Authorization check on conversation_id (prevent user & cross-guest IDOR)
    if payload.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == payload.conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.user_id:
            if not current_user or current_user.id != conv.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to access this conversation",
                )
        elif conv.session_id:
            if x_session_id != conv.session_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to access this guest conversation",
                )

    # 2. Authorization check on requested document_ids (prevent cross-user and cross-guest document leakage)
    if payload.document_ids:
        for doc_id in payload.document_ids:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if not doc:
                raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
            if current_user:
                if doc.user_id is not None and doc.user_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have access to one or more requested documents",
                    )
            else:
                is_own_guest_doc = bool(x_session_id and doc.session_id == x_session_id and doc.user_id is None)
                is_public_doc = bool(doc.user_id is None and doc.session_id is None)
                if not (is_own_guest_doc or is_public_doc):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have access to documents from other sessions",
                    )

    generator = rag_service.answer_stream(
        question=payload.question,
        conversation_id=payload.conversation_id,
        document_ids=payload.document_ids,
        db=db,
        settings=settings,
        user_id=current_user.id if current_user else None,
        session_id=x_session_id,
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
