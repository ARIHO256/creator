# Mock System

This app ships with a lightweight mock data layer for end-to-end demos without a backend. The mock DB lives in `localStorage` under `__EVZONE_MOCK_DB__` and is seeded on first load.

## How It Works
- `src/mocks/seed.ts` defines the initial dataset.
- `src/mocks/db.ts` handles persistence + change notifications.
- `src/mocks/api.ts` provides mock actions (auth, listings, cart, orders) with delays/errors.
- `useRolePageContent()` now reads from the mock DB when available, so seller/provider pages render persisted content.

## Resetting Data
- Query param: `?reset=1`
- Dev console: `window.__resetMockData()`

## Demo Credentials
- Seller: `seller@demo.evzone` / `demo1234`
- Provider: `provider@demo.evzone` / `demo1234`
- Buyer: `buyer@demo.evzone` / `demo1234`

## Mock Controls
- Enable in prod: `VITE_USE_MOCKS=true` (or `VITE_ENABLE_MOCKS=1`)
- Network delay: `VITE_MOCK_DELAY_MS` (default 260ms)
- Fail rate: `VITE_MOCK_FAIL_RATE` (default 0)
- Force failure: `?fail=1`

## Debug
- Inspect DB: `window.__mockDb()`
- Reset DB: `window.__resetMockDB()`
