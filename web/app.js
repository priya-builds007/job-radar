/* =========================================================
   JOB RADAR — MAIN APP
   PART 1 / 5
   SEARCH + FILTER + DATA FOUNDATION
   ========================================================= */

'use strict';

const DATA_URL = '/data/processed_jobs.json';

const STORAGE_KEYS = {
  savedJobs: 'jobRadarSavedJobs',
  applicationStatus: 'jobRadarApplicationStatus'
};


/* =========================================================
   PROFILE
   ========================================================= */

const PROFILE_SKILLS = [
  'python',
  'java',
  'javascript',
  'html',
  'css',
  'sql',
  'c++',
  'c',
  'firebase',
  'iot',
  'embedded systems',
  'real-time database',
  'git'
];


/* =========================================================
   STATE
   ========================================================= */

let allJobs = [];
let savedJobs = new Set();
let applicationStatus = {};
let showSavedOnly = false;
let lastAnalyzedJobId = null;


/* =========================================================
   DOM HELPER
   ========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function text(value) {
  return value == null ? '' : String(value);
}

function normalize(value) {
  return text(value)
    .toLowerCase()
    .trim();
}

function escapeHTML(value) {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function unique(values) {
  return [...new Set(
    values.filter(value => value !== null && value !== undefined && value !== '')
  )];
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null || value === '') {
    return [];
  }

  return [value];
}


/* =========================================================
   JOB ID
   ========================================================= */

function jobId(job) {
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
   SAFE LINK
   ========================================================= */

function safeLink(url) {
  const value = text(url).trim();

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return '#';
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function loadLocalState() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.savedJobs) || '[]'
    );

    savedJobs = new Set(
      Array.isArray(saved) ? saved : []
    );
  } catch {
    savedJobs = new Set();
  }

  try {
    applicationStatus = JSON.parse(
      localStorage.getItem(
        STORAGE_KEYS.applicationStatus
      ) || '{}'
    );

    if (
      !applicationStatus ||
      typeof applicationStatus !== 'object'
    ) {
      applicationStatus = {};
    }
  } catch {
    applicationStatus = {};
  }
}


function saveLocalState() {
  localStorage.setItem(
    STORAGE_KEYS.savedJobs,
    JSON.stringify([...savedJobs])
  );

  localStorage.setItem(
    STORAGE_KEYS.applicationStatus,
    JSON.stringify(applicationStatus)
  );
}


/* =========================================================
   JOB FIELD HELPERS
   ========================================================= */

function getJobTitle(job) {
  return text(
    job.title ||
    job.job_title ||
    'Untitled opportunity'
  );
}


function getCompany(job) {
  return text(
    job.company ||
    job.company_name ||
    'Company not listed'
  );
}


function getLocation(job) {
  return text(
    job.location ||
    job.city ||
    'Location not listed'
  );
}


function getSource(job) {
  return text(
    job.source ||
    job.site ||
    'Job board'
  );
}


function getDescription(job) {
  return text(
    job.description ||
    ''
  );
}


function getJobType(job) {
  return text(
    job.job_type ||
    job.type ||
    job.job_type_raw ||
    'Not specified'
  );
}


function getDate(job) {
  return text(
    job.date_posted ||
    job.posted_date ||
    job.date ||
    ''
  );
}


/* =========================================================
   LOCATION NORMALIZATION
   ========================================================= */

function normalizeLocation(value) {
  let location = normalize(value);

  location = location
    .replace(/\btn\b/g, 'tamil nadu')
    .replace(/\bin\b/g, 'india')
    .replace(/\bbengaluru\b/g, 'bangalore');

  return location;
}


function locationMatches(jobLocation, selectedLocation) {
  if (!selectedLocation) {
    return true;
  }

  const jobValue = normalizeLocation(jobLocation);
  const selectedValue = normalizeLocation(selectedLocation);

  if (jobValue === selectedValue) {
    return true;
  }

  const jobParts = jobValue
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  const selectedParts = selectedValue
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  if (
    jobParts.some(part =>
      selectedParts.includes(part)
    )
  ) {
    return true;
  }

  return (
    jobValue.includes(selectedValue) ||
    selectedValue.includes(jobValue)
  );
}


/* =========================================================
   JOB TYPE NORMALIZATION
   ========================================================= */

function normalizeJobType(value) {
  const type = normalize(value);

  if (
    type.includes('fulltime') ||
    type.includes('full-time') ||
    type === 'full time'
  ) {
    return 'fulltime';
  }

  if (
    type.includes('parttime') ||
    type.includes('part-time') ||
    type === 'part time'
  ) {
    return 'parttime';
  }

  if (
    type.includes('intern')
  ) {
    return 'internship';
  }

  if (
    type.includes('contract')
  ) {
    return 'contract';
  }

  return type;
}


function jobTypeMatches(jobType, selectedType) {
  if (!selectedType) {
    return true;
  }

  const a = normalizeJobType(jobType);
  const b = normalizeJobType(selectedType);

  return a === b;
}


