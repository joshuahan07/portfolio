import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SYSTEM_PROMPT = `
You are an AI trained to answer questions on behalf of Joshua Han, a student at
Washington University in St. Louis in the Joint Business & Computer Science
program (Aug 2025 – May 2029). You are NOT Joshua — always clarify you're an AI
trained on his portfolio if asked directly. Respond in Joshua's voice: warm,
concise, confident, occasionally dry. Keep answers under 4 sentences unless
asked for detail.

Background:
- From Los Angeles, now in St. Louis.
- Valedictorian at North Hollywood High (rank 1/374, weighted GPA 4.7).
- California State Seal of Biliteracy in Korean.
- 2nd place in WashU Olin Two-Minute Elevator Pitch (80+ submissions, $1,250
  in funding) with OnTrack.
- DECA District Champion in Hospitality & Tourism.
- CyberPatriot Platinum Tier x2.

Projects:
- OnTrack (solo founder, Nov 2025–present): conflict-free class scheduler for
  WashU students. Next.js 14, TypeScript, Supabase.
- Paralume (co-founder with Bom): real-time writing coach that streams guidance
  without ghostwriting. Next.js, TipTap, Gemini.
- Great Rivers demo (client pitch): human-in-the-loop Bloomerang → QuickBooks
  sync concept.
- ThurtenE Carnival App (Project Lead, Google Developer Group WashU):
  mobile-first React SPA.
- Playback (DevFest WashU 2026): AI basketball coaching tool.
- Outrank (for fun): real-time two-player Stratego-style game on Next.js +
  Socket.IO.

Work:
- Recreation Leader, City of West Hollywood (summer 2025).
- Teaching Assistant at Kumon.
- Internship at Voices Beyond Assault (nonprofit).

Interests: basketball, building demo-ready products, hackathons.

If you don't know something, say so honestly and suggest emailing
thejoshuahan@gmail.com.
`.trim();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

/** @type {Map<string, number[]>} */
const hits = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return { ok: false, remaining: 0 };
  }
  recent.push(now);
  hits.set(ip, recent);
  return { ok: true, remaining: MAX_PER_WINDOW - recent.length };
}

function getIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

function toDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

async function topLanguageThisWeek(events) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const repoNames = new Set();
  for (const ev of events) {
    if (ev.type !== "PushEvent") continue;
    if (new Date(ev.created_at).getTime() < cutoff) continue;
    repoNames.add(ev.repo.name);
  }
  if (repoNames.size === 0) return null;

  const totals = {};
  const results = await Promise.all(
    Array.from(repoNames)
      .slice(0, 6)
      .map(async (repo) => {
        try {
          const r = await fetch(`https://api.github.com/repos/${repo}/languages`, {
            headers: {
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });
          if (!r.ok) return null;
          return await r.json();
        } catch {
          return null;
        }
      }),
  );

  for (const lang of results) {
    if (!lang) continue;
    for (const [name, bytes] of Object.entries(lang)) {
      totals[name] = (totals[name] ?? 0) + bytes;
    }
  }

  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
}

async function fetchGitHubStats() {
  const username =
    process.env.GITHUB_USERNAME?.trim() ||
    process.env.VITE_PUBLIC_GITHUB_USERNAME?.trim() ||
    "joshuahan07";

  const base = {
    username,
    commitsThisMonth: 0,
    topLanguage: null,
    streakDays: 0,
    lastUpdated: new Date().toISOString(),
  };

  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!res.ok) {
      return { ...base, error: `github_${res.status}` };
    }

    const events = await res.json();
    const now = new Date();

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const commitsThisMonth = events.reduce((total, ev) => {
      if (ev.type !== "PushEvent") return total;
      const when = new Date(ev.created_at);
      if (when < monthStart) return total;
      return total + (ev.payload?.commits?.length ?? 0);
    }, 0);

    const pushDays = new Set();
    for (const ev of events) {
      if (ev.type !== "PushEvent") continue;
      pushDays.add(toDayKey(new Date(ev.created_at)));
    }

    let streakDays = 0;
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!pushDays.has(toDayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!pushDays.has(toDayKey(cursor))) {
        return {
          ...base,
          commitsThisMonth,
          topLanguage: await topLanguageThisWeek(events),
          streakDays: 0,
        };
      }
    }
    while (pushDays.has(toDayKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      ...base,
      commitsThisMonth,
      topLanguage: await topLanguageThisWeek(events),
      streakDays,
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "64kb" }));

app.get("/api/spotify", (_req, res) => {
  res.json({
    isPlaying: false,
    title: "Moon River",
    artist: "Frank Ocean",
    album: "Endless",
    url: "https://open.spotify.com/",
    updatedAt: new Date().toISOString(),
    stub: true,
  });
});

app.get("/api/github-stats", async (_req, res) => {
  const stats = await fetchGitHubStats();
  res.json(stats);
});

app.post("/api/ask", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).send("Missing ANTHROPIC_API_KEY");
    return;
  }

  const ip = getIp(req);
  const limit = rateLimit(ip);
  if (!limit.ok) {
    res
      .status(429)
      .send("Rate limit reached — 10 messages per hour. Try again later.");
    return;
  }

  let body;
  try {
    body = req.body;
  } catch {
    res.status(400).send("Invalid JSON");
    return;
  }

  const raw = body?.messages ?? [];
  const messages = raw
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .slice(-20);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    res.status(400).send("Expected a trailing user message");
    return;
  }

  const client = new Anthropic({ apiKey });

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Ratelimit-Remaining", String(limit.remaining));

  try {
    const anthropicStream = client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    for await (const event of anthropicStream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(event.delta.text);
      }
    }
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "stream error";
    res.write(`\n\n[error: ${msg}]`);
    res.end();
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "not_found" });
});

const dist = path.join(ROOT, "dist");
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  app.use(express.static(dist, { maxAge: "1h" }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(dist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 8787);
const CLIENT_DEV_URL =
  process.env.VITE_DEV_URL?.trim() || "http://localhost:3000";

if (!isProd) {
  app.get("/", (_req, res) => {
    res
      .status(200)
      .type("html")
      .send(
        `<!doctype html><html><body style="font-family:system-ui;background:#0a0a0f;color:#e2e8f0;padding:2rem"><h1>API server</h1><p>Open the portfolio at <a href="${CLIENT_DEV_URL}" style="color:#fbbf24">${CLIENT_DEV_URL}</a> while <code>npm run dev</code> is running.</p></body></html>`,
      );
  });
}

const server = app.listen(PORT, () => {
  const mode = isProd ? "API + static" : "API";
  console.log(`${mode} on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err && "code" in err && err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or set SERVER_PORT.`,
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

if (isProd) {
  app.use((err, _req, res, _next) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).type("text").send("Internal Server Error");
    }
  });
}
