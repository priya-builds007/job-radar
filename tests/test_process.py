import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

from radar.process import process


class ProcessingTests(unittest.TestCase):
    def test_filters_old_senior_and_duplicates_and_keeps_unknown_date(self):
        base = {"id": "1", "source": "indeed", "job_url": "https://example.com/jobs/1", "title": "Python Developer Intern",
                "description": "Python and Firebase", "location": "Chennai, India", "is_remote": False, "job_type": "internship", "date_posted": None}
        jobs = [base, dict(base), {**base, "id": "2", "job_url": "https://example.com/jobs/2", "title": "Senior Python Developer"},
                {**base, "id": "3", "job_url": "https://example.com/jobs/3", "date_posted": "2025-01-01"}]
        with tempfile.TemporaryDirectory() as tmp:
            inp, out = Path(tmp) / "raw.json", Path(tmp) / "processed.json"
            inp.write_text(json.dumps({"schema_version": 1, "jobs": jobs}))
            self.assertEqual(process(inp, out, date(2026, 9, 25)), 0)
            first = out.read_bytes()
            self.assertEqual(process(inp, out, date(2026, 9, 25)), 0)
            self.assertEqual(out.read_bytes(), first)
            selected = json.loads(first)["jobs"]
            self.assertEqual(len(selected), 1)
            self.assertIsNone(selected[0]["date_posted"])
            self.assertIn("Python", selected[0]["matched_skills"])


if __name__ == "__main__":
    unittest.main()
