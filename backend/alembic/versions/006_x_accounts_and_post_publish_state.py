"""x accounts and post publish state

Revision ID: 006
Revises: 005
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "x_accounts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("x_user_id", sa.String(255), nullable=False),
        sa.Column("username", sa.String(255), nullable=True),
        sa.Column("access_token_encrypted", sa.Text(), nullable=True),
        sa.Column("refresh_token_encrypted", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("scope", sa.String(500), nullable=True),
        sa.Column("last_refreshed_at", sa.DateTime(), nullable=True),
        sa.Column("last_publish_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", name="uq_x_accounts_user_id"),
    )
    op.create_index("idx_x_accounts_user_id", "x_accounts", ["user_id"])

    op.create_table(
        "x_audit_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("post_id", UUID(as_uuid=True), sa.ForeignKey("posts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("x_account_id", UUID(as_uuid=True), sa.ForeignKey("x_accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_x_audit_logs_user_created", "x_audit_logs", ["user_id", "created_at"])

    op.add_column("posts", sa.Column("user_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_posts_user_id_users", "posts", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.execute(
        """
        UPDATE posts
        SET user_id = campaigns.user_id
        FROM campaigns
        WHERE posts.campaign_id = campaigns.id
          AND posts.user_id IS NULL
          AND campaigns.user_id IS NOT NULL
        """
    )
    op.create_index("idx_posts_user_id", "posts", ["user_id"])

    op.add_column("posts", sa.Column("publish_status", sa.String(20), nullable=False, server_default="pending"))
    op.add_column("posts", sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("posts", sa.Column("last_attempt_at", sa.DateTime(), nullable=True))
    op.add_column("posts", sa.Column("next_attempt_at", sa.DateTime(), nullable=True))
    op.add_column("posts", sa.Column("error_code", sa.String(100), nullable=True))
    op.add_column("posts", sa.Column("error_message", sa.Text(), nullable=True))
    op.create_check_constraint(
        "ck_posts_publish_status",
        "posts",
        "publish_status IN ('pending', 'processing', 'published', 'failed', 'canceled')",
    )
    op.create_index("idx_posts_publish_due", "posts", ["platform", "publish_status", "scheduled_at", "next_attempt_at"])


def downgrade() -> None:
    op.drop_index("idx_posts_publish_due", table_name="posts")
    op.drop_constraint("ck_posts_publish_status", "posts", type_="check")
    op.drop_column("posts", "error_message")
    op.drop_column("posts", "error_code")
    op.drop_column("posts", "next_attempt_at")
    op.drop_column("posts", "last_attempt_at")
    op.drop_column("posts", "attempt_count")
    op.drop_column("posts", "publish_status")
    op.drop_index("idx_posts_user_id", table_name="posts")
    op.drop_constraint("fk_posts_user_id_users", "posts", type_="foreignkey")
    op.drop_column("posts", "user_id")
    op.drop_index("idx_x_audit_logs_user_created", table_name="x_audit_logs")
    op.drop_table("x_audit_logs")
    op.drop_index("idx_x_accounts_user_id", table_name="x_accounts")
    op.drop_table("x_accounts")
