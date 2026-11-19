import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import model_validator


DEFAULT_DEV_SECRET = "documind-super-secret-jwt-key-2026-very-secure-32bytes"


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"  # "development", "test", or "production"
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    CHROMA_PATH: str = "./chroma_db"
    STORAGE_PATH: str = "./storage"
    DB_URL: str = "sqlite:///./documind.db"
    CHUNK_SIZE: int = 1600  # ~400 tokens (safe for 512-token BGE model)
    CHUNK_OVERLAP: int = 240  # ~60 tokens
    TOP_K: int = 5
    MAX_FILE_SIZE_MB: int = 20
    MAX_PAGE_COUNT: int = 1000
    TEMPERATURE: float = 0.1
    MAX_TOKENS: int = 2048
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    JWT_SECRET: str = DEFAULT_DEV_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.ENVIRONMENT.lower() == "production":
            if self.JWT_SECRET == DEFAULT_DEV_SECRET or len(self.JWT_SECRET) < 32:
                raise ValueError(
                    "CRITICAL SECURITY ERROR: In production mode, JWT_SECRET must be explicitly set "
                    "in the environment to a secure random string of at least 32 characters."
                )
        return self


settings = Settings()
