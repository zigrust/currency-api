/**
 * GET /api/rates?base=USD
 * Returns all exchange rates with the specified base currency.
 * Cached for 1 hour.
 */

const { fetchRates } = require("../lib/fetchRates");
const { getCached, setCache, getTTL } = require("../lib/cache");

// CORS headers for all responses
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// Valid currency code regex
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

/**
 * Send a JSON response with CORS headers.
 */
function send(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(body));
}

/**
 * Vercel serverless function handler.
 */
module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    return send(res, 405, { error: "Method not allowed. Use GET." });
  }

  // Parse query parameters
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const baseParam = url.searchParams.get("base");

  const base = baseParam ? baseParam.toUpperCase() : "USD";

  // Validate currency code
  if (!CURRENCY_CODE_RE.test(base)) {
    return send(res, 400, {
      error: "Invalid base currency code.",
      message: "Currency code must be a 3-letter ISO 4217 code (e.g., USD, EUR, CNY).",
      example: "/api/rates?base=USD",
    });
  }

  // Check cache first
  const cached = getCached();
  if (cached && cached.data.base === base) {
    return send(res, 200, {
      success: true,
      base: cached.data.base,
      date: cached.data.date,
      rates: cached.data.rates,
      cached: true,
      ttl: getTTL(),
      source: cached.source,
    });
  }

  // Fetch fresh rates
  try {
    const result = await fetchRates(base);
    setCache(result, result.source);
    return send(res, 200, {
      success: true,
      base: result.base,
      date: result.date,
      rates: result.rates,
      cached: false,
      ttl: getTTL(),
      source: result.source,
    });
  } catch (err) {
    console.error("Failed to fetch rates:", err.message);
    return send(res, 502, {
      error: "Failed to fetch exchange rates.",
      message: "All upstream rate providers are currently unavailable. Please try again later.",
      details: err.message,
    });
  }
};
