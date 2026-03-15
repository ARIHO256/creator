# 08 Scaling, Load Testing, and Worker Deployment

Date: 2026-03-09

## Load Test Configuration
The backend supports a dedicated load-test mode to reduce logging overhead:
- `LOAD_TEST_MODE=true` disables request log hooks.
- `FASTIFY_LOGGER=false` disables Fastify's structured logger.
- `REQUEST_LOGS_ENABLED=false` disables per-request completion logs.

Recommended baseline for load tests:
- `REQUEST_TIMEOUT_MS=30000`
- `BODY_LIMIT_BYTES=10485760`
- `RATE_LIMIT_DEFAULT_LIMIT=240`
- `RATE_LIMIT_DEFAULT_WINDOW_MS=60000`

## Load Test Seed Script
Run the load-test seed script to generate realistic volume:
```
cd backend
npm run prisma:seed:loadtest
```

Optional environment variables:
- `SEED_SCALE` (default `1`)
- `SEED_SELLERS` (default `10 * SEED_SCALE`)
- `SEED_CREATORS` (default `10 * SEED_SCALE`)
- `SEED_PROVIDERS` (default `max(1, floor(SEED_SELLERS / 4))`)
- `SEED_LISTINGS_PER_SELLER` (default `5 * SEED_SCALE`)
- `SEED_ORDERS_PER_SELLER` (default `10 * SEED_SCALE`)
- `SEED_REVIEWS_PER_SELLER` (default `5 * SEED_SCALE`)
- `SEED_RESET=true` to clear existing data before seeding

## Built-In Load Harness
The backend now includes a dependency-free load runner:
```
cd backend
npm run loadtest:100
npm run loadtest:150
npm run loadtest:200
```

Useful environment variables:
- `LOAD_TEST_BASE_URL` (default `http://127.0.0.1:4010`)
- `LOAD_TEST_SCENARIO=public|seller` (default `public`)
- `LOAD_TEST_PATHS=/health,/api/ready,...` to override scenario defaults
- `LOAD_TEST_METHOD` (default `GET`)
- `LOAD_TEST_TIMEOUT_MS` (default `10000`)
- `LOAD_TEST_BEARER_TOKEN` for auth-enabled environments
- `LOAD_TEST_COOKIE` to send auth/session cookies

Default `public` scenario routes:
- `/health`
- `/api/ready`
- `/api/routes`
- `/api/landing/content`
- `/api/sellers?limit=20`
- `/api/marketplace/sellers?limit=20`
- `/api/taxonomy/trees`

Default `seller` scenario routes:
- `/api/ready`
- `/api/app/bootstrap`
- `/api/dashboard/feed`
- `/api/dashboard/summary`
- `/api/dashboard/my-day`

Notes:
- The `seller` scenario requires either a valid bearer token/cookie or server-side `AUTH_DISABLED=true`.
- For meaningful seller metrics under `AUTH_DISABLED=true`, point `AUTH_DEV_USER_ID` at a real seeded user.
- The script prints elapsed time, requests per second, error rate, p50/p95/p99 latency, and HTTP status distribution.

Recommended acceptance targets before calling the app safe for 100+ active users:
- `100` concurrency: `0%` timeouts, `< 1%` errors, `p95 < 400ms`
- `150` concurrency: `0%` timeouts, `< 1%` errors, `p95 < 700ms`
- `200` concurrency: `< 1%` errors, `p95 < 1000ms`, no worker dead-letter spike

## Worker Deployment
Background workers use the JobsService and background job table.
Recommended worker settings:
- `JOBS_WORKER_ENABLED=true` in worker processes
- `JOBS_WORKER_ENABLED=false` in API-only processes
- `JOBS_WORKER_ID` to identify each worker instance
- `JOBS_WORKER_BATCH` and `JOBS_WORKER_POLL_MS` tuned per queue depth
- `JOBS_RETRY_DELAY_MS` to control retry backoff

Queue candidates currently include:
- `audit` events
- `wholesale` notifications
- `media` upload completion events
- `workflow` onboarding submissions
- `realtime` event publication hooks
- `finance` settlement and reconciliation batches
- `exports` CSV/PDF generation jobs
- `regulatory` auto-review and evidence bundle generation
- `moderation` content + attachment scanning
- `catalog` bulk import jobs
- `search` index updates and reindex sweeps

