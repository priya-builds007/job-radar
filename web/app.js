const state = {
  jobs: [],
  filtered: [],
  saved: JSON.parse(localStorage.getItem("jobRadarSaved") || "[]"),
  apps: JSON.parse(localStorage.getItem("jobRadarApplications") || "{}"),
  current: null
};

const $ = (id) => document.getElementById(id);

const DATA_URL = "../data/processed_jobs.json";

function getId(job) {
  return String(
    job.id ||
    job.job_id ||
    job.url ||
    job.link ||
    `${getCompany(job)}-${getTitle(job)}`
  );
}

function getTitle(job) {
  return (
    job.title ||
    job.job_title ||
    job.position ||
    "Untitled Job"
  );
}

function getCompany(job) {
  return (
    job.company ||
    job.company_name ||
    "Unknown Company"
  );
}

function getLocation(job) {
  return (
    job.location ||
    job.city ||
    "India"
  );
}

function getSource(job) {
  return (
    job.source ||
    job.site ||
    "Job Board"
  );
}

function getDescription(job) {
  return (
    job.description ||
    job.job_description ||
    "No description available."
  );
}

function getScore(job) {
  const value =
    job.match_score ??
    job.match ??
    job.score ??
    job.personal_match ??
    0;

  const number = Number(value);

  return Number.isFinite(number)
    ? Math.round(number)
    : 0;
}

