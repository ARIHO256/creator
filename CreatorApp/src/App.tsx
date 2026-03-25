import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { CreatorShellLayout } from "./layouts/CreatorShellLayout";
import CreatorPlatformLanding from "./pages/creator/creator_platform_landing_v_3_4 (2)";
import { CreatorProvider } from "./contexts/CreatorContext";
import { AppThemeProvider } from "./contexts/ThemeContext";
import { getUserStatus, getLandingPageTarget, hasPermission } from "./utils/accessControl";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { NotificationProvider } from "./contexts/NotificationContext";
import { authApi } from "./lib/authApi";
import { ApiError } from "./lib/api";
import {
  AUTH_INVALIDATED_EVENT,
  clearAuthSession,
  getPostAuthPath,
  hasStoredAuthState,
  persistAuthSession,
  readAuthSession
} from "./lib/authSession";


// Page Imports
import { CreatorLiveDealzFeedPage } from "./pages/creator/CreatorLiveDealzFeedPage";
import CreatorOnboardingV2 from "./pages/creator/creator_onboarding_v_2";
import CreatorAwaitingApprovalPremium from "./pages/creator/creator_awaiting_admin_approval_premium";
import CreatorAuthRedirectNotice from "./pages/creator/creator_sign_in_redirect_notice_evzone_my_accounts (1)";
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

import AudienceNotifications from "./pages/creator/AudienceNotifications_updated";
import LiveAlertsManager from "./pages/creator/LiveAlertsManager";
import OverlaysCTAsPro from "./pages/creator/OverlaysCTAsPro";
import PostLivePublisherPage from "./pages/creator/PostLivePublisher";
import SafetyModerationPage from "./pages/creator/SafetyModeration";
import StreamToPlatformsPage from "./pages/creator/StreamToPlatforms";
import CreatorAuditLogPage from "./pages/creator/CreatorAuditLogPage";
import MySubscriptionPage from "./pages/creator/MySubscriptionPage";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const status = getUserStatus();

  if (status === "GUEST") {
    return <Navigate to="/" replace />;
  }

  // If they are authenticated but awaiting approval,
  // and they are not already on the approval page, redirect them.
  // Note: App.tsx routes for onboarding and account-approval 
  // are already handled or will be handled by this logic if we are careful.

  const currentPath = window.location.pathname;

  if (status === "AWAITING_APPROVAL" && currentPath !== "/account-approval") {
    return <Navigate to="/account-approval" replace />;
  }

  if (status === "NEEDS_ONBOARDING" && currentPath !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Role-based access control
  if (currentPath.startsWith("/reviews") && !hasPermission("reviews.view")) {
    return <Navigate to="/home" replace />;
  }
  if (currentPath.startsWith("/subscription") && !hasPermission("subscription.view")) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

const AuthRedirectHandler = () => {
  const [targetPath, setTargetPath] = useState<string | null>(null);

  useEffect(() => {
    const target = getLandingPageTarget("/home");

    if (target.startsWith("http")) {
      window.location.href = target;
      return;
    }

    void authApi.me()
      .then((session) => {
        persistAuthSession(session);
        setTargetPath(getPostAuthPath(session));
      })
      .catch((error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearAuthSession();
          setTargetPath("/auth-redirect");
          return;
        }

        const storedSession = readAuthSession();
        if (storedSession) {
          setTargetPath(getPostAuthPath(storedSession));
          return;
        }

        setTargetPath("/auth-redirect");
      });
  }, []);

  if (!targetPath) {
    return null;
  }

  return <Navigate to={targetPath} replace />;
};

let authBootstrapPromise: Promise<void> | null = null;

