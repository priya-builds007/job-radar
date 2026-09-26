"""Clean real crawled records with Pandas; keep raw and processed data separate."""
import argparse
import json
import logging
import sys
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from radar.__main__ import ROOT
from radar.crawl import OUTPUT, load_existing, valid_url, write_atomic
from radar.score import enrich


PROCESSED = ROOT / "data" / "processed_jobs.json"
LOG = logging.getLogger("job-radar")


def process(source=OUTPUT, destination=PROCESSED, today=None):
    raw = load_existing(source)

    if not raw:
        LOG.warning(
            "No real crawled jobs found; run `python -m radar.crawl` first. "
            "No processed file written."
        )
        return 1

    today = today or date.today()

    frame = pd.DataFrame(raw)

    mandatory = {"id", "title", "job_url"}

    if not mandatory <= set(frame.columns):
        LOG.error(
            "Raw job schema missing required fields: %s",
            sorted(mandatory - set(frame.columns)),
        )
        return 1

    frame = frame.dropna(
        subset=["id", "title", "job_url"]
    )

    frame = frame.drop_duplicates(
        subset=["id"],
        keep="last"
    )

    frame = frame[
        frame["job_url"].map(
            lambda url: bool(valid_url(url))
        )
    ]

    frame = frame.drop_duplicates(
        subset=["job_url"],
        keep="last"
    )

    cutoff = today - timedelta(days=90)

    def recent(value):
        if value is None or pd.isna(value) or value == "":
            return True

        try:
            day = date.fromisoformat(str(value))
            return cutoff <= day <= today
        except ValueError:
            return False

    date_series = frame.get(
        "date_posted",
        pd.Series([None] * len(frame), index=frame.index)
    )

    frame = frame[
        date_series.map(recent)
    ]

    enriched = enrich(
        frame.to_dict("records")
    )

    relevant = [
        job
        for job in enriched
        if job["relevant"]
    ]

    relevant.sort(
        key=lambda job: (
            job.get("date_posted") or "",
            job["score"],
            job["id"],
        ),
        reverse=True,
    )

    payload = {
        "schema_version": 1,
        "jobs": relevant,
    }

    changed = write_atomic(
        destination,
        payload
    )

    LOG.info(
        "Processed %d raw -> %d eligible; %s %s",
        len(raw),
        len(relevant),
        "updated" if changed else "unchanged",
        destination,
    )

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Process actual JobSpy jobs"
    )

    parser.add_argument(
        "--input",
        type=Path,
        default=OUTPUT,
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=PROCESSED,
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(message)s",
    )

    try:
        return process(
            args.input,
            args.output
        )

    except (
        OSError,
        ValueError,
        json.JSONDecodeError,
    ) as exc:
        LOG.error(
            "Processing failed without overwriting previous output: %s",
            exc,
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())