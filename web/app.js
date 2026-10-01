const state = {
  jobs: [],
  filtered: [],

  saved: JSON.parse(
    localStorage.getItem("jobRadarSaved") || "[]"
  ),

  apps: JSON.parse(
    localStorage.getItem("jobRadarApplications") || "{}"
  ),

  current: null
};


const $ = (id) => document.getElementById(id);

const DATA_URL = "../data/processed_jobs.json";


/* ================= HELPERS ================= */

const escapeHTML = (value) => {

  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char])
  );

};


const getId = (job) => {

  return String(
    job.id ||
    job.job_id ||
    `${job.title || job.job_title}-${job.company || job.company_name}-${job.location || ""}`
  );

};


const getTitle = (job) => {

  return job.title ||
    job.job_title ||
    "Untitled role";

};


const getCompany = (job) => {

  return job.company ||
    job.company_name ||
    "Company not listed";

};


const getLocation = (job) => {

  return job.location ||
    job.city ||
    "Location not specified";

};


const getSource = (job) => {

  return job.site ||
    job.source ||
    job.platform ||
    "Job board";

};


const getDescription = (job) => {

  return job.description ||
    job.job_description ||
    "No description available.";

};


const getScore = (job) => {

  return Math.round(
    Number(
      job.match_score ??
      job.score ??
      job.match ??
      0
    ) || 0
  );

};


const getSkills = (job) => {

  if (Array.isArray(job.skills)) {
    return job.skills;
  }

  if (typeof job.skills === "string") {
    return job.skills
      .split(",")
      .map(skill => skill.trim())
      .filter(Boolean);
  }

  return [];

};


const getReasons = (job) => {

  if (Array.isArray(job.reasons)) {
    return job.reasons;
  }

  if (typeof job.reasons === "string") {
    return job.reasons
      .split(/\n|•/)
      .map(reason => reason.trim())
      .filter(Boolean);
  }

  return [];

};


const isSaved = (job) => {

  return state.saved.includes(
    getId(job)
  );

};


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

  toast.textContent = message;

  toast.hidden = false;

  setTimeout(() => {
    toast.hidden = true;
  }, 1700);

}


/* ================= PAGE NAVIGATION ================= */

function goToPage(pageId) {

  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.remove("active");
    });

  const page = $(pageId);

  if (page) {
    page.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


document
  .querySelectorAll("[data-go]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {
        goToPage(button.dataset.go);
      }
    );

  });/* ================= LOAD JOB DATA ================= */

async function loadJobs() {

  try {

    const response = await fetch(
      DATA_URL,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Job data could not be loaded");
    }

    const data = await response.json();

    /*
      Supports both:

      [
        {...},
        {...}
      ]

      and:

      {
        "jobs": [
          {...}
        ]
      }
    */

    state.jobs = Array.isArray(data)
      ? data
      : (data.jobs || []);


    $("loadStatus").textContent =
      `Loaded ${state.jobs.length} real jobs.`;

    $("dataStatus").textContent =
      "LIVE";


    renderSkills();

    renderNextJob();

    applyFilters();

  } catch (error) {

    console.error(
      "Job Radar data error:",
      error
    );

    $("loadStatus").textContent =
      "Could not load job data.";

    $("dataStatus").textContent =
      "OFFLINE";

    $("results").innerHTML = `
      <div class="panel">

        <b>
          Job data unavailable.
        </b>

        <p>
          Check data/processed_jobs.json
        </p>

      </div>
    `;

  }

}


/* ================= DATE HELPER ================= */

function getPostedDays(job) {

  const date =
    job.date_posted ||
    job.posted_date ||
    job.date;

  if (!date) {
    return 999;
  }

  const timestamp =
    Date.parse(date);

  if (!Number.isFinite(timestamp)) {
    return 999;
  }

  return Math.floor(
    (Date.now() - timestamp) /
    86400000
  );

}


/* ================= FILTER JOBS ================= */

