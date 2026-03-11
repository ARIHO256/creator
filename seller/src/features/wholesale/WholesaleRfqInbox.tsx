import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  BarChart3,
  CheckCheck,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  Globe,
  Info,
  MessageCircle,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from "lucide-react";

/**
 * Wholesale RFQ Inbox + RFQ Detail (Supplier-safe)
 *
 * Implements:
 * 1) Draft Quote table columns: Item Cost (qty×unit cost), Item Price (qty×unit price), Margin %, and Subtotals row.
 * 2) Signals format: "{BuyerType} - {Origin} - {PaymentRail}" + other signals.
 * 3) KPI cards row: Open RFQs, Urgent, Avg score, Approvals.
 *
 * Bug fix:
 * - Imports RefreshCw to prevent ReferenceError.
 * - Replaces setState-in-render pattern with useEffect.
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

type Rfq = {
  id: string;
  title: string;
  status: string;
  urgency: string;
  createdAt: string;
  dueAt: string;
  buyerType: string;
  origin: string;
  paymentRail: string;
  approvalRequired: boolean;
  attachments: number;
  destination: string;
  category: string;
  notes: string;
  score?: number;
  buyerName?: string;
  competitorPressure?: string;
  paymentRisk?: string;
  marginPotential?: number;
};

type DraftLine = {
  id: string;
  sku: string;
  name: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
  leadDays: number;
};

type DraftLineAmounts = Pick<DraftLine, "qty" | "unitCost" | "unitPrice">;

type DraftQuote = {
  id: string;
  rfqId: string;
  currency: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  lines: DraftLine[];
};

type DraftsByRfqId = Record<string, DraftQuote>;
type BadgeTone = "green" | "orange" | "danger" | "slate";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtMoney(amount: number | string | null | undefined, currency = "USD") {
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

function fmtNum(n: number | string) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return (Math.round(v * 100) / 100).toFixed(2);
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function scoreTone(score: number) {
  const s = Number(score || 0);
  if (s >= 80) return "green";
  if (s >= 60) return "orange";
  return "danger";
}

function ScorePill({ score }: { score: number }) {
  const s = clamp(Number(score || 0), 0, 100);
  return <Badge tone={scoreTone(s)}>{s}</Badge>;
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

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
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

function Drawer({
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

function SegTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

// -------------------- Data + helpers --------------------

function seedRFQs(): Rfq[] {
  const now = Date.now();
  const agoH = (h: number) => new Date(now - h * 3600_000).toISOString();
  const inH = (h: number) => new Date(now + h * 3600_000).toISOString();

  const rfqs = [
    {
      id: "RFQ-4101",
      title: "Office EV chargers + installation",
      status: "Open",
      urgency: "Urgent",
      createdAt: agoH(2.1),
      dueAt: inH(8),
      buyerType: "Organization",
      origin: "Retail",
      paymentRail: "CorporatePay",
      approvalRequired: true,
      attachments: 2,
      destination: "Kampala, UG",
      category: "EV chargers",
      notes: "Include OCPP and commissioning.",
    },
    {
      id: "RFQ-4100",
      title: "Bulk e-bike batteries 48V 20Ah",
      status: "Open",
      urgency: "Normal",
      createdAt: agoH(6.2),
      dueAt: inH(24),
      buyerType: "Organization",
      origin: "Wholesale",
      paymentRail: "CorporatePay",
      approvalRequired: false,
      attachments: 1,
      destination: "Nairobi, KE",
      category: "Batteries",
      notes: "Prefer Grade A cells and BMS.",
    },
    {
      id: "RFQ-4099",
      title: "Type 2 cables MOQ inquiry",
      status: "Open",
      urgency: "Normal",
      createdAt: agoH(16),
      dueAt: inH(48),
      buyerType: "Personal",
      origin: "Wholesale",
      paymentRail: "Standard Checkout",
      approvalRequired: false,
      attachments: 0,
      destination: "Entebbe, UG",
      category: "Accessories",
      notes: "Need best tier pricing.",
    },
  ];

  // Simple scoring so Avg score card works
  return rfqs.map((r) => {
    const base = 55;
    const urgencyBoost = r.urgency === "Urgent" ? 18 : 6;
    const approvalPenalty = r.approvalRequired ? -6 : 0;
    const railBoost = r.paymentRail === "CorporatePay" ? 6 : 0;
    const score = clamp(base + urgencyBoost + approvalPenalty + railBoost, 0, 100);
    return { ...r, score };
  });
}

function makeDraftFromRfq(rfq: Rfq): DraftQuote {
  const currency = "USD";

  const lines = [
    {
      id: makeId("ln"),
      sku: "ITEM-001",
      name: rfq.category === "Batteries" ? "Battery Pack 48V 20Ah" : "7kW Wallbox Charger",
      qty: rfq.category === "Batteries" ? 120 : 10,
      unitCost: rfq.category === "Batteries" ? 185 : 420,
      unitPrice: rfq.category === "Batteries" ? 248 : 620,
      leadDays: rfq.origin === "Wholesale" ? 28 : 14,
    },
    {
      id: makeId("ln"),
      sku: "ITEM-002",
      name: rfq.category === "EV chargers" ? "Installation + commissioning" : "Packaging + docs",
      qty: rfq.category === "EV chargers" ? 10 : 1,
      unitCost: rfq.category === "EV chargers" ? 160 : 260,
      unitPrice: rfq.category === "EV chargers" ? 260 : 420,
      leadDays: rfq.origin === "Wholesale" ? 7 : 5,
    },
  ].slice(0, rfq.category === "Accessories" ? 1 : 2);

  return {
    id: makeId("Q").replace("Q_", "Q-"),
    rfqId: rfq.id,
    currency,
    status: "Draft",
    createdAt: new Date().toISOString(),
    sentAt: null,
    lines,
  };
}

function lineTotals(line: DraftLineAmounts) {
  const qty = Number(line.qty || 0);
  const unitCost = Number(line.unitCost || 0);
  const unitPrice = Number(line.unitPrice || 0);
  const itemCost = qty * unitCost;
  const itemPrice = qty * unitPrice;
  const marginPct = itemPrice > 0 ? ((itemPrice - itemCost) / itemPrice) * 100 : 0;
  return { itemCost, itemPrice, marginPct };
}

function sumTotals(lines: DraftLineAmounts[]) {
  const totals = lines.reduce(
    (acc, l) => {
      const t = lineTotals(l);
      acc.cost += t.itemCost;
      acc.price += t.itemPrice;
      return acc;
    },
    { cost: 0, price: 0 }
  );
  const marginPct = totals.price > 0 ? ((totals.price - totals.cost) / totals.price) * 100 : 0;
  return { ...totals, marginPct };
}

function runSelfTests() {
  try {
    const t1 = lineTotals({ qty: 2, unitCost: 10, unitPrice: 25 });
    console.assert(t1.itemCost === 20, "itemCost should be qty×unitCost");
    console.assert(t1.itemPrice === 50, "itemPrice should be qty×unitPrice");
    console.assert(Math.round(t1.marginPct) === 60, "margin% should be (price-cost)/price");

    const s = sumTotals([
      { qty: 2, unitCost: 10, unitPrice: 25 },
      { qty: 1, unitCost: 5, unitPrice: 10 },
    ]);
    console.assert(s.cost === 25, "subtotal cost should sum item costs");
    console.assert(s.price === 60, "subtotal price should sum item prices");
    console.assert(Math.round(s.marginPct) === 58, "overall margin% should be correct");

    return true;
  } catch (e) {
    console.error("Self-tests failed", e);
    return false;
  }
}

// -------------------- UI --------------------

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: "slate" | "orange" | "green";
}) {
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
        <div>
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function SignalBadges({ rfq }: { rfq: Rfq }) {
  // Required signal format first
  const triple = `${rfq.buyerType} - ${rfq.origin} - ${rfq.paymentRail}`;
  const tripleTone = rfq.paymentRail === "CorporatePay" ? "orange" : "slate";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={tripleTone}>{triple}</Badge>
      {rfq.approvalRequired ? <Badge tone="orange">Approval required</Badge> : null}
      {rfq.urgency === "Urgent" ? <Badge tone="danger">Urgent</Badge> : null}
      {rfq.attachments > 0 ? <Badge tone="slate">{rfq.attachments} attachment(s)</Badge> : null}
    </div>
  );
}

function RfqTable({
  rfqs,
  draftsByRfqId,
  onDetails,
  onAutoDraft,
}: {
  rfqs: Rfq[];
  draftsByRfqId: DraftsByRfqId;
  onDetails: (id: string) => void;
  onAutoDraft: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
      <div className="min-w-[1100px]">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
          <div className="col-span-4">RFQ</div>
          <div className="col-span-4">Signals</div>
          <div className="col-span-2">Due</div>
          <div className="col-span-1">Score</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-200/70">
          {rfqs.map((rfq) => {
            const urgentBg = rfq.urgency === "Urgent" ? "bg-rose-50/40" : "bg-white dark:bg-slate-900/50";
            const hasDraft = !!draftsByRfqId[rfq.id];

            return (
              <div key={rfq.id} className={cx("grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold", urgentBg)}>
                <div className="col-span-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-900">{rfq.title}</div>
                    <Badge tone="slate">{rfq.status}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> {rfq.id}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> {rfq.destination}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">
                    Buyer: <span className="font-extrabold text-slate-800">{rfq.buyerName}</span>
                  </div>
                </div>

                <div className="col-span-4 flex flex-col justify-center">
                  <SignalBadges rfq={rfq} />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={hasDraft ? "green" : "slate"}>{hasDraft ? "Draft quote exists" : "No draft yet"}</Badge>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Percent className="h-3.5 w-3.5" /> Margin potential {rfq.marginPotential}%
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Timer className="h-3.5 w-3.5" /> Payment risk {rfq.paymentRisk}
                    </span>
                  </div>
                </div>

                <div className="col-span-2 flex items-center">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">{fmtTime(rfq.dueAt)}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Created {fmtTime(rfq.createdAt)}</div>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <ScorePill score={rfq.score ?? 0} />
                </div>

                <div className="col-span-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onAutoDraft(rfq.id)}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                    title="Create or open a draft quote"
                  >
                    <Sparkles className="h-4 w-4" />
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => onDetails(rfq.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
                    title="View RFQ details"
                  >
                    <FileText className="h-4 w-4" />
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DraftQuoteTable({ draft, onUpdateLine }: { draft: DraftQuote; onUpdateLine: (idx: number, patch: Partial<DraftLine>) => void }) {
  const currency = draft.currency || "USD";
  const totals = sumTotals(draft.lines || []);

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-700" />
          <div className="text-sm font-black text-slate-900">Draft quote</div>
          <span className="ml-auto">
            <Badge tone="slate">{currency}</Badge>
          </span>
        </div>
        <div className="mt-1 text-xs font-semibold text-slate-500">Includes item totals and a subtotal row.</div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
        <div className="min-w-[1200px]">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
            <div className="col-span-3">Item</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">Unit cost</div>
            <div className="col-span-2">Item cost</div>
            <div className="col-span-1">Unit price</div>
            <div className="col-span-2">Item price</div>
            <div className="col-span-1">Margin %</div>
            <div className="col-span-1">Lead days</div>
          </div>

          <div className="divide-y divide-slate-200/70">
            {(draft.lines || []).map((l, idx) => {
              const t = lineTotals(l);
              const m = Math.round(t.marginPct * 10) / 10;
              const mt = m >= 25 ? "green" : m >= 12 ? "orange" : "danger";

              return (
                <div key={l.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                  <div className="col-span-3 min-w-0">
                    <div className="truncate text-sm font-black text-slate-900">{l.name}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{l.sku}</div>
                  </div>
                  <div className="col-span-1">
                    <input
                      value={String(l.qty)}
                      onChange={(e) => onUpdateLine(idx, { qty: Number(e.target.value) })}
                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-2 text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      value={String(l.unitCost)}
                      onChange={(e) => onUpdateLine(idx, { unitCost: Number(e.target.value) })}
                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-2 text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="col-span-2 flex items-center font-black text-slate-900">{fmtMoney(t.itemCost, currency)}</div>
                  <div className="col-span-1">
                    <input
                      value={String(l.unitPrice)}
                      onChange={(e) => onUpdateLine(idx, { unitPrice: Number(e.target.value) })}
                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-2 text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="col-span-2 flex items-center font-black text-slate-900">{fmtMoney(t.itemPrice, currency)}</div>
                  <div className="col-span-1 flex items-center">
                    <Badge tone={mt}>{m}%</Badge>
                  </div>
                  <div className="col-span-1">
                    <input
                      value={String(l.leadDays)}
                      onChange={(e) => onUpdateLine(idx, { leadDays: Number(e.target.value) })}
                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-2 text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              );
            })}

            {/* Subtotal row */}
            <div className="grid grid-cols-12 gap-2 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-xs font-extrabold text-slate-700">
              <div className="col-span-3">Subtotal</div>
              <div className="col-span-1" />
              <div className="col-span-1" />
              <div className="col-span-2 flex items-center">{fmtMoney(totals.cost, currency)}</div>
              <div className="col-span-1" />
              <div className="col-span-2 flex items-center">{fmtMoney(totals.price, currency)}</div>
              <div className="col-span-1 flex items-center">
                <Badge tone={totals.marginPct >= 25 ? "green" : totals.marginPct >= 12 ? "orange" : "danger"}>
                  {fmtNum(totals.marginPct)}%
                </Badge>
              </div>
              <div className="col-span-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-orange-900">Supplier-safe note</div>
            <div className="mt-1 text-xs font-semibold text-orange-900/70">
              Buyer budget caps and CorporatePay limits remain hidden. You can still optimize your quote to help approval.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
        </div>
      </div>
    </div>
  );
}

