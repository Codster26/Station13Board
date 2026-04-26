import { DurableObject } from "cloudflare:workers";
import puppeteer from "@cloudflare/puppeteer";

const DEFAULT_STATE = {
  boardData: null,
  weeklyAssignments: null,
  archivedAssignments: null,
  dailyCrewsData: null,
  staffingHours: null,
  systemMeta: {
    lastScheduledSourceDate: null,
    displayDateKey: null,
    lastWeeklyExportDate: null
  }
};

const TIME_ZONE = "America/New_York";
const GOOGLE_DRIVE_ROOT_FOLDER_ID = "0ADMA0rIWAkuDUk9PVA";
const SHIFT_WINDOWS = {
  a: { start: 0, end: 6 },
  b: { start: 6, end: 12 },
  c: { start: 12, end: 18 },
  d: { start: 18, end: 24 }
};

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

function getVisibleStaffingDateKeys(referenceDateKey) {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(referenceDateKey, -(index + 1)));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getMonthFolderLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const monthNumber = date.getMonth() + 1;
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
  return `${monthNumber} - ${monthName}`;
}

function getWeekNumberForDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function buildExportFilename(referenceDateKey, suffix) {
  return `${referenceDateKey} Week ${getWeekNumberForDateKey(referenceDateKey)} ${suffix}.pdf`;
}

function getPublicBaseUrl(request, env) {
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }

  if (env.PUBLIC_SITE_URL) {
    return env.PUBLIC_SITE_URL.replace(/\/+$/, "");
  }

  throw new Error("PUBLIC_SITE_URL is not configured for scheduled PDF exports.");
}

async function renderLivePagePdf(env, targetUrl, selector, zoom, extraCss = "") {
  const browser = await puppeteer.launch(env.BROWSER);

  try {
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle0" });
    await page.waitForSelector(selector, { timeout: 30000 });
    await page.addStyleTag({
      content: `
        body::before,
        .nav-menu,
        .menu-toggle,
        .manage-actions {
          display: none !important;
        }
        .page-shell {
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .hero {
          margin-bottom: 14px !important;
        }
        body {
          zoom: ${zoom};
        }
        ${extraCss}
      `
    });
    await page.emulateMediaType("screen");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const dimensions = await page.evaluate(() => ({
      width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    }));

    const widthInches = Math.max(8.5, dimensions.width / 96);
    const heightInches = Math.max(11, dimensions.height / 96);

    return await page.pdf({
      printBackground: true,
      width: `${widthInches}in`,
      height: `${heightInches}in`,
      margin: {
        top: "0in",
        right: "0in",
        bottom: "0in",
        left: "0in"
      }
    });
  } finally {
    await browser.close();
  }
}

function pemToArrayBuffer(pem) {
  const normalized = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function base64UrlEncode(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getGoogleAccessToken(env) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Google Drive credentials are not configured.");
  }

  const credentials = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: nowSeconds + 3600,
    iat: nowSeconds
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(credentials.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));
  const jwt = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!response.ok) {
    throw new Error("Could not authenticate with Google Drive.");
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

async function findDriveFolder(accessToken, parentId, folderName) {
  const query = [
    `name='${folderName.replace(/'/g, "\\'")}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    `'${parentId}' in parents`
  ].join(" and ");

  const searchParams = new URLSearchParams({
    q: query,
    fields: "files(id,name)",
    pageSize: "1",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true"
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Could not look up Google Drive folders.");
  }

  const data = await response.json();
  return data.files?.[0] || null;
}

async function createDriveFolder(accessToken, parentId, folderName) {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId]
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Could not create Google Drive folder "${folderName}". ${details}`);
  }

  return response.json();
}

async function ensureDriveFolder(accessToken, parentId, folderName) {
  const existing = await findDriveFolder(accessToken, parentId, folderName);
  if (existing) {
    return existing.id;
  }

  const created = await createDriveFolder(accessToken, parentId, folderName);
  return created.id;
}

