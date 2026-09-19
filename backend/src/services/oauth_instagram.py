"""Meta / Instagram Graph OAuth 2.0 (Facebook Login + Page token for publishing)."""

from __future__ import annotations

import urllib.parse
from typing import Any

import httpx

from src.config import settings
from src.services.instagram_publish import graph_url, page_can_publish, publish_feed_post

_FACEBOOK_DIALOG_HOST = "https://www.facebook.com"


def get_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.instagram_app_id,
        "redirect_uri": settings.instagram_redirect_uri,
        "state": state,
        "scope": settings.instagram_scopes,
        "response_type": "code",
    }
    version = settings.instagram_graph_api_version.strip("/")
    base = f"{_FACEBOOK_DIALOG_HOST}/{version}/dialog/oauth"
    return f"{base}?{urllib.parse.urlencode(params)}"


def exchange_code_for_token(code: str) -> dict:
    with httpx.Client() as client:
        resp = client.post(
            graph_url("oauth/access_token"),
            data={
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
        resp = client.post(
            graph_url("oauth/access_token"),
            data={
                "grant_type": "fb_exchange_token",
                "client_id": settings.instagram_app_id,
                "client_secret": settings.instagram_app_secret,
                "fb_exchange_token": short_lived_token,
            },
        )
        resp.raise_for_status()
        return resp.json()


def _page_instagram_account(page: dict[str, Any]) -> dict[str, Any]:
    return page.get("instagram_business_account") or {}


def get_user_info(access_token: str) -> dict:
    """Resolve IG Business/Creator account and Page access token for publishing.

    Facebook Login for Business: GET /me/accounts with
    fields=id,name,access_token,tasks,instagram_business_account{id,username}.
    The Page access token (not the user token) is what Content Publishing requires.
    """
    with httpx.Client() as client:
        url: str | None = graph_url("me/accounts")
        params: dict[str, str] | None = {
            "fields": "id,name,access_token,tasks,instagram_business_account{id,username}",
            "access_token": access_token,
        }
        matches: list[dict[str, Any]] = []
        while url:
            pages_resp = client.get(url, params=params)
            pages_resp.raise_for_status()
            payload = pages_resp.json()
            for page in payload.get("data") or []:
                ig_account = _page_instagram_account(page)
                ig_id = ig_account.get("id")
                page_token = page.get("access_token")
                if not ig_id or not page_token:
                    continue
                if not page_can_publish(page.get("tasks")):
                    continue
                matches.append(
                    {
                        "id": str(ig_id),
                        "username": ig_account.get("username"),
                        "page_id": str(page.get("id") or ""),
                        "page_name": page.get("name") or "",
                        "page_access_token": str(page_token),
                        "tasks": page.get("tasks") or [],
                    }
                )
            next_url = (payload.get("paging") or {}).get("next")
            url = str(next_url) if next_url else None
            params = None

        if not matches:
            raise ValueError(
                "Nenhuma conta Instagram Business/Creator vinculada às páginas do Facebook."
            )
        if len(matches) > 1:
            names = ", ".join(
                f"{item.get('page_name') or item.get('username') or item['page_id']}"
                for item in matches
            )
            raise ValueError(
                "Há mais de uma Página com Instagram publicável. "
                "Use um login do Facebook com uma única Página ou desconecte as demais. "
                f"Encontradas: {names}."
            )
        return matches[0]


def publish_post(
    access_token: str,
    ig_user_id: str,
    caption: str,
    image_url: str | None = None,
) -> str:
    """Publish a feed post (delegates to instagram_publish)."""
    return publish_feed_post(access_token, ig_user_id, caption, image_url=image_url)
