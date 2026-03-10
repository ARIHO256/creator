# Mock System

This app uses a compatibility data layer that hydrates from the backend seller snapshot into `localStorage` under `__EVZONE_MOCK_DB__`.

## How It Works
- `src/mocks/db.ts` hydrates the seller snapshot from the backend and handles persistence + change notifications.
- `src/mocks/api.ts` provides mock actions (auth, listings, cart, orders) with delays/errors.
- `useRolePageContent()` reads from the hydrated DB snapshot, so seller/provider pages render DB-backed persisted content.

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
