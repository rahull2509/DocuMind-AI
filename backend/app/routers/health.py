from fastapi import APIRouter
from app.services import ollama_service
from app.rag import vector_store
from app.config import settings
from app.database import SessionLocal

router = APIRouter()


@router.get("/health")
async def health_check():
    ollama_online = await ollama_service.check_health(settings.OLLAMA_URL)

    try:
        chroma_count = vector_store.get_collection_count()
    except Exception:
        chroma_count = -1

    db_ok = False
    try:
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
        db.close()
    except Exception:
        pass

    return {
        "status": "ok",
        "ollama_online": ollama_online,
        "chroma_count": chroma_count,
        "db_ok": db_ok,
    }
