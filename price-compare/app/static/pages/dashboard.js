const app = document.getElementById("app");
app.innerHTML = `
  <div class="background"></div>
  <div class="noise"></div>

  <main class="shell main-grid admin-grid">
    <section class="hero glass admin-hero">
      <div>
        <p class="eyebrow">Admin HQ</p>
        <h1>Command Dashboard</h1>
        <p class="lede">
          Real-time control over products, shops, and pricing data. Logged-in admin
          accounts can create, edit, and remove catalog items.
        </p>
        <div class="admin-pill-row">
          <div id="adminInfo" class="pill ghost">Checking admin session...</div>
          <div id="adminHint" class="pill ghost small">Admin only</div>
        </div>
      </div>
      <div class="admin-stats" id="statsGrid">
        <div class="stat-card">
          <div class="stat-label">Products</div>
          <div class="stat-value" id="statProducts">-</div>
          <div class="stat-foot">Active SKUs</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Shops</div>
          <div class="stat-value" id="statShops">-</div>
          <div class="stat-foot">Retail sources</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Users</div>
          <div class="stat-value" id="statUsers">-</div>
          <div class="stat-foot">Registered accounts</div>
        </div>
      </div>
    </section>

    <section class="panel glass admin-panel" id="insightsPanel">
      <div class="insights-layout">
        <div class="admin-insight-card coverage">
          <div class="admin-insight-title">Store coverage</div>
          <div id="storeCoverageKpi" class="admin-insight-kpi">Loading...</div>
          <div class="admin-insight-body">
            <div id="storeChart" class="admin-chart"></div>
            <div id="storeBreakdown" class="admin-insight-list">Loading...</div>
          </div>
        </div>

        <div class="insights-summary">
          <div class="insights-head">
            <div class="insights-copy">
              <p class="eyebrow">Insights</p>
              <h3>Operational overview</h3>
            </div>
            <div class="insights-side">
            <div class="admin-toolbar">
              <span id="insightStatus" class="status"></span>
              <button id="runScrapeBtn" class="scrape-btn" type="button">Scrape products</button>
              <span id="scrapeStatus" class="status status-right"></span>
            </div>
              <div class="admin-latest-card">
                <div class="admin-latest-label">Latest price</div>
                <div class="admin-latest-value stat-value" id="statLatest">-</div>
                <div class="admin-latest-foot">Most recent update</div>
              </div>
            </div>
          </div>

          <div id="scrapeProgress" class="scrape-progress is-hidden">
            <div class="scrape-progress-bar">
              <span id="scrapeProgressFill"></span>
            </div>
            <div id="scrapeProgressText" class="scrape-progress-text"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel glass admin-panel" id="productsPanel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Catalog</p>
          <h3>Products</h3>
          <p class="muted">Manage SKUs, categories, and imagery.</p>
        </div>
        <div class="admin-toolbar">
          <input id="productSearch" type="search" placeholder="Search products..." />
          <button id="productSearchBtn" class="ghost" type="button">Search</button>
          <button id="productNewBtn" type="button">New product</button>
        </div>
      </div>

      <div id="productEditor" class="admin-editor is-hidden">
        <form id="productForm" class="admin-form">
          <div class="admin-form-header">
            <div class="admin-form-title" id="productFormTitle">Create product</div>
            <div class="admin-form-subtitle" id="productFormSubtitle">Add a new SKU to the catalog.</div>
          </div>
          <div class="admin-form-grid">
            <label class="admin-field">
              <span>SKU</span>
              <input id="productSku" type="text" required />
            </label>
            <label class="admin-field">
              <span>Name</span>
              <input id="productName" type="text" required />
            </label>
            <label class="admin-field">
              <span>Category</span>
              <select id="productCategory">
                <option value="smartphone">smartphone</option>
                <option value="laptop">laptop</option>
                <option value="accessory">accessory</option>
              </select>
            </label>
            <label class="admin-field">
              <span>Brand</span>
              <input id="productBrand" type="text" placeholder="Apple" />
            </label>
            <label class="admin-field">
              <span>Image URL</span>
              <input id="productImage" type="url" placeholder="https://..." />
            </label>
            <label class="admin-field admin-field-wide">
              <span>Image URLs (comma separated)</span>
              <textarea id="productImages" rows="2" placeholder="https://..., https://..."></textarea>
            </label>
          </div>
          <div class="admin-form-actions">
            <button id="productCancelBtn" class="ghost" type="button">Cancel</button>
            <button id="productSaveBtn" type="submit">Save product</button>
          </div>
        </form>
      </div>

      <div class="admin-meta">
        <span id="productMeta" class="status"></span>
        <span id="productStatus" class="status"></span>
      </div>
      <div id="productTable" class="admin-table products">Loading...</div>
      <div class="admin-pagination" id="productPagination">
        <button id="productPrevBtn" class="button-pill page-btn" type="button">Prev</button>
        <div id="productPageList" class="admin-page-list"></div>
        <button id="productNextBtn" class="button-pill page-btn" type="button">Next</button>
        <div id="productPageInfo" class="admin-page-info"></div>
      </div>
    </section>

    <section class="panel glass admin-panel" id="shopsPanel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Sources</p>
          <h3>Shops</h3>
          <p class="muted">Edit display names for each retailer.</p>
        </div>
        <div class="admin-toolbar">
          <button id="shopNewBtn" type="button">New shop</button>
        </div>
      </div>

      <div id="shopEditor" class="admin-editor is-hidden">
        <form id="shopForm" class="admin-form">
          <div class="admin-form-header">
            <div class="admin-form-title" id="shopFormTitle">Create shop</div>
            <div class="admin-form-subtitle" id="shopFormSubtitle">Add or update a retail source.</div>
          </div>
          <div class="admin-form-grid">
            <label class="admin-field">
              <span>Code</span>
              <select id="shopCode">
                <option value="gjirafamall">gjirafamall</option>
                <option value="neptun">neptun</option>
                <option value="aztech">aztech</option>
                <option value="shopaz">shopaz</option>
                <option value="tecstore">tecstore</option>
              </select>
            </label>
            <label class="admin-field admin-field-wide">
              <span>Name</span>
              <input id="shopName" type="text" required />
            </label>
          </div>
          <div class="admin-form-actions">
            <button id="shopCancelBtn" class="ghost" type="button">Cancel</button>
            <button id="shopSaveBtn" type="submit">Save shop</button>
          </div>
        </form>
      </div>

      <div class="admin-meta">
        <span id="shopMeta" class="status"></span>
        <span id="shopStatus" class="status"></span>
      </div>
      <div id="shopTable" class="admin-table shops">Loading...</div>
    </section>

    <section class="panel glass admin-panel" id="usersPanel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Access</p>
          <h3>Users</h3>
          <p class="muted">Create accounts, reset access, and manage roles.</p>
        </div>
        <div class="admin-toolbar">
          <input id="userSearch" type="search" placeholder="Search users..." />
          <button id="userSearchBtn" class="ghost" type="button">Search</button>
          <button id="userNewBtn" type="button">New user</button>
        </div>
      </div>

      <div id="userEditor" class="admin-editor is-hidden">
        <form id="userForm" class="admin-form">
          <div class="admin-form-header">
            <div class="admin-form-title" id="userFormTitle">Create user</div>
            <div class="admin-form-subtitle" id="userFormSubtitle">Add a new account to the platform.</div>
          </div>
          <div class="admin-form-grid">
            <label class="admin-field">
              <span>Email</span>
              <input id="userEmail" type="email" required />
            </label>
            <label class="admin-field">
              <span>Name</span>
              <input id="userName" type="text" placeholder="Optional display name" />
            </label>
            <label class="admin-field">
              <span>Role</span>
              <select id="userRole">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label class="admin-field admin-field-wide">
              <span>Password</span>
              <input id="userPassword" type="password" placeholder="Set password (min 8 chars)" />
            </label>
          </div>
          <div class="admin-form-actions">
            <button id="userCancelBtn" class="ghost" type="button">Cancel</button>
            <button id="userSaveBtn" type="submit">Save user</button>
          </div>
        </form>
      </div>

      <div class="admin-meta">
        <span id="userMeta" class="status"></span>
        <span id="userStatus" class="status"></span>
      </div>
      <div id="userTable" class="admin-table users">Loading...</div>
    </section>
  </main>

  <div id="confirmModal" class="modal-backdrop">
    <div class="modal">
      <div id="confirmTitle" class="modal-title">Confirm action</div>
      <p id="confirmMessage" class="auth-legal">Are you sure?</p>
      <div class="modal-actions">
        <button id="confirmCancel" class="ghost" type="button">Cancel</button>
        <button id="confirmOk" type="button">Confirm</button>
      </div>
    </div>
  </div>

  <div id="scrapeModal" class="modal-backdrop">
    <div class="modal">
      <div class="modal-title">Scrape status</div>
      <p id="scrapeModalMessage" class="auth-legal">Scrape finished.</p>
      <div class="modal-actions">
        <button id="scrapeModalOk" type="button">OK</button>
      </div>
    </div>
  </div>

  <footer class="shell footer">
    <div>Admin dashboard</div>
    <div>Use admin credentials to manage catalog data.</div>
  </footer>
`;

