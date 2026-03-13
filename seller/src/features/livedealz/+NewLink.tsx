import React, { useEffect, useMemo, useRef, useState, type ReactNode, type ChangeEvent } from "react";
/*************************************************
 * Link Tools (Supplier) — Previewable (Orange Primary)
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: link tools creator orange primary
 *
 * Mirror-first preserved:
 * - Top toolbox card: campaign selector + link variant selector
 * - Main link panel: Copy/Open/Short/Share actions
 * - Tool cards grid: Copy, Short link, QR, WhatsApp, WeChat, Open
 * - Custom message field + WeChat modal + toast
 * - Orange as primary across core CTAs and badges
 * - WhatsApp/WeChat remain green outline with green hover fill
 *
 * Supplier adaptations (minimal + required):
 * - Supplier owns campaigns; link variants include:
 *   • Public campaign link (no ref)
 *   • Creator referral links (ref=CR-xxxx) for campaigns that use creators
 *   • Supplier attribution link (ref=SUP-xxxx) when Supplier acts as Creator
 *   • Platform source links (src=tiktok/ig/etc)
 *   • Region links (region=...)
 *   • Promo code links (promo=...)
 * - “+ New Link” opens a creation modal that adds a new link variant.
 * - Role awareness: if campaign is "I will NOT use a Creator", creator-link type is disabled.
 * - Permission note: in production, creation/edit requires RBAC (Owner/Collabs Manager).
 *************************************************/

/************** Tokens **************/
const TOKENS = {
  brandOrange: "#f77f00",
  ink: "#111827",
  card: "rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm",
  pill: "rounded-full",
  btn: "rounded-xl",
};

const BRAND = {
  whatsapp: "#25D366",
  wechat: "#07C160",
  black: "#111827",
};

const cx = (...xs: Array<string | undefined | null | false>): string => xs.filter(Boolean).join(" ");

/************** Types **************/
interface Supplier {
  name: string;
  handle: string;
  verified: boolean;
}

interface Creator {
  id: string;
  name: string;
  handle: string;
  verified: boolean;
  status: "Active" | "Invited" | "Pending";
  region: string;
}

type CreatorUsageDecision = "I will use a Creator" | "I will NOT use a Creator" | "I am NOT SURE yet";

type LinkKind =
  | "Public campaign link"
  | "Creator referral link"
  | "Supplier attribution link"
  | "Platform source link"
  | "Region link"
  | "Promo code link";

interface CampaignLink {
  id: string;
  label: string;
  url: string;
  kind: LinkKind;
  meta?: Record<string, string>;
}

interface Campaign {
  id: string;
  title: string;
  slug: string;
  hero: string;
  supplier: Supplier;
  creatorUsageDecision: CreatorUsageDecision;
  commissionPct: number; // what the supplier pays creators (in general)
  surfaces: string[];
  creators: Creator[];
  links: CampaignLink[];
}

declare global {
  interface Window {
    __LINK_TOOLS_SUPPLIER_TESTS__?: Array<{ name: string; pass: boolean }>;
  }
}

/************** Utilities **************/
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(!!mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener("change", update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update);
    };
  }, []);
  return reduced;
}

function safeCopy(text: string | number | null | undefined): Promise<void> {
  const t = String(text || "");
  return new Promise<void>((resolve) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard
          .writeText(t)
          .then(() => resolve())
          .catch(() => resolve());
        return;
      }
    } catch {
      // Clipboard API not available
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // Fallback copy failed
    }
    resolve();
  });
}

