"""Bounded JobSpy crawler for real job listings."""

import argparse
import json
import logging
import time
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
from jobspy import scrape_jobs

from radar.__main__ import ROOT, load_config

OUTPUT = ROOT / "data" / "jobs.json"
LOG = logging.getLogger("job-radar.crawl")


def valid_url(url):
    if not url:
        return False

    try:
        parsed = urlparse(str(url))
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def load_existing(path=OUTPUT):
    if not path.exists():
        return []

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))

        if isinstance(payload, dict):
            return payload.get("jobs", [])

        if isinstance(payload, list):
            return payload

    except (OSError, json.JSONDecodeError):
        LOG.warning("Could not read existing job data: %s", path)

    return []


def write_atomic(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)

    temporary = path.with_suffix(path.suffix + ".tmp")
    content = json.dumps(
        payload,
        indent=2,
        ensure_ascii=False,
        default=str,
    )

    temporary.write_text(content, encoding="utf-8")
    temporary.replace(path)

    return True


def normalise_job(row):
    job = {}

    for key, value in row.items():
        if pd.isna(value):
            value = None

        if hasattr(value, "item"):
            try:
                value = value.item()
            except Exception:
                pass

        job[key] = value

    title = str(job.get("title") or "").strip()
    company = str(job.get("company") or "").strip()
    location = str(job.get("location") or "").strip()
    job_url = str(job.get("job_url") or "").strip()

    job["title"] = title
    job["company"] = company
    job["location"] = location
    job["job_url"] = job_url

    if not job.get("id"):
        job["id"] = job_url or f"{title}|{company}|{location}"

    if "is_remote" not in job:
        job["is_remote"] = False

    return job


def crawl(sleep_seconds=8):
    config = load_config("searches.json")

    boards = config.get("boards", [])
    searches = config.get("searches", [])

    all_jobs = []

    for search in searches:
        term = search.get("term")
        location = search.get("location")

        if not term or not location:
            continue

        LOG.info(
            "Searching: %s | %s",
            term,
            location,
        )

        try:
            jobs = scrape_jobs(
                site_name=boards,
                search_term=term,
                location=location,
                results_wanted=10,
                hours_old=72,
                country_indeed="India",
                linkedin_fetch_description=True,
            )

            if jobs is not None and not jobs.empty:
                for _, row in jobs.iterrows():
                    job = normalise_job(row)

                    if valid_url(job.get("job_url")):
                        all_jobs.append(job)

        except Exception as exc:
            LOG.warning(
                "Search failed for %s / %s: %s",
                term,
                location,
                exc,
            )

        time.sleep(sleep_seconds)

    existing = load_existing()

    merged = {}

    for job in existing + all_jobs:
        job_id = job.get("id") or job.get("job_url")

        if job_id:
            merged[str(job_id)] = job

    jobs = list(merged.values())

    payload = {
        "schema_version": 1,
        "jobs": jobs,
    }

    write_atomic(OUTPUT, payload)

    LOG.info(
        "Crawled %d new records; stored %d total jobs in %s",
        len(all_jobs),
        len(jobs),
        OUTPUT,
    )

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Crawl real jobs using JobSpy"
    )

    parser.add_argument(
        "--sleep-seconds",
        type=int,
        default=8,
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(message)s",
    )

    try:
        return crawl(args.sleep_seconds)

    except Exception as exc:
        LOG.error("Crawler failed: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())