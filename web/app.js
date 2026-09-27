'use strict';

// Listings come from generated JSON.
// Saved jobs and application status are stored locally in this browser.
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


/* -----------------------------
   Safe helpers
----------------------------- */

function safeLink(value) {
  try {
    const u = new URL(value);

    return ['http:', 'https:'].includes(u.protocol) &&
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


/* -----------------------------
   Saved jobs
----------------------------- */

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
  } catch {
    // Ignore storage errors.
  }
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


/* -----------------------------
   Application tracker
----------------------------- */

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
    const data = Object.fromEntries(
      applicationStatus.entries()
    );

    localStorage.setItem(
      STATUS_KEY,
      JSON.stringify(data)
    );
  } catch {
    // Ignore storage errors.
  }
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

    if (
      ['Saved', 'Applied', 'Interview']
        .includes(status)
    ) {
      savedJobs.add(id);
    }

    if (status === 'Closed') {
      savedJobs.add(id);
    }
  }

  persistApplicationStatus();
  persistSavedJobs();

  updateSavedUI();
  updateInsights();
  render();
}/* -----------------------------
   Skill gap
----------------------------- */

function extractMentionedSkills(job) {
  const text = [
    job.title,
    job.description,
    job.job_description,
    job.description_text
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matched = new Set(
    Array.isArray(job.matched_skills)
      ? job.matched_skills.map(
          skill => String(skill).toLowerCase()
        )
      : []
  );

  const found = [];

  PROFILE_SKILLS.forEach(skill => {
    const normalized = skill.toLowerCase();

    if (
      !matched.has(normalized) &&
      text.includes(normalized)
    ) {
      found.push(skill);
    }
  });

  return found.slice(0, 5);
}


/* -----------------------------
   Date handling
----------------------------- */

function dateBucket(value, now = new Date()) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return 'Unknown date';
  }

  const [y, m, d] =
    value.split('-').map(Number);

  const day = new Date(y, m - 1, d);

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

  if (day.getTime() === current.getTime()) {
    return 'Today';
  }

  const monday = new Date(current);

  monday.setDate(
    current.getDate() -
    (current.getDay() + 6) % 7
  );

  if (day >= monday) {
    return 'This Week';
  }

  if (
    day.getFullYear() === current.getFullYear() &&
    day.getMonth() === current.getMonth()
  ) {
    return 'This Month';
  }

  return 'Older';
}


/* -----------------------------
   DOM helpers
----------------------------- */

function element(tag, className, value) {
  const el = document.createElement(tag);

  if (className) {
    el.className = className;
  }

  if (value !== undefined) {
    el.textContent = String(value);
  }

  return el;
}


function addOptions(select, values) {
  [
    ...new Set(
      values
        .filter(Boolean)
        .map(String)
    )
  ]
    .sort((a, b) => a.localeCompare(b))
    .forEach(value => {
      const opt = element('option', '', value);

      opt.value = value;
      select.append(opt);
    });
}


/* -----------------------------
   Job card
----------------------------- */

