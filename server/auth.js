'use strict';
const bcrypt = require('bcrypt');

async function ensureAdminExists(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").get();
  if (!row) {
    const password = process.env.ADMIN_PASSWORD || 'changeme';
    const hash = await bcrypt.hash(password, 12);
    db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password_hash', ?)").run(hash);
  }
}

function mountAuth(app) {
  app.post('/admin/login', async (req, res) => {
    const { password } = req.body;
    const db = req.app.locals.db;
    const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").get();
    if (!row) return res.status(500).json({ error: 'Admin not configured' });
    const match = await bcrypt.compare(password, row.value);
    if (!match) return res.status(401).json({ error: 'Invalid password' });
    req.session.isAdmin = true;
    res.json({ ok: true });
  });

  app.post('/admin/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get('/admin/session', (req, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
  });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorised' });
}

module.exports = { mountAuth, requireAdmin, ensureAdminExists };
