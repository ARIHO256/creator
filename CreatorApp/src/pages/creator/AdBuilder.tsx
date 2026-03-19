"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Film,
  Heart,
  Info,
  Lock,
  Minus,
  Package,
  Play,
  Plus,
  Search,
  Share2,
  ShoppingCart,
  Sparkles,
  Timer,
  Upload,
  Video,
  X,
  Zap,
  QrCode,
  Instagram,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";

/**
 * Ad Builder (Independent Page) — Premium
 * ------------------------------------------------------------
 * Purpose:
 * - Fully independent page version of the Ad Builder "side drawer"
 * - Mirrors the "Shoppable Ad template" buyer layout and behavior, but host-first
 *
 * Key requirements implemented:
 * - Supplier → Campaign → Offers gating (multi-product selection)
 * - Platforms are multi-select; “Other” requires custom platform names
 * - Creative step includes Hero image + Hero intro video from Asset Library (approved)
 * - Featured products/services have poster image (500×500) with play icon → product video viewer
 * - Hero play icon opens intro video viewer; viewer includes Buy/Add-to-cart and product chooser overlay
 * - Overlays on video viewers:
 *    - Buy now + Add to cart (with icons)
 *    - Stock warnings (sold out / low stock)
 *    - Countdown (Starts in / Ends in / Session ended)
 *    - Love + Share controls
 * - Tracking includes short links + UTM presets library
 * - Schedule time selection uses a scrollable time list (vertical scroll)
 * - Shows explicit "Ad ends" time
 * - Asset Library wiring: opens /asset-library in picker mode and restores state via sessionStorage
 *
 * Notes:
 * - This file is self-contained UI demo (TailwindCSS + lucide-react).
 * - Wire real APIs, persistence, routing, and Asset Library return payload as needed.
 */

const ORANGE = "#f77f00";

// From your supported sizes list (already used elsewhere)
const HERO_IMAGE_REQUIRED = { width: 1920, height: 1080 } as const;
const ITEM_POSTER_REQUIRED = { width: 500, height: 500 } as const;

// Storage keys for Asset Library picker round-trip
const BUILDER_DRAFT_KEY = "mldz:adBuilder:builderDraft:v1";
const ASSET_PICK_KEY = "mldz:assetPicker:payload:v1";

type ViewerMode = "fullscreen" | "modal";
type MediaKind = "image" | "video";
type AssetOwner = "Host" | "Supplier" | "Catalog";

type AssetStatus = "approved" | "pending" | "rejected";

type Asset = {
  id: string;
  title: string;
  owner: AssetOwner;
  kind: MediaKind;
  status: AssetStatus;
  roleHint?: "hero_image" | "hero_video" | "item_poster" | "item_video" | "overlay";
  width?: number;
  height?: number;
  url: string;
  posterUrl?: string;
  desktopMode?: ViewerMode; // some content prefers fullscreen even on desktop
};

type Supplier = { id: string; name: string; avatarUrl: string; category: string };
type Campaign = { id: string; supplierId: string; name: string; status: "Active" | "Paused"; startsAtISO: string; endsAtISO: string };
type OfferType = "PRODUCT" | "SERVICE";

type Offer = {
  id: string;
  supplierId: string;
  campaignId: string;
  type: OfferType;
  name: string;
  price: number;
  basePrice?: number;
  currency: "UGX" | "USD";
  stockLeft: number; // -1 = unlimited
  sold: number;
  // catalog media fallbacks
  catalogPosterUrl: string; // should match ITEM_POSTER_REQUIRED in real system
  catalogVideoUrl?: string;
};

type BuilderStep = "offer" | "creative" | "tracking" | "schedule" | "review";

type UTMTemplate = {
  id: string;
  name: string;
  description: string;
  params: Record<string, string>;
};

type CountdownState = "upcoming" | "live" | "ended";

type BuilderState = {
  // scoping
  supplierId: string;
  campaignId: string;

  // offer selection
  selectedOfferIds: string[];
  primaryOfferId: string;

  // platforms (multi-select)
  platforms: Array<"TikTok" | "Instagram" | "YouTube" | "Facebook" | "Other">;
  platformOtherList: string[];
  platformOtherDraft: string;

  // creative
  heroImageAssetId?: string; // must be 1920×1080 ideally
  heroIntroVideoAssetId?: string; // intro opener
  // per-offer poster + video
  itemPosterByOfferId: Record<string, string | undefined>; // assetId
  itemVideoByOfferId: Record<string, string | undefined>; // assetId

  // CTA builder
  ctaText: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  landingBehavior: "Checkout" | "Product detail" | "External link";
  landingUrl?: string;

  // Tracking
  shortDomain: "mldz.link" | "dealz.africa" | "shp.adz";
  shortSlug: string;
  utmPresetId: string;
  utmCustom: Record<string, string>;

  // Schedule
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string;
  endTime: string;
};

const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

