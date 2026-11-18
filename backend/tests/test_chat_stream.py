import json
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


def _get_app():
    # Patch heavy imports before importing app
    with patch("app.rag.embedder.SentenceTransformer"), \
         patch("app.rag.vector_store._get_client"):
        from app.database import init_db
        init_db()
        from app.main import app
        return app


def test_chat_stream_returns_event_stream():
    with patch("app.services.rag_service.get_embedder") as mock_emb, \
         patch("app.services.rag_service.vector_store") as mock_vs, \
         patch("app.services.rag_service.ollama_service") as mock_ollama, \
         patch("app.rag.embedder.SentenceTransformer"), \
         patch("app.rag.vector_store._get_client"):

        from app.database import init_db
        init_db()

        mock_embedder = MagicMock()
        mock_embedder.embed.return_value = [[0.1, 0.2]]
        mock_emb.return_value = mock_embedder
        mock_vs.search.return_value = []

        async def fake_stream(*args, **kwargs):
            yield "test token"

        mock_ollama.generate_stream = fake_stream

        from app.main import app
        client = TestClient(app, raise_server_exceptions=False)

        response = client.post(
            "/api/chat/stream",
            json={"question": "What is in the docs?"},
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")


def test_chat_stream_response_contains_sources():
    with patch("app.services.rag_service.get_embedder") as mock_emb, \
         patch("app.services.rag_service.vector_store") as mock_vs, \
         patch("app.services.rag_service.ollama_service") as mock_ollama, \
         patch("app.rag.embedder.SentenceTransformer"), \
         patch("app.rag.vector_store._get_client"):

        from app.database import init_db
        init_db()

        mock_embedder = MagicMock()
        mock_embedder.embed.return_value = [[0.1, 0.2]]
        mock_emb.return_value = mock_embedder
        mock_vs.search.return_value = [{
            "text": "ctx", "filename": "a.pdf",
            "page_number": 1, "chunk_index": 0, "distance": 0.1
        }]

        async def fake_stream(*args, **kwargs):
            yield "answer"

        mock_ollama.generate_stream = fake_stream

        from app.main import app
        client = TestClient(app, raise_server_exceptions=False)

        response = client.post(
            "/api/chat/stream",
            json={"question": "Tell me about the doc"},
        )
        body = response.text
        assert "sources" in body


def test_chat_stream_no_cache_header():
    with patch("app.services.rag_service.get_embedder") as mock_emb, \
         patch("app.services.rag_service.vector_store") as mock_vs, \
         patch("app.services.rag_service.ollama_service") as mock_ollama, \
         patch("app.database.init_db"), \
         patch("app.rag.embedder.SentenceTransformer"), \
         patch("app.rag.vector_store._get_client"):

        mock_embedder = MagicMock()
        mock_embedder.embed.return_value = [[0.1]]
        mock_emb.return_value = mock_embedder
        mock_vs.search.return_value = []

        async def fake_stream(*args, **kwargs):
            yield "ok"

        mock_ollama.generate_stream = fake_stream

        from app.main import app
        client = TestClient(app, raise_server_exceptions=False)

        response = client.post("/api/chat/stream", json={"question": "Q"})
        assert response.headers.get("cache-control") == "no-cache"


def test_chat_stream_missing_question():
    with patch("app.database.init_db"), \
         patch("app.rag.embedder.SentenceTransformer"), \
         patch("app.rag.vector_store._get_client"):
        from app.main import app
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post("/api/chat/stream", json={})
        assert response.status_code == 422