function getSkills(job) {
  const skills =
    job.skills ||
    job.required_skills ||
    job.matched_skills ||
    [];

  if (Array.isArray(skills)) {
    return skills;
  }

  return String(skills)
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function getReasons(job) {
  const reasons =
    job.reasons ||
    job.match_reasons ||
    job.why_match ||
    [];

  if (Array.isArray(reasons)) {
    return reasons;
  }

  if (reasons) {
    return [String(reasons)];
  }

  return [
    "Matches your selected job preferences.",
    "Relevant skills were detected.",
    "Suitable for an entry-level profile."
  ];
}

function isSaved(jobId) {
  return state.saved.includes(jobId);
}

function saveState() {
  localStorage.setItem(
    "jobRadarSaved",
    JSON.stringify(state.saved)
  );

  localStorage.setItem(
    "jobRadarApplications",
    JSON.stringify(state.apps)
  );
}

function showToast(message) {
  const toast = $("toast");

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function goToPage(page) {
  document
    .querySelectorAll(".page")
    .forEach((section) => {
      section.classList.remove("active");
    });

  const target = $(`page-${page}`);

  if (target) {
    target.classList.add("active");
  }

  document
    .querySelectorAll("[data-page]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.page === page
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}async function loadJobs() {
  try {
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error("Unable to load jobs");
    }

    const data = await response.json();

    state.jobs = Array.isArray(data)
      ? data
      : Array.isArray(data.jobs)
        ? data.jobs
        : [];

    const liveStatus = $("liveStatus");

    if (liveStatus) {
      liveStatus.textContent = "LIVE";
      liveStatus.classList.add("live");
    }

    renderSkills();
    renderNextJob();
    applyFilters();

  } catch (error) {
    console.error("Job loading error:", error);

    state.jobs = [];

    const liveStatus = $("liveStatus");

    if (liveStatus) {
      liveStatus.textContent = "OFFLINE";
      liveStatus.classList.remove("live");
    }

    applyFilters();

    showToast("Unable to load job data");
  }
}


function getPostedDays(job) {
  const date =
    job.date_posted ||
    job.posted_date ||
    job.posted ||
    "";

  if (!date) {
    return 999;
  }

  const postedTime = new Date(date).getTime();

  if (Number.isNaN(postedTime)) {
    return 999;
  }

  const difference =
    Date.now() - postedTime;

  return Math.max(
    0,
    Math.floor(
      difference / (1000 * 60 * 60 * 24)
    )
  );
}


function applyFilters() {

  const search =
    ($("search")?.value || "")
      .trim()
      .toLowerCase();

  const location =
    ($("location")?.value || "")
      .toLowerCase();

  const jobType =
    ($("jobType")?.value || "")
      .toLowerCase();

  const workMode =
    ($("workMode")?.value || "")
      .toLowerCase();

  const skill =
    ($("skill")?.value || "")
      .toLowerCase();

  const posted =
    ($("posted")?.value || "")
      .toLowerCase();

  const appStatus =
    ($("appStatus")?.value || "all")
      .toLowerCase();

  const minimum =
    Number($("minimum")?.value || 0);


  state.filtered = state.jobs.filter((job) => {

    const text = [
      getTitle(job),
      getCompany(job),
      getLocation(job),
      getSource(job),
      getDescription(job),
      getSkills(job).join(" ")
    ]
      .join(" ")
      .toLowerCase();


    if (
      search &&
      !text.includes(search)
    ) {
      return false;
    }


    if (
      location &&
      !getLocation(job)
        .toLowerCase()
        .includes(location)
    ) {
      return false;
    }


    if (
      jobType &&
      !text.includes(jobType)
    ) {
      return false;
    }


    if (workMode) {

      const modeText = [
        job.work_mode,
        job.workMode,
        job.remote,
        job.location_type,
        getDescription(job)
      ]
        .join(" ")
        .toLowerCase();

      if (!modeText.includes(workMode)) {
        return false;
      }
    }


    if (skill) {

      const skillsText =
        getSkills(job)
          .join(" ")
          .toLowerCase();

      if (
        !skillsText.includes(skill) &&
        !text.includes(skill)
      ) {
        return false;
      }
    }


    if (minimum > 0) {

      if (getScore(job) < minimum) {
        return false;
      }
    }


    if (posted) {

      const days =
        getPostedDays(job);

      if (posted === "today" && days > 0) {
        return false;
      }

      if (posted === "3" && days > 3) {
        return false;
      }

      if (posted === "7" && days > 7) {
        return false;
      }

      if (posted === "30" && days > 30) {
        return false;
      }
    }


    if (
      appStatus &&
      appStatus !== "all"
    ) {

      const id = getId(job);

      const status =
        state.apps[id] || "new";

      if (status !== appStatus) {
        return false;
      }
    }


    return true;
  });


  sortJobs();

  renderResults();
  updateDashboard();
  renderTracker();
}function sortJobs() {

  const sort =
    ($("sort")?.value || "recent")
      .toLowerCase();


  state.filtered.sort((a, b) => {

    if (sort === "match") {
      return getScore(b) - getScore(a);
    }


    if (sort === "company") {
      return getCompany(a)
        .localeCompare(
          getCompany(b)
        );
    }


    if (sort === "title") {
      return getTitle(a)
        .localeCompare(
          getTitle(b)
        );
    }


    return (
      getPostedDays(a) -
      getPostedDays(b)
    );
  });
}


function renderResults() {

  const results =
    $("results");

  const emptyState =
    $("emptyState");

  if (!results) {
    return;
  }


  results.innerHTML = "";


  if (!state.filtered.length) {

    if (emptyState) {
      emptyState.hidden = false;
    }

    return;
  }


  if (emptyState) {
    emptyState.hidden = true;
  }


  state.filtered.forEach((job) => {

    results.appendChild(
      createJobCard(job)
    );

  });
}


function createJobCard(job) {

  const card =
    document.createElement("article");

  card.className = "job-card";


  const id =
    getId(job);

  const title =
    getTitle(job);

  const company =
    getCompany(job);

  const location =
    getLocation(job);

  const source =
    getSource(job);

  const score =
    getScore(job);

  const skills =
    getSkills(job);

  const saved =
    isSaved(id);

  const status =
    state.apps[id] || "new";


  const skillHTML =
    skills.length
      ? skills
          .slice(0, 6)
          .map(
            (skill) =>
              `<span class="skill-chip">${escapeHTML(skill)}</span>`
          )
          .join("")
      : `<span class="skill-chip">Relevant skills</span>`;


  card.innerHTML = `
    <div class="job-card-top">

      <div>
        <div class="job-source">
          ${escapeHTML(source)}
        </div>

        <h3>
          ${escapeHTML(title)}
        </h3>

        <p class="job-company">
          ${escapeHTML(company)}
        </p>
      </div>

      <div class="match-score">
        ${score}%
      </div>

    </div>


    <div class="job-meta">

      <span>
        📍 ${escapeHTML(location)}
      </span>

      <span>
        💼 ${escapeHTML(
          job.job_type ||
          job.type ||
          "Job"
        )}
      </span>

    </div>


    <div class="job-skills">
      ${skillHTML}
    </div>


    <div class="job-card-actions">

      <button
        class="secondary"
        data-view-job="${escapeHTML(id)}"
      >
        View details
      </button>


      <button
        class="secondary"
        data-save-job="${escapeHTML(id)}"
      >
        ${saved ? "Saved" : "Save"}
      </button>


      <button
        class="primary"
        data-open-job="${escapeHTML(id)}"
      >
        Open Job ↗
      </button>

    </div>


    <div class="job-status">
      Status:
      <strong>
        ${escapeHTML(status)}
      </strong>
    </div>
  `;


  return card;
}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}function findJob(jobId) {
  return state.jobs.find(
    (job) => getId(job) === String(jobId)
  );
}


function toggleSave(jobId) {

  const id = String(jobId);

  if (isSaved(id)) {

    state.saved =
      state.saved.filter(
        (savedId) => savedId !== id
      );

    showToast("Job removed from saved");

  } else {

    state.saved.push(id);

    showToast("Job saved successfully");
  }


  saveState();

  renderResults();
  renderTracker();
  updateDashboard();


  if (
    state.current &&
    getId(state.current) === id
  ) {
    updateModalButtons();
  }
}


function openSource(jobId) {

  const job =
    findJob(jobId);

  if (!job) {
    showToast("Job not found");
    return;
  }


  const url =
    job.url ||
    job.job_url ||
    job.link ||
    job.apply_url ||
    "";


  if (!url) {
    showToast("Job link not available");
    return;
  }


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}


function openJob(jobId) {

  const job =
    findJob(jobId);

  if (!job) {
    showToast("Job not found");
    return;
  }


  state.current = job;


  const title =
    $("mTitle");

  const company =
    $("mCompany");

  const meta =
    $("mMeta");

  const score =
    $("mScore");

  const bar =
    $("mBar");

  const reasons =
    $("mReasons");

  const skills =
    $("mSkills");

  const description =
    $("mDescription");

  const status =
    $("mStatus");


  if (title) {
    title.textContent =
      getTitle(job);
  }


  if (company) {
    company.textContent =
      getCompany(job);
  }


  if (meta) {

    meta.textContent =
      `${getLocation(job)} • ${getSource(job)}`;
  }


  const match =
    getScore(job);


  if (score) {
    score.textContent =
      `${match}%`;
  }


  if (bar) {
    bar.style.width =
      `${Math.max(
        0,
        Math.min(100, match)
      )}%`;
  }


  if (reasons) {

    reasons.innerHTML =
      getReasons(job)
        .map(
          (reason) =>
            `<li>${escapeHTML(reason)}</li>`
        )
        .join("");
  }


  if (skills) {

    skills.innerHTML =
      getSkills(job)
        .map(
          (skill) =>
            `<span class="skill-chip">${escapeHTML(skill)}</span>`
        )
        .join("");
  }


  if (description) {

    description.textContent =
      getDescription(job);
  }


  if (status) {

    status.value =
      state.apps[getId(job)] ||
      "new";
  }


  updateModalButtons();


  const modal =
    $("modal");

  if (modal) {
    modal.hidden = false;
  }
}


function updateModalButtons() {

  if (!state.current) {
    return;
  }


  const id =
    getId(state.current);


  const saveButton =
    $("mSave");

  if (saveButton) {

    saveButton.textContent =
      isSaved(id)
        ? "Saved"
        : "Save Job";
  }
}


function closeJobModal() {

  const modal =
    $("modal");

  if (modal) {
    modal.hidden = true;
  }

  state.current = null;
}


function updateApplicationStatus(status) {

  if (!state.current) {
    return;
  }


  const id =
    getId(state.current);


  state.apps[id] =
    status;


  saveState();

  renderResults();
  renderTracker();
  updateDashboard();

  showToast(
    `Status updated to ${status}`
  );
}


function cycleApplicationStatus() {

  if (!state.current) {
    return;
  }


  const id =
    getId(state.current);


  const current =
    state.apps[id] || "new";


  const order = [
    "new",
    "saved",
    "applied",
    "interview",
    "closed"
  ];


  const index =
    order.indexOf(current);


  const next =
    order[
      (index + 1) % order.length
    ];


  updateApplicationStatus(next);


  const status =
    $("mStatus");

  if (status) {
    status.value = next;
  }
}


document.addEventListener(
  "click",
  (event) => {

    const viewButton =
      event.target.closest(
        "[data-view-job]"
      );

    if (viewButton) {

      openJob(
        viewButton.getAttribute(
          "data-view-job"
        )
      );

      return;
    }


    const saveButton =
      event.target.closest(
        "[data-save-job]"
      );

    if (saveButton) {

      toggleSave(
        saveButton.getAttribute(
          "data-save-job"
        )
      );

      return;
    }


    const openButton =
      event.target.closest(
        "[data-open-job]"
      );

    if (openButton) {

      openSource(
        openButton.getAttribute(
          "data-open-job"
        )
      );

      return;
    }
  }
);


const closeModalButton =
  $("closeModal");

if (closeModalButton) {

  closeModalButton.addEventListener(
    "click",
    closeJobModal
  );
}


const modal =
  $("modal");

if (modal) {

  modal.addEventListener(
    "click",
    (event) => {

      if (
        event.target === modal
      ) {
        closeJobModal();
      }

    }
  );
}


const modalSave =
  $("mSave");

if (modalSave) {

  modalSave.addEventListener(
    "click",
    () => {

      if (!state.current) {
        return;
      }

      toggleSave(
        getId(state.current)
      );

    }
  );
}


const modalOpen =
  $("mOpen");

if (modalOpen) {

  modalOpen.addEventListener(
    "click",
    () => {

      if (!state.current) {
        return;
      }

      openSource(
        getId(state.current)
      );

    }
  );
}


const modalStatus =
  $("mStatus");

if (modalStatus) {

  modalStatus.addEventListener(
    "change",
    () => {

      updateApplicationStatus(
        modalStatus.value
      );

    }
  );
}


document.addEventListener(
  "keydown",
  (event) => {

    if (event.key === "Escape") {
      closeJobModal();
    }

  }
);function renderSkills() {

  const skillBox = $("topSkills");

  if (!skillBox) {
    return;
  }

  const counts = {};

  state.jobs.forEach((job) => {

    getSkills(job).forEach((skill) => {

      const name =
        String(skill).trim();

      if (!name) {
        return;
      }

      const key =
        name.toLowerCase();

      counts[key] =
        (counts[key] || 0) + 1;
    });
  });


  const skills =
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);


  skillBox.innerHTML = "";


  if (!skills.length) {

    skillBox.innerHTML =
      `<span class="skill-chip">No skills yet</span>`;

    return;
  }


  skills.forEach(([skill, count]) => {

    const item =
      document.createElement("div");

    item.className =
      "skill-row";

    item.innerHTML = `
      <span>${escapeHTML(skill)}</span>
      <strong>${count}</strong>
    `;

    skillBox.appendChild(item);
  });
}


