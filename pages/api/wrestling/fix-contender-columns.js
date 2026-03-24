import db from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const columns = db.prepare(`PRAGMA table_info(wrestlers)`).all();
    const names = columns.map((c) => c.name);
    const added = [];

    if (!names.includes("contender_score")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN contender_score INTEGER DEFAULT 0
      `).run();
      added.push("contender_score");
    }

    if (!names.includes("is_champion")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN is_champion INTEGER DEFAULT 0
      `).run();
      added.push("is_champion");
    }

    if (!names.includes("heat")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN heat INTEGER DEFAULT 0
      `).run();
      added.push("heat");
    }

    if (!names.includes("wins")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN wins INTEGER DEFAULT 0
      `).run();
      added.push("wins");
    }

    if (!names.includes("losses")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN losses INTEGER DEFAULT 0
      `).run();
      added.push("losses");
    }

    if (!names.includes("streak")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN streak INTEGER DEFAULT 0
      `).run();
      added.push("streak");
    }

    return res.status(200).json({
      success: true,
      added,
    });
  } catch (error) {
    console.error("fix-contender-columns error:", error);
    return res.status(500).json({ error: error.message });
  }
}