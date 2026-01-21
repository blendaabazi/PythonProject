const app = document.getElementById("app");
app.innerHTML = `
<div class="background"></div>
  <div class="noise"></div>

  <main class="shell main-grid product-page">
    <section class="product-hero glass">
      <div class="product-hero-media">
        <div id="productImage" class="product-image-frame">
          <span class="image-placeholder">No image</span>
        </div>
      </div>
      <div class="product-hero-body">
        <div class="hero-top">
          <p class="eyebrow">Product</p>
          <div class="hero-actions">
            <button id="backBtn" class="ghost" type="button">Back</button>
          </div>
        </div>
        <h1 id="productTitle">Loading...</h1>
        <p class="lede" id="productMeta">Fetching product details.</p>
        <div id="productBadges" class="card-meta"></div>
        <div class="product-highlights">
          <div class="highlight-card">
            <div class="highlight-label">Best price</div>
            <div class="highlight-value" id="bestPrice">-</div>
            <div class="highlight-foot" id="bestStore">-</div>
          </div>
          <div class="highlight-card">
            <div class="highlight-label">Offers</div>
            <div class="highlight-value" id="offerCount">-</div>
            <div class="highlight-foot">Live listings</div>
          </div>
        </div>
        <div class="product-cta">
          <a
            id="bestOfferBtn"
            class="pill accent is-disabled"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled="true"
          >
            Open best offer
          </a>
          <span id="status" class="status"></span>
        </div>
      </div>
    </section>

    <section class="panel glass">
      <div class="section-head">
        <div>
          <p class="eyebrow">Offers</p>
          <h3 id="selectedProduct">Loading...</h3>
        </div>
        <div id="cheapest" class="pill ghost"></div>
      </div>
      <div id="prices" class="prices empty">Loading...</div>
    </section>
  </main>

  <footer class="shell footer">
    <div>Product details</div>
    <div><a href="/">Back to home</a></div>
  </footer>
`;

const statusEl = document.getElementById("status");
const productTitleEl = document.getElementById("productTitle");
const productMetaEl = document.getElementById("productMeta");
const productImageEl = document.getElementById("productImage");
const productBadgesEl = document.getElementById("productBadges");
const offerCountEl = document.getElementById("offerCount");
const bestOfferBtn = document.getElementById("bestOfferBtn");
const bestPriceEl = document.getElementById("bestPrice");
const bestStoreEl = document.getElementById("bestStore");
const pricesEl = document.getElementById("prices");
const selectedProductEl = document.getElementById("selectedProduct");
const cheapestEl = document.getElementById("cheapest");
const backBtn = document.getElementById("backBtn");

const apiBase = "";
const storeAliases = {
  gjirafamall: { label: "Gjirafa", cls: "gjirafa" },
  gjirafa: { label: "Gjirafa", cls: "gjirafa" },
  neptun: { label: "Neptun", cls: "neptun" },
  aztech: { label: "Aztech", cls: "aztech" },
  shopaz: { label: "ShopAz", cls: "shopaz" },
  tecstore: { label: "TecStore", cls: "tecstore" },
};

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

function normalizeStoreKey(value) {
  if (!value) return "other";
  const cleaned = String(value).toLowerCase().replace(/\s+/g, "");
  if (cleaned.includes("gjirafa")) return "gjirafa";
  if (cleaned.includes("neptun")) return "neptun";
  if (cleaned.includes("aztech")) return "aztech";
  if (cleaned.includes("shopaz")) return "shopaz";
  if (cleaned.includes("tecstore")) return "tecstore";
  return cleaned || "other";
}

function storeMeta(value) {
  const key = normalizeStoreKey(value);
  return storeAliases[key] || { label: value || "Unknown", cls: "other" };
}

