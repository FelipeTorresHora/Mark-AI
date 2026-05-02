from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class CampaignResponse(BaseModel):
    id: UUID
    topic: str
    brand_context: dict
    status: str
    user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CampaignSummary(BaseModel):
    id: UUID
    topic: str
    status: str
    post_count: int
    created_at: datetime

    model_config = {"from_attributes": True}
