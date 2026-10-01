/* =========================================================
   JOB RADAR
   APP.JS — PART 1
   Core setup + data loading
   ========================================================= */

'use strict';


/* =========================================================
   DATA SOURCE
   ========================================================= */

const DATA_URL = '/data/processed_jobs.json';


/* =========================================================
   LOCAL STORAGE KEYS
   ========================================================= */

const STORAGE_KEYS = {
  savedJobs: 'jobRadarSavedJobs',
  applicationStatus: 'jobRadarApplicationStatus',
  avoidedJobs: 'jobRadarAvoidedJobs',
  resumeProfile: 'jobRadarResumeProfile'
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

const state = {

  jobs: [],

  filteredJobs: [],

  savedJobs: new Set(),

  avoidedJobs: new Set(),

  applicationStatus: {},

  resumeProfile: {

    name: '',
    email: '',
    role: '',
    location: '',
    skills: '',
    projects: ''

  },

  currentJob: null,

  showSavedOnly: false,

  selectedSkill: '',

  isLoading: false

};


/* =========================================================
   SHORT DOM HELPER
   ========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   TEXT HELPER
   ========================================================= */

function text(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);

}


/* =========================================================
   LOWERCASE / NORMALIZE
   ========================================================= */

function normalize(value) {

  return text(value)
    .toLowerCase()
    .trim();

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}


/* =========================================================
   ARRAY HELPER
   ========================================================= */

function asArray(value) {

  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return [];
  }

  return [value];

}


/* =========================================================
   UNIQUE VALUES
   ========================================================= */

function unique(values) {

  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(value => text(value).trim())
        .filter(Boolean)
    )
  ];

}


/* =========================================================
   JOB ID
   ========================================================= */

function getId(job) {

  return text(
    job.id ||
    job.job_id ||
    job.job_url ||
    `${job.title}-${job.company}-${job.location}`
  )
    .replace(/\s+/g, '-')
    .slice(0, 220);

}


/* =========================================================
   JOB TITLE
   ========================================================= */

function getJobTitle(job) {

  return text(
    job.title ||
    job.job_title ||
    'Untitled opportunity'
  );

}


/* =========================================================
   COMPANY
   ========================================================= */

function getCompany(job) {

  return text(
    job.company ||
    job.company_name ||
    'Company not listed'
  );

}


/* =========================================================
   LOCATION
   ========================================================= */

function getLocation(job) {

  return text(
    job.location ||
    job.city ||
    'Location not listed'
  );

}


/* =========================================================
   DESCRIPTION
   ========================================================= */

function getDescription(job) {

  return text(
    job.description ||
    job.job_description ||
    ''
  );

}


/* =========================================================
   JOB TYPE
   ========================================================= */

function getJobType(job) {

  return text(
    job.job_type ||
    job.type ||
    'Not specified'
  );

}


/* =========================================================
   WORK MODE
   ========================================================= */

function getWorkMode(job) {

  if (job.work_mode) {
    return text(job.work_mode);
  }

  if (job.is_remote === true) {
    return 'Remote';
  }

  const location = normalize(
    `${job.location || ''} ${job.description || ''}`
  );

  if (
    location.includes('remote') ||
    location.includes('work from home')
  ) {
    return 'Remote';
  }

  return 'On-site';

}


/* =========================================================
   SOURCE
   ========================================================= */

function getSource(job) {

  return text(
    job.source ||
    job.site ||
    'Job board'
  );

}


/* =========================================================
   JOB URL
   ========================================================= */

function getJobURL(job) {

  const url = text(
    job.job_url ||
    job.url ||
    job.link ||
    ''
  ).trim();

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return '#';

}


/* =========================================================
   JOB SKILLS
   ========================================================= */

function getJobSkills(job) {

  const values = [

    ...asArray(job.matched_skills),

    ...asArray(job.skills),

    ...asArray(job.required_skills)

  ];

  return unique(values);

}


/* =========================================================
   JOB SEARCH TEXT
   ========================================================= */

function getJobText(job) {

  return normalize([

    job.title,

    job.company,

    job.location,

    job.description,

    job.skills,

    job.matched_skills,

    job.required_skills,

    job.category,

    job.job_type,

    job.work_mode,

    job.source

  ].join(' '));

}


/* =========================================================
   REMOTE CHECK
   ========================================================= */

function isRemote(job) {

  if (job.is_remote === true) {
    return true;
  }

  const value = normalize(
    `${job.work_mode || ''} ${job.location || ''}`
  );

  return (
    value.includes('remote') ||
    value.includes('work from home')
  );

}


/* =========================================================
   SAVE STATE
   ========================================================= */

function saveLocalState() {

  try {

    localStorage.setItem(
      STORAGE_KEYS.savedJobs,
      JSON.stringify([...state.savedJobs])
    );

    localStorage.setItem(
      STORAGE_KEYS.applicationStatus,
      JSON.stringify(state.applicationStatus)
    );

    localStorage.setItem(
      STORAGE_KEYS.avoidedJobs,
      JSON.stringify([...state.avoidedJobs])
    );

    localStorage.setItem(
      STORAGE_KEYS.resumeProfile,
      JSON.stringify(state.resumeProfile)
    );

  } catch (error) {

    console.warn(
      'Could not save Job Radar data:',
      error
    );

  }

}


/* =========================================================
   LOAD LOCAL STATE
   ========================================================= */

function loadLocalState() {

  try {

    const saved = JSON.parse(
      localStorage.getItem(
        STORAGE_KEYS.savedJobs
      ) || '[]'
    );

    if (Array.isArray(saved)) {
      state.savedJobs = new Set(saved);
    }

  } catch {

    state.savedJobs = new Set();

  }


  try {

    const statuses = JSON.parse(
      localStorage.getItem(
        STORAGE_KEYS.applicationStatus
      ) || '{}'
    );

    if (
      statuses &&
      typeof statuses === 'object' &&
      !Array.isArray(statuses)
    ) {

      state.applicationStatus = statuses;

    }

  } catch {

    state.applicationStatus = {};

  }


  try {

    const avoided = JSON.parse(
      localStorage.getItem(
        STORAGE_KEYS.avoidedJobs
      ) || '[]'
    );

    if (Array.isArray(avoided)) {
      state.avoidedJobs = new Set(avoided);
    }

  } catch {

    state.avoidedJobs = new Set();

  }


  try {

    const profile = JSON.parse(
      localStorage.getItem(
        STORAGE_KEYS.resumeProfile
      ) || '{}'
    );

    if (
      profile &&
      typeof profile === 'object'
    ) {

      state.resumeProfile = {
        ...state.resumeProfile,
        ...profile
      };

    }

  } catch {

    // Keep empty profile.

  }

}


/* =========================================================
   LOAD JOB DATA
   ========================================================= */

async function loadJobs() {

  state.isLoading = true;

  const liveStatus = $('liveStatus');

  if (liveStatus) {
    liveStatus.textContent =
      'Loading latest job opportunities...';
  }


  try {

    const response = await fetch(
      `${DATA_URL}?t=${Date.now()}`,
      {
        cache: 'no-store'
      }
    );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const data = await response.json();


    const jobs = Array.isArray(data)
      ? data
      : data.jobs;


    if (!Array.isArray(jobs)) {

      throw new Error(
        'Invalid processed_jobs.json format'
      );

    }


    state.jobs = jobs
      .filter(Boolean)
      .map(job => ({
        ...job,
        id: getId(job)
      }))
      .filter(
        job => !state.avoidedJobs.has(job.id)
      );


    state.filteredJobs = [...state.jobs];


    if (liveStatus) {

      liveStatus.textContent =
        `${state.jobs.length} jobs loaded`;

    }


    console.log(
      `Job Radar: ${state.jobs.length} jobs loaded.`
    );


  } catch (error) {

    console.error(
      'Job Radar data loading error:',
      error
    );


    state.jobs = [];

    state.filteredJobs = [];


    if (liveStatus) {

      liveStatus.textContent =
        'Unable to load job data';

    }

  } finally {

    state.isLoading = false;

  }

}/* =========================================================
   APP.JS — PART 2
   Search + Filters
   ========================================================= */


/* =========================================================
   SEARCH NORMALIZATION
   ========================================================= */

