import hashlib
import base64

from src.services import oauth_x


class _Resp:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise AssertionError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


class _Client:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def post(self, url, **kwargs):
        self.calls.append({"url": url, **kwargs})
        return self._responses.pop(0)

    def get(self, url, **kwargs):
        self.calls.append({"url": url, **kwargs})
        return self._responses.pop(0)


def test_pkce_authorization_url_with_existing_verifier():
    verifier = "test-verifier-value"
    digest = hashlib.sha256(verifier.encode()).digest()
    expected_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

    url, returned_verifier = oauth_x.get_authorization_url("state-1", code_verifier=verifier)

    assert returned_verifier == verifier
    assert f"code_challenge={expected_challenge}" in url or "code_challenge=" in url
    assert "state=state-1" in url


def test_exchange_code_for_token(monkeypatch):
    client = _Client([_Resp({"access_token": "at", "refresh_token": "rt"})])
    monkeypatch.setattr("src.services.oauth_x.httpx.Client", lambda: client)

    data = oauth_x.exchange_code_for_token("auth-code", "verifier")

    assert data["access_token"] == "at"
    assert client.calls[0]["data"]["code_verifier"] == "verifier"


def test_refresh_access_token(monkeypatch):
    client = _Client([_Resp({"access_token": "new-at"})])
    monkeypatch.setattr("src.services.oauth_x.httpx.Client", lambda: client)

    data = oauth_x.refresh_access_token("refresh-tok")

    assert data["access_token"] == "new-at"


def test_get_user_info(monkeypatch):
    client = _Client([_Resp({"data": {"id": "1", "username": "mark"}})])
    monkeypatch.setattr("src.services.oauth_x.httpx.Client", lambda: client)

    info = oauth_x.get_user_info("access")

    assert info["username"] == "mark"


def test_post_tweet(monkeypatch):
    client = _Client([_Resp({"data": {"id": "tweet-99"}})])
    monkeypatch.setattr("src.services.oauth_x.httpx.Client", lambda: client)

    tweet_id = oauth_x.post_tweet("access", "Hello X")

    assert tweet_id == "tweet-99"
