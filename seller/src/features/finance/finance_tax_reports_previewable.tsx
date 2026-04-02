import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import { useThemeMode } from "../../theme/themeMode";
import {

  BadgeCheck,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  Globe,
  Info,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

void sellerBackendApi.getWorkflowScreenState("seller-feature:finance/finance_tax_reports_previewable").catch(() => undefined);

/**
 * Tax Reports (Previewable)
 * Route: /finance/tax-reports
 * Core: VAT reports, exports, summaries
 * Super premium: multi-region tax rules readiness
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtMoney(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function Badge({ children, tone = "slate" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className }) {
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

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function SegTab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {label}
    </button>
  );
}

function Drawer({ open, title, subtitle, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[980px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/90 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function ToastCenter({ toasts, dismiss }) {
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
                    <ChevronRight className="h-4 w-4" />
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

function taxDemoReports() {
  const now = Date.now();
  const agoD = (d) => new Date(now - d * 24 * 3600_000).toISOString();

  return [
    {
      id: "TAX-2026-01-UG-VAT",
      period: "Jan 2026",
      region: "Uganda",
      taxType: "VAT",
      currency: "UGX",
      grossSales: 184_000_000,
      taxableSales: 122_000_000,
      vatCollected: 21_960_000,
      exports: 41_000_000,
      status: "Draft",
      createdAt: agoD(12),
      updatedAt: agoD(2),
      readiness: {
        rules: "Ready",
        invoices: "Warning",
        fx: "Ready",
        evidence: "Warning",
      },
    },
    {
      id: "TAX-2025-Q4-KE-VAT",
      period: "Q4 2025",
      region: "Kenya",
      taxType: "VAT",
      currency: "KES",
      grossSales: 9_820_000,
      taxableSales: 7_210_000,
      vatCollected: 1_153_600,
      exports: 1_020_000,
      status: "Filed",
      createdAt: agoD(64),
      updatedAt: agoD(46),
      readiness: {
        rules: "Ready",
        invoices: "Ready",
        fx: "Ready",
        evidence: "Ready",
      },
    },
    {
      id: "TAX-2025-12-CN-EXPORT",
      period: "Dec 2025",
      region: "China",
      taxType: "Export summary",
      currency: "CNY",
      grossSales: 2_840_000,
      taxableSales: 0,
      vatCollected: 0,
      exports: 2_840_000,
      status: "Ready",
      createdAt: agoD(38),
      updatedAt: agoD(7),
      readiness: {
        rules: "Ready",
        invoices: "Ready",
        fx: "Warning",
        evidence: "Ready",
      },
    },
  ];
}

function toneForReadiness(v) {
  if (v === "Ready") return "green";
  if (v === "Warning") return "orange";
  return "danger";
}

function KpiCard({ icon: Icon, label, value, hint, tone = "slate" }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
          {hint ? <div className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, tone }) {
  const pct = max <= 0 ? 0 : clamp(Math.round((value / max) * 100), 0, 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-600">
        <span className="truncate">{label}</span>
        <span className="text-slate-500">{pct}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div className={cx("h-2 rounded-full", tone === "green" ? "bg-emerald-500" : tone === "orange" ? "bg-orange-500" : "bg-rose-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ReadinessPill({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <Badge tone={toneForReadiness(value)}>{value}</Badge>
    </div>
  );
}

export default function FinanceTaxReportsPage() {
  const { resolvedMode } = useThemeMode();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    void sellerBackendApi
      .getFinanceTaxReports()
      .then((payload) => {
        if (!mounted) return;
        setReports(Array.isArray((payload as Record<string, any>)?.reports) ? ((payload as Record<string, any>).reports as any[]) : []);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const [q, setQ] = useState("");
  const [region, setRegion] = useState("All");
  const [status, setStatus] = useState("All");
  const [tab, setTab] = useState("VAT Reports");

  const regions = useMemo(() => ["All", ...Array.from(new Set(reports.map((r) => r.region)))], [reports]);
  const statuses = ["All", "Draft", "Ready", "Filed"];

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return reports
      .filter((r) => (region === "All" ? true : r.region === region))
      .filter((r) => (status === "All" ? true : r.status === status))
      .filter((r) => {
        if (!query) return true;
        const hay = [r.id, r.period, r.region, r.taxType, r.status].join(" ").toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [reports, q, region, status]);

  const totals = useMemo(() => {
    const count = filtered.length;
    const gross = filtered.reduce((s, r) => s + Number(r.grossSales || 0), 0);
    const vat = filtered.reduce((s, r) => s + Number(r.vatCollected || 0), 0);
    const exports = filtered.reduce((s, r) => s + Number(r.exports || 0), 0);
    const warnings = filtered.filter((r) => Object.values(r.readiness || {}).some((v) => v === "Warning")).length;
    return { count, gross, vat, exports, warnings };
  }, [filtered]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeId, setActiveId] = useState(filtered[0]?.id || reports[0]?.id);
  useEffect(() => {
    if (!reports.find((r) => r.id === activeId)) setActiveId(reports[0]?.id);
  }, [reports]);
  const active = useMemo(() => reports.find((r) => r.id === activeId) || null, [reports, activeId]);

  const bg =
    resolvedMode === "dark"
      ? "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.16) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), linear-gradient(180deg, #020617 0%, #0b1220 45%, #020617 100%)"
      : "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Tax Reports</div>
                <Badge tone="slate">/finance/tax-reports</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">VAT reports, export summaries, and multi-region readiness checks.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest tax data loaded (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  safeCopy(JSON.stringify(filtered, null, 2));
                  pushToast({ title: "Copied", message: "Reports JSON copied (demo).", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy JSON
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {["VAT Reports", "Export Summaries", "Tax Readiness"].map((t) => (
            <SegTab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
          <span className="ml-auto"><Badge tone="slate">Multi-region</Badge></span>
        </div>

        {/* KPI */}
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard icon={Receipt} label="Reports" value={String(totals.count)} hint="Filtered" />
          <KpiCard icon={FileText} label="Gross sales" value={fmtMoney(totals.gross, "USD")} hint="Converted (demo)" tone="green" />
          <KpiCard icon={BadgeCheck} label="VAT collected" value={fmtMoney(totals.vat, "USD")} hint="Converted (demo)" />
          <KpiCard icon={Globe} label="Exports" value={fmtMoney(totals.exports, "USD")} hint={`${totals.warnings} with warnings`} tone="orange" />
        </div>

        {/* Filters */}
        <GlassCard className="mt-4 p-4">
          <div className="grid gap-3 md:grid-cols-12 md:items-center">
            <div className="relative md:col-span-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search report id, period, region"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      Region: {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      Status: {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-12 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setRegion("All");
                  setStatus("All");
                  pushToast({ title: "Filters cleared", tone: "default" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
              <Badge tone="slate">{filtered.length} results</Badge>
            </div>
          </div>
        </GlassCard>

        {/* Main */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Reports</div>
                </div>
                <div className="text-xs font-semibold text-slate-500">Open a report to export or validate readiness</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-4">Report</div>
                  <div className="col-span-2">Region</div>
                  <div className="col-span-2">Period</div>
                  <div className="col-span-2">VAT</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((r) => {
                    const warn = Object.values(r.readiness || {}).some((v) => v === "Warning");
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setActiveId(r.id);
                          setDrawerOpen(true);
                        }}
                        className={cx(
                          "grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold transition hover:bg-gray-50 dark:hover:bg-slate-800",
                          warn && "bg-orange-50/30"
                        )}
                      >
                        <div className="col-span-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black text-slate-900">{r.taxType}</div>
                            {warn ? <Badge tone="orange">Warning</Badge> : <Badge tone="green">Ready</Badge>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{r.id}</span>
                            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Updated {fmtTime(r.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center"><Badge tone="slate">{r.region}</Badge></div>
                        <div className="col-span-2 flex items-center"><Badge tone="slate">{r.period}</Badge></div>
                        <div className="col-span-2 flex items-center font-black text-slate-900">{fmtMoney(r.vatCollected, "USD")}</div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <Badge tone={r.status === "Filed" ? "green" : r.status === "Ready" ? "slate" : "orange"}>{r.status}</Badge>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                      </button>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                        <div className="text-lg font-black text-slate-900">No reports found</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters.</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 lg:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Multi-region readiness</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Are you ready to file everywhere?</div>
              </div>
              <Badge tone="orange">Super premium</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Readiness rules</div>
                  <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
                </div>
                <div className="mt-3 space-y-2">
                  {["Tax ID present", "Invoice templates configured", "FX rules consistent", "Export evidence attached"].map((x) => (
                    <div key={x} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <Check className="h-4 w-4 text-emerald-700" />
                      <div className="text-xs font-extrabold text-slate-800">{x}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Premium upgrade</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Add automated tax rules per jurisdiction and filing calendar reminders.</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => pushToast({ title: "Tax rules scan", message: "Scanning jurisdictions (demo).", tone: "success" })}
                className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                Run readiness scan
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={active ? `Report · ${active.id}` : "Report"}
        subtitle={active ? `${active.region} · ${active.period} · ${active.taxType}` : ""}
        onClose={() => setDrawerOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a report.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <Receipt className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-900">{active.taxType}</div>
                    <Badge tone="slate">{active.region}</Badge>
                    <Badge tone="slate">{active.period}</Badge>
                    <Badge tone={active.status === "Filed" ? "green" : active.status === "Ready" ? "slate" : "orange"}>{active.status}</Badge>
                    <span className="ml-auto"><Badge tone="slate">Updated {fmtTime(active.updatedAt)}</Badge></span>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <Metric label="Gross sales" value={fmtMoney(active.grossSales, active.currency)} />
                    <Metric label="Taxable sales" value={fmtMoney(active.taxableSales, active.currency)} />
                    <Metric label="VAT collected" value={fmtMoney(active.vatCollected, active.currency)} strong />
                    <Metric label="Exports" value={fmtMoney(active.exports, active.currency)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              <GlassCard className="p-5 lg:col-span-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Summary</div>
                  </div>
                  <Badge tone="slate">Core</Badge>
                </div>
                <div className="mt-3 space-y-3">
                  <MiniBar label="Taxable vs gross" value={active.taxableSales} max={Math.max(1, active.grossSales)} tone="green" />
                  <MiniBar label="VAT vs taxable" value={active.vatCollected} max={Math.max(1, active.taxableSales)} tone="orange" />
                  <MiniBar label="Exports share" value={active.exports} max={Math.max(1, active.grossSales)} tone="slate" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      safeCopy(JSON.stringify(active, null, 2));
                      pushToast({ title: "Copied", message: "Report JSON copied.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>

                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Export", message: "CSV export started (demo).", tone: "success" })}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Export", message: "PDF export started (demo).", tone: "success" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </button>
                </div>
              </GlassCard>

              <GlassCard className="p-5 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Readiness</div>
                  </div>
                  <Badge tone="orange">Premium</Badge>
                </div>

                <div className="mt-3 grid gap-2">
                  <ReadinessPill label="Rules" value={active.readiness?.rules || "Warning"} />
                  <ReadinessPill label="Invoices" value={active.readiness?.invoices || "Warning"} />
                  <ReadinessPill label="FX" value={active.readiness?.fx || "Warning"} />
                  <ReadinessPill label="Evidence" value={active.readiness?.evidence || "Warning"} />
                </div>

                <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Info className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Multi-region tax rules readiness</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">In production: rules per country/region, thresholds, reverse charge, export evidence validation, and filing calendar.</div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Evidence attachments</div>
                </div>
                <Badge tone="slate">Demo</Badge>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {[
                  { t: "Invoices bundle", d: "Zip of invoices for the period" },
                  { t: "Export docs", d: "Customs declarations / shipping docs" },
                ].map((x) => (
                  <button
                    key={x.t}
                    type="button"
                    onClick={() => pushToast({ title: "Upload", message: `Attach ${x.t} (demo).`, tone: "default" })}
                    className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900">{x.t}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className={cx("mt-1", strong ? "text-lg font-black text-slate-900" : "text-sm font-extrabold text-slate-800")}>{value}</div>
    </div>
  );
}