function formatPrice(entry) {
  const currency = (entry.currency || "EUR").toUpperCase();
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatter.format(entry.price)} ${currency}`;
}

function getCheapestOffer(offers) {
  if (!offers.length) return null;
  return offers.reduce((min, entry) => (entry.price < min.price ? entry : min), offers[0]);
}

function updateBestOfferButton(offer) {
  if (offer && offer.product_url) {
    const link = sanitizeUrl(offer.product_url);
    if (link) {
      bestOfferBtn.textContent = "Open best offer";
      bestOfferBtn.setAttribute("href", link);
      bestOfferBtn.classList.remove("is-disabled");
      bestOfferBtn.removeAttribute("aria-disabled");
      return;
    }
  }
  bestOfferBtn.textContent = "No offers yet";
  bestOfferBtn.removeAttribute("href");
  bestOfferBtn.classList.add("is-disabled");
  bestOfferBtn.setAttribute("aria-disabled", "true");
}

function renderProductHero(product, offers) {
  const imageRaw =
    product.image_url || (Array.isArray(product.image_urls) ? product.image_urls[0] : "");
  const primaryUrl = offers.length ? sanitizeUrl(offers[0].product_url) : "";
  const imageUrl = normalizeImage(imageRaw, primaryUrl) || sanitizeUrl(imageRaw);
  const safeName = escapeHtml(product.name || "Product");

  productImageEl.innerHTML = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${safeName}" loading="lazy" />`
    : "<span class=\"image-placeholder\">No image</span>";

  const uniqueBadges = new Map();
  offers.forEach((offer) => {
    const meta = storeMeta(offer.store);
    if (!uniqueBadges.has(meta.label)) {
      uniqueBadges.set(meta.label, meta);
    }
  });
  productBadgesEl.innerHTML = uniqueBadges.size
    ? Array.from(uniqueBadges.values())
        .map((meta) => `<div class="store-badge ${meta.cls}">${meta.label}</div>`)
        .join("")
    : "<span class=\"pill ghost small\">No offers</span>";

  offerCountEl.textContent = String(offers.length);
  const cheapest = getCheapestOffer(offers);
  if (cheapest) {
    const meta = storeMeta(cheapest.store);
    bestPriceEl.textContent = formatPrice(cheapest);
    bestStoreEl.textContent = meta.label;
    cheapestEl.textContent = `${meta.label}: ${formatPrice(cheapest)}`;
  } else {
    bestPriceEl.textContent = "-";
    bestStoreEl.textContent = "No offers";
    cheapestEl.textContent = "";
  }
  updateBestOfferButton(cheapest);
}

function renderPrices(productName, offers) {
  selectedProductEl.textContent = productName || "Product";
  pricesEl.classList.remove("empty");
  if (!offers.length) {
    pricesEl.innerHTML = "<div class='empty-note'>No offers found.</div>";
    return;
  }
  const sortedOffers = offers.slice().sort((a, b) => a.price - b.price);

  pricesEl.innerHTML = `
    <div class="price-table">
      <div class="price-row head">
        <span>Store</span>
        <span>Price</span>
        <span>Link</span>
        <span>Time</span>
      </div>
      ${sortedOffers
        .map((entry) => {
          const link = sanitizeUrl(entry.product_url);
          const storeText = escapeHtml(entry.store);
          const priceText = escapeHtml(formatPrice(entry));
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
          const timeText = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "-";
          return `
          <div class="price-row">
            <span>${storeHtml}</span>
            <span>${priceHtml}</span>
            <span>${linkHtml}</span>
            <span>${escapeHtml(timeText)}</span>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function resolveSku() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("sku");
  if (fromQuery) return fromQuery;
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

async function loadProduct() {
  const sku = resolveSku();
  if (!sku) {
    setStatus("Missing product id", true);
    pricesEl.innerHTML = "<div class='empty-note'>Product not found.</div>";
    productTitleEl.textContent = "Product not found";
    productMetaEl.textContent = "No SKU provided.";
    offerCountEl.textContent = "0";
    return;
  }

  setStatus("Loading...");
  pricesEl.innerHTML = "<div class='empty-note'>Loading...</div>";
  productImageEl.innerHTML = "<span class=\"image-placeholder\">Loading...</span>";

  let product;
  try {
    const res = await fetch(`${apiBase}/products/${encodeURIComponent(sku)}`);
    if (!res.ok) throw new Error(res.statusText);
    product = await res.json();
  } catch (err) {
    console.error(err);
    setStatus("Product not found", true);
    pricesEl.innerHTML = "<div class='empty-note'>Product not found.</div>";
    productTitleEl.textContent = "Product not found";
    productMetaEl.textContent = `SKU: ${sku}`;
    offerCountEl.textContent = "0";
    return;
  }

  productTitleEl.textContent = product.name || "Product";
  const metaBits = [
    `SKU: ${product.sku || sku}`,
    product.brand ? `Brand: ${product.brand}` : null,
    product.category ? `Category: ${product.category}` : null,
  ].filter(Boolean);
  productMetaEl.textContent = metaBits.join(" | ") || "Product details";

  let offers = [];
  try {
    const res = await fetch(`${apiBase}/products/${encodeURIComponent(sku)}/prices`);
    if (!res.ok) throw new Error(res.statusText);
    offers = await res.json();
  } catch (err) {
    console.error(err);
    setStatus("Offers failed to load", true);
  }

  const inStockOffers = Array.isArray(offers)
    ? offers.filter((entry) => entry.in_stock !== false)
    : [];
  renderProductHero(product, inStockOffers);
  renderPrices(product.name || "Product", inStockOffers);
  if (!statusEl.classList.contains("error")) {
    setStatus(`Found ${inStockOffers.length} offers`);
  }
}

backBtn.addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "/";
  }
});

if (window.HeaderUI && window.HeaderUI.refresh) {
  window.HeaderUI.refresh();
}

loadProduct();
