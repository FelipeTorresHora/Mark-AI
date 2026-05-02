from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.brand_profile import BrandProfile
from src.models.user import User
from src.schemas.brand_profile import BrandProfileRequest, BrandProfileResponse

router = APIRouter(prefix="/brand-profile", tags=["brand-profile"])


@router.get("", response_model=BrandProfileResponse)
def get_brand_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(BrandProfile).filter(BrandProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de marca não encontrado")
    return profile


@router.put("", response_model=BrandProfileResponse)
def upsert_brand_profile(
    body: BrandProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(BrandProfile).filter(BrandProfile.user_id == current_user.id).first()
    if profile:
        profile.name = body.name
        profile.niche = body.niche
        profile.tone = body.tone
        profile.target_audience = body.target_audience
        profile.unique_value = body.unique_value
    else:
        profile = BrandProfile(
            user_id=current_user.id,
            name=body.name,
            niche=body.niche,
            tone=body.tone,
            target_audience=body.target_audience,
            unique_value=body.unique_value,
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile
