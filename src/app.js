import {
  CATEGORY_BACKGROUNDS,
  GOOGLE_CLIENT_ID,
  LANGUAGES,
  PAYMENT_METHODS,
  SHOPPING_ASSISTANT_PROMPT,
  SIMBA_BRANCHES,
  STORAGE_KEYS,
} from "./constants.js";
import { loadCatalog } from "./data.js";
import { t } from "./i18n.js";
import {
  addToCart,
  clearAdminFeedback,
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
  saveProduct,
  sendSupportReply,
  sendSupportMessage,
  setFilter,
  setAuthFeedback,
  setLanguage,
  setSearch,
  setTheme,
  signOut,
  subscribe,
  syncAccountLocation,
  setAssistantMessages,
  toggleCart,
  updateAccountProfile,
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
let hasBoundGlobalEvents = false;
let pendingAdminPanel = "";
let pendingAdminTargetId = "";
let pendingAccountTargetId = "";
let customerNotificationsOpen = false;
let topbarNotificationsOpen = false;
let adminCustomersNotificationsOpen = false;
let adminProductsNotificationsOpen = false;
let searchInputState = null;
let pendingCatalogScroll = false;
let customerLocationState = null; // { lat, lng } when user shares location
let nearestBranchState = null;    // branch object
let locationStatusState = "";     // ""|"locating"|"denied"|"error"
let branchMapInitialized = false;
let discoverPanelHidden = false;
let adminOpenCustomerEmail = ""; // tracks which customer chat is open in admin
let navOpen = false;
let assistantOpen = false;
let assistantInputState = "";
let assistantPending = false;
let checkoutPaymentMethodState = "momo";

window.addEventListener("hashchange", render);
subscribe(() => render());

boot();

async function boot() {
  const payload = await loadCatalog();
  initializeStore(payload);
  const state = getState();
  if (state.currentUser?.lastKnownLocation) {
    customerLocationState = state.currentUser.lastKnownLocation;
    nearestBranchState = state.currentUser.lastNearestBranch || findNearestBranch(customerLocationState.lat, customerLocationState.lng);
  }
  seedAssistantConversation();
  await handleGoogleAuthCallback();
}

function render() {
  captureSearchInputState();
  branchMapInitialized = false;
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
  } else if (currentRoute.name === "clients") {
    view = renderAdminView(state, filteredProducts, tr);
  } else if (currentRoute.name === "account") {
    view = renderAccountView(state, cartSummary, tr);
  } else if (currentRoute.name === "admin") {
    view = renderAdminView(state, filteredProducts, tr);
  } else {
    view = renderHomeView(state, categories, filteredProducts, cartSummary, tr);
  }

  app.innerHTML = `
    ${renderTopbar(state, cartSummary, categories, tr, currentRoute)}
    ${view}
    ${renderAssistantWidget(state, tr, currentRoute)}
    ${state.cartOpen ? `<div class="cart-overlay" id="cart-overlay"></div>` : ""}
    ${state.cartOpen ? renderCart(state, cartSummary, tr) : ""}
  `;

  bindEvents(currentRoute);
  restoreSearchInputState();
  if (discoverPanelHidden) {
    document.querySelector(".discover-panel")?.classList.add("discover-panel--scrolled");
  }
  requestAnimationFrame(() => initBranchesMap());

  if (pendingCatalogScroll) {
    requestAnimationFrame(() => {
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
      pendingCatalogScroll = false;
    });
  }

  if (location.hash && !location.hash.includes("/")) {
    const targetId = location.hash.substring(1);
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth" });
    }
  }
}

