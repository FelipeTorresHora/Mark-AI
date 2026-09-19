"""Meta / Instagram Graph OAuth 2.0 (Page token for content publishing)."""

import urllib.parse

import httpx

from src.config import settings

_GRAPH_BASE = "https://graph.facebook.com"


def _graph_url(path: str) -> str:
    version = settings.instagram_graph_api_version.strip("/")
    return f"{_GRAPH_BASE}/{version}/{path.lstrip('/')}"


def get_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.instagram_app_id,
        "redirect_uri": settings.instagram_redirect_uri,
        "state": state,
        "scope": settings.instagram_scopes,
        "response_type": "code",
    }
    version = settings.instagram_graph_api_version.strip("/")
    base = f"https://www.facebook.com/{version}/dialog/oauth"
    return f"{base}?{urllib.parse.urlencode(params)}"


def exchange_code_for_token(code: str) -> dict:
    with httpx.Client() as client:
        resp = client.get(
            _graph_url("oauth/access_token"),
            params={
                "client_id": settings.instagram_app_id,
                "client_secret": settings.instagram_app_secret,
                "redirect_uri": settings.instagram_redirect_uri,
                "code": code,
            },
        )
        resp.raise_for_status()
        return resp.json()


def exchange_long_lived_token(short_lived_token: str) -> dict:
    """Exchange a short-lived user token for a long-lived token (~60 days)."""
    with httpx.Client() as client:
        resp = client.get(
            _graph_url("oauth/access_token"),
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.instagram_app_id,
                "client_secret": settings.instagram_app_secret,
                "fb_exchange_token": short_lived_token,
            },
        )
        resp.raise_for_status()
        return resp.json()


def get_user_info(access_token: str) -> dict:
    """Resolve IG Business/Creator account and Page access token for publishing."""
    with httpx.Client() as client:
        pages_resp = client.get(
            _graph_url("me/accounts"),
            params={
                "fields": "access_token,instagram_business_account{id,username}",
                "access_token": access_token,
            },
        )
        pages_resp.raise_for_status()
        pages = pages_resp.json().get("data", [])

        for page in pages:
            ig_account = page.get("instagram_business_account") or {}
            ig_id = ig_account.get("id")
            page_token = page.get("access_token")
            if ig_id and page_token:
                return {
                    "id": str(ig_id),
                    "username": ig_account.get("username"),
                    "page_access_token": str(page_token),
                }

        raise ValueError(
            "Nenhuma conta Instagram Business/Creator vinculada às páginas do Facebook."
        )


def publish_post(access_token: str, ig_user_id: str, caption: str) -> str:
    """Publish a feed post (delegates to instagram_publish)."""
    from src.services.instagram_publish import publish_feed_post

    return publish_feed_post(access_token, ig_user_id, caption)
