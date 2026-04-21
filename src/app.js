import { CATEGORY_BACKGROUNDS, LANGUAGES, PAYMENT_METHODS } from "./constants.js";
import { loadCatalog } from "./data.js";
import { t } from "./i18n.js";
import {
  addToCart,
  clearAuthFeedback,
  clearCart,
  clearCheckoutFeedback,
  clearContactFeedback,
  completeOrder,
  getState,
  initializeStore,
  loginAccount,
  loginWithGoogle,
  registerAccount,
  removeFromCart,
  resetPassword,
  sendSupportMessage,
  setFilter,
  setAuthFeedback,
  setLanguage,
  setSearch,
  setTheme,
  signOut,
  subscribe,
  toggleCart,
  updateQuantity,
} from "./store.js";
import { applyFilters, formatPrice, getCategories, route, summarizeCart } from "./utils.js";

const BRAND_LOGO =
  "data:image/jpeg;base64,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";
const VISION_SHOWCASE_IMAGES = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTf4rHABnzJsOKDxcNOG0TSPLoaodcxwMmX-A&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNpBmkNpqvtQVe7aPs1F4Wdeszzjr8_BmQqg&s",
  "https://www.simbaonlineshopping.com/Images/SimbaJuices.jpg",
  "https://mobile.igihe.com/local/cache-vignettes/L640xH480/sam_1806-ffe26.jpg?1714116291",
];

const app = document.querySelector("#app");
let lastScrollY = window.scrollY;
let discoverPanelHidden = false;
let scrollTicking = false;

window.addEventListener("hashchange", render);
subscribe(() => render());
window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;
    scrollTicking = true;

    requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      const shouldHide = currentScrollY > 140 && delta > 10;
      const shouldShow = delta < -6 || currentScrollY < 72;

      if (shouldHide && !discoverPanelHidden) {
        discoverPanelHidden = true;
        syncDiscoverPanelVisibility();
      } else if (shouldShow && discoverPanelHidden) {
        discoverPanelHidden = false;
        syncDiscoverPanelVisibility();
      }

      lastScrollY = currentScrollY;
      scrollTicking = false;
    });
  },
  { passive: true },
);

boot();

async function boot() {
  const payload = await loadCatalog();
  initializeStore(payload);
}

function render() {
  const state = getState();
  document.documentElement.lang = state.language;
  if (!state.store) {
    app.innerHTML =
      '<main class="shell section"><div class="banner"><h3>Loading Simba 2.0</h3><p>Preparing the catalog...</p></div></main>';
    return;
  }

  const currentRoute = route();
  const categories = getCategories(state.products);
  const filteredProducts = applyFilters(state.products, state.search, state.filters);
  const cartSummary = summarizeCart(state.products, state.cart);
  const tr = (key) => t(state.language, key);

  let view = "";
  if (currentRoute.name === "product") {
    view = renderProductView(state, currentRoute.id, cartSummary, tr);
  } else if (currentRoute.name === "checkout") {
    view = renderCheckoutView(state, cartSummary, tr);
  } else if (currentRoute.name === "auth") {
    view = renderAuthView(state, currentRoute.mode, tr);
  } else {
    view = renderHomeView(state, categories, filteredProducts, cartSummary, tr);
  }

  app.innerHTML = `
    ${renderTopbar(state, cartSummary, categories, tr, currentRoute)}
    ${view}
    ${state.cartOpen ? renderCart(state, cartSummary, tr) : ""}
  `;

  bindEvents(currentRoute);
  syncDiscoverPanelVisibility();
}

function syncDiscoverPanelVisibility() {
  const panel = document.querySelector(".discover-panel");
  if (!panel) return;
  panel.classList.toggle("discover-panel--hidden", discoverPanelHidden);
}

