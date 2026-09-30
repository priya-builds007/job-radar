const state = {
  jobs: [],
  filteredJobs: [],
  savedJobs: JSON.parse(localStorage.getItem("jobRadarSaved") || "[]"),
  applications: JSON.parse(
    localStorage.getItem("jobRadarApplications") || "{}"
  ),
  currentJob: null
};

const $ = id => document.getElementById(id);

const search = $("search");
const locationFilter = $("location");
const jobType = $("jobType");
const remote = $("remote");
const period = $("period");
const skill = $("skill");
const status = $("status");
const minimum = $("minimum");
const sort = $("sort");

const results = $("results");
const emptyState = $("emptyState");

const DATA_URL = "../data/processed_jobs.json";


function showNotice(message) {
  const notice = $("notice");
  const noticeText = $("noticeText");

  if (!notice || !noticeText) return;

  noticeText.textContent = message;
  notice.hidden = false;

  setTimeout(() => {
    notice.hidden = true;
  }, 2200);
}


function saveState() {
  localStorage.setItem(
    "jobRadarSaved",
    JSON.stringify(state.savedJobs)
  );

  localStorage.setItem(
    "jobRadarApplications",
    JSON.stringify(state.applications)
  );
}


function getJobId(job) {
  return String(
    job.id ||
    job.job_id ||
    `${job.title}-${job.company}-${job.location}`
  );
}


function getTitle(job) {
  return job.title || job.job_title || "Untitled job";
}


function getCompany(job) {
  return job.company || job.company_name || "Unknown company";
}


function getLocation(job) {
  return job.location || job.city || "Location not specified";
}


function getSource(job) {
  return job.site || job.source || job.platform || "Job board";
}


function getDescription(job) {
  return (
    job.description ||
    job.job_description ||
    "No description available."
  );
}


function getMatch(job) {
  const value =
    job.match_score ??
    job.score ??
    job.match ??
    0;

  const number = Number(value);

  if (Number.isNaN(number)) return 0;

  return Math.round(number);
}


