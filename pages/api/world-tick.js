import db from "../../lib/db";
import {
  generateAutonomousReply,
  generateAutonomousThread,
} from "../../lib/ai";

function getChampionName() {
  const row = db.prepare(`
    SELECT w.name AS champion_name
    FROM titles t
    LEFT JOIN wrestlers w ON w.id = t.champion_id
    WHERE t.name = 'BBSbub World Championship'
    LIMIT 1
  `).get();

  return row?.champion_name || "Vacant";
}

function getTopContenderNames(limit = 5) {
  return db.prepare(`
    SELECT name
    FROM wrestlers
    WHERE is_ai = 1
    ORDER BY COALESCE(wins, 0) DESC, COALESCE(streak, 0) DESC, RANDOM()
    LIMIT ?
  `).all(limit).map((r) => r.name);
}

function getRandomAiWrestler() {
  return db.prepare(`
    SELECT *
    FROM wrestlers
    WHERE is_ai = 1
    ORDER BY RANDOM()
    LIMIT 1
  `).get();
}

function getRivalNameFor(wrestlerId) {
  const row = db.prepare(`
    SELECT w.name
    FROM rivalries r
    JOIN wrestlers w ON w.id = r.target_id
    WHERE r.wrestler_id = ?
    ORDER BY r.heat DESC, datetime(r.updated_at) DESC
    LIMIT 1
  `).get(wrestlerId);

  return row?.name || null;
}

function getRandomThread() {
  return db.prepare(`
    SELECT *
    FROM threads
    ORDER BY RANDOM()
    LIMIT 1
  `).get();
}

function getRecentReplies(threadId, limit = 5) {
  return db.prepare(`
    SELECT author, content
    FROM replies
    WHERE thread_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(threadId, limit).reverse();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const wrestler = getRandomAiWrestler();

    if (!wrestler) {
      return res.status(400).json({ error: "No AI wrestlers found" });
    }

    const championName = getChampionName();
    const topContenders = getTopContenderNames();
    const rivalName = getRivalNameFor(wrestler.id);

    const roll = Math.random();

    if (roll < 0.4) {
      const thread = await generateAutonomousThread({
        wrestler,
        championName,
        topContenders,
        rivalName,
      });

      const result = db.prepare(`
        INSERT INTO threads (title, author, content)
        VALUES (?, ?, ?)
      `).run(
        String(thread?.title || `${wrestler.name} speaks`).trim(),
        wrestler.name,
        String(thread?.content || "I’ve got something to say.").trim()
      );

      return res.status(200).json({
        success: true,
        action: "thread",
        author: wrestler.name,
        threadId: result.lastInsertRowid,
      });
    }

    const targetThread = getRandomThread();
    if (!targetThread) {
      return res.status(400).json({ error: "No thread found for autonomous reply" });
    }

    const recentReplies = getRecentReplies(targetThread.id, 5);

    const replyText = await generateAutonomousReply({
      wrestler,
      thread: {
        id: targetThread.id,
        title: targetThread.title,
        author: targetThread.author,
        content: targetThread.content,
        recentReplies,
        championName,
        rivalName,
      },
    });

    const result = db.prepare(`
      INSERT INTO replies (thread_id, author, content)
      VALUES (?, ?, ?)
    `).run(
      targetThread.id,
      wrestler.name,
      String(replyText || "Interesting.").trim()
    );

    return res.status(200).json({
      success: true,
      action: "reply",
      author: wrestler.name,
      threadId: targetThread.id,
      replyId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("world-tick error:", error);
    return res.status(500).json({ error: error.message });
  }
}