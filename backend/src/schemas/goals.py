from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

AudienceType = Literal["mei_loja_liberal", "founder", "faceless"]


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
    primary_objective: str | None = None
    goals: list[GoalItemResponse]
    completed_count: int
    total_count: int


class UpdateAudienceRequest(BaseModel):
    audience: AudienceType


class UpdatePrimaryObjectiveRequest(BaseModel):
    objective: str = Field(min_length=20, max_length=2000)

    @field_validator("objective")
    @classmethod
    def strip_objective(cls, v: str) -> str:
        return v.strip()
