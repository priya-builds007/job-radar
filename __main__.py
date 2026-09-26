"""Local setup check. No network requests or job data are produced in Phase 1."""
import argparse
import json
from importlib import metadata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_config(name):
    return json.loads(
        (ROOT / "config" / name).read_text(encoding="utf-8")
    )


def doctor(skip_dependencies=False):
    profile = load_config("profile.json")
    searches = load_config("searches.json")

    for field in ("skills", "roles", "locations"):
        if not isinstance(profile.get(field), list) or not profile[field]:
            raise ValueError(
                f"Profile {field} must be a nonempty list"
            )

    if not searches.get("boards") or not searches.get("searches"):
        raise ValueError(
            "Search boards and searches must be configured"
        )

    for item in searches["searches"]:
        if not item.get("term") or not item.get("location"):
            raise ValueError(
                "Each search needs term and location"
            )

    print(
        f"Profile: {profile['name']} | "
        f"{len(profile['skills'])} skills | "
        f"{len(profile['roles'])} target roles"
    )

    print(
        f"Search plan: {len(searches['searches'])} searches "
        f"across {', '.join(searches['boards'])}"
    )

    if not skip_dependencies:
        missing = []

        for name in ("python-jobspy", "pandas"):
            try:
                print(f"{name}: {metadata.version(name)}")
            except metadata.PackageNotFoundError:
                missing.append(name)

        if missing:
            raise RuntimeError(
                "Missing dependencies: "
                + ", ".join(missing)
                + ". Run: python -m pip install -r requirements.txt"
            )

    print(
        "Phase 1 setup OK. No jobs collected yet; "
        "next: build JobSpy crawler."
    )


def main():
    parser = argparse.ArgumentParser(
        description="Mentor Surprise Job Radar"
    )

    parser.add_argument(
        "command",
        choices=["doctor"]
    )

    parser.add_argument(
        "--skip-dependencies",
        action="store_true",
        help="Check configuration only"
    )

    args = parser.parse_args()

    try:
        doctor(
            skip_dependencies=args.skip_dependencies
        )
    except (
        OSError,
        ValueError,
        json.JSONDecodeError,
        RuntimeError
    ) as exc:
        parser.exit(
            1,
            f"Setup check failed: {exc}\n"
        )


if __name__ == "__main__":
    main()