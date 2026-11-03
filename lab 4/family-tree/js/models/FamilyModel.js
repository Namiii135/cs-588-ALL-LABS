import { parseDate } from '../utils.js';

/**
 * MODEL - owns the family data and every question we can ask about it.
 * It knows nothing about the DOM: views and controllers call these methods.
 *
 * Relationship "path" codes used by relationship():
 *   P = move to a parent, C = move to a child, S = move to a spouse
 */
const RELATION_LABELS = {
  P: ['Father', 'Mother'],
  C: ['Son', 'Daughter'],
  S: ['Husband', 'Wife'],
  PP: ['Grandfather', 'Grandmother'],
  CC: ['Grandson', 'Granddaughter'],
  PC: ['Brother', 'Sister'],
  PPC: ['Uncle', 'Aunt'],
  PCC: ['Nephew', 'Niece'],
  PPCC: ['Cousin', 'Cousin'],
  PPP: ['Great-grandfather', 'Great-grandmother'],
  CCC: ['Great-grandson', 'Great-granddaughter'],
  SP: ['Father-in-law', 'Mother-in-law'],
  CS: ['Son-in-law', 'Daughter-in-law'],
  SPC: ['Brother-in-law', 'Sister-in-law'],
  PCS: ['Brother-in-law', 'Sister-in-law'],
  PPCS: ['Uncle (by marriage)', 'Aunt (by marriage)'],
  PCCS: ['Nephew-in-law', 'Niece-in-law'],
};

const byBirth = (a, b) => (a.dob || '9999').localeCompare(b.dob || '9999');
const uniq = (list) => [...new Map(list.map((p) => [p.id, p])).values()];

export class FamilyModel {
  constructor() {
    this.title = 'Family Tree';
    this.people = [];
    this.byId = new Map();
    this.childIndex = new Map();
    this.genCache = new Map();
  }

  /* ---------- loading ---------- */

