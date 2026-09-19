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
    assert "pages_read_engagement" in url
    assert "state=state-ig" in url
    assert "/v23.0/dialog/oauth" in url or "dialog/oauth" in url


class _JsonResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.is_error = status_code >= 400

    def raise_for_status(self):
        if self.is_error:
            raise AssertionError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


class _InstagramGraphClient:
    def __init__(
        self,
        *,
        pages=None,
        paging_next=None,
        status_codes=None,
        quota=None,
        publish_error=None,
        publish_then_published=False,
    ):
        self.get_calls = []
        self.post_calls = []
        self.pages = pages
        self.paging_next = paging_next
        self.status_codes = list(status_codes or ["FINISHED"])
        self.quota = quota if quota is not None else {"quota_usage": 1, "config": {"quota_total": 50}}
        self.publish_error = publish_error
        self.publish_then_published = publish_then_published
        self._publish_attempts = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, url, params=None, headers=None):
        self.get_calls.append({"url": url, "params": params, "headers": headers})
        if url.endswith("me/accounts") or "me/accounts" in url:
            payload = {"data": self.pages if self.pages is not None else [_linked_ig_page()]}
            if self.paging_next:
                payload["paging"] = {"next": self.paging_next}
                self.paging_next = None
            return _JsonResponse(payload)
        if url.endswith("content_publishing_limit"):
            return _JsonResponse({"data": [self.quota]})
        if url.endswith("oauth/access_token") and (params or {}).get("grant_type") == "fb_exchange_token":
            return _JsonResponse({"access_token": "long-lived-user-token", "expires_in": 5184000})
        fields = (params or {}).get("fields", "")
        if "status_code" in fields:
            code = self.status_codes.pop(0) if self.status_codes else "FINISHED"
            return _JsonResponse({"status_code": code, "id": "creation-1"})
        raise AssertionError(f"unexpected GET {url}")

    def post(self, url, params=None, json=None, headers=None, data=None):
        self.post_calls.append({"url": url, "params": params, "json": json, "headers": headers, "data": data})
        if url.endswith("oauth/access_token"):
            return _JsonResponse({"access_token": "long-lived-user-token", "expires_in": 5184000})
        if url.endswith("/media") and not url.endswith("/media_publish"):
            return _JsonResponse({"id": "creation-1"})
        if url.endswith("/media_publish"):
            self._publish_attempts += 1
            if self.publish_error and self._publish_attempts == 1:
                if self.publish_then_published:
                    self.status_codes = ["PUBLISHED"]
                return _JsonResponse(self.publish_error, status_code=500)
            return _JsonResponse({"id": "media-99"})
        raise AssertionError(f"unexpected POST {url}")


def _linked_ig_page(**overrides):
    page = {
        "id": "page-1",
        "name": "Mark",
        "access_token": "page-token-1",
        "tasks": ["CREATE_CONTENT", "MODERATE"],
        "instagram_business_account": {
            "id": "17841400000000000",
            "username": "markai",
        },
    }
    page.update(overrides)
    return page


def _patch_publish_client(monkeypatch, client):
    monkeypatch.setattr("src.services.instagram_publish.httpx.Client", lambda *args, **kwargs: client)
    monkeypatch.setattr(
        "src.services.instagram_publish.settings.instagram_publish_image_url",
        "https://example.com/placeholder.jpg",
    )
    monkeypatch.setattr("src.services.instagram_publish.time.sleep", lambda *_: None)


def test_instagram_get_user_info_returns_business_account_id(monkeypatch):
    client = _InstagramGraphClient()
    monkeypatch.setattr("src.services.oauth_instagram.httpx.Client", lambda: client)

    info = oauth_instagram.get_user_info("token-ig")

    assert info["id"] == "17841400000000000"
    assert info["username"] == "markai"
    assert info["page_access_token"] == "page-token-1"
    assert "me/accounts" in client.get_calls[0]["url"]
    assert "instagram_business_account" in client.get_calls[0]["params"]["fields"]
    assert "tasks" in client.get_calls[0]["params"]["fields"]


def test_instagram_get_user_info_skips_page_without_publish_task(monkeypatch):
    client = _InstagramGraphClient(
        pages=[
            _linked_ig_page(id="analyze-only", tasks=["ANALYZE"], access_token="nope"),
            _linked_ig_page(id="page-ok", access_token="page-token-ok"),
        ]
    )
    monkeypatch.setattr("src.services.oauth_instagram.httpx.Client", lambda: client)

    info = oauth_instagram.get_user_info("token-ig")

    assert info["page_access_token"] == "page-token-ok"
    assert info["page_id"] == "page-ok"


def test_instagram_get_user_info_follows_accounts_pagination(monkeypatch):
    second_page = _linked_ig_page(id="page-2", access_token="page-token-2")
    calls = {"n": 0}

    class _PagingClient(_InstagramGraphClient):
        def get(self, url, params=None, headers=None):
            self.get_calls.append({"url": url, "params": params, "headers": headers})
            calls["n"] += 1
            if calls["n"] == 1:
                return _JsonResponse(
                    {
                        "data": [{"id": "empty", "access_token": "x"}],
                        "paging": {"next": "https://graph.facebook.com/v23.0/me/accounts?after=cursor"},
                    }
                )
            return _JsonResponse({"data": [second_page]})

    client = _PagingClient()
    monkeypatch.setattr("src.services.oauth_instagram.httpx.Client", lambda: client)

    info = oauth_instagram.get_user_info("token-ig")

    assert info["page_access_token"] == "page-token-2"
    assert len(client.get_calls) == 2


