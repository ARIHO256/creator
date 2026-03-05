# MyLiveDealz Creator Backend

Runnable backend scaffold for the **MyLiveDealz Creator App**.

This backend is built to unblock backend work for the uploaded Creator portal. It focuses on:
- real route structure that matches the current frontend modules
- working authentication and persistence
- seed data aligned with the current mock-heavy screens
- a clean page-to-API contract so the frontend can be wired progressively

## Why this backend looks the way it does

The uploaded frontend is rich in features but still mostly driven by:
- localStorage-based auth and approval flags
- mock arrays embedded inside page files
- local-only state for proposals, contracts, live sessions, assets, and payouts

Because of that, this backend is deliberately designed as a **functional prototype backend**:
- **dependency-free Node.js**
- **JSON file persistence**
- **REST endpoints for every major app module**
- **seed data** using the same sellers, campaigns, and creator persona already present in the app

This lets you run and test a backend immediately, then later swap the persistence layer for PostgreSQL or Prisma without changing the API surface too much.

## Quick start

```bash
cd mldz_creator_backend
node src/server.js
```

The server starts on:

```text
http://127.0.0.1:4010
```

Seed login:

```text
Email: creator@mylivedealz.com
Password: Password123!
```

## Run tests

```bash
npm test
```

## Environment variables

Copy `.env.example` and override as needed.

- `PORT` - API port
- `HOST` - bind host
- `MLDZ_DB_FILE` - JSON data file path
- `SESSION_TTL_DAYS` - token lifetime

## Main route groups

### System
- `GET /health`
- `GET /api/routes`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

### Bootstrap and dashboards
- `GET /api/app/bootstrap`
- `GET /api/dashboard/feed`
- `GET /api/dashboard/my-day`

### Discovery and opportunities
- `GET /api/sellers`
- `POST /api/sellers/:id/follow`
- `GET /api/my-sellers`
- `GET /api/opportunities`
- `GET /api/invites`
- `POST /api/invites/:id/respond`
- `GET /api/public-profile/:handle`

### Collaboration
- `GET /api/campaigns`
- `GET /api/proposals`
- `POST /api/proposals`
- `GET /api/proposals/:id`
- `POST /api/proposals/:id/messages`
- `POST /api/proposals/:id/transition`
- `GET /api/contracts`
- `GET /api/contracts/:id`
- `POST /api/contracts/:id/terminate-request`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/comments`
- `GET /api/assets`
- `POST /api/assets`
- `PATCH /api/assets/:id/review`

### Live commerce
- `GET /api/live/sessions`
- `POST /api/live/sessions`
- `PATCH /api/live/sessions/:id`
- `GET /api/live/studio/:id`
- `POST /api/live/studio/:id/start`
- `POST /api/live/studio/:id/end`
- `POST /api/live/studio/:id/moments`
- `GET /api/live/replays`
- `GET /api/live/reviews`

### Live tools
- `GET/PATCH /api/tools/audience-notifications`
- `GET/PATCH /api/tools/live-alerts`
- `GET/PATCH /api/tools/overlays`
- `GET/PATCH /api/tools/post-live`
- `GET/PATCH /api/tools/streaming`
- `GET/PATCH /api/tools/safety`

### Adz and link tools
- `GET /api/adz/campaigns`
- `GET /api/adz/marketplace`
- `POST /api/adz/campaigns`
- `PATCH /api/adz/campaigns/:id`
- `GET /api/adz/campaigns/:id/performance`
- `GET /api/promo-ads/:id`
- `GET /api/links`
- `POST /api/links`
- `PATCH /api/links/:id`

### Finance
- `GET /api/earnings/summary`
- `GET /api/earnings/payouts`
- `POST /api/earnings/payouts/request`
- `GET /api/analytics/overview`
- `GET /api/subscription`
- `PATCH /api/subscription`

### Settings and workspace admin
- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/roles`
- `POST /api/roles/invites`
- `PATCH /api/roles/members/:id`
- `GET /api/crew`
- `PATCH /api/crew/sessions/:id`
- `GET /api/audit-logs`

## Data model covered

The seed and route layer cover these practical backend domains:

- users and sessions
- creator public profile and settings
- sellers and opportunities
- invites and proposals
- campaigns and contracts
- tasks and comments
- assets and review states
- live sessions and live studio state
- replays and reviews
- shoppable ad campaigns
- tracked links
- earnings and payouts
- analytics and subscription
- notifications
- roles, members, crew assignments
- tool configs for audience alerts, overlays, streaming, post-live, and moderation
- audit logs

## Suggested next production step

When you are ready to move beyond prototype mode:

1. replace `JsonStore` with PostgreSQL
2. move auth from opaque tokens to JWT or session cookies
3. store media in S3, Cloudinary, or a CDN-backed object store
4. add webhook handlers for payouts and billing
5. split route handlers into controller/service/repository layers
6. add rate limiting, request validation, and observability

## Frontend wiring order

Best integration order:

1. auth + bootstrap
2. settings/profile
3. sellers/opportunities/invites
4. proposals/contracts/tasks/assets
5. live schedule + live studio
6. adz + links
7. earnings/analytics/subscription
8. roles/crew/audit
