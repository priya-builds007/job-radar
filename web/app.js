/* =========================================================
   JOB RADAR
   COMPLETE MAIN APPLICATION
   PART 1 / 5
   ========================================================= */

'use strict';

const DATA_URL = '/data/processed_jobs.json';

const STORAGE_KEYS = {
  savedJobs: 'jobRadarSavedJobs',
  applicationStatus: 'jobRadarApplicationStatus'
};

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

const SEARCH_ALIASES = {
  js: ['javascript'],
  iot: ['iot', 'internet of things'],
  ai: ['artificial intelligence', 'generative ai'],
  ml: ['machine learning'],
  software: ['software', 'developer', 'programmer'],
  developer: ['developer', 'software engineer'],
  embedded: ['embedded', 'embedded systems'],
  web: ['web', 'frontend', 'backend', 'full stack']
};

let allJobs = [];
let savedJobs = new Set();
let applicationStatus = {};
let showSavedOnly = false;
let lastAnalyzedJobId = null;

const $ = id => document.getElementById(id);


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function text(value) {
  return value == null ? '' : String(value);
}

function normalize(value) {
  return text(value).toLowerCase().trim();
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
    values.filter(
      value => value !== null &&
               value !== undefined &&
               value !== ''
    )
  )];
}

function asArray(value) {
  if (Array.isArray(value)) return value;

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return [];
  }

  return [value];
}

function compact(value) {
  return normalize(value).replace(/[^a-z0-9+#.]+/g, '');
}

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

function safeLink(url) {
  const value = text(url).trim();

  return /^https?:\/\//i.test(value)
    ? value
    : '#';
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
    const status = JSON.parse(
      localStorage.getItem(
        STORAGE_KEYS.applicationStatus
      ) || '{}'
    );

    applicationStatus =
      status &&
      typeof status === 'object'
        ? status
        : {};
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
   JOB DATA HELPERS
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
    job.description || ''
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

function getJobURL(job) {
  return safeLink(
    job.job_url ||
    job.url ||
    ''
  );
}


/* =========================================================
   REMOTE + SKILLS
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

function getJobSkills(job) {
  const haystack = normalize([
    job.title,
    job.description,
    job.skills,
    job.matched_skills,
    job.required_skills,
    job.skill
  ].join(' '));

  const skills = [
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

  return skills.filter(skill => {
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
   PERSONAL MATCH ENGINE
   ========================================================= */

function calculatePersonalMatch(job) {
  const skills = getJobSkills(job);

  const title = normalize(
    getJobTitle(job)
  );

  const description = normalize(
    getDescription(job)
  );

  const location = normalize(
    getLocation(job)
  );

  let score = 0;

  const matchedSkills = [];
  const missingSkills = [];
  const reasons = [];

  const fullText = `${title} ${description}`;


  /* Early-career fit */

  const earlyLevel =
    /intern|internship|trainee|fresher|entry[\s-]?level|graduate|student/
      .test(fullText);

  if (earlyLevel) {
    score += 20;

    reasons.push(
      'Suitable for an early-career student profile'
    );
  }


  /* Technical role */

  const technicalRole =
    /developer|software|engineer|programmer|python|java|frontend|backend|full[\s-]?stack|iot|embedded|tester|testing|data|ai|ml/
      .test(title);

  if (technicalRole) {
    score += 25;

    reasons.push(
      'Technical role matches a CSE profile'
    );
  }


  /* Matching skills */

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
      `${matchedSkills.length} relevant skill${
        matchedSkills.length > 1 ? 's' : ''
      } matched`
    );
  }


  /* Location */

  const local =
    /coimbatore|tamil nadu|chennai|bengaluru|bangalore|india/
      .test(location);

  if (local) {
    score += 15;

    reasons.push(
      'Location is relevant to the target region'
    );
  }


  /* Remote */

  if (isRemote(job)) {
    score += 10;

    reasons.push(
      'Remote work is available'
    );
  }


  /* Student wording */

  if (
    /student|intern|fresher|graduate/
      .test(description)
  ) {
    score += 5;
  }


  /* Skill gaps */

  const possibleGaps = [
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
  ];

  possibleGaps.forEach(skill => {
    if (
      fullText.includes(skill) &&
      !matchedSkills.includes(skill)
    ) {
      missingSkills.push(skill);
    }
  });


  return {
    score: Math.min(100, score),
    matchedSkills: unique(matchedSkills),
    missingSkills: unique(missingSkills),
    reasons: unique(reasons)
  };
}

function calculateScore(job) {
  const value = Number(job.score);

  if (Number.isFinite(value)) {
    return value;
  }

  return calculatePersonalMatch(job).score;
}


/* =========================================================
   DATE HELPERS
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

  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const jobStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffDays = Math.floor(
    (todayStart - jobStart) /
    86400000
  );

  if (diffDays < 0) return 'unknown';
  if (diffDays === 0) return 'today';
  if (diffDays <= 7) return 'week';
  if (diffDays <= 30) return 'month';

  return 'older';
}

function getFreshness(job) {
  const bucket = dateBucket(job);

  if (bucket === 'today') {
    return 'Today';
  }

  if (bucket === 'week') {
    return 'Fresh';
  }

  if (bucket === 'month') {
    return 'Recent';
  }

  if (bucket === 'older') {
    return 'Older';
  }

  return 'Date unknown';
}


/* PART 1 END *//* =========================================================
   JOB RADAR
   PART 2 / 5
   SEARCH + FILTERS
   ========================================================= */

const SEARCH_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'job',
  'jobs',
  'role',
  'work',
  'in',
  'at',
  'to',
  'of',
  'a',
  'an'
]);


