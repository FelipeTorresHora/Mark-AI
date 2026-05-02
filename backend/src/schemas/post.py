from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID


class PostResponse(BaseModel):
    id: UUID
    campaign_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    platform: Literal["X", "LINKEDIN"]
    content: Optional[str] = None
    score: Optional[int] = Field(None, ge=0, le=100)
    feedback: Optional[str] = None
    status: Literal["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "FINAL", "PUBLISHED"]
    publish_status: Literal["pending", "processing", "published", "failed", "canceled"] = "pending"
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    platform_post_id: Optional[str] = None
    attempt_count: int = 0
    last_attempt_at: Optional[datetime] = None
    next_attempt_at: Optional[datetime] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PostPatchBody(BaseModel):
    status: Optional[Literal["APPROVED", "REJECTED", "FINAL", "PUBLISHED"]] = None
    content: Optional[str] = None
    scheduled_at: Optional[datetime] = None
