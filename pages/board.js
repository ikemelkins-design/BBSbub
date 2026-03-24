import { useEffect, useState } from "react";
import Link from "next/link";

export default function BoardPage() {
  const [threads, setThreads] = useState([]);
  const [rivalries, setRivalries] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [showCard, setShowCard] = useState(null);
  const [titleData, setTitleData] = useState(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState(false);
  const [isRunningShow, setIsRunningShow] = useState(false);

  const API = "/api/post";

  async function safeJson(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error("Non-JSON response:", text);
      throw new Error("Invalid JSON response");
    }
  }

  async function fetchThreads() {
    try {
      const res = await fetch(API);
      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.error || "Failed to load threads");
        return;
      }

      setThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchThreads error:", err);
      setMessage("Error loading threads");
    }
  }

  async function fetchRivalries() {
    try {
      const res = await fetch("/api/rivalries");
      const data = await safeJson(res);

      if (!res.ok) {
        return;
      }

      setRivalries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchRivalries error:", err);
    }
  }

  async function fetchRankings() {
    try {
      const res = await fetch("/api/rankings");
      const data = await safeJson(res);

      if (!res.ok) {
        return;
      }

      setRankings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchRankings error:", err);
    }
  }

  async function fetchTitle() {
    try {
      const res = await fetch("/api/title");
      const data = await safeJson(res);

      if (!res.ok) {
        return;
      }

      setTitleData(data || null);
    } catch (err) {
      console.error("fetchTitle error:", err);
    }
  }

  async function fetchShowCard() {
    try {
      const res = await fetch("/api/show-card");
      const data = await safeJson(res);

      if (!res.ok) {
        return null;
      }

      setShowCard(data || null);
      return data || null;
    } catch (err) {
      console.error("fetchShowCard error:", err);
      return null;
    }
  }

  async function refreshBoardData() {
    await Promise.all([
      fetchThreads(),
      fetchRivalries(),
      fetchRankings(),
      fetchTitle(),
    ]);
  }

  async function createThread(e) {
    e.preventDefault();

    if (!title.trim() || !author.trim() || !content.trim()) {
      setMessage("All fields required");
      return;
    }

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          content: content.trim(),
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.error || "Failed to create thread");
        return;
      }

      setTitle("");
      setAuthor("");
      setContent("");
      setMessage("Thread created");
      await fetchThreads();
    } catch (err) {
      console.error("createThread error:", err);
      setMessage("Error creating thread");
    }
  }

  async function runAiMatch() {
    if (busy || isRunningShow) return;
    setBusy(true);

    try {
      setMessage("⚡ AI match in progress...");

      const promoRes = await fetch("/api/ai-match", {
        method: "POST",
      });

      const promoData = await safeJson(promoRes);

      if (!promoRes.ok) {
        setMessage(promoData.error || "Failed to build AI match");
        return;
      }

      const matchRes = await fetch("/api/wrestling/run-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wrestler1_id: promoData.wrestler1_id || promoData.wrestler1Id,
          wrestler2_id: promoData.wrestler2_id || promoData.wrestler2Id,
          existingThreadId: promoData.promoThreadId,
          isTitleMatch: promoData.isTitleMatch,
        }),
      });

      const matchData = await safeJson(matchRes);

      if (!matchRes.ok) {
        setMessage(matchData.error || "Failed to run AI match");
        return;
      }

      const winnerName =
        matchData?.winner?.name ||
        matchData?.match?.winner_name ||
        "Unknown winner";
      const loserName =
        matchData?.loser?.name ||
        matchData?.match?.loser_name ||
        "Unknown loser";

      if (matchData.titleChanged && matchData.championName) {
        setMessage(
          `🏆 TITLE CHANGE: ${matchData.championName} defeated ${loserName}`
        );
      } else {
        setMessage(`⚡ MATCH: ${winnerName} defeated ${loserName}`);
      }

      await refreshBoardData();
      await fetchShowCard();
    } catch (err) {
      console.error("runAiMatch error:", err);
      setMessage("AI match failed");
    } finally {
      setBusy(false);
    }
  }

  async function runWorldTick() {
    if (busy || isRunningShow) return;
    setBusy(true);

    try {
      const res = await fetch("/api/world-tick", {
        method: "POST",
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.error || "World tick failed");
        return;
      }

      if (data.action === "thread") {
        setMessage(`${data.author} started a new thread.`);
      } else if (data.action === "reply") {
        setMessage(`${data.author} replied in thread #${data.threadId}.`);
      } else {
        setMessage("World advanced.");
      }

      await refreshBoardData();
    } catch (err) {
      console.error("runWorldTick error:", err);
      setMessage("World tick failed");
    } finally {
      setBusy(false);
    }
  }

  async function runBookedMatch(matchItem) {
    try {
      setMessage(
        `📺 BOOKED: ${matchItem.wrestler1Name} vs ${matchItem.wrestler2Name}`
      );

      const promoThreadRes = await fetch("/api/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `${matchItem.isTitleMatch ? "[TITLE MATCH] " : ""}${matchItem.wrestler1Name} vs ${matchItem.wrestler2Name}`,
          author: matchItem.wrestler1Name,
          content: matchItem.isTitleMatch
            ? `${matchItem.wrestler2Name}, the BBSbub World Championship is on the line.`
            : `${matchItem.wrestler2Name}, you're next.`,
        }),
      });

      const promoThreadData = await safeJson(promoThreadRes);

      if (!promoThreadRes.ok) {
        setMessage(promoThreadData.error || "Failed to create promo thread");
        return null;
      }

      const matchRes = await fetch("/api/wrestling/run-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wrestler1_id: matchItem.wrestler1Id,
          wrestler2_id: matchItem.wrestler2Id,
          existingThreadId: promoThreadData.threadId,
          isTitleMatch: matchItem.isTitleMatch,
        }),
      });

      const matchData = await safeJson(matchRes);

      if (!matchRes.ok) {
        setMessage(matchData.error || "Failed to run booked match");
        return null;
      }

      const winnerName =
        matchData?.winner?.name ||
        matchData?.match?.winner_name ||
        "Unknown winner";
      const loserName =
        matchData?.loser?.name ||
        matchData?.match?.loser_name ||
        "Unknown loser";

      if (matchData.titleChanged && matchData.championName) {
        setMessage(
          `🏆 TITLE CHANGE: ${matchData.championName} defeated ${loserName}`
        );
      } else {
        setMessage(`📺 RESULT: ${winnerName} defeated ${loserName}`);
      }

      await refreshBoardData();
      return matchData;
    } catch (err) {
      console.error("runBookedMatch error:", err);
      setMessage("Error running booked match");
      return null;
    }
  }

  async function runMatchFromCard(matchItem) {
    if (busy || isRunningShow) return;
    setBusy(true);

    try {
      await runBookedMatch(matchItem);
      await fetchShowCard();
    } finally {
      setBusy(false);
    }
  }

  async function runWholeShow() {
    if (busy || isRunningShow) return;

    try {
      setIsRunningShow(true);

      let currentCard = showCard;

      if (
        !currentCard ||
        !Array.isArray(currentCard.matches) ||
        currentCard.matches.length === 0
      ) {
        setMessage("📺 Building show card...");
        currentCard = await fetchShowCard();
      }

      if (
        !currentCard ||
        !Array.isArray(currentCard.matches) ||
        currentCard.matches.length === 0
      ) {
        setMessage("No show card available.");
        return;
      }

      setMessage(`📺 Running ${currentCard.showName || "BBSbub Fight Night"}...`);

      for (let i = 0; i < currentCard.matches.length; i++) {
        const matchItem = currentCard.matches[i];

        setMessage(
          `📺 Match ${i + 1} of ${currentCard.matches.length}: ${matchItem.wrestler1Name} vs ${matchItem.wrestler2Name}`
        );

        await runBookedMatch(matchItem);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setMessage(
        `✅ Show complete: ${currentCard.showName || "BBSbub Fight Night"}`
      );

      await refreshBoardData();
      await fetchShowCard();
    } catch (err) {
      console.error("runWholeShow error:", err);
      setMessage("Error running whole show");
    } finally {
      setIsRunningShow(false);
    }
  }

  useEffect(() => {
    refreshBoardData();
    fetchShowCard();

    const refreshInterval = setInterval(() => {
      refreshBoardData();
    }, 5000);

    const worldInterval = setInterval(() => {
      if (!busy && !isRunningShow && Math.random() < 0.6) {
        runWorldTick();
      }
    }, 25000);

    const matchInterval = setInterval(() => {
      if (!busy && !isRunningShow && Math.random() < 0.35) {
        runAiMatch();
      }
    }, 45000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(worldInterval);
      clearInterval(matchInterval);
    };
  }, [busy, isRunningShow]);

  return (
    <div style={styles.page}>
      <h1>BBSbub Board</h1>

      <p>
        <Link href="/" style={styles.link}>
          [Home]
        </Link>
      </p>

      <hr style={styles.hr} />

      <h2>🏆 Championship</h2>

      {!titleData ? (
        <p>Loading title...</p>
      ) : (
        <div style={styles.titleBox}>
          <strong>{titleData.name}</strong>
          <p>
            Champion: {titleData.champion_name ? titleData.champion_name : "Vacant"}
          </p>
        </div>
      )}

      <h2>📺 Show Card</h2>

      <div style={{ marginBottom: "12px" }}>
        <button
          onClick={fetchShowCard}
          style={{ ...styles.button, marginRight: "10px" }}
          disabled={busy || isRunningShow}
        >
          Refresh Show Card
        </button>

        <button
          onClick={runWholeShow}
          style={styles.button}
          disabled={
            busy ||
            isRunningShow ||
            !showCard ||
            !Array.isArray(showCard.matches) ||
            showCard.matches.length === 0
          }
        >
          {isRunningShow ? "Running Show..." : "Run Whole Show"}
        </button>
      </div>

      {!showCard || !Array.isArray(showCard.matches) ? (
        <p>No show card yet.</p>
      ) : (
        <div style={styles.showCardBox}>
          <strong>{showCard.showName}</strong>

          {showCard.matches.map((m, index) => (
            <div
              key={`${m.wrestler1Id}-${m.wrestler2Id}-${index}`}
              style={styles.matchCard}
            >
              <div>
                <strong>{m.label}</strong>
              </div>

              <div style={{ marginTop: "4px" }}>
                {m.wrestler1Name} vs {m.wrestler2Name}
              </div>

              <div style={{ marginTop: "8px" }}>
                <button
                  onClick={() => runMatchFromCard(m)}
                  style={styles.button}
                  disabled={busy || isRunningShow}
                >
                  Run This Match
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>📈 Top Contenders</h2>

      {rankings.length === 0 ? (
        <p>No rankings yet.</p>
      ) : (
        rankings.map((w, index) => (
          <div key={w.id} style={styles.rankingRow}>
            <div>
              <strong>
                #{index + 1} {w.name}
              </strong>{" "}
              <span style={styles.dimText}>({w.style || "Unknown"})</span>
            </div>

            <div style={styles.smallText}>
              Record: {w.wins}-{w.losses} | Streak: {w.streak} | Heat:{" "}
              {w.rivalry_heat} | Score: {w.contender_score}
            </div>
          </div>
        ))
      )}

      <hr style={styles.hr} />

      <h2>⚡ Live World Control</h2>

      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={runWorldTick}
          style={{ ...styles.button, marginRight: "10px" }}
          disabled={busy || isRunningShow}
        >
          Run World Tick
        </button>

        <button
          onClick={runAiMatch}
          style={styles.button}
          disabled={busy || isRunningShow}
        >
          Run AI Match
        </button>
      </div>

      {message && <div style={styles.messageBox}>{message}</div>}

      <hr style={styles.hr} />

      <h2>🔥 Active Rivalries</h2>

      {rivalries.length === 0 ? (
        <p>No rivalries yet.</p>
      ) : (
        rivalries.map((r, i) => (
          <div key={i} style={styles.rivalry}>
            <strong>
              {r.wrestler_name} vs {r.target_name}
            </strong>
            <p>Heat: {r.heat}</p>
            <p>
              Record: {r.wins_against_target} - {r.losses_against_target}
            </p>
          </div>
        ))
      )}

      <hr style={styles.hr} />

      <h2>Create Thread</h2>

      <form onSubmit={createThread}>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          style={styles.input}
        />

        <textarea
          placeholder="Message"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ ...styles.input, height: "120px" }}
        />

        <button type="submit" style={styles.button}>
          Create Thread
        </button>
      </form>

      <hr style={styles.hr} />

      <h2>Threads</h2>

      {threads.length === 0 ? (
        <p>No threads yet.</p>
      ) : (
        threads.map((t) => (
          <div key={t.id} style={styles.thread}>
            <h3>
              <Link href={`/thread/${t.id}`} style={styles.link}>
                {t.title}
              </Link>
            </h3>

            <p>
              <strong>{t.author}</strong>
            </p>

            <p style={{ whiteSpace: "pre-wrap" }}>{t.content}</p>

            <p style={{ fontSize: "12px" }}>
              Replies: {t.reply_count ?? 0}
            </p>

            {t.last_post_author && (
              <p style={{ fontSize: "12px" }}>
                Last post by: {t.last_post_author}
              </p>
            )}

            {t.last_activity_at && (
              <p style={{ fontSize: "12px" }}>
                Last activity: {t.last_activity_at}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  page: {
    backgroundColor: "black",
    color: "#00ff00",
    minHeight: "100vh",
    fontFamily: "monospace",
    padding: "20px",
  },
  link: {
    color: "#00ff00",
  },
  hr: {
    borderColor: "#00ff00",
  },
  input: {
    display: "block",
    marginBottom: "10px",
    width: "100%",
    maxWidth: "600px",
    backgroundColor: "black",
    color: "#00ff00",
    border: "1px solid #00ff00",
    padding: "8px",
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "black",
    color: "#00ff00",
    border: "1px solid #00ff00",
    padding: "8px 12px",
    cursor: "pointer",
    fontFamily: "monospace",
  },
  thread: {
    border: "1px solid #00ff00",
    padding: "10px",
    marginBottom: "10px",
  },
  rivalry: {
    border: "1px solid red",
    padding: "10px",
    marginBottom: "10px",
  },
  titleBox: {
    border: "1px solid gold",
    padding: "12px",
    marginBottom: "10px",
  },
  messageBox: {
    border: "1px solid yellow",
    padding: "10px",
    marginBottom: "10px",
    color: "#ffff66",
  },
  rankingRow: {
    border: "1px solid #00aa88",
    padding: "10px",
    marginBottom: "10px",
  },
  smallText: {
    fontSize: "12px",
  },
  dimText: {
    fontSize: "12px",
    opacity: 0.8,
  },
  showCardBox: {
    border: "1px solid #66ccff",
    padding: "12px",
    marginBottom: "16px",
  },
  matchCard: {
    border: "1px solid #66ccff",
    padding: "10px",
    marginTop: "10px",
  },
};