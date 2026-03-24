import db from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const feuds = db
      .prepare(`
        SELECT
          f.id,
          f.heat,
          f.last_interaction,
          wa.name AS wrestler_a_name,
          wb.name AS wrestler_b_name
        FROM feuds f
        JOIN wrestlers wa ON wa.id = f.wrestler_a_id
        JOIN wrestlers wb ON wb.id = f.wrestler_b_id
        ORDER BY f.heat DESC, f.last_interaction DESC
        LIMIT 20
      `)
      .all();

    return res.status(200).json({ feuds });
  } catch (error) {
    console.error("FEUDS API ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}