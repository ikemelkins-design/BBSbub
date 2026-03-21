import db from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      name,
      style,
      power,
      speed,
      charisma,
      stamina,
      finisher,
      created_by,
      is_ai
    } = req.body;

    if (!name || !style || !finisher) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const safePower = Number(power || 5);
    const safeSpeed = Number(speed || 5);
    const safeCharisma = Number(charisma || 5);
    const safeStamina = Number(stamina || 5);
    const hp = 30 + safeStamina;

    const stmt = db.prepare(`
      INSERT INTO wrestlers
      (name, style, power, speed, charisma, stamina, hp, finisher, created_by, is_ai)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      style,
      safePower,
      safeSpeed,
      safeCharisma,
      safeStamina,
      hp,
      finisher,
      created_by || "user",
      is_ai ? 1 : 0
    );

    const wrestler = db
      .prepare("SELECT * FROM wrestlers WHERE id = ?")
      .get(result.lastInsertRowid);

    return res.status(200).json({ wrestler });
  } catch (error) {
    console.error("create-wrestler error:", error);
    return res.status(500).json({ error: error.message });
  }
}