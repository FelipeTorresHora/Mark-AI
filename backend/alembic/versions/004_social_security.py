"""social security and observability fields

Revision ID: 004
Revises: 003
Create Date: 2026-04-06

"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("social_accounts", sa.Column("last_refreshed_at", sa.DateTime(), nullable=True))
    op.add_column("social_accounts", sa.Column("last_publish_at", sa.DateTime(), nullable=True))
    op.add_column("social_accounts", sa.Column("last_error", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("social_accounts", "last_error")
    op.drop_column("social_accounts", "last_publish_at")
    op.drop_column("social_accounts", "last_refreshed_at")
