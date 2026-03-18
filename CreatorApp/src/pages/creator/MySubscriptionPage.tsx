import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MemoryRouter, useInRouterContext, useNavigate } from "react-router-dom";
import { creatorApi } from "../../lib/creatorApi";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  Mail,
  MinusCircle,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";

/**
 * MySubscriptionPage.tsx (Premium)
 * -------------------------------------------------------------
 * This file is self-contained so it can compile in isolation.
 * If your project already has PageHeader + NotificationContext,
 * you can replace the local PageHeader/useToasts with your own.
 */

// Theme tokens (Orange primary, Black secondary, Grey neutrals)
const THEME = {
  primary: "#f77f00",
  primaryHover: "#e26f00",
  secondary: "#0f172a", // slate-900
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function safeReadLS(key: string) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeWriteLS(key: string, value: string) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function fmtMoney(amount: number) {
  return amount === 0 ? "Free" : `$${amount.toLocaleString()}`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

// -----------------------------------------------------------------------------
// Local PageHeader clone (premium + matches your project feel)
// -----------------------------------------------------------------------------

type PageHeaderProps = {
  pageTitle: string;
  badge?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
  mobileViewType?: "menu" | "inline-right" | "hide";
  mobileHideBadge?: boolean;
};

const PageHeader: React.FC<PageHeaderProps> = ({
  pageTitle,
  badge,
  rightContent,
  className = "",
  mobileViewType = "menu",
  mobileHideBadge = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasRightSide = Boolean(badge || rightContent);

  return (
    <header
      className={
        `relative z-[38] h-16 w-full flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 pt-3 ` +
        `bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm ${className}`
      }
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <img
          src="/MyliveDealz PNG Icon 1.png"
          alt="MyLiveDealz"
          className="h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">{pageTitle}</span>
      </div>

      {hasRightSide ? (
        <>
          <div className="hidden xl:flex items-center gap-3 text-sm flex-shrink-0">
            {badge}
            {rightContent}
          </div>

          <div className="xl:hidden relative">
            {mobileViewType === "hide" ? null : mobileViewType === "inline-right" ? (
              <div className="flex items-center gap-2">{rightContent}</div>
            ) : (
              <>
                <button
                  ref={btnRef}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Open menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </button>

                {menuOpen ? (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col p-1.5"
                  >
                    {badge && !mobileHideBadge ? (
                      <div className="flex flex-col w-full mb-1.5 last:mb-0 [&_button]:!w-full [&_button]:!px-3.5 [&_button]:!py-3 [&_button]:!rounded-xl [&_button]:!text-left [&_button]:!flex [&_button]:!items-center [&_button]:!gap-2">
                        {badge}
                      </div>
                    ) : null}
                    {rightContent ? (
                      <div className="flex flex-col w-full gap-1.5 [&_button]:!w-full [&_button]:!px-3.5 [&_button]:!py-3 [&_button]:!rounded-xl [&_button]:!text-left [&_button]:!flex [&_button]:!items-center [&_button]:!gap-2 transition-colors">
                        {rightContent}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : null}
    </header>
  );
};

// -----------------------------------------------------------------------------
// Toasts (demo) — replace with NotificationContext if you have it
// -----------------------------------------------------------------------------

type ToastKind = "success" | "info" | "warning" | "error";

type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      showSuccess: (m: string) => push(m, "success"),
      showInfo: (m: string) => push(m, "info"),
      showWarning: (m: string) => push(m, "warning"),
      showError: (m: string) => push(m, "error"),
    }),
    [push]
  );

  const ToastStack = useCallback(() => {
    if (toasts.length === 0) return null;

    const iconFor = (k: ToastKind) => {
      if (k === "success") return <CheckCircle2 className="h-4 w-4" />;
      if (k === "warning") return <MinusCircle className="h-4 w-4" />;
      if (k === "error") return <XCircle className="h-4 w-4" />;
      return <ShieldCheck className="h-4 w-4" />;
    };

    const clsFor = (k: ToastKind) => {
      if (k === "success")
        return "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
      if (k === "warning")
        return "border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200";
      if (k === "error")
        return "border-rose-200 dark:border-rose-500/25 bg-rose-50/70 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200";
      return "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100";
    };

    return (
      <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div key={t.id} className={"rounded-2xl border shadow-2xl px-3.5 py-3 flex items-start gap-2.5 " + clsFor(t.kind)}>
            <div className="mt-0.5">{iconFor(t.kind)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold opacity-80">
                {t.kind === "success" ? "Success" : t.kind === "warning" ? "Heads up" : t.kind === "error" ? "Error" : "Info"}
              </div>
              <div className="text-sm font-semibold leading-snug break-words">{t.message}</div>
            </div>
            <button
              onClick={() => remove(t.id)}
              className="ml-2 shrink-0 h-8 w-8 rounded-xl border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 opacity-70" />
            </button>
          </div>
        ))}
      </div>
    );
  }, [remove, toasts]);

  return { ...api, ToastStack };
}

// -----------------------------------------------------------------------------
// Side Drawer
// -----------------------------------------------------------------------------

type SideDrawerProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
};

function SideDrawer({ open, title, subtitle, onClose, children, footer, widthClassName }: SideDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus
    window.setTimeout(() => panelRef.current?.focus(), 50);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[65]",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/30 dark:bg-black/50" />
      </div>

      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-0 h-full bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          widthClassName || "w-[420px] max-w-[92vw]"
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: THEME.primary }}
                />
                <div className="text-base font-extrabold text-slate-900 dark:text-slate-50">{title}</div>
              </div>
              {subtitle ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</div> : null}
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center justify-center"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-5 py-4 h-[calc(100%-8.25rem)] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur">
          {footer ? footer : (
            <div className="flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors font-extrabold"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</div>
      <div className="mt-1">{children}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3 py-2 rounded-2xl border outline-none transition-colors",
        "bg-white dark:bg-slate-950",
        "border-slate-200 dark:border-slate-800",
        "text-slate-900 dark:text-slate-100",
        "placeholder:text-slate-400 dark:placeholder:text-slate-500",
        // Tailwind needs static class names for compilation
        "focus:ring-2 focus:ring-[#f77f00] focus:border-[#f77f00]"
      )}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full px-3 py-2 rounded-2xl border outline-none transition-colors",
        "bg-white dark:bg-slate-950",
        "border-slate-200 dark:border-slate-800",
        "text-slate-900 dark:text-slate-100",
        "placeholder:text-slate-400 dark:placeholder:text-slate-500",
        // Tailwind needs static class names for compilation
        "focus:ring-2 focus:ring-[#f77f00] focus:border-[#f77f00]"
      )}
    />
  );
}

