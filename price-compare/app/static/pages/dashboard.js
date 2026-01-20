const app = document.getElementById("app");
app.innerHTML = `
<div class="background"></div>
  <div class="noise"></div>

  
  

  <main class="shell main-grid">
    <section class="hero glass">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>Dashboard</h1>
        <p class="lede">Reserved for <strong>admin@gmail.com</strong>. No backend guard is enforced; this page checks the stored user role.</p>
        <div id="adminInfo" class="pill ghost"></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Role</div>
        <div class="stat-value" id="roleValue">-</div>
        <div class="stat-foot" id="footNote">Admin access only</div>
      </div>
    </section>

    <section class="panel glass">
      <div class="section-head">
        <div>
          <p class="eyebrow">Shortcuts</p>
          <h3>Quick links</h3>
        </div>
      </div>
      <div class="prices">
        <div class="price-row head">
          <span>Action</span>
          <span>Description</span>
        </div>
        <div class="price-row">
          <span>Refresh data</span>
          <span>Use the CLI \`python scripts/manual_ingest.py\` to trigger a scrape.</span>
        </div>
        <div class="price-row">
          <span>View UI</span>
          <span><a href="/" class="pill ghost small">Home</a> or <a href="/compare-ui" class="pill ghost small">Compare</a></span>
        </div>
        <div class="price-row">
          <span>Mongo status</span>
          <span>Inspect collections via your MongoDB Atlas dashboard.</span>
        </div>
      </div>
    </section>
  </main>

  <footer class="shell footer">
    <div>Admin dashboard preview</div>
    <div>LocalStorage role check only</div>
  </footer>
`;

const storageKey = "pc_user";
    const adminInfo = document.getElementById("adminInfo");
    const roleValue = document.getElementById("roleValue");
    const footNote = document.getElementById("footNote");

    function setState(message, role, isError = false) {
      adminInfo.textContent = message;
      adminInfo.className = isError ? "pill ghost error" : "pill ghost";
      roleValue.textContent = role || "-";
      footNote.textContent = isError ? "Access denied" : "Admin access only";
    }

    function requireAdmin() {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setState("You are not logged in.", "none", true);
        if (window.HeaderUI && window.HeaderUI.setUser) {
          window.HeaderUI.setUser(null);
        }
        return false;
      }
      try {
        const user = JSON.parse(stored);
        if (window.HeaderUI && window.HeaderUI.setUser) {
          window.HeaderUI.setUser(user);
        }
        if (user.role === "admin") {
          setState(`Logged in as ${user.email}`, "admin");
          return true;
        }
        setState("Only admin can view this page.", user.role || "user", true);
        return false;
      } catch (err) {
        setState("Invalid session data.", "unknown", true);
        if (window.HeaderUI && window.HeaderUI.setUser) {
          window.HeaderUI.setUser(null);
        }
        return false;
      }
    }

    requireAdmin();
