"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useMobile } from "../../hooks/useMobile";
import { useApiResource } from "../../hooks/useApiResource";
import { creatorApi, type DealzMarketplaceWorkspaceResponse } from "../../lib/creatorApi";
import { formatCurrencyValue } from "../../utils/formatUtils";
import { PageHeader } from "../../components/PageHeader";
import { AdzPerformanceDrawer, PerformanceEntity, PerfPlatform } from "./AdzPerformance";
import AdBuilder from "./AdBuilder";
import { useNotification } from "../../contexts/NotificationContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { CircularProgress } from "@mui/material";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Filter,
  Globe,
  Heart,
  LayoutGrid,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShoppingCart,
  Sparkles,
  Timer,
  TrendingUp,
  User,
  Wand2,
  X,
  Zap,
} from "lucide-react";

/**
 * Adz Dashboard — Regenerated (Premium)
 * ------------------------------------
 * Purpose:
 * - Creator/ops dashboard for Shoppable Adz
 * - Shows premium analytics + operational controls
 * - Wires to:
 *   - Ad Builder (independent page):   /ad-builder?context=dashboard
 *   - Adz Manager:                    /adz-manager
 *   - Adz Marketplace:                /adz-marketplace
 *   - Adz Performance (deep analytics):/adz-performance?adId=...
 *   - Asset Library (picker-friendly): /asset-library
 *
 * Key updates:
 * - Supports Products + Services
 * - Retail + Wholesale support (Wholesale affects Product offers only)
 * - Share/copy link disabled until Ad is Generated
 * - Hero media canonical size: 1920×1080
 * - Offer posters canonical size: 500×500, 2 per row in preview surfaces (builder/marketplace)
 *
 * Notes:
 * - This page keeps the original UI while reading its data from backend workspace endpoints.
 */

const ORANGE = "#f77f00";

// Canonical sizes (selected from your supported sizes list)
const HERO_IMAGE_REQUIRED = { width: 1920, height: 1080 } as const;
const ITEM_POSTER_REQUIRED = { width: 500, height: 500 } as const;

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type OfferType = "PRODUCT" | "SERVICE";
type SellingMode = "RETAIL" | "WHOLESALE";

type Compensation =
  | { type: "Commission"; commissionRate: number }
  | { type: "Flat fee"; flatFee: number; currency: "UGX" | "USD" | "GBP" }
  | { type: "Hybrid"; commissionRate: number; flatFee: number; currency: "UGX" | "USD" | "GBP" };

type WholesaleTier = { minQty: number; unitPrice: number };
type WholesalePricing = {
  moq: number;
  step: number;
  tiers: WholesaleTier[];
  leadTimeLabel?: string;
  businessOnly?: boolean;
};

type Offer = {
  id: string;
  type: OfferType;
  name: string;
  currency: "UGX" | "USD" | "GBP";
  price: number; // retail price or service price
  basePrice?: number;
  stockLeft: number; // -1 unlimited / not applicable
  posterUrl: string; // 500×500 recommended
  videoUrl?: string;
  sellingModes?: SellingMode[]; // products mainly
  defaultSellingMode?: SellingMode;
  wholesale?: WholesalePricing;
  serviceMeta?: { durationMins?: number; bookingType?: "Instant" | "Request" };
};

type AdStatus = "Draft" | "Scheduled" | "Generated" | "Live" | "Ended" | "Paused" | "Pending approval" | "Rejected";

type Ad = {
  id: string;
  campaignName: string;
  campaignSubtitle: string;

  supplier: { name: string; category: string; logoUrl: string };
  creator: { name: string; handle: string; avatarUrl: string; verified?: boolean };

  status: AdStatus;
  platforms: string[];
  startISO: string;
  endISO: string;
  timezone: string;

  heroImageUrl: string; // 1920×1080 recommended
  heroIntroVideoUrl?: string;

  compensation: Compensation;
  offers: Offer[];

  generated: boolean;

  // health flags (premium trust)
  hasBrokenLink: boolean;
  lowStock: boolean;
  lock?: { locked: boolean; label: string; reason: string };

  // analytics snapshot
  impressions7d: number;
  clicks7d: number;
  orders7d: number;
  revenue7d: number;
  currency: "UGX" | "USD" | "GBP";
};

function money(currency: "UGX" | "USD" | "GBP", amount: number, isMobile = false) {
  return formatCurrencyValue(currency, amount, { isMobile, maximumFractionDigits: 0 });
}

