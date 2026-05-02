"""Dedicated X integration routes backed by x_accounts."""
from uuid import UUID
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.user import User
from src.schemas.oauth import OAuthAuthorizationUrlResponse
from src.schemas.x_account import XAccountStatusResponse
from src.services import oauth_x
from src.services.oauth_state import build_state, parse_state
from src.services.x_audit import record_x_audit_log
from src.services.x_publish import (
    disconnect_x_account,
    ensure_x_enabled,
    get_x_account_status,
    upsert_x_account,
)

router = APIRouter(prefix="/api/v1/integrations/x", tags=["x-integration"])

_OAUTH_ALLOWED_HOSTS = {"twitter.com", "x.com"}


def _get_frontend_origin(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if not origin:
        return None

    allowed_origins = {item.strip() for item in settings.allowed_origins.split(",") if item.strip()}
    if origin in allowed_origins:
        return origin

    regex = settings.allowed_origin_regex
    if regex:
        import re

        if re.fullmatch(regex, origin):
            return origin
    return None


def _frontend_redirect(frontend_origin: str | None = None, **params: str) -> RedirectResponse:
    query = urlencode(params)
    return RedirectResponse(
        f"{frontend_origin or settings.frontend_url}/cmo?{query}",
        status_code=status.HTTP_302_FOUND,
    )


def _validate_oauth_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or (parsed.hostname or "").lower() not in _OAUTH_ALLOWED_HOSTS:
        raise HTTPException(status_code=500, detail="OAuth URL inválida")
    return url


def _build_authorization_url(user_id: str, frontend_origin: str | None) -> str:
    _, code_verifier = oauth_x.get_authorization_url("bootstrap")
    signed_state = build_state(user_id, "X", code_verifier, frontend_origin=frontend_origin)
    url, _ = oauth_x.get_authorization_url(signed_state, code_verifier=code_verifier)
    return _validate_oauth_url(url)


@router.get("/connect-url", response_model=OAuthAuthorizationUrlResponse)
def connect_url(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    ensure_x_enabled()
    return OAuthAuthorizationUrlResponse(
        authorization_url=_build_authorization_url(str(current_user.id), _get_frontend_origin(request))
    )


@router.get("/connect")
def connect(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    ensure_x_enabled()
    return RedirectResponse(
        _build_authorization_url(str(current_user.id), _get_frontend_origin(request)),
        status_code=status.HTTP_302_FOUND,
    )


@router.get("/callback")
def callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
):
    ensure_x_enabled()
    if error:
        return _frontend_redirect(error=error_description or error, provider="x")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Callback do X incompleto")

    try:
        parsed = parse_state(state, "X")
    except ValueError:
        raise HTTPException(status_code=400, detail="State inválido")

    code_verifier = parsed.get("code_verifier")
    if not code_verifier:
        raise HTTPException(status_code=400, detail="State inválido")

    try:
        token_data = oauth_x.exchange_code_for_token(code, code_verifier)
        user_info = oauth_x.get_user_info(token_data["access_token"])
    except Exception:
        return _frontend_redirect(
            error="Falha ao conectar conta X",
            provider="x",
            frontend_origin=parsed.get("frontend_origin"),
        )

    account = upsert_x_account(
        db=db,
        user_id=UUID(parsed["user_id"]),
        x_user_id=user_info.get("id", ""),
        username=user_info.get("username"),
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        expires_in=token_data.get("expires_in"),
        scope=token_data.get("scope"),
    )
    record_x_audit_log(db, account.user_id, "connected", x_account_id=account.id)

    return _frontend_redirect(connected="x", frontend_origin=parsed.get("frontend_origin"))


@router.get("/status", response_model=XAccountStatusResponse)
def status_x(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = get_x_account_status(db, current_user.id)
    if account is None or account.revoked_at is not None:
        return XAccountStatusResponse(connected=False, reconnect_required=account is not None)

    return XAccountStatusResponse(
        connected=bool(account.access_token_encrypted),
        reconnect_required=not bool(account.access_token_encrypted),
        id=account.id,
        x_user_id=account.x_user_id,
        username=account.username,
        expires_at=account.expires_at,
        last_publish_at=account.last_publish_at,
        last_error=account.last_error,
    )


@router.post("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def disconnect(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = get_x_account_status(db, current_user.id)
    disconnect_x_account(db, current_user.id)
    record_x_audit_log(
        db,
        current_user.id,
        "disconnected",
        x_account_id=account.id if account is not None else None,
    )
