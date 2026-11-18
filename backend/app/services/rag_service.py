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
) -> AsyncGenerator[str, None]:
    """
    RAG streaming pipeline. Yields SSE-formatted data strings.
    """
    try:
        # Ensure conversation exists
        if conversation_id:
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if not conversation:
                conversation_id = None

        if not conversation_id:
            conversation = Conversation(
                id=str(uuid.uuid4()),
                title=question[:60] if len(question) > 60 else question,
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

        # 2. Search ChromaDB
        results = vector_store.search(
            query_embedding=query_embedding,
            top_k=settings.TOP_K,
            document_ids=document_ids if document_ids else None,
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
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
