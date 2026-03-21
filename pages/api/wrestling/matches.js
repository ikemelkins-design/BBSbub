import db from "../../../lib/db";

export default function handler(req, res) {
  try {
    const matches = db
      .prepare(`
        SELECT
          matches.id,
          matches.wrestler1_id,
          matches.wrestler2_id,
          matches.winner_id,
          matches.log,
          matches.created_at,
          w1.name AS wrestler1_name,
          w2.name AS wrestler2_name,
          ww.name AS winner_name
        FROM matches
        LEFT JOIN wrestlers w1 ON matches.wrestler1_id = w1.id
        LEFT JOIN wrestlers w2 ON matches.wrestler2_id = w2.id
        LEFT JOIN wrestlers ww ON matches.winner_id = ww.id
        ORDER BY matches.id DESC
      `)
      .all();

    return res.status(200).json({ matches });
  } catch (error) {
    console.error("matches error:", error);
    return res.status(500).json({ error: error.message });
  }
}