# JOB RADAR - AI Career Command Center

A personal career intelligence platform for fresher and entry-level engineering jobs. It collects real postings, scores them against a profile, and an AI agent turns jobs, resume and tracker into actions: match, skill gaps, roadmap, interview prep.

Live demo: https://job-radar-eight-zeta.vercel.app/

## Architecture

Job boards -> JobSpy -> Python/Pandas cleaning and deduplication -> `data/jobs.json` -> scoring -> `data/processed_jobs.json` -> HTML/CSS/JavaScript app (`web/`) -> GitHub -> Vercel

A scheduled GitHub Actions job refreshes the data and commits changes, which triggers a new Vercel deployment. Data is real only: no mock jobs, no invented numbers.

## Features

- Animated radar: every job is a blip, closer to the centre means a better match for your profile
- Career AI agent with six missions and structured answers (job cards, skill chips, roadmaps, interview questions). Works with no API key using a built-in rule engine
- Job Match Engine: match %, matched and missing skills, experience level, location, source, status, and "why this matches you"
- Natural-language search ("IoT jobs in Bangalore") plus filters, sorting, date groups (Today / This Week / This Month / Older), saved jobs, hidden jobs, CSV export
- Resume intelligence: paste or upload a text resume, review the parsed profile, match it with jobs
- Skill Gap, Career Roadmap, Interview Mode, Career Insights
- Application tracker (Saved / Applied / Interview / Selected / Rejected) with notes, applied date and a working View Job button
- Daily automatic data refresh

## How the AI agent works

`web/js/agent.js` turns a question into structured blocks using the real job list and your profile. Jobs are only taken from `data/processed_jobs.json`. If `OPENAI_API_KEY` is set as a Vercel environment variable, `api/career-agent.js` also calls the OpenAI Responses API with a small context (skills, 8 job summaries, tracker counts, the question) and shows the short answer above the cards. The key stays on the server. Without a key everything still works. Optional: `OPENAI_MODEL` (default `gpt-4o-mini`).

## Privacy

Resume text and tracker data stay in your browser (localStorage). Only the optional LLM call sends data out, and only the context listed above.

## Deployment (Vercel)

Static site plus one serverless function. `vercel.json` redirects `/` to `/web/`. All paths are relative, so nothing depends on localhost. Add `OPENAI_API_KEY` in Vercel project settings only if you want the LLM layer.

## Daily automation (GitHub Actions)

`.github/workflows/daily-refresh.yml` checks out the repo, installs Python dependencies, runs `python -m radar.crawl` then `python -m radar.process`, and commits changed data. It runs daily and can be started manually from the Actions tab. Failed crawls never overwrite the last good data. Glassdoor is disabled because it returned HTTP 403.

## Run locally

```sh
python3 -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements.txt
python -m radar.crawl && python -m radar.process     # refresh data (optional)
python -m http.server 8000                           # then open http://localhost:8000/web/
python -m unittest discover -s tests -v              # Python tests
node tests/test_web.js                               # web tests
```

On Windows use `py -3.11 -m venv .venv` and `.\.venv\Scripts\Activate.ps1`.

## Structure

```text
job-radar/
  radar/                  Python: crawler, cleanup, scoring, date groups
  config/                 profile.json (skills, roles, locations), searches.json
  data/                   jobs.json (raw), processed_jobs.json (scored, used by the app)
  web/                    index.html, styles.css, js/ modules (see web/README.md)
  api/career-agent.js     optional server-side AI endpoint
  tests/                  Python and Node tests
  .github/workflows/      daily-refresh.yml
  vercel.json
```

## Responsible use

Search scope is bounded in `config/searches.json`. Do not bypass logins, CAPTCHAs, paywalls or rate limits; respect each board's terms. A missing posting date stays "Unknown date", never the scrape date. No secrets belong in this repository.
