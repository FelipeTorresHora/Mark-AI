"""expand campaign/post/social check constraints for LangGraph review and Instagram

Revision ID: 012
Revises: 011
Create Date: 2026-09-19
"""
from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_campaigns_status", "campaigns", type_="check")
    op.create_check_constraint(
        "ck_campaigns_status",
        "campaigns",
        "status IN ('PENDING','GENERATING','AWAITING_REVIEW','DONE','FAILED')",
    )

    op.drop_constraint("ck_posts_status", "posts", type_="check")
    op.create_check_constraint(
        "ck_posts_status",
        "posts",
        "status IN ('DRAFT','UNDER_REVIEW','APPROVED','REJECTED','FINAL','PUBLISHED','SKIPPED')",
    )

    op.drop_constraint("ck_posts_platform", "posts", type_="check")
    op.create_check_constraint(
        "ck_posts_platform",
        "posts",
        "platform IN ('X','LINKEDIN','INSTAGRAM')",
    )

    op.drop_constraint("ck_social_accounts_platform", "social_accounts", type_="check")
    op.create_check_constraint(
        "ck_social_accounts_platform",
        "social_accounts",
        "platform IN ('X','LINKEDIN','INSTAGRAM')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_social_accounts_platform", "social_accounts", type_="check")
    op.create_check_constraint(
        "ck_social_accounts_platform",
        "social_accounts",
        "platform IN ('X','LINKEDIN')",
    )

    op.drop_constraint("ck_posts_platform", "posts", type_="check")
    op.create_check_constraint(
        "ck_posts_platform",
        "posts",
        "platform IN ('X','LINKEDIN')",
    )

    op.drop_constraint("ck_posts_status", "posts", type_="check")
    op.create_check_constraint(
        "ck_posts_status",
        "posts",
        "status IN ('DRAFT','UNDER_REVIEW','APPROVED','REJECTED','FINAL','PUBLISHED')",
    )

    op.drop_constraint("ck_campaigns_status", "campaigns", type_="check")
    op.create_check_constraint(
        "ck_campaigns_status",
        "campaigns",
        "status IN ('PENDING','GENERATING','DONE','FAILED')",
    )
