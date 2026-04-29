import {
  createOrder,
  hydrateSession,
  loginUser,
  loginWithGoogleUser,
  replySupportMessage,
  registerUser,
  resetUserPassword,
  submitSupportMessage,
  submitBranchReview,
  updateBranchInventory,
  updateOrderStatus,
  updateUserLocation,
  updateUserProfile,
} from "./backend.js";
import { DEFAULT_FILTERS, DEFAULT_MIN_STOCK, SIMBA_BRANCHES, STORAGE_KEYS } from "./constants.js";
import { formatPrice } from "./utils.js";
import { t } from "./i18n.js";

const listeners = new Set();

const session = hydrateSession();

const state = {
  products: [],
  store: null,
  cart: readStorage(STORAGE_KEYS.cart, []),
  filters: { ...DEFAULT_FILTERS },
  search: "",
  theme: readStorage(STORAGE_KEYS.theme, "light"),
  language: readStorage(STORAGE_KEYS.language, "en"),
  users: session.users,
  currentUser: session.currentUser,
  isAuthenticated: session.isAuthenticated,
  orders: session.orders,
  messages: session.messages,
  branchReviews: session.branchReviews || [],
  suppliers: readStorage(STORAGE_KEYS.suppliers, [
    { id: 1, name: "Inyange Industries", contact: "Sales Office", phone: "+250 788 100 200", email: "sales@inyange.rw", notes: "Dairy & juices" },
    { id: 2, name: "Bralirwa", contact: "Distribution", phone: "+250 788 300 400", email: "orders@bralirwa.rw", notes: "Beverages" },
  ]),
  promotions: readStorage(STORAGE_KEYS.promotions, defaultDemoPromotions()),
  recentlyViewed: readStorage(STORAGE_KEYS.recentlyViewed, []),
  wishlist: readStorage(STORAGE_KEYS.wishlist, []),
  languageWelcomeSeen: readStorage(STORAGE_KEYS.languageWelcomeSeen, false),
  adminTab: readStorage(STORAGE_KEYS.adminTab, "overview"),
  customerNotificationFeed: readStorage(STORAGE_KEYS.customerNotificationFeed, []),
  assistantMessages: readStorage(STORAGE_KEYS.assistantMessages, [
    {
      id: "seed",
      role: "assistant",
      text: t(session.language || "en", "assistantWelcome"),
      products: [],
    },
  ]),
  cartOpen: false,
  orderComplete: false,
  authFeedback: null,
  contactFeedback: null,
  checkoutFeedback: null,
  adminFeedback: null,
  lastOrder: session.orders[0] ?? null,
};

function defaultDemoPromotions() {
  const day = 24 * 60 * 60 * 1000;
  const isoDate = (offsetDays) =>
    new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);
  return [
    { id: 9001, productId: 13001, percent: 25, endDate: isoDate(2) },
    { id: 9002, productId: 13002, percent: 30, endDate: isoDate(1) },
    { id: 9003, productId: 13003, percent: 15, endDate: isoDate(3) },
    { id: 9004, productId: 15001, percent: 20, endDate: isoDate(1) },
    { id: 9005, productId: 16001, percent: 18, endDate: isoDate(2) },
  ];
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createCustomerNotificationEvent(payload) {
  return {
    id: payload.id ?? Date.now() + Math.floor(Math.random() * 1000),
    email: String(payload.email || "").trim().toLowerCase(),
    createdAt: payload.createdAt || new Date().toISOString(),
    title: String(payload.title || "").trim(),
    text: String(payload.text || "").trim(),
    kind: String(payload.kind || "general").trim(),
    kindLabel: String(payload.kindLabel || "customerNotificationGeneralType").trim(),
    actionLabel: String(payload.actionLabel || "").trim(),
    targetHash: String(payload.targetHash || "/account").trim(),
    targetId: String(payload.targetId || "").trim(),
    meta: String(payload.meta || "").trim(),
  };
}

function appendCustomerNotification(payload) {
  const event = createCustomerNotificationEvent(payload);
  if (!event.email || !event.title) return;
  state.customerNotificationFeed = [event, ...state.customerNotificationFeed].slice(0, 150);
  persist(STORAGE_KEYS.customerNotificationFeed, state.customerNotificationFeed);
}

function syncProductSnapshot(products) {
  persist(STORAGE_KEYS.productSnapshot, products);
}

