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

const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});
app.locals.imageUpload = imageUpload;

const db = initDb(process.env.DB_PATH || './data/genealogy.db');
app.locals.db = db;

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true },
}));

ensureAdminExists(db).catch(console.error);

// ── /genealogy-viz subrouter ──────────────────────────────────────────────────
const vizRouter = express.Router();

mountAuth(vizRouter);

vizRouter.use('/api/graph', graphRouter);
vizRouter.use('/api/persons', personsRouter);
vizRouter.use('/api/relationships', relsRouter);
vizRouter.use('/api/annotations', annotationsRouter);

vizRouter.post('/admin/import', requireAdmin, upload.single('file'), async (req, res) => {
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

vizRouter.get('/admin/export', requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const persons = db.prepare('SELECT * FROM persons').all();
  const relationships = db.prepare('SELECT * FROM relationships').all();
  const roles = db.prepare('SELECT * FROM roles').all();
  const annotations = db.prepare('SELECT * FROM annotations').all();
  const sources = db.prepare('SELECT * FROM sources').all();
  const datasetMeta = db.prepare('SELECT * FROM dataset_meta').all();
  const exportDate = new Date().toISOString();
  const dateStr = exportDate.slice(0, 10);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="genealogy-export-${dateStr}.json"`);
  res.json({ exportDate, persons, relationships, roles, annotations, sources, datasetMeta });
});

// Serve admin SPA under /genealogy-viz/admin (login handled client-side)
vizRouter.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

vizRouter.use(express.static(path.join(__dirname, "../public")));
vizRouter.get("/", (req, res) => { res.sendFile(path.join(__dirname, "../public/app.html")); });// Serve visualiser HTML at /genealogy-viz

app.use('/genealogy-viz', vizRouter);

// ── Root: gallery landing page ────────────────────────────────────────────────
// Explicit route only — no root-level static() to prevent bypassing auth on /admin
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/app.html'));
});

// Export for testing; caller does app.listen()
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Genealogy viz running on http://localhost:${PORT}`));
}
