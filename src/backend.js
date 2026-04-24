import { DEFAULT_ADMIN, GOOGLE_CLIENT_ID, STORAGE_KEYS } from "./constants.js";

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

function ensureDefaultAdmin(users) {
  const adminEmail = DEFAULT_ADMIN.email.toLowerCase();
  const normalizedUsers = users.map((user) => ({
    ...user,
    email: String(user.email || "").toLowerCase(),
    role: user.email?.toLowerCase() === adminEmail ? "admin" : user.role === "admin" ? "customer" : user.role,
  }));
  const withoutAdminEmail = normalizedUsers.filter((user) => user.email !== adminEmail);
  const seededAdmin = {
    ...DEFAULT_ADMIN,
    email: adminEmail,
    role: "admin",
    createdAt: new Date().toISOString(),
  };

  return {
    users: [seededAdmin, ...withoutAdminEmail],
    seeded: true,
  };
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

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

function parseJwt(token) {
  const segments = String(token || "").split(".");
  if (segments.length !== 3) {
    throw new Error("invalid");
  }

  return JSON.parse(decodeBase64Url(segments[1]));
}

function verifyGoogleToken(idToken, expectedNonce) {
  const payload = parseJwt(idToken);
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const validIssuers = ["accounts.google.com", "https://accounts.google.com"];

  if (!validIssuers.includes(payload.iss)) {
    return { ok: false, code: "googleTokenInvalid" };
  }

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    return { ok: false, code: "googleTokenInvalid" };
  }

  if (!payload.exp || Number(payload.exp) <= nowInSeconds) {
    return { ok: false, code: "googleSessionExpired" };
  }

  if (expectedNonce && payload.nonce !== expectedNonce) {
    return { ok: false, code: "googleTokenInvalid" };
  }

  if (!payload.email || payload.email_verified !== true) {
    return { ok: false, code: "googleTokenInvalid" };
  }

  return { ok: true, payload };
}

export function hydrateSession() {
  const seeded = ensureDefaultAdmin(readStorage(STORAGE_KEYS.users, []));
  if (seeded.seeded) {
    writeStorage(STORAGE_KEYS.users, seeded.users);
  }

  return {
    users: seeded.users,
    currentUser: readStorage(STORAGE_KEYS.currentUser, null),
    isAuthenticated: readStorage(STORAGE_KEYS.auth, false),
    orders: readStorage(STORAGE_KEYS.orders, []),
    messages: readStorage(STORAGE_KEYS.messages, []),
  };
}

