# 11. Distributed Capacity Plan

## Scope of This Pass

This pass moves the backend from generic platform scaffolding into concrete scale-oriented implementation in three areas:

- Redis-backed read offload on the hottest public read paths
- explicit read/write database separation on public traffic
- async cache warming plus tighter resilience and observability hooks

It still does **not** prove 100 million concurrent users. It improves the architecture in the direction required for that class of system and narrows the set of remaining blockers.

## Code Changes Implemented

### Distributed caching and read offload

- Added cache key, TTL, and invalidation policy in [public-read-cache.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/cache/public-read-cache.service.ts).
- Upgraded [cache.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/cache/cache.service.ts) with:
  - Redis timeout budgets
  - Redis circuit-breaker behavior
  - cache write/error/wait metrics
  - graceful fallback to local memory/no-op when Redis is unhealthy
- Moved hot public reads onto `ReadPrismaService` plus Redis-backed `CacheService` in:
  - [storefront.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/storefront/storefront.service.ts)
  - [marketplace.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/marketplace/marketplace.service.ts)
  - [discovery.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/discovery/discovery.service.ts)
  - [taxonomy.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/taxonomy/taxonomy.service.ts)
  - [dashboard.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/dashboard/dashboard.service.ts)

### Database scaling and query budgets

- Added read/write separation and slow-query budgeting in [prisma.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/prisma/prisma.service.ts).
- Added config for `DATABASE_QUERY_BUDGET_MS` in [app.config.ts](/home/achiever/Freelancer/CreatorApp/backend/src/config/app.config.ts).
- Public read endpoints listed above now prefer the read replica path.

### Async/event-driven backbone

- Extended the background worker in [jobs.worker.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/jobs/jobs.worker.ts) with `CACHE_WARM_PUBLIC_READ`.
- Public cache invalidation now happens synchronously on writes, while warm-up is done asynchronously.
- Storefront and marketplace writes now enqueue cache warm jobs after invalidation.

### Observability and protection

- Added new scale-validation metrics in [metrics.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/metrics/metrics.service.ts):
  - cache writes
  - cache errors
  - cache wait/stampede pressure
  - DB slow-query counts
  - dependency circuit state

## Cache Architecture

### Key spaces

- `landing:*`
- `marketplace:feed:*`
- `marketplace:sellers:*`
- `marketplace:listings:*`
- `marketplace:opportunities:*`
- `discovery:sellers:*`
- `storefront:public:*`
- `storefront:listings:*`
- `taxonomy:trees`
- `taxonomy:tree:*`
- `taxonomy:children:*`

### TTL policy

- landing content: `30s`
- public marketplace feed: `30s`
- public seller/listing/opportunity pages: `60s`
- storefront payloads: `120s`
- taxonomy trees/nodes: `300s`
- existing dashboard summary/read-model flows remain short-lived and user-scoped

### Invalidation rules

- storefront writes:
  - invalidate old/new storefront handles
  - invalidate storefront listings for those handles
  - enqueue storefront warm job if published
- marketplace listing writes:
  - invalidate marketplace feed/listings caches
  - invalidate related storefront public caches when a storefront exists
  - enqueue marketplace and storefront warm jobs
- taxonomy writes:
  - invalidate tree and child caches
  - enqueue taxonomy warm job
- seller/discovery public caches:
  - currently TTL-driven for seller-profile mutations outside `DiscoveryService`
  - must evolve into event-based invalidation when seller/profile writes are centralized

### Cache warming strategy

- Warm only the highest-value public shapes:
  - landing content
  - default marketplace feed
  - default sellers/listings/opportunities pages
  - storefront home + first listings page
  - primary taxonomy tree
- Use deduped background jobs so bursts of writes do not trigger herd refreshes
- Avoid synchronous warm-up in request handlers

## Database Audit and Scaling Recommendations

### Highest-volume domains in current code

- `MarketplaceListing`
  - public feed/listing queries
  - seller dashboard counts
  - storefront listing pages
- `Seller`
  - marketplace sellers
  - discovery sellers
  - seller profile joins
- `TaxonomyTree` / `TaxonomyNode`
  - global catalog navigation
  - onboarding/category validation
- `Order`, `Transaction`, `Review`
  - dashboard fan-out
  - analytics and finance rollups
- `BackgroundJob`
  - async workflow durability
  - cache warm jobs
  - auth queue and search jobs

### Endpoints reasonably safe on single-primary + read replica

- cached public landing content
- cached marketplace sellers/listings/feed reads
- cached public storefront and first-page listing reads
- cached taxonomy trees and children
- user-scoped dashboard read models with current TTLs

### Endpoints that must evolve first beyond that

- seller dashboard summary fan-out in [commerce.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/commerce/commerce.service.ts)
- communications/support inbox reads in [communications.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/communications/communications.service.ts)
- analytics aggregation in [analytics.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/analytics/analytics.service.ts)
- realtime delivery receipts at very high event volume

### Read replica strategy

- All public, cacheable, non-mutating read paths should use `ReadPrismaService`.
- Writes remain on `PrismaService`.
- Replica lag tolerance:
  - public discovery/storefront/taxonomy: acceptable with short TTLs
  - auth/session/order mutation confirmation: read-your-write must stay on primary or a consistent read model

### Query budget

- Default DB budget in code: `75ms`
- Anything consistently above budget should be:
  - indexed
  - cached
  - moved to a read model
  - or shifted off MySQL entirely

