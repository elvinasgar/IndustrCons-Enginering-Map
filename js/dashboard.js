/**
 * dashboard.js — manage local JSON entries (add/edit/delete/import/export).
 */

const dashState = { search: '', category: '', source: '' };
let pendingDeleteId = null;

function isInfraCategory(categoryId) {
  const cat = getCategory(categoryId);
  return cat && cat.dataset === 'projects';
}

function populateCategorySelects() {
  const formSel = document.getElementById('f_category');
  const filterSel = document.getElementById('dashCategoryFilter');
  CATEGORIES.forEach((c) => {
    formSel.appendChild(new Option(c.label, c.id));
    filterSel.appendChild(new Option(c.label, c.id));
  });
  formSel.addEventListener('change', toggleFormFieldsForCategory);
}

function toggleFormFieldsForCategory() {
  const catId = document.getElementById('f_category').value;
  const infra = isInfraCategory(catId);
  document.getElementById('infraFields').style.display = infra ? 'grid' : 'none';
  document.getElementById('orgFields').style.display = infra ? 'none' : 'grid';
}

function renderStats() {
  const all = DataStore.getAll();
  const custom = all.filter((e) => e.source === 'custom').length;
  const edited = all.filter((e) => e.edited).length;
  const stats = [
    { num: all.length, label: 'Total entries' },
    { num: custom, label: 'Local entries' },
    { num: edited, label: 'Edited entries' },
    { num: DataStore.countriesInUse().length, label: 'Countries' },
  ];
  document.getElementById('dashStats').innerHTML = stats
    .map((s) => `<div class="dash-stat"><div class="num">${s.num}</div><div class="label">${s.label}</div></div>`)
    .join('');
}

