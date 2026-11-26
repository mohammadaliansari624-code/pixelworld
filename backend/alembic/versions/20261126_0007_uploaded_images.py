"""Store uploaded images in PostgreSQL so they survive redeploys and restarts.

Revision ID: 20261126_0007
Revises: 20261125_0006
"""
from alembic import op
import sqlalchemy as sa

revision = "20261126_0007"
down_revision = "20261125_0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "uploaded_images",
        sa.Column("filename", sa.String(length=80), primary_key=True),
        sa.Column("content_type", sa.String(length=60), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("uploaded_images")
