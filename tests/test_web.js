'use strict';
// Run with: node tests/test_web.js   (no packages needed)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
['core', 'skills', 'store', 'match', 'resume', 'search', 'knowledge', 'agent'].forEach(f => require('../web/js/' + f + '.js'));
const JR = globalThis.JR;

// dates and links (same rules as radar/dates.py)
const today = new Date(2026, 8, 25);
assert.equal(JR.dateBucket('2026-09-25', today), 'Today');
assert.equal(JR.dateBucket('2026-09-21', today), 'This Week');
assert.equal(JR.dateBucket('2026-09-15', today), 'This Month');
assert.equal(JR.dateBucket('2026-08-31', today), 'Older');
assert.equal(JR.dateBucket(null, today), 'Unknown date');
assert.equal(JR.dateBucket('2026-09-26', today), 'Unknown date');
assert.equal(JR.safeLink('javascript:alert(1)'), null);
assert.equal(JR.safeLink('https://in.indeed.com/viewjob?jk=123'), 'https://in.indeed.com/viewjob?jk=123');

// skills
assert.deepEqual(JR.extractSkills('We use Python, SQL and ESP32 with MQTT').sort(), ['ESP32', 'MQTT', 'Python', 'SQL']);
assert.ok(JR.extractSkills('Embedded C and C++').includes('C++'));
assert.ok(!JR.extractSkills('Go to the market, then cook').includes('Go'));
assert.ok(JR.expandSkill('iot').includes('MQTT'));

// real data: every job loads and every recommendation is a real job
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/processed_jobs.json'), 'utf8'));
JR.state.jobs = data.jobs.map(JR.normalizeJob);
JR.state.defaultProfile = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/profile.json'), 'utf8'));
assert.ok(JR.state.jobs.length > 0);
const ids = new Set(JR.state.jobs.map(j => j.id));
const ranked = JR.rankAll();
assert.equal(ranked.length, JR.state.jobs.length);
ranked.forEach(r => { assert.ok(r.percent >= 0 && r.percent <= 100); r.matched.forEach(s => assert.ok(!r.missing.includes(s))); });
const resp = JR.agentRespond('Find Python jobs');
resp.blocks.filter(b => b.type === 'jobs').forEach(b => b.items.forEach(i => assert.ok(ids.has(i.id), 'recommended job must exist in dataset')));
assert.ok(JR.agentRespond('Create my career roadmap').blocks.some(b => b.type === 'roadmap'));
assert.ok(JR.agentRespond('zzzzqq nothing').blocks.length > 0);

// search understands natural language
const p = JR.parseQuery('Find IoT jobs in Bangalore');
assert.deepEqual(p.cities, ['bengaluru']);
assert.ok(p.skills.includes('IoT'));
assert.ok(JR.parseQuery('Remote software jobs').remote);
const found = JR.filterJobs({ q: 'Python jobs for freshers', sort: 'score' });
assert.ok(found.length > 0 && found.every(j => ids.has(j.id)));

// resume parsing
const prof = JR.parseResume('Asha K\nasha@example.com\nSkills\nPython, SQL, HTML\nProjects\n- Weather app using Python\nCertifications\n- Python Basics\n');
assert.equal(prof.name, 'Asha K');
assert.equal(prof.email, 'asha@example.com');
assert.ok(prof.skills.includes('Python') && prof.skills.includes('SQL'));
assert.equal(prof.projects.length, 1);
assert.equal(prof.certifications.length, 1);

// no secrets in the web code or API
const files = ['../api/career-agent.js'].concat(fs.readdirSync(path.join(__dirname, '../web/js')).map(f => '../web/js/' + f));
files.forEach(f => assert.ok(!/sk-[A-Za-z0-9]{20,}|ghp_|github_pat_/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')), 'secret-like text in ' + f));
assert.ok(!/OPENAI_API_KEY/.test(fs.readdirSync(path.join(__dirname, '../web/js')).map(f => fs.readFileSync(path.join(__dirname, '../web/js/' + f), 'utf8')).join('')), 'API key name must stay server-side');
console.log('Dashboard, search, match engine, agent and resume tests pass');
