const app = document.getElementById("app");
app.innerHTML = `
<div class="background"></div>
  <div class="noise"></div>
  
  

  <main class="shell main-grid">
    <section class="hero glass">
      <div>
        <p class="eyebrow">Saved</p>
        <h1>Products you saved</h1>
        <p class="lede">Saved items are stored locally per account. Use remove to clean the list.</p>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total saved</div>
        <div class="stat-value" id="savedCount">0</div>
        <div class="stat-foot">Per user (local storage)</div>
      </div>
    </section>

    <section class="list glass">
      <div class="section-head">
        <h2>Saved items</h2>
        <span id="savedStatus" class="pill ghost">Loading...</span>
      </div>
      <div id="savedContainer" class="compare-list empty"></div>
    </section>
  </main>

  <footer class="shell footer">
    <div>Saved list is local to your browser</div>
    <div><a href="/">Back to home</a></div>
  </footer>
`;

const storageKey = "pc_user";
    let currentUser = null;
    let savedItems = [];

    function syncHeaderSavedCount() {
      if (window.HeaderUI && window.HeaderUI.setSavedCount) {
        window.HeaderUI.setSavedCount(savedItems.length);
      }
    }

    function sanitizeUrl(value) {
      if (!value) return "";
      const url = String(value).trim();
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("//")) return `https:${url}`;
      return "";
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
        // ignore
      }
      return [];
    }

    function persistSaved(items, user) {
      localStorage.setItem(savedKeyFor(user), JSON.stringify(items));
    }

    function applyPendingSave(user, items) {
      if (!user) return items;
      const raw = localStorage.getItem("pc_pending_save");
      if (!raw) return items;
      try {
        const pending = JSON.parse(raw);
        if (pending && pending.sku && !items.some((i) => i.sku === pending.sku)) {
          items = [...items, { sku: pending.sku, name: pending.name || pending.sku }];
          persistSaved(items, user);
        }
      } catch (err) {
        // ignore
      } finally {
        localStorage.removeItem("pc_pending_save");
      }
      return items;
    }

    function renderSaved(items, user) {
      const container = document.getElementById("savedContainer");
      const statusEl = document.getElementById("savedStatus");
      const countEl = document.getElementById("savedCount");
      savedItems = items;
      countEl.textContent = items.length;
      if (!items.length) {
        container.classList.add("empty");
        container.innerHTML = "<div class='empty-note'>No saved products.</div>";
        statusEl.textContent = "Empty";
        syncHeaderSavedCount();
        return;
      }
      container.classList.remove("empty");
      statusEl.textContent = "Saved";
      container.innerHTML = items
        .map((item) => {
          const url = sanitizeUrl(item.product_url) || "#";
          const imgSrc = sanitizeUrl(item.image_url);
          const img = imgSrc
            ? `<a href="${url}" target="_blank" rel="noopener noreferrer"><img class="saved-thumb" src="${imgSrc}" alt="${item.name || item.sku}" loading="lazy" /></a>`
            : "";
          return `
          <div class="price-row saved-row">
            <span class="saved-thumb-wrap">${img || ""}</span>
            <span><a href="${url}" target="_blank" rel="noopener noreferrer">${item.name || item.sku}</a></span>
            <span class="muted">${item.sku}</span>
            <span><button class="ghost small remove-saved" data-sku="${item.sku}">Remove</button></span>
          </div>
        `;
        })
        .join("");
      container.querySelectorAll(".remove-saved").forEach((btn) => {
        btn.addEventListener("click", () => {
          const sku = btn.getAttribute("data-sku");
          const updated = items.filter((i) => i.sku !== sku);
          persistSaved(updated, user);
          renderSaved(updated, user);
        });
      });
      syncHeaderSavedCount();
    }

    function loadUser() {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (err) {
        return null;
      }
    }

    const user = loadUser();
    currentUser = user;
    savedItems = loadSavedItems(user);
    savedItems = applyPendingSave(user, savedItems);
    if (window.HeaderUI && window.HeaderUI.setUser) {
      window.HeaderUI.setUser(user);
    }
    syncHeaderSavedCount();
    renderSaved(savedItems, user);
    // After login redirect, update saved count in navbar when returning to home.
    localStorage.setItem("pc_saved_notify", "1");
