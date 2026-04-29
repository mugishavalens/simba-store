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

export function applyFilters(products, search, filters) {
  const query = search.trim().toLowerCase();
  let next = products.filter((product) => {
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);
    const matchesCategory = filters.category === "all" || product.category === filters.category;
    const matchesStock =
      filters.stock === "all" ||
      (filters.stock === "in" && product.inStock) ||
      (filters.stock === "out" && !product.inStock);
    const matchesPrice =
      filters.price === "all" ||
      (filters.price === "low" && product.price < 5000) ||
      (filters.price === "mid" && product.price >= 5000 && product.price <= 20000) ||
      (filters.price === "high" && product.price > 20000);
    return matchesSearch && matchesCategory && matchesStock && matchesPrice;
  });

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
