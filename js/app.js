/**
 * app.js — shared shell behavior loaded on every page (theme, nav).
 */

(function initTheme() {
  const saved = Store.getTheme();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  Store.setTheme(theme);
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
  });
}

function wireThemeToggle() {
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    const current = document.documentElement.getAttribute('data-theme');
    btn.setAttribute('aria-checked', current === 'dark' ? 'true' : 'false');
    btn.addEventListener('click', () => {
      const now = document.documentElement.getAttribute('data-theme');
      applyTheme(now === 'dark' ? 'light' : 'dark');
    });
  });
}

function markActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === page) a.classList.add('active');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  wireThemeToggle();
  markActiveNav();
});
