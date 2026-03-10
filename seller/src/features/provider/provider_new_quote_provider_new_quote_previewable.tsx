import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Globe,
  Info,
  Layers,
  Lock,
  Mail,
  MessageCircle,
  Percent,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";

/**
 * Provider Workflow Page
 * 7) New Quote
 * Route: /provider/new-quote
 * Core: scope, pricing, timeline, terms, send
 * Super premium: templates, margin guardrails, convert to contract
 *
 * Notes
 * - Self-contained and previewable.
 * - Hash navigation friendly: you can drop into your shell and route to #/provider/new-quote.
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = {
  id: string;
  tone?: ToastTone;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
};

const LS_KEY = "evzone_provider_new_quote_draft_v1";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function toISODate(d) {
  try {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
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

function fmtPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return `${v.toFixed(0)}%`;
}

function daysFrom(dateIso, addDays) {
  const base = new Date(dateIso);
  if (Number.isNaN(base.getTime())) return "";
  const d = new Date(base.getTime() + Number(addDays || 0) * 86400000);
  return toISODate(d);
}

function calcLine(line) {
  const qty = Math.max(0, Number(line.qty || 0));
  const unitCost = Math.max(0, Number(line.unitCost || 0));
  const markupPct = Number(line.markupPct ?? 0);
  const unitPrice = line.priceMode === "fixed" ? Math.max(0, Number(line.unitPrice || 0)) : unitCost * (1 + markupPct / 100);
  const revenue = qty * unitPrice;
  const cost = qty * unitCost;
  const margin = revenue > 0 ? (revenue - cost) / revenue : 0;
  return { qty, unitCost, markupPct, unitPrice, revenue, cost, margin };
}

function calcTotals(draft) {
  const lines = (draft.lines || []).map((l) => ({ ...l, _calc: calcLine(l) }));
  const revenue = lines.reduce((s, l) => s + l._calc.revenue, 0);
  const cost = lines.reduce((s, l) => s + l._calc.cost, 0);

  const discountType = draft.discount?.type || "none"; // none | pct | amt
  const discountValue = Number(draft.discount?.value || 0);

  const discountAmt =
    discountType === "pct" ? Math.max(0, (revenue * clamp(discountValue, 0, 100)) / 100) :
    discountType === "amt" ? Math.max(0, discountValue) :
    0;

  const taxableBase = Math.max(0, revenue - discountAmt);
  const taxPct = clamp(Number(draft.taxPct || 0), 0, 30);
  const taxes = (taxableBase * taxPct) / 100;

  const total = taxableBase + taxes;
  const margin = revenue > 0 ? (revenue - cost) / revenue : 0;

  return { lines, revenue, cost, discountAmt, taxPct, taxes, total, margin };
}

function defaultDraft() {
  const today = toISODate(new Date());
  return {
    meta: {
      quoteId: `Q-${Math.floor(100000 + Math.random() * 900000)}`,
      title: "Service quote",
      currency: "USD",
      language: "en",
      status: "Draft", // Draft | Sent
      createdAt: new Date().toISOString(),
    },

    client: {
      name: "",
      org: "",
      email: "",
      phone: "",
      channel: "EVzone Messages", // EVzone Messages | Email | WhatsApp
      referenceId: "", // RFQ/Booking/Order
    },

    scope: {
      summary: "",
      deliverables: [
        { id: makeId("del"), title: "Discovery and requirements", detail: "Clarify scope, constraints, and success metrics." },
        { id: makeId("del"), title: "Execution", detail: "Deliver service with progress updates." },
      ],
      attachments: [],
    },

    pricingPolicy: {
      enforceGuardrails: true,
      minMarginPct: 18,
      allowOverride: true,
      overrideReason: "",
    },

    lines: [
      {
        id: makeId("ln"),
        name: "Service package",
        qty: 1,
        unitCost: 120,
        priceMode: "markup", // markup | fixed
        markupPct: 40,
        unitPrice: 0,
        notes: "",
      },
    ],

    discount: { type: "none", value: 0 },
    taxPct: 0,

    timeline: {
      startDate: today,
      durationDays: 14,
      milestones: [
        { id: makeId("ms"), title: "Kickoff", dueInDays: 1, percent: 20 },
        { id: makeId("ms"), title: "Delivery", dueInDays: 14, percent: 80 },
      ],
      notes: "",
    },

    terms: {
      payment: {
        model: "milestones", // milestones | upfront | completion
        upfrontPct: 30,
        netDays: 3,
        acceptedMethods: ["EVzone Pay Wallet", "Bank Transfer"],
      },
      revisions: { included: 2, windowDays: 7 },
      support: { included: true, windowDays: 14 },
      confidentiality: true,
      ip: "client", // client | provider
      cancellation: "If the client cancels after kickoff, the kickoff milestone is non-refundable.",
      additional: "",
    },

    premium: {
      templateId: "tpl_standard",
      autoConvertToContract: true,
      contractType: "Standard Service Contract",
    },
  };
}

const TEMPLATE_LIBRARY = [
  {
    id: "tpl_standard",
    name: "Standard Service Proposal",
    badge: "Most used",
    desc: "Balanced scope, milestones, and standard terms.",
    apply: (d) => {
      const next = JSON.parse(JSON.stringify(d));
      next.meta.title = "Standard service quote";
      next.timeline.durationDays = 14;
      next.terms.payment.model = "milestones";
      next.terms.revisions.included = 2;
      next.pricingPolicy.minMarginPct = 18;
      return next;
    },
  },
  {
    id: "tpl_install",
    name: "Installation Quote",
    badge: "Field work",
    desc: "Site survey, install, testing, handover.",
    apply: (d) => {
      const next = JSON.parse(JSON.stringify(d));
      next.meta.title = "Installation quote";
      next.scope.deliverables = [
        { id: makeId("del"), title: "Site survey", detail: "Assess site, safety, routing, and materials." },
        { id: makeId("del"), title: "Installation", detail: "Install equipment and verify compliance." },
        { id: makeId("del"), title: "Testing and handover", detail: "Functional tests and handover documents." },
      ];
      next.lines = [
        { id: makeId("ln"), name: "Survey", qty: 1, unitCost: 80, priceMode: "markup", markupPct: 60, unitPrice: 0, notes: "" },
        { id: makeId("ln"), name: "Installation labor", qty: 1, unitCost: 260, priceMode: "markup", markupPct: 35, unitPrice: 0, notes: "" },
        { id: makeId("ln"), name: "Testing and commissioning", qty: 1, unitCost: 120, priceMode: "markup", markupPct: 35, unitPrice: 0, notes: "" },
      ];
      next.timeline.durationDays = 7;
      next.timeline.milestones = [
        { id: makeId("ms"), title: "Survey", dueInDays: 1, percent: 25 },
        { id: makeId("ms"), title: "Install", dueInDays: 5, percent: 50 },
        { id: makeId("ms"), title: "Handover", dueInDays: 7, percent: 25 },
      ];
      next.pricingPolicy.minMarginPct = 20;
      next.terms.revisions.included = 1;
      return next;
    },
  },
  {
    id: "tpl_consult",
    name: "Consultation Quote",
    badge: "Calls",
    desc: "Fixed price consultation with clear boundaries.",
    apply: (d) => {
      const next = JSON.parse(JSON.stringify(d));
      next.meta.title = "Consultation quote";
      next.scope.deliverables = [
        { id: makeId("del"), title: "Consultation call", detail: "60-90 minutes deep dive with summary." },
        { id: makeId("del"), title: "Follow-up", detail: "One follow-up Q&A within 7 days." },
      ];
      next.lines = [
        { id: makeId("ln"), name: "Consultation", qty: 1, unitCost: 40, priceMode: "fixed", markupPct: 0, unitPrice: 120, notes: "" },
      ];
      next.timeline.durationDays = 3;
      next.timeline.milestones = [
        { id: makeId("ms"), title: "Call", dueInDays: 2, percent: 70 },
        { id: makeId("ms"), title: "Summary", dueInDays: 3, percent: 30 },
      ];
      next.terms.payment.model = "upfront";
      next.terms.payment.upfrontPct = 100;
      next.pricingPolicy.minMarginPct = 15;
      return next;
    },
  },
  {
    id: "tpl_retainer",
    name: "Monthly Retainer",
    badge: "Premium",
    desc: "Recurring support with SLA and monthly billing.",
    apply: (d) => {
      const next = JSON.parse(JSON.stringify(d));
      next.meta.title = "Monthly retainer quote";
      next.scope.deliverables = [
        { id: makeId("del"), title: "Monthly support", detail: "Up to 20 hours support monthly." },
        { id: makeId("del"), title: "SLA", detail: "Response within 4 business hours." },
      ];
      next.lines = [
        { id: makeId("ln"), name: "Retainer (monthly)", qty: 1, unitCost: 600, priceMode: "markup", markupPct: 35, unitPrice: 0, notes: "Billed monthly" },
      ];
      next.timeline.durationDays = 30;
      next.timeline.milestones = [
        { id: makeId("ms"), title: "Month start", dueInDays: 1, percent: 100 },
      ];
      next.terms.payment.model = "upfront";
      next.terms.payment.upfrontPct = 100;
      next.terms.support.windowDays = 30;
      next.pricingPolicy.minMarginPct = 22;
      return next;
    },
  },
];

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
          ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
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

function Drawer({ open, title, subtitle, onClose, children, tone = "default" }) {
  const headerBg = tone === "dark" ? TOKENS.black : "rgba(255,255,255,0.85)";
  const headerText = tone === "dark" ? "text-white" : "text-slate-900";

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
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[720px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 px-4 py-3" style={{ background: headerBg }}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className={cx("text-sm font-black", headerText)}>{title}</div>
                    {subtitle ? (
                      <div className={cx("mt-1 text-xs font-semibold", tone === "dark" ? "text-white/70" : "text-slate-500")}>
                        {subtitle}
                      </div>
                    ) : null}
                  </div>
                  <IconButton label="Close" onClick={onClose} tone={tone === "dark" ? "dark" : "light"}>
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

function StepChip({ label, active, done, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <span
        className={cx(
          "grid h-6 w-6 place-items-center rounded-xl border",
          done ? "border-emerald-200 bg-white dark:bg-slate-900 text-emerald-700" : active ? "border-emerald-200 bg-white dark:bg-slate-900 text-emerald-700" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-500"
        )}
      >
        {done ? <Check className="h-4 w-4" /> : <span className="text-[11px]">•</span>}
      </span>
      {label}
    </button>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${clamp(value, 0, 100)}%` }} />
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[11px] font-extrabold text-slate-600">{children}</div>
      {hint ? <div className="text-[10px] font-extrabold text-slate-400">{hint}</div> : null}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 5 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
    />
  );
}

function SelectBox({ value, onChange, options }) {
  return (
    <div className="relative mt-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function Toggle({ value, onChange, label, desc }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cx(
        "w-full rounded-3xl border p-4 text-left transition",
        value ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl border",
            value ? "border-emerald-200 bg-white dark:bg-slate-900 text-emerald-700" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
          )}
        >
          {value ? <CheckCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-black text-slate-900">{label}</div>
            <span className="ml-auto">{value ? <Badge tone="green">On</Badge> : <Badge tone="slate">Off</Badge>}</span>
          </div>
          {desc ? <div className="mt-1 text-xs font-semibold text-slate-500">{desc}</div> : null}
        </div>
      </div>
    </button>
  );
}

function ScorePill({ pct, warnAt = 18 }) {
  const p = clamp(Math.round(Number(pct || 0)), 0, 100);
  const tone = p >= warnAt + 8 ? "green" : p >= warnAt ? "orange" : "danger";
  return <Badge tone={tone}>{fmtPct(p)}</Badge>;
}

function buildContractText(draft, totals) {
  const clientName = draft.client?.name || "Client";
  const org = draft.client?.org ? ` (${draft.client.org})` : "";
  const title = draft.meta?.title || "Service";
  const start = draft.timeline?.startDate || "";
  const duration = draft.timeline?.durationDays || "";
  const currency = draft.meta?.currency || "USD";

  const lines = (totals.lines || [])
    .map((l) => {
      const unitPrice = l._calc.unitPrice;
      return `- ${l.name}: ${l._calc.qty} x ${fmtMoney(unitPrice, currency)} = ${fmtMoney(l._calc.revenue, currency)}`;
    })
    .join("\n");

  const milestones = (draft.timeline?.milestones || [])
    .map((m) => `- ${m.title}: due ${daysFrom(start, m.dueInDays)} (${m.percent}%)`)
    .join("\n");

  const ip = draft.terms?.ip === "provider" ? "Provider" : "Client";

  return [
    `SERVICE CONTRACT (DRAFT)` ,
    "",
    `1. Parties`,
    `Client: ${clientName}${org}`,
    `Provider: EVzone Provider`,
    "",
    `2. Scope`,
    `${title}`,
    `${draft.scope?.summary || "(Add scope summary)"}`,
    "",
    `Deliverables`,
    ...(draft.scope?.deliverables || []).map((d) => `- ${d.title}: ${d.detail || ""}`),
    "",
    `3. Timeline`,
    `Start date: ${start}`,
    `Duration: ${duration} day(s)`,
    "",
    `Milestones`,
    milestones || "(No milestones)",
    "",
    `4. Fees and payment`,
    `Subtotal: ${fmtMoney(totals.revenue, currency)}`,
    `Discount: ${fmtMoney(totals.discountAmt, currency)}`,
    `Taxes: ${fmtMoney(totals.taxes, currency)}`,
    `Total: ${fmtMoney(totals.total, currency)}`,
    "",
    `Line items`,
    lines || "(No line items)",
    "",
    `Payment terms`,
    `Model: ${draft.terms?.payment?.model || "milestones"}`,
    `Net: ${draft.terms?.payment?.netDays || 0} day(s)`,
    `Accepted methods: ${(draft.terms?.payment?.acceptedMethods || []).join(", ")}`,
    "",
    `5. Revisions and support`,
    `Revisions included: ${draft.terms?.revisions?.included ?? 0}`,
    `Revision window: ${draft.terms?.revisions?.windowDays ?? 0} day(s)`,
    `Support included: ${draft.terms?.support?.included ? "Yes" : "No"}`,
    `Support window: ${draft.terms?.support?.windowDays ?? 0} day(s)`,
    "",
    `6. Confidentiality`,
    `Confidentiality: ${draft.terms?.confidentiality ? "Yes" : "No"}`,
    "",
    `7. IP Ownership`,
    `IP ownership on final deliverables: ${ip}`,
    "",
    `8. Cancellation`,
    `${draft.terms?.cancellation || "(Add cancellation policy)"}`,
    "",
    `9. Additional terms`,
    `${draft.terms?.additional || ""}`,
  ].join("\n");
}

export default function ProviderNewQuotePage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [draft, setDraft] = useState(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
      if (!raw) return defaultDraft();
      const parsed = JSON.parse(raw);
      return { ...defaultDraft(), ...parsed };
    } catch {
      return defaultDraft();
    }
  });

  const [step, setStep] = useState(0);
  const steps = ["Scope", "Pricing", "Timeline", "Terms", "Send"]; // 0..4

  const totals = useMemo(() => calcTotals(draft), [draft]);

  // Autosave (debounced)
  const autosaveRef = useRef<number | null>(null);
  const [autosaveAt, setAutosaveAt] = useState<string | null>(null);
  useEffect(() => {
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(LS_KEY, JSON.stringify(draft));
        setAutosaveAt(new Date().toISOString());
      } catch {
        // ignore
      }
    }, 550);
    return () => {
      if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    };
  }, [draft]);

  // Template drawer
  const [tplOpen, setTplOpen] = useState(false);
  const applyTemplate = (tplId) => {
    const tpl = TEMPLATE_LIBRARY.find((t) => t.id === tplId);
    if (!tpl) return;
    const next = tpl.apply({ ...draft, premium: { ...draft.premium, templateId: tplId } });
    setDraft(next);
    pushToast({ title: "Template applied", message: tpl.name, tone: "success" });
  };

  // Contract drawer
  const [contractOpen, setContractOpen] = useState(false);

  const completed = useMemo(() => {
    const hasClient = (draft.client?.name || "").trim().length > 0;
    const hasScope = (draft.scope?.summary || "").trim().length >= 12;
    const hasLine = (draft.lines || []).some((l) => (l.name || "").trim() && Number(l.qty || 0) > 0);
    const hasMilestones = (draft.timeline?.milestones || []).length > 0;
    const hasTerms = true;
    return [hasClient && hasScope, hasLine, hasMilestones, hasTerms, false];
  }, [draft]);

  const guardrail = useMemo(() => {
    const min = clamp(Number(draft.pricingPolicy?.minMarginPct || 0), 0, 60);
    const current = Math.round((totals.margin || 0) * 100);
    const enforcing = !!draft.pricingPolicy?.enforceGuardrails;
    const below = enforcing && current < min;
    const needsReason = below && !!draft.pricingPolicy?.allowOverride;
    const reasonOk = !needsReason || String(draft.pricingPolicy?.overrideReason || "").trim().length >= 12;
    const sendBlocked = below && (!draft.pricingPolicy?.allowOverride || !reasonOk);
    return { min, current, enforcing, below, needsReason, reasonOk, sendBlocked };
  }, [draft, totals.margin]);

  const sendDisabled = useMemo(() => {
    if (draft.meta?.status === "Sent") return true;
    if (!completed[0] || !completed[1] || !completed[2] || !completed[3]) return true;
    if (guardrail.sendBlocked) return true;
    return false;
  }, [draft.meta?.status, completed, guardrail.sendBlocked]);

  const progressPct = Math.round(((step + 1) / steps.length) * 100);

  const setField = (path, value) => {
    setDraft((s) => {
      const next = JSON.parse(JSON.stringify(s));
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        cur[k] = cur[k] ?? {};
        cur = cur[k];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const addDeliverable = () => {
    setDraft((s) => ({
      ...s,
      scope: {
        ...s.scope,
        deliverables: [...(s.scope?.deliverables || []), { id: makeId("del"), title: "New deliverable", detail: "" }],
      },
    }));
  };

  const addLine = () => {
    setDraft((s) => ({
      ...s,
      lines: [
        ...(s.lines || []),
        { id: makeId("ln"), name: "Service item", qty: 1, unitCost: 0, priceMode: "markup", markupPct: 30, unitPrice: 0, notes: "" },
      ],
    }));
  };

  const addMilestone = () => {
    const start = draft.timeline?.startDate || toISODate(new Date());
    const duration = Number(draft.timeline?.durationDays || 14);
    const dueInDays = clamp(duration, 1, 365);
    setDraft((s) => ({
      ...s,
      timeline: {
        ...s.timeline,
        milestones: [...(s.timeline?.milestones || []), { id: makeId("ms"), title: "Milestone", dueInDays, percent: 0 }],
        startDate: s.timeline?.startDate || start,
      },
    }));
  };

  const normalizeMilestones = () => {
    const ms = [...(draft.timeline?.milestones || [])];
    if (!ms.length) return;
    const each = Math.floor(100 / ms.length);
    const remainder = 100 - each * ms.length;
    const next = ms.map((m, idx) => ({ ...m, percent: idx === ms.length - 1 ? each + remainder : each }));
    setField("timeline.milestones", next);
    pushToast({ title: "Milestones normalized", message: "Percentages adjusted to sum to 100%.", tone: "success" });
  };

  const fileRef = useRef<HTMLInputElement | null>(null);

  const sendQuote = () => {
    setField("meta.status", "Sent");
    pushToast({
      title: "Quote sent",
      message: `Sent via ${draft.client?.channel}. Quote ID ${draft.meta?.quoteId}.`,
      tone: "success",
      action: { label: "Open contract", onClick: () => setContractOpen(true) },
    });
  };

  const resetDraft = () => {
    const fresh = defaultDraft();
    setDraft(fresh);
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
    pushToast({ title: "Draft reset", message: "A new quote draft was created.", tone: "default" });
  };

  const contractText = useMemo(() => buildContractText(draft, totals), [draft, totals]);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">New Quote</div>
                <Badge tone="slate">/provider/new-quote</Badge>
                <Badge tone={draft.meta?.status === "Sent" ? "green" : "slate"}>{draft.meta?.status || "Draft"}</Badge>
                <Badge tone="slate">Provider</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Scope, pricing, timeline, terms, send. Premium: templates, margin guardrails, contract conversion.
              </div>
              <div className="mt-3">
                <ProgressBar value={progressPct} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2">
                <Save className="h-4 w-4 text-slate-600" />
                <div className="text-xs font-extrabold text-slate-700">Autosave</div>
                <span className="text-[11px] font-semibold text-slate-500">{autosaveAt ? `at ${new Date(autosaveAt).toLocaleTimeString()}` : "active"}</span>
              </div>

              <button
                type="button"
                onClick={() => setTplOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Wand2 className="h-4 w-4" />
                Templates
              </button>

              <button
                type="button"
                onClick={() => setContractOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
              >
                <FileText className="h-4 w-4" />
                Contract
              </button>

              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>

              <button
                type="button"
                onClick={() => {
                  safeCopy(JSON.stringify(draft, null, 2));
                  pushToast({ title: "Copied", message: "Draft JSON copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {steps.map((s, idx) => (
              <StepChip
                key={s}
                label={s}
                active={step === idx}
                done={completed[idx]}
                onClick={() => setStep(idx)}
              />
            ))}
            <span className="ml-auto flex items-center gap-2">
              <Badge tone={guardrail.below ? "danger" : "green"}>{guardrail.below ? "Guardrail" : "Margin"}</Badge>
              <ScorePill pct={Math.round((totals.margin || 0) * 100)} warnAt={guardrail.min} />
              <Badge tone="slate">Min {fmtPct(guardrail.min)}</Badge>
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Main */}
          <div className="lg:col-span-8">
            <GlassCard className="overflow-hidden">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-900">Step {step + 1}: {steps[step]}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Complete each step to unlock sending.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="slate">Quote {draft.meta?.quoteId}</Badge>
                    <Badge tone="slate">{draft.meta?.currency}</Badge>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.16 }}
                  >
                    {step === 0 ? (
                      <div className="grid gap-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <FieldLabel hint="Required">Client name</FieldLabel>
                            <Input value={draft.client.name} onChange={(v) => setField("client.name", v)} placeholder="e.g., Amina K." />
                          </div>
                          <div>
                            <FieldLabel>Organization</FieldLabel>
                            <Input value={draft.client.org} onChange={(v) => setField("client.org", v)} placeholder="e.g., Kampala Mobility Ltd" />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <FieldLabel>Email</FieldLabel>
                            <Input value={draft.client.email} onChange={(v) => setField("client.email", v)} placeholder="client@email.com" type="email" />
                          </div>
                          <div>
                            <FieldLabel>Phone</FieldLabel>
                            <Input value={draft.client.phone} onChange={(v) => setField("client.phone", v)} placeholder="+256..." />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <FieldLabel>Send via</FieldLabel>
                            <SelectBox
                              value={draft.client.channel}
                              onChange={(v) => setField("client.channel", v)}
                              options={[
                                { label: "EVzone Messages", value: "EVzone Messages" },
                                { label: "Email", value: "Email" },
                                { label: "WhatsApp", value: "WhatsApp" },
                              ]}
                            />
                          </div>
                          <div>
                            <FieldLabel>Reference ID</FieldLabel>
                            <Input value={draft.client.referenceId} onChange={(v) => setField("client.referenceId", v)} placeholder="RFQ-..., BK-..., ORD-..." />
                          </div>
                          <div>
                            <FieldLabel>Quote title</FieldLabel>
                            <Input value={draft.meta.title} onChange={(v) => setField("meta.title", v)} placeholder="Quote title" />
                          </div>
                        </div>

                        <div>
                          <FieldLabel hint="At least 12 characters">Scope summary</FieldLabel>
                          <Textarea
                            value={draft.scope.summary}
                            onChange={(v) => setField("scope.summary", v)}
                            placeholder="Describe what you will deliver, what is excluded, and success criteria."
                            rows={5}
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge tone={String(draft.scope.summary || "").trim().length >= 12 ? "green" : "orange"}>
                              {String(draft.scope.summary || "").trim().length >= 12 ? "Good" : "Needs detail"}
                            </Badge>
                            <div className="text-xs font-semibold text-slate-500">Premium: AI scope helper can be added later.</div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Deliverables</div>
                              <Badge tone="slate">{(draft.scope.deliverables || []).length}</Badge>
                            </div>
                            <button
                              type="button"
                              onClick={addDeliverable}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </button>
                          </div>

                          <div className="mt-3 space-y-2">
                            {(draft.scope.deliverables || []).map((d) => (
                              <div key={d.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                <div className="flex items-start gap-3">
                                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                                    <BadgeCheck className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <FieldLabel>Title</FieldLabel>
                                    <input
                                      value={d.title}
                                      onChange={(e) => {
                                        const next = (draft.scope.deliverables || []).map((x) => (x.id === d.id ? { ...x, title: e.target.value } : x));
                                        setField("scope.deliverables", next);
                                      }}
                                      className="mt-2 h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                    />
                                    <FieldLabel>Detail</FieldLabel>
                                    <textarea
                                      value={d.detail}
                                      onChange={(e) => {
                                        const next = (draft.scope.deliverables || []).map((x) => (x.id === d.id ? { ...x, detail: e.target.value } : x));
                                        setField("scope.deliverables", next);
                                      }}
                                      rows={3}
                                      className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = (draft.scope.deliverables || []).filter((x) => x.id !== d.id);
                                      setField("scope.deliverables", next);
                                    }}
                                    className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                                    aria-label="Remove"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Attachments</div>
                              <Badge tone="slate">{(draft.scope.attachments || []).length}</Badge>
                            </div>
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click?.()}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.orange }}
                            >
                              <Upload className="h-4 w-4" />
                              Upload
                            </button>
                            <input
                              ref={fileRef}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (!files.length) return;
                                const next = [
                                  ...(draft.scope.attachments || []),
                                  ...files.map((f) => ({ id: makeId("file"), name: f.name })),
                                ];
                                setField("scope.attachments", next);
                                pushToast({ title: "Uploaded", message: `${files.length} file(s) added (local).`, tone: "success" });
                                e.currentTarget.value = "";
                              }}
                            />
                          </div>

                          <div className="mt-3 flex flex-col gap-2">
                            {(draft.scope.attachments || []).length === 0 ? (
                              <div className="text-xs font-semibold text-slate-500">Attach scope documents, drawings, or examples (optional).</div>
                            ) : (
                              (draft.scope.attachments || []).map((a) => (
                                <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                                  <FileText className="h-5 w-5 text-slate-700" />
                                  <div className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-900">{a.name}</div>
                                  <button
                                    type="button"
                                    onClick={() => setField("scope.attachments", (draft.scope.attachments || []).filter((x) => x.id !== a.id))}
                                    className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                                    aria-label="Remove"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === 1 ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <FieldLabel>Currency</FieldLabel>
                            <SelectBox
                              value={draft.meta.currency}
                              onChange={(v) => setField("meta.currency", v)}
                              options={[
                                { label: "USD", value: "USD" },
                                { label: "UGX", value: "UGX" },
                                { label: "KES", value: "KES" },
                                { label: "NGN", value: "NGN" },
                                { label: "EUR", value: "EUR" },
                                { label: "CNY", value: "CNY" },
                              ]}
                            />
                          </div>
                          <div>
                            <FieldLabel>Language</FieldLabel>
                            <SelectBox
                              value={draft.meta.language}
                              onChange={(v) => setField("meta.language", v)}
                              options={[
                                { label: "English", value: "en" },
                                { label: "Français", value: "fr" },
                                { label: "中文", value: "zh" },
                                { label: "Español", value: "es" },
                              ]}
                            />
                          </div>
                          <div>
                            <FieldLabel>VAT / Tax %</FieldLabel>
                            <Input
                              type="number"
                              value={String(draft.taxPct ?? 0)}
                              onChange={(v) => setField("taxPct", Number(v))}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Banknote className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Line items</div>
                              <Badge tone="slate">{(draft.lines || []).length}</Badge>
                            </div>
                            <button
                              type="button"
                              onClick={addLine}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </button>
                          </div>

                          <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                            <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                              <div className="col-span-4">Item</div>
                              <div className="col-span-1">Qty</div>
                              <div className="col-span-2">Unit cost</div>
                              <div className="col-span-2">Pricing</div>
                              <div className="col-span-2">Unit price</div>
                              <div className="col-span-1">Margin</div>
                            </div>
                            <div className="divide-y divide-slate-200/70">
                              {totals.lines.map((l) => {
                                const marginPct = Math.round(l._calc.margin * 100);
                                const below = draft.pricingPolicy?.enforceGuardrails && marginPct < guardrail.min;
                                return (
                                  <div key={l.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                                    <div className="col-span-4 min-w-0">
                                      <input
                                        value={l.name}
                                        onChange={(e) => {
                                          const next = (draft.lines || []).map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x));
                                          setField("lines", next);
                                        }}
                                        className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-extrabold text-slate-900 outline-none"
                                      />
                                      <input
                                        value={l.notes || ""}
                                        onChange={(e) => {
                                          const next = (draft.lines || []).map((x) => (x.id === l.id ? { ...x, notes: e.target.value } : x));
                                          setField("lines", next);
                                        }}
                                        placeholder="Notes (optional)"
                                        className="mt-2 h-9 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-[12px] font-semibold text-slate-700 outline-none"
                                      />
                                      <div className="mt-2 flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = (draft.lines || []).filter((x) => x.id !== l.id);
                                            setField("lines", next);
                                          }}
                                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-extrabold text-rose-700"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Remove
                                        </button>
                                        {below ? <Badge tone="danger">Below min</Badge> : <Badge tone="slate">OK</Badge>}
                                      </div>
                                    </div>

                                    <div className="col-span-1">
                                      <input
                                        type="number"
                                        value={String(l.qty)}
                                        onChange={(e) => {
                                          const next = (draft.lines || []).map((x) => (x.id === l.id ? { ...x, qty: Number(e.target.value) } : x));
                                          setField("lines", next);
                                        }}
                                        className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-extrabold text-slate-900 outline-none"
                                      />
                                    </div>

                                    <div className="col-span-2">
                                      <input
                                        type="number"
                                        value={String(l.unitCost)}
                                        onChange={(e) => {
                                          const next = (draft.lines || []).map((x) => (x.id === l.id ? { ...x, unitCost: Number(e.target.value) } : x));
                                          setField("lines", next);
                                        }}
                                        className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-extrabold text-slate-900 outline-none"
                                      />
                                      <div className="mt-1 text-[10px] font-extrabold text-slate-400">Cost basis</div>
                                    </div>

                                    <div className="col-span-2">
                                      <div className="relative">
                                        <select
                                          value={l.priceMode}
                                          onChange={(e) => {
                                            const mode = e.target.value;
                                            const next = (draft.lines || []).map((x) => (x.id === l.id ? { ...x, priceMode: mode } : x));
                                            setField("lines", next);
                                          }}
                                          className="h-10 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-extrabold text-slate-900"
                                        >
                                          <option value="markup">Markup</option>
                                          <option value="fixed">Fixed</option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                      </div>

                                      {l.priceMode === "markup" ? (
                                        <div className="mt-2 flex items-center gap-2">
                                          <Percent className="h-4 w-4 text-slate-500" />
                                          <input
                                            type="number"
                                            value={String(l.markupPct ?? 0)}
                                            onChange={(e) => {
                                              const next = (draft.lines || []).map((x) => (x.id === l.id ? { ...x, markupPct: Number(e.target.value) } : x));
                                              setField("lines", next);
                                            }}
                                            className="h-9 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-extrabold text-slate-900 outline-none"
                                          />
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-[10px] font-extrabold text-slate-400">Set price directly</div>
                                      )}
                                    </div>

                                    <div className="col-span-2">
                                      <input
                                        type="number"
                                        value={String(l.priceMode === "fixed" ? l.unitPrice : Math.round(l._calc.unitPrice * 100) / 100)}
                                        onChange={(e) => {
                                          const next = (draft.lines || []).map((x) => (x.id === l.id ? { ...x, unitPrice: Number(e.target.value), priceMode: "fixed" } : x));
                                          setField("lines", next);
                                        }}
                                        className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-extrabold text-slate-900 outline-none"
                                      />
                                      <div className="mt-1 text-[10px] font-extrabold text-slate-400">Auto if markup</div>
                                    </div>

                                    <div className="col-span-1 flex items-center justify-end">
                                      <Badge tone={marginPct >= guardrail.min ? "green" : marginPct >= guardrail.min - 5 ? "orange" : "danger"}>{fmtPct(marginPct)}</Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <Info className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Discount</div>
                              <span className="ml-auto"><Badge tone="slate">Optional</Badge></span>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div>
                                <FieldLabel>Type</FieldLabel>
                                <SelectBox
                                  value={draft.discount.type}
                                  onChange={(v) => setField("discount.type", v)}
                                  options={[
                                    { label: "None", value: "none" },
                                    { label: "Percent", value: "pct" },
                                    { label: "Amount", value: "amt" },
                                  ]}
                                />
                              </div>
                              <div>
                                <FieldLabel>Value</FieldLabel>
                                <Input
                                  type="number"
                                  value={String(draft.discount.value)}
                                  onChange={(v) => setField("discount.value", Number(v))}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Margin guardrails</div>
                              <span className="ml-auto"><Badge tone="slate">Premium</Badge></span>
                            </div>

                            <div className="mt-3 space-y-2">
                              <Toggle
                                value={!!draft.pricingPolicy.enforceGuardrails}
                                onChange={(v) => setField("pricingPolicy.enforceGuardrails", v)}
                                label="Enforce minimum margin"
                                desc="Blocks sending when margin is too low, unless override is allowed and justified."
                              />

                              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-extrabold text-slate-600">Minimum margin</div>
                                  <Badge tone="slate">{fmtPct(guardrail.min)}</Badge>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={45}
                                  step={1}
                                  value={guardrail.min}
                                  onChange={(e) => setField("pricingPolicy.minMarginPct", Number(e.target.value))}
                                  className="mt-3 w-full"
                                />
                                <div className="mt-2 text-[11px] font-semibold text-slate-500">Current margin: {fmtPct(guardrail.current)}</div>

                                <div className="mt-3 grid gap-2">
                                  <Toggle
                                    value={!!draft.pricingPolicy.allowOverride}
                                    onChange={(v) => setField("pricingPolicy.allowOverride", v)}
                                    label="Allow override"
                                    desc="If enabled, you may send below min margin with a clear reason."
                                  />
                                  {guardrail.needsReason ? (
                                    <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                                      <div className="flex items-start gap-3">
                                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                                          <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-black text-orange-900">Override reason required</div>
                                          <div className="mt-1 text-xs font-semibold text-orange-900/70">Explain why you are sending below the minimum margin.</div>
                                          <textarea
                                            value={draft.pricingPolicy.overrideReason}
                                            onChange={(e) => setField("pricingPolicy.overrideReason", e.target.value)}
                                            rows={3}
                                            className="mt-3 w-full rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                                          />
                                          <div className="mt-2 flex items-center gap-2">
                                            {guardrail.reasonOk ? <Badge tone="green">Reason OK</Badge> : <Badge tone="orange">Add detail</Badge>}
                                            <div className="text-[11px] font-semibold text-slate-500">Minimum 12 characters.</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Totals</div>
                            <span className="ml-auto"><Badge tone="slate">{draft.meta.currency}</Badge></span>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                              <div className="text-[11px] font-extrabold text-slate-600">Revenue</div>
                              <div className="mt-1 text-lg font-black text-slate-900">{fmtMoney(totals.revenue, draft.meta.currency)}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Cost {fmtMoney(totals.cost, draft.meta.currency)}</div>
                            </div>
                            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                              <div className="text-[11px] font-extrabold text-slate-600">Total</div>
                              <div className="mt-1 text-lg font-black text-slate-900">{fmtMoney(totals.total, draft.meta.currency)}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Taxes {fmtMoney(totals.taxes, draft.meta.currency)} | Discount {fmtMoney(totals.discountAmt, draft.meta.currency)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === 2 ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <FieldLabel>Start date</FieldLabel>
                            <Input
                              type="date"
                              value={draft.timeline.startDate}
                              onChange={(v) => setField("timeline.startDate", v)}
                              placeholder=""
                            />
                          </div>
                          <div>
                            <FieldLabel>Duration (days)</FieldLabel>
                            <Input
                              type="number"
                              value={String(draft.timeline.durationDays)}
                              onChange={(v) => setField("timeline.durationDays", Number(v))}
                              placeholder="14"
                            />
                          </div>
                          <div className="flex items-end justify-end">
                            <button
                              type="button"
                              onClick={normalizeMilestones}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Percent className="h-4 w-4" />
                              Normalize %
                            </button>
                          </div>
                        </div>

                        <div>
                          <FieldLabel>Timeline notes</FieldLabel>
                          <Textarea
                            value={draft.timeline.notes}
                            onChange={(v) => setField("timeline.notes", v)}
                            placeholder="Add working hours, dependencies, and approval points."
                            rows={4}
                          />
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Milestones</div>
                              <Badge tone="slate">{(draft.timeline.milestones || []).length}</Badge>
                            </div>
                            <button
                              type="button"
                              onClick={addMilestone}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </button>
                          </div>

                          <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                            <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                              <div className="col-span-6">Milestone</div>
                              <div className="col-span-3">Due date</div>
                              <div className="col-span-2">Percent</div>
                              <div className="col-span-1">Actions</div>
                            </div>
                            <div className="divide-y divide-slate-200/70">
                              {(draft.timeline.milestones || []).map((m) => (
                                <div key={m.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                                  <div className="col-span-6">
                                    <input
                                      value={m.title}
                                      onChange={(e) => {
                                        const next = (draft.timeline.milestones || []).map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x));
                                        setField("timeline.milestones", next);
                                      }}
                                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-extrabold text-slate-900 outline-none"
                                    />
                                    <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                                      <span>Due in</span>
                                      <input
                                        type="number"
                                        value={String(m.dueInDays)}
                                        onChange={(e) => {
                                          const next = (draft.timeline.milestones || []).map((x) => (x.id === m.id ? { ...x, dueInDays: Number(e.target.value) } : x));
                                          setField("timeline.milestones", next);
                                        }}
                                        className="h-9 w-24 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-extrabold text-slate-900 outline-none"
                                      />
                                      <span>day(s)</span>
                                    </div>
                                  </div>
                                  <div className="col-span-3 flex items-center">
                                    <Badge tone="slate">{daysFrom(draft.timeline.startDate, m.dueInDays) || "-"}</Badge>
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      type="number"
                                      value={String(m.percent)}
                                      onChange={(e) => {
                                        const next = (draft.timeline.milestones || []).map((x) => (x.id === m.id ? { ...x, percent: Number(e.target.value) } : x));
                                        setField("timeline.milestones", next);
                                      }}
                                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-extrabold text-slate-900 outline-none"
                                    />
                                  </div>
                                  <div className="col-span-1 flex items-center justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setField("timeline.milestones", (draft.timeline.milestones || []).filter((x) => x.id !== m.id))}
                                      className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                                      aria-label="Remove"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                            <div className="flex items-start gap-3">
                              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                                <Info className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-black text-orange-900">Premium timeline tip</div>
                                <div className="mt-1 text-xs font-semibold text-orange-900/70">Use milestones to drive approvals and reduce disputes.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === 3 ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <FieldLabel>Payment model</FieldLabel>
                            <SelectBox
                              value={draft.terms.payment.model}
                              onChange={(v) => setField("terms.payment.model", v)}
                              options={[
                                { label: "Milestones", value: "milestones" },
                                { label: "Upfront", value: "upfront" },
                                { label: "On completion", value: "completion" },
                              ]}
                            />
                          </div>
                          <div>
                            <FieldLabel>Net days</FieldLabel>
                            <Input
                              type="number"
                              value={String(draft.terms.payment.netDays)}
                              onChange={(v) => setField("terms.payment.netDays", Number(v))}
                              placeholder="3"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <FieldLabel>Upfront %</FieldLabel>
                            <Input
                              type="number"
                              value={String(draft.terms.payment.upfrontPct)}
                              onChange={(v) => setField("terms.payment.upfrontPct", Number(v))}
                              placeholder="30"
                            />
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">Used for Upfront or can be treated as deposit.</div>
                          </div>
                          <div>
                            <FieldLabel>Accepted methods</FieldLabel>
                            <Input
                              value={(draft.terms.payment.acceptedMethods || []).join(", ")}
                              onChange={(v) => setField("terms.payment.acceptedMethods", v.split(",").map((x) => x.trim()).filter(Boolean))}
                              placeholder="EVzone Pay Wallet, Bank Transfer"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <FieldLabel>Revisions included</FieldLabel>
                            <Input
                              type="number"
                              value={String(draft.terms.revisions.included)}
                              onChange={(v) => setField("terms.revisions.included", Number(v))}
                              placeholder="2"
                            />
                          </div>
                          <div>
                            <FieldLabel>Revision window (days)</FieldLabel>
                            <Input
                              type="number"
                              value={String(draft.terms.revisions.windowDays)}
                              onChange={(v) => setField("terms.revisions.windowDays", Number(v))}
                              placeholder="7"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Toggle
                            value={!!draft.terms.support.included}
                            onChange={(v) => setField("terms.support.included", v)}
                            label="Support included"
                            desc="Offer a support window after delivery."
                          />
                          <Toggle
                            value={!!draft.terms.confidentiality}
                            onChange={(v) => setField("terms.confidentiality", v)}
                            label="Confidentiality"
                            desc="Enable confidentiality clause by default."
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <FieldLabel>IP ownership</FieldLabel>
                            <SelectBox
                              value={draft.terms.ip}
                              onChange={(v) => setField("terms.ip", v)}
                              options={[
                                { label: "Client owns final deliverables", value: "client" },
                                { label: "Provider retains IP", value: "provider" },
                              ]}
                            />
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">Set per your legal policy.</div>
                          </div>
                          <div>
                            <FieldLabel>Support window (days)</FieldLabel>
                            <Input
                              type="number"
                              value={String(draft.terms.support.windowDays)}
                              onChange={(v) => setField("terms.support.windowDays", Number(v))}
                              placeholder="14"
                            />
                          </div>
                        </div>

                        <div>
                          <FieldLabel>Cancellation policy</FieldLabel>
                          <Textarea
                            value={draft.terms.cancellation}
                            onChange={(v) => setField("terms.cancellation", v)}
                            placeholder="Write a clear cancellation policy."
                            rows={4}
                          />
                        </div>

                        <div>
                          <FieldLabel>Additional terms</FieldLabel>
                          <Textarea
                            value={draft.terms.additional}
                            onChange={(v) => setField("terms.additional", v)}
                            placeholder="Optional extra terms."
                            rows={4}
                          />
                        </div>
                      </div>
                    ) : null}

                    {step === 4 ? (
                      <div className="space-y-4">
                        {guardrail.below ? (
                          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                            <div className="flex items-start gap-3">
                              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-orange-900">Margin guardrail warning</div>
                                <div className="mt-1 text-xs font-semibold text-orange-900/70">
                                  Current margin is {fmtPct(guardrail.current)} and minimum is {fmtPct(guardrail.min)}.
                                  {guardrail.sendBlocked ? " Sending is blocked." : " You may send with an override reason."}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                              >
                                Fix pricing
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Send settings</div>
                            </div>
                            <Badge tone="slate">Premium</Badge>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div>
                              <FieldLabel>Channel</FieldLabel>
                              <SelectBox
                                value={draft.client.channel}
                                onChange={(v) => setField("client.channel", v)}
                                options={[
                                  { label: "EVzone Messages", value: "EVzone Messages" },
                                  { label: "Email", value: "Email" },
                                  { label: "WhatsApp", value: "WhatsApp" },
                                ]}
                              />
                            </div>
                            <div>
                              <FieldLabel>Contract type</FieldLabel>
                              <SelectBox
                                value={draft.premium.contractType}
                                onChange={(v) => setField("premium.contractType", v)}
                                options={[
                                  { label: "Standard Service Contract", value: "Standard Service Contract" },
                                  { label: "Milestones Contract", value: "Milestones Contract" },
                                  { label: "Retainer Contract", value: "Retainer Contract" },
                                ]}
                              />
                            </div>
                            <div>
                              <FieldLabel>Auto convert</FieldLabel>
                              <SelectBox
                                value={draft.premium.autoConvertToContract ? "yes" : "no"}
                                onChange={(v) => setField("premium.autoConvertToContract", v === "yes")}
                                options={[
                                  { label: "Yes", value: "yes" },
                                  { label: "No", value: "no" },
                                ]}
                              />
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => setContractOpen(true)}
                              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-extrabold text-orange-800"
                            >
                              <FileText className="h-5 w-5" />
                              Generate contract draft
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(contractText);
                                pushToast({ title: "Copied", message: "Contract draft copied.", tone: "success" });
                              }}
                              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-extrabold text-slate-800"
                            >
                              <Copy className="h-5 w-5" />
                              Copy contract
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black text-slate-900">Preview summary</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">High signal overview before you send.</div>
                            </div>
                            <Badge tone="slate">{draft.meta.currency}</Badge>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                              <div className="text-[11px] font-extrabold text-slate-600">Client</div>
                              <div className="mt-1 truncate text-sm font-black text-slate-900">{draft.client.name || "-"}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">{draft.client.org || ""}</div>
                            </div>
                            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                              <div className="text-[11px] font-extrabold text-slate-600">Total</div>
                              <div className="mt-1 text-sm font-black text-slate-900">{fmtMoney(totals.total, draft.meta.currency)}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Margin {fmtPct(Math.round((totals.margin || 0) * 100))}</div>
                            </div>
                            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                              <div className="text-[11px] font-extrabold text-slate-600">Timeline</div>
                              <div className="mt-1 text-sm font-black text-slate-900">{draft.timeline.durationDays} day(s)</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Start {draft.timeline.startDate}</div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Badge tone={completed[0] ? "green" : "orange"}>Scope</Badge>
                            <Badge tone={completed[1] ? "green" : "orange"}>Pricing</Badge>
                            <Badge tone={completed[2] ? "green" : "orange"}>Timeline</Badge>
                            <Badge tone={completed[3] ? "green" : "orange"}>Terms</Badge>
                            <span className="ml-auto flex items-center gap-2">
                              <Badge tone="slate">Template</Badge>
                              <div className="text-xs font-semibold text-slate-600">
                                {TEMPLATE_LIBRARY.find((t) => t.id === draft.premium.templateId)?.name || "Custom"}
                              </div>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              pushToast({ title: "Preview", message: "Wire preview PDF generation here.", tone: "default" });
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Download className="h-4 w-4" />
                            Export PDF
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (sendDisabled) {
                                pushToast({ title: "Cannot send yet", message: "Complete required steps and resolve guardrails.", tone: "warning" });
                                return;
                              }
                              sendQuote();
                            }}
                            disabled={sendDisabled}
                            className={cx(
                              "ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white transition",
                              sendDisabled ? "cursor-not-allowed opacity-60" : "hover:shadow-[0_18px_50px_rgba(3,205,140,0.22)]"
                            )}
                            style={{ background: TOKENS.green }}
                          >
                            {draft.client.channel === "Email" ? <Mail className="h-4 w-4" /> : draft.client.channel === "WhatsApp" ? <Globe className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                            Send quote
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200/70 bg-white dark:bg-slate-900/80 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800",
                      step === 0 && "opacity-60"
                    )}
                    disabled={step === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800",
                      step === steps.length - 1 && "opacity-60"
                    )}
                    disabled={step === steps.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <Badge tone="slate">Revenue {fmtMoney(totals.revenue, draft.meta.currency)}</Badge>
                    <Badge tone="slate">Total {fmtMoney(totals.total, draft.meta.currency)}</Badge>
                    {guardrail.below ? <Badge tone="danger">Below min margin</Badge> : <Badge tone="green">Margin OK</Badge>}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Side panel */}
          <div className="lg:col-span-4">
            <div className="space-y-4">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Quote health</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Completion, margin, and readiness</div>
                  </div>
                  <Badge tone="slate">Premium</Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    { label: "Scope ready", ok: completed[0] },
                    { label: "Pricing ready", ok: completed[1] },
                    { label: "Timeline ready", ok: completed[2] },
                    { label: "Terms ready", ok: completed[3] },
                  ].map((x) => (
                    <div key={x.label} className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                      <div className={cx("grid h-9 w-9 place-items-center rounded-2xl", x.ok ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>
                        {x.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-slate-900">{x.label}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{x.ok ? "Completed" : "Needs attention"}</div>
                      </div>
                      {x.ok ? <Badge tone="green">OK</Badge> : <Badge tone="orange">Fix</Badge>}
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Margin</div>
                    <span className="ml-auto"><ScorePill pct={Math.round((totals.margin || 0) * 100)} warnAt={guardrail.min} /></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    Minimum {fmtPct(guardrail.min)}. {guardrail.enforcing ? "Enforced" : "Not enforced"}.
                  </div>
                  {guardrail.below ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-700" />
                        <div>
                          <div className="text-xs font-extrabold text-rose-900">Below minimum margin</div>
                          <div className="mt-1 text-[11px] font-semibold text-rose-900/70">Adjust markup or provide an override reason.</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                      <div className="flex items-start gap-2">
                        <CheckCheck className="mt-0.5 h-4 w-4 text-emerald-700" />
                        <div>
                          <div className="text-xs font-extrabold text-emerald-900">Ready to send</div>
                          <div className="mt-1 text-[11px] font-semibold text-emerald-900/70">Margin meets the policy threshold.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Premium actions</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Speed, trust, conversion</div>
                  </div>
                  <Badge tone="slate">Pro</Badge>
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setTplOpen(true)}
                    className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <Wand2 className="h-4 w-4 text-slate-700" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900">Template library</div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-500">Apply a proposal template in one click.</div>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      pushToast({ title: "Saved as template", message: "Wire save-to-template in provider settings.", tone: "default" });
                    }}
                    className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <Save className="h-4 w-4 text-slate-700" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900">Save as template</div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-500">Reuse your best performing quotes.</div>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setContractOpen(true)}
                    className="flex items-center gap-3 rounded-3xl border border-orange-200 bg-orange-50/60 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900 text-orange-700">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-orange-900">Convert to contract</div>
                      <div className="mt-0.5 text-xs font-semibold text-orange-900/70">Generate contract draft from this quote.</div>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-orange-700" />
                  </button>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Templates drawer */}
      <Drawer
        open={tplOpen}
        title="Quote templates"
        subtitle="Premium templates to speed up quoting"
        onClose={() => setTplOpen(false)}
      >
        <div className="grid gap-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                <Wand2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">Templates library</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Select a template to prefill scope, pricing, timeline and terms.</div>
              </div>
              <Badge tone="slate">Premium</Badge>
            </div>
          </div>

          {TEMPLATE_LIBRARY.map((t) => {
            const active = draft.premium?.templateId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  applyTemplate(t.id);
                  setTplOpen(false);
                }}
                className={cx(
                  "rounded-3xl border p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                  active ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900/70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", active ? "bg-white dark:bg-slate-900 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className={cx("text-sm font-black", active ? "text-emerald-900" : "text-slate-900")}>{t.name}</div>
                      {t.badge ? <Badge tone={t.badge === "Premium" ? "orange" : "slate"}>{t.badge}</Badge> : null}
                      {active ? <span className="ml-auto"><Badge tone="green">Active</Badge></span> : <span className="ml-auto"><ChevronRight className="h-4 w-4 text-slate-300" /></span>}
                    </div>
                    <div className={cx("mt-1 text-xs font-semibold", active ? "text-emerald-900/70" : "text-slate-500")}>{t.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-orange-900">Premium idea</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">Add per-service templates and team approval routing later.</div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Contract drawer */}
      <Drawer
        open={contractOpen}
        title="Contract draft"
        subtitle="Generated from your quote - review before sending"
        onClose={() => setContractOpen(false)}
        tone="dark"
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-white/10 bg-white dark:bg-slate-900/5 p-4 text-white">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <div className="text-sm font-black">{draft.premium?.contractType || "Standard Service Contract"}</div>
              <span className="ml-auto"><Badge tone="orange">Draft</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-white/70">This is a draft preview. Wire it to your real contract engine.</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white dark:bg-slate-900/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  safeCopy(contractText);
                  pushToast({ title: "Copied", message: "Contract text copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-900"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Wire export to PDF/DOCX.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white dark:bg-slate-900/10 px-3 py-2 text-xs font-extrabold text-white"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => {
                  pushToast({ title: "Contract created", message: "Contract record created (demo).", tone: "success" });
                  setContractOpen(false);
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <CheckCheck className="h-4 w-4" />
                Create contract
              </button>
            </div>

            <pre className="mt-3 max-h-[52vh] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/85">
{contractText}
            </pre>
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
