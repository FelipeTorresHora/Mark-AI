"""Fetch and normalize LinkedIn member post insight metrics."""

import httpx

from src.config import settings

_ANALYTICS_URL = "https://api.linkedin.com/rest/memberCreatorPostAnalytics"
_QUERY_TYPES = {
    "IMPRESSION": "impressions",
    "MEMBERS_REACHED": "reach",
    "RESHARE": "shares",
    "REACTION": "likes",
    "COMMENT": "comments",
}


class InsightFetchError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


def _as_int(value: object) -> int:
    if value is None:
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _extract_count(payload: dict) -> int:
    elements = payload.get("elements") or []
    total = 0
    for element in elements:
        for key in ("count", "metricCount", "value", "total"):
            if key in element:
                total += _as_int(element.get(key))
        for value in element.values():
            if isinstance(value, dict):
                for key in ("count", "metricCount", "value", "total"):
                    if key in value:
                        total += _as_int(value.get(key))
    return total


def _classify_http_error(exc: httpx.HTTPStatusError) -> InsightFetchError:
    status_code = exc.response.status_code
    if status_code in {401, 403}:
        return InsightFetchError(
            "linkedin_permission_denied",
            "Reconecte LinkedIn com permissão de analytics.",
        )
    if status_code == 429:
        return InsightFetchError("linkedin_rate_limited", "O LinkedIn limitou a leitura de métricas agora.")
    return InsightFetchError("linkedin_metrics_failed", "Não foi possível buscar métricas do LinkedIn.")


def fetch_linkedin_member_post_metrics(access_token: str, post_urn: str) -> dict:
    metrics = {
        "impressions": 0,
        "reach": 0,
        "likes": 0,
        "comments": 0,
        "shares": 0,
        "quotes": 0,
        "bookmarks": 0,
        "clicks": 0,
        "profile_clicks": 0,
        "engagements": 0,
        "raw_metrics": {},
    }

    try:
        with httpx.Client(timeout=20) as client:
            for query_type, metric_name in _QUERY_TYPES.items():
                response = client.get(
                    _ANALYTICS_URL,
                    params={
                        "q": "entity",
                        "entity": post_urn,
                        "queryType": query_type,
                        "aggregation": "TOTAL",
                    },
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Linkedin-Version": settings.linkedin_api_version,
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                )
                response.raise_for_status()
                payload = response.json()
                metrics[metric_name] = _extract_count(payload)
                metrics["raw_metrics"][query_type] = payload
    except httpx.HTTPStatusError as exc:
        raise _classify_http_error(exc) from exc
    except httpx.HTTPError as exc:
        raise InsightFetchError(
            "linkedin_network_error",
            "Não foi possível falar com o LinkedIn agora.",
        ) from exc

    metrics["engagements"] = metrics["likes"] + metrics["comments"] + metrics["shares"]
    return metrics
