document.getElementById('year').textContent = new Date().getFullYear();

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll-reveal: stagger siblings within the same parent as they enter the viewport.
// CSS only hides .reveal elements when html.js-reveal is set (IntersectionObserver
// confirmed available), so there's nothing to reveal here otherwise.
const revealEls = document.documentElement.classList.contains('js-reveal')
  ? document.querySelectorAll('.reveal')
  : [];

if (prefersReducedMotion) {
  revealEls.forEach((el) => el.classList.add('is-visible'));
} else if (revealEls.length) {
  const groups = new Map();
  revealEls.forEach((el) => {
    const parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach((siblings) => {
    siblings.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 70, 420)}ms`;
    });
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}

// Section reveal flag, used to gate the floating section-number animation.
document.querySelectorAll('.section').forEach((section) => {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          sectionObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  sectionObserver.observe(section);
});

// Active nav link tracking.
const navByTarget = new Map();
navLinks.querySelectorAll('a[data-nav]').forEach((link) => {
  navByTarget.set(link.getAttribute('data-nav'), link);
});

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const link = navByTarget.get(entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        navByTarget.forEach((a) => a.classList.remove('active'));
        link.classList.add('active');
      }
    });
  },
  { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
);
navByTarget.forEach((_, id) => {
  const target = document.getElementById(id);
  if (target) navObserver.observe(target);
});

// Scroll progress bar, compact nav, and timeline draw-line — batched into one
// rAF-throttled handler so scrolling only triggers a single layout pass.
const progressBar = document.getElementById('scrollProgress');
const scrollBall = document.getElementById('scrollBall');
const siteHeader = document.querySelector('.site-header');
const timelineWrap = document.getElementById('timeline');
const timelineFill = document.getElementById('timelineFill');
let ticking = false;

function updateOnScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = `${pct}%`;
  // Roll the ball along the bar — rotation is just cosmetic (a few turns
  // over the full page), not a physically accurate roll distance.
  scrollBall.style.left = `${pct}%`;
  scrollBall.style.transform = `translateX(-50%) rotate(${pct * 9}deg)`;

  siteHeader.classList.toggle('scrolled', scrollTop > 10);

  if (timelineWrap && timelineFill) {
    const rect = timelineWrap.getBoundingClientRect();
    // Progress = how far the viewport's vertical center has moved through the
    // timeline's span, so the line finishes drawing as the last item comes into view.
    const viewportCenter = window.innerHeight * 0.5;
    const raw = (viewportCenter - rect.top) / rect.height;
    const fillPct = Math.max(0, Math.min(1, raw)) * 100;
    timelineFill.style.height = `${fillPct}%`;
  }

  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateOnScroll);
    ticking = true;
  }
});
window.addEventListener('resize', updateOnScroll);
updateOnScroll();

// 3D tilt on project cards — pointer-driven, so it's naturally skipped on
// touch devices (no hover/mousemove) and left alone under reduced motion.
if (!prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.grid-projects .card').forEach((card) => {
    const maxTilt = 6; // degrees

    card.style.transition = 'transform 0.15s ease-out, border-color 0.2s ease, box-shadow 0.25s ease';

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateY = px * maxTilt * 2;
      const rotateX = -py * maxTilt * 2;
      card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.35s cubic-bezier(0.16, 0.84, 0.44, 1), border-color 0.2s ease, box-shadow 0.25s ease';
      card.style.transform = '';
      setTimeout(() => {
        card.style.transition = 'transform 0.15s ease-out, border-color 0.2s ease, box-shadow 0.25s ease';
      }, 350);
    });
  });
}

// Particle network background in the hero, inspired by williamlin.io — dots
// drift slowly and connect to nearby neighbors with a line whose opacity
// fades with distance. Click a particle to pop it.
(() => {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('.hero');

  let particles = [];
  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let dotColor = '#e8eaf0';
  let lineColor = '232, 234, 240'; // r, g, b — alpha applied per-line

  const LINK_DIST = 130;
  const DENSITY = 16000; // px^2 per particle

  function readThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    dotColor = styles.getPropertyValue('--text').trim() || '#e8eaf0';
    const hex = dotColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      lineColor = `${r}, ${g}, ${b}`;
    }
  }

  function makeParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 1.4 + Math.random() * 1.2,
    };
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const targetCount = Math.min(110, Math.max(30, Math.round((width * height) / DENSITY)));
    if (particles.length === 0) {
      particles = Array.from({ length: targetCount }, makeParticle);
    } else if (particles.length < targetCount) {
      particles.push(...Array.from({ length: targetCount - particles.length }, makeParticle));
    } else {
      particles.length = targetCount;
    }
  }

  function step() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
      p.x = Math.max(0, Math.min(width, p.x));
      p.y = Math.max(0, Math.min(height, p.y));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          ctx.strokeStyle = `rgba(${lineColor}, ${0.16 * (1 - dist / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = dotColor;
    for (const p of particles) {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  let rafId = null;
  function loop() {
    step();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  readThemeColors();
  resize();
  window.addEventListener('resize', () => {
    resize();
    if (prefersReducedMotion) draw();
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    readThemeColors();
    if (prefersReducedMotion) draw();
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const idx = particles.findIndex((p) => Math.hypot(p.x - cx, p.y - cy) < 10);
    if (idx !== -1) {
      particles.splice(idx, 1);
      if (prefersReducedMotion) draw();
    }
  });

  if (prefersReducedMotion) {
    draw();
  } else {
    loop();
  }
})();
