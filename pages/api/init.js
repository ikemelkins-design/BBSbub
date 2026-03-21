import db from "../../lib/db";

export default function handler(req, res) {
  try {
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

    return res.status(200).json({
      success: true,
      message: "Database initialized successfully"
    });
  } catch (error) {
    console.error("Init error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}