"""Date helpers for Job Radar."""

from datetime import date, datetime


def parse_date(value):
    if not value:
        return None

    if isinstance(value, date):
        return value

    try:
        return datetime.fromisoformat(str(value)).date()
    except ValueError:
        return None


def days_old(value):
    parsed = parse_date(value)

    if parsed is None:
        return None

    return (date.today() - parsed).days