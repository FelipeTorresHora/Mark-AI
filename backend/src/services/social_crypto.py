"""Helpers for encrypting social tokens and sealing OAuth state."""
import base64
import hashlib
import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from src.config import settings


def _derive_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _fernet() -> Fernet:
    secret = settings.social_token_encryption_key or settings.jwt_secret_key
    return Fernet(_derive_key(secret))


def encrypt_social_token(value: str | None) -> str | None:
    if not value:
        return value
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_social_token(value: str | None) -> str | None:
    if not value:
        return value
    try:
        return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # Backward compatibility with legacy plaintext rows.
        return value


def seal_state_payload(payload: dict[str, Any]) -> str:
    blob = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return _fernet().encrypt(blob).decode("utf-8")


def open_state_payload(token: str) -> dict[str, Any]:
    data = _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    return json.loads(data)
