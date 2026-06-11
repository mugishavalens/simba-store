import { PICKUP_DEPOSIT_RWF, VAT_RATE } from "./constants.js";

export function getActivePromotion(productId, promotions) {
  if (!Array.isArray(promotions) || !promotions.length) return null;
  const now = Date.now();
  return (
    promotions.find((promo) => {
      if (!promo || Number(promo.productId) !== Number(productId)) return false;
      const percent = Number(promo.percent);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 90) return false;
      if (promo.endDate) {
        const ends = new Date(promo.endDate).getTime();
        if (Number.isFinite(ends) && ends < now) return false;
      }
      return true;
    }) || null
  );
}

export function getEffectivePrice(product, promotions) {
  if (!product) return 0;
  const promo = getActivePromotion(product.id, promotions);
  const base = Number(product.price) || 0;
  if (!promo) return base;
  return Math.max(0, Math.round(base * (1 - Number(promo.percent) / 100)));
}

export function computeVAT(amount) {
  const a = Number(amount) || 0;
  return Math.round(a - a / (1 + VAT_RATE));
}

export function formatPrice(value) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getCategories(products) {
  return [...new Set(products.map((product) => product.category))].sort((a, b) =>
    a.localeCompare(b),
  );
}

const SEARCH_STOP_WORDS = new Set([
  "a",
  "about",
  "all",
  "an",
  "and",
  "any",
  "around",
  "below",
  "buy",
  "can",
  "category",
  "cheap",
  "cheaper",
  "cost",
  "costs",
  "certain",
  "find",
  "for",
  "from",
  "get",
  "give",
  "have",
  "i",
  "in",
  "into",
  "is",
  "item",
  "items",
  "like",
  "less",
  "looking",
  "me",
  "need",
  "needs",
  "of",
  "over",
  "please",
  "price",
  "product",
  "products",
  "rf",
  "rwf",
  "search",
  "see",
  "show",
  "some",
  "something",
  "someone",
  "that",
  "the",
  "than",
  "to",
  "under",
  "up",
  "want",
  "wanting",
  "with",
  "would",
  "you",
]);

