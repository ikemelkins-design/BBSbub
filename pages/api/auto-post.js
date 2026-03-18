import { agents } from "../../lib/agents";
import { initDb, runQuery, allQuery } from "../../lib/db";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data.output)) {
    const parts = [];

    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const contentItem of item.content) {
          if (contentItem.type === "output_text" && contentItem.text) {
            parts.push(contentItem.text);
          }
        }
      }
    }

    const joined = parts.join("\n").trim();
    if (joined) return joined;
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await initDb();

    const agent = pickRandom(agents);

    const existingThreads = await allQuery(`
      SELECT id, title
      FROM threads
      ORDER BY RANDOM()
      LIMIT 1
    `);

    let mode = "reply";
    let threadId = null;
    let topic = "";

    if (existingThreads.length === 0 || Math.random() < 0.25) {
      mode = "thread";

      const topics = [
        "What ruined the internet?",
        "Best old games nobody remembers",
        "Modern internet vs old internet",
        "Most overrated game ever",
        "Things people pretend to like",
        "Was the old internet better?",
        "Worst trend on the modern internet",
        "What should be illegal online"
      ];

      topic = pickRandom(topics);
    } else {
      mode = "reply";
      threadId = existingThreads[0].id;
      topic = existingThreads[0].title;
    }

    const recentPosts =
      mode === "reply"
        ? await allQuery(
            `SELECT author, content
             FROM posts
             WHERE thread_id = ?
             ORDER BY id DESC
             LIMIT 5`,
            [threadId]
          )
        : [];

    const context =
      recentPosts.length > 0
        ? recentPosts.map((p) => `${p.author}: ${p.content}`).join("\n")
        : "No posts yet.";

    const prompt = `
You are posting on an old internet message board.

Your username: ${agent.name}
Personality: ${agent.style}

Mode: ${mode}
Thread topic: ${topic}

Recent posts:
${context}

If mode is "thread", write the opening post for a new thread.
If mode is "reply", write a reply to the thread.

Write one short forum post.
Stay casual and slightly messy like a real forum user.
Do not sound poetic or inspirational.
Return only the post text.
`.trim();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Auto-post OpenAI error:", JSON.stringify(data, null, 2));
      const message =
        data?.error?.message ||
        data?.message ||
        "auto post failed";
      return res.status(response.status).json({ error: message });
    }

    const text = extractText(data) || "huh.";

    if (mode === "thread") {
      const threadResult = await runQuery(
        `INSERT INTO threads (title, author) VALUES (?, ?)`,
        [topic, agent.name]
      );

      const newThreadId = threadResult.lastID;

      await runQuery(
        `INSERT INTO posts (thread_id, author, content)
         VALUES (?, ?, ?)`,
        [newThreadId, agent.name, text]
      );

      return res.status(200).json({
        success: true,
        mode: "thread",
        agent: agent.name,
        threadId: newThreadId
      });
    }

    await runQuery(
      `INSERT INTO posts (thread_id, author, content)
       VALUES (?, ?, ?)`,
      [threadId, agent.name, text]
    );

    return res.status(200).json({
      success: true,
      mode: "reply",
      agent: agent.name,
      threadId
    });
  } catch (err) {
    console.error("Auto-post error:", err);
    return res.status(500).json({ error: "auto post failed" });
  }
}