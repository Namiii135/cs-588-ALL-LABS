import { esc, formatDate, capitalize, treeUrl, personUrl } from '../utils.js';
import { avatar, lifespan, tile, genderWord, notFound } from './components.js';

/** VIEW - a full profile page for one person, with every kind of relative as clickable tiles. */
export class PersonView {
  constructor(host) {
    this.host = host;
  }

  renderNotFound() {
    this.host.innerHTML = notFound('That person is not in this family tree.');
  }

  section(title, tiles, emptyText) {
    if (!tiles.length && !emptyText) return '';
    return `<section class="card rel-card"><h2>${title}</h2>
      ${tiles.length ? `<div class="tiles">${tiles.join('')}</div>` : `<p class="muted">${emptyText}</p>`}</section>`;
  }

  render(p, model) {
    const age = model.ageOf(p);
    const gen = model.generationOf(p.id);
    const siblings = model.getSiblings(p.id);
    const all = model.people;
    const idx = all.findIndex((x) => x.id === p.id);
    const prev = all[idx - 1];
    const next = all[idx + 1];

    const parentTiles = [model.getFather(p.id), model.getMother(p.id)]
      .filter(Boolean)
      .map((x) => tile(x, genderWord(x.gender, 'Father', 'Mother')));
    const kidWord = (x) => genderWord(x.gender, 'Son', 'Daughter');
    const fact = (label, value) => `<div><dt>${label}</dt><dd>${value ? esc(value) : '—'}</dd></div>`;

    this.host.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="index.html">Family Tree</a><span>›</span><a href="directory.html">Directory</a><span>›</span>
        <span aria-current="page">${esc(p.name)}</span>
      </nav>

      <section class="card hero ${esc(p.gender)}${p.dateOfDeath ? ' deceased' : ''}">
        ${avatar(p, 'xl')}
        <div class="hero-main">
          <h1>${esc(p.name)}</h1>
          <p class="muted">${esc(lifespan(p))}${age !== null ? ` · ${age} ${p.dateOfDeath ? 'years lived' : 'years old'}` : ''}</p>
          <p class="badges">
            <span class="badge">Generation ${gen + 1}</span>
            <span class="badge ${p.isInLaw ? 'alt' : 'outline'}">${p.isInLaw ? 'Married into the family' : 'Blood relative'}</span>
            <span class="badge ${p.dateOfDeath ? 'muted' : 'ok'}">${p.dateOfDeath ? 'Deceased' : 'Living'}</span>
          </p>
          <p class="hero-actions">
            <a class="btn" href="${treeUrl(p.id)}">Show in family tree</a>
            <a class="btn ghost" href="directory.html">Back to directory</a>
          </p>
        </div>
        <dl class="facts">
          ${fact('Born', formatDate(p.dob))}
          ${p.dateOfDeath ? fact('Died', formatDate(p.dateOfDeath)) : ''}
          ${fact('Profession', p.profession)}
          ${fact('Blood group', p.bloodGroup)}
          ${fact('Place', p.address)}
          ${fact('Phone', p.phone)}
          ${fact('Gender', capitalize(p.gender))}
          ${fact('Ancestors · Descendants', `${model.getAncestors(p.id).size} · ${model.getDescendants(p.id).size}`)}
        </dl>
      </section>

      <div class="rel-grid">
        ${this.section('Parents', parentTiles, 'No parents recorded in this tree.')}
        ${this.section(
          'Spouse',
          model.getSpouses(p.id).map((s) => tile(s.person, capitalize(s.status))),
          'No spouse recorded.'
        )}
        ${this.section(
          'Children',
          model.getChildren(p.id).map((x) => {
            const a = model.ageOf(x);
            return tile(x, `${kidWord(x)}${a !== null ? ` · ${a}` : ''}`);
          }),
          'No children recorded.'
        )}
        ${this.section(
          'Siblings',
          siblings.map((x) => tile(x, genderWord(x.gender, 'Brother', 'Sister'))),
          'No siblings recorded.'
        )}
        ${this.section(
          'Grandparents',
          model.getGrandparents(p.id).map((x) => tile(x, genderWord(x.gender, 'Grandfather', 'Grandmother')))
        )}
        ${this.section(
          'Aunts & uncles',
          model.getAuntsUncles(p.id).map((x) => tile(x, genderWord(x.gender, 'Uncle', 'Aunt')))
        )}
        ${this.section('Cousins', model.getCousins(p.id).map((x) => tile(x, 'Cousin')))}
      </div>

      <nav class="pager" aria-label="Browse people">
        ${prev ? `<a href="${personUrl(prev.id)}" rel="prev">← ${esc(prev.name)}</a>` : '<span></span>'}
        ${next ? `<a href="${personUrl(next.id)}" rel="next">${esc(next.name)} →</a>` : '<span></span>'}
      </nav>`;
  }
}
