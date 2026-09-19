"""Resume LangGraph after human approve/redo."""
from sqlalchemy.orm import Session

from src.models.campaign import Campaign
from src.models.post import Post
from src.services.langgraph_pipeline import resume_after_human
from src.services.langsmith_evals import record_human_feedback


async def apply_human_review(
    db: Session,
    campaign: Campaign,
    *,
    action: str,
    platform: str | None = None,
    feedback: str | None = None,
    langsmith_run_id: str | None = None,
) -> tuple[Campaign, list[Post], bool]:
    if not campaign.graph_thread_id:
        raise ValueError("Campanha sem thread LangGraph")

    result = await resume_after_human(
        campaign.graph_thread_id,
        action,
        platform=platform,
        feedback=feedback,
    )

    contents = result.get("platform_contents") or {}
    awaiting_review = bool(result.get("__interrupt__"))

    posts = (
        db.query(Post)
        .filter(Post.campaign_id == campaign.id)
        .order_by(Post.created_at.asc())
        .all()
    )
    posts_by_platform: dict[str, Post] = {}
    for post in posts:
        if post.platform not in posts_by_platform:
            posts_by_platform[post.platform] = post

    if action == "redo" and platform:
        post = posts_by_platform.get(platform.upper())
        if post and platform.upper() in contents:
            post.content = contents[platform.upper()]
            post.feedback = feedback
            post.status = "UNDER_REVIEW"

    if action == "approve" and not awaiting_review:
        for post in posts_by_platform.values():
            post.status = "APPROVED"
        campaign.status = "DONE"
    elif awaiting_review or action == "redo":
        campaign.status = "AWAITING_REVIEW"
    else:
        campaign.status = "DONE"

    db.commit()
    db.refresh(campaign)
    for post in posts:
        db.refresh(post)

    record_human_feedback(
        langsmith_run_id,
        approved=action == "approve",
        feedback=feedback,
    )

    return campaign, posts, awaiting_review
