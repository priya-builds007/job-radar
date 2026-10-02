/* resume.js - reads a resume (text pasted or a .txt/.md file) and extracts a profile.
   It is plain pattern matching, so the preview always lets her edit before saving. */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};
  const clean = JR.clean;

  const SECTION = /^\s*(education|academics?|qualifications?|projects?|academic projects?|personal projects?|certifications?|certificates?|courses?|skills?|technical skills?|technologies|tools|experience|internships?|achievements?|objective|summary|profile|interests|languages|hobbies)\s*:?\s*$/i;

  function sections(text) {
    const out = { _top: [] };
    let cur = '_top';
    text.split(/\r?\n/).forEach(line => {
      const m = SECTION.exec(line);
      if (m) { cur = m[1].toLowerCase().replace(/s$/, '').replace(/^technical skill$/, 'skill'); out[cur] = out[cur] || []; return; }
      out[cur] = out[cur] || [];
      if (line.trim()) out[cur].push(line.trim());
    });
    return out;
  }
  const bullets = lines => (lines || []).map(l => l.replace(/^[-*\u2022\u25CF\u25AA\d.)\s]+/, '').trim()).filter(l => l.length > 2);

  function parse(text) {
    text = String(text || '');
    const s = sections(text);
    const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0];
    const firstLine = (s._top.find(l => !/@|\d{5,}|http/i.test(l) && l.length < 50) || '');
    const skills = JR.extractSkills(text);
    const edu = bullets(s.education || s.academic || s.qualification).slice(0, 3).join('; ') ||
      (text.match(/(b\.?e\.?|b\.?tech|m\.?tech|bachelor|master)[^\n]{0,80}/i) || [''])[0];
    const projects = bullets(s.project || s['academic project'] || s['personal project']).slice(0, 8);
    const certs = bullets(s.certification || s.certificate || s.course).slice(0, 8);
    const techLines = bullets(s.skill || s.technology || s.tool).join(', ');
    const technologies = techLines.split(/[,;|]+/).map(clean).filter(x => x && x.length < 30).slice(0, 25);
    const roles = []; // target roles: from an Objective/Summary line, else from detected skills
    const obj = (s.objective || s.summary || s.profile || []).join(' ');
    const rm = obj.match(/(software|python|java|web|iot|embedded|data|full[- ]stack|frontend|backend)[\w\s/-]{0,25}(developer|engineer|intern|analyst)/gi);
    if (rm) rm.forEach(r => roles.push(clean(r)));
    if (!roles.length) {
      if (skills.some(k => ['IoT', 'Embedded Systems', 'Arduino', 'ESP32'].includes(k))) roles.push('IoT / Embedded Software');
      if (skills.some(k => ['Python', 'Java', 'C++', 'C'].includes(k))) roles.push('Software Developer');
      if (skills.some(k => ['HTML', 'CSS', 'JavaScript', 'React'].includes(k))) roles.push('Web Developer');
    }
    return { name: clean(firstLine), email, education: clean(edu), skills, technologies, projects, certifications: certs,
      roles: [...new Set(roles)], locations: [], parsedAt: new Date().toISOString() };
  }

  // Strength areas and gaps, based only on what was parsed.
  function strengths(p) {
    const out = [];
    if (p.skills.length >= 8) out.push('Broad skill base (' + p.skills.length + ' recognised skills)');
    else if (p.skills.length) out.push(p.skills.length + ' recognised skills');
    if (p.projects.length) out.push(p.projects.length + ' project' + (p.projects.length > 1 ? 's' : '') + ' listed');
    if (p.certifications.length) out.push(p.certifications.length + ' certification' + (p.certifications.length > 1 ? 's' : ''));
    if (p.education) out.push('Education stated');
    const cats = [...new Set(p.skills.map(JR.skillCategory))];
    if (cats.length >= 3) out.push('Spans ' + cats.slice(0, 3).join(', '));
    return out;
  }
  function improvements(p) {
    const out = [];
    if (!p.projects.length) out.push('Add a Projects section with 2-3 projects and what each used.');
    if (!p.certifications.length) out.push('Add certifications or courses, even short ones.');
    if (!p.education) out.push('Add an Education section with degree, college and CGPA.');
    if (!p.email) out.push('Add an email address.');
    if (p.skills.length < 5) out.push('List your skills clearly under a Skills heading.');
    const top = JR.skillDemand().filter(d => !p.skills.includes(d.skill)).slice(0, 3);
    if (top.length) out.push('Keywords common in current job posts that are missing: ' + top.map(t => t.skill).join(', ') + ' (add only if you actually know them).');
    return out;
  }

  function readFile(file) { // text-like files only; PDFs/Word need the paste box
    return new Promise((resolve, reject) => {
      if (!/\.(txt|md|rtf|text)$/i.test(file.name) && !/^text\//.test(file.type)) {
        reject(new Error('PDF and Word files cannot be read in the browser without extra libraries. Open the file, copy the text and paste it into the box.'));
        return;
      }
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('Could not read the file.'));
      r.readAsText(file);
    });
  }

  Object.assign(JR, { parseResume: parse, resumeStrengths: strengths, resumeImprovements: improvements, readResumeFile: readFile });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
