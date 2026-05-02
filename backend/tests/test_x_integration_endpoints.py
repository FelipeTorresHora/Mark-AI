from urllib.parse import parse_qs, urlparse

from src.models.x_account import XAccount
from src.services.oauth_state import build_state, parse_state
from src.services.social_crypto import decrypt_social_token


def test_x_connect_url_returns_signed_state(client, user_factory, auth_headers, monkeypatch):
    user = user_factory()
    monkeypatch.setattr(
        "src.routers.x_integration.oauth_x.get_authorization_url",
        lambda state, code_verifier=None: (
            f"https://twitter.com/i/oauth2/authorize?state={state}",
            code_verifier or "verifier-123",
        ),
    )

    response = client.get("/api/v1/integrations/x/connect-url", headers=auth_headers(user))

    assert response.status_code == 200
    signed_state = parse_qs(urlparse(response.json()["authorization_url"]).query)["state"][0]
    parsed = parse_state(signed_state, "X")
    assert parsed["user_id"] == str(user.id)
    assert parsed["code_verifier"] == "verifier-123"


def test_x_callback_persists_encrypted_x_account(client, user_factory, db_session, monkeypatch):
    user = user_factory()
    state = build_state(str(user.id), "X", "verifier-123")
    monkeypatch.setattr(
        "src.routers.x_integration.oauth_x.exchange_code_for_token",
        lambda code, verifier: {
            "access_token": "token-x",
            "refresh_token": "refresh-x",
            "expires_in": 3600,
            "scope": "tweet.write",
        },
    )
    monkeypatch.setattr(
        "src.routers.x_integration.oauth_x.get_user_info",
        lambda token: {"id": "x-user-1", "username": "marca"},
    )

    response = client.get(
        "/api/v1/integrations/x/callback",
        params={"code": "abc", "state": state},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"].endswith("/cmo?connected=x")
    account = db_session.query(XAccount).filter(XAccount.user_id == user.id).first()
    assert account.username == "marca"
    assert account.access_token_encrypted != "token-x"
    assert decrypt_social_token(account.access_token_encrypted) == "token-x"


def test_x_status_and_disconnect(client, user_factory, x_account_factory, auth_headers):
    user = user_factory()
    x_account_factory(user, username="marca")

    status_response = client.get("/api/v1/integrations/x/status", headers=auth_headers(user))
    assert status_response.status_code == 200
    assert status_response.json()["connected"] is True
    assert status_response.json()["username"] == "marca"

    disconnect_response = client.post("/api/v1/integrations/x/disconnect", headers=auth_headers(user))
    assert disconnect_response.status_code == 204

    status_response = client.get("/api/v1/integrations/x/status", headers=auth_headers(user))
    assert status_response.json()["connected"] is False
    assert status_response.json()["reconnect_required"] is True
