"""Add poi_photo_cache table

Shared, persistent cache of resolved Google Places photo URLs (see
app/services/photo_service.py). Keyed by Google place_id, no FK to poi — it is a
cache of an external identifier. Creating a fresh empty table, so nothing to
backfill and no NOT-NULL-on-populated-table hazard.

Revision ID: c7d41ea9b2f0
Revises: 499282be7f0b
Create Date: 2026-07-22 21:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d41ea9b2f0'
down_revision: Union[str, Sequence[str], None] = '499282be7f0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'poi_photo_cache',
        sa.Column('place_id', sa.String(length=255), nullable=False),
        sa.Column('photo_uri', sa.Text(), nullable=False),
        sa.Column(
            'fetched_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('place_id'),
    )


def downgrade() -> None:
    op.drop_table('poi_photo_cache')
