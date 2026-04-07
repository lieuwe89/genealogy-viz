const { initDb } = require('../server/db');

test('creates all required tables', () => {
  const db = initDb(':memory:');
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map(r => r.name);

  expect(tables).toEqual(expect.arrayContaining([
    'persons', 'roles', 'relationships', 'annotations', 'sources', 'dataset_meta', 'settings'
  ]));
});

test('initDb is idempotent', () => {
  const db = initDb(':memory:');
  expect(() => initDb(':memory:')).not.toThrow();
});
