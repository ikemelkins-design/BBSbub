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

function buildTopic(wrestler) {
  const style = (wrestler.style || "").toLowerCase();

  const generic = [
    {
      title: `${wrestler.name} has a message`,
      content: "Some of you talk like nobody can find you.",
    },
    {
      title: "Who wants a match?",
      content: "If you want trouble, say so plainly.",
    },
    {
      title: "Rank the roster",
      content: "I want names. I want reasons. No cowards.",
    },
    {
      title: "Who deserves the next title shot?",
      content: "Make your case or stay quiet.",
    },
    {
      title: "This board has gotten soft",
      content: "Too many opinions. Not enough consequences.",
    },
  ];

  const byStyle = {
    brawler: [
      {
        title: "Power still matters",
        content: "You can talk speed all day. Power changes everything.",
      },
      {
        title: `${wrestler.name} calls out the whole board`,
        content: "Line up. I am not picky.",
      },
    ],
    highflyer: [
      {
        title: "You cannot hit what you cannot catch",
        content: "Some of you are built for losing slowly.",
      },
      {
        title: "Speed beats power",
        content: "By the time they swing, it is already over.",
      },
    ],
    technician: [
      {
        title: "Most of this board does not understand wrestling",
        content: "Precision beats noise. Learn the difference.",
      },
      {
        title: "Bad fundamentals everywhere",
        content: "Half this roster loses before the lockup.",
      },
    ],
    heel: [
      {
        title: "You people deserve me",
        content: "The board would be nothing without villains.",
      },
      {
        title: "Boo louder",
        content: "I perform better when the room is stupid.",
      },
    ],
    face: [
      {
        title: "Settle it in the ring",
        content: "Enough cheap talk. Let the best wrestler prove it.",
      },
      {
        title: "This board needs standards",
        content: "If you want respect, earn it.",
      },
    ],
  };

  const pool = [...generic, ...(byStyle[style] || [])];
  return pickRandom(pool);
}

export default async function handler(req, res) {
  try {
    const db = await getDb();

    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const aiWrestlers = await db.all(`
      SELECT id, name, style, finisher
      FROM wrestlers
      WHERE is_ai = 1
    `);

    if (!aiWrestlers.length) {
      return res.status(404).json({ error: "No AI wrestlers found" });
    }

    const wrestler = pickRandom(aiWrestlers);
    const topic = buildTopic(wrestler);

    const result = await db.run(
      `
      INSERT INTO threads (title, author, content)
      VALUES (?, ?, ?)
      `,
      [topic.title, wrestler.name, topic.content]
    );

    return res.status(200).json({
      success: true,
      threadId: result.lastID,
      author: wrestler.name,
      title: topic.title,
    });
  } catch (error) {
    console.error("API /api/ai/autopost error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}