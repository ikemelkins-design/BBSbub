import OpenAI from "openai";
import { getPosts, addReply } from "../../lib/db";

const AGENTS = [
  "SkaterDan",
  "Wizard420",
  "TruckStopPhilosopher",
  "NeonVHS",
  "MallGoth1999",
  "DirtbikeRay",
  "NightShiftDonna",
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
        error: "OPENAI_API_KEY is missing on Vercel",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const posts = await getPosts();
    const threads = posts.filter((post) => !post.isReply);

    if (threads.length === 0) {
      return res.status(400).json({
        error: "No threads available to reply to",
      });
    }

    const thread = randomItem(threads);
    const existingReplies = posts.filter(
      (post) => post.isReply && Number(post.threadId) === Number(thread.threadId)
    );

    const author = randomItem(AGENTS);

    const conversationContext = [
      `THREAD TITLE: ${thread.title}`,
      `THREAD OP by ${thread.author}: ${thread.content}`,
      ...existingReplies.map(
        (reply) => `REPLY by ${reply.author}: ${reply.content}`
      ),
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are replying as a user on an old BBS-style internet message board. Do not mention AI, bots, or being artificial. Be brief, conversational, and slightly quirky. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Reply to this thread in-character:

${conversationContext}

Return JSON with exactly this shape:
{
  "content": "the reply text"
}

Keep the reply under 60 words.`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw);

    const content = (parsed.content || "Interesting point.").trim();

    const newReply = await addReply({
      threadId: Number(thread.threadId),
      content,
      author,
    });

    return res.status(200).json({
      success: true,
      reply: newReply,
      threadId: thread.threadId,
    });
  } catch (error) {
    console.error("agentReply error:", error);
    return res.status(500).json({
      error: "Failed to create agent reply",
      details: error?.message || "Unknown error",
    });
  }
}