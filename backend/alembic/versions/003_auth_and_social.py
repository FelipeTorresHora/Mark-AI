"""auth tables and social publishing fields

Revision ID: 003
Revises: 002
Create Date: 2026-04-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users table ---
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )
    op.create_index('idx_users_email', 'users', ['email'])

    # --- social_accounts table ---
    op.create_table(
        'social_accounts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('platform', sa.String(20), nullable=False),
        sa.Column('platform_user_id', sa.String(255), nullable=False),
        sa.Column('access_token', sa.Text(), nullable=False),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('scope', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint("platform IN ('X', 'LINKEDIN')", name='ck_social_accounts_platform'),
        sa.UniqueConstraint('user_id', 'platform', name='uq_social_accounts_user_platform'),
    )
    op.create_index('idx_social_accounts_user_id', 'social_accounts', ['user_id'])

    # --- posts: add publishing fields ---
    op.add_column('posts', sa.Column('published_at', sa.DateTime(), nullable=True))
    op.add_column('posts', sa.Column('platform_post_id', sa.String(255), nullable=True))

    # --- posts: expand status constraint to include PUBLISHED ---
    op.drop_constraint('ck_posts_status', 'posts', type_='check')
    op.create_check_constraint(
        'ck_posts_status',
        'posts',
        "status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FINAL', 'PUBLISHED')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_posts_status', 'posts', type_='check')
    op.create_check_constraint(
        'ck_posts_status',
        'posts',
        "status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FINAL')",
    )
    op.drop_column('posts', 'platform_post_id')
    op.drop_column('posts', 'published_at')

    op.drop_index('idx_social_accounts_user_id', table_name='social_accounts')
    op.drop_table('social_accounts')

    op.drop_index('idx_users_email', table_name='users')
    op.drop_table('users')