/* ===============================
   ANALYZE BEST OPPORTUNITY
================================ */

function renderNextJob() {

  const box =
    $("nextJob");

  if (!box) {
    return;
  }


  if (!state.jobs.length) {

    box.innerHTML = `
      <p>No opportunities available yet.</p>
    `;

    return;
  }


  const sorted =
    [...state.jobs].sort(
      (a, b) =>
        getScore(b) - getScore(a)
    );


  const job =
    sorted[0];


  const id =
    getId(job);


  box.innerHTML = `
    <div class="agent-job">

      <div class="job-source">
        BEST CURRENT MATCH
      </div>

      <h3>
        ${escapeHTML(getTitle(job))}
      </h3>

      <p class="job-company">
        ${escapeHTML(getCompany(job))}
      </p>

      <p class="job-meta">
        📍 ${escapeHTML(getLocation(job))}
        &nbsp; • &nbsp;
        ${escapeHTML(getSource(job))}
      </p>

      <div class="match-score large">
        ${getScore(job)}% MATCH
      </div>

      <button
        class="primary"
        type="button"
        data-analyze-job="${escapeHTML(id)}"
      >
        Analyze Opportunity
      </button>

    </div>
  `;
}


/* ===============================
   ANALYZE BUTTON FIX
================================ */

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "[data-analyze-job]"
      );

    if (!button) {
      return;
    }


    const jobId =
      button.getAttribute(
        "data-analyze-job"
      );


    if (!jobId) {
      return;
    }


    openJob(jobId);
  }
);