function normalizeSearchText(value) {

  return text(value)
    .toLowerCase()
    .replace(/[^\w\s+#.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

}


/* =========================================================
   SEARCH MATCH
   ========================================================= */

function matchesSearch(job, searchValue) {

  const query = normalizeSearchText(searchValue);

  if (!query) {
    return true;
  }

  const jobText = normalizeSearchText(
    getJobText(job)
  );

  const words = query
    .split(/\s+/)
    .filter(Boolean);

  return words.every(word =>
    jobText.includes(word)
  );

}


/* =========================================================
   LOCATION MATCH
   ========================================================= */

function matchesLocation(job, value) {

  if (!value) {
    return true;
  }

  const location = normalize(
    getLocation(job)
  );

  const query = normalize(value);

  return location.includes(query);

}


/* =========================================================
   JOB TYPE MATCH
   ========================================================= */

function matchesJobType(job, value) {

  if (!value) {
    return true;
  }

  const type = normalize(
    getJobType(job)
  );

  return type.includes(
    normalize(value)
  );

}


/* =========================================================
   WORK MODE MATCH
   ========================================================= */

function matchesWorkMode(job, value) {

  if (!value) {
    return true;
  }

  const mode = normalize(
    getWorkMode(job)
  );

  const query = normalize(value);

  if (query === 'remote') {
    return isRemote(job);
  }

  if (
    query === 'onsite' ||
    query === 'on-site'
  ) {

    return !isRemote(job);

  }

  if (query === 'hybrid') {
    return mode.includes('hybrid');
  }

  return mode.includes(query);

}


/* =========================================================
   SKILL MATCH
   ========================================================= */

function matchesSkill(job, value) {

  if (!value) {
    return true;
  }

  const jobText = normalize(
    getJobText(job)
  );

  return jobText.includes(
    normalize(value)
  );

}


/* =========================================================
   APPLICATION STATUS MATCH
   ========================================================= */

function matchesApplicationStatus(job, value) {

  if (!value) {
    return true;
  }

  const id = getId(job);

  const status =
    state.applicationStatus[id] || '';

  return normalize(status) === normalize(value);

}


/* =========================================================
   MINIMUM SCORE MATCH
   ========================================================= */

function matchesMinimumScore(job, value) {

  if (!value) {
    return true;
  }

  const minimum = Number(value);

  if (Number.isNaN(minimum)) {
    return true;
  }

  const score = Number(
    job.score || 0
  );

  return score >= minimum;

}


/* =========================================================
   POSTED DATE MATCH
   ========================================================= */

function matchesPostedDate(job, value) {

  if (!value) {
    return true;
  }

  const posted = text(
    job.date_posted ||
    job.posted_date ||
    job.datePosted ||
    ''
  );

  if (!posted) {
    return true;
  }

  const postedDate = new Date(posted);

  if (Number.isNaN(postedDate.getTime())) {
    return true;
  }

  const now = new Date();

  const difference =
    now.getTime() -
    postedDate.getTime();

  const days =
    difference /
    (1000 * 60 * 60 * 24);


  if (value === '1') {
    return days <= 1;
  }

  if (value === '3') {
    return days <= 3;
  }

  if (value === '7') {
    return days <= 7;
  }

  if (value === '14') {
    return days <= 14;
  }

  if (value === '30') {
    return days <= 30;
  }

  return true;

}


/* =========================================================
   FILTER JOBS
   ========================================================= */

function applyFilters() {

  const search =
    $('search')?.value || '';

  const location =
    $('location')?.value || '';

  const jobType =
    $('jobType')?.value || '';

  const workMode =
    $('workMode')?.value || '';

  const posted =
    $('posted')?.value || '';

  const skill =
    $('skill')?.value || '';

  const appStatus =
    $('appStatus')?.value || '';

  const minimum =
    $('minimum')?.value || '';

  const sort =
    $('sort')?.value || 'score';


  let jobs = state.jobs.filter(job => {

    if (
      !matchesSearch(job, search)
    ) {
      return false;
    }

    if (
      !matchesLocation(job, location)
    ) {
      return false;
    }

    if (
      !matchesJobType(job, jobType)
    ) {
      return false;
    }

    if (
      !matchesWorkMode(job, workMode)
    ) {
      return false;
    }

    if (
      !matchesPostedDate(job, posted)
    ) {
      return false;
    }

    if (
      !matchesSkill(job, skill)
    ) {
      return false;
    }

    if (
      !matchesApplicationStatus(
        job,
        appStatus
      )
    ) {
      return false;
    }

    if (
      !matchesMinimumScore(
        job,
        minimum
      )
    ) {
      return false;
    }

    if (
      state.showSavedOnly &&
      !state.savedJobs.has(getId(job))
    ) {
      return false;
    }

    return true;

  });


  /* =======================================================
     SORTING
     ======================================================= */

  if (sort === 'score') {

    jobs.sort(
      (a, b) =>
        Number(b.score || 0) -
        Number(a.score || 0)
    );

  }


  else if (sort === 'newest') {

    jobs.sort((a, b) => {

      const dateA =
        new Date(
          a.date_posted || 0
        ).getTime();

      const dateB =
        new Date(
          b.date_posted || 0
        ).getTime();

      return dateB - dateA;

    });

  }


  else if (sort === 'oldest') {

    jobs.sort((a, b) => {

      const dateA =
        new Date(
          a.date_posted || 0
        ).getTime();

      const dateB =
        new Date(
          b.date_posted || 0
        ).getTime();

      return dateA - dateB;

    });

  }


  else if (sort === 'company') {

    jobs.sort((a, b) =>
      getCompany(a).localeCompare(
        getCompany(b)
      )
    );

  }


  state.filteredJobs = jobs;


  updateResultCount();

  renderJobs();

}


/* =========================================================
   RESULT COUNT
   ========================================================= */

function updateResultCount() {

  const element =
    $('resultCount');

  if (!element) {
    return;
  }

  const count =
    state.filteredJobs.length;

  element.textContent =
    `${count} job${count === 1 ? '' : 's'} found`;

}


/* =========================================================
   CLEAR FILTERS
   ========================================================= */

function clearFilters() {

  const ids = [

    'search',
    'location',
    'jobType',
    'workMode',
    'posted',
    'skill',
    'appStatus',
    'minimum'

  ];


  ids.forEach(id => {

    const element = $(id);

    if (element) {
      element.value = '';
    }

  });


  const sort =
    $('sort');

  if (sort) {
    sort.value = 'score';
  }


  state.showSavedOnly = false;


  const savedButton =
    $('showSaved');

  if (savedButton) {
    savedButton.textContent =
      'Show Saved';
  }


  applyFilters();

}


/* =========================================================
   TOGGLE SAVED FILTER
   ========================================================= */

function toggleSavedFilter() {

  state.showSavedOnly =
    !state.showSavedOnly;


  const button =
    $('showSaved');

  if (button) {

    button.textContent =
      state.showSavedOnly
        ? 'Show All'
        : 'Show Saved';

  }


  applyFilters();

}/* =========================================================
   APP.JS — PART 3
   Job rendering
   ========================================================= */


/* =========================================================
   CHECK SAVED JOB
   ========================================================= */

function isSaved(job) {

  return state.savedJobs.has(
    getId(job)
  );

}


/* =========================================================
   GET APPLICATION STATUS
   ========================================================= */

function getStatus(job) {

  return (
    state.applicationStatus[getId(job)] ||
    ''
  );

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(value) {

  if (!value) {
    return 'Date not listed';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text(value);
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  );

}


/* =========================================================
   SCORE LABEL
   ========================================================= */

function getScoreLabel(score) {

  const value = Number(score || 0);

  if (value >= 80) {
    return 'Strong match';
  }

  if (value >= 60) {
    return 'Good match';
  }

  if (value >= 40) {
    return 'Possible match';
  }

  return 'Low match';

}


/* =========================================================
   SKILL BADGES
   ========================================================= */

function renderSkillBadges(job) {

  const skills =
    getJobSkills(job);

  if (!skills.length) {

    return `
      <span class="skill-badge">
        Skills not listed
      </span>
    `;

  }


  return skills
    .slice(0, 6)
    .map(skill => `
      <span class="skill-badge">
        ${escapeHTML(skill)}
      </span>
    `)
    .join('');

}


/* =========================================================
   JOB CARD
   ========================================================= */

function renderJobCard(job) {

  const id =
    getId(job);

  const score =
    Number(job.score || 0);

  const saved =
    isSaved(job);

  const status =
    getStatus(job);

  const remote =
    isRemote(job);


  return `

    <article
      class="job-card"
      data-job-id="${escapeHTML(id)}"
    >

      <div class="job-card-top">

        <div class="job-company">

          <span class="company-dot"></span>

          <span>
            ${escapeHTML(
              getCompany(job)
            )}
          </span>

        </div>


        <div class="job-score">

          <strong>
            ${score}
          </strong>

          <span>
            ${escapeHTML(
              getScoreLabel(score)
            )}
          </span>

        </div>

      </div>


      <div class="job-card-body">

        <h3 class="job-title">

          ${escapeHTML(
            getJobTitle(job)
          )}

        </h3>


        <div class="job-meta">

          <span>
            ${escapeHTML(
              getLocation(job)
            )}
          </span>

          <span>•</span>

          <span>
            ${escapeHTML(
              getJobType(job)
            )}
          </span>

          ${
            remote
              ? `
                <span>•</span>
                <span>Remote</span>
              `
              : ''
          }

        </div>


        <p class="job-description-preview">

          ${escapeHTML(
            getDescription(job)
              .replace(/\s+/g, ' ')
              .slice(0, 180)
          )}

          ${
            getDescription(job).length > 180
              ? '...'
              : ''
          }

        </p>


        <div class="job-skills">

          ${renderSkillBadges(job)}

        </div>

      </div>


      <div class="job-card-footer">


        <div class="job-source">

          <span>
            ${escapeHTML(
              getSource(job)
            )}
          </span>

          <span>•</span>

          <span>
            ${escapeHTML(
              formatDate(
                job.date_posted
              )
            )}
          </span>

        </div>


        <div class="job-actions">

          <button
            type="button"
            class="job-action secondary-btn"
            data-action="details"
            data-id="${escapeHTML(id)}"
          >
            View
          </button>


          <button
            type="button"
            class="job-action ${
              saved
                ? 'saved'
                : ''
            }"
            data-action="save"
            data-id="${escapeHTML(id)}"
          >

            ${
              saved
                ? 'Saved'
                : 'Save'
            }

          </button>


          <select
            class="job-status"
            data-action="status"
            data-id="${escapeHTML(id)}"
            aria-label="Application status"
          >

            <option value="">
              Status
            </option>

            <option
              value="saved"
              ${status === 'saved' ? 'selected' : ''}
            >
              Saved
            </option>

            <option
              value="applied"
              ${status === 'applied' ? 'selected' : ''}
            >
              Applied
            </option>

            <option
              value="interview"
              ${status === 'interview' ? 'selected' : ''}
            >
              Interview
            </option>

            <option
              value="closed"
              ${status === 'closed' ? 'selected' : ''}
            >
              Closed
            </option>

          </select>

        </div>

      </div>

    </article>

  `;

}


/* =========================================================
   RENDER JOBS
   ========================================================= */

function renderJobs() {

  const container =
    $('results');

  const emptyState =
    $('emptyState');


  if (!container) {
    return;
  }


  if (!state.filteredJobs.length) {

    container.innerHTML = '';

    if (emptyState) {
      emptyState.hidden = false;
    }

    return;

  }


  if (emptyState) {
    emptyState.hidden = true;
  }


  container.innerHTML =
    state.filteredJobs
      .map(renderJobCard)
      .join('');

}


/* =========================================================
   INITIAL FILTER RENDER
   ========================================================= */

function renderAll() {

  applyFilters();

}


/* =========================================================
   RESULT CONTAINER CLICK HANDLER
   ========================================================= */

function handleJobAction(event) {

  const button =
    event.target.closest(
      '[data-action]'
    );

  if (!button) {
    return;
  }


  const action =
    button.dataset.action;

  const id =
    button.dataset.id;


  const job =
    state.jobs.find(
      item => getId(item) === id
    );


  if (!job) {
    return;
  }


  if (action === 'details') {

    openJobModal(job);

    return;

  }


  if (action === 'save') {

    toggleSaved(job);

    return;

  }

}


/* =========================================================
   STATUS CHANGE HANDLER
   ========================================================= */

function handleJobStatusChange(event) {

  const select =
    event.target.closest(
      '[data-action="status"]'
    );

  if (!select) {
    return;
  }


  const id =
    select.dataset.id;

  const status =
    select.value;


  if (!id) {
    return;
  }


  if (status) {

    state.applicationStatus[id] =
      status;

  } else {

    delete state.applicationStatus[id];

  }


  saveLocalState();

  applyFilters();

  updateTracker();

  showToast(
    status
      ? `Application marked as ${status}.`
      : 'Application status cleared.'
  );

}/* =========================================================
   APP.JS — PART 4
   Job Details Modal
   ========================================================= */


/* =========================================================
   OPEN JOB MODAL
   ========================================================= */

function openJobModal(job) {

  state.currentJob = job;

  const modal =
    $('modal');

  if (!modal) {
    return;
  }


  /* -------------------------------------------------------
     BASIC JOB DETAILS
     ------------------------------------------------------- */

  const title =
    $('mTitle');

  const company =
    $('mCompany');

  const meta =
    $('mMeta');

  const score =
    $('mScore');

  const bar =
    $('mBar');

  const description =
    $('mDescription');

  const skills =
    $('mSkills');

  const reasons =
    $('mReasons');

  const status =
    $('mStatus');


  if (title) {

    title.textContent =
      getJobTitle(job);

  }


  if (company) {

    company.textContent =
      getCompany(job);

  }


  if (meta) {

    const location =
      getLocation(job);

    const type =
      getJobType(job);

    const mode =
      getWorkMode(job);

    meta.textContent =
      `${location} · ${type} · ${mode}`;

  }


  /* -------------------------------------------------------
     SCORE
     ------------------------------------------------------- */

  const scoreValue =
    Math.max(
      0,
      Math.min(
        100,
        Number(job.score || 0)
      )
    );


  if (score) {

    score.textContent =
      `${scoreValue}%`;

  }


  if (bar) {

    bar.style.width =
      `${scoreValue}%`;

  }


  /* -------------------------------------------------------
     DESCRIPTION
     ------------------------------------------------------- */

  if (description) {

    description.textContent =
      getDescription(job) ||
      'No description available.';

  }


  /* -------------------------------------------------------
     SKILLS
     ------------------------------------------------------- */

  if (skills) {

    const jobSkills =
      getJobSkills(job);


    if (!jobSkills.length) {

      skills.innerHTML =
        '<span class="muted">No skills listed.</span>';

    } else {

      skills.innerHTML =
        jobSkills
          .map(skill => `
            <span class="skill-badge">
              ${escapeHTML(skill)}
            </span>
          `)
          .join('');

    }

  }


  /* -------------------------------------------------------
     MATCH REASONS
     ------------------------------------------------------- */

  if (reasons) {

    const matched =
      asArray(job.matched_skills);


    if (matched.length) {

      reasons.innerHTML = `

        <ul class="reason-list">

          ${matched
            .slice(0, 8)
            .map(skill => `
              <li>
                Your profile matches
                <strong>
                  ${escapeHTML(skill)}
                </strong>
              </li>
            `)
            .join('')}

        </ul>

      `;

    } else if (scoreValue >= 70) {

      reasons.innerHTML = `

        <ul class="reason-list">

          <li>
            Strong relevance based on the job data.
          </li>

          <li>
            This opportunity matches your selected job criteria.
          </li>

        </ul>

      `;

    } else {

      reasons.innerHTML = `

        <p class="muted">
          No specific match reasons are available.
        </p>

      `;

    }

  }


  /* -------------------------------------------------------
     APPLICATION STATUS
     ------------------------------------------------------- */

  if (status) {

    status.value =
      getStatus(job);

  }


  /* -------------------------------------------------------
     MODAL STATE
     ------------------------------------------------------- */

  modal.setAttribute(
    'aria-hidden',
    'false'
  );

  modal.classList.add('open');

  document.body.classList.add(
    'modal-open'
  );

}


/* =========================================================
   CLOSE JOB MODAL
   ========================================================= */

function closeJobModal() {

  const modal =
    $('modal');

  if (!modal) {
    return;
  }


  modal.setAttribute(
    'aria-hidden',
    'true'
  );

  modal.classList.remove(
    'open'
  );

  document.body.classList.remove(
    'modal-open'
  );


  state.currentJob = null;

}


/* =========================================================
   SAVE / UPDATE MODAL STATUS
   ========================================================= */

function updateCurrentJobStatus() {

  const job =
    state.currentJob;

  if (!job) {
    return;
  }


  const statusElement =
    $('mStatus');

  if (!statusElement) {
    return;
  }


  const status =
    statusElement.value;


  if (status) {

    state.applicationStatus[
      getId(job)
    ] = status;

  } else {

    delete state.applicationStatus[
      getId(job)
    ];

  }


  saveLocalState();

  updateTracker();

  applyFilters();


  showToast(
    status
      ? `Application marked as ${status}.`
      : 'Application status cleared.'
  );

}


/* =========================================================
   SAVE BUTTON FROM MODAL
   ========================================================= */

function saveCurrentJob() {

  const job =
    state.currentJob;

  if (!job) {
    return;
  }


  toggleSaved(
    job,
    false
  );

}


/* =========================================================
   AVOID CURRENT JOB
   ========================================================= */

function avoidCurrentJob() {

  const job =
    state.currentJob;

  if (!job) {
    return;
  }


  const id =
    getId(job);


  state.avoidedJobs.add(id);

  state.savedJobs.delete(id);

  delete state.applicationStatus[id];


  saveLocalState();


  closeJobModal();

  applyFilters();

  updateDashboard();

  updateTracker();


  showToast(
    'Job removed from your radar.'
  );

}


/* =========================================================
   OPEN ORIGINAL JOB
   ========================================================= */

function openCurrentJob() {

  const job =
    state.currentJob;

  if (!job) {
    return;
  }


  const url =
    getJobURL(job);


  if (url === '#') {

    showToast(
      'Original job link is not available.'
    );

    return;

  }


  window.open(
    url,
    '_blank',
    'noopener,noreferrer'
  );

}


/* =========================================================
   MODAL EVENT BINDING
   ========================================================= */

function bindModalEvents() {

  const closeButton =
    $('closeModal');

  if (closeButton) {

    closeButton.addEventListener(
      'click',
      closeJobModal
    );

  }


  const modal =
    $('modal');

  if (modal) {

    modal.addEventListener(
      'click',
      event => {

        if (
          event.target === modal ||
          event.target.matches(
            '[data-close-modal]'
          )
        ) {

          closeJobModal();

        }

      }
    );

  }


  const saveButton =
    $('mSave');

  if (saveButton) {

    saveButton.addEventListener(
      'click',
      saveCurrentJob
    );

  }


  const avoidButton =
    $('mAvoid');

  if (avoidButton) {

    avoidButton.addEventListener(
      'click',
      avoidCurrentJob
    );

  }


  const openButton =
    $('mOpen');

  if (openButton) {

    openButton.addEventListener(
      'click',
      openCurrentJob
    );

  }


  const status =
    $('mStatus');

  if (status) {

    status.addEventListener(
      'change',
      updateCurrentJobStatus
    );

  }


  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Escape'
      ) {

        closeJobModal();

      }

    }
  );

}/* =========================================================
   APP.JS — PART 5
   Save / Avoid / Toast
   ========================================================= */


