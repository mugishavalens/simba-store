import {
  CATEGORY_BACKGROUNDS,
  GOOGLE_CLIENT_ID,
  LANGUAGES,
  PAYMENT_METHODS,
  PICKUP_DEPOSIT_RWF,
  PICKUP_TIMES,
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
  deletePromotion,
  deleteSupplier,
  getState,
  initializeStore,
  loginAccount,
  loginWithGoogle,
  registerAccount,
  removeFromCart,
  resetPassword,
  saveProduct,
  savePromotion,
  saveSupplier,
  saveBranchReview,
  sendSupportReply,
  sendSupportMessage,
  setAdminTab,
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
  updateInventory,
  updateAccountProfile,
  updateOrderWorkflow,
  updateQuantity,
} from "./store.js";
import { DEFAULT_MIN_STOCK, EXPIRY_ALERT_DAYS, VAT_RATE } from "./constants.js";
import { applyFilters, formatPrice, getActivePromotion, getCategories, getEffectivePrice, route, summarizeCart } from "./utils.js";
import { translateCategory } from "./i18n.js";

const BRAND_LOGO = "./assets/simba-logo.jpg";


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

function renderCategoryLabel(language, category) {
  return escapeHtml(translateCategory(language, category));
}

function render() {
  captureSearchInputState();
  branchMapInitialized = false;
  const state = getState();
  document.documentElement.lang = state.language;
  if (!state.store) {
    app.innerHTML =
      `<main class="shell section"><div class="banner"><h3>${t(state.language || "en", "loadingTitle")}</h3><p>${t(state.language || "en", "loadingText")}</p></div></main>`;
    return;
  }

  const currentRoute = route();
  const categories = getCategories(state.products);
  const filteredProducts = applyFilters(state.products, state.search, state.filters);
  const cartSummary = summarizeCart(state.products, state.cart, state.promotions || []);
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
  const isAdmin = state.isAuthenticated && ["admin", "manager", "staff"].includes(state.currentUser?.role);
  const isCustomer = state.isAuthenticated && state.currentUser?.role === "customer";
  const topbarNotifications = isCustomer ? getCustomerNotifications(state, tr) : [];
  const topbarNotificationCount = isCustomer ? getUnreadCustomerNotificationCount(state) : 0;
  const activeLanguage = state.language.toUpperCase();
  return `
    <header class="topbar">
      <div class="topbar__inner">
        <a class="brand brand--lockup" href="#/" data-home-link="true">
          <div class="brand__mark"><img src="${BRAND_LOGO}" alt="Simba" /></div>
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
            isAdmin && state.currentUser?.role === "admin"
              ? [
                  { id: "overview", key: "adminTabOverview" },
                  { id: "products", key: "adminTabProducts" },
                  { id: "suppliers", key: "adminTabSuppliers" },
                  { id: "promotions", key: "adminTabPromotions" },
                  { id: "reports", key: "adminTabReports" },
                  { id: "customers", key: "adminTabCustomers" },
                  { id: "orders", key: "adminTabOrders" },
                ]
                  .map(
                    (entry) => `
                      <a class="main-nav__link ${state.adminTab === entry.id ? "main-nav__link--active" : ""}"
                         href="#/admin"
                         data-admin-tab="${entry.id}">${tr(entry.key)}</a>
                    `,
                  )
                  .join("")
              : isAdmin
                ? `
                  <a class="main-nav__link" href="#/admin">${tr("adminDashboard")}</a>
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
                    ${categories.map((category) => `<option value="${escapeHtml(category)}" ${state.filters.category === category ? "selected" : ""}>${renderCategoryLabel(state.language, category)}</option>`).join("")}
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
  const reviewCount = (state.branchReviews || []).length;
  const averageRating = reviewCount
    ? (
        (state.branchReviews || []).reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        reviewCount
      ).toFixed(1)
    : "4.8";
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
              <div class="stat"><div class="stat__value">${state.products.length}</div><div>${tr("statProducts")}</div></div>
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

      <section class="section">
        <div class="feature-grid">
          <article class="feature-card">
            <h3>${tr("trustBranchesTitle")}</h3>
            <p>${SIMBA_BRANCHES.length} ${tr("trustBranchesBody")}</p>
          </article>
          <article class="feature-card">
            <h3>${tr("trustCatalogTitle")}</h3>
            <p>${state.products.length} ${tr("trustCatalogBody")}</p>
          </article>
          <article class="feature-card">
            <h3>${tr("trustRatingTitle")}</h3>
            <p>${averageRating}/5 • ${reviewCount || 12} ${tr("trustRatingBody")}</p>
          </article>
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
                  <span class="pill">${renderCategoryLabel(state.language, category)}</span>
                  <h3>${renderCategoryLabel(state.language, category)}</h3>
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
              const reviews = (state.branchReviews || []).filter((review) => Number(review.branchId) === branch.id);
              const avg = reviews.length
                ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
                : null;
              return `<button class="${cls} branch-focus-btn" type="button" data-branch-idx="${idx}"><strong>${escapeHtml(branch.name)}</strong><span class="muted">${escapeHtml(branch.address)}</span>${avg ? `<span class="muted">${tr("branchRating")}: ${avg}/5</span>` : ""}</button>`;
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
            <h3>${tr("contactEmailLabel")}</h3>
            <p>hello@simba.rw</p>
          </article>
          <article class="feature-card contact-card">
            <h3>${tr("contactPhoneLabel")}</h3>
            <p>+250 788 123 456</p>
          </article>
          <article class="feature-card contact-card">
            <h3>${tr("contactCityLabel")}</h3>
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
  const promo = getActivePromotion(product.id, state.promotions || []);
  const effective = promo
    ? Math.max(0, Math.round(Number(product.price) * (1 - Number(promo.percent) / 100)))
    : Number(product.price);
  return `
    <article class="product-card">
      <div class="product-card__media">
        ${promo ? `<span class="promo-badge">-${Number(promo.percent)}${tr("promotionBadge")}</span>` : ""}
        <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />
      </div>
      <div class="product-card__body">
        <div class="tag-row">
          <span class="pill pill--small">${renderCategoryLabel(state.language, product.category)}</span>
          <span class="pill pill--small ${product.inStock ? 'pill--success' : 'pill--warning'}">${product.inStock ? tr("inStock") : tr("outOfStock")}</span>
        </div>
        <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
        <div class="product-card__meta">
          <span class="product-meta">${tr("unit")}: ${escapeHtml(product.unit)}</span>
          <span class="product-card__price-group">
            ${promo ? `<span class="product-card__price-was">${formatPrice(product.price)}</span>` : ""}
            <strong class="product-card__price">${formatPrice(effective)}</strong>
          </span>
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
    return `<main class="product-layout"><div class="empty-state"><h3>${tr("productNotFound")}</h3><a class="button" href="#/">${tr("backHome")}</a></div></main>`;
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
            <span class="pill">${renderCategoryLabel(state.language, product.category)}</span>
            <span class="pill">${product.inStock ? tr("inStock") : tr("outOfStock")}</span>
          </div>
          <div>
            <h1>${escapeHtml(product.name)}</h1>
            <p class="section__lead">
              ${tr("category")}: ${renderCategoryLabel(state.language, product.category)}<br />
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
            <p>${escapeHtml(product.name)} ${tr("demoCheckoutReady")}</p>
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
  const selectedPaymentMethod = checkoutPaymentMethodState || "momo";
  const paymentGuide = getCheckoutPaymentGuide(selectedPaymentMethod, tr);
  const lastOrder = state.lastOrder;
  const depositAmount = Number(state.currentUser?.noShowFlags || 0) >= 2 ? PICKUP_DEPOSIT_RWF * 2 : PICKUP_DEPOSIT_RWF;
  return `
    <main class="checkout-layout">
      <section class="checkout-card">
        <h2>${tr("checkoutTitle")}</h2>
        <p class="section__lead">${tr("pickupLead")}</p>
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
                        <div class="muted">${escapeHtml(lastOrder.pickupBranch?.name || "")} • ${escapeHtml(lastOrder.pickupTime || "")}</div>
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
                <div class="summary-card" style="margin-bottom:1rem">
                  <div class="summary-card__row"><span>${tr("pickupOnlyLabel")}</span><strong>${tr("pickupOnlyValue")}</strong></div>
                  <div class="summary-card__row"><span>${tr("pickupDeposit")}</span><strong>${formatPrice(depositAmount)}</strong></div>
                  <p class="notice">${tr("pickupDepositHint")}</p>
                </div>
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
                    <span>${tr("pickupBranch")}</span>
                    <select name="branchId" required>
                      <option value="">${tr("checkoutBranchPlaceholder")}</option>
                      ${SIMBA_BRANCHES.map((branch) => `<option value="${branch.id}" ${nearestBranchState?.id === branch.id ? "selected" : ""}>${escapeHtml(branch.name)}</option>`).join("")}
                    </select>
                  </label>
                </div>
                <div class="checkout-grid">
                  <label class="checkout-field">
                    <span>${tr("pickupTime")}</span>
                    <select name="pickupTime" required>
                      <option value="">${tr("pickupTime")}</option>
                      ${PICKUP_TIMES.map((slot) => `<option value="${escapeHtml(slot)}">${escapeHtml(slot)}</option>`).join("")}
                    </select>
                  </label>
                  <label class="checkout-field">
                    <span>${tr("paymentMethod")}</span>
                    <select name="paymentMethod" id="payment-method">
                      ${["momo", "card"].map((method) => {
                        const labelMap = {
                          momo: tr("paymentMomo"),
                          card: tr("paymentCard"),
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
                  <textarea name="address"></textarea>
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
        <div class="summary-card__row"><span>${tr("pickupDeposit")}</span><strong>${formatPrice(depositAmount)}</strong></div>
        <div class="summary-card__row summary-card__total"><span>${tr("total")}</span><strong>${formatPrice(cartSummary.total)}</strong></div>
        <p class="notice">${tr("momoHint")}</p>
      </aside>
    </main>
  `;
}

function renderAssistantWidget(state, tr, currentRoute) {
  if (currentRoute.name === "admin") return "";

  const isLoggedIn = state.isAuthenticated && state.currentUser?.role === "customer";
  const messages = isLoggedIn && Array.isArray(state.assistantMessages) ? state.assistantMessages : [];
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
                <div style="display:flex;gap:0.4rem;align-items:center">
                  ${isLoggedIn ? `<button class="button button--ghost button--sm" id="assistant-clear" type="button">🗑</button>` : ""}
                  <button class="button button--ghost button--sm" id="assistant-close" type="button">${tr("close")}</button>
                </div>
              </div>
              <div class="assistant-panel__messages">
                ${
                  isLoggedIn
                    ? visibleMessages.map((message) => `
                        <article class="assistant-bubble assistant-bubble--${escapeHtml(message.role || "assistant")}">
                          <strong>${message.role === "user" ? tr("assistantYou") : tr("assistantTitle")}</strong>
                          <p>${escapeHtml(message.text || "")}</p>
                          ${
                            Array.isArray(message.products) && message.products.length
                              ? `<div class="assistant-products">${message.products.map((product) => `
                                  <button class="assistant-product" type="button" data-assistant-product-id="${product.id}">
                                    <span>${escapeHtml(product.name)}</span>
                                    <strong>${formatPrice(product.price)}</strong>
                                  </button>`).join("")}</div>`
                              : ""
                          }
                        </article>`).join("")
                    : `<div class="assistant-signin-prompt">
                        <p>&#128274; ${tr("navSignIn")} to use the shop assistant.</p>
                        <a class="button button--primary button--sm" href="#/auth/signin">${tr("navSignIn")}</a>
                      </div>`
                }
              </div>
              ${
                isLoggedIn
                  ? `<form id="assistant-form" class="assistant-form">
                      <input id="assistant-input" name="message" value="${escapeHtml(assistantInputState)}" placeholder="${tr("assistantPlaceholder")}" autocomplete="off" required />
                      <button class="button button--accent" type="submit">${assistantPending ? tr("assistantThinking") : tr("assistantSend")}</button>
                    </form>`
                  : ""
              }
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
    deposit_pending: tr("paymentStatusMomoPending"),
    deposit_authorized: tr("paymentStatusCardAuthorized"),
    deposit_confirmed: tr("paymentStatusPending"),
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
  if (!state.isAuthenticated || state.currentUser?.role !== "customer") return;
  if (Array.isArray(state.assistantMessages) && state.assistantMessages.length) return;
  const name = escapeHtml(state.currentUser?.fullName?.split(" ")[0] || "");
  const greeting = state.language === "rw"
    ? `Muraho ${name}! Nshobora gufasha gushaka ibicuruzwa kuri Simba, gusobanura uburyo bwo guhaha, cyangwa gusubiza ibibazo byawe.`
    : state.language === "fr"
    ? `Bonjour ${name}\u00a0! Je peux vous aider \u00e0 trouver des produits Simba, expliquer comment fonctionne la boutique, ou r\u00e9pondre \u00e0 vos questions.`
    : `Hi ${name}! I can help you find Simba products, explain how the shop works, or answer any questions you have.`;
  setAssistantMessages([{ id: "seed", role: "assistant", text: greeting, products: [] }]);
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

async function buildAssistantReply(state, rawQuery, tr) {
  const language = state.language || "en";
  const langName = language === "rw" ? "Kinyarwanda" : language === "fr" ? "French" : "English";

  const query = normalizeAssistantToken(rawQuery);
  const intentCategories = inferAssistantCategories(query, getCategories(state.products));

  const scored = state.products
    .filter((p) => p.inStock)
    .map((p) => ({ p, score: scoreAssistantProduct(p, query, intentCategories) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map((e) => `- ${e.p.name} | ${e.p.category} | ${e.p.price} RWF`);

  const systemPrompt = `You are a helpful assistant for Simba Supermarket in Kigali, Rwanda.
Respond ONLY in ${langName}.

You can help with TWO things:
1. PRODUCT SEARCH: If the user asks for a product, ONLY recommend products from the CATALOG below. Never suggest products not in the catalog. Do not mix unrelated categories.
2. SIMBA SYSTEM HELP: If the user asks how to order, pay, use MoMo, find branches, sign in, use the cart, checkout, or anything about how Simba works — answer clearly and helpfully.

Keep replies to 2-3 sentences. For products, list up to 4 matching names from the catalog.

SIMBA SYSTEM INFO:
- Sign in or create an account to shop
- Add products to cart, then go to checkout
- Payment: small MoMo deposit for branch pick-up, with demo card fallback
- Branches: ${SIMBA_BRANCHES.map((branch) => branch.name).join(", ")}
- Support: hello@simba.rw | +250 788 123 456

${scored.length > 0 ? `PRODUCT CATALOG (pre-filtered):\n${scored.join("\n")}` : ""}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("simba.groq-api-key") || ""}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawQuery },
        ],
        max_tokens: 220,
        temperature: 0.2,
      }),
    });

    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("empty");

    const scoredProducts = scored.map((line) => {
      const name = line.replace(/^- /, "").split(" | ")[0];
      return state.products.find((p) => p.name === name);
    }).filter(Boolean);

    const mentioned = scoredProducts.filter((p) =>
      text.toLowerCase().includes(p.name.toLowerCase().slice(0, 12))
    ).slice(0, 4);

    return { text, products: mentioned.length ? mentioned : (scored.length > 0 ? scoredProducts.slice(0, 3) : []) };
  } catch (err) {
    console.error("Groq assistant error:", err.message);
    return buildLocalAssistantReply(state, rawQuery, tr);
  }
}