function renderTopbar(state, cartSummary, categories, tr, currentRoute) {
  const authMode = currentRoute.name === "auth";
  const isDark = state.theme === "dark";
  return `
    <header class="topbar">
      <div class="topbar__inner">
        <a class="brand brand--lockup" href="#/">
          <img src="${BRAND_LOGO}" alt="Simba Supermarket Online Shopping" />
          <div class="brand__text">
            <strong>Simba</strong>
            <span>Super Market</span>
            <span>Online Shop</span>
          </div>
        </a>
        <nav class="main-nav" aria-label="Primary">
          <a class="main-nav__link" href="#/">${tr("navHome")}</a>
          <a class="main-nav__link" href="#about">${tr("navAbout")}</a>
          <a class="main-nav__link" href="#vision">${tr("navVision")}</a>
          <a class="main-nav__link" href="#support">${tr("navSupport")}</a>
        </nav>
        <div class="topbar__actions">
          <div class="language-switcher">
            <label class="control-pill control-pill--select" for="language-select">
              <span class="control-pill__label">${tr("language")}</span>
              <select class="select select--compact select--bare" id="language-select" aria-label="${tr("language")}">
                ${LANGUAGES.map(
                  (language) =>
                    `<option value="${language}" ${state.language === language ? "selected" : ""}>${language.toUpperCase()}</option>`,
                ).join("")}
              </select>
            </label>
            <button
              class="control-pill control-pill--toggle"
              id="theme-toggle"
              type="button"
              aria-label="${tr("darkMode")}"
              aria-pressed="${isDark}"
              title="${isDark ? tr("themeDark") : tr("themeLight")}"
            >
              <span class="control-pill__label">${tr("darkMode")}</span>
              <span class="theme-toggle ${isDark ? "theme-toggle--dark" : ""}" aria-hidden="true">
                <span class="theme-toggle__thumb"></span>
              </span>
            </button>
          </div>
          ${
            state.isAuthenticated
              ? `
                <span class="role-pill">${escapeHtml(state.currentUser?.role || "customer")}</span>
                <button class="button button--ghost" id="cart-toggle">${tr("cart")} (${cartSummary.count})</button>
                <button class="button button--primary" id="signout-toggle">${tr("navSignOut")}</button>
              `
              : `<a class="button button--primary" href="#/auth/signin">${tr("navSignIn")}</a>`
          }
        </div>
      </div>
      ${
        authMode
          ? ""
          : `<div class="discover-panel">
              <label class="searchbar">
                <span class="searchbar__icon">&#8981;</span>
                <input id="search-input" value="${escapeHtml(state.search)}" placeholder="${tr("searchPlaceholder")}" />
              </label>
              <div class="toolbar">
                <div class="toolbar__panel">
                  <div class="filters">
                    <select class="select" id="category-filter">
                      <option value="all">${tr("allCategories")}</option>
                      ${categories
                        .map(
                          (category) =>
                            `<option value="${escapeHtml(category)}" ${state.filters.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`,
                        )
                        .join("")}
                    </select>
                    <select class="select" id="price-filter">
                      <option value="all">${tr("allPrices")}</option>
                      <option value="low" ${state.filters.price === "low" ? "selected" : ""}>${tr("budgetLow")}</option>
                      <option value="mid" ${state.filters.price === "mid" ? "selected" : ""}>${tr("budgetMid")}</option>
                      <option value="high" ${state.filters.price === "high" ? "selected" : ""}>${tr("budgetHigh")}</option>
                    </select>
                    <select class="select" id="stock-filter">
                      <option value="all">${tr("allStock")}</option>
                      <option value="in" ${state.filters.stock === "in" ? "selected" : ""}>${tr("inStock")}</option>
                      <option value="out" ${state.filters.stock === "out" ? "selected" : ""}>${tr("outOfStock")}</option>
                    </select>
                  </div>
                  <div class="toolbar__group">
                    <select class="select" id="sort-filter">
                      <option value="featured" ${state.filters.sort === "featured" ? "selected" : ""}>${tr("sortFeatured")}</option>
                      <option value="low" ${state.filters.sort === "low" ? "selected" : ""}>${tr("sortLow")}</option>
                      <option value="high" ${state.filters.sort === "high" ? "selected" : ""}>${tr("sortHigh")}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>`
      }
    </header>
  `;
}