## Realtime Delivery Hooks
Realtime event publishing is queued and can optionally publish to Redis:
- `REALTIME_ENABLED=true`
- `REALTIME_REDIS_URL` (defaults to `REDIS_URL`)
- `REALTIME_CHANNEL_PREFIX` (default `mldz:realtime:`)
- `REALTIME_MAX_ATTEMPTS` (default `3`)
- `REALTIME_STREAM_PING_MS` (default `25000`)
- `REALTIME_STREAM_MAX_PER_USER` (default `3`)
- `REALTIME_STREAM_MAX_TOTAL` (default `5000`)
- `REALTIME_STREAM_HISTORY_SIZE` (default `50`)
- `REALTIME_STREAM_HISTORY_TTL_MS` (default `300000`)
- `REALTIME_DELIVERY_RETRY_MS` (default `15000`)
- `REALTIME_DELIVERY_SWEEP_MS` (default `15000`)
- `REALTIME_DELIVERY_SWEEP_ENABLED` (default `true`)

Realtime streaming transport (SSE) is available at `GET /api/realtime/stream` and requires:
- JWT auth (same as other API routes).
- Redis pub/sub to deliver events across instances.
- Worker processes to publish events in multi-instance deployments.
The stream supports `Last-Event-ID` for best-effort replay using an in-memory buffer; full replay still requires persistent event storage.

Delivery receipts are persisted for retry/polling:
- `GET /api/realtime/pending`
- `POST /api/realtime/ack`

## Distributed Cache
Redis is supported via:
- `REDIS_URL`
- `CACHE_REDIS_PREFIX`

Enable Redis in production to avoid per-instance cache divergence.

## Exports + Evidence Storage
Generated exports and regulatory evidence bundles are stored on local disk by default.
Production should use object storage (S3/GCS/etc.) with signed URLs and lifecycle rules.
Config:
- `STORAGE_ROOT_DIR`
- `EXPORT_FILE_TTL_DAYS`
- `REGULATORY_EVIDENCE_TTL_DAYS`

## Search / Indexing
Search indexing is stored in the `SearchDocument` table and updated via background jobs.
For large-scale discovery, back the search module with OpenSearch/Meilisearch:
- `SEARCH_ENABLED`
- `SEARCH_INDEX_BATCH`
- `SEARCH_QUERY_LIMIT`

## Dashboard Snapshots
Dashboard summaries can be persisted for scale:
- `DASHBOARD_SNAPSHOT_TTL_MS` (default `60000`)
Snapshots reduce repeated aggregation for large seller/provider accounts.

Write-heavy seller operations invalidate dashboard caches and snapshots to keep KPIs fresh.

## Query Hotspot Review
Current hotspots and mitigation:
- `CommerceService.dashboardSummary`: multi-aggregate on orders, reviews, transactions. Cached with `CacheService` and indexed filters.
- `ReviewsService.insights`: multi-filter scans of reviews. Cached with `CacheService` and indexed fields (status, subjectUserId, channel, marketplace, sentiment).
- `Orders` and `Listings` filters: indexed by seller, channel, status; pagination is required for high volume.
- `DiscoveryService` queries: relies on indexed fields and pagination; no full-table scans.
- `CommunicationsService.messages`: thread/message fan-out is indexed by thread and user; paginate if message volume grows.
- `WholesaleService.quotes`: indexed by user/status and uses persisted totals for fast lists.
- `ProviderService` quote/booking/consultation lists: indexed by user and updatedAt, but still require pagination under high volume.
- `RegulatoryService` desk/compliance queries: scoped by user and indexed by updatedAt.
- `OpsService.overview`: multi-count aggregation over listings/orders/returns/disputes/documents/exports, cached per seller.
- `FavouritesService.listAll`: joins listings/sellers/opportunities; add pagination if user favorites exceed UI constraints.

For million-user readiness, pair these with:
- Read replicas and connection pooling.
- Query profiling in production (slow query logs).
- Redis-backed caches for heavy summary endpoints.

## Approval SLA Automation
Market approval SLA tracking uses background jobs:
- `APPROVAL_SLA_HOURS` (default `48`)
- `APPROVAL_REMINDER_HOURS` (default `24`)
- `APPROVAL_ESCALATE_HOURS` (default `72`, reserved for future auto-escalation policy)
