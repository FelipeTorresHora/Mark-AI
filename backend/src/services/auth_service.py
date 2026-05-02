from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from src.config import settings

def _normalize_password(plain: str) -> bytes:
    # bcrypt only uses the first 72 bytes of the password.
    return plain.encode("utf-8")[:72]


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_normalize_password(plain), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_normalize_password(plain), hashed.encode("utf-8"))


def create_access_token(user_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    payload = {"sub": str(user_id), "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate JWT. Raises JWTError on failure."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
