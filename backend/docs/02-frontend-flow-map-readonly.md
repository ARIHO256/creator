# 02 Frontend Flow Map (Read-only)

## Statement
**No frontend code was changed.**

## What was inspected
- Router map: `frontend/src/App.tsx`
- Auth/access gating: `frontend/src/utils/accessControl.ts`
- Shared state: `frontend/src/contexts/CreatorContext.tsx`
- Creator pages under `frontend/src/pages/creator/*`

## Observed frontend runtime pattern
- Current UI is mostly demo/local-state driven.
- Auth state uses `localStorage` flags (`creatorPlatformEntered`, `mldz_creator_approval_status`), not backend JWT yet.
- Very few direct HTTP calls were found in frontend code. Most pages include mock data comments like “wire to backend”.
- Backend contracts are therefore inferred from page behavior + route naming + legacy backend contract.

## Route-by-route map

| Route | Component | Purpose | Backend actions needed | API calls found in code | Required backend endpoints (proposed/expected) | Models |
|---|---|---|---|---|---|---|
| `/` | `CreatorPlatformLanding` | Public entry landing | Read public landing content | None | `GET /api/landing/content` | LandingContent, Seller highlights |
| `/auth`, `/auth-redirect` | `AuthRedirectHandler` | Post-auth redirect | Login/session bootstrap | No HTTP; localStorage now | `POST /api/auth/login`, `GET /api/me` | User, Session |
| `/onboarding` | `CreatorOnboardingV2` | Creator onboarding | Load/save/submit onboarding | None | `GET/PATCH /api/onboarding`, `POST /api/onboarding/submit` | OnboardingSubmission |
| `/account-approval` | `CreatorAwaitingApprovalPremium` | Approval status + resubmit | Read approval state; resubmit | None | `GET/PATCH /api/account-approval`, `POST /api/account-approval/resubmit` | ApprovalReview |
| `/home` | `CreatorLiveDealzFeedPage` | Main creator feed | Dashboard feed data | None | `GET /api/dashboard/feed` | Feed, LiveSession, Opportunity |
| `/shell` | `CreatorMyDayDashboardPage` | My Day command center | Agenda/tasks/proposals summary | None | `GET /api/dashboard/my-day` | Task, Proposal, Session |
| `/onboarding-wizard` | `CreatorOnboardingWizardPage` | Onboarding helper wizard | Partial onboarding updates | None | `GET/PATCH /api/onboarding` | OnboardingDraft |
| `/awaiting-approval` | `CreatorAwaitingApproval` | Legacy approval page | Approval polling | None | `GET /api/account-approval` | ApprovalReview |
| `/notifications` | `NotificationsPage` | Notifications inbox | List/mark read | None | `GET /api/notifications`, `PATCH /api/notifications/:id/read` | Notification |
| `/profile-public` | `CreatorPublicProfilePage` | Public creator profile preview | Read public profile by handle | None | `GET /api/public-profile/:handle` | CreatorProfile |
| `/opportunities` | `OpportunitiesBoardPage` | Opportunity marketplace board | List/filter/save opportunities | None | `GET /api/opportunities`, `POST /api/opportunities/:id/save` | Opportunity |
| `/dealz-marketplace` | `DealzMarketplace2` | Combined deal marketplace | Feed of live + ad deal cards | None | `GET /api/dealz-marketplace` | MarketplaceCard, Deal |
| `/live-dashboard-2` | `LiveDashboard2` | Live operations dashboard | List/create/update live sessions | None | `GET/POST/PATCH /api/live/sessions` | LiveSession |
| `/live-schedule` | `LiveScheduleCalendarPage` | Live schedule calendar | Session calendar + updates | None | `GET/PATCH /api/live/sessions/:id` | LiveSession |
| `/Crew-manager` | `CreatorLiveCrewCohostManagement` | Crew/co-host manager | Read/update crew assignments | None | `GET /api/crew`, `PATCH /api/crew/sessions/:id` | CrewAssignment |
| `/live-studio` | `LiveStudioPage` | Runtime live studio | Load studio; start/end; mark moments | None | `GET /api/live/studio/:id`, `POST /api/live/studio/:id/start`, `POST /api/live/studio/:id/end`, `POST /api/live/studio/:id/moments` | StudioState, Replay |
| `/reviews` | `CreatorReviewsDashboardPage` | Creator review dashboard | Reviews metrics | None | `GET /api/reviews/dashboard` | ReviewMetrics |
| `/live-history` | `LiveReplaysClipsPage` | Replays and clips | List/update/publish replays | None | `GET /api/live/replays`, `PATCH /api/live/replays/:id`, `POST /api/live/replays/:id/publish` | Replay |
| `/AdzDashboard` | `AdzDashboard` | Adz summary | Campaign and performance summaries | None | `GET /api/adz/campaigns`, `GET /api/adz/campaigns/:id/performance` | AdCampaign |
| `/AdzManager` | `AdzManager` | Ad campaign manager | Create/update campaigns | None | `POST /api/adz/campaigns`, `PATCH /api/adz/campaigns/:id` | AdCampaign |
| `/AdzMarketplace` | `AdzMarketplace` | Ad inventory marketplace | Ad marketplace cards | None | `GET /api/adz/marketplace` | AdMarketplaceCard |
| `/promo-ad-detail` | `PromoAdDetailPage` | Promo ad details | Fetch single promo/ad | None | `GET /api/promo-ads/:id` | PromoAd |
| `/earnings` | `EarningsDashboardPage` | Earnings view | Summary + payout history | None | `GET /api/earnings/summary`, `GET /api/earnings/payouts` | Earnings, Payout |
| `/analytics` | `AnalyticsRankDetailPage` | Analytics/rank view | Analytics overview | None | `GET /api/analytics/overview` | AnalyticsOverview |
| `/request-payout` | `RequestPayoutPage` | Request payout flow | Submit payout request | No backend call currently | `POST /api/earnings/payouts/request` | PayoutRequest |
| `/payout-history` | `PayoutHistoryPage` | Payout history list | Payout history read | None | `GET /api/earnings/payouts` | Payout |
| `/sellers` | `SellersDirectoryPage` | Seller directory | Seller listing + follow | None | `GET /api/sellers`, `POST /api/sellers/:id/follow` | Seller |
| `/my-sellers` | `MySellersPage` | Followed/collaborating sellers | Linked seller list | None | `GET /api/my-sellers` | SellerRelationship |
| `/invites` | `InvitesFromSellersPage` | Seller invites | List/respond invites | None | `GET /api/invites`, `POST /api/invites/:id/respond` | Invite |
| `/link-tools`, `/link-tool` | `CreatorLinksHubV3Fixed` | Tracked links hub | CRUD tracked links | None | `GET /api/links`, `POST /api/links`, `PATCH /api/links/:id` | TrackedLink |
| `/creator-campaigns` | `CampaignsBoardPage` | Campaign board | Pipeline rows | None | `GET /api/campaigns` or `GET /api/campaign-board` | CampaignBoardRow |
| `/proposals` | `ProposalsInboxPage` | Proposals inbox | List/create proposals | None | `GET /api/proposals`, `POST /api/proposals` | Proposal |
| `/proposal-room` | `ProposalNegotiationRoomPage` | Negotiation room | Read/update proposal, messages, transitions | None | `GET/PATCH /api/proposals/:id`, `POST /api/proposals/:id/messages`, `POST /api/proposals/:id/transition` | Proposal, Message |
| `/contracts` | `ContractsPage` | Contract management | List/details/termination request | None | `GET /api/contracts`, `GET /api/contracts/:id`, `POST /api/contracts/:id/terminate-request` | Contract |
| `/task-board` | `TaskBoardPage` | Deliverable task board | CRUD and comments | None | `GET/POST /api/tasks`, `PATCH /api/tasks/:id`, `POST /api/tasks/:id/comments`, `POST /api/tasks/:id/attachments` | Task |
| `/asset-library` | `AssetLibraryPage` | Asset workflow | Asset list/create/review | None | `GET/POST /api/assets`, `GET /api/assets/:id`, `PATCH /api/assets/:id/review` | Asset |
| `/audit-log` | `CreatorAuditLogPage` | Audit logs | Paginated audit rows | None | `GET /api/audit-logs` | AuditLog |
| `/settings` | `CreatorSettingsSafetyPage` | Account/settings/safety | Read/update settings, payout verify, devices | None | `GET/PATCH /api/settings`, payout/device endpoints | Settings |
| `/subscription` | `MySubscriptionPage` | Subscription plan management | Read/update subscription | None | `GET/PATCH /api/subscription` | Subscription |
| `/roles-permissions` | `CreatorRolesPermissionsPremium` | Roles & permissions UI | Roles CRUD/invites/members/security | None | `/api/roles*` endpoints | Role, Member, Invite |
| `/roles` | `RoleSwitcherPage` | Role switcher | Switch active role | None | `POST /api/auth/switch-role` | UserRole |
| `/audience-notification` | `AudienceNotifications` | Live audience notifications tool | Read/update tool config | None | `GET/PATCH /api/tools/audience-notifications` | ToolConfig |
| `/live-alert` | `LiveAlertsManager` | Live alert manager | Read/update live alerts | None | `GET/PATCH /api/tools/live-alerts` | ToolConfig |
| `/overlays-ctas` | `OverlaysCTAsPro` | Overlays/CTA tool | Read/update overlays | None | `GET/PATCH /api/tools/overlays` | ToolConfig |
| `/post-live` | `PostLivePublisherPage` | Post-live publishing | Read/update post-live config and replay publish | None | `GET/PATCH /api/tools/post-live`, replay publish endpoints | Replay, ToolConfig |
| `/Stream-platform` | `StreamToPlatformsPage` | Stream destinations | Read/update streaming config | None | `GET/PATCH /api/tools/streaming` | StreamingConfig |
| `/safety-moderation` | `SafetyModerationPage` | Safety/moderation controls | Read/update safety policy | None | `GET/PATCH /api/tools/safety` | SafetyConfig |

## Frontend-inferred contract gaps
- Most pages are currently local-state demos and do not call backend directly yet.
- Backend contracts are still necessary for production wiring and were inferred from:
  - route/component intent
  - comments in pages
  - prior backend API surface
- Notable explicit hint in deleted file comments:
  - `GET /api/creators/{creatorId}/onboarding-review`
  - `POST /api/creators/{creatorId}/resubmit-onboarding`

## Auth flow currently in frontend
- Current frontend gates are localStorage-based and can bypass real auth.
- Production target should switch these gates to backend-authenticated state using:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/refresh`
  - `GET /api/me` or `GET /api/auth/me`
