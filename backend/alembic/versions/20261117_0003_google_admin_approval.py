"""Add Google authentication and owner-controlled admin approval.

Revision ID: 20261117_0003
Revises: 20261117_0002
"""
from alembic import op
import sqlalchemy as sa

revision = "20261117_0003"
down_revision = "20261117_0002"
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column("admins", "password_hash", existing_type=sa.String(length=255), nullable=True)
    op.add_column("admins", sa.Column("google_sub", sa.String(length=255), nullable=True))
    op.add_column("admins", sa.Column("is_active", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("admins", sa.Column("is_super_admin", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.create_index("ix_admins_google_sub", "admins", ["google_sub"], unique=True)
    op.create_table(
        "admin_access_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("google_sub", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), server_default="", nullable=False),
        sa.Column("picture", sa.String(length=1000), server_default="", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_admin_access_requests_email", "admin_access_requests", ["email"], unique=True)
    op.create_index("ix_admin_access_requests_status", "admin_access_requests", ["status"], unique=False)

def downgrade():
    op.drop_index("ix_admin_access_requests_status", table_name="admin_access_requests")
    op.drop_index("ix_admin_access_requests_email", table_name="admin_access_requests")
    op.drop_table("admin_access_requests")
    op.drop_index("ix_admins_google_sub", table_name="admins")
    op.drop_column("admins", "is_super_admin")
    op.drop_column("admins", "is_active")
    op.drop_column("admins", "google_sub")
    op.alter_column("admins", "password_hash", existing_type=sa.String(length=255), nullable=False)
