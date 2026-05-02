from urllib.parse import parse_qs, urlparse

from src.models.post import Post
from src.models.social_account import SocialAccount
from src.services.oauth_state import build_state, parse_state
from src.services.social_crypto import decrypt_social_token


def test_list_social_accounts_returns_connected_accounts(
    client,
    user_factory,
    social_account_factory,
    auth_headers,
):
    user = user_factory()
    social_account_factory(user, platform="X")
    social_account_factory(user, platform="LINKEDIN", platform_user_id="li-1")

    response = client.get("/api/v1/social/accounts", headers=auth_headers(user))

    assert response.status_code == 200
    assert {item["platform"] for item in response.json()} == {"X", "LINKEDIN"}


def test_connect_x_redirects_with_signed_state(client, user_factory, auth_headers, monkeypatch):
    user = user_factory()

    seen_calls = []

    monkeypatch.setattr(
        "src.routers.social.oauth_x.get_authorization_url",
        lambda state, code_verifier=None: (
            seen_calls.append((state, code_verifier)) or
            (f"https://twitter.com/i/oauth2/authorize?state={state}", code_verifier or "verifier-123")
        ),
    )

    response = client.get(
        "/api/v1/social/connect/x",
        headers=auth_headers(user),
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"].startswith("https://twitter.com/i/oauth2/authorize?state=")
    assert len(seen_calls) == 2
    assert seen_calls[1][1] == "verifier-123"
    signed_state = parse_qs(urlparse(response.headers["location"]).query)["state"][0]
    parsed = parse_state(signed_state, "X")
    assert parsed["user_id"] == str(user.id)
    assert parsed["code_verifier"] == "verifier-123"


def test_connect_x_url_returns_validated_authorization_url(client, user_factory, auth_headers, monkeypatch):
    user = user_factory()
    monkeypatch.setattr(
        "src.routers.social.oauth_x.get_authorization_url",
        lambda state, code_verifier=None: (
            f"https://twitter.com/i/oauth2/authorize?state={state}",
            code_verifier or "verifier-123",
        ),
    )

    response = client.get(
        "/api/v1/social/connect/x/url",
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert response.json()["authorization_url"].startswith("https://twitter.com/i/oauth2/authorize")


def test_callback_x_persists_account_and_redirects(
    client,
    user_factory,
    db_session,
    monkeypatch,
):
    user = user_factory()
    state = build_state(str(user.id), "X", "verifier-123")
    monkeypatch.setattr(
        "src.routers.social.oauth_x.exchange_code_for_token",
        lambda code, verifier: {
            "access_token": "token-x",
            "refresh_token": "refresh-x",
            "expires_in": 3600,
            "scope": "tweet.read",
        },
    )
    monkeypatch.setattr(
        "src.routers.social.oauth_x.get_user_info",
        lambda access_token: {"id": "x-user-1"},
    )

    response = client.get(
        "/api/v1/social/callback/x",
        params={"code": "abc", "state": state},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"].endswith("/configuracoes?connected=x")

    account = db_session.query(SocialAccount).filter(SocialAccount.user_id == user.id).first()
    assert account is not None
    assert account.platform == "X"
    assert account.access_token != "token-x"
    assert decrypt_social_token(account.access_token) == "token-x"


def test_connect_linkedin_redirects_with_signed_state(client, user_factory, auth_headers, monkeypatch):
    user = user_factory()
    monkeypatch.setattr(
        "src.routers.social.oauth_linkedin.get_authorization_url",
        lambda state: f"https://www.linkedin.com/oauth/v2/authorization?state={state}",
    )

    response = client.get(
        "/api/v1/social/connect/linkedin",
        headers=auth_headers(user),
        follow_redirects=False,
    )

    assert response.status_code == 302
    state = response.headers["location"].split("state=")[1]
    parsed = parse_state(state, "LINKEDIN")
    assert parsed["user_id"] == str(user.id)


def test_connect_linkedin_url_returns_validated_authorization_url(client, user_factory, auth_headers, monkeypatch):
    user = user_factory()
    monkeypatch.setattr(
        "src.routers.social.oauth_linkedin.get_authorization_url",
        lambda state: f"https://www.linkedin.com/oauth/v2/authorization?state={state}",
    )

    response = client.get(
        "/api/v1/social/connect/linkedin/url",
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert response.json()["authorization_url"].startswith("https://www.linkedin.com/oauth/v2/authorization")


def test_callback_linkedin_rejects_invalid_state(client):
    response = client.get(
        "/api/v1/social/callback/linkedin",
        params={"code": "abc", "state": "invalido"},
        follow_redirects=False,
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "State inválido"


def test_callback_linkedin_persists_account_and_redirects(
    client,
    user_factory,
    db_session,
    monkeypatch,
):
    user = user_factory()
    state = build_state(str(user.id), "LINKEDIN")
    monkeypatch.setattr(
        "src.routers.social.oauth_linkedin.exchange_code_for_token",
        lambda code: {
            "access_token": "token-li",
            "expires_in": 7200,
            "scope": "openid profile",
        },
    )
    monkeypatch.setattr(
        "src.routers.social.oauth_linkedin.get_user_info",
        lambda access_token: {"sub": "li-user-1"},
    )

    response = client.get(
        "/api/v1/social/callback/linkedin",
        params={"code": "abc", "state": state},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"].endswith("/configuracoes?connected=linkedin")

    account = db_session.query(SocialAccount).filter(SocialAccount.user_id == user.id).first()
    assert account is not None
    assert account.platform == "LINKEDIN"
    assert account.scope == "openid profile"


def test_disconnect_account_removes_connected_account(
    client,
    user_factory,
    social_account_factory,
    auth_headers,
    db_session,
):
    user = user_factory()
    social_account_factory(user, platform="X")

    response = client.delete("/api/v1/social/accounts/x", headers=auth_headers(user))

    assert response.status_code == 204
    assert db_session.query(SocialAccount).filter(SocialAccount.user_id == user.id).first() is None


def test_disconnect_account_returns_404_when_missing(client, user_factory, auth_headers):
    user = user_factory()

    response = client.delete("/api/v1/social/accounts/x", headers=auth_headers(user))

    assert response.status_code == 404
    assert response.json()["detail"] == "Conta não conectada"


def test_publish_post_requires_final_or_approved_status(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    social_account_factory,
    auth_headers,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post = post_factory(campaign, platform="X", status="DRAFT")
    social_account_factory(user, platform="X")

    response = client.post(f"/api/v1/social/posts/{post.id}/publish", headers=auth_headers(user))

    assert response.status_code == 422
    assert "FINAL" in response.json()["detail"]


def test_publish_post_requires_connected_account(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    auth_headers,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post = post_factory(campaign, platform="X", status="APPROVED")

    response = client.post(f"/api/v1/social/posts/{post.id}/publish", headers=auth_headers(user))

    assert response.status_code == 400
    assert "não conectada" in response.json()["detail"]


def test_publish_post_refresh_failure_returns_400(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    social_account_factory,
    auth_headers,
    expired_datetime,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post = post_factory(campaign, platform="X", status="APPROVED")
    social_account_factory(
        user,
        platform="X",
        refresh_token_value="refresh-x",
        expires_at=expired_datetime,
    )
    monkeypatch.setattr(
        "src.routers.social.oauth_x.refresh_access_token",
        lambda refresh_token: (_ for _ in ()).throw(RuntimeError("expired")),
    )

    response = client.post(f"/api/v1/social/posts/{post.id}/publish", headers=auth_headers(user))

    assert response.status_code == 400
    assert "Reconecte a conta" in response.json()["detail"]


def test_publish_post_to_x_updates_post(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    social_account_factory,
    auth_headers,
    db_session,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post = post_factory(campaign, platform="X", status="FINAL", content="Tweet pronto")
    social_account_factory(user, platform="X", access_token="token-x")
    monkeypatch.setattr("src.routers.social.oauth_x.post_tweet", lambda token, text: "tweet-123")

    response = client.post(f"/api/v1/social/posts/{post.id}/publish", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["platform_post_id"] == "tweet-123"

    db_session.refresh(post)
    assert post.status == "PUBLISHED"


def test_publish_post_to_x_still_accepts_approved_for_compatibility(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    social_account_factory,
    auth_headers,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post = post_factory(campaign, platform="X", status="APPROVED", content="Compat post")
    social_account_factory(user, platform="X", access_token="token-x")
    monkeypatch.setattr("src.routers.social.oauth_x.post_tweet", lambda token, text: "tweet-compat")

    response = client.post(f"/api/v1/social/posts/{post.id}/publish", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["platform_post_id"] == "tweet-compat"


def test_publish_post_to_x_rejects_content_above_280_chars(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    social_account_factory,
    auth_headers,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post = post_factory(campaign, platform="X", status="FINAL", content=("x" * 281))
    social_account_factory(user, platform="X", access_token="token-x")

    response = client.post(f"/api/v1/social/posts/{post.id}/publish", headers=auth_headers(user))

    assert response.status_code == 422
    assert "280" in response.json()["detail"]


def test_publish_post_to_linkedin_updates_post(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    social_account_factory,
    auth_headers,
    db_session,
    monkeypatch,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post = post_factory(campaign, platform="LINKEDIN", status="FINAL", content="Post pronto")
    social_account_factory(
        user,
        platform="LINKEDIN",
        platform_user_id="li-123",
        access_token="token-li",
    )
    monkeypatch.setattr(
        "src.routers.social.oauth_linkedin.publish_post",
        lambda token, author_urn, text: "li-post-123",
    )

    response = client.post(f"/api/v1/social/posts/{post.id}/publish", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["platform"] == "LINKEDIN"
    assert response.json()["platform_post_id"] == "li-post-123"

    db_session.refresh(post)
    assert post.status == "PUBLISHED"


def test_publish_post_to_linkedin_requires_reconnect_when_expired(
    client,
    user_factory,
    campaign_factory,
    post_factory,
    social_account_factory,
    auth_headers,
    expired_datetime,
):
    user = user_factory()
    campaign = campaign_factory(user)
    post = post_factory(campaign, platform="LINKEDIN", status="FINAL", content="Post pronto")
    social_account_factory(
        user,
        platform="LINKEDIN",
        platform_user_id="li-123",
        access_token="token-li",
        expires_at=expired_datetime,
    )

    response = client.post(f"/api/v1/social/posts/{post.id}/publish", headers=auth_headers(user))

    assert response.status_code == 400
    assert "Reconecte a conta" in response.json()["detail"]
