import React, { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UserRole } from "../../types/roles";
import { useRolePageContent } from "../../data/pageContent";
import type { AlertRuleConfig, AnalyticsAttributionRow, AnalyticsCohortContent, AnalyticsHighlights, AnalyticsKpi } from "../../data/pageTypes";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  LineChart as LineChartIcon,
  Sparkles,
  Target,
  X,
} from "lucide-react";

/**
 * SupplierHub Analytics Page (Premium)
 * Route: /analytics
 * Core: overview charts, filtering by marketplace, export
 * Super premium: cohorts, attribution, alerts and thresholds
 */

type NavigateFn = (to: string) => void;

type Marketplace = string;

type Role = UserRole;

type AlertMetric = string;

type Range = "Today" | "7D" | "30D" | "90D";

type Toast = {
  id: string;
  tone?: "default" | "success" | "warning" | "danger";
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
};

type AlertRule = AlertRuleConfig;

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function downloadText(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "orange" | "slate" | "danger" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "slate" && "bg-slate-100 text-slate-700",
        tone === "danger" && "bg-rose-50 text-rose-700"
      )}
    >
      {children}
    </span>
  );
}

function ToastCenter({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cx(
              "rounded-3xl border bg-white dark:bg-slate-900/95 p-4 shadow-[0_24px_80px_rgba(2,16,23,0.18)] backdrop-blur",
              t.tone === "success" && "border-emerald-200",
              t.tone === "warning" && "border-orange-200",
              t.tone === "danger" && "border-rose-200",
              (!t.tone || t.tone === "default") && "border-slate-200/70"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  t.tone === "success" && "bg-emerald-50 text-emerald-700",
                  t.tone === "warning" && "bg-orange-50 text-orange-700",
                  t.tone === "danger" && "bg-rose-50 text-rose-700",
                  (!t.tone || t.tone === "default") && "bg-slate-100 text-slate-700"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div> : null}
                {t.action ? (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                  >
                    {t.action.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: Array<{ key: string; label: string; icon: React.ElementType }>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const Icon = it.icon;
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cx(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
              active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta: string;
  hint?: string;
}) {
  const up = delta.trim().startsWith("+");
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
      <div className="mt-2 flex items-center gap-2">
        <Badge tone={up ? "green" : "orange"}>{delta}</Badge>
        {hint ? <div className="text-xs font-semibold text-slate-500">{hint}</div> : null}
      </div>
    </div>
  );
}

function LineChart({
  series,
  height = 120,
}: {
  series: number[];
  height?: number;
}) {
  const w = 520;
  const h = height;
  const pad = 10;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1e-6, max - min);

  const points = series
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, series.length - 1);
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <polyline fill="none" stroke="currentColor" strokeWidth="3" points={points} className="text-emerald-600" />
      {/* baseline */}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" strokeWidth="1" className="text-slate-200" />
    </svg>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-16 items-end gap-1">
      {values.map((v, idx) => (
        <div
          key={idx}
          className="w-2.5 rounded-t-lg bg-slate-300"
          style={{ height: `${Math.max(8, (v / max) * 64)}px` }}
        />
      ))}
    </div>
  );
}

