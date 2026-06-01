(() => {
  const EDIT_KEY = "station13-edit-passkey-ok";
  const PASSKEY = "1326";
  const EDITABLE_SELECTOR = [
    "input",
    "select",
    "textarea",
    "button",
    "[contenteditable='true']"
  ].join(",");

  let pendingResolve = null;
  let lastRequestedTarget = null;

  function isUnlocked() {
    return localStorage.getItem(EDIT_KEY) === "true";
  }

  function rememberUnlock() {
    localStorage.setItem(EDIT_KEY, "true");
    document.documentElement.classList.add("station13-edit-unlocked");
  }

  function isLockUiTarget(target) {
    return Boolean(target?.closest?.(".edit-lock-modal"));
  }

  function isEditableTarget(target) {
    const editable = target?.closest?.(EDITABLE_SELECTOR);
    if (!editable || isLockUiTarget(target)) {
      return null;
    }

    if (editable.matches("button") && editable.classList.contains("menu-toggle")) {
      return null;
    }

    return editable;
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
      const input = document.getElementById("editLockInput");
      input?.focus();
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

  async function unlockForTarget(target) {
    const unlocked = await requestPasskey();
    if (!unlocked || !target?.isConnected) {
      return;
    }

    window.setTimeout(() => {
      target.focus?.();
      if (typeof target.select === "function" && target.matches("input, textarea")) {
        target.select();
      }
    }, 0);
  }

  function interceptEdit(event) {
    if (isUnlocked()) {
      return;
    }

    const editable = isEditableTarget(event.target);
    if (!editable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (lastRequestedTarget !== editable) {
      lastRequestedTarget = editable;
      unlockForTarget(editable).finally(() => {
        lastRequestedTarget = null;
      });
    } else {
      requestPasskey();
    }
  }

  document.addEventListener("pointerdown", interceptEdit, true);
  document.addEventListener("mousedown", interceptEdit, true);
  document.addEventListener("click", interceptEdit, true);
  document.addEventListener("focusin", interceptEdit, true);
  document.addEventListener("keydown", (event) => {
    if (isUnlocked() || isLockUiTarget(event.target)) {
      return;
    }

    const editable = isEditableTarget(event.target);
    if (!editable) {
      return;
    }

    const allowedNavigationKeys = new Set(["Tab", "Shift", "Control", "Alt", "Meta"]);
    if (allowedNavigationKeys.has(event.key)) {
      return;
    }

    interceptEdit(event);
  }, true);

  if (isUnlocked()) {
    document.documentElement.classList.add("station13-edit-unlocked");
  }

  window.station13EditLock = {
    isUnlocked,
    requestPasskey,
    lock() {
      localStorage.removeItem(EDIT_KEY);
      document.documentElement.classList.remove("station13-edit-unlocked");
    }
  };
})();
