from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.services import document_service
from app.services.auth_service import get_optional_user

router = APIRouter()


@router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    document = await document_service.ingest_document(
        file=file,
        db=db,
        user_id=current_user.id if current_user else None,
    )
    return document


@router.get("/documents", response_model=DocumentListResponse)
def list_documents(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    docs = document_service.get_all_documents(db, user_id=user_id)
    return {"documents": docs, "total": len(docs)}


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    return document_service.get_document(document_id, db, user_id=user_id)


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    document_service.delete_document(document_id, db, user_id=user_id)
    return {"message": "Document deleted successfully", "id": document_id}
