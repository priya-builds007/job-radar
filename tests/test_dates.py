from datetime import date

from radar.dates import date_group


def test_today():
    assert date_group("2026-09-26", date(2026, 9, 26)) == "Today"


def test_this_week():
    assert date_group("2026-09-24", date(2026, 9, 26)) == "This Week"


def test_this_month():
    assert date_group("2026-09-10", date(2026, 9, 26)) == "This Month"


def test_older():
    assert date_group("2026-08-01", date(2026, 9, 26)) == "Older"


def test_unknown_date():
    assert date_group("not-a-date", date(2026, 9, 26)) == "Unknown date"