/* =========================================================
   REMOTE DETECTION
   ========================================================= */

function isRemote(job) {
  if (job.is_remote === true) {
    return true;
  }

  const value = normalize([
    job.work_mode,
    job.workplace_type,
    job.location,
    job.description
  ].join(' '));

  return (
    value.includes('remote') ||
    value.includes('work from home') ||
    value.includes('wfh')
  );
}


/* =========================================================
   SKILL DETECTION
   ========================================================= */

function getJobSkills(job) {
  const haystack = normalize([
    job.title,
    job.description,
    job.skills,
    job.matched_skills,
    job.required_skills,
    job.skill
  ].join(' '));

  const skillNames = [
    'python',
    'java',
    'javascript',
    'html',
    'css',
    'sql',
    'c++',
    'c',
    'firebase',
    'iot',
    'embedded systems',
    'real-time database',
    'git',
    'machine learning',
    'numpy',
    'pandas',
    'scikit-learn',
    'react',
    'node.js',
    'flutter',
    'mongodb',
    'aws',
    'docker'
  ];

  return skillNames.filter(skill => {

    if (skill === 'c') {
      return /\bc\b/.test(haystack);
    }

    if (skill === 'c++') {
      return haystack.includes('c++');
    }

    if (skill === 'iot') {
      return (
        haystack.includes('iot') ||
        haystack.includes('internet of things')
      );
    }

    return haystack.includes(skill);
  });
}


/* =========================================================
   SCORE
   ========================================================= */

function calculateScore(job) {
  const value = Number(job.score);

  if (Number.isFinite(value)) {
    return value;
  }

  return calculatePersonalMatch(job).score;
}


/* =========================================================
   PERSONAL MATCH
   ========================================================= */

function calculatePersonalMatch(job) {
  const skills = getJobSkills(job);

  const title = normalize(
    getJobTitle(job)
  );

  const description = normalize(
    getDescription(job)
  );

  const location = normalizeLocation(
    getLocation(job)
  );

  let score = 0;

  const matchedSkills = [];
  const reasons = [];

  const earlyLevel =
    /intern|internship|trainee|fresher|entry[\s-]?level|graduate/
      .test(`${title} ${description}`);

  const technicalRole =
    /developer|software|engineer|programmer|python|java|frontend|backend|full[\s-]?stack|iot|embedded|tester|testing|data|ai|ml/
      .test(title);

  if (earlyLevel) {
    score += 20;

    reasons.push(
      'Suitable for an early-career/student profile'
    );
  }

  if (technicalRole) {
    score += 25;

    reasons.push(
      'Technical role matches a CSE profile'
    );
  }

  PROFILE_SKILLS.forEach(skill => {
    if (skills.includes(skill)) {
      matchedSkills.push(skill);
    }
  });

  const skillPoints = Math.min(
    30,
    matchedSkills.length * 6
  );

  score += skillPoints;

  if (matchedSkills.length) {
    reasons.push(
      `${matchedSkills.length} relevant skill${matchedSkills.length > 1 ? 's' : ''} matched`
    );
  }

  const local =
    /coimbatore|tamil nadu|chennai|bengaluru|bangalore|india/
      .test(location);

  if (local) {
    score += 15;

    reasons.push(
      'Location is relevant to the target region'
    );
  }

  if (isRemote(job)) {
    score += 10;

    reasons.push(
      'Remote work is available'
    );
  }

  if (
    /student|intern|fresher|graduate/
      .test(description)
  ) {
    score += 5;
  }

  const fullText = normalize(
    `${getJobTitle(job)} ${getDescription(job)}`
  );

  const missingSkills = [
    'python',
    'java',
    'javascript',
    'sql',
    'git',
    'machine learning',
    'numpy',
    'pandas',
    'scikit-learn',
    'react',
    'node.js',
    'flutter'
  ].filter(skill => {
    return (
      fullText.includes(skill) &&
      !matchedSkills.includes(skill)
    );
  });

  return {
    score: Math.min(100, score),
    matchedSkills: unique(matchedSkills),
    missingSkills: unique(missingSkills),
    reasons
  };
}


/* =========================================================
   END OF PART 1
   ========================================================= *//* =========================================================
   JOB RADAR — PART 2 / 5
   SEARCH + FILTERS + DATE
   ========================================================= */


/* =========================================================
   SEARCH STOP WORDS
   ========================================================= */

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'to',
  'in',
  'on',
  'with',
  'related',
  'job',
  'jobs',
  'role',
  'roles',
  'opportunity',
  'opportunities',
  'show',
  'find',
  'me',
  'current',
  'now',
  'please'
]);


/* =========================================================
   FILTER VALUE
   ========================================================= */

