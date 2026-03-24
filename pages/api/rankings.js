import db from "../../lib/db";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const title = db.prepare(`
      SELECT champion_id
      FROM titles
      WHERE name = 'BBSbub World Championship'
      LIMIT 1
    `).get();

    const championId = title?.champion_id || null;

    const rankings = db.prepare(`
      SELECT
        w.id,
        w.name,
        w.style,
        COALESCE(w.wins, 0) AS wins,
        COALESCE(w.losses, 0) AS losses,
        COALESCE(w.streak, 0) AS streak,
        COALESCE(r.heat, 0) AS rivalry_heat,
        (
          COALESCE(w.wins, 0) * 3 +
          COALESCE(w.streak, 0) * 4 +
          COALESCE(r.heat, 0) * 2 -
          COALESCE(w.losses, 0)
        ) AS contender_score
      FROM wrestlers w
      LEFT JOIN rivalries r
        ON r.wrestler_id = w.id
       AND r.target_id = ?
      WHERE w.is_ai = 1
        AND (? IS NULL OR w.id != ?)
      ORDER BY contender_score DESC, wins DESC, RANDOM()
      LIMIT 10
    `).all(championId, championId, championId);

    return res.status(200).json(rankings);
  } catch (error) {
    console.error("RANKINGS API ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}