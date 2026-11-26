"""Add configurable Instagram username to site settings.

Revision ID: 20261125_0006
Revises: 20261118_0005
"""
from alembic import op
import sqlalchemy as sa

revision = "20261125_0006"
down_revision = "20261118_0005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "site_settings",
        sa.Column("instagram_username", sa.String(length=30), server_default="", nullable=False),
    )


def downgrade():
    op.drop_column("site_settings", "instagram_username")
