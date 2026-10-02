/* views.js - renders every page. Each view returns nothing; it fills its <section>.
   Buttons use data-action attributes and one click handler in app.js (event delegation). */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};
  const { esc, pretty, safeLink, dateBucket } = JR;
  const $ = id => document.getElementById(id);
  const chips = (arr, cls) => arr.map((s, i) => '<span class="chip ' + (cls || '') + '" style="--i:' + i + '">' + esc(s) + '</span>').join('');
  const filters = { q: '', location: '', jobType: '', workMode: '', posted: '', skill: '', status: '', min: 0, sort: 'match', savedOnly: false, group: true };
  let radar = null, interview = null;

  const PAGES = [
    ['dashboard', 'Dashboard', 'M3 12l9-8 9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
    ['jobs', 'Jobs', 'M4 7h16v12H4zM9 7V4h6v3'],
    ['agent', 'AI Agent', 'M12 3l2.2 5.2L20 10l-5.8 1.8L12 17l-2.2-5.2L4 10l5.8-1.8z'],
    ['resume', 'Resume', 'M7 3h8l4 4v14H7zM15 3v4h4'],
    ['skills', 'Skill Gap', 'M4 20V10M10 20V4M16 20v-7M22 20H2'],
    ['roadmap', 'Roadmap', 'M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 17c8 0 2-10 10-10'],
    ['applications', 'Applications', 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z'],
    ['insights', 'Insights', 'M12 3a9 9 0 1 0 9 9h-9zM15 3.5A9 9 0 0 1 20.5 9H15z']
  ];
  const icon = d => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';

  function renderNav(active) {
    $('navDesktop').innerHTML = PAGES.map(p => '<a href="#/' + p[0] + '" class="' + (p[0] === active ? 'active' : '') + '">' + p[1] + '</a>').join('');
    const main = PAGES.filter(p => ['dashboard', 'jobs', 'agent', 'applications'].includes(p[0]));
    const rest = PAGES.filter(p => !main.includes(p));
    $('navMobile').innerHTML = main.map(p => '<a href="#/' + p[0] + '" class="' + (p[0] === active ? 'active' : '') + '">' + icon(p[2]) + '<span>' + p[1] + '</span></a>').join('') +
      '<button type="button" data-action="more" class="' + (rest.some(p => p[0] === active) ? 'active' : '') + '">' + icon('M5 12h.01M12 12h.01M19 12h.01') + '<span>More</span></button>';
    $('moreSheet').innerHTML = rest.map(p => '<a href="#/' + p[0] + '">' + icon(p[2]) + p[1] + '</a>').join('');
  }

  // ---------- shared pieces ----------
  function sourceLabel(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown source'; }
  function statusBadge(id) { const s = JR.status(id); return s ? '<span class="badge st-' + s + '">' + s + '</span>' : ''; }

  function jobCard(r, i) {
    const j = r.job, link = safeLink(j.job_url), saved = JR.isSaved(j.id);
    return '<article class="job-card glass tilt reveal" data-id="' + esc(j.id) + '">' +
      '<div class="jc-top"><div class="jc-title"><h3>' + esc(j.title || 'Untitled role') + '</h3><p>' + esc(j.company || 'Company not listed') + '</p></div>' + JR.ring(r.percent, 'match') + '</div>' +
      '<div class="meta"><span>' + esc(j.location || 'Location not listed') + '</span><span>' + esc(sourceLabel(j.source)) + '</span>' +
      '<span>' + (j.job_type ? esc(pretty(j.job_type)) : 'Type not provided') + '</span><span>' + (j.is_remote ? 'Remote' : 'On-site / not stated') + '</span>' +
      '<span>' + (j.date_posted ? esc(j.date_posted) + ' (' + dateBucket(j.date_posted) + ')' : 'Date unknown') + '</span><span>' + esc(r.experience) + '</span>' + statusBadge(j.id) + '</div>' +
      (r.matched.length ? '<div class="chiprow"><b>Matched</b>' + chips(r.matched, 'ok') + '</div>' : '') +
      (r.missing.length ? '<div class="chiprow"><b>Missing</b>' + chips(r.missing.slice(0, 6), 'miss') + '</div>' : '') +
      '<p class="why">' + esc(r.why) + '</p>' +
      '<div class="actions"><button class="btn primary sm" data-action="job" data-id="' + esc(j.id) + '">View details</button>' +
      (link ? '<a class="btn sm" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Open original</a>' : '<span class="btn sm disabled">No link</span>') +
      '<button class="btn sm save ' + (saved ? 'on' : '') + '" data-action="save" data-id="' + esc(j.id) + '" aria-pressed="' + saved + '">' + (saved ? 'Saved' : 'Save') + '</button>' +
      '<button class="btn sm ghost" data-action="avoid" data-id="' + esc(j.id) + '" title="Hide this job">Not interested</button></div></article>';
  }

  function section(el, html) {
    el.innerHTML = html; JR.animateIn(el); JR.reveal(el); JR.tilt(el);
  }

  // ---------- DASHBOARD ----------
  function dashboard() {
    const el = $('page-dashboard'), jobs = JR.state.jobs, ranked = JR.rankAll(), profile = JR.getProfile();
    const strong = ranked.filter(r => r.percent >= 70).length, tracked = JR.trackedJobs();
    const applied = tracked.filter(j => JR.status(j.id) !== 'saved').length;
    let need = 0, have = 0; ranked.forEach(r => { need += r.needed.length; have += r.matched.length; });
    const skillMatch = need ? Math.round(have / need * 100) : null;
    const srv = JR.agentServer();
    const mission = JR.dailyMission();
    const missions = [
      ['JOB MATCH', 'Find the most relevant jobs based on resume and skills.', 'Find jobs that match my resume'],
      ['SKILL GAP', 'Compare your skills with what jobs ask for.', 'What skills am I missing?'],
      ['LEARNING ROADMAP', 'A realistic step-by-step learning plan.', 'Create my career roadmap'],
      ['INTERVIEW LAB', 'Practice questions for a job you pick.', '__interview'],
      ['RESUME INTELLIGENCE', 'Strengths, missing keywords, improvements.', 'Analyze my resume'],
      ['CAREER ACTION PLAN', 'What to do today, this week, this month.', 'Which jobs should I apply for?']
    ];
    const stats = [
      ['LIVE JOBS', jobs.length, 'from processed_jobs.json'], ['STRONG MATCHES', strong, '70%+ match to your profile'], ['SAVED JOBS', JR.lists.saved.length, 'in your tracker'],
      ['APPLICATIONS', applied, 'applied or further'], ['SKILL MATCH', skillMatch == null ? '-' : skillMatch, skillMatch == null ? 'no skills detected in jobs' : '% of job skills you cover']
    ];
    section(el,
      '<div class="hero"><div class="hero-copy">' +
      '<p class="eyebrow reveal"><span class="dot"></span> JOB RADAR &middot; AI CAREER COMMAND CENTER</p>' +
      '<h1 class="reveal">Your career.<br><span class="glow-text">One intelligent radar.</span></h1>' +
      '<p class="sub reveal">Discover opportunities. Understand your gaps. Build the skills. Make your next move.</p>' +
      '<div class="cta reveal"><button class="btn primary lg pulse" data-action="page" data-page="agent">OPEN AI AGENT</button><button class="btn lg" data-action="page" data-page="jobs">EXPLORE JOBS</button></div>' +
      '<p class="hint reveal" id="radarHint">Radar tracking ' + jobs.length + ' real jobs for ' + esc(profile.name || 'you') + '.</p></div>' +
      '<div class="radar-wrap glass reveal"><canvas id="radarCanvas" aria-label="Animated radar of ' + jobs.length + ' jobs. Closer to the centre means a better match."></canvas><div class="radar-tip" hidden></div>' +
      '<div class="radar-legend"><span><i class="lg-strong"></i>Strong match (70%+)</span><span><i class="lg-weak"></i>Other jobs</span>' +
      '<button class="btn sm" data-action="scan">SCAN MY PROFILE</button></div></div></div>' +
      '<div class="stats">' + stats.map((s, i) => '<div class="stat glass tilt reveal"><small>' + s[0] + '</small><b ' + (typeof s[1] === 'number' ? 'data-count="' + s[1] + '"' : '') + '>' + (typeof s[1] === 'number' ? 0 : s[1]) + '</b><em>' + esc(s[2]) + '</em></div>').join('') +
      '<div class="stat glass tilt reveal ai-stat"><small>AI STATUS</small><b><span class="dot"></span> ONLINE</b><em>' + (srv.configured ? 'LLM + rule engine' : 'Rule-based engine (no API key needed)') + '</em></div></div>' +
      '<div class="two-col"><div class="glass panel reveal"><h2>TODAY\'S CAREER MISSION</h2><ol class="mission">' +
      [mission.today[0], mission.today[1], 'Practice 5 interview questions', profile.source === 'resume' ? 'Improve one resume section' : 'Upload your resume'].map((m, i) => '<li><span>0' + (i + 1) + '</span>' + esc(m) + '</li>').join('') + '</ol>' +
      '<button class="btn sm" data-action="page" data-page="roadmap">See full roadmap</button></div>' +
      '<div class="glass panel reveal"><h2>TOP MATCHES NOW</h2>' + (ranked.slice(0, 3).map(r => '<button class="mini-job" data-action="job" data-id="' + esc(r.job.id) + '"><span>' + esc(r.job.title) + '<small>' + esc(r.job.company || r.job.location) + '</small></span><b>' + r.percent + '%</b></button>').join('') || '<p class="muted">No jobs loaded.</p>') + '</div></div>' +
      '<h2 class="section-title reveal">AI AGENT MISSIONS</h2><div class="missions">' +
      missions.map(m => '<button class="mission-card glass tilt reveal" data-action="mission" data-q="' + esc(m[2]) + '"><b>' + m[0] + '</b><p>' + m[1] + '</p><span>Launch &rarr;</span></button>').join('') + '</div>');
    if (JR.state.jobsError) el.insertAdjacentHTML('afterbegin', '<div class="notice err">Job data could not be loaded (' + esc(JR.state.jobsError) + '). Check that data/processed_jobs.json is deployed.</div>');
    const canvas = $('radarCanvas');
    radar = JR.Radar(canvas, id => openJob(id));
    const hint = $('radarHint');
    if (hint) hint.textContent = 'Radar tracking ' + radar.total() + ' real jobs. ' + radar.strongCount() + ' strong matches for ' + (profile.name || 'your profile') + (profile.source === 'config' ? ' (based on config/profile.json; upload a resume to personalise).' : '.');
  }

  // ---------- JOBS ----------
  function jobsPage() {
    const el = $('page-jobs');
    const all = JR.state.jobs;
    const locs = [...new Set(all.map(j => j.location).filter(Boolean))].sort();
    const types = [...new Set(all.flatMap(j => j.job_type.split(',').map(x => x.trim().toLowerCase())).filter(Boolean))];
    const opt = (v, t, cur) => '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>';
    section(el,
      '<div class="page-head"><h1>JOBS</h1><p>Search naturally, e.g. "IoT jobs in Bangalore", "Python jobs for freshers", "Remote software jobs".</p></div>' +
      '<div class="glass filters"><div class="searchrow"><input id="fq" type="search" placeholder="Search jobs, skills, companies, or ask in plain English" value="' + esc(filters.q) + '" aria-label="Search jobs">' +
      '<button class="btn primary" data-action="apply-filters">Search</button></div>' +
      '<div class="grid-filters">' +
      '<label>Location<select id="floc">' + opt('', 'All locations', filters.location) + locs.map(l => opt(l, l, filters.location)).join('') + '</select></label>' +
      '<label>Job type<select id="ftype">' + opt('', 'Any type', filters.jobType) + types.map(t => opt(t, pretty(t), filters.jobType)).join('') + '</select></label>' +
      '<label>Work mode<select id="fmode">' + opt('', 'Any', filters.workMode) + opt('remote', 'Remote', filters.workMode) + opt('onsite', 'On-site / not stated', filters.workMode) + '</select></label>' +
      '<label>Posted<select id="fposted">' + opt('', 'Any time', filters.posted) + ['Today', 'This Week', 'This Month', 'Older', 'Unknown date'].map(x => opt(x, x, filters.posted)).join('') + '</select></label>' +
      '<label>Skill<input id="fskill" type="text" placeholder="e.g. Python, MQTT" value="' + esc(filters.skill) + '"></label>' +
      '<label>Status<select id="fstatus">' + opt('', 'Any', filters.status) + opt('untracked', 'Not tracked', filters.status) + JR.STATUSES.map(s => opt(s, s, filters.status)).join('') + '</select></label>' +
      '<label>Min relevance<select id="fmin">' + [0, 50, 70, 80, 90].map(n => opt(n, n ? n + '+' : 'Any', filters.min)).join('') + '</select></label>' +
      '<label>Sort by<select id="fsort">' + opt('match', 'Your match %', filters.sort) + opt('score', 'Relevance score', filters.sort) + opt('newest', 'Newest', filters.sort) + opt('company', 'Company A-Z', filters.sort) + '</select></label></div>' +
      '<div class="filter-actions"><label class="check"><input type="checkbox" id="fsaved"' + (filters.savedOnly ? ' checked' : '') + '> Saved only</label>' +
      '<label class="check"><input type="checkbox" id="fgroup"' + (filters.group ? ' checked' : '') + '> Group by date</label>' +
      '<button class="btn sm" data-action="clear-filters">Clear filters</button><button class="btn sm" data-action="export">Export CSV</button></div></div>' +
      '<p class="count" id="jobCount"></p><div id="jobList"></div><div id="avoidList"></div>');
    renderJobList();
  }
  function readFilters() {
    const g = id => { const e = $(id); return e ? e.value : ''; };
    Object.assign(filters, { q: g('fq'), location: g('floc'), jobType: g('ftype'), workMode: g('fmode'), posted: g('fposted'), skill: g('fskill'), status: g('fstatus'),
      min: +g('fmin') || 0, sort: g('fsort') || 'match', savedOnly: !!($('fsaved') && $('fsaved').checked), group: !!($('fgroup') && $('fgroup').checked) });
  }
  function renderJobList() {
    const list = JR.filterJobs(filters), profile = JR.getProfile();
    $('jobCount').textContent = list.length + ' of ' + JR.state.jobs.length + ' jobs' + (filters.q ? ' for "' + filters.q + '"' : '');
    const host = $('jobList');
    if (!list.length) {
      host.innerHTML = '<div class="empty glass"><b>No jobs match these filters.</b><p>' + (JR.state.jobs.length ? 'Try removing a filter or searching a broader skill.' : 'No job data loaded.') + '</p><button class="btn sm" data-action="clear-filters">Clear filters</button></div>';
    } else if (filters.group) {
      const order = ['Today', 'This Week', 'This Month', 'Older', 'Unknown date'], by = {};
      list.forEach(j => (by[dateBucket(j.date_posted)] = by[dateBucket(j.date_posted)] || []).push(j));
      host.innerHTML = order.filter(k => by[k]).map(k => '<h2 class="group-title">' + k + ' <small>' + by[k].length + '</small></h2><div class="cards">' + by[k].map(j => jobCard(JR.analyzeJob(j, profile))).join('') + '</div>').join('');
    } else host.innerHTML = '<div class="cards">' + list.map(j => jobCard(JR.analyzeJob(j, profile))).join('') + '</div>';
    JR.animateIn(host); JR.reveal(host); JR.tilt(host);
    const av = JR.lists.avoided.map(JR.jobById).filter(Boolean);
    $('avoidList').innerHTML = av.length ? '<details class="glass avoid"><summary>Hidden jobs (' + av.length + ')</summary>' + av.map(j => '<div class="row"><span>' + esc(j.title) + ' - ' + esc(j.company) + '</span><button class="btn sm" data-action="restore" data-id="' + esc(j.id) + '">Restore</button></div>').join('') + '</details>' : '';
  }
  function exportCSV() {
    const rows = JR.filterJobs(filters), cols = ['title', 'company', 'location', 'source', 'job_type', 'date_posted', 'score', 'job_url'];
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = [cols.join(',')].concat(rows.map(j => cols.map(c => q(j[c])).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'job-radar-jobs.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    JR.toast('Exported ' + rows.length + ' jobs');
  }

  // ---------- JOB MODAL ----------
  function openJob(id) {
    const j = JR.jobById(id); if (!j) { JR.toast('Job not found'); return; }
    const r = JR.analyzeJob(j), link = safeLink(j.job_url), a = JR.app(id), saved = JR.isSaved(id);
    $('modalCard').innerHTML = '<button class="x" data-action="close" aria-label="Close">&times;</button>' +
      '<div class="jc-top"><div class="jc-title"><h2 id="modalTitle">' + esc(j.title) + '</h2><p>' + esc(j.company || 'Company not listed') + ' &middot; ' + esc(j.location || 'Location not listed') + '</p></div>' + JR.ring(r.percent, 'match', 76) + '</div>' +
      '<div class="meta"><span>' + esc(sourceLabel(j.source)) + '</span><span>' + (j.job_type ? esc(pretty(j.job_type)) : 'Type not provided') + '</span><span>' + (j.is_remote ? 'Remote' : 'On-site / not stated') + '</span><span>' + esc(r.experience) + '</span><span>Relevance ' + j.score + '/100</span>' + statusBadge(id) + '</div>' +
      '<h4>Why this job matches you</h4><p class="why">' + esc(r.why) + '</p>' + (j.reasons.length ? '<ul class="plain">' + j.reasons.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      '<div class="chiprow"><b>Matched</b>' + (r.matched.length ? chips(r.matched, 'ok') : '<span class="muted">None detected</span>') + '</div>' +
      '<div class="chiprow"><b>Missing</b>' + (r.missing.length ? chips(r.missing, 'miss') : '<span class="muted">None</span>') + '</div><p class="muted">' + esc(r.gapNote) + '</p>' +
      '<div class="actions"><button class="btn primary" data-action="interview-start" data-id="' + esc(id) + '">START INTERVIEW</button>' +
      (link ? '<a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer" data-action="opened" data-id="' + esc(id) + '">Open original posting</a>' : '') +
      '<button class="btn save ' + (saved ? 'on' : '') + '" data-action="save" data-id="' + esc(id) + '">' + (saved ? 'Saved' : 'Save job') + '</button>' +
      '<button class="btn" data-action="ask-prepare" data-id="' + esc(id) + '">Ask AI to prepare me</button></div>' +
      '<details class="desc"><summary>Full description</summary><pre>' + esc(j.description.replace(/\*\*/g, '').replace(/\\-/g, '-').slice(0, 6000)) + '</pre></details>';
    $('modal').hidden = false; document.body.classList.add('noscroll');
    JR.animateIn($('modalCard'));
    const x = $('modalCard').querySelector('.x'); x && x.focus();
  }
  function closeModal() { $('modal').hidden = true; document.body.classList.remove('noscroll'); interview = null; }

  // ---------- AGENT ----------
  const chatLog = []; // {role, blocks|text}
  function agent() {
    const el = $('page-agent'), srv = JR.agentServer();
    section(el,
      '<div class="agent-shell glass entrance"><div class="agent-head"><div class="orb" aria-hidden="true"><i></i></div><div><h1>CAREER AI</h1><p>Your personal career intelligence system</p></div>' +
      '<div class="status-pill"><span class="dot"></span>ONLINE<small>' + (srv.configured ? 'LLM + rules' : 'rule engine') + '</small></div></div>' +
      '<div class="chat" id="chat" aria-live="polite"></div>' +
      '<div class="suggest" id="suggest">' + JR.AGENT_PROMPTS.map(p => '<button class="chip btn-chip" data-action="mission" data-q="' + esc(p) + '">' + esc(p) + '</button>').join('') + '</div>' +
      '<form class="composer" id="agentForm"><input id="agentInput" type="text" autocomplete="off" maxlength="300" placeholder="Ask Career AI: jobs, skills, roadmap, interview prep..." aria-label="Message Career AI"><button class="btn primary" type="submit">Send</button></form></div>');
    renderChat(true);
    if (!chatLog.length) addAI({ blocks: [{ type: 'text', text: 'Hi' + (JR.getProfile().name ? ' ' + JR.getProfile().name.split(' ')[0] : '') + '. I read ' + JR.state.jobs.length + ' real jobs from your dataset and ' + (JR.getProfile().source === 'resume' ? 'your uploaded resume' : 'your target profile') + '. Pick a mission below or ask me anything about your career.' }] }, true);
  }
  function renderChat(instant) {
    const chat = $('chat'); if (!chat) return;
    chat.innerHTML = '';
    chatLog.forEach(m => chat.appendChild(msgEl(m, instant)));
    chat.scrollTop = chat.scrollHeight;
  }
  function msgEl(m, instant, typing) {
    const d = document.createElement('div'); d.className = 'msg ' + m.role;
    if (m.role === 'user') { d.textContent = m.text; return d; }
    const holder = document.createElement('div'); holder.className = 'ai-body'; d.appendChild(holder);
    (m.blocks || []).forEach((b, i) => {
      const wrap = document.createElement('div'); wrap.className = 'blk ' + b.type + (instant ? ' show' : ''); holder.appendChild(wrap);
      if (b.type === 'text') {
        const p = document.createElement('p'); wrap.appendChild(p);
        if (b.ai) wrap.insertAdjacentHTML('afterbegin', '<small class="tag">LLM</small>');
        if (typing && !instant) JR.typeText(p, b.text); else p.textContent = b.text;
      } else wrap.innerHTML = blockHTML(b);
      if (!instant) setTimeout(() => wrap.classList.add('show'), 80 + i * 140); else wrap.classList.add('show');
    });
    setTimeout(() => JR.animateIn(d), 120);
    return d;
  }
  function blockHTML(b) {
    if (b.type === 'jobs') return '<h4>' + esc(b.title) + '</h4>' + b.items.map((it, i) => { const j = JR.jobById(it.id); if (!j) return '';
      return '<div class="rec"><div class="rec-main"><b>' + (i + 1) + '. ' + esc(j.title) + '</b><span>' + esc(j.company || '') + ' &middot; ' + esc(j.location) + '</span>' +
        (it.matched.length ? '<div class="chiprow"><b>Matched</b>' + chips(it.matched, 'ok') + '</div>' : '') + (it.missing.length ? '<div class="chiprow"><b>Missing</b>' + chips(it.missing.slice(0, 5), 'miss') + '</div>' : '') +
        '<small>' + esc(it.why) + '</small></div><div class="rec-side">' + JR.ring(it.percent, 'match', 56) + '<button class="btn primary sm" data-action="job" data-id="' + esc(j.id) + '">VIEW JOB</button></div></div>'; }).join('');
    if (b.type === 'chips') return '<h4>' + esc(b.title) + '</h4><div class="chiprow">' + chips(b.items, 'ok') + '</div>';
    if (b.type === 'actions') return '<h4>' + esc(b.title) + '</h4><ul class="plain">' + b.items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
    if (b.type === 'stats') return '<div class="mini-stats">' + b.items.map(s => '<div><b>' + s.value + '</b><small>' + s.label + '</small></div>').join('') + '</div>';
    if (b.type === 'gapbars') return b.items.map(g => '<div class="gap"><span>' + esc(g.skill) + '</span><div class="bar"><i data-fill="' + Math.round(g.jobs / Math.max(1, b.total) * 100) + '"></i></div><em>' + g.jobs + ' jobs</em></div>').join('');
    if (b.type === 'roadmap') return b.stages.map((s, i) => '<div class="rm-mini"><span>' + (i + 1) + '</span><div><b>' + esc(s.stage) + '</b><small>' + esc(s.items.slice(0, 2).join(' / ')) + '</small></div></div>').join('') + '<button class="btn sm" data-action="page" data-page="roadmap">Open full roadmap</button>';
    if (b.type === 'questions') return '<h4>Practice questions</h4><ol class="plain">' + b.items.map(q => '<li><span class="tag">' + esc(q.tag) + '</span> ' + esc(q.q) + '</li>').join('') + '</ol>';
    if (b.type === 'cta') return '<button class="btn primary" data-action="' + (b.action === 'interview' ? 'interview-start' : 'page') + '" data-id="' + esc(b.jobId || '') + '" data-page="' + esc(b.page || '') + '">' + esc(b.label) + '</button>';
    return '';
  }
  function addAI(resp, instant) { const m = { role: 'ai', blocks: resp.blocks }; chatLog.push(m); const chat = $('chat'); if (chat) { chat.appendChild(msgEl(m, instant, true)); chat.scrollTop = chat.scrollHeight; } }
  async function sendToAgent(text, ctx) {
    text = String(text || '').trim(); if (!text) return;
    if (location.hash.indexOf('agent') < 0) location.hash = '#/agent';
    await new Promise(r => setTimeout(r, 30));
    const chat = $('chat'); if (!chat) return;
    chatLog.push({ role: 'user', text }); chat.appendChild(msgEl({ role: 'user', text }, true));
    const th = document.createElement('div'); th.className = 'msg ai thinking';
    th.innerHTML = '<div class="think"><i></i><i></i><i></i></div><span>Scanning ' + JR.state.jobs.length + ' jobs and your profile...</span>';
    chat.appendChild(th); chat.scrollTop = chat.scrollHeight;
    const t0 = Date.now(); let resp;
    try { resp = await JR.agentAsk(text, ctx); } catch (e) { console.error(e); resp = { blocks: [{ type: 'text', text: 'Something went wrong while building that answer. Try rephrasing.' }] }; }
    const wait = Math.max(0, (JR.prefersReducedMotion() ? 0 : 650) - (Date.now() - t0));
    await new Promise(r => setTimeout(r, wait));
    th.remove(); addAI(resp, false);
    [60, 400, 1000, 2000].forEach(ms => setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, ms));
    const input = $('agentInput'); if (input) input.value = '';
  }

  // ---------- INTERVIEW MODE ----------
  function interviewPicker() {
    const ranked = JR.rankAll().slice(0, 25);
    $('modalCard').innerHTML = '<button class="x" data-action="close" aria-label="Close">&times;</button><h2 id="modalTitle">INTERVIEW LAB</h2><p class="muted">Pick a job. Questions come from the skills in that posting and your resume.</p>' +
      '<select id="ivJob">' + ranked.map(r => '<option value="' + esc(r.job.id) + '">' + esc(r.job.title + (r.job.company ? ' - ' + r.job.company : '') + ' (' + r.percent + '%)') + '</option>').join('') + '</select>' +
      '<div class="actions"><button class="btn primary" data-action="interview-go">START INTERVIEW</button></div>';
    $('modal').hidden = false; document.body.classList.add('noscroll');
  }
  function startInterview(id) {
    const j = JR.jobById(id); if (!j) return;
    interview = { job: j, qs: JR.interviewQuestions(j, JR.getProfile()), i: 0, notes: {} };
    renderInterview();
  }
  function renderInterview() {
    const s = interview; if (!s) return; const total = s.qs.length;
    if (s.i >= total) {
      $('modalCard').innerHTML = '<button class="x" data-action="close" aria-label="Close">&times;</button><h2 id="modalTitle">Interview complete</h2><p>You went through ' + total + ' questions for <b>' + esc(s.job.title) + '</b>.</p>' +
        '<ul class="plain">' + s.qs.map((q, i) => '<li><b>' + esc(q.tag) + ':</b> ' + esc(q.q) + (s.notes[i] ? '<br><small class="muted">Your notes: ' + esc(s.notes[i]) + '</small>' : '') + '</li>').join('') + '</ul>' +
        '<div class="actions"><button class="btn primary" data-action="interview-restart">Restart</button><button class="btn" data-action="close">Close</button></div>'; JR.burst(); return;
    }
    const q = s.qs[s.i];
    $('modalCard').innerHTML = '<button class="x" data-action="close" aria-label="Close">&times;</button><small class="eyebrow">INTERVIEW MODE &middot; ' + esc(s.job.title) + '</small>' +
      '<div class="bar big"><i style="width:' + Math.round(s.i / total * 100) + '%"></i></div><p class="muted">Question ' + (s.i + 1) + ' of ' + total + '</p>' +
      '<div class="q-card"><span class="tag">' + esc(q.tag) + '</span><h2 id="modalTitle">' + esc(q.q) + '</h2></div>' +
      '<textarea id="ivNote" rows="4" placeholder="Type your answer or key points (stays on this device, not saved)">' + esc(s.notes[s.i] || '') + '</textarea>' +
      '<div class="actions"><button class="btn" data-action="interview-prev"' + (s.i === 0 ? ' disabled' : '') + '>Back</button><button class="btn primary" data-action="interview-next">' + (s.i === total - 1 ? 'Finish' : 'Next question') + '</button></div>';
    const n = $('ivNote'); n && n.focus();
  }
  function interviewStep(d) { const n = $('ivNote'); if (interview && n) interview.notes[interview.i] = n.value; if (interview) { interview.i = Math.max(0, interview.i + d); renderInterview(); } }

  // ---------- RESUME ----------
  let draft = null;
  function resumePage() {
    const el = $('page-resume'), p = JR.getProfile(), hasResume = p.source === 'resume';
    section(el, '<div class="page-head"><h1>RESUME INTELLIGENCE</h1><p>Paste your resume text or upload a .txt file. Nothing leaves your browser.</p></div>' +
      '<div class="two-col"><div class="glass panel reveal"><h2>UPLOAD OR PASTE</h2>' +
      '<label class="drop" for="resumeFile"><b>Choose a resume file</b><small>.txt or .md (PDF/Word: copy the text and paste below)</small><span id="resumeFileName">No file chosen</span></label><input type="file" id="resumeFile" accept=".txt,.md,.text,.rtf,text/plain" hidden>' +
      '<textarea id="resumeText" rows="10" placeholder="Paste your resume text here"></textarea>' +
      '<div class="actions"><button class="btn primary" data-action="parse-resume">Analyse resume</button>' + (hasResume ? '<button class="btn" data-action="clear-resume">Remove saved resume</button>' : '') + '</div><p class="muted" id="resumeMsg"></p></div>' +
      '<div class="glass panel reveal" id="profileCard">' + profileCard(draft || (hasResume ? p : null), !!draft) + '</div></div>');
  }
  function profileCard(p, isDraft) {
    if (!p) return '<h2>RESUME PROFILE</h2><p class="muted">No resume yet. Currently matching with your target profile from config/profile.json (' + esc(JR.getProfile().skills.join(', ') || 'no skills') + ').</p>';
    const strengths = JR.resumeStrengths(p), imp = JR.resumeImprovements(p);
    if (isDraft) return '<h2>CHECK AND SAVE</h2><p class="muted">Edit anything the parser got wrong, then save.</p>' +
      '<label>Name<input id="rpName" value="' + esc(p.name) + '"></label><label>Email<input id="rpEmail" value="' + esc(p.email) + '"></label>' +
      '<label>Education<input id="rpEdu" value="' + esc(p.education) + '"></label>' +
      '<label>Skills (comma separated)<textarea id="rpSkills" rows="3">' + esc(p.skills.join(', ')) + '</textarea></label>' +
      '<label>Target roles (comma separated)<input id="rpRoles" value="' + esc(p.roles.join(', ')) + '"></label>' +
      '<label>Preferred locations (comma separated)<input id="rpLocs" value="' + esc((p.locations || []).join(', ')) + '"></label>' +
      '<label>Projects (one per line)<textarea id="rpProjects" rows="4">' + esc(p.projects.join('\n')) + '</textarea></label>' +
      '<label>Certifications (one per line)<textarea id="rpCerts" rows="3">' + esc(p.certifications.join('\n')) + '</textarea></label>' +
      '<div class="actions"><button class="btn primary" data-action="save-resume">Save profile</button></div>';
    return '<h2>RESUME PROFILE</h2><p><b>' + esc(p.name || 'Name not found') + '</b>' + (p.email ? ' &middot; ' + esc(p.email) : '') + '</p>' + (p.education ? '<p class="muted">' + esc(p.education) + '</p>' : '') +
      '<h4>Skills detected</h4><div class="chiprow">' + (p.skills.length ? chips(p.skills, 'ok') : '<span class="muted">None</span>') + '</div>' +
      '<h4>Target roles</h4><div class="chiprow">' + (p.roles.length ? chips(p.roles) : '<span class="muted">None</span>') + '</div>' +
      '<h4>Projects</h4>' + (p.projects.length ? '<ul class="plain">' + p.projects.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<p class="muted">None found</p>') +
      (p.certifications.length ? '<h4>Certifications</h4><ul class="plain">' + p.certifications.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      '<h4>Missing skills (asked in current jobs)</h4><div class="chiprow">' + chips(JR.skillGaps(p).slice(0, 8).map(g => g.skill), 'miss') + '</div>' +
      '<h4>Strength areas</h4><ul class="plain">' + (strengths.map(x => '<li>' + esc(x) + '</li>').join('') || '<li>-</li>') + '</ul>' +
      '<h4>Improve</h4><ul class="plain">' + (imp.map(x => '<li>' + esc(x) + '</li>').join('') || '<li>Looks complete.</li>') + '</ul>' +
      '<div class="actions"><button class="btn primary" data-action="match-resume">MATCH MY RESUME WITH JOBS</button></div>';
  }
  function parseResumeFromBox() {
    const t = $('resumeText').value;
    if (t.trim().length < 20) { $('resumeMsg').textContent = 'Paste at least a few lines of resume text first.'; return; }
    draft = JR.parseResume(t); resumePage();
    $('resumeText').value = t; $('resumeMsg').textContent = 'Parsed. Check the details on the right and save.';
  }
  function saveResumeDraft() {
    const v = id => ($(id) ? $(id).value : ''), list = s => s.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean), lines = s => s.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const skills = [...new Set(list(v('rpSkills')).map(s => JR.canonSkill(s) || s))];
    JR.saveProfile({ name: v('rpName'), email: v('rpEmail'), education: v('rpEdu'), skills, technologies: draft ? draft.technologies : [], roles: list(v('rpRoles')), locations: list(v('rpLocs')),
      projects: lines(v('rpProjects')), certifications: lines(v('rpCerts')), parsedAt: new Date().toISOString() });
    draft = null; JR.burst(); JR.toast('Resume profile saved'); resumePage(); JR.agentRefresh && JR.agentRefresh();
  }

  // ---------- SKILL GAP ----------
  let gapTarget = '';
  function skillsPage() {
    const el = $('page-skills'), p = JR.getProfile(), ranked = JR.rankAll(p);
    const target = gapTarget && JR.jobById(gapTarget);
    let matched, missing, title;
    if (target) { const r = JR.analyzeJob(target, p); matched = r.matched; missing = r.missing; title = target.title; }
    else { const gaps = JR.skillGaps(p), dem = JR.skillDemand(); matched = dem.filter(d => p.skills.some(s => s.toLowerCase() === d.skill.toLowerCase())).map(d => d.skill); missing = gaps.map(g => g.skill); title = 'all ' + JR.state.jobs.length + ' jobs'; }
    const cov = (matched.length + missing.length) ? Math.round(matched.length / (matched.length + missing.length) * 100) : 0;
    const dem = JR.skillDemand(), maxD = Math.max(1, dem[0] ? dem[0].jobs : 1);
    section(el, '<div class="page-head"><h1>SKILL GAP</h1><p>Your skills compared with ' + esc(title) + '.</p></div>' +
      '<div class="glass panel reveal"><label>Compare against<select id="gapTarget"><option value="">All jobs (market view)</option>' + ranked.slice(0, 40).map(r => '<option value="' + esc(r.job.id) + '"' + (r.job.id === gapTarget ? ' selected' : '') + '>' + esc(r.job.title + (r.job.company ? ' - ' + r.job.company : '')) + '</option>').join('') + '</select></label></div>' +
      '<div class="two-col"><div class="glass panel reveal center"><h2>COVERAGE</h2>' + JR.ring(cov, 'coverage', 120) + '<p class="muted">' + matched.length + ' covered, ' + missing.length + ' missing</p></div>' +
      '<div class="glass panel reveal"><h2>YOU HAVE</h2><div class="chiprow">' + (matched.length ? chips(matched, 'ok') : '<span class="muted">No overlap detected</span>') + '</div><h2>MISSING</h2><div class="chiprow">' + (missing.length ? chips(missing.slice(0, 20), 'miss') : '<span class="muted">Nothing missing</span>') + '</div></div></div>' +
      '<div class="glass panel reveal"><h2>HOW MANY JOBS ASK FOR EACH SKILL</h2>' + dem.slice(0, 14).map(d => { const have = p.skills.some(s => s.toLowerCase() === d.skill.toLowerCase());
        return '<div class="gap"><span>' + esc(d.skill) + '</span><div class="bar"><i class="' + (have ? 'ok' : 'miss') + '" data-fill="' + Math.round(d.jobs / maxD * 100) + '"></i></div><em>' + d.jobs + ' jobs ' + (have ? '&#10003;' : '') + '</em></div>'; }).join('') + '</div>' +
      (missing.length ? '<div class="glass panel reveal"><h2>START HERE: ' + esc(missing[0]) + '</h2><ul class="plain">' + JR.learnSteps(missing[0]).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : ''));
  }

  // ---------- ROADMAP ----------
  function roadmapPage() {
    const el = $('page-roadmap'), stages = JR.buildRoadmap(), done = JR.load('jobRadarRoadmapChecks', {});
    section(el, '<div class="page-head"><h1>CAREER ROADMAP</h1><p>Built from your profile and current jobs. Tick items as you finish them; progress is saved on this device.</p></div>' +
      '<div class="roadmap">' + stages.map((s, i) => {
        const checks = s.items.map((_, k) => !!done[s.stage + k]), frac = checks.length ? checks.filter(Boolean).length / checks.length * 100 : 0, pct = Math.round(Math.max(s.progress, frac));
        return '<div class="stage glass tilt reveal"><div class="node"><span>' + (i + 1) + '</span></div><div class="stage-body"><div class="stage-top"><h3>' + esc(s.stage.toUpperCase()) + '</h3><b>' + pct + '%</b></div><div class="bar"><i data-fill="' + pct + '"></i></div>' +
          '<ul class="todo">' + s.items.map((t, k) => '<li><label><input type="checkbox" data-action="rm-check" data-key="' + esc(s.stage + k) + '"' + (checks[k] ? ' checked' : '') + '> <span>' + esc(t) + '</span></label></li>').join('') + '</ul></div></div>'; }).join('') + '</div>');
  }

  // ---------- APPLICATIONS ----------
  function applicationsPage() {
    const el = $('page-applications'), tracked = JR.trackedJobs();
    section(el, '<div class="page-head"><h1>APPLICATION TRACKER</h1><p>Save jobs from the Jobs page, then move them across the board.</p></div>' +
      (tracked.length ? '' : '<div class="empty glass"><b>No saved jobs yet.</b><p>Save a job and it appears under Saved.</p><button class="btn primary sm" data-action="page" data-page="jobs">Browse jobs</button></div>') +
      '<div class="board">' + JR.STATUSES.map(s => { const col = tracked.filter(j => JR.status(j.id) === s);
        return '<div class="col glass reveal"><h3>' + s.toUpperCase() + ' <small>' + col.length + '</small></h3>' + (col.map(j => trackerCard(j)).join('') || '<p class="muted">Empty</p>') + '</div>'; }).join('') + '</div>');
  }
  function trackerCard(j) {
    const a = JR.app(j.id), link = safeLink(j.job_url);
    return '<div class="tcard" data-id="' + esc(j.id) + '"><b>' + esc(j.title) + '</b><small>' + esc(j.company || j.location) + '</small>' +
      '<label>Status<select data-action="set-status" data-id="' + esc(j.id) + '">' + JR.STATUSES.map(s => '<option value="' + s + '"' + (s === a.status ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></label>' +
      '<label>Applied date<input type="date" data-action="set-date" data-id="' + esc(j.id) + '" value="' + esc(a.appliedDate) + '"></label>' +
      '<label>Notes<textarea rows="2" data-action="set-notes" data-id="' + esc(j.id) + '" placeholder="Contacts, deadlines, follow-ups">' + esc(a.notes) + '</textarea></label>' +
      '<div class="actions"><button class="btn primary sm" data-action="job" data-id="' + esc(j.id) + '">View Job</button>' + (link ? '<a class="btn sm" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Original</a>' : '') +
      '<button class="btn ghost sm" data-action="save" data-id="' + esc(j.id) + '">Remove</button></div></div>';
  }

  // ---------- INSIGHTS ----------
  const ROLE_RX = [['IoT / Embedded', /iot|embedded|firmware|hardware/i], ['Python', /python/i], ['Java', /java\b/i], ['Web / Full-stack', /web|full[- ]?stack|front[- ]?end|back[- ]?end|react|node|mern|html/i], ['Data / AI', /data|machine learning|ai\b|analyst/i], ['Software Developer / Engineer', /software|developer|engineer|sde|programmer/i]];
  const roleOf = t => (ROLE_RX.find(r => r[1].test(t)) || ['Other'])[0];
  function barList(rows, max, cls) { return rows.map(r => '<div class="gap"><span>' + esc(r[0]) + '</span><div class="bar"><i class="' + (cls || '') + '" data-fill="' + Math.round(r[1] / Math.max(1, max) * 100) + '"></i></div><em>' + r[1] + '</em></div>').join(''); }
  function countBy(arr, f) { const m = {}; arr.forEach(x => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }
  function insightsPage() {
    const el = $('page-insights'), jobs = JR.state.jobs, p = JR.getProfile(), ranked = JR.rankAll(p);
    const roles = countBy(jobs, j => roleOf(j.title)).slice(0, 6), cats = countBy(jobs.flatMap(j => JR.jobSkills(j)), s => JR.skillCategory(s)).slice(0, 7);
    const top = countBy(ranked.flatMap(r => r.matched), s => s).slice(0, 8), miss = JR.skillGaps(p).slice(0, 8).map(g => [g.skill, g.jobs]);
    const cities = countBy(jobs, j => j.location).slice(0, 8), tr = JR.trackedJobs(), prog = JR.STATUSES.map(s => [s, tr.filter(j => JR.status(j.id) === s).length]);
    const src = countBy(jobs, j => sourceLabel(j.source));
    const card = (t, body) => '<div class="glass panel reveal"><h2>' + t + '</h2>' + body + '</div>';
    section(el, '<div class="page-head"><h1>CAREER INSIGHTS</h1><p>Computed from ' + jobs.length + ' real jobs and your saved activity.</p></div><div class="insights">' +
      card('MOST RELEVANT ROLES', barList(roles, roles[0] ? roles[0][1] : 1)) +
      card('TOP MATCHING SKILLS', top.length ? barList(top, top[0][1]) : '<p class="muted">No matching skills yet. Upload a resume.</p>') +
      card('MISSING SKILLS', miss.length ? barList(miss, miss[0][1], 'miss') : '<p class="muted">None</p>') +
      card('APPLICATION PROGRESS', '<p class="muted">' + JR.lists.saved.length + ' saved, ' + prog.slice(1).reduce((a, b) => a + b[1], 0) + ' applied or further</p>' + barList(prog, Math.max(1, ...prog.map(x => x[1])))) +
      card('TARGET LOCATIONS', '<div class="chiprow">' + chips(p.locations.length ? p.locations : ['Not set'], '') + '</div><h4>Where the jobs are</h4>' + barList(cities, cities[0] ? cities[0][1] : 1)) +
      card('JOB CATEGORY DISTRIBUTION', barList(cats, cats[0] ? cats[0][1] : 1) + '<h4>Sources</h4>' + barList(src, src[0] ? src[0][1] : 1)) + '</div>');
  }

  const render = { dashboard, jobs: jobsPage, agent, resume: resumePage, skills: skillsPage, roadmap: roadmapPage, applications: applicationsPage, insights: insightsPage };
  Object.assign(JR, { views: { PAGES, render, renderNav, readFilters, renderJobList, filters, openJob, closeModal, sendToAgent, interviewPicker, startInterview, interviewStep,
    exportCSV, parseResumeFromBox, saveResumeDraft, setGapTarget: v => { gapTarget = v; }, setDraft: v => { draft = v; }, radarScan: () => radar && radar.scan(),
    getInterview: () => interview } });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
