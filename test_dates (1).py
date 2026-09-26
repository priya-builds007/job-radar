import unittest
from datetime import date
from radar.dates import date_group

class DateTests(unittest.TestCase):
    def test_disjoint_calendar_buckets(self):
        today = date(2026, 9, 25)  # Friday
        self.assertEqual(date_group("2026-09-25", today), "Today")
        self.assertEqual(date_group("2026-09-21", today), "This Week")
        self.assertEqual(date_group("2026-09-15", today), "This Month")
        self.assertEqual(date_group("2026-08-31", today), "Older")
        self.assertEqual(date_group(None, today), "Unknown date")
        self.assertEqual(date_group("2026-09-26", today), "Unknown date")

if __name__ == "__main__": unittest.main()
