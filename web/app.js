/* JOB RADAR - Main Application JavaScript */
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

let allJobs = [];
let savedJobs = new Set();
let applicationStatus = {};
let showSavedOnly = false;
let lastAnalyzedJobId = null;

const $ = (id) => document.getElementById(id);

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
  return [...new Set(values.filter(Boolean))];
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
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
    'Not specified'
  );
}

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

function getJobSkills(job) {
  const haystack = normalize([
    job.title,
    job.description,
    job.skills,
    job.matched_skills,
    job.required_skills
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

    return haystack.includes(skill);
  });
}

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
  const reasons = [];

  const earlyLevel =
    /intern|internship|trainee|fresher|entry[\s-]?level|graduate/.test(
      `${title} ${description}`
    );

  const technicalRole =
    /developer|software|engineer|programmer|python|java|frontend|backend|full[\s-]?stack|iot|embedded|tester|testing|data|ai|ml/.test(
      title
    );

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
      `${matchedSkills.length} relevant skill${
        matchedSkills.length > 1 ? 's' : ''
      } matched`
    );
  }

  const local =
    /coimbatore|tamil nadu|chennai|bengaluru|bangalore|india/.test(
      location
    );

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
    /student|intern|fresher|graduate/.test(
      description
    )
  ) {
    score += 5;
  }

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
    const required = normalize(
      `${getJobTitle(job)} ${getDescription(job)}`
    );

    return (
      required.includes(skill) &&
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

function calculateScore(job) {
  const value = Number(job.score);

  if (Number.isFinite(value)) {
    return value;
  }

  return calculatePersonalMatch(job).score;
}

function getDate(job) {
  return text(
    job.date_posted ||
    job.posted_date ||
    job.date
  );
}

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

  const diffDays = Math.floor(
    (now - date) / 86400000
  );

  if (diffDays <= 7) {
    return 'week';
  }

  if (diffDays <= 30) {
    return 'month';
  }

  return 'older';
}

function matchesSearch(job, value) {
  if (!value) {
    return true;
  }

  const haystack = normalize([
    job.title,
    job.company,
    job.location,
    job.description,
    job.source
  ].join(' '));

  return haystack.includes(
    normalize(value)
  );
}function getFilteredJobs() {
  const search = $('search')?.value || '';
  const location = $('location')?.value || '';
  const jobType = $('jobType')?.value || '';
  const remote = $('remote')?.value || '';
  const period = $('period')?.value || '';
  const skill = $('skill')?.value || '';
  const status = $('status')?.value || '';
  const minimum = Number($('minimum')?.value || 0);

  return allJobs.filter(job => {
    if (!matchesSearch(job, search)) {
      return false;
    }

    if (
      location &&
      normalize(getLocation(job)) !== normalize(location)
    ) {
      return false;
    }

    if (
      jobType &&
      normalize(getJobType(job)) !== normalize(jobType)
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
      remote === 'not-remote' &&
      isRemote(job)
    ) {
      return false;
    }

    if (
      period &&
      dateBucket(job) !== period
    ) {
      return false;
    }

    if (
      skill &&
      !getJobSkills(job).includes(
        normalize(skill)
      )
    ) {
      return false;
    }

    if (status) {
      const current =
        applicationStatus[jobId(job)] ||
        'Not Applied';

      if (
        normalize(current) !==
        normalize(status)
      ) {
        return false;
      }
    }

    if (
      minimum &&
      calculateScore(job) < minimum
    ) {
      return false;
    }

    if (
      showSavedOnly &&
      !savedJobs.has(jobId(job))
    ) {
      return false;
    }

    return true;
  });
}

