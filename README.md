# Simba Supermarket — Platform Rebuild

A modern, mobile-first supermarket platform rebuilt for Rwanda, using 789 real products scraped from simbaonlineshopping.com.

**Live Demo:** _(add your Vercel/Render URL here)_

---

## Features

### Core Commerce (Required)
- **Minimum Order Threshold** — 2,500 RWF minimum enforced at cart and checkout with friendly warning
- **Address Landmarks & Delivery Notes** — dedicated "Delivery Instructions & Landmarks" field at checkout (e.g. _Opposite Gisozi Sector Office_)
- **Rwandan Phone Validation** — regex validates `+250 78/79/72/73 XXXXXXX` format at checkout
- **Clear Cart & Empty State** — one-click Clear Cart button; empty cart shows friendly message with _Go to Shop_ CTA
- **Cash on Delivery / Cash on Pickup** — available as a payment option at checkout
- **Static Branches & Hours Page** — `/branches` — 9 Kigali branches with addresses, opening hours, and Google Maps links
- **About Simba & Contact Page** — `/about` — history (founded 2007), mission, email `info@simbasupermarket.rw`, phone, and address
- **AI-Powered Natural Language Search** — Llama 3.3 70B via Groq; falls back to client-side NL rules when no API key is set

### Bonus Features
- **Quick View Modal** — click the eye icon on any product card to preview and add to cart without leaving the catalog
- **AI Chat Assistant** — conversational assistant that understands "add milk to cart", "remove bread", "show my cart", natural language product queries, and service questions
- **Printable Order Invoice** — Print / Download Invoice button on the order success screen
- **Password Visibility Toggle** — show/hide eye icon on all password fields
- **Social Media Sharing** — WhatsApp, Facebook, and X (Twitter) share buttons on product detail pages
- **Interactive FAQ Accordion** — collapsible FAQ on `/faq` covering delivery, returns, recurring orders, etc.
- **Save for Later** — move cart items to a _Saved for Later_ shelf; restore or remove anytime

### Additional Features
- 3 languages: English, French, Kinyarwanda with a language switcher
- Dark mode toggle
- Google OAuth login (configurable)
- Mobile Money simulation (MTN MoMo, Airtel Money) with STK push modal
- Recurring orders (weekly, bi-weekly, monthly)
- Delivery zone selector with fees for all Kigali sectors
- Product reviews and ratings
- Wishlist
- Admin, Branch Manager, Staff, and Customer Care dashboards
- Real-time order notifications

---

## Stack

- Vanilla JS ES modules (no build step)
- Node.js static server with a single API endpoint
- Serverless-ready (`/api/ai-search.js` for Vercel)

---

## Run Locally

```bash
node server.js
# Open http://localhost:5000
```

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Import into Vercel — zero config needed (`vercel.json` is included)
3. Add environment variable: `GROQ_API_KEY` = your Groq API key
   _(without a key, the app falls back to built-in NL rules — all features still work)_

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Optional | Groq API key (`gsk_...`) for Llama 3.3 70B AI search |
| `PORT` | Optional | Server port (default: 5000) |

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@simba.rw` | `SimbaAdmin@2026` |
| Customer Care | `care@simba.rw` | `SimbaCare@2026` |
| Branch Manager | `manager.remera@simba.rw` | `SimbaBranch@2026` |

Create a customer account via the Sign Up page.

---

## Product Dataset

789 real products from simbaonlineshopping.com across 10 categories. Images hosted on Cloudinary. All prices in Rwandan Francs (RWF).
