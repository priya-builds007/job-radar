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

/*
 * Skills that can be detected from job descriptions.
 * Skills already present in PROFILE_SKILLS will not be
 * shown as "Skills to explore".
 */
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

const $ = id => document.getElementById(id);

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
let savedJobs = new Set();
let applicationStatus = new Map();
let showSavedOnly = false;


/* =========================
   SAFE HELPERS
   ========================= */

function safeLink(value) {
  try {
    const u = new URL(value);

    return [
      'http:',
      'https:'
    ].includes(u.protocol) &&
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
    `${job.title || ''}|${job.company || ''}|${job.location || ''}`
  );
}


/* =========================
   SAVED JOBS
   ========================= */

function loadSavedJobs() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(SAVED_KEY) || '[]'
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


function persistSavedJobs() {
  try {
    localStorage.setItem(
      SAVED_KEY,
      JSON.stringify([...savedJobs])
    );
  } catch {}
}


function toggleSavedJob(job) {
  const id = jobId(job);

  if (savedJobs.has(id)) {
    savedJobs.delete(id);
  } else {
    savedJobs.add(id);
  }

  persistSavedJobs();
  updateSavedUI();
  render();
}


function updateSavedUI() {
  const count = $('savedCount');
  const insight = $('insightSaved');
  const button = $('savedToggle');

  if (count) {
    count.textContent = savedJobs.size;
  }

  if (insight) {
    insight.textContent = savedJobs.size;
  }

  if (button) {
    button.classList.toggle(
      'active',
      showSavedOnly
    );

    button.setAttribute(
      'aria-pressed',
      String(showSavedOnly)
    );
  }
}


/* =========================
   APPLICATION TRACKER
   ========================= */

function loadApplicationStatus() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STATUS_KEY) || '{}'
    );

    applicationStatus = new Map(
      Object.entries(
        stored && typeof stored === 'object'
          ? stored
          : {}
      )
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
          applicationStatus.entries()
        )
      )
    );
  } catch {}
}


function getApplicationStatus(job) {
  return applicationStatus.get(jobId(job)) ||
    'not-tracked';
}


function setApplicationStatus(job, status) {
  const id = jobId(job);

  if (status === 'not-tracked') {
    applicationStatus.delete(id);
  } else {
    applicationStatus.set(id, status);
    savedJobs.add(id);
  }

  persistApplicationStatus();
  persistSavedJobs();

  updateSavedUI();
  updateInsights();
  render();
}/* =========================
   SKILL DETECTION
   ========================= */

