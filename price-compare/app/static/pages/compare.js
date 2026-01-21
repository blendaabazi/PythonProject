const app = document.getElementById("app");
app.innerHTML = `
<div class="background"></div>
  <div class="noise"></div>
  
  

  <main class="shell main-grid">
    <section class="hero glass">
      <div>
        <p class="eyebrow">Compare</p>
        <h1>Compare prices from Gjirafa and Neptun.</h1>
        <p class="lede">
          Select products to compare and see the lowest price and savings.
        </p>
        <div class="controls">
          <input id="searchInput" type="search" placeholder='Search e.g. "iphone 17"' />
          <button id="searchBtn">Compare</button>
          <button id="resetBtn" class="ghost">Refresh</button>
          <span id="status" class="status"></span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Compared products</div>
        <div class="stat-value" id="matchCount">-</div>
        <div class="stat-foot" id="bestDeal">Shows the cheapest option and savings</div>
      </div>
    </section>

    <section class="list glass">
      <div class="section-head">
        <h2>Price comparison</h2>
        <span class="pill ghost">Only Gjirafa + Neptun</span>
      </div>
      <div id="results" class="compare-list empty">Loading...</div>
    </section>
  </main>

  <footer class="shell footer">
    <div>Powered by FastAPI + MongoDB Atlas + BeautifulSoup</div>
    <div>Compare view for KS market</div>
  </footer>
`;

