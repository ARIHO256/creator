import React, { useMemo, useRef, useState } from "react";
import { useMockState } from "../../mocks";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Filter,
  Info,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  X,
} from "lucide-react";

/**
 * Ops Center Overview (Previewable)
 * Suggested route: /ops
 * Purpose: Ops “home” for Seller + Provider where applicable.
 * Core: queue summaries, risk flags, quick actions, drilldowns
 * Premium: intentional empty states, toasts, drawers, micro-animations
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function IconButton({ label, onClick, children, tone = "light" }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        tone === "dark"
          ? "border-white/20 bg-white dark:bg-slate-900/10 text-white hover:bg-gray-50 dark:hover:bg-slate-800/15"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children, tone = "green" }) {
  const activeCls =
    tone === "orange" ? "border-orange-200 bg-orange-50 text-orange-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? activeCls : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
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
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[820px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

type Toast = {
  id: string;
  title: string;
  message?: string;
  tone?: "default" | "success" | "warning" | "danger";
  action?: { label: string; onClick: () => void };
};

function ToastCenter({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[95] flex w-[92vw] max-w-[420px] flex-col gap-2">
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

function Sparkline({ points }) {
  const w = 160;
  const h = 46;
  const pad = 6;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const ys = points.map((p) => {
    const t = max === min ? 0.5 : (p - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  });
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block text-slate-800">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function KpiCard({ icon: Icon, label, value, delta, tone = "slate", spark }) {
  const deltaNum = Number(delta);
  const deltaTone = !Number.isFinite(deltaNum) ? "slate" : deltaNum > 0 ? "orange" : deltaNum < 0 ? "green" : "slate";
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "danger" && "bg-rose-50 text-rose-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <div className="text-2xl font-black text-slate-900">{value}</div>
            <div className="text-right">
              <div className={cx("text-[11px] font-extrabold", deltaTone === "orange" ? "text-orange-700" : deltaTone === "green" ? "text-emerald-700" : "text-slate-500")}>
                {Number.isFinite(deltaNum) ? `${deltaNum > 0 ? "+" : ""}${deltaNum}%` : "–"}
              </div>
              <div className="text-[10px] font-semibold text-slate-400">vs yesterday</div>
            </div>
          </div>
          <div className="mt-2">
            <Sparkline points={spark} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniRow({ label, value, tone = "slate" }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className={cx("text-xs font-semibold", tone === "green" ? "text-emerald-700" : tone === "orange" ? "text-orange-700" : tone === "danger" ? "text-rose-700" : "text-slate-800")}>{value}</div>
    </div>
  );
}

function seedData() {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();

  return {
    kpis: {
      ordersRisk: { value: 7, delta: 9, spark: [4, 5, 6, 4, 7, 8, 7] },
      pendingRmas: { value: 3, delta: -12, spark: [6, 5, 5, 4, 3, 3, 3] },
      openDisputes: { value: 2, delta: 0, spark: [2, 2, 3, 2, 2, 2, 2] },
      lowStock: { value: 11, delta: 6, spark: [8, 9, 9, 10, 11, 11, 11] },
      exportJobs: { value: 1, delta: -50, spark: [3, 2, 2, 2, 1, 1, 1] },
      complianceDue: { value: 4, delta: 14, spark: [2, 2, 3, 3, 4, 4, 4] },
    },
    dailyCommand: [
      { id: "cmd1", title: "Resolve SLA risks", detail: "3 orders are within 2 hours of SLA breach", priority: "High", cta: "Open orders" },
      { id: "cmd2", title: "Approve pending RMAs", detail: "2 RMAs waiting on decision", priority: "Normal", cta: "Review returns" },
      { id: "cmd3", title: "Restock low stock SKUs", detail: "5 SKUs below threshold in Kampala warehouse", priority: "High", cta: "Open inventory" },
      { id: "cmd4", title: "Compliance tasks due", detail: "2 tasks due within 7 days", priority: "Normal", cta: "Open compliance" },
    ],
    queues: {
      Orders: [
        { id: "ORD-10512", status: "Packed", sla: "1h 40m", risk: "High", warehouse: "Kampala", total: "UGX 1,240,000" },
        { id: "ORD-10508", status: "Confirmed", sla: "4h 10m", risk: "Watch", warehouse: "Wuxi", total: "USD 840" },
        { id: "ORD-10501", status: "Shipped", sla: "OK", risk: "OK", warehouse: "Nairobi", total: "KES 92,000" },
        { id: "ORD-10498", status: "Confirmed", sla: "2h 05m", risk: "High", warehouse: "Kampala", total: "USD 120" },
      ],
      Returns: [
        { id: "RMA-2401", reason: "Damaged", stage: "Awaiting approval", amount: "USD 120", age: "6h" },
        { id: "RMA-2399", reason: "Wrong item", stage: "Awaiting pickup", amount: "UGX 240,000", age: "1d" },
        { id: "RMA-2397", reason: "Not as described", stage: "Inspection", amount: "USD 60", age: "2d" },
      ],
      Disputes: [
        { id: "DSP-901", type: "Chargeback", risk: 86, next: "Upload evidence", due: "Today" },
        { id: "DSP-896", type: "Delivery", risk: 42, next: "Respond to buyer", due: "Tomorrow" },
      ],
      Inventory: [
        { sku: "CHG-7KW-WBX", available: 7, reserved: 4, cover: "3d", action: "Restock" },
        { sku: "EVBATT-60V", available: 2, reserved: 1, cover: "1d", action: "Restock" },
        { sku: "CABLE-T2-5M", available: 18, reserved: 6, cover: "12d", action: "OK" },
        { sku: "HELMET-S", available: 0, reserved: 2, cover: "0d", action: "Pause listings" },
      ],
      Compliance: [
        { task: "Update KYB document expiry", desk: "Compliance Center", due: "7 days", status: "Action needed" },
        { task: "Upload import certificate", desk: "HealthMart Desk", due: "3 days", status: "Action needed" },
        { task: "Renew tax profile", desk: "Tax Hub", due: "14 days", status: "Scheduled" },
        { task: "Webhook signing enabled", desk: "Integrations", due: "Now", status: "Recommended" },
      ],
    },
    alerts: [
      { id: "al1", title: "Low stock risk", message: "5 SKUs below threshold in Kampala", tone: "orange" },
      { id: "al2", title: "SLA breach risk", message: "2 orders are within 2 hours of SLA", tone: "danger" },
      { id: "al3", title: "Compliance task due", message: "HealthMart certificate due in 3 days", tone: "orange" },
    ],
    health: [
      { service: "Warehouse sync", status: "Operational", last: ago(11) },
      { service: "Webhooks", status: "Operational", last: ago(9) },
      { service: "Messaging", status: "Degraded", last: ago(22) },
      { service: "Exports", status: "Operational", last: ago(17) },
    ],
    activity: [
      { at: ago(12), who: "System", what: "Inventory adjustment recorded", ref: "SKU CHG-7KW-WBX" },
      { at: ago(35), who: "Ops", what: "Order moved to Packed", ref: "ORD-10512" },
      { at: ago(68), who: "Support", what: "Dispute evidence requested", ref: "DSP-901" },
      { at: ago(95), who: "Finance", what: "Payout hold released", ref: "HOLD-1190" },
    ],
  };
}

function toneFromHealth(status: string) {
  if (status === "Operational") return "green";
  if (status === "Degraded") return "orange";
  return "danger";
}

export default function OpsCenterOverview() {
  const [data] = useMockState("ops.centerOverview", seedData());

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [range, setRange] = useState("Today");
  const [marketplace, setMarketplace] = useState("All");
  const [warehouse, setWarehouse] = useState("All");
  const [queueTab, setQueueTab] = useState("Orders");
  const [search, setSearch] = useState("");

  const [drawer, setDrawer] = useState<{ open: boolean; title: string; subtitle?: string; body?: unknown }>({ open: false, title: "" });

  const openDrawer = (title: string, subtitle?: string, body?: unknown) =>
    setDrawer({ open: true, title, subtitle, body });

  const closeDrawer = () => setDrawer({ open: false, title: "" });

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data.queues[queueTab] || []) as Array<Record<string, unknown>>;
    if (!q) return list;
    return list.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [data.queues, queueTab, search]);

  const background =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen" style={{ background: background }}>
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Ops Center</div>
                <Badge tone="slate">/ops</Badge>
                <Badge tone="slate">Operations</Badge>
                <Badge tone="orange">Premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Daily command, queue summaries, alerts and drilldowns.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: "Snapshot exported",
                    message: "Export queued (demo).",
                    tone: "success",
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export snapshot
              </button>
              <button
                type="button"
                onClick={() =>
                  openDrawer(
                    "Create export job",
                    "Demo: exports queue",
                    {
                      hint: "Create an export for orders, listings, invoices or RFQs.",
                      defaults: { type: "Orders", format: "CSV", scope: "Last 7 days" },
                    }
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New export
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest ops signals loaded (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Global filters */}
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {["Today", "7d", "30d"].map((r) => (
                <Chip key={r} active={range === r} onClick={() => setRange(r)}>
                  {r}
                </Chip>
              ))}
              <span className="ml-2"><Badge tone="slate">Time range</Badge></span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SelectPill label="Marketplace" value={marketplace} onChange={setMarketplace} options={["All", "EVmart", "ExpressMart", "Wholesale", "MyLiveDealz"]} />
              <SelectPill label="Warehouse" value={warehouse} onChange={setWarehouse} options={["All", "Kampala", "Wuxi", "Nairobi"]} />
              <span className="ml-auto hidden md:inline-flex"><Badge tone="slate">Filters are demo-only</Badge></span>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <KpiCard icon={AlertTriangle} label="Orders at risk" value={data.kpis.ordersRisk.value} delta={data.kpis.ordersRisk.delta} tone="orange" spark={data.kpis.ordersRisk.spark} />
          <KpiCard icon={ClipboardList} label="Pending RMAs" value={data.kpis.pendingRmas.value} delta={data.kpis.pendingRmas.delta} tone="slate" spark={data.kpis.pendingRmas.spark} />
          <KpiCard icon={ShieldCheck} label="Open disputes" value={data.kpis.openDisputes.value} delta={data.kpis.openDisputes.delta} tone="slate" spark={data.kpis.openDisputes.spark} />
          <KpiCard icon={Boxes} label="Low stock SKUs" value={data.kpis.lowStock.value} delta={data.kpis.lowStock.delta} tone="orange" spark={data.kpis.lowStock.spark} />
          <KpiCard icon={FileText} label="Export jobs" value={data.kpis.exportJobs.value} delta={data.kpis.exportJobs.delta} tone="slate" spark={data.kpis.exportJobs.spark} />
          <KpiCard icon={ShieldCheck} label="Compliance tasks" value={data.kpis.complianceDue.value} delta={data.kpis.complianceDue.delta} tone="orange" spark={data.kpis.complianceDue.spark} />
        </div>

        {/* Main layout */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-8 space-y-4">
            {/* Daily Command */}
            <GlassCard className="p-5">
              <div className="flex items-start gap-3">
                <div
                  className="grid h-12 w-12 place-items-center rounded-3xl text-white"
                  style={{ background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)` }}
                >
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">Daily Command</div>
                    <Badge tone="orange">Super premium</Badge>
                    <span className="ml-auto"><Badge tone="slate">Role-aware widgets</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Recommended next actions based on risk, SLA and compliance signals.</div>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {data.dailyCommand.map((c) => (
                  <motion.div
                    key={c.id}
                    whileHover={{ y: -1 }}
                    className={cx(
                      "rounded-3xl border bg-white dark:bg-slate-900/70 p-4",
                      c.priority === "High" ? "border-orange-200" : "border-slate-200/70"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cx("grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900", c.priority === "High" ? "text-orange-700" : "text-slate-700")}>
                        {c.priority === "High" ? <AlertTriangle className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-slate-900">{c.title}</div>
                          <Badge tone={c.priority === "High" ? "orange" : "slate"}>{c.priority}</Badge>
                          <span className="ml-auto"><Badge tone="slate">{range} · {marketplace}</Badge></span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-600">{c.detail}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openDrawer(
                                c.title,
                                "Demo drilldown",
                                { context: c, note: "Wire this to the actual route drilldown." }
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <ChevronRight className="h-4 w-4" />
                            {c.cta}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              pushToast({
                                title: "Pinned action",
                                message: "Saved to your command list (demo).",
                                tone: "default",
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Star className="h-4 w-4" />
                            Pin
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Queue Summary */}
            <GlassCard className="overflow-hidden">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Queue Summary</div>
                    <Badge tone="slate">{queueTab}</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Search in ${queueTab}`}
                        className="h-10 w-[min(520px,82vw)] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(JSON.stringify(filteredQueue.slice(0, 20), null, 2));
                        pushToast({ title: "Copied", message: "Queue JSON copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {["Orders", "Returns", "Disputes", "Inventory", "Compliance"].map((t) => (
                    <Chip
                      key={t}
                      active={queueTab === t}
                      onClick={() => setQueueTab(t)}
                      tone={t === "Disputes" || t === "Compliance" ? "orange" : "green"}
                    >
                      {t}
                    </Chip>
                  ))}
                  <span className="ml-auto"><Badge tone="slate">Top items</Badge></span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[920px]">
                  <QueueTable
                    tab={queueTab}
                    rows={filteredQueue}
                    onOpen={(row) => openDrawer(`${queueTab} detail`, "Demo drawer", row)}
                    onAction={(label, row) =>
                      pushToast({
                        title: label,
                        message: `Action executed on ${row.id || row.sku || row.task}. (demo)`,
                        tone: "success",
                      })
                    }
                  />
                </div>
              </div>

              {filteredQueue.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                    <div className="text-lg font-black text-slate-900">No results</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing the search box.</div>
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Check className="h-4 w-4" />
                      Clear search
                    </button>
                  </div>
                </div>
              ) : null}
            </GlassCard>
          </div>

          {/* Right rail */}
          <div className="lg:col-span-4 space-y-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Alerts and risk flags</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Actionable alerts to protect SLA and revenue.</div>
                </div>
                <Badge tone="orange">Premium</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {data.alerts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => openDrawer(a.title, "Risk flag", a)}
                    className={cx(
                      "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                      a.tone === "danger" ? "border-rose-200" : a.tone === "orange" ? "border-orange-200" : "border-slate-200/70"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cx(
                          "grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900",
                          a.tone === "danger" ? "text-rose-700" : a.tone === "orange" ? "text-orange-700" : "text-slate-700"
                        )}
                      >
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{a.title}</div>
                          <span className="ml-auto"><Badge tone={a.tone === "danger" ? "danger" : a.tone === "orange" ? "orange" : "slate"}>{a.tone}</Badge></span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-600">{a.message}</div>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-800">
                          View
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => pushToast({ title: "Subscribed", message: "Alerts subscriptions updated (demo).", tone: "success" })}
                className="mt-4 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                Manage alert rules
              </button>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">System sync health</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Ops reliability signals for your account.</div>
                </div>
                <Badge tone="slate">Status</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {data.health.map((h) => (
                  <div key={h.service} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                    <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", toneFromHealth(h.status) === "green" ? "bg-emerald-50 text-emerald-700" : toneFromHealth(h.status) === "orange" ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700")}>
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-slate-900">{h.service}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Last check {fmtTime(h.last)}</div>
                    </div>
                    <Badge tone={toneFromHealth(h.status)}>{h.status}</Badge>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Ops note</div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  If Messaging is degraded, notify buyers using Email or in-app notifications.
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Activity stream</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Recent operational events (demo).</div>
                </div>
                <Badge tone="slate">Live</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {data.activity.map((a, idx) => (
                  <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{a.who}</Badge>
                      <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(a.at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{a.what}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{a.ref}</div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => pushToast({ title: "Audit", message: "Open Audit Log Explorer (demo).", tone: "default" })}
                className="mt-4 w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Open audit log
              </button>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        open={drawer.open}
        title={drawer.title}
        subtitle={drawer.subtitle}
        onClose={closeDrawer}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Details</div>
              <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              This drawer is a placeholder for real drilldowns and actions.
            </div>
            <pre className="mt-3 max-h-[420px] overflow-auto rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-800">
{JSON.stringify(drawer.body ?? {}, null, 2)}
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                safeCopy(JSON.stringify(drawer.body ?? {}, null, 2));
                pushToast({ title: "Copied", message: "Drawer JSON copied.", tone: "success" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>

            <button
              type="button"
              onClick={() => {
                pushToast({ title: "Action queued", message: "Workflow started (demo).", tone: "success" });
                closeDrawer();
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Check className="h-4 w-4" />
              Run action
            </button>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-orange-900">Premium idea</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">
                  Add an evidence pack generator for disputes and RMAs and store it in Documents Center.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function SelectPill({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2">
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function QueueTable({ tab, rows, onOpen, onAction }) {
  const columns = useMemo(() => {
    if (tab === "Orders") return ["Order", "Status", "SLA", "Warehouse", "Total", "Actions"];
    if (tab === "Returns") return ["RMA", "Reason", "Stage", "Amount", "Age", "Actions"];
    if (tab === "Disputes") return ["Case", "Type", "Risk", "Next step", "Due", "Actions"];
    if (tab === "Inventory") return ["SKU", "Available", "Reserved", "Cover", "Action", "Actions"];
    return ["Task", "Desk", "Due", "Status", "", "Actions"]; // Compliance
  }, [tab]);

  const renderCells = (r) => {
    if (tab === "Orders") {
      return [
        r.id,
        r.status,
        r.sla,
        r.warehouse,
        r.total,
      ];
    }
    if (tab === "Returns") {
      return [r.id, r.reason, r.stage, r.amount, r.age];
    }
    if (tab === "Disputes") {
      return [r.id, r.type, `${r.risk}`, r.next, r.due];
    }
    if (tab === "Inventory") {
      return [r.sku, `${r.available}`, `${r.reserved}`, r.cover, r.action];
    }
    return [r.task, r.desk, r.due, r.status, ""]; // Compliance
  };

  return (
    <div>
      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
        <div className="col-span-4">{columns[0]}</div>
        <div className="col-span-2">{columns[1]}</div>
        <div className="col-span-2">{columns[2]}</div>
        <div className="col-span-2">{columns[3]}</div>
        <div className="col-span-1 text-right">{columns[4]}</div>
        <div className="col-span-1 text-right">{columns[5]}</div>
      </div>

      <div className="divide-y divide-slate-200/70">
        {rows.map((r, idx) => {
          const cells = renderCells(r);
          const riskTone =
            tab === "Orders" && r.risk === "High"
              ? "danger"
              : tab === "Orders" && r.risk === "Watch"
              ? "orange"
              : tab === "Disputes" && Number(r.risk) >= 80
              ? "danger"
              : tab === "Disputes" && Number(r.risk) >= 50
              ? "orange"
              : tab === "Inventory" && r.action === "Pause listings"
              ? "danger"
              : tab === "Inventory" && r.action === "Restock"
              ? "orange"
              : tab === "Compliance" && String(r.status).toLowerCase().includes("action")
              ? "orange"
              : "slate";

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onOpen(r)}
              className="grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-700 transition hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <div className="col-span-4 min-w-0">
                <div className="truncate text-sm font-black text-slate-900">{cells[0]}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Click to open</div>
              </div>
              <div className="col-span-2 flex items-center">
                <Badge tone={riskTone}>{cells[1]}</Badge>
              </div>
              <div className="col-span-2 flex items-center">
                <div className="text-slate-800">{cells[2]}</div>
              </div>
              <div className="col-span-2 flex items-center">
                <div className="text-slate-800">{cells[3]}</div>
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <div className="text-slate-800">{cells[4]}</div>
              </div>
              <div className="col-span-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("Open", r);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                  aria-label="Open"
                  title="Open"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("Assign", r);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800"
                  aria-label="Assign"
                  title="Assign"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
