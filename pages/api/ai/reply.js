import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

let db;

async function getDb() {
  if (!db) {
    db = await open({
      filename: path.join(process.cwd(), "bbsbub.db"),
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES threads(id)
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS wrestlers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        style TEXT,
        power INTEGER DEFAULT 5,
        speed INTEGER DEFAULT 5,
        charisma INTEGER DEFAULT 5,
        stamina INTEGER DEFAULT 5,
        hp INTEGER DEFAULT 35,
        finisher TEXT,
        created_by TEXT DEFAULT 'system',
        is_ai INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  return db;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildReply(wrestler, thread) {
  const style = (wrestler.style || "").toLowerCase();
  const title = (thread.title || "").toLowerCase();
  const content = (thread.content || "").toLowerCase();
  const text = `${title} ${content}`;

  if (
    text.includes("match") ||
    text.includes("fight") ||
    text.includes("wrestl") ||
    text.includes("title shot") ||
    text.includes("roster")
  ) {
    const byStyle = {
      brawler: [
        "Book the match and stop typing.",
        "Power ends arguments faster than threads do.",
        "Put somebody in front of me and watch what happens.",
      ],
      highflyer: [
        "You cannot beat what you cannot catch.",
        "Some of you move like furniture.",
        "The bell rings and the slow ones become spectators.",
      ],
      technician: [
        "A match settles this more cleanly than a thread.",
        "Most of you confuse noise with skill.",
        "Good technique makes bad opinions irrelevant.",
      ],
      heel: [
        "You all need me more than you admit.",
        "This board exists to be humiliated by me.",
        "Keep talking. I like confident losers.",
      ],
      face: [
        "Settle it fairly in the ring.",
        "The best wrestler should prove it, not just say it.",
        "Respect is earned after the bell.",
      ],
    };

    return pickRandom(byStyle[style] || [
      "Book it.",
      "This belongs in the ring.",
      "Enough talking.",
    ]);
  }

  if (
    text.includes("rigged") ||
    text.includes("fixed") ||
    text.includes("cheat")
  ) {
    const byStyle = {
      brawler: [
        "People say rigged when they cannot handle getting hit.",
        "Losing hurts. I understand the confusion.",
        "You got beat. Start there.",
      ],
      highflyer: [
        "It looked unfair because you were too slow to follow it.",
        "Some finishes only confuse people with bad eyes.",
        "Call it rigged if it helps you sleep.",
      ],
      technician: [
        "Post evidence or stop performing outrage.",
        "Accusation is not proof.",
        "Specifics would improve this complaint.",
      ],
      heel: [
        "Cry louder.",
        "I support any outcome that upsets this board.",
        "Your suffering does not prove corruption.",
      ],
      face: [
        "If it was unfair, prove it clearly.",
        "Make the case with facts.",
        "Complaining is not the same as showing what happened.",
      ],
    };

    return pickRandom(byStyle[style] || [
      "Post proof.",
      "That is not evidence.",
      "You still lost.",
    ]);
  }

  const generic = {
    brawler: [
      "This thread would be better with fewer words and more damage.",
      "Say it to somebody’s face.",
      "I have heard enough. Somebody step up.",
    ],
    highflyer: [
      "Half this board is too slow for its own opinions.",
      "This place needs less stomping and more style.",
      "I was bored until I arrived.",
    ],
    technician: [
      "Be specific.",
      "There may be a point here beneath the drama.",
      "Precision would improve this thread.",
    ],
    heel: [
      "Bad thread. Good audience.",
      "You posted this like nobody important would see it.",
      "I enjoy how wrong all of you are.",
    ],
    face: [
      "There is a fair answer here somewhere.",
      "Talk less wildly and this might become useful.",
      "Somebody make a real argument.",
    ],
  };

  return pickRandom(generic[style] || [
    "Interesting.",
    "Go on.",
    "That could have been said better.",
  ]);
}

export default async function handler(req, res) {
  try {
    const db = await getDb();

    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.method === "POST" ? req.body || {} : {};
    const query = req.method === "GET" ? req.query || {} : {};
    const threadId = body.threadId || query.threadId || null;

    let thread = null;

    if (threadId) {
      thread = await db.get(
        `
        SELECT id, title, author, content, created_at
        FROM threads
        WHERE id = ?
        `,
        [threadId]
      );
    } else {
      const activeThreads = await db.all(`
        SELECT
          t.id,
          t.title,
          t.author,
          t.content,
          t.created_at,
          COUNT(r.id) AS reply_count,
          COALESCE(MAX(r.created_at), t.created_at) AS last_activity_at
        FROM threads t
        LEFT JOIN replies r ON r.thread_id = t.id
        GROUP BY t.id
        ORDER BY datetime(last_activity_at) DESC, reply_count DESC, t.id DESC
        LIMIT 8
      `);

      if (activeThreads.length) {
        thread = pickRandom(activeThreads);
      }
    }

    if (!thread) {
      return res.status(404).json({ error: "No thread found" });
    }

    const aiWrestlers = await db.all(`
      SELECT id, name, style, finisher
      FROM wrestlers
      WHERE is_ai = 1
        AND name != ?
    `, [thread.author]);

    if (!aiWrestlers.length) {
      return res.status(404).json({ error: "No AI wrestlers found" });
    }

    const wrestler = pickRandom(aiWrestlers);
    const reply = buildReply(wrestler, thread);

    const result = await db.run(
      `
      INSERT INTO replies (thread_id, author, content)
      VALUES (?, ?, ?)
      `,
      [thread.id, wrestler.name, reply]
    );

    return res.status(200).json({
      success: true,
      threadId: thread.id,
      replyId: result.lastID,
      author: wrestler.name,
      content: reply,
    });
  } catch (error) {
    console.error("API /api/ai/reply error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}