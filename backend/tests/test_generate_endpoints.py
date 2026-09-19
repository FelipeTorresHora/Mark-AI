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

    async def fake_run_until_review(**kwargs):
        emitter = kwargs.get("emitter")
        post_ids = kwargs.get("platform_post_ids") or {}
        if emitter:
            for platform in kwargs.get("platforms", []):
                ids = post_ids.get(platform) or ["1"]
                if isinstance(ids, str):
                    ids = [ids]
                total = len(ids)
                for index, post_id in enumerate(ids, start=1):
                    emitter(
                        "writer_start",
                        platform,
                        {"post_id": post_id, "variant_index": index, "platform_total": total},
                    )
                    emitter(
                        "writer_done",
                        platform,
                        {
                            "post_id": post_id,
                            "content": f"{platform} :: ok {index}",
                            "variant_index": index,
                            "platform_total": total,
                        },
                    )
        return {
            "platform_contents": {
                p: [f"{p} :: ok {i + 1}" for i in range(len(post_ids.get(p) or ["1"]))]
                for p in kwargs.get("platforms", [])
            },
            "__interrupt__": [object()],
        }

    async def collect_events():
        return [event async for event in generation_stream(str(campaign.id), db_session)]

    monkeypatch.setattr("src.services.sse.run_until_review", fake_run_until_review)

    events = asyncio.run(collect_events())
    db_session.refresh(campaign)
    all_posts = x_posts + linkedin_posts
    for post in all_posts:
        db_session.refresh(post)

    assert any('"event": "generation_plan"' in event for event in events)
    assert len([event for event in events if '"event": "writer_done"' in event]) == 5
    assert campaign.status == "AWAITING_REVIEW"
    assert x_posts[0].status == "UNDER_REVIEW"
    assert x_posts[1].status == "UNDER_REVIEW"
    assert linkedin_posts[0].status == "UNDER_REVIEW"
    assert linkedin_posts[1].status == "UNDER_REVIEW"
    assert linkedin_posts[2].status == "UNDER_REVIEW"


def test_generation_stream_resumes_terminal_campaign_without_rerunning_graph(
    db_session,
    user_factory,
    campaign_factory,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    campaign.status = "AWAITING_REVIEW"
    db_session.commit()

    ran = {"value": False}

    async def should_not_run(**kwargs):
        ran["value"] = True
        return {}

    monkeypatch.setattr("src.services.sse.run_until_review", should_not_run)

    async def collect_events():
        return [event async for event in generation_stream(str(campaign.id), db_session)]

    events = asyncio.run(collect_events())

    assert not ran["value"]
    assert any('"generation_complete"' in event for event in events)
    assert any('"resumed": true' in event for event in events)


def test_generation_stream_does_not_rerun_graph_when_checkpoint_exists(
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post_factory(campaign, platform="X", content=None)
    post_factory(campaign, platform="LINKEDIN", content=None)

    run_count = {"value": 0}

    async def fake_run_until_review(**kwargs):
        run_count["value"] += 1
        emitter = kwargs.get("emitter")
        if emitter:
            for platform in kwargs.get("platforms", []):
                emitter(
                    "writer_start",
                    platform,
                    {"post_id": "1", "variant_index": 1, "platform_total": 1},
                )
                emitter(
                    "writer_done",
                    platform,
                    {
                        "post_id": "1",
                        "content": f"{platform} ok",
                        "variant_index": 1,
                        "platform_total": 1,
                    },
                )
        return {
            "platform_contents": {p: f"{p} ok" for p in kwargs.get("platforms", [])},
            "__interrupt__": [object()],
        }

    monkeypatch.setattr("src.services.sse.run_until_review", fake_run_until_review)

    async def collect_events():
        return [event async for event in generation_stream(str(campaign.id), db_session)]

    first_events = asyncio.run(collect_events())
    second_events = asyncio.run(collect_events())

    assert run_count["value"] == 1
    assert len([e for e in first_events if '"writer_done"' in e]) == 2
    assert not any('"writer_start"' in e for e in second_events)
    assert any('"generation_complete"' in e for e in second_events)
    assert any('"resumed": true' in e for e in second_events)


def test_generation_stream_skips_instagram_without_account(
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post_factory(campaign, platform="X", content=None)
    post_factory(campaign, platform="INSTAGRAM", content=None)

    monkeypatch.setattr(
        "src.services.generation_platforms.settings.instagram_app_id",
        "app-id",
    )
    monkeypatch.setattr(
        "src.services.generation_platforms.settings.instagram_app_secret",
        "secret",
    )

    async def fake_run_until_review(**kwargs):
        emitter = kwargs.get("emitter")
        if emitter:
            for platform in kwargs.get("platforms", []):
                emitter(
                    "writer_done",
                    platform,
                    {
                        "post_id": "1",
                        "content": f"{platform} ok",
                        "variant_index": 1,
                        "platform_total": 1,
                    },
                )
        return {"platform_contents": {"X": "X ok"}, "__interrupt__": [object()]}

    async def collect_events():
        return [event async for event in generation_stream(str(campaign.id), db_session)]

    monkeypatch.setattr("src.services.sse.run_until_review", fake_run_until_review)

    events = asyncio.run(collect_events())
    db_session.refresh(campaign)
    ig_post = db_session.query(Post).filter(Post.campaign_id == campaign.id, Post.platform == "INSTAGRAM").one()
    x_post = db_session.query(Post).filter(Post.campaign_id == campaign.id, Post.platform == "X").one()
    assert ig_post.status == "SKIPPED"
    assert x_post.status == "UNDER_REVIEW"
    assert campaign.status == "AWAITING_REVIEW"
    assert any('"event": "platform_skipped"' in e and "INSTAGRAM" in e for e in events)
    assert any('"event": "writer_done"' in e and "X" in e for e in events)
    assert any('"event": "generation_complete"' in e for e in events)


def test_generation_stream_reports_blank_exception_type(
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post_factory(campaign, platform="X", content=None)

    async def boom(**kwargs):
        raise NotImplementedError()

    monkeypatch.setattr("src.services.sse.run_until_review", boom)

    async def collect_events():
        return [event async for event in generation_stream(str(campaign.id), db_session)]

    events = asyncio.run(collect_events())
    db_session.refresh(campaign)
    assert campaign.status == "FAILED"
    error_events = [e for e in events if '"event": "error"' in e]
    assert error_events
    assert "NotImplementedError" in error_events[0]


def test_generation_stream_fails_when_every_platform_is_skipped(
    db_session,
    user_factory,
    campaign_factory,
    post_factory,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post_factory(campaign, platform="INSTAGRAM", content=None)

    monkeypatch.setattr(
        "src.services.generation_platforms.settings.instagram_app_id",
        "app-id",
    )
    monkeypatch.setattr(
        "src.services.generation_platforms.settings.instagram_app_secret",
        "secret",
    )

    ran = {"value": False}

    async def should_not_run(**kwargs):
        ran["value"] = True
        return {}

    monkeypatch.setattr("src.services.sse.run_until_review", should_not_run)

    async def collect_events():
        return [event async for event in generation_stream(str(campaign.id), db_session)]

    events = asyncio.run(collect_events())
    db_session.refresh(campaign)
    ig_post = db_session.query(Post).filter(Post.campaign_id == campaign.id).one()
    assert not ran["value"]
    assert ig_post.status == "SKIPPED"
    assert campaign.status == "FAILED"
    assert any('"awaiting_review": false' in e for e in events)
