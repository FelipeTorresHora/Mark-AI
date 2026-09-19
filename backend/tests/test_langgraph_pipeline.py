import asyncio

from src.services.langgraph_pipeline import new_thread_id, resume_after_human, run_until_review


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
