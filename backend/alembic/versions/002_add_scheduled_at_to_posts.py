"""add scheduled_at to posts

Revision ID: 002
Revises: 001
Create Date: 2026-04-04

"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('posts', sa.Column('scheduled_at', sa.DateTime, nullable=True))
    op.create_index('idx_posts_scheduled_at', 'posts', ['scheduled_at'])


def downgrade() -> None:
    op.drop_index('idx_posts_scheduled_at', table_name='posts')
    op.drop_column('posts', 'scheduled_at')
