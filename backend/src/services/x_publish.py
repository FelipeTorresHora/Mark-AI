from datetime import UTC, datetime, timedelta, timezone
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.config import settings
from src.models.post import Post
from src.models.x_account import XAccount
from src.models.x_audit_log import XAuditLog
from src.services import oauth_x
from src.services.social_crypto import decrypt_social_token, encrypt_social_token

RETRYABLE_ERROR_CODES = {"rate_limited", "network_error", "x_server_error"}
FINAL_ERROR_CODES = {"invalid_token", "content_rejected", "account_disconnected", "x_client_error"}


class XPublishError(Exception):
    def __init__(self, code: str, message: str, retryable: bool) -> None:
        self.code = code
        self.message = message
        self.retryable = retryable
        super().__init__(message)


def utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def ensure_x_enabled() -> None:
    if not settings.x_integration_enabled:
        raise HTTPException(status_code=503, detail="Integração com X temporariamente indisponível.")


def normalize_utc_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def friendly_error_message(code: str) -> str:
    messages = {
        "account_disconnected": "Conecte sua conta do X antes de publicar.",
        "invalid_token": "Sua conexão com o X expirou. Reconecte a conta.",
        "rate_limited": "O X limitou novas publicações agora. Tentaremos novamente em instantes.",
        "network_error": "Não foi possível falar com o X agora. Tentaremos novamente.",
        "x_server_error": "O X está instável no momento. Tentaremos novamente.",
        "content_rejected": "O X rejeitou o conteúdo do post.",
        "x_client_error": "Não foi possível publicar no X. Revise a conexão e o conteúdo.",
    }
    return messages.get(code, "Não foi possível publicar no X.")


def classify_x_exception(exc: Exception) -> XPublishError:
    if isinstance(exc, httpx.TimeoutException | httpx.NetworkError):
        return XPublishError("network_error", friendly_error_message("network_error"), True)

    if isinstance(exc, httpx.HTTPStatusError):
        status_code = exc.response.status_code
        if status_code == 429:
            return XPublishError("rate_limited", friendly_error_message("rate_limited"), True)
        if status_code in {500, 502, 503, 504}:
            return XPublishError("x_server_error", friendly_error_message("x_server_error"), True)
        if status_code in {401, 403}:
            return XPublishError("invalid_token", friendly_error_message("invalid_token"), False)
        if status_code == 400:
            return XPublishError("content_rejected", friendly_error_message("content_rejected"), False)
        return XPublishError("x_client_error", friendly_error_message("x_client_error"), False)

    return XPublishError("x_client_error", friendly_error_message("x_client_error"), False)


def get_active_x_account(db: Session, user_id: UUID) -> XAccount | None:
    return (
        db.query(XAccount)
        .filter(
            XAccount.user_id == user_id,
            XAccount.revoked_at.is_(None),
            XAccount.access_token_encrypted.isnot(None),
        )
        .first()
    )


def get_x_account_status(db: Session, user_id: UUID) -> XAccount | None:
    return db.query(XAccount).filter(XAccount.user_id == user_id).first()


def upsert_x_account(
    db: Session,
    user_id: UUID,
    x_user_id: str,
    username: str | None,
    access_token: str,
    refresh_token: str | None,
    expires_in: int | None,
    scope: str | None,
) -> XAccount:
    account = db.query(XAccount).filter(XAccount.user_id == user_id).first()
    expires_at = utcnow_naive() + timedelta(seconds=expires_in) if expires_in else None

    if account is None:
        account = XAccount(user_id=user_id, x_user_id=x_user_id)
        db.add(account)

    account.x_user_id = x_user_id
    account.username = username
    account.access_token_encrypted = encrypt_social_token(access_token)
    account.refresh_token_encrypted = encrypt_social_token(refresh_token)
    account.expires_at = expires_at
    account.scope = scope
    account.revoked_at = None
    account.last_error = None
    db.commit()
    db.refresh(account)
    return account


def disconnect_x_account(db: Session, user_id: UUID) -> None:
    account = db.query(XAccount).filter(XAccount.user_id == user_id).first()
    if account is None or account.revoked_at is not None:
        raise HTTPException(status_code=404, detail="Conta X não conectada.")

    account.access_token_encrypted = None
    account.refresh_token_encrypted = None
    account.revoked_at = utcnow_naive()
    account.last_error = None
    db.commit()


