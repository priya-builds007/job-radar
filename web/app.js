/* =========================================
   JOB RADAR — APP.JS
   PART 17 — CORE STATE + HELPERS
========================================= */

"use strict";


/* =========================================
   GLOBAL STATE
========================================= */

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

  selectedSkill:
    localStorage.getItem("jobRadarSkill") || ""
};


/* =========================================
   DOM HELPERS
========================================= */

const $ = (selector) =>
  document.querySelector(selector);


const $$ = (selector) =>
  [...document.querySelectorAll(selector)];


/* =========================================
   LOCAL STORAGE
========================================= */

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

  localStorage.setItem(
    "jobRadarSkill",
    state.selectedSkill
  );
}


/* =========================================
   BASIC HELPERS
========================================= */

function text(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}


function lower(value) {

  return text(value)
    .toLowerCase()
    .trim();
}


function escapeHTML(value) {

  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================
   JOB ID
========================================= */

function getId(job) {

  return text(
    job.id ||
    job.job_id ||
    job.url ||
    job.job_url ||
    job.link ||
    `${job.title}-${job.company}`
  )
    .trim();
}


/* =========================================
   SAVED / STATUS
========================================= */

function isSaved(job) {

  return state.saved.includes(
    getId(job)
  );
}


function getStatus(job) {

  return (
    state.apps[getId(job)] ||
    (isSaved(job) ? "saved" : "")
  );
}


/* =========================================
   JOB TEXT
========================================= */

function getJobText(job) {

  return [
    job.title,
    job.company,
    job.location,
    job.description,
    job.skills,
    job.requirements,
    job.category,
    job.job_type,
    job.work_mode
  ]
    .map(text)
    .join(" ")
    .toLowerCase();
}


/* =========================================
   SKILL KEYWORDS
========================================= */

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


/* =========================================
   SKILL MATCH
========================================= */

function skillMatchesJob(job, skill) {

  if (!skill) {
    return false;
  }

  const keywords =
    skillKeywords[skill] || [];

  const jobText =
    getJobText(job);

  return keywords.some(
    keyword =>
      jobText.includes(
        keyword.toLowerCase()
      )
  );
}


/* =========================================
   GET MATCH SCORE
========================================= */

function getMatchScore(
  job,
  selectedSkill = ""
) {

  const rawScore =
    Number(
      job.match_score ??
      job.score ??
      job.match ??
      0
    );

  const baseScore =
    Number.isFinite(rawScore)
      ? rawScore
      : 0;

  if (!selectedSkill) {

    return Math.max(
      0,
      Math.min(100, baseScore)
    );
  }

  if (
    skillMatchesJob(
      job,
      selectedSkill
    )
  ) {

    return Math.max(
      60,
      Math.min(
        100,
        baseScore + 15
      )
    );
  }

  return Math.max(
    0,
    Math.min(100, baseScore)
  );
}


/* =========================================
   TOAST
========================================= */

let toastTimer = null;


function showToast(message) {

  const toast = $("#toast");

  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {

    toast.classList.remove("show");

  }, 2200);
}/* =========================================
   PART 18 — LOAD JOB DATA
========================================= */

