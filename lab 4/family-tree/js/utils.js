// Small helpers shared by the models, views and controllers.

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Parse "YYYY-MM-DD" (or "YYYY") into a local Date; returns null for empty values. */
export function parseDate(value) {
  if (!value) return null;
  const [y, m = 1, d = 1] = String(value).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(value) {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter((w) => w && !/\.$/.test(w));
  if (!parts.length) return '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (parts[0][0] + last).toUpperCase();
}

export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const personUrl = (id) => `person.html?id=${encodeURIComponent(id)}`;
export const treeUrl = (id) => `index.html#${encodeURIComponent(id)}`;

/** Turn a <form> into a plain { name: value } object. */
export function readForm(form) {
  const out = {};
  new FormData(form).forEach((value, key) => {
    out[key] = String(value);
  });
  return out;
}

export function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage can be unavailable (private mode) - ignore */
  }
}
