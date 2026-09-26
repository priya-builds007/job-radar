Mentor Surprise - Job Radar

A personal job tracker for Priyanka's stated skills, target roles and locations. The goal is real JobSpy data, explainable relevance, a date-wise searchable dashboard, and daily collection.

Current status: Local Phases 1-7 are built and tested. The GitHub repository has been created and the project is being prepared for public deployment through Vercel. Daily GitHub Actions automation is the remaining step.

Architecture

Job boards -> JobSpy -> Python/Pandas cleanup -> JSON storage ("data/jobs.json") -> scoring -> "data/processed_jobs.json" -> static HTML/CSS/JS dashboard ("web/") -> GitHub -> Vercel.

A scheduled GitHub Actions job will later refresh the JSON, run processing/tests, and commit a changed data file. A successful commit can then trigger a Vercel deployment.

No Vercel runtime scraper or database is needed for the first version.

JSON is simplest for a small personal tracker: a crawler replaces/merges one structured file, and a static site fetches it. SQLite would add a build/export step for a static frontend. This can be revisited if the dataset grows.

Structure

job-radar/
  radar/                  # Python module: crawler, cleanup, scoring, date groups
  config/profile.json     # Priyanka's exact skills, roles, locations
  config/searches.json    # Bounded role/location/board searches
  data/jobs.json          # Real raw crawl snapshot
  data/processed_jobs.json # Cleaned and scored job records
  web/                    # Static dashboard source
  tests/                  # Automated tests
  .github/workflows/      # Daily automation configuration
  requirements.txt        # JobSpy, pandas
  .env.example            # No secrets required for current version
  .gitignore

Phase 1: Local setup

Install Python 3.11 and Git. From the project folder:

macOS/Linux

python3 --version
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m radar doctor
python -m unittest discover -s tests -v

Windows PowerShell

py -3.11 --version
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m radar doctor
python -m unittest discover -s tests -v

The doctor checks the profile, search plan and dependency versions.

Phase 1 creates no fake job records.

Phase 2: Real-data crawler

The collector uses JobSpy to request supported job boards one board at a time.

It:

- normalizes title, company, location, URL, date, type, remote status and description
- removes malformed/non-HTTP links
- deduplicates records
- merges results into "data/jobs.json"
- writes the file atomically
- preserves the previous JSON if all requests fail

Missing posting dates remain "null"; the crawl date is never substituted.

A small smoke test can be run with:

python -m radar.crawl --max-searches 1 --boards indeed linkedin
python -m unittest discover -s tests -v
python -m json.tool data/jobs.json > /dev/null

The crawler does not bypass login pages, CAPTCHAs, blocks, paywalls or rate limits.

Real crawl result

A live smoke test on September 25, 2026 retrieved:

- 10 Indeed listings
- 10 LinkedIn listings
- 20 actual posting URLs in total

Glassdoor returned HTTP 403 and zero usable rows. It was therefore disabled in "config/searches.json".

The Glassdoor restriction was not bypassed.

The collected listings are only a snapshot. A successful crawl does not guarantee that a job is still open.

Phase 3: Clean and store

"python -m radar.process" reads the real "data/jobs.json" and produces:

data/processed_jobs.json

Processing:

- removes duplicate board IDs
- removes duplicate URLs
- removes invalid links
- removes posts older than 90 days
- removes future-dated posts
- preserves unknown posting dates
- keeps useful older field values when a newer response omits them

The raw evidence file is not modified by scoring.

Run:

python -m radar.process
python -m unittest discover -s tests -v
python -m json.tool data/processed_jobs.json > /dev/null

Phase 4: Relevance scoring

The scoring system is a documented personal rule-of-thumb, not a prediction of hiring success.

Maximum score: 100

Scoring:

- +35 target software/web/IoT role in the title
- +20 explicit intern/fresher/entry-level cue
- +5 per supplied skill detected in title/description, maximum four skills
- +15 confirmed India/preferred area in location
- +10 when the source explicitly reports remote status as true

The system stores:

score
score_breakdown
matched_skills
reasons

Only visible evidence is counted.

Missing evidence does not become a claimed skill match.

Senior-only titles are excluded.

The system also contains boundary checks so that:

- Java is not incorrectly detected from JavaScript
- C is not incorrectly detected from C++

The score is only used to make the dashboard easier to search and understand. It is not a probability of getting hired.

Phase 5: Date buckets

The dashboard groups jobs using the following categories:

Today
This Week
This Month
Older
Unknown date

The categories are calculated relative to the viewer's current calendar date.

Missing, invalid or future posting dates remain Unknown date and are never converted into the crawl date.

Phases 6-7: Dashboard, search and filters

The dashboard consists of:

web/index.html
web/styles.css
web/app.js

It reads:

/data/processed_jobs.json

The dashboard displays real eligible jobs only.

Each card can show:

- Job title
- Company
- Location
- Job type
- Remote status
- Posting date
- Matched skills
- Relevance score
- Score explanation
- Original job posting link