/* =========================================================
   FILTER HELPERS
   ========================================================= */

function selectedFilter(id) {
  const element = $(id);

  if (!element) {
    return '';
  }

  return normalize(element.value);
}

function searchTokens(value) {
  return normalize(value)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(
      token =>
        token &&
        !SEARCH_STOP_WORDS.has(token)
    );
}

function searchMatchesToken(haystack, token) {
  if (haystack.includes(token)) {
    return true;
  }

  const aliases = SEARCH_ALIASES[token];

  if (!aliases) {
    return false;
  }

  return aliases.some(alias =>
    haystack.includes(alias)
  );
}

function matchesSearch(job, query) {
  const tokens = searchTokens(query);

  if (!tokens.length) {
    return true;
  }

  const haystack = normalize([
    getJobTitle(job),
    getCompany(job),
    getLocation(job),
    getDescription(job),
    getSource(job),
    getJobType(job),
    asArray(job.skills).join(' '),
    asArray(job.matched_skills).join(' ')
  ].join(' '));

  return tokens.every(token =>
    searchMatchesToken(haystack, token)
  );
}


/* =========================================================
   LOCATION FILTER
   ========================================================= */

function normalizeLocation(value) {
  return normalize(value)
    .replace(/\btn\b/g, 'tamil nadu')
    .replace(/\bin\b/g, 'india')
    .replace(/\bbengaluru\b/g, 'bangalore');
}

function locationMatches(
  jobLocation,
  selectedLocation
) {
  if (
    !selectedLocation ||
    selectedLocation === 'all'
  ) {
    return true;
  }

  const jobValue =
    normalizeLocation(jobLocation);

  const selectedValue =
    normalizeLocation(selectedLocation);

  return (
    jobValue === selectedValue ||
    jobValue.includes(selectedValue) ||
    selectedValue.includes(jobValue)
  );
}


/* =========================================================
   JOB TYPE FILTER
   ========================================================= */

function normalizeJobType(value) {
  const type = normalize(value);

  if (
    type.includes('full-time') ||
    type.includes('fulltime') ||
    type === 'full time'
  ) {
    return 'fulltime';
  }

  if (
    type.includes('part-time') ||
    type.includes('parttime') ||
    type === 'part time'
  ) {
    return 'parttime';
  }

  if (type.includes('intern')) {
    return 'internship';
  }

  if (type.includes('contract')) {
    return 'contract';
  }

  return type;
}

function jobTypeMatches(
  jobType,
  selectedType
) {
  if (
    !selectedType ||
    selectedType === 'all'
  ) {
    return true;
  }

  return (
    normalizeJobType(jobType) ===
    normalizeJobType(selectedType)
  );
}


/* =========================================================
   REMOTE FILTER
   ========================================================= */

function remoteMatches(
  job,
  selectedRemote
) {
  if (
    !selectedRemote ||
    selectedRemote === 'all'
  ) {
    return true;
  }

  const remote = isRemote(job);

  if (selectedRemote === 'remote') {
    return remote;
  }

  if (selectedRemote === 'onsite') {
    return !remote;
  }

  return true;
}


/* =========================================================
   DATE FILTER
   ========================================================= */

