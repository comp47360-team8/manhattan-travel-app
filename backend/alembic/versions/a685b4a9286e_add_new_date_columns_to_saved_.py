"""Add new date columns to saved_itineraries and itinerary_stops

Revision ID: a685b4a9286e
Revises: 9940cf707f25
Create Date: 2026-07-09 02:46:32.820412

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a685b4a9286e'
down_revision: Union[str, Sequence[str], None] = '9940cf707f25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Postgres rejects ADD COLUMN ... NOT NULL on a table that already holds rows,
    so every new column is added nullable, backfilled, then constrained.
    """
    # visit_date replaces `dates`; copy the values over before dropping it,
    # otherwise existing stops lose their date.
    op.add_column('itinerary_stops', sa.Column('visit_date', sa.Date(), nullable=True))
    op.add_column('itinerary_stops', sa.Column('hero_image_url', sa.Text(), nullable=True))
    op.execute('UPDATE itinerary_stops SET visit_date = dates WHERE visit_date IS NULL')
    op.execute("UPDATE itinerary_stops SET hero_image_url = '' WHERE hero_image_url IS NULL")
    op.alter_column('itinerary_stops', 'visit_date', nullable=False)
    op.alter_column('itinerary_stops', 'hero_image_url', nullable=False)
    op.drop_column('itinerary_stops', 'dates')

    # Itineraries saved before this revision predate the start/end date fields.
    # saved_at is the only date they carry, so it stands in for both.
    op.add_column('saved_itineraries', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('saved_itineraries', sa.Column('end_date', sa.Date(), nullable=True))
    op.execute(
        'UPDATE saved_itineraries '
        'SET start_date = saved_at::date, end_date = saved_at::date '
        'WHERE start_date IS NULL'
    )
    op.alter_column('saved_itineraries', 'start_date', nullable=False)
    op.alter_column('saved_itineraries', 'end_date', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('saved_itineraries', 'end_date')
    op.drop_column('saved_itineraries', 'start_date')

    op.add_column('itinerary_stops', sa.Column('dates', sa.DATE(), nullable=True))
    op.execute('UPDATE itinerary_stops SET dates = visit_date WHERE dates IS NULL')
    op.alter_column('itinerary_stops', 'dates', nullable=False)
    op.drop_column('itinerary_stops', 'hero_image_url')
    op.drop_column('itinerary_stops', 'visit_date')
