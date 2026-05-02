"""LinkedIn OAuth 2.0 + text post publishing."""
import urllib.parse

import httpx

from src.config import settings

_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
_POSTS_URL = "https://api.linkedin.com/rest/posts"
_SCOPES = "openid profile w_member_social r_member_postAnalytics"


def get_authorization_url(state: str) -> str:
    params = {
        "response_type": "code",
        "client_id": settings.linkedin_client_id,
        "redirect_uri": settings.linkedin_redirect_uri,
        "scope": _SCOPES,
        "state": state,
    }
    return f"{_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_code_for_token(code: str) -> dict:
    with httpx.Client() as client:
        resp = client.post(
            _TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.linkedin_redirect_uri,
                "client_id": settings.linkedin_client_id,
                "client_secret": settings.linkedin_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


def get_user_info(access_token: str) -> dict:
    """Return LinkedIn user info using OpenID Connect userinfo endpoint."""
    with httpx.Client() as client:
        resp = client.get(
            _USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


def publish_post(access_token: str, author_urn: str, text: str) -> str:
    """Publish a LinkedIn text post and return the post ID."""
    payload = {
        "author": author_urn,
        "commentary": text,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    with httpx.Client() as client:
        resp = client.post(
            _POSTS_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
                "Linkedin-Version": settings.linkedin_api_version,
            },
            json=payload,
        )
        resp.raise_for_status()
        post_id = resp.headers.get("x-restli-id") or resp.json().get("id", "")
        return post_id
