/* =========================================================
   JOB RADAR — CAREER INTELLIGENCE
   APP.JS — PART 1/6
   ========================================================= */

"use strict";

/* ---------- Global state ---------- */

let allJobs = [];
let filteredJobs = [];
let savedJobs = JSON.parse(localStorage.getItem("jobRadarSaved") || "[]");
let applications = JSON.parse(localStorage.getItem("jobRadarApplications") || "[]");

const state = {
  currentPage: "command",
  currentJob: null,
  currentFilter: "all",
  searchText: "",
  source: "all",
  sort: "match",
  resumeSkills: [],
  profile: {
    targetRole: "Software Developer",
    experience: "Student",
    location: "India",
    skills: [
      "C",
      "C++",
      "Java",
      "Python",
      "HTML",
      "CSS",
      "JavaScript",
      "Firebase",
      "IoT",
      "Git"
    ]
  }
};

/* ---------- DOM helper ---------- */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

/* ---------- Utility ---------- */

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function saveLocalData() {
  localStorage.setItem(
    "jobRadarSaved",
    JSON.stringify(savedJobs)
  );

  localStorage.setItem(
    "jobRadarApplications",
    JSON.stringify(applications)
  );
}

function showToast(message, icon = "✓") {
  const toast = $("#toast");
  const toastMessage = $("#toastMessage");
  const toastIcon = $("#toastIcon");

  if (!toast) return;

  if (toastMessage) {
    toastMessage.textContent = message;
  }

  if (toastIcon) {
    toastIcon.textContent = icon;
  }

  toast.classList.add("show");

  clearTimeout(window.jobRadarToastTimer);

  window.jobRadarToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

/* ---------- Loader ---------- */

function initializeLoader() {
  const loader = $("#pageLoader");

  if (!loader) return;

  window.setTimeout(() => {
    loader.classList.add("hidden");
  }, 500);
}

/* ---------- Page transition ---------- */

function playPageTransition() {
  const transition = $("#pageTransition");

  if (!transition) return;

  transition.classList.remove("active");

  void transition.offsetWidth;

  transition.classList.add("active");

  setTimeout(() => {
    transition.classList.remove("active");
  }, 600);
}

/* ---------- Navigation ---------- */

function setupNavigation() {
  const navItems = $$("[data-page]");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const pageName = item.dataset.page;

      if (!pageName) return;

      navigateTo(pageName);
    });
  });
}

function navigateTo(pageName) {
  const targetPage = document.querySelector(
    `#page-${pageName}`
  );

  if (!targetPage) return;

  playPageTransition();

  setTimeout(() => {
    $$(".page-section").forEach((section) => {
      section.classList.remove("active");
    });

    targetPage.classList.add("active");

    $$(".nav-item").forEach((item) => {
      item.classList.toggle(
        "active",
        item.dataset.page === pageName
      );
    });

    state.currentPage = pageName;

    updatePageTitle(pageName);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    closeMobileMenu();
  }, 220);
}

function updatePageTitle(pageName) {
  const pageNames = {
    command: "Command Center",
    opportunities: "Opportunities",
    "career-agent": "Opportunity Agent",
    resume: "Resume Intelligence",
    skills: "Skill Intelligence",
    "career-twin": "Career Twin",
    applications: "Application Tracker"
  };

  const title = $("#currentPageName");

  if (title) {
    title.textContent =
      pageNames[pageName] || "Job Radar";
  }
}

/* ---------- Mobile menu ---------- */

function setupMobileMenu() {
  const menuButton = $("#mobileMenuButton");
  const sidebar = $("#sidebar");
  const overlay = $("#mobileOverlay");

  if (menuButton) {
    menuButton.addEventListener("click", () => {
      sidebar?.classList.toggle("mobile-open");
      overlay?.classList.toggle("active");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", closeMobileMenu);
  }
}

function closeMobileMenu() {
  $("#sidebar")?.classList.remove("mobile-open");
  $("#mobileOverlay")?.classList.remove("active");
}

/* ---------- Start application ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initializeLoader();
  setupNavigation();
  setupMobileMenu();

  console.log("Job Radar Career Intelligence loaded.");
});/* =========================================================
   PART 2/6 — JOB LOADING, NORMALIZATION & MATCH SCORE
   ========================================================= */

/* ---------- Load jobs ---------- */

async function loadJobs() {
  try {
    const response = await fetch("../data/processed_jobs.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Job data could not be loaded.");
    }

    const data = await response.json();

    const rawJobs = Array.isArray(data)
      ? data
      : Array.isArray(data.jobs)
        ? data.jobs
        : [];

    allJobs = rawJobs
      .map(normalizeJob)
      .filter((job) => job.title);

    filteredJobs = [...allJobs];

    processJobs();

    updateDashboard();
    renderJobs();
    updateAgentPage();
    updateResumePage();
    updateSkillPage();
    updateCareerTwin();
    updateApplicationPipeline();

    console.log(
      `Job Radar loaded ${allJobs.length} opportunities.`
    );

  } catch (error) {
    console.error("Job loading error:", error);

    allJobs = [];
    filteredJobs = [];

    renderJobs();

    showToast(
      "Job data could not be loaded.",
      "!"
    );
  }
}

/* ---------- Normalize job data ---------- */

function normalizeJob(job) {
  const title =
    job.title ||
    job.job_title ||
    job.position ||
    "";

  const company =
    job.company ||
    job.company_name ||
    "Company not specified";

  const location =
    job.location ||
    job.city ||
    "Location not specified";

  const description =
    job.description ||
    job.job_description ||
    "";

  const url =
    job.job_url ||
    job.url ||
    job.link ||
    "#";

  const source =
    job.source ||
    job.site ||
    "Unknown";

  const jobType =
    job.job_type ||
    job.type ||
    "Not specified";

  const remote =
    Boolean(job.is_remote) ||
    /remote/i.test(String(location));

  const datePosted =
    job.date_posted ||
    job.posted_date ||
    "";

  return {
    id: createJobId(title, company, location),

    title: String(title).trim(),

    company: String(company).trim(),

    location: String(location).trim(),

    description: String(description).trim(),

    url: String(url).trim(),

    source: String(source).trim(),

    jobType: String(jobType).trim(),

    remote,

    datePosted,

    skills: extractSkills(
      `${title} ${description}`
    ),

    match: 0,

    matchReasons: [],

    missingSkills: [],

    freshness: calculateFreshness(datePosted)
  };
}

/* ---------- Create stable job ID ---------- */

function createJobId(title, company, location) {
  return [
    title,
    company,
    location
  ]
    .join("|")
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, "-")
    .slice(0, 160);
}

