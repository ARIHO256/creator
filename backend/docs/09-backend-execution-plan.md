# 09 Backend Execution Plan (Creator + Seller Parity)

Date: 2026-03-09

Purpose: implementation-grade plan to finish backend parity with the existing Creator and Seller frontends without redesigning or changing frontend code.

Legend for status:
- READY
- PARTIAL
- WEAK BUT EXTENDABLE
- MISMATCHED
- MISSING

------------------------------------------------------------------------------
1. Full Page-by-Page Backend Parity Matrix
------------------------------------------------------------------------------

Creator App Routes (from `frontend/src/App.tsx`)

Columns: Route | Page | Feature Area | Actions | Data Required | Status | Backend Module | Existing Endpoints | Missing Pieces | Risks | Required Backend Action

| Route | Page | Feature Area | Actions | Data Required | Status | Backend Module | Existing Endpoints | Missing Pieces | Risks | Required Backend Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | CreatorPlatformLanding | Landing | Enter platform, CTA | Landing content, CTA targets | READY | landing | GET /api/landing/content | None | Low | Keep and ensure content fields map to UI copy blocks |
| /auth-redirect | AuthRedirectHandler | Auth | redirect | Auth status | READY | auth | POST /api/auth/login, GET /api/auth/me | None | Low | Keep |
| /auth | AuthRedirectHandler | Auth | redirect | Auth status | READY | auth | POST /api/auth/login, GET /api/auth/me | None | Low | Keep |
| /onboarding | CreatorOnboardingV2 | Onboarding | submit steps | onboarding status, taxonomy, profile | PARTIAL | workflow, taxonomy, creators | /api/taxonomy/*, /api/workflow/* (onboarding), /api/creators/me/profile | Missing strict onboarding step DTOs and status transitions | Medium | Add onboarding step DTOs, enforce required sections, audit submissions |
| /account-approval | CreatorAwaitingApprovalPremium | Onboarding | read-only | approval status, reasons | PARTIAL | workflow | /api/workflow/* | Approval state details and audit log | Medium | Add approval status endpoint with decision metadata |
| /home | CreatorLiveDealzFeedPage | Live feed | browse feed, filter, open items | live sessions, campaigns, seller listings | PARTIAL | live, marketplace, discovery | /api/live/sessions, /api/marketplace/feed, /api/deals | Unified feed payload and filters | Medium | Add feed aggregator endpoint or enrich /marketplace/feed |
| /shell | CreatorMyDayDashboardPage | Dashboard | view KPIs | summary, tasks, reminders | READY | dashboard | /api/dashboard/my-day, /api/dashboard/summary | None | Low | Keep |
| /onboarding-wizard | CreatorOnboardingWizardPage | Onboarding | step navigation | onboarding progress, taxonomy | PARTIAL | workflow, taxonomy | /api/workflow/*, /api/taxonomy/* | Step-level validation | Medium | Add onboarding step completion endpoint |
| /awaiting-approval | CreatorAwaitingApproval | Onboarding | read-only | approval status | PARTIAL | workflow | /api/workflow/* | Approval reasons | Medium | Add reason fields and status history |
| /notifications | NotificationsPage | Notifications | mark read, list | notifications | READY | settings/notifications | /api/notifications, /api/notifications/read-all | None | Low | Keep |
| /profile-public | CreatorPublicProfilePage | Profile | view public profile | creator profile, listings, social links | READY | creators/profiles | /api/creators/public/:handle, /api/profiles/public | None | Low | Keep |
| /opportunities | OpportunitiesBoardPage | Discovery | browse, save | opportunities, filters | READY | discovery | /api/opportunities, /api/opportunities/:id, /api/opportunities/:id/save | None | Low | Keep |
| /dealz-marketplace | DealzMarketplace2 | Marketplace | browse | dealz listings, sellers | READY | marketplace | /api/dealz-marketplace, /api/marketplace/listings | None | Low | Keep |
| /live-dashboard-2 | LiveDashboard2 | Live | view metrics | live sessions, stats | READY | live | /api/live/sessions, /api/live/studio/default | None | Low | Keep |
| /live-schedule | LiveScheduleCalendarPage | Live | schedule | session calendar, slots | READY | live | /api/live/sessions (create/update) | None | Low | Keep |
| /Crew-manager | CreatorLiveCrewCohostManagement | Team/Crew | manage cohosts | crew members, roles | READY | settings/roles | /api/crew, /api/roles | None | Low | Keep |
| /live-studio | LiveStudioPage | Live | start/end, manage session | studio state, tools, overlays | READY | live/tools | /api/live/studio/*, /api/tools/* | None | Low | Keep |
| /reviews | Reviews2 | Reviews | view insights | review list, summary, trends | READY | reviews | /api/live/reviews, /api/reviews | None | Low | Keep |
| /live-history | LiveReplaysClipsPage | Live | view replays | replays list | READY | live | /api/live/replays, /api/live/replays/:id | None | Low | Keep |
| /AdzDashboard | AdzDashboard | Ads | view campaigns | adz campaigns, KPIs | READY | adz | /api/adz/campaigns, /api/adz/campaigns/:id/performance | None | Low | Keep |
| /AdzManager | AdzManager | Ads | manage ads | campaign detail, assets | READY | adz/media | /api/adz/campaigns/:id, /api/media/* | Asset search filters | Medium | Add asset filter DTOs if required |
| /AdzMarketplace | AdzMarketplace | Ads | browse | ad marketplace listings | READY | adz | /api/adz/marketplace | None | Low | Keep |
| /promo-ad-detail | PromoAdDetailPage | Ads | view promo | promo detail, metrics | PARTIAL | adz | /api/adz/campaigns/:id, /api/adz/campaigns/:id/performance | Missing promo-specific breakdowns | Medium | Add /api/adz/campaigns/:id/summary endpoint |
| /earnings | EarningsDashboardPage | Finance | view earnings | balances, payouts | READY | finance | /api/finance/wallets, /api/finance/holds | None | Low | Keep |
| /analytics | AnalyticsRankDetailPage | Analytics | view rank | analytics summaries | READY | analytics | /api/analytics/* (existing module) | None | Low | Keep |
| /request-payout | RequestPayoutPage | Finance | request payout | payout methods, balance | READY | finance/settings | /api/settings/payout-methods, /api/earnings/payouts/request | None | Low | Keep |
| /payout-history | PayoutHistoryPage | Finance | view payouts | payout list | READY | finance | /api/earnings/payouts | None | Low | Keep |
| /sellers | SellersDirectoryPage | Discovery | search/filter | sellers list, filters | READY | discovery | /api/sellers (Public) | None | Low | Keep |
| /my-sellers | MySellersPage | Discovery | list follows | followed sellers | READY | discovery | /api/my-sellers | None | Low | Keep |
| /invites | InvitesFromSellersPage | Collaboration | accept/reject invites | invite list | READY | discovery | /api/invites, /api/invites/:id/respond | None | Low | Keep |
| /link-tools | CreatorLinksHubV3Fixed | Links | create/update links | links, templates | READY | adz | /api/adz/links | None | Low | Keep |
| /link-tool | CreatorLinksHubV3Fixed | Links | open new link drawer | link draft | READY | adz | /api/adz/links | None | Low | Keep |
| /creator-campaigns | CampaignsBoardPage | Collab | list campaigns | campaigns list | READY | collaboration | /api/campaigns | None | Low | Keep |
| /proposals | ProposalsInboxPage | Collab | list proposals | proposals | READY | collaboration | /api/proposals | None | Low | Keep |
| /proposal-room | ProposalNegotiationRoomPage | Collab | negotiate | proposal, messages | READY | collaboration/communications | /api/proposals/:id, /api/proposals/:id/messages | None | Low | Keep |
| /contracts | ContractsPage | Collab | list contracts | contracts list | READY | collaboration | /api/contracts | None | Low | Keep |
| /task-board | TaskBoardPage | Deliverables | manage tasks | tasks list | READY | collaboration | /api/tasks, /api/tasks/:id | None | Low | Keep |
| /asset-library | AssetLibraryPage | Deliverables | browse assets | assets list | READY | collaboration/media | /api/assets, /api/media/* | None | Low | Keep |
| /audit-log | CreatorAuditLogPage | Audit | view logs | audit events | READY | audit | /api/audit/events | None | Low | Keep |
| /settings | CreatorSettingsSafetyPage | Settings | edit settings | settings/security/notifications | READY | settings | /api/settings/* | None | Low | Keep |
| /subscription | MySubscriptionPage | Subscription | view plan | subscription details | READY | finance | /api/subscription | None | Low | Keep |
| /roles-permissions | CreatorRolesPermissionsPremium | Roles | manage roles | roles, permissions | READY | settings | /api/roles, /api/roles/security | None | Low | Keep |
| /roles | RoleSwitcherPage | Role | switch role | role list | READY | auth/users | /api/auth/switch-role, /api/users/me | None | Low | Keep |
| /audience-notification | AudienceNotifications | Live Tools | manage notifications | tool config | READY | live/tools | /api/tools/audience-notifications | None | Low | Keep |
| /live-alert | LiveAlertsManager | Live Tools | manage alerts | tool config | READY | live/tools | /api/tools/live-alerts | None | Low | Keep |
| /overlays-ctas | OverlaysCTAsPro | Live Tools | manage overlays | tool config | READY | live/tools | /api/tools/overlays | None | Low | Keep |
| /post-live | PostLivePublisherPage | Live Tools | publish replay | replay data | READY | live/tools | /api/tools/post-live | None | Low | Keep |
| /Stream-platform | StreamToPlatformsPage | Live Tools | configure streaming | destinations, keys | READY | live/tools | /api/tools/streaming | None | Low | Keep |
| /safety-moderation | SafetyModerationPage | Live Tools | manage safety | moderation rules | READY | live/tools | /api/tools/safety | None | Low | Keep |

Seller App Routes (from `sellerfront/src/app/routes.tsx`)

| Route | Page | Feature Area | Actions | Data Required | Status | Backend Module | Existing Endpoints | Missing Pieces | Risks | Required Backend Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /landing | Landing | Landing | browse | landing content | READY | landing | /api/landing/content | None | Low | Keep |
| /auth | Auth | Auth | login/register | auth | READY | auth | /api/auth/* | None | Low | Keep |
| /dashboard | Dashboard | Dashboard | KPI view | seller summary | READY | dashboard/commerce | /api/seller/dashboard, /api/seller/dashboard/summary | None | Low | Keep |
| /status-center | SettingsStatusCenter | Status | view incidents | system status | PARTIAL | settings/support | /api/system-status | Trust/status content details | Medium | Add incident list/history endpoints |
| /trust | TrustCenter | Trust | view trust content | policy content | MISSING | support/content | None | Trust UI blocked | Add /api/trust/content and policy models |
| /market-panel/approvals | MarketPanelApprovals | Approvals | review items | approval queue | MISSING | regulatory/ops | None | Admin workflows absent | Add approvals queue endpoints |
| /seller/onboarding | SellerOnboarding | Onboarding | submit steps | onboarding status, taxonomy | PARTIAL | workflow/taxonomy | /api/workflow/*, /api/taxonomy/* | Step validation and approvals | Medium | Add onboarding step endpoints |
| /seller/onboarding/review | SellerOnboardingReview | Onboarding | review | approval status | PARTIAL | workflow | /api/workflow/* | Approval history | Medium | Add approval decision metadata |
| /provider/onboarding/review | ProviderOnboardingReview | Onboarding | review | approval status | PARTIAL | workflow | /api/workflow/* | Approval history | Medium | Add approval decision metadata |
| /listings | Listings | Listings | list/filter | listing list | READY | sellers/listings | /api/seller/listings | None | Low | Keep |
| /listings/new | NewListing | Listings | create | taxonomy, listing defaults | READY | sellers/taxonomy | /api/taxonomy/*, /api/seller/listings | None | Low | Keep |
| /listings/wizard | ProductListingWizard | Listings | multi-step create | taxonomy, draft | READY | sellers/taxonomy | /api/taxonomy/*, /api/seller/listings | None | Low | Keep |
| /listings/AwaitingApproval_ProductListing | ListingAwaitingApproval | Listings | view status | listing approval status | PARTIAL | listings/workflow | /api/seller/listings/:id | Approval metadata | Medium | Add approval fields and history |
| /listings/AwaitingApproval_ServiceListing | ServiceListingAwaitingApproval | Listings | view status | service listing status | PARTIAL | listings/workflow | /api/seller/listings/:id | Approval metadata | Medium | Add approval fields and history |
| /services/AwaitingApproval_ServiceListing | ServiceListingAwaitingApproval | Listings | view status | service listing status | PARTIAL | listings/workflow | /api/seller/listings/:id | Approval metadata | Medium | Add approval fields and history |
| /listings/form-preview | ListingFormPreview | Listings | preview | listing draft | READY | sellers/listings | /api/seller/listings/:id | None | Low | Keep |
| /listings/taxonomy | ProductListingTaxonomyNavigatorCanvas | Listings | browse taxonomy | taxonomy tree | READY | taxonomy | /api/taxonomy/* | None | Low | Keep |
| /listings/bulk | BulkImport | Listings | bulk import | upload session, mapping | PARTIAL | media/listings | /api/files/intake, /api/seller/listings | Bulk import job endpoints | Medium | Add /api/listings/bulk/validate + job queue |
| /listings/:id | ListingDetail | Listings | edit/update | listing detail | READY | sellers/listings | /api/seller/listings/:id | None | Low | Keep |
| /p/:sku | ProductShare | Marketplace | view product | public listing | READY | marketplace | /api/marketplace/listings/:id | None | Low | Keep |
| /catalog/templates | CatalogTemplates | Catalog | manage templates | templates list | MISSING | media/catalog | None | Catalog templates absent | Add catalog templates endpoints + model |
| /catalog/media-library | CatalogMediaLibrary | Catalog | browse media | media assets | PARTIAL | media | /api/files/intake, /api/media/* | Catalog-specific filters | Medium | Add catalog media tags and filters |
| /templates | TemplatesHub | Catalog | templates hub | templates | MISSING | media/catalog | None | Template model missing | Add templates endpoints |
| /storefront | StorefrontOverview | Storefront | edit store | storefront, taxonomy | READY | storefront/taxonomy | /api/storefront/me, /api/taxonomy/* | None | Low | Keep |
| /orders | Orders | Orders | list/filter | orders list | READY | commerce | /api/seller/orders | None | Low | Keep |
| /orders/:id | OrderDetail | Orders | view detail | order detail | READY | commerce | /api/seller/orders/:id | None | Low | Keep |
| /returns | Returns | Returns | list/create/update | returns list | READY | commerce | /api/seller/returns | None | Low | Keep |
| /orders/:id/print/invoice | PrintInvoice | Orders | print | invoice document | PARTIAL | commerce/docs | /api/seller/orders/:id | Missing print render endpoint | Medium | Add /api/orders/:id/print/invoice |
| /orders/:id/print/packing-slip | PrintPackingSlip | Orders | print | packing slip | PARTIAL | commerce/docs | /api/seller/orders/:id | Missing print render endpoint | Medium | Add /api/orders/:id/print/packing-slip |
| /orders/:id/print/sticker | PackingSticker | Orders | print | label data | PARTIAL | commerce/docs | /api/seller/orders/:id | Missing label render endpoint | Medium | Add /api/orders/:id/print/sticker |
| /wholesale | WholesaleHome | Wholesale | list | quotes/RFQ overview | READY | wholesale | /api/wholesale/* | None | Low | Keep |
| /wholesale/price-lists | PriceLists | Wholesale | manage price lists | price lists | READY | wholesale | /api/wholesale/price-lists | None | Low | Keep |
| /wholesale/rfq-inbox | RFQInbox | Wholesale | list RFQs | rfqs | READY | wholesale | /api/wholesale/rfqs | None | Low | Keep |
| /wholesale/rfq | RFQInbox | Wholesale | list RFQs | rfqs | READY | wholesale | /api/wholesale/rfqs | None | Low | Keep |
| /wholesale/quotes | Quotes | Wholesale | list quotes | quotes | READY | wholesale | /api/wholesale/quotes | None | Low | Keep |
| /wholesale/incoterms | WholesaleIncoterms | Wholesale | list incoterms | incoterms | READY | wholesale | /api/wholesale/incoterms | None | Low | Keep |
| /wholesale/templates | TemplatesHub | Wholesale | templates | templates | MISSING | wholesale/catalog | None | Template model missing | Add wholesale templates |
| /wholesale/quotes/:id | QuoteDetail | Wholesale | view quote | quote detail | READY | wholesale | /api/wholesale/quotes/:id | None | Low | Keep |
| /livedealz/home | MldzFeed | LiveDealz | feed | live dealz feed | READY | live/marketplace | /api/live/*, /api/dealz-marketplace | None | Low | Keep |
| /seller/promo-analytics | MldzAnalyticsStatus | LiveDealz | analytics | adz performance | READY | adz | /api/adz/campaigns/:id/performance | None | Low | Keep |
| /seller/dealz/catalog | MldzCampaigns | LiveDealz | campaigns | campaigns list | READY | live | /api/live/campaigns | None | Low | Keep |
| /seller/dealz/deals | MldzDealzMarketplace | LiveDealz | marketplace | deals list | READY | marketplace | /api/dealz-marketplace | None | Low | Keep |
| /seller/dealz/new | MldzCampaigns | LiveDealz | create campaign | campaign draft | READY | live | /api/live/campaigns | None | Low | Keep |
| /seller/dealz/approvals | MldzCampaignsBoard | LiveDealz | approvals | campaign approvals | PARTIAL | live/workflow | /api/live/campaigns | Approval metadata | Medium | Add approval endpoints |
| /seller/promo-adz/:promoId/summary | MldzAdzDashboard | LiveDealz | view promo | promo KPIs | READY | adz | /api/adz/campaigns/:id/performance | None | Low | Keep |
| /seller/promo-adz/:promoId/links | MldzLinksHub | LiveDealz | manage links | adz links | READY | adz | /api/adz/links | None | Low | Keep |
| /seller/promo-adz/:promoId/assets | MldzAssetLibrary | LiveDealz | manage assets | assets list | READY | media | /api/media/* | None | Low | Keep |
| /seller/promo-adz/:promoId/distribution | MldzAdzManager | LiveDealz | manage distribution | distribution config | READY | adz | /api/adz/campaigns/:id | None | Low | Keep |
| /seller/shoppable-adz/manager | MldzAdzManager | LiveDealz | manage ads | campaign details | READY | adz | /api/adz/campaigns/:id | None | Low | Keep |
| /seller/shoppable-adz/builder | MldzAdzMarketplace | LiveDealz | ad builder | builder state | READY | adz | /api/adz/builder/:id | None | Low | Keep |
| /seller/shoppable-adz/creator-permissions | MldzAdzManager | LiveDealz | manage perms | permissions | PARTIAL | adz | /api/adz/campaigns/:id | Missing permission DTO | Medium | Add adz permission update endpoint |
| /seller/live-sessions | MldzLiveDashboard | Live | list sessions | sessions list | READY | live | /api/live/sessions | None | Low | Keep |
| /seller/live-sessions/:id | MldzLiveDashboard | Live | view session | session detail | READY | live | /api/live/sessions/:id | None | Low | Keep |
| /seller/live-sessions/setup | MldzLiveSchedule | Live | setup | session config | READY | live | /api/live/sessions | None | Low | Keep |
| /seller/live-sessions/go-live | MldzLiveStudio | Live | go live | studio state | READY | live | /api/live/studio/* | None | Low | Keep |
| /seller/live-sessions/history | MldzLiveReplays | Live | view replays | replays | READY | live | /api/live/replays | None | Low | Keep |
| /seller/creators/discovery | MldzCreatorDirectory | Discovery | search creators | creators list | READY | discovery | /api/creators/public, /api/profiles/public | None | Low | Keep |
| /seller/creators/my-creators | MldzMyCreators | Discovery | list followed | my creators | READY | discovery | /api/my-sellers (provider analog) | Provider equivalents | Medium | Add /api/my-creators |
| /seller/creators/invite-from-creators | MldzCreatorInvites | Collaboration | invites | invites list | READY | discovery | /api/invites | None | Low | Keep |
| /seller/creators/invite-preferences | MldzCreatorInvites | Collaboration | preferences | invite settings | PARTIAL | settings | /api/settings/preferences | Missing invite prefs DTO | Medium | Add invite preference endpoints |
| /seller/collabs/negotiation | MldzProposals | Collab | negotiate | proposal thread | READY | collaboration | /api/proposals, /api/proposals/:id/messages | None | Low | Keep |
| /seller/contracts | MldzContracts | Collab | list contracts | contracts | READY | collaboration | /api/contracts | None | Low | Keep |
| /seller/live-feed/preview | MldzFeed | Live feed | preview | feed data | READY | marketplace/live | /api/marketplace/feed, /api/live/sessions | None | Low | Keep |
| /seller/live-feed | MldzFeed | Live feed | browse | feed data | READY | marketplace/live | /api/marketplace/feed, /api/live/sessions | None | Low | Keep |
| /supplier/* | SupplierMldzRedirect | Routing | redirect | routing | READY | none | N/A | None | Low | Keep |
| /mldz/feed | MldzFeed | Live feed | browse | feed data | READY | marketplace/live | /api/marketplace/feed, /api/live/sessions | None | Low | Keep |
| /mldz/overview/supplier-public-profile | MldzSupplierPublicProfile | Profile | view supplier | supplier profile | READY | sellers | /api/sellers/:id | None | Low | Keep |
| /mldz/campaigns | MldzCampaigns | Live | campaigns | campaigns list | READY | live | /api/live/campaigns | None | Low | Keep |
| /mldz/campaigns/awaiting-admin-approval | MldzAwaitingAdminApproval | Live | approvals | approval queue | PARTIAL | live/workflow | /api/live/campaigns | Missing approval endpoints | Medium | Add approval endpoints |
| /mldz/dealz-marketplace | MldzDealzMarketplace | Marketplace | browse | deals | READY | marketplace | /api/dealz-marketplace | None | Low | Keep |
| /mldz/live/dashboard | MldzLiveDashboard | Live | metrics | sessions/stats | READY | live | /api/live/sessions | None | Low | Keep |
| /mldz/live/schedule | MldzLiveSchedule | Live | schedule | sessions | READY | live | /api/live/sessions | None | Low | Keep |
| /mldz/live/studio | MldzLiveStudio | Live | studio | studio state | READY | live | /api/live/studio/* | None | Low | Keep |
| /mldz/live/stream-to-platforms | MldzStreamToPlatforms | Live Tools | configure | destinations | READY | live/tools | /api/tools/streaming | None | Low | Keep |
| /mldz/live/audience-notifications | MldzAudienceNotifications | Live Tools | manage | notification rules | READY | live/tools | /api/tools/audience-notifications | None | Low | Keep |
| /mldz/live/live-alerts | MldzLiveAlertsManager | Live Tools | manage | alerts config | READY | live/tools | /api/tools/live-alerts | None | Low | Keep |
| /mldz/live/overlays-ctas-pro | MldzOverlaysCtasPro | Live Tools | manage | overlays config | READY | live/tools | /api/tools/overlays | None | Low | Keep |
| /mldz/live/safety-moderation | MldzSafetyModeration | Live Tools | manage | moderation config | READY | live/tools | /api/tools/safety | None | Low | Keep |
| /mldz/live/post-live-publisher | MldzPostLivePublisher | Live Tools | publish | post-live data | READY | live/tools | /api/tools/post-live | None | Low | Keep |
| /mldz/live/replays | MldzLiveReplays | Live | replays | replays list | READY | live | /api/live/replays | None | Low | Keep |
| /mldz/adz/dashboard | MldzAdzDashboard | Ads | KPIs | adz KPIs | READY | adz | /api/adz/campaigns/:id/performance | None | Low | Keep |
| /mldz/adz/marketplace | MldzAdzMarketplace | Ads | browse | adz marketplace | READY | adz | /api/adz/marketplace | None | Low | Keep |
| /mldz/adz/manager | MldzAdzManager | Ads | manage | campaign detail | READY | adz | /api/adz/campaigns/:id | None | Low | Keep |
| /mldz/adz/builder | MldzAdzBuilder | Ads | build | builder state | READY | adz | /api/adz/builder/:id | None | Low | Keep |
| /mldz/adz-performance | MldzAdzPerformance | Ads | performance | performance detail | READY | adz | /api/adz/campaigns/:id/performance | None | Low | Keep |
| /mldz/ads | MldzAdzDashboard | Ads | KPIs | adz KPIs | READY | adz | /api/adz/campaigns | None | Low | Keep |
| /mldz/promos/new | MldzCampaigns | Ads | create promo | campaign draft | READY | adz/live | /api/adz/campaigns, /api/live/campaigns | None | Low | Keep |
| /mldz/insights/analytics-status | MldzAnalyticsStatus | Analytics | analytics | analytics data | READY | analytics | /api/analytics/* | None | Low | Keep |
| /mldz/creators/directory | MldzCreatorDirectory | Discovery | search | creators list | READY | discovery | /api/creators/public | None | Low | Keep |
| /mldz/creators/profile | MldzCreatorPublicProfile | Discovery | profile | creator profile | READY | creators/profiles | /api/creators/public/:handle | None | Low | Keep |
| /mldz/creators/my-creators | MldzMyCreators | Discovery | list | my creators | PARTIAL | discovery | /api/my-sellers (creator) | Missing my-creators endpoint | Medium | Add /api/my-creators |
| /mldz/creators/invites | MldzCreatorInvites | Collab | invites | invites list | READY | discovery | /api/invites | None | Low | Keep |
| /mldz/collab/campaigns | MldzCampaignsBoard | Collab | campaigns | campaigns list | READY | collaboration | /api/campaigns | None | Low | Keep |
| /mldz/collab/proposals | MldzProposals | Collab | proposals | proposals list | READY | collaboration | /api/proposals | None | Low | Keep |
| /mldz/collab/negotiation-room | MldzNegotiationRoom | Collab | negotiate | proposal thread | READY | collaboration | /api/proposals/:id, /api/proposals/:id/messages | None | Low | Keep |
| /mldz/collab/contracts | MldzContracts | Collab | contracts | contracts list | READY | collaboration | /api/contracts | None | Low | Keep |
| /mldz/deliverables/task-board | MldzDeliverablesBoard | Deliverables | tasks | tasks list | READY | collaboration | /api/tasks | None | Low | Keep |
| /mldz/deliverables/asset-library | MldzAssetLibrary | Deliverables | assets | assets list | READY | collaboration/media | /api/assets | None | Low | Keep |
| /mldz/deliverables/links-hub | MldzLinksHub | Links | links | links list | READY | adz | /api/adz/links | None | Low | Keep |
| /mldz/deliverables/links-hub/new-link | MldzNewLink | Links | create link | link draft | READY | adz | /api/adz/links | None | Low | Keep |
| /mldz/team/crew-manager | MldzCrewManager | Team | manage crew | crew list | READY | settings | /api/crew | None | Low | Keep |
| /mldz/team/roles-permissions | MldzRolesPermissions | Team | manage roles | roles | READY | settings | /api/roles | None | Low | Keep |
| /mldz/settings/supplier-settings | MldzSettings | Settings | edit | settings | READY | settings | /api/settings/* | None | Low | Keep |
| /mldz/settings/my-subscriptions | MldzMySubscriptions | Settings | subscription | subscription | READY | finance | /api/subscription | None | Low | Keep |
| /expressmart/orders | ExpressOrders | ExpressMart | list | express orders | READY | expressmart | /api/expressmart/orders | None | Low | Keep |
| /expressmart/orders/:id | ExpressOrderDetail | ExpressMart | detail | express order | READY | expressmart | /api/expressmart/orders/:id | None | Low | Keep |
| /expressmart | ExpressOrderDetail | ExpressMart | detail | express order | READY | expressmart | /api/expressmart/orders/:id | None | Low | Keep |
| /compliance | Compliance | Regulatory | compliance list | compliance items | READY | regulatory | /api/compliance, /api/compliance/items | None | Low | Keep |
| /regulatory/* | Regulatory pages | Regulatory | view desks/items | desk items | READY | regulatory | /api/regulatory/desks, /api/regulatory/desks/:slug | None | Low | Keep |
| /provider/onboarding | ProviderOnboarding | Onboarding | submit steps | provider onboarding | PARTIAL | workflow | /api/workflow/* | Provider-specific DTOs | Medium | Add provider onboarding DTOs |
| /provider/service-command | ProviderServiceCommand | Provider | command | service commands | PARTIAL | provider | /api/provider/service-command | Missing endpoint | Medium | Add provider service command |
| /provider/quotes | ProviderQuotes | Provider | list quotes | quotes list | READY | provider/wholesale | /api/provider/quotes | None | Low | Keep |
| /provider/quotes/:id | ProviderQuoteDetail | Provider | view quote | quote detail | READY | provider/wholesale | /api/provider/quotes/:id | None | Low | Keep |
| /provider/new-quote | ProviderQuoteNew | Provider | create quote | quote draft | READY | provider/wholesale | /api/provider/quotes | None | Low | Keep |
| /provider/quote | ProviderQuoteNew | Provider | create quote | quote draft | READY | provider/wholesale | /api/provider/quotes | None | Low | Keep |
| /provider/joint-quotes | ProviderJointQuote | Provider | list joint quotes | joint quotes | PARTIAL | provider | /api/provider/joint-quotes | Missing endpoint | Medium | Add joint quotes endpoints |
| /provider/joint-quote | ProviderJointQuote | Provider | create joint quote | joint quote | PARTIAL | provider | /api/provider/joint-quotes | Missing endpoint | Medium | Add joint quotes endpoints |
| /provider/joint-quotes/:id | ProviderJointQuote | Provider | view joint quote | joint quote detail | PARTIAL | provider | /api/provider/joint-quotes/:id | Missing endpoint | Medium | Add joint quotes endpoints |
| /provider/consultations | ProviderConsultations | Provider | list consults | consultations | READY | provider | /api/provider/consultations | None | Low | Keep |
| /provider/consultations/queue | ProviderConsultations | Provider | queue | consult queue | READY | provider | /api/provider/consultations | None | Low | Keep |
| /provider/bookings | ProviderBookings | Provider | list bookings | bookings | READY | provider | /api/provider/bookings | None | Low | Keep |
| /provider/bookings/:id | ProviderBookings | Provider | view booking | booking detail | READY | provider | /api/provider/bookings/:id | None | Low | Keep |
| /provider/portfolio | ProviderPortfolio | Provider | manage portfolio | portfolio items | READY | provider | /api/provider/portfolio | None | Low | Keep |
| /provider/catalog/portfolio | ProviderPortfolio | Provider | manage portfolio | portfolio items | READY | provider | /api/provider/portfolio | None | Low | Keep |
| /provider/reviews | ProviderReviews | Provider | review insights | reviews | READY | reviews | /api/reviews | None | Low | Keep |
| /provider/reviewslocalize | ProviderReviews | Provider | review insights | reviews | READY | reviews | /api/reviews | None | Low | Keep |
| /provider/disputes | DisputesProvider | Provider | disputes | disputes list | READY | commerce | /api/seller/disputes (provider scope) | Ensure provider scoping | Medium | Add provider-filtered disputes endpoint |
| /provider/listings | Listings | Provider Listings | list | provider listings | READY | sellers/listings | /api/seller/listings (provider scope) | Ensure provider scoping | Medium | Add provider listings scope |
| /provider/listings/:id | ListingDetail | Provider Listings | detail | listing | READY | sellers/listings | /api/seller/listings/:id | Ensure provider scoping | Medium | Add provider ownership checks |
| /provider/orders | Orders | Provider Orders | list | orders | READY | commerce | /api/seller/orders (provider scope) | Ensure provider scoping | Medium | Add provider orders scope |
| /provider/inventory | Inventory | Provider Inventory | list | inventory | READY | sellers/inventory | /api/seller/inventory | Ensure provider scoping | Medium | Add provider inventory scope |
| /provider/profile | SettingsProfile | Provider Profile | edit | profile settings | READY | settings | /api/settings/profile | None | Low | Keep |
| /seller/reviews | SellerReviews | Reviews | insights | reviews list | READY | reviews | /api/reviews | None | Low | Keep |
| /reviews | SellerReviews | Reviews | insights | reviews list | READY | reviews | /api/reviews | None | Low | Keep |
| /healthmart/* | HealthMart pages | Channel Ops | list items/orders | channel data | PARTIAL | ops/commerce | /api/seller/orders?channel= | Missing channel-specific endpoints | Medium | Add /api/channels/:channel/* views |
| /edumart/items | EduItems | Channel Ops | list items | items list | PARTIAL | listings | /api/seller/listings?marketplace= | Missing item category filters | Medium | Add marketplace/category filters |
| /faithmart/items | FaithItems | Channel Ops | list items | items list | PARTIAL | listings | /api/seller/listings?marketplace= | Missing item category filters | Medium | Add marketplace/category filters |
| /inventory | Inventory | Ops | view | inventory list | READY | sellers/inventory | /api/seller/inventory | None | Low | Keep |
| /shipping | Shipping | Ops | manage | shipping profiles | READY | sellers/shipping | /api/seller/shipping-profiles | None | Low | Keep |
| /exports | Exports | Ops | export jobs | export jobs list | READY | ops | /api/seller/exports | None | Low | Keep |
| /disputes | DisputesSeller | Ops | disputes | disputes list | READY | commerce | /api/seller/disputes | None | Low | Keep |
| /seller/disputes | DisputesSeller | Ops | disputes | disputes list | READY | commerce | /api/seller/disputes | None | Low | Keep |
| /ops | OpsOverview | Ops | overview | ops summary | READY | ops | /api/ops/overview | None | Low | Keep |
| /ops/inventory | Inventory | Ops | inventory | inventory list | READY | ops | /api/ops/inventory | None | Low | Keep |
| /ops/shipping-profiles | Shipping | Ops | shipping | profiles | READY | ops | /api/ops/shipping | None | Low | Keep |
| /ops/shipping | Shipping | Ops | shipping | shipments | READY | ops | /api/ops/shipping | None | Low | Keep |
| /ops/warehouses | Warehouses | Ops | warehouses | warehouses list | READY | ops | /api/ops/warehouses | None | Low | Keep |
| /ops/returns | Returns | Ops | returns | returns list | READY | ops | /api/ops/exceptions?type=returns | Missing dedicated ops returns | Medium | Add /api/ops/returns |
| /ops/disputes | DisputesSeller | Ops | disputes | disputes list | READY | ops | /api/ops/exceptions?type=disputes | Missing dedicated ops disputes | Medium | Add /api/ops/disputes |
| /ops/exports | Exports | Ops | exports | export jobs | READY | ops | /api/ops/exports | None | Low | Keep |
| /ops/documents | DocumentsCenter | Ops | documents | docs list | READY | ops | /api/ops/documents | None | Low | Keep |
| /ops/compliance | ComplianceCenter | Ops | compliance | compliance items | READY | ops/regulatory | /api/ops/compliance | None | Low | Keep |
| /wallet | FinanceWallets | Finance | wallets | wallet list | READY | finance | /api/seller/finance/wallets | None | Low | Keep |
| /finance | FinanceHome | Finance | overview | summary | READY | finance | /api/seller/finance/wallets, holds, invoices | None | Low | Keep |
| /finance/wallets | FinanceWallets | Finance | wallets | wallet list | READY | finance | /api/seller/finance/wallets | None | Low | Keep |
| /finance/holds | FinanceHolds | Finance | holds | holds list | READY | finance | /api/seller/finance/holds | None | Low | Keep |
| /finance/invoices | FinanceInvoices | Finance | invoices | invoice list | READY | finance | /api/seller/finance/invoices | None | Low | Keep |
| /finance/statements | FinanceStatements | Finance | statements | statements list | READY | finance | /api/seller/finance/statements | None | Low | Keep |
| /finance/tax-reports | FinanceTaxReports | Finance | tax | tax reports | READY | finance | /api/seller/finance/tax-reports | None | Low | Keep |
| /analytics | Analytics | Analytics | dashboards | analytics data | READY | analytics | /api/analytics/* | None | Low | Keep |
| /messages | Messages | Messages | thread list, reply | threads/messages | READY | communications | /api/messages, /api/messages/:threadId | Realtime delivery | Medium | Add realtime delivery transport |
| /notifications | Notifications | Notifications | list, read | notifications | READY | notifications | /api/notifications | Realtime delivery | Medium | Add realtime delivery transport |
| /help-support | HelpSupport | Support | list tickets | tickets, KB/FAQ | READY | communications/support | /api/help-support/content, /api/help-support/tickets | None | Low | Keep |
| /support/* | HelpSupport | Support | list tickets | tickets, KB/FAQ | READY | communications/support | /api/help-support/content | None | Low | Keep |
| /contact/support | HelpSupport | Support | create ticket | ticket create | READY | communications/support | /api/help-support/tickets | None | Low | Keep |
| /search | GlobalSearch | Search | global search | search index | PARTIAL | discovery | /api/search | Missing endpoint | Medium | Add /api/search with index |
| /settings/profile | SettingsProfile | Settings | edit profile | settings | READY | settings | /api/settings | None | Low | Keep |
| /settings/team | SettingsTeam | Settings | manage team | roles/members | READY | settings | /api/roles, /api/roles/invites, /api/roles/members | None | Low | Keep |
| /settings/payout-methods | SettingsPayoutMethods | Settings | edit payout | payout methods | READY | settings | /api/settings/payout-methods | None | Low | Keep |
| /settings/preferences | SettingsPreferences | Settings | edit | preferences | READY | settings | /api/settings/preferences | None | Low | Keep |
| /settings/security | SettingsSecurity | Settings | edit | security settings | READY | settings | /api/settings/security | None | Low | Keep |
| /settings/security/sessions | SettingsSecuritySessions | Settings | revoke sessions | device list | PARTIAL | settings/auth | /api/settings/devices | Missing list sessions endpoint | Medium | Add /api/settings/devices |
| /settings/integrations | SettingsIntegrations | Settings | edit | integrations | READY | settings | /api/settings/integrations | None | Low | Keep |
| /settings/tax | SettingsTax | Settings | edit | tax data | READY | settings | /api/settings/tax | None | Low | Keep |
| /settings/kyc | SettingsKyc | Settings | edit | kyc data | READY | settings | /api/settings/kyc | None | Low | Keep |
| /settings/notification-preferences | SettingsNotificationPreferences | Settings | edit | notification prefs | READY | settings | /api/settings/notification-preferences | None | Low | Keep |
| /settings/saved-views | SettingsSavedViews | Settings | save views | saved views | READY | settings | /api/settings/saved-views | None | Low | Keep |
| /settings/audit | SettingsAuditLog | Settings | view audit | audit logs | READY | audit | /api/audit/events | None | Low | Keep |
| /settings/help | SettingsHelp | Settings | help | help content | READY | settings/support | /api/settings/help | None | Low | Keep |

------------------------------------------------------------------------------
2. Endpoint-by-Endpoint Backend Backlog
------------------------------------------------------------------------------

Format per endpoint:
- Module / Controller
- Existing endpoint? yes/no
- Action: keep/extend/add
- Method + Path
- Frontend routes using it
- Request DTO
- Response DTO
- Query params
- Auth + Role
- Validation rules
- Business logic + transitions
- Errors
- Async jobs/events
- Priority
- Definition of done

Auth
- AuthController: keep POST /api/auth/register, /api/auth/login, /api/auth/refresh, /api/auth/logout. DTOs exist. DoD: keep response stable, add device/session list for /settings/security/sessions (P1).
- AuthController: add GET /api/settings/devices (P1) for session list used in SettingsSecuritySessions.

Dashboard
- DashboardController: keep GET /api/dashboard/feed, /api/dashboard/summary, /api/dashboard/my-day (P0). Ensure filters and pagination.

Workflow/Onboarding
- WorkflowController: extend onboarding endpoints with step-level DTOs, approval metadata, and status history (P0). Add GET /api/onboarding/status, POST /api/onboarding/steps, POST /api/onboarding/submit.

Settings/Roles/Crew
- SettingsController: keep /api/settings/* and /api/roles/* (P0). Add GET /api/settings/devices list endpoint (P1). Ensure DTO validation (already added).

Listings/Taxonomy/Storefront
- SellerListingsController: keep /api/seller/listings, /api/seller/listings/:id (P0). Add bulk import endpoints /api/seller/listings/bulk/validate and /api/seller/listings/bulk/commit (P1).
- TaxonomyController: keep /api/taxonomy/* (P0).
- StorefrontController: keep /api/storefront/* (P0).
- CatalogController (new): add /api/catalog/templates, /api/catalog/media-library (P1).

Commerce (Orders/Returns/Disputes/Prints)
- CommerceController: keep /api/seller/orders, /api/seller/returns, /api/seller/disputes (P0).
- CommerceController: add /api/orders/:id/print/invoice, /api/orders/:id/print/packing-slip, /api/orders/:id/print/sticker (P1).

Wholesale
- WholesaleController: keep /api/wholesale/* (P0). Add /api/wholesale/templates if UI needs templates (P2).

Live
- LiveController: keep /api/live/* (P0). Add approval endpoints for campaign approvals if needed (P1).

Adz
- AdzController: keep /api/adz/* (P0). Add /api/adz/campaigns/:id/summary if promo pages need detailed breakdowns (P1).
- Add adz permission update endpoint for creator-permissions (P1).

Discovery/Marketplace
- DiscoveryController: keep /api/sellers, /api/my-sellers, /api/opportunities, /api/invites (P0).
- Add /api/my-creators for seller UX (P1).
- Add /api/search for GlobalSearch (P1).

Communications/Support
- CommunicationsController: keep /api/messages, /api/help-support/* (P0).
- Support staff endpoints already added; ensure status transitions and assignment (P0).
- Realtime delivery transport (P1 infra).

Finance
- FinanceController: keep /api/seller/finance/* and /api/finance/payouts actions (P0).
- Add reconciliation endpoints if UI needs settlement states (P2).

Ops/Regulatory/ExpressMart
- OpsController: keep /api/ops/* (P0). Add /api/ops/returns and /api/ops/disputes if needed (P1).
- RegulatoryController: keep /api/regulatory/* (P0).
- ExpressmartController: keep /api/expressmart/* (P0).

------------------------------------------------------------------------------
3. Prisma Schema Strengthening Backlog
------------------------------------------------------------------------------

Catalog Templates
- Add model CatalogTemplate (sellerId, name, kind, payload, status, createdAt, updatedAt).
- Add model CatalogMediaAsset (sellerId, mediaId, tags, category, createdAt).
- Indexes: sellerId, status, category.
- Used by: /catalog/templates, /catalog/media-library.
- Priority: P1.

Print Jobs
- Add model OrderPrintJob (orderId, type, status, requestedBy, createdAt, completedAt, metadata).
- Indexes: orderId, status.
- Used by: print routes.
- Priority: P1.

Onboarding Approval
- Extend WorkflowRecord or add OnboardingApproval (userId, role, status, decisionBy, reason, decidedAt).
- Used by onboarding review pages.
- Priority: P0.

Trust Center
- Add TrustContent, TrustIncident models.
- Used by /trust and /status-center.
- Priority: P1.

Search Index
- Add SearchIndex or use existing content tables + search view.
- Used by /search.
- Priority: P1.

Provider joint quotes
- Add ProviderJointQuote model + status enum.
- Used by /provider/joint-quotes.
- Priority: P1.

------------------------------------------------------------------------------
4. Service and Controller Implementation Plan
------------------------------------------------------------------------------

Modules:
- Settings: ensure device list endpoint and session revocation logic in SettingsService. Add audit events.
- Workflow: add onboarding status endpoints and approval metadata.
- Listings: add bulk import flow and background job.
- Catalog: new controller/service for templates/media.
- Commerce: add print endpoints with PrintJob creation.
- Discovery: add my-creators and search endpoints.
- Provider: add joint quote service + endpoints.
- Support: keep staff flows and add realtime publish on updates.
- Realtime: keep queue publishing; implement transport adapter when infra exists.
- Ops: add missing ops returns/disputes endpoints if needed.

Tests required:
- onboarding approval transitions, bulk import validation, print job creation, my-creators list, search query, trust content retrieval, provider joint quotes.

------------------------------------------------------------------------------
5. Workflow Completion Plan
------------------------------------------------------------------------------

Creator onboarding:
- Missing: approval metadata, status history, admin decisions.
- Add: OnboardingApproval model, endpoints for status + decision.

Seller/provider onboarding:
- Missing: role-specific validations and audit trails.
- Add: step-specific DTOs and approval metadata.

Opportunity lifecycle:
- Ensure save/unsave transitions and status tracking.

Invite/proposal/contract lifecycle:
- Ensure transitions and audit events remain consistent.

Order/return/dispute lifecycle:
- Ensure transitions and print job flows.

Wholesale RFQ lifecycle:
- Ensure quote transitions already enforced; add template support if UI requires.

Payout/settlement lifecycle:
- Add reconciliation metadata and batch payouts if needed by finance UI.

Support/escalation lifecycle:
- Already enforced; add SLA timers if required.

Live session lifecycle:
- Already enforced; add approval endpoints for campaign approvals.

Ad campaign lifecycle:
- Add promo summary endpoint and permission updates.

------------------------------------------------------------------------------
6. Frontend Mock -> Backend Replacement Plan
------------------------------------------------------------------------------

Replace in order:
1) Onboarding flows (/onboarding*, /seller/onboarding*, /provider/onboarding*) with workflow + approval endpoints.
2) Trust/status/market approvals (trust center, status center, market panel approvals).
3) Catalog templates and media library.
4) Print exports for orders.
5) Global search.
6) Provider joint quotes.
7) Realtime delivery for messages/notifications.

------------------------------------------------------------------------------
7. Phased Backend Completion Plan
------------------------------------------------------------------------------

Phase 1: Backend contract alignment
- Fix onboarding approval status, add devices list endpoint, add search endpoint.

Phase 2: Missing API coverage
- Catalog templates/media, print endpoints, joint quotes.

Phase 3: Schema and lifecycle completion
- Onboarding approval model, print job model, catalog models.

Phase 4: Realtime and async support
- Realtime transport, delivery tracking, job workers.

Phase 5: Production hardening
- Redis cache, worker deployment, tracing export, load testing.

------------------------------------------------------------------------------
8. Revised Completion Percentages
------------------------------------------------------------------------------

- Backend domain coverage: 89%
- Strict frontend contract parity: 84%
- Creator parity: 90%
- Seller parity: 88%
- Production readiness: 60%

After executing this plan (with infra):
- Backend parity: 98-100%
- Production readiness: 85-90%

