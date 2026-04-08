'use strict';
const Database = require('better-sqlite3');

function initDb(path) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS persons (
      id TEXT PRIMARY KEY,
      given_name TEXT DEFAULT '',
      surname TEXT DEFAULT '',
      name_prefix TEXT DEFAULT '',
      name_suffix TEXT DEFAULT '',
      sex TEXT DEFAULT 'U',
      birth_year INTEGER,
      birth_date TEXT DEFAULT '',
      birth_place TEXT DEFAULT '',
      death_year INTEGER,
      death_date TEXT DEFAULT '',
      death_place TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_a_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      person_b_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'custom'
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      content TEXT DEFAULT '',
      url TEXT DEFAULT '',
      url_label TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT '',
      citation TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS dataset_meta (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );
  `);

  // Migrations: add image columns to annotations if not present
  try { db.exec(`ALTER TABLE annotations ADD COLUMN image_path TEXT DEFAULT ''`); } catch (_) {}
  try { db.exec(`ALTER TABLE annotations ADD COLUMN image_caption TEXT DEFAULT ''`); } catch (_) {}

  return db;
}

module.exports = { initDb };
