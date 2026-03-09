# 07 Backend Hardening Report

Date: 2026-03-09

## Summary
This pass closed remaining domain gaps for seller/provider flows by unifying taxonomy enforcement, adding ops center and favourites modules, adding regulatory write workflows, hardening provider/seller isolation, and adding message read-state tracking. Frontends remain unchanged.

## What Was Found
- Regulatory desks and compliance lacked create/update endpoints and DTO validation.
- Ops-center views and favourites lacked first-class backend modules.
- Provider/seller isolation still had a direct seller lookup in provider disputes.
- Messaging lacked persisted read-state tracking for threads.

## Implementations Completed
### Taxonomy + Storefront + Listings Alignment
- Enforced active-tree validation and coverage sync across onboarding/storefront/listings flows.
- Storefront updates now validate taxonomy nodes and sync coverage consistently.

### Role Isolation
- Provider disputes now enforce seller/provider workspace validation via `SellersService`.
- Public seller/listing projections are used in discovery/marketplace/storefront outputs.

### Ops Center + Favourites
- Added Ops module endpoints with cached overview and operational views.
- Added Favourites module with first-class listing favourites.

### Regulatory Write Workflows
- Added DTOs + endpoints for desks, desk items, and compliance items.
- Enforced status transitions for regulatory desks/items/compliance.

### Messaging Read State
- Added thread read markers and mark-read endpoints.

### Tests Added
- Taxonomy active-tree validation.
- Storefront taxonomy sync validation.
- Regulatory workflow transition enforcement.
- Provider/seller isolation guard coverage.
- Favourites add/remove validation.
- Wholesale quote transition enforcement.
- Message thread read-state handling.

## Files Changed
### Modules / Domain
- `src/modules/communications/*`
- `src/modules/favourites/*`
- `src/modules/ops/*`
- `src/modules/provider/*`
- `src/modules/regulatory/*`
- `src/modules/sellers/*`
- `src/modules/storefront/*`
- `src/modules/taxonomy/*`
- `src/modules/workflow/*`
- `src/modules/marketplace/*`
- `src/modules/discovery/*`
- `src/modules/live/*`
- `src/modules/wholesale/*`

### Prisma
- `prisma/schema.prisma`
- `prisma/migrations/202603090011_favourites_and_message_reads/migration.sql`

### Tests
- `test/communications.service.test.ts`
- `test/favourites.service.test.ts`
- `test/regulatory.service.test.ts`
- `test/sellers.service.test.ts`
- `test/storefront.service.test.ts`
- `test/taxonomy.service.test.ts`
- `test/wholesale.service.test.ts`

## Migrations Added
- `202603090011_favourites_and_message_reads` (listing favourites + message thread read-state)

## Commands Run
- `npm run prisma:generate`
- `npm run build`
- `npm run test` (required elevated permissions for `tsx` IPC socket)

## Remaining Gaps / Infra Needed
- Redis for distributed caching and cache locks.
- Dedicated worker processes for jobs/insights fan-out.
- DB connection pooling + read replicas for peak read traffic.
- Centralized logging and metrics stack with alerting.
- Load testing with production-like infra to validate p95/p99.
- Real-time delivery layer for notifications/messages (websocket/push).

## Honest Readiness Verdict
Domain coverage is now strong for the remaining seller/provider sectors and taxonomy alignment. The backend is not yet “million-user ready” without Redis, queue workers, pooling/replicas, and real load testing. Frontends still consume mocks; integration can proceed once infrastructure is provisioned.
