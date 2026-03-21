import { useEffect, useState } from "react";

export default function WrestlingPage() {
  const [wrestlers, setWrestlers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [log, setLog] = useState([]);
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    style: "Brawler",
    power: 5,
    speed: 5,
    charisma: 5,
    stamina: 5,
    finisher: ""
  });

  const [selected1, setSelected1] = useState("");
  const [selected2, setSelected2] = useState("");

  async function loadWrestlers() {
    try {
      const res = await fetch("/api/wrestling/wrestlers");
      const data = await res.json();
      setWrestlers(data.wrestlers || []);
    } catch (error) {
      console.error("Failed to load wrestlers:", error);
    }
  }

  async function loadMatches() {
    try {
      const res = await fetch("/api/wrestling/matches");
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error("Failed to load matches:", error);
    }
  }

  useEffect(() => {
    loadWrestlers();
    loadMatches();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleCreateWrestler(e) {
    e.preventDefault();

    if (!form.name.trim() || !form.finisher.trim()) {
      alert("Please enter both a wrestler name and finisher.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/wrestling/create-wrestler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to create wrestler");
        return;
      }

      setForm({
        name: "",
        style: "Brawler",
        power: 5,
        speed: 5,
        charisma: 5,
        stamina: 5,
        finisher: ""
      });

      await loadWrestlers();
    } catch (error) {
      console.error("Create wrestler error:", error);
      alert("Something went wrong creating the wrestler.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunMatch() {
    if (!selected1 || !selected2) {
      alert("Please choose two wrestlers.");
      return;
    }

    if (selected1 === selected2) {
      alert("Please choose two different wrestlers.");
      return;
    }

    try {
      setLoading(true);
      setLog([]);
      setWinner(null);

      const res = await fetch("/api/wrestling/run-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          wrestler1_id: selected1,
          wrestler2_id: selected2
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to run match");
        return;
      }

      setLog(data.log || []);
      setWinner(data.winner || null);

      await loadMatches();
      await loadWrestlers();
    } catch (error) {
      console.error("Run match error:", error);
      alert("Something went wrong running the match.");
    } finally {
      setLoading(false);
    }
  }

  async function postMatchToBoard() {
    if (!log.length) {
      alert("No match log to post yet.");
      return;
    }

    const content = log.join("\n");

    try {
      const res = await fetch("/api/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          author: "BBS Wrestling Federation",
          content
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to post match to BBS");
        return;
      }

      alert("Match posted to BBS!");
    } catch (error) {
      console.error("Post match error:", error);
      alert("Something went wrong posting the match.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "black",
        color: "#00ff99",
        fontFamily: "monospace",
        padding: "20px"
      }}
    >
      <h1>BBSbub Wrestling Federation</h1>
      <p>Create wrestlers. Run matches. Build legends.</p>

      <hr style={{ borderColor: "#00ff99", margin: "20px 0" }} />

      <h2>Create Wrestler</h2>

      <form onSubmit={handleCreateWrestler} style={{ marginBottom: "30px" }}>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            name="name"
            placeholder="Wrestler name"
            value={form.name}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            name="finisher"
            placeholder="Finisher name"
            value={form.finisher}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <select
            name="style"
            value={form.style}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="Brawler">Brawler</option>
            <option value="Technician">Technician</option>
            <option value="High Flyer">High Flyer</option>
            <option value="Monster">Monster</option>
            <option value="Heel">Heel</option>
          </select>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Power: </label>
          <input
            type="number"
            name="power"
            value={form.power}
            onChange={handleChange}
            min="1"
            max="10"
            style={smallInputStyle}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Speed: </label>
          <input
            type="number"
            name="speed"
            value={form.speed}
            onChange={handleChange}
            min="1"
            max="10"
            style={smallInputStyle}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Charisma: </label>
          <input
            type="number"
            name="charisma"
            value={form.charisma}
            onChange={handleChange}
            min="1"
            max="10"
            style={smallInputStyle}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Stamina: </label>
          <input
            type="number"
            name="stamina"
            value={form.stamina}
            onChange={handleChange}
            min="1"
            max="10"
            style={smallInputStyle}
          />
        </div>

        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? "Working..." : "Create Wrestler"}
        </button>
      </form>

      <hr style={{ borderColor: "#00ff99", margin: "20px 0" }} />

      <h2>Roster</h2>

      {wrestlers.length === 0 ? (
        <p>No wrestlers yet.</p>
      ) : (
        <ul>
          {wrestlers.map((wrestler) => (
            <li key={wrestler.id} style={{ marginBottom: "8px" }}>
              #{wrestler.id} {wrestler.name} | {wrestler.style} | POW {wrestler.power} | SPD {wrestler.speed} | CHA {wrestler.charisma} | STA {wrestler.stamina} | HP {wrestler.hp} | FINISHER: {wrestler.finisher}
            </li>
          ))}
        </ul>
      )}

      <hr style={{ borderColor: "#00ff99", margin: "20px 0" }} />

      <h2>Run Match</h2>

      <div style={{ marginBottom: "10px" }}>
        <select
          value={selected1}
          onChange={(e) => setSelected1(e.target.value)}
          style={inputStyle}
        >
          <option value="">Choose Wrestler 1</option>
          {wrestlers.map((wrestler) => (
            <option key={wrestler.id} value={wrestler.id}>
              {wrestler.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <select
          value={selected2}
          onChange={(e) => setSelected2(e.target.value)}
          style={inputStyle}
        >
          <option value="">Choose Wrestler 2</option>
          {wrestlers.map((wrestler) => (
            <option key={wrestler.id} value={wrestler.id}>
              {wrestler.name}
            </option>
          ))}
        </select>
      </div>

      <button onClick={handleRunMatch} style={buttonStyle} disabled={loading}>
        {loading ? "Working..." : "Run Match"}
      </button>

      <hr style={{ borderColor: "#00ff99", margin: "20px 0" }} />

      <h2>Match Log</h2>

      {winner && <p>Winner: {winner.name}</p>}

      {log.length > 0 && (
        <div style={{ marginBottom: "15px" }}>
          <button onClick={postMatchToBoard} style={buttonStyle}>
            Post Match to BBS
          </button>
        </div>
      )}

      <pre
        style={{
          whiteSpace: "pre-wrap",
          backgroundColor: "#111",
          border: "1px solid #00ff99",
          padding: "15px",
          minHeight: "200px"
        }}
      >
        {log.length > 0 ? log.join("\n") : "No match run yet."}
      </pre>

      <hr style={{ borderColor: "#00ff99", margin: "20px 0" }} />

      <h2>Match History</h2>

      {matches.length === 0 ? (
        <p>No matches yet.</p>
      ) : (
        <ul>
          {matches.map((match) => (
            <li key={match.id} style={{ marginBottom: "10px" }}>
              Match #{match.id}: {match.wrestler1_name} vs {match.wrestler2_name} — Winner: {match.winner_name} ({match.created_at})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputStyle = {
  backgroundColor: "black",
  color: "#00ff99",
  border: "1px solid #00ff99",
  padding: "8px",
  width: "300px"
};

const smallInputStyle = {
  backgroundColor: "black",
  color: "#00ff99",
  border: "1px solid #00ff99",
  padding: "8px",
  width: "80px",
  marginLeft: "10px"
};

const buttonStyle = {
  backgroundColor: "black",
  color: "#00ff99",
  border: "1px solid #00ff99",
  padding: "10px 16px",
  cursor: "pointer"
};