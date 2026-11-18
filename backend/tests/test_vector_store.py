import pytest
from unittest.mock import MagicMock, patch


def _make_mock_collection():
    coll = MagicMock()
    coll.count.return_value = 0
    coll.query.return_value = {
        "documents": [["chunk text"]],
        "metadatas": [[{"document_id": "d1", "filename": "a.pdf", "page_number": 1, "chunk_index": 0}]],
        "distances": [[0.1]],
    }
    return coll


def test_add_chunks_calls_upsert():
    with patch("app.rag.vector_store._get_collection") as mock_get_coll:
        coll = _make_mock_collection()
        mock_get_coll.return_value = coll

        from app.rag.vector_store import add_chunks
        chunks = [{"chunk_id": "id1", "text": "hello", "document_id": "d1",
                   "filename": "a.pdf", "page_number": 1, "chunk_index": 0}]
        embeddings = [[0.1, 0.2, 0.3]]
        add_chunks(chunks, embeddings)
        coll.upsert.assert_called_once()


def test_search_returns_list():
    with patch("app.rag.vector_store._get_collection") as mock_get_coll:
        coll = _make_mock_collection()
        mock_get_coll.return_value = coll

        from app.rag.vector_store import search
        results = search([0.1, 0.2, 0.3], top_k=5)
        assert isinstance(results, list)
        assert len(results) == 1
        assert results[0]["text"] == "chunk text"


def test_search_with_document_ids_filter():
    with patch("app.rag.vector_store._get_collection") as mock_get_coll:
        coll = _make_mock_collection()
        mock_get_coll.return_value = coll

        from app.rag.vector_store import search
        search([0.1, 0.2], top_k=3, document_ids=["d1"])
        call_kwargs = coll.query.call_args.kwargs
        assert "where" in call_kwargs
        assert call_kwargs["where"]["document_id"]["$eq"] == "d1"


def test_delete_by_document_id():
    with patch("app.rag.vector_store._get_collection") as mock_get_coll:
        coll = _make_mock_collection()
        mock_get_coll.return_value = coll

        from app.rag.vector_store import delete_by_document_id
        delete_by_document_id("d1")
        coll.delete.assert_called_once_with(where={"document_id": {"$eq": "d1"}})


def test_get_collection_count():
    with patch("app.rag.vector_store._get_collection") as mock_get_coll:
        coll = _make_mock_collection()
        coll.count.return_value = 42
        mock_get_coll.return_value = coll

        from app.rag.vector_store import get_collection_count
        count = get_collection_count()
        assert count == 42


def test_search_multiple_document_ids_uses_in():
    with patch("app.rag.vector_store._get_collection") as mock_get_coll:
        coll = _make_mock_collection()
        mock_get_coll.return_value = coll

        from app.rag.vector_store import search
        search([0.1, 0.2], top_k=5, document_ids=["d1", "d2"])
        call_kwargs = coll.query.call_args.kwargs
        assert call_kwargs["where"]["document_id"]["$in"] == ["d1", "d2"]