function fmtLocal(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function enabledModesForOffer(o: Offer): SellingMode[] {
  if (o.type === "SERVICE") return ["RETAIL"];
  const ms = (o.sellingModes || []).filter(Boolean);
  return ms.length ? ms : ["RETAIL"];
}
function hasWholesale(o: Offer) {
  return o.type === "PRODUCT" && enabledModesForOffer(o).includes("WHOLESALE");
}
function hasRetail(o: Offer) {
  return enabledModesForOffer(o).includes("RETAIL");
}
function compensationLabel(c: Compensation) {
  if (c.type === "Commission") return `Commission · ${(c.commissionRate * 100).toFixed(0)}%`;
  if (c.type === "Flat fee") return `Flat fee · ${money(c.currency, c.flatFee)}`;
  return `Hybrid · ${(c.commissionRate * 100).toFixed(0)}% + ${money(c.currency, c.flatFee)}`;
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function Pill({
  tone = "neutral",
  children,
  title,
}: {
  tone?: "neutral" | "brand" | "good" | "warn" | "bad" | "pro";
  children: React.ReactNode;
  title?: string;
}) {
  const cls =
    tone === "brand"
      ? "bg-orange-500 text-white border-transparent"
      : tone === "good"
        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
        : tone === "warn"
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300"
          : tone === "bad"
            ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300"
            : tone === "pro"
              ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-300"
              : "bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-800 dark:text-slate-300";
  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-extrabold", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({
  tone = "neutral",
  left,
  className,
  disabled,
  onClick,
  children,
  title,
  isPending,
}: {
  tone?: "primary" | "neutral";
  left?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  title?: string;
  isPending?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-extrabold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-900 dark:text-neutral-100";
  return (
    <button
      type="button"
      className={cx(base, cls, className)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
      disabled={disabled || isPending}
      onClick={onClick}
      title={title}
    >
      {isPending ? <CircularProgress size={14} color="inherit" /> : left}
      {children}
    </button>
  );
}

function Drawer({
  open,
  title,
  onClose,
  children,
  zIndex,
}: {
  width?: string;
  zIndex?: number;
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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

  if (!open) return null;

  return (
    <div className="fixed inset-0" style={{ zIndex: zIndex || 120 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 shadow-2xl flex flex-col transition-colors">
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="text-[13px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          <button
            type="button"
            className="rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[12px] font-extrabold hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-900 dark:text-slate-100 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

/** ------------------------------ Charts (no external libs) ------------------------------ */

function LineChart({
  title,
  subtitle,
  seriesA,
  seriesB,
  aLabel,
  bLabel,
}: {
  title: string;
  subtitle?: string;
  seriesA: number[];
  seriesB?: number[];
  aLabel: string;
  bLabel?: string;
}) {
  const w = 640;
  const h = 160;
  const pad = 16;

  const all = [...seriesA, ...(seriesB || [])];
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);

  function x(i: number) {
    return pad + (i * (w - pad * 2)) / Math.max(1, seriesA.length - 1);
  }
  function y(v: number) {
    const t = (v - min) / Math.max(1e-9, max - min);
    return h - pad - t * (h - pad * 2);
  }

  function pathFor(s: number[]) {
    return s.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  }

  const pA = pathFor(seriesA);
  const pB = seriesB?.length ? pathFor(seriesB) : "";

  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{subtitle}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="neutral">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ORANGE }} />
            {aLabel}
          </Pill>
          {seriesB?.length ? (
            <Pill tone="neutral">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-900/70" />
              {bLabel || "Series B"}
            </Pill>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-950 transition-colors">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[160px] w-full">
          {/* grid */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={pad}
              y1={pad + t * (h - pad * 2)}
              x2={w - pad}
              y2={pad + t * (h - pad * 2)}
              strokeWidth="1"
              className="stroke-neutral-900/10 dark:stroke-slate-100/10"
            />
          ))}
          {/* series */}
          <path d={pA} fill="none" stroke={ORANGE} strokeWidth="3" strokeLinejoin="round" />
          {pB ? <path d={pB} fill="none" className="stroke-neutral-900/70 dark:stroke-slate-100/70" strokeWidth="3" strokeLinejoin="round" /> : null}
        </svg>
      </div>
    </div>
  );
}

function DonutChart({
  title,
  subtitle,
  segments,
}: {
  title: string;
  subtitle?: string;
  segments: Array<{ label: string; value: number; tone?: "brand" | "neutral" | "good" | "warn" | "bad" | "pro" }>;
}) {
  const { theme } = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 44;
  const c = 60;
  const circ = 2 * Math.PI * r;

  let acc = 0;

  const colorFor = (tone?: string) => {
    if (tone === "brand") return ORANGE;
    if (tone === "good") return "rgb(16 185 129)";
    if (tone === "warn") return "rgb(245 158 11)";
    if (tone === "bad") return "rgb(244 63 94)";
    if (tone === "pro") return "rgb(139 92 246)";
    return theme === "dark" ? "rgba(241, 245, 249, 0.75)" : "rgba(17, 24, 39, 0.75)";
  };

  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 transition-colors">
      <div>
        <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
        {subtitle ? <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{subtitle}</div> : null}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
          <circle cx={c} cy={c} r={r} fill="none" className="stroke-neutral-900/10 dark:stroke-slate-100/10" strokeWidth="14" />
          {segments.map((s, idx) => {
            const frac = s.value / total;
            const dash = frac * circ;
            const gap = circ - dash;
            const offset = -acc * circ;
            acc += frac;
            return (
              <circle
                key={idx}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={colorFor(s.tone)}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${c} ${c})`}
              />
            );
          })}
          <text x="60" y="57" textAnchor="middle" className="fill-neutral-900 dark:fill-slate-100" style={{ fontSize: 12, fontWeight: 900 }}>
            Total
          </text>
          <text x="60" y="75" textAnchor="middle" className="fill-neutral-900 dark:fill-slate-100" style={{ fontSize: 14, fontWeight: 900 }}>
            {total.toLocaleString()}
          </text>
        </svg>

        <div className="min-w-0 flex-1 space-y-2">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(s.tone) }} />
                <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{s.label}</div>
              </div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
                {s.value.toLocaleString()} <span className="text-[11px] font-semibold text-neutral-500 dark:text-slate-400">({pct(s.value / total)})</span>
              </div>
            </div>
          ))}
          <div className="pt-1 text-[11px] text-neutral-600 dark:text-slate-400">
            Tip: Wholesale is product-only; services don’t participate in wholesale counts.
          </div>
        </div>
      </div>
    </div>
  );
}

function BarList({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: number; hint?: string }>;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{subtitle}</div> : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{r.label}</div>
                {r.hint ? <div className="mt-0.5 text-[11px] text-neutral-600 dark:text-slate-400">{r.hint}</div> : null}
              </div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{r.value.toLocaleString()}</div>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-neutral-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: ORANGE }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ------------------------------ Mock data ------------------------------ */

const EMPTY_MARKETPLACE_STATE: DealzMarketplaceWorkspaceResponse = {
  deals: [],
  suppliers: [],
  creators: [],
  selectedId: "",
  cart: {},
  liveCart: {},
};

const BLANK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asCurrency(value: unknown, fallback: "UGX" | "USD" | "GBP" = "UGX"): "UGX" | "USD" | "GBP" {
  const normalized = asString(value, fallback).toUpperCase();
  if (normalized === "UGX" || normalized === "USD" || normalized === "GBP") {
    return normalized;
  }
  return fallback;
}

function parseCompactMetric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/,/g, "").trim().toLowerCase();
  if (!cleaned) return null;
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)([kmb])?$/);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = match[2] || "";
  if (suffix === "k") return Math.round(base * 1_000);
  if (suffix === "m") return Math.round(base * 1_000_000);
  if (suffix === "b") return Math.round(base * 1_000_000_000);
  return Math.round(base);
}

function metricFromKpis(kpisRaw: unknown, labels: string[]): number | null {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  for (const entry of asArray(kpisRaw)) {
    const record = asRecord(entry);
    if (!record) continue;
    const label = asString(record.label, "").toLowerCase();
    if (!label || !normalizedLabels.some((target) => label.includes(target))) continue;
    const metric = parseCompactMetric(record.value);
    if (metric !== null) return metric;
  }
  return null;
}

function normalizeStatus(value: unknown): AdStatus {
  const raw = asString(value, "").trim().toLowerCase();
  if (raw.includes("pending")) return "Pending approval";
  if (raw.includes("reject")) return "Rejected";
  if (raw.includes("pause")) return "Paused";
  if (raw.includes("end") || raw.includes("complete")) return "Ended";
  if (raw.includes("live")) return "Live";
  if (raw.includes("generated") || raw.includes("publish") || raw.includes("active")) return "Generated";
  if (raw.includes("schedule")) return "Scheduled";
  return "Draft";
}

function normalizeRate(value: unknown, fallback = 0.1) {
  const raw = asNumber(value, fallback);
  if (raw > 1) {
    return raw / 100;
  }
  return raw;
}

function mapCompensation(raw: unknown, fallbackCurrency: "UGX" | "USD" | "GBP"): Compensation {
  const record = asRecord(raw);
  const rawType = asString(record?.type, "").trim().toLowerCase();
  const commissionRate = normalizeRate(record?.commissionRate, 0.1);
  const flatFee = asNumber(record?.flatFee, 0);
  const currency = asCurrency(record?.currency, fallbackCurrency);

  if (rawType.includes("hybrid")) {
    return { type: "Hybrid", commissionRate, flatFee, currency };
  }
  if (rawType.includes("flat")) {
    return { type: "Flat fee", flatFee, currency };
  }
  return { type: "Commission", commissionRate };
}

function mapOffer(raw: unknown, index: number, fallbackPosterUrl: string): Offer {
  const record = asRecord(raw);
  const type = asString(record?.type, "PRODUCT").toUpperCase() === "SERVICE" ? "SERVICE" : "PRODUCT";
  const sellingModes = asArray(record?.sellingModes)
    .map((entry) => asString(entry, "").toUpperCase())
    .filter((entry): entry is SellingMode => entry === "RETAIL" || entry === "WHOLESALE");
  const defaultModeRaw = asString(record?.defaultSellingMode, "").toUpperCase();
  const defaultSellingMode: SellingMode | undefined = defaultModeRaw === "WHOLESALE" ? "WHOLESALE" : defaultModeRaw === "RETAIL" ? "RETAIL" : undefined;

  const wholesaleRaw = asRecord(record?.wholesale);
  const tiers = asArray(wholesaleRaw?.tiers)
    .map((tier) => asRecord(tier))
    .filter((tier): tier is Record<string, unknown> => Boolean(tier))
    .map((tier) => ({
      minQty: Math.max(1, asNumber(tier.minQty, 1)),
      unitPrice: Math.max(0, asNumber(tier.unitPrice, 0)),
    }))
    .filter((tier) => tier.unitPrice > 0);

  return {
    id: asString(record?.id, `offer_${index + 1}`),
    type,
    name: asString(record?.name, "Offer"),
    currency: asCurrency(record?.currency, "UGX"),
    price: Math.max(0, asNumber(record?.price, 0)),
    basePrice: typeof record?.basePrice === "number" ? record.basePrice : undefined,
    stockLeft: asNumber(record?.stockLeft, 0),
    posterUrl: asString(record?.posterUrl, fallbackPosterUrl),
    videoUrl: asString(record?.videoUrl, "") || undefined,
    sellingModes: sellingModes.length ? sellingModes : undefined,
    defaultSellingMode,
    wholesale: tiers.length
      ? {
          moq: Math.max(1, asNumber(wholesaleRaw?.moq, tiers[0]?.minQty || 1)),
          step: Math.max(1, asNumber(wholesaleRaw?.step, 1)),
          leadTimeLabel: asString(wholesaleRaw?.leadTimeLabel, "") || undefined,
          businessOnly: asBoolean(wholesaleRaw?.businessOnly, false),
          tiers,
        }
      : undefined,
    serviceMeta:
      type === "SERVICE"
        ? {
            durationMins: asNumber(asRecord(record?.serviceMeta)?.durationMins, 0) || undefined,
            bookingType: asString(asRecord(record?.serviceMeta)?.bookingType, "Instant") === "Request" ? "Request" : "Instant",
          }
        : undefined,
  };
}

function mapMarketplaceDealToAd(raw: unknown, index: number): Ad | null {
  const record = asRecord(raw);
  if (!record) return null;
  const shoppable = asRecord(record.shoppable);
  if (!shoppable) return null;

  const supplierRecord = asRecord(record.supplier);
  const creatorRecord = asRecord(record.creator);

  const offersRaw = asArray(shoppable.offers);
  const fallbackHero = asString(shoppable.heroImageUrl, asString(supplierRecord?.logoUrl, BLANK_IMAGE) || BLANK_IMAGE);
  const offers = offersRaw.map((offer, offerIndex) => mapOffer(offer, offerIndex, fallbackHero));

  const inferredCurrency = offers[0]?.currency || asCurrency(shoppable.currency, "UGX");
  const metricsRecord = asRecord(shoppable.metrics);
  const status = normalizeStatus(shoppable.status ?? record.status);

  const impressions7d =
    asNumber(shoppable.impressions7d, Number.NaN) ||
    asNumber(metricsRecord?.impressions, Number.NaN) ||
    metricFromKpis(shoppable.kpis, ["view", "impression"]) ||
    0;
  const clicks7d =
    asNumber(shoppable.clicks7d, Number.NaN) ||
    asNumber(metricsRecord?.clicks, Number.NaN) ||
    metricFromKpis(shoppable.kpis, ["click"]) ||
    0;
  const orders7d =
    asNumber(shoppable.orders7d, Number.NaN) ||
    asNumber(metricsRecord?.orders, Number.NaN) ||
    metricFromKpis(shoppable.kpis, ["order", "purchase", "sale"]) ||
    0;
  const revenue7d =
    asNumber(shoppable.revenue7d, Number.NaN) ||
    asNumber(metricsRecord?.revenue, Number.NaN) ||
    asNumber(metricsRecord?.earnings, Number.NaN) ||
    metricFromKpis(shoppable.kpis, ["revenue", "earning", "gmv"]) ||
    0;

  const generated = status === "Generated" || status === "Live" || status === "Ended" || asBoolean(shoppable.generated, false);
  const lowStock = asBoolean(shoppable.lowStock, false) || offers.some((offer) => offer.type === "PRODUCT" && offer.stockLeft >= 0 && offer.stockLeft <= 5);

  return {
    id: asString(record.id, `adz_${index + 1}`),
    campaignName: asString(shoppable.campaignName, asString(record.title, "")),
    campaignSubtitle: asString(shoppable.campaignSubtitle, asString(record.tagline, "")),
    supplier: {
      name: asString(supplierRecord?.name, ""),
      category: asString(supplierRecord?.category, ""),
      logoUrl: asString(supplierRecord?.logoUrl, BLANK_IMAGE) || BLANK_IMAGE,
    },
    creator: {
      name: asString(creatorRecord?.name, ""),
      handle: (() => {
        const handle = asString(creatorRecord?.handle, "");
        if (!handle) return "";
        return handle.startsWith("@") ? handle : `@${handle}`;
      })(),
      avatarUrl: asString(creatorRecord?.avatarUrl, BLANK_IMAGE) || BLANK_IMAGE,
      verified: asBoolean(creatorRecord?.verified, false),
    },
    status,
    platforms: asArray(shoppable.platforms).map((entry) => asString(entry, "")).filter(Boolean),
    startISO: asString(shoppable.startISO, asString(record.startISO, new Date().toISOString())),
    endISO: asString(shoppable.endISO, asString(record.endISO, new Date(Date.now() + 60 * 60 * 1000).toISOString())),
    timezone: asString(shoppable.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
    heroImageUrl: asString(shoppable.heroImageUrl, offers[0]?.posterUrl || BLANK_IMAGE),
    heroIntroVideoUrl: asString(shoppable.heroIntroVideoUrl, "") || undefined,
    compensation: mapCompensation(shoppable.compensation ?? record.compensation, inferredCurrency),
    offers,
    generated,
    hasBrokenLink: asBoolean(shoppable.hasBrokenLink, false),
    lowStock,
    lock: (() => {
      const lock = asRecord(shoppable.lock);
      if (!lock || !asBoolean(lock.locked, false)) return undefined;
      return {
        locked: true,
        label: asString(lock.label, "Locked"),
        reason: asString(lock.reason, "Editing is locked for this ad"),
      };
    })(),
    impressions7d: Math.max(0, impressions7d),
    clicks7d: Math.max(0, clicks7d),
    orders7d: Math.max(0, orders7d),
    revenue7d: Math.max(0, revenue7d),
    currency: inferredCurrency,
  };
}

function mapMarketplacePayloadToAds(payload: DealzMarketplaceWorkspaceResponse): Ad[] {
  return asArray(payload.deals)
    .map((deal, index) => mapMarketplaceDealToAd(deal, index))
    .filter((deal): deal is Ad => Boolean(deal));
}

function buildTrendSeries(ads: Ad[], key: "impressions7d" | "orders7d") {
  const series = ads.map((ad) => Math.max(0, Math.round(ad[key]))).filter((value) => Number.isFinite(value));
  return series.length ? series : [0];
}

/** ------------------------------ Page ------------------------------ */

type DrawerKey = null | "calendar" | "quickLinks" | "performance" | "builder";

export default function AdzDashboard() {
  const { showSuccess, showNotification } = useNotification();
  const { run, isPending } = useAsyncAction();
  const isMobile = useMobile();

  const [drawer, setDrawer] = useState<DrawerKey>(null);
  const [drawerData, setDrawerData] = useState<string | undefined>(undefined);

  const { data: workspaceState, setData: setWorkspaceState } = useApiResource<DealzMarketplaceWorkspaceResponse>({
    initialData: EMPTY_MARKETPLACE_STATE,
    loader: () => creatorApi.dealzMarketplace(),
    onError: () => {
      showNotification("Unable to load dashboard data from API.", "error");
    },
  });

  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(() => ads.find((a) => a.id === selectedId) || ads[0], [ads, selectedId]);
  const drawerAd = useMemo(
    () => ads.find((ad) => ad.id === drawerData) || selected,
    [ads, drawerData, selected],
  );

  useEffect(() => {
    const nextAds = mapMarketplacePayloadToAds(workspaceState || EMPTY_MARKETPLACE_STATE);
    const selectedFromPayload = asString(workspaceState?.selectedId, "");
    setAds(nextAds);
    setSelectedId((current) => {
      if (current && nextAds.some((ad) => ad.id === current)) {
        return current;
      }
      if (selectedFromPayload && nextAds.some((ad) => ad.id === selectedFromPayload)) {
        return selectedFromPayload;
      }
      return nextAds[0]?.id || "";
    });
  }, [workspaceState]);

  // Search/filter
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AdStatus | "All">("All");
  const [onlyWholesaleReady, setOnlyWholesaleReady] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ads
      .filter((a) => (status === "All" ? true : a.status === status))
      .filter((a) => {
        if (!onlyWholesaleReady) return true;
        return a.offers.some((o) => hasWholesale(o));
      })
      .filter((a) => {
        if (!query) return true;
        return (
          a.campaignName.toLowerCase().includes(query) ||
          a.supplier.name.toLowerCase().includes(query) ||
          a.creator.handle.toLowerCase().includes(query)
        );
      });
  }, [ads, q, status, onlyWholesaleReady]);

  const seriesImpr = useMemo(() => buildTrendSeries(ads, "impressions7d"), [ads]);
  const seriesOrders = useMemo(() => buildTrendSeries(ads, "orders7d"), [ads]);

  const retailWholesaleSplit = useMemo(() => {
    // simple derived counts from offers
    let retail = 0;
    let wholesale = 0;
    let services = 0;
    ads.forEach((a) => {
      a.offers.forEach((o) => {
        if (o.type === "SERVICE") services += 1;
        else {
          if (hasRetail(o)) retail += 1;
          if (hasWholesale(o)) wholesale += 1;
        }
      });
    });
    return { retail, wholesale, services };
  }, [ads]);

  const platformCounts = useMemo(() => {
    const m = new Map<string, number>();
    ads.forEach((a) => a.platforms.forEach((p) => m.set(p, (m.get(p) || 0) + 1)));
    return Array.from(m.entries()).map(([label, value]) => ({ label, value }));
  }, [ads]);

  const totalRevenue7d = useMemo(() => ads.reduce((s, a) => s + a.revenue7d, 0), [ads]);
  const totalOrders7d = useMemo(() => ads.reduce((s, a) => s + a.orders7d, 0), [ads]);
  const totalClicks7d = useMemo(() => ads.reduce((s, a) => s + a.clicks7d, 0), [ads]);
  // const totalImpr7d = useMemo(() => ads.reduce((s, a) => s + a.impressions7d, 0), [ads]);

  const avgCvr = useMemo(() => (totalClicks7d ? totalOrders7d / totalClicks7d : 0), [totalClicks7d, totalOrders7d]);

  const performanceEntities: PerformanceEntity[] = useMemo(() => {
    return ads.map((ad) => ({
      id: ad.id,
      kind: "ad",
      name: ad.campaignName,
      status: ad.status,
      platforms: ad.platforms as PerfPlatform[],
      items: ad.offers.map((o) => ({
        id: o.id,
        kind: o.type === "SERVICE" ? "service" : "product",
        name: o.name,
        price: o.price,
        imageUrl: o.posterUrl,
        videoUrl: o.videoUrl,
      })),
      impressions: ad.impressions7d,
      clicks: ad.clicks7d,
      orders: ad.orders7d,
      earnings: ad.revenue7d,
      creator: ad.creator,
      compensation: ad.compensation as Compensation,
      hasBrokenLink: ad.hasBrokenLink,
    }));
  }, [ads]);

  const navigate = useNavigate();

  function nav(url: string) {
    navigate(url);
  }

  function openAdBuilder(adId?: string) {
    // const url = adId ? `/ad-builder?adId=${encodeURIComponent(adId)}&context=dashboard` : "/ad-builder?context=dashboard";
    // nav(url);
    setDrawerData(adId);
    setDrawer("builder");
  }

  function openPerformance(adId: string) {
    // nav(`/adz-performance?adId=${encodeURIComponent(adId)}`);
    setDrawerData(adId);
    setDrawer("performance");
  }

  function openMarketplace(adId?: string) {
    nav(adId ? `/AdzMarketplace?adId=${encodeURIComponent(adId)}` : "/AdzMarketplace");
  }

  function openManager() {
    nav("/AdzManager");
  }

  function openAssets() {
    nav("/asset-library");
  }

  const persistDealPatch = React.useCallback(
    async (
      adId: string,
      mutateShoppable: (current: Record<string, unknown>) => Record<string, unknown>
    ) => {
      const nextDeals = asArray(workspaceState?.deals).map((entry) => {
        const rec = asRecord(entry);
        if (!rec || asString(rec.id, "") !== adId) {
          return entry;
        }
        const shoppable = asRecord(rec.shoppable) || {};
        return {
          ...rec,
          shoppable: mutateShoppable(shoppable),
        };
      });
      const saved = await creatorApi.updateDealzMarketplace({
        deals: nextDeals,
        selectedId: adId,
      });
      setWorkspaceState(saved);
      return saved;
    },
    [setWorkspaceState, workspaceState?.deals],
  );

  function copyShareLink(ad: Ad) {
    if (!ad.generated) {
      showNotification("Generate the ad first to enable share links.", "warning");
      return;
    }
    const link = `https://mldz.link/${encodeURIComponent(ad.id)}`;
    try {
      navigator.clipboard?.writeText(link);
    } catch (err) {
      // ignore
    }
    showSuccess("Share link copied.");
  }

  function generateAd(adId: string) {
    void run(
      async () => {
        await persistDealPatch(adId, (shoppable) => {
          const currentStatus = asString(shoppable.status, "");
          return {
            ...shoppable,
            status: currentStatus.toLowerCase() === "draft" ? "Scheduled" : currentStatus || "Scheduled",
            generated: true,
          };
        });
      },
      { successMessage: "Ad generated. Share buttons enabled.", errorMessage: "Failed to sync ad status." }
    );
  }

  const topCampaigns = useMemo(() => {
    return [...ads]
      .sort((a, b) => b.orders7d - a.orders7d)
      .slice(0, 5)
      .map((a) => ({
        label: a.campaignName,
        value: a.orders7d,
        hint: `${a.platforms.join(", ")} · Supplier ${a.supplier.name}`,
      }));
  }, [ads]);

  const statuses = useMemo(() => {
    const m = new Map<string, number>();
    ads.forEach((a) => m.set(a.status, (m.get(a.status) || 0) + 1));
    return Array.from(m.entries()).map(([label, value]) => ({ label, value }));
  }, [ads]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Adz Dashboard"
        rightContent={
          <div className="flex items-center gap-2">
            <Btn tone="neutral" left={<BarChart3 className="h-4 w-4" />} onClick={() => selected && openPerformance(selected.id)}>
              Adz Performance
            </Btn>
            <Btn tone="primary" left={<Plus className="h-4 w-4" />} onClick={() => openAdBuilder()}>
              New Ad
            </Btn>
          </div>
        }
      />

      {/* Search + filters */}
      <div className="border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 px-3 py-2 transition-colors">
            <Search className="h-4 w-4 text-neutral-500 dark:text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by campaign, supplier or host…"
              className="w-full bg-transparent outline-none text-[12px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold flex items-center gap-2 transition-colors">
              <Filter className="h-4 w-4 text-neutral-700 dark:text-slate-300" />
              <span className="text-neutral-700 dark:text-slate-300">Status</span>
              <select className="bg-transparent outline-none text-neutral-900 dark:text-neutral-100 dark:bg-slate-900" value={status} onChange={(e) => setStatus(e.target.value as AdStatus | "All")}>
                {["All", "Draft", "Scheduled", "Generated", "Live", "Paused", "Pending approval", "Rejected", "Ended"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={cx(
                "rounded-2xl border px-3 py-2 text-[12px] font-extrabold transition",
                onlyWholesaleReady
                  ? "border-transparent text-white dark:text-white"
                  : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-700",
              )}
              style={onlyWholesaleReady ? { background: ORANGE } : undefined}
              onClick={() => setOnlyWholesaleReady((v) => !v)}
              title="Show only ads that include at least one wholesale-capable product offer"
            >
              <BadgeCheck className="h-4 w-4 inline-block mr-2" />
              Wholesale-ready
            </button>

            <Btn tone="neutral" left={<Calendar className="h-4 w-4" />} onClick={() => setDrawer("calendar")}>
              Calendar
            </Btn>
            <Btn tone="neutral" left={<Globe className="h-4 w-4" />} onClick={() => setDrawer("quickLinks")}>
              Quick Links
            </Btn>
          </div>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Revenue (7d)", value: money("UGX", totalRevenue7d, isMobile), icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Orders (7d)", value: totalOrders7d.toLocaleString(), icon: <ShoppingCart className="h-4 w-4" /> },
            { label: "Clicks (7d)", value: totalClicks7d.toLocaleString(), icon: <Link2 className="h-4 w-4" /> },
            { label: "Avg CVR", value: pct(avgCvr), icon: <Zap className="h-4 w-4" /> },
          ].map((k) => (
            <div key={k.label} className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-neutral-500 dark:text-slate-400 font-bold">{k.label}</div>
                <span className="inline-grid h-9 w-9 place-items-center rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 transition-colors">{k.icon}</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-slate-100">{k.value}</div>
              <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Premium snapshot</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="lg:col-span-7 space-y-4">
          <LineChart
            title="Traffic trend"
            subtitle="Impressions vs Orders (last 14 days)"
            seriesA={seriesImpr}
            seriesB={seriesOrders}
            aLabel="Impressions"
            bLabel="Orders"
          />

          <BarList title="Top campaigns by orders" subtitle="Best performers (last 7 days)" rows={topCampaigns} />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <DonutChart
            title="Offer mix"
            subtitle="Retail vs Wholesale vs Services"
            segments={[
              { label: "Retail offers", value: retailWholesaleSplit.retail, tone: "brand" },
              { label: "Wholesale-enabled offers", value: retailWholesaleSplit.wholesale, tone: "pro" },
              { label: "Services", value: retailWholesaleSplit.services, tone: "neutral" },
            ]}
          />

          <DonutChart
            title="Ads by platform"
            subtitle="How your campaigns are distributed"
            segments={platformCounts.map((p, idx) => ({
              label: p.label,
              value: p.value,
              tone: idx === 0 ? "brand" : idx === 1 ? "pro" : "neutral",
            }))}
          />

          <BarList
            title="Statuses"
            subtitle="Pipeline health"
            rows={statuses.map((s) => ({ label: s.label, value: s.value }))}
          />
        </div>

        {/* Ads list */}
        <div className="lg:col-span-12 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
          <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition-colors">
            <div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Your Adz</div>
              <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                Select an ad for quick actions. Edit is done in Ad Builder (independent page). Deep analytics in Adz Performance.
              </div>
            </div>
            <Pill tone="neutral">{filtered.length} results</Pill>
          </div>

          <div className="p-3 overflow-auto">
            <div className="min-w-[1200px]">
              <div className="grid grid-cols-[3fr_2fr_1.5fr_2fr_0.8fr_3.2fr] gap-4 px-3 py-2 text-[11px] font-extrabold text-neutral-500 dark:text-slate-400">
                <div>Campaign</div>
                <div>Supplier</div>
                <div>Host</div>
                <div>Status</div>
                <div>Offers</div>
                <div className="text-right pr-2">Actions</div>
              </div>

              <div className="space-y-2">
                {filtered.map((a) => {
                  const active = a.id === selectedId;

                  const productCount = a.offers.filter((o) => o.type === "PRODUCT").length;
                  const serviceCount = a.offers.filter((o) => o.type === "SERVICE").length;
                  const wholesaleCount = a.offers.filter((o) => hasWholesale(o)).length;

                  const canEdit = !a.lock?.locked;
                  const canShare = a.generated;

                  return (
                    <div
                      key={a.id}
                      className={cx(
                        "grid grid-cols-[3fr_2fr_1.5fr_2fr_0.8fr_3.2fr] gap-4 rounded-3xl border p-3 transition items-center relative",
                        active
                          ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-900/10"
                          : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors",
                      )}
                      onClick={() => setSelectedId(a.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <img src={a.supplier.logoUrl} alt={a.supplier.name} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/20" />
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
                              {a.campaignName}
                            </div>
                            <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400">
                              {a.campaignSubtitle}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-neutral-800 dark:text-slate-300">
                              <Pill tone="neutral" title="Compensation">
                                {compensationLabel(a.compensation)}
                              </Pill>
                              {wholesaleCount ? (
                                <Pill tone="pro" title="At least one product is wholesale-enabled">
                                  Wholesale
                                </Pill>
                              ) : (
                                <Pill tone="neutral">Retail</Pill>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
                          {a.supplier.name}
                        </div>
                        <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400">
                          {a.supplier.category}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <img src={a.creator.avatarUrl} alt={a.creator.name} className="h-8 w-8 rounded-2xl object-cover ring-1 ring-neutral-200" />
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
                              {a.creator.handle}
                            </div>
                            <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400">
                              {a.creator.verified ? "Verified host" : "Host"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Pill
                            tone={
                              a.status === "Live"
                                ? "good"
                                : a.status === "Scheduled" || a.status === "Pending approval"
                                  ? "warn"
                                  : a.status === "Rejected"
                                    ? "bad"
                                    : "neutral"
                            }
                          >
                            {a.status === "Live" ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Live
                              </>
                            ) : a.status === "Scheduled" ? (
                              <>
                                <CalendarClock className="h-3.5 w-3.5" /> Scheduled
                              </>
                            ) : a.status === "Generated" ? (
                              <>
                                <BadgeCheck className="h-3.5 w-3.5" /> Generated
                              </>
                            ) : a.status === "Pending approval" ? (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5" /> Pending
                              </>
                            ) : a.status === "Rejected" ? (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5" /> Rejected
                              </>
                            ) : (
                              <>
                                <Timer className="h-3.5 w-3.5" /> {a.status}
                              </>
                            )}
                          </Pill>

                          {a.hasBrokenLink ? (
                            <Pill tone="warn" title="Tracking link issue detected">
                              <Link2 className="h-3.5 w-3.5" /> Link issue
                            </Pill>
                          ) : null}
                          {a.lowStock ? (
                            <Pill tone="warn" title="Low stock on at least one product">
                              <AlertTriangle className="h-3.5 w-3.5" /> Low stock
                            </Pill>
                          ) : null}
                          {a.lock?.locked ? (
                            <Pill tone="warn" title={a.lock.reason}>
                              <AlertTriangle className="h-3.5 w-3.5" /> {a.lock.label}
                            </Pill>
                          ) : null}
                        </div>

                        <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                          {fmtLocal(new Date(a.startISO))} → {fmtLocal(new Date(a.endISO))} · {a.timezone}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
                          {a.offers.length}
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                          {productCount ? `${productCount} prod` : ""}
                          {productCount && serviceCount ? " · " : ""}
                          {serviceCount ? `${serviceCount} svc` : ""}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Btn
                          tone="neutral"
                          left={<ExternalLink className="h-4 w-4" />}
                          onClick={(e) => {
                            e.stopPropagation(); // prevent row selection toggle if desired, though harmless here
                            openPerformance(a.id);
                          }}
                        >
                          Performance
                        </Btn>

                        <Btn
                          tone="neutral"
                          left={<Wand2 className="h-4 w-4" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEdit) openAdBuilder(a.id);
                            else showNotification(a.lock?.reason || "Editing locked", "warning");
                          }}
                          disabled={!canEdit}
                          title={!canEdit ? a.lock?.reason : "Edit in Ad Builder"}
                        >
                          Edit
                        </Btn>

                        {canShare ? (
                          <button
                            type="button"
                            className="rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[12px] font-extrabold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-slate-700 transition inline-flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyShareLink(a);
                            }}
                            title="Copy share link"
                          >
                            <Copy className="h-4 w-4" />
                            Copy link
                          </button>
                        ) : null}

                        {!a.generated ? (
                          <Btn
                            tone="primary"
                            left={<Sparkles className="h-4 w-4" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              generateAd(a.id);
                            }}
                            isPending={isPending && selectedId === a.id}
                            disabled={!!a.lock?.locked}
                            title={a.lock?.locked ? a.lock.reason : "Generate the ad to enable share"}
                            className="min-w-[110px]"
                          >
                            Generate
                          </Btn>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar drawer */}
      <Drawer open={drawer === "calendar"} title="Ad Calendar (Premium summary)" onClose={() => setDrawer(null)}>
        <div className="space-y-4">
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Upcoming schedule</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              This is a summary view. Detailed scheduling (duration/timezone) is configured in Ad Builder.
            </div>

            <div className="mt-3 space-y-2">
              {ads
                .slice()
                .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
                .slice(0, 8)
                .map((a) => (
                  <div key={a.id} className="rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{a.campaignName}</div>
                        <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                          {fmtLocal(new Date(a.startISO))} → {fmtLocal(new Date(a.endISO))} · {a.timezone}
                        </div>
                      </div>
                      <Pill tone={(a.status === "Generated" ? "good" : a.status === "Scheduled" ? "warn" : "neutral") as "neutral" | "brand" | "good" | "warn" | "bad" | "pro"}>
                        {a.status}
                      </Pill>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn tone="neutral" left={<Wand2 className="h-4 w-4" />} onClick={() => openAdBuilder(a.id)} disabled={!!a.lock?.locked} title={a.lock?.reason}>
                        Open in Builder
                      </Btn>
                      <Btn tone="neutral" left={<BarChart3 className="h-4 w-4" />} onClick={() => openPerformance(a.id)}>
                        Performance
                      </Btn>
                      <Btn tone="neutral" left={<LayoutGrid className="h-4 w-4" />} onClick={() => openMarketplace(a.id)}>
                        Preview
                      </Btn>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Premium note</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Week view + drag-to-reschedule + load meter can be added as a next premium upgrade (calendar advanced UX).
            </div>
          </div>
        </div>
      </Drawer>

      {/* Quick links drawer */}
      <Drawer open={drawer === "quickLinks"} title="Quick links" onClose={() => setDrawer(null)}>
        <div className="space-y-3">
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Host workflow</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Btn tone="primary" left={<Plus className="h-4 w-4" />} onClick={() => openAdBuilder()}>
                New Ad in Builder
              </Btn>
              <Btn tone="neutral" left={<LayoutGrid className="h-4 w-4" />} onClick={() => openMarketplace()}>
                Open Adz Marketplace
              </Btn>
              <Btn tone="neutral" left={<BarChart3 className="h-4 w-4" />} onClick={() => selected && openPerformance(selected.id)}>
                Open Adz Performance
              </Btn>
              <Btn tone="neutral" left={<User className="h-4 w-4" />} onClick={() => openManager()}>
                Open Adz Manager
              </Btn>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Content</div>
            <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
              Content comes from Host + Supplier + Product Catalog, and is curated into the Host Asset Library.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn tone="primary" left={<ExternalLink className="h-4 w-4" />} onClick={() => openAssets()}>
                Open Asset Library
              </Btn>
              <Pill tone="neutral" title="The canonical hero size for uploads">
                Hero: {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height}
              </Pill>
              <Pill tone="neutral" title="Offer poster size">
                Posters: {ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}
              </Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Retail & Wholesale guidance</div>
            <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
              Wholesale is enabled per Product offer and uses MOQ + tier pricing. Services remain unchanged and should not show wholesale controls.
            </div>
          </div>
        </div>
      </Drawer>

      {/* Performance Drawer */}
      <AdzPerformanceDrawer
        open={drawer === "performance"}
        onClose={() => setDrawer(null)}
        entities={performanceEntities}
        defaultEntityId={drawerData}
        canView={true}
        entityLabelSingular="Ad"
        entityLabelPlural="Adz"
      />

      {/* Ad Builder Drawer */}
      {drawer === "builder" ? (
        <AdBuilder
          isDrawer={true}
          onClose={() => setDrawer(null)}
          pickerContext={
            drawerAd
              ? {
                  dealId: drawerAd.id,
                  creatorName: drawerAd.creator.name,
                  creatorHandle: drawerAd.creator.handle,
                  creatorAvatarUrl: drawerAd.creator.avatarUrl,
                  creatorVerified: drawerAd.creator.verified,
                  supplierId: `deal-supplier:${drawerAd.id}`,
                  supplierName: drawerAd.supplier.name,
                  supplierKind: drawerAd.supplier.category,
                  supplierBrand: drawerAd.supplier.name,
                  campaignId: `deal-campaign:${drawerAd.id}`,
                  campaignName: drawerAd.campaignName,
                  campaignBrand: drawerAd.supplier.name,
                  campaignStatus: drawerAd.status === "Scheduled" ? "Paused" : "Active",
                  startISO: drawerAd.startISO,
                  endISO: drawerAd.endISO,
                  offers: drawerAd.offers.map((offer) => ({
                    id: offer.id,
                    type: offer.type,
                    name: offer.name,
                    price: offer.price,
                    basePrice: offer.basePrice,
                    currency: offer.currency,
                    stockLeft: offer.stockLeft,
                    sold: 0,
                    posterUrl: offer.posterUrl,
                    videoUrl: offer.videoUrl,
                    desktopMode: "modal",
                  })),
                }
              : undefined
          }
        />
      ) : null}

    </div >
  );
}
