import {
  createOrder,
  hydrateSession,
  loginUser,
  loginWithGoogleUser,
  registerUser,
  resetUserPassword,
  submitSupportMessage,
} from "./backend.js";
import { DEFAULT_FILTERS, STORAGE_KEYS } from "./constants.js";

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
  cartOpen: false,
  orderComplete: false,
  authFeedback: null,
  contactFeedback: null,
  checkoutFeedback: null,
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
  state.products = payload.products;
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
  state.authFeedback = null;
  emit();
}

export function setAuthFeedback(code, type = "error") {
  state.authFeedback = { type, code };
  emit();
}

export function clearContactFeedback() {
  state.contactFeedback = null;
  emit();
}

export function clearCheckoutFeedback() {
  state.checkoutFeedback = null;
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

export async function loginWithGoogle() {
  const result = await loginWithGoogleUser();
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

export async function sendSupportMessage(payload) {
  const result = await submitSupportMessage(payload);
  state.contactFeedback = { type: result.ok ? "success" : "error", code: result.code };
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

export function clearCart() {
  state.cart = [];
  state.orderComplete = false;
  state.checkoutFeedback = null;
  persist(STORAGE_KEYS.cart, state.cart);
  emit();
}

export async function completeOrder(payload) {
  if (!state.cart.length) {
    state.checkoutFeedback = { type: "error", code: "emptyCart" };
    emit();
    return false;
  }

  const result = await createOrder(payload);
  state.checkoutFeedback = { type: result.ok ? "success" : "error", code: result.code };
  if (!result.ok) {
    emit();
    return false;
  }

  state.orders = result.orders;
  state.lastOrder = result.order;
  state.orderComplete = true;
  state.cart = [];
  persist(STORAGE_KEYS.cart, state.cart);
  emit();
  return true;
}
