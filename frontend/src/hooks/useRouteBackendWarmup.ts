import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { backendApi } from "../lib/api";

const REFRESH_WINDOW_MS = 30_000;
const endpointCache = new Map<string, number>();

const ROUTE_ENDPOINTS: Record<string, string[]> = {
  dashboard: ["/api/dashboard/feed"],
  home: ["/api/dashboard/feed", "/api/dashboard/my-day", "/api/notifications"],
  shell: ["/api/dashboard/my-day"],
  onboarding: ["/api/onboarding"],
  "onboarding-wizard": ["/api/onboarding"],
  "account-approval": ["/api/account-approval"],
  "awaiting-approval": ["/api/account-approval"],
  notifications: ["/api/notifications"],
  "profile-public": ["/api/creators/me/profile"],

  opportunities: ["/api/opportunities"],
  sellers: ["/api/sellers"],
  "my-sellers": ["/api/my-sellers"],
  invites: ["/api/invites"],
  "dealz-marketplace": ["/api/dealz-marketplace"],
  "link-tools": ["/api/links"],
  "link-tool": ["/api/links"],

  "creator-campaigns": ["/api/campaigns"],
  proposals: ["/api/proposals"],
  "proposal-room": ["/api/proposals"],
  contracts: ["/api/contracts"],
  "task-board": ["/api/tasks"],
  "asset-library": ["/api/assets"],

  "live-dashboard-2": ["/api/live/sessions", "/api/live/studio/default"],
  "live-schedule": ["/api/live/sessions"],
  "Crew-manager": ["/api/crew"],
  "live-studio": ["/api/live/studio/default"],
  "live-history": ["/api/live/replays"],
  reviews: ["/api/reviews/dashboard"],

  AdzDashboard: ["/api/adz/campaigns"],
  AdzManager: ["/api/adz/campaigns", "/api/adz/marketplace"],
  AdzMarketplace: ["/api/adz/marketplace"],
  "promo-ad-detail": ["/api/adz/campaigns"],

  earnings: ["/api/earnings/summary", "/api/earnings/payouts"],
  analytics: ["/api/analytics/overview"],
  "request-payout": ["/api/earnings/summary"],
  "payout-history": ["/api/earnings/payouts"],

  settings: ["/api/settings", "/api/notifications"],
  subscription: ["/api/subscription"],
  "roles-permissions": ["/api/roles"],
  roles: ["/api/roles"],
  "audit-log": ["/api/audit-logs"],

  "audience-notification": ["/api/tools/audience-notifications"],
  "live-alert": ["/api/tools/live-alerts"],
  "overlays-ctas": ["/api/tools/overlays"],
  "post-live": ["/api/tools/post-live"],
  "Stream-platform": ["/api/tools/streaming"],
  "safety-moderation": ["/api/tools/safety"]
};

const shouldFetch = (endpoint: string, now: number) => {
  const last = endpointCache.get(endpoint) ?? 0;
  return now - last >= REFRESH_WINDOW_MS;
};

export function useRouteBackendWarmup(enabled = true) {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;

    const segments = location.pathname.split("/").filter(Boolean);
    const activeRoute = segments[segments.length - 1] || "home";
    const endpoints = ROUTE_ENDPOINTS[activeRoute];

    if (!endpoints?.length) {
      return;
    }

    const now = Date.now();
    const targets = endpoints.filter((endpoint) => shouldFetch(endpoint, now));
    if (!targets.length) {
      return;
    }

    targets.forEach((endpoint) => endpointCache.set(endpoint, now));
    void Promise.all(targets.map((endpoint) => backendApi.prefetch(endpoint).catch(() => undefined)));
  }, [enabled, location.pathname]);
}