function PrimaryButton({ children, onClick, disabled, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-2xl font-extrabold transition-colors",
        disabled
          ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
          : "bg-[#f77f00] text-white hover:bg-[#e26f00]",
        className
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-2xl font-extrabold transition-colors",
        "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
        className
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-2xl font-extrabold transition-colors",
        "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100",
        "hover:bg-slate-50 dark:hover:bg-slate-900",
        className
      )}
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Plans + Comparison
// -----------------------------------------------------------------------------

type PlanKey = "basic" | "pro" | "enterprise";
type BillingCycle = "monthly" | "yearly";

type PlanValue = "included" | "limited" | "not";

type PlanCell = {
  value: PlanValue;
  note?: string; // shown inline on the plan cell (requirement: notes belong to the plan)
};

type ComparisonRow = {
  category: string;
  feature: string;
  basic: PlanCell;
  pro: PlanCell;
  enterprise: PlanCell;
};

const LS_PLAN_KEY = "mldz_creator_subscription_plan_v1";
const LS_CYCLE_KEY = "mldz_creator_subscription_cycle_v1";

function valueBadge(v: PlanValue) {
  if (v === "included")
    return {
      label: "Included",
      Icon: CheckCircle2,
      cls: "text-emerald-700 dark:text-emerald-400",
    };
  if (v === "limited")
    return {
      label: "Limited",
      Icon: MinusCircle,
      cls: "text-amber-700 dark:text-amber-400",
    };
  return { label: "Not included", Icon: XCircle, cls: "text-slate-500 dark:text-slate-400" };
}

const PLAN_META: Record<
  PlanKey,
  {
    name: string;
    emoji: string;
    tagline: string;
    bestFor: string;
    monthly: number;
    yearly: number;
    highlights: Array<{ icon: React.ReactNode; text: string }>;
    includes: string[];
    limits: {
      liveSessionz: string;
      shoppableAdz: string;
      livePlusShoppables: string;
      crewPerLive: string;
      streamDestinations: string;
      storage: string;
      analyticsHistory: string;
      notifications: string;
    };
    recommended?: boolean;
  }
> = {
  basic: {
    name: "Basic",
    emoji: "🟦",
    tagline: "Start strong with essential creator tools.",
    bestFor: "New creators testing workflows and building early momentum.",
    monthly: 0,
    yearly: 0,
    highlights: [
      { icon: <BadgeCheck className="h-4 w-4" />, text: "Core creator dashboard + essential studio tools" },
      { icon: <Users className="h-4 w-4" />, text: "Simple live setup with limited crew support" },
      { icon: <ShieldCheck className="h-4 w-4" />, text: "Standard safety & moderation controls" },
    ],
    includes: [
      "Creator profile and storefront basics",
      "Basic Live Sessionz scheduling",
      "Basic overlays (limited presets)",
      "Standard analytics snapshot",
      "Standard support",
    ],
    limits: {
      liveSessionz: "Up to 4 / month",
      shoppableAdz: "Up to 10 / month",
      livePlusShoppables: "Up to 2 / month",
      crewPerLive: "Up to 2",
      streamDestinations: "1 destination",
      storage: "1 GB",
      analyticsHistory: "30 days",
      notifications: "200 / month",
    },
  },
  pro: {
    name: "Pro",
    emoji: "🟧",
    tagline: "Unlock the full creator toolset and grow faster.",
    bestFor: "Creators who run frequent lives, campaigns, and promotion at scale.",
    monthly: 49,
    yearly: 490,
    highlights: [
      {
        icon: <Sparkles className="h-4 w-4" />,
        text: "Unlimited Dealz (Live Sessionz, Shoppable Adz, Live + Shoppables)",
      },
      { icon: <Users className="h-4 w-4" />, text: "Unlimited crew members per live session" },
      { icon: <BadgeCheck className="h-4 w-4" />, text: "Pro Overlays & CTAs, automation, and advanced publishing" },
    ],
    includes: [
      "Unlimited Dealz + scheduling",
      "Multi-platform streaming",
      "Overlays & CTAs Pro (QR, timers, banners)",
      "Audience notifications + automation",
      "Post-live publisher (clips + repurposing)",
      "Advanced analytics + exports",
      "Priority support",
    ],
    limits: {
      liveSessionz: "Unlimited",
      shoppableAdz: "Unlimited",
      livePlusShoppables: "Unlimited",
      crewPerLive: "Unlimited",
      streamDestinations: "Unlimited",
      storage: "50 GB",
      analyticsHistory: "12 months",
      notifications: "Unlimited",
    },
    recommended: true,
  },
  enterprise: {
    name: "Enterprise",
    emoji: "🏢",
    tagline: "Agency-grade governance, multi-seat, and custom enablement.",
    bestFor: "Agencies managing multiple creators, brand deals, and teams.",
    monthly: 199,
    yearly: 1990,
    highlights: [
      { icon: <Building2 className="h-4 w-4" />, text: "Multi-creator roster, seats, and approval workflows" },
      { icon: <ShieldCheck className="h-4 w-4" />, text: "Compliance controls, audit exports, and optional SSO" },
      { icon: <Sparkles className="h-4 w-4" />, text: "Unlimited across all creator tools with agency support" },
    ],
    includes: [
      "Everything in Pro",
      "Agency workspace + multi-seat management",
      "Roles & permissions + approvals",
      "Audit log exports + scheduled reports",
      "Optional API & webhooks",
      "Dedicated success manager + SLA options",
      "Central billing + invoice controls",
    ],
    limits: {
      liveSessionz: "Unlimited",
      shoppableAdz: "Unlimited",
      livePlusShoppables: "Unlimited",
      crewPerLive: "Unlimited",
      streamDestinations: "Unlimited",
      storage: "200 GB (customizable)",
      analyticsHistory: "24 months (customizable)",
      notifications: "Unlimited",
    },
  },
};

