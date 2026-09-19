"""user audience and goals

Revision ID: 009
Revises: 008
Create Date: 2026-09-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None

GOAL_KEYS = (
    "connect_account",
    "define_objective",
    "approve_first_post",
    "publish_3_in_7_days",
    "two_channels",
    "consistent_week",
)


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "audience",
            sa.String(32),
            nullable=False,
            server_default="mei_loja_liberal",
        ),
    )

    op.create_table(
        "user_goals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("goal_key", sa.String(64), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "goal_key", name="uq_user_goals_user_goal_key"),
    )
    op.create_index("ix_user_goals_user_id", "user_goals", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_goals_user_id", table_name="user_goals")
    op.drop_table("user_goals")
    op.drop_column("users", "audience")
