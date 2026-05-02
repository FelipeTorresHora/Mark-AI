import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from src.database import Base


class XAuditLog(Base):
    __tablename__ = "x_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)
    x_account_id = Column(UUID(as_uuid=True), ForeignKey("x_accounts.id", ondelete="SET NULL"), nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
