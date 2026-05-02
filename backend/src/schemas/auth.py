from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        if len(v.encode("utf-8")) > 72:
            raise ValueError("A senha deve ter no máximo 72 bytes em UTF-8")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    is_active: bool
    timezone: str
    created_at: datetime

    model_config = {"from_attributes": True}
