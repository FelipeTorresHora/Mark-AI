import httpx
import pytest

from src.services.x_insights import InsightFetchError, _as_int, _classify_http_error, fetch_x_post_metrics


def test_as_int_handles_invalid():
    assert _as_int(None) == 0
    assert _as_int("bad") == 0
    assert _as_int("12") == 12


def test_classify_http_error_permission():
    req = httpx.Request("GET", "https://api.twitter.com")
    resp = httpx.Response(403, request=req)
    err = _classify_http_error(httpx.HTTPStatusError("forbidden", request=req, response=resp))
    assert err.code == "x_permission_denied"


def test_classify_http_error_rate_limit():
    req = httpx.Request("GET", "https://api.twitter.com")
    resp = httpx.Response(429, request=req)
    err = _classify_http_error(httpx.HTTPStatusError("rate", request=req, response=resp))
    assert err.code == "x_rate_limited"


class _Resp:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            req = httpx.Request("GET", "https://api.twitter.com")
            resp = httpx.Response(self.status_code, request=req)
            raise httpx.HTTPStatusError("err", request=req, response=resp)

    def json(self):
        return self._payload


class _Client:
    def __init__(self, response):
        self._response = response

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url, **kwargs):
        return self._response


def test_fetch_x_post_metrics_success(monkeypatch):
    payload = {
        "data": {
            "public_metrics": {"like_count": 3, "retweet_count": 1, "quote_count": 0, "bookmark_count": 0},
            "non_public_metrics": {"impression_count": 100, "engagements": 10},
            "organic_metrics": {},
        }
    }
    monkeypatch.setattr("src.services.x_insights.httpx.Client", lambda **_: _Client(_Resp(payload)))

    metrics = fetch_x_post_metrics("token", "tweet-1")

    assert metrics["impressions"] == 100
    assert metrics["likes"] == 3
    assert metrics["engagements"] == 10


def test_fetch_x_post_metrics_network_error(monkeypatch):
    class _BadClient:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, *args, **kwargs):
            raise httpx.ConnectError("offline")

    monkeypatch.setattr("src.services.x_insights.httpx.Client", lambda **_: _BadClient())

    with pytest.raises(InsightFetchError) as exc:
        fetch_x_post_metrics("token", "tweet-1")
    assert exc.value.code == "x_network_error"
