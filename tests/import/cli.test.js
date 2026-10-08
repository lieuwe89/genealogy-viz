const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { main } = require('../../server/import/cli');
const { initDb } = require('../../server/db');

const XML = `<?xml version="1.0" encoding="UTF-8"?><database><people>
<person handle="h1" id="I0001"><gender>M</gender><name type="Birth Name"><first>Wicher</first><surname>Wichers</surname></name></person>
</people></database>`;

test('cli imports a gzipped .gramps file, backs up first and keeps annotations', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-cli-'));
  process.env.DB_PATH = path.join(dir, 'genealogy.db');
  const file = path.join(dir, 'tree.gramps');
  fs.writeFileSync(file, zlib.gzipSync(XML));
  await main([file]);
  const db = initDb(process.env.DB_PATH);
  db.prepare("INSERT INTO annotations (person_id, content) VALUES ('I0001', 'note')").run();
  db.close();
  await main([file]);
  const db2 = initDb(process.env.DB_PATH);
  expect(db2.prepare('SELECT COUNT(*) AS n FROM persons').get().n).toBe(1);
  expect(db2.prepare('SELECT COUNT(*) AS n FROM annotations').get().n).toBe(1);
  expect(fs.readdirSync(path.join(dir, 'backups')).length).toBe(2);
  delete process.env.DB_PATH;
});
