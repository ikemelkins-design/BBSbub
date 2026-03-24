import { useEffect, useState } from "react";

export default function WrestlingPage() {
  const [wrestlers, setWrestlers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    style: "Brawler",
    power: 5,
    speed: 5,
    charisma: 5,
    stamina: 5,
    hp: 35,
    finisher: "",
  });

  async function initializeDb() {
    await fetch("/api/init");
  }

  async function loadWrestlers() {
    const res = await fetch("/api/wrestlers");
    const data = await res.json();
    setWrestlers(data.wrestlers || []);
  }

  async function loadMatches() {
    const res = await fetch("/api/matches");
    const data = await res.json();
    setMatches(data.matches || []);
  }

  async function refreshAll() {
    await initializeDb();
    await loadWrestlers();
    await loadMatches();
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function createWrestler(e) {
    e.preventDefault();

    const res = await fetch("/api/wrestlers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    setForm({
      name: "",
      style: "Brawler",
      power: 5,
      speed: 5,
      charisma: 5,
      stamina: 5,
      hp: 35,
      finisher: "",
    });

    await refreshAll();
  }

  async function runAiMatch() {
    setLoading(true);

    try {
      const res = await fetch("/api/ai-match", {
        method: "POST",
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        await refreshAll();
      }
    } catch (error) {
      console.error(error);
      alert("AI match failed");
    }

    setLoading(false);
  }

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
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
      <h1>BBSbub Wrestling Federation</h1>

      <p>Create wrestlers. Then let the AI run matches.</p>

      <hr style={{ borderColor: "#00ff00" }} />

      <h2>Create Wrestler</h2>

      <form onSubmit={createWrestler} style={{ marginBottom: "20px" }}>
        <p>
          Name:
          <br />
          <input
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            style={inputStyle}
          />
        </p>

        <p>
          Style:
          <br />
          <select
            value={form.style}
            onChange={(e) => updateField("style", e.target.value)}
            style={inputStyle}
          >
            <option>Brawler</option>
            <option>Technician</option>
            <option>High Flyer</option>
            <option>Showboat</option>
          </select>
        </p>

        <p>
          Power:
          <br />
          <input
            type="number"
            min="1"
            max="10"
            value={form.power}
            onChange={(e) => updateField("power", Number(e.target.value))}
            style={inputStyle}
          />
        </p>

        <p>
          Speed:
          <br />
          <input
            type="number"
            min="1"
            max="10"
            value={form.speed}
            onChange={(e) => updateField("speed", Number(e.target.value))}
            style={inputStyle}
          />
        </p>

        <p>
          Charisma:
          <br />
          <input
            type="number"
            min="1"
            max="10"
            value={form.charisma}
            onChange={(e) => updateField("charisma", Number(e.target.value))}
            style={inputStyle}
          />
        </p>

        <p>
          Stamina:
          <br />
          <input
            type="number"
            min="1"
            max="10"
            value={form.stamina}
            onChange={(e) => updateField("stamina", Number(e.target.value))}
            style={inputStyle}
          />
        </p>

        <p>
          HP:
          <br />
          <input
            type="number"
            min="20"
            max="50"
            value={form.hp}
            onChange={(e) => updateField("hp", Number(e.target.value))}
            style={inputStyle}
          />
        </p>

        <p>
          Finisher:
          <br />
          <input
            value={form.finisher}
            onChange={(e) => updateField("finisher", e.target.value)}
            style={inputStyle}
          />
        </p>

        <button type="submit" style={buttonStyle}>
          Create Wrestler
        </button>
      </form>

      <button onClick={runAiMatch} style={buttonStyle} disabled={loading}>
        {loading ? "Running Match..." : "Run AI Match"}
      </button>

      <hr style={{ borderColor: "#00ff00", marginTop: "20px" }} />

      <h2>Roster</h2>

      {wrestlers.length === 0 ? (
        <p>No wrestlers yet.</p>
      ) : (
        wrestlers.map((w) => (
          <div
            key={w.id}
            style={{
              border: "1px solid #00ff00",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <strong>{w.name}</strong> {w.is_ai ? "[AI]" : "[USER]"}
            <br />
            Style: {w.style}
            <br />
            Power: {w.power} | Speed: {w.speed} | Charisma: {w.charisma} | Stamina: {w.stamina} | HP: {w.hp}
            <br />
            Finisher: {w.finisher}
          </div>
        ))
      )}

      <hr style={{ borderColor: "#00ff00" }} />

      <h2>Recent Matches</h2>

      {matches.length === 0 ? (
        <p>No matches yet.</p>
      ) : (
        matches.map((m) => (
          <div
            key={m.id}
            style={{
              border: "1px solid #00ff00",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <strong>
              {m.wrestler1_name} vs. {m.wrestler2_name}
            </strong>
            <br />
            Winner: {m.winner_name || "Unknown"}
            <br />
            {m.result_text}
          </div>
        ))
      )}
    </div>
  );
}

const inputStyle = {
  backgroundColor: "black",
  color: "#00ff00",
  border: "1px solid #00ff00",
  padding: "6px",
  width: "250px",
};

const buttonStyle = {
  backgroundColor: "black",
  color: "#00ff00",
  border: "1px solid #00ff00",
  padding: "8px 12px",
  cursor: "pointer",
};
