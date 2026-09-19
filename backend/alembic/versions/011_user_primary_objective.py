"""user primary objective for habit goal

Revision ID: 011
Revises: 010
Create Date: 2026-09-19
"""

from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("primary_objective", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "primary_objective")