export async function registerUser(payload) {
  const users = ensureDefaultAdmin(readStorage(STORAGE_KEYS.users, [])).users;
  const email = String(payload.email).trim().toLowerCase();
  if (users.some((user) => user.email === email)) {
    return { ok: false, code: "exists" };
  }

  const user = {
    id: Date.now(),
    fullName: String(payload.fullName).trim(),
    email,
    role: "customer",
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
  const users = ensureDefaultAdmin(readStorage(STORAGE_KEYS.users, [])).users;
  const email = String(payload.email).trim().toLowerCase();
  const password = String(payload.password || "");

  if (email === DEFAULT_ADMIN.email.toLowerCase()) {
    if (password !== DEFAULT_ADMIN.password) {
      return { ok: false, code: "invalid" };
    }
    const adminUser = users.find((entry) => entry.email === email && entry.role === "admin");
    if (!adminUser) {
      return { ok: false, code: "invalid" };
    }
    writeStorage(STORAGE_KEYS.currentUser, publicUser(adminUser));
    writeStorage(STORAGE_KEYS.auth, true);
    return {
      ok: true,
      code: "welcome",
      user: publicUser(adminUser),
      users,
    };
  }

  const user = users.find((entry) => entry.email === email && entry.password === payload.password);

  if (!user) {
    return { ok: false, code: "invalid" };
  }

  if (payload.portal === "admin" && user.role !== "admin") {
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
  const users = ensureDefaultAdmin(readStorage(STORAGE_KEYS.users, [])).users;
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

export async function loginWithGoogleUser(payload = {}) {
  const users = ensureDefaultAdmin(readStorage(STORAGE_KEYS.users, [])).users;
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID")) {
    return { ok: false, code: "googleSetupRequired" };
  }

  const verification = verifyGoogleToken(payload.idToken, payload.nonce);
  if (!verification.ok) {
    return verification;
  }

  const googlePayload = verification.payload;
  const googleEmail = String(googlePayload.email || "").trim().toLowerCase();
  if (googleEmail === DEFAULT_ADMIN.email.toLowerCase()) {
    return { ok: false, code: "googleAdminRestricted" };
  }

  let user = users.find((entry) => entry.email === googleEmail);

  if (!user) {
    user = {
      id: Date.now(),
      fullName: String(googlePayload.name || googlePayload.given_name || "Google Shopper").trim(),
      email: googleEmail,
      role: "customer",
      password: "google-oauth",
      authProvider: "google",
      avatarUrl: googlePayload.picture || "",
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeStorage(STORAGE_KEYS.users, users);
  } else {
    user = {
      ...user,
      fullName: String(googlePayload.name || user.fullName || "Google Shopper").trim(),
      authProvider: "google",
      avatarUrl: googlePayload.picture || user.avatarUrl || "",
      updatedAt: new Date().toISOString(),
    };
    const index = users.findIndex((entry) => entry.email === googleEmail);
    users[index] = user;
    writeStorage(STORAGE_KEYS.users, users);
  }

  writeStorage(STORAGE_KEYS.currentUser, publicUser(user));
  writeStorage(STORAGE_KEYS.auth, true);

  return {
    ok: true,
    code: "googleWelcome",
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
    replies: [],
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

export async function replySupportMessage(payload) {
  const messages = readStorage(STORAGE_KEYS.messages, []);
  const messageId = Number(payload.messageId);
  const replyText = String(payload.reply || "").trim();
  if (!replyText) {
    return { ok: false, code: "replyRequired" };
  }

  const index = messages.findIndex((entry) => entry.id === messageId);
  if (index === -1) {
    return { ok: false, code: "messageMissing" };
  }

  const existingReplies = Array.isArray(messages[index].replies) ? messages[index].replies : [];
  const reply = {
    id: Date.now(),
    by: String(payload.by || "Admin").trim() || "Admin",
    text: replyText,
    createdAt: new Date().toISOString(),
  };

  messages[index] = {
    ...messages[index],
    repliedAt: reply.createdAt,
    replies: [reply, ...existingReplies],
  };
  writeStorage(STORAGE_KEYS.messages, messages);

  return {
    ok: true,
    code: "replySent",
    messages,
    reply,
  };
}

export async function updateUserProfile(payload) {
  const users = ensureDefaultAdmin(readStorage(STORAGE_KEYS.users, [])).users;
  const email = String(payload.email).trim().toLowerCase();
  const index = users.findIndex((entry) => entry.email === email);

  if (index === -1) {
    return { ok: false, code: "missing" };
  }

  users[index] = {
    ...users[index],
    fullName: String(payload.fullName).trim(),
    password: payload.password ? String(payload.password) : users[index].password,
    updatedAt: new Date().toISOString(),
  };

  const nextPublicUser = publicUser(users[index]);
  writeStorage(STORAGE_KEYS.users, users);
  writeStorage(STORAGE_KEYS.currentUser, nextPublicUser);

  return {
    ok: true,
    code: "profileUpdated",
    user: nextPublicUser,
    users,
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
      email: String(payload.customerEmail || "").trim().toLowerCase(),
      phone: String(payload.phone).trim(),
      district: String(payload.district).trim(),
      address: String(payload.address).trim(),
      notes: String(payload.notes || "").trim(),
      momoNumber: String(payload.momoNumber || "").trim(),
      location: payload.customerLocation || null,
      nearestBranch: payload.nearestBranch || null,
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
