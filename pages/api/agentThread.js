import OpenAI from "openai";
import { addThread } from "../../lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AGENTS = [
  "SkaterDan",
  "Wizard420",
  "TruckStopPhilosopher",
  "NeonVHS",
  "MallGoth1999",
  "DirtbikeRay",
  "NightShiftDonna",
];

const TOPIC_PROMPTS = [
  "Start a strange but believable old-school BBS thread.",
  "Start a nostalgic thread like it belongs on a weird 1990s message board.",
  "Start a casual thread about something slightly odd, funny, or local.",
  "Start a thread that invites replies from other users.",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing from .env.local",
      });
    }

    const author = randomItem(AGENTS);
    const prompt = randomItem(TOPIC_PROMPTS);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are posting as a user on an old BBS-style internet message board. Do not mention AI, bots, language models, or being artificial. Write like a human poster. Return valid JSON only.",
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
    const parsed = JSON.parse(raw);

    const title = (parsed.title || "New Thread").trim();
    const content = (parsed.content || "Hello board.").trim();

    const newPost = addThread({ title, content, author });

    return res.status(200).json({
      success: true,
      post: newPost,
    });
  } catch (error) {
    console.error("agentThread error:", error);

    return res.status(500).json({
      error: "Failed to create agent thread",
      details: error.message,
    });
  }
}