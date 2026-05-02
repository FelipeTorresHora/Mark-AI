"""post insight snapshots

Revision ID: 007
Revises: 006
Create Date: 2026-04-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "post_insight_snapshots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("post_id", UUID(as_uuid=True), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(20), nullable=False),
        sa.Column("platform_post_id", sa.String(255), nullable=False),
        sa.Column("captured_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("impressions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reach", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("likes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("comments", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("shares", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bookmarks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("profile_clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("engagements", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("engagement_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("raw_metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_post_insights_user_captured", "post_insight_snapshots", ["user_id", "captured_at"])
    op.create_index("idx_post_insights_post_captured", "post_insight_snapshots", ["post_id", "captured_at"])
    op.create_index("idx_post_insights_platform_post", "post_insight_snapshots", ["platform", "platform_post_id"])


def downgrade() -> None:
    op.drop_index("idx_post_insights_platform_post", table_name="post_insight_snapshots")
    op.drop_index("idx_post_insights_post_captured", table_name="post_insight_snapshots")
    op.drop_index("idx_post_insights_user_captured", table_name="post_insight_snapshots")
    op.drop_table("post_insight_snapshots")
