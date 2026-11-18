import pytest
import fitz
from unittest.mock import MagicMock, patch
from app.rag.pdf_extractor import extract_pdf_pages


def _make_pdf_bytes(texts: list[str]) -> bytes:
    """Create a minimal in-memory PDF with given page texts."""
    doc = fitz.open()
    for text in texts:
        page = doc.new_page()
        if text:
            page.insert_text((72, 72), text)
    buf = doc.write()
    doc.close()
    return bytes(buf)


def test_extract_single_page():
    pdf_bytes = _make_pdf_bytes(["Hello, DocuMind!"])
    pages = extract_pdf_pages(pdf_bytes)
    assert len(pages) == 1
    assert pages[0]["page"] == 1
    assert "Hello" in pages[0]["text"]


def test_extract_multiple_pages():
    pdf_bytes = _make_pdf_bytes(["Page one content", "Page two content", "Page three content"])
    pages = extract_pdf_pages(pdf_bytes)
    assert len(pages) == 3
    assert pages[0]["page"] == 1
    assert pages[2]["page"] == 3


def test_skip_empty_pages():
    pdf_bytes = _make_pdf_bytes(["Real content", "", "More real content"])
    pages = extract_pdf_pages(pdf_bytes)
    # Empty page should be skipped
    page_numbers = [p["page"] for p in pages]
    assert 2 not in page_numbers
    assert len(pages) == 2


def test_all_empty_raises_value_error():
    pdf_bytes = _make_pdf_bytes(["", "   ", "\n"])
    with pytest.raises(ValueError, match="image-only"):
        extract_pdf_pages(pdf_bytes)


def test_invalid_bytes_raises_value_error():
    with pytest.raises(ValueError, match="Failed to open PDF"):
        extract_pdf_pages(b"not a pdf at all")


def test_page_dict_structure():
    pdf_bytes = _make_pdf_bytes(["Some text here"])
    pages = extract_pdf_pages(pdf_bytes)
    assert "page" in pages[0]
    assert "text" in pages[0]
    assert isinstance(pages[0]["page"], int)
    assert isinstance(pages[0]["text"], str)
