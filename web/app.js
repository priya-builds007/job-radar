/* =========================
   JOB RADAR APP
========================= */

const state = {
  jobs: [],
  filtered: [],

  saved: JSON.parse(
    localStorage.getItem("jobRadarSaved") || "[]"
  ),

  apps: JSON.parse(
    localStorage.getItem("jobRadarApplications") || "{}"
  ),

  avoid: JSON.parse(
    localStorage.getItem("jobRadarAvoid") || "[]"
  ),

  current: null,

  selectedSkill: ""
};


/* =========================
   HELPERS
========================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) =>
  Array.from(document.querySelectorAll(selector));


function saveLocalData() {
  localStorage.setItem(
    "jobRadarSaved",
    JSON.stringify(state.saved)
  );

  localStorage.setItem(
    "jobRadarApplications",
    JSON.stringify(state.apps)
  );

  localStorage.setItem(
    "jobRadarAvoid",
    JSON.stringify(state.avoid)
  );
}


function getId(job) {
  return String(
    job.id ||
    job.job_id ||
    `${job.company}-${job.title}-${job.location}`
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}


function text(value) {
  return String(value || "").trim();
}


function lower(value) {
  return text(value).toLowerCase();
}


function isSaved(job) {
  return state.saved.includes(getId(job));
}


function getStatus(job) {
  return state.apps[getId(job)] || "";
}


/* =========================
   SKILL KEYWORDS
========================= */

const skillKeywords = {
  iot: [
    "iot",
    "internet of things",
    "embedded",
    "sensor",
    "esp32",
    "arduino",
    "mqtt",
    "raspberry pi",
    "firmware"
  ],

  embedded: [
    "embedded",
    "firmware",
    "microcontroller",
    "microprocessor",
    "esp32",
    "stm32",
    "arduino",
    "rtos"
  ],

  python: [
    "python",
    "django",
    "flask",
    "pandas",
    "numpy"
  ],

  java: [
    "java",
    "spring",
    "spring boot",
    "j2ee"
  ],

  "c++": [
    "c++",
    "cpp",
    "embedded c",
    "stl"
  ],

  sql: [
    "sql",
    "mysql",
    "postgresql",
    "database",
    "dbms"
  ],

  vlsi: [
    "vlsi",
    "verilog",
    "systemverilog",
    "rtl",
    "asic",
    "fpga",
    "cadence"
  ],

  electronics: [
    "electronics",
    "circuit",
    "pcb",
    "hardware",
    "embedded",
    "microcontroller"
  ]
};


/* =========================
   JOB TEXT
========================= */