function applyFilters() {

  const search =
    $("search").value
      .trim()
      .toLowerCase();


  const location =
    $("location").value
      .toLowerCase();


  const jobType =
    $("jobType").value
      .toLowerCase();


  const workMode =
    $("workMode").value
      .toLowerCase();


  const skill =
    $("skill").value
      .toLowerCase();


  const appStatus =
    $("appStatus").value;


  const minimum =
    Number(
      $("minimum").value
    );


  const posted =
    $("posted").value;


  state.filtered =
    state.jobs.filter(job => {

      const searchableText = `
        ${getTitle(job)}
        ${getCompany(job)}
        ${getLocation(job)}
        ${getDescription(job)}
        ${getSkills(job).join(" ")}
      `.toLowerCase();


      /* Search */

      if (
        search &&
        !searchableText.includes(search)
      ) {
        return false;
      }


      /* Location */

      if (
        location !== "all" &&
        !getLocation(job)
          .toLowerCase()
          .includes(location)
      ) {
        return false;
      }


      /* Job type */

      const typeText = String(
        job.job_type ||
        job.type ||
        ""
      ).toLowerCase();


      if (
        jobType !== "all" &&
        !typeText.includes(jobType)
      ) {
        return false;
      }


      /* Work mode */

      const modeText = `
        ${getLocation(job)}
        ${job.remote === true ? "remote" : ""}
        ${job.work_mode || ""}
      `.toLowerCase();


      if (
        workMode !== "all" &&
        !modeText.includes(workMode)
      ) {
        return false;
      }


      /* Skill */

      if (
        skill !== "all" &&
        !getSkills(job)
          .some(
            item =>
              item.toLowerCase() === skill
          )
      ) {
        return false;
      }


      /* Posted date */

      if (
        posted !== "all" &&
        getPostedDays(job) >
        Number(posted)
      ) {
        return false;
      }


      /* Match score */

      if (
        getScore(job) <
        minimum
      ) {
        return false;
      }


      /* Application status */

      const currentStatus =
        state.apps[getId(job)] ||
        "new";


      if (appStatus !== "all") {

        if (
          appStatus === "saved" &&
          !isSaved(job)
        ) {
          return false;
        }

        if (
          appStatus !== "saved" &&
          currentStatus !== appStatus
        ) {
          return false;
        }

      }


      return true;

    });


  sortJobs();

  renderResults();

  renderAvoidJobs();

  updateDashboard();

}/* ================= SORT JOBS ================= */

function sortJobs() {

  const sortType =
    $("sort").value;


  state.filtered.sort(
    (a, b) => {

      if (sortType === "score") {

        return (
          getScore(b) -
          getScore(a)
        );

      }


      if (sortType === "company") {

        return getCompany(a)
          .localeCompare(
            getCompany(b)
          );

      }


      if (sortType === "title") {

        return getTitle(a)
          .localeCompare(
            getTitle(b)
          );

      }


      /* Default: newest */

      return (
        getPostedDays(a) -
        getPostedDays(b)
      );

    }
  );

}


/* ================= RENDER JOBS ================= */

function renderResults() {

  const results =
    $("results");


  if (!state.filtered.length) {

    results.innerHTML = `
      <div class="panel">

        <b>
          No matching jobs
        </b>

        <p>
          Try clearing a filter
          or changing your search.
        </p>

      </div>
    `;

    $("resultCount").textContent =
      "0";

    return;

  }


  results.innerHTML =
    state.filtered
      .map(
        job => createJobCard(job)
      )
      .join("");


  $("resultCount").textContent =
    state.filtered.length;

}


/* ================= JOB CARD ================= */

function createJobCard(job) {

  const id =
    getId(job);


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


  const type =
    escapeHTML(
      job.job_type ||
      job.type ||
      "Job"
    );


  const score =
    getScore(job);


  const status =
    state.apps[id] ||
    "New";


  const saved =
    isSaved(job);


  const skills =
    getSkills(job)
      .slice(0, 6)
      .map(
        skill => `
          <span class="chip">
            ${escapeHTML(skill)}
          </span>
        `
      )
      .join("");


  return `

    <article class="job-card">

      <div class="job-top">

        <div>

          <div class="job-title">
            ${title}
          </div>

          <div class="job-company">
            ${company}
          </div>

        </div>


        <div class="job-score">
          ${score}%
        </div>

      </div>


      <div class="meta">

        <span>
          ${location}
        </span>

        <span>
          ${source}
        </span>

        <span>
          ${type}
        </span>

        <span>
          ${escapeHTML(status)}
        </span>

      </div>


      <div class="chips">

        ${
          skills ||
          `<span class="chip">
            Skills not specified
          </span>`
        }

      </div>


      <div class="job-actions">

        <button
          class="secondary"
          onclick="openJob('${escapeHTML(id)}')"
        >
          View details
        </button>


        <button
          class="secondary"
          onclick="toggleSave('${escapeHTML(id)}')"
        >
          ${saved ? "Saved" : "Save"}
        </button>


        <button
          class="primary"
          onclick="openSource('${escapeHTML(id)}')"
        >
          Open Job ↗
        </button>

      </div>

    </article>

  `;

}


/* ================= FIND JOB ================= */

function findJob(jobId) {

  return state.jobs.find(
    job =>
      getId(job) === String(jobId)
  );

}


