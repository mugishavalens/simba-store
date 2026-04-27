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
