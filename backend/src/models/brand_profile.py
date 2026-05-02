import uuid
from sqlalchemy import Column, String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    name = Column(String(255), nullable=False)
    niche = Column(String(255), nullable=False)
    tone = Column(String(50), nullable=False)
    target_audience = Column(Text, nullable=False)
    unique_value = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
