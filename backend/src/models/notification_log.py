import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base


class NotificationLog(Base):
    __tablename__ = "email_notification_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    # 'daily_alert' | 'weekly_digest'
    type = Column(String(32), nullable=False)
    # Calendar date (in user's local timezone) the notification covers
    ref_date = Column(Date, nullable=False)
    sent_at = Column(DateTime, nullable=False, default=func.now())
