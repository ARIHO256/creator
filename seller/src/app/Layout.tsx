import React, { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSession } from "../auth/session";
import { getCurrentRole } from "../auth/roles";
import AppShell from "../features/shell/AppShell";
import "./Layout.css";

const SIDEBAR_SCROLL_KEY = "seller-shell-scroll";

type LayoutProps = {
  children?: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const session = useSession();
  const role = getCurrentRole(session);

  const handleSidebarScroll = (value: number) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(Math.round(value)));
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (!sidebarRef.current) return;
    const stored = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    const scrollTop = stored ? parseInt(stored, 10) : NaN;
    if (!Number.isNaN(scrollTop)) {
      sidebarRef.current.scrollTop = scrollTop;
    }
  }, [location.pathname]);

  return (
    <div className="layout-shell" data-role={role}>
      <AppShell sidebarRef={sidebarRef} onSidebarScroll={handleSidebarScroll}>
        {children}
      </AppShell>
    </div>
  );
}