function getJobText(job) {
  return [
    job.title,
    job.company,
    job.location,
    job.description,
    job.skills,
    job.requirements,
    job.job_type,
    job.work_mode
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}


/* =========================
   SKILL MATCH
========================= */

function skillMatchesJob(job, skill) {
  if (!skill) return true;

  const keywords = skillKeywords[skill] || [skill];

  const jobText = getJobText(job);

  return keywords.some((keyword) =>
    jobText.includes(keyword.toLowerCase())
  );
}


/* =========================
   LOAD JOB DATA
========================= */

async function loadJobs() {
  try {
    const response = await fetch(
      "../data/processed_jobs.json",
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load jobs: ${response.status}`
      );
    }

    const data = await response.json();

    state.jobs = Array.isArray(data)
      ? data
      : Array.isArray(data.jobs)
        ? data.jobs
        : [];

    state.filtered = [...state.jobs];

    console.log(
      `Job Radar loaded ${state.jobs.length} jobs`
    );

    updateDashboard();
    applyFilters();
    renderTracker();
    renderAvoidJobs();

  } catch (error) {

    console.error(
      "Job Radar data loading error:",
      error
    );

    state.jobs = [];
    state.filtered = [];

    const results = $("#results");

    if (results) {
      results.innerHTML = `
        <div class="panel empty-state">
          <h3>Unable to load jobs</h3>
          <p>
            Please check the processed_jobs.json file
            and refresh the page.
          </p>
        </div>
      `;
    }
  }
}


/* =========================
   INITIAL STATUS
========================= */

function updateLiveStatus() {
  const status = $("#liveStatus");

  if (!status) return;

  status.innerHTML = `
    <span class="live-dot"></span>
    LIVE • Job data connected
  `;
}


/* =========================
   INITIALIZE
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateLiveStatus();

    loadJobs();

  }
);/* =========================
   FILTER JOBS
========================= */

function applyFilters() {
  let jobs = [...state.jobs];

  const search = lower($("#search")?.value);
  const location = lower($("#location")?.value);
  const jobType = lower($("#jobType")?.value);
  const workMode = lower($("#workMode")?.value);
  const posted = lower($("#posted")?.value);
  const skill = lower($("#skill")?.value);
  const appStatus = lower($("#appStatus")?.value);
  const minimum = $("#minimum")?.value;
  const sort = $("#sort")?.value || "recent";


  /* SEARCH */

  if (search) {
    jobs = jobs.filter((job) => {
      const content = getJobText(job);
      return content.includes(search);
    });
  }


  /* LOCATION */

  if (location) {
    jobs = jobs.filter((job) =>
      lower(job.location).includes(location)
    );
  }


  /* JOB TYPE */

  if (jobType) {
    jobs = jobs.filter((job) =>
      lower(job.job_type || job.type).includes(jobType)
    );
  }


  /* WORK MODE */

  if (workMode) {
    jobs = jobs.filter((job) =>
      lower(job.work_mode || job.mode).includes(workMode)
    );
  }


  /* SKILL */

  if (skill) {
    jobs = jobs.filter((job) =>
      skillMatchesJob(job, skill)
    );
  }


  /* APPLICATION STATUS */

  if (appStatus) {
    jobs = jobs.filter((job) => {
      return lower(getStatus(job)) === appStatus;
    });
  }


  /* MINIMUM MATCH */

  if (minimum) {
    const score = Number(
      minimum.replace("+", "").replace("%", "")
    );

    if (!Number.isNaN(score)) {
      jobs = jobs.filter((job) =>
        getMatchScore(job) >= score
      );
    }
  }


  /* POSTED DATE */

  if (posted) {
    const days = {
      "today": 1,
      "last 3 days": 3,
      "last 7 days": 7,
      "last 30 days": 30
    };

    if (days[posted]) {
      const cutoff =
        Date.now() -
        days[posted] * 24 * 60 * 60 * 1000;

      jobs = jobs.filter((job) => {
        const date = new Date(job.date_posted);

        return (
          !Number.isNaN(date.getTime()) &&
          date.getTime() >= cutoff
        );
      });
    }
  }


  /* SORT */

  if (sort === "best") {
    jobs.sort(
      (a, b) =>
        getMatchScore(b) - getMatchScore(a)
    );
  }

  else if (sort === "company") {
    jobs.sort((a, b) =>
      text(a.company).localeCompare(
        text(b.company)
      )
    );
  }

  else {
    jobs.sort(
      (a, b) =>
        new Date(b.date_posted || 0) -
        new Date(a.date_posted || 0)
    );
  }


  state.filtered = jobs;

  renderJobs();
  updateResultCount();
}


/* =========================
   MATCH SCORE
========================= */

function getMatchScore(job, selectedSkill = "") {

  let score = Number(
    job.match_score ??
    job.score ??
    job.match ??
    0
  );

  if (Number.isNaN(score)) {
    score = 0;
  }


  /* If existing processed score is available */

  if (!selectedSkill) {
    return Math.max(
      0,
      Math.min(100, Math.round(score))
    );
  }


  /* Skill-specific score */

  const matches = skillMatchesJob(
    job,
    selectedSkill
  );

  if (!matches) {
    return 0;
  }


  /*
    Give a strong boost when the selected
    skill is actually present in the job.
  */

  return Math.max(
    60,
    Math.min(100, Math.round(score + 15))
  );
}


/* =========================
   RESULT COUNT
========================= */

function updateResultCount() {

  const header = $(".results-header");

  if (!header) return;

  const count = state.filtered.length;

  const countElement =
    header.querySelector(
      "[data-result-count]"
    );

  if (countElement) {
    countElement.textContent =
      `${count} opportunities`;
  }
}


/* =========================
   CLEAR FILTERS
========================= */

function clearFilters() {

  [
    "#search",
    "#location",
    "#jobType",
    "#workMode",
    "#posted",
    "#skill",
    "#appStatus",
    "#minimum",
    "#sort"
  ].forEach((selector) => {

    const element = $(selector);

    if (!element) return;

    if (selector === "#sort") {
      element.value = "recent";
    } else {
      element.value = "";
    }
  });


  state.selectedSkill = "";

  applyFilters();

  showToast("Filters cleared");
}


/* =========================
   SKILL SELECTION
========================= */

function handleSkillChange() {

  const skill = lower(
    $("#skill")?.value
  );

  state.selectedSkill = skill;

  /*
    Important:
    The selected skill controls the
    Best Opportunity result.
  */

  updateBestOpportunity(skill);

  applyFilters();
}


/* =========================
   BEST OPPORTUNITY
========================= */

function updateBestOpportunity(skill = "") {

  const target = $("#nextJob");

  if (!target) return;


  let candidates = [...state.jobs];


  /* If skill selected, ONLY use relevant jobs */

  if (skill) {
    candidates = candidates.filter(
      (job) =>
        skillMatchesJob(job, skill)
    );
  }


  if (!candidates.length) {

    target.innerHTML = `
      <h3>No ${skill || "matching"} opportunity found</h3>
      <p>
        Try another skill or clear the skill filter.
      </p>
    `;

    return;
  }


  /* Highest score first */

  candidates.sort((a, b) => {

    const scoreA =
      getMatchScore(a, skill);

    const scoreB =
      getMatchScore(b, skill);

    return scoreB - scoreA;
  });


  const best = candidates[0];

  const score =
    getMatchScore(best, skill);


  target.innerHTML = `
    <h3>${escapeHTML(
      best.title || "Best Opportunity"
    )}</h3>

    <p>
      ${escapeHTML(
        best.company || "Company"
      )}
      •
      ${escapeHTML(
        best.location || "Location not specified"
      )}
    </p>

    <p>
      ${skill
        ? `Best match for ${escapeHTML(skill.toUpperCase())}`
        : "Highest current match"}
      •
      <strong>${score}% match</strong>
    </p>
  `;
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================
   FILTER EVENT LISTENERS
========================= */

function bindFilterEvents() {

  [
    "#search",
    "#location",
    "#jobType",
    "#workMode",
    "#posted",
    "#appStatus",
    "#minimum",
    "#sort"
  ].forEach((selector) => {

    const element = $(selector);

    if (!element) return;

    element.addEventListener(
      "input",
      applyFilters
    );

    element.addEventListener(
      "change",
      applyFilters
    );
  });


  const skillSelect = $("#skill");

  if (skillSelect) {
    skillSelect.addEventListener(
      "change",
      handleSkillChange
    );
  }


  const clearButton =
    $("#clearFilters");

  if (clearButton) {
    clearButton.addEventListener(
      "click",
      clearFilters
    );
  }
}


/* =========================
   UPDATE INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    bindFilterEvents();

  }
);/* =========================
   RENDER JOBS
========================= */

function renderJobs() {

  const results = $("#results");

  if (!results) return;

  if (!state.filtered.length) {

    results.innerHTML = "";

    const empty = $("#emptyState");

    if (empty) {
      empty.hidden = false;
    }

    return;
  }

  const empty = $("#emptyState");

  if (empty) {
    empty.hidden = true;
  }


  results.innerHTML = state.filtered
    .map((job) => createJobCard(job))
    .join("");
}


/* =========================
   JOB CARD
========================= */

function createJobCard(job) {

  const id = getId(job);

  const title =
    text(job.title) ||
    "Untitled Job";

  const company =
    text(job.company) ||
    "Company not specified";

  const location =
    text(job.location) ||
    "Location not specified";

  const source =
    text(job.source) ||
    "Job Board";

  const score =
    getMatchScore(
      job,
      state.selectedSkill
    );

  const saved =
    isSaved(job);

  const description =
    text(job.description) ||
    "No job description available.";

  const skills =
    extractSkills(job);


  return `
    <article
      class="job-card ${saved ? "saved" : ""}"
      data-job-id="${escapeHTML(id)}"
    >

      <div class="job-card-header">

        <div>
          <h3>
            ${escapeHTML(title)}
          </h3>

          <div class="job-company">
            ${escapeHTML(company)}
          </div>
        </div>

        <div class="job-score">
          ${score}% MATCH
        </div>

      </div>


      <div class="job-meta">

        <span>
          ${escapeHTML(location)}
        </span>

        <span>
          ${escapeHTML(source)}
        </span>

        ${
          job.job_type
            ? `<span>${escapeHTML(job.job_type)}</span>`
            : ""
        }

        ${
          job.work_mode
            ? `<span>${escapeHTML(job.work_mode)}</span>`
            : ""
        }

      </div>


      <div class="job-description">
        ${escapeHTML(description)}
      </div>


      ${
        skills.length
          ? `
            <div class="job-skills">

              ${skills
                .slice(0, 5)
                .map(
                  (skill) =>
                    `<span class="skill-chip">
                      ${escapeHTML(skill)}
                    </span>`
                )
                .join("")}

            </div>
          `
          : ""
      }


      <div class="match-box">

        <div class="match-top">
          <span>Match score</span>
          <strong>${score}%</strong>
        </div>

        <div class="progress">
          <div
            class="progress-bar"
            style="width:${score}%"
          ></div>
        </div>

      </div>


      ${
        getStatus(job)
          ? `
            <span class="status-badge">
              ${escapeHTML(
                getStatus(job).toUpperCase()
              )}
            </span>
          `
          : ""
      }


      <div class="job-actions">

        <button
          type="button"
          class="view-job"
          data-action="view"
          data-id="${escapeHTML(id)}"
        >
          View Details
        </button>

        <button
          type="button"
          class="save-job"
          data-action="save"
          data-id="${escapeHTML(id)}"
        >
          ${saved ? "Saved ✓" : "Save Job"}
        </button>

      </div>

    </article>
  `;
}


/* =========================
   EXTRACT SKILLS
========================= */

function extractSkills(job) {

  if (Array.isArray(job.skills)) {
    return job.skills
      .map(text)
      .filter(Boolean);
  }

  const raw =
    text(job.skills) ||
    text(job.requirements);

  if (!raw) return [];

  return raw
    .split(/[,|•;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}


/* =========================
   FIND JOB BY ID
========================= */

function findJob(id) {

  return state.jobs.find(
    (job) =>
      getId(job) === id
  );
}


/* =========================
   SAVE JOB
========================= */

function toggleSave(job) {

  if (!job) return;

  const id = getId(job);

  const index =
    state.saved.indexOf(id);


  if (index >= 0) {

    state.saved.splice(index, 1);

    showToast("Removed from Saved Jobs");

  } else {

    state.saved.push(id);

    showToast("Job saved ✓");
  }


  saveLocalData();

  renderJobs();

  updateDashboard();
  renderTracker();
}


/* =========================
   OPEN JOB MODAL
========================= */

function openJob(job) {

  if (!job) return;

  state.current = job;


  const title =
    $("#mTitle");

  const company =
    $("#mCompany");

  const meta =
    $("#mMeta");

  const score =
    $("#mScore");

  const bar =
    $("#mBar");

  const reasons =
    $("#mReasons");

  const skills =
    $("#mSkills");

  const description =
    $("#mDescription");

  const status =
    $("#mStatus");

  const modal =
    $("#modal");


  const matchScore =
    getMatchScore(
      job,
      state.selectedSkill
    );


  if (title) {
    title.textContent =
      text(job.title) ||
      "Job Details";
  }

  if (company) {
    company.textContent =
      text(job.company) ||
      "Company";
  }

  if (meta) {
    meta.textContent =
      [
        text(job.location),
        text(job.source),
        text(job.date_posted)
      ]
        .filter(Boolean)
        .join(" • ");
  }

  if (score) {
    score.textContent =
      `${matchScore}%`;
  }

  if (bar) {
    bar.style.width =
      `${matchScore}%`;
  }


  if (description) {
    description.textContent =
      text(job.description) ||
      "No description available.";
  }


  if (skills) {

    skills.innerHTML =
      extractSkills(job)
        .map(
          (skill) =>
            `<span class="skill-chip">
              ${escapeHTML(skill)}
            </span>`
        )
        .join("");
  }


  if (reasons) {

    const reasonList = [];

    if (state.selectedSkill) {

      if (
        skillMatchesJob(
          job,
          state.selectedSkill
        )
      ) {
        reasonList.push(
          `Matches your selected skill: ${state.selectedSkill.toUpperCase()}`
        );
      }
    }

    if (job.location) {
      reasonList.push(
        `Location: ${job.location}`
      );
    }

    if (matchScore >= 80) {
      reasonList.push(
        "Strong profile match"
      );
    }

    if (!reasonList.length) {
      reasonList.push(
        "Relevant opportunity from your current job dataset"
      );
    }

    reasons.innerHTML =
      reasonList
        .map(
          (reason) =>
            `<li>${escapeHTML(reason)}</li>`
        )
        .join("");
  }


  if (status) {
    status.value =
      getStatus(job);
  }


  if (modal) {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
}


/* =========================
   CLOSE MODAL
========================= */

function closeModal() {

  const modal =
    $("#modal");

  if (modal) {
    modal.hidden = true;
  }

  document.body.style.overflow = "";
}


/* =========================
   JOB EVENT DELEGATION
========================= */

function bindJobEvents() {

  const results =
    $("#results");

  if (!results) return;


  results.addEventListener(
    "click",
    (event) => {

      const button =
        event.target.closest(
          "[data-action]"
        );

      if (!button) return;


      const id =
        button.dataset.id;

      const job =
        findJob(id);

      if (!job) return;


      if (
        button.dataset.action ===
        "view"
      ) {
        openJob(job);
      }


      if (
        button.dataset.action ===
        "save"
      ) {
        toggleSave(job);
      }

    }
  );
}


/* =========================
   MODAL EVENTS
========================= */

function bindModalEvents() {

  const close =
    $("#closeModal");

  if (close) {
    close.addEventListener(
      "click",
      closeModal
    );
  }


  const overlay =
    $(".modal-overlay");

  if (overlay) {
    overlay.addEventListener(
      "click",
      closeModal
    );
  }


  const save =
    $("#mSave");

  if (save) {

    save.addEventListener(
      "click",
      () => {

        if (!state.current) return;

        toggleSave(
          state.current
        );
      }
    );
  }


  const status =
    $("#mStatus");

  if (status) {

    status.addEventListener(
      "change",
      () => {

        if (!state.current) return;

        setApplicationStatus(
          state.current,
          status.value
        );

      }
    );
  }


  const open =
    $("#mOpen");

  if (open) {

    open.addEventListener(
      "click",
      () => {

        if (!state.current) return;

        const url =
          state.current.job_url ||
          state.current.url ||
          state.current.link;

        if (url) {
          window.open(
            url,
            "_blank",
            "noopener,noreferrer"
          );
        } else {
          showToast(
            "Job link not available"
          );
        }

      }
    );
  }
}


/* =========================
   APPLICATION STATUS
========================= */

function setApplicationStatus(
  job,
  status
) {

  const id =
    getId(job);

  if (!status) {

    delete state.apps[id];

  } else {

    state.apps[id] =
      status;
  }


  saveLocalData();

  renderJobs();
  renderTracker();
  updateDashboard();

  showToast(
    status
      ? `Status: ${status}`
      : "Status cleared"
  );
}/* =========================
   APPLICATION TRACKER
========================= */

function renderTracker() {

  const columns = {
    saved: $("#colSaved"),
    applied: $("#colApplied"),
    interview: $("#colInterview"),
    closed: $("#colClosed")
  };

  const counts = {
    saved: $("#cSaved"),
    applied: $("#cApplied"),
    interview: $("#cInterview"),
    closed: $("#cClosed")
  };


  Object.keys(columns).forEach((status) => {

    const container =
      columns[status];

    if (!container) return;

    let jobs = [];


    if (status === "saved") {

      jobs = state.jobs.filter(
        (job) =>
          isSaved(job) &&
          !state.apps[getId(job)]
      );

    } else {

      jobs = state.jobs.filter(
        (job) =>
          getStatus(job) === status
      );

    }


    if (counts[status]) {
      counts[status].textContent =
        jobs.length;
    }


    if (!jobs.length) {

      container.innerHTML = `
        <div class="tracker-empty">
          No jobs here yet
        </div>
      `;

      return;
    }


    container.innerHTML =
      jobs
        .map((job) => {

          const score =
            getMatchScore(
              job,
              state.selectedSkill
            );

          return `
            <div
              class="tracker-item"
              data-tracker-id="${escapeHTML(
                getId(job)
              )}"
            >

              <h4>
                ${escapeHTML(
                  job.title ||
                  "Untitled Job"
                )}
              </h4>

              <p>
                ${escapeHTML(
                  job.company ||
                  "Company"
                )}
              </p>

              <span class="tracker-score">
                ${score}% match
              </span>

            </div>
          `;

        })
        .join("");
  });
}


/* =========================
   TRACKER CLICK
========================= */

function bindTrackerEvents() {

  const tracker =
    $(".tracker-grid");

  if (!tracker) return;


  tracker.addEventListener(
    "click",
    (event) => {

      const item =
        event.target.closest(
          "[data-tracker-id]"
        );

      if (!item) return;

      const job =
        findJob(
          item.dataset.trackerId
        );

      if (job) {
        openJob(job);
      }

    }
  );
}


/* =========================
   SAVED JOBS BUTTON
========================= */

function showSavedJobs() {

  const saved =
    state.jobs.filter(
      (job) => isSaved(job)
    );

  state.filtered =
    saved;

  renderJobs();
  updateResultCount();

  goToPage("jobs");

  showToast(
    `${saved.length} saved job(s)`
  );
}


/* =========================
   AVOID JOBS
========================= */

function renderAvoidJobs() {

  const container =
    $("#avoidList");

  if (!container) return;


  if (!state.avoid.length) {

    container.innerHTML = `
      <span class="avoid-item">
        No avoided companies yet
      </span>
    `;

    return;
  }


  container.innerHTML =
    state.avoid
      .map(
        (company) => `
          <span class="avoid-item">
            ${escapeHTML(company)}
          </span>
        `
      )
      .join("");
}


/* =========================
   AVOID COMPANY
========================= */

function avoidCompany(company) {

  const name =
    text(company);

  if (!name) return;


  const exists =
    state.avoid.some(
      (item) =>
        lower(item) ===
        lower(name)
    );


  if (!exists) {

    state.avoid.push(name);

    saveLocalData();

    renderAvoidJobs();

    showToast(
      `${name} added to Avoid Jobs`
    );

  }


  /* Remove company from current results */

  state.filtered =
    state.filtered.filter(
      (job) =>
        lower(job.company) !==
        lower(name)
    );

  renderJobs();
}


/* =========================
   DASHBOARD
========================= */

function updateDashboard() {

  const total =
    $("#totalJobs");

  const recent =
    $("#recentJobs");

  const saved =
    $("#savedJobs");

  const strong =
    $("#strongMatches");


  if (total) {
    total.textContent =
      state.jobs.length;
  }


  if (saved) {
    saved.textContent =
      state.saved.length;
  }


  if (recent) {

    const today =
      new Date();

    const recentJobs =
      state.jobs.filter(
        (job) => {

          const date =
            new Date(
              job.date_posted
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return false;
          }

          const difference =
            today.getTime() -
            date.getTime();

          return (
            difference <=
            7 *
              24 *
              60 *
              60 *
              1000
          );
        }
      );

    recent.textContent =
      recentJobs.length;
  }


  if (strong) {

    const strongMatches =
      state.jobs.filter(
        (job) =>
          getMatchScore(
            job,
            state.selectedSkill
          ) >= 80
      );

    strong.textContent =
      strongMatches.length;
  }


  updateBestOpportunity(
    state.selectedSkill
  );
}


/* =========================
   NAVIGATION
========================= */

function goToPage(page) {

  $$(".page").forEach(
    (section) => {

      section.classList.remove(
        "active"
      );
    }
  );


  const target =
    $(`#page-${page}`);

  if (target) {
    target.classList.add(
      "active"
    );
  }


  $$("[data-page]").forEach(
    (button) => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    }
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  if (page === "tracker") {
    renderTracker();
  }

  if (page === "jobs") {
    renderJobs();
  }
}


/* =========================
   NAV EVENTS
========================= */

function bindNavigation() {

  $$("[data-page]").forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          goToPage(
            button.dataset.page
          );

        }
      );

    }
  );
}


