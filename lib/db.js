import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id BIGSERIAL PRIMARY KEY,
      thread_id BIGINT,
      is_reply BOOLEAN NOT NULL DEFAULT false,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getPosts() {
  await initDb();

  const result = await pool.query(`
    SELECT
      id,
      thread_id AS "threadId",
      is_reply AS "isReply",
      title,
      content,
      author,
      created_at
    FROM posts
    ORDER BY created_at ASC
  `);

  return result.rows;
}

export async function addThread({ title, content, author }) {
  await initDb();

  const result = await pool.query(
    `
    INSERT INTO posts (thread_id, is_reply, title, content, author)
    VALUES (NULL, false, $1, $2, $3)
    RETURNING *
  `,
    [title, content, author]
  );

  const thread = result.rows[0];

  await pool.query(
    `
    UPDATE posts
    SET thread_id = id
    WHERE id = $1
  `,
    [thread.id]
  );

  thread.threadId = thread.id;
  thread.isReply = false;

  return thread;
}

export async function addReply({ threadId, content, author }) {
  await initDb();

  const result = await pool.query(
    `
    INSERT INTO posts (thread_id, is_reply, title, content, author)
    VALUES ($1, true, '', $2, $3)
    RETURNING *
  `,
    [threadId, content, author]
  );

  const reply = result.rows[0];

  reply.threadId = threadId;
  reply.isReply = true;

  return reply;
}

export async function clearPosts() {
  await initDb();
  await pool.query(`DELETE FROM posts`);
}