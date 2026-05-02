from datetime import UTC, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Optional
from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.campaign import Campaign
from src.models.post import Post
from src.models.user import User
from src.schemas.post import PostResponse, PostPatchBody
from src.schemas.pagination import PaginatedResponse

router = APIRouter(prefix="/posts", tags=["posts"])

VALID_TRANSITIONS = {
    "DRAFT": ["APPROVED", "REJECTED"],
    "APPROVED": ["FINAL", "REJECTED", "PUBLISHED"],
    "UNDER_REVIEW": ["APPROVED", "REJECTED"],
    "REJECTED": [],
    "FINAL": [],
    "PUBLISHED": [],
}


def _get_post_with_ownership(post_id: str, user_id, db: Session) -> Post:
    """Fetch post and verify direct or campaign ownership."""
    post = (
        db.query(Post)
        .outerjoin(Campaign, Post.campaign_id == Campaign.id)
        .filter(
            Post.id == post_id,
            or_(Post.user_id == user_id, Campaign.user_id == user_id),
        )
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    return post


@router.get("")
def list_posts(
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[PostResponse]:
    base_query = (
        db.query(Post)
        .outerjoin(Campaign, Post.campaign_id == Campaign.id)
        .filter(or_(Post.user_id == current_user.id, Campaign.user_id == current_user.id))
    )
    if campaign_id:
        base_query = base_query.filter(Post.campaign_id == campaign_id)
    if status:
        base_query = base_query.filter(Post.status == status)
    elif campaign_id is None:
        base_query = base_query.filter(Post.status != "REJECTED")

    total = base_query.count()
    items = (
        base_query.order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return PaginatedResponse(
        items=[PostResponse.model_validate(p) for p in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{post_id}", response_model=PostResponse)
def get_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_post_with_ownership(post_id, current_user.id, db)


@router.patch("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: str,
    body: PostPatchBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = _get_post_with_ownership(post_id, current_user.id, db)

    if body.status is not None:
        allowed = VALID_TRANSITIONS.get(post.status, [])
        if body.status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Transição inválida: {post.status} → {body.status}. Permitidas: {allowed}",
            )
        post.status = body.status
        if body.status == "PUBLISHED":
            post.publish_status = "published"

    schedule_was_provided = "scheduled_at" in body.model_fields_set
    if body.content is not None or schedule_was_provided:
        if post.status in ("REJECTED", "PUBLISHED"):
            raise HTTPException(
                status_code=422,
                detail="Posts rejeitados ou publicados não podem ser editados",
            )
        if body.content is not None:
            post.content = body.content
        if schedule_was_provided:
            if body.scheduled_at is not None:
                scheduled_at = body.scheduled_at
                if scheduled_at.tzinfo is not None:
                    scheduled_at = scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)
                if scheduled_at <= datetime.now(UTC).replace(tzinfo=None):
                    raise HTTPException(status_code=422, detail="Agendamento deve ser no futuro.")
                post.scheduled_at = scheduled_at
                post.publish_status = "pending"
            else:
                post.scheduled_at = None
                if post.publish_status != "published":
                    post.publish_status = "pending"

    db.commit()
    db.refresh(post)
    return post
