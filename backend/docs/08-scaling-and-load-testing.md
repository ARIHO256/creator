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

Realtime streaming transport (SSE) is available at `GET /api/realtime/stream` and requires:
- JWT auth (same as other API routes).
- Redis pub/sub to deliver events across instances.
- Worker processes to publish events in multi-instance deployments.
The stream supports `Last-Event-ID` for best-effort replay using an in-memory buffer; full replay still requires persistent event storage.

## Distributed Cache
Redis is supported via:
- `REDIS_URL`
- `CACHE_REDIS_PREFIX`

Enable Redis in production to avoid per-instance cache divergence.

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
