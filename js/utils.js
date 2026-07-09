/**
 * utils.js — small shared helpers, no dependencies.
 */

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function genId(prefix = 'usr') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// simple in-memory + sessionStorage cache for inlined SVG icon markup
const _iconCache = {};
async function loadIconSvg(path) {
  if (_iconCache[path]) return _iconCache[path];
  try {
    const res = await fetch(path);
    const text = await res.text();
    _iconCache[path] = text;
    return text;
  } catch (e) {
    return '<svg viewBox="0 0 24 24"></svg>';
  }
}

function toast(message, opts = {}) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>${escapeHtml(message)}</span>`;
  stack.appendChild(el);
  const life = opts.duration || 2800;
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 220);
  }, life);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function shareLocation({ title, lat, lng, id }) {
  const url = new URL(window.location.origin + window.location.pathname.replace(/dashboard\.html|index\.html/, 'map.html'));
  url.searchParams.set('lat', lat);
  url.searchParams.set('lng', lng);
  url.searchParams.set('id', id);
  const shareData = {
    title: `IndustrCons — ${title}`,
    text: `View ${title} on the IndustrCons Engineering Map`,
    url: url.toString(),
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (e) {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(url.toString());
    toast('Link copied to clipboard');
    return true;
  } catch (e) {
    toast('Could not copy link');
    return false;
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

window.debounce = debounce;
window.genId = genId;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;
window.loadIconSvg = loadIconSvg;
window.toast = toast;
window.downloadJson = downloadJson;
window.shareLocation = shareLocation;
window.clamp = clamp;
