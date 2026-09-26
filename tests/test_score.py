from radar.score import score


def test_internship_is_relevant():
    job = {
        "title": "Python Developer Intern",
        "description": "Python, HTML and Firebase",
        "location": "Coimbatore",
        "job_type": "Internship",
        "is_remote": False,
    }

    result = score(job)

    assert result["relevant"] is True
    assert result["score"] > 0


def test_senior_role_is_not_relevant():
    job = {
        "title": "Senior Python Developer",
        "description": "Python developer",
        "location": "Coimbatore",
        "job_type": "Full-time",
        "is_remote": False,
    }

    result = score(job)

    assert result["relevant"] is False
    assert result["score"] == 0