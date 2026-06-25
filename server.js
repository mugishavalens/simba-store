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

function localNlSearch(query) {
  const q = query.toLowerCase();
  const strip = (s) => s.replace(/\b(i want|show me|find|looking for|give me|something for|things for|je veux|cherche|ndashaka|mbona)\b/g, " ").trim();
  const cleaned = strip(q);

  // searchTerm null → use cleaned keyword (appears in product names); string → concept expansion
  const rules = [
    { terms: ["breakfast","ifunguro","oatmeal","porridge","toast"], searchTerm: "bread milk cereal oatmeal", category: "Food Products" },
    { terms: ["lunch","dejeuner","amafunguro"], searchTerm: "rice beans pasta", category: "Food Products" },
    { terms: ["dinner","souper","diner"], searchTerm: "rice chicken meat", category: "Food Products" },
    { terms: ["snack","gouter"], searchTerm: "biscuits crisps chips chocolate", category: "Food Products" },
    { terms: ["alcohol","alcool","boisson alcool"], searchTerm: "miitzig amstel heineken beer wine whisky vodka gin rum", category: "Alcoholic Drinks" },
    { terms: ["beer","biere","inzoga","miitzig","amstel","heineken","corona","primus","turbo king"], searchTerm: null, category: "Alcoholic Drinks" },
    { terms: ["wine","vin","divin","sparkling","chamdor","champagne"], searchTerm: null, category: "Alcoholic Drinks" },
    { terms: ["whisky","whiskey","scotch","vodka","cognac","rum","gin","spirit"], searchTerm: null, category: "Alcoholic Drinks" },
    { terms: ["milk","lait","amata","dairy","yogurt","cheese","butter","cream"], searchTerm: null, category: "Food Products" },
    { terms: ["chips","biscuit","crisps","cracker","chocolate","candy"], searchTerm: null, category: "Food Products" },
    { terms: ["baby","bebe","umwana","diapers","pampers","wipes","lactogen","infant","formula"], searchTerm: null, category: "Baby Products" },
    { terms: ["clean","nettoy","gusan","detergent","bleach","disinfect","sanitiz","soap","savon","laundry"], searchTerm: null, category: "Cleaning & Sanitary" },
    { terms: ["shampoo","conditioner","lotion","cream","perfume","deodor","makeup","skincare","beauty","cosmetic","hair"], searchTerm: null, category: "Cosmetics & Personal Care" },
    { terms: ["pot","pan","kettle","iron","cookware","applian","kitchen","cup","mug","bowl"], searchTerm: null, category: "Kitchenware & Electronics" },
    { terms: ["sport","fitness","gym","wellness","exercise"], searchTerm: null, category: "Sports & Wellness" },
    { terms: ["pet","dog","cat","animal","bird"], searchTerm: null, category: "Pet Care" },
    { terms: ["water","juice","soda","soft drink","beverage","amazi"], searchTerm: null, category: "Food Products" },
    { terms: ["flour","sugar","rice","grain","cooking oil","oil","huile","sel","salt","staple"], searchTerm: null, category: "General" },
  ];

  for (const rule of rules) {
    if (rule.terms.some((t) => new RegExp(t).test(cleaned))) {
      return { searchTerm: rule.searchTerm !== null ? rule.searchTerm : cleaned, category: rule.category };
    }
  }
  return { searchTerm: cleaned || query, category: "all" };
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
      // Local NL fallback — no API key needed
      const localResult = localNlSearch(query);
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(localResult));
      return;
    }

    const isGroq = apiKey.startsWith("gsk_");
    const baseUrl = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

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