/* =========================================================
   TOGGLE SAVED JOB
   ========================================================= */

function toggleSaved(job, notify = true) {

  if (!job) {
    return;
  }

  const id =
    getId(job);

  if (!id) {
    return;
  }


  /* -------------------------------------------------------
     REMOVE FROM SAVED
     ------------------------------------------------------- */

  if (state.savedJobs.has(id)) {

    state.savedJobs.delete(id);

    if (notify) {

      showToast(
        'Job removed from saved jobs.'
      );

    }

  }

  /* -------------------------------------------------------
     ADD TO SAVED
     ------------------------------------------------------- */

  else {

    state.savedJobs.add(id);

    if (notify) {

      showToast(
        'Job saved.'
      );

    }

  }


  /* -------------------------------------------------------
     SAVE TO LOCAL STORAGE
     ------------------------------------------------------- */

  saveLocalState();


  /* -------------------------------------------------------
     REFRESH UI
     ------------------------------------------------------- */

  renderJobs();

  updateDashboard();

  updateTracker();


  /* -------------------------------------------------------
     UPDATE MODAL BUTTON
     ------------------------------------------------------- */

  if (
    state.currentJob &&
    getId(state.currentJob) === id
  ) {

    const button =
      $('mSave');

    if (button) {

      button.textContent =
        state.savedJobs.has(id)
          ? 'Saved'
          : 'Save Job';

      button.classList.toggle(
        'saved',
        state.savedJobs.has(id)
      );

    }

  }

}


/* =========================================================
   UPDATE SAVE BUTTON TEXT
   ========================================================= */

function updateSaveButton(job) {

  const button =
    $('mSave');

  if (!button || !job) {
    return;
  }


  const saved =
    isSaved(job);


  button.textContent =
    saved
      ? 'Saved'
      : 'Save Job';


  button.classList.toggle(
    'saved',
    saved
  );

}


/* =========================================================
   SHOW TOAST MESSAGE
   ========================================================= */

let toastTimer = null;


