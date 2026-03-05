import React from "react";
import { PageHeader } from "../components/PageHeader";
import type { PageId } from "../layouts/CreatorShellLayout";

type GenericPlaceholderProps = {
  pageId: PageId;
};

export const GenericPlaceholder: React.FC<GenericPlaceholderProps> = ({ pageId }) => {
  const labelMap: Record<PageId, string> = {
    home: "LiveDealz Feed",
    onboarding: "Creator Onboarding",
    "awaiting-approval": "Awaiting Approval",
    "profile-public": "Public Creator Profile",
    shell: "My Day Dashboard",
    opportunities: "Opportunities Board",
    "live-schedule": "Live Schedule & Calendar",
    "live-studio": "Creator Live Studio",
    reviews: "Creator Reviews",
    "live-history": "Replays & Clips Library",
    sellers: "Suppliers Directory",
    "my-sellers": "My Suppliers",
    invites: "Invites from Suppliers",
    "creator-campaigns": "Campaigns Board",
    proposals: "Proposals Inbox",
    "proposal-room": "Proposal & Negotiation Room",
    contracts: "My Contracts",
    "task-board": "Task Board",
    "asset-library": "Asset Library",
    "content-submission": "Content Submission & Review",
    AdzDashboard: "Adz Dashboard",
    AdzManager: "Adz Manager",
    AdzMarketplace: "Adz Marketplace",
    "promo-ad-detail": "Promo Ad Detail",
    "dealz-marketplace": "Dealz Marketplace",
    "live-dashboard-2": "Live Dashboard",
    "link-tools": "Link Tools",
    "link-tool": "New Link Tool",
    "link-editor": "Link Editor",
    earnings: "Earnings Dashboard",
    analytics: "Analytics & Rank Detail",
    settings: "Creator Settings & Safety",
    subscription: "My Subscription",
    roles: "Role Switcher",
    "payout-methods": "Payout Methods",
    "payout-history": "Payout History",
    "request-payout": "Request Payout",
    "crew-manager": "Crew Manager",
    "roles-permissions": "Roles & Permissions",
    "audience-notification": "Audience Notifications",
    "live-alert": "Live Alerts Manager",
    "overlays-ctas": "Overlays & CTAs",
    "post-live": "Post-Live Actions",
    "stream-platform": "Stream Platform Settings",
    "safety-moderation": "Safety & Moderation",
    "audit-log": "Creator Audit Log"
  };

  const label = labelMap[pageId] || pageId;

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader pageTitle={label} />

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 text-center gap-6">
        <div className="relative">
          <div className="h-32 w-32 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-6xl shadow-inner animate-pulse">
            ✨
          </div>
          <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-[#f77f00] text-white flex items-center justify-center text-xl shadow-lg border-4 border-white dark:border-slate-950">
            ⏳
          </div>
        </div>

        <div className="max-w-md space-y-3">
          <h2 className="text-2xl font-bold dark:text-slate-100">
            {label} is almost ready!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            We're putting the finishing touches on this experience to ensure everything is perfect. Check back soon for the full launch!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={() => window.history.back()}
            className="px-8 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            Go Back
          </button>
          <button
            onClick={() => (window as unknown as { __antigravity_onChangePage?: (page: string) => void }).__antigravity_onChangePage?.("home")}
            className="px-8 py-3 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            Return to Home
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Fast Performance</span>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-2">
            <span className="text-2xl">🔒</span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Secure & Reliable</span>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Premium Design</span>
          </div>
        </div>
      </main>
    </div>
  );
};
