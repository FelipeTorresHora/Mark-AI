import json
import asyncio
from typing import AsyncGenerator
from sqlalchemy.orm import Session
from src.models.campaign import Campaign
from src.models.post import Post
from src.services.gemini import generate_post


async def generation_stream(campaign_id: str, db: Session) -> AsyncGenerator[str, None]:
    """
    SSE generator que executa a geração de posts e emite eventos de progresso.
    Cada evento segue o formato: data: {json}\\n\\n
    """

    def make_event(event: str, platform: str | None, data: dict) -> str:
        payload = json.dumps({"event": event, "platform": platform, "data": data})
        return f"data: {payload}\n\n"

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        yield make_event("error", None, {"message": "Campanha não encontrada"})
        return

    campaign.status = "GENERATING"
    db.commit()

    brand_context = campaign.brand_context
    platform_order = ["X", "LINKEDIN"]
    posts = (
        db.query(Post)
        .filter(Post.campaign_id == campaign.id)
        .order_by(Post.created_at.asc(), Post.id.asc())
        .all()
    )
    posts_by_platform = {
        platform: [post for post in posts if post.platform == platform]
        for platform in platform_order
    }
    post_records = {str(post.id): post for post in posts}

    async def generate_variant(post_id: str, platform: str, variant_index: int, platform_total: int):
        try:
            content = await generate_post(platform, campaign.topic, brand_context)
            return {
                "ok": True,
                "post_id": post_id,
                "platform": platform,
                "variant_index": variant_index,
                "platform_total": platform_total,
                "content": content,
            }
        except Exception as exc:
            return {
                "ok": False,
                "post_id": post_id,
                "platform": platform,
                "variant_index": variant_index,
                "platform_total": platform_total,
                "message": str(exc),
            }

    tasks = []
    for platform in platform_order:
        platform_posts = posts_by_platform[platform]
        platform_total = len(platform_posts)
        for variant_index, post in enumerate(platform_posts, start=1):
            yield make_event("writer_start", platform, {
                "post_id": str(post.id),
                "variant_index": variant_index,
                "platform_total": platform_total,
            })
            tasks.append(
                asyncio.create_task(
                    generate_variant(str(post.id), platform, variant_index, platform_total)
                )
            )

    for task in asyncio.as_completed(tasks):
        result = await task
        post = post_records[result["post_id"]]

        if result["ok"]:
            post.content = result["content"]
            post.status = "APPROVED"
            db.commit()
            db.refresh(post)
            yield make_event("writer_done", result["platform"], {
                "post_id": result["post_id"],
                "content": result["content"],
                "variant_index": result["variant_index"],
                "platform_total": result["platform_total"],
            })
        else:
            post.status = "DRAFT"
            db.commit()
            db.refresh(post)
            yield make_event("error", result["platform"], {
                "post_id": result["post_id"],
                "variant_index": result["variant_index"],
                "platform_total": result["platform_total"],
                "message": result["message"],
            })
        await asyncio.sleep(0)

    all_posts = db.query(Post).filter(Post.campaign_id == campaign.id).all()
    failed = any(p.status == "DRAFT" for p in all_posts)
    campaign.status = "FAILED" if failed else "DONE"
    db.commit()

    yield make_event("generation_complete", None, {"campaign_id": campaign_id})