function showToast(message) {

  const toast =
    $('toast');

  if (!toast) {
    return;
  }


  toast.textContent =
    message;


  toast.classList.add(
    'show'
  );


  if (toastTimer) {

    clearTimeout(
      toastTimer
    );

  }


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          'show'
        );

      },
      2200
    );

}


/* =========================================================
   REMOVE JOB FROM SAVED
   ========================================================= */

function removeSavedJob(job) {

  if (!job) {
    return;
  }


  const id =
    getId(job);


  state.savedJobs.delete(id);

  saveLocalState();

  renderJobs();

  updateDashboard();

  updateTracker();


  showToast(
    'Removed from saved jobs.'
  );

}


/* =========================================================
   AVOID JOB
   ========================================================= */

function avoidJob(job) {

  if (!job) {
    return;
  }


  const id =
    getId(job);


  state.avoidedJobs.add(id);

  state.savedJobs.delete(id);

  delete state.applicationStatus[id];


  saveLocalState();


  applyFilters();

  updateDashboard();

  updateTracker();


  if (
    state.currentJob &&
    getId(state.currentJob) === id
  ) {

    closeJobModal();

  }


  showToast(
    'Job avoided.'
  );

}


/* =========================================================
   CHECK WHETHER JOB IS AVOIDED
   ========================================================= */

function isAvoided(job) {

  if (!job) {
    return false;
  }


  return state.avoidedJobs.has(
    getId(job)
  );

}


/* =========================================================
   CLEAR AVOIDED JOB
   ========================================================= */

function restoreAvoidedJob(job) {

  if (!job) {
    return;
  }


  const id =
    getId(job);


  state.avoidedJobs.delete(
    id
  );


  saveLocalState();

  applyFilters();

  updateDashboard();

  updateTracker();


  showToast(
    'Job added back to radar.'
  );

}


/* =========================================================
   UPDATE MODAL SAVE BUTTON
   ========================================================= */

function refreshModalState() {

  const job =
    state.currentJob;

  if (!job) {
    return;
  }


  updateSaveButton(job);


  const status =
    $('mStatus');


  if (status) {

    status.value =
      getStatus(job);

  }

}/* =========================================================
   APP.JS — PART 6
   Application Tracker
   ========================================================= */


/* =========================================================
   TRACKER STATUS LIST
   ========================================================= */

const TRACKER_STATUSES = [
  'Saved',
  'Applied',
  'Interview',
  'Closed'
];


/* =========================================================
   GET JOBS BY STATUS
   ========================================================= */

function getJobsByStatus(status) {

  return state.jobs.filter(job => {

    const jobStatus =
      getStatus(job);

    return jobStatus === status;

  });

}


/* =========================================================
   UPDATE TRACKER COUNTS + LISTS
   ========================================================= */

function updateTracker() {

  const savedJobs =
    getJobsByStatus('Saved');

  const appliedJobs =
    getJobsByStatus('Applied');

  const interviewJobs =
    getJobsByStatus('Interview');

  const closedJobs =
    getJobsByStatus('Closed');


  /* -------------------------------------------------------
     SUMMARY COUNTS
     ------------------------------------------------------- */

  setText(
    'cSaved',
    savedJobs.length
  );

  setText(
    'cApplied',
    appliedJobs.length
  );

  setText(
    'cInterview',
    interviewJobs.length
  );

  setText(
    'cClosed',
    closedJobs.length
  );


  /* -------------------------------------------------------
     BOARD COUNTS
     ------------------------------------------------------- */

  setText(
    'colSaved',
    savedJobs.length
  );

  setText(
    'colApplied',
    appliedJobs.length
  );

  setText(
    'colInterview',
    interviewJobs.length
  );

  setText(
    'colClosed',
    closedJobs.length
  );


  /* -------------------------------------------------------
     RENDER TRACKER COLUMNS
     ------------------------------------------------------- */

  renderTrackerColumn(
    'trackerSaved',
    savedJobs
  );

  renderTrackerColumn(
    'trackerApplied',
    appliedJobs
  );

  renderTrackerColumn(
    'trackerInterview',
    interviewJobs
  );

  renderTrackerColumn(
    'trackerClosed',
    closedJobs
  );

}


/* =========================================================
   SET TEXT HELPER
   ========================================================= */

function setText(id, value) {

  const element =
    $(id);

  if (!element) {
    return;
  }


  element.textContent =
    value;

}


/* =========================================================
   RENDER ONE TRACKER COLUMN
   ========================================================= */

function renderTrackerColumn(
  containerId,
  jobs
) {

  const container =
    $(containerId);

  if (!container) {
    return;
  }


  if (!jobs.length) {

    container.innerHTML = `

      <div class="tracker-empty">
        No jobs here yet.
      </div>

    `;

    return;

  }


  container.innerHTML =
    jobs
      .map(job => {

        const id =
          getId(job);

        const title =
          escapeHTML(
            getJobTitle(job)
          );

        const company =
          escapeHTML(
            getCompany(job)
          );

        const location =
          escapeHTML(
            getLocation(job)
          );

        const score =
          Number(job.score || 0);


        return `

          <article
            class="tracker-card"
            data-job-id="${escapeHTML(id)}"
          >

            <div class="tracker-card-top">

              <span class="tracker-score">
                ${score}%
              </span>

            </div>


            <h4>
              ${title}
            </h4>


            <p class="tracker-company">
              ${company}
            </p>


            <p class="tracker-location">
              ${location}
            </p>


            <div class="tracker-actions">

              <button
                type="button"
                class="small-btn"
                data-tracker-action="details"
                data-job-id="${escapeHTML(id)}"
              >
                View
              </button>

              <button
                type="button"
                class="small-btn danger"
                data-tracker-action="remove"
                data-job-id="${escapeHTML(id)}"
              >
                Remove
              </button>

            </div>

          </article>

        `;

      })
      .join('');

}


/* =========================================================
   CHANGE APPLICATION STATUS
   ========================================================= */

function setJobStatus(
  job,
  status
) {

  if (!job) {
    return;
  }


  const id =
    getId(job);


  if (!status) {

    delete state.applicationStatus[id];

  } else {

    state.applicationStatus[id] =
      status;

  }


  saveLocalState();


  /* -------------------------------------------------------
     REFRESH JOB DATA
     ------------------------------------------------------- */

  applyFilters();

  updateTracker();

  updateDashboard();


  /* -------------------------------------------------------
     REFRESH MODAL IF OPEN
     ------------------------------------------------------- */

  if (
    state.currentJob &&
    getId(state.currentJob) === id
  ) {

    const statusElement =
      $('mStatus');

    if (statusElement) {

      statusElement.value =
        status || '';

    }

  }


  showToast(
    status
      ? `Moved to ${status}.`
      : 'Application status cleared.'
  );

}


/* =========================================================
   HANDLE TRACKER ACTIONS
   ========================================================= */

function handleTrackerAction(event) {

  const button =
    event.target.closest(
      '[data-tracker-action]'
    );


  if (!button) {
    return;
  }


  const action =
    button.dataset.trackerAction;

  const id =
    button.dataset.jobId;


  const job =
    state.jobs.find(
      item =>
        getId(item) === id
    );


  if (!job) {
    return;
  }


  /* -------------------------------------------------------
     VIEW JOB
     ------------------------------------------------------- */

  if (action === 'details') {

    openJobModal(job);

    return;

  }


  /* -------------------------------------------------------
     REMOVE FROM TRACKER
     ------------------------------------------------------- */

  if (action === 'remove') {

    delete state.applicationStatus[id];

    state.savedJobs.delete(id);

    saveLocalState();

    updateTracker();

    renderJobs();

    updateDashboard();


    showToast(
      'Removed from tracker.'
    );

  }

}


/* =========================================================
   CLEAR ALL TRACKER DATA
   ========================================================= */

function clearTracker() {

  state.applicationStatus = {};

  saveLocalState();

  updateTracker();

  renderJobs();

  updateDashboard();


  showToast(
    'Application tracker cleared.'
  );

}/* =========================================================
   APP.JS — PART 7
   Resume Profile
   ========================================================= */


/* =========================================================
   LOAD RESUME PROFILE INTO FORM
   ========================================================= */

function loadResumeProfile() {

  const profile =
    state.resumeProfile;


  if (!profile) {
    return;
  }


  setInputValue(
    'resumeName',
    profile.name
  );

  setInputValue(
    'resumeEmail',
    profile.email
  );

  setInputValue(
    'resumeRole',
    profile.role
  );

  setInputValue(
    'resumeLocation',
    profile.location
  );

  setInputValue(
    'resumeSkills',
    profile.skills
  );

  setInputValue(
    'resumeProjects',
    profile.projects
  );


  updateResumeStatus();

}


/* =========================================================
   INPUT VALUE HELPER
   ========================================================= */

function setInputValue(
  id,
  value
) {

  const element =
    $(id);

  if (!element) {
    return;
  }


  element.value =
    value || '';

}


/* =========================================================
   GET RESUME FORM DATA
   ========================================================= */

function getResumeFormData() {

  return {

    name:
      text(
        $('resumeName')?.value
      ),

    email:
      text(
        $('resumeEmail')?.value
      ),

    role:
      text(
        $('resumeRole')?.value
      ),

    location:
      text(
        $('resumeLocation')?.value
      ),

    skills:
      text(
        $('resumeSkills')?.value
      ),

    projects:
      text(
        $('resumeProjects')?.value
      )

  };

}


/* =========================================================
   SAVE RESUME PROFILE
   ========================================================= */

function saveResumeProfile() {

  const profile =
    getResumeFormData();


  state.resumeProfile =
    profile;


  saveLocalState();


  updateResumeStatus();

  updateResumeMatch();

  updateCareerInsights();

  updateDashboard();


  showToast(
    'Resume profile saved.'
  );

}


/* =========================================================
   CLEAR RESUME PROFILE
   ========================================================= */

function clearResumeProfile() {

  state.resumeProfile = {

    name: '',
    email: '',
    role: '',
    location: '',
    skills: '',
    projects: ''

  };


  saveLocalState();


  loadResumeProfile();

  updateResumeMatch();

  updateCareerInsights();

  updateDashboard();


  showToast(
    'Resume profile cleared.'
  );

}