/* ================= SAVE JOB ================= */

function toggleSave(jobId) {

  const id =
    String(jobId);


  const index =
    state.saved.indexOf(id);


  if (index === -1) {

    state.saved.push(id);

    if (!state.apps[id]) {
      state.apps[id] = "saved";
    }

    showToast(
      "Job saved"
    );

  } else {

    state.saved.splice(
      index,
      1
    );

    showToast(
      "Removed from saved"
    );

  }


  saveState();

  applyFilters();

}


/* ================= OPEN JOB LINK ================= */

function openSource(jobId) {

  const job =
    findJob(jobId);


  if (!job) {
    return;
  }


  const url =
    job.job_url ||
    job.url ||
    job.link ||
    job.job_link;


  if (!url) {

    showToast(
      "Job link unavailable"
    );

    return;

  }


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}/* ================= JOB DETAILS ================= */

function openJob(jobId) {

  const job = findJob(jobId);

  if (!job) {
    return;
  }

  state.current = job;

  const title =
    getTitle(job);

  const company =
    getCompany(job);

  const location =
    getLocation(job);

  const source =
    getSource(job);

  const type =
    job.job_type ||
    job.type ||
    "Job";

  const score =
    getScore(job);


  $("mTitle").textContent =
    title;

  $("mCompany").textContent =
    company;


  $("mMeta").innerHTML = `

    <span>
      ${escapeHTML(location)}
    </span>

    <span>
      ${escapeHTML(source)}
    </span>

    <span>
      ${escapeHTML(type)}
    </span>

  `;


  $("mScore").textContent =
    `${score}%`;

  $("mBar").style.width =
    `${Math.min(100, score)}%`;


  $("mDescription").textContent =
    getDescription(job);


  /* ================= REASONS ================= */

  const reasons =
    getReasons(job);


  if (reasons.length) {

    $("mReasons").innerHTML =
      reasons
        .map(
          reason => `
            <p>
              ✓ ${escapeHTML(reason)}
            </p>
          `
        )
        .join("");

  } else {

    $("mReasons").innerHTML = `
      <p>
        ✓ Matches the current
        Job Radar profile signal.
      </p>
    `;

  }


  /* ================= SKILLS ================= */

  const skills =
    getSkills(job);


  $("mSkills").innerHTML =
    skills.length
      ? skills
          .map(
            skill => `
              <span class="chip">
                ${escapeHTML(skill)}
              </span>
            `
          )
          .join("")
      : `
        <span class="chip">
          Skills not specified
        </span>
      `;


  /* ================= SAVE BUTTON ================= */

  $("mSave").textContent =
    isSaved(job)
      ? "Remove Saved"
      : "Save Job";


  /* ================= STATUS BUTTON ================= */

  const currentStatus =
    state.apps[getId(job)] ||
    "new";


  if (currentStatus === "applied") {

    $("mStatus").textContent =
      "Mark Interview";

  } else if (
    currentStatus === "interview"
  ) {

    $("mStatus").textContent =
      "Mark Closed";

  } else {

    $("mStatus").textContent =
      "Mark Applied";

  }


  $("modal").hidden = false;

}


/* ================= CLOSE MODAL ================= */

function closeJobModal() {

  $("modal").hidden = true;

  state.current = null;

}


/* ================= SAVE FROM MODAL ================= */

$("mSave").addEventListener(
  "click",
  () => {

    if (!state.current) {
      return;
    }

    toggleSave(
      getId(state.current)
    );

    $("mSave").textContent =
      isSaved(state.current)
        ? "Remove Saved"
        : "Save Job";

  }
);


/* ================= APPLICATION STATUS ================= */

$("mStatus").addEventListener(
  "click",
  () => {

    if (!state.current) {
      return;
    }


    const id =
      getId(state.current);


    const current =
      state.apps[id] ||
      "new";


    if (current === "new" ||
        current === "saved") {

      state.apps[id] =
        "applied";

    } else if (
      current === "applied"
    ) {

      state.apps[id] =
        "interview";

    } else if (
      current === "interview"
    ) {

      state.apps[id] =
        "closed";

    } else {

      state.apps[id] =
        "applied";

    }


    /*
      A tracked job should remain
      saved so it appears in
      Application Tracker.
    */

    if (!state.saved.includes(id)) {

      state.saved.push(id);

    }


    saveState();

    showToast(
      "Application status updated"
    );


    openJob(id);

    applyFilters();

  }
);


/* ================= MODAL OPEN JOB ================= */

