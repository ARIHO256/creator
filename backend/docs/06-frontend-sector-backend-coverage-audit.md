# 06 Frontend Sector Backend Coverage Audit

Date: 2026-03-08

Scope:
- Creator frontend: `frontend/src/App.tsx`
- Seller frontend: `sellerfront/src/app/routes.tsx`
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

### Represented but not strongly enough yet
- Seller onboarding and provider onboarding
- Communications/messages/help-support
- Wholesale quotes/RFQs/price lists/incoterms
- Provider quotes/bookings/consultations/portfolio/reviews/disputes
- Live studio/session/replay/tooling
- Adz builder/campaigns/links/promo ads
- Regulatory desks/compliance subdomains
- Settings/roles/crew/help/status areas with broad `any` payloads

## Key finding

The backend now covers nearly every visible frontend sector at the route/module level, but several sectors are still represented through compatibility-style `AppRecord` payloads instead of strongly typed, normalized domain logic.

That means:
- sector exists in backend: mostly yes
- strongly represented in production-style backend contracts: not all of them yet

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
- live sessionz and live tools
- adz builder/manager/marketplace/performance
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
- seller onboarding detail depth
- provider onboarding detail depth
- help/support/messages workflow depth
- wholesale quote/RFQ business rules
- provider quote/booking lifecycle rules
- live/mylivedealz supplier feature family
- channel-specific desk logic

## Why partial sectors are not yet "strong"

Patterns found:
- endpoints accept `@Body() body: any`
- service methods merge arbitrary JSON payloads
- several sectors persist entire workspaces in `AppRecord`
- few sector-specific DTOs or relational models exist for these areas

Affected backend modules:
- `workflow`
- `communications`
- `wholesale`
- `provider`
- `live`
- `adz`
- parts of `settings`
- parts of `regulatory`

## Conclusion

The backend is broad enough to back both frontends, but not every frontend sector is strongly represented yet.

Current status:
- breadth: high
- production-grade strictness by sector: mixed
- strongest areas: auth, seller/creator shared domains, commerce, collaboration, file handling, platform hardening
- weakest areas: compatibility-heavy sellerfront/provider/live/adz/support/onboarding sectors
