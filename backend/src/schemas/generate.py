from pydantic import BaseModel, Field, model_validator
from typing import Literal, Optional
from uuid import UUID


class BrandContextInput(BaseModel):
    name: str
    niche: str
    tone: str
    target_audience: str
    unique_value: str


class PostsPerPlatformInput(BaseModel):
    X: int = Field(default=2, ge=1, le=4)
    LINKEDIN: int = Field(default=2, ge=1, le=4)
    INSTAGRAM: int = Field(default=0, ge=0, le=4)


class GenerateRequest(BaseModel):
    topic: str
    objective: Optional[str] = None
    audience: Optional[Literal["mei", "founder", "faceless"]] = None
    brand_context: BrandContextInput
    posts_per_platform: PostsPerPlatformInput = Field(default_factory=PostsPerPlatformInput)


class GenerateResponse(BaseModel):
    campaign_id: UUID
    post_ids: list[UUID]
    message: str = "Geração iniciada. Conecte ao stream para acompanhar em tempo real."


class HumanReviewRequest(BaseModel):
    action: Literal["approve", "redo"]
    platform: Optional[str] = None
    feedback: Optional[str] = None
    langsmith_run_id: Optional[str] = None

    @model_validator(mode="after")
    def validate_redo(self):
        if self.action == "redo":
            if not (self.feedback or "").strip():
                raise ValueError("feedback é obrigatório ao refazer")
            if not self.platform:
                raise ValueError("platform é obrigatório ao refazer")
        return self


class HumanReviewResponse(BaseModel):
    campaign_id: UUID
    status: str
    posts: list[dict]
    awaiting_review: bool = False
