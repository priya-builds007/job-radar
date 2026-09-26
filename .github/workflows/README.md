
# Mentor Surprise - Job Radar

A real-time job tracker for fresher and entry-level tech opportunities.

The project collects real job data from Indeed and LinkedIn, processes and scores the jobs, and displays them in a searchable web dashboard.

## Architecture

Job boards → JobSpy → Python/Pandas → JSON → HTML/CSS/JS Dashboard → GitHub → Vercel

## Features

- Real job data from Indeed and LinkedIn
- Duplicate removal
- Relevance scoring with reasons
- Search by job, company, location and skills
- Filters for location, job type, remote status, score and date
- Sorting by newest, oldest and score
- Mobile-friendly dashboard
- Original job posting links
- Daily automatic data refresh using GitHub Actions

## Deployment

The dashboard is deployed on Vercel as a static website.

Live Demo:
https://job-radar-eight-zeta.vercel.app/

The project root is published through Vercel. `vercel.json` routes the root URL to `/web/index.html`.

## Daily Automation

GitHub Actions runs the workflow in:

`.github/workflows/daily-refresh.yml`

The workflow:

1. Checks out the repository
2. Sets up Python
3. Installs dependencies
4. Collects jobs using `python -m radar.crawl`
5. Processes jobs using `python -m radar.process`
6. Commits updated job data

The workflow runs daily and can also be started manually from GitHub Actions.

## Repository Structure

```text
job-radar/
├── radar/
├── config/
├── data/
├── web/
├── tests/
├── .github/workflows/
├── requirements.txt
├── vercel.json
└── README.md