Search

Search supports:

- job title
- company
- location
- detected skill

Filters

Filters include:

- location
- job type
- remote status
- minimum score
- date category

Sorting supports:

- newest
- oldest
- score

There is also a reset/clear filter option.

No fake job cards are used.

If data cannot be loaded, the dashboard displays an error or empty state instead of sample data.

Local dashboard test

From the project root:

python -m radar.crawl --max-searches 1 --boards indeed linkedin
python -m radar.process
python -m http.server 8000

Open:

http://localhost:8000/web/

Test:

- Search for "Python"
- Select "This Week"
- Select "80+" score
- Select "Confirmed remote"
- Test a location filter
- Clear all filters
- Open an original source link

The source posting should be checked again before applying because job-board listings can change or expire.

Phase 8: GitHub

The project has a GitHub repository:

priya-builds007/job-radar

The repository is public and uses the "main" branch.

The project should contain only the verified project files.

The repository must not contain:

- ".venv/"
- passwords
- API keys
- personal secrets
- unnecessary generated files
- fake job data

The ".gitignore" file should protect local environment files and other unnecessary files.

GitHub status

GitHub repository creation is complete.

The remaining GitHub work is to verify the final project structure and ensure the deployment configuration is correct.

Phase 9: Vercel deployment

The dashboard will be deployed as a static website.

The project root contains both:

web/
data/

The deployment must therefore publish the project root rather than only the "web/" directory.

The browser fetches:

/data/processed_jobs.json

The deployment must be tested using the public Vercel URL.

The following must be verified after deployment:

1. Homepage loads.
2. Real job cards appear.
3. Search works.
4. Filters work.
5. Sorting works.
6. Job source links open.
7. "processed_jobs.json" loads publicly.
8. No fake/sample records appear.

A deployment configuration such as "vercel.json" should only be added after verifying the actual Vercel routing behavior.

Phase 10: GitHub Actions daily automation

The final automation should:

Scheduled GitHub Action
        ↓
Install Python dependencies
        ↓
Run JobSpy crawler
        ↓
Run processing/scoring
        ↓
Run tests
        ↓
Check whether processed data changed
        ↓
Commit changed JSON
        ↓
Vercel deployment

The workflow should support:

- scheduled daily execution
- manual execution using "workflow_dispatch"
- useful logs
- test execution
- changed-data commits
- no fake fallback data

If a job board is unavailable or blocked, the workflow must not bypass the restriction.

A failed crawl must not overwrite valid existing data with fake or empty fallback data.

Responsible scraping

The initial search plan is intentionally bounded.

The project should:

- use supported JobSpy functionality
- respect applicable website restrictions
- avoid rapid automatic retries
- never bypass CAPTCHAs
- never bypass login requirements
- never bypass rate limits or blocks
- log board failures
- disable restricted sources when necessary

The earlier Glassdoor HTTP 403 was handled by disabling that board rather than attempting to circumvent the restriction.

Data and privacy

The project uses the profile and preferences supplied for this personal tracker.

No experience or qualification is invented.

The public dashboard may expose:

- job metadata
- source URLs
- skills used for matching
- locations/preferences included in the dashboard

Therefore, the final public version should be reviewed before deployment.

No secrets should be committed to GitHub.

Any future secrets must remain outside the repository and be stored through the appropriate GitHub/Vercel secret settings.

Current real-data result

The September 25, 2026 crawl produced:

Raw listings: 20
Indeed: 10
LinkedIn: 10
Glassdoor: 0
Glassdoor status: HTTP 403 / disabled
Processed candidate internships: 11

Descriptions were unavailable for several raw listings, so some jobs have limited skill evidence.

The score explanations explicitly show when evidence is missing.

These records are a crawl snapshot and must not be treated as proof that the jobs remain available.

Final milestone checklist

Completed

- [x] Project structure
- [x] Local Python setup
- [x] Configuration files
- [x] JobSpy crawler
- [x] Real-data smoke test
- [x] Board failure handling
- [x] Raw JSON storage
- [x] Data cleaning
- [x] Relevance scoring
- [x] Date grouping
- [x] Static dashboard
- [x] Search
- [x] Filters
- [x] Sorting
- [x] Backend tests
- [x] Real job data

Remaining

- [ ] Final GitHub repository cleanup/verification
- [ ] Vercel configuration
- [ ] Vercel deployment
- [ ] Public URL verification
- [ ] GitHub Actions workflow
- [ ] Daily automated refresh
- [ ] Verify Vercel updates after changed JSON
- [ ] Final end-to-end test

Definition of Done

The Job Radar project will be considered complete only when:

Real JobSpy data
      ↓
Cleaned JSON
      ↓
Explainable scoring
      ↓
Working dashboard
      ↓
Public GitHub repository
      ↓
Public Vercel URL
      ↓
Daily GitHub Actions refresh
      ↓
Successful automatic deployment

Until all of these are verified, the project should be described as in progress, not fully deployed.