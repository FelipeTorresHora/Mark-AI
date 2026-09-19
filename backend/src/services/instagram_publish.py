"""Instagram Graph API feed publishing (Facebook Login + Page token).

Official flow (Instagram API with Facebook Login):
1. Use a Facebook Page access token against graph.facebook.com
2. POST /{ig-user-id}/media → container id (public HTTPS JPEG + caption)
3. GET /{container-id}?fields=status_code until FINISHED (or already PUBLISHED)
4. POST /{ig-user-id}/media_publish with creation_id → media id

See: https://developers.facebook.com/docs/instagram-platform/content-publishing
"""

from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlparse

import httpx

from src.config import settings

_GRAPH_HOST = "https://graph.facebook.com"
_PAGE_PUBLISH_TASKS = {"MANAGE", "CREATE_CONTENT"}
_READY_STATUSES = {"FINISHED", "PUBLISHED"}
_FAILED_STATUSES = {"ERROR", "EXPIRED"}
_NOT_READY_SUBCODES = {2207027, 2207008, 2207032}
_TRANSIENT_GRAPH_CODES = {1, 2, 4, 17, 24, 32}

_SUBCODE_MESSAGES = {
    2207004: "A imagem é grande demais para o Instagram (máximo 8 MB).",
    2207005: "Formato de imagem não suportado. O Instagram aceita apenas JPEG.",
    2207009: "A proporção da imagem não é aceita (use entre 4:5 e 1.91:1).",
    2207010: "A legenda ultrapassa o limite de 2200 caracteres do Instagram.",
    2207020: "O container de mídia expirou (24h). Publique de novo.",
    2207027: "A mídia ainda não está pronta para publicação.",
    2207040: "A legenda tem menções demais (máximo 20).",
    2207042: "Limite de publicações do Instagram atingido nas últimas 24h.",
    2207050: "A conta Instagram está restrita. Verifique o app nativo.",
    2207052: "O Instagram não conseguiu baixar a imagem. Use uma URL pública HTTPS (JPEG).",
}

_CODE_MESSAGES = {
    9: "Limite de publicações do Instagram atingido nas últimas 24h.",
    10: "Permissão insuficiente para publicar. Reconecte a conta Instagram Business/Creator.",
    190: "Token do Instagram inválido ou expirado. Reconecte a conta.",
    80002: "O Instagram limitou as chamadas desta conta. Tente novamente em instantes.",
}


class InstagramPublishError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        graph_code: int | None = None,
        subcode: int | None = None,
        fbtrace_id: str | None = None,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.graph_code = graph_code
        self.subcode = subcode
        self.fbtrace_id = fbtrace_id
        self.retryable = retryable


def graph_url(path: str) -> str:
    version = settings.instagram_graph_api_version.strip("/")
    return f"{_GRAPH_HOST}/{version}/{path.lstrip('/')}"


def bearer_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }


def page_can_publish(tasks: list[str] | None) -> bool:
    """Page tasks MANAGE or CREATE_CONTENT are required by the Graph API."""
    if not tasks:
        return True
    return bool(_PAGE_PUBLISH_TASKS.intersection(str(task).upper() for task in tasks))


def resolve_publish_image_url(image_url: str | None = None) -> str:
    """Public HTTPS image URL required by the Graph API for feed posts."""
    resolved = (image_url or settings.instagram_publish_image_url or "").strip()
    if not resolved:
        raise InstagramPublishError(
            "INSTAGRAM_PUBLISH_IMAGE_URL não configurada — o Graph API exige um JPEG "
            "público em HTTPS para criar o container de mídia."
        )
    parsed = urlparse(resolved)
    if parsed.scheme != "https" or not parsed.netloc:
        raise InstagramPublishError(
            "A imagem do Instagram precisa ser uma URL pública HTTPS; o Graph API baixa o arquivo."
        )
    return resolved


def _graph_error_payload(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict) and isinstance(payload.get("error"), dict):
        return payload["error"]
    return {}


def parse_graph_error(payload: Any, *, http_status: int | None = None) -> InstagramPublishError:
    error = _graph_error_payload(payload)
    graph_code = error.get("code")
    subcode = error.get("error_subcode")
    try:
        graph_code_int = int(graph_code) if graph_code is not None else None
    except (TypeError, ValueError):
        graph_code_int = None
    try:
        subcode_int = int(subcode) if subcode is not None else None
    except (TypeError, ValueError):
        subcode_int = None

    message = (
        _SUBCODE_MESSAGES.get(subcode_int or -1)
        or _CODE_MESSAGES.get(graph_code_int or -1)
        or error.get("error_user_msg")
        or error.get("message")
        or "Falha ao publicar no Instagram."
    )
    retryable = (
        subcode_int in _NOT_READY_SUBCODES
        or graph_code_int in _TRANSIENT_GRAPH_CODES
        or bool(error.get("is_transient"))
        or (http_status is not None and http_status >= 500)
    )
    return InstagramPublishError(
        str(message),
        graph_code=graph_code_int,
        subcode=subcode_int,
        fbtrace_id=error.get("fbtrace_id"),
        retryable=retryable,
    )