async function loadJobs() {

  try {

    updateLiveStatus("SYNCING");

    const response = await fetch(
      "../data/processed_jobs.json",
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();


    /* -----------------------------------------
       SUPPORT BOTH JSON FORMATS
    ----------------------------------------- */

    let jobs = [];

    if (Array.isArray(data)) {

      jobs = data;

    } else if (
      data &&
      Array.isArray(data.jobs)
    ) {

      jobs = data.jobs;
    }


    /* -----------------------------------------
       CLEAN JOB DATA
    ----------------------------------------- */

    state.jobs = jobs
      .filter(Boolean)
      .map((job, index) => ({

        ...job,

        id:
          job.id ||
          job.job_id ||
          job.url ||
          job.job_url ||
          `job-${index}`

      }));


    /* -----------------------------------------
       REMOVE AVOIDED JOBS
    ----------------------------------------- */

    state.jobs =
      state.jobs.filter(
        job =>
          !state.avoid.includes(
            getId(job)
          )
      );


    /* -----------------------------------------
       UPDATE UI
    ----------------------------------------- */

    updateLiveStatus("LIVE");

    updateDashboard();

    applyFilters();

    renderTracker();

    renderAvoidJobs();

    updateBestOpportunity(
      state.selectedSkill
    );


  } catch (error) {

    console.error(
      "Job Radar data error:",
      error
    );

    updateLiveStatus("OFFLINE");

    state.jobs = [];

    state.filtered = [];

    const results =
      $("#results");

    if (results) {

      results.innerHTML = "";
    }

    const empty =
      $("#emptyState");

    if (empty) {

      empty.style.display = "block";

      const title =
        empty.querySelector("h3");

      const message =
        empty.querySelector("p");

      if (title) {

        title.textContent =
          "Unable to load jobs";
      }

      if (message) {

        message.textContent =
          "Check processed_jobs.json and refresh the page.";
      }
    }
  }
}


/* =========================================
   LIVE STATUS
========================================= */

function updateLiveStatus(status = "LIVE") {

  const element =
    $("#liveStatus");

  if (!element) {
    return;
  }

  element.textContent =
    status;


  element.classList.remove(
    "online",
    "offline",
    "syncing"
  );


  if (status === "LIVE") {

    element.classList.add(
      "online"
    );

  } else if (status === "SYNCING") {

    element.classList.add(
      "syncing"
    );

  } else {

    element.classList.add(
      "offline"
    );
  }
}


/* =========================================
   JOB DATE HELPER
========================================= */

function getJobDate(job) {

  const value =
    job.date_posted ||
    job.posted_date ||
    job.posted ||
    job.created_at ||
    job.date ||
    "";

  if (!value) {

    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;
  }

  return date;
}


/* =========================================
   RECENT JOB CHECK
========================================= */

function isRecentJob(
  job,
  days = 7
) {

  const date =
    getJobDate(job);

  if (!date) {

    return false;
  }

  const now =
    new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const maxAge =
    days *
    24 *
    60 *
    60 *
    1000;

  return (
    difference >= 0 &&
    difference <= maxAge
  );
}


/* =========================================
   FORMAT JOB DATE
========================================= */

function formatJobDate(job) {

  const date =
    getJobDate(job);

  if (!date) {

    return "Date not available";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}/* =========================================
   PART 19 — DASHBOARD + TOP SKILLS
========================================= */


/* =========================================
   EXTRACT SKILLS FROM JOB
========================================= */

function extractSkills(job) {

  const jobText =
    getJobText(job);

  const found = [];

  Object.keys(skillKeywords)
    .forEach(skill => {

      const keywords =
        skillKeywords[skill];

      const matched =
        keywords.some(keyword =>
          jobText.includes(
            keyword.toLowerCase()
          )
        );

      if (matched) {

        found.push(skill);
      }
    });

  return found;
}


/* =========================================
   UPDATE DASHBOARD
========================================= */

function updateDashboard() {

  const jobs =
    state.jobs || [];


  /* -----------------------------------------
     TOTAL JOBS
  ----------------------------------------- */

  const total =
    $("#totalJobs");

  if (total) {

    total.textContent =
      jobs.length;
  }


  /* -----------------------------------------
     RECENT JOBS
  ----------------------------------------- */

  const recentCount =
    jobs.filter(job =>
      isRecentJob(job, 7)
    ).length;

  const recent =
    $("#recentJobs");

  if (recent) {

    recent.textContent =
      recentCount;
  }


  /* -----------------------------------------
     SAVED JOBS
  ----------------------------------------- */

  const savedCount =
    jobs.filter(job =>
      isSaved(job)
    ).length;

  const saved =
    $("#savedJobs");

  if (saved) {

    saved.textContent =
      savedCount;
  }


  /* -----------------------------------------
     STRONG MATCHES
  ----------------------------------------- */

  const strongCount =
    jobs.filter(job =>
      getMatchScore(
        job,
        state.selectedSkill
      ) >= 80
    ).length;

  const strong =
    $("#strongMatches");

  if (strong) {

    strong.textContent =
      strongCount;
  }


  /* -----------------------------------------
     TOP SKILLS
  ----------------------------------------- */

  renderTopSkills();
}


/* =========================================
   RENDER TOP SKILLS
========================================= */

function renderTopSkills() {

  const container =
    $("#topSkills");

  if (!container) {

    return;
  }


  const counts = {};


  /* -----------------------------------------
     COUNT SKILLS
  ----------------------------------------- */

  state.jobs.forEach(job => {

    const skills =
      extractSkills(job);

    skills.forEach(skill => {

      counts[skill] =
        (counts[skill] || 0) + 1;
    });
  });


  const sorted =
    Object.entries(counts)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 6);


  /* -----------------------------------------
     EMPTY STATE
  ----------------------------------------- */

  if (!sorted.length) {

    container.innerHTML = `
      <div class="skill-chip">
        No skill data yet
      </div>
    `;

    return;
  }


  /* -----------------------------------------
     DISPLAY SKILLS
  ----------------------------------------- */

  container.innerHTML =
    sorted
      .map(
        ([skill, count]) => `
          <span
            class="skill-chip"
            title="${escapeHTML(
              count + " matching jobs"
            )}"
          >
            ${escapeHTML(
              skill.toUpperCase()
            )}
            · ${count}
          </span>
        `
      )
      .join("");
}


/* =========================================
   SAVE JOB
========================================= */

function saveJob(job) {

  const id =
    getId(job);

  if (!id) {

    return;
  }


  if (
    state.saved.includes(id)
  ) {

    state.saved =
      state.saved.filter(
        savedId =>
          savedId !== id
      );

    showToast(
      "Job removed from saved list"
    );

  } else {

    state.saved.push(id);

    showToast(
      "Job saved"
    );
  }


  saveLocalData();

  updateDashboard();

  renderJobs(
    state.filtered
  );

  renderTracker();
}


/* =========================================
   CHANGE APPLICATION STATUS
========================================= */

function setJobStatus(
  job,
  status
) {

  const id =
    getId(job);

  if (!id) {

    return;
  }


  if (status === "saved") {

    if (
      !state.saved.includes(id)
    ) {

      state.saved.push(id);
    }

    delete state.apps[id];

  } else if (
    ["applied", "interview", "closed"]
      .includes(status)
  ) {

    state.apps[id] =
      status;

    if (
      !state.saved.includes(id)
    ) {

      state.saved.push(id);
    }

  } else {

    delete state.apps[id];

    state.saved =
      state.saved.filter(
        savedId =>
          savedId !== id
      );
  }


  saveLocalData();

  updateDashboard();

  renderJobs(
    state.filtered
  );

  renderTracker();

  showToast(
    `Status updated: ${status}`
  );
}/* =========================================
   PART 20 — BEST OPPORTUNITY / SKILL MATCH
========================================= */


/* =========================================
   SKILL CHANGE
========================================= */

function handleSkillChange(skill) {

  state.selectedSkill =
    lower(skill);

  saveLocalData();

  updateBestOpportunity(
    state.selectedSkill
  );

  updateDashboard();

  applyFilters();
}


/* =========================================
   FIND BEST OPPORTUNITY
========================================= */

function updateBestOpportunity(
  skill = ""
) {

  const container =
    $("#nextJob");

  if (!container) {

    return;
  }


  let candidates =
    [...state.jobs];


  /* -----------------------------------------
     REMOVE AVOIDED JOBS
  ----------------------------------------- */

  candidates =
    candidates.filter(job =>
      !state.avoid.includes(
        getId(job)
      )
    );


  /* -----------------------------------------
     IF SKILL SELECTED,
     SHOW MATCHING JOBS FIRST
  ----------------------------------------- */

  if (skill) {

    const matching =
      candidates.filter(job =>
        skillMatchesJob(
          job,
          skill
        )
      );


    /*
      If matching jobs exist,
      use ONLY those jobs.

      This prevents selecting IoT
      and getting an unrelated
      Software Developer job.
    */

    if (matching.length) {

      candidates =
        matching;
    }
  }


  /* -----------------------------------------
     SORT BY SKILL-AWARE SCORE
  ----------------------------------------- */

  candidates.sort(
    (a, b) =>
      getMatchScore(b, skill) -
      getMatchScore(a, skill)
  );


  const best =
    candidates[0];


  /* -----------------------------------------
     EMPTY STATE
  ----------------------------------------- */

  if (!best) {

    container.innerHTML = `
      <div class="agent-placeholder">
        <strong>No matching opportunity</strong>
        <p>
          Try another skill or remove some filters.
        </p>
      </div>
    `;

    return;
  }


  /* -----------------------------------------
     DATA
  ----------------------------------------- */

  const score =
    getMatchScore(
      best,
      skill
    );

  const title =
    text(
      best.title ||
      "Untitled role"
    );

  const company =
    text(
      best.company ||
      "Company not listed"
    );

  const location =
    text(
      best.location ||
      "Location not listed"
    );

  const description =
    text(
      best.description ||
      "No description available."
    );


  /* -----------------------------------------
     WHY THIS JOB?
  ----------------------------------------- */

  let reason =
    "Strong overall match.";

  if (
    skill &&
    skillMatchesJob(
      best,
      skill
    )
  ) {

    reason =
      `Matches your ${skill.toUpperCase()} skill.`;
  }


  /* -----------------------------------------
     RENDER
  ----------------------------------------- */

  container.innerHTML = `

    <div class="agent-job">

      <div class="agent-job-top">

        <div>

          <span class="eyebrow">
            BEST MATCH
          </span>

          <h3>
            ${escapeHTML(title)}
          </h3>

          <p>
            ${escapeHTML(company)}
          </p>

        </div>

        <strong class="agent-score">
          ${score}%
        </strong>

      </div>


      <div class="job-meta">

        <span>
          ${escapeHTML(location)}
        </span>

        <span>
          ${escapeHTML(
            best.job_type ||
            best.jobType ||
            "Role"
          )}
        </span>

      </div>


      <div class="match-box">

        <div class="match-top">

          <span>
            SKILL MATCH
          </span>

          <strong>
            ${score}%
          </strong>

        </div>

        <div class="progress">

          <div
            class="progress-bar"
            style="width:${score}%"
          ></div>

        </div>

      </div>


      <p class="job-description">
        ${escapeHTML(
          description.slice(0, 180)
        )}${description.length > 180 ? "..." : ""}
      </p>


      <div class="agent-reason">

        ${escapeHTML(reason)}

      </div>


      <button
        class="primary agent-open"
        type="button"
        data-id="${escapeHTML(
          getId(best)
        )}"
      >
        Analyze opportunity
      </button>

    </div>
  `;
}


/* =========================================
   ANALYZE BEST OPPORTUNITY
========================================= */

function analyzeBestOpportunity() {

  const skill =
    state.selectedSkill;

  let candidates =
    [...state.jobs];


  if (skill) {

    const matching =
      candidates.filter(job =>
        skillMatchesJob(
          job,
          skill
        )
      );

    if (matching.length) {

      candidates =
        matching;
    }
  }


  candidates.sort(
    (a, b) =>
      getMatchScore(b, skill) -
      getMatchScore(a, skill)
  );


  const best =
    candidates[0];


  if (!best) {

    showToast(
      "No matching job found"
    );

    return;
  }


  openJobModal(best);
}


/* =========================================
   AGENT BUTTON
========================================= */

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        ".agent-open"
      );

    if (!button) {

      return;
    }


    const id =
      button.dataset.id;


    const job =
      state.jobs.find(
        item =>
          getId(item) === id
      );


    if (job) {

      openJobModal(job);
    }
  }
);/* =========================================
   PART 21 — FILTERS
========================================= */


/* =========================================
   APPLY FILTERS
========================================= */

function applyFilters() {

  const search =
    lower($("#search")?.value);

  const location =
    lower($("#location")?.value);

  const jobType =
    lower($("#jobType")?.value);

  const workMode =
    lower($("#workMode")?.value);

  const posted =
    lower($("#posted")?.value);

  const skill =
    lower(
      $("#skill")?.value ||
      state.selectedSkill
    );

  const appStatus =
    lower($("#appStatus")?.value);

  const minimum =
    Number(
      $("#minimum")?.value || 0
    );

  const sort =
    lower(
      $("#sort")?.value ||
      "recent"
    );


  /* -----------------------------------------
     FILTER JOBS
  ----------------------------------------- */

  let filtered =
    state.jobs.filter(job => {

      const jobText =
        getJobText(job);

      /* SEARCH */

      if (
        search &&
        !jobText.includes(search)
      ) {

        return false;
      }


      /* LOCATION */

      if (location) {

        const jobLocation =
          lower(
            job.location
          );

        if (
          !jobLocation.includes(
            location
          )
        ) {

          return false;
        }
      }


      /* JOB TYPE */

      if (jobType) {

        const type =
          lower(
            job.job_type ||
            job.jobType ||
            job.type
          );

        if (
          !type.includes(jobType)
        ) {

          return false;
        }
      }


      /* WORK MODE */

      if (workMode) {

        const mode =
          lower(
            job.work_mode ||
            job.workMode ||
            job.mode
          );

        if (
          !mode.includes(workMode)
        ) {

          return false;
        }
      }


      /* POSTED DATE */

      if (posted) {

        const days = {

          today: 1,

          last3: 3,

          last7: 7,

          last30: 30

        }[posted];


        if (
          days &&
          !isRecentJob(
            job,
            days
          )
        ) {

          return false;
        }
      }


      /* SKILL */

      if (
        skill &&
        !skillMatchesJob(
          job,
          skill
        )
      ) {

        return false;
      }


      /* APPLICATION STATUS */

      if (appStatus) {

        const status =
          getStatus(job);

        if (
          status !== appStatus
        ) {

          return false;
        }
      }


      /* MINIMUM SCORE */

      if (minimum) {

        const score =
          getMatchScore(
            job,
            skill
          );

        if (
          score < minimum
        ) {

          return false;
        }
      }


      return true;
    });


  /* -----------------------------------------
     SORT
  ----------------------------------------- */

  if (sort === "best") {

    filtered.sort(
      (a, b) =>
        getMatchScore(b, skill) -
        getMatchScore(a, skill)
    );

  } else if (
    sort === "company"
  ) {

    filtered.sort(
      (a, b) =>
        text(a.company)
          .localeCompare(
            text(b.company)
          )
    );

  } else {

    filtered.sort(
      (a, b) => {

        const dateA =
          getJobDate(a)?.getTime() || 0;

        const dateB =
          getJobDate(b)?.getTime() || 0;

        return dateB - dateA;
      }
    );
  }


  state.filtered =
    filtered;


  /* -----------------------------------------
     RENDER
  ----------------------------------------- */

  renderJobs(
    state.filtered
  );


  const count =
    $("#resultCount");

  if (count) {

    count.textContent =
      `${state.filtered.length} jobs found`;
  }
}


