const app = document.getElementById("app");
app.innerHTML = `
<div class="auth-bg"></div>

  <main class="auth-container auth-grid">
    <section class="auth-brand">
      <div class="auth-logo">KS Price Compare</div>
      <div class="auth-kicker">Password recovery</div>
      <h1>Reset your password.</h1>
      <p class="auth-lede">
        Enter a new password for your account. The reset link is valid for a short time.
      </p>
      <ul class="auth-meta">
        <li>Secure password hashing</li>
        <li>Reset links expire automatically</li>
        <li>Email notification after change</li>
      </ul>
    </section>

    <section class="auth-card narrow login-card">
      <div class="auth-card-header">
        <h2>Set a new password</h2>
        <p>Use the link you received by email.</p>
      </div>

      <div id="resetState" class="auth-state">Checking reset link...</div>

      <form id="resetForm" class="auth-form">
        <label class="auth-field">
          <span>New password</span>
          <input class="auth-input" name="new_password" type="password" autocomplete="new-password" required />
        </label>
        <label class="auth-field">
          <span>Confirm password</span>
          <input class="auth-input" name="confirm_password" type="password" autocomplete="new-password" required />
        </label>
        <button class="auth-btn primary" type="submit">Update password</button>
      </form>

      <div id="resetStatus" class="auth-status"></div>
      <a class="auth-btn ghost" href="/login">Back to login</a>
    </section>
  </main>

  <footer class="auth-footer">
    <a href="/">Home</a>
    <a href="/login">Login</a>
    <span>Auth API: /auth/reset</span>
  </footer>
`;

const resetForm = document.getElementById("resetForm");
    const resetState = document.getElementById("resetState");
    const resetStatus = document.getElementById("resetStatus");
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";

    function setStatus(text, isError = false) {
      resetStatus.textContent = text || "";
      resetStatus.className = isError ? "auth-status error" : "auth-status";
    }

    function setState(text) {
      resetState.textContent = text || "";
      resetState.className = "auth-state";
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

    if (!token) {
      setState("Reset token missing.");
      resetForm.querySelector("button").disabled = true;
    } else {
      setState("Reset link loaded.");
    }

    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!token) {
        setStatus("Reset token missing.", true);
        return;
      }
      const formData = new FormData(resetForm);
      const newPassword = String(formData.get("new_password") || "");
      const confirmPassword = String(formData.get("confirm_password") || "");
      if (newPassword !== confirmPassword) {
        setStatus("Passwords do not match.", true);
        return;
      }
      setStatus("Updating password...");
      try {
        await postJson("/auth/reset", { token, new_password: newPassword });
        setStatus("Password updated. You can log in now.");
        resetForm.reset();
      } catch (err) {
        setStatus(err.message || "Reset failed", true);
      }
    });
