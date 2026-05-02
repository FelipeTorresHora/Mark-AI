"""X (Twitter) OAuth 2.0 PKCE + tweet publishing."""
import base64
import hashlib
import secrets
import urllib.parse

import httpx

from src.config import settings

_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
_AUTH_URL = "https://twitter.com/i/oauth2/authorize"
_USERS_ME_URL = "https://api.twitter.com/2/users/me"
_TWEETS_URL = "https://api.twitter.com/2/tweets"
_SCOPES = "tweet.read tweet.write users.read offline.access"


def _pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge)."""
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


def get_authorization_url(state: str, code_verifier: str | None = None) -> tuple[str, str]:
    """Return (authorization_url, code_verifier)."""
    verifier = code_verifier
    if verifier is None:
        verifier, challenge = _pkce_pair()
    else:
        digest = hashlib.sha256(verifier.encode()).digest()
        challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    params = {
        "response_type": "code",
        "client_id": settings.x_client_id,
        "redirect_uri": settings.x_redirect_uri,
        "scope": _SCOPES,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    url = f"{_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return url, verifier


def exchange_code_for_token(code: str, code_verifier: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    with httpx.Client() as client:
        resp = client.post(
            _TOKEN_URL,
            auth=(settings.x_client_id, settings.x_client_secret),
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.x_redirect_uri,
                "code_verifier": code_verifier,
            },
        )
        resp.raise_for_status()
        return resp.json()


def refresh_access_token(refresh_token: str) -> dict:
    """Refresh an expired X access token."""
    with httpx.Client() as client:
        resp = client.post(
            _TOKEN_URL,
            auth=(settings.x_client_id, settings.x_client_secret),
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
        )
        resp.raise_for_status()
        return resp.json()


def get_user_info(access_token: str) -> dict:
    """Return X user info including id and username."""
    with httpx.Client() as client:
        resp = client.get(
            _USERS_ME_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json().get("data", {})


def post_tweet(access_token: str, text: str) -> str:
    """Publish a tweet and return its ID."""
    with httpx.Client() as client:
        resp = client.post(
            _TWEETS_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"text": text},
        )
        resp.raise_for_status()
        return resp.json()["data"]["id"]
