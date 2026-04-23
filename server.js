const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "server-data");
const DATA_FILE = path.join(DATA_DIR, "state.json");
const PORT = Number(process.env.PORT || 3000);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const DEFAULT_STATE = {
  boardData: null,
  weeklyAssignments: null,
  archivedAssignments: null,
  dailyCrewsData: null,
  staffingHours: null
};

async function ensureDataFile() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.promises.access(DATA_FILE);
  } catch (error) {
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
  }
}

async function readState() {
  await ensureDataFile();
  try {
    const raw = await fs.promises.readFile(DATA_FILE, "utf8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw || "{}") };
  } catch (error) {
    return { ...DEFAULT_STATE };
  }
}

async function writeState(state) {
  await ensureDataFile();
  await fs.promises.writeFile(DATA_FILE, JSON.stringify(state, null, 2));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!raw) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

async function serveStaticFile(requestPath, response) {
  let filePath = requestPath === "/" ? path.join(ROOT_DIR, "index.html") : path.join(ROOT_DIR, requestPath);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[extension] || "application/octet-stream";
    const data = await fs.promises.readFile(filePath);
    response.writeHead(200, { "Content-Type": contentType });
    response.end(data);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/state") {
    const state = await readState();
    sendJson(response, 200, state);
    return;
  }

  if (request.method === "PUT" && requestUrl.pathname.startsWith("/api/state/")) {
    const key = decodeURIComponent(requestUrl.pathname.replace("/api/state/", ""));
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_STATE, key)) {
      sendJson(response, 404, { error: "Unknown state key" });
      return;
    }

    try {
      const body = await readRequestBody(request);
      const state = await readState();
      state[key] = body;
      await writeState(state);
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, 400, { error: "Invalid JSON payload" });
    }
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  await serveStaticFile(requestUrl.pathname, response);
});

server.listen(PORT, () => {
  console.log(`Station 13 Board server running at http://localhost:${PORT}`);
});
