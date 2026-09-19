import asyncio
import contextlib
import json
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from src.models.campaign import Campaign
from src.models.post import Post
from src.services.generation_platforms import platform_generation_block_reason
from src.services.langgraph_pipeline import (
    get_review_interrupt_contents,
    graph_checkpoint_exists,
    new_thread_id,
    run_until_review,
)

KEEPALIVE_INTERVAL_SECONDS = 12
TERMINAL_CAMPAIGN_STATUSES = frozenset({"AWAITING_REVIEW", "DONE", "FAILED"})


async def generation_stream(campaign_id: str, db: Session) -> AsyncGenerator[str, None]:
    """SSE generator: LangGraph até interrupt de revisão humana."""

    def make_event(event: str, platform: str | None, data: dict) -> str:
        payload = json.dumps({"event": event, "platform": platform, "data": data})
        return f"data: {payload}\n\n"

    def keepalive_comment() -> str:
        return ": keepalive\n\n"

    yield keepalive_comment()

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        yield make_event("error", None, {"message": "Campanha não encontrada"})
        return

    if campaign.status in TERMINAL_CAMPAIGN_STATUSES:
        yield make_event(
            "generation_complete",
            None,
            {
                "campaign_id": campaign_id,
                "awaiting_review": campaign.status == "AWAITING_REVIEW",
                "resumed": True,
            },
        )
        return

    thread_id = campaign.graph_thread_id or new_thread_id()
    if not campaign.graph_thread_id:
        campaign.graph_thread_id = thread_id
    campaign.status = "GENERATING"
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

    plan_event = make_event(
        "generation_plan",
        None,
        {"platforms": {p: platform_totals.get(p, 1) for p in platforms}},
    )

    async def finalize_from_contents(
        contents: dict[str, str],
        *,
        graph_error: str | None = None,
    ) -> str | None:
        nonlocal campaign
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return "Campanha não encontrada"
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
        return graph_error

    existing_contents = get_review_interrupt_contents(thread_id)
    if existing_contents is not None:
        yield plan_event
        graph_error = await finalize_from_contents(existing_contents)
        yield make_event(
            "generation_complete",
            None,
            {
                "campaign_id": campaign_id,
                "awaiting_review": not graph_error,
                "resumed": True,
            },
        )
        return

    if graph_checkpoint_exists(thread_id):
        yield plan_event
        deadline = asyncio.get_running_loop().time() + KEEPALIVE_INTERVAL_SECONDS * 60
        waited_contents: dict[str, str] | None = None
        while asyncio.get_running_loop().time() < deadline:
            waited_contents = get_review_interrupt_contents(thread_id)
            if waited_contents is not None:
                break
            yield keepalive_comment()
            await asyncio.sleep(KEEPALIVE_INTERVAL_SECONDS / 2)
        if waited_contents is not None:
            graph_error = await finalize_from_contents(waited_contents)
            yield make_event(
                "generation_complete",
                None,
                {
                    "campaign_id": campaign_id,
                    "awaiting_review": not graph_error,
                    "resumed": True,
                },
            )
            return

    yield plan_event

    events_queue: asyncio.Queue[tuple[str, str | None, dict]] = asyncio.Queue()
    loop = asyncio.get_running_loop()
    graph_finished = asyncio.Event()

    def emitter(event: str, platform: str | None, data: dict) -> None:
        loop.call_soon_threadsafe(events_queue.put_nowait, (event, platform, data))

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
        try:
            if not platforms_for_graph:
                return
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
            loop.call_soon_threadsafe(
                events_queue.put_nowait,
                ("error", None, {"message": graph_error}),
            )
        finally:
            loop.call_soon_threadsafe(events_queue.put_nowait, ("__done__", None, {}))
            graph_finished.set()

    async def keepalive_loop():
        while not graph_finished.is_set():
            try:
                await asyncio.wait_for(graph_finished.wait(), timeout=KEEPALIVE_INTERVAL_SECONDS)
            except TimeoutError:
                await events_queue.put(("__ping__", None, {}))

    task = asyncio.create_task(run_graph())
    keepalive_task = asyncio.create_task(keepalive_loop())

    try:
        while True:
            event, platform, data = await events_queue.get()
            if event == "__done__":
                break
            if event == "__ping__":
                yield keepalive_comment()
                continue
            yield make_event(event, platform, data)
            await asyncio.sleep(0)
    finally:
        keepalive_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await keepalive_task

    await task

    contents = (graph_result or {}).get("platform_contents") or {}
    graph_error = await finalize_from_contents(contents, graph_error=graph_error)

    yield make_event(
        "generation_complete",
        None,
        {
            "campaign_id": campaign_id,
            "awaiting_review": not graph_error,
        },
    )
