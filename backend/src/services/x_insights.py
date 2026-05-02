"""Fetch and normalize X post insight metrics."""

import httpx

_TWEET_URL = "https://api.twitter.com/2/tweets/{post_id}"


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


def _classify_http_error(exc: httpx.HTTPStatusError) -> InsightFetchError:
    status_code = exc.response.status_code
    if status_code in {401, 403}:
        return InsightFetchError("x_permission_denied", "Reconecte o X para permitir leitura de métricas.")
    if status_code == 429:
        return InsightFetchError("x_rate_limited", "O X limitou a leitura de métricas agora.")
    return InsightFetchError("x_metrics_failed", "Não foi possível buscar métricas do X.")


def fetch_x_post_metrics(access_token: str, post_id: str) -> dict:
    try:
        with httpx.Client(timeout=20) as client:
            response = client.get(
                _TWEET_URL.format(post_id=post_id),
                params={"tweet.fields": "public_metrics,non_public_metrics,organic_metrics"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPStatusError as exc:
        raise _classify_http_error(exc) from exc
    except httpx.HTTPError as exc:
        raise InsightFetchError("x_network_error", "Não foi possível falar com o X agora.") from exc

    data = payload.get("data", {})
    public = data.get("public_metrics") or {}
    private = data.get("non_public_metrics") or {}
    organic = data.get("organic_metrics") or {}

    impressions = _as_int(
        private.get("impression_count")
        or organic.get("impression_count")
        or public.get("impression_count")
    )
    clicks = _as_int(private.get("url_link_clicks") or organic.get("url_link_clicks"))
    profile_clicks = _as_int(
        private.get("user_profile_clicks")
        or private.get("url_profile_clicks")
        or organic.get("user_profile_clicks")
        or organic.get("url_profile_clicks")
    )
    likes = _as_int(organic.get("like_count") or public.get("like_count"))
    comments = _as_int(organic.get("reply_count") or public.get("reply_count"))
    shares = _as_int(organic.get("retweet_count") or public.get("retweet_count"))
    quotes = _as_int(public.get("quote_count"))
    bookmarks = _as_int(public.get("bookmark_count"))
    engagements = _as_int(private.get("engagements")) or (
        clicks + profile_clicks + likes + comments + shares + quotes + bookmarks
    )

    return {
        "impressions": impressions,
        "reach": 0,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "quotes": quotes,
        "bookmarks": bookmarks,
        "clicks": clicks,
        "profile_clicks": profile_clicks,
        "engagements": engagements,
        "raw_metrics": payload,
    }
