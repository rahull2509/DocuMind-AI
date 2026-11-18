from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.services import document_service

router = APIRouter()


@router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    document = await document_service.ingest_document(file, db)
    return document


@router.get("/documents", response_model=DocumentListResponse)
def list_documents(db: Session = Depends(get_db)):
    docs = document_service.get_all_documents(db)
    return {"documents": docs, "total": len(docs)}


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    return document_service.get_document(document_id, db)


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    document_service.delete_document(document_id, db)
    return {"message": "Document deleted successfully", "id": document_id}
