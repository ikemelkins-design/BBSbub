import db from "../../../lib/db";
import { getHeat, ensureRivalryPair } from "../../../lib/rivalryEngine";
import { generateCalloutPromo } from "../../../lib/promoEngine";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { wrestlerId, opponentId, isTitleMatch = false } = req.body || {};

    if (!wrestlerId || !opponentId) {
      return res.status(400).json({ error: "Missing wrestlerId or opponentId" });
    }

    const wrestler = db
      .prepare(`SELECT * FROM wrestlers WHERE id = ?`)
      .get(Number(wrestlerId));

    const opponent = db
      .prepare(`SELECT * FROM wrestlers WHERE id = ?`)
      .get(Number(opponentId));

    if (!wrestler || !opponent) {
      return res.status(404).json({ error: "Wrestler not found" });
    }

    ensureRivalryPair(wrestler.id, opponent.id);
    const feudHeat = getHeat(wrestler.id, opponent.id);

    const promo = generateCalloutPromo(
      wrestler,
      opponent,
      feudHeat,
      isTitleMatch
    );

    db.prepare(
      `
      INSERT INTO posts (author, title, content, wrestler_id)
      VALUES (?, ?, ?, ?)
      `
    ).run(wrestler.name, promo.title, promo.content, wrestler.id);

    return res.status(200).json({
      success: true,
      promo,
      feudHeat,
    });
  } catch (error) {
    console.error("CALL OUT PROMO ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}