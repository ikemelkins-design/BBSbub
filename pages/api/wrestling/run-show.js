import { ensureMinimumAiRoster } from "../../../lib/wrestling/ensureRoster";
import db from "../../../lib/db";
import {
  generateMatchCommentary,
  generateWrestlerReaction,
  generateWrestlerPromo,
} from "../../../lib/ai";
import {
  getChampion,
  getNumberOneContender,
  getTopContenders,
  updateAllContenderScores,
} from "../../../lib/wrestling/contenders";

function scoreWrestler(w) {
  return (
    Number(w.power) * 1.3 +
    Number(w.speed) * 1.1 +
    Number(w.charisma) * 0.8 +
    Number(w.stamina) * 1.2 +
    Math.random() * 8
  );
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addReply(threadId, author, content) {
  db.prepare(`
    INSERT INTO replies (thread_id, author, content)
    VALUES (?, ?, ?)
  `).run(threadId, author, content);
}

function getWorldTitle() {
  return db.prepare(`
    SELECT *
    FROM titles
    WHERE name = 'BBSbub World Championship'
    LIMIT 1
  `).get();
}

function getHeat(aId, bId) {
  const row = db.prepare(`
    SELECT heat
    FROM rivalries
    WHERE wrestler_id = ? AND target_id = ?
  `).get(aId, bId);

  return row?.heat || 1;
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

function updateRivalriesAfterMatch(winnerId, loserId) {
  ensureRivalryPair(winnerId, loserId);

  db.prepare(`
    UPDATE rivalries
    SET
      heat = COALESCE(heat, 0) + 2,
      wins_against_target = COALESCE(wins_against_target, 0) + 1,
      last_match_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE wrestler_id = ? AND target_id = ?
  `).run(winnerId, loserId);

  db.prepare(`
    UPDATE rivalries
    SET
      heat = COALESCE(heat, 0) + 3,
      losses_against_target = COALESCE(losses_against_target, 0) + 1,
      last_match_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE wrestler_id = ? AND target_id = ?
  `).run(loserId, winnerId);
}

function updateWrestlerRecords(winnerId, loserId) {
  db.prepare(`
    UPDATE wrestlers
    SET
      wins = COALESCE(wins, 0) + 1,
      streak = CASE
        WHEN COALESCE(streak, 0) >= 0 THEN COALESCE(streak, 0) + 1
        ELSE 1
      END
    WHERE id = ?
  `).run(winnerId);

  db.prepare(`
    UPDATE wrestlers
    SET
      losses = COALESCE(losses, 0) + 1,
      streak = CASE
        WHEN COALESCE(streak, 0) <= 0 THEN COALESCE(streak, 0) - 1
        ELSE -1
      END
    WHERE id = ?
  `).run(loserId);
}

function fallbackFinish(winner, loser) {
  return pickRandom([
    `${winner.name} plants ${loser.name} with ${winner.finisher}!`,
    `${winner.name} catches ${loser.name} with ${winner.finisher}!`,
    `${loser.name} makes one mistake and ${winner.name} capitalizes with ${winner.finisher}!`,
    `${winner.name} survives and lands ${winner.finisher} for the win!`,
  ]);
}

function getShowCount() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();

  db.prepare(`
    INSERT OR IGNORE INTO meta (key, value)
    VALUES ('show_count', '0')
  `).run();

  const row = db.prepare(`
    SELECT value
    FROM meta
    WHERE key = 'show_count'
  `).get();

  return Number(row?.value || 0);
}

function incrementShowCount() {
  const nextCount = getShowCount() + 1;

  db.prepare(`
    INSERT INTO meta (key, value)
    VALUES ('show_count', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(nextCount));

  return nextCount;
}

function getAvailableAiWrestlers(excludeIds = []) {
  if (!excludeIds.length) {
    return db.prepare(`
      SELECT *
      FROM wrestlers
      WHERE is_ai = 1
      ORDER BY RANDOM()
    `).all();
  }

  const placeholders = excludeIds.map(() => "?").join(", ");

  return db.prepare(`
    SELECT *
    FROM wrestlers
    WHERE is_ai = 1
      AND id NOT IN (${placeholders})
    ORDER BY RANDOM()
  `).all(...excludeIds);
}

function pickRandomPair(excludeIds = []) {
  const wrestlers = getAvailableAiWrestlers(excludeIds);
  if (wrestlers.length < 2) return [null, null];
  return [wrestlers[0], wrestlers[1]];
}

function pickFreshPair(excludeIds = []) {
  const usedSet = new Set(excludeIds.map(Number));

  const fresh = db.prepare(`
    SELECT *
    FROM wrestlers
    WHERE is_ai = 1
      AND COALESCE(wins, 0) + COALESCE(losses, 0) = 0
    ORDER BY RANDOM()
  `).all();

  const available = fresh.filter((w) => !usedSet.has(Number(w.id)));

  if (available.length >= 2) {
    return [available[0], available[1]];
  }

  return [null, null];
}

function getHeatedRivalries() {
  return db.prepare(`
    SELECT *
    FROM rivalries
    WHERE heat >= 5
    ORDER BY heat DESC, RANDOM()
    LIMIT 20
  `).all();
}

function pickHeatedPair(excludeIds = []) {
  const usedSet = new Set(excludeIds.map(Number));
  const rivalries = getHeatedRivalries();

  for (const rivalry of rivalries) {
    const aId = Number(rivalry.wrestler_id);
    const bId = Number(rivalry.target_id);

    if (aId === bId) continue;
    if (usedSet.has(aId) || usedSet.has(bId)) continue;

    const a = db.prepare(`SELECT * FROM wrestlers WHERE id = ?`).get(aId);
    const b = db.prepare(`SELECT * FROM wrestlers WHERE id = ?`).get(bId);

    if (a && b) {
      return [a, b, rivalry];
    }
  }

  return [null, null, null];
}

function decayOldRivalries() {
  const rows = db.prepare(`
    SELECT wrestler_id, target_id, heat, last_match_at
    FROM rivalries
  `).all();

  const update = db.prepare(`
    UPDATE rivalries
    SET heat = ?, updated_at = CURRENT_TIMESTAMP
    WHERE wrestler_id = ? AND target_id = ?
  `);

  for (const row of rows) {
    if (!row.last_match_at) continue;

    const lastMatch = new Date(row.last_match_at);
    const now = new Date();
    const diffMs = now.getTime() - lastMatch.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays >= 2 && row.heat > 0) {
      update.run(
        Math.max(Number(row.heat) - 1, 0),
        row.wrestler_id,
        row.target_id
      );
    }
  }
}

function coolDownFeudAfterPpv(winnerId, loserId, rivalryHeat, isPPV) {
  if (!isPPV) return;
  if (rivalryHeat < 8) return;

  db.prepare(`
    UPDATE rivalries
    SET heat = MAX(COALESCE(heat, 0) - 5, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE wrestler_id = ? AND target_id = ?
  `).run(winnerId, loserId);

  db.prepare(`
    UPDATE rivalries
    SET heat = MAX(COALESCE(heat, 0) - 5, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE wrestler_id = ? AND target_id = ?
  `).run(loserId, winnerId);
}

async function runMatch({
  wrestler1,
  wrestler2,
  label,
  isPPV = false,
  forceTitleMatch = false,
  useRematchThread = false,
}) {
  ensureRivalryPair(wrestler1.id, wrestler2.id);

  const rivalryHeat = Math.max(
    getHeat(wrestler1.id, wrestler2.id),
    getHeat(wrestler2.id, wrestler1.id)
  );

  let isTitleMatch = false;
  let title = getWorldTitle();

  if (forceTitleMatch) {
    if (!title?.champion_id) {
      isTitleMatch = true;
    } else {
      const championInMatch =
        Number(title.champion_id) === Number(wrestler1.id) ||
        Number(title.champion_id) === Number(wrestler2.id);

      if (championInMatch) {
        isTitleMatch = true;
      }
    }
  }

  let threadId = null;

  if (useRematchThread) {
    const thread = db.prepare(`
      INSERT INTO threads (title, author, content)
      VALUES (?, ?, ?)
    `).run(
      `${wrestler1.name} vs ${wrestler2.name} - ${isPPV ? "PPV SHOWDOWN" : "REMATCH"}`,
      wrestler1.name,
      `${wrestler1.name} calls out ${wrestler2.name}: "${isPPV ? "This ends tonight." : "I’m not done with you."}"`
    );

    threadId = thread.lastInsertRowid;
  }

  const score1 = scoreWrestler(wrestler1);
  const score2 = scoreWrestler(wrestler2);

  const winner = score1 >= score2 ? wrestler1 : wrestler2;
  const loser = winner.id === wrestler1.id ? wrestler2 : wrestler1;

  const finishText = fallbackFinish(winner, loser);

  if (!threadId) {
    const promo = await generateWrestlerPromo({
      wrestler: wrestler1,
      opponent: wrestler2,
      isTitleMatch,
      rivalryHeat,
    });

    const promoTitle = String(
      promo?.title || `${wrestler1.name} vs ${wrestler2.name}`
    ).trim();

    const promoContent = String(
      promo?.content || `${wrestler2.name}, get in the ring.`
    ).trim();

    const promoResult = db.prepare(`
      INSERT INTO threads (title, author, content)
      VALUES (?, ?, ?)
    `).run(promoTitle, wrestler1.name, promoContent);

    threadId = promoResult.lastInsertRowid;
  }

  const commentary = await generateMatchCommentary({
    wrestler1,
    wrestler2,
    winner,
    loser,
    isTitleMatch,
  });

  if (Array.isArray(commentary)) {
    for (const line of commentary) {
      addReply(threadId, "SYSTEM", String(line));
    }
  }

  const resultText = isTitleMatch
    ? `${winner.name} defeated ${loser.name} and won the BBSbub World Championship using ${winner.finisher || "their finisher"}.`
    : `${winner.name} defeated ${loser.name} using ${winner.finisher || "their finisher"}.`;

  addReply(threadId, "SYSTEM", resultText);

  updateRivalriesAfterMatch(winner.id, loser.id);
  updateWrestlerRecords(winner.id, loser.id);
  updateAllContenderScores();

  let titleChanged = false;
  let championName = null;

  title = getWorldTitle();

  if (isTitleMatch || !title?.champion_id) {
    db.prepare(`
      UPDATE titles
      SET champion_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = 'BBSbub World Championship'
    `).run(winner.id);

    titleChanged = true;
    championName = winner.name;

    addReply(threadId, "SYSTEM", `${winner.name} is now the BBSbub World Champion.`);

    updateAllContenderScores();
  }

  const winnerReply = await generateWrestlerReaction({
    wrestler: winner,
    opponent: loser,
    isWinner: true,
    isTitleMatch,
    rivalryHeat,
  });

  const loserReply = await generateWrestlerReaction({
    wrestler: loser,
    opponent: winner,
    isWinner: false,
    isTitleMatch,
    rivalryHeat,
  });

  addReply(threadId, winner.name, String(winnerReply || ""));
  addReply(threadId, loser.name, String(loserReply || ""));

  if (rivalryHeat >= 6) {
    addReply(threadId, loser.name, isPPV ? "This isn't finished." : "This isn’t over.");
  }

  coolDownFeudAfterPpv(winner.id, loser.id, rivalryHeat, isPPV);

  const matchInsert = db.prepare(`
    INSERT INTO matches
    (
      wrestler1_id,
      wrestler2_id,
      winner_id,
      loser_id,
      finish_text,
      result_text,
      is_title_match,
      title_name,
      thread_id,
      log
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    wrestler1.id,
    wrestler2.id,
    winner.id,
    loser.id,
    finishText,
    resultText,
    isTitleMatch ? 1 : 0,
    isTitleMatch ? "BBSbub World Championship" : null,
    threadId,
    JSON.stringify(Array.isArray(commentary) ? commentary : [])
  );

  const match = db.prepare(`
    SELECT
      m.*,
      w1.name AS wrestler1_name,
      w2.name AS wrestler2_name,
      ww.name AS winner_name,
      wl.name AS loser_name
    FROM matches m
    LEFT JOIN wrestlers w1 ON m.wrestler1_id = w1.id
    LEFT JOIN wrestlers w2 ON m.wrestler2_id = w2.id
    LEFT JOIN wrestlers ww ON m.winner_id = ww.id
    LEFT JOIN wrestlers wl ON m.loser_id = wl.id
    WHERE m.id = ?
  `).get(matchInsert.lastInsertRowid);

  return {
    label,
    winner,
    loser,
    commentary,
    match,
    threadId,
    titleChanged,
    championName,
    rivalryHeat,
    isTitleMatch,
    isPPV,
  };
}

async function buildNormalShow() {
  updateAllContenderScores();

  const usedIds = [];
  const show = [];

  let openerA = null;
  let openerB = null;

  [openerA, openerB] = pickFreshPair(usedIds);

  if (!openerA || !openerB) {
    [openerA, openerB] = pickRandomPair(usedIds);
  }

  if (openerA && openerB) {
    usedIds.push(Number(openerA.id), Number(openerB.id));
    show.push(
      await runMatch({
        wrestler1: openerA,
        wrestler2: openerB,
        label: "opener",
        isPPV: false,
      })
    );
  }

  const [feudA, feudB] = pickHeatedPair(usedIds);

  if (feudA && feudB) {
    usedIds.push(Number(feudA.id), Number(feudB.id));
    show.push(
      await runMatch({
        wrestler1: feudA,
        wrestler2: feudB,
        label: "grudge_match",
        isPPV: false,
        useRematchThread: true,
      })
    );
  } else {
    const [midA, midB] = pickRandomPair(usedIds);
    if (midA && midB) {
      usedIds.push(Number(midA.id), Number(midB.id));
      show.push(
        await runMatch({
          wrestler1: midA,
          wrestler2: midB,
          label: "midcard",
          isPPV: false,
        })
      );
    }
  }

  const champion = getChampion();
  const contender = getNumberOneContender();

  if (
    champion &&
    contender &&
    Number(champion.id) !== Number(contender.id) &&
    !usedIds.includes(Number(champion.id)) &&
    !usedIds.includes(Number(contender.id))
  ) {
    show.push(
      await runMatch({
        wrestler1: champion,
        wrestler2: contender,
        label: "main_event_world_title",
        isPPV: false,
        forceTitleMatch: true,
      })
    );
  } else {
    const [mainA, mainB] = pickRandomPair(usedIds);

    if (mainA && mainB) {
      show.push(
        await runMatch({
          wrestler1: mainA,
          wrestler2: mainB,
          label: "main_event",
          isPPV: false,
          forceTitleMatch: true,
        })
      );
    }
  }

  return show;
}

async function buildPpvShow() {
  updateAllContenderScores();

  const usedIds = [];
  const show = [];

  const champion = getChampion();
  const contender = getNumberOneContender();

  if (
    champion &&
    contender &&
    Number(champion.id) !== Number(contender.id)
  ) {
    usedIds.push(Number(champion.id), Number(contender.id));
    show.push(
      await runMatch({
        wrestler1: champion,
        wrestler2: contender,
        label: "ppv_world_title_main_event",
        isPPV: true,
        forceTitleMatch: true,
        useRematchThread: true,
      })
    );
  } else {
    const [topFeudA, topFeudB] = pickHeatedPair(usedIds);

    if (topFeudA && topFeudB) {
      usedIds.push(Number(topFeudA.id), Number(topFeudB.id));
      show.push(
        await runMatch({
          wrestler1: topFeudA,
          wrestler2: topFeudB,
          label: "ppv_main_event",
          isPPV: true,
          forceTitleMatch: true,
          useRematchThread: true,
        })
      );
    }
  }

  const contenders = getTopContenders(6).filter(
    (w) => !usedIds.includes(Number(w.id))
  );

  if (contenders.length >= 2) {
    usedIds.push(Number(contenders[0].id), Number(contenders[1].id));
    show.push(
      await runMatch({
        wrestler1: contenders[0],
        wrestler2: contenders[1],
        label: "ppv_contender_match",
        isPPV: true,
      })
    );
  }

  const [grudgeA, grudgeB] = pickHeatedPair(usedIds);

  if (grudgeA && grudgeB) {
    usedIds.push(Number(grudgeA.id), Number(grudgeB.id));
    show.push(
      await runMatch({
        wrestler1: grudgeA,
        wrestler2: grudgeB,
        label: "ppv_grudge_match",
        isPPV: true,
        useRematchThread: true,
      })
    );
  }

  const [openerA, openerB] = pickFreshPair(usedIds);

  if (openerA && openerB) {
    show.push(
      await runMatch({
        wrestler1: openerA,
        wrestler2: openerB,
        label: "ppv_opener",
        isPPV: true,
      })
    );
  } else {
    const [fallbackA, fallbackB] = pickRandomPair(usedIds);
    if (fallbackA && fallbackB) {
      show.push(
        await runMatch({
          wrestler1: fallbackA,
          wrestler2: fallbackB,
          label: "ppv_opener",
          isPPV: true,
        })
      );
    }
  }

  return show;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rosterResult = ensureMinimumAiRoster(db, 12, 20);
    updateAllContenderScores();

    const showCount = incrementShowCount();
    const isPPV = showCount % 5 === 0;

    const show = isPPV
      ? await buildPpvShow()
      : await buildNormalShow();

    updateAllContenderScores();
    decayOldRivalries();

    return res.status(200).json({
      success: true,
      rosterResult,
      showCount,
      isPPV,
      showName: isPPV
        ? "BBSbub: BLOOD CIRCUIT (PPV)"
        : "BBSbub Fight Night",
      champion: getChampion(),
      numberOneContender: getNumberOneContender(),
      topContenders: getTopContenders(10),
      show,
    });
  } catch (error) {
    console.error("run-show error:", error);
    return res.status(500).json({ error: error.message });
  }
}