function renderHomeView(state, categories, filteredProducts, cartSummary, tr) {
  const topCategories = categories.slice(0, 6);
  const featured = filteredProducts.slice(0, 18);
  const contactFeedback = state.contactFeedback
    ? `<p class="auth-feedback auth-feedback--${state.contactFeedback.type}">${tr(`contact_${state.contactFeedback.code}`)}</p>`
    : "";

  return `
    <main>
      <section class="hero">
        <div class="hero__content">
          <div class="hero__grid">
            <div>
              <div class="eyebrow">${tr("heroEyebrow")}</div>
              <h1>${tr("heroTitle")}</h1>
              <p>${tr("heroText")}</p>
              <div class="hero__actions">
                <a class="button button--primary" href="#catalog">${tr("shopNow")}</a>
                <button class="button button--ghost" id="hero-cart">${tr("viewCart")}</button>
              </div>
            </div>
            <div class="stats">
              <div class="stat"><div class="stat__value">789</div><div>${tr("statProducts")}</div></div>
              <div class="stat"><div class="stat__value">${categories.length}</div><div>${tr("statCategories")}</div></div>
              <div class="stat"><div class="stat__value">3</div><div>${tr("statLanguage")}</div></div>
              <div class="stat"><div class="stat__value">${cartSummary.count}</div><div>${tr("cartCount")}</div></div>
            </div>
            <div class="hero__badges">
              <span class="hero-badge">${tr("heroBadgeOne")}</span>
              <span class="hero-badge">${tr("heroBadgeTwo")}</span>
              <span class="hero-badge">${tr("heroBadgeThree")}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="about">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("whyTitle")}</h2>
            <p class="section__lead">${tr("whyLead")}</p>
          </div>
        </div>
        <div class="feature-grid">
          <article class="feature-card">
            <h3>${tr("featureOneTitle")}</h3>
            <p>${tr("featureOneText")}</p>
          </article>
          <article class="feature-card">
            <h3>${tr("featureTwoTitle")}</h3>
            <p>${tr("featureTwoText")}</p>
          </article>
          <article class="feature-card">
            <h3>${tr("featureThreeTitle")}</h3>
            <p>${tr("featureThreeText")}</p>
          </article>
        </div>
      </section>

      <section class="section vision-section" id="vision">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("visionTitle")}</h2>
            <p class="section__lead">${tr("visionLead")}</p>
          </div>
          <span class="pill">${tr("navVision")}</span>
        </div>
        <div class="vision-showcase">
          <article class="vision-hero">
            <div class="vision-hero__pulse" aria-hidden="true"></div>
            <div class="vision-hero__media" aria-label="${tr("visionGalleryLabel")}">
              ${VISION_SHOWCASE_IMAGES.map(
                (image, index) => `
                  <figure class="vision-slide" style="--slide-delay:${index * 4}s">
                    <img src="${image}" alt="${tr("visionGalleryAlt")} ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}" />
                  </figure>
                `,
              ).join("")}
            </div>
            <div class="eyebrow">${tr("heroEyebrow")}</div>
            <h3>${tr("visionHeroTitle")}</h3>
            <p>${tr("visionHeroText")}</p>
          </article>
          <div class="vision-grid">
            <article class="feature-card vision-card">
              <span class="vision-card__index">01</span>
              <h3>${tr("visionPointOneTitle")}</h3>
              <p>${tr("visionPointOneText")}</p>
            </article>
            <article class="feature-card vision-card">
              <span class="vision-card__index">02</span>
              <h3>${tr("visionPointTwoTitle")}</h3>
              <p>${tr("visionPointTwoText")}</p>
            </article>
            <article class="feature-card vision-card">
              <span class="vision-card__index">03</span>
              <h3>${tr("visionPointThreeTitle")}</h3>
              <p>${tr("visionPointThreeText")}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("categoriesTitle")}</h2>
            <p class="section__lead">${tr("categoriesLead")}</p>
          </div>
        </div>
        <div class="category-grid">
          ${topCategories
            .map(
              (category) => `
                <button class="category-card category-trigger" data-category="${escapeHtml(category)}" style="background-image: url('${CATEGORY_BACKGROUNDS[category] || CATEGORY_BACKGROUNDS.General}')">
                  <span class="pill">${escapeHtml(category)}</span>
                  <h3>${escapeHtml(category)}</h3>
                  <span>${state.products.filter((item) => item.category === category).length} ${tr("filterResults")}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="section" id="catalog">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("productsTitle")}</h2>
            <p class="section__lead">${tr("productsLead")}</p>
          </div>
          <span class="pill">${filteredProducts.length} ${tr("filterResults")}</span>
        </div>
        <div class="banner">
          <h3>${tr("featuredBannerTitle")}</h3>
          <p>${tr("featuredBannerText")}</p>
          <div><button class="button button--accent category-trigger" data-category="General">${tr("featuredBannerAction")}</button></div>
        </div>
        ${
          featured.length
            ? `<div class="product-grid">${featured.map((product) => renderProductCard(product, tr)).join("")}</div>`
            : `<div class="empty-state"><h3>${tr("noResultsTitle")}</h3><p>${tr("noResultsText")}</p></div>`
        }
      </section>

      <section class="section" id="support">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("navSupport")}</h2>
            <p class="section__lead">${tr("contactLead")}</p>
          </div>
        </div>
        <div class="contact-grid">
          <article class="feature-card contact-card">
            <h3>Email</h3>
            <p>hello@simba.rw</p>
          </article>
          <article class="feature-card contact-card">
            <h3>Phone</h3>
            <p>+250 788 123 456</p>
          </article>
          <article class="feature-card contact-card">
            <h3>Kigali</h3>
            <p>KG 7 Ave, Kigali, Rwanda</p>
          </article>
        </div>
        <div class="auth-card contact-panel">
          ${contactFeedback}
          <form id="contact-form" class="auth-form">
            <div class="checkout-grid">
              <label class="checkout-field"><span>${tr("fullName")}</span><input name="fullName" required /></label>
              <label class="checkout-field"><span>${tr("authEmail")}</span><input name="email" type="email" required /></label>
            </div>
            <label class="checkout-field"><span>${tr("contactMessage")}</span><textarea name="message" rows="4" required></textarea></label>
            <div class="contact-panel__actions">
              <button class="button button--accent" type="submit">${tr("contactSend")}</button>
              <span class="muted">${tr("contactLead")}</span>
            </div>
          </form>
        </div>
      </section>

      ${renderFooter(tr)}
    </main>
  `;
}

function renderProductCard(product, tr) {
  return `
    <article class="product-card">
      <div class="product-card__media">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />
      </div>
      <div class="product-card__body">
        <div class="tag-row">
          <span class="pill">${escapeHtml(product.category)}</span>
          <span class="pill">${product.inStock ? tr("inStock") : tr("outOfStock")}</span>
        </div>
        <div class="product-card__name">${escapeHtml(product.name)}</div>
        <div class="product-card__meta">
          <span class="muted">${tr("unit")}: ${escapeHtml(product.unit)}</span>
          <strong class="product-card__price">${formatPrice(product.price)}</strong>
        </div>
        <div class="product-card__actions">
          <a class="button button--ghost" href="#/product/${product.id}">${tr("details")}</a>
          <button class="button button--primary add-to-cart" data-product-id="${product.id}">${tr("addToCart")}</button>
        </div>
      </div>
    </article>
  `;
}

function renderProductView(state, productId, cartSummary, tr) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product) {
    return `<main class="product-layout"><div class="empty-state"><h3>Product not found</h3><a class="button" href="#/">${tr("backHome")}</a></div></main>`;
  }

  return `
    <main class="product-layout">
      <a class="button button--ghost" href="#/">${tr("backHome")}</a>
      <section class="detail-card">
        <div class="detail-card__media">
          <img src="${product.image}" alt="${escapeHtml(product.name)}" />
        </div>
        <div class="detail-card__content">
          <div class="tag-row">
            <span class="pill">${escapeHtml(product.category)}</span>
            <span class="pill">${product.inStock ? tr("inStock") : tr("outOfStock")}</span>
          </div>
          <div>
            <h1>${escapeHtml(product.name)}</h1>
            <p class="section__lead">
              ${tr("category")}: ${escapeHtml(product.category)}<br />
              ${tr("unit")}: ${escapeHtml(product.unit)}
            </p>
          </div>
          <div class="product-card__price">${formatPrice(product.price)}</div>
          <div class="detail-meta">
            <span class="muted">ID ${product.id}</span>
            <span class="muted">${cartSummary.count} ${tr("cartCount")}</span>
          </div>
          <div class="detail-actions">
            <button class="button button--primary add-to-cart" data-product-id="${product.id}">${tr("addToCart")}</button>
            <button class="button button--accent" id="buy-now" data-product-id="${product.id}">${tr("goCheckout")}</button>
          </div>
          <div class="banner">
            <h3>${tr("momoHint")}</h3>
            <p>${escapeHtml(product.name)} is ready for demo checkout with card, cash on delivery, or MTN MoMo flow.</p>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderCheckoutView(state, cartSummary, tr) {
  return `
    <main class="checkout-layout">
      <section class="checkout-card">
        <h2>${tr("checkoutTitle")}</h2>
        <p class="section__lead">${tr("checkoutLead")}</p>
        ${
          state.orderComplete
            ? `<div class="banner"><h3>${tr("orderPlaced")}</h3><p>${tr("orderPlacedText")}</p><a class="button button--primary" href="#/">${tr("continueShopping")}</a></div>`
            : `<form id="checkout-form">
                <div class="checkout-grid">
                  <label class="checkout-field">
                    <span>${tr("fullName")}</span>
                    <input name="fullName" required />
                  </label>
                  <label class="checkout-field">
                    <span>${tr("phone")}</span>
                    <input name="phone" required />
                  </label>
                </div>
                <div class="checkout-grid">
                  <label class="checkout-field">
                    <span>${tr("district")}</span>
                    <input name="district" required />
                  </label>
                  <label class="checkout-field">
                    <span>${tr("paymentMethod")}</span>
                    <select name="paymentMethod" id="payment-method">
                      ${PAYMENT_METHODS.map((method) => {
                        const labelMap = {
                          momo: tr("paymentMomo"),
                          card: tr("paymentCard"),
                          cash: tr("paymentCash"),
                        };
                        return `<option value="${method}">${labelMap[method]}</option>`;
                      }).join("")}
                    </select>
                  </label>
                </div>
                <label class="checkout-field" id="momo-field">
                  <span>${tr("momoNumber")}</span>
                  <input name="momoNumber" placeholder="07XXXXXXXX" />
                </label>
                <label class="checkout-field">
                  <span>${tr("address")}</span>
                  <textarea name="address" required></textarea>
                </label>
                <label class="checkout-field">
                  <span>${tr("notes")}</span>
                  <textarea name="notes"></textarea>
                </label>
                <div class="checkout-actions">
                  <button class="button button--primary" type="submit">${tr("placeOrder")}</button>
                  <a class="button button--ghost" href="#/">${tr("continueShopping")}</a>
                </div>
              </form>`
        }
      </section>
      <aside class="summary-card">
        <h3>${tr("orderSummary")}</h3>
        ${
          cartSummary.items.length
            ? cartSummary.items
                .map(
                  (item) =>
                    `<div class="summary-card__row"><span>${escapeHtml(item.product.name)} x${item.quantity}</span><strong>${formatPrice(item.lineTotal)}</strong></div>`,
                )
                .join("")
            : `<p>${tr("emptyCartText")}</p>`
        }
        <div class="summary-card__row"><span>${tr("subtotal")}</span><strong>${formatPrice(cartSummary.subtotal)}</strong></div>
        <div class="summary-card__row"><span>${tr("delivery")}</span><strong>${formatPrice(cartSummary.delivery)}</strong></div>
        <div class="summary-card__row summary-card__total"><span>${tr("total")}</span><strong>${formatPrice(cartSummary.total)}</strong></div>
        <p class="notice">${tr("momoHint")}</p>
      </aside>
    </main>
  `;
}