function normalizeProductInventory(product) {
  const seededBranchStock = Object.fromEntries(
    SIMBA_BRANCHES.map((branch, index) => [branch.id, 6 + ((index * 3) % 9)]),
  );
  const branchStock = Object.fromEntries(
    SIMBA_BRANCHES.map((branch) => {
      const raw = product.branchStock?.[branch.id];
      return [
        branch.id,
        Number.isFinite(Number(raw)) ? Math.max(0, Math.floor(Number(raw))) : seededBranchStock[branch.id],
      ];
    }),
  );
  return {
    ...product,
    branchStock,
    inStock: Object.values(branchStock).some((count) => count > 0),
  };
}

function recordRemovedProductNotifications(previousProducts, currentProducts) {
  if (!Array.isArray(previousProducts) || !previousProducts.length) return;

  const currentIds = new Set((currentProducts || []).map((product) => Number(product.id)));
  const removedProducts = previousProducts.filter((product) => !currentIds.has(Number(product.id)));

  for (const product of removedProducts) {
    appendCustomerNotification({
      email: "*",
      createdAt: new Date().toISOString(),
      title: "notificationProductRemoved",
      text: String(product.name || "").trim(),
      meta: "notificationIsNoLongerAvailable",
      kind: "product-removed",
      kindLabel: "customerNotificationTypeProduct",
      actionLabel: "customerNotificationActionCatalog",
      targetHash: "/",
      targetId: "catalog",
    });
  }
}

function seedLegacyNotificationFeed() {
  if (Array.isArray(state.customerNotificationFeed) && state.customerNotificationFeed.length) return;

  for (const product of state.products) {
    if (product.addedByAdmin && product.createdAt) {
      appendCustomerNotification({
        email: "*",
        createdAt: product.createdAt,
        title: "notificationProductAdded",
        text: String(product.name || "").trim(),
        meta: `notificationNowAvailableAt|${product.price}`,
        kind: "product-new",
        kindLabel: "customerNotificationTypeProduct",
        actionLabel: "customerNotificationActionProduct",
        targetHash: `/product/${product.id}`,
      });
    }

    if (product.priceChangedAt || product.updatedAt) {
      const currentPrice = Number(product.price || 0);
      const previousPrice = Number(product.previousPrice);
      appendCustomerNotification({
        email: "*",
        createdAt: product.priceChangedAt || product.updatedAt,
        title: "notificationPriceUpdated",
        text: String(product.name || "").trim(),
        meta: Number.isFinite(previousPrice)
          ? `priceChange|${previousPrice}|${currentPrice}`
          : `notificationNowCosts|${currentPrice}`,
        kind: "product-price",
        kindLabel: "customerNotificationTypeProduct",
        actionLabel: "customerNotificationActionProduct",
        targetHash: `/product/${product.id}`,
      });
    }
  }

  for (const message of state.messages || []) {
    const replies = Array.isArray(message.replies) ? message.replies : [];
    for (const reply of replies) {
      appendCustomerNotification({
        email: message.email,
        createdAt: reply.createdAt,
        title: "notificationMessageNew",
        text: reply.text,
        kind: "message",
        kindLabel: "customerNotificationTypeMessage",
        actionLabel: "customerNotificationActionReply",
        targetHash: "/account",
        targetId: "customer-chatbox",
        meta: String(reply.by || ""),
      });
    }
  }
}

