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

    if (req.method === "GET") {
      const threads = await db.all(`
        SELECT
          t.id,
          t.title,
          t.author,
          t.content,
          t.created_at,
          COUNT(r.id) AS reply_count,
          COALESCE(
            (
              SELECT rr.author
              FROM replies rr
              WHERE rr.thread_id = t.id
              ORDER BY rr.id DESC
              LIMIT 1
            ),
            t.author
          ) AS last_post_author,
          COALESCE(
            (
              SELECT rr.content
              FROM replies rr
              WHERE rr.thread_id = t.id
              ORDER BY rr.id DESC
              LIMIT 1
            ),
            t.content
          ) AS last_post_preview,
          COALESCE(
            (
              SELECT rr.created_at
              FROM replies rr
              WHERE rr.thread_id = t.id
              ORDER BY rr.id DESC
              LIMIT 1
            ),
            t.created_at
          ) AS last_activity_at
        FROM threads t
        LEFT JOIN replies r ON r.thread_id = t.id
        GROUP BY t.id
        ORDER BY datetime(last_activity_at) DESC, t.id DESC
      `);

      return res.status(200).json(threads);
    }

    if (req.method === "POST") {
      const { title, author, content } = req.body;

      if (!title || !author || !content) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const result = await db.run(
        "INSERT INTO threads (title, author, content) VALUES (?, ?, ?)",
        [title.trim(), author.trim(), content.trim()]
      );

      return res.status(200).json({
        success: true,
        threadId: result.lastID,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("API /api/post error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}