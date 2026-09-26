import unittest
from radar.score import detect_skills, score


class ScoringTests(unittest.TestCase):
    def test_evidence_and_role_location(self):
        job = {"title": "Python Developer Intern", "description": "Build with Python, HTML, JavaScript and Firebase.",
               "location": "Chennai, Tamil Nadu, India", "is_remote": False, "job_type": "internship"}
        result = score(job)
        self.assertTrue(result["relevant"])
        self.assertEqual(result["matched_skills"], ["Python", "HTML", "JavaScript", "Firebase"])
        self.assertEqual(result["score"], 90)
        self.assertEqual(sum(result["score_breakdown"].values()), result["score"])

    def test_no_java_from_javascript_and_no_c_from_generic_text(self):
        self.assertEqual(detect_skills({"title": "JavaScript developer", "description": "create docs"}), ["JavaScript"])
        self.assertEqual(detect_skills({"description": r"Requires C\# and .NET", "title": ".NET Developer Intern"}), [])
        self.assertFalse(score({"title": "Senior Python Developer", "location": "India"})["relevant"])
        self.assertFalse(score({"title": "UI/UX Designer", "description": "Python", "location": "India"})["relevant"])
        self.assertFalse(score({"title": "Python Intern", "location": "London"})["relevant"])


if __name__ == "__main__":
    unittest.main()