const SEARCH_ALIASES = {
  // Dairy
  dairy: ["milk", "cream", "cheese", "yoghurt", "yogurt"],
  // Drinks (non-alcoholic)
  drink: ["juice", "water", "soda", "milk"],
  drinks: ["juice", "water", "soda", "milk"],
  beverage: ["juice", "water", "soda", "milk"],
  beverages: ["juice", "water", "soda", "milk"],
  // Alcoholic drinks — real Rwandan catalog brands
  beer: ["miitzig", "amstel", "heineken", "corona", "guinness", "leffe", "skol", "legend"],
  beers: ["miitzig", "amstel", "heineken", "corona", "guinness", "leffe", "skol", "legend"],
  alcohol: ["miitzig", "amstel", "heineken", "whisky", "wine", "beer", "vodka", "cognac"],
  alcoholic: ["miitzig", "amstel", "heineken", "whisky", "wine", "beer", "vodka", "cognac"],
  spirits: ["whisky", "vodka", "gin", "rum", "cognac", "brandy"],
  wine: ["wine", "champagne", "sparkling", "chamdor", "cinzano"],
  wines: ["wine", "champagne", "sparkling", "chamdor", "cinzano"],
  champagne: ["champagne", "sparkling", "cinzano", "eva"],
  whisky: ["whisky", "whiskey", "scotch", "bond", "black label", "belle france"],
  whiskey: ["whisky", "whiskey", "scotch", "bond"],
  cognac: ["cognac", "abk6", "reviseur"],
  vodka: ["vodka", "gin", "rum"],
  // Food & meals
  breakfast: ["bread", "milk", "tea", "coffee", "cereal", "flour"],
  lunch: ["rice", "bread", "chicken", "meat", "snack", "canned food"],
  dinner: ["rice", "bread", "chicken", "meat", "pasta", "canned food", "sauce"],
  meal: ["rice", "bread", "chicken", "meat", "snack", "dinner", "lunch"],
  food: ["rice", "bread", "chicken", "meat", "canned food", "snack"],
  shopping: ["rice", "bread", "chicken", "meat", "oil", "sugar", "flour"],
  snack: ["biscuit", "crisp", "chips", "chocolate", "candy", "sweet"],
  snacks: ["biscuit", "crisp", "chips", "chocolate", "candy", "sweet"],
  meat: ["beef", "chicken", "sausage", "corned beef", "luncheon", "smokies"],
  sauce: ["ketchup", "mayonnaise", "chilli", "tomato sauce", "soy"],
  condiments: ["ketchup", "mayonnaise", "chilli", "vinegar"],
  // Staples
  rice: ["basmati", "rice", "jasmine"],
  grains: ["rice", "couscous", "flour", "maize", "wheat", "cereal"],
  oil: ["sunflower oil", "olive oil", "cooking oil", "avocado oil"],
  flour: ["wheat flour", "maize flour", "corn flour", "baking flour"],
  sugar: ["sugar", "icing sugar"],
  // Baby
  baby: ["baby", "lactogen", "diapers", "wipes", "pampers", "huggies"],
  diapers: ["diapers", "pampers", "huggies", "nappies", "baby"],
  // Cleaning
  cleaning: ["detergent", "bleach", "disinfectant", "cleaner", "soap", "sanitizer"],
  detergent: ["detergent", "washing powder", "laundry", "fabric"],
  laundry: ["detergent", "washing powder", "fabric softener"],
  bleach: ["bleach", "jik", "disinfectant", "sanitizer"],
  toiletpaper: ["toilet paper", "tissue", "paper", "wipes"],
  // Beauty & personal care
  beauty: ["shampoo", "conditioner", "lotion", "cream", "perfume", "soap", "deodorant"],
  cosmetics: ["makeup", "lipstick", "foundation", "mascara", "eyeshadow", "nail"],
  skincare: ["lotion", "cream", "moisturizer", "sunscreen", "face wash"],
  haircare: ["shampoo", "conditioner", "hair oil", "hair treatment"],
  soap: ["soap", "body wash", "shower gel", "hand wash"],
  shampoo: ["shampoo", "conditioner", "hair"],
  perfume: ["perfume", "cologne", "body spray", "deodorant"],
  deodorant: ["deodorant", "antiperspirant", "body spray"],
  toothpaste: ["toothpaste", "toothbrush", "mouthwash", "dental"],
  // Kitchen
  cookware: ["pot", "pan", "frying pan", "wok", "saucepan"],
  pots: ["pot", "saucepan", "pressure cooker", "casserole"],
  appliances: ["iron", "kettle", "blender", "toaster", "microwave"],
  // Pet
  pet: ["pet food", "dog food", "cat food", "animal"],
  dog: ["dog food", "pet", "animal"],
  cat: ["cat food", "pet", "animal"],
  // Storage
  containers: ["container", "canister", "jar", "storage box", "organizer"],
};

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSearchIntent(search) {
  const raw = String(search || "").toLowerCase();
  const normalized = normalizeSearchText(raw);
  const intent = {
    query: normalized,
    maxPrice: null,
    maxPriceExclusive: false,
    minPrice: null,
  };

  const betweenMatch = raw.match(
    /(?:between|from)\s*(?:rf|rwf)?\s*([\d\s,.]+)\s*(?:and|to|-)\s*(?:rf|rwf)?\s*([\d\s,.]+)\s*(?:rwf|rf)?/i,
  );
  if (betweenMatch) {
    const first = parseSearchAmount(betweenMatch[1]);
    const second = parseSearchAmount(betweenMatch[2]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      intent.minPrice = Math.min(first, second);
      intent.maxPrice = Math.max(first, second);
    }
  }

  const maxMatch = raw.match(
    /(under|below|less than|up to|maximum|max|cheaper than)\s*(?:rf|rwf)?\s*([\d\s,.]+)\s*(?:rwf|rf)?/i,
  );
  if (maxMatch) {
    const value = parseSearchAmount(maxMatch[2]);
    if (Number.isFinite(value)) {
      intent.maxPrice = value;
      intent.maxPriceExclusive = ["under", "below", "less than", "cheaper than"].includes(maxMatch[1]);
    }
  }

  const minMatch = raw.match(
    /(?:over|above|more than|at least|minimum|min)\s*(?:rf|rwf)?\s*([\d\s,.]+)\s*(?:rwf|rf)?/i,
  );
  if (minMatch) {
    const value = parseSearchAmount(minMatch[1]);
    if (Number.isFinite(value)) intent.minPrice = value;
  }

  return intent;
}

function parseSearchAmount(value) {
  const amount = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function getSearchTokens(search) {
  const intent = parseSearchIntent(search);
  const normalized = intent.query;
  const baseTokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token) && !/^\d+(?:rwf|rf)?$/.test(token));
  const expanded = new Map(baseTokens.map((token) => [token, { token, weight: 1, primary: true }]));

  baseTokens.forEach((token) => {
    (SEARCH_ALIASES[token] || []).forEach((alias) => {
      if (!expanded.has(alias)) expanded.set(alias, { token: alias, weight: 0.45, primary: false });
    });
  });

  return [...expanded.values()];
}

function hasTokenMatch(text, token) {
  if (text.includes(token)) return true;
  return text.split(" ").some((part) => isNearSearchToken(part, token));
}

