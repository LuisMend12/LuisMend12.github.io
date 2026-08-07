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

// Scroll progress bar.
const progressBar = document.getElementById('scrollProgress');
let ticking = false;

function updateProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = `${pct}%`;
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateProgress);
    ticking = true;
  }
});
updateProgress();
