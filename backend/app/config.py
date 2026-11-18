from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    CHROMA_PATH: str = "./chroma_db"
    STORAGE_PATH: str = "./storage"
    DB_URL: str = "sqlite:///./documind.db"
    CHUNK_SIZE: int = 2800
    CHUNK_OVERLAP: int = 400
    TOP_K: int = 5
    MAX_FILE_SIZE_MB: int = 20
    TEMPERATURE: float = 0.1
    MAX_TOKENS: int = 2048
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    JWT_SECRET: str = "documind-super-secret-jwt-key-2026-very-secure-32bytes"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
