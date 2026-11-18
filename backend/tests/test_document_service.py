import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.document import Document


def _make_test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


def _make_upload_file(content: bytes, filename: str = "test.pdf", content_type: str = "application/pdf") -> UploadFile:
    from starlette.datastructures import Headers
    return UploadFile(file=io.BytesIO(content), filename=filename, headers=Headers({"content-type": content_type}))


@pytest.mark.asyncio
async def test_ingest_validates_extension():
    from app.services.document_service import ingest_document
    from fastapi import HTTPException

    db = _make_test_db()
    upload = _make_upload_file(b"data", filename="bad.txt", content_type="application/pdf")
    with pytest.raises(HTTPException) as exc_info:
        await ingest_document(upload, db)
    assert exc_info.value.status_code == 400
    db.close()


@pytest.mark.asyncio
async def test_ingest_validates_mime_type():
    from app.services.document_service import ingest_document
    from fastapi import HTTPException

    db = _make_test_db()
    upload = _make_upload_file(b"data", filename="file.pdf", content_type="text/plain")
    with pytest.raises(HTTPException) as exc_info:
        await ingest_document(upload, db)
    assert exc_info.value.status_code == 400
    db.close()


@pytest.mark.asyncio
async def test_ingest_file_too_large():
    from app.services.document_service import ingest_document, _validate_file
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        _validate_file("file.pdf", "application/pdf", 999 * 1024 * 1024)
    assert exc_info.value.status_code == 413


@pytest.mark.asyncio
async def test_duplicate_detection():
    import fitz
    from app.services.document_service import ingest_document
    from fastapi import HTTPException

    db = _make_test_db()

    # Build a real minimal PDF
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Hello duplicate test")
    pdf_bytes = bytes(doc.write())
    doc.close()

    with patch("app.services.document_service.extract_pdf_pages") as mock_extract, \
         patch("app.services.document_service.chunk_document") as mock_chunk, \
         patch("app.services.document_service.get_embedder") as mock_emb, \
         patch("app.services.document_service.vector_store") as mock_vs:

        mock_extract.return_value = [{"page": 1, "text": "Hello duplicate test"}]
        mock_chunk.return_value = [{"chunk_id": "c1", "text": "Hello duplicate test",
                                    "document_id": "d1", "filename": "test.pdf",
                                    "page_number": 1, "chunk_index": 0}]
        mock_embedder = MagicMock()
        mock_embedder.embed.return_value = [[0.1, 0.2]]
        mock_emb.return_value = mock_embedder
        mock_vs.add_chunks = MagicMock()

        upload1 = _make_upload_file(pdf_bytes, filename="test.pdf")
        doc1 = await ingest_document(upload1, db)

        upload2 = _make_upload_file(pdf_bytes, filename="test.pdf")
        doc2 = await ingest_document(upload2, db)
        assert doc2.id == doc1.id
        assert doc2.status == "completed"

    db.close()


def test_get_document_not_found():
    from app.services.document_service import get_document
    from fastapi import HTTPException
    db = _make_test_db()
    with pytest.raises(HTTPException) as exc_info:
        get_document("nonexistent-id", db)
    assert exc_info.value.status_code == 404
    db.close()


def test_get_all_documents_empty():
    from app.services.document_service import get_all_documents
    db = _make_test_db()
    result = get_all_documents(db)
    assert result == []
    db.close()
