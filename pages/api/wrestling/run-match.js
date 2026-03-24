import db from "../../../lib/db";
import {
  ensureRivalryPair,
  getHeat,
  updateRivalriesAfterMatch,
} from "../../../lib/rivalryEngine";
import {
  generateCalloutPromo,
  generatePostMatchPromo,
} from "../../../lib/promoEngine";

function rand(max) {
  return Math.floor(Math.random() * max);
}

function simulateMatch(w1, w2) {
  const score1 =
    (w1.power || 0) * 2 +
    (w1.speed || 0) +
    (w1.charisma || 0) +
    (w1.stamina || 0) +
    rand(10);

  const score2 =
    (w2.power || 0) * 2 +
    (w2.speed || 0) +
    (w2.charisma || 0) +
    (w2.stamina || 0) +
    rand(10);

  if (score1 >= score2) {
    return {
      winner: w1,
      loser: w2,
      resultText: `${w1.name} defeats ${w2.name} in a hard-fought match.`,
      finishText: `${w1.name} wins with ${w1.finisher || "a decisive finishing move"}.`,
    };
  }

  return {
    winner: w2,
    loser: w1,
    resultText: `${w2.name} defeats ${w1.name} in a hard-fought match.`,
    finishText: `${w2.name} wins with ${w2.finisher || "a decisive finishing move"}.`,
  };
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      wrestler1Id,
      wrestler2Id,
      isTitleMatch = false,
      titleName = "",
      generatePreMatchPromos = true,
      generatePostMatchPromo: shouldGeneratePostMatchPromo = true,
    } = req.body || {};

    if (!wrestler1Id || !wrestler2Id) {
      return res.status(400).json({ error: "Missing wrestler1Id or wrestler2Id" });
    }

    if (Number(wrestler1Id) === Number(wrestler2Id)) {
      return res.status(400).json({ error: "A wrestler cannot face themselves" });
    }

    const wrestler1 = db
      .prepare(`SELECT * FROM wrestlers WHERE id = ?`)
      .get(Number(wrestler1Id));

    const wrestler2 = db
      .prepare(`SELECT * FROM wrestlers WHERE id = ?`)
      .get(Number(wrestler2Id));

    if (!wrestler1 || !wrestler2) {
      return res.status(404).json({ error: "One or both wrestlers not found" });
    }

    ensureRivalryPair(wrestler1.id, wrestler2.id);
    const feudHeatBefore = getHeat(wrestler1.id, wrestler2.id);

    let effectiveTitleMatch = !!isTitleMatch;
    if (feudHeatBefore >= 8 && !effectiveTitleMatch) {
      effectiveTitleMatch = true;
    }

    if (generatePreMatchPromos) {
      const promo1 = generateCalloutPromo(
        wrestler1,
        wrestler2,
        feudHeatBefore,
        effectiveTitleMatch
      );

      const promo2 = generateCalloutPromo(
        wrestler2,
        wrestler1,
        feudHeatBefore,
        effectiveTitleMatch
      );

      db.prepare(
        `
        INSERT INTO posts (author, title, content, wrestler_id)
        VALUES (?, ?, ?, ?)
        `
      ).run(wrestler1.name, promo1.title, promo1.content, wrestler1.id);

      db.prepare(
        `
        INSERT INTO posts (author, title, content, wrestler_id)
        VALUES (?, ?, ?, ?)
        `
      ).run(wrestler2.name, promo2.title, promo2.content, wrestler2.id);
    }

    const matchResult = simulateMatch(wrestler1, wrestler2);

    const insertResult = db
      .prepare(
        `
        INSERT INTO matches (
          wrestler1_id,
          wrestler2_id,
          winner_id,
          loser_id,
          result_text,
          finish_text,
          is_title_match,
          title_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        wrestler1.id,
        wrestler2.id,
        matchResult.winner.id,
        matchResult.loser.id,
        matchResult.resultText,
        matchResult.finishText,
        effectiveTitleMatch ? 1 : 0,
        titleName || ""
      );

    const rivalry = updateRivalriesAfterMatch(
      matchResult.winner.id,
      matchResult.loser.id,
      2
    );

    if (shouldGeneratePostMatchPromo) {
      const postMatch = generatePostMatchPromo(
        matchResult.winner,
        matchResult.loser,
        rivalry?.heat || 0,
        effectiveTitleMatch
      );

      db.prepare(
        `
        INSERT INTO posts (author, title, content, wrestler_id)
        VALUES (?, ?, ?, ?)
        `
      ).run(
        matchResult.winner.name,
        postMatch.title,
        postMatch.content,
        matchResult.winner.id
      );
    }

    return res.status(200).json({
      success: true,
      match: {
        id: insertResult.lastInsertRowid,
        wrestler1: wrestler1.name,
        wrestler2: wrestler2.name,
        winner: matchResult.winner.name,
        loser: matchResult.loser.name,
        resultText: matchResult.resultText,
        finishText: matchResult.finishText,
        isTitleMatch: effectiveTitleMatch,
        titleName: titleName || "",
      },
      rivalry,
    });
  } catch (error) {
    console.error("MATCH RUN ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}