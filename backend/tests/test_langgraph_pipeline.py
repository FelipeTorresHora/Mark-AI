import asyncio

from src.services.langgraph_pipeline import (
    get_review_interrupt_contents,
    new_thread_id,
    resume_after_human,
    run_until_review,
)


def test_graph_interrupts_for_human_review(monkeypatch):
    async def fake_generate_post(platform, objective, brand_context, **kwargs):
        return f"Post {platform} para {objective}"

    monkeypatch.setattr("src.services.langgraph_pipeline.generate_post", fake_generate_post)

    thread_id = new_thread_id()

    async def run():
        return await run_until_review(
            thread_id=thread_id,
            objective="Crescer no LinkedIn",
            brand_context={
                "name": "Marca",
                "niche": "Tech",
                "tone": "Direto",
                "target_audience": "Devs",
                "unique_value": "IA",
            },
            platforms=["X", "LINKEDIN"],
            platform_post_ids={"X": "p1", "LINKEDIN": "p2"},
            audience="founder",
            user_id="user-1",
            campaign_id="camp-1",
            emitter=None,
        )

    state = asyncio.run(run())
    assert state.get("__interrupt__")
    assert "X" in state.get("platform_contents", {})
    assert "LINKEDIN" in state.get("platform_contents", {})


def test_graph_continues_after_platform_timeout(monkeypatch):
    call_count = 0

    async def slow_generate(platform, objective, brand_context, **kwargs):
        nonlocal call_count
        call_count += 1
        if platform == "INSTAGRAM":
            import asyncio

            await asyncio.sleep(60)
        return f"Post {platform}"

    monkeypatch.setattr("src.services.langgraph_pipeline.generate_post", slow_generate)
    monkeypatch.setattr("src.services.langgraph_pipeline.settings.generation_timeout_seconds", 0.05)

    thread_id = new_thread_id()

    async def run():
        return await run_until_review(
            thread_id=thread_id,
            objective="Objetivo",
            brand_context={
                "name": "M",
                "niche": "N",
                "tone": "T",
                "target_audience": "A",
                "unique_value": "U",
            },
            platforms=["X", "INSTAGRAM"],
            platform_post_ids={"X": "p1", "INSTAGRAM": "p2"},
            audience=None,
            user_id=None,
            campaign_id=None,
            emitter=None,
        )

    state = asyncio.run(run())
    assert "X" in state.get("platform_contents", {})
    assert "INSTAGRAM" not in state.get("platform_contents", {})


def test_get_review_interrupt_contents_after_run(monkeypatch):
    async def fake_generate_post(platform, objective, brand_context, **kwargs):
        return f"Post {platform}"

    monkeypatch.setattr("src.services.langgraph_pipeline.generate_post", fake_generate_post)

    thread_id = new_thread_id()

    async def run():
        await run_until_review(
            thread_id=thread_id,
            objective="Objetivo",
            brand_context={
                "name": "M",
                "niche": "N",
                "tone": "T",
                "target_audience": "A",
                "unique_value": "U",
            },
            platforms=["X"],
            platform_post_ids={"X": "p1"},
            audience=None,
            user_id=None,
            campaign_id=None,
            emitter=None,
        )

    asyncio.run(run())
    contents = get_review_interrupt_contents(thread_id)
    assert contents == {"X": ["Post X"]}


def test_graph_resume_approve_completes(monkeypatch):
    async def fake_generate_post(platform, objective, brand_context, **kwargs):
        return f"Post {platform}"

    monkeypatch.setattr("src.services.langgraph_pipeline.generate_post", fake_generate_post)

    thread_id = new_thread_id()

    async def run():
        await run_until_review(
            thread_id=thread_id,
            objective="Objetivo",
            brand_context={
                "name": "M",
                "niche": "N",
                "tone": "T",
                "target_audience": "A",
                "unique_value": "U",
            },
            platforms=["X"],
            platform_post_ids={"X": "p1"},
            audience=None,
            user_id=None,
            campaign_id=None,
            emitter=None,
        )
        return await resume_after_human(thread_id, "approve")

    final = asyncio.run(run())
    assert not final.get("__interrupt__")


def test_graph_generates_multiple_variants_per_platform(monkeypatch):
    async def fake_generate_post(platform, objective, brand_context, **kwargs):
        return f"{platform}-{kwargs.get('attempt')}"

    monkeypatch.setattr("src.services.langgraph_pipeline.generate_post", fake_generate_post)
    thread_id = new_thread_id()

    async def run():
        return await run_until_review(
            thread_id=thread_id,
            objective="Objetivo",
            brand_context={
                "name": "M",
                "niche": "N",
                "tone": "T",
                "target_audience": "A",
                "unique_value": "U",
            },
            platforms=["X"],
            platform_post_ids={"X": ["p1", "p2"]},
            audience=None,
            user_id=None,
            campaign_id=None,
            emitter=None,
        )

    state = asyncio.run(run())
    assert state.get("platform_contents", {}).get("X") == ["X-1", "X-2"]
