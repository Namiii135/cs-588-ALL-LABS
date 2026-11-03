import { BaseController } from './BaseController.js';
import { DirectoryView } from '../views/DirectoryView.js';
import { readForm } from '../utils.js';

/** CONTROLLER - directory page: turns filter form changes into model queries. */
export class DirectoryController extends BaseController {
  constructor() {
    super({ active: 'directory' });
    this.pageTitle = 'Directory';
  }

  start() {
    this.view = new DirectoryView(this.main);
    this.view.renderShell(this.model);
    const form = this.main.querySelector('#dir-filters');

    const initial = new URLSearchParams(location.search).get('q');
    if (initial) this.view.setQuery(initial);

    const refresh = () => {
      const criteria = readForm(form);
      const list = this.model.sort(this.model.filter(criteria), criteria.sort);
      this.view.renderResults(list, this.model, this.model.people.length);
    };

    form.addEventListener('input', refresh);
    form.addEventListener('change', refresh);
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('reset', () => setTimeout(refresh));
    refresh();
  }
}
