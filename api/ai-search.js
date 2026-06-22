// Vercel serverless function — mirrors server.js handleAiSearch

function localNlSearch(query) {
  const q = query.toLowerCase();
  const strip = (s) => s.replace(/\b(i want|show me|find|looking for|give me|something for|things for|je veux|cherche|ndashaka|mbona)\b/g, " ").trim();
  const cleaned = strip(q);
  const rules = [
    { terms: ["breakfast","cereal","oatmeal","porridge","toast"], searchTerm: "bread milk cereal oatmeal", category: "Food Products" },
    { terms: ["lunch","rice","beans","pasta"], searchTerm: "rice beans pasta", category: "Food Products" },
    { terms: ["dinner","supper"], searchTerm: "rice chicken meat", category: "Food Products" },
    { terms: ["snack","chips","biscuit","crisps","cracker"], searchTerm: "biscuits crisps snacks", category: "Food Products" },
    { terms: ["beer","biere","inzoga","miitzig","amstel","heineken","primus","turbo king"], searchTerm: "miitzig amstel heineken beer primus", category: "Alcoholic Drinks" },
    { terms: ["wine","sparkling","chamdor","champagne"], searchTerm: "wine sparkling chamdor", category: "Alcoholic Drinks" },
    { terms: ["whisky","whiskey","vodka","cognac","rum","gin","spirit"], searchTerm: "whisky vodka gin rum", category: "Alcoholic Drinks" },
    { terms: ["alcohol","alcool","boisson alcool"], searchTerm: "beer wine whisky", category: "Alcoholic Drinks" },
    { terms: ["milk","lait","amata","dairy","yogurt","cheese","butter"], searchTerm: "milk yogurt butter", category: "Food Products" },
    { terms: ["baby","diapers","pampers","wipes","lactogen","infant","formula"], searchTerm: "lactogen diapers wipes baby", category: "Baby Products" },
    { terms: ["clean","detergent","bleach","toilet paper","laundry","soap","savon"], searchTerm: "detergent bleach cleaner soap", category: "Cleaning & Sanitary" },
    { terms: ["shampoo","lotion","cream","perfume","deodor","makeup","skincare","beauty","cosmetic","hair"], searchTerm: "shampoo lotion cream cosmetics", category: "Cosmetics & Personal Care" },
    { terms: ["pot","pan","kettle","iron","cookware","kitchen","cup","mug","bowl"], searchTerm: "pots pans cookware kitchen", category: "Kitchenware & Electronics" },
    { terms: ["sport","fitness","gym","wellness"], searchTerm: "sports fitness wellness", category: "Sports & Wellness" },
    { terms: ["pet","dog","cat","animal","bird"], searchTerm: "pet food animal", category: "Pet Care" },
    { terms: ["water","juice","soda","soft drink","beverage"], searchTerm: "water juice soda drink", category: "Food Products" },
    { terms: ["flour","sugar","grain","cooking oil","oil","salt","staple"], searchTerm: "flour sugar rice oil", category: "General" },
  ];
  for (const rule of rules) {
    if (rule.terms.some((t) => new RegExp(t).test(cleaned))) {
      return { searchTerm: rule.searchTerm, category: rule.category };
    }
  }
  return { searchTerm: cleaned || query, category: "all" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = "";
  try {
    if (typeof req.body === "object") {
      body = req.body;
    } else {
      body = JSON.parse(req.body || "{}");
    }
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const { query, apiKey: bodyApiKey } = body;
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query required" });
    return;
  }

  const requestApiKey = req.headers["x-groq-api-key"] || bodyApiKey;
  const apiKey = String(requestApiKey || process.env.GROQ_API_KEY || "").trim();

  if (!apiKey) {
    const localResult = localNlSearch(query);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(localResult);
    return;
  }

  try {
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
            content: `You are a search assistant for Simba Supermarket Rwanda. Given a user query, return ONLY a JSON object: {"searchTerm":"<1-5 keywords>","category":"<category or all>"}. Categories: "Alcoholic Drinks","Cosmetics & Personal Care","General","Food Products","Kitchenware & Electronics","Cleaning & Sanitary","Baby Products","Pet Care","Sports & Wellness","all". Strip filler words. Preserve price constraints.`,
          },
          { role: "user", content: query },
        ],
      }),
    });

    if (!response.ok) {
      const fallback = localNlSearch(query);
      res.status(200).json(fallback);
      return;
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content?.trim() || "{}";
    try {
      const parsed = JSON.parse(aiText);
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ searchTerm: parsed.searchTerm || query, category: parsed.category || "all" });
    } catch {
      const fallback = localNlSearch(query);
      res.status(200).json(fallback);
    }
  } catch {
    const fallback = localNlSearch(query);
    res.status(200).json(fallback);
  }
}