const storageKey = "pc_user";
const adminInfo = document.getElementById("adminInfo");
const adminHint = document.getElementById("adminHint");
const statProducts = document.getElementById("statProducts");
const statShops = document.getElementById("statShops");
const statPrices = document.getElementById("statPrices");
const statUsers = document.getElementById("statUsers");
const statLatest = document.getElementById("statLatest");

const insightStatus = document.getElementById("insightStatus");
const runScrapeBtn = document.getElementById("runScrapeBtn");
const scrapeStatus = document.getElementById("scrapeStatus");
const scrapeProgress = document.getElementById("scrapeProgress");
const scrapeProgressFill = document.getElementById("scrapeProgressFill");
const scrapeProgressText = document.getElementById("scrapeProgressText");
const storeChart = document.getElementById("storeChart");
const storeCoverageKpi = document.getElementById("storeCoverageKpi");
const storeBreakdown = document.getElementById("storeBreakdown");

const productSearch = document.getElementById("productSearch");
const productSearchBtn = document.getElementById("productSearchBtn");
const productNewBtn = document.getElementById("productNewBtn");
const productEditor = document.getElementById("productEditor");
const productForm = document.getElementById("productForm");
const productFormTitle = document.getElementById("productFormTitle");
const productFormSubtitle = document.getElementById("productFormSubtitle");
const productSku = document.getElementById("productSku");
const productName = document.getElementById("productName");
const productCategory = document.getElementById("productCategory");
const productBrand = document.getElementById("productBrand");
const productImage = document.getElementById("productImage");
const productImages = document.getElementById("productImages");
const productCancelBtn = document.getElementById("productCancelBtn");
const productMeta = document.getElementById("productMeta");
const productStatus = document.getElementById("productStatus");
const productTable = document.getElementById("productTable");
const productsPanel = document.getElementById("productsPanel");
const productPagination = document.getElementById("productPagination");
const productPrevBtn = document.getElementById("productPrevBtn");
const productNextBtn = document.getElementById("productNextBtn");
const productPageList = document.getElementById("productPageList");
const productPageInfo = document.getElementById("productPageInfo");

