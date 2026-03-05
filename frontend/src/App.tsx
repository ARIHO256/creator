import React, { useCallback } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { CreatorShellLayout } from "./layouts/CreatorShellLayout";
import CreatorPlatformLanding from "./pages/creator/creator_platform_landing_v_3_4 (2)";
import { CreatorProvider } from "./contexts/CreatorContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppThemeProvider } from "./contexts/ThemeContext";
import { getLandingPageTarget } from "./utils/accessControl";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { NotificationProvider } from "./contexts/NotificationContext";

// Page Imports
import { CreatorLiveDealzFeedPage } from "./pages/creator/CreatorLiveDealzFeedPage";
import CreatorOnboardingV2 from "./pages/creator/creator_onboarding_v_2";
import CreatorAwaitingApprovalPremium from "./pages/creator/creator_awaiting_admin_approval_premium";
import { CreatorOnboardingWizardPage } from "./pages/creator/CreatorOnboardingWizardPage";
import NotificationsPage from "./pages/creator/NotificationsPage";
import { CreatorPublicProfilePage } from "./pages/creator/CreatorPublicProfilePage";
import { CreatorMyDayDashboardPage } from "./pages/creator/CreatorMyDayDashboardPage";
import { OpportunitiesBoardPage } from "./pages/creator/OpportunitiesBoardPage";
import { SellersDirectoryPage } from "./pages/creator/SellersDirectoryPage";
import { ProposalsInboxPage } from "./pages/creator/ProposalsInboxPage";
import { CampaignsBoardPage } from "./pages/creator/CampaignsBoardPage";
import { MySellersPage } from "./pages/creator/MySellersPage";
import { InvitesFromSellersPage } from "./pages/creator/InvitesFromSellersPage";
import { ProposalNegotiationRoomPage } from "./pages/creator/ProposalNegotiationRoomPage";
import { ContractsPage } from "./pages/creator/ContractsPage";
import { TaskBoardPage } from "./pages/creator/TaskBoardPage";
import AssetLibraryPage from "./pages/creator/AssetLibraryPage";
import { LiveScheduleCalendarPage } from "./pages/creator/LiveScheduleCalendarPage";
import { LiveStudioPage } from "./pages/creator/LiveStudioPage";
import { LiveReplaysClipsPage } from "./pages/creator/LiveReplaysClipsPage";
import CreatorReviewsDashboardPage from "./pages/creator/Reviews2";
import { EarningsDashboardPage } from "./pages/creator/EarningsDashboardPage";
import AnalyticsRankDetailPage from "./pages/creator/AnalyticsRankDetailPage";
import CreatorSettingsSafetyPage from "./pages/creator/CreatorSettingsSafetyPage";
import AdzDashboard from "./pages/creator/AdzDashboard";
import { PromoAdDetailPage } from "./pages/creator/PromoAdDetailPage";
import CreatorAwaitingApproval from "./pages/creator/creator_awaiting_approval";
import AdzMarketplace from "./pages/creator/AdzMarketplace";
import AdzManager from "./pages/creator/AdzManager";
import CreatorLiveCrewCohostManagement from "./pages/creator/Crew Manager (Updated)";
import CreatorLinksHubV3Fixed from "./pages/creator/CreatorLinkHub";
import { PayoutHistoryPage } from "./pages/creator/PayoutHistoryPage";
import { RequestPayoutPage } from "./pages/creator/RequestPayoutPage";
import { RoleSwitcherPage } from "./shell/RoleSwitcherPage";
import CreatorRolesPermissionsPremium from "./pages/creator/Roles Permissions_Creator";
import DealzMarketplace2 from "./pages/creator/DealzMarketplace2";
import LiveDashboard2 from "./pages/creator/LiveDashboard2";
import LiveBuilderPage from "./pages/creator/LiveBuilder2";
import AdBuilder from "./pages/creator/AdBuilder";
import AudienceNotifications from "./pages/creator/AudienceNotifications_updated";
import LiveAlertsManager from "./pages/creator/LiveAlertsManager";
import OverlaysCTAsPro from "./pages/creator/OverlaysCTAsPro";
import PostLivePublisherPage from "./pages/creator/PostLivePublisher";
import SafetyModerationPage from "./pages/creator/SafetyModeration";
import StreamToPlatformsPage from "./pages/creator/StreamToPlatforms";
import CreatorAuditLogPage from "./pages/creator/CreatorAuditLogPage";
import MySubscriptionPage from "./pages/creator/MySubscriptionPage";