function selectedFilter(id) {
  const value = normalize(
    $(id)?.value || ''
  );

  if (
    !value ||
    value === 'all' ||
    value === 'all locations' ||
    value === 'all job types' ||
    value === 'all modes' ||
    value === 'all skills' ||
    value === 'all statuses' ||
    value === 'any score'
  ) {
    return '';
  }

  return value;
}


/* =========================================================
   SEARCH TOKENS
   ========================================================= */

function searchTokens(value) {
  return normalize(value)
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter(
      token =>
        token &&
        !SEARCH_STOP_WORDS.has(token)
    );
}


/* =========================================================
   SEARCH EXPANSION
   ========================================================= */

function searchMatchesToken(
  haystack,
  token
) {

  if (token === 'iot') {
    return (
      haystack.includes('iot') ||
      haystack.includes('internet of things')
    );
  }

  if (token === 'js') {
    return haystack.includes('javascript');
  }

  if (token === 'ai') {
    return (
      haystack.includes('ai') ||
      haystack.includes('artificial intelligence')
    );
  }

  if (token === 'ml') {
    return (
      haystack.includes('ml') ||
      haystack.includes('machine learning')
    );
  }

  if (token === 'software') {
    return (
      haystack.includes('software') ||
      haystack.includes('developer') ||
      haystack.includes('engineering')
    );
  }

  if (token === 'developer') {
    return (
      haystack.includes('developer') ||
      haystack.includes('development')
    );
  }

  if (token === 'embedded') {
    return (
      haystack.includes('embedded') ||
      haystack.includes('firmware')
    );
  }

  return haystack.includes(token);
}


/* =========================================================
   SEARCH
   ========================================================= */

function matchesSearch(
  job,
  value
) {

  const query = normalize(value);

  if (!query) {
    return true;
  }

  const haystack = normalize([
    job.title,
    job.job_title,
    job.company,
    job.company_name,
    job.location,
    job.description,
    job.source,
    job.skills,
    job.matched_skills,
    job.required_skills,
    job.job_type
  ].join(' '));

  const tokens = searchTokens(query);

  if (!tokens.length) {
    return true;
  }

  /*
   * ALL search words must be found,
   * but each word can match related terms.
   *
   * Example:
   * "IoT related jobs"
   *
   * becomes:
   * IoT
   *
   * and finds:
   * Internet of Things
   * IoT Developer
   * IoT Intern
   */

  return tokens.every(
    token =>
      searchMatchesToken(
        haystack,
        token
      )
  );
}


/* =========================================================
   DATE BUCKET
   ========================================================= */

function dateBucket(job) {

  const raw = getDate(job);

  if (!raw) {
    return 'unknown';
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const posted = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffDays = Math.floor(
    (today - posted) / 86400000
  );

  if (diffDays < 0) {
    return 'unknown';
  }

  if (diffDays === 0) {
    return 'today';
  }

  if (diffDays <= 7) {
    return 'week';
  }

  if (diffDays <= 30) {
    return 'month';
  }

  return 'older';
}


/* =========================================================
   POSTED FILTER
   ========================================================= */

function postedMatches(
  job,
  selected
) {

  if (!selected) {
    return true;
  }

  const bucket = dateBucket(job);

  if (
    selected === 'today' ||
    selected === 'today only'
  ) {
    return bucket === 'today';
  }

  if (
    selected === 'this week' ||
    selected === 'week'
  ) {
    return (
      bucket === 'today' ||
      bucket === 'week'
    );
  }

  if (
    selected === 'this month' ||
    selected === 'month'
  ) {
    return (
      bucket === 'today' ||
      bucket === 'week' ||
      bucket === 'month'
    );
  }

  if (
    selected === 'older'
  ) {
    return bucket === 'older';
  }

  return true;
}


/* =========================================================
   SCORE FILTER
   ========================================================= */

function minimumScoreMatches(
  job,
  selected
) {

  if (!selected) {
    return true;
  }

  const score = calculateScore(job);

  const match = selected.match(
    /(\d+)/
  );

  if (!match) {
    return true;
  }

  const minimum = Number(
    match[1]
  );

  return score >= minimum;
}


/* =========================================================
   STATUS FILTER
   ========================================================= */

function statusMatches(
  job,
  selected
) {

  if (!selected) {
    return true;
  }

  const id = jobId(job);

  const current =
    applicationStatus[id] ||
    'Not Applied';

  if (
    selected === 'saved'
  ) {
    return savedJobs.has(id);
  }

  if (
    selected === 'not applied' ||
    selected === 'not-applied'
  ) {
    return current === 'Not Applied';
  }

  return normalize(current) === selected;
}


/* =========================================================
   MAIN FILTER
   ========================================================= */

function getFilteredJobs() {

  const search =
    $('search')?.value || '';

  const location =
    selectedFilter('location');

  const jobType =
    selectedFilter('jobType');

  const remote =
    selectedFilter('remote');

  const period =
    selectedFilter('period');

  const skill =
    selectedFilter('skill');

  const status =
    selectedFilter('status');

  const minimum =
    $('minimum')?.value || '';

  return allJobs.filter(
    job => {

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
        location &&
        !locationMatches(
          getLocation(job),
          location
        )
      ) {
        return false;
      }


      /* Job type */

      if (
        jobType &&
        !jobTypeMatches(
          getJobType(job),
          jobType
        )
      ) {
        return false;
      }


      /* Work mode */

      if (
        remote === 'remote' &&
        !isRemote(job)
      ) {
        return false;
      }

      if (
        (
          remote === 'onsite' ||
          remote === 'on-site' ||
          remote === 'not remote'
        ) &&
        isRemote(job)
      ) {
        return false;
      }


      /* Posted date */

      if (
        !postedMatches(
          job,
          period
        )
      ) {
        return false;
      }


      /* Skill */

      if (skill) {

        const skills =
          getJobSkills(job);

        if (
          !skills.some(
            item =>
              normalize(item) ===
              normalize(skill)
          )
        ) {
          return false;
        }
      }


      /* Application status */

      if (
        !statusMatches(
          job,
          status
        )
      ) {
        return false;
      }


      /* Minimum score */

      if (
        !minimumScoreMatches(
          job,
          minimum
        )
      ) {
        return false;
      }


      /* Saved only */

      if (
        showSavedOnly &&
        !savedJobs.has(
          jobId(job)
        )
      ) {
        return false;
      }


      return true;
    }
  );
}


