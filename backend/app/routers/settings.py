from fastapi import APIRouter
from app.config import settings
from app.schemas.settings import SettingsResponse, ModelsResponse
from app.services import ollama_service

router = APIRouter()


@router.get("/settings", response_model=SettingsResponse)
def get_settings():
    return SettingsResponse(
        ollama_url=settings.OLLAMA_URL,
        ollama_model=settings.OLLAMA_MODEL,
        embedding_model=settings.EMBEDDING_MODEL,
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        top_k=settings.TOP_K,
        temperature=settings.TEMPERATURE,
        max_tokens=settings.MAX_TOKENS,
        max_file_size_mb=settings.MAX_FILE_SIZE_MB,
    )


@router.get("/models", response_model=ModelsResponse)
async def get_models():
    models = await ollama_service.list_models(settings.OLLAMA_URL)
    return ModelsResponse(models=models)
