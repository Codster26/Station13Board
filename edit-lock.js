(() => {
  const EDIT_KEY = "station13-edit-passkey-ok";
  const ADMIN_EDIT_KEY = "station13-admin-passkey-ok-v2";
  const PASSKEY = "1326";
  const ADMIN_PASSKEY = "admin";
  const CONTROL_SELECTOR = "input, select, textarea, button";
  const SKIP_SELECTOR = ".edit-lock-button, .menu-toggle, .top-link, summary";

  let pendingResolve = null;
  let pendingMode = "board";

  function isAdminProtectedPage() {
    const pageName = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    const normalizedName = pageName.replace(/\.html$/, "");
    return ["manage", "staffing", "archived"].includes(normalizedName);
  }

  function isUnlocked() {
    return localStorage.getItem(EDIT_KEY) === "true";
  }

  function isAdminUnlocked() {
    return localStorage.getItem(ADMIN_EDIT_KEY) === "true";
  }

  function canEdit() {
    return isAdminProtectedPage() ? isAdminUnlocked() : isUnlocked();
  }

  function rememberUnlock(mode = "board") {
    localStorage.setItem(mode === "admin" ? ADMIN_EDIT_KEY : EDIT_KEY, "true");
  }

  function isProtectedControl(control) {
    return control && control.matches(CONTROL_SELECTOR) && !control.closest(".edit-lock-modal") && !control.matches(SKIP_SELECTOR);
  }

  function setControlLockState(control, locked) {
    if (!isProtectedControl(control)) {
      return;
    }

    if (control.dataset.editLockOriginalDisabled === undefined) {
      control.dataset.editLockOriginalDisabled = control.disabled ? "true" : "false";
    }
    if (control.dataset.editLockOriginalReadOnly === undefined) {
      control.dataset.editLockOriginalReadOnly = control.readOnly ? "true" : "false";
    }

    if (locked) {
      if (control.tagName === "TEXTAREA" || control.tagName === "INPUT") {
        control.readOnly = true;
      } else {
        control.disabled = true;
      }
      control.classList.add("edit-lock-control--locked");
      return;
    }

    control.disabled = control.dataset.editLockOriginalDisabled === "true";
    control.readOnly = control.dataset.editLockOriginalReadOnly === "true";
    control.classList.remove("edit-lock-control--locked");
  }

  function applyControlLockState() {
    const locked = !canEdit();
    document.querySelectorAll(CONTROL_SELECTOR).forEach((control) => {
      setControlLockState(control, locked);
    });
  }

  function refreshButton(button, mode) {
    if (!button) {
      return;
    }

    const unlocked = mode === "admin" ? isAdminUnlocked() : isUnlocked();
    button.textContent = unlocked
      ? (mode === "admin" ? "Relock Admin" : "Relock Board")
      : (mode === "admin" ? "Unlock Admin" : "Unlock Editing");
    button.setAttribute("aria-pressed", unlocked ? "true" : "false");
    button.title = unlocked
      ? (mode === "admin" ? "Lock protected pages on this device" : "Lock editing on this device")
      : (mode === "admin" ? "Enter admin passkey to edit protected pages" : "Enter passkey to edit the board");
    button.classList.toggle("edit-unlock-button--unlocked", unlocked);
  }

  function refreshButtons() {
    const button = document.getElementById("editUnlockButton");
    const adminButton = document.getElementById("adminUnlockButton");
    refreshButton(button, "board");
    refreshButton(adminButton, "admin");
  }

  function applyLockState() {
    document.documentElement.classList.toggle("station13-edit-locked", !canEdit());
    document.documentElement.classList.toggle("station13-edit-unlocked", canEdit());
    document.documentElement.classList.toggle("station13-admin-page", isAdminProtectedPage());
    document.documentElement.classList.toggle("station13-admin-unlocked", isAdminUnlocked());
    applyControlLockState();
    refreshButtons();
  }

  function isEditEventTarget(target) {
    const control = target?.closest?.(CONTROL_SELECTOR);
    return isProtectedControl(control) ? control : null;
  }

  function guardLockedEdit(event) {
    if (canEdit()) {
      return;
    }

    const control = isEditEventTarget(event.target);
    if (!control) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function installEditGuards() {
    ["pointerdown", "mousedown", "touchstart", "keydown", "input", "change"].forEach((eventName) => {
      document.addEventListener(eventName, guardLockedEdit, true);
    });

    const observer = new MutationObserver(() => applyControlLockState());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function buildModal() {
    const existing = document.getElementById("editLockModal");
    if (existing) {
      return existing;
    }

    const modal = document.createElement("div");
    modal.id = "editLockModal";
    modal.className = "edit-lock-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="edit-lock-card" role="dialog" aria-modal="true" aria-labelledby="editLockTitle">
        <h2 id="editLockTitle">Edit Passkey</h2>
        <p id="editLockMessage">Enter the station passkey to unlock editing on this device.</p>
        <input id="editLockInput" class="edit-lock-input" type="password" autocomplete="off" aria-label="Edit passkey">
        <div id="editLockError" class="edit-lock-error" aria-live="polite"></div>
        <div class="edit-lock-actions">
          <button id="editLockCancel" class="edit-lock-button edit-lock-button--ghost" type="button">Cancel</button>
          <button id="editLockSubmit" class="edit-lock-button" type="button">Unlock</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector("#editLockInput");
    const message = modal.querySelector("#editLockMessage");
    const error = modal.querySelector("#editLockError");
    const cancel = modal.querySelector("#editLockCancel");
    const submit = modal.querySelector("#editLockSubmit");

    function close(result) {
      modal.hidden = true;
      input.value = "";
      error.textContent = "";
      const resolve = pendingResolve;
      pendingResolve = null;
      if (resolve) {
        resolve(result);
      }
    }

    function submitPasskey() {
      const mode = pendingMode;
      const expectedPasskey = mode === "admin" ? ADMIN_PASSKEY : PASSKEY;
      if (input.value === expectedPasskey) {
        rememberUnlock(mode);
        applyLockState();
        close(true);
        return;
      }

      error.textContent = "Incorrect passkey.";
      input.select();
    }

    modal.updateMode = (mode = "board") => {
      pendingMode = mode;
      modal.querySelector("#editLockTitle").textContent = mode === "admin" ? "Admin Passkey" : "Edit Passkey";
      message.textContent = mode === "admin"
        ? "Enter the admin passkey to edit Manage Site, Staffing Hours, and Archived Hours."
        : "Enter the station passkey to unlock board editing on this device.";
      input.inputMode = mode === "admin" ? "text" : "numeric";
    };

    submit.addEventListener("click", submitPasskey);
    cancel.addEventListener("click", () => close(false));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitPasskey();
      } else if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    });

    modal.addEventListener("mousedown", (event) => {
      if (event.target === modal) {
        close(false);
      }
    });

    return modal;
  }

  function requestPasskey(mode = "board") {
    if ((mode === "admin" && isAdminUnlocked()) || (mode !== "admin" && isUnlocked())) {
      return Promise.resolve(true);
    }

    if (pendingResolve) {
      pendingMode = mode;
      document.getElementById("editLockModal")?.updateMode?.(mode);
      document.getElementById("editLockInput")?.focus();
      return new Promise((resolve) => {
        const previousResolve = pendingResolve;
        pendingResolve = (result) => {
          previousResolve(result);
          resolve(result);
        };
      });
    }

    const modal = buildModal();
    modal.updateMode?.(mode);
    const input = modal.querySelector("#editLockInput");
    modal.hidden = false;
    window.setTimeout(() => input.focus(), 0);

    return new Promise((resolve) => {
      pendingResolve = resolve;
    });
  }

  function insertUnlockButton() {
    const mode = isAdminProtectedPage() ? "admin" : "board";
    const buttonId = mode === "admin" ? "adminUnlockButton" : "editUnlockButton";
    if (document.getElementById(buttonId)) {
      return;
    }

    const button = document.createElement("button");
    button.id = buttonId;
    button.className = "top-link edit-unlock-button";
    button.type = "button";
    button.addEventListener("click", () => {
      if (mode === "admin" ? isAdminUnlocked() : isUnlocked()) {
        window.station13EditLock?.lock(mode);
        return;
      }

      requestPasskey(mode);
    });

    const ridingNav = document.querySelector(".board-bottom-nav");
    if (ridingNav) {
      ridingNav.append(button);
      return;
    }

    const menu = document.querySelector(".top-links--menu");
    if (menu) {
      menu.append(button);
    }
  }

  function init() {
    insertUnlockButton();
    applyLockState();
    installEditGuards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.station13EditLock = {
    isUnlocked,
    isAdminUnlocked,
    canEdit,
    requestPasskey,
    lock(mode = "board") {
      localStorage.removeItem(mode === "admin" ? ADMIN_EDIT_KEY : EDIT_KEY);
      applyLockState();
    }
  };
})();