$("mOpen").addEventListener(
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


/* ================= CLOSE BUTTON ================= */

$("closeModal").addEventListener(
  "click",
  closeJobModal
);


/* ================= BACKGROUND CLOSE ================= */

document
  .querySelector(".shade")
  .addEventListener(
    "click",
    closeJobModal
  );


/* ================= ESCAPE KEY ================= */

document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape" &&
      !$("modal").hidden
    ) {

      closeJobModal();

    }

  }
);/* ================= TOP SKILLS ================= */

function renderSkills() {

  const counts = {};

  state.jobs
    .flatMap(getSkills)
    .forEach(skill => {

      const name =
        String(skill).trim();

      if (!name) {
        return;
      }

      counts[name] =
        (counts[name] || 0) + 1;

    });


  const topSkills =
    Object.entries(counts)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 10);


  $("topSkills").innerHTML =
    topSkills.length
      ? topSkills
          .map(
            ([skill, count]) => `
              <span class="chip">
                ${escapeHTML(skill)}
                · ${count}
              </span>
            `
          )
          .join("")
      : `
          <span class="chip">
            No skills found
          </span>
        `;


  /*
    Fill the Skill filter
  */

  $("skill").innerHTML = `
    <option value="all">
      All skills
    </option>

    ${
      topSkills
        .map(
          ([skill]) => `
            <option value="${escapeHTML(skill)}">
              ${escapeHTML(skill)}
            </option>
          `
        )
        .join("")
    }
  `;

}


/* ================= NEXT OPPORTUNITY ================= */

function renderNextJob() {

  const job =
    [...state.jobs]
      .sort(
        (a, b) =>
          getScore(b) -
          getScore(a)
      )[0];


  if (!job) {

    $("nextJob").textContent =
      "Waiting for job data...";

    return;

  }


  const skills =
    getSkills(job)
      .slice(0, 7)
      .map(
        skill => `
          <span class="chip">
            ${escapeHTML(skill)}
          </span>
        `
      )
      .join("");


  $("nextJob").innerHTML = `

    <div class="job-top">

      <div>

        <div class="next-title">
          ${escapeHTML(
            getTitle(job)
          )}
        </div>

        <div class="company">
          ${escapeHTML(
            getCompany(job)
          )}
        </div>

      </div>

      <span class="score">
        ${getScore(job)}%
      </span>

    </div>


    <div class="mini-block">

      <small>
        Matching skills
      </small>

      <div class="chips">

        ${
          skills ||
          `
            <span class="chip">
              Profile signal
            </span>
          `
        }

      </div>

    </div>


    <div class="mini-block">

      <small>
        Next step
      </small>

      <div>
        Review the job requirements
        before applying.
      </div>

    </div>


    <button
      class="primary"
      style="margin-top:10px"
      onclick="openJob('${escapeHTML(
        getId(job)
      )}')"
    >
      Analyze Opportunity
    </button>

  `;

}


/* ================= AVOID JOBS ================= */

function renderAvoidJobs() {

  const threshold =
    Math.max(
      50,
      Number(
        $("minimum").value
      )
    );


  const jobs =
    state.jobs
      .filter(
        job =>
          getScore(job) <
          threshold
      )
      .sort(
        (a, b) =>
          getScore(a) -
          getScore(b)
      )
      .slice(0, 5);


  if (!jobs.length) {

    $("avoidList").innerHTML = `
      <p>
        No low-match jobs
        in the current data.
      </p>
    `;

    return;

  }


  $("avoidList").innerHTML =
    jobs
      .map(
        job => `
          <div class="avoid-item">

            <b>
              ${escapeHTML(
                getTitle(job)
              )}
            </b>

            <small>
              ${getScore(job)}% match
              · Consider only if
              the requirements fit you.
            </small>

          </div>
        `
      )
      .join("");

}


/* ================= DASHBOARD ================= */

