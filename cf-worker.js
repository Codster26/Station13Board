import { DurableObject } from "cloudflare:workers";

const DEFAULT_STATE = {
  boardData: null,
  weeklyAssignments: null,
  archivedAssignments: null,
  dailyCrewsData: null,
  staffingHours: null,
  systemMeta: {
    lastScheduledSourceDate: null
  }
};

const TIME_ZONE = "America/New_York";

function getDatePartsInTimeZone(date, timeZone = TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value || "";
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute")
  };
}

function getDateKeyInTimeZone(date, timeZone = TIME_ZONE) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDaysToDateKey(dateKey, offset) {
  const source = new Date(`${dateKey}T00:00:00Z`);
  source.setUTCDate(source.getUTCDate() + offset);
  const year = source.getUTCFullYear();
  const month = String(source.getUTCMonth() + 1).padStart(2, "0");
  const day = String(source.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getVisibleArchivedDateKeys(referenceDateKey) {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(referenceDateKey, -(index + 1)));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function runDailyRollover(state, {
  sourceDateKey,
  archiveDateKey = sourceDateKey,
  currentDateKey,
  clearSourceWeekly = true,
  pruneArchived = true
}) {
  const nextState = clone({
    ...DEFAULT_STATE,
    ...(state || {}),
    systemMeta: {
      ...DEFAULT_STATE.systemMeta,
      ...(state?.systemMeta || {})
    }
  });

  const weeklyAssignments = { ...(nextState.weeklyAssignments || {}) };
  const archivedAssignments = { ...(nextState.archivedAssignments || {}) };
  const sourcePrefix = `weekly-${sourceDateKey}-`;
  const archivePrefix = `archived-${archiveDateKey}-`;

  Object.entries(weeklyAssignments).forEach(([key, value]) => {
    if (!key.startsWith(sourcePrefix)) {
      return;
    }

    const suffix = key.slice(sourcePrefix.length);
    archivedAssignments[`${archivePrefix}${suffix}`] = value;
  });

  if (clearSourceWeekly) {
    Object.keys(weeklyAssignments).forEach((key) => {
      if (key.startsWith(sourcePrefix)) {
        delete weeklyAssignments[key];
      }
    });
  }

  if (pruneArchived && currentDateKey) {
    const visibleArchivedKeys = new Set(getVisibleArchivedDateKeys(currentDateKey));
    Object.keys(archivedAssignments).forEach((key) => {
      const match = key.match(/^archived-(\d{4}-\d{2}-\d{2})-/);
      if (!match) {
        return;
      }

      if (!visibleArchivedKeys.has(match[1])) {
        delete archivedAssignments[key];
      }
    });
  }

  nextState.weeklyAssignments = weeklyAssignments;
  nextState.archivedAssignments = archivedAssignments;
  return nextState;
}

export class StateStore extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/internal/state" && request.method === "GET") {
      const stored = await this.ctx.storage.get("app-state");
      return Response.json({ ...DEFAULT_STATE, ...(stored || {}) });
    }

    if (url.pathname === "/internal/state" && request.method === "PUT") {
      const body = await request.json();
      await this.ctx.storage.put("app-state", { ...DEFAULT_STATE, ...(body || {}) });
      return Response.json({ ok: true });
    }

    if (url.pathname.startsWith("/internal/state/") && request.method === "PUT") {
      const key = decodeURIComponent(url.pathname.replace("/internal/state/", ""));
      const stored = await this.ctx.storage.get("app-state");
      const current = { ...DEFAULT_STATE, ...(stored || {}) };
      current[key] = await request.json();
      await this.ctx.storage.put("app-state", current);
      return Response.json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }
}

async function fetchCurrentState(env) {
  const id = env.STATE_STORE.idFromName("station13-shared-state");
  const stub = env.STATE_STORE.get(id);
  const response = await stub.fetch("https://state.internal/internal/state");
  return response.json();
}

async function persistFullState(env, state) {
  const id = env.STATE_STORE.idFromName("station13-shared-state");
  const stub = env.STATE_STORE.get(id);
  await stub.fetch("https://state.internal/internal/state", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(state)
  });
}

function buildRolloverSummary({ sourceDateKey, archiveDateKey, currentDateKey, state }) {
  const sourcePrefix = `weekly-${sourceDateKey}-`;
  const archivePrefix = `archived-${archiveDateKey}-`;
  const weeklyCount = Object.keys(state.weeklyAssignments || {}).filter((key) => key.startsWith(sourcePrefix)).length;
  const archivedCount = Object.keys(state.archivedAssignments || {}).filter((key) => key.startsWith(archivePrefix)).length;

  return {
    sourceDateKey,
    archiveDateKey,
    currentDateKey,
    copiedEntries: weeklyCount,
    archivedEntriesForTargetDate: archivedCount
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/state" && request.method === "GET") {
      const state = await fetchCurrentState(env);
      return Response.json(state, {
        headers: { "Cache-Control": "no-store" }
      });
    }

    if (url.pathname.startsWith("/api/state/") && request.method === "PUT") {
      const key = decodeURIComponent(url.pathname.replace("/api/state/", ""));
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_STATE, key)) {
        return Response.json({ error: "Unknown state key" }, { status: 404 });
      }

      let body;
      try {
        body = await request.json();
      } catch (error) {
        return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
      }

      const id = env.STATE_STORE.idFromName("station13-shared-state");
      const stub = env.STATE_STORE.get(id);
      await stub.fetch(`https://state.internal/internal/state/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      return Response.json({ ok: true });
    }

    if (url.pathname === "/api/admin/rollover-preview" && request.method === "GET") {
      const now = new Date();
      const sourceDateKey = url.searchParams.get("sourceDateKey") || getDateKeyInTimeZone(now);
      const currentDateKey = getDateKeyInTimeZone(now);
      const state = await fetchCurrentState(env);
      return Response.json(buildRolloverSummary({
        sourceDateKey,
        archiveDateKey: sourceDateKey,
        currentDateKey,
        state
      }));
    }

    if (url.pathname === "/api/admin/rollover" && request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch (error) {
        body = {};
      }

      const now = new Date();
      const currentDateKey = getDateKeyInTimeZone(now);
      const sourceDateKey = body.sourceDateKey || currentDateKey;
      const state = await fetchCurrentState(env);
      const nextState = runDailyRollover(state, {
        sourceDateKey,
        archiveDateKey: body.archiveDateKey || sourceDateKey,
        currentDateKey,
        clearSourceWeekly: body.clearSourceWeekly !== false,
        pruneArchived: body.pruneArchived !== false
      });
      await persistFullState(env, nextState);

      return Response.json({
        ok: true,
        summary: buildRolloverSummary({
          sourceDateKey,
          archiveDateKey: body.archiveDateKey || sourceDateKey,
          currentDateKey,
          state: nextState
        })
      });
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    const now = new Date(controller.scheduledTime || Date.now());
    const parts = getDatePartsInTimeZone(now);
    if (parts.hour !== "00") {
      return;
    }

    const currentDateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const sourceDateKey = addDaysToDateKey(currentDateKey, -1);
    const state = await fetchCurrentState(env);
    if (state.systemMeta?.lastScheduledSourceDate === sourceDateKey) {
      return;
    }

    const nextState = runDailyRollover(state, {
      sourceDateKey,
      archiveDateKey: sourceDateKey,
      currentDateKey,
      clearSourceWeekly: true,
      pruneArchived: true
    });

    nextState.systemMeta = {
      ...(nextState.systemMeta || {}),
      lastScheduledSourceDate: sourceDateKey
    };

    ctx.waitUntil(persistFullState(env, nextState));
  }
};
