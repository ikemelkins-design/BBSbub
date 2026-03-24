import { useEffect, useState } from "react";

export default function WrestlingPage() {
  const [wrestlers, setWrestlers] = useState([]);
  const [rivalries, setRivalries] = useState([]);
  const [wrestler1Id, setWrestler1Id] = useState("");
  const [wrestler2Id, setWrestler2Id] = useState("");
  const [isTitleMatch, setIsTitleMatch] = useState(false);
  const [titleName, setTitleName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadWrestlers() {
    try {
      const res = await fetch("/api/wrestlers");
      const data = await res.json();

      if (Array.isArray(data)) {
        setWrestlers(data);
      } else if (Array.isArray(data.wrestlers)) {
        setWrestlers(data.wrestlers);
      } else {
        setWrestlers([]);
      }
    } catch (error) {
      console.error("LOAD WRESTLERS ERROR:", error);
      setWrestlers([]);
    }
  }

  async function loadRivalries() {
    try {
      const res = await fetch("/api/rivalries");
      const data = await res.json();

      if (Array.isArray(data)) {
        setRivalries(data);
      } else if (Array.isArray(data.rivalries)) {
        setRivalries(data.rivalries);
      } else {
        setRivalries([]);
      }
    } catch (error) {
      console.error("LOAD RIVALRIES ERROR:", error);
      setRivalries([]);
    }
  }

  async function refreshAll() {
    await Promise.all([loadWrestlers(), loadRivalries()]);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function runMatch() {
    if (!wrestler1Id || !wrestler2Id) {
      setMessage("Please choose two wrestlers first.");
      return;
    }

    if (String(wrestler1Id) === String(wrestler2Id)) {
      setMessage("Please choose two different wrestlers.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        wrestler1Id: Number(wrestler1Id),
        wrestler2Id: Number(wrestler2Id),
        isTitleMatch,
        titleName,
        generatePreMatchPromos: true,
        generatePostMatchPromo: true,
      };

      console.log("RUN MATCH PAYLOAD:", payload);

      const res = await fetch("/api/wrestling/run-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("RUN MATCH RESPONSE:", data);

      if (!res.ok || !data.success) {
        setMessage(data.error || "Failed to run match.");
        return;
      }

      setMessage(
        `${data.match.winner} defeated ${data.match.loser}. ${data.match.finishText}`
      );

      await loadRivalries();
    } catch (error) {
      console.error("RUN MATCH ERROR:", error);
      setMessage("Failed to run match.");
    } finally {
      setLoading(false);
    }
  }

  async function generatePromo() {
    if (!wrestler1Id || !wrestler2Id) {
      setMessage("Please choose two wrestlers first.");
      return;
    }

    if (String(wrestler1Id) === String(wrestler2Id)) {
      setMessage("Please choose two different wrestlers.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        wrestlerId: Number(wrestler1Id),
        opponentId: Number(wrestler2Id),
        isTitleMatch,
      };

      console.log("PROMO PAYLOAD:", payload);

      const res = await fetch("/api/promo/callout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("PROMO RESPONSE:", data);

      if (!res.ok || !data.success) {
        setMessage(data.error || "Failed to generate promo.");
        return;
      }

      setMessage(`Promo posted: ${data.promo.title}`);
      await loadRivalries();
    } catch (error) {
      console.error("PROMO ERROR:", error);
      setMessage("Failed to generate promo.");
    } finally {
      setLoading(false);
    }
  }

  function rivalryLabel(r) {
    const a =
      r.wrestler_a_name ||
      r.wrestler1_name ||
      r.wrestler_one_name ||
      r.name1 ||
      "Unknown";

    const b =
      r.wrestler_b_name ||
      r.wrestler2_name ||
      r.wrestler_two_name ||
      r.name2 ||
      "Unknown";

    return `${a} vs ${b}`;
  }

  function rivalryHeat(r) {
    return r.heat ?? r.score ?? r.intensity ?? 0;
  }

  function rivalryLastInteraction(r) {
    return (
      r.last_interaction ||
      r.updated_at ||
      r.last_match_at ||
      r.created_at ||
      "N/A"
    );
  }

  return (
    <div
      style={{
        backgroundColor: "black",
        color: "#00ff00",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "monospace",
      }}
    >
      <h1>Wrestling Control Panel</h1>
      <p>Run matches, generate promos, and track hot rivalries.</p>

      <hr style={{ borderColor: "#00ff00" }} />

      <div style={{ marginBottom: "20px" }}>
        <p>Wrestler 1</p>
        <select
          value={wrestler1Id}
          onChange={(e) => setWrestler1Id(e.target.value)}
          style={{
            background: "black",
            color: "#00ff00",
            border: "1px solid #00ff00",
            padding: "6px",
            marginBottom: "12px",
            width: "260px",
          }}
        >
          <option value="">Select wrestler</option>
          {wrestlers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        <p>Wrestler 2</p>
        <select
          value={wrestler2Id}
          onChange={(e) => setWrestler2Id(e.target.value)}
          style={{
            background: "black",
            color: "#00ff00",
            border: "1px solid #00ff00",
            padding: "6px",
            marginBottom: "12px",
            width: "260px",
          }}
        >
          <option value="">Select wrestler</option>
          {wrestlers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        <div style={{ marginTop: "10px", marginBottom: "12px" }}>
          <label>
            <input
              type="checkbox"
              checked={isTitleMatch}
              onChange={(e) => setIsTitleMatch(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Title Match
          </label>
        </div>

        <input
          type="text"
          placeholder="Title name (optional)"
          value={titleName}
          onChange={(e) => setTitleName(e.target.value)}
          style={{
            background: "black",
            color: "#00ff00",
            border: "1px solid #00ff00",
            padding: "6px",
            width: "260px",
            marginBottom: "12px",
          }}
        />

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={runMatch}
            disabled={loading}
            style={{
              background: "black",
              color: "#00ff00",
              border: "1px solid #00ff00",
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            {loading ? "Working..." : "Run Match"}
          </button>

          <button
            onClick={generatePromo}
            disabled={loading}
            style={{
              background: "black",
              color: "#00ff00",
              border: "1px solid #00ff00",
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            {loading ? "Working..." : "Generate Promo"}
          </button>

          <button
            onClick={loadRivalries}
            disabled={loading}
            style={{
              background: "black",
              color: "#00ff00",
              border: "1px solid #00ff00",
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            Refresh Rivalries
          </button>
        </div>
      </div>

      {message ? (
        <>
          <hr style={{ borderColor: "#00ff00" }} />
          <h2>Status</h2>
          <p>{message}</p>
        </>
      ) : null}

      <hr style={{ borderColor: "#00ff00" }} />

      <h2>Hot Rivalries</h2>

      {rivalries.length === 0 ? (
        <p>No rivalries yet.</p>
      ) : (
        <div>
          {rivalries.map((r, index) => (
            <div
              key={r.id || `${rivalryLabel(r)}-${index}`}
              style={{
                border: "1px solid #00ff00",
                padding: "10px",
                marginBottom: "10px",
              }}
            >
              <p>
                <strong>{rivalryLabel(r)}</strong>
              </p>
              <p>Heat: {rivalryHeat(r)}</p>
              <p>Last Interaction: {rivalryLastInteraction(r)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}