const COMPARISON_ROWS: ComparisonRow[] = [
  // Core
  {
    category: "Core",
    feature: "Creator dashboard + profile",
    basic: { value: "included" },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Core",
    feature: "Dealz (Live Sessionz)",
    basic: { value: "limited", note: PLAN_META.basic.limits.liveSessionz },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Core",
    feature: "Dealz (Shoppable Adz)",
    basic: { value: "limited", note: PLAN_META.basic.limits.shoppableAdz },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Core",
    feature: "Dealz (Live + Shoppables)",
    basic: { value: "limited", note: PLAN_META.basic.limits.livePlusShoppables },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },

  // Live Studio Pro
  {
    category: "Live Studio Pro",
    feature: "Crew members per live",
    basic: { value: "limited", note: PLAN_META.basic.limits.crewPerLive },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Live Studio Pro",
    feature: "Multi-platform streaming destinations",
    basic: { value: "limited", note: PLAN_META.basic.limits.streamDestinations },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Live Studio Pro",
    feature: "Overlays & CTAs Pro (QR, timers, banners)",
    basic: { value: "limited" },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Live Studio Pro",
    feature: "Saved presets + templates",
    basic: { value: "limited" },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },

  // Growth & Audience
  {
    category: "Growth & Audience",
    feature: "Audience notifications",
    basic: { value: "limited", note: PLAN_META.basic.limits.notifications },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Growth & Audience",
    feature: "Automation (segments + schedules)",
    basic: { value: "not" },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Growth & Audience",
    feature: "Advanced audience insights",
    basic: { value: "limited", note: "Snapshot only" },
    pro: { value: "included", note: "Exports + trends" },
    enterprise: { value: "included", note: "Scheduled reports" },
  },

  // Monetization
  {
    category: "Monetization",
    feature: "Post-live publisher + clip repurposing",
    basic: { value: "limited", note: "Manual publishing" },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Monetization",
    feature: "Exports (CSV) + scheduled reports",
    basic: { value: "not" },
    pro: { value: "included", note: "CSV exports" },
    enterprise: { value: "included", note: "Scheduled exports" },
  },

  // Collaboration
  {
    category: "Collaboration",
    feature: "Seats / team access",
    basic: { value: "limited", note: "1 seat" },
    pro: { value: "limited", note: "1+ seats (add-on)" },
    enterprise: { value: "included", note: "Multi-seat" },
  },
  {
    category: "Collaboration",
    feature: "Roles, permissions, approvals",
    basic: { value: "not" },
    pro: { value: "limited", note: "Basic roles" },
    enterprise: { value: "included" },
  },

  // Security & Compliance
  {
    category: "Security & Compliance",
    feature: "Standard safety & moderation",
    basic: { value: "included" },
    pro: { value: "included" },
    enterprise: { value: "included" },
  },
  {
    category: "Security & Compliance",
    feature: "Audit log exports",
    basic: { value: "not" },
    pro: { value: "limited", note: "Last 7 days" },
    enterprise: { value: "included" },
  },
  {
    category: "Security & Compliance",
    feature: "SSO (optional)",
    basic: { value: "not" },
    pro: { value: "not" },
    enterprise: { value: "included", note: "SAML/OIDC" },
  },

  // Support
  {
    category: "Support",
    feature: "Support response time",
    basic: { value: "limited", note: "72h" },
    pro: { value: "included", note: "24h" },
    enterprise: { value: "included", note: "SLA" },
  },
  {
    category: "Support",
    feature: "Dedicated success manager",
    basic: { value: "not" },
    pro: { value: "not" },
    enterprise: { value: "included" },
  },
];

const SPOTLIGHTS: Array<{
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  proOnly?: boolean;
}> = [
  {
    title: "Stream to Platforms",
    description: "Go live to multiple destinations and manage outputs in one place.",
    path: "/Stream-platform",
    icon: <ExternalLink className="h-5 w-5" />,
    proOnly: true,
  },
  {
    title: "Overlays & CTAs Pro",
    description: "QR overlays, countdown timers, product banners, and pro presets.",
    path: "/overlays-ctas",
    icon: <Sparkles className="h-5 w-5" />,
    proOnly: true,
  },
  {
    title: "Audience Notifications",
    description: "Notify followers, schedule blasts, and run smart segments.",
    path: "/audience-notification",
    icon: <Users className="h-5 w-5" />,
    proOnly: true,
  },
  {
    title: "Post-Live Publisher",
    description: "Publish highlights, repurpose clips, and distribute faster.",
    path: "/post-live",
    icon: <Receipt className="h-5 w-5" />,
    proOnly: true,
  },
];

