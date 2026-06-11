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
    const { query, apiKey: bodyApiKey } = JSON.parse(raw);
    if (!query || typeof query !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "query required" }));
      return;
    }

    const requestApiKey = req.headers["x-groq-api-key"] || bodyApiKey;
    const apiKey = String(requestApiKey || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "").trim();
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
Given a user query, return a JSON object with two fields:
  "searchTerm": core product keywords (1-5 words), preserving any price constraint
  "category": the single best matching category from the list below, or "all" if none fits

CATEGORIES (use exact spelling):
  "Alcoholic Drinks"         — beer, wine, spirits, whisky, vodka, gin, rum, cognac, champagne
  "Cosmetics & Personal Care"— soap, shampoo, lotion, cream, perfume, deodorant, makeup, skincare, hair, beauty, toothpaste
  "General"                  — rice, couscous, flour, sugar, grains, pasta, cereal, oil, cooking oil, staples, bread
  "Food Products"            — meat, sausage, beef, chicken, corned beef, ketchup, mayo, sauce, condiments, canned food, snacks, lunch, dinner, meal, food, rice, bread
  "Kitchenware & Electronics"— pots, pans, iron, kettle, appliances, cookware, kitchen equipment, cups, coffee pot
  "Cleaning & Sanitary"      — detergent, bleach, toilet paper, cleaning, disinfectant, mop, sanitizer, laundry
  "Baby Products"            — baby, diapers, wipes, lactogen, infant, formula, baby food
  "Pet Care"                 — pet, dog, cat, animal food, bird
  "Kitchen Storage"          — containers, storage jars, organizers, canisters
  "Sports & Wellness"        — sports, fitness, wellness, gym
  "all"                      — when query spans multiple categories or is unclear

RULES:
- Return ONLY valid JSON, nothing else. No explanation, no markdown.
- searchTerm: strip filler words ("i want", "show me", "find", "looking for", "things for", "give me").
- searchTerm: if query has a price constraint (under X, over X, below X, less than X, more than X), keep it e.g. "beer under 5000" or "whisky over 10000".
- searchTerm: use real product names from this catalog where possible:
    beer → miitzig amstel heineken corona guinness leffe
    whisky → whisky bond scotch
    wine → wine sparkling chamdor
    breakfast → bread milk tea cereal
    cleaning → detergent bleach soap
    baby → lactogen wipes diapers

EXAMPLES:
  "i want alcohol under 5000"     → {"searchTerm":"miitzig amstel heineken beer under 5000","category":"Alcoholic Drinks"}
  "i want alcohol over 5000"      → {"searchTerm":"miitzig amstel heineken beer over 5000","category":"Alcoholic Drinks"}
  "i want things for breakfast"   → {"searchTerm":"bread milk cereal","category":"General"}
  "something to clean the floor"  → {"searchTerm":"floor cleaner detergent","category":"Cleaning & Sanitary"}
  "shampoo and conditioner"       → {"searchTerm":"shampoo conditioner","category":"Cosmetics & Personal Care"}
  "baby diapers"                  → {"searchTerm":"diapers wipes","category":"Baby Products"}
  "cooking pots"                  → {"searchTerm":"pots cookware","category":"Kitchenware & Electronics"}
  "rice under 10000"              → {"searchTerm":"rice under 10000","category":"General"}
  "snacks for kids"               → {"searchTerm":"biscuits crisps snacks","category":"Food Products"}
  "lunch ingredients"             → {"searchTerm":"rice chicken bread","category":"Food Products"}
  "dinner for two"                → {"searchTerm":"rice chicken meat","category":"Food Products"}
  "milk"                          → {"searchTerm":"milk","category":"all"}
  "pet food"                      → {"searchTerm":"pet food","category":"Pet Care"}`,
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
    const aiText = data.choices?.[0]?.message?.content?.trim() || "{}";
    let searchTerm = query;
    let category = "all";
    try {
      const parsed = JSON.parse(aiText);
      searchTerm = parsed.searchTerm || query;
      category = parsed.category || "all";
    } catch {
      searchTerm = aiText || query;
    }

    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ searchTerm, category }));
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
