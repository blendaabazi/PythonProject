const app = document.getElementById("app");
app.innerHTML = `
<div class="background"></div>
  <div class="noise"></div>
  
  

  <main class="shell main-grid">
    <section class="hero glass">
      <div>
        <p class="eyebrow">Price Intelligence</p>
        <h1>Find the lowest iPhone deal.</h1>
        <p class="lede">Compare prices from Neptun, GjirafaMall, Aztech, and ShopAz in real time.</p>
        <div class="controls">
          <div class="controls-row primary">
            <input id="searchInput" type="search" placeholder='Search e.g. "iphone 15 pro max"' />
            <button id="searchBtn">Search</button>
            <button id="refreshBtn" class="ghost">Refresh</button>
          </div>
          <div class="controls-row secondary">
            <select id="storeFilter">
              <option value="all">All stores</option>
            </select>
            <select id="sortSelect">
              <option value="default">Sort: Default</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name-asc">Name: A-Z</option>
              <option value="name-desc">Name: Z-A</option>
            </select>
            <span id="status" class="status"></span>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Products</div>
        <div class="stat-value" id="productCount">-</div>
        <div class="stat-foot">Select a product to see offers</div>
      </div>
    </section>

    <section class="list glass">
      <div class="section-head">
        <h2>iPhone across providers</h2>
      </div>
      <div id="products" class="product-grid empty">Loading...</div>
    </section>

    <section class="panel glass">
      <div class="section-head">
        <div>
          <p class="eyebrow">Offers</p>
          <h3 id="selectedProduct">Select a product</h3>
        </div>
        <div id="cheapest" class="pill ghost"></div>
      </div>
      <div id="prices" class="prices empty">No product selected.</div>
    </section>
  </main>

  <footer class="shell footer">
    <div>Powered by FastAPI + MongoDB Atlas + BeautifulSoup</div>
    <div>UI insp. Vercel clean + Made for KS market</div>
  </footer>

  <div id="logoutModal" class="modal-backdrop" aria-hidden="true">
    <div class="modal">
      <div class="modal-title">Confirm logout</div>
      <p>Are you sure you want to log out?</p>
      <div class="modal-actions">
        <button id="logoutCancel" class="ghost" type="button">Cancel</button>
        <button id="logoutConfirm" type="button">Log out</button>
      </div>
    </div>
  </div>
`;

