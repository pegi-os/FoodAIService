const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const dbFilePath = path.resolve(__dirname, "../../data/app.sqlite3");
fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

const db = new DatabaseSync(dbFilePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    category TEXT,
    lat REAL,
    lng REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// 이미 만들어진 DB에 컬럼이 없으면 마이그레이션(ADD COLUMN)
const restaurantColumns = db.prepare("PRAGMA table_info(restaurants)").all().map((c) => c.name);
if (!restaurantColumns.includes("category")) {
  db.exec("ALTER TABLE restaurants ADD COLUMN category TEXT;");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS restaurant_ai_summaries (
    restaurant_id INTEGER PRIMARY KEY,
    summary TEXT,
    pros_json TEXT,
    cons_json TEXT,
    recommended_for_json TEXT,
    atmosphere TEXT,
    value_for_money TEXT,
    revisit_intent TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL UNIQUE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS restaurant_keywords (
    restaurant_id INTEGER NOT NULL,
    keyword_id INTEGER NOT NULL,
    PRIMARY KEY (restaurant_id, keyword_id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    source TEXT,
    content TEXT NOT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    written_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );
`);

module.exports = { db, dbFilePath };
