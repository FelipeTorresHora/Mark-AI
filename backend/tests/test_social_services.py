from src.services import instagram_publish, oauth_instagram, oauth_linkedin


class _DummyResponse:
    def __init__(self):
        self.headers = {"x-restli-id": "linkedin-post-1"}

    def raise_for_status(self):
        return None

    def json(self):
        return {"id": "linkedin-post-1"}


class _DummyClient:
    def __init__(self):
        self.calls = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def post(self, url, headers=None, json=None):
        self.calls.append({"url": url, "headers": headers, "json": json})
        return _DummyResponse()


def test_linkedin_authorization_url_uses_default_publish_scopes():
    url = oauth_linkedin.get_authorization_url("state-token")

    assert "openid+profile+w_member_social" in url
    assert "r_member_postAnalytics" not in url


def test_linkedin_publish_post_uses_rest_posts_endpoint(monkeypatch):
    client = _DummyClient()
    monkeypatch.setattr("src.services.oauth_linkedin.httpx.Client", lambda: client)

    post_id = oauth_linkedin.publish_post("token-li", "urn:li:person:123", "Texto")

    assert post_id == "linkedin-post-1"
    assert client.calls[0]["url"] == "https://api.linkedin.com/rest/posts"
    assert client.calls[0]["headers"]["Linkedin-Version"]
    assert client.calls[0]["json"]["commentary"] == "Texto"
    assert client.calls[0]["json"]["visibility"] == "PUBLIC"


def test_instagram_authorization_url_uses_facebook_dialog():
    url = oauth_instagram.get_authorization_url("state-ig")

    assert url.startswith("https://www.facebook.com/")
    assert "dialog/oauth" in url
    assert "instagram_content_publish" in url
    assert "state=state-ig" in url


class _InstagramGraphClient:
    def __init__(self):
        self.get_calls = []
        self.post_calls = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, url, params=None):
        self.get_calls.append({"url": url, "params": params})
        if url.endswith("me/accounts"):
            return _InstagramAccountsResponse()
        if "fields" in (params or {}) and "status_code" in (params or {}).get("fields", ""):
            return _InstagramContainerStatusResponse()
        if url.endswith("oauth/access_token") and (params or {}).get("grant_type") == "fb_exchange_token":
            return _InstagramLongLivedTokenResponse()
        raise AssertionError(f"unexpected GET {url}")

    def post(self, url, params=None):
        self.post_calls.append({"url": url, "params": params})
        if url.endswith("/media"):
            return _InstagramMediaCreateResponse()
        if url.endswith("/media_publish"):
            return _InstagramMediaPublishResponse()
        raise AssertionError(f"unexpected POST {url}")


class _InstagramAccountsResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "data": [
                {
                    "access_token": "page-token-1",
                    "instagram_business_account": {
                        "id": "17841400000000000",
                        "username": "markai",
                    },
                }
            ]
        }


class _InstagramLongLivedTokenResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"access_token": "long-lived-user-token", "expires_in": 5184000}


class _InstagramContainerStatusResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"status_code": "FINISHED"}


class _InstagramMediaCreateResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"id": "creation-1"}


class _InstagramMediaPublishResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"id": "media-99"}


def test_instagram_get_user_info_returns_business_account_id(monkeypatch):
    client = _InstagramGraphClient()
    monkeypatch.setattr("src.services.oauth_instagram.httpx.Client", lambda: client)

    info = oauth_instagram.get_user_info("token-ig")

    assert info["id"] == "17841400000000000"
    assert info["username"] == "markai"
    assert info["page_access_token"] == "page-token-1"
    assert "me/accounts" in client.get_calls[0]["url"]
    assert "access_token" in client.get_calls[0]["params"]["fields"]


def test_instagram_exchange_long_lived_token(monkeypatch):
    client = _InstagramGraphClient()
    monkeypatch.setattr("src.services.oauth_instagram.httpx.Client", lambda: client)

    data = oauth_instagram.exchange_long_lived_token("short-token")

    assert data["access_token"] == "long-lived-user-token"
    assert data["expires_in"] == 5184000


def test_instagram_publish_feed_post_creates_and_publishes_media(monkeypatch):
    client = _InstagramGraphClient()
    monkeypatch.setattr("src.services.instagram_publish.httpx.Client", lambda *args, **kwargs: client)
    monkeypatch.setattr(
        "src.services.instagram_publish.settings.instagram_publish_image_url",
        "https://example.com/placeholder.jpg",
    )

    media_id = instagram_publish.publish_feed_post(
        "page-token-1", "17841400000000000", "Legenda"
    )

    assert media_id == "media-99"
    assert len(client.post_calls) == 2
    assert client.post_calls[0]["params"]["caption"] == "Legenda"
    assert client.post_calls[0]["params"]["access_token"] == "page-token-1"
    assert client.post_calls[1]["params"]["creation_id"] == "creation-1"


def test_instagram_publish_post_delegates_to_feed_publish(monkeypatch):
    monkeypatch.setattr(
        "src.services.instagram_publish.publish_feed_post",
        lambda token, ig_id, caption: "delegated-media",
    )

    assert oauth_instagram.publish_post("t", "ig", "cap") == "delegated-media"