function postedMatches(
  job,
  selectedPeriod
) {
  if (
    !selectedPeriod ||
    selectedPeriod === 'all'
  ) {
    return true;
  }

  const bucket = dateBucket(job);

  if (selectedPeriod === 'today') {
    return bucket === 'today';
  }

  if (selectedPeriod === 'this week') {
    return bucket === 'week';
  }

  if (selectedPeriod === 'this month') {
    return bucket === 'month';
  }

  if (selectedPeriod === 'older') {
    return bucket === 'older';
  }

  if (
    selectedPeriod === 'unknown date' ||
    selectedPeriod === 'unknown'
  ) {
    return bucket === 'unknown';
  }

  return true;
}


/* =========================================================
   SKILL FILTER
   ========================================================= */

function skillMatches(
  job,
  selectedSkill
) {
  if (
    !selectedSkill ||
    selectedSkill === 'all'
  ) {
    return true;
  }

  const skills = getJobSkills(job);

  return skills.includes(
    normalize(selectedSkill)
  );
}


/* =========================================================
   SCORE FILTER
   ========================================================= */

function minimumScoreMatches(
  job,
  minimum
) {
  const value = Number(minimum);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return true;
  }

  return calculateScore(job) >= value;
}


/* =========================================================
   APPLICATION STATUS FILTER
   ========================================================= */

function getApplicationStatus(job) {
  return applicationStatus[jobId(job)] || '';
}

function statusMatches(
  job,
  selectedStatus
) {
  if (
    !selectedStatus ||
    selectedStatus === 'all'
  ) {
    return true;
  }

  const id = jobId(job);
  const status = getApplicationStatus(job);

  if (selectedStatus === 'not-tracked') {
    return !status;
  }

  if (selectedStatus === 'saved') {
    return savedJobs.has(id);
  }

  return normalize(status) ===
    normalize(selectedStatus);
}


/* =========================================================
   SAVED FILTER
   ========================================================= */

function savedMatches(job) {
  if (!showSavedOnly) {
    return true;
  }

  return savedJobs.has(
    jobId(job)
  );
}


/* =========================================================
   MAIN FILTER
   ========================================================= */

function getFilteredJobs() {
  const search = $('search')
    ? $('search').value
    : '';

  const location = selectedFilter(
    'location'
  );

  const jobType = selectedFilter(
    'jobType'
  );

  const remote = selectedFilter(
    'remote'
  );

  const period = selectedFilter(
    'period'
  );

  const skill = selectedFilter(
    'skill'
  );

  const status = selectedFilter(
    'status'
  );

  const minimum = selectedFilter(
    'minimum'
  );

  return allJobs.filter(job => {

    if (
      !matchesSearch(job, search)
    ) {
      return false;
    }

    if (
      !locationMatches(
        getLocation(job),
        location
      )
    ) {
      return false;
    }

    if (
      !jobTypeMatches(
        getJobType(job),
        jobType
      )
    ) {
      return false;
    }

    if (
      !remoteMatches(
        job,
        remote
      )
    ) {
      return false;
    }

    if (
      !postedMatches(
        job,
        period
      )
    ) {
      return false;
    }

    if (
      !skillMatches(
        job,
        skill
      )
    ) {
      return false;
    }

    if (
      !minimumScoreMatches(
        job,
        minimum
      )
    ) {
      return false;
    }

    if (
      !statusMatches(
        job,
        status
      )
    ) {
      return false;
    }

    if (
      !savedMatches(job)
    ) {
      return false;
    }

    return true;
  });
}


/* =========================================================
   SORTING
   ========================================================= */

function dateValue(job) {
  const raw = getDate(job);

  if (!raw) {
    return 0;
  }

  const value =
    new Date(raw).getTime();

  return Number.isFinite(value)
    ? value
    : 0;
}

function sortJobs(jobs) {
  const sort =
    selectedFilter('sort') ||
    'newest';

  return [...jobs].sort(
    (a, b) => {

      if (sort === 'score') {
        return (
          calculateScore(b) -
          calculateScore(a)
        );
      }

      if (sort === 'oldest') {
        return (
          dateValue(a) -
          dateValue(b)
        );
      }

      return (
        dateValue(b) -
        dateValue(a)
      );
    }
  );
}


/* PART 2 END *//* =========================================================
   JOB RADAR
   PART 3 / 5
   SAVED JOBS + INSIGHTS + AGENT
   ========================================================= */


/* =========================================================
   SAVED JOBS
   ========================================================= */

function toggleSaved(job) {
  const id = jobId(job);

  if (savedJobs.has(id)) {
    savedJobs.delete(id);
  } else {
    savedJobs.add(id);
  }

  saveLocalState();
  updateSavedUI();
  render();
}

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
    button.setAttribute(
      'aria-pressed',
      String(showSavedOnly)
    );

    button.classList.toggle(
      'active',
      showSavedOnly
    );
  }
}


