/**
 * Local development server.
 * Serves the API and static landing page.
 * Run with: node index.js
 * For production, deploy to Vercel.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

// Import API handlers
const ratesHandler = require("./api/rates");
const convertHandler = require("./api/convert");

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Parse URL-encoded path
  const cleanPath = decodeURIComponent(pathname);

  // API routes
  if (cleanPath === "/api/rates" || cleanPath.startsWith("/api/rates?")) {
    return ratesHandler(req, res);
  }

  if (cleanPath === "/api/convert" || cleanPath.startsWith("/api/convert?")) {
    return convertHandler(req, res);
  }

  // Static file serving
  let filePath;
  if (cleanPath === "/" || cleanPath === "") {
    filePath = path.join(__dirname, "public", "index.html");
  } else {
    // Serve from public directory, prevent directory traversal
    const safePath = cleanPath.replace(/^\/+/, "").replace(/\.\./g, "");
    filePath = path.join(__dirname, "public", safePath);
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    // 404 - serve index.html for SPA-style routing
    try {
      const indexData = fs.readFileSync(path.join(__dirname, "public", "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(indexData);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  💱 Currency Exchange API running at http://localhost:${PORT}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  📡 GET /api/rates?base=USD`);
  console.log(`  🔁 GET /api/convert?from=USD&to=CNY&amount=100`);
  console.log(`  🌐 Landing page: http://localhost:${PORT}\n`);
});
