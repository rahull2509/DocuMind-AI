import json
import uuid
from datetime import datetime
from typing import AsyncGenerator, List, Optional

from sqlalchemy.orm import Session

from app.config import Settings
from app.models.conversation import Conversation, Message
from app.rag.embedder import get_embedder
from app.rag import vector_store, prompt as prompt_module
from app.services import ollama_service


async def answer_stream(
    question: str,
    conversation_id: Optional[str],
    document_ids: Optional[List[str]],
    db: Session,
    settings: Settings,
    user_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    RAG streaming pipeline. Yields SSE-formatted data strings.
    """
    try:
        # Ensure conversation exists
        if conversation_id:
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if conversation:
                # Link to user if not linked yet
                if not conversation.user_id and user_id:
                    conversation.user_id = user_id
                # Auto-generate conversation title from first question if still default
                if conversation.title in ("New Conversation", "New Chat", "") and question.strip():
                    conversation.title = question.strip()[:60]
                db.commit()
            else:
                conversation_id = None

        if not conversation_id:
            clean_title = question.strip()[:60] if question.strip() else "New Conversation"
            conversation = Conversation(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title=clean_title,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            conversation_id = conversation.id

        # 1. Embed question
        embedder = get_embedder()
        query_embedding = embedder.embed([question])[0]

        # 2. Scope search to user's documents
        effective_doc_ids = None
        if user_id:
            from app.models.document import Document
            user_doc_rows = db.query(Document.id).filter(Document.user_id == user_id).all()
            user_doc_ids = [r[0] for r in user_doc_rows]
            if document_ids:
                effective_doc_ids = [d for d in document_ids if d in user_doc_ids]
            else:
                effective_doc_ids = user_doc_ids
        elif document_ids:
            effective_doc_ids = document_ids

        # 3. Search ChromaDB
        results = vector_store.search(
            query_embedding=query_embedding,
            top_k=settings.TOP_K,
            document_ids=effective_doc_ids,
        )

        # 3. Build context & prompt
        built_prompt = prompt_module.build_prompt(question, results)

        # 8. Persist user message BEFORE yielding sources
        user_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="user",
            content=question,
            created_at=datetime.utcnow(),
        )
        db.add(user_message)
        db.commit()

        # 5. Yield sources event
        sources = [
            {
                "text": r["text"],
                "filename": r["filename"],
                "page_number": r["page_number"],
                "chunk_index": r["chunk_index"],
                "distance": r["distance"],
            }
            for r in results
        ]
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

        # 6. Stream tokens
        full_response = ""
        async for token in ollama_service.generate_stream(
            url=settings.OLLAMA_URL,
            model=settings.OLLAMA_MODEL,
            prompt=built_prompt,
            temperature=settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS,
        ):
            full_response += token
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

        # 9. Persist assistant message
        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="assistant",
            content=full_response,
            sources_json=json.dumps(sources),
            created_at=datetime.utcnow(),
        )
        db.add(assistant_message)

        # 10. Update conversation updated_at
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conversation:
            conversation.updated_at = datetime.utcnow()

        db.commit()

        # 11. Done event
        current_title = conversation.title if conversation else None
        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id, 'title': current_title})}\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