/* =========================================================
   RESUME STATUS MESSAGE
   ========================================================= */

function updateResumeStatus() {

  const status =
    $('resumeStatus');

  if (!status) {
    return;
  }


  const profile =
    state.resumeProfile;


  const completed = [

    profile.name,
    profile.email,
    profile.role,
    profile.location,
    profile.skills,
    profile.projects

  ].filter(
    value =>
      text(value).length > 0
  ).length;


  if (completed === 0) {

    status.textContent =
      'Resume profile is empty.';

    return;

  }


  if (completed < 4) {

    status.textContent =
      'Resume profile is partially completed.';

    return;

  }


  status.textContent =
    'Resume profile is ready.';

}


/* =========================================================
   GET RESUME SKILLS
   ========================================================= */

function getResumeSkills() {

  const skills =
    text(
      state.resumeProfile.skills
    );


  if (!skills) {
    return [];
  }


  return unique(

    skills
      .split(/[,;\n|]+/)
      .map(skill =>
        skill.trim()
      )
      .filter(Boolean)

  );

}


/* =========================================================
   GET RESUME PROJECTS
   ========================================================= */

function getResumeProjects() {

  const projects =
    text(
      state.resumeProfile.projects
    );


  if (!projects) {
    return [];
  }


  return projects
    .split(/\n+/)
    .map(project =>
      project.trim()
    )
    .filter(Boolean);

}


/* =========================================================
   CALCULATE PROFILE STRENGTH
   ========================================================= */

function calculateProfileStrength() {

  const profile =
    state.resumeProfile;


  let points = 0;


  if (text(profile.name)) {
    points += 15;
  }

  if (text(profile.email)) {
    points += 10;
  }

  if (text(profile.role)) {
    points += 15;
  }

  if (text(profile.location)) {
    points += 10;
  }

  if (
    getResumeSkills().length >= 3
  ) {
    points += 25;

  } else if (
    getResumeSkills().length > 0
  ) {

    points += 15;

  }

  if (
    getResumeProjects().length >= 1
  ) {

    points += 15;

  }


  return Math.min(
    100,
    points
  );

}


/* =========================================================
   UPDATE PROFILE STRENGTH
   ========================================================= */

function updateProfileStrength() {

  const element =
    $('profileStrength');

  if (!element) {
    return;
  }


  const strength =
    calculateProfileStrength();


  element.textContent =
    `${strength}%`;

}


/* =========================================================
   UPDATE RESUME MATCH
   ========================================================= */

function updateResumeMatch() {

  const element =
    $('resumeMatch');

  if (!element) {
    return;
  }


  const resumeSkills =
    getResumeSkills()
      .map(normalize);


  if (!resumeSkills.length) {

    element.textContent =
      'Add your skills to see job matches.';

    updateProfileStrength();

    return;

  }


  let matchedJobs = 0;


  state.jobs.forEach(job => {

    const jobSkills =
      getJobSkills(job)
        .map(normalize);


    const hasMatch =
      resumeSkills.some(
        skill =>
          jobSkills.some(
            jobSkill =>
              jobSkill.includes(skill) ||
              skill.includes(jobSkill)
          )
      );


    if (hasMatch) {
      matchedJobs++;
    }

  });


  element.textContent =
    `${matchedJobs} jobs match your current skills.`;


  updateProfileStrength();

}


/* =========================================================
   UPDATE SUGGESTED SKILL
   ========================================================= */

function updateSuggestedSkill() {

  const element =
    $('suggestedSkill');

  if (!element) {
    return;
  }


  const resumeSkills =
    getResumeSkills()
      .map(normalize);


  const skillFrequency = {};


  state.jobs.forEach(job => {

    getJobSkills(job).forEach(skill => {

      const cleanSkill =
        text(skill);


      const key =
        normalize(cleanSkill);


      if (!key) {
        return;
      }


      if (
        resumeSkills.includes(key)
      ) {
        return;
      }


      skillFrequency[key] =
        (skillFrequency[key] || 0) + 1;

  });

  });


  const suggestions =
    Object.entries(
      skillFrequency
    )
      .sort(
        (a, b) =>
          b[1] - a[1]
      );


  if (!suggestions.length) {

    element.textContent =
      'Add more skills to discover suggestions.';

    return;

  }


  const suggested =
    suggestions[0][0];


  element.textContent =
    `Consider learning: ${suggested}`;

}


/* =========================================================
   UPDATE RESUME PAGE
   ========================================================= */

function updateResumePage() {

  loadResumeProfile();

  updateProfileStrength();

  updateResumeMatch();

  updateSuggestedSkill();

}/* =========================================================
   APP.JS — PART 8
   Skill Gap + Career Insights + AI Career Agent
   ========================================================= */


/* =========================================================
   GET SKILL GAP
   ========================================================= */

function getSkillGap() {

  const resumeSkills =
    getResumeSkills()
      .map(normalize);


  const frequency = {};


  state.jobs.forEach(job => {

    getJobSkills(job).forEach(skill => {

      const cleanSkill =
        text(skill);

      const key =
        normalize(cleanSkill);

      if (!key) {
        return;
      }

      if (
        resumeSkills.includes(key)
      ) {
        return;
      }

      frequency[key] =
        (frequency[key] || 0) + 1;

    });

  });


  return Object.entries(frequency)
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .slice(0, 8)
    .map(item => ({
      skill: item[0],
      count: item[1]
    }));

}


/* =========================================================
   UPDATE SKILL GAP
   ========================================================= */

function updateSkillGap() {

  const element =
    $('skillGap');

  if (!element) {
    return;
  }


  const gaps =
    getSkillGap();


  if (!gaps.length) {

    element.innerHTML = `

      <div class="empty-card">
        Add your skills to generate a skill gap.
      </div>

    `;

    return;

  }


  element.innerHTML =
    gaps
      .map(item => `

        <div class="skill-gap-item">

          <div>
            <strong>
              ${escapeHTML(item.skill)}
            </strong>

            <span>
              Seen in ${item.count} jobs
            </span>
          </div>

          <span class="skill-gap-tag">
            Learn
          </span>

        </div>

      `)
      .join('');

}


/* =========================================================
   CAREER INSIGHTS
   ========================================================= */

function updateCareerInsights() {

  const element =
    $('careerInsights');

  if (!element) {
    return;
  }


  const profile =
    state.resumeProfile;


  const skills =
    getResumeSkills();


  const projects =
    getResumeProjects();


  const insights = [];


  /* -------------------------------------------------------
     PROFILE
     ------------------------------------------------------- */

  if (!text(profile.role)) {

    insights.push(
      'Add a target role to make your job matching more focused.'
    );

  }


  if (skills.length < 3) {

    insights.push(
      'Add more technical skills to improve job matching.'
    );

  }


  if (!projects.length) {

    insights.push(
      'Add at least one project to strengthen your profile.'
    );

  }


  /* -------------------------------------------------------
     JOB DATA INSIGHTS
     ------------------------------------------------------- */

  const remoteJobs =
    state.jobs.filter(
      job => isRemote(job)
    ).length;


  if (remoteJobs > 0) {

    insights.push(
      `${remoteJobs} remote opportunities are currently in the dataset.`
    );

  }


  const strongMatches =
    state.jobs.filter(
      job =>
        Number(job.score || 0) >= 70
    ).length;


  if (strongMatches > 0) {

    insights.push(
      `${strongMatches} jobs currently have a score of 70 or above.`
    );

  }


  if (!insights.length) {

    insights.push(
      'Your profile has enough information for basic career insights.'
    );

  }


  element.innerHTML =
    insights
      .slice(0, 5)
      .map(item => `

        <div class="insight-item">

          <span class="insight-dot"></span>

          <p>
            ${escapeHTML(item)}
          </p>

        </div>

      `)
      .join('');

}


/* =========================================================
   MATCHING JOBS FOR RESUME
   ========================================================= */

function getResumeMatchingJobs() {

  const resumeSkills =
    getResumeSkills()
      .map(normalize);


  if (!resumeSkills.length) {
    return [];
  }


  return state.jobs
    .map(job => {

      const jobSkills =
        getJobSkills(job)
          .map(normalize);


      let matches = 0;


      resumeSkills.forEach(
        skill => {

          if (
            jobSkills.some(
              jobSkill =>
                jobSkill.includes(skill) ||
                skill.includes(jobSkill)
            )
          ) {

            matches++;

          }

        }
      );


      return {
        job,
        matches
      };

    })
    .filter(
      item =>
        item.matches > 0
    )
    .sort(
      (a, b) =>
        b.matches - a.matches
    )
    .slice(0, 5);

}


/* =========================================================
   UPDATE MATCHING JOBS
   ========================================================= */

function updateMatchingJobs() {

  const element =
    $('matchingJobs');

  if (!element) {
    return;
  }


  const matches =
    getResumeMatchingJobs();


  if (!matches.length) {

    element.innerHTML = `

      <div class="empty-card">
        No matching jobs yet.
      </div>

    `;

    return;

  }


  element.innerHTML =
    matches
      .map(item => {

        const job =
          item.job;


        return `

          <button
            type="button"
            class="matching-job"
            data-job-id="${escapeHTML(getId(job))}"
          >

            <div>

              <strong>
                ${escapeHTML(getJobTitle(job))}
              </strong>

              <span>
                ${escapeHTML(getCompany(job))}
              </span>

            </div>

            <b>
              ${item.matches} match
              ${item.matches === 1 ? '' : 'es'}
            </b>

          </button>

        `;

      })
      .join('');

}


/* =========================================================
   AI CAREER AGENT — GREETING
   ========================================================= */

function updateAgentGreeting() {

  const element =
    $('agentGreeting');

  if (!element) {
    return;
  }


  const name =
    text(
      state.resumeProfile.name
    );


  if (name) {

    element.textContent =
      `Hi ${name}. Here's your current career snapshot.`;

  } else {

    element.textContent =
      'Build your profile to get personalized career guidance.';

  }

}


