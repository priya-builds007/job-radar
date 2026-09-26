"""Explainable evidence-based scoring. No external AI calls or inferred skills."""
import re

# Only user-provided skills; abbreviations use guarded regex so C/Java don't
# match arbitrary prose or JavaScript. Job titles are checked independently.
SKILLS = {
    "C++": r"(?<![a-z0-9])c\+\+(?![a-z0-9])",
    "C": r"(?<![a-z0-9+#])c(?![a-z0-9+\#])(?:\s+language|\s+programming|\s*/\s*c\+\+)?",
    "Java": r"(?<![a-z])java(?![a-z])",
    "Python": r"\bpython\b", "HTML": r"\bhtml\b", "CSS": r"\bcss\b",
    "JavaScript": r"\b(?:javascript|java\s*script|js)\b",
    "Firebase": r"\bfirebase\b",
    "Real-Time Database": r"\b(?:real[ -]?time database|firebase realtime database|rtdb)\b",
    "IoT fundamentals": r"\b(?:iot|internet of things)\b",
    "Embedded Systems": r"\bembedded(?:\s+systems?|\s+software)?\b",
}
ROLE_PATTERN = re.compile(r"\b(?:software|web|python|java|full[ -]?stack|front[ -]?end|back[ -]?end|frontend|backend|embedded|iot|developer|programmer|sde)\b", re.I)
SENIOR_PATTERN = re.compile(r"\b(?:senior|sr\.?|lead|principal|staff|manager|architect|\d+\+?\s*(?:to\s*\d+\s*)?years?\s+(?:of\s+)?experience)\b", re.I)
INTERNSHIP_PATTERN = re.compile(r"\b(?:intern(?:ship)?|trainee|fresher|entry[ -]?level|graduate)\b", re.I)
LOCATION_PATTERN = re.compile(r"\b(?:india|\bin\b|tamil nadu|\btn\b|coimbatore|chennai|bengaluru|bangalore|karnataka|\bka\b)\b", re.I)


def detect_skills(job):
    text = " ".join(str(job.get(k) or "") for k in ("title", "description"))
    text = re.sub(r"\\(?=[#+])", "", text)  # JobSpy Markdown escapes C\# and C\+\+.
    return [skill for skill, pattern in SKILLS.items() if re.search(pattern, text, re.I)]


def score(job):
    title = str(job.get("title") or "")
    description = str(job.get("description") or "")
    location = str(job.get("location") or "")
    remote = job.get("is_remote") is True
    matched = detect_skills(job)
    role = bool(ROLE_PATTERN.search(title))
    senior = bool(SENIOR_PATTERN.search(title))
    early = bool(INTERNSHIP_PATTERN.search(title)) or "internship" in str(job.get("job_type") or "").lower()
    location_match = bool(LOCATION_PATTERN.search(location)) or remote
    # No result should be called relevant based solely on a broad location or
    # mentioned skills. A role, suitable level, and geography are required.
    eligible = role and early and not senior and location_match
    points = {
        "target_role": 35 if role else 0,
        "student_level": 20 if early else 0,
        "skills": min(len(matched), 4) * 5,
        "preferred_location": 15 if location_match else 0,
        "remote": 10 if remote else 0,
    }
    why = []
    if role:
        why.append("Target role detected in title")
    if early:
        why.append("Internship, fresher or entry-level cue detected")
    if matched:
        why.append("Skills in title/description: " + ", ".join(matched))
    if location_match:
        why.append("Remote" if remote else "Preferred geography from source location: " + location)
    if not description:
        why.append("Description unavailable; skill evidence may be incomplete")
    if senior:
        why.append("Senior-level title excluded")
    if not role:
        why.append("Target software/IoT role not detected in title")
    if not early:
        why.append("Student-level opportunity not confirmed from title or job type")
    if not location_match:
        why.append("Preferred location or remote status not confirmed")
    return {"relevant": eligible, "score": sum(points.values()) if eligible else 0,
            "score_breakdown": points, "matched_skills": matched, "reasons": why}


def enrich(jobs):
    return [{**job, **score(job)} for job in jobs]
