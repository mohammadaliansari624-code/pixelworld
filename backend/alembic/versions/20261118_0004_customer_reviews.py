"""Add customer reviews and moderation.

Revision ID: 20261118_0004
Revises: 20261117_0003
"""
from alembic import op
import sqlalchemy as sa

revision = "20261118_0004"
down_revision = "20261117_0003"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_name", sa.String(length=120), nullable=False),
        sa.Column("profile_image_url", sa.String(length=1000), server_default="", nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("review_text", sa.Text(), nullable=False),
        sa.Column("project_name", sa.String(length=180), server_default="", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_reviews_status", "reviews", ["status"], unique=False)

def downgrade():
    op.drop_index("ix_reviews_status", table_name="reviews")
    op.drop_table("reviews")
