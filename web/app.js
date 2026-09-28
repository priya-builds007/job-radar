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

const $ = id =>
  document.getElementById(id);

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

const buckets = [
  'Today',
  'This Week',
  'This Month',
  'Older',
  'Unknown date'
];

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

  return ranked[0];
}


function updateAgent(job) {

  if (!job) {
    return;
  }

  const personal =
    calculatePersonalMatch(job);

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


  if (!title) {
    return;
  }


  title.textContent =
    job.title ||
    'Recommended opportunity';


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


    if (
      personal.matched.length
    ) {

      personal.matched.forEach(
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


  if (nextAction) {

    let action;


    if (
      personal.score >= 80
    ) {

      action =
        'Strong skill match. Review the posting and consider applying.';

    } else if (
      personal.score >= 60
    ) {

      action =
        'Good match. Check the missing skills and prepare before applying.';

    } else if (
      personal.missing.length
    ) {

      action =
        `Build familiarity with ${
          personal.missing
            .slice(0, 2)
            .join(' and ')
        } before targeting this role.`;

    } else {

      action =
        'Read the job description carefully and decide whether it fits your goals.';

    }


    nextAction.textContent =
      action;

  }


  const card =
    $('agentCard');


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

    const nextAction =
      $('agentNextAction');


    if (nextAction) {

      nextAction.textContent =
        'No job data is available yet. Run the crawler and processor first.';

    }

    return;
  }


  updateAgent(
    bestJob
  );

}


/* =========================================================
   SAFE HELPERS
   ========================================================= */

function safeLink(value) {

  try {

    const u =
      new URL(value);

    return [
      'http:',
      'https:'
    ].includes(
      u.protocol
    ) &&
      !u.username &&
      !u.password
      ? u.href
      : null;

  } catch {

    return null;

  }

}


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

}/* =========================================================
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


  const a =
    document.createElement('a');


  a.href = url;

  a.download =
    'job-radar-saved-jobs.csv';


  document.body.appendChild(a);

  a.click();

  a.remove();


  URL.revokeObjectURL(url);

}


/* =========================================================
   APPLICATION TRACKER
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

          stored &&
          typeof stored === 'object'
            ? stored
            : {}

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
          applicationStatus.entries()
        )
      )
    );

  } catch {}

}


function getApplicationStatus(job) {

  return (
    applicationStatus.get(
      jobId(job)
    ) ||
    'not-tracked'
  );

}


function setApplicationStatus(
  job,
  status
) {

  const id =
    jobId(job);


  if (
    status === 'not-tracked'
  ) {

    applicationStatus.delete(id);

  } else {

    applicationStatus.set(
      id,
      status
    );

    savedJobs.add(id);

  }


  persistApplicationStatus();

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

  const normalized =
    skill.toLowerCase();


  const escaped =
    normalized.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );


  const pattern =
    new RegExp(
      `(^|\\s|[^a-z0-9+#.])${escaped}(?=$|\\s|[^a-z0-9+#.])`,
      'i'
    );


  return pattern.test(text);

}


function getJobText(job) {

  return [

    job.title,

    job.description,

    job.job_description,

    job.description_text,

    Array.isArray(job.matched_skills)
      ? job.matched_skills.join(' ')
      : ''

  ]

    .filter(Boolean)

    .join(' ')

    .toLowerCase();

}


function extractMentionedSkills(job) {

  const text =
    getJobText(job);


  const found = [];


  JOB_SKILL_POOL.forEach(
    skill => {

      if (
        skillMentioned(
          text,
          skill
        )
      ) {

        found.push(skill);

      }

    }
  );


  return found.slice(0, 8);

}


/* =========================================================
   PERSONALIZED MATCH SCORE
   ========================================================= */

function getJobSkills(job) {

  const detected =
    extractMentionedSkills(job);


  if (
    Array.isArray(job.matched_skills)
  ) {

    job.matched_skills.forEach(
      skill => {

        const clean =
          String(skill).trim();


        if (
          clean &&
          !detected.some(
            item =>
              item.toLowerCase() ===
              clean.toLowerCase()
          )
        ) {

          detected.push(clean);

        }

      }
    );

  }


  return detected;

}


