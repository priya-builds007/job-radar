# Mentor Surprise - Job Radar

A personal job tracker for Priyanka's stated skills, target roles and locations. The goal is real JobSpy data, explainable relevance, a date-wise searchable dashboard, and daily collection. **Local Phases 1-7 are built and tested. The GitHub repository, public Vercel URL and daily automation are not yet done.**

## Architecture

Job boards -> JobSpy -> Python/Pandas cleanup -> JSON storage (`data/jobs.json`) -> static HTML/CSS/JS dashboard (`web/`) -> GitHub -> Vercel. A scheduled GitHub Actions job will later refresh the JSON and commit a changed file, which will trigger a Vercel deployment. No Vercel runtime scraper or database is needed for the first version.

JSON is simplest for a small personal tracker: a crawler replaces/merges one structured file, and a static site fetches it. SQLite would add a build/export step for a static frontend. We will revisit this if the dataset grows. Phase 1 creates no job records.

## Structure

```text
mentor-surprise-job-radar/
  radar/                  # Python module: crawler, cleanup, scoring, date groups
  config/profile.json     # Priyanka's exact skills, roles, locations
  config/searches.json    # Bounded initial role/location/board searches
  data/jobs.json           # real raw crawl snapshot; processed_jobs.json is scored
  web/                    # static dashboard source
  tests/test_setup.py     # config/setup tests
  .github/workflows/      # daily workflow not configured yet
  requirements.txt        # JobSpy, pandas
  .env.example            # no secrets needed yet
  .gitignore
```

## Phase 1: local setup

Install Python 3.11 and Git. In a terminal, from this project folder:

**macOS/Linux**
```sh
python3 --version
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m radar doctor
python -m unittest discover -s tests -v
```

**Windows PowerShell**
```powershell
py -3.11 --version
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m radar doctor
python -m unittest discover -s tests -v
```

If `py -3.11` is unavailable, install Python 3.11 first. The doctor prints the profile, search plan, dependency versions, then `Phase 1 setup OK`. Tests should say `OK`. To test configuration without installing dependencies: `python -m radar doctor --skip-dependencies`. Neither command contacts job boards. Change search scope in `config/searches.json`, not in source code.

## Why these dependencies?

`python-jobspy` will collect listings from supported boards; `pandas` will clean the DataFrame it returns. No frontend build tools are needed: plain HTML/CSS/JS will read generated JSON. Python 3.11 is a practical common version for both packages. The official JobSpy documentation lists the `scrape_jobs` entry point and per-board result limit: https://pypi.org/project/python-jobspy/ . pandas version requirements: https://pypi.org/project/pandas/ . The precise JobSpy API and board behavior will be checked again during Phase 2.

## Development plan and milestone checks

1. Structure and setup (this phase): config + dependency check, no fake jobs.
2. Crawl: bounded JobSpy searches and real local result, log failures and observe board restrictions.
3. Clean and store: normalize missing fields, links and dates, merge/deduplicate JSON.
4. Score and filter: documented role, skill, location, remote rules; show actual evidence and reject irrelevant/senior-only posts.
5. Group by posting date: Today, This Week, This Month, Older; unknown dates stay explicitly unknown.
6. Dashboard: real records, mobile cards and source links; truthful empty state.
7. Search and filters: text, location, type, remote, score, date and sorting.
8. GitHub: publish the verified project, no credentials.
9. Vercel: deploy and verify a public URL with live collected data.
10. GitHub Actions: manual + daily job with changed-data commits and useful failure logs. Confirm Vercel updates.
11. Done check: run crawler, tests, visual + functional checks, public URL, real data, workflow history.

Each phase must pass its tests before the next is called done. Deployment and automation require Priyanka's GitHub and Vercel accounts. A connected GitHub account alone does not imply Vercel access. Until the public site and real data are checked, this project is **in progress**.

## JobSpy and responsible use

The initial plan requests at most 10 results per board per search across six targeted searches. It is only a proposal: during Phase 2 inspect actual return rates, failures and each board's applicable terms, and reduce/disable searches when restricted. Do not bypass login, CAPTCHAs, paywalls, blocks or rate limits. Some boards may be unavailable or return no descriptions; neither a successful import nor an empty search proves the feed works. No fake fallback data is permitted.

## Future scoring and date policy

Phase 1 did not score jobs. Phase 4 now cites detected title/description tokens and source location or remote metadata with a weight breakdown. Missing evidence never produces a claimed skill match. A missing source posting date remains unknown, never the scrape date.

## Data, environment and limitations

`config/profile.json` contains the skills and preferences Priyanka supplied; don't invent experience. `data/jobs.json` is a local real listing snapshot, and `processed_jobs.json` has the scored subset. No keys or secrets are required for local collection. Keep any later secrets out of Git (`.env` ignored). Source links can expire or move; apply on the original board. JobSpy scrapes third-party sites that can change or block access. Automated daily availability is not guaranteed. A static public deployment will expose collected job metadata and the profile written into the site, so review that audience before publishing.

## Phase 2: real-data crawler (local smoke test verified)

The `radar/crawl.py` collector requests JobSpy results one board at a time, normalizes title/company/location/URL/date/type/remote/description, drops malformed or non-HTTP links, deduplicates by board ID, merges into `data/jobs.json`, and writes atomically. It leaves the previous JSON untouched if every board request fails or returns no usable listings. Missing posting date is `null`, not the crawl date. This raw collection is **not relevance filtering**; irrelevant jobs remain in `jobs.json`. Phase 4 scoring writes separately to `processed_jobs.json`.