def _read_json(resp: httpx.Response) -> dict[str, Any]:
    try:
        payload = resp.json()
    except ValueError:
        payload = {}
    if not isinstance(payload, dict):
        payload = {}
    if "error" in payload:
        raise parse_graph_error(payload, http_status=resp.status_code)
    if resp.is_error:
        raise parse_graph_error(payload, http_status=resp.status_code)
    return payload


def container_status(
    client: httpx.Client,
    creation_id: str,
    access_token: str,
) -> str:
    resp = client.get(
        graph_url(creation_id),
        headers=bearer_headers(access_token),
        params={"fields": "status_code,status"},
    )
    payload = _read_json(resp)
    return str(payload.get("status_code") or "").upper()


def wait_for_media_container(
    client: httpx.Client,
    creation_id: str,
    access_token: str,
    *,
    max_attempts: int = 8,
    delay_seconds: float = 2.0,
) -> str:
    """Poll IG Container status_code. Images are often ready immediately.

    FINISHED → publish; PUBLISHED → already live; empty → treat as ready (feed JPEG);
    IN_PROGRESS → keep polling; ERROR/EXPIRED → fail.
    """
    last_status = ""
    for attempt in range(max_attempts):
        last_status = container_status(client, creation_id, access_token)
        if last_status in _READY_STATUSES:
            return last_status
        if last_status in _FAILED_STATUSES:
            if last_status == "EXPIRED":
                raise InstagramPublishError("O container de mídia expirou (24h). Publique de novo.")
            raise InstagramPublishError("Instagram rejeitou o processamento da imagem.")
        if last_status == "":
            # Feed image containers are often ready without a status_code.
            return "FINISHED"
        if attempt < max_attempts - 1:
            time.sleep(delay_seconds)
    raise InstagramPublishError(
        f"Instagram não finalizou o processamento da mídia a tempo (status={last_status or 'desconhecido'})."
    )


def publishing_quota_remaining(client: httpx.Client, ig_user_id: str, access_token: str) -> int | None:
    """Return remaining posts in the rolling 24h window, or None if the check fails."""
    try:
        resp = client.get(
            graph_url(f"{ig_user_id}/content_publishing_limit"),
            headers=bearer_headers(access_token),
            params={"fields": "quota_usage,config"},
        )
        payload = _read_json(resp)
        rows = payload.get("data") or []
        if not rows:
            return None
        row = rows[0]
        usage = int(row.get("quota_usage") or 0)
        total = int((row.get("config") or {}).get("quota_total") or 50)
        return max(total - usage, 0)
    except (InstagramPublishError, httpx.HTTPError, TypeError, ValueError):
        return None


def _create_image_container(
    client: httpx.Client,
    ig_user_id: str,
    access_token: str,
    *,
    image_url: str,
    caption: str,
) -> str:
    body: dict[str, Any] = {
        "image_url": image_url,
        "caption": caption,
        "is_ai_generated": True,
    }
    resp = client.post(
        graph_url(f"{ig_user_id}/media"),
        headers=bearer_headers(access_token),
        json=body,
    )
    payload = _read_json(resp)
    creation_id = payload.get("id")
    if not creation_id:
        raise InstagramPublishError("Resposta do Instagram sem id do container de mídia.")
    return str(creation_id)


def _publish_container(
    client: httpx.Client,
    ig_user_id: str,
    access_token: str,
    creation_id: str,
) -> str:
    resp = client.post(
        graph_url(f"{ig_user_id}/media_publish"),
        headers=bearer_headers(access_token),
        json={"creation_id": creation_id},
    )
    payload = _read_json(resp)
    media_id = payload.get("id") or creation_id
    return str(media_id)


def _recover_published_media_id(
    client: httpx.Client,
    creation_id: str,
    access_token: str,
) -> str | None:
    try:
        if container_status(client, creation_id, access_token) == "PUBLISHED":
            return creation_id
    except InstagramPublishError:
        return None
    return None


def publish_feed_post(
    access_token: str,
    ig_user_id: str,
    caption: str,
    image_url: str | None = None,
) -> str:
    """Create an image media container and publish it to the Instagram feed."""
    if not (ig_user_id or "").strip():
        raise InstagramPublishError("Conta Instagram Business/Creator sem id para publicação.")
    resolved_image = resolve_publish_image_url(image_url)

    with httpx.Client(timeout=60.0) as client:
        remaining = publishing_quota_remaining(client, ig_user_id, access_token)
        if remaining == 0:
            raise InstagramPublishError(
                "Limite de publicações do Instagram atingido nas últimas 24h. Tente mais tarde."
            )

        creation_id = _create_image_container(
            client,
            ig_user_id,
            access_token,
            image_url=resolved_image,
            caption=caption,
        )
        status_code = wait_for_media_container(client, creation_id, access_token)
        if status_code == "PUBLISHED":
            return creation_id

        try:
            return _publish_container(client, ig_user_id, access_token, creation_id)
        except InstagramPublishError as exc:
            published_id = _recover_published_media_id(client, creation_id, access_token)
            if published_id:
                return published_id
            if exc.subcode in _NOT_READY_SUBCODES:
                wait_for_media_container(client, creation_id, access_token)
                try:
                    return _publish_container(client, ig_user_id, access_token, creation_id)
                except InstagramPublishError as retry_exc:
                    published_id = _recover_published_media_id(client, creation_id, access_token)
                    if published_id:
                        return published_id
                    raise retry_exc from exc
            raise