/* =========================
   TOAST
========================= */

let toastTimer = null;

function showToast(message) {

  const toast =
    $("#toast");

  if (!toast) return;

  toast.textContent =
    message;

  toast.hidden = false;


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {
        toast.hidden = true;
      },
      2200
    );
}


/* =========================
   INITIAL EVENTS
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    bindTrackerEvents();

    bindNavigation();

    renderAvoidJobs();

  }
);/* =========================
   RESUME HANDLER
========================= */

function bindResumeEvents() {

  const fileInput =
    $("#resumeFile");

  if (!fileInput) return;


  fileInput.addEventListener(
    "change",
    () => {

      const file =
        fileInput.files?.[0];

      if (!file) return;


      const name =
        $("#resumeName");

      if (name) {
        name.textContent =
          `Selected: ${file.name}`;
      }


      /*
        Browser-only resume handling.
        We do not upload the file anywhere.
      */

      calculateProfileScore(file);

      showToast(
        "Resume added ✓"
      );
    }
  );
}


/* =========================
   PROFILE SCORE
========================= */

function calculateProfileScore(file) {

  let score = 35;


  /* File exists */

  if (file) {
    score += 15;
  }


  /* Resume file type */

  if (
    file &&
    (
      file.type ===
        "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf")
    )
  ) {
    score += 10;
  }


  /* Existing job skills */

  const skills =
    collectUserSkills();

  if (skills.length >= 3) {
    score += 15;
  }

  if (skills.length >= 5) {
    score += 10;
  }


  score =
    Math.min(
      100,
      score
    );


  const scoreElement =
    $("#profileScore");

  const bar =
    $("#profileBar");


  if (scoreElement) {
    scoreElement.textContent =
      `${score}%`;
  }


  if (bar) {
    bar.style.width =
      `${score}%`;
  }


  updateRoadmap(
    skills
  );
}