/* =========================================================
   APPLICATION STATUS
   ========================================================= */

function setApplicationStatus(
  job,
  status
) {
  const id = jobId(job);

  if (!status) {
    delete applicationStatus[id];
  } else {
    applicationStatus[id] =
      status;
  }

  saveLocalState();
  render();
}


/* =========================================================
   INSIGHTS
   ========================================================= */

function updateInsights() {
  const saved =
    $('insightSaved');

  const remote =
    $('insightRemote');

  const highScore =
    $('insightHighScore');

  const applications =
    $('insightApplications');

  if (saved) {
    saved.textContent =
      savedJobs.size;
  }

  if (remote) {
    remote.textContent =
      allJobs.filter(isRemote).length;
  }

  if (highScore) {
    highScore.textContent =
      allJobs.filter(
        job => calculateScore(job) >= 80
      ).length;
  }

  if (applications) {
    applications.textContent =
      Object.keys(applicationStatus)
        .filter(
          id =>
            applicationStatus[id]
        ).length;
  }

  updateTopSkills();
}


/* =========================================================
   TOP SKILLS
   ========================================================= */

function updateTopSkills() {
  const container =
    $('topSkills');

  if (!container) {
    return;
  }

  const counts = {};

  allJobs.forEach(job => {
    getJobSkills(job).forEach(skill => {
      counts[skill] =
        (counts[skill] || 0) + 1;
    });
  });

  const skills =
    Object.entries(counts)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 8);

  if (!skills.length) {
    container.innerHTML =
      '<span>No skill data yet</span>';
    return;
  }

  container.innerHTML =
    skills.map(
      ([skill, count]) => `
        <span>
          ${escapeHTML(skill)}
          · ${count}
        </span>
      `
    ).join('');
}


/* =========================================================
   OPPORTUNITY AGENT
   ========================================================= */

function getBestOpportunity() {
  const jobs =
    getFilteredJobs();

  if (!jobs.length) {
    return null;
  }

  return [...jobs].sort(
    (a, b) => {

      const scoreDifference =
        calculateScore(b) -
        calculateScore(a);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return (
        dateValue(b) -
        dateValue(a)
      );
    }
  )[0];
}


/* =========================================================
   AGENT TEXT
   ========================================================= */

function getAgentNextAction(
  job,
  match
) {
  const status =
    getApplicationStatus(job);

  if (status === 'Applied') {
    return 'Application already tracked. Keep checking for updates.';
  }

  if (status === 'Interview') {
    return 'Prepare for the interview and review the required skills.';
  }

  if (match.missingSkills.length) {
    return `Review the missing skill${
      match.missingSkills.length > 1
        ? 's'
        : ''
    } and then consider applying.`;
  }

  return 'Review the job requirements and consider applying.';
}

function getAgentSkillText(skills) {
  if (!skills.length) {
    return 'No strong skill match detected yet.';
  }

  return skills
    .map(skill => escapeHTML(skill))
    .join(' • ');
}

function getAgentGapText(skills) {
  if (!skills.length) {
    return 'No major skill gap identified.';
  }

  return skills
    .slice(0, 4)
    .map(skill => escapeHTML(skill))
    .join(' • ');
}


/* =========================================================
   UPDATE AGENT
   ========================================================= */

function updateAgent(job) {
  const panel =
    $('agentPanel');

  if (!panel) {
    return;
  }

  if (!job) {
    panel.innerHTML = `
      <div class="agent-empty">
        <h3>No matching opportunity</h3>
        <p>
          Try changing your filters to discover
          more opportunities.
        </p>
      </div>
    `;

    lastAnalyzedJobId = null;
    return;
  }

  const match =
    calculatePersonalMatch(job);

  lastAnalyzedJobId =
    jobId(job);

  panel.innerHTML = `
    <div class="agent-header">
      <div>
        <div class="agent-label">
          JOB RADAR AGENT
        </div>

        <h3>Your Next Opportunity</h3>

        <p>
          A clear explanation of why this opportunity
          matches your profile.
        </p>
      </div>
    </div>

    <div class="agent-opportunity">

      <div class="agent-main">

        <div class="agent-job-title">
          ${escapeHTML(
            getJobTitle(job)
          )}
        </div>

        <div class="agent-company">
          ${escapeHTML(
            getCompany(job)
          )}
        </div>

        <div class="agent-location">
          ${escapeHTML(
            getLocation(job)
          )}
        </div>

      </div>

      <div class="agent-score-card">
        <span>Personal Match</span>
        <strong>
          ${match.score}%
        </strong>
      </div>

    </div>

    <div class="agent-grid">

      <div class="agent-info-card">
        <div class="agent-info-title">
          Matching skills
        </div>

        <div class="agent-info-value">
          ${getAgentSkillText(
            match.matchedSkills
          )}
        </div>
      </div>

      <div class="agent-info-card">
        <div class="agent-info-title">
          Skills to explore
        </div>

        <div class="agent-info-value">
          ${getAgentGapText(
            match.missingSkills
          )}
        </div>
      </div>

    </div>

    <div class="agent-next">
      <div class="agent-info-title">
        Next step
      </div>

      <div class="agent-next-text">
        ${escapeHTML(
          getAgentNextAction(
            job,
            match
          )
        )}
      </div>
    </div>

    <button
      id="agentAnalyze"
      type="button"
      data-agent-id="${escapeHTML(
        jobId(job)
      )}">
      Analyze Opportunity
    </button>
  `;
}


