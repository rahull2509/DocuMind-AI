from typing import List
from pydantic import BaseModel


class SettingsResponse(BaseModel):
    ollama_url: str
    ollama_model: str
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    top_k: int
    temperature: float
    max_tokens: int
    max_file_size_mb: int


class ModelsResponse(BaseModel):
    models: List[str]