const shopNewBtn = document.getElementById("shopNewBtn");
const shopEditor = document.getElementById("shopEditor");
const shopForm = document.getElementById("shopForm");
const shopFormTitle = document.getElementById("shopFormTitle");
const shopFormSubtitle = document.getElementById("shopFormSubtitle");
const shopCode = document.getElementById("shopCode");
const shopName = document.getElementById("shopName");
const shopCancelBtn = document.getElementById("shopCancelBtn");
const shopMeta = document.getElementById("shopMeta");
const shopStatus = document.getElementById("shopStatus");
const shopTable = document.getElementById("shopTable");

const userSearch = document.getElementById("userSearch");
const userSearchBtn = document.getElementById("userSearchBtn");
const userNewBtn = document.getElementById("userNewBtn");
const userEditor = document.getElementById("userEditor");
const userForm = document.getElementById("userForm");
const userFormTitle = document.getElementById("userFormTitle");
const userFormSubtitle = document.getElementById("userFormSubtitle");
const userEmail = document.getElementById("userEmail");
const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const userPassword = document.getElementById("userPassword");
const userCancelBtn = document.getElementById("userCancelBtn");
const userMeta = document.getElementById("userMeta");
const userStatus = document.getElementById("userStatus");
const userTable = document.getElementById("userTable");

const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCancel = document.getElementById("confirmCancel");
const confirmOk = document.getElementById("confirmOk");
const scrapeModal = document.getElementById("scrapeModal");
const scrapeModalMessage = document.getElementById("scrapeModalMessage");
const scrapeModalOk = document.getElementById("scrapeModalOk");

const CHART_COLORS = [
  "#0f172a",
  "#1d4ed8",
  "#0f766e",
  "#d97706",
  "#16a34a",
  "#0284c7",
  "#f97316",
  "#475569",
];
const PRODUCT_PAGE_SIZE = 20;

const state = {
  products: [],
  productTotal: 0,
  productPage: 1,
  productPageSize: PRODUCT_PAGE_SIZE,
  productQuery: "",
  shops: [],
  users: [],
  userTotal: 0,
  editingProduct: null,
  editingShop: null,
  editingUser: null,
  confirmAction: null,
  locked: false,
};

let scrapePollTimer = null;
let scrapeHideTimer = null;
let scrapeWasRunning = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(value) {
  if (!value) return "";
  const url = String(value).trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return "";
}

const STORE_LABELS = {
  gjirafamall: "GjirafaMall",
  neptun: "Neptun KS",
  aztech: "Aztech",
  shopaz: "ShopAz",
  tecstore: "TecStore",
};

function displayStore(code) {
  if (!code) return "Unknown";
  const key = String(code).toLowerCase();
  return STORE_LABELS[key] || code;
}

function formatPrice(value, currency) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  const code = currency || "EUR";
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: code }).format(amount);
  } catch (err) {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function parseTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  const text = String(value).trim();
  if (!text) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
    return new Date(text);
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return new Date(`${text}Z`);
  }
  return new Date(text);
}

function formatTimestamp(value) {
  const date = parseTimestamp(value);
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", { hour12: false });
}

function formatTimestampParts(value) {
  const date = parseTimestamp(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString("en-GB"),
    time: date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
}

function isUnknownValue(value) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  return (
    normalized === "" ||
    normalized === "unknown" ||
    normalized === "n/a" ||
    normalized === "na" ||
    normalized === "none" ||
    normalized === "null" ||
    normalized === "undefined"
  );
}

function filterKnown(items, valueFn) {
  return (items || []).filter((item) => !isUnknownValue(valueFn(item)));
}

function getChartColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function renderDonutChart(target, items, totalLabel, totalOverride = null) {
  if (!target) return;
  const validItems = (items || []).filter((item) => (Number(item.count) || 0) > 0);
  const total = validItems.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const displayTotal =
    totalOverride === null || totalOverride === undefined ? total : Number(totalOverride) || 0;
  if (!validItems.length || total <= 0) {
    target.style.background = "conic-gradient(#e2e8f0 0deg, #e2e8f0 360deg)";
    target.innerHTML = `
      <div class="admin-chart-center">
        <div class="admin-chart-value">-</div>
        <div class="admin-chart-label">${escapeHtml(totalLabel)}</div>
      </div>
    `;
    target.classList.add("is-empty");
    return;
  }
  let start = 0;
  const segments = validItems.map((item, index) => {
    const count = Number(item.count) || 0;
    const pct = count / total;
    const end = start + pct * 360;
    const color = getChartColor(index);
    const segment = `${color} ${start}deg ${end}deg`;
    start = end;
    return segment;
  });
  target.style.background = `conic-gradient(${segments.join(", ")})`;
  target.innerHTML = `
    <div class="admin-chart-center">
      <div class="admin-chart-value">${escapeHtml(String(displayTotal))}</div>
      <div class="admin-chart-label">${escapeHtml(totalLabel)}</div>
    </div>
  `;
  target.classList.remove("is-empty");
}

function setStatus(target, message, isError = false) {
  if (!target) return;
  target.textContent = message || "";
  target.className = isError ? "status error" : "status";
}

function setAdminInfo(message, isError = false) {
  adminInfo.textContent = message;
  adminInfo.className = isError ? "pill ghost error" : "pill ghost";
  if (adminHint) {
    adminHint.textContent = isError ? "Access denied" : "Admin only";
  }
}