// clamp01 removed (unused)

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d > 0 ? `${d}d ` : ""}${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

function money(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

function fmtLocal(d: Date) {
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function parseLocalDateTime(dateStr: string, timeStr: string) {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toTimeInputValue(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Timezone helpers removed for simple schedule UI

function buildShortLink(domain: string, slug: string, utm: Record<string, string>) {
  const base = `https://${domain.replace(/^https?:\/\//, "")}/${encodeURIComponent(slug || "draft")}`;
  const sp = new URLSearchParams();
  Object.entries(utm || {}).forEach(([k, v]) => {
    if (!k || !v) return;
    sp.set(k, v);
  });
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return isMobile;
}

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const t = target ? target.getTime() : now;
  const diff = Math.max(0, t - now);
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { s, d, h, m, sec, diff };
}

function Pill({
  tone = "neutral",
  children,
  title,
}: {
  tone?: "neutral" | "good" | "warn" | "bad" | "pro" | "brand";
  children?: React.ReactNode;
  title?: string;
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : tone === "bad"
          ? "bg-rose-50 text-rose-900 ring-rose-200"
          : tone === "pro"
            ? "bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300 ring-violet-200 dark:ring-violet-800"
            : tone === "brand"
              ? "text-white"
              : "bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-300 ring-neutral-200 dark:ring-slate-700";
  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({
  tone = "neutral",
  children,
  onClick,
  disabled,
  left,
  right,
  className,
  title,
}: {
  tone?: "neutral" | "primary" | "ghost" | "danger";
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "text-white hover:brightness-95"
      : tone === "danger"
        ? "bg-rose-600 text-white hover:brightness-95"
        : tone === "ghost"
          ? "bg-transparent text-neutral-900 dark:text-slate-100 hover:bg-neutral-100 dark:hover:bg-slate-800"
          : "bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 ring-1 ring-neutral-200 dark:ring-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700";
  return (
    <button
      className={cx(base, cls, className)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {left}
      {children}
      {right}
    </button>
  );
}

// function Toggle({
//   value,
//   onChange,
//   disabled,
//   title,
// }: {
//   value: boolean;
//   onChange: (v: boolean) => void;
//   disabled?: boolean;
//   title?: string;
// }) {
//   return (
//     <button
//       type="button"
//       className={cx(
//         "relative inline-flex h-6 w-11 items-center rounded-full transition",
//         disabled ? "bg-neutral-200 dark:bg-slate-700 cursor-not-allowed" : value ? "bg-neutral-900 dark:bg-slate-100" : "bg-neutral-300 dark:bg-slate-600",
//       )}
//       onClick={() => !disabled && onChange(!value)}
//       aria-pressed={value}
//       title={title}
//     >
//       <span className={cx("inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition", value ? "translate-x-5" : "translate-x-1")} />
//     </button>
//   );
// }

function Modal({
  open,
  onClose,
  title,
  children,
  mode = "modal",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  mode?: ViewerMode;
}) {
  useEffect(() => {
    if (open) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[99]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0 bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-colors"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-slate-800 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
              </div>
              <Btn tone="ghost" onClick={onClose} left={<X className="h-4 w-4" />}>
                Close
              </Btn>
            </div>
            <div className="flex-1 overflow-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function DrawerShell({
  open,
  title,
  subtitle,
  onClose,
  width,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  width?: string;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    if (open) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cx(
              "absolute top-0 right-0 bottom-0 bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-colors",
              width || "w-full max-w-[1240px]"
            )}
          >
            <div className="flex items-start justify-between gap-2 border-b border-neutral-200 dark:border-slate-800 px-4 py-3 shrink-0">
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
                {subtitle ? <div className="truncate text-xs text-neutral-600 dark:text-slate-400">{subtitle}</div> : null}
              </div>
              <Btn tone="ghost" onClick={onClose} left={<X className="h-4 w-4" />}>
                Close
              </Btn>
            </div>
            <div className="flex-1 overflow-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ScrollTimePicker({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const times = useMemo(() => {
    const out: string[] = [];
    for (let hh = 0; hh < 24; hh++) {
      for (let mm = 0; mm < 60; mm += 5) {
        out.push(`${pad2(hh)}:${pad2(mm)}`);
      }
    }
    return out;
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const idx = Math.max(0, times.indexOf(value));
    const rowH = 40;
    el.scrollTop = Math.max(0, idx * rowH - rowH * 3);
  }, [open, value, times]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className={cx(
          "w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-left text-sm ring-1 ring-neutral-200 dark:ring-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors",
          disabled && "opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-slate-800",
        )}
        title={label}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-extrabold text-neutral-900 dark:text-slate-100">{value || "Select time"}</div>
            {label ? <div className="truncate text-xs text-neutral-600 dark:text-slate-400">{label}</div> : null}
          </div>
          <ChevronDown className="h-4 w-4 text-neutral-500 dark:text-slate-400" />
        </div>
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-neutral-200 dark:ring-slate-700">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-slate-700 px-3 py-2">
            <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Pick time</div>
            <button className="text-xs font-bold text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          {/* Scrollable list as required */}
          <div ref={listRef} className="max-h-[240px] overflow-y-auto">
            {times.map((t) => (
              <button
                key={t}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors",
                  t === value && "bg-neutral-50 dark:bg-slate-700",
                )}
              >
                <span className="font-semibold text-neutral-900 dark:text-slate-100">{t}</span>
                {t === value ? <Check className="h-4 w-4 text-neutral-900 dark:text-slate-100" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900/50 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl bg-white dark:bg-slate-900/80 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors", className)}>{children}</div>;
}

/** ------------------------------ Demo Data ------------------------------ */

const CREATOR = {
  name: "Amina K.",
  handle: "@amina.dealz",
  avatarUrl:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=512&auto=format&fit=crop",
  badge: "Host",
};

const SUPPLIERS: Supplier[] = [
  {
    id: "p1",
    name: "Kampala Beauty Hub",
    avatarUrl: "https://images.unsplash.com/photo-1520975958225-9277a0c1998f?q=80&w=512&auto=format&fit=crop",
    category: "Beauty",
  },
  {
    id: "p2",
    name: "City Fitness Lab",
    avatarUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=512&auto=format&fit=crop",
    category: "Wellness",
  },
  {
    id: "p3",
    name: "Gourmet Basket UG",
    avatarUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=512&auto=format&fit=crop",
    category: "Food",
  },
];

const CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    supplierId: "p1",
    name: "Valentine Glow Week",
    status: "Active",
    startsAtISO: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    endsAtISO: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
  },
  {
    id: "c2",
    supplierId: "p1",
    name: "Weekend Flash Dealz",
    status: "Active",
    startsAtISO: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    endsAtISO: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  },
  {
    id: "c3",
    supplierId: "p2",
    name: "New Year Fitness Push",
    status: "Paused",
    startsAtISO: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    endsAtISO: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
  },
  {
    id: "c4",
    supplierId: "p3",
    name: "Basket Bonanza",
    status: "Active",
    startsAtISO: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    endsAtISO: new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
  },
];

const OFFERS: Offer[] = [
  {
    id: "o1",
    supplierId: "p1",
    campaignId: "c1",
    type: "PRODUCT",
    name: "Glow Serum (30ml)",
    price: 38000,
    basePrice: 52000,
    currency: "UGX",
    stockLeft: 12,
    sold: 86,
    catalogPosterUrl: "https://images.unsplash.com/photo-1611930022073-84fb62f4ea9d?q=80&w=800&auto=format&fit=crop",
    catalogVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    id: "o2",
    supplierId: "p1",
    campaignId: "c1",
    type: "PRODUCT",
    name: "Hydra Cleanser",
    price: 24000,
    basePrice: 32000,
    currency: "UGX",
    stockLeft: 3,
    sold: 44,
    catalogPosterUrl: "https://images.unsplash.com/photo-1612817152414-857f7b8872d9?q=80&w=800&auto=format&fit=crop",
    catalogVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    id: "o3",
    supplierId: "p1",
    campaignId: "c1",
    type: "SERVICE",
    name: "Facial Session (45min)",
    price: 60000,
    basePrice: 80000,
    currency: "UGX",
    stockLeft: -1,
    sold: 18,
    catalogPosterUrl: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?q=80&w=800&auto=format&fit=crop",
    catalogVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    id: "o4",
    supplierId: "p3",
    campaignId: "c4",
    type: "PRODUCT",
    name: "Gourmet Snack Box",
    price: 95000,
    basePrice: 120000,
    currency: "UGX",
    stockLeft: 0,
    sold: 31,
    catalogPosterUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
    catalogVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    id: "o5",
    supplierId: "p3",
    campaignId: "c4",
    type: "PRODUCT",
    name: "Fruit Basket (Large)",
    price: 65000,
    basePrice: 78000,
    currency: "UGX",
    stockLeft: 9,
    sold: 57,
    catalogPosterUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop",
    catalogVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
];

const ASSETS: Asset[] = [
  {
    id: "a_hero_img_1",
    title: "Hero (Host Approved) — 1920×1080",
    owner: "Host",
    kind: "image",
    status: "approved",
    roleHint: "hero_image",
    width: 1920,
    height: 1080,
    url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: "a_hero_vid_1",
    title: "Intro Opener (Host)",
    owner: "Host",
    kind: "video",
    status: "approved",
    roleHint: "hero_video",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    posterUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop",
    desktopMode: "fullscreen",
  },
  {
    id: "a_item_poster_1",
    title: "Item Poster — 500×500 (Host)",
    owner: "Host",
    kind: "image",
    status: "approved",
    roleHint: "item_poster",
    width: 500,
    height: 500,
    url: "https://images.unsplash.com/photo-1611930022073-84fb62f4ea9d?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: "a_item_vid_1",
    title: "Product Demo Clip (Host)",
    owner: "Host",
    kind: "video",
    status: "approved",
    roleHint: "item_video",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    posterUrl: "https://images.unsplash.com/photo-1611930022073-84fb62f4ea9d?q=80&w=900&auto=format&fit=crop",
    desktopMode: "modal",
  },
  {
    id: "a_pending_1",
    title: "New Upload — Pending Review",
    owner: "Host",
    kind: "video",
    status: "pending",
    roleHint: "item_video",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    posterUrl: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?q=80&w=900&auto=format&fit=crop",
    desktopMode: "fullscreen",
  },
];

/** UTM presets library (premium) */
const UTM_PRESETS: UTMTemplate[] = [
  {
    id: "utm1",
    name: "Host IG Story",
    description: "Strong host attribution for IG story swipes.",
    params: { utm_source: "instagram", utm_medium: "story", utm_campaign: "host", utm_content: "amina" },
  },
  {
    id: "utm2",
    name: "TikTok Bio Link",
    description: "Bio link tracking for TikTok host traffic.",
    params: { utm_source: "tiktok", utm_medium: "bio", utm_campaign: "host", utm_content: "amina" },
  },
  {
    id: "utm3",
    name: "Marketplace Featured",
    description: "Marketplace featured slot traffic.",
    params: { utm_source: "marketplace", utm_medium: "featured", utm_campaign: "dealz", utm_content: "hero" },
  },
];

// function PlayOverlayButton({ onClick, label }: { onClick: () => void; label: string }) {
//   return (
//     <button type="button" onClick={onClick} aria-label={label} className="absolute inset-0 grid place-items-center active:scale-[0.99]">
//       <span className="h-14 w-14 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-neutral-200 dark:border-slate-800 grid place-items-center shadow">
//         <span className="h-12 w-12 rounded-full bg-neutral-900 grid place-items-center">
//           <Play className="h-6 w-6 text-white" fill="currentColor" />
//         </span>
//       </span>
//     </button>
//   );
// }

// function StockBar({ sold, stockLeft }: { sold: number; stockLeft: number }) {
//   if (stockLeft < 0) return null;
//   const s = Math.max(0, sold);
//   const left = Math.max(0, stockLeft);
//   const total = Math.max(1, s + left);
//   const pct = clamp01(s / total);
//   return (
//     <div className="mt-2">
//       <div className="flex items-center justify-between text-[11px] text-neutral-600 font-semibold">
//         <span>{left} left</span>
//         <span>{s} sold</span>
//       </div>
//       <div className="mt-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
//         <div className="h-full rounded-full" style={{ width: `${Math.round(pct * 100)}%`, background: ORANGE }} />
//       </div>
//     </div>
//   );
// }

function computeCountdownState(now: number, startsAt: number, endsAt: number): CountdownState {
  if (now < startsAt) return "upcoming";
  if (now >= endsAt) return "ended";
  return "live";
}

// CountdownPill removed (unused)

type ViewerContext = {
  kind: "hero" | "item";
  offerId?: string;
  title: string;
  videoUrl: string;
  posterUrl?: string;
  desktopMode?: ViewerMode;
};

function MediaViewer({
  open,
  onClose,
  ctx,
  mode,
  countdownState,
  countdownLabel,
  stockLabel,
  priceLabel,
  primaryCtaLabel,
  secondaryCtaLabel,
  onBuyNow,
  onAddToCart,
  onLove,
  loved,
  onShare,
  // Hero viewer includes product chooser
  heroProducts,
  selectedHeroOfferId,
  onSelectHeroOfferId,
}: {
  open: boolean;
  onClose: () => void;
  ctx: ViewerContext | null;
  mode: ViewerMode;
  countdownState: CountdownState;
  countdownLabel: string;
  stockLabel?: { tone: "warn" | "bad" | "neutral"; text: string } | null;
  priceLabel?: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onLove: () => void;
  loved: boolean;
  onShare: () => void;
  heroProducts?: Array<{ id: string; name: string; posterUrl: string; price: string; stockNote: string }>;
  selectedHeroOfferId?: string;
  onSelectHeroOfferId?: (id: string) => void;
}) {
  if (!ctx) return null;

  return (
    <Modal open={open} onClose={onClose} title={ctx.title} mode={mode}>
      <div className={cx("relative overflow-hidden rounded-3xl bg-black", mode === "fullscreen" ? "h-[70vh] md:h-[78vh]" : "aspect-video")}>
        <video src={ctx.videoUrl} poster={ctx.posterUrl} controls playsInline autoPlay className="absolute inset-0 h-full w-full object-contain bg-black" />

        {/* Overlays */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <Pill tone="brand">
              <Zap className="h-3.5 w-3.5" />
              Shoppable Adz
            </Pill>
            <Pill tone={countdownState === "live" ? "brand" : countdownState === "upcoming" ? "good" : "neutral"}>
              <Timer className="h-3.5 w-3.5" />
              {countdownLabel}
            </Pill>
            {stockLabel ? (
              <Pill tone={stockLabel.tone === "bad" ? "bad" : stockLabel.tone === "warn" ? "warn" : "neutral"}>
                <Info className="h-3.5 w-3.5" />
                {stockLabel.text}
              </Pill>
            ) : null}
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-2">
            <span className="pointer-events-auto">
              <Btn tone="ghost" onClick={onLove} left={<Heart className={cx("h-4 w-4", loved && "fill-red-500 text-red-500")} />}>
                {loved ? "Loved" : "Love"}
              </Btn>
            </span>
            <span className="pointer-events-auto">
              <Btn tone="ghost" onClick={onShare} left={<Share2 className="h-4 w-4" />}>
                Share
              </Btn>
            </span>
          </div>

          {/* Bottom info + CTA */}
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
            {priceLabel ? (
              <div className="mb-2 text-white">
                <div className="text-xs text-white/80">Selected item</div>
                <div className="text-base md:text-lg font-extrabold">{priceLabel}</div>
              </div>
            ) : null}

            {ctx.kind === "hero" && heroProducts?.length ? (
              <div className="mb-3">
                <div className="text-xs font-bold text-white/80">Choose product</div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {heroProducts.map((p) => {
                    const active = p.id === selectedHeroOfferId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectHeroOfferId?.(p.id)}
                        className={cx(
                          "pointer-events-auto flex min-w-[220px] items-center gap-2 rounded-2xl border px-2.5 py-2 text-left",
                          active ? "border-white bg-white/15" : "border-white/20 bg-white/10 hover:bg-white/15",
                        )}
                      >
                        <img src={p.posterUrl} className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10" alt={p.name} />
                        <div className="min-w-0 text-white">
                          <div className="truncate text-sm font-extrabold">{p.name}</div>
                          <div className="truncate text-xs text-white/80">
                            {p.price} · {p.stockNote}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-[11px] text-white/70">
                  Hero Buy/Add-to-cart applies to the selected product above (so buyers choose before checkout).
                </div>
              </div>
            ) : null}

            <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row">
              <Btn tone="primary" onClick={onBuyNow} left={<Zap className="h-4 w-4" />} className="w-full">
                {primaryCtaLabel}
              </Btn>
              <Btn tone="neutral" onClick={onAddToCart} left={<ShoppingCart className="h-4 w-4" />} className="w-full">
                {secondaryCtaLabel}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ShoppableAdPreview({
  title,
  sharedByCreatorLabel,
  supplierName,
  campaignStatus,
  ctaHelperText,
  heroImageUrl,
  heroIntroVideo,
  offers,
  primaryOfferId,
  perOfferPosterUrl,
  perOfferVideo,
  startsAt,
  endsAt,
  primaryCtaLabel,
  secondaryCtaLabel,
  cart,
  shareEnabled,
  onPlayHero,
  onPlayOffer,
  onBuy,
  onAdd,
  onDecCart,
  onClearCart,
  onShare,
}: {
  title: string;
  sharedByCreatorLabel: string;
  supplierName?: string;
  campaignStatus?: string;
  ctaHelperText?: string;

  heroImageUrl: string;
  heroIntroVideo?: { url: string; poster?: string };

  offers: Offer[];
  primaryOfferId?: string;

  perOfferPosterUrl: Record<string, string | undefined>;
  perOfferVideo: Record<string, { url: string; poster?: string } | undefined>;

  startsAt: Date;
  endsAt: Date;

  primaryCtaLabel: string;
  secondaryCtaLabel: string;

  /** Cart state is lifted so viewer + cards stay in sync */
  cart: Record<string, number>;
  shareEnabled?: boolean;

  onPlayHero: () => void;
  onPlayOffer: (offerId: string) => void;

  onBuy: (offerId: string) => void;
  onAdd: (offerId: string) => void;

  onDecCart: (offerId: string) => void;
  onClearCart: () => void;

  onShare: () => void;
}) {
  const [lovedOfferIds, setLovedOfferIds] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);


  const now = Date.now();
  const state = computeCountdownState(now, startsAt.getTime(), endsAt.getTime());
  const target = state === "upcoming" ? startsAt : endsAt;
  const cd = useCountdown(target);

  const countdownLabel =
    state === "upcoming"
      ? "Starts in"
      : state === "live"
        ? "Ends in"
        : state === "ended"
          ? "Session ended"
          : "—";

  const productsCount = offers.filter((o) => o.type === "PRODUCT").length;
  const servicesCount = offers.filter((o) => o.type === "SERVICE").length;

  function toggleLoved(id: string) {
    setLovedOfferIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const cartLines = useMemo(() => {
    const byId = new Map(offers.map((o) => [o.id, o]));
    return Object.entries(cart)
      .filter(([id, qty]) => qty > 0 && byId.has(id))
      .map(([id, qty]) => {
        const o = byId.get(id)!;
        const poster = perOfferPosterUrl[id] || o.catalogPosterUrl || heroImageUrl;
        return { offer: o, qty, poster };
      });
  }, [cart, offers, perOfferPosterUrl, heroImageUrl]);

  const cartCount = useMemo(() => cartLines.reduce((s, l) => s + l.qty, 0), [cartLines]);

  const currencySet = useMemo(() => new Set(cartLines.map((l) => l.offer.currency)), [cartLines]);
  const multiCurrency = currencySet.size > 1;
  const currency = cartLines[0]?.offer.currency || "USD";

  const cartTotal = useMemo(() => {
    if (multiCurrency) return 0;
    return cartLines.reduce((s, l) => s + l.qty * l.offer.price, 0);
  }, [cartLines, multiCurrency]);

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="rounded-[34px] bg-neutral-950 dark:bg-black p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition-colors">
        <div className="relative overflow-hidden rounded-[28px] bg-neutral-50 dark:bg-slate-950 transition-colors">
          {/* fixed phone viewport */}
          <div className="h-[760px] flex flex-col">
            {/* top bar (share + cart reinstated) */}
            <div className="relative xl:sticky xl:top-0 z-20 border-b border-neutral-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-3 py-3 backdrop-blur transition-colors">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-neutral-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  aria-label="Back"
                  onClick={() => { }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <div className="truncate text-[13px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
                  <div className="truncate text-[11px] font-semibold text-neutral-600 dark:text-slate-400">{sharedByCreatorLabel}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`rounded-xl border border-neutral-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-2 hover:bg-white dark:hover:bg-slate-800 transition-colors ${!shareEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-label="Share"
                    onClick={() => (shareEnabled ? onShare() : undefined)}
                    title={shareEnabled ? "Share" : "Generate the ad to enable share links"}
                    disabled={!shareEnabled}
                  >
                    <Share2 className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    className="relative rounded-xl border border-neutral-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    aria-label="Open cart"
                    onClick={() => setCartOpen((v) => !v)}
                    title="Cart"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount ? (
                      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-[#f77f00] text-white text-[11px] font-extrabold grid place-items-center">
                        {cartCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* hero (1920×1080 = 16:9) */}
              <div className="relative">
                <div className="relative aspect-[16/9] bg-neutral-200 dark:bg-slate-800">
                  <img src={heroImageUrl} alt="Hero" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/70" />

                  {/* chips + countdown INSIDE hero */}
                  <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur">
                      Top Shoppable Adz
                    </span>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur">
                      {servicesCount > 0 && productsCount > 0 ? "Mixed" : servicesCount > 0 ? "Services" : "Products"}
                    </span>
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur">
                      {countdownLabel}: {state === "ended" ? "—" : formatCountdown(cd.diff)}
                    </span>
                  </div>

                  {/* save icon INSIDE hero */}
                  <div className="absolute right-3 top-3">
                    <button
                      type="button"
                      onClick={() => setSaved((s) => !s)}
                      className={`rounded-full p-2 backdrop-blur ring-1 ${saved ? "bg-white/35 ring-white/40" : "bg-white/20 ring-white/30 hover:bg-white/30"
                        }`}
                      aria-label="Save"
                      title={saved ? "Saved" : "Save"}
                    >
                      <Heart className={`h-4 w-4 ${saved ? "text-white fill-white" : "text-white"}`} />
                    </button>
                  </div>

                  {/* play */}
                  {heroIntroVideo ? (
                    <button
                      type="button"
                      onClick={onPlayHero}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 p-4 backdrop-blur ring-1 ring-white/30 hover:bg-white/30"
                      aria-label="Play hero intro"
                      title="Play intro video"
                    >
                      <Video className="h-6 w-6 text-white" />
                    </button>
                  ) : null}

                  {/* bottom metrics chips (template-like) */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold text-white">Views 410k</span>
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold text-white">Saves 18k</span>
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold text-white">Conv 2.9%</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pb-6">
                {/* Campaign details */}
                <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
                      <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                        {supplierName ? (
                          <span>
                            Supplier: <span className="font-semibold text-neutral-800 dark:text-slate-200">{supplierName}</span>
                          </span>
                        ) : (
                          <span>Supplier: —</span>
                        )}
                        {campaignStatus ? <span className="mx-2 text-neutral-300">•</span> : null}
                        {campaignStatus ? <span>Status: {campaignStatus}</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {productsCount ? <Pill tone="neutral">{productsCount} products</Pill> : null}
                        {servicesCount ? <Pill tone="neutral">{servicesCount} services</Pill> : null}
                      </div>
                    </div>
                  </div>

                  {ctaHelperText ? (
                    <div className="mt-3 text-sm font-semibold text-neutral-800 dark:text-slate-200">{ctaHelperText}</div>
                  ) : (
                    <div className="mt-3 text-sm text-neutral-700 dark:text-slate-300">
                      Unbox + proof + clear CTA — shop featured dealz before they end.
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-slate-400">
                    <span className="rounded-full bg-neutral-50 dark:bg-slate-900/50 px-3 py-1 ring-1 ring-neutral-200 dark:ring-slate-800">
                      Starts: <span className="font-semibold text-neutral-800 dark:text-slate-200">{fmtLocal(startsAt)}</span>
                    </span>
                    <span className="rounded-full bg-neutral-50 dark:bg-slate-900/50 px-3 py-1 ring-1 ring-neutral-200 dark:ring-slate-800">
                      Ends: <span className="font-semibold text-neutral-800 dark:text-slate-200">{fmtLocal(endsAt)}</span>
                    </span>
                  </div>
                </div>

                {/* Featured offers (2 per row, 500×500 posters = square) */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {offers.map((o) => {
                    const poster = perOfferPosterUrl[o.id] || o.catalogPosterUrl || heroImageUrl;
                    const isLoved = lovedOfferIds.includes(o.id);

                    const stockText =
                      o.stockLeft === 0
                        ? "Sold out"
                        : o.stockLeft > 0 && o.stockLeft <= 10
                          ? `Low (${o.stockLeft})`
                          : o.stockLeft > 10
                            ? `${o.stockLeft} left`
                            : o.stockLeft === -1
                              ? "In stock"
                              : "In stock";

                    const stockTone = o.stockLeft === 0 ? "bad" : o.stockLeft > 0 && o.stockLeft <= 10 ? "warn" : "neutral";

                    return (
                      <div key={o.id} className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-neutral-200 dark:ring-slate-800 hover:shadow-sm transition">
                        <div className="relative aspect-square bg-neutral-200 dark:bg-slate-800">
                          <img src={poster} alt={o.name} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/65" />

                          {perOfferVideo[o.id] ? (
                            <button
                              type="button"
                              onClick={() => onPlayOffer(o.id)}
                              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 backdrop-blur ring-1 ring-white/30 hover:bg-white/30"
                              aria-label={`Play ${o.name}`}
                              title="Play offer video"
                            >
                              <Video className="h-5 w-5 text-white" />
                            </button>
                          ) : null}

                          <div className="absolute left-2 top-2 flex flex-wrap gap-2">
                            <Pill tone="neutral">{o.type === "SERVICE" ? "Service" : "Product"}</Pill>
                            <Pill tone={stockTone as "warn" | "bad" | "neutral"}>{stockText}</Pill>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleLoved(o.id)}
                            className={`absolute right-2 top-2 rounded-full p-2 backdrop-blur ring-1 ${isLoved ? "bg-white/35 ring-white/40" : "bg-white/20 ring-white/30 hover:bg-white/30"
                              }`}
                            aria-label={isLoved ? "Unsave" : "Save"}
                            title={isLoved ? "Saved" : "Save"}
                          >
                            <Heart className={`h-4 w-4 ${isLoved ? "text-white fill-white" : "text-white"}`} />
                          </button>

                          {o.id === primaryOfferId ? (
                            <div className="absolute bottom-2 left-2">
                              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur ring-1 ring-white/30">
                                Primary
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div className="p-3">
                          <div className="line-clamp-2 text-sm font-extrabold text-neutral-900 dark:text-slate-100">{o.name}</div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{money(o.currency, o.price)}</div>
                            {o.basePrice && o.basePrice > o.price ? (
                              <div className="text-xs font-semibold text-neutral-500 line-through">{money(o.currency, o.basePrice)}</div>
                            ) : null}
                          </div>

                          <div className="mt-3 grid gap-2">
                            <Btn tone="primary" left={<Zap className="h-4 w-4" />} onClick={() => onBuy(o.id)}>
                              {primaryCtaLabel}
                            </Btn>
                            <Btn
                              tone="neutral"
                              left={<ShoppingCart className="h-4 w-4" />}
                              onClick={() => onAdd(o.id)}
                              disabled={o.stockLeft === 0}
                            >
                              {secondaryCtaLabel}
                            </Btn>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 text-center text-[11px] text-neutral-500">
                  Curated by the creator. Media is approved in the Asset Library before it can be attached to a deal.
                </div>
              </div>
            </div>

            {/* Cart dock INSIDE preview (replaces checkout dock) */}
            <div className="border-t border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
              <div className="px-3 py-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setCartOpen((v) => !v)}
                  aria-label="Toggle cart"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <ShoppingCart className="h-5 w-5 text-neutral-800 dark:text-slate-200" />
                      {cartCount ? (
                        <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-[#f77f00] text-white text-[11px] font-extrabold grid place-items-center">
                          {cartCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="truncate text-xs font-bold text-neutral-700 dark:text-slate-300">Cart</div>
                      <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">
                        {cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"} added` : "No items yet"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[11px] text-neutral-500 dark:text-slate-400">{multiCurrency ? "Multiple currencies" : "Subtotal"}</div>
                      <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{multiCurrency ? "—" : money(currency, cartTotal)}</div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-neutral-600 dark:text-slate-400 transition ${cartOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {cartOpen ? (
                  <div className="mt-3 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-colors">
                    {cartLines.length ? (
                      <div className="max-h-[220px] overflow-auto pr-1">
                        <div className="space-y-2">
                          {cartLines.map(({ offer, qty, poster }) => (
                            <div key={offer.id} className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 dark:bg-slate-900 p-2 ring-1 ring-neutral-200 dark:ring-slate-700 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={poster} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-slate-700" />
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-bold text-neutral-900 dark:text-slate-100">{offer.name}</div>
                                  <div className="text-[11px] text-neutral-600 dark:text-slate-400">
                                    {money(offer.currency, offer.price)} · {offer.type === "SERVICE" ? "Service" : "Product"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
                                  onClick={() => onDecCart(offer.id)}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-4 w-4 text-neutral-900 dark:text-slate-100" />
                                </button>
                                <div className="w-7 text-center text-xs font-extrabold text-neutral-900 dark:text-slate-100">{qty}</div>
                                <button
                                  type="button"
                                  className="rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
                                  onClick={() => onAdd(offer.id)}
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-4 w-4 text-neutral-900 dark:text-slate-100" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-neutral-50 dark:bg-slate-900 p-3 text-sm text-neutral-700 dark:text-slate-400 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                        Add items from the featured offers to build your cart.
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-xs font-bold text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200 transition-colors"
                        onClick={onClearCart}
                        disabled={!cartLines.length}
                      >
                        Clear cart
                      </button>
                      <Btn
                        tone="primary"
                        left={<Zap className="h-4 w-4" />}
                        disabled={!cartLines.length}
                        onClick={() => {
                          // In production: proceed to checkout with cart lines
                        }}
                      >
                        Checkout
                      </Btn>
                    </div>

                    <div className="mt-2 text-[11px] text-neutral-500 dark:text-slate-500">
                      Cart is part of the shared Shoppable Ad experience. Badge count increases as viewers add items.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




/** ------------------------------ Main Page ------------------------------ */

export default function AdBuilder({
  isDrawer = false,
  onClose,
  initialAdId: _initialAdId,
  pickerContext,
}: {
  isDrawer?: boolean;
  onClose?: () => void;
  initialAdId?: string;
  pickerContext?: {
    dealId?: string;
    supplierId?: string;
    supplierName?: string;
    supplierKind?: string;
    supplierBrand?: string;
    campaignId?: string;
    campaignName?: string;
    campaignBrand?: string;
    campaignStatus?: "Active" | "Paused";
    startISO?: string;
    endISO?: string;
    offers?: Array<{
      id: string;
      type?: "PRODUCT" | "SERVICE";
      name?: string;
      price?: number;
      basePrice?: number;
      currency?: "UGX" | "USD";
      stockLeft?: number;
      sold?: number;
      posterUrl?: string;
      videoUrl?: string;
      desktopMode?: ViewerMode;
    }>;
  };
}) {
  const isMobile = useIsMobile();

  // "Drawer-like route" support (optional)
  const [drawerMode, setDrawerMode] = useState(isDrawer);
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    if (isDrawer) {
      setDrawerMode(true);
      return;
    }
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const embed = sp.get("embed");
    const rt = sp.get("returnTo");
    setReturnTo(rt);
    setDrawerMode(embed === "drawer" || embed === "1");
  }, [isDrawer]);

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Stepper
  const steps: Array<{ key: BuilderStep; label: string; desc: string }> = [
    { key: "offer", label: "Offer", desc: "Supplier → Campaign → Offers + Platforms" },
    { key: "creative", label: "Creative", desc: "Hero media + item posters/videos + CTA" },
    { key: "tracking", label: "Tracking", desc: "Short links + UTM presets" },
    { key: "schedule", label: "Schedule", desc: "Start + End times (scroll picker)" },
    { key: "review", label: "Review", desc: "Preflight + generate" },
  ];
  const [step, setStep] = useState<BuilderStep>("offer");

  const stepKeys: BuilderStep[] = ["offer", "creative", "tracking", "schedule", "review"];

  const handleNext = () => {
    const currentIndex = stepKeys.indexOf(step);
    if (currentIndex < stepKeys.length - 1) {
      setStep(stepKeys[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    const currentIndex = stepKeys.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepKeys[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const [isGenerated, setIsGenerated] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  // Preflight is collapsible and collapsed by default (per requirement)
  const [preflightOpen, setPreflightOpen] = useState(false);

  const dealScope = useMemo(() => {
    if (!pickerContext?.dealId) return null;

    const supplierId = pickerContext.supplierId || `deal-supplier:${pickerContext.dealId}`;
    const campaignId = pickerContext.campaignId || `deal-campaign:${pickerContext.dealId}`;
    const supplierName = pickerContext.supplierName || "Supplier";
    const campaignName = pickerContext.campaignName || "Campaign";
    const campaignStatus = pickerContext.campaignStatus === "Paused" ? "Paused" : "Active";
    const startISO = pickerContext.startISO || new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endISO = pickerContext.endISO || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const supplierEntry: Supplier = {
      id: supplierId,
      name: supplierName,
      category: pickerContext.supplierKind || "Seller",
      avatarUrl: "",
    };

    const campaignEntry: Campaign = {
      id: campaignId,
      supplierId,
      name: campaignName,
      status: campaignStatus,
      startsAtISO: startISO,
      endsAtISO: endISO,
    };

    const offerEntries: Offer[] =
      (pickerContext.offers || []).map((offer, index) => ({
        id: offer.id || `deal-offer-${index + 1}`,
        supplierId,
        campaignId,
        type: offer.type === "SERVICE" ? "SERVICE" : "PRODUCT",
        name: offer.name || `Offer ${index + 1}`,
        price: typeof offer.price === "number" ? offer.price : 0,
        basePrice: typeof offer.basePrice === "number" ? offer.basePrice : undefined,
        currency: offer.currency === "UGX" ? "UGX" : "USD",
        stockLeft: typeof offer.stockLeft === "number" ? offer.stockLeft : -1,
        sold: typeof offer.sold === "number" ? offer.sold : 0,
        catalogPosterUrl: offer.posterUrl || "",
        catalogVideoUrl: offer.videoUrl || undefined,
      })) || [];

    return { supplierEntry, campaignEntry, offerEntries };
  }, [pickerContext]);

  const availableSuppliers = useMemo(
    () => (dealScope ? [dealScope.supplierEntry] : SUPPLIERS),
    [dealScope],
  );
  const availableCampaigns = useMemo(
    () => (dealScope ? [dealScope.campaignEntry] : CAMPAIGNS),
    [dealScope],
  );
  const availableOffers = useMemo(
    () => (dealScope ? dealScope.offerEntries : OFFERS),
    [dealScope],
  );
  const dealScopeLocked = Boolean(dealScope);

  const defaultSupplierId = availableSuppliers[0]?.id || "p1";
  const defaultCampaignId =
    availableCampaigns.find((campaign) => campaign.supplierId === defaultSupplierId)?.id ||
    availableCampaigns[0]?.id ||
    "c1";

  // default schedule: tomorrow 18:00-19:00
  const defaultStart = useMemo(() => {
    if (dealScope?.campaignEntry?.startsAtISO) {
      const parsed = new Date(dealScope.campaignEntry.startsAtISO);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d;
  }, [dealScope]);
  const defaultEnd = useMemo(() => {
    if (dealScope?.campaignEntry?.endsAtISO) {
      const parsed = new Date(dealScope.campaignEntry.endsAtISO);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date(defaultStart);
    d.setHours(d.getHours() + 1);
    return d;
  }, [defaultStart, dealScope]);

  const [builder, setBuilder] = useState<BuilderState>(() => ({
    supplierId: defaultSupplierId,
    campaignId: defaultCampaignId,
    selectedOfferIds: [availableOffers.find((o) => o.campaignId === defaultCampaignId)?.id || availableOffers[0]?.id || "o1"].filter(Boolean),
    primaryOfferId: availableOffers.find((o) => o.campaignId === defaultCampaignId)?.id || availableOffers[0]?.id || "o1",
    platforms: ["Instagram"],
    platformOtherList: [],
    platformOtherDraft: "",
    heroImageAssetId: ASSETS.find((a) => a.roleHint === "hero_image" && a.status === "approved")?.id,
    heroIntroVideoAssetId: ASSETS.find((a) => a.roleHint === "hero_video" && a.status === "approved")?.id,
    itemPosterByOfferId: {},
    itemVideoByOfferId: {},
    ctaText: "Shop the featured dealz before they end.",
    primaryCtaLabel: "Buy now",
    secondaryCtaLabel: "Add to cart",
    landingBehavior: "Checkout",
    landingUrl: "",
    shortDomain: "mldz.link",
    shortSlug: "adz-" + Math.random().toString(36).slice(2, 7),
    utmPresetId: UTM_PRESETS[0].id,
    utmCustom: {},
    startDate: toDateInputValue(defaultStart),
    startTime: toTimeInputValue(defaultStart),
    endDate: toDateInputValue(defaultEnd),
    endTime: toTimeInputValue(defaultEnd),
  }));

  // External assets from Asset Library picker roundtrip
  const [externalAssets, setExternalAssets] = useState<Record<string, Asset>>({});

  const supplier = useMemo(
    () => availableSuppliers.find((entry) => entry.id === builder.supplierId) || availableSuppliers[0],
    [availableSuppliers, builder.supplierId],
  );
  const campaignOptions = useMemo(
    () => availableCampaigns.filter((entry) => entry.supplierId === builder.supplierId),
    [availableCampaigns, builder.supplierId],
  );
  const campaign = useMemo(
    () => availableCampaigns.find((entry) => entry.id === builder.campaignId) || campaignOptions[0],
    [availableCampaigns, builder.campaignId, campaignOptions],
  );

  const scopedOffers = useMemo(
    () => availableOffers.filter((entry) => entry.supplierId === builder.supplierId && entry.campaignId === builder.campaignId),
    [availableOffers, builder.supplierId, builder.campaignId],
  );
  const selectedOffers = useMemo(
    () =>
      builder.selectedOfferIds
        .map((id) => scopedOffers.find((entry) => entry.id === id) || availableOffers.find((entry) => entry.id === id))
        .filter(Boolean) as Offer[],
    [builder.selectedOfferIds, scopedOffers, availableOffers],
  );
  const primaryOffer = useMemo(() => selectedOffers.find((o) => o.id === builder.primaryOfferId) || selectedOffers[0], [selectedOffers, builder.primaryOfferId]);
  const builderContextKey = pickerContext?.dealId ? `deal:${pickerContext.dealId}` : "global";

  useEffect(() => {
    if (!dealScopeLocked) return;
    const scopedOfferIds = availableOffers
      .filter((entry) => entry.supplierId === defaultSupplierId && entry.campaignId === defaultCampaignId)
      .map((entry) => entry.id);
    setBuilder((prev) => {
      const selectedOfferIds = prev.selectedOfferIds.filter((id) => scopedOfferIds.includes(id));
      const normalizedSelectedOfferIds = selectedOfferIds.length ? selectedOfferIds : scopedOfferIds.slice(0, 2);
      const primaryOfferId =
        normalizedSelectedOfferIds.includes(prev.primaryOfferId)
          ? prev.primaryOfferId
          : normalizedSelectedOfferIds[0] || "";

      if (
        prev.supplierId === defaultSupplierId &&
        prev.campaignId === defaultCampaignId &&
        prev.primaryOfferId === primaryOfferId &&
        prev.selectedOfferIds.length === normalizedSelectedOfferIds.length &&
        prev.selectedOfferIds.every((id, idx) => id === normalizedSelectedOfferIds[idx])
      ) {
        return prev;
      }

      return {
        ...prev,
        supplierId: defaultSupplierId,
        campaignId: defaultCampaignId,
        selectedOfferIds: normalizedSelectedOfferIds,
        primaryOfferId,
      };
    });
  }, [availableOffers, dealScopeLocked, defaultCampaignId, defaultSupplierId]);

  // Cart state (shared between the preview cards and the fullscreen viewer)
  const [cart, setCart] = useState<Record<string, number>>({});
  // Keep cart clean if selected offers change (e.g., creator edits selection)
  useEffect(() => {
    setCart((prev) => {
      const allowed = new Set(selectedOffers.map((o) => o.id));
      const next: Record<string, number> = {};
      for (const [id, qty] of Object.entries(prev)) {
        if (allowed.has(id) && qty > 0) next[id] = qty;
      }
      return next;
    });
  }, [selectedOffers]);

  // Approved assets: base + external
  const approvedAssets = useMemo(() => {
    const base = ASSETS.filter((a) => a.status === "approved");
    const ext = Object.values(externalAssets).filter((a) => a.status === "approved");
    const map = new Map<string, Asset>();
    [...base, ...ext].forEach((a) => map.set(a.id, a));
    return Array.from(map.values());
  }, [externalAssets]);
  console.log("Approved assets:", approvedAssets.length); // Use it or remove it (using it for now to avoid lint error if needed elsewhere)

  const assetById = useMemo(() => {
    const map = new Map<string, Asset>();
    [...ASSETS, ...Object.values(externalAssets)].forEach((a) => map.set(a.id, a));
    return map;
  }, [externalAssets]);

  const heroImageAsset = useMemo(() => (builder.heroImageAssetId ? assetById.get(builder.heroImageAssetId) : undefined), [builder.heroImageAssetId, assetById]);
  const heroVideoAsset = useMemo(() => (builder.heroIntroVideoAssetId ? assetById.get(builder.heroIntroVideoAssetId) : undefined), [builder.heroIntroVideoAssetId, assetById]);

  // Build per-offer poster/video urls (prefer picked assets, fallback to catalog)
  const perOfferPosterUrl = useMemo(() => {
    const out: Record<string, string> = {};
    selectedOffers.forEach((o) => {
      const aId = builder.itemPosterByOfferId[o.id];
      const a = aId ? assetById.get(aId) : undefined;
      out[o.id] = a?.url || o.catalogPosterUrl;
    });
    return out;
  }, [selectedOffers, builder.itemPosterByOfferId, assetById]);

  const perOfferVideoUrl = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    selectedOffers.forEach((o) => {
      const aId = builder.itemVideoByOfferId[o.id];
      const a = aId ? assetById.get(aId) : undefined;
      out[o.id] = a?.kind === "video" ? a.url : o.catalogVideoUrl;
    });
    return out;
  }, [selectedOffers, builder.itemVideoByOfferId, assetById]);

  // Schedule times
  const startsAt = useMemo(() => parseLocalDateTime(builder.startDate, builder.startTime), [builder.startDate, builder.startTime]);
  const endsAt = useMemo(() => parseLocalDateTime(builder.endDate, builder.endTime), [builder.endDate, builder.endTime]);

  function validateSchedule(campaignId: string, start: Date, end: Date) {
    const selectedCampaign = availableCampaigns.find((entry) => entry.id === campaignId);
    if (!selectedCampaign) return { ok: false, error: "Invalid campaign selected" };

    const campaignStart = new Date(selectedCampaign.startsAtISO);
    const campaignEnd = new Date(selectedCampaign.endsAtISO);

    if (start < campaignStart) {
      return { ok: false, error: `Schedule starts before campaign window (${fmtLocal(campaignStart)})` };
    }
    if (end > campaignEnd) {
      return { ok: false, error: `Schedule ends after campaign window (${fmtLocal(campaignEnd)})` };
    }
    if (start >= end) {
      return { ok: false, error: "End time must be after start time" };
    }
    return { ok: true };
  }

  const countdownState = useMemo<CountdownState>(() => computeCountdownState(Date.now(), startsAt.getTime(), endsAt.getTime()), [startsAt, endsAt]);
  const countdownLabel = useMemo(() => (countdownState === "upcoming" ? "Starts in" : countdownState === "live" ? "Ends in" : "Session ended"), [countdownState]);

  // Tracking URL
  const utmPreset = useMemo(() => UTM_PRESETS.find((p) => p.id === builder.utmPresetId) || UTM_PRESETS[0], [builder.utmPresetId]);
  const mergedUtm = useMemo(() => ({ ...utmPreset.params, ...builder.utmCustom }), [utmPreset, builder.utmCustom]);
  const shortLink = useMemo(() => buildShortLink(builder.shortDomain, builder.shortSlug, mergedUtm), [builder.shortDomain, builder.shortSlug, mergedUtm]);

  const effectivePlatforms = useMemo(() => {
    const base = (builder.platforms || []).filter((p) => p !== "Other");
    const other = (builder.platforms || []).includes("Other") ? (builder.platformOtherList || []).filter(Boolean) : [];
    const all = [...base, ...other].map((s) => String(s).trim()).filter(Boolean);
    return Array.from(new Set(all));
  }, [builder.platforms, builder.platformOtherList]);

  const platformSharePacks = useMemo(() => {
    return effectivePlatforms.map((p) => {
      const utmSource = p.toLowerCase().replace(/\s+/g, "");
      const link = buildShortLink(builder.shortDomain, builder.shortSlug, { ...mergedUtm, utm_source: utmSource });
      const text = `${builder.ctaText || "Shop the featured dealz"}\n${link}`;
      return { platform: p, link, text };
    });
  }, [effectivePlatforms, mergedUtm, builder.shortDomain, builder.shortSlug, builder.ctaText]);

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerCtx, setViewerCtx] = useState<ViewerContext | null>(null);
  const [loved, setLoved] = useState(false);
  const [selectedHeroOfferId, setSelectedHeroOfferId] = useState<string>("");

  useEffect(() => {
    if (!selectedHeroOfferId && primaryOffer?.id) setSelectedHeroOfferId(primaryOffer.id);
  }, [primaryOffer?.id, selectedHeroOfferId]);

  function openHeroViewer() {
    if (!heroVideoAsset?.url) {
      setToast("No intro video attached yet.");
      return;
    }
    setViewerCtx({
      kind: "hero",
      title: "Intro video (creator)",
      videoUrl: heroVideoAsset.url,
      posterUrl: heroVideoAsset.posterUrl || heroImageAsset?.url,
      desktopMode: heroVideoAsset.desktopMode || "fullscreen",
    });
    setViewerOpen(true);
  }

  function openOfferViewer(offerId: string) {
    const offer = selectedOffers.find((o) => o.id === offerId);
    const videoUrl = perOfferVideoUrl[offerId];
    if (!videoUrl) {
      setToast("No product video attached yet.");
      return;
    }
    const aId = builder.itemVideoByOfferId[offerId];
    const a = aId ? assetById.get(aId) : undefined;

    setViewerCtx({
      kind: "item",
      offerId,
      title: offer?.name || "Item video",
      videoUrl,
      posterUrl: (a?.posterUrl || perOfferPosterUrl[offerId]) ?? undefined,
      desktopMode: a?.desktopMode || "modal",
    });
    setViewerOpen(true);
  }

  const stockLabelForOffer = React.useCallback(
    (offerId: string): { tone: "warn" | "bad" | "neutral"; text: string } | null => {
      const o = selectedOffers.find((x) => x.id === offerId);
      if (!o) return null;
      if (countdownState === "ended") return { tone: "neutral", text: "Session ended" };
      if (countdownState === "upcoming") return { tone: "neutral", text: "Not started" };
      if (o.stockLeft === 0) return { tone: "bad", text: "Sold out" };
      if (o.stockLeft > 0 && o.stockLeft <= 5) return { tone: "warn", text: "Low stock" };
      if (o.stockLeft > 0) return { tone: "neutral", text: `${o.stockLeft} left` };
      return null;
    },
    [selectedOffers, countdownState],
  );

  function buyNow(offerId: string) {
    const o = selectedOffers.find((x) => x.id === offerId);
    if (!o) return;
    // In production: route to checkout page with item preloaded
    const url = `/checkout?offerId=${encodeURIComponent(offerId)}&qty=1`;
    setToast(`Buy now → ${url} (demo)`);
  }

  function addToCart(offerId: string) {
    const o = selectedOffers.find((x) => x.id === offerId);
    if (!o) return;

    setCart((prev) => ({ ...prev, [offerId]: (prev[offerId] || 0) + 1 }));
    setToast(`Added to cart: ${o.name}`);
  }

  function decCart(offerId: string) {
    setCart((prev) => {
      const next = { ...prev };
      const q = next[offerId] || 0;
      if (q <= 1) delete next[offerId];
      else next[offerId] = q - 1;
      return next;
    });
  }

  function clearCart() {
    setCart({});
  }

  function copyText(text: string, msg = "Copied") {
    if (!isGenerated) {
      setToast("Generate the ad to enable share links");
      return;
    }
    navigator.clipboard?.writeText(text).catch(() => { });
    setToast(msg);
  }

  function shareCurrent() {
    copyText(shortLink, "Copied share link");
  }

  // Asset library picker wiring (independent page)
  function persistDraftForPicker() {
    try {
      sessionStorage.setItem(
        BUILDER_DRAFT_KEY,
        JSON.stringify({
          ts: Date.now(),
          contextKey: builderContextKey,
          step,
          builder,
          externalAssets,
        }),
      );
    } catch {
      // ignore
    }
  }

  function buildReturnToUrl() {
    const u = new URL(window.location.href);
    u.searchParams.set("restore", "1");
    u.searchParams.set("step", step);
    u.searchParams.set("pickerSource", "ad-builder");
    if (pickerContext?.dealId) u.searchParams.set("dealId", pickerContext.dealId);
    // clean old picker params
    u.searchParams.delete("assetId");
    u.searchParams.delete("applyTo");
    return u.pathname + "?" + u.searchParams.toString();
  }

  function openAssetLibraryPicker(applyTo: string) {
    if (typeof window === "undefined") return;
    persistDraftForPicker();
    const picker = new URL("/asset-library", window.location.origin);
    picker.searchParams.set("mode", "picker");
    picker.searchParams.set("target", "shoppable");
    picker.searchParams.set("applyTo", applyTo);
    const supplierIdForPicker = pickerContext?.supplierId || builder.supplierId;
    const campaignIdForPicker = pickerContext?.campaignId || builder.campaignId;
    const supplierNameForPicker = pickerContext?.supplierName || supplier?.name;
    const supplierKindForPicker = pickerContext?.supplierKind || "Seller";
    const supplierBrandForPicker = pickerContext?.supplierBrand || supplierNameForPicker || "";
    const campaignNameForPicker = pickerContext?.campaignName || campaign?.name;
    const campaignBrandForPicker = pickerContext?.campaignBrand || campaignNameForPicker || "";

    if (pickerContext?.dealId) picker.searchParams.set("dealId", pickerContext.dealId);
    if (supplierIdForPicker) picker.searchParams.set("supplierId", supplierIdForPicker);
    if (campaignIdForPicker) picker.searchParams.set("campaignId", campaignIdForPicker);
    if (supplierNameForPicker) picker.searchParams.set("supplierName", supplierNameForPicker);
    if (supplierKindForPicker) picker.searchParams.set("supplierKind", supplierKindForPicker);
    if (supplierBrandForPicker) picker.searchParams.set("supplierBrand", supplierBrandForPicker);
    if (campaignNameForPicker) picker.searchParams.set("campaignName", campaignNameForPicker);
    if (campaignBrandForPicker) picker.searchParams.set("campaignBrand", campaignBrandForPicker);
    picker.searchParams.set("returnTo", buildReturnToUrl());
    // Mini-step exists inside picker mode, so this is treated as "suggested applyTo"
    window.location.assign(picker.toString());
  }

  function coerceAssetFromPickerPayload(payload: Record<string, unknown>): Asset | null {
    if (!payload || typeof payload !== "object") return null;
    const id = String(payload.id || "");
    if (!id) return null;

    // AssetLibrary_updated emits: { id, title, subtitle, ownerLabel, mediaType, status, previewKind, previewUrl, thumbnailUrl, desktopMode, ... }
    const title = String(payload.title || payload.name || "Asset");
    const ownerLabel = String(payload.ownerLabel || payload.owner || "Host");
    const owner: AssetOwner = ownerLabel.toLowerCase().includes("supplier") || ownerLabel.toLowerCase().includes("seller") ? "Supplier" : ownerLabel.toLowerCase().includes("catalog") ? "Catalog" : "Host";

    const kind: MediaKind = payload.previewKind === "video" || payload.mediaType === "video" ? "video" : "image";
    const status: AssetStatus = payload.status === "approved" ? "approved" : payload.status === "rejected" ? "rejected" : "pending";

    const url = String(payload.previewUrl || payload.url || payload.thumbnailUrl || "");
    if (!url) return null;

    const desktopMode: ViewerMode | undefined = payload.desktopMode === "fullscreen" || payload.desktopMode === "modal" ? payload.desktopMode : undefined;

    return {
      id,
      title,
      owner,
      kind,
      status,
      url,
      posterUrl: kind === "video" ? String(payload.thumbnailUrl || payload.posterUrl || "") || undefined : undefined,
      desktopMode,
    };
  }

  function applyPickedAssetToBuilder(asset: Asset, applyTo: string) {
    setExternalAssets((m) => ({ ...m, [asset.id]: asset }));

    setBuilder((prev) => {
      const next: BuilderState = { ...prev };
      if (applyTo === "hero_image") next.heroImageAssetId = asset.id;
      if (applyTo === "hero_video") next.heroIntroVideoAssetId = asset.id;

      if (applyTo.startsWith("item_poster:")) {
        const offerId = applyTo.split(":")[1] || "";
        next.itemPosterByOfferId = { ...next.itemPosterByOfferId, [offerId]: asset.id };
      }
      if (applyTo.startsWith("item_video:")) {
        const offerId = applyTo.split(":")[1] || "";
        next.itemVideoByOfferId = { ...next.itemVideoByOfferId, [offerId]: asset.id };
      }
      return next;
    });
  }

  // Restore from Asset Library picker return
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const shouldRestore = sp.get("restore") === "1" || sp.has("assetId");
    const returnDealId = sp.get("dealId") || "";
    if (returnDealId) {
      const currentDealId = pickerContext?.dealId || "";
      // Wait until this Ad Builder instance is bound to the same deal that opened picker.
      if (currentDealId !== returnDealId) {
        return;
      }
    }
    const assetId = sp.get("assetId") || "";
    const applyTo = sp.get("applyTo") || "";

    if (shouldRestore) {
      try {
        const raw = sessionStorage.getItem(BUILDER_DRAFT_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          const savedContextKey = typeof saved?.contextKey === "string" ? saved.contextKey : "global";
          if (savedContextKey === builderContextKey) {
            if (saved?.builder) setBuilder(saved.builder);
            if (saved?.step) setStep(saved.step);
            if (saved?.externalAssets) setExternalAssets(saved.externalAssets);
          }
        }
      } catch {
        // ignore
      }
    }

    if (assetId) {
      try {
        const pickRaw = sessionStorage.getItem(ASSET_PICK_KEY);
        if (pickRaw) {
          const parsed = JSON.parse(pickRaw);
          const payload = parsed?.payload || parsed;
          if (payload?.id === assetId) {
            const a = coerceAssetFromPickerPayload(payload);
            if (a) applyPickedAssetToBuilder(a, applyTo || "");
          }
        }
      } catch {
        // ignore
      }
      // Clean query params to prevent re-apply on refresh
      const clean = new URL(window.location.href);
      clean.searchParams.delete("assetId");
      clean.searchParams.delete("applyTo");
      clean.searchParams.delete("restore");
      clean.searchParams.delete("step");
      clean.searchParams.delete("dealId");
      window.history.replaceState({}, "", clean.pathname + (clean.searchParams.toString() ? `?${clean.searchParams.toString()}` : ""));
    }
  }, [builderContextKey]);

  // Supplier -> campaign resets offers
  function resetScope(nextSupplierId: string, nextCampaignId: string) {
    const offers = availableOffers.filter((o) => o.supplierId === nextSupplierId && o.campaignId === nextCampaignId);
    const ids = offers.slice(0, 2).map((o) => o.id);
    const primary = ids[0] || offers[0]?.id || "";
    setBuilder((prev) => ({
      ...prev,
      supplierId: nextSupplierId,
      campaignId: nextCampaignId,
      selectedOfferIds: ids.length ? ids : [],
      primaryOfferId: primary,
      itemPosterByOfferId: {},
      itemVideoByOfferId: {},
    }));
  }

  function toggleOffer(offerId: string) {
    setBuilder((prev) => {
      const exists = prev.selectedOfferIds.includes(offerId);
      const limit = 6;
      const nextIds = exists
        ? prev.selectedOfferIds.filter((id) => id !== offerId)
        : prev.selectedOfferIds.length >= limit
          ? prev.selectedOfferIds
          : [...prev.selectedOfferIds, offerId];

      const nextPrimary = nextIds.includes(prev.primaryOfferId) ? prev.primaryOfferId : nextIds[0] || "";
      return { ...prev, selectedOfferIds: nextIds, primaryOfferId: nextPrimary };
    });
  }

  // recomputeSchedule removed for simple schedule UI        ...next,



  // Preflight checks
  const preflight = useMemo(() => {
    const issues: Array<{ label: string; ok: boolean; fix?: string }> = [];

    issues.push({ label: "Supplier selected", ok: !!builder.supplierId });
    issues.push({ label: "Campaign selected", ok: !!builder.campaignId });
    issues.push({ label: "At least 1 offer selected", ok: builder.selectedOfferIds.length > 0, fix: "Select offers (up to 6)." });
    issues.push({ label: "Primary offer set", ok: !!builder.primaryOfferId, fix: "Pick a primary offer." });

    issues.push({ label: "At least 1 platform selected", ok: (builder.platforms || []).length > 0, fix: "Select one or more platforms." });
    const platformOtherOk = !(builder.platforms || []).includes("Other") || (builder.platformOtherList || []).length > 0;
    issues.push({ label: 'Platform "Other" specified', ok: platformOtherOk, fix: "Add at least one custom platform name." });

    const heroOk = (() => {
      if (!builder.heroImageAssetId) return false;
      const a = assetById.get(builder.heroImageAssetId);
      if (!a) return true;
      if (a.kind !== "image") return false;
      if (a.width && a.height) return a.width === HERO_IMAGE_REQUIRED.width && a.height === HERO_IMAGE_REQUIRED.height;
      return true;
    })();
    issues.push({ label: `Hero image attached (${HERO_IMAGE_REQUIRED.width}×${HERO_IMAGE_REQUIRED.height} horizontal)`, ok: heroOk, fix: "Pick a 1920×1080 horizontal hero image from Asset Library." });
    issues.push({ label: "Hero intro video attached", ok: !!builder.heroIntroVideoAssetId, fix: "Pick an intro video from Asset Library." });

    // per-offer poster and video checks
    selectedOffers.forEach((o) => {
      issues.push({
        label: `Poster set for ${o.name} (${ITEM_POSTER_REQUIRED.width}×${ITEM_POSTER_REQUIRED.height})`,
        ok: !!builder.itemPosterByOfferId[o.id] || !!o.catalogPosterUrl,
        fix: "Pick a poster in Creative step.",
      });
      issues.push({
        label: `Video set for ${o.name}`,
        ok: !!builder.itemVideoByOfferId[o.id] || !!o.catalogVideoUrl,
        fix: "Pick a product video in Creative step.",
      });
    });

    issues.push({ label: "CTA labels set", ok: !!builder.primaryCtaLabel && !!builder.secondaryCtaLabel, fix: "Fill CTA Builder." });
    issues.push({ label: "Short link generated", ok: !!builder.shortSlug && !!builder.shortDomain, fix: "Fill Tracking step." });

    issues.push({ label: "Start date/time set", ok: !!builder.startDate && !!builder.startTime });
    issues.push({ label: "End date/time set", ok: !!builder.endDate && !!builder.endTime });
    issues.push({ label: "End after start", ok: endsAt.getTime() > startsAt.getTime(), fix: "Adjust schedule." });

    const scheduleValidation = validateSchedule(builder.campaignId, startsAt, endsAt);
    issues.push({ label: "Schedule within campaign window", ok: scheduleValidation.ok, fix: scheduleValidation.error });

    const ok = issues.every((i) => i.ok);
    return { ok, issues };
  }, [builder, selectedOffers, startsAt, endsAt, assetById]);

  const statusLabel = isGenerated ? "Generated" : preflight.ok ? "Ready" : "Draft";
  const statusTone: "good" | "warn" = isGenerated ? "good" : preflight.ok ? "good" : "warn";

  // Viewer props: for hero viewer, we need product chooser and selected product info
  const heroProducts = useMemo(() => {
    return selectedOffers.map((o) => {
      const stockNote = o.stockLeft === 0 ? "Sold out" : o.stockLeft > 0 && o.stockLeft <= 5 ? "Low stock" : o.stockLeft > 0 ? `${o.stockLeft} left` : "Unlimited";
      return {
        id: o.id,
        name: o.name,
        posterUrl: perOfferPosterUrl[o.id] || o.catalogPosterUrl,
        price: money(o.currency, o.price),
        stockNote,
      };
    });
  }, [selectedOffers, perOfferPosterUrl]);

  const viewerMode = useMemo<ViewerMode>(() => {
    const preferred = viewerCtx?.desktopMode || "modal";
    if (isMobile) return "fullscreen";
    // If content says fullscreen, honor it, else modal.
    return preferred;
  }, [isMobile, viewerCtx?.desktopMode]);

  const viewerPriceLabel = useMemo(() => {
    if (!viewerCtx) return "";
    const offerId = viewerCtx.kind === "hero" ? selectedHeroOfferId : viewerCtx.offerId;
    const o = selectedOffers.find((x) => x.id === offerId);
    if (!o) return "";
    return `${o.name} · ${money(o.currency, o.price)}`;
  }, [viewerCtx, selectedHeroOfferId, selectedOffers]);

  const viewerStockLabel = useMemo(() => {
    if (!viewerCtx) return null;
    const offerId = viewerCtx.kind === "hero" ? selectedHeroOfferId : viewerCtx.offerId || "";
    return stockLabelForOffer(offerId);
  }, [viewerCtx, selectedHeroOfferId, stockLabelForOffer]);

  function viewerBuyNow() {
    const offerId = viewerCtx?.kind === "hero" ? selectedHeroOfferId : viewerCtx?.offerId;
    if (!offerId) {
      setToast("Choose a product first.");
      return;
    }
    buyNow(offerId);
  }

  function viewerAddToCart() {
    const offerId = viewerCtx?.kind === "hero" ? selectedHeroOfferId : viewerCtx?.offerId;
    if (!offerId) {
      setToast("Choose a product first.");
      return;
    }
    addToCart(offerId);
  }

  function closeBuilder() {
    if (returnTo) {
      window.location.assign(returnTo);
      return;
    }
    window.history.back();
  }

  const content = (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <div className="relative xl:sticky xl:top-0 z-40 border-b border-neutral-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur transition-colors">
        <div className="flex flex-col gap-3 px-3 sm:px-4 md:px-6 lg:px-8 py-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-slate-400">
              <span className="font-bold text-neutral-900 dark:text-slate-100">Shoppable Adz</span>
              <span>•</span>
              <span className="text-neutral-900 dark:text-slate-100">Ad Builder</span>
              <span>•</span>
              <Pill tone={statusTone}>
                {preflight.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                {statusLabel}
              </Pill>
              <Pill tone="neutral" title="Independent page (can be opened as drawer-route)">
                <Sparkles className="h-3.5 w-3.5" />
                Independent
              </Pill>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <div className="truncate text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-slate-100">
                {campaign?.name ? `Campaign: ${campaign.name}` : "New Shoppable Ad"}
              </div>
            </div>

            <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
              Starts <span className="font-bold text-neutral-900 dark:text-slate-100">{fmtLocal(startsAt)}</span> • Ends{" "}
              <span className="font-bold text-neutral-900 dark:text-slate-100">{fmtLocal(endsAt)}</span> • TZ{" "}
              <span className="font-bold text-neutral-900 dark:text-slate-100">Local</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Btn tone="neutral" onClick={() => setToast("Draft saved (demo)")} left={<CheckCircle2 className="h-4 w-4" />}>
              Save draft
            </Btn>
            <Btn
              tone="neutral"
              onClick={shareCurrent}
              disabled={!isGenerated}
              title={!isGenerated ? "Generate the ad to enable share links" : undefined}
              left={<Copy className="h-4 w-4" />}
            >
              Copy link
            </Btn>
            <Btn tone="primary" onClick={() => setStep("review")} left={<BadgeCheck className="h-4 w-4" />}>
              Review
            </Btn>
          </div>
        </div>

        {/* Stepper */}
        <div className="border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
          <div className="px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {steps.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => setStep(s.key)}
                  className={cx(
                    "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                    step === s.key ? "text-white" : "bg-white dark:bg-slate-800/80 text-neutral-700 dark:text-slate-200 border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700",
                  )}
                  style={step === s.key ? { background: ORANGE, borderColor: ORANGE } : undefined}
                  title={s.desc}
                >
                  {i + 1}. {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-12">
        {/* Left: builder */}
        <div className="lg:col-span-7 space-y-4">
          {/* Status card (moved to left so preview can sit higher on right) */}
          <Section
            title="Build status"
            subtitle="Professional status + preflight so the preview area stays high (no extra preview-explainer card)."
            right={<Pill tone={statusTone}>{statusLabel}</Pill>}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card>
                <div className="text-xs font-bold text-neutral-600 dark:text-slate-400">Selected</div>
                <div className="mt-1 text-sm font-extrabold text-neutral-900 dark:text-slate-100">{builder.selectedOfferIds.length} item(s)</div>
                <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Primary: {primaryOffer?.name || "—"}</div>
              </Card>
              <Card>
                <div className="text-xs font-bold text-neutral-600 dark:text-slate-400">Link</div>
                <div className="mt-1 truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{builder.shortDomain}/{builder.shortSlug}</div>
                <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">UTM preset: {utmPreset.name}</div>
              </Card>
              <Card>
                <div className="text-xs font-bold text-neutral-600 dark:text-slate-400">Schedule</div>
                <div className="mt-1 text-sm font-extrabold text-neutral-900 dark:text-slate-100">{fmtLocal(startsAt)}</div>
                <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Ends: {fmtLocal(endsAt)}</div>
              </Card>
            </div>

            <div className="mt-3 rounded-2xl bg-neutral-50 dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setPreflightOpen((s) => !s)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Preflight</div>
                    <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                      {preflight.ok ? "All required items are ready." : "Fix items below before generating."}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={preflight.ok ? "good" : "warn"}>{preflight.ok ? "Pass" : "Needs fixes"}</Pill>
                    <ChevronDown className={cx("h-4 w-4 text-neutral-500 dark:text-slate-400 transition", preflightOpen && "rotate-180")} />
                  </div>
                </div>

                {!preflightOpen ? (
                  <div className="mt-2 text-xs text-neutral-600 dark:text-slate-400">
                    {preflight.issues.filter((i) => i.ok).length}/{preflight.issues.length} checks OK · Click to expand
                  </div>
                ) : null}
              </button>

              {preflightOpen ? (
                <>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {preflight.issues.slice(0, 8).map((i) => (
                      <div key={i.label} className="flex items-start justify-between gap-2 rounded-2xl bg-white dark:bg-slate-950 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-neutral-900 dark:text-slate-100">{i.label}</div>
                          {!i.ok && i.fix ? <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">{i.fix}</div> : null}
                        </div>
                        <Pill tone={i.ok ? "good" : "warn"}>{i.ok ? "OK" : "Fix"}</Pill>
                      </div>
                    ))}
                  </div>
                  {!preflight.ok ? <div className="mt-2 text-xs text-neutral-600 dark:text-slate-400">More items are checked in Review.</div> : null}
                </>
              ) : null}
            </div>
          </Section>

          {step === "offer" ? (
            <Section title="1) Supplier → Campaign → Offers" subtitle="Offers are scoped to a campaign under a supplier. Pick up to 6 items and choose a primary.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Supplier (seller/provider)</div>
                  <div className="mt-2 space-y-2">
                    <select
                      className="w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                      value={builder.supplierId}
                      disabled={dealScopeLocked}
                      onChange={(e) => {
                        const nextSupplier = e.target.value;
                        const nextCampaign =
                          availableCampaigns.find((c) => c.supplierId === nextSupplier)?.id ||
                          availableCampaigns[0]?.id;
                        resetScope(nextSupplier, nextCampaign);
                      }}
                    >
                      {availableSuppliers.map((p) => (
                        <option key={p.id} value={p.id} className="dark:bg-slate-800">
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Campaign</div>
                    <select
                      className="w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                      value={builder.campaignId}
                      disabled={dealScopeLocked}
                      onChange={(e) => resetScope(builder.supplierId, e.target.value)}
                    >
                      {campaignOptions.map((c) => (
                        <option key={c.id} value={c.id} className="dark:bg-slate-800">
                          {c.name} ({c.status})
                        </option>
                      ))}
                    </select>

                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800 transition-colors">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 text-amber-900 dark:text-amber-300" />
                        <div>
                          <div className="font-extrabold">Scope gating</div>
                          <div className="mt-1 text-xs">
                            Supplier + campaign determine which products/services appear below. This matches your requirement that offers exist under a specific campaign.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Platforms</div>
                  <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                    Select one or more platforms. In Review you’ll get a share pack for each selected platform.
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["TikTok", "Instagram", "YouTube", "Facebook", "Other"] as const).map((p) => {
                      const active = (builder.platforms || []).includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setBuilder((s) => {
                              const exists = (s.platforms || []).includes(p);
                              const next = exists ? (s.platforms || []).filter((x) => x !== p) : [...(s.platforms || []), p];
                              return {
                                ...s,
                                platforms: next,
                                platformOtherList: p === "Other" && exists ? [] : s.platformOtherList,
                                platformOtherDraft: p === "Other" && exists ? "" : s.platformOtherDraft,
                              };
                            });
                          }}
                          className={cx(
                            "rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition",
                            active
                              ? "text-white"
                              : "bg-white dark:bg-slate-800 text-neutral-800 dark:text-slate-300 ring-neutral-200 dark:ring-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700",
                          )}
                          style={active ? { background: ORANGE, borderColor: ORANGE } : undefined}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {(builder.platforms || []).includes("Other") ? (
                    <div className="mt-3 rounded-2xl bg-neutral-50 dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-700 transition-colors">
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Specify “Other” platforms</div>
                      <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Add one or more platform names (e.g., Snapchat, Pinterest, Website widget).</div>

                      <div className="mt-2 flex gap-2">
                        <input
                          value={builder.platformOtherDraft || ""}
                          onChange={(e) => setBuilder((s) => ({ ...s, platformOtherDraft: e.target.value }))}
                          className="w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                          placeholder="Type platform name…"
                        />
                        <Btn
                          tone="primary"
                          onClick={() => {
                            const v = String(builder.platformOtherDraft || "").trim();
                            if (!v) return;
                            setBuilder((s) => {
                              const next = Array.from(new Set([...(s.platformOtherList || []), v]));
                              return { ...s, platformOtherList: next, platformOtherDraft: "" };
                            });
                          }}
                          left={<Plus className="h-4 w-4" />}
                        >
                          Add
                        </Btn>
                      </div>

                      {(builder.platformOtherList || []).length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(builder.platformOtherList || []).map((p) => (
                            <span key={p} className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-extrabold ring-1 ring-neutral-200 dark:ring-slate-700 transition-colors dark:text-slate-200">
                              {p}
                              <button
                                type="button"
                                className="rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-slate-700"
                                onClick={() =>
                                  setBuilder((s) => ({
                                    ...s,
                                    platformOtherList: (s.platformOtherList || []).filter((x) => x !== p),
                                  }))
                                }
                                aria-label={`Remove ${p}`}
                              >
                                <X className="h-3.5 w-3.5 text-neutral-700 dark:text-slate-400" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800 transition-colors">
                          <div className="flex items-start gap-2">
                            <Info className="mt-0.5 h-4 w-4 text-amber-900 dark:text-amber-300" />
                            <div>
                              <div className="font-extrabold">Required</div>
                              <div className="mt-1">When “Other” is selected, add at least one platform name.</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </Card>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Offers in this campaign</div>
                  <Pill tone="neutral">
                    <Package className="h-3.5 w-3.5" />
                    {scopedOffers.length}
                  </Pill>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  {scopedOffers.map((o) => {
                    const selected = builder.selectedOfferIds.includes(o.id);
                    const isPrimary = builder.primaryOfferId === o.id;
                    const locked = !selected && builder.selectedOfferIds.length >= 6;
                    const stockNote = o.stockLeft === 0 ? "Sold out" : o.stockLeft > 0 && o.stockLeft <= 5 ? "Low stock" : o.stockLeft > 0 ? `${o.stockLeft} left` : "Unlimited";
                    return (
                      <div key={o.id} className={cx("rounded-2xl p-3 ring-1", selected ? "bg-neutral-50 dark:bg-slate-900/50 ring-neutral-200 dark:ring-slate-800" : "bg-white dark:bg-slate-950 ring-neutral-200 dark:ring-slate-800")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <img src={o.catalogPosterUrl} alt={o.name} className="h-12 w-12 rounded-2xl object-cover ring-1 ring-neutral-200 dark:ring-slate-700" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{o.name}</div>
                              <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                                {o.type === "SERVICE" ? "Service" : "Product"} · {money(o.currency, o.price)} · <span className="font-bold">{stockNote}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Btn
                              tone="neutral"
                              onClick={() => toggleOffer(o.id)}
                              disabled={locked}
                              left={selected ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                              title={locked ? "Max 6 items" : undefined}
                            >
                              {selected ? "Remove" : "Add"}
                            </Btn>
                            <Btn
                              tone={isPrimary ? "primary" : "ghost"}
                              onClick={() => selected && setBuilder((p) => ({ ...p, primaryOfferId: o.id }))}
                              disabled={!selected}
                              left={<CheckCircle2 className="h-4 w-4" />}
                              title={!selected ? "Add offer first" : undefined}
                            >
                              {isPrimary ? "Primary" : "Set primary"}
                            </Btn>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end border-t border-neutral-200 dark:border-slate-800 pt-6">
                <Btn tone="primary" onClick={handleNext} right={<ChevronRight className="h-4 w-4" />}>
                  Next: Creative
                </Btn>
              </div>
            </Section>
          ) : null}

          {step === "creative" ? (
            <Section title="2) Creative" subtitle="Pick hero media and item media from the Creator Asset Library (approved).">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Hero image</div>
                      <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                        Required: {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height} (horizontal). This is the hero poster behind the play icon.
                      </div>
                    </div>
                    <span className="rounded-full bg-neutral-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-extrabold text-neutral-800 dark:text-slate-300 ring-1 ring-neutral-200 dark:ring-slate-700 transition-colors">
                      {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height} (H)
                    </span>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-neutral-200 dark:ring-slate-800">
                    <img src={heroImageAsset?.url || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop"} alt="Hero" className="h-40 w-full object-cover" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Btn tone="primary" onClick={() => openAssetLibraryPicker("hero_image")} left={<Search className="h-4 w-4" />}>
                      Choose from Asset Library
                    </Btn>
                  </div>
                  <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800 transition-colors">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 text-amber-900 dark:text-amber-300" />
                      <div>
                        <div className="font-extrabold">Copyright reminder</div>
                        <div className="mt-1 text-xs">
                          Upload only media you own or have rights to use. Do not attach copyrighted third‑party content without permission.
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Hero intro video</div>
                  <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Plays when the hero play icon is tapped. This should be creator-produced content from the Asset Library.</div>
                  <div className="mt-3 rounded-2xl bg-neutral-50 dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{heroVideoAsset?.title || "No intro video selected"}</div>
                        <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                          Status:{" "}
                          <span className="font-bold">
                            {heroVideoAsset?.status ? heroVideoAsset.status.toUpperCase() : "—"}
                          </span>
                        </div>
                      </div>
                      <Pill tone={heroVideoAsset?.status === "approved" ? "good" : heroVideoAsset?.status === "pending" ? "warn" : "neutral"}>
                        <Video className="h-3.5 w-3.5" />
                        {heroVideoAsset?.status || "—"}
                      </Pill>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn tone="primary" onClick={() => openAssetLibraryPicker("hero_video")} left={<Film className="h-4 w-4" />}>
                        Choose intro video
                      </Btn>
                      <Btn tone="ghost" onClick={openHeroViewer} left={<Play className="h-4 w-4" />}>
                        Preview
                      </Btn>
                    </div>
                    <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                      Viewer overlay includes product chooser + Buy/Add-to-cart so buyers can pick what to purchase.
                    </div>
                  </div>
                </Card>
              </div>

              {/* Item posters + videos */}
              <div className="mt-4 rounded-3xl bg-neutral-50 dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Featured item media</div>
                    <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                      For each selected item, set a <span className="font-bold">poster image</span> (shows play icon) and a <span className="font-bold">video</span> (plays on tap).
                      Required poster size: {ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}.
                    </div>
                  </div>
                  <Pill tone="neutral">
                    <Package className="h-3.5 w-3.5" />
                    {selectedOffers.length} items
                  </Pill>
                </div>

                <div className="mt-3 space-y-3">
                  {selectedOffers.map((o) => {
                    const posterId = builder.itemPosterByOfferId[o.id];
                    const videoId = builder.itemVideoByOfferId[o.id];
                    const posterAsset = posterId ? assetById.get(posterId) : undefined;
                    const videoAsset = videoId ? assetById.get(videoId) : undefined;

                    return (
                      <div key={o.id} className="rounded-3xl bg-white dark:bg-slate-950 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{o.name}</div>
                            <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">{o.type === "SERVICE" ? "Service" : "Product"} · Default poster size: {ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Btn tone="ghost" onClick={() => openOfferViewer(o.id)} left={<Play className="h-4 w-4" />}>
                              Preview viewer
                            </Btn>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="rounded-2xl bg-neutral-50 dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Poster image</div>
                                <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Play icon sits on top of this image.</div>
                              </div>
                              <Pill tone="neutral">{ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}</Pill>
                            </div>
                            <div className="mt-2 overflow-hidden rounded-2xl ring-1 ring-neutral-200">
                              <img src={posterAsset?.url || o.catalogPosterUrl} alt="Poster" className="h-40 w-full object-cover" />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Btn tone="primary" onClick={() => openAssetLibraryPicker(`item_poster:${o.id}`)} left={<Search className="h-4 w-4" />}>
                                Choose poster
                              </Btn>
                              <Btn tone="ghost" onClick={() => setBuilder((p) => ({ ...p, itemPosterByOfferId: { ...p.itemPosterByOfferId, [o.id]: undefined } }))} left={<X className="h-4 w-4" />}>
                                Clear
                              </Btn>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-neutral-50 dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Product video</div>
                                <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Plays when the item play icon is tapped.</div>
                              </div>
                              <Pill tone={videoAsset?.status === "approved" ? "good" : videoAsset?.status === "pending" ? "warn" : "neutral"}>
                                <Video className="h-3.5 w-3.5" />
                                {videoAsset?.status || "catalog"}
                              </Pill>
                            </div>
                            <div className="mt-2 rounded-2xl bg-white dark:bg-slate-800 p-3 ring-1 ring-neutral-200 dark:ring-slate-700 transition-colors">
                              <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{videoAsset?.title || (o.catalogVideoUrl ? "Catalog video (fallback)" : "No video")}</div>
                              <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Desktop viewer: {(videoAsset?.desktopMode || "modal").toUpperCase()}</div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Btn tone="primary" onClick={() => openAssetLibraryPicker(`item_video:${o.id}`)} left={<Film className="h-4 w-4" />}>
                                Choose video
                              </Btn>
                              <Btn tone="ghost" onClick={() => setBuilder((p) => ({ ...p, itemVideoByOfferId: { ...p.itemVideoByOfferId, [o.id]: undefined } }))} left={<X className="h-4 w-4" />}>
                                Clear
                              </Btn>
                            </div>
                            <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                              When buyers tap play, a mode‑dependent viewer opens (mobile fullscreen; desktop modal or fullscreen depending on content).
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CTA builder */}
              <div className="mt-4">
                <Section title="CTA Builder" subtitle="Controls CTA text, labels, and landing behavior (premium).">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">CTA helper text</div>
                      <input
                        value={builder.ctaText}
                        onChange={(e) => setBuilder((p) => ({ ...p, ctaText: e.target.value }))}
                        className="mt-2 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                        placeholder="e.g. Shop the featured dealz before they end…"
                      />
                    </label>
                    <label className="text-sm">
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Landing behavior</div>
                      <select
                        value={builder.landingBehavior}
                        onChange={(e) => setBuilder((p) => ({ ...p, landingBehavior: e.target.value as BuilderState["landingBehavior"] }))}
                        className="mt-2 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                      >
                        {["Checkout", "Product detail", "External link"].map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Primary button label</div>
                      <input
                        value={builder.primaryCtaLabel}
                        onChange={(e) => setBuilder((p) => ({ ...p, primaryCtaLabel: e.target.value }))}
                        className="mt-2 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                        placeholder="Buy now"
                      />
                    </label>
                    <label className="text-sm">
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Secondary button label</div>
                      <input
                        value={builder.secondaryCtaLabel}
                        onChange={(e) => setBuilder((p) => ({ ...p, secondaryCtaLabel: e.target.value }))}
                        className="mt-2 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                        placeholder="Add to cart"
                      />
                    </label>
                    {builder.landingBehavior === "External link" ? (
                      <label className="text-sm md:col-span-2">
                        <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">External URL</div>
                        <input
                          value={builder.landingUrl || ""}
                          onChange={(e) => setBuilder((p) => ({ ...p, landingUrl: e.target.value }))}
                          className="mt-2 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                          placeholder="https://…"
                        />
                      </label>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-2xl bg-neutral-50 dark:bg-slate-900 p-3 text-sm text-neutral-700 dark:text-slate-400 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                    Preview updates instantly: hero viewer shows product chooser + your CTA labels. Item viewer uses per-item overlays + CTA labels.
                  </div>
                </Section>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-neutral-200 dark:border-slate-800 pt-6">
                <Btn tone="neutral" onClick={handleBack} left={<ChevronLeft className="h-4 w-4" />}>
                  Back: Offer
                </Btn>
                <Btn tone="primary" onClick={handleNext} right={<ChevronRight className="h-4 w-4" />}>
                  Next: Tracking
                </Btn>
              </div>
            </Section>
          ) : null}

          {step === "tracking" ? (
            <Section title="3) Tracking" subtitle="Short links + UTM presets library (premium).">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Short link</div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <label className="text-sm">
                      <div className="text-xs font-bold text-neutral-700 dark:text-slate-300">Domain</div>
                      <select
                        value={builder.shortDomain}
                        onChange={(e) => setBuilder((p) => ({ ...p, shortDomain: e.target.value as BuilderState["shortDomain"] }))}
                        className="mt-2 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                      >
                        {["mldz.link", "dealz.africa", "shp.adz"].map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm">
                      <div className="text-xs font-bold text-neutral-700 dark:text-slate-300">Slug</div>
                      <input
                        value={builder.shortSlug}
                        onChange={(e) => setBuilder((p) => ({ ...p, shortSlug: e.target.value }))}
                        className="mt-2 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100"
                        placeholder="e.g. adz-glow-1"
                      />
                    </label>

                    <div className="rounded-2xl bg-neutral-900 p-3 text-white">
                      <div className="text-xs text-white/80">Generated link</div>
                      <div className="mt-1 break-all text-sm font-extrabold">{shortLink}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Btn
                          tone="primary"
                          disabled={!isGenerated}
                          title={!isGenerated ? "Generate the ad to enable share links" : undefined}
                          onClick={() => copyText(shortLink, "Copied short link")}
                          left={<Copy className="h-4 w-4" />}
                        >
                          Copy
                        </Btn>
                        <Btn tone="neutral" onClick={() => setToast("Regenerated link (demo)")} left={<Zap className="h-4 w-4" />}>
                          Regenerate
                        </Btn>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800 transition-colors">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 text-amber-900 dark:text-amber-300" />
                        <div>
                          <div className="font-extrabold">Broken link monitor</div>
                          <div className="mt-1 text-xs">
                            Demo only here. In Tracking & Integrations you’ll have history, domain rules, and auto-fix actions.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">UTM presets library</div>
                      <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Pick a preset pack, then optionally override fields.</div>
                    </div>
                    <Pill tone="pro">
                      <Lock className="h-3.5 w-3.5" />
                      Pro
                    </Pill>
                  </div>

                  <div className="mt-3 space-y-2">
                    {UTM_PRESETS.map((p) => {
                      const active = p.id === builder.utmPresetId;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setBuilder((s) => ({ ...s, utmPresetId: p.id }))}
                          className={cx(
                            "w-full rounded-2xl p-3 text-left ring-1 transition",
                            active ? "bg-neutral-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-neutral-900 dark:ring-slate-100" : "bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 ring-neutral-200 dark:ring-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold">{p.name}</div>
                              <div className={cx("mt-1 text-xs", active ? "text-white/80 dark:text-slate-600" : "text-neutral-600 dark:text-slate-400")}>{p.description}</div>
                            </div>
                            {active ? (
                              <Pill tone="good">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Selected
                              </Pill>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 rounded-2xl bg-neutral-50 dark:bg-slate-900/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                    <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Effective UTM</div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      {Object.entries(mergedUtm).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-800 px-3 py-2 ring-1 ring-neutral-200 dark:ring-slate-700 transition-colors">
                          <div className="text-xs font-bold text-neutral-700 dark:text-slate-300">{k}</div>
                          <div className="truncate text-xs font-semibold text-neutral-900 dark:text-slate-100">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-neutral-600 dark:text-slate-400">
                    Next premium: UTM preset management (save/edit presets), channel tags, and source auto-fill from platform.
                  </div>
                </Card>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-neutral-200 dark:border-slate-800 pt-6">
                <Btn tone="neutral" onClick={handleBack} left={<ChevronLeft className="h-4 w-4" />}>
                  Back: Creative
                </Btn>
                <Btn tone="primary" onClick={handleNext} right={<ChevronRight className="h-4 w-4" />}>
                  Next: Schedule
                </Btn>
              </div>
            </Section>
          ) : null}

          {step === "schedule" ? (
            <Section title="4) Schedule" subtitle="Basic start and end time.">
              {/* Campaign window info */}
              <div className="mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-3 text-xs ring-1 ring-blue-200 dark:ring-blue-800 transition-colors">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-extrabold text-blue-900 dark:text-blue-100">Campaign Window</div>
                    <div className="mt-1 text-blue-800 dark:text-blue-200">
                      Your ad schedule must fall within the campaign period: <b>{fmtLocal(new Date(campaign.startsAtISO))}</b> to <b>{fmtLocal(new Date(campaign.endsAtISO))}</b>
                    </div>
                  </div>
                </div>
              </div>

              <Card>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-bold text-neutral-700 dark:text-slate-300">Start</div>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        min={toDateInputValue(new Date(campaign.startsAtISO))}
                        max={toDateInputValue(new Date(campaign.endsAtISO))}
                        className="w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100 dark:[color-scheme:dark]"
                        value={builder.startDate}
                        onChange={(e) => setBuilder((prev) => ({ ...prev, startDate: e.target.value }))}
                      />
                      <input
                        type="time"
                        className="w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100 dark:[color-scheme:dark]"
                        value={builder.startTime}
                        onChange={(e) => setBuilder((prev) => ({ ...prev, startTime: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-bold text-neutral-700 dark:text-slate-300">End</div>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        min={toDateInputValue(new Date(campaign.startsAtISO))}
                        max={toDateInputValue(new Date(campaign.endsAtISO))}
                        className="w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100 dark:[color-scheme:dark]"
                        value={builder.endDate}
                        onChange={(e) => setBuilder((prev) => ({ ...prev, endDate: e.target.value }))}
                      />
                      <input
                        type="time"
                        className="w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-neutral-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100 dark:[color-scheme:dark]"
                        value={builder.endTime}
                        onChange={(e) => setBuilder((prev) => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-neutral-500 dark:text-slate-400">
                  Scheduled for <b>{fmtLocal(startsAt)}</b> to <b>{fmtLocal(endsAt)}</b> (Local Time)
                </div>

                {(() => {
                  const val = validateSchedule(builder.campaignId, startsAt, endsAt);
                  if (!val.ok) {
                    return (
                      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-3 text-xs text-rose-900 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800 transition-colors">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <div>
                          <div className="font-extrabold text-rose-900 dark:text-rose-100">Schedule Violation</div>
                          <div className="mt-0.5">{val.error}</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </Card>

              <div className="mt-8 flex items-center justify-between border-t border-neutral-200 dark:border-slate-800 pt-6">
                <Btn tone="neutral" onClick={handleBack} left={<ChevronLeft className="h-4 w-4" />}>
                  Back: Tracking
                </Btn>
                <Btn
                  tone="primary"
                  onClick={handleNext}
                  right={<ChevronRight className="h-4 w-4" />}
                  disabled={!validateSchedule(builder.campaignId, startsAt, endsAt).ok}
                  title={!validateSchedule(builder.campaignId, startsAt, endsAt).ok ? "Fix schedule issues" : undefined}
                >
                  Next: Review
                </Btn>
              </div>
            </Section>
          ) : null}

          {step === "review" ? (
            <Section title="5) Review & Generate" subtitle="Confirm everything matches the Shoppable Ad template and passes preflight.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Summary</div>
                  <div className="mt-2 space-y-2 text-sm text-neutral-800 dark:text-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-600 dark:text-slate-400">Supplier</span>
                      <span className="font-extrabold text-neutral-900 dark:text-slate-100">{supplier?.name || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-600 dark:text-slate-400">Campaign</span>
                      <span className="font-extrabold text-neutral-900 dark:text-slate-100">{campaign?.name || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-600 dark:text-slate-400">Offers</span>
                      <span className="font-extrabold text-neutral-900 dark:text-slate-100">{builder.selectedOfferIds.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-600 dark:text-slate-400">Primary offer</span>
                      <span className="font-extrabold text-neutral-900 dark:text-slate-100">{primaryOffer?.name || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-600 dark:text-slate-400">Platforms</span>
                      <span className="font-extrabold text-neutral-900 dark:text-slate-100">{effectivePlatforms.length ? effectivePlatforms.join(", ") : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-600 dark:text-slate-400">Schedule</span>
                      <span className="font-extrabold text-neutral-900 dark:text-slate-100">{fmtLocal(startsAt)} → {fmtLocal(endsAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-600 dark:text-slate-400">Short link</span>
                      <span className="truncate font-extrabold text-neutral-900 dark:text-slate-100">{shortLink}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Btn tone="neutral" onClick={() => setToast("Exported creative pack (demo)")} left={<Upload className="h-4 w-4" />}>
                      Export pack
                    </Btn>
                    <Btn tone="neutral" onClick={() => setToast("Shared preview (demo)")} left={<Share2 className="h-4 w-4" />}>
                      Share preview
                    </Btn>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Preflight checklist</div>
                      <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Pass required items before generating.</div>
                    </div>
                    <Pill tone={preflight.ok ? "good" : "warn"}>{preflight.ok ? "Pass" : "Fail"}</Pill>
                  </div>

                  <div className="mt-3 space-y-2 max-h-[340px] overflow-auto pr-1">
                    {preflight.issues.map((i) => (
                      <div key={i.label} className="flex items-start justify-between gap-2 rounded-2xl bg-neutral-50 dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-neutral-900 dark:text-slate-100">{i.label}</div>
                          {!i.ok && i.fix ? <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">{i.fix}</div> : null}
                        </div>
                        <Pill tone={i.ok ? "good" : "warn"}>{i.ok ? "OK" : "Fix"}</Pill>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Btn
                      tone="primary"
                      disabled={!preflight.ok}
                      onClick={() => {
                        setIsGenerated(true);
                        setToast(isGenerated ? "Ad updated" : "Success! Your ad is now visible to followers.");
                        setShowSharePanel(true);
                      }}
                      left={<BadgeCheck className="h-4 w-4" />}
                      className="w-full"
                      title={!preflight.ok ? "Fix preflight issues" : undefined}
                    >
                      {isGenerated ? "Update Ad" : "Publish Ad"}
                    </Btn>
                    <Btn tone="neutral" onClick={() => setToast("Saved as template (demo)")} left={<Sparkles className="h-4 w-4" />} className="w-full">
                      Save template
                    </Btn>
                  </div>
                </Card>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Share packs (per platform)</div>
                  <div className="mt-1 text-xs text-neutral-600">
                    Each selected platform gets its own share link (unique <span className="font-semibold">utm_source</span>) once you generate.
                  </div>

                  {platformSharePacks.length ? (
                    <div className="mt-3 space-y-2">
                      {platformSharePacks.map((p) => (
                        <div key={p.platform} className="rounded-2xl bg-white dark:bg-slate-950 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{p.platform}</div>
                              <div className="mt-1 truncate text-xs text-neutral-600 dark:text-slate-400">{p.link}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Btn
                                tone="neutral"
                                onClick={() => copyText(p.link, "Copied platform link")}
                                disabled={!isGenerated}
                                title={!isGenerated ? "Generate the ad to enable share links" : undefined}
                                left={<Copy className="h-4 w-4" />}
                              >
                                Copy link
                              </Btn>
                              <Btn
                                tone="neutral"
                                onClick={() => copyText(p.text, "Copied share text")}
                                disabled={!isGenerated}
                                title={!isGenerated ? "Generate the ad to enable share text" : undefined}
                                left={<Share2 className="h-4 w-4" />}
                              >
                                Copy share text
                              </Btn>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800 transition-colors">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 text-amber-900 dark:text-amber-300" />
                        <div>
                          <div className="font-extrabold">Select platforms first</div>
                          <div className="mt-1">Go to step 1 and choose one or more platforms to generate share packs.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                <Card>
                  <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Generation notes</div>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-neutral-700 dark:text-slate-300">
                    <li>Share packs appear after your Ad is ready and generated (preflight pass).</li>
                    <li>If “Other” platforms are selected, you’ll also get share packs for those custom platforms.</li>
                    <li>Remember to include required disclosures (e.g., <span className="font-semibold">#ad</span>, <span className="font-semibold">#sponsored</span>) where applicable.</li>
                  </ul>
                </Card>
              </div>

              <div className="mt-8 flex items-center justify-start border-t border-neutral-200 dark:border-slate-800 pt-6">
                <Btn tone="neutral" onClick={handleBack} left={<ChevronLeft className="h-4 w-4" />}>
                  Back: Schedule
                </Btn>
              </div>
            </Section>
          ) : null}
        </div>

        {/* Right: preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Shoppable Ad Preview</div>
                <div className="mt-1 text-xs text-neutral-600">
                  Matches the Shoppable Ad template layout + viewer behavior (host-first). Tap play icons to verify overlays.
                </div>
              </div>
              <Pill tone="neutral">
                <Phone className="h-3.5 w-3.5" />
                Preview
              </Pill>
            </div>

            <div className="mt-3">
              <ShoppableAdPreview
                title={campaign?.name ? `${campaign.name}` : "Shoppable Adz"}
                sharedByCreatorLabel={`Shared by ${CREATOR.handle} · Platforms: ${effectivePlatforms.length ? effectivePlatforms.join(" · ") : "—"}`}
                supplierName={supplier?.name}
                campaignStatus={campaign?.status}
                ctaHelperText={builder.ctaText}
                primaryCtaLabel={builder.primaryCtaLabel}
                secondaryCtaLabel={builder.secondaryCtaLabel}
                heroImageUrl={heroImageAsset?.url || ASSETS[0].url}
                heroIntroVideo={heroVideoAsset?.kind === "video" ? { url: heroVideoAsset.url, poster: heroVideoAsset.posterUrl } : undefined}
                offers={selectedOffers}
                primaryOfferId={builder.primaryOfferId}
                perOfferPosterUrl={perOfferPosterUrl}
                perOfferVideo={Object.fromEntries(
                  Object.entries(perOfferVideoUrl).map(([k, v]) => [k, v ? { url: v } : undefined])
                )}
                startsAt={startsAt}
                endsAt={endsAt}
                onPlayHero={openHeroViewer}
                onPlayOffer={openOfferViewer}
                onBuy={buyNow}
                onAdd={addToCart}
                cart={cart}
                shareEnabled={isGenerated}
                onDecCart={decCart}
                onClearCart={clearCart}
                onShare={shareCurrent}
              />
            </div>
          </div>

          <div className="rounded-3xl bg-neutral-900 p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-white/80">Share link used in preview</div>
                <div className="mt-1 break-all text-sm font-extrabold">{shortLink}</div>
                <div className="mt-1 text-xs text-white/70">
                  In production: connect to Tracking & Integrations for pixel status, monitoring, and payout reminders.
                </div>
              </div>
              <Btn
                tone="primary"
                onClick={shareCurrent}
                disabled={!isGenerated}
                title={!isGenerated ? "Generate the ad to enable share links" : undefined}
                left={<Copy className="h-4 w-4" />}
              >
                Copy
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Viewer modal/fullscreen */}
      <MediaViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        ctx={viewerCtx}
        mode={viewerMode}
        countdownState={countdownState}
        countdownLabel={countdownLabel}
        stockLabel={viewerStockLabel}
        priceLabel={viewerPriceLabel}
        primaryCtaLabel={builder.primaryCtaLabel}
        secondaryCtaLabel={builder.secondaryCtaLabel}
        onBuyNow={viewerBuyNow}
        onAddToCart={viewerAddToCart}
        onLove={() => setLoved((s) => !s)}
        loved={loved}
        onShare={shareCurrent}
        heroProducts={viewerCtx?.kind === "hero" ? heroProducts : undefined}
        selectedHeroOfferId={viewerCtx?.kind === "hero" ? selectedHeroOfferId : undefined}
        onSelectHeroOfferId={viewerCtx?.kind === "hero" ? setSelectedHeroOfferId : undefined}
      />

      {/* Share Panel */}
      <AnimatePresence>
        {showSharePanel && (
          <SharePanel
            open={showSharePanel}
            onClose={() => setShowSharePanel(false)}
            link={shortLink}
            onCopy={copyText}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      {
        toast ? (
          <div className="fixed bottom-4 left-1/2 z-[99] -translate-x-1/2">
            <div className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white shadow-lg">{toast}</div>
          </div>
        ) : null
      }
    </div >
  );

  // If opened as drawer-route, render as a drawer shell
  if (drawerMode) {
    return (
      <DrawerShell open={true} title="Ad Builder" subtitle="Offer → Creative → Tracking → Schedule → Review (host-first)" onClose={onClose || (() => window.history.back())}>
        {content}
      </DrawerShell>
    );
  }

  return content;
}

// NOTE: lucide-react doesn't export Phone icon in some versions; provide a tiny fallback.

/** ------------------------------ Share Panel ------------------------------ */

function SharePanel({
  open,
  onClose,
  link,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  link: string;
  onCopy: (text: string, msg: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white p-8 shadow-2xl dark:bg-slate-900 transition-colors"
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-3xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-extrabold text-neutral-900 dark:text-slate-100">Success!</h3>
          <p className="mt-2 text-sm text-neutral-500 dark:text-slate-400">
            Your session is now live and <span className="font-bold text-emerald-600 dark:text-emerald-400">Visible to Followers</span>.
          </p>
        </div>

        <div className="mt-8 space-y-6 text-left">
          {/* Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500">Share Link</label>
            <div className="flex items-center gap-2 rounded-2xl bg-neutral-50 p-2 ring-1 ring-neutral-200 dark:bg-slate-950 dark:ring-slate-800 transition-colors">
              <div className="min-w-0 flex-1 truncate px-2 text-sm text-neutral-600 dark:text-slate-300">
                {link}
              </div>
              <button
                onClick={() => onCopy(link, "Copied share link!")}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all"
              >
                Copy
              </button>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500">QR Code Entry</label>
            <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-neutral-100 p-4 dark:border-slate-800 transition-colors">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-50 dark:bg-slate-950 transition-colors">
                <QrCode className="h-10 w-10 text-neutral-300 dark:text-slate-700" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-neutral-900 dark:text-slate-100">Download for physical signage</div>
                <div className="mt-1 text-xs text-neutral-500 dark:text-slate-400">Print it on flyers, packaging, or store displays.</div>
              </div>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex items-center justify-center gap-6 pt-2">
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-lg shadow-pink-500/20 hover:scale-110 transition-transform">
              <Instagram className="h-6 w-6" />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00f2ea] text-black shadow-lg shadow-cyan-500/20 hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M12.525.023c1.723 0 3.36.434 4.8 1.202.14.075.244.204.288.358.044.154.02.32-.066.453l-.934 1.455c-.07.11-.186.186-.316.21-.131.024-.265-.008-.373-.088-.845-.626-1.85-1.01-2.935-1.04-.376-.01-.75.02-1.12.086-.78.14-1.503.49-2.097 1.012-.66.582-1.11 1.344-1.294 2.196-.2 1.1-.06 2.22.4 3.23.16.354.364.685.61 1 .094.12.115.285.056.425-.06.14-.194.24-.347.26-.583.074-1.15.113-1.724.113H1.38c-.16 0-.315-.078-.415-.213-.1-.135-.13-.306-.082-.468l.942-3.13c.27-.89.702-1.72 1.272-2.454.59-.76 1.32-1.39 2.13-1.84a6.7 6.7 0 012.87-.936c.553-.06 1.113-.09 1.67-.09zm.41 12.01c.795 0 1.57.17 2.28.49 1.07.484 1.94 1.293 2.5 2.304.57 1.014.832 2.186.74 3.344-.1 1.246-.62 2.403-1.484 3.29-.838.86-1.954 1.442-3.168 1.65-.67.115-1.35.15-2.04.11a7.7 7.7 0 01-3.37-.96 1.15 1.15 0 01-.15-.17l-.87-1.42c-.08-.13-.1-.28-.06-.43.04-.15.14-.27.27-.34.78-.43 1.68-.68 2.61-.73.49-.03.985.013 1.474.12.607.132 1.173.42 1.63.834.428.384.75 1.04.82 2.016.035.485.035.97 0 1.455-.008.114-.06.22-.146.29a.434.434 0 01-.31.12h-9.92c-.184 0-.356-.1-.444-.26a.48.48 0 01-.05-.44l.805-2.73a4.9 4.9 0 01.99-1.82 5.8 5.8 0 011.833-1.45 6.9 6.9 0 012.783-.824c.73-.06 1.46-.08 2.19-.06z" /></svg>
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-green-500/20 hover:scale-110 transition-transform">
              <MessageCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Phone(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cx("h-4 w-4", props?.className)}>
      <rect x="7" y="2" width="10" height="20" rx="2" ry="2" />
      <path d="M11 18h2" />
    </svg>
  );
}
