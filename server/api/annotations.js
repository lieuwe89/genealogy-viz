'use strict';
const { Router } = require('express');
const { requireAdmin } = require('../auth');
const router = Router();

router.post('/', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const { person_id, content = '', url = '', url_label = '' } = req.body;
  if (!person_id) return res.status(400).json({ error: 'person_id required' });
  const result = db.prepare(
    'INSERT INTO annotations (person_id, content, url, url_label) VALUES (?, ?, ?, ?)'
  ).run(person_id, content, url, url_label);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const { content, url, url_label } = req.body;
  db.prepare(`
    UPDATE annotations SET content = ?, url = ?, url_label = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(content ?? '', url ?? '', url_label ?? '', req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  db.prepare('DELETE FROM annotations WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
