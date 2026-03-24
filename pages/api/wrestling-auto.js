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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS wrestlers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        style TEXT,
        power INTEGER DEFAULT 5,
        speed INTEGER DEFAULT 5,
        charisma INTEGER DEFAULT 5,
        stamina INTEGER DEFAULT 5,
        hp INTEGER DEFAULT 35,
        finisher TEXT,
        created_by TEXT DEFAULT 'user',
        is_ai INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wrestler1_id INTEGER NOT NULL,
        wrestler2_id INTEGER NOT NULL,
        winner_id INTEGER,
        loser_id INTEGER,
        finish_text TEXT,
        thread_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  return db;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function styleBonus(style) {
  switch ((style || "").toLowerCase()) {
    case "brawler":
      return { power: 2, stamina: 1 };
    case "high flyer":
      return { speed: 2, charisma: 1 };
    case "technician":
      return { speed: 1, stamina: 1, charisma: 1 };
    case "showboat":
      return { charisma: 2, speed: 1 };
    case "monster":
      return { power: 3 };
    default:
      return {};
  }
}

function scoreWrestler(w) {
  const bonus = styleBonus(w.style);

  const power = (w.power || 5) + (bonus.power || 0);
  const speed = (w.speed || 5) + (bonus.speed || 0);
  const charisma = (w.charisma || 5) + (bonus.charisma || 0);
  const stamina = (w.stamina || 5) + (bonus.stamina || 0);
  const hp = w.hp || 35;

  return (
    power * 1.35 +
    speed * 1.15 +
    charisma * 0.85 +
    stamina * 1.2 +
    hp * 0.2 +
    randomInt(1, 12)
  );
}

function pickOpeningLine(w1, w2) {
  const lines = [
    `${w1.name} and ${w2.name} met in a match that got heated almost immediately.`,
    `The crowd came alive once ${w1.name} and ${w2.name} started throwing offense.`,
    `${w1.name} squared off with ${w2.name} in a fight that felt personal before it even really got going.`,
    `Nobody expected a quiet contest once ${w1.name} and ${w2.name} stepped into the ring together.`,
  ];

  return lines[randomInt(0, lines.length - 1)];
}

function pickMiddleLine(w1, w2, winner) {
  const lines = [
    `${winner.name} weathered a rough stretch and turned things around when it mattered.`,
    `${w1.name} and ${w2.name} traded momentum until one opening changed everything.`,
    `It looked evenly matched for a while, then the pace shifted hard in one direction.`,
    `Both wrestlers had moments, but one of them finally took control and never gave it back.`,
  ];

  return lines[randomInt(0, lines.length - 1)];
}

function pickFinish(winner, loser) {
  const finisher = winner.finisher || "finisher";

  const lines = [
    `${winner.name} ended it with the ${finisher} and pinned ${loser.name} clean.`,
    `${loser.name} nearly escaped, but ${winner.name} shut the door with the ${finisher}.`,
    `${winner.name} caught ${loser.name} at exactly the right moment and landed the ${finisher} for the win.`,
    `${winner.name} crushed the comeback and finished ${loser.name} with the ${finisher}.`,
  ];

  return lines[randomInt(0, lines.length - 1)];
}

function pickTrashTalk(winner, loser) {
  const lines = [
    `${winner.name}: "That ring belongs to me now."`,
    `${winner.name}: "Tell ${loser.name} to try harder next time."`,
    `${loser.name}: "Run it back. I got robbed."`,
    `${loser.name}: "One lucky break doesn't make you better."`,
  ];

  return lines[randomInt(0, lines.length - 1)];
}

async function chooseTwoWrestlers(db) {
  const wrestlers = await db.all(`
    SELECT *
    FROM wrestlers
    ORDER BY RANDOM()
    LIMIT 2
  `);

  if (wrestlers.length < 2) {
    throw new Error("Not enough wrestlers in database");
  }

  return wrestlers;
}

async function simulateMatch(db) {
  const [w1, w2] = await chooseTwoWrestlers(db);

  const score1 = scoreWrestler(w1);
  const score2 = scoreWrestler(w2);

  const winner = score1 >= score2 ? w1 : w2;
  const loser = winner.id === w1.id ? w2 : w1;

  const title = `Match Result: ${w1.name} vs ${w2.name}`;
  const opening = pickOpeningLine(w1, w2);
  const middle = pickMiddleLine(w1, w2, winner);
  const finish = pickFinish(winner, loser);

  const recap = `${opening}

${middle}

${finish}`;

  const threadResult = await db.run(
    `
    INSERT INTO threads (title, author, content)
    VALUES (?, ?, ?)
    `,
    [title, "RINGSIDE_BOT", recap]
  );

  await db.run(
    `
    INSERT INTO replies (thread_id, author, content)
    VALUES (?, ?, ?)
    `,
    [threadResult.lastID, winner.name, pickTrashTalk(winner, loser)]
  );

  const matchResult = await db.run(
    `
    INSERT INTO matches
    (wrestler1_id, wrestler2_id, winner_id, loser_id, finish_text, thread_id)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [w1.id, w2.id, winner.id, loser.id, finish, threadResult.lastID]
  );

  return {
    success: true,
    matchId: matchResult.lastID,
    threadId: threadResult.lastID,
    wrestler1: w1.name,
    wrestler2: w2.name,
    winner: winner.name,
    loser: loser.name,
    finish,
    recap,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = await getDb();

    if (req.method === "GET") {
      const wrestlers = await db.all(`
        SELECT *
        FROM wrestlers
        ORDER BY name ASC
      `);

      const recentMatches = await db.all(`
        SELECT
          m.id,
          m.created_at,
          m.finish_text,
          m.thread_id,
          w1.name AS wrestler1_name,
          w2.name AS wrestler2_name,
          ww.name AS winner_name,
          ll.name AS loser_name
        FROM matches m
        LEFT JOIN wrestlers w1 ON m.wrestler1_id = w1.id
        LEFT JOIN wrestlers w2 ON m.wrestler2_id = w2.id
        LEFT JOIN wrestlers ww ON m.winner_id = ww.id
        LEFT JOIN wrestlers ll ON m.loser_id = ll.id
        ORDER BY m.id DESC
        LIMIT 10
      `);

      return res.status(200).json({
        wrestlers,
        recentMatches,
      });
    }

    const result = await simulateMatch(db);
    return res.status(200).json(result);
  } catch (error) {
    console.error("WRESTLING AUTO ERROR:", error);
    return res.status(500).json({
      error: error.message || "Wrestling auto failed",
    });
  }
}