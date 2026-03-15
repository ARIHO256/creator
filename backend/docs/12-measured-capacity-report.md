# 12. Measured Capacity Report

Date: 2026-03-15

## Test Environment

- Backend runtime: local single Node/NestJS process
- DB: local MySQL using the real `sellerplatform` database
- Dataset after benchmark seeding:
  - users: `461`
  - sellers/providers: `255`
  - listings: `20,007`
  - orders: `40,013`
  - transactions: `40,005`
  - reviews: `20,005`
- Redis:
  - normal benchmark runs: disabled
  - failure-mode run: configured to an unreachable endpoint
- Read replica:
  - not available in the local environment
  - `DATABASE_READ_URL` was set equal to the primary for runnable benchmarks

This means the numbers below are **measured single-node local capacity**, not distributed production capacity.

## Code Changes Made In This Pass

- Added structured benchmark orchestration in [benchmark-scenario.mjs](/home/achiever/Freelancer/CreatorApp/backend/scripts/benchmark-scenario.mjs)
- Extended the load runner for JSON bodies and idempotency-style request generation in [load-test.mjs](/home/achiever/Freelancer/CreatorApp/backend/scripts/load-test.mjs)
- Fixed the concurrent bootstrap race in [dashboard.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/dashboard/dashboard.service.ts)
- Hardened support-ticket creation into a single transaction with reduced sync fan-out in [communications.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/communications/communications.service.ts)
- Added benchmark-only rate-limit disable support in [app.config.ts](/home/achiever/Freelancer/CreatorApp/backend/src/config/app.config.ts) and [rate-limit.guard.ts](/home/achiever/Freelancer/CreatorApp/backend/src/common/guards/rate-limit.guard.ts)

## Benchmark Results

### Cached public reads, 100 concurrency, 30 seconds

- Scenario:
  - `/api/landing/content`
  - `/api/sellers?limit=20`
  - `/api/marketplace/sellers?limit=20`
  - `/api/taxonomy/trees`
- Result:
  - requests/sec: `2530`
  - completed: `76,018`
  - p50: `32.68ms`
  - p95: `52.36ms`
  - p99: `80.10ms`
  - error rate: `0.07%`
- Cache:
  - near-total memory-hit dominance after warm-up
  - taxonomy had the highest miss count during early requests
- DB:
  - only `93` additional write-side query samples and `6` read-side samples over the run
- Worker backlog:
  - flat

### Cached public reads, 200 concurrency, 30 seconds

- Result:
  - requests/sec: `1610`
  - completed: `48,521`
  - p50: `120.30ms`
  - p95: `139.95ms`
  - p99: `233.42ms`
  - error rate: `0%`
- Cache:
  - still overwhelmingly served from in-process cache
- DB:
  - minimal incremental DB activity once warmed
- Interpretation:
  - the local single-node setup remained stable at `200` concurrent cached public readers
  - latency climbed materially, so this is no longer the same comfort zone as the 100-concurrency run

### Seller reads, 50 concurrency, 30 seconds

- Before the bootstrap race fix:
  - `/api/app/bootstrap` threw `500`s on concurrent first-create races
- After the fix:
  - requests/sec: `2320`
  - completed: `69,663`
  - p50: `16.95ms`
  - p95: `47.03ms`
  - p99: `58.09ms`
  - error rate: `0%`
- Cache:
  - dashboard cache hits: `55,584`
  - dashboard misses: `40`
- DB:
  - read query count: `27,546`
  - write query count: `36,678`
- Interpretation:
  - seller reads are stable at `50` concurrency on this local setup after the bootstrap race fix

### Seller reads, 100 concurrency, 30 seconds

- Result:
  - requests/sec: `1394`
  - completed: `42,021`
  - p50: `51.49ms`
  - p95: `203.01ms`
  - p99: `266.77ms`
  - error rate: `0%`
- DB:
  - read query count: `16,038`
  - write query count: `14,087`
  - slow queries over `75ms` budget:
    - write: `342`
    - read: `6`
- Worker backlog:
  - existing pending queue remained high from prior write benchmarks
