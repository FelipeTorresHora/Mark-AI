from src.models.post import Post


def test_list_campaigns_returns_post_counts(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    campaign = campaign_factory(user, topic="Campanha principal")
    post_factory(campaign, platform="X")
    post_factory(campaign, platform="LINKEDIN")

    response = client.get("/api/v1/campaigns", headers=auth_headers(user))

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert len(payload["items"]) == 1
    assert payload["items"][0]["topic"] == "Campanha principal"
    assert payload["items"][0]["post_count"] == 2


def test_get_campaign_returns_owned_campaign(client, user_factory, campaign_factory, auth_headers):
    user = user_factory()
    campaign = campaign_factory(user, topic="Detalhes campanha")

    response = client.get(f"/api/v1/campaigns/{campaign.id}", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["id"] == str(campaign.id)


def test_get_campaign_returns_404_for_missing_or_foreign_campaign(
    client,
    user_factory,
    campaign_factory,
    auth_headers,
):
    user = user_factory()
    other_user = user_factory()
    foreign_campaign = campaign_factory(other_user)

    response = client.get(f"/api/v1/campaigns/{foreign_campaign.id}", headers=auth_headers(user))

    assert response.status_code == 404
    assert response.json()["detail"] == "Campanha não encontrada"


def test_delete_campaign_removes_campaign_and_posts(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
    db_session,
):
    user = user_factory()
    campaign = campaign_factory(user, topic="Campanha para excluir")
    post_factory(campaign, platform="X")
    post_factory(campaign, platform="LINKEDIN")

    response = client.delete(f"/api/v1/campaigns/{campaign.id}", headers=auth_headers(user))

    assert response.status_code == 204
    assert db_session.query(Post).filter(Post.campaign_id == campaign.id).count() == 0
    assert db_session.query(type(campaign)).filter(type(campaign).id == campaign.id).first() is None


def test_delete_campaign_returns_404_for_foreign_campaign(
    client,
    user_factory,
    campaign_factory,
    auth_headers,
):
    user = user_factory()
    other_user = user_factory()
    foreign_campaign = campaign_factory(other_user, topic="Campanha alheia")

    response = client.delete(f"/api/v1/campaigns/{foreign_campaign.id}", headers=auth_headers(user))

    assert response.status_code == 404
    assert response.json()["detail"] == "Campanha não encontrada"