function jobCard(job) {
  const card = element('article', 'job');

  const head = element('div', 'job-head');

  const top = element('div', '');

  top.append(
    element(
      'span',
      'source',
      job.source || 'Job board'
    ),

    element(
      'h4',
      '',
      job.title || 'Untitled listing'
    ),

    element(
      'p',
      'company',
      job.company || 'Company not provided'
    )
  );

  const score = element('div', 'score');

  score.setAttribute(
    'aria-label',
    `Fit score ${job.score} out of 100`
  );

  score.append(
    element('strong', '', job.score),
    element('small', '', 'FIT / 100')
  );

  head.append(top, score);
  card.append(head);


  /* Meta */

  const meta = element('div', 'meta');

  [
    job.location || 'Location not provided',

    job.job_type || 'Type not provided',

    job.is_remote === true
      ? 'Remote confirmed'
      : 'Remote not confirmed',

    job.date_posted
      ? `Posted ${job.date_posted}`
      : 'Posting date unknown'
  ].forEach(x => {
    meta.append(
      element('span', '', x)
    );
  });

  card.append(meta);


  /* Matched skills */

  const skills = element('div', 'skills');

  (
    Array.isArray(job.matched_skills) &&
    job.matched_skills.length
      ? job.matched_skills
      : ['No skills detected in available text']
  ).forEach(skill => {
    skills.append(
      element('span', 'skill', skill)
    );
  });

  card.append(skills);


  /* Skill gap */

  const skillGap = extractMentionedSkills(job);

  if (skillGap.length) {
    const gapBox = element(
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

    const gapTags = element(
      'div',
      'gap-tags'
    );

    skillGap.forEach(skill => {
      gapTags.append(
        element(
          'span',
          'gap-tag',
          skill
        )
      );
    });

    gapBox.append(gapTags);
    card.append(gapBox);
  }


  /* Reasons */

  if (
    Array.isArray(job.reasons) &&
    job.reasons.length
  ) {
    const why = element(
      'ul',
      'reasons'
    );

    job.reasons.forEach(reason => {
      why.append(
        element('li', '', reason)
      );
    });

    card.append(why);
  }


  /* Application tracker */

  const tracker = element(
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

  const statusSelect = element(
    'select',
    'status-select'
  );

  const statusValues = [
    [
      'not-tracked',
      'Not tracked'
    ],
    ...STATUS_OPTIONS.map(
      status => [status, status]
    )
  ];

  statusValues.forEach(
    ([value, label]) => {
      const option = element(
        'option',
        '',
        label
      );

      option.value = value;
      statusSelect.append(option);
    }
  );

  statusSelect.value =
    getApplicationStatus(job);

  statusSelect.setAttribute(
    'aria-label',
    `Application status for ${
      job.title || 'job'
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

  tracker.append(statusSelect);
  card.append(tracker);


  /* Footer */

  const foot = element(
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

  const saveButton = element(
    'button',
    'save-job',
    savedJobs.has(jobId(job))
      ? '★ Saved'
      : '☆ Save'
  );

  saveButton.type = 'button';

  saveButton.setAttribute(
    'aria-pressed',
    String(
      savedJobs.has(jobId(job))
    )
  );

  saveButton.addEventListener(
    'click',
    () => toggleSavedJob(job)
  );

  foot.append(saveButton);


  /* Original job link */

  const link = safeLink(job.job_url);

  if (link) {
    const a = element(
      'a',
      '',
      'Open original ↗'
    );

    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    a.setAttribute(
      'aria-label',
      `Open original ${
        job.title || 'job'
      } listing`
    );

    foot.append(a);
  }

  card.append(foot);

  return card;
}/* -----------------------------
   Insights
----------------------------- */

function updateInsights() {

  const remoteCount = allJobs.filter(
    job => job.is_remote === true
  ).length;

  const highScoreCount = allJobs.filter(
    job => Number(job.score) >= 80
  ).length;

  const activeApplications = allJobs.filter(
    job =>
      ['Applied', 'Interview'].includes(
        getApplicationStatus(job)
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

  const counts = new Map();

  allJobs.forEach(job => {

    if (!Array.isArray(job.matched_skills)) {
      return;
    }

    job.matched_skills.forEach(skill => {

      const name =
        String(skill).trim();

      if (!name) return;

      counts.set(
        name,
        (counts.get(name) || 0) + 1
      );
    });
  });


  const topSkills =
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);


  const container = $('topSkills');

  if (!container) return;

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

      const tag = element(
        'span',
        'insight-tag',
        `${skill} · ${count}`
      );

      container.append(tag);
    }
  );
}


/* -----------------------------
   Main rendering
----------------------------- */

function render() {

  const q =
    $('search').value
      .trim()
      .toLowerCase();

  const min =
    Number($('minimum').value);

  const selectedStatus =
    $('status').value;


  const chosen = allJobs.filter(job => {

    const haystack = [
      job.title,
      job.company,
      job.location,
      ...(job.matched_skills || [])
    ]
      .join(' ')
      .toLowerCase();


    const matchesSearch =
      !q || haystack.includes(q);


    const matchesLocation =
      $('location').value === 'all' ||
      job.location === $('location').value;


    const matchesJobType =
      $('jobType').value === 'all' ||
      job.job_type === $('jobType').value;


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
      dateBucket(job.date_posted) ===
        $('period').value;


    const matchesSkill =
      $('skill').value === 'all' ||

      (
        Array.isArray(job.matched_skills) &&
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
      savedJobs.has(jobId(job));


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


  /* Sorting */

  const dateValue =
    x => x.date_posted || '0000-00-00';

  const sort = $('sort').value;


  chosen.sort((a, b) => {

    if (sort === 'score') {
      return (
        b.score - a.score ||
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
        b.score - a.score
      );
    }


    return (
      dateValue(b).localeCompare(
        dateValue(a)
      ) ||
      b.score - a.score
    );
  });


  /* Result count */

  $('resultCount').textContent =
    `${chosen.length} of ${allJobs.length} leads shown`;


  /* Results */

  const results = $('results');

  results.replaceChildren();


  if (!chosen.length) {

    const empty = element(
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

    results.append(empty);

    return;
  }


  /* Date buckets */

  buckets.forEach(label => {

    const jobs = chosen.filter(
      job =>
        dateBucket(job.date_posted) ===
        label
    );

    if (!jobs.length) return;


    const section = element(
      'section',
      'bucket'
    );

    const header = element(
      'div',
      'bucket-header'
    );

    header.append(
      element('h3', '', label),
      element(
        'span',
        'count',
        jobs.length
      )
    );


    const cards = element(
      'div',
      'cards'
    );

    jobs.forEach(job => {
      cards.append(
        jobCard(job)
      );
    });


    section.append(
      header,
      cards
    );

    results.append(section);
  });
}


/* -----------------------------
   Reset
----------------------------- */

function resetFilters() {

  controls.forEach(id => {

    if (id === 'search') {
      $(id).value = '';
    } else {
      $(id).selectedIndex = 0;
    }

  });

  showSavedOnly = false;

  updateSavedUI();
  render();

  $('search').focus();
}


/* -----------------------------
   Initialisation
----------------------------- */

async function init() {

  loadSavedJobs();
  loadApplicationStatus();


  /* Filter listeners */

  controls.forEach(id => {

    $(id).addEventListener(
      id === 'search'
        ? 'input'
        : 'change',
      render
    );

  });


  /* Reset */

  $('reset').addEventListener(
    'click',
    resetFilters
  );


  /* Saved jobs toggle */

  $('savedToggle').addEventListener(
    'click',
    () => {

      showSavedOnly =
        !showSavedOnly;

      updateSavedUI();
      render();

    }
  );


  try {

    const res = await fetch(
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


    if (!Array.isArray(payload.jobs)) {
      throw new Error(
        'No jobs array in data'
      );
    }


    allJobs =
      payload.jobs.filter(
        job =>
          job &&
          job.relevant === true &&
          safeLink(job.job_url) &&
          Number.isFinite(job.score)
      );


    /* Populate filters */

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


    const skills = [];

    allJobs.forEach(job => {

      if (
        Array.isArray(job.matched_skills)
      ) {
        skills.push(
          ...job.matched_skills
        );
      }

    });


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
          ['Today', 'This Week'].includes(
            dateBucket(
              job.date_posted
            )
          )
      ).length;


    $('sources').textContent =
      new Set(
        allJobs
          .map(job => job.source)
          .filter(Boolean)
      ).size;


    $('sourceStatus').textContent =
      `${allJobs.length} real leads loaded from ${
        new Set(
          allJobs.map(
            job => job.source
          )
        ).size
      } sources · posting dates shown per card`;


    /* Insights */

    updateInsights();


    /* Empty data */

    if (!allJobs.length) {

      $('notice').hidden = false;

      $('notice').textContent =
        'No relevant listings in the current real-data collection. No demo jobs will be shown.';
    }


    render();

  } catch (err) {

    $('sourceStatus').textContent =
      'Job data unavailable';


    $('notice').hidden = false;

    $('notice').textContent =
      'Could not load processed job data. Run the crawler and processor, then serve the project root with a local web server. No listings are invented as a fallback.';


    $('total').textContent = '0';
    $('recent').textContent = '0';
    $('sources').textContent = '0';


    updateInsights();
    render();


    console.error(
      'Job data load failed:',
      err
    );
  }
}


if (
  typeof document !== 'undefined'
) {
  init();
}


if (
  typeof module !== 'undefined'
) {
  module.exports = {
    dateBucket,
    safeLink,
    jobId,
    extractMentionedSkills
  };
}