/* =========================================================
   END PART 2
   ========================================================= *//* =========================================================
   JOB RADAR — PART 3 / 5
   SORT + SAVED + INSIGHTS
   ========================================================= */


/* =========================================================
   SORT JOBS
   ========================================================= */

function sortJobs(jobs) {

  const value =
    normalize(
      $('sort')?.value ||
      'newest'
    );

  const copy = [
    ...jobs
  ];


  /* Highest score */

  if (
    value === 'score' ||
    value === 'highest score' ||
    value === 'score-desc'
  ) {

    return copy.sort(
      (a, b) =>
        calculateScore(b) -
        calculateScore(a)
    );
  }


  /* Lowest score */

  if (
    value === 'score-asc' ||
    value === 'lowest score'
  ) {

    return copy.sort(
      (a, b) =>
        calculateScore(a) -
        calculateScore(b)
    );
  }


  /* Oldest */

  if (
    value === 'oldest'
  ) {

    return copy.sort(
      (a, b) =>
        new Date(
          getDate(a)
        ) -
        new Date(
          getDate(b)
        )
    );
  }


  /* Default = newest */

  return copy.sort(
    (a, b) =>
      new Date(
        getDate(b)
      ) -
      new Date(
        getDate(a)
      )
  );
}


/* =========================================================
   BEST OPPORTUNITY
   ========================================================= */

function getBestOpportunity() {

  const filtered =
    getFilteredJobs();

  if (!filtered.length) {
    return null;
  }

  return [
    ...filtered
  ].sort(
    (a, b) => {

      const matchA =
        calculatePersonalMatch(a)
          .score;

      const matchB =
        calculatePersonalMatch(b)
          .score;

      if (
        matchB !== matchA
      ) {
        return matchB - matchA;
      }

      return (
        calculateScore(b) -
        calculateScore(a)
      );
    }
  )[0];
}


/* =========================================================
   POPULATE SELECT
   ========================================================= */

function populateSelect(
  id,
  values,
  placeholder
) {

  const select =
    $(id);

  if (!select) {
    return;
  }

  const current =
    select.value;

  const cleanValues =
    unique(
      values
        .map(value => text(value).trim())
        .filter(Boolean)
    ).sort(
      (a, b) =>
        a.localeCompare(
          b
        )
    );

  select.innerHTML =
    `<option value="">${escapeHTML(
      placeholder
    )}</option>` +

    cleanValues
      .map(
        value =>
          `<option value="${escapeHTML(
            value
          )}">${escapeHTML(
            value
          )}</option>`
      )
      .join('');


  if (
    cleanValues.includes(
      current
    )
  ) {
    select.value =
      current;
  }
}


/* =========================================================
   POPULATE FILTERS
   ========================================================= */

function populateFilters() {

  populateSelect(
    'location',

    allJobs.map(
      getLocation
    ),

    'All locations'
  );


  populateSelect(
    'jobType',

    allJobs.map(
      getJobType
    ),

    'All job types'
  );


  populateSelect(
    'skill',

    allJobs.flatMap(
      getJobSkills
    ),

    'All skills'
  );
}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary(
  jobs
) {

  if ($('total')) {
    $('total').textContent =
      allJobs.length;
  }


  if ($('recent')) {
    $('recent').textContent =
      allJobs.filter(
        job =>
          dateBucket(job) ===
          'week' ||
          dateBucket(job) ===
          'today'
      ).length;
  }


  if ($('sources')) {
    $('sources').textContent =
      unique(
        allJobs.map(
          getSource
        )
      ).length;
  }


  if ($('resultCount')) {
    $('resultCount').textContent =
      jobs.length;
  }
}


