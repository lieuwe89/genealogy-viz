'use strict';
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const { initDb } = require('./db');
const { mountAuth, requireAdmin, ensureAdminExists } = require('./auth');
const { detectFormat, runImport } = require('./import/index');
const graphRouter = require('./api/graph');
const personsRouter = require('./api/persons');
const relsRouter = require('./api/relationships');
const annotationsRouter = require('./api/annotations');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const db = initDb(process.env.DB_PATH || './data/genealogy.db');
app.locals.db = db;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true },
}));

ensureAdminExists(db).catch(console.error);
mountAuth(app);

app.use('/api/graph', graphRouter);
app.use('/api/persons', personsRouter);
app.use('/api/relationships', relsRouter);
app.use('/api/annotations', annotationsRouter);

app.post('/admin/import', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const format = detectFormat(req.file.originalname);
  let mapping = null;
  if (format === 'xml' && req.body.mapping) {
    try { mapping = JSON.parse(req.body.mapping); } catch (e) {
      return res.status(400).json({ error: 'Invalid mapping JSON' });
    }
  }
  try {
    const text = req.file.buffer.toString('utf-8');
    await runImport(db, text, format, mapping);
    res.json({ ok: true, format, personsImported: db.prepare('SELECT COUNT(*) as n FROM persons').get().n });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Genealogy viz running on http://localhost:${PORT}`));

module.exports = app;
