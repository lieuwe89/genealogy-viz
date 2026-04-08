'use strict';
const path = require('path');
const fs = require('fs');
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
  const annotation = db.prepare('SELECT image_path FROM annotations WHERE id = ?').get(req.params.id);
  if (annotation && annotation.image_path) {
    const uploadsDir = path.resolve(__dirname, '../../public/uploads');
    const filePath = path.resolve(__dirname, '../../public', annotation.image_path);
    if (filePath.startsWith(uploadsDir + path.sep)) fs.unlink(filePath, () => {});
  }
  db.prepare('DELETE FROM annotations WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads');

function safeUnlink(imagePath) {
  if (!imagePath) return;
  const filePath = path.resolve(__dirname, '../../public', imagePath);
  if (filePath.startsWith(UPLOADS_DIR + path.sep)) fs.unlink(filePath, () => {});
}

router.post('/:id/image', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(req.params.id);
  if (!annotation) return res.status(404).json({ error: 'Annotation not found' });

  req.app.locals.imageUpload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    safeUnlink(annotation.image_path);

    const imagePath = `uploads/${req.file.filename}`;
    const caption = req.body.caption || '';
    db.prepare(`UPDATE annotations SET image_path = ?, image_caption = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(imagePath, caption, req.params.id);
    res.json({ ok: true, image_path: imagePath });
  });
});

router.delete('/:id/image', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(req.params.id);
  if (!annotation) return res.status(404).json({ error: 'Annotation not found' });

  safeUnlink(annotation.image_path);
  db.prepare(`UPDATE annotations SET image_path = '', image_caption = '', updated_at = datetime('now') WHERE id = ?`)
    .run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