/* ===============================
   AVOID JOBS
================================ */

function renderAvoidJobs() {

  const box =
    $("avoidList");

  if (!box) {
    return;
  }


  const avoided =
    state.jobs.filter((job) => {

      const score =
        getScore(job);

      return score < 40;
    });


  if (!avoided.length) {

    box.innerHTML = `
      <p class="muted">
        No low-match jobs found.
      </p>
    `;

    return;
  }


  box.innerHTML =
    avoided
      .slice(0, 6)
      .map((job) => {

        return `
          <div class="avoid-item">

            <div>
              <strong>
                ${escapeHTML(getTitle(job))}
              </strong>

              <small>
                ${escapeHTML(getCompany(job))}
              </small>
            </div>

            <span>
              ${getScore(job)}%
            </span>

          </div>
        `;
      })
      .join("");
}


/* ===============================
   DASHBOARD STATS
================================ */

function updateDashboard() {

  const total =
    $("totalJobs");

  const recent =
    $("recentJobs");

  const saved =
    $("savedJobs");

  const strong =
    $("strongMatches");


  if (total) {
    total.textContent =
      state.jobs.length;
  }


  const recentCount =
    state.jobs.filter(
      (job) =>
        getPostedDays(job) <= 7
    ).length;


  if (recent) {
    recent.textContent =
      recentCount;
  }


  if (saved) {
    saved.textContent =
      state.saved.length;
  }


  const strongCount =
    state.jobs.filter(
      (job) =>
        getScore(job) >= 70
    ).length;


  if (strong) {
    strong.textContent =
      strongCount;
  }


  renderAvoidJobs();
}


