'use strict';
// Import a dataset from the command line (also inside the container):
//   node server/import/cli.js <file.gramps|.ged|.xml> [--dry-run]
// Always backs up the database first (to <db dir>/backups/), then imports.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { initDb } = require('../db');
const { detectFormat, runImport } = require('./index');

async function main(argv) {
  const file = argv.find(a => !a.startsWith('--'));
  const dryRun = argv.includes('--dry-run');
  if (!file) throw new Error('usage: node server/import/cli.js <file> [--dry-run]');

  let buf = fs.readFileSync(file);
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf); // gzipped .gramps
  const dbPath = process.env.DB_PATH || './data/genealogy.db';
  const db = initDb(dbPath);
  const count = () => ({
    persons: db.prepare('SELECT COUNT(*) AS n FROM persons').get().n,
    relationships: db.prepare('SELECT COUNT(*) AS n FROM relationships').get().n,
    roles: db.prepare('SELECT COUNT(*) AS n FROM roles').get().n,
    annotations: db.prepare('SELECT COUNT(*) AS n FROM annotations').get().n,
  });
  const before = count();

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, file, before }));
    return;
  }
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `genealogy-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  await db.backup(backup);

  await runImport(db, buf.toString('utf-8'), detectFormat(file));
  console.log(JSON.stringify({ file, backup, before, after: count() }));
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { main };
