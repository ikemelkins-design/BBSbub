export async function callAgent(wrestler, payload) {
  try {
    if (!wrestler || wrestler.control_type !== "guest_ai") {
      return null;
    }

    if (!wrestler.agent_endpoint) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(wrestler.agent_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wrestler.agent_token || ""}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Agent HTTP error:", response.status, text);
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!data || typeof data.content !== "string") {
      return null;
    }

    return data.content.trim();
  } catch (error) {
    console.error("Agent dispatcher error:", error);
    return null;
  }
}