function calculatePersonalMatch(job) {

  const jobSkills =
    getJobSkills(job);


  if (!jobSkills.length) {

    return {

      score: 0,

      matched: [],

      missing: []

    };

  }


  const profile =
    PROFILE_SKILLS.map(
      skill =>
        skill.toLowerCase()
    );


  const matched = [];

  const missing = [];


  jobSkills.forEach(
    skill => {

      const exists =
        profile.includes(
          String(skill).toLowerCase()
        );


      if (exists) {

        matched.push(skill);

      } else {

        missing.push(skill);

      }

    }
  );


  const score =
    Math.round(
      (
        matched.length /
        jobSkills.length
      ) * 100
    );


  return {

    score,

    matched,

    missing

  };

}


/* =========================================================
   REAL SKILL GAP
   ========================================================= */

function extractSkillGap(job) {

  const result =
    calculatePersonalMatch(job);


  return result.missing.slice(0, 5);

}/* =========================================================
   DATE HANDLING
   ========================================================= */

function dateBucket(
  value,
  now = new Date()
) {

  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {

    return 'Unknown date';

  }


  const [y, m, d] =
    value
      .split('-')
      .map(Number);


  const day =
    new Date(
      y,
      m - 1,
      d
    );


  if (
    day.getFullYear() !== y ||
    day.getMonth() !== m - 1 ||
    day.getDate() !== d
  ) {

    return 'Unknown date';

  }


  const current =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );


  if (day > current) {

    return 'Unknown date';

  }


  if (
    day.getTime() ===
    current.getTime()
  ) {

    return 'Today';

  }


  const monday =
    new Date(current);


  monday.setDate(
    current.getDate() -
    (
      (current.getDay() + 6) % 7
    )
  );


  if (day >= monday) {

    return 'This Week';

  }


  if (
    day.getFullYear() ===
      current.getFullYear() &&
    day.getMonth() ===
      current.getMonth()
  ) {

    return 'This Month';

  }


  return 'Older';

}


/* =========================================================
   FRESHNESS
   ========================================================= */

function freshnessLabel(date) {

  if (!date) {

    return 'DATE UNKNOWN';

  }


  const posted =
    new Date(
      date + 'T00:00:00'
    );


  if (
    Number.isNaN(
      posted.getTime()
    )
  ) {

    return 'DATE UNKNOWN';

  }


  const today =
    new Date();


  const current =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );


  const diff =
    Math.floor(
      (
        current.getTime() -
        posted.getTime()
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    );


  if (diff < 0) {

    return 'DATE UNKNOWN';

  }


  if (diff === 0) {

    return 'NEW TODAY';

  }


  if (diff <= 3) {

    return 'RECENT';

  }


  if (diff <= 7) {

    return 'THIS WEEK';

  }


  if (diff <= 30) {

    return 'THIS MONTH';

  }


  return 'OLDER';

}


/* =========================================================
   DOM HELPERS
   ========================================================= */

function element(
  tag,
  className,
  value
) {

  const el =
    document.createElement(tag);


  if (className) {

    el.className =
      className;

  }


  if (
    value !== undefined
  ) {

    el.textContent =
      String(value);

  }


  return el;

}


