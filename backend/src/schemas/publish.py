from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PublishResponse(BaseModel):
    post_id: UUID
    platform: str
    platform_post_id: str
    published_at: datetime
    status: str = "PUBLISHED"
