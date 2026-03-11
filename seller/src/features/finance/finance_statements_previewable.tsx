import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import { useThemeMode } from "../../theme/themeMode";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  Globe,
  Info,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";

/**
 * Finance 3: Statements
 * Route: /finance/statements
 * Previewable single-file page
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
type KpiCardProps = { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; hint?: string; tone?: BadgeTone };
type SelectionMap = Record<string, boolean>;
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtMoney(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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

function Drawer({ open, title, subtitle, onClose, children }) {
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
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[980px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function SegTab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {label}
    </button>
  );
}

function KpiCard({ icon: Icon, label, value, hint, tone = "slate" }: KpiCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "danger" && "bg-rose-50 text-rose-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
          {hint ? <div className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function statementDemoRows() {
  const now = Date.now();
  const daysAgo = (d) => new Date(now - d * 24 * 3600_000).toISOString();

  // Think of each as a monthly statement document
  return [
    {
      id: "STM-2026-02",
      periodStart: new Date(now - 16 * 24 * 3600_000).toISOString(),
      periodEnd: new Date(now - 1 * 24 * 3600_000).toISOString(),
      currency: "USD",
      openingBalance: 1250.0,
      closingBalance: 1895.4,
      inflow: 1120.2,
      outflow: 474.8,
      generatedAt: daysAgo(1),
      status: "Ready",
      lines: [
        { id: "t1", at: daysAgo(12), type: "Credit", source: "Invoice Payment", ref: "INV-24018", amount: 326.4, note: "Paid" },
        { id: "t2", at: daysAgo(10), type: "Debit", source: "Payout", ref: "PO-77411", amount: -180.0, note: "Weekly settlement" },
        { id: "t3", at: daysAgo(8), type: "Credit", source: "Order", ref: "ORD-10512", amount: 560.0, note: "Delivered" },
        { id: "t4", at: daysAgo(6), type: "Debit", source: "Fee", ref: "FEE-2091", amount: -24.8, note: "Processing" },
        { id: "t5", at: daysAgo(3), type: "Credit", source: "Partial Payment", ref: "INV-24016", amount: 233.8, note: "Partial" },
      ],
    },
    {
      id: "STM-2026-01",
      periodStart: new Date(now - 46 * 24 * 3600_000).toISOString(),
      periodEnd: new Date(now - 18 * 24 * 3600_000).toISOString(),
      currency: "USD",
      openingBalance: 820.0,
      closingBalance: 1250.0,
      inflow: 690.0,
      outflow: 260.0,
      generatedAt: daysAgo(18),
      status: "Ready",
      lines: [
        { id: "t6", at: daysAgo(40), type: "Credit", source: "Invoice Payment", ref: "INV-24012", amount: 420.0, note: "Paid" },
        { id: "t7", at: daysAgo(33), type: "Debit", source: "Chargeback Reserve", ref: "RES-113", amount: -80.0, note: "Hold" },
        { id: "t8", at: daysAgo(26), type: "Credit", source: "Release Reserve", ref: "RES-113", amount: 80.0, note: "Released" },
        { id: "t9", at: daysAgo(22), type: "Debit", source: "Payout", ref: "PO-77001", amount: -180.0, note: "Weekly settlement" },
      ],
    },
    {
      id: "STM-2025-12",
      periodStart: new Date(now - 76 * 24 * 3600_000).toISOString(),
      periodEnd: new Date(now - 47 * 24 * 3600_000).toISOString(),
      currency: "CNY",
      openingBalance: 8620.0,
      closingBalance: 8620.0,
      inflow: 0.0,
      outflow: 0.0,
      generatedAt: daysAgo(46),
      status: "Ready",
      lines: [{ id: "t10", at: daysAgo(60), type: "Credit", source: "Order", ref: "ORD-10506", amount: 8620.0, note: "Delivered" }],
    },
  ];
}

function lineTone(amount) {
  const n = Number(amount || 0);
  if (n > 0) return "green";
  if (n < 0) return "orange";
  return "slate";
}

function StatementTable({ rows, selected, setSelected, onOpen }) {
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected[r.id]);

  const toggleAll = () => {
    if (!rows.length) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        rows.forEach((r) => delete next[r.id]);
      } else {
        rows.forEach((r) => (next[r.id] = true));
      }
      return next;
    });
  };

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
      <div className="min-w-[1120px]">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
          <div className="col-span-1">
            <button
              type="button"
              onClick={toggleAll}
              className={cx(
                "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                allVisibleSelected ? "border-emerald-200" : "border-slate-200/70"
              )}
              aria-label="Select all"
            >
              {allVisibleSelected ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
            </button>
          </div>
          <div className="col-span-2">Statement</div>
          <div className="col-span-3">Period</div>
          <div className="col-span-2">Balances</div>
          <div className="col-span-2">Flows</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Open</div>
        </div>

        <div className="divide-y divide-slate-200/70">
          {rows.map((r) => {
            const checked = !!selected[r.id];
            return (
              <div key={r.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => setSelected((s) => ({ ...s, [r.id]: !checked }))}
                    className={cx("grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900", checked ? "border-emerald-200" : "border-slate-200/70")}
                    aria-label={checked ? "Unselect" : "Select"}
                  >
                    {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                  </button>
                </div>

                <div className="col-span-2">
                  <div className="text-sm font-black text-slate-900">{r.id}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Generated {fmtTime(r.generatedAt)}</div>
                </div>

                <div className="col-span-3">
                  <div className="text-sm font-extrabold text-slate-900">{fmtDate(r.periodStart)} → {fmtDate(r.periodEnd)}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <Calendar className="h-3.5 w-3.5" /> {r.currency}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm font-black text-slate-900">{fmtMoney(r.openingBalance, r.currency)} → {fmtMoney(r.closingBalance, r.currency)}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Opening → Closing</div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm font-black text-slate-900">+{fmtMoney(r.inflow, r.currency)} / {fmtMoney(r.outflow, r.currency)}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Inflow / Outflow</div>
                </div>

                <div className="col-span-1 flex items-center">
                  <Badge tone={r.status === "Ready" ? "green" : "slate"}>{r.status}</Badge>
                </div>

                <div className="col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950"
                    aria-label="Open"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {rows.length === 0 ? (
            <div className="p-6">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                    <Search className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-900">No statements found</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or switching currency.</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className={cx("text-xs", strong ? "font-black text-slate-900" : "font-semibold text-slate-700")}>{value}</div>
    </div>
  );
}

function StatementDetail({ statement, onClose, pushToast }) {
  const [tab, setTab] = useState("Summary");

  useEffect(() => {
    setTab("Summary");
  }, [statement?.id]);

  if (!statement) return null;

  const lines = statement.lines || [];

  return (
    <Drawer
      open={!!statement}
      title={`Statement · ${statement.id}`}
      subtitle={`${fmtDate(statement.periodStart)} → ${fmtDate(statement.periodEnd)} · ${statement.currency}`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { k: "Summary", label: "Summary" },
            { k: "Transactions", label: "Transactions" },
            { k: "Notes", label: "Notes" },
          ].map((t) => (
            <SegTab key={t.k} label={t.label} active={tab === t.k} onClick={() => setTab(t.k)} />
          ))}

          <span className="ml-auto flex items-center gap-2">
            <Badge tone={statement.status === "Ready" ? "green" : "slate"}>{statement.status}</Badge>
            <Badge tone="slate">{statement.currency}</Badge>
          </span>
        </div>

        <GlassCard className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-900">Statement pack</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Use this for reconciliation, tax prep, and payout verification.</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(statement.id);
                    pushToast({ title: "Copied", message: "Statement ID copied.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy ID
                </button>

                <button
                  type="button"
                  onClick={() => pushToast({ title: "PDF", message: "Statement PDF exported (demo).", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={() => pushToast({ title: "CSV", message: "Transactions exported (demo).", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => pushToast({ title: "Reconcile", message: "Auto-reconcile started (demo).", tone: "success" })}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.orange }}
                >
                  <CheckCheck className="h-4 w-4" />
                  Run reconcile
                </button>
              </div>
            </div>
          </div>
        </GlassCard>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
          >
            {tab === "Summary" ? (
              <div className="grid gap-3 lg:grid-cols-12">
                <GlassCard className="p-5 lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Balances</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Opening and closing</div>
                    </div>
                    <Badge tone="slate">{statement.currency}</Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-xs font-semibold text-slate-700">
                    <Row label="Opening balance" value={fmtMoney(statement.openingBalance, statement.currency)} />
                    <Row label="Closing balance" value={fmtMoney(statement.closingBalance, statement.currency)} strong />
                    <div className="h-px bg-slate-200/70" />
                    <Row label="Inflow" value={fmtMoney(statement.inflow, statement.currency)} />
                    <Row label="Outflow" value={fmtMoney(statement.outflow, statement.currency)} />
                  </div>
                </GlassCard>

                <GlassCard className="p-5 lg:col-span-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Quick checks</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Signals for finance ops</div>
                    </div>
                    <Badge tone="slate">Demo</Badge>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <QuickCheck label="All transactions categorized" ok />
                    <QuickCheck label="No negative closing balance" ok={Number(statement.closingBalance || 0) >= 0} />
                    <QuickCheck label="Reconcile status" ok note="Pending" />
                  </div>

                  <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Premium add-on</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">In production: bank feed imports, FX revaluation, and multi-ledger exports.</div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ) : null}

            {tab === "Transactions" ? (
              <GlassCard className="p-5">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Transactions</div>
                  <span className="ml-auto"><Badge tone="slate">{lines.length}</Badge></span>
                </div>

                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                    <div className="col-span-2">Time</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-3">Source</div>
                    <div className="col-span-3">Reference</div>
                    <div className="col-span-2">Amount</div>
                  </div>
                  <div className="divide-y divide-slate-200/70">
                    {lines.map((t) => {
                      const amt = Number(t.amount || 0);
                      const isCredit = amt > 0;
                      const ToneIcon = isCredit ? ArrowUpRight : ArrowDownRight;
                      return (
                        <div key={t.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                          <div className="col-span-2 text-slate-500">{fmtTime(t.at)}</div>
                          <div className="col-span-2 flex items-center gap-2">
                            <span className={cx("grid h-9 w-9 place-items-center rounded-2xl", isCredit ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>
                              <ToneIcon className="h-4 w-4" />
                            </span>
                            <Badge tone={isCredit ? "green" : "orange"}>{t.type}</Badge>
                          </div>
                          <div className="col-span-3">
                            <div className="text-sm font-extrabold text-slate-900">{t.source}</div>
                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{t.note}</div>
                          </div>
                          <div className="col-span-3 flex items-center">
                            <Badge tone="slate">{t.ref}</Badge>
                          </div>
                          <div className="col-span-2 flex items-center font-black text-slate-900">
                            {amt >= 0 ? "+" : ""}{fmtMoney(amt, statement.currency)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>
            ) : null}

            {tab === "Notes" ? (
              <GlassCard className="p-5">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Notes</div>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    "Statements summarize wallet activity for the selected period.",
                    "Some transactions may be pending in external rails and appear in the next period.",
                    "FX conversions and fees are shown at transaction-level when enabled (premium).",
                  ].map((n) => (
                    <div key={n} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-xs font-semibold text-slate-700">
                      {n}
                    </div>
                  ))}
                </div>
              </GlassCard>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </Drawer>
  );
}

function QuickCheck({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className={cx("rounded-3xl border p-4", ok ? "border-emerald-200 bg-emerald-50/60" : "border-orange-200 bg-orange-50/60")}>
      <div className="flex items-center gap-2">
        <div className={cx("grid h-9 w-9 place-items-center rounded-2xl bg-white dark:bg-slate-900", ok ? "text-emerald-700" : "text-orange-700")}>
          {ok ? <CheckCheck className="h-4 w-4" /> : <Info className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900">{label}</div>
          {note ? <div className="mt-0.5 text-[11px] font-semibold text-slate-600">{note}</div> : null}
        </div>
        <Badge tone={ok ? "green" : "orange"}>{ok ? "OK" : "Check"}</Badge>
      </div>
    </div>
  );
}

export default function FinanceStatementsPage() {
  const { resolvedMode } = useThemeMode();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    void sellerBackendApi
      .getFinanceStatements()
      .then((payload) => {
        if (!mounted) return;
        setRows(Array.isArray((payload as Record<string, any>)?.statements) ? ((payload as Record<string, any>).statements as any[]) : []);
      })
      .catch(() => {
        if (!mounted) return;
        pushToast({ title: "Statements unavailable", message: "Could not load statements.", tone: "danger" });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const [q, setQ] = useState("");
  const [currency, setCurrency] = useState("All");

  const currencies = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.currency)))], [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows
      .filter((r) => (currency === "All" ? true : r.currency === currency))
      .filter((r) => {
        if (!query) return true;
        const hay = `${r.id} ${r.currency}`.toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }, [rows, q, currency]);

  const stats = useMemo(() => {
    const count = rows.length;
    const totalInflow = rows.reduce((s, r) => s + Number(r.inflow || 0), 0);
    const totalOutflow = rows.reduce((s, r) => s + Number(r.outflow || 0), 0);
    const ready = rows.filter((r) => r.status === "Ready").length;
    return { count, totalInflow, totalOutflow, ready };
  }, [rows]);

  const [selected, setSelected] = useState<SelectionMap>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeStatement = useMemo(() => rows.find((r) => r.id === activeId) || null, [rows, activeId]);

  const bulkAction = (kind) => {
    if (!selectedIds.length) {
      pushToast({ title: "Select statements", message: "Choose one or more statements first.", tone: "warning" });
      return;
    }
    if (kind === "Export") {
      pushToast({ title: "Export started", message: `${selectedIds.length} statement(s) exported (demo).`, tone: "default" });
      return;
    }
    if (kind === "Reconcile") {
      pushToast({ title: "Reconcile queued", message: `${selectedIds.length} statement(s) queued (demo).`, tone: "success" });
      setSelected({});
      return;
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          resolvedMode === "dark"
            ? "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.16) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), linear-gradient(180deg, #020617 0%, #0b1220 45%, #020617 100%)"
            : "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Statements</div>
                <Badge tone="slate">/finance/statements</Badge>
                <Badge tone="slate">Finance</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Monthly statement packs for wallet activity and reconciliation.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest statements loaded (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Generate", message: "Statement generation is scheduled (demo).", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                Generate statement
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard icon={FileText} label="Statements" value={String(stats.count)} tone="slate" />
          <KpiCard icon={ArrowUpRight} label="Total inflow" value={fmtMoney(stats.totalInflow, "USD")} tone="green" hint="All currencies combined (demo)" />
          <KpiCard icon={ArrowDownRight} label="Total outflow" value={fmtMoney(stats.totalOutflow, "USD")} tone="orange" hint="All currencies combined (demo)" />
          <KpiCard icon={CheckCheck} label="Ready" value={String(stats.ready)} tone="green" />
        </div>

        {/* Filters */}
        <GlassCard className="mt-4 p-4">
          <div className="grid gap-3 md:grid-cols-12 md:items-center">
            <div className="relative md:col-span-7">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search statement ID or currency"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? "All currencies" : c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setCurrency("All");
                  setSelected({});
                  pushToast({ title: "Cleared", message: "Filters cleared.", tone: "default" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
              <Badge tone="slate">{filtered.length} results</Badge>
            </div>
          </div>
        </GlassCard>

        {/* Bulk actions */}
        {selectedIds.length ? (
          <div className="mt-3 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800">
                <CheckCheck className="h-4 w-4" />
                {selectedIds.length} selected
              </div>

              <button
                type="button"
                onClick={() => bulkAction("Reconcile")}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <CheckCheck className="h-4 w-4" />
                Reconcile
              </button>

              <button
                type="button"
                onClick={() => bulkAction("Export")}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              <button
                type="button"
                onClick={() => setSelected({})}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Clear selection
              </button>
            </div>
          </div>
        ) : null}

        {/* Table */}
        <div className="mt-4">
          <StatementTable rows={filtered} selected={selected} setSelected={setSelected} onOpen={(id) => setActiveId(id)} />
        </div>
      </div>

      <StatementDetail statement={activeStatement} onClose={() => setActiveId(null)} pushToast={pushToast} />
      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
