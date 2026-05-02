from src.models import Conversation, Post
from src.database import Base

def test_models_exist():
    assert issubclass(Conversation, Base)
    assert issubclass(Post, Base)
    assert Conversation.__tablename__ == "conversations"
    assert Post.__tablename__ == "posts"
