"""Instagram Graph API feed publishing (Page access token + media container)."""

import time

import httpx

from src.config import settings

_GRAPH_BASE = "https://graph.facebook.com"


def _graph_url(path: str) -> str:
    version = settings.instagram_graph_api_version.strip("/")
    return f"{_GRAPH_BASE}/{version}/{path.lstrip('/')}"


def resolve_publish_image_url(image_url: str | None = None) -> str:
    """Public HTTPS image URL required by the Graph API for feed posts."""
    resolved = (image_url or settings.instagram_publish_image_url or "").strip()
    if not resolved:
        raise ValueError(
            "INSTAGRAM_PUBLISH_IMAGE_URL não configurada — necessária para publicar no Instagram."
        )
    return resolved


def _container_status_code(client: httpx.Client, creation_id: str, access_token: str) -> str:
    resp = client.get(
        _graph_url(creation_id),
        params={"fields": "status_code", "access_token": access_token},
    )
    resp.raise_for_status()
    return str(resp.json().get("status_code") or "")


def _wait_for_media_container(
    client: httpx.Client,
    creation_id: str,
    access_token: str,
    *,
    max_attempts: int = 12,
    delay_seconds: float = 1.0,
) -> None:
    for attempt in range(max_attempts):
        status = _container_status_code(client, creation_id, access_token)
        if status == "FINISHED":
            return
        if status == "ERROR":
            raise ValueError("Instagram rejeitou o processamento da imagem.")
        if attempt < max_attempts - 1:
            time.sleep(delay_seconds)
    raise ValueError("Instagram não finalizou o processamento da mídia a tempo.")


def publish_feed_post(
    access_token: str,
    ig_user_id: str,
    caption: str,
    image_url: str | None = None,
) -> str:
    """Create an image media container and publish it to the Instagram feed."""
    resolved_image = resolve_publish_image_url(image_url)

    with httpx.Client(timeout=60.0) as client:
        create_resp = client.post(
            _graph_url(f"{ig_user_id}/media"),
            params={
                "image_url": resolved_image,
                "caption": caption,
                "access_token": access_token,
            },
        )
        create_resp.raise_for_status()
        creation_id = create_resp.json().get("id")
        if not creation_id:
            raise ValueError("Resposta do Instagram sem id de mídia.")

        _wait_for_media_container(client, str(creation_id), access_token)

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
