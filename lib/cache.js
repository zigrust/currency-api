/**
 * Simple in-memory cache for exchange rates.
 * Cache TTL: 1 hour (3600 seconds).
 * In Vercel serverless, warm containers preserve module state between invocations.
 */

const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

let cache = {
  data: null,
  timestamp: 0,
  source: null,
};

/**
 * Get cached rates if still fresh.
 * @returns {{ data: object, source: string } | null}
 */
function getCached() {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return { data: cache.data, source: cache.source };
  }
  return null;
}

/**
 * Store rates in cache.
 * @param {object} data - The rates object
 * @param {string} source - Source name (e.g., "exchangerate.host")
 */
function setCache(data, source) {
  cache = {
    data,
    timestamp: Date.now(),
    source,
  };
}

/**
 * Clear the cache (useful for testing).
 */
function clearCache() {
  cache = { data: null, timestamp: 0, source: null };
}

/**
 * Get time remaining until cache expiry (in seconds).
 * @returns {number}
 */
function getTTL() {
  if (!cache.data) return 0;
  const remaining = CACHE_TTL - (Date.now() - cache.timestamp);
  return Math.max(0, Math.floor(remaining / 1000));
}

module.exports = { getCached, setCache, clearCache, getTTL, CACHE_TTL };
