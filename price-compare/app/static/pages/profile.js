const app = document.getElementById("app");
app.innerHTML = `
<div class="background"></div>
  <div class="noise"></div>

  
  

  <main class="shell main-grid">
    <section class="hero glass">
      <div>
        <p class="eyebrow">Account</p>
        <h1>My Profile</h1>
        <p class="lede">Update your name, email, or password.</p>
        <div id="profileState" class="pill ghost">Loading...</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Member since</div>
        <div class="stat-value" id="memberSince">-</div>
        <div class="stat-foot" id="roleLabel">Role: -</div>
      </div>
    </section>

    <section class="panel glass">
      <div class="section-head">
        <div>
          <p class="eyebrow">Settings</p>
          <h3>Account details</h3>
        </div>
        <span id="profileStatus" class="pill ghost">Ready</span>
      </div>
      <div class="profile-layout">
        <aside class="profile-photo">
          <div id="photoFrame" class="photo-frame">
            <img id="profilePhoto" alt="Profile photo" />
            <div id="photoPlaceholder" class="photo-placeholder">No photo</div>
          </div>
          <input id="photoInput" class="photo-input" type="file" accept="image/*" />
          <div class="photo-actions">
            <label class="auth-btn secondary" for="photoInput">Upload photo</label>
            <button id="photoRemove" class="auth-btn ghost" type="button">Remove</button>
          </div>
          <p class="auth-legal">Photo stays in your browser.</p>
        </aside>
        <div class="profile-form-wrap">
          <form id="profileForm" class="auth-form">
            <label class="auth-field">
              <span>Name</span>
              <input class="auth-input" name="name" type="text" autocomplete="name" />
            </label>
            <label class="auth-field">
              <span>Email</span>
              <input class="auth-input" name="email" type="email" autocomplete="email" required />
            </label>
            <label class="auth-field">
              <span>Current password</span>
              <input
                class="auth-input"
                name="current_password"
                type="password"
                autocomplete="current-password"
                required
              />
            </label>
            <label class="auth-field">
              <span>New password (optional)</span>
              <input class="auth-input" name="new_password" type="password" autocomplete="new-password" minlength="8" />
            </label>
            <label class="auth-field">
              <span>Confirm new password</span>
              <input
                class="auth-input"
                name="confirm_password"
                type="password"
                autocomplete="new-password"
                minlength="8"
              />
            </label>
            <button class="auth-btn primary" type="submit">Save changes</button>
          </form>
          <p class="auth-legal">Provide your current password to update your profile.</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="shell footer">
    <div>Profile updates use /auth/profile</div>
    <div><a href="/">Back to home</a></div>
  </footer>
`;

