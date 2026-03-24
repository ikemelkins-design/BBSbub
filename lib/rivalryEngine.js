import db from "./db";

function orderedPair(aId, bId) {
  const a = Number(aId);
  const b = Number(bId);
  return a < b ? [a, b] : [b, a];
}

export function ensureRivalryPair(aId, bId) {
  const [wrestlerAId, wrestlerBId] = orderedPair(aId, bId);

  const existing = db
    .prepare(
      `
      SELECT id
      FROM rivalries
      WHERE wrestler_a_id = ? AND wrestler_b_id = ?
      `
    )
    .get(wrestlerAId, wrestlerBId);

  if (!existing) {
    db.prepare(
      `
      INSERT INTO rivalries (wrestler_a_id, wrestler_b_id, heat, last_interaction)
      VALUES (?, ?, 0, CURRENT_TIMESTAMP)
      `
    ).run(wrestlerAId, wrestlerBId);
  }

  return db
    .prepare(
      `
      SELECT *
      FROM rivalries
      WHERE wrestler_a_id = ? AND wrestler_b_id = ?
      `
    )
    .get(wrestlerAId, wrestlerBId);
}

export function getHeat(aId, bId) {
  const [wrestlerAId, wrestlerBId] = orderedPair(aId, bId);

  const row = db
    .prepare(
      `
      SELECT heat
      FROM rivalries
      WHERE wrestler_a_id = ? AND wrestler_b_id = ?
      `
    )
    .get(wrestlerAId, wrestlerBId);

  return row?.heat || 0;
}

export function updateRivalriesAfterMatch(winnerId, loserId, boost = 2) {
  const [wrestlerAId, wrestlerBId] = orderedPair(winnerId, loserId);

  ensureRivalryPair(wrestlerAId, wrestlerBId);

  db.prepare(
    `
    UPDATE rivalries
    SET heat = heat + ?, last_interaction = CURRENT_TIMESTAMP
    WHERE wrestler_a_id = ? AND wrestler_b_id = ?
    `
  ).run(boost, wrestlerAId, wrestlerBId);

  return db
    .prepare(
      `
      SELECT *
      FROM rivalries
      WHERE wrestler_a_id = ? AND wrestler_b_id = ?
      `
    )
    .get(wrestlerAId, wrestlerBId);
}