def test_instagram_get_user_info_rejects_multiple_publishable_pages(monkeypatch):
    client = _InstagramGraphClient(
        pages=[
            _linked_ig_page(id="page-a", name="A", access_token="token-a"),
            _linked_ig_page(id="page-b", name="B", access_token="token-b"),
        ]
    )
    monkeypatch.setattr("src.services.oauth_instagram.httpx.Client", lambda: client)

    try:
        oauth_instagram.get_user_info("token-ig")
        raise AssertionError("expected ValueError")
    except ValueError as exc:
        assert "mais de uma Página" in str(exc)


def test_instagram_exchange_long_lived_token(monkeypatch):
    client = _InstagramGraphClient()
    monkeypatch.setattr("src.services.oauth_instagram.httpx.Client", lambda: client)

    data = oauth_instagram.exchange_long_lived_token("short-token")

    assert data["access_token"] == "long-lived-user-token"
    assert data["expires_in"] == 5184000


def test_instagram_publish_feed_post_creates_and_publishes_media(monkeypatch):
    client = _InstagramGraphClient()
    _patch_publish_client(monkeypatch, client)

    media_id = instagram_publish.publish_feed_post(
        "page-token-1", "17841400000000000", "Legenda"
    )

    assert media_id == "media-99"
    assert len(client.post_calls) == 2
    create = client.post_calls[0]
    assert create["json"]["caption"] == "Legenda"
    assert create["json"]["image_url"] == "https://example.com/placeholder.jpg"
    assert create["json"]["is_ai_generated"] is True
    assert create["headers"]["Authorization"] == "Bearer page-token-1"
    assert client.post_calls[1]["json"]["creation_id"] == "creation-1"
    assert any("content_publishing_limit" in call["url"] for call in client.get_calls)


def test_instagram_publish_treats_empty_status_as_ready(monkeypatch):
    client = _InstagramGraphClient(status_codes=[""])
    _patch_publish_client(monkeypatch, client)

    media_id = instagram_publish.publish_feed_post("page-token-1", "17841400000000000", "Legenda")

    assert media_id == "media-99"
    assert len(client.post_calls) == 2


def test_instagram_publish_polls_until_finished(monkeypatch):
    client = _InstagramGraphClient(status_codes=["IN_PROGRESS", "FINISHED"])
    _patch_publish_client(monkeypatch, client)

    media_id = instagram_publish.publish_feed_post("page-token-1", "17841400000000000", "Legenda")

    assert media_id == "media-99"
    status_gets = [c for c in client.get_calls if c["params"] and "status_code" in c["params"].get("fields", "")]
    assert len(status_gets) == 2


def test_instagram_publish_fails_on_expired_container(monkeypatch):
    client = _InstagramGraphClient(status_codes=["EXPIRED"])
    _patch_publish_client(monkeypatch, client)

    try:
        instagram_publish.publish_feed_post("page-token-1", "17841400000000000", "Legenda")
        raise AssertionError("expected InstagramPublishError")
    except instagram_publish.InstagramPublishError as exc:
        assert "expirou" in str(exc)


def test_instagram_publish_recovers_when_media_publish_already_live(monkeypatch):
    client = _InstagramGraphClient(
        publish_error={"error": {"message": "An unexpected error has occurred.", "code": 2, "is_transient": True}},
        publish_then_published=True,
    )
    _patch_publish_client(monkeypatch, client)

    media_id = instagram_publish.publish_feed_post("page-token-1", "17841400000000000", "Legenda")

    assert media_id == "creation-1"


def test_instagram_publish_blocks_when_daily_quota_exhausted(monkeypatch):
    client = _InstagramGraphClient(quota={"quota_usage": 50, "config": {"quota_total": 50}})
    _patch_publish_client(monkeypatch, client)

    try:
        instagram_publish.publish_feed_post("page-token-1", "17841400000000000", "Legenda")
        raise AssertionError("expected InstagramPublishError")
    except instagram_publish.InstagramPublishError as exc:
        assert "Limite de publicações" in str(exc)
    assert client.post_calls == []


def test_instagram_publish_requires_https_image(monkeypatch):
    monkeypatch.setattr(
        "src.services.instagram_publish.settings.instagram_publish_image_url",
        "http://insecure.example/photo.jpg",
    )
    try:
        instagram_publish.resolve_publish_image_url()
        raise AssertionError("expected InstagramPublishError")
    except instagram_publish.InstagramPublishError as exc:
        assert "HTTPS" in str(exc)


def test_instagram_graph_error_uses_official_subcode_copy():
    err = instagram_publish.parse_graph_error(
        {
            "error": {
                "message": "The media could not be fetched from this uri",
                "code": 9004,
                "error_subcode": 2207052,
                "fbtrace_id": "abc",
            }
        },
        http_status=400,
    )
    assert "URL pública HTTPS" in str(err)
    assert err.subcode == 2207052
    assert err.fbtrace_id == "abc"


def test_instagram_publish_post_delegates_to_feed_publish(monkeypatch):
    monkeypatch.setattr(
        "src.services.oauth_instagram.publish_feed_post",
        lambda token, ig_id, caption, image_url=None: "delegated-media",
    )

    assert oauth_instagram.publish_post("t", "ig", "cap") == "delegated-media"