/* ===============================
   PROFILE ANALYSIS
================================ */

function analyzeProfile() {

  const score =
    state.jobs.length
      ? Math.round(
          state.jobs
            .reduce(
              (sum, job) =>
                sum + getScore(job),
              0
            ) /
          state.jobs.length
        )
      : 0;


  const profileScore =
    $("profileScore");

  const profileBar =
    $("profileBar");


  if (profileScore) {
    profileScore.textContent =
      `${score}%`;
  }


  if (profileBar) {
    profileBar.style.width =
      `${score}%`;
  }


  showToast(
    `Profile analysis: ${score}%`
  );
}function renderTracker() {

  const columns = {
    saved: $("colSaved"),
    applied: $("colApplied"),
    interview: $("colInterview"),
    closed: $("colClosed")
  };


  const counts = {
    saved: 0,
    applied: 0,
    interview: 0,
    closed: 0
  };


  Object.values(state.apps)
    .forEach((status) => {

      if (counts[status] !== undefined) {
        counts[status]++;
      }

    });


  Object.keys(columns)
    .forEach((status) => {

      const column =
        columns[status];

      if (!column) {
        return;
      }


      column.innerHTML = "";


      const jobs =
        state.jobs.filter(
          (job) =>
            state.apps[getId(job)] === status
        );


      if (!jobs.length) {

        column.innerHTML = `
          <p class="muted">
            No jobs here yet.
          </p>
        `;

        return;
      }


      jobs.forEach((job) => {

        const item =
          document.createElement("div");

        item.className =
          "tracker-job";


        item.innerHTML = `
          <strong>
            ${escapeHTML(getTitle(job))}
          </strong>

          <small>
            ${escapeHTML(getCompany(job))}
          </small>

          <span>
            ${getScore(job)}% match
          </span>
        `;


        item.addEventListener(
          "click",
          () => openJob(getId(job))
        );


        column.appendChild(item);
      });

    });


  const counterMap = {
    saved: "cSaved",
    applied: "cApplied",
    interview: "cInterview",
    closed: "cClosed"
  };


  Object.entries(counterMap)
    .forEach(([status, elementId]) => {

      const element =
        $(elementId);

      if (element) {
        element.textContent =
          counts[status];
      }

    });
}