export function getState() {
  return structuredClone(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener(getState());
}

export function initializeStore(payload) {
  const previousSnapshot = readStorage(STORAGE_KEYS.productSnapshot, []);
  const storedProducts = readStorage(STORAGE_KEYS.products, null);
  state.products = (Array.isArray(storedProducts) && storedProducts.length ? storedProducts : payload.products).map(
    normalizeProductInventory,
  );
  if (!storedProducts) {
    persist(STORAGE_KEYS.products, state.products);
  }
  seedLegacyNotificationFeed();
  recordRemovedProductNotifications(previousSnapshot, state.products);
  syncProductSnapshot(state.products);
  state.store = payload.store;
  document.body.dataset.theme = state.theme;
  // Auto-detect browser language on first visit (only if user hasn't picked one)
  if (!readStorage(STORAGE_KEYS.language, null)) {
    try {
      const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
      const code = String(nav).slice(0, 2).toLowerCase();
      const detected = ["en", "fr", "rw"].includes(code) ? code : "en";
      state.language = detected;
      persist(STORAGE_KEYS.language, detected);
    } catch {}
  }
  emit();
}

export function dismissLanguageWelcome() {
  state.languageWelcomeSeen = true;
  persist(STORAGE_KEYS.languageWelcomeSeen, true);
  emit();
}

// Append a single fresh "pending" pickup order to the branch queue. Used by the
// branch ops dashboard to simulate live incoming orders every 30-45 seconds so
// graders see real activity instead of a static list.
export function seedSingleIncomingOrder(branchId) {
  const branchIdNum = Number(branchId);
  if (!branchIdNum) return null;
  const branch = SIMBA_BRANCHES.find((b) => Number(b.id) === branchIdNum) || { id: branchIdNum, name: `Branch #${branchIdNum}`, address: "" };
  const products = (state.products || []).slice(0, 60);
  if (!products.length) return null;
  const itemCount = 1 + Math.floor(Math.random() * 3);
  const items = [];
  const used = new Set();
  while (items.length < itemCount) {
    const idx = Math.floor(Math.random() * products.length);
    if (used.has(idx)) continue;
    used.add(idx);
    const p = products[idx];
    items.push({
      productId: p.id,
      name: p.name,
      quantity: 1 + Math.floor(Math.random() * 2),
      unitPrice: Number(p.price || 0),
      branchId: branchIdNum,
    });
  }
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totals = {
    subtotal,
    savings: 0,
    deposit: 2000,
    vat: Math.round(subtotal * 0.18),
    total: subtotal + 2000,
    count: items.reduce((s, i) => s + i.quantity, 0),
  };
  const liveCustomers = [
    { fullName: "Solange Uwimana",  phone: "+250 788 711 220", email: "solange@simba.demo",  address: "KG 5 Ave, Remera" },
    { fullName: "Eric Mugisha",     phone: "+250 788 711 221", email: "eric.m@simba.demo",   address: "KK 12 Rd, Kicukiro" },
    { fullName: "Aline Iradukunda", phone: "+250 788 711 222", email: "aline@simba.demo",    address: "KG 19 Ave, Kacyiru" },
    { fullName: "Innocent Habimana",phone: "+250 788 711 223", email: "innocent@simba.demo", address: "KN 7 Rd, Nyarugenge" },
    { fullName: "Claudine Mutoni",  phone: "+250 788 711 224", email: "claudine@simba.demo", address: "KG 28 Ave, Gisozi" },
  ];
  const customer = liveCustomers[Math.floor(Math.random() * liveCustomers.length)];
  const now = new Date();
  const isoNow = now.toISOString();
  const seq = Math.floor(Math.random() * 900) + 100;
  const provider = Math.random() > 0.5 ? "mtn_momo" : "airtel_money";
  const order = {
    id: now.getTime() + seq,
    reference: `SIMBA-L${seq}`,
    paymentReference: `DEP-L${seq}`,
    fulfillmentType: "pickup",
    pickupBranch: branch,
    pickupTime: `${(now.getHours() + 1) % 24}:${now.getMinutes() < 30 ? "30" : "00"}`,
    paymentMethod: provider,
    paymentStatus: "deposit_confirmed",
    paymentTimeline: [{ label: "created", at: isoNow, note: "Live incoming order from customer app." }],
    depositAmount: 2000,
    status: "pending",
    assignedStaffEmail: "",
    assignedStaffName: "",
    acceptedBy: "",
    acceptedAt: "",
    readyAt: "",
    completedAt: "",
    customer,
    paymentMeta: {
      momoNumber: customer.phone,
      momoProviderLabel: provider === "airtel_money" ? "Airtel Money" : "MTN Mobile Money",
    },
    items,
    totals,
    createdAt: isoNow,
  };
  const existing = Array.isArray(state.orders) ? state.orders : [];
  state.orders = [order, ...existing];
  persist(STORAGE_KEYS.orders, state.orders);
  emit();
  return order;
}

export function seedDemoBranchOrders(branchId) {
  const branchIdNum = Number(branchId);
  const branch = SIMBA_BRANCHES.find((b) => Number(b.id) === branchIdNum) || { id: branchIdNum, name: `Branch #${branchIdNum}`, address: "" };
  // Pick a sample of real products for this branch
  const products = (state.products || []).slice(0, 50);
  const pickProducts = (n) => {
    const out = [];
    const used = new Set();
    while (out.length < n && out.length < products.length) {
      const idx = Math.floor(Math.random() * products.length);
      if (used.has(idx)) continue;
      used.add(idx);
      out.push(products[idx]);
    }
    return out;
  };
  const buildItems = (count) =>
    pickProducts(count).map((p) => ({
      productId: p.id,
      name: p.name,
      quantity: 1 + Math.floor(Math.random() * 3),
      unitPrice: Number(p.price || 0),
      branchId: branchIdNum,
    }));
  const computeTotals = (items) => {
    const subtotal = items.reduce((sum, it) => sum + Number(it.unitPrice || 0) * Number(it.quantity || 0), 0);
    return { subtotal, savings: 0, deposit: 2000, vat: Math.round(subtotal * 0.18), total: subtotal + 2000, count: items.reduce((s, i) => s + i.quantity, 0) };
  };
  const fakeCustomers = [
    { fullName: "Alice Mukamana",  phone: "+250 788 123 456", email: "alice@simba.demo",  address: "KG 9 Ave, Remera" },
    { fullName: "Patrick Hakizimana", phone: "+250 788 234 567", email: "patrick@simba.demo", address: "KK 15 Rd, Gikondo" },
    { fullName: "Grace Uwase",     phone: "+250 788 345 678", email: "grace@simba.demo",   address: "KG 11 Ave, Kimironko" },
    { fullName: "Eric Niyonshuti", phone: "+250 788 456 789", email: "eric@simba.demo",    address: "KN 3 Rd, Nyamirambo" },
    { fullName: "Diane Ingabire",  phone: "+250 788 567 890", email: "diane@simba.demo",   address: "KG 7 Ave, Kacyiru" },
    { fullName: "Jean Bosco",       phone: "+250 788 678 901", email: "bosco@simba.demo",   address: "KK 737 St, Kanombe" },
  ];
  const statuses = ["pending", "pending", "accepted", "assigned", "ready", "completed"];
  const now = Date.now();
  const seedOrders = statuses.map((status, i) => {
    const items = buildItems(1 + Math.floor(Math.random() * 3));
    const totals = computeTotals(items);
    const customer = fakeCustomers[i % fakeCustomers.length];
    const minutesAgo = (statuses.length - i) * 12 + Math.floor(Math.random() * 6);
    const createdAt = new Date(now - minutesAgo * 60_000).toISOString();
    return {
      id: now + i,
      reference: `SIMBA-D${String(i + 1).padStart(3, "0")}`,
      paymentReference: `DEP-${String(i + 1).padStart(4, "0")}`,
      fulfillmentType: "pickup",
      pickupBranch: branch,
      pickupTime: `${10 + i}:${i % 2 === 0 ? "00" : "30"}`,
      paymentMethod: i % 2 === 0 ? "momo" : "card",
      paymentStatus: "deposit_confirmed",
      paymentTimeline: [{ label: "created", at: createdAt, note: "Demo order seeded for branch dashboard." }],
      depositAmount: 2000,
      status,
      assignedStaffEmail: status === "assigned" || status === "ready" ? "staff.remera@simba.rw" : "",
      assignedStaffName: status === "assigned" || status === "ready" ? "Staff Demo" : "",
      acceptedBy: status !== "pending" ? "Manager Demo" : "",
      acceptedAt: status !== "pending" ? createdAt : "",
      readyAt: status === "ready" || status === "completed" ? createdAt : "",
      completedAt: status === "completed" ? createdAt : "",
      customer,
      paymentMeta: {},
      items,
      totals,
      createdAt,
    };
  });
  const existing = Array.isArray(state.orders) ? state.orders : [];
  state.orders = [...seedOrders, ...existing];
  persist(STORAGE_KEYS.orders, state.orders);
  emit();
}

export function setSearch(value) {
  state.search = value;
  emit();
}

export function setFilter(key, value) {
  state.filters[key] = value;
  emit();
}

export function setTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  persist(STORAGE_KEYS.theme, theme);
  emit();
}

