const { initDb } = require('../../server/db');
const { addImages } = require('../../server/import/images');

test('adds image annotations once, skips unknown persons, rejects non-https', () => {
  const db = initDb(':memory:');
  db.prepare("INSERT INTO persons (id, given_name) VALUES ('I1', 'Jan')").run();
  const row = { person_id: 'I1', image_url: 'https://iiif.micr.io/JSUfo/full/800,/0/default.jpg', caption: 'Portret' };
  expect(addImages(db, [row, { ...row, person_id: 'I9' }])).toEqual({ added: 1, skipped: 0, missing: ['I9'] });
  expect(addImages(db, [row])).toEqual({ added: 0, skipped: 1, missing: [] });
  expect(db.prepare('SELECT image_path, image_caption FROM annotations').all())
    .toEqual([{ image_path: row.image_url, image_caption: 'Portret' }]);
  expect(() => addImages(db, [{ ...row, image_url: 'javascript:alert(1)' }])).toThrow();
});
