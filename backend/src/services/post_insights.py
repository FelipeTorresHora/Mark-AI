"""Persisted social post insight aggregation and synchronization."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.models.campaign import Campaign
from src.models.post import Post
from src.models.post_insight_snapshot import PostInsightSnapshot
from src.models.social_account import SocialAccount
from src.models.user import User
from src.models.x_account import XAccount
from src.schemas.dashboard import (
    DashboardInsightsResponse,
    InsightMetrics,
    InsightSyncResponse,
    PostInsightSummary,
)
from src.services import linkedin_insights, x_insights
from src.services.social_crypto import decrypt_social_token

VALID_PLATFORM_FILTERS = {"ALL", "X", "LINKEDIN"}


def utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _eligible_posts_query(db: Session, user_id: UUID, platform: str = "ALL"):
    query = (
        db.query(Post)
        .outerjoin(Campaign, Post.campaign_id == Campaign.id)
        .filter(
            or_(Post.user_id == user_id, Campaign.user_id == user_id),
            Post.status == "PUBLISHED",
            Post.publish_status == "published",
        )
    )
    if platform != "ALL":
        query = query.filter(Post.platform == platform)
    return query.order_by(Post.published_at.desc().nullslast(), Post.created_at.desc())


def _latest_snapshots_for_user(
    db: Session,
    user_id: UUID,
    range_days: int,
    platform: str,
) -> list[tuple[PostInsightSnapshot, Post]]:
    since = utcnow_naive() - timedelta(days=range_days)
    query = (
        db.query(PostInsightSnapshot, Post)
        .join(Post, PostInsightSnapshot.post_id == Post.id)
        .outerjoin(Campaign, Post.campaign_id == Campaign.id)
        .filter(
            PostInsightSnapshot.user_id == user_id,
            PostInsightSnapshot.captured_at >= since,
            Post.status == "PUBLISHED",
            Post.publish_status == "published",
            Post.platform_post_id.isnot(None),
            or_(Post.user_id == user_id, Campaign.user_id == user_id),
        )
    )
    if platform != "ALL":
        query = query.filter(PostInsightSnapshot.platform == platform)

    rows = query.order_by(
        PostInsightSnapshot.post_id,
        PostInsightSnapshot.captured_at.desc(),
    ).all()
    latest: dict[UUID, tuple[PostInsightSnapshot, Post]] = {}
    for snapshot, post in rows:
        if snapshot.post_id not in latest:
            latest[snapshot.post_id] = (snapshot, post)
    return list(latest.values())


def _add_metrics(target: InsightMetrics, snapshot: PostInsightSnapshot) -> None:
    target.total_posts += 1
    target.impressions += snapshot.impressions
    target.reach += snapshot.reach
    target.engagements += snapshot.engagements
    target.clicks += snapshot.clicks
    target.likes += snapshot.likes
    target.comments += snapshot.comments
    target.shares += snapshot.shares
    target.quotes += snapshot.quotes
    target.bookmarks += snapshot.bookmarks
    target.profile_clicks += snapshot.profile_clicks


def _finalize_rate(metrics: InsightMetrics) -> None:
    metrics.engagement_rate = (
        round(metrics.engagements / metrics.impressions, 6)
        if metrics.impressions > 0
        else 0.0
    )


def _post_summary(snapshot: PostInsightSnapshot, post: Post) -> PostInsightSummary:
    return PostInsightSummary(
        post_id=post.id,
        platform=post.platform,
        platform_post_id=snapshot.platform_post_id,
        content=post.content,
        published_at=post.published_at,
        captured_at=snapshot.captured_at,
        impressions=snapshot.impressions,
        reach=snapshot.reach,
        engagements=snapshot.engagements,
        clicks=snapshot.clicks,
        likes=snapshot.likes,
        comments=snapshot.comments,
        shares=snapshot.shares,
        quotes=snapshot.quotes,
        bookmarks=snapshot.bookmarks,
        profile_clicks=snapshot.profile_clicks,
        engagement_rate=snapshot.engagement_rate,
    )


def build_dashboard_insights(
    db: Session,
    user_id: UUID,
    range_days: int = 30,
    platform: str = "ALL",
) -> DashboardInsightsResponse:
    if platform not in VALID_PLATFORM_FILTERS:
        platform = "ALL"
    if range_days not in {7, 30, 90}:
        range_days = 30

    latest_rows = _latest_snapshots_for_user(db, user_id, range_days, platform)
    summary = InsightMetrics()
    by_platform = {"X": InsightMetrics(), "LINKEDIN": InsightMetrics()}
    post_summaries: list[PostInsightSummary] = []

    for snapshot, post in latest_rows:
        _add_metrics(summary, snapshot)
        if snapshot.platform in by_platform:
            _add_metrics(by_platform[snapshot.platform], snapshot)
        post_summaries.append(_post_summary(snapshot, post))

    _finalize_rate(summary)
    for metrics in by_platform.values():
        _finalize_rate(metrics)

    last_sync_at = max((item.captured_at for item in post_summaries), default=None)
    top_posts = sorted(
        post_summaries,
        key=lambda item: (item.engagements, item.impressions, item.captured_at),
        reverse=True,
    )[:10]
    recent_posts = sorted(post_summaries, key=lambda item: item.captured_at, reverse=True)[:20]

    return DashboardInsightsResponse(
        summary=summary,
        by_platform=by_platform,
        top_posts=top_posts,
        recent_posts=recent_posts,
        last_sync_at=last_sync_at,
        sync_warnings=[],
    )


def _save_snapshot(db: Session, post: Post, metrics: dict) -> None:
    impressions = int(metrics.get("impressions") or 0)
    engagements = int(metrics.get("engagements") or 0)
    db.add(
        PostInsightSnapshot(
            post_id=post.id,
            user_id=post.user_id,
            platform=post.platform,
            platform_post_id=post.platform_post_id or "",
            captured_at=utcnow_naive(),
            impressions=impressions,
            reach=int(metrics.get("reach") or 0),
            likes=int(metrics.get("likes") or 0),
            comments=int(metrics.get("comments") or 0),
            shares=int(metrics.get("shares") or 0),
            quotes=int(metrics.get("quotes") or 0),
            bookmarks=int(metrics.get("bookmarks") or 0),
            clicks=int(metrics.get("clicks") or 0),
            profile_clicks=int(metrics.get("profile_clicks") or 0),
            engagements=engagements,
            engagement_rate=round(engagements / impressions, 6) if impressions > 0 else 0.0,
            raw_metrics=metrics.get("raw_metrics") or {},
        )
    )


def _get_x_access_token(db: Session, user_id: UUID) -> str | None:
    account = (
        db.query(XAccount)
        .filter(
            XAccount.user_id == user_id,
            XAccount.revoked_at.is_(None),
            XAccount.access_token_encrypted.isnot(None),
        )
        .first()
    )
    if account is None:
        return None
    return decrypt_social_token(account.access_token_encrypted)


def _get_linkedin_account(db: Session, user_id: UUID) -> SocialAccount | None:
    return (
        db.query(SocialAccount)
        .filter(SocialAccount.user_id == user_id, SocialAccount.platform == "LINKEDIN")
        .first()
    )


def sync_user_post_insights(
    db: Session,
    user_id: UUID,
    platform: str = "ALL",
    limit: int = 50,
) -> InsightSyncResponse:
    result = InsightSyncResponse()
    posts = _eligible_posts_query(db, user_id, platform).limit(limit).all()
    result.scanned_posts = len(posts)

    x_token: str | None = None
    linkedin_account: SocialAccount | None = None

    for post in posts:
        if not post.platform_post_id:
            result.skipped_posts += 1
            result.warnings.append(f"Post {post.id} sem ID externo para sincronizar métricas.")
            continue

        try:
            if post.platform == "X":
                if x_token is None:
                    x_token = _get_x_access_token(db, user_id)
                if not x_token:
                    result.failed_posts += 1
                    result.warnings.append("Reconecte o X para sincronizar métricas.")
                    continue
                metrics = x_insights.fetch_x_post_metrics(x_token, post.platform_post_id)
            elif post.platform == "LINKEDIN":
                if linkedin_account is None:
                    linkedin_account = _get_linkedin_account(db, user_id)
                if linkedin_account is None:
                    result.failed_posts += 1
                    result.warnings.append("Reconecte LinkedIn com permissão de analytics.")
                    continue
                if "r_member_postAnalytics" not in (linkedin_account.scope or ""):
                    result.failed_posts += 1
                    result.warnings.append("Reconecte LinkedIn com permissão de analytics.")
                    continue
                linkedin_token = decrypt_social_token(linkedin_account.access_token)
                if not linkedin_token:
                    result.failed_posts += 1
                    result.warnings.append("Reconecte LinkedIn com permissão de analytics.")
                    continue
                metrics = linkedin_insights.fetch_linkedin_member_post_metrics(
                    linkedin_token,
                    post.platform_post_id,
                )
            else:
                result.skipped_posts += 1
                result.warnings.append(f"Plataforma {post.platform} sem suporte para métricas.")
                continue
        except (x_insights.InsightFetchError, linkedin_insights.InsightFetchError) as exc:
            result.failed_posts += 1
            result.warnings.append(exc.message)
            continue

        _save_snapshot(db, post, metrics)
        result.updated_posts += 1

    db.commit()
    return result


def sync_all_users_post_insights(db: Session, limit_users: int = 20, posts_per_user: int = 50) -> InsightSyncResponse:
    aggregate = InsightSyncResponse()
    users = db.query(User).order_by(User.created_at.asc()).limit(limit_users).all()

    for user in users:
        user_result = sync_user_post_insights(db, user.id, limit=posts_per_user)
        aggregate.scanned_posts += user_result.scanned_posts
        aggregate.updated_posts += user_result.updated_posts
        aggregate.skipped_posts += user_result.skipped_posts
        aggregate.failed_posts += user_result.failed_posts
        aggregate.warnings.extend(user_result.warnings)

    return aggregate
