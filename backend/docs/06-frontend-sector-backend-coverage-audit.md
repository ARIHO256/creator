# 06 Frontend Sector Backend Coverage Audit

Date: 2026-03-09

Scope:
- Creator frontend: `creator/src/App.tsx`
- Seller frontend: `seller/src/app/routes.tsx`
- Backend modules: `backend/src/modules/*`

Statement:
- Frontend UI and mock data were not changed.
- This document audits whether current frontend sectors are represented strongly in the backend.

## Audit result

### Strongly represented
- Shared auth, users, roles, session bootstrap
- Creator profile/public profile
- Seller profile/listings/orders/transactions
- Shared discovery: sellers, opportunities, invites, campaign board
- Shared collaboration: campaigns, proposals, contracts, tasks, assets
- Marketplace feed/listings/sellers/opportunities
- Finance/analytics baseline
- File metadata handling and upload-session lifecycle
- Runtime hardening: readiness, rate limiting, request tracing
- Communications/messages/help-support
- Wholesale quotes/RFQs/price lists/incoterms
- Provider quotes/bookings/consultations/portfolio/reviews/disputes
- Live studio/session/replay/tooling
- Adz builder/campaigns/links/promo ads
- Regulatory desks/compliance subdomains with write workflows
- Seller/provider onboarding flows with unified taxonomy validation
- Storefront + listings + onboarding taxonomy alignment
- Ops center views (inventory/shipping/warehouses/exports/documents/exceptions)
- Favourites, persisted notifications, and message read-state
- MyLiveDealz live sessions/studio/replay lifecycle enforcement
- Wholesale quote lifecycle enforcement
- Settings/roles/crew normalization and audit hooks
- Support workflows with status/assignment/escalation
- Finance payouts/settlement lifecycle enforcement

### Represented but not strongly enough yet
- Finance reconciliation still requires external settlement infrastructure
- Real-time delivery (websocket/push) for support/messages/notifications

## Key finding

The backend now covers nearly every visible frontend sector at the route/module level, with strong domain models for previously compatibility-only sectors. Remaining gaps are concentrated in settings/role/crew payload normalization rather than missing domain tables.

## Creator app coverage

### Strong
- landing/auth/bootstrap
- onboarding/approval workflow baseline
- dashboard/feed/my-day
- notifications
- public profiles
- discovery/opportunities/sellers/my-sellers/invites
- campaigns/proposals/contracts/tasks/assets
- earnings/analytics/payout/subscription

### Partial
- audit/settings/roles/crew flows still accept broad workspace payloads

## Seller app coverage

### Strong
- seller/provider auth and role handling
- seller profiles
- listings
- orders, returns/disputes baseline, transactions
- ops inventory/warehouses/shipping/documents/export baseline
- settings/security/preferences/tax/kyc baseline
- compliance/regulatory/desks baseline
- media/file intake baseline

### Partial
- settings/onboarding detail depth (role-specific policy rules)
- finance settlement automation
- realtime help/support/message delivery
- provider quote/booking lifecycle automation

## Why partial sectors are not yet "strong"

Patterns found:
- endpoints accept `@Body() body: any`
- service methods merge arbitrary JSON payloads
- several sectors persist entire workspaces in `AppRecord`
- few sector-specific DTOs or relational models exist for these areas

Affected backend modules:
- parts of `settings`
- `finance` (settlement + payout automation)
- infra-dependent messaging delivery

## Conclusion

The backend is broad enough to back both frontends, but not every frontend sector is strongly represented yet.

Current status:
- breadth: high
- production-grade strictness by sector: mixed
- strongest areas: auth, seller/creator shared domains, commerce, collaboration, file handling, platform hardening
- weakest areas: compatibility-heavy seller/provider/live/adz/support/onboarding sectors
