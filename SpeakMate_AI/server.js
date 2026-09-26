require("dotenv").config();

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "100kb" }));
app.use(express.static(__dirname));

function requireGeminiKey(res) {
  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: "AI unavailable" });
    return false;
  }
  return true;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { system, messages, jsonMode } = req.body || {};
    if (
      typeof system !== "string" ||
      !Array.isArray(messages) ||
      !messages.length
    ) {
      return res.status(400).json({ error: "Invalid request" });
    }
    if (!requireGeminiKey(res)) return;

    const safeMessages = messages
      .slice(-12)
      .map((m) => ({
        role: m?.role === "assistant" ? "model" : "user",
        content: typeof m?.content === "string" ? m.content.slice(0, 4000) : "",
      }))
      .filter((m) => m.content);

    if (!safeMessages.length) {
      return res.status(400).json({ error: "No valid messages" });
    }

    const payload = {
      systemInstruction: { parts: [{ text: system.slice(0, 12000) }] },
      contents: safeMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: jsonMode ? 700 : 350,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    };

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      // Log full details server-side only; never forward upstream error
      // bodies (which can contain internal/account details) to the client.
      console.error("Gemini API error:", response.status, errorText);

      return res.status(502).json({
        error: "Maya is temporarily unavailable. Please try again in a moment.",
      });
    }

    const data = await response.json();
    const reply = (data.candidates || [])
      .flatMap((c) => c.content?.parts || [])
      .filter((p) => typeof p.text === "string")
      .map((p) => p.text)
      .join("\n")
      .trim();

    if (!reply) return res.status(502).json({ error: "Empty AI response" });
    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

async function supabaseRequest(table, method, body = null, query = "") {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { persisted: false, data: [] };
  }

  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/${table}${query}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: method === "GET" ? "return=representation" : "return=minimal",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );

  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return {
    persisted: true,
    data: method === "GET" ? await response.json() : [],
  };
}

app.post("/api/events", async (req, res) => {
  try {
    const b = req.body || {};
    const allowed = [
      "landing_viewed",
      "scenario_view",
      "scenario_selected",
      "session_started",
      "user_response",
      "avatar_interaction",
      "session_completed",
      "session_abandoned",
      "feedback_submitted",
      "practice_again_clicked",
    ];
    if (!allowed.includes(b.event_name)) {
      return res.status(400).json({ error: "Invalid event" });
    }

    const result = await supabaseRequest("events", "POST", {
      event_name: b.event_name,
      session_id: b.session_id || null,
      scenario: b.scenario || null,
      metadata: b.metadata || {},
    });

    res.json({ ok: true, persisted: result.persisted });
  } catch (error) {
    console.error("Event error:", error.message);
    res.json({ ok: true, persisted: false });
  }
});

app.post("/api/feedback", async (req, res) => {
  try {
    const b = req.body || {};
    const rating = Number(b.rating);
    const again = b.would_practice_again;

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      !["Yes", "Maybe", "No"].includes(again)
    ) {
      return res.status(400).json({ error: "Invalid feedback" });
    }

    const result = await supabaseRequest("feedback", "POST", {
      session_id: b.sessionId || null,
      scenario: b.scenario || null,
      rating,
      would_practice_again: again,
      comment: typeof b.comment === "string" ? b.comment.slice(0, 1000) : "",
    });

    res.json({ ok: true, persisted: result.persisted });
  } catch (error) {
    console.error("Feedback error:", error.message);
    res.json({ ok: true, persisted: false });
  }
});

app.get("/api/analytics", async (req, res) => {
  try {
    const eventsResult = await supabaseRequest(
      "events",
      "GET",
      null,
      "?select=event_name,session_id,scenario,metadata",
    );
    const feedbackResult = await supabaseRequest(
      "feedback",
      "GET",
      null,
      "?select=rating,would_practice_again",
    );

    const events = eventsResult.data || [];
    const feedback = feedbackResult.data || [];

    const starts = events.filter((x) => x.event_name === "session_started");
    const completed = events.filter(
      (x) => x.event_name === "session_completed",
    );

    const sessions = new Set(starts.map((x) => x.session_id).filter(Boolean));
    const done = new Set(completed.map((x) => x.session_id).filter(Boolean));

    const sessionsStarted = sessions.size || starts.length;
    const sessionsCompleted = done.size || completed.length;

    const scenarios = {};
    starts.forEach((x) => {
      if (x.scenario) scenarios[x.scenario] = (scenarios[x.scenario] || 0) + 1;
    });

    const avgRating = feedback.length
      ? (
          feedback.reduce((sum, x) => sum + Number(x.rating || 0), 0) /
          feedback.length
        ).toFixed(1)
      : "—";

    const yes = feedback.filter((x) => x.would_practice_again === "Yes").length;

    res.json({
      sessionsStarted,
      sessionsCompleted,
      completionRate: sessionsStarted
        ? Math.round((sessionsCompleted / sessionsStarted) * 100)
        : 0,
      avgRating,
      wouldAgain: feedback.length
        ? Math.round((yes / feedback.length) * 100)
        : 0,
      feedbackCount: feedback.length,
      scenarios,
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    res.status(502).json({ error: "Analytics unavailable" });
  }
});

app.listen(PORT, () => {
  console.log(`\nSpeakMate is running at http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.\n");
});