function setLocked(isLocked) {
  state.locked = isLocked;
  const panels = document.querySelectorAll(".admin-panel");
  panels.forEach((panel) => {
    panel.classList.toggle("is-disabled", isLocked);
  });
}

function loadStoredUser() {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (err) {
    return null;
  }
}

function syncHeader(user) {
  if (window.HeaderUI && window.HeaderUI.setUser) {
    window.HeaderUI.setUser(user);
  }
}

function handleAuthError(error) {
  if (error && (error.status === 401 || error.status === 403)) {
    setAdminInfo("Admin access required. Please log in.", true);
    setLocked(true);
    setStatus(productStatus, "Access denied.", true);
    setStatus(shopStatus, "Access denied.", true);
    setStatus(userStatus, "Access denied.", true);
    setStatus(insightStatus, "Access denied.", true);
    setStatus(scrapeStatus, "Access denied.", true);
    return true;
  }
  return false;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  if (response.ok) {
    if (response.status === 204) return null;
    return response.json();
  }
  let detail = "Request failed";
  try {
    const data = await response.json();
    if (data && data.detail) {
      detail = data.detail;
    }
  } catch (err) {
    // ignore invalid json
  }
  const error = new Error(detail);
  error.status = response.status;
  throw error;
}

function renderStats(stats) {
  statProducts.textContent = stats ? String(stats.product_count) : "-";
  statShops.textContent = stats ? String(stats.shop_count) : "-";
  if (statPrices) {
    statPrices.textContent = stats ? String(stats.price_count) : "-";
  }
  statUsers.textContent = stats ? String(stats.user_count) : "-";
  if (stats && stats.latest_price_at) {
    const parts = formatTimestampParts(stats.latest_price_at);
    if (parts) {
      statLatest.innerHTML = `
        <span class="stat-date">${escapeHtml(parts.date)}</span>
        <span class="stat-time">${escapeHtml(parts.time)}</span>
      `;
    } else {
      statLatest.textContent = "-";
    }
  } else {
    statLatest.textContent = "-";
  }
}

