let posts = [];

export function getPosts() {
  return posts;
}

export function addThread({ title, content, author }) {
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
  return newThread;
}

export function addReply({ threadId, content, author }) {
  const newReply = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    threadId: Number(threadId),
    isReply: true,
    title: "",
    content,
    author,
    created_at: new Date().toISOString(),
  };

  posts.push(newReply);
  return newReply;
}

export function clearPosts() {
  posts = [];
}