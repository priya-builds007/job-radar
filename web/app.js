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
          calculatePersonalMatch(
            job
          ).score;


        return [

          job.title || '',

          job.company || '',

          job.location || '',

          job.score || 0,

          `${match}%`,

          getApplicationStatus(
            job
          ),

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


  const a =
    document.createElement(
      'a'
    );


  a.href =
    url;

  a.download =
    'job-radar-saved-jobs.csv';


  document.body.appendChild(a);

  a.click();

  a.remove();


  URL.revokeObjectURL(
    url
  );

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

    applicationStatus.delete(
      id
    );

  } else {

    applicationStatus.set(
      id,
      status
    );

    savedJobs.add(
      id
    );

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


  return pattern.test(
    text
  );

}


function getJobText(job) {

  return [

    job.title,

    job.description,

    job.job_description,

    job.description_text,

    Array.isArray(
      job.matched_skills
    )
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


  const found =
    [];


  JOB_SKILL_POOL.forEach(
    skill => {

      if (
        skillMentioned(
          text,
          skill
        )
      ) {

        found.push(
          skill
        );

      }

    }
  );


  return found.slice(
    0,
    8
  );

}


/* =========================================================
   PERSONALIZED MATCH SCORE
   ========================================================= */

function getJobSkills(job) {

  const detected =
    extractMentionedSkills(
      job
    );


  if (
    Array.isArray(
      job.matched_skills
    )
  ) {

    job.matched_skills.forEach(
      skill => {

        const clean =
          String(
            skill
          ).trim();


        if (

          clean &&

          !detected.some(
            item =>
              item.toLowerCase() ===
              clean.toLowerCase()
          )

        ) {

          detected.push(
            clean
          );

        }

      }
    );

  }


  return detected;

}


function calculatePersonalMatch(
  job
) {

  const jobSkills =
    getJobSkills(
      job
    );


  if (
    !jobSkills.length
  ) {

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


  const matched =
    [];

  const missing =
    [];


  jobSkills.forEach(
    skill => {

      const exists =
        profile.includes(
          String(
            skill
          ).toLowerCase()
        );


      if (exists) {

        matched.push(
          skill
        );

      } else {

        missing.push(
          skill
        );

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

function extractSkillGap(
  job
) {

  const result =
    calculatePersonalMatch(
      job
    );


  return result.missing.slice(
    0,
    5
  );

}


/* =========================================================
   DATE HANDLING
   ========================================================= */

function dateBucket(
  value,
  now = new Date()
) {

  if (

    !value ||

    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )

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


  if (
    day > current
  ) {

    return 'Unknown date';

  }


  if (

    day.getTime() ===
    current.getTime()

  ) {

    return 'Today';

  }


  const monday =
    new Date(
      current
    );


  monday.setDate(

    current.getDate() -

    (
      current.getDay() + 6
    ) % 7

  );


  if (
    day >= monday
  ) {

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

function freshnessLabel(
  date
) {

  if (!date) {

    return 'DATE UNKNOWN';

  }


  const posted =
    new Date(
      date +
      'T00:00:00'
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


  if (
    diff < 0
  ) {

    return 'DATE UNKNOWN';

  }


  if (
    diff === 0
  ) {

    return 'NEW TODAY';

  }


  if (
    diff <= 3
  ) {

    return 'RECENT';

  }


  if (
    diff <= 7
  ) {

    return 'THIS WEEK';

  }


  if (
    diff <= 30
  ) {

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
    document.createElement(
      tag
    );


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


        select.append(
          opt
        );

      }
    );

}


/* =========================================================
   JOB DETAILS MODAL
   ========================================================= */

function openJobModal(
  job
) {

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


  content.append(
    title
  );


  content.append(

    element(
      'p',
      'company',
      job.company ||
        'Company not provided'
    )

  );


  const personal =
    calculatePersonalMatch(
      job
    );


  const matchBox =
    element(
      'div',
      'modal-info'
    );


  matchBox.append(

    element(
      'p',
      '',
      `Personal Match: ${
        personal.score
      }%`
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


  content.append(
    matchBox
  );


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
      ? `Posted: ${
          job.date_posted
        }`
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


  content.append(
    info
  );


  if (

    Array.isArray(
      job.matched_skills
    ) &&

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


    job.matched_skills
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


    content.append(
      skills
    );

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
    safeLink(
      job.job_url
    );


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


    content.append(
      a
    );

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


  const title =
    element(
      'h4',
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


  head.append(
    source,
    title,
    company
  );


  const score =
    element(
      'span',
      'score',
      `${Number(
        job.score || 0
      )}/100`
    );


  head.append(
    score
  );


  card.append(
    head
  );


  const meta =
    element(
      'div',
      'meta'
    );


  [

    job.location ||
      'Location not provided',

    job.job_type ||
      'Type not specified',

    job.is_remote
      ? 'Remote'
      : 'On-site / Unknown'

  ]

    .forEach(
      value => {

        meta.append(

          element(
            'span',
            '',
            value
          )

        );

      }
    );


  card.append(
    meta
  );


  const freshness =
    element(
      'span',
      'freshness-badge',
      freshnessLabel(
        job.date_posted
      )
    );


  card.append(
    freshness
  );


  const personal =
    calculatePersonalMatch(
      job
    );


  const matchRow =
    element(
      'div',
      'score-row'
    );


  matchRow.append(

    element(
      'span',
      'score-label',
      'Personal Match'
    ),

    element(
      'strong',
      'personal-match',
      `${personal.score}%`
    )

  );


  card.append(
    matchRow
  );


  if (
    job.description ||
    job.job_description
  ) {

    const description =
      element(
        'p',
        'job-description',
        (
          job.description ||
          job.job_description ||
          ''
        )
          .replace(
            /\s+/g,
            ' '
          )
          .trim()
      );


    card.append(
      description
    );

  }


  const skills =
    element(
      'div',
      'skills'
    );


  const jobSkills =
    getJobSkills(
      job
    );


  jobSkills
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


  if (
    skills.children.length
  ) {

    card.append(
      skills
    );

  }


  const gap =
    extractSkillGap(
      job
    );


  if (
    gap.length
  ) {

    const gapBox =
      element(
        'div',
        'skill-gap'
      );


    gapBox.append(

      element(
        'strong',
        '',
        'Skill Gap'
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


  if (
    Array.isArray(
      job.reasons
    ) &&
    job.reasons.length
  ) {

    const reasons =
      element(
        'ul',
        'reasons'
      );


    job.reasons
      .slice(0, 4)
      .forEach(
        reason => {

          reasons.append(

            element(
              'li',
              '',
              reason
            )

          );

        }
      );


    card.append(
      reasons
    );

  }


  /* Application Tracker */

  const tracker =
    element(
      'div',
      'tracker'
    );


  tracker.append(

    element(
      'span',
      'tracker-label',
      'Application'
    )

  );


  const status =
    element(
      'select',
      'status-select'
    );


  status.setAttribute(
    'aria-label',
    'Application status'
  );


  const currentStatus =
    getApplicationStatus(
      job
    );


  const notTracked =
    element(
      'option',
      '',
      'Not tracked'
    );


  notTracked.value =
    'not-tracked';


  status.append(
    notTracked
  );


  STATUS_OPTIONS.forEach(
    optionValue => {

      const option =
        element(
          'option',
          '',
          optionValue
        );


      option.value =
        optionValue;


      status.append(
        option
      );

    }
  );


  status.value =
    currentStatus;


  status.addEventListener(
    'change',
    event => {

      setApplicationStatus(
        job,
        event.target.value
      );

    }
  );


  tracker.append(
    status
  );


  card.append(
    tracker
  );


  /* Buttons */

  const foot =
    element(
      'div',
      'job-foot'
    );


  const details =
    element(
      'button',
      'details-button',
      'View Details'
    );


  details.type =
    'button';


  details.addEventListener(
    'click',
    () => {

      openJobModal(
        job
      );

    }
  );


  foot.append(
    details
  );


  const save =
    element(
      'button',
      'save-job',
      savedJobs.has(id)
        ? 'Saved'
        : 'Save'
    );


  save.type =
    'button';


  save.setAttribute(
    'aria-pressed',
    String(
      savedJobs.has(id)
    )
  );


  save.addEventListener(
    'click',
    () => {

      toggleSavedJob(
        job
      );

    }
  );


  foot.append(
    save
  );


  const link =
    safeLink(
      job.job_url
    );


  if (link) {

    const open =
      element(
        'a',
        'modal-link',
        'Open Original ↗'
      );


    open.href =
      link;


    open.target =
      '_blank';


    open.rel =
      'noopener noreferrer';


    foot.append(
      open
    );

  }


  card.append(
    foot
  );


  return card;

}


/* =========================================================
   INSIGHTS
   ========================================================= */

function updateInsights() {

  const total =
    allJobs.length;


  const remote =
    allJobs.filter(
      job =>
        Boolean(
          job.is_remote
        )
    ).length;


  const saved =
    savedJobs.size;


  const tracked =
    allJobs.filter(
      job =>
        getApplicationStatus(
          job
        ) !== 'not-tracked'
    ).length;


  const today =
    allJobs.filter(
      job =>
        dateBucket(
          job.date_posted
        ) === 'Today'
    ).length;


  const thisWeek =
    allJobs.filter(
      job =>
        dateBucket(
          job.date_posted
        ) === 'This Week'
    ).length;


  const values = {

    insightTotal:
      total,

    insightRemote:
      remote,

    insightSaved:
      saved,

    insightTracked:
      tracked,

    insightToday:
      today,

    insightWeek:
      thisWeek

  };


  Object.entries(
    values
  ).forEach(
    ([id, value]) => {

      const el =
        $(id);


      if (el) {

        el.textContent =
          value;

      }

    }
  );

}


/* =========================================================
   FILTERING
   ========================================================= */

function getFilteredJobs() {

  const search =
    String(
      $('search')?.value ||
      ''
    )
      .trim()
      .toLowerCase();


  const location =
    String(
      $('location')?.value ||
      ''
    )
      .trim()
      .toLowerCase();


  const jobType =
    String(
      $('jobType')?.value ||
      ''
    )
      .trim()
      .toLowerCase();


  const remote =
    String(
      $('remote')?.value ||
      ''
    );


  const period =
    String(
      $('period')?.value ||
      ''
    );


  const skill =
    String(
      $('skill')?.value ||
      ''
    )
      .trim()
      .toLowerCase();


  const status =
    String(
      $('status')?.value ||
      ''
    );


  const minimum =
    Number(
      $('minimum')?.value ||
      0
    );


  let jobs =
    [...allJobs];


  if (search) {

    jobs =
      jobs.filter(
        job =>
          getJobText(
            job
          ).includes(
            search
          )
      );

  }


  if (location) {

    jobs =
      jobs.filter(
        job =>
          String(
            job.location ||
            ''
          )
            .toLowerCase()
            .includes(
              location
            )
      );

  }


  if (jobType) {

    jobs =
      jobs.filter(
        job =>
          String(
            job.job_type ||
            ''
          )
            .toLowerCase()
            .includes(
              jobType
            )
      );

  }


  if (remote === 'remote') {

    jobs =
      jobs.filter(
        job =>
          Boolean(
            job.is_remote
          )
      );

  }


  if (remote === 'onsite') {

    jobs =
      jobs.filter(
        job =>
          !Boolean(
            job.is_remote
          )
      );

  }


  if (period) {

    jobs =
      jobs.filter(
        job =>
          dateBucket(
            job.date_posted
          ) === period
      );

  }


  if (skill) {

    jobs =
      jobs.filter(
        job =>
          getJobSkills(
            job
          )
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


  if (
    Number.isFinite(
      minimum
    ) &&
    minimum > 0
  ) {

    jobs =
      jobs.filter(
        job =>
          Number(
            calculatePersonalMatch(
              job
            ).score
          ) >= minimum
      );

  }


  if (
    showSavedOnly
  ) {

    jobs =
      jobs.filter(
        job =>
          savedJobs.has(
            jobId(job)
          )
      );

  }


  const sort =
    $('sort')?.value ||
    'score';


  jobs.sort(
    (a, b) => {

      if (
        sort ===
        'personal'
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
        sort ===
        'recent'
      ) {

        return String(
          b.date_posted ||
          ''
        ).localeCompare(
          String(
            a.date_posted ||
            ''
          )
        );

      }


      if (
        sort ===
        'company'
      ) {

        return String(
          a.company ||
          ''
        ).localeCompare(
          String(
            b.company ||
            ''
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


  if (!results) {
    return;
  }


  results.replaceChildren();


  const jobs =
    getFilteredJobs();


  const count =
    $('resultsCount');


  if (count) {

    count.textContent =
      jobs.length;

  }


  if (!jobs.length) {

    results.append(

      element(
        'div',
        'notice',
        'No jobs match your current filters.'
      )

    );

    return;

  }


  buckets.forEach(
    bucket => {

      const bucketJobs =
        jobs.filter(
          job =>
            dateBucket(
              job.date_posted
            ) === bucket
        );


      if (
        !bucketJobs.length
      ) {

        return;

      }


      const section =
        element(
          'section',
          'bucket'
        );


      const heading =
        element(
          'div',
          'bucket-header'
        );


      heading.append(

        element(
          'h3',
          '',
          bucket
        ),

        element(
          'span',
          '',
          `${bucketJobs.length} jobs`
        )

      );


      section.append(
        heading
      );


      const cards =
        element(
          'div',
          'cards'
        );


      bucketJobs.forEach(
        job => {

          cards.append(
            jobCard(
              job
            )
          );

        }
      );


      section.append(
        cards
      );


      results.append(
        section
      );

    }
  );

}


/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetFilters() {

  controls.forEach(
    id => {

      const el =
        $(id);


      if (!el) {
        return;
      }


      if (
        el.tagName ===
        'SELECT'
      ) {

        el.selectedIndex =
          0;

      } else {

        el.value =
          '';

      }

    }
  );


  const minimum =
    $('minimum');


  if (minimum) {

    minimum.value =
      '0';

  }


  showSavedOnly =
    false;


  updateSavedUI();

  render();

}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {

  loadSavedJobs();

  loadApplicationStatus();

  updateSavedUI();


  controls.forEach(
    id => {

      const el =
        $(id);


      if (!el) {
        return;
      }


      el.addEventListener(
        'input',
        render
      );


      el.addEventListener(
        'change',
        render
      );

    }
  );


  const reset =
    $('reset');


  if (reset) {

    reset.addEventListener(
      'click',
      resetFilters
    );

  }


  /* Opportunity Agent */

  const agentAnalyze =
    $('agentAnalyze');


  if (agentAnalyze) {

    agentAnalyze.addEventListener(
      'click',
      analyzeBestOpportunity
    );

  }


  /* Saved Jobs */

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

  const exportSaved =
    $('exportSaved');


  if (exportSaved) {

    exportSaved.addEventListener(
      'click',
      exportSavedJobs
    );

  }


  /* Modal */

  const modal =
    $('jobModal');


  const modalClose =
    $('modalClose');


  if (modalClose) {

    modalClose.addEventListener(
      'click',
      () => {

        modal.hidden =
          true;

      }
    );

  }


  if (modal) {

    modal.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          modal
        ) {

          modal.hidden =
            true;

        }

      }
    );

  }


  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key ===
        'Escape' &&
        modal &&
        !modal.hidden
      ) {

        modal.hidden =
          true;

      }

    }
  );


  /* =======================================================
     LOAD REAL JOB DATA
     ======================================================= */

  try {

    const response =
      await fetch(
        DATA_URL,
        {
          cache:
            'no-store'
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    const jobs =
      Array.isArray(data)
        ? data
        : Array.isArray(
            data.jobs
          )
          ? data.jobs
          : [];


    allJobs =
      jobs.filter(
        job =>

          job &&

          job.relevant !== false &&

          safeLink(
            job.job_url
          ) &&

          Number.isFinite(
            Number(
              job.score
            )
          )

      );


    /* Filters */

    const locationSelect =
      $('location');


    if (
      locationSelect
    ) {

      addOptions(

        locationSelect,

        allJobs.map(
          job =>
            job.location
        )

      );

    }


    const jobTypeSelect =
      $('jobType');


    if (
      jobTypeSelect
    ) {

      addOptions(

        jobTypeSelect,

        allJobs.map(
          job =>
            job.job_type
        )

      );

    }


    const skillSelect =
      $('skill');


    if (
      skillSelect
    ) {

      addOptions(

        skillSelect,

        allJobs.flatMap(
          job =>
            getJobSkills(
              job
            )
        )

      );

    }


    /* Summary */

    const total =
      $('totalJobs');


    if (total) {

      total.textContent =
        allJobs.length;

    }


    const remote =
      $('remoteJobs');


    if (remote) {

      remote.textContent =
        allJobs.filter(
          job =>
            Boolean(
              job.is_remote
            )
        ).length;

    }


    const fresh =
      $('freshJobs');


    if (fresh) {

      fresh.textContent =
        allJobs.filter(
          job => {

            const bucket =
              dateBucket(
                job.date_posted
              );


            return (

              bucket ===
                'Today' ||

              bucket ===
                'This Week'

            );

          }
        ).length;

    }


    const sourceStatus =
      $('sourceStatus');


    if (sourceStatus) {

      sourceStatus.textContent =
        'LIVE JOB DATA';

    }


    updateInsights();


    /* Initialize Opportunity Agent */

    const firstOpportunity =
      getBestOpportunity();


    if (
      firstOpportunity
    ) {

      updateAgent(
        firstOpportunity
      );

    }


    render();

  } catch (error) {

    console.error(
      'Job Radar data loading failed:',
      error
    );


    const results =
      $('results');


    if (results) {

      results.replaceChildren(

        element(
          'div',
          'notice',
          'Unable to load live job data. Please try again later.'
        )

      );

    }


    const sourceStatus =
      $('sourceStatus');


    if (sourceStatus) {

      sourceStatus.textContent =
        'DATA LOAD ERROR';

    }

  }

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