  // ── CURSOR ORB ──────────────────────────────────────────────
  const orb = document.getElementById('orb');
  document.addEventListener('mousemove', e => {
    orb.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });

  // ── NAV SCROLL ──────────────────────────────────────────────
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });

  // ── TYPED TEXT ──────────────────────────────────────────────
  const roles = ['Full Stack Engineer', 'System Architect', 'Tech Lead', 'Open Source Author'];
  let ri = 0, ci = 0, deleting = false;
  const el = document.getElementById('typed-text');
  function type() {
    const current = roles[ri];
    if (!deleting) {
      el.textContent = current.slice(0, ++ci);
      if (ci === current.length) { deleting = true; setTimeout(type, 1800); return; }
    } else {
      el.textContent = current.slice(0, --ci);
      if (ci === 0) { deleting = false; ri = (ri + 1) % roles.length; }
    }
    setTimeout(type, deleting ? 48 : 80);
  }
  setTimeout(type, 1000);

  // ── SCROLL REVEAL ───────────────────────────────────────────
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const idx = Array.from(e.target.parentElement?.children || []).indexOf(e.target);
        setTimeout(() => {
          e.target.classList.add('visible');
          // animate skill bars
          e.target.querySelectorAll('.skill-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width + '%';
          });
        }, Math.min(idx * 80, 320));
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up').forEach(el => io.observe(el));

  // ── SEND TOAST ──────────────────────────────────────────────
  function handleSend() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  // ── HAMBURGER (mobile) ──────────────────────────────────────
  document.getElementById('hamburger').addEventListener('click', function() {
    const links = document.querySelector('.nav-links');
    if (links.style.display === 'flex') {
      links.style.display = 'none';
    } else {
      links.style.cssText = 'display:flex;flex-direction:column;position:absolute;top:100%;left:0;right:0;background:rgba(10,15,30,.97);padding:24px 6vw;gap:20px;border-bottom:1px solid var(--border);';
    }
  });
