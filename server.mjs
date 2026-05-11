// server.mjs — Sansy static + API proxy server
// Run: node server.mjs

import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3000;
const PYTHON_API = "http://localhost:8765";

const MIME = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".mjs":  "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

// ── Proxy to Python backend ──────────────────────────────────────────────────
function proxyToPython(req, res, urlPath) {
  const target = `${PYTHON_API}${urlPath}`;
  http.get(target, (pyRes) => {
    res.writeHead(pyRes.statusCode, {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    pyRes.pipe(res);
  }).on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Python backend unreachable. Run sansy.py first." }));
  });
}

// ── Static file server ───────────────────────────────────────────────────────
function serveStatic(req, res, urlPath) {
  const filePath = path.join(
    __dirname,
    urlPath === "/" ? "index.html" : urlPath
  );
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

// ── Main server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const { pathname, search } = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // API routes → proxy to Python
  if (pathname === "/stream" || pathname === "/download") {
    return proxyToPython(req, res, pathname + search);
  }

  // Everything else → static files
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`\n[Sansy] ─────────────────────────────────`);
  console.log(`  App:     http://localhost:${PORT}`);
  console.log(`  API:     ${PYTHON_API}`);
  console.log(`─────────────────────────────────────────`);
  console.log(`  Make sure sansy.py is running!\n`);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE")
    console.error(`[Sansy] Port ${PORT} in use. Kill the process or change PORT.`);
  else console.error("[Sansy] Server error:", e.message);
});
