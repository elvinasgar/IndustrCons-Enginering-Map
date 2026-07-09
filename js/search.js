/**
 * search.js
 * Two responsibilities:
 *  1. Fast text search over a local index built from the JSON datasets.
 *  2. A small "AI-style" natural-language parser that turns a sentence like
 *     "show completed bridges in Norway with structural discipline" into
 *     structured filters — all client-side keyword matching, no AI API.
 */

const SearchEngine = {
  _index: [],

  build(entries) {
    this._index = entries.map((e) => ({
      id: e.id,
      blob: [
        e.name, e.description, e.address, e.country, e.status,
        e.contractor, e.consultant, e.client, e.category,
        ...(e.disciplines || []), ...(e.tags || []), ...(e.services || []),
      ].filter(Boolean).join(' ').toLowerCase(),
    }));
  },

  /** Plain substring/token search — fast for thousands of entries. */
  textSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return null; // null = "no text filter"
    const tokens = q.split(/\s+/).filter(Boolean);
    const matches = new Set();
    this._index.forEach((row) => {
      if (tokens.every((t) => row.blob.includes(t))) matches.add(row.id);
    });
    return matches;
  },
};

const STATUS_KEYWORDS = {
  completed: 'Completed', complete: 'Completed', finished: 'Completed',
  'in progress': 'In Progress', ongoing: 'In Progress', active: 'In Progress', building: 'In Progress',
  planned: 'Planned', upcoming: 'Planned', proposed: 'Planned',
  'on hold': 'On Hold', paused: 'On Hold', stalled: 'On Hold', halted: 'On Hold',
};

/**
 * Parses a free-typed sentence into structured filters using keyword
 * matching against known categories, statuses, disciplines and countries.
 * Anything left over becomes the free-text search term.
 */
function parseNaturalLanguageQuery(raw, knownDisciplines = [], knownCountries = []) {
  let text = ` ${raw.toLowerCase()} `;
  const result = { categories: [], statuses: [], disciplines: [], countries: [], favoritesOnly: false, freeText: '' };

  // categories (match label words + id words, longest-first to avoid partials)
  const catCandidates = CATEGORIES
    .map((c) => ({ id: c.id, terms: [c.label.toLowerCase(), c.id.replace(/-/g, ' '), c.label.toLowerCase().replace(/s$/, '')] }))
    .sort((a, b) => Math.max(...b.terms.map((t) => t.length)) - Math.max(...a.terms.map((t) => t.length)));
  catCandidates.forEach(({ id, terms }) => {
    terms.forEach((term) => {
      if (term && text.includes(` ${term} `) || text.includes(` ${term}s `)) {
        if (!result.categories.includes(id)) result.categories.push(id);
        text = text.replace(new RegExp(`\\b${term}s?\\b`, 'gi'), ' ');
      }
    });
  });

  // statuses
  Object.entries(STATUS_KEYWORDS).forEach(([kw, status]) => {
    if (text.includes(kw)) {
      if (!result.statuses.includes(status)) result.statuses.push(status);
      text = text.replace(kw, ' ');
    }
  });

  // favorites
  if (/\bfavorite(s)?\b|\bsaved\b|\bstarred\b/.test(text)) {
    result.favoritesOnly = true;
    text = text.replace(/\bfavorite(s)?\b|\bsaved\b|\bstarred\b/g, ' ');
  }

  // disciplines
  knownDisciplines.forEach((d) => {
    const term = d.toLowerCase();
    if (text.includes(term)) {
      result.disciplines.push(d);
      text = text.replace(new RegExp(term, 'gi'), ' ');
    }
  });

  // countries
  knownCountries.forEach((c) => {
    const term = c.toLowerCase();
    if (text.includes(term)) {
      result.countries.push(c);
      text = text.replace(new RegExp(term, 'gi'), ' ');
    }
  });

  // strip filler words commonly used in natural queries
  text = text.replace(/\b(show|find|me|all|with|in|near|the|a|an|of|that are|which are|list|display)\b/g, ' ');
  result.freeText = text.replace(/\s+/g, ' ').trim();

  return result;
}

window.SearchEngine = SearchEngine;
window.parseNaturalLanguageQuery = parseNaturalLanguageQuery;
