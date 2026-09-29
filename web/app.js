'use strict';

/* =========================================================
   JOB RADAR - APP.JS
   PART 1 / 4
   ========================================================= */

const DATA_URL = '/data/processed_jobs.json';

const SAVED_KEY = 'jobRadarSavedJobs';
const STATUS_KEY = 'jobRadarApplicationStatus';


/* =========================================================
   PROFILE SKILLS
   ========================================================= */

const PROFILE_SKILLS = [
  'Python',
  'Java',
  'JavaScript',
  'HTML',
  'CSS',
  'SQL',
  'MySQL',
  'C',
  'C++',
  'Git',
  'GitHub',
  'React',
  'Node.js',
  'Firebase',
  'Arduino',
  'ESP32',
  'Raspberry Pi',
  'IoT',
  'AWS',
  'Docker'
];


/* =========================================================
   JOB SKILLS
   ========================================================= */

const JOB_SKILL_POOL = [
  'Python',
  'Java',
  'JavaScript',
  'TypeScript',
  'HTML',
  'CSS',
  'SQL',
  'MySQL',
  'PostgreSQL',
  'MongoDB',
  'C',
  'C++',
  'C#',
  'Git',
  'GitHub',
  'GitLab',
  'React',
  'Angular',
  'Vue',
  'Node.js',
  'Express',
  'Django',
  'Flask',
  'FastAPI',
  'Firebase',
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Linux',
  'REST API',
  'GraphQL',
  'Machine Learning',
  'Deep Learning',
  'TensorFlow',
  'PyTorch',
  'Pandas',
  'NumPy',
  'OpenCV',
  'Arduino',
  'ESP32',
  'Raspberry Pi',
  'IoT',
  'Embedded Systems',
  'Figma',
  'Power BI',
  'Tableau'
];


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let allJobs = [];

let savedJobs = new Set();

let applicationStatus = new Map();

let showSavedOnly = false;


/* =========================================================
   ELEMENT HELPER
   ========================================================= */

function element(
  tag,
  className = '',
  text = ''
) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (
    text !== undefined &&
    text !== null
  ) {
    node.textContent = text;
  }

  return node;
}


/* =========================================================
   SAFE LINK
   ========================================================= */

function safeLink(value) {
  try {
    const url = new URL(value);

    if (
      !['http:', 'https:'].includes(
        url.protocol
      )
    ) {
      return null;
    }

    if (
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.href;

  } catch {
    return null;
  }
}


/* =========================================================
   JOB ID
   ========================================================= */

function jobId(job) {
  return String(
    job.id ||
    job.job_url ||
    `${job.title || ''}|${job.company || ''}|${job.location || ''}`
  );
}


/* =========================================================
   LOAD SAVED JOBS
   ========================================================= */

function loadSavedJobs() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(
        SAVED_KEY
      ) || '[]'
    );

    savedJobs = new Set(
      Array.isArray(stored)
        ? stored.map(String)
        : []
    );

  } catch {
    savedJobs = new Set();
  }
}


/* =========================================================
   SAVE SAVED JOBS
   ========================================================= */

function persistSavedJobs() {
  try {
    localStorage.setItem(
      SAVED_KEY,
      JSON.stringify(
        [...savedJobs]
      )
    );
  } catch {}
}


/* =========================================================
   APPLICATION STATUS
   ========================================================= */

function loadApplicationStatus() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(
        STATUS_KEY
      ) || '{}'
    );

    applicationStatus = new Map(
      Object.entries(stored)
    );

  } catch {
    applicationStatus = new Map();
  }
}


function persistApplicationStatus() {
  try {
    localStorage.setItem(
      STATUS_KEY,
      JSON.stringify(
        Object.fromEntries(
          applicationStatus
        )
      )
    );
  } catch {}
}


function getApplicationStatus(job) {
  return (
    applicationStatus.get(
      jobId(job)
    ) || 'not-tracked'
  );
}


