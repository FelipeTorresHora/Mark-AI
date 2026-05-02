import uuid
from sqlalchemy import Column, String, Text, DateTime, Boolean, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base


class ChatSession(Base):
    """Sessão de chat de briefing com o CMO IA."""
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    messages = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, default=True, nullable=False)
    brand_profile_complete = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