- Interpretation:
  - `100` concurrent seller readers is still stable locally, but the p95 is now above the sub-200ms target and the slow-query budget is being hit often enough to matter

### Support ticket write path, 20 concurrency, 30 seconds

- Initial attempt:
  - `100%` failure due a foreign-key ordering bug in the refactor
- After the transaction-order fix:
  - requests/sec: `224`
  - completed: `6,740`
  - p50: `85.74ms`
  - p95: `112.00ms`
  - p99: `148.41ms`
  - error rate: `0%`
- DB:
  - write query count: `187,293`
  - slow write queries over `75ms`: `32`
- Worker backlog:
  - pending jobs grew from `14,020` to `40,308`
- Interpretation:
  - the HTTP write path is healthy at `20` concurrent writers
  - the real bottleneck is downstream async processing throughput, not the request itself

## Failure-Mode Results

### Redis down

Environment:
- `REDIS_URL`, `RATE_LIMIT_REDIS_URL`, and `REALTIME_REDIS_URL` pointed to `127.0.0.1:6390`
- workers disabled to reduce queue noise

Public cached-read test, 50 concurrency, 10 seconds:
- requests/sec: `3029`
- p50: `12.26ms`
- p95: `24.59ms`
- p99: `33.67ms`
- error rate: `0%`

Observed behavior:
- app booted successfully
- cache errors were recorded for Redis `get` and `lock`
- `dependency_circuit_state{dependency="redis"} = 1`
- traffic continued successfully from local memory and source-of-truth reads

Interpretation:
- Redis-down degradation is graceful for the current single-node case
- distributed-cache behavior is still unproven because Redis cluster infrastructure was not available locally

### Read replica down

Startup check with an invalid `DATABASE_READ_URL`:
- app failed boot with `PrismaClientInitializationError`
- failure was immediate on `ReadPrismaService.onModuleInit`

Interpretation:
- read-replica failure is **not** currently graceful
- this remains a real blocker for resilient multi-region or replica-backed deployments

## Bottleneck Analysis

### 1. Replica failure is a hard blocker

- A bad `DATABASE_READ_URL` still prevents the app from booting.
- This is the clearest infrastructure-resilience gap left in the current implementation.

### 2. Background-job throughput is far below write-path throughput

- The support-ticket write path can sustain `224 rps` locally at `20` concurrent writers.
- But each request creates enough async work that pending jobs balloon rapidly under load.
- Current default worker settings are too conservative for bursty write traffic.

### 3. Seller read latency degrades sharply from 50 to 100 concurrency

- Stable, but p95 moved from `47ms` to `203ms`.
- Slow-query warnings increased materially.
- The remaining hotspot is seller/dashboard query volume and read-model refresh pressure, not public-read caching.

### 4. Public cached reads are strong even without Redis

- The local single-node setup served cached public traffic well.
- This is a positive result, but it does **not** validate multi-instance consistency or global cache behavior.

## Revised Honest Capacity Statement

### Measured now

On this local single-node environment with MySQL and no live Redis cluster:

- cached public reads:
  - safe at `100` concurrency
  - stable at `200` concurrency with higher latency
- seller reads:
  - safe at `50` concurrency
  - stable at `100` concurrency, but already brushing the p95 latency target
- support-ticket writes:
  - stable at `20` concurrent writers for the HTTP path
  - not stable end-to-end at that rate because async queue backlog grows too fast

### Still theoretical

- any multi-instance distributed-cache claim
- any real read-replica failover claim
- any multi-region latency or failover claim
- any “thousands of concurrent active users” claim on this codebase

## Recommended Next Steps

1. Add graceful read-replica fallback on startup and runtime.
2. Split background jobs by queue and raise worker throughput materially.
3. Add a benchmark run with:
   - Redis actually available
   - a real read replica
   - separate API and worker processes
4. Optimize seller/dashboard query paths using the slow-query data from the 100-concurrency run.
5. Re-run the write benchmark with tuned worker settings to measure end-to-end sustainable write throughput instead of just request-path throughput.