/* =========================================================
   AI CAREER AGENT — SKILL GAP
   ========================================================= */

function updateAgentSkillGap() {

  const element =
    $('agentSkillGap');

  if (!element) {
    return;
  }


  const gaps =
    getSkillGap();


  if (!gaps.length) {

    element.textContent =
      'No major skill gap detected yet.';

    return;

  }


  const topSkills =
    gaps
      .slice(0, 3)
      .map(item => item.skill);


  element.textContent =
    `Skills to explore: ${topSkills.join(', ')}`;

}


/* =========================================================
   AI CAREER AGENT — INTERVIEW
   ========================================================= */

function updateAgentInterview() {

  const element =
    $('agentInterview');

  if (!element) {
    return;
  }


  const strongMatches =
    state.jobs.filter(
      job =>
        Number(job.score || 0) >= 70
    ).length;


  if (strongMatches > 0) {

    element.textContent =
      'Prepare a short introduction, project explanation, and technical fundamentals.';

  } else {

    element.textContent =
      'Start with your core technical concepts and project explanation.';

  }

}


/* =========================================================
   AI CAREER AGENT — CAREER DIRECTION
   ========================================================= */

function updateAgentCareer() {

  const element =
    $('agentCareer');

  if (!element) {
    return;
  }


  const role =
    text(
      state.resumeProfile.role
    );


  if (role) {

    element.textContent =
      `Your current target role is ${role}. Focus your projects and skills around it.`;

    return;

  }


  element.textContent =
    'Add a target role to receive more focused career guidance.';

}


/* =========================================================
   GENERATE CAREER AGENT OUTPUT
   ========================================================= */

function generateCareerAgentOutput() {

  const element =
    $('agentOutput');

  if (!element) {
    return;
  }


  const profile =
    state.resumeProfile;


  const skills =
    getResumeSkills();


  const gaps =
    getSkillGap();


  const matches =
    getResumeMatchingJobs();


  const role =
    text(profile.role);


  const topGap =
    gaps.length
      ? gaps[0].skill
      : 'a relevant technical skill';


  const matchCount =
    matches.length;


  let message = '';


  if (role) {

    message +=
      `Target role: ${role}. `;

  } else {

    message +=
      'Set a target role first. ';

  }


  message +=
    `You currently have ${skills.length} listed skill${skills.length === 1 ? '' : 's'}. `;


  if (matchCount) {

    message +=
      `${matchCount} jobs show a skill match with your profile. `;

  } else {

    message +=
      'There are no direct skill matches yet. ';

  }


  if (gaps.length) {

    message +=
      `A useful skill to explore next is ${topGap}.`;

  } else {

    message +=
      'Keep strengthening your existing technical skills and projects.';

  }


  element.textContent =
    message;

}


/* =========================================================
   UPDATE COMPLETE CAREER AGENT
   ========================================================= */

function updateCareerAgent() {

  updateAgentGreeting();

  updateAgentSkillGap();

  updateAgentInterview();

  updateAgentCareer();

  generateCareerAgentOutput();

}


/* =========================================================
   UPDATE ALL RESUME / CAREER SECTIONS
   ========================================================= */

function updateCareerSections() {

  updateResumeMatch();

  updateProfileStrength();

  updateSuggestedSkill();

  updateSkillGap();

  updateCareerInsights();

  updateMatchingJobs();

  updateCareerAgent();

}/* =========================================================
   APP.JS — PART 9
   Resume Upload
   ========================================================= */


/* =========================================================
   OPEN RESUME UPLOAD MODAL
   ========================================================= */

function openResumeModal() {

  const modal =
    $('resumeModal');

  if (!modal) {
    return;
  }


  modal.setAttribute(
    'aria-hidden',
    'false'
  );

  modal.classList.add(
    'open'
  );

  document.body.classList.add(
    'modal-open'
  );

}


/* =========================================================
   CLOSE RESUME UPLOAD MODAL
   ========================================================= */

function closeResumeModal() {

  const modal =
    $('resumeModal');

  if (!modal) {
    return;
  }


  modal.setAttribute(
    'aria-hidden',
    'true'
  );

  modal.classList.remove(
    'open'
  );

  document.body.classList.remove(
    'modal-open'
  );

}


/* =========================================================
   SHOW SELECTED RESUME FILE NAME
   ========================================================= */

function updateResumeFileName() {

  const input =
    $('resumeFile');

  const fileName =
    $('resumeFileName');


  if (!input || !fileName) {
    return;
  }


  if (!input.files || !input.files.length) {

    fileName.textContent =
      'No file selected.';

    return;

  }


  const file =
    input.files[0];


  fileName.textContent =
    file.name;

}


/* =========================================================
   VALIDATE RESUME FILE
   ========================================================= */

function validateResumeFile(file) {

  if (!file) {

    showToast(
      'Please choose a resume file.'
    );

    return false;

  }


  const allowedTypes = [

    'application/pdf',

    'application/msword',

    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  ];


  const allowedExtensions = [

    '.pdf',
    '.doc',
    '.docx'

  ];


  const fileName =
    file.name.toLowerCase();


  const validType =
    allowedTypes.includes(
      file.type
    );


  const validExtension =
    allowedExtensions.some(
      extension =>
        fileName.endsWith(
          extension
        )
    );


  if (
    !validType &&
    !validExtension
  ) {

    showToast(
      'Please select a PDF, DOC, or DOCX file.'
    );

    return false;

  }


  /* -------------------------------------------------------
     MAX FILE SIZE: 5 MB
     ------------------------------------------------------- */

  const maxSize =
    5 * 1024 * 1024;


  if (file.size > maxSize) {

    showToast(
      'Resume file must be smaller than 5 MB.'
    );

    return false;

  }


  return true;

}


/* =========================================================
   HANDLE RESUME FILE SELECTION
   ========================================================= */

function handleResumeFileSelection() {

  const input =
    $('resumeFile');

  if (!input) {
    return;
  }


  const file =
    input.files &&
    input.files[0];


  if (!file) {

    updateResumeFileName();

    return;

  }


  if (
    !validateResumeFile(file)
  ) {

    input.value = '';

    updateResumeFileName();

    return;

  }


  updateResumeFileName();


  showToast(
    'Resume selected.'
  );

}


/* =========================================================
   UPLOAD / SAVE RESUME FILE
   ========================================================= */

function uploadResumeFile() {

  const input =
    $('resumeFile');


  if (!input) {
    return;
  }


  const file =
    input.files &&
    input.files[0];


  if (
    !validateResumeFile(file)
  ) {

    return;

  }


  /*
   * This version keeps the selected file
   * inside the browser session only.
   *
   * No file is sent to an external server.
   */

  try {

    sessionStorage.setItem(
      'jobRadarResumeFileName',
      file.name
    );

  } catch (error) {

    console.warn(
      'Could not save resume file name.',
      error
    );

  }


  updateResumeFileName();


  closeResumeModal();


  showToast(
    'Resume uploaded for this session.'
  );

}


/* =========================================================
   RESTORE PREVIOUS FILE NAME
   ========================================================= */

function restoreResumeFileName() {

  const fileName =
    $('resumeFileName');

  if (!fileName) {
    return;
  }


  try {

    const savedName =
      sessionStorage.getItem(
        'jobRadarResumeFileName'
      );


    if (savedName) {

      fileName.textContent =
        savedName;

    }

  } catch (error) {

    console.warn(
      'Could not restore resume file name.',
      error
    );

  }

}


/* =========================================================
   CLEAR SELECTED RESUME FILE
   ========================================================= */

function clearResumeFile() {

  const input =
    $('resumeFile');

  const fileName =
    $('resumeFileName');


  if (input) {

    input.value =
      '';

  }


  if (fileName) {

    fileName.textContent =
      'No file selected.';

  }


  try {

    sessionStorage.removeItem(
      'jobRadarResumeFileName'
    );

  } catch (error) {

    console.warn(
      'Could not clear resume file.',
      error
    );

  }


  showToast(
    'Resume file cleared.'
  );

}


/* =========================================================
   BIND RESUME UPLOAD EVENTS
   ========================================================= */

function bindResumeUploadEvents() {

  const uploadButton =
    $('uploadResume');

  if (uploadButton) {

    uploadButton.addEventListener(
      'click',
      openResumeModal
    );

  }


  const fileInput =
    $('resumeFile');

  if (fileInput) {

    fileInput.addEventListener(
      'change',
      handleResumeFileSelection
    );

  }


  const closeButton =
    $('closeResumeModal');

  if (closeButton) {

    closeButton.addEventListener(
      'click',
      closeResumeModal
    );

  }


  const modal =
    $('resumeModal');

  if (modal) {

    modal.addEventListener(
      'click',
      event => {

        if (
          event.target === modal ||
          event.target.matches(
            '[data-close-resume-modal]'
          )
        ) {

          closeResumeModal();

        }

      }
    );

  }

}


/* =========================================================
   RESTORE UPLOAD STATE
   ========================================================= */

function initializeResumeUpload() {

  restoreResumeFileName();

}/* =========================================================
   APP.JS — PART 10
   Home Dashboard
   ========================================================= */


/* =========================================================
   UPDATE HOME DASHBOARD
   ========================================================= */

function updateDashboard() {

  const jobs =
    state.jobs;


  /* -------------------------------------------------------
     TOTAL JOBS
     ------------------------------------------------------- */

  setText(
    'totalJobs',
    jobs.length
  );


  /* -------------------------------------------------------
     RECENT JOBS
     ------------------------------------------------------- */

  const recentJobs =
    jobs.filter(
      job =>
        isRecentJob(job)
    ).length;


  setText(
    'recentJobs',
    recentJobs
  );


  /* -------------------------------------------------------
     SAVED JOBS
     ------------------------------------------------------- */

  setText(
    'savedJobs',
    state.savedJobs.size
  );


  /* -------------------------------------------------------
     STRONG MATCHES
     ------------------------------------------------------- */

  const strongMatches =
    jobs.filter(
      job =>
        Number(job.score || 0) >= 70
    ).length;


  setText(
    'strongMatches',
    strongMatches
  );


  /* -------------------------------------------------------
     NEXT JOB
     ------------------------------------------------------- */

  updateNextJob();


  /* -------------------------------------------------------
     TOP SKILLS
     ------------------------------------------------------- */

  updateTopSkills();


  /* -------------------------------------------------------
     AVOIDED JOBS
     ------------------------------------------------------- */

  updateAvoidList();


  /* -------------------------------------------------------
     LIVE STATUS
     ------------------------------------------------------- */

  updateLiveStatus();

}