function addOptions(
  select,
  values
) {

  [
    ...new Set(
      values
        .filter(Boolean)
        .map(String)
    )
  ]

    .sort(
      (a, b) =>
        a.localeCompare(b)
    )

    .forEach(
      value => {

        const opt =
          element(
            'option',
            '',
            value
          );


        opt.value =
          value;


        select.append(opt);

      }
    );

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
        'Untitled listing'
    );


  title.id =
    'modalTitle';


  content.append(title);


  content.append(
    element(
      'p',
      'company',
      job.company ||
        'Company not provided'
    )
  );


  const personal =
    calculatePersonalMatch(job);


  const matchBox =
    element(
      'div',
      'modal-info'
    );


  matchBox.append(

    element(
      'p',
      '',
      `Personal Match: ${personal.score}%`
    ),

    element(
      'p',
      '',
      `Matched profile skills: ${
        personal.matched.length
          ? personal.matched.join(', ')
          : 'None detected'
      }`
    ),

    element(
      'p',
      '',
      `Skills to explore: ${
        personal.missing.length
          ? personal.missing.join(', ')
          : 'None detected'
      }`
    )

  );


  content.append(matchBox);


  const info =
    element(
      'div',
      'modal-info'
    );


  [

    `Location: ${
      job.location ||
      'Not provided'
    }`,

    `Type: ${
      job.job_type ||
      'Not provided'
    }`,

    `Crawler Score: ${
      job.score || 0
    }/100`,

    job.is_remote
      ? 'Remote: Confirmed'
      : 'Remote: Not confirmed',

    job.date_posted
      ? `Posted: ${job.date_posted}`
      : 'Posted: Date unavailable'

  ]

    .forEach(
      textValue => {

        info.append(
          element(
            'p',
            '',
            textValue
          )
        );

      }
    );


  content.append(info);


  if (
    Array.isArray(job.matched_skills) &&
    job.matched_skills.length
  ) {

    content.append(
      element(
        'h3',
        '',
        'Matched Skills'
      )
    );


    const skills =
      element(
        'div',
        'skills'
      );


    job.matched_skills.forEach(
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


    content.append(skills);

  }


  const description =
    job.description ||
    job.job_description ||
    job.description_text;


  if (description) {

    content.append(
      element(
        'h3',
        '',
        'Job Description'
      )
    );


    content.append(
      element(
        'p',
        '',
        description
      )
    );

  }


  const link =
    safeLink(job.job_url);


  if (link) {

    const a =
      element(
        'a',
        'modal-link',
        'Open Original Job ↗'
      );


    a.href =
      link;

    a.target =
      '_blank';

    a.rel =
      'noopener noreferrer';


    content.append(a);

  }


  modal.hidden =
    false;

}/* =========================================================
   JOB CARD
   ========================================================= */

