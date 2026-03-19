'use client';

import React, { useState, useMemo } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { CircularProgress } from '@mui/material';

import { AlertTriangle, BarChart3, Copy, ExternalLink, Lock, Share2, X } from "lucide-react";

/**
 * Shoppable Adz — Adz Performance (Dedicated page + drawer)
 * --------------------------------------------------------
 * Use this file in two ways:
 * 1) Drawer: <AdzPerformanceDrawer open onClose entities ... />
 * 2) Page/Route: <AdzPerformancePage /> (reads ?entityId=... from URL)
 *
 * NOTE: This file is intentionally self-contained (no design-system dependencies).
 * TailwindCSS is assumed (same as the regenerated Dashboard/Marketplace/Manager files).
 */

export type PerfPlatform = "TikTok" | "Instagram" | "YouTube" | "Facebook" | "Other";

export type Compensation =
  | { type: "Commission"; commissionRate: number; currency?: string }
  | { type: "Flat fee"; flatFee: number; currency: string }
  | { type: "Hybrid"; commissionRate: number; flatFee: number; currency: string };

export type PerformanceVariant = {
  id: string;
  label: string; // "A" | "B" | ...
  impressions: number;
  clicks: number;
  orders: number;
  earnings: number;
};

export type PerformanceItem = {
  id: string;
  kind: "product" | "service";
  name: string;
  price?: number;
  imageUrl?: string;
  videoUrl?: string;
};

export type PerformanceEntity = {
  id: string;
  kind: "ad" | "deal";
  name: string;
  status?: string;
  platforms: PerfPlatform[];
  primaryItem?: string;
  items: PerformanceItem[];
  impressions: number;
  clicks: number;
  orders: number;
  earnings: number;
  creator?: { name: string; handle?: string; avatarUrl?: string };
  compensation?: Compensation;
  hasBrokenLink?: boolean;
  variants?: PerformanceVariant[];
  // Optional time series (for future: charts)
  series?: Array<{ dateISO: string; impressions: number; clicks: number; orders: number; earnings: number }>;
};

const ORANGE = "var(--color-primary)";

const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function pct(n: number) {
  if (!isFinite(n)) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}
