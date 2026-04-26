import { DEFAULT_ADMIN, DEMO_BRANCH_USERS, GOOGLE_CLIENT_ID, PICKUP_DEPOSIT_RWF, SIMBA_BRANCHES, STORAGE_KEYS } from "./constants.js";

function resolveGoogleClientId() {
  return String(localStorage.getItem("simba.google-client-id") || GOOGLE_CLIENT_ID || "").trim();
}

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
    avatarUrl: user.avatarUrl || "",
    branchId: user.branchId || null,
    lastKnownLocation: user.lastKnownLocation || null,
    lastNearestBranch: user.lastNearestBranch || null,
    noShowFlags: Number(user.noShowFlags || 0),
  };
}

function seedUsers(users) {
  const seeded = [DEFAULT_ADMIN, ...DEMO_BRANCH_USERS].map((user) => ({
    ...user,
    email: String(user.email || "").toLowerCase(),
    createdAt: user.createdAt || new Date().toISOString(),
  }));
  const seededEmails = new Set(seeded.map((user) => user.email));
  const normalizedUsers = users
    .map((user) => ({ ...user, email: String(user.email || "").toLowerCase() }))
    .filter((user) => !seededEmails.has(user.email));
  return [...seeded, ...normalizedUsers];
}

function ensureUsers() {
  const users = seedUsers(readStorage(STORAGE_KEYS.users, []));
  writeStorage(STORAGE_KEYS.users, users);
  return users;
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

  if (payload.aud !== resolveGoogleClientId()) {
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

function makeBranchStock() {
  return Object.fromEntries(
    SIMBA_BRANCHES.map((branch, index) => [branch.id, 6 + ((index * 3) % 9)]),
  );
}

function normalizeProductInventory(product) {
  const branchStock = {};
  for (const branch of SIMBA_BRANCHES) {
    const raw = product.branchStock?.[branch.id];
    branchStock[branch.id] = Number.isFinite(Number(raw))
      ? Math.max(0, Math.floor(Number(raw)))
      : makeBranchStock()[branch.id];
  }
  return {
    ...product,
    branchStock,
    inStock: Object.values(branchStock).some((count) => count > 0),
  };
}

function ensureProducts() {
  const products = readStorage(STORAGE_KEYS.products, []).map(normalizeProductInventory);
  if (products.length) {
    writeStorage(STORAGE_KEYS.products, products);
  }
  return products;
}

function getBranchReviewSummary(reviews, branchId) {
  const branchReviews = reviews.filter((review) => Number(review.branchId) === Number(branchId));
  const count = branchReviews.length;
  const avg = count
    ? branchReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / count
    : 0;
  return { count, average: Number(avg.toFixed(1)) };
}

export function hydrateSession() {
  const users = ensureUsers();
  return {
    users,
    currentUser: readStorage(STORAGE_KEYS.currentUser, null),
    isAuthenticated: readStorage(STORAGE_KEYS.auth, false),
    orders: readStorage(STORAGE_KEYS.orders, []),
    messages: readStorage(STORAGE_KEYS.messages, []),
    branchReviews: readStorage(STORAGE_KEYS.branchReviews, []),
  };
}

export async function registerUser(payload) {
  const users = ensureUsers();
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
    noShowFlags: 0,
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
  const users = ensureUsers();
  const email = String(payload.email).trim().toLowerCase();
  const password = String(payload.password || "");
  const user = users.find((entry) => entry.email === email && entry.password === password);

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
  const users = ensureUsers();
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
  const users = ensureUsers();
  const googleClientId = resolveGoogleClientId();
  if (!googleClientId || googleClientId.includes("YOUR_GOOGLE_CLIENT_ID")) {
    return { ok: false, code: "googleSetupRequired" };
  }

  const verification = verifyGoogleToken(payload.idToken, payload.nonce);
  if (!verification.ok) {
    return verification;
  }

  const googlePayload = verification.payload;
  const googleEmail = String(googlePayload.email || "").trim().toLowerCase();
  if (
    googleEmail === DEFAULT_ADMIN.email.toLowerCase() ||
    DEMO_BRANCH_USERS.some((user) => user.email.toLowerCase() === googleEmail)
  ) {
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
      noShowFlags: 0,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
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
  }

  writeStorage(STORAGE_KEYS.users, users);
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
  const users = ensureUsers();
  const email = String(payload.email).trim().toLowerCase();
  const index = users.findIndex((entry) => entry.email === email);

  if (index === -1) {
    return { ok: false, code: "missing" };
  }

  users[index] = {
    ...users[index],
    fullName: String(payload.fullName).trim(),
    password: payload.password ? String(payload.password) : users[index].password,
    lastKnownLocation: payload.lastKnownLocation ?? users[index].lastKnownLocation ?? null,
    lastNearestBranch: payload.lastNearestBranch ?? users[index].lastNearestBranch ?? null,
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

export async function updateUserLocation(payload) {
  const users = ensureUsers();
  const email = String(payload.email).trim().toLowerCase();
  const index = users.findIndex((entry) => entry.email === email);

  if (index === -1) {
    return { ok: false, code: "missing" };
  }

  users[index] = {
    ...users[index],
    lastKnownLocation: payload.lastKnownLocation || null,
    lastNearestBranch: payload.lastNearestBranch || null,
    updatedAt: new Date().toISOString(),
  };

  const nextPublicUser = publicUser(users[index]);
  writeStorage(STORAGE_KEYS.users, users);
  writeStorage(STORAGE_KEYS.currentUser, nextPublicUser);

  return {
    ok: true,
    code: "locationUpdated",
    user: nextPublicUser,
    users,
  };
}

export async function createOrder(payload) {
  const orders = readStorage(STORAGE_KEYS.orders, []);
  const users = ensureUsers();
  const products = ensureProducts();
  const branchId = Number(payload.branchId);
  const pickupBranch = SIMBA_BRANCHES.find((branch) => branch.id === branchId);

  if (!pickupBranch) {
    return { ok: false, code: "branchRequired" };
  }
  if (!String(payload.pickupTime || "").trim()) {
    return { ok: false, code: "pickupTimeRequired" };
  }
  if (!String(payload.phone || "").trim()) {
    return { ok: false, code: "phoneRequired" };
  }

  const customerEmail = String(payload.customerEmail || "").trim().toLowerCase();
  const customer = users.find((entry) => String(entry.email || "").toLowerCase() === customerEmail);
  const depositAmount = Number(payload.depositAmount || PICKUP_DEPOSIT_RWF);
  const requiredDeposit = Number(customer?.noShowFlags || 0) >= 2 ? depositAmount * 2 : depositAmount;
  const normalizedMethod = ["momo", "card"].includes(String(payload.paymentMethod || "")) ? String(payload.paymentMethod) : "momo";

  if (normalizedMethod === "momo" && !String(payload.momoNumber || "").trim()) {
    return { ok: false, code: "momoNumberRequired" };
  }

  for (const item of payload.items || []) {
    const product = products.find((entry) => Number(entry.id) === Number(item.productId));
    const branchQty = Number(product?.branchStock?.[branchId] || 0);
    if (!product || branchQty < Number(item.quantity || 0)) {
      return { ok: false, code: "branchStockUnavailable" };
    }
  }

  const now = new Date().toISOString();
  const order = {
    id: Date.now(),
    reference: createReference("SIMBA"),
    paymentReference: createReference("DEP"),
    fulfillmentType: "pickup",
    pickupBranch,
    pickupTime: String(payload.pickupTime).trim(),
    paymentMethod: normalizedMethod,
    paymentStatus: normalizedMethod === "momo" ? "deposit_pending" : "deposit_authorized",
    paymentTimeline: [
      {
        label: "created",
        at: now,
        note: `Pickup order created for ${pickupBranch.name}.`,
      },
      {
        label: "deposit",
        at: now,
        note:
          normalizedMethod === "momo"
            ? `MoMo deposit request created for ${requiredDeposit} RWF.`
            : `Card deposit authorization simulated for ${requiredDeposit} RWF.`,
      },
    ],
    depositAmount: requiredDeposit,
    status: "pending",
    assignedStaffEmail: "",
    assignedStaffName: "",
    acceptedBy: "",
    acceptedAt: "",
    readyAt: "",
    completedAt: "",
    customer: {
      fullName: String(payload.fullName).trim(),
      email: customerEmail,
      phone: String(payload.phone).trim(),
      district: String(payload.district || "").trim(),
      address: String(payload.address || "").trim(),
      notes: String(payload.notes || "").trim(),
      momoNumber: String(payload.momoNumber || "").trim(),
      location: payload.customerLocation || null,
      nearestBranch: payload.nearestBranch || null,
    },
    paymentMeta: {
      momoNumber: String(payload.momoNumber || "").trim(),
      cardholderName: String(payload.cardholderName || "").trim(),
      cardLast4: String(payload.cardNumber || "").replace(/\D/g, "").slice(-4),
      instructions:
        normalizedMethod === "momo"
          ? `Your order requires a ${requiredDeposit} RWF MoMo deposit to confirm pickup.`
          : `A ${requiredDeposit} RWF pickup deposit was authorized on card for demo purposes.`,
    },
    items: (payload.items || []).map((item) => ({
      ...item,
      branchId,
    })),
    totals: payload.totals,
    createdAt: now,
  };

  const nextProducts = products.map((product) => {
    const item = order.items.find((entry) => Number(entry.productId) === Number(product.id));
    if (!item) return product;
    const nextBranchStock = {
      ...product.branchStock,
      [branchId]: Math.max(0, Number(product.branchStock?.[branchId] || 0) - Number(item.quantity || 0)),
    };
    return {
      ...product,
      branchStock: nextBranchStock,
      inStock: Object.values(nextBranchStock).some((count) => Number(count) > 0),
    };
  });

  orders.unshift(order);
  writeStorage(STORAGE_KEYS.orders, orders);
  writeStorage(STORAGE_KEYS.products, nextProducts);

  let nextUsers = users;
  if (customer) {
    const userIndex = users.findIndex((entry) => String(entry.email || "").toLowerCase() === customerEmail);
    users[userIndex] = {
      ...users[userIndex],
      lastKnownLocation: payload.customerLocation || users[userIndex].lastKnownLocation || null,
      lastNearestBranch: payload.nearestBranch || users[userIndex].lastNearestBranch || null,
      lastOrderAt: now,
      updatedAt: now,
    };
    writeStorage(STORAGE_KEYS.users, users);
    nextUsers = users;
  }

  return {
    ok: true,
    code: "placed",
    order,
    orders,
    users: nextUsers,
    products: nextProducts,
  };
}

export async function updateOrderStatus(payload) {
  const orders = readStorage(STORAGE_KEYS.orders, []);
  const users = ensureUsers();
  const orderId = Number(payload.orderId);
  const index = orders.findIndex((entry) => Number(entry.id) === orderId);
  if (index === -1) {
    return { ok: false, code: "orderMissing" };
  }

  const now = new Date().toISOString();
  const order = { ...orders[index] };
  const actorName = String(payload.actorName || "Simba Team").trim();
  const actorEmail = String(payload.actorEmail || "").trim().toLowerCase();
  const action = String(payload.action || "").trim();

  if (action === "accept") {
    order.status = "accepted";
    order.acceptedAt = now;
    order.acceptedBy = actorName;
    order.paymentStatus = order.paymentMethod === "momo" ? "deposit_confirmed" : order.paymentStatus;
    order.paymentTimeline = [
      ...(order.paymentTimeline || []),
      { label: "accepted", at: now, note: `${actorName} accepted the order for branch preparation.` },
    ];
  } else if (action === "assign") {
    order.status = "assigned";
    order.assignedStaffEmail = actorEmail;
    order.assignedStaffName = actorName;
    order.paymentTimeline = [
      ...(order.paymentTimeline || []),
      { label: "assigned", at: now, note: `${actorName} was assigned to prepare the order.` },
    ];
  } else if (action === "ready") {
    order.status = "ready";
    order.readyAt = now;
    order.paymentTimeline = [
      ...(order.paymentTimeline || []),
      { label: "ready", at: now, note: `${actorName} marked the order ready for pickup.` },
    ];
  } else if (action === "complete") {
    order.status = "completed";
    order.completedAt = now;
    order.paymentTimeline = [
      ...(order.paymentTimeline || []),
      { label: "completed", at: now, note: `${actorName} completed customer pickup.` },
    ];
  } else if (action === "no_show") {
    order.status = "no_show";
    order.paymentTimeline = [
      ...(order.paymentTimeline || []),
      { label: "no_show", at: now, note: `${actorName} marked the customer as no-show.` },
    ];
    const customerIndex = users.findIndex(
      (entry) => String(entry.email || "").toLowerCase() === String(order.customer?.email || "").toLowerCase(),
    );
    if (customerIndex >= 0) {
      users[customerIndex] = {
        ...users[customerIndex],
        noShowFlags: Number(users[customerIndex].noShowFlags || 0) + 1,
        updatedAt: now,
      };
      writeStorage(STORAGE_KEYS.users, users);
    }
  } else {
    return { ok: false, code: "workflowInvalid" };
  }

  orders[index] = order;
  writeStorage(STORAGE_KEYS.orders, orders);
  return { ok: true, code: "workflowUpdated", orders, users, order };
}

export async function updateBranchInventory(payload) {
  const products = ensureProducts();
  const productId = Number(payload.productId);
  const branchId = Number(payload.branchId);
  const stock = Math.max(0, Math.floor(Number(payload.stock || 0)));
  const index = products.findIndex((entry) => Number(entry.id) === productId);
  if (index === -1) {
    return { ok: false, code: "productMissing" };
  }

  const nextProduct = {
    ...products[index],
    branchStock: {
      ...products[index].branchStock,
      [branchId]: stock,
    },
  };
  nextProduct.inStock = Object.values(nextProduct.branchStock).some((count) => Number(count) > 0);
  products[index] = nextProduct;
  writeStorage(STORAGE_KEYS.products, products);
  return { ok: true, code: "inventoryUpdated", products, product: nextProduct };
}

export async function submitBranchReview(payload) {
  const reviews = readStorage(STORAGE_KEYS.branchReviews, []);
  const orders = readStorage(STORAGE_KEYS.orders, []);
  const orderId = Number(payload.orderId);
  const orderIndex = orders.findIndex((entry) => Number(entry.id) === orderId);
  if (orderIndex === -1) {
    return { ok: false, code: "orderMissing" };
  }
  if (orders[orderIndex].status !== "completed") {
    return { ok: false, code: "reviewUnavailable" };
  }
  if (orders[orderIndex].branchReview) {
    return { ok: false, code: "reviewExists" };
  }

  const rating = Math.min(5, Math.max(1, Number(payload.rating || 0)));
  if (!rating) {
    return { ok: false, code: "ratingRequired" };
  }

  const review = {
    id: Date.now(),
    orderId,
    branchId: Number(payload.branchId),
    branchName: String(payload.branchName || "").trim(),
    rating,
    comment: String(payload.comment || "").trim(),
    customerEmail: String(payload.customerEmail || "").trim().toLowerCase(),
    customerName: String(payload.customerName || "").trim(),
    createdAt: new Date().toISOString(),
  };
  reviews.unshift(review);
  orders[orderIndex] = {
    ...orders[orderIndex],
    branchReview: review,
  };
  writeStorage(STORAGE_KEYS.branchReviews, reviews);
  writeStorage(STORAGE_KEYS.orders, orders);
  return {
    ok: true,
    code: "reviewSaved",
    reviews,
    orders,
    summary: getBranchReviewSummary(reviews, review.branchId),
  };
}