/* =========================================
   CLEAR FILTERS
========================================= */

function clearFilters() {

  [
    "#search",
    "#location",
    "#jobType",
    "#workMode",
    "#posted",
    "#skill",
    "#appStatus",
    "#minimum"
  ]
    .forEach(selector => {

      const element =
        $(selector);

      if (element) {

        element.value = "";
      }
    });


  const sort =
    $("#sort");

  if (sort) {

    sort.value = "recent";
  }


  state.selectedSkill = "";

  saveLocalData();

  updateBestOpportunity("");

  applyFilters();

  updateDashboard();

  showToast(
    "Filters cleared"
  );
}


/* =========================================
   SHOW SAVED JOBS
========================================= */

function showSavedJobs() {

  const status =
    $("#appStatus");

  if (status) {

    status.value = "saved";
  }

  applyFilters();

  showToast(
    "Showing saved jobs"
  );
}/* =========================================
   PART 22 — RENDER JOB CARDS
========================================= */


/* =========================================
   RENDER JOBS
========================================= */

function renderJobs(jobs) {

  const container =
    $("#results");

  const emptyState =
    $("#emptyState");


  if (!container) {

    return;
  }


  /* -----------------------------------------
     EMPTY STATE
  ----------------------------------------- */

  if (!jobs.length) {

    container.innerHTML = "";

    if (emptyState) {

      emptyState.style.display =
        "block";
    }

    return;
  }


  if (emptyState) {

    emptyState.style.display =
      "none";
  }


  /* -----------------------------------------
     JOB CARDS
  ----------------------------------------- */

  container.innerHTML =
    jobs
      .map(job =>
        createJobCard(job)
      )
      .join("");
}


/* =========================================
   CREATE JOB CARD
========================================= */

function createJobCard(job) {

  const id =
    getId(job);

  const title =
    text(
      job.title ||
      "Untitled role"
    );

  const company =
    text(
      job.company ||
      "Company not listed"
    );

  const location =
    text(
      job.location ||
      "Location not listed"
    );

  const description =
    text(
      job.description ||
      "No description available."
    );

  const score =
    getMatchScore(
      job,
      state.selectedSkill
    );

  const saved =
    isSaved(job);

  const status =
    getStatus(job);


  /* -----------------------------------------
     SKILLS
  ----------------------------------------- */

  let skills = [];

  if (
    Array.isArray(job.skills)
  ) {

    skills =
      job.skills
        .map(text)
        .filter(Boolean)
        .slice(0, 6);

  } else if (
    typeof job.skills === "string"
  ) {

    skills =
      job.skills
        .split(/[,|]/)
        .map(item =>
          item.trim()
        )
        .filter(Boolean)
        .slice(0, 6);
  }


  /* -----------------------------------------
     FALLBACK SKILLS
  ----------------------------------------- */

  if (!skills.length) {

    skills =
      extractSkills(job)
        .slice(0, 6);
  }


  const skillHTML =
    skills.length
      ? skills
          .map(
            skill => `
              <span class="skill-chip">
                ${escapeHTML(skill)}
              </span>
            `
          )
          .join("")
      : `
          <span class="skill-chip">
            General
          </span>
        `;


  /* -----------------------------------------
     STATUS BADGE
  ----------------------------------------- */

  const statusHTML =
    status
      ? `
        <span class="status-badge">
          ${escapeHTML(status)}
        </span>
      `
      : "";


  /* -----------------------------------------
     SAVE BUTTON
  ----------------------------------------- */

  const saveLabel =
    saved
      ? "Saved"
      : "Save";


  /* -----------------------------------------
     RETURN CARD
  ----------------------------------------- */

  return `
    <article
      class="job-card ${saved ? "saved" : ""}"
      data-id="${escapeHTML(id)}"
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
          ${score}%
        </div>

      </div>


      ${statusHTML}


      <div class="job-meta">

        <span>
          ${escapeHTML(location)}
        </span>

        <span>
          ${escapeHTML(
            job.job_type ||
            job.jobType ||
            "Role"
          )}
        </span>

        <span>
          ${escapeHTML(
            formatJobDate(job)
          )}
        </span>

      </div>


      <p class="job-description">

        ${escapeHTML(
          description.length > 180
            ? description.slice(0, 180) + "..."
            : description
        )}

      </p>


      <div class="match-box">

        <div class="match-top">

          <span>
            MATCH SCORE
          </span>

          <strong>
            ${score}%
          </strong>

        </div>

        <div class="progress">

          <div
            class="progress-bar"
            style="width:${score}%"
          ></div>

        </div>

      </div>


      <div class="job-skills">

        ${skillHTML}

      </div>


      <div class="job-actions">

        <button
          class="secondary job-view"
          type="button"
          data-id="${escapeHTML(id)}"
        >
          View
        </button>

        <button
          class="primary job-save"
          type="button"
          data-id="${escapeHTML(id)}"
        >
          ${saveLabel}
        </button>

      </div>

    </article>
  `;
}/* =========================================
   PART 23 — JOB CARD EVENTS
========================================= */


/* =========================================
   FIND JOB BY ID
========================================= */

function findJobById(id) {

  return state.jobs.find(
    job =>
      getId(job) === id
  );
}


/* =========================================
   BIND JOB EVENTS
========================================= */

function bindJobEvents() {

  const results =
    $("#results");

  if (!results) {

    return;
  }


  /* -----------------------------------------
     VIEW / SAVE BUTTONS
     Event delegation keeps this working
     after every filter/render.
  ----------------------------------------- */

  results.addEventListener(
    "click",
    event => {

      const viewButton =
        event.target.closest(
          ".job-view"
        );

      const saveButton =
        event.target.closest(
          ".job-save"
        );


      /* ---------------------------------------
         VIEW JOB
      --------------------------------------- */

      if (viewButton) {

        const id =
          viewButton.dataset.id;

        const job =
          findJobById(id);

        if (job) {

          openJobModal(job);
        }

        return;
      }


      /* ---------------------------------------
         SAVE JOB
      --------------------------------------- */

      if (saveButton) {

        const id =
          saveButton.dataset.id;

        const job =
          findJobById(id);

        if (job) {

          saveJob(job);
        }
      }
    }
  );
}


/* =========================================
   OPEN EXTERNAL JOB LINK
========================================= */

function openJobLink(job) {

  const url =
    job.job_url ||
    job.url ||
    job.link ||
    job.apply_url ||
    "";


  if (!url) {

    showToast(
      "Job link not available"
    );

    return;
  }


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}


/* =========================================
   GET DISPLAYED JOB URL
========================================= */

function getJobURL(job) {

  return (
    job.job_url ||
    job.url ||
    job.link ||
    job.apply_url ||
    ""
  );
}


/* =========================================
   AVOID JOB
========================================= */

function avoidJob(job) {

  const id =
    getId(job);

  if (!id) {

    return;
  }


  /* -----------------------------------------
     ADD TO AVOID LIST
  ----------------------------------------- */

  if (
    !state.avoid.includes(id)
  ) {

    state.avoid.push(id);
  }


  /* -----------------------------------------
     REMOVE FROM SAVED
  ----------------------------------------- */

  state.saved =
    state.saved.filter(
      savedId =>
        savedId !== id
    );


  /* -----------------------------------------
     REMOVE APPLICATION
  ----------------------------------------- */

  delete state.apps[id];


  saveLocalData();


  /* -----------------------------------------
     CLOSE MODAL
  ----------------------------------------- */

  closeJobModal();


  /* -----------------------------------------
     REFRESH UI
  ----------------------------------------- */

  state.jobs =
    state.jobs.filter(
      item =>
        getId(item) !== id
    );


  updateDashboard();

  applyFilters();

  renderTracker();

  renderAvoidJobs();


  showToast(
    "Job moved to Avoid Jobs"
  );
}/* =========================================
   PART 24 — JOB DETAILS MODAL
========================================= */


