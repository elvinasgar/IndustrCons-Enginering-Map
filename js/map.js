/**
 * map.js — the main map page controller.
 */

const state = {
  categories: new Set(CATEGORIES.map((c) => c.id)),
  statuses: new Set(),
  disciplines: new Set(),
  country: '',
  startAfter: '',
  favoritesOnly: false,
  searchText: '',
};

let map;
let clusterGroup;
let markerById = new Map();
let galleryIndex = 0;
let currentDetailId = null;

// ---------------------------------------------------------------------
// Map init
// ---------------------------------------------------------------------
function initMap() {
  map = L.map('map', { zoomControl: true, minZoom: 2, worldCopyJump: true }).setView([20, 10], 2.4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    iconCreateFunction(cluster) {
      const count = cluster.getChildCount();
      const size = count < 10 ? 34 : count < 50 ? 40 : 48;
      return L.divIcon({
        html: `<div class="ic-cluster" style="width:${size}px;height:${size}px;font-size:${count < 100 ? 12 : 11}px;">${count}</div>`,
        className: '',
        iconSize: [size, size],
      });
    },
  });
  map.addLayer(clusterGroup);
}

function buildMarkerIcon(entry) {
  const cat = getCategory(entry.category);
  const isFav = Store.isFavorite(entry.id);
  return L.divIcon({
    className: '',
    html: `<div class="ic-marker${isFav ? ' is-favorite' : ''}" style="--m-color:${cat ? cat.color : '#E8590C'}">${_iconSvgCache[cat.icon] || ''}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 29],
    popupAnchor: [0, -26],
  });
}

const _iconSvgCache = {};
async function preloadCategoryIcons() {
  await Promise.all(CATEGORIES.map(async (c) => {
    const svg = await loadIconSvg(`assets/icons/${c.icon}`);
    _iconSvgCache[c.icon] = svg;
  }));
}

function rebuildMarkers(entries) {
  clusterGroup.clearLayers();
  markerById.clear();
  const layers = [];
  entries.forEach((entry) => {
    if (typeof entry.lat !== 'number' || typeof entry.lng !== 'number') return;
    const marker = L.marker([entry.lat, entry.lng], { icon: buildMarkerIcon(entry) });
    marker.on('click', () => openDetail(entry.id));
    markerById.set(entry.id, marker);
    layers.push(marker);
  });
  clusterGroup.addLayers(layers);
}

// ---------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------
function getFilteredEntries() {
  const all = DataStore.getAll();
  let textMatchIds = null;
  if (state.searchText.trim()) {
    const parsed = parseNaturalLanguageQuery(state.searchText, DataStore.disciplinesInUse(), DataStore.countriesInUse());
    // NL-derived filters are combined with (not replacing) the sidebar's manual filters,
    // except free text, which always runs through the search index.
    if (parsed.freeText) {
      textMatchIds = SearchEngine.textSearch(parsed.freeText);
    }
    var nlCategories = parsed.categories;
    var nlStatuses = parsed.statuses;
    var nlDisciplines = parsed.disciplines;
    var nlCountries = parsed.countries;
    var nlFavoritesOnly = parsed.favoritesOnly;
  }

  return all.filter((e) => {
    if (!state.categories.has(e.category)) return false;
    if (state.statuses.size && !state.statuses.has(e.status)) return false;
    if (state.disciplines.size && !(e.disciplines || []).some((d) => state.disciplines.has(d))) return false;
    if (state.country && e.country !== state.country) return false;
    if (state.startAfter && (!e.startDate || e.startDate < state.startAfter)) return false;
    if (state.favoritesOnly && !Store.isFavorite(e.id)) return false;

    if (nlCategories && nlCategories.length && !nlCategories.includes(e.category)) return false;
    if (nlStatuses && nlStatuses.length && !nlStatuses.includes(e.status)) return false;
    if (nlDisciplines && nlDisciplines.length && !(e.disciplines || []).some((d) => nlDisciplines.includes(d))) return false;
    if (nlCountries && nlCountries.length && !nlCountries.includes(e.country)) return false;
    if (nlFavoritesOnly && !Store.isFavorite(e.id)) return false;
    if (textMatchIds && !textMatchIds.has(e.id)) return false;

    return true;
  });
}

function refresh() {
  const filtered = getFilteredEntries();
  rebuildMarkers(filtered);
  document.getElementById('resultsCount').textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;
  return filtered;
}

// ---------------------------------------------------------------------
// Sidebar: categories, status, disciplines, country
// ---------------------------------------------------------------------
async function buildCategoryFilterList() {
  const counts = DataStore.categoryCounts();
  const list = document.getElementById('categoryFilterList');
  list.innerHTML = '';
  for (const cat of CATEGORIES) {
    const svg = await loadIconSvg(`assets/icons/${cat.icon}`);
    _iconSvgCache[cat.icon] = svg;
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" checked data-cat="${cat.id}" style="accent-color:${cat.color}">
      <span class="dot" style="--cat-color:${cat.color}; background:${cat.color}"></span>
      <span class="cat-label">${cat.label}</span>
      <span class="cat-count">${counts[cat.id] || 0}</span>
    `;
    list.appendChild(label);
  }
  list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.getAttribute('data-cat');
      if (cb.checked) state.categories.add(id); else state.categories.delete(id);
      refresh();
      buildQuickChips();
    });
  });
}

