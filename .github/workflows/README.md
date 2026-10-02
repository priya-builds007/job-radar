# Workflows

`daily-refresh.yml` ("Daily Job Refresh", 03:30 UTC = 9:00 AM IST) refreshes the job data every day and can be run manually (Actions tab -> Daily Job Refresh -> Run workflow). It crawls with JobSpy, rebuilds `data/processed_jobs.json`, and commits the files only if they changed. The commit triggers a Vercel deployment.
