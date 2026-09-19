import asyncio
import json
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from src.models.campaign import Campaign
from src.models.post import Post
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
    for post in posts:
        if post.platform not in posts_by_platform:
            posts_by_platform[post.platform] = post

    platforms = list(posts_by_platform.keys())
    platform_post_ids = {p: str(posts_by_platform[p].id) for p in platforms}

    events_queue: asyncio.Queue[tuple[str, str | None, dict]] = asyncio.Queue()

    def emitter(event: str, platform: str | None, data: dict) -> None:
        events_queue.put_nowait((event, platform, data))

    audience = campaign.audience

    graph_result: dict = {}
    graph_error: str | None = None

    async def run_graph():
        nonlocal graph_result, graph_error
        try:
            graph_result = await run_until_review(
                thread_id=campaign.graph_thread_id,
                objective=objective,
                brand_context=campaign.brand_context,
                platforms=platforms,
                platform_post_ids=platform_post_ids,
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
        for platform, post in posts_by_platform.items():
            if platform in contents:
                post.content = contents[platform]
                post.status = "UNDER_REVIEW"
            elif graph_error:
                post.status = "DRAFT"
        campaign.status = "AWAITING_REVIEW" if not graph_error else "FAILED"
        db.commit()

    yield make_event(
        "generation_complete",
        None,
        {"campaign_id": campaign_id, "awaiting_review": not graph_error},
    )
