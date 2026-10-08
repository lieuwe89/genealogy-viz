'use strict';
// Add externally hosted images (IIIF / Wikimedia) as annotations, from the command line:
//   node server/import/images.js <images.json>
// images.json: [{ person_id, image_url, caption, url, url_label, content }]
// Idempotent: skips a row when the person already has an annotation with that image_url.
const fs = require('fs');
const { initDb } = require('../db');

function addImages(db, rows) {
  const exists = db.prepare('SELECT 1 FROM annotations WHERE person_id = ? AND image_path = ?');
  const person = db.prepare('SELECT 1 FROM persons WHERE id = ?');
  const insert = db.prepare(`INSERT INTO annotations (person_id, content, url, url_label, image_path, image_caption)
    VALUES (?, ?, ?, ?, ?, ?)`);
  const result = { added: 0, skipped: 0, missing: [] };
  db.transaction(() => {
    for (const r of rows) {
      if (!/^https:\/\//.test(r.image_url || '')) throw new Error(`not an https image url: ${r.image_url}`);
      if (!person.get(r.person_id)) { result.missing.push(r.person_id); continue; }
      if (exists.get(r.person_id, r.image_url)) { result.skipped++; continue; }
      insert.run(r.person_id, r.content || '', r.url || '', r.url_label || '', r.image_url, r.caption || '');
      result.added++;
    }
  })();
  return result;
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node server/import/images.js <images.json>'); process.exit(1); }
  const db = initDb(process.env.DB_PATH || './data/genealogy.db');
  console.log(JSON.stringify(addImages(db, JSON.parse(fs.readFileSync(file, 'utf-8')))));
}

module.exports = { addImages };
