"""Non-overlapping date categories, based on the viewer's local calendar day."""
from datetime import date, timedelta


def date_group(posted, today=None):
    today = today or date.today()
    if not posted:
        return "Unknown date"
    try:
        day = date.fromisoformat(str(posted))
    except ValueError:
        return "Unknown date"
    if day > today:
        return "Unknown date"
    if day == today:
        return "Today"
    # This Week means current calendar week, Monday through Sunday.
    if day >= today - timedelta(days=today.weekday()):
        return "This Week"
    if day.year == today.year and day.month == today.month:
        return "This Month"
    return "Older"