function PlanPill({ plan }: { plan: PlanKey }) {
  const meta = PLAN_META[plan];
  const ring =
    plan === "pro"
      ? "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:border-orange-500/20"
      : plan === "enterprise"
        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
        : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";

  return (
    <span className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold", ring)}>
      <span>{meta.emoji}</span>
      <span>Current plan: {meta.name}</span>
    </span>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-100">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{title}</div>
        {subtitle ? <div className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function StatusCell({ cell }: { cell: PlanCell }) {
  const b = valueBadge(cell.value);
  return (
    <div className="flex flex-col">
      <div className={cn("inline-flex items-center gap-2 font-bold", b.cls)}>
        <b.Icon className="h-4 w-4" />
        {b.label}
        {cell.note ? <span className="font-semibold text-slate-500 dark:text-slate-400">({cell.note})</span> : null}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

function MySubscriptionPageInner() {
  const navigate = useNavigate();
  const { showSuccess, showInfo, showWarning, ToastStack } = useToasts();

  const [plan, setPlan] = useState<PlanKey>("basic");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  // Side drawers
  const [drawerBilling, setDrawerBilling] = useState(false);
  const [drawerInvoices, setDrawerInvoices] = useState(false);
  const [drawerSales, setDrawerSales] = useState(false);
  const [drawerGov, setDrawerGov] = useState(false);

  // Demo billing state
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingCard, setBillingCard] = useState("4242 4242 4242 4242");
  const [billingExpiry, setBillingExpiry] = useState("12/29");

  // Demo sales state
  const [salesContactName, setSalesContactName] = useState("");
  const [salesEmail, setSalesEmail] = useState("");
  const [salesCompany, setSalesCompany] = useState("");
  const [salesTeamSize, setSalesTeamSize] = useState("5");
  const [salesMessage, setSalesMessage] = useState("We'd like Enterprise for our agency team.");
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  useEffect(() => {
    const storedPlan = safeReadLS(LS_PLAN_KEY);
    const storedCycle = safeReadLS(LS_CYCLE_KEY);

    if (storedPlan === "basic" || storedPlan === "pro" || storedPlan === "enterprise") setPlan(storedPlan);
    if (storedCycle === "monthly" || storedCycle === "yearly") setCycle(storedCycle);

    // seed demo billing fields
    setBillingName("Creator Admin");
    setBillingEmail("admin@creator.app");

    let cancelled = false;

    void creatorApi.subscription()
      .then((subscription) => {
        if (cancelled) return;
        if (subscription.plan === "basic" || subscription.plan === "pro" || subscription.plan === "enterprise") {
          setPlan(subscription.plan);
          safeWriteLS(LS_PLAN_KEY, subscription.plan);
        }
        if (subscription.cycle === "monthly" || subscription.cycle === "yearly") {
          setCycle(subscription.cycle);
          safeWriteLS(LS_CYCLE_KEY, subscription.cycle);
        }
        setSubscriptionError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setSubscriptionError("Subscription backend is unavailable. Using saved plan settings.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const meta = PLAN_META[plan];
  const price = cycle === "monthly" ? meta.monthly : meta.yearly;

  const renewalDate = useMemo(() => {
    const days = plan === "basic" ? 0 : 21;
    const d = new Date();
    d.setDate(d.getDate() + (days || 21));
    return fmtDate(d);
  }, [plan]);

  const seatsLabel = useMemo(() => {
    if (plan === "basic") return "1 seat";
    if (plan === "pro") return "1+ seats";
    return "Multi-seat";
  }, [plan]);

  async function applyPlan(next: PlanKey) {
    setPlan(next);
    safeWriteLS(LS_PLAN_KEY, next);
    try {
      await creatorApi.updateSubscription({ plan: next, cycle, status: next === "basic" ? "inactive" : "active" });
      setSubscriptionError(null);
    } catch {
      setSubscriptionError("Failed to save the plan change to the backend.");
    }

    if (next === "basic") {
      showWarning("Switched to Basic (Free). Pro tools remain visible in demo but are intended to be gated.");
    } else if (next === "pro") {
      showSuccess("Welcome to Pro. Unlimited Dealz and Pro tools are now unlocked (demo).");
    } else {
      showInfo("Enterprise is typically provisioned by Sales. Demo mode applied.");
    }
  }

  async function applyCycle(next: BillingCycle) {
    setCycle(next);
    safeWriteLS(LS_CYCLE_KEY, next);
    try {
      await creatorApi.updateSubscription({ plan, cycle: next, status: plan === "basic" ? "inactive" : "active" });
      setSubscriptionError(null);
    } catch {
      setSubscriptionError("Failed to save the billing cycle to the backend.");
    }
  }

  const topProUpsell = useMemo(
    () => [
      "Unlimited Dealz across Live Sessionz, Shoppable Adz, and Live + Shoppables",
      "Unlimited crew members + advanced roles",
      "Multi-platform streaming + Pro Overlays & CTAs",
      "Audience notifications + automation",
    ],
    []
  );

  const invoiceRows = useMemo(
    () => [
      { id: `MLDz-${new Date().getFullYear()}-0007`, date: fmtDate(new Date()), amount: plan === "basic" ? "$0" : fmtMoney(price), status: plan === "basic" ? "—" : "Paid" },
      { id: `MLDz-${new Date().getFullYear()}-0006`, date: fmtDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)), amount: plan === "basic" ? "$0" : fmtMoney(price), status: plan === "basic" ? "—" : "Paid" },
      { id: `MLDz-${new Date().getFullYear()}-0005`, date: fmtDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 60)), amount: plan === "basic" ? "$0" : fmtMoney(price), status: plan === "basic" ? "—" : "Paid" },
    ],
    [plan, price]
  );

  return (
    <>
      <PageHeader
        pageTitle="My Subscription"
        badge={<PlanPill plan={plan} />}
        rightContent={
          <div className="flex items-center gap-2">
            {plan !== "pro" ? (
              <PrimaryButton onClick={() => applyPlan("pro")} className="!px-3 !py-1.5 !rounded-full !text-sm !font-semibold">
                Upgrade to Pro
              </PrimaryButton>
            ) : (
              <SecondaryButton
                onClick={() => setDrawerBilling(true)}
                className="!px-3 !py-1.5 !rounded-full !text-sm !font-semibold"
              >
                Manage Billing
              </SecondaryButton>
            )}
          </div>
        }
        mobileViewType="menu"
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-4 overflow-y-auto overflow-x-hidden bg-[#f2f2f2] dark:bg-slate-950">
        <div className="w-full flex flex-col gap-4">
          {subscriptionError ? (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              {subscriptionError}
            </div>
          ) : null}
          {/* Top Callout */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(247,127,0,0.10)" }}
                >
                  <ShieldCheck className="h-5 w-5" style={{ color: THEME.secondary }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    Subscription unlocks tools — Rank is performance-based. Subscription does NOT affect Rank.
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Use subscriptions to unlock creator tools like multi-platform streaming, Pro overlays, audience automation, and deeper analytics.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Sparkles className="h-4 w-4" style={{ color: THEME.primary }} />
                  Pro tools are highlighted below
                </span>
              </div>
            </div>
          </div>

          {/* Current Plan + Billing */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Current Plan */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <SectionTitle
                  icon={<BadgeCheck className="h-5 w-5" style={{ color: THEME.primary }} />}
                  title="Current Plan"
                  subtitle="Plan details, limits, and upgrade signals"
                />

                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                    <button
                      onClick={() => applyCycle("monthly")}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors",
                        cycle === "monthly"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50"
                      )}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => applyCycle("yearly")}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors",
                        cycle === "yearly"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50"
                      )}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
                  <div className="text-xs text-slate-600 dark:text-slate-300">Plan</div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50 mt-0.5">
                    {meta.emoji} {meta.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">{meta.tagline}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
                  <div className="text-xs text-slate-600 dark:text-slate-300">Billing</div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50 mt-0.5">
                    {fmtMoney(price)}
                    {price === 0 ? null : <span className="text-sm font-semibold text-slate-600 dark:text-slate-300"> / {cycle}</span>}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {plan === "basic" ? "No renewal on Free plan" : `Renews on ${renewalDate}`}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
                  <div className="text-xs text-slate-600 dark:text-slate-300">Seats</div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50 mt-0.5">{seatsLabel}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {plan === "enterprise" ? "Agency roster with approvals" : "Invite teammates based on plan"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">What’s unlocked</div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {[
                      { k: "Live Sessionz", v: meta.limits.liveSessionz },
                      { k: "Shoppable Adz", v: meta.limits.shoppableAdz },
                      { k: "Live + Shoppables", v: meta.limits.livePlusShoppables },
                      { k: "Crew per live", v: meta.limits.crewPerLive },
                    ].map((row) => (
                      <div key={row.k} className="flex items-center justify-between gap-3">
                        <div className="text-sm text-slate-700 dark:text-slate-200">{row.k}</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{row.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {[
                      { k: "Streaming", v: meta.limits.streamDestinations },
                      { k: "Storage", v: meta.limits.storage },
                      { k: "Analytics history", v: meta.limits.analyticsHistory },
                      { k: "Notifications", v: meta.limits.notifications },
                    ].map((row) => (
                      <div key={row.k} className="flex items-center justify-between gap-3">
                        <div className="text-sm text-slate-700 dark:text-slate-200">{row.k}</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{row.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Top Pro features</div>
                    {plan === "pro" || plan === "enterprise" ? (
                      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20 text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20 text-xs font-bold">
                        <MinusCircle className="h-4 w-4" />
                        Upgrade for full access
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-2">
                    {topProUpsell.map((t) => (
                      <li key={t} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <span className="mt-0.5">•</span>
                        <span className="min-w-0">{t}</span>
                      </li>
                    ))}
                  </ul>
                  {plan === "basic" ? (
                    <div className="mt-3 flex items-center gap-2">
                      <PrimaryButton onClick={() => applyPlan("pro")} className="!px-3 !py-1.5 !rounded-full !text-sm !font-semibold">
                        Upgrade to Pro
                      </PrimaryButton>
                      <GhostButton onClick={() => setDrawerSales(true)} className="!px-3 !py-1.5 !rounded-full !text-sm !font-semibold">
                        Explore Enterprise
                      </GhostButton>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Billing */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
              <SectionTitle icon={<CreditCard className="h-5 w-5" style={{ color: THEME.primary }} />} title="Billing" subtitle="Payment method and invoices" />

              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-600 dark:text-slate-300">Payment method</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-50">
                  {plan === "basic" ? "None (Free plan)" : "Visa •••• 4242"}
                </div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {plan === "basic" ? "Add a payment method when upgrading." : "Update payment method in Billing settings."}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">Latest invoice</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-50">
                      {plan === "basic" ? "No invoices on Free plan" : `Invoice #MLDz-${new Date().getFullYear()}-0007`}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {plan === "basic" ? "Upgrade to generate invoices." : `Issued ${fmtDate(new Date())}`}
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <Receipt className="h-5 w-5" style={{ color: THEME.secondary }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <GhostButton onClick={() => setDrawerBilling(true)} className="!w-full !px-3 !py-2">
                  Billing
                </GhostButton>
                <GhostButton onClick={() => setDrawerInvoices(true)} className="!w-full !px-3 !py-2">
                  Invoices
                </GhostButton>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Add-ons (optional)</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Add-ons let you scale without changing your plan. Examples: extra seats, extra storage, scheduled reports, and advanced compliance.
                </div>
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <SectionTitle icon={<Sparkles className="h-5 w-5" style={{ color: THEME.primary }} />} title="Plans" subtitle="Choose the plan that matches how you create" />
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Tip:</span>
                <span>Pro and Enterprise remove Dealz and crew limits.</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {(Object.keys(PLAN_META) as PlanKey[]).map((k) => {
                const p = PLAN_META[k];
                const isCurrent = plan === k;
                const planPrice = cycle === "monthly" ? p.monthly : p.yearly;
                const frame =
                  k === "pro"
                    ? "border-orange-200 dark:border-orange-500/25"
                    : k === "enterprise"
                      ? "border-slate-900 dark:border-slate-100"
                      : "border-slate-200 dark:border-slate-800";

                return (
                  <div key={k} className={cn("rounded-2xl border shadow-sm p-4 flex flex-col gap-3 bg-white dark:bg-slate-900", frame)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-base font-extrabold text-slate-900 dark:text-slate-50">
                            {p.emoji} {p.name}
                          </div>
                          {p.recommended ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-extrabold"
                              style={{ color: THEME.primary, background: "rgba(247,127,0,0.10)", borderColor: "rgba(247,127,0,0.25)" }}
                            >
                              Recommended
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{p.tagline}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{fmtMoney(planPrice)}</div>
                        {planPrice === 0 ? (
                          <div className="text-xs text-slate-600 dark:text-slate-300">Forever free</div>
                        ) : (
                          <div className="text-xs text-slate-600 dark:text-slate-300">per {cycle}</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-xs text-slate-600 dark:text-slate-300">Best for</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-50 mt-1">{p.bestFor}</div>
                    </div>

                    <div className="space-y-2">
                      {p.highlights.map((h, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <span className="mt-0.5 text-slate-600 dark:text-slate-300">{h.icon}</span>
                          <span className="min-w-0">{h.text}</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Includes</div>
                      <ul className="mt-2 space-y-2">
                        {p.includes.slice(0, 6).map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mt-0.5" />
                            <span className="min-w-0">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Key limits</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        {[
                          { k: "Live Sessionz", v: p.limits.liveSessionz },
                          { k: "Shoppable Adz", v: p.limits.shoppableAdz },
                          { k: "Live + Shoppables", v: p.limits.livePlusShoppables },
                          { k: "Crew/live", v: p.limits.crewPerLive },
                        ].map((row) => (
                          <div key={row.k} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-2">
                            <div className="text-slate-600 dark:text-slate-300">{row.k}</div>
                            <div className="font-extrabold text-slate-900 dark:text-slate-50 mt-0.5">{row.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto flex flex-col gap-2">
                      {k === "enterprise" ? (
                        <>
                          <SecondaryButton onClick={() => setDrawerSales(true)} className="!w-full !justify-center">
                            Contact Sales
                          </SecondaryButton>
                          <GhostButton onClick={() => setDrawerGov(true)} className="!w-full !justify-center">
                            Governance
                          </GhostButton>
                        </>
                      ) : k === "pro" ? (
                        <PrimaryButton
                          onClick={() => (isCurrent ? showInfo("You are already on Pro.") : applyPlan("pro"))}
                          className="!w-full !justify-center"
                        >
                          {isCurrent ? "Current plan" : "Upgrade to Pro"}
                        </PrimaryButton>
                      ) : (
                        <GhostButton
                          onClick={() => (isCurrent ? showInfo("You are already on Basic.") : applyPlan("basic"))}
                          className="!w-full !justify-center"
                        >
                          {isCurrent ? "Current plan" : "Switch to Basic"}
                        </GhostButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pro Feature Spotlights */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <SectionTitle icon={<Sparkles className="h-5 w-5" style={{ color: THEME.primary }} />} title="Pro Feature Spotlights" subtitle="High-impact tools your subscription unlocks" />
              <div className="hidden md:flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-extrabold",
                    plan === "basic"
                      ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
                      : "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                  )}
                >
                  {plan === "basic" ? (
                    <>
                      <MinusCircle className="h-4 w-4" />
                      Some tools are intended to be gated on Basic
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Unlocked
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {SPOTLIGHTS.map((s) => (
                <button
                  key={s.title}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors"
                  onClick={() => {
                    if (s.proOnly && plan === "basic") {
                      showWarning("This is a Pro feature. Upgrade to Pro for full access.");
                    }
                    navigate(s.path);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center"
                        style={{ background: "rgba(247,127,0,0.10)" }}
                      >
                        <span style={{ color: THEME.secondary }}>{s.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{s.title}</div>
                          {s.proOnly ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-extrabold"
                              style={{ color: THEME.primary, background: "rgba(247,127,0,0.10)", borderColor: "rgba(247,127,0,0.25)" }}
                            >
                              Pro
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{s.description}</div>
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      <ChevronRight className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Comparison Matrix (Notes removed; notes placed in plan cells) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <SectionTitle icon={<Users className="h-5 w-5" style={{ color: THEME.primary }} />} title="Plan Comparison" subtitle="Included vs limited vs not included" />

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-[860px] w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-50">Category</th>
                    <th className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-50">Feature</th>
                    <th className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-50">Basic</th>
                    <th className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-50">Pro</th>
                    <th className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-50">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((r, idx) => (
                    <tr
                      key={`${r.category}-${r.feature}-${idx}`}
                      className={cn(
                        "border-t border-slate-200 dark:border-slate-800",
                        idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-950/20"
                      )}
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">{r.category}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-50 font-bold">{r.feature}</td>
                      <td className="px-4 py-3"><StatusCell cell={r.basic} /></td>
                      <td className="px-4 py-3"><StatusCell cell={r.pro} /></td>
                      <td className="px-4 py-3"><StatusCell cell={r.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              “Limited” usually means usage caps (Dealz counts, crew seats, history retention) or reduced automation.
            </div>
          </div>

          {/* Enterprise Callout */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-2xl border flex items-center justify-center"
                  style={{ background: "rgba(15,23,42,0.08)", borderColor: "rgba(15,23,42,0.15)" }}
                >
                  <Building2 className="h-6 w-6" style={{ color: THEME.secondary }} />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">Enterprise for Agencies</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Manage multiple creators with governance, approvals, exports, and centralized billing.
                  </div>

                  <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    {[
                      "Multi-creator roster, roles & permissions, approvals, audit exports",
                      "Central billing + invoice controls, optional purchase orders",
                      "Optional SSO + API/webhooks for workflow automation",
                      "Dedicated success manager + SLA options",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mt-0.5" />
                        <span className="min-w-0">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <SecondaryButton onClick={() => setDrawerSales(true)}>Contact Sales</SecondaryButton>
                <GhostButton onClick={() => setDrawerGov(true)}>Governance</GhostButton>
              </div>
            </div>
          </div>

          {/* FAQ + Recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
              <SectionTitle icon={<ShieldCheck className="h-5 w-5" style={{ color: THEME.primary }} />} title="FAQ" subtitle="Fast answers for creators and agencies" />

              <div className="mt-4 space-y-3">
                {[
                  {
                    q: "Does upgrading change my Rank?",
                    a: "No. Rank is performance-based. Subscriptions unlock tools but do not change Rank or Rank thresholds.",
                  },
                  {
                    q: "Can I downgrade later?",
                    a: "Yes. You can downgrade at any time. Some Pro features may become limited again based on your plan.",
                  },
                  {
                    q: "What’s the difference between Pro and Enterprise?",
                    a: "Pro is for individual creators who need unlimited tools. Enterprise is for agencies and teams with governance, approvals, exports, and centralized billing.",
                  },
                  {
                    q: "What are add-ons?",
                    a: "Add-ons are optional paid upgrades like extra seats, extra storage, scheduled reports, and advanced compliance without changing your core plan.",
                  },
                ].map((item) => (
                  <div key={item.q} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{item.q}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{item.a}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
              <SectionTitle icon={<Sparkles className="h-5 w-5" style={{ color: THEME.primary }} />} title="Need a recommendation?" subtitle="Quick guidance" />

              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Most creators choose Pro</div>
                <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  If you run lives weekly, collaborate with sellers, or publish Shoppable Adz regularly, Pro removes limits and unlocks automation.
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <PrimaryButton
                    onClick={() => (plan === "pro" ? showInfo("You are already on Pro.") : applyPlan("pro"))}
                    className="!w-full"
                  >
                    {plan === "pro" ? "You’re on Pro" : "Upgrade to Pro"}
                  </PrimaryButton>

                  <GhostButton
                    onClick={() => {
                      showInfo("Enterprise is best for agencies managing multiple creators.");
                      setDrawerSales(true);
                    }}
                    className="!w-full"
                  >
                    Explore Enterprise
                  </GhostButton>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Suggested next steps</div>
                <div className="mt-2 space-y-2">
                  {[
                    { t: "Review Stream to Platforms", p: "/Stream-platform" },
                    { t: "Set up Overlays & CTAs", p: "/overlays-ctas" },
                    { t: "Enable Audience Notifications", p: "/audience-notification" },
                    { t: "Publish Post-Live Clips", p: "/post-live" },
                  ].map((x) => (
                    <button
                      key={x.t}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950 transition-colors"
                      onClick={() => navigate(x.p)}
                    >
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{x.t}</span>
                      <ExternalLink className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-600 dark:text-slate-300">
                Note: This page is demo-ready. Wire it to your real billing backend and enforce limits at the API/feature-gate layer.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Billing Drawer */}
      <SideDrawer
        open={drawerBilling}
        onClose={() => setDrawerBilling(false)}
        title="Billing"
        subtitle="Manage payment method, billing contact, and preferences"
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Changes here are demo-only.
            </div>
            <div className="flex items-center gap-2">
              <GhostButton onClick={() => setDrawerBilling(false)}>Cancel</GhostButton>
              <PrimaryButton
                onClick={() => {
                  if (plan === "basic") {
                    showWarning("Add billing on Pro/Enterprise. Upgrade to continue.");
                    return;
                  }
                  showSuccess("Billing updated successfully (demo).");
                  setDrawerBilling(false);
                }}
              >
                Save
              </PrimaryButton>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Plan billing status</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {plan === "basic" ? "Free plan — upgrade to add payment." : `Active billing — ${fmtMoney(price)} / ${cycle}`}
                </div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <CreditCard className="h-5 w-5" style={{ color: THEME.secondary }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Field label="Billing contact name">
              <TextInput value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Jane Doe" />
            </Field>
            <Field label="Billing email">
              <TextInput value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="billing@company.com" />
            </Field>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Payment method</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <Field label="Card number" hint="Demo only. Do not enter real card details.">
                <TextInput value={billingCard} onChange={(e) => setBillingCard(e.target.value)} placeholder="4242 4242 4242 4242" />
              </Field>
              <Field label="Expiry">
                <TextInput value={billingExpiry} onChange={(e) => setBillingExpiry(e.target.value)} placeholder="MM/YY" />
              </Field>
            </div>
            {plan === "basic" ? (
              <div className="mt-3">
                <PrimaryButton onClick={() => applyPlan("pro")}>
                  Upgrade to Pro to enable billing
                </PrimaryButton>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Preferences</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Use invoices for accounting and add-ons to scale seats/storage.</div>
          </div>
        </div>
      </SideDrawer>

      {/* Invoices Drawer */}
      <SideDrawer
        open={drawerInvoices}
        onClose={() => setDrawerInvoices(false)}
        title="Invoices"
        subtitle="View and download invoices"
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-600 dark:text-slate-300">Showing demo invoices</div>
            <GhostButton onClick={() => setDrawerInvoices(false)}>Close</GhostButton>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Latest invoices</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Download receipts for your records.</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <FileText className="h-5 w-5" style={{ color: THEME.secondary }} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="grid grid-cols-12 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
              <div className="col-span-6">Invoice</div>
              <div className="col-span-3">Date</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1" />
            </div>
            {invoiceRows.map((inv, idx) => (
              <div
                key={inv.id}
                className={cn(
                  "grid grid-cols-12 px-3 py-3 items-center",
                  idx === 0 ? "bg-slate-50 dark:bg-slate-950/40" : "bg-white dark:bg-slate-950"
                )}
              >
                <div className="col-span-6">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{inv.id}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">Status: {inv.status}</div>
                </div>
                <div className="col-span-3 text-sm text-slate-700 dark:text-slate-200">{inv.date}</div>
                <div className="col-span-2 text-right text-sm font-extrabold text-slate-900 dark:text-slate-50">{inv.amount}</div>
                <div className="col-span-1 flex justify-end">
                  <button
                    className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center justify-center"
                    onClick={() => showInfo(`Downloading ${inv.id} (demo).`)}
                    aria-label="Download invoice"
                  >
                    <Receipt className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {plan === "basic" ? (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/60 dark:bg-amber-500/10 p-3">
              <div className="text-sm font-extrabold text-amber-900 dark:text-amber-200">Upgrade to generate invoices</div>
              <div className="text-sm text-amber-900/80 dark:text-amber-200/80 mt-1">
                Free plan doesn’t create invoices. Upgrade to Pro to get receipts and billing history.
              </div>
              <div className="mt-3">
                <PrimaryButton onClick={() => applyPlan("pro")}>Upgrade to Pro</PrimaryButton>
              </div>
            </div>
          ) : null}
        </div>
      </SideDrawer>

      {/* Contact Sales Drawer */}
      <SideDrawer
        open={drawerSales}
        onClose={() => setDrawerSales(false)}
        title="Contact Sales"
        subtitle="Tell us about your agency needs — we’ll set you up"
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-600 dark:text-slate-300">We reply fast (demo).</div>
            <div className="flex items-center gap-2">
              <GhostButton onClick={() => setDrawerSales(false)}>Cancel</GhostButton>
              <SecondaryButton
                onClick={() => {
                  if (!salesEmail.trim()) {
                    showWarning("Please add an email address.");
                    return;
                  }
                  showSuccess("Sales request sent (demo). We'll reach out soon.");
                  setDrawerSales(false);
                }}
              >
                Send
              </SecondaryButton>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Enterprise (Agency)</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Custom seats, governance, billing, and enablement.</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <Mail className="h-5 w-5" style={{ color: THEME.secondary }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Field label="Your name">
              <TextInput value={salesContactName} onChange={(e) => setSalesContactName(e.target.value)} placeholder="Your name" />
            </Field>
            <Field label="Email" hint="We’ll send a confirmation here.">
              <TextInput value={salesEmail} onChange={(e) => setSalesEmail(e.target.value)} placeholder="you@agency.com" />
            </Field>
            <Field label="Company / Agency">
              <TextInput value={salesCompany} onChange={(e) => setSalesCompany(e.target.value)} placeholder="Your agency" />
            </Field>
            <Field label="Team size">
              <TextInput value={salesTeamSize} onChange={(e) => setSalesTeamSize(e.target.value)} placeholder="e.g., 10" />
            </Field>
            <Field label="What do you need?">
              <TextArea value={salesMessage} onChange={(e) => setSalesMessage(e.target.value)} rows={4} placeholder="Tell us about creators, workflows, approvals, etc." />
            </Field>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">What you’ll get</div>
            <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              {[
                "Agency roster, seats, and approvals",
                "Central billing and invoices",
                "Audit exports and advanced security options",
                "Dedicated success manager and SLA options",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mt-0.5" />
                  <span className="min-w-0">{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <GhostButton
                onClick={() => {
                  setDrawerSales(false);
                  setDrawerGov(true);
                }}
              >
                Preview governance
              </GhostButton>
            </div>
          </div>
        </div>
      </SideDrawer>

      {/* Governance Drawer */}
      <SideDrawer
        open={drawerGov}
        onClose={() => setDrawerGov(false)}
        title="Governance"
        subtitle="Roles, permissions, approvals, and audit controls"
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-600 dark:text-slate-300">Enterprise feature set</div>
            <div className="flex items-center gap-2">
              <GhostButton onClick={() => setDrawerGov(false)}>Close</GhostButton>
              <PrimaryButton
                onClick={() => {
                  setDrawerGov(false);
                  navigate("/roles-permissions");
                }}
              >
                Open page
              </PrimaryButton>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Agency controls</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Keep campaigns compliant with approvals, role-based access, and exports.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              {
                title: "Roles & permissions",
                desc: "Assign Admin, Manager, Editor, and Viewer access across creators and campaigns.",
              },
              {
                title: "Approvals workflow",
                desc: "Require approval before going live, publishing Shoppable Adz, or launching Live + Shoppables.",
              },
              {
                title: "Audit exports",
                desc: "Export activity logs for compliance and reporting.",
              },
              {
                title: "Central billing",
                desc: "Manage seats, invoices, and billing rules in one place.",
              },
            ].map((x) => (
              <div key={x.title} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{x.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{x.desc}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Want Enterprise enabled?</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">Contact Sales and we’ll provision your agency workspace.</div>
            <div className="mt-3">
              <SecondaryButton
                onClick={() => {
                  setDrawerGov(false);
                  setDrawerSales(true);
                }}
              >
                Contact Sales
              </SecondaryButton>
            </div>
          </div>
        </div>
      </SideDrawer>

      <ToastStack />
    </>
  );
}

export default function MySubscriptionPage() {
  const inRouter = useInRouterContext();

  // Standalone preview safety: if not already inside a Router, wrap it.
  if (!inRouter) {
    return (
      <MemoryRouter>
        <MySubscriptionPageInner />
      </MemoryRouter>
    );
  }

  return <MySubscriptionPageInner />;
}
