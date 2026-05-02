"""add timezone to users and email_notification_logs table

Revision ID: 005
Revises: 004_chat_sessions
Create Date: 2026-04-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '005'
down_revision = '004_chat_sessions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users: add timezone column ---
    op.add_column(
        'users',
        sa.Column(
            'timezone',
            sa.String(64),
            nullable=False,
            server_default='America/Sao_Paulo',
        ),
    )

    # --- email_notification_logs: idempotency table ---
    op.create_table(
        'email_notification_logs',
        sa.Column(
            'id',
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column(
            'user_id',
            UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('type', sa.String(32), nullable=False),
        sa.Column('ref_date', sa.Date(), nullable=False),
        sa.Column(
            'sent_at',
            sa.DateTime(),
            nullable=False,
            server_default=sa.text('now()'),
        ),
        sa.UniqueConstraint('user_id', 'type', 'ref_date', name='uq_notif_log_user_type_date'),
    )
    op.create_index('idx_notif_log_user_id', 'email_notification_logs', ['user_id'])


def downgrade() -> None:
    op.drop_index('idx_notif_log_user_id', table_name='email_notification_logs')
    op.drop_table('email_notification_logs')
    op.drop_column('users', 'timezone')
