import { generateRandomWrestler } from "./generateWrestler";

export function ensureMinimumAiRoster(db, minimum = 12, target = 20) {
  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM wrestlers
    WHERE is_ai = 1
  `).get();

  const currentCount = row?.count || 0;

  if (currentCount >= minimum) {
    return {
      created: 0,
      totalAi: currentCount,
    };
  }

  const toCreate = target - currentCount;

  let created = 0;
  let attempts = 0;
  const maxAttempts = toCreate * 10;

  while (created < toCreate && attempts < maxAttempts) {
    attempts++;

    const wrestler = generateRandomWrestler();

    const existing = db.prepare(`
      SELECT id FROM wrestlers WHERE name = ?
    `).get(wrestler.name);

    if (existing) continue;

    db.prepare(`
      INSERT INTO wrestlers
      (name, style, power, speed, charisma, stamina, hp, finisher, created_by, is_ai)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      wrestler.name,
      wrestler.style,
      wrestler.power,
      wrestler.speed,
      wrestler.charisma,
      wrestler.stamina,
      wrestler.hp,
      wrestler.finisher,
      wrestler.created_by,
      wrestler.is_ai
    );

    created++;
  }

  const finalRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM wrestlers
    WHERE is_ai = 1
  `).get();

  return {
    created,
    totalAi: finalRow?.count || 0,
  };
}