/* PART 3 END *//* =========================================================
   JOB RADAR
   PART 4 / 5
   JOB CARDS + MODAL
   ========================================================= */


/* =========================================================
   JOB CARD
   ========================================================= */

function jobCard(job) {
  const id = jobId(job);
  const score = calculateScore(job);
  const match = calculatePersonalMatch(job);

  const saved = savedJobs.has(id);
  const status = getApplicationStatus(job);

  const skills = match.matchedSkills;
  const gaps = match.missingSkills;

  const description =
    getDescription(job);

  const shortDescription =
    description.length > 240
      ? `${description.slice(0, 240)}...`
      : description;

  return `
    <article class="job-card" data-job-id="${escapeHTML(id)}">

      <div class="job-card-top">

        <div>
          <div class="job-source">
            ${escapeHTML(getSource(job))}
          </div>

          <h4 class="job-title">
            ${escapeHTML(getJobTitle(job))}
          </h4>

          <div class="job-company">
            ${escapeHTML(getCompany(job))}
          </div>
        </div>

        <div class="job-score">
          <strong>${score}%</strong>
          <span>Match score</span>
        </div>

      </div>


      <div class="job-meta">

        <span>
          ${escapeHTML(getLocation(job))}
        </span>

        <span>
          ${escapeHTML(getJobType(job))}
        </span>

        <span>
          ${isRemote(job) ? 'Remote' : 'On-site'}
        </span>

        <span>
          ${escapeHTML(getFreshness(job))}
        </span>

      </div>


      ${
        shortDescription
          ? `
            <p class="job-description">
              ${escapeHTML(shortDescription)}
            </p>
          `
          : ''
      }


      <div class="personal-match">
        <strong>${match.score}%</strong>
        Personal Match
      </div>


      <div class="job-skill-section">

        <div class="job-skill-group">

          <h5>Matching skills</h5>

          <div class="job-skills">

            ${
              skills.length
                ? skills
                    .slice(0, 7)
                    .map(
                      skill => `
                        <span>
                          ${escapeHTML(skill)}
                        </span>
                      `
                    )
                    .join('')
                : `
                    <span>
                      No direct match
                    </span>
                  `
            }

          </div>

        </div>


        <div class="job-skill-group">

          <h5>Skills to explore</h5>

          <div class="job-skills">

            ${
              gaps.length
                ? gaps
                    .slice(0, 5)
                    .map(
                      skill => `
                        <span>
                          ${escapeHTML(skill)}
                        </span>
                      `
                    )
                    .join('')
                : `
                    <span>
                      No major gap
                    </span>
                  `
            }

          </div>

        </div>

      </div>


      <div class="job-card-footer">

        <button
          class="job-button"
          data-action="details"
          data-id="${escapeHTML(id)}"
          type="button">
          Details
        </button>


        <button
          class="job-button why-button"
          data-action="why"
          data-id="${escapeHTML(id)}"
          type="button">
          Why this job?
        </button>


        <button
          class="job-button"
          data-action="save"
          data-id="${escapeHTML(id)}"
          type="button">
          ${saved ? 'Saved ✓' : 'Save'}
        </button>


        <select
          class="job-status-select"
          data-action="status"
          data-id="${escapeHTML(id)}"
          aria-label="Application status">

          <option value="">
            Not tracked
          </option>

          <option
            value="Saved"
            ${status === 'Saved' ? 'selected' : ''}>
            Saved
          </option>

          <option
            value="Applied"
            ${status === 'Applied' ? 'selected' : ''}>
            Applied
          </option>

          <option
            value="Interview"
            ${status === 'Interview' ? 'selected' : ''}>
            Interview
          </option>

          <option
            value="Closed"
            ${status === 'Closed' ? 'selected' : ''}>
            Closed
          </option>

        </select>


        <a
          class="apply-button"
          href="${escapeHTML(getJobURL(job))}"
          target="_blank"
          rel="noopener noreferrer">
          Open Job
        </a>

      </div>

    </article>
  `;
}


