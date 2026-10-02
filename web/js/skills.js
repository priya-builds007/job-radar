/* skills.js - one skill list with aliases, used by search, resume parsing,
   and the match engine. Adding a skill here makes it work everywhere. */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};

  // [name, category, aliases (lowercase, matched as whole words)]
  const TABLE = [
    ['Python', 'Programming', ['python', 'py']],
    ['Java', 'Programming', ['java', 'core java']],
    ['JavaScript', 'Web', ['javascript', 'js', 'es6']],
    ['TypeScript', 'Web', ['typescript']],
    ['C', 'Programming', ['c language', 'c programming', 'embedded c']],
    ['C++', 'Programming', ['c++', 'cpp']],
    ['C#', 'Programming', ['c#', 'csharp', '.net', 'dotnet']],
    ['Go', 'Programming', ['golang']],
    ['HTML', 'Web', ['html', 'html5']],
    ['CSS', 'Web', ['css', 'css3', 'tailwind', 'bootstrap']],
    ['React', 'Web', ['react', 'react.js', 'reactjs']],
    ['Angular', 'Web', ['angular']],
    ['Node.js', 'Web', ['node.js', 'nodejs', 'node', 'express', 'express.js']],
    ['REST APIs', 'Web', ['rest', 'rest api', 'rest apis', 'restful', 'api', 'apis']],
    ['Django', 'Web', ['django']],
    ['Flask', 'Web', ['flask']],
    ['SQL', 'Data', ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'rdbms']],
    ['MongoDB', 'Data', ['mongodb', 'mongo', 'nosql']],
    ['Firebase', 'Data', ['firebase', 'firestore', 'real-time database', 'realtime database']],
    ['Pandas', 'Data', ['pandas', 'numpy']],
    ['Machine Learning', 'AI/ML', ['machine learning', 'ml', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'ai']],
    ['Data Analysis', 'Data', ['data analysis', 'data analytics', 'power bi', 'tableau', 'excel']],
    ['Git', 'Tools', ['git', 'github', 'version control', 'gitlab']],
    ['Linux', 'Tools', ['linux', 'unix', 'bash', 'shell scripting']],
    ['Docker', 'Cloud', ['docker', 'kubernetes', 'containers']],
    ['AWS', 'Cloud', ['aws', 'amazon web services']],
    ['Azure', 'Cloud', ['azure']],
    ['GCP', 'Cloud', ['gcp', 'google cloud']],
    ['CI/CD', 'Cloud', ['ci/cd', 'jenkins', 'github actions', 'devops']],
    ['IoT', 'Embedded/IoT', ['iot', 'internet of things', 'smart devices']],
    ['Embedded Systems', 'Embedded/IoT', ['embedded', 'embedded systems', 'firmware', 'microcontroller', 'microcontrollers', 'rtos']],
    ['Arduino', 'Embedded/IoT', ['arduino']],
    ['ESP32', 'Embedded/IoT', ['esp32', 'esp8266']],
    ['Raspberry Pi', 'Embedded/IoT', ['raspberry pi']],
    ['MQTT', 'Embedded/IoT', ['mqtt']],
    ['VLSI', 'Hardware', ['vlsi', 'verilog', 'vhdl', 'rtl', 'fpga', 'asic', 'systemverilog']],
    ['Testing', 'Practices', ['testing', 'qa', 'selenium', 'unit testing', 'test automation']],
    ['Data Structures', 'Fundamentals', ['data structures', 'dsa', 'algorithms']],
    ['OOP', 'Fundamentals', ['oop', 'object oriented', 'object-oriented']]
  ];

  // Related searches: asking for one of these also looks for the others.
  const RELATED = {
    'iot': ['embedded systems', 'arduino', 'esp32', 'raspberry pi', 'mqtt'],
    'embedded systems': ['iot', 'c', 'c++', 'arduino', 'vlsi'],
    'web': ['html', 'css', 'javascript', 'react', 'node.js'],
    'frontend': ['html', 'css', 'javascript', 'react'],
    'backend': ['node.js', 'python', 'java', 'sql', 'rest apis'],
    'data': ['sql', 'pandas', 'data analysis', 'python'],
    'cloud': ['aws', 'azure', 'gcp', 'docker']
  };

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = TABLE.map(([name, cat, aliases]) => {
    const all = [name.toLowerCase()].concat(aliases);
    const rx = new RegExp('(^|[^a-z0-9+#])(' + all.map(esc).join('|') + ')(?![a-z0-9+#])', 'i');
    return { name, cat, rx, aliases: all };
  });
  // Short or ambiguous aliases must not trigger on ordinary words, so those are
  // case-sensitive-ish: only count "C" or "Go" when written as a tech token.
  const STRICT = { 'C': /(^|[\s,;(/])C(?=[\s,;)/.]|$)/, 'Go': /golang|(^|[,;/(])\s*Go\s*(?=[,;/)]|$)/i };

  function extract(text) {
    const t = String(text || '');
    const out = [];
    for (const p of patterns) {
      if (STRICT[p.name]) {
        const hit = STRICT[p.name].test(t) || (p.name === 'C' && /\bembedded c\b|\bc language\b|\bc programming\b/i.test(t));
        if (hit) out.push(p.name);
      } else if (p.rx.test(t)) out.push(p.name);
    }
    return out;
  }
  const all = () => TABLE.map(r => r[0]);
  const category = name => (TABLE.find(r => r[0].toLowerCase() === String(name).toLowerCase()) || [])[1] || 'Other';
  const canon = name => (TABLE.find(r => r[0].toLowerCase() === String(name).toLowerCase()) || [])[0] || null;

  // Turn a search word into canonical skills (with related terms if asked).
  function expand(word) {
    const w = String(word).toLowerCase();
    const found = new Set(extract(w));
    const rel = RELATED[w] || [];
    rel.forEach(r => { const c = canon(r); if (c) found.add(c); });
    return [...found];
  }

  Object.assign(JR, { skillTable: TABLE, extractSkills: extract, allSkills: all, skillCategory: category, canonSkill: canon, expandSkill: expand, RELATED });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
