import { catalogData } from "./catalog-data.js";

export async function loadCatalog() {
  let payload = null;

  try {
    const response = await fetch("./simba_products.json");
    if (response.ok) {
      payload = await response.json();
    }
  } catch {
    // Fall back to the bundled catalog when running from file:// or other restricted contexts.
  }

  if (!payload) {
    payload = catalogData;
  }

  const products = payload.products.map((product) => ({
    ...product,
    slug: slugify(product.name),
  }));

  return {
    store: payload.store,
    products,
  };
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
