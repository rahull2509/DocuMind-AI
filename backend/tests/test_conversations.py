import uuid
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base
from app.models.conversation import Conversation, Message


def _make_test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return engine, Session()


def test_create_conversation_via_model():
    _, db = _make_test_db()
    conv = Conversation(
        id=str(uuid.uuid4()),
        title="Test Conversation",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(conv)
    db.commit()
    result = db.query(Conversation).filter(Conversation.title == "Test Conversation").first()
    assert result is not None
    assert result.title == "Test Conversation"
    db.close()


def test_delete_conversation_cascades_messages():
    _, db = _make_test_db()
    conv_id = str(uuid.uuid4())
    conv = Conversation(id=conv_id, title="To delete", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    db.add(conv)
    db.flush()

    msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        role="user",
        content="hello",
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()

    db.delete(conv)
    db.commit()

    messages = db.query(Message).filter(Message.conversation_id == conv_id).all()
    assert messages == []
    db.close()


def test_multiple_conversations():
    _, db = _make_test_db()
    for i in range(3):
        conv = Conversation(
            id=str(uuid.uuid4()), title=f"Conv {i}",
            created_at=datetime.utcnow(), updated_at=datetime.utcnow()
        )
        db.add(conv)
    db.commit()
    all_convs = db.query(Conversation).all()
    assert len(all_convs) == 3
    db.close()


def test_message_role_values():
    _, db = _make_test_db()
    conv_id = str(uuid.uuid4())
    conv = Conversation(id=conv_id, title="Role test", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    db.add(conv)
    db.flush()

    for role in ["user", "assistant"]:
        msg = Message(
            id=str(uuid.uuid4()), conversation_id=conv_id,
            role=role, content=f"{role} message", created_at=datetime.utcnow()
        )
        db.add(msg)
    db.commit()

    messages = db.query(Message).filter(Message.conversation_id == conv_id).all()
    roles = {m.role for m in messages}
    assert roles == {"user", "assistant"}
    db.close()


def test_update_conversation_title():
    _, db = _make_test_db()
    conv = Conversation(id=str(uuid.uuid4()), title="Old title",
                        created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    db.add(conv)
    db.commit()
    db.refresh(conv)
    conv.title = "New title"
    db.commit()
    db.refresh(conv)
    assert conv.title == "New title"
    db.close()
