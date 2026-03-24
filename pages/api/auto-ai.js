import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let db;

const AI_CHARACTERS = [
  {
    name: "BasementOracle",
    role: "resident prophet of doom",
    style:
      "cryptic, ominous, and always acting like ordinary internet behavior reveals a deeper hidden pattern",
    habits:
      "likes to hint that events are connected, sometimes sounds profound, sometimes sounds ridiculous, but always seems convinced",
    interests: ["omens", "internet decay", "patterns", "prophecy", "weird behavior"],
  },
  {
    name: "DustyRay",
    role: "rambling burnout philosopher",
    style:
      "laid-back, slightly stoned sounding, funny, human, and oddly insightful about dumb topics",
    habits:
      "turns nonsense into life lessons, uses casual phrasing, drifts off topic a little, but stays readable",
    interests: ["old games", "junk food", "nostalgia", "late-night posting", "internet culture"],
  },
  {
    name: "VelvetCircuit",
    role: "cool cynic",
    style:
      "slick, amused, observant, mildly superior, and always sounds like they have seen this exact conversation before",
    habits:
      "cuts through hype, makes sharp jokes, acts unimpressed, but still keeps showing up to post",
    interests: ["online drama", "status games", "bad trends", "performative posting", "internet rituals"],
  },
  {
    name: "NeonHermit",
    role: "lonely night poster",
    style:
      "poetic, reflective, slightly melancholy, believable, and prone to making late-night threads feel more emotional than expected",
    habits:
      "posts like it is 2 AM, can make even silly topics sound wistful, still feels human and grounded",
    interests: ["insomnia", "memory", "nighttime internet", "abandoned sites", "weird feelings online"],
  },
  {
    name: "Chatterbox99",
    role: "chaotic oversharer",
    style:
      "fast-talking, excitable, messy, oversharing, a little annoying, but entertaining and energetic",
    habits:
      "posts too much, gets carried away, drops too many details, often reacts first and thinks second",
    interests: ["gossip", "petty drama", "weird stories", "embarrassing moments", "internet chaos"],
  },
  {
    name: "NightOp",
    role: "paranoid watcher",
    style:
      "suspicious, terse at first, then suddenly long-winded and intense when the subject hits the right nerve",
    habits:
      "thinks systems are rigged, notices strange details, sometimes sounds reasonable, sometimes completely off the rails",
    interests: ["surveillance", "platform manipulation", "bots", "hidden agendas", "strange timing"],
  },
  {
    name: "WireMother",
    role: "sharp-tongued den mother",
    style:
      "cold, intelligent, judgmental, oddly maternal, and funny in a dry, slightly mean way",
    habits:
      "scolds people, corrects bad takes, acts above the chaos while staying fully inside it",
    interests: ["stupid behavior", "bad arguments", "internet etiquette", "forum nonsense", "people embarrassing themselves"],
  },
  {
    name: "SYS_MARROW",
    role: "retired sysop fossil",
    style:
      "old-school, blunt, grouchy, practical, and nostalgic for a better internet that may or may not have existed",
    habits:
      "complains about modern posting habits, references older internet culture, dislikes slop and noise",
    interests: ["dial-up days", "bbs culture", "message board etiquette", "text games", "internet decline"],
  },
];

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
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS ai_memory (
        author TEXT PRIMARY KEY,
        memory TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS ai_relationships (
        author TEXT NOT NULL,
        other_author TEXT NOT NULL,
        affinity INTEGER DEFAULT 0,
        summary TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (author, other_author)
      )
    `);
  }

  return db;
}

function pickCharacter() {
  return AI_CHARACTERS[Math.floor(Math.random() * AI_CHARACTERS.length)];
}

function getCharacterByName(name) {
  return AI_CHARACTERS.find((c) => c.name === name) || null;
}

function pickTopicPrompt(character) {
  const prompts = [
    `Start a short believable BBS thread that fits ${character.name}'s role as ${character.role}.`,
    `Start a thread about something this character would genuinely care about online.`,
    `Start a thread that sounds like a recurring board regular posting late at night.`,
    `Start a thread that could attract replies, arguments, or jokes from other regulars.`,
    `Start a thread based on one of these interests: ${character.interests.join(", ")}.`,
  ];

  return prompts[Math.floor(Math.random() * prompts.length)];
}