function ensureStoredAuthSession() {
  if (!hasStoredAuthState()) {
    return Promise.resolve();
  }

  if (!authBootstrapPromise) {
    authBootstrapPromise = authApi
      .me()
      .then((session) => {
        persistAuthSession(session);
      })
      .catch((error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearAuthSession();
          return;
        }

        if (!readAuthSession()) {
          clearAuthSession();
        }
      })
      .finally(() => {
        authBootstrapPromise = null;
      });
  }

  return authBootstrapPromise;
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const handleNavigate = (page: string) => navigate(page);
  const [authReady, setAuthReady] = useState(() => !hasStoredAuthState());

  useEffect(() => {
    let cancelled = false;

    if (!hasStoredAuthState()) {
      setAuthReady(true);
      return;
    }

    void ensureStoredAuthSession().finally(() => {
      if (!cancelled) {
        setAuthReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleInvalidated = () => {
      clearAuthSession();
      navigate("/", { replace: true });
    };

    window.addEventListener(AUTH_INVALIDATED_EVENT, handleInvalidated);
    return () => {
      window.removeEventListener(AUTH_INVALIDATED_EVENT, handleInvalidated);
    };
  }, [navigate]);

  const handleLogout = () => {
    void authApi.logout().catch(() => undefined).finally(() => {
      clearAuthSession();
      window.location.href = "/";
    });
  };

  if (!authReady) {
    return null;
  }

  return (
    <AppThemeProvider>
      <NotificationProvider>
        <GlobalErrorBoundary>
          <CreatorProvider>
            <Routes>
              {/* Public Routes */}
              <Route index element={<CreatorPlatformLanding onEnter={() => { }} />} />
              {/* Auth notice page: Sign In / Sign Up via EVzone My Accounts */}
              <Route path="auth-redirect" element={<CreatorAuthRedirectNotice />} />
              {/* Internal: callback from EVzone OAuth – auto-completes login */}
              <Route path="auth" element={<AuthRedirectHandler />} />

              {/* Global Protected Standalone Routes (Outside Shell) */}
              <Route
                element={
                  <ProtectedRoute>
                    <React.Fragment>
                      <Routes>
                        <Route path="onboarding" element={<CreatorOnboardingV2 />} />
                        <Route path="account-approval" element={<CreatorAwaitingApprovalPremium />} />
                      </Routes>
                    </React.Fragment>
                  </ProtectedRoute>
                }
              />
              {/* Helper routes for the above if not using nested routes correctly */}
              <Route path="onboarding" element={<ProtectedRoute><CreatorOnboardingV2 /></ProtectedRoute>} />
              <Route path="account-approval" element={<ProtectedRoute><CreatorAwaitingApprovalPremium /></ProtectedRoute>} />

              {/* Protected Dashboard Routes - Inside Shell */}
              <Route
                element={
                  <ProtectedRoute>
                    <CreatorShellLayout onLogout={handleLogout} />
                  </ProtectedRoute>
                }
              >
                {/* Default Redirect from dashboard or root to home if authenticated */}
                <Route path="dashboard" element={<Navigate to="/home" replace />} />
                <Route path="dashboard/*" element={<Navigate to="/home" replace />} />

                {/* Core Pages */}
                <Route path="home" element={<CreatorLiveDealzFeedPage />} />
                <Route path="shell" element={<CreatorMyDayDashboardPage />} /> {/* My Day */}
                <Route path="onboarding-wizard" element={<CreatorOnboardingWizardPage />} />
                <Route path="awaiting-approval" element={<CreatorAwaitingApproval />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile-public" element={<CreatorPublicProfilePage />} />

                {/* Overview */}
                <Route path="opportunities" element={<OpportunitiesBoardPage />} />
                <Route path="dealz-marketplace" element={<DealzMarketplace2 />} />

                {/* Live Sessionz */}
                <Route path="live-dashboard-2" element={<LiveDashboard2 />} />
                <Route path="live-schedule" element={<LiveScheduleCalendarPage />} />
                <Route path="Crew-manager" element={<CreatorLiveCrewCohostManagement />} />
                <Route path="live-studio" element={<LiveStudioPage />} />
                <Route path="reviews" element={<CreatorReviewsDashboardPage />} />
                <Route path="live-history" element={<LiveReplaysClipsPage />} />

                {/* Shoppable Adz */}
                <Route path="AdzDashboard" element={<AdzDashboard />} />
                <Route path="AdzManager" element={<AdzManager />} />
                <Route path="AdzMarketplace" element={<AdzMarketplace />} />
                <Route path="promo-ad-detail" element={<PromoAdDetailPage />} />

                {/* Money & Insights */}
                <Route path="earnings" element={<EarningsDashboardPage />} />
                <Route path="analytics" element={<AnalyticsRankDetailPage />} />
                <Route path="request-payout" element={<RequestPayoutPage />} />
                <Route path="payout-history" element={<PayoutHistoryPage />} />

                {/* Opportunities / Links */}
                <Route path="sellers" element={<SellersDirectoryPage onChangePage={handleNavigate} />} />
                <Route path="my-sellers" element={<MySellersPage />} />
                <Route path="invites" element={<InvitesFromSellersPage />} />
                <Route path="link-tools" element={<CreatorLinksHubV3Fixed />} />
                <Route path="link-tool" element={<CreatorLinksHubV3Fixed initialOpenNewLinkDrawer />} />

                {/* Collab Flows */}
                <Route path="creator-campaigns" element={<CampaignsBoardPage />} />
                <Route path="proposals" element={<ProposalsInboxPage />} />
                <Route path="proposal-room" element={<ProposalNegotiationRoomPage />} />
                <Route path="contracts" element={<ContractsPage />} />

                {/* Deliverables */}
                <Route path="task-board" element={<TaskBoardPage />} />
                <Route path="asset-library" element={<AssetLibraryPage />} />
                <Route path="audit-log" element={<CreatorAuditLogPage />} />

                {/* Settings */}
                <Route path="settings" element={<CreatorSettingsSafetyPage />} />
                <Route path="subscription" element={<MySubscriptionPage />} />
                <Route path="roles-permissions" element={<CreatorRolesPermissionsPremium />} />
                <Route path="roles" element={<RoleSwitcherPage onChangePage={handleNavigate} />} />

                {/* new pages */}
                <Route path="audience-notification" element={<AudienceNotifications />} />
                <Route path="live-alert" element={<LiveAlertsManager />} />
                <Route path="overlays-ctas" element={<OverlaysCTAsPro />} />
                <Route path="post-live" element={<PostLivePublisherPage />} />
                <Route path="Stream-platform" element={<StreamToPlatformsPage />} />
                <Route path="safety-moderation" element={<SafetyModerationPage />} />

              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Routes>
          </CreatorProvider>
        </GlobalErrorBoundary>
      </NotificationProvider>
    </AppThemeProvider>
  );
};

export default App;
