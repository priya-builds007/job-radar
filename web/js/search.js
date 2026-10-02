/* search.js - natural-language job search ("Python jobs for freshers in Chennai")
   and the filter panel logic. Both use the same function so they never disagree. */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};

  const CITY = { bangalore: 'bengaluru', bengaluru: 'bengaluru', chennai: 'chennai', coimbatore: 'coimbatore', hyderabad: 'hyderabad',
    pune: 'pune', mumbai: 'mumbai', delhi: 'delhi', noida: 'noida', kochi: 'kochi', madurai: 'madurai', trichy: 'tiruchirappalli' };
  const STOP = new Set(['find', 'show', 'me', 'jobs', 'job', 'for', 'in', 'at', 'the', 'a', 'an', 'and', 'with', 'my', 'of', 'to', 'roles', 'role', 'openings', 'positions', 'please', 'get', 'any', 'matching', 'resume', 'that', 'are', 'near', 'available']);

  function parseQuery(q) {
    q = String(q || '').toLowerCase().trim();
    const out = { skills: [], cities: [], remote: false, fresher: false, intern: false, resume: false, words: [], raw: q };
    if (!q) return out;
    out.resume = /(match(ing)?|based on|using|fit)\s+(my\s+)?(resume|profile|skills)|my resume/.test(q);
    out.remote = /\bremote|work from home|wfh\b/.test(q);
    out.fresher = /fresher|entry[- ]level|graduate|junior/.test(q);
    out.intern = /intern/.test(q);
    Object.keys(CITY).forEach(c => { if (new RegExp('\\b' + c + '\\b').test(q)) out.cities.push(CITY[c]); });
    // multi-word skills first, then single words
    JR.extractSkills(q).forEach(s => out.skills.push(s));
    Object.keys(JR.RELATED).forEach(k => { if (new RegExp('\\b' + k + '\\b').test(q)) JR.expandSkill(k).forEach(s => !out.skills.includes(s) && out.skills.push(s)); });
    const used = new Set(['remote', 'fresher', 'freshers', 'intern', 'interns', 'internship', 'internships', 'level', 'entry', 'software', 'work', 'from', 'home', 'wfh', 'match', 'based', 'on', 'using', 'fit', 'junior', 'graduate']);
    Object.keys(CITY).forEach(c => used.add(c));
    q.split(/[^a-z0-9+#.]+/).filter(w => w && !STOP.has(w) && !used.has(w)).forEach(w => {
      if (JR.extractSkills(w).length || JR.RELATED[w]) return;
      out.words.push(w);
    });
    return out;
  }

  const hay = j => (j.title + ' ' + j.company + ' ' + j.location + ' ' + j.description + ' ' + j.source + ' ' + j.job_type).toLowerCase();

  function matchesParsed(job, p, profile) {
    const text = hay(job), title = job.title.toLowerCase();
    if (p.cities.length && !p.cities.some(c => text.includes(c) || (JR.locationFit && false))) {
      const loc = job.location.toLowerCase();
      if (!p.cities.some(c => loc.includes(c) || (c === 'bengaluru' && /ka, in|karnataka/.test(loc)))) return false;
    }
    if (p.remote && !(job.is_remote || /remote/.test(text))) return false;
    if (p.intern && !/intern/.test(title + ' ' + job.job_type.toLowerCase())) return false;
    if (p.fresher && !/fresher|entry|graduate|intern|trainee|junior|0-1|0-2/.test(text)) return false;
    if (p.skills.length) {
      const js = JR.jobSkills(job);
      const hit = p.skills.some(s => js.includes(s));
      if (!hit && !p.skills.some(s => text.includes(s.toLowerCase()))) return false;
    }
    if (p.resume && profile) {
      const a = JR.analyzeJob(job, profile);
      if (!a.matched.length) return false;
    }
    return p.words.every(w => text.includes(w));
  }

  function skillFilter(job, text) {
    const t = text.toLowerCase().trim();
    if (!t) return true;
    const canon = JR.expandSkill(t);
    const js = JR.jobSkills(job).map(s => s.toLowerCase());
    return canon.some(c => js.includes(c.toLowerCase())) || hay(job).includes(t);
  }

  // f = {q, location, jobType, workMode, posted, skill, status, min, sort, savedOnly}
  function filterJobs(f) {
    const profile = JR.getProfile();
    const p = parseQuery(f.q);
    let list = JR.state.jobs.filter(j => !JR.isAvoided(j.id));
    if (f.savedOnly) list = list.filter(j => JR.isSaved(j.id));
    list = list.filter(j => {
      if (f.q && !matchesParsed(j, p, profile)) return false;
      if (f.location && !j.location.toLowerCase().includes(f.location.toLowerCase())) return false;
      if (f.jobType && !j.job_type.toLowerCase().includes(f.jobType)) return false;
      if (f.workMode === 'remote' && !j.is_remote) return false;
      if (f.workMode === 'onsite' && j.is_remote) return false;
      if (f.posted && JR.dateBucket(j.date_posted) !== f.posted) return false;
      if (f.skill && !skillFilter(j, f.skill)) return false;
      if (f.status) {
        const s = JR.status(j.id);
        if (f.status === 'untracked' ? s : s !== f.status) return false;
      }
      if (f.min && j.score < +f.min) return false;
      return true;
    });
    const rank = {}; JR.rankAll(profile).forEach(r => { rank[r.job.id] = r.percent; });
    const by = {
      score: (a, b) => b.score - a.score,
      match: (a, b) => (rank[b.id] || 0) - (rank[a.id] || 0),
      newest: (a, b) => (b.date_posted || '').localeCompare(a.date_posted || ''),
      company: (a, b) => a.company.localeCompare(b.company)
    };
    return list.sort(by[f.sort] || by.match);
  }

  Object.assign(JR, { parseQuery, filterJobs });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
