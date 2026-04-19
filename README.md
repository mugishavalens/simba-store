# Simba 2.0

A modern static rebuild of the Simba Supermarket experience using the provided Rwandan product dataset.

## Included

- Category browsing from the real dataset
- Search, stock, budget, and sorting filters
- Product detail route
- Cart with persistent local storage
- Demo checkout with Mobile Money option
- English, French, and Kinyarwanda UI
- Dark mode
- Responsive mobile-first layout

## Run locally

Because this app fetches a local JSON file, serve the project through a local server instead of opening `index.html` directly.

PowerShell:

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy

Deploy as a static site on Vercel, Netlify, or GitHub Pages. No build step is required.
