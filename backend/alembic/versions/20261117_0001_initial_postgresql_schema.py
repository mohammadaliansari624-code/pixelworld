"""Create the Pixel Wrld application schema.

Revision ID: 20261117_0001
Revises:
Create Date: 2026-11-17
"""
from alembic import op
import sqlalchemy as sa

revision = "20261117_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "admins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
    )
    op.create_index("ix_admins_email", "admins", ["email"], unique=True)

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("category", sa.String(length=80), server_default="Other", nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("video_url", sa.String(length=1000), server_default="", nullable=False),
        sa.Column("thumbnail_url", sa.String(length=1000), server_default="", nullable=False),
        sa.Column("featured", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
    )

    op.create_table(
        "team_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("role", sa.String(length=180), server_default="", nullable=False),
        sa.Column("bio", sa.Text(), server_default="", nullable=False),
        sa.Column("photo_url", sa.String(length=1000), server_default="", nullable=False),
        sa.Column("social_url", sa.String(length=1000), server_default="", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
    )

    op.create_table(
        "site_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("studio_name", sa.String(length=180), server_default="PIXEL WRLD", nullable=False),
        sa.Column("tagline", sa.String(length=255), server_default="Stories in motion.", nullable=False),
        sa.Column("bio", sa.Text(), server_default="An independent creative studio shaping stories frame by frame.", nullable=False),
        sa.Column("email", sa.String(length=255), server_default="", nullable=False),
        sa.Column("phone", sa.String(length=80), server_default="", nullable=False),
        sa.Column("location", sa.String(length=255), server_default="", nullable=False),
        sa.Column("whatsapp_number", sa.String(length=30), server_default="+919503898739", nullable=False),
        sa.Column("booking_message", sa.Text(), server_default="Hi Pixel Wrld! I would like to book a video editing project. Please share your services, pricing, and availability.", nullable=False),
        sa.Column("instagram_url", sa.String(length=1000), server_default="", nullable=False),
        sa.Column("facebook_url", sa.String(length=1000), server_default="", nullable=False),
        sa.Column("youtube_url", sa.String(length=1000), server_default="", nullable=False),
    )


def downgrade():
    op.drop_table("site_settings")
    op.drop_table("team_members")
    op.drop_table("projects")
    op.drop_index("ix_admins_email", table_name="admins")
    op.drop_table("admins")