function renderAuthView(state, mode, tr) {
  const feedback = state.authFeedback
    ? `<p class="auth-feedback auth-feedback--${state.authFeedback.type}">${tr(`auth_${state.authFeedback.code}`)}</p>`
    : "";

  if (mode === "signup") {
    return `
      <main class="auth-layout">
        <section class="auth-panel">
          <div class="auth-panel__intro">
            <div class="eyebrow">${tr("authEyebrow")}</div>
            <h1>${tr("authCreateTitle")}</h1>
            <p class="section__lead">${tr("authCreateLead")}</p>
          </div>
          ${feedback}
          <form id="signup-form" class="auth-form">
            <label class="checkout-field"><span>${tr("fullName")}</span><input name="fullName" required /></label>
            <label class="checkout-field"><span>${tr("authEmail")}</span><input name="email" type="email" required /></label>
            <label class="checkout-field"><span>${tr("authPassword")}</span><input name="password" type="password" minlength="6" required /></label>
            <label class="checkout-field"><span>${tr("authConfirmPassword")}</span><input name="confirmPassword" type="password" minlength="6" required /></label>
            <label class="checkout-field">
              <span>${tr("authRole")}</span>
              <select name="role">
                <option value="customer">${tr("authRoleCustomer")}</option>
                <option value="admin">${tr("authRoleAdmin")}</option>
              </select>
            </label>
            <button class="button button--primary auth-submit" type="submit">${tr("authCreateAccount")}</button>
          </form>
          <p class="auth-switch">${tr("authHaveAccount")} <a class="auth-inline-link" href="#/auth/signin">${tr("navSignIn")}</a></p>
        </section>
      </main>
    `;
  }

  if (mode === "forgot") {
    return `
      <main class="auth-layout">
        <section class="auth-panel">
          <div class="auth-panel__intro">
            <div class="eyebrow">${tr("authEyebrow")}</div>
            <h1>${tr("authResetTitle")}</h1>
            <p class="section__lead">${tr("authResetLead")}</p>
          </div>
          ${feedback}
          <form id="reset-form" class="auth-form">
            <label class="checkout-field"><span>${tr("authEmail")}</span><input name="email" type="email" required /></label>
            <label class="checkout-field"><span>${tr("authNewPassword")}</span><input name="password" type="password" minlength="6" required /></label>
            <label class="checkout-field"><span>${tr("authConfirmPassword")}</span><input name="confirmPassword" type="password" minlength="6" required /></label>
            <button class="button button--primary auth-submit" type="submit">${tr("authResetButton")}</button>
          </form>
          <p class="auth-switch"><a class="auth-inline-link" href="#/auth/signin">${tr("navSignIn")}</a></p>
        </section>
      </main>
    `;
  }

  return `
    <main class="auth-layout">
      <section class="auth-panel">
        <div class="auth-panel__intro">
          <div class="eyebrow">${tr("authEyebrow")}</div>
          <h1>${tr("authSignInTitle")}</h1>
          <p class="section__lead">${tr("authSignInLead")}</p>
        </div>
        ${feedback}
        <form id="signin-form" class="auth-form">
          <label class="checkout-field"><span>${tr("authEmail")}</span><input name="email" type="email" required /></label>
          <label class="checkout-field"><span>${tr("authPassword")}</span><input name="password" type="password" minlength="6" required /></label>
          <div class="summary-card__row">
            <label class="auth-remember"><input type="checkbox" name="remember" /> <span>${tr("authRemember")}</span></label>
            <a class="auth-inline-link" href="#/auth/forgot">${tr("authForgot")}</a>
          </div>
          <button class="button button--primary auth-submit" type="submit">${tr("authSignInButton")}</button>
          <button class="button button--ghost" id="google-login" type="button">${tr("authGoogle")}</button>
        </form>
        <p class="auth-switch">${tr("authNoAccount")} <a class="auth-inline-link" href="#/auth/signup">${tr("navSignUp")}</a></p>
      </section>
    </main>
  `;
}

