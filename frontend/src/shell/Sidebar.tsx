
import React from "react";
import type { PageId } from "../layouts/CreatorShellLayout";
import { getNavBadge } from "./navigationBadges";
import { useWorkspaceAccess } from "../hooks/useWorkspaceAccess";

type SidebarProps = {
  activePage: PageId;
  onChangePage: (page: PageId) => void;
  onLogout: () => void;
};

type NavItem = {
  id: PageId | "go-live";
  label: string;
  icon: string;
  badge?: number;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { id: "home", label: "LiveDealz Feed", icon: "🏠" },
      { id: "shell", label: "My Day", icon: "✅" },
      { id: "dealz-marketplace", label: "Dealz Marketplace", icon: "💰" }
    ]
  },
  {
    title: "Live Sessionz",
    items: [
      { id: "live-dashboard-2", label: "Live Dashboard", icon: "🎥" },
      { id: "live-schedule", label: "Live Schedule", icon: "📅" },
      { id: "live-studio", label: "Live Studio", icon: "📹" },
      { id: "reviews", label: "Reviews", icon: "⭐" },
      { id: "live-history", label: "Replays & Clips", icon: "🎬" }
    ]
  },
  {
    title: "Shoppable Adz",
    items: [
      { id: "AdzDashboard", label: "Adz Dashboard", icon: "📢" },
      { id: "AdzMarketplace", label: "Adz Marketplace", icon: "🔍" },
      { id: "AdzManager", label: "Adz Manager", icon: "📊" }
    ]
  },
  {
    title: "Money & Insights",
    items: [
      { id: "earnings", label: "Earnings Dashboard", icon: "💰" },
      { id: "analytics", label: "Analytics & Rank", icon: "📈" }
    ]
  },
  {
    title: "Opportunities",
    items: [
      { id: "opportunities", label: "Opportunities Board", icon: "📣" },
      { id: "sellers", label: "Suppliers Directory", icon: "🧩" },
      { id: "my-sellers", label: "My Suppliers", icon: "⭐" },
      { id: "invites", label: "Invites from Suppliers", icon: "📨" },
      { id: "link-tools", label: "Links Hub", icon: "🔗" }
    ]
  },
  {
    title: "Collab Flows",
    items: [
      { id: "creator-campaigns", label: "Campaigns Board", icon: "📊" },
      { id: "proposals", label: "Proposals Inbox", icon: "📄" },
      { id: "contracts", label: "Contracts", icon: "📑" }
    ]
  },
  {
    title: "Deliverables",
    items: [
      { id: "task-board", label: "Task Board", icon: "✅" },
      { id: "asset-library", label: "Asset Library", icon: "🗂️" }
    ]
  },
  {
    title: "Team",
    items: [
      { id: "crew-manager", label: "Crew Manager", icon: "👥" },
      { id: "roles-permissions", label: "Roles & Permissions", icon: "🛡️" }
    ]
  },
  {
    title: "Settings",
    items: [
      { id: "settings", label: "Creator Settings", icon: "⚙️" },
      { id: "subscription", label: "My Subscription", icon: "💎" },
      { id: "audit-log", label: "Audit Log", icon: "📄" },
      { id: "roles", label: "Role Switcher", icon: "🔁" }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onChangePage, onLogout: _onLogout }) => {
  const reviewsAccess = useWorkspaceAccess("reviews.view");
  const subscriptionAccess = useWorkspaceAccess("subscription.view");
  const auditAccess = useWorkspaceAccess("admin.audit");
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const filteredSections = React.useMemo(() => {
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.id === "reviews") return reviewsAccess.allowed;
          if (item.id === "subscription") return subscriptionAccess.allowed;
          if (item.id === "audit-log") return auditAccess.allowed;
          return true;
        })
      }))
      .filter((section) => section.items.length > 0);
  }, [auditAccess.allowed, reviewsAccess.allowed, subscriptionAccess.allowed]);

  React.useEffect(() => {
    // With remounting fixed in App.tsx, the sidebar naturally preserves scroll.
    // We only scroll active into view if it might be hidden, using 'nearest'.
    if (sidebarRef.current) {
      const activeItem = sidebarRef.current.querySelector('[data-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activePage]);

  return (
    <aside
      ref={sidebarRef}
      className="hidden xl:flex fixed left-0 top-[calc(3.5rem+2.5rem)] flex-col w-80 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto overflow-x-hidden py-4 text-sm transition-colors h-[calc(100vh-3.5rem-2.5rem)]"
    >
      {filteredSections.map((section) => (
        <div key={section.title} className="mb-4">
          <div className="px-4 mb-1 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
            {section.title}
          </div>
          {section.items.map((item) => {
            const id = item.id === "go-live" ? "live-studio" : (item.id as PageId);
            const isActive = id === activePage;
            const showLiveDot = id === "live-studio" && activePage === "live-studio";
            const badge = getNavBadge(id);
            return (
              <button
                key={item.id}
                onClick={() => onChangePage(id)}
                data-active={isActive ? "true" : "false"}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left mb-1 text-sm transition-colors ${isActive
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-slate-900 dark:text-slate-100 rounded-full"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="flex items-center gap-1">
                    {item.label}
                    {showLiveDot && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </span>
                </span>
                {badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-900 dark:bg-slate-600 text-white dark:text-slate-100">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
};
