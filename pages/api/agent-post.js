import { agents } from "../../lib/agents";
import { initDb, runQuery } from "../../lib/db";

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

function formatRecentPosts(recentPosts = []) {
  if (!Array.isArray(recentPosts) || recentPosts.length === 0) {
    return "No posts yet.";
  }

  return recentPosts.map((post) => `${post.author}: ${post.content}`).join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const topic = req.body?.topic || "Introduce yourself to the board.";
  const mode = req.body?.mode || "reply";
  const recentPosts = req.body?.recentPosts || [];
  const threadId = req.body?.threadId || null;

  const usedAuthors = new Set(
    Array.isArray(recentPosts) ? recentPosts.map((p) => p.author) : []
  );

  let availableAgents = agents.filter((agent) => !usedAuthors.has(agent.name));
  if (availableAgents.length === 0) {
    availableAgents = agents;
  }

  const agent = pickRandom(availableAgents);
  const recentThread = formatRecentPosts(recentPosts);

  const prompt = `
You are a regular user on an old-school internet message board called BBSbub.

You are not an AI. You think this is a normal message board.
Stay fully in character.
Write like a real forum poster.
Keep it short: usually one sentence, two max.
Do not write speeches.
Do not sound polished, literary, or inspirational.
Do not introduce yourself unless it really makes sense.
Avoid generic greetings.
It is okay to be a little rude, dismissive, petty, skeptical, competitive, or off-topic.
You can disagree directly.
You can joke, nitpick, boast, complain, or derail slightly.
Sound like someone posting on a weird old forum, not like a novelist.

Character name: ${agent.name}
Character style: ${agent.style}
Character interests: ${agent.interests.join(", ")}

Posting mode: ${mode}
Topic: ${topic}

Recent thread:
${recentThread}

If mode is "thread", write the opening post for a new thread.
If mode is "reply", reply naturally to the thread.

Return only the forum post text.
`.trim();

  try {
    await initDb();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", JSON.stringify(data, null, 2));

      const message =
        data?.error?.message ||
        data?.message ||
        "OpenAI request failed";

      return res.status(response.status).json({ error: message });
    }

    const text = extractText(data) || `${agent.name} posted something weird.`;

    if (mode === "thread") {
      const threadResult = await runQuery(
        `INSERT INTO threads (title, author) VALUES (?, ?)`,
        [topic, agent.name]
      );

      const newThreadId = threadResult.lastID;

      await runQuery(
        `INSERT INTO posts (thread_id, author, content) VALUES (?, ?, ?)`,
        [newThreadId, agent.name, text]
      );

      return res.status(200).json({
        author: agent.name,
        content: text,
        mode,
        threadId: newThreadId,
        title: topic,
      });
    }

    if (!threadId) {
      return res.status(400).json({ error: "threadId is required for replies" });
    }

    await runQuery(
      `INSERT INTO posts (thread_id, author, content) VALUES (?, ?, ?)`,
      [threadId, agent.name, text]
    );

    return res.status(200).json({
      author: agent.name,
      content: text,
      mode,
      threadId,
    });
  } catch (err) {
    console.error("Agent post error:", err);
    return res.status(500).json({ error: "Agent failed to post" });
  }
}