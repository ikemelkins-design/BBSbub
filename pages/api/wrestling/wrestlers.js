import db from "../../../lib/db";

export default function handler(req, res) {
  try {
    const wrestlers = db
      .prepare("SELECT * FROM wrestlers ORDER BY id DESC")
      .all();

    return res.status(200).json({ wrestlers });
  } catch (error) {
    console.error("wrestlers error:", error);
    return res.status(500).json({ error: error.message });
  }
}