Run a small initial test with your normal virtual environment:

```sh
python -m radar.crawl --max-searches 1 --boards indeed linkedin
python -m unittest discover -s tests -v
python -m json.tool data/jobs.json > /dev/null
```

Then inspect `data/jobs.json` and open a few `job_url` values in a browser. The collector returns exit code 0 if all requests execute, 2 if some raise errors while usable data is retained, and 1 if no new/previous data exists or all requests fail. Some boards may log errors and return an empty DataFrame rather than raise, so also inspect the logs and number of results for each board. Avoid automatic rapid retries; `--sleep-seconds` defaults to 8 seconds between requests. The full configured six-query, three-board sweep may take time and is not necessary to pass the Phase 2 smoke test. To run it later: `python -m radar.crawl`.

A live smoke test on September 25, 2026 retrieved 10 Indeed + 10 LinkedIn listings (20 actual posting URLs) using the first query. Glassdoor returned an HTTP 403 and zero rows; **do not circumvent the block or claim Glassdoor collection works**. The exact listings are a snapshot, can expire, and are not yet filtered or validated against Priyanka's experience. Glassdoor was disabled in `config/searches.json` after the 403. Phase 3 now excludes posts older than 90 days from processed output; raw JSON still needs a retention policy before daily automation grows it indefinitely.

## Phase 3: clean/store, and Phase 4: filter/score

`python -m radar.process` reads **real** `data/jobs.json`, drops duplicate board IDs and identical URLs, invalid links, dates older than 90 days, and future dates. It preserves undated posts as undated rather than inventing a day. Pandas handles table-level cleanup; then `radar/score.py` adds individual explanations. It writes `data/processed_jobs.json` atomically and only changes the file when the content changes. It never alters the raw evidence file. Missing fields are empty or `null`; merging repeated crawl results preserves older useful values if the newest board response omits them. This is the first filtered dataset, not proof that a link remains open or a role's fine print fits.

The simple score is capped at 100: +35 target software/web/IoT role **in title**, +20 explicit intern/fresher/entry-level cue in title or internship job type, +5 per supplied skill visibly in title or description (maximum four, 20 points), +15 confirmed India/preferred area **in location**, +10 if the board's remote field explicitly says true. Relevance requires target role, student-level cue, and preferred geography or explicit remote status; senior titles are excluded. Unknowns give no points, and every result stores `score_breakdown`, `matched_skills`, and human-readable `reasons`. This is a personal rule-of-thumb, **not a probability of being hired**. The role matching is intentionally conservative; titles without recognizable terms or listings with no location/remote flag are withheld for later manual review rather than portrayed as a match. A `C`/`Java` boundary check avoids claiming Java from JavaScript or C from C++.

Run, then inspect:

```sh
python -m radar.process
python -m unittest discover -s tests -v
python -m json.tool data/processed_jobs.json > /dev/null
```

On the September 25 real crawl snapshot, this yielded 11 candidate internships out of 20 raw listings. Job descriptions were unavailable for 10 raw listings, so some scored jobs have no detected skills; the explanations say so. The dashboard is built locally (Phases 6-7), but is not deployed. The Glassdoor board was disabled in `config/searches.json` after its HTTP 403; Indeed and LinkedIn remain enabled, without retries around restrictions. Source postings can change after collection. Before applying, read the live original posting carefully.

## Phase 5: date buckets

`radar/dates.py` defines non-overlapping categories relative to the viewer's calendar date: Today, then This Week (Monday onward, excluding Today), then This Month (excluding the current week), then Older. A missing, invalid, or future posting date is Unknown date, never rewritten to a scrape date. The client dashboard uses the same rules in JavaScript at view time so the categories stay current without rerunning the scraper overnight. Test with `python -m unittest discover -s tests -v`.

## Phases 6-7: local dashboard, search and filters

`web/index.html`, `web/styles.css`, and `web/app.js` now form a static dashboard that fetches generated `data/processed_jobs.json`. It shows a card for each real eligible job, source date, company (or honest missing-field label), location, job type, remote evidence, matched skills, score, reasons and original posting button. Search covers role/company/location/detected skill. Filters cover location, reported job type, remote flag, minimum score and date category; newest/oldest/score sorting and reset work locally. Cards use text nodes rather than HTML injection, and links are limited to HTTP(S). There are no fake cards. The `Unknown date` bucket preserves missing dates. Dashboard data is a crawl snapshot, not proof postings remain open. An original post can be edited after the crawl.

Start a local server from the **project root**, not `web/`, so the relative JSON URL resolves:

```sh
python -m radar.crawl --max-searches 1 --boards indeed linkedin    # optional refresh
python -m radar.process
python -m http.server 8000
```

Open `http://localhost:8000/web/` on your own computer. Try `Python` in search, `This Week` in date, `80+` score, `Confirmed remote`, a location, then Clear filters. Open one source link to verify it leads to the job board; source posts may expire. Run `python -m unittest discover -s tests -v` for backend tests. If data is absent or unavailable, the UI shows an error/empty state rather than sample jobs. For Vercel, later set output directory to the project root so `/web/` and `/data/processed_jobs.json` are both published, or add a verified routing config. It is **not deployed yet**.

The browser fetches `/data/processed_jobs.json` from the site root. Deployment routing and public URL remain a later phase; this local dashboard is not a Vercel deployment.
