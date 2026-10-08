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

test('re-import keeps annotations of persons that are still in the dataset', async () => {
  const db = initDb(':memory:');
  await runImport(db, GEDCOM, 'gedcom');
  db.prepare("INSERT INTO annotations (person_id, content) VALUES ('@I0001@', 'kept')").run();
  db.prepare("INSERT INTO annotations (person_id, content) VALUES ('@I0002@', 'gone')").run();
  const withoutTrip = GEDCOM.split('0 @I0002@')[0] + '0 TRLR';
  await runImport(db, withoutTrip, 'gedcom');
  const notes = db.prepare('SELECT content FROM annotations').all().map(a => a.content);
  expect(notes).toEqual(['kept']);
  expect(db.prepare('SELECT COUNT(*) AS n FROM persons').get().n).toBe(1);
});

test('annotations of a person merged in Gramps move to the person that stayed', async () => {
  const { initDb } = require('../../server/db');
  const { runImport } = require('../../server/import/index');
  const person = (id, extra = '') => `<person handle="h${id}" id="${id}"><gender>F</gender><name type="Birth Name"><first>Clara</first><surname>Buttingha</surname></name>${extra}</person>`;
  const xml = people => `<?xml version="1.0" encoding="UTF-8"?><database><people>${people}</people></database>`;
  const db = initDb(':memory:');
  await runImport(db, xml(person('I0142') + person('I0506')), 'gramps');
  db.prepare("INSERT INTO annotations (person_id, content, url) VALUES ('I0506', 'portret', 'https://example.org/p')").run();
  db.prepare("INSERT INTO annotations (person_id, content, url) VALUES ('I0506', 'notitie', '')").run();
  await runImport(db, xml(person('I0142', '<attribute type="Verrijking-samengevoegd-persoon" value="I0506 Clara Nicolaasdr. van Buttingha"/>')), 'gramps');
  expect(db.prepare('SELECT person_id, content FROM annotations ORDER BY content').all())
    .toEqual([{ person_id: 'I0142', content: 'notitie' }, { person_id: 'I0142', content: 'portret' }]);
  // a later person who gets the freed id I0506 does not lose annotations to the old merge
  await runImport(db, xml(person('I0142', '<attribute type="Verrijking-samengevoegd-persoon" value="I0506 x"/>') + person('I0506')), 'gramps');
  db.prepare("INSERT INTO annotations (person_id, content, url) VALUES ('I0506', 'nieuw', '')").run();
  await runImport(db, xml(person('I0142', '<attribute type="Verrijking-samengevoegd-persoon" value="I0506 x"/>') + person('I0506')), 'gramps');
  expect(db.prepare("SELECT person_id FROM annotations WHERE content = 'nieuw'").get().person_id).toBe('I0506');
});