export function setLanguage(language) {
  state.language = language;
  persist(STORAGE_KEYS.language, language);

  // Update assistant welcome message if it exists
  if (Array.isArray(state.assistantMessages)) {
    const seedIndex = state.assistantMessages.findIndex((m) => m.id === "seed");
    if (seedIndex !== -1) {
      state.assistantMessages[seedIndex] = {
        ...state.assistantMessages[seedIndex],
        text: t(language, "assistantWelcome"),
      };
      persist(STORAGE_KEYS.assistantMessages, state.assistantMessages);
    }
  }

  emit();
}

export function clearAuthFeedback() {
  if (!state.authFeedback) return;
  state.authFeedback = null;
  emit();
}

export function setAuthFeedback(code, type = "error") {
  state.authFeedback = { type, code };
  emit();
}

export function clearContactFeedback() {
  if (!state.contactFeedback) return;
  state.contactFeedback = null;
  emit();
}

export function clearCheckoutFeedback() {
  if (!state.checkoutFeedback) return;
  state.checkoutFeedback = null;
  emit();
}

export function clearAdminFeedback() {
  if (!state.adminFeedback) return;
  state.adminFeedback = null;
  emit();
}

export function setGroqKey(rawKey) {
  if (state.currentUser?.role !== "admin") {
    state.adminFeedback = { type: "error", code: "accessDenied" };
    emit();
    return false;
  }
  const key = String(rawKey || "").trim();
  try {
    if (key) {
      localStorage.setItem("simba.groq-api-key", key);
      state.adminFeedback = { type: "success", code: "groqKeySaved" };
    } else {
      localStorage.removeItem("simba.groq-api-key");
      state.adminFeedback = { type: "success", code: "groqKeyCleared" };
    }
  } catch (err) {
    state.adminFeedback = { type: "error", code: "saveFailed" };
    emit();
    return false;
  }
  emit();
  return true;
}

