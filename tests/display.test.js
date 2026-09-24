'use strict';
global.window = {};
require('../public/js/rel-path.js');
require('../public/js/overlap-logic.js');
const { formatGedDate, relationKind, relationLabel } = window.RelPath;
const { estimateBirthYears } = window.OverlapLogic;

const t = k => ({ date_about: 'ca.', date_before: 'vóór', date_after: 'na', relation_parent_f: 'moeder' }[k] || k);

test('formatGedDate translates GEDCOM qualifiers', () => {
  expect(formatGedDate('ABT 1676', t)).toBe('ca. 1676');
  expect(formatGedDate('BEF 1694', t)).toBe('vóór 1694');
  expect(formatGedDate('AFT 1646', t)).toBe('na 1646');
  expect(formatGedDate('BET 1600 AND 1610', t)).toBe('1600–1610');
  expect(formatGedDate('1695', t)).toBe('1695');
  expect(formatGedDate(null, t)).toBe('');
});

test('relationKind reads parent-child direction (person_a = parent)', () => {
  expect(relationKind({ type: 'parent-child', person_a_id: 'P', person_b_id: 'C' }, 'P')).toBe('child');
  expect(relationKind({ type: 'parent-child', person_a_id: 'P', person_b_id: 'C' }, 'C')).toBe('parent');
  expect(relationKind({ type: 'spouse', person_a_id: 'A', person_b_id: 'B' }, 'A')).toBe('spouse');
  expect(relationLabel('parent', 'F', t)).toBe('moeder');
});

test('estimateBirthYears guesses from relatives and propagates along chains', () => {
  const g = {
    nodes: [
      { id: 'dad', birthYear: 1700 },
      { id: 'kid' },                  // child of dad → 1728
      { id: 'grandkid' },             // child of kid → 1756 (via estimate)
      { id: 'wife' },                 // spouse of dad → 1700
      { id: 'dead', deathYear: 1800 }, // only death year → 1740
      { id: 'alone' },                // no relatives → no estimate
    ],
    links: [
      { type: 'parent-child', source: 'dad', target: 'kid' },
      { type: 'parent-child', source: 'kid', target: 'grandkid' },
      { type: 'spouse', source: 'dad', target: 'wife' },
    ],
  };
  const e = estimateBirthYears(g);
  expect(e.get('kid')).toBe(1728);
  expect(e.get('grandkid')).toBe(1756);
  expect(e.get('wife')).toBe(1700);
  expect(e.get('dead')).toBe(1740);
  expect(e.has('alone')).toBe(false);
  expect(e.has('dad')).toBe(false);
});
