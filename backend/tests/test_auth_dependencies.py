import pytest
from fastapi import HTTPException
from jose import jwt

from src.config import settings
from src.dependencies.auth import _resolve_token, get_user_for_sse
from src.services.auth_service import create_access_token, create_refresh_token


def test_resolve_token_rejects_refresh_type(db_session, user_factory):
    user = user_factory()
    token = create_refresh_token(user.id)
    with pytest.raises(HTTPException) as exc:
        _resolve_token(token, db_session)
    assert exc.value.status_code == 401


def test_resolve_token_rejects_missing_user(db_session):
    token = create_access_token("00000000-0000-0000-0000-000000000099")
    with pytest.raises(HTTPException) as exc:
        _resolve_token(token, db_session)
    assert exc.value.status_code == 401


def test_resolve_token_rejects_inactive_user(db_session, user_factory):
    user = user_factory(is_active=False)
    token = create_access_token(user.id)
    with pytest.raises(HTTPException) as exc:
        _resolve_token(token, db_session)
    assert exc.value.status_code == 401


def test_resolve_token_accepts_valid_access(db_session, user_factory):
    user = user_factory()
    token = create_access_token(user.id)
    resolved = _resolve_token(token, db_session)
    assert resolved.id == user.id


def test_get_user_for_sse_requires_token(db_session):
    with pytest.raises(HTTPException) as exc:
        get_user_for_sse(credentials=None, token=None, db=db_session)
    assert exc.value.status_code == 401


def test_get_user_for_sse_accepts_query_token(db_session, user_factory):
    user = user_factory()
    token = create_access_token(user.id)
    resolved = get_user_for_sse(credentials=None, token=token, db=db_session)
    assert resolved.email == user.email


def test_resolve_token_rejects_malformed_jwt(db_session):
    with pytest.raises(HTTPException):
        _resolve_token("not-a-jwt", db_session)


def test_resolve_token_rejects_wrong_secret(db_session, user_factory):
    user = user_factory()
    bad = jwt.encode(
        {"sub": str(user.id), "type": "access"},
        "wrong-secret",
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(HTTPException):
        _resolve_token(bad, db_session)
