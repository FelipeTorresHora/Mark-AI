from datetime import UTC, datetime, timedelta


def test_list_posts_returns_only_current_user_posts(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    other_user = user_factory()
    campaign = campaign_factory(user)
    other_campaign = campaign_factory(other_user)
    post_factory(campaign, platform="X", content="Meu post")
    post_factory(other_campaign, platform="X", content="Post de outro usuario")

    response = client.get("/api/v1/posts", headers=auth_headers(user))

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert len(payload["items"]) == 1
    assert payload["items"][0]["content"] == "Meu post"


def test_list_posts_excludes_rejected_from_global_feed(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post_factory(campaign, status="FINAL", content="Aprovado")
    post_factory(campaign, status="REJECTED", content="Rejeitado")

    response = client.get("/api/v1/posts", headers=auth_headers(user))

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert len(payload["items"]) == 1
    assert payload["items"][0]["content"] == "Aprovado"


def test_list_posts_filters_by_campaign_and_status(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    campaign = campaign_factory(user)
    other_campaign = campaign_factory(user)
    post_factory(campaign, status="APPROVED", content="Aprovado")
    post_factory(other_campaign, status="DRAFT", content="Rascunho")

    response = client.get(
        "/api/v1/posts",
        headers=auth_headers(user),
        params={"campaign_id": str(campaign.id), "status": "APPROVED"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert len(payload["items"]) == 1
    assert payload["items"][0]["status"] == "APPROVED"


def test_get_post_returns_owned_post(client, user_factory, campaign_factory, post_factory, auth_headers):
    user = user_factory()
    campaign = campaign_factory(user)
    post = post_factory(campaign, content="Detalhes")

    response = client.get(f"/api/v1/posts/{post.id}", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["id"] == str(post.id)


def test_get_post_returns_404_for_foreign_post(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    other_user = user_factory()
    other_post = post_factory(campaign_factory(other_user))

    response = client.get(f"/api/v1/posts/{other_post.id}", headers=auth_headers(user))

    assert response.status_code == 404


def test_update_post_rejects_invalid_transition(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    post = post_factory(campaign_factory(user), status="DRAFT")

    response = client.patch(
        f"/api/v1/posts/{post.id}",
        headers=auth_headers(user),
        json={"status": "FINAL"},
    )

    assert response.status_code == 400
    assert "Transição inválida" in response.json()["detail"]


def test_update_post_rejects_editing_published_post(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    post = post_factory(campaign_factory(user), status="PUBLISHED")

    response = client.patch(
        f"/api/v1/posts/{post.id}",
        headers=auth_headers(user),
        json={"content": "Novo texto"},
    )

    assert response.status_code == 422
    assert "não podem ser editados" in response.json()["detail"]


def test_update_post_updates_content_and_schedule(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    post = post_factory(campaign_factory(user), status="APPROVED", content="Antes")
    scheduled_at = (datetime.now(UTC) + timedelta(days=1)).isoformat()

    response = client.patch(
        f"/api/v1/posts/{post.id}",
        headers=auth_headers(user),
        json={
            "content": "Depois",
            "scheduled_at": scheduled_at,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "APPROVED"
    assert data["content"] == "Depois"
    assert data["scheduled_at"] is not None


def test_update_post_allows_editing_final_post(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    post = post_factory(campaign_factory(user), status="FINAL", content="Antes")

    response = client.patch(
        f"/api/v1/posts/{post.id}",
        headers=auth_headers(user),
        json={"content": "Depois"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "FINAL"
    assert response.json()["content"] == "Depois"


def test_update_post_updates_status_only(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    post = post_factory(campaign_factory(user), status="APPROVED")

    response = client.patch(
        f"/api/v1/posts/{post.id}",
        headers=auth_headers(user),
        json={"status": "PUBLISHED"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "PUBLISHED"
