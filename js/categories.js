/**
 * categories.js
 * Single source of truth for the 15 engineering categories.
 * Each category defines: id, label, group, color, icon file, dataset.
 * Adding a new category = adding one entry here + matching data.
 */

const CATEGORIES = [
  { id: 'construction-projects', label: 'Construction Projects', group: 'built',      color: '#E8590C', icon: 'crane.svg',       dataset: 'projects' },
  { id: 'bridges',               label: 'Bridges',               group: 'transport', color: '#2B6CB0', icon: 'bridge.svg',      dataset: 'projects' },
  { id: 'roads',                 label: 'Roads',                 group: 'transport', color: '#5C6B73', icon: 'road.svg',        dataset: 'projects' },
  { id: 'railways',              label: 'Railways',               group: 'transport', color: '#1F4E79', icon: 'railway.svg',     dataset: 'projects' },
  { id: 'airports',              label: 'Airports',               group: 'transport', color: '#3FA7D6', icon: 'airport.svg',     dataset: 'projects' },
  { id: 'ports',                 label: 'Ports',                  group: 'transport', color: '#0E7C7B', icon: 'port.svg',        dataset: 'projects' },
  { id: 'factories',             label: 'Factories',              group: 'built',      color: '#C2410C', icon: 'factory.svg',     dataset: 'projects' },
  { id: 'universities',          label: 'Universities',           group: 'knowledge',  color: '#6D4AFF', icon: 'university.svg',  dataset: 'companies' },
  { id: 'engineering-companies', label: 'Engineering Companies',  group: 'knowledge',  color: '#4C5FD5', icon: 'briefcase.svg',   dataset: 'companies' },
  { id: 'material-suppliers',    label: 'Material Suppliers',     group: 'knowledge',  color: '#B08900', icon: 'materials.svg',   dataset: 'materials' },
  { id: 'laboratories',          label: 'Laboratories',           group: 'knowledge',  color: '#009E8E', icon: 'lab.svg',         dataset: 'materials' },
  { id: 'quarries',              label: 'Quarries',                group: 'built',      color: '#8A6D3B', icon: 'quarry.svg',      dataset: 'projects' },
  { id: 'renewable-energy',      label: 'Renewable Energy Plants',group: 'energy',     color: '#2F9E44', icon: 'renewable.svg',   dataset: 'projects' },
  { id: 'power-plants',          label: 'Power Plants',           group: 'energy',     color: '#C1440E', icon: 'power.svg',       dataset: 'projects' },
  { id: 'industrial-facilities', label: 'Industrial Facilities',  group: 'built',      color: '#55606E', icon: 'industrial.svg',  dataset: 'projects' },
];

const CATEGORY_GROUPS = [
  { id: 'built',      label: 'Built Environment' },
  { id: 'transport',  label: 'Transport Infrastructure' },
  { id: 'energy',     label: 'Energy' },
  { id: 'knowledge',  label: 'Organizations & Knowledge' },
];

function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

function categoryIconPath(id) {
  const cat = getCategory(id);
  return cat ? `assets/icons/${cat.icon}` : 'assets/icons/pin.svg';
}

// Expose globally (no module bundler — plain script includes)
window.CATEGORIES = CATEGORIES;
window.CATEGORY_GROUPS = CATEGORY_GROUPS;
window.getCategory = getCategory;
window.categoryIconPath = categoryIconPath;
