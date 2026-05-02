import os

def test_alembic_initialized():
    assert os.path.exists("alembic.ini")
    assert os.path.isdir("alembic")
