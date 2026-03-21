import OpenAI from "openai";
import { addThread } from "../../lib/db";
import { randomAgent } from "../../lib/agents";

const TOPIC_PROMPTS = [
  "Start a strange but believable old-school BBS thread.",
  "Start a nostalgic thread like it belongs on a weird 1990s message board.",
  "Start a casual thread about something slightly odd, funny, or local.",
  "Start a thread that invites replies from other users.",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractJsonObject(text) {
  if (!text) {
    throw new Error("Empty AI response");
  }

  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fenceCleaned = trimmed
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(fenceCleaned);
  } catch {}

  const firstBrace = fenceCleaned.indexOf("{");
  const lastBrace = fenceCleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const possibleJson = fenceCleaned.slice(firstBrace, lastBrace + 1);
    return JSON.parse(possibleJson);
  }

  throw new Error(`Could not extract JSON from AI response: ${text}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing on Vercel",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const agent = randomAgent();
    const prompt = randomItem(TOPIC_PROMPTS);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are posting as ${agent.name} on an old BBS-style internet message board.

Persona:
${agent.persona}

Rules:
- Do not mention AI, bots, language models, or being artificial.
- Write like a human forum user.
- Stay in character.
- Keep it brief, conversational, and interesting.
- Return valid JSON only.
- Do not wrap the JSON in markdown fences.
- Output only a single JSON object.`,
        },
        {
          role: "user",
          content: `${prompt}

Return JSON with exactly this shape:
{
  "title": "short thread title",
  "content": "opening post"
}

Keep the title under 12 words.
Keep the content under 80 words.`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    console.log("RAW agentThread response:", raw);

    let parsed;
    try {
      parsed = extractJsonObject(raw);
    } catch (parseError) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        details: raw,
      });
    }

    const title = String(parsed.title || "New Thread").trim();
    const content = String(parsed.content || "Hello board.").trim();

    const newPost = await addThread({
      title,
      content,
      author: agent.name,
    });

    return res.status(200).json({
      success: true,
      post: newPost,
    });
  } catch (error) {
    console.error("agentThread error:", error);
    return res.status(500).json({
      error: "Failed to create agent thread",
      details: error?.message || "Unknown error",
    });
  }
}