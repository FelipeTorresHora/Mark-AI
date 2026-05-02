from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class SocialAccountResponse(BaseModel):
    id: UUID
    platform: str
    platform_user_id: str
    expires_at: Optional[datetime] = None
    scope: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
