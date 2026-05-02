/**
 * Fetch live exchange rates from free public APIs.
 * Multiple sources with automatic fallback.
 *
 * Sources (all free, no API key required):
 * 1. exchangerate.host (primary) — uses ECB data, supports any base
 * 2. Frankfurter (fallback 1) — ECB data by the European Central Bank
 * 3. Open Exchange Rates free tier via exchangerate-api.com (fallback 2)
 */

const https = require("https");
const http = require("http");

/**
 * Make an HTTP GET request and return parsed JSON.
 * @param {string} url
 * @returns {Promise<object>}
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      { timeout: 8000 },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON from ${url}: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timeout: ${url}`));
    });
  });
}

/**
 * Fetch rates from exchangerate.host (supports any base currency).
 * Free, no API key. Data sourced from ECB.
 */
async function fetchFromExchangeRateHost(base = "USD") {
  const url = `https://api.exchangerate.host/latest?base=${base}&places=4`;
  const result = await httpGet(url);
  if (!result.success && !result.rates) {
    throw new Error("exchangerate.host returned invalid data");
  }
  return {
    base: result.base || base,
    date: result.date,
    rates: result.rates,
  };
}

/**
 * Fetch rates from Frankfurter (ECB data, EUR base only).
 * We fetch EUR rates then convert to desired base.
 */
async function fetchFromFrankfurter(base = "USD") {
  const url = "https://api.frankfurter.app/latest?from=EUR";
  const result = await httpGet(url);
  if (!result.rates) {
    throw new Error("Frankfurter returned invalid data");
  }

  // Frankfurter returns rates relative to EUR
  const eurRates = { ...result.rates, EUR: 1 };

  if (base === "EUR") {
    return { base: "EUR", date: result.date, rates: eurRates };
  }

  // Rebase to desired base currency
  const baseRate = eurRates[base];
  if (!baseRate) {
    throw new Error(`Base currency ${base} not found in Frankfurter data`);
  }

  const rebasedRates = {};
  for (const [currency, rate] of Object.entries(eurRates)) {
    rebasedRates[currency] = +(rate / baseRate).toFixed(4);
  }

  return { base, date: result.date, rates: rebasedRates };
}

/**
 * Fetch rates from exchangerate-api.com (free tier, no key).
 */
async function fetchFromExchangeRateApi(base = "USD") {
  const url = `https://api.exchangerate-api.com/v4/latest/${base}`;
  const result = await httpGet(url);
  if (!result.rates) {
    throw new Error("exchangerate-api.com returned invalid data");
  }
  return {
    base: base,
    date: result.date,
    rates: result.rates,
  };
}

/**
 * Fetch rates with fallback chain.
 * @param {string} base - Base currency code (e.g., "USD")
 * @returns {Promise<{ base: string, date: string, rates: object, source: string }>}
 */
async function fetchRates(base = "USD") {
  const baseUpper = base.toUpperCase();

  const sources = [
    { name: "exchangerate.host", fn: () => fetchFromExchangeRateHost(baseUpper) },
    { name: "Frankfurter", fn: () => fetchFromFrankfurter(baseUpper) },
    { name: "exchangerate-api.com", fn: () => fetchFromExchangeRateApi(baseUpper) },
  ];

  const errors = [];

  for (const source of sources) {
    try {
      const result = await source.fn();
      return { ...result, source: source.name };
    } catch (err) {
      errors.push(`${source.name}: ${err.message}`);
    }
  }

  throw new Error(
    `Failed to fetch rates from all sources:\n${errors.map((e) => `  - ${e}`).join("\n")}`
  );
}

module.exports = { fetchRates };