const productsEl = document.getElementById("products");
    const pricesEl = document.getElementById("prices");
    const statusEl = document.getElementById("status");
    const productCountEl = document.getElementById("productCount");
    const selectedProductEl = document.getElementById("selectedProduct");
    const cheapestEl = document.getElementById("cheapest");
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const refreshBtn = document.getElementById("refreshBtn");
    const storeFilter = document.getElementById("storeFilter");
    const sortSelect = document.getElementById("sortSelect");
    const logoutModal = document.getElementById("logoutModal");
    const logoutCancel = document.getElementById("logoutCancel");
    const logoutConfirm = document.getElementById("logoutConfirm");
    const storageKey = "pc_user";
    let currentUser = null;
    let allProducts = [];

    const apiBase = "";
    const storeNames = {
      gjirafamall: "Gjirafa",
      neptun: "Neptun",
      aztech: "Aztech",
      shopaz: "ShopAz",
      tecstore: "TecStore",
    };

    function storeLabelFromCode(code) {
      return storeNames[code] || code || "Unknown";
    }

    function updateStoreFilterOptions(items) {
      const current = storeFilter.value;
      const storeCodes = new Set();
      items.forEach((item) => {
        const stores = Array.isArray(item.stores) ? item.stores : [];
        stores.forEach((code) => storeCodes.add(code));
      });
      const sortedCodes = Array.from(storeCodes).sort((a, b) =>
        storeLabelFromCode(a).localeCompare(storeLabelFromCode(b))
      );
      const options = [
        '<option value="all">All stores</option>',
        ...sortedCodes.map(
          (code) => `<option value="${code}">${storeLabelFromCode(code)}</option>`
        ),
      ];
      storeFilter.innerHTML = options.join("");
      if (current && sortedCodes.includes(current)) {
        storeFilter.value = current;
      } else {
        storeFilter.value = "all";
      }
    }

    function setStatus(text, isError = false) {
      statusEl.textContent = text || "";
      statusEl.className = isError ? "status error" : "status";
    }

    function escapeHtml(value) {
      return String(value)
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

    function normalizeImage(url, productUrl) {
      if (!url) return "";
      const trimmed = String(url).trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      if (trimmed.startsWith("//")) return `https:${trimmed}`;
      if (trimmed.startsWith("/") && productUrl) {
        try {
          const origin = new URL(productUrl).origin;
          return `${origin}${trimmed}`;
        } catch (err) {
          return "";
        }
      }
      return "";
    }

    function renderProducts(items) {
      productsEl.classList.remove("empty");
      if (!items.length) {
        productsEl.innerHTML = "<div class='empty-note'>No products.</div>";
        productCountEl.textContent = "0";
        return;
      }
      productCountEl.textContent = items.length;
      const storeBadgeMap = {
        gjirafamall: { label: "Gjirafa", cls: "store-badge gjirafa" },
        neptun: { label: "Neptun", cls: "store-badge neptun" },
        aztech: { label: "Aztech", cls: "store-badge aztech" },
        shopaz: { label: "ShopAz", cls: "store-badge shopaz" },
        tecstore: { label: "TecStore", cls: "store-badge tecstore" },
      };
      const storeBadges = (stores) => {
        const list = Array.isArray(stores) ? stores : [];
        const unique = Array.from(new Set(list));
        const badges = unique.map((code) => storeBadgeMap[code]).filter(Boolean);
        if (!badges.length && list.length) {
          return `<div class="store-badge other">Other shops</div>`;
        }
        if (!badges.length) {
          return `<div class="store-badge empty">No offers</div>`;
        }
        return badges
          .map((badge) => `<div class="${badge.cls}">${badge.label}</div>`)
          .join("");
      };
      productsEl.innerHTML = items
        .map((p) => {
          const badgeHtml = storeBadges(p.stores);
          const prices = Array.isArray(p.latest_prices) ? p.latest_prices : [];
          const rawImage = p.image_url || (Array.isArray(p.image_urls) ? p.image_urls[0] : "");
          const imageUrl = sanitizeUrl(rawImage);
          const imageHtml = imageUrl
            ? `<div class="product-image"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(
                p.name
              )}" loading="lazy" /></div>`
            : "<div class='product-image placeholder'><span>No image</span></div>";
      const priceHtml = prices.length
        ? prices
            .map((entry) => {
              const label = `${storeLabelFromCode(entry.store)}: ${formatPrice(entry)}`;
              const safeLabel = escapeHtml(label);
              const link = sanitizeUrl(entry.product_url);
              if (link) {
                return `<a class="price-chip ${entry.store}" href="${escapeHtml(
                  link
                )}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
              }
              return `<span class="price-chip ${entry.store}">${safeLabel}</span>`;
            })
            .join("")
        : "<span class='price-chip empty'>No prices</span>";
          const primaryUrl = prices.length ? sanitizeUrl(prices[0].product_url) : "";
          const normalizedImage = normalizeImage(rawImage, primaryUrl) || imageUrl;
          const saved = isSaved(p.sku);
          const saveLabel = saved ? "Saved" : "Save";
          return `
          <article class="product-card" data-sku="${p.sku}" data-name="${p.name}" data-image="${escapeHtml(
        normalizedImage || ""
      )}" data-url="${escapeHtml(primaryUrl || "")}">
            <div class="card-meta">
              ${badgeHtml}
            </div>
            ${
              normalizedImage
                ? `<div class="product-image"><img src="${escapeHtml(
                    normalizedImage
                  )}" alt="${escapeHtml(p.name)}" loading="lazy" /></div>`
                : "<div class='product-image placeholder'><span>No image</span></div>"
            }
            <h3>${p.name}</h3>
            <div class="price-chips">${priceHtml}</div>
        <div class="card-actions">
          <button class="ghost save-btn" type="button" data-sku="${p.sku}">
            <span class="icon">&#10084;</span>
            <span class="save-label">${saveLabel}</span>
          </button>
        </div>
          </article>
        `;
        })
        .join("");
      productsEl.querySelectorAll(".product-card").forEach((card) => {
        const sku = card.dataset.sku;
        card.addEventListener("click", () => {
          window.location.href = `/product/${encodeURIComponent(sku)}`;
        });
        card.querySelectorAll(".price-chip[href]").forEach((link) => {
          link.addEventListener("click", (event) => {
            event.stopPropagation();
          });
        });
        const saveButton = card.querySelector(".save-btn");
        if (saveButton) {
          saveButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const name = card.dataset.name;
            const imageUrl = card.dataset.image || "";
            const productUrl = card.dataset.url || "";
            toggleSaved(sku, name, imageUrl, productUrl, saveButton);
          });
        }
      });
    }

    function formatPrice(entry) {
      const symbol = (entry.currency || "EUR").toUpperCase() === "EUR" ? "€" : entry.currency;
      const formatter = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${formatter.format(entry.price)} ${symbol}`;
    }

    function renderPrices(name, entries) {
      selectedProductEl.textContent = name;
      pricesEl.classList.remove("empty");
      if (!entries.length) {
        pricesEl.innerHTML = "<div class='empty-note'>No offers found.</div>";
        cheapestEl.textContent = "";
        return;
      }
      const cheapest = entries.reduce((min, e) => (e.price < min.price ? e : min), entries[0]);
      cheapestEl.textContent = `Nga ${cheapest.store}: ${formatPrice(cheapest)}`;
      pricesEl.innerHTML = `
        <div class="price-table">
          <div class="price-row head">
            <span>Store</span>
            <span>Price</span>
            <span>Link</span>
            <span>Time</span>
          </div>
          ${entries
            .map((e) => {
              const link = sanitizeUrl(e.product_url);
              const storeText = escapeHtml(e.store);
              const priceText = escapeHtml(formatPrice(e));
              const storeHtml = link
                ? `<a class="price-link" href="${escapeHtml(
                    link
                  )}" target="_blank" rel="noopener noreferrer">${storeText}</a>`
                : storeText;
              const priceHtml = link
                ? `<a class="price-link" href="${escapeHtml(
                    link
                  )}" target="_blank" rel="noopener noreferrer">${priceText}</a>`
                : priceText;
              const linkHtml = link
                ? `<a class="price-link" href="${escapeHtml(
                    link
                  )}" target="_blank" rel="noopener noreferrer">Open</a>`
                : "-";
              return `
              <div class="price-row">
                <span>${storeHtml}</span>
                <span>${priceHtml}</span>
                <span>${linkHtml}</span>
                <span>${new Date(e.timestamp).toLocaleString()}</span>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
    }

    function minPriceFor(item) {
      const prices = Array.isArray(item.latest_prices) ? item.latest_prices : [];
      if (!prices.length) return null;
      return prices.reduce((min, entry) => (entry.price < min ? entry.price : min), prices[0].price);
    }

    function sortProducts(items, mode) {
      const sorted = items.slice();
      if (mode === "price-asc") {
        sorted.sort((a, b) => {
          const priceA = minPriceFor(a);
          const priceB = minPriceFor(b);
          if (priceA == null && priceB == null) return 0;
          if (priceA == null) return 1;
          if (priceB == null) return -1;
          return priceA - priceB;
        });
      } else if (mode === "price-desc") {
        sorted.sort((a, b) => {
          const priceA = minPriceFor(a);
          const priceB = minPriceFor(b);
          if (priceA == null && priceB == null) return 0;
          if (priceA == null) return 1;
          if (priceB == null) return -1;
          return priceB - priceA;
        });
      } else if (mode === "name-asc") {
        sorted.sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" })
        );
      } else if (mode === "name-desc") {
        sorted.sort((a, b) =>
          String(b.name || "").localeCompare(String(a.name || ""), "en", { sensitivity: "base" })
        );
      }
      return sorted;
    }

    function applyFilters() {
      const store = storeFilter.value;
      let items = allProducts.slice();
      if (store && store !== "all") {
        items = items.filter((product) => {
          const stores = Array.isArray(product.stores) ? product.stores : [];
          return stores.includes(store);
        });
      }
      items = sortProducts(items, sortSelect.value);
      renderProducts(items);
      setStatus(`Found ${items.length} products`);
    }

    async function loadProducts(query = "") {
      setStatus("Loading...");
      try {
        const url = `${apiBase}/products${query ? `?q=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        allProducts = Array.isArray(data) ? data : [];
        updateStoreFilterOptions(allProducts);
        applyFilters();
      } catch (err) {
        console.error(err);
        allProducts = [];
        updateStoreFilterOptions([]);
        setStatus("Error loading products", true);
        productsEl.innerHTML = "<div class='empty-note'>Products failed to load.</div>";
      }
    }

    async function loadPrices(sku, name) {
      setStatus(`Loading offers for ${name}...`);
      pricesEl.innerHTML = "<div class='empty-note'>Loading...</div>";
      try {
        const res = await fetch(`${apiBase}/products/${encodeURIComponent(sku)}/prices`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        renderPrices(name, data);
        setStatus(`Found ${data.length} offers`);
      } catch (err) {
        console.error(err);
        setStatus("Error loading product offers", true);
        pricesEl.innerHTML = "<div class='empty-note'>Offers failed to load.</div>";
      }
    }

    function savedKeyFor(user) {
      const email = user && user.email ? String(user.email).toLowerCase() : "";
      return email ? `pc_saved_${email}` : "pc_saved_guest";
    }

    function loadSavedItems(user) {
      const raw = localStorage.getItem(savedKeyFor(user));
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => {
              if (typeof item === "string") return { sku: item, name: item };
              if (item && item.sku)
                return {
                  sku: item.sku,
                  name: item.name || item.sku,
                  image_url: item.image_url || item.imageUrl || "",
                  product_url: item.product_url || item.productUrl || "",
                };
              return null;
            })
            .filter(Boolean);
        }
      } catch (err) {
        // ignore invalid payload
      }
      return [];
    }

    function persistSaved(items, user) {
      localStorage.setItem(savedKeyFor(user), JSON.stringify(items));
    }

    let savedItems = loadSavedItems(currentUser);

    function savedSet() {
      return new Set(savedItems.map((i) => i.sku));
    }

    function applyPendingSave(user) {
      if (!user) return;
      const raw = localStorage.getItem("pc_pending_save");
      if (!raw) return;
      try {
        const pending = JSON.parse(raw);
        if (!pending || !pending.sku) return;
        const exists = savedItems.some((i) => i.sku === pending.sku);
        if (!exists) {
          savedItems.push({
            sku: pending.sku,
            name: pending.name || pending.sku,
            image_url: pending.image_url || "",
            product_url: pending.product_url || "",
          });
          persistSaved(savedItems, user);
          setStatus("Saved product");
        }
      } catch (err) {
        // ignore parse errors
      } finally {
        localStorage.removeItem("pc_pending_save");
      }
    }

    function isSaved(sku) {
      return savedSet().has(sku);
    }

    function renderSavedList() {
      // Saved list is rendered on /saved page; no DOM updates needed here.
    }

    function removeSaved(sku) {
      savedItems = savedItems.filter((item) => item.sku !== sku);
      persistSaved(savedItems, currentUser);
      setStatus("Removed from saved");
    }

    function toggleSaved(sku, name, imageUrl, productUrl, btn) {
      if (!currentUser) {
        localStorage.setItem("pc_next", "/saved");
        localStorage.setItem(
          "pc_pending_save",
          JSON.stringify({ sku, name, image_url: imageUrl, product_url: productUrl })
        );
        window.location.href = "/login";
        return;
      }
      const isAlready = isSaved(sku);
      if (isAlready) {
        removeSaved(sku);
        if (btn) {
          const label = btn.querySelector(".save-label");
          if (label) label.textContent = "Save";
        }
      } else {
        savedItems.push({ sku, name, image_url: imageUrl, product_url: productUrl });
        persistSaved(savedItems, currentUser);
        if (btn) {
          const label = btn.querySelector(".save-label");
          if (label) label.textContent = "Saved";
        }
        setStatus("Saved product");
      }
      renderSavedList();
      syncHeaderSavedCount();
    }

    function refreshSaveButtons() {
      document.querySelectorAll(".save-btn").forEach((btn) => {
        const sku = btn.getAttribute("data-sku");
        const label = btn.querySelector(".save-label");
        if (label) {
          label.textContent = isSaved(sku) ? "Saved" : "Save";
        }
      });
    }

    function openLogoutModal() {
      logoutModal.classList.add("is-open");
      logoutModal.setAttribute("aria-hidden", "false");
    }

    function closeLogoutModal() {
      logoutModal.classList.remove("is-open");
      logoutModal.setAttribute("aria-hidden", "true");
    }

    window.handleHeaderLogout = openLogoutModal;

    logoutCancel.addEventListener("click", () => {
      closeLogoutModal();
    });

    logoutConfirm.addEventListener("click", () => {
      localStorage.removeItem(storageKey);
      currentUser = null;
      savedItems = loadSavedItems(currentUser);
      renderSavedList();
      refreshSaveButtons();
      syncHeaderSavedCount();
      setStatus("Logged out.");
      applyAuthState(null);
      window.location.reload();
    });

    logoutModal.addEventListener("click", (event) => {
      if (event.target === logoutModal) {
        closeLogoutModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (logoutModal.classList.contains("is-open")) {
          closeLogoutModal();
        }
      }
    });

    searchBtn.addEventListener("click", () => {
      loadProducts(searchInput.value.trim());
    });

    refreshBtn.addEventListener("click", () => {
      searchInput.value = "";
      loadProducts("");
    });

    storeFilter.addEventListener("change", () => {
      applyFilters();
    });

    sortSelect.addEventListener("change", () => {
      applyFilters();
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        loadProducts(searchInput.value.trim());
      }
    });

    function syncHeaderSavedCount() {
      if (window.HeaderUI && window.HeaderUI.setSavedCount) {
        window.HeaderUI.setSavedCount(savedItems.length);
      }
    }

    function applyAuthState(user) {
      currentUser = user || null;
      savedItems = loadSavedItems(currentUser);
      applyPendingSave(currentUser);
      renderSavedList();
      refreshSaveButtons();
      if (window.HeaderUI && window.HeaderUI.setUser) {
        window.HeaderUI.setUser(currentUser);
      }
      syncHeaderSavedCount();
      if (localStorage.getItem("pc_saved_notify")) {
        localStorage.removeItem("pc_saved_notify");
        syncHeaderSavedCount();
      }
    }

    const storedUser = localStorage.getItem(storageKey);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        applyAuthState(parsed);
      } catch (err) {
        applyAuthState(null);
      }
    } else {
      applyAuthState(null);
    }

    // Initial load filtered to iPhone
    loadProducts("iphone");