function renderCart(state, cartSummary, tr) {
  return `
    <aside class="cart-drawer">
      <div class="summary-card">
        <div class="summary-card__row">
          <h3>${tr("cart")}</h3>
          <button class="button button--ghost" id="close-cart">${tr("close")}</button>
        </div>
        ${
          cartSummary.items.length
            ? `<div class="cart-items">${cartSummary.items.map((item) => renderCartItem(item, tr)).join("")}</div>`
            : `<div class="empty-state"><h3>${tr("emptyCart")}</h3><p>${tr("emptyCartText")}</p></div>`
        }
        <div class="summary-card__row"><span>${tr("subtotal")}</span><strong>${formatPrice(cartSummary.subtotal)}</strong></div>
        <div class="summary-card__row"><span>${tr("delivery")}</span><strong>${formatPrice(cartSummary.delivery)}</strong></div>
        <div class="summary-card__row summary-card__total"><span>${tr("total")}</span><strong>${formatPrice(cartSummary.total)}</strong></div>
        <div class="cart-actions">
          <a class="button button--primary" href="#/checkout">${tr("goCheckout")}</a>
          <button class="button button--ghost" id="clear-cart">${tr("clearCart")}</button>
        </div>
      </div>
    </aside>
  `;
}

function renderCartItem(item, tr) {
  return `
    <div class="cart-item">
      <div class="cart-item__main">
        <div class="cart-item__thumb"><img src="${item.product.image}" alt="${escapeHtml(item.product.name)}" /></div>
        <div class="cart-item__info">
          <div class="cart-item__name">${escapeHtml(item.product.name)}</div>
          <div class="muted">${tr("unit")}: ${escapeHtml(item.product.unit)}</div>
          <div class="cart-item__price">${formatPrice(item.lineTotal)}</div>
        </div>
        <div class="cart-item__controls">
          <div class="qty-control">
            <button class="qty-button cart-qty" data-product-id="${item.product.id}" data-delta="-1">-</button>
            <span>${item.quantity}</span>
            <button class="qty-button cart-qty" data-product-id="${item.product.id}" data-delta="1">+</button>
          </div>
          <button class="cart-remove" data-product-id="${item.product.id}" aria-label="${tr("removeItem")}">×</button>
        </div>
      </div>
    </div>
  `;
}

