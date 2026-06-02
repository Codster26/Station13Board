const PERSISTENCE_KEYS = {
  boardData: "station13-riding-board-data",
  weeklyAssignments: "station13-weekly-calendar",
  archivedAssignments: "station13-archived-calendar",
  dailyCrewsData: "station13-daily-crews",
  staffingHours: "station13-staffing-hours",
  systemMeta: "station13-system-meta"
};
const PERSISTENCE_VERSION_KEY = "station13-persistence-versions";

const persistenceState = {};
let persistenceReady = null;
let persistenceServerAvailable = false;
let persistencePollingTimer = null;
let persistencePollingInFlight = false;
const pendingPersistenceWrites = new Set();
const POLLING_INTERVAL_MS = 5000;
const LOCAL_KEY_TO_STATE_KEY = Object.fromEntries(
  Object.entries(PERSISTENCE_KEYS).map(([stateKey, localKey]) => [localKey, stateKey])
);

function readLocalPersistence(key, fallbackValue) {
  const localStorageKey = PERSISTENCE_KEYS[key];
  if (!localStorageKey) {
    return fallbackValue;
  }

  try {
    const raw = localStorage.getItem(localStorageKey);
    if (!raw) {
      return fallbackValue;
    }
    return JSON.parse(raw);
  } catch (error) {
    return fallbackValue;
  }
}

function writeLocalPersistence(key, value) {
  const localStorageKey = PERSISTENCE_KEYS[key];
  if (!localStorageKey) {
    return;
  }

  localStorage.setItem(localStorageKey, JSON.stringify(value));
}