/* ---------- Process jobs ---------- */

function processJobs() {
  allJobs = allJobs.map((job) => {
    const result = calculateMatch(job);

    job.match = result.score;
    job.matchReasons = result.reasons;
    job.missingSkills = result.missingSkills;

    return job;
  });
}

/* ---------- Skill extraction ---------- */

function extractSkills(text) {
  const content = String(text).toLowerCase();

  const skillPatterns = {
    "C": /\bc\b/,
    "C++": /c\+\+/,
    "Java": /\bjava\b/,
    "Python": /\bpython\b/,
    "HTML": /\bhtml\b/,
    "CSS": /\bcss\b/,
    "JavaScript": /javascript|js/,
    "React": /\breact\b/,
    "Node.js": /node\.?js/,
    "SQL": /\bsql\b|mysql|postgresql/,
    "Firebase": /firebase/,
    "Git": /\bgit\b|github/,
    "IoT": /\biot\b|internet of things/,
    "Embedded Systems": /embedded|microcontroller|esp32|arduino/,
    "Flutter": /\bflutter\b/,
    "Dart": /\bdart\b/,
    "AWS": /\baws\b|amazon web services/,
    "Cloud": /\bcloud\b/,
    "Machine Learning": /machine learning|\bml\b/,
    "AI": /\bai\b|artificial intelligence/
  };

  return Object.entries(skillPatterns)
    .filter(([, pattern]) => pattern.test(content))
    .map(([skill]) => skill);
}

/* ---------- Match score ---------- */

function calculateMatch(job) {
  const text = `
    ${job.title}
    ${job.company}
    ${job.location}
    ${job.description}
  `.toLowerCase();

  let score = 0;

  const reasons = [];
  const missingSkills = [];

  /* Target role */

  const roleTerms = [
    "software",
    "developer",
    "engineer",
    "programmer",
    "full stack",
    "frontend",
    "backend",
    "web developer",
    "python developer",
    "java developer",
    "iot"
  ];

  const hasRoleMatch = roleTerms.some(
    (term) => text.includes(term)
  );

  if (hasRoleMatch) {
    score += 30;

    reasons.push(
      "The role matches your software-development target."
    );
  }

  /* Student / entry level */

  const earlyLevelTerms = [
    "intern",
    "internship",
    "trainee",
    "fresher",
    "entry level",
    "graduate"
  ];

  const isEarlyLevel = earlyLevelTerms.some(
    (term) => text.includes(term)
  );

  if (isEarlyLevel) {
    score += 20;

    reasons.push(
      "The opportunity is suitable for an early-career student."
    );
  }

  /* Senior role penalty */

  const seniorTerms = [
    "senior",
    "lead developer",
    "team lead",
    "manager",
    "principal"
  ];

  const isSenior = seniorTerms.some(
    (term) => text.includes(term)
  );

  if (isSenior) {
    score -= 25;
  }

  /* Skill matching */

  const userSkills = state.profile.skills;

  const jobSkills = job.skills || [];

  const matchedSkills = userSkills.filter(
    (skill) =>
      jobSkills.includes(skill)
  );

  if (matchedSkills.length > 0) {
    const skillPoints = Math.min(
      25,
      matchedSkills.length * 4
    );

    score += skillPoints;

    reasons.push(
      `${matchedSkills.length} of your profile skills appear in this opportunity.`
    );
  }

  /* Missing skills */

  const importantSkills = [
    "Python",
    "Java",
    "JavaScript",
    "HTML",
    "CSS",
    "SQL",
    "Git",
    "React",
    "Firebase",
    "IoT",
    "Flutter"
  ];

  importantSkills.forEach((skill) => {
    if (
      jobSkills.includes(skill) &&
      !userSkills.includes(skill)
    ) {
      missingSkills.push(skill);
    }
  });

  /* Location */

  const locationText =
    `${job.location} ${job.description}`.toLowerCase();

  const locationTerms = [
    "india",
    "tamil nadu",
    "coimbatore",
    "chennai",
    "bangalore",
    "bengaluru",
    "remote",
    "work from home"
  ];

  const hasLocationMatch =
    locationTerms.some(
      (term) => locationText.includes(term)
    );

  if (hasLocationMatch) {
    score += 15;

    reasons.push(
      "The location or work mode fits your current search."
    );
  }

  /* Remote bonus */

  if (job.remote) {
    score += 5;

    reasons.push(
      "Remote work is available according to the collected listing data."
    );
  }

  /* Keep score within 0–100 */

  score = Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );

  return {
    score,
    reasons,
    missingSkills
  };
}/* =========================================================
   PART 3/6 — SEARCH, FILTERS, SORTING & JOB CARDS
   ========================================================= */

