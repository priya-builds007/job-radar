import unittest
from radar.__main__ import load_config


class SetupTests(unittest.TestCase):
    def test_profile_is_real_and_configured(self):
        profile = load_config("profile.json")
        self.assertEqual(profile["name"], "Priyanka")
        self.assertIn("Python", profile["skills"])
        self.assertIn("Remote", profile["locations"])

    def test_searches_are_bounded_and_local(self):
        config = load_config("searches.json")
        self.assertTrue(set(config["boards"]) <= {"indeed", "linkedin", "glassdoor"})
        self.assertLessEqual(config["results_per_board_per_search"], 10)
        self.assertTrue(all(x.get("term") and x.get("location") for x in config["searches"]))


if __name__ == "__main__":
    unittest.main()