function renderBreakdown(target, items, labelFn, metaFn, colorFn, barWidthFn) {
  if (!items || !items.length) {
    target.innerHTML = "<div class=\"admin-empty\">No data yet.</div>";
    return;
  }
  const total = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  target.innerHTML = items
    .map((item, index) => {
      const count = Number(item.count) || 0;
      const pct = total ? Math.round((count / total) * 100) : 0;
      const barPctRaw = barWidthFn ? barWidthFn(item, pct, total) : pct;
      const barPct = Math.min(100, Math.max(0, Number(barPctRaw) || 0));
      const label = labelFn(item);
      const meta = metaFn(item, pct);
      const color = colorFn ? colorFn(item, index) : "";
      const swatch = color
        ? `<span class="admin-swatch" style="background: ${color};"></span>`
        : "";
      return `
        <div class="admin-insight-row">
          <div>
            <div class="admin-insight-label">${swatch}${escapeHtml(label)}</div>
            <div class="admin-insight-meta">${escapeHtml(meta)}</div>
          </div>
          <div class="admin-bar">
            <span class="admin-bar-fill" style="width: ${barPct}%;"></span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderInsights(data) {
  const storeItems = filterKnown(
    data && data.prices_by_store ? data.prices_by_store : [],
    (item) => item.store
  ).filter((item) => (Number(item.count) || 0) > 0);
  if (storeCoverageKpi) {
    const totalPrices = storeItems.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    storeCoverageKpi.textContent = storeItems.length
      ? `Active stores: ${storeItems.length} | Prices: ${totalPrices}`
      : "No coverage data yet.";
  }
  renderDonutChart(storeChart, storeItems, "Stores", storeItems.length);
  renderBreakdown(
    storeBreakdown,
    storeItems,
    (item) => displayStore(item.store),
    (item) => {
      const latest = item.latest_price_at ? `Latest ${formatTimestamp(item.latest_price_at)}` : "No updates yet";
      return `${item.count} prices - ${latest}`;
    },
    (item, index) => getChartColor(index),
    () => 100
  );
}

function updateScrapeUI(status) {
  if (!scrapeProgress || !scrapeProgressFill || !scrapeProgressText) return;
  const running = Boolean(status && status.running);
  const total = Number(status && status.total) || 0;
  const completed = Number(status && status.completed) || 0;
  const percent = total ? Math.min(100, Math.round((completed / total) * 100)) : running ? 8 : 0;
  scrapeProgressFill.style.width = `${percent}%`;

  if (running) {
    scrapeWasRunning = true;
    if (scrapeHideTimer) {
      clearTimeout(scrapeHideTimer);
      scrapeHideTimer = null;
    }
    const store = status && status.current_store ? displayStore(status.current_store) : "Starting";
    scrapeProgressText.textContent = total
      ? `Scraping ${store} (${completed}/${total})`
      : "Scraping...";
    scrapeProgress.classList.remove("is-hidden");
    setStatus(scrapeStatus);
    if (runScrapeBtn) runScrapeBtn.disabled = true;
    return;
  }

  if (status && status.started_at) {
    const finishText = status.finished_at ? formatTimestamp(status.finished_at) : "just now";
    const hasError = Boolean(status.last_error);
    const errorText = hasError ? "Scrape finished with errors." : "Scrape completed.";
    scrapeProgressText.textContent =
      finishText === "just now" ? `${errorText} Finished just now.` : `${errorText} Finished ${finishText}.`;
    scrapeProgressFill.style.width = "100%";
    scrapeProgress.classList.remove("is-hidden");
    if (hasError) {
      setStatus(scrapeStatus, "Scrape finished with errors.", true);
    } else {
      setStatus(scrapeStatus, "");
    }
    if (scrapeWasRunning) {
      const modalMessage = hasError
        ? "Scrape finished with errors."
        : "Scrape completed successfully.";
      openScrapeModal(modalMessage);
      scrapeWasRunning = false;
    }
    if (!scrapeHideTimer) {
      scrapeHideTimer = setTimeout(() => {
        scrapeProgress.classList.add("is-hidden");
        scrapeHideTimer = null;
      }, 5000);
    }
  } else {
    scrapeProgress.classList.add("is-hidden");
  }

  if (runScrapeBtn) runScrapeBtn.disabled = false;
}

function stopScrapePolling() {
  if (scrapePollTimer) {
    clearInterval(scrapePollTimer);
    scrapePollTimer = null;
  }
}

async function pollScrapeStatus() {
  try {
    const status = await apiRequest("/admin/scrape/status");
    updateScrapeUI(status);
    if (!status || !status.running) {
      stopScrapePolling();
    }
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(scrapeStatus, err.message || "Failed to load scrape status", true);
    }
    stopScrapePolling();
  }
}

function startScrapePolling() {
  stopScrapePolling();
  scrapePollTimer = setInterval(pollScrapeStatus, 2000);
  pollScrapeStatus();
}

async function loadScrapeStatus() {
  try {
    const status = await apiRequest("/admin/scrape/status");
    updateScrapeUI(status);
    if (status && status.running) {
      startScrapePolling();
    }
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(scrapeStatus, err.message || "Failed to load scrape status", true);
    }
  }
}

function getProductPageCount() {
  if (!state.productTotal) return 1;
  return Math.max(1, Math.ceil(state.productTotal / state.productPageSize));
}

function buildPageRange(current, total) {
  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i += 1) {
      pages.push(i);
    }
    return pages;
  }
  pages.push(1);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) {
    pages.push("...");
  }
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }
  if (end < total - 1) {
    pages.push("...");
  }
  pages.push(total);
  return pages;
}

function renderProductPagination() {
  if (!productPagination || !productPageList || !productPageInfo) return;
  const totalPages = getProductPageCount();
  const shouldHide = totalPages <= 1 && state.productTotal <= state.productPageSize;
  productPagination.classList.toggle("is-hidden", shouldHide);
  if (productPrevBtn) productPrevBtn.disabled = state.productPage <= 1;
  if (productNextBtn) productNextBtn.disabled = state.productPage >= totalPages;
  productPageInfo.textContent = `Page ${state.productPage} of ${totalPages}`;
  const pages = buildPageRange(state.productPage, totalPages);
  productPageList.innerHTML = pages
    .map((page) => {
      if (page === "...") {
        return "<span class=\"page-ellipsis\">...</span>";
      }
      const isActive = page === state.productPage;
      const activeClass = isActive ? " is-active" : "";
      return `
        <button class="button-pill page-btn${activeClass}" type="button" data-page="${page}">
          ${page}
        </button>
      `;
    })
    .join("");
}

function scrollToProductsPanel() {
  if (!productsPanel) return;
  productsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderProducts() {
  if (!state.products.length) {
    productTable.innerHTML = "<div class=\"admin-empty\">No products found.</div>";
    return;
  }
  productTable.innerHTML = `
    <div class="admin-row head products">
      <span>SKU</span>
      <span>Product</span>
      <span>Category</span>
      <span>Brand</span>
      <span>Actions</span>
    </div>
    ${state.products
      .map((product) => {
        const imageRaw =
          product.image_url || (Array.isArray(product.image_urls) ? product.image_urls[0] : "");
        const imageUrl = sanitizeUrl(imageRaw);
        const thumb = imageUrl
          ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name || "")}" loading="lazy" />`
          : "<span>no image</span>";
        const brand = product.brand ? escapeHtml(product.brand) : "-";
        return `
          <div class="admin-row products" data-sku="${escapeHtml(product.sku)}">
            <span>${escapeHtml(product.sku)}</span>
            <span>
              <div class="admin-product">
                <div class="admin-thumb">${thumb}</div>
                <div>
                  <div class="admin-product-name">${escapeHtml(product.name)}</div>
                  <div class="admin-product-meta">${brand}</div>
                </div>
              </div>
            </span>
            <span><span class="admin-tag">${escapeHtml(product.category)}</span></span>
            <span>${brand}</span>
            <span class="admin-actions">
              <button class="button-pill" data-action="edit">Edit</button>
              <button class="button-pill danger" data-action="delete">Delete</button>
            </span>
          </div>
        `;
      })
      .join("")}
  `;
}

function renderShops() {
  if (!state.shops.length) {
    shopTable.innerHTML = "<div class=\"admin-empty\">No shops configured.</div>";
    return;
  }
  shopTable.innerHTML = `
    <div class="admin-row head shops">
      <span>Code</span>
      <span>Name</span>
      <span>Actions</span>
    </div>
    ${state.shops
      .map((shop) => {
        return `
          <div class="admin-row shops" data-code="${escapeHtml(shop.code)}">
            <span><span class="admin-tag">${escapeHtml(shop.code)}</span></span>
            <span>${escapeHtml(shop.name)}</span>
            <span class="admin-actions">
              <button class="button-pill" data-action="edit">Edit</button>
              <button class="button-pill danger" data-action="delete">Delete</button>
            </span>
          </div>
        `;
      })
      .join("")}
  `;
}

function renderUsers() {
  if (!state.users.length) {
    userTable.innerHTML = "<div class=\"admin-empty\">No users found.</div>";
    return;
  }
  userTable.innerHTML = `
    <div class="admin-row head users">
      <span>Email</span>
      <span>Name</span>
      <span>Role</span>
      <span>Created</span>
      <span>Actions</span>
    </div>
    ${state.users
      .map((user) => {
        const roleClass = user.role === "admin" ? "admin" : "user";
        return `
          <div class="admin-row users" data-id="${escapeHtml(user.id)}">
            <span class="admin-cell-strong">${escapeHtml(user.email)}</span>
            <span>${escapeHtml(user.name || "-")}</span>
            <span><span class="admin-tag ${roleClass}">${escapeHtml(user.role)}</span></span>
            <span>${escapeHtml(formatTimestamp(user.created_at))}</span>
            <span class="admin-actions">
              <button class="button-pill" data-action="edit">Edit</button>
              <button class="button-pill danger" data-action="delete">Delete</button>
            </span>
          </div>
        `;
      })
      .join("")}
  `;
}

function openProductEditor(product) {
  state.editingProduct = product || null;
  productEditor.classList.remove("is-hidden");
  if (product) {
    productFormTitle.textContent = "Update product";
    productFormSubtitle.textContent = `Editing ${product.sku}`;
    productSku.value = product.sku || "";
    productSku.setAttribute("disabled", "true");
    productName.value = product.name || "";
    productCategory.value = product.category || "smartphone";
    productBrand.value = product.brand || "";
    productImage.value = product.image_url || "";
    productImages.value = Array.isArray(product.image_urls) ? product.image_urls.join(", ") : "";
  } else {
    productFormTitle.textContent = "Create product";
    productFormSubtitle.textContent = "Add a new SKU to the catalog.";
    productSku.removeAttribute("disabled");
    productForm.reset();
    productCategory.value = "smartphone";
  }
}

function closeProductEditor() {
  state.editingProduct = null;
  productEditor.classList.add("is-hidden");
  productForm.reset();
  productSku.removeAttribute("disabled");
}

function openShopEditor(shop) {
  state.editingShop = shop || null;
  shopEditor.classList.remove("is-hidden");
  if (shop) {
    shopFormTitle.textContent = "Update shop";
    shopFormSubtitle.textContent = `Editing ${shop.code}`;
    shopCode.value = shop.code;
    shopCode.setAttribute("disabled", "true");
    shopName.value = shop.name || "";
  } else {
    shopFormTitle.textContent = "Create shop";
    shopFormSubtitle.textContent = "Add or update a retail source.";
    shopForm.reset();
    shopCode.removeAttribute("disabled");
  }
}

function closeShopEditor() {
  state.editingShop = null;
  shopEditor.classList.add("is-hidden");
  shopForm.reset();
  shopCode.removeAttribute("disabled");
}

function openUserEditor(user) {
  state.editingUser = user || null;
  userEditor.classList.remove("is-hidden");
  userPassword.value = "";
  if (user) {
    userFormTitle.textContent = "Update user";
    userFormSubtitle.textContent = `Editing ${user.email}`;
    userEmail.value = user.email || "";
    userEmail.setAttribute("disabled", "true");
    userName.value = user.name || "";
    userRole.value = user.role || "user";
    userPassword.placeholder = "Leave blank to keep current password";
  } else {
    userFormTitle.textContent = "Create user";
    userFormSubtitle.textContent = "Add a new account to the platform.";
    userForm.reset();
    userEmail.removeAttribute("disabled");
    userRole.value = "user";
    userPassword.placeholder = "Set password (min 8 chars)";
  }
}

function closeUserEditor() {
  state.editingUser = null;
  userEditor.classList.add("is-hidden");
  userForm.reset();
  userEmail.removeAttribute("disabled");
}

function parseImageUrls(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function openConfirm(title, message, action) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  state.confirmAction = action;
  confirmModal.classList.add("is-open");
}

function closeConfirm() {
  confirmModal.classList.remove("is-open");
  state.confirmAction = null;
}

function openScrapeModal(message) {
  if (!scrapeModal || !scrapeModalMessage) return;
  scrapeModalMessage.textContent = message;
  scrapeModal.classList.add("is-open");
}

function closeScrapeModal() {
  if (!scrapeModal) return;
  scrapeModal.classList.remove("is-open");
}

async function loadStats() {
  try {
    const stats = await apiRequest("/admin/stats");
    renderStats(stats);
  } catch (err) {
    if (!handleAuthError(err)) {
      renderStats(null);
      setAdminInfo(err.message || "Failed to load stats", true);
    }
  }
}

async function loadInsights() {
  setStatus(insightStatus, "Loading...");
  try {
    const data = await apiRequest("/admin/insights?limit=8");
    renderInsights(data);
    setStatus(insightStatus, "");
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(insightStatus, err.message || "Failed to load insights", true);
      storeBreakdown.innerHTML = "<div class=\"admin-empty\">Failed to load insights.</div>";
      if (storeCoverageKpi) {
        storeCoverageKpi.textContent = "Coverage data unavailable.";
      }
    }
  }
}

async function loadProducts(query = state.productQuery, page = state.productPage) {
  setStatus(productStatus, "Loading...");
  const normalizedQuery = String(query || "").trim();
  const targetPage = Math.max(1, Number(page) || 1);
  state.productQuery = normalizedQuery;
  state.productPage = targetPage;
  const offset = (state.productPage - 1) * state.productPageSize;
  const params = new URLSearchParams({
    limit: String(state.productPageSize),
    offset: String(offset),
  });
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }
  try {
    const response = await apiRequest(`/admin/products?${params.toString()}`);
    state.products = Array.isArray(response.items) ? response.items : [];
    state.productTotal = Number(response.total) || 0;
    const totalPages = getProductPageCount();
    if (state.productTotal > 0 && state.productPage > totalPages) {
      await loadProducts(state.productQuery, totalPages);
      return;
    }
    if (state.productTotal > 0) {
      const start = offset + 1;
      const end = offset + state.products.length;
      productMeta.textContent = `Showing ${start}-${end} of ${state.productTotal}`;
    } else {
      productMeta.textContent = "No products found.";
    }
    setStatus(productStatus, "");
    renderProducts();
    renderProductPagination();
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(productStatus, err.message || "Failed to load products", true);
      productTable.innerHTML = "<div class=\"admin-empty\">Failed to load products.</div>";
    }
  }
}

async function loadShops() {
  setStatus(shopStatus, "Loading...");
  try {
    const response = await apiRequest("/admin/shops");
    state.shops = Array.isArray(response.items) ? response.items : [];
    shopMeta.textContent = `Showing ${state.shops.length} shops`;
    setStatus(shopStatus, "");
    renderShops();
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(shopStatus, err.message || "Failed to load shops", true);
      shopTable.innerHTML = "<div class=\"admin-empty\">Failed to load shops.</div>";
    }
  }
}

async function loadUsers(query = "") {
  setStatus(userStatus, "Loading...");
  try {
    const response = await apiRequest(
      `/admin/users?q=${encodeURIComponent(query)}&limit=50&offset=0`
    );
    state.users = Array.isArray(response.items) ? response.items : [];
    state.userTotal = Number(response.total) || state.users.length;
    userMeta.textContent = `Showing ${state.users.length} of ${state.userTotal}`;
    setStatus(userStatus, "");
    renderUsers();
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(userStatus, err.message || "Failed to load users", true);
      userTable.innerHTML = "<div class=\"admin-empty\">Failed to load users.</div>";
    }
  }
}

async function runScrape() {
  if (state.locked || !runScrapeBtn) return;
  runScrapeBtn.disabled = true;
  setStatus(scrapeStatus, "Starting scrape...");
  try {
    const response = await apiRequest("/admin/scrape", { method: "POST" });
    if (response && response.status === "running") {
      setStatus(scrapeStatus, response.message || "Scrape already running.");
    } else {
      setStatus(scrapeStatus, response.message || "Scrape started.");
    }
    startScrapePolling();
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(scrapeStatus, err.message || "Scrape failed", true);
    }
  } finally {
    runScrapeBtn.disabled = false;
  }
}

async function handleProductSave(event) {
  event.preventDefault();
  if (state.locked) return;
  const skuValue = productSku.value.trim();
  const payload = {
    name: productName.value.trim(),
    category: productCategory.value,
    brand: productBrand.value.trim() || null,
    image_url: productImage.value.trim() || null,
    image_urls: parseImageUrls(productImages.value),
  };
  if (!payload.name) {
    setStatus(productStatus, "Name is required.", true);
    return;
  }
  try {
    if (state.editingProduct) {
      await apiRequest(`/admin/products/${encodeURIComponent(state.editingProduct.sku)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setStatus(productStatus, "Product updated.");
    } else {
      if (!skuValue) {
        setStatus(productStatus, "SKU is required.", true);
        return;
      }
      await apiRequest("/admin/products", {
        method: "POST",
        body: JSON.stringify({ ...payload, sku: skuValue }),
      });
      setStatus(productStatus, "Product created.");
    }
    closeProductEditor();
    await loadProducts(state.productQuery, state.productPage);
    await loadStats();
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(productStatus, err.message || "Save failed", true);
    }
  }
}

