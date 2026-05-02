from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db
from src.services.post_insights import sync_all_users_post_insights
from src.services.x_publish import ensure_x_enabled, process_due_x_posts

router = APIRouter(prefix="/cron", tags=["cron"])


@router.api_route("/x-publish-due", methods=["GET", "POST"])
def publish_due_x_posts(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    ensure_x_enabled()
    expected = f"Bearer {settings.cron_secret}"
    if not settings.cron_secret or authorization != expected:
        raise HTTPException(status_code=401, detail="Cron não autorizado")

    return process_due_x_posts(db, limit=10)


@router.api_route("/post-insights-sync", methods=["GET", "POST"])
def sync_post_insights(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    expected = f"Bearer {settings.cron_secret}"
    if not settings.cron_secret or authorization != expected:
        raise HTTPException(status_code=401, detail="Cron não autorizado")

    return sync_all_users_post_insights(db, limit_users=20, posts_per_user=50)