/* ===============================
   FILTER EVENTS
================================ */

[
  "search",
  "location",
  "jobType",
  "workMode",
  "posted",
  "skill",
  "appStatus",
  "minimum",
  "sort"
].forEach((id) => {

  const element = $(id);

  if (!element) {
    return;
  }


  element.addEventListener(
    "input",
    applyFilters
  );

  element.addEventListener(
    "change",
    applyFilters
  );
});


/* ===============================
   CLEAR FILTERS
================================ */

const clearFilters =
  $("clearFilters");

if (clearFilters) {

  clearFilters.addEventListener(
    "click",
    () => {

      [
        "search",
        "location",
        "jobType",
        "workMode",
        "posted",
        "skill"
      ].forEach((id) => {

        const element = $(id);

        if (element) {
          element.value = "";
        }

      });


      const appStatus =
        $("appStatus");

      if (appStatus) {
        appStatus.value = "all";
      }


      const minimum =
        $("minimum");

      if (minimum) {
        minimum.value = "0";
      }


      const sort =
        $("sort");

      if (sort) {
        sort.value = "recent";
      }


      applyFilters();

      showToast(
        "Filters cleared"
      );
    }
  );
}


/* ===============================
   SAVED JOBS BUTTON
================================ */

const savedButton =
  $("showSaved");

if (savedButton) {

  savedButton.addEventListener(
    "click",
    () => {

      const appStatus =
        $("appStatus");

      if (appStatus) {
        appStatus.value = "saved";
      }


      state.filtered =
        state.jobs.filter(
          (job) =>
            isSaved(getId(job))
        );


      renderResults();

      showToast(
        "Showing saved jobs"
      );
    }
  );
}


/* ===============================
   EXPORT SAVED JOBS
================================ */

const exportButton =
  $("exportCSV");

if (exportButton) {

  exportButton.addEventListener(
    "click",
    () => {

      const saved =
        state.jobs.filter(
          (job) =>
            isSaved(getId(job))
        );


      if (!saved.length) {

        showToast(
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
        saved.map((job) => [

          getTitle(job),

          getCompany(job),

          getLocation(job),

          getSource(job),

          `${getScore(job)}%`,

          job.url ||
          job.job_url ||
          job.link ||
          ""

        ]);


      const csv = [
        headers,
        ...rows
      ]
        .map((row) =>
          row
            .map((value) =>
              `"${String(value)
                .replaceAll('"', '""')}"`
            )
            .join(",")
        )
        .join("\n");


      const blob =
        new Blob(
          [csv],
          {
            type: "text/csv;charset=utf-8;"
          }
        );


      const url =
        URL.createObjectURL(blob);


      const link =
        document.createElement("a");


      link.href = url;
      link.download =
        "job-radar-saved-jobs.csv";


      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);


      showToast(
        "CSV exported successfully"
      );
    }
  );
}


/* ===============================
   RESUME UPLOAD
================================ */

const resumeFile =
  $("resumeFile");

const resumeName =
  $("resumeName");


if (resumeFile) {

  resumeFile.addEventListener(
    "change",
    () => {

      const file =
        resumeFile.files?.[0];

      if (!file) {
        return;
      }


      if (resumeName) {

        resumeName.textContent =
          file.name;
      }


      showToast(
        "Resume selected"
      );
    }
  );
}


/* ===============================
   NAVIGATION
================================ */

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "[data-page]"
      );

    if (!button) {
      return;
    }


    const page =
      button.getAttribute(
        "data-page"
      );


    if (page) {
      goToPage(page);
    }
  }
);


/* ===============================
   INITIALIZE APP
================================ */

renderTracker();

updateDashboard();

loadJobs();