import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from src.database import get_db
from src.dependencies.auth import get_current_user, get_user_for_sse
from src.services.rate_limit import RateLimitExceeded, check_rate_limit
from src.models.campaign import Campaign
from src.models.post import Post
from src.models.user import User
from src.schemas.generate import (
    GenerateRequest,
    GenerateResponse,
    HumanReviewRequest,
    HumanReviewResponse,
)
from src.services.human_review import apply_human_review
from src.services.sse import generation_stream

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("", response_model=GenerateResponse)
def start_generation(
    request: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = request.topic.strip()
    strategic = (current_user.primary_objective or "").strip()
    objective = (request.objective or strategic or topic).strip()
    campaign = Campaign(
        topic=topic,
        objective=objective,
        audience=request.audience,
        brand_context=request.brand_context.model_dump(),
        status="PENDING",
        user_id=current_user.id,
    )
    db.add(campaign)
    db.flush()

    posts: list[Post] = []
    for platform, count in request.posts_per_platform.model_dump().items():
        if count <= 0:
            continue
        for _ in range(count):
            posts.append(
                Post(
                    campaign_id=campaign.id,
                    user_id=current_user.id,
                    platform=platform,
                    status="DRAFT",
                )
            )

    db.add_all(posts)
    db.commit()
    db.refresh(campaign)
    for p in posts:
        db.refresh(p)

    return GenerateResponse(
        campaign_id=campaign.id,
        post_ids=[p.id for p in posts],
    )


@router.get("/{campaign_id}/stream")
def stream_generation(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user_for_sse),
):
    """SSE endpoint. Auth via Authorization Bearer (preferred) or ?token= fallback."""
    try:
        uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="campaign_id inválido")

    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")

    return StreamingResponse(
        generation_stream(campaign_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{campaign_id}/human", response_model=HumanReviewResponse)
async def human_review(
    campaign_id: str,
    body: HumanReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="campaign_id inválido")

    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")

    if campaign.status != "AWAITING_REVIEW":
        raise HTTPException(
            status_code=422,
            detail=f"Campanha não está aguardando revisão (status={campaign.status})",
        )

    if body.action == "redo":
        try:
            check_rate_limit(
                f"human-redo:{current_user.id}",
                max_hits=8,
                window_seconds=600,
            )
        except RateLimitExceeded as exc:
            raise HTTPException(status_code=429, detail=str(exc)) from exc

    try:
        campaign, posts, awaiting = await apply_human_review(
            db,
            campaign,
            action=body.action,
            platform=body.platform.upper() if body.platform else None,
            feedback=body.feedback,
            langsmith_run_id=None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return HumanReviewResponse(
        campaign_id=campaign.id,
        status=campaign.status,
        awaiting_review=awaiting,
        posts=[
            {
                "id": str(p.id),
                "platform": p.platform,
                "status": p.status,
                "content": p.content,
                "feedback": p.feedback,
            }
            for p in posts
        ],
    )
