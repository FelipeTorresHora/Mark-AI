from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.campaign import Campaign
from src.models.post import Post
from src.models.user import User
from src.schemas.campaign import CampaignResponse, CampaignSummary
from src.schemas.pagination import PaginatedResponse

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _get_owned_campaign(campaign_id: str, user_id, db: Session) -> Campaign:
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == user_id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    return campaign


@router.get("")
def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[CampaignSummary]:
    base_query = (
        db.query(
            Campaign,
            func.count(Post.id).label("post_count"),
        )
        .filter(Campaign.user_id == current_user.id)
        .outerjoin(Post, Post.campaign_id == Campaign.id)
        .group_by(Campaign.id)
    )

    # Count total campaigns (antes de paginar)
    total = db.query(func.count(Campaign.id)).filter(
        Campaign.user_id == current_user.id
    ).scalar() or 0

    results = (
        base_query.order_by(Campaign.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    summaries = []
    for campaign, post_count in results:
        summaries.append(CampaignSummary(
            id=campaign.id,
            topic=campaign.topic,
            status=campaign.status,
            post_count=post_count,
            created_at=campaign.created_at,
        ))
    return PaginatedResponse(
        items=summaries,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_campaign(campaign_id, current_user.id, db)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = _get_owned_campaign(campaign_id, current_user.id, db)
    db.delete(campaign)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
