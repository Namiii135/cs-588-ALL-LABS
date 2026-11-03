import { BaseController } from './BaseController.js';
import { TreeView } from '../views/TreeView.js';
import { readForm } from '../utils.js';

/** CONTROLLER - tree page: wires filters, clicks, folding and zoom to the model and view. */
export class TreeController extends BaseController {
  constructor() {
    super({ active: 'tree' });
    this.pageTitle = 'Family Tree';
    this.selectedId = null;
  }

  start() {
    this.view = new TreeView(this.main);
    this.view.renderShell(this.model);
    this.view.renderTree(this.model);
    this.form = this.main.querySelector('#tree-filters');
    this.bind();

    this.view.fit(0.7); // on first load keep text readable; the "Fit to screen" button shrinks further
    const fromHash = decodeURIComponent(location.hash.slice(1));
    if (this.model.getById(fromHash)) this.select(fromHash, { scroll: true });
    else this.refresh();
  }

  bind() {
    this.form.addEventListener('input', () => this.refresh());
    this.form.addEventListener('change', () => this.refresh());
    this.form.addEventListener('reset', () => {
      setTimeout(() => {
        this.select(null);
        this.refresh();
      });
    });
    this.form.addEventListener('submit', (e) => e.preventDefault());

    this.view.forest.addEventListener('click', (e) => {
      const toggle = e.target.closest('.toggle');
      if (toggle) return this.view.toggleBranch(toggle);
      const node = e.target.closest('.node');
      if (node) this.select(this.selectedId === node.dataset.id ? null : node.dataset.id);
    });

    this.view.panel.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-select]');
      if (chip) this.select(chip.dataset.select, { scroll: true });
    });

    this.main.querySelector('.tree-toolbar').addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      const v = this.view;
      const actions = {
        collapse: () => v.setAllCollapsed(true),
        expand: () => v.setAllCollapsed(false),
        'zoom-in': () => v.setZoom(v.zoom + 0.1),
        'zoom-out': () => v.setZoom(v.zoom - 0.1),
        'zoom-reset': () => v.setZoom(1),
        fit: () => v.fit(),
      };
      actions[action]?.();
    });

    addEventListener('hashchange', () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (id !== this.selectedId && this.model.getById(id)) this.select(id, { scroll: true });
    });
  }

  select(id, { scroll = false } = {}) {
    this.selectedId = id;
    const person = id ? this.model.getById(id) : null;

    if (person) {
      this.view.reveal(id);
      this.view.renderPanel(person, {
        parents: this.model.getParents(id),
        spouses: this.model.getSpouses(id),
        children: this.model.getChildren(id),
        siblings: this.model.getSiblings(id),
        generation: this.model.generationOf(id),
        age: this.model.ageOf(person),
      });
      history.replaceState(null, '', `#${encodeURIComponent(id)}`);
    } else {
      this.view.clearPanel();
      history.replaceState(null, '', location.pathname + location.search);
    }
    this.refresh();
    if (person && scroll) this.view.scrollTo(id);
  }

  refresh() {
    const criteria = readForm(this.form);
    const active = Object.values(criteria).some((v) => v !== '');
    const matches = active ? new Set(this.model.filter(criteria).map((p) => p.id)) : null;

    let lineage = null;
    if (this.selectedId) {
      const id = this.selectedId;
      const anc = this.model.getAncestors(id);
      const desc = this.model.getDescendants(id);
      const mates = new Set();
      [id, ...anc, ...desc].forEach((x) => this.model.getSpouses(x).forEach((s) => mates.add(s.person.id)));
      lineage = { selected: id, anc, desc, mates };
    }
    this.view.applyState({ matches, lineage });
  }
}