function buildStatusChips() {
  const wrap = document.getElementById('statusChips');
  wrap.innerHTML = '';
  DataStore.statusesInUse().forEach((status) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = status;
    chip.addEventListener('click', () => {
      if (state.statuses.has(status)) { state.statuses.delete(status); chip.classList.remove('selected'); }
      else { state.statuses.add(status); chip.classList.add('selected'); }
      refresh();
    });
    wrap.appendChild(chip);
  });
}

function buildDisciplineChips() {
  const wrap = document.getElementById('disciplineChips');
  wrap.innerHTML = '';
  DataStore.disciplinesInUse().forEach((d) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = d;
    chip.addEventListener('click', () => {
      if (state.disciplines.has(d)) { state.disciplines.delete(d); chip.classList.remove('selected'); }
      else { state.disciplines.add(d); chip.classList.add('selected'); }
      refresh();
    });
    wrap.appendChild(chip);
  });
}

function buildCountrySelect() {
  const sel = document.getElementById('countrySelect');
  DataStore.countriesInUse().forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => { state.country = sel.value; refresh(); });
}

function buildQuickChips() {
  const wrap = document.getElementById('quickChipRow');
  wrap.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (state.categories.has(cat.id) ? ' selected' : '');
    chip.style.setProperty('--chip-color', cat.color);
    chip.innerHTML = `<span class="dot"></span>${cat.label}`;
    chip.addEventListener('click', () => {
      if (state.categories.has(cat.id)) state.categories.delete(cat.id); else state.categories.add(cat.id);
      document.querySelector(`#categoryFilterList input[data-cat="${cat.id}"]`).checked = state.categories.has(cat.id);
      refresh();
      buildQuickChips();
    });
    wrap.appendChild(chip);
  });
}

// ---------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------
function closeDetail() {
  document.getElementById('detailPanel').classList.remove('open');
  currentDetailId = null;
}

function renderStars(fav) {
  return fav
    ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><path d="M12 2.5l3 6.6 7 .8-5.2 4.9 1.4 7.2L12 18.3 5.8 22l1.4-7.2L2 9.9l7-.8z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2.5l3 6.6 7 .8-5.2 4.9 1.4 7.2L12 18.3 5.8 22l1.4-7.2L2 9.9l7-.8z"/></svg>';
}

