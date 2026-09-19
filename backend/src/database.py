import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

from src.config import settings


def get_db_url():
    return os.environ.get("DATABASE_URL", settings.database_url)


def _engine_kwargs() -> dict:
    url = get_db_url()
    kwargs: dict = {
        "pool_pre_ping": True,
        "connect_args": {"connect_timeout": 10},
    }
    # Serverless (Vercel): avoid holding idle pooled connections to Neon.
    if os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"):
        kwargs["poolclass"] = NullPool
    elif url.startswith("postgresql"):
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10
    return kwargs


engine = create_engine(get_db_url(), **_engine_kwargs())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