/* ---------- Search setup ---------- */

function setupSearch() {
  const searchInput = $("#jobSearch");

  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    state.searchText = searchInput.value.trim().toLowerCase();

    applyJobFilters();
  });
}

/* ---------- Filters setup ---------- */

function setupFilters() {
  const filterButtons = $$("[data-filter]");
  const sourceFilter = $("#sourceFilter");
  const sortJobs = $("#sortJobs");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      state.currentFilter =
        button.dataset.filter || "all";

      applyJobFilters();
    });
  });

  if (sourceFilter) {
    sourceFilter.addEventListener("change", () => {
      state.source = sourceFilter.value;
      applyJobFilters();
    });
  }

  if (sortJobs) {
    sortJobs.addEventListener("change", () => {
      state.sort = sortJobs.value;
      applyJobFilters();
    });
  }
}

/* ---------- Apply filters ---------- */

function applyJobFilters() {
  let jobs = [...allJobs];

  /* Search */

  if (state.searchText) {
    jobs = jobs.filter((job) => {
      const searchableText = `
        ${job.title}
        ${job.company}
        ${job.location}
        ${job.description}
        ${job.skills.join(" ")}
      `.toLowerCase();

      return searchableText.includes(
        state.searchText
      );
    });
  }

  /* Category filter */

  switch (state.currentFilter) {

    case "strong":
      jobs = jobs.filter(
        (job) => job.match >= 70
      );
      break;

    case "internship":
      jobs = jobs.filter((job) =>
        /intern|internship|trainee|fresher/i.test(
          `${job.title} ${job.description}`
        )
      );
      break;

    case "remote":
      jobs = jobs.filter(
        (job) => job.remote
      );
      break;

    case "saved":
      jobs = jobs.filter(
        (job) => isJobSaved(job)
      );
      break;

    case "all":
    default:
      break;
  }

  /* Source */

  if (
    state.source &&
    state.source !== "all"
  ) {
    jobs = jobs.filter(
      (job) =>
        job.source.toLowerCase() ===
        state.source.toLowerCase()
    );
  }

  /* Sorting */

  jobs.sort((a, b) => {

    if (state.sort === "fresh") {
      return freshnessValue(b) -
        freshnessValue(a);
    }

    if (state.sort === "title") {
      return a.title.localeCompare(
        b.title
      );
    }

    if (state.sort === "company") {
      return a.company.localeCompare(
        b.company
      );
    }

    return b.match - a.match;
  });

  filteredJobs = jobs;

  renderJobs();
}

/* ---------- Render jobs ---------- */

