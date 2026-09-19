import httpx
import pytest

from src.services.linkedin_insights import (
    InsightFetchError,
    _as_int,
    _classify_http_error,
    _extract_count,
    fetch_linkedin_member_post_metrics,
)


def test_extract_count_sums_nested():
    payload = {
        "elements": [
            {"count": 2},
            {"metricCount": 3},
            {"nested": {"value": 1}},
        ]
    }
    assert _extract_count(payload) == 6


def test_classify_http_error_linkedin():
    req = httpx.Request("GET", "https://api.linkedin.com")
    resp = httpx.Response(403, request=req)
    err = _classify_http_error(httpx.HTTPStatusError("forbidden", request=req, response=resp))
    assert err.code == "linkedin_permission_denied"


class _Resp:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            req = httpx.Request("GET", "https://api.linkedin.com")
            resp = httpx.Response(self.status_code, request=req)
            raise httpx.HTTPStatusError("err", request=req, response=resp)

    def json(self):
        return self._payload


class _Client:
    def __init__(self, responses):
        self._responses = list(responses)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url, **kwargs):
        return self._responses.pop(0)


def test_fetch_linkedin_member_post_metrics(monkeypatch):
    responses = [
        _Resp({"elements": [{"count": 10}]}),
        _Resp({"elements": [{"count": 5}]}),
        _Resp({"elements": [{"count": 2}]}),
        _Resp({"elements": [{"count": 1}]}),
        _Resp({"elements": [{"count": 3}]}),
    ]
    monkeypatch.setattr(
        "src.services.linkedin_insights.httpx.Client",
        lambda **_: _Client(responses),
    )

    metrics = fetch_linkedin_member_post_metrics("token", "urn:li:share:1")

    assert metrics["impressions"] >= 0
    assert _as_int("x") == 0


def test_fetch_linkedin_network_error(monkeypatch):
    class _Bad:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, *args, **kwargs):
            raise httpx.ConnectError("offline")

    monkeypatch.setattr("src.services.linkedin_insights.httpx.Client", lambda **_: _Bad())

    with pytest.raises(InsightFetchError) as exc:
        fetch_linkedin_member_post_metrics("token", "urn:li:share:1")
    assert exc.value.code == "linkedin_network_error"