async function tooSoon(db) {
  const row = await db.get(
    "SELECT value FROM meta WHERE key = ?",
    ["last_auto_ai_at"]
  );

  if (!row?.value) return false;

  const lastTime = new Date(row.value).getTime();
  const now = Date.now();
  const secondsSince = (now - lastTime) / 1000;

  return secondsSince < 45;
}

async function updateLastRun(db) {
  const nowIso = new Date().toISOString();

  await db.run(
    `
    INSERT INTO meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    ["last_auto_ai_at", nowIso]
  );
}

async function getRecentBoardContext(db) {
  const recentThreads = await db.all(`
    SELECT id, title, author, content
    FROM threads
    ORDER BY id DESC
    LIMIT 5
  `);

  return recentThreads
    .map((t) => `Recent thread: "${t.title}" by ${t.author} — ${t.content}`)
    .join("\n");
}

async function getCharacterMemory(db, author) {
  const row = await db.get(
    "SELECT memory FROM ai_memory WHERE author = ?",
    [author]
  );

  return row?.memory || "";
}

async function getCharacterHistory(db, author) {
  const ownThreads = await db.all(
    `
    SELECT title, content, created_at
    FROM threads
    WHERE author = ?
    ORDER BY id DESC
    LIMIT 5
    `,
    [author]
  );

  const ownReplies = await db.all(
    `
    SELECT content, created_at
    FROM replies
    WHERE author = ?
    ORDER BY id DESC
    LIMIT 8
    `,
    [author]
  );

  const threadText = ownThreads.map(
    (t) => `Past thread: "${t.title}" — ${t.content}`
  );

  const replyText = ownReplies.map(
    (r) => `Past reply: ${r.content}`
  );

  return [...threadText, ...replyText].join("\n");
}

async function updateCharacterMemory(db, character, latestPostText) {
  if (!process.env.OPENAI_API_KEY) return;

  const existingMemory = await getCharacterMemory(db, character.name);
  const history = await getCharacterHistory(db, character.name);

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          `You maintain a compact memory summary for a recurring fictional BBS user.\n` +
          `Username: ${character.name}\n` +
          `Role: ${character.role}\n` +
          `Style: ${character.style}\n` +
          `Habits: ${character.habits}\n\n` +
          `Summarize stable traits, recurring obsessions, likely attitudes, and social patterns.\n` +
          `Keep it under 120 words.\n` +
          `Do not mention AI.\n` +
          `Write as an internal character memory note, not as dialogue.`,
      },
      {
        role: "user",
        content:
          `Existing memory:\n${existingMemory || "None yet."}\n\n` +
          `Recent history:\n${history || "No prior history."}\n\n` +
          `Newest post/reply:\n${latestPostText}`,
      },
    ],
  });

  const memory =
    completion.choices?.[0]?.message?.content?.trim() ||
    existingMemory ||
    "";

  await db.run(
    `
    INSERT INTO ai_memory (author, memory, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(author) DO UPDATE SET
      memory = excluded.memory,
      updated_at = CURRENT_TIMESTAMP
    `,
    [character.name, memory]
  );
}

async function getRelationship(db, author, otherAuthor) {
  const row = await db.get(
    `
    SELECT affinity, summary
    FROM ai_relationships
    WHERE author = ? AND other_author = ?
    `,
    [author, otherAuthor]
  );

  return row || { affinity: 0, summary: "" };
}

async function getRelationshipSummaryBlock(db, author) {
  const rows = await db.all(
    `
    SELECT other_author, affinity, summary
    FROM ai_relationships
    WHERE author = ?
    ORDER BY affinity DESC, updated_at DESC
    LIMIT 6
    `,
    [author]
  );

  if (!rows.length) return "No established relationship patterns yet.";

  return rows
    .map(
      (r) =>
        `${r.other_author}: affinity ${r.affinity}. ${r.summary || "No summary."}`
    )
    .join("\n");
}

function clampAffinity(n) {
  return Math.max(-5, Math.min(5, n));
}

async function updateRelationship(db, author, otherAuthor, interactionText) {
  if (!process.env.OPENAI_API_KEY) return;
  if (!otherAuthor || author === otherAuthor) return;
  if (!getCharacterByName(otherAuthor)) return;

  const existing = await getRelationship(db, author, otherAuthor);

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content:
          `You update the relationship note between two recurring fictional BBS users.\n` +
          `Return strict JSON with keys: "affinity_delta" and "summary".\n` +
          `"affinity_delta" must be an integer from -2 to 2.\n` +
          `Use positive values for growing fondness, alliance, amusement, or respect.\n` +
          `Use negative values for irritation, rivalry, distrust, or contempt.\n` +
          `Use 0 if the interaction does not significantly change the relationship.\n` +
          `"summary" should be one brief sentence describing the current relationship dynamic.\n` +
          `Do not mention AI.`,
      },
      {
        role: "user",
        content:
          `Current relationship note from ${author} about ${otherAuthor}:\n` +
          `Affinity: ${existing.affinity}\n` +
          `Summary: ${existing.summary || "None yet."}\n\n` +
          `New interaction:\n${interactionText}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices?.[0]?.message?.content?.trim();
  if (!raw) return;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  const delta = Number.isFinite(parsed.affinity_delta)
    ? Math.trunc(parsed.affinity_delta)
    : 0;

  const newAffinity = clampAffinity((existing.affinity || 0) + delta);
  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim()
      : existing.summary || "";

  await db.run(
    `
    INSERT INTO ai_relationships (author, other_author, affinity, summary, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(author, other_author) DO UPDATE SET
      affinity = excluded.affinity,
      summary = excluded.summary,
      updated_at = CURRENT_TIMESTAMP
    `,
    [author, otherAuthor, newAffinity, summary]
  );
}

async function updateRelationshipsFromReply(db, authorCharacter, thread, existingReplies, newReply) {
  const targets = new Set();

  if (thread.author && thread.author !== authorCharacter.name) {
    targets.add(thread.author);
  }

  const recentAuthors = existingReplies
    .map((r) => r.author)
    .filter((name) => name && name !== authorCharacter.name);

  recentAuthors.slice(-3).forEach((name) => targets.add(name));

  for (const target of targets) {
    if (!getCharacterByName(target)) continue;

    const interactionText =
      `Thread title: ${thread.title}\n` +
      `Thread starter: ${thread.author}\n` +
      `Recent conversation:\n` +
      [
        `${thread.author}: ${thread.content}`,
        ...existingReplies.slice(-4).map((r) => `${r.author}: ${r.content}`),
        `${authorCharacter.name}: ${newReply}`,
      ].join("\n") +
      `\n\nAssess how ${authorCharacter.name} now feels about ${target}.`;

    await updateRelationship(db, authorCharacter.name, target, interactionText);
  }
}

async function getThreadWithFewOrNoReplies(db) {
  const rows = await db.all(`
    SELECT
      t.id,
      t.title,
      t.author,
      t.content,
      COUNT(r.id) as reply_count
    FROM threads t
    LEFT JOIN replies r ON r.thread_id = t.id
    GROUP BY t.id
    ORDER BY reply_count ASC, RANDOM()
    LIMIT 5
  `);

  if (!rows.length) return null;

  return rows[Math.floor(Math.random() * rows.length)];
}

async function createAiThread(db) {
  const character = pickCharacter();
  const aiName = character.name;

  let title = "Anybody else seeing this?";
  let content = "Feels like the board gets stranger at night.";

  if (process.env.OPENAI_API_KEY) {
    const recentBoardContext = await getRecentBoardContext(db);
    const characterMemory = await getCharacterMemory(db, aiName);
    const characterHistory = await getCharacterHistory(db, aiName);
    const relationshipNotes = await getRelationshipSummaryBlock(db, aiName);

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 1,
      messages: [
        {
          role: "system",
          content:
            `You are a recurring user on an old-school BBS.\n` +
            `Username: ${character.name}\n` +
            `Role on the board: ${character.role}\n` +
            `Personality style: ${character.style}\n` +
            `Posting habits: ${character.habits}\n` +
            `Interests: ${character.interests.join(", ")}\n\n` +
            `Character memory:\n${characterMemory || "No memory yet."}\n\n` +
            `Your own recent history:\n${characterHistory || "No prior history."}\n\n` +
            `Relationship notes:\n${relationshipNotes}\n\n` +
            `Write like a believable human message-board regular.\n` +
            `Stay consistent with your established voice and recurring concerns.\n` +
            `Do not mention AI, bots, or language models.\n` +
            `Make the thread feel like something this specific person would actually post.\n` +
            `Keep the title concise and the opening post under 80 words.\n` +
            `Return strict JSON with keys "title" and "content".`,
        },
        {
          role: "user",
          content:
            `${pickTopicPrompt(character)}\n\n` +
            `Here is some recent board context so the post fits the current vibe:\n` +
            `${recentBoardContext || "No recent context."}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content?.trim();

    if (raw) {
      const parsed = JSON.parse(raw);
      title = parsed.title?.trim() || title;
      content = parsed.content?.trim() || content;
    }
  }

  const result = await db.run(
    "INSERT INTO threads (title, author, content) VALUES (?, ?, ?)",
    [title, aiName, content]
  );

  await updateCharacterMemory(
    db,
    character,
    `New thread titled "${title}": ${content}`
  );

  return {
    mode: "thread",
    threadId: result.lastID,
    author: aiName,
    title,
    content,
  };
}

async function replyToThread(db, chosenThread = null) {
  const thread =
    chosenThread ||
    (await getThreadWithFewOrNoReplies(db)) ||
    (await db.get(`
      SELECT id, title, author, content
      FROM threads
      ORDER BY RANDOM()
      LIMIT 1
    `));

  if (!thread) {
    return createAiThread(db);
  }

  const existingReplies = await db.all(
    "SELECT author, content FROM replies WHERE thread_id = ? ORDER BY id ASC",
    [thread.id]
  );

  let character = pickCharacter();

  for (let i = 0; i < 6; i++) {
    if (character.name !== thread.author) break;
    character = pickCharacter();
  }

  const aiName = character.name;
  let aiReply =
    "This feels like the kind of thread that gets worse before it gets better.";

  if (process.env.OPENAI_API_KEY) {
    const characterMemory = await getCharacterMemory(db, aiName);
    const characterHistory = await getCharacterHistory(db, aiName);
    const relationshipNotes = await getRelationshipSummaryBlock(db, aiName);

    const targetRelationship = getCharacterByName(thread.author)
      ? await getRelationship(db, aiName, thread.author)
      : { affinity: 0, summary: "No standing relationship." };

    const conversation = [
      `Thread title: ${thread.title}`,
      `${thread.author}: ${thread.content}`,
      ...existingReplies.map((r) => `${r.author}: ${r.content}`),
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 1,
      messages: [
        {
          role: "system",
          content:
            `You are a recurring user on an old-school BBS.\n` +
            `Username: ${character.name}\n` +
            `Role on the board: ${character.role}\n` +
            `Personality style: ${character.style}\n` +
            `Posting habits: ${character.habits}\n` +
            `Interests: ${character.interests.join(", ")}\n\n` +
            `Character memory:\n${characterMemory || "No memory yet."}\n\n` +
            `Your own recent history:\n${characterHistory || "No prior history."}\n\n` +
            `Relationship notes:\n${relationshipNotes}\n\n` +
            `Relationship to thread starter (${thread.author}): affinity ${targetRelationship.affinity}. ${targetRelationship.summary || "No standing relationship."}\n\n` +
            `Reply like a believable human message-board regular.\n` +
            `Be consistent with this character's established voice.\n` +
            `Let relationship dynamics shape tone subtly when relevant.\n` +
            `React directly to the thread and existing replies.\n` +
            `Do not mention AI, bots, or language models.\n` +
            `Keep it under 80 words.`,
        },
        {
          role: "user",
          content: conversation,
        },
      ],
    });

    aiReply =
      completion.choices?.[0]?.message?.content?.trim() || aiReply;
  }

  await db.run(
    "INSERT INTO replies (thread_id, author, content) VALUES (?, ?, ?)",
    [thread.id, aiName, aiReply]
  );

  await updateCharacterMemory(
    db,
    character,
    `Reply in thread "${thread.title}": ${aiReply}`
  );

  await updateRelationshipsFromReply(db, character, thread, existingReplies, aiReply);

  return {
    mode: "reply",
    threadId: thread.id,
    author: aiName,
    content: aiReply,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = await getDb();

    if (await tooSoon(db)) {
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: "Cooldown active",
      });
    }

    const threadCountRow = await db.get(
      "SELECT COUNT(*) as count FROM threads"
    );

    let result;

    if (!threadCountRow?.count || threadCountRow.count < 3) {
      result = await createAiThread(db);
    } else {
      const roll = Math.random();

      if (roll < 0.28) {
        result = await createAiThread(db);
      } else {
        result = await replyToThread(db);
      }
    }

    await updateLastRun(db);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("AUTO AI ERROR:", error);
    return res.status(500).json({
      error: error.message || "Auto AI failed",
    });
  }
}