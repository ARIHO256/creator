# 05 Endpoints Spec

Base prefix: `/api` (except `GET /health`).
Auth: JWT bearer required unless noted `Public`.

## System + Dashboard
- `GET /health` (Public)
- `GET /api/routes` (Public)
- `GET /api/landing/content` (Public)
- `GET /api/app/bootstrap`
- `GET /api/dashboard/feed`
- `GET /api/dashboard/my-day`

## Auth
- `POST /api/auth/register` (Public) - `RegisterDto`
- `POST /api/auth/login` (Public) - `LoginDto`
- `POST /api/auth/refresh` (Public) - `RefreshTokenDto`
- `POST /api/auth/logout` - `RefreshTokenDto`
- `GET /api/auth/me`
- `POST /api/auth/switch-role` - `SwitchRoleDto`
- `GET /api/me` (compat)

## Users / Creators / Profiles
- `GET /api/users/me`
- `GET /api/creators/me/profile`
- `PATCH /api/creators/me/profile` - `UpdateCreatorProfileDto`
- `GET /api/creators/public/:handle` (Public)
- `GET /api/public-profile/:handle` (Public, compat)
- `GET /api/profiles/public` (Public)

## Deals + Marketplace
- `GET /api/deals`
- `GET /api/deals/:id`
- `POST /api/deals` - `CreateDealDto`
- `PATCH /api/deals/:id` - `UpdateDealDto`
- `DELETE /api/deals/:id`
- `GET /api/marketplace/feed`
- `GET /api/marketplace/sellers` (Public)
- `GET /api/marketplace/opportunities`
- `GET /api/marketplace/listings`
- `POST /api/marketplace/listings` - `CreateMarketplaceListingDto`

## Discovery
- `GET /api/sellers` (Public)
- `POST /api/sellers/:id/follow`
- `GET /api/my-sellers`
- `GET /api/opportunities`
- `GET /api/opportunities/:id`
- `POST /api/opportunities/:id/save`
- `GET /api/campaign-board`
- `GET /api/dealz-marketplace`
- `GET /api/invites`
- `POST /api/invites/:id/respond`

## Taxonomy
- `GET /api/taxonomy/trees` (Public)
- `GET /api/taxonomy/trees/:id/nodes` (Public)
- `GET /api/taxonomy/nodes/:id/children` (Public)
- `POST /api/taxonomy/trees` (Admin/Support) - `CreateTaxonomyTreeDto`
- `PATCH /api/taxonomy/trees/:id` (Admin/Support) - `UpdateTaxonomyTreeDto`
- `POST /api/taxonomy/nodes` (Admin/Support) - `CreateTaxonomyNodeDto`
- `PATCH /api/taxonomy/nodes/:id` (Admin/Support) - `UpdateTaxonomyNodeDto`
- `GET /api/taxonomy/coverage`
- `POST /api/taxonomy/coverage` - `CreateTaxonomyCoverageDto`
- `PATCH /api/taxonomy/coverage/:id` - `UpdateTaxonomyCoverageDto`
- `DELETE /api/taxonomy/coverage/:id`

## Storefront
- `GET /api/storefront/me`
- `PATCH /api/storefront/me` - `UpdateStorefrontDto`
- `GET /api/storefront/:handle` (Public)
- `GET /api/storefront/:handle/listings` (Public)

## Collaboration
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

## Live
- `GET /api/live/builder/:id`
- `POST /api/live/builder/save`
- `POST /api/live/builder/:id/publish`
- `GET /api/live/campaigns/:campaignId/giveaways`
- `GET /api/live/sessions`
- `GET /api/live/sessions/:id`
- `POST /api/live/sessions`
- `PATCH /api/live/sessions/:id`
- `GET /api/live/studio/default`
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

## Live tools
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

## Adz + Links
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

## Finance + Analytics + Subscription
- `GET /api/earnings/summary`
- `GET /api/earnings/payouts`
- `POST /api/earnings/payouts/request`
- `GET /api/analytics/overview`
- `GET /api/analytics/summary`
- `GET /api/subscription`
- `PATCH /api/subscription`

## Settings / Roles / Crew / Audit
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

## Wholesale
- `GET /api/wholesale`
- `GET /api/wholesale/price-lists`
- `GET /api/wholesale/rfqs`
- `GET /api/wholesale/quotes`
- `GET /api/wholesale/quotes/:id`
- `POST /api/wholesale/quotes`
- `PATCH /api/wholesale/quotes/:id`
- `GET /api/wholesale/incoterms`

## Jobs
- `GET /api/jobs`
- `GET /api/jobs/metrics`
- `GET /api/jobs/:id`
- `POST /api/jobs/:id/requeue`

## Workflow
- `GET /api/uploads`
- `POST /api/uploads`
- `GET /api/onboarding`
- `GET /api/onboarding/slug-availability/:slug`
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

## Reviews
- `GET /api/reviews/dashboard`

## Response and errors
- Success envelope: `{ success: true, data, timestamp }`
- Error envelope: `{ success: false, error, timestamp, path }`
