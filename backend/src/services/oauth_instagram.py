"""Meta / Instagram Graph OAuth 2.0 + caption publish (image placeholder)."""
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


def get_user_info(access_token: str) -> dict:
    """Resolve Instagram Business/Creator account id linked to the Facebook user."""
    with httpx.Client() as client:
        pages_resp = client.get(
            _graph_url("me/accounts"),
            params={
                "fields": "instagram_business_account{id,username}",
                "access_token": access_token,
            },
        )
        pages_resp.raise_for_status()
        pages = pages_resp.json().get("data", [])

        for page in pages:
            ig_account = page.get("instagram_business_account") or {}
            ig_id = ig_account.get("id")
            if ig_id:
                return {
                    "id": str(ig_id),
                    "username": ig_account.get("username"),
                }

        raise ValueError(
            "Nenhuma conta Instagram Business/Creator vinculada às páginas do Facebook."
        )


def publish_post(access_token: str, ig_user_id: str, caption: str) -> str:
    """Publish an Instagram feed post (image URL + caption). Returns media id."""
    image_url = (settings.instagram_publish_image_url or "").strip()
    if not image_url:
        raise ValueError(
            "INSTAGRAM_PUBLISH_IMAGE_URL não configurada — necessária para publicar no Instagram."
        )

    with httpx.Client() as client:
        create_resp = client.post(
            _graph_url(f"{ig_user_id}/media"),
            params={
                "image_url": image_url,
                "caption": caption,
                "access_token": access_token,
            },
        )
        create_resp.raise_for_status()
        creation_id = create_resp.json().get("id")
        if not creation_id:
            raise ValueError("Resposta do Instagram sem id de mídia.")

        publish_resp = client.post(
            _graph_url(f"{ig_user_id}/media_publish"),
            params={
                "creation_id": creation_id,
                "access_token": access_token,
            },
        )
        publish_resp.raise_for_status()
        media_id = publish_resp.json().get("id", creation_id)
        return str(media_id)
