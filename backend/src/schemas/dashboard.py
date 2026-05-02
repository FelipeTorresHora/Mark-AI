from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


DashboardPlatformFilter = Literal["ALL", "X", "LINKEDIN"]


class InsightMetrics(BaseModel):
    total_posts: int = 0
    impressions: int = 0
    reach: int = 0
    engagements: int = 0
    clicks: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    quotes: int = 0
    bookmarks: int = 0
    profile_clicks: int = 0
    engagement_rate: float = 0.0


class PostInsightSummary(BaseModel):
    post_id: UUID
    platform: Literal["X", "LINKEDIN"]
    platform_post_id: str
    content: str | None
    published_at: datetime | None
    captured_at: datetime
    impressions: int
    reach: int
    engagements: int
    clicks: int
    likes: int
    comments: int
    shares: int
    quotes: int
    bookmarks: int
    profile_clicks: int
    engagement_rate: float


class DashboardInsightsResponse(BaseModel):
    summary: InsightMetrics
    by_platform: dict[str, InsightMetrics]
    top_posts: list[PostInsightSummary]
    recent_posts: list[PostInsightSummary]
    last_sync_at: datetime | None
    sync_warnings: list[str] = []


class InsightSyncResponse(BaseModel):
    scanned_posts: int = 0
    updated_posts: int = 0
    skipped_posts: int = 0
    failed_posts: int = 0
    warnings: list[str] = []
