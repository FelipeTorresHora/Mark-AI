import pytest
import os
from src.database import get_db_url

def test_get_db_url_from_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/db")
    assert get_db_url() == "postgresql://user:pass@localhost/db"