async function handleShopSave(event) {
  event.preventDefault();
  if (state.locked) return;
  const codeValue = shopCode.value;
  const payload = { name: shopName.value.trim() };
  if (!payload.name) {
    setStatus(shopStatus, "Name is required.", true);
    return;
  }
  try {
    if (state.editingShop) {
      await apiRequest(`/admin/shops/${encodeURIComponent(state.editingShop.code)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setStatus(shopStatus, "Shop updated.");
    } else {
      await apiRequest("/admin/shops", {
        method: "POST",
        body: JSON.stringify({ ...payload, code: codeValue }),
      });
      setStatus(shopStatus, "Shop created.");
    }
    closeShopEditor();
    await loadShops();
    await loadStats();
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(shopStatus, err.message || "Save failed", true);
    }
  }
}

async function handleUserSave(event) {
  event.preventDefault();
  if (state.locked) return;
  const emailValue = userEmail.value.trim().toLowerCase();
  const nameValue = userName.value.trim();
  const roleValue = userRole.value;
  const passwordValue = userPassword.value.trim();
  try {
    if (state.editingUser) {
      const payload = {};
      if ((state.editingUser.name || "") !== nameValue) {
        payload.name = nameValue || null;
      }
      if ((state.editingUser.role || "user") !== roleValue) {
        payload.role = roleValue;
      }
      if (passwordValue) {
        payload.password = passwordValue;
      }
      if (!Object.keys(payload).length) {
        setStatus(userStatus, "No changes supplied.", true);
        return;
      }
      await apiRequest(`/admin/users/${encodeURIComponent(state.editingUser.id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setStatus(userStatus, "User updated.");
    } else {
      if (!emailValue) {
        setStatus(userStatus, "Email is required.", true);
        return;
      }
      if (!passwordValue) {
        setStatus(userStatus, "Password is required.", true);
        return;
      }
      await apiRequest("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: nameValue || null,
          role: roleValue,
          email: emailValue,
          password: passwordValue,
        }),
      });
      setStatus(userStatus, "User created.");
    }
    closeUserEditor();
    await loadUsers(userSearch.value.trim());
    await loadStats();
  } catch (err) {
    if (!handleAuthError(err)) {
      setStatus(userStatus, err.message || "Save failed", true);
    }
  }
}