function sortJobs(jobs) {
  const sort =
    $('sort')?.value ||
    'score-desc';

  const copy = [...jobs];

  if (sort === 'score-asc') {
    return copy.sort(
      (a, b) =>
        calculateScore(a) -
        calculateScore(b)
    );
  }

  if (sort === 'newest') {
    return copy.sort(
      (a, b) =>
        new Date(getDate(b)) -
        new Date(getDate(a))
    );
  }

  if (sort === 'oldest') {
    return copy.sort(
      (a, b) =>
        new Date(getDate(a)) -
        new Date(getDate(b))
    );
  }

  return copy.sort(
    (a, b) =>
      calculateScore(b) -
      calculateScore(a)
  );
}

function getBestOpportunity() {
  const filteredJobs =
    getFilteredJobs();

  if (!filteredJobs.length) {
    return null;
  }

  return [...filteredJobs].sort(
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

function populateSelect(
  id,
  values,
  placeholder
) {
  const select = $(id);

  if (!select) {
    return;
  }

  const current = select.value;

  select.innerHTML =
    `<option value="">${escapeHTML(
      placeholder
    )}</option>` +
    values
      .map(
        value =>
          `<option value="${escapeHTML(
            value
          )}">${escapeHTML(
            value
          )}</option>`
      )
      .join('');

  if (values.includes(current)) {
    select.value = current;
  }
}

function populateFilters() {
  populateSelect(
    'location',
    unique(
      allJobs
        .map(getLocation)
        .filter(Boolean)
    ).sort(),
    'All locations'
  );

  populateSelect(
    'jobType',
    unique(
      allJobs
        .map(getJobType)
        .filter(Boolean)
    ).sort(),
    'All job types'
  );

  populateSelect(
    'skill',
    unique(
      allJobs.flatMap(getJobSkills)
    ).sort(),
    'All skills'
  );
}

function updateSummary(jobs) {
  if ($('total')) {
    $('total').textContent =
      allJobs.length;
  }

  if ($('recent')) {
    $('recent').textContent =
      allJobs.filter(
        j => dateBucket(j) === 'week'
      ).length;
  }

  if ($('sources')) {
    $('sources').textContent =
      unique(
        allJobs.map(getSource)
      ).length;
  }

  if ($('resultCount')) {
    $('resultCount').textContent =
      jobs.length;
  }
}

function updateInsights() {
  const saved =
    allJobs.filter(
      job => savedJobs.has(jobId(job))
    );

  const remote =
    allJobs.filter(isRemote);

  const high =
    allJobs.filter(
      job => calculateScore(job) >= 70
    );

  if ($('insightSaved')) {
    $('insightSaved').textContent =
      saved.length;
  }

  if ($('insightRemote')) {
    $('insightRemote').textContent =
      remote.length;
  }

  if ($('insightHighScore')) {
    $('insightHighScore').textContent =
      high.length;
  }

  const applications =
    Object.values(
      applicationStatus
    ).filter(
      status =>
        status &&
        status !== 'Not Applied'
    );

  if ($('insightApplications')) {
    $('insightApplications').textContent =
      applications.length;
  }

  updateTopSkills();
}

function updateTopSkills() {
  const counts = {};

  allJobs.forEach(job => {
    getJobSkills(job).forEach(skill => {
      counts[skill] =
        (counts[skill] || 0) + 1;
    });
  });

  const top =
    Object.entries(counts)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 8);

  const target =
    $('topSkills');

  if (!target) {
    return;
  }

  target.innerHTML = top.length
    ? top
        .map(
          ([skill, count]) =>
            `<span>${escapeHTML(
              skill
            )} <small>${count}</small></span>`
        )
        .join('')
    : '<span class="insight-muted">No skill data</span>';
}

function getFreshness(job) {
  const bucket =
    dateBucket(job);

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
}function toggleSaved(id) {
  if (savedJobs.has(id)) {
    savedJobs.delete(id);
  } else {
    savedJobs.add(id);
  }

  saveLocalState();
  updateSavedUI();
  updateInsights();
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
    button.textContent =
      showSavedOnly
        ? 'Showing Saved'
        : `Saved (${savedJobs.size})`;
  }
}

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