/* =========================================================
   CHECK RECENT JOB
   ========================================================= */

function isRecentJob(job) {

  const dateValue =
    job.date_posted ||
    job.datePosted ||
    job.posted_at ||
    job.postedAt;


  if (!dateValue) {
    return false;
  }


  const date =
    new Date(dateValue);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return false;

  }


  const now =
    new Date();


  const difference =
    now.getTime() -
    date.getTime();


  const days =
    difference /
    (1000 * 60 * 60 * 24);


  return (
    days >= 0 &&
    days <= 7
  );

}


/* =========================================================
   NEXT JOB RECOMMENDATION
   ========================================================= */

function updateNextJob() {

  const element =
    $('nextJob');

  if (!element) {
    return;
  }


  const candidates =
    state.jobs
      .filter(
        job =>
          !isAvoided(job)
      )
      .sort(
        (a, b) =>
          Number(b.score || 0) -
          Number(a.score || 0)
      );


  if (!candidates.length) {

    element.innerHTML = `

      <div class="empty-card">
        No job recommendation available yet.
      </div>

    `;

    return;

  }


  const job =
    candidates[0];


  element.innerHTML = `

    <div class="next-job-card">

      <div>

        <span class="eyebrow">
          Suggested opportunity
        </span>

        <h3>
          ${escapeHTML(
            getJobTitle(job)
          )}
        </h3>

        <p>
          ${escapeHTML(
            getCompany(job)
          )}
        </p>

        <span>
          ${escapeHTML(
            getLocation(job)
          )}
        </span>

      </div>

      <div class="next-job-score">

        ${Number(job.score || 0)}%

      </div>

    </div>

  `;


  element
    .querySelector(
      '.next-job-card'
    )
    ?.addEventListener(
      'click',
      () => openJobModal(job)
    );

}


/* =========================================================
   TOP SKILLS FROM JOB DATA
   ========================================================= */

function updateTopSkills() {

  const element =
    $('topSkills');

  if (!element) {
    return;
  }


  const frequency = {};


  state.jobs.forEach(job => {

    getJobSkills(job).forEach(skill => {

      const clean =
        text(skill);

      const key =
        normalize(clean);


      if (!key) {
        return;
      }


      if (!frequency[key]) {

        frequency[key] = {
          name: clean,
          count: 0
        };

      }


      frequency[key].count++;

    });

  });


  const skills =
    Object.values(frequency)
      .sort(
        (a, b) =>
          b.count - a.count
      )
      .slice(0, 8);


  if (!skills.length) {

    element.innerHTML = `

      <span class="muted">
        No skill data available.
      </span>

    `;

    return;

  }


  element.innerHTML =
    skills
      .map(skill => `

        <span class="skill-badge">

          ${escapeHTML(
            skill.name
          )}

          <small>
            ${skill.count}
          </small>

        </span>

      `)
      .join('');

}


/* =========================================================
   AVOIDED JOB SUMMARY
   ========================================================= */

function updateAvoidList() {

  const element =
    $('avoidList');

  if (!element) {
    return;
  }


  const avoidedCount =
    state.avoidedJobs.size;


  if (!avoidedCount) {

    element.innerHTML = `

      <div class="empty-card">
        No jobs marked as avoided.
      </div>

    `;

    return;

  }


  const avoidedJobs =
    state.jobs
      .filter(
        job =>
          isAvoided(job)
      )
      .slice(0, 5);


  element.innerHTML = `

    <div class="avoid-summary">

      <strong>
        ${avoidedCount}
      </strong>

      <span>
        job${avoidedCount === 1 ? '' : 's'} avoided
      </span>

    </div>

    ${
      avoidedJobs.length
        ? `
          <div class="avoid-items">

            ${avoidedJobs
              .map(job => `

                <div class="avoid-item">

                  <span>
                    ${escapeHTML(
                      getJobTitle(job)
                    )}
                  </span>

                  <button
                    type="button"
                    data-restore-job="${escapeHTML(
                      getId(job)
                    )}"
                  >
                    Restore
                  </button>

                </div>

              `)
              .join('')}

          </div>
        `
        : ''
    }

  `;

}


/* =========================================================
   RESTORE AVOIDED JOB FROM HOME
   ========================================================= */

function handleAvoidListAction(event) {

  const button =
    event.target.closest(
      '[data-restore-job]'
    );


  if (!button) {
    return;
  }


  const id =
    button.dataset.restoreJob;


  const job =
    state.jobs.find(
      item =>
        getId(item) === id
    );


  if (!job) {
    return;
  }


  restoreAvoidedJob(job);

}


/* =========================================================
   LIVE STATUS
   ========================================================= */

function updateLiveStatus() {

  const element =
    $('liveStatus');

  if (!element) {
    return;
  }


  if (state.isLoading) {

    element.textContent =
      'Updating job radar...';

    return;

  }


  if (!state.jobs.length) {

    element.textContent =
      'No jobs loaded yet.';

    return;

  }


  const strongMatches =
    state.jobs.filter(
      job =>
        Number(job.score || 0) >= 70
    ).length;


  element.textContent =
    `Live radar: ${state.jobs.length} jobs loaded · ${strongMatches} strong matches`;

}


/* =========================================================
   DASHBOARD REFRESH
   ========================================================= */

function refreshDashboard() {

  updateDashboard();

  updateResumePage();

  updateCareerSections();

  updateTracker();

}/* =========================================================
   APP.JS — PART 11
   Navigation + Export + Job Controls
   ========================================================= */


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(pageName) {

  const pages =
    document.querySelectorAll(
      '.page'
    );

  const buttons =
    document.querySelectorAll(
      '.nav-btn'
    );


  pages.forEach(page => {

    page.classList.toggle(
      'active',
      page.id === `page-${pageName}`
    );

  });


  buttons.forEach(button => {

    button.classList.toggle(
      'active',
      button.dataset.page === pageName
    );

  });


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });


  if (pageName === 'home') {

    updateDashboard();

  }


  if (pageName === 'jobs') {

    renderJobs();

  }


  if (pageName === 'resume') {

    updateResumePage();

    updateCareerSections();

  }


  if (pageName === 'tracker') {

    updateTracker();

  }

}


/* =========================================================
   NAVIGATION EVENT
   ========================================================= */

function handleNavigation(event) {

  const button =
    event.target.closest(
      '.nav-btn'
    );


  if (!button) {
    return;
  }


  const page =
    button.dataset.page;


  if (!page) {
    return;
  }


  showPage(page);

}


/* =========================================================
   EXPORT JOBS TO CSV
   ========================================================= */

function exportJobsCSV() {

  const jobs =
    state.filteredJobs;


  if (!jobs.length) {

    showToast(
      'There are no jobs to export.'
    );

    return;

  }


  const headers = [

    'Title',
    'Company',
    'Location',
    'Job Type',
    'Work Mode',
    'Score',
    'Source',
    'Status',
    'Job URL'

  ];


  const rows =
    jobs.map(job => [

      getJobTitle(job),

      getCompany(job),

      getLocation(job),

      getJobType(job),

      getWorkMode(job),

      Number(job.score || 0),

      getSource(job),

      getStatus(job),

      getJobURL(job)

    ]);


  const csvRows = [

    headers,

    ...rows

  ];


  const csv =
    csvRows
      .map(row =>
        row
          .map(value =>
            csvEscape(value)
          )
          .join(',')
      )
      .join('\n');


  const blob =
    new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      'a'
    );


  link.href =
    url;

  link.download =
    'job-radar-jobs.csv';


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();


  URL.revokeObjectURL(
    url
  );


  showToast(
    `${jobs.length} jobs exported.`
  );

}


/* =========================================================
   CSV ESCAPE
   ========================================================= */

function csvEscape(value) {

  const clean =
    text(value);


  return `"${clean
    .replace(/"/g, '""')
    .replace(/\r?\n/g, ' ')}"`;

}


/* =========================================================
   SHOW SAVED JOBS
   ========================================================= */

function showSavedJobs() {

  const button =
    $('showSaved');


  state.showSavedOnly =
    !state.showSavedOnly;


  if (button) {

    button.textContent =
      state.showSavedOnly
        ? 'Show All'
        : 'Show Saved';

    button.classList.toggle(
      'active',
      state.showSavedOnly
    );

  }


  applyFilters();

}


/* =========================================================
   HANDLE SEARCH / FILTER CHANGES
   ========================================================= */

function handleFilterChange() {

  applyFilters();

}


/* =========================================================
   CLEAR ALL FILTERS
   ========================================================= */

function handleClearFilters() {

  clearFilters();

  showToast(
    'Filters cleared.'
  );

}


/* =========================================================
   SORT JOBS
   ========================================================= */

function sortJobs(jobs) {

  const sort =
    $('sort')?.value ||
    'score';


  const sorted =
    [...jobs];


  if (sort === 'score') {

    sorted.sort(
      (a, b) =>
        Number(b.score || 0) -
        Number(a.score || 0)
    );

  }


  else if (sort === 'recent') {

    sorted.sort(
      (a, b) =>
        getDateValue(b) -
        getDateValue(a)
    );

  }


  else if (sort === 'company') {

    sorted.sort(
      (a, b) =>
        getCompany(a)
          .localeCompare(
            getCompany(b)
          )
    );

  }


  else if (sort === 'title') {

    sorted.sort(
      (a, b) =>
        getJobTitle(a)
          .localeCompare(
            getJobTitle(b)
          )
    );

  }


  return sorted;

}


