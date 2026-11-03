import { esc, storageGet, storageSet } from '../utils.js';

/** VIEW - the site header (brand, navigation, quick "jump to person" box, theme switch). */
const NAV = [
  ['index.html', 'Family Tree', 'tree'],
  ['directory.html', 'Directory', 'directory'],
  ['insights.html', 'Insights', 'insights'],
];

const LOGO = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
  <circle cx="12" cy="5" r="3" fill="currentColor"/><circle cx="5" cy="19" r="3" fill="currentColor"/>
  <circle cx="19" cy="19" r="3" fill="currentColor"/>
  <path d="M12 8v4M12 12H5v4M12 12h7v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

export class LayoutView {
  static applyTheme() {
    const saved = storageGet('family-theme');
    const dark = saved ? saved === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }

  static toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    storageSet('family-theme', next);
  }

  static render(host, { title, active, people }) {
    const links = NAV.map(
      ([href, label, key]) =>
        `<a href="${href}" class="${key === active ? 'active' : ''}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`
    ).join('');
    const options = people.map((p) => `<option value="${esc(p.name)}"></option>`).join('');

    host.innerHTML = `<div class="header-inner">
      <a class="brand" href="index.html">${LOGO}<span>${esc(title)}</span></a>
      <nav class="nav" aria-label="Main">${links}</nav>
      <div class="header-tools">
        <label class="jump"><span class="sr-only">Jump to a person</span>
          <input id="jump-input" list="jump-list" placeholder="Jump to a person…" autocomplete="off"></label>
        <datalist id="jump-list">${options}</datalist>
        <button id="theme-toggle" class="icon-btn" type="button" aria-label="Switch light or dark theme" title="Switch theme">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>
        </button>
      </div>
    </div>`;
  }

  static errorHtml(err) {
    const local = location.protocol === 'file:';
    return `<div class="empty card error">
      <h2>Could not load the family data</h2>
      <p>${esc(err.message)}</p>
      ${
        local
          ? `<p>You opened this page straight from disk, and browsers block <code>fetch()</code> for local files.
             Start a tiny web server in this folder instead, for example <code>python3 -m http.server 8080</code>,
             then visit <code>http://localhost:8080</code>.</p>`
          : '<p>Check that <code>data/people.json</code> exists and contains valid JSON.</p>'
      }
    </div>`;
  }
}
