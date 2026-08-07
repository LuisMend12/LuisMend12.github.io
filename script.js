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