/* =========================================================
   TOP SKILLS
   ========================================================= */

function updateTopSkills() {

  const counts = {};

  allJobs.forEach(
    job => {

      getJobSkills(job)
        .forEach(
          skill => {

            counts[skill] =
              (
                counts[skill] ||
                0
              ) + 1;
          }
        );
    }
  );


  const top =
    Object.entries(
      counts
    )
      .sort(
        (a, b) =>
          b[1] -
          a[1]
      )
      .slice(
        0,
        8
      );


  const target =
    $('topSkills');

  if (!target) {
    return;
  }


  if (!top.length) {

    target.innerHTML =
      `<span class="insight-muted">
        No skill data
      </span>`;

    return;
  }


  target.innerHTML =
    top
      .map(
        ([skill, count]) =>
          `<span>
            ${escapeHTML(skill)}
            <small>${count}</small>
          </span>`
      )
      .join('');
}


/* =========================================================
   INSIGHTS
   ========================================================= */

function updateInsights() {

  const saved =
    allJobs.filter(
      job =>
        savedJobs.has(
          jobId(job)
        )
    );


  const remote =
    allJobs.filter(
      isRemote
    );


  const high =
    allJobs.filter(
      job =>
        calculateScore(job) >=
        70
    );


  if (
    $('insightSaved')
  ) {
    $('insightSaved').textContent =
      saved.length;
  }


  if (
    $('insightRemote')
  ) {
    $('insightRemote').textContent =
      remote.length;
  }


  if (
    $('insightHighScore')
  ) {
    $('insightHighScore').textContent =
      high.length;
  }


  const applications =
    Object.values(
      applicationStatus
    ).filter(
      status =>
        status &&
        status !==
        'Not Applied'
    );


  if (
    $('insightApplications')
  ) {
    $('insightApplications')
      .textContent =
      applications.length;
  }


  updateTopSkills();
}


/* =========================================================
   FRESHNESS
   ========================================================= */

function getFreshness(job) {

  const bucket =
    dateBucket(job);

  if (
    bucket === 'today'
  ) {
    return 'Posted today';
  }

  if (
    bucket === 'week'
  ) {
    return 'Fresh';
  }

  if (
    bucket === 'month'
  ) {
    return 'Recent';
  }

  if (
    bucket === 'older'
  ) {
    return 'Older';
  }

  return 'Date unknown';
}


/* =========================================================
   SAVED JOBS
   ========================================================= */

function toggleSaved(id) {

  if (
    savedJobs.has(id)
  ) {
    savedJobs.delete(id);
  } else {
    savedJobs.add(id);
  }

  saveLocalState();

  updateSavedUI();

  updateInsights();

  render();
}


/* =========================================================
   SAVED UI
   ========================================================= */

function updateSavedUI() {

  const count =
    $('savedCount');

  if (count) {
    count.textContent =
      savedJobs.size;
  }


  const button =
    $('savedToggle');

  if (button) {

    button.textContent =
      showSavedOnly
        ? 'Showing Saved'
        : `Saved (${savedJobs.size})`;
  }
}


/* =========================================================
   APPLICATION STATUS
   ========================================================= */

function setJobStatus(
  id,
  status
) {

  applicationStatus[id] =
    status;

  saveLocalState();

  updateInsights();

  render();
}


/* =========================================================
   END PART 3
   ========================================================= *//* =========================================================
   JOB RADAR — PART 4 / 5
   JOB CARDS + AGENT + MODAL
   ========================================================= */


/* =========================================================
   JOB CARD
   ========================================================= */

