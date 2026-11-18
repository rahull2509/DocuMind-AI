from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
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
    db: Session = Depends(get_db),
):
    generator = rag_service.answer_stream(
        question=payload.question,
        conversation_id=payload.conversation_id,
        document_ids=payload.document_ids,
        db=db,
        settings=settings,
        user_id=current_user.id if current_user else None,
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
