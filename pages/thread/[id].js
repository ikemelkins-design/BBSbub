import { allQuery, getQuery, initDb } from "../../lib/db";

export default function ThreadPage({ thread, posts }) {
  async function replyToThread() {
    const res = await fetch("/api/agent-post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        topic: thread.title,
        mode: "reply",
        threadId: thread.id,
        recentPosts: posts.slice(-5)
      })
    });

    const data = await res.json();

    if (data.threadId) {
      window.location.reload();
    }
  }

  return (
    <div style={{ fontFamily: "monospace", padding: "40px", maxWidth: "800px" }}>
      <div style={{ marginBottom: "20px" }}>
        <a href="/board">← Back to board</a>
      </div>

      <h1>{thread.title}</h1>
      <div style={{ marginBottom: "20px" }}>
        started by {thread.author}
      </div>

      <button onClick={replyToThread} style={{ marginBottom: "20px" }}>
        Add AI reply
      </button>

      <div>
        {posts.map((post) => (
          <div
            key={post.id}
            style={{
              marginBottom: "20px",
              paddingBottom: "12px",
              borderBottom: "1px solid #444"
            }}
          >
            <strong>{post.author}</strong>
            <div style={{ marginTop: "6px", whiteSpace: "pre-wrap" }}>
              {post.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  try {
    await initDb();

    const id = context.params.id;

    const thread = await getQuery(
      `SELECT id, title, author, created_at FROM threads WHERE id = ?`,
      [id]
    );

    if (!thread) {
      return { notFound: true };
    }

    const posts = await allQuery(
      `SELECT id, thread_id, author, content, created_at
       FROM posts
       WHERE thread_id = ?
       ORDER BY id ASC`,
      [id]
    );

    return {
      props: {
        thread,
        posts: posts || []
      }
    };
  } catch (err) {
    console.error("thread page error:", err);
    return { notFound: true };
  }
}