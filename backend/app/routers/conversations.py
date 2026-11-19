import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationDetailResponse,
)
from app.services.auth_service import get_optional_user
from app.utils.datetime_utils import utc_now

router = APIRouter()


@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    current_user: Optional[User] = Depends(get_optional_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    if current_user:
        return (
            db.query(Conversation)
            .filter(Conversation.user_id == current_user.id)
            .order_by(Conversation.updated_at.desc())
            .all()
        )
    elif x_session_id:
        return (
            db.query(Conversation)
            .filter(
                Conversation.user_id.is_(None),
                Conversation.session_id == x_session_id,
            )
            .order_by(Conversation.updated_at.desc())
            .all()
        )
    return []


@router.post("/conversations", response_model=ConversationResponse)
def create_conversation(
    payload: ConversationCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    now = utc_now()
    conversation = Conversation(
        id=str(uuid.uuid4()),
        user_id=current_user.id if current_user else None,
        session_id=x_session_id if not current_user else None,
        title=payload.title.strip() if payload.title else "New Conversation",
        created_at=now,
        updated_at=now,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Access control:
    if conv.user_id:
        if not current_user or current_user.id != conv.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this conversation",
            )
    elif conv.session_id:
        if x_session_id != conv.session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this conversation",
            )

    return conv


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
def update_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    current_user: Optional[User] = Depends(get_optional_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conv.user_id:
        if not current_user or current_user.id != conv.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this conversation",
            )
    elif conv.session_id:
        if x_session_id != conv.session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this conversation",
            )

    conv.title = payload.title.strip()
    conv.updated_at = utc_now()
    db.commit()
    db.refresh(conv)
    return conv


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conv.user_id:
        if not current_user or current_user.id != conv.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this conversation",
            )
    elif conv.session_id:
        if x_session_id != conv.session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this conversation",
            )

    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted", "id": conversation_id}
