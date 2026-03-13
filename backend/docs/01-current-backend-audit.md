# 01 Current Backend Audit

## Scope
This audit captures the **existing backend before the refactor** that was present in this repository:
- NestJS app shell with Fastify adapter
- Prisma persistence of a **single JSON snapshot** (`CreatorAppState.payload`)
- Legacy custom router mounted through NestJS bootstrap

## Current structure inventory
- Nest entry: `backend/src/main.ts`
- App module: `backend/src/app.module.ts`
- Legacy mount bridge: removed
- Prisma snapshot store: removed
- Prisma service: `backend/src/platform/prisma.service.ts`
- Legacy runtime:
  - Router core: `backend/src/legacy/lib/router.js`
  - Auth/session helpers: `backend/src/legacy/lib/auth.js`
  - HTTP helpers: `backend/src/legacy/lib/http.js`
  - Utility helpers: `backend/src/legacy/lib/utils.js`

  - Domain route files:
    - `auth.routes.js`
    - `dashboard.routes.js`
    - `discovery.routes.js`
    - `collaboration.routes.js`
    - `live.routes.js`
    - `adz.routes.js`
    - `finance.routes.js`
    - `settings.routes.js`
    - `reviews.routes.js`
    - `workflow.routes.js`

## Existing endpoint inventory (legacy)
Source: `router.add(...)` definitions in `backend/src/legacy/routes/*.js`.

### System
- `GET /health` (`dashboard.routes.js`)
- `GET /api/routes` (`dashboard.routes.js`)

### Auth
- `POST /api/auth/register` (`auth.routes.js`)
- `POST /api/auth/login` (`auth.routes.js`)
- `POST /api/auth/logout` (`auth.routes.js`)
- `GET /api/me` (`auth.routes.js`)
- `POST /api/auth/switch-role` (`auth.routes.js`)

### Dashboard/bootstrap
- `GET /api/landing/content`
- `GET /api/app/bootstrap`
- `GET /api/dashboard/feed`
- `GET /api/dashboard/my-day`

### Discovery / creators / marketplace
- `GET /api/sellers`
- `POST /api/sellers/:id/follow`
- `GET /api/my-sellers`
- `GET /api/opportunities`
- `GET /api/opportunities/:id`
- `POST /api/opportunities/:id/save`
- `GET /api/campaign-board`
- `GET /api/dealz-marketplace`
- `GET /api/invites`
- `POST /api/invites/:id/respond`
- `GET /api/public-profile/:handle`

### Collaboration
- `GET /api/campaigns`
- `GET /api/proposals`
- `POST /api/proposals`
- `GET /api/proposals/:id`
- `PATCH /api/proposals/:id`
- `POST /api/proposals/:id/messages`
- `POST /api/proposals/:id/transition`
- `GET /api/contracts`
- `GET /api/contracts/:id`
- `POST /api/contracts/:id/terminate-request`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/comments`
- `POST /api/tasks/:id/attachments`
- `GET /api/assets`
- `GET /api/assets/:id`
- `POST /api/assets`
- `PATCH /api/assets/:id/review`

### Live
- `GET /api/live/builder/:id`
- `POST /api/live/builder/save`
- `POST /api/live/builder/:id/publish`
- `GET /api/live/campaigns/:campaignId/giveaways`
- `GET /api/live/sessions`
- `GET /api/live/sessions/:id`
- `GET /api/live/studio/default`
- `POST /api/live/sessions`
- `PATCH /api/live/sessions/:id`
- `GET /api/live/studio/:id`
- `POST /api/live/studio/:id/start`
- `POST /api/live/studio/:id/end`
- `POST /api/live/studio/:id/moments`
- `GET /api/live/replays`
- `GET /api/live/replays/:id`
- `GET /api/live/replays/by-session/:sessionId`
- `PATCH /api/live/replays/:id`
- `POST /api/live/replays/:id/publish`
- `GET /api/live/reviews`

### Live tools
- `GET /api/tools/audience-notifications`
- `GET /api/tools/live-alerts`
- `GET /api/tools/overlays`
- `GET /api/tools/post-live`
- `GET /api/tools/streaming`
- `GET /api/tools/safety`
- `PATCH /api/tools/audience-notifications`
- `PATCH /api/tools/live-alerts`
- `PATCH /api/tools/overlays`
- `PATCH /api/tools/post-live`
- `PATCH /api/tools/streaming`
- `PATCH /api/tools/safety`

### Adz / link tools
- `GET /api/adz/builder/:id`
- `POST /api/adz/builder/save`
- `POST /api/adz/builder/:id/publish`
- `GET /api/adz/campaigns`
- `GET /api/adz/campaigns/:id`
- `GET /api/adz/marketplace`
- `POST /api/adz/campaigns`
- `PATCH /api/adz/campaigns/:id`
- `GET /api/adz/campaigns/:id/performance`
- `GET /api/promo-ads/:id`
- `GET /api/links`
- `GET /api/links/:id`
- `POST /api/links`
- `PATCH /api/links/:id`

### Finance / analytics / subscription
- `GET /api/earnings/summary`
- `GET /api/earnings/payouts`
- `POST /api/earnings/payouts/request`
- `GET /api/analytics/overview`
- `GET /api/subscription`
- `PATCH /api/subscription`

### Settings / workspace administration
- `GET /api/settings`
- `PATCH /api/settings`
- `POST /api/settings/payout/send-code`
- `POST /api/settings/payout/verify`
- `DELETE /api/settings/devices/:id`
- `POST /api/settings/devices/sign-out-all`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET /api/roles`
- `PATCH /api/roles/security`
- `POST /api/roles`
- `PATCH /api/roles/:id`
- `DELETE /api/roles/:id`
- `POST /api/roles/invites`
- `PATCH /api/roles/members/:id`
- `GET /api/crew`
- `PATCH /api/crew/sessions/:id`
- `GET /api/audit-logs`

