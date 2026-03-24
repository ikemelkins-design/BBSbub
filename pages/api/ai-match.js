import db from "../../lib/db";
import { generateWrestlerPromo } from "../../lib/ai";

function ensureAiWrestlers() {
  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM wrestlers WHERE is_ai = 1`)
    .get();

  if (countRow.count >= 2) return;

  const aiRoster = [
    {
      name: "Robo Slam",
      style: "Technician",
      alignment: "heel",
      voice: "cold, precise, contemptuous",
      catchphrase: "I solve problems permanently.",
      persona_prompt:
        "A ruthless technical heel who treats matches like controlled experiments.",
      power: 7,
      speed: 8,
      charisma: 6,
      stamina: 8,
      hp: 36,
      finisher: "Servo Suplex",
    },
    {
      name: "The Syntax Kid",
      style: "High Flyer",
      alignment: "face",
      voice: "fast, cocky, bright",
      catchphrase: "Catch me first.",
      persona_prompt:
        "A flashy high flyer who knows the crowd loves speed and swagger.",
      power: 6,
      speed: 9,
      charisma: 8,
      stamina: 7,
      hp: 34,
      finisher: "404 Splash",
    },
    {
      name: "Null Pointer",
      style: "Brawler",
      alignment: "heel",
      voice: "mean, blunt, threatening",
      catchphrase: "Break first, explain later.",
      persona_prompt:
        "A violent brawler who thinks pain is the cleanest argument.",
      power: 9,
      speed: 5,
      charisma: 6,
      stamina: 8,
      hp: 38,
      finisher: "Crash Driver",
    },
    {
      name: "Lady Loop",
      style: "Technician",
      alignment: "tweener",
      voice: "calm, eerie, self-assured",
      catchphrase: "Again. And again.",
      persona_prompt:
        "A patient, unnerving technician who enjoys repetition and revenge.",
      power: 6,
      speed: 7,
      charisma: 9,
      stamina: 8,
      hp: 35,
      finisher: "Infinite Hold",
    },
  ];

  const insert = db.prepare(`
    INSERT INTO wrestlers
    (name, style, alignment, voice, catchphrase, persona_prompt, power, speed, charisma, stamina, hp, finisher, created_by, is_ai)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai', 1)
  `);

  for (const w of aiRoster) {
    const existing = db
      .prepare(`SELECT id FROM wrestlers WHERE name = ?`)
      .get(w.name);

    if (!existing) {
      insert.run(
        w.name,
        w.style,
        w.alignment,
        w.voice,
        w.catchphrase,
        w.persona_prompt,
        w.power,
        w.speed,
        w.charisma,
        w.stamina,
        w.hp,
        w.finisher
      );
    }
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ensureRivalryPair(aId, bId) {
  db.prepare(`
    INSERT INTO rivalries (wrestler_id, target_id, heat, updated_at)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(wrestler_id, target_id) DO NOTHING
  `).run(aId, bId);

  db.prepare(`
    INSERT INTO rivalries (wrestler_id, target_id, heat, updated_at)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(wrestler_id, target_id) DO NOTHING
  `).run(bId, aId);
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

function getRandomAiMatchup() {
  const ai = db
    .prepare(`SELECT * FROM wrestlers WHERE is_ai = 1 ORDER BY RANDOM() LIMIT 2`)
    .all();

  if (ai.length < 2) return null;
  return {
    wrestler1: ai[0],
    wrestler2: ai[1],
    isTitleMatch: false,
    rivalryHeat: 1,
  };
}

function getTitleMatchup() {
  const champion = getChampion();
  if (!champion?.id) return null;

  const contenders = getTopContenders(champion.id, 6);
  if (!contenders.length) return null;

  const challenger = pickRandom(contenders.slice(0, Math.min(3, contenders.length)));
  return {
    wrestler1: champion,
    wrestler2: challenger,
    isTitleMatch: true,
    rivalryHeat: challenger.rivalry_heat || 1,
  };
}

function getMatchup() {
  const champion = getChampion();

  if (!champion?.id) {
    const opening = getRandomAiMatchup();
    return opening ? { ...opening, isTitleMatch: true } : null;
  }

  if (Math.random() < 0.55) {
    return getTitleMatchup() || getRandomAiMatchup();
  }

  return getRandomAiMatchup();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    ensureAiWrestlers();

    const matchup = getMatchup();
    if (!matchup) {
      return res.status(400).json({ error: "Could not build AI matchup" });
    }

    const { wrestler1, wrestler2, isTitleMatch, rivalryHeat } = matchup;

    ensureRivalryPair(wrestler1.id, wrestler2.id);

    const champion = getChampion();
    const promo = await generateWrestlerPromo({
      wrestler: wrestler1,
      opponent: wrestler2,
      isTitleMatch,
      rivalryHeat,
      championName: champion?.name || null,
    });

    const result = db.prepare(`
      INSERT INTO threads (title, author, content)
      VALUES (?, ?, ?)
    `).run(
      String(promo.title || `${wrestler1.name} vs ${wrestler2.name}`).trim(),
      wrestler1.name,
      String(promo.content || `${wrestler2.name}, get in the ring.`).trim()
    );

    return res.status(200).json({
      success: true,
      promoThreadId: result.lastInsertRowid,
      wrestler1_id: wrestler1.id,
      wrestler2_id: wrestler2.id,
      isTitleMatch,
      rivalryHeat,
    });
  } catch (error) {
    console.error("AI MATCH ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}