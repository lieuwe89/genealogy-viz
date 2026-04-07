'use strict';
const { Router } = require('express');
const { requireAdmin } = require('../auth');
const router = Router();

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  res.json(db.prepare('SELECT * FROM relationships').all());
});

router.post('/', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const { person_a_id, person_b_id, type = 'custom' } = req.body;
  if (!person_a_id || !person_b_id) return res.status(400).json({ error: 'person_a_id and person_b_id required' });
  const result = db.prepare(
    'INSERT INTO relationships (person_a_id, person_b_id, type) VALUES (?, ?, ?)'
  ).run(person_a_id, person_b_id, type);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  db.prepare('DELETE FROM relationships WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
