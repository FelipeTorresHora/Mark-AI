from pydantic import BaseModel, Field
from typing import Optional
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


class GenerateRequest(BaseModel):
    topic: str
    brand_context: BrandContextInput
    posts_per_platform: PostsPerPlatformInput = Field(default_factory=PostsPerPlatformInput)


class GenerateResponse(BaseModel):
    campaign_id: UUID
    post_ids: list[UUID]
    message: str = "Geração iniciada. Conecte ao stream para acompanhar em tempo real."