async function uploadDriveFile(accessToken, folderId, filename, bytes, mimeType = "application/pdf") {
  const boundary = `station13board-${crypto.randomUUID()}`;
  const metadata = {
    name: filename,
    parents: [folderId]
  };

  const prefix =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  const suffix = `\r\n--${boundary}--`;

  const body = new Uint8Array(
    new TextEncoder().encode(prefix).length +
    bytes.length +
    new TextEncoder().encode(suffix).length
  );
  let offset = 0;
  const prefixBytes = new TextEncoder().encode(prefix);
  body.set(prefixBytes, offset);
  offset += prefixBytes.length;
  body.set(bytes, offset);
  offset += bytes.length;
  const suffixBytes = new TextEncoder().encode(suffix);
  body.set(suffixBytes, offset);

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Could not upload "${filename}" to Google Drive. ${details}`);
  }

  return response.json();
}

async function exportWeeklyRecordsToGoogleDrive(request, env, state, referenceDateKey) {
  const accessToken = await getGoogleAccessToken(env);
  const yearFolderId = await ensureDriveFolder(accessToken, GOOGLE_DRIVE_ROOT_FOLDER_ID, referenceDateKey.slice(0, 4));
  const monthFolderId = await ensureDriveFolder(accessToken, yearFolderId, getMonthFolderLabel(referenceDateKey));
  const baseUrl = getPublicBaseUrl(request, env);
  const staffingPdf = await renderLivePagePdf(
    env,
    `${baseUrl}/staffing.html?export=1`,
    "#staffingTable",
    0.76,
    ".staffing-card { box-shadow: none !important; }"
  );
  const weeklyPdf = await renderLivePagePdf(
    env,
    `${baseUrl}/weekly.html?export=1`,
    "#weeklyStack .daily-calendar-card",
    0.72,
    ".daily-calendar-card { box-shadow: none !important; }"
  );

  const staffingFilename = buildExportFilename(referenceDateKey, "Staffing Hours");
  const weeklyFilename = buildExportFilename(referenceDateKey, "Weekly Staffing");

  const staffingUpload = await uploadDriveFile(accessToken, monthFolderId, staffingFilename, new Uint8Array(staffingPdf));
  const weeklyUpload = await uploadDriveFile(accessToken, monthFolderId, weeklyFilename, new Uint8Array(weeklyPdf));

  return {
    folderId: monthFolderId,
    files: [
      { name: staffingFilename, id: staffingUpload.id },
      { name: weeklyFilename, id: weeklyUpload.id }
    ]
  };
}

function runDailyRollover(state, {
  sourceDateKey,
  archiveDateKey = sourceDateKey,
  currentDateKey,
  nextDisplayDateKey = currentDateKey,
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
  nextState.systemMeta = {
    ...(nextState.systemMeta || {}),
    displayDateKey: nextDisplayDateKey || currentDateKey || null
  };
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
    displayDateKey: state.systemMeta?.displayDateKey || null,
    copiedEntries: weeklyCount,
    archivedEntriesForTargetDate: archivedCount
  };
}

function parseHourValue(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function addHours(result, memberName, amount) {
  if (!memberName || !amount || amount <= 0) {
    return;
  }

  result[memberName] = (result[memberName] || 0) + amount;
}

function calculateRightColumnHours(shiftId, inValue, outValue) {
  const window = SHIFT_WINDOWS[shiftId];
  if (!window) {
    return 0;
  }

  const inHour = parseHourValue(inValue);
  const outHour = parseHourValue(outValue);

  if (inHour !== null && outHour !== null) {
    const clampedIn = Math.max(window.start, Math.min(window.end, inHour));
    const clampedOut = Math.max(window.start, Math.min(window.end, outHour));

    if (clampedOut >= clampedIn) {
      return Math.max(0, clampedOut - clampedIn);
    }

    const firstSegment = Math.max(0, clampedOut - window.start);
    const secondSegment = Math.max(0, window.end - clampedIn);
    return firstSegment + secondSegment;
  }

  if (inHour !== null) {
    return Math.max(0, window.end - Math.max(window.start, inHour));
  }

  if (outHour !== null) {
    return Math.max(0, Math.min(window.end, outHour) - window.start);
  }

  return window.end - window.start;
}

function calculateCommandHours(shiftId, inValue, outValue) {
  return calculateRightColumnHours(shiftId, inValue, outValue);
}

function calculateDailyHoursFromWeekly(weeklyAssignments, sourceDateKey) {
  const result = {};
  const assignments = weeklyAssignments || {};

  Object.keys(SHIFT_WINDOWS).forEach((shiftId) => {
    const window = SHIFT_WINDOWS[shiftId];

    for (let row = 0; row < 15; row += 1) {
      const prefix = `weekly-${sourceDateKey}-${shiftId}-${row}`;
      const leftMember = assignments[`${prefix}-member1`] || "";
      const rightMember = assignments[`${prefix}-member2`] || "";
      const inValue = assignments[`${prefix}-in`] || "";
      const outValue = assignments[`${prefix}-out`] || "";

      addHours(result, leftMember, window.end - window.start);
      addHours(result, rightMember, calculateRightColumnHours(shiftId, inValue, outValue));
    }

    const commandMember = assignments[`weekly-${sourceDateKey}-command-${shiftId}-member`] || "";
    const commandIn = assignments[`weekly-${sourceDateKey}-command-${shiftId}-in`] || "";
    const commandOut = assignments[`weekly-${sourceDateKey}-command-${shiftId}-out`] || "";
    addHours(result, commandMember, calculateCommandHours(shiftId, commandIn, commandOut));
  });

  return result;
}

function applyCalculatedHoursToStaffing(state, sourceDateKey, targetDateKey) {
  const nextState = clone({
    ...DEFAULT_STATE,
    ...(state || {}),
    systemMeta: {
      ...DEFAULT_STATE.systemMeta,
      ...(state?.systemMeta || {})
    }
  });

  const staffingHours = clone(nextState.staffingHours || {});
  const calculatedHours = calculateDailyHoursFromWeekly(nextState.weeklyAssignments || {}, sourceDateKey);

  Object.keys(staffingHours).forEach((memberName) => {
    if (staffingHours[memberName] && Object.prototype.hasOwnProperty.call(staffingHours[memberName], targetDateKey)) {
      delete staffingHours[memberName][targetDateKey];
      if (Object.keys(staffingHours[memberName]).length === 0) {
        delete staffingHours[memberName];
      }
    }
  });

  Object.entries(calculatedHours).forEach(([memberName, hours]) => {
    if (!staffingHours[memberName]) {
      staffingHours[memberName] = {};
    }
    staffingHours[memberName][targetDateKey] = hours;
  });

  nextState.staffingHours = staffingHours;
  return {
    state: nextState,
    calculatedHours
  };
}

function shiftStaffingWindowForYesterday(nextState, currentDateKey, targetDateKey) {
  const visibleStaffingKeys = getVisibleStaffingDateKeys(currentDateKey);
  if (targetDateKey !== visibleStaffingKeys[0]) {
    return nextState;
  }

  const staffingHours = clone(nextState.staffingHours || {});

  Object.keys(staffingHours).forEach((memberName) => {
    const memberHours = { ...(staffingHours[memberName] || {}) };

    for (let index = visibleStaffingKeys.length - 1; index > 0; index -= 1) {
      const destinationKey = visibleStaffingKeys[index];
      const sourceKey = visibleStaffingKeys[index - 1];

      if (Object.prototype.hasOwnProperty.call(memberHours, sourceKey)) {
        memberHours[destinationKey] = memberHours[sourceKey];
      } else {
        delete memberHours[destinationKey];
      }
    }

    delete memberHours[targetDateKey];

    if (Object.keys(memberHours).length === 0) {
      delete staffingHours[memberName];
    } else {
      staffingHours[memberName] = memberHours;
    }
  });

  nextState.staffingHours = staffingHours;
  return nextState;
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
      const hoursResult = applyCalculatedHoursToStaffing(
        state,
        sourceDateKey,
        body.targetDateKey || sourceDateKey
      );
      const nextState = runDailyRollover(hoursResult.state, {
        sourceDateKey,
        archiveDateKey: body.archiveDateKey || sourceDateKey,
        currentDateKey,
        nextDisplayDateKey: body.nextDisplayDateKey || currentDateKey,
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

    if (url.pathname === "/api/admin/calculate-hours" && request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch (error) {
        body = {};
      }

      const now = new Date();
      const currentDateKey = getDateKeyInTimeZone(now);
      const sourceDateKey = body.sourceDateKey || currentDateKey;
      const targetDateKey = body.targetDateKey || sourceDateKey;
      const state = await fetchCurrentState(env);
      let nextState = clone({
        ...DEFAULT_STATE,
        ...(state || {}),
        systemMeta: {
          ...DEFAULT_STATE.systemMeta,
          ...(state?.systemMeta || {})
        }
      });

      if (body.shiftYesterdayColumn === true) {
        nextState = shiftStaffingWindowForYesterday(nextState, currentDateKey, targetDateKey);
      }

      const result = applyCalculatedHoursToStaffing(nextState, sourceDateKey, targetDateKey);
      await persistFullState(env, result.state);

      return Response.json({
        ok: true,
        sourceDateKey,
        targetDateKey,
        shiftedYesterdayColumn: body.shiftYesterdayColumn === true,
        calculatedHours: result.calculatedHours
      });
    }

    if (url.pathname === "/api/admin/export-weekly-records" && request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch (error) {
        body = {};
      }

      const now = new Date();
      const currentDateKey = getDateKeyInTimeZone(now);
      const state = await fetchCurrentState(env);
      const referenceDateKey = body.referenceDateKey || state?.systemMeta?.displayDateKey || currentDateKey;
      try {
        const result = await exportWeeklyRecordsToGoogleDrive(request, env, state, referenceDateKey);

        const nextState = clone({
          ...DEFAULT_STATE,
          ...(state || {}),
          systemMeta: {
            ...DEFAULT_STATE.systemMeta,
            ...(state?.systemMeta || {}),
            lastWeeklyExportDate: referenceDateKey
          }
        });
        await persistFullState(env, nextState);

        return Response.json({
          ok: true,
          referenceDateKey,
          ...result
        });
      } catch (error) {
        return Response.json({
          ok: false,
          error: error.message || "Could not export weekly records."
        }, { status: 500 });
      }
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

    const hoursResult = applyCalculatedHoursToStaffing(state, sourceDateKey, sourceDateKey);
    const nextState = runDailyRollover(hoursResult.state, {
      sourceDateKey,
      archiveDateKey: sourceDateKey,
      currentDateKey,
      nextDisplayDateKey: currentDateKey,
      clearSourceWeekly: true,
      pruneArchived: true
    });

    nextState.systemMeta = {
      ...(nextState.systemMeta || {}),
      lastScheduledSourceDate: sourceDateKey
    };

    ctx.waitUntil((async () => {
      let finalState = nextState;

      if (new Date(`${currentDateKey}T00:00:00`).getDay() === 0 && finalState.systemMeta?.lastWeeklyExportDate !== currentDateKey) {
        try {
          await exportWeeklyRecordsToGoogleDrive(null, env, finalState, currentDateKey);
          finalState = clone({
            ...finalState,
            systemMeta: {
              ...(finalState.systemMeta || {}),
              lastWeeklyExportDate: currentDateKey
            }
          });
        } catch (error) {
          console.error("Weekly Google Drive export failed:", error);
        }
      }

      await persistFullState(env, finalState);
    })());
  }
};
