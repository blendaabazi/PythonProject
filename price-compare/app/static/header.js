(() => {
  const TARGET_ID = "siteHeader";
  const STORAGE_KEY = "pc_user";

  let ready = false;
  let elements = null;
  let currentUser = null;
  let savedCount = 0;
  let pendingUser;
  let pendingSavedCount = null;
  const readyCallbacks = [];

  function loadUser() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function savedKeyFor(user) {
    const email = user && user.email ? String(user.email).toLowerCase() : "";
    return email ? `pc_saved_${email}` : "pc_saved_guest";
  }

  function normalizeSaved(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
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
    } catch (err) {
      return [];
    }
  }

  function loadSavedItems(user) {
    const raw = localStorage.getItem(savedKeyFor(user));
    return normalizeSaved(raw);
  }

  function setMenuState(isOpen) {
    if (!elements || !elements.userMenu) return;
    elements.userMenu.classList.toggle("is-open", isOpen);
    if (elements.userMenuPanel) {
      elements.userMenuPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
    if (elements.userMenuBtn) {
      elements.userMenuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  }

  function closeUserMenu() {
    setMenuState(false);
  }

  function toggleUserMenu() {
    if (!elements || !elements.userMenu) return;
    setMenuState(!elements.userMenu.classList.contains("is-open"));
  }

  function applyUserMenu(user) {
    if (!elements || !elements.userMenu) return;
    if (!user) {
      elements.userMenu.style.display = "none";
      if (elements.userMenuDashboard) {
        elements.userMenuDashboard.style.display = "none";
      }
      closeUserMenu();
      return;
    }
    const label = user.name || user.email || "User";
    if (elements.userMenuName) {
      elements.userMenuName.textContent = label;
    }
    if (elements.userMenuAvatar) {
      const trimmed = String(label).trim();
      elements.userMenuAvatar.textContent = trimmed ? trimmed[0].toUpperCase() : "U";
    }
    elements.userMenu.style.display = "inline-flex";
    if (elements.userMenuDashboard) {
      elements.userMenuDashboard.style.display = user.role === "admin" ? "flex" : "none";
    }
    closeUserMenu();
  }

  function updateSavedLink(isLoggedIn = null) {
    if (!elements || !elements.savedLink) return;
    const logged = isLoggedIn === null ? !!currentUser : isLoggedIn;
    const hasSaved = savedCount > 0;
    elements.savedLink.textContent = hasSaved ? `Saved (${savedCount})` : "Saved";
    elements.savedLink.style.display = logged || hasSaved ? "inline-flex" : "none";
  }

  function applyAuthUI(user) {
    currentUser = user || null;
    const isLoggedIn = !!currentUser;
    if (elements.loginLink) {
      elements.loginLink.style.display = isLoggedIn ? "none" : "inline-flex";
    }
    if (elements.registerLink) {
      elements.registerLink.style.display = isLoggedIn ? "none" : "inline-flex";
    }
    if (elements.dashboardLink) {
      elements.dashboardLink.style.display =
        isLoggedIn && currentUser.role === "admin" ? "inline-flex" : "none";
    }
    applyUserMenu(currentUser);
    updateSavedLink(isLoggedIn);
  }

  function setUser(user) {
    if (!ready) {
      pendingUser = user;
      return;
    }
    applyAuthUI(user);
  }

  function setSavedCount(count) {
    const normalized = Number.isFinite(Number(count)) ? Number(count) : 0;
    if (!ready) {
      pendingSavedCount = normalized;
      return;
    }
    savedCount = Math.max(0, normalized);
    updateSavedLink();
  }

  function refreshFromStorage() {
    if (!ready) return;
    currentUser = loadUser();
    savedCount = loadSavedItems(currentUser).length;
    applyAuthUI(currentUser);
  }

  function handleLogoutClick() {
    closeUserMenu();
    if (typeof window.handleHeaderLogout === "function") {
      window.handleHeaderLogout();
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "/";
  }

  function initListeners() {
    if (!elements || !elements.userMenuBtn) return;
    elements.userMenuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleUserMenu();
    });
    if (elements.userMenuLogout) {
      elements.userMenuLogout.addEventListener("click", handleLogoutClick);
    }
    document.addEventListener("click", (event) => {
      if (!elements || !elements.userMenu) return;
      if (!elements.userMenu.contains(event.target)) {
        closeUserMenu();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeUserMenu();
      }
    });
  }

  function initHeader() {
    const container = document.getElementById(TARGET_ID);
    if (!container) return;
    const headerHtml = `
      <header class="shell">
        <div class="brand">
          <div class="dot"></div>
          <div>
            <div class="title">KS Price Compare</div>
            <div class="subtitle">Apple iPhone in Kosove</div>
          </div>
        </div>
        <div class="pills">
          <a class="pill ghost" href="/">Home</a>
          <a class="pill ghost" href="/compare-ui">Compare</a>
          <div id="userMenu" class="user-menu" style="display: none;">
            <button id="userMenuBtn" class="pill ghost user-menu-btn" type="button" aria-haspopup="true" aria-expanded="false">
              <span id="userMenuAvatar" class="user-avatar">U</span>
              <span id="userMenuName">User</span>
              <span class="user-more">&#8942;</span>
            </button>
            <div id="userMenuPanel" class="user-menu-panel" aria-hidden="true">
              <a class="user-menu-item" href="/profile">My Profile</a>
              <a class="user-menu-item" href="/saved">Saved</a>
              <a id="userMenuDashboard" class="user-menu-item" href="/dashboard" style="display: none;">Dashboard</a>
              <button id="userMenuLogout" class="user-menu-item" type="button">Logout</button>
            </div>
          </div>
          <a id="loginLink" class="pill ghost" href="/login">Login</a>
          <a id="registerLink" class="pill ghost" href="/register">Register</a>
        </div>
      </header>
    `;

    container.innerHTML = headerHtml;
    elements = {
      savedLink: container.querySelector("#savedLink"),
      dashboardLink: container.querySelector("#dashboardLink"),
      userMenu: container.querySelector("#userMenu"),
      userMenuBtn: container.querySelector("#userMenuBtn"),
      userMenuAvatar: container.querySelector("#userMenuAvatar"),
      userMenuName: container.querySelector("#userMenuName"),
      userMenuPanel: container.querySelector("#userMenuPanel"),
      userMenuLogout: container.querySelector("#userMenuLogout"),
      userMenuDashboard: container.querySelector("#userMenuDashboard"),
      loginLink: container.querySelector("#loginLink"),
      registerLink: container.querySelector("#registerLink"),
    };
    initListeners();
    currentUser = loadUser();
    savedCount = loadSavedItems(currentUser).length;
    applyAuthUI(currentUser);
    if (pendingUser !== undefined) {
      applyAuthUI(pendingUser);
      pendingUser = undefined;
    }
    if (pendingSavedCount !== null) {
      setSavedCount(pendingSavedCount);
      pendingSavedCount = null;
    }
    ready = true;
    readyCallbacks.splice(0).forEach((cb) => cb());
  }

  window.HeaderUI = {
    onReady: (cb) => {
      if (ready) {
        cb();
        return;
      }
      readyCallbacks.push(cb);
    },
    setUser,
    setSavedCount,
    refresh: refreshFromStorage,
    getUser: () => currentUser,
  };

  const containerNow = document.getElementById(TARGET_ID);
  if (containerNow) {
    initHeader();
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader);
  } else {
    initHeader();
  }
})();