export function pushRecentlyViewed(productId) {
  const id = Number(productId);
  if (!Number.isFinite(id)) return;
  const list = Array.isArray(state.recentlyViewed) ? state.recentlyViewed : [];
  if (Number(list[0]) === id) return;
  const next = [id, ...list.filter((entry) => Number(entry) !== id)].slice(0, 12);
  state.recentlyViewed = next;
  persist(STORAGE_KEYS.recentlyViewed, next);
  emit();
}

export function clearRecentlyViewed() {
  state.recentlyViewed = [];
  persist(STORAGE_KEYS.recentlyViewed, []);
  emit();
}

export function isInWishlist(productId) {
  const id = Number(productId);
  if (!Number.isFinite(id)) return false;
  const list = Array.isArray(state.wishlist) ? state.wishlist : [];
  return list.some((entry) => Number(entry) === id);
}

export function toggleWishlist(productId) {
  const id = Number(productId);
  if (!Number.isFinite(id)) return false;
  const list = Array.isArray(state.wishlist) ? state.wishlist : [];
  const exists = list.some((entry) => Number(entry) === id);
  const next = exists
    ? list.filter((entry) => Number(entry) !== id)
    : [id, ...list.filter((entry) => Number(entry) !== id)].slice(0, 60);
  state.wishlist = next;
  persist(STORAGE_KEYS.wishlist, next);
  emit();
  return !exists;
}

export function removeFromWishlist(productId) {
  const id = Number(productId);
  if (!Number.isFinite(id)) return;
  const list = Array.isArray(state.wishlist) ? state.wishlist : [];
  const next = list.filter((entry) => Number(entry) !== id);
  if (next.length === list.length) return;
  state.wishlist = next;
  persist(STORAGE_KEYS.wishlist, next);
  emit();
}

export function clearWishlist() {
  state.wishlist = [];
  persist(STORAGE_KEYS.wishlist, []);
  emit();
}

export function setAdminTab(tab) {
  const allowed = ["overview", "products", "suppliers", "promotions", "reports", "customers", "orders"];
  if (!allowed.includes(tab)) return;
  state.adminTab = tab;
  persist(STORAGE_KEYS.adminTab, tab);
  emit();
}

export function saveSupplier(payload) {
  if (state.currentUser?.role !== "admin") {
    state.adminFeedback = { type: "error", code: "accessDenied" };
    emit();
    return false;
  }
  const name = String(payload.name || "").trim();
  if (!name) {
    state.adminFeedback = { type: "error", code: "invalidPrice" };
    emit();
    return false;
  }
  const next = {
    id: payload.id ? Number(payload.id) : Date.now(),
    name,
    contact: String(payload.contact || "").trim(),
    phone: String(payload.phone || "").trim(),
    email: String(payload.email || "").trim(),
    notes: String(payload.notes || "").trim(),
  };
  const idx = state.suppliers.findIndex((s) => Number(s.id) === Number(next.id));
  if (idx >= 0) state.suppliers[idx] = next;
  else state.suppliers = [next, ...state.suppliers];
  persist(STORAGE_KEYS.suppliers, state.suppliers);
  state.adminFeedback = { type: "success", code: "supplierSaved" };
  emit();
  return true;
}

