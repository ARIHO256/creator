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
  - normal benchmark runs: both disabled and live local Redis `127.0.0.1:6379`
  - failure-mode run: configured to an unreachable endpoint
- Read replica:
  - not available in the local environment
  - runnable non-failover benchmarks used `DATABASE_READ_URL` equal to the primary
  - failover benchmark used an invalid `DATABASE_READ_URL` to exercise write fallback

This means the numbers below are **measured single-node local capacity**, not distributed production capacity.

## Code Changes Made In This Pass

- Added structured benchmark orchestration in [benchmark-scenario.mjs](/home/achiever/Freelancer/CreatorApp/backend/scripts/benchmark-scenario.mjs)
- Extended the load runner for JSON bodies and idempotency-style request generation in [load-test.mjs](/home/achiever/Freelancer/CreatorApp/backend/scripts/load-test.mjs)
- Fixed the concurrent bootstrap race in [dashboard.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/dashboard/dashboard.service.ts)
- Hardened support-ticket creation into a single transaction with reduced sync fan-out in [communications.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/communications/communications.service.ts)
- Added benchmark-only rate-limit disable support in [app.config.ts](/home/achiever/Freelancer/CreatorApp/backend/src/config/app.config.ts) and [rate-limit.guard.ts](/home/achiever/Freelancer/CreatorApp/backend/src/common/guards/rate-limit.guard.ts)
- Added graceful read-replica fallback with degraded readiness reporting in [prisma.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/prisma/prisma.service.ts)
- Switched workers to batch claims, queue filters, and busy-poll draining in [jobs.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/jobs/jobs.service.ts) and [jobs.worker.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/jobs/jobs.worker.ts)
- Added safe moderation dedupe on support-ticket writes in [communications.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/communications/communications.service.ts)
- Added audit batch persistence in [audit.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/audit/audit.service.ts) and queue-family worker manifests in [worker-deployment.yaml](/home/achiever/Freelancer/CreatorApp/infra/k8s/base/worker-deployment.yaml), [worker-audit-deployment.yaml](/home/achiever/Freelancer/CreatorApp/infra/k8s/base/worker-audit-deployment.yaml), [worker-moderation-deployment.yaml](/home/achiever/Freelancer/CreatorApp/infra/k8s/base/worker-moderation-deployment.yaml), and [worker-realtime-deployment.yaml](/home/achiever/Freelancer/CreatorApp/infra/k8s/base/worker-realtime-deployment.yaml)
- Added per-queue backlog metrics for autoscaling in [metrics.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/metrics/metrics.service.ts) and [metrics.controller.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/metrics/metrics.controller.ts)
- Reduced realtime worker DB round trips by replacing receipt read+write with atomic attempt recording in [realtime-delivery.service.ts](/home/achiever/Freelancer/CreatorApp/backend/src/platform/realtime/realtime-delivery.service.ts) and [jobs.worker.ts](/home/achiever/Freelancer/CreatorApp/backend/src/modules/jobs/jobs.worker.ts)

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

### Cached public reads with live Redis, 50 concurrency, 10 seconds

- Environment:
  - Redis enabled at `127.0.0.1:6379`
  - API node only
  - dedicated worker process was draining historical background backlog in parallel
- Result:
  - requests/sec: `1581`
  - completed: `15,837`
  - p50: `16.02ms`
  - p95: `39.21ms`
  - p99: `61.47ms`
  - error rate: `0.16%`
- Cache:
  - Redis remained healthy: `dependency_circuit_state{dependency="redis"} = 0`
  - Redis writes occurred for landing, marketplace, discovery, and taxonomy
  - memory still dominated most steady-state hits on a single API node
- Queue side effect:
  - the dedicated worker drained old backlog during the read run, reducing due pending jobs from `8,015` to `4,715`
- Interpretation:
  - Redis-backed shared cache is working
  - the main value in this setup is shared cache correctness and multi-instance continuity, not dramatic single-node latency gains

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

### Support ticket write path, 20 concurrency, 30 seconds, dedicated tuned worker

- Environment:
  - API node on `:4010` with workers disabled
  - dedicated worker node on `:4012`
  - worker queues limited to `moderation,audit,realtime`
  - worker tuning:
    - `JOBS_WORKER_BATCH=100`
    - `JOBS_WORKER_CONCURRENCY=25`
    - `JOBS_WORKER_POLL_MS=1000`
    - `JOBS_WORKER_BUSY_POLL_MS=0`
  - Redis enabled at `127.0.0.1:6379`
- Result:
  - requests/sec: `125`
  - completed: `3,777`
  - p50: `138.22ms`
  - p95: `264.29ms`
  - p99: `588.31ms`
  - error rate: `0%`
- DB:
  - write query count: `109,725`
  - slow write queries over `75ms`: `150`
- Worker backlog:
  - before run: `0` due pending jobs
  - after run: `6,810` due pending jobs and `25` active locks
  - per-queue pending after run:
    - audit: `3,313`
    - realtime: `1,849`
    - moderation: `1,648`
- Interpretation:
  - the dedicated worker materially improved throughput compared with the original in-process defaults
  - backlog growth was reduced from `+26,288` pending jobs in the earlier run to `+6,810`
  - the system still does **not** keep up end-to-end at this write rate; it just fails later and more gracefully

