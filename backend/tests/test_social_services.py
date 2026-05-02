from src.services import oauth_linkedin


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


def test_linkedin_publish_post_uses_rest_posts_endpoint(monkeypatch):
    client = _DummyClient()
    monkeypatch.setattr("src.services.oauth_linkedin.httpx.Client", lambda: client)

    post_id = oauth_linkedin.publish_post("token-li", "urn:li:person:123", "Texto")

    assert post_id == "linkedin-post-1"
    assert client.calls[0]["url"] == "https://api.linkedin.com/rest/posts"
    assert client.calls[0]["headers"]["Linkedin-Version"]
    assert client.calls[0]["json"]["commentary"] == "Texto"
    assert client.calls[0]["json"]["visibility"] == "PUBLIC"
