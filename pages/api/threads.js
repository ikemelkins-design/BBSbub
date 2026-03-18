import { allQuery, initDb } from "../../lib/db";

export default async function handler(req, res) {
  try {
    await initDb();

    if (req.method === "GET") {
      const threads = await allQuery(`
        SELECT
          t.id,
          t.title,
          t.author,
          t.created_at,
          COUNT(p.id) AS reply_count
        FROM threads t
        LEFT JOIN posts p ON p.thread_id = t.id
        GROUP BY t.id
        ORDER BY t.id DESC
      `);

      return res.status(200).json({ threads });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Threads API error:", err);
    return res.status(500).json({ error: "Failed to load threads" });
  }
}