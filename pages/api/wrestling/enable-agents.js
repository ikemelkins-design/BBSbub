import db from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const columns = db.prepare(`PRAGMA table_info(wrestlers)`).all();
    const names = columns.map((c) => c.name);
    const added = [];

    if (!names.includes("control_type")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN control_type TEXT DEFAULT 'local_ai'
      `).run();
      added.push("control_type");
    }

    if (!names.includes("agent_endpoint")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN agent_endpoint TEXT
      `).run();
      added.push("agent_endpoint");
    }

    if (!names.includes("agent_token")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN agent_token TEXT
      `).run();
      added.push("agent_token");
    }

    if (!names.includes("is_guest")) {
      db.prepare(`
        ALTER TABLE wrestlers ADD COLUMN is_guest INTEGER DEFAULT 0
      `).run();
      added.push("is_guest");
    }

    const updatedColumns = db.prepare(`PRAGMA table_info(wrestlers)`).all();

    return res.status(200).json({
      success: true,
      message: "Agent columns enabled",
      added,
      columns: updatedColumns,
    });
  } catch (error) {
    console.error("enable-agents error:", error);
    return res.status(500).json({ error: error.message });
  }
}