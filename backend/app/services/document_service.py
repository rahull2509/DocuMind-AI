import hashlib
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.models.document import Document
from app.rag.pdf_extractor import extract_pdf_pages
from app.rag.chunker import chunk_document
from app.rag.embedder import get_embedder
from app.rag import vector_store


ALLOWED_MIME_TYPES = {"application/pdf"}
ALLOWED_EXTENSIONS = {".pdf"}


def _validate_file(filename: str, content_type: str, size: int) -> None:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Only PDF files are accepted. Got extension: {ext}")
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Only PDF MIME type is accepted. Got: {content_type}")
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB} MB.",
        )


def _compute_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


async def ingest_document(file: UploadFile, db: Session) -> Document:
    """
    Full ingestion pipeline:
    1. Validate, 2. Hash, 3. Dedup, 4. Save, 5. DB record,
    6. Extract, 7. Chunk, 8. Embed, 9. Store, 10. Update DB.
    """
    file_bytes = await file.read()
    file_size = len(file_bytes)
    original_filename = file.filename or "unknown.pdf"
    content_type = file.content_type or "application/octet-stream"

    _validate_file(original_filename, content_type, file_size)

    file_hash = _compute_hash(file_bytes)

    # Duplicate / re-upload handling
    existing = db.query(Document).filter(Document.file_hash == file_hash).first()
    if existing:
        # Re-index existing document cleanly without throwing 409 Conflict
        try:
            vector_store.delete_by_document_id(existing.id)
        except Exception:
            pass
        doc_id = existing.id
        stored_path = existing.stored_path or os.path.join(settings.STORAGE_PATH, f"{uuid.uuid4()}.pdf")
        os.makedirs(settings.STORAGE_PATH, exist_ok=True)
        with open(stored_path, "wb") as f:
            f.write(file_bytes)

        existing.original_filename = original_filename
        existing.stored_path = stored_path
        existing.file_size = file_size
        existing.status = "processing"
        existing.error_message = None
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        document = existing
    else:
        # Safe storage path (UUID, never user-provided name)
        safe_name = f"{uuid.uuid4()}.pdf"
        os.makedirs(settings.STORAGE_PATH, exist_ok=True)
        stored_path = os.path.join(settings.STORAGE_PATH, safe_name)

        with open(stored_path, "wb") as f:
            f.write(file_bytes)

        # Create DB record
        doc_id = str(uuid.uuid4())
        now = datetime.utcnow()
        document = Document(
            id=doc_id,
            filename=safe_name,
            original_filename=original_filename,
            stored_path=stored_path,
            file_hash=file_hash,
            file_size=file_size,
            status="uploading",
            created_at=now,
            updated_at=now,
        )
        db.add(document)
        db.commit()
        db.refresh(document)

    try:
        document.status = "processing"
        document.updated_at = datetime.utcnow()
        db.commit()

        # Extract
        pages = extract_pdf_pages(file_bytes)

        # Chunk
        chunks = chunk_document(
            pages=pages,
            document_id=doc_id,
            filename=original_filename,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )

        # Embed
        texts = [c["text"] for c in chunks]
        embedder = get_embedder()
        embeddings = embedder.embed(texts)

        # Store in ChromaDB
        vector_store.add_chunks(chunks, embeddings)

        # Finalize
        document.status = "completed"
        document.page_count = len(pages)
        document.chunk_count = len(chunks)
        document.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(document)

    except Exception as exc:
        document.status = "failed"
        document.error_message = str(exc)
        document.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(document)

    return document


def get_all_documents(db: Session) -> list[Document]:
    return db.query(Document).order_by(Document.created_at.desc()).all()


def get_document(document_id: str, db: Session) -> Document:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def delete_document(document_id: str, db: Session) -> None:
    doc = get_document(document_id, db)

    # Delete from ChromaDB
    try:
        vector_store.delete_by_document_id(document_id)
    except Exception:
        pass

    # Delete file from disk
    if doc.stored_path and os.path.exists(doc.stored_path):
        try:
            os.remove(doc.stored_path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()