/* =========================================================
   RENDER JOBS
   ========================================================= */

function render() {
  const container = $('results');

  if (!container) {
    return;
  }

  const filtered =
    getFilteredJobs();

  const sorted =
    sortJobs(filtered);


  /* Result count */

  const resultCount =
    $('resultCount');

  if (resultCount) {
    resultCount.textContent =
      `${sorted.length} ${
        sorted.length === 1
          ? 'job'
          : 'jobs'
      }`;
  }


  /* Empty state */

  if (!sorted.length) {

    container.innerHTML = `
      <div class="empty-state">

        <h3>
          No opportunities found
        </h3>

        <p>
          Try changing your search or filters.
        </p>

      </div>
    `;

  } else {

    container.innerHTML =
      sorted
        .map(jobCard)
        .join('');
  }


  updateSummary();
  updateInsights();
  updateAgent(
    getBestOpportunity()
  );
  updateSavedUI();
}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary() {

  const total =
    $('total');

  const recent =
    $('recent');

  const sources =
    $('sources');


  if (total) {
    total.textContent =
      allJobs.length;
  }


  if (recent) {
    recent.textContent =
      allJobs.filter(
        job => {
          const bucket =
            dateBucket(job);

          return (
            bucket === 'today' ||
            bucket === 'week'
          );
        }
      ).length;
  }


  if (sources) {

    const sourceCount =
      new Set(
        allJobs.map(
          getSource
        )
      ).size;

    sources.textContent =
      sourceCount;
  }
}


/* =========================================================
   FIND JOB BY ID
   ========================================================= */

function findJobById(id) {
  return allJobs.find(
    job => jobId(job) === id
  );
}


/* =========================================================
   MODAL
   ========================================================= */

function openJobModal(job) {

  const modal =
    $('jobModal');

  const content =
    $('modalContent');

  if (!modal || !content) {
    return;
  }

  const match =
    calculatePersonalMatch(job);

  content.innerHTML = `

    <div class="modal-job-header">

      <div class="job-source">
        ${escapeHTML(getSource(job))}
      </div>

      <h2>
        ${escapeHTML(getJobTitle(job))}
      </h2>

      <h3>
        ${escapeHTML(getCompany(job))}
      </h3>

      <div class="modal-tags">

        <span>
          ${escapeHTML(getLocation(job))}
        </span>

        <span>
          ${escapeHTML(getJobType(job))}
        </span>

        <span>
          ${isRemote(job)
            ? 'Remote'
            : 'On-site'}
        </span>

        <span>
          ${escapeHTML(getFreshness(job))}
        </span>

      </div>

    </div>


    <div class="modal-section">

      <h4>
        Personal match
      </h4>

      <p>
        ${match.score}% match based on
        your current profile and the
        job requirements.
      </p>

    </div>


    <div class="modal-section">

      <h4>
        Matching skills
      </h4>

      <div class="modal-tags">

        ${
          match.matchedSkills.length
            ? match.matchedSkills
                .map(
                  skill => `
                    <span>
                      ${escapeHTML(skill)}
                    </span>
                  `
                )
                .join('')
            : `
                <span>
                  No direct match detected
                </span>
              `
        }

      </div>

    </div>


    <div class="modal-section">

      <h4>
        Skills to explore
      </h4>

      <div class="modal-tags">

        ${
          match.missingSkills.length
            ? match.missingSkills
                .map(
                  skill => `
                    <span>
                      ${escapeHTML(skill)}
                    </span>
                  `
                )
                .join('')
            : `
                <span>
                  No major skill gap
                </span>
              `
        }

      </div>

    </div>


    <div class="modal-section">

      <h4>
        Why it matches
      </h4>

      <ul>

        ${
          match.reasons.length
            ? match.reasons
                .map(
                  reason => `
                    <li>
                      ${escapeHTML(reason)}
                    </li>
                  `
                )
                .join('')
            : `
                <li>
                  Limited matching evidence available.
                </li>
              `
        }

      </ul>

    </div>


    <div class="modal-section">

      <h4>
        Job description
      </h4>

      <p>
        ${escapeHTML(
          getDescription(job) ||
          'No description available.'
        )}
      </p>

    </div>


    <div class="modal-section">

      <a
        class="apply-button"
        href="${escapeHTML(getJobURL(job))}"
        target="_blank"
        rel="noopener noreferrer">
        Open Job
      </a>

    </div>

  `;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}


