"""Bounded real-job crawler. Run with `python -m radar.crawl`. No sample rows."""
import argparse
import hashlib
import json
import logging
import math
import numpy as np
import os
import re
import sys
import tempfile
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import pandas as pd
from jobspy import scrape_jobs
from radar.__main__ import ROOT, load_config

LOG = logging.getLogger("job-radar")
OUTPUT = ROOT / "data" / "jobs.json"


def text(value):
    if value is None or isinstance(value, float) and math.isnan(value):
        return ""
    result = str(value).strip()
    return "" if result.lower() in {"none", "nan", "nat", "<na>"} else result


def valid_url(value):
    raw = text(value)
    try:
        parsed = urlsplit(raw)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
            return ""
        host = parsed.hostname.lower()
        if host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".local"):
            return ""
        query = urlencode(sorted((k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
                               if not k.lower().startswith("utm_") and k.lower() not in {"fbclid", "gclid"}))
        return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path.rstrip("/") or "/", query, ""))
    except ValueError:
        return ""


def posted_date(value):
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (datetime, date)):
        return value.date().isoformat() if isinstance(value, datetime) else value.isoformat()
    raw = text(value)
    if not raw:
        return None
    try:
        # Do not guess ambiguous dates (e.g. 03/04/2026). ISO dates only.
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
            return date.fromisoformat(raw).isoformat()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})", raw):
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        pass
    return None


def normalize(row):
    source = text(row.get("site")).lower()
    link = valid_url(row.get("job_url"))
    title = text(row.get("title"))
    if not title or not link:
        return None
    source_id = text(row.get("id"))
    # A board's identifier is stable across search queries. Fall back to canonical URL.
    key = f"{source}:{source_id}" if source and source_id else link
    remote_raw = row.get("is_remote")
    remote = None if remote_raw is None or pd.isna(remote_raw) else bool(remote_raw) if isinstance(remote_raw, (bool, np.bool_)) else None
    return {
        "id": hashlib.sha256(key.encode()).hexdigest()[:20],
        "source": source,
        "source_id": source_id,
        "title": title,
        "company": text(row.get("company")),
        "location": text(row.get("location")),
        "date_posted": posted_date(row.get("date_posted")),
        "job_type": text(row.get("job_type")),
        "is_remote": remote,
        "job_url": link,
        "description": text(row.get("description")),
    }


def merge_record(old, new):
    """Keep useful older fields when a later crawl omits them; never invent fields."""
    merged = dict(old)
    for key, value in new.items():
        if value is not None and value != "":
            merged[key] = value
    return merged


def load_existing(path):
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("jobs"), list):
        raise ValueError(f"Invalid existing jobs format: {path}")
    return payload["jobs"]


def write_atomic(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == body:
        return False
    fd, name = tempfile.mkstemp(prefix=".jobs-", suffix=".json", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            out.write(body)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)
    return True


def crawl(output=OUTPUT, max_searches=None, boards_override=None, sleep_seconds=8):
    config = load_config("searches.json")
    searches = config["searches"][:max_searches] if max_searches is not None else config["searches"]
    boards = boards_override or config["boards"]
    wanted = config["results_per_board_per_search"]
    existing = load_existing(output)
    unique = {item["id"]: item for item in existing if isinstance(item, dict) and item.get("id")}
    canonical_urls = {item.get("job_url"): job_id for job_id, item in unique.items() if item.get("job_url")}
    successes = failures = new_count = 0
    for index, search in enumerate(searches):
        for board in boards:
            LOG.info("Search %s/%s: %s | %s | %s (up to %s)", index + 1, len(searches), board, search["term"], search["location"], wanted)
            try:
                frame = scrape_jobs(site_name=[board], search_term=search["term"], location=search["location"],
                                    country_indeed="India", results_wanted=wanted, verbose=0)
                successes += 1
                if not isinstance(frame, pd.DataFrame):
                    raise TypeError("JobSpy returned a non-DataFrame result")
                LOG.info("Returned %d listings", len(frame))
                if frame.empty:
                    LOG.warning("No listings from %s for this query; this is not proof the board is accessible", board)
                for row in frame.to_dict("records"):
                    item = normalize(row)
                    if item:
                        # A changed source ID may still resolve to a URL already stored.
                        old_id = canonical_urls.get(item["job_url"])
                        if old_id and old_id != item["id"]:
                            old = unique.pop(old_id)
                            item = merge_record(old, item)
                        if item["id"] not in unique:
                            new_count += 1
                        item = merge_record(unique[item["id"]], item) if item["id"] in unique else item
                        unique[item["id"]] = item
                        canonical_urls[item["job_url"]] = item["id"]
            except Exception:
                failures += 1
                LOG.exception("Search failed; continuing with other boards")
            if sleep_seconds and not (index == len(searches) - 1 and board == boards[-1]):
                time.sleep(sleep_seconds)
    # Do not wipe existing real data if every request fails or returns empty.
    if not unique:
        LOG.warning("No usable real listings; no data file written. Check board access and queries.")
        return 1
    if successes == 0:
        LOG.error("Every board query failed; data unchanged")
        return 1
    # Store all valid crawled listings, not yet 'relevant' jobs.
    # No scrape timestamp is used as a posting date. Sorting by explicit date only.
    jobs = sorted(unique.values(), key=lambda x: (x.get("date_posted") or "", x.get("id") or ""), reverse=True)
    changed = write_atomic(output, {"schema_version": 1, "jobs": jobs})
    LOG.info("Complete: %d usable jobs, %d new, %d failed searches, data %s: %s",
             len(jobs), new_count, failures, "updated" if changed else "unchanged", output)
    return 0 if failures == 0 else 2


def main():
    parser = argparse.ArgumentParser(description="Fetch actual JobSpy listings to JSON")
    parser.add_argument("--max-searches", type=int, help="Limit number of configured queries for a local smoke test")
    parser.add_argument("--boards", nargs="+", choices=["indeed", "linkedin", "glassdoor"], help="Override configured boards")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--sleep-seconds", type=float, default=8, help="Pause between requests, default 8 seconds")
    args = parser.parse_args()
    if args.max_searches is not None and args.max_searches < 1 or args.sleep_seconds < 0:
        parser.error("--max-searches must be >=1 and sleep >=0")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        return crawl(args.output, args.max_searches, args.boards, args.sleep_seconds)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        LOG.error("Crawler stopped without overwriting data: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())