function placeholder(label: string | null | undefined): string {
  const safe = encodeURIComponent(String(label || ""));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='600'>
    <defs>
      <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
        <stop offset='0%' stop-color='#f3f4f6'/>
        <stop offset='100%' stop-color='#e5e7eb'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
      font-family='Arial' font-size='26' fill='#6b7280'>${safe}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function buildCampaignLink(slug: string | null | undefined): string {
  const s = String(slug || "").trim() || "my-shoppable-adz";
  return `https://mylivedealz.com/a/${encodeURIComponent(s)}`;
}

function appendParam(url: string, key: string, value: string) {
  if (!url) return "";
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function buildCreatorReferralLink(slug: string, creatorRef: string): string {
  return appendParam(buildCampaignLink(slug), "ref", creatorRef);
}

function buildSupplierRefLink(slug: string, supplierRef: string): string {
  return appendParam(buildCampaignLink(slug), "ref", supplierRef);
}

// Deterministic short code (preview-only)
function hashString(str: string | null | undefined): number {
  const s = String(str || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shortLinkFromUrl(url: string | null | undefined): string {
  const h = hashString(url);
  const code = h.toString(36).slice(0, 7);
  return `https://mylivedealz.com/s/${code}`;
}

function isLikelyUrl(u: string) {
  return /^https?:\/\//i.test(String(u || "").trim());
}

/************** Icons **************/
const Icon = {
  Link: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13" />
      <path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 1 1-7-7L7 11" />
    </svg>
  ),
  Copy: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <rect x="4" y="4" width="11" height="11" rx="2" />
    </svg>
  ),
  External: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M14 3h7v7" />
      <path d="M10 14L21 3" />
      <path d="M21 14v7H3V3h7" />
    </svg>
  ),
  Share: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 16V3" />
      <path d="M7 8l5-5 5 5" />
    </svg>
  ),
  QR: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" />
      <path d="M14 14h3v3h-3zM20 14h1v1h-1zM18 18h3v3h-3z" />
    </svg>
  ),
  WhatsApp: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M21 12a8.5 8.5 0 0 1-12.9 7.4L3 21l1.7-5.1A8.5 8.5 0 1 1 21 12z" />
      <path d="M9.2 9.2c.3-.8.7-.9 1.2-.9h.5c.2 0 .4 0 .6.4l.8 1.9c.1.3.1.6-.1.8l-.6.6c-.2.2-.2.4-.1.6.6 1.2 1.5 2.1 2.7 2.7.2.1.4.1.6-.1l.6-.6c.2-.2.5-.2.8-.1l1.9.8c.4.2.4.4.4.6v.5c0 .5-.1.9-.9 1.2-.8.3-2.5.3-4.7-1.2-2.2-1.5-3.6-3.8-3.9-4.7-.3-.9-.3-1.4.2-2.4z" />
    </svg>
  ),
  WeChat: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M10.5 12.5c-3 0-5.5-2-5.5-4.5S7.5 3.5 10.5 3.5s5.5 2 5.5 4.5-2.5 4.5-5.5 4.5z" />
      <path d="M7.5 12.3 6 15l3.1-1" />
      <path d="M14.5 20.5c-3 0-5.5-2-5.5-4.5s2.5-4.5 5.5-4.5S20 13.5 20 16s-2.5 4.5-5.5 4.5z" />
      <path d="M17.5 20.3 19 23l-3.1-1" />
      <path d="M9 7h.01" />
      <path d="M12 7h.01" />
      <path d="M13.5 15h.01" />
      <path d="M16.5 15h.01" />
    </svg>
  ),
  ChevronDown: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  X: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Plus: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
};