### Workflow / onboarding / approvals
- `GET /api/uploads`
- `POST /api/uploads`
- `GET /api/onboarding`
- `PATCH /api/onboarding`
- `POST /api/onboarding/reset`
- `POST /api/onboarding/submit`
- `GET /api/account-approval`
- `PATCH /api/account-approval`
- `POST /api/account-approval/refresh`
- `POST /api/account-approval/resubmit`
- `POST /api/account-approval/dev-approve`
- `GET /api/content-approvals`
- `GET /api/content-approvals/:id`
- `POST /api/content-approvals`
- `PATCH /api/content-approvals/:id`
- `POST /api/content-approvals/:id/nudge`
- `POST /api/content-approvals/:id/withdraw`
- `POST /api/content-approvals/:id/resubmit`

### Reviews
- `GET /api/reviews/dashboard`

## Current auth/register behavior
- Auth style: bearer token backed by `sessions[]` in snapshot payload.
- Register (`/api/auth/register`):
  - Requires `email`, `password`, `name`.
  - Password hashing: `scrypt` (`salt:hash`) in `legacy/lib/auth.js`.
  - Creates user + creator profile objects in JSON payload.
  - Auto-creates session token.
- Login (`/api/auth/login`): verifies credentials against stored `passwordHash`, creates session token.
- Logout (`/api/auth/logout`): invalidates current session token.
- Me (`/api/me`): resolves user/profile via session token.
- Role switching (`/api/auth/switch-role`): mutates `currentRole` and role set in snapshot.

## Current DB/storage design
- Prisma datasource was PostgreSQL.
- Physical table/model: `CreatorAppState` with columns:
  - `id` (PK)
  - `payload` (`Json`)
  - timestamps
- All business domains were embedded inside one JSON blob (`payload`), including:
  - users, sessions, creator profiles
  - sellers/opportunities/invites
  - proposals/contracts/tasks/assets
  - live sessions/replays/tool configs
  - ad campaigns/tracked links
  - earnings/payouts/analytics/subscription
  - settings/roles/members/notifications/audit logs

## Current use-cases covered
- Creator registration/login and role switching
- Landing/bootstrap and dashboard feed/my-day
- Seller discovery, opportunities, invites, following
- Campaign proposal negotiation to contracts/tasks/assets
- Live session planning/studio/replays/tools
- Shoppable Adz and tracked links
- Earnings, payout flow, analytics, subscription
- Creator settings, roles/permissions, crew, notifications, audit logs
- Onboarding/account approval/content approval workflows

## Legacy risk summary
- Strong frontend compatibility, but backend domains were tightly coupled inside a single JSON snapshot.
- No normalized relational constraints across domains.
- Auth/session model was custom token storage rather than JWT + refresh rotation.
- Hard to scale domain ownership and safe incremental changes.
