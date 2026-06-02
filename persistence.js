const PERSISTENCE_KEYS = {
  boardData: "station13-riding-board-data",
  weeklyAssignments: "station13-weekly-calendar",
  archivedAssignments: "station13-archived-calendar",
  dailyCrewsData: "station13-daily-crews",
  staffingHours: "station13-staffing-hours",
  systemMeta: "station13-system-meta"
};

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

    if (serializeValue(currentValue) === serializeValue(remoteValue)) {
      return;
    }

    persistenceState[key] = cloneValue(remoteValue);
    if (remoteValue !== undefined && remoteValue !== null) {
      writeLocalPersistence(key, remoteValue);
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
      const resolvedValue = hasServerValue ? serverValue : fallbackValue;
      persistenceState[key] = cloneValue(resolvedValue);

      if (resolvedValue !== undefined && resolvedValue !== null) {
        writeLocalPersistence(key, resolvedValue);
      }

      if (persistenceServerAvailable && !hasServerValue && fallbackValue !== null) {
        void pushPersistenceValue(key, fallbackValue);
      }
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
  persistenceState[key] = cloneValue(value);
  writeLocalPersistence(key, value);
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
