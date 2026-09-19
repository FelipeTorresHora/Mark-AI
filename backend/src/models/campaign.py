import uuid
from sqlalchemy import CheckConstraint, Column, String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from src.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING','GENERATING','AWAITING_REVIEW','DONE','FAILED')",
            name="ck_campaigns_status",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic = Column(Text, nullable=False)
    objective = Column(Text, nullable=True)
    audience = Column(String(20), nullable=True)
    brand_context = Column(JSONB, nullable=False)
    graph_thread_id = Column(String(64), nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")
    user_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