/* =========================
   COLLECT USER SKILLS
========================= */

function collectUserSkills() {

  const skills =
    new Set();


  /*
    Selected skill
  */

  if (state.selectedSkill) {
    skills.add(
      state.selectedSkill
    );
  }


  /*
    Common skills from
    currently relevant jobs
  */

  state.jobs
    .slice(0, 50)
    .forEach((job) => {

      extractSkills(job)
        .slice(0, 4)
        .forEach((skill) => {

          if (skill) {
            skills.add(
              lower(skill)
            );
          }

        });

    });


  return Array.from(
    skills
  );
}


/* =========================
   SKILL GAP + ROADMAP
========================= */

function updateRoadmap(
  userSkills = []
) {

  const roadmap =
    document.querySelector(
      ".roadmap"
    );

  if (!roadmap) return;


  const selected =
    state.selectedSkill;


  let steps = [];


  if (selected === "iot") {

    steps = [
      [
        "01",
        "IoT fundamentals",
        "Learn sensors, actuators, GPIO and basic IoT architecture."
      ],
      [
        "02",
        "ESP32",
        "Practice ESP32 programming and connecting real sensors."
      ],
      [
        "03",
        "MQTT",
        "Understand device-to-cloud communication using MQTT."
      ],
      [
        "04",
        "Cloud dashboard",
        "Build a small IoT dashboard using Firebase or another backend."
      ]
    ];

  } else if (
    selected === "embedded"
  ) {

    steps = [
      [
        "01",
        "Microcontrollers",
        "Learn GPIO, timers, interrupts and communication protocols."
      ],
      [
        "02",
        "Embedded C",
        "Practice C programming for microcontrollers."
      ],
      [
        "03",
        "UART / I2C / SPI",
        "Build small sensor projects using common interfaces."
      ],
      [
        "04",
        "RTOS basics",
        "Learn tasks, scheduling and real-time concepts."
      ]
    ];

  } else if (
    selected === "python"
  ) {

    steps = [
      [
        "01",
        "Python fundamentals",
        "Strengthen functions, collections and object-oriented programming."
      ],
      [
        "02",
        "Data handling",
        "Practice Pandas, NumPy and CSV/JSON processing."
      ],
      [
        "03",
        "APIs",
        "Learn REST APIs and backend integration."
      ],
      [
        "04",
        "Projects",
        "Build one complete Python project for your portfolio."
      ]
    ];

  } else {

    steps = [
      [
        "01",
        "Core fundamentals",
        "Strengthen the fundamentals of your selected career skill."
      ],
      [
        "02",
        "Hands-on practice",
        "Build small practical projects using that skill."
      ],
      [
        "03",
        "Portfolio",
        "Document your projects with clear results and screenshots."
      ],
      [
        "04",
        "Interview preparation",
        "Practice technical questions and project explanations."
      ]
    ];
  }


  const list =
    roadmap.querySelector(
      ".roadmap-list"
    );


  if (!list) return;


  list.innerHTML =
    steps
      .map(
        (step) => `
          <div class="roadmap-item">

            <div class="roadmap-number">
              ${step[0]}
            </div>

            <div>
              <h3>
                ${escapeHTML(step[1])}
              </h3>

              <p>
                ${escapeHTML(step[2])}
              </p>
            </div>

          </div>
        `
      )
      .join("");
}


