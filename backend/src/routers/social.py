"""Social account OAuth connect/disconnect and post publishing."""
from datetime import UTC, datetime, timezone
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.campaign import Campaign
from src.models.post import Post
from src.models.social_account import SocialAccount
from src.models.user import User
from src.schemas.oauth import OAuthAuthorizationUrlResponse
from src.schemas.publish import PublishResponse
from src.schemas.social_account import SocialAccountResponse
from src.services import oauth_linkedin, oauth_x
from src.services.oauth_state import build_state, parse_state
from src.services.social_crypto import decrypt_social_token, encrypt_social_token
from src.services.x_publish import get_active_x_account, publish_x_post_record

router = APIRouter(prefix="/api/v1/social", tags=["social"])

_OAUTH_ALLOWED_HOSTS = {
    "X": {"twitter.com", "x.com"},
    "LINKEDIN": {"www.linkedin.com", "linkedin.com"},
}


def _frontend_settings_redirect(frontend_origin: str | None = None, **params: str) -> RedirectResponse:
    query = urlencode(params)
    return RedirectResponse(
        f"{frontend_origin or settings.frontend_url}/configuracoes?{query}",
        status_code=status.HTTP_302_FOUND,
    )


def _validate_oauth_url(url: str, provider: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise HTTPException(status_code=500, detail="OAuth URL inválida")
    hostname = (parsed.hostname or "").lower()
    allowed_hosts = _OAUTH_ALLOWED_HOSTS[provider]
    if hostname not in allowed_hosts:
        raise HTTPException(status_code=500, detail="OAuth URL inválida")
    return url


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


def _build_x_authorization_url(user_id: str, frontend_origin: str | None = None) -> str:
    _, code_verifier = oauth_x.get_authorization_url("bootstrap")
    signed_state = build_state(user_id, "X", code_verifier, frontend_origin=frontend_origin)
    url, _ = oauth_x.get_authorization_url(signed_state, code_verifier=code_verifier)
    return _validate_oauth_url(url, "X")


def _build_linkedin_authorization_url(user_id: str, frontend_origin: str | None = None) -> str:
    state_token = build_state(user_id, "LINKEDIN", frontend_origin=frontend_origin)
    url = oauth_linkedin.get_authorization_url(state_token)
    return _validate_oauth_url(url, "LINKEDIN")


# ---------------------------------------------------------------------------
# List connected accounts
# ---------------------------------------------------------------------------

@router.get("/accounts", response_model=list[SocialAccountResponse])
def list_social_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accounts = (
        db.query(SocialAccount)
        .filter(SocialAccount.user_id == current_user.id)
        .all()
    )
    return accounts


# ---------------------------------------------------------------------------
# X (Twitter) OAuth 2.0 PKCE
# ---------------------------------------------------------------------------

@router.get("/connect/x")
def connect_x(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    url = _build_x_authorization_url(str(current_user.id), _get_frontend_origin(request))
    return RedirectResponse(url, status_code=status.HTTP_302_FOUND)


@router.get("/connect/x/url", response_model=OAuthAuthorizationUrlResponse)
def connect_x_url(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    return OAuthAuthorizationUrlResponse(
        authorization_url=_build_x_authorization_url(str(current_user.id), _get_frontend_origin(request))
    )


@router.get("/callback/x")
def callback_x(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
):
    if error:
        detail = error_description or error
        return _frontend_settings_redirect(error=detail, provider="x", frontend_origin=None)
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
    except Exception:
        return _frontend_settings_redirect(
            error="Falha ao trocar código pelo token X",
            provider="x",
            frontend_origin=parsed.get("frontend_origin"),
        )

    try:
        user_info = oauth_x.get_user_info(token_data["access_token"])
    except Exception:
        return _frontend_settings_redirect(
            error="Falha ao obter informações do usuário X",
            provider="x",
            frontend_origin=parsed.get("frontend_origin"),
        )

    _upsert_social_account(
        db=db,
        user_id=parsed["user_id"],
        platform="X",
        platform_user_id=user_info.get("id", ""),
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        expires_in=token_data.get("expires_in"),
        scope=token_data.get("scope"),
    )

    return _frontend_settings_redirect(connected="x", frontend_origin=parsed.get("frontend_origin"))


# ---------------------------------------------------------------------------
# LinkedIn OAuth 2.0
# ---------------------------------------------------------------------------

@router.get("/connect/linkedin")
def connect_linkedin(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    url = _build_linkedin_authorization_url(str(current_user.id), _get_frontend_origin(request))
    return RedirectResponse(url, status_code=status.HTTP_302_FOUND)


@router.get("/connect/linkedin/url", response_model=OAuthAuthorizationUrlResponse)
def connect_linkedin_url(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    return OAuthAuthorizationUrlResponse(
        authorization_url=_build_linkedin_authorization_url(str(current_user.id), _get_frontend_origin(request))
    )


@router.get("/callback/linkedin")
def callback_linkedin(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
):
    if error:
        detail = error_description or error
        return _frontend_settings_redirect(
            error=detail,
            provider="linkedin",
            frontend_origin=None,
        )
    if not code or not state:
        raise HTTPException(status_code=400, detail="Callback do LinkedIn incompleto")

    try:
        parsed = parse_state(state, "LINKEDIN")
    except ValueError:
        raise HTTPException(status_code=400, detail="State inválido")

    try:
        token_data = oauth_linkedin.exchange_code_for_token(code)
    except Exception:
        return _frontend_settings_redirect(
            error="Falha ao trocar código pelo token LinkedIn",
            provider="linkedin",
            frontend_origin=parsed.get("frontend_origin"),
        )

    try:
        user_info = oauth_linkedin.get_user_info(token_data["access_token"])
    except Exception:
        return _frontend_settings_redirect(
            error="Falha ao obter informações do usuário LinkedIn",
            provider="linkedin",
            frontend_origin=parsed.get("frontend_origin"),
        )

    _upsert_social_account(
        db=db,
        user_id=parsed["user_id"],
        platform="LINKEDIN",
        platform_user_id=user_info.get("sub", ""),
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        expires_in=token_data.get("expires_in"),
        scope=token_data.get("scope"),
    )

    return _frontend_settings_redirect(
        connected="linkedin",
        frontend_origin=parsed.get("frontend_origin"),
    )


# ---------------------------------------------------------------------------
# Disconnect
# ---------------------------------------------------------------------------

@router.delete("/accounts/{platform}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_account(
    platform: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    platform = platform.upper()
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user.id,
        SocialAccount.platform == platform,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não conectada")
    db.delete(account)
    db.commit()


# ---------------------------------------------------------------------------
# Publish post to social platform
# ---------------------------------------------------------------------------

@router.post("/posts/{post_id}/publish", response_model=PublishResponse)
def publish_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify post ownership via campaign
    post = (
        db.query(Post)
        .join(Campaign, Post.campaign_id == Campaign.id)
        .filter(Post.id == post_id, Campaign.user_id == current_user.id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")

    if post.status not in {"FINAL", "APPROVED"}:
        raise HTTPException(
            status_code=422,
            detail=f"Apenas posts com status FINAL podem ser publicados. Status atual: {post.status}",
        )

    if post.user_id is None:
        post.user_id = current_user.id
        db.commit()
        db.refresh(post)

    if post.platform == "X" and get_active_x_account(db, current_user.id):
        updated = publish_x_post_record(db, post)
        if updated.publish_status != "published":
            raise HTTPException(
                status_code=502,
                detail=updated.error_message or "Falha ao publicar no X.",
            )
        return PublishResponse(
            post_id=updated.id,
            platform=updated.platform,
            platform_post_id=updated.platform_post_id or "",
            published_at=updated.published_at,
        )

    # Find connected social account for this platform
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user.id,
        SocialAccount.platform == post.platform,
    ).first()
    if not account:
        raise HTTPException(
            status_code=400,
            detail=f"Conta {post.platform} não conectada. Acesse Configurações para conectar.",
        )

    # Refresh token if expired
    access_token = decrypt_social_token(account.access_token)
    refresh_token = decrypt_social_token(account.refresh_token)

    if post.platform == "X" and account.expires_at and refresh_token:
        if account.expires_at <= datetime.now(timezone.utc).replace(tzinfo=None):
            try:
                refreshed = oauth_x.refresh_access_token(refresh_token)
                access_token = refreshed["access_token"]
                account.access_token = encrypt_social_token(access_token) or ""
                next_refresh_token = refreshed.get("refresh_token", refresh_token)
                account.refresh_token = encrypt_social_token(next_refresh_token)
                if "expires_in" in refreshed:
                    from datetime import timedelta
                    account.expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(
                        seconds=refreshed["expires_in"]
                    )
                account.last_refreshed_at = datetime.now(UTC).replace(tzinfo=None)
                account.last_error = None
                db.commit()
            except Exception:
                account.last_error = "refresh_failed"
                db.commit()
                raise HTTPException(
                    status_code=400,
                    detail=f"Token {post.platform} expirado. Reconecte a conta em Configurações.",
                )
    elif post.platform == "LINKEDIN" and account.expires_at:
        if account.expires_at <= datetime.now(timezone.utc).replace(tzinfo=None):
            account.last_error = "linkedin_reconnect_required"
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Token LINKEDIN expirado. Reconecte a conta em Configurações.",
            )

    content = (post.content or "").strip()
    if not content:
        raise HTTPException(status_code=422, detail="Conteúdo do post é obrigatório para publicação.")
    if post.platform == "X" and len(content) > 280:
        raise HTTPException(status_code=422, detail="Posts do X devem ter no máximo 280 caracteres.")

    # Publish
    try:
        if post.platform == "X":
            platform_post_id = oauth_x.post_tweet(access_token or "", content)
        else:
            author_urn = f"urn:li:person:{account.platform_user_id}"
            platform_post_id = oauth_linkedin.publish_post(
                access_token or "", author_urn, content
            )
    except Exception as exc:
        account.last_error = str(exc)
        db.commit()
        raise HTTPException(
            status_code=502,
            detail=f"Falha ao publicar no {post.platform}: {exc}",
        )

    # Update post
    now = datetime.now(UTC).replace(tzinfo=None)
    post.status = "PUBLISHED"
    post.published_at = now
    post.platform_post_id = platform_post_id
    account.last_publish_at = now
    account.last_error = None
    db.commit()
    db.refresh(post)

    return PublishResponse(
        post_id=post.id,
        platform=post.platform,
        platform_post_id=platform_post_id,
        published_at=now,
    )


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _upsert_social_account(
    db: Session,
    user_id: str,
    platform: str,
    platform_user_id: str,
    access_token: str,
    refresh_token: str | None,
    expires_in: int | None,
    scope: str | None,
) -> SocialAccount:
    from datetime import timedelta

    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == platform,
    ).first()

    expires_at = None
    if expires_in:
        expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(seconds=expires_in)

    if account:
        account.platform_user_id = platform_user_id
        account.access_token = encrypt_social_token(access_token) or ""
        account.refresh_token = encrypt_social_token(refresh_token)
        account.expires_at = expires_at
        account.scope = scope
        account.last_error = None
    else:
        account = SocialAccount(
            user_id=user_id,
            platform=platform,
            platform_user_id=platform_user_id,
            access_token=encrypt_social_token(access_token) or "",
            refresh_token=encrypt_social_token(refresh_token),
            expires_at=expires_at,
            scope=scope,
        )
        db.add(account)

    db.commit()
    db.refresh(account)
    return account
