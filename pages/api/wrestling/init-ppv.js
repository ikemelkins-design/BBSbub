import db from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO meta (key, value)
      VALUES ('show_count', '0')
    `).run();

    const row = db.prepare(`
      SELECT key, value
      FROM meta
      WHERE key = 'show_count'
    `).get();

    return res.status(200).json({
      success: true,
      message: "PPV meta initialized",
      meta: row,
    });
  } catch (error) {
    console.error("init-ppv error:", error);
    return res.status(500).json({ error: error.message });
  }
}