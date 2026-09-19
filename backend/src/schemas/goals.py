from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AudienceType = Literal["mei_loja_liberal", "founder", "faceless"]
AudienceInput = Literal["mei_loja_liberal", "founder", "faceless", "mei"]


class GoalItemResponse(BaseModel):
    key: str
    title: str
    description: str
    featured: bool
    completed: bool
    completed_at: datetime | None
    current: int
    target: int
    progress_percent: int = Field(ge=0, le=100)


class GoalsResponse(BaseModel):
    audience: AudienceType
    goals: list[GoalItemResponse]
    completed_count: int
    total_count: int


class UpdateAudienceRequest(BaseModel):
    audience: AudienceInput