function buildLocalAssistantReply(state, rawQuery, tr) {
  const query = normalizeAssistantToken(rawQuery);
  const categories = getCategories(state.products);
  const intentCategories = inferAssistantCategories(query, categories);
  const scored = state.products
    .map((p) => ({ p, score: scoreAssistantProduct(p, query, intentCategories) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.p.inStock) - Number(a.p.inStock))
    .slice(0, 5)
    .map((e) => e.p);

  if (!scored.length) {
    return { text: `${tr("assistantNoMatch")} ${categories.slice(0, 4).join(", ")}.`, products: [] };
  }
  const intro = tr("assistantDirectReply");
  return { text: `${intro} ${scored.map((p) => p.name).slice(0, 3).join(", ")}.`, products: scored };
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
                                    <span class="muted">${new Date(order.createdAt).toLocaleString()} • ${escapeHtml(order.status || "pending")}</span>
                                  </span>
                                  <strong>${formatPrice(order.totals?.total || 0)}</strong>
                                </div>
                                <div class="summary-card__row">
                                  <span>${escapeHtml(order.pickupBranch?.name || "-")}</span>
                                  <strong>${escapeHtml(order.pickupTime || "-")}</strong>
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
                                ${
                                  order.status === "completed" && !order.branchReview
                                    ? `
                                      <form class="branch-review-form" data-order-id="${order.id}" data-branch-id="${order.pickupBranch?.id || ""}" data-branch-name="${escapeHtml(order.pickupBranch?.name || "")}">
                                        <label class="checkout-field checkout-field--compact">
                                          <span>${tr("branchRating")}</span>
                                          <select name="rating" required>
                                            <option value="">/5</option>
                                            <option value="5">5</option>
                                            <option value="4">4</option>
                                            <option value="3">3</option>
                                            <option value="2">2</option>
                                            <option value="1">1</option>
                                          </select>
                                        </label>
                                        <label class="checkout-field checkout-field--compact">
                                          <span>${tr("branchReviewComment")}</span>
                                          <input name="comment" placeholder="${tr("branchReviewLead")}" />
                                        </label>
                                        <button class="button button--primary button--sm" type="submit">${tr("branchReviewButton")}</button>
                                      </form>
                                    `
                                    : order.branchReview
                                      ? `<p class="muted">${tr("branchRating")}: ${escapeHtml(String(order.branchReview.rating || "-"))}/5</p>`
                                      : ""
                                }
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
                                          <strong>${reply.by === "Admin" ? tr("authRoleAdmin") : escapeHtml(reply.by)}</strong>
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

function renderBranchOperationsView(state, tr) {
  const currentBranchId = Number(state.currentUser?.branchId || 1);
  const currentBranch = SIMBA_BRANCHES.find((branch) => branch.id === currentBranchId) || SIMBA_BRANCHES[0];
  const branchOrders = state.orders
    .filter((order) => Number(order.pickupBranch?.id) === currentBranchId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const myStaffOrders = state.currentUser?.role === "staff"
    ? branchOrders.filter((order) => String(order.assignedStaffEmail || "").toLowerCase() === String(state.currentUser?.email || "").toLowerCase())
    : branchOrders;
  const inventoryProducts = state.products.slice(0, 18);
  const staffOptions = state.users.filter((user) => user.role === "staff" && Number(user.branchId) === currentBranchId);

  return `
    <main class="section admin-layout">
      <section class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("branchOpsTitle")}</h2>
            <p class="section__lead">${escapeHtml(currentBranch.name)} • ${tr("branchOpsLead")}</p>
          </div>
          <span class="pill">${escapeHtml(state.currentUser?.role || "")}</span>
        </div>
        ${state.adminFeedback ? `<p class="auth-feedback auth-feedback--${state.adminFeedback.type}">${tr(`admin_${state.adminFeedback.code}`)}</p>` : ""}
        <div class="feature-grid">
          <article class="feature-card"><h3>${tr("branchOrdersPending")}</h3><p>${branchOrders.filter((order) => order.status === "pending").length}</p></article>
          <article class="feature-card"><h3>${tr("branchOrdersAssigned")}</h3><p>${branchOrders.filter((order) => order.status === "assigned").length}</p></article>
          <article class="feature-card"><h3>${tr("branchOrdersReady")}</h3><p>${branchOrders.filter((order) => order.status === "ready").length}</p></article>
          <article class="feature-card"><h3>${tr("branchOrdersCompleted")}</h3><p>${branchOrders.filter((order) => order.status === "completed").length}</p></article>
        </div>
      </section>
      <section class="admin-grid">
        <article class="summary-card">
          <h3>${tr("branchOrdersPending")}</h3>
          <div class="admin-activity-list">
            ${
              myStaffOrders.length
                ? myStaffOrders.map((order) => `
                    <div class="admin-order-card">
                      <div class="admin-order-header">
                        <div>
                          <strong>${escapeHtml(order.customer.fullName)}</strong>
                          <div class="admin-order-meta">${escapeHtml(order.reference)} • ${escapeHtml(order.status || "pending")}</div>
                        </div>
                        <strong class="admin-order-total">${formatPrice(order.totals?.total || 0)}</strong>
                      </div>
                      <div class="admin-order-details">
                        <div class="admin-order-branch">${escapeHtml(order.pickupBranch?.name || "")}</div>
                        <div class="admin-order-location">${escapeHtml(order.pickupTime || "")}</div>
                        <div class="admin-order-address">${escapeHtml(order.customer.phone || "")}</div>
                        ${order.assignedStaffName ? `<div class="admin-order-phone">${tr("branchAssignedTo")}: ${escapeHtml(order.assignedStaffName)}</div>` : ""}
                      </div>
                      <div class="detail-actions">
                        ${
                          state.currentUser?.role !== "staff" && order.status === "pending"
                            ? `<button class="button button--primary button--sm" type="button" data-order-action="accept" data-order-id="${order.id}">${tr("branchAccept")}</button>`
                            : ""
                        }
                        ${
                          state.currentUser?.role !== "staff" && ["accepted", "pending"].includes(order.status)
                            ? `
                              <select class="branch-assign-select" data-order-id="${order.id}">
                                <option value="">${tr("branchAssign")}</option>
                                ${staffOptions.map((user) => `<option value="${escapeHtml(user.email)}">${escapeHtml(user.fullName)}</option>`).join("")}
                              </select>
                            `
                            : ""
                        }
                        ${
                          order.status === "assigned" && (
                            state.currentUser?.role !== "staff" ||
                            String(order.assignedStaffEmail || "").toLowerCase() === String(state.currentUser?.email || "").toLowerCase()
                          )
                            ? `<button class="button button--primary button--sm" type="button" data-order-action="ready" data-order-id="${order.id}">${tr("branchMarkReady")}</button>`
                            : ""
                        }
                        ${
                          order.status === "ready"
                            ? `
                              <button class="button button--primary button--sm" type="button" data-order-action="complete" data-order-id="${order.id}">${tr("branchComplete")}</button>
                              <button class="button button--ghost button--sm" type="button" data-order-action="no_show" data-order-id="${order.id}">${tr("branchNoShow")}</button>
                            `
                            : ""
                        }
                      </div>
                    </div>
                  `).join("")
                : `<p>${tr("noOrdersYet")}</p>`
            }
          </div>
        </article>
        <article class="summary-card">
          <h3>${tr("branchInventoryTitle")}</h3>
          <p class="muted">${tr("branchInventoryLead")}</p>
          <div class="admin-product-list">
            ${inventoryProducts.map((product) => `
              <form class="branch-stock-form" data-product-id="${product.id}" data-branch-id="${currentBranchId}">
                <div class="admin-product-list__head">
                  <div class="admin-product-info">
                    <strong class="admin-product-name">${escapeHtml(product.name)}</strong>
                    <div class="admin-product-meta">${renderCategoryLabel(state.language, product.category)}</div>
                  </div>
                </div>
                <div class="admin-price-form__fields">
                  <label class="checkout-field checkout-field--compact">
                    <span>${tr("branchStockCount")}</span>
                    <input name="stock" type="number" min="0" step="1" value="${Number(product.branchStock?.[currentBranchId] || 0)}" required />
                  </label>
                  <button class="button button--primary button--sm" type="submit">${tr("branchUpdateStock")}</button>
                </div>
              </form>
            `).join("")}
          </div>
        </article>
      </section>
    </main>
  `;
}

function renderAdminView(state, filteredProducts, tr) {
  if (!state.isAuthenticated || !["admin", "manager", "staff"].includes(state.currentUser?.role)) {
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

  if (state.currentUser?.role === "manager" || state.currentUser?.role === "staff") {
    return renderBranchOperationsView(state, tr);
  }

  const feedback = state.adminFeedback
    ? `<p class="auth-feedback auth-feedback--${state.adminFeedback.type}">${tr(`admin_${state.adminFeedback.code}`)}</p>`
    : "";
  const visibleProducts = filteredProducts.slice(0, 24);
  const customers = state.users.filter((user) => user.role === "customer");
  const recentOrders = state.orders.slice(0, 8);
  const adminNotifications = getAdminNotifications(state, tr);
  const customerNotificationCount = adminNotifications.customerMessages.length;
  const productNotificationCount = adminNotifications.productUpdates.length;
  const activeTab = state.adminTab || "overview";
  const tabs = [
    { id: "overview", label: tr("adminTabOverview") },
    { id: "products", label: tr("adminTabProducts") },
    { id: "suppliers", label: tr("adminTabSuppliers") },
    { id: "promotions", label: tr("adminTabPromotions") },
    { id: "reports", label: tr("adminTabReports") },
    { id: "customers", label: tr("adminTabCustomers") },
    { id: "orders", label: tr("adminTabOrders") },
  ];

  const tabContent = (() => {
    if (activeTab === "products") return renderAdminProductsTab(state, visibleProducts, tr);
    if (activeTab === "suppliers") return renderAdminSuppliersTab(state, tr);
    if (activeTab === "promotions") return renderAdminPromotionsTab(state, tr);
    if (activeTab === "reports") return renderAdminReportsTab(state, tr);
    if (activeTab === "customers") return renderAdminCustomersTab(state, customers, tr);
    if (activeTab === "orders") return renderAdminOrdersTab(state, recentOrders, tr);
    return renderAdminOverviewTab(state, customers, adminNotifications, tr);
  })();

  return `
    <main class="section admin-layout">
      <section class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">${tr("adminDashboard")}</h2>
            <p class="section__lead">${tr("adminDashboardLead")}</p>
          </div>
          <span class="pill">${state.products.length} ${tr("statProducts")}</span>
        </div>
        ${feedback}
        <div class="admin-tabs" role="tablist">
          ${tabs.map((tab) => `
            <button type="button" role="tab"
              class="admin-tab ${activeTab === tab.id ? "admin-tab--active" : ""}"
              data-admin-tab="${tab.id}">
              ${escapeHtml(tab.label)}
              ${tab.id === "customers" && customerNotificationCount ? `<span class="notification-count">${customerNotificationCount}</span>` : ""}
              ${tab.id === "products" && productNotificationCount ? `<span class="notification-count">${productNotificationCount}</span>` : ""}
            </button>
          `).join("")}
        </div>
        ${tabContent}
      </section>
    </main>
  `;
}

function renderAdminOverviewTab(state, customers, adminNotifications, tr) {
  const totalRevenue = (state.orders || []).reduce((sum, o) => sum + Number(o.totals?.total || 0), 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysOrders = (state.orders || []).filter((o) => String(o.createdAt || "").slice(0, 10) === todayKey);
  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + Number(o.totals?.total || 0), 0);
  const lowStock = (state.products || []).filter((p) => {
    const min = Number(p.minStock) || DEFAULT_MIN_STOCK;
    const stock = Object.values(p.branchStock || {}).reduce((a, b) => a + Number(b || 0), 0);
    return p.inStock && stock <= min;
  });
  const expiring = (state.products || []).filter((p) => {
    if (!p.expiryDate) return false;
    const days = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= EXPIRY_ALERT_DAYS;
  });
  return `
    <div class="feature-grid">
      <article class="feature-card"><h3>${tr("statProducts")}</h3><p>${state.products.length}</p></article>
      <article class="feature-card"><h3>${tr("adminCustomersCount")}</h3><p>${customers.length}</p></article>
      <article class="feature-card"><h3>${tr("reportTodayRevenue")}</h3><p>${formatPrice(todaysRevenue)}</p></article>
      <article class="feature-card"><h3>${tr("reportTotalRevenue")}</h3><p>${formatPrice(totalRevenue)}</p></article>
      <article class="feature-card ${lowStock.length ? "feature-card--warn" : ""}"><h3>${tr("alertLowStock")}</h3><p>${lowStock.length}</p></article>
      <article class="feature-card ${expiring.length ? "feature-card--warn" : ""}"><h3>${tr("alertExpiringSoon")}</h3><p>${expiring.length}</p></article>
    </div>
    <div class="admin-grid">
      <article class="summary-card">
        <h3>${tr("adminTabCustomers")}</h3>
        ${
          adminNotifications.customerMessages.length
            ? `<div class="admin-notification-list">${adminNotifications.customerMessages.slice(0, 5).map((entry) => `
                <button class="admin-notification-item" type="button" data-admin-tab="customers">
                  <strong>${escapeHtml(entry.title)}</strong>
                  <span>${escapeHtml(entry.text)}</span>
                </button>`).join("")}</div>`
            : `<p class="muted">${tr("adminNoNewCustomerMessages")}</p>`
        }
      </article>
      <article class="summary-card">
        <h3>${tr("adminTabProducts")}</h3>
        ${
          adminNotifications.productUpdates.length
            ? `<div class="admin-notification-list">${adminNotifications.productUpdates.slice(0, 5).map((entry) => `
                <button class="admin-notification-item" type="button" data-admin-tab="products">
                  <strong>${escapeHtml(entry.title)}</strong>
                  <span>${escapeHtml(entry.text)}</span>
                </button>`).join("")}</div>`
            : `<p class="muted">${tr("adminNoNewProductUpdates")}</p>`
        }
      </article>
    </div>
  `;
}

function renderAdminProductsTab(state, visibleProducts, tr) {
  const supplierOptions = (state.suppliers || [])
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
    .join("");
  return `
    <div class="admin-grid">
      <article class="summary-card">
        <h3>${tr("addProduct")}</h3>
        <form id="admin-product-form" class="auth-form admin-form">
          <label class="checkout-field"><span>${tr("productName")}</span><input name="name" required /></label>
          <label class="checkout-field"><span>${tr("category")}</span><input name="category" required /></label>
          <label class="checkout-field"><span>${tr("unit")}</span><input name="unit" value="Pcs" required /></label>
          <label class="checkout-field"><span>${tr("priceLabel")}</span><input name="price" type="number" min="0" step="1" required /></label>
          <label class="checkout-field"><span>${tr("productSku")}</span><input name="sku" /></label>
          <label class="checkout-field"><span>${tr("productBarcode")}</span><input name="barcode" /></label>
          <label class="checkout-field"><span>${tr("productSupplier")}</span>
            <select name="supplierId"><option value="">—</option>${supplierOptions}</select>
          </label>
          <label class="checkout-field"><span>${tr("productExpiry")}</span><input name="expiryDate" type="date" /></label>
          <label class="checkout-field"><span>${tr("productMinStock")}</span><input name="minStock" type="number" min="0" step="1" value="${DEFAULT_MIN_STOCK}" /></label>
          <label class="checkout-field"><span>${tr("imageUrl")}</span><input name="image" type="url" placeholder="https://..." /></label>
          <label class="auth-remember"><input name="inStock" type="checkbox" checked /> <span>${tr("inStock")}</span></label>
          <button class="button button--primary" type="submit">${tr("saveProductButton")}</button>
        </form>
      </article>
      <article class="summary-card">
        <h3>${tr("editPrices")}</h3>
        <div class="admin-product-list">
          ${visibleProducts.map((product) => renderAdminProductEditor(product, state, tr)).join("")}
        </div>
      </article>
    </div>
  `;
}

function renderAdminProductEditor(product, state, tr) {
  const supplierOptions = (state.suppliers || [])
    .map((s) => `<option value="${s.id}" ${Number(product.supplierId) === Number(s.id) ? "selected" : ""}>${escapeHtml(s.name)}</option>`)
    .join("");
  return `
    <form class="admin-price-form" id="admin-product-${product.id}" data-product-id="${product.id}">
      <div class="admin-product-list__head">
        <div class="admin-product-info">
          <strong class="admin-product-name">${escapeHtml(product.name)}</strong>
          <div class="admin-product-meta">${renderCategoryLabel(state.language, product.category)} • ${escapeHtml(product.unit)}${product.sku ? ` • SKU ${escapeHtml(product.sku)}` : ""}</div>
        </div>
        <a class="button button--ghost button--sm" href="#/product/${product.id}">${tr("details")}</a>
      </div>
      <div class="admin-price-form__fields">
        <label class="checkout-field checkout-field--compact"><span>${tr("priceLabel")}</span><input name="price" type="number" min="0" step="1" value="${Number(product.price)}" required /></label>
        <label class="checkout-field checkout-field--compact"><span>${tr("productSku")}</span><input name="sku" value="${escapeHtml(product.sku || "")}" /></label>
        <label class="checkout-field checkout-field--compact"><span>${tr("productBarcode")}</span><input name="barcode" value="${escapeHtml(product.barcode || "")}" /></label>
        <label class="checkout-field checkout-field--compact"><span>${tr("productSupplier")}</span>
          <select name="supplierId"><option value="">—</option>${supplierOptions}</select>
        </label>
        <label class="checkout-field checkout-field--compact"><span>${tr("productExpiry")}</span><input name="expiryDate" type="date" value="${escapeHtml(product.expiryDate || "")}" /></label>
        <label class="checkout-field checkout-field--compact"><span>${tr("productMinStock")}</span><input name="minStock" type="number" min="0" step="1" value="${Number(product.minStock) || DEFAULT_MIN_STOCK}" /></label>
        <label class="checkout-field checkout-field--compact"><span>${tr("imageUrl")}</span><input name="image" type="url" value="${escapeHtml(product.image || '')}" placeholder="https://..." /></label>
        <label class="auth-remember"><input name="inStock" type="checkbox" ${product.inStock ? "checked" : ""} /> <span>${tr("inStock")}</span></label>
        <button class="button button--primary button--sm" type="submit">${tr("updatePrice")}</button>
      </div>
    </form>
  `;
}

function renderAdminSuppliersTab(state, tr) {
  const suppliers = state.suppliers || [];
  return `
    <div class="admin-grid">
      <article class="summary-card">
        <h3>${tr("supplierAdd")}</h3>
        <form id="admin-supplier-form" class="auth-form admin-form">
          <input type="hidden" name="id" />
          <label class="checkout-field"><span>${tr("supplierName")}</span><input name="name" required /></label>
          <label class="checkout-field"><span>${tr("supplierContact")}</span><input name="contact" /></label>
          <label class="checkout-field"><span>${tr("supplierPhone")}</span><input name="phone" /></label>
          <label class="checkout-field"><span>${tr("supplierEmail")}</span><input name="email" type="email" /></label>
          <label class="checkout-field"><span>${tr("supplierNotes")}</span><textarea name="notes" rows="2"></textarea></label>
          <button class="button button--primary" type="submit">${tr("supplierSave")}</button>
        </form>
      </article>
      <article class="summary-card">
        <h3>${tr("adminTabSuppliers")}</h3>
        ${suppliers.length ? `
          <table class="admin-table">
            <thead><tr>
              <th>${tr("supplierName")}</th><th>${tr("supplierContact")}</th><th>${tr("supplierPhone")}</th><th>${tr("supplierEmail")}</th><th></th>
            </tr></thead>
            <tbody>
              ${suppliers.map((s) => `
                <tr>
                  <td><strong>${escapeHtml(s.name)}</strong>${s.notes ? `<div class="muted">${escapeHtml(s.notes)}</div>` : ""}</td>
                  <td>${escapeHtml(s.contact || "—")}</td>
                  <td>${escapeHtml(s.phone || "—")}</td>
                  <td>${escapeHtml(s.email || "—")}</td>
                  <td><button class="button button--ghost button--sm" type="button" data-supplier-delete="${s.id}">${tr("supplierDelete")}</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<p class="muted">${tr("supplierEmpty")}</p>`}
      </article>
    </div>
  `;
}

function renderAdminPromotionsTab(state, tr) {
  const productOptions = (state.products || [])
    .slice(0, 200)
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)} — ${formatPrice(p.price)}</option>`)
    .join("");
  const promotions = state.promotions || [];
  return `
    <div class="admin-grid">
      <article class="summary-card">
        <h3>${tr("promotionAdd")}</h3>
        <form id="admin-promotion-form" class="auth-form admin-form">
          <label class="checkout-field"><span>${tr("promotionProduct")}</span>
            <select name="productId" required><option value="">—</option>${productOptions}</select>
          </label>
          <label class="checkout-field"><span>${tr("promotionPercent")}</span><input name="percent" type="number" min="1" max="90" step="1" required /></label>
          <label class="checkout-field"><span>${tr("promotionEnds")}</span><input name="endDate" type="date" /></label>
          <button class="button button--primary" type="submit">${tr("promotionSave")}</button>
        </form>
      </article>
      <article class="summary-card">
        <h3>${tr("promotionActive")}</h3>
        ${promotions.length ? `
          <table class="admin-table">
            <thead><tr><th>${tr("productName")}</th><th>${tr("promotionPercent")}</th><th>${tr("promotionEnds")}</th><th></th></tr></thead>
            <tbody>
              ${promotions.map((promo) => {
                const prod = (state.products || []).find((p) => Number(p.id) === Number(promo.productId));
                const effective = prod ? Math.round(Number(prod.price) * (1 - Number(promo.percent) / 100)) : 0;
                return `
                  <tr>
                    <td>${prod ? escapeHtml(prod.name) : `#${promo.productId}`}${prod ? `<div class="muted">${formatPrice(prod.price)} → <strong>${formatPrice(effective)}</strong></div>` : ""}</td>
                    <td><span class="promo-badge promo-badge--inline">-${Number(promo.percent)}%</span></td>
                    <td>${promo.endDate ? escapeHtml(promo.endDate) : "—"}</td>
                    <td><button class="button button--ghost button--sm" type="button" data-promotion-delete="${promo.id}">${tr("promotionDelete")}</button></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        ` : `<p class="muted">${tr("promotionEmpty")}</p>`}
      </article>
    </div>
  `;
}

function renderAdminReportsTab(state, tr) {
  const orders = state.orders || [];
  const total = orders.reduce((s, o) => s + Number(o.totals?.total || 0), 0);
  const subtotal = orders.reduce((s, o) => s + Number(o.totals?.subtotal || o.totals?.total || 0), 0);
  const vat = Math.round(subtotal * VAT_RATE);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysOrders = orders.filter((o) => String(o.createdAt || "").slice(0, 10) === todayKey);
  const todaysRevenue = todaysOrders.reduce((s, o) => s + Number(o.totals?.total || 0), 0);
  const avgOrder = orders.length ? Math.round(total / orders.length) : 0;

  const byCategory = new Map();
  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const product = (state.products || []).find((p) => Number(p.id) === Number(it.id || it.productId));
      const cat = product ? product.category : "Other";
      const line = Number(it.price || 0) * Number(it.quantity || 0);
      byCategory.set(cat, (byCategory.get(cat) || 0) + line);
    });
  });
  const catEntries = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCat = catEntries.reduce((m, [, v]) => Math.max(m, v), 0) || 1;

  const lowStock = (state.products || []).filter((p) => {
    const min = Number(p.minStock) || DEFAULT_MIN_STOCK;
    const stock = Object.values(p.branchStock || {}).reduce((a, b) => a + Number(b || 0), 0);
    return p.inStock && stock <= min;
  });
  const expiring = (state.products || []).filter((p) => {
    if (!p.expiryDate) return false;
    const days = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= EXPIRY_ALERT_DAYS;
  });

  return `
    <div class="feature-grid">
      <article class="feature-card"><h3>${tr("reportTodayRevenue")}</h3><p>${formatPrice(todaysRevenue)}</p></article>
      <article class="feature-card"><h3>${tr("reportTotalRevenue")}</h3><p>${formatPrice(total)}</p></article>
      <article class="feature-card"><h3>${tr("reportOrdersCount")}</h3><p>${orders.length}</p></article>
      <article class="feature-card"><h3>${tr("reportAvgOrder")}</h3><p>${formatPrice(avgOrder)}</p></article>
      <article class="feature-card"><h3>${tr("reportVatCollected")}</h3><p>${formatPrice(vat)}</p></article>
    </div>
    <div class="admin-grid">
      <article class="summary-card">
        <h3>${tr("reportSalesByCategory")}</h3>
        ${catEntries.length ? `
          <div class="bar-chart">
            ${catEntries.map(([cat, val]) => `
              <div class="bar-chart__row">
                <span class="bar-chart__label">${escapeHtml(cat)}</span>
                <span class="bar-chart__track"><span class="bar-chart__fill" style="width:${Math.round((val / maxCat) * 100)}%"></span></span>
                <strong class="bar-chart__value">${formatPrice(val)}</strong>
              </div>
            `).join("")}
          </div>
        ` : `<p class="muted">${tr("reportNoData")}</p>`}
      </article>
      <article class="summary-card">
        <h3>${tr("alertLowStock")}</h3>
        ${lowStock.length ? `
          <ul class="admin-alert-list">
            ${lowStock.slice(0, 12).map((p) => {
              const stock = Object.values(p.branchStock || {}).reduce((a, b) => a + Number(b || 0), 0);
              return `<li><strong>${escapeHtml(p.name)}</strong> <span class="muted">— ${stock} ${tr("inStockLeft") || ""}</span></li>`;
            }).join("")}
          </ul>
        ` : `<p class="muted">${tr("reportNoData")}</p>`}
      </article>
      <article class="summary-card">
        <h3>${tr("alertExpiringSoon")}</h3>
        ${expiring.length ? `
          <ul class="admin-alert-list">
            ${expiring.slice(0, 12).map((p) => `<li><strong>${escapeHtml(p.name)}</strong> <span class="muted">— ${escapeHtml(p.expiryDate)}</span></li>`).join("")}
          </ul>
        ` : `<p class="muted">${tr("reportNoData")}</p>`}
      </article>
    </div>
  `;
}

function renderAdminCustomersTab(state, customers, tr) {
  return `
    <div class="admin-grid" id="customers-panel">
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
                        <span><span class="pill">${customerMsgs.length}</span></span>
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
                                      <strong>${reply.by === "Admin" ? tr("authRoleAdmin") : escapeHtml(reply.by)}</strong>
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
    </div>
  `;
}

function renderAdminOrdersTab(state, recentOrders, tr) {
  return `
    <div class="admin-grid">
      <article class="summary-card">
        <h3>${tr("adminOrdersMap")}</h3>
        <div class="admin-activity-list">
          ${
            recentOrders.length
              ? recentOrders.map((order) => `
                  <div class="admin-order-card">
                    <div class="admin-order-header">
                      <div>
                        <strong>${escapeHtml(order.customer.fullName)}</strong>
                        <div class="admin-order-meta">${escapeHtml(order.reference)} • ${escapeHtml(order.status || "pending")}</div>
                      </div>
                      <strong class="admin-order-total">${formatPrice(order.totals.total)}</strong>
                    </div>
                    <div class="admin-order-details">
                      ${order.pickupBranch ? `<div class="admin-order-branch">📍 ${escapeHtml(order.pickupBranch.name)}</div>` : ""}
                      ${order.pickupTime ? `<div class="admin-order-location">🕒 ${escapeHtml(order.pickupTime)}</div>` : ""}
                      ${order.customer.location ? `<div class="admin-order-location">🌍 ${order.customer.location.lat.toFixed(4)}, ${order.customer.location.lng.toFixed(4)}</div>` : ""}
                      <div class="admin-order-address">📮 ${escapeHtml(order.customer.address || tr("noAddressProvided"))}</div>
                      <div class="admin-order-phone">📞 ${escapeHtml(order.customer.phone || tr("noPhoneProvided"))}</div>
                    </div>
                  </div>
                `).join("")
              : `<div class="empty-orders-state"><p>${tr("noOrdersYet")}</p><p class="muted">${tr("adminOrdersMapHint")}</p></div>`
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
    </div>
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
        <p class="muted" style="margin-top:0.75rem">${tr("demoAccountsBody")}</p>
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
        ${cartSummary.savings ? `<div class="summary-card__row"><span>${tr("youSaved")}</span><strong class="summary-savings">- ${formatPrice(cartSummary.savings)}</strong></div>` : ""}
        <div class="summary-card__row"><span>${tr("vatIncluded")}</span><strong>${formatPrice(cartSummary.vat)}</strong></div>
        <div class="summary-card__row"><span>${tr("pickupDeposit")}</span><strong>${formatPrice(cartSummary.deposit)}</strong></div>
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
            <span class="pill">${tr("footerTagSearch")}</span>
            <span class="pill">${tr("footerTagFilters")}</span>
            <span class="pill">${tr("footerTagCart")}</span>
            <span class="pill">${tr("footerTagCheckout")}</span>
            <span class="pill">${tr("footerTagMomo")}</span>
            <span class="pill">${tr("footerTagLanguages")}</span>
            <span class="pill">${tr("footerTagPickup")}</span>
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

    document.addEventListener("mousedown", (event) => {
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
    document.addEventListener("click", (event) => {
      if (!assistantOpen) return;
      const shell = document.querySelector(".assistant-shell");
      if (!shell || shell.contains(event.target)) return;
      assistantOpen = false;
      render();
    });
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
  languageToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!languageList) return;
    const isOpen = !languageList.hidden;
    languageList.hidden = isOpen;
    languageToggle.setAttribute("aria-expanded", String(!isOpen));
  });
  document.querySelectorAll(".language-menu__item").forEach((button) =>
    button.addEventListener("mousedown", (e) => {
      e.preventDefault(); // prevent blur before click
      setLanguage(button.dataset.language);
      if (languageList) languageList.hidden = true;
      languageToggle?.setAttribute("aria-expanded", "false");
    }),
  );
  document.querySelector("#cart-toggle")?.addEventListener("click", () => toggleCart(true));
  document.querySelector("#assistant-toggle")?.addEventListener("click", (e) => {
    e.stopPropagation();
    assistantOpen = !assistantOpen;
    render();
  });
  document.querySelector("#assistant-close")?.addEventListener("click", (e) => {
    e.stopPropagation();
    assistantOpen = false;
    render();
  });
  document.querySelector("#assistant-clear")?.addEventListener("click", (e) => {
    e.stopPropagation();
    setAssistantMessages([]);
    seedAssistantConversation();
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
    setAssistantMessages([]);
    assistantOpen = false;
    adminCustomersNotificationsOpen = false;
    adminProductsNotificationsOpen = false;
    location.hash = "/";
  });
  document.querySelector("#account-signout")?.addEventListener("click", () => {
    signOut();
    setAssistantMessages([]);
    assistantOpen = false;
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
    const cartSummary = summarizeCart(state.products, state.cart, state.promotions || []);
    
    // Validate required fields
    const fullName = form.get("fullName");
    const phone = form.get("phone");
    const district = form.get("district");
    const branchId = Number(form.get("branchId"));
    const pickupTime = String(form.get("pickupTime") || "").trim();
    const address = form.get("address");

    if (!fullName || !phone || !district) {
      alert(t(getState().language, "checkoutCustomerDetailsRequired"));
      return;
    }
    if (!branchId) {
      alert(t(getState().language, "checkoutBranchRequired"));
      return;
    }
    if (!pickupTime) {
      alert(t(getState().language, "checkoutPickupTimeRequired"));
      return;
    }

    const ok = await completeOrder({
      fullName,
      phone,
      district,
      branchId,
      pickupTime,
      depositAmount: Number(getState().currentUser?.noShowFlags || 0) >= 2 ? PICKUP_DEPOSIT_RWF * 2 : PICKUP_DEPOSIT_RWF,
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
        deposit: cartSummary.deposit,
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
      if (role === "customer") seedAssistantConversation();
      location.hash = ["admin", "manager", "staff"].includes(role) ? "/admin" : "/";
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
    if (ok) {
      seedAssistantConversation();
      location.hash = "/";
    }
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
      sku: form.get("sku"),
      barcode: form.get("barcode"),
      supplierId: form.get("supplierId"),
      expiryDate: form.get("expiryDate"),
      minStock: form.get("minStock"),
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
        sku: form.get("sku"),
        barcode: form.get("barcode"),
        supplierId: form.get("supplierId"),
        expiryDate: form.get("expiryDate"),
        minStock: form.get("minStock"),
      });
    }),
  );

  document.querySelectorAll("[data-admin-tab]").forEach((btn) =>
    btn.addEventListener("click", () => {
      setAdminTab(btn.dataset.adminTab);
    }),
  );

  document.querySelector("#admin-supplier-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = saveSupplier({
      id: form.get("id"),
      name: form.get("name"),
      contact: form.get("contact"),
      phone: form.get("phone"),
      email: form.get("email"),
      notes: form.get("notes"),
    });
    if (ok) event.currentTarget.reset();
  });

  document.querySelectorAll("[data-supplier-delete]").forEach((btn) =>
    btn.addEventListener("click", () => deleteSupplier(btn.dataset.supplierDelete)),
  );

  document.querySelector("#admin-promotion-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = savePromotion({
      productId: form.get("productId"),
      percent: form.get("percent"),
      endDate: form.get("endDate"),
    });
    if (ok) event.currentTarget.reset();
  });

  document.querySelectorAll("[data-promotion-delete]").forEach((btn) =>
    btn.addEventListener("click", () => deletePromotion(btn.dataset.promotionDelete)),
  );

  document.querySelectorAll(".branch-stock-form").forEach((formElement) =>
    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await updateInventory({
        productId: Number(event.currentTarget.dataset.productId),
        branchId: Number(event.currentTarget.dataset.branchId),
        stock: form.get("stock"),
      });
    }),
  );

  document.querySelectorAll("[data-order-action]").forEach((button) =>
    button.addEventListener("click", async () => {
      const current = getState().currentUser;
      await updateOrderWorkflow({
        orderId: Number(button.dataset.orderId),
        action: button.dataset.orderAction,
        actorName: current?.fullName || "Simba Team",
        actorEmail: current?.email || "",
      });
    }),
  );

  document.querySelectorAll(".branch-assign-select").forEach((select) =>
    select.addEventListener("change", async (event) => {
      const targetEmail = String(event.currentTarget.value || "").toLowerCase();
      if (!targetEmail) return;
      const state = getState();
      const targetUser = state.users.find((user) => String(user.email || "").toLowerCase() === targetEmail);
      await updateOrderWorkflow({
        orderId: Number(event.currentTarget.dataset.orderId),
        action: "assign",
        actorName: targetUser?.fullName || targetEmail,
        actorEmail: targetEmail,
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
    if (!message || assistantPending) return;

    assistantPending = true;
    assistantInputState = "";
    const state = getState();
    const nextMessages = [
      ...(Array.isArray(state.assistantMessages) ? state.assistantMessages : []),
      { id: Date.now(), role: "user", text: message, products: [] },
    ];
    setAssistantMessages(nextMessages);
    render();

    const reply = await buildAssistantReply(getState(), message, (key) => t(getState().language, key));
    assistantPending = false;
    setAssistantMessages([
      ...nextMessages,
      { id: Date.now() + 1, role: "assistant", text: reply.text, products: reply.products },
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
      loadLeaflet(() => {
        requestAnimationFrame(() => {
          mountAdminOrdersMap(adminOpenCustomerEmail || null);
          if (adminOpenCustomerEmail) {
            document.getElementById("admin-orders-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
      });
    }),
  );

  document.querySelectorAll(".branch-review-form").forEach((formElement) =>
    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const current = getState().currentUser;
      const ok = await saveBranchReview({
        orderId: Number(event.currentTarget.dataset.orderId),
        branchId: Number(event.currentTarget.dataset.branchId),
        branchName: event.currentTarget.dataset.branchName,
        customerEmail: current?.email || "",
        customerName: current?.fullName || "",
        rating: form.get("rating"),
        comment: form.get("comment"),
      });
      if (ok) {
        event.currentTarget.reset();
      }
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
        tr(entry.kindLabel) ||
        (String(entry.kind || "").startsWith("message")
          ? tr("customerNotificationTypeMessage")
          : tr("customerNotificationTypeProduct")),
      actionLabel: entry.actionLabel || tr("customerNotificationOpenAction"),
    }))
    .filter((entry) => entry.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function formatNotificationText(note, tr) {
  if (note.kind === "message") return note.text;
  
  const text = note.text; // usually product name
  const meta = note.meta || "";
  
  if (meta.startsWith("notificationNowAvailableAt|")) {
    const price = meta.split("|")[1];
    return `${text} ${tr("notificationNowAvailableAt")} ${formatPrice(Number(price))}.`;
  }
  if (meta.startsWith("notificationNowCosts|")) {
    const price = meta.split("|")[1];
    return `${text} ${tr("notificationNowCosts")} ${formatPrice(Number(price))}.`;
  }
  if (meta.startsWith("priceChange|")) {
    const [, oldP, newP] = meta.split("|");
    return `${text}: ${formatPrice(Number(oldP))} -> ${formatPrice(Number(newP))}`;
  }
  if (meta === "notificationIsNoLongerAvailable") {
    return `${text} ${tr("notificationIsNoLongerAvailable")}`;
  }
  if (meta === "notificationBackInStock" || meta === "notificationOutOfStock") {
    return `${text} ${tr(meta)}.`;
  }
  if (meta === "notificationWasUpdated") {
    return `${text} ${tr("notificationWasUpdated")}`;
  }
  
  return text;
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
                const timeAgo = getTimeAgo(note.createdAt, tr);
                const translatedTitle = tr(note.title);
                const translatedText = formatNotificationText(note, tr);
                const actionText = note.actionLabel
                  ? tr(note.actionLabel)
                  : isMessage
                    ? tr("customerChatboxTitle")
                    : isPrice
                      ? tr("customerNotificationPriceTitle")
                      : isNew
                        ? tr("customerNotificationNewProductTitle")
                        : tr("customerNotificationOpenAction");
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
                      <strong class="notification-title">${escapeHtml(translatedTitle)}</strong>
                      <p class="notification-text">${escapeHtml(translatedText)}</p>
                      ${note.kind === "message" && note.meta ? `<span class="notification-meta">${escapeHtml(note.meta)}</span>` : ""}
                    </div>
                    <div class="notification-action">
                      <span class="notification-action-text">${escapeHtml(actionText)}</span>
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

function mountAdminCustomerMap(customer) {
  const mapId = `admin-customer-map-${customer.email.replace(/[^a-z0-9]/gi, '-')}`;
  const mapEl = document.getElementById(mapId);
  if (!mapEl || !window.L) return;
  if (mapEl._leaflet_id) { mapEl._leaflet_id = null; mapEl.innerHTML = ''; }

  const state = getState();
  const customerOrders = state.orders.filter(
    (o) => String(o.customer?.email || "").toLowerCase() === customer.email.toLowerCase()
  );

  const L = window.L;
  const map = L.map(mapEl).setView([-1.9441, 30.0619], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  SIMBA_BRANCHES.forEach((branch) => {
    L.marker([branch.lat, branch.lng], { icon: makeIcon("#f57c00", 12) })
      .addTo(map)
      .bindPopup(`<strong>${branch.name}</strong><br><span style="color:#666;font-size:12px">${branch.address}</span>`);
  });

  const bounds = [];
  customerOrders.forEach((order) => {
    const loc = resolveOrderMapLocation(order);
    if (!loc) return;
    const customerLatLng = [loc.lat, loc.lng];
    bounds.push(customerLatLng);
    L.marker(customerLatLng, { icon: makeIcon("#13806d", 14) })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:180px">
          <strong>${order.customer.fullName}</strong><br>
          <span style="color:#666;font-size:12px">${order.reference}</span><br>
          ${order.customer.address ? `<span style="color:#666;font-size:12px">📮 ${order.customer.address}</span><br>` : ""}
        </div>
      `);
    const nb = loc.branch ? (SIMBA_BRANCHES.find((b) => b.id === loc.branch.id) || loc.branch) : null;
    if (nb) {
      const branchLatLng = [nb.lat, nb.lng];
      L.polyline([customerLatLng, branchLatLng], { color: "#13806d", weight: 2, dashArray: "5 5", opacity: 0.7 }).addTo(map);
      const dist = haversineDistance(loc.lat, loc.lng, nb.lat, nb.lng);
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
    map.fitBounds(bounds, { padding: [40, 40] });
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

function mountAdminOrdersMap(filterEmail) {
  const mapEl = document.getElementById("admin-orders-map");
  if (!mapEl || !window.L) return;
  const L = window.L;
  const state = getState();

  // When filtering by customer, also try matching by name in case email isn't on the order
  let allOrders = state.orders;
  if (filterEmail) {
    const matchedUser = state.users.find((u) => u.email.toLowerCase() === filterEmail.toLowerCase());
    allOrders = state.orders.filter((o) => {
      const orderEmail = String(o.customer?.email || "").toLowerCase();
      if (orderEmail === filterEmail.toLowerCase()) return true;
      if (matchedUser && String(o.customer?.fullName || "").trim().toLowerCase() === String(matchedUser.fullName || "").trim().toLowerCase()) return true;
      return false;
    });
  }

  const ordersWithLocation = allOrders
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

function getTimeAgo(dateString, tr) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return tr("timeJustNow");
  if (diffMins < 60) return `${diffMins}${tr("timeMinuteAgo")}`;
  if (diffHours < 24) return `${diffHours}${tr("timeHourAgo")}`;
  if (diffDays < 7) return `${diffDays}${tr("timeDayAgo")}`;
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
  return window.location.origin + "/index.html";
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
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const idToken = hashParams.get("id_token");
  const googleError = hashParams.get("error");
  if (!idToken && !googleError) return;

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
