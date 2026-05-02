# 💱 Currency Exchange Rate API

A lightweight, production-ready Currency Exchange Rate API built with vanilla Node.js — optimized for **Vercel serverless deployment**.

## Features

- **Zero dependencies** — no framework, no npm packages required
- **GET /api/rates?base=USD** — returns all exchange rates with a given base currency
- **GET /api/convert?from=USD&to=CNY&amount=100** — converts between currencies
- **1-hour caching** — reduces upstream API calls
- **Multi-source fallback** — fetches from exchangerate.host → Frankfurter → exchangerate-api.com
- **CORS enabled** — works from any frontend
- **Free tier** — 1,000 requests/month at no cost
- **Beautiful landing page** — live converter demo with pricing info

## Quick Deploy

### Deploy to Vercel

1. Clone or fork this repository
2. Import into [Vercel](https://vercel.com)
3. Set framework to **Other** (or it'll auto-detect)
4. Deploy — no environment variables needed

```bash
vercel deploy
```

### Run Locally

```bash
node index.js
# Server starts at http://localhost:3000
```

Or use Vercel CLI:

```bash
vercel dev
```

## API Reference

### Get All Rates

```
GET /api/rates?base=USD
```

**Response:**

```json
{
  "success": true,
  "base": "USD",
  "date": "2026-05-01",
  "rates": {
    "EUR": 0.9125,
    "GBP": 0.7852,
    "CNY": 7.2410,
    "JPY": 152.34,
    "...": "..."
  },
  "cached": false,
  "ttl": 3600,
  "source": "exchangerate.host"
}
```

### Convert Currency

```
GET /api/convert?from=USD&to=CNY&amount=100
```

**Response:**

```json
{
  "success": true,
  "from": "USD",
  "to": "CNY",
  "amount": 100,
  "rate": 7.241,
  "converted": 724.1,
  "cached": true,
  "ttl": 3420,
  "source": "exchangerate.host",
  "timestamp": "2026-05-01T23:00:00.000Z"
}
```

### Error Responses

```json
{
  "error": "Invalid base currency code.",
  "message": "Currency code must be a 3-letter ISO 4217 code (e.g., USD, EUR, CNY).",
  "example": "/api/rates?base=USD"
}
```

## Pricing

| Tier     | Requests/Month | Price       |
| -------- | -------------- | ----------- |
| Free     | 1,000          | $0          |
| Starter  | 10,000         | $5/month    |
| Pro      | 100,000        | $20/month   |

### Payment

Pay with **USDT** on the **Polygon Network**:

```
0xa817391A3D3530E034294A66232481bd77978775
```

After payment, open an issue or contact us with your transaction hash to have your tier upgraded.

## Architecture

```
currency-api/
├── api/
│   ├── rates.js          # GET /api/rates serverless function
│   └── convert.js        # GET /api/convert serverless function
├── lib/
│   ├── cache.js          # In-memory cache (1 hour TTL)
│   └── fetchRates.js     # Multi-source rate fetcher with fallback
├── public/
│   └── index.html        # Landing page with live converter demo
├── index.js              # Local development server
├── package.json
├── vercel.json           # Vercel deployment configuration
└── README.md
```

## Data Sources

All sources are **free** and require **no API key**:

1. **[exchangerate.host](https://exchangerate.host)** — ECB data, supports any base currency
2. **[Frankfurter](https://www.frankfurter.app)** — European Central Bank data (EUR base, rebased to requested currency)
3. **[exchangerate-api.com](https://www.exchangerate-api.com)** — Free tier, supports any base currency

The API tries each source in order and returns the first successful response. If all sources fail, it returns a 502 error.

## Caching

Exchange rates are cached in memory for **1 hour**. In Vercel serverless, warm containers preserve module state between invocations, so the cache persists across requests to the same container. Cold starts will fetch fresh data.

The response includes:
- `cached: true/false` — whether the response came from cache
- `ttl` — seconds until the cache expires
- `source` — which upstream provider supplied the data

## License

MIT
