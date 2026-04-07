'use strict';
const { parseGedcom } = require('./gedcom');
const { parseGrampsXml } = require('./gramps-xml');
const { parseGenericXml } = require('./generic-xml');
const { normalise } = require('./normalise');

function detectFormat(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'ged') return 'gedcom';
  if (ext === 'gramps') return 'gramps';
  return 'xml';
}

async function runImport(db, text, format, genericMapping = null) {
  let raw;
  if (format === 'gedcom') raw = parseGedcom(text);
  else if (format === 'gramps') raw = await parseGrampsXml(text);
  else raw = await parseGenericXml(text, genericMapping || {});

  const { persons, relationships, sources } = normalise(raw);

  const wipe = db.transaction(() => {
    db.prepare('DELETE FROM annotations').run();
    db.prepare('DELETE FROM roles').run();
    db.prepare('DELETE FROM relationships').run();
    db.prepare('DELETE FROM sources').run();
    db.prepare('DELETE FROM persons').run();
  });
  wipe();

  const insertPerson = db.prepare(`
    INSERT INTO persons (id, given_name, surname, name_prefix, name_suffix, sex,
      birth_year, birth_date, birth_place, death_year, death_date, death_place, notes)
    VALUES (@id, @given_name, @surname, @name_prefix, @name_suffix, @sex,
      @birth_year, @birth_date, @birth_place, @death_year, @death_date, @death_place, @notes)
  `);
  const insertRole = db.prepare('INSERT INTO roles (person_id, label) VALUES (?, ?)');
  const insertRel = db.prepare(
    'INSERT INTO relationships (person_a_id, person_b_id, type) VALUES (?, ?, ?)'
  );
  const insertSource = db.prepare(
    'INSERT OR IGNORE INTO sources (id, title, citation) VALUES (?, ?, ?)'
  );

  const doImport = db.transaction(() => {
    for (const p of persons) {
      insertPerson.run({
        id: p.id,
        given_name: p.givenName || '',
        surname: p.surname || '',
        name_prefix: p.namePrefix || '',
        name_suffix: p.nameSuffix || '',
        sex: p.sex || 'U',
        birth_year: p.birthYear || null,
        birth_date: p.birthDate || '',
        birth_place: p.birthPlace || '',
        death_year: p.deathYear || null,
        death_date: p.deathDate || '',
        death_place: p.deathPlace || '',
        notes: p.notes || '',
      });
      for (const role of (p.roles || [])) {
        insertRole.run(p.id, role);
      }
    }
    for (const r of relationships) {
      insertRel.run(r.personAId, r.personBId, r.type);
    }
    for (const s of sources) {
      if (s.id) insertSource.run(s.id, s.title || '', s.citation || '');
    }
  });
  doImport();

  db.prepare("INSERT OR REPLACE INTO dataset_meta (key, value) VALUES ('imported_at', datetime('now'))").run();
  db.prepare("INSERT OR REPLACE INTO dataset_meta (key, value) VALUES ('import_format', ?)").run(format);
}

module.exports = { detectFormat, runImport };
