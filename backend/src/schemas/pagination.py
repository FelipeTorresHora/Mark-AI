from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Envelope padrão para endpoints paginados."""
    items: list[T]
    total: int
    skip: int
    limit: int
