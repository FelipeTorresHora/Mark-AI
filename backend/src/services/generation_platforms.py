"""Decide which platforms participate in copy generation (Instagram is optional)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from src.config import settings
from src.models.social_account import SocialAccount


def instagram_generation_block_reason(db: Session, user_id) -> str | None:
    """Return a user-facing reason to skip Instagram generation, or None to proceed."""
    if not settings.instagram_app_id or not settings.instagram_app_secret:
        return "Instagram não configurado no servidor — geração ignorada."

    account = (
        db.query(SocialAccount)
        .filter(SocialAccount.user_id == user_id, SocialAccount.platform == "INSTAGRAM")
        .first()
    )
    if account is None:
        return "Conta Instagram não conectada — geração ignorada."

    if account.expires_at is not None:
        expires = account.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires <= datetime.now(timezone.utc):
            return "Token Instagram expirado — reconecte em Configurações."

    if account.last_error:
        return "Credenciais Instagram inválidas — reconecte em Configurações."

    return None


def platform_generation_block_reason(db: Session, platform: str, user_id) -> str | None:
    if platform == "INSTAGRAM":
        return instagram_generation_block_reason(db, user_id)
    return None
