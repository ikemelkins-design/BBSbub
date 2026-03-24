import db from "../../lib/db";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPromo(a, b, heat = 1) {
  if (heat >= 4) {
    return {
      title: `${a.name} wants ${b.name} again`,
      content: `${b.name}, you are not done with me. One more time.`,
    };
  }

  const lines = [
    {
      title: `${a.name} calls out ${b.name}`,
      content: `${b.name}, quit hiding. You and me. Ring. Now.`,
    },
    {
      title: `Message for ${b.name}`,
      content: `I am done waiting. ${b.name}, step up or stay quiet.`,
    },
    {
      title: `${a.name} wants a fight`,
      content: `${b.name}. No more talking. Set it up.`,
    },
    {
      title: `${a.name} vs ${b.name}?`,
      content: `I think we all know how that ends. ${b.name}, prove me wrong.`,
    },
  ];

  return pickRandom(lines);
}

function getOrCreateRivalTarget(wrestlerId) {
  const existingRival = db
    .prepare(`
      SELECT
        r.target_id,
        r.heat,
        w.name,
        w.style,
        w.finisher
      FROM rivalries r
      JOIN wrestlers w ON w.id = r.target_id
      WHERE r.wrestler_id = ?
      ORDER BY r.heat DESC, datetime(r.updated_at) DESC
      LIMIT 1
    `)
    .get(wrestlerId);

  if (existingRival && Math.random() < 0.75) {
    return {
      id: existingRival.target_id,
      name: existingRival.name,
      style: existingRival.style,
      finisher: existingRival.finisher,
      heat: existingRival.heat,
    };
  }

  const others = db
    .prepare(`
      SELECT *
      FROM wrestlers
      WHERE id != ?
      ORDER BY RANDOM()
      LIMIT 8
    `)
    .all(wrestlerId);

  if (!others.length) return null;

  const target = pickRandom(others);

  db.prepare(`
    INSERT INTO rivalries (wrestler_id, target_id, heat, created_at, updated_at)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(wrestler_id, target_id)
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
  `).run(wrestlerId, target.id);

  db.prepare(`
    INSERT INTO rivalries (wrestler_id, target_id, heat, created_at, updated_at)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(wrestler_id, target_id)
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
  `).run(target.id, wrestlerId);

  return {
    ...target,
    heat: 1,
  };
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const aiRoster = db
      .prepare(`
        SELECT *
        FROM wrestlers
        WHERE is_ai = 1
        ORDER BY RANDOM()
      `)
      .all();

    if (!aiRoster.length) {
      return res.status(400).json({ error: "No AI wrestlers found" });
    }

    const caller = aiRoster[0];
    const target = getOrCreateRivalTarget(caller.id);

    if (!target) {
      return res.status(400).json({ error: "No valid target found" });
    }

    const promo = buildPromo(caller, target, target.heat || 1);

    const threadResult = db.prepare(`
      INSERT INTO threads (title, author, content)
      VALUES (?, ?, ?)
    `).run(promo.title, caller.name, promo.content);

    db.prepare(`
      UPDATE rivalries
      SET
        heat = heat + 1,
        last_callout_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE wrestler_id = ? AND target_id = ?
    `).run(caller.id, target.id);

    db.prepare(`
      UPDATE rivalries
      SET
        heat = heat + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE wrestler_id = ? AND target_id = ?
    `).run(target.id, caller.id);

    return res.status(200).json({
      success: true,
      threadId: threadResult.lastInsertRowid,
      wrestler1Id: caller.id,
      wrestler2Id: target.id,
      wrestler1Name: caller.name,
      wrestler2Name: target.name,
    });
  } catch (err) {
    console.error("PROMO ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}