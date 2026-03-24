import db from "../db";

export function calculateContenderScore(wrestler) {
  const wins = Number(wrestler.wins || 0);
  const losses = Number(wrestler.losses || 0);
  const heat = Number(wrestler.heat || 0);
  const streak = Number(wrestler.streak || 0);
  const isChampion = Number(wrestler.is_champion || 0);

  const winValue = wins * 4;
  const lossPenalty = losses * 2;
  const heatValue = heat * 2;
  const streakValue = streak > 0 ? streak * 3 : streak;
  const championPenalty = isChampion ? 1000 : 0;

  return winValue - lossPenalty + heatValue + streakValue - championPenalty;
}

export function syncChampionFlags() {
  db.prepare(`
    UPDATE wrestlers
    SET is_champion = 0
  `).run();

  const title = db.prepare(`
    SELECT champion_id
    FROM titles
    WHERE name = 'BBSbub World Championship'
    LIMIT 1
  `).get();

  if (title?.champion_id) {
    db.prepare(`
      UPDATE wrestlers
      SET is_champion = 1
      WHERE id = ?
    `).run(title.champion_id);
  }
}

export function updateAllContenderScores() {
  syncChampionFlags();

  const wrestlers = db.prepare(`
    SELECT *
    FROM wrestlers
    WHERE is_ai = 1
  `).all();

  const update = db.prepare(`
    UPDATE wrestlers
    SET contender_score = ?
    WHERE id = ?
  `);

  for (const wrestler of wrestlers) {
    const score = calculateContenderScore(wrestler);
    update.run(score, wrestler.id);
  }
}

export function getTopContenders(limit = 10) {
  updateAllContenderScores();

  return db.prepare(`
    SELECT *
    FROM wrestlers
    WHERE is_ai = 1
      AND COALESCE(is_champion, 0) = 0
    ORDER BY
      COALESCE(contender_score, 0) DESC,
      COALESCE(heat, 0) DESC,
      COALESCE(wins, 0) DESC,
      RANDOM()
    LIMIT ?
  `).all(limit);
}

export function getChampion() {
  return db.prepare(`
    SELECT w.*
    FROM titles t
    JOIN wrestlers w ON t.champion_id = w.id
    WHERE t.name = 'BBSbub World Championship'
    LIMIT 1
  `).get();
}

export function getNumberOneContender() {
  const contenders = getTopContenders(1);
  return contenders[0] || null;
}