/* =========================================================
   JOB RADAR — MAIN APP
   PART 1 / 5
   DATA + PROFILE + CORE HELPERS
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
   DOM
   ========================================================= */

const $ = id =>
  document.getElementById(id);


/* =========================================================
   HELPERS
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
    values.filter(
      value =>
        value !== null &&
        value !== undefined &&
        value !== ''
    )
  )];
}


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
      localStorage.getItem(
        STORAGE_KEYS.savedJobs
      ) || '[]'
    );

    savedJobs = new Set(
      Array.isArray(saved)
        ? saved
        : []
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
   JOB FIELDS
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


/* =========================================================
   LOCATION
   ========================================================= */

function normalizeLocation(value) {

  return normalize(value)
    .replace(/\btn\b/g, 'tamil nadu')
    .replace(/\bin\b/g, 'india')
    .replace(
      /\bbengaluru\b/g,
      'bangalore'
    );
}


function locationMatches(
  jobLocation,
  selectedLocation
) {

  if (!selectedLocation) {
    return true;
  }

  const jobValue =
    normalizeLocation(jobLocation);

  const selectedValue =
    normalizeLocation(selectedLocation);

  if (
    jobValue === selectedValue
  ) {
    return true;
  }

  return (
    jobValue.includes(selectedValue) ||
    selectedValue.includes(jobValue)
  );
}


/* =========================================================
   JOB TYPE
   ========================================================= */

function normalizeJobType(value) {

  const type =
    normalize(value);

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

  if (!selectedType) {
    return true;
  }

  return (
    normalizeJobType(jobType) ===
    normalizeJobType(selectedType)
  );
}


/* =========================================================
   REMOTE
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
   SKILLS
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
        haystack.includes(
          'internet of things'
        )
      );
    }

    return haystack.includes(skill);
  });
}


/* =========================================================
   PERSONAL MATCH
   ========================================================= */

