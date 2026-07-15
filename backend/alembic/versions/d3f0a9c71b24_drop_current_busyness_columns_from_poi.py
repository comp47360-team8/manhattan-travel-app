"""Drop current_busyness columns from poi

Live/predicted crowd level is now served entirely from poi_busyness_forecast
(source='model' | 'google_popular_times'); the poi.current_busyness snapshot
columns are redundant and dropped here.

Revision ID: d3f0a9c71b24
Revises: 9cac4d83b44f
Create Date: 2026-07-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd3f0a9c71b24'
down_revision: Union[str, Sequence[str], None] = '9cac4d83b44f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('poi', 'current_busyness_at')
    op.drop_column('poi', 'current_busyness')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        'poi',
        sa.Column(
            'current_busyness',
            postgresql.ENUM(
                'quiet', 'moderate', 'busy', 'very_busy',
                name='busyness_level', create_type=False,
            ),
            nullable=True,
        ),
    )
    op.add_column(
        'poi',
        sa.Column('current_busyness_at', sa.DateTime(timezone=True), nullable=True),
    )