/* =========================================================
   DATE VALUE FOR SORTING
   ========================================================= */

function getDateValue(job) {

  const value =
    job.date_posted ||
    job.datePosted ||
    job.posted_at ||
    job.postedAt;


  if (!value) {
    return 0;
  }


  const time =
    new Date(value)
      .getTime();


  return Number.isNaN(time)
    ? 0
    : time;

}


/* =========================================================
   UPDATE FILTERED JOB ORDER
   ========================================================= */

function applySorting() {

  state.filteredJobs =
    sortJobs(
      state.filteredJobs
    );


  renderJobs();

  updateResultCount();

}


/* =========================================================
   OPEN MATCHING JOB FROM RESUME PAGE
   ========================================================= */

function handleMatchingJobClick(event) {

  const button =
    event.target.closest(
      '[data-job-id]'
    );


  if (!button) {
    return;
  }


  const id =
    button.dataset.jobId;


  const job =
    state.jobs.find(
      item =>
        getId(item) === id
    );


  if (!job) {
    return;
  }


  openJobModal(job);

}


/* =========================================================
   SEARCH BUTTON SUPPORT
   ========================================================= */

function focusSearch() {

  const search =
    $('search');


  if (!search) {
    return;
  }


  showPage('jobs');

  search.focus();

}


/* =========================================================
   KEYBOARD SHORTCUT
   ========================================================= */

function handleKeyboardShortcuts(event) {

  if (
    event.ctrlKey &&
    event.key.toLowerCase() === 'k'
  ) {

    event.preventDefault();

    focusSearch();

  }


  if (
    event.key === '/' &&
    document.activeElement?.tagName !== 'INPUT' &&
    document.activeElement?.tagName !== 'TEXTAREA'
  ) {

    event.preventDefault();

    focusSearch();

  }

}


/* =========================================================
   UPDATE SAVE FILTER BUTTON
   ========================================================= */

function updateSavedButton() {

  const button =
    $('showSaved');

  if (!button) {
    return;
  }


  button.textContent =
    state.showSavedOnly
      ? 'Show All'
      : 'Show Saved';


  button.classList.toggle(
    'active',
    state.showSavedOnly
  );

}


/* =========================================================
   FINAL FILTER + SORT REFRESH
   ========================================================= */

function refreshJobResults() {

  applyFilters();

  applySorting();

  updateSavedButton();

}/* =========================================================
   APP.JS — PART 12
   Event Listeners
   ========================================================= */


/* =========================================================
   NAVIGATION
   ========================================================= */

function bindNavigationEvents() {

  const nav =
    document.querySelector('.nav');

  if (nav) {

    nav.addEventListener(
      'click',
      handleNavigation
    );

  }

}


/* =========================================================
   JOB FILTER EVENTS
   ========================================================= */

function bindFilterEvents() {

  const filterIds = [

    'search',
    'location',
    'jobType',
    'workMode',
    'posted',
    'skill',
    'appStatus',
    'minimum',
    'sort'

  ];


  filterIds.forEach(id => {

    const element =
      $(id);

    if (!element) {
      return;
    }


    element.addEventListener(
      'input',
      handleFilterChange
    );


    element.addEventListener(
      'change',
      handleFilterChange
    );

  });


  const clearButton =
    $('clearFilters');

  if (clearButton) {

    clearButton.addEventListener(
      'click',
      handleClearFilters
    );

  }


  const savedButton =
    $('showSaved');

  if (savedButton) {

    savedButton.addEventListener(
      'click',
      showSavedJobs
    );

  }


  const exportButton =
    $('exportCSV');

  if (exportButton) {

    exportButton.addEventListener(
      'click',
      exportJobsCSV
    );

  }

}


/* =========================================================
   JOB RESULTS
   ========================================================= */

function bindJobResultEvents() {

  const results =
    $('results');

  if (results) {

    results.addEventListener(
      'click',
      handleJobAction
    );


    results.addEventListener(
      'change',
      handleJobStatusChange
    );

  }

}


/* =========================================================
   TRACKER EVENTS
   ========================================================= */

function bindTrackerEvents() {

  const tracker =
    document.querySelector(
      '#page-tracker'
    );

  if (tracker) {

    tracker.addEventListener(
      'click',
      handleTrackerAction
    );

  }

}


/* =========================================================
   RESUME EVENTS
   ========================================================= */

function bindResumeEvents() {

  const saveButton =
    $('saveResume');

  if (saveButton) {

    saveButton.addEventListener(
      'click',
      saveResumeProfile
    );

  }


  const clearButton =
    $('clearResume');

  if (clearButton) {

    clearButton.addEventListener(
      'click',
      clearResumeProfile
    );

  }


  const matchingJobs =
    $('matchingJobs');

  if (matchingJobs) {

    matchingJobs.addEventListener(
      'click',
      handleMatchingJobClick
    );

  }

}


/* =========================================================
   HOME EVENTS
   ========================================================= */

function bindHomeEvents() {

  const avoidList =
    $('avoidList');

  if (avoidList) {

    avoidList.addEventListener(
      'click',
      handleAvoidListAction
    );

  }

}


/* =========================================================
   MODAL EVENTS
   ========================================================= */

function bindAllModalEvents() {

  bindModalEvents();

  bindResumeUploadEvents();

}


/* =========================================================
   AI AGENT BUTTONS
   ========================================================= */

function bindAgentEvents() {

  const greeting =
    $('agentGreeting');

  const skillGap =
    $('agentSkillGap');

  const interview =
    $('agentInterview');

  const career =
    $('agentCareer');


  if (greeting) {

    greeting.addEventListener(
      'click',
      generateCareerAgentOutput
    );

  }


  if (skillGap) {

    skillGap.addEventListener(
      'click',
      updateSkillGap
    );

  }


  if (interview) {

    interview.addEventListener(
      'click',
      updateAgentInterview
    );

  }


  if (career) {

    career.addEventListener(
      'click',
      updateAgentCareer
    );

  }

}


/* =========================================================
   RESUME FILE MODAL
   ========================================================= */

function bindResumeFileEvents() {

  const uploadButton =
    $('uploadResume');

  if (uploadButton) {

    uploadButton.addEventListener(
      'click',
      openResumeModal
    );

  }


  const uploadConfirm =
    document.querySelector(
      '#resumeModal [data-upload-resume]'
    );

  if (uploadConfirm) {

    uploadConfirm.addEventListener(
      'click',
      uploadResumeFile
    );

  }


  const clearButton =
    document.querySelector(
      '#resumeModal [data-clear-resume]'
    );

  if (clearButton) {

    clearButton.addEventListener(
      'click',
      clearResumeFile
    );

  }

}


/* =========================================================
   GLOBAL KEYBOARD EVENTS
   ========================================================= */

function bindKeyboardEvents() {

  document.addEventListener(
    'keydown',
    handleKeyboardShortcuts
  );

}


/* =========================================================
   WINDOW EVENTS
   ========================================================= */

function bindWindowEvents() {

  window.addEventListener(
    'storage',
    () => {

      loadLocalState();

      refreshDashboard();

    }
  );

}


/* =========================================================
   ALL EVENT LISTENERS
   ========================================================= */

function bindAllEvents() {

  bindNavigationEvents();

  bindFilterEvents();

  bindJobResultEvents();

  bindTrackerEvents();

  bindResumeEvents();

  bindHomeEvents();

  bindAllModalEvents();

  bindAgentEvents();

  bindResumeFileEvents();

  bindKeyboardEvents();

  bindWindowEvents();

}/* =========================================================
   APP.JS — PART 13
   Final Initialization
   ========================================================= */


/* =========================================================
   INITIALIZE APPLICATION
   ========================================================= */

async function initializeApp() {

  console.log(
    'Job Radar starting...'
  );


  /* -------------------------------------------------------
     LOAD SAVED LOCAL DATA
     ------------------------------------------------------- */

  loadLocalState();


  /* -------------------------------------------------------
     INITIAL BASIC UI
     ------------------------------------------------------- */

  loadResumeProfile();

  initializeResumeUpload();


  /* -------------------------------------------------------
     BIND ALL EVENTS
     ------------------------------------------------------- */

  bindAllEvents();


  /* -------------------------------------------------------
     SHOW LOADING STATE
     ------------------------------------------------------- */

  state.isLoading =
    true;

  updateLiveStatus();


  /* -------------------------------------------------------
     LOAD JOB DATA
     ------------------------------------------------------- */

  await loadJobs();


  /* -------------------------------------------------------
     APPLY FILTERS
     ------------------------------------------------------- */

  applyFilters();


  /* -------------------------------------------------------
     UPDATE DASHBOARD
     ------------------------------------------------------- */

  updateDashboard();


  /* -------------------------------------------------------
     UPDATE RESUME / CAREER SECTIONS
     ------------------------------------------------------- */

  updateResumePage();

  updateCareerSections();


  /* -------------------------------------------------------
     UPDATE TRACKER
     ------------------------------------------------------- */

  updateTracker();


  /* -------------------------------------------------------
     REFRESH MODAL STATE
     ------------------------------------------------------- */

  refreshModalState();


  /* -------------------------------------------------------
     FINAL LOADING STATE
     ------------------------------------------------------- */

  state.isLoading =
    false;

  updateLiveStatus();


  console.log(
    `Job Radar ready — ${state.jobs.length} jobs loaded.`
  );

}


/* =========================================================
   GLOBAL ERROR HANDLER
   ========================================================= */

window.addEventListener(
  'error',
  event => {

    console.error(
      'Job Radar error:',
      event.error || event.message
    );

  }
);


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    initializeApp()
      .catch(error => {

        console.error(
          'Job Radar initialization failed:',
          error
        );


        state.isLoading =
          false;


        const status =
          $('liveStatus');


        if (status) {

          status.textContent =
            'Unable to load job data. Check the data file.';

        }


        showToast(
          'Job Radar could not finish loading.'
        );

      });

  }
);