# 07 Backend Hardening Report

Date: 2026-03-09

## Summary
This pass hardened the backend for scale and completeness without touching any frontend code. Work focused on distributed caching readiness, observability, auditability, ExpressMart backend coverage, stronger order lifecycle support, and database/index tuning.

## What Was Found
- In-memory caching only; no Redis/distributed cache support.
- No metrics endpoint or structured performance metrics for requests, DB queries, caches, or jobs.
- No audit table or admin-visible audit trail.
- ExpressMart flows existed in frontend mocks only; backend had no channel-specific endpoints.
- Order model lacked metadata for ExpressMart detail fields and missing status states.
- Notifications were stored only as AppRecords, not as first-class records.
- Several high-traffic indexes for marketplace/channel and review insights were missing.
- Background job worker had only placeholder processing.

## Implementations Completed
### API Coverage + Completeness
- ExpressMart endpoints: `/api/expressmart/summary`, `/api/expressmart/orders`, `/api/expressmart/orders/:id`, `/api/expressmart/orders/:id (PATCH)`, `/api/expressmart/returns`, `/api/expressmart/disputes`.
- Seller ops filtering: `channel` filters for orders/returns/disputes, `marketplace` filters for listings.
- Order update endpoint for ExpressMart (status + metadata).
- Notifications moved to a first-class `Notification` table and now served via Prisma.

### Scale & Performance
- Added Redis-ready cache layer with lock-based stampede protection and TTLs.
- Added high-traffic indexes for orders, listings, and review insight filters.
- Added order metadata JSON and expanded order status enum for lifecycle realism.

### Observability & Monitoring
- Prometheus-compatible `/api/metrics` endpoint.
- HTTP request metrics, DB query latency metrics, cache hit/miss metrics.
- Job processing metrics integrated into worker.
 - Added `prom-client` and Redis-ready cache dependency (`ioredis`) for production observability and distributed caching.

### Auditability & Activity Tracking
- New `AuditEvent` table with admin endpoint `/api/audit/events`.
- Global audit interceptor for write operations (POST/PUT/PATCH/DELETE).
- Async audit ingestion via background job queue.

### Notifications
- First-class `Notification` table and Prisma-backed notification reads/mark-as-read.

## Migrations Added
- `202603090004_expressmart_order_meta`
- `202603090005_perf_indexes`
- `202603090006_audit_events`
- `202603090007_notifications`

## Commands Run
- `npm install` (required elevated permissions; completed with 4 reported vulnerabilities)
- `npm run prisma:generate`
- `npm run build`
- `npm run test` (required elevated permissions)

## Infra Dependencies / Open Items
- Redis (required to activate distributed caching and locking).
- Queue worker deployment (separate process or dedicated worker pod).
- Database connection pooling (e.g., ProxySQL or managed DB pooling).
- Read replicas for heavy read traffic.
- Load balancer + autoscaling.
- Centralized logging/metrics stack (Prometheus/Grafana, ELK, or Datadog).
- Alerting and SLOs for p95/p99 latency, error rates, and job failures.

## Risks & Next Steps
- Some modules still fall back to `AppRecords`; these should be migrated to real tables as domain requirements are confirmed.
- Notifications need producer endpoints to create real notifications (currently read-only).
- Replace in-memory cache with Redis in production; current cache is per-instance only.
- Add integration/e2e tests for new audit and ExpressMart flows.
