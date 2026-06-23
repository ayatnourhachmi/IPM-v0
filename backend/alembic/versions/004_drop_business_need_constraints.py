"""Drop unused constraints column from business_needs.

Revision ID: 004
Revises: 003
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("business_needs", "constraints")


def downgrade() -> None:
    op.add_column(
        "business_needs",
        sa.Column("constraints", postgresql.JSONB(), nullable=True),
    )
