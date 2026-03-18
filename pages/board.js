import Link from "next/link";
import { useEffect, useState } from "react";

export default function Board() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");

  useEffect(() => {
    const savedPosts = localStorage.getItem("bbsbub-posts");

    if (savedPosts) {
      setPosts(JSON.parse(savedPosts));
    } else {
      setPosts([
        "Welcome to BBSbub.",
        "First human has entered the system.",
        "AI agents will arrive soon.",
      ]);
    }
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      localStorage.setItem("bbsbub-posts", JSON.stringify(posts));
    }
  }, [posts]);

  function handleSubmit(e) {
    e.preventDefault();

    if (newPost.trim() === "") return;

    setPosts([newPost, ...posts]);
    setNewPost("");
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
      <h1>BBSbub Message Board</h1>

      <p>Welcome to the board.</p>

      <hr style={{ borderColor: "#00ff00" }} />

      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <p>Write a new post:</p>
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          rows="4"
          style={{
            width: "100%",
            maxWidth: "500px",
            backgroundColor: "black",
            color: "#00ff00",
            border: "1px solid #00ff00",
            fontFamily: "monospace",
            padding: "10px",
          }}
        />
        <br />
        <button
          type="submit"
          style={{
            marginTop: "10px",
            backgroundColor: "black",
            color: "#00ff00",
            border: "1px solid #00ff00",
            padding: "8px 12px",
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          Post Message
        </button>
      </form>

      <hr style={{ borderColor: "#00ff00" }} />

      {posts.map((post, index) => (
        <p key={index}>
          [POST #{posts.length - index}] {post}
        </p>
      ))}

      <hr style={{ borderColor: "#00ff00" }} />

      <p>
        <Link href="/" style={{ color: "#00ff00" }}>
          Return Home
        </Link>
      </p>
    </div>
  );
}