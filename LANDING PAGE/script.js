/* ── MESH CANVAS ──────────────────────────────────────────── */
(function(){
  const canvas = document.getElementById('mesh-canvas');
  const ctx    = canvas.getContext('2d');
  const hero   = document.getElementById('hero');
  let W, H, pts, raf;
  const N = 7;

  /*
   * FIX 1 — Size canvas from the HERO element, not canvas.offsetWidth.
   *          Before the first paint canvas has no intrinsic size, so
   *          offsetWidth/Height = 0, causing all gradients to collapse
   *          to point (0,0) and bleed up into the nav/logo.
   */
  function resize() {
    const rect = hero.getBoundingClientRect();
    W = canvas.width  = rect.width;
    H = canvas.height = rect.height;
  }

  /*
   * FIX 2 — Remove the near-opaque deep-violet color `rgba(30,27,75,`.
   *          Its center stop was 0.22 opacity which is heavy enough to
   *          paint a solid-looking dark blotch wherever the orb spawns,
   *          including directly over the logo area.
   *          Replace with two transparent complementary accent tones that
   *          add glow without ever becoming visible as a solid shape.
   *
   * ENHANCEMENT — Add a slow sin-wave "breathe" to each orb's radius
   *               so the mesh pulses gently rather than just translating.
   */
  const COLORS = [
    'rgba(6,182,212,',    // cyan
    'rgba(107,127,215,',  // periwinkle
    'rgba(6,182,212,',    // cyan again — keeps palette cool, no violet blobs
    'rgba(56,107,235,',   // mid-blue accent
    'rgba(107,127,215,',  // periwinkle
    'rgba(14,165,233,',   // sky-blue accent
    'rgba(99,102,241,',   // indigo accent
  ];

  /*
   * FIX 3 — Cap alpha at 0.14 (was 0.22).  Radial gradients accumulate
   *          on each frame via ctx.fill() — the overlapping fill calls
   *          compound opacity even after clearRect, making bright spots.
   *          Lower per-orb alpha keeps the total stack subtle.
   */
  const ALPHA_CENTER = 0.14;
  const ALPHA_EDGE   = 0;

  function initPts() {
    pts = [];
    for (let i = 0; i < N; i++) {
      pts.push({
        x  : Math.random() * W,
        y  : Math.random() * H,
        vx : (Math.random() - 0.5) * 0.45,
        vy : (Math.random() - 0.5) * 0.45,
        r  : Math.random() * 220 + 160,   // base radius
        rAmp  : Math.random() * 40 + 20,  // breathe amplitude
        rPhase: Math.random() * Math.PI * 2, // breathe phase offset
        rSpeed: Math.random() * 0.008 + 0.004,
      });
    }
  }

  function draw(t) {
    /*
     * FIX 4 — Use 'source-over' but fill the canvas with the base
     *          background color before painting orbs.  This resets
     *          accumulated alpha each frame so orbs never "stack up"
     *          over multiple frames and create opaque regions.
     */
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    pts.forEach((p, i) => {
      // ENHANCEMENT: breathing radius
      const r = p.r + Math.sin(t * p.rSpeed + p.rPhase) * p.rAmp;

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0,   COLORS[i] + ALPHA_CENTER + ')');
      g.addColorStop(0.5, COLORS[i] + (ALPHA_CENTER * 0.4) + ')');
      g.addColorStop(1,   COLORS[i] + ALPHA_EDGE + ')');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function update() {
    pts.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      // Bounce well inside bounds so orbs never fully exit and leave a gap
      if (p.x < -p.r)    { p.x = -p.r;    p.vx *= -1; }
      if (p.x > W + p.r) { p.x = W + p.r; p.vx *= -1; }
      if (p.y < -p.r)    { p.y = -p.r;    p.vy *= -1; }
      if (p.y > H + p.r) { p.y = H + p.r; p.vy *= -1; }
    });
  }

  function loop(t) {
    draw(t);
    update();
    raf = requestAnimationFrame(loop);
  }

  // ENHANCEMENT — pause animation when tab is hidden to save CPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(loop);
    }
  });

  resize();
  initPts();
  raf = requestAnimationFrame(loop);

  // Debounced resize so rapid window drags don't thrash canvas allocation
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); initPts(); }, 120);
  });
})();

/* ── NAV SCROLL ──────────────────────────────────────────── */
window.addEventListener('scroll',()=>{
  document.getElementById('navbar').classList.toggle('solid',window.scrollY>50);
});

/* ── SCROLL REVEAL ───────────────────────────────────────── */
const io = new IntersectionObserver(entries=>{
  entries.forEach((e,i)=>{
    if(e.isIntersecting){
      const siblings = Array.from(e.target.parentElement?.children||[]);
      const idx = siblings.indexOf(e.target);
      setTimeout(()=>e.target.classList.add('in'), Math.min(idx*90,400));
      io.unobserve(e.target);
    }
  });
},{threshold:0.12});
document.querySelectorAll('.fu:not(.in)').forEach(el=>io.observe(el));

/* ── FEATURE ACTIVE ──────────────────────────────────────── */
function setActive(el){
  document.querySelectorAll('.feat-item').forEach(f=>f.classList.remove('active'));
  el.classList.add('active');
}

/* ── TOAST ───────────────────────────────────────────────── */
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 3200);
}

/* ── HAMBURGER ───────────────────────────────────────────── */
document.getElementById('hamburger').addEventListener('click',function(){
  const links = document.querySelector('.nav-links');
  const open = links.style.display==='flex';
  links.style.cssText = open ? '' :
    'display:flex;flex-direction:column;position:fixed;top:64px;left:0;right:0;background:rgba(8,12,20,.97);padding:24px 6vw;gap:22px;border-bottom:1px solid rgba(107,127,215,.15);z-index:199;';
  if(!open) links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{links.style.cssText='';},{ once:true }));
});