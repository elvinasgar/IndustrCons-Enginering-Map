/**
 * storage.js
 * All persistence in this app lives in localStorage. No cookies, no backend.
 * Keys are namespaced under "ic_" (IndustrCons).
 */

const STORAGE_KEYS = {
  theme: 'ic_theme',
  favorites: 'ic_favorites',
  customEntries: 'ic_custom_entries',   // user-created entries added via dashboard
  editedEntries: 'ic_edited_entries',   // edits to base (JSON-file) entries, keyed by id
  deletedEntries: 'ic_deleted_entries', // ids of base entries the user removed locally
  recentSearches: 'ic_recent_searches',
};

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage parse failed, resetting.', e);
    return fallback;
  }
}

const Store = {
  // ---- theme ----
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  },
  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  },

  // ---- favorites ----
  getFavorites() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.favorites), []);
  },
  isFavorite(id) {
    return this.getFavorites().includes(id);
  },
  toggleFavorite(id) {
    const favs = this.getFavorites();
    const idx = favs.indexOf(id);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(id);
    }
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favs));
    return favs.includes(id);
  },

  // ---- custom entries (created in dashboard) ----
  getCustomEntries() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.customEntries), []);
  },
  saveCustomEntries(list) {
    localStorage.setItem(STORAGE_KEYS.customEntries, JSON.stringify(list));
  },
  addCustomEntry(entry) {
    const list = this.getCustomEntries();
    list.push(entry);
    this.saveCustomEntries(list);
  },
  updateCustomEntry(id, updates) {
    const list = this.getCustomEntries();
    const idx = list.findIndex((e) => e.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      this.saveCustomEntries(list);
      return true;
    }
    return false;
  },
  removeCustomEntry(id) {
    const list = this.getCustomEntries().filter((e) => e.id !== id);
    this.saveCustomEntries(list);
  },

  // ---- edits to base (read-only file) entries ----
  getEditedEntries() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.editedEntries), {});
  },
  setEditedEntry(id, updates) {
    const edits = this.getEditedEntries();
    edits[id] = { ...(edits[id] || {}), ...updates };
    localStorage.setItem(STORAGE_KEYS.editedEntries, JSON.stringify(edits));
  },
  clearEditedEntry(id) {
    const edits = this.getEditedEntries();
    delete edits[id];
    localStorage.setItem(STORAGE_KEYS.editedEntries, JSON.stringify(edits));
  },

  // ---- deleted base entries ----
  getDeletedIds() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.deletedEntries), []);
  },
  markDeleted(id) {
    const ids = this.getDeletedIds();
    if (!ids.includes(id)) ids.push(id);
    localStorage.setItem(STORAGE_KEYS.deletedEntries, JSON.stringify(ids));
  },
  restoreDeleted(id) {
    const ids = this.getDeletedIds().filter((x) => x !== id);
    localStorage.setItem(STORAGE_KEYS.deletedEntries, JSON.stringify(ids));
  },

  // ---- recent searches ----
  getRecentSearches() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.recentSearches), []);
  },
  addRecentSearch(term) {
    if (!term || term.trim().length < 2) return;
    let list = this.getRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase());
    list.unshift(term);
    list = list.slice(0, 6);
    localStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(list));
  },

  // ---- danger zone ----
  resetAllLocalData() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

window.Store = Store;
window.STORAGE_KEYS = STORAGE_KEYS;