function renderJobs() {
  const container = $("#jobResults");
  const resultCount = $("#resultCount");

  if (!container) return;

  if (resultCount) {
    resultCount.textContent =
      `${filteredJobs.length} opportunities`;
  }

  if (!filteredJobs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No matching opportunities</h3>
        <p>
          Try changing your search, source or filters.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    filteredJobs
      .map(createJobCard)
      .join("");
}

/* ---------- Job card ---------- */

function createJobCard(job) {
  const saved = isJobSaved(job);

  const skills = job.skills
    .slice(0, 5)
    .map(
      (skill) =>
        `<span>${escapeHTML(skill)}</span>`
    )
    .join("");

  const matchClass =
    job.match >= 70
      ? "strong"
      : job.match >= 45
        ? "medium"
        : "low";

  return `
    <article
      class="job-card"
      data-job-id="${escapeHTML(job.id)}"
    >

      <div class="job-card-top">

        <div>
          <h3>
            ${escapeHTML(job.title)}
          </h3>

          <div class="job-company">
            ${escapeHTML(job.company)}
          </div>

          <div class="job-location">
            ${escapeHTML(job.location)}
          </div>
        </div>

        <div
          class="match-score ${matchClass}"
          title="Personalized match score"
        >
          ${job.match}%
        </div>

      </div>

      <div class="job-meta">

        <span>
          ${escapeHTML(job.source)}
        </span>

        <span>
          ${escapeHTML(job.jobType)}
        </span>

        ${
          job.remote
            ? "<span>Remote</span>"
            : ""
        }

        <span>
          ${escapeHTML(
            formatFreshness(job.freshness)
          )}
        </span>

      </div>

      <div class="job-meta">
        ${skills}
      </div>

      <div class="job-card-actions">

        <button
          type="button"
          data-job-action="details"
          data-job-id="${escapeHTML(job.id)}"
        >
          View details
        </button>

        <button
          type="button"
          data-job-action="why"
          data-job-id="${escapeHTML(job.id)}"
        >
          Why this job?
        </button>

        <button
          type="button"
          data-job-action="save"
          data-job-id="${escapeHTML(job.id)}"
        >
          ${saved ? "Saved" : "Save"}
        </button>

      </div>

    </article>
  `;
}

/* ---------- Job action events ---------- */

function setupJobActions() {
  document.addEventListener(
    "click",
    (event) => {

      const button =
        event.target.closest(
          "[data-job-action]"
        );

      if (!button) return;

      const jobId =
        button.dataset.jobId;

      const action =
        button.dataset.jobAction;

      const job =
        allJobs.find(
          (item) => item.id === jobId
        );

      if (!job) return;

      if (action === "details") {
        openJobModal(job);
      }

      if (action === "why") {
        openWhyModal(job);
      }

      if (action === "save") {
        toggleSavedJob(job);
      }
    }
  );
}

/* ---------- Saved jobs ---------- */

function isJobSaved(job) {
  return savedJobs.some(
    (saved) =>
      saved.id === job.id
  );
}

function toggleSavedJob(job) {

  const index = savedJobs.findIndex(
    (saved) =>
      saved.id === job.id
  );

  if (index >= 0) {

    savedJobs.splice(index, 1);

    showToast(
      "Job removed from saved jobs.",
      "−"
    );

  } else {

    savedJobs.push({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      savedAt: new Date().toISOString()
    });

    showToast(
      "Job saved successfully.",
      "✓"
    );
  }

  saveLocalData();

  renderJobs();

  updateDashboard();
  updateApplicationPipeline();
  updateAgentPage();
}/* =========================================================
   PART 4/6 — DASHBOARD, AGENT, RESUME & SKILLS
   ========================================================= */

/* ---------- Dashboard ---------- */

function updateDashboard() {

  const totalJobs =
    $("#totalJobs");

  const strongMatches =
    $("#strongMatches");

  const savedCount =
    $("#savedCount");

  const skillCount =
    $("#skillCount");

  if (totalJobs) {
    totalJobs.textContent =
      allJobs.length;
  }

  if (strongMatches) {
    strongMatches.textContent =
      allJobs.filter(
        (job) => job.match >= 70
      ).length;
  }

  if (savedCount) {
    savedCount.textContent =
      savedJobs.length;
  }

  if (skillCount) {
    skillCount.textContent =
      state.profile.skills.length;
  }

  updateOpportunityPulse();
  updateSourceIntelligence();
  updateCareerReadiness();
}

/* ---------- Career readiness ---------- */

function updateCareerReadiness() {

  const scoreElement =
    $("#careerReadinessScore");

  const progress =
    $("#careerReadinessProgress");

  if (!scoreElement) return;

  let score = 40;

  if (state.profile.skills.length >= 5) {
    score += 15;
  }

  if (state.profile.skills.length >= 8) {
    score += 10;
  }

  if (savedJobs.length > 0) {
    score += 10;
  }

  if (applications.length > 0) {
    score += 10;
  }

  if (state.resumeSkills.length > 0) {
    score += 10;
  }

  score = Math.min(
    100,
    score
  );

  scoreElement.textContent =
    `${score}%`;

  if (progress) {
    progress.style.width =
      `${score}%`;
  }
}

/* ---------- Opportunity Pulse ---------- */

function updateOpportunityPulse() {

  const container =
    $("#opportunityPulse");

  if (!container) return;

  const strong =
    allJobs.filter(
      (job) => job.match >= 70
    ).length;

  const internships =
    allJobs.filter((job) =>
      /intern|internship|trainee|fresher/i.test(
        `${job.title} ${job.description}`
      )
    ).length;

  container.innerHTML = `
    <div class="card-header">
      <div>
        <h2>Opportunity Pulse</h2>
        <p>Current signals from collected jobs</p>
      </div>
    </div>

    <div class="agent-stat-grid">

      <div class="agent-stat">
        <strong>${allJobs.length}</strong>
        <span>Total opportunities</span>
      </div>

      <div class="agent-stat">
        <strong>${strong}</strong>
        <span>Strong matches</span>
      </div>

      <div class="agent-stat">
        <strong>${internships}</strong>
        <span>Early-career roles</span>
      </div>

    </div>
  `;
}

/* ---------- Source intelligence ---------- */

function updateSourceIntelligence() {

  const container =
    $("#sourceIntelligence");

  if (!container) return;

  const sourceMap = {};

  allJobs.forEach((job) => {

    const source =
      job.source || "Unknown";

    sourceMap[source] =
      (sourceMap[source] || 0) + 1;
  });

  const entries =
    Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1]);

  container.innerHTML = `
    <div class="card-header">
      <div>
        <h2>Source Intelligence</h2>
        <p>Where your opportunities are coming from</p>
      </div>
    </div>

    <div class="skill-demand-list">

      ${
        entries.length
          ? entries.map(
              ([source, count]) => {

                const percentage =
                  allJobs.length
                    ? Math.round(
                        count /
                        allJobs.length *
                        100
                      )
                    : 0;

                return `
                  <div class="skill-demand-row">

                    <span>
                      ${escapeHTML(source)}
                    </span>

                    <div class="skill-demand-bar">
                      <span
                        style="width:${percentage}%"
                      ></span>
                    </div>

                    <strong>
                      ${count}
                    </strong>

                  </div>
                `;
              }
            ).join("")
          : `
            <div class="empty-state">
              <p>No source data available.</p>
            </div>
          `
      }

    </div>
  `;
}

/* ---------- Opportunity Agent ---------- */

function updateAgentPage() {

  const count =
    $("#agentOpportunityCount");

  const strong =
    $("#agentStrongMatches");

  const skills =
    $("#agentSkillCount");

  const saved =
    $("#agentSavedCount");

  const status =
    $("#agentStatus");

  if (count) {
    count.textContent =
      allJobs.length;
  }

  if (strong) {
    strong.textContent =
      allJobs.filter(
        (job) => job.match >= 70
      ).length;
  }

  if (skills) {
    skills.textContent =
      state.profile.skills.length;
  }

  if (saved) {
    saved.textContent =
      savedJobs.length;
  }

  if (status) {
    status.textContent =
      allJobs.length
        ? "Active — profile analyzed"
        : "Waiting for job data";
  }
}

