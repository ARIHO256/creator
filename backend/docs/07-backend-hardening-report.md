# 07 Backend Hardening Report

Date: 2026-03-09

## Summary
This pass removed the remaining AppRecords fallback paths, added idempotency protection, expanded rate limiting, and hardened seller/creator write flows while keeping all frontends unchanged. Load-test readiness was strengthened with new configuration switches, a realistic seed script, and additional tests.

## What Was Found
- AppRecords fallbacks still used across Live, Adz, Workflow, Communications, Wholesale, Provider, Regulatory, Settings, and Commerce.
- No idempotency protection on write endpoints.
- Rate limiting was inconsistent across non-auth domains.
- Several settings and workspace flows persisted only in AppRecords.
- No load-test-oriented configuration or large-volume seed script.

## Implementations Completed
### AppRecords Replacement
- Replaced AppRecords usage in:
  - Communications, Live, Adz, Workflow, Wholesale, Provider, Regulatory.
  - Settings (profile, roles, members, crew, security, preferences).
  - Commerce (dashboard, listings, orders, returns, disputes, inventory, shipping, exports, documents).
- Backed these flows with new record tables: `LiveRecord`, `AdzRecord`, `WorkflowRecord`, `WholesaleRecord`, `ProviderRecord`, `RegulatoryRecord`, `CommunicationRecord`, plus `UserSetting` and `WorkspaceSetting`.
- Finance summary endpoints now compute wallet/holds/invoices/statement/tax outputs from `Order` and `Transaction` data.

### Security + Correctness
- Added Idempotency key tracking via `IdempotencyKey` table and a global Idempotency interceptor.
- Added rate limiting to all sensitive write endpoints across seller, creator, collaboration, taxonomy, jobs, finance, workflow, and discovery modules.
- Strengthened collaboration ownership checks for proposals, tasks, and assets.

### Performance + Load Test Readiness
- Added load-test configuration switches (`LOAD_TEST_MODE`, `FASTIFY_LOGGER`, `REQUEST_LOGS_ENABLED`).
- Added `prisma:seed:loadtest` script for realistic volume seeding.
- Documented query hotspots and worker deployment guidance.

### Tests Added
- Permissions: `RolesGuard` coverage.
- Throttling: `RateLimitGuard` coverage.
- Idempotency: duplicate key rejection.
- Audit logging: `AuditInterceptor`.
- Notifications: `SettingsService.notificationRead`.
- ExpressMart: controller channel enforcement.

## Files Changed
### Platform / Common
- `src/common/interceptors/idempotency.interceptor.ts`
- `src/platform/idempotency/*`
- `src/app.module.ts`, `src/main.ts`, `src/config/app.config.ts`
- `src/platform/prisma/prisma.module.ts`

### Modules (AppRecords removal + hardening)
- `src/modules/communications/*`
- `src/modules/live/*`
- `src/modules/adz/*`
- `src/modules/workflow/*`
- `src/modules/wholesale/*`
- `src/modules/provider/*`
- `src/modules/regulatory/*`
- `src/modules/settings/*`
- `src/modules/commerce/*`
- `src/modules/collaboration/*`
- `src/modules/finance/*`
- `src/modules/discovery/*`
- `src/modules/sellers/*`
- `src/modules/creators/*`
- `src/modules/deals/*`
- `src/modules/marketplace/*`
- `src/modules/taxonomy/*`
- `src/modules/storefront/*`
- `src/modules/jobs/*`

### Prisma + Scripts
- `prisma/schema.prisma`
- `prisma/seed-loadtest.mjs`
- `package.json`

### Tests
- `test/idempotency.test.ts`
- `test/rate-limit.guard.test.ts`
- `test/roles.guard.test.ts`
- `test/audit.interceptor.test.ts`
- `test/notifications.test.ts`
- `test/expressmart.controller.test.ts`

### Docs
- `docs/08-scaling-and-load-testing.md`

## Migrations Added
- `202603090004_expressmart_order_meta`
- `202603090005_perf_indexes`
- `202603090006_audit_events`
- `202603090007_notifications`
- `202603090008_domain_records`
- `202603090009_idempotency_keys`

## Commands Run
- `npm run prisma:generate`
- `npm run build`
- `npm run test` (required elevated permissions due to `tsx` IPC socket)

## Remaining Gaps / Infra Needed
- Redis for distributed caching and cache locks.
- Dedicated worker processes (JobsService) with queue monitoring.
- DB connection pooling + read replicas for peak read traffic.
- Centralized logging and metrics stack with alerting.
- Load testing with production-like infra to validate p95/p99.
- Frontend wiring for idempotency keys (optional but recommended).

## Honest Readiness Verdict
The backend is materially stronger and now provides first-class storage for previously AppRecord-backed flows, consistent write throttling, and idempotency. It is architected for scale but cannot claim million-user readiness without Redis, queue workers, connection pooling, and real load tests. Frontends still consume mocks; integration can proceed once infra and load testing are in place.
