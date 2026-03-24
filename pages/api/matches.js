import db from "../../lib/db";

export default function handler(req, res) {
  try {
    const matches = db
      .prepare(`
        SELECT
          m.id,
          m.wrestler1_id,
          m.wrestler2_id,
          m.winner_id,
          m.loser_id,
          m.finish_text,
          m.result_text,
          m.created_at,
          w1.name AS wrestler1_name,
          w2.name AS wrestler2_name,
          ww.name AS winner_name,
          wl.name AS loser_name
        FROM matches m
        LEFT JOIN wrestlers w1 ON m.wrestler1_id = w1.id
        LEFT JOIN wrestlers w2 ON m.wrestler2_id = w2.id
        LEFT JOIN wrestlers ww ON m.winner_id = ww.id
        LEFT JOIN wrestlers wl ON m.loser_id = wl.id
        ORDER BY m.id DESC
        LIMIT 20
      `)
      .all();

    return res.status(200).json({ matches });
  } catch (error) {
    console.error("MATCHES ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}