/************** UI **************/
function PageHeader({
  pageTitle,
  badge,
  actions,
}: {
  pageTitle: string;
  badge?: ReactNode;
  actions?: ReactNode;
  mobileViewType?: "hide" | "show";
}) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 truncate">{pageTitle}</div>
          {badge ? <div className="mt-1 flex flex-wrap items-center gap-2">{badge}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

interface BadgeProps {
  children: ReactNode;
  tone?: "good" | "warn" | "danger" | "brand" | "neutral";
}

function Badge({ children, tone = "neutral" }: BadgeProps) {
  const base = cx("inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold border transition-colors", TOKENS.pill);
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700"
        : tone === "danger"
          ? "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700"
          : tone === "brand"
            ? "bg-[#f77f00] text-white border-transparent"
            : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600";
  return <span className={cx(base, cls)}>{children}</span>;
}

interface ButtonProps {
  variant?: "primary" | "neutral" | "outline" | "danger";
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit" | "reset";
}

function Button({ variant = "primary", className, children, onClick, disabled, title, type = "button" }: ButtonProps) {
  const base = cx(
    "inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-extrabold select-none",
    TOKENS.btn,
    disabled ? "opacity-60 cursor-not-allowed" : "active:scale-[0.99] transition-transform",
    className
  );

  const style =
    variant === "primary"
      ? "bg-[#f77f00] text-white hover:opacity-95"
      : variant === "neutral"
        ? "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors"
        : variant === "outline"
          ? "border border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-900 dark:hover:bg-slate-600 hover:text-white transition-colors"
          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors";

  return (
    <button type={type} className={cx(base, style)} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  reducedMotion: boolean;
  widthClassName?: string;
}

function Modal({ open, title, children, onClose, reducedMotion, widthClassName }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-3" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/40 dark:bg-black/60" aria-label="Close" onClick={onClose} />
      <div
        className={cx(
          "relative w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 shadow-2xl transition-colors",
          widthClassName || "max-w-lg",
          reducedMotion ? "" : "transition-transform"
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{title}</div>
          </div>
          <button
            className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 p-2 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon.X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors">{children}</div>
      </div>
    </div>
  );
}


interface SideDrawerProps {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  reducedMotion: boolean;
  widthClassName?: string;
}

function SideDrawer({ open, title, subtitle, children, footer, onClose, reducedMotion, widthClassName }: SideDrawerProps) {
  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const duration = reducedMotion ? 0 : 180;

    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setActive(true));
      return () => cancelAnimationFrame(id);
    }

    setActive(false);
    const t = window.setTimeout(() => setMounted(false), duration);
    return () => window.clearTimeout(t);
  }, [open, reducedMotion]);

  useEffect(() => {
    if (!mounted) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  const duration = reducedMotion ? 0 : 180;

  return (
    <div className="fixed inset-0 z-[85] flex" role="dialog" aria-modal="true" aria-label={title}>
      <button
        className={cx(
          "absolute inset-0 bg-black/40 dark:bg-black/60 transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
        style={duration ? { transitionDuration: `${duration}ms` } : undefined}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cx(
          "relative ml-auto h-full w-full bg-white dark:bg-slate-900 dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col transition-transform",
          widthClassName || "max-w-2xl"
        )}
        style={
          duration
            ? { transform: active ? "translateX(0)" : "translateX(100%)", transitionDuration: `${duration}ms` }
            : { transform: "translateX(0)" }
        }
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{subtitle}</div> : null}
          </div>
          <button
            className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 p-2 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <Icon.X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}


interface BrandOutlineButtonProps {
  color: string;
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  emphasis?: boolean;
}

function BrandOutlineButton({ color, icon, children, onClick, title, disabled, emphasis = false }: BrandOutlineButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={!!disabled}
      style={{ "--b": color } as React.CSSProperties}
      className={cx(
        "brandOutline inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-extrabold select-none border transition-colors",
        TOKENS.btn,
        emphasis ? "shadow-sm" : "",
        disabled ? "opacity-60 cursor-not-allowed" : "active:scale-[0.99] transition-transform",
        "bg-white dark:bg-slate-900 dark:bg-slate-800"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

interface ToolCardProps {
  title: string;
  desc: string;
  children: ReactNode;
}

function ToolCard({ title, desc, children }: ToolCardProps) {
  return (
    <div className={cx(TOKENS.card, "p-4 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors")}> 
      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{desc}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/************** Data (Supplier) **************/
const SUPPLIER: Supplier = { name: "EVzone Store", handle: "@evzone", verified: true };

const CREATOR_POOL: Creator[] = [
  { id: "CR-7782", name: "EVzone Creator", handle: "@EVzoneCreator", verified: true, status: "Active", region: "East Africa" },
  { id: "CR-1129", name: "GlowQueen", handle: "@glowqueen", verified: true, status: "Invited", region: "East Africa" },
  { id: "CR-0451", name: "TechNerd", handle: "@technerd", verified: false, status: "Pending", region: "Africa / Asia" },
];

const ACTIVE_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp_1",
    title: "Holiday EV Dealz",
    slug: "holiday-ev-dealz",
    hero: placeholder("Holiday EV Dealz"),
    supplier: SUPPLIER,
    creatorUsageDecision: "I will use a Creator",
    commissionPct: 8,
    surfaces: ["SHOPPABLE_ADZ", "LIVE_SESSIONZ"],
    creators: [CREATOR_POOL[0], CREATOR_POOL[1]],
    links: [
      {
        id: "lnk_public",
        label: "Public campaign link",
        kind: "Public campaign link",
        url: buildCampaignLink("holiday-ev-dealz"),
      },
      {
        id: "lnk_creator_default",
        label: "Creator: EVzone Creator",
        kind: "Creator referral link",
        url: buildCreatorReferralLink("holiday-ev-dealz", "CR-7782"),
        meta: { creatorRef: "CR-7782" },
      },
      {
        id: "lnk_tiktok",
        label: "TikTok source",
        kind: "Platform source link",
        url: appendParam(buildCampaignLink("holiday-ev-dealz"), "src", "tiktok"),
        meta: { src: "tiktok" },
      },
    ],
  },
  {
    id: "cmp_2",
    title: "Supplier-only Promo Sprint",
    slug: "supplier-only-promo-sprint",
    hero: placeholder("Supplier-only Promo Sprint"),
    supplier: { name: "ChargePro Services", handle: "@chargepro", verified: false },
    creatorUsageDecision: "I will NOT use a Creator",
    commissionPct: 0,
    surfaces: ["SHOPPABLE_ADZ"],
    creators: [],
    links: [
      {
        id: "lnk_public",
        label: "Public campaign link",
        kind: "Public campaign link",
        url: buildCampaignLink("supplier-only-promo-sprint"),
      },
      {
        id: "lnk_supplier_ref",
        label: "Supplier attribution",
        kind: "Supplier attribution link",
        url: buildSupplierRefLink("supplier-only-promo-sprint", "SUP-9021"),
        meta: { supplierRef: "SUP-9021" },
      },
      {
        id: "lnk_wa",
        label: "WhatsApp source",
        kind: "Platform source link",
        url: appendParam(buildCampaignLink("supplier-only-promo-sprint"), "src", "whatsapp"),
        meta: { src: "whatsapp" },
      },
    ],
  },
];

/************** Page **************/
export default function SupplierLinkToolsOrangePrimaryPreviewable() {
  const reducedMotion = usePrefersReducedMotion();

  // Toast
  const [toast, setToast] = useState("");
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string | number) => {
    setToast(String(msg || ""));
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(""), 1600);
  };
  useEffect(() => {
    return () => {
      if (toastRef.current) clearTimeout(toastRef.current);
    };
  }, []);

  // Data is local for preview but mutable in-page for "New Link".
  const [campaigns, setCampaigns] = useState<Campaign[]>(ACTIVE_CAMPAIGNS);

  // Selection
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id || "");
  const campaign = useMemo(() => campaigns.find((c) => c.id === campaignId) || null, [campaigns, campaignId]);

  const [linkId, setLinkId] = useState(campaigns[0]?.links?.[0]?.id || "");
  useEffect(() => {
    const first = campaign?.links?.[0]?.id;
    setLinkId((prev) => (campaign?.links?.some((l) => l.id === prev) ? prev : first || ""));
  }, [campaign]);

  const linkItem = useMemo(() => (campaign?.links || []).find((l) => l.id === linkId) || null, [campaign, linkId]);
  const link = linkItem?.url || "";

  // Share message
  const [message, setMessage] = useState("Check out these Dealz 👇");

  // Short link (preview deterministic)
  const shortLink = useMemo(() => (link ? shortLinkFromUrl(link) : ""), [link]);

  // QR (preview endpoint)
  const qrUrl = useMemo(
    () => (link ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}` : ""),
    [link]
  );

  // WeChat modal
  const [wechatOpen, setWechatOpen] = useState(false);

  // New Link drawer
  const [newLinkOpen, setNewLinkOpen] = useState(false);
  const [newKind, setNewKind] = useState<LinkKind>("Platform source link");
  const [newLabel, setNewLabel] = useState("");
  const [newPlatform, setNewPlatform] = useState("tiktok");
  const [newRegion, setNewRegion] = useState("East Africa");
  const [newPromo, setNewPromo] = useState("FLASH10");
  const [newCreatorRef, setNewCreatorRef] = useState(campaign?.creators?.[0]?.id || "CR-7782");

  useEffect(() => {
    // When switching campaigns, pick first active creator if any
    setNewCreatorRef(campaign?.creators?.[0]?.id || "CR-7782");
  }, [campaign?.id]);

  const shareText = useMemo(() => {
    if (!link) return "";
    return `${message}\n${link}`;
  }, [message, link]);

  const openWhatsApp = () => {
    if (!link) return;
    const u = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    try {
      window.open(u, "_blank", "noreferrer");
    } catch {
      // Window open failed
    }
  };

  const openLink = (u: string) => {
    if (!u) return;
    window.open(u, "_blank", "noreferrer");
  };

  const copy = async (txt: string, label?: string) => {
    await safeCopy(txt);
    showToast(label || "Copied");
  };

  const shareLink = async (urlToShare: string) => {
    if (!urlToShare) return;
    try {
      if (navigator?.share) {
        await navigator.share({
          title: campaign?.title || "Campaign",
          text: message || "",
          url: urlToShare,
        });
        showToast("Share opened");
        return;
      }
    } catch {
      // fall through
    }
    await safeCopy(urlToShare);
    showToast("Copied (share)");
  };

  const canCreateCreatorLinks = campaign?.creatorUsageDecision === "I will use a Creator";
  const supplierActsAsCreator = campaign?.creatorUsageDecision === "I will NOT use a Creator";

  const newLinkPreview = useMemo(() => {
    const slug = campaign?.slug || "";
    const base = buildCampaignLink(slug);

    if (!slug) return "";

    if (newKind === "Public campaign link") return base;

    if (newKind === "Creator referral link") {
      if (!canCreateCreatorLinks) return "";
      return buildCreatorReferralLink(slug, newCreatorRef || "CR-0000");
    }

    if (newKind === "Supplier attribution link") {
      // Supplier as Creator, or for internal attribution.
      const ref = supplierActsAsCreator ? "SUP-9021" : "SUP-0001";
      return buildSupplierRefLink(slug, ref);
    }

    if (newKind === "Platform source link") {
      return appendParam(base, "src", newPlatform || "tiktok");
    }

    if (newKind === "Region link") {
      return appendParam(base, "region", newRegion || "East Africa");
    }

    if (newKind === "Promo code link") {
      return appendParam(base, "promo", newPromo || "FLASH10");
    }

    return base;
  }, [campaign?.slug, newKind, newPlatform, newRegion, newPromo, newCreatorRef, canCreateCreatorLinks, supplierActsAsCreator]);

  const saveNewLink = () => {
    // Permission note: RBAC gating should be enforced here in production.
    if (!campaign) {
      showToast("Select a campaign");
      return;
    }
    const label = String(newLabel || "").trim();
    if (!label) {
      showToast("Label is required");
      return;
    }

    if (!newLinkPreview || !isLikelyUrl(newLinkPreview)) {
      showToast("Link preview is not valid");
      return;
    }

    const exists = (campaign.links || []).some((l) => l.label.toLowerCase() === label.toLowerCase());
    if (exists) {
      showToast("Label already exists");
      return;
    }

    const id = `lnk_${hashString(label + newLinkPreview).toString(36).slice(0, 8)}`;

    const meta: Record<string, string> = {};
    if (newKind === "Creator referral link") meta.creatorRef = newCreatorRef;
    if (newKind === "Platform source link") meta.src = newPlatform;
    if (newKind === "Region link") meta.region = newRegion;
    if (newKind === "Promo code link") meta.promo = newPromo;

    const newLink: CampaignLink = {
      id,
      label,
      url: newLinkPreview,
      kind: newKind,
      meta,
    };

    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== campaign.id) return c;
        return { ...c, links: [newLink, ...(c.links || [])] };
      })
    );

    // select it
    setLinkId(id);

    showToast("Link created");
    setNewLinkOpen(false);
    setNewLabel("");
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <style>{`
        /* Orange primary + brand outlines (mirrors creator file) */
        .brandOutline { border-color: var(--b); color: var(--b); background:var(--surface-1); }
        .brandOutline:hover { background: var(--b); color: #fff; }
        .brandOutline:disabled:hover { background:var(--surface-1); color: var(--b); }
        .dark .brandOutline { background: rgb(30 41 59); }
        .dark .brandOutline:hover { background: var(--b); }
        .dark .brandOutline:disabled:hover { background: rgb(30 41 59); }
      `}</style>

      <PageHeader
        pageTitle="Link Tools"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
            <span>🔗</span>
            <span>Share & manage links</span>
          </span>
        }
        actions={
          <>
            <Button variant="primary" onClick={() => setNewLinkOpen(true)} title="Create a new tracking link variant">
              <Icon.Plus className="w-4 h-4" /> + New Link
            </Button>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-4 overflow-y-auto overflow-x-hidden">
        {/* Toolbox Top */}
        <section className={cx(TOKENS.card, "p-4 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors")}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div className="min-w-0 flex items-start gap-3">
              <img
                src={campaign?.hero || placeholder("Campaign")}
                alt={campaign?.title || "Campaign"}
                className="h-16 w-24 rounded-2xl border border-slate-200 dark:border-slate-700 object-cover bg-slate-100 dark:bg-slate-700"
              />
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{campaign?.title || "Select a campaign"}</div>
                <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">
                  {campaign?.supplier?.name || ""} · {campaign?.supplier?.handle || ""}
                  {campaign?.supplier?.verified ? " · Verified" : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {campaign?.creatorUsageDecision === "I will use a Creator" ? (
                    <Badge tone="brand">Creator collabs enabled</Badge>
                  ) : campaign?.creatorUsageDecision === "I will NOT use a Creator" ? (
                    <Badge tone="warn">Supplier acts as Creator</Badge>
                  ) : (
                    <Badge tone="neutral">Creator plan pending</Badge>
                  )}
                  <Badge tone="brand">Commission {campaign?.commissionPct ?? 0}%</Badge>
                  <Badge>{(campaign?.surfaces || []).includes("LIVE_SESSIONZ") ? "Shoppable + Live" : "Shoppable only"}</Badge>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Campaign</div>
              <div className="mt-1 relative">
                <select
                  value={campaignId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setCampaignId(e.target.value)}
                  className={cx(
                    "w-full appearance-none px-3 py-2 text-sm font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors",
                    TOKENS.btn
                  )}
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  <Icon.ChevronDown className="w-4 h-4" />
                </span>
              </div>

              <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Link variant</div>
              <div className="mt-1 relative">
                <select
                  value={linkId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setLinkId(e.target.value)}
                  className={cx(
                    "w-full appearance-none px-3 py-2 text-sm font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors",
                    TOKENS.btn
                  )}
                >
                  {(campaign?.links || []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  <Icon.ChevronDown className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 p-3 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Main link</div>
                <div className="mt-1 text-[12px] font-extrabold text-slate-900 dark:text-slate-100 break-all">{link || "—"}</div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Type: <span className="font-extrabold text-slate-900 dark:text-slate-100">{linkItem?.kind || "—"}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <BrandOutlineButton
                  color={TOKENS.brandOrange}
                  icon={<Icon.Plus className="w-4 h-4" />}
                  onClick={() => setNewLinkOpen(true)}
                  title="Create a new link variant"
                  emphasis
                >
                  New link
                </BrandOutlineButton>
              </div>
            </div>

            {/* Orange primary actions */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <BrandOutlineButton
                color={TOKENS.brandOrange}
                icon={<Icon.Copy className="w-4 h-4" />}
                onClick={() => copy(link, "Link copied")}
                disabled={!link}
                title="Copy link"
                emphasis
              >
                Copy
              </BrandOutlineButton>
              <BrandOutlineButton
                color={TOKENS.brandOrange}
                icon={<Icon.External className="w-4 h-4" />}
                onClick={() => openLink(link)}
                disabled={!link}
                title="Open link"
              >
                Open
              </BrandOutlineButton>
              <Button variant="primary" onClick={() => copy(shortLink, "Short link copied")} disabled={!shortLink} title="Copy short link">
                <Icon.Link className="w-4 h-4" /> Copy short
              </Button>
              <Button variant="neutral" onClick={() => openLink(shortLink)} disabled={!shortLink} title="Open short link">
                <Icon.External className="w-4 h-4" /> Open short
              </Button>
            </div>

            <div className="mt-2">
              <Button variant="primary" className="w-full" onClick={() => shareLink(link)} disabled={!link} title="Share link">
                <Icon.Share className="w-4 h-4" /> Share link
              </Button>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Short link (preview): <span className="font-extrabold text-slate-900 dark:text-slate-100 break-all">{shortLink || "—"}</span>
            </div>
          </div>
        </section>

        {/* Tool cards grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <ToolCard title="Copy link" desc="Copy the tracking link to your clipboard.">
            <div className="grid grid-cols-2 gap-2">
              <BrandOutlineButton
                color={TOKENS.brandOrange}
                icon={<Icon.Copy className="w-4 h-4" />}
                onClick={() => copy(link, "Link copied")}
                disabled={!link}
                emphasis
                title="Copy link"
              >
                Copy link
              </BrandOutlineButton>
              <Button variant="primary" onClick={() => shareLink(link)} disabled={!link} title="Share via system share (share if available)">
                <Icon.Share className="w-4 h-4" /> Share
              </Button>
            </div>
          </ToolCard>

          <ToolCard title="Short link" desc="Preview: deterministic code. Production: backend generated + stored.">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 p-3 transition-colors">
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Short link</div>
              <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100 break-all">{shortLink || "—"}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => copy(shortLink, "Short link copied")} disabled={!shortLink} title="Copy short link">
                <Icon.Copy className="w-4 h-4" /> Copy
              </Button>
              <Button variant="neutral" onClick={() => openLink(shortLink)} disabled={!shortLink} title="Open short link">
                <Icon.External className="w-4 h-4" /> Open
              </Button>
            </div>
          </ToolCard>

          <ToolCard title="Share QR Code" desc="QR-first sharing. Scan it, or share the QR image link.">
            <div className="grid place-items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 p-3 transition-colors">
              {qrUrl ? (
                <button
                  type="button"
                  onClick={() => openLink(qrUrl)}
                  className={cx(
                    "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 overflow-hidden transition-colors",
                    reducedMotion ? "" : "transition-transform active:scale-[0.99]"
                  )}
                  title="Open QR image"
                >
                  <img
                    src={qrUrl}
                    alt="QR"
                    className="h-44 w-44 object-cover bg-white dark:bg-slate-900 dark:bg-slate-800"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = placeholder("QR");
                    }}
                  />
                </button>
              ) : (
                <div className="text-xs text-slate-600 dark:text-slate-300">Select a link</div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="neutral" onClick={() => copy(link, "Link copied")} disabled={!link} title="Copy link">
                <Icon.Copy className="w-4 h-4" /> Copy link
              </Button>
              <Button variant="primary" onClick={() => shareLink(qrUrl)} disabled={!qrUrl} title="Share QR image link (share if available)">
                <Icon.Share className="w-4 h-4" /> Share QR
              </Button>
            </div>
          </ToolCard>

          <ToolCard title="WhatsApp share" desc="Opens WhatsApp with your message + link.">
            <BrandOutlineButton color={BRAND.whatsapp} icon={<Icon.WhatsApp className="w-5 h-5" />} onClick={openWhatsApp} disabled={!link} title="Share on WhatsApp">
              Share on WhatsApp
            </BrandOutlineButton>
            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 p-3 text-[11px] text-slate-600 dark:text-slate-300 break-all transition-colors">{shareText || ""}</div>
          </ToolCard>

          <ToolCard title="WeChat share" desc="QR-first: open modal with QR + copy link.">
            <BrandOutlineButton color={BRAND.wechat} icon={<Icon.WeChat className="w-5 h-5" />} onClick={() => setWechatOpen(true)} disabled={!link} title="Share on WeChat">
              Share on WeChat
            </BrandOutlineButton>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => copy(link, "Link copied")} disabled={!link} title="Copy link">
                <Icon.Copy className="w-4 h-4" /> Copy
              </Button>
              <Button variant="neutral" onClick={() => setWechatOpen(true)} disabled={!link} title="Show QR">
                <Icon.QR className="w-4 h-4" /> Show QR
              </Button>
            </div>
          </ToolCard>

          <ToolCard title="Open link" desc="Quick open in a new tab for testing.">
            <Button variant="outline" onClick={() => openLink(link)} disabled={!link} className="w-full" title="Open in new tab">
              <Icon.External className="w-4 h-4" /> Open in new tab
            </Button>
          </ToolCard>
        </section>

        {/* Custom message field */}
        <section className={cx(TOKENS.card, "p-4 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors")}>
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Custom message</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Used for WhatsApp share and shown in the WeChat modal.</div>
          <textarea
            value={message}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            rows={3}
            className={cx(
              "mt-3 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400",
              TOKENS.btn,
              "focus:outline-none focus:ring-2 focus:ring-[#f77f00] dark:focus:ring-[#f77f00] transition-colors"
            )}
            placeholder="Write a short share message…"
          />
        </section>
      </main>

      {/* WeChat modal */}
      <Modal open={wechatOpen} title="WeChat Share" onClose={() => setWechatOpen(false)} reducedMotion={reducedMotion}>
        <div className="text-sm text-slate-700 dark:text-slate-200">
          <div className="text-xs text-slate-600 dark:text-slate-300">Recommended: open WeChat → scan QR or paste the link.</div>

          <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 p-3 transition-colors">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Message</div>
            <div className="mt-1 text-[12px] font-extrabold text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{message}</div>
          </div>

          <div className="mt-3 grid place-items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 p-3 transition-colors">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="WeChat QR"
                className="h-44 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = placeholder("QR");
                }}
              />
            ) : (
              <div className="text-xs text-slate-600 dark:text-slate-300">Select a link</div>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 p-3 transition-colors">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Link</div>
            <div className="mt-1 text-[12px] font-extrabold text-slate-900 dark:text-slate-100 break-all">{link || "—"}</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => copy(link, "Link copied")} disabled={!link} title="Copy link">
              <Icon.Copy className="w-4 h-4" /> Copy link
            </Button>
            <Button variant="neutral" onClick={() => setWechatOpen(false)} title="Close">
              <Icon.X className="w-4 h-4" /> Close
            </Button>
          </div>
        </div>
      </Modal>

      
      {/* New Link drawer */}
      <SideDrawer
        open={newLinkOpen}
        title="Create new link"
        subtitle={
          <>
            Create platform/creator/referral links for attribution and analytics. (RBAC) Only Campaign Owner/Collabs Manager should create links.
          </>
        }
        onClose={() => setNewLinkOpen(false)}
        reducedMotion={reducedMotion}
        widthClassName="max-w-2xl"
        footer={
<div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={saveNewLink} title="Create link">
              <Icon.Plus className="w-4 h-4" /> Create
            </Button>
            <Button variant="neutral" onClick={() => setNewLinkOpen(false)} title="Cancel">
              <Icon.X className="w-4 h-4" /> Cancel
            </Button>
          </div>
        }
      >
<div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/30 p-3">
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Supplier Link Builder</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Create platform/creator/referral links for attribution and analytics. (RBAC) Only Campaign Owner/Collabs Manager should create links.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Type</div>
              <div className="mt-1 relative">
                <select
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value as LinkKind)}
                  className={cx(
                    "w-full appearance-none px-3 py-2 text-sm font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors",
                    TOKENS.btn
                  )}
                >
                  <option>Public campaign link</option>
                  <option disabled={!canCreateCreatorLinks}>Creator referral link</option>
                  <option>Platform source link</option>
                  <option>Region link</option>
                  <option>Promo code link</option>
                  <option>Supplier attribution link</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  <Icon.ChevronDown className="w-4 h-4" />
                </span>
              </div>
              {!canCreateCreatorLinks ? (
                <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                  Creator referral links are disabled for this campaign because the creator plan is not “I will use a Creator”.
                </div>
              ) : null}
            </div>

            <div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Label</div>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., TikTok (Creator A), East Africa, FLASH10"
                className={cx(
                  "mt-1 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400",
                  TOKENS.btn,
                  "focus:outline-none focus:ring-2 focus:ring-[#f77f00] dark:focus:ring-[#f77f00] transition-colors"
                )}
              />
            </div>
          </div>

          {/* Conditional inputs */}
          {newKind === "Creator referral link" ? (
            <div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Creator</div>
              <div className="mt-1 relative">
                <select
                  value={newCreatorRef}
                  onChange={(e) => setNewCreatorRef(e.target.value)}
                  disabled={!canCreateCreatorLinks}
                  className={cx(
                    "w-full appearance-none px-3 py-2 text-sm font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors",
                    TOKENS.btn,
                    !canCreateCreatorLinks ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  {(campaign?.creators || []).map((cr) => (
                    <option key={cr.id} value={cr.id}>
                      {cr.name} ({cr.handle}) · {cr.status}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  <Icon.ChevronDown className="w-4 h-4" />
                </span>
              </div>
            </div>
          ) : null}

          {newKind === "Platform source link" ? (
            <div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Platform source</div>
              <div className="mt-1 relative">
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className={cx(
                    "w-full appearance-none px-3 py-2 text-sm font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors",
                    TOKENS.btn
                  )}
                >
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="wechat">WeChat</option>
                  <option value="web">Web</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  <Icon.ChevronDown className="w-4 h-4" />
                </span>
              </div>
            </div>
          ) : null}

          {newKind === "Region link" ? (
            <div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Region</div>
              <div className="mt-1 relative">
                <select
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  className={cx(
                    "w-full appearance-none px-3 py-2 text-sm font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors",
                    TOKENS.btn
                  )}
                >
                  <option>East Africa</option>
                  <option>West Africa</option>
                  <option>Southern Africa</option>
                  <option>North Africa</option>
                  <option>Africa / Asia</option>
                  <option>Global</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  <Icon.ChevronDown className="w-4 h-4" />
                </span>
              </div>
            </div>
          ) : null}

          {newKind === "Promo code link" ? (
            <div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Promo code</div>
              <input
                value={newPromo}
                onChange={(e) => setNewPromo(e.target.value)}
                placeholder="e.g., FLASH10"
                className={cx(
                  "mt-1 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400",
                  TOKENS.btn,
                  "focus:outline-none focus:ring-2 focus:ring-[#f77f00] dark:focus:ring-[#f77f00] transition-colors"
                )}
              />
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Tip: Promo codes should match the Campaign promo arrangement in My Campaigns.</div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/40 p-3">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Preview</div>
            <div className="mt-1 text-[12px] font-extrabold text-slate-900 dark:text-slate-100 break-all">{newLinkPreview || "—"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <BrandOutlineButton
                color={TOKENS.brandOrange}
                icon={<Icon.Copy className="w-4 h-4" />}
                onClick={() => copy(newLinkPreview, "Preview copied")}
                disabled={!newLinkPreview}
                title="Copy preview"
              >
                Copy preview
              </BrandOutlineButton>
              <Button variant="neutral" onClick={() => openLink(newLinkPreview)} disabled={!newLinkPreview} title="Open preview">
                <Icon.External className="w-4 h-4" /> Open
              </Button>
            </div>
          </div>

          
        </div>
      </SideDrawer>

{/* Toast */}
      {toast ? (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[90] bg-slate-900 dark:bg-slate-700 text-white text-[11px] px-3 py-1.5 rounded-full shadow transition-colors"
          aria-live="polite"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run: window.__RUN_LINK_TOOLS_SUPPLIER_TESTS__ = true; location.reload();
if (typeof window !== "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shouldRun = (window as any).__RUN_LINK_TOOLS_SUPPLIER_TESTS__;
    if (shouldRun) {
      const tests: Array<{ name: string; pass: boolean }> = [];
      const t = (name: string, pass: boolean) => tests.push({ name, pass });

      const base = buildCampaignLink("abc");
      t("buildCampaignLink", base.includes("/a/abc"));

      const url1 = appendParam("https://x.com", "ref", "CR-1");
      t("appendParam adds ?", url1 === "https://x.com?ref=CR-1");

      const url2 = appendParam("https://x.com?a=1", "src", "tiktok");
      t("appendParam adds &", url2 === "https://x.com?a=1&src=tiktok");

      const s1 = shortLinkFromUrl("https://mylivedealz.com/a/link");
      const s2 = shortLinkFromUrl("https://mylivedealz.com/a/link");
      t("shortLink deterministic", s1 === s2);

      window.__LINK_TOOLS_SUPPLIER_TESTS__ = tests;
      // eslint-disable-next-line no-console
      console.log("✅ Link Tools Supplier tests", tests);
    }
  } catch {
    // ignore
  }
}