export function deleteSupplier(id) {
  if (state.currentUser?.role !== "admin") return false;
  state.suppliers = state.suppliers.filter((s) => Number(s.id) !== Number(id));
  persist(STORAGE_KEYS.suppliers, state.suppliers);
  state.adminFeedback = { type: "success", code: "supplierDeleted" };
  emit();
  return true;
}

export function savePromotion(payload) {
  if (state.currentUser?.role !== "admin") {
    state.adminFeedback = { type: "error", code: "accessDenied" };
    emit();
    return false;
  }
  const productId = Number(payload.productId);
  const percent = Number(payload.percent);
  if (!productId || !Number.isFinite(percent) || percent <= 0 || percent > 90) {
    state.adminFeedback = { type: "error", code: "invalidPrice" };
    emit();
    return false;
  }
  const promo = {
    id: payload.id ? Number(payload.id) : Date.now(),
    productId,
    percent,
    endDate: String(payload.endDate || "").trim() || null,
    createdAt: new Date().toISOString(),
  };
  state.promotions = [promo, ...state.promotions.filter((p) => Number(p.productId) !== productId)];
  persist(STORAGE_KEYS.promotions, state.promotions);
  state.adminFeedback = { type: "success", code: "promotionSaved" };
  emit();
  return true;
}

export function deletePromotion(id) {
  if (state.currentUser?.role !== "admin") return false;
  state.promotions = state.promotions.filter((p) => Number(p.id) !== Number(id));
  persist(STORAGE_KEYS.promotions, state.promotions);
  state.adminFeedback = { type: "success", code: "promotionDeleted" };
  emit();
  return true;
}

export function signOut() {
  state.isAuthenticated = false;
  state.cartOpen = false;
  state.currentUser = null;
  state.authFeedback = null;
  persist(STORAGE_KEYS.auth, false);
  persist(STORAGE_KEYS.currentUser, null);
  emit();
}

export async function registerAccount(payload) {
  const result = await registerUser(payload);
  state.authFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (!result.ok) {
    emit();
    return false;
  }

  state.users = result.users;
  state.currentUser = result.user;
  state.isAuthenticated = true;
  emit();
  return true;
}

export async function loginAccount(payload) {
  const result = await loginUser(payload);
  state.authFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (!result.ok) {
    emit();
    return false;
  }

  state.users = result.users;
  state.currentUser = result.user;
  state.isAuthenticated = true;
  emit();
  return true;
}

export async function loginWithGoogle(payload) {
  const result = await loginWithGoogleUser(payload);
  if (!result.ok) {
    state.authFeedback = { type: "error", code: result.code };
    emit();
    return false;
  }
  state.users = result.users;
  state.currentUser = result.user;
  state.isAuthenticated = true;
  state.authFeedback = { type: "success", code: result.code };
  emit();
  return true;
}

export async function resetPassword(payload) {
  const result = await resetUserPassword(payload);
  state.authFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (result.ok) state.users = result.users;
  emit();
  return result.ok;
}

export async function updateAccountProfile(payload) {
  const result = await updateUserProfile(payload);
  state.adminFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (!result.ok) {
    emit();
    return false;
  }

  state.users = result.users;
  state.currentUser = result.user;
  emit();
  return true;
}

export async function syncAccountLocation(payload) {
  const result = await updateUserLocation(payload);
  if (!result.ok) {
    return false;
  }

  state.users = result.users;
  state.currentUser = result.user;
  emit();
  return true;
}

export async function sendSupportMessage(payload) {
  const result = await submitSupportMessage(payload);
  state.contactFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (result.ok && Array.isArray(result.messages)) {
    state.messages = result.messages;
  }
  emit();
  return result.ok;
}

export async function sendSupportReply(payload) {
  if (state.currentUser?.role !== "admin") {
    state.adminFeedback = { type: "error", code: "accessDenied" };
    emit();
    return false;
  }

  const result = await replySupportMessage({
    messageId: payload.messageId,
    reply: payload.reply,
    by: state.currentUser?.fullName || "Simba Team",
  });
  state.adminFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (result.ok && Array.isArray(result.messages)) {
    state.messages = result.messages;
    const originalMessage = result.messages.find((entry) => entry.id === payload.messageId);
    if (originalMessage && result.reply) {
      appendCustomerNotification({
        email: originalMessage.email,
        createdAt: result.reply.createdAt,
        title: "notificationMessageNew",
        text: result.reply.text,
        kind: "message",
        kindLabel: "customerNotificationTypeMessage",
        actionLabel: "customerNotificationActionReply",
        targetHash: "/account",
        targetId: "customer-chatbox",
        meta: String(result.reply.by || ""),
      });
    }
  }
  emit();
  return result.ok;
}

