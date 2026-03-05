# 03 Target Backend Architecture

## Architecture summary
The backend is now a modular NestJS REST API under `backend/src/modules/*`, with:
- MySQL + Prisma
- Global auth guard (JWT bearer)
- Refresh token rotation persisted in DB
- Shared filters/interceptors/decorators/guards in `src/common`
- Compatibility routes matching legacy `/api/*` frontend expectations

## Module map and responsibility
- `auth`: register/login/refresh/logout/me/switch-role
- `users`: authenticated user profile (`/users/me`)
- `creators`: creator profile CRUD + public profile
- `profiles`: public profile listing
- `deals`: deal CRUD
- `marketplace`: marketplace feeds/listings
- `dashboard`: health, route map, landing, app bootstrap, dashboard feed/my-day
- `discovery`: sellers, my-sellers, opportunities, campaign-board, invites, dealz-marketplace
- `collaboration`: campaigns, proposals, contracts, tasks, assets
- `live`: live builder/sessions/studio/replays/live tools
- `adz`: adz builder/campaigns/marketplace/performance/promo-ads/links
- `finance`: earnings, payouts, analytics overview, subscription
- `settings`: settings, payout verification, devices, notifications, roles, crew, audit logs
- `workflow`: uploads, onboarding, account approval, content approvals
- `reviews`: reviews dashboard
- `analytics`: normalized analytics summary endpoint (`/api/analytics/summary`)
- `media`: media assets metadata

## Data strategy
- Normalized relational tables for core entities:
  - users/auth, creators, sellers/opportunities, deals/listings, analytics events, media assets
- Flexible extension table for large legacy-like domain payloads:
  - `AppRecord` (`domain`, `entityType`, `entityId`, `payload` JSON)
- This keeps MySQL as the single source while allowing incremental hardening from compatibility payloads to stricter normalized tables.

## Auth strategy
- Access token: JWT (`JWT_ACCESS_SECRET`, default ttl `15m`)
- Refresh token: JWT with rotation (`tokenId`, `family`), hashed and stored in `RefreshToken`
- Logout revokes refresh token
- `@Public()` endpoints bypass global JWT guard; all others require bearer token

## API conventions
- Global prefix: `/api` (except `/health`)
- DTO validation enabled globally (`ValidationPipe`) where DTOs are defined
- Success envelope:
  - `{ success: true, data, timestamp }`
- Error envelope:
  - `{ success: false, error, timestamp, path }`

## Migration notes
- Legacy custom router is replaced by Nest controllers/services by domain.
- Legacy JSON snapshot model is replaced with MySQL Prisma models plus `AppRecord` compatibility store.
- Endpoint paths expected by current frontend/legacy flows are preserved under `/api/*`.