function jobCard(job) {

  const card =
    element(
      'article',
      'job'
    );

  const id =
    jobId(job);

  if (
    savedJobs.has(id)
  ) {

    card.classList.add(
      'saved'
    );

  }


  const head =
    element(
      'div',
      'job-head'
    );


  const source =
    element(
      'span',
      'source',
      job.source ||
        'Job Board'
    );


  const freshness =
    element(
      'span',
      'freshness-badge',
      freshnessLabel(
        job.date_posted
      )
    );


  head.append(
    source,
    freshness
  );


  const title =
    element(
      'h3',
      '',
      job.title ||
        'Untitled listing'
    );


  const company =
    element(
      'p',
      'company',
      job.company ||
        'Company not provided'
    );


  const meta =
    element(
      'div',
      'meta'
    );


  meta.append(

    element(
      'span',
      '',
      job.location ||
        'Location unavailable'
    ),

    element(
      'span',
      '',
      job.job_type ||
        'Type unavailable'
    ),

    element(
      'span',
      '',
      job.is_remote
        ? 'Remote'
        : 'On-site / Unknown'
    )

  );


  const personal =
    calculatePersonalMatch(job);


  const scoreRow =
    element(
      'div',
      'score-row'
    );


  scoreRow.append(

    element(
      'span',
      '',
      `Crawler Score: ${
        job.score || 0
      }`
    ),

    element(
      'span',
      'personal-match',
      `Personal Match: ${
        personal.score
      }%`
    )

  );


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


  const gap =
    extractSkillGap(job);


  if (gap.length) {

    const gapBox =
      element(
        'div',
        'skill-gap'
      );


    gapBox.append(
      element(
        'strong',
        '',
        'Skills to explore:'
      )
    );


    const gapTags =
      element(
        'div',
        'gap-tags'
      );


    gap.forEach(
      skill => {

        gapTags.append(
          element(
            'span',
            'gap-tag',
            skill
          )
        );

      }
    );


    gapBox.append(
      gapTags
    );


    card.append(
      gapBox
    );

  }


  const reasons =
    element(
      'div',
      'reasons'
    );


  if (personal.matched.length) {

    reasons.textContent =
      `Matches your profile: ${
        personal.matched.join(', ')
      }`;

  } else {

    reasons.textContent =
      'No direct profile skill match detected.';

  }


  const actions =
    element(
      'div',
      'job-foot'
    );


  const saveButton =
    element(
      'button',
      'save-job',
      savedJobs.has(id)
        ? 'Saved'
        : 'Save'
    );


  saveButton.type =
    'button';


  saveButton.addEventListener(
    'click',
    () => {

      toggleSavedJob(job);

    }
  );


  const detailsButton =
    element(
      'button',
      'details-button',
      'View Details'
    );


  detailsButton.type =
    'button';


  detailsButton.addEventListener(
    'click',
    () => {

      openJobModal(job);

    }
  );


  const statusSelect =
    element(
      'select',
      'status-select'
    );


  statusSelect.setAttribute(
    'aria-label',
    'Application status'
  );


  const currentStatus =
    getApplicationStatus(job);


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
    currentStatus;


  statusSelect.addEventListener(
    'change',
    () => {

      setApplicationStatus(
        job,
        statusSelect.value
      );

    }
  );


  actions.append(
    saveButton,
    detailsButton,
    statusSelect
  );


  card.append(
    head,
    title,
    company,
    meta,
    scoreRow,
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

  const high =
    $('insightHigh');

  const active =
    $('insightActive');

  const topSkills =
    $('insightSkills');


  if (saved) {

    saved.textContent =
      savedJobs.size;

  }


  if (remote) {

    remote.textContent =
      allJobs.filter(
        job =>
          Boolean(job.is_remote)
      ).length;

  }


  if (high) {

    high.textContent =
      allJobs.filter(
        job =>
          Number(job.score || 0) >= 80
      ).length;

  }


  if (active) {

    active.textContent =
      allJobs.filter(
        job => {

          const status =
            getApplicationStatus(job);

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
                (counts.get(skill) || 0) + 1
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
        .slice(0, 5);


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
    );


  const period =
    String(
      $('period')?.value || ''
    );


  const skill =
    String(
      $('skill')?.value || ''
    )
      .trim()
      .toLowerCase();


  const status =
    String(
      $('status')?.value || ''
    );


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
            .includes(search)
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
            .includes(location)
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
            .includes(jobType)
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
                  .includes(skill)
            )
      );

  }


  /* APPLICATION STATUS */

  if (
    status &&
    status !== 'all'
  ) {

    jobs =
      jobs.filter(
        job =>
          getApplicationStatus(job) ===
          status
      );

  }


  /* MINIMUM PERSONAL MATCH */

  if (
    Number.isFinite(minimum) &&
    minimum > 0
  ) {

    jobs =
      jobs.filter(
        job =>
          calculatePersonalMatch(job)
            .score >= minimum
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
          calculatePersonalMatch(b).score -
          calculatePersonalMatch(a).score
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
        Number(b.score || 0) -
        Number(a.score || 0)
      );

    }
  );


  return jobs;

}/* =========================================================
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

}


/* =========================================================
   INIT
   ========================================================= */

async function init() {

  loadSavedJobs();

  loadApplicationStatus();


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


  const clearButton =
    $('clearFilters');


  if (clearButton) {

    clearButton.addEventListener(
      'click',
      resetFilters
    );

  }


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


  const exportButton =
    $('exportSaved');


  if (exportButton) {

    exportButton.addEventListener(
      'click',
      exportSavedJobs
    );

  }


  const analyzeButton =
    $('agentAnalyze');


  if (analyzeButton) {

    analyzeButton.addEventListener(
      'click',
      analyzeBestOpportunity
    );

  }


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


  try {

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


    allJobs =
      Array.isArray(data)
        ? data
        : [];


    /* LOCATION OPTIONS */

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


    /* JOB TYPE OPTIONS */

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


    /* SKILL OPTIONS */

    const skillSelect =
      $('skill');


    if (skillSelect) {

      addOptions(
        skillSelect,
        JOB_SKILL_POOL
      );

    }


    updateSavedUI();

    updateInsights();


    if (allJobs.length) {

      updateAgent(
        getBestOpportunity()
      );

    }


    render();

  } catch (error) {

    console.error(
      'Job Radar load error:',
      error
    );


    allJobs =
      [];


    render();

  }

}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  init
);