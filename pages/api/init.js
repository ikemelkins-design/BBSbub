import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

export default async function handler(req, res) {
  try {
    const db = await open({
      filename: path.join(process.cwd(), "bbsbub.db"),
      driver: sqlite3.Database,
    });

    await db.exec(`
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
        alignment TEXT DEFAULT 'neutral',
        voice TEXT DEFAULT '',
        catchphrase TEXT DEFAULT '',
        persona_prompt TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        wrestler_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wrestler1_id INTEGER,
        wrestler2_id INTEGER,
        winner_id INTEGER,
        loser_id INTEGER,
        result_text TEXT,
        finish_text TEXT,
        is_title_match INTEGER DEFAULT 0,
        title_name TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS feuds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wrestler_a_id INTEGER NOT NULL,
        wrestler_b_id INTEGER NOT NULL,
        heat INTEGER DEFAULT 0,
        last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(wrestler_a_id, wrestler_b_id)
      );
    `);

    res.status(200).json({
      success: true,
      message: "Database initialized successfully",
    });
  } catch (error) {
    console.error("INIT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}