function CohortGrid({ rows, cols }: { rows: number; cols: number }) {
  // simple retention style grid
  const data = Array.from({ length: rows }).map((_, r) =>
    Array.from({ length: cols }).map((__, c) => {
      const base = Math.max(0, 100 - r * 9 - c * 7);
      const jitter = (r * 13 + c * 7) % 9;
      return Math.max(0, base - jitter);
    })
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
        <div className="col-span-3">Cohort</div>
        <div className="col-span-9">Weeks since first purchase</div>
      </div>
      <div className="divide-y divide-slate-200/70">
        {data.map((row, r) => (
          <div key={r} className="grid grid-cols-12 gap-2 px-4 py-3">
            <div className="col-span-3 text-xs font-extrabold text-slate-700">Week {r + 1}</div>
            <div className="col-span-9">
              <div className="grid grid-cols-9 gap-1">
                {row.map((v, c) => (
                  <div
                    key={c}
                    title={`${v}%`}
                    className="h-6 rounded-lg"
                    style={{
                      background: `rgba(3,205,140,${Math.max(0.06, Math.min(0.65, v / 120))})`,
                      border: "1px solid rgba(148,163,184,0.35)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttributionTable({ rows }: { rows: Array<{ channel: string; share: number; roas: number; note: string }> }) {
  const total = rows.reduce((a, b) => a + b.share, 0) || 1;
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
        <div className="col-span-3">Channel</div>
        <div className="col-span-3">Share</div>
        <div className="col-span-2">ROAS</div>
        <div className="col-span-4">Note</div>
      </div>
      <div className="divide-y divide-slate-200/70">
        {rows.map((r) => (
          <div key={r.channel} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
            <div className="col-span-3 font-extrabold text-slate-800">{r.channel}</div>
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full" style={{ width: `${(r.share / total) * 100}%`, background: TOKENS.green }} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-500">{r.share}%</span>
              </div>
            </div>
            <div className="col-span-2">
              <Badge tone={r.roas >= 2 ? "green" : "orange"}>{r.roas.toFixed(1)}x</Badge>
            </div>
            <div className="col-span-4 text-slate-500">{r.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[85] max-h-[90vh] w-[92vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-[0_30px_120px_rgba(2,16,23,0.22)] backdrop-blur">
              <div className="border-b border-slate-200/70 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function buildSeries(range: Range, role: Role) {
  const len = range === "Today" ? 12 : range === "7D" ? 7 : range === "30D" ? 12 : 12;
  const isProvider = role === "provider";
  const base = isProvider
    ? range === "Today"
      ? 12
      : range === "7D"
        ? 52
        : range === "30D"
          ? 140
          : 210
    : range === "Today"
      ? 18
      : range === "7D"
        ? 80
        : range === "30D"
          ? 220
          : 360;
  return Array.from({ length: len }).map((_, i) => {
    const wave = Math.sin(i / 1.4) * 10;
    const trend = i * (range === "90D" ? 2.3 : 1.3);
    const jitter = ((i * 17) % 9) - 4;
    return Math.max(1, base + wave + trend + jitter);
  });
}

export default function AnalyticsPage({ onNavigate }: { onNavigate?: NavigateFn }) {
  const navigate: NavigateFn =
    onNavigate ??
    ((to: string) => {
      const cleaned = to.startsWith("/") ? to : `/${to}`;
      window.location.hash = cleaned;
    });

  const { role, content } = useRolePageContent("analytics");

  const [tab, setTab] = useState("overview");
  const [marketplace, setMarketplace] = useState<Marketplace>("All");
  const [range, setRange] = useState<Range>("7D");

  const marketplaceOptions = useMemo<Marketplace[]>(() => content.marketplaceOptions, [content]);
  useEffect(() => {
    if (!marketplaceOptions.includes(marketplace)) setMarketplace(marketplaceOptions[0] ?? "All");
  }, [marketplace, marketplaceOptions]);

  const defaultRules = useMemo<AlertRule[]>(() => content.alertRules, [content]);

  const defaultDraft = useMemo<AlertRule>(
    () => ({
      id: "",
      name: "",
      metric: content.metricOptions[0] ?? "Conversion",
      condition: "drops",
      threshold: 10,
      window: "7D",
      enabled: true,
    }),
    [content]
  );

  const metricOptions = useMemo<AlertMetric[]>(() => content.metricOptions, [content]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const series = useMemo(() => buildSeries(range, role), [range, role]);
  const mini = useMemo(() => buildSeries("7D", role).slice(0, 10), [role]);

  const overviewKpis = useMemo<AnalyticsKpi[]>(() => content.overviewKpis, [content]);
  const highlights = useMemo<AnalyticsHighlights>(() => content.highlights, [content]);
  const cohort = useMemo<AnalyticsCohortContent>(() => content.cohort, [content]);

  const [rules, setRules] = useState<AlertRule[]>(() => defaultRules);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<AlertRule>(() => defaultDraft);
  useEffect(() => {
    setRules(defaultRules);
    setDraft(defaultDraft);
  }, [defaultRules, defaultDraft]);

  const exportAnalytics = (format: "json" | "csv") => {
    const payload = {
      role,
      marketplace,
      range,
      tab,
      series,
      exportedAt: new Date().toISOString(),
    };

    if (format === "json") {
      downloadText("analytics_export.json", JSON.stringify(payload, null, 2));
    } else {
      const rows = ["idx,value", ...series.map((v, i) => `${i + 1},${v}`)].join("\n");
      downloadText("analytics_export.csv", rows, "text/csv");
    }

    pushToast({ title: "Export started", message: `Downloaded ${format.toUpperCase()} file.`, tone: "success" });
  };

  const topTabs = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "cohorts", label: "Cohorts", icon: LineChartIcon },
    { key: "attribution", label: "Attribution", icon: Filter },
    { key: "alerts", label: "Alerts", icon: Bell },
  ];

  const attributionRows = useMemo<AnalyticsAttributionRow[]>(() => content.attributionRows, [content]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Analytics</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Overview, cohorts, attribution and alerting</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800">
              <Calendar className="h-4 w-4" />
              {range}
            </span>
            <button
              type="button"
              onClick={() => exportAnalytics("json")}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Download className="h-4 w-4" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => exportAnalytics("csv")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs value={tab} onChange={setTab} items={topTabs} />

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800">
              <Filter className="h-4 w-4" />
              Marketplace
              <ChevronDown className="h-4 w-4 text-slate-400" />
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value as Marketplace)}
                className="bg-transparent text-xs font-extrabold text-slate-800 outline-none"
              >
                {marketplaceOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800">
              <Calendar className="h-4 w-4" />
              Range
              <ChevronDown className="h-4 w-4 text-slate-400" />
              <select value={range} onChange={(e) => setRange(e.target.value as Range)} className="bg-transparent text-xs font-extrabold text-slate-800 outline-none">
                {(["Today", "7D", "30D", "90D"] as Range[]).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                pushToast({ title: "Drill-down", message: "Wire to your detail views per KPI.", tone: "default" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800"
            >
              <Target className="h-4 w-4" />
              Drill-down
            </button>
          </div>
        </div>
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <GlassCard className="p-5 lg:col-span-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Performance trend</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Marketplace: {marketplace} · Range: {range}</div>
              </div>
              <Badge tone="green">Healthy</Badge>
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
              <LineChart series={series} />
              <div className="mt-2 flex items-center justify-between text-[11px] font-extrabold text-slate-500">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {overviewKpis.map((kpi) => (
                <KpiCard
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  delta={kpi.delta}
                  hint={kpi.hint}
                />
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5 lg:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Highlights</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Fast scanning insights</div>
              </div>
              <Badge tone="slate">Auto</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-extrabold text-slate-900">Top driver</div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  {highlights.topDriver}
                </div>
                <div className="mt-3"><MiniBars values={mini} /></div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-700" />
                  <div className="text-sm font-extrabold text-slate-900">Risk</div>
                  <span className="ml-auto"><Badge tone="orange">Watch</Badge></span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  {highlights.risk}
                </div>
                <button
                  type="button"
                  onClick={() => setTab("alerts")}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Bell className="h-4 w-4" />
                  Open alerts
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate("/status-center")}
                className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-slate-700" />
                  Trust and compliance signals
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {tab === "cohorts" ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <GlassCard className="p-5 lg:col-span-12">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Cohorts</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{cohort.subtitle}</div>
              </div>
              <Badge tone="green">Premium</Badge>
            </div>
            <div className="mt-4">
              <CohortGrid rows={8} cols={9} />
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <LineChartIcon className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-extrabold text-slate-900">How to use</div>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                {cohort.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {tab === "attribution" ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <GlassCard className="p-5 lg:col-span-7">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Attribution</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Channel mix and ROAS</div>
              </div>
              <Badge tone="green">Premium</Badge>
            </div>
            <div className="mt-4">
              <AttributionTable rows={attributionRows} />
            </div>
          </GlassCard>

          <GlassCard className="p-5 lg:col-span-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Model notes</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Make your rules explicit</div>
              </div>
              <Badge tone="slate">Config</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-extrabold text-slate-900">Attribution model</div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">Select how to credit conversions. Default is position-based.</div>
                <select className="mt-3 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800">
                  <option>Position-based</option>
                  <option>Last click</option>
                  <option>First click</option>
                  <option>Linear</option>
                </select>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-extrabold text-slate-900">Recommendation</div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  {highlights.recommendation}
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/mldz/feed")}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.orange }}
                >
                  Open MyLiveDealz
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {tab === "alerts" ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <GlassCard className="p-5 lg:col-span-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Alerts and thresholds</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Create rules and trigger notifications</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraft(defaultDraft);
                  setAddOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Bell className="h-4 w-4" />
                New rule
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", r.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                      <Target className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-extrabold text-slate-900">{r.name}</div>
                        <Badge tone={r.enabled ? "green" : "slate"}>{r.enabled ? "Enabled" : "Paused"}</Badge>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {r.metric} {r.condition} {r.threshold}% over {r.window}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRules((s) => s.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)));
                            pushToast({ title: "Rule updated", message: r.name, tone: "success" });
                          }}
                          className={cx(
                            "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                            r.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                          )}
                        >
                          {r.enabled ? "On" : "Off"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(r);
                            setAddOpen(true);
                          }}
                          className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const prev = rules;
                            setRules((s) => s.filter((x) => x.id !== r.id));
                            pushToast({ title: "Rule deleted", tone: "warning", action: { label: "Undo", onClick: () => setRules(prev) } });
                          }}
                          className="ml-auto rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {rules.length === 0 ? (
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                      <Bell className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-lg font-black text-slate-900">No rules yet</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">Create thresholds to power alerts.</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </GlassCard>

          <GlassCard className="p-5 lg:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Delivery</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Where alerts go</div>
              </div>
              <Badge tone="slate">Channels</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-extrabold text-slate-900">In-app notifications</div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">Always enabled, supports deep links and bulk actions.</div>
                <button
                  type="button"
                  onClick={() => navigate("/notifications")}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  Open Notifications
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-700" />
                  <div className="text-sm font-extrabold text-slate-900">Escalation</div>
                  <span className="ml-auto"><Badge tone="orange">Premium</Badge></span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">Escalate high severity alerts to your support workflow and audit.</div>
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Escalation demo", message: "Wire to email, SMS, WhatsApp or Slack.", tone: "default" })}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  Configure
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate("/status-center")}
                className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-slate-700" />
                  Open Status Center
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      <Modal
        open={addOpen}
        title={draft.id ? "Edit rule" : "New rule"}
        subtitle="Alerts and thresholds"
        onClose={() => setAddOpen(false)}
      >
        <div className="grid gap-3">
          <label className="text-xs font-extrabold text-slate-600">Name</label>
          <input
            value={draft.name}
            onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
            placeholder="e.g., Conversion drop"
            className="h-11 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
          />

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-extrabold text-slate-600">Metric</label>
              <select
                value={draft.metric}
                onChange={(e) => setDraft((s) => ({ ...s, metric: e.target.value as AlertRule["metric"] }))}
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
              >
                {metricOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-600">Condition</label>
              <select
                value={draft.condition}
                onChange={(e) => setDraft((s) => ({ ...s, condition: e.target.value as AlertRule["condition"] }))}
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
              >
                <option value="drops">drops</option>
                <option value="rises">rises</option>
                <option value="exceeds">exceeds</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-600">Threshold (%)</label>
              <input
                type="number"
                value={draft.threshold}
                onChange={(e) => setDraft((s) => ({ ...s, threshold: Number(e.target.value || 0) }))}
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-extrabold text-slate-600">Window</label>
              <select
                value={draft.window}
                onChange={(e) => setDraft((s) => ({ ...s, window: e.target.value as Range }))}
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
              >
                {(["Today", "7D", "30D", "90D"] as Range[]).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-600">Enabled</label>
              <select
                value={draft.enabled ? "yes" : "no"}
                onChange={(e) => setDraft((s) => ({ ...s, enabled: e.target.value === "yes" }))}
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const name = draft.name.trim() || `${draft.metric} ${draft.condition}`;
                if (draft.id) {
                  setRules((s) => s.map((x) => (x.id === draft.id ? { ...draft, name } : x)));
                  pushToast({ title: "Rule updated", message: name, tone: "success" });
                } else {
                  const next = { ...draft, id: makeId("rule"), name };
                  setRules((s) => [next, ...s]);
                  pushToast({ title: "Rule created", message: name, tone: "success" });
                }
                setAddOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Target className="h-4 w-4" />
              Save
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              Cancel
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
