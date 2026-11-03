import { esc, personUrl } from '../utils.js';
import { avatar } from './components.js';
import { stepLabel } from '../models/FamilyModel.js';

/** VIEW - statistics, charts, upcoming birthdays and the "how are we related?" finder. */
export class InsightsView {
  constructor(host) {
    this.host = host;
  }

  bars(title, rows, note = '') {
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return `<section class="card chart"><h2>${title}</h2>${note ? `<p class="muted small">${note}</p>` : ''}
      <ul class="bars">${rows
        .map(
          ([label, n]) => `<li>
          <span class="bar-label">${esc(label)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${((n / max) * 100).toFixed(1)}%"></span></span>
          <span class="bar-val">${n}</span></li>`
        )
        .join('')}</ul></section>`;
  }

  stat(value, label, sub = '') {
    return `<div class="stat"><span class="stat-num">${value}</span><span class="stat-label">${esc(label)}</span>
      ${sub ? `<span class="stat-sub">${sub}</span>` : ''}</div>`;
  }

  render(model) {
    const s = model.stats();
    const person = (p, age) =>
      p ? `<a href="${personUrl(p.id)}">${esc(p.name)}</a>${age !== null ? ` · ${age}` : ''}` : '—';
    const options = [...model.people]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
      .join('');

    this.host.innerHTML = `
      <section class="page-head">
        <h1>Family Insights</h1>
        <p class="lede">Numbers computed live from <code>data/people.json</code>  edit the file and this page changes with it.</p>
      </section>

      <div class="stats">
        ${this.stat(s.total, 'Family members', `${s.living} living · ${s.deceased} deceased`)}
        ${this.stat(s.generations, 'Generations')}
        ${this.stat(s.couples, 'Couples')}
        ${this.stat(s.averageAge ?? '—', 'Average age (living)')}
        ${this.stat(person(s.oldestLiving, s.oldestLiving && model.ageOf(s.oldestLiving)), 'Eldest living').replace('stat-num', 'stat-num small')}
        ${this.stat(person(s.youngest, s.youngest && model.ageOf(s.youngest)), 'Youngest').replace('stat-num', 'stat-num small')}
      </div>

      <div class="chart-grid">
        ${this.bars('People per generation', s.byGeneration)}
        ${this.bars('Blood groups', s.byBloodGroup)}
        ${this.bars('Where the family lives', s.byAddress)}
        ${this.bars('Born in the decade', s.byDecade, 'Birth decades across all generations')}
      </div>

      <div class="two-col">
        <section class="card" id="birthdays">
          <h2>Upcoming birthdays</h2>
          <ul class="birthdays">${model
            .upcomingBirthdays(6)
            .map(
              (b) => `<li>
              ${avatar(b.person, 'sm')}
              <span><a href="${personUrl(b.person.id)}">${esc(b.person.name)}</a>
                <small>turns ${b.turning} · ${esc(b.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</small></span>
              <span class="when">${b.days === 0 ? 'Today! 🎉' : b.days === 1 ? 'Tomorrow' : `in ${b.days} days`}</span></li>`
            )
            .join('')}</ul>
        </section>

        <section class="card" id="finder">
          <h2>How are we related?</h2>
          <form id="rel-form" class="rel-form">
            <label class="field"><span>Person A</span><select name="a">${options}</select></label>
            <button type="button" class="btn small icon" id="rel-swap" aria-label="Swap people" title="Swap">⇄</button>
            <label class="field"><span>Person B</span><select name="b">${options}</select></label>
          </form>
          <div id="rel-result" class="rel-result" aria-live="polite"></div>
        </section>
      </div>`;
  }

  renderRelationship(result, model) {
    const box = this.host.querySelector('#rel-result');
    if (!result) {
      box.innerHTML = '';
      return;
    }
    const { a, b } = result;
    if (result.same) {
      box.innerHTML = '<p class="muted">Pick two different people to see how they are related.</p>';
      return;
    }
    if (!result.connected) {
      box.innerHTML = `<p><strong>${esc(a.name)}</strong> and <strong>${esc(b.name)}</strong> are not connected in this tree.</p>`;
      return;
    }
    const sentence = result.label
      ? `<p class="rel-sentence"><a href="${personUrl(b.id)}">${esc(b.name)}</a> is <a href="${personUrl(a.id)}">${esc(a.name)}</a>’s <strong>${esc(result.label.toLowerCase())}</strong>.</p>`
      : `<p class="rel-sentence">They are <strong>distant relatives</strong>, linked through ${result.types.length} steps.</p>`;
    const steps = result.path
      .map((p, i) => {
        const via = i ? `<span class="via">${esc(stepLabel(result.types[i - 1], p.gender).toLowerCase())} →</span>` : '';
        return `<li>${via}<a class="chip ${esc(p.gender)}" href="${personUrl(p.id)}">${avatar(p, 'xs')}${esc(p.name)}</a></li>`;
      })
      .join('');
    box.innerHTML = `${sentence}<ol class="path" aria-label="Path between the two people">${steps}</ol>`;
  }
}
