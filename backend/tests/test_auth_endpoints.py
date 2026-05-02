from src.models.user import User
from src.services.auth_service import create_access_token


def test_register_creates_user(client, db_session):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "novo@example.com", "password": "secret123"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "novo@example.com"
    assert "hashed_password" not in data

    created = db_session.query(User).filter(User.email == "novo@example.com").first()
    assert created is not None


def test_register_rejects_duplicate_email(client, user_factory):
    user_factory(email="duplicado@example.com")

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "duplicado@example.com", "password": "secret123"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "E-mail já cadastrado"


def test_register_rejects_password_longer_than_72_utf8_bytes(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "longa@example.com", "password": "á" * 80},
    )

    assert response.status_code == 422
    assert "72 bytes" in str(response.json()["detail"])


def test_register_preflight_returns_cors_headers(client):
    response = client.options(
        "/api/v1/auth/register",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_login_returns_access_token_and_refresh_cookie(client, user_factory):
    user_factory(email="login@example.com", password="secret123")

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "secret123"},
    )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]
    assert "refresh_token=" in response.headers["set-cookie"]


def test_login_rejects_invalid_credentials(client, user_factory):
    user_factory(email="login@example.com", password="secret123")

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "errada123"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha incorretos"


def test_refresh_returns_new_access_token(client, user_factory, refresh_token):
    user = user_factory()
    client.cookies.set("refresh_token", refresh_token(user), path="/api/v1/auth/refresh")

    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 200
    assert response.json()["access_token"]
    assert "refresh_token=" in response.headers["set-cookie"]


def test_refresh_rejects_missing_cookie(client):
    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Sessão expirada"


def test_refresh_rejects_access_token_instead_of_refresh(client, user_factory):
    user = user_factory()
    client.cookies.set(
        "refresh_token",
        create_access_token(user.id),
        path="/api/v1/auth/refresh",
    )

    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Token inválido"


def test_logout_clears_refresh_cookie(client):
    response = client.post("/api/v1/auth/logout")

    assert response.status_code == 200
    assert response.json()["message"] == "Sessão encerrada"
    assert "refresh_token=\"\"" in response.headers["set-cookie"]


def test_me_returns_current_user(client, user_factory, auth_headers):
    user = user_factory(email="me@example.com")

    response = client.get("/api/v1/auth/me", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_me_requires_authentication(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
