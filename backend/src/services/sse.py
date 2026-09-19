import asyncio
import json
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from src.models.campaign import Campaign
from src.models.post import Post
from src.services.generation_platforms import platform_generation_block_reason
from src.services.langgraph_pipeline import new_thread_id, run_until_review


async def generation_stream(campaign_id: str, db: Session) -> AsyncGenerator[str, None]:
    """SSE generator: LangGraph até interrupt de revisão humana."""

    def make_event(event: str, platform: str | None, data: dict) -> str:
        payload = json.dumps({"event": event, "platform": platform, "data": data})
        return f"data: {payload}\n\n"

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        yield make_event("error", None, {"message": "Campanha não encontrada"})
        return

    campaign.status = "GENERATING"
    if not campaign.graph_thread_id:
        campaign.graph_thread_id = new_thread_id()
    objective = campaign.objective or campaign.topic
    db.commit()

    posts = (
        db.query(Post)
        .filter(Post.campaign_id == campaign.id)
        .order_by(Post.created_at.asc(), Post.id.asc())
        .all()
    )
    posts_by_platform: dict[str, Post] = {}
    platform_totals: dict[str, int] = {}
    for post in posts:
        platform_totals[post.platform] = platform_totals.get(post.platform, 0) + 1
        if post.platform not in posts_by_platform:
            posts_by_platform[post.platform] = post

    platforms = list(posts_by_platform.keys())
    platform_post_ids = {p: str(posts_by_platform[p].id) for p in platforms}

    yield make_event(
        "generation_plan",
        None,
        {"platforms": {p: platform_totals.get(p, 1) for p in platforms}},
    )

    events_queue: asyncio.Queue[tuple[str, str | None, dict]] = asyncio.Queue()

    def emitter(event: str, platform: str | None, data: dict) -> None:
        events_queue.put_nowait((event, platform, data))

    audience = campaign.audience
    user_id = campaign.user_id

    platforms_for_graph: list[str] = []
    for platform in platforms:
        skip_reason = (
            platform_generation_block_reason(db, platform, user_id) if user_id else None
        )
        if skip_reason:
            post_id = platform_post_ids.get(platform, "")
            total = platform_totals.get(platform, 1)
            emitter(
                "platform_skipped",
                platform,
                {
                    "post_id": post_id,
                    "message": skip_reason,
                    "variant_index": 1,
                    "platform_total": total,
                },
            )
            continue
        platforms_for_graph.append(platform)

    graph_result: dict = {}
    graph_error: str | None = None

    async def run_graph():
        nonlocal graph_result, graph_error
        if not platforms_for_graph:
            return
        try:
            graph_result = await run_until_review(
                thread_id=campaign.graph_thread_id,
                objective=objective,
                brand_context=campaign.brand_context,
                platforms=platforms_for_graph,
                platform_post_ids={
                    p: platform_post_ids[p] for p in platforms_for_graph
                },
                audience=audience,
                user_id=str(campaign.user_id) if campaign.user_id else None,
                campaign_id=str(campaign.id),
                emitter=emitter,
            )
        except Exception as exc:
            graph_error = str(exc)
            events_queue.put_nowait(("error", None, {"message": graph_error}))
        finally:
            events_queue.put_nowait(("__done__", None, {}))

    task = asyncio.create_task(run_graph())
    if not platforms_for_graph:
        events_queue.put_nowait(("__done__", None, {}))

    while True:
        event, platform, data = await events_queue.get()
        if event == "__done__":
            break
        yield make_event(event, platform, data)
        await asyncio.sleep(0)

    await task

    contents = (graph_result or {}).get("platform_contents") or {}
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if campaign:
        any_generated = False
        for platform, post in posts_by_platform.items():
            if platform in contents:
                post.content = contents[platform]
                post.status = "UNDER_REVIEW"
                any_generated = True
            elif graph_error:
                post.status = "DRAFT"

        if graph_error and any_generated:
            graph_error = None

        campaign.status = "AWAITING_REVIEW" if not graph_error else "FAILED"
        db.commit()

    yield make_event(
        "generation_complete",
        None,
        {
            "campaign_id": campaign_id,
            "awaiting_review": not graph_error,
        },
    )
