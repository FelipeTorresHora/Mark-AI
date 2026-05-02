from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

PublishStatus = Literal["pending", "processing", "published", "failed", "canceled"]


class XPostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=280)


class XPostSchedule(XPostCreate):
    scheduled_at: datetime


class XPostResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None
    campaign_id: UUID | None = None
    platform: Literal["X"]
    content: str | None = None
    status: str
    publish_status: PublishStatus
    scheduled_at: datetime | None = None
    published_at: datetime | None = None
    platform_post_id: str | None = None
    attempt_count: int
    last_attempt_at: datetime | None = None
    next_attempt_at: datetime | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
