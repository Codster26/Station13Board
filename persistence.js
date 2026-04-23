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

async function pushPersistenceValue(key, value) {
  if (!persistenceServerAvailable) {
    return;
  }

  try {
    await fetch(`/api/state/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(value)
    });
  } catch (error) {
    persistenceServerAvailable = false;
  }
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
      const resolvedValue = serverValue !== undefined ? serverValue : fallbackValue;
      persistenceState[key] = cloneValue(resolvedValue);

      if (resolvedValue !== undefined && resolvedValue !== null) {
        writeLocalPersistence(key, resolvedValue);
      }

      if (persistenceServerAvailable && serverValue === undefined && fallbackValue !== null) {
        void pushPersistenceValue(key, fallbackValue);
      }
    });
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
  void pushPersistenceValue(key, value);
  return cloneValue(value);
}

window.storageService = {
  initializePersistence,
  loadValue: loadPersistenceValue,
  saveValue: savePersistenceValue,
  isServerAvailable: () => persistenceServerAvailable
};