function RfqDetailDrawer({
  rfq,
  draft,
  onUpdateDraftLine,
  onClose,
}: {
  rfq: Rfq | null;
  draft: DraftQuote | null;
  onUpdateDraftLine: (idx: number, patch: Partial<DraftLine>) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("Requirements");

  // reset tab when rfq changes
  useEffect(() => {
    setTab("Requirements");
  }, [rfq?.id]);

  if (!rfq) return null;

  return (
    <Drawer open={!!rfq} onClose={onClose} title={`RFQ · ${rfq.id}`} subtitle="Details, draft quote and key signals.">
      <div className="space-y-3">
        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-start gap-3">
            <div className={cx("grid h-12 w-12 place-items-center rounded-3xl", rfq.urgency === "Urgent" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700")}>
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-sm font-black text-slate-900">{rfq.title}</div>
                <ScorePill score={rfq.score ?? 0} />
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Buyer: {rfq.buyerName} · Due {fmtTime(rfq.dueAt)}</div>
              <div className="mt-3">
                <SignalBadges rfq={rfq} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["Requirements", "Draft Quote", "Negotiation", "Clauses", "Scoring"].map((t) => (
            <SegTab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
          <span className="ml-auto"><Badge tone="slate">Supplier view</Badge></span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
          >
            {tab === "Requirements" ? (
              <GlassCard className="p-4">
                <div className="text-sm font-black text-slate-900">Requirements</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{rfq.notes}</div>
                <div className="mt-4 grid gap-2">
                  <Row label="Destination" value={rfq.destination} />
                  <Row label="Category" value={rfq.category} />
                  <Row label="Urgency" value={rfq.urgency} />
                </div>
              </GlassCard>
            ) : null}

            {tab === "Draft Quote" ? (
              draft ? (
                <DraftQuoteTable draft={draft} onUpdateLine={onUpdateDraftLine} />
              ) : (
                <EmptyState title="No draft yet" message="Use Draft from the inbox to generate a quote draft." />
              )
            ) : null}

            {tab === "Negotiation" ? (
              <GlassCard className="p-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Negotiation timeline (demo)</div>
                  <span className="ml-auto"><Badge tone="slate">2</Badge></span>
                </div>
                <div className="mt-3 space-y-2">
                  <TimelineItem who="Buyer" when={fmtTime(rfq.createdAt)} text="RFQ created and shared." />
                  <TimelineItem who="Supplier" when={fmtTime(new Date().toISOString())} text="Draft quote started." />
                </div>
              </GlassCard>
            ) : null}

            {tab === "Clauses" ? (
              <GlassCard className="p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Clause suggestions</div>
                  <span className="ml-auto"><Badge tone="slate">Copy</Badge></span>
                </div>
                <div className="mt-3 grid gap-2">
                  {[
                    "Warranty: 12 months from delivery.",
                    "Lead time: starts after payment authorization.",
                    "Acceptance: report issues within 7 days with evidence.",
                  ].map((c) => (
                    <div key={c} className="flex items-start justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="text-xs font-semibold text-slate-700">{c}</div>
                      <button
                        type="button"
                        onClick={() => safeCopy(c)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ) : null}

            {tab === "Scoring" ? (
              <GlassCard className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Scoring</div>
                  <span className="ml-auto"><ScorePill score={rfq.score ?? 0} /></span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">Explainable scoring uses urgency, margin potential, competitor pressure and payment risk.</div>
                <div className="mt-4 grid gap-2">
                  <Row label="Margin potential" value={`${rfq.marginPotential}%`} />
                  <Row label="Competitor pressure" value={rfq.competitorPressure} />
                  <Row label="Payment risk" value={rfq.paymentRisk} />
                </div>
              </GlassCard>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </Drawer>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className="text-xs font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function TimelineItem({ who, when, text }: { who: string; when: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <Badge tone="slate">{who}</Badge>
        <span className="ml-auto text-[10px] font-extrabold text-slate-400">{when}</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-800">{text}</div>
    </div>
  );
}

export default function WholesaleRFQsSignalsAndDraftTotalsPreviewable() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [rfqs, setRfqs] = useState<Rfq[]>([]);

  const [search, setSearch] = useState("");
  const [scoreMin, setScoreMin] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rfqs
      .filter((r) => (r.score || 0) >= scoreMin)
      .filter((r) => {
        if (!q) return true;
        const hay = `${r.id} ${r.title} ${r.destination} ${r.origin} ${r.paymentRail} ${r.buyerType}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [rfqs, search, scoreMin]);

  const stats = useMemo(() => {
    const open = rfqs.filter((r) => r.status === "Open").length;
    const urgent = rfqs.filter((r) => r.urgency === "Urgent").length;
    const avg = rfqs.length ? Math.round(rfqs.reduce((s, r) => s + Number(r.score || 0), 0) / rfqs.length) : 0;
    const approvals = rfqs.filter((r) => r.approvalRequired).length;
    return { open, urgent, avg, approvals };
  }, [rfqs]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRfq = useMemo(() => rfqs.find((r) => r.id === activeId) || null, [rfqs, activeId]);

  const [drafts, setDrafts] = useState<DraftsByRfqId>({});

  useEffect(() => {
    // run basic unit tests once
    runSelfTests();
  }, []);

  useEffect(() => {
    let active = true;

    void sellerBackendApi.getWholesaleRfqs().then((payload) => {
      if (!active) return;
      const rows = Array.isArray((payload as { rfqs?: unknown[] }).rfqs)
        ? ((payload as { rfqs?: Array<Record<string, unknown>> }).rfqs ?? [])
        : [];
      setRfqs(
        rows.map((entry) => {
          const data = ((entry.data ?? {}) as Record<string, unknown>);
          return {
            id: String(entry.id ?? data.id ?? ""),
            title: String(entry.title ?? data.title ?? "RFQ"),
            status: String(data.status ?? entry.status ?? "Open"),
            urgency: String(entry.urgency ?? data.urgency ?? "Normal"),
            createdAt: String(data.createdAt ?? entry.createdAt ?? new Date().toISOString()),
            dueAt: String(entry.dueAt ?? data.dueAt ?? new Date().toISOString()),
            buyerType: String(entry.buyerType ?? data.buyerType ?? ""),
            origin: String(entry.origin ?? data.origin ?? ""),
            paymentRail: String(entry.paymentRail ?? data.paymentRail ?? ""),
            approvalRequired: Boolean(entry.approvalRequired ?? data.approvalRequired),
            attachments: Number(data.attachments ?? 0),
            destination: String(entry.destination ?? data.destination ?? ""),
            category: String(data.category ?? ""),
            notes: String(data.notes ?? ""),
            score: Number(data.score ?? 0),
            buyerName: data.buyerName ? String(data.buyerName) : undefined,
            competitorPressure: data.competitorPressure ? String(data.competitorPressure) : undefined,
            paymentRisk: data.paymentRisk ? String(data.paymentRisk) : undefined,
            marginPotential: data.marginPotential ? Number(data.marginPotential) : undefined,
          } satisfies Rfq;
        })
      );
      setDrafts(
        (((payload as { drafts?: unknown }).drafts ?? {}) as DraftsByRfqId)
      );
    });

    return () => {
      active = false;
    };
  }, []);

  const openDetails = (id: string) => {
    setActiveId(id);
    setDrawerOpen(true);
  };

  const autoDraft = (id: string) => {
    setDrafts((prev) => {
      if (prev[id]) return prev;
      const rfq = rfqs.find((r) => r.id === id);
      if (!rfq) return prev;
      return { ...prev, [id]: makeDraftFromRfq(rfq) };
    });
    setActiveId(id);
    setDrawerOpen(true);
    pushToast({ title: "Draft quote ready", message: "Open RFQ and check Draft Quote tab.", tone: "success" });
  };

  const updateDraftLine = (idx: number, patch: Partial<DraftLine>) => {
    if (!activeRfq) return;
    const rfqId = activeRfq.id;
    setDrafts((prev) => {
      const d = prev[rfqId];
      if (!d) return prev;
      const lines = d.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
      return { ...prev, [rfqId]: { ...d, lines } };
    });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">RFQ Inbox</div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Signals follow: Buyer Type - Origin - Payment Rail, plus extra badges.</div>
            </div>
            <button
              type="button"
              onClick={() => pushToast({ title: "Refreshed", message: "Latest RFQs loaded (demo).", tone: "success" })}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <KpiCard icon={FileText} label="Open RFQs" value={stats.open} />
            <KpiCard icon={AlertTriangle} label="Urgent" value={stats.urgent} tone="orange" />
            <KpiCard icon={BarChart3} label="Avg score" value={stats.avg} tone="green" />
            <KpiCard icon={ShieldCheck} label="Approvals" value={stats.approvals} />
          </div>

          <GlassCard className="mt-4 p-4">
            <div className="grid gap-3 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-7">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search RFQ id, title, destination, origin, rail"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>
              <div className="md:col-span-5">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Score ≥</div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={scoreMin}
                    onChange={(e) => setScoreMin(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs font-black text-slate-600">{scoreMin}</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <RfqTable rfqs={filtered} draftsByRfqId={drafts} onDetails={openDetails} onAutoDraft={autoDraft} />
      </div>

      <RfqDetailDrawer
        rfq={drawerOpen ? activeRfq : null}
        draft={activeRfq ? drafts[activeRfq.id] : null}
        onUpdateDraftLine={updateDraftLine}
        onClose={() => setDrawerOpen(false)}
      />

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
