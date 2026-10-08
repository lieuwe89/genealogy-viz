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

  // Persons are upserted, not wiped: annotations made in the CRM hang on person ids (Gramps ids are
  // stable) and would otherwise be lost through ON DELETE CASCADE. Only persons that left the dataset go.
  const keep = new Set(persons.map(p => String(p.id)));
  const wipe = db.transaction(() => {
    db.prepare('DELETE FROM roles').run();
    db.prepare('DELETE FROM relationships').run();
    db.prepare('DELETE FROM sources').run();
  });
  wipe();

  const insertPerson = db.prepare(`
    INSERT INTO persons (id, given_name, surname, name_prefix, name_suffix, sex,
      birth_year, birth_date, birth_place, death_year, death_date, death_place, notes)
    VALUES (@id, @given_name, @surname, @name_prefix, @name_suffix, @sex,
      @birth_year, @birth_date, @birth_place, @death_year, @death_date, @death_place, @notes)
    ON CONFLICT(id) DO UPDATE SET given_name = excluded.given_name, surname = excluded.surname,
      name_prefix = excluded.name_prefix, name_suffix = excluded.name_suffix, sex = excluded.sex,
      birth_year = excluded.birth_year, birth_date = excluded.birth_date, birth_place = excluded.birth_place,
      death_year = excluded.death_year, death_date = excluded.death_date, death_place = excluded.death_place,
      notes = excluded.notes, updated_at = datetime('now')
  `);
  const insertRole = db.prepare('INSERT INTO roles (person_id, label, kind, year_from, year_to) VALUES (?, ?, ?, ?, ?)');
  const insertRel = db.prepare(
    'INSERT INTO relationships (person_a_id, person_b_id, type, label) VALUES (?, ?, ?, ?)'
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
        // GEDCOM/generic parsers give plain strings, the Gramps parser { label, kind, yearFrom, yearTo }
        const r = typeof role === 'string' ? { label: role, kind: 'role' } : role;
        insertRole.run(p.id, r.label, r.kind || 'role', r.yearFrom || null, r.yearTo || null);
      }
    }
    for (const r of relationships) {
      insertRel.run(r.personAId, r.personBId, r.type, r.label || '');
    }
    for (const s of sources) {
      if (s.id) insertSource.run(s.id, s.title || '', s.citation || '');
    }
  });
  doImport();

  // Persons merged in Gramps hand their annotations to the person that stayed, before the merged-away ids are
  // deleted. Once per merge: Gramps may later reuse a freed id for someone else. On the first import with this
  // logic all merges present are taken as already handled (they were fixed by hand before).
  const meta = db.prepare("SELECT value FROM dataset_meta WHERE key = 'merges_done'").get();
  const done = new Set(meta ? JSON.parse(meta.value) : []);
  const moveNotes = db.prepare(`UPDATE annotations SET person_id = ? WHERE person_id = ? AND NOT (COALESCE(url, '') <> ''
    AND EXISTS (SELECT 1 FROM annotations b WHERE b.person_id = ? AND b.url = annotations.url))`);
  const finish = db.transaction(() => {
    for (const p of persons) {
      for (const old of p.mergedFrom || []) {
        const key = `${old}>${p.id}`;
        if (!done.has(key) && meta) moveNotes.run(String(p.id), old, String(p.id));
        done.add(key);
      }
    }
    db.prepare("INSERT OR REPLACE INTO dataset_meta (key, value) VALUES ('merges_done', ?)").run(JSON.stringify([...done]));
    const del = db.prepare('DELETE FROM persons WHERE id = ?');
    for (const { id } of db.prepare('SELECT id FROM persons').all()) {
      if (!keep.has(String(id))) del.run(id);
    }
  });
  finish();

  db.prepare("INSERT OR REPLACE INTO dataset_meta (key, value) VALUES ('imported_at', datetime('now'))").run();
  db.prepare("INSERT OR REPLACE INTO dataset_meta (key, value) VALUES ('import_format', ?)").run(format);
}

module.exports = { detectFormat, runImport };
