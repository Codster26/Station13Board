import { DurableObject } from "cloudflare:workers";

const DEFAULT_STATE = {
  boardData: null,
  weeklyAssignments: null,
  archivedAssignments: null,
  dailyCrewsData: null,
  staffingHours: null
};

export class StateStore extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/internal/state" && request.method === "GET") {
      const stored = await this.ctx.storage.get("app-state");
      return Response.json({ ...DEFAULT_STATE, ...(stored || {}) });
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/state" && request.method === "GET") {
      const id = env.STATE_STORE.idFromName("station13-shared-state");
      const stub = env.STATE_STORE.get(id);
      const response = await stub.fetch("https://state.internal/internal/state");
      const state = await response.json();
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

    return env.ASSETS.fetch(request);
  }
};
