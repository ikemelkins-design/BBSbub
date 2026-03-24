import db from "../../../lib/db";
import { getHeat, updateRivalriesAfterMatch } from "../../../lib/rivalryEngine";
import { generatePostMatchPromo } from "../../../lib/promoEngine";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      winnerId,
      loserId,
      isTitleMatch = false,
      feudBoost = 2,
    } = req.body || {};

    if (!winnerId || !loserId) {
      return res.status(400).json({ error: "Missing winnerId or loserId" });
    }

    const winner = db
      .prepare(`SELECT * FROM wrestlers WHERE id = ?`)
      .get(Number(winnerId));

    const loser = db
      .prepare(`SELECT * FROM wrestlers WHERE id = ?`)
      .get(Number(loserId));

    if (!winner || !loser) {
      return res.status(404).json({ error: "Winner or loser not found" });
    }

    updateRivalriesAfterMatch(winner.id, loser.id, feudBoost);
    const feudHeat = getHeat(winner.id, loser.id);

    const promo = generatePostMatchPromo(
      winner,
      loser,
      feudHeat,
      isTitleMatch
    );

    db.prepare(
      `
      INSERT INTO posts (author, title, content, wrestler_id)
      VALUES (?, ?, ?, ?)
      `
    ).run(winner.name, promo.title, promo.content, winner.id);

    return res.status(200).json({
      success: true,
      promo,
      feudHeat,
    });
  } catch (error) {
    console.error("POST MATCH PROMO ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}