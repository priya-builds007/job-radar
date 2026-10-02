/* core.js - small shared helpers: text, storage, dates, safe links, toast.
   Every file in web/js is a plain script that adds itself to the JR object,
   so there is no build step and Vercel can serve it as-is. */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};

  const KEYS = {
    saved: 'jobRadarSavedJobs',
    avoided: 'jobRadarAvoidedJobs',
    resume: 'jobRadarResume',          // old manual form, still read for compatibility
    status: 'jobRadarApplicationStatus', // old id -> status map, migrated
    apps: 'jobRadarApplications',      // id -> {status, notes, appliedDate}
    profile: 'jobRadarProfile',        // parsed resume profile
    chat: 'jobRadarChat'
  };

  function clean(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // localStorage can be blocked (private mode, sandboxed frames). Fall back to memory so the app still works for the session.
  const memory = {};
  function load(key, fallback) {
    try {
      const raw = root.localStorage ? root.localStorage.getItem(key) : memory[key];
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return memory[key] ? JSON.parse(memory[key]) : fallback;
    }
  }
  function save(key, value) {
    const json = JSON.stringify(value);
    memory[key] = json;
    try { root.localStorage.setItem(key, json); } catch (e) { /* blocked or full: memory copy is used */ }
  }
  function remove(key) {
    delete memory[key];
    try { root.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  // Only http(s) links are ever opened; anything else (javascript:, data:) is dropped.
  function safeLink(url) {
    try {
      const u = new URL(String(url || ''));
      return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
    } catch (e) { return null; }
  }

  // Same buckets as radar/dates.py: Today, This Week (Mon-Sun), This Month, Older.
  function dateBucket(posted, today) {
    today = today || new Date();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(posted || ''));
    if (!m) return 'Unknown date';
    const day = new Date(+m[1], +m[2] - 1, +m[3]);
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (isNaN(day) || day > t0) return 'Unknown date';
    if (day.getTime() === t0.getTime()) return 'Today';
    const mondayOffset = (t0.getDay() + 6) % 7;
    const monday = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() - mondayOffset);
    if (day >= monday) return 'This Week';
    if (day.getFullYear() === t0.getFullYear() && day.getMonth() === t0.getMonth()) return 'This Month';
    return 'Older';
  }

  function normalizeJob(j) {
    const id = String(j.id || j.job_id || j.job_url || (clean(j.company) + '-' + clean(j.title)));
    return Object.assign({}, j, {
      id,
      title: clean(j.title), company: clean(j.company), location: clean(j.location),
      description: String(j.description || ''), source: clean(j.source),
      job_type: clean(j.job_type), job_url: clean(j.job_url), date_posted: clean(j.date_posted),
      score: Number(j.score || 0), is_remote: Boolean(j.is_remote),
      matched_skills: Array.isArray(j.matched_skills) ? j.matched_skills : [],
      reasons: Array.isArray(j.reasons) ? j.reasons : []
    });
  }

  function toast(msg) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function pretty(s) { // "fulltime, internship" -> "Full-time, Internship"
    return clean(s).split(',').map(x => x.trim()).filter(Boolean).map(x => {
      const k = x.toLowerCase();
      if (k === 'fulltime') return 'Full-time';
      if (k === 'parttime') return 'Part-time';
      return k.charAt(0).toUpperCase() + k.slice(1);
    }).join(', ');
  }

  Object.assign(JR, { KEYS, clean, esc, load, save, remove, safeLink, dateBucket, normalizeJob, toast, pretty });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
