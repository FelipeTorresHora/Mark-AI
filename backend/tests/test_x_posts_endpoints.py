from datetime import UTC, datetime, timedelta


def test_publish_x_post_creates_and_publishes_post(
    client,
    user_factory,
    x_account_factory,
    auth_headers,
    monkeypatch,
):
    user = user_factory()
    x_account_factory(user, access_token="token-x")
    monkeypatch.setattr("src.services.x_publish.oauth_x.post_tweet", lambda token, text: "tweet-123")

    response = client.post(
        "/api/v1/x-posts/publish",
        headers=auth_headers(user),
        json={"content": "Post imediato"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["publish_status"] == "published"
    assert data["platform_post_id"] == "tweet-123"


def test_schedule_and_cancel_x_post(client, user_factory, x_account_factory, auth_headers):
    user = user_factory()
    x_account_factory(user)
    scheduled_at = (datetime.now(UTC) + timedelta(hours=1)).isoformat()

    schedule_response = client.post(
        "/api/v1/x-posts/schedule",
        headers=auth_headers(user),
        json={"content": "Post agendado", "scheduled_at": scheduled_at},
    )

    assert schedule_response.status_code == 201
    post_id = schedule_response.json()["id"]
    assert schedule_response.json()["publish_status"] == "pending"

    cancel_response = client.post(f"/api/v1/x-posts/{post_id}/cancel", headers=auth_headers(user))
    assert cancel_response.status_code == 200
    assert cancel_response.json()["publish_status"] == "canceled"


def test_schedule_x_post_rejects_past_datetime(client, user_factory, x_account_factory, auth_headers):
    user = user_factory()
    x_account_factory(user)
    scheduled_at = (datetime.now(UTC) - timedelta(minutes=5)).isoformat()

    response = client.post(
        "/api/v1/x-posts/schedule",
        headers=auth_headers(user),
        json={"content": "Post agendado", "scheduled_at": scheduled_at},
    )

    assert response.status_code == 422


def test_cron_processes_due_x_posts(
    client,
    user_factory,
    x_account_factory,
    auth_headers,
    db_session,
    monkeypatch,
):
    user = user_factory()
    x_account_factory(user, access_token="token-x")
    scheduled_at = (datetime.now(UTC) + timedelta(hours=1)).isoformat()
    schedule_response = client.post(
        "/api/v1/x-posts/schedule",
        headers=auth_headers(user),
        json={"content": "Post agendado", "scheduled_at": scheduled_at},
    )
    post_id = schedule_response.json()["id"]

    from src.models.post import Post

    post = db_session.query(Post).filter(Post.id == post_id).first()
    post.scheduled_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=1)
    db_session.commit()

    monkeypatch.setattr("src.config.settings.cron_secret", "test-cron")
    monkeypatch.setattr("src.services.x_publish.oauth_x.post_tweet", lambda token, text: "tweet-due")

    response = client.get(
        "/api/v1/cron/x-publish-due",
        headers={"Authorization": "Bearer test-cron"},
    )

    assert response.status_code == 200
    assert response.json()["published"] == 1