function readLocalVersions() {
  try {
    const raw = localStorage.getItem(PERSISTENCE_VERSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeLocalVersions(versions) {
  localStorage.setItem(PERSISTENCE_VERSION_KEY, JSON.stringify(versions || {}));
}

function getLocalVersion(key) {
  const versions = readLocalVersions();
  return Number(versions[key] || 0);
}

function setLocalVersion(key, version = Date.now()) {
  if (key === "systemMeta") {
    return;
  }

  const versions = readLocalVersions();
  versions[key] = version;
  writeLocalVersions(versions);
}

function getRemoteVersion(serverState, key) {
  if (key === "systemMeta") {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(serverState?.systemMeta?.persistenceVersions?.[key] || 0);
}

function countMeaningfulValues(value, objectKey = "") {
  if (value === null || value === undefined || objectKey.startsWith("__")) {
    return 0;
  }

  if (typeof value === "string") {
    const entries = value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter((entry) => entry && entry !== "Open Assignment");
    return entries.length;
  }

  if (typeof value === "number") {
    return value !== 0 ? 1 : 0;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countMeaningfulValues(item), 0);
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce((total, [key, item]) => {
      return total + countMeaningfulValues(item, key);
    }, 0);
  }

  return 0;
}

function isRemoteSuspiciouslyThin(remoteValue, localValue) {
  const localScore = countMeaningfulValues(localValue);
  const remoteScore = countMeaningfulValues(remoteValue);
  return localScore >= 5 && remoteScore <= Math.max(1, Math.floor(localScore * 0.1));
}

function isRemoteOlderThanLocal(serverState, key, localValue) {
  if (key === "systemMeta" || localValue === null || localValue === undefined) {
    return false;
  }

  const localVersion = getLocalVersion(key);
  const remoteVersion = getRemoteVersion(serverState, key);
  const localScore = countMeaningfulValues(localValue);

  if (localVersion > 0 && remoteVersion < localVersion) {
    return true;
  }

  if (remoteVersion === 0 && localScore >= 5) {
    return serializeValue(serverState[key]) !== serializeValue(localValue)
      || isRemoteSuspiciouslyThin(serverState[key], localValue);
  }

  return false;
}

function cloneValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function serializeValue(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function dispatchPersistenceUpdate(changedKeys) {
  if (!changedKeys.length) {
    return;
  }

  window.dispatchEvent(new CustomEvent("station13:persistence-updated", {
    detail: { changedKeys }
  }));
}

async function pushPersistenceValue(key, value) {
  if (!persistenceServerAvailable) {
    pendingPersistenceWrites.delete(key);
    return;
  }

  try {
    const response = await fetch(`/api/state/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(value)
    });
    if (!response.ok) {
      throw new Error("Could not save remote state.");
    }
  } catch (error) {
    persistenceServerAvailable = false;
  } finally {
    pendingPersistenceWrites.delete(key);
  }
}

function mergeRemoteState(serverState) {
  const changedKeys = [];

  Object.keys(PERSISTENCE_KEYS).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(serverState, key) || pendingPersistenceWrites.has(key)) {
      return;
    }

    const remoteValue = serverState[key];
    if (remoteValue === null) {
      return;
    }

    const currentValue = Object.prototype.hasOwnProperty.call(persistenceState, key)
      ? persistenceState[key]
      : readLocalPersistence(key, null);

    if (isRemoteOlderThanLocal(serverState, key, currentValue)) {
      return;
    }

    if (serializeValue(currentValue) === serializeValue(remoteValue)) {
      return;
    }

    persistenceState[key] = cloneValue(remoteValue);
    if (remoteValue !== undefined && remoteValue !== null) {
      writeLocalPersistence(key, remoteValue);
      if (key !== "systemMeta") {
        setLocalVersion(key, getRemoteVersion(serverState, key));
      }
    }
    changedKeys.push(key);
  });

  dispatchPersistenceUpdate(changedKeys);
}

async function pollRemotePersistence() {
  if (!persistenceServerAvailable || persistencePollingInFlight) {
    return;
  }

  persistencePollingInFlight = true;
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load remote state.");
    }
    const serverState = await response.json();
    mergeRemoteState(serverState);
  } catch (error) {
    persistenceServerAvailable = false;
    stopPersistencePolling();
  } finally {
    persistencePollingInFlight = false;
  }
}

function startPersistencePolling() {
  if (!persistenceServerAvailable || persistencePollingTimer) {
    return;
  }

  persistencePollingTimer = window.setInterval(pollRemotePersistence, POLLING_INTERVAL_MS);
  void pollRemotePersistence();
}

function stopPersistencePolling() {
  if (!persistencePollingTimer) {
    return;
  }

  window.clearInterval(persistencePollingTimer);
  persistencePollingTimer = null;
}

async function initializePersistence() {
  if (persistenceReady) {
    return persistenceReady;
  }

  persistenceReady = (async () => {
    let serverState = {};

    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (response.ok) {
        serverState = await response.json();
        persistenceServerAvailable = true;
      }
    } catch (error) {
      persistenceServerAvailable = false;
    }

    Object.keys(PERSISTENCE_KEYS).forEach((key) => {
      const fallbackValue = readLocalPersistence(key, null);
      const serverValue = serverState[key];
      const hasServerValue = serverValue !== undefined && serverValue !== null;
      const shouldKeepLocalValue = hasServerValue && isRemoteOlderThanLocal(serverState, key, fallbackValue);
      const resolvedValue = hasServerValue && !shouldKeepLocalValue ? serverValue : fallbackValue;
      persistenceState[key] = cloneValue(resolvedValue);

      if (resolvedValue !== undefined && resolvedValue !== null) {
        writeLocalPersistence(key, resolvedValue);
        if (hasServerValue && !shouldKeepLocalValue && key !== "systemMeta") {
          setLocalVersion(key, getRemoteVersion(serverState, key));
        }
      }

      // Do not automatically seed remote state from a browser's localStorage.
      // After an outage, a stale/default tab could otherwise overwrite the
      // shared board as soon as the API comes back online.
    });

    startPersistencePolling();
  })();

  return persistenceReady;
}

function loadPersistenceValue(key, fallbackValue) {
  if (Object.prototype.hasOwnProperty.call(persistenceState, key) && persistenceState[key] !== undefined) {
    return cloneValue(persistenceState[key]);
  }

  const localValue = readLocalPersistence(key, fallbackValue);
  persistenceState[key] = cloneValue(localValue);
  return cloneValue(localValue);
}

function savePersistenceValue(key, value) {
  const version = Date.now();
  persistenceState[key] = cloneValue(value);
  writeLocalPersistence(key, value);
  setLocalVersion(key, version);
  pendingPersistenceWrites.add(key);
  void pushPersistenceValue(key, value);
  return cloneValue(value);
}

window.addEventListener("storage", (event) => {
  const key = LOCAL_KEY_TO_STATE_KEY[event.key];
  if (!key || pendingPersistenceWrites.has(key) || event.newValue === null) {
    return;
  }

  try {
    const nextValue = JSON.parse(event.newValue);
    if (serializeValue(persistenceState[key]) === serializeValue(nextValue)) {
      return;
    }

    persistenceState[key] = cloneValue(nextValue);
    setLocalVersion(key);
    dispatchPersistenceUpdate([key]);
  } catch (error) {
    // Ignore malformed localStorage updates from outside this app.
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    void pollRemotePersistence();
  }
});

window.storageService = {
  initializePersistence,
  loadValue: loadPersistenceValue,
  saveValue: savePersistenceValue,
  isServerAvailable: () => persistenceServerAvailable,
  startPolling: startPersistencePolling,
  stopPolling: stopPersistencePolling
};