/* =========================================
   OPEN JOB MODAL
========================================= */

function openJobModal(job) {

  const modal =
    $("#modal");

  if (!modal) {
    return;
  }


  state.current =
    job;


  /* -----------------------------------------
     BASIC DETAILS
  ----------------------------------------- */

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

  const description =
    $("#mDescription");

  const reasons =
    $("#mReasons");

  const skills =
    $("#mSkills");

  const status =
    $("#mStatus");


  const jobScore =
    getMatchScore(
      job,
      state.selectedSkill
    );


  if (title) {

    title.textContent =
      job.title ||
      "Untitled role";
  }


  if (company) {

    company.textContent =
      job.company ||
      "Company not listed";
  }


  if (meta) {

    meta.innerHTML = `

      <span>
        ${escapeHTML(
          job.location ||
          "Location not listed"
        )}
      </span>

      <span>
        ${escapeHTML(
          job.job_type ||
          job.jobType ||
          "Role"
        )}
      </span>

      <span>
        ${escapeHTML(
          formatJobDate(job)
        )}
      </span>

    `;
  }


  if (score) {

    score.textContent =
      `${jobScore}%`;
  }


  if (bar) {

    bar.style.width =
      `${jobScore}%`;
  }


  if (description) {

    description.textContent =
      job.description ||
      "No description available.";
  }


  /* -----------------------------------------
     MATCH REASONS
  ----------------------------------------- */

  if (reasons) {

    const reasonList = [];


    if (
      state.selectedSkill &&
      skillMatchesJob(
        job,
        state.selectedSkill
      )
    ) {

      reasonList.push(
        `Matches your ${state.selectedSkill.toUpperCase()} skill`
      );
    }


    if (jobScore >= 80) {

      reasonList.push(
        "Strong overall job match"
      );
    }


    if (
      job.location
    ) {

      reasonList.push(
        `Location: ${job.location}`
      );
    }


    if (!reasonList.length) {

      reasonList.push(
        "Review the job requirements before applying"
      );
    }


    reasons.innerHTML =
      reasonList
        .map(
          reason => `
            <li>
              ${escapeHTML(reason)}
            </li>
          `
        )
        .join("");
  }


  /* -----------------------------------------
     SKILLS
  ----------------------------------------- */

  if (skills) {

    let jobSkills = [];


    if (
      Array.isArray(job.skills)
    ) {

      jobSkills =
        job.skills
          .map(text)
          .filter(Boolean)
          .slice(0, 10);

    } else if (
      typeof job.skills === "string"
    ) {

      jobSkills =
        job.skills
          .split(/[,|]/)
          .map(
            item => item.trim()
          )
          .filter(Boolean)
          .slice(0, 10);
    }


    if (!jobSkills.length) {

      jobSkills =
        extractSkills(job)
          .slice(0, 10);
    }


    skills.innerHTML =
      jobSkills.length
        ? jobSkills
            .map(
              skill => `
                <span class="skill-chip">
                  ${escapeHTML(skill)}
                </span>
              `
            )
            .join("")
        : `
            <span class="skill-chip">
              General role
            </span>
          `;
  }


  /* -----------------------------------------
     STATUS
  ----------------------------------------- */

  if (status) {

    status.value =
      getStatus(job) ||
      "";
  }


  /* -----------------------------------------
     SHOW MODAL
  ----------------------------------------- */

  modal.classList.add(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.style.overflow =
    "hidden";
}


/* =========================================
   CLOSE JOB MODAL
========================================= */

function closeJobModal() {

  const modal =
    $("#modal");

  if (!modal) {
    return;
  }


  modal.classList.remove(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.style.overflow =
    "";


  state.current =
    null;
}


/* =========================================
   BIND MODAL EVENTS
========================================= */

function bindModalEvents() {

  const modal =
    $("#modal");

  const closeButton =
    $("#closeModal");


  /* -----------------------------------------
     CLOSE BUTTON
  ----------------------------------------- */

  if (closeButton) {

    closeButton.addEventListener(
      "click",
      closeJobModal
    );
  }


  /* -----------------------------------------
     CLICK OUTSIDE MODAL
  ----------------------------------------- */

  if (modal) {

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target === modal
        ) {

          closeJobModal();
        }
      }
    );
  }


  /* -----------------------------------------
     STATUS CHANGE
  ----------------------------------------- */

  const status =
    $("#mStatus");

  if (status) {

    status.addEventListener(
      "change",
      () => {

        if (
          state.current &&
          status.value
        ) {

          setJobStatus(
            state.current,
            status.value
          );
        }
      }
    );
  }


  /* -----------------------------------------
     SAVE
  ----------------------------------------- */

  const saveButton =
    $("#mSave");

  if (saveButton) {

    saveButton.addEventListener(
      "click",
      () => {

        if (
          state.current
        ) {

          saveJob(
            state.current
          );

          openJobModal(
            state.current
          );
        }
      }
    );
  }


  /* -----------------------------------------
     AVOID
  ----------------------------------------- */

  const avoidButton =
    $("#mAvoid");

  if (avoidButton) {

    avoidButton.addEventListener(
      "click",
      () => {

        if (
          state.current
        ) {

          avoidJob(
            state.current
          );
        }
      }
    );
  }


  /* -----------------------------------------
     OPEN ORIGINAL JOB
  ----------------------------------------- */

  const openButton =
    $("#mOpen");

  if (openButton) {

    openButton.addEventListener(
      "click",
      () => {

        if (
          state.current
        ) {

          openJobLink(
            state.current
          );
        }
      }
    );
  }
}/* =========================================
   PART 25 — RESUME + CAREER ROADMAP
========================================= */


/* =========================================
   RESUME FILE
========================================= */

function handleResumeUpload(file) {

  if (!file) {
    return;
  }

  const name =
    $("#resumeName");

  if (name) {

    name.textContent =
      file.name;
  }


  /*
    This browser-only version does not
    pretend to read PDF contents.

    It records that a resume was uploaded
    and gives a simple profile estimate.
  */

  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  let score = 45;


  if (
    extension === "pdf" ||
    extension === "doc" ||
    extension === "docx"
  ) {

    score += 15;
  }


  if (
    state.jobs.length > 0
  ) {

    score += 10;
  }


  score =
    Math.min(
      100,
      score
    );


  updateProfileScore(
    score
  );

  updateRoadmap();
}


/* =========================================
   PROFILE SCORE
========================================= */

function updateProfileScore(
  score = 0
) {

  const scoreElement =
    $("#profileScore");

  const bar =
    $("#profileBar");

  const message =
    $("#profileMessage");


  if (scoreElement) {

    scoreElement.textContent =
      `${score}%`;
  }


  if (bar) {

    bar.style.width =
      `${score}%`;
  }


  if (message) {

    if (score >= 80) {

      message.textContent =
        "Your profile has a strong foundation. Focus on projects and interview preparation.";

    } else if (score >= 60) {

      message.textContent =
        "Good start. Add stronger projects, technical skills and measurable achievements.";

    } else {

      message.textContent =
        "Upload your resume and build your technical profile step by step.";
    }
  }
}


/* =========================================
   CAREER ROADMAP
========================================= */

function updateRoadmap() {

  const container =
    $("#roadmapList");

  if (!container) {
    return;
  }


  const skill =
    state.selectedSkill;


  let roadmap = [
    {
      title: "Core Programming",
      text: "Strengthen C++, Java or Python fundamentals."
    },

    {
      title: "Data & SQL",
      text: "Practice SQL, DBMS and basic data handling."
    },

    {
      title: "Build Projects",
      text: "Create practical projects and keep them on GitHub."
    },

    {
      title: "Interview Preparation",
      text: "Practice DSA, technical questions and project explanation."
    }
  ];


  /* -----------------------------------------
     SKILL-SPECIFIC ROADMAP
  ----------------------------------------- */

  if (skill === "iot") {

    roadmap = [
      {
        title: "IoT Fundamentals",
        text: "Learn sensors, communication protocols and IoT architecture."
      },

      {
        title: "Embedded Systems",
        text: "Practice ESP32, microcontrollers, GPIO and firmware basics."
      },

      {
        title: "Build IoT Projects",
        text: "Create connected hardware projects with real sensor data."
      },

      {
        title: "Cloud & Dashboard",
        text: "Connect devices to Firebase or another backend and visualize data."
      }
    ];

  } else if (skill === "embedded") {

    roadmap = [
      {
        title: "Embedded C",
        text: "Strengthen C, pointers, memory and microcontroller concepts."
      },

      {
        title: "Microcontrollers",
        text: "Practice GPIO, timers, UART, I2C and SPI."
      },

      {
        title: "Firmware Projects",
        text: "Build and test a practical embedded system."
      },

      {
        title: "Embedded Interview Prep",
        text: "Practice debugging, electronics and firmware questions."
      }
    ];

  } else if (skill === "python") {

    roadmap = [
      {
        title: "Python Core",
        text: "Strengthen functions, OOP, collections and file handling."
      },

      {
        title: "Data Tools",
        text: "Practice Pandas, NumPy and data processing."
      },

      {
        title: "Build Projects",
        text: "Create useful Python projects and publish them on GitHub."
      },

      {
        title: "Interview Preparation",
        text: "Practice Python, SQL and DSA questions."
      }
    ];
  }


  /* -----------------------------------------
     RENDER ROADMAP
  ----------------------------------------- */

  container.innerHTML =
    roadmap
      .map(
        (item, index) => `
          <div class="roadmap-item">

            <div class="roadmap-number">
              ${index + 1}
            </div>

            <div>

              <strong>
                ${escapeHTML(
                  item.title
                )}
              </strong>

              <p>
                ${escapeHTML(
                  item.text
                )}
              </p>

            </div>

          </div>
        `
      )
      .join("");
}