function setApplicationStatus(
  job,
  status
) {
  const id = jobId(job);

  if (
    !status ||
    status === 'not-tracked'
  ) {
    applicationStatus.delete(id);
  } else {
    applicationStatus.set(
      id,
      status
    );
  }

  persistApplicationStatus();

  updateInsights();

  render();
}


/* =========================================================
   SAVE / UNSAVE
   ========================================================= */

function toggleSavedJob(job) {
  const id = jobId(job);

  if (savedJobs.has(id)) {
    savedJobs.delete(id);
  } else {
    savedJobs.add(id);
  }

  persistSavedJobs();

  updateSavedUI();

  updateInsights();

  render();
}


/* =========================================================
   SKILL DETECTION
   ========================================================= */

function skillMentioned(
  text,
  skill
) {
  const value = String(
    text || ''
  ).toLowerCase();

  const target = String(
    skill || ''
  ).toLowerCase();

  if (!value || !target) {
    return false;
  }

  if (target === 'c++') {
    return /\bc\+\+\b/i.test(value);
  }

  if (target === 'c#') {
    return /\bc#\b/i.test(value);
  }

  return value.includes(target);
}


function getJobText(job) {
  return [
    job.title,
    job.company,
    job.description,
    job.location,
    job.job_type,
    ...(Array.isArray(
      job.matched_skills
    )
      ? job.matched_skills
      : [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}


function extractMentionedSkills(job) {
  const text = getJobText(job);

  return JOB_SKILL_POOL.filter(
    skill =>
      skillMentioned(
        text,
        skill
      )
  );
}


function getJobSkills(job) {
  const detected =
    extractMentionedSkills(job);

  const stored =
    Array.isArray(
      job.matched_skills
    )
      ? job.matched_skills
      : [];

  return [
    ...new Set(
      [
        ...stored,
        ...detected
      ]
        .filter(Boolean)
        .map(String)
    )
  ];
}


/* =========================================================
   PERSONAL MATCH
   ========================================================= */

function calculatePersonalMatch(job) {

  const jobSkills =
    getJobSkills(job);

  const matched =
    PROFILE_SKILLS.filter(
      profileSkill =>
        jobSkills.some(
          jobSkill =>
            jobSkill.toLowerCase() ===
            profileSkill.toLowerCase()
        )
    );

  const missing =
    jobSkills.filter(
      jobSkill =>
        !PROFILE_SKILLS.some(
          profileSkill =>
            profileSkill.toLowerCase() ===
            jobSkill.toLowerCase()
        )
    );

  let skillScore = 0;

  if (jobSkills.length) {
    skillScore =
      Math.round(
        (
          matched.length /
          jobSkills.length
        ) * 60
      );
  }

  const title =
    String(
      job.title || ''
    ).toLowerCase();

  let roleScore = 0;

  if (
    /intern|internship|trainee|fresher|entry.?level|graduate/
      .test(title)
  ) {
    roleScore = 25;
  }

  let contextScore = 0;

  if (job.is_remote) {

    contextScore = 15;

  } else if (
    /india|tamil nadu|coimbatore|chennai|bengaluru|bangalore/
      .test(
        String(
          job.location || ''
        ).toLowerCase()
      )
  ) {
    contextScore = 15;
  }

  const score =
    Math.min(
      100,
      skillScore +
      roleScore +
      contextScore
    );

  return {
    score,
    matched,
    missing
  };
}


/* =========================================================
   OPPORTUNITY AGENT
   ========================================================= */

function getBestOpportunity() {

  if (!allJobs.length) {
    return null;
  }

  const ranked =
    [...allJobs].sort(
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
          Number(b.score || 0) -
          Number(a.score || 0)
        );
      }
    );

  return ranked[0] || null;
}


/* =========================================================
   UPDATE AGENT
   ========================================================= */

function updateAgent(job) {

  const title =
    $('agentJobTitle');

  const company =
    $('agentCompany');

  const match =
    $('agentMatch');

  const matchedSkills =
    $('agentMatchedSkills');

  const missingSkills =
    $('agentMissingSkills');

  const nextAction =
    $('agentNextAction');

  const card =
    $('agentCard');


  if (!job) {

    if (title) {
      title.textContent =
        'No recommendation yet';
    }

    if (company) {
      company.textContent =
        'Analyze the available jobs to find your best match.';
    }

    if (match) {
      match.textContent =
        '--%';
    }

    if (matchedSkills) {

      matchedSkills.replaceChildren();

      matchedSkills.append(
        element(
          'span',
          'agent-empty',
          'Waiting for analysis'
        )
      );
    }

    if (missingSkills) {

      missingSkills.replaceChildren();

      missingSkills.append(
        element(
          'span',
          'agent-empty',
          'Waiting for analysis'
        )
      );
    }

    if (nextAction) {
      nextAction.textContent =
        'Tap Analyze Best Opportunity to see your personalized recommendation.';
    }

    if (card) {
      card.classList.remove(
        'agent-active'
      );
    }

    return;
  }


  const personal =
    calculatePersonalMatch(job);


  if (title) {
    title.textContent =
      job.title ||
      'Recommended opportunity';
  }


  if (company) {
    company.textContent =
      job.company ||
      'Company not provided';
  }


  if (match) {
    match.textContent =
      `${personal.score}%`;
  }


  if (matchedSkills) {

    matchedSkills.replaceChildren();

    if (personal.matched.length) {

      personal.matched
        .slice(0, 6)
        .forEach(skill => {

          matchedSkills.append(
            element(
              'span',
              'agent-tag matched',
              skill
            )
          );

        });

    } else {

      matchedSkills.append(
        element(
          'span',
          'agent-empty',
          'No direct skill match'
        )
      );
    }
  }


  if (missingSkills) {

    missingSkills.replaceChildren();

    if (personal.missing.length) {

      personal.missing
        .slice(0, 5)
        .forEach(skill => {

          missingSkills.append(
            element(
              'span',
              'agent-tag missing',
              skill
            )
          );

        });

    } else {

      missingSkills.append(
        element(
          'span',
          'agent-empty',
          'No major skill gap detected'
        )
      );
    }
  }


  if (nextAction) {

    if (personal.score >= 80) {

      nextAction.textContent =
        'Strong match found. Review the posting and consider applying.';

    } else if (
      personal.score >= 60
    ) {

      nextAction.textContent =
        'Good match found. Check the skill gap and review the posting.';

    } else {

      nextAction.textContent =
        'Opportunity found. Review the skill gap before deciding on this role.';
    }
  }


  if (card) {
    card.classList.add(
      'agent-active'
    );
  }
}


/* =========================================================
   ANALYZE BUTTON
   ========================================================= */

function analyzeBestOpportunity() {

  const button =
    $('agentAnalyze');

  if (button) {
    button.disabled = true;
    button.textContent =
      'Analyzing…';
  }


  if (!allJobs.length) {

    updateAgent(null);

    const nextAction =
      $('agentNextAction');

    if (nextAction) {
      nextAction.textContent =
        'No job data is loaded. Please refresh the page.';
    }

    if (button) {
      button.disabled = false;
      button.textContent =
        'Analyze Best Opportunity';
    }

    return;
  }


  const bestJob =
    getBestOpportunity();


  if (!bestJob) {

    const nextAction =
      $('agentNextAction');

    if (nextAction) {
      nextAction.textContent =
        'No suitable opportunity was found.';
    }

    if (button) {
      button.disabled = false;
      button.textContent =
        'Analyze Best Opportunity';
    }

    return;
  }


  updateAgent(bestJob);


  const agentPanel =
    $('agentPanel');

  if (agentPanel) {
    agentPanel.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }


  setTimeout(() => {

    if (button) {
      button.disabled = false;
      button.textContent =
        'Analyze Best Opportunity';
    }

  }, 500);
}


/* =========================================================
   PART 1 END
   ========================================================= *//* =========================================================
   PART 2 / 4
   SEARCH + FILTERS + INSIGHTS
   ========================================================= */

const controls = [
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


/* =========================================================
   DATE
   ========================================================= */

function dateBucket(dateValue) {

  if (!dateValue) {
    return 'Unknown date';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  const now = new Date();

  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const difference =
    startToday.getTime() -
    startDate.getTime();

  const oneDay =
    24 * 60 * 60 * 1000;

  const days =
    Math.floor(
      difference / oneDay
    );

  if (days <= 0) {
    return 'Today';
  }

  if (days <= 7) {
    return 'This Week';
  }

  if (days <= 30) {
    return 'This Month';
  }

  return 'Older';
}


function freshnessLabel(dateValue) {

  const bucket =
    dateBucket(dateValue);

  if (bucket === 'Today') {
    return 'Posted today';
  }

  if (bucket === 'This Week') {
    return 'Posted this week';
  }

  if (bucket === 'This Month') {
    return 'Posted this month';
  }

  if (bucket === 'Older') {
    return 'Older posting';
  }

  return 'Date unavailable';
}


/* =========================================================
   FILTER TEXT
   ========================================================= */

function matchesSearch(job, value) {

  if (!value) {
    return true;
  }

  const text = [
    job.title,
    job.company,
    job.location,
    job.description,
    job.source,
    ...(Array.isArray(job.matched_skills)
      ? job.matched_skills
      : [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes(
    value.toLowerCase()
  );
}


/* =========================================================
   FILTER JOBS
   ========================================================= */

function getFilteredJobs() {

  const search =
    $('search')?.value.trim() || '';

  const location =
    $('location')?.value || 'all';

  const jobType =
    $('jobType')?.value || 'all';

  const remote =
    $('remote')?.value || 'all';

  const period =
    $('period')?.value || 'all';

  const skill =
    $('skill')?.value || 'all';

  const status =
    $('status')?.value || 'all';

  const minimum =
    Number(
      $('minimum')?.value || 0
    );

  const sort =
    $('sort')?.value || 'newest';


  let jobs =
    allJobs.filter(job => {

      if (!matchesSearch(
        job,
        search
      )) {
        return false;
      }


      if (
        location !== 'all' &&
        String(
          job.location || ''
        ) !== location
      ) {
        return false;
      }


      if (
        jobType !== 'all' &&
        String(
          job.job_type || ''
        ) !== jobType
      ) {
        return false;
      }


      if (remote === 'remote' &&
          !job.is_remote) {
        return false;
      }


      if (remote === 'onsite' &&
          job.is_remote) {
        return false;
      }


      if (
        period !== 'all' &&
        dateBucket(
          job.date_posted
        ) !== period
      ) {
        return false;
      }


      if (skill !== 'all') {

        const skills =
          getJobSkills(job)
            .map(
              String
            );

        if (
          !skills.some(
            item =>
              item.toLowerCase() ===
              skill.toLowerCase()
          )
        ) {
          return false;
        }
      }


      if (
        status !== 'all' &&
        getApplicationStatus(job) !== status
      ) {
        return false;
      }


      if (
        Number(job.score || 0) <
        minimum
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
    });


  jobs.sort(
    (a, b) => {

      if (sort === 'score') {
        return (
          Number(b.score || 0) -
          Number(a.score || 0)
        );
      }


      const aDate =
        new Date(
          a.date_posted || 0
        ).getTime();

      const bDate =
        new Date(
          b.date_posted || 0
        ).getTime();


      if (sort === 'oldest') {
        return aDate - bDate;
      }

      return bDate - aDate;
    }
  );


  return jobs;
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

  const topSkills =
    $('topSkills');


  if (saved) {
    saved.textContent =
      savedJobs.size;
  }


  if (remote) {

    remote.textContent =
      allJobs.filter(
        job => Boolean(
          job.is_remote
        )
      ).length;
  }


  if (highScore) {

    highScore.textContent =
      allJobs.filter(
        job =>
          Number(
            job.score || 0
          ) >= 80
      ).length;
  }


  if (applications) {

    applications.textContent =
      allJobs.filter(
        job => {

          const status =
            getApplicationStatus(
              job
            );

          return (
            status === 'Applied' ||
            status === 'Interview'
          );
        }
      ).length;
  }


  if (topSkills) {

    const counts = {};

    allJobs.forEach(
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


    const sorted =
      Object.entries(counts)
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 8);


    topSkills.replaceChildren();


    if (!sorted.length) {

      topSkills.append(
        element(
          'span',
          'insight-muted',
          'No skills detected yet.'
        )
      );

    } else {

      sorted.forEach(
        ([skill, count]) => {

          topSkills.append(
            element(
              'span',
              'insight-tag',
              `${skill} · ${count}`
            )
          );

        }
      );
    }
  }
}


/* =========================================================
   SAVED UI
   ========================================================= */

function updateSavedUI() {

  const count =
    $('savedCount');

  const button =
    $('savedToggle');


  if (count) {
    count.textContent =
      savedJobs.size;
  }


  if (button) {

    button.classList.toggle(
      'active',
      showSavedOnly
    );

    button.setAttribute(
      'aria-pressed',
      String(
        showSavedOnly
      )
    );
  }
}


/* =========================================================
   SELECT OPTIONS
   ========================================================= */

function addOptions(
  select,
  values
) {

  if (!select) {
    return;
  }

  const existing =
    new Set(
      Array.from(
        select.options
      ).map(
        option =>
          option.value
      )
    );


  [
    ...new Set(
      values
        .filter(Boolean)
        .map(String)
        .map(
          value =>
            value.trim()
        )
        .filter(Boolean)
    )
  ]
    .sort(
      (a, b) =>
        a.localeCompare(b)
    )
    .forEach(
      value => {

        if (
          existing.has(value)
        ) {
          return;
        }

        const option =
          document.createElement(
            'option'
          );

        option.value =
          value;

        option.textContent =
          value;

        select.append(
          option
        );
      }
    );
}


/* =========================================================
   POPULATE FILTERS
   ========================================================= */

function populateFilters() {

  addOptions(
    $('location'),
    allJobs.map(
      job => job.location
    )
  );


  addOptions(
    $('jobType'),
    allJobs.map(
      job => job.job_type
    )
  );


  addOptions(
    $('skill'),
    allJobs.flatMap(
      job =>
        getJobSkills(job)
    )
  );
}


/* =========================================================
   RESULT COUNT
   ========================================================= */

function updateSummary(
  jobs
) {

  const total =
    $('total');

  const recent =
    $('recent');

  const sources =
    $('sources');

  const resultCount =
    $('resultCount');


  if (total) {
    total.textContent =
      jobs.length;
  }


  if (recent) {

    recent.textContent =
      allJobs.filter(
        job =>
          dateBucket(
            job.date_posted
          ) === 'This Week' ||
          dateBucket(
            job.date_posted
          ) === 'Today'
      ).length;
  }


  if (sources) {

    sources.textContent =
      new Set(
        allJobs
          .map(
            job =>
              job.source
          )
          .filter(Boolean)
      ).size;
  }


  if (resultCount) {

    resultCount.textContent =
      `${jobs.length} opportunities`;
  }
}


/* =========================================================
   PART 2 END
   ========================================================= *//* =========================================================
   PART 3 / 4
   JOB CARDS + MODAL
   ========================================================= */


/* =========================================================
   JOB CARD
   ========================================================= */

function jobCard(job) {

  const card =
    element(
      'article',
      'job'
    );


  const top =
    element(
      'div',
      'job-top'
    );


  const title =
    element(
      'h3',
      'job-title',
      job.title ||
      'Untitled opportunity'
    );


  const company =
    element(
      'p',
      'job-company',
      job.company ||
      'Company not provided'
    );


  top.append(
    title,
    company
  );


  const score =
    element(
      'strong',
      'job-score',
      `${Number(job.score || 0)}`
    );


  const scoreWrap =
    element(
      'div',
      'score-wrap'
    );

  scoreWrap.append(
    score,
    element(
      'span',
      '',
      'RADAR SCORE'
    )
  );


  top.append(
    scoreWrap
  );

  card.append(top);


  /* =====================================================
     META
     ===================================================== */

  const meta =
    element(
      'div',
      'job-meta'
    );


  meta.append(
    element(
      'span',
      '',
      job.location ||
      'Location unavailable'
    )
  );


  meta.append(
    element(
      'span',
      '',
      job.is_remote
        ? 'Remote'
        : 'Not marked remote'
    )
  );


  meta.append(
    element(
      'span',
      '',
      job.job_type ||
      'Type not listed'
    )
  );


  card.append(meta);


  /* =====================================================
     DESCRIPTION
     ===================================================== */

  const description =
    element(
      'p',
      'job-description'
    );


  const rawDescription =
    String(
      job.description || ''
    )
      .replace(/\s+/g, ' ')
      .trim();


  description.textContent =
    rawDescription.length > 240
      ? `${rawDescription.slice(0, 240)}…`
      : rawDescription ||
        'No description available.';


  card.append(
    description
  );


  /* =====================================================
     PERSONAL MATCH
     ===================================================== */

  const personal =
    calculatePersonalMatch(job);


  const match =
    element(
      'div',
      'personal-match'
    );


  match.append(
    element(
      'strong',
      '',
      `${personal.score}%`
    ),
    element(
      'span',
      '',
      'Personal Match'
    )
  );


  card.append(match);


  /* =====================================================
     FRESHNESS
     ===================================================== */

  card.append(
    element(
      'span',
      'freshness',
      freshnessLabel(
        job.date_posted
      )
    )
  );


  /* =====================================================
     SKILLS
     ===================================================== */

  const skills =
    element(
      'div',
      'job-skills'
    );


  getJobSkills(job)
    .slice(0, 7)
    .forEach(
      skill => {

        skills.append(
          element(
            'span',
            'skill-tag',
            skill
          )
        );

      }
    );


  card.append(skills);


  /* =====================================================
     REASONS
     ===================================================== */

  const reasons =
    element(
      'div',
      'job-reasons'
    );


  if (
    Array.isArray(
      job.reasons
    )
  ) {

    job.reasons
      .slice(0, 3)
      .forEach(
        reason => {

          reasons.append(
            element(
              'span',
              '',
              `✓ ${reason}`
            )
          );

        }
      );
  }


  card.append(reasons);


  /* =====================================================
     ACTIONS
     ===================================================== */

  const actions =
    element(
      'div',
      'job-actions'
    );


  const saveButton =
    element(
      'button',
      'job-action'
    );


  saveButton.type =
    'button';

  saveButton.textContent =
    savedJobs.has(
      jobId(job)
    )
      ? 'Saved ✓'
      : 'Save';


  saveButton.addEventListener(
    'click',
    () =>
      toggleSavedJob(job)
  );


  const detailsButton =
    element(
      'button',
      'job-action'
    );


  detailsButton.type =
    'button';

  detailsButton.textContent =
    'View Details';


  detailsButton.addEventListener(
    'click',
    () =>
      openJobModal(job)
  );


  const applyUrl =
    safeLink(
      job.job_url
    );


  const applyButton =
    element(
      'a',
      'job-action apply-button',
      'Apply Now ↗'
    );


  if (applyUrl) {

    applyButton.href =
      applyUrl;

    applyButton.target =
      '_blank';

    applyButton.rel =
      'noopener noreferrer';

  } else {

    applyButton.removeAttribute(
      'href'
    );

    applyButton.setAttribute(
      'aria-disabled',
      'true'
    );
  }


  actions.append(
    saveButton,
    detailsButton,
    applyButton
  );


  /* =====================================================
     STATUS
     ===================================================== */

  const statusSelect =
    document.createElement(
      'select'
    );


  statusSelect.className =
    'job-status';


  [
    ['not-tracked', 'Track status'],
    ['Saved', 'Saved'],
    ['Applied', 'Applied'],
    ['Interview', 'Interview'],
    ['Closed', 'Closed']
  ]
    .forEach(
      ([value, label]) => {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          value;

        option.textContent =
          label;

        statusSelect.append(
          option
        );
      }
    );


  statusSelect.value =
    getApplicationStatus(job);


  statusSelect.addEventListener(
    'change',
    () =>
      setApplicationStatus(
        job,
        statusSelect.value
      )
  );


  actions.append(
    statusSelect
  );


  card.append(actions);


  return card;
}


/* =========================================================
   RENDER JOBS
   ========================================================= */

function render() {

  const results =
    $('results');

  if (!results) {
    return;
  }


  const jobs =
    getFilteredJobs();


  results.replaceChildren();


  if (!jobs.length) {

    const empty =
      element(
        'div',
        'empty-results'
      );


    empty.append(
      element(
        'strong',
        '',
        'No matching opportunities found.'
      ),
      element(
        'p',
        '',
        'Try clearing a filter or searching for another skill.'
      )
    );


    results.append(
      empty
    );

  } else {

    jobs.forEach(
      job =>
        results.append(
          jobCard(job)
        )
    );
  }


  updateSummary(jobs);

  updateSavedUI();

  updateInsights();
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


  content.replaceChildren();


  const title =
    element(
      'h2',
      '',
      job.title ||
      'Job details'
    );


  const company =
    element(
      'p',
      'modal-company',
      job.company ||
      'Company not provided'
    );


  const meta =
    element(
      'p',
      'modal-meta',
      [
        job.location,
        job.job_type,
        job.is_remote
          ? 'Remote'
          : 'Not marked remote',
        freshnessLabel(
          job.date_posted
        )
      ]
        .filter(Boolean)
        .join(' · ')
    );


  const score =
    element(
      'div',
      'modal-score',
      `Radar Score: ${Number(job.score || 0)}`
    );


  const personal =
    calculatePersonalMatch(job);


  const match =
    element(
      'div',
      'modal-match',
      `Personal Match: ${personal.score}%`
    );


  const descriptionTitle =
    element(
      'h3',
      '',
      'Description'
    );


  const description =
    element(
      'p',
      'modal-description',
      job.description ||
      'No description available.'
    );


  const skillTitle =
    element(
      'h3',
      '',
      'Skills'
    );


  const skills =
    element(
      'div',
      'modal-skills'
    );


  getJobSkills(job)
    .forEach(
      skill =>
        skills.append(
          element(
            'span',
            'skill-tag',
            skill
          )
        )
    );


  const reasonTitle =
    element(
      'h3',
      '',
      'Why this matches'
    );


  const reasons =
    element(
      'ul',
      'modal-reasons'
    );


  if (
    Array.isArray(
      job.reasons
    )
  ) {

    job.reasons.forEach(
      reason => {

        const li =
          document.createElement(
            'li'
          );

        li.textContent =
          reason;

        reasons.append(
          li
        );
      }
    );
  }


  const applyUrl =
    safeLink(
      job.job_url
    );


  const apply =
    element(
      'a',
      'modal-apply',
      'Open Original Posting ↗'
    );


  if (applyUrl) {

    apply.href =
      applyUrl;

    apply.target =
      '_blank';

    apply.rel =
      'noopener noreferrer';

  } else {

    apply.textContent =
      'Original posting unavailable';

    apply.removeAttribute(
      'href'
    );
  }


  content.append(
    title,
    company,
    meta,
    score,
    match,
    descriptionTitle,
    description,
    skillTitle,
    skills,
    reasonTitle,
    reasons,
    apply
  );


  modal.hidden =
    false;
}


function closeJobModal() {

  const modal =
    $('jobModal');

  if (modal) {
    modal.hidden =
      true;
  }
}


/* =========================================================
   PART 3 END
   ========================================================= *//* =========================================================
   PART 4 / 4
   DATA LOADING + EVENTS + INIT
   ========================================================= */


/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadJobs() {

  const sourceStatus =
    $('sourceStatus');

  try {

    if (sourceStatus) {
      sourceStatus.textContent =
        'Loading real job data…';
    }


    const response =
      await fetch(
        `${DATA_URL}?v=${Date.now()}`,
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


    /*
     * processed_jobs.json contains:
     *
     * {
     *   "jobs": [...]
     * }
     *
     * This also supports a direct array.
     */

    allJobs =
      Array.isArray(data)
        ? data
        : Array.isArray(data.jobs)
          ? data.jobs
          : [];


    if (sourceStatus) {

      sourceStatus.textContent =
        `${allJobs.length} real opportunities loaded`;
    }


    populateFilters();

    render();

    updateAgent(null);


  } catch (error) {

    console.error(
      'Job Radar data error:',
      error
    );


    allJobs = [];


    if (sourceStatus) {

      sourceStatus.textContent =
        'Unable to load job data';
    }


    const notice =
      $('notice');


    if (notice) {

      notice.hidden =
        false;

      notice.textContent =
        'Job data could not be loaded. Please refresh the page.';
    }


    render();
  }
}


/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetFilters() {

  controls.forEach(
    id => {

      const control =
        $(id);

      if (!control) {
        return;
      }


      if (
        control.tagName ===
        'SELECT'
      ) {

        if (id === 'minimum') {
          control.value = '0';
        } else if (
          id === 'sort'
        ) {
          control.value = 'newest';
        } else {
          control.value = 'all';
        }

      } else {

        control.value = '';
      }
    }
  );


  showSavedOnly =
    false;


  updateSavedUI();

  render();
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function bindEvents() {


  /* Search + filters */

  controls.forEach(
    id => {

      const control =
        $(id);

      if (!control) {
        return;
      }


      control.addEventListener(
        'input',
        render
      );


      control.addEventListener(
        'change',
        render
      );
    }
  );


  /* Analyze */

  const analyzeButton =
    $('agentAnalyze');


  if (analyzeButton) {

    analyzeButton.addEventListener(
      'click',
      analyzeBestOpportunity
    );
  }


  /* Saved */

  const savedButton =
    $('savedToggle');


  if (savedButton) {

    savedButton.addEventListener(
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

  const resetButton =
    $('reset');


  if (resetButton) {

    resetButton.addEventListener(
      'click',
      resetFilters
    );
  }


  /* Modal close */

  const modalClose =
    $('modalClose');


  if (modalClose) {

    modalClose.addEventListener(
      'click',
      closeJobModal
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
          closeJobModal();
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
        closeJobModal();
      }
    }
  );
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
      'No saved jobs to export yet.'
    );

    return;
  }


  const rows = [

    [
      'Title',
      'Company',
      'Location',
      'Score',
      'Personal Match',
      'Status',
      'Posted',
      'Job URL'
    ],

    ...saved.map(
      job => [

        job.title || '',

        job.company || '',

        job.location || '',

        job.score || 0,

        `${calculatePersonalMatch(job).score}%`,

        getApplicationStatus(job),

        job.date_posted || '',

        job.job_url || ''
      ]
    )
  ];


  const csv =
    rows
      .map(
        row =>
          row
            .map(
              value =>
                `"${String(value)
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
   INITIALIZE
   ========================================================= */

async function init() {

  loadSavedJobs();

  loadApplicationStatus();

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
   JOB RADAR APP END
   ========================================================= */