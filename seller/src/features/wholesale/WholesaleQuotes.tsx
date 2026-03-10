import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Filter,
  Layers,
  ListChecks,
  Mail,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";

/**
 * Wholesale Quotes Hub (PREVIEWABLE)
 * Single canvas file that includes:
 * - Quotes list (status + win chance + total)
 * - Follow-up reminder sidebar (sorted by next follow-up time)
 * - Quote Detail drawer (versions timeline + approvals tab)
 * - Premium orange + black Edit drawer with sensitive edit detection (10% threshold)
 * - Quote Templates system (picker + editor + apply template)
 * - Convert Accepted Quote -> Order Creation drawer (order pipeline stages + handoff)
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastAction = { label: string; onClick: () => void };
type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: ToastAction };

type LineItem = { id: string; name: string; qty: number; unit: number };
type QuoteTotals = { subtotal: number; tax: number; total: number };
type ApprovalDecisionStatus = "Pending" | "Approved" | "Rejected";
type ApprovalRequest = {
  id: string;
  at: string;
  status: ApprovalDecisionStatus;
  actor?: string;
  note?: string;
  requester?: string;
  approver?: string;
  reason?: string;
  decidedAt?: string | null;
};
type Approvals = { thresholdPct: number; required: boolean; requests: ApprovalRequest[] };
type Activity = { id: string; at: string; actor: string; text: string };
type QuoteSnapshot = {
  title: string;
  client: string;
  currency: string;
  status: string;
  winChance: number;
  discount: number;
  shipping: number;
  taxRate: number;
  terms: string;
  notes: string;
  lines: LineItem[];
  totals?: QuoteTotals;
};
type QuoteVersion = { id: string; at: string; actor: string; note: string; snapshot: QuoteSnapshot };
type Quote = {
  id: string;
  title: string;
  client: string;
  contact: string;
  currency: string;
  status: string;
  winChance: number;
  discount: number;
  shipping: number;
  taxRate: number;
  terms: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  nextFollowUpAt?: string | null;
  approvals?: Approvals;
  activity?: Activity[];
  lines: LineItem[];
  totals?: QuoteTotals;
  versions?: QuoteVersion[];
  convertedOrderId?: string | null;
};
type QuoteTemplate = {
  id: string;
  name: string;
  description?: string;
  currency: string;
  discount: number;
  shipping: number;
  taxRate: number;
  terms: string;
  lines: LineItem[];
};
type TemplateDraft = {
  id?: string;
  name: string;
  description?: string;
  currency: string;
  discount: number;
  shipping: number;
  taxRate: number;
  terms: string;
  lines: LineItem[];
};
type OrderDraft = {
  orderId: string;
  warehouse: string;
  shipping: string;
  payment: string;
  assignee: string;
  dueDate: string;
  handoffNote: string;
};
type BadgeTone = "green" | "orange" | "danger" | "slate" | "black";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function minsUntil(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.round((t - Date.now()) / 60000);
}

function humanDue(iso: string) {
  const m = minsUntil(iso);
  if (m === null) return "";
  if (m <= 0) return "Overdue";
  if (m < 60) return `In ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `In ${h}h`;
  const d = Math.round(h / 24);
  return `In ${d}d`;
}

function fmtMoney(amount: number | string | null | undefined, currency: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "slate" && "bg-slate-100 text-slate-700",
        tone === "black" && "bg-slate-900 text-white"
      )}
    >
      {children}
    </span>
  );
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

function IconButton({
  label,
  onClick,
  children,
  tone = "light",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        tone === "dark"
          ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function SegTab({
  label,
  active,
  onClick,
  tone = "green",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "green" | "orange";
}) {
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
      {label}
    </button>
  );
}

function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  tone = "default",
  right,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  tone?: "default" | "orangeBlack";
  right?: React.ReactNode;
}) {
  const headerBg = tone === "orangeBlack" ? TOKENS.black : "rgba(255,255,255,0.85)";
  const headerText = tone === "orangeBlack" ? "text-white" : "text-slate-900";

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
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[900px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 px-4 py-3" style={{ background: headerBg }}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className={cx("text-sm font-black", headerText)}>{title}</div>
                    {subtitle ? (
                      <div
                        className={cx(
                          "mt-1 text-xs font-semibold",
                          tone === "orangeBlack" ? "text-white/70" : "text-slate-500"
                        )}
                      >
                        {subtitle}
                      </div>
                    ) : null}
                  </div>
                  {right ? <div className="mr-1 flex items-center gap-2">{right}</div> : null}
                  <IconButton label="Close" onClick={onClose} tone={tone === "orangeBlack" ? "dark" : "light"}>
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

function ToastCenter({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
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

function calcTotals(lines: LineItem[], discount: number, shipping: number, taxRate: number): QuoteTotals {
  const subtotalRaw = (lines || []).reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit || 0), 0);
  const subtotal = Math.max(0, Math.round((subtotalRaw - Number(discount || 0)) * 100) / 100);
  const tax = Math.round(subtotal * Number(taxRate || 0) * 100) / 100;
  const total = Math.round((subtotal + Number(shipping || 0) + tax) * 100) / 100;
  return { subtotal, tax, total };
}

function seedTemplates(): QuoteTemplate[] {
  return [
    {
      id: "TPL-CHARGERS-STD",
      name: "Standard EV Charger Bulk Quote",
      description: "Great default for bulk charger purchases (with delivery and warranty terms).",
      currency: "USD",
      discount: 120,
      shipping: 180,
      taxRate: 0.02,
      terms: "Payment: 50% deposit, 50% before shipment. Warranty: 12 months. Delivery: 20 to 30 days.",
      lines: [
        { id: makeId("l"), name: "7kW Wallbox Charger", qty: 20, unit: 560 },
        { id: makeId("l"), name: "Type 2 Cable 5m", qty: 50, unit: 28 },
        { id: makeId("l"), name: "Spare RFID Cards", qty: 30, unit: 3.5 },
      ],
    },
    {
      id: "TPL-LOG-PORT",
      name: "Warehouse to Port Logistics",
      description: "Service quote template for export and documentation support.",
      currency: "USD",
      discount: 0,
      shipping: 0,
      taxRate: 0.0,
      terms: "Includes documentation checklist, coordination, and export readiness review.",
      lines: [
        { id: makeId("l"), name: "Logistics planning package", qty: 1, unit: 420 },
        { id: makeId("l"), name: "Documentation support", qty: 1, unit: 160 },
      ],
    },
    {
      id: "TPL-INSTALL",
      name: "EV Charger Installation Package",
      description: "On-site survey + installation + commissioning.",
      currency: "USD",
      discount: 0,
      shipping: 0,
      taxRate: 0.02,
      terms: "Includes site survey, installation, and commissioning. Excludes civil works.",
      lines: [
        { id: makeId("l"), name: "Site survey", qty: 1, unit: 120 },
        { id: makeId("l"), name: "Installation service", qty: 1, unit: 620 },
        { id: makeId("l"), name: "Commissioning", qty: 1, unit: 180 },
      ],
    },
  ];
}

function seedQuotes(): Quote[] {
  const now = Date.now();
  const ago = (m: number) => new Date(now - m * 60_000).toISOString();
  const inM = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

  const q1 = {
    id: "QT-24018",
    title: "Bulk EV Charger Supply (Phase 1)",
    client: "Kampala City Fleet",
    contact: "procurement@kcf.example",
    currency: "USD",
    status: "Negotiating",
    winChance: 72,
    discount: 150,
    shipping: 260,
    taxRate: 0.02,
    terms: "Payment: 40% deposit, 60% before shipment. Warranty: 12 months. Delivery: 25 days.",
    notes: "Client asked to improve warranty language and reduce delivery risk.",
    createdAt: ago(60 * 72),
    updatedAt: ago(42),
    nextFollowUpAt: inM(90),
    approvals: {
      thresholdPct: 0.1,
      required: false,
      requests: [],
    },
    activity: [
      { id: makeId("act"), at: ago(46), actor: "Sales", text: "Updated quote after negotiation call." },
      { id: makeId("act"), at: ago(120), actor: "System", text: "Quote sent to client." },
    ],
    lines: [
      { id: makeId("ln"), name: "7kW Wallbox Charger", qty: 30, unit: 560 },
      { id: makeId("ln"), name: "Type 2 Cable 5m", qty: 60, unit: 28 },
      { id: makeId("ln"), name: "Installation guidance (remote)", qty: 1, unit: 120 },
    ],
  };

  const q2 = {
    id: "QT-24019",
    title: "Logistics Setup and Documentation",
    client: "Nairobi Importers Ltd",
    contact: "ops@nairobiimporters.example",
    currency: "USD",
    status: "Sent",
    winChance: 55,
    discount: 0,
    shipping: 0,
    taxRate: 0,
    terms: "Service delivery within 5 business days. Payment on delivery.",
    notes: "Follow up and propose a bundled offer.",
    createdAt: ago(60 * 24),
    updatedAt: ago(180),
    nextFollowUpAt: inM(25),
    approvals: {
      thresholdPct: 0.1,
      required: false,
      requests: [],
    },
    activity: [
      { id: makeId("act"), at: ago(200), actor: "System", text: "Quote sent to client." },
    ],
    lines: [
      { id: makeId("ln"), name: "Logistics planning package", qty: 1, unit: 420 },
      { id: makeId("ln"), name: "Documentation support", qty: 1, unit: 160 },
    ],
  };

  const q3 = {
    id: "QT-24020",
    title: "EV Charger Installation (Commercial Site)",
    client: "GreenMall Properties",
    contact: "facilities@greenmall.example",
    currency: "USD",
    status: "Accepted",
    winChance: 88,
    discount: 0,
    shipping: 0,
    taxRate: 0.02,
    terms: "Install within 10 days of deposit. Includes commissioning report.",
    notes: "Accepted. Convert to order pipeline.",
    createdAt: ago(60 * 120),
    updatedAt: ago(12),
    nextFollowUpAt: inM(60 * 24 * 2),
    approvals: {
      thresholdPct: 0.1,
      required: false,
      requests: [],
    },
    activity: [
      { id: makeId("act"), at: ago(15), actor: "Client", text: "Accepted quote and requested kickoff plan." },
    ],
    lines: [
      { id: makeId("ln"), name: "Site survey", qty: 1, unit: 120 },
      { id: makeId("ln"), name: "Installation service", qty: 1, unit: 620 },
      { id: makeId("ln"), name: "Commissioning", qty: 1, unit: 180 },
    ],
  };

  const addVersions = (q: Quote) => {
    const totals = calcTotals(q.lines, q.discount, q.shipping, q.taxRate);
    const baseSnapshot = {
      title: q.title,
      client: q.client,
      currency: q.currency,
      status: q.status,
      winChance: q.winChance,
      discount: q.discount,
      shipping: q.shipping,
      taxRate: q.taxRate,
      terms: q.terms,
      notes: q.notes,
      lines: JSON.parse(JSON.stringify(q.lines)),
      totals,
    };

    const v0 = {
      id: makeId("ver"),
      at: q.createdAt,
      actor: "System",
      note: "Initial version",
      snapshot: baseSnapshot,
    };

    const v1 = {
      id: makeId("ver"),
      at: q.updatedAt,
      actor: "Sales",
      note: "Updated pricing and terms",
      snapshot: baseSnapshot,
    };

    return { ...q, totals, versions: [v1, v0], convertedOrderId: null };
  };

  return [addVersions(q1), addVersions(q2), addVersions(q3)];
}

function statusTone(status: string) {
  if (status === "Accepted") return "green";
  if (status === "Pending Approval") return "orange";
  if (status === "Rejected" || status === "Expired") return "danger";
  if (status === "Negotiating") return "orange";
  return "slate";
}

function winTone(pct: number) {
  const p = Number(pct || 0);
  if (p >= 80) return "green";
  if (p >= 55) return "orange";
  return "danger";
}

function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LineItemsTable({
  lines,
  currency,
  onChange,
  readOnly = false,
}: {
  lines: LineItem[];
  currency: string;
  onChange: (next: LineItem[]) => void;
  readOnly?: boolean;
}) {
  const update = (id: string, patch: Partial<LineItem>) => {
    if (readOnly) return;
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const remove = (id: string) => {
    if (readOnly) return;
    onChange(lines.filter((l) => l.id !== id));
  };

  const add = () => {
    if (readOnly) return;
    onChange([
      ...lines,
      { id: makeId("ln"), name: "New line", qty: 1, unit: 0 },
    ]);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
        <div className="col-span-6">Item</div>
        <div className="col-span-2">Qty</div>
        <div className="col-span-2">Unit</div>
        <div className="col-span-2">Line</div>
      </div>

      <div className="divide-y divide-slate-200/70">
        {lines.map((l) => {
          const lineTotal = Math.round(Number(l.qty || 0) * Number(l.unit || 0) * 100) / 100;
          return (
            <div key={l.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
              <div className="col-span-6">
                {readOnly ? (
                  <div className="text-sm font-extrabold text-slate-900">{l.name}</div>
                ) : (
                  <input
                    value={l.name}
                    onChange={(e) => update(l.id, { name: e.target.value })}
                    className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                )}
              </div>
              <div className="col-span-2">
                {readOnly ? (
                  <div className="h-10 grid place-items-center rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-extrabold text-slate-800">{l.qty}</div>
                ) : (
                  <input
                    value={String(l.qty)}
                    onChange={(e) => update(l.id, { qty: Number(e.target.value) })}
                    className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                )}
              </div>
              <div className="col-span-2">
                {readOnly ? (
                  <div className="h-10 grid place-items-center rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-extrabold text-slate-800">{fmtMoney(l.unit, currency)}</div>
                ) : (
                  <input
                    value={String(l.unit)}
                    onChange={(e) => update(l.id, { unit: Number(e.target.value) })}
                    className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                )}
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2">
                <div className="text-sm font-black text-slate-900">{fmtMoney(lineTotal, currency)}</div>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => remove(l.id)}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {lines.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No line items" message="Add at least one line item to compute totals." />
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="border-t border-slate-200/70 p-3">
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <Plus className="h-4 w-4" />
            Add line
          </button>
        </div>
      ) : null}
    </div>
  );
}

function OrderPipeline({ stage, setStage }: { stage: string; setStage: (stage: string) => void }) {
  const stages = [
    { key: "Draft", label: "Draft Order" },
    { key: "Approval", label: "Approvals" },
    { key: "Payment", label: "Payment" },
    { key: "Fulfillment", label: "Fulfillment" },
    { key: "Shipping", label: "Shipping" },
    { key: "Delivered", label: "Delivered" },
  ];

  const idx = Math.max(0, stages.findIndex((s) => s.key === stage));

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-slate-700" />
        <div className="text-sm font-black text-slate-900">Order pipeline</div>
        <span className="ml-auto">
          <Badge tone="slate">Stage {idx + 1}/{stages.length}</Badge>
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {stages.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStage(s.key)}
              className={cx(
                "flex w-full items-center gap-3 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-left text-xs font-extrabold transition",
                active ? "border-emerald-200" : "border-slate-200/70 hover:bg-gray-50 dark:bg-slate-950"
              )}
            >
              <span
                className={cx(
                  "grid h-9 w-9 place-items-center rounded-2xl",
                  done ? "bg-emerald-50 text-emerald-700" : active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <span className="text-[11px] font-black">{i + 1}</span>}
              </span>
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              {active ? <ChevronRight className="h-4 w-4 text-emerald-700" /> : <ChevronRight className="h-4 w-4 text-slate-300" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WholesaleQuotesHubCanvas() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getWholesaleQuotes().then((payload) => {
      if (!active) return;
      const quoteRows = Array.isArray((payload as { quotes?: unknown[] }).quotes)
        ? ((payload as { quotes?: Array<Record<string, unknown>> }).quotes ?? [])
        : [];
      const templateRows = Array.isArray((payload as { templates?: unknown[] }).templates)
        ? ((payload as { templates?: Array<Record<string, unknown>> }).templates ?? [])
        : [];
      setTemplates(
        templateRows.map((entry) => ({
          id: String(entry.id ?? ""),
          name: String(entry.name ?? "Template"),
          description: entry.description ? String(entry.description) : undefined,
          currency: String(entry.currency ?? "USD"),
          discount: Number(entry.discount ?? 0),
          shipping: Number(entry.shipping ?? 0),
          taxRate: Number(entry.taxRate ?? 0),
          terms: String(entry.terms ?? ""),
          lines: Array.isArray(entry.lines) ? entry.lines as LineItem[] : [],
        }))
      );
      setQuotes(
        quoteRows.map((entry) => {
          const data = entry as Record<string, unknown>;
          return {
            id: String(data.id ?? ""),
            title: String(data.title ?? "Quote"),
            client: String(data.client ?? data.buyer ?? ""),
            contact: String(data.contact ?? ""),
            currency: String(data.currency ?? "USD"),
            status: String(data.status ?? "Draft"),
            winChance: Number(data.winChance ?? 0),
            discount: Number(data.discount ?? 0),
            shipping: Number(data.shipping ?? 0),
            taxRate: Number(data.taxRate ?? 0),
            terms: String(data.terms ?? ""),
            notes: String(data.notes ?? ""),
            createdAt: String(data.createdAt ?? new Date().toISOString()),
            updatedAt: String(data.updatedAt ?? new Date().toISOString()),
            nextFollowUpAt: data.nextFollowUpAt ? String(data.nextFollowUpAt) : null,
            approvals: (data.approvals as Approvals | undefined) ?? { thresholdPct: 0.1, required: false, requests: [] },
            activity: Array.isArray(data.activity) ? data.activity as Activity[] : [],
            lines: Array.isArray(data.lines) ? data.lines as LineItem[] : [],
            totals: (data.totals as QuoteTotals | undefined) ?? undefined,
            versions: Array.isArray(data.versions) ? data.versions as QuoteVersion[] : [],
            convertedOrderId: data.convertedOrderId ? String(data.convertedOrderId) : null,
          } satisfies Quote;
        })
      );
    });

    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!quotes.find((q) => q.id === activeId)) setActiveId(quotes[0]?.id);
  }, [quotes]);

  const active = useMemo(() => quotes.find((q) => q.id === activeId) || null, [quotes, activeId]);

  const counts = useMemo(() => {
    const map = { All: quotes.length };
    quotes.forEach((q) => {
      map[q.status] = (map[q.status] || 0) + 1;
    });
    return map;
  }, [quotes]);

  const statuses = useMemo(() => {
    const base = ["All", "Draft", "Sent", "Negotiating", "Pending Approval", "Accepted", "Rejected", "Expired"];
    const present = new Set(quotes.map((q) => q.status));
    // Keep consistent order but include any custom statuses.
    const extra = Array.from(present).filter((s) => !base.includes(s));
    return [...base, ...extra];
  }, [quotes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes
      .filter((x) => (status === "All" ? true : x.status === status))
      .filter((x) => {
        if (!q) return true;
        const hay = [x.id, x.title, x.client, x.contact, x.status].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [quotes, query, status]);

  const followUps = useMemo(() => {
    return quotes
      .filter((q): q is Quote & { nextFollowUpAt: string } => Boolean(q.nextFollowUpAt))
      .filter((q) => q.status !== "Rejected" && q.status !== "Expired")
      .sort((a, b) => new Date(a.nextFollowUpAt).getTime() - new Date(b.nextFollowUpAt).getTime());
  }, [quotes]);

  const totalPipeline = useMemo(() => {
    const accepted = quotes.filter((q) => q.status === "Accepted").length;
    const negotiating = quotes.filter((q) => q.status === "Negotiating").length;
    const pending = quotes.filter((q) => q.status === "Pending Approval").length;
    return { accepted, negotiating, pending };
  }, [quotes]);

  // Drawers
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  // Detail state
  const [detailTab, setDetailTab] = useState("Overview");

  useEffect(() => {
    if (detailOpen) setDetailTab("Overview");
  }, [detailOpen]);

  // Template state
  const [tplTab, setTplTab] = useState("Picker");
  const [tplQuery, setTplQuery] = useState("");
  const [tplActiveId, setTplActiveId] = useState<string | undefined>(undefined);
  const tplActive = useMemo(() => templates.find((t) => t.id === tplActiveId) || null, [templates, tplActiveId]);

  // Template editor draft
  const [tplDraft, setTplDraft] = useState<TemplateDraft | null>(null);
  useEffect(() => {
    if (!templatesOpen) return;
    setTplTab("Picker");
    setTplQuery("");
    setTplActiveId((id) => id || templates[0]?.id);
    setTplDraft(null);
  }, [templatesOpen]);

  // Edit draft
  const [editTab, setEditTab] = useState("Basics");
  const [draft, setDraft] = useState<Quote | null>(null);
  const [baselineSubtotal, setBaselineSubtotal] = useState<number | null>(null);
  const thresholdPct = 0.1;

  useEffect(() => {
    if (!editOpen || !active) return;
    setEditTab("Basics");
    const copy = JSON.parse(JSON.stringify(active)) as Quote;
    setDraft(copy);
    const base = calcTotals(copy.lines, copy.discount, copy.shipping, copy.taxRate).subtotal;
    setBaselineSubtotal(base);
  }, [editOpen, active?.id]);

  const draftTotals = useMemo(() => {
    if (!draft) return { subtotal: 0, tax: 0, total: 0 };
    return calcTotals(draft.lines, draft.discount, draft.shipping, draft.taxRate);
  }, [draft]);

  const sensitive = useMemo(() => {
    if (!draft || !Number.isFinite(Number(baselineSubtotal))) return false;
    const base = Number(baselineSubtotal);
    if (base <= 0) return false;
    return draftTotals.subtotal < base * (1 - thresholdPct);
  }, [draft, baselineSubtotal, draftTotals.subtotal]);

  // Convert drawer
  const [orderStage, setOrderStage] = useState("Draft");
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);

  const updateDraft = (updater: (current: Quote) => Quote) =>
    setDraft((current) => (current ? updater(current) : current));
  const updateTplDraft = (updater: (current: TemplateDraft) => TemplateDraft) =>
    setTplDraft((current) => (current ? updater(current) : current));
  const updateOrderDraft = (updater: (current: OrderDraft) => OrderDraft) =>
    setOrderDraft((current) => (current ? updater(current) : current));

  useEffect(() => {
    if (!convertOpen || !active) return;
    setOrderStage("Draft");
    setOrderDraft({
      orderId: `ORD-${Math.floor(10000 + Math.random() * 89999)}`,
      warehouse: "Main Warehouse",
      shipping: "Standard",
      payment: "EVzone Pay Wallet",
      assignee: "Ops Team",
      dueDate: new Date(Date.now() + 7 * 24 * 3600_000).toISOString().slice(0, 10),
      handoffNote: "",
    });
  }, [convertOpen, active?.id]);

  const openDetail = (id: string) => {
    setActiveId(id);
    setDetailOpen(true);
  };
  const openEdit = (id: string) => {
    setActiveId(id);
    setEditOpen(true);
  };
  const openConvert = (id: string) => {
    setActiveId(id);
    setConvertOpen(true);
  };

  const applyTemplateToDraft = (template: QuoteTemplate | null) => {
    if (!template) return;

    // Apply to existing draft (edit) if open, otherwise apply to active quote immediately
    if (editOpen && draft) {
      updateDraft((d) => ({
        ...d,
        title: d.title || template.name,
        currency: template.currency,
        discount: template.discount,
        shipping: template.shipping,
        taxRate: template.taxRate,
        terms: template.terms,
        lines: JSON.parse(JSON.stringify(template.lines)),
      }));
      pushToast({ title: "Template applied", message: `Applied "${template.name}" to the draft.`, tone: "success" });
      return;
    }

    if (active) {
      setQuotes((prev) =>
        prev.map((q) => {
          if (q.id !== active.id) return q;
          const next = {
            ...q,
            title: q.title || template.name,
            currency: template.currency,
            discount: template.discount,
            shipping: template.shipping,
            taxRate: template.taxRate,
            terms: template.terms,
            lines: JSON.parse(JSON.stringify(template.lines)),
            updatedAt: new Date().toISOString(),
          };
          const totals = calcTotals(next.lines, next.discount, next.shipping, next.taxRate);
          next.totals = totals;
          next.versions = [
            {
              id: makeId("ver"),
              at: new Date().toISOString(),
              actor: "Sales",
              note: `Template applied: ${template.name}`,
              snapshot: {
                title: next.title,
                client: next.client,
                currency: next.currency,
                status: next.status,
                winChance: next.winChance,
                discount: next.discount,
                shipping: next.shipping,
                taxRate: next.taxRate,
                terms: next.terms,
                notes: next.notes,
                lines: JSON.parse(JSON.stringify(next.lines)),
                totals: next.totals,
              },
            },
            ...(next.versions || []),
          ].slice(0, 20);
          return next;
        })
      );
      pushToast({ title: "Template applied", message: `Applied "${template.name}" to ${active.id}.`, tone: "success" });
    }
  };

  const createQuoteFromTemplate = (template: QuoteTemplate) => {
    const id = `QT-${Math.floor(24000 + Math.random() * 800)}`;
    const base: Quote = {
      id,
      title: template.name,
      client: "New Client",
      contact: "client@example",
      currency: template.currency,
      status: "Draft",
      winChance: 50,
      discount: template.discount,
      shipping: template.shipping,
      taxRate: template.taxRate,
      terms: template.terms,
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextFollowUpAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      approvals: { thresholdPct: 0.1, required: false, requests: [] },
      activity: [{ id: makeId("act"), at: new Date().toISOString(), actor: "Sales", text: `Created from template: ${template.name}` }],
      lines: JSON.parse(JSON.stringify(template.lines)),
      convertedOrderId: null,
    };
    base.totals = calcTotals(base.lines, base.discount, base.shipping, base.taxRate);
    base.versions = [
      {
        id: makeId("ver"),
        at: base.createdAt,
        actor: "System",
        note: "Initial version",
        snapshot: {
          title: base.title,
          client: base.client,
          currency: base.currency,
          status: base.status,
          winChance: base.winChance,
          discount: base.discount,
          shipping: base.shipping,
          taxRate: base.taxRate,
          terms: base.terms,
          notes: base.notes,
          lines: JSON.parse(JSON.stringify(base.lines)),
          totals: base.totals,
        },
      },
    ];

    setQuotes((s) => [base, ...s]);
    setTemplatesOpen(false);
    setActiveId(id);
    setEditOpen(true);

    pushToast({ title: "Draft quote created", message: `${id} created from template.`, tone: "success" });
  };

  const saveDraftToQuote = () => {
    if (!draft) return;

    const totals = calcTotals(draft.lines, draft.discount, draft.shipping, draft.taxRate);
    const nowIso = new Date().toISOString();

    const needsApproval = sensitive;

    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id !== draft.id) return q;

        const nextStatus = needsApproval ? "Pending Approval" : draft.status;

        const next = {
          ...q,
          ...draft,
          status: nextStatus,
          totals,
          updatedAt: nowIso,
          approvals: {
            ...q.approvals,
            thresholdPct: q.approvals?.thresholdPct ?? 0.1,
            required: needsApproval ? true : q.approvals?.required || false,
            requests: q.approvals?.requests || [],
          },
          activity: [
            { id: makeId("act"), at: nowIso, actor: "Sales", text: needsApproval ? "Saved changes. Approval required." : "Saved changes." },
            ...(q.activity || []),
          ].slice(0, 60),
        };

        next.versions = [
          {
            id: makeId("ver"),
            at: nowIso,
            actor: "Sales",
            note: needsApproval ? "Sensitive edit detected. Approval required." : "Saved changes",
            snapshot: {
              title: next.title,
              client: next.client,
              currency: next.currency,
              status: next.status,
              winChance: next.winChance,
              discount: next.discount,
              shipping: next.shipping,
              taxRate: next.taxRate,
              terms: next.terms,
              notes: next.notes,
              lines: JSON.parse(JSON.stringify(next.lines)),
              totals: next.totals,
            },
          },
          ...(q.versions || []),
        ].slice(0, 20);

        return next;
      })
    );

    pushToast({
      title: "Saved",
      message: needsApproval ? "Sensitive edit detected. Approval required." : "Quote updated.",
      tone: needsApproval ? "warning" : "success",
      action: needsApproval
        ? {
            label: "Open approvals",
            onClick: () => {
              setEditOpen(false);
              setDetailOpen(true);
              setDetailTab("Approvals");
            },
          }
        : undefined,
    });

    setEditOpen(false);
  };

  const requestApproval = (quoteId: string, reason = "Approval requested") => {
    const nowIso = new Date().toISOString();
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id !== quoteId) return q;
        const req: ApprovalRequest = {
          id: makeId("apr"),
          at: nowIso,
          requester: "Sales",
          approver: "Sales Manager",
          reason,
          status: "Pending",
          decidedAt: null,
        };
        return {
          ...q,
          approvals: {
            thresholdPct: q.approvals?.thresholdPct ?? 0.1,
            required: true,
            requests: [req, ...(q.approvals?.requests || [])],
          },
          activity: [{ id: makeId("act"), at: nowIso, actor: "Sales", text: `Approval requested: ${reason}` }, ...(q.activity || [])].slice(0, 60),
          updatedAt: nowIso,
          status: q.status === "Accepted" ? q.status : "Pending Approval",
        };
      })
    );
    pushToast({ title: "Approval requested", message: "Request sent to approver (demo).", tone: "success" });
  };

  const decideApproval = (quoteId: string, reqId: string, decision: ApprovalDecisionStatus) => {
    const nowIso = new Date().toISOString();
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id !== quoteId) return q;
        const nextReqs = (q.approvals?.requests || []).map((r) =>
          r.id === reqId ? { ...r, status: decision, decidedAt: nowIso } : r
        );
        const anyPending = nextReqs.some((r) => r.status === "Pending");
        const approved = nextReqs.some((r) => r.status === "Approved");

        return {
          ...q,
          approvals: {
            thresholdPct: q.approvals?.thresholdPct ?? 0.1,
            requests: nextReqs,
            required: anyPending ? true : false,
          },
          status: decision === "Approved" ? (q.status === "Pending Approval" ? "Negotiating" : q.status) : q.status,
          activity: [{ id: makeId("act"), at: nowIso, actor: "Sales Manager", text: `Approval ${decision.toLowerCase()}.` }, ...(q.activity || [])].slice(0, 60),
          updatedAt: nowIso,
        };
      })
    );
    pushToast({ title: `Approval ${decision}`, message: "Updated status (demo).", tone: decision === "Approved" ? "success" : "warning" });
  };

  const createOrUpdateTemplateFromDraft = () => {
    if (!tplDraft) return;
    const isExisting = templates.some((t) => t.id === tplDraft.id);
    const next = {
      ...tplDraft,
      id: tplDraft.id || `TPL-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      name: String(tplDraft.name || "Untitled template").trim() || "Untitled template",
      description: String(tplDraft.description || "").trim(),
      currency: tplDraft.currency || "USD",
      discount: Number(tplDraft.discount || 0),
      shipping: Number(tplDraft.shipping || 0),
      taxRate: clamp(Number(tplDraft.taxRate || 0), 0, 0.2),
      terms: String(tplDraft.terms || "").trim(),
      lines: (tplDraft.lines || []).map((l) => ({
        id: l.id || makeId("l"),
        name: String(l.name || "Line").trim() || "Line",
        qty: Number(l.qty || 1),
        unit: Number(l.unit || 0),
      })),
    };

    setTemplates((prev) => {
      if (isExisting) return prev.map((t) => (t.id === next.id ? next : t));
      return [next, ...prev];
    });

    setTplActiveId(next.id);
    setTplTab("Picker");
    setTplDraft(null);
    pushToast({ title: "Template saved", message: next.name, tone: "success" });
  };

  const deleteTemplate = (tplId: string) => {
    const victim = templates.find((t) => t.id === tplId);
    setTemplates((prev) => prev.filter((t) => t.id !== tplId));
    setTplActiveId((id) => (id === tplId ? templates.find((t) => t.id !== tplId)?.id : id));
    pushToast({ title: "Template removed", message: victim?.name || tplId, tone: "default" });
  };

  const markFollowupDone = (quoteId) => {
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id !== quoteId) return q;
        return {
          ...q,
          nextFollowUpAt: new Date(Date.now() + 3 * 24 * 3600_000).toISOString(),
          updatedAt: new Date().toISOString(),
          activity: [{ id: makeId("act"), at: new Date().toISOString(), actor: "Sales", text: "Follow-up completed. Next follow-up scheduled." }, ...(q.activity || [])].slice(0, 60),
        };
      })
    );
    pushToast({ title: "Follow-up updated", message: "Next follow-up scheduled (demo).", tone: "success" });
  };

  const snoozeFollowup = (quoteId, days = 1) => {
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id !== quoteId) return q;
        return {
          ...q,
          nextFollowUpAt: new Date(Date.now() + days * 24 * 3600_000).toISOString(),
          updatedAt: new Date().toISOString(),
          activity: [{ id: makeId("act"), at: new Date().toISOString(), actor: "Sales", text: `Follow-up snoozed by ${days} day(s).` }, ...(q.activity || [])].slice(0, 60),
        };
      })
    );
    pushToast({ title: "Snoozed", message: `Follow-up moved by ${days} day(s).`, tone: "default" });
  };

  const createOrderFromQuote = () => {
    if (!active || !orderDraft) return;
    const nowIso = new Date().toISOString();

    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id !== active.id) return q;
        return {
          ...q,
          convertedOrderId: orderDraft.orderId,
          updatedAt: nowIso,
          activity: [{ id: makeId("act"), at: nowIso, actor: "Ops", text: `Converted to order ${orderDraft.orderId}.` }, ...(q.activity || [])].slice(0, 60),
        };
      })
    );

    setConvertOpen(false);
    pushToast({ title: "Order created", message: `Order ${orderDraft.orderId} created from ${active.id}.`, tone: "success" });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Quotes</div>
                <Badge tone="slate">List</Badge>
                <Badge tone="slate">Detail</Badge>
                <Badge tone="slate">Templates</Badge>
                <Badge tone="slate">Convert</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Track negotiations, follow-ups, approvals and order conversion.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest quotes loaded.", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Wire export to PDF/CSV.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {/* Status chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                  status === s
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                {s}
                <span className={cx("rounded-full px-2 py-0.5 text-[10px]", status === s ? "bg-white dark:bg-slate-900 text-slate-700" : "bg-slate-100 text-slate-700")}>
                  {counts[s] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <GlassCard className="mt-3 p-4">
            <div className="grid gap-2 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-8">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search quote ID, client, status"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>
              <div className="md:col-span-4 flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Results</div>
                  <span className="ml-auto">
                    <Badge tone="slate">{filtered.length}</Badge>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStatus("All");
                    pushToast({ title: "Filters cleared", tone: "default" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* List */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Quote list</div>
                  <Badge tone="slate">Status + win + total</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Click a row then view details</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-3">Quote</div>
                  <div className="col-span-3">Client</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Win</div>
                  <div className="col-span-2">Total</div>
                  <div className="col-span-1">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((q) => {
                    const isActive = q.id === activeId;
                    const due = q.nextFollowUpAt ? humanDue(q.nextFollowUpAt) : "";
                    const dueM = q.nextFollowUpAt ? minsUntil(q.nextFollowUpAt) : null;
                    const dueTone = dueM !== null && dueM <= 0 ? "danger" : dueM !== null && dueM <= 120 ? "orange" : "slate";

                    return (
                      <div
                        key={q.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveId(q.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setActiveId(q.id);
                        }}
                        className={cx(
                          "grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold transition",
                          isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="col-span-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{q.id}</div>
                            {q.convertedOrderId ? <Badge tone="green">Converted</Badge> : null}
                          </div>
                          <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">{q.title}</div>
                        </div>

                        <div className="col-span-3 min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-900">{q.client}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{q.contact}</span>
                            {q.nextFollowUpAt ? <Badge tone={dueTone}>{due}</Badge> : <Badge tone="slate">No follow-up</Badge>}
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                          {q.approvals?.required ? <Badge tone="orange">Approval</Badge> : null}
                        </div>

                        <div className="col-span-1 flex items-center">
                          <Badge tone={winTone(q.winChance)}>{q.winChance}%</Badge>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <div>
                            <div className="text-sm font-black text-slate-900">{fmtMoney(q.totals?.total, q.currency)}</div>
                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Updated {fmtTime(q.updatedAt)}</div>
                          </div>
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(q.id);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950"
                            aria-label="View"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(q.id);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {q.status === "Accepted" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openConvert(q.id);
                              }}
                              className="grid h-9 w-9 place-items-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-50"
                              aria-label="Convert"
                              title="Convert accepted quote"
                            >
                              <Package className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        title="No quotes found"
                        message="Try changing filters, or create a new quote from templates."
                        action={{ label: "Open templates", onClick: () => setTemplatesOpen(true) }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Follow-up reminders</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Sorted by next follow-up time</div>
                </div>
                <Badge tone="slate">{followUps.length}</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {followUps.slice(0, 7).map((q) => {
                  const m = minsUntil(q.nextFollowUpAt);
                  const tone = m !== null && m <= 0 ? "danger" : m !== null && m <= 120 ? "orange" : "slate";

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setActiveId(q.id);
                        openDetail(q.id);
                      }}
                      className={cx(
                        "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                        tone === "danger" ? "border-rose-200" : tone === "orange" ? "border-orange-200" : "border-slate-200/70"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cx(
                            "grid h-11 w-11 place-items-center rounded-3xl",
                            tone === "danger" ? "bg-rose-50 text-rose-700" : tone === "orange" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700"
                          )}
                        >
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{q.client}</div>
                            <span className="ml-auto"><Badge tone={tone}>{humanDue(q.nextFollowUpAt)}</Badge></span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{q.id} · {q.status} · {q.winChance}% win</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markFollowupDone(q.id);
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold"
                              style={{ color: "#047857" }}
                            >
                              <Check className="h-4 w-4" />
                              Done
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                snoozeFollowup(q.id, 1);
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Calendar className="h-4 w-4" />
                              Snooze 1d
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                pushToast({ title: "Message", message: "Open messaging composer (demo).", tone: "default" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Message
                            </button>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  );
                })}

                {followUps.length === 0 ? (
                  <EmptyState title="No follow-ups" message="Schedule follow-ups on quotes to see reminders here." />
                ) : null}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Pipeline snapshot</div>
                  <span className="ml-auto"><Badge tone="slate">Today</Badge></span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                    <div className="text-[11px] font-extrabold text-slate-600">Negotiating</div>
                    <div className="mt-1 text-lg font-black text-slate-900">{totalPipeline.negotiating}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                    <div className="text-[11px] font-extrabold text-slate-600">Accepted</div>
                    <div className="mt-1 text-lg font-black text-slate-900">{totalPipeline.accepted}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                    <div className="text-[11px] font-extrabold text-slate-600">Pending approval</div>
                    <div className="mt-1 text-lg font-black text-slate-900">{totalPipeline.pending}</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Quote Detail Drawer */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={active ? `Quote · ${active.id}` : "Quote"}
        subtitle={active ? `${active.status} · ${active.client} · Updated ${fmtTime(active.updatedAt)}` : "Select a quote"}
        right={
          active ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  setEditOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>

              <button
                type="button"
                onClick={() => setTemplatesOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <Layers className="h-4 w-4" />
                Templates
              </button>

              {active.status === "Accepted" ? (
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    setConvertOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.orange }}
                >
                  <Package className="h-4 w-4" />
                  Convert
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {!active ? (
          <EmptyState title="No quote selected" message="Pick a quote from the list first." />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {["Overview", "Versions", "Approvals", "Activity"].map((t) => (
                <SegTab key={t} label={t} active={detailTab === t} onClick={() => setDetailTab(t)} />
              ))}
              <span className="ml-auto flex items-center gap-2">
                <Badge tone={statusTone(active.status)}>{active.status}</Badge>
                <Badge tone={winTone(active.winChance)}>{active.winChance}% win</Badge>
              </span>
            </div>

            <GlassCard className="p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={detailTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.16 }}
                >
                  {detailTab === "Overview" ? (
                    <div className="grid gap-3">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-black text-slate-900">{active.title}</div>
                              {active.approvals?.required ? <Badge tone="orange">Approval required</Badge> : null}
                              {active.convertedOrderId ? <Badge tone="green">Order {active.convertedOrderId}</Badge> : null}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Client: {active.client} · Contact: {active.contact}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  safeCopy(active.id);
                                  pushToast({ title: "Copied", message: "Quote ID copied.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                                Copy ID
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  safeCopy(JSON.stringify(active, null, 2));
                                  pushToast({ title: "Copied", message: "Quote JSON copied.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                                Copy JSON
                              </button>
                              <button
                                type="button"
                                onClick={() => pushToast({ title: "Email", message: "Open email composer (demo).", tone: "default" })}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Mail className="h-4 w-4" />
                                Email
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-extrabold text-slate-600">Total</div>
                            <div className="mt-1 text-xl font-black text-slate-900">{fmtMoney(active.totals?.total, active.currency)}</div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">Subtotal {fmtMoney(active.totals?.subtotal, active.currency)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Line items</div>
                          <span className="ml-auto"><Badge tone="slate">{active.lines.length}</Badge></span>
                        </div>
                        <div className="mt-3">
                          <LineItemsTable lines={active.lines} currency={active.currency} readOnly onChange={() => {}} />
                        </div>
                      </div>

                      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-black text-orange-900">Terms</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">{active.terms || "No terms set."}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  safeCopy(active.terms || "");
                                  pushToast({ title: "Copied", message: "Terms copied.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                              >
                                <Copy className="h-4 w-4" />
                                Copy terms
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailOpen(false);
                                  setEditOpen(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.orange }}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit terms
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {detailTab === "Versions" ? (
                    <div className="space-y-3">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Versions timeline</div>
                          <span className="ml-auto"><Badge tone="slate">{(active.versions || []).length}</Badge></span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {(active.versions || []).map((v, idx) => (
                            <div key={v.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                              <div className="flex items-center gap-2">
                                <Badge tone="slate">v{((active.versions || []).length - idx).toString()}</Badge>
                                <div className="text-xs font-extrabold text-slate-700">{fmtTime(v.at)}</div>
                                <span className="ml-auto"><Badge tone="slate">{v.actor}</Badge></span>
                              </div>
                              <div className="mt-2 text-sm font-black text-slate-900 truncate">{v.snapshot?.title}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500 truncate">{v.note}</div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    safeCopy(JSON.stringify(v.snapshot, null, 2));
                                    pushToast({ title: "Copied", message: "Version snapshot copied.", tone: "default" });
                                  }}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy snapshot
                                </button>
                                <button
                                  type="button"
                                  onClick={() => pushToast({ title: "Rollback", message: "Wire rollback to API (demo).", tone: "default" })}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-800"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  Rollback
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {detailTab === "Approvals" ? (
                    <div className="space-y-3">
                      {active.approvals?.required ? (
                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-black text-orange-900">Approval required</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">This quote has a sensitive edit or policy trigger. Request approval to proceed.</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => requestApproval(active.id, "Sensitive edit detected")}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.orange }}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              Request
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black text-slate-900">Approvals</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Request approval when needed. Status history is tracked.</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => requestApproval(active.id, "Manual approval request")}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              Request approval
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Status history</div>
                          <span className="ml-auto"><Badge tone="slate">{(active.approvals?.requests || []).length}</Badge></span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {(active.approvals?.requests || []).length === 0 ? (
                            <EmptyState title="No approvals yet" message="Requests and decisions will appear here." />
                          ) : (
                            (active.approvals?.requests || []).map((r) => (
                              <div key={r.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                <div className="flex items-center gap-2">
                                  <Badge tone={r.status === "Approved" ? "green" : r.status === "Rejected" ? "danger" : "orange"}>{r.status}</Badge>
                                  <div className="text-xs font-extrabold text-slate-700">Requested {fmtTime(r.at)}</div>
                                  <span className="ml-auto"><Badge tone="slate">Approver: {r.approver}</Badge></span>
                                </div>
                                <div className="mt-2 text-xs font-semibold text-slate-600">Reason: {r.reason}</div>

                                {r.status === "Pending" ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => decideApproval(active.id, r.id, "Approved")}
                                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                      style={{ background: TOKENS.green }}
                                    >
                                      <CheckCheck className="h-4 w-4" />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => decideApproval(active.id, r.id, "Rejected")}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                                    >
                                      <X className="h-4 w-4" />
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-2 text-[11px] font-semibold text-slate-500">Decision time: {r.decidedAt ? fmtTime(r.decidedAt) : "-"}</div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {detailTab === "Activity" ? (
                    <div className="space-y-2">
                      {(active.activity || []).map((a) => (
                        <div key={a.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Badge tone="slate">{a.actor}</Badge>
                            <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(a.at)}</span>
                          </div>
                          <div className="mt-2 text-sm font-black text-slate-900">{a.text}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </GlassCard>
          </div>
        )}
      </Drawer>

      {/* Edit Drawer (premium orange + black) */}
      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={draft ? `Edit · ${draft.id}` : "Edit quote"}
        subtitle={draft ? "Premium edit drawer with sensitive edit detection." : "Select a quote"}
        tone="orangeBlack"
        right={
          draft ? (
            <>
              {sensitive ? <Badge tone="orange">Sensitive edit</Badge> : <Badge tone="black">Edit</Badge>}
              <Badge tone="black">Threshold 10%</Badge>
            </>
          ) : null
        }
      >
        {!draft ? (
          <EmptyState title="No quote selected" message="Choose a quote from the list first." />
        ) : (
          <div className="space-y-3">
            {sensitive ? (
              <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-orange-900">Sensitive edit detected</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">
                      Draft subtotal reduced by more than 10%. Approval required.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestApproval(draft.id, "Sensitive subtotal reduction")}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Request
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {["Basics", "Line items", "Pricing", "Terms", "Approvals"].map((t) => (
                <SegTab key={t} label={t} active={editTab === t} onClick={() => setEditTab(t)} tone="orange" />
              ))}
              <span className="ml-auto flex items-center gap-2">
                <Badge tone={statusTone(draft.status)}>{draft.status}</Badge>
                <Badge tone={winTone(draft.winChance)}>{draft.winChance}% win</Badge>
              </span>
            </div>

            <GlassCard className="p-4">
              <AnimatePresence mode="wait">
                <motion.div key={editTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.16 }}>
                  {editTab === "Basics" ? (
                    <div className="grid gap-3">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Title</div>
                        <input
                          value={draft.title}
                          onChange={(e) => updateDraft((s) => ({ ...s, title: e.target.value }))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Client</div>
                          <input
                            value={draft.client}
                            onChange={(e) => updateDraft((s) => ({ ...s, client: e.target.value }))}
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Contact</div>
                          <input
                            value={draft.contact}
                            onChange={(e) => updateDraft((s) => ({ ...s, contact: e.target.value }))}
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Status</div>
                          <div className="relative mt-2">
                            <select
                              value={draft.status}
                              onChange={(e) => updateDraft((s) => ({ ...s, status: e.target.value }))}
                              className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                            >
                              {["Draft", "Sent", "Negotiating", "Accepted", "Rejected", "Expired", "Pending Approval"].map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Win chance (%)</div>
                          <input
                            value={String(draft.winChance)}
                            onChange={(e) => updateDraft((s) => ({ ...s, winChance: clamp(Number(e.target.value), 0, 99) }))}
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                        </div>

                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Next follow-up</div>
                          <input
                            type="date"
                            value={draft.nextFollowUpAt ? new Date(draft.nextFollowUpAt).toISOString().slice(0, 10) : ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateDraft((s) => ({ ...s, nextFollowUpAt: v ? new Date(v + "T09:00:00").toISOString() : null }));
                            }}
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Templates</div>
                          <span className="ml-auto"><Badge tone="slate">System</Badge></span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-500">Apply a template to replace line items and terms.</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setTemplatesOpen(true)}
                            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.orange }}
                          >
                            <Layers className="h-4 w-4" />
                            Apply template
                          </button>
                          <button
                            type="button"
                            onClick={() => pushToast({ title: "Template", message: "You can also create templates in Templates drawer.", tone: "default" })}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Sparkles className="h-4 w-4" />
                            Tips
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {editTab === "Line items" ? (
                    <div className="space-y-3">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Edit line items</div>
                          <span className="ml-auto"><Badge tone="slate">{draft.currency}</Badge></span>
                        </div>
                        <div className="mt-3">
                          <LineItemsTable
                            lines={draft.lines}
                            currency={draft.currency}
                            onChange={(next) => updateDraft((s) => ({ ...s, lines: next }))}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {editTab === "Pricing" ? (
                    <div className="grid gap-3">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Pricing</div>
                          <span className="ml-auto"><Badge tone="slate">{draft.currency}</Badge></span>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Discount</div>
                            <input
                              value={String(draft.discount)}
                              onChange={(e) => updateDraft((s) => ({ ...s, discount: Number(e.target.value) }))}
                              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                            />
                          </div>
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Shipping</div>
                            <input
                              value={String(draft.shipping)}
                              onChange={(e) => updateDraft((s) => ({ ...s, shipping: Number(e.target.value) }))}
                              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                            />
                          </div>
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Tax rate</div>
                            <input
                              value={String(draft.taxRate)}
                              onChange={(e) => updateDraft((s) => ({ ...s, taxRate: clamp(Number(e.target.value), 0, 0.2) }))}
                              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-black text-slate-900">Totals</div>
                            <Badge tone={sensitive ? "orange" : "slate"}>{draft.currency}</Badge>
                          </div>
                          <div className="mt-3 space-y-2 text-xs font-semibold text-slate-700">
                            <Row label="Subtotal" value={fmtMoney(draftTotals.subtotal, draft.currency)} />
                            <Row label="Tax" value={fmtMoney(draftTotals.tax, draft.currency)} />
                            <Row label="Shipping" value={fmtMoney(Number(draft.shipping || 0), draft.currency)} />
                            <div className="h-px bg-slate-200/70" />
                            <Row label="Total" value={fmtMoney(draftTotals.total, draft.currency)} strong />
                            <div className="mt-2 text-[11px] font-semibold text-slate-500">Baseline subtotal: {fmtMoney(baselineSubtotal, draft.currency)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {editTab === "Terms" ? (
                    <div className="grid gap-3">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Terms and notes</div>
                          <span className="ml-auto"><Badge tone="slate">Policy</Badge></span>
                        </div>
                        <div className="mt-3 grid gap-3">
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Terms</div>
                            <textarea
                              value={draft.terms || ""}
                              onChange={(e) => updateDraft((s) => ({ ...s, terms: e.target.value }))}
                              rows={5}
                              className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                            />
                          </div>
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Internal notes</div>
                            <textarea
                              value={draft.notes || ""}
                              onChange={(e) => updateDraft((s) => ({ ...s, notes: e.target.value }))}
                              rows={4}
                              className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {editTab === "Approvals" ? (
                    <div className="space-y-3">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Approvals</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Request approval and track status.</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => requestApproval(draft.id, "Approval requested from edit drawer")}
                            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.orange }}
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Request
                          </button>
                        </div>
                        <div className="mt-3 text-xs font-semibold text-slate-600">Current: {draft.approvals?.required ? "Required" : "Not required"}</div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="text-sm font-black text-slate-900">What triggers approval</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                          <li>Subtotal reduction above 10% (sensitive edit detection)</li>
                          <li>Manual approval request by Sales</li>
                          <li>Policy rules (optional)</li>
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </GlassCard>

            <div className="sticky bottom-0 -mx-4 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={saveDraftToQuote}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.orange }}
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>

                <button
                  type="button"
                  onClick={() => {
                    pushToast({ title: "Sent", message: "Quote sent to client (demo).", tone: "success" });
                    updateDraft((s) => ({ ...s, status: "Sent", updatedAt: new Date().toISOString() }));
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Mail className="h-4 w-4" />
                  Send quote
                </button>

                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Templates Drawer */}
      <Drawer
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title="Quote templates"
        subtitle="Template picker, template editor, and apply template."
        right={
          <>
            <button
              type="button"
              onClick={() => {
                setTplTab("Editor");
                setTplDraft({ id: "", name: "", description: "", currency: "USD", discount: 0, shipping: 0, taxRate: 0.02, terms: "", lines: [] });
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              New template
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SegTab label="Picker" active={tplTab === "Picker"} onClick={() => setTplTab("Picker")} />
            <SegTab label="Editor" active={tplTab === "Editor"} onClick={() => {
              setTplTab("Editor");
              if (tplActive) setTplDraft(JSON.parse(JSON.stringify(tplActive)) as TemplateDraft);
            }} />
            <span className="ml-auto"><Badge tone="slate">{templates.length} templates</Badge></span>
          </div>

          {tplTab === "Picker" ? (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={tplQuery}
                    onChange={(e) => setTplQuery(e.target.value)}
                    placeholder="Search templates"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {templates
                    .filter((t) => {
                      const q = tplQuery.trim().toLowerCase();
                      if (!q) return true;
                      return [t.id, t.name, t.description].join(" ").toLowerCase().includes(q);
                    })
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTplActiveId(t.id)}
                        className={cx(
                          "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                          t.id === tplActiveId ? "border-emerald-200" : "border-slate-200/70"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-emerald-50 text-emerald-700">
                            <Layers className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-slate-900 truncate">{t.name}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500 line-clamp-2">{t.description}</div>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge tone="slate">{t.currency}</Badge>
                              <Badge tone="slate">{t.lines.length} lines</Badge>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="lg:col-span-7">
                {!tplActive ? (
                  <EmptyState title="Select a template" message="Choose a template to preview and apply." />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">{tplActive.name}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{tplActive.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTplTab("Editor");
                              setTplDraft(JSON.parse(JSON.stringify(tplActive)) as TemplateDraft);
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTemplate(tplActive.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div className="text-[11px] font-extrabold text-slate-600">Discount</div>
                          <div className="mt-1 text-lg font-black text-slate-900">{fmtMoney(tplActive.discount, tplActive.currency)}</div>
                        </div>
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div className="text-[11px] font-extrabold text-slate-600">Shipping</div>
                          <div className="mt-1 text-lg font-black text-slate-900">{fmtMoney(tplActive.shipping, tplActive.currency)}</div>
                        </div>
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div className="text-[11px] font-extrabold text-slate-600">Tax rate</div>
                          <div className="mt-1 text-lg font-black text-slate-900">{Math.round(tplActive.taxRate * 100)}%</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm font-black text-slate-900">Preview</div>
                        <div className="mt-2">
                          <LineItemsTable lines={tplActive.lines} currency={tplActive.currency} readOnly onChange={() => {}} />
                        </div>
                      </div>

                      <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Default terms</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">{tplActive.terms || "No terms."}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applyTemplateToDraft(tplActive)}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Check className="h-4 w-4" />
                          Apply to selected quote
                        </button>
                        <button
                          type="button"
                          onClick={() => createQuoteFromTemplate(tplActive)}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          <Plus className="h-4 w-4" />
                          Use for new quote
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(JSON.stringify(tplActive, null, 2));
                            pushToast({ title: "Copied", message: "Template JSON copied.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy JSON
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {tplTab === "Editor" ? (
            <div className="space-y-3">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Template editor</div>
                  <span className="ml-auto"><Badge tone="slate">Create or update</Badge></span>
                </div>

                {!tplDraft ? (
                  <div className="mt-3">
                    <EmptyState title="No template loaded" message="Pick a template, or create a new template." />
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Name</div>
                        <input
                          value={tplDraft.name}
                          onChange={(e) => updateTplDraft((s) => ({ ...s, name: e.target.value }))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Currency</div>
                        <div className="relative mt-2">
                          <select
                            value={tplDraft.currency}
                            onChange={(e) => updateTplDraft((s) => ({ ...s, currency: e.target.value }))}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["USD", "CNY", "EUR", "UGX"].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Description</div>
                      <input
                        value={tplDraft.description}
                        onChange={(e) => updateTplDraft((s) => ({ ...s, description: e.target.value }))}
                        className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Discount</div>
                        <input
                          value={String(tplDraft.discount)}
                          onChange={(e) => updateTplDraft((s) => ({ ...s, discount: Number(e.target.value) }))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Shipping</div>
                        <input
                          value={String(tplDraft.shipping)}
                          onChange={(e) => updateTplDraft((s) => ({ ...s, shipping: Number(e.target.value) }))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Tax rate</div>
                        <input
                          value={String(tplDraft.taxRate)}
                          onChange={(e) => updateTplDraft((s) => ({ ...s, taxRate: clamp(Number(e.target.value), 0, 0.2) }))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Terms</div>
                      <textarea
                        value={tplDraft.terms}
                        onChange={(e) => updateTplDraft((s) => ({ ...s, terms: e.target.value }))}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <div className="text-sm font-black text-slate-900">Line items</div>
                      <div className="mt-2">
                        <LineItemsTable
                          lines={tplDraft.lines}
                          currency={tplDraft.currency}
                          onChange={(next) => updateTplDraft((s) => ({ ...s, lines: next }))}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={createOrUpdateTemplateFromDraft}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Save className="h-4 w-4" />
                        Save template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTplDraft(null);
                          setTplTab("Picker");
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Drawer>

      {/* Convert drawer */}
      <Drawer
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title={active ? `Convert · ${active.id}` : "Convert"}
        subtitle="Convert accepted quote to order creation pipeline."
        right={
          active ? (
            <Badge tone={active.status === "Accepted" ? "green" : "orange"}>{active.status}</Badge>
          ) : null
        }
      >
        {!active ? (
          <EmptyState title="No quote selected" message="Select an accepted quote to convert." />
        ) : active.status !== "Accepted" ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Convert is available only for accepted quotes</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Mark the quote as Accepted first, then convert.</div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setConvertOpen(false);
                setEditOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.orange }}
            >
              <Pencil className="h-4 w-4" />
              Open editor
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Order creation</div>
                <span className="ml-auto"><Badge tone="slate">Handoff</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Build an order from the quote and hand off to ops.</div>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <OrderPipeline stage={orderStage} setStage={setOrderStage} />

                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Handoff</div>
                    <span className="ml-auto"><Badge tone="slate">Ops</Badge></span>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Assign to</div>
                        <div className="relative mt-2">
                          <select
                            value={orderDraft?.assignee || "Ops Team"}
                            onChange={(e) => updateOrderDraft((s) => ({ ...s, assignee: e.target.value }))}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["Ops Team", "Fulfillment Lead", "Warehouse Team"].map((x) => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Due date</div>
                        <input
                          type="date"
                          value={orderDraft?.dueDate || ""}
                          onChange={(e) => updateOrderDraft((s) => ({ ...s, dueDate: e.target.value }))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Handoff note</div>
                      <textarea
                        value={orderDraft?.handoffNote || ""}
                        onChange={(e) => updateOrderDraft((s) => ({ ...s, handoffNote: e.target.value }))}
                        rows={3}
                        placeholder="Add notes for ops team"
                        className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Order details</div>
                    <span className="ml-auto"><Badge tone="slate">{active.currency}</Badge></span>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Order ID</div>
                        <input
                          value={orderDraft?.orderId || ""}
                          onChange={(e) => updateOrderDraft((s) => ({ ...s, orderId: e.target.value }))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Warehouse</div>
                        <div className="relative mt-2">
                          <select
                            value={orderDraft?.warehouse || "Main Warehouse"}
                            onChange={(e) => updateOrderDraft((s) => ({ ...s, warehouse: e.target.value }))}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["Main Warehouse", "Kampala Hub", "Nairobi Hub"].map((x) => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Shipping method</div>
                        <div className="relative mt-2">
                          <select
                            value={orderDraft?.shipping || "Standard"}
                            onChange={(e) => updateOrderDraft((s) => ({ ...s, shipping: e.target.value }))}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["Standard", "Express", "Delivery to preferred warehouse"].map((x) => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Payment method</div>
                        <div className="relative mt-2">
                          <select
                            value={orderDraft?.payment || "EVzone Pay Wallet"}
                            onChange={(e) => updateOrderDraft((s) => ({ ...s, payment: e.target.value }))}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["EVzone Pay Wallet", "Corporate Pay", "Bank Transfer"].map((x) => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-slate-900">Order summary</div>
                        <Badge tone="slate">From quote</Badge>
                      </div>
                      <div className="mt-3 space-y-2 text-xs font-semibold text-slate-700">
                        <Row label="Quote" value={active.id} />
                        <Row label="Client" value={active.client} />
                        <Row label="Total" value={fmtMoney(active.totals?.total, active.currency)} strong />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={createOrderFromQuote}
                      className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      Create order
                    </button>

                    <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-orange-900">Handoff checklist</div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                            <li>Confirm warehouse allocation</li>
                            <li>Confirm shipping method</li>
                            <li>Confirm payment rail</li>
                            <li>Assign to ops team</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function Row({ label, value, strong = false }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className={cx("text-xs", strong ? "font-black text-slate-900" : "font-semibold text-slate-700")}>{value}</div>
    </div>
  );
}
