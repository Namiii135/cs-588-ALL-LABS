import { esc, formatDate, personUrl } from '../utils.js';
import { avatar, lifespan, filterFields } from './components.js';

/** VIEW - the interactive family tree page: filter bar, tree canvas and detail panel. */
const BOND_GLYPH = { married: '♥', widowed: '♥', divorced: '✕' };

export class TreeView {
  constructor(host) {
    this.host = host;
    this.zoom = 1;
  }

  /* ---------- page shell ---------- */

  renderShell(model) {
    this.host.innerHTML = `
      <section class="page-head">
        <h1>${esc(model.title)}</h1>
        <p class="lede">Click anyone to light up their ancestors and descendants. Search and filters
        highlight matches across the whole family; use the +/− buttons to fold branches.</p>
      </section>

      <form id="tree-filters" class="filters" autocomplete="off">
        ${filterFields(model, ['q', 'gender', 'status', 'generation', 'membership'])}
        <button type="reset" class="btn ghost">Reset</button>
      </form>

      <div class="tree-toolbar">
        <span id="result-count" class="muted" aria-live="polite"></span>
        <div class="btn-group" role="group" aria-label="Tree controls">
          <button type="button" class="btn small" data-action="collapse">Collapse all</button>
          <button type="button" class="btn small" data-action="expand">Expand all</button>
          <button type="button" class="btn small icon" data-action="zoom-out" aria-label="Zoom out">−</button>
          <button type="button" class="btn small zoom-label" data-action="zoom-reset" id="zoom-label" aria-label="Reset zoom">100%</button>
          <button type="button" class="btn small icon" data-action="zoom-in" aria-label="Zoom in">+</button>
          <button type="button" class="btn small" data-action="fit">Fit to screen</button>
        </div>
      </div>

      <div class="tree-layout">
        <div class="tree-scroller" id="tree-scroller" tabindex="0" aria-label="Family tree (scrollable)">
          <div id="tree-zoom" class="tree-zoom"><div id="forest" class="forest tree"></div></div>
        </div>
        <aside id="person-panel" class="panel card" aria-live="polite">${this.panelEmpty()}</aside>
      </div>

      <ul class="legend" aria-label="Legend">
        <li><span class="swatch selected"></span>Selected</li>
        <li><span class="swatch anc"></span>Ancestors</li>
        <li><span class="swatch desc"></span>Descendants</li>
        <li><span class="swatch inlaw"></span>Married into the family</li>
        <li><span class="swatch deceased"></span>Deceased</li>
        <li><span class="bond-sample">♥</span>Married · <span class="bond-sample divorced">✕</span>Divorced</li>
      </ul>`;
    this.scroller = this.host.querySelector('#tree-scroller');
    this.zoomLayer = this.host.querySelector('#tree-zoom');
    this.forest = this.host.querySelector('#forest');
    this.panel = this.host.querySelector('#person-panel');
  }

  /* ---------- the tree itself ---------- */

