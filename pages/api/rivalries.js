import db from "../../lib/db";

export default function handler(req, res) {
  try {
    const rivalries = db
      .prepare(`
        SELECT
          r.id,
          r.heat,
          r.last_interaction,
          w1.name AS wrestler_a_name,
          w2.name AS wrestler_b_name
        FROM rivalries r
        JOIN wrestlers w1 ON w1.id = r.wrestler_a_id
        JOIN wrestlers w2 ON w2.id = r.wrestler_b_id
        ORDER BY r.heat DESC, r.last_interaction DESC
        LIMIT 20
      `)
      .all();

    res.status(200).json({ rivalries });
  } catch (error) {
    console.error("RIVALRIES ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}