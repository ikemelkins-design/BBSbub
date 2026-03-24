import db from "../../lib/db";

const STAT_MIN = 1;
const STAT_MAX = 10;
const STAT_BUDGET = 20;

function clampStat(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return STAT_MIN;
  return Math.max(STAT_MIN, Math.min(STAT_MAX, num));
}

export default function handler(req, res) {
  try {
    if (req.method === "GET") {
      const wrestlers = db
        .prepare(`
          SELECT *
          FROM wrestlers
          ORDER BY id DESC
        `)
        .all();

      return res.status(200).json({ wrestlers });
    }

    if (req.method === "POST") {
      const {
        name,
        style,
        power,
        speed,
        charisma,
        stamina,
        finisher,
        created_by = "user",
        is_ai = 0,
      } = req.body;

      if (!name || !style || !finisher) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const cleanPower = clampStat(power);
      const cleanSpeed = clampStat(speed);
      const cleanCharisma = clampStat(charisma);
      const cleanStamina = clampStat(stamina);

      const total =
        cleanPower + cleanSpeed + cleanCharisma + cleanStamina;

      if (total !== STAT_BUDGET) {
        return res.status(400).json({
          error: `Stats must total exactly ${STAT_BUDGET}. Current total: ${total}`,
        });
      }

      const hp = 20 + cleanStamina * 3;

      const result = db
        .prepare(`
          INSERT INTO wrestlers
          (name, style, power, speed, charisma, stamina, hp, finisher, created_by, is_ai)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          name,
          style,
          cleanPower,
          cleanSpeed,
          cleanCharisma,
          cleanStamina,
          hp,
          finisher,
          created_by,
          Number(is_ai)
        );

      const wrestler = db
        .prepare(`SELECT * FROM wrestlers WHERE id = ?`)
        .get(result.lastInsertRowid);

      return res.status(200).json({ success: true, wrestler });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("WRESTLERS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}