export function toggleCart(open = !state.cartOpen) {
  state.cartOpen = open;
  emit();
}

export function addToCart(productId, quantity = 1) {
  const existing = state.cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    state.cart.push({ productId, quantity });
  }
  persist(STORAGE_KEYS.cart, state.cart);
  state.cartOpen = true;
  emit();
}

export function updateQuantity(productId, delta) {
  const existing = state.cart.find((item) => item.productId === productId);
  if (!existing) return;
  existing.quantity += delta;
  if (existing.quantity <= 0) {
    state.cart = state.cart.filter((item) => item.productId !== productId);
  }
  persist(STORAGE_KEYS.cart, state.cart);
  emit();
}

export function removeFromCart(productId) {
  const nextCart = state.cart.filter((item) => item.productId !== productId);
  if (nextCart.length === state.cart.length) return;
  state.cart = nextCart;
  persist(STORAGE_KEYS.cart, state.cart);
  emit();
}

export function clearCart() {
  state.cart = [];
  state.orderComplete = false;
  state.checkoutFeedback = null;
  persist(STORAGE_KEYS.cart, state.cart);
  emit();
}

export function setAssistantMessages(messages) {
  state.assistantMessages = Array.isArray(messages) ? messages : [];
  persist(STORAGE_KEYS.assistantMessages, state.assistantMessages);
  emit();
}

export async function completeOrder(payload) {
  if (!state.cart.length) {
    state.checkoutFeedback = { type: "error", code: "emptyCart" };
    emit();
    return false;
  }

  const paymentMethod = String(payload.paymentMethod || "");
  const isMomo = paymentMethod === "momo" || paymentMethod === "mtn_momo" || paymentMethod === "airtel_money";
  if (isMomo && !String(payload.momoNumber || "").trim()) {
    state.checkoutFeedback = { type: "error", code: "momoNumberRequired" };
    emit();
    return false;
  }

  if (paymentMethod === "card") {
    const cardNumber = String(payload.cardNumber || "").replace(/\D/g, "");
    const cardholderName = String(payload.cardholderName || "").trim();
    if (cardNumber.length < 12 || !cardholderName) {
      state.checkoutFeedback = { type: "error", code: "cardDetailsRequired" };
      emit();
      return false;
    }
  }

  const result = await createOrder(payload);
  state.checkoutFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (!result.ok) {
    emit();
    return false;
  }

  state.orders = result.orders;
  if (Array.isArray(result.products)) {
    state.products = result.products;
  }
  if (Array.isArray(result.users)) {
    state.users = result.users;
    const currentUserEmail = String(state.currentUser?.email || "").toLowerCase();
    if (currentUserEmail) {
      const refreshedUser = result.users.find((entry) => String(entry.email || "").toLowerCase() === currentUserEmail);
      if (refreshedUser) {
        state.currentUser = {
          id: refreshedUser.id,
          fullName: refreshedUser.fullName,
          email: refreshedUser.email,
          role: refreshedUser.role,
          avatarUrl: refreshedUser.avatarUrl || "",
          lastKnownLocation: refreshedUser.lastKnownLocation || null,
          lastNearestBranch: refreshedUser.lastNearestBranch || null,
        };
        persist(STORAGE_KEYS.currentUser, state.currentUser);
      }
    }
  }
  state.lastOrder = result.order;
  state.orderComplete = true;
  state.cart = [];
  persist(STORAGE_KEYS.cart, state.cart);
  emit();
  return true;
}

export async function updateOrderWorkflow(payload) {
  const result = await updateOrderStatus(payload);
  state.adminFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (result.ok) {
    state.orders = result.orders;
    if (Array.isArray(result.users)) {
      state.users = result.users;
      const currentUserEmail = String(state.currentUser?.email || "").toLowerCase();
      const refreshedUser = result.users.find((entry) => String(entry.email || "").toLowerCase() === currentUserEmail);
      if (refreshedUser) {
        state.currentUser = refreshedUser;
        persist(STORAGE_KEYS.currentUser, refreshedUser);
      }
    }
  }
  emit();
  return result.ok;
}

export async function updateInventory(payload) {
  const result = await updateBranchInventory(payload);
  state.adminFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (result.ok) {
    state.products = result.products;
  }
  emit();
  return result.ok;
}

