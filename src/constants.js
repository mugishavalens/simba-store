export const STORAGE_KEYS = {
  cart: "simba.cart.v2",
  theme: "simba.theme.v2",
  language: "simba.language.v2",
  auth: "simba.auth.v2",
  users: "simba.users.v2",
  currentUser: "simba.current-user.v2",
  orders: "simba.orders.v2",
  messages: "simba.messages.v2",
  products: "simba.products.v2",
  googleNonce: "simba.google-nonce.v1",
  customerNotificationSeenAt: "simba.customer-notification-seen-at.v1",
  adminNotificationSeenAt: "simba.admin-notification-seen-at.v1",
  customerNotificationFeed: "simba.customer-notification-feed.v1",
  productSnapshot: "simba.product-snapshot.v1",
};

export const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

export const LANGUAGES = ["en", "fr", "rw"];

export const CATEGORY_BACKGROUNDS = {
  "Food Products":
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  "Alcoholic Drinks":
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
  "Cosmetics & Personal Care":
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
  "Sports & Wellness":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  "Baby Products":
    "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1200&q=80",
  "Kitchenware & Electronics":
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80",
  General:
    "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80",
};

export const DEFAULT_FILTERS = {
  category: "all",
  price: "all",
  sort: "featured",
  stock: "all",
};

export const PAYMENT_METHODS = ["momo", "card", "cash"];

export const DEFAULT_ADMIN = {
  id: 1,
  fullName: "Simba Admin",
  email: "admin@simba.rw",
  role: "admin",
  password: "SimbaAdmin@2026",
};

export const SIMBA_BRANCHES = [
  { id: 1,  name: "Simba Supermarket - Kiyovu (UTC)",        lat: -1.9500, lng: 30.0588, address: "KN 34 St, Union Trade Center, Kigali" },
  { id: 2,  name: "Simba Supermarket - Gishushu",            lat: -1.9441, lng: 30.0762, address: "KN 5 Road, near RDB, Gasabo, Kigali" },
  { id: 3,  name: "Simba Supermarket - Gacuriro (Simba Center)", lat: -1.9220, lng: 30.0950, address: "KN 4 Ave & KG 14 Ave, Kigali" },
  { id: 4,  name: "Simba Supermarket - Kicukiro",             lat: -1.9897, lng: 30.0892, address: "Kicukiro Center, Kicukiro District, Kigali" },
  { id: 5,  name: "Simba Supermarket - Kimihurura",           lat: -1.9380, lng: 30.0870, address: "Kimihurura, Kigali" },
  { id: 6,  name: "Simba Supermarket - Nyarutarama",          lat: -1.9270, lng: 30.1020, address: "10 KG 334 St, Gasabo District, Kigali" },
  { id: 7,  name: "Simba Supermarket - Centenary House",      lat: -1.9490, lng: 30.0600, address: "Ground Floor, KN 4 Ave, City Center, Kigali" },
  { id: 8,  name: "Simba Stationery - KSEZ",                  lat: -1.9150, lng: 30.0680, address: "Phase 2, Gasabo District, Kigali" },
  { id: 9,  name: "Simba Stationery - Downtown",              lat: -1.9510, lng: 30.0570, address: "Near La Galette, Nyarugenge District, Kigali" },
  { id: 10, name: "Simba Distributor - Rubavu",               lat: -1.6800, lng: 29.3500, address: "Western Province, Rubavu" },
  { id: 11, name: "Simba Distributor - Huye",                 lat: -2.5960, lng: 29.7390, address: "Southern Province, Huye" },
  { id: 12, name: "Simba Distributor - Bugesera",             lat: -2.1500, lng: 30.1500, address: "Eastern Province, Bugesera" },
];

export const SHOPPING_ASSISTANT_PROMPT = `You are an intelligent shopping assistant for Simba Supermarket in Rwanda.

Your job is to help users find products from Simba's catalog quickly and naturally.

You MUST:
- Understand the user's intent, even when the request is vague (for example: "something for breakfast").
- Recommend relevant products only from the provided catalog.
- Group results logically (for example: dairy, bakery, drinks).
- Respond in a friendly, helpful, and concise tone.

Context:
- Simba is a trusted supermarket in Kigali.
- Users may prefer fast pick-up from nearby branches.
- Products include groceries, fresh food, and household items.

Rules:
- Never invent products that are not in the catalog.
- If no exact match exists, suggest the closest alternatives.
- If the query is broad, ask one short clarifying question or suggest top categories.
- Keep responses short and useful.
- Always include product names and, when available, price and category.

Multilingual:
- Detect user language automatically (English, Kinyarwanda, French).
- Respond in the same language.

Output format:
1. Short natural response (1-2 sentences).
2. List of recommended products.

Availability:
- If the user asks for availability, mention branch-based availability when provided.

Goal:
Make shopping feel fast, human, and effortless.`;
