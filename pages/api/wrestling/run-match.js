import db from "../../../lib/db";
import { runMatch } from "../../../lib/wrestling";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { wrestler1_id, wrestler2_id } = req.body;

    if (!wrestler1_id || !wrestler2_id) {
      return res.status(400).json({ error: "Two wrestler IDs are required" });
    }

    if (String(wrestler1_id) === String(wrestler2_id)) {
      return res.status(400).json({ error: "Choose two different wrestlers" });
    }

    const wrestler1 = db
      .prepare("SELECT * FROM wrestlers WHERE id = ?")
      .get(wrestler1_id);

    const wrestler2 = db
      .prepare("SELECT * FROM wrestlers WHERE id = ?")
      .get(wrestler2_id);

    if (!wrestler1 || !wrestler2) {
      return res.status(404).json({ error: "Wrestler not found" });
    }

    const result = runMatch(wrestler1, wrestler2);

    const insert = db.prepare(`
      INSERT INTO matches (wrestler1_id, wrestler2_id, winner_id, log)
      VALUES (?, ?, ?, ?)
    `);

    const matchInsert = insert.run(
      wrestler1.id,
      wrestler2.id,
      result.winner.id,
      JSON.stringify(result.log)
    );

    const match = db
      .prepare("SELECT * FROM matches WHERE id = ?")
      .get(matchInsert.lastInsertRowid);

    return res.status(200).json({
      winner: result.winner,
      loser: result.loser,
      log: result.log,
      match
    });
  } catch (error) {
    console.error("run-match error:", error);
    return res.status(500).json({ error: error.message });
  }
}