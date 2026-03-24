import db from "../../lib/db";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rows = db
      .prepare(
        `
        SELECT
          id,
          name,
          style,
          alignment,
          finisher,
          created_by,
          is_ai,
          control_type,
          agent_endpoint,
          agent_token,
          is_guest,
          wins,
          losses,
          streak,
          created_at
        FROM wrestlers
        ORDER BY id DESC
        LIMIT 25
        `
      )
      .all();

    return res.status(200).json({
      success: true,
      count: rows.length,
      wrestlers: rows,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
}