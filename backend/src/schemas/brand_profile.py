from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class BrandProfileRequest(BaseModel):
    name: str
    niche: str
    tone: str
    target_audience: str
    unique_value: str


class BrandProfileResponse(BaseModel):
    id: UUID
    name: str
    niche: str
    tone: str
    target_audience: str
    unique_value: str
    user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
