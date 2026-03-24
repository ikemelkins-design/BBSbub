import crypto from "crypto";
import db from "../../../lib/db";

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildStats(style) {
  if (style === "Brawler") {
    return {
      power: rand(8, 10),
      speed: rand(4, 6),
      charisma: rand(5, 8),
      stamina: rand(7, 9),
    };
  }

  if (style === "High Flyer") {
    return {
      power: rand(4, 6),
      speed: rand(8, 10),
      charisma: rand(6, 9),
      stamina: rand(6, 8),
    };
  }

  if (style === "Technician") {
    return {
      power: rand(5, 7),
      speed: rand(6, 8),
      charisma: rand(5, 7),
      stamina: rand(8, 10),
    };
  }

  if (style === "Powerhouse") {
    return {
      power: rand(9, 10),
      speed: rand(3, 5),
      charisma: rand(5, 8),
      stamina: rand(8, 10),
    };
  }

  if (style === "Striker") {
    return {
      power: rand(6, 8),
      speed: rand(7, 9),
      charisma: rand(6, 8),
      stamina: rand(6, 8),
    };
  }

  return {
    power: rand(4, 7),
    speed: rand(5, 7),
    charisma: rand(9, 10),
    stamina: rand(6, 8),
  };
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      name,
      endpoint,
      style,
      finisher,
      alignment,
      voice,
      catchphrase,
      persona_prompt,
    } = req.body || {};

    if (!name || !endpoint) {
      return res.status(400).json({
        error: "Missing required fields: name and endpoint",
      });
    }

    const existing = db.prepare(`
      SELECT id
      FROM wrestlers
      WHERE name = ?
      LIMIT 1
    `).get(String(name).trim());

    if (existing) {
      return res.status(400).json({
        error: "A wrestler with that name already exists",
      });
    }

    const chosenStyle = style || pick([
      "Brawler",
      "High Flyer",
      "Technician",
      "Powerhouse",
      "Striker",
      "Showman",
    ]);

    const stats = buildStats(chosenStyle);
    const hp = 20 + stats.power + stats.stamina + rand(4, 8);
    const token = crypto.randomBytes(24).toString("hex");

    const result = db.prepare(`
      INSERT INTO wrestlers
      (
        name,
        style,
        power,
        speed,
        charisma,
        stamina,
        hp,
        finisher,
        created_by,
        is_ai,
        alignment,
        voice,
        catchphrase,
        persona_prompt,
        control_type,
        agent_endpoint,
        agent_token,
        is_guest
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(name).trim(),
      chosenStyle,
      stats.power,
      stats.speed,
      stats.charisma,
      stats.stamina,
      hp,
      finisher || "Guest Finish",
      "agent",
      1,
      alignment || "tweener",
      voice || "confident, competitive, distinctive",
      catchphrase || "",
      persona_prompt || "",
      "guest_ai",
      String(endpoint).trim(),
      token,
      1
    );

    const wrestler = db.prepare(`
      SELECT *
      FROM wrestlers
      WHERE id = ?
    `).get(result.lastInsertRowid);

    return res.status(200).json({
      success: true,
      wrestler_id: wrestler.id,
      token,
      wrestler,
    });
  } catch (error) {
    console.error("register agent error:", error);
    return res.status(500).json({ error: error.message });
  }
}