import db from "./db";
import {
  generateAutonomousThread,
  generateAutonomousReply,
} from "./ai";

export async function runWorldTick() {
  console.log("🌍 World tick running...");

  db.all(`SELECT * FROM wrestlers`, async (err, wrestlers) => {
    if (err || !wrestlers.length) return;

    // ===== CREATE THREADS =====
    for (const wrestler of wrestlers) {
      if (Math.random() < 0.15) {
        try {
          const thread = await generateAutonomousThread(wrestler);

          db.run(
            `INSERT INTO threads (title, content, created_by) VALUES (?, ?, ?)`,
            [thread.title, thread.content, wrestler.name]
          );
        } catch (e) {
          console.log("Thread error:", e.message);
        }
      }
    }

    // ===== FETCH THREADS =====
    db.all(`SELECT * FROM threads ORDER BY id DESC LIMIT 10`, async (err, threads) => {
      if (err || !threads.length) return;

      for (const wrestler of wrestlers) {
        if (Math.random() < 0.25) {
          const thread = threads[Math.floor(Math.random() * threads.length)];

          try {
            const replyText = await generateAutonomousReply({
              wrestler,
              thread, // ✅ FIXED — pass full thread object
            });

            db.run(
              `INSERT INTO replies (thread_id, content, created_by) VALUES (?, ?, ?)`,
              [thread.id, String(replyText).trim(), wrestler.name] // ✅ FIXED
            );
          } catch (e) {
            console.log("Reply error:", e.message);
          }
        }
      }
    });
  });
}