/* =========================================================
   WHY THIS JOB
   ========================================================= */

function showWhyThisJob(job) {

  const modal =
    $('jobModal');

  const content =
    $('modalContent');

  if (!modal || !content) {
    return;
  }

  const match =
    calculatePersonalMatch(job);

  content.innerHTML = `

    <div class="modal-job-header">

      <div class="job-source">
        JOB RADAR EXPLANATION
      </div>

      <h2>
        Why this job?
      </h2>

      <h3>
        ${escapeHTML(getJobTitle(job))}
      </h3>

      <p>
        ${escapeHTML(getCompany(job))}
      </p>

    </div>


    <div class="modal-section">

      <h4>
        Personal match
      </h4>

      <p>
        This opportunity currently has a
        <strong>${match.score}%</strong>
        personal match.
      </p>

    </div>


    <div class="modal-section">

      <h4>
        What matches
      </h4>

      <ul>

        ${
          match.reasons.length
            ? match.reasons
                .map(
                  reason => `
                    <li>
                      ${escapeHTML(reason)}
                    </li>
                  `
                )
                .join('')
            : `
                <li>
                  No strong matching evidence found.
                </li>
              `
        }

      </ul>

    </div>


    <div class="modal-section">

      <h4>
        Matching skills
      </h4>

      <div class="modal-tags">

        ${
          match.matchedSkills.length
            ? match.matchedSkills
                .map(
                  skill => `
                    <span>
                      ${escapeHTML(skill)}
                    </span>
                  `
                )
                .join('')
            : `
                <span>
                  No direct skill match
                </span>
              `
        }

      </div>

    </div>


    <div class="modal-section">

      <h4>
        Skills to explore
      </h4>

      <div class="modal-tags">

        ${
          match.missingSkills.length
            ? match.missingSkills
                .map(
                  skill => `
                    <span>
                      ${escapeHTML(skill)}
                    </span>
                  `
                )
                .join('')
            : `
                <span>
                  No major skill gap
                </span>
              `
        }

      </div>

    </div>


    <div class="modal-section">

      <h4>
        Suggested next step
      </h4>

      <p>
        ${escapeHTML(
          getAgentNextAction(
            job,
            match
          )
        )}
      </p>

    </div>

  `;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeModal() {

  const modal =
    $('jobModal');

  if (!modal) {
    return;
  }

  modal.hidden = true;
  document.body.style.overflow = '';
}


/* PART 4 END *//* =========================================================
   JOB RADAR
   PART 5 / 5
   EVENTS + DATA LOADING + INIT
   ========================================================= */


/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetFilters() {

  const search =
    $('search');

  if (search) {
    search.value = '';
  }


  [
    'location',
    'jobType',
    'remote',
    'period',
    'skill',
    'status',
    'minimum'
  ].forEach(id => {

    const element = $(id);

    if (element) {
      element.value = 'all';
    }

  });


  const sort =
    $('sort');

  if (sort) {
    sort.value = 'newest';
  }


  showSavedOnly = false;

  updateSavedUI();
  render();
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


  const headers = [
    'Title',
    'Company',
    'Location',
    'Job Type',
    'Score',
    'Status',
    'Source',
    'Job URL'
  ];


  const rows =
    jobs.map(job => {

      const values = [
        getJobTitle(job),
        getCompany(job),
        getLocation(job),
        getJobType(job),
        calculateScore(job),
        getApplicationStatus(job) ||
          'Saved',
        getSource(job),
        getJobURL(job)
      ];

      return values.map(
        value =>
          `"${text(value)
            .replace(/"/g, '""')}"`
      ).join(',');
    });


  const csv =
    [
      headers.join(','),
      ...rows
    ].join('\n');


  const blob =
    new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement('a');

  link.href = url;

  link.download =
    'job-radar-saved-jobs.csv';

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}


/* =========================================================
   SELECT POPULATION
   ========================================================= */

function populateSelect(
  id,
  values,
  allLabel
) {

  const select = $(id);

  if (!select) {
    return;
  }

  const current =
    select.value;


  select.innerHTML = `
    <option value="all">
      ${escapeHTML(allLabel)}
    </option>
  `;


  values.forEach(value => {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return;
    }

    const option =
      document.createElement('option');

    option.value =
      text(value);

    option.textContent =
      text(value);

    select.appendChild(option);
  });


  if (
    [...select.options]
      .some(
        option =>
          option.value === current
      )
  ) {
    select.value = current;
  }
}


