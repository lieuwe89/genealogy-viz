const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { initDb } = require('../../server/db');
const { runImport } = require('../../server/import/index');
const { mountAuth, ensureAdminExists } = require('../../server/auth');
const personsRouter = require('../../server/api/persons');

const GEDCOM = `
0 HEAD
0 @I0001@ INDI
1 NAME Wicher /Wichers/
2 GIVN Wicher
2 SURN Wichers
1 SEX M
1 BIRT
2 DATE 1719
0 TRLR
`.trim();

let app, db, agent;
beforeEach(async () => {
  process.env.ADMIN_PASSWORD = 'testpass';
  db = initDb(':memory:');
  await runImport(db, GEDCOM, 'gedcom');
  await ensureAdminExists(db);
  app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  app.locals.db = db;
  mountAuth(app);
  app.use('/api/persons', personsRouter);
  agent = request.agent(app);
  await agent.post('/admin/login').send({ password: 'testpass' });
});

test('GET /api/persons/:id returns full person', async () => {
  const res = await request(app).get('/api/persons/@I0001@');
  expect(res.status).toBe(200);
  expect(res.body.given_name).toBe('Wicher');
  expect(res.body.annotations).toEqual([]);
});

test('PUT /api/persons/:id updates fields (admin only)', async () => {
  const res = await agent.put('/api/persons/@I0001@').send({ given_name: 'Willem' });
  expect(res.status).toBe(200);
  const check = db.prepare('SELECT given_name FROM persons WHERE id = ?').get('@I0001@');
  expect(check.given_name).toBe('Willem');
});

test('PUT /api/persons/:id blocked without auth', async () => {
  const res = await request(app).put('/api/persons/@I0001@').send({ given_name: 'Willem' });
  expect(res.status).toBe(401);
});

test('POST /api/persons creates a new person (admin only)', async () => {
  const res = await agent.post('/api/persons').send({
    id: 'NEW001', given_name: 'Anna', surname: 'Smit', sex: 'F',
  });
  expect(res.status).toBe(201);
  const check = db.prepare('SELECT * FROM persons WHERE id = ?').get('NEW001');
  expect(check.given_name).toBe('Anna');
});
