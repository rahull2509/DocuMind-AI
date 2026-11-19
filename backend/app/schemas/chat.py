from typing import Optional, List
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=10000, description="The user prompt or question")
    conversation_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