/* =========================================
   RESUME EVENTS
========================================= */

function bindResumeEvents() {

  const fileInput =
    $("#resumeFile");

  if (!fileInput) {
    return;
  }


  fileInput.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];

      handleResumeUpload(
        file
      );
    }
  );


  updateRoadmap();
}/* =========================================
   PART 26 — APPLICATION TRACKER
========================================= */


/* =========================================
   GET TRACKER JOBS
========================================= */

function getTrackerJobs(status) {

  return state.jobs.filter(job => {

    const jobStatus =
      getStatus(job);

    if (status === "saved") {

      return (
        isSaved(job) &&
        !["applied", "interview", "closed"]
          .includes(jobStatus)
      );
    }

    return jobStatus === status;
  });
}


/* =========================================
   CREATE TRACKER CARD
========================================= */

function createTrackerItem(job) {

  const id =
    getId(job);

  const title =
    text(
      job.title ||
      "Untitled role"
    );

  const company =
    text(
      job.company ||
      "Company not listed"
    );

  const score =
    getMatchScore(
      job,
      state.selectedSkill
    );


  return `
    <div
      class="tracker-item"
      data-id="${escapeHTML(id)}"
    >

      <strong>
        ${escapeHTML(title)}
      </strong>

      <span>
        ${escapeHTML(company)}
      </span>

      <span class="tracker-score">
        Match ${score}%
      </span>

    </div>
  `;
}


/* =========================================
   RENDER TRACKER
========================================= */

function renderTracker() {

  const columns = {

    saved: {
      list: "#colSaved",
      count: "#cSaved"
    },

    applied: {
      list: "#colApplied",
      count: "#cApplied"
    },

    interview: {
      list: "#colInterview",
      count: "#cInterview"
    },

    closed: {
      list: "#colClosed",
      count: "#cClosed"
    }

  };


  Object.entries(columns)
    .forEach(
      ([status, selectors]) => {

        const jobs =
          getTrackerJobs(status);


        const list =
          $(selectors.list);

        const count =
          $(selectors.count);


        /* -------------------------------------
           COUNT
        ------------------------------------- */

        if (count) {

          count.textContent =
            jobs.length;
        }


        /* -------------------------------------
           LIST
        ------------------------------------- */

        if (!list) {
          return;
        }


        if (!jobs.length) {

          list.innerHTML = `
            <div class="tracker-empty">
              No jobs here yet
            </div>
          `;

          return;
        }


        list.innerHTML =
          jobs
            .map(
              job =>
                createTrackerItem(job)
            )
            .join("");
      }
    );
}


/* =========================================
   TRACKER CARD CLICK
========================================= */

function bindTrackerEvents() {

  const tracker =
    $("#page-tracker");

  if (!tracker) {
    return;
  }


  tracker.addEventListener(
    "click",
    event => {

      const item =
        event.target.closest(
          ".tracker-item"
        );

      if (!item) {
        return;
      }


      const id =
        item.dataset.id;


      const job =
        findJobById(id);


      if (job) {

        openJobModal(job);
      }
    }
  );
}


/* =========================================
   REMOVE FROM TRACKER
========================================= */

function removeFromTracker(job) {

  const id =
    getId(job);

  if (!id) {
    return;
  }


  state.saved =
    state.saved.filter(
      savedId =>
        savedId !== id
    );


  delete state.apps[id];


  saveLocalData();

  updateDashboard();

  renderTracker();

  renderJobs(
    state.filtered
  );


  showToast(
    "Job removed from tracker"
  );
}/* =========================================
   PART 27 — AVOID JOBS + NAVIGATION
========================================= */


/* =========================================
   RENDER AVOID JOBS
========================================= */

function renderAvoidJobs() {

  const container =
    $("#avoidList");

  if (!container) {
    return;
  }


  /* -----------------------------------------
     GET AVOIDED JOBS FROM CURRENT DATA
  ----------------------------------------- */

  const avoided =
    state.jobs.filter(job =>
      state.avoid.includes(
        getId(job)
      )
    );


  /* -----------------------------------------
     EMPTY STATE
  ----------------------------------------- */

  if (!avoided.length) {

    container.innerHTML = `
      <div class="skill-chip">
        No avoided jobs
      </div>
    `;

    return;
  }


  /* -----------------------------------------
     RENDER AVOIDED JOBS
  ----------------------------------------- */

  container.innerHTML =
    avoided
      .slice(0, 6)
      .map(job => {

        const title =
          text(
            job.title ||
            "Untitled role"
          );

        const company =
          text(
            job.company ||
            "Company not listed"
          );

        return `
          <div class="avoid-item">

            <strong>
              ${escapeHTML(title)}
            </strong>

            <span>
              ${escapeHTML(company)}
            </span>

          </div>
        `;
      })
      .join("");
}


/* =========================================
   REMOVE FROM AVOID LIST
========================================= */

function restoreAvoidedJob(job) {

  const id =
    getId(job);

  state.avoid =
    state.avoid.filter(
      avoidedId =>
        avoidedId !== id
    );


  saveLocalData();

  renderAvoidJobs();

  showToast(
    "Job restored"
  );
}


/* =========================================
   NAVIGATION
========================================= */

function bindNavigation() {

  const buttons =
    $$(".nav-btn");


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const pageName =
          button.dataset.page;


        if (!pageName) {
          return;
        }


        /* -------------------------------------
           UPDATE ACTIVE BUTTON
        ------------------------------------- */

        buttons.forEach(btn => {

          btn.classList.toggle(
            "active",
            btn === button
          );
        });


        /* -------------------------------------
           SHOW SELECTED PAGE
        ------------------------------------- */

        $$(".page")
          .forEach(page => {

            page.classList.toggle(
              "active",
              page.id ===
                `page-${pageName}`
            );
          });


        /* -------------------------------------
           PAGE-SPECIFIC REFRESH
        ------------------------------------- */

        if (
          pageName === "tracker"
        ) {

          renderTracker();
        }


        if (
          pageName === "resume"
        ) {

          updateRoadmap();
        }


        if (
          pageName === "home"
        ) {

          updateDashboard();

          updateBestOpportunity(
            state.selectedSkill
          );
        }


        /* -------------------------------------
           SCROLL TOP
        ------------------------------------- */

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    );
  });
}


/* =========================================
   SKILL SELECT EVENT
========================================= */

function bindSkillEvent() {

  const skill =
    $("#skill");

  if (!skill) {
    return;
  }


  /* -----------------------------------------
     RESTORE SAVED SKILL
  ----------------------------------------- */

  if (
    state.selectedSkill &&
    [
      ...skill.options
    ].some(
      option =>
        option.value ===
        state.selectedSkill
    )
  ) {

    skill.value =
      state.selectedSkill;
  }


  /* -----------------------------------------
     CHANGE EVENT
  ----------------------------------------- */

  skill.addEventListener(
    "change",
    () => {

      handleSkillChange(
        skill.value
      );
    }
  );
}/* =========================================
   PART 28 — FILTER EVENTS
========================================= */


/* =========================================
   BIND FILTER EVENTS
========================================= */

function bindFilterEvents() {

  const filterIds = [
    "search",
    "location",
    "jobType",
    "workMode",
    "posted",
    "skill",
    "appStatus",
    "minimum",
    "sort"
  ];


  /* -----------------------------------------
     INPUT / SELECT EVENTS
  ----------------------------------------- */

  filterIds.forEach(id => {

    const element =
      $(`#${id}`);

    if (!element) {
      return;
    }


    element.addEventListener(
      "input",
      () => {

        applyFilters();
      }
    );


    element.addEventListener(
      "change",
      () => {

        /* Skill is also used
           by the Career Agent */

        if (id === "skill") {

          handleSkillChange(
            element.value
          );

        } else {

          applyFilters();
        }
      }
    );
  });


  /* -----------------------------------------
     CLEAR FILTERS
  ----------------------------------------- */

  const clearButton =
    $("#clearFilters");

  if (clearButton) {

    clearButton.addEventListener(
      "click",
      () => {

        clearFilters();
      }
    );
  }


  /* -----------------------------------------
     SHOW SAVED
  ----------------------------------------- */

  const savedButton =
    $("#showSaved");

  if (savedButton) {

    savedButton.addEventListener(
      "click",
      () => {

        showSavedJobs();
      }
    );
  }


  /* -----------------------------------------
     INITIAL FILTER
  ----------------------------------------- */

  applyFilters();
}/* =========================================
   PART 29 — CSV EXPORT + KEYBOARD EVENTS
========================================= */


