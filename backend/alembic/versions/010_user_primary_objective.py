"""user primary objective for habit goal

Revision ID: 010
Revises: 009
Create Date: 2026-09-19
"""

from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("primary_objective", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "primary_objective")