/* ---------- Resume page ---------- */

function updateResumePage() {

  const skillList =
    $("#resumeSkillList");

  if (skillList) {

    if (!state.resumeSkills.length) {

      skillList.innerHTML = `
        <span class="skill-tag">
          Upload a resume to analyze skills
        </span>
      `;

    } else {

      skillList.innerHTML =
        state.resumeSkills
          .map(
            (skill) =>
              `<span class="skill-tag">
                ${escapeHTML(skill)}
              </span>`
          )
          .join("");
    }
  }

  const matchScore =
    $("#resumeMatchScore");

  const matchProgress =
    $("#resumeMatchProgress");

  const readiness =
    $("#resumeReadinessScore");

  const readinessProgress =
    $("#resumeReadinessProgress");

  const matchingJobs =
    $("#resumeMatchCount");

  const resumeMatches =
    $("#resumeMatches");

  const matched =
    state.resumeSkills.length
      ? allJobs.filter((job) => {

          const overlap =
            job.skills.filter(
              (skill) =>
                state.resumeSkills.includes(
                  skill
                )
            );

          return overlap.length > 0;

        })
      : [];

  const average =
    matched.length
      ? Math.round(
          matched.reduce(
            (sum, job) =>
              sum + job.match,
            0
          ) / matched.length
        )
      : 0;

  if (matchScore) {
    matchScore.textContent =
      `${average}%`;
  }

  if (matchProgress) {
    matchProgress.style.width =
      `${average}%`;
  }

  if (matchingJobs) {
    matchingJobs.textContent =
      matched.length;
  }

  if (readiness) {

    const readinessScore =
      state.resumeSkills.length
        ? Math.min(
            100,
            40 +
            state.resumeSkills.length * 5
          )
        : 0;

    readiness.textContent =
      `${readinessScore}%`;

    if (readinessProgress) {
      readinessProgress.style.width =
        `${readinessScore}%`;
    }
  }

  if (resumeMatches) {

    resumeMatches.innerHTML =
      matched
        .slice(0, 6)
        .map(createJobCard)
        .join("") ||
      `
        <div class="empty-state">
          <p>No resume-matched jobs yet.</p>
        </div>
      `;
  }
}

/* ---------- Skill page ---------- */

function updateSkillPage() {

  const profileCount =
    $("#profileSkillCount");

  const demandCount =
    $("#demandSkillCount");

  const gapCount =
    $("#skillGapCount");

  const gapList =
    $("#skillGapList");

  const demandList =
    $("#skillDemandList");

  if (profileCount) {
    profileCount.textContent =
      state.profile.skills.length;
  }

  const demand = {};

  allJobs.forEach((job) => {
    job.skills.forEach((skill) => {
      demand[skill] =
        (demand[skill] || 0) + 1;
    });
  });

  const demandEntries =
    Object.entries(demand)
      .sort((a, b) => b[1] - a[1]);

  if (demandCount) {
    demandCount.textContent =
      demandEntries.length;
  }

  const gaps =
    demandEntries
      .map(([skill]) => skill)
      .filter(
        (skill) =>
          !state.profile.skills.includes(
            skill
          )
      );

  if (gapCount) {
    gapCount.textContent =
      gaps.length;
  }

  if (gapList) {
    gapList.innerHTML =
      gaps
        .slice(0, 8)
        .map(
          (skill) => `
            <div class="skill-gap-item">
              <strong>
                ${escapeHTML(skill)}
              </strong>
              <span>
                Skill gap
              </span>
            </div>
          `
        )
        .join("") ||
      `
        <div class="empty-state">
          <p>No major skill gaps detected.</p>
        </div>
      `;
  }

  if (demandList) {

    const max =
      demandEntries.length
        ? demandEntries[0][1]
        : 1;

    demandList.innerHTML =
      demandEntries
        .slice(0, 10)
        .map(
          ([skill, count]) => {

            const width =
              Math.round(
                count / max * 100
              );

            return `
              <div class="skill-demand-row">

                <span>
                  ${escapeHTML(skill)}
                </span>

                <div class="skill-demand-bar">
                  <span
                    style="width:${width}%"
                  ></span>
                </div>

                <strong>
                  ${count}
                </strong>

              </div>
            `;
          }
        )
        .join("");
  }
}/* =========================================================
   PART 5/6 — MODALS, RESUME UPLOAD & CAREER TWIN
   ========================================================= */

/* ---------- Job details modal ---------- */