/* =========================================================
   POPULATE FILTERS
   ========================================================= */

function populateFilters() {

  const locations =
    unique(
      allJobs.map(
        getLocation
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  const jobTypes =
    unique(
      allJobs.map(
        getJobType
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  const skills =
    unique(
      allJobs.flatMap(
        getJobSkills
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  populateSelect(
    'location',
    locations,
    'All locations'
  );

  populateSelect(
    'jobType',
    jobTypes,
    'All types'
  );

  populateSelect(
    'skill',
    skills,
    'All skills'
  );
}


/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindEvents() {

  /* Search */

  const search =
    $('search');

  if (search) {
    search.addEventListener(
      'input',
      render
    );
  }


  /* Select filters */

  [
    'location',
    'jobType',
    'remote',
    'period',
    'skill',
    'status',
    'minimum',
    'sort'
  ].forEach(id => {

    const element = $(id);

    if (element) {
      element.addEventListener(
        'change',
        render
      );
    }

  });


  /* Saved toggle */

  const savedToggle =
    $('savedToggle');

  if (savedToggle) {

    savedToggle.addEventListener(
      'click',
      () => {

        showSavedOnly =
          !showSavedOnly;

        updateSavedUI();
        render();
      }
    );

  }


  /* Export */

  const exportButton =
    $('exportSaved');

  if (exportButton) {

    exportButton.addEventListener(
      'click',
      exportSavedJobs
    );

  }


  /* Reset */

  const reset =
    $('reset');

  if (reset) {

    reset.addEventListener(
      'click',
      resetFilters
    );

  }


  /* Result buttons */

  const results =
    $('results');

  if (results) {

    results.addEventListener(
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
          findJobById(id);

        if (!job) {
          return;
        }


        if (action === 'save') {
          toggleSaved(job);
          return;
        }


        if (action === 'details') {
          openJobModal(job);
          return;
        }


        if (action === 'why') {
          showWhyThisJob(job);
          return;
        }

      }
    );


    results.addEventListener(
      'change',
      event => {

        const select =
          event.target.closest(
            '[data-action="status"]'
          );

        if (!select) {
          return;
        }

        const id =
          select.dataset.id;

        const job =
          findJobById(id);

        if (!job) {
          return;
        }

        setApplicationStatus(
          job,
          select.value
        );
      }
    );

  }


  /* Agent button */

  document.addEventListener(
    'click',
    event => {

      const button =
        event.target.closest(
          '#agentAnalyze'
        );

      if (!button) {
        return;
      }

      const id =
        button.dataset.agentId;

      const job =
        findJobById(id);

      if (job) {
        openJobModal(job);
      }

    }
  );


  /* Modal close */

  const modalClose =
    $('modalClose');

  if (modalClose) {

    modalClose.addEventListener(
      'click',
      closeModal
    );

  }


  const modal =
    $('jobModal');

  if (modal) {

    modal.addEventListener(
      'click',
      event => {

        if (
          event.target === modal
        ) {
          closeModal();
        }

      }
    );

  }


  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Escape'
      ) {
        closeModal();
      }

    }
  );
}


/* =========================================================
   LOAD JOB DATA
   ========================================================= */

async function loadJobs() {

  const notice =
    $('notice');

  try {

    if (notice) {
      notice.textContent =
        'Loading real job data...';
    }


    const response =
      await fetch(
        DATA_URL,
        {
          cache: 'no-store'
        }
      );


    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    const jobs =
      Array.isArray(data)
        ? data
        : Array.isArray(data.jobs)
          ? data.jobs
          : [];


    allJobs =
      jobs.filter(
        job =>
          job &&
          typeof job === 'object'
      );


    if (notice) {

      notice.textContent =
        `${allJobs.length} real job opportunities loaded.`;

    }

  } catch (error) {

    console.error(
      'Job Radar data loading failed:',
      error
    );


    allJobs = [];


    if (notice) {

      notice.textContent =
        'Unable to load job data. Please refresh the page.';

    }

  }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {

  loadLocalState();

  await loadJobs();

  populateFilters();

  bindEvents();

  updateSavedUI();

  render();
}


/* =========================================================
   START APP
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
   PART 5 END
   ========================================================= */