const request = require('supertest');
const path = require('path');

// Set DB_PATH to in-memory before requiring the app
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_PASSWORD = 'test-pass';

const app = require('../server/index');

describe('Route prefix /genealogy-viz', () => {
  test('GET / returns 200 with gallery HTML', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('playground');
  });

  test('GET /genealogy-viz returns 200 with visualiser HTML', async () => {
    const res = await request(app).get('/genealogy-viz');
    expect(res.status).toBe(200);
    expect(res.text).toContain('3d-force-graph');
  });

  test('GET /genealogy-viz/api/graph returns JSON', async () => {
    const res = await request(app).get('/genealogy-viz/api/graph');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  test('GET /genealogy-viz/admin redirects to login when not authenticated', async () => {
    const res = await request(app).get('/genealogy-viz/admin');
    expect([302, 401]).toContain(res.status);
  });
});
