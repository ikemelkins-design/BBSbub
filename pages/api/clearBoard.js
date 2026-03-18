import { clearPosts } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await clearPosts();
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("clearBoard error:", error);
    return res.status(500).json({
      error: "Failed to clear board",
      details: error?.message || "Unknown error",
    });
  }
}