function AuthBootScreen(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 shadow-sm flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-evz-orange animate-pulse" />
        <div>
          <div className="font-semibold text-sm">Preparing your creator workspace</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Connecting the frontend to the MyLiveDealz backend session.</div>
        </div>
      </div>
    </div>
  );
}

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isReady, isAuthenticated, isPendingLegacyBridge, userStatus } = useAuth();

  if (!isReady || isPendingLegacyBridge) {
    return <AuthBootScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const currentPath = window.location.pathname;

  if (userStatus === "AWAITING_APPROVAL" && currentPath !== "/account-approval") {
    return <Navigate to="/account-approval" replace />;
  }

  if (userStatus === "NEEDS_ONBOARDING" && currentPath !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

const AuthRedirectHandler = () => {
  const target = getLandingPageTarget("/home");

  if (target.startsWith("http")) {
    window.location.href = target;
    return null;
  }

  localStorage.setItem("creatorPlatformEntered", "true");
  localStorage.setItem("mldz_creator_approval_status", "Approved");

  return <Navigate to={target} replace />;
};

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleNavigate = useCallback((page: string) => navigate(page), [navigate]);
  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = "/";
  }, [logout]);

  return (
    <Routes>
      <Route index element={<CreatorPlatformLanding onEnter={() => undefined} />} />
      <Route path="auth-redirect" element={<AuthRedirectHandler />} />
      <Route path="auth" element={<AuthRedirectHandler />} />

      <Route
        path="onboarding"
        element={
          <ProtectedRoute>
            <CreatorOnboardingV2 />
          </ProtectedRoute>
        }
      />
      <Route
        path="account-approval"
        element={
          <ProtectedRoute>
            <CreatorAwaitingApprovalPremium />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <CreatorShellLayout onLogout={() => void handleLogout()} />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Navigate to="/home" replace />} />
        <Route path="dashboard/*" element={<Navigate to="/home" replace />} />

        <Route path="home" element={<CreatorLiveDealzFeedPage />} />
        <Route path="shell" element={<CreatorMyDayDashboardPage />} />
        <Route path="onboarding-wizard" element={<CreatorOnboardingWizardPage />} />
        <Route path="awaiting-approval" element={<CreatorAwaitingApproval />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile-public" element={<CreatorPublicProfilePage />} />

        <Route path="opportunities" element={<OpportunitiesBoardPage />} />
        <Route path="dealz-marketplace" element={<DealzMarketplace2 />} />

        <Route path="live-dashboard-2" element={<LiveDashboard2 />} />
        <Route path="live-builder" element={<LiveBuilderPage />} />
        <Route path="live-schedule" element={<LiveScheduleCalendarPage />} />
        <Route path="Crew-manager" element={<CreatorLiveCrewCohostManagement />} />
        <Route path="live-studio" element={<LiveStudioPage />} />
        <Route path="reviews" element={<CreatorReviewsDashboardPage />} />
        <Route path="live-history" element={<LiveReplaysClipsPage />} />

        <Route path="AdzDashboard" element={<AdzDashboard />} />
        <Route path="ad-builder" element={<AdBuilder />} />
        <Route path="AdzManager" element={<AdzManager />} />
        <Route path="AdzMarketplace" element={<AdzMarketplace />} />
        <Route path="promo-ad-detail" element={<PromoAdDetailPage />} />

        <Route path="earnings" element={<EarningsDashboardPage />} />
        <Route path="analytics" element={<AnalyticsRankDetailPage />} />
        <Route path="request-payout" element={<RequestPayoutPage />} />
        <Route path="payout-history" element={<PayoutHistoryPage />} />

        <Route path="sellers" element={<SellersDirectoryPage onChangePage={handleNavigate} />} />
        <Route path="my-sellers" element={<MySellersPage />} />
        <Route path="invites" element={<InvitesFromSellersPage />} />
        <Route path="link-tools" element={<CreatorLinksHubV3Fixed />} />
        <Route path="link-tool" element={<CreatorLinksHubV3Fixed initialOpenNewLinkDrawer />} />

        <Route path="creator-campaigns" element={<CampaignsBoardPage />} />
        <Route path="proposals" element={<ProposalsInboxPage />} />
        <Route path="proposal-room" element={<ProposalNegotiationRoomPage />} />
        <Route path="contracts" element={<ContractsPage />} />

        <Route path="task-board" element={<TaskBoardPage />} />
        <Route path="asset-library" element={<AssetLibraryPage />} />
        <Route path="audit-log" element={<CreatorAuditLogPage />} />

        <Route path="settings" element={<CreatorSettingsSafetyPage />} />
        <Route path="subscription" element={<MySubscriptionPage />} />
        <Route path="roles-permissions" element={<CreatorRolesPermissionsPremium />} />
        <Route path="roles" element={<RoleSwitcherPage onChangePage={handleNavigate} />} />

        <Route path="audience-notification" element={<AudienceNotifications />} />
        <Route path="live-alert" element={<LiveAlertsManager />} />
        <Route path="overlays-ctas" element={<OverlaysCTAsPro />} />
        <Route path="post-live" element={<PostLivePublisherPage />} />
        <Route path="Stream-platform" element={<StreamToPlatformsPage />} />
        <Route path="safety-moderation" element={<SafetyModerationPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppThemeProvider>
      <NotificationProvider>
        <GlobalErrorBoundary>
          <AuthProvider>
            <CreatorProvider>
              <AppRoutes />
            </CreatorProvider>
          </AuthProvider>
        </GlobalErrorBoundary>
      </NotificationProvider>
    </AppThemeProvider>
  );
};

export default App;
