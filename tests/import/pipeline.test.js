const { initDb } = require('../../server/db');
const { runImport } = require('../../server/import/index');
const fs = require('fs');
const path = require('path');

const GEDCOM = `
0 HEAD
0 @I0001@ INDI
1 NAME Wicher /Wichers/
2 GIVN Wicher
2 SURN Wichers
1 SEX M
1 BIRT
2 DATE 1719
1 FACT Governor of Surinam
2 TYPE Role
0 @I0002@ INDI
1 NAME Elizabeth /Trip/
2 GIVN Elizabeth
2 SURN Trip
1 SEX F
1 BIRT
2 DATE 1687
0 @F0001@ FAM
1 HUSB @I0001@
1 WIFE @I0002@
0 TRLR
`.trim();

test('runImport writes persons and relationships to DB', async () => {
  const db = initDb(':memory:');
  await runImport(db, GEDCOM, 'gedcom');
  const persons = db.prepare('SELECT * FROM persons').all();
  expect(persons).toHaveLength(2);
  const rels = db.prepare('SELECT * FROM relationships').all();
  expect(rels.some(r => r.type === 'spouse')).toBe(true);
});

test('runImport writes roles', async () => {
  const db = initDb(':memory:');
  await runImport(db, GEDCOM, 'gedcom');
  const roles = db.prepare('SELECT * FROM roles').all();
  expect(roles).toHaveLength(1);
  expect(roles[0].label).toBe('Governor of Surinam');
});

test('runImport is idempotent (re-import replaces data)', async () => {
  const db = initDb(':memory:');
  await runImport(db, GEDCOM, 'gedcom');
  await runImport(db, GEDCOM, 'gedcom');
  const persons = db.prepare('SELECT * FROM persons').all();
  expect(persons).toHaveLength(2);
});