/* =========================================
   EXPORT JOBS TO CSV
========================================= */

function exportJobsCSV() {

  const jobs =
    state.filtered.length
      ? state.filtered
      : state.jobs;


  if (!jobs.length) {

    showToast(
      "No jobs available to export"
    );

    return;
  }


  const headers = [
    "Title",
    "Company",
    "Location",
    "Job Type",
    "Work Mode",
    "Match Score",
    "Status",
    "URL"
  ];


  const rows =
    jobs.map(job => {

      const values = [

        text(job.title),

        text(job.company),

        text(job.location),

        text(job.job_type),

        text(job.work_mode),

        getMatchScore(
          job,
          state.selectedSkill
        ),

        getStatus(job) ||
          "Not Applied",

        getJobURL(job)

      ];


      return values.map(value => {

        const clean =
          text(value)
            .replace(/"/g, '""');

        return `"${clean}"`;

      }).join(",");
    });


  const csv =
    [
      headers.join(","),
      ...rows
    ].join("\n");


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
    "job-radar-jobs.csv";


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();


  URL.revokeObjectURL(
    url
  );


  showToast(
    "Jobs exported successfully"
  );
}


/* =========================================
   EXPORT BUTTON EVENT
========================================= */

function bindExportEvents() {

  const button =
    $("#exportCSV");

  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    () => {

      exportJobsCSV();

    }
  );
}


/* =========================================
   KEYBOARD EVENTS
========================================= */

function bindKeyboardEvents() {

  document.addEventListener(
    "keydown",
    event => {

      /* -------------------------------------
         ESC = CLOSE MODAL
      ------------------------------------- */

      if (
        event.key === "Escape"
      ) {

        closeJobModal();

      }


      /* -------------------------------------
         ENTER = OPEN SELECTED JOB
      ------------------------------------- */

      if (
        event.key === "Enter" &&
        event.target.classList.contains(
          "tracker-item"
        )
      ) {

        const id =
          event.target.dataset.id;

        const job =
          findJobById(id);

        if (job) {

          openJobModal(job);

        }
      }

    }
  );
}/* =========================================
   PART 32 — FINAL INITIALIZATION
========================================= */

function startJobRadar() {

  bindNavigation();

  bindFilterEvents();

  bindJobEvents();

  bindModalEvents();

  bindResumeEvents();

  bindTrackerEvents();

  bindSkillEvent();

  bindExportEvents();

  bindKeyboardEvents();

  bindAgentEvents();

  loadJobs();
}


/* =========================================
   DOM READY
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    startJobRadar();

  }
);/* =========================================
   PART 33 — FINAL SAFETY CHECK
========================================= */


/* =========================================
   REFRESH DASHBOARD DATA
========================================= */

function refreshDashboard() {

  updateDashboard();

  renderTracker();

  renderAvoidJobs();

  updateBestOpportunity(
    state.selectedSkill
  );

  applyFilters();
}


/* =========================================
   SAVE DATA WHEN PAGE CLOSES
========================================= */

window.addEventListener(
  "beforeunload",
  () => {

    saveLocalData();

  }
);


/* =========================================
   ONLINE / OFFLINE STATUS
========================================= */

window.addEventListener(
  "online",
  () => {

    updateLiveStatus("online");

  }
);


window.addEventListener(
  "offline",
  () => {

    updateLiveStatus("offline");

  }
);/* =========================================
   PART 34 — AVOID JOBS STORAGE
========================================= */

const avoidDetails =
  JSON.parse(
    localStorage.getItem("jobRadarAvoidDetails") || "{}"
  );


function saveAvoidDetails() {

  localStorage.setItem(
    "jobRadarAvoidDetails",
    JSON.stringify(avoidDetails)
  );
}


/* =========================================
   SHOW AVOIDED JOBS
========================================= */

function renderAvoidJobs() {

  const container =
    $("#avoidList");

  if (!container) {
    return;
  }


  const ids =
    Object.keys(avoidDetails);


  if (!ids.length) {

    container.innerHTML = `
      <div class="avoid-empty">
        No avoided jobs yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    ids.map(id => {

      const job =
        avoidDetails[id];

      return `
        <div class="avoid-job">

          <div class="avoid-job-info">

            <strong>
              ${escapeHTML(job.title)}
            </strong>

            <span>
              ${escapeHTML(job.company)}
            </span>

          </div>

          <button
            type="button"
            class="restore-avoid"
            data-id="${escapeHTML(id)}"
          >
            Restore
          </button>

        </div>
      `;

    }).join("");


  container
    .querySelectorAll(".restore-avoid")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          restoreAvoidedJob(
            button.dataset.id
          );

        }
      );

    });
}


/* =========================================
   RESTORE AVOIDED JOB
========================================= */

function restoreAvoidedJob(id) {

  const job =
    avoidDetails[id];

  if (!job) {
    return;
  }


  delete avoidDetails[id];

  saveAvoidDetails();


  /* Put job back into main list */

  if (
    !state.jobs.some(
      item => getId(item) === id
    )
  ) {

    state.jobs.push(job);

  }


  saveLocalData();

  updateDashboard();

  applyFilters();

  renderAvoidJobs();

  showToast(
    "Job restored successfully"
  );
}/* =========================================
   PART 35 — SAVE AVOIDED JOB DETAILS
========================================= */

function avoidJob(job) {

  if (!job) {
    return;
  }


  const id =
    getId(job);


  /* Save complete job details */

  avoidDetails[id] = {
    ...job
  };


  saveAvoidDetails();


  /* Remove from saved jobs */

  state.saved =
    state.saved.filter(
      savedId => savedId !== id
    );


  /* Remove application status */

  delete state.apps[id];


  /* Mark as avoided */

  if (!state.avoid.includes(id)) {

    state.avoid.push(id);

  }


  saveLocalData();


  /* Remove from active job list */

  state.jobs =
    state.jobs.filter(
      item => getId(item) !== id
    );


  /* Close modal */

  closeJobModal();


  /* Refresh everything */

  updateDashboard();

  applyFilters();

  renderTracker();

  renderAvoidJobs();

  showToast(
    "Job moved to Avoid Jobs"
  );
}/* =========================================
   PART 36 — DASHBOARD REFRESH
========================================= */

function refreshAll() {

  /* Dashboard numbers */
  updateDashboard();


  /* Top skills */
  renderTopSkills();


  /* Avoid jobs */
  renderAvoidJobs();


  /* Best opportunity */
  updateBestOpportunity(
    state.selectedSkill
  );


  /* Job results */
  applyFilters();


  /* Application tracker */
  renderTracker();
}


/* =========================================
   REFRESH BUTTON SUPPORT
========================================= */

function bindRefreshEvents() {

  const buttons = $$(
    "#refreshJobs, .refresh-jobs"
  );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        showToast(
          "Refreshing jobs..."
        );


        await loadJobs();


        refreshAll();


        showToast(
          "Jobs refreshed"
        );

      }
    );

  });
}/* =========================================
   PART 37 — CONNECT REFRESH EVENTS
========================================= */

function bindRefreshButton() {

  const refreshButtons = $$(
    "#refreshJobs, .refresh-jobs"
  );


  refreshButtons.forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        button.disabled = true;

        button.textContent =
          "Refreshing...";


        try {

          await loadJobs();

          refreshAll();

          showToast(
            "Jobs refreshed successfully"
          );

        } catch (error) {

          console.error(
            "Refresh error:",
            error
          );

          showToast(
            "Unable to refresh jobs"
          );

        }


        button.disabled = false;

        button.textContent =
          "Refresh Jobs";

      }
    );

  });
}/* =========================================
   PART 38 — REFRESH INITIALIZATION
========================================= */

function bindExtraEvents() {

  bindRefreshEvents();

  bindRefreshButton();

}


/* =========================================
   FINAL START UPDATE
========================================= */

const previousStartJobRadar =
  startJobRadar;


function finalStartJobRadar() {

  previousStartJobRadar();

  bindExtraEvents();

}


/* =========================================
   START JOB RADAR
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    finalStartJobRadar();

  }
);/* =========================================
   PART 39 — FINAL START FUNCTION
========================================= */

function startJobRadar() {

  bindNavigation();

  bindFilterEvents();

  bindJobEvents();

  bindModalEvents();

  bindResumeEvents();

  bindTrackerEvents();

  bindSkillEvent();

  bindExportEvents();

  bindKeyboardEvents();

  bindAgentEvents();

  bindExtraEvents();

  loadJobs();

}/* =========================================
   PART 40 — JOB DATA SAFETY
========================================= */

function normalizeJob(job) {

  return {
    ...job,

    id: getId(job),

    title:
      text(job.title) ||
      "Untitled Job",

    company:
      text(job.company) ||
      "Unknown Company",

    location:
      text(job.location) ||
      "India",

    description:
      text(job.description) ||
      "No description available.",

    job_type:
      text(job.job_type),

    work_mode:
      text(job.work_mode),

    url:
      getJobURL(job)
  };
}


/* =========================================
   SAFE JOB LIST
========================================= */

function getSafeJobs(jobs) {

  if (!Array.isArray(jobs)) {
    return [];
  }


  return jobs
    .filter(job => job && typeof job === "object")
    .map(normalizeJob);
}


/* =========================================
   DUPLICATE REMOVAL
========================================= */

function removeDuplicateJobs(jobs) {

  const seen =
    new Set();


  return jobs.filter(job => {

    const id =
      getId(job);


    if (seen.has(id)) {
      return false;
    }


    seen.add(id);

    return true;

  });
}/* =========================================
   PART 41 — SAFE JOB LOADING
========================================= */

async function reloadJobData() {

  try {

    updateLiveStatus("syncing");


    const response =
      await fetch(
        "../data/processed_jobs.json",
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    let jobs =
      Array.isArray(data)
        ? data
        : data.jobs;


    jobs =
      getSafeJobs(jobs);


    jobs =
      removeDuplicateJobs(jobs);


    /* Remove avoided jobs
       from active results */

    jobs =
      jobs.filter(
        job =>
          !state.avoid.includes(
            getId(job)
          )
      );


    state.jobs = jobs;


    state.filtered = [...jobs];


    updateLiveStatus("online");


    refreshAll();


    return jobs;

  } catch (error) {

    console.error(
      "Job loading error:",
      error
    );


    updateLiveStatus("offline");


    showToast(
      "Unable to load job data"
    );


    return [];

  }
}/* =========================================
   PART 42 — FINAL LOAD JOBS
========================================= */

async function loadJobs() {

  try {

    updateLiveStatus("syncing");


    const response =
      await fetch(
        "../data/processed_jobs.json",
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    let jobs =
      Array.isArray(data)
        ? data
        : data.jobs;


    jobs =
      getSafeJobs(jobs);


    jobs =
      removeDuplicateJobs(jobs);


    /* Remove avoided jobs */

    jobs =
      jobs.filter(
        job =>
          !state.avoid.includes(
            getId(job)
          )
      );


    state.jobs =
      jobs;


    state.filtered =
      [...jobs];


    updateLiveStatus("online");

    updateDashboard();

    renderTopSkills();

    renderTracker();

    renderAvoidJobs();

    updateBestOpportunity(
      state.selectedSkill
    );

    applyFilters();


  } catch (error) {

    console.error(
      "Job loading error:",
      error
    );


    updateLiveStatus("offline");


    const results =
      $("#results");

    if (results) {

      results.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load jobs</h3>
          <p>
            Please check the job data
            and try again.
          </p>
        </div>
      `;

    }


    showToast(
      "Unable to load job data"
    );

  }
}/* =========================================
   PART 43 — SEARCH SAFETY
========================================= */

