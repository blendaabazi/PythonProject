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
          <div class="stat-label">Prices</div>
          <div class="stat-value" id="statPrices">-</div>
          <div class="stat-foot">Total observations</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Users</div>
          <div class="stat-value" id="statUsers">-</div>
          <div class="stat-foot">Registered accounts</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Latest price</div>
          <div class="stat-value" id="statLatest">-</div>
          <div class="stat-foot">Most recent update</div>
        </div>
      </div>
    </section>

    <section class="panel glass admin-panel" id="insightsPanel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Insights</p>
          <h3>Operational overview</h3>
          <p class="muted">Live mix of catalog health, coverage, and recent price movement.</p>
        </div>
        <div class="admin-toolbar">
          <span id="insightStatus" class="status"></span>
          <button id="refreshInsightsBtn" class="ghost" type="button">Refresh</button>
        </div>
      </div>

      <div class="admin-insights">
        <div class="admin-insight-card">
          <div class="admin-insight-title">Category mix</div>
          <div id="categoryBreakdown" class="admin-insight-list">Loading...</div>
        </div>
        <div class="admin-insight-card">
          <div class="admin-insight-title">Store coverage</div>
          <div id="storeBreakdown" class="admin-insight-list">Loading...</div>
        </div>
        <div class="admin-insight-card">
          <div class="admin-insight-title">Scheduler</div>
          <div id="systemSettings" class="admin-system-grid">Loading...</div>
        </div>
        <div class="admin-insight-card wide">
          <div class="admin-insight-title">Recent price updates</div>
          <div id="recentPrices" class="admin-timeline">Loading...</div>
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
const refreshInsightsBtn = document.getElementById("refreshInsightsBtn");
const categoryBreakdown = document.getElementById("categoryBreakdown");
const storeBreakdown = document.getElementById("storeBreakdown");
const systemSettings = document.getElementById("systemSettings");
const recentPrices = document.getElementById("recentPrices");

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

const state = {
  products: [],
  productTotal: 0,
  shops: [],
  users: [],
  userTotal: 0,
  editingProduct: null,
  editingShop: null,
  editingUser: null,
  confirmAction: null,
  locked: false,
};

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

function formatTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
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
  statPrices.textContent = stats ? String(stats.price_count) : "-";
  statUsers.textContent = stats ? String(stats.user_count) : "-";
  statLatest.textContent = stats ? formatTimestamp(stats.latest_price_at) : "-";
}

function renderBreakdown(target, items, labelFn, metaFn) {
  if (!items || !items.length) {
    target.innerHTML = "<div class=\"admin-empty\">No data yet.</div>";
    return;
  }
  const total = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  target.innerHTML = items
    .map((item) => {
      const count = Number(item.count) || 0;
      const pct = total ? Math.round((count / total) * 100) : 0;
      const label = labelFn(item);
      const meta = metaFn(item, pct);
      return `
        <div class="admin-insight-row">
          <div>
            <div class="admin-insight-label">${escapeHtml(label)}</div>
            <div class="admin-insight-meta">${escapeHtml(meta)}</div>
          </div>
          <div class="admin-bar">
            <span class="admin-bar-fill" style="width: ${pct}%;"></span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSystem(system) {
  if (!system) {
    systemSettings.innerHTML = "<div class=\"admin-empty\">No system data.</div>";
    return;
  }
  systemSettings.innerHTML = `
    <div class="admin-system-item">
      <span>Interval</span>
      <strong>${escapeHtml(`${system.scrape_interval_min} min`)}</strong>
    </div>
    <div class="admin-system-item">
      <span>On startup</span>
      <strong>${system.scrape_on_startup ? "Enabled" : "Disabled"}</strong>
    </div>
    <div class="admin-system-item">
      <span>Timeout</span>
      <strong>${escapeHtml(`${system.scrape_timeout_sec}s`)}</strong>
    </div>
    <div class="admin-system-item">
      <span>Retries</span>
      <strong>${escapeHtml(String(system.scrape_retries))}</strong>
    </div>
    <div class="admin-system-item">
      <span>Backoff</span>
      <strong>${escapeHtml(`${system.scrape_backoff_sec}s`)}</strong>
    </div>
    <div class="admin-system-item">
      <span>Delay</span>
      <strong>${escapeHtml(`${system.scrape_delay_sec}s`)}</strong>
    </div>
  `;
}

function renderRecentPrices(items) {
  if (!items || !items.length) {
    recentPrices.innerHTML = "<div class=\"admin-empty\">No recent price updates.</div>";
    return;
  }
  recentPrices.innerHTML = items
    .map((item) => {
      const name = item.name || item.sku || "Unknown SKU";
      const stockLabel = item.in_stock ? "In stock" : "Out of stock";
      const stockClass = item.in_stock ? "in" : "out";
      return `
        <div class="admin-timeline-item">
          <div>
            <div class="admin-timeline-title">${escapeHtml(name)}</div>
            <div class="admin-timeline-meta">
              ${escapeHtml(displayStore(item.store))} - ${escapeHtml(formatTimestamp(item.timestamp))}
            </div>
          </div>
          <div class="admin-timeline-right">
            <div class="admin-timeline-price">${escapeHtml(formatPrice(item.price, item.currency))}</div>
            <div class="admin-stock ${stockClass}">${stockLabel}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderInsights(data) {
  renderBreakdown(
    categoryBreakdown,
    data && data.products_by_category ? data.products_by_category : [],
    (item) => String(item.category || "unknown").replace(/-/g, " "),
    (item, pct) => `${item.count} items - ${pct}%`
  );
  renderBreakdown(
    storeBreakdown,
    data && data.prices_by_store ? data.prices_by_store : [],
    (item) => displayStore(item.store),
    (item) => {
      const latest = item.latest_price_at ? `Latest ${formatTimestamp(item.latest_price_at)}` : "No updates yet";
      return `${item.count} prices - ${latest}`;
    }
  );
  renderSystem(data ? data.system : null);
  renderRecentPrices(data ? data.recent_prices : []);
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
      categoryBreakdown.innerHTML = "<div class=\"admin-empty\">Failed to load insights.</div>";
      storeBreakdown.innerHTML = "<div class=\"admin-empty\">Failed to load insights.</div>";
      systemSettings.innerHTML = "<div class=\"admin-empty\">Failed to load insights.</div>";
      recentPrices.innerHTML = "<div class=\"admin-empty\">Failed to load insights.</div>";
    }
  }
}

async function loadProducts(query = "") {
  setStatus(productStatus, "Loading...");
  try {
    const response = await apiRequest(
      `/admin/products?q=${encodeURIComponent(query)}&limit=50&offset=0`
    );
    state.products = Array.isArray(response.items) ? response.items : [];
    state.productTotal = Number(response.total) || state.products.length;
    productMeta.textContent = `Showing ${state.products.length} of ${state.productTotal}`;
    setStatus(productStatus, "");
    renderProducts();
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
    await loadProducts(productSearch.value.trim());
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
  loadProducts(productSearch.value.trim());
});

productSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadProducts(productSearch.value.trim());
  }
});

productNewBtn.addEventListener("click", () => {
  openProductEditor(null);
});

productCancelBtn.addEventListener("click", () => {
  closeProductEditor();
});

productForm.addEventListener("submit", handleProductSave);

if (refreshInsightsBtn) {
  refreshInsightsBtn.addEventListener("click", () => {
    loadInsights();
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
          await loadProducts(productSearch.value.trim());
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
loadProducts();
loadShops();
loadUsers();
