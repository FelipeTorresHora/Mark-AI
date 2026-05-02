import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from src.database import Base


class PostInsightSnapshot(Base):
    __tablename__ = "post_insight_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(20), nullable=False)
    platform_post_id = Column(String(255), nullable=False)
    captured_at = Column(DateTime, default=func.now(), nullable=False)
    impressions = Column(Integer, nullable=False, default=0)
    reach = Column(Integer, nullable=False, default=0)
    likes = Column(Integer, nullable=False, default=0)
    comments = Column(Integer, nullable=False, default=0)
    shares = Column(Integer, nullable=False, default=0)
    quotes = Column(Integer, nullable=False, default=0)
    bookmarks = Column(Integer, nullable=False, default=0)
    clicks = Column(Integer, nullable=False, default=0)
    profile_clicks = Column(Integer, nullable=False, default=0)
    engagements = Column(Integer, nullable=False, default=0)
    engagement_rate = Column(Float, nullable=False, default=0.0)
    raw_metrics = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime, default=func.now(), nullable=False)


Index("idx_post_insights_user_captured", PostInsightSnapshot.user_id, PostInsightSnapshot.captured_at)
Index("idx_post_insights_post_captured", PostInsightSnapshot.post_id, PostInsightSnapshot.captured_at)
Index("idx_post_insights_platform_post", PostInsightSnapshot.platform, PostInsightSnapshot.platform_post_id)