  renderTree(model) {
    const rendered = new Set();

    const node = (p) => {
      const cls = [p.gender, p.dateOfDeath ? 'deceased' : '', p.isInLaw ? 'inlaw' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="node ${cls}" data-id="${esc(p.id)}"
          aria-label="${esc(p.name)}, ${esc(lifespan(p))}">
          ${avatar(p, 'md')}
          <span class="node-name">${esc(p.name)}</span>
          <span class="node-meta">${esc(lifespan(p))}</span>
          <span class="node-job">${esc(p.profession || ' ')}</span>
        </button>`;
    };

    // One "unit" = a person, their (not yet drawn) spouses, and everything below them.
    const unit = (p) => {
      rendered.add(p.id);
      const members = [p];
      const statuses = [];
      for (const s of model.getSpouses(p.id)) {
        if (!rendered.has(s.person.id)) {
          rendered.add(s.person.id);
          members.push(s.person);
          statuses.push(s.status);
        }
      }

      const kids = new Map();
      members.forEach((m) => model.getChildren(m.id).forEach((c) => kids.set(c.id, c)));
      const ordered = [...kids.values()].sort((a, b) => (a.dob || '').localeCompare(b.dob || ''));
      let childCount = 0;
      const childHtml = ordered
        .map((c) => {
          if (rendered.has(c.id)) return '';
          childCount += 1;
          return unit(c);
        })
        .join('');

      const couple = members
        .map((m, i) => {
          const bond = i
            ? `<span class="bond ${esc(statuses[i - 1])}" title="${esc(statuses[i - 1])}">${BOND_GLYPH[statuses[i - 1]] ?? '♥'}</span>`
            : '';
          return bond + node(m);
        })
        .join('');

      const toggle = childCount
        ? `<button type="button" class="toggle" data-count="${childCount}" aria-expanded="true"
             aria-label="Fold or unfold ${childCount} children of ${esc(p.name)}">−</button>`
        : '';
      return `<li><div class="unit">${couple}</div>${toggle}${childCount ? `<ul>${childHtml}</ul>` : ''}</li>`;
    };

    let html = '';
    for (const root of model.getRoots()) if (!rendered.has(root.id)) html += `<ul class="root">${unit(root)}</ul>`;
    // Safety net: anyone not reachable from a root (e.g. incomplete data) still gets drawn.
    for (const p of model.people) if (!rendered.has(p.id)) html += `<ul class="root">${unit(p)}</ul>`;

    this.forest.innerHTML = html;
    this.total = model.people.length;
  }

  nodeEl(id) {
    return [...this.forest.querySelectorAll('.node')].find((n) => n.dataset.id === id) ?? null;
  }

  /* ---------- highlighting ---------- */

  applyState({ matches, lineage }) {
    this.forest.querySelectorAll('.node').forEach((n) => {
      const id = n.dataset.id;
      n.classList.remove('dim', 'match', 'selected', 'anc', 'desc', 'mate');
      let dim = false;
      if (matches) {
        if (matches.has(id)) n.classList.add('match');
        else dim = true;
      }
      if (lineage) {
        if (id === lineage.selected) n.classList.add('selected');
        else if (lineage.anc.has(id)) n.classList.add('anc');
        else if (lineage.desc.has(id)) n.classList.add('desc');
        else if (lineage.mates.has(id)) n.classList.add('mate');
        else dim = true;
        if (id === lineage.selected || lineage.anc.has(id) || lineage.desc.has(id) || lineage.mates.has(id)) dim = false;
      }
      if (dim) n.classList.add('dim');
      n.setAttribute('aria-pressed', lineage && id === lineage.selected ? 'true' : 'false');
    });
    const count = this.host.querySelector('#result-count');
    count.textContent = matches
      ? `${matches.size} of ${this.total} people match`
      : `${this.total} people · ${this.forest.querySelectorAll('.root').length} family line`;
  }

  /* ---------- folding & zoom ---------- */

  setCollapsed(li, collapsed) {
    li.classList.toggle('collapsed', collapsed);
    const btn = li.querySelector(':scope > .toggle');
    if (!btn) return;
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.textContent = collapsed ? `+${btn.dataset.count}` : '−';
  }

  toggleBranch(btn) {
    const li = btn.closest('li');
    this.setCollapsed(li, !li.classList.contains('collapsed'));
  }

  setAllCollapsed(collapsed) {
    this.forest.querySelectorAll('li').forEach((li) => this.setCollapsed(li, collapsed));
  }

  /** Unfold every branch above a node so it is visible. */
  reveal(id) {
    const n = this.nodeEl(id);
    if (!n) return;
    let li = n.closest('li')?.parentElement?.closest('li');
    while (li) {
      this.setCollapsed(li, false);
      li = li.parentElement?.closest('li');
    }
  }

  scrollTo(id) {
    this.nodeEl(id)?.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'smooth' });
  }

  setZoom(z) {
    this.zoom = Math.min(1.6, Math.max(0.4, Math.round(z * 100) / 100));
    this.zoomLayer.style.zoom = this.zoom;
    this.host.querySelector('#zoom-label').textContent = `${Math.round(this.zoom * 100)}%`;
  }

  /** Shrink the tree to the width of the canvas. `floor` stops it becoming unreadably small. */
  fit(floor = 0.4) {
    this.setZoom(1);
    const available = this.scroller.clientWidth - 40;
    const needed = this.forest.getBoundingClientRect().width;
    if (needed > 0 && available > 0) this.setZoom(Math.max(floor, Math.min(1, available / needed)));
    this.scroller.scrollLeft = 0;
  }

  /* ---------- side panel ---------- */

  panelEmpty() {
    return `<div class="panel-empty"><h2>Select a person</h2>
      <p class="muted">Their details and close relatives appear here, and their family line is highlighted in the tree.</p></div>`;
  }

  renderPanel(p, rel) {
    const chips = (list, withStatus = false) =>
      list.length
        ? `<div class="chips">${list
            .map((x) => {
              const person = withStatus ? x.person : x;
              const extra = withStatus && x.status !== 'married' ? ` (${esc(x.status)})` : '';
              return `<button type="button" class="chip ${esc(person.gender)}" data-select="${esc(person.id)}">${avatar(person, 'xs')}${esc(person.name)}${extra}</button>`;
            })
            .join('')}</div>`
        : '<p class="muted small">None recorded</p>';

    const fact = (label, value) => `<div><dt>${label}</dt><dd>${value ? esc(value) : '—'}</dd></div>`;
    this.panel.innerHTML = `
      <div class="panel-head">${avatar(p, 'lg')}
        <div><h2>${esc(p.name)}</h2>
          <p class="muted">${esc(lifespan(p))}${rel.age !== null ? ` · ${rel.age} ${p.dateOfDeath ? 'years lived' : 'years old'}` : ''}</p>
          <p><span class="badge">Generation ${rel.generation + 1}</span>
             ${p.isInLaw ? '<span class="badge alt">Married in</span>' : ''}
             ${p.dateOfDeath ? '<span class="badge muted">Deceased</span>' : ''}</p>
        </div></div>
      <dl class="facts compact">
        ${fact('Born', formatDate(p.dob))}
        ${p.dateOfDeath ? fact('Died', formatDate(p.dateOfDeath)) : ''}
        ${fact('Profession', p.profession)}
        ${fact('Blood group', p.bloodGroup)}
        ${fact('Place', p.address)}
      </dl>
      <h3>Parents</h3>${chips(rel.parents)}
      <h3>Spouse</h3>${chips(rel.spouses, true)}
      <h3>Children</h3>${chips(rel.children)}
      <h3>Siblings</h3>${chips(rel.siblings)}
      <p class="panel-actions"><a class="btn" href="${personUrl(p.id)}">Open full profile →</a></p>`;
  }

  clearPanel() {
    this.panel.innerHTML = this.panelEmpty();
  }
}
