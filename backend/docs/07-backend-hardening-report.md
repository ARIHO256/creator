# 07 Backend Hardening Report

Date: 2026-03-09

## Summary
This pass replaced remaining compatibility-style record payloads with first-class domain tables for Live, Adz, Wholesale, Provider, Regulatory, and Communications; unified taxonomy across onboarding/listings/storefront; and tightened order lifecycle enforcement, while keeping all frontends unchanged. Load-test seeding and tests were extended to cover the newly strengthened sectors.

## What Was Found
- Domain flows still persisted large JSON payloads via record tables for Live, Adz, Wholesale, Provider, Regulatory, and Communications.
- Storefront taxonomy was not linked to canonical taxonomy nodes.
- Onboarding taxonomy selections were not validated or persisted to seller coverage/storefront.
- Order status updates did not enforce legal transitions.

## Implementations Completed
### Domain Modeling + AppRecord Removal
- Added first-class tables for:
  - Communications: `MessageThread`, `Message`, `SupportTicket`, `SupportContent`.
  - Live: `LiveBuilder`, `LiveSession`, `LiveStudio`, `LiveMoment`, `LiveReplay`, `LiveToolConfig`, `LiveCampaignGiveaway`.
  - Adz: `AdzBuilder`, `AdzCampaign`, `AdzPerformance`, `AdzLink`, `PromoAd`.
  - Wholesale: `WholesaleRfq`, `WholesaleQuote`, `WholesalePriceList`, `WholesaleIncoterm`.
  - Provider: `ProviderQuote`, `ProviderBooking`, `ProviderConsultation`, `ProviderPortfolioItem`.
  - Regulatory: `RegulatoryDesk`, `RegulatoryDeskItem`, `RegulatoryComplianceItem`.
  - Storefront taxonomy: `StorefrontTaxonomyLink`.
- Rewired services to use the new tables and return domain-shaped responses (no AppRecord-style payloads).

### Taxonomy Unification
- Storefront taxonomy now uses `StorefrontTaxonomyLink` with canonical `TaxonomyNode`.
- Onboarding validates taxonomy node IDs.
- Onboarding submission syncs selections into `SellerTaxonomyCoverage` and storefront taxonomy links.

### Security + Correctness
- Enforced order status transitions in `CommerceService`.
- Added `PROVIDER` to `ReviewSubject` and allowed provider review queries.
- Added DTO validation for finance requests and communications payloads.

### Performance + Load Test Readiness
- Load-test seed script now creates messages, support tickets, wholesale quotes/RFQs, live sessions, and adz campaigns for realistic volume.

### Tests Added
- `CommunicationsService` thread/message creation.
- `TaxonomyService.assertNodesExist` missing node enforcement.

## Files Changed
### Modules / Domain
- `src/modules/communications/*`
- `src/modules/live/*`
- `src/modules/adz/*`
- `src/modules/wholesale/*`
- `src/modules/provider/*`
- `src/modules/regulatory/*`
- `src/modules/workflow/*`
- `src/modules/storefront/*`
- `src/modules/taxonomy/*`
- `src/modules/finance/*`
- `src/modules/commerce/*`
- `src/modules/reviews/*`

### Prisma + Scripts
- `prisma/schema.prisma`
- `prisma/seed-loadtest.mjs`
- `prisma/migrations/202603090010_domain_strongification/migration.sql`

### Tests
- `test/communications.service.test.ts`
- `test/taxonomy.service.test.ts`

## Migrations Added
- `202603090010_domain_strongification` (domain tables + storefront taxonomy + review subject enum)

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

## Honest Readiness Verdict
The backend now has strong, normalized models for previously compatibility-only sectors, and taxonomy is unified across onboarding, listings, and storefront. It is structurally ready for scale, but cannot claim million-user readiness without Redis, queue workers, connection pooling/replicas, and real load testing. Frontends still consume mocks; integration can proceed once infrastructure is in place.
