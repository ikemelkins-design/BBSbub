import db from "../../lib/db";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getChampion() {
  return db.prepare(`
    SELECT
      t.champion_id,
      w.*
    FROM titles t
    LEFT JOIN wrestlers w ON w.id = t.champion_id
    WHERE t.name = 'BBSbub World Championship'
    LIMIT 1
  `).get();
}

function getTopContenders(championId, limit = 5) {
  return db.prepare(`
    SELECT
      w.*,
      COALESCE(r.heat, 0) AS rivalry_heat,
      COALESCE(w.wins, 0) AS wins,
      COALESCE(w.losses, 0) AS losses,
      COALESCE(w.streak, 0) AS streak,
      (
        COALESCE(w.wins, 0) * 3 +
        COALESCE(w.streak, 0) * 4 +
        COALESCE(r.heat, 0) * 2 -
        COALESCE(w.losses, 0)
      ) AS contender_score
    FROM wrestlers w
    LEFT JOIN rivalries r
      ON r.wrestler_id = w.id AND r.target_id = ?
    WHERE w.is_ai = 1
      AND w.id != ?
    ORDER BY contender_score DESC, wins DESC, RANDOM()
    LIMIT ?
  `).all(championId, championId, limit);
}

function getAiRoster() {
  return db.prepare(`
    SELECT *
    FROM wrestlers
    WHERE is_ai = 1
    ORDER BY RANDOM()
  `).all();
}

function buildNonTitleMatchups(roster, usedIds, count) {
  const available = shuffle(roster.filter((w) => !usedIds.has(w.id)));
  const matches = [];

  while (available.length >= 2 && matches.length < count) {
    const a = available.shift();
    const b = available.shift();

    matches.push({
      wrestler1Id: a.id,
      wrestler1Name: a.name,
      wrestler2Id: b.id,
      wrestler2Name: b.name,
      isTitleMatch: false,
      label: "Grudge Match",
    });

    usedIds.add(a.id);
    usedIds.add(b.id);
  }

  return matches;
}

export default function handler(req, res) {
  try {
    const champion = getChampion();
    const roster = getAiRoster();

    if (roster.length < 2) {
      return res.status(400).json({
        error: "Not enough AI wrestlers for a show card",
      });
    }

    const usedIds = new Set();
    const card = [];

    if (champion?.id) {
      const contenders = getTopContenders(champion.id, 5);

      if (contenders.length > 0) {
        const challenger = pickRandom(
          contenders.slice(0, Math.min(3, contenders.length))
        );

        card.push({
          wrestler1Id: champion.id,
          wrestler1Name: champion.name,
          wrestler2Id: challenger.id,
          wrestler2Name: challenger.name,
          isTitleMatch: true,
          label: "Main Event - World Title",
        });

        usedIds.add(champion.id);
        usedIds.add(challenger.id);
      }
    } else {
      const shuffled = shuffle(roster);

      if (shuffled.length >= 2) {
        const a = shuffled[0];
        const b = shuffled[1];

        card.push({
          wrestler1Id: a.id,
          wrestler1Name: a.name,
          wrestler2Id: b.id,
          wrestler2Name: b.name,
          isTitleMatch: true,
          label: "Main Event - Vacant World Title",
        });

        usedIds.add(a.id);
        usedIds.add(b.id);
      }
    }

    const undercard = buildNonTitleMatchups(roster, usedIds, 2);
    card.push(...undercard);

    return res.status(200).json({
      success: true,
      showName: "BBSbub Fight Night",
      generatedAt: new Date().toISOString(),
      matches: card,
    });
  } catch (error) {
    console.error("SHOW CARD ERROR:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
}