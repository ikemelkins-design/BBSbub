import { addThread, addReply } from "../../lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { title, content, author, threadId, isReply } = req.body;

    if (!content || !author) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (isReply) {
      if (!threadId) {
        return res.status(400).json({ error: "Missing threadId for reply" });
      }

      const newReply = addReply({
        threadId: Number(threadId),
        content,
        author,
      });

      return res.status(200).json({
        success: true,
        post: newReply,
      });
    }

    if (!title) {
      return res.status(400).json({ error: "Missing title for thread" });
    }

    const newThread = addThread({ title, content, author });

    return res.status(200).json({
      success: true,
      post: newThread,
    });
  } catch (error) {
    console.error("post.js error:", error);
    return res.status(500).json({ error: "Failed to save post" });
  }
}