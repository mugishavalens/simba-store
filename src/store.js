import { DEFAULT_FILTERS, STORAGE_KEYS } from "./constants.js";

const listeners = new Set();

const state = {
  products: [],
  store: null,
  cart: readStorage(STORAGE_KEYS.cart, []),
  filters: { ...DEFAULT_FILTERS },
  search: "",
  theme: readStorage(STORAGE_KEYS.theme, "light"),
  language: readStorage(STORAGE_KEYS.language, "en"),
  users: readStorage(STORAGE_KEYS.users, []),
  currentUser: readStorage(STORAGE_KEYS.currentUser, null),
  isAuthenticated: readStorage(STORAGE_KEYS.auth, false),
  cartOpen: false,
  orderComplete: false,
  authFeedback: null,
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

export function signOut() {
  state.isAuthenticated = false;
  state.cartOpen = false;
  state.currentUser = null;
  state.authFeedback = null;
  persist(STORAGE_KEYS.auth, false);
  persist(STORAGE_KEYS.currentUser, null);
  emit();
}

export function registerAccount(payload) {
  const email = payload.email.trim().toLowerCase();
  if (state.users.some((user) => user.email === email)) {
    state.authFeedback = { type: "error", code: "exists" };
    emit();
    return false;
  }

  const user = {
    id: Date.now(),
    fullName: payload.fullName.trim(),
    email,
    role: payload.role || "customer",
    password: payload.password,
  };

  state.users.push(user);
  state.currentUser = { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
  state.isAuthenticated = true;
  state.authFeedback = { type: "success", code: "created" };
  persist(STORAGE_KEYS.users, state.users);
  persist(STORAGE_KEYS.currentUser, state.currentUser);
  persist(STORAGE_KEYS.auth, true);
  emit();
  return true;
}

export function loginAccount(payload) {
  const email = payload.email.trim().toLowerCase();
  const user = state.users.find((entry) => entry.email === email && entry.password === payload.password);

  if (!user) {
    state.authFeedback = { type: "error", code: "invalid" };
    emit();
    return false;
  }

  state.currentUser = { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
  state.isAuthenticated = true;
  state.authFeedback = { type: "success", code: "welcome" };
  persist(STORAGE_KEYS.currentUser, state.currentUser);
  persist(STORAGE_KEYS.auth, true);
  emit();
  return true;
}

export function loginWithGoogle() {
  const googleEmail = "google.user@simba.rw";
  let user = state.users.find((entry) => entry.email === googleEmail);

  if (!user) {
    user = {
      id: Date.now(),
      fullName: "Google Shopper",
      email: googleEmail,
      role: "customer",
      password: "google-oauth",
    };
    state.users.push(user);
    persist(STORAGE_KEYS.users, state.users);
  }

  state.currentUser = { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
  state.isAuthenticated = true;
  state.authFeedback = { type: "success", code: "welcome" };
  persist(STORAGE_KEYS.currentUser, state.currentUser);
  persist(STORAGE_KEYS.auth, true);
  emit();
  return true;
}

export function resetPassword(payload) {
  const email = payload.email.trim().toLowerCase();
  const user = state.users.find((entry) => entry.email === email);

  if (!user) {
    state.authFeedback = { type: "error", code: "missing" };
    emit();
    return false;
  }

  user.password = payload.password;
  state.authFeedback = { type: "success", code: "reset" };
  persist(STORAGE_KEYS.users, state.users);
  emit();
  return true;
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
  persist(STORAGE_KEYS.cart, state.cart);
  emit();
}

export function completeOrder() {
  state.orderComplete = true;
  state.cart = [];
  persist(STORAGE_KEYS.cart, state.cart);
  emit();
}
