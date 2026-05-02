import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from src.database import get_db
from src.dependencies.auth import get_current_user, get_user_from_token_query
from src.models.campaign import Campaign
from src.models.post import Post
from src.models.user import User
from src.schemas.generate import GenerateRequest, GenerateResponse
from src.services.sse import generation_stream

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("", response_model=GenerateResponse)
def start_generation(
    request: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = Campaign(
        topic=request.topic,
        brand_context=request.brand_context.model_dump(),
        status="PENDING",
        user_id=current_user.id,
    )
    db.add(campaign)
    db.flush()

    posts: list[Post] = []
    for platform, count in request.posts_per_platform.model_dump().items():
        for _ in range(count):
            posts.append(Post(campaign_id=campaign.id, user_id=current_user.id, platform=platform, status="DRAFT"))

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
    current_user: User = Depends(get_user_from_token_query),
):
    """SSE endpoint. Auth via ?token= query param (EventSource cannot send headers)."""
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
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
