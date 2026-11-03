import { BaseController } from './BaseController.js';
import { InsightsView } from '../views/InsightsView.js';

/** CONTROLLER - insights page: draws the statistics and runs the relationship finder. */
export class InsightsController extends BaseController {
  constructor() {
    super({ active: 'insights' });
    this.pageTitle = 'Insights';
  }

  start() {
    this.view = new InsightsView(this.main);
    this.view.render(this.model);

    const form = this.main.querySelector('#rel-form');
    // Sensible starting pair: the eldest blood relative and the youngest person.
    const eldest = this.model.getRoots()[0] ?? this.model.people[0];
    const youngest = this.model.sort(this.model.people, 'youngest')[0];
    form.elements.a.value = youngest.id;
    form.elements.b.value = eldest.id;

    const run = () => {
      const result = this.model.relationship(form.elements.a.value, form.elements.b.value);
      this.view.renderRelationship(result, this.model);
    };
    form.addEventListener('change', run);
    this.main.querySelector('#rel-swap').addEventListener('click', () => {
      const { a, b } = form.elements;
      [a.value, b.value] = [b.value, a.value];
      run();
    });
    run();
  }
}
