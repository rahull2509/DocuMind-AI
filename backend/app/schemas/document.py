from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, field_serializer


class DocumentBase(BaseModel):
    filename: str
    original_filename: str


class DocumentCreate(DocumentBase):
    stored_path: str
    file_hash: str
    file_size: int


class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    page_count: Optional[int] = None
    chunk_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, dt: datetime, _info) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
