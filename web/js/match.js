/* match.js - the Job Match Engine. Every number comes from the job record and the profile.
   match% = 50% skill coverage + 35% existing relevance score + 15% location fit
   (if the job lists no recognisable skills, the weights are re-spread over the other two). */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};

  const PLACE_WORDS = { bengaluru: ['bengaluru', 'bangalore', 'ka, in', 'karnataka'], chennai: ['chennai'], coimbatore: ['coimbatore'],
    tamil: ['tamil nadu', 'tn, in'], hyderabad: ['hyderabad', 'ts, in', 'telangana'], pune: ['pune'], mumbai: ['mumbai'],
    delhi: ['delhi', 'noida', 'gurgaon', 'gurugram'], kerala: ['kerala', 'kl, in', 'kochi'] };

  function locationFit(job, profile) {
    const loc = (job.location || '').toLowerCase();
    if (job.is_remote || /remote/.test(loc)) return 1;
    const prefs = (profile.locations || []).map(s => s.toLowerCase());
    if (!prefs.length) return 0.5;
    for (const p of prefs) {
      if (p === 'remote') continue;
      if (loc.includes(p)) return 1;
      for (const k of Object.keys(PLACE_WORDS)) {
        if (p.includes(k) && PLACE_WORDS[k].some(w => loc.includes(w))) return 1;
      }
    }
    return prefs.includes('india') && /\bin\b|india/.test(loc) ? 0.7 : 0.2;
  }

  function experience(job) {
    const t = (job.title + ' ' + job.description).toLowerCase();
    const m = /(\d+)\s*\+?\s*(?:-|to)?\s*(\d+)?\s*(?:years?|yrs)/.exec(t);
    if (/intern|fresher|entry[- ]level|graduate|trainee/.test(t) && !(m && +m[1] >= 3)) return 'Fresher / intern level';
    if (m) return m[2] ? m[1] + '-' + m[2] + ' years' : m[1] + '+ years';
    return 'Not stated';
  }

  const cache = new Map();
  function jobSkills(job) {
    if (!cache.has(job.id)) {
      const found = JR.extractSkills(job.title + '\n' + job.description);
      (job.matched_skills || []).forEach(s => { const c = JR.canonSkill(s); if (c && !found.includes(c)) found.push(c); });
      cache.set(job.id, found);
    }
    return cache.get(job.id);
  }

  function analyze(job, profile) {
    profile = profile || JR.getProfile();
    const have = new Set((profile.skills || []).map(s => (JR.canonSkill(s) || s).toLowerCase()));
    const needed = jobSkills(job);
    const matched = needed.filter(s => have.has(s.toLowerCase()));
    const missing = needed.filter(s => !have.has(s.toLowerCase()));
    const cov = needed.length ? matched.length / needed.length : null;
    const rel = Math.min(100, job.score) / 100;
    const loc = locationFit(job, profile);
    const pct = cov == null ? 0.7 * rel + 0.3 * loc : 0.5 * cov + 0.35 * rel + 0.15 * loc;
    const percent = Math.round(pct * 100);
    const bits = [];
    if (matched.length) bits.push('you already list ' + matched.slice(0, 4).join(', '));
    if (job.reasons.length) bits.push(job.reasons[0].charAt(0).toLowerCase() + job.reasons[0].slice(1));
    if (loc === 1) bits.push(job.is_remote ? 'it is remote' : 'the location fits your preferences');
    const why = bits.length ? 'This matches because ' + bits.join('; ') + '.' : 'Limited signals in this posting; check the description before applying.';
    return { job, percent, matched, missing, needed, experience: experience(job), locationFit: loc, relevance: job.score,
      why, gapNote: missing.length ? 'To strengthen your application: ' + missing.slice(0, 3).join(', ') + '.' : (needed.length ? 'You cover every skill detected in this posting.' : 'No specific skills detected in the description.') };
  }

  function rankAll(profile) {
    profile = profile || JR.getProfile();
    return JR.state.jobs.filter(j => !JR.isAvoided(j.id)).map(j => analyze(j, profile)).sort((a, b) => b.percent - a.percent);
  }

  // Skills ranked by how many jobs ask for them and you lack them.
  function skillGaps(profile) {
    const ranked = rankAll(profile), n = {};
    ranked.forEach(r => r.missing.forEach(s => { n[s] = (n[s] || 0) + 1; }));
    return Object.entries(n).map(([skill, jobs]) => ({ skill, jobs })).sort((a, b) => b.jobs - a.jobs);
  }
  function demand() { // how many jobs mention each skill, regardless of the profile
    const n = {};
    JR.state.jobs.forEach(j => jobSkills(j).forEach(s => { n[s] = (n[s] || 0) + 1; }));
    return Object.entries(n).map(([skill, jobs]) => ({ skill, jobs })).sort((a, b) => b.jobs - a.jobs);
  }

  Object.assign(JR, { analyzeJob: analyze, rankAll, skillGaps, skillDemand: demand, jobSkills, locationFit });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