function getSkills(job) {
  if (Array.isArray(job.skills)) {
    return job.skills;
  }

  if (typeof job.skills === "string") {
    return job.skills
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}


function getReasons(job) {
  if (Array.isArray(job.reasons)) {
    return job.reasons;
  }

  if (typeof job.reasons === "string") {
    return job.reasons
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}


function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}


function isSaved(job) {
  return state.savedJobs.includes(getJobId(job));
}


function getApplicationStatus(job) {
  return state.applications[getJobId(job)] || "new";
}


async function loadJobs() {
  try {
    const response = await fetch(DATA_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load job data");
    }

    const data = await response.json();

    state.jobs = Array.isArray(data)
      ? data
      : data.jobs || [];

    if ($("sourceStatus")) {
      $("sourceStatus").textContent = "LIVE";
    }

    applyFilters();

  } catch (error) {
    console.error(error);

    state.jobs = [];

    if ($("sourceStatus")) {
      $("sourceStatus").textContent = "OFFLINE";
    }

    if (results) {
      results.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load jobs</h3>
          <p>
            Please check the job data and try again.
          </p>
        </div>
      `;
    }
  }
}
``function applyFilters() {

  const query = normalize(
    search?.value
  );

  const selectedLocation = normalize(
    locationFilter?.value
  );

  const selectedType = normalize(
    jobType?.value
  );

  const selectedRemote = normalize(
    remote?.value
  );

  const selectedSkill = normalize(
    skill?.value
  );

  const selectedStatus = normalize(
    status?.value
  );

  const minMatch = Number(
    minimum?.value || 0
  );

  const selectedPeriod =
    period?.value || "all";


  state.filteredJobs =
    state.jobs.filter(job => {

      const title =
        normalize(getTitle(job));

      const company =
        normalize(getCompany(job));

      const jobLocation =
        normalize(getLocation(job));

      const description =
        normalize(getDescription(job));

      const skills =
        normalize(
          getSkills(job).join(" ")
        );


      const allText =
        `${title} ${company} ${jobLocation} ${description} ${skills}`;


      if (
        query &&
        !allText.includes(query)
      ) {
        return false;
      }


      if (
        selectedLocation !== "all" &&
        !jobLocation.includes(
          selectedLocation
        )
      ) {
        return false;
      }


      const type =
        normalize(
          job.job_type ||
          job.type ||
          ""
        );


      if (
        selectedType !== "all" &&
        !type.includes(
          selectedType
        )
      ) {
        return false;
      }


      const remoteValue =
        normalize(
          job.remote ||
          job.is_remote ||
          ""
        );


      if (
        selectedRemote === "yes" &&
        !(
          remoteValue.includes("yes") ||
          remoteValue.includes("remote") ||
          jobLocation.includes("remote")
        )
      ) {
        return false;
      }


      if (
        selectedRemote === "no" &&
        (
          remoteValue.includes("yes") ||
          remoteValue.includes("remote")
        )
      ) {
        return false;
      }


      if (
        selectedSkill &&
        !skills.includes(
          selectedSkill
        ) &&
        !description.includes(
          selectedSkill
        )
      ) {
        return false;
      }


      if (
        getMatch(job) <
        minMatch
      ) {
        return false;
      }


      if (
        selectedStatus !== "all" &&
        getApplicationStatus(job) !==
        selectedStatus
      ) {
        return false;
      }


      if (
        selectedPeriod !== "all"
      ) {

        const dateValue =
          job.date_posted ||
          job.posted_at ||
          job.date ||
          "";

        const posted =
          new Date(dateValue);


        if (
          !Number.isNaN(
            posted.getTime()
          )
        ) {

          const difference =
            (
              Date.now() -
              posted.getTime()
            ) /
            (
              1000 *
              60 *
              60 *
              24
            );


          if (
            difference >
            Number(selectedPeriod)
          ) {
            return false;
          }
        }
      }


      return true;

    });


  sortJobs();

  renderJobs();

  updateStats();
}


function sortJobs() {

  const mode =
    sort?.value || "match";


  state.filteredJobs.sort(
    (a, b) => {

      if (
        mode === "company"
      ) {

        return getCompany(a)
          .localeCompare(
            getCompany(b)
          );
      }


      if (
        mode === "title"
      ) {

        return getTitle(a)
          .localeCompare(
            getTitle(b)
          );
      }


      if (
        mode === "recent"
      ) {

        const dateA =
          new Date(
            a.date_posted ||
            a.posted_at ||
            0
          ).getTime();


        const dateB =
          new Date(
            b.date_posted ||
            b.posted_at ||
            0
          ).getTime();


        return dateB - dateA;
      }


      return (
        getMatch(b) -
        getMatch(a)
      );

    }
  );
}


function renderJobs() {

  if (!results) {
    return;
  }


  if (
    state.filteredJobs.length === 0
  ) {

    results.innerHTML = "";


    if (emptyState) {
      emptyState.hidden = false;
    }


    return;
  }


  if (emptyState) {
    emptyState.hidden = true;
  }


  results.innerHTML =
    state.filteredJobs
      .map(
        job => createJobCard(job)
      )
      .join("");
}


function createJobCard(job) {

  const id =
    getJobId(job);

  const title =
    escapeHTML(
      getTitle(job)
    );

  const company =
    escapeHTML(
      getCompany(job)
    );

  const location =
    escapeHTML(
      getLocation(job)
    );

  const source =
    escapeHTML(
      getSource(job)
    );

  const match =
    getMatch(job);

  const skills =
    getSkills(job);

  const saved =
    isSaved(job);

  const applicationStatus =
    getApplicationStatus(job);


  const skillHTML =
    skills.length
      ? skills
          .slice(0, 8)
          .map(
            item =>
              `<span class="skill-tag">
                ${escapeHTML(item)}
              </span>`
          )
          .join("")
      : `
          <span class="skill-tag">
            General
          </span>
        `;


  return `
    <article
      class="job-card"
      data-job-id="${escapeHTML(id)}"
    >

      <div class="job-card-top">

        <div>

          <div class="job-title">
            ${title}
          </div>

          <div class="job-company">
            ${company}
          </div>

        </div>


        <span class="match-badge">
          ${match}%
        </span>

      </div>


      <div class="job-meta">

        <span>
          ${location}
        </span>

        <span>
          ${source}
        </span>

        <span>
          ${escapeHTML(
            job.job_type ||
            job.type ||
            "Job"
          )}
        </span>

      </div>


      <div class="skill-tags">
        ${skillHTML}
      </div>


      <div class="job-actions">

        <div class="job-actions-left">

          <button
            class="btn secondary"
            type="button"
            onclick="openJob('${escapeJS(id)}')"
          >
            View details
          </button>


          <button
            class="btn secondary"
            type="button"
            onclick="toggleSaved('${escapeJS(id)}')"
          >
            ${saved ? "Saved" : "Save"}
          </button>

        </div>


        <div class="job-actions-right">

          <button
            class="btn primary"
            type="button"
            onclick="openSource('${escapeJS(id)}')"
          >
            Open Job ↗
          </button>

        </div>

      </div>


      <div
        style="
          margin-top:10px;
          font-size:10px;
          color:#6b7280;
        "
      >
        Status:
        ${escapeHTML(
          applicationStatus
        )}
      </div>

    </article>
  `;
}


function findJob(id) {

  return state.jobs.find(
    job =>
      getJobId(job) ===
      String(id)
  );
}


function toggleSaved(id) {

  const jobId =
    String(id);

  const index =
    state.savedJobs.indexOf(
      jobId
    );


  if (index === -1) {

    state.savedJobs.push(
      jobId
    );

    showNotice(
      "Job saved"
    );

  } else {

    state.savedJobs.splice(
      index,
      1
    );

    showNotice(
      "Job removed from saved jobs"
    );
  }


  saveState();

  applyFilters();
}function openJob(id) {

  const job = findJob(id);

  if (!job) return;

  state.currentJob = job;

  const modalTitle = $("modalTitle");
  const modalCompany = $("modalCompany");
  const modalLocation = $("modalLocation");
  const modalSource = $("modalSource");
  const modalType = $("modalType");
  const modalFreshness = $("modalFreshness");
  const modalMatch = $("modalMatch");
  const modalDescription = $("modalDescription");
  const modalSkills = $("modalSkills");
  const modalWhy = $("modalWhy");
  const modalSave = $("modalSave");
  const jobModal = $("jobModal");


  if (modalTitle) {
    modalTitle.textContent =
      getTitle(job);
  }


  if (modalCompany) {
    modalCompany.textContent =
      getCompany(job);
  }


  if (modalLocation) {
    modalLocation.textContent =
      getLocation(job);
  }


  if (modalSource) {
    modalSource.textContent =
      getSource(job);
  }


  if (modalType) {
    modalType.textContent =
      job.job_type ||
      job.type ||
      "Job";
  }


  if (modalFreshness) {
    modalFreshness.textContent =
      job.date_posted ||
      job.posted_at ||
      "Recently posted";
  }


  if (modalMatch) {
    modalMatch.textContent =
      `${getMatch(job)}%`;
  }


  if (modalDescription) {
    modalDescription.textContent =
      getDescription(job);
  }


  const skills =
    getSkills(job);


  if (modalSkills) {

    modalSkills.innerHTML =
      skills.length
        ? skills
            .map(
              item =>
                `<span class="skill-tag">
                  ${escapeHTML(item)}
                </span>`
            )
            .join("")
        : `
            <span class="skill-tag">
              Not specified
            </span>
          `;
  }


  const reasons =
    getReasons(job);


  if (modalWhy) {

    modalWhy.innerHTML =
      reasons.length
        ? reasons
            .map(
              item =>
                `<div class="why-item">
                  ✓ ${escapeHTML(item)}
                </div>`
            )
            .join("")
        : `
            <div class="why-item">
              Matches your selected job criteria.
            </div>
          `;
  }


  if (modalSave) {

    modalSave.textContent =
      isSaved(job)
        ? "Remove Saved"
        : "Save Job";
  }


  if (jobModal) {

    jobModal.hidden = false;

    document.body.style.overflow =
      "hidden";
  }
}


function closeJobModal() {

  const jobModal =
    $("jobModal");

  if (!jobModal) return;

  jobModal.hidden = true;

  document.body.style.overflow =
    "";
}


function openSource(id) {

  const job =
    findJob(id);

  if (!job) return;


  const url =
    job.job_url ||
    job.url ||
    job.link ||
    job.job_link;


  if (!url) {

    showNotice(
      "Job link is not available"
    );

    return;
  }


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}


function renderSavedJobs() {

  const container =
    $("savedResults");

  if (!container) return;


  const jobs =
    state.jobs.filter(
      job => isSaved(job)
    );


  if (!jobs.length) {

    container.innerHTML = `
      <div class="saved-empty">

        <div class="empty-icon">
          ☆
        </div>

        <h3>
          No saved jobs yet
        </h3>

        <p>
          Save an opportunity to keep it here.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML =
    jobs
      .map(
        job => createJobCard(job)
      )
      .join("");
}


function updateStats() {

  const total =
    state.jobs.length;


  const saved =
    state.jobs.filter(
      job => isSaved(job)
    ).length;


  const strong =
    state.jobs.filter(
      job => getMatch(job) >= 70
    ).length;


  const totalJobs =
    $("totalJobs");

  const totalJobsStat =
    $("totalJobsStat");

  const savedJobs =
    $("savedJobs");

  const strongMatches =
    $("strongMatches");

  const recentJobs =
    $("recentJobs");


  if (totalJobs) {
    totalJobs.textContent =
      total;
  }


  if (totalJobsStat) {
    totalJobsStat.textContent =
      total;
  }


  if (savedJobs) {
    savedJobs.textContent =
      saved;
  }


  if (strongMatches) {
    strongMatches.textContent =
      strong;
  }


  if (recentJobs) {

    const recent =
      state.jobs.filter(job => {

        const date =
          new Date(
            job.date_posted ||
            job.posted_at ||
            ""
          );


        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return false;
        }


        const days =
          (
            Date.now() -
            date.getTime()
          ) /
          (
            1000 *
            60 *
            60 *
            24
          );


        return days <= 7;
      });


    recentJobs.textContent =
      recent.length;
  }


  const applicationSaved =
    $("applicationSaved");


  if (applicationSaved) {
    applicationSaved.textContent =
      state.savedJobs.length;
  }


  const statuses =
    Object.values(
      state.applications
    );


  const applicationApplied =
    $("applicationApplied");


  const applicationInterview =
    $("applicationInterview");


  const applicationClosed =
    $("applicationClosed");


  if (applicationApplied) {

    applicationApplied.textContent =
      statuses.filter(
        value =>
          value === "applied"
      ).length;
  }


  if (applicationInterview) {

    applicationInterview.textContent =
      statuses.filter(
        value =>
          value === "interview"
      ).length;
  }


  if (applicationClosed) {

    applicationClosed.textContent =
      statuses.filter(
        value =>
          value === "closed"
      ).length;
  }
}function resetFilters() {

  if (search) {
    search.value = "";
  }


  if (locationFilter) {
    locationFilter.value = "all";
  }


  if (jobType) {
    jobType.value = "all";
  }


  if (remote) {
    remote.value = "all";
  }


  if (period) {
    period.value = "all";
  }


  if (skill) {
    skill.value = "";
  }


  if (status) {
    status.value = "all";
  }


  if (minimum) {
    minimum.value = "0";
  }


  if (sort) {
    sort.value = "match";
  }


  applyFilters();

  showNotice(
    "Filters reset"
  );
}


function analyzeProfile() {

  if (!state.jobs.length) {

    showNotice(
      "No jobs available for analysis"
    );

    return;
  }


  const matches =
    state.jobs.filter(
      job =>
        getMatch(job) >= 60
    );


  const score =
    Math.round(
      (
        matches.length /
        state.jobs.length
      ) * 100
    );


  const agentScore =
    $("agentScore");


  const analysisScore =
    $("analysisScore");


  const analysisList =
    $("analysisList");


  const analysisPanel =
    $("analysisPanel");


  if (agentScore) {

    agentScore.textContent =
      `${score}%`;
  }


  if (analysisScore) {

    analysisScore.textContent =
      `${score}%`;
  }


  if (analysisList) {

    analysisList.innerHTML = `
      <li>
        ${matches.length}
        jobs have a 60%+ match.
      </li>

      <li>
        Focus on roles with skills
        matching your profile.
      </li>

      <li>
        Save strong opportunities
        and apply through the source.
      </li>
    `;
  }


  if (analysisPanel) {

    analysisPanel.hidden =
      false;
  }
}


function exportSavedCSV() {

  const jobs =
    state.jobs.filter(
      job => isSaved(job)
    );


  if (!jobs.length) {

    showNotice(
      "No saved jobs to export"
    );

    return;
  }


  const headers = [
    "Title",
    "Company",
    "Location",
    "Source",
    "Match",
    "URL"
  ];


  const rows =
    jobs.map(job => [

      getTitle(job),

      getCompany(job),

      getLocation(job),

      getSource(job),

      `${getMatch(job)}%`,

      job.job_url ||
      job.url ||
      job.link ||
      ""

    ]);


  const csv =
    [
      headers,
      ...rows
    ]
      .map(row =>
        row
          .map(value =>
            `"${String(value ?? "")
              .replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href = url;

  link.download =
    "job-radar-saved-jobs.csv";


  document.body.appendChild(
    link
  );


  link.click();

  link.remove();


  URL.revokeObjectURL(
    url
  );


  showNotice(
    "CSV exported"
  );
}[
  search,
  locationFilter,
  jobType,
  remote,
  period,
  skill,
  status,
  minimum,
  sort
]
  .filter(Boolean)
  .forEach(element => {
    element.addEventListener("input", applyFilters);
    element.addEventListener("change", applyFilters);
  });

if ($("reset")) {
  $("reset").addEventListener("click", resetFilters);
}

if ($("emptyReset")) {
  $("emptyReset").addEventListener("click", resetFilters);
}

if ($("savedToggle")) {
  $("savedToggle").addEventListener("click", () => {
    const saved = state.jobs.filter(job => isSaved(job));

    state.filteredJobs = saved;
    renderJobs();

    document.querySelector(".results-section")?.scrollIntoView({
      behavior: "smooth"
    });
  });
}

if ($("exportSaved")) {
  $("exportSaved").addEventListener(
    "click",
    exportSavedCSV
  );
}

if ($("agentAnalyze")) {
  $("agentAnalyze").addEventListener(
    "click",
    analyzeProfile
  );
}

if ($("modalClose")) {
  $("modalClose").addEventListener(
    "click",
    closeJobModal
  );
}

if ($("modalSave")) {
  $("modalSave").addEventListener("click", () => {
    if (!state.currentJob) return;

    toggleSaved(
      getJobId(state.currentJob)
    );

    $("modalSave").textContent =
      isSaved(state.currentJob)
        ? "Remove Saved"
        : "Save Job";
  });
}

if ($("modalOpenJob")) {
  $("modalOpenJob").addEventListener("click", () => {
    if (!state.currentJob) return;

    openSource(
      getJobId(state.currentJob)
    );
  });
}

if ($("savedSectionButton")) {
  $("savedSectionButton").addEventListener(
    "click",
    () => {
      if ($("savedToggle")) {
        $("savedToggle").click();
      }
    }
  );
}

if ($("analysisClose")) {
  $("analysisClose").addEventListener(
    "click",
    () => {
      $("analysisPanel").hidden = true;
    }
  );
}

if ($("backToTop")) {
  $("backToTop").addEventListener(
    "click",
    () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );
}

document.addEventListener(
  "keydown",
  event => {
    if (event.key === "Escape") {
      closeJobModal();
    }
  }
);

renderSavedJobs();
updateStats();
loadJobs();