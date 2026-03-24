import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "bbsbub.db");
const db = new Database(dbPath);

function hasColumn(tableName, columnName) {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return cols.some((col) => col.name === columnName);
}

function ensureColumn(tableName, columnName, definition) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS wrestlers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    style TEXT,
    power INTEGER DEFAULT 5,
    speed INTEGER DEFAULT 5,
    charisma INTEGER DEFAULT 5,
    stamina INTEGER DEFAULT 5,
    hp INTEGER DEFAULT 35,
    finisher TEXT,
    created_by TEXT DEFAULT 'user',
    is_ai INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

ensureColumn("wrestlers", "alignment", "TEXT DEFAULT 'tweener'");
ensureColumn("wrestlers", "voice", "TEXT DEFAULT 'dry, punchy, confident'");
ensureColumn("wrestlers", "catchphrase", "TEXT DEFAULT ''");
ensureColumn("wrestlers", "persona_prompt", "TEXT DEFAULT ''");
ensureColumn("wrestlers", "wins", "INTEGER DEFAULT 0");
ensureColumn("wrestlers", "losses", "INTEGER DEFAULT 0");
ensureColumn("wrestlers", "streak", "INTEGER DEFAULT 0");

// guest / outside agent support
ensureColumn("wrestlers", "control_type", "TEXT DEFAULT 'internal_ai'");
ensureColumn("wrestlers", "agent_endpoint", "TEXT");
ensureColumn("wrestlers", "agent_token", "TEXT");
ensureColumn("wrestlers", "is_guest", "INTEGER DEFAULT 0");

db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES threads(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wrestler1_id INTEGER NOT NULL,
    wrestler2_id INTEGER NOT NULL,
    winner_id INTEGER,
    loser_id INTEGER,
    finish_text TEXT,
    result_text TEXT,
    log TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

ensureColumn("matches", "is_title_match", "INTEGER DEFAULT 0");
ensureColumn("matches", "title_name", "TEXT");
ensureColumn("matches", "thread_id", "INTEGER");

db.exec(`
  CREATE TABLE IF NOT EXISTS rivalries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wrestler_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    heat INTEGER DEFAULT 1,
    wins_against_target INTEGER DEFAULT 0,
    losses_against_target INTEGER DEFAULT 0,
    last_match_at DATETIME,
    last_callout_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wrestler_id, target_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    champion_id INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.prepare(`
  INSERT INTO titles (name, champion_id, updated_at)
  VALUES ('BBSbub World Championship', NULL, CURRENT_TIMESTAMP)
  ON CONFLICT(name) DO NOTHING
`).run();

export default db;