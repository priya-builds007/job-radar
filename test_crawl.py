import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from radar.crawl import crawl, load_existing, normalize, posted_date, valid_url


class CrawlerTests(unittest.TestCase):
    def test_normalizes_realistic_values_without_making_up_dates(self):
        row = {"id": "in-123", "site": "indeed", "job_url": "https://in.indeed.com/viewjob?jk=123&utm_source=mail",
               "title": "Python Intern", "company": "Example company", "date_posted": None, "is_remote": False}
        job = normalize(row)
        self.assertEqual(job["date_posted"], None)
        self.assertEqual(job["is_remote"], False)
        self.assertEqual(job["job_url"], "https://in.indeed.com/viewjob?jk=123")
        self.assertIsNone(normalize({**row, "job_url": "javascript:alert(1)"}))
        self.assertIsNone(posted_date("04/03/2026"))
        self.assertEqual(posted_date("2026-09-24"), "2026-09-24")
        self.assertEqual(valid_url("https://example.com/abc#detail"), "https://example.com/abc")

    def test_success_merges_without_duplicates_and_failure_preserves_data(self):
        import pandas as pd
        listing = {"id": "real-1", "site": "indeed", "job_url": "https://in.indeed.com/viewjob?jk=real1",
                   "title": "Developer Intern", "company": "Company", "date_posted": "2026-09-24"}
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "jobs.json"
            with patch("radar.crawl.scrape_jobs", return_value=pd.DataFrame([listing])):
                self.assertEqual(crawl(path, max_searches=1, boards_override=["indeed"], sleep_seconds=0), 0)
                self.assertEqual(crawl(path, max_searches=1, boards_override=["indeed"], sleep_seconds=0), 0)
            self.assertEqual(len(load_existing(path)), 1)
            old = path.read_bytes()
            with patch("radar.crawl.scrape_jobs", side_effect=RuntimeError("blocked")):
                self.assertEqual(crawl(path, max_searches=1, boards_override=["indeed"], sleep_seconds=0), 1)
            self.assertEqual(path.read_bytes(), old)


if __name__ == "__main__":
    unittest.main()
