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

export function summarizeCart(products, cart) {
  const detailed = cart
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) return null;
      return {
        ...item,
        product,
        lineTotal: product.price * item.quantity,
      };
    })
    .filter(Boolean);

  const subtotal = detailed.reduce((sum, item) => sum + item.lineTotal, 0);
  const delivery = subtotal > 0 ? 2500 : 0;
  return {
    items: detailed,
    subtotal,
    delivery,
    total: subtotal + delivery,
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
  return { name: "home" };
}
