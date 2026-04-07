const request = require('supertest');
const express = require('express');
const { initDb } = require('../../server/db');
const { runImport } = require('../../server/import/index');
const graphRouter = require('../../server/api/graph');

const GEDCOM = `
0 HEAD
0 @I0001@ INDI
1 NAME Wicher /Wichers/
2 GIVN Wicher
2 SURN Wichers
1 SEX M
1 BIRT
2 DATE 1719
1 FACT Governor
2 TYPE Role
0 @I0002@ INDI
1 NAME Elizabeth /Trip/
2 GIVN Elizabeth
2 SURN Trip
1 SEX F
1 BIRT
2 DATE 1687
0 @F0001@ FAM
1 HUSB @I0001@
1 WIFE @I0002@
0 TRLR
`.trim();

let app, db;
beforeEach(async () => {
  db = initDb(':memory:');
  await runImport(db, GEDCOM, 'gedcom');
  app = express();
  app.locals.db = db;
  app.use('/api/graph', graphRouter);
});

test('GET /api/graph returns nodes and links', async () => {
  const res = await request(app).get('/api/graph');
  expect(res.status).toBe(200);
  expect(res.body.nodes).toHaveLength(2);
  expect(res.body.links).toHaveLength(1);
});

test('nodes include birthYear, sex, roles, name', async () => {
  const res = await request(app).get('/api/graph');
  const node = res.body.nodes.find(n => n.id === '@I0001@');
  expect(node.birthYear).toBe(1719);
  expect(node.sex).toBe('M');
  expect(node.roles).toContain('Governor');
  expect(node.name).toContain('Wicher');
});
