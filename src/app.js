import { CATEGORY_BACKGROUNDS, LANGUAGES, PAYMENT_METHODS } from "./constants.js";
import { loadCatalog } from "./data.js";
import { t } from "./i18n.js";
import {
  addToCart,
  clearAuthFeedback,
  clearCheckoutFeedback,
  clearContactFeedback,
  completeOrder,
  getState,
  initializeStore,
  loginAccount,
  loginWithGoogle,
  registerAccount,
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

const app = document.querySelector("#app");

window.addEventListener("hashchange", render);
subscribe(() => render());

let lastScrollY = window.scrollY;
window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;
  syncHeaderPanelVisibility(currentScrollY > 8 && currentScrollY > lastScrollY);
  lastScrollY = currentScrollY;
});

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
  syncHeaderPanelVisibility(window.scrollY > 8 && window.scrollY > lastScrollY);
}

function syncHeaderPanelVisibility(hidden) {
  const panel = document.querySelector(".discover-panel");
  if (!panel) return;
  panel.classList.toggle("discover-panel--hidden", hidden);
}

function renderTopbar(state, cartSummary, categories, tr, currentRoute) {
  const authMode = currentRoute.name === "auth";
  return `
    <header class="topbar">
      <div class="topbar__inner">
        <a class="brand brand--lockup" href="#/">
          <img src="./assets/simba-lockup.svg" alt="Simba Supermarket Online Shopping" />
        </a>
        <nav class="main-nav" aria-label="Primary">
          <a class="main-nav__link" href="#/">${tr("navHome")}</a>
          <a class="main-nav__link" href="#about">${tr("navAbout")}</a>
          <a class="main-nav__link" href="#contact">${tr("navContact")}</a>
          <a class="main-nav__link" href="#contact">${tr("navSupport")}</a>
        </nav>
        <div class="topbar__actions">
          <div class="language-switcher">
            <select class="select select--compact" id="theme-select" aria-label="${tr("darkMode")}">
              <option value="light" ${state.theme === "light" ? "selected" : ""}>${tr("themeLight")}</option>
              <option value="dark" ${state.theme === "dark" ? "selected" : ""}>${tr("themeDark")}</option>
            </select>
            <select class="select select--compact" id="language-select" aria-label="${tr("language")}">
              ${LANGUAGES.map(
                (language) =>
                  `<option value="${language}" ${state.language === language ? "selected" : ""}>${language.toUpperCase()}</option>`,
              ).join("")}
            </select>
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

      <section class="section" id="contact">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("navContact")}</h2>
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
  const activeMode = ["signin", "signup", "forgot"].includes(mode) ? mode : "signin";
  const feedback = state.authFeedback ? `<p class="auth-feedback auth-feedback--${state.authFeedback.type}">${tr(`auth_${state.authFeedback.code}`)}</p>` : "";
  const contactFeedback = state.contactFeedback
    ? `<p class="auth-feedback auth-feedback--${state.contactFeedback.type}">${tr(`contact_${state.contactFeedback.code}`)}</p>`
    : "";

  return `
    <main class="auth-layout">
      <section class="auth-card">
        <div class="auth-card__intro">
          <div class="eyebrow">${tr("authEyebrow")}</div>
          <h1>${activeMode === "signup" ? tr("authCreateTitle") : activeMode === "forgot" ? tr("authResetTitle") : tr("authSignInTitle")}</h1>
          <p class="section__lead">${activeMode === "signup" ? tr("authCreateLead") : activeMode === "forgot" ? tr("authResetLead") : tr("authSignInLead")}</p>
          <p class="auth-switch">
            ${
              activeMode === "signup"
                ? `${tr("authHaveAccount")} <a class="auth-inline-link" href="#/auth/signin">${tr("navSignIn")}</a>`
                : `${tr("authNoAccount")} <a class="auth-inline-link" href="#/auth/signup">${tr("authCreateAccount")}</a>`
            }
          </p>
        </div>
        <div class="auth-tabs">
          <a class="auth-tab ${activeMode === "signin" ? "auth-tab--active" : ""}" href="#/auth/signin">${tr("navSignIn")}</a>
          <a class="auth-tab ${activeMode === "signup" ? "auth-tab--active" : ""}" href="#/auth/signup">${tr("navSignUp")}</a>
        </div>
        ${feedback}
        ${
          activeMode === "signup"
            ? `
              <form id="signup-form" class="auth-form">
                <label class="checkout-field"><span>${tr("fullName")}</span><input name="fullName" required /></label>
                <label class="checkout-field"><span>${tr("authEmail")}</span><input name="email" type="email" required /></label>
                <label class="checkout-field"><span>${tr("authRole")}</span><select name="role"><option value="customer">${tr("authRoleCustomer")}</option><option value="admin">${tr("authRoleAdmin")}</option></select></label>
                <label class="checkout-field"><span>${tr("authPassword")}</span><input name="password" type="password" minlength="6" required /></label>
                <label class="checkout-field"><span>${tr("authConfirmPassword")}</span><input name="confirmPassword" type="password" minlength="6" required /></label>
                <button class="button button--primary" type="submit">${tr("authCreateAccount")}</button>
              </form>
            `
            : activeMode === "forgot"
              ? `
                <form id="reset-form" class="auth-form">
                  <label class="checkout-field"><span>${tr("authEmail")}</span><input name="email" type="email" required /></label>
                  <label class="checkout-field"><span>${tr("authNewPassword")}</span><input name="password" type="password" minlength="6" required /></label>
                  <label class="checkout-field"><span>${tr("authConfirmPassword")}</span><input name="confirmPassword" type="password" minlength="6" required /></label>
                  <button class="button button--primary" type="submit">${tr("authResetButton")}</button>
                </form>
              `
              : `
                <form id="signin-form" class="auth-form">
                  <label class="checkout-field"><span>${tr("authEmail")}</span><input name="email" type="email" required /></label>
                  <label class="checkout-field"><span>${tr("authPassword")}</span><input name="password" type="password" minlength="6" required /></label>
                  <label class="auth-remember"><input type="checkbox" name="remember" /> <span>${tr("authRemember")}</span></label>
                  <button class="button button--primary" type="submit">${tr("authSignInButton")}</button>
                  <a class="auth-inline-link" href="#/auth/forgot">${tr("authForgot")}</a>
                </form>
              `
        }
        <button class="auth-google" id="google-login">${tr("authGoogle")}</button>
        <div class="auth-support">
          <h2>${tr("navContact")}</h2>
          <p class="muted">${tr("contactLead")}</p>
          ${contactFeedback}
          <form id="contact-form" class="auth-form">
            <label class="checkout-field"><span>${tr("fullName")}</span><input name="fullName" required /></label>
            <label class="checkout-field"><span>${tr("authEmail")}</span><input name="email" type="email" required /></label>
            <label class="checkout-field"><span>${tr("contactMessage")}</span><textarea name="message" rows="3" required></textarea></label>
            <button class="button button--accent" type="submit">${tr("contactSend")}</button>
          </form>
        </div>
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
            ? cartSummary.items.map((item) => renderCartItem(item)).join("")
            : `<div class="empty-state"><h3>${tr("emptyCart")}</h3><p>${tr("emptyCartText")}</p></div>`
        }
        <div class="summary-card__row"><span>${tr("subtotal")}</span><strong>${formatPrice(cartSummary.subtotal)}</strong></div>
        <div class="summary-card__row"><span>${tr("delivery")}</span><strong>${formatPrice(cartSummary.delivery)}</strong></div>
        <div class="summary-card__row summary-card__total"><span>${tr("total")}</span><strong>${formatPrice(cartSummary.total)}</strong></div>
        <div class="cart-actions">
          <a class="button button--primary" href="#/checkout">${tr("goCheckout")}</a>
          <button class="button button--ghost" id="clear-cart">${tr("continueShopping")}</button>
        </div>
      </div>
    </aside>
  `;
}

function renderCartItem(item) {
  return `
    <div class="cart-item">
      <div class="cart-item__main">
        <div class="cart-item__thumb"><img src="${item.product.image}" alt="${escapeHtml(item.product.name)}" /></div>
        <div class="cart-item__info">
          <div class="cart-item__name">${escapeHtml(item.product.name)}</div>
          <div class="cart-item__price">${formatPrice(item.lineTotal)}</div>
        </div>
        <div class="qty-control">
          <button class="qty-button cart-qty" data-product-id="${item.product.id}" data-delta="-1">-</button>
          <span>${item.quantity}</span>
          <button class="qty-button cart-qty" data-product-id="${item.product.id}" data-delta="1">+</button>
        </div>
      </div>
    </div>
  `;
}

function renderFooter(tr) {
  return `
    <footer class="footer">
      <div class="footer__card">
        <h3>${tr("footerTitle")}</h3>
        <p>${tr("footerText")}</p>
      </div>
      <div class="footer__card">
        <h3>Features</h3>
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
        <h3>Contest Fit</h3>
        <p class="footer__meta">Real dataset, responsive storefront, and public-static deployment ready.</p>
      </div>
    </footer>
  `;
}

function bindEvents(currentRoute) {
  document.querySelector("#search-input")?.addEventListener("input", (event) => setSearch(event.target.value));
  document.querySelector("#category-filter")?.addEventListener("change", (event) => setFilter("category", event.target.value));
  document.querySelector("#price-filter")?.addEventListener("change", (event) => setFilter("price", event.target.value));
  document.querySelector("#stock-filter")?.addEventListener("change", (event) => setFilter("stock", event.target.value));
  document.querySelector("#sort-filter")?.addEventListener("change", (event) => setFilter("sort", event.target.value));
  document.querySelector("#theme-select")?.addEventListener("change", (event) => setTheme(event.target.value));
  document.querySelector("#language-select")?.addEventListener("change", (event) => setLanguage(event.target.value));
  document.querySelector("#cart-toggle")?.addEventListener("click", () => toggleCart(true));
  document.querySelector("#signout-toggle")?.addEventListener("click", () => signOut());
  document.querySelector("#hero-cart")?.addEventListener("click", () => toggleCart(true));
  document.querySelector("#close-cart")?.addEventListener("click", () => toggleCart(false));
  document.querySelector("#clear-cart")?.addEventListener("click", () => toggleCart(false));

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

  document.querySelectorAll('.auth-tab').forEach((link) =>
    link.addEventListener("click", () => clearAuthFeedback()),
  );

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
