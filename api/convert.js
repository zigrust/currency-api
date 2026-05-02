/**
 * GET /api/convert?from=USD&to=CNY&amount=100
 * Converts an amount from one currency to another.
 * Uses cached rates (1 hour TTL) or fetches fresh if needed.
 */

const { fetchRates } = require("../lib/fetchRates");
const { getCached, setCache, getTTL } = require("../lib/cache");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

function send(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(body));
}

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
  const from = (url.searchParams.get("from") || "USD").toUpperCase();
  const to = (url.searchParams.get("to") || "").toUpperCase();
  const amountStr = url.searchParams.get("amount") || "0";

  // Validate inputs
  if (!CURRENCY_CODE_RE.test(from)) {
    return send(res, 400, {
      error: "Invalid 'from' currency code.",
      message: "Must be a 3-letter ISO 4217 code (e.g., USD, EUR).",
    });
  }

  if (!CURRENCY_CODE_RE.test(to)) {
    return send(res, 400, {
      error: "Invalid 'to' currency code.",
      message: "Must be a 3-letter ISO 4217 code (e.g., CNY, JPY).",
    });
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount < 0) {
    return send(res, 400, {
      error: "Invalid amount.",
      message: "Amount must be a positive number.",
    });
  }

  // Get rates (from cache or fresh)
  let rates;
  let cached = false;
  let source = "";

  const cachedData = getCached();
  if (cachedData && cachedData.data.base === from && cachedData.data.rates[to]) {
    rates = cachedData.data.rates;
    cached = true;
    source = cachedData.source;
  } else {
    try {
      const result = await fetchRates(from);
      setCache(result, result.source);
      rates = result.rates;
      cached = false;
      source = result.source;
    } catch (err) {
      console.error("Failed to fetch rates:", err.message);
      return send(res, 502, {
        error: "Failed to fetch exchange rates.",
        message: "All upstream rate providers are currently unavailable. Please try again later.",
      });
    }
  }

  // Check if target currency is available
  const rate = rates[to];
  if (!rate) {
    return send(res, 400, {
      error: "Unsupported target currency.",
      message: `Currency '${to}' is not available. Try another currency code.`,
      available_currencies: Object.keys(rates).sort().slice(0, 30),
    });
  }

  // Calculate conversion
  const converted = +(amount * rate).toFixed(4);

  return send(res, 200, {
    success: true,
    from,
    to,
    amount,
    rate,
    converted,
    cached,
    ttl: getTTL(),
    source,
    timestamp: new Date().toISOString(),
  });
};