function jobCard(job) {

  const id =
    jobId(job);

  const personal =
    calculatePersonalMatch(job);

  const saved =
    savedJobs.has(id);

  const status =
    applicationStatus[id] ||
    'Not Applied';


  const matched =
    personal.matchedSkills
      .slice(0, 6);


  const missing =
    personal.missingSkills
      .slice(0, 6);


  return `
    <article
      class="job-card"
      data-job-id="${escapeHTML(id)}"
    >

      <div class="job-card-top">

        <div>

          <span class="job-source">
            ${escapeHTML(
              getSource(job)
            )}
          </span>

          <h3 class="job-title">
            ${escapeHTML(
              getJobTitle(job)
            )}
          </h3>

          <p class="job-company">
            ${escapeHTML(
              getCompany(job)
            )}
          </p>

        </div>


        <div class="job-score">
          ${personal.score}% match
        </div>

      </div>


      <div class="job-meta">

        <span>
          ${escapeHTML(
            getLocation(job)
          )}
        </span>

        <span>
          ${escapeHTML(
            getJobType(job)
          )}
        </span>

        <span>
          ${isRemote(job)
            ? 'Remote'
            : 'On-site / Hybrid'}
        </span>

        <span>
          ${escapeHTML(
            getFreshness(job)
          )}
        </span>

      </div>


      <div class="job-skill-section">

        <div class="job-skill-group">

          <span class="job-skill-label">
            Matched skills
          </span>

          <div class="job-skills">

            ${
              matched.length

                ? matched
                    .map(
                      skill =>
                        `<span>
                          ${escapeHTML(
                            skill
                          )}
                        </span>`
                    )
                    .join('')

                : `<span>
                    No direct skill match
                  </span>`
            }

          </div>

        </div>


        <div class="job-skill-group">

          <span class="job-skill-label">
            Skill gap
          </span>

          <div class="job-skills">

            ${
              missing.length

                ? missing
                    .map(
                      skill =>
                        `<span>
                          ${escapeHTML(
                            skill
                          )}
                        </span>`
                    )
                    .join('')

                : `<span>
                    No major gap detected
                  </span>`
            }

          </div>

        </div>

      </div>


      <div class="job-card-footer">

        <button
          class="job-button"
          data-action="details"
          data-id="${escapeHTML(id)}"
          type="button"
        >
          Details
        </button>


        <button
          class="job-button"
          data-action="save"
          data-id="${escapeHTML(id)}"
          type="button"
        >
          ${saved
            ? 'Saved'
            : 'Save'}
        </button>


        <select
          class="job-status-select"
          data-action="status"
          data-id="${escapeHTML(id)}"
        >

          ${
            [
              'Not Applied',
              'Interested',
              'Applied',
              'Interview',
              'Rejected'
            ]
              .map(
                value =>
                  `<option
                    value="${escapeHTML(value)}"
                    ${
                      status === value
                        ? 'selected'
                        : ''
                    }
                  >
                    ${escapeHTML(value)}
                  </option>`
              )
              .join('')
          }

        </select>


        <a
          class="apply-button"
          href="${escapeHTML(
            safeLink(
              job.job_url ||
              job.url
            )
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Apply
        </a>

      </div>

    </article>
  `;
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

  const results =
    $('results');

  if (!results) {
    return;
  }


  const filtered =
    sortJobs(
      getFilteredJobs()
    );


  updateSummary(
    filtered
  );


  updateSavedUI();


  if (!filtered.length) {

    results.innerHTML = `
      <div class="empty-state">

        <h3>
          No matching jobs found right now
        </h3>

        <p>
          Try a shorter search or clear the filters.
        </p>

      </div>
    `;

    updateAgent(
      null
    );

    return;
  }


  results.innerHTML =
    filtered
      .map(jobCard)
      .join('');
}


/* =========================================================
   OPPORTUNITY AGENT
   ========================================================= */

function updateAgent(job) {

  const panel =
    $('agentPanel');

  if (!panel) {
    return;
  }


  if (!job) {

    if (
      $('agentJobTitle')
    ) {
      $('agentJobTitle')
        .textContent =
        'No recommendation yet';
    }


    if (
      $('agentCompany')
    ) {
      $('agentCompany')
        .textContent =
        'No opportunities match the current filters.';
    }


    if (
      $('agentMatch')
    ) {
      $('agentMatch')
        .textContent =
        '--%';
    }


    if (
      $('agentMatchedSkills')
    ) {
      $('agentMatchedSkills')
        .innerHTML = '';
    }


    if (
      $('agentMissingSkills')
    ) {
      $('agentMissingSkills')
        .innerHTML = '';
    }


    if (
      $('agentNextAction')
    ) {
      $('agentNextAction')
        .textContent =
        'Change the filters or analyze again.';
    }

    return;
  }


  const result =
    calculatePersonalMatch(
      job
    );


  lastAnalyzedJobId =
    jobId(job);


  if (
    $('agentJobTitle')
  ) {
    $('agentJobTitle')
      .textContent =
      getJobTitle(job);
  }


  if (
    $('agentCompany')
  ) {
    $('agentCompany')
      .textContent =
      `${getCompany(job)} • ${getLocation(job)}`;
  }


  if (
    $('agentMatch')
  ) {
    $('agentMatch')
      .textContent =
      `${result.score}%`;
  }


  if (
    $('agentMatchedSkills')
  ) {

    $('agentMatchedSkills')
      .innerHTML =
      result.matchedSkills.length

        ? result.matchedSkills
            .map(
              skill =>
                `<span>
                  ${escapeHTML(skill)}
                </span>`
            )
            .join('')

        : `<span class="agent-empty">
            No direct skill match
          </span>`;
  }


  if (
    $('agentMissingSkills')
  ) {

    $('agentMissingSkills')
      .innerHTML =
      result.missingSkills.length

        ? result.missingSkills
            .map(
              skill =>
                `<span>
                  ${escapeHTML(skill)}
                </span>`
            )
            .join('')

        : `<span class="agent-empty">
            No major skill gap
          </span>`;
  }


  const nextAction =
    result.missingSkills.length

      ? `Learn ${result.missingSkills.slice(0, 2).join(' and ')} basics, then review this opportunity.`

      : 'Review the job details and consider applying if the requirements fit you.';


  if (
    $('agentNextAction')
  ) {
    $('agentNextAction')
      .textContent =
      nextAction;
  }
}


