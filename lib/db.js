import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "bbsbub.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wrestlers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    style TEXT NOT NULL,
    power INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    charisma INTEGER NOT NULL,
    stamina INTEGER NOT NULL,
    hp INTEGER NOT NULL,
    finisher TEXT NOT NULL,
    created_by TEXT DEFAULT 'system',
    is_ai INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wrestler1_id INTEGER NOT NULL,
    wrestler2_id INTEGER NOT NULL,
    winner_id INTEGER,
    log TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;