# MyLiveDealz Creator Backend

Production-oriented backend bridge for the **MyLiveDealz Creator App** using:

- **NestJS** application structure
- **Fastify** HTTP adapter
- **Prisma ORM**
- **PostgreSQL** persistence

## What changed in this regeneration

The earlier uploaded backend was a dependency-free prototype built on `node:http` plus a JSON file store.
This regeneration upgrades the backend package so your technical team gets a more realistic drop-in base:

- NestJS bootstrapping and application lifecycle
- Fastify adapter instead of a custom HTTP server
- Prisma-backed persistence to PostgreSQL
- Dockerized local PostgreSQL for fast setup
- Route contract preserved from the existing Creator App backend prototype
- Legacy Creator App route handlers mounted through a compatibility bridge so the frontend API surface stays stable

## Important architecture note

To keep the Creator App route surface intact **without breaking the existing frontend contract**, the current regeneration uses a **Prisma-backed JSON snapshot bridge**:

- Prisma persists the full Creator App state in PostgreSQL (`CreatorAppState.payload` as JSONB)
- the existing Creator App route logic is preserved under `src/legacy/`
- NestJS + Fastify mount that route layer through a compatibility bootstrap

This is intentionally more plug-and-play than the old file-based prototype, while still being a safe stepping stone toward a fully normalized Prisma schema.

## Quick start

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

The API will start on:

```text
http://127.0.0.1:4010
```

Seed login:

```text
Email: creator@mylivedealz.com
Password: Password123!
```

## Available scripts

```bash
npm run dev            # tsx watch mode
npm run start          # run the NestJS app directly with tsx
npm run build          # compile to dist/
npm run start:prod     # run compiled output
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
npm test
```

## Folder map

```text
backend/
  prisma/
    schema.prisma
    seed.mjs
    migrations/
  src/
    app.module.ts
    main.ts
    platform/
      prisma.service.ts
      app-state.store.ts
      legacy-api.bootstrap.ts
    legacy/
      lib/
      routes/
      seed/
  test/
```

## Route groups preserved

### System
- `GET /health`
- `GET /api/routes`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `POST /api/auth/switch-role`

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
- `GET /api/live/studio/default`
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
- `PATCH /api/roles/security`
- `POST /api/roles/invites`
- `PATCH /api/roles/members/:id`
- `GET /api/crew`
- `PATCH /api/crew/sessions/:id`
- `GET /api/audit-logs`

## Why this is more plug-and-play than the old prototype

- **No custom HTTP server**: the app now boots through NestJS and Fastify.
- **No JSON file persistence**: state is now persisted in PostgreSQL through Prisma.
- **No lost API surface**: the existing Creator App contract remains intact under `src/legacy`.
- **Safer migration path**: your team can normalize domain tables incrementally without reworking the frontend first.

## Recommended next hardening step

After your frontend team is stable on the API contract, normalize the largest JSON domains first:

1. auth + sessions
2. workspace members / roles / invites
3. campaigns + live sessions
4. proposals / contracts / tasks
5. finance + payouts + subscription

That turns this bridge into a fully normalized Prisma backend without throwing away the route work already done.