function openJobModal(job) {
  const modal = $("#jobModal");

  if (!modal) return;

  state.currentJob = job;

  const source = $("#modalSource");
  const title = $("#modalJobTitle");
  const company = $("#modalCompany");
  const match = $("#modalMatch");
  const location = $("#modalLocation");
  const type = $("#modalType");
  const freshness = $("#modalFreshness");
  const why = $("#modalWhy");
  const skills = $("#modalSkills");
  const description = $("#modalDescription");

  if (source) source.textContent = job.source;
  if (title) title.textContent = job.title;
  if (company) company.textContent = job.company;
  if (match) match.textContent = `${job.match}%`;
  if (location) location.textContent = job.location;
  if (type) type.textContent = job.jobType;
  if (freshness) {
    freshness.textContent =
      formatFreshness(job.freshness);
  }

  if (why) {
    why.innerHTML =
      job.matchReasons.length
        ? job.matchReasons
            .map(
              (reason) =>
                `<div class="why-item">${escapeHTML(reason)}</div>`
            )
            .join("")
        : `<div class="why-item">Limited matching signals were found.</div>`;
  }

  if (skills) {
    skills.innerHTML =
      job.skills.length
        ? job.skills
            .map(
              (skill) =>
                `<span class="skill-tag">${escapeHTML(skill)}</span>`
            )
            .join("")
        : `<span class="skill-tag">No skills detected</span>`;
  }

  if (description) {
    description.textContent =
      job.description ||
      "No description was provided in the collected listing.";
  }

  const saveButton = $("#modalSave");

  if (saveButton) {
    saveButton.textContent =
      isJobSaved(job)
        ? "Saved"
        : "Save job";
  }

  const openButton = $("#modalOpenJob");

  if (openButton) {
    openButton.onclick = () => {

      if (
        job.url &&
        job.url !== "#"
      ) {
        window.open(
          job.url,
          "_blank",
          "noopener,noreferrer"
        );
      } else {
        showToast(
          "Job link is not available.",
          "!"
        );
      }
    };
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

/* ---------- Why this job ---------- */

function openWhyModal(job) {
  const modal = $("#whyModal");
  const content = $("#whyJobContent");

  if (!modal || !content) return;

  state.currentJob = job;

  content.innerHTML = `
    <div class="why-signal">
      <strong>Match score</strong>
      <span>
        ${job.match}% based on the current profile and collected job data.
      </span>
    </div>

    <div class="why-signal">
      <strong>Why it matches</strong>
      <span>
        ${
          job.matchReasons.length
            ? escapeHTML(
                job.matchReasons.join(" ")
              )
            : "No strong matching signal was detected."
        }
      </span>
    </div>

    <div class="why-signal">
      <strong>Skills detected</strong>
      <span>
        ${
          job.skills.length
            ? escapeHTML(
                job.skills.join(", ")
              )
            : "No skills detected."
        }
      </span>
    </div>

    <div class="why-signal">
      <strong>Possible skill gaps</strong>
      <span>
        ${
          job.missingSkills.length
            ? escapeHTML(
                job.missingSkills.join(", ")
              )
            : "No major gap detected from the available signals."
        }
      </span>
    </div>

    <div class="why-signal">
      <strong>Next action</strong>
      <span>
        Review the original listing and verify requirements before applying.
      </span>
    </div>
  `;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

/* ---------- Modal events ---------- */

function setupModalEvents() {

  const closeButtons = [
    "#modalClose",
    "#whyModalClose"
  ];

  closeButtons.forEach((selector) => {

    const button = $(selector);

    if (button) {
      button.addEventListener(
        "click",
        closeModals
      );
    }
  });

  ["jobModal", "whyModal"].forEach(
    (id) => {

      const modal = $(`#${id}`);

      if (!modal) return;

      modal.addEventListener(
        "click",
        (event) => {

          if (
            event.target === modal
          ) {
            closeModals();
          }
        }
      );
    }
  );

  const saveButton =
    $("#modalSave");

  if (saveButton) {

    saveButton.addEventListener(
      "click",
      () => {

        if (!state.currentJob) return;

        toggleSavedJob(
          state.currentJob
        );

        saveButton.textContent =
          isJobSaved(
            state.currentJob
          )
            ? "Saved"
            : "Save job";
      }
    );
  }
}

function closeModals() {

  $("#jobModal")
    ?.classList.remove("active");

  $("#whyModal")
    ?.classList.remove("active");

  document.body.style.overflow = "";
}

/* ---------- Resume upload ---------- */

function setupResumeUpload() {

  const fileInput =
    $("#resumeFile");

  const uploadButton =
    $("#resumeUploadButton");

  const fileName =
    $("#resumeFileName");

  if (!fileInput) return;

  if (uploadButton) {

    uploadButton.addEventListener(
      "click",
      () => fileInput.click()
    );
  }

  fileInput.addEventListener(
    "change",
    () => {

      const file =
        fileInput.files?.[0];

      if (!file) return;

      if (fileName) {
        fileName.textContent =
          file.name;
      }

      analyzeResumeFile(file);
    }
  );
}

/* ---------- Resume analysis ---------- */

async function analyzeResumeFile(file) {

  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();

  /*
   * Browser-only lightweight analyzer.
   * TXT files can be read directly.
   * PDF/DOCX files are acknowledged but
   * require a parser/backend for full extraction.
   */

  if (extension === "txt") {

    try {

      const text =
        await file.text();

      state.resumeSkills =
        extractSkills(text);

      if (!state.resumeSkills.length) {
        showToast(
          "No known technical skills detected.",
          "!"
        );
      } else {
        showToast(
          `${state.resumeSkills.length} skills detected from resume.`,
          "✓"
        );
      }

    } catch (error) {

      console.error(error);

      showToast(
        "Could not read the resume.",
        "!"
      );
    }

  } else {

    showToast(
      "File selected. Full PDF/DOCX extraction needs a document parser.",
      "i"
    );

    /*
     * Use the profile skills as a temporary
     * browser-side analysis baseline.
     */
    state.resumeSkills = [
      ...state.profile.skills
    ];
  }

  updateResumePage();
  updateDashboard();
}

/* ---------- Career Twin ---------- */

function updateCareerTwin() {

  const targetRole =
    $("#twinTargetRole");

  const experience =
    $("#twinExperience");

  const location =
    $("#twinLocation");

  const roleDisplay =
    $("#twinRoleDisplay");

  const experienceDisplay =
    $("#twinExperienceDisplay");

  const locationDisplay =
    $("#twinLocationDisplay");

  const skillCount =
    $("#twinSkillCount");

  const opportunityCount =
    $("#twinOpportunityCount");

  if (targetRole) {
    targetRole.value =
      state.profile.targetRole;
  }

  if (experience) {
    experience.value =
      state.profile.experience;
  }

  if (location) {
    location.value =
      state.profile.location;
  }

  if (roleDisplay) {
    roleDisplay.textContent =
      state.profile.targetRole;
  }

  if (experienceDisplay) {
    experienceDisplay.textContent =
      state.profile.experience;
  }

  if (locationDisplay) {
    locationDisplay.textContent =
      state.profile.location;
  }

  if (skillCount) {
    skillCount.textContent =
      state.profile.skills.length;
  }

  if (opportunityCount) {
    opportunityCount.textContent =
      allJobs.filter(
        (job) => job.match >= 50
      ).length;
  }

  updateCareerPath();
}

/* ---------- Career path ---------- */

function updateCareerPath() {

  const container =
    $("#careerPath");

  if (!container) return;

  const strongMatches =
    allJobs.filter(
      (job) => job.match >= 70
    ).length;

  const skillGaps =
    getSkillGaps().slice(0, 3);

  container.innerHTML = `

    <div class="path-step">
      <strong>Current profile</strong>
      <p>
        ${state.profile.skills.length}
        tracked skills and
        ${escapeHTML(state.profile.experience)}
        experience level.
      </p>
    </div>

    <div class="path-step">
      <strong>Target role</strong>
      <p>
        ${escapeHTML(
          state.profile.targetRole
        )}
      </p>
    </div>

    <div class="path-step">
      <strong>Opportunity pool</strong>
      <p>
        ${strongMatches}
        strong-match opportunities currently detected.
      </p>
    </div>

    <div class="path-step">
      <strong>Next skill focus</strong>
      <p>
        ${
          skillGaps.length
            ? escapeHTML(
                skillGaps.join(", ")
              )
            : "Continue strengthening your current skills."
        }
      </p>
    </div>
  `;
}

function getSkillGaps() {

  const demand = {};

  allJobs.forEach((job) => {

    job.skills.forEach((skill) => {

      demand[skill] =
        (demand[skill] || 0) + 1;
    });
  });

  return Object.entries(demand)
    .sort((a, b) => b[1] - a[1])
    .map(([skill]) => skill)
    .filter(
      (skill) =>
        !state.profile.skills.includes(
          skill
        )
    );
}

/* ---------- Career Twin form ---------- */

function setupCareerTwin() {

  const form =
    $("#twinForm");

  if (!form) return;

  form.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      const role =
        $("#twinTargetRole");

      const experience =
        $("#twinExperience");

      const location =
        $("#twinLocation");

      if (role?.value) {
        state.profile.targetRole =
          role.value;
      }

      if (experience?.value) {
        state.profile.experience =
          experience.value;
      }

      if (location?.value) {
        state.profile.location =
          location.value;
      }

      processJobs();
      updateCareerTwin();
      updateDashboard();
      renderJobs();

      showToast(
        "Career profile updated.",
        "✓"
      );
    }
  );
}/* =========================================================
   PART 6/6 — APPLICATIONS, SEARCH, NOTIFICATIONS & STARTUP
   ========================================================= */

/* ---------- Application tracker ---------- */

function updateApplicationPipeline() {

  const saved =
    $("#pipelineSavedCount");

  const applied =
    $("#pipelineAppliedCount");

  const interview =
    $("#pipelineInterviewCount");

  const closed =
    $("#pipelineClosedCount");

  if (saved) {
    saved.textContent =
      applications.filter(
        (item) => item.status === "saved"
      ).length;
  }

  if (applied) {
    applied.textContent =
      applications.filter(
        (item) => item.status === "applied"
      ).length;
  }

  if (interview) {
    interview.textContent =
      applications.filter(
        (item) => item.status === "interview"
      ).length;
  }

  if (closed) {
    closed.textContent =
      applications.filter(
        (item) => item.status === "closed"
      ).length;
  }

  renderApplicationLists();
}

function renderApplicationLists() {

  const columns = {
    saved: "#pipelineSaved",
    applied: "#pipelineApplied",
    interview: "#pipelineInterview",
    closed: "#pipelineClosed"
  };

  Object.entries(columns).forEach(
    ([status, selector]) => {

      const container =
        $(selector);

      if (!container) return;

      const items =
        applications.filter(
          (item) =>
            item.status === status
        );

      container.innerHTML =
        items
          .map(
            (item) => `
              <div class="application-card">

                <strong>
                  ${escapeHTML(item.title)}
                </strong>

                <span>
                  ${escapeHTML(item.company)}
                </span>

              </div>
            `
          )
          .join("") ||
        `
          <div class="empty-state">
            <p>No applications here.</p>
          </div>
        `;
    }
  );

  const followup =
    $("#followupList");

  if (followup) {

    const followups =
      applications.filter(
        (item) =>
          item.status === "applied"
      );

    followup.innerHTML =
      followups
        .slice(0, 6)
        .map(
          (item) => `
            <div class="followup-item">

              <div>
                <strong>
                  ${escapeHTML(item.company)}
                </strong>

                <span>
                  ${escapeHTML(item.title)}
                </span>
              </div>

              <button
                type="button"
                onclick="showToast('Follow-up reminder noted.', '✓')"
              >
                Follow up
              </button>

            </div>
          `
        )
        .join("") ||
      `
        <div class="empty-state">
          <p>No follow-ups yet.</p>
        </div>
      `;
  }
}

/* ---------- Global search ---------- */

function setupGlobalSearch() {

  const overlay =
    $("#searchOverlay");

  const input =
    $("#globalSearchInput");

  const openButton =
    $("[data-open-search]");

  const closeButton =
    $("#closeGlobalSearch");

  if (openButton) {

    openButton.addEventListener(
      "click",
      openGlobalSearch
    );
  }

  if (closeButton) {

    closeButton.addEventListener(
      "click",
      closeGlobalSearch
    );
  }

  if (input) {

    input.addEventListener(
      "input",
      () => {

        const query =
          input.value
            .trim()
            .toLowerCase();

        renderGlobalSearch(
          query
        );
      }
    );
  }

  if (overlay) {

    overlay.addEventListener(
      "click",
      (event) => {

        if (
          event.target === overlay
        ) {
          closeGlobalSearch();
        }
      }
    );
  }
}

function openGlobalSearch() {

  const overlay =
    $("#searchOverlay");

  const input =
    $("#globalSearchInput");

  if (!overlay) return;

  overlay.classList.add("active");

  setTimeout(() => {
    input?.focus();
  }, 100);
}

function closeGlobalSearch() {

  $("#searchOverlay")
    ?.classList.remove("active");
}

function renderGlobalSearch(query) {

  const container =
    $("#globalSearchResults");

  if (!container) return;

  if (!query) {

    container.innerHTML = `
      <div class="empty-state">
        <p>Search jobs, companies or skills.</p>
      </div>
    `;

    return;
  }

  const results =
    allJobs.filter((job) => {

      const text = `
        ${job.title}
        ${job.company}
        ${job.location}
        ${job.skills.join(" ")}
      `.toLowerCase();

      return text.includes(query);

    }).slice(0, 10);

  container.innerHTML =
    results
      .map(
        (job) => `
          <div
            class="search-result"
            data-search-job="${escapeHTML(job.id)}"
          >
            <strong>
              ${escapeHTML(job.title)}
            </strong>

            <span>
              ${escapeHTML(job.company)}
              ·
              ${job.match}% match
            </span>
          </div>
        `
      )
      .join("") ||
    `
      <div class="empty-state">
        <p>No matching opportunities found.</p>
      </div>
    `;
}

/* ---------- Search result click ---------- */

document.addEventListener(
  "click",
  (event) => {

    const result =
      event.target.closest(
        "[data-search-job]"
      );

    if (!result) return;

    const job =
      allJobs.find(
        (item) =>
          item.id ===
          result.dataset.searchJob
      );

    if (job) {
      closeGlobalSearch();
      openJobModal(job);
    }
  }
);

/* ---------- Notifications ---------- */

function setupNotificationPanel() {

  const panel =
    $("#notificationPanel");

  const openButton =
    $("[data-open-notifications]");

  const closeButton =
    $("#closeNotifications");

  if (openButton) {

    openButton.addEventListener(
      "click",
      () => {

        panel?.classList.toggle(
          "active"
        );
      }
    );
  }

  if (closeButton) {

    closeButton.addEventListener(
      "click",
      () => {
        panel?.classList.remove(
          "active"
        );
      }
    );
  }
}

/* ---------- Action buttons ---------- */

function setupActionButtons() {

  $$("[data-action-button]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const action =
            button.dataset.actionButton;

          const pageMap = {
            find: "opportunities",
            agent: "career-agent",
            skills: "skills",
            resume: "resume"
          };

          if (pageMap[action]) {
            navigateTo(
              pageMap[action]
            );
          }
        }
      );
    });
}

