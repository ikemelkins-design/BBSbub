import { getPosts } from "../../lib/db";

export default function handler(req, res) {
  try {
    const posts = getPosts();
    return res.status(200).json({ posts });
  } catch (error) {
    console.error("getPosts error:", error);
    return res.status(500).json({
      error: "Failed to fetch posts",
      details: error?.message || "Unknown error",
      stack: error?.stack || null,
    });
  }
}