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

function wireEcosystemMenu() {
  const btn = document.getElementById('ecosystemBtn');
  const menu = document.getElementById('ecosystemMenu');
  if (!btn || !menu || !window.SITE_CONFIG) return;

  menu.innerHTML = SITE_CONFIG.ecosystem.map((item) => `
    <a href="${item.url}" target="_blank" rel="noopener noreferrer">
      <span class="em-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        ${escapeHtml(item.label)}
      </span>
      <span class="em-desc">${escapeHtml(item.desc)}</span>
    </a>
  `).join('');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !menu.classList.contains('open');
    menu.classList.toggle('open', willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  wireThemeToggle();
  markActiveNav();
  wireEcosystemMenu();
});