### Support ticket write path, 20 concurrency, 30 seconds, split audit + moderation + realtime workers

- Environment:
  - API node on `:4010` with workers disabled
  - dedicated audit worker on `:4012`
  - dedicated moderation worker on `:4013`
  - dedicated realtime worker on `:4014`
  - audit worker:
    - `JOBS_WORKER_QUEUES=audit`
    - `JOBS_WORKER_BATCH=200`
    - `JOBS_WORKER_CONCURRENCY=1`
    - audit persistence batched through `AuditService.persistMany()`
  - moderation worker:
    - `JOBS_WORKER_QUEUES=moderation`
    - `JOBS_WORKER_BATCH=100`
    - `JOBS_WORKER_CONCURRENCY=25`
  - realtime worker:
    - `JOBS_WORKER_QUEUES=realtime`
    - `JOBS_WORKER_BATCH=150`
    - `JOBS_WORKER_CONCURRENCY=50`
  - Redis enabled at `127.0.0.1:6379`
  - backlog drained to `0` before the run
- Result:
  - requests/sec: `180`
  - completed: `5,420`
  - p50: `100.93ms`
  - p95: `184.77ms`
  - p99: `245.51ms`
  - error rate: `0%`
- DB:
  - write query count: `135,536`
  - total write query time: `125,089ms`
- Worker backlog:
  - before run: `0`
  - after run: `3,407` due pending jobs, `50` active locks
  - per-queue pending after run:
    - realtime: `2,814`
    - audit: `555`
    - moderation: `38`
- Interpretation:
  - this is better for request throughput and latency than the mixed `moderation,realtime` worker
  - queue growth dropped from `+6,810` to `+3,407`
  - `realtime` is now the dominant backlog, `moderation` is mostly controlled, and `audit` is improved but still non-trivial

### Rejected tuning: more aggressive realtime worker concurrency

- Experiment:
  - `JOBS_WORKER_BATCH=250`
  - `JOBS_WORKER_CONCURRENCY=100`
- Result:
  - requests/sec fell to `137`
  - p95 worsened to `352.29ms`
  - backlog shifted heavily back to `audit`
- Interpretation:
  - higher realtime concurrency increased contention and hurt the overall system
  - this tuning was **not** adopted as the recommended baseline

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
- app booted successfully
- readiness reported:
  - `databaseRead.status = degraded`
  - `usingWriteFallback = true`
  - `replicaConfigured = true`
  - `lastError` populated with the replica connection failure
- `dependency_circuit_state{dependency="db_read_replica"} = 1`

Interpretation:
- startup fallback is now graceful for replica loss on boot
- this removes the previous hard-outage behavior for a dead read replica
- runtime replica re-entry and real promoted-replica failover are still unproven

## Bottleneck Analysis

### 1. Realtime fan-out is now the main write-path bottleneck

- With fully split workers, `20` concurrent support-ticket writers still produced `3,407` pending jobs in `30s`.
- The dominant lagging queue is `realtime`, with `audit` second and `moderation` far smaller.
- The worker-family split worked; the remaining problem is realtime delivery throughput and write amplification.

### 2. Seller read latency still degrades sharply from 50 to 100 concurrency

- Stable, but p95 moved from `47ms` to `203ms`.
- Slow-query warnings increased materially.
- The remaining hotspot is seller/dashboard query volume and read-model refresh pressure, not public-read caching.

### 3. Public cached reads are strong, and Redis is now validated

- The local single-node setup served cached public traffic well.
- Redis-backed cache reads and writes were observed with the circuit closed.
- This is a positive result, but it still does **not** validate global cache behavior or multi-instance consistency under cross-region traffic.

### 4. Replica startup failure is no longer a blocker

- A bad `DATABASE_READ_URL` now degrades to the primary instead of blocking boot.
- The unresolved part is not startup anymore; it is real replica failback, lag tolerance, and multi-node routing policy.

## Revised Honest Capacity Statement

### Measured now

On this local single-node environment with MySQL and live local Redis:

- cached public reads:
  - safe at `100` concurrency
  - stable at `200` concurrency with higher latency
  - healthy Redis-backed public reads at `50` concurrency with `p95 39ms`
- seller reads:
  - safe at `50` concurrency
  - stable at `100` concurrency, but already brushing the p95 latency target
- support-ticket writes:
  - stable at `20` concurrent writers for the HTTP path
  - more resilient end-to-end with fully split workers
  - still not fully stable end-to-end at that rate because the `realtime` queue continues to grow materially under sustained pressure

### Still theoretical

- any multi-instance distributed-cache claim
- any real promoted-replica or multi-node read failover claim
- any multi-region latency or failover claim
- any “thousands of concurrent active users” claim on this codebase

## Recommended Next Steps

1. Reduce realtime work per support-ticket request, because the `realtime` queue now dominates backlog growth.
2. Keep `audit`, `moderation`, and `realtime` on separate worker families; do not revert to the shared events worker.
3. Add a benchmark run with:
   - Redis actually available
   - a real read replica
   - separate API and worker processes
4. Optimize seller/dashboard query paths using the slow-query data from the 100-concurrency run.
5. Rework realtime delivery bookkeeping to cut per-event persistence pressure further, then rerun the same write benchmark to find the first end-to-end sustainable envelope.
