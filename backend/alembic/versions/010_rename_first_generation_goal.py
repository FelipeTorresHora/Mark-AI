"""rename habit goal define_objective to first_generation

Revision ID: 010
Revises: 009
Create Date: 2026-09-19
"""
from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE user_goals
        SET goal_key = 'first_generation'
        WHERE goal_key = 'define_objective'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE user_goals
        SET goal_key = 'define_objective'
        WHERE goal_key = 'first_generation'
        """
    )
