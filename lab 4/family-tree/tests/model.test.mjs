// Run with:  node tests/model.test.mjs   (or npm test)
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FamilyModel } from '../js/models/FamilyModel.js';

const data = JSON.parse(await readFile(new URL('../data/people.json', import.meta.url), 'utf8'));
const m = new FamilyModel().loadFromObject(data);
const names = (list) => list.map((p) => p.name);
let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

console.log(`Model tests (${m.title})`);

test('loads every person', () => assert.equal(m.people.length, 19));

test('data integrity: every referenced id exists and spouses are mutual', () => {
  for (const p of m.people) {
    for (const ref of [p.fatherId, p.motherId, ...p.spouses.map((s) => s.id)].filter(Boolean)) {
      assert.ok(m.getById(ref), `${p.id} references missing ${ref}`);
    }
    for (const s of p.spouses) {
      assert.ok(m.getById(s.id).spouses.some((x) => x.id === p.id), `${p.id} <-> ${s.id} not mutual`);
    }
  }
  assert.equal(new Set(m.people.map((p) => p.id)).size, m.people.length, 'duplicate ids');
});

test('parents, spouses and children', () => {
  assert.deepEqual(names(m.getParents('p9')), ['Ahmad Rahman', 'Faridah Ismail']);
  assert.deepEqual(names(m.getChildren('p1')), ['Ahmad Rahman', 'Noraini Rahman', 'Zulkifli Rahman']);
  assert.equal(m.getSpouses('p4')[0].status, 'widowed');
  assert.deepEqual(names(m.getChildren('p9')), ['Adam Rahman', 'Aleesya Rahman']);
});

test('siblings, grandparents, aunts/uncles, cousins', () => {
  assert.deepEqual(names(m.getSiblings('p9')), ['Nurul Aisyah Rahman']);
  assert.deepEqual(names(m.getGrandparents('p9')), ['Abdullah Rahman', 'Salmah Yusof']);
  assert.deepEqual(names(m.getAuntsUncles('p9')), ['Noraini Rahman', 'Zulkifli Rahman']);
  assert.deepEqual(names(m.getCousins('p9')), ['Farhan Karim', 'Balqis Karim', 'Daniel Rahman', 'Sofea Rahman']);
});

test('ancestors / descendants', () => {
  assert.equal(m.getDescendants('p1').size, 12);
  assert.ok(m.getDescendants('p1').has('p19'));
  assert.ok(m.getAncestors('p19').has('p1'));
  assert.ok(!m.getAncestors('p19').has('p5'));
});

test('generations (in-laws follow their spouse)', () => {
  assert.equal(m.generationOf('p1'), 0);
  assert.equal(m.generationOf('p2'), 0);
  assert.equal(m.generationOf('p3'), 1);
  assert.equal(m.generationOf('p7'), 1);
  assert.equal(m.generationOf('p9'), 2);
  assert.equal(m.generationOf('p15'), 2);
  assert.equal(m.generationOf('p19'), 3);
  assert.equal(m.generationCount(), 4);
});

test('age uses date of death when present', () => {
  assert.equal(m.ageOf(m.getById('p1')), 78);
  assert.equal(m.ageOf(m.getById('p9'), new Date(2026, 9, 29)), 36);
  assert.equal(m.ageOf(m.getById('p17'), new Date(2026, 4, 5)), 6);
  assert.equal(m.ageOf(m.getById('p17'), new Date(2026, 4, 6)), 7);
});

test('filtering', () => {
  assert.equal(m.filter({ gender: 'female' }).length, 10);
  assert.deepEqual(names(m.filter({ status: 'deceased' })), ['Abdullah Rahman', 'Hasbullah Karim']);
  assert.equal(m.filter({ generation: '3' }).length, 3);
  assert.equal(m.filter({ membership: 'inlaw' }).length, 6);
  assert.deepEqual(names(m.filter({ q: 'melaka', membership: 'blood' })), ['Abdullah Rahman', 'Ahmad Rahman']);
  assert.equal(m.filter({}).length, 19);
});

test('sorting', () => {
  assert.equal(m.sort(m.people, 'oldest')[0].name, 'Abdullah Rahman');
  assert.equal(m.sort(m.people, 'youngest')[0].name, 'Aleesya Rahman');
  assert.equal(m.sort(m.people, 'name')[0].name, 'Abdullah Rahman');
});

test('stats', () => {
  const s = m.stats(new Date(2026, 9, 29));
  assert.equal(s.total, 19);
  assert.equal(s.living, 17);
  assert.equal(s.couples, 6);
  assert.equal(s.oldestLiving.name, 'Salmah Yusof');
  assert.equal(s.youngest.name, 'Aleesya Rahman');
  assert.deepEqual(s.byDecade.map((d) => d[0]), ['1930s', '1940s', '1960s', '1970s', '1990s', '2000s', '2010s', '2020s']);
});

test('upcoming birthdays', () => {
  const b = m.upcomingBirthdays(3, new Date(2026, 9, 29));
  assert.equal(b[0].person.name, 'Hana Zakaria');
  assert.equal(b[0].days, 4);
  assert.equal(b[0].turning, 5);
});

test('relationship finder', () => {
  const rel = (a, b) => m.relationship(a, b).label;
  assert.equal(rel('p9', 'p3'), 'Father');
  assert.equal(rel('p9', 'p10'), 'Sister');
  assert.equal(rel('p9', 'p1'), 'Grandfather');
  assert.equal(rel('p9', 'p4'), 'Aunt');
  assert.equal(rel('p9', 'p13'), 'Cousin');
  assert.equal(rel('p4', 'p9'), 'Nephew');
  assert.equal(rel('p1', 'p17'), 'Great-grandson');
  assert.equal(rel('p6', 'p4'), 'Sister-in-law');
  assert.equal(rel('p15', 'p3'), 'Father-in-law');
  assert.equal(rel('p3', 'p15'), 'Daughter-in-law');
  assert.equal(rel('p1', 'p2'), 'Wife');
  assert.equal(m.relationship('p9', 'p9').same, true);
  assert.ok(m.relationship('p17', 'p19').path.length > 2);
});

console.log(`\n${passed} tests passed`);