async function openDetail(id) {
  const entry = DataStore.getById(id);
  if (!entry) return;
  currentDetailId = id;
  galleryIndex = 0;
  map.flyTo([entry.lat, entry.lng], Math.max(map.getZoom(), 9), { duration: 0.6 });

  const cat = getCategory(entry.category);
  const catSvg = await loadIconSvg(`assets/icons/${cat.icon}`);
  const isFav = Store.isFavorite(entry.id);
  const images = entry.images && entry.images.length ? entry.images : [];

  const isOrg = !!entry.services; // companies/materials use services instead of contractor/status
  const factsHtml = isOrg ? `
    <div class="detail-grid">
      <div><div class="fk">Founded</div><div class="fv">${escapeHtml(entry.founded || '—')}</div></div>
      <div><div class="fk">Website</div><div class="fv">${escapeHtml(entry.website || '—')}</div></div>
      <div class="full" style="grid-column:1/-1"><div class="fk">Services</div><div class="fv">${(entry.services || []).map(escapeHtml).join(', ') || '—'}</div></div>
    </div>
  ` : `
    <div class="detail-grid">
      <div><div class="fk">Contractor</div><div class="fv">${escapeHtml(entry.contractor || '—')}</div></div>
      <div><div class="fk">Consultant</div><div class="fv">${escapeHtml(entry.consultant || '—')}</div></div>
      <div><div class="fk">Client</div><div class="fv">${escapeHtml(entry.client || '—')}</div></div>
      <div><div class="fk">Status</div><div class="fv">${escapeHtml(entry.status || '—')}</div></div>
      <div><div class="fk">Start date</div><div class="fv">${formatDate(entry.startDate)}</div></div>
      <div><div class="fk">Finish date</div><div class="fv">${formatDate(entry.finishDate)}</div></div>
    </div>
  `;

  const body = document.getElementById('detailBody');
  body.innerHTML = `
    <div class="detail-gallery" id="galleryWrap">
      ${images.map((src, i) => `<img src="${src}" alt="${escapeHtml(entry.name)} photo ${i + 1}" style="display:${i === 0 ? 'block' : 'none'}" loading="lazy">`).join('')}
      ${images.length > 1 ? `
        <button class="gnav prev" id="galPrev" aria-label="Previous image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button class="gnav next" id="galNext" aria-label="Next image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <div class="detail-gallery-dots">${images.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('')}</div>
      ` : ''}
    </div>
    <div class="detail-content">
      <div class="detail-cat-tag" style="color:${cat.color}">${catSvg}<span>${cat.label}</span></div>
      <h2>${escapeHtml(entry.name)}</h2>
      <div class="detail-address">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s7-7.2 7-12.5A7 7 0 0 0 5 9.5C5 14.8 12 22 12 22z"/><circle cx="12" cy="9.5" r="2.3"/></svg>
        <span>${escapeHtml(entry.address || '')}${entry.address ? ', ' : ''}${escapeHtml(entry.country || '')}</span>
      </div>
      ${!isOrg ? `
        <div class="detail-badges">
          <span class="badge badge-status" data-status="${entry.status}">${escapeHtml(entry.status || '')}</span>
          ${entry.edited ? '<span class="badge">edited locally</span>' : ''}
          ${entry.source === 'custom' ? '<span class="badge">local entry</span>' : ''}
        </div>
        <div class="detail-progress">
          <div class="detail-progress-row"><span>Progress</span><span>${entry.progress ?? 0}%</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${entry.progress ?? 0}%"></div></div>
        </div>
      ` : ''}
      ${factsHtml}
      <div class="detail-tags">${(entry.disciplines || []).map((d) => `<span class="tag">${escapeHtml(d)}</span>`).join('')}</div>
      <p class="detail-desc">${escapeHtml(entry.description || '')}</p>
    </div>
  `;

  const favBtn = document.getElementById('favBtn');
  favBtn.innerHTML = renderStars(isFav);
  favBtn.setAttribute('aria-pressed', String(isFav));
  favBtn.style.color = isFav ? '#E8590C' : '';
  favBtn.onclick = () => {
    const nowFav = Store.toggleFavorite(entry.id);
    toast(nowFav ? 'Added to favorites' : 'Removed from favorites');
    openDetail(id);
    const m = markerById.get(id);
    if (m) m.setIcon(buildMarkerIcon(entry));
  };
  document.getElementById('shareBtn').onclick = () => shareLocation(entry);

  if (images.length > 1) {
    const imgs = body.querySelectorAll('.detail-gallery img');
    const dots = body.querySelectorAll('.detail-gallery-dots span');
    const setGallery = (i) => {
      galleryIndex = (i + images.length) % images.length;
      imgs.forEach((im, idx) => (im.style.display = idx === galleryIndex ? 'block' : 'none'));
      dots.forEach((d, idx) => d.classList.toggle('active', idx === galleryIndex));
    };
    document.getElementById('galPrev').addEventListener('click', () => setGallery(galleryIndex - 1));
    document.getElementById('galNext').addEventListener('click', () => setGallery(galleryIndex + 1));
  }

  document.getElementById('detailPanel').classList.add('open');
}

