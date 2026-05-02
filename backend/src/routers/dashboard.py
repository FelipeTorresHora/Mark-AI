from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.user import User
from src.schemas.dashboard import DashboardInsightsResponse, InsightSyncResponse
from src.services.post_insights import build_dashboard_insights, sync_user_post_insights

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/insights", response_model=DashboardInsightsResponse)
def get_dashboard_insights(
    range_days: Literal[7, 30, 90] = Query(30),
    platform: Literal["ALL", "X", "LINKEDIN"] = Query("ALL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return build_dashboard_insights(
        db=db,
        user_id=current_user.id,
        range_days=range_days,
        platform=platform,
    )


@router.post("/insights/sync", response_model=InsightSyncResponse)
def sync_dashboard_insights(
    platform: Literal["ALL", "X", "LINKEDIN"] = Query("ALL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return sync_user_post_insights(db=db, user_id=current_user.id, platform=platform)
