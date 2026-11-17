"""Add additional official social profile URLs to site settings.

Revision ID: 20261117_0002
Revises: 20261117_0001
Create Date: 2026-11-17
"""
from alembic import op
import sqlalchemy as sa


revision = "20261117_0002"
down_revision = "20261117_0001"
branch_labels = None
depends_on = None


def upgrade():
    for column in ("linkedin_url", "tiktok_url", "behance_url", "pinterest_url"):
        op.add_column(
            "site_settings",
            sa.Column(column, sa.String(length=1000), server_default="", nullable=False),
        )


def downgrade():
    for column in ("pinterest_url", "behance_url", "tiktok_url", "linkedin_url"):
        op.drop_column("site_settings", column)