function skillMentioned(text, skill) {
  const normalized = skill.toLowerCase();

  const escaped = normalized.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const pattern = new RegExp(
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


/*
 * Finds skills mentioned in the job.
 */
function extractMentionedSkills(job) {
  const text = getJobText(job);

  const found = [];

  JOB_SKILL_POOL.forEach(skill => {
    if (skillMentioned(text, skill)) {
      found.push(skill);
    }
  });

  return found.slice(0, 8);
}


/*
 * Finds only additional skills that are NOT
 * already present in the user's profile.
 */
function extractSkillGap(job) {
  const text = getJobText(job);

  const profileSet =
    new Set(
      PROFILE_SKILLS.map(
        skill => skill.toLowerCase()
      )
    );

  const found = [];

  JOB_SKILL_POOL.forEach(skill => {

    const alreadyKnown =
      profileSet.has(
        skill.toLowerCase()
      );

    if (
      !alreadyKnown &&
      skillMentioned(text, skill)
    ) {
      found.push(skill);
    }

  });

  /*
   * Also check matched_skills from processed data.
   * This helps when the crawler already detected
   * a skill that is not in JOB_SKILL_POOL.
   */
  if (
    Array.isArray(job.matched_skills)
  ) {

    job.matched_skills.forEach(skill => {

      const clean =
        String(skill).trim();

      if (!clean) {
        return;
      }

      const alreadyKnown =
        profileSet.has(
          clean.toLowerCase()
        );

      if (
        !alreadyKnown &&
        !found.some(
          item =>
            item.toLowerCase() ===
            clean.toLowerCase()
        )
      ) {
        found.push(clean);
      }

    });
  }

  return found.slice(0, 5);
}


/* =========================
   DATE HANDLING
   ========================= */

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
    value.split('-').map(Number);

  const day = new Date(
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

  const current = new Date(
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
    (current.getDay() + 6) % 7
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


/* =========================
   FRESHNESS
   ========================= */

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

  const today = new Date();

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
      (1000 * 60 * 60 * 24)
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


/* =========================
   DOM HELPERS
   ========================= */

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
    .forEach(value => {

      const opt =
        element(
          'option',
          '',
          value
        );

      opt.value = value;

      select.append(opt);
    });
}


/* =========================
   JOB DETAILS MODAL
   ========================= */

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

    `Score: ${
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
    .forEach(textValue => {

      info.append(
        element(
          'p',
          '',
          textValue
        )
      );

    });


  content.append(info);


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
      .forEach(skill => {

        skills.append(
          element(
            'span',
            'skill',
            skill
          )
        );

      });


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

    a.href = link;

    a.target = '_blank';

    a.rel =
      'noopener noreferrer';

    content.append(a);
  }


  modal.hidden = false;
}/* =========================
   JOB CARD
   ========================= */

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


  const top =
    element(
      'div',
      ''
    );


  top.append(

    element(
      'span',
      'source',
      job.source ||
        'Job board'
    ),

    element(
      'h4',
      '',
      job.title ||
        'Untitled listing'
    ),

    element(
      'p',
      'company',
      job.company ||
        'Company not provided'
    )

  );


  const score =
    element(
      'div',
      'score'
    );


  score.setAttribute(
    'aria-label',
    `Fit score ${
      job.score
    } out of 100`
  );


  score.append(

    element(
      'strong',
      '',
      job.score
    ),

    element(
      'small',
      '',
      'FIT / 100'
    )

  );


  head.append(
    top,
    score
  );


  card.append(head);


  /* Freshness badge */

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


  /* Meta */

  const meta =
    element(
      'div',
      'meta'
    );


  [
    job.location ||
      'Location not provided',

    job.job_type ||
      'Type not provided',

    job.is_remote === true
      ? 'Remote confirmed'
      : 'Remote not confirmed',

    job.date_posted
      ? `Posted ${
          job.date_posted
        }`
      : 'Posting date unknown'

  ].forEach(value => {

    meta.append(
      element(
        'span',
        '',
        value
      )
    );

  });


  card.append(meta);


/* =========================
   MATCHED SKILLS
   ========================= */

  const skills =
    element(
      'div',
      'skills'
    );

  (
    Array.isArray(
      job.matched_skills
    ) &&
    job.matched_skills.length
      ? job.matched_skills
      : [
          'No skills detected in available text'
        ]
  ).forEach(skill => {

    skills.append(
      element(
        'span',
        'skill',
        skill
      )
    );

  });

  card.append(skills);


/* =========================
   REAL SKILL GAP
   ========================= */

  const skillGap =
    extractSkillGap(job);

  if (skillGap.length) {

    const gapBox =
      element(
        'div',
        'skill-gap'
      );


    gapBox.append(
      element(
        'strong',
        '',
        'Skills to explore'
      )
    );


    const gapTags =
      element(
        'div',
        'gap-tags'
      );


    skillGap.forEach(
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


/* =========================
   REASONS
   ========================= */

  if (
    Array.isArray(
      job.reasons
    ) &&
    job.reasons.length
  ) {

    const why =
      element(
        'ul',
        'reasons'
      );


    job.reasons.forEach(
      reason => {

        why.append(
          element(
            'li',
            '',
            reason
          )
        );

      }
    );


    card.append(why);
  }


/* =========================
   APPLICATION TRACKER
   ========================= */

  const tracker =
    element(
      'div',
      'tracker'
    );


  tracker.append(
    element(
      'span',
      'tracker-label',
      'APPLICATION'
    )
  );


  const statusSelect =
    element(
      'select',
      'status-select'
    );


  const statusValues = [
    [
      'not-tracked',
      'Not tracked'
    ],

    ...STATUS_OPTIONS.map(
      status => [
        status,
        status
      ]
    )
  ];


  statusValues.forEach(
    ([value, label]) => {

      const option =
        element(
          'option',
          '',
          label
        );

      option.value =
        value;

      statusSelect.append(
        option
      );

    }
  );


  statusSelect.value =
    getApplicationStatus(
      job
    );


  statusSelect.setAttribute(
    'aria-label',
    `Application status for ${
      job.title ||
      'job'
    }`
  );


  statusSelect.addEventListener(
    'change',
    event => {

      setApplicationStatus(
        job,
        event.target.value
      );

    }
  );


  tracker.append(
    statusSelect
  );

  card.append(
    tracker
  );


/* =========================
   VIEW DETAILS
   ========================= */

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


  card.append(
    detailsButton
  );


/* =========================
   FOOTER
   ========================= */

  const foot =
    element(
      'div',
      'job-foot'
    );


  foot.append(
    element(
      'span',
      '',
      job.date_posted
        ? 'Source date · ' +
          job.date_posted
        : 'Source date unavailable'
    )
  );


/* Save button */

  const saveButton =
    element(
      'button',
      'save-job',
      savedJobs.has(
        jobId(job)
      )
        ? '★ Saved'
        : '☆ Save'
    );


  saveButton.type =
    'button';


  saveButton.setAttribute(
    'aria-pressed',
    String(
      savedJobs.has(
        jobId(job)
      )
    )
  );


  saveButton.addEventListener(
    'click',
    () => {
      toggleSavedJob(job);
    }
  );


  foot.append(
    saveButton
  );


/* Original job link */

  const link =
    safeLink(
      job.job_url
    );


  if (link) {

    const a =
      element(
        'a',
        '',
        'Open original ↗'
      );


    a.href =
      link;

    a.target =
      '_blank';

    a.rel =
      'noopener noreferrer';


    a.setAttribute(
      'aria-label',
      `Open original ${
        job.title ||
        'job'
      } listing`
    );


    foot.append(a);
  }


  card.append(
    foot
  );


  return card;
}


/* =========================
   INSIGHTS
   ========================= */

function updateInsights() {

  const remoteCount =
    allJobs.filter(
      job =>
        job.is_remote === true
    ).length;


  const highScoreCount =
    allJobs.filter(
      job =>
        Number(job.score) >= 80
    ).length;


  const activeApplications =
    allJobs.filter(
      job =>
        [
          'Applied',
          'Interview'
        ].includes(
          getApplicationStatus(
            job
          )
        )
    ).length;


  if ($('insightRemote')) {
    $('insightRemote').textContent =
      remoteCount;
  }


  if ($('insightHighScore')) {
    $('insightHighScore').textContent =
      highScoreCount;
  }


  if ($('insightApplications')) {
    $('insightApplications').textContent =
      activeApplications;
  }


  updateSavedUI();


/* Top skills */

  const counts =
    new Map();


  allJobs.forEach(
    job => {

      if (
        !Array.isArray(
          job.matched_skills
        )
      ) {
        return;
      }


      job.matched_skills.forEach(
        skill => {

          const name =
            String(skill).trim();


          if (!name) {
            return;
          }


          counts.set(
            name,
            (
              counts.get(name) ||
              0
            ) + 1
          );

        }
      );

    }
  );


  const topSkills =
    [...counts.entries()]
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 8);


  const container =
    $('topSkills');


  if (!container) {
    return;
  }


  container.replaceChildren();


  if (!topSkills.length) {

    container.append(
      element(
        'span',
        'insight-muted',
        'No skills detected'
      )
    );

    return;
  }


  topSkills.forEach(
    ([skill, count]) => {

      const tag =
        element(
          'span',
          'insight-tag',
          `${skill} · ${count}`
        );

      container.append(tag);

    }
  );
}/* =========================
   MAIN RENDERING
   ========================= */

function render() {

  const q =
    $('search').value
      .trim()
      .toLowerCase();

  const min =
    Number(
      $('minimum').value
    );

  const selectedStatus =
    $('status').value;


  const chosen =
    allJobs.filter(job => {

      const haystack = [
        job.title,
        job.company,
        job.location,
        ...(job.matched_skills || [])
      ]
        .join(' ')
        .toLowerCase();


      const matchesSearch =
        !q ||
        haystack.includes(q);


      const matchesLocation =
        $('location').value === 'all' ||
        job.location ===
          $('location').value;


      const matchesJobType =
        $('jobType').value === 'all' ||
        job.job_type ===
          $('jobType').value;


      const matchesRemote =
        $('remote').value === 'all' ||

        (
          $('remote').value === 'remote' &&
          job.is_remote === true
        ) ||

        (
          $('remote').value === 'onsite' &&
          job.is_remote !== true
        );


      const matchesPeriod =
        $('period').value === 'all' ||
        dateBucket(
          job.date_posted
        ) === $('period').value;


      const matchesSkill =
        $('skill').value === 'all' ||

        (
          Array.isArray(
            job.matched_skills
          ) &&
          job.matched_skills.includes(
            $('skill').value
          )
        );


      const matchesStatus =
        selectedStatus === 'all' ||
        getApplicationStatus(job) ===
          selectedStatus;


      const matchesScore =
        Number(job.score) >= min;


      const matchesSaved =
        !showSavedOnly ||
        savedJobs.has(
          jobId(job)
        );


      return (
        matchesSearch &&
        matchesLocation &&
        matchesJobType &&
        matchesRemote &&
        matchesPeriod &&
        matchesSkill &&
        matchesStatus &&
        matchesScore &&
        matchesSaved
      );
    });


/* =========================
   SORTING
   ========================= */

  const dateValue =
    job =>
      job.date_posted ||
      '0000-00-00';

  const sort =
    $('sort').value;


  chosen.sort(
    (a, b) => {

      if (sort === 'score') {

        return (
          Number(b.score) -
            Number(a.score) ||

          dateValue(b).localeCompare(
            dateValue(a)
          )
        );
      }


      if (sort === 'oldest') {

        return (
          dateValue(a).localeCompare(
            dateValue(b)
          ) ||

          Number(b.score) -
            Number(a.score)
        );
      }


      return (
        dateValue(b).localeCompare(
          dateValue(a)
        ) ||

        Number(b.score) -
          Number(a.score)
      );
    }
  );


/* =========================
   RESULT COUNT
   ========================= */

  $('resultCount').textContent =
    `${chosen.length} of ${allJobs.length} leads shown`;


/* =========================
   RESULTS
   ========================= */

  const results =
    $('results');

  results.replaceChildren();


  if (!chosen.length) {

    const empty =
      element(
        'div',
        'empty'
      );


    empty.append(

      element(
        'strong',
        '',
        allJobs.length
          ? 'No matching jobs'
          : 'No verified jobs yet'
      ),

      element(
        'p',
        '',
        allJobs.length
          ? 'Try clearing a filter or lowering the minimum score.'
          : 'Run the crawler and processor to populate this radar with real data.'
      )

    );


    results.append(
      empty
    );

    return;
  }


/* =========================
   DATE BUCKETS
   ========================= */

  buckets.forEach(
    label => {

      const jobs =
        chosen.filter(
          job =>
            dateBucket(
              job.date_posted
            ) === label
        );


      if (!jobs.length) {
        return;
      }


      const section =
        element(
          'section',
          'bucket'
        );


      const header =
        element(
          'div',
          'bucket-header'
        );


      header.append(

        element(
          'h3',
          '',
          label
        ),

        element(
          'span',
          'count',
          jobs.length
        )

      );


      const cards =
        element(
          'div',
          'cards'
        );


      jobs.forEach(
        job => {

          cards.append(
            jobCard(job)
          );

        }
      );


      section.append(
        header,
        cards
      );


      results.append(
        section
      );

    }
  );
}


/* =========================
   RESET FILTERS
   ========================= */

function resetFilters() {

  controls.forEach(
    id => {

      if (id === 'search') {
        $(id).value = '';
      } else {
        $(id).selectedIndex = 0;
      }

    }
  );


  showSavedOnly =
    false;


  updateSavedUI();

  render();

  $('search').focus();
}


/* =========================
   INITIALISATION
   ========================= */

async function init() {

  loadSavedJobs();

  loadApplicationStatus();


/* Filter listeners */

  controls.forEach(
    id => {

      $(id).addEventListener(
        id === 'search'
          ? 'input'
          : 'change',
        render
      );

    }
  );


/* Reset */

  $('reset').addEventListener(
    'click',
    resetFilters
  );


/* Saved jobs */

  $('savedToggle').addEventListener(
    'click',
    () => {

      showSavedOnly =
        !showSavedOnly;

      updateSavedUI();

      render();

    }
  );


/* =========================
   JOB DETAILS MODAL
   ========================= */

  const modal =
    $('jobModal');

  const modalClose =
    $('modalClose');


  if (
    modal &&
    modalClose
  ) {

    modalClose.addEventListener(
      'click',
      () => {
        modal.hidden = true;
      }
    );


    modal.addEventListener(
      'click',
      event => {

        if (
          event.target === modal
        ) {
          modal.hidden = true;
        }

      }
    );


    document.addEventListener(
      'keydown',
      event => {

        if (
          event.key === 'Escape' &&
          !modal.hidden
        ) {
          modal.hidden = true;
        }

      }
    );

  }


/* =========================
   LOAD JOB DATA
   ========================= */

  try {

    const res =
      await fetch(
        DATA_URL,
        {
          cache: 'no-store'
        }
      );


    if (!res.ok) {

      throw new Error(
        `HTTP ${res.status}`
      );

    }


    const payload =
      await res.json();


    if (
      !Array.isArray(
        payload.jobs
      )
    ) {

      throw new Error(
        'No jobs array in data'
      );

    }


    allJobs =
      payload.jobs.filter(
        job =>
          job &&
          job.relevant === true &&
          safeLink(
            job.job_url
          ) &&
          Number.isFinite(
            Number(job.score)
          )
      );


/* Location filter */

    addOptions(
      $('location'),
      allJobs.map(
        job =>
          job.location
      )
    );


/* Job type filter */

    addOptions(
      $('jobType'),
      allJobs.map(
        job =>
          job.job_type
      )
    );


/* Skill filter */

    const skills = [];


    allJobs.forEach(
      job => {

        if (
          Array.isArray(
            job.matched_skills
          )
        ) {

          skills.push(
            ...job.matched_skills
          );

        }

      }
    );


    addOptions(
      $('skill'),
      skills
    );


/* Summary */

    $('total').textContent =
      allJobs.length;


    $('recent').textContent =
      allJobs.filter(
        job =>
          [
            'Today',
            'This Week'
          ].includes(
            dateBucket(
              job.date_posted
            )
          )
      ).length;


    $('sources').textContent =
      new Set(
        allJobs
          .map(
            job =>
              job.source
          )
          .filter(Boolean)
      ).size;


    $('sourceStatus').textContent =
      `${allJobs.length} real leads loaded from ${
        new Set(
          allJobs.map(
            job =>
              job.source
          )
        ).size
      } sources · posting dates shown per card`;


/* Insights */

    updateInsights();


/* Empty data */

    if (
      !allJobs.length
    ) {

      $('notice').hidden =
        false;

      $('notice').textContent =
        'No relevant listings in the current real-data collection. No demo jobs will be shown.';

    }


    render();

  } catch (err) {

    $('sourceStatus').textContent =
      'Job data unavailable';


    $('notice').hidden =
      false;


    $('notice').textContent =
      'Could not load processed job data. Run the crawler and processor, then serve the project root with a local web server. No listings are invented as a fallback.';


    $('total').textContent =
      '0';

    $('recent').textContent =
      '0';

    $('sources').textContent =
      '0';


    updateInsights();

    render();


    console.error(
      'Job data load failed:',
      err
    );

  }
}


/* =========================
   START APPLICATION
   ========================= */

if (
  typeof document !== 'undefined'
) {
  init();
}


/* =========================
   EXPORTS
   ========================= */

if (
  typeof module !== 'undefined'
) {

  module.exports = {

    dateBucket,

    freshnessLabel,

    safeLink,

    jobId,

    extractMentionedSkills,

    extractSkillGap

  };
}