function renderTopbar(state, cartSummary, categories, tr, currentRoute) {
  const authMode = currentRoute.name === "auth";
  const isDark = state.theme === "dark";
  const isAdmin = state.isAuthenticated && state.currentUser?.role === "admin";
  const isCustomer = state.isAuthenticated && state.currentUser?.role === "customer";
  const topbarNotifications = isCustomer ? getCustomerNotifications(state, tr) : [];
  const topbarNotificationCount = isCustomer ? getUnreadCustomerNotificationCount(state) : 0;
  const activeLanguage = state.language.toUpperCase();
  return `
    <header class="topbar">
      <div class="topbar__inner">
        <a class="brand brand--lockup" href="#/" data-home-link="true">
          <img src="${BRAND_LOGO}" alt="Simba Supermarket Online Shopping" />
          <div class="brand__text">
            <strong>Simba</strong>
            <span>Super Market</span>
            <span>Online Shop</span>
          </div>
        </a>
        <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Menu" aria-expanded="${navOpen}">
          <span></span><span></span><span></span>
        </button>
        <nav class="main-nav ${navOpen ? "main-nav--open" : ""}" id="main-nav" aria-label="Primary">
          <a class="main-nav__link" href="#/" data-home-link="true">${tr("navHome")}</a>
          ${
            isAdmin
              ? `
                <a class="main-nav__link" href="#/admin" data-admin-nav-target="customers-panel">${tr("adminManageCustomers")}</a>
                <a class="main-nav__link" href="#/admin" data-admin-nav-target="products-panel">${tr("navProducts")}</a>
              `
              : `
                <a class="main-nav__link" href="#branches">${tr("navBranches")}</a>
                <a class="main-nav__link" href="#support">${tr("navSupport")}</a>
                <a class="main-nav__link" href="#about">${tr("navAbout")}</a>
                <a class="main-nav__link" href="#vision">${tr("navVision")}</a>
              `
          }
        </nav>
        <div class="topbar__actions">
          <div class="topbar__utility">
            ${!isAdmin ? `
            <button class="cart-icon-btn" id="cart-toggle" type="button" aria-label="${tr("cart")}">
              &#128722;
              ${cartSummary.count > 0 ? `<span class="notification-count">${cartSummary.count}</span>` : ""}
            </button>
            ` : ""}
            <div class="language-menu">
              <button
                class="control-pill control-pill--tiny language-menu__trigger"
                id="language-toggle"
                type="button"
                aria-haspopup="true"
                aria-expanded="false"
                aria-label="${tr("language")}"
              >
                <span>${activeLanguage}</span>
                <span class="language-menu__caret" aria-hidden="true">&#9662;</span>
              </button>
              <div class="language-menu__list" id="language-list" hidden>
                ${LANGUAGES.map(
                  (language) => `
                    <button
                      class="language-menu__item ${state.language === language ? "language-menu__item--active" : ""}"
                      type="button"
                      data-language="${language}"
                    >
                      ${language.toUpperCase()}
                    </button>
                  `,
                ).join("")}
              </div>
            </div>
            <button
              class="control-pill control-pill--tiny control-pill--toggle"
              id="theme-toggle"
              type="button"
              aria-label="${tr("darkMode")}"
              aria-pressed="${isDark}"
              title="${isDark ? tr("themeDark") : tr("themeLight")}"
            >
              <span class="theme-toggle ${isDark ? "theme-toggle--dark" : ""}" aria-hidden="true">
                <span class="theme-toggle__thumb"></span>
              </span>
            </button>
            ${
              isCustomer
                ? `
                  <button class="control-pill control-pill--tiny control-pill--toggle topbar-notification-btn" id="topbar-notifications-toggle" type="button" aria-label="${tr("customerNotifications")}">
                    <span aria-hidden="true">&#128276;</span>
                    ${topbarNotificationCount > 0 ? `<span class="notification-count">${topbarNotificationCount}</span>` : ""}
                  </button>
                  ${
                    topbarNotificationsOpen
                      ? `
                        <div class="topbar-notification-list">
                          ${renderCustomerNotificationSections(topbarNotifications.slice(0, 8), tr)}
                          <a class="button button--ghost" href="#/account">${tr("customerOpenSettings")}</a>
                        </div>
                      `
                      : ""
                  }
                `
                : ""
            }
          </div>
          <div class="topbar__session">
            ${
              state.isAuthenticated
                ? state.currentUser?.role === "customer"
                  ? `<a class="button button--primary" href="#/account">&#9881; ${tr("customerSettings")}</a>`
                  : `<button class="button button--primary" id="signout-toggle">${tr("navSignOut")}</button>`
                : `<a class="button button--primary" href="#/auth/signin">${tr("navSignIn")}</a>`
            }
          </div>
        </div>
      </div>
      ${
        authMode
          ? ""
          : `<div class="discover-panel">
              <div class="discover-row">
                <label class="searchbar searchbar--inline">
                  <span class="searchbar__icon">&#8981;</span>
                  <input id="search-input" value="${escapeHtml(state.search)}" placeholder="${tr("searchPlaceholder")}" />
                </label>
                <div class="discover-filters">
                  <select class="select select--compact" id="category-filter">
                    <option value="all">${tr("allCategories")}</option>
                    ${categories.map((category) => `<option value="${escapeHtml(category)}" ${state.filters.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
                  </select>
                  <select class="select select--compact" id="price-filter">
                    <option value="all">${tr("allPrices")}</option>
                    <option value="low" ${state.filters.price === "low" ? "selected" : ""}>${tr("budgetLow")}</option>
                    <option value="mid" ${state.filters.price === "mid" ? "selected" : ""}>${tr("budgetMid")}</option>
                    <option value="high" ${state.filters.price === "high" ? "selected" : ""}>${tr("budgetHigh")}</option>
                  </select>
                  <select class="select select--compact" id="stock-filter">
                    <option value="all">${tr("allStock")}</option>
                    <option value="in" ${state.filters.stock === "in" ? "selected" : ""}>${tr("inStock")}</option>
                    <option value="out" ${state.filters.stock === "out" ? "selected" : ""}>${tr("outOfStock")}</option>
                  </select>
                  <select class="select select--compact" id="sort-filter">
                    <option value="featured" ${state.filters.sort === "featured" ? "selected" : ""}>${tr("sortFeatured")}</option>
                    <option value="low" ${state.filters.sort === "low" ? "selected" : ""}>${tr("sortLow")}</option>
                    <option value="high" ${state.filters.sort === "high" ? "selected" : ""}>${tr("sortHigh")}</option>
                  </select>
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
      <section class="hero" id="home">
        <div class="hero__content">
          <div class="hero__grid">
            <div>
              <div class="eyebrow">${tr("heroEyebrow")}</div>
              <h1>${tr("heroTitle")}</h1>
              <p>${tr("heroText")}</p>
              <div class="hero__actions">
                <a class="button button--primary" href="#catalog">${tr("shopNow")}</a>
                ${state.isAuthenticated ? `<button class="button button--ghost" id="hero-cart">${tr("viewCart")}</button>` : `<a class="button button--ghost" href="#/auth/signin">${tr("navSignIn")}</a>`}
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

      <section class="section" id="branches">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("branchesTitle")}</h2>
            <p class="section__lead">${tr("branchesLead")}</p>
          </div>
        </div>
        <div class="branches-panel">
          <div class="branches-top">
            <div id="branches-map" class="branches-map"></div>
            <div class="branches-controls">
              <form id="branch-search-form" class="customer-chat-input-row">
                <input id="branch-location-input" placeholder="${tr("branchesSearchPlaceholder")}" autocomplete="off" />
                <button class="button button--accent" type="submit">&#128269;</button>
              </form>
              <button class="button button--ghost" id="locate-me-btn" type="button">
                &#127759; ${locationStatusState === "locating" ? tr("branchesLocating") : tr("branchesShareLocation")}
              </button>
              ${locationStatusState === "denied" ? `<p class="auth-feedback auth-feedback--error">${tr("branchesLocationDenied")}</p>` : ""}
              ${locationStatusState === "error" ? `<p class="auth-feedback auth-feedback--error">${tr("branchesLocationError")}</p>` : ""}
              ${nearestBranchState ? `
                <div class="banner">
                  <h3>&#128205; ${tr("branchesNearest")}</h3>
                  <p><strong>${escapeHtml(nearestBranchState.name)}</strong></p>
                  <p class="muted">${escapeHtml(nearestBranchState.address)}</p>
                </div>
              ` : ""}
            </div>
          </div>
          <div class="branches-grid">
            ${SIMBA_BRANCHES.map((branch, idx) => {
              const cls = nearestBranchState?.id === branch.id ? "branch-item branch-item--nearest" : "branch-item";
              return `<button class="${cls} branch-focus-btn" type="button" data-branch-idx="${idx}"><strong>${escapeHtml(branch.name)}</strong><span class="muted">${escapeHtml(branch.address)}</span></button>`;
            }).join("")}
          </div>
        </div>
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
  const state = getState();
  return `
    <article class="product-card">
      <div class="product-card__media">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />
      </div>
      <div class="product-card__body">
        <div class="tag-row">
          <span class="pill pill--small">${escapeHtml(product.category)}</span>
          <span class="pill pill--small ${product.inStock ? 'pill--success' : 'pill--warning'}">${product.inStock ? tr("inStock") : tr("outOfStock")}</span>
        </div>
        <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
        <div class="product-card__meta">
          <span class="product-meta">${tr("unit")}: ${escapeHtml(product.unit)}</span>
          <strong class="product-card__price">${formatPrice(product.price)}</strong>
        </div>
        <div class="product-card__actions">
          <a class="button button--ghost button--sm" href="#/product/${product.id}">${tr("details")}</a>
          ${state.isAuthenticated ? `<button class="button button--primary button--sm add-to-cart" data-product-id="${product.id}">${tr("addToCart")}</button>` : `<a class="button button--primary button--sm" href="#/auth/signin">${tr("navSignIn")}</a>`}
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
            ${state.isAuthenticated ? `<button class="button button--primary add-to-cart" data-product-id="${product.id}">${tr("addToCart")}</button>` : `<a class="button button--primary" href="#/auth/signin">${tr("navSignIn")}</a>`}
            ${state.isAuthenticated ? `<button class="button button--accent" id="buy-now" data-product-id="${product.id}">${tr("goCheckout")}</button>` : ""}
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
  const checkoutFeedback = state.checkoutFeedback
    ? `<p class="auth-feedback auth-feedback--${state.checkoutFeedback.type}">${tr(`checkout_${state.checkoutFeedback.code}`)}</p>`
    : "";
  const selectedPaymentMethod = checkoutPaymentMethodState || PAYMENT_METHODS[0];
  const paymentGuide = getCheckoutPaymentGuide(selectedPaymentMethod, tr);
  const lastOrder = state.lastOrder;
  return `
    <main class="checkout-layout">
      <section class="checkout-card">
        <h2>${tr("checkoutTitle")}</h2>
        <p class="section__lead">${tr("checkoutLead")}</p>
        ${checkoutFeedback}
        ${
          state.orderComplete
            ? `
              <div class="banner">
                <h3>${tr("orderPlaced")}</h3>
                <p>${tr("orderPlacedText")}</p>
                ${
                  lastOrder
                    ? `
                      <div class="checkout-success-meta">
                        <div><strong>${escapeHtml(lastOrder.reference)}</strong></div>
                        <div class="muted">${escapeHtml(formatPaymentMethodLabel(lastOrder.paymentMethod, tr))} • ${escapeHtml(formatPaymentStatus(lastOrder.paymentStatus, tr))}</div>
                        <div class="muted">${escapeHtml(lastOrder.paymentReference || "")}</div>
                        ${
                          lastOrder.paymentMeta?.instructions
                            ? `<p class="muted">${escapeHtml(lastOrder.paymentMeta.instructions)}</p>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                <a class="button button--primary" href="#/">${tr("continueShopping")}</a>
              </div>
            `
            : `<form id="checkout-form">
                <div class="checkout-grid">
                  <label class="checkout-field">
                    <span>${tr("fullName")}</span>
                    <input name="fullName" value="${escapeHtml(state.currentUser?.fullName || "")}" required />
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
                        return `<option value="${method}" ${selectedPaymentMethod === method ? "selected" : ""}>${labelMap[method]}</option>`;
                      }).join("")}
                    </select>
                  </label>
                </div>
                <label class="checkout-field" id="momo-field">
                  <span>${tr("momoNumber")}</span>
                  <input name="momoNumber" placeholder="07XXXXXXXX" />
                </label>
                <div class="checkout-grid" id="card-fields">
                  <label class="checkout-field">
                    <span>${tr("cardholderName")}</span>
                    <input name="cardholderName" placeholder="John Simba" />
                  </label>
                  <label class="checkout-field">
                    <span>${tr("cardNumber")}</span>
                    <input name="cardNumber" inputmode="numeric" placeholder="4242 4242 4242 4242" />
                  </label>
                </div>
                <div class="payment-method-panel">
                  <strong>${escapeHtml(paymentGuide.title)}</strong>
                  <p>${escapeHtml(paymentGuide.description)}</p>
                </div>
                <label class="checkout-field">
                  <span>${tr("address")}</span>
                  <textarea name="address" required></textarea>
                </label>
                <label class="checkout-field">
                  <span>${tr("notes")}</span>
                  <textarea name="notes"></textarea>
                </label>
                <div class="checkout-location-row">
                  <button class="button button--ghost" id="checkout-locate-btn" type="button">
                    &#127759; ${customerLocationState ? `&#10003; ${nearestBranchState ? escapeHtml(nearestBranchState.name) : tr("branchesNearest")}` : tr("branchesShareLocation")}
                  </button>
                  ${locationStatusState === "locating" ? `<span class="muted">${tr("branchesLocating")}</span>` : ""}
                  ${locationStatusState === "denied" ? `<p class="auth-feedback auth-feedback--error" style="margin:0">${tr("branchesLocationDenied")}</p>` : ""}
                </div>
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

function renderAssistantWidget(state, tr, currentRoute) {
  if (currentRoute.name === "admin") return "";

  const messages = Array.isArray(state.assistantMessages) ? state.assistantMessages : [];
  const visibleMessages = messages.slice(-8);

  return `
    <div class="assistant-shell ${assistantOpen ? "assistant-shell--open" : ""}">
      ${
        assistantOpen
          ? `
            <section class="assistant-panel" aria-label="${tr("assistantTitle")}">
              <div class="assistant-panel__head">
                <div>
                  <strong>${tr("assistantTitle")}</strong>
                  <p>${tr("assistantLead")}</p>
                </div>
                <button class="button button--ghost button--sm" id="assistant-close" type="button">${tr("close")}</button>
              </div>
              <div class="assistant-panel__messages">
                ${visibleMessages
                  .map(
                    (message) => `
                      <article class="assistant-bubble assistant-bubble--${escapeHtml(message.role || "assistant")}">
                        <strong>${message.role === "user" ? tr("assistantYou") : tr("assistantTitle")}</strong>
                        <p>${escapeHtml(message.text || "")}</p>
                        ${
                          Array.isArray(message.products) && message.products.length
                            ? `
                              <div class="assistant-products">
                                ${message.products
                                  .map(
                                    (product) => `
                                      <button class="assistant-product" type="button" data-assistant-product-id="${product.id}">
                                        <span>${escapeHtml(product.name)}</span>
                                        <strong>${formatPrice(product.price)}</strong>
                                      </button>
                                    `,
                                  )
                                  .join("")}
                              </div>
                            `
                            : ""
                        }
                      </article>
                    `,
                  )
                  .join("")}
              </div>
              <form id="assistant-form" class="assistant-form">
                <input
                  id="assistant-input"
                  name="message"
                  value="${escapeHtml(assistantInputState)}"
                  placeholder="${tr("assistantPlaceholder")}"
                  autocomplete="off"
                  required
                />
                <button class="button button--accent" type="submit">${assistantPending ? tr("assistantThinking") : tr("assistantSend")}</button>
              </form>
            </section>
          `
          : ""
      }
      <button class="assistant-launcher" id="assistant-toggle" type="button">
        <span>${tr("assistantTitle")}</span>
      </button>
    </div>
  `;
}

function formatPaymentMethodLabel(paymentMethod, tr) {
  const map = {
    momo: tr("paymentMomo"),
    card: tr("paymentCard"),
    cash: tr("paymentCash"),
  };
  return map[paymentMethod] || paymentMethod || "Payment";
}

function formatPaymentStatus(paymentStatus, tr) {
  const map = {
    awaiting_momo_confirmation: tr("paymentStatusMomoPending"),
    card_authorized: tr("paymentStatusCardAuthorized"),
    pay_on_delivery: tr("paymentStatusCash"),
    pending: tr("paymentStatusPending"),
  };
  return map[paymentStatus] || paymentStatus || tr("paymentStatusPending");
}

function getCheckoutPaymentGuide(paymentMethod, tr) {
  if (paymentMethod === "card") {
    return {
      title: tr("paymentCardGuideTitle"),
      description: tr("paymentCardGuideText"),
    };
  }
  if (paymentMethod === "cash") {
    return {
      title: tr("paymentCashGuideTitle"),
      description: tr("paymentCashGuideText"),
    };
  }
  return {
    title: tr("paymentMomoGuideTitle"),
    description: tr("paymentMomoGuideText"),
  };
}

function seedAssistantConversation() {
  const state = getState();
  if (Array.isArray(state.assistantMessages) && state.assistantMessages.length) return;

  setAssistantMessages([
    {
      id: Date.now(),
      role: "assistant",
      text: SHOPPING_ASSISTANT_PROMPT.includes("quickly")
        ? "Ask me for products, categories, budget-friendly picks, or quick meal ideas from the Simba catalog."
        : "Ask me about Simba products.",
      products: [],
    },
  ]);
}

function normalizeAssistantToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreAssistantProduct(product, query, intentCategories) {
  const normalizedName = normalizeAssistantToken(product.name);
  const normalizedCategory = normalizeAssistantToken(product.category);
  const tokens = query.split(" ").filter(Boolean);
  let score = 0;

  if (normalizedName.includes(query)) score += 8;
  if (normalizedCategory.includes(query)) score += 6;
  for (const token of tokens) {
    if (normalizedName.includes(token)) score += 3;
    if (normalizedCategory.includes(token)) score += 2;
  }
  if (intentCategories.has(product.category)) score += 5;
  if (product.inStock) score += 1;

  return score;
}

function inferAssistantCategories(query, categories) {
  const intentMap = {
    breakfast: ["Food Products"],
    lunch: ["Food Products"],
    dinner: ["Food Products"],
    snack: ["Food Products"],
    juice: ["Food Products"],
    baby: ["Baby Products"],
    cosmetic: ["Cosmetics & Personal Care"],
    beauty: ["Cosmetics & Personal Care"],
    sport: ["Sports & Wellness"],
    wellness: ["Sports & Wellness"],
    kitchen: ["Kitchenware & Electronics"],
    electronic: ["Kitchenware & Electronics"],
    alcohol: ["Alcoholic Drinks"],
    drink: ["Alcoholic Drinks", "Food Products"],
  };

  const inferred = new Set();
  for (const [token, mappedCategories] of Object.entries(intentMap)) {
    if (query.includes(token)) {
      mappedCategories.forEach((category) => inferred.add(category));
    }
  }

  categories.forEach((category) => {
    const normalizedCategory = normalizeAssistantToken(category);
    if (normalizedCategory && query.includes(normalizedCategory)) {
      inferred.add(category);
    }
  });

  return inferred;
}

function buildAssistantReply(state, rawQuery, tr) {
  const query = normalizeAssistantToken(rawQuery);
  const categories = getCategories(state.products);
  const intentCategories = inferAssistantCategories(query, categories);
  const scoredProducts = state.products
    .map((product) => ({
      product,
      score: scoreAssistantProduct(product, query, intentCategories),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.product.inStock) - Number(a.product.inStock) || a.product.price - b.product.price)
    .slice(0, 5)
    .map((entry) => entry.product);

  if (!scoredProducts.length) {
    const categoryPreview = categories.slice(0, 4).join(", ");
    return {
      text: `${tr("assistantNoMatch")} ${categoryPreview}.`,
      products: [],
    };
  }

  const broadQuery = query.split(" ").length <= 2 && !state.products.some((product) => normalizeAssistantToken(product.name).includes(query));
  const intro = broadQuery ? tr("assistantBroadReply") : tr("assistantDirectReply");
  return {
    text: `${intro} ${scoredProducts.map((product) => product.name).slice(0, 3).join(", ")}.`,
    products: scoredProducts,
  };
}

function renderAccountView(state, cartSummary, tr) {
  if (!state.isAuthenticated) {
    return `
      <main class="auth-layout">
        <section class="auth-panel">
          <div class="banner">
            <h3>${tr("authSignInTitle")}</h3>
            <p>${tr("accountSigninRequired")}</p>
            <a class="button button--primary" href="#/auth/signin">${tr("navSignIn")}</a>
          </div>
        </section>
      </main>
    `;
  }

  const latestOrder = state.lastOrder;
  const currentUserEmail = String(state.currentUser?.email || "").toLowerCase();
  const currentUserName = String(state.currentUser?.fullName || "").trim().toLowerCase();
  const customerOrders = state.orders
    .filter((order) => {
      const orderEmail = String(order.customer?.email || "").toLowerCase();
      const orderName = String(order.customer?.fullName || "").trim().toLowerCase();
      if (!currentUserEmail) return false;
      return orderEmail === currentUserEmail || (!orderEmail && orderName === currentUserName);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const customerNotifications = getCustomerNotifications(state, tr);
  const notificationCount = getUnreadCustomerNotificationCount(state);
  const customerMessages = (state.messages || [])
    .filter((message) => String(message.email || "").toLowerCase() === currentUserEmail)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const accountFeedbackSource = state.adminFeedback || state.authFeedback;
  const adminFeedback = accountFeedbackSource
    ? `<p class="auth-feedback auth-feedback--${accountFeedbackSource.type}">${tr(`${state.adminFeedback ? "admin" : "auth"}_${accountFeedbackSource.code}`)}</p>`
    : "";

  return `
    <main class="auth-layout auth-layout--wide">
      <section class="auth-panel">
        <div class="auth-panel__intro">
          <div class="eyebrow">${tr("accountDashboard")}</div>
          <h1>${escapeHtml(state.currentUser?.fullName || tr("accountDashboard"))}</h1>
          <p class="section__lead">${tr("customerDashboardLead")}</p>
        </div>
        <div class="feature-grid">
          <article class="feature-card">
            <h3>${tr("authEmail")}</h3>
            <p>${escapeHtml(state.currentUser?.email || "-")}</p>
          </article>
          <article class="feature-card">
            <h3>${tr("authRole")}</h3>
            <p>${escapeHtml(state.currentUser?.role || "customer")}</p>
          </article>
          <article class="feature-card">
            <h3>${tr("cart")}</h3>
            <p>${cartSummary.count} ${tr("cartCount")}</p>
            <button class="button button--primary" id="account-open-cart" type="button" style="margin-top:0.5rem">&#128722; ${tr("viewCart")}</button>
          </article>
          ${
            state.currentUser?.role === "customer"
              ? `
                <article class="feature-card">
                  <div class="account-notification-row">
                    <h3>${tr("customerNotifications")}</h3>
                    <button class="icon-button account-notification-bell" id="customer-notifications-toggle" type="button" aria-label="${tr("customerNotifications")}">
                      <span aria-hidden="true">&#128276;</span>
                      ${notificationCount > 0 ? `<span class="notification-count">${notificationCount}</span>` : ""}
                    </button>
                  </div>
                  <p>${notificationCount > 0 ? `${notificationCount} ${tr("customerNotificationsPending")}` : tr("customerNotificationsEmpty")}</p>
                  ${
                    customerNotificationsOpen
                      ? `
                        <div class="account-notification-list">
                          ${renderCustomerNotificationSections(customerNotifications, tr)}
                        </div>
                      `
                      : ""
                  }
                </article>
              `
              : ""
          }
        </div>
        ${
          state.currentUser?.role === "admin"
            ? `
              ${adminFeedback}
              <form id="admin-profile-form" class="auth-form admin-form">
                <label class="checkout-field"><span>${tr("fullName")}</span><input name="fullName" value="${escapeHtml(state.currentUser?.fullName || "")}" required /></label>
                <label class="checkout-field"><span>${tr("authEmail")}</span><input value="${escapeHtml(state.currentUser?.email || "")}" disabled /></label>
                <label class="checkout-field"><span>${tr("authNewPassword")}</span><input name="password" type="password" minlength="6" /></label>
                <label class="checkout-field"><span>${tr("authConfirmPassword")}</span><input name="confirmPassword" type="password" minlength="6" /></label>
                <button class="button button--primary" type="submit">${tr("saveAdminProfile")}</button>
              </form>
            `
            : ""
        }
        ${
          state.currentUser?.role === "customer"
            ? `
              ${adminFeedback}
              <section class="summary-card">
                <h3>${tr("customerSettings")}</h3>
                <form id="customer-profile-form" class="auth-form admin-form">
                  <label class="checkout-field"><span>${tr("fullName")}</span><input name="fullName" value="${escapeHtml(state.currentUser?.fullName || "")}" required /></label>
                  <label class="checkout-field"><span>${tr("authEmail")}</span><input value="${escapeHtml(state.currentUser?.email || "")}" disabled /></label>
                  <label class="checkout-field"><span>${tr("authNewPassword")}</span><input name="password" type="password" minlength="6" /></label>
                  <label class="checkout-field"><span>${tr("authConfirmPassword")}</span><input name="confirmPassword" type="password" minlength="6" /></label>
                  <div class="detail-actions">
                    <button class="button button--primary" type="submit">${tr("customerUpdateProfile")}</button>
                    <button class="button button--ghost" id="account-signout" type="button">${tr("navSignOut")}</button>
                  </div>
                </form>
              </section>
            `
            : ""
        }
        ${
          state.currentUser?.role === "customer"
            ? `
              <section class="summary-card">
                <h3>${tr("customerOrderHistory")}</h3>
                <div class="admin-activity-list">
                  ${
                    customerOrders.length
                      ? customerOrders
                          .map(
                            (order) => `
                              <div class="summary-card history-card">
                                <div class="summary-card__row">
                                  <span>
                                    ${escapeHtml(order.reference)}
                                    <br />
                                    <span class="muted">${new Date(order.createdAt).toLocaleString()} • ${escapeHtml(order.paymentStatus || "pending")}</span>
                                  </span>
                                  <strong>${formatPrice(order.totals?.total || 0)}</strong>
                                </div>
                                <div class="order-history-items">
                                  ${(order.items || [])
                                    .map((item) => {
                                      const qty = Number(item.quantity || 1);
                                      const lineTotal = Number(item.lineTotal || 0);
                                      const unitPrice = qty > 0 ? lineTotal / qty : lineTotal;
                                      return `
                                      <div class="summary-card__row">
                                        <span>${escapeHtml(item.name)} x${qty}</span>
                                        <strong>${formatPrice(unitPrice)} (${tr("priceLabel")})</strong>
                                      </div>
                                      `;
                                    })
                                    .join("")}
                                </div>
                                <div class="summary-card__row">
                                  <span>${escapeHtml(formatPaymentMethodLabel(order.paymentMethod, tr))}</span>
                                  <strong>${escapeHtml(formatPaymentStatus(order.paymentStatus, tr))}</strong>
                                </div>
                              </div>
                            `,
                          )
                          .join("")
                      : `<p>${tr("noOrdersYet")}</p>`
                  }
                </div>
              </section>
              <section class="summary-card" id="customer-chatbox">
                <h3>${tr("customerChatboxTitle")}</h3>
                <p class="muted">${tr("customerChatboxLead")}</p>
                <div class="admin-activity-list">
                  ${
                    customerMessages.length
                      ? customerMessages
                          .map(
                            (message) => `
                              <div class="admin-message-card">
                                <div class="admin-message-card__head">
                                  <strong>${tr("customerYouLabel")}</strong>
                                  <span class="muted">${new Date(message.createdAt).toLocaleString()}</span>
                                </div>
                                <p>${escapeHtml(message.message)}</p>
                                <div class="admin-replies">
                                  ${(Array.isArray(message.replies) ? message.replies : [])
                                    .map(
                                      (reply) => `
                                        <div class="admin-reply-item">
                                          <strong>${escapeHtml(reply.by)}</strong>
                                          <span class="muted">${new Date(reply.createdAt).toLocaleString()}</span>
                                          <p>${escapeHtml(reply.text)}</p>
                                        </div>
                                      `,
                                    )
                                    .join("")}
                                </div>
                              </div>
                            `,
                          )
                          .join("")
                      : `<p>${tr("adminNoMessages")}</p>`
                  }
                </div>
                <form id="customer-chat-form" class="auth-form" style="margin-top:0.75rem">
                  <div class="customer-chat-input-row">
                    <input name="message" class="checkout-field__input" placeholder="${tr("customerChatPlaceholder")}" required autocomplete="off" />
                    <button class="button button--accent" type="submit">${tr("customerChatSend")}</button>
                  </div>
                </form>
              </section>
            `
            : latestOrder
            ? `
              <div class="banner">
                <h3>${tr("latestOrder")}</h3>
                <p>${escapeHtml(latestOrder.reference)} • ${formatPrice(latestOrder.totals.total)}</p>
              </div>
            `
            : `<div class="banner"><h3>${tr("latestOrder")}</h3><p>${tr("noOrdersYet")}</p></div>`
        }
      </section>
    </main>
  `;
}

function renderAdminView(state, filteredProducts, tr) {
  if (!state.isAuthenticated || state.currentUser?.role !== "admin") {
    return `
      <main class="auth-layout">
        <section class="auth-panel">
          <div class="banner">
            <h3>${tr("adminDashboard")}</h3>
            <p>${tr("adminSigninRequired")}</p>
            <a class="button button--primary" href="#/auth/signin">${tr("adminLogin")}</a>
          </div>
        </section>
      </main>
    `;
  }

  const feedback = state.adminFeedback
    ? `<p class="auth-feedback auth-feedback--${state.adminFeedback.type}">${tr(`admin_${state.adminFeedback.code}`)}</p>`
    : "";
  const visibleProducts = filteredProducts.slice(0, 24);
  const customers = state.users.filter((user) => user.role === "customer");
  const recentOrders = state.orders.slice(0, 8);
  const recentMessages = (state.messages || []).slice(0, 12);
  const adminNotifications = getAdminNotifications(state, tr);
  const customerNotificationCount = adminNotifications.customerMessages.length;
  const productNotificationCount = adminNotifications.productUpdates.length;

  return `
    <main class="section admin-layout">
      <section class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("adminDashboard")}</h2>
            <p class="section__lead">${tr("adminDashboardLead")}</p>
          </div>
          <span class="pill">${visibleProducts.length} ${tr("filterResults")}</span>
        </div>
        ${feedback}
        <div class="admin-subnav">
          <button class="button button--ghost admin-notification-toggle" type="button" data-admin-notification-type="customers" data-admin-nav-target="customers-panel">
            ${tr("adminManageCustomers")}
            ${customerNotificationCount > 0 ? `<span class="notification-count">${customerNotificationCount}</span>` : ""}
          </button>
          <button class="button button--ghost admin-notification-toggle" type="button" data-admin-notification-type="products" data-admin-nav-target="products-panel">
            ${tr("navProducts")}
            ${productNotificationCount > 0 ? `<span class="notification-count">${productNotificationCount}</span>` : ""}
          </button>
          <a class="button button--ghost" href="#/admin" data-admin-nav-target="customers-panel">${tr("adminOpenCustomersPanel")}</a>
          <a class="button button--ghost" href="#/admin" data-admin-nav-target="products-panel">${tr("adminOpenProductsPanel")}</a>
        </div>
        ${
          adminCustomersNotificationsOpen
            ? `
              <div class="admin-notification-list">
                ${
                  adminNotifications.customerMessages.length
                    ? adminNotifications.customerMessages
                        .map(
                          (entry) => `
                            <button class="admin-notification-item" type="button" data-admin-notification-target="admin-message-${entry.id}" data-admin-nav-target="customers-panel">
                              <strong>${escapeHtml(entry.title)}</strong>
                              <span>${escapeHtml(entry.text)}</span>
                            </button>
                          `,
                        )
                        .join("")
                    : `<p class="muted">${tr("adminNoNewCustomerMessages")}</p>`
                }
              </div>
            `
            : ""
        }
        ${
          adminProductsNotificationsOpen
            ? `
              <div class="admin-notification-list">
                ${
                  adminNotifications.productUpdates.length
                    ? adminNotifications.productUpdates
                        .map(
                          (entry) => `
                            <button class="admin-notification-item" type="button" data-admin-notification-target="admin-product-${entry.id}" data-admin-nav-target="products-panel">
                              <strong>${escapeHtml(entry.title)}</strong>
                              <span>${escapeHtml(entry.text)}</span>
                            </button>
                          `,
                        )
                        .join("")
                    : `<p class="muted">${tr("adminNoNewProductUpdates")}</p>`
                }
              </div>
            `
            : ""
        }
        <div class="feature-grid">
          <article class="feature-card">
            <h3>${tr("statProducts")}</h3>
            <p>${state.products.length}</p>
          </article>
          <article class="feature-card">
            <h3>${tr("cart")}</h3>
            <p>${state.cart.length}</p>
          </article>
          <article class="feature-card">
            <h3>${tr("authEmail")}</h3>
            <p>${escapeHtml(state.currentUser.email)}</p>
          </article>
          <article class="feature-card">
            <h3>${tr("adminCustomersCount")}</h3>
            <p>${customers.length}</p>
          </article>
        </div>
      </section>
      <section class="admin-grid" id="products-panel">
        <article class="summary-card">
          <h3>${tr("addProduct")}</h3>
          <form id="admin-product-form" class="auth-form admin-form">
            <label class="checkout-field"><span>${tr("productName")}</span><input name="name" required /></label>
            <label class="checkout-field"><span>${tr("category")}</span><input name="category" required /></label>
            <label class="checkout-field"><span>${tr("unit")}</span><input name="unit" value="Pcs" required /></label>
            <label class="checkout-field"><span>${tr("priceLabel")}</span><input name="price" type="number" min="0" step="1" required /></label>
            <label class="checkout-field"><span>${tr("imageUrl")}</span><input name="image" type="url" placeholder="https://..." /></label>
            <label class="auth-remember"><input name="inStock" type="checkbox" checked /> <span>${tr("inStock")}</span></label>
            <button class="button button--primary" type="submit">${tr("saveProductButton")}</button>
          </form>
        </article>
        <article class="summary-card">
          <h3>${tr("editPrices")}</h3>
          <div class="admin-product-list">
            ${visibleProducts.map((product) => renderAdminProductEditor(product, tr)).join("")}
          </div>
        </article>
      </section>
      <section class="admin-grid" id="customers-panel">
        <article class="summary-card">
          <h3>${tr("adminManageCustomers")}</h3>
          <div class="admin-activity-list">
            ${
              customers.length
                ? customers.map((customer) => {
                    const isOpen = adminOpenCustomerEmail === customer.email;
                    const customerMsgs = (state.messages || []).filter(
                      (m) => String(m.email || "").toLowerCase() === customer.email.toLowerCase()
                    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    return `
                      <div class="admin-customer-row">
                        <button class="admin-customer-toggle" type="button" data-customer-email="${escapeHtml(customer.email)}">
                          <span>
                            <strong>${escapeHtml(customer.fullName || "-")}</strong>
                            <span class="muted">${escapeHtml(customer.email)}</span>
                          </span>
                          <span>
                            <span class="pill">${customerMsgs.length}</span>
                          </span>
                        </button>
                        ${isOpen ? `
                          <div class="admin-customer-chat">
                            <div class="admin-customer-chat__messages">
                              ${customerMsgs.length ? customerMsgs.map((msg) => `
                                <div class="admin-message-card" id="admin-message-${msg.id}">
                                  <div class="admin-message-card__head">
                                    <strong>${escapeHtml(msg.fullName)}</strong>
                                    <span class="muted">${new Date(msg.createdAt).toLocaleString()}</span>
                                  </div>
                                  <p>${escapeHtml(msg.message)}</p>
                                  <div class="admin-replies">
                                    ${(Array.isArray(msg.replies) ? msg.replies : []).map((reply) => `
                                      <div class="admin-reply-item">
                                        <strong>${escapeHtml(reply.by)}</strong>
                                        <span class="muted">${new Date(reply.createdAt).toLocaleString()}</span>
                                        <p>${escapeHtml(reply.text)}</p>
                                      </div>
                                    `).join("")}
                                  </div>
                                  <form class="admin-reply-form" data-message-id="${msg.id}">
                                    <div class="customer-chat-input-row">
                                      <input name="reply" placeholder="${tr("adminReplyPlaceholder")}" required autocomplete="off" />
                                      <button class="button button--accent" type="submit">${tr("adminReplySend")}</button>
                                    </div>
                                  </form>
                                </div>
                              `).join("") : `<p class="muted">${tr("adminNoMessages")}</p>`}
                            </div>
                          </div>
                        ` : ""}
                      </div>
                    `;
                  }).join("")
                : `<p>${tr("adminNoCustomers")}</p>`
            }
          </div>
        </article>
        <article class="summary-card">
          <h3>${tr("adminOrdersMap")}</h3>
          <div class="admin-activity-list">
            ${
              recentOrders.length
                ? recentOrders
                    .map(
                      (order) => `
                        <div class="admin-order-card">
                          <div class="admin-order-header">
                            <div>
                              <strong>${escapeHtml(order.customer.fullName)}</strong>
                              <div class="admin-order-meta">${escapeHtml(order.reference)} • ${escapeHtml(order.paymentStatus)}</div>
                            </div>
                            <strong class="admin-order-total">${formatPrice(order.totals.total)}</strong>
                          </div>
                          <div class="admin-order-details">
                            ${order.customer.nearestBranch ? `<div class="admin-order-branch">📍 ${escapeHtml(order.customer.nearestBranch.name)}</div>` : ""}
                            ${order.customer.location ? `<div class="admin-order-location">🌍 ${order.customer.location.lat.toFixed(4)}, ${order.customer.location.lng.toFixed(4)}</div>` : ""}
                            <div class="admin-order-address">📮 ${escapeHtml(order.customer.address || 'No address provided')}</div>
                            <div class="admin-order-phone">📞 ${escapeHtml(order.customer.phone || 'No phone provided')}</div>
                          </div>
                        </div>
                      `,
                    )
                    .join("")
                : `<div class="empty-orders-state">
                    <p>${tr("noOrdersYet")}</p>
                    <p class="muted">${tr("adminOrdersMapHint")}</p>
                  </div>`
            }
          </div>
          <div class="admin-orders-map-container">
            <div id="admin-orders-map" class="branches-map admin-orders-map"></div>
            ${
              recentOrders.length === 0
                ? `<div class="map-overlay">${tr("adminOrdersMapEmpty")}</div>`
                : recentOrders.some((order) => resolveOrderMapLocation(order))
                  ? ""
                  : `<div class="map-overlay">${tr("adminOrdersMapHint")}</div>`
            }
          </div>
        </article>
      </section>
    </main>
  `;
}

function renderAdminProductEditor(product, tr) {
  return `
    <form class="admin-price-form" id="admin-product-${product.id}" data-product-id="${product.id}">
      <div class="admin-product-list__head">
        <div class="admin-product-info">
          <strong class="admin-product-name">${escapeHtml(product.name)}</strong>
          <div class="admin-product-meta">${escapeHtml(product.category)} • ${escapeHtml(product.unit)}</div>
        </div>
        <a class="button button--ghost button--sm" href="#/product/${product.id}">${tr("details")}</a>
      </div>
      <div class="admin-price-form__fields">
        <label class="checkout-field checkout-field--compact">
          <span>${tr("priceLabel")}</span>
          <input name="price" type="number" min="0" step="1" value="${Number(product.price)}" required />
        </label>
        <label class="checkout-field checkout-field--compact">
          <span>${tr("imageUrl")}</span>
          <input name="image" type="url" value="${escapeHtml(product.image || '')}" placeholder="https://..." />
        </label>
        <label class="auth-remember"><input name="inStock" type="checkbox" ${product.inStock ? "checked" : ""} /> <span>${tr("inStock")}</span></label>
        <button class="button button--primary button--sm" type="submit">${tr("updatePrice")}</button>
      </div>
    </form>
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
          <label class="checkout-field"><span>${tr("authEmail")}</span><input name="email" type="email" autocomplete="email" required /></label>
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
  if (!hasBoundGlobalEvents) {
    let lastScrollY = window.scrollY;
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const shouldHide = currentY > lastScrollY && currentY > 80;
        if (shouldHide !== discoverPanelHidden) {
          discoverPanelHidden = shouldHide;
          const panel = document.querySelector(".discover-panel");
          if (panel) panel.classList.toggle("discover-panel--scrolled", discoverPanelHidden);
        }
        lastScrollY = currentY;
        ticking = false;
      });
    }, { passive: true });

    document.addEventListener("click", (event) => {
      const languageToggle = document.querySelector("#language-toggle");
      const languageList = document.querySelector("#language-list");
      if (!languageToggle || !languageList || languageList.hidden) return;
      if (languageToggle.contains(event.target) || languageList.contains(event.target)) return;
      languageList.hidden = true;
      languageToggle.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("click", (event) => {
      const toggle = document.querySelector("#topbar-notifications-toggle");
      const list = document.querySelector(".topbar-notification-list");
      if (!toggle || !list || !topbarNotificationsOpen) return;
      if (toggle.contains(event.target) || list.contains(event.target)) return;
      topbarNotificationsOpen = false;
      render();
    }, true);
    hasBoundGlobalEvents = true;
  }

  document.querySelector("#search-input")?.addEventListener("input", (event) => setSearch(event.target.value));
  document.querySelector("#search-input")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const nextValue = event.currentTarget.value;
    pendingCatalogScroll = true;
    setSearch(nextValue);
    if (location.hash !== "#catalog") {
      location.hash = "catalog";
    }
  });
  document.querySelector("#category-filter")?.addEventListener("change", (event) => setFilter("category", event.target.value));
  document.querySelector("#price-filter")?.addEventListener("change", (event) => setFilter("price", event.target.value));
  document.querySelector("#stock-filter")?.addEventListener("change", (event) => setFilter("stock", event.target.value));
  document.querySelector("#sort-filter")?.addEventListener("change", (event) => setFilter("sort", event.target.value));
  document.querySelector("#theme-toggle")?.addEventListener("click", () => {
    const nextTheme = getState().theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });
  const languageToggle = document.querySelector("#language-toggle");
  const languageList = document.querySelector("#language-list");
  languageToggle?.addEventListener("click", () => {
    if (!languageList) return;
    const isOpen = !languageList.hidden;
    languageList.hidden = isOpen;
    languageToggle.setAttribute("aria-expanded", String(!isOpen));
  });
  document.querySelectorAll(".language-menu__item").forEach((button) =>
    button.addEventListener("click", () => {
      setLanguage(button.dataset.language);
      if (languageList) languageList.hidden = true;
      languageToggle?.setAttribute("aria-expanded", "false");
    }),
  );
  document.querySelector("#cart-toggle")?.addEventListener("click", () => toggleCart(true));
  document.querySelector("#assistant-toggle")?.addEventListener("click", () => {
    assistantOpen = !assistantOpen;
    render();
  });
  document.querySelector("#assistant-close")?.addEventListener("click", () => {
    assistantOpen = false;
    render();
  });
  document.querySelector("#assistant-input")?.addEventListener("input", (event) => {
    assistantInputState = event.target.value;
  });
  document.querySelector("#nav-hamburger")?.addEventListener("click", () => {
    navOpen = !navOpen;
    render();
  });
  document.querySelectorAll(".main-nav__link").forEach((link) =>
    link.addEventListener("click", () => { navOpen = false; })
  );
  document.querySelectorAll("[data-home-link='true']").forEach((link) =>
    link.addEventListener("click", (event) => {
      event.preventDefault();
      location.hash = "/";
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
    }),
  );
  document.querySelectorAll("[data-admin-nav-target]").forEach((link) =>
    link.addEventListener("click", () => {
      pendingAdminPanel = link.dataset.adminNavTarget || "";
      pendingAdminTargetId = "";
      if (route().name === "admin" && pendingAdminPanel) {
        requestAnimationFrame(() => {
          document.getElementById(pendingAdminPanel)?.scrollIntoView({ behavior: "smooth", block: "start" });
          pendingAdminPanel = "";
        });
      }
    }),
  );
  document.querySelectorAll("[data-admin-notification-target]").forEach((button) =>
    button.addEventListener("click", () => {
      pendingAdminPanel = button.dataset.adminNavTarget || "";
      pendingAdminTargetId = button.dataset.adminNotificationTarget || "";
      if (route().name === "admin") {
        requestAnimationFrame(() => {
          document.getElementById(pendingAdminPanel)?.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            document.getElementById(pendingAdminTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
            pendingAdminTargetId = "";
          }, 120);
          pendingAdminPanel = "";
        });
      } else {
        location.hash = "/admin";
      }
    }),
  );
  document.querySelectorAll(".admin-notification-toggle").forEach((button) =>
    button.addEventListener("click", () => {
      const type = button.dataset.adminNotificationType;
      if (type === "customers") {
        adminCustomersNotificationsOpen = !adminCustomersNotificationsOpen;
        if (adminCustomersNotificationsOpen) markAdminNotificationsSeen("customerMessages");
      }
      if (type === "products") {
        adminProductsNotificationsOpen = !adminProductsNotificationsOpen;
        if (adminProductsNotificationsOpen) markAdminNotificationsSeen("productUpdates");
      }
      render();
    }),
  );
  document.querySelectorAll("[data-notification-hash]").forEach((button) =>
    button.addEventListener("click", () => {
      const targetHash = String(button.dataset.notificationHash || "/account");
      pendingAccountTargetId = String(button.dataset.accountTarget || "");
      customerNotificationsOpen = false;
      topbarNotificationsOpen = false;
      markCustomerNotificationSeen(getState().currentUser?.email, button.dataset.notificationId);
      location.hash = targetHash.startsWith("/") ? targetHash : `/${targetHash.replace(/^#?\/?/, "")}`;
    }),
  );
  document.querySelector("#signout-toggle")?.addEventListener("click", () => {
    signOut();
    adminCustomersNotificationsOpen = false;
    adminProductsNotificationsOpen = false;
    location.hash = "/";
  });
  document.querySelector("#account-signout")?.addEventListener("click", () => {
    signOut();
    customerNotificationsOpen = false;
    topbarNotificationsOpen = false;
    adminCustomersNotificationsOpen = false;
    adminProductsNotificationsOpen = false;
    location.hash = "/";
  });
  document.querySelector("#cart-overlay")?.addEventListener("click", () => toggleCart(false));
  document.querySelector("#hero-cart")?.addEventListener("click", () => toggleCart(true));
  document.querySelector("#close-cart")?.addEventListener("click", () => toggleCart(false));
  document.querySelector("#clear-cart")?.addEventListener("click", () => clearCart());

  document.querySelectorAll(".add-to-cart").forEach((button) =>
    button.addEventListener("click", () => {
      if (!getState().isAuthenticated) {
        location.hash = "/auth/signin";
        return;
      }
      addToCart(Number(button.dataset.productId));
    }),
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
    if (!getState().isAuthenticated) {
      location.hash = "/auth/signin";
      return;
    }
    addToCart(Number(event.currentTarget.dataset.productId));
    location.hash = "/checkout";
  });

  document.querySelector("#checkout-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const state = getState();
    const cartSummary = summarizeCart(state.products, state.cart);
    
    // Validate required fields
    const fullName = form.get("fullName");
    const phone = form.get("phone");
    const district = form.get("district");
    const address = form.get("address");
    
    if (!fullName || !phone || !district || !address) {
      alert("Please fill in all required fields including delivery address.");
      return;
    }
    
    const ok = await completeOrder({
      fullName,
      phone,
      district,
      paymentMethod: form.get("paymentMethod"),
      momoNumber: form.get("momoNumber"),
      cardholderName: form.get("cardholderName"),
      cardNumber: form.get("cardNumber"),
      address,
      notes: form.get("notes"),
      customerEmail: getState().currentUser?.email || "",
      customerLocation: customerLocationState,
      nearestBranch: nearestBranchState,
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
    const portal = "";
    const ok = await loginAccount({
      email: form.get("email"),
      password: form.get("password"),
      portal,
    });
    if (ok) {
      const role = getState().currentUser?.role;
      location.hash = role === "admin" ? "/admin" : "/";
    }
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
    startGoogleRedirect();
  });

  document.querySelector("#admin-profile-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password && password !== confirmPassword) {
      setAuthFeedback("passwordMismatch");
      return;
    }

    const ok = await updateAccountProfile({
      email: getState().currentUser?.email,
      fullName: form.get("fullName"),
      password,
    });
    if (ok) {
      event.currentTarget.reset();
      location.hash = "/account";
    }
  });
  document.querySelector("#customer-profile-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password && password !== confirmPassword) {
      setAuthFeedback("passwordMismatch");
      return;
    }

    const ok = await updateAccountProfile({
      email: getState().currentUser?.email,
      fullName: form.get("fullName"),
      password,
    });
    if (ok) {
      location.hash = "/account";
    }
  });

  document.querySelector("#admin-product-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = saveProduct({
      name: form.get("name"),
      category: form.get("category"),
      unit: form.get("unit"),
      price: form.get("price"),
      image: form.get("image"),
      inStock: form.get("inStock"),
    });
    if (ok) {
      event.currentTarget.reset();
    }
  });

  document.querySelectorAll(".admin-price-form").forEach((formElement) =>
    formElement.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      saveProduct({
        id: Number(event.currentTarget.dataset.productId),
        price: form.get("price"),
        image: form.get("image"),
        inStock: form.get("inStock"),
      });
    }),
  );

  document.querySelectorAll(".admin-reply-form").forEach((formElement) =>
    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const ok = await sendSupportReply({
        messageId: Number(event.currentTarget.dataset.messageId),
        reply: form.get("reply"),
      });
      if (ok) {
        event.currentTarget.reset();
      }
    }),
  );

  document.querySelector("#customer-chat-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const state = getState();
    const ok = await sendSupportMessage({
      fullName: state.currentUser?.fullName || "Customer",
      email: state.currentUser?.email || "",
      message: form.get("message"),
    });
    if (ok) {
      event.currentTarget.reset();
      requestAnimationFrame(() => {
        document.getElementById("customer-chatbox")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  });

  document.querySelector("#assistant-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") || "").trim();
    if (!message) return;

    assistantPending = true;
    assistantInputState = "";
    const state = getState();
    const nextMessages = [
      ...(Array.isArray(state.assistantMessages) ? state.assistantMessages : []),
      { id: Date.now(), role: "user", text: message, products: [] },
    ];
    setAssistantMessages(nextMessages);

    const reply = buildAssistantReply(getState(), message, (key) => t(getState().language, key));
    assistantPending = false;
    setAssistantMessages([
      ...nextMessages,
      {
        id: Date.now() + 1,
        role: "assistant",
        text: reply.text,
        products: reply.products,
      },
    ]);
  });

  document.querySelectorAll("[data-assistant-product-id]").forEach((button) =>
    button.addEventListener("click", () => {
      const productId = Number(button.dataset.assistantProductId);
      location.hash = `/product/${productId}`;
    }),
  );

  document.querySelector("#account-open-cart")?.addEventListener("click", () => toggleCart(true));

  document.querySelectorAll(".admin-customer-toggle").forEach((btn) =>
    btn.addEventListener("click", () => {
      const email = btn.dataset.customerEmail || "";
      adminOpenCustomerEmail = adminOpenCustomerEmail === email ? "" : email;
      render();
    }),
  );

  document.querySelectorAll(".branch-focus-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.branchIdx);
      const branch = SIMBA_BRANCHES[idx];
      if (!branch || !branchMapInstance) return;
      branchMapInstance.setView([branch.lat, branch.lng], 15, { animate: true });
      branchMarkers[idx]?.openPopup();
      document.getElementById("branches-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }),
  );

  document.querySelector("#locate-me-btn")?.addEventListener("click", () => requestUserLocation());
  document.querySelector("#checkout-locate-btn")?.addEventListener("click", () => requestUserLocation());

  document.querySelector("#branch-search-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = document.querySelector("#branch-location-input")?.value?.trim();
    if (!query) return;
    const btn = event.target.querySelector("button");
    if (btn) btn.textContent = "⏳";
    locationStatusState = "locating";
    render();
    
    try {
      // Use OpenStreetMap Nominatim API with better error handling
      const attempts = [
        `${query}, Kigali, Rwanda`,
        `${query}, Rwanda`,
        query,
      ];
      let results = [];
      
      for (const q of attempts) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=en&countrycodes=rw`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const res = await fetch(url, { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Simba-Supermarket-App/2.0'
            }
          });
          clearTimeout(timeoutId);
          
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          results = await res.json();
          if (results && results.length > 0) break;
        } catch (fetchError) {
          console.warn(`Failed to geocode "${q}":`, fetchError.message);
          continue;
        }
      }
      
      if (!results || !results.length) {
        locationStatusState = "error";
        if (btn) btn.textContent = "🔍";
        render();
        return;
      }
      
      const bestResult = results[0];
      customerLocationState = { 
        lat: parseFloat(bestResult.lat), 
        lng: parseFloat(bestResult.lon) 
      };
      nearestBranchState = findNearestBranch(customerLocationState.lat, customerLocationState.lng);
      locationStatusState = "";
      if (btn) btn.textContent = "🔍";
      render();
      
    } catch (err) {
      console.error('Location search error:', err);
      locationStatusState = "error";
      if (btn) btn.textContent = "🔍";
      render();
    }
  });

  document.querySelector("#customer-notifications-toggle")?.addEventListener("click", (e) => {
    e.stopPropagation();
    customerNotificationsOpen = !customerNotificationsOpen;
    render();
  });
  document.querySelector("#topbar-notifications-toggle")?.addEventListener("click", (e) => {
    e.stopPropagation();
    topbarNotificationsOpen = !topbarNotificationsOpen;
    render();
  });

  if (currentRoute.name === "admin" && pendingAdminPanel) {
    requestAnimationFrame(() => {
      document.getElementById(pendingAdminPanel)?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (pendingAdminTargetId) {
        setTimeout(() => {
          document.getElementById(pendingAdminTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
          pendingAdminTargetId = "";
        }, 120);
      }
      pendingAdminPanel = "";
    });
  }

  if (currentRoute.name === "account" && pendingAccountTargetId) {
    requestAnimationFrame(() => {
      document.getElementById(pendingAccountTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      pendingAccountTargetId = "";
    });
  }

  if (currentRoute.name === "checkout") {
    clearContactFeedback();
    const paymentMethod = document.querySelector("#payment-method");
    const momoField = document.querySelector("#momo-field");
    const cardFields = document.querySelector("#card-fields");
    if (paymentMethod) {
      checkoutPaymentMethodState = paymentMethod.value || checkoutPaymentMethodState;
    }
    const syncMomoField = () => {
      if (!paymentMethod) return;
      checkoutPaymentMethodState = paymentMethod.value;
      if (momoField) momoField.style.display = paymentMethod.value === "momo" ? "flex" : "none";
      if (cardFields) cardFields.style.display = paymentMethod.value === "card" ? "grid" : "none";
    };

    paymentMethod?.addEventListener("change", syncMomoField);
    syncMomoField();
  }

  if (currentRoute.name !== "checkout") clearCheckoutFeedback();
  if (currentRoute.name !== "admin" && currentRoute.name !== "account") clearAdminFeedback();
  if (!["auth", "home", "account"].includes(currentRoute.name)) {
    clearAuthFeedback();
    clearContactFeedback();
  }
}

function getNotificationSeenMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customerNotificationSeenAt);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setNotificationSeenMap(value) {
  localStorage.setItem(STORAGE_KEYS.customerNotificationSeenAt, JSON.stringify(value));
}

function getSeenNotificationIds(email) {
  const key = String(email || "").toLowerCase();
  if (!key) return [];
  const seenMap = getNotificationSeenMap();
  const value = seenMap[key];
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray(value.ids)) return value.ids;
  return [];
}

function markCustomerNotificationSeen(email, notificationId) {
  const key = String(email || "").toLowerCase();
  if (!key || !notificationId) return;
  const seenMap = getNotificationSeenMap();
  const seenIds = new Set(getSeenNotificationIds(key));
  seenIds.add(String(notificationId));
  seenMap[key] = Array.from(seenIds);
  setNotificationSeenMap(seenMap);
}

function getCustomerNotifications(state, tr) {
  if (state.currentUser?.role !== "customer") return [];
  const customerEmail = String(state.currentUser?.email || "").toLowerCase();
  if (!customerEmail) return [];
  const seenIds = new Set(getSeenNotificationIds(customerEmail));

  return (state.customerNotificationFeed || [])
    .filter((entry) => {
      const targetEmail = String(entry.email || "").toLowerCase();
      return (targetEmail === customerEmail || targetEmail === "*") && !seenIds.has(String(entry.id));
    })
    .map((entry) => ({
      ...entry,
      kindLabel:
        entry.kindLabel ||
        (String(entry.kind || "").startsWith("message")
          ? tr("customerNotificationTypeMessage")
          : tr("customerNotificationTypeProduct")),
      actionLabel: entry.actionLabel || tr("customerNotificationOpenAction"),
    }))
    .filter((entry) => entry.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function renderCustomerNotificationSections(notifications, tr) {
  if (!notifications.length) {
    return `<p class="muted">${tr("customerNotificationsEmpty")}</p>`;
  }

  const groups = [
    {
      key: "message",
      title: tr("customerNotificationGroupMessages"),
      items: notifications.filter((note) => String(note.kind || "").startsWith("message")),
    },
    {
      key: "price",
      title: tr("customerNotificationGroupPrices"),
      items: notifications.filter((note) => String(note.kind || "").includes("price")),
    },
    {
      key: "product",
      title: tr("customerNotificationGroupProducts"),
      items: notifications.filter(
        (note) =>
          !String(note.kind || "").startsWith("message") && !String(note.kind || "").includes("price"),
      ),
    },
  ].filter((group) => group.items.length);

  return groups
    .map(
      (group) => `
        <section class="notification-group">
          <div class="notification-group__title">${escapeHtml(group.title)}</div>
          <div class="notification-group__list">
            ${group.items
              .map((note) => {
                const isMessage = String(note.kind || "").startsWith("message");
                const isPrice = String(note.kind || "").includes("price");
                const isNew = String(note.kind || "").includes("new");
                const hash = isMessage ? "/account" : (note.targetHash || "/account");
                const target = isMessage ? "customer-chatbox" : (note.targetId || "");
                const timeAgo = getTimeAgo(note.createdAt);
                return `
                  <button class="account-notification-item" type="button"
                    data-notification-hash="${escapeHtml(hash)}"
                    data-account-target="${escapeHtml(target)}"
                    data-notification-id="${escapeHtml(note.id)}">
                    <div class="notification-header">
                      <span class="pill notification-type">${escapeHtml(note.kindLabel || tr("customerNotificationGeneralType"))}</span>
                      <span class="notification-time">${timeAgo}</span>
                    </div>
                    <div class="notification-content">
                      <strong class="notification-title">${escapeHtml(note.title)}</strong>
                      <p class="notification-text">${escapeHtml(note.text)}</p>
                      ${note.meta ? `<span class="notification-meta">${escapeHtml(note.meta)}</span>` : ""}
                    </div>
                    <div class="notification-action">
                      <span class="notification-action-text">${escapeHtml(isMessage ? tr("customerChatboxTitle") : isPrice ? tr("customerNotificationPriceTitle") : isNew ? tr("customerNotificationNewProductTitle") : tr("customerNotificationOpenAction"))}</span>
                      <span class="notification-arrow">→</span>
                    </div>
                  </button>
                `;
              })
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function captureSearchInputState() {
  const searchInput = document.querySelector("#search-input");
  if (!searchInput || document.activeElement !== searchInput) {
    searchInputState = null;
    return;
  }

  searchInputState = {
    value: searchInput.value,
    selectionStart: searchInput.selectionStart ?? searchInput.value.length,
    selectionEnd: searchInput.selectionEnd ?? searchInput.value.length,
  };
}

function restoreSearchInputState() {
  if (!searchInputState) return;
  const searchInput = document.querySelector("#search-input");
  if (!searchInput) {
    searchInputState = null;
    return;
  }

  searchInput.focus({ preventScroll: true });
  const nextLength = searchInput.value.length;
  const nextStart = Math.min(searchInputState.selectionStart, nextLength);
  const nextEnd = Math.min(searchInputState.selectionEnd, nextLength);
  searchInput.setSelectionRange(nextStart, nextEnd);
  searchInputState = null;
}

function getUnreadCustomerNotificationCount(state) {
  if (state.currentUser?.role !== "customer") return 0;
  const customerEmail = String(state.currentUser?.email || "").toLowerCase();
  if (!customerEmail) return 0;
  const seenIds = new Set(getSeenNotificationIds(customerEmail));

  return (state.customerNotificationFeed || []).filter((entry) => {
    const targetEmail = String(entry.email || "").toLowerCase();
    return (targetEmail === customerEmail || targetEmail === "*") && !seenIds.has(String(entry.id));
  }).length;
}

function getAdminNotificationSeenMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.adminNotificationSeenAt);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setAdminNotificationSeenMap(value) {
  localStorage.setItem(STORAGE_KEYS.adminNotificationSeenAt, JSON.stringify(value));
}

function markAdminNotificationsSeen(type) {
  const seenMap = getAdminNotificationSeenMap();
  seenMap[type] = new Date().toISOString();
  setAdminNotificationSeenMap(seenMap);
}

function getAdminNotifications(state, tr) {
  const seenMap = getAdminNotificationSeenMap();
  const seenMessagesAt = seenMap.customerMessages ? new Date(seenMap.customerMessages).getTime() : 0;
  const seenProductsAt = seenMap.productUpdates ? new Date(seenMap.productUpdates).getTime() : 0;

  const customerMessages = (state.messages || [])
    .filter((message) => new Date(message.createdAt || 0).getTime() > seenMessagesAt)
    .map((message) => ({
      id: message.id,
      createdAt: message.createdAt,
      title: `${message.fullName} (${message.email})`,
      text: message.message,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const productUpdates = state.products
    .filter((product) => {
      const createdAt = new Date(product.createdAt || 0).getTime();
      const changedAt = new Date(product.priceChangedAt || product.updatedAt || 0).getTime();
      return (product.addedByAdmin && createdAt > seenProductsAt) || changedAt > seenProductsAt;
    })
    .map((product) => {
      const hasPreviousPrice = Number.isFinite(Number(product.previousPrice));
      const text = hasPreviousPrice
        ? `${formatPrice(Number(product.previousPrice))} -> ${formatPrice(product.price)}`
        : `${tr("customerNotificationPriceBody")} ${formatPrice(product.price)}`;
      return {
        id: product.id,
        createdAt: product.priceChangedAt || product.updatedAt || product.createdAt,
        title: product.name,
        text,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { customerMessages, productUpdates };
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestBranch(lat, lng) {
  return SIMBA_BRANCHES.reduce((nearest, branch) => {
    const dist = haversineDistance(lat, lng, branch.lat, branch.lng);
    return !nearest || dist < nearest.dist ? { ...branch, dist } : nearest;
  }, null);
}

function normalizeLocationText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveOrderMapLocation(order) {
  if (order?.customer?.location?.lat && order?.customer?.location?.lng) {
    return {
      lat: Number(order.customer.location.lat),
      lng: Number(order.customer.location.lng),
      label: "gps",
      branch: order.customer.nearestBranch || null,
    };
  }

  const customerText = normalizeLocationText(
    [
      order?.customer?.address,
      order?.customer?.district,
      order?.customer?.notes,
    ].join(" "),
  );

  let bestBranch = null;
  let bestScore = 0;
  for (const branch of SIMBA_BRANCHES) {
    const branchText = normalizeLocationText(`${branch.name} ${branch.address}`);
    let score = 0;
    for (const token of customerText.split(" ").filter(Boolean)) {
      if (token.length < 3) continue;
      if (branchText.includes(token)) score += 1;
    }
    if (customerText && branchText.includes(customerText)) score += 3;
    if (score > bestScore) {
      bestScore = score;
      bestBranch = branch;
    }
  }

  if (bestBranch && bestScore > 0) {
    return {
      lat: bestBranch.lat,
      lng: bestBranch.lng,
      label: "address-match",
      branch: bestBranch,
    };
  }

  if (order?.customer?.nearestBranch?.lat && order?.customer?.nearestBranch?.lng) {
    return {
      lat: Number(order.customer.nearestBranch.lat),
      lng: Number(order.customer.nearestBranch.lng),
      label: "nearest-branch",
      branch: order.customer.nearestBranch,
    };
  }

  if (order?.customer?.nearestBranch?.id) {
    const branch = SIMBA_BRANCHES.find((entry) => entry.id === order.customer.nearestBranch.id);
    if (branch) {
      return {
        lat: branch.lat,
        lng: branch.lng,
        label: "nearest-branch",
        branch,
      };
    }
  }

  return null;
}

async function persistCustomerLocationIfAvailable() {
  const state = getState();
  if (!state.isAuthenticated || state.currentUser?.role !== "customer" || !customerLocationState) return;

  await syncAccountLocation({
    email: state.currentUser.email,
    lastKnownLocation: customerLocationState,
    lastNearestBranch: nearestBranchState,
  });
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    locationStatusState = "error";
    render();
    return;
  }
  
  locationStatusState = "locating";
  render();
  
  const options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 300000 // 5 minutes
  };
  
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      customerLocationState = { 
        lat: pos.coords.latitude, 
        lng: pos.coords.longitude 
      };
      nearestBranchState = findNearestBranch(customerLocationState.lat, customerLocationState.lng);
      locationStatusState = "";
      persistCustomerLocationIfAvailable().finally(() => render());
    },
    (err) => {
      console.error('Geolocation error:', err);
      switch(err.code) {
        case err.PERMISSION_DENIED:
          locationStatusState = "denied";
          break;
        case err.POSITION_UNAVAILABLE:
          locationStatusState = "error";
          break;
        case err.TIMEOUT:
          locationStatusState = "error";
          break;
        default:
          locationStatusState = "error";
          break;
      }
      render();
    },
    options
  );
}

function loadLeaflet(callback) {
  if (window.L) { callback(); return; }
  if (window.__leafletLoading) { window.__leafletCallbacks.push(callback); return; }
  window.__leafletLoading = true;
  window.__leafletCallbacks = [callback];
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
  const script = document.createElement("script");
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.onload = () => {
    window.__leafletLoading = false;
    window.__leafletCallbacks.forEach((fn) => fn());
    window.__leafletCallbacks = [];
  };
  document.head.appendChild(script);
}

function initBranchesMap() {
  const mapEl = document.getElementById("branches-map");
  if (!mapEl || branchMapInitialized) return;
  branchMapInitialized = true;
  loadLeaflet(() => {
    mountBranchesMap(document.getElementById("branches-map"));
    mountAdminOrdersMap();
  });
}

function makeIcon(color, size = 12) {
  return window.L.divIcon({
    className: "",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

let branchMapInstance = null;
let branchMarkers = [];

function mountBranchesMap(mapEl) {
  if (!mapEl || !window.L) return;
  const L = window.L;
  const center = customerLocationState
    ? [customerLocationState.lat, customerLocationState.lng]
    : [-1.9441, 30.0619];
  const zoom = customerLocationState ? 13 : 11;
  const map = L.map(mapEl).setView(center, zoom);
  branchMapInstance = map;
  branchMarkers = [];
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
  SIMBA_BRANCHES.forEach((branch) => {
    const isNearest = nearestBranchState?.id === branch.id;
    const marker = L.marker([branch.lat, branch.lng], { icon: makeIcon(isNearest ? "#13806d" : "#f57c00", isNearest ? 14 : 12) })
      .addTo(map)
      .bindPopup(`<strong>${branch.name}</strong><br><span style="color:#666;font-size:13px">${branch.address}</span>`);
    branchMarkers.push(marker);
  });
  if (customerLocationState && nearestBranchState) {
    const userLatLng = [customerLocationState.lat, customerLocationState.lng];
    const branchLatLng = [nearestBranchState.lat, nearestBranchState.lng];
    L.marker(userLatLng, { icon: makeIcon("#1a73e8", 14) })
      .addTo(map)
      .bindPopup("<strong>You are here</strong>")
      .openPopup();
    L.polyline([userLatLng, branchLatLng], { color: "#1a73e8", weight: 3, dashArray: "6 6" }).addTo(map);
    const dist = haversineDistance(customerLocationState.lat, customerLocationState.lng, nearestBranchState.lat, nearestBranchState.lng);
    const mid = [(userLatLng[0] + branchLatLng[0]) / 2, (userLatLng[1] + branchLatLng[1]) / 2];
    L.marker(mid, {
      icon: L.divIcon({
        className: "",
        html: `<div style="background:#1a73e8;color:#fff;padding:2px 7px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">${dist.toFixed(1)} km</div>`,
        iconAnchor: [30, 10],
      }),
    }).addTo(map);
    map.fitBounds([userLatLng, branchLatLng], { padding: [40, 40] });
  } else if (customerLocationState) {
    L.marker([customerLocationState.lat, customerLocationState.lng], { icon: makeIcon("#1a73e8", 14) })
      .addTo(map)
      .bindPopup("<strong>You are here</strong>")
      .openPopup();
  }
}

function mountAdminCustomersMap() {
  const mapEl = document.getElementById("admin-customers-map");
  if (!mapEl || !window.L) return;
  const L = window.L;
  const state = getState();
  const customersWithLocation = state.users.filter((user) => user.role === "customer" && user.lastKnownLocation);
  
  // Clear any existing map
  if (mapEl._leaflet_id) {
    mapEl._leaflet_id = null;
    mapEl.innerHTML = '';
  }
  
  const map = L.map(mapEl).setView([-1.9441, 30.0619], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
  
  // Add Simba branches
  SIMBA_BRANCHES.forEach((branch) => {
    L.marker([branch.lat, branch.lng], { icon: makeIcon("#f57c00", 12) })
      .addTo(map)
      .bindPopup(`<strong>${branch.name}</strong><br><span style="color:#666;font-size:12px">${branch.address}</span>`);
  });
  
  const bounds = [];
  customersWithLocation.forEach((customer) => {
    const { lat, lng } = customer.lastKnownLocation;
    bounds.push([lat, lng]);
    const customerLatLng = [lat, lng];
    
    // Customer location marker
    L.marker(customerLatLng, { icon: makeIcon("#4dd4c8", 12) })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:180px">
          <strong>${customer.fullName || 'Customer'}</strong><br>
          <span style="color:#666;font-size:12px">${customer.email}</span><br>
          <span style="color:#666;font-size:12px">📍 Location shared</span>
        </div>
      `);
  });
  
  if (bounds.length) {
    map.fitBounds(bounds, { padding: [20, 20] });
  }
}

function mountAdminOrdersMap() {
  const mapEl = document.getElementById("admin-orders-map");
  if (!mapEl || !window.L) return;
  const L = window.L;
  const state = getState();
  const ordersWithLocation = state.orders
    .map((order) => ({ order, resolvedLocation: resolveOrderMapLocation(order) }))
    .filter((entry) => Boolean(entry.resolvedLocation));
  
  // Clear any existing map
  if (mapEl._leaflet_id) {
    mapEl._leaflet_id = null;
    mapEl.innerHTML = '';
  }
  
  const map = L.map(mapEl).setView([-1.9441, 30.0619], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
  
  // Add Simba branches
  SIMBA_BRANCHES.forEach((branch) => {
    L.marker([branch.lat, branch.lng], { icon: makeIcon("#f57c00", 14) })
      .addTo(map)
      .bindPopup(`<strong>${branch.name}</strong><br><span style="color:#666;font-size:12px">${branch.address}</span>`);
  });
  
  const bounds = [];
  ordersWithLocation.forEach(({ order, resolvedLocation }) => {
    const { lat, lng } = resolvedLocation;
    bounds.push([lat, lng]);
    const customerLatLng = [lat, lng];
    
    // Customer location marker
    L.marker(customerLatLng, { icon: makeIcon("#13806d", 14) })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:200px">
          <strong>${order.customer.fullName}</strong><br>
          <span style="color:#666;font-size:12px">${order.reference}</span><br>
          <span style="color:#666;font-size:12px">📮 ${order.customer.address || 'No address'}</span><br>
          <span style="color:#666;font-size:12px">📞 ${order.customer.phone || 'No phone'}</span><br>
          ${order.customer.nearestBranch ? `<span style="color:#666;font-size:12px">📍 ${order.customer.nearestBranch.name}</span>` : ""}
        </div>
      `);
    
    // Draw line to nearest branch if available
    const nearestBranch = resolvedLocation.branch || order.customer.nearestBranch;
    if (nearestBranch) {
      const nb = SIMBA_BRANCHES.find((b) => b.id === nearestBranch.id) || nearestBranch;
      const branchLatLng = [nb.lat, nb.lng];
      L.polyline([customerLatLng, branchLatLng], { 
        color: "#13806d", 
        weight: 2, 
        dashArray: "5 5",
        opacity: 0.7
      }).addTo(map);
      
      const dist = haversineDistance(lat, lng, nb.lat, nb.lng);
      const mid = [(customerLatLng[0] + branchLatLng[0]) / 2, (customerLatLng[1] + branchLatLng[1]) / 2];
      L.marker(mid, {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#13806d;color:#fff;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,.3)">${dist.toFixed(1)} km</div>`,
          iconAnchor: [25, 10],
        }),
      }).addTo(map);
    }
  });
  
  if (bounds.length) {
    map.fitBounds(bounds, { padding: [20, 20] });
  }
}

function getTimeAgo(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function generateNonce() {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
}

function resolveGoogleClientId() {
  const runtimeClientId =
    window.SIMBA_GOOGLE_CLIENT_ID ||
    document.querySelector('meta[name="google-client-id"]')?.content ||
    localStorage.getItem("simba.google-client-id") ||
    GOOGLE_CLIENT_ID;

  return String(runtimeClientId || "").trim();
}

function isGoogleConfigured() {
  const clientId = resolveGoogleClientId();
  return Boolean(clientId && !clientId.includes("YOUR_GOOGLE_CLIENT_ID"));
}

function getGoogleRedirectUri() {
  return `${window.location.origin}${window.location.pathname}?google-auth=1`;
}

function startGoogleRedirect() {
  if (!isGoogleConfigured()) {
    setAuthFeedback("googleSetupRequired");
    return;
  }

  const nonce = generateNonce();
  const state = generateNonce();
  sessionStorage.setItem(STORAGE_KEYS.googleNonce, nonce);
  sessionStorage.setItem(STORAGE_KEYS.googleState, state);

  const params = new URLSearchParams({
    client_id: resolveGoogleClientId(),
    redirect_uri: getGoogleRedirectUri(),
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    state,
    prompt: "select_account",
  });

  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

async function handleGoogleAuthCallback() {
  const isGoogleCallback = window.location.search.includes("google-auth=1");
  if (!isGoogleCallback) return;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const googleError = hashParams.get("error");
  const idToken = hashParams.get("id_token");
  const nonce = sessionStorage.getItem(STORAGE_KEYS.googleNonce) || "";
  const expectedState = sessionStorage.getItem(STORAGE_KEYS.googleState) || "";
  const returnedState = hashParams.get("state") || "";

  history.replaceState(null, "", `${window.location.pathname}#/`);
  sessionStorage.removeItem(STORAGE_KEYS.googleNonce);
  sessionStorage.removeItem(STORAGE_KEYS.googleState);

  if (googleError || !idToken || (expectedState && returnedState !== expectedState)) {
    setAuthFeedback("googleCancelled");
    return;
  }

  const ok = await loginWithGoogle({ idToken, nonce });
  if (ok) {
    location.hash = "/";
  }
}