function updateDashboard() {

  const total =
    state.jobs.length;


  const remote =
    state.jobs.filter(
      job =>
        /remote/i.test(
          getLocation(job)
        ) ||
        job.remote === true
    ).length;


  const highScore =
    state.jobs.filter(
      job =>
        getScore(job) >= 80
    ).length;


  const activeApplications =
    Object.values(
      state.apps
    ).filter(
      status =>
        status === "applied" ||
        status === "interview"
    ).length;


  const recent =
    state.jobs.filter(
      job =>
        getPostedDays(job) <= 7
    ).length;


  const sources =
    new Set(
      state.jobs.map(
        getSource
      )
    ).size;


  const locations =
    new Set(
      state.jobs.map(
        getLocation
      )
    ).size;


  const skills =
    new Set(
      state.jobs.flatMap(
        getSkills
      )
    ).size;


  $("relevant").textContent =
    total;


  $("recent").textContent =
    recent;


  $("sources").textContent =
    sources;


  $("roleCount").textContent =
    total;


  $("studentCount").textContent =
    total;


  $("skillCount").textContent =
    skills;


  $("locationCount").textContent =
    locations;


  $("remoteCount").textContent =
    remote;


  $("savedMetric").textContent =
    state.jobs.filter(
      isSaved
    ).length;


  $("remoteMetric").textContent =
    remote;


  $("highMetric").textContent =
    highScore;


  $("activeMetric").textContent =
    activeApplications;


  $("savedCount").textContent =
    state.saved.length;


  /* ================= PROFILE SCORE ================= */

  const average =
    total
      ? Math.round(
          state.jobs.reduce(
            (sum, job) =>
              sum + getScore(job),
            0
          ) / total
        )
      : 0;


  $("profileScore").textContent =
    total
      ? `${average}%`
      : "--%";


  $("profileBar").style.width =
    `${average}%`;


  renderTracker();

}/* ================= APPLICATION TRACKER ================= */

function renderTracker() {

  const columns = {
    saved: $("colSaved"),
    applied: $("colApplied"),
    interview: $("colInterview"),
    closed: $("colClosed")
  };


  Object.values(columns).forEach(
    column => {
      column.innerHTML = "";
    }
  );


  const counts = {
    saved: 0,
    applied: 0,
    interview: 0,
    closed: 0
  };


  state.jobs.forEach(job => {

    const id =
      getId(job);

    const status =
      state.apps[id];


    /*
      Jobs without an application
      status are shown under Saved
      only when actually saved.
    */

    let columnStatus = status;

    if (
      !columnStatus &&
      isSaved(job)
    ) {
      columnStatus = "saved";
    }


    if (
      !columnStatus ||
      !columns[columnStatus]
    ) {
      return;
    }


    counts[columnStatus]++;


    columns[columnStatus]
      .insertAdjacentHTML(
        "beforeend",
        `
          <div class="track-card">

            <b>
              ${escapeHTML(
                getTitle(job)
              )}
            </b>

            <small>
              ${escapeHTML(
                getCompany(job)
              )}
            </small>

            <small>
              ${getScore(job)}% match
            </small>

          </div>
        `
      );

  });


  $("cSaved").textContent =
    counts.saved;

  $("cApplied").textContent =
    counts.applied;

  $("cInterview").textContent =
    counts.interview;

  $("cClosed").textContent =
    counts.closed;

}


/* ================= FILTER EVENTS ================= */

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
].forEach(id => {

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


/* ================= CLEAR FILTERS ================= */

$("clear").addEventListener(
  "click",
  () => {

    $("search").value = "";

    $("location").value = "all";

    $("jobType").value = "all";

    $("workMode").value = "all";

    $("posted").value = "all";

    $("skill").value = "all";

    $("appStatus").value = "all";

    $("minimum").value = "0";

    $("sort").value = "recent";

    applyFilters();

    showToast(
      "Filters cleared"
    );

  }
);


/* ================= SAVED JOBS ================= */

$("savedBtn").addEventListener(
  "click",
  () => {

    $("appStatus").value =
      "saved";

    goToPage("jobs");

    applyFilters();

  }
);


/* ================= EXPORT CSV ================= */

$("export").addEventListener(
  "click",
  exportSavedCSV
);


function exportSavedCSV() {

  const saved =
    state.jobs.filter(
      isSaved
    );


  if (!saved.length) {

    showToast(
      "No saved jobs to export"
    );

    return;

  }


  const header = [
    "Title",
    "Company",
    "Location",
    "Source",
    "Match",
    "Status",
    "URL"
  ];


  const rows =
    saved.map(job => [

      getTitle(job),

      getCompany(job),

      getLocation(job),

      getSource(job),

      getScore(job),

      state.apps[getId(job)] ||
        "saved",

      job.job_url ||
        job.url ||
        job.link ||
        ""

    ]);


  const csv = [
    header,
    ...rows
  ]
    .map(
      row =>
        row
          .map(
            value =>
              `"${String(value)
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
    "CSV exported"
  );

}


/* ================= RESUME FILE ================= */

$("resumeFile").addEventListener(
  "change",
  event => {

    const file =
      event.target.files[0];


    if (!file) {

      $("resumeName").textContent =
        "No resume selected";

      return;

    }


    $("resumeName").textContent =
      `Selected: ${file.name}`;


    showToast(
      "Resume selected"
    );

  }
);


/* ================= START JOB RADAR ================= */

renderTracker();

updateDashboard();

loadJobs();