from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.user import User
from src.schemas.goals import GoalsResponse, UpdateAudienceRequest, UpdatePrimaryObjectiveRequest
from src.services.goals import build_goals_payload, normalize_audience, update_primary_objective

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=GoalsResponse)
def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return build_goals_payload(db, current_user)


@router.patch("/audience", response_model=GoalsResponse)
def update_audience(
    body: UpdateAudienceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.audience = normalize_audience(body.audience)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return build_goals_payload(db, current_user)


@router.patch("/objective", response_model=GoalsResponse)
def set_primary_objective(
    body: UpdatePrimaryObjectiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_primary_objective(db, current_user, body.objective)
    return build_goals_payload(db, current_user)
