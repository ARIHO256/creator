import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import { useThemeMode } from "../../theme/themeMode";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  FileText,
  Filter,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Clock,
} from "lucide-react";

/**
 * Finance Home (Overview)
 * Suggested route: /finance
 * Core:
 * - Balances overview, payout schedule, transactions, invoices snapshot
 * Super premium:
 * - Reconciliation state, multi-currency preview, payout holds explanation, export hub, audit entry points
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type BadgeTone = "green" | "orange" | "danger" | "slate";
type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };

type BadgeProps = { children: React.ReactNode; tone?: BadgeTone };
type GlassCardProps = { children: React.ReactNode; className?: string };
type IconButtonProps = { label: string; onClick: () => void; children: React.ReactNode };
type ChipProps = { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "green" | "orange" };
type SelectPillOption = string;
type SelectPillProps = { label: string; value: string; onChange: (next: string) => void; options: SelectPillOption[] };
type DrawerProps = { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode };
type ToastCenterProps = { toasts: Toast[]; dismiss: (id: string) => void };
type SparklineProps = { points?: number[] };
type MiniRowProps = { label: string; value: React.ReactNode; tone?: BadgeTone };
type KpiCardProps = { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; delta?: number; tone?: BadgeTone; spark?: number[]; onClick?: () => void };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function currencyFmt(amount: number | string, currency: string) {
  const v = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "UGX" ? 0 : 2,
    }).format(v);
  } catch {
    return `${currency} ${v.toLocaleString()}`;
  }
}

function Badge({ children, tone = "slate" }: BadgeProps) {
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

function GlassCard({ children, className }: GlassCardProps) {
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

function IconButton({ label, onClick, children }: IconButtonProps) {
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

function Chip({ active, onClick, children, tone = "green" }: ChipProps) {
  const activeCls =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
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

function SelectPill({ label, value, onChange, options }: SelectPillProps) {
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

function Drawer({ open, title, subtitle, onClose, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[820px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function ToastCenter({ toasts, dismiss }: ToastCenterProps) {
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

function Sparkline({ points }: SparklineProps) {
  if (!points || points.length < 2) return null;
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

function MiniRow({ label, value, tone = "slate" }: MiniRowProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div
        className={cx(
          "text-xs font-semibold",
          tone === "green" && "text-emerald-700",
          tone === "orange" && "text-orange-700",
          tone === "danger" && "text-rose-700",
          tone === "slate" && "text-slate-800"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, delta, tone = "slate", spark, onClick }: KpiCardProps) {
  const deltaNum = Number(delta);
  const deltaTone = !Number.isFinite(deltaNum) ? "slate" : deltaNum > 0 ? "orange" : deltaNum < 0 ? "green" : "slate";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
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
            <div className="truncate text-2xl font-black text-slate-900">{value}</div>
            <div className="text-right">
              <div
                className={cx(
                  "text-[11px] font-extrabold",
                  deltaTone === "orange" ? "text-orange-700" : deltaTone === "green" ? "text-emerald-700" : "text-slate-500"
                )}
              >
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
    </button>
  );
}

function financeDemoData() {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();
  const inM = (m) => new Date(now + m * 60_000).toISOString();
  const inD = (d) => new Date(now + d * 24 * 60_000).toISOString();

  const fx = { UGX_to_USD: 1 / 3800, KES_to_USD: 1 / 145, CNY_to_USD: 1 / 7.2 };

  const balances = [
    { currency: "UGX", available: 6240000, pending: 1180000, reserved: 420000, holds: 0 },
    { currency: "USD", available: 1840.25, pending: 320.0, reserved: 120.0, holds: 210.5 },
    { currency: "CNY", available: 9200.0, pending: 1500.0, reserved: 0, holds: 0 },
    { currency: "KES", available: 92000.0, pending: 11000.0, reserved: 6000.0, holds: 0 },
  ];

  const toUsd = (row) => {
    if (row.currency === "USD") return row.available;
    if (row.currency === "UGX") return row.available * fx.UGX_to_USD;
    if (row.currency === "KES") return row.available * fx.KES_to_USD;
    if (row.currency === "CNY") return row.available * fx.CNY_to_USD;
    return 0;
  };

  const availableUsd = balances.reduce((s, r) => s + toUsd(r), 0);
  const pendingUsd = balances.reduce((s, r) => {
    const pending = Number(r.pending || 0);
    if (r.currency === "USD") return s + pending;
    if (r.currency === "UGX") return s + pending * fx.UGX_to_USD;
    if (r.currency === "KES") return s + pending * fx.KES_to_USD;
    if (r.currency === "CNY") return s + pending * fx.CNY_to_USD;
    return s;
  }, 0);
  const holdsUsd = balances.reduce((s, r) => {
    const h = Number(r.holds || 0);
    if (r.currency === "USD") return s + h;
    if (r.currency === "UGX") return s + h * fx.UGX_to_USD;
    if (r.currency === "KES") return s + h * fx.KES_to_USD;
    if (r.currency === "CNY") return s + h * fx.CNY_to_USD;
    return s;
  }, 0);

  const invoices = [
    { id: "INV-12091", buyer: "CorporatePay Org", amount: "USD 840.00", status: "Due", dueAt: inD(3), channel: "SupplierHub" },
    { id: "INV-12088", buyer: "Amina K.", amount: "UGX 240,000", status: "Sent", dueAt: inD(7), channel: "ExpressMart" },
    { id: "INV-12072", buyer: "Kato S.", amount: "USD 120.00", status: "Paid", dueAt: inD(-2), channel: "MyLiveDealz" },
  ];

  const transactions = [
    { id: "TX-88901", at: ago(22), type: "Sale", channel: "SupplierHub", amount: "+USD 840.00", status: "Settled", ref: "ORD-10512" },
    { id: "TX-88900", at: ago(58), type: "Fee", channel: "SupplierHub", amount: "-USD 12.50", status: "Settled", ref: "Commission" },
    { id: "TX-88898", at: ago(130), type: "Refund", channel: "ExpressMart", amount: "-UGX 120,000", status: "Pending", ref: "RMA-2399" },
    { id: "TX-88896", at: ago(210), type: "Payout", channel: "SupplierHub", amount: "-USD 250.00", status: "Processing", ref: "PAY-441" },
    { id: "TX-88892", at: ago(460), type: "Sale", channel: "MyLiveDealz", amount: "+USD 120.00", status: "Settled", ref: "ADZ-501" },
  ];

  const holds = [
    { id: "HOLD-1190", reason: "KYB expiry soon", amount: "USD 210.50", status: "Active", howToFix: "Upload renewed KYB document" },
  ];

  const payout = {
    nextAt: inD(2),
    method: "Bank transfer",
    currency: "USD",
    estimate: "USD 520.00",
    cadence: "Weekly",
    holdsActive: holds.length,
  };

  const reconciliation = {
    state: "Needs review",
    matchedPct: 92,
    unmatched: 3,
    note: "3 transactions need matching. Review refunds and fees.",
  };

  const alerts = [
    { id: "al1", tone: "orange", title: "Payout hold active", message: "KYB renewal required to release USD holds." },
    { id: "al2", tone: "slate", title: "Multi-currency balances", message: "Consider FX conversion before next payout." },
    { id: "al3", tone: "orange", title: "Refund pending", message: "1 refund pending confirmation (ExpressMart)." },
  ];

  return {
    fx,
    balances,
    availableUsd,
    pendingUsd,
    holdsUsd,
    invoices,
    transactions,
    holds,
    payout,
    reconciliation,
    alerts,
    kpis: {
      available: { value: availableUsd, delta: 4, spark: [72, 74, 73, 76, 79, 81, 84] },
      pending: { value: pendingUsd, delta: -2, spark: [18, 17, 16, 16, 15, 15, 14] },
      holds: { value: holdsUsd, delta: 9, spark: [2, 2, 3, 4, 5, 5, 6] },
      invoicesDue: { value: 2, delta: 0, spark: [1, 2, 2, 2, 2, 2, 2] },
    },
  };
}

const emptyFinanceData = {
  fx: {},
  balances: [],
  availableUsd: 0,
  pendingUsd: 0,
  holdsUsd: 0,
  invoices: [],
  transactions: [],
  holds: [],
  payout: { nextAt: new Date().toISOString(), method: "", currency: "USD", estimate: "", cadence: "", holdsActive: 0 },
  reconciliation: { state: "Needs review", matchedPct: 0, unmatched: 0, note: "" },
  alerts: [],
  kpis: {
    available: { value: 0, delta: 0, spark: [0, 0, 0, 0, 0, 0, 0] },
    pending: { value: 0, delta: 0, spark: [0, 0, 0, 0, 0, 0, 0] },
    holds: { value: 0, delta: 0, spark: [0, 0, 0, 0, 0, 0, 0] },
    invoicesDue: { value: 0, delta: 0, spark: [0, 0, 0, 0, 0, 0, 0] },
  },
};

function progressLabel(pct: number): { label: string; tone: BadgeTone } {
  const v = clamp(Number(pct || 0), 0, 100);
  if (v >= 95) return { label: "Excellent", tone: "green" };
  if (v >= 80) return { label: "Good", tone: "orange" };
  return { label: "Needs review", tone: "danger" };
}

function Bar({ value, tone = "green" }: { value: number; tone?: "green" | "orange" | "danger" }) {
  const v = clamp(Number(value || 0), 0, 100);
  return (
    <div className="mt-2 h-2 rounded-full bg-slate-100">
      <div
        className={cx(
          "h-2 rounded-full",
          tone === "green" ? "bg-emerald-500" : tone === "orange" ? "bg-orange-500" : "bg-rose-500"
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function exportCsv(rows: Array<Record<string, unknown>>) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/\"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  rows.forEach((r) => lines.push(headers.map((h) => escape(r[h])).join(",")));
  return lines.join("\n");
}

export default function FinanceHomeOverview() {
  const { resolvedMode } = useThemeMode();
  const [data, setData] = useState<Record<string, any>>(emptyFinanceData);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  useEffect(() => {
    let mounted = true;
    void sellerBackendApi
      .getFinanceHome()
      .then((payload) => {
        if (!mounted) return;
        setData({ ...emptyFinanceData, ...(payload as Record<string, any>) });
      })
      .catch(() => {
        if (!mounted) return;
        pushToast({ title: "Finance unavailable", message: "Could not load finance overview.", tone: "danger" });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const [range, setRange] = useState("7d");
  const [channel, setChannel] = useState("All");
  const [currency, setCurrency] = useState("All");

  const [txQuery, setTxQuery] = useState("");
  const [txType, setTxType] = useState("All");

  const transactions = useMemo(() => {
    const q = txQuery.trim().toLowerCase();
    return data.transactions
      .filter((t) => (channel === "All" ? true : t.channel === channel))
      .filter((t) => (txType === "All" ? true : t.type === txType))
      .filter((t) => {
        if (!q) return true;
        const hay = [t.id, t.type, t.channel, t.amount, t.status, t.ref].join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [data.transactions, txQuery, txType, channel]);

  const invoices = useMemo(() => {
    return data.invoices.filter((i) => (channel === "All" ? true : i.channel === channel));
  }, [data.invoices, channel]);

  const balances = useMemo(() => {
    return data.balances.filter((b) => (currency === "All" ? true : b.currency === currency));
  }, [data.balances, currency]);

  const [drawer, setDrawer] = useState({ open: false, title: "", subtitle: "", body: null });
  const openDrawer = (title, subtitle, body) => setDrawer({ open: true, title, subtitle, body });
  const closeDrawer = () => setDrawer({ open: false, title: "", subtitle: "", body: null });

  const [exportOpen, setExportOpen] = useState(false);

  const rec = data.reconciliation;
  const recLabel = progressLabel(rec.matchedPct);

  const background =
    resolvedMode === "dark"
      ? "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.16) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), linear-gradient(180deg, #020617 0%, #0b1220 45%, #020617 100%)"
      : "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen" style={{ background }}>
      <div className="shell-container-wide px-3 py-6 md:px-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Finance</div>
                <Badge tone="slate">/finance</Badge>
                <Badge tone="slate">Enterprise</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Wallets, payouts, invoices, statements and holds in one place.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: "Request payout",
                    message: "Payout request queued (demo).",
                    tone: "success",
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Wallet className="h-4 w-4" />
                Request payout
              </button>

              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest balances loaded (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {["Today", "7d", "30d"].map((r) => (
                <Chip key={r} active={range === r} onClick={() => setRange(r)}>
                  {r}
                </Chip>
              ))}
              <span className="ml-2"><Badge tone="slate">Range</Badge></span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SelectPill label="Channel" value={channel} onChange={setChannel} options={["All", "SupplierHub", "ExpressMart", "MyLiveDealz"]} />
              <SelectPill label="Currency" value={currency} onChange={setCurrency} options={["All", "UGX", "USD", "CNY", "KES"]} />
              <span className="ml-auto hidden md:inline-flex"><Badge tone="slate">Demo filters</Badge></span>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Wallet}
            label="Available (≈ USD)"
            value={currencyFmt(data.kpis.available.value, "USD")}
            delta={data.kpis.available.delta}
            tone="green"
            spark={data.kpis.available.spark}
            onClick={() => openDrawer("Available balance", "Wallets overview", { balances: data.balances, note: "Wire to /finance/wallets" })}
          />
          <KpiCard
            icon={Clock}
            label="Pending (≈ USD)"
            value={currencyFmt(data.kpis.pending.value, "USD")}
            delta={data.kpis.pending.delta}
            tone="slate"
            spark={data.kpis.pending.spark}
            onClick={() => openDrawer("Pending funds", "Settlement and pending states", { balances: data.balances })}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Payout holds (≈ USD)"
            value={currencyFmt(data.kpis.holds.value, "USD")}
            delta={data.kpis.holds.delta}
            tone="orange"
            spark={data.kpis.holds.spark}
            onClick={() => openDrawer("Payout holds", "What is blocked and why", { holds: data.holds, route: "/finance/holds" })}
          />
          <KpiCard
            icon={Receipt}
            label="Invoices due"
            value={String(data.kpis.invoicesDue.value)}
            delta={data.kpis.invoicesDue.delta}
            tone="slate"
            spark={data.kpis.invoicesDue.spark}
            onClick={() => openDrawer("Invoices", "Due and sent invoices", { invoices: data.invoices, route: "/finance/invoices" })}
          />
        </div>

        {/* Main */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-8 space-y-4">
            {/* Payout schedule + Reconciliation */}
            <div className="grid gap-4 lg:grid-cols-12">
              <GlassCard className="p-5 lg:col-span-7">
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-3xl text-white"
                    style={{ background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)` }}
                  >
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-slate-900">Next payout</div>
                      <Badge tone="slate">{data.payout.cadence}</Badge>
                      {data.payout.holdsActive ? <Badge tone="orange">Holds {data.payout.holdsActive}</Badge> : <Badge tone="green">No holds</Badge>}
                      <span className="ml-auto"><Badge tone="slate">{data.payout.method}</Badge></span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Estimated, subject to holds, disputes, and reconciliation.</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                  <MiniRow label="ETA" value={fmtDate(data.payout.nextAt)} tone="slate" />
                  <MiniRow label="Estimate" value={data.payout.estimate} tone="green" />
                  <MiniRow label="Currency" value={data.payout.currency} tone="slate" />
                  <MiniRow label="Holds active" value={String(data.payout.holdsActive)} tone={data.payout.holdsActive ? "orange" : "green"} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Payout requested", message: "Your payout request was queued (demo).", tone: "success" })}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Plus className="h-4 w-4" />
                    Request payout
                  </button>
                  <button
                    type="button"
                    onClick={() => openDrawer("Payout holds", "Fix and release blocked funds", { holds: data.holds, route: "/finance/holds" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Resolve holds
                  </button>
                  <button
                    type="button"
                    onClick={() => openDrawer("Statements", "Monthly statements", { route: "/finance/statements", hint: "Generate and export monthly statements." })}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <FileText className="h-4 w-4" />
                    Open statements
                  </button>
                </div>
              </GlassCard>

              <GlassCard className="p-5 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Reconciliation state</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Enterprise-grade trust and explainability.</div>
                  </div>
                  <Badge tone={recLabel.tone}>{recLabel.label}</Badge>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-slate-600">Matched</div>
                    <div className="text-xs font-black text-slate-900">{rec.matchedPct}%</div>
                  </div>
                  <Bar value={rec.matchedPct} tone={recLabel.tone === "green" ? "green" : recLabel.tone === "orange" ? "orange" : "danger"} />
                  <div className="mt-2 text-xs font-semibold text-slate-600">{rec.note}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge tone="slate">Unmatched {rec.unmatched}</Badge>
                    <button
                      type="button"
                      onClick={() => openDrawer("Reconciliation", "Review unmatched transactions", { reconciliation: rec, route: "/finance/wallets" })}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.orange }}
                    >
                      <ChevronRight className="h-4 w-4" />
                      Review
                    </button>
                  </div>
                </div>

                <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Audit entry points</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">Every payout, hold release and invoice export should be auditable.</div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Multi-currency preview */}
            <GlassCard className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Multi-currency preview</div>
                <Badge tone="slate">Core</Badge>
                <span className="ml-auto"><Badge tone="slate">FX demo</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Balances shown by currency. Convert before payouts where relevant.</div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                {balances.map((b) => {
                  const hasHold = Number(b.holds || 0) > 0;
                  return (
                    <button
                      key={b.currency}
                      type="button"
                      onClick={() => openDrawer("Wallet details", `Currency ${b.currency}`, { wallet: b })}
                      className={cx(
                        "rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                        hasHold ? "border-orange-200" : "border-slate-200/70"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", hasHold ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black text-slate-900">{b.currency}</div>
                            {hasHold ? <Badge tone="orange">Hold</Badge> : <Badge tone="green">OK</Badge>}
                            <span className="ml-auto"><Badge tone="slate">Available</Badge></span>
                          </div>
                          <div className="mt-1 text-lg font-black text-slate-900">{currencyFmt(b.available, b.currency)}</div>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            <MiniRow label="Pending" value={currencyFmt(b.pending, b.currency)} tone="slate" />
                            <MiniRow label="Reserved" value={currencyFmt(b.reserved, b.currency)} tone="slate" />
                            <MiniRow label="Holds" value={currencyFmt(b.holds, b.currency)} tone={hasHold ? "orange" : "green"} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => pushToast({ title: "FX preview", message: "Wire FX engine and conversion flows (demo).", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <BarChart3 className="h-4 w-4" />
                  View FX
                </button>
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Convert", message: "Conversion wizard (demo).", tone: "success" })}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <ChevronRight className="h-4 w-4" />
                  Convert
                </button>
                <span className="ml-auto text-[11px] font-semibold text-slate-500">Tip: Convert only after verifying holds and reconciliation.</span>
              </div>
            </GlassCard>

            {/* Recent transactions */}
            <GlassCard className="overflow-hidden">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Recent activity</div>
                    <Badge tone="slate">Transactions</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={txQuery}
                        onChange={(e) => setTxQuery(e.target.value)}
                        placeholder="Search transactions"
                        className="h-10 w-[min(520px,82vw)] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                    </div>

                    <div className="relative">
                      <select
                        value={txType}
                        onChange={(e) => setTxType(e.target.value)}
                        className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                      >
                        {["All", "Sale", "Payout", "Refund", "Fee"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(exportCsv(transactions));
                        pushToast({ title: "CSV copied", message: "Transactions exported to clipboard.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[960px]">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                    <div className="col-span-2">Time</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-3">Reference</div>
                    <div className="col-span-2">Channel</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-1 text-right">Status</div>
                  </div>

                  <div className="divide-y divide-slate-200/70">
                    {transactions.map((t) => {
                      const tone = t.status === "Settled" ? "green" : t.status === "Processing" ? "orange" : t.status === "Pending" ? "orange" : "slate";
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => openDrawer("Transaction", `${t.id} · ${t.type}`, t)}
                          className="grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-700 transition hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                          <div className="col-span-2 text-slate-500">{fmtTime(t.at)}</div>
                          <div className="col-span-2"><Badge tone="slate">{t.type}</Badge></div>
                          <div className="col-span-3 text-slate-800">{t.ref}</div>
                          <div className="col-span-2"><Badge tone="slate">{t.channel}</Badge></div>
                          <div className={cx("col-span-2 font-black", String(t.amount).startsWith("-") ? "text-rose-700" : "text-emerald-700")}>{t.amount}</div>
                          <div className="col-span-1 flex justify-end"><Badge tone={tone}>{t.status}</Badge></div>
                        </button>
                      );
                    })}

                    {transactions.length === 0 ? (
                      <div className="p-6">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                          <div className="text-lg font-black text-slate-900">No transactions</div>
                          <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing the search term.</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Open wallets", message: "Wire to /finance/wallets", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Wallet className="h-4 w-4" />
                    Wallets
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Open invoices", message: "Wire to /finance/invoices", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Receipt className="h-4 w-4" />
                    Invoices
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Open holds", message: "Wire to /finance/holds", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Holds
                  </button>
                  <span className="ml-auto text-[11px] font-semibold text-slate-500">{transactions.length} item(s)</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right rail */}
          <div className="lg:col-span-4 space-y-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Finance alerts</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Trust signals and risk flags.</div>
                </div>
                <Badge tone="orange">Premium</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {data.alerts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => openDrawer(a.title, "Alert details", a)}
                    className={cx(
                      "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                      a.tone === "danger" ? "border-rose-200" : a.tone === "orange" ? "border-orange-200" : "border-slate-200/70"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cx("grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900", a.tone === "orange" ? "text-orange-700" : a.tone === "danger" ? "text-rose-700" : "text-slate-700")}>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{a.title}</div>
                          <span className="ml-auto"><Badge tone={a.tone === "orange" ? "orange" : a.tone === "danger" ? "danger" : "slate"}>{a.tone}</Badge></span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-600">{a.message}</div>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-800">
                          Open
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => pushToast({ title: "Preferences", message: "Wire notification rule shortcuts.", tone: "default" })}
                className="mt-4 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                Notification rule shortcuts
              </button>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Invoices snapshot</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Due, sent and paid.</div>
                </div>
                <Badge tone="slate">Core</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {invoices.map((i) => {
                  const tone = i.status === "Paid" ? "green" : i.status === "Due" ? "orange" : "slate";
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => openDrawer("Invoice", `${i.id} · ${i.status}`, i)}
                      className={cx("w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800", tone === "orange" ? "border-orange-200" : "border-slate-200/70")}
                    >
                      <div className="flex items-center gap-2">
                        <Badge tone={tone}>{i.status}</Badge>
                        <div className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{i.id}</div>
                        <Badge tone="slate">{i.channel}</Badge>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-600">Buyer: {i.buyer}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-600">Amount: {i.amount}</div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-500">Due {fmtDate(i.dueAt)}</div>
                    </button>
                  );
                })}

                {invoices.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5">
                    <div className="text-sm font-black text-slate-900">No invoices</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">This filter has no invoices.</div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Create invoice", message: "Wire invoice creation drawer.", tone: "success" })}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Plus className="h-4 w-4" />
                  Create invoice
                </button>
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Open invoices", message: "Wire to /finance/invoices", tone: "default" })}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                  View all
                </button>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Payout holds explanation</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">What is blocked, why, how to resolve.</div>
                </div>
                <Badge tone="orange">Super premium</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {data.holds.map((h) => (
                  <div key={h.id} className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-700" />
                      <div className="text-sm font-black text-orange-900">{h.id}</div>
                      <span className="ml-auto"><Badge tone="orange">{h.status}</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-orange-900/80">Reason: {h.reason}</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/80">Amount: {h.amount}</div>
                    <div className="mt-3 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-orange-900/80">
                      Fix: {h.howToFix}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Guided fix", message: "Start guided fix flow (demo).", tone: "success" })}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <ChevronRight className="h-4 w-4" />
                        Start fix
                      </button>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Audit logged", message: "Hold resolution attempt logged (demo).", tone: "default" })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Log action
                      </button>
                    </div>
                  </div>
                ))}

                {data.holds.length === 0 ? (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-emerald-900">No active holds</div>
                        <div className="mt-1 text-xs font-semibold text-emerald-900/70">Your payouts are eligible to settle.</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Generic Drawer */}
      <Drawer open={drawer.open} title={drawer.title} subtitle={drawer.subtitle} onClose={closeDrawer}>
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Details</div>
              <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
            </div>
            <pre className="mt-3 max-h-[460px] overflow-auto rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-800">{JSON.stringify(drawer.body || {}, null, 2)}</pre>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                safeCopy(JSON.stringify(drawer.body || {}, null, 2));
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
                pushToast({ title: "Audit", message: "Open audit log explorer (demo).", tone: "default" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
            >
              <ClipboardList className="h-4 w-4" />
              Audit entries
            </button>
            <button
              type="button"
              onClick={() => {
                pushToast({ title: "Done", message: "Action queued (demo).", tone: "success" });
                closeDrawer();
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Check className="h-4 w-4" />
              Run action
            </button>
          </div>
        </div>
      </Drawer>

      {/* Export Drawer */}
      <Drawer
        open={exportOpen}
        title="Export"
        subtitle="Export finance data (demo)."
        onClose={() => setExportOpen(false)}
      >
        <div className="grid gap-3">
          {[{ k: "csv", t: "CSV", d: "Spreadsheet-friendly export" }, { k: "json", t: "JSON", d: "API-friendly export" }, { k: "pdf", t: "PDF", d: "Shareable report" }].map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => {
                const payload = {
                  balances: data.balances,
                  transactions: data.transactions,
                  invoices: data.invoices,
                  holds: data.holds,
                  payout: data.payout,
                  reconciliation: data.reconciliation,
                };
                if (x.k === "csv") safeCopy(exportCsv(data.transactions));
                if (x.k === "json") safeCopy(JSON.stringify(payload, null, 2));
                setExportOpen(false);
                pushToast({ title: `Export ready (${x.t})`, message: "Copied to clipboard (demo).", tone: "success" });
              }}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <Download className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">{x.t}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                  <div className="mt-2 text-[11px] font-extrabold text-slate-500">Range {range} · Channel {channel} · Currency {currency}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </button>
          ))}

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-orange-900">Super premium</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">Export jobs queue, secure share links, and scheduled exports can be added here.</div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
