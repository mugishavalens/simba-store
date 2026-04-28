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
  googleState: "simba.google-state.v1",
  customerNotificationSeenAt: "simba.customer-notification-seen-at.v1",
  adminNotificationSeenAt: "simba.admin-notification-seen-at.v1",
  customerNotificationFeed: "simba.customer-notification-feed.v1",
  productSnapshot: "simba.product-snapshot.v1",
  assistantMessages: "simba.assistant-messages.v1",
  branchReviews: "simba.branch-reviews.v1",
  suppliers: "simba.suppliers.v1",
  promotions: "simba.promotions.v1",
  adminTab: "simba.admin-tab.v1",
  recentlyViewed: "simba.recently-viewed.v1",
  wishlist: "simba.wishlist.v1",
};

export const VAT_RATE = 0.18;
export const DEFAULT_MIN_STOCK = 5;
export const EXPIRY_ALERT_DAYS = 30;

export const GOOGLE_CLIENT_ID = "258086530526-78tsu8svfh76n6l999qe17ihvoc3q8vl.apps.googleusercontent.com";

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

export const PICKUP_DEPOSIT_RWF = 500;

export const PICKUP_TIMES = [
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00",
  "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00",
  "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00",
  "17:00 - 18:00", "18:00 - 19:00",
];

export const DEFAULT_ADMIN = {
  id: 1,
  fullName: "Simba Admin",
  email: "admin@simba.rw",
  role: "admin",
  password: "SimbaAdmin@2026",
};

export const DEMO_BRANCH_USERS = [
  {
    id: 2,
    fullName: "Remera Branch Manager",
    email: "manager.remera@simba.rw",
    role: "manager",
    password: "SimbaBranch@2026",
    branchId: 1,
  },
  {
    id: 3,
    fullName: "Remera Branch Staff",
    email: "staff.remera@simba.rw",
    role: "staff",
    password: "SimbaBranch@2026",
    branchId: 1,
  },
];

export const SIMBA_BRANCHES = [
  { id: 1,  name: "Simba Supermarket Remera",      lat: -1.9441, lng: 30.1122, address: "KG 9 Ave, Remera, Kigali" },
  { id: 2,  name: "Simba Supermarket Kimironko",   lat: -1.9302, lng: 30.1147, address: "KG 11 Ave, Kimironko, Kigali" },
  { id: 3,  name: "Simba Supermarket Kacyiru",     lat: -1.9380, lng: 30.0870, address: "KG 7 Ave, Kacyiru, Kigali" },
  { id: 4,  name: "Simba Supermarket Nyamirambo",  lat: -1.9750, lng: 30.0450, address: "KN 3 Rd, Nyamirambo, Kigali" },
  { id: 5,  name: "Simba Supermarket Gikondo",     lat: -1.9897, lng: 30.0892, address: "KK 15 Rd, Gikondo, Kigali" },
  { id: 6,  name: "Simba Supermarket Kanombe",     lat: -1.9690, lng: 30.1350, address: "KK 737 St, Kanombe, Kigali" },
  { id: 7,  name: "Simba Supermarket Kinyinya",    lat: -1.9100, lng: 30.1200, address: "KG 18 Ave, Kinyinya, Kigali" },
  { id: 8,  name: "Simba Supermarket Kibagabaga",  lat: -1.9200, lng: 30.1300, address: "KG 21 Ave, Kibagabaga, Kigali" },
  { id: 9,  name: "Simba Supermarket Nyanza",      lat: -2.3500, lng: 29.7400, address: "Nyanza Town, Southern Province" },
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
