"""Signed short-lived OAuth state tokens."""
from datetime import UTC, datetime, timedelta
import secrets

from jose import JWTError, jwt

from src.config import settings
from src.services.social_crypto import open_state_payload, seal_state_payload

_STATE_TTL_SECONDS = 600


def build_state(
    user_id: str,
    provider: str,
    code_verifier: str | None = None,
    frontend_origin: str | None = None,
) -> str:
    now = datetime.now(UTC)
    state_payload = {
        "sub": user_id,
        "provider": provider,
        "jti": secrets.token_urlsafe(16),
        "exp": int((now + timedelta(seconds=_STATE_TTL_SECONDS)).timestamp()),
        "iat": int(now.timestamp()),
    }
    if code_verifier:
        state_payload["code_verifier"] = seal_state_payload({"verifier": code_verifier})
    if frontend_origin:
        state_payload["frontend_origin"] = frontend_origin
    return jwt.encode(state_payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def parse_state(token: str, expected_provider: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("State inválido") from exc

    provider = payload.get("provider")
    user_id = payload.get("sub")
    if provider != expected_provider or not user_id:
        raise ValueError("State inválido")

    code_verifier = None
    verifier_token = payload.get("code_verifier")
    if verifier_token:
        try:
            code_verifier = open_state_payload(verifier_token)["verifier"]
        except Exception as exc:
            raise ValueError("State inválido") from exc

    return {
        "user_id": user_id,
        "provider": provider,
        "code_verifier": code_verifier,
        "frontend_origin": payload.get("frontend_origin"),
    }
