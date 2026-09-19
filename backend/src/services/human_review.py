"""Resume LangGraph after human approve/redo."""
from sqlalchemy.orm import Session

from src.models.campaign import Campaign
from src.models.post import Post
from src.services.langgraph_pipeline import normalize_platform_contents, resume_after_human
from src.services.langsmith_evals import record_human_feedback
from src.services.prompt_safety import sanitize_redo_feedback


REVIEWABLE_STATUSES = frozenset({"DRAFT", "UNDER_REVIEW", "APPROVED"})


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

    safe_feedback = sanitize_redo_feedback(feedback) if feedback else None

    result = await resume_after_human(
        campaign.graph_thread_id,
        action,
        platform=platform,
        feedback=safe_feedback,
    )

    contents = normalize_platform_contents(result.get("platform_contents"))
    awaiting_review = bool(result.get("__interrupt__"))

    posts = (
        db.query(Post)
        .filter(Post.campaign_id == campaign.id)
        .order_by(Post.created_at.asc(), Post.id.asc())
        .all()
    )
    posts_by_platform: dict[str, list[Post]] = {}
    for post in posts:
        posts_by_platform.setdefault(post.platform, []).append(post)

    if action == "redo" and platform:
        target = platform.upper()
        texts = contents.get(target) or []
        for index, post in enumerate(posts_by_platform.get(target, [])):
            if index < len(texts) and texts[index]:
                post.content = texts[index]
                post.feedback = safe_feedback
                post.status = "UNDER_REVIEW"

    if action == "approve" and not awaiting_review:
        for post in posts:
            if post.status == "SKIPPED":
                continue
            if post.status in REVIEWABLE_STATUSES and post.content:
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

    # Ignore client-supplied LangSmith run IDs (spoofing). Only record when we
    # have a server-side identifier — currently unused.
    _ = langsmith_run_id
    record_human_feedback(
        None,
        approved=action == "approve",
        feedback=safe_feedback,
    )

    return campaign, posts, awaiting_review
