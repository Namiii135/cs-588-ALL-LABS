import { esc, formatDate, plural, treeUrl, personUrl } from '../utils.js';
import { avatar, lifespan, filterFields } from './components.js';

/** VIEW - searchable, filterable grid of everyone in the family. */
export class DirectoryView {
  constructor(host) {
    this.host = host;
  }

  renderShell(model) {
    this.host.innerHTML = `
      <section class="page-head">
        <h1>Family Directory</h1>
        <p class="lede">Everyone in the ${esc(model.title.replace(/ Tree$/i, ''))} at a glance. Combine filters to
        explore by generation, place, profession or blood group.</p>
      </section>
      <form id="dir-filters" class="filters" autocomplete="off">
        ${filterFields(model, ['q', 'gender', 'status', 'generation', 'membership', 'address', 'bloodGroup', 'profession', 'sort'])}
        <button type="reset" class="btn ghost">Reset</button>
      </form>
      <p id="dir-count" class="muted" aria-live="polite"></p>
      <div id="dir-results" class="grid"></div>`;
    this.results = this.host.querySelector('#dir-results');
    this.count = this.host.querySelector('#dir-count');
  }

  setQuery(q) {
    this.host.querySelector('[name="q"]').value = q;
  }

  renderResults(list, model, total) {
    this.count.textContent = `Showing ${list.length} of ${plural(total, 'person', 'people')}`;
    if (!list.length) {
      this.results.innerHTML = `<div class="empty card"><h2>No one matches</h2>
        <p>Try removing a filter or searching for something else.</p></div>`;
      return;
    }
    const today = new Date();
    this.results.innerHTML = list
      .map((p) => {
        const age = model.ageOf(p, today);
        const kids = model.getChildren(p.id).length;
        return `<article class="person-card ${esc(p.gender)}${p.dateOfDeath ? ' deceased' : ''}">
          <a class="card-main" href="${personUrl(p.id)}">
            ${avatar(p, 'lg')}
            <h3>${esc(p.name)}</h3>
            <p class="muted">${esc(lifespan(p))}${age !== null ? ` · ${age} ${p.dateOfDeath ? 'yrs lived' : 'yrs'}` : ''}</p>
            <p class="job">${esc(p.profession || 'Profession not recorded')}</p>
            <p class="place">${esc(p.address || '—')}</p>
            <p class="badges">
              <span class="badge">Gen ${model.generationOf(p.id) + 1}</span>
              ${p.isInLaw ? '<span class="badge alt">Married in</span>' : ''}
              ${p.dateOfDeath ? '<span class="badge muted">Deceased</span>' : ''}
              ${p.bloodGroup ? `<span class="badge outline">${esc(p.bloodGroup)}</span>` : ''}
              ${kids ? `<span class="badge outline">${plural(kids, 'child', 'children')}</span>` : ''}
            </p>
          </a>
          <a class="card-tree" href="${treeUrl(p.id)}" title="Show ${esc(p.name)} in the family tree">Show in tree ↗</a>
        </article>`;
      })
      .join('');
  }
}