function calculatePersonalMatch(job) {

  const skills =
    getJobSkills(job);

  const title =
    normalize(getJobTitle(job));

  const description =
    normalize(getDescription(job));

  const location =
    normalizeLocation(
      getLocation(job)
    );

  let score = 0;

  const matchedSkills = [];
  const reasons = [];


  const earlyLevel =
    /intern|internship|trainee|fresher|entry[\s-]?level|graduate/
      .test(
        `${title} ${description}`
      );


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


  PROFILE_SKILLS.forEach(
    skill => {

      if (skills.includes(skill)) {
        matchedSkills.push(skill);
      }
    }
  );


  score += Math.min(
    30,
    matchedSkills.length * 6
  );


  if (matchedSkills.length) {

    reasons.push(
      `${matchedSkills.length} relevant skill${
        matchedSkills.length > 1
          ? 's'
          : ''
      } matched`
    );
  }


  if (
    /coimbatore|tamil nadu|chennai|bengaluru|bangalore|india/
      .test(location)
  ) {

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


  const fullText =
    normalize(
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
  ].filter(
    skill =>
      fullText.includes(skill) &&
      !matchedSkills.includes(skill)
  );


  return {
    score: Math.min(
      100,
      score
    ),

    matchedSkills:
      unique(matchedSkills),

    missingSkills:
      unique(missingSkills),

    reasons
  };
}


/* =========================================================
   SCORE
   ========================================================= */

function calculateScore(job) {

  const value =
    Number(job.score);

  if (
    Number.isFinite(value)
  ) {
    return value;
  }

  return calculatePersonalMatch(
    job
  ).score;
}


/* =========================================================
   PART 1 END
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

  const value =
    normalize(
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
    .replace(
      /[^a-z0-9+#.\s-]/g,
      ' '
    )
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
      haystack.includes(
        'internet of things'
      )
    );
  }


  if (token === 'js') {

    return haystack.includes(
      'javascript'
    );
  }


  if (token === 'ai') {

    return (
      haystack.includes('ai') ||
      haystack.includes(
        'artificial intelligence'
      )
    );
  }


  if (token === 'ml') {

    return (
      haystack.includes('ml') ||
      haystack.includes(
        'machine learning'
      )
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

  const query =
    normalize(value);

  if (!query) {
    return true;
  }


  const haystack =
    normalize([
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


  const tokens =
    searchTokens(query);


  if (!tokens.length) {
    return true;
  }


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

  const raw =
    getDate(job);

  if (!raw) {
    return 'unknown';
  }


  const date =
    new Date(raw);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'unknown';
  }


  const now =
    new Date();


  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );


  const posted =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );


  const diffDays =
    Math.floor(
      (today - posted) /
      86400000
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


  const bucket =
    dateBucket(job);


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


  if (
    selected === 'unknown date'
  ) {

    return bucket === 'unknown';
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


  const score =
    calculateScore(job);


  const match =
    selected.match(
      /(\d+)/
    );


  if (!match) {
    return true;
  }


  return (
    score >=
    Number(match[1])
  );
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


  const id =
    jobId(job);


  const current =
    applicationStatus[id] ||
    'Not Applied';


  if (
    selected === 'saved'
  ) {

    return savedJobs.has(id);
  }


  if (
    selected === 'not-tracked' ||
    selected === 'not tracked' ||
    selected === 'not applied' ||
    selected === 'not-applied'
  ) {

    return (
      current === 'Not Applied'
    );
  }


  return (
    normalize(current) ===
    normalize(selected)
  );
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

      if (
        !matchesSearch(
          job,
          search
        )
      ) {
        return false;
      }


      if (
        location &&
        !locationMatches(
          getLocation(job),
          location
        )
      ) {
        return false;
      }


      if (
        jobType &&
        !jobTypeMatches(
          getJobType(job),
          jobType
        )
      ) {
        return false;
      }


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


      if (
        !postedMatches(
          job,
          period
        )
      ) {
        return false;
      }


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


      if (
        !statusMatches(
          job,
          status
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
   PART 2 END
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


  /* Oldest */

  if (
    value === 'oldest' ||
    value === 'oldest posting'
  ) {

    return copy.sort(
      (a, b) => {

        const dateA =
          new Date(
            getDate(a)
          ).getTime();


        const dateB =
          new Date(
            getDate(b)
          ).getTime();


        if (
          Number.isNaN(dateA) &&
          Number.isNaN(dateB)
        ) {
          return 0;
        }


        if (
          Number.isNaN(dateA)
        ) {
          return 1;
        }


        if (
          Number.isNaN(dateB)
        ) {
          return -1;
        }


        return dateA - dateB;
      }
    );
  }


  /* Newest */

  return copy.sort(
    (a, b) => {

      const dateA =
        new Date(
          getDate(a)
        ).getTime();


      const dateB =
        new Date(
          getDate(b)
        ).getTime();


      if (
        Number.isNaN(dateA) &&
        Number.isNaN(dateB)
      ) {

        return (
          calculateScore(b) -
          calculateScore(a)
        );
      }


      if (
        Number.isNaN(dateA)
      ) {
        return 1;
      }


      if (
        Number.isNaN(dateB)
      ) {
        return -1;
      }


      return dateB - dateA;
    }
  );
}


/* =========================================================
   SAVED JOBS
   ========================================================= */

function toggleSaved(id) {

  if (!id) {
    return;
  }


  if (
    savedJobs.has(id)
  ) {

    savedJobs.delete(id);

  } else {

    savedJobs.add(id);
  }


  saveLocalState();

  updateSavedUI();

  render();

  updateAgent(
    getBestOpportunity()
  );
}


/* =========================================================
   SAVED UI
   ========================================================= */