function isNearSearchToken(value, token) {
  if (token.length < 4 || value.length < 4 || Math.abs(value.length - token.length) > 1) return false;
  let edits = 0;
  let i = 0;
  let j = 0;
  while (i < value.length && j < token.length) {
    if (value[i] === token[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (value.length > token.length) i += 1;
    else if (token.length > value.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (value.length - i) + (token.length - j) <= 1;
}

function scoreSearchProduct(product, rawQuery, queryTokens) {
  if (!rawQuery && !queryTokens.length) return 1;

  const name = normalizeSearchText(product.name);
  const category = normalizeSearchText(product.category);
  const haystack = `${name} ${category}`;
  const compactQuery = queryTokens
    .filter((entry) => entry.weight === 1)
    .map((entry) => entry.token)
    .join(" ");
  let score = 0;

  if (compactQuery && name.includes(compactQuery)) score += 16;
  if (compactQuery && category.includes(compactQuery)) score += 10;
  if (rawQuery && name.includes(rawQuery)) score += 12;
  if (rawQuery && category.includes(rawQuery)) score += 8;

  queryTokens.forEach(({ token, weight }) => {
    const nameMatches = hasTokenMatch(name, token);
    const categoryMatches = hasTokenMatch(category, token);

    if (name === token) score += 12 * weight;
    else if (name.startsWith(`${token} `)) score += 8 * weight;
    else if (nameMatches) score += 6 * weight;

    if (category === token) score += 8 * weight;
    else if (categoryMatches) score += 3 * weight;

    if (nameMatches || categoryMatches || haystack.includes(token)) score += 1 * weight;
  });

  if (
    queryTokens.some((entry) => entry.token === "milk" && entry.weight === 1) &&
    /\b(uht|low fat|whole|flavoured|flavored|\d+(?:\.\d+)?\s?(?:ml|l|ltr|litre|liter))\b/.test(name)
  ) {
    score += 6;
  }

  if (product.inStock) score += 1;
  return score;
}

export function searchProducts(products, search, filters = {}) {
  const intent = parseSearchIntent(search);
  const query = intent.query;
  const queryTokens = getSearchTokens(search);
  const primaryTokens = queryTokens.filter((entry) => entry.primary);
  const scored = products
    .map((product) => ({
      product,
      score: scoreSearchProduct(product, query, queryTokens),
    }))
    .filter(({ product, score }) => {
      const productText = `${normalizeSearchText(product.name)} ${normalizeSearchText(product.category)}`;
      const matchesPrimary =
        !primaryTokens.length ||
        queryTokens.some((entry) => hasTokenMatch(productText, entry.token));
      const matchesSearch = !query || (score > 0 && matchesPrimary);
      const matchesIntentPrice =
        (intent.maxPrice === null ||
          (intent.maxPriceExclusive ? Number(product.price) < intent.maxPrice : Number(product.price) <= intent.maxPrice)) &&
        (intent.minPrice === null || Number(product.price) >= intent.minPrice);
      const matchesCategory = !filters.category || filters.category === "all" || product.category === filters.category;
      const matchesStock =
        !filters.stock ||
        filters.stock === "all" ||
        (filters.stock === "in" && product.inStock) ||
        (filters.stock === "out" && !product.inStock);
      const matchesPrice =
        !filters.price ||
        filters.price === "all" ||
        (filters.price === "low" && product.price < 5000) ||
        (filters.price === "mid" && product.price >= 5000 && product.price <= 20000) ||
        (filters.price === "high" && product.price > 20000);
      return matchesSearch && matchesIntentPrice && matchesCategory && matchesStock && matchesPrice;
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.product.inStock) - Number(a.product.inStock) ||
        Number(a.product.price) - Number(b.product.price),
    );

  return scored;
}

export function applyFilters(products, search, filters) {
  let next = searchProducts(products, search, filters).map((entry) => entry.product);

  if (filters.sort === "low") next = next.sort((a, b) => a.price - b.price);
  if (filters.sort === "high") next = next.sort((a, b) => b.price - a.price);
  if (filters.sort === "featured") next = next.sort((a, b) => Number(b.inStock) - Number(a.inStock));

  return next;
}

export function summarizeCart(products, cart, promotions = []) {
  const detailed = cart
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) return null;
      const promo = getActivePromotion(product.id, promotions);
      const unitPrice = promo
        ? Math.max(0, Math.round(Number(product.price) * (1 - Number(promo.percent) / 100)))
        : Number(product.price) || 0;
      const baseLine = (Number(product.price) || 0) * item.quantity;
      const lineTotal = unitPrice * item.quantity;
      return {
        ...item,
        product,
        unitPrice,
        promotion: promo || null,
        lineTotal,
        savings: Math.max(0, baseLine - lineTotal),
      };
    })
    .filter(Boolean);

  const subtotal = detailed.reduce((sum, item) => sum + item.lineTotal, 0);
  const savings = detailed.reduce((sum, item) => sum + item.savings, 0);
  const deposit = subtotal > 0 ? PICKUP_DEPOSIT_RWF : 0;
  return {
    items: detailed,
    subtotal,
    savings,
    deposit,
    vat: computeVAT(subtotal),
    total: subtotal + deposit,
    count: detailed.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, id, mode] = hash.split("/").filter(Boolean);
  if (!path) return { name: "home" };
  if (path === "product" && id) return { name: "product", id: Number(id) };
  if (path === "checkout") return { name: "checkout" };
  if (path === "auth") return { name: "auth", mode: id || "signin" };
  if (path === "account") return { name: "account" };
  if (path === "admin") return { name: "admin" };
  if (path === "clients") return { name: "clients" };
  if (path === "branch") return { name: "branch" };
  return { name: "home" };
}
