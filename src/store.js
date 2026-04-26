import {
  createOrder,
  hydrateSession,
  loginUser,
  loginWithGoogleUser,
  replySupportMessage,
  registerUser,
  resetUserPassword,
  submitSupportMessage,
  updateUserLocation,
  updateUserProfile,
} from "./backend.js";
import { DEFAULT_FILTERS, STORAGE_KEYS } from "./constants.js";
import { formatPrice } from "./utils.js";

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
  customerNotificationFeed: readStorage(STORAGE_KEYS.customerNotificationFeed, []),
  assistantMessages: readStorage(STORAGE_KEYS.assistantMessages, []),
  cartOpen: false,
  orderComplete: false,
  authFeedback: null,
  contactFeedback: null,
  checkoutFeedback: null,
  adminFeedback: null,
  lastOrder: session.orders[0] ?? null,
};

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
    kindLabel: String(payload.kindLabel || "Update").trim(),
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

function recordRemovedProductNotifications(previousProducts, currentProducts) {
  if (!Array.isArray(previousProducts) || !previousProducts.length) return;

  const currentIds = new Set((currentProducts || []).map((product) => Number(product.id)));
  const removedProducts = previousProducts.filter((product) => !currentIds.has(Number(product.id)));

  for (const product of removedProducts) {
    appendCustomerNotification({
      email: "*",
      createdAt: new Date().toISOString(),
      title: "Product removed",
      text: `${String(product.name || "Product").trim()} is no longer available in the catalog.`,
      kind: "product-removed",
      kindLabel: "Product",
      actionLabel: "Open catalog",
      targetHash: "/",
      targetId: "catalog",
      meta: String(product.category || "").trim(),
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
        title: "New product added",
        text: `${String(product.name || "Product").trim()} is now available at ${formatPrice(Number(product.price || 0))}.`,
        kind: "product-new",
        kindLabel: "Product",
        actionLabel: "View product",
        targetHash: `/product/${product.id}`,
        meta: String(product.category || "").trim(),
      });
    }

    if (product.priceChangedAt || product.updatedAt) {
      const currentPrice = Number(product.price || 0);
      const previousPrice = Number(product.previousPrice);
      appendCustomerNotification({
        email: "*",
        createdAt: product.priceChangedAt || product.updatedAt,
        title: "Price updated",
        text: Number.isFinite(previousPrice)
          ? `${String(product.name || "Product").trim()}: ${formatPrice(previousPrice)} -> ${formatPrice(currentPrice)}`
          : `${String(product.name || "Product").trim()} now costs ${formatPrice(currentPrice)}.`,
        kind: "product-price",
        kindLabel: "Product",
        actionLabel: "View product",
        targetHash: `/product/${product.id}`,
        meta: String(product.category || "").trim(),
      });
    }
  }

  for (const message of state.messages || []) {
    const replies = Array.isArray(message.replies) ? message.replies : [];
    for (const reply of replies) {
      appendCustomerNotification({
        email: message.email,
        createdAt: reply.createdAt,
        title: "New admin message",
        text: reply.text,
        kind: "message",
        kindLabel: "Message",
        actionLabel: "View reply",
        targetHash: "/account",
        targetId: "customer-chatbox",
        meta: String(reply.by || "Admin"),
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
  state.products = Array.isArray(storedProducts) && storedProducts.length ? storedProducts : payload.products;
  if (!storedProducts) {
    persist(STORAGE_KEYS.products, state.products);
  }
  seedLegacyNotificationFeed();
  recordRemovedProductNotifications(previousSnapshot, state.products);
  syncProductSnapshot(state.products);
  state.store = payload.store;
  document.body.dataset.theme = state.theme;
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
    by: state.currentUser?.fullName || "Admin",
  });
  state.adminFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (result.ok && Array.isArray(result.messages)) {
    state.messages = result.messages;
    const originalMessage = result.messages.find((entry) => entry.id === payload.messageId);
    if (originalMessage && result.reply) {
      appendCustomerNotification({
        email: originalMessage.email,
        createdAt: result.reply.createdAt,
        title: "New admin message",
        text: result.reply.text,
        kind: "message",
        kindLabel: "Message",
        actionLabel: "View reply",
        targetHash: "/account",
        targetId: "customer-chatbox",
        meta: String(result.reply.by || "Admin"),
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
  if (paymentMethod === "momo" && !String(payload.momoNumber || "").trim()) {
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
      updatedAt: changedAt,
      previousPrice: priceChanged ? currentPrice : state.products[existingIndex].previousPrice,
      priceChangedAt: priceChanged ? changedAt : state.products[existingIndex].priceChangedAt,
    };
    appendCustomerNotification({
      email: "*",
      createdAt: changedAt,
      title: priceChanged ? "Price updated" : "Product updated",
      text: priceChanged
        ? `${existingProduct.name}: ${formatPrice(currentPrice)} -> ${formatPrice(nextPrice)}`
        : previousStock !== nextStock
          ? `${existingProduct.name} is ${nextStock ? "back in stock" : "out of stock"}.`
          : `${existingProduct.name} information was updated.`,
      kind: priceChanged ? "product-price" : "product-update",
      kindLabel: "Product",
      actionLabel: "View product",
      targetHash: `/product/${existingProduct.id}`,
      meta: String(existingProduct.category || "").trim(),
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
      createdAt,
      addedByAdmin: true,
    });
    const newProduct = state.products[0];
    appendCustomerNotification({
      email: "*",
      createdAt,
      title: "New product added",
      text: `${newProduct.name} is now available at ${formatPrice(nextPrice)}.`,
      kind: "product-new",
      kindLabel: "Product",
      actionLabel: "View product",
      targetHash: `/product/${newProduct.id}`,
      meta: String(newProduct.category || "").trim(),
    });
    state.adminFeedback = { type: "success", code: "productAdded" };
  }

  persist(STORAGE_KEYS.products, state.products);
  syncProductSnapshot(state.products);
  emit();
  return true;
}
