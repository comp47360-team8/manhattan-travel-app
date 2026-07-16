"""merge migration heads

Revision ID: 499282be7f0b
Revises: 2fec5a444af7, d3f0a9c71b24
Create Date: 2026-07-15 10:06:14.420496

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '499282be7f0b'
down_revision: Union[str, Sequence[str], None] = ('2fec5a444af7', 'd3f0a9c71b24')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
