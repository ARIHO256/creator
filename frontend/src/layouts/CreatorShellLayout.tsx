import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { MoneyBar } from "../shell/MoneyBar";
import { TopBar } from "../shell/TopBar";
import { Sidebar } from "../shell/Sidebar";
import { FooterNav } from "../shell/FooterNav";
import { CommandPalette } from "../shell/CommandPalette";
import { EarningsPanel } from "../shell/EarningsPanel";
import { MobileMenu } from "../shell/MobileMenu";
// import { GenericPlaceholder } from "../shell/GenericPlaceholder";

// Type definition for PageId to keep type safety in navigation maps
export type PageId =
  | "home"
  | "onboarding"
  | "awaiting-approval"
  | "profile-public"
  | "shell"
  | "opportunities"
  | "live-schedule"
  | "live-studio"
  | "reviews"
  | "live-history"
  | "sellers"
  | "my-sellers"
  | "invites"
  | "creator-campaigns"
  | "proposals"
  | "proposal-room"
  | "contracts"
  | "task-board"
  | "asset-library"
  | "content-submission"
  | "earnings"
  | "analytics"
  | "settings"
  | "subscription"
  | "AdzDashboard"
  | "AdzManager"
  | "AdzMarketplace"
  | "link-tools"
  | "link-tool"
  | "link-editor"
  | "request-payout"
  | "payout-history"
  | "payout-methods"
  | "roles"
  | "roles-permissions"
  | "crew-manager"
  | "dealz-marketplace"
  | "live-dashboard-2"
  | "audience-notification"
  | "live-alert"
  | "overlays-ctas"
  | "post-live"
  | "stream-platform"
  | "safety-moderation"
  | "audit-log"
  | "promo-ad-detail";

type CreatorShellLayoutProps = {
  onLogout: () => void;
};

export const CreatorShellLayout: React.FC<CreatorShellLayoutProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract pure page id from path: /dashboard/home -> home, /home -> home
  const segments = location.pathname.split("/").filter(Boolean);
  const currentPath = segments.pop() || "home";
  // Check if currentPath is a valid PageId, otherwise default or handle logic
  const activePage = currentPath as PageId;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [earningsOpen, setEarningsOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<"Creator" | "Seller" | "Buyer" | "Provider">("Creator");

  const [searchRect, setSearchRect] = useState<DOMRect | null>(null);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Command Palette Toggle keys
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNavigate = (page: PageId) => {
    navigate(page);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar */}
      <TopBar
        onChangePage={handleNavigate}
        onOpenCommand={() => setCmdOpen(true)}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenMobileMenu={() => setSidebarOpen(true)}
        onViewEarnings={() => setEarningsOpen(true)}
        onLogout={onLogout}
        activePage={activePage}
        onSearchRectUpdate={setSearchRect}
      />

      {/* Money Bar (Dynamic ticker) */}
      <MoneyBar onViewEarnings={() => setEarningsOpen(true)} />

      {/* Desktop Sidebar */}
      <Sidebar
        activePage={activePage}
        onChangePage={handleNavigate}
        onLogout={onLogout}
      />

      {/* Mobile Menu Drawer */}
      <MobileMenu
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        onChangePage={handleNavigate}
      />

      {/* Slide-over Earnings Panel */}
      {earningsOpen && (
        <EarningsPanel
          onClose={() => setEarningsOpen(false)}
          onChangePage={handleNavigate}
        />
      )}

      {cmdOpen && (
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          onChangePage={handleNavigate}
          triggerRect={searchRect}
        />
      )}

      {/* Main Content Area */}
      {/* Adjusted left margin for sidebar + top padding for bars (h-14 + h-10 = 6rem) */}
      <div className="pt-24 pb-16 xl:pb-0 xl:pl-80 transition-all duration-300 min-h-screen flex flex-col">
        {/* 
            Outlet renders the child route matching the URL.
            This replaces the manual switch statement.
          */}
        <Outlet />
      </div>

      {/* Footer Nav (Mobile only) */}
      <FooterNav activePage={activePage} onChangePage={handleNavigate} />
    </div>
  );
};
