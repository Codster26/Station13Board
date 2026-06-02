(() => {
  const EDIT_KEY = "station13-edit-passkey-ok";
  const PASSKEY = "1326";
  const CONTROL_SELECTOR = "input, select, textarea, button";
  const SKIP_SELECTOR = ".edit-lock-button, .menu-toggle, .top-link, summary";

  let pendingResolve = null;

  function isUnlocked() {
    return localStorage.getItem(EDIT_KEY) === "true";
  }

  function rememberUnlock() {
    localStorage.setItem(EDIT_KEY, "true");
    document.documentElement.classList.add("station13-edit-unlocked");
  }

  function isProtectedControl(control) {
    return control && control.matches(CONTROL_SELECTOR) && !control.closest(".edit-lock-modal") && !control.matches(SKIP_SELECTOR);
  }

  function refreshButton() {
    const button = document.getElementById("editUnlockButton");
    if (!button) {
      return;
    }

    const unlocked = isUnlocked();
    button.textContent = unlocked ? "Relock Board" : "Unlock Editing";
    button.setAttribute("aria-pressed", unlocked ? "true" : "false");
    button.title = unlocked ? "Lock editing on this device" : "Enter passkey to edit the board";
    button.classList.toggle("edit-unlock-button--unlocked", unlocked);
  }

  function applyLockState() {
    document.documentElement.classList.toggle("station13-edit-locked", !isUnlocked());
    document.documentElement.classList.toggle("station13-edit-unlocked", isUnlocked());
    refreshButton();
  }

  function isEditEventTarget(target) {
    const control = target?.closest?.(CONTROL_SELECTOR);
    return isProtectedControl(control) ? control : null;
  }

  function guardLockedEdit(event) {
    if (isUnlocked()) {
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
        <p>Enter the station passkey to unlock editing on this device.</p>
        <input id="editLockInput" class="edit-lock-input" type="password" inputmode="numeric" autocomplete="off" aria-label="Edit passkey">
        <div id="editLockError" class="edit-lock-error" aria-live="polite"></div>
        <div class="edit-lock-actions">
          <button id="editLockCancel" class="edit-lock-button edit-lock-button--ghost" type="button">Cancel</button>
          <button id="editLockSubmit" class="edit-lock-button" type="button">Unlock</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector("#editLockInput");
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
      if (input.value === PASSKEY) {
        rememberUnlock();
        applyLockState();
        close(true);
        return;
      }

      error.textContent = "Incorrect passkey.";
      input.select();
    }

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

  function requestPasskey() {
    if (isUnlocked()) {
      return Promise.resolve(true);
    }

    if (pendingResolve) {
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
    const input = modal.querySelector("#editLockInput");
    modal.hidden = false;
    window.setTimeout(() => input.focus(), 0);

    return new Promise((resolve) => {
      pendingResolve = resolve;
    });
  }

  function insertUnlockButton() {
    if (document.getElementById("editUnlockButton")) {
      return;
    }

    const button = document.createElement("button");
    button.id = "editUnlockButton";
    button.className = "top-link edit-unlock-button";
    button.type = "button";
    button.addEventListener("click", () => {
      if (isUnlocked()) {
        window.station13EditLock?.lock();
        return;
      }

      requestPasskey();
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
    requestPasskey,
    lock() {
      localStorage.removeItem(EDIT_KEY);
      applyLockState();
    }
  };
})();
