import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Landing from "./Landing";
import Auth from "../misc/Auth";
import { useLocalization } from "../../localization/LocalizationProvider";

import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:landing/PublicLanding").catch(() => undefined);

const BODY = typeof document !== "undefined" ? document.body : null;

export default function PublicLanding() {
  const [authIntent, setAuthIntent] = useState<"signin" | "signup" | null>(null); // 'signin' | 'signup' | null
  const landingRef = useRef<HTMLDivElement | null>(null);
  const scrollLockCount = useRef(0);

  const openAuth = useCallback((intent: "signin" | "signup") => {
    setAuthIntent(intent === "signup" ? "signup" : "signin");
  }, []);
  const closeAuth = useCallback(() => setAuthIntent(null), []);

  // Prevent background scrolling when modal open
  useEffect(() => {
    if (!BODY) return;
    if (authIntent) {
      const originalOverflow = BODY.style.overflow;
      scrollLockCount.current += 1;
      BODY.style.overflow = "hidden";
      return () => {
        scrollLockCount.current = Math.max(scrollLockCount.current - 1, 0);
        if (scrollLockCount.current === 0) BODY.style.overflow = originalOverflow;
      };
    }
  }, [authIntent]);

  useEffect(() => {
    const root = landingRef.current;
    if (!root) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const actionable = target?.closest("a,button");
      if (!(actionable instanceof HTMLElement) || !root.contains(actionable)) return;

      // Only open auth modal if button has data-auth-intent attribute
      const intent = actionable.dataset.authIntent;
      if (intent === "signin" || intent === "signup") {
        event.preventDefault();
        openAuth(intent);
      }
      // Otherwise, let the button's onClick handler or default behavior work (scrolling, etc.)
    };

    root.addEventListener("click", handler);
    return () => root.removeEventListener("click", handler);
  }, [openAuth]);

  return (
    <>
      <div ref={landingRef}>
        <Landing />
      </div>
      {authIntent && (
        <AuthOverlay intent={authIntent} onClose={closeAuth} />
      )}
    </>
  );
}

function AuthOverlay({ intent, onClose }: { intent: "signin" | "signup"; onClose: () => void }) {
  const { t } = useLocalization();
  const [tab, setTab] = useState<"signin" | "signup">(intent);
  useEffect(() => setTab(intent), [intent]);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!BODY) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label={t("Close authentication modal")}
        onClick={onClose}
      />
      <div className="relative z-[201] mx-4 w-full max-w-[460px]">
        <Auth defaultTab={tab} onClose={onClose} variant="modal" />
      </div>
    </div>,
    BODY
  );
}
