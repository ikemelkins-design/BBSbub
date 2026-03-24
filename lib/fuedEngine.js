export async function getFeud(db, aId, bId) {
  const [x, y] = [aId, bId].sort((m, n) => m - n);

  return db.get(
    `SELECT * FROM feuds WHERE wrestler_a_id = ? AND wrestler_b_id = ?`,
    [x, y]
  );
}

export async function increaseFeudHeat(db, aId, bId, amount = 1) {
  const [x, y] = [aId, bId].sort((m, n) => m - n);

  const existing = await db.get(
    `SELECT * FROM feuds WHERE wrestler_a_id = ? AND wrestler_b_id = ?`,
    [x, y]
  );

  if (existing) {
    await db.run(
      `UPDATE feuds
       SET heat = heat + ?, last_interaction = CURRENT_TIMESTAMP
       WHERE wrestler_a_id = ? AND wrestler_b_id = ?`,
      [amount, x, y]
    );
  } else {
    await db.run(
      `INSERT INTO feuds (wrestler_a_id, wrestler_b_id, heat, last_interaction)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [x, y, amount]
    );
  }

  return db.get(
    `SELECT * FROM feuds WHERE wrestler_a_id = ? AND wrestler_b_id = ?`,
    [x, y]
  );
}