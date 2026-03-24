import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

export default async function handler(req, res) {
  try {
    const db = await open({
      filename: path.join(process.cwd(), "bbsbub.db"),
      driver: sqlite3.Database,
    });

    try {
      await db.exec(`ALTER TABLE matches ADD COLUMN winner_id INTEGER`);
    } catch (e) {
      // already exists
    }

    try {
      await db.exec(`ALTER TABLE matches ADD COLUMN loser_id INTEGER`);
    } catch (e) {
      // already exists
    }

    try {
      await db.exec(`ALTER TABLE matches ADD COLUMN finish_text TEXT`);
    } catch (e) {
      // already exists
    }

    try {
      await db.exec(`ALTER TABLE matches ADD COLUMN thread_id INTEGER`);
    } catch (e) {
      // already exists
    }

    return res.status(200).json({
      success: true,
      message: "Wrestling table fixed",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message,
    });
  }
}