function money(n: number) {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function formatCompensation(c?: Compensation) {
  if (!c) return "—";
  if (c.type === "Commission") return `Commission · ${Math.round(c.commissionRate * 100)}%`;
  if (c.type === "Flat fee") return `Flat fee · ${c.currency}${Math.round(c.flatFee)}`;
  return `Hybrid · ${Math.round(c.commissionRate * 100)}% + ${c.currency}${Math.round(c.flatFee)}`;
}


/* ------------------------------ UI primitives ----------------------------- */

function Pill({
  text,
  tone = "neutral",
  icon
}: {
  text: string;
  tone?: "neutral" | "good" | "warn" | "danger";
  icon?: React.ReactNode;
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800"
          : "border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700";
  return (
    <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", toneCls)}>
      {icon}
      {text}
    </span>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "soft",
  title
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "soft" | "primary";
  title?: string;
}) {
  const base = "inline-flex items-center gap-2 px-3 py-2 rounded-2xl border transition-colors text-sm font-semibold transition";
  if (variant === "primary") {
    return (
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onClick}
        className={cx(base, "text-white dark:text-slate-950 font-bold border-transparent shrink-0", disabled ? "opacity-60 cursor-not-allowed" : "hover:opacity-95")}
        style={{ background: ORANGE }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        base,
        "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0",
        disabled ? "opacity-60 cursor-not-allowed text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800" : "shadow-sm"
      )}
    >
      {children}
    </button>
  );
}

function Card({
  title,
  subtitle,
  right,
  children
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = "max-w-[1100px]",
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div className={cx("absolute right-0 top-0 h-full w-full max-w-3xl bg-white dark:bg-slate-950 shadow-2xl flex flex-col transition-colors border-l border-slate-200 dark:border-slate-800", width)}>
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 md:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold flex flex-wrap items-center gap-2 text-slate-900 dark:text-slate-100">
              <BarChart3 className="h-4 w-4" /> {title}
            </div>
            {subtitle ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------- Core view logic ---------------------------- */

export type AdzPerformanceProps = {
  entities: PerformanceEntity[];
  selectedId?: string;
  range?: "7d" | "30d" | "all";
  canView?: boolean;
  entityLabelSingular?: string;
  entityLabelPlural?: string;
  headerHint?: string;
  showOpenFullPage?: boolean;
};

export function AdzPerformance({
  entities,
  selectedId: initialSelectedId = "__all__",
  range: initialRange = "all",
  canView = true,
  entityLabelSingular = "Ad",
  entityLabelPlural = "Adz",
  headerHint,
  showOpenFullPage = false
}: AdzPerformanceProps) {
  const { showSuccess, showNotification } = useNotification();
  const { run, isPending } = useAsyncAction();
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [range, setRange] = useState<"7d" | "30d" | "all">(initialRange);


  const scoped = useMemo(() => {
    if (selectedId === "__all__") return entities;
    return entities.filter((e) => e.id === selectedId);
  }, [entities, selectedId]);

  const totals = useMemo(() => {
    const impressions = scoped.reduce((a, e) => a + (e.impressions || 0), 0);
    const clicks = scoped.reduce((a, e) => a + (e.clicks || 0), 0);
    const orders = scoped.reduce((a, e) => a + (e.orders || 0), 0);
    const earnings = scoped.reduce((a, e) => a + (e.earnings || 0), 0);
    return {
      impressions,
      clicks,
      orders,
      earnings,
      ctr: impressions ? clicks / impressions : 0,
      cvr: clicks ? orders / clicks : 0
    };
  }, [scoped]);

  const byPlatform = useMemo(() => {
    const m = new Map<string, { platform: string; impressions: number; clicks: number; orders: number; earnings: number }>();
    scoped.forEach((e) => {
      const plats = e.platforms?.length ? e.platforms : ["Other"];
      const split = plats.length ? 1 / plats.length : 1;
      plats.forEach((p) => {
        const key = p;
        const prev = m.get(key) || { platform: key, impressions: 0, clicks: 0, orders: 0, earnings: 0 };
        prev.impressions += Math.round((e.impressions || 0) * split);
        prev.clicks += Math.round((e.clicks || 0) * split);
        prev.orders += Math.round((e.orders || 0) * split);
        prev.earnings += (e.earnings || 0) * split;
        m.set(key, prev);
      });
    });
    return Array.from(m.values()).sort((a, b) => b.earnings - a.earnings);
  }, [scoped]);

  const byItem = useMemo(() => {
    const m = new Map<string, { name: string; impressions: number; clicks: number; orders: number; earnings: number }>();
    scoped.forEach((e) => {
      const items = e.items || (e.primaryItem ? [{ id: e.primaryItem, kind: "product" as const, name: e.primaryItem }] : []);
      const split = items.length ? 1 / items.length : 1;
      items.forEach((it) => {
        const key = it.name;
        const prev = m.get(key) || { name: key, impressions: 0, clicks: 0, orders: 0, earnings: 0 };
        prev.impressions += Math.round((e.impressions || 0) * split);
        prev.clicks += Math.round((e.clicks || 0) * split);
        prev.orders += Math.round((e.orders || 0) * split);
        prev.earnings += (e.earnings || 0) * split;
        m.set(key, prev);
      });
    });
    return Array.from(m.values()).sort((a, b) => b.earnings - a.earnings);
  }, [scoped]);

  const byCreative = useMemo(() => {
    // If scoped to a single entity and variants exist, show them.
    if (scoped.length === 1 && scoped[0]?.variants?.length) return scoped[0].variants!;
    // Otherwise show a synthetic A/B split (demo).
    const halfImp = Math.round(totals.impressions * 0.55);
    const halfClk = Math.round(totals.clicks * 0.55);
    const halfOrd = Math.round(totals.orders * 0.55);
    const halfEarn = totals.earnings * 0.55;
    return [
      { id: "vA", label: "A", impressions: halfImp, clicks: halfClk, orders: halfOrd, earnings: halfEarn },
      { id: "vB", label: "B", impressions: totals.impressions - halfImp, clicks: totals.clicks - halfClk, orders: totals.orders - halfOrd, earnings: totals.earnings - halfEarn }
    ];
  }, [scoped, totals]);

  const insights = useMemo(() => {
    const withCTR = entities.map((e) => ({ e, ctr: e.impressions ? e.clicks / e.impressions : 0, cvr: e.clicks ? e.orders / e.clicks : 0 }));
    const topEarnings = withCTR.slice().sort((a, b) => (b.e.earnings || 0) - (a.e.earnings || 0))[0]?.e;
    const topCTR = withCTR.slice().sort((a, b) => b.ctr - a.ctr)[0]?.e;
    const topCVR = withCTR.slice().sort((a, b) => b.cvr - a.cvr)[0]?.e;
    const broken = scoped.filter((e) => e.hasBrokenLink).length;
    return { topEarnings, topCTR, topCVR, broken };
  }, [entities, scoped]);

  const selectedEntity = useMemo(() => (selectedId === "__all__" ? null : entities.find((e) => e.id === selectedId) || null), [entities, selectedId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Pill text={`Range: ${range === "all" ? "All-time" : range}`} />
          <Pill text={`${entityLabelPlural}: ${entities.length}`} />
          {headerHint ? <span className="text-xs text-slate-500 dark:text-slate-400">{headerHint}</span> : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="px-3 py-2 rounded-2xl border transition-colors border-slate-200 bg-white text-sm font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="__all__">All {entityLabelPlural}</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select className="px-3 py-2 rounded-2xl border transition-colors border-slate-200 bg-white text-sm font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" value={range} onChange={(e) => setRange(e.target.value as "7d" | "30d" | "all")}>
            <option value="all">All-time</option>
            <option value="30d">Last 30d</option>
            <option value="7d">Last 7d</option>
          </select>

          <Button
            disabled={!canView || isPending}
            title={!canView ? "Requires analytics.view" : "Export CSV"}
            onClick={() => run(async () => {
              const header = "id,name,kind,platforms,status,impressions,clicks,orders,earnings,primary_item,creator,compensation";
              const rows = scoped
                .map((e) =>
                  [
                    e.id,
                    JSON.stringify(e.name),
                    e.kind,
                    JSON.stringify(e.platforms),
                    JSON.stringify(e.status || ""),
                    e.impressions,
                    e.clicks,
                    e.orders,
                    e.earnings,
                    JSON.stringify(e.primaryItem || ""),
                    JSON.stringify(e.creator?.handle || e.creator?.name || ""),
                    JSON.stringify(formatCompensation(e.compensation))
                  ].join(",")
                )
                .join("\n");

              const csvContent = header + "\n" + rows;
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
              const link = document.createElement("a");
              if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `adz_performance_${range}.csv`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }, { successMessage: "CSV exported successfully!" })}
          >
            {isPending ? <CircularProgress size={16} color="inherit" /> : <Copy className="h-4 w-4" />} Export CSV
          </Button>

          <Button
            disabled={!canView}
            title={!canView ? "Requires analytics.view" : "Share"}
            onClick={async () => {
              const base = window.location.origin + "/AdzPerformance";
              const url = selectedEntity ? `${base}?entityId=${encodeURIComponent(selectedEntity.id)}` : base;
              await navigator.clipboard.writeText(url);
              showSuccess("Link copied to clipboard!");
            }}
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>

          {showOpenFullPage ? (
            <Button
              disabled={!canView}
              title={!canView ? "Requires analytics.view" : "Open full page"}
              onClick={() => {
                const href = selectedEntity ? `/AdzPerformance?entityId=${encodeURIComponent(selectedEntity.id)}` : "/AdzPerformance";
                window.location.assign(href);
              }}
            >
              <ExternalLink className="h-4 w-4" /> Open page
            </Button>
          ) : null}
        </div>
      </div>

      {
        !canView ? (
          <Card title="Locked" subtitle="Enable analytics.view to access Adz Performance." right={<Lock className="h-4 w-4" />}>
            <div className="text-sm text-slate-700 dark:text-slate-200">Analytics is restricted by role.</div>
          </Card>
        ) : (
          <>
            {/* Header context */}
            {selectedEntity ? (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{selectedEntity.name}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-2 gap-y-1">
                      <span className="truncate">{entityLabelSingular} · {selectedEntity.kind}</span>
                      <span>·</span>
                      <span className="truncate">{selectedEntity.platforms.join(", ")}</span>
                      {selectedEntity.status ? (
                        <>
                          <span>·</span>
                          <span className="truncate">{selectedEntity.status}</span>
                        </>
                      ) : null}
                      {selectedEntity.creator?.handle || selectedEntity.creator?.name ? (
                        <>
                          <span>·</span>
                          <span className="truncate">{selectedEntity.creator.handle ? `@${selectedEntity.creator.handle}` : selectedEntity.creator.name}</span>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedEntity.compensation ? <Pill text={formatCompensation(selectedEntity.compensation)} tone="neutral" /> : null}
                      {selectedEntity.hasBrokenLink ? <Pill tone="danger" text="Broken link risk" icon={<AlertTriangle className="h-3 w-3" />} /> : <Pill tone="good" text="Link health OK" />}
                    </div>
                  </div>

                  {selectedEntity.creator?.avatarUrl ? (
                    <img src={selectedEntity.creator.avatarUrl} alt={selectedEntity.creator.name || "Creator"} className="h-11 w-11 rounded-full border border-slate-200 dark:border-slate-600 object-cover" />
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* KPI summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                <div className="text-xs text-slate-500 dark:text-slate-400">Impressions</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{money(totals.impressions)}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                <div className="text-xs text-slate-500 dark:text-slate-400">Clicks</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{money(totals.clicks)}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                <div className="text-xs text-slate-500 dark:text-slate-400">Orders/Bookings</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{money(totals.orders)}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                <div className="text-xs text-slate-500 dark:text-slate-400">Earnings / Revenue</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{money(totals.earnings)}</div>
              </div>
            </div>

            {/* Funnel + breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <Card title="Funnel" subtitle={`Impressions → Clicks → Orders · CTR ${pct(totals.ctr)} · CVR ${pct(totals.cvr)}`}>
                <div className="space-y-2">
                  {[
                    { label: "Impressions", v: totals.impressions, den: totals.impressions },
                    { label: "Clicks", v: totals.clicks, den: totals.impressions },
                    { label: "Orders", v: totals.orders, den: totals.clicks || 1 }
                  ].map((x) => (
                    <div key={x.label} className="rounded-2xl border transition-colors border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{x.label}</div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{money(x.v)}</div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.round(clamp01(x.den ? x.v / x.den : 0) * 100)}%`, background: ORANGE, opacity: 0.85 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="By platform" subtitle="Where is conversion strongest?">
                <div className="space-y-2">
                  {byPlatform.slice(0, 8).map((r) => (
                    <div key={r.platform} className="rounded-2xl border transition-colors border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.platform}</div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{money(r.earnings)}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                        Imp {money(r.impressions)} · Clk {money(r.clicks)} · Ord {money(r.orders)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="By item" subtitle="Bundle-aware split attribution (demo).">
                <div className="space-y-2">
                  {byItem.slice(0, 8).map((r) => (
                    <div key={r.name} className="rounded-2xl border transition-colors border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{r.name}</div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{money(r.earnings)}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                        Imp {money(r.impressions)} · Clk {money(r.clicks)} · Ord {money(r.orders)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <Card title="By creative version" subtitle="A/B attribution (split model demo).">
                <div className="space-y-2">
                  {byCreative.map((v) => (
                    <div key={v.id} className="rounded-2xl border transition-colors border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Variant {v.label}</div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{money(v.earnings)}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                        Imp {money(v.impressions)} · Clk {money(v.clicks)} · Ord {money(v.orders)} · CTR {pct(v.impressions ? v.clicks / v.impressions : 0)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl border transition-colors border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3 text-xs text-slate-700 dark:text-slate-300">
                  Premium: real split is tracked per creative ID (not inferred).
                </div>
              </Card>

              <Card title="Insights & recommendations" subtitle="Actionable fixes to increase trust + conversion.">
                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="rounded-2xl border transition-colors border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3 md:p-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Top earner</div>
                    <div className="text-slate-600 dark:text-slate-400 mt-1">{insights.topEarnings ? `${insights.topEarnings.name} · ${money(insights.topEarnings.earnings)}` : "—"}</div>
                  </div>
                  <div className="rounded-2xl border transition-colors border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3 md:p-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Best CTR</div>
                    <div className="text-slate-600 dark:text-slate-400 mt-1">
                      {(() => {
                        const e = insights.topCTR;
                        const ctr = e && e.impressions ? e.clicks / e.impressions : 0;
                        return e ? `${e.name} · ${pct(ctr)}` : "—";
                      })()}
                    </div>
                  </div>
                  <div className="rounded-2xl border transition-colors border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3 md:p-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Best CVR</div>
                    <div className="text-slate-600 dark:text-slate-400 mt-1">
                      {(() => {
                        const e = insights.topCVR;
                        const cvr = e && e.clicks ? e.orders / e.clicks : 0;
                        return e ? `${e.name} · ${pct(cvr)}` : "—";
                      })()}
                    </div>
                  </div>

                  {insights.broken ? (
                    <div className="rounded-2xl border transition-colors border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 p-3 text-rose-900 dark:text-rose-400">
                      <div className="font-semibold">Fix broken links</div>
                      <div className="mt-1">
                        {insights.broken} {entityLabelSingular.toLowerCase()}(s) flagged. Open <b>Tracking</b> to resolve and restore attribution.
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border transition-colors border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-3 text-emerald-900 dark:text-emerald-400">
                      <div className="font-semibold">Link health is clean</div>
                      <div className="mt-1">Attribution risk is low.</div>
                    </div>
                  )}

                  <div className="rounded-2xl border transition-colors border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3 text-slate-700 dark:text-slate-300">
                    Premium: creative fatigue detection, audience saturation warnings, payout timing reminders, and platform mix optimizer.
                  </div>
                </div>
              </Card>
            </div>
          </>
        )
      }
    </div >
  );
}

export function AdzPerformanceDrawer({
  open,
  onClose,
  entities,
  defaultEntityId,
  canView = true,
  entityLabelSingular,
  entityLabelPlural
}: {
  open: boolean;
  onClose: () => void;
  entities: PerformanceEntity[];
  defaultEntityId?: string;
  canView?: boolean;
  entityLabelSingular?: string;
  entityLabelPlural?: string;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Adz Performance"
      subtitle="Deep analytics: funnel · breakdowns · insights · export/share."
      width="max-w-[1100px]"
    >
      <AdzPerformance
        entities={entities}
        selectedId={defaultEntityId}
        canView={canView}
        entityLabelSingular={entityLabelSingular}
        entityLabelPlural={entityLabelPlural}
      />
    </Drawer>
  );
}

/* ------------------------------ Dedicated page ---------------------------- */

export default function AdzPerformancePage() {
  const { showSuccess, showNotification } = useNotification();
  const [dateRange, setDateRange] = useState('7d');
  // For routing: /AdzPerformance?entityId=...
  const entityId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("entityId") || undefined : undefined;

  // NOTE: In production, replace this demo list with server data.
  const demoEntities: PerformanceEntity[] = useMemo(
    () => [
      {
        id: "AD-10021",
        kind: "ad",
        name: "Flash Dealz: Power Bank",
        status: "Live",
        platforms: ["TikTok"],
        primaryItem: "20,000mAh Power Bank",
        items: [{ id: "p1", kind: "product", name: "20,000mAh Power Bank", price: 29 }],
        impressions: 182400,
        clicks: 9720,
        orders: 412,
        earnings: 1860,
        creator: { name: "Kofi Mensah", handle: "kofi_live", avatarUrl: "https://i.pravatar.cc/100?img=11" },
        compensation: { type: "Commission", commissionRate: 0.12 },
        hasBrokenLink: false,
        variants: [
          { id: "vA", label: "A", impressions: 102000, clicks: 5000, orders: 210, earnings: 980 },
          { id: "vB", label: "B", impressions: 80400, clicks: 4720, orders: 202, earnings: 880 }
        ]
      },
      {
        id: "dl_2",
        kind: "deal",
        name: "Autumn Beauty Flash",
        status: "Live",
        platforms: ["TikTok", "Instagram"],
        primaryItem: "Vitamin C serum (30ml)",
        items: [
          { id: "it_2a", kind: "product", name: "Vitamin C serum (30ml)", price: 24 },
          { id: "it_2b", kind: "product", name: "Hydrating moisturizer", price: 18 }
        ],
        impressions: 290000,
        clicks: 10150,
        orders: 420,
        earnings: 6100,
        creator: { name: "Amina K", handle: "amina_live", avatarUrl: "https://i.pravatar.cc/100?img=47" },
        compensation: { type: "Commission", commissionRate: 0.1 },
        hasBrokenLink: true
      }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-x-hidden transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 md:px-6 py-8">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <img src="/MyliveDealz PNG Icon 1.png" alt="LiveDealz" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">Adz Performance</div>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-14">Dedicated deep analytics page (demo data).</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => window.history.back()}>
              <ExternalLink className="h-4 w-4" /> Back
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <AdzPerformance entities={demoEntities} selectedId={entityId} canView={true} showOpenFullPage={false} />
        </div>
      </div>
    </div>
  );
}