function renderFooter(tr) {
  return `
    <footer class="footer">
      <div class="footer__main">
        <div class="footer__card footer__card--brand">
          <h3>${tr("footerTitle")}</h3>
          <p>${tr("footerText")}</p>
        </div>
        <div class="footer__card">
          <h3>${tr("footerFeatureTitle")}</h3>
          <div class="tag-row">
            <span class="pill">Search</span>
            <span class="pill">Filters</span>
            <span class="pill">Cart</span>
            <span class="pill">Checkout</span>
            <span class="pill">MoMo</span>
            <span class="pill">3 Languages</span>
            <span class="pill">Dark Mode</span>
          </div>
        </div>
        <div class="footer__card">
          <h3>${tr("footerContestTitle")}</h3>
          <p class="footer__meta">${tr("footerContestText")}</p>
        </div>
      </div>
      <div class="footer__social">
        <div>
          <p class="footer__social-label">${tr("footerSocialTitle")}</p>
          <div class="footer__social-links">
            <a class="footer__social-link" href="https://www.facebook.com/" target="_blank" rel="noreferrer">Facebook</a>
            <a class="footer__social-link" href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
            <a class="footer__social-link" href="https://x.com/" target="_blank" rel="noreferrer">X</a>
            <a class="footer__social-link" href="https://wa.me/" target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
        <p class="footer__meta">${tr("footerSocialText")}</p>
      </div>
      <p class="footer__copyright">${tr("footerCopyright")}</p>
    </footer>
  `;
}