/* ---------- Agent buttons ---------- */

function setupAgentButtons() {

  $$("[data-agent-action]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const action =
            button.dataset.agentAction;

          if (action === "find") {
            navigateTo(
              "opportunities"
            );
          }

          if (action === "skills") {
            navigateTo("skills");
          }

          if (action === "resume") {
            navigateTo("resume");
          }

          if (action === "refresh") {
            loadJobs();

            showToast(
              "Opportunity analysis refreshed.",
              "✓"
            );
          }
        }
      );
    });
}

/* ---------- Keyboard shortcuts ---------- */

function setupGlobalShortcuts() {

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "/" &&
        document.activeElement?.tagName !==
          "INPUT" &&
        document.activeElement?.tagName !==
          "TEXTAREA"
      ) {

        event.preventDefault();

        openGlobalSearch();
      }

      if (event.key === "Escape") {

        closeGlobalSearch();
        closeModals();
      }
    }
  );
}

/* ---------- Freshness ---------- */

function calculateFreshness(date) {

  if (!date) return 999;

  const posted =
    new Date(date);

  if (Number.isNaN(
    posted.getTime()
  )) {
    return 999;
  }

  const now =
    new Date();

  return Math.max(
    0,
    Math.floor(
      (
        now - posted
      ) /
      (1000 * 60 * 60 * 24)
    )
  );
}

function freshnessValue(job) {
  return Number(job.freshness) || 999;
}

function formatFreshness(days) {

  if (
    days === null ||
    days === undefined ||
    days >= 999
  ) {
    return "Date unavailable";
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  return `${days} days ago`;
}

/* ---------- Final initialization ---------- */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupSearch();
    setupFilters();
    setupJobActions();

    setupModalEvents();
    setupResumeUpload();
    setupCareerTwin();

    setupGlobalSearch();
    setupNotificationPanel();

    setupActionButtons();
    setupAgentButtons();

    setupGlobalShortcuts();

    loadJobs();

    updateDashboard();
    updateApplicationPipeline();

    console.log(
      "Job Radar initialization complete."
    );
  }
);