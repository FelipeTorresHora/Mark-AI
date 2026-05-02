from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class XAccountStatusResponse(BaseModel):
    connected: bool
    reconnect_required: bool = False
    id: UUID | None = None
    x_user_id: str | None = None
    username: str | None = None
    expires_at: datetime | None = None
    last_publish_at: datetime | None = None
    last_error: str | None = None
