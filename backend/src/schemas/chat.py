from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    timestamp: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: str
    reply: str
    done: bool
    brand_profile: Optional[dict] = None


class ChatSessionResponse(BaseModel):
    id: str
    messages: list[ChatMessage]
    is_active: bool
    brand_profile_complete: bool
    created_at: str
    updated_at: str