productSearchBtn.addEventListener("click", () => {
  loadProducts(productSearch.value.trim(), 1);
});

productSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadProducts(productSearch.value.trim(), 1);
  }
});

productNewBtn.addEventListener("click", () => {
  openProductEditor(null);
});

productCancelBtn.addEventListener("click", () => {
  closeProductEditor();
});

productForm.addEventListener("submit", handleProductSave);

if (productPrevBtn) {
  productPrevBtn.addEventListener("click", () => {
    if (state.productPage > 1) {
      loadProducts(state.productQuery, state.productPage - 1);
      scrollToProductsPanel();
    }
  });
}

if (productNextBtn) {
  productNextBtn.addEventListener("click", () => {
    const totalPages = getProductPageCount();
    if (state.productPage < totalPages) {
      loadProducts(state.productQuery, state.productPage + 1);
      scrollToProductsPanel();
    }
  });
}

if (productPagination) {
  productPagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button) return;
    const page = Number(button.dataset.page);
    if (!Number.isFinite(page) || page === state.productPage) return;
    loadProducts(state.productQuery, page);
    scrollToProductsPanel();
  });
}

if (runScrapeBtn) {
  runScrapeBtn.addEventListener("click", () => {
    runScrape();
  });
}

productTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const row = event.target.closest(".admin-row");
  if (!row) return;
  const sku = row.getAttribute("data-sku");
  const product = state.products.find((item) => item.sku === sku);
  if (!product) return;
  if (button.dataset.action === "edit") {
    openProductEditor(product);
  }
  if (button.dataset.action === "delete") {
    openConfirm(
      "Delete product",
      `Remove ${product.name || product.sku} and its prices?`,
      async () => {
        try {
          await apiRequest(`/admin/products/${encodeURIComponent(product.sku)}`, {
            method: "DELETE",
          });
          setStatus(productStatus, "Product deleted.");
          await loadProducts(state.productQuery, state.productPage);
          await loadStats();
        } catch (err) {
          if (!handleAuthError(err)) {
            setStatus(productStatus, err.message || "Delete failed", true);
          }
        }
      }
    );
  }
});

