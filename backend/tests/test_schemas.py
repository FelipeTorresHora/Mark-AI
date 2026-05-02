from datetime import datetime
from uuid import uuid4
from src.schemas.post import PostResponse

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
