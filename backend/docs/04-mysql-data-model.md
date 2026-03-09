# 04 MySQL Data Model

## ORM approach
- Prisma + MySQL (single ORM strategy, consistent project-wide)

## Core relational tables

### users/auth
- `User`
  - identity, password hash, role, approval status
- `RefreshToken`
  - hashed refresh tokens with rotation family and expiry

### creators/profiles
- `CreatorProfile`
  - creator public/profile attributes (`handle`, tier, bio, metrics)

### deals/marketplace listings
- `Deal`
  - creator-owned deal records
- `MarketplaceListing`
  - publish layer linked to deal (optional), pricing/status

### discovery
- `Seller`
  - supplier entities
- `Opportunity`
  - seller opportunities

### analytics/events
- `AnalyticsEvent`
  - event stream (`VIEW`, `CLICK`, `PURCHASE`, `IMPRESSION`)

### media/assets
- `MediaAsset`
  - asset metadata store (name/kind/url)

## Compatibility/extension table

### `AppRecord`
- Purpose: preserve and serve broad legacy feature payloads while staying on MySQL.
- Columns:
  - `id` PK
  - `userId` nullable FK to `User`
  - `domain` (e.g. `live`, `workflow`, `settings`)
  - `entityType` (e.g. `session`, `content_approval`)
  - `entityId` logical external id
  - `payload` JSON
  - timestamps
- Used for:
  - dashboard/feed bootstrap payloads
  - discovery invites/campaign-board/dealz-marketplace
  - collaboration proposals/contracts/tasks/assets
  - live and adz builder/runtime payloads
  - settings/roles/crew/audit payloads
  - workflow onboarding/approval payloads
  - review dashboard payloads
  - finance compatibility payloads

## Relations
- `User 1:1 CreatorProfile`
- `User 1:N RefreshToken`
- `User 1:N Deal`
- `Deal 1:N MarketplaceListing`
- `User 1:N MarketplaceListing`
- `Seller 1:N Opportunity`
- `User 1:N AnalyticsEvent`
- `User 1:N MediaAsset`
- `User 1:N AppRecord` (nullable for global/public records)

## Indexing strategy
- Uniques:
  - `User.email`, `User.phone`
  - `CreatorProfile.userId`, `CreatorProfile.handle`
- High-read indexes:
  - `RefreshToken(userId)`, `RefreshToken(family)`
  - `Deal(userId,status)`
  - `MarketplaceListing(userId,dealId,status)`
  - `Opportunity(sellerId,status)`
  - `AnalyticsEvent(userId,eventType)`, `AnalyticsEvent(createdAt)`
  - `AppRecord(userId,domain,entityType)`
  - `AppRecord(domain,entityType,entityId)`

## Sector mapping against frontend
- users/auth: implemented
- creators/profiles: implemented
- deals/marketplace listings: implemented
- orders/transactions: partial (payout request/history via compatibility records)
- analytics/events: implemented (core + compatibility overview)
- media/assets: implemented at metadata level

Features marked `frontend-present, backend-missing` are now reduced to advanced business-depth, not route availability:
- deep financial ledgering/invoicing settlement rules
- complex live/adz optimization algorithms and moderation automations
