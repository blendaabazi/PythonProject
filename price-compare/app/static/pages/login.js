const app = document.getElementById("app");
app.innerHTML = `
<div class="auth-bg"></div>

  <main class="auth-container auth-grid">
    <section class="auth-brand">
      <div class="auth-logo">KS Price Compare</div>
      <div class="auth-kicker">Price intelligence</div>
      <h1>Login to continue.</h1>
      <p class="auth-lede">
        Sign in to save comparisons, track favorites, and get price alerts.
      </p>
      <ul class="auth-meta">
        <li>Live prices from top retailers</li>
        <li>Alerts when prices drop</li>
        <li>Saved comparisons</li>
      </ul>
    </section>

    <section class="auth-card narrow login-card">
      <div class="auth-card-header">
        <h2>Login</h2>
        <p>Sign in with your email and password.</p>
      </div>

      <div id="authState" class="auth-state">Not logged in.</div>

      <form id="loginForm" class="auth-form">
        <label class="auth-field">
          <span>Email</span>
          <input class="auth-input" name="email" type="email" autocomplete="email" required />
        </label>
        <label class="auth-field">
          <span>Password</span>
          <input class="auth-input" name="password" type="password" autocomplete="current-password" required />
        </label>
        <button class="auth-btn primary" type="submit">Log In</button>
      </form>

      <div class="auth-divider"><span>or</span></div>
      <a class="auth-btn secondary" href="/register">Create new account</a>

      <div id="authStatus" class="auth-status"></div>
      <button id="logoutBtn" class="auth-btn ghost" type="button">Log out</button>

      <p class="auth-legal">
        By continuing you agree to the terms. This is a demo UI without tokens.
      </p>
    </section>
  </main>

  <footer class="auth-footer">
    <a href="/">Home</a>
    <a href="/compare-ui">Compare view</a>
    <span>Auth API: /auth/login</span>
  </footer>
`;

const loginForm = document.getElementById("loginForm");
    const statusEl = document.getElementById("authStatus");
    const stateEl = document.getElementById("authState");
    const logoutBtn = document.getElementById("logoutBtn");
    const storageKey = "pc_user";

    function setStatus(text, isError = false) {
      statusEl.textContent = text || "";
      statusEl.className = isError ? "auth-status error" : "auth-status";
    }

    function setAuthState(user) {
      if (!user) {
        stateEl.textContent = "Not logged in.";
        logoutBtn.classList.remove("visible");
        return;
      }
      const label = user.name ? `${user.name} (${user.email})` : user.email;
      stateEl.textContent = `Logged in as ${label}.`;
      logoutBtn.classList.add("visible");
    }

    function saveUser(user) {
      localStorage.setItem(storageKey, JSON.stringify(user));
      setAuthState(user);
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
              if (item && item.sku) return { sku: item.sku, name: item.name || item.sku };
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

    function applyPendingSave(user) {
      if (!user) return;
      const raw = localStorage.getItem("pc_pending_save");
      if (!raw) return;
      try {
        const pending = JSON.parse(raw);
        if (!pending || !pending.sku) return;
        const items = loadSavedItems(user);
        const exists = items.some((i) => i.sku === pending.sku);
        if (!exists) {
          items.push({
            sku: pending.sku,
            name: pending.name || pending.sku,
            image_url: pending.image_url || "",
            product_url: pending.product_url || "",
          });
          persistSaved(items, user);
        }
      } catch (err) {
        // ignore parse errors
      } finally {
        localStorage.removeItem("pc_pending_save");
      }
    }

    function clearUser() {
      localStorage.removeItem(storageKey);
      setAuthState(null);
    }

    async function postJson(url, payload) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
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
      throw new Error(detail);
    }

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("Logging in...");
      const formData = new FormData(loginForm);
      const payload = {
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
      };
      try {
        const user = await postJson("/auth/login", payload);
        saveUser(user);
        applyPendingSave(user);
        setStatus("Login ok.");
        const next = localStorage.getItem("pc_next") || "/";
        localStorage.removeItem("pc_next");
        // Update saved count in navbar on redirect target by storing a hint.
        localStorage.setItem("pc_saved_notify", "1");
        window.location.href = next;
      } catch (err) {
        setStatus(err.message || "Login failed", true);
      }
    });

    logoutBtn.addEventListener("click", () => {
      clearUser();
      setStatus("Logged out.");
    });

    const storedUser = localStorage.getItem(storageKey);
    if (storedUser) {
      try {
        setAuthState(JSON.parse(storedUser));
      } catch (err) {
        clearUser();
      }
    }
