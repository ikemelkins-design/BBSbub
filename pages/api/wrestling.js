import { useEffect, useState } from "react";
import Link from "next/link";

export default function WrestlingPage() {
  const [wrestlers, setWrestlers] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningMatch, setRunningMatch] = useState(false);
  const [status, setStatus] = useState("Idle");

  async function loadWrestlingData() {
    try {
      const res = await fetch("/api/wrestling-auto");
      const text = await res.text();
      let data = {};

      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error("Invalid wrestling JSON:", text);
        setStatus("Bad server response");
        return;
      }

      if (!res.ok) {
        setStatus(data.error || "Failed to load wrestling data");
        return;
      }

      setWrestlers(data.wrestlers || []);
      setRecentMatches(data.recentMatches || []);
      setStatus("Loaded");
    } catch (error) {
      console.error("Failed to load wrestling data:", error);
      setStatus("Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWrestlingData();
  }, []);

  async function runMatch() {
    setRunningMatch(true);
    setStatus("Running AI match...");

    try {
      const res = await fetch("/api/wrestling-auto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const text = await res.text();
      let data = {};

      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error("Invalid match JSON:", text);
        setStatus("Bad match response");
        return;
      }

      if (!res.ok) {
        setStatus(data.error || "Match failed");
        return;
      }

      setStatus(`Winner: ${data.winner}`);
      await loadWrestlingData();
    } catch (error) {
      console.error("Failed to run match:", error);
      setStatus("Match failed");
    } finally {
      setRunningMatch(false);
    }
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
      <h1>BBSbub Wrestling</h1>

      <p>
        <Link href="/" style={{ color: "#00ff00" }}>
          [Home]
        </Link>{" "}
        <Link href="/board" style={{ color: "#00ff00", marginLeft: "12px" }}>
          [Board]
        </Link>
      </p>

      <p style={{ fontSize: "12px", opacity: 0.85 }}>
        Status: {status}
      </p>

      <hr style={{ borderColor: "#00ff00" }} />

      <h2>AI Match Control</h2>

      <button
        onClick={runMatch}
        disabled={runningMatch}
        style={{
          backgroundColor: "black",
          color: "#00ff00",
          border: "1px solid #00ff00",
          padding: "8px 12px",
          fontFamily: "monospace",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        {runningMatch ? "Running..." : "Run AI Match"}
      </button>

      <hr style={{ borderColor: "#00ff00" }} />

      <h2>Roster</h2>

      {loading ? (
        <p>Loading...</p>
      ) : wrestlers.length === 0 ? (
        <p>No wrestlers found.</p>
      ) : (
        wrestlers.map((wrestler) => (
          <div
            key={wrestler.id}
            style={{
              border: "1px solid #00ff00",
              padding: "12px",
              marginBottom: "12px",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
              {wrestler.name}
            </div>
            <div style={{ fontSize: "12px", marginBottom: "4px" }}>
              Style: {wrestler.style || "Unknown"}
            </div>
            <div style={{ fontSize: "12px", marginBottom: "4px" }}>
              Power: {wrestler.power} | Speed: {wrestler.speed} | Charisma: {wrestler.charisma} | Stamina: {wrestler.stamina} | HP: {wrestler.hp}
            </div>
            <div style={{ fontSize: "12px" }}>
              Finisher: {wrestler.finisher || "None"}
            </div>
          </div>
        ))
      )}

      <hr style={{ borderColor: "#00ff00" }} />

      <h2>Recent Matches</h2>

      {recentMatches.length === 0 ? (
        <p>No matches yet.</p>
      ) : (
        recentMatches.map((match) => (
          <div
            key={match.id}
            style={{
              border: "1px solid #00ff00",
              padding: "12px",
              marginBottom: "12px",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
              {match.wrestler1_name} vs {match.wrestler2_name}
            </div>
            <div style={{ fontSize: "12px", marginBottom: "6px" }}>
              Winner: {match.winner_name}
            </div>
            <div style={{ fontSize: "12px", marginBottom: "6px" }}>
              {match.finish_text}
            </div>
            {match.thread_id ? (
              <div style={{ fontSize: "12px" }}>
                <Link
                  href={`/thread/${match.thread_id}`}
                  style={{ color: "#00ff00", textDecoration: "underline" }}
                >
                  View result thread
                </Link>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}