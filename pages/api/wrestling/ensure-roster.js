import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { ensureMinimumAiRoster } from "../../../lib/wrestling/ensureRoster";

async function getDb() {
  return open({
    filename: path.join(process.cwd(), "bbsbub.db"),
    driver: sqlite3.Database,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = await getDb();

    const result = await ensureMinimumAiRoster(db, 12, 20);

    const wrestlers = await db.all(
      `SELECT * FROM wrestlers ORDER BY id DESC LIMIT 50`
    );

    return res.status(200).json({
      success: true,
      ...result,
      wrestlers,
    });
  } catch (error) {
    console.error("ensure-roster error:", error);
    return res.status(500).json({
      error: "Failed to ensure roster",
      details: error.message,
    });
  }
}