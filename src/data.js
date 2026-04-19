export async function loadCatalog() {
  const response = await fetch("./simba_products.json");
  if (!response.ok) {
    throw new Error("Failed to load Simba dataset");
  }

  const payload = await response.json();
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