/* =========================================================
   ANALYZE
   ========================================================= */

function analyzeBestOpportunity() {

  const best =
    getBestOpportunity();

  updateAgent(
    best
  );
}


/* =========================================================
   JOB MODAL
   ========================================================= */

function openJobModal(job) {

  const modal =
    $('jobModal');

  const content =
    $('modalContent');

  if (
    !modal ||
    !content ||
    !job
  ) {
    return;
  }


  const personal =
    calculatePersonalMatch(
      job
    );

  const id =
    jobId(job);


  content.innerHTML = `

    <div class="modal-header-content">

      <span class="modal-source">
        ${escapeHTML(
          getSource(job)
        )}
      </span>

      <h2 id="modalTitle">
        ${escapeHTML(
          getJobTitle(job)
        )}
      </h2>

      <p>
        ${escapeHTML(
          getCompany(job)
        )}
      </p>

    </div>


    <div class="modal-grid">

      <div>
        <strong>
          Personal match
        </strong>

        <span>
          ${personal.score}%
        </span>
      </div>


      <div>
        <strong>
          Job score
        </strong>

        <span>
          ${calculateScore(job)}
        </span>
      </div>


      <div>
        <strong>
          Location
        </strong>

        <span>
          ${escapeHTML(
            getLocation(job)
          )}
        </span>
      </div>


      <div>
        <strong>
          Type
        </strong>

        <span>
          ${escapeHTML(
            getJobType(job)
          )}
        </span>
      </div>

    </div>


    <section class="modal-section">

      <h3>
        Why this matches
      </h3>

      <ul>

        ${
          personal.reasons.length

            ? personal.reasons
                .map(
                  reason =>
                    `<li>
                      ${escapeHTML(
                        reason
                      )}
                    </li>`
                )
                .join('')

            : `<li>
                Match details are limited for this listing.
              </li>`
        }

      </ul>

    </section>


    <section class="modal-section">

      <h3>
        Matched skills
      </h3>

      <div class="modal-tags">

        ${
          personal.matchedSkills.length

            ? personal.matchedSkills
                .map(
                  skill =>
                    `<span>
                      ${escapeHTML(
                        skill
                      )}
                    </span>`
                )
                .join('')

            : '<span>None detected</span>'
        }

      </div>

    </section>


    <section class="modal-section">

      <h3>
        Skill gap
      </h3>

      <div class="modal-tags">

        ${
          personal.missingSkills.length

            ? personal.missingSkills
                .map(
                  skill =>
                    `<span>
                      ${escapeHTML(
                        skill
                      )}
                    </span>`
                )
                .join('')

            : '<span>No major gap detected</span>'
        }

      </div>

    </section>


    <section class="modal-section">

      <h3>
        Description
      </h3>

      <p class="modal-description">
        ${escapeHTML(
          getDescription(job) ||
          'No description available.'
        )}
      </p>

    </section>


    <div class="modal-actions">

      <button
        class="job-button"
        id="modalSaveButton"
        type="button"
      >
        ${
          savedJobs.has(id)
            ? 'Remove Saved'
            : 'Save Job'
        }
      </button>


      <a
        class="apply-button"
        href="${escapeHTML(
          safeLink(
            job.job_url ||
            job.url
          )
        )}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Job
      </a>

    </div>
  `;


  modal.hidden =
    false;


  const saveButton =
    $('modalSaveButton');


  if (saveButton) {

    saveButton.addEventListener(
      'click',
      () => {

        toggleSaved(
          id
        );

        openJobModal(
          job
        );
      }
    );
  }
}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeJobModal() {

  const modal =
    $('jobModal');

  if (modal) {
    modal.hidden =
      true;
  }
}


/* =========================================================
   END PART 4
   ========================================================= *//* =========================================================
   JOB RADAR — PART 5 / 5
   RESET + EVENTS + DATA LOADING
   ========================================================= */


/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetFilters() {

  const filterIds = [
    'search',
    'location',
    'jobType',
    'remote',
    'period',
    'skill',
    'status',
    'minimum'
  ];


  filterIds.forEach(
    id => {

      const element =
        $(id);

      if (!element) {
        return;
      }


      if (
        element.tagName ===
        'SELECT'
      ) {

        element.selectedIndex =
          0;

      } else {

        element.value =
          '';
      }
    }
  );


  const sort =
    $('sort');

  if (sort) {
    sort.selectedIndex =
      0;
  }


  showSavedOnly =
    false;


  updateSavedUI();

  render();

  updateAgent(
    getBestOpportunity()
  );
}


/* =========================================================
   EXPORT SAVED JOBS
   ========================================================= */

