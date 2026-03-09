# 05 Endpoints Spec

Base prefix: `/api` (except `GET /health`).
Auth: JWT bearer required unless noted `Public`.

## System + Dashboard
- `GET /health` (Public)
- `GET /api/metrics` (Public)
- `GET /api/routes` (Public)
- `GET /api/landing/content` (Public)
- `GET /api/app/bootstrap`
- `GET /api/dashboard/feed`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/my-day`
- `GET /api/search`
- `GET /api/realtime/stream`

## Auth
- `POST /api/auth/register` (Public) - `RegisterDto`
- `POST /api/auth/login` (Public) - `LoginDto`
- `POST /api/auth/refresh` (Public) - `RefreshTokenDto`
- `POST /api/auth/logout` - `RefreshTokenDto`
- `GET /api/auth/me`
- `POST /api/auth/switch-role` - `SwitchRoleDto`
- `GET /api/me` (compat)

## Audit + Monitoring
- `GET /api/audit/events` (Admin/Support)

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
- `POST /api/creators/:id/follow`
- `GET /api/my-creators`
- `GET /api/opportunities`
- `GET /api/opportunities/:id`
- `POST /api/opportunities/:id/save`
- `GET /api/campaign-board`
- `GET /api/dealz-marketplace`
- `GET /api/invites`
- `POST /api/invites/:id/respond`

## Seller Ops
- `GET /api/seller/dashboard`
- `GET /api/seller/dashboard/summary`
- `GET /api/seller/listings` (query: `marketplace`)
- `GET /api/seller/listings/:id`
- `POST /api/seller/listings/bulk/validate` - `BulkListingValidateDto`
- `POST /api/seller/listings/bulk/commit` - `BulkListingCommitDto`
- `GET /api/seller/listing-wizard`
- `GET /api/seller/orders` (query: `channel`)
- `GET /api/seller/orders/:id`
- `GET /api/seller/orders/:id/print/invoice`
- `GET /api/seller/orders/:id/print/packing-slip`
- `GET /api/seller/orders/:id/print/sticker`
- `GET /api/seller/returns` (query: `channel`)
- `POST /api/seller/returns` - `CreateReturnDto`
- `PATCH /api/seller/returns/:id` - `UpdateReturnDto`
- `GET /api/seller/disputes` (query: `channel`)
- `POST /api/seller/disputes` - `CreateDisputeDto`
- `PATCH /api/seller/disputes/:id` - `UpdateDisputeDto`
- `GET /api/seller/inventory`
- `POST /api/seller/inventory/adjustments` - `CreateInventoryAdjustmentDto`
- `GET /api/seller/shipping-profiles`
- `POST /api/seller/shipping-profiles` - `CreateShippingProfileDto`
- `PATCH /api/seller/shipping-profiles/:id` - `UpdateShippingProfileDto`
- `POST /api/seller/shipping-profiles/:id/rates` - `CreateShippingRateDto`
- `PATCH /api/seller/shipping-profiles/:profileId/rates/:rateId` - `UpdateShippingRateDto`
- `GET /api/seller/warehouses`
- `POST /api/seller/warehouses` - `CreateWarehouseDto`
- `PATCH /api/seller/warehouses/:id` - `UpdateWarehouseDto`
- `GET /api/seller/exports`
- `POST /api/seller/exports` - `CreateExportJobDto`
- `GET /api/seller/documents`
- `POST /api/seller/documents` - `CreateDocumentDto`
- `PATCH /api/seller/documents/:id` - `UpdateDocumentDto`
- `GET /api/seller/finance/wallets`
- `GET /api/seller/finance/holds`
- `GET /api/seller/finance/invoices`
- `GET /api/seller/finance/statements`
- `GET /api/seller/finance/tax-reports`

## Ops Center
- `GET /api/ops/overview`
- `GET /api/ops/inventory`
- `GET /api/ops/shipping`
- `GET /api/ops/warehouses`
- `GET /api/ops/documents`
- `GET /api/ops/exports`
- `GET /api/ops/exceptions`

## ExpressMart
- `GET /api/expressmart/summary`
- `GET /api/expressmart/orders`
- `GET /api/expressmart/orders/:id`
- `PATCH /api/expressmart/orders/:id` - `UpdateOrderDto`
- `GET /api/expressmart/returns`
- `GET /api/expressmart/disputes`

## Favourites
- `GET /api/favourites`
- `GET /api/favourites/listings`
- `POST /api/favourites/listings/:id`
- `DELETE /api/favourites/listings/:id`

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

## Communications + Support
- `GET /api/messages`
- `GET /api/messages/:threadId`
- `POST /api/messages/:threadId/reply` - `SendMessageDto`
- `PATCH /api/messages/:threadId/read`
- `POST /api/messages/read-all`
- `GET /api/help-support/content`
- `POST /api/help-support/tickets` - `CreateSupportTicketDto`
- `GET /api/help-support/tickets/:id`
- `GET /api/system-status`
- `GET /api/trust/content` (Public)
- `GET /api/trust/incidents` (Public)
- `POST /api/trust/content` (Support/Admin)
- `PATCH /api/trust/content/:id` (Support/Admin)
- `POST /api/trust/incidents` (Support/Admin)
- `PATCH /api/trust/incidents/:id` (Support/Admin)
- `GET /api/support/tickets` (Support/Admin)
- `GET /api/support/tickets/:id` (Support/Admin)
- `PATCH /api/support/tickets/:id` (Support/Admin) - `UpdateSupportTicketDto`
- `POST /api/support/tickets/:id/assign` (Support/Admin) - `AssignSupportTicketDto`
- `POST /api/support/tickets/:id/escalate` (Support/Admin) - `EscalateSupportTicketDto`

## Market Approvals
- `GET /api/market-approvals` (Support/Admin)
- `GET /api/market-approvals/:id` (Support/Admin)
- `POST /api/market-approvals` (Seller/Provider/Admin)
- `PATCH /api/market-approvals/:id` (Support/Admin)

## Regulatory + Compliance
- `GET /api/compliance`
- `POST /api/compliance/items` - `CreateComplianceItemDto`
- `PATCH /api/compliance/items/:id` - `UpdateComplianceItemDto`
- `GET /api/regulatory/desks`
- `POST /api/regulatory/desks` - `CreateRegulatoryDeskDto`
- `PATCH /api/regulatory/desks/:id` - `UpdateRegulatoryDeskDto`
- `GET /api/regulatory/desks/:slug`
- `POST /api/regulatory/desks/:deskId/items` - `CreateRegulatoryDeskItemDto`
- `PATCH /api/regulatory/desks/:deskId/items/:itemId` - `UpdateRegulatoryDeskItemDto`

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

## Provider
- `GET /api/provider/service-command`
- `GET /api/provider/quotes`
- `GET /api/provider/quotes/:id`
- `POST /api/provider/quotes` - `CreateProviderQuoteDto`
- `GET /api/provider/joint-quotes`
- `GET /api/provider/joint-quotes/:id`
- `POST /api/provider/joint-quotes` - `CreateProviderQuoteDto`
- `GET /api/provider/consultations`
- `GET /api/provider/bookings`
- `GET /api/provider/bookings/:id`
- `GET /api/provider/portfolio`
- `GET /api/provider/reviews`
- `GET /api/provider/disputes`

## Catalog
- `GET /api/catalog/templates`
- `POST /api/catalog/templates` - `CreateCatalogTemplateDto`
- `PATCH /api/catalog/templates/:id` - `UpdateCatalogTemplateDto`
- `GET /api/catalog/media-library`

## Finance + Analytics + Subscription
- `GET /api/earnings/summary`
- `GET /api/earnings/payouts`
- `POST /api/earnings/payouts/request`
- `GET /api/finance/payouts` (Support/Admin)
- `POST /api/finance/payouts/:id/approve` (Support/Admin)
- `POST /api/finance/payouts/:id/reject` (Support/Admin)
- `POST /api/finance/payouts/:id/cancel` (Support/Admin)
- `POST /api/finance/adjustments` (Support/Admin)
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
- `POST /api/account-approval/decision` (Support/Admin) - `UpdateAccountApprovalDecisionDto`
- `GET /api/content-approvals`
- `GET /api/content-approvals/:id`
- `POST /api/content-approvals`
- `PATCH /api/content-approvals/:id`
- `POST /api/content-approvals/:id/nudge`
- `POST /api/content-approvals/:id/withdraw`
- `POST /api/content-approvals/:id/resubmit`

## Reviews
- `GET /api/reviews/dashboard`
- `GET /api/reviews/summary`
- `GET /api/reviews`
- `GET /api/reviews/insights`
- `POST /api/reviews` - `CreateReviewDto`
- `PATCH /api/reviews/:id` - `UpdateReviewDto`
- `POST /api/reviews/:id/replies` - `CreateReviewReplyDto`

## Response and errors
- Success envelope: `{ success: true, data, timestamp }`
- Error envelope: `{ success: false, error, timestamp, path }`
