"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'brand_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('niche', sa.String(255), nullable=False),
        sa.Column('tone', sa.String(50), nullable=False),
        sa.Column('target_audience', sa.Text, nullable=False),
        sa.Column('unique_value', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        'campaigns',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('topic', sa.Text, nullable=False),
        sa.Column('brand_context', postgresql.JSONB, nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('PENDING','GENERATING','DONE','FAILED')", name='ck_campaigns_status'),
    )
    op.create_index('idx_campaigns_created_at', 'campaigns', ['created_at'])

    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('messages', postgresql.JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index('idx_conversations_created_at', 'conversations', ['created_at'])

    op.create_table(
        'posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=True),
        sa.Column('platform', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=True),
        sa.Column('score', sa.Integer, nullable=True),
        sa.Column('feedback', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='DRAFT'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("platform IN ('X','LINKEDIN')", name='ck_posts_platform'),
        sa.CheckConstraint(
            "status IN ('DRAFT','UNDER_REVIEW','APPROVED','REJECTED','FINAL')",
            name='ck_posts_status',
        ),
        sa.CheckConstraint('score >= 0 AND score <= 100', name='ck_posts_score'),
    )
    op.create_index('idx_posts_campaign_id', 'posts', ['campaign_id'])
    op.create_index('idx_posts_status', 'posts', ['status', 'created_at'])


def downgrade() -> None:
    op.drop_table('posts')
    op.drop_table('conversations')
    op.drop_table('campaigns')
    op.drop_table('brand_profiles')
