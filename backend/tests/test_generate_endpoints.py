import asyncio

from src.models.campaign import Campaign
from src.models.post import Post
from src.services.sse import generation_stream
from src.services.auth_service import create_access_token


def test_start_generation_creates_campaign_and_posts(client, user_factory, auth_headers, db_session):
    user = user_factory()

    response = client.post(
        "/api/v1/generate",
        headers=auth_headers(user),
        json={
            "topic": "Campanha de outono",
            "brand_context": {
                "name": "Marca XPTO",
                "niche": "Marketing",
                "tone": "Direto",
                "target_audience": "Empreendedores",
                "unique_value": "Automacao com IA",
            },
            "posts_per_platform": {
                "X": 2,
                "LINKEDIN": 3,
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["post_ids"]) == 5

    campaign = db_session.query(Campaign).filter(Campaign.id == data["campaign_id"]).first()
    posts = db_session.query(Post).filter(Post.campaign_id == data["campaign_id"]).all()
    assert campaign is not None
    assert len(posts) == 5
    assert len([post for post in posts if post.platform == "X"]) == 2
    assert len([post for post in posts if post.platform == "LINKEDIN"]) == 3


def test_start_generation_validates_post_count_limits(client, user_factory, auth_headers):
    user = user_factory()

    response = client.post(
        "/api/v1/generate",
        headers=auth_headers(user),
        json={
            "topic": "Campanha com volume invalido",
            "brand_context": {
                "name": "Marca XPTO",
                "niche": "Marketing",
                "tone": "Direto",
                "target_audience": "Empreendedores",
                "unique_value": "Automacao com IA",
            },
            "posts_per_platform": {
                "X": 0,
                "LINKEDIN": 5,
            },
        },
    )

    assert response.status_code == 422


def test_stream_generation_rejects_invalid_campaign_id(client, user_factory):
    user = user_factory()
    token = create_access_token(user.id)

    response = client.get(
        "/api/v1/generate/not-a-uuid/stream",
        params={"token": token},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "campaign_id inválido"


def test_stream_generation_returns_404_for_missing_campaign(client, user_factory):
    user = user_factory()
    token = create_access_token(user.id)

    response = client.get(
        "/api/v1/generate/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/stream",
        params={"token": token},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Campanha não encontrada"


def test_stream_generation_returns_event_stream(client, user_factory, campaign_factory, monkeypatch):
    user = user_factory()
    campaign = campaign_factory(user)
    token = create_access_token(user.id)

    async def fake_stream(campaign_id, db):
        yield 'data: {"event":"generation_complete","platform":null,"data":{"campaign_id":"%s"}}\n\n' % campaign_id

    monkeypatch.setattr("src.routers.generate.generation_stream", fake_stream)

    with client.stream(
        "GET",
        f"/api/v1/generate/{campaign.id}/stream",
        params={"token": token},
    ) as response:
        body = "".join(response.iter_text())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert str(campaign.id) in body


def test_generation_stream_processes_multiple_posts(
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    x_posts = [post_factory(campaign, platform="X", content=None) for _ in range(2)]
    linkedin_posts = [post_factory(campaign, platform="LINKEDIN", content=None) for _ in range(3)]

    async def fake_generate_post(platform, topic, brand_context):
        return f"{platform} :: {topic}"

    async def collect_events():
        return [event async for event in generation_stream(str(campaign.id), db_session)]

    monkeypatch.setattr("src.services.sse.generate_post", fake_generate_post)

    events = asyncio.run(collect_events())
    db_session.refresh(campaign)
    all_posts = x_posts + linkedin_posts
    for post in all_posts:
        db_session.refresh(post)

    assert len([event for event in events if '"event": "writer_done"' in event]) == 5
    assert campaign.status == "DONE"
    assert all(post.status == "APPROVED" for post in all_posts)
