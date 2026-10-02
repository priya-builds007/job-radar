/* app.js - startup, hash router and the single click/change handler. */
(function () {
  'use strict';
  const JR = window.JR, V = JR.views, $ = id => document.getElementById(id);
  let current = '';

  function show(name) {
    if (!V.render[name]) name = 'dashboard';
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
    current = name; V.renderNav(name);
    V.render[name]();
    document.title = 'Job Radar - ' + ((V.PAGES.find(p => p[0] === name) || [0, 'Dashboard'])[1]);
    $('moreSheet').hidden = true; window.scrollTo(0, 0);
    const pill = $('aiPillText'); if (pill) pill.textContent = 'AI ONLINE';
  }
  const route = () => show((location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0]);

  function goPage(p) { if (location.hash === '#/' + p) route(); else location.hash = '#/' + p; }

  function toggleSave(id) {
    const on = JR.toggleSaved(id);
    JR.toast(on ? 'Saved to your tracker' : 'Removed from tracker'); if (on) JR.burst();
    refresh(id);
  }
  function refresh() {
    if (!$('modal').hidden && !V.getInterview() && document.querySelector('#modalCard [data-action="save"]')) { const id = document.querySelector('#modalCard [data-action="save"]').dataset.id; V.openJob(id); }
    if (current === 'jobs') V.renderJobList(); else if (current === 'applications' || current === 'dashboard' || current === 'insights') V.render[current]();
  }

  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-action]'); if (!t) { if (ev.target.id === 'modal') V.closeModal(); return; }
    const a = t.dataset.action, id = t.dataset.id;
    if (t.tagName === 'SELECT' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return; // handled by change
    switch (a) {
      case 'page': goPage(t.dataset.page); break;
      case 'more': $('moreSheet').hidden = !$('moreSheet').hidden; break;
      case 'job': V.openJob(id); break;
      case 'close': V.closeModal(); break;
      case 'save': toggleSave(id); break;
      case 'avoid': JR.avoid(id); JR.toast('Job hidden. Restore it from Hidden jobs.'); V.renderJobList(); break;
      case 'restore': JR.restore(id); V.renderJobList(); break;
      case 'opened': break;
      case 'apply-filters': V.readFilters(); V.renderJobList(); break;
      case 'clear-filters': Object.assign(V.filters, { q: '', location: '', jobType: '', workMode: '', posted: '', skill: '', status: '', min: 0, sort: 'match', savedOnly: false, group: true }); V.render.jobs(); break;
      case 'export': V.exportCSV(); break;
      case 'scan': V.radarScan(); JR.toast('Scanning your profile against live jobs'); break;
      case 'mission': if (t.dataset.q === '__interview') V.interviewPicker(); else V.sendToAgent(t.dataset.q); break;
      case 'ask-prepare': V.closeModal(); V.sendToAgent('Prepare me for this job', { job: JR.jobById(id) }); break;
      case 'interview-start': V.startInterview(id); break;
      case 'interview-go': V.startInterview($('ivJob').value); break;
      case 'interview-next': V.interviewStep(1); break;
      case 'interview-prev': V.interviewStep(-1); break;
      case 'interview-restart': V.startInterview(V.getInterview().job.id); break;
      case 'parse-resume': V.parseResumeFromBox(); break;
      case 'save-resume': V.saveResumeDraft(); break;
      case 'clear-resume': JR.clearProfile(); V.setDraft(null); JR.toast('Resume removed'); V.render.resume(); break;
      case 'match-resume': V.sendToAgent('Find jobs that match my resume'); break;
    }
  });
  document.addEventListener('change', ev => {
    const t = ev.target, a = t.dataset && t.dataset.action;
    if (t.id === 'resumeFile') {
      const f = t.files && t.files[0]; if (!f) return; $('resumeFileName').textContent = f.name;
      JR.readResumeFile(f).then(txt => { $('resumeText').value = txt; V.parseResumeFromBox(); }).catch(e => { $('resumeMsg').textContent = e.message; });
      return;
    }
    if (t.closest && t.closest('#page-jobs .filters') && t.type !== 'search') { V.readFilters(); V.renderJobList(); return; }
    if (t.id === 'gapTarget') { V.setGapTarget(t.value); V.render.skills(); return; }
    if (a === 'set-status') { JR.setApp(t.dataset.id, { status: t.value }); JR.toast('Status: ' + t.value); if (t.value === 'applied') JR.burst(); V.render.applications(); }
    else if (a === 'set-date') JR.setApp(t.dataset.id, { appliedDate: t.value });
    else if (a === 'set-notes') { JR.setApp(t.dataset.id, { notes: t.value }); JR.toast('Note saved'); }
    else if (a === 'rm-check') { const c = JR.load('jobRadarRoadmapChecks', {}); c[t.dataset.key] = t.checked; JR.save('jobRadarRoadmapChecks', c); if (t.checked) JR.burst(); V.render.roadmap(); }
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && !$('modal').hidden) V.closeModal();
    if (ev.key === 'Enter' && ev.target.id === 'fq') { V.readFilters(); V.renderJobList(); }
    if (ev.key === 'Enter' && ev.target.id === 'fskill') { V.readFilters(); V.renderJobList(); }
  });
  document.addEventListener('submit', ev => {
    if (ev.target.id === 'agentForm') { ev.preventDefault(); V.sendToAgent($('agentInput').value); }
  });

  window.addEventListener('hashchange', route);
  (async function init() {
    JR.particles($('bgParticles'));
    await JR.loadJobs();
    await JR.agentCheckServer();
    $('aiPill').title = JR.agentServer().configured ? 'LLM and rule engine' : 'Rule-based Career Assistant (no API key configured)';
    route();
  })();
})();
