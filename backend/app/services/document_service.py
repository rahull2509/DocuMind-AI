import hashlib
import os
import uuid
from typing import Optional, List

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.models.document import Document
from app.rag.pdf_extractor import extract_pdf_pages
from app.rag.chunker import chunk_document
from app.rag.embedder import get_embedder
from app.rag import vector_store
from app.utils.datetime_utils import utc_now


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


async def ingest_document(
    file: UploadFile,
    db: Session,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> Document:
    """
    Full ingestion pipeline with strict tenant and guest session isolation:
    1. Validate, 2. Enforce Ownership, 3. Hash, 4. Scoped Dedup, 5. Save disk,
    6. DB record, 7. Extract, 8. Chunk, 9. Embed, 10. Store vectors, 11. Finalize.
    """
    # Enforce mandatory ownership: every uploaded document MUST belong to an authenticated user or guest session
    if not user_id and not session_id:
        raise HTTPException(
            status_code=400,
            detail="Ownership identifier required. Provide Authorization token or X-Session-ID header.",
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)
    original_filename = file.filename or "unknown.pdf"
    content_type = file.content_type or "application/octet-stream"

    _validate_file(original_filename, content_type, file_size)

    file_hash = _compute_hash(file_bytes)

    # Scoped duplicate / re-upload handling
    existing_query = db.query(Document).filter(Document.file_hash == file_hash)
    if user_id:
        existing_query = existing_query.filter(Document.user_id == user_id)
    else:
        existing_query = existing_query.filter(Document.user_id.is_(None), Document.session_id == session_id)

    existing = existing_query.first()
    if existing:
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
        existing.updated_at = utc_now()
        db.commit()
        db.refresh(existing)
        document = existing
    else:
        safe_name = f"{uuid.uuid4()}.pdf"
        os.makedirs(settings.STORAGE_PATH, exist_ok=True)
        stored_path = os.path.join(settings.STORAGE_PATH, safe_name)

        with open(stored_path, "wb") as f:
            f.write(file_bytes)

        doc_id = str(uuid.uuid4())
        now = utc_now()
        document = Document(
            id=doc_id,
            user_id=user_id,
            session_id=session_id if not user_id else None,
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
        document.updated_at = utc_now()
        db.commit()

        # Extract (with max page validation and scanned PDF rejection)
        pages = extract_pdf_pages(file_bytes, max_pages=settings.MAX_PAGE_COUNT)

        # Token-aware Chunking without destructive truncation
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

        # Store in ChromaDB / Fallback
        vector_store.add_chunks(chunks, embeddings)

        # Finalize
        document.status = "completed"
        document.page_count = len(pages)
        document.chunk_count = len(chunks)
        document.updated_at = utc_now()
        db.commit()
        db.refresh(document)
        return document

    except Exception as exc:
        document.status = "failed"
        document.error_message = str(exc)
        document.updated_at = utc_now()
        db.commit()
        db.refresh(document)
        # Raise HTTPException so API and caller immediately receive the failure
        raise HTTPException(
            status_code=422,
            detail=f"Document indexing failed: {exc}",
        )


def get_all_documents(
    db: Session,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> List[Document]:
    """Retrieve all documents strictly scoped to the requesting user or guest session."""
    if user_id:
        return db.query(Document).filter(Document.user_id == user_id).order_by(Document.created_at.desc()).all()
    elif session_id:
        return db.query(Document).filter(
            Document.user_id.is_(None),
            Document.session_id == session_id,
        ).order_by(Document.created_at.desc()).all()
    return []


def get_document(
    document_id: str,
    db: Session,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> Document:
    """Retrieve a document with strict access control and ownership validation."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Authenticated user document
    if doc.user_id:
        if not user_id or doc.user_id != user_id:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc

    # Guest session document
    if doc.session_id:
        if not session_id or doc.session_id != session_id:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc

    raise HTTPException(status_code=404, detail="Document not found")


def delete_document(
    document_id: str,
    db: Session,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> None:
    """Delete a document and its stored vectors with strict ownership validation."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify ownership
    if doc.user_id:
        if not user_id or doc.user_id != user_id:
            raise HTTPException(status_code=404, detail="Document not found")
    elif doc.session_id:
        if not session_id or doc.session_id != session_id:
            raise HTTPException(status_code=404, detail="Document not found")
    else:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from ChromaDB and SQLite fallback store
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
