import json
import uuid
from typing import AsyncGenerator, List, Optional

from sqlalchemy.orm import Session

from app.config import Settings
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.rag.embedder import get_embedder
from app.rag import vector_store, prompt as prompt_module
from app.services import ollama_service
from app.utils.datetime_utils import utc_now


async def answer_stream(
    question: str,
    conversation_id: Optional[str],
    document_ids: Optional[List[str]],
    db: Session,
    settings: Settings,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    RAG streaming pipeline with strict tenant and guest session isolation,
    hybrid retrieval, and verified citations. Yields SSE-formatted data strings.
    """
    try:
        now = utc_now()

        # 1. Ensure conversation exists and validate ownership (IDOR check)
        if conversation_id:
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if conversation:
                # If conversation belongs to another user, forbid access
                if conversation.user_id and conversation.user_id != user_id:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'You do not have permission to access this conversation.'})}\n\n"
                    return
                # If guest conversation belongs to another session, forbid access
                if conversation.session_id and not user_id and conversation.session_id != session_id:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'You do not have permission to access this guest conversation.'})}\n\n"
                    return

                # Migrate unassigned guest conversation if current user is logged in
                if not conversation.user_id and user_id:
                    conversation.user_id = user_id
                    conversation.session_id = None

                # Auto-generate title from first question if default
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
                session_id=session_id if not user_id else None,
                title=clean_title,
                created_at=now,
                updated_at=now,
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            conversation_id = conversation.id

        # 2. Scope search strictly to authorized documents (prevent multi-tenant / cross-guest data leaks)
        embedder = get_embedder()
        query_embedding = embedder.embed([question])[0]

        if user_id:
            user_doc_rows = db.query(Document.id).filter(Document.user_id == user_id).all()
            user_doc_ids = [r[0] for r in user_doc_rows]
            if document_ids:
                effective_doc_ids = [d for d in document_ids if d in user_doc_ids]
            else:
                effective_doc_ids = user_doc_ids
        elif session_id:
            # Guest session: allowed to query documents belonging to this unique guest session,
            # plus unassigned sample/public documents
            guest_doc_rows = db.query(Document.id).filter(
                Document.user_id.is_(None),
                (Document.session_id == session_id) | (Document.session_id.is_(None)),
            ).all()
            guest_doc_ids = [r[0] for r in guest_doc_rows]
            if document_ids:
                effective_doc_ids = [d for d in document_ids if d in guest_doc_ids]
            else:
                effective_doc_ids = guest_doc_ids
        else:
            # Unauthenticated without session -> allow public/sample docs if explicitly requested
            if document_ids:
                pub_rows = db.query(Document.id).filter(
                    Document.id.in_(document_ids),
                    Document.user_id.is_(None),
                    Document.session_id.is_(None),
                ).all()
                effective_doc_ids = [r[0] for r in pub_rows]
            else:
                effective_doc_ids = []

        # If user/guest has no documents, effective_doc_ids is [] -> searches nothing
        results = []
        if effective_doc_ids:
            results = vector_store.search(
                query_embedding=query_embedding,
                top_k=settings.TOP_K,
                document_ids=effective_doc_ids,
                query_text=question,
            )

        # 3. Build context & prompt
        built_prompt = prompt_module.build_prompt(question, results)

        # 4. Persist user message
        user_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="user",
            content=question,
            created_at=utc_now(),
        )
        db.add(user_message)
        db.commit()

        # 5. Yield sources event with section_title
        sources = [
            {
                "text": r["text"],
                "filename": r["filename"],
                "page_number": r["page_number"],
                "section_title": r.get("section_title", "General"),
                "chunk_index": r["chunk_index"],
                "distance": r["distance"],
            }
            for r in results
        ]
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

        # 6. Stream tokens from Ollama
        full_response = ""
        try:
            async for token in ollama_service.generate_stream(
                url=settings.OLLAMA_URL,
                model=settings.OLLAMA_MODEL,
                prompt=built_prompt,
                temperature=settings.TEMPERATURE,
                max_tokens=settings.MAX_TOKENS,
            ):
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
        except Exception as stream_err:
            error_note = f"\n\n*(Error communicating with local LLM: {stream_err})*"
            full_response += error_note
            yield f"data: {json.dumps({'type': 'token', 'token': error_note})}\n\n"

        # 7. Persist assistant message
        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="assistant",
            content=full_response,
            sources_json=json.dumps(sources),
            created_at=utc_now(),
        )
        db.add(assistant_message)

        # 8. Update conversation timestamp
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conversation:
            conversation.updated_at = utc_now()

        db.commit()

        # 9. Yield done event
        current_title = conversation.title if conversation else None
        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id, 'title': current_title})}\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