const storageKey = "pc_user";
    const profileForm = document.getElementById("profileForm");
    const profileStatus = document.getElementById("profileStatus");
    const profileState = document.getElementById("profileState");
    const memberSinceEl = document.getElementById("memberSince");
    const roleLabelEl = document.getElementById("roleLabel");
    const photoFrame = document.getElementById("photoFrame");
    const profilePhoto = document.getElementById("profilePhoto");
    const photoInput = document.getElementById("photoInput");
    const photoRemove = document.getElementById("photoRemove");
    let currentUser = null;

    function setStatus(text, isError = false) {
      profileStatus.textContent = text || "";
      profileStatus.className = isError ? "pill ghost error" : "pill ghost";
    }

    function setState(text, isError = false) {
      profileState.textContent = text || "";
      profileState.className = isError ? "pill ghost error" : "pill ghost";
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

    function saveUser(user) {
      localStorage.setItem(storageKey, JSON.stringify(user));
    }

    function savedKeyFor(email) {
      const normalized = email ? String(email).toLowerCase() : "";
      return normalized ? `pc_saved_${normalized}` : "pc_saved_guest";
    }

    function photoKeyFor(email) {
      const normalized = email ? String(email).toLowerCase() : "";
      return normalized ? `pc_profile_photo_${normalized}` : "pc_profile_photo_guest";
    }

    function applyPhoto(dataUrl) {
      if (!photoFrame || !profilePhoto) return;
      if (!dataUrl) {
        profilePhoto.removeAttribute("src");
        photoFrame.classList.remove("has-image");
        return;
      }
      profilePhoto.src = dataUrl;
      photoFrame.classList.add("has-image");
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


    function mergeSaved(oldEmail, newEmail) {
      const oldKey = savedKeyFor(oldEmail);
      const newKey = savedKeyFor(newEmail);
      if (oldKey === newKey) return;
      const oldItems = normalizeSaved(localStorage.getItem(oldKey));
      const newItems = normalizeSaved(localStorage.getItem(newKey));
      if (!oldItems.length && !newItems.length) {
        localStorage.removeItem(oldKey);
        return;
      }
      const merged = [...newItems];
      oldItems.forEach((item) => {
        if (!merged.some((existing) => existing.sku === item.sku)) {
          merged.push(item);
        }
      });
      localStorage.setItem(newKey, JSON.stringify(merged));
      localStorage.removeItem(oldKey);
    }

    function mergePhoto(oldEmail, newEmail) {
      const oldKey = photoKeyFor(oldEmail);
      const newKey = photoKeyFor(newEmail);
      if (oldKey === newKey) return;
      const existing = localStorage.getItem(oldKey);
      if (!existing) return;
      if (!localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, existing);
      }
      localStorage.removeItem(oldKey);
    }

    function loadPhoto(email) {
      if (!email) {
        applyPhoto(null);
        return;
      }
      const dataUrl = localStorage.getItem(photoKeyFor(email));
      applyPhoto(dataUrl);
    }

    function syncHeaderUser(user) {
      if (window.HeaderUI && window.HeaderUI.setUser) {
        window.HeaderUI.setUser(user);
      }
    }

    function updateOverview(user) {
      if (!user) {
        setState("Not logged in.", true);
        memberSinceEl.textContent = "-";
        roleLabelEl.textContent = "Role: -";
        return;
      }
      const label = user.name ? `${user.name} (${user.email})` : user.email;
      setState(`Signed in as ${label}.`);
      const createdAt = user.created_at ? new Date(user.created_at) : null;
      memberSinceEl.textContent = createdAt && !Number.isNaN(createdAt.valueOf())
        ? createdAt.toLocaleDateString()
        : "-";
      roleLabelEl.textContent = `Role: ${user.role || "user"}`;
    }

    function hydrateForm(user) {
      profileForm.querySelector("[name='name']").value = user.name || "";
      profileForm.querySelector("[name='email']").value = user.email || "";
    }

    async function putJson(url, payload) {
      const response = await fetch(url, {
        method: "PUT",
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

    currentUser = loadUser();
    if (!currentUser) {
      localStorage.setItem("pc_next", "/profile");
      window.location.href = "/login";
    } else {
      if (window.HeaderUI && window.HeaderUI.refresh) {
        window.HeaderUI.refresh();
      } else {
        syncHeaderUser(currentUser);
      }
      updateOverview(currentUser);
      hydrateForm(currentUser);
      loadPhoto(currentUser.email);
    }

    photoInput.addEventListener("change", () => {
      if (!currentUser) {
        setStatus("Please log in first.", true);
        return;
      }
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setStatus("Please choose an image file.", true);
        photoInput.value = "";
        return;
      }
      const maxSize = 1024 * 1024;
      if (file.size > maxSize) {
        setStatus("Photo too large (max 1MB).", true);
        photoInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl.startsWith("data:image")) {
          setStatus("Invalid image.", true);
          return;
        }
        localStorage.setItem(photoKeyFor(currentUser.email), dataUrl);
        applyPhoto(dataUrl);
        setStatus("Photo updated.");
        if (window.HeaderUI && window.HeaderUI.refresh) {
          window.HeaderUI.refresh();
        }
      };
      reader.readAsDataURL(file);
    });

    photoRemove.addEventListener("click", () => {
      if (!currentUser) {
        setStatus("Please log in first.", true);
        return;
      }
      localStorage.removeItem(photoKeyFor(currentUser.email));
      applyPhoto(null);
      photoInput.value = "";
      setStatus("Photo removed.");
      if (window.HeaderUI && window.HeaderUI.refresh) {
        window.HeaderUI.refresh();
      }
    });

    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!currentUser) {
        setStatus("Please log in first.", true);
        return;
      }
      setStatus("Saving...");
      const formData = new FormData(profileForm);
      const name = String(formData.get("name") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const currentPassword = String(formData.get("current_password") || "");
      const newPassword = String(formData.get("new_password") || "");
      const confirmPassword = String(formData.get("confirm_password") || "");

      if (newPassword && newPassword !== confirmPassword) {
        setStatus("New password does not match confirmation.", true);
        return;
      }

      try {
        const updated = await putJson("/auth/profile", {
          current_email: currentUser.email,
          email,
          name: name || null,
          current_password: currentPassword,
          new_password: newPassword || null,
        });
        if (updated.email && updated.email !== currentUser.email) {
          mergeSaved(currentUser.email, updated.email);
          mergePhoto(currentUser.email, updated.email);
        }
        currentUser = updated;
        saveUser(updated);
        if (window.HeaderUI && window.HeaderUI.refresh) {
          window.HeaderUI.refresh();
        } else {
          syncHeaderUser(updated);
        }
        updateOverview(updated);
        hydrateForm(updated);
        loadPhoto(updated.email);
        profileForm.querySelector("[name='current_password']").value = "";
        profileForm.querySelector("[name='new_password']").value = "";
        profileForm.querySelector("[name='confirm_password']").value = "";
        setStatus("Profile updated.");
      } catch (err) {
        setStatus(err.message || "Update failed", true);
      }
    });
