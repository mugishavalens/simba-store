import { STORAGE_KEYS } from "./constants.js";

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

function createReference(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function hydrateSession() {
  return {
    users: readStorage(STORAGE_KEYS.users, []),
    currentUser: readStorage(STORAGE_KEYS.currentUser, null),
    isAuthenticated: readStorage(STORAGE_KEYS.auth, false),
    orders: readStorage(STORAGE_KEYS.orders, []),
    messages: readStorage(STORAGE_KEYS.messages, []),
  };
}

export async function registerUser(payload) {
  const users = readStorage(STORAGE_KEYS.users, []);
  const email = String(payload.email).trim().toLowerCase();
  if (users.some((user) => user.email === email)) {
    return { ok: false, code: "exists" };
  }

  const user = {
    id: Date.now(),
    fullName: String(payload.fullName).trim(),
    email,
    role: payload.role || "customer",
    password: payload.password,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeStorage(STORAGE_KEYS.users, users);
  writeStorage(STORAGE_KEYS.currentUser, publicUser(user));
  writeStorage(STORAGE_KEYS.auth, true);

  return {
    ok: true,
    code: "created",
    user: publicUser(user),
    users,
  };
}

export async function loginUser(payload) {
  const users = readStorage(STORAGE_KEYS.users, []);
  const email = String(payload.email).trim().toLowerCase();
  const user = users.find((entry) => entry.email === email && entry.password === payload.password);

  if (!user) {
    return { ok: false, code: "invalid" };
  }

  writeStorage(STORAGE_KEYS.currentUser, publicUser(user));
  writeStorage(STORAGE_KEYS.auth, true);

  return {
    ok: true,
    code: "welcome",
    user: publicUser(user),
    users,
  };
}

export async function resetUserPassword(payload) {
  const users = readStorage(STORAGE_KEYS.users, []);
  const email = String(payload.email).trim().toLowerCase();
  const index = users.findIndex((entry) => entry.email === email);

  if (index === -1) {
    return { ok: false, code: "missing" };
  }

  users[index] = {
    ...users[index],
    password: payload.password,
    updatedAt: new Date().toISOString(),
  };

  writeStorage(STORAGE_KEYS.users, users);
  return { ok: true, code: "reset", users };
}

export async function loginWithGoogleUser() {
  const users = readStorage(STORAGE_KEYS.users, []);
  const googleEmail = "google.user@simba.rw";
  let user = users.find((entry) => entry.email === googleEmail);

  if (!user) {
    user = {
      id: Date.now(),
      fullName: "Google Shopper",
      email: googleEmail,
      role: "customer",
      password: "google-oauth",
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeStorage(STORAGE_KEYS.users, users);
  }

  writeStorage(STORAGE_KEYS.currentUser, publicUser(user));
  writeStorage(STORAGE_KEYS.auth, true);

  return {
    ok: true,
    code: "welcome",
    user: publicUser(user),
    users,
  };
}

export async function submitSupportMessage(payload) {
  const messages = readStorage(STORAGE_KEYS.messages, []);
  const message = {
    id: Date.now(),
    fullName: String(payload.fullName).trim(),
    email: String(payload.email).trim().toLowerCase(),
    message: String(payload.message).trim(),
    createdAt: new Date().toISOString(),
  };

  messages.unshift(message);
  writeStorage(STORAGE_KEYS.messages, messages);

  return {
    ok: true,
    code: "sent",
    message,
    messages,
  };
}

export async function createOrder(payload) {
  const orders = readStorage(STORAGE_KEYS.orders, []);
  const paymentMethod = payload.paymentMethod;
  const paymentStatusMap = {
    momo: "momo_confirmed",
    card: "card_authorized",
    cash: "cash_on_delivery",
  };

  const order = {
    id: Date.now(),
    reference: createReference("SIMBA"),
    paymentReference: createReference(paymentMethod.toUpperCase()),
    paymentMethod,
    paymentStatus: paymentStatusMap[paymentMethod] || "pending",
    customer: {
      fullName: String(payload.fullName).trim(),
      phone: String(payload.phone).trim(),
      district: String(payload.district).trim(),
      address: String(payload.address).trim(),
      notes: String(payload.notes || "").trim(),
      momoNumber: String(payload.momoNumber || "").trim(),
    },
    items: payload.items,
    totals: payload.totals,
    createdAt: new Date().toISOString(),
  };

  orders.unshift(order);
  writeStorage(STORAGE_KEYS.orders, orders);

  return {
    ok: true,
    code: "placed",
    order,
    orders,
  };
}
