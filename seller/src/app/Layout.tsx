import React, { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSession } from "../auth/session";
import { getCurrentRole } from "../auth/roles";
import { sellerBackendApi } from "../lib/backendApi";
import AppShell from "../features/shell/AppShell";
import "./Layout.css";

type LayoutProps = {
  children?: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const session = useSession();
  const role = getCurrentRole(session);

  const handleSidebarScroll = (value: number) => {
    void sellerBackendApi
      .patchUiState({ shell: { sidebarScroll: Math.round(value) } })
      .catch(() => undefined);
  };

  useLayoutEffect(() => {
    if (!sidebarRef.current) return;
    let active = true;
    void sellerBackendApi
      .getUiState()
      .then((payload) => {
        if (!active || !sidebarRef.current) return;
        const scrollTop = Number((payload.shell as { sidebarScroll?: number } | undefined)?.sidebarScroll);
        if (Number.isFinite(scrollTop)) {
          sidebarRef.current.scrollTop = scrollTop;
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [location.pathname]);

  return (
    <div className="layout-shell" data-role={role}>
      <AppShell sidebarRef={sidebarRef} onSidebarScroll={handleSidebarScroll}>
        {children}
      </AppShell>
    </div>
  );
}
