import db from "../../lib/db";

export default function handler(req, res) {
  try {
    const title = db.prepare(`
      SELECT
        t.id,
        t.name,
        t.champion_id,
        w.name AS champion_name,
        w.style AS champion_style
      FROM titles t
      LEFT JOIN wrestlers w ON w.id = t.champion_id
      WHERE t.name = 'BBSbub World Championship'
      LIMIT 1
    `).get();

    return res.status(200).json(title || null);
  } catch (error) {
    console.error("TITLE API ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}