from typing import Optional, List
from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
