# Simba 2.0

A modern static rebuild of the Simba Supermarket experience using a Rwandan product dataset. Pure HTML + vanilla JavaScript ES modules + CSS — no build step required.

## Project Structure

- `index.html` — entry point
- `src/` — JavaScript modules (app, store, i18n, catalog data, backend mock, etc.)
- `styles/main.css` — styling
- `assets/` — logos and images
- `simba_products.json`, `insta.json`, `insta_raw.txt` — product data
- `server.js` — minimal Node.js static file server (used in dev to serve files on port 5000)
- `package.json` — declares `npm start` → `node server.js`

## Running in Replit

- Workflow `Start application` runs `node server.js`, serving static files on `0.0.0.0:5000`.
- The server sets `Cache-Control: no-store` so the iframe preview always picks up edits.
- SPA-style fallback: requests without a file extension return `index.html`.

## Deployment

Configured as a Replit Static deployment with `publicDir: "."` — no build step. All files in the project root are served as-is, mirroring the dev experience.

## Admin Dashboard

Tabbed admin (visible only to `admin@simba.rw` / `SimbaAdmin@2026`):

- **Overview** — KPIs (products, customers, today's revenue, total revenue, low-stock & expiring counts) plus quick links to recent customer messages and product updates.
- **Products** — Add product form (with SKU, barcode, supplier, expiry, min stock) plus inline editor for each existing product.
- **Suppliers** — Create / edit / delete suppliers; products can be linked to a supplier.
- **Promotions** — Apply a percentage discount to any product (optional end date). Discounted products show a `-N%` badge on the storefront and a `was/now` price.
- **Reports** — Today's & total revenue, order count, average order value, VAT collected (18%), sales-by-category bar chart, low-stock and expiring-soon lists.
- **Customers** — Inline customer list with chat threads and admin replies (existing flow).
- **Orders** — Recent orders panel with the orders map (existing flow).

Cart / checkout now show **You saved** (when promotions apply) and **VAT (18%, included)** rows. State for suppliers, promotions, and the active admin tab is persisted in `localStorage` (`simba.suppliers.v1`, `simba.promotions.v1`, `simba.admin-tab.v1`).