def _refresh_access_token_if_needed(db: Session, account: XAccount) -> str:
    access_token = decrypt_social_token(account.access_token_encrypted)
    if not access_token:
        raise XPublishError("account_disconnected", friendly_error_message("account_disconnected"), False)

    if account.expires_at and account.expires_at <= utcnow_naive():
        refresh_token = decrypt_social_token(account.refresh_token_encrypted)
        if not refresh_token:
            account.last_error = "missing_refresh_token"
            account.revoked_at = utcnow_naive()
            db.commit()
            raise XPublishError("invalid_token", friendly_error_message("invalid_token"), False)

        try:
            refreshed = oauth_x.refresh_access_token(refresh_token)
        except Exception as exc:
            account.last_error = "refresh_failed"
            account.revoked_at = utcnow_naive()
            db.commit()
            raise classify_x_exception(exc) from exc

        access_token = refreshed["access_token"]
        account.access_token_encrypted = encrypt_social_token(access_token)
        account.refresh_token_encrypted = encrypt_social_token(refreshed.get("refresh_token", refresh_token))
        if "expires_in" in refreshed:
            account.expires_at = utcnow_naive() + timedelta(seconds=refreshed["expires_in"])
        account.last_refreshed_at = utcnow_naive()
        account.last_error = None
        db.commit()

    return access_token


def _mark_post_failure(db: Session, post: Post, account: XAccount | None, error: XPublishError) -> Post:
    now = utcnow_naive()
    post.last_attempt_at = now
    post.error_code = error.code
    post.error_message = error.message

    if error.retryable and post.attempt_count < settings.x_publish_max_attempts:
        backoff_minutes = min(60, 2 ** max(post.attempt_count - 1, 0))
        post.publish_status = "pending"
        post.next_attempt_at = now + timedelta(minutes=backoff_minutes)
    else:
        post.publish_status = "failed"
        post.next_attempt_at = None

    if account is not None:
        account.last_error = error.code
        if error.code == "invalid_token":
            account.revoked_at = now
    if post.user_id is not None:
        db.add(
            XAuditLog(
                user_id=post.user_id,
                action="publish_failed",
                post_id=post.id,
                x_account_id=account.id if account is not None else None,
                detail=error.code,
            )
        )

    db.commit()
    db.refresh(post)
    return post


def publish_x_post_record(db: Session, post: Post, account: XAccount | None = None) -> Post:
    if post.platform != "X":
        raise HTTPException(status_code=422, detail="Apenas posts do X são suportados por este fluxo.")
    if post.publish_status == "published" or post.platform_post_id:
        return post
    if post.publish_status == "canceled":
        raise HTTPException(status_code=422, detail="Post cancelado não pode ser publicado.")

    content = (post.content or "").strip()
    if not content:
        raise HTTPException(status_code=422, detail="Conteúdo do post é obrigatório.")
    if len(content) > 280:
        raise HTTPException(status_code=422, detail="Posts do X devem ter no máximo 280 caracteres.")

    account = account or get_active_x_account(db, post.user_id)
    if account is None:
        error = XPublishError("account_disconnected", friendly_error_message("account_disconnected"), False)
        return _mark_post_failure(db, post, None, error)

    now = utcnow_naive()
    post.publish_status = "processing"
    post.attempt_count = (post.attempt_count or 0) + 1
    post.last_attempt_at = now
    post.next_attempt_at = None
    post.error_code = None
    post.error_message = None
    db.commit()
    db.refresh(post)

    try:
        access_token = _refresh_access_token_if_needed(db, account)
        platform_post_id = oauth_x.post_tweet(access_token, content)
    except XPublishError as exc:
        return _mark_post_failure(db, post, account, exc)
    except Exception as exc:
        return _mark_post_failure(db, post, account, classify_x_exception(exc))

    now = utcnow_naive()
    post.publish_status = "published"
    post.status = "PUBLISHED"
    post.published_at = now
    post.platform_post_id = platform_post_id
    post.error_code = None
    post.error_message = None
    account.last_publish_at = now
    account.last_error = None
    if post.user_id is not None:
        db.add(
            XAuditLog(
                user_id=post.user_id,
                action="publish_succeeded",
                post_id=post.id,
                x_account_id=account.id,
            )
        )
    db.commit()
    db.refresh(post)
    return post


def claim_due_x_posts(db: Session, limit: int = 10) -> list[Post]:
    now = utcnow_naive()
    posts = (
        db.query(Post)
        .filter(
            Post.platform == "X",
            Post.publish_status == "pending",
            Post.scheduled_at.isnot(None),
            Post.scheduled_at <= now,
            or_(Post.next_attempt_at.is_(None), Post.next_attempt_at <= now),
        )
        .order_by(Post.scheduled_at.asc())
        .with_for_update(skip_locked=True)
        .limit(limit)
        .all()
    )

    for post in posts:
        post.publish_status = "processing"
    db.commit()
    for post in posts:
        db.refresh(post)
    return posts


def process_due_x_posts(db: Session, limit: int = 10) -> dict[str, int]:
    claimed = claim_due_x_posts(db, limit=limit)
    result = {"claimed": len(claimed), "published": 0, "failed": 0, "pending_retry": 0}

    for post in claimed:
        updated = publish_x_post_record(db, post)
        if updated.publish_status == "published":
            result["published"] += 1
        elif updated.publish_status == "failed":
            result["failed"] += 1
        elif updated.publish_status == "pending":
            result["pending_retry"] += 1

    return result
