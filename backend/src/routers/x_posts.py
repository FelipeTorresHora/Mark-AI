from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.post import Post
from src.models.user import User
from src.schemas.pagination import PaginatedResponse
from src.schemas.x_post import XPostCreate, XPostResponse, XPostSchedule
from src.services.x_audit import record_x_audit_log
from src.services.x_publish import (
    ensure_x_enabled,
    friendly_error_message,
    get_active_x_account,
    normalize_utc_naive,
    publish_x_post_record,
    utcnow_naive,
)

router = APIRouter(prefix="/x-posts", tags=["x-posts"])


def _get_owned_x_post(db: Session, post_id: str, user: User) -> Post:
    post = (
        db.query(Post)
        .filter(Post.id == post_id, Post.user_id == user.id, Post.platform == "X")
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post X não encontrado")
    return post


def _ensure_connected(db: Session, user: User) -> None:
    if get_active_x_account(db, user.id) is None:
        raise HTTPException(status_code=400, detail=friendly_error_message("account_disconnected"))


def _ensure_schedule_limit(db: Session, user: User) -> None:
    count = (
        db.query(Post)
        .filter(
            Post.user_id == user.id,
            Post.platform == "X",
            Post.publish_status == "pending",
            Post.scheduled_at.isnot(None),
        )
        .count()
    )
    if count >= settings.x_max_scheduled_posts_per_user:
        raise HTTPException(status_code=429, detail="Limite de posts agendados atingido.")


def _ensure_hourly_limit(db: Session, user: User, *, scheduled: bool, limit: int, message: str) -> None:
    if limit <= 0:
        return
    cutoff = utcnow_naive() - timedelta(hours=1)
    query = db.query(Post).filter(
        Post.user_id == user.id,
        Post.platform == "X",
        Post.created_at >= cutoff,
    )
    if scheduled:
        query = query.filter(Post.scheduled_at.isnot(None))
    else:
        query = query.filter(Post.scheduled_at.is_(None))

    if query.count() >= limit:
        raise HTTPException(status_code=429, detail=message)


@router.get("", response_model=PaginatedResponse[XPostResponse])
def list_x_posts(
    publish_status: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Post).filter(Post.user_id == current_user.id, Post.platform == "X")
    if publish_status:
        query = query.filter(Post.publish_status == publish_status)

    total = query.count()
    items = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(
        items=[XPostResponse.model_validate(post) for post in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{post_id}", response_model=XPostResponse)
def get_x_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_x_post(db, post_id, current_user)


@router.post("/publish", response_model=XPostResponse, status_code=status.HTTP_201_CREATED)
def publish_now(
    body: XPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_x_enabled()
    _ensure_hourly_limit(
        db,
        current_user,
        scheduled=False,
        limit=settings.x_publish_rate_limit_per_hour,
        message="Limite de publicações por hora atingido.",
    )
    _ensure_connected(db, current_user)

    post = Post(
        user_id=current_user.id,
        platform="X",
        status="FINAL",
        publish_status="pending",
        content=body.content.strip(),
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    updated = publish_x_post_record(db, post)
    record_x_audit_log(db, current_user.id, "publish_requested", post_id=updated.id)
    return updated


@router.post("/schedule", response_model=XPostResponse, status_code=status.HTTP_201_CREATED)
def schedule_post(
    body: XPostSchedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_x_enabled()
    _ensure_hourly_limit(
        db,
        current_user,
        scheduled=True,
        limit=settings.x_schedule_rate_limit_per_hour,
        message="Limite de agendamentos por hora atingido.",
    )
    _ensure_connected(db, current_user)
    _ensure_schedule_limit(db, current_user)

    scheduled_at = normalize_utc_naive(body.scheduled_at)
    if scheduled_at <= utcnow_naive() + timedelta(seconds=30):
        raise HTTPException(status_code=422, detail="Agendamento deve ser no futuro.")

    post = Post(
        user_id=current_user.id,
        platform="X",
        status="FINAL",
        publish_status="pending",
        content=body.content.strip(),
        scheduled_at=scheduled_at,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    record_x_audit_log(db, current_user.id, "scheduled", post_id=post.id)
    return post


@router.post("/{post_id}/cancel", response_model=XPostResponse)
def cancel_x_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = _get_owned_x_post(db, post_id, current_user)
    if post.publish_status == "published" or post.platform_post_id:
        raise HTTPException(status_code=422, detail="Post publicado não pode ser cancelado.")
    if post.publish_status == "processing":
        raise HTTPException(status_code=422, detail="Post em processamento não pode ser cancelado.")

    post.publish_status = "canceled"
    post.next_attempt_at = None
    db.commit()
    db.refresh(post)
    record_x_audit_log(db, current_user.id, "canceled", post_id=post.id)
    return post
