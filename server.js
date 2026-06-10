import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const normalized = normalize(decoded).replace(/^(\.\.[\\/])+/, "");
  const full = resolve(join(root, normalized));
  if (!full.startsWith(root)) return null;
  return full;
}

async function serveFile(filePath, res) {
  const data = await readFile(filePath);
  const ext = extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(data);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleAiSearch(req, res) {
  try {
    const raw = await readBody(req);
    const { query } = JSON.parse(raw);
    if (!query || typeof query !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "query required" }));
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "AI search not configured" }));
      return;
    }

    const isGroq = apiKey.startsWith("gsk_");
    const baseUrl = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = isGroq ? "llama-3.1-8b-instant" : "gpt-4o-mini";

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 60,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You are a search assistant for Simba Supermarket in Rwanda.
The user types a natural language query. Extract the core product search term(s) AND preserve any price constraint.

Rules:
- Return ONLY a short phrase — no explanation, no punctuation, no quotes.
- Strip filler words like "i want", "show me", "find", "i need", "give me", "looking for", "things for".
- IMPORTANT: If the query contains a price limit (under X, below X, less than X, under X rwf), append it exactly to the output, e.g. "beer under 5000" or "milk under 1000 rwf".
- Map intents to product keywords using these real Rwandan supermarket brands:
    alcohol / beer → miitzig amstel heineken corona
    wine / champagne → wine sparkling eva chamdor
    whisky / spirits → whisky bond cognac vodka
    breakfast → bread milk tea cereal
    drinks / beverages → juice water soda
    cleaning → detergent soap bleach
    baby → lactogen wipes diapers
- If the query already contains a product name, return it directly (with price if present).
- If no clear product intent, return the most relevant noun(s).

Examples:
  "i want things for breakfast" → "bread milk cereal"
  "i want alcohol" → "miitzig amstel heineken beer"
  "i want alcohol under 5000" → "miitzig amstel heineken beer under 5000"
  "i want to alcohol" → "miitzig amstel heineken beer"
  "cheap beer" → "miitzig amstel beer"
  "something to clean the floor" → "floor cleaner mop"
  "snacks for kids" → "biscuits crisps snacks"
  "milk under 1000" → "milk under 1000"
  "whisky under 15000" → "whisky under 15000"`,
          },
          { role: "user", content: query },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "AI upstream error" }));
      return;
    }

    const data = await response.json();
    const searchTerm = data.choices?.[0]?.message?.content?.trim() || query;

    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ searchTerm }));
  } catch (err) {
    console.error("AI search error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal error" }));
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/ai-search") {
      await handleAiSearch(req, res);
      return;
    }

    let urlPath = req.url || "/";
    if (urlPath === "/") urlPath = "/index.html";

    const filePath = safeJoin(ROOT, urlPath);
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const s = await stat(filePath);
      if (s.isDirectory()) {
        await serveFile(join(filePath, "index.html"), res);
        return;
      }
      await serveFile(filePath, res);
    } catch {
      if (!extname(urlPath)) {
        await serveFile(join(ROOT, "index.html"), res);
        return;
      }
      res.writeHead(404);
      res.end("Not Found");
    }
  } catch (err) {
    console.error("Server error:", err);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Simba 2.0 static server running at http://${HOST}:${PORT}`);
});