const resultsEl = document.getElementById("results");
    const matchCountEl = document.getElementById("matchCount");
    const bestDealEl = document.getElementById("bestDeal");
    const statusEl = document.getElementById("status");
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const resetBtn = document.getElementById("resetBtn");

    const apiBase = "";
    const compareStores = ["gjirafamall", "neptun"];
    const storeLabels = {
      gjirafamall: "Gjirafa",
      neptun: "Neptun",
    };
    const params = new URLSearchParams(window.location.search);
    const skusParam = params.get("skus");
    const skuParam = params.get("sku");
    const queryParam = params.get("q");

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
      if (!/^https?:\/\//i.test(url)) return "";
      return url;
    }

    function simplifyProductName(rawName) {
      if (!rawName) return "";
      const normalized = String(rawName).replace(/,/g, " ").replace(/\s+/g, " ").trim();
      const tokens = normalized.split(" ");
      const lowerTokens = tokens.map((t) => t.toLowerCase());
      const iphoneIndex = lowerTokens.indexOf("iphone");
      if (iphoneIndex === -1) {
        return normalized;
      }
      const parts = [];
      // Skip brand tokens like "apple" to make grouping across shops easier.
      parts.push(tokens[iphoneIndex]);
      let idx = iphoneIndex + 1;
      if (idx < tokens.length && /^\d+$/.test(tokens[idx])) {
        parts.push(tokens[idx]);
        idx += 1;
      }
      while (idx < tokens.length) {
        const token = tokens[idx];
        const lower = token.toLowerCase();
        if (["pro", "max", "plus", "mini", "air", "se"].includes(lower)) {
          parts.push(token);
          idx += 1;
          continue;
        }
        break;
      }
      const storageMatch = normalized.match(/(\d+)\s?(gb|tb)/i);
      if (storageMatch) {
        parts.push(`${storageMatch[1]}${storageMatch[2].toUpperCase()}`);
      }
      return parts.join(" ");
    }

    function normalizeStoreCode(value) {
      if (!value) return value;
      const normalized = String(value).toLowerCase().replace(/\s+/g, "");
      if (normalized.includes("gjirafa")) return "gjirafamall";
      if (normalized.includes("neptun")) return "neptun";
      return normalized;
    }

    function formatNumber(value) {
      const formatter = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return formatter.format(value);
    }

    function formatMoney(entry) {
      if (!entry) return "Out of stock";
      const currency = (entry.currency || "EUR").toUpperCase();
      return `${formatNumber(entry.price)} ${currency}`;
    }

    function renderCell(value, className = "", muted = false) {
      const mutedClass = muted ? "is-muted" : "";
      return `<span class="compare-cell ${className} ${mutedClass}">${value}</span>`;
    }

    function renderPriceCell(entry, isBest) {
      if (!entry || entry.in_stock === false) {
        return renderCell("Out of stock", "empty", true);
      }
      return renderCell(formatMoney(entry), isBest ? "best" : "");
    }

    function renderLinkCell(entry) {
      if (!entry || !entry.product_url) {
        return renderCell("-", "empty", true);
      }
      const safeUrl = sanitizeUrl(entry.product_url);
      if (!safeUrl) {
        return renderCell("-", "empty", true);
      }
      return renderCell(
        `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">Open</a>`
      );
    }

    function renderBestCell(isBest) {
      if (!isBest) {
        return renderCell("-", "empty", true);
      }
      return renderCell('<span class="compare-pill best">Cheapest</span>', "best");
    }

    function renderSavingsCell(isBest, discount, currency) {
      if (!isBest) {
        return renderCell("-", "empty", true);
      }
      if (discount === null || discount === undefined) {
        return renderCell("No comparison", "empty", true);
      }
      const cur = (currency || "EUR").toUpperCase();
      return renderCell(`<span class="compare-pill save">${formatNumber(discount)} ${cur}</span>`, "save");
    }

    function buildRowsFromProducts(products) {
      const grouped = new Map();
      for (const product of products || []) {
        const offers = Array.isArray(product.latest_prices) ? product.latest_prices : [];
        if (!offers.length) continue;
        const baseName = simplifyProductName(product.name || "") || product.name || product.sku || "";
        const key = baseName.toLowerCase();
        const group = grouped.get(key) || {
          product: {
            name: product.name || baseName,
            sku: product.sku,
            image_url: product.image_url,
            image_urls: product.image_urls,
          },
          offersByStore: {},
        };
        for (const offer of offers) {
          const store = normalizeStoreCode(offer.store);
          if (!compareStores.includes(store)) continue;
          const existing = group.offersByStore[store];
          if (!existing || offer.price < existing.price) {
            group.offersByStore[store] = { ...offer, store };
          }
        }
        grouped.set(key, group);
      }

      const rows = [];
      for (const [, group] of grouped.entries()) {
        const gjirafa = group.offersByStore.gjirafamall || null;
        const neptun = group.offersByStore.neptun || null;
        if (!gjirafa && !neptun) continue;
        const candidates = [gjirafa, neptun].filter(Boolean);
        candidates.sort((a, b) => a.price - b.price);
        const best = candidates[0] || null;
        const worst = candidates.length > 1 ? candidates[candidates.length - 1] : null;
        const discount = best && worst ? worst.price - best.price : null;
        const currency =
          (best && best.currency) ||
          (gjirafa && gjirafa.currency) ||
          (neptun && neptun.currency) ||
          "EUR";
        rows.push({
          product: group.product,
          gjirafa,
          neptun,
          best,
          discount,
          currency,
        });
      }

      rows.sort((a, b) => {
        const aPrice = a.best ? a.best.price : Number.POSITIVE_INFINITY;
        const bPrice = b.best ? b.best.price : Number.POSITIVE_INFINITY;
        return aPrice - bPrice;
      });
      return rows;
    }

    function renderRows(rows) {
      resultsEl.classList.remove("empty");
      if (!rows.length) {
        resultsEl.innerHTML = "<div class='empty-note'>No products found.</div>";
        matchCountEl.textContent = "0";
        bestDealEl.textContent = "No offers from Gjirafa or Neptun.";
        return;
      }
      const bestRow = rows[0];
      const bestLabel = bestRow.best ? storeLabels[bestRow.best.store] || bestRow.best.store : "Unknown";
      const bestName = simplifyProductName(bestRow.product.name || "");
      matchCountEl.textContent = rows.length;
      const discountText =
        bestRow.discount !== null && bestRow.discount !== undefined
          ? ` | Savings ${formatNumber(bestRow.discount)} ${(bestRow.currency || "EUR").toUpperCase()}`
          : "";
      bestDealEl.textContent = `Cheapest: ${bestName || bestRow.product.name} (${bestLabel}) ${formatMoney(bestRow.best)}${discountText}`;

      resultsEl.innerHTML = `
        <div class="compare-sort">Sorted from cheapest to most expensive</div>
        ${rows
          .map((row, idx) => {
            const isBest = idx === 0 && row.best;
            const name = escapeHtml(simplifyProductName(row.product.name));
            const sku = escapeHtml(row.product.sku);
            const imageUrl = sanitizeUrl(
              row.product.image_url ||
                (Array.isArray(row.product.image_urls) ? row.product.image_urls[0] : "")
            );
            const imageHtml = imageUrl
              ? `<div class="compare-thumb"><img src="${escapeHtml(imageUrl)}" alt="${name}" loading="lazy" /></div>`
              : "<div class='compare-thumb placeholder'><span>No image</span></div>";
            const bestStore = row.best ? row.best.store : null;
            const gjirafaBest = bestStore === "gjirafamall";
            const neptunBest = bestStore === "neptun";
            return `
              <article class="compare-card ${isBest ? "best" : ""}">
                <div class="compare-header">
                  <div class="compare-meta">
                    ${imageHtml}
                    <div>
                      <div class="compare-name">${name}</div>
                      <div class="compare-sku">${sku}</div>
                    </div>
                  </div>
                  <div class="compare-rank">#${idx + 1}</div>
                </div>
                <div class="compare-table">
                  <div class="compare-table-row head">
                    <span></span>
                    <span class="compare-store gjirafamall">Gjirafa</span>
                    <span class="compare-store neptun">Neptun</span>
                  </div>
                  <div class="compare-table-row">
                    <span class="compare-table-label">Current price</span>
                    ${renderPriceCell(row.gjirafa, gjirafaBest)}
                    ${renderPriceCell(row.neptun, neptunBest)}
                  </div>
                  <div class="compare-table-row">
                    <span class="compare-table-label">Link</span>
                    ${renderLinkCell(row.gjirafa)}
                    ${renderLinkCell(row.neptun)}
                  </div>
                  <div class="compare-table-row">
                    <span class="compare-table-label">Cheapest</span>
                    ${renderBestCell(gjirafaBest)}
                    ${renderBestCell(neptunBest)}
                  </div>
                  <div class="compare-table-row">
                    <span class="compare-table-label">Savings</span>
                    ${renderSavingsCell(gjirafaBest, row.discount, row.currency)}
                    ${renderSavingsCell(neptunBest, row.discount, row.currency)}
                  </div>
                </div>
              </article>
            `;
          })
          .join("")}
      `;
    }

    async function fetchProductWithPrices(sku) {
      const productUrl = `${apiBase}/products/${encodeURIComponent(sku)}`;
      const pricesUrl = `${apiBase}/products/${encodeURIComponent(sku)}/prices`;
      const [productRes, pricesRes] = await Promise.all([fetch(productUrl), fetch(pricesUrl)]);
      if (!productRes.ok) throw new Error(productRes.statusText);
      if (!pricesRes.ok) throw new Error(pricesRes.statusText);
      const product = await productRes.json();
      const prices = await pricesRes.json();
      const latestPrices = (prices || []).map((offer) => ({
        store: normalizeStoreCode(offer.store),
        price: offer.price,
        currency: offer.currency,
        product_url: offer.product_url,
        in_stock: offer.in_stock,
      }));
      return { product: { ...product, latest_prices: latestPrices }, name: product.name };
    }

    async function loadMultiComparison(skus) {
      setStatus("Loading...");
      try {
        const tasks = skus.map((sku) => fetchProductWithPrices(sku));
        const results = await Promise.allSettled(tasks);
        const products = results
          .filter((entry) => entry.status === "fulfilled")
          .map((entry) => entry.value.product);
        if (!products.length) {
          throw new Error("No products");
        }
        const rows = buildRowsFromProducts(products);
        renderRows(rows);
        setStatus(`Loaded ${rows.length} products`);
      } catch (err) {
        console.error(err);
        setStatus("Comparison error", true);
        resultsEl.innerHTML = "<div class='empty-note'>Results failed to load.</div>";
        matchCountEl.textContent = "0";
        bestDealEl.textContent = "No data.";
      }
    }

    async function loadCompareView({ query = "", sku = null } = {}) {
      setStatus("Loading...");
      resultsEl.innerHTML = "<div class='empty-note'>Loading...</div>";
      try {
        if (sku) {
          const result = await fetchProductWithPrices(sku);
          const rows = buildRowsFromProducts([result.product]);
          if (!rows.length) {
            throw new Error("No offers");
          }
          renderRows(rows);
          const displayName = simplifyProductName(result.name || query || sku);
          if (displayName) {
            searchInput.value = displayName;
          }
          setStatus(`Found offers for ${displayName || "the product"}`);
          return;
        }

        const searchTerm = query || "iphone";
        const res = await fetch(`${apiBase}/products?q=${encodeURIComponent(searchTerm)}`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        const rows = buildRowsFromProducts(data || []);
        if (!rows.length) {
          setStatus("No results for this search", true);
          resultsEl.innerHTML = "<div class='empty-note'>No products found.</div>";
          matchCountEl.textContent = "0";
          bestDealEl.textContent = "No data.";
          return;
        }
        renderRows(rows);
        searchInput.value = simplifyProductName(searchTerm) || searchTerm;
        setStatus(`Found ${rows.length} results`);
      } catch (err) {
        console.error(err);
        setStatus("Comparison error", true);
        resultsEl.innerHTML = "<div class='empty-note'>Results failed to load.</div>";
        matchCountEl.textContent = "0";
        bestDealEl.textContent = "No data.";
      }
    }

    searchBtn.addEventListener("click", () => {
      loadCompareView({ query: searchInput.value.trim() });
    });

    resetBtn.addEventListener("click", () => {
      searchInput.value = "";
      window.history.replaceState({}, "", "/compare-ui");
      loadCompareView({ query: "iphone" });
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        loadCompareView({ query: searchInput.value.trim() });
      }
    });

    if (skusParam) {
      const skus = skusParam
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (skus.length) {
        loadMultiComparison(skus);
      } else {
        loadCompareView({ query: "iphone" });
      }
    } else if (skuParam) {
      loadCompareView({ sku: skuParam });
    } else if (queryParam) {
      searchInput.value = queryParam;
      loadCompareView({ query: queryParam });
    } else {
      loadCompareView({ query: "iphone 17 pro max" });
    }
