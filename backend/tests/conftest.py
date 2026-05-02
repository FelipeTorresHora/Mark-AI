import os
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from src import models  # noqa: F401 - ensure model metadata is registered
from src.config import settings
from src.database import Base, get_db
from src.main import app
from src.models.brand_profile import BrandProfile
from src.models.campaign import Campaign
from src.models.post import Post
from src.models.social_account import SocialAccount
from src.models.user import User
from src.models.x_account import XAccount
from src.services.auth_service import create_access_token, create_refresh_token, hash_password


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", settings.database_url)


@pytest.fixture
def test_engine() -> Iterator:
    database_url = _database_url()
    admin_engine = create_engine(database_url)
    schema_name = f"test_{uuid.uuid4().hex}"

    with admin_engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA "{schema_name}"'))

    engine = create_engine(
        database_url,
        connect_args={"options": f"-csearch_path={schema_name}"},
    )
    Base.metadata.create_all(bind=engine)

    try:
        yield engine
    finally:
        engine.dispose()
        with admin_engine.begin() as conn:
            conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))
        admin_engine.dispose()


@pytest.fixture
def session_factory(test_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session(session_factory) -> Iterator[Session]:
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(session_factory, monkeypatch) -> Iterator[TestClient]:
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("src.main.SessionLocal", session_factory)

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def user_factory(db_session):
    def create_user(
        email: str | None = None,
        password: str = "secret123",
        is_active: bool = True,
    ) -> User:
        user = User(
            email=email or f"{uuid.uuid4().hex}@example.com",
            hashed_password=hash_password(password),
            is_active=is_active,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return create_user


@pytest.fixture
def auth_headers():
    def build(user: User) -> dict[str, str]:
        return {"Authorization": f"Bearer {create_access_token(user.id)}"}

    return build


@pytest.fixture
def refresh_token():
    def build(user: User) -> str:
        return create_refresh_token(user.id)

    return build


@pytest.fixture
def campaign_factory(db_session):
    def create_campaign(
        user: User,
        topic: str = "Nova campanha",
        status: str = "PENDING",
        brand_context: dict | None = None,
    ) -> Campaign:
        campaign = Campaign(
            user_id=user.id,
            topic=topic,
            status=status,
            brand_context=brand_context
            or {
                "name": "Marca XPTO",
                "niche": "Marketing",
                "tone": "Direto",
                "target_audience": "Empreendedores",
                "unique_value": "Automacao com IA",
            },
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(campaign)
        return campaign

    return create_campaign


@pytest.fixture
def post_factory(db_session):
    def create_post(
        campaign: Campaign,
        platform: str = "X",
        status: str = "DRAFT",
        content: str | None = "Conteudo inicial",
    ) -> Post:
        post = Post(
            campaign_id=campaign.id,
            user_id=campaign.user_id,
            platform=platform,
            status=status,
            content=content,
        )
        db_session.add(post)
        db_session.commit()
        db_session.refresh(post)
        return post

    return create_post


@pytest.fixture
def brand_profile_factory(db_session):
    def create_profile(user: User, **overrides) -> BrandProfile:
        profile = BrandProfile(
            user_id=user.id,
            name=overrides.get("name", "Marca XPTO"),
            niche=overrides.get("niche", "Marketing"),
            tone=overrides.get("tone", "Direto"),
            target_audience=overrides.get("target_audience", "Empreendedores"),
            unique_value=overrides.get("unique_value", "Automacao com IA"),
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        return profile

    return create_profile


@pytest.fixture
def social_account_factory(db_session):
    def create_account(
        user: User,
        platform: str = "X",
        platform_user_id: str = "acct-123",
        access_token: str = "access-token",
        refresh_token_value: str | None = None,
        expires_at: datetime | None = None,
        scope: str | None = None,
    ) -> SocialAccount:
        account = SocialAccount(
            user_id=user.id,
            platform=platform,
            platform_user_id=platform_user_id,
            access_token=access_token,
            refresh_token=refresh_token_value,
            expires_at=expires_at,
            scope=scope,
        )
        db_session.add(account)
        db_session.commit()
        db_session.refresh(account)
        return account

    return create_account


@pytest.fixture
def x_account_factory(db_session):
    def create_x_account(
        user: User,
        x_user_id: str = "x-123",
        username: str = "marca",
        access_token: str = "access-token",
        refresh_token_value: str | None = None,
        expires_at: datetime | None = None,
        revoked_at: datetime | None = None,
    ) -> XAccount:
        account = XAccount(
            user_id=user.id,
            x_user_id=x_user_id,
            username=username,
            access_token_encrypted=access_token,
            refresh_token_encrypted=refresh_token_value,
            expires_at=expires_at,
            revoked_at=revoked_at,
        )
        db_session.add(account)
        db_session.commit()
        db_session.refresh(account)
        return account

    return create_x_account


@pytest.fixture
def expired_datetime() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=1)
