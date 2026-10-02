/* store.js - the app's data: jobs, saved/avoided lists, applications, profile.
   Jobs come from data/processed_jobs.json. Everything personal lives in localStorage. */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};
  const { KEYS, load, save, normalizeJob, clean } = JR;

  const STATUSES = ['saved', 'applied', 'interview', 'selected', 'rejected'];
  const state = { jobs: [], defaultProfile: null, jobsError: null };

  async function loadJobs() {
    try {
      const res = await fetch('../data/processed_jobs.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.jobs;
      if (!Array.isArray(list)) throw new Error('Unexpected data format');
      state.jobs = list.map(normalizeJob).filter(j => j.id);
      state.jobsError = null;
    } catch (e) {
      console.error('Job data failed to load:', e);
      state.jobs = [];
      state.jobsError = String(e.message || e);
    }
    try { // her own target profile from the repo; used until a resume is uploaded
      const r = await fetch('../config/profile.json', { cache: 'no-store' });
      if (r.ok) state.defaultProfile = await r.json();
    } catch (e) { /* optional */ }
  }

  const jobById = id => state.jobs.find(j => j.id === id) || null;

  // ---- saved / avoided ----
  const lists = { saved: load(KEYS.saved, []), avoided: load(KEYS.avoided, []) };
  const isSaved = id => lists.saved.includes(id);
  const isAvoided = id => lists.avoided.includes(id);

  // ---- applications: id -> {status, notes, appliedDate} ----
  let apps = load(KEYS.apps, null);
  if (!apps) { // migrate the old status map once
    apps = {};
    const old = load(KEYS.status, {});
    Object.keys(old).forEach(id => { apps[id] = { status: old[id], notes: '', appliedDate: '' }; });
    save(KEYS.apps, apps);
  }
  function app(id) { return apps[id] || { status: 'saved', notes: '', appliedDate: '' }; }
  function status(id) { return isSaved(id) || apps[id] ? app(id).status : null; }
  function setApp(id, patch) {
    const cur = app(id);
    const next = Object.assign({}, cur, patch);
    if (patch.status === 'applied' && !next.appliedDate) next.appliedDate = new Date().toISOString().slice(0, 10);
    apps[id] = next;
    save(KEYS.apps, apps);
    // anything in the tracker is also "saved" so it shows up on the board
    if (!isSaved(id)) { lists.saved.push(id); save(KEYS.saved, lists.saved); }
  }
  function toggleSaved(id) {
    if (isSaved(id)) {
      lists.saved = lists.saved.filter(x => x !== id);
      delete apps[id];
      save(KEYS.apps, apps);
    } else {
      lists.saved.push(id);
      lists.avoided = lists.avoided.filter(x => x !== id);
      save(KEYS.avoided, lists.avoided);
    }
    save(KEYS.saved, lists.saved);
    return isSaved(id);
  }
  function avoid(id) {
    if (!isAvoided(id)) lists.avoided.push(id);
    lists.saved = lists.saved.filter(x => x !== id);
    delete apps[id];
    save(KEYS.avoided, lists.avoided); save(KEYS.saved, lists.saved); save(KEYS.apps, apps);
  }
  function restore(id) { lists.avoided = lists.avoided.filter(x => x !== id); save(KEYS.avoided, lists.avoided); }
  const trackedJobs = () => lists.saved.map(jobById).filter(Boolean);

  // ---- profile: parsed resume, else her config/profile.json, else empty ----
  function getProfile() {
    const parsed = load(KEYS.profile, null);
    if (parsed) return Object.assign({ source: 'resume' }, parsed);
    const old = load(KEYS.resume, null); // manual form from the old dashboard
    if (old && (old.skills || old.name)) {
      return { source: 'resume', name: old.name || '', education: '', projects: [], certifications: [], technologies: [],
        skills: JR.extractSkills(old.skills).concat(String(old.skills).split(/[,;\n|]+/).map(clean).filter(Boolean)).filter((v, i, a) => a.indexOf(v) === i),
        roles: old.role ? [old.role] : [], locations: old.location ? [old.location] : [] };
    }
    const d = state.defaultProfile;
    if (d) return { source: 'config', name: d.name || '', education: d.education || '', projects: [], certifications: [], technologies: [],
      skills: (d.skills || []).map(s => JR.canonSkill(s) || s), roles: d.roles || [], locations: d.locations || [] };
    return { source: 'none', name: '', education: '', projects: [], certifications: [], technologies: [], skills: [], roles: [], locations: [] };
  }
  const saveProfile = p => save(KEYS.profile, p);
  const clearProfile = () => { JR.remove(KEYS.profile); JR.remove(KEYS.resume); };

  Object.assign(JR, { STATUSES, state, loadJobs, jobById, isSaved, isAvoided, status, app, setApp, toggleSaved, avoid, restore,
    trackedJobs, getProfile, saveProfile, clearProfile, lists });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