function jobCard(job) {
  const id =
    jobId(job);

  const personal =
    calculatePersonalMatch(job);

  const score =
    calculateScore(job);

  const saved =
    savedJobs.has(id);

  const status =
    applicationStatus[id] ||
    'Not Applied';

  const matched =
    personal.matchedSkills
      .slice(0, 5);

  const missing =
    personal.missingSkills
      .slice(0, 5);

  return `
    <article
      class="job-card"
      data-job-id="${escapeHTML(id)}"
    >
      <div class="job-main">

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
            ${
              isRemote(job)
                ? 'Remote'
                : 'On-site / Hybrid'
            }
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
              Matched
            </span>

            <div class="job-skills">
              ${
                matched.length
                  ? matched
                      .map(
                        s =>
                          `<span>${escapeHTML(
                            s
                          )}</span>`
                      )
                      .join('')
                  : '<span>None detected</span>'
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
                        s =>
                          `<span>${escapeHTML(
                            s
                          )}</span>`
                      )
                      .join('')
                  : '<span>No major gap detected</span>'
              }

            </div>

          </div>

        </div>

        <div class="job-card-footer">

          <button
            class="job-button job-details-button"
            data-action="details"
            data-id="${escapeHTML(id)}"
          >
            Details
          </button>

          <button
            class="job-button save-button"
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

      </div>
    </article>
  `;
}

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

  updateSummary(filtered);
  updateSavedUI();

  if (!filtered.length) {

    results.innerHTML = `
      <div class="empty-state">

        <h3>
          No matching opportunities
        </h3>

        <p>
          Try changing or resetting
          the filters.
        </p>

      </div>
    `;

    updateAgent(null);
    return;
  }

  results.innerHTML =
    filtered
      .map(jobCard)
      .join('');
}

function updateAgent(job) {
  const panel =
    $('agentPanel');

  if (!panel) {
    return;
  }

  if (!job) {

    if ($('agentJobTitle')) {
      $('agentJobTitle').textContent =
        'No recommendation yet';
    }

    if ($('agentCompany')) {
      $('agentCompany').textContent =
        'No opportunities match the current filters.';
    }

    if ($('agentMatch')) {
      $('agentMatch').textContent =
        '--%';
    }

    if ($('agentMatchedSkills')) {
      $('agentMatchedSkills').innerHTML =
        '';
    }

    if ($('agentMissingSkills')) {
      $('agentMissingSkills').innerHTML =
        '';
    }

    if ($('agentNextAction')) {
      $('agentNextAction').textContent =
        'Change the filters or analyze again.';
    }

    return;
  }

  const result =
    calculatePersonalMatch(job);

  lastAnalyzedJobId =
    jobId(job);

  if ($('agentJobTitle')) {
    $('agentJobTitle').textContent =
      getJobTitle(job);
  }

  if ($('agentCompany')) {
    $('agentCompany').textContent =
      `${getCompany(job)} • ${getLocation(job)}`;
  }

  if ($('agentMatch')) {
    $('agentMatch').textContent =
      `${result.score}%`;
  }

  if ($('agentMatchedSkills')) {
    $('agentMatchedSkills').innerHTML =
      result.matchedSkills.length
        ? result.matchedSkills
            .map(
              s =>
                `<span>${escapeHTML(
                  s
                )}</span>`
            )
            .join('')
        : '<span>No direct skill match detected</span>';
  }

  if ($('agentMissingSkills')) {
    $('agentMissingSkills').innerHTML =
      result.missingSkills.length
        ? result.missingSkills
            .map(
              s =>
                `<span>${escapeHTML(
                  s
                )}</span>`
            )
            .join('')
        : '<span>No major skill gap detected</span>';
  }

  const nextAction =
    result.missingSkills.length
      ? `Learn ${result.missingSkills
          .slice(0, 2)
          .join(
            ' and '
          )} basics, then review this opportunity.`
      : 'Review the job details and consider applying if the requirements fit you.';

  if ($('agentNextAction')) {
    $('agentNextAction').textContent =
      nextAction;
  }
}

