import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from src.database import Base


class XAccount(Base):
    __tablename__ = "x_accounts"
    __table_args__ = (UniqueConstraint("user_id", name="uq_x_accounts_user_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    x_user_id = Column(String(255), nullable=False)
    username = Column(String(255), nullable=True)
    access_token_encrypted = Column(Text, nullable=True)
    refresh_token_encrypted = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    scope = Column(String(500), nullable=True)
    last_refreshed_at = Column(DateTime, nullable=True)
    last_publish_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
