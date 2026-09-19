"""campaign objective, audience, graph thread for LangGraph

Revision ID: 008
Revises: 007
Create Date: 2026-09-19
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("campaigns", sa.Column("objective", sa.Text(), nullable=True))
    op.add_column("campaigns", sa.Column("audience", sa.String(32), nullable=True))
    op.add_column("campaigns", sa.Column("graph_thread_id", sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column("campaigns", "graph_thread_id")
    op.drop_column("campaigns", "audience")
    op.drop_column("campaigns", "objective")