function analyzeBestOpportunity() {
  const best =
    getBestOpportunity();

  updateAgent(best);
}function openJobModal(job) {
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
    calculatePersonalMatch(job);

  const score =
    calculateScore(job);

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
          ${score}
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
                  r =>
                    `<li>${escapeHTML(
                      r
                    )}</li>`
                )
                .join('')
            : '<li>Match details are limited for this listing.</li>'
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
                  s =>
                    `<span>${escapeHTML(
                      s
                    )}</span>`
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
                  s =>
                    `<span>${escapeHTML(
                      s
                    )}</span>`
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

  modal.hidden = false;

  const saveButton =
    $('modalSaveButton');

  if (saveButton) {

    saveButton.addEventListener(
      'click',
      () => {
        toggleSaved(id);
        openJobModal(job);
      }
    );

  }
}

function closeJobModal() {
  const modal =
    $('jobModal');

  if (modal) {
    modal.hidden = true;
  }
}

function resetFilters() {

  [
    'search',
    'location',
    'jobType',
    'remote',
    'period',
    'skill',
    'status',
    'minimum'
  ].forEach(id => {

    const element =
      $(id);

    if (element) {
      element.value = '';
    }

  });

  const sort =
    $('sort');

  if (sort) {
    sort.value =
      'score-desc';
  }

  showSavedOnly = false;

  updateSavedUI();
  render();
}

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
    jobs.map(job => [

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
      ] || 'Not Applied',

      job.job_url ||
      job.url ||
      ''

    ]);

  const csv =
    [header, ...rows]
      .map(
        row =>
          row
            .map(
              value =>
                `"${text(
                  value
                ).replace(
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
}function bindEvents() {

  [
    'search',
    'location',
    'jobType',
    'remote',
    'period',
    'skill',
    'status',
    'minimum',
    'sort'
  ].forEach(id => {

    const element =
      $(id);

    if (!element) {
      return;
    }

    element.addEventListener(
      id === 'search'
        ? 'input'
        : 'change',
      () => {

        render();

        if (id !== 'sort') {
          updateAgent(null);
        }

      }
    );

  });

  $('savedToggle')
    ?.addEventListener(
      'click',
      () => {

        showSavedOnly =
          !showSavedOnly;

        render();

      }
    );

  $('reset')
    ?.addEventListener(
      'click',
      resetFilters
    );

  $('agentAnalyze')
    ?.addEventListener(
      'click',
      analyzeBestOpportunity
    );

  $('exportSaved')
    ?.addEventListener(
      'click',
      exportSavedJobs
    );

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
              jobId(item) === id
          );

        if (!job) {
          return;
        }

        if (
          action === 'details'
        ) {
          openJobModal(job);
        }

        if (
          action === 'save'
        ) {
          toggleSaved(id);
        }

      }
    );

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

async function loadJobs() {

  const sourceStatus =
    $('sourceStatus');

  const notice =
    $('notice');

  try {

    if (sourceStatus) {
      sourceStatus.textContent =
        'Loading live job data...';
    }

    const response =
      await fetch(
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

    const data =
      await response.json();

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
      jobs.filter(Boolean);

    populateFilters();
    updateInsights();
    render();

    if (sourceStatus) {
      sourceStatus.textContent =
        `${allJobs.length} opportunities loaded`;
    }

    if (notice) {
      notice.textContent = '';
    }

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

    if (notice) {
      notice.textContent =
        'Job data could not be loaded. Please refresh the page and try again.';
    }

    render();
    updateAgent(null);
  }
}

async function init() {

  loadLocalState();

  updateSavedUI();

  updateInsights();

  bindEvents();

  await loadJobs();
}

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