import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    platform = Column(String(20), nullable=False)
    content = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="DRAFT")
    publish_status = Column(String(20), nullable=False, default="pending")
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    platform_post_id = Column(String(255), nullable=True)
    attempt_count = Column(Integer, nullable=False, default=0)
    last_attempt_at = Column(DateTime, nullable=True)
    next_attempt_at = Column(DateTime, nullable=True)
    error_code = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
