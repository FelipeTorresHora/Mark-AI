from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.user import User
from src.services.auth_service import decode_token

_bearer = HTTPBearer()
_optional_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Extract Bearer token from Authorization header, validate, return User."""
    return _resolve_token(credentials.credentials, db)


def get_user_from_token_query(
    token: str = Query(..., description="JWT access token (required for SSE)"),
    db: Session = Depends(get_db),
) -> User:
    """Variant for SSE endpoints where EventSource cannot send custom headers."""
    return _resolve_token(token, db)


def get_user_for_sse(
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer),
    token: str | None = Query(None, description="JWT access token fallback for EventSource"),
    db: Session = Depends(get_db),
) -> User:
    """Prefer Authorization header; keep ?token= for legacy EventSource clients."""
    raw = (credentials.credentials if credentials else None) or token
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _resolve_token(raw, db)


def _resolve_token(token: str, db: Session) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise exc
        user_id: str = payload.get("sub")
        if not user_id:
            raise exc
    except JWTError:
        raise exc

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise exc
    return user