// ---------------------------------------------------------------------
// Search bar
// ---------------------------------------------------------------------
function wireSearch() {
  const input = document.getElementById('searchInput');
  const wrap = document.getElementById('searchBarWrap');
  const clearBtn = document.getElementById('searchClearBtn');
  const run = debounce(() => {
    state.searchText = input.value;
    wrap.classList.toggle('has-value', !!input.value);
    refresh();
    if (input.value.trim().length > 2) Store.addRecentSearch(input.value.trim());
  }, 220);
  input.addEventListener('input', run);
  clearBtn.addEventListener('click', () => { input.value = ''; run(); input.focus(); });
}

// ---------------------------------------------------------------------
// Sidebar open/close (mobile + desktop)
// ---------------------------------------------------------------------
function wireSidebarToggle() {
  const sidebar = document.getElementById('filterSidebar');
  const scrim = document.getElementById('filterScrim');
  const isMobile = () => window.innerWidth <= 880;

  function open() {
    sidebar.classList.remove('collapsed');
    if (isMobile()) { sidebar.classList.add('open'); scrim.classList.add('open'); }
  }
  function close() {
    sidebar.classList.add('collapsed');
    sidebar.classList.remove('open');
    scrim.classList.remove('open');
  }
  document.getElementById('openSidebarBtn').addEventListener('click', () => {
    sidebar.classList.contains('collapsed') || (isMobile() && !sidebar.classList.contains('open')) ? open() : close();
  });
  document.getElementById('closeSidebarBtn').addEventListener('click', close);
  scrim.addEventListener('click', close);
  // Sidebar always starts collapsed — the user opens it via the filter icon.
  // (Previously this auto-expanded on wide viewports, which caused a confusing
  // "half open" layout on phones running the browser's Desktop-site mode.)
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
async function boot() {
  initMap();
  await DataStore.init();
  await preloadCategoryIcons();
  SearchEngine.build(DataStore.getAll());

  await buildCategoryFilterList();
  buildStatusChips();
  buildDisciplineChips();
  buildCountrySelect();
  buildQuickChips();
  wireSearch();
  wireSidebarToggle();

  document.getElementById('closeDetailBtn').addEventListener('click', closeDetail);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    state.categories = new Set(CATEGORIES.map((c) => c.id));
    state.statuses.clear(); state.disciplines.clear(); state.country = ''; state.startAfter = '';
    document.querySelectorAll('#categoryFilterList input').forEach((cb) => (cb.checked = true));
    document.querySelectorAll('.status-chips .chip, .discipline-chips .chip').forEach((c) => c.classList.remove('selected'));
    document.getElementById('countrySelect').value = '';
    document.getElementById('startDateFilter').value = '';
    buildQuickChips();
    refresh();
  });
  document.getElementById('allCatsBtn').addEventListener('click', () => {
    state.categories = new Set(CATEGORIES.map((c) => c.id));
    document.querySelectorAll('#categoryFilterList input').forEach((cb) => (cb.checked = true));
    buildQuickChips();
    refresh();
  });
  document.getElementById('startDateFilter').addEventListener('change', (e) => { state.startAfter = e.target.value; refresh(); });

  const favBtn = document.getElementById('favToggleBtn');
  favBtn.addEventListener('click', () => {
    state.favoritesOnly = !state.favoritesOnly;
    favBtn.classList.toggle('active', state.favoritesOnly);
    favBtn.setAttribute('aria-pressed', String(state.favoritesOnly));
    refresh();
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const filtered = getFilteredEntries();
    downloadJson('industrcons-export.json', filtered);
    toast(`Exported ${filtered.length} entries`);
  });

  document.getElementById('locateBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('Geolocation not available'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 11, { duration: 0.8 }),
      () => toast('Could not get your location')
    );
  });

  // deep link support: ?category=xxx or ?id=xxx&lat=..&lng=..
  const params = new URLSearchParams(window.location.search);
  if (params.get('category') && getCategory(params.get('category'))) {
    state.categories = new Set([params.get('category')]);
    document.querySelectorAll('#categoryFilterList input').forEach((cb) => (cb.checked = state.categories.has(cb.dataset.cat)));
    buildQuickChips();
  }
  refresh();
  if (params.get('id') && DataStore.getById(params.get('id'))) {
    openDetail(params.get('id'));
  } else if (params.get('lat') && params.get('lng')) {
    map.setView([parseFloat(params.get('lat')), parseFloat(params.get('lng'))], 12);
  }
  if (params.toString()) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

document.addEventListener('DOMContentLoaded', boot);