function normalizeSearchText(value) {

  return text(value)
    .toLowerCase()
    .trim();
}


/* =========================================
   CHECK SEARCH MATCH
========================================= */

function matchesSearch(job, searchTerm) {

  if (!searchTerm) {
    return true;
  }


  const jobText =
    getJobText(job);


  const words =
    searchTerm
      .split(/\s+/)
      .filter(Boolean);


  return words.every(
    word =>
      jobText.includes(word)
  );
}


/* =========================================
   SAFE LOCATION MATCH
========================================= */

function matchesLocation(
  job,
  location
) {

  if (!location) {
    return true;
  }


  return normalizeSearchText(
    job.location
  ).includes(
    normalizeSearchText(location)
  );
}/* =========================================
   PART 44 — BETTER FILTER MATCHING
========================================= */

function applyFilters() {

  const search =
    normalizeSearchText(
      $("#search")?.value
    );

  const location =
    normalizeSearchText(
      $("#location")?.value
    );

  const jobType =
    normalizeSearchText(
      $("#jobType")?.value
    );

  const workMode =
    normalizeSearchText(
      $("#workMode")?.value
    );

  const posted =
    normalizeSearchText(
      $("#posted")?.value
    );

  const skill =
    normalizeSearchText(
      $("#skill")?.value
    );

  const appStatus =
    normalizeSearchText(
      $("#appStatus")?.value
    );

  const minimum =
    Number(
      $("#minimum")?.value || 0
    );

  const sort =
    normalizeSearchText(
      $("#sort")?.value
    );


  let results =
    state.jobs.filter(job => {

      /* Search */
      if (
        !matchesSearch(
          job,
          search
        )
      ) {
        return false;
      }


      /* Location */
      if (
        !matchesLocation(
          job,
          location
        )
      ) {
        return false;
      }


      /* Job type */
      if (
        jobType &&
        !lower(job.job_type)
          .includes(jobType)
      ) {
        return false;
      }


      /* Work mode */
      if (
        workMode &&
        !lower(job.work_mode)
          .includes(workMode)
      ) {
        return false;
      }


      /* Skill */
      if (
        skill &&
        !skillMatchesJob(
          job,
          skill
        )
      ) {
        return false;
      }


      /* Application status */
      if (
        appStatus &&
        getStatus(job) !== appStatus
      ) {
        return false;
      }


      /* Minimum score */
      if (
        minimum &&
        getMatchScore(
          job,
          state.selectedSkill
        ) < minimum
      ) {
        return false;
      }


      /* Posted date */
      if (
        posted === "today" &&
        !isRecentJob(job, 1)
      ) {
        return false;
      }


      if (
        posted === "last3" &&
        !isRecentJob(job, 3)
      ) {
        return false;
      }


      if (
        posted === "last7" &&
        !isRecentJob(job, 7)
      ) {
        return false;
      }


      if (
        posted === "last30" &&
        !isRecentJob(job, 30)
      ) {
        return false;
      }


      return true;
    });


  /* =====================================
     SORT RESULTS
  ===================================== */

  if (sort === "best") {

    results.sort(
      (a, b) =>
        getMatchScore(
          b,
          state.selectedSkill
        ) -
        getMatchScore(
          a,
          state.selectedSkill
        )
    );

  } else if (sort === "company") {

    results.sort(
      (a, b) =>
        lower(a.company)
          .localeCompare(
            lower(b.company)
          )
    );

  } else {

    results.sort(
      (a, b) =>
        new Date(
          getJobDate(b)
        ) -
        new Date(
          getJobDate(a)
        )
    );
  }


  state.filtered =
    results;


  renderJobs(
    state.filtered
  );


  const count =
    $("#resultCount");

  if (count) {

    count.textContent =
      `${state.filtered.length} jobs found`;

  }
}/* =========================================
   PART 45 — RESULT UI
========================================= */

function updateResultCount() {

  const count =
    $("#resultCount");

  if (!count) {
    return;
  }


  const total =
    state.filtered.length;


  count.textContent =
    total === 1
      ? "1 job found"
      : `${total} jobs found`;
}


/* =========================================
   EMPTY RESULT MESSAGE
========================================= */

function showEmptyResults() {

  const results =
    $("#results");

  const empty =
    $("#emptyState");


  if (results) {
    results.innerHTML = "";
  }


  if (empty) {

    empty.classList.add(
      "show"
    );

    empty.innerHTML = `
      <div class="empty-icon">
        ⌕
      </div>

      <h3>No matching jobs</h3>

      <p>
        Try changing your search,
        skill, location or score filter.
      </p>

      <button
        type="button"
        id="emptyClearFilters"
        class="secondary-btn"
      >
        Clear Filters
      </button>
    `;


    const button =
      $("#emptyClearFilters");


    if (button) {

      button.addEventListener(
        "click",
        () => {

          clearFilters();

        }
      );

    }

  }


  updateResultCount();
}


/* =========================================
   SHOW JOB RESULTS
========================================= */

function showJobResults() {

  const empty =
    $("#emptyState");


  if (empty) {

    empty.classList.remove(
      "show"
    );

  }


  updateResultCount();
}/* =========================================
   PART 46 — JOB RESULTS UI
========================================= */