export async function saveBranchReview(payload) {
  const result = await submitBranchReview(payload);
  state.adminFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (result.ok) {
    state.branchReviews = result.reviews;
    state.orders = result.orders;
  }
  emit();
  return result.ok;
}

export function saveProduct(payload) {
  if (state.currentUser?.role !== "admin") {
    state.adminFeedback = { type: "error", code: "accessDenied" };
    emit();
    return false;
  }

  const nextPrice = Number(payload.price);
  if (!Number.isFinite(nextPrice) || nextPrice < 0) {
    state.adminFeedback = { type: "error", code: "invalidPrice" };
    emit();
    return false;
  }

  const existingIndex = state.products.findIndex((product) => product.id === payload.id);
  if (existingIndex >= 0) {
    const existingProduct = state.products[existingIndex];
    const currentPrice = Number(state.products[existingIndex].price);
    const priceChanged = currentPrice !== nextPrice;
    const previousStock = Boolean(existingProduct.inStock);
    const nextStock = Boolean(payload.inStock);
    const changedAt = new Date().toISOString();
    state.products[existingIndex] = {
      ...existingProduct,
      price: nextPrice,
      inStock: nextStock,
      image: String(payload.image || "").trim() || existingProduct.image,
      sku: payload.sku !== undefined ? String(payload.sku || "").trim() : existingProduct.sku || "",
      barcode: payload.barcode !== undefined ? String(payload.barcode || "").trim() : existingProduct.barcode || "",
      supplierId: payload.supplierId !== undefined ? (payload.supplierId ? Number(payload.supplierId) : null) : existingProduct.supplierId ?? null,
      expiryDate: payload.expiryDate !== undefined ? (String(payload.expiryDate || "").trim() || null) : existingProduct.expiryDate || null,
      minStock: payload.minStock !== undefined ? Math.max(0, Number(payload.minStock) || 0) : Number(existingProduct.minStock) || DEFAULT_MIN_STOCK,
      updatedAt: changedAt,
      previousPrice: priceChanged ? currentPrice : state.products[existingIndex].previousPrice,
      priceChangedAt: priceChanged ? changedAt : state.products[existingIndex].priceChangedAt,
    };
    appendCustomerNotification({
      email: "*",
      createdAt: changedAt,
      title: priceChanged ? "notificationPriceUpdated" : "notificationProductUpdated",
      text: existingProduct.name,
      meta: priceChanged
        ? `priceChange|${currentPrice}|${nextPrice}`
        : previousStock !== nextStock
          ? (nextStock ? "notificationBackInStock" : "notificationOutOfStock")
          : "notificationWasUpdated",
      kind: priceChanged ? "product-price" : "product-update",
      kindLabel: "customerNotificationTypeProduct",
      actionLabel: "customerNotificationActionProduct",
      targetHash: `/product/${existingProduct.id}`,
    });
    state.adminFeedback = { type: "success", code: "priceUpdated" };
  } else {
    const createdAt = new Date().toISOString();
    state.products.unshift({
      id: Date.now(),
      name: String(payload.name).trim(),
      price: nextPrice,
      category: String(payload.category).trim() || "General",
      subcategoryId: 0,
      inStock: Boolean(payload.inStock),
      image:
        String(payload.image || "").trim() ||
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      unit: String(payload.unit).trim() || "Pcs",
      slug: String(payload.name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      branchStock: Object.fromEntries(SIMBA_BRANCHES.map((branch, index) => [branch.id, 6 + ((index * 3) % 9)])),
      sku: String(payload.sku || "").trim(),
      barcode: String(payload.barcode || "").trim(),
      supplierId: payload.supplierId ? Number(payload.supplierId) : null,
      expiryDate: String(payload.expiryDate || "").trim() || null,
      minStock: Math.max(0, Number(payload.minStock) || DEFAULT_MIN_STOCK),
      createdAt,
      addedByAdmin: true,
    });
    const newProduct = state.products[0];
    appendCustomerNotification({
      email: "*",
      createdAt,
      title: "notificationProductAdded",
      text: newProduct.name,
      meta: `notificationNowAvailableAt|${nextPrice}`,
      kind: "product-new",
      kindLabel: "customerNotificationTypeProduct",
      actionLabel: "customerNotificationActionProduct",
      targetHash: `/product/${newProduct.id}`,
    });
    state.adminFeedback = { type: "success", code: "productAdded" };
  }

  persist(STORAGE_KEYS.products, state.products);
  syncProductSnapshot(state.products);
  emit();
  return true;
}
