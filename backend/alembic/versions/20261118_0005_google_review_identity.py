"""Store verified Google identity for customer reviews.

Revision ID: 20261118_0005
Revises: 20261118_0004
"""
from alembic import op
import sqlalchemy as sa

revision = "20261118_0005"
down_revision = "20261118_0004"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("reviews", sa.Column("google_sub", sa.String(length=255), server_default="", nullable=False))
    op.add_column("reviews", sa.Column("customer_email", sa.String(length=255), server_default="", nullable=False))
    op.create_index("ix_reviews_google_sub", "reviews", ["google_sub"], unique=False)

def downgrade():
    op.drop_index("ix_reviews_google_sub", table_name="reviews")
    op.drop_column("reviews", "customer_email")
    op.drop_column("reviews", "google_sub")
