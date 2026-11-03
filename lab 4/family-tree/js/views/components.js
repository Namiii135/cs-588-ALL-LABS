import { esc, initials, capitalize, personUrl } from '../utils.js';

/* Reusable HTML fragments shared by every view. */

export function avatar(p, size = 'md') {
  const cls = `avatar ${size} ${esc(p.gender)}`;
  if (p.photo) return `<img class="${cls}" src="${esc(p.photo)}" alt="${esc(p.name)}">`;
  return `<span class="${cls}" aria-hidden="true">${esc(initials(p.name))}</span>`;
}

export function lifespan(p) {
  const born = p.dob ? p.dob.slice(0, 4) : '?';
  return p.dateOfDeath ? `${born} – ${p.dateOfDeath.slice(0, 4)}` : `b. ${born}`;
}

export const genderWord = (gender, male, female) => (gender === 'female' ? female : male);

/** A link tile to another person's profile, with a small caption underneath the name. */
export function tile(p, caption = '') {
  return `<a class="tile ${esc(p.gender)}${p.dateOfDeath ? ' deceased' : ''}" href="${personUrl(p.id)}">
    ${avatar(p, 'sm')}
    <span class="tile-text"><strong>${esc(p.name)}</strong>${caption ? `<small>${esc(caption)}</small>` : ''}</span>
  </a>`;
}

function select(name, label, options) {
  return `<label class="field"><span>${label}</span>
    <select name="${name}">${options.map(([v, text]) => `<option value="${esc(v)}">${esc(text)}</option>`).join('')}</select>
  </label>`;
}

/** Builds the filter controls used by both the tree page and the directory page. */
export function filterFields(model, fields) {
  const gens = Array.from({ length: model.generationCount() }, (_, g) => [String(g), `Generation ${g + 1}`]);
  const all = (label, list) => [['', label], ...list.map((v) => [v, v])];

  const defs = {
    q: `<label class="field grow"><span>Search</span>
          <input type="search" name="q" placeholder="Name, profession or place" autocomplete="off"></label>`,
    gender: select('gender', 'Gender', all('All', model.distinct('gender')).map(([v, t]) => [v, capitalize(t)])),
    status: select('status', 'Status', [['', 'All'], ['alive', 'Living'], ['deceased', 'Deceased']]),
    generation: select('generation', 'Generation', [['', 'All'], ...gens]),
    membership: select('membership', 'Family role', [['', 'Everyone'], ['blood', 'Blood relatives'], ['inlaw', 'Married in']]),
    address: select('address', 'Place', all('Anywhere', model.distinct('address'))),
    bloodGroup: select('bloodGroup', 'Blood group', all('Any', model.distinct('bloodGroup'))),
    profession: select('profession', 'Profession', all('Any', model.distinct('profession'))),
    sort: select('sort', 'Sort by', [
      ['name', 'Name (A–Z)'],
      ['oldest', 'Oldest first'],
      ['youngest', 'Youngest first'],
      ['generation', 'Generation'],
    ]),
  };
  return fields.map((f) => defs[f]).join('');
}

export function notFound(message = 'We could not find that person.') {
  return `<div class="empty card"><h2>Not found</h2><p>${esc(message)}</p>
    <p><a class="btn" href="directory.html">Browse the directory</a></p></div>`;
}
