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

## Wishlist (Saved items)

Customers can save products to a personal wishlist that lives in `localStorage` (`simba.wishlist.v1`):

- Heart icon button overlays every product card (catalog grid), every "Today's deals" card, every "Recently viewed" rail card, and the product detail page.
- Toggle hearts add/remove the product; filled red = saved. Heart pop animation respects `prefers-reduced-motion`.
- Topbar gets a wishlist heart icon (next to the cart) with a count badge — links to `#wishlist`.
- Home page shows a **Saved items** section above the Recently viewed rail when the wishlist is non-empty: grid of cards with image, badge if on promo, was/now prices, "Details" + "Add to cart" buttons, and a per-card × remove. Section has a "Clear wishlist" button.
- Customer account dashboard shows a **Saved items** tile (count + "Open wishlist" link).
- Wishlist labels translated for English, French, and Kinyarwanda (inline `WISHLIST_LABELS`).
- Store API: `toggleWishlist`, `removeFromWishlist`, `clearWishlist`, `isInWishlist` exported from `src/store.js`.

## Phase 1 — Multi-language polish (complete)
- `LANGUAGE_META` constant in `src/app.js` provides flag emoji, English name, native name, and tagline for `en` / `fr` / `rw`.
- Topbar language switcher upgraded to a pill (`.language-pill`) showing flag + name + caret, opening a rich dropdown (`.language-menu__list--rich`) that shows flag, English name, native name, and a checkmark on the active language.
- New `STORAGE_KEYS.languageWelcomeSeen` flag plus `dismissLanguageWelcome()` store action.
- First-visit modal `renderLanguageWelcome()` shows a centered card with three large flag buttons (English / Français / Ikinyarwanda); Skip and Continue both dismiss and persist the flag.
- Browser language auto-detect: `initializeStore` reads `navigator.languages[0]` / `navigator.language` and sets `state.language` to `en` / `fr` / `rw` only on the first visit (when no saved language).
- New i18n keys `brandSuperMarket` / `brandOnlineShop` added for all three languages; brand lockup uses them via `tr(...)`.
- Footer social links got `aria-label` attributes (brand names kept as text).
- All new CSS appended to `styles/main.css` under section comment headers; respects `prefers-reduced-motion` and dark theme.

## Phase 2 — Branch Operations dashboard (complete)
- New route `#/branch` registered in `src/utils.js` and dispatched in `render()` to `renderBranchOpsView()`.
- Role gate: only `manager` and `staff` accounts see the kanban; everyone else gets a banner with demo credentials and a Sign-in CTA.
- Topbar nav and account dashboard tile show **Branch operations** for `manager`/`staff` (admins still see "Admin dashboard").
- Kanban with five columns: **Pending → Accepted → Preparing (assigned) → Ready for pickup → Completed**, each card showing customer, reference, time elapsed, pickup time, phone, items, payment method, total, and status-specific action buttons.
- Action buttons reuse the existing `data-order-action` plumbing wired to `updateOrderWorkflow` (Accept / Start preparing / Mark ready / Complete pickup / No-show).
- Today-stats strip: Pending, In progress, Ready, Completed today, Revenue today (only completed orders).
- Branch-scoped low-stock and expiring-soon panels (filtered by `branchStock[branchId]` and `expiry` within `EXPIRY_ALERT_DAYS`).
- "Load demo orders" button calls `seedDemoBranchOrders(branchId)` in `src/store.js`, which generates 6 sample orders across all five statuses using real products from the catalog and persists them to `STORAGE_KEYS.orders`.
- Inline `BRANCH_OPS_LABELS` for `en` / `fr` / `rw` (kept out of `src/i18n.js` to follow the existing label-object pattern).
- Welcome modal now only shows on the home route so deep links to `#/branch`, `#/account`, `#/product/...` aren't interrupted.
- All kanban CSS appended to `styles/main.css`; responsive (5 cols → 2 → 1), supports dark theme and `prefers-reduced-motion`.

### Demo credentials
- Admin: `admin@simba.rw` / `SimbaAdmin@2026`
- Manager (Remera): `manager.remera@simba.rw` / `SimbaBranch@2026`
- Staff (Remera): `staff.remera@simba.rw` / `SimbaBranch@2026`
