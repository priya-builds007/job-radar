/* fx.js - visual effects: the signature radar, background particles, counters,
   progress rings, tilt, typing and scroll reveal. All effects pause when the tab is
   hidden or off-screen, and are switched off for people who prefer reduced motion. */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};
  const reduced = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

  /* ---------- Signature radar ----------
     Each job is one blip. Angle comes from the job id (stable), distance from the match
     percent (closer to the centre = better match). When the sweep passes a blip it lights up;
     strong matches (>= 70%) also draw a glowing line to YOU (centre) and to the AI node. */
  function Radar(canvas, onPick) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, blips = [], angle = -Math.PI / 2, last = 0, raf = 0, visible = true, hover = null, flash = 0, scanBoost = 0;
    const tip = canvas.parentElement.querySelector('.radar-tip');

    function build() {
      const ranked = JR.rankAll();
      blips = ranked.map(r => {
        const a = hash(r.job.id) * TAU;
        const dist = 0.18 + (1 - Math.min(100, r.percent) / 100) * 0.72 * (0.85 + hash(r.job.id + 'r') * 0.3);
        return { id: r.job.id, title: r.job.title, company: r.job.company, percent: r.percent, a, d: Math.min(0.95, dist), lit: 0, strong: r.percent >= 70,
          drift: (hash(r.job.id + 'd') - 0.5) * 0.02 };
      });
    }
    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, root.devicePixelRatio || 1);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const geo = () => ({ cx: w / 2, cy: h / 2, R: Math.min(w, h) / 2 - 10 });
    const pos = (b, g) => ({ x: g.cx + Math.cos(b.a) * b.d * g.R, y: g.cy + Math.sin(b.a) * b.d * g.R });
    const aiNode = g => ({ x: g.cx + g.R * 0.62, y: g.cy - g.R * 0.62 });

    function draw(now) {
      const dt = Math.min(50, now - last) / 1000; last = now;
      const g = geo();
      ctx.clearRect(0, 0, w, h);
      if (g.R < 20) { raf = 0; return; } // not laid out yet (hidden tab or zero-size canvas)
      // rings + cross-hairs
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) { ctx.strokeStyle = 'rgba(57,255,140,' + (0.07 + i * 0.03) + ')'; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * i / 4, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(57,255,140,0.10)';
      ctx.beginPath(); ctx.moveTo(g.cx - g.R, g.cy); ctx.lineTo(g.cx + g.R, g.cy); ctx.moveTo(g.cx, g.cy - g.R); ctx.lineTo(g.cx, g.cy + g.R); ctx.stroke();
      // sweep wedge
      const speed = (reduced() ? 0 : 0.9) * (1 + scanBoost * 2);
      angle = (angle + speed * dt) % TAU;
      if (scanBoost > 0) scanBoost = Math.max(0, scanBoost - dt * 0.35);
      if (!reduced()) {
        const grad = ctx.createConicGradient ? ctx.createConicGradient(angle - 0.9, g.cx, g.cy) : null;
        if (grad) { grad.addColorStop(0, 'rgba(57,255,140,0)'); grad.addColorStop(0.14, 'rgba(57,255,140,0.22)'); grad.addColorStop(0.1429, 'rgba(57,255,140,0)'); grad.addColorStop(1, 'rgba(57,255,140,0)');
          ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = 'rgba(120,255,180,0.9)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.cx + Math.cos(angle) * g.R, g.cy + Math.sin(angle) * g.R); ctx.stroke();
      }
      const ai = aiNode(g);
      // blips
      blips.forEach(b => {
        if (!reduced()) {
          let diff = (angle - b.a) % TAU; if (diff < 0) diff += TAU;
          if (diff < 0.12 && speed > 0) b.lit = 1;
          b.a += b.drift * dt; // slow drift: the signals move
        } else b.lit = b.strong ? 0.8 : 0.35;
        b.lit = Math.max(0, b.lit - dt * 0.35);
        const p = pos(b, g);
        b.px = p.x; b.py = p.y;
        const base = b.strong ? 0.5 : 0.22, a = Math.min(1, base + b.lit);
        if (b.strong && b.lit > 0.05) { // connection lines: YOU <- job -> AI
          ctx.strokeStyle = 'rgba(57,255,140,' + (b.lit * 0.55) + ')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(p.x, p.y); ctx.lineTo(ai.x, ai.y); ctx.stroke();
        }
        const r = Math.max(0.5, (b.strong ? 3.4 : 2.2) + b.lit * 2.2 + (hover === b ? 2 : 0));
        ctx.fillStyle = 'rgba(57,255,140,' + a + ')';
        ctx.shadowColor = 'rgba(57,255,140,0.9)'; ctx.shadowBlur = b.lit * 14 + (b.strong ? 5 : 0);
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
      });
      // YOU node, AI node, link between them
      const pulse = 1 + Math.sin(now / 500) * 0.12;
      ctx.strokeStyle = 'rgba(57,255,140,0.28)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(ai.x, ai.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#39ff8c'; ctx.shadowColor = '#39ff8c'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(g.cx, g.cy, 6 * pulse, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ai.x, ai.y, 5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = '600 10px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(200,255,225,0.85)'; ctx.textAlign = 'center';
      ctx.fillText('YOU', g.cx, g.cy + 20); ctx.fillText('AI', ai.x, ai.y - 11);
      if (flash > 0) { flash = Math.max(0, flash - dt); }
      raf = (visible && !document.hidden && !reduced()) ? requestAnimationFrame(draw) : 0;
    }
    function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(draw); } }
    function nearest(ev) {
      const rect = canvas.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      let best = null, bd = 18;
      blips.forEach(b => { const d = Math.hypot((b.px || -99) - x, (b.py || -99) - y); if (d < bd) { bd = d; best = b; } });
      return best;
    }
    canvas.addEventListener('pointermove', ev => {
      hover = nearest(ev);
      canvas.style.cursor = hover ? 'pointer' : 'default';
      if (tip) { if (hover) { tip.hidden = false; tip.textContent = hover.title + (hover.company ? ' - ' + hover.company : '') + ' (' + hover.percent + '%)';
        tip.style.left = Math.min(w - 10, Math.max(10, hover.px)) + 'px'; tip.style.top = (hover.py - 14) + 'px'; } else tip.hidden = true; }
      if (reduced()) draw(performance.now());
    });
    canvas.addEventListener('pointerleave', () => { hover = null; if (tip) tip.hidden = true; });
    canvas.addEventListener('click', ev => { const b = nearest(ev); if (b && onPick) onPick(b.id); });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    new ResizeObserver(() => { resize(); if (reduced()) draw(performance.now()); else start(); }).observe(canvas);
    build(); resize(); if (reduced()) { draw(performance.now()); } else start();
    return {
      rebuild() { build(); },
      scan() { scanBoost = 1; blips.forEach(b => { if (b.strong) b.lit = 1; }); start(); },
      strongCount: () => blips.filter(b => b.strong).length, total: () => blips.length
    };
  }

  /* ---------- Subtle background particles (about 40 dots, very low contrast) ---------- */
  function particles(canvas) {
    if (reduced()) return;
    const ctx = canvas.getContext('2d');
    let w, h, dots = [], raf = 0, last = 0;
    function size() { w = canvas.width = innerWidth; h = canvas.height = innerHeight; const n = w < 700 ? 22 : 42;
      dots = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, v: 4 + Math.random() * 8, r: 0.6 + Math.random() * 1.2, a: 0.1 + Math.random() * 0.25 })); }
    function tick(now) {
      const dt = Math.min(60, now - last) / 1000; last = now;
      ctx.clearRect(0, 0, w, h);
      dots.forEach(d => { d.y -= d.v * dt; if (d.y < -4) { d.y = h + 4; d.x = Math.random() * w; }
        ctx.fillStyle = 'rgba(57,255,140,' + d.a + ')'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); });
      raf = document.hidden ? 0 : requestAnimationFrame(tick);
    }
    size(); addEventListener('resize', size);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } });
    last = performance.now(); raf = requestAnimationFrame(tick);
  }

  /* ---------- small helpers ---------- */
  function counter(el, to, ms) {
    to = Number(to) || 0;
    if (reduced() || to === 0) { el.textContent = to; return; }
    const t0 = performance.now(); ms = ms || 900;
    (function step(now) { const p = Math.min(1, (now - t0) / ms); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(t0);
  }
  function ring(percent, label, size) { // SVG ring; the fill animates through CSS
    size = size || 64; const r = 26, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, percent));
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 64 64" role="img" aria-label="' + p + ' percent ' + (label || 'match') + '">' +
      '<circle class="ring-bg" cx="32" cy="32" r="' + r + '"/><circle class="ring-fg" cx="32" cy="32" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '" data-target="' + (c * (1 - p / 100)).toFixed(1) + '"/>' +
      '<text x="32" y="36" text-anchor="middle">' + p + '%</text></svg>';
  }
  function animateIn(scope) { // fills rings and bars after they are in the DOM
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scope.querySelectorAll('.ring-fg').forEach(e => { e.style.strokeDashoffset = e.dataset.target; });
      scope.querySelectorAll('[data-fill]').forEach(e => { e.style.width = e.dataset.fill + '%'; });
      scope.querySelectorAll('[data-count]').forEach(e => counter(e, e.dataset.count));
    }));
  }
  let revealObs;
  function reveal(scope) {
    const items = scope.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in root) || reduced()) { items.forEach(e => e.classList.add('in')); return; }
    revealObs = revealObs || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); } }), { threshold: 0.08 });
    items.forEach((e, i) => { e.style.transitionDelay = Math.min(i, 8) * 45 + 'ms'; revealObs.observe(e); });
  }
  function tilt(scope) {
    if (reduced() || !root.matchMedia('(hover: hover)').matches) return;
    scope.querySelectorAll('.tilt:not([data-t])').forEach(el => {
      el.dataset.t = 1;
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(800px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg) translateY(-2px)';
        el.style.setProperty('--mx', (x + 0.5) * 100 + '%'); el.style.setProperty('--my', (y + 0.5) * 100 + '%'); });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  function type(el, text, done) { // typing effect; skipped for reduced motion
    if (reduced()) { el.textContent = text; done && done(); return; }
    let i = 0; const step = Math.max(1, Math.ceil(text.length / 160));
    (function tick() { i = Math.min(text.length, i + step); el.textContent = text.slice(0, i); if (i < text.length) setTimeout(tick, 14); else done && done(); })();
  }
  function burst() {
    const b = document.getElementById('burst'); if (!b) return;
    b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
  }

  Object.assign(JR, { Radar, particles, counter, ring, animateIn, reveal, tilt, typeText: type, burst, prefersReducedMotion: reduced });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
