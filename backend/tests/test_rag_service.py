import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, AsyncMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.conversation import Conversation, Message


def _make_test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


async def _collect_stream(gen):
    results = []
    async for item in gen:
        results.append(item)
    return results


@pytest.mark.asyncio
async def test_answer_stream_yields_sources():
    db = _make_test_db()

    with patch("app.services.rag_service.get_embedder") as mock_emb, \
         patch("app.services.rag_service.vector_store") as mock_vs, \
         patch("app.services.rag_service.ollama_service") as mock_ollama:

        mock_embedder = MagicMock()
        mock_embedder.embed.return_value = [[0.1, 0.2]]
        mock_emb.return_value = mock_embedder

        mock_vs.search.return_value = [{
            "text": "ctx", "filename": "a.pdf", "page_number": 1,
            "chunk_index": 0, "distance": 0.1
        }]

        async def fake_stream(*args, **kwargs):
            yield "hello"
            yield " world"

        mock_ollama.generate_stream = fake_stream

        from app.services.rag_service import answer_stream
        from app.config import settings

        events = await _collect_stream(
            answer_stream("What is this?", None, None, db, settings)
        )

        types = []
        for e in events:
            data = e.replace("data: ", "").strip()
            if data:
                types.append(json.loads(data)["type"])

        assert "sources" in types
        assert "token" in types
        assert "done" in types

    db.close()


@pytest.mark.asyncio
async def test_answer_stream_persists_messages():
    db = _make_test_db()

    with patch("app.services.rag_service.get_embedder") as mock_emb, \
         patch("app.services.rag_service.vector_store") as mock_vs, \
         patch("app.services.rag_service.ollama_service") as mock_ollama:

        mock_embedder = MagicMock()
        mock_embedder.embed.return_value = [[0.1, 0.2]]
        mock_emb.return_value = mock_embedder
        mock_vs.search.return_value = []

        async def fake_stream(*args, **kwargs):
            yield "answer"

        mock_ollama.generate_stream = fake_stream

        from app.services.rag_service import answer_stream
        from app.config import settings

        events = await _collect_stream(
            answer_stream("My question", None, None, db, settings)
        )

        messages = db.query(Message).all()
        roles = [m.role for m in messages]
        assert "user" in roles
        assert "assistant" in roles

    db.close()


@pytest.mark.asyncio
async def test_answer_stream_uses_existing_conversation():
    db = _make_test_db()
    from datetime import datetime

    conv = Conversation(id="conv-123", title="Test", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    db.add(conv)
    db.commit()

    with patch("app.services.rag_service.get_embedder") as mock_emb, \
         patch("app.services.rag_service.vector_store") as mock_vs, \
         patch("app.services.rag_service.ollama_service") as mock_ollama:

        mock_embedder = MagicMock()
        mock_embedder.embed.return_value = [[0.1]]
        mock_emb.return_value = mock_embedder
        mock_vs.search.return_value = []

        async def fake_stream(*args, **kwargs):
            yield "ok"

        mock_ollama.generate_stream = fake_stream

        from app.services.rag_service import answer_stream
        from app.config import settings

        await _collect_stream(
            answer_stream("Q", "conv-123", None, db, settings)
        )

        msgs = db.query(Message).filter(Message.conversation_id == "conv-123").all()
        assert len(msgs) == 2  # user + assistant

    db.close()


@pytest.mark.asyncio
async def test_answer_stream_error_yields_error_event():
    db = _make_test_db()

    with patch("app.services.rag_service.get_embedder") as mock_emb:
        mock_emb.side_effect = RuntimeError("embed failed")

        from app.services.rag_service import answer_stream
        from app.config import settings

        events = await _collect_stream(
            answer_stream("Q", None, None, db, settings)
        )

        assert any('"type": "error"' in e for e in events)

    db.close()
