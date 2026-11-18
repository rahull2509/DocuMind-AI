import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import documents, conversations, chat, settings as settings_router, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    os.makedirs(settings.CHROMA_PATH, exist_ok=True)
    yield
    # Shutdown (nothing to clean up)


app = FastAPI(
    title="DocuMind AI",
    description="A production-quality RAG-based document assistant API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(documents.router, prefix="/api", tags=["Documents"])
app.include_router(conversations.router, prefix="/api", tags=["Conversations"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(settings_router.router, prefix="/api", tags=["Settings"])
