from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from src.schemas.auth import RegisterRequest
from src.schemas.post import PostResponse


def test_register_request_password_min_length():
    with pytest.raises(ValidationError):
        RegisterRequest(email="a@b.com", password="short")

def test_post_response_validation():
    post_data = {
        "id": uuid4(),
        "platform": "X",
        "content": "Hello World",
        "status": "DRAFT",
        "iterations": 0,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    schema = PostResponse(**post_data)
    assert schema.platform == "X"
