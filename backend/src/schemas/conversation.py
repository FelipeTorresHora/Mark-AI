from pydantic import BaseModel
from datetime import datetime
from typing import Literal
from uuid import UUID

class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime

class ConversationResponse(BaseModel):
    id: UUID
    messages: list[ConversationMessage]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