function updateSavedUI() {

  const button =
    $('savedToggle');


  const count =
    $('savedCount');


  if (count) {

    count.textContent =
      String(
        savedJobs.size
      );
  }


  if (button) {

    button.setAttribute(
      'aria-pressed',
      String(
        showSavedOnly
      )
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

function getApplicationStatus(job) {

  return (
    applicationStatus[
      jobId(job)
    ] ||
    'Not Applied'
  );
}


function setApplicationStatus(
  job,
  status
) {

  applicationStatus[
    jobId(job)
  ] = status;


  saveLocalState();

  render();

  updateAgent(
    getBestOpportunity()
  );
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
    return 'Fresh today';
  }


  if (
    bucket === 'week'
  ) {
    return 'This week';
  }


  if (
    bucket === 'month'
  ) {
    return 'This month';
  }


  if (
    bucket === 'older'
  ) {
    return 'Older';
  }


  return 'Date unknown';
}


/* =========================================================
   INSIGHTS
   ========================================================= */

function updateInsights(jobs) {

  const saved =
    jobs.filter(
      job =>
        savedJobs.has(
          jobId(job)
        )
    );


  const remote =
    jobs.filter(
      job =>
        isRemote(job)
    );


  const highScore =
    jobs.filter(
      job =>
        calculateScore(job) >= 80
    );


  const applications =
    Object.values(
      applicationStatus
    ).filter(
      status =>
        normalize(status) !==
        'not applied'
    );


  if (
    $('insightSaved')
  ) {

    $('insightSaved')
      .textContent =
      String(
        saved.length
      );
  }


  if (
    $('insightRemote')
  ) {

    $('insightRemote')
      .textContent =
      String(
        remote.length
      );
  }


  if (
    $('insightHighScore')
  ) {

    $('insightHighScore')
      .textContent =
      String(
        highScore.length
      );
  }


  if (
    $('insightApplications')
  ) {

    $('insightApplications')
      .textContent =
      String(
        applications.length
      );
  }


  updateTopSkills(jobs);
}


/* =========================================================
   TOP SKILLS
   ========================================================= */

function updateTopSkills(jobs) {

  const counts = {};


  jobs.forEach(
    job => {

      getJobSkills(job)
        .forEach(
          skill => {

            counts[skill] =
              (counts[skill] || 0) + 1;
          }
        );
    }
  );


  const top =
    Object.entries(counts)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 6);


  const element =
    $('topSkills');


  if (!element) {
    return;
  }


  if (!top.length) {

    element.innerHTML =
      '<span>No skill data yet.</span>';

    return;
  }


  element.innerHTML =
    top
      .map(
        ([skill, count]) =>
          `<span>${escapeHTML(skill)} · ${count}</span>`
      )
      .join('');
}


/* =========================================================
   PART 3 END
   ========================================================= *//* =========================================================
   JOB RADAR — PART 4 / 5
   AGENT + JOB CARDS + MODAL
   ========================================================= */


/* =========================================================
   BEST OPPORTUNITY
   ========================================================= */

function getBestOpportunity() {

  const jobs =
    getFilteredJobs();

  if (!jobs.length) {
    return null;
  }

  return [...jobs].sort(
    (a, b) => {

      const matchA =
        calculatePersonalMatch(a).score;

      const matchB =
        calculatePersonalMatch(b).score;

      if (matchB !== matchA) {
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
   AGENT UPDATE
   ========================================================= */

function updateAgent(job) {

  const panel =
    $('agentPanel');

  if (!panel) {
    return;
  }

  const title =
    $('agentJobTitle');

  const company =
    $('agentCompany');

  const match =
    $('agentMatch');

  const matched =
    $('agentMatchedSkills');

  const missing =
    $('agentMissingSkills');

  const next =
    $('agentNextAction');


  if (!job) {

    if (title) {
      title.textContent =
        'No matching opportunity';
    }

    if (company) {
      company.textContent =
        'Try changing your filters';
    }

    if (match) {
      match.textContent =
        '--';
    }

    if (matched) {
      matched.innerHTML =
        '<span>No match available</span>';
    }

    if (missing) {
      missing.innerHTML =
        '<span>No data</span>';
    }

    if (next) {
      next.textContent =
        'Adjust your search or filters.';
    }

    return;
  }


  const result =
    calculatePersonalMatch(job);


  lastAnalyzedJobId =
    jobId(job);


  if (title) {
    title.textContent =
      getJobTitle(job);
  }


  if (company) {
    company.textContent =
      getCompany(job);
  }


  if (match) {
    match.textContent =
      `${result.score}%`;
  }


  if (matched) {

    matched.innerHTML =
      result.matchedSkills.length
        ? result.matchedSkills
            .map(
              skill =>
                `<span>${escapeHTML(skill)}</span>`
            )
            .join('')
        : '<span>No direct skill match</span>';
  }


  if (missing) {

    missing.innerHTML =
      result.missingSkills.length
        ? result.missingSkills
            .map(
              skill =>
                `<span>${escapeHTML(skill)}</span>`
            )
            .join('')
        : '<span>No major skill gap</span>';
  }


  if (next) {

    if (
      result.missingSkills.length
    ) {

      next.textContent =
        `Explore ${result.missingSkills
          .slice(0, 2)
          .join(' and ')} basics, then review the requirements.`;

    } else {

      next.textContent =
        'Review the requirements and consider applying.';
    }
  }
}


/* =========================================================
   JOB CARD
   ========================================================= */

function jobCard(job) {

  const id =
    jobId(job);

  const score =
    calculateScore(job);

  const match =
    calculatePersonalMatch(job);

  const saved =
    savedJobs.has(id);

  const status =
    getApplicationStatus(job);

  const link =
    safeLink(
      job.job_url ||
      job.url
    );


  const matchedSkills =
    match.matchedSkills.length
      ? match.matchedSkills
      : getJobSkills(job)
          .filter(
            skill =>
              PROFILE_SKILLS.includes(
                skill
              )
          );


  const missingSkills =
    match.missingSkills;


  const matchedHTML =
    matchedSkills.length
      ? matchedSkills
          .slice(0, 6)
          .map(
            skill =>
              `<span>${escapeHTML(skill)}</span>`
          )
          .join('')
      : '<span>None detected</span>';


  const missingHTML =
    missingSkills.length
      ? missingSkills
          .slice(0, 4)
          .map(
            skill =>
              `<span>${escapeHTML(skill)}</span>`
          )
          .join('')
      : '<span>None detected</span>';


  return `
    <article
      class="job-card"
      data-job-id="${escapeHTML(id)}">

      <div class="job-card-top">

        <div>

          <span class="job-source">
            ${escapeHTML(getSource(job))}
          </span>

          <h3 class="job-title">
            ${escapeHTML(getJobTitle(job))}
          </h3>

          <p class="job-company">
            ${escapeHTML(getCompany(job))}
          </p>

        </div>


        <div class="job-score">

          <strong>
            ${score}%
          </strong>

          <span>
            Match
          </span>

        </div>

      </div>


      <div class="job-meta">

        <span>
          ${escapeHTML(getLocation(job))}
        </span>

        <span>
          ${isRemote(job)
            ? 'Remote'
            : 'Not marked remote'}
        </span>

        <span>
          ${escapeHTML(getJobType(job))}
        </span>

        <span>
          ${escapeHTML(
            getFreshness(job)
          )}
        </span>

      </div>


      <div class="job-skill-section">

        <div class="job-skill-group">

          <div class="job-skill-label">
            Matching skills
          </div>

          <div class="job-skills">
            ${matchedHTML}
          </div>

        </div>


        <div class="job-skill-group">

          <div class="job-skill-label">
            Skills to explore
          </div>

          <div class="job-skills">
            ${missingHTML}
          </div>

        </div>

      </div>


      <div class="job-card-footer">

        <button
          class="job-button job-details-button"
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
          class="job-button save-button"
          data-action="save"
          data-id="${escapeHTML(id)}"
          type="button">
          ${saved
            ? 'Saved'
            : 'Save'}
        </button>


        <select
          class="job-status-select"
          data-action="status"
          data-id="${escapeHTML(id)}"
          aria-label="Application status">

          <option
            value="Not Applied"
            ${status === 'Not Applied'
              ? 'selected'
              : ''}>
            Not Applied
          </option>

          <option
            value="Applied"
            ${status === 'Applied'
              ? 'selected'
              : ''}>
            Applied
          </option>

          <option
            value="Interview"
            ${status === 'Interview'
              ? 'selected'
              : ''}>
            Interview
          </option>

          <option
            value="Closed"
            ${status === 'Closed'
              ? 'selected'
              : ''}>
            Closed
          </option>

        </select>


        <a
          class="apply-button"
          href="${escapeHTML(link)}"
          target="_blank"
          rel="noopener noreferrer">
          Open Job
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
    getFilteredJobs();

  const sorted =
    sortJobs(filtered);


  if (
    $('resultCount')
  ) {

    $('resultCount')
      .textContent =
      `${sorted.length} jobs`;
  }


  if (!sorted.length) {

    results.innerHTML = `
      <div class="empty-state">

        <h3>
          No matching jobs found
        </h3>

        <p>
          Try clearing a filter or changing your search.
        </p>

      </div>
    `;

  } else {

    results.innerHTML =
      sorted
        .map(jobCard)
        .join('');
  }


  updateSummary(sorted);

  updateInsights(
    allJobs
  );

  updateSavedUI();

  updateAgent(
    getBestOpportunity()
  );
}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary(jobs) {

  const total =
    $('total');

  const recent =
    $('recent');

  const sources =
    $('sources');


  if (total) {
    total.textContent =
      String(
        allJobs.length
      );
  }


  if (recent) {

    recent.textContent =
      String(
        allJobs.filter(
          job =>
            dateBucket(job) ===
            'today'
        ).length
      );
  }


  if (sources) {

    const sourceCount =
      new Set(
        allJobs.map(
          job =>
            getSource(job)
        )
      ).size;

    sources.textContent =
      String(sourceCount);
  }
}


/* =========================================================
   JOB DETAILS MODAL
   ========================================================= */

function openJobModal(job) {

  const modal =
    $('jobModal');

  const content =
    $('modalContent');


  if (
    !modal ||
    !content
  ) {
    return;
  }


  content.innerHTML = `

    <div class="modal-header-content">

      <span class="modal-source">
        ${escapeHTML(
          getSource(job)
        )}
      </span>

      <h2>
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
        <strong>Match</strong>
        <span>
          ${calculateScore(job)}%
        </span>
      </div>

      <div>
        <strong>Location</strong>
        <span>
          ${escapeHTML(
            getLocation(job)
          )}
        </span>
      </div>

      <div>
        <strong>Type</strong>
        <span>
          ${escapeHTML(
            getJobType(job)
          )}
        </span>
      </div>

      <div>
        <strong>Work mode</strong>
        <span>
          ${isRemote(job)
            ? 'Remote'
            : 'Not marked remote'}
        </span>
      </div>

    </div>


    <section class="modal-section">

      <h3>
        Description
      </h3>

      <p class="modal-description">
        ${escapeHTML(
          getDescription(job)
        )}
      </p>

    </section>


    <section class="modal-section">

      <h3>
        Skills
      </h3>

      <div class="modal-tags">

        ${
          getJobSkills(job)
            .slice(0, 15)
            .map(
              skill =>
                `<span>${escapeHTML(skill)}</span>`
            )
            .join('')
          ||
          '<span>No skill data available</span>'
        }

      </div>

    </section>


    <div class="modal-actions">

      <button
        class="job-button"
        id="modalSaveButton"
        type="button">

        ${
          savedJobs.has(jobId(job))
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
        rel="noopener noreferrer">

        Open Job

      </a>

    </div>
  `;


  modal.hidden = false;


  const saveButton =
    $('modalSaveButton');


  if (saveButton) {

    saveButton.onclick =
      () => {

        toggleSaved(
          jobId(job)
        );

        openJobModal(job);
      };
  }
}


/* =========================================================
   WHY THIS JOB
   ========================================================= */

function showWhyThisJob(job) {

  const modal =
    $('jobModal');

  const content =
    $('modalContent');


  if (
    !modal ||
    !content
  ) {
    return;
  }


  const result =
    calculatePersonalMatch(job);


  const matchedHTML =
    result.matchedSkills.length
      ? result.matchedSkills
          .map(
            skill =>
              `<span>${escapeHTML(skill)}</span>`
          )
          .join('')
      : '<span>No direct skill match detected</span>';


  const missingHTML =
    result.missingSkills.length
      ? result.missingSkills
          .map(
            skill =>
              `<span>${escapeHTML(skill)}</span>`
          )
          .join('')
      : '<span>No major skill gap detected</span>';


  const reasonsHTML =
    result.reasons.length
      ? result.reasons
          .map(
            reason =>
              `<li>${escapeHTML(reason)}</li>`
          )
          .join('')
      : '<li>Limited match information available.</li>';


  const nextAction =
    result.missingSkills.length
      ? `Explore ${result.missingSkills
          .slice(0, 2)
          .join(' and ')} basics, then review the requirements.`
      : 'Review the requirements and consider applying.';


  content.innerHTML = `

    <div class="modal-header-content">

      <span class="modal-source">
        JOB RADAR AGENT
      </span>

      <h2>
        Why am I seeing this job?
      </h2>

      <p>
        ${escapeHTML(
          getJobTitle(job)
        )}
      </p>

      <p>
        ${escapeHTML(
          getCompany(job)
        )}
      </p>

    </div>


    <div class="modal-grid">

      <div>
        <strong>Personal Match</strong>
        <span>
          ${result.score}%
        </span>
      </div>

      <div>
        <strong>Location</strong>
        <span>
          ${escapeHTML(
            getLocation(job)
          )}
        </span>
      </div>

      <div>
        <strong>Source</strong>
        <span>
          ${escapeHTML(
            getSource(job)
          )}
        </span>
      </div>

      <div>
        <strong>Work Mode</strong>
        <span>
          ${isRemote(job)
            ? 'Remote'
            : 'Not marked remote'}
        </span>
      </div>

    </div>


    <section class="modal-section">

      <h3>
        Why this matches
      </h3>

      <ul>
        ${reasonsHTML}
      </ul>

    </section>


    <section class="modal-section">

      <h3>
        Matching skills
      </h3>

      <div class="modal-tags">
        ${matchedHTML}
      </div>

    </section>


    <section class="modal-section">

      <h3>
        Skills to explore
      </h3>

      <div class="modal-tags">
        ${missingHTML}
      </div>

    </section>


    <section class="modal-section">

      <h3>
        Agent next action
      </h3>

      <p class="modal-description">
        ${escapeHTML(nextAction)}
      </p>

    </section>


    <div class="modal-actions">

      <button
        class="job-button"
        id="whySaveButton"
        type="button">

        ${
          savedJobs.has(jobId(job))
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
        rel="noopener noreferrer">

        Open Job

      </a>

    </div>
  `;


  modal.hidden = false;


  const saveButton =
    $('whySaveButton');


  if (saveButton) {

    saveButton.onclick =
      () => {

        toggleSaved(
          jobId(job)
        );

        showWhyThisJob(job);
      };
  }
}


/* =========================================================
   MODAL CLOSE
   ========================================================= */

function closeModal() {

  const modal =
    $('jobModal');

  if (modal) {
    modal.hidden = true;
  }
}


/* =========================================================
   PART 4 END
   ========================================================= *//* =========================================================
   JOB RADAR — PART 5 / 5
   EVENTS + RESET + EXPORT + DATA LOAD + INIT
   ========================================================= */


/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetFilters() {

  const ids = [
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


  ids.forEach(id => {

    const element =
      $(id);

    if (!element) {
      return;
    }


    if (id === 'sort') {

      element.value =
        'newest';

    } else {

      element.value =
        'all';
    }
  });


  const search =
    $('search');

  if (search) {
    search.value = '';
  }


  showSavedOnly = false;

  updateSavedUI();

  render();
}


/* =========================================================
   EXPORT SAVED JOBS
   ========================================================= */

function exportSavedJobs() {

  const saved =
    allJobs.filter(
      job =>
        savedJobs.has(
          jobId(job)
        )
    );


  if (!saved.length) {

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
    'Status',
    'Job URL'
  ];


  const rows =
    saved.map(
      job => [

        getJobTitle(job),

        getCompany(job),

        getLocation(job),

        getSource(job),

        calculateScore(job),

        getApplicationStatus(job),

        job.job_url ||
        job.url ||
        ''

      ]
    );


  const csv = [
    header,
    ...rows
  ]
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


  link.href = url;

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
   POPULATE FILTERS
   ========================================================= */

function populateFilters() {

  populateSelect(
    'location',
    allJobs.map(
      job =>
        getLocation(job)
    ),
    'All locations'
  );


  populateSelect(
    'jobType',
    allJobs.map(
      job =>
        getJobType(job)
    ),
    'All types'
  );


  populateSelect(
    'skill',
    allJobs.flatMap(
      job =>
        getJobSkills(job)
    ),
    'All skills'
  );
}


function populateSelect(
  id,
  values,
  firstLabel
) {

  const select =
    $(id);

  if (!select) {
    return;
  }


  const oldValue =
    select.value;


  const uniqueValues =
    unique(values)
      .sort(
        (a, b) =>
          text(a).localeCompare(
            text(b)
          )
      );


  select.innerHTML = '';


  const first =
    document.createElement(
      'option'
    );


  first.value = 'all';

  first.textContent =
    firstLabel;


  select.appendChild(
    first
  );


  uniqueValues.forEach(
    value => {

      const option =
        document.createElement(
          'option'
        );

      option.value =
        value;

      option.textContent =
        value;

      select.appendChild(
        option
      );
    }
  );


  if (
    [...select.options]
      .some(
        option =>
          option.value ===
          oldValue
      )
  ) {

    select.value =
      oldValue;
  }
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


      element.addEventListener(
        'input',
        render
      );


      element.addEventListener(
        'change',
        render
      );
    }
  );


  /* Saved Jobs */

  const savedToggle =
    $('savedToggle');


  if (savedToggle) {

    savedToggle.addEventListener(
      'click',
      event => {

        event.preventDefault();

        event.stopPropagation();

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

        const target =
          event.target.closest(
            '[data-action]'
          );


        if (!target) {
          return;
        }


        const action =
          target.dataset.action;


        const id =
          target.dataset.id;


        const job =
          allJobs.find(
            item =>
              jobId(item) === id
          );


        if (!job) {
          return;
        }


        if (
          action === 'save'
        ) {

          toggleSaved(id);

          return;
        }


        if (
          action === 'details'
        ) {

          openJobModal(job);

          return;
        }


        if (
          action === 'why'
        ) {

          showWhyThisJob(job);

          return;
        }
      }
    );


    results.addEventListener(
      'change',
      event => {

        const target =
          event.target;


        if (
          !target.matches(
            '[data-action="status"]'
          )
        ) {
          return;
        }


        const id =
          target.dataset.id;


        const job =
          allJobs.find(
            item =>
              jobId(item) === id
          );


        if (!job) {
          return;
        }


        setApplicationStatus(
          job,
          target.value
        );
      }
    );
  }


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
          event.target ===
          modal
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
        'Loading live job data...';
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


    if (
      Array.isArray(data)
    ) {

      allJobs = data;

    } else if (
      Array.isArray(
        data.jobs
      )
    ) {

      allJobs =
        data.jobs;

    } else {

      allJobs = [];
    }


    if (notice) {

      notice.textContent =
        `${allJobs.length} jobs loaded`;
    }


  } catch (error) {

    console.error(
      'Job Radar data error:',
      error
    );


    allJobs = [];


    if (notice) {

      notice.textContent =
        'Unable to load current job data.';
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

document.addEventListener(
  'DOMContentLoaded',
  init
);


/* =========================================================
   PART 5 END
   ========================================================= */