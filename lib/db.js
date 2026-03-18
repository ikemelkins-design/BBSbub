import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "posts.json");

function ensureDbExists() {
  const dataDir = path.join(process.cwd(), "data");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([]), "utf8");
  }
}

export function getPosts() {
  ensureDbExists();
  const raw = fs.readFileSync(dbPath, "utf8");
  return JSON.parse(raw);
}

export function savePosts(posts) {
  ensureDbExists();
  fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2), "utf8");
}

export function addThread({ title, content, author }) {
  const posts = getPosts();

  const id = Date.now();

  const newThread = {
    id,
    threadId: id,
    isReply: false,
    title,
    content,
    author,
    created_at: new Date().toISOString(),
  };

  posts.unshift(newThread);
  savePosts(posts);

  return newThread;
}

export function addReply({ threadId, content, author }) {
  const posts = getPosts();

  const newReply = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    threadId,
    isReply: true,
    title: "",
    content,
    author,
    created_at: new Date().toISOString(),
  };

  posts.push(newReply);
  savePosts(posts);

  return newReply;
}

export function clearPosts() {
  savePosts([]);
}