function bindEvents(currentRoute) {
  document.querySelector("#search-input")?.addEventListener("input", (event) => setSearch(event.target.value));
  document.querySelector("#category-filter")?.addEventListener("change", (event) => setFilter("category", event.target.value));
  document.querySelector("#price-filter")?.addEventListener("change", (event) => setFilter("price", event.target.value));
  document.querySelector("#stock-filter")?.addEventListener("change", (event) => setFilter("stock", event.target.value));
  document.querySelector("#sort-filter")?.addEventListener("change", (event) => setFilter("sort", event.target.value));
  document.querySelector("#theme-toggle")?.addEventListener("click", () => {
    const nextTheme = getState().theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });
  document.querySelector("#language-select")?.addEventListener("change", (event) => setLanguage(event.target.value));
  document.querySelector("#cart-toggle")?.addEventListener("click", () => toggleCart(true));
  document.querySelector("#signout-toggle")?.addEventListener("click", () => signOut());
  document.querySelector("#hero-cart")?.addEventListener("click", () => toggleCart(true));
  document.querySelector("#close-cart")?.addEventListener("click", () => toggleCart(false));
  document.querySelector("#clear-cart")?.addEventListener("click", () => clearCart());

  document.querySelectorAll(".add-to-cart").forEach((button) =>
    button.addEventListener("click", () => addToCart(Number(button.dataset.productId))),
  );

  document.querySelectorAll(".category-trigger").forEach((button) =>
    button.addEventListener("click", () => {
      setFilter("category", button.dataset.category);
      location.hash = "catalog";
    }),
  );

  document.querySelectorAll(".cart-qty").forEach((button) =>
    button.addEventListener("click", () =>
      updateQuantity(Number(button.dataset.productId), Number(button.dataset.delta)),
    ),
  );

  document.querySelectorAll(".cart-remove").forEach((button) =>
    button.addEventListener("click", () => removeFromCart(Number(button.dataset.productId))),
  );

  document.querySelector("#buy-now")?.addEventListener("click", (event) => {
    addToCart(Number(event.currentTarget.dataset.productId));
    location.hash = "/checkout";
  });

  document.querySelector("#checkout-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const state = getState();
    const cartSummary = summarizeCart(state.products, state.cart);
    const ok = await completeOrder({
      fullName: form.get("fullName"),
      phone: form.get("phone"),
      district: form.get("district"),
      paymentMethod: form.get("paymentMethod"),
      momoNumber: form.get("momoNumber"),
      address: form.get("address"),
      notes: form.get("notes"),
      items: cartSummary.items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      totals: {
        subtotal: cartSummary.subtotal,
        delivery: cartSummary.delivery,
        total: cartSummary.total,
      },
    });
    if (ok) location.hash = "/checkout";
  });

  document.querySelector("#signin-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await loginAccount({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (ok) location.hash = "/";
  });

  document.querySelector("#contact-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await sendSupportMessage({
      fullName: form.get("fullName"),
      email: form.get("email"),
      message: form.get("message"),
    });
    if (ok) {
      event.currentTarget.reset();
    }
  });

  document.querySelector("#signup-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));
    if (password !== confirmPassword) {
      setAuthFeedback("passwordMismatch");
      return;
    }
    const ok = await registerAccount({
      fullName: form.get("fullName"),
      email: form.get("email"),
      role: form.get("role"),
      password,
    });
    if (ok) location.hash = "/";
  });

  document.querySelector("#reset-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));
    if (password !== confirmPassword) {
      setAuthFeedback("passwordMismatch");
      return;
    }
    const ok = await resetPassword({
      email: form.get("email"),
      password,
    });
    if (ok) location.hash = "/auth/signin";
  });

  document.querySelector("#google-login")?.addEventListener("click", async () => {
    const ok = await loginWithGoogle();
    if (ok) location.hash = "/";
  });

  if (currentRoute.name === "checkout") {
    clearContactFeedback();
    const paymentMethod = document.querySelector("#payment-method");
    const momoField = document.querySelector("#momo-field");
    const syncMomoField = () => {
      if (paymentMethod && momoField) {
        momoField.style.display = paymentMethod.value === "momo" ? "flex" : "none";
      }
    };

    paymentMethod?.addEventListener("change", syncMomoField);
    syncMomoField();
  }

  if (currentRoute.name !== "checkout") clearCheckoutFeedback();
  if (!["auth", "home"].includes(currentRoute.name)) {
    clearAuthFeedback();
    clearContactFeedback();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
