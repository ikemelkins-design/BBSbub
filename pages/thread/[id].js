import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ThreadPage() {
  const router = useRouter();
  const { id } = router.query;

  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  async function safeJson(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error("Non-JSON response:", text);
      throw new Error("Invalid JSON response");
    }
  }

  async function fetchThread() {
    if (!id) return;

    try {
      const res = await fetch(`/api/thread/${id}`);
      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.error || "Failed to load thread");
        return;
      }

      setThread(data.thread);
      setReplies(data.replies || []);
    } catch (error) {
      console.error(error);
      setMessage("Error loading thread");
    }
  }

  async function submitReply(e) {
    e.preventDefault();

    if (!author.trim() || !content.trim()) {
      setMessage("Name and reply are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/thread/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          author: author.trim(),
          content: content.trim(),
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.error || "Failed to post reply");
        setLoading(false);
        return;
      }

      setAuthor("");
      setContent("");
      setMessage("Reply posted");
      await fetchThread();
    } catch (error) {
      console.error(error);
      setMessage("Error posting reply");
    }

    setLoading(false);
  }

  async function triggerAiReply() {
    if (!id) return;

    setAiLoading(true);

    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId: id,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.error || "Failed to create AI reply");
        setAiLoading(false);
        return;
      }

      setMessage(`${data.author} replied.`);
      await fetchThread();
    } catch (error) {
      console.error(error);
      setMessage("Error creating AI reply");
    }

    setAiLoading(false);
  }

  useEffect(() => {
    if (!id) return;

    fetchThread();

    const interval = setInterval(() => {
      fetchThread();
    }, 5000);

    const aiInterval = setInterval(async () => {
      if (Math.random() < 0.5) {
        try {
          await fetch("/api/ai/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ threadId: id }),
          });
          fetchThread();
        } catch (error) {
          console.error("AI thread reply failed:", error);
        }
      }
    }, 25000);

    return () => {
      clearInterval(interval);
      clearInterval(aiInterval);
    };
  }, [id]);

  if (!id) {
    return (
      <div
        style={{
          backgroundColor: "black",
          color: "#00ff00",
          minHeight: "100vh",
          fontFamily: "monospace",
          padding: "20px",
        }}
      >
        <p>Loading thread...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "black",
        color: "#00ff00",
        minHeight: "100vh",
        fontFamily: "monospace",
        padding: "20px",
      }}
    >
      <h1>BBSbub Thread</h1>

      <p>
        <Link href="/board" style={{ color: "#00ff00" }}>
          [Back to Board]
        </Link>
      </p>

      <hr style={{ borderColor: "#00ff00" }} />

      {message && <p>{message}</p>}

      {!thread ? (
        <p>Loading...</p>
      ) : (
        <>
          <div
            style={{
              border: "1px solid #00ff00",
              padding: "12px",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>{thread.title}</h2>
            <p style={{ marginBottom: "6px" }}>
              Started by <strong>{thread.author}</strong>
            </p>
            <p style={{ fontSize: "12px", marginTop: 0 }}>
              {thread.created_at}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{thread.content}</p>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <button
              type="button"
              onClick={triggerAiReply}
              disabled={aiLoading}
              style={{
                backgroundColor: "black",
                color: "#00ff00",
                border: "1px solid #00ff00",
                padding: "8px 12px",
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              {aiLoading ? "AI Replying..." : "Trigger AI Reply"}
            </button>
          </div>

          <h3>Replies</h3>

          {replies.length === 0 ? (
            <p>No replies yet.</p>
          ) : (
            replies.map((reply) => (
              <div
                key={reply.id}
                style={{
                  border: "1px solid #00ff00",
                  padding: "10px",
                  marginBottom: "10px",
                  marginLeft: "20px",
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong>{reply.author}</strong>
                </p>
                <p style={{ fontSize: "12px", margin: "5px 0" }}>
                  {reply.created_at}
                </p>
                <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                  {reply.content}
                </p>
              </div>
            ))
          )}

          <hr style={{ borderColor: "#00ff00", margin: "20px 0" }} />

          <h3>Post Reply</h3>

          <form onSubmit={submitReply}>
            <input
              type="text"
              placeholder="Name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={inputStyle}
            />

            <textarea
              placeholder="Write your reply..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              style={inputStyle}
            />

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Posting..." : "Post Reply"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  display: "block",
  marginBottom: "10px",
  width: "100%",
  maxWidth: "700px",
  backgroundColor: "black",
  color: "#00ff00",
  border: "1px solid #00ff00",
  padding: "8px",
  fontFamily: "monospace",
};

const buttonStyle = {
  backgroundColor: "black",
  color: "#00ff00",
  border: "1px solid #00ff00",
  padding: "8px 12px",
  cursor: "pointer",
  fontFamily: "monospace",
};