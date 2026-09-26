const state = {
  jobs: []
};

const $ = (id) => document.getElementById(id);

function getDateGroup(posted) {
  if (!posted) return "Unknown date";

  const day = new Date(`${posted}T00:00:00`);
  if (Number.isNaN(day.getTime())) return "Unknown date";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (day > today) return "Unknown date";

  if (day.getTime() === today.getTime()) return "Today";

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);

  if (day >= startOfWeek) return "This Week";

  if (
    day.getFullYear() === today.getFullYear() &&
    day.getMonth() === today.getMonth()
  ) {
    return "This Month";
  }

  return "Older";
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function matchesFilters(job) {
  const search = $("search").value.trim().toLowerCase();
  const location = $("location").value;
  const jobType = $("jobType").value;
  const remote = $("remote").value;
  const period = $("period").value;
  const minimum = Number($("minimum").value || 0);

  const searchable = [
    job.title,
    job.company,
    job.location,
    job.description,
    ...(job.matched_skills || [])
  ]
    .join(" ")
    .toLowerCase();

  if (search && !searchable.includes(search)) return false;

  if (location && !(job.location || "").toLowerCase().includes(location.toLowerCase())) {
    return false;
  }

  if (jobType && !(job.job_type || "").toLowerCase().includes(jobType.toLowerCase())) {
    return false;
  }

  if (remote === "remote" && job.is_remote !== true) return false;
  if (remote === "onsite" && job.is_remote === true) return false;

  if (period && getDateGroup(job.date_posted) !== period) return false;

  if (Number(job.score || 0) < minimum) return false;

  return true;
}

function sortJobs(jobs) {
  const sort = $("sort").value;

  return [...jobs].sort((a, b) => {
    if (sort === "score") {
      return Number(b.score || 0) - Number(a.score || 0);
    }

    if (sort === "company") {
      return (a.company || "").localeCompare(b.company || "");
    }

    return (b.date_posted || "").localeCompare(a.date_posted || "");
  });
}

function renderJob(job) {
  const skills = (job.matched_skills || [])
    .map((skill) => `<span class="tag">${skill}</span>`)
    .join("");

  const reasons = (job.reasons || [])
    .map((reason) => `<li>${reason}</li>`)
    .join("");

  return `
    <article class="job-card">
      <div class="job-card-header">
        <div>
          <h3>${escapeHtml(job.title || "Untitled role")}</h3>
          <p class="company">${escapeHtml(job.company || "Company not listed")}</p>
        </div>
        <div class="score">${Number(job.score || 0)}</div>
      </div>

      <p class="location">
        ${escapeHtml(job.location || "Location not listed")}
        ${job.is_remote === true ? " · Remote" : ""}
      </p>

      <p class="date">
        Posted: ${formatDate(job.date_posted)}
      </p>

      <div class="tags">
        ${skills}
      </div>

      <details>
        <summary>Why this job matched</summary>
        <ul>
          ${reasons}
        </ul>
      </details>

      <a
        class="apply-button"
        href="${escapeAttribute(job.job_url || "#")}"
        target="_blank"
        rel="noopener noreferrer"
      >
        View Job
      </a>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function render() {
  const filtered = sortJobs(state.jobs.filter(matchesFilters));

  $("resultCount").textContent = `${filtered.length} jobs`;

  if (!filtered.length) {
    $("results").innerHTML = `
      <div class="empty-state">
        No matching jobs found.
      </div>
    `;
    return;
  }

  $("results").innerHTML = filtered.map(renderJob).join("");
}

function updateStats() {
  const jobs = state.jobs;

  $("total").textContent = jobs.length;

  const recent = jobs.filter((job) => {
    const group = getDateGroup(job.date_posted);
    return group === "Today" || group === "This Week";
  }).length;

  $("recent").textContent = recent;

  const sources = new Set(
    jobs
      .map((job) => job.source)
      .filter(Boolean)
  );

  $("sources").textContent = sources.size;
}

async function loadJobs() {
  try {
    $("notice").textContent = "Loading job data...";

    const response = await fetch("/data/processed_jobs.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (!payload || !Array.isArray(payload.jobs)) {
      throw new Error("Invalid job data format");
    }

    state.jobs = payload.jobs;

    updateStats();
    render();

    $("sourceStatus").textContent = "Live data";
    $("notice").textContent =
      `Loaded ${state.jobs.length} processed job listings.`;
  } catch (error) {
    console.error(error);

    $("sourceStatus").textContent = "Data unavailable";
    $("notice").textContent =
      "Could not load processed job data. Run the crawler and processor first.";

    $("results").innerHTML = `
      <div class="empty-state">
        Job data is not available yet.
      </div>
    `;
  }
}

function resetFilters() {
  $("search").value = "";
  $("location").value = "";
  $("jobType").value = "";
  $("remote").value = "";
  $("period").value = "";
  $("minimum").value = "0";
  $("sort").value = "date";

  render();
}

[
  "search",
  "location",
  "jobType",
  "remote",
  "period",
  "minimum",
  "sort"
].forEach((id) => {
  $(id).addEventListener("input", render);
  $(id).addEventListener("change", render);
});

$("reset").addEventListener("click", resetFilters);

loadJobs();