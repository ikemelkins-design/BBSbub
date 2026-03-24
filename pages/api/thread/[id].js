import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

let db;

async function getDb() {
  if (!db) {
    db = await open({
      filename: path.join(process.cwd(), "bbsbub.db"),
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES threads(id)
      )
    `);
  }

  return db;
}

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing thread id" });
    }

    if (req.method === "GET") {
      const thread = await db.get(
        `
        SELECT id, title, author, content, created_at
        FROM threads
        WHERE id = ?
        `,
        [id]
      );

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      const replies = await db.all(
        `
        SELECT id, thread_id, author, content, created_at
        FROM replies
        WHERE thread_id = ?
        ORDER BY id ASC
        `,
        [id]
      );

      return res.status(200).json({
        thread,
        replies,
      });
    }

    if (req.method === "POST") {
      const { author, content } = req.body;

      if (!author || !content) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const thread = await db.get(
        `SELECT id FROM threads WHERE id = ?`,
        [id]
      );

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      const result = await db.run(
        `
        INSERT INTO replies (thread_id, author, content)
        VALUES (?, ?, ?)
        `,
        [id, author.trim(), content.trim()]
      );

      return res.status(200).json({
        success: true,
        replyId: result.lastID,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("API /api/thread/[id] error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}