  async load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${url} (HTTP ${res.status})`);
    return this.loadFromObject(await res.json());
  }

  loadFromObject(data) {
    this.title = data.title || 'Family Tree';
    this.people = Array.isArray(data.people) ? data.people : [];
    this.byId = new Map(this.people.map((p) => [p.id, p]));
    this.childIndex = new Map();
    for (const p of this.people) {
      for (const parentId of [p.fatherId, p.motherId]) {
        if (!parentId) continue;
        if (!this.childIndex.has(parentId)) this.childIndex.set(parentId, []);
        this.childIndex.get(parentId).push(p.id);
      }
    }
    this.genCache = new Map();
    return this;
  }

  /* ---------- direct relations ---------- */

  getById(id) {
    return this.byId.get(id) ?? null;
  }

  getFather(id) {
    const p = this.getById(id);
    return p?.fatherId ? this.getById(p.fatherId) : null;
  }

  getMother(id) {
    const p = this.getById(id);
    return p?.motherId ? this.getById(p.motherId) : null;
  }

  getParents(id) {
    return [this.getFather(id), this.getMother(id)].filter(Boolean);
  }

  /** Returns [{ person, status }] - status is married / divorced / widowed. */
  getSpouses(id) {
    return (this.getById(id)?.spouses ?? [])
      .map((s) => ({ person: this.getById(s.id), status: s.status || 'married' }))
      .filter((s) => s.person);
  }

  /** Children are derived: anyone whose fatherId or motherId points at this person. */
  getChildren(id) {
    return (this.childIndex.get(id) ?? []).map((cid) => this.getById(cid)).filter(Boolean).sort(byBirth);
  }

  getSiblings(id) {
    const found = this.getParents(id).flatMap((parent) => this.getChildren(parent.id));
    return uniq(found).filter((p) => p.id !== id).sort(byBirth);
  }

  getGrandparents(id) {
    return uniq(this.getParents(id).flatMap((p) => this.getParents(p.id)));
  }

  getAuntsUncles(id) {
    return uniq(this.getParents(id).flatMap((p) => this.getSiblings(p.id))).sort(byBirth);
  }

  getCousins(id) {
    return uniq(this.getAuntsUncles(id).flatMap((a) => this.getChildren(a.id))).sort(byBirth);
  }

  getAncestors(id) {
    const out = new Set();
    const walk = (x) => {
      for (const p of this.getParents(x)) {
        if (!out.has(p.id)) {
          out.add(p.id);
          walk(p.id);
        }
      }
    };
    walk(id);
    return out;
  }

  getDescendants(id) {
    const out = new Set();
    const walk = (x) => {
      for (const c of this.getChildren(x)) {
        if (!out.has(c.id)) {
          out.add(c.id);
          walk(c.id);
        }
      }
    };
    walk(id);
    return out;
  }

  /** Blood relatives with no recorded parents - the tops of the tree. */
  getRoots() {
    return this.people.filter((p) => !p.fatherId && !p.motherId && !p.isInLaw).sort(byBirth);
  }

  /* ---------- generations & ages ---------- */

  /** 0 = eldest generation. In-laws take the generation of their spouse. */
  generationOf(id, visiting = new Set()) {
    if (this.genCache.has(id)) return this.genCache.get(id);
    if (visiting.has(id)) return 0;
    visiting.add(id);

    let gen = 0;
    const parents = this.getParents(id);
    if (parents.length) {
      gen = 1 + Math.max(...parents.map((p) => this.generationOf(p.id, visiting)));
    } else {
      const mates = this.getSpouses(id)
        .map((s) => s.person)
        .filter((s) => s.fatherId || s.motherId);
      if (mates.length) gen = Math.max(...mates.map((m) => this.generationOf(m.id, visiting)));
    }
    this.genCache.set(id, gen);
    return gen;
  }

  generationCount() {
    return this.people.length ? Math.max(...this.people.map((p) => this.generationOf(p.id))) + 1 : 0;
  }

  isAlive(person) {
    return !person.dateOfDeath;
  }

  ageOf(person, today = new Date()) {
    const born = parseDate(person.dob);
    if (!born) return null;
    const end = person.dateOfDeath ? parseDate(person.dateOfDeath) : today;
    let age = end.getFullYear() - born.getFullYear();
    const m = end.getMonth() - born.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < born.getDate())) age -= 1;
    return age;
  }

  /* ---------- search & filtering ---------- */

  distinct(field) {
    return [...new Set(this.people.map((p) => p[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  /**
   * criteria: q, gender, status (alive|deceased), generation, address,
   * bloodGroup, profession, membership (blood|inlaw). Empty values are ignored.
   */
  filter(c = {}) {
    const q = (c.q || '').trim().toLowerCase();
    const hasGen = c.generation !== undefined && c.generation !== null && c.generation !== '';
    return this.people.filter((p) => {
      if (q && ![p.name, p.profession, p.address].some((v) => (v || '').toLowerCase().includes(q))) return false;
      if (c.gender && p.gender !== c.gender) return false;
      if (c.status === 'alive' && p.dateOfDeath) return false;
      if (c.status === 'deceased' && !p.dateOfDeath) return false;
      if (hasGen && this.generationOf(p.id) !== Number(c.generation)) return false;
      if (c.address && p.address !== c.address) return false;
      if (c.bloodGroup && p.bloodGroup !== c.bloodGroup) return false;
      if (c.profession && p.profession !== c.profession) return false;
      if (c.membership === 'blood' && p.isInLaw) return false;
      if (c.membership === 'inlaw' && !p.isInLaw) return false;
      return true;
    });
  }

  sort(list, key = 'name') {
    const copy = [...list];
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      oldest: byBirth,
      youngest: (a, b) => byBirth(b, a),
      generation: (a, b) => this.generationOf(a.id) - this.generationOf(b.id) || byBirth(a, b),
    };
    return copy.sort(sorters[key] ?? sorters.name);
  }

  /* ---------- statistics ---------- */

  countBy(fn) {
    const counts = new Map();
    for (const p of this.people) {
      const key = fn(p);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  stats(today = new Date()) {
    const living = this.people.filter((p) => this.isAlive(p));
    const ages = living.map((p) => this.ageOf(p, today)).filter((a) => a !== null);
    const withAge = living.filter((p) => p.dob).sort(byBirth);
    const couples = new Set();
    for (const p of this.people) for (const s of p.spouses ?? []) couples.add([p.id, s.id].sort().join('+'));
    const gens = this.generationCount();

    return {
      total: this.people.length,
      living: living.length,
      deceased: this.people.length - living.length,
      generations: gens,
      couples: couples.size,
      averageAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null,
      oldestLiving: withAge[0] ?? null,
      youngest: withAge[withAge.length - 1] ?? null,
      byGeneration: Array.from({ length: gens }, (_, g) => [
        `Generation ${g + 1}`,
        this.people.filter((p) => this.generationOf(p.id) === g).length,
      ]),
      byDecade: this.countBy((p) => (p.dob ? `${Math.floor(Number(p.dob.slice(0, 4)) / 10) * 10}s` : null)).sort((a, b) =>
        a[0].localeCompare(b[0])
      ),
      byGender: this.countBy((p) => p.gender),
      byBloodGroup: this.countBy((p) => p.bloodGroup),
      byProfession: this.countBy((p) => p.profession),
      byAddress: this.countBy((p) => p.address),
    };
  }

  /** Living people sorted by how soon their next birthday is. */
  upcomingBirthdays(limit = 6, today = new Date()) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return this.people
      .filter((p) => this.isAlive(p) && p.dob)
      .map((p) => {
        const born = parseDate(p.dob);
        let next = new Date(start.getFullYear(), born.getMonth(), born.getDate());
        if (next < start) next = new Date(start.getFullYear() + 1, born.getMonth(), born.getDate());
        return {
          person: p,
          date: next,
          days: Math.round((next - start) / 86400000),
          turning: next.getFullYear() - born.getFullYear(),
        };
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, limit);
  }

  /* ---------- relationship finder ---------- */

  neighbours(id) {
    return [
      ...this.getParents(id).map((p) => ({ id: p.id, type: 'P' })),
      ...this.getChildren(id).map((p) => ({ id: p.id, type: 'C' })),
      ...this.getSpouses(id).map((s) => ({ id: s.person.id, type: 'S' })),
    ];
  }

  /**
   * Shortest chain of parent/child/spouse links from A to B (breadth-first search).
   * `label` says what B is to A (e.g. "Aunt"), or null if the pair is too distant to name.
   */
  relationship(aId, bId) {
    const a = this.getById(aId);
    const b = this.getById(bId);
    if (!a || !b) return null;
    if (aId === bId) return { a, b, same: true, path: [a], types: [], label: null };

    const prev = new Map([[aId, null]]);
    const queue = [aId];
    while (queue.length && !prev.has(bId)) {
      const cur = queue.shift();
      for (const { id, type } of this.neighbours(cur)) {
        if (!prev.has(id)) {
          prev.set(id, { from: cur, type });
          queue.push(id);
        }
      }
    }
    if (!prev.has(bId)) return { a, b, path: [], types: [], label: null, connected: false };

    const path = [];
    const types = [];
    let cur = bId;
    for (;;) {
      path.unshift(this.getById(cur));
      const step = prev.get(cur);
      if (!step) break;
      types.unshift(step.type);
      cur = step.from;
    }
    const pair = RELATION_LABELS[types.join('')];
    const label = pair ? (b.gender === 'female' ? pair[1] : pair[0]) : null;
    return { a, b, path, types, label, connected: true };
  }
}

/** Word for "what Y is to X" for a single parent/child/spouse step, used to caption path steps. */
export function stepLabel(type, gender) {
  const pair = RELATION_LABELS[type];
  return pair ? (gender === 'female' ? pair[1] : pair[0]) : '';
}
