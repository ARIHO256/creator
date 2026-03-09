# MyLiveDealz Creator Backend

NestJS + Fastify + Prisma backend for creator workflows, using **MySQL**.

## Stack
- NestJS 11
- Fastify adapter
- Prisma ORM
- MySQL 8
- JWT auth (access + refresh rotation)

## Modules
- `auth`
- `users`
- `creators`
- `profiles`
- `deals`
- `marketplace`
- `analytics`
- `media`

## Quick start
```bash
cp .env.example .env
# ensure your local MySQL server is running and DATABASE_URL matches it
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

API base: `http://127.0.0.1:4010/api`

Seed login:
- `creator@mylivedealz.com`
- `Password123!`

## Useful commands
```bash
npm run dev
npm run build
npm run prisma:migrate
npm run prisma:seed
npm test
```

## Docs
See `backend/docs/` for:
- current backend audit
- frontend flow map (read-only)
- target architecture
- MySQL data model
- endpoint specification