### Sharding / Vitess migration path

1. Keep a single writer + replicas while read offload and queueing mature.
2. Introduce connection proxies and enforce read/write routing.
3. Move hottest domains to Vitess-style sharding:
   - `users` by `user_id`
   - `sellers/storefront/listings` by `seller_id`
   - `analytics` by `tenant + time bucket`
4. Promote global search/discovery away from transactional MySQL.

### Indexing priorities

- `Storefront.slug`, `Storefront.sellerId`, `Storefront.isPublished`
- `MarketplaceListing.status + createdAt`
- `MarketplaceListing.sellerId + status + createdAt`
- `Seller.isVerified + rating + createdAt`
- `TaxonomyNode.treeId + depth + sortOrder + name`
- `BackgroundJob.status + runAfter + priority + createdAt`

## Queue and Event Design

### Current queue posture

The MySQL-backed `BackgroundJob` queue remains an acceptable transitional queue for:

- registration completion
- search indexing
- cache warm jobs
- internal notifications and low-rate fan-out

### Patterns now in place

- dedupe keys for idempotent enqueue
- retry with delayed requeue
- dead-letter state
- worker/API separation in Kubernetes
- job metrics and ready-state exposure

### What must come next

- Kafka or NATS for higher-throughput event streams
- dedicated DLQ consumers and replay tooling
- queue lag dashboards
- per-queue concurrency controls
- exactly-once style handling only where the business domain truly requires it

## Traffic Protection and Resilience

### Implemented in code

- distributed rate limiting via Redis fallback in [rate-limit.guard.ts](/home/achiever/Freelancer/CreatorApp/backend/src/common/guards/rate-limit.guard.ts)
- request timeouts in [request-timeout.interceptor.ts](/home/achiever/Freelancer/CreatorApp/backend/src/common/interceptors/request-timeout.interceptor.ts)
- Redis cache dependency time budgets and circuit-breaking in [cache.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/cache/cache.service.ts)
- async warm-up to reduce thundering-herd rebuilds after writes

### Explicit overload behavior

- If Redis is slow or unavailable:
  - skip remote cache operations
  - fall back to local memory or source-of-truth reads
  - keep serving traffic, but with reduced offload efficiency
- If request latency exceeds timeout:
  - fail fast instead of exhausting workers indefinitely
- If cache regeneration is already in progress:
  - wait briefly for the warmer before hitting the DB directly

### Still missing for true large-scale protection

- endpoint-specific load shedding for non-critical routes
- circuit breakers around external providers beyond Redis
- adaptive concurrency limiting
- WAF/bot policies at the edge

## Multi-Region Readiness

### Region-local

- API pods
- worker pods
- Redis cluster
- realtime gateways
- read replicas

### Globally replicated or eventual

- search indexes
- analytics read models
- notification fan-out state
- public catalog/storefront cache population

### Home-region / stronger consistency

- auth/session write authority
- order creation and payment state
- compliance/regulatory write paths

## Dashboards and Alerts Required Before High-Scale Rollout

- p50/p95/p99 HTTP latency by route
- cache hit ratio by namespace
- Redis circuit-open state
- DB slow-query count and top offenders
- replica lag
- queue depth and dead-letter count
- worker success/failure rate
- saturation:
  - CPU
  - memory
  - connection pool pressure
  - event loop lag

## Load Testing Plan

### Assets in repo now

- [k6-global-read.js](/home/achiever/Freelancer/CreatorApp/backend/loadtest/k6-global-read.js)
- [k6-cached-public.js](/home/achiever/Freelancer/CreatorApp/backend/loadtest/k6-cached-public.js)
- [k6-mixed-traffic.js](/home/achiever/Freelancer/CreatorApp/backend/loadtest/k6-mixed-traffic.js)
- [k6-regional-distribution.js](/home/achiever/Freelancer/CreatorApp/backend/loadtest/k6-regional-distribution.js)
- [locust-global.py](/home/achiever/Freelancer/CreatorApp/backend/loadtest/locust-global.py)
- [locust-mixed.py](/home/achiever/Freelancer/CreatorApp/backend/loadtest/locust-mixed.py)

### Stage targets

1. Cached public reads
   - p95 `< 150ms`
   - error rate `< 0.5%`
   - cache hit ratio `> 90%`

2. Mixed seller traffic
   - p95 `< 250ms`
   - error rate `< 1%`
   - write success `> 99%`

3. Regional distribution
   - keep region-local p95 `< 200ms`
   - failover surge recovery within `2-5 minutes`

4. Failure/degradation
   - Redis impairment should degrade throughput before correctness
   - request timeout rates must stay bounded and visible

### Measured results from this turn

- No live distributed benchmark was executed in this turn.
- Verified locally:
  - backend build
  - unit/integration test suite
  - load-test asset syntax validation
- Therefore any concurrency claim above the previously measured environment remains architectural, not proven.

## Honest Capacity Statement

### Architecturally stronger now

- hot public read traffic can be served from Redis-backed shared cache instead of repeatedly hitting the primary DB
- public reads can use read replicas
- cache rebuilds are less likely to stampede on write bursts
- Redis failures degrade more safely

### Still theoretical

- high-thousands or millions of concurrent users
- global multi-region failover behavior
- shard-level data routing and operational behavior
- queue backbone throughput beyond the current MySQL-backed job model

The backend is materially more scalable than before this pass, but it is still in the “production-hardening and regional scale-out” phase, not the “hyperscale proven” phase.
