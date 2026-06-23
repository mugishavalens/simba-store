import { catalogData } from "./catalog-data.js";

export async function loadCatalog() {
  // Always use the bundled catalog-data.js — the simba_products.json file
  // has incorrect category assignments (251 products mis-tagged as "Alcoholic Drinks")
  // so we use catalog-data.js as the single source of truth on all environments.
  const payload = catalogData;

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