/* =========================
   PROFILE EVENTS
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    bindResumeEvents();

  }
);/* =========================
   SAVED JOBS
========================= */

function bindSavedEvents() {

  const savedButton =
    $("#showSaved");

  if (savedButton) {

    savedButton.addEventListener(
      "click",
      showSavedJobs
    );

  }
}


/* =========================
   EXPORT CSV
========================= */

function exportJobsCSV() {

  const jobs =
    state.filtered.length
      ? state.filtered
      : state.jobs;


  if (!jobs.length) {

    showToast(
      "No jobs to export"
    );

    return;
  }


  const headers = [
    "Title",
    "Company",
    "Location",
    "Source",
    "Date Posted",
    "Match Score",
    "Status",
    "URL"
  ];


  const rows =
    jobs.map((job) => [

      job.title || "",

      job.company || "",

      job.location || "",

      job.source || "",

      job.date_posted || "",

      getMatchScore(
        job,
        state.selectedSkill
      ),

      getStatus(job) || "",

      job.job_url ||
      job.url ||
      job.link ||
      ""

    ]);


  const csv = [
    headers,
    ...rows
  ]
    .map((row) =>
      row
        .map(csvEscape)
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
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "job-radar-jobs.csv";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);


  showToast(
    "CSV exported ✓"
  );
}