function exportSavedJobs() {

  const jobs =
    allJobs.filter(
      job =>
        savedJobs.has(
          jobId(job)
        )
    );


  if (!jobs.length) {

    alert(
      'No saved jobs to export.'
    );

    return;
  }


  const header = [
    'Title',
    'Company',
    'Location',
    'Source',
    'Score',
    'Personal Match',
    'Status',
    'URL'
  ];


  const rows =
    jobs.map(
      job => [

        getJobTitle(job),

        getCompany(job),

        getLocation(job),

        getSource(job),

        calculateScore(job),

        calculatePersonalMatch(
          job
        ).score,

        applicationStatus[
          jobId(job)
        ] ||
        'Not Applied',

        job.job_url ||
        job.url ||
        ''
      ]
    );


  const csv =
    [header, ...rows]
      .map(
        row =>
          row
            .map(
              value =>
                `"${text(value)
                  .replace(
                    /"/g,
                    '""'
                  )}"`
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
    'job-radar-saved-jobs.csv';


  document.body.appendChild(
    link
  );


  link.click();

  link.remove();


  URL.revokeObjectURL(
    url
  );
}


/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindEvents() {

  const filterIds = [
    'search',
    'location',
    'jobType',
    'remote',
    'period',
    'skill',
    'status',
    'minimum',
    'sort'
  ];


  filterIds.forEach(
    id => {

      const element =
        $(id);

      if (!element) {
        return;
      }


      const eventType =
        id === 'search'
          ? 'input'
          : 'change';


      element.addEventListener(
        eventType,
        () => {

          render();

          /*
           * Show the best matching
           * opportunity immediately
           * after filters change.
           */

          updateAgent(
            getBestOpportunity()
          );
        }
      );
    }
  );


  /* Saved */

  $('savedToggle')
    ?.addEventListener(
      'click',
      () => {

        showSavedOnly =
          !showSavedOnly;

        render();

        updateAgent(
          getBestOpportunity()
        );
      }
    );


  /* Reset */

  $('reset')
    ?.addEventListener(
      'click',
      resetFilters
    );


  /* Agent */

  $('agentAnalyze')
    ?.addEventListener(
      'click',
      analyzeBestOpportunity
    );


  /* Export */

  $('exportSaved')
    ?.addEventListener(
      'click',
      exportSavedJobs
    );


  /* Job buttons */

  $('results')
    ?.addEventListener(
      'click',
      event => {

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
          allJobs.find(
            item =>
              jobId(item) ===
              id
          );


        if (!job) {
          return;
        }


        if (
          action ===
          'details'
        ) {

          openJobModal(
            job
          );

          return;
        }


        if (
          action ===
          'save'
        ) {

          toggleSaved(
            id
          );
        }
      }
    );


  /* Application status */

  $('results')
    ?.addEventListener(
      'change',
      event => {

        const select =
          event.target.closest(
            '[data-action="status"]'
          );

        if (!select) {
          return;
        }


        setJobStatus(
          select.dataset.id,
          select.value
        );
      }
    );


  /* Modal close */

  $('modalClose')
    ?.addEventListener(
      'click',
      closeJobModal
    );


  $('jobModal')
    ?.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          $('jobModal')
        ) {
          closeJobModal();
        }
      }
    );


  /* Escape */

  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key ===
        'Escape'
      ) {
        closeJobModal();
      }
    }
  );
}


/* =========================================================
   LOAD REAL JOB DATA
   ========================================================= */

async function loadJobs() {

  const sourceStatus =
    $('sourceStatus');

  const notice =
    $('notice');


  try {

    if (sourceStatus) {

      sourceStatus.textContent =
        'Loading latest job data...';
    }


    const response =
      await fetch(
        `${DATA_URL}?t=${Date.now()}`,
        {
          cache:
            'no-store'
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    /*
     * Supports both:
     *
     * [...]
     *
     * and
     *
     * { jobs: [...] }
     */

    const jobs =
      Array.isArray(data)
        ? data
        : data.jobs;


    if (!Array.isArray(jobs)) {

      throw new Error(
        'Invalid job data format'
      );
    }


    allJobs =
      jobs.filter(
        Boolean
      );


    populateFilters();

    updateInsights();

    render();

    updateAgent(
      getBestOpportunity()
    );


    if (sourceStatus) {

      sourceStatus.textContent =
        `${allJobs.length} opportunities loaded`;
    }


    if (notice) {
      notice.textContent =
        '';
    }

  } catch (error) {

    console.error(
      'Job Radar data error:',
      error
    );


    allJobs =
      [];


    if (sourceStatus) {

      sourceStatus.textContent =
        'Unable to load job data';
    }


    if (notice) {

      notice.textContent =
        'Job data could not be loaded. Please refresh the page and try again.';
    }


    render();

    updateAgent(
      null
    );
  }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {

  loadLocalState();

  updateSavedUI();

  updateInsights();

  bindEvents();

  await loadJobs();
}


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    init
  );

} else {

  init();
}


/* =========================================================
   END OF APP.JS
   ========================================================= */