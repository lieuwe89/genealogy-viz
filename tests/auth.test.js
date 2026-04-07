const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { initDb } = require('../server/db');
const { mountAuth, requireAdmin, ensureAdminExists } = require('../server/auth');

function buildApp(db) {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  app.locals.db = db;
  mountAuth(app);
  app.get('/protected', requireAdmin, (req, res) => res.json({ ok: true }));
  return app;
}

let app, db;
beforeEach(async () => {
  process.env.ADMIN_PASSWORD = 'testpass';
  db = initDb(':memory:');
  await ensureAdminExists(db);
  app = buildApp(db);
});

test('POST /admin/login with correct password sets session', async () => {
  const res = await request(app)
    .post('/admin/login')
    .send({ password: 'testpass' });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
});

test('POST /admin/login with wrong password returns 401', async () => {
  const res = await request(app)
    .post('/admin/login')
    .send({ password: 'wrong' });
  expect(res.status).toBe(401);
});

test('requireAdmin blocks unauthenticated request', async () => {
  const res = await request(app).get('/protected');
  expect(res.status).toBe(401);
});

test('requireAdmin allows authenticated request', async () => {
  const agent = request.agent(app);
  await agent.post('/admin/login').send({ password: 'testpass' });
  const res = await agent.get('/protected');
  expect(res.status).toBe(200);
});
