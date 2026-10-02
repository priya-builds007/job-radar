# Job Radar web app

Plain HTML, CSS and JavaScript. No build step, no libraries.

Run locally (a server is needed because the page fetches JSON):

```sh
python -m http.server 8000
# open http://localhost:8000/web/
```

The optional AI endpoint (`/api/career-agent`) only exists on Vercel. Locally, the agent uses its built-in rule engine. Open the page through a server, not as a file:// URL.

## Files in `js/` (loaded in this order)

| File | What it does |
| --- | --- |
| core.js | helpers: storage, safe links, date groups, toast |
| skills.js | skill list with aliases and related terms |
| store.js | loads `data/processed_jobs.json`; saved, hidden, tracker, profile |
| match.js | match %, matched and missing skills, skill gaps |
| resume.js | reads resume text and extracts a profile |
| search.js | natural-language search and filters |
| knowledge.js | study hints and interview question banks (general guidance, never jobs) |
| agent.js | Career AI: rule engine plus optional server call |
| fx.js | radar, particles, rings, counters, tilt, typing, scroll reveal |
| views.js | every page |
| app.js | start-up, routing, click handling |

Tests: `node tests/test_web.js`.
