/**
 * data.js
 * The data access layer. Everything else in the app talks to `DataStore`,
 * never to fetch()/localStorage directly for entries. That means the JSON
 * files here can later be swapped for real API calls (see fetchDataset)
 * without touching map.js, dashboard.js, or search.js.
 */

const DATASET_FILES = {
  projects: 'data/projects.json',
  companies: 'data/companies.json',
  materials: 'data/materials.json',
};

/**
 * Fetches one dataset. Today this reads a static JSON file so the whole
 * app works offline on GitHub Pages. To move to a real API later, replace
 * the body of this function with a `fetch('/api/...')` call — every
 * consumer of DataStore stays the same because the returned shape
 * ({ items: [...] }) doesn't change.
 */
async function fetchDataset(name) {
  const path = DATASET_FILES[name];
  const res = await fetch(path, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

const DataStore = {
  _all: [],
  _loaded: false,

  async init() {
    if (this._loaded) return this._all;
    const [projects, companies, materials] = await Promise.all([
      fetchDataset('projects'),
      fetchDataset('companies'),
      fetchDataset('materials'),
    ]);
    const base = [
      ...(projects.items || []),
      ...(companies.items || []),
      ...(materials.items || []),
    ].map((e) => ({ ...e, source: 'base' }));

    const custom = Store.getCustomEntries().map((e) => ({ ...e, source: 'custom' }));
    const edits = Store.getEditedEntries();
    const deleted = new Set(Store.getDeletedIds());

    const merged = base
      .filter((e) => !deleted.has(e.id))
      .map((e) => (edits[e.id] ? { ...e, ...edits[e.id], edited: true } : e));

    this._all = [...merged, ...custom];
    this._loaded = true;
    return this._all;
  },

  getAll() {
    return this._all;
  },

  getById(id) {
    return this._all.find((e) => e.id === id) || null;
  },

  getByCategory(categoryId) {
    return this._all.filter((e) => e.category === categoryId);
  },

  categoryCounts() {
    const counts = {};
    CATEGORIES.forEach((c) => (counts[c.id] = 0));
    this._all.forEach((e) => {
      if (counts[e.category] != null) counts[e.category] += 1;
    });
    return counts;
  },

  countriesInUse() {
    return [...new Set(this._all.map((e) => e.country).filter(Boolean))].sort();
  },

  disciplinesInUse() {
    const set = new Set();
    this._all.forEach((e) => (e.disciplines || []).forEach((d) => set.add(d)));
    return [...set].sort();
  },

  statusesInUse() {
    return [...new Set(this._all.map((e) => e.status).filter(Boolean))];
  },

  /** Create a brand-new entry (always stored as a custom/local entry). */
  create(entry) {
    const record = {
      ...entry,
      id: entry.id || genId('usr'),
      source: 'custom',
      createdAt: new Date().toISOString(),
    };
    Store.addCustomEntry(record);
    this._all.push(record);
    return record;
  },

  /** Update an entry — routes to custom-entry storage or base-edit storage. */
  update(id, updates) {
    const entry = this.getById(id);
    if (!entry) return false;
    if (entry.source === 'custom') {
      Store.updateCustomEntry(id, updates);
    } else {
      Store.setEditedEntry(id, updates);
    }
    Object.assign(entry, updates, { edited: entry.source !== 'custom' ? true : entry.edited });
    return true;
  },

  /** Delete an entry — removes custom entries outright, marks base entries deleted. */
  remove(id) {
    const entry = this.getById(id);
    if (!entry) return false;
    if (entry.source === 'custom') {
      Store.removeCustomEntry(id);
    } else {
      Store.markDeleted(id);
    }
    this._all = this._all.filter((e) => e.id !== id);
    return true;
  },

  exportAll() {
    return this._all;
  },

  exportByIds(ids) {
    const set = new Set(ids);
    return this._all.filter((e) => set.has(e.id));
  },

  /** Import entries from a JSON file (dashboard "Import" feature). Adds as custom entries. */
  importEntries(entries) {
    let added = 0;
    entries.forEach((raw) => {
      if (!raw || !raw.category || !getCategory(raw.category)) return;
      const record = {
        ...raw,
        id: raw.id && !this.getById(raw.id) ? raw.id : genId('imp'),
        source: 'custom',
        importedAt: new Date().toISOString(),
      };
      Store.addCustomEntry(record);
      this._all.push(record);
      added += 1;
    });
    return added;
  },
};

window.DataStore = DataStore;
