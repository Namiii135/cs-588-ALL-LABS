import { BaseController } from './BaseController.js';
import { PersonView } from '../views/PersonView.js';

/** CONTROLLER - person page: reads ?id= from the URL and asks the view to draw that person. */
export class PersonController extends BaseController {
  constructor() {
    super({ active: 'directory' });
  }

  start() {
    this.view = new PersonView(this.main);
    const id = new URLSearchParams(location.search).get('id');
    const person = this.model.getById(id);
    if (!person) {
      document.title = `Not found · ${this.model.title}`;
      return this.view.renderNotFound();
    }
    document.title = `${person.name} · ${this.model.title}`;
    this.view.render(person, this.model);
  }
}
