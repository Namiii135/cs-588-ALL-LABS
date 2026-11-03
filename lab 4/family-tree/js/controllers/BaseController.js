import { FamilyModel } from '../models/FamilyModel.js';
import { LayoutView } from '../views/LayoutView.js';
import { personUrl } from '../utils.js';

/**
 * CONTROLLER base class - loads the model, draws the shared header and then
 * hands over to the page-specific controller's start().
 */
export class BaseController {
  constructor({ active }) {
    this.active = active;
    this.model = new FamilyModel();
    this.main = document.getElementById('app');
  }

  async init() {
    LayoutView.applyTheme();
    try {
      await this.model.load('data/people.json');
    } catch (err) {
      this.main.innerHTML = LayoutView.errorHtml(err);
      return;
    }
    this.renderLayout();
    this.start();
  }

  renderLayout() {
    const host = document.getElementById('site-header');
    LayoutView.render(host, { title: this.model.title, active: this.active, people: this.model.people });
    document.title = `${this.pageTitle ?? ''}${this.pageTitle ? ' · ' : ''}${this.model.title}`;

    host.querySelector('#theme-toggle').addEventListener('click', () => LayoutView.toggleTheme());

    const jump = host.querySelector('#jump-input');
    jump.addEventListener('change', () => {
      const q = jump.value.trim().toLowerCase();
      if (!q) return;
      const exact = this.model.people.find((p) => p.name.toLowerCase() === q);
      const matches = exact ? [exact] : this.model.filter({ q });
      if (matches.length === 1) location.href = personUrl(matches[0].id);
      else if (matches.length > 1) location.href = `directory.html?q=${encodeURIComponent(q)}`;
    });
  }

  /** Page controllers override this. */
  start() {}
}
