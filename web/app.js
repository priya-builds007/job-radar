'use strict';

const DATA_URL = '/data/processed_jobs.json';

const SAVED_KEY = 'jobRadarSavedJobs';
const STATUS_KEY = 'jobRadarApplicationStatus';

const STATUS_OPTIONS = [
  'Saved',
  'Applied',
  'Interview',
  'Closed'
];

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
  'Jenkins',
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

const $ = id =>
  document.getElementById(id);


/* =========================================================
   FILTER CONTROLS
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
   DATE BUCKETS
   ========================================================= */

const buckets = [
  'Today',
  'This Week',
  'This Month',
  'Older',
  'Unknown date'
];


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let allJobs = [];

let savedJobs =
  new Set();

let applicationStatus =
  new Map();

let showSavedOnly =
  false;


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
          calculatePersonalMatch(a).score;

        const matchB =
          calculatePersonalMatch(b).score;

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


  /*
   * No job available
   */

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


  /*
   * Job title
   */

  if (title) {

    title.textContent =
      job.title ||
      'Recommended opportunity';

  }


  /*
   * Company
   */

  if (company) {

    company.textContent =
      job.company ||
      'Company not provided';

  }


  /*
   * Personal match
   */

  if (match) {

    match.textContent =
      `${personal.score}%`;

  }


  /*
   * Matching skills
   */

  if (matchedSkills) {

    matchedSkills.replaceChildren();

    if (
      personal.matched.length
    ) {

      personal.matched
        .slice(0, 6)
        .forEach(
          skill => {

            matchedSkills.append(
              element(
                'span',
                'agent-tag matched',
                skill
              )
            );

          }
        );

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


  /*
   * Missing skills
   */

  if (missingSkills) {

    missingSkills.replaceChildren();

    if (
      personal.missing.length
    ) {

      personal.missing
        .slice(0, 5)
        .forEach(
          skill => {

            missingSkills.append(
              element(
                'span',
                'agent-tag missing',
                skill
              )
            );

          }
        );

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


  /*
   * Next action
   */

  if (nextAction) {

    let action =
      'Review the job description and decide whether it fits your goals.';


    if (
      personal.score >= 80
    ) {

      action =
        'Strong match. Review the posting and consider applying.';

    } else if (
      personal.score >= 60
    ) {

      action =
        'Good match. Check the missing skills before applying.';

    } else if (
      personal.missing.length
    ) {

      action =
        `Explore ${
          personal.missing
            .slice(0, 2)
            .join(' and ')
        } before targeting this role.`;

    }


    nextAction.textContent =
      action;

  }


  /*
   * Activate agent card
   */

  if (card) {

    card.classList.add(
      'agent-active'
    );

  }

}


function analyzeBestOpportunity() {

  const bestJob =
    getBestOpportunity();


  if (!bestJob) {

    updateAgent(
      null
    );

    const nextAction =
      $('agentNextAction');

    if (nextAction) {

      nextAction.textContent =
        'No job data is available yet. Please try again after the jobs are loaded.';

    }

    return;
  }


  updateAgent(
    bestJob
  );


  /*
   * Smoothly bring the recommendation
   * into view on mobile.
   */

  const agentPanel =
    $('agentPanel');

  if (agentPanel) {

    agentPanel.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

  }

}


/* =========================================================
   SAFE LINK
   ========================================================= */

function safeLink(value) {

  try {

    const url =
      new URL(value);

    if (
      ![
        'http:',
        'https:'
      ].includes(
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

    `${job.title || ''}|${
      job.company || ''
    }|${
      job.location || ''
    }`

  );

}


/* =========================================================
   SAVED JOBS
   ========================================================= */

function loadSavedJobs() {

  try {

    const stored =
      JSON.parse(
        localStorage.getItem(
          SAVED_KEY
        ) || '[]'
      );


    savedJobs =
      new Set(

        Array.isArray(stored)
          ? stored.map(String)
          : []

      );

  } catch {

    savedJobs =
      new Set();

  }

}


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


function toggleSavedJob(job) {

  const id =
    jobId(job);


  if (
    savedJobs.has(id)
  ) {

    savedJobs.delete(id);

  } else {

    savedJobs.add(id);

  }


  persistSavedJobs();

  updateSavedUI();

  render();

}


function updateSavedUI() {

  const count =
    $('savedCount');

  const insight =
    $('insightSaved');

  const button =
    $('savedToggle');


  if (count) {

    count.textContent =
      savedJobs.size;

  }


  if (insight) {

    insight.textContent =
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
   END OF PART 1
   ========================================================= *//* =========================================================
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
      job => {

        const match =
          calculatePersonalMatch(job).score;

        return [

          job.title || '',

          job.company || '',

          job.location || '',

          job.score || 0,

          `${match}%`,

          getApplicationStatus(job),

          job.date_posted || '',

          job.job_url || ''

        ];

      }
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
                  .replace(/"/g, '""')}"`
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
    URL.createObjectURL(blob);


  const link =
    document.createElement('a');


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
   APPLICATION STATUS
   ========================================================= */

function loadApplicationStatus() {

  try {

    const stored =
      JSON.parse(
        localStorage.getItem(
          STATUS_KEY
        ) || '{}'
      );


    applicationStatus =
      new Map(
        Object.entries(
          stored
        )
      );

  } catch {

    applicationStatus =
      new Map();

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

  const id =
    jobId(job);


  if (
    !status ||
    status === 'not-tracked'
  ) {

    applicationStatus.delete(
      id
    );

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
   SKILL DETECTION
   ========================================================= */

function skillMentioned(
  text,
  skill
) {

  const value =
    String(text || '')
      .toLowerCase();


  const target =
    String(skill || '')
      .toLowerCase();


  if (!value || !target) {
    return false;
  }


  if (
    target === 'c++'
  ) {

    return /\bc\+\+\b/i.test(
      value
    );

  }


  if (
    target === 'c#'
  ) {

    return /\bc#\b/i.test(
      value
    );

  }


  return value.includes(
    target
  );

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


function extractMentionedSkills(
  job
) {

  const text =
    getJobText(job);


  return JOB_SKILL_POOL.filter(
    skill =>
      skillMentioned(
        text,
        skill
      )
  );

}


/* =========================================================
   JOB SKILLS
   ========================================================= */

function getJobSkills(job) {

  const detected =
    extractMentionedSkills(
      job
    );


  const stored =
    Array.isArray(
      job.matched_skills
    )
      ? job.matched_skills
      : [];


  const combined =
    [
      ...stored,
      ...detected
    ];


  return [
    ...new Set(
      combined
        .filter(Boolean)
        .map(
          String
        )
    )
  ];

}


/* =========================================================
   PERSONAL MATCH
   ========================================================= */

function calculatePersonalMatch(
  job
) {

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


  /*
   * Skill score
   */

  let skillScore =
    0;


  if (
    jobSkills.length
  ) {

    skillScore =
      Math.round(
        (
          matched.length /
          jobSkills.length
        ) * 60
      );

  }


  /*
   * Role relevance
   */

  const title =
    String(
      job.title || ''
    ).toLowerCase();


  let roleScore =
    0;


  if (
    /intern|internship|trainee|fresher|entry.?level|graduate/
      .test(title)
  ) {

    roleScore =
      25;

  }


  /*
   * Remote/location relevance
   */

  let contextScore =
    0;


  if (
    Boolean(
      job.is_remote
    )
  ) {

    contextScore =
      15;

  } else if (
    /india|tamil nadu|coimbatore|chennai|bengaluru|bangalore/
      .test(
        String(
          job.location || ''
        ).toLowerCase()
      )
  ) {

    contextScore =
      15;

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
   SKILL GAP
   ========================================================= */

function extractSkillGap(
  job
) {

  const personal =
    calculatePersonalMatch(
      job
    );


  return personal.missing;

}


/* =========================================================
   END OF PART 2
   ========================================================= *//* =========================================================
   DATE BUCKET
   ========================================================= */

function dateBucket(
  dateValue
) {

  if (!dateValue) {
    return 'Unknown date';
  }


  const date =
    new Date(
      dateValue
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return 'Unknown date';

  }


  const now =
    new Date();


  const startToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );


  const startDate =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );


  const difference =
    startToday.getTime() -
    startDate.getTime();


  const oneDay =
    24 *
    60 *
    60 *
    1000;


  const days =
    Math.floor(
      difference /
      oneDay
    );


  if (
    days <= 0
  ) {

    return 'Today';

  }


  if (
    days <= 7
  ) {

    return 'This Week';

  }


  if (
    days <= 30
  ) {

    return 'This Month';

  }


  return 'Older';

}


/* =========================================================
   FRESHNESS LABEL
   ========================================================= */

function freshnessLabel(
  dateValue
) {

  const bucket =
    dateBucket(
      dateValue
    );


  if (
    bucket === 'Today'
  ) {

    return 'Posted today';

  }


  if (
    bucket === 'This Week'
  ) {

    return 'Posted this week';

  }


  if (
    bucket === 'This Month'
  ) {

    return 'Posted this month';

  }


  if (
    bucket === 'Older'
  ) {

    return 'Older posting';

  }


  return 'Date unavailable';

}


/* =========================================================
   ELEMENT HELPER
   ========================================================= */

function element(
  tag,
  className = '',
  text = ''
) {

  const node =
    document.createElement(
      tag
    );


  if (className) {

    node.className =
      className;

  }


  if (
    text !== undefined &&
    text !== null
  ) {

    node.textContent =
      text;

  }


  return node;

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


  const current =
    select.value;


  const existing =
    new Set();


  Array.from(
    select.options
  ).forEach(
    option => {

      existing.add(
        option.value
      );

    }
  );


  const unique =
    [
      ...new Set(
        values
          .filter(Boolean)
          .map(
            String
          )
          .map(
            value =>
              value.trim()
          )
          .filter(Boolean)
      )
    ]
      .sort(
        (a, b) =>
          a.localeCompare(
            b
          )
      );


  unique.forEach(
    value => {

      if (
        existing.has(
          value
        )
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


  if (
    current
  ) {

    select.value =
      current;

  }

}


/* =========================================================
   JOB DETAILS MODAL
   ========================================================= */

function openJobModal(
  job
) {

  const modal =
    $('jobModal');


  if (!modal) {
    return;
  }


  const title =
    $('modalTitle');

  const company =
    $('modalCompany');

  const description =
    $('modalDescription');

  const skills =
    $('modalSkills');

  const link =
    $('modalApply');


  if (title) {

    title.textContent =
      job.title ||
      'Job details';

  }


  if (company) {

    company.textContent =
      job.company ||
      'Company not provided';

  }


  if (description) {

    description.textContent =
      job.description ||
      'No description available.';

  }


  if (skills) {

    skills.replaceChildren();


    getJobSkills(job)
      .slice(0, 12)
      .forEach(
        skill => {

          skills.append(
            element(
              'span',
              'skill',
              skill
            )
          );

        }
      );

  }


  if (link) {

    const url =
      safeLink(
        job.job_url
      );


    if (url) {

      link.href =
        url;

      link.hidden =
        false;

    } else {

      link.hidden =
        true;

    }

  }


  modal.hidden =
    false;

}


/* =========================================================
   END OF PART 3
   ========================================================= *//* =========================================================
   JOB CARD
   ========================================================= */

function jobCard(job) {

  const card =
    element(
      'article',
      'job'
    );


  const head =
    element(
      'div',
      'job-head'
    );


  const left =
    element(
      'div'
    );


  const source =
    element(
      'span',
      'source',
      String(
        job.source || 'JOB'
      ).toUpperCase()
    );


  const title =
    element(
      'h4',
      '',
      job.title ||
      'Untitled opportunity'
    );


  const company =
    element(
      'p',
      'company',
      job.company ||
      'Company not provided'
    );


  left.append(
    source,
    title,
    company
  );


  const scoreBox =
    element(
      'div',
      'score'
    );


  const score =
    element(
      'strong',
      '',
      `${Number(job.score || 0)}`
    );


  const scoreLabel =
    element(
      'small',
      '',
      'MATCH SCORE'
    );


  scoreBox.append(
    score,
    scoreLabel
  );


  head.append(
    left,
    scoreBox
  );


  /* META */

  const meta =
    element(
      'div',
      'meta'
    );


  if (
    job.location
  ) {

    meta.append(
      element(
        'span',
        '',
        job.location
      )
    );

  }


  if (
    job.job_type
  ) {

    meta.append(
      element(
        'span',
        '',
        job.job_type
      )
    );

  }


  meta.append(
    element(
      'span',
      '',
      job.is_remote
        ? 'Remote'
        : 'On-site'
    )
  );


  /* DESCRIPTION */

  const description =
    element(
      'p',
      'job-description'
    );


  const rawDescription =
    String(
      job.description || ''
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  description.textContent =
    rawDescription
      ? rawDescription.length > 180
        ? `${rawDescription.slice(0, 180)}…`
        : rawDescription
      : 'No description available.';


  /* PERSONAL MATCH */

  const personal =
    calculatePersonalMatch(
      job
    );


  const personalMatch =
    element(
      'div',
      'personal-match'
    );


  const personalLabel =
    element(
      'span',
      'personal-match-label',
      'PERSONAL MATCH'
    );


  const personalValue =
    element(
      'strong',
      '',
      `${personal.score}%`
    );


  personalMatch.append(
    personalLabel,
    personalValue
  );


  /* FRESHNESS */

  const freshness =
    element(
      'span',
      'freshness-badge',
      freshnessLabel(
        job.date_posted
      )
    );


  /* SKILLS */

  const skills =
    element(
      'div',
      'skills'
    );


  getJobSkills(job)
    .slice(0, 8)
    .forEach(
      skill => {

        skills.append(
          element(
            'span',
            'skill',
            skill
          )
        );

      }
    );


  /* REASONS */

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


  /* ACTIONS */

  const actions =
    element(
      'div',
      'job-actions'
    );


  const saveButton =
    element(
      'button',
      'save-job'
    );


  const saved =
    savedJobs.has(
      jobId(job)
    );


  saveButton.type =
    'button';


  saveButton.textContent =
    saved
      ? 'Saved'
      : 'Save';


  saveButton.setAttribute(
    'aria-label',
    saved
      ? 'Remove saved job'
      : 'Save job'
  );


  saveButton.addEventListener(
    'click',
    () =>
      toggleSavedJob(job)
  );


  const detailsButton =
    element(
      'button',
      'details-job',
      'View Details'
    );


  detailsButton.type =
    'button';


  detailsButton.addEventListener(
    'click',
    () =>
      openJobModal(job)
  );


  const applyLink =
    element(
      'a',
      'apply-job',
      'Apply'
    );


  const url =
    safeLink(
      job.job_url
    );


  if (url) {

    applyLink.href =
      url;

    applyLink.target =
      '_blank';

    applyLink.rel =
      'noopener noreferrer';

  } else {

    applyLink.textContent =
      'Link unavailable';

    applyLink.setAttribute(
      'aria-disabled',
      'true'
    );

  }


  /* STATUS */

  const statusSelect =
    document.createElement(
      'select'
    );


  statusSelect.className =
    'application-status';


  statusSelect.setAttribute(
    'aria-label',
    'Application status'
  );


  const defaultOption =
    element(
      'option',
      '',
      'Track status'
    );


  defaultOption.value =
    'not-tracked';


  statusSelect.append(
    defaultOption
  );


  STATUS_OPTIONS.forEach(
    status => {

      const option =
        element(
          'option',
          '',
          status
        );


      option.value =
        status;


      statusSelect.append(
        option
      );

    }
  );


  statusSelect.value =
    getApplicationStatus(
      job
    );


  statusSelect.addEventListener(
    'change',
    () =>
      setApplicationStatus(
        job,
        statusSelect.value
      )
  );


  actions.append(
    saveButton,
    detailsButton,
    applyLink,
    statusSelect
  );


  card.append(
    head,
    meta,
    description,
    personalMatch,
    freshness,
    skills,
    reasons,
    actions
  );


  return card;

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
        job =>
          Boolean(
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

    const counts =
      new Map();


    allJobs.forEach(
      job => {

        getJobSkills(job)
          .forEach(
            skill => {

              counts.set(
                skill,
                (
                  counts.get(skill) ||
                  0
                ) + 1
              );

            }
          );

      }
    );


    const top =
      [...counts.entries()]
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(
          0,
          5
        );


    topSkills.replaceChildren();


    top.forEach(
      ([skill, count]) => {

        topSkills.append(
          element(
            'span',
            'skill',
            `${skill} · ${count}`
          )
        );

      }
    );

  }

}


/* =========================================================
   FILTERING
   ========================================================= */

function getFilteredJobs() {

  const search =
    String(
      $('search')?.value || ''
    )
      .trim()
      .toLowerCase();


  const location =
    String(
      $('location')?.value || ''
    )
      .trim()
      .toLowerCase();


  const jobType =
    String(
      $('jobType')?.value || ''
    )
      .trim()
      .toLowerCase();


  const remote =
    String(
      $('remote')?.value || ''
    )
      .trim()
      .toLowerCase();


  const period =
    String(
      $('period')?.value || ''
    )
      .trim();


  const skill =
    String(
      $('skill')?.value || ''
    )
      .trim()
      .toLowerCase();


  const status =
    String(
      $('status')?.value || ''
    )
      .trim();


  const minimum =
    Number(
      $('minimum')?.value || 0
    );


  let jobs =
    [...allJobs];


  /* SEARCH */

  if (search) {

    jobs =
      jobs.filter(
        job =>
          getJobText(job)
            .includes(
              search
            )
      );

  }


  /* LOCATION */

  if (
    location &&
    location !== 'all'
  ) {

    jobs =
      jobs.filter(
        job =>
          String(
            job.location || ''
          )
            .toLowerCase()
            .includes(
              location
            )
      );

  }


  /* JOB TYPE */

  if (
    jobType &&
    jobType !== 'all'
  ) {

    jobs =
      jobs.filter(
        job =>
          String(
            job.job_type || ''
          )
            .toLowerCase()
            .includes(
              jobType
            )
      );

  }


  /* WORK MODE */

  if (
    remote === 'remote'
  ) {

    jobs =
      jobs.filter(
        job =>
          Boolean(
            job.is_remote
          )
      );

  }


  if (
    remote === 'onsite'
  ) {

    jobs =
      jobs.filter(
        job =>
          !Boolean(
            job.is_remote
          )
      );

  }


  /* POSTED */

  if (
    period &&
    period !== 'all'
  ) {

    jobs =
      jobs.filter(
        job =>
          dateBucket(
            job.date_posted
          ) === period
      );

  }


  /* SKILL */

  if (
    skill &&
    skill !== 'all'
  ) {

    jobs =
      jobs.filter(
        job =>
          getJobSkills(job)
            .some(
              item =>
                item
                  .toLowerCase()
                  .includes(
                    skill
                  )
            )
      );

  }


  /* STATUS */

  if (
    status &&
    status !== 'all'
  ) {

    jobs =
      jobs.filter(
        job =>
          getApplicationStatus(
            job
          ) === status
      );

  }


  /* MINIMUM SCORE */

  if (
    Number.isFinite(
      minimum
    ) &&
    minimum > 0
  ) {

    jobs =
      jobs.filter(
        job =>
          calculatePersonalMatch(
            job
          ).score >= minimum
      );

  }


  /* SAVED ONLY */

  if (showSavedOnly) {

    jobs =
      jobs.filter(
        job =>
          savedJobs.has(
            jobId(job)
          )
      );

  }


  /* SORT */

  const sort =
    $('sort')?.value ||
    'score';


  jobs.sort(
    (a, b) => {

      if (
        sort === 'newest'
      ) {

        return String(
          b.date_posted || ''
        ).localeCompare(
          String(
            a.date_posted || ''
          )
        );

      }


      if (
        sort === 'oldest'
      ) {

        return String(
          a.date_posted || ''
        ).localeCompare(
          String(
            b.date_posted || ''
          )
        );

      }


      if (
        sort === 'personal'
      ) {

        return (
          calculatePersonalMatch(
            b
          ).score -
          calculatePersonalMatch(
            a
          ).score
        );

      }


      if (
        sort === 'company'
      ) {

        return String(
          a.company || ''
        ).localeCompare(
          String(
            b.company || ''
          )
        );

      }


      return (
        Number(
          b.score || 0
        ) -
        Number(
          a.score || 0
        )
      );

    }
  );


  return jobs;

}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

  const results =
    $('results');

  const empty =
    $('emptyState');


  if (!results) {
    return;
  }


  const jobs =
    getFilteredJobs();


  results.replaceChildren();


  /*
   * Result count
   */

  const resultCount =
    $('resultCount');


  if (resultCount) {

    resultCount.textContent =
      `${jobs.length} ${
        jobs.length === 1
          ? 'opportunity'
          : 'opportunities'
      }`;

  }


  /*
   * Empty state
   */

  if (!jobs.length) {

    if (empty) {

      empty.hidden =
        false;

    }

    return;

  }


  if (empty) {

    empty.hidden =
      true;

  }


  jobs.forEach(
    job => {

      results.append(
        jobCard(job)
      );

    }
  );


  updateSavedUI();

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

        control.selectedIndex =
          0;

      } else {

        control.value =
          '';

      }

    }
  );


  showSavedOnly =
    false;


  updateSavedUI();

  render();


  const search =
    $('search');


  if (search) {

    search.focus();

  }

}


/* =========================================================
   END OF PART 4
   ========================================================= *//* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {

  loadSavedJobs();

  loadApplicationStatus();


  /*
   * Filter listeners
   */

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


  /*
   * Clear filters
   *
   * Supports both IDs so the
   * existing HTML will continue
   * working.
   */

  const clearButton =
    $('clearFilters') ||
    $('reset');


  if (clearButton) {

    clearButton.addEventListener(
      'click',
      resetFilters
    );

  }


  /*
   * Saved jobs
   */

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


  /*
   * Export
   */

  const exportButton =
    $('exportSaved');


  if (exportButton) {

    exportButton.addEventListener(
      'click',
      exportSavedJobs
    );

  }


  /*
   * Agent
   */

  const analyzeButton =
    $('agentAnalyze');


  if (analyzeButton) {

    analyzeButton.addEventListener(
      'click',
      analyzeBestOpportunity
    );

  }


  /*
   * Modal close
   */

  const modalClose =
    $('modalClose');


  if (modalClose) {

    modalClose.addEventListener(
      'click',
      () => {

        const modal =
          $('jobModal');


        if (modal) {

          modal.hidden =
            true;

        }

      }
    );

  }


  /*
   * Load real job data
   */

  try {

    const response =
      await fetch(
        DATA_URL,
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
     * IMPORTANT:
     *
     * processed_jobs.json
     * contains:
     *
     * {
     *   jobs: [...]
     * }
     *
     * This also supports a direct
     * array for compatibility.
     */

    allJobs =
      Array.isArray(data)
        ? data
        : Array.isArray(data.jobs)
          ? data.jobs
          : [];


    /*
     * Location options
     */

    const locationSelect =
      $('location');


    if (locationSelect) {

      addOptions(
        locationSelect,
        allJobs.map(
          job =>
            job.location
        )
      );

    }


    /*
     * Job type options
     */

    const jobTypeSelect =
      $('jobType');


    if (jobTypeSelect) {

      addOptions(
        jobTypeSelect,
        allJobs.map(
          job =>
            job.job_type
        )
      );

    }


    /*
     * Skill options
     */

    const skillSelect =
      $('skill');


    if (skillSelect) {

      addOptions(
        skillSelect,
        JOB_SKILL_POOL
      );

    }


    /*
     * Update dashboard
     */

    updateSavedUI();

    updateInsights();


    /*
     * Show initial recommendation
     * only when data exists.
     */

    if (
      allJobs.length
    ) {

      updateAgent(
        getBestOpportunity()
      );

    } else {

      updateAgent(
        null
      );

    }


    /*
     * Render jobs
     */

    render();


    /*
     * Update source status
     */

    const sourceStatus =
      $('sourceStatus');


    if (sourceStatus) {

      sourceStatus.textContent =
        `${allJobs.length} live opportunities loaded`;

    }


    /*
     * Update total
     */

    const total =
      $('total');


    if (total) {

      total.textContent =
        allJobs.length;

    }


  } catch (error) {

    console.error(
      'Job Radar load error:',
      error
    );


    allJobs =
      [];


    updateAgent(
      null
    );


    const sourceStatus =
      $('sourceStatus');


    if (sourceStatus) {

      sourceStatus.textContent =
        'Unable to load job data';

    }


    const total =
      $('total');


    if (total) {

      total.textContent =
        '0';

    }


    render();

  }

}


/* =========================================================
   CLOSE MODAL WHEN CLICKING OUTSIDE
   ========================================================= */

document.addEventListener(
  'click',
  event => {

    const modal =
      $('jobModal');


    if (
      !modal ||
      modal.hidden
    ) {

      return;

    }


    if (
      event.target === modal
    ) {

      modal.hidden =
        true;

    }

  }
);


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
  'keydown',
  event => {

    if (
      event.key !==
      'Escape'
    ) {

      return;

    }


    const modal =
      $('jobModal');


    if (modal) {

      modal.hidden =
        true;

    }

  }
);


/* =========================================================
   START APP
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  init
);