shopNewBtn.addEventListener("click", () => {
  openShopEditor(null);
});

shopCancelBtn.addEventListener("click", () => {
  closeShopEditor();
});

shopForm.addEventListener("submit", handleShopSave);

shopTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const row = event.target.closest(".admin-row");
  if (!row) return;
  const code = row.getAttribute("data-code");
  const shop = state.shops.find((item) => item.code === code);
  if (!shop) return;
  if (button.dataset.action === "edit") {
    openShopEditor(shop);
  }
  if (button.dataset.action === "delete") {
    openConfirm(
      "Delete shop",
      `Remove ${shop.name} and all its prices?`,
      async () => {
        try {
          await apiRequest(`/admin/shops/${encodeURIComponent(shop.code)}`, {
            method: "DELETE",
          });
          setStatus(shopStatus, "Shop deleted.");
          await loadShops();
          await loadStats();
        } catch (err) {
          if (!handleAuthError(err)) {
            setStatus(shopStatus, err.message || "Delete failed", true);
          }
        }
      }
    );
  }
});

userSearchBtn.addEventListener("click", () => {
  loadUsers(userSearch.value.trim());
});

userSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadUsers(userSearch.value.trim());
  }
});

userNewBtn.addEventListener("click", () => {
  openUserEditor(null);
});

userCancelBtn.addEventListener("click", () => {
  closeUserEditor();
});

userForm.addEventListener("submit", handleUserSave);

userTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const row = event.target.closest(".admin-row");
  if (!row) return;
  const userId = row.getAttribute("data-id");
  const user = state.users.find((item) => item.id === userId);
  if (!user) return;
  if (button.dataset.action === "edit") {
    openUserEditor(user);
  }
  if (button.dataset.action === "delete") {
    openConfirm(
      "Delete user",
      `Remove ${user.email} from the platform?`,
      async () => {
        try {
          await apiRequest(`/admin/users/${encodeURIComponent(user.id)}`, {
            method: "DELETE",
          });
          setStatus(userStatus, "User deleted.");
          await loadUsers(userSearch.value.trim());
          await loadStats();
        } catch (err) {
          if (!handleAuthError(err)) {
            setStatus(userStatus, err.message || "Delete failed", true);
          }
        }
      }
    );
  }
});

confirmCancel.addEventListener("click", closeConfirm);
confirmOk.addEventListener("click", async () => {
  const action = state.confirmAction;
  closeConfirm();
  if (action) {
    await action();
  }
});

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirm();
  }
});

if (scrapeModalOk) {
  scrapeModalOk.addEventListener("click", closeScrapeModal);
}

if (scrapeModal) {
  scrapeModal.addEventListener("click", (event) => {
    if (event.target === scrapeModal) {
      closeScrapeModal();
    }
  });
}

const storedUser = loadStoredUser();
if (storedUser) {
  syncHeader(storedUser);
  if (storedUser.role === "admin") {
    setAdminInfo(`Logged in as ${storedUser.email}`, false);
  } else {
    setAdminInfo("Only admin can view this page.", true);
    setLocked(true);
  }
} else {
  setAdminInfo("You are not logged in.", true);
  setLocked(true);
}

if (window.HeaderUI && window.HeaderUI.refresh) {
  window.HeaderUI.refresh();
}

loadStats();
loadInsights();
loadScrapeStatus();
loadProducts();
loadShops();
loadUsers();
