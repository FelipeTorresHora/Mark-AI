from datetime import UTC, datetime, timedelta

from src.models.user_goal import UserGoal


def test_get_goals_seeds_rows_and_returns_audience_copy(client, user_factory, auth_headers):
    user = user_factory()
    response = client.get("/api/v1/goals", headers=auth_headers(user))

    assert response.status_code == 200
    payload = response.json()
    assert payload["audience"] == "mei_loja_liberal"
    assert payload["total_count"] == 6
    assert any(goal["key"] == "connect_account" and goal["featured"] for goal in payload["goals"])
    first_gen = next(g for g in payload["goals"] if g["key"] == "first_generation")
    assert "objetivo" not in first_gen["title"].lower()
    assert payload["goals"][0]["title"]


def test_connect_account_goal_completes_with_social_account(
    client, user_factory, auth_headers, social_account_factory, db_session
):
    user = user_factory()
    social_account_factory(user, platform="X")

    response = client.get("/api/v1/goals", headers=auth_headers(user))
    assert response.status_code == 200

    connect = next(g for g in response.json()["goals"] if g["key"] == "connect_account")
    assert connect["completed"] is True
    assert connect["current"] >= 1

    row = (
        db_session.query(UserGoal)
        .filter(UserGoal.user_id == user.id, UserGoal.goal_key == "connect_account")
        .one()
    )
    assert row.completed_at is not None


def test_publish_3_in_7_days_tracks_progress(
    client, user_factory, auth_headers, campaign_factory, post_factory, db_session
):
    user = user_factory()
    campaign = campaign_factory(user)
    now = datetime.now(UTC).replace(tzinfo=None)

    for offset in range(2):
        post = post_factory(campaign, status="PUBLISHED")
        post.published_at = now - timedelta(days=offset)
        db_session.add(post)
    db_session.commit()

    response = client.get("/api/v1/goals", headers=auth_headers(user))
    goal = next(g for g in response.json()["goals"] if g["key"] == "publish_3_in_7_days")
    assert goal["current"] == 2
    assert goal["target"] == 3
    assert goal["completed"] is False


def test_update_audience_accepts_mei_alias(client, user_factory, auth_headers):
    user = user_factory()
    response = client.patch(
        "/api/v1/goals/audience",
        headers=auth_headers(user),
        json={"audience": "mei"},
    )
    assert response.status_code == 200
    assert response.json()["audience"] == "mei_loja_liberal"


def test_update_audience_changes_featured_goals(client, user_factory, auth_headers):
    user = user_factory()
    response = client.patch(
        "/api/v1/goals/audience",
        headers=auth_headers(user),
        json={"audience": "founder"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["audience"] == "founder"
    featured = [g["key"] for g in payload["goals"] if g["featured"]]
    assert featured == ["connect_account", "approve_first_post", "two_channels"]
