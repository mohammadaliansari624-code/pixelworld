"""Add curated homepage featured projects.

Revision ID: 20261127_0008
Revises: 20261126_0007
"""
from alembic import op
import sqlalchemy as sa

revision = "20261127_0008"
down_revision = "20261126_0007"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "featured_projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "featured_project_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("configured", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute("INSERT INTO featured_project_config (id, configured) VALUES (1, false)")


def downgrade():
    op.drop_table("featured_project_config")
    op.drop_table("featured_projects")
