const app = document.getElementById("app");
app.innerHTML = `
<div class="background"></div>
  <div class="noise"></div>
  
  

  <main class="shell main-grid">
    <section class="hero glass">
      <div>
        <p class="eyebrow">Price Intelligence</p>
        <h1>Gjej oferten me te lire per iPhone.</h1>
        <p class="lede">Krahaso cmimet nga Neptun, GjirafaMall, Aztech dhe ShopAz ne kohe reale.</p>
        <div class="controls">
          <input id="searchInput" type="search" placeholder='Kerko p.sh. "iphone 15 pro max"' />
          <button id="searchBtn">Kerko</button>
          <button id="refreshBtn" class="ghost">Rifresko</button>
          <button id="compareModeBtn" class="ghost compare-toggle">Krahaso</button>
          <button id="compareSelectedBtn" class="ghost compare-selected" disabled>Krahaso te zgjedhurit</button>
          <span id="status" class="status"></span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Produkte</div>
        <div class="stat-value" id="productCount">-</div>
        <div class="stat-foot">Aktivizo "Krahaso" dhe zgjidh disa produkte</div>
      </div>
    </section>

    <section class="list glass">
      <div class="section-head">
        <h2>iPhone nga providera te ndryshem</h2>
      </div>
      <div id="products" class="product-grid empty">Duke ngarkuar...</div>
    </section>

    <section class="panel glass">
      <div class="section-head">
        <div>
          <p class="eyebrow">Oferta</p>
          <h3 id="selectedProduct">Zgjidh nje produkt</h3>
        </div>
        <div id="cheapest" class="pill ghost"></div>
      </div>
      <div id="prices" class="prices empty">Asnje produkt i zgjedhur.</div>
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
    const compareModeBtn = document.getElementById("compareModeBtn");
    const compareSelectedBtn = document.getElementById("compareSelectedBtn");
    const logoutModal = document.getElementById("logoutModal");
    const logoutCancel = document.getElementById("logoutCancel");
    const logoutConfirm = document.getElementById("logoutConfirm");
    let compareMode = false;
    const selectedSkus = new Set();
    const storageKey = "pc_user";
    let currentUser = null;

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
        productsEl.innerHTML = "<div class='empty-note'>Asnje produkt.</div>";
        productCountEl.textContent = "0";
        return;
      }
      productCountEl.textContent = items.length;
      const storeLabel = (stores) => {
        const list = Array.isArray(stores) ? stores : [];
        const hasGjirafa = list.includes("gjirafamall");
        const hasNeptun = list.includes("neptun");
        if (hasGjirafa && hasNeptun) {
          return { label: "Gjirafa + Neptun", cls: "store-badge both" };
        }
        if (hasGjirafa) {
          return { label: "Gjirafa", cls: "store-badge gjirafa" };
        }
        if (hasNeptun) {
          return { label: "Neptun", cls: "store-badge neptun" };
        }
        if (list.length) {
          return { label: "Other shops", cls: "store-badge other" };
        }
        return { label: "No offers", cls: "store-badge empty" };
      };
      productsEl.innerHTML = items
        .map((p) => {
          const badge = storeLabel(p.stores);
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
            .map(
              (entry) =>
                `<span class="price-chip ${entry.store}">${storeLabelFromCode(entry.store)}: ${formatPrice(
                  entry
                )}</span>`
            )
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
              <div class="pill ghost small">SKU</div>
              <div class="${badge.cls}">${badge.label}</div>
            </div>
            ${
              normalizedImage
                ? `<div class="product-image"><img src="${escapeHtml(
                    normalizedImage
                  )}" alt="${escapeHtml(p.name)}" loading="lazy" /></div>`
                : "<div class='product-image placeholder'><span>No image</span></div>"
            }
            <h3>${p.name}</h3>
            <p class="muted">${p.sku}</p>
            <div class="price-chips">${priceHtml}</div>
        <div class="card-actions">
          <button class="ghost save-btn" type="button" data-sku="${p.sku}">
            <span class="icon">&#10084;</span>
            <span class="save-label">${saveLabel}</span>
          </button>
          <button class="ghost full view-offers">Shiko ofertat</button>
        </div>
          </article>
        `;
        })
        .join("");
      productsEl.querySelectorAll(".product-card").forEach((card) => {
        const sku = card.dataset.sku;
        if (compareMode && selectedSkus.has(sku)) {
          card.classList.add("selected");
        }
        card.addEventListener("click", () => {
          const name = card.dataset.name;
          if (compareMode) {
            toggleSelection(card);
            return;
          }
          loadPrices(sku, name);
        });
        const viewButton = card.querySelector(".view-offers");
        if (viewButton) {
          viewButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const sku = card.dataset.sku;
            const name = card.dataset.name;
            loadPrices(sku, name);
          });
        }
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
        pricesEl.innerHTML = "<div class='empty-note'>Asnje oferte e gjetur.</div>";
        cheapestEl.textContent = "";
        return;
      }
      const cheapest = entries.reduce((min, e) => (e.price < min.price ? e : min), entries[0]);
      cheapestEl.textContent = `Nga ${cheapest.store}: ${formatPrice(cheapest)}`;
      pricesEl.innerHTML = `
        <div class="price-table">
          <div class="price-row head">
            <span>Dyqani</span>
            <span>Cmimi</span>
            <span>Link</span>
            <span>Koha</span>
          </div>
          ${entries
            .map(
              (e) => `
              <div class="price-row">
                <span>${e.store}</span>
                <span>${formatPrice(e)}</span>
                <span><a href="${e.product_url}" target="_blank" rel="noopener noreferrer">Hap</a></span>
                <span>${new Date(e.timestamp).toLocaleString()}</span>
              </div>
            `
            )
            .join("")}
        </div>
      `;
    }

    async function loadProducts(query = "") {
      setStatus("Duke ngarkuar...");
      try {
        const url = `${apiBase}/products${query ? `?q=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        renderProducts(data);
        setStatus(`Gjetem ${data.length} produkte`);
      } catch (err) {
        console.error(err);
        setStatus("Gabim ne listen e produkteve", true);
        productsEl.innerHTML = "<div class='empty-note'>Nuk u ngarkuan produktet.</div>";
      }
    }

    async function loadPrices(sku, name) {
      setStatus(`Duke lexuar ofertat per ${name}...`);
      pricesEl.innerHTML = "<div class='empty-note'>Loading...</div>";
      try {
        const res = await fetch(`${apiBase}/products/${encodeURIComponent(sku)}/prices`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        renderPrices(name, data);
        setStatus(`Gjetem ${data.length} oferta`);
      } catch (err) {
        console.error(err);
        setStatus("Gabim ne ofertat e produktit", true);
        pricesEl.innerHTML = "<div class='empty-note'>Nuk u ngarkuan ofertat.</div>";
      }
    }

    function openCompare(sku, name) {
      setStatus(`Duke hapur krahasimin per ${name}...`);
      window.location.href = `/compare-ui?sku=${encodeURIComponent(sku)}`;
    }

    function openCompareSelected() {
      if (!selectedSkus.size) {
        setStatus("Zgjidh te pakten nje produkt", true);
        return;
      }
      const list = Array.from(selectedSkus);
      window.location.href = `/compare-ui?skus=${encodeURIComponent(list.join(","))}`;
    }

    function toggleSelection(card) {
      const sku = card.dataset.sku;
      if (selectedSkus.has(sku)) {
        selectedSkus.delete(sku);
        card.classList.remove("selected");
      } else {
        selectedSkus.add(sku);
        card.classList.add("selected");
      }
      updateSelectionStatus();
    }

    function clearSelection() {
      selectedSkus.clear();
      document.querySelectorAll(".product-card.selected").forEach((card) => {
        card.classList.remove("selected");
      });
      updateSelectionStatus();
    }

    function updateSelectionStatus() {
      const count = selectedSkus.size;
      compareSelectedBtn.disabled = count === 0;
      compareSelectedBtn.textContent = count ? `Krahaso (${count})` : "Krahaso te zgjedhurit";
      if (compareMode) {
        setStatus(count ? `Zgjedhur ${count} produkte` : "Zgjidh produktet per krahasim");
      }
    }

    function setCompareMode(active) {
      compareMode = active;
      compareModeBtn.classList.toggle("active", active);
      document.body.classList.toggle("compare-mode", active);
      if (active) {
        updateSelectionStatus();
      } else {
        clearSelection();
        setStatus("");
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

    compareModeBtn.addEventListener("click", () => {
      setCompareMode(!compareMode);
    });

    compareSelectedBtn.addEventListener("click", () => {
      openCompareSelected();
    });

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