function renderJobs(jobs) {

  const results =
    $("#results");

  const empty =
    $("#emptyState");


  if (!results) {
    return;
  }


  /* No results */

  if (
    !Array.isArray(jobs) ||
    jobs.length === 0
  ) {

    showEmptyResults();

    return;
  }


  /* Hide empty state */

  if (empty) {

    empty.classList.remove(
      "show"
    );

  }


  /* Render cards */

  results.innerHTML =
    jobs
      .map(job => {

        return createJobCard(
          job
        );

      })
      .join("");


  /* Update count */

  showJobResults();


  /* Re-bind card buttons */

  bindJobEvents();
}/* =========================================
   PART 47 — JOB CARD EVENTS
========================================= */

function bindJobEvents() {

  const results =
    $("#results");

  if (!results) {
    return;
  }


  /* Remove old listener */

  if (
    results._jobRadarHandler
  ) {

    results.removeEventListener(
      "click",
      results._jobRadarHandler
    );

  }


  const handler =
    event => {

      const viewButton =
        event.target.closest(
          ".view-job"
        );


      const saveButton =
        event.target.closest(
          ".save-job"
        );


      const avoidButton =
        event.target.closest(
          ".avoid-job"
        );


      /* View job */

      if (viewButton) {

        const job =
          findJobById(
            viewButton.dataset.id
          );


        if (job) {

          openJobModal(job);

        }

        return;
      }


      /* Save job */

      if (saveButton) {

        const job =
          findJobById(
            saveButton.dataset.id
          );


        if (job) {

          saveJob(job);

          renderJobs(
            state.filtered
          );

        }

        return;
      }


      /* Avoid job */

      if (avoidButton) {

        const job =
          findJobById(
            avoidButton.dataset.id
          );


        if (job) {

          avoidJob(job);

        }

        return;
      }

    };


  results.addEventListener(
    "click",
    handler
  );


  results._jobRadarHandler =
    handler;
}/* =========================================
   PART 48 — JOB CARD ACTION SAFETY
========================================= */

function getJobActionURL(job) {

  if (!job) {
    return "";
  }


  return (
    job.job_url ||
    job.url ||
    job.link ||
    job.apply_url ||
    ""
  ).trim();
}


/* =========================================
   OPEN JOB SAFELY
========================================= */

function openJobLink(job) {

  const url =
    getJobActionURL(job);


  if (!url) {

    showToast(
      "Job link is not available"
    );

    return;
  }


  try {

    const validURL =
      new URL(
        url,
        window.location.href
      );


    window.open(
      validURL.href,
      "_blank",
      "noopener,noreferrer"
    );

  } catch (error) {

    console.error(
      "Invalid job URL:",
      error
    );


    showToast(
      "Invalid job link"
    );

  }
}


/* =========================================
   GET JOB URL
========================================= */

function getJobURL(job) {

  return getJobActionURL(job);

}/* =========================================
   PART 49 — MODAL SAFETY
========================================= */

function setModalText(
  selector,
  value
) {

  const element =
    $(selector);

  if (!element) {
    return;
  }


  element.textContent =
    text(value);
}


/* =========================================
   SAFE MODAL OPEN
========================================= */

function showJobModal(job) {

  if (!job) {
    return;
  }


  state.current =
    job;


  setModalText(
    "#mTitle",
    job.title || "Untitled Job"
  );


  setModalText(
    "#mCompany",
    job.company || "Unknown Company"
  );


  setModalText(
    "#mMeta",
    [
      job.location,
      job.job_type,
      job.work_mode
    ]
      .filter(Boolean)
      .join(" • ")
  );


  const score =
    getMatchScore(
      job,
      state.selectedSkill
    );


  setModalText(
    "#mScore",
    `${score}% Match`
  );


  const bar =
    $("#mBar");

  if (bar) {

    bar.style.width =
      `${score}%`;

  }


  setModalText(
    "#mDescription",
    job.description ||
      "No description available."
  );


  /* Skills */

  const skills =
    $("#mSkills");

  if (skills) {

    const skillText =
      text(
        job.skills ||
        job.requirements
      );


    skills.textContent =
      skillText ||
      "Skills not specified";

  }


  /* Status */

  const status =
    $("#mStatus");

  if (status) {

    status.value =
      getStatus(job) || "";

  }


  const modal =
    $("#modal");

  if (modal) {

    modal.classList.add(
      "show"
    );

    document.body.style.overflow =
      "hidden";

  }
}/* =========================================
   PART 50 — MODAL EVENTS
========================================= */

function bindModalEvents() {

  const modal =
    $("#modal");

  const closeButton =
    $("#closeModal");

  const saveButton =
    $("#mSave");

  const avoidButton =
    $("#mAvoid");

  const openButton =
    $("#mOpen");

  const statusSelect =
    $("#mStatus");


  /* -----------------------------------------
     CLOSE
  ----------------------------------------- */

  if (closeButton) {

    closeButton.addEventListener(
      "click",
      () => {

        closeJobModal();

      }
    );
  }


  /* -----------------------------------------
     CLICK OUTSIDE MODAL
  ----------------------------------------- */

  if (modal) {

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target === modal
        ) {

          closeJobModal();

        }

      }
    );
  }


  /* -----------------------------------------
     SAVE
  ----------------------------------------- */

  if (saveButton) {

    saveButton.addEventListener(
      "click",
      () => {

        if (!state.current) {
          return;
        }


        saveJob(
          state.current
        );


        openJobModal(
          state.current
        );

      }
    );
  }


  /* -----------------------------------------
     AVOID
  ----------------------------------------- */

  if (avoidButton) {

    avoidButton.addEventListener(
      "click",
      () => {

        if (!state.current) {
          return;
        }


        avoidJob(
          state.current
        );

      }
    );
  }


  /* -----------------------------------------
     OPEN ORIGINAL JOB
  ----------------------------------------- */

  if (openButton) {

    openButton.addEventListener(
      "click",
      () => {

        if (!state.current) {
          return;
        }


        openJobLink(
          state.current
        );

      }
    );
  }


  /* -----------------------------------------
     APPLICATION STATUS
  ----------------------------------------- */

  if (statusSelect) {

    statusSelect.addEventListener(
      "change",
      () => {

        if (!state.current) {
          return;
        }


        setJobStatus(
          state.current,
          statusSelect.value
        );


        updateDashboard();

        renderTracker();

        renderJobs(
          state.filtered
        );


        showToast(
          "Application status updated"
        );

      }
    );
  }
}/* =========================================
   PART 51 — FIX VIEW + SAVED JOBS
========================================= */

function bindFinalJobButtons() {

  const results = $("#results");

  if (!results) {
    return;
  }


  /* Remove previous handler */

  if (results._finalJobHandler) {

    results.removeEventListener(
      "click",
      results._finalJobHandler
    );

  }


  const handler = event => {

    /* VIEW BUTTON */

    const viewButton =
      event.target.closest(".job-view");


    if (viewButton) {

      const job =
        findJobById(
          viewButton.dataset.id
        );


      if (job) {

        openJobModal(job);

      }

      return;
    }


    /* SAVE BUTTON */

    const saveButton =
      event.target.closest(".job-save");


    if (saveButton) {

      const job =
        findJobById(
          saveButton.dataset.id
        );


      if (job) {

        saveJob(job);

      }

      return;
    }

  };


  results.addEventListener(
    "click",
    handler
  );


  results._finalJobHandler =
    handler;
}


/* =========================================
   SAVED JOBS BUTTON
========================================= */

function bindSavedJobsButton() {

  const button =
    $("#showSaved");


  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    () => {

      const status =
        $("#appStatus");


      if (status) {

        status.value =
          "saved";

      }


      applyFilters();


      showToast(
        "Showing saved jobs"
      );

    }
  );
}


/* =========================================
   FINAL BUTTON SETUP
========================================= */

function setupFinalButtons() {

  bindFinalJobButtons();

  bindSavedJobsButton();

}/* =========================================
   PART 52 — BEST MATCH BUTTON FIX
========================================= */

function bindBestMatchButton() {

  const container =
    $("#nextJob");


  if (!container) {
    return;
  }


  /* Remove old handler */

  if (container._bestMatchHandler) {

    container.removeEventListener(
      "click",
      container._bestMatchHandler
    );

  }


  const handler = event => {

    const button =
      event.target.closest(
        ".agent-open"
      );


    if (!button) {
      return;
    }


    const id =
      button.dataset.id;


    const job =
      findJobById(id);


    if (!job) {

      showToast(
        "Job not found"
      );

      return;
    }


    openJobModal(job);

  };


  container.addEventListener(
    "click",
    handler
  );


  container._bestMatchHandler =
    handler;
}


/* =========================================
   FINAL UI BUTTON SETUP
========================================= */

function setupAllButtons() {

  setupFinalButtons();

  bindBestMatchButton();

}function startJobRadar() {
  bindNavigation();
  bindFilterEvents();
  bindJobEvents();
  bindModalEvents();
  bindResumeEvents();
  bindTrackerEvents();
  bindSkillEvent();
  bindExportEvents();
  bindKeyboardEvents();
  bindAgentEvents();
  bindExtraEvents();

  // Final button connections
  setupAllButtons();

  loadJobs();
}