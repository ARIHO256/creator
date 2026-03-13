import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  HelpCircle,
  Info,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Clock,
} from "lucide-react";

/**
 * Support Center (Previewable)
 * Route: /support
 * Core:
 * - Tickets
 * - Knowledge base
 * - Contact support
 * Super premium:
 * - Guided troubleshooting
 * - Category playbooks
 *
 * Notes:
 * - Actions stay local until backend workflows are added.
 * - Styling aligned to EVzone (green primary, orange accent).
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

function Chip({ active, onClick, children, tone = "green" }) {
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
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[760px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function statusTone(status) {
  if (status === "Operational") return { tone: "green", icon: ShieldCheck };
  if (status === "Degraded") return { tone: "orange", icon: AlertTriangle };
  return { tone: "danger", icon: AlertTriangle };
}

function ticketTone(status) {
  if (status === "Open") return "orange";
  if (status === "Waiting on support") return "slate";
  if (status === "Waiting on you") return "danger";
  if (status === "Resolved") return "green";
  return "slate";
}

function priorityTone(p) {
  if (p === "Critical") return "danger";
  if (p === "High") return "orange";
  return "slate";
}

function buildStatus() {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();

  return {
    overall: "Operational",
    services: [
      { key: "core", name: "Core API", status: "Operational", updatedAt: ago(10) },
      { key: "pay", name: "Payments", status: "Operational", updatedAt: ago(16) },
      { key: "msg", name: "Messaging", status: "Degraded", updatedAt: ago(22) },
      { key: "mldz", name: "MyLiveDealz Live", status: "Operational", updatedAt: ago(8) },
      { key: "hooks", name: "Webhooks", status: "Operational", updatedAt: ago(12) },
    ],
    incidents: [
      {
        id: "INC-1907",
        title: "Messaging delays on WhatsApp",
        severity: "Minor",
        startedAt: ago(55),
        status: "Investigating",
        summary: "Some outbound messages are delayed. Delivery may take longer than usual.",
      },
      {
        id: "INC-1906",
        title: "Short link redirect latency",
        severity: "Minor",
        startedAt: ago(240),
        status: "Monitoring",
        summary: "Redirect performance improved. Continuing to monitor.",
      },
    ],
  };
}

function buildArticles() {
  const now = Date.now();
  const ago = (h) => new Date(now - h * 3600_000).toISOString();

  return [
    {
      id: "KB-101",
      title: "How to reset your payout method",
      category: "Finance",
      tags: ["payouts", "wallet", "bank"],
      excerpt: "Update payout details, verify ownership, and avoid settlement delays.",
      updatedAt: ago(18),
      body:
        "This guide shows how to update your payout method. Go to Settings > Payout Methods, select the method, update details, and complete verification. If the method is rejected, review name matches, country rules, and required documents.\n\nTroubleshooting tips:\n- Ensure account name matches legal name\n- Confirm bank supports international transfers\n- If CorporatePay is used, confirm organization approvals",
    },
    {
      id: "KB-102",
      title: "Orders stuck in Confirmed",
      category: "Orders",
      tags: ["orders", "fulfillment", "sla"],
      excerpt: "Fix common blockers: stock holds, missing tracking, and warehouse batching.",
      updatedAt: ago(7),
      body:
        "If orders stay Confirmed, check: stock reservation, packing task assignment, and shipping profile. Add tracking when shipped, and upload proofs to reduce disputes.\n\nRecommended checks:\n- Inventory available >= ordered qty\n- Warehouse wave created\n- Shipping label generated",
    },
    {
      id: "KB-103",
      title: "Payment failed but customer was charged",
      category: "Payments",
      tags: ["payments", "charge", "reversal"],
      excerpt: "When to wait, when to refund, and how to gather evidence.",
      updatedAt: ago(30),
      body:
        "Most payment rails will auto-reverse pending charges within a short window. If a charge is captured, create a ticket and include the transaction reference.\n\nWhat to collect:\n- Order ID\n- Payment reference\n- Time of transaction\n- Screenshot from bank or wallet",
    },
    {
      id: "KB-104",
      title: "Connect WhatsApp Business API",
      category: "Integrations",
      tags: ["whatsapp", "api", "templates"],
      excerpt: "Setup basics, template approvals, and webhook verification.",
      updatedAt: ago(50),
      body:
        "To connect WhatsApp Business API, configure your provider, set webhooks, and verify callback URLs. Use approved templates for outbound notifications.\n\nChecklist:\n- Verify webhook URL\n- Confirm phone number status\n- Test template send",
    },
    {
      id: "KB-105",
      title: "MyLiveDealz Live: stream health checklist",
      category: "MyLiveDealz",
      tags: ["live", "stream", "latency"],
      excerpt: "Reduce buffering and improve stability with preflight checks.",
      updatedAt: ago(12),
      body:
        "Before going live, check upload bandwidth, camera permissions, and destination keys. Use the preflight checklist and test a short private stream.\n\nPreflight:\n- Upload speed >= 5 Mbps\n- Correct ingest key\n- Test audio",
    },
  ];
}

function buildPlaybooks() {
  return [
    {
      id: "PB-ORD-01",
      title: "Orders: Missing tracking after shipped",
      category: "Orders",
      level: "P1",
      goal: "Prevent disputes by updating tracking and uploading proofs.",
      triggers: ["Order Shipped status set", "Tracking blank", "Buyer asks for tracking"],
      checklist: [
        "Confirm carrier and tracking number",
        "Upload shipping label as proof",
        "Send buyer an ETA update",
        "If tracking invalid: verify label generation and resubmit",
      ],
      escalateWhen: ["Buyer opens dispute", "Carrier cannot find tracking after 24h"],
      templates: [
        "Update: Your order has shipped. Tracking: {tracking}. ETA: {eta}.",
        "We are verifying tracking with the carrier. We will update you within 2 hours.",
      ],
    },
    {
      id: "PB-PAY-01",
      title: "Payments: Charge captured but order not created",
      category: "Payments",
      level: "P0",
      goal: "Recover order state or initiate refund safely.",
      triggers: ["Buyer reports charge", "No order record", "Webhook delay"],
      checklist: [
        "Ask for payment reference",
        "Check payment events timeline",
        "If captured: create manual order or refund",
        "If pending: wait for auto-reversal window",
      ],
      escalateWhen: ["Captured with no reconciliation", "Multiple failures for same buyer"],
      templates: [
        "Thanks. Please share the payment reference and time. We will reconcile and respond shortly.",
        "We confirmed the charge. We are restoring the order or processing a refund within {timeWindow}.",
      ],
    },
    {
      id: "PB-SEC-01",
      title: "Account: Suspicious login",
      category: "Security",
      level: "P1",
      goal: "Secure account access and protect payouts.",
      triggers: ["New device session", "Unusual location", "Multiple failed logins"],
      checklist: [
        "Enable 2FA",
        "Revoke unknown device sessions",
        "Rotate API keys and webhooks secret",
        "Review payout settings and locks",
      ],
      escalateWhen: ["Unauthorized payout attempt", "Admin role changed unexpectedly"],
      templates: [
        "We detected unusual sign-in activity. Please enable 2FA and confirm your recent sessions.",
        "We have locked payout changes until verification is completed.",
      ],
    },
    {
      id: "PB-MLDZ-01",
      title: "MyLiveDealz Live: stream buffering",
      category: "MyLiveDealz",
      level: "P2",
      goal: "Stabilize stream by reducing bitrate and verifying ingest.",
      triggers: ["Buffering reported", "High latency", "Dropped frames"],
      checklist: [
        "Run preflight network test",
        "Lower bitrate and resolution",
        "Confirm ingest key and destination",
        "Restart stream with safe settings",
      ],
      escalateWhen: ["Multiple creators impacted", "Platform incident open"],
      templates: [
        "Tip: reduce bitrate to 2500 kbps and switch to 720p for stability.",
        "We are checking stream health. Please restart with safe settings and confirm if it improves.",
      ],
    },
  ];
}

function buildTickets() {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();
  const inM = (m) => new Date(now + m * 60_000).toISOString();

  return [
    {
      id: "SUP-41021",
      subject: "WhatsApp messages delayed",
      category: "Integrations",
      priority: "High",
      status: "Open",
      createdAt: ago(120),
      updatedAt: ago(18),
      channel: "WhatsApp",
      slaDueAt: inM(240),
      last: "Outbound templates are delayed by 10-20 minutes.",
      conversation: [
        { id: "m1", from: "you", at: ago(120), text: "We are seeing message delays on WhatsApp. Please advise." },
        { id: "m2", from: "support", at: ago(18), text: "Thanks. We are investigating. Can you share example message IDs and timestamps?" },
      ],
      meta: { org: "EVzone Supplier", region: "Africa", product: "Messaging" },
    },
    {
      id: "SUP-41020",
      subject: "Order charged but not created",
      category: "Payments",
      priority: "Critical",
      status: "Waiting on you",
      createdAt: ago(300),
      updatedAt: ago(70),
      channel: "EVzone",
      slaDueAt: inM(60),
      last: "Need the payment reference to reconcile.",
      conversation: [
        { id: "m1", from: "support", at: ago(70), text: "Please share the payment reference and time of transaction." },
      ],
      meta: { org: "EVzone Supplier", region: "Global", product: "Payments" },
    },
    {
      id: "SUP-41018",
      subject: "Cannot update payout method",
      category: "Finance",
      priority: "Normal",
      status: "Waiting on support",
      createdAt: ago(960),
      updatedAt: ago(420),
      channel: "Portal",
      slaDueAt: inM(900),
      last: "We are reviewing your document upload." ,
      conversation: [
        { id: "m1", from: "you", at: ago(960), text: "My payout method update fails after verification." },
        { id: "m2", from: "support", at: ago(420), text: "We received your request. We are reviewing the documents." },
      ],
      meta: { org: "EVzone Supplier", region: "Asia", product: "Payouts" },
    },
    {
      id: "SUP-41012",
      subject: "Orders stuck in Confirmed",
      category: "Orders",
      priority: "Normal",
      status: "Resolved",
      createdAt: ago(2880),
      updatedAt: ago(1600),
      channel: "API",
      slaDueAt: inM(9999),
      last: "Resolved after warehouse wave creation.",
      conversation: [
        { id: "m1", from: "you", at: ago(2880), text: "Multiple orders stuck in Confirmed for hours." },
        { id: "m2", from: "support", at: ago(1600), text: "Resolved. Warehouse wave batching was not created. Please retry." },
      ],
      meta: { org: "EVzone Supplier", region: "Africa", product: "Orders" },
    },
  ];
}

function minutesUntil(iso) {
  const v = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  return v;
}

function slaBadge(slaDueAt) {
  const m = minutesUntil(slaDueAt);
  if (!Number.isFinite(m)) return { label: "SLA -", tone: "slate" };
  if (m <= 0) return { label: "SLA overdue", tone: "danger" };
  if (m <= 120) return { label: "SLA < 2h", tone: "danger" };
  if (m <= 480) return { label: "SLA < 8h", tone: "orange" };
  return { label: "SLA ok", tone: "slate" };
}

function SegTab({ label, active, onClick, tone = "green" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active
          ? tone === "orange"
            ? "border-orange-200 bg-orange-50 text-orange-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {label}
    </button>
  );
}

function MiniBar({ value, tone = "green" }) {
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

function EmptyState({ title, message, action }) {
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

function TicketRow({ t, active, onOpen, onCopy, onQuickClose }) {
  const sla = slaBadge(t.slaDueAt);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "w-full text-left px-4 py-4 transition",
        active ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{t.subject}</div>
            <Badge tone={ticketTone(t.status)}>{t.status}</Badge>
            <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
            <Badge tone="slate">{t.category}</Badge>
            <Badge tone={sla.tone}>{sla.label}</Badge>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-700" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {t.last}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="slate">{t.id}</Badge>
            <Badge tone="slate">{t.channel}</Badge>
            <span className="text-[11px] font-semibold text-slate-500">Updated {fmtTime(t.updatedAt)}</span>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy();
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickClose();
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function ArticleCard({ a, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-black text-slate-900">{a.title}</div>
            <span className="ml-auto"><Badge tone="slate">{a.category}</Badge></span>
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">Updated {fmtTime(a.updatedAt)}</div>
          <div className="mt-2 text-sm font-semibold text-slate-700" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {a.excerpt}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(a.tags || []).slice(0, 3).map((t) => (
              <Badge key={t} tone="slate">{t}</Badge>
            ))}
            <span className="ml-auto inline-flex items-center gap-2 text-[11px] font-extrabold text-slate-500">
              Read
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function PlaybookCard({ p, onOpen }) {
  const lvlTone = p.level === "P0" ? "danger" : p.level === "P1" ? "orange" : "slate";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      <div className="flex items-start gap-3">
        <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", lvlTone === "danger" ? "bg-rose-50 text-rose-700" : lvlTone === "orange" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-black text-slate-900">{p.title}</div>
            <span className="ml-auto"><Badge tone={lvlTone}>{p.level}</Badge></span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone="slate">{p.category}</Badge>
            <Badge tone="slate">{p.id}</Badge>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-700" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {p.goal}
          </div>
          <div className="mt-3 text-[11px] font-semibold text-slate-500">Triggers: {(p.triggers || []).slice(0, 2).join(", ")}{p.triggers?.length > 2 ? "…" : ""}</div>
        </div>
      </div>
    </button>
  );
}

function StepPill({ idx, title, active, done, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <span className={cx("grid h-6 w-6 place-items-center rounded-xl border", done ? "border-emerald-200 bg-white dark:bg-slate-900" : "border-slate-200/70 bg-white dark:bg-slate-900")}>
        {done ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <span className="text-[11px] font-black text-slate-700">{idx + 1}</span>}
      </span>
      <span className="truncate">{title}</span>
    </button>
  );
}

function computeTicketStats(tickets) {
  const open = tickets.filter((t) => t.status === "Open" || t.status === "Waiting on support" || t.status === "Waiting on you").length;
  const urgent = tickets.filter((t) => t.priority === "Critical" || t.priority === "High").length;
  const waitingYou = tickets.filter((t) => t.status === "Waiting on you").length;
  const resolved = tickets.filter((t) => t.status === "Resolved").length;
  return { open, urgent, waitingYou, resolved };
}

export default function SupportCenterPage() {
  const location = useLocation();
  const [toasts, setToasts] = useState([]);
  const pushToast = (t) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id) => setToasts((s) => s.filter((x) => x.id !== id));

  const [status, setStatus] = useState({ overall: "Operational", services: [], incidents: [] });
  const [tickets, setTickets] = useState([]);
  const [articles, setArticles] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const mapTicketStatus = (value) => {
      const statusValue = String(value || "OPEN").toUpperCase();
      if (statusValue === "RESOLVED" || statusValue === "CLOSED") return "Resolved";
      if (statusValue === "WAITING") return "Waiting on support";
      if (statusValue === "ESCALATED") return "Waiting on support";
      return "Open";
    };
    const mapSeverity = (value) => {
      const sev = String(value || "medium").toLowerCase();
      if (sev === "critical") return "Critical";
      if (sev === "high") return "High";
      return "Normal";
    };
    const load = async () => {
      setLoading(true);
      try {
        const [statusPayload, contentPayload, helpPayload] = await Promise.all([
          sellerBackendApi.getStatusCenter(),
          sellerBackendApi.getHelpSupportContent(),
          sellerBackendApi.getSettingsHelp(),
        ]);
        if (cancelled) return;
        if (Array.isArray(statusPayload.providers) || Array.isArray(statusPayload.incidents)) {
          setStatus({
            overall: Array.isArray(statusPayload.incidents) && statusPayload.incidents.some((entry) => String(entry.status).toLowerCase() !== "resolved") ? "Degraded" : "Operational",
            services: Array.isArray(statusPayload.providers)
              ? statusPayload.providers.map((entry) => ({
                  key: String(entry.id ?? entry.name ?? makeId("svc")),
                  name: String(entry.name ?? "Service"),
                  status: String(entry.status ?? "Operational"),
                  updatedAt: String(entry.lastCheckAt ?? new Date().toISOString()),
                }))
              : [],
            incidents: Array.isArray(statusPayload.incidents)
              ? statusPayload.incidents.map((entry) => ({
                  id: String(entry.id ?? makeId("inc")),
                  title: String(entry.title ?? "Incident"),
                  severity: String(entry.severity ?? "Minor"),
                  startedAt: String(entry.updatedAt ?? new Date().toISOString()),
                  status: String(entry.status ?? "Investigating"),
                  summary: String(entry.summary ?? ""),
                }))
              : [],
          });
        }
        if (Array.isArray(contentPayload.kb)) {
          setArticles(
            contentPayload.kb.map((entry) => ({
              id: String(entry.id ?? makeId("kb")),
              title: String(entry.title ?? "Article"),
              category: String(entry.metadata?.category ?? entry.metadata?.module ?? "General"),
              tags: Array.isArray(entry.metadata?.tags) ? entry.metadata.tags : [],
              excerpt: String(entry.metadata?.excerpt ?? entry.body ?? ""),
              updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
              body: String(entry.body ?? ""),
            }))
          );
        }
        if (Array.isArray(contentPayload.tickets)) {
          setTickets(
            contentPayload.tickets.map((entry) => ({
              id: String(entry.id ?? makeId("SUP")),
              subject: String(entry.subject ?? "Support ticket"),
              category: String(entry.category ?? "Support"),
              priority: mapSeverity(entry.severity),
              status: mapTicketStatus(entry.status),
              createdAt: String(entry.createdAt ?? new Date().toISOString()),
              updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
              channel: String(entry.marketplace ?? "Portal"),
              slaDueAt: String(entry.lastResponseAt ?? entry.updatedAt ?? new Date().toISOString()),
              last: String(entry.ref ?? entry.subject ?? ""),
              conversation: [],
              meta: { org: "EVzone Supplier", region: "Global", product: entry.category ?? "Support" },
            }))
          );
        }
        if (Array.isArray(helpPayload.playbooks)) {
          setPlaybooks(helpPayload.playbooks);
        }
      } catch {
        setStatus({ overall: "Operational", services: [], incidents: [] });
        setTickets([]);
        setArticles([]);
        setPlaybooks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => computeTicketStats(tickets), [tickets]);

  const [tab, setTab] = useState("Tickets");

  // Tickets filters
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketStatus, setTicketStatus] = useState("All");
  const [ticketPriority, setTicketPriority] = useState("All");

  const filteredTickets = useMemo(() => {
    const q = ticketQuery.trim().toLowerCase();
    return [...tickets]
      .filter((t) => (ticketStatus === "All" ? true : t.status === ticketStatus))
      .filter((t) => (ticketPriority === "All" ? true : t.priority === ticketPriority))
      .filter((t) => {
        if (!q) return true;
        const hay = [t.id, t.subject, t.category, t.priority, t.status, t.channel, t.last].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tickets, ticketQuery, ticketStatus, ticketPriority]);

  const [activeTicketId, setActiveTicketId] = useState(() => tickets[0]?.id);
  useEffect(() => {
    if (!tickets.find((t) => t.id === activeTicketId)) setActiveTicketId(tickets[0]?.id);
  }, [tickets]);
  const activeTicket = useMemo(() => tickets.find((t) => t.id === activeTicketId) || null, [tickets, activeTicketId]);

  // KB filters
  const [kbQuery, setKbQuery] = useState("");
  const [kbCategory, setKbCategory] = useState("All");

  const kbCategories = useMemo(() => {
    const set = new Set(articles.map((a) => a.category));
    return ["All", ...Array.from(set)];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = kbQuery.trim().toLowerCase();
    return articles
      .filter((a) => (kbCategory === "All" ? true : a.category === kbCategory))
      .filter((a) => {
        if (!q) return true;
        const hay = [a.title, a.category, (a.tags || []).join(" "), a.excerpt, a.body].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [articles, kbQuery, kbCategory]);

  const [articleOpen, setArticleOpen] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState(null);
  const activeArticle = useMemo(() => articles.find((a) => a.id === activeArticleId) || null, [articles, activeArticleId]);

  // Ticket drawer
  const [ticketOpen, setTicketOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const replyRef = useRef(null);

  useEffect(() => {
    if (!ticketOpen) return;
    if (!activeTicket) return;
    setReplyDraft("");
    window.setTimeout(() => replyRef.current?.focus?.(), 60);
  }, [ticketOpen, activeTicket?.id]);

  const sendReply = async () => {
    if (!activeTicket) return;
    const text = replyDraft.trim();
    if (!text) {
      pushToast({ title: "Reply required", message: "Write a short message first.", tone: "warning" });
      return;
    }

    try {
      const thread = await sellerBackendApi.replyMessageThread(activeTicket.id, { text });
      const messages = Array.isArray(thread.messages) ? thread.messages : [];
      setTickets((prev) =>
        prev.map((t) =>
          t.id !== activeTicket.id
            ? t
            : {
                ...t,
                conversation: messages.map((message) => ({
                  id: String(message.id ?? makeId("msg")),
                  from: String(message.senderRole ?? "").toLowerCase() === "owner" ? "you" : "support",
                  at: String(message.createdAt ?? new Date().toISOString()),
                  text: String(message.body ?? ""),
                })),
                last: text,
                updatedAt: new Date().toISOString(),
                status: "Waiting on support",
              }
        )
      );
      setReplyDraft("");
      pushToast({ title: "Message sent", message: "Support has been notified.", tone: "success" });
    } catch (error) {
      pushToast({ title: "Reply failed", message: error instanceof Error ? error.message : "Unable to send reply", tone: "danger" });
    }
  };

  const closeTicket = async (id) => {
    try {
      await sellerBackendApi.patchSupportTicket(id, { status: "RESOLVED" });
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: "Resolved", updatedAt: new Date().toISOString() } : t)));
      pushToast({ title: "Ticket closed", message: "Marked as Resolved.", tone: "success" });
    } catch (error) {
      pushToast({ title: "Close failed", message: error instanceof Error ? error.message : "Unable to close ticket", tone: "danger" });
    }
  };

  // Contact support form
  const [contactCategory, setContactCategory] = useState("Orders");
  const [contactPriority, setContactPriority] = useState("Normal");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactChannel, setContactChannel] = useState("Portal");
  const [contactFiles, setContactFiles] = useState([]);
  const prefillKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const state = (location.state || {}) as {
      openTab?: string;
      contact?: {
        category?: string;
        priority?: string;
        subject?: string;
        message?: string;
        channel?: string;
      };
    };
    if (!state?.contact && !state?.openTab) return;
    if (prefillKeyRef.current === location.key) return;
    prefillKeyRef.current = location.key;
    if (state.openTab) setTab(state.openTab);
    if (state.contact?.category) setContactCategory(state.contact.category);
    if (state.contact?.priority) setContactPriority(state.contact.priority);
    if (state.contact?.subject) setContactSubject(state.contact.subject);
    if (state.contact?.message) setContactMessage(state.contact.message);
    if (state.contact?.channel) setContactChannel(state.contact.channel);
    pushToast({ title: "Support form ready", message: "Compliance request prefilled.", tone: "success" });
  }, [location.key, location.state, setTab]);
  const fileRef = useRef(null);

  const submitContact = async () => {
    const subj = contactSubject.trim();
    const msg = contactMessage.trim();
    if (!subj || !msg) {
      pushToast({ title: "Missing details", message: "Add subject and message.", tone: "warning" });
      return;
    }

    const id = `SUP-${Math.floor(41000 + Math.random() * 700)}`;
    const now = new Date().toISOString();

    const ticket = {
      id,
      subject: subj,
      category: contactCategory,
      priority: contactPriority,
      status: "Open",
      createdAt: now,
      updatedAt: now,
      channel: contactChannel,
      slaDueAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
      last: msg,
      conversation: [{ id: makeId("msg"), from: "you", at: now, text: msg }],
      meta: { org: "EVzone Supplier", region: "Global", product: contactCategory },
      attachments: contactFiles.map((f) => ({ id: makeId("att"), name: f.name, size: f.size })),
    };

    try {
      const created = await sellerBackendApi.createHelpSupportTicket({
        id,
        marketplace: contactChannel,
        category: contactCategory,
        subject: subj,
        severity: contactPriority.toLowerCase(),
        ref: msg,
      });
      setTickets((prev) => [
        {
          ...ticket,
          id: String(created.id ?? id),
          status: "Open",
        },
        ...prev,
      ]);
      setActiveTicketId(String(created.id ?? id));
      setTab("Tickets");
      pushToast({
        title: "Ticket created",
        message: `${created.id ?? id} created and added to your inbox.`,
        tone: "success",
        action: { label: "Open", onClick: () => setTicketOpen(true) },
      });
      setContactSubject("");
      setContactMessage("");
      setContactFiles([]);
    } catch (error) {
      pushToast({ title: "Ticket create failed", message: error instanceof Error ? error.message : "Unable to create ticket", tone: "danger" });
    }
  };

  // Troubleshooter (super premium)
  const TROUBLE_CATS = ["Payments", "Orders", "MyLiveDealz", "Integrations", "Security"]; // categories

  const troubleDefs = useMemo(
    () => ({
      Payments: {
        symptoms: [
          { key: "fail", label: "Payment failed" },
          { key: "charged", label: "Charged but no order" },
          { key: "refund", label: "Refund pending" },
        ],
        checks: [
          "Confirm payment reference and time",
          "Check if charge is pending or captured",
          "Verify webhooks and reconciliation",
          "If captured: create ticket with evidence",
        ],
        suggestions: [
          "If pending, wait for auto-reversal window.",
          "If captured, reconcile and restore order or refund.",
          "Collect: reference, timestamp, order ID, screenshot.",
        ],
      },
      Orders: {
        symptoms: [
          { key: "confirmed", label: "Stuck in Confirmed" },
          { key: "tracking", label: "Missing tracking" },
          { key: "cancel", label: "Cancellation error" },
        ],
        checks: [
          "Verify stock reservation",
          "Confirm warehouse wave creation",
          "Validate shipping profile",
          "Upload proofs and tracking",
        ],
        suggestions: [
          "Create a wave batch for the warehouse.",
          "Add tracking as soon as shipped.",
          "Send buyer ETA update to avoid disputes.",
        ],
      },
      MyLiveDealz: {
        symptoms: [
          { key: "buffer", label: "Stream buffering" },
          { key: "start", label: "Cannot start live" },
          { key: "replay", label: "Replay not processing" },
        ],
        checks: [
          "Run network test",
          "Verify ingest key",
          "Lower bitrate and resolution",
          "Retry with safe settings",
        ],
        suggestions: [
          "For stability, use 720p and reduce bitrate.",
          "Confirm camera and microphone permissions.",
          "If issue persists, attach logs and create ticket.",
        ],
      },
      Integrations: {
        symptoms: [
          { key: "webhook", label: "Webhook failed" },
          { key: "wa", label: "WhatsApp delivery delays" },
          { key: "api", label: "API errors" },
        ],
        checks: [
          "Confirm endpoint URL",
          "Verify signatures and secrets",
          "Check rate limits",
          "Retry with exponential backoff",
        ],
        suggestions: [
          "Verify the webhook callback URL and certificate.",
          "Confirm templates are approved for WhatsApp.",
          "Attach request IDs and timestamps to ticket.",
        ],
      },
      Security: {
        symptoms: [
          { key: "login", label: "Suspicious login" },
          { key: "2fa", label: "2FA setup issue" },
          { key: "roles", label: "Role changed unexpectedly" },
        ],
        checks: [
          "Enable 2FA",
          "Review sessions and revoke unknown devices",
          "Rotate API keys",
          "Lock payout changes until verified",
        ],
        suggestions: [
          "Enable 2FA now and review sessions.",
          "If roles changed, escalate immediately.",
          "Export audit logs and attach to ticket.",
        ],
      },
    }),
    []
  );

  const [tsStep, setTsStep] = useState(0);
  const [tsCategory, setTsCategory] = useState("Payments");
  const [tsSymptom, setTsSymptom] = useState("charged");
  const [tsEvidence, setTsEvidence] = useState({ orderId: "", reference: "", screenshot: false, logs: false });

  useEffect(() => {
    // reset symptom when category changes
    const def = troubleDefs[tsCategory];
    if (!def) return;
    if (!def.symptoms.find((s) => s.key === tsSymptom)) setTsSymptom(def.symptoms[0]?.key);
  }, [tsCategory]);

  const tsDef = troubleDefs[tsCategory] || troubleDefs.Payments;

  const createTicketFromTroubleshooter = () => {
    const summary = `Troubleshooter: ${tsCategory} - ${tsDef.symptoms.find((s) => s.key === tsSymptom)?.label || "Issue"}`;
    const evidence = `Order: ${tsEvidence.orderId || "-"} | Ref: ${tsEvidence.reference || "-"} | Screenshot: ${tsEvidence.screenshot ? "Yes" : "No"} | Logs: ${tsEvidence.logs ? "Yes" : "No"}`;

    setContactCategory(tsCategory);
    setContactPriority(tsCategory === "Payments" && tsSymptom === "charged" ? "Critical" : "High");
    setContactChannel("Portal");
    setContactSubject(summary);
    setContactMessage(`${tsDef.suggestions.join(" ")}\n\nEvidence: ${evidence}`);
    setTab("Contact Support");

    pushToast({ title: "Draft prepared", message: "We prefilled the support form from troubleshooting.", tone: "success" });
  };

  // Playbooks (super premium)
  const [pbQuery, setPbQuery] = useState("");
  const [pbCategory, setPbCategory] = useState("All");
  const pbCategories = useMemo(() => {
    const set = new Set(playbooks.map((p) => p.category));
    return ["All", ...Array.from(set)];
  }, [playbooks]);

  const filteredPlaybooks = useMemo(() => {
    const q = pbQuery.trim().toLowerCase();
    return playbooks
      .filter((p) => (pbCategory === "All" ? true : p.category === pbCategory))
      .filter((p) => {
        if (!q) return true;
        const hay = [p.title, p.category, p.id, p.goal, (p.triggers || []).join(" ")].join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [playbooks, pbQuery, pbCategory]);

  const [pbOpen, setPbOpen] = useState(false);
  const [activePbId, setActivePbId] = useState(null);
  const activePb = useMemo(() => playbooks.find((p) => p.id === activePbId) || null, [playbooks, activePbId]);
  const [pbRun, setPbRun] = useState({});

  useEffect(() => {
    if (!pbOpen) return;
    if (!activePb) return;
    const init = {};
    (activePb.checklist || []).forEach((_, idx) => (init[idx] = false));
    setPbRun(init);
  }, [pbOpen, activePb?.id]);

  const overall = useMemo(() => {
    const worst = (s) => (s === "Outage" ? 3 : s === "Degraded" ? 2 : 1);
    const max = Math.max(...status.services.map((s) => worst(s.status)));
    return max >= 3 ? "Outage" : max === 2 ? "Degraded" : "Operational";
  }, [status]);

  const overallTone = statusTone(overall);

  const bg =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Support Center</div>
                <Badge tone="slate">/support</Badge>
                <Badge tone="slate">Core</Badge>
                <Badge tone="orange">Super premium</Badge>
                {loading ? <Badge tone="slate">Loading</Badge> : <Badge tone="green">Backend</Badge>}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Tickets, knowledge base, contact support, guided troubleshooting, and category playbooks.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTab("Contact Support");
                  pushToast({ title: "New ticket", message: "Use Contact Support to create a ticket.", tone: "default" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New ticket
              </button>
              <button
                type="button"
                onClick={() => {
                  safeCopy(JSON.stringify({ tickets: tickets.length, open: stats.open, overall }, null, 2));
                  pushToast({ title: "Export", message: "Summary copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <BarChart3 className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => {
                  void Promise.all([
                    sellerBackendApi.getStatusCenter(),
                    sellerBackendApi.getHelpSupportContent(),
                    sellerBackendApi.getSettingsHelp(),
                  ])
                    .then(([statusPayload, contentPayload, helpPayload]) => {
                      setStatus({
                        overall:
                          Array.isArray(statusPayload.incidents) &&
                          statusPayload.incidents.some((entry) => String(entry.status).toLowerCase() !== "resolved")
                            ? "Degraded"
                            : "Operational",
                        services: Array.isArray(statusPayload.providers)
                          ? statusPayload.providers.map((entry) => ({
                              key: String(entry.id ?? entry.name ?? makeId("svc")),
                              name: String(entry.name ?? "Service"),
                              status: String(entry.status ?? "Operational"),
                              updatedAt: String(entry.lastCheckAt ?? new Date().toISOString()),
                            }))
                          : [],
                        incidents: Array.isArray(statusPayload.incidents)
                          ? statusPayload.incidents.map((entry) => ({
                              id: String(entry.id ?? makeId("inc")),
                              title: String(entry.title ?? "Incident"),
                              severity: String(entry.severity ?? "Minor"),
                              startedAt: String(entry.updatedAt ?? new Date().toISOString()),
                              status: String(entry.status ?? "Investigating"),
                              summary: String(entry.summary ?? ""),
                            }))
                          : [],
                      });
                      if (Array.isArray(contentPayload.kb)) {
                        setArticles(
                          contentPayload.kb.map((entry) => ({
                            id: String(entry.id ?? makeId("kb")),
                            title: String(entry.title ?? "Article"),
                            category: String(entry.metadata?.category ?? entry.metadata?.module ?? "General"),
                            tags: Array.isArray(entry.metadata?.tags) ? entry.metadata.tags : [],
                            excerpt: String(entry.metadata?.excerpt ?? entry.body ?? ""),
                            updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
                            body: String(entry.body ?? ""),
                          }))
                        );
                      }
                      if (Array.isArray(contentPayload.tickets)) {
                        setTickets(
                          contentPayload.tickets.map((entry) => ({
                            id: String(entry.id ?? makeId("SUP")),
                            subject: String(entry.subject ?? "Support ticket"),
                            category: String(entry.category ?? "Support"),
                            priority: mapSeverity(entry.severity),
                            status: mapTicketStatus(entry.status),
                            createdAt: String(entry.createdAt ?? new Date().toISOString()),
                            updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
                            channel: String(entry.marketplace ?? "Portal"),
                            slaDueAt: String(entry.lastResponseAt ?? entry.updatedAt ?? new Date().toISOString()),
                            last: String(entry.ref ?? entry.subject ?? ""),
                            conversation: [],
                            meta: { org: "EVzone Supplier", region: "Global", product: entry.category ?? "Support" },
                          }))
                        );
                      }
                      if (Array.isArray(helpPayload.playbooks)) {
                        setPlaybooks(helpPayload.playbooks);
                      }
                      pushToast({ title: "Refreshed", message: "Latest support data loaded.", tone: "success" });
                    })
                    .catch(() => {
                      pushToast({ title: "Refresh failed", message: "Could not reload support data.", tone: "warning" });
                    });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-4">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Open tickets</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.open}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">Waiting on you: {stats.waitingYou}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">High priority</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.urgent}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">Critical + High</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Resolved</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.resolved}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">This period</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", overallTone.tone === "green" ? "bg-emerald-50 text-emerald-700" : overallTone.tone === "orange" ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700")}>
                <overallTone.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">System status</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-xl font-black text-slate-900">{overall}</div>
                  <Badge tone={overallTone.tone}>{status.incidents.length} incident(s)</Badge>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">Based on service checks</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {["Tickets", "Knowledge Base", "Contact Support", "Guided Troubleshooting", "Playbooks"].map((t) => (
            <SegTab
              key={t}
              label={t}
              active={tab === t}
              onClick={() => setTab(t)}
              tone={t === "Guided Troubleshooting" || t === "Playbooks" ? "orange" : "green"}
            />
          ))}
          <span className="ml-auto hidden md:inline-flex items-center gap-2">
            <Badge tone="slate">Tip</Badge>
            <span className="text-xs font-semibold text-slate-500">Use troubleshooting to prefill tickets with evidence.</span>
          </span>
        </div>

        {/* Content */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Main */}
          <div className="lg:col-span-8">
            {tab === "Tickets" ? (
              <GlassCard className="overflow-hidden">
                <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Ticket inbox</div>
                      <Badge tone="slate">{filteredTickets.length} shown</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={ticketQuery}
                          onChange={(e) => setTicketQuery(e.target.value)}
                          placeholder="Search id, subject, category"
                          className="h-10 w-[min(520px,82vw)] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>
                      <div className="relative">
                        <select
                          value={ticketStatus}
                          onChange={(e) => setTicketStatus(e.target.value)}
                          className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                        >
                          {["All", "Open", "Waiting on support", "Waiting on you", "Resolved", "Closed"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                      <div className="relative">
                        <select
                          value={ticketPriority}
                          onChange={(e) => setTicketPriority(e.target.value)}
                          className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                        >
                          {["All", "Normal", "High", "Critical"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filteredTickets.map((t) => (
                    <TicketRow
                      key={t.id}
                      t={t}
                      active={t.id === activeTicketId}
                      onOpen={() => {
                        setActiveTicketId(t.id);
                        setTicketOpen(true);
                      }}
                      onCopy={() => {
                        safeCopy(t.id);
                        pushToast({ title: "Copied", message: "Ticket ID copied.", tone: "success" });
                      }}
                      onQuickClose={() => closeTicket(t.id)}
                    />
                  ))}

                  {filteredTickets.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        title="No tickets found"
                        message="Try clearing filters or create a new ticket from Contact Support."
                        action={{
                          label: "Create ticket",
                          onClick: () => setTab("Contact Support"),
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </GlassCard>
            ) : null}

            {tab === "Knowledge Base" ? (
              <div className="space-y-3">
                <GlassCard className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Knowledge base</div>
                      <Badge tone="slate">{filteredArticles.length}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={kbQuery}
                          onChange={(e) => setKbQuery(e.target.value)}
                          placeholder="Search articles, tags"
                          className="h-11 w-[min(520px,82vw)] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>

                      <div className="relative">
                        <select
                          value={kbCategory}
                          onChange={(e) => setKbCategory(e.target.value)}
                          className="h-11 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                        >
                          {kbCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {kbCategories.slice(0, 8).map((c) => (
                      <Chip key={c} active={kbCategory === c} onClick={() => setKbCategory(c)}>
                        {c}
                      </Chip>
                    ))}
                  </div>
                </GlassCard>

                <div className="grid gap-3">
                  {filteredArticles.map((a) => (
                    <ArticleCard
                      key={a.id}
                      a={a}
                      onOpen={() => {
                        setActiveArticleId(a.id);
                        setArticleOpen(true);
                      }}
                    />
                  ))}

                  {filteredArticles.length === 0 ? (
                    <EmptyState
                      title="No articles match"
                      message="Try a different search term or switch categories."
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            {tab === "Contact Support" ? (
              <div className="space-y-3">
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Contact support</div>
                    <span className="ml-auto"><Badge tone="slate">Creates a ticket</Badge></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    Provide a clear subject, steps to reproduce, and any references. Attachments remain local until backend uploads are added.
                  </div>
                </GlassCard>

                <GlassCard className="p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Category</div>
                      <div className="relative mt-2">
                        <select
                          value={contactCategory}
                          onChange={(e) => setContactCategory(e.target.value)}
                          className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                        >
                          {[
                            "Orders",
                            "Payments",
                            "Finance",
                            "Integrations",
                            "MyLiveDealz",
                            "Wholesale",
                            "Security",
                            "Other",
                          ].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Priority</div>
                      <div className="relative mt-2">
                        <select
                          value={contactPriority}
                          onChange={(e) => setContactPriority(e.target.value)}
                          className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                        >
                          {["Normal", "High", "Critical"].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Preferred channel</div>
                      <div className="relative mt-2">
                        <select
                          value={contactChannel}
                          onChange={(e) => setContactChannel(e.target.value)}
                          className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                        >
                          {["Portal", "Email", "WhatsApp"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Attachments</div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click?.()}
                          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          <Plus className="h-4 w-4" />
                          Add files
                        </button>
                        <input
                          ref={fileRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            setContactFiles((s) => [...files, ...s].slice(0, 6));
                            pushToast({ title: "Attached", message: `${files.length} file(s) added.`, tone: "success" });
                            e.currentTarget.value = "";
                          }}
                        />
                        <Badge tone="slate">{contactFiles.length} file(s)</Badge>
                      </div>
                      {contactFiles.length ? (
                        <div className="mt-2 space-y-2">
                          {contactFiles.map((f, idx) => (
                            <div key={`${f.name}_${idx}`} className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                              <FileText className="h-4 w-4 text-slate-600" />
                              <div className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{f.name}</div>
                              <button
                                type="button"
                                onClick={() => setContactFiles((s) => s.filter((_, i) => i !== idx))}
                                className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                                aria-label="Remove"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-[11px] font-extrabold text-slate-600">Subject</div>
                      <input
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        placeholder="Short summary of the issue"
                        className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-[11px] font-extrabold text-slate-600">Message</div>
                      <textarea
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        rows={7}
                        placeholder="Include steps to reproduce, IDs, references, expected vs actual"
                        className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setContactMessage((m) =>
                              m ||
                              "Steps:\n1) \n2) \n\nExpected:\n\nActual:\n\nReferences:"
                            );
                            pushToast({ title: "Template inserted", message: "Basic structure added.", tone: "default" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Sparkles className="h-4 w-4" />
                          Insert template
                        </button>

                        <button
                          type="button"
                          onClick={submitContact}
                          className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Send className="h-4 w-4" />
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Info className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Super premium tip</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">
                        Use Guided Troubleshooting first. It will prefill evidence and reduce back-and-forth.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "Guided Troubleshooting" ? (
              <div className="space-y-3">
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Guided troubleshooting</div>
                    <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    Follow steps, collect evidence, and generate a ticket-ready draft.
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { title: "Select issue", idx: 0 },
                      { title: "Confirm context", idx: 1 },
                      { title: "Recommended checks", idx: 2 },
                      { title: "Create draft", idx: 3 },
                    ].map((s) => (
                      <StepPill
                        key={s.idx}
                        idx={s.idx}
                        title={s.title}
                        active={tsStep === s.idx}
                        done={tsStep > s.idx}
                        onClick={() => setTsStep(s.idx)}
                      />
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tsStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.16 }}
                    >
                      {tsStep === 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Issue category</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {TROUBLE_CATS.map((c) => (
                                <Chip key={c} active={tsCategory === c} onClick={() => setTsCategory(c)}>
                                  {c}
                                </Chip>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Symptom</div>
                            <div className="mt-2 grid gap-2">
                              {(tsDef.symptoms || []).map((s) => (
                                <button
                                  key={s.key}
                                  type="button"
                                  onClick={() => setTsSymptom(s.key)}
                                  className={cx(
                                    "rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                                    tsSymptom === s.key ? "border-emerald-200" : "border-slate-200/70"
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                                      <AlertTriangle className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-black text-slate-900">{s.label}</div>
                                      <div className="mt-1 text-xs font-semibold text-slate-500">Recommended checks available</div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-300" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="md:col-span-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setTsStep(1)}
                              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {tsStep === 1 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">References</div>
                              <span className="ml-auto"><Badge tone="slate">Optional</Badge></span>
                            </div>
                            <div className="mt-3 grid gap-3">
                              <div>
                                <div className="text-[11px] font-extrabold text-slate-600">Order ID</div>
                                <input
                                  value={tsEvidence.orderId}
                                  onChange={(e) => setTsEvidence((s) => ({ ...s, orderId: e.target.value }))}
                                  placeholder="ORD-10512"
                                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                />
                              </div>
                              <div>
                                <div className="text-[11px] font-extrabold text-slate-600">Payment or request reference</div>
                                <input
                                  value={tsEvidence.reference}
                                  onChange={(e) => setTsEvidence((s) => ({ ...s, reference: e.target.value }))}
                                  placeholder="PAY-88421 or REQ-xxx"
                                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Evidence checklist</div>
                              <span className="ml-auto"><Badge tone="orange">Recommended</Badge></span>
                            </div>
                            <div className="mt-3 grid gap-2">
                              {[
                                { k: "screenshot", label: "I have a screenshot" },
                                { k: "logs", label: "I can provide logs or request IDs" },
                              ].map((x) => (
                                <button
                                  key={x.k}
                                  type="button"
                                  onClick={() => setTsEvidence((s) => ({ ...s, [x.k]: !s[x.k] }))}
                                  className={cx(
                                    "flex items-center justify-between rounded-3xl border bg-white dark:bg-slate-900 px-4 py-3 text-left text-sm font-extrabold transition",
                                    tsEvidence[x.k] ? "border-emerald-200 bg-emerald-50/60 text-emerald-800" : "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
                                  )}
                                >
                                  {x.label}
                                  {tsEvidence[x.k] ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 text-[11px] font-semibold text-slate-500">
                              Add screenshots or logs to speed up resolution.
                            </div>
                          </div>

                          <div className="md:col-span-2 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setTsStep(0)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={() => setTsStep(2)}
                              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {tsStep === 2 ? (
                        <div className="grid gap-3">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Recommended checks</div>
                              <span className="ml-auto"><Badge tone="slate">{tsCategory}</Badge></span>
                            </div>
                            <div className="mt-3 grid gap-2">
                              {(tsDef.checks || []).map((c) => (
                                <div key={c} className="flex items-start gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                                    <Check className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-black text-slate-900">{c}</div>
                                    <div className="mt-1 text-xs font-semibold text-slate-500">Run this check, then proceed.</div>
                                  </div>
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
                                <div className="text-sm font-black text-orange-900">Suggested actions</div>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                                  {(tsDef.suggestions || []).map((s) => (
                                    <li key={s}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setTsStep(1)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={() => setTsStep(3)}
                              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {tsStep === 3 ? (
                        <div className="grid gap-3">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Ticket draft</div>
                              <span className="ml-auto"><Badge tone="orange">Ready</Badge></span>
                            </div>
                            <div className="mt-2 text-xs font-semibold text-slate-500">We will prefill the Contact Support form for you.</div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                <div className="text-[11px] font-extrabold text-slate-600">Category</div>
                                <div className="mt-1 text-sm font-black text-slate-900">{tsCategory}</div>
                                <div className="mt-3 text-[11px] font-extrabold text-slate-600">Symptom</div>
                                <div className="mt-1 text-sm font-black text-slate-900">
                                  {tsDef.symptoms.find((s) => s.key === tsSymptom)?.label}
                                </div>
                              </div>
                              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                <div className="text-[11px] font-extrabold text-slate-600">Evidence</div>
                                <div className="mt-2 space-y-1 text-xs font-semibold text-slate-700">
                                  <div>Order ID: <span className="font-black">{tsEvidence.orderId || "-"}</span></div>
                                  <div>Reference: <span className="font-black">{tsEvidence.reference || "-"}</span></div>
                                  <div>Screenshot: <span className="font-black">{tsEvidence.screenshot ? "Yes" : "No"}</span></div>
                                  <div>Logs: <span className="font-black">{tsEvidence.logs ? "Yes" : "No"}</span></div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={createTicketFromTroubleshooter}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.green }}
                              >
                                <Send className="h-4 w-4" />
                                Continue to Contact Support
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  safeCopy(JSON.stringify({ category: tsCategory, symptom: tsSymptom, evidence: tsEvidence, suggestions: tsDef.suggestions }, null, 2));
                                  pushToast({ title: "Copied", message: "Troubleshooting bundle copied.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                                Copy bundle
                              </button>

                              <button
                                type="button"
                                onClick={() => setTsStep(2)}
                                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                              >
                                Back
                              </button>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                            <div className="flex items-start gap-3">
                              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                                <Clock className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-sm font-black text-orange-900">SLA suggestion</div>
                                <div className="mt-1 text-xs font-semibold text-orange-900/70">
                                  If this is blocking orders, choose High. If money is captured with no order, choose Critical.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  </AnimatePresence>
                </GlassCard>
              </div>
            ) : null}

            {tab === "Playbooks" ? (
              <div className="space-y-3">
                <GlassCard className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Category playbooks</div>
                      <Badge tone="orange">Super premium</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={pbQuery}
                          onChange={(e) => setPbQuery(e.target.value)}
                          placeholder="Search playbooks"
                          className="h-11 w-[min(520px,82vw)] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>
                      <div className="relative">
                        <select
                          value={pbCategory}
                          onChange={(e) => setPbCategory(e.target.value)}
                          className="h-11 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                        >
                          {pbCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {pbCategories.slice(0, 8).map((c) => (
                      <Chip key={c} active={pbCategory === c} onClick={() => setPbCategory(c)}>
                        {c}
                      </Chip>
                    ))}
                  </div>
                </GlassCard>

                <div className="grid gap-3">
                  {filteredPlaybooks.map((p) => (
                    <PlaybookCard
                      key={p.id}
                      p={p}
                      onOpen={() => {
                        setActivePbId(p.id);
                        setPbOpen(true);
                      }}
                    />
                  ))}

                  {filteredPlaybooks.length === 0 ? (
                    <EmptyState title="No playbooks" message="Try another search term or category." />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right rail */}
          <div className="lg:col-span-4">
            <div className="space-y-4">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">System reliability</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Service checks and incidents</div>
                  </div>
                  <Badge tone={overallTone.tone}>{overall}</Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {status.services.map((s) => {
                    const st = statusTone(s.status);
                    const Icon = st.icon;
                    return (
                      <div key={s.key} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                        <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", st.tone === "green" ? "bg-emerald-50 text-emerald-700" : st.tone === "orange" ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700")}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-slate-900 truncate">{s.name}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Updated {fmtTime(s.updatedAt)}</div>
                        </div>
                        <Badge tone={st.tone}>{s.status}</Badge>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Info className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Incidents</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">Open incidents appear here. Click to copy the incident ID.</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {status.incidents.slice(0, 3).map((inc) => (
                      <button
                        key={inc.id}
                        type="button"
                        onClick={() => {
                          safeCopy(inc.id);
                          pushToast({ title: "Incident copied", message: `${inc.id} copied.`, tone: "success" });
                        }}
                        className="w-full rounded-3xl border border-orange-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900 text-orange-700">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-black text-slate-900">{inc.title}</div>
                              <span className="ml-auto"><Badge tone="orange">{inc.status}</Badge></span>
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-600">{inc.severity} · Started {fmtTime(inc.startedAt)}</div>
                            <div className="mt-2 text-xs font-semibold text-slate-700" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {inc.summary}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Recommended</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Popular help articles</div>
                  </div>
                  <Badge tone="slate">KB</Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {articles.slice(0, 4).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setActiveArticleId(a.id);
                        setArticleOpen(true);
                      }}
                      className="flex w-full items-start justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-900">{a.title}</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-500">{a.category}</div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 text-slate-300" />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setTab("Knowledge Base")}
                  className="mt-4 w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Browse all articles
                </button>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Support tips</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Faster resolution</div>
                  </div>
                  <Badge tone="slate">Best practice</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {[{ k: "Add references", v: 80, tone: "green", note: "Order ID, reference, timestamps" }, { k: "Attach proof", v: 55, tone: "orange", note: "Screenshots, logs, labels" }, { k: "Use playbooks", v: 65, tone: "green", note: "Run checklists before opening ticket" }].map((x) => (
                    <div key={x.k} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-extrabold text-slate-700">{x.k}</div>
                        <Badge tone={x.tone}>{x.v}%</Badge>
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-500">{x.note}</div>
                      <MiniBar value={x.v} tone={x.tone} />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setTab("Guided Troubleshooting")}
                    className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    Run guided troubleshooting
                  </button>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket drawer */}
      <Drawer
        open={ticketOpen}
        title={activeTicket ? `Ticket ${activeTicket.id}` : "Ticket"}
        subtitle={activeTicket ? `${activeTicket.subject} · ${activeTicket.category} · ${activeTicket.priority}` : ""}
        onClose={() => setTicketOpen(false)}
      >
        {!activeTicket ? (
          <EmptyState title="No ticket" message="Select a ticket first." />
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-900">{activeTicket.subject}</div>
                    <Badge tone={ticketTone(activeTicket.status)}>{activeTicket.status}</Badge>
                    <Badge tone={priorityTone(activeTicket.priority)}>{activeTicket.priority}</Badge>
                    <span className="ml-auto"><Badge tone={slaBadge(activeTicket.slaDueAt).tone}>{slaBadge(activeTicket.slaDueAt).label}</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Created {fmtTime(activeTicket.createdAt)} · Updated {fmtTime(activeTicket.updatedAt)} · Channel {activeTicket.channel}</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(activeTicket.id);
                        pushToast({ title: "Copied", message: "Ticket ID copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy ID
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        pushToast({ title: "Escalation", message: "Escalation queued.", tone: "default" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Escalate
                    </button>

                    <button
                      type="button"
                      onClick={() => closeTicket(activeTicket.id)}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Check className="h-4 w-4" />
                      Mark resolved
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Conversation</div>
                <span className="ml-auto"><Badge tone="slate">{(activeTicket.conversation || []).length}</Badge></span>
              </div>

              <div className="mt-3 space-y-2">
                {(activeTicket.conversation || []).map((m) => (
                  <div key={m.id} className={cx("rounded-3xl border p-4", m.from === "you" ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900")}> 
                    <div className="flex items-center gap-2">
                      <Badge tone={m.from === "you" ? "green" : "slate"}>{m.from === "you" ? "You" : "Support"}</Badge>
                      <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(m.at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{m.text}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                <div className="text-[11px] font-extrabold text-slate-600">Reply</div>
                <textarea
                  ref={replyRef}
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  rows={5}
                  placeholder="Write a message to support..."
                  className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyDraft((d) => d || "Hello Support, here are the details and references. Thank you.");
                      pushToast({ title: "Draft inserted", message: "Safe default reply added.", tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Sparkles className="h-4 w-4" />
                    Insert draft
                  </button>

                  <button
                    type="button"
                    onClick={sendReply}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Playbook suggestion</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Open a category playbook to follow step-by-step checks.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTab("Playbooks")}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.orange }}
                    >
                      <ClipboardList className="h-4 w-4" />
                      Open playbooks
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("Guided Troubleshooting")}
                      className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                    >
                      <Sparkles className="h-4 w-4" />
                      Run troubleshooting
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Article drawer */}
      <Drawer
        open={articleOpen}
        title={activeArticle ? activeArticle.title : "Article"}
        subtitle={activeArticle ? `${activeArticle.id} · ${activeArticle.category} · Updated ${fmtTime(activeArticle.updatedAt)}` : ""}
        onClose={() => setArticleOpen(false)}
      >
        {!activeArticle ? (
          <EmptyState title="No article" message="Select an article first." />
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Summary</div>
                <span className="ml-auto"><Badge tone="slate">KB</Badge></span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-700">{activeArticle.excerpt}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="slate">{activeArticle.category}</Badge>
                {(activeArticle.tags || []).map((t) => (
                  <Badge key={t} tone="slate">{t}</Badge>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(`/support/kb/${activeArticle.id}`);
                    pushToast({ title: "Link copied", message: "Article route copied.", tone: "success" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Article</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">How-to steps and checklists</div>
                </div>
                <Badge tone="slate">Updated {fmtTime(activeArticle.updatedAt)}</Badge>
              </div>
              <pre className="mt-4 whitespace-pre-wrap rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4 text-sm font-semibold text-slate-800">
                {activeArticle.body}
              </pre>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Star className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-orange-900">Was this helpful?</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Feedback improves search relevance.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Thanks", message: "Marked helpful.", tone: "success" })}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Check className="h-4 w-4" />
                      Helpful
                    </button>
                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Noted", message: "Marked not helpful.", tone: "default" })}
                      className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                    >
                      <X className="h-4 w-4" />
                      Not helpful
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContactSubject(`Question about ${activeArticle.id}: ${activeArticle.title}`);
                        setContactMessage(`I reviewed ${activeArticle.id} but need help with: `);
                        setContactCategory(activeArticle.category);
                        setTab("Contact Support");
                        setArticleOpen(false);
                        pushToast({ title: "Draft started", message: "We prepared a ticket draft from the article.", tone: "success" });
                      }}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.orange }}
                    >
                      <Send className="h-4 w-4" />
                      Ask support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Playbook drawer */}
      <Drawer
        open={pbOpen}
        title={activePb ? activePb.title : "Playbook"}
        subtitle={activePb ? `${activePb.id} · ${activePb.category} · ${activePb.level}` : ""}
        onClose={() => setPbOpen(false)}
      >
        {!activePb ? (
          <EmptyState title="No playbook" message="Select a playbook first." />
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Goal</div>
                <span className="ml-auto"><Badge tone={activePb.level === "P0" ? "danger" : activePb.level === "P1" ? "orange" : "slate"}>{activePb.level}</Badge></span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-700">{activePb.goal}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="slate">{activePb.category}</Badge>
                {(activePb.triggers || []).slice(0, 4).map((t) => (
                  <Badge key={t} tone="slate">{t}</Badge>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Run checklist</div>
                <span className="ml-auto"><Badge tone="slate">Interactive</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {(activePb.checklist || []).map((c, idx) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPbRun((s) => ({ ...s, [idx]: !s[idx] }))}
                    className={cx(
                      "flex w-full items-start gap-3 rounded-3xl border p-4 text-left transition",
                      pbRun[idx] ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950"
                    )}
                  >
                    <span className={cx("grid h-9 w-9 place-items-center rounded-2xl border", pbRun[idx] ? "border-emerald-200 bg-white dark:bg-slate-900" : "border-slate-200/70 bg-white dark:bg-slate-900")}>
                      {pbRun[idx] ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={cx("text-sm font-black", pbRun[idx] ? "text-emerald-900" : "text-slate-900")}>{c}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Mark complete when done.</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-[11px] font-semibold text-slate-500">
                  Completed {Object.values(pbRun).filter(Boolean).length}/{(activePb.checklist || []).length}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const done = (Object.values(pbRun).filter(Boolean).length / Math.max(1, (activePb.checklist || []).length)) * 100;
                    pushToast({ title: "Checklist progress", message: `${Math.round(done)}% complete.`, tone: done >= 80 ? "success" : "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <BarChart3 className="h-4 w-4" />
                  Progress
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-orange-900">Escalate when</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                    {(activePb.escalateWhen || []).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    <div className="text-sm font-black text-orange-900">Templates</div>
                    <div className="mt-2 space-y-2">
                      {(activePb.templates || []).map((tpl) => (
                        <button
                          key={tpl}
                          type="button"
                          onClick={() => {
                            setReplyDraft(tpl);
                            setPbOpen(false);
                            setTicketOpen(true);
                            pushToast({ title: "Template loaded", message: "Loaded into ticket reply.", tone: "success" });
                          }}
                          className="w-full rounded-3xl border border-orange-200/70 bg-white dark:bg-slate-900/70 p-4 text-left text-xs font-extrabold text-orange-900 hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                          {tpl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setTab("Contact Support");
                setContactCategory(activePb.category);
                setContactSubject(`Playbook follow-up: ${activePb.title}`);
                setContactMessage(`I followed playbook ${activePb.id}. Completed steps: ${Object.values(pbRun).filter(Boolean).length}/${(activePb.checklist || []).length}.\n\nNeed help with:`);
                setPbOpen(false);
                pushToast({ title: "Draft prepared", message: "Contact Support form prefilled.", tone: "success" });
              }}
              className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              Create ticket from playbook
            </button>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
