import pytest
import hashlib
from app.rag.chunker import chunk_document, _sliding_window, _make_chunk_id


SAMPLE_PAGES = [
    {"page": 1, "text": "A" * 3000},  # will be chunked
    {"page": 2, "text": "Short text"},  # fits in one chunk
]


def test_basic_chunking():
    chunks = chunk_document(SAMPLE_PAGES, "doc-1", "test.pdf")
    assert len(chunks) > 0


def test_chunk_stays_within_page():
    chunks = chunk_document(SAMPLE_PAGES, "doc-1", "test.pdf", chunk_size=1000, chunk_overlap=100)
    # Page 1 should produce multiple chunks, all with page_number=1
    page1_chunks = [c for c in chunks if c["page_number"] == 1]
    assert len(page1_chunks) > 1
    # No cross-page merging
    for c in chunks:
        assert c["page_number"] in [1, 2]


def test_chunk_id_is_deterministic():
    chunks1 = chunk_document(SAMPLE_PAGES, "doc-1", "test.pdf")
    chunks2 = chunk_document(SAMPLE_PAGES, "doc-1", "test.pdf")
    ids1 = [c["chunk_id"] for c in chunks1]
    ids2 = [c["chunk_id"] for c in chunks2]
    assert ids1 == ids2


def test_chunk_id_format():
    chunk_id = _make_chunk_id("doc-1", 1, 0)
    assert len(chunk_id) == 64  # sha256 hex = 64 chars


def test_chunk_dict_keys():
    chunks = chunk_document(SAMPLE_PAGES, "doc-1", "test.pdf")
    required_keys = {"document_id", "filename", "page_number", "chunk_index", "chunk_id", "text"}
    for chunk in chunks:
        assert required_keys.issubset(set(chunk.keys()))


def test_sliding_window_single():
    result = _sliding_window("hello", 100, 10)
    assert result == ["hello"]


def test_sliding_window_multiple():
    text = "X" * 100
    result = _sliding_window(text, 40, 10)
    assert len(result) > 1
    # Each chunk should be at most 40 chars
    for c in result:
        assert len(c) <= 40


def test_empty_pages_skipped():
    pages = [{"page": 1, "text": ""}, {"page": 2, "text": "Real content"}]
    chunks = chunk_document(pages, "doc-1", "test.pdf")
    assert all(c["page_number"] == 2 for c in chunks)
