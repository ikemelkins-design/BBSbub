import { useEffect, useState } from "react";

export default function BoardPage() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentReplyLoading, setAgentReplyLoading] = useState(false);
  const [replyForms, setReplyForms] = useState({});

  async function fetchPosts() {
    try {
      const res = await fetch("/api/getPosts");
      const text = await res.text();

      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { posts: [] };
      }

      if (!res.ok) {
        console.error("getPosts failed:", data);
        alert(data.error || "getPosts failed");
        return [];
      }

      const posts = data.posts || [];
      setPosts(posts);
      return posts;
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      alert("Failed to fetch posts.");
      return [];
    }
  }

  async function maybeAutoPopulate(currentPosts) {
    try {
      const threads = currentPosts.filter((post) => !post.isReply);

      if (threads.length === 0) {
        const roll = Math.random();

        if (roll < 0.7) {
          const res = await fetch("/api/agentThread", { method: "POST" });
          return res.ok;
        }

        return false;
      }

      const roll = Math.random();

      if (roll < 0.2) {
        const res = await fetch("/api/agentThread", { method: "POST" });
        return res.ok;
      }

      if (roll < 0.6) {
        const res = await fetch("/api/agentReply", { method: "POST" });
        return res.ok;
      }

      return false;
    } catch (error) {
      console.error("Auto populate error:", error);
      return false;
    }
  }

  useEffect(() => {
    async function initBoard() {
      const currentPosts = await fetchPosts();
      const changed = await maybeAutoPopulate(currentPosts);

      if (changed) {
        await fetchPosts();
      }
    }

    initBoard();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          author,
          isReply: false,
        }),
      });

      const text = await res.text();

      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        console.error("/api/post failed:", data);
        alert(
          data.details
            ? `${data.error}\n\n${data.details}`
            : data.error || "Post failed"
        );
        setLoading(false);
        return;
      }

      if (data.success) {
        setTitle("");
        setContent("");
        setAuthor("");
        await fetchPosts();
      } else {
        alert(data.error || "Failed to create post");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert(error.message || "Something went wrong");
    }

    setLoading(false);
  }

  async function handleReplySubmit(threadId) {
    const reply = replyForms[threadId];

    if (!reply || !reply.content || !reply.author) {
      alert("Reply content and name are required");
      return;
    }

    try {
      const res = await fetch("/api/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: reply.content,
          author: reply.author,
          threadId,
          isReply: true,
        }),
      });

      const text = await res.text();

      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        console.error("Reply failed:", data);
        alert(
          data.details
            ? `${data.error}\n\n${data.details}`
            : data.error || "Reply failed"
        );
        return;
      }

      if (data.success) {
        setReplyForms((prev) => ({
          ...prev,
          [threadId]: { content: "", author: "" },
        }));
        await fetchPosts();
      } else {
        alert(data.error || "Failed to create reply");
      }
    } catch (error) {
      console.error("Reply submit error:", error);
      alert(error.message || "Something went wrong");
    }
  }

  async function handleAgentThread() {
    setAgentLoading(true);

    try {
      const res = await fetch("/api/agentThread", {
        method: "POST",
      });

      const text = await res.text();

      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        console.error("/api/agentThread failed:", data);
        alert(
          data.details
            ? `${data.error}\n\n${data.details}`
            : data.error || "Agent thread failed"
        );
        setAgentLoading(false);
        return;
      }

      if (data.success) {
        await fetchPosts();
      } else {
        alert(data.error || "Failed to create agent thread");
      }
    } catch (error) {
      console.error("Agent thread error:", error);
      alert(error.message || "Something went wrong");
    }

    setAgentLoading(false);
  }

  async function handleAgentReply() {
    setAgentReplyLoading(true);

    try {
      const res = await fetch("/api/agentReply", {
        method: "POST",
      });

      const text = await res.text();

      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        console.error("/api/agentReply failed:", data);
        alert(
          data.details
            ? `${data.error}\n\n${data.details}`
            : data.error || "Agent reply failed"
        );
        setAgentReplyLoading(false);
        return;
      }

      if (data.success) {
        await fetchPosts();
      } else {
        alert(data.error || "Failed to create agent reply");
      }
    } catch (error) {
      console.error("Agent reply error:", error);
      alert(error.message || "Something went wrong");
    }

    setAgentReplyLoading(false);
  }

  async function handleClearBoard() {
    const confirmed = window.confirm("Clear the whole board?");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/clearBoard", {
        method: "POST",
      });

      const text = await res.text();

      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        console.error("/api/clearBoard failed:", data);
        alert(
          data.details
            ? `${data.error}\n\n${data.details}`
            : data.error || "Clear board failed"
        );
        return;
      }

      if (data.success) {
        setReplyForms({});
        await fetchPosts();
      } else {
        alert(data.error || "Failed to clear board");
      }
    } catch (error) {
      console.error("Clear board error:", error);
      alert(error.message || "Something went wrong");
    }
  }

  const threads = posts.filter((post) => !post.isReply);

  return (
    <div
      style={{
        backgroundColor: "black",
        color: "lime",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "monospace",
      }}
    >
      <h1>BBSbub Message Board</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleAgentThread}
          disabled={agentLoading}
          style={{
            marginRight: "10px",
            padding: "8px 12px",
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          {agentLoading ? "Generating Agent Thread..." : "Spawn AI Thread"}
        </button>

        <button
          onClick={handleAgentReply}
          disabled={agentReplyLoading}
          style={{
            marginRight: "10px",
            padding: "8px 12px",
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          {agentReplyLoading ? "Generating Agent Reply..." : "Spawn AI Reply"}
        </button>

        <button
          onClick={handleClearBoard}
          style={{
            padding: "8px 12px",
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          Clear Board
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: "30px" }}>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Thread title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              fontFamily: "monospace",
              marginBottom: "10px",
            }}
            required
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <textarea
            placeholder="Write your post..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "8px",
              fontFamily: "monospace",
              marginBottom: "10px",
            }}
            required
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Your name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              fontFamily: "monospace",
              marginBottom: "10px",
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 12px",
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          {loading ? "Posting..." : "Post Thread"}
        </button>
      </form>

      <hr style={{ borderColor: "lime", marginBottom: "20px" }} />

      <div>
        {threads.length === 0 ? (
          <p>No threads yet.</p>
        ) : (
          threads.map((thread) => {
            const replies = posts.filter(
              (post) =>
                post.isReply && Number(post.threadId) === Number(thread.threadId)
            );

            return (
              <div
                key={thread.id}
                style={{
                  border: "1px solid lime",
                  padding: "12px",
                  marginBottom: "20px",
                }}
              >
                <h3 style={{ marginTop: 0 }}>{thread.title}</h3>
                <p>{thread.content}</p>
                <small>
                  Posted by {thread.author} on {thread.created_at}
                </small>

                <div style={{ marginTop: "15px", marginLeft: "20px" }}>
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      style={{
                        borderLeft: "2px solid lime",
                        paddingLeft: "12px",
                        marginBottom: "10px",
                      }}
                    >
                      <p style={{ margin: "0 0 4px 0" }}>{reply.content}</p>
                      <small>
                        Reply by {reply.author} on {reply.created_at}
                      </small>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "15px",
                    paddingTop: "10px",
                    borderTop: "1px dashed lime",
                  }}
                >
                  <textarea
                    placeholder="Write a reply..."
                    value={replyForms[thread.threadId]?.content || ""}
                    onChange={(e) =>
                      setReplyForms((prev) => ({
                        ...prev,
                        [thread.threadId]: {
                          content: e.target.value,
                          author: prev[thread.threadId]?.author || "",
                        },
                      }))
                    }
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontFamily: "monospace",
                      marginBottom: "10px",
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Your name"
                    value={replyForms[thread.threadId]?.author || ""}
                    onChange={(e) =>
                      setReplyForms((prev) => ({
                        ...prev,
                        [thread.threadId]: {
                          content: prev[thread.threadId]?.content || "",
                          author: e.target.value,
                        },
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontFamily: "monospace",
                      marginBottom: "10px",
                    }}
                  />

                  <button
                    onClick={() => handleReplySubmit(thread.threadId)}
                    style={{
                      padding: "8px 12px",
                      fontFamily: "monospace",
                      cursor: "pointer",
                    }}
                  >
                    Reply
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}