/* agent.js - the Career AI.
   1) rule engine (always works, no key): turns a question into structured "blocks".
   2) optional server call to /api/career-agent for an LLM summary when configured.
   Recommendations ALWAYS come from the real job list in data/processed_jobs.json. */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};
  const { clean } = JR;

  const PROMPTS = ['Find jobs that match my resume', 'Which jobs should I apply for?', 'What skills am I missing?', 'What should I learn this month?',
    'Create my career roadmap', 'Analyze my resume', 'Find IoT jobs', 'Find Python jobs', 'Show my application status', 'Why am I not getting selected?', 'Prepare interview questions'];

  function topJobs(list, n) { return list.slice(0, n).map(r => ({ id: r.job.id, percent: r.percent, matched: r.matched, missing: r.missing, why: r.why })); }
  const jobsBlock = (title, ranked, n) => ({ type: 'jobs', title, items: topJobs(ranked, n || 4) });

  function planActions(profile, ranked, gaps) {
    const apps = JR.trackedJobs().filter(j => JR.status(j.id) === 'saved');
    const top = ranked.filter(r => !JR.status(r.job.id)).slice(0, 3);
    const learn = gaps[0] && gaps[0].skill;
    return {
      today: [top.length ? 'Apply to ' + top.length + ' top matches: ' + top.map(r => r.job.title).join('; ') : 'Review your saved jobs and apply to one',
        learn ? 'Spend 1 hour on ' + learn + ': ' + JR.learnSteps(learn)[0] : 'Practise 5 interview questions'],
      week: [apps.length ? 'Move your ' + apps.length + ' saved jobs forward: apply or remove' : 'Save 5 jobs you would genuinely apply to',
        learn ? 'Finish: ' + JR.learnSteps(learn)[1] : 'Polish one project description', 'Practise 10 interview questions'],
      month: [gaps.slice(0, 3).length ? 'Cover ' + gaps.slice(0, 3).map(g => g.skill).join(', ') + ', the skills most requested that you lack' : 'Build one new project',
        'Add the new project and skills to your resume', 'Apply to at least 10 relevant jobs']
    };
  }

  function roadmap(profile, ranked, gaps) {
    const lead = gaps[0] && gaps[0].skill, top = ranked[0];
    const p = planActions(profile, ranked, gaps);
    const dem = JR.skillDemand(), covered = dem.filter(d => profile.skills.some(s => s.toLowerCase() === d.skill.toLowerCase())).length;
    const coverPct = dem.length ? Math.round(covered / dem.length * 100) : 0;
    const complete = [profile.skills.length >= 5, profile.projects.length > 0, profile.certifications.length > 0, !!profile.education, (profile.roles || []).length > 0].filter(Boolean).length * 20;
    const interviewSkill = (profile.skills.find(s => JR.QUESTION_BANK.technical[s]) || null);
    return [
      { stage: 'Current profile', progress: complete, items: [profile.skills.length + ' skills known' + (profile.skills.length ? ': ' + profile.skills.slice(0, 6).join(', ') : ''), profile.projects.length ? profile.projects.length + (profile.projects.length === 1 ? ' project' : ' projects') + ' on your resume' : 'Upload a resume to add projects'] },
      { stage: 'Skill gap', progress: coverPct, items: gaps.slice(0, 4).map(g => g.skill + ' (asked in ' + g.jobs + ' jobs)') },
      { stage: 'Learning', progress: 0, items: lead ? JR.learnSteps(lead) : ['No gaps detected in current jobs'] },
      { stage: 'Project', progress: 0, items: [lead ? 'Build one project that uses ' + lead : 'Extend your best project', 'Put it on GitHub with a clear README'] },
      { stage: 'Application', progress: Math.min(100, JR.trackedJobs().filter(j => JR.status(j.id) !== 'saved').length * 20), items: p.week.slice(0, 2).concat(top ? ['Start with: ' + top.job.title + (top.job.company ? ' at ' + top.job.company : '')] : []) },
      { stage: 'Interview', progress: 0, items: ['Practise in Interview Lab', interviewSkill ? 'Be ready for ' + interviewSkill + ' basics' : 'Prepare your project walkthrough'] },
      { stage: 'Career', progress: 0, items: ['Collect offers and compare', 'Keep learning the next most requested skill'] }
    ];
  }

  function questionsFor(job, profile) {
    const skills = (JR.jobSkills(job).length ? JR.jobSkills(job) : profile.skills);
    const tech = [];
    skills.forEach(s => (JR.QUESTION_BANK.technical[s] || []).slice(0, 2).forEach(q => tech.push({ q, tag: s })));
    const role = [
      { q: 'Why are you a fit for "' + job.title + '"?', tag: 'Role' },
      { q: 'Which part of this job description is most familiar to you, and which is new?', tag: 'Role' }
    ];
    const proj = (profile.projects.length ? profile.projects.slice(0, 2) : ['your best project']).map(p => ({ q: 'Walk me through ' + (p.length > 60 ? p.slice(0, 57) + '...' : p) + '. What was your part?', tag: 'Project' }));
    const hr = JR.QUESTION_BANK.hr.slice(0, 4).map(q => ({ q, tag: 'HR' }));
    const fu = JR.QUESTION_BANK.followups.slice(0, 3).map(q => ({ q, tag: 'Follow-up' }));
    return [].concat(tech.slice(0, 6), role, proj, hr, fu);
  }

  function respond(question, ctx) {
    const q = clean(question).toLowerCase();
    const profile = JR.getProfile();
    const ranked = JR.rankAll(profile);
    const gaps = JR.skillGaps(profile);
    const blocks = [];
    const noJobs = !JR.state.jobs.length;
    if (noJobs) return { blocks: [{ type: 'text', text: 'Job data is not loaded, so I cannot recommend jobs right now. Reload the page or check that data/processed_jobs.json exists.' }] };
    const noSkills = !profile.skills.length;
    const parsed = JR.parseQuery(question);
    const selected = ctx && ctx.job;

    const isStatus = /status|applications?|tracker|applied/.test(q) && !/apply for|should i apply/.test(q);
    if (isStatus) {
      const t = JR.trackedJobs(), by = {};
      JR.STATUSES.forEach(s => { by[s] = t.filter(j => JR.status(j.id) === s); });
      blocks.push({ type: 'text', text: t.length ? 'You are tracking ' + t.length + ' job' + (t.length > 1 ? 's' : '') + '.' : 'You have not saved or tracked any jobs yet. Save jobs from the Jobs page and they appear here.' });
      if (t.length) blocks.push({ type: 'stats', items: JR.STATUSES.map(s => ({ label: s, value: by[s].length })) });
      const act = t.filter(j => ['applied', 'interview'].includes(JR.status(j.id))).slice(0, 4).map(j => ({ id: j.id, percent: JR.analyzeJob(j, profile).percent, matched: [], missing: [], why: 'Status: ' + JR.status(j.id) }));
      if (act.length) blocks.push({ type: 'jobs', title: 'In progress', items: act });
      else if (t.length) blocks.push({ type: 'actions', title: 'Next', items: ['Pick one saved job and mark it Applied once you submit.'] });
      return { blocks };
    }
    if (/interview|prepare|prep\b/.test(q)) {
      const job = selected || (ranked[0] && ranked[0].job);
      const target = job ? job : null;
      if (target) {
        blocks.push({ type: 'text', text: 'Interview prep for "' + target.title + '"' + (target.company ? ' at ' + target.company : '') + '. Practice questions generated from the skills in this posting.' });
        blocks.push({ type: 'questions', jobId: target.id, items: questionsFor(target, profile).slice(0, 8) });
        blocks.push({ type: 'cta', label: 'START INTERVIEW', action: 'interview', jobId: target.id });
        return { blocks };
      }
    }
    if (/why.*(not|n't).*(select|hired|getting|shortlist)|rejected|no response/.test(q)) {
      const reasons = [];
      if (gaps.length) reasons.push('Skill gap: the most requested skills you do not list are ' + gaps.slice(0, 4).map(g => g.skill).join(', ') + '.');
      if (!profile.projects.length) reasons.push('No projects visible. Upload your resume so I can check; projects carry weight for freshers.');
      const applied = JR.trackedJobs().filter(j => JR.status(j.id) !== 'saved').length;
      reasons.push(applied ? 'You have applied to ' + applied + ' job(s). Fresher response rates are low; volume plus tailoring helps.' : 'You have not marked any application as applied here, so there is little to analyse yet.');
      reasons.push('Match each application to the job: reuse the posting\'s keywords honestly in your resume.');
      blocks.push({ type: 'text', text: 'I cannot see employer decisions, only your profile and the job data. Likely areas to improve:' });
      blocks.push({ type: 'actions', title: 'Likely causes', items: reasons });
      return { blocks };
    }
    if (/roadmap|career plan|plan my career/.test(q)) {
      blocks.push({ type: 'text', text: 'Your roadmap, built from your profile and the current job list.' });
      blocks.push({ type: 'roadmap', stages: roadmap(profile, ranked, gaps) });
      return { blocks };
    }
    if (/resume|cv|analy[sz]e/.test(q) && !/match(ing)? (my )?resume|jobs/.test(q)) {
      if (profile.source !== 'resume') {
        blocks.push({ type: 'text', text: 'No resume uploaded yet. I am using your target profile from config/profile.json. Upload or paste your resume on the Resume page for a real analysis.' });
        blocks.push({ type: 'cta', label: 'OPEN RESUME', action: 'page', page: 'resume' });
      } else {
        blocks.push({ type: 'text', text: 'Resume analysis for ' + (profile.name || 'your profile') + '.' });
        blocks.push({ type: 'chips', title: 'Skills detected', items: profile.skills });
        blocks.push({ type: 'actions', title: 'Strengths', items: JR.resumeStrengths(profile) });
        blocks.push({ type: 'actions', title: 'Improve', items: JR.resumeImprovements(profile) });
      }
      return { blocks };
    }
    if (/learn|this month|study/.test(q)) {
      const g = gaps.slice(0, 3);
      blocks.push({ type: 'text', text: g.length ? 'Focus this month on the skills most requested in current jobs that you do not list.' : 'No missing skills found across current jobs. Deepen projects instead.' });
      g.forEach((x, i) => blocks.push({ type: 'actions', title: (i + 1) + '. ' + x.skill + ' (asked in ' + x.jobs + ' jobs)', items: JR.learnSteps(x.skill) }));
      return { blocks };
    }
    if (/skill.*(missing|gap|lack)|missing skills|gaps?/.test(q)) {
      blocks.push({ type: 'text', text: gaps.length ? 'Skills that appear in current jobs and are missing from your profile (' + (profile.source === 'resume' ? 'from your resume' : 'from your target profile') + '):' : 'No gaps found: your profile covers every skill detected in current jobs.' });
      if (gaps.length) blocks.push({ type: 'gapbars', items: gaps.slice(0, 8).map(g => ({ skill: g.skill, jobs: g.jobs })), total: JR.state.jobs.length });
      return { blocks };
    }
    if (/apply|should i|which jobs|best jobs|top jobs/.test(q) && !parsed.skills.length) {
      const fresh = ranked.filter(r => !JR.status(r.job.id) || JR.status(r.job.id) === 'saved');
      blocks.push({ type: 'text', text: 'Your strongest not-yet-applied matches, ranked by match percentage.' });
      blocks.push(jobsBlock('Apply to these', fresh, 4));
      blocks.push({ type: 'actions', title: 'Action', items: ['Open each posting, tailor two resume lines, then mark it Applied.'] });
      return { blocks };
    }
    // default: job search (also covers "find IoT jobs", "jobs matching my resume", "Python jobs in Chennai")
    const wantsJobs = /job|role|internship|opening|find|show|match|remote|fresher/.test(q) || parsed.skills.length || parsed.cities.length;
    if (wantsJobs) {
      const f = { q: question, sort: 'match' };
      let found = JR.filterJobs(f);
      if (!found.length && parsed.skills.length) found = JR.filterJobs({ q: parsed.skills.join(' '), sort: 'match' });
      const set = new Map(ranked.map(r => [r.job.id, r]));
      const list = found.map(j => set.get(j.id)).filter(Boolean);
      if (!list.length) {
        blocks.push({ type: 'text', text: 'No jobs in the current data match "' + question + '". I only recommend jobs from the live dataset (' + JR.state.jobs.length + ' jobs). Try a broader skill or location.' });
      } else {
        blocks.push({ type: 'text', text: list.length + ' job' + (list.length > 1 ? 's' : '') + ' found in the dataset' + (list.length > 4 ? '; showing the best 4.' : '.') });
        blocks.push(jobsBlock('Best matches', list, 4));
        const lead = list[0];
        blocks.push({ type: 'actions', title: 'Action', items: [lead.missing.length ? 'Apply to #1 and learn ' + lead.missing[0] + ' basics in parallel.' : 'Apply to #1 now, you cover the detected skills.'] });
      }
      if (noSkills) blocks.push({ type: 'text', text: 'Tip: upload your resume so match percentages reflect your real skills.' });
      return { blocks };
    }
    blocks.push({ type: 'text', text: 'I can match jobs to your profile, find skill gaps, build a roadmap, analyse your resume, prepare interview questions and show application status. Try one of the suggestions below.' });
    return { blocks };
  }

  // ---- optional LLM layer ----
  let serverInfo = { checked: false, configured: false };
  async function checkServer() {
    try {
      const r = await fetch('../api/career-agent', { method: 'GET', cache: 'no-store' });
      if (r.ok) { const j = await r.json(); serverInfo = { checked: true, configured: !!j.configured }; }
      else serverInfo = { checked: true, configured: false };
    } catch (e) { serverInfo = { checked: true, configured: false }; }
    return serverInfo;
  }
  // Only the minimum context leaves the browser: profile skills, a few job summaries, tracker counts.
  function buildContext(question, ranked) {
    const p = JR.getProfile();
    return {
      question: String(question).slice(0, 500),
      profile: { skills: p.skills.slice(0, 30), roles: (p.roles || []).slice(0, 5), education: p.education || '', projects: (p.projects || []).slice(0, 4).map(x => String(x).slice(0, 120)) },
      jobs: ranked.slice(0, 8).map(r => ({ id: r.job.id, title: r.job.title, company: r.job.company, location: r.job.location, matchPercent: r.percent, matched: r.matched, missing: r.missing })),
      applications: JR.STATUSES.reduce((o, s) => { o[s] = JR.trackedJobs().filter(j => JR.status(j.id) === s).length; return o; }, {})
    };
  }
  async function askServer(question) {
    if (!serverInfo.configured) return null;
    try {
      const res = await fetch('../api/career-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildContext(question, JR.rankAll())) });
      if (!res.ok) return null;
      const j = await res.json();
      return j && j.answer ? String(j.answer) : null;
    } catch (e) { return null; }
  }
  async function ask(question, ctx) {
    const local = respond(question, ctx);
    const ai = await askServer(question);
    if (ai) local.blocks.unshift({ type: 'text', text: ai, ai: true });
    return local;
  }

  Object.assign(JR, { agentRespond: respond, agentAsk: ask, agentCheckServer: checkServer, agentServer: () => serverInfo, AGENT_PROMPTS: PROMPTS,
    buildRoadmap: () => { const p = JR.getProfile(); return roadmap(p, JR.rankAll(p), JR.skillGaps(p)); },
    dailyMission: () => { const p = JR.getProfile(), r = JR.rankAll(p), g = JR.skillGaps(p); return planActions(p, r, g); },
    interviewQuestions: questionsFor, agentBuildContext: buildContext });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
