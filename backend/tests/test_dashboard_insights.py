from datetime import UTC, datetime, timedelta

from src.models.post import Post
from src.models.post_insight_snapshot import PostInsightSnapshot


def _publish_post(db_session, post: Post, platform_post_id: str) -> Post:
    post.status = "PUBLISHED"
    post.publish_status = "published"
    post.platform_post_id = platform_post_id
    post.published_at = datetime.now(UTC).replace(tzinfo=None)
    db_session.commit()
    db_session.refresh(post)
    return post


def _snapshot(db_session, post: Post, **overrides) -> PostInsightSnapshot:
    captured_at = overrides.pop("captured_at", datetime.now(UTC).replace(tzinfo=None))
    snapshot = PostInsightSnapshot(
        post_id=post.id,
        user_id=post.user_id,
        platform=post.platform,
        platform_post_id=post.platform_post_id or "",
        captured_at=captured_at,
        impressions=overrides.pop("impressions", 0),
        reach=overrides.pop("reach", 0),
        likes=overrides.pop("likes", 0),
        comments=overrides.pop("comments", 0),
        shares=overrides.pop("shares", 0),
        quotes=overrides.pop("quotes", 0),
        bookmarks=overrides.pop("bookmarks", 0),
        clicks=overrides.pop("clicks", 0),
        profile_clicks=overrides.pop("profile_clicks", 0),
        engagements=overrides.pop("engagements", 0),
        engagement_rate=overrides.pop("engagement_rate", 0),
        raw_metrics=overrides.pop("raw_metrics", {}),
    )
    db_session.add(snapshot)
    db_session.commit()
    db_session.refresh(snapshot)
    return snapshot


def test_dashboard_insights_returns_only_current_user_snapshots(
    client,
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    other_user = user_factory()
    post = _publish_post(db_session, post_factory(campaign_factory(user)), "tweet-1")
    other_post = _publish_post(db_session, post_factory(campaign_factory(other_user)), "tweet-2")
    _snapshot(db_session, post, impressions=100, likes=10, engagements=15)
    _snapshot(db_session, other_post, impressions=999, likes=99, engagements=120)

    response = client.get("/api/v1/dashboard/insights", headers=auth_headers(user))

    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]["total_posts"] == 1
    assert payload["summary"]["impressions"] == 100
    assert payload["summary"]["engagements"] == 15
    assert len(payload["recent_posts"]) == 1
    assert payload["recent_posts"][0]["post_id"] == str(post.id)


def test_dashboard_insights_uses_latest_snapshot_per_post(
    client,
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    post = _publish_post(db_session, post_factory(campaign_factory(user)), "tweet-1")
    _snapshot(
        db_session,
        post,
        captured_at=datetime.now(UTC).replace(tzinfo=None) - timedelta(days=1),
        impressions=25,
        engagements=5,
    )
    _snapshot(db_session, post, impressions=75, engagements=15)

    response = client.get("/api/v1/dashboard/insights", headers=auth_headers(user))

    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]["total_posts"] == 1
    assert payload["summary"]["impressions"] == 75
    assert payload["summary"]["engagements"] == 15


def test_sync_skips_published_posts_without_platform_id(
    client,
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    post = post_factory(campaign_factory(user), status="PUBLISHED")
    post.publish_status = "published"
    post.published_at = datetime.now(UTC).replace(tzinfo=None)
    db_session.commit()

    response = client.post("/api/v1/dashboard/insights/sync", headers=auth_headers(user))

    assert response.status_code == 200
    payload = response.json()
    assert payload["scanned_posts"] == 1
    assert payload["skipped_posts"] == 1
    assert "sem ID externo" in payload["warnings"][0]


def test_sync_x_saves_normalized_snapshot(
    client,
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    x_account_factory,
    auth_headers,
    monkeypatch,
):
    user = user_factory()
    post = _publish_post(db_session, post_factory(campaign_factory(user), platform="X"), "tweet-1")
    x_account_factory(user, access_token="token-x")
    monkeypatch.setattr(
        "src.services.post_insights.x_insights.fetch_x_post_metrics",
        lambda token, post_id: {
            "impressions": 1000,
            "reach": 0,
            "likes": 20,
            "comments": 4,
            "shares": 6,
            "quotes": 2,
            "bookmarks": 3,
            "clicks": 11,
            "profile_clicks": 7,
            "engagements": 53,
            "raw_metrics": {"id": post_id},
        },
    )

    response = client.post("/api/v1/dashboard/insights/sync", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["updated_posts"] == 1
    snapshot = db_session.query(PostInsightSnapshot).filter(PostInsightSnapshot.post_id == post.id).first()
    assert snapshot is not None
    assert snapshot.impressions == 1000
    assert snapshot.engagements == 53
    assert snapshot.clicks == 11
    assert snapshot.engagement_rate == 0.053


def test_sync_linkedin_without_analytics_scope_returns_warning(
    client,
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    social_account_factory,
    auth_headers,
):
    user = user_factory()
    _publish_post(db_session, post_factory(campaign_factory(user), platform="LINKEDIN"), "urn:li:share:1")
    social_account_factory(user, platform="LINKEDIN", access_token="token-li", scope="openid profile w_member_social")

    response = client.post("/api/v1/dashboard/insights/sync", headers=auth_headers(user))

    assert response.status_code == 200
    payload = response.json()
    assert payload["failed_posts"] == 1
    assert any("Reconecte LinkedIn" in warning for warning in payload["warnings"])
    assert db_session.query(PostInsightSnapshot).count() == 0


def test_post_insights_cron_rejects_missing_secret(client):
    response = client.post("/cron/post-insights-sync")

    assert response.status_code == 401
