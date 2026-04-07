'use strict';
const { Router } = require('express');
const { requireAdmin } = require('../auth');
const router = Router();

const ALLOWED_FIELDS = [
  'given_name', 'surname', 'name_prefix', 'name_suffix', 'sex',
  'birth_year', 'birth_date', 'birth_place',
  'death_year', 'death_date', 'death_place', 'notes',
];

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).json({ error: 'Not found' });

  const roles = db.prepare('SELECT * FROM roles WHERE person_id = ?').all(req.params.id);
  const annotations = db.prepare('SELECT * FROM annotations WHERE person_id = ?').all(req.params.id);
  const rels = db.prepare(`
    SELECT r.*, p.given_name, p.surname, p.name_prefix
    FROM relationships r
    JOIN persons p ON (
      CASE WHEN r.person_a_id = ? THEN r.person_b_id ELSE r.person_a_id END = p.id
    )
    WHERE r.person_a_id = ? OR r.person_b_id = ?
  `).all(req.params.id, req.params.id, req.params.id);
  const sources = db.prepare(`
    SELECT s.* FROM sources s
    JOIN persons p ON p.id = ?
  `).all(req.params.id);

  res.json({ ...person, roles, annotations, relationships: rels, sources });
});

router.post('/', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const { id, given_name = '', surname = '', name_prefix = '', name_suffix = '',
    sex = 'U', birth_year = null, birth_date = '', birth_place = '',
    death_year = null, death_date = '', death_place = '', notes = '' } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });
  db.prepare(`
    INSERT INTO persons (id, given_name, surname, name_prefix, name_suffix, sex,
      birth_year, birth_date, birth_place, death_year, death_date, death_place, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, given_name, surname, name_prefix, name_suffix, sex,
    birth_year, birth_date, birth_place, death_year, death_date, death_place, notes);
  res.status(201).json({ ok: true });
});

router.put('/:id', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => ALLOWED_FIELDS.includes(k))
  );
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });

  const sets = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE persons SET ${sets}, updated_at = datetime('now') WHERE id = @id`)
    .run({ ...updates, id: req.params.id });
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  db.prepare('DELETE FROM persons WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/roles', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const { label } = req.body;
  if (!label) return res.status(400).json({ error: 'label required' });
  const result = db.prepare('INSERT INTO roles (person_id, label) VALUES (?, ?)').run(req.params.id, label);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id/roles/:roleId', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  db.prepare('DELETE FROM roles WHERE id = ? AND person_id = ?').run(req.params.roleId, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
