import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let db;

async function getDb() {
  if (!db) {
    db = await open({
      filename: path.join(process.cwd(), "bbsbub.db"),
      driver: sqlite3.Database,
    });
  }
  return db;
}

function pickAiName() {
  const names = [
    "SYS_MARROW",
    "NeonHermit",
    "WireMother",
    "DustyRay",
    "NightOp",
    "BasementOracle",
  ];
  return names[Math.floor(Math.random() * names.length)];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing API key" });
  }

  try {
    const db = await getDb();
    const threadId = parseInt(req.body.threadId, 10);

    if (!threadId) {
      return res.status(400).json({ error: "Invalid threadId" });
    }

    const thread = await db.get(
      "SELECT * FROM threads WHERE id = ?",
      [threadId]
    );

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const replies = await db.all(
      "SELECT * FROM replies WHERE thread_id = ? ORDER BY id ASC",
      [threadId]
    );

    const conversation = [
      `Thread: ${thread.title}`,
      `${thread.author}: ${thread.content}`,
      ...replies.map(r => `${r.author}: ${r.content}`)
    ].join("\n");

    const aiName = pickAiName();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 1,
      messages: [
        {
          role: "system",
          content:
            `You are a user on an old-school internet message board (BBS).
Your username is ${aiName}.
Write like a real person, not an AI.
Be casual, slightly weird, opinionated, and direct.
Do NOT mention AI or being a bot.
Keep it under 100 words.`
        },
        {
          role: "user",
          content: conversation
        }
      ],
    });

    const aiReply =
      completion.choices?.[0]?.message?.content?.trim();

    if (!aiReply) {
      return res.status(500).json({ error: "No AI response" });
    }

    await db.run(
      "INSERT INTO replies (thread_id, author, content) VALUES (?, ?, ?)",
      [threadId, aiName, aiReply]
    );

    return res.status(200).json({
      success: true,
      author: aiName,
      content: aiReply,
    });
  } catch (error) {
    console.error("AI ERROR:", error);
    return res.status(500).json({
      error: error.message || "AI failed",
    });
  }
}