/* =========================
   CSV ESCAPE
========================= */

function csvEscape(value) {

  const clean =
    String(value ?? "")
      .replace(/"/g, '""');

  return `"${clean}"`;
}


/* =========================
   EXPORT EVENT
========================= */

function bindExportEvents() {

  const exportButton =
    $("#exportCSV");

  if (exportButton) {

    exportButton.addEventListener(
      "click",
      exportJobsCSV
    );

  }
}


/* =========================
   KEYBOARD SUPPORT
========================= */

function bindKeyboardEvents() {

  document.addEventListener(
    "keydown",
    (event) => {

      /*
        ESC closes job modal
      */

      if (
        event.key === "Escape"
      ) {

        closeModal();

      }

    }
  );
}


/* =========================
   AVOID LIST CLICK
========================= */

function bindAvoidEvents() {

  const avoidList =
    $("#avoidList");

  if (!avoidList) return;


  avoidList.addEventListener(
    "click",
    (event) => {

      const item =
        event.target.closest(
          "[data-company]"
        );

      if (!item) return;

      avoidCompany(
        item.dataset.company
      );

    }
  );
}


/* =========================
   FINAL INITIALIZATION
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
      Main UI
    */

    bindSavedEvents();

    bindExportEvents();

    bindKeyboardEvents();

    bindAvoidEvents();


    /*
      Initial dashboard
    */

    updateDashboard();

    renderTracker();

    renderAvoidJobs();

  }
);