function getDashFilteredEntries() {
  let list = DataStore.getAll();
  if (dashState.category) list = list.filter((e) => e.category === dashState.category);
  if (dashState.source) list = list.filter((e) => e.source === dashState.source);
  if (dashState.search.trim()) {
    const q = dashState.search.trim().toLowerCase();
    list = list.filter((e) => (e.name + ' ' + (e.country || '')).toLowerCase().includes(q));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

function renderTable() {
  const list = getDashFilteredEntries();
  const body = document.getElementById('dashTableBody');
  const empty = document.getElementById('dashEmpty');

  if (!list.length) {
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  body.innerHTML = list.map((e) => {
    const cat = getCategory(e.category);
    const statusOrFounded = e.status || (e.founded ? `Est. ${escapeHtml(e.founded)}` : '—');
    return `
      <tr>
        <td class="row-name">${escapeHtml(e.name)}</td>
        <td><span class="dash-cat-tag"><span class="dot" style="background:${cat ? cat.color : '#999'}"></span>${cat ? cat.label : e.category}</span></td>
        <td>${escapeHtml(e.country || '—')}</td>
        <td>${escapeHtml(statusOrFounded)}</td>
        <td><span class="badge">${e.source === 'custom' ? 'local' : (e.edited ? 'edited' : 'base')}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn btn-sm" data-action="view" data-id="${e.id}" title="View on map"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.6" y2="16.6"/></svg></button>
            <button class="icon-btn btn-sm" data-action="edit" data-id="${e.id}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
            <button class="icon-btn btn-sm" data-action="delete" data-id="${e.id}" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('button[data-action]').forEach((btn) => {
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    btn.addEventListener('click', () => {
      if (action === 'view') window.location.href = `map.html?id=${encodeURIComponent(id)}`;
      if (action === 'edit') openEntryModal(id);
      if (action === 'delete') openDeleteModal(id);
    });
  });
}

function refreshDashboard() {
  renderStats();
  renderTable();
}

// ---------------------------------------------------------------------
// Entry modal (add / edit)
// ---------------------------------------------------------------------
function openEntryModal(id) {
  const form = document.getElementById('entryForm');
  form.reset();
  document.getElementById('f_id').value = id || '';
  document.getElementById('entryModalTitle').textContent = id ? 'Edit entry' : 'Add entry';

  if (id) {
    const e = DataStore.getById(id);
    if (!e) return;
    document.getElementById('f_category').value = e.category;
    document.getElementById('f_name').value = e.name || '';
    document.getElementById('f_description').value = e.description || '';
    document.getElementById('f_lat').value = e.lat ?? '';
    document.getElementById('f_lng').value = e.lng ?? '';
    document.getElementById('f_address').value = e.address || '';
    document.getElementById('f_country').value = e.country || '';
    document.getElementById('f_disciplines').value = (e.disciplines || []).join(', ');
    document.getElementById('f_status').value = e.status || 'Planned';
    document.getElementById('f_progress').value = e.progress ?? 0;
    document.getElementById('f_contractor').value = e.contractor || '';
    document.getElementById('f_consultant').value = e.consultant || '';
    document.getElementById('f_client').value = e.client || '';
    document.getElementById('f_startDate').value = e.startDate || '';
    document.getElementById('f_finishDate').value = e.finishDate || '';
    document.getElementById('f_founded').value = e.founded || '';
    document.getElementById('f_website').value = e.website || '';
    document.getElementById('f_services').value = (e.services || []).join(', ');
  } else {
    document.getElementById('f_category').value = CATEGORIES[0].id;
  }
  toggleFormFieldsForCategory();
  document.getElementById('entryModalOverlay').classList.add('open');
  document.getElementById('f_name').focus();
}

function closeEntryModal() {
  document.getElementById('entryModalOverlay').classList.remove('open');
}

function handleEntryFormSubmit(evt) {
  evt.preventDefault();
  const id = document.getElementById('f_id').value;
  const category = document.getElementById('f_category').value;
  const infra = isInfraCategory(category);

  const payload = {
    category,
    name: document.getElementById('f_name').value.trim(),
    description: document.getElementById('f_description').value.trim(),
    lat: parseFloat(document.getElementById('f_lat').value),
    lng: parseFloat(document.getElementById('f_lng').value),
    address: document.getElementById('f_address').value.trim(),
    country: document.getElementById('f_country').value.trim(),
    disciplines: document.getElementById('f_disciplines').value.split(',').map((s) => s.trim()).filter(Boolean),
    tags: [category.replace(/-/g, ' ')],
    images: [],
  };

  if (infra) {
    Object.assign(payload, {
      status: document.getElementById('f_status').value,
      progress: parseInt(document.getElementById('f_progress').value, 10) || 0,
      contractor: document.getElementById('f_contractor').value.trim(),
      consultant: document.getElementById('f_consultant').value.trim(),
      client: document.getElementById('f_client').value.trim(),
      startDate: document.getElementById('f_startDate').value,
      finishDate: document.getElementById('f_finishDate').value,
    });
  } else {
    Object.assign(payload, {
      founded: document.getElementById('f_founded').value.trim(),
      website: document.getElementById('f_website').value.trim(),
      services: document.getElementById('f_services').value.split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  if (isNaN(payload.lat) || isNaN(payload.lng)) {
    toast('Latitude and longitude are required');
    return;
  }

  if (id) {
    DataStore.update(id, payload);
    toast('Entry updated');
  } else {
    DataStore.create(payload);
    toast('Entry added');
  }
  SearchEngine && SearchEngine.build && SearchEngine.build(DataStore.getAll());
  closeEntryModal();
  refreshDashboard();
}

// ---------------------------------------------------------------------
// Delete modal
// ---------------------------------------------------------------------
function openDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModalOverlay').classList.add('open');
}
function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModalOverlay').classList.remove('open');
}

// ---------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------
function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const entries = Array.isArray(parsed) ? parsed : (parsed.items || []);
      if (!Array.isArray(entries) || !entries.length) {
        toast('No valid entries found in file');
        return;
      }
      const added = DataStore.importEntries(entries);
      toast(`Imported ${added} entr${added === 1 ? 'y' : 'ies'}`);
      document.getElementById('importModalOverlay').classList.remove('open');
      refreshDashboard();
    } catch (e) {
      toast('Could not parse JSON file');
    }
  };
  reader.readAsText(file);
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
async function bootDashboard() {
  await DataStore.init();
  populateCategorySelects();
  refreshDashboard();

  document.getElementById('dashSearch').addEventListener('input', debounce((e) => {
    dashState.search = e.target.value; renderTable();
  }, 150));
  document.getElementById('dashCategoryFilter').addEventListener('change', (e) => { dashState.category = e.target.value; renderTable(); });
  document.getElementById('dashSourceFilter').addEventListener('change', (e) => { dashState.source = e.target.value; renderTable(); });

  document.getElementById('addEntryBtn').addEventListener('click', () => openEntryModal(null));
  document.getElementById('cancelEntryBtn').addEventListener('click', closeEntryModal);
  document.getElementById('entryModalOverlay').addEventListener('click', (e) => { if (e.target.id === 'entryModalOverlay') closeEntryModal(); });
  document.getElementById('entryForm').addEventListener('submit', handleEntryFormSubmit);

  document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteModalOverlay').addEventListener('click', (e) => { if (e.target.id === 'deleteModalOverlay') closeDeleteModal(); });
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (pendingDeleteId) {
      DataStore.remove(pendingDeleteId);
      toast('Entry removed');
      refreshDashboard();
    }
    closeDeleteModal();
  });

  document.getElementById('exportAllBtn').addEventListener('click', () => {
    downloadJson('industrcons-all-entries.json', DataStore.exportAll());
    toast(`Exported ${DataStore.getAll().length} entries`);
  });

  const importOverlay = document.getElementById('importModalOverlay');
  document.getElementById('importBtn').addEventListener('click', () => importOverlay.classList.add('open'));
  document.getElementById('cancelImportBtn').addEventListener('click', () => importOverlay.classList.remove('open'));
  importOverlay.addEventListener('click', (e) => { if (e.target.id === 'importModalOverlay') importOverlay.classList.remove('open'); });

  const dropZone = document.getElementById('importDrop');
  const fileInput = document.getElementById('importFileInput');
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleImportFile(fileInput.files[0]); });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag');
    if (e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0]);
  });
}

document.addEventListener('DOMContentLoaded', bootDashboard);
