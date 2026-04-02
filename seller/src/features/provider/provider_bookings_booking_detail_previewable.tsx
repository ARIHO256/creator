import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Filter,
  MessageCircle,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  User,
  Wallet,
  X,
  Sparkles,
} from "lucide-react";

/**
 * Provider Bookings (PREVIEWABLE)
 * Routes:
 * - /provider/bookings
 * - /provider/bookings/:id
 *
 * Core (Bookings): list + calendar, status pipeline, bulk actions
 * Super premium (Bookings): SLA timers, reschedule automation, checklist templates
 *
 * Core (Booking Detail): timeline, customer, deliverables, payment milestones
 * Super premium (Booking Detail): proof uploads, audit snippet, dispute prevention
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
  title: string;
  message?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
};
type SlaMeta = { state: "overdue" | "risk" | "watch" | "ok"; label: string; mins: number | null };
type ChecklistItem = { id: string; text: string; done: boolean };
type ChecklistTemplate = { id: string; name: string; note: string; tasks: string[] };
type Deliverable = { id: string; title: string; status: string };
type PaymentMilestone = { id: string; label: string; amount: number; status: string; dueAt: string };
type Proof = { id: string; name: string; uploadedAt: string; visibility: string };
type AuditEntry = { id: string; at: string; actor: string; action: string; detail: string };
type Booking = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  status: string;
  scheduledAt: string;
  durationMins: number;
  location: string;
  currency: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  responseDueAt: string | null;
  startDueAt: string | null;
  deliverables: Deliverable[];
  payment: { milestones: PaymentMilestone[] };
  checklistTemplateId: string | null;
  checklist: ChecklistItem[] | null;
  proofs: Proof[];
  audit: AuditEntry[];
  notes: string;
};
type RiskPrompt = {
  tone: "danger" | "orange" | "green";
  title: string;
  message: string;
  action: { label: string; onClick: () => void };
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtMoney(n, currency = "USD") {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function toYmd(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function minsUntil(iso, nowMs) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.round((t - nowMs) / 60000);
}

function humanizeMins(mins) {
  if (mins === null || mins === undefined) return "-";
  const sign = mins < 0 ? "-" : "";
  const a = Math.abs(mins);
  const h = Math.floor(a / 60);
  const m = a % 60;
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${m}m`;
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) {
    h = (h << 5) - h + String(str).charCodeAt(i);
    h |= 0;
  }
  return h;
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "";
  return `${String(first).toUpperCase()}${String(second).toUpperCase()}`.slice(0, 2);
}

function svgAvatar(label, seed) {
  const clean = String(label || "EV").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "EV";
  const hue = Math.abs(hashCode(seed || clean)) % 360;
  const bg1 = `hsl(${hue}, 70%, 52%)`;
  const bg2 = `hsl(${(hue + 24) % 360}, 70%, 45%)`;

  const svg = `\n    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">\n      <defs>\n        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n          <stop offset="0" stop-color="${bg1}"/>\n          <stop offset="1" stop-color="${bg2}"/>\n        </linearGradient>\n      </defs>\n      <rect width="64" height="64" rx="18" fill="url(#g)"/>\n      <circle cx="52" cy="14" r="7" fill="rgba(255,255,255,0.20)"/>\n      <text x="32" y="40" text-anchor="middle" font-family="system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;" font-size="18" font-weight="900" fill="rgba(255,255,255,0.96)">${clean}</text>\n    </svg>\n  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function avatarSrc(name) {
  return svgAvatar(initials(name), name);
}

function useHashRoute() {
  const get = () => {
    const raw = typeof window !== "undefined" ? window.location.hash : "";
    const path = raw.replace(/^#/, "");
    return path || "/provider/bookings";
  };

  const [path, setPath] = useState(get);

  useEffect(() => {
    const onHash = () => setPath(get());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (to) => {
    const cleaned = to.startsWith("/") ? to : `/${to}`;
    window.location.hash = cleaned;
  };

  return { path, navigate };
}

const STATUS_PIPE = ["All", "Requested", "Confirmed", "Scheduled", "In Progress", "Completed", "Cancelled", "Disputed"];

function statusTone(status) {
  if (status === "Completed") return "green";
  if (status === "Disputed") return "danger";
  if (status === "Cancelled") return "danger";
  if (status === "Requested") return "orange";
  if (status === "In Progress") return "orange";
  return "slate";
}

function slaTone(meta: SlaMeta | null) {
  if (!meta) return "slate";
  if (meta.state === "overdue") return "danger";
  if (meta.state === "risk") return "orange";
  if (meta.state === "watch") return "orange";
  return "green";
}

function computeSlaMeta(b: Booking, nowMs: number): SlaMeta | null {
  // SLA signals:
  // - Requested: must respond within responseDueAt
  // - Confirmed/Scheduled: must start by startDueAt
  if (b.status === "Requested" && b.responseDueAt) {
    const m = minsUntil(b.responseDueAt, nowMs);
    if (m === null) return null;
    if (m <= 0) return { state: "overdue", label: "Response overdue", mins: m };
    if (m <= 60) return { state: "risk", label: "Respond within 1h", mins: m };
    if (m <= 240) return { state: "watch", label: "Respond today", mins: m };
    return { state: "ok", label: "On track", mins: m };
  }

  if ((b.status === "Confirmed" || b.status === "Scheduled") && b.startDueAt) {
    const m = minsUntil(b.startDueAt, nowMs);
    if (m === null) return null;
    if (m <= 0) return { state: "overdue", label: "Start overdue", mins: m };
    if (m <= 120) return { state: "risk", label: "Starts soon", mins: m };
    if (m <= 720) return { state: "watch", label: "Starts today", mins: m };
    return { state: "ok", label: "On track", mins: m };
  }

  return { state: "ok", label: "On track", mins: null };
}

function buildTemplates(): ChecklistTemplate[] {
  return [
    {
      id: "tpl_install",
      name: "Installation Service Checklist",
      note: "For on-site installation and commissioning",
      tasks: [
        "Confirm site access and safety requirements",
        "Verify parts and tools",
        "Install and test equipment",
        "Capture photos and serial numbers",
        "Customer walk-through and sign-off",
      ],
    },
    {
      id: "tpl_consult",
      name: "Consultation Call Checklist",
      note: "For remote consultations and discovery",
      tasks: [
        "Confirm agenda and scope",
        "Collect requirements and constraints",
        "Share recommendations",
        "Send summary and next steps",
        "Schedule follow-up",
      ],
    },
    {
      id: "tpl_maint",
      name: "Maintenance Visit Checklist",
      note: "For inspection and preventive maintenance",
      tasks: [
        "Run diagnostics and health checks",
        "Replace worn consumables if needed",
        "Update firmware or settings",
        "Record test results",
        "Issue service report",
      ],
    },
  ];
}

function buildBookings(nowMs: number): Booking[] {
  const now = nowMs || Date.now();
  const inMins = (m) => new Date(now + m * 60_000).toISOString();
  const agoMins = (m) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "BK-20014",
      customerName: "Amina K.",
      customerEmail: "amina@example.com",
      customerPhone: "+256 700 000 111",
      serviceName: "EV Charger Installation",
      status: "Requested",
      scheduledAt: inMins(2400),
      durationMins: 120,
      location: "Kampala, UG",
      currency: "USD",
      price: 320,
      createdAt: agoMins(40),
      updatedAt: agoMins(18),
      responseDueAt: inMins(35),
      startDueAt: inMins(2400),
      deliverables: [
        { id: "d1", title: "Site survey notes", status: "Pending" },
        { id: "d2", title: "Installation photos", status: "Pending" },
        { id: "d3", title: "Commissioning report", status: "Pending" },
      ],
      payment: {
        milestones: [
          { id: "p1", label: "Deposit", amount: 120, status: "Unpaid", dueAt: inMins(120) },
          { id: "p2", label: "On completion", amount: 200, status: "Unpaid", dueAt: inMins(2600) },
        ],
      },
      checklistTemplateId: "tpl_install",
      checklist: null,
      proofs: [],
      audit: [
        { id: "a1", at: agoMins(40), actor: "System", action: "booking created", detail: "Channel: App" },
        { id: "a2", at: agoMins(18), actor: "System", action: "sla started", detail: "Response SLA initialized" },
      ],
      notes: "Customer requested evening slot if possible.",
    },
    {
      id: "BK-20013",
      customerName: "Kato S.",
      customerEmail: "kato@example.com",
      customerPhone: "+256 700 000 222",
      serviceName: "Consultation: Fleet Electrification",
      status: "Confirmed",
      scheduledAt: inMins(180),
      durationMins: 45,
      location: "Remote",
      currency: "USD",
      price: 190,
      createdAt: agoMins(600),
      updatedAt: agoMins(55),
      responseDueAt: null,
      startDueAt: inMins(180),
      deliverables: [
        { id: "d1", title: "Call summary", status: "Pending" },
        { id: "d2", title: "Recommendations PDF", status: "Pending" },
      ],
      payment: {
        milestones: [
          { id: "p1", label: "Booking fee", amount: 190, status: "Paid", dueAt: agoMins(580) },
        ],
      },
      checklistTemplateId: "tpl_consult",
      checklist: null,
      proofs: [],
      audit: [
        { id: "a1", at: agoMins(600), actor: "System", action: "booking created", detail: "Channel: Web" },
        { id: "a2", at: agoMins(55), actor: "Provider", action: "booking confirmed", detail: "Confirmed schedule" },
      ],
      notes: "Prefer Zoom. Share deck in advance.",
    },
    {
      id: "BK-20012",
      customerName: "Moses N.",
      customerEmail: "moses@example.com",
      customerPhone: "+256 700 000 333",
      serviceName: "Maintenance: Station Inspection",
      status: "Scheduled",
      scheduledAt: inMins(980),
      durationMins: 90,
      location: "Jinja, UG",
      currency: "USD",
      price: 240,
      createdAt: agoMins(2400),
      updatedAt: agoMins(220),
      responseDueAt: null,
      startDueAt: inMins(980),
      deliverables: [
        { id: "d1", title: "Inspection checklist", status: "Pending" },
        { id: "d2", title: "Service report", status: "Pending" },
      ],
      payment: {
        milestones: [
          { id: "p1", label: "Deposit", amount: 80, status: "Paid", dueAt: agoMins(2300) },
          { id: "p2", label: "On completion", amount: 160, status: "Unpaid", dueAt: inMins(1100) },
        ],
      },
      checklistTemplateId: "tpl_maint",
      checklist: null,
      proofs: [],
      audit: [
        { id: "a1", at: agoMins(2400), actor: "System", action: "booking created", detail: "Channel: WhatsApp" },
        { id: "a2", at: agoMins(220), actor: "Provider", action: "customer updated", detail: "Shared ETA" },
      ],
      notes: "Bring spare fuses.",
    },
    {
      id: "BK-20011",
      customerName: "Sarah T.",
      customerEmail: "sarah@example.com",
      customerPhone: "+256 700 000 444",
      serviceName: "EV Charger Installation",
      status: "In Progress",
      scheduledAt: agoMins(60),
      durationMins: 180,
      location: "Kampala, UG",
      currency: "USD",
      price: 420,
      createdAt: agoMins(5000),
      updatedAt: agoMins(25),
      responseDueAt: null,
      startDueAt: agoMins(60),
      deliverables: [
        { id: "d1", title: "Installation photos", status: "In progress" },
        { id: "d2", title: "Commissioning report", status: "Pending" },
      ],
      payment: {
        milestones: [
          { id: "p1", label: "Deposit", amount: 150, status: "Paid", dueAt: agoMins(4200) },
          { id: "p2", label: "On completion", amount: 270, status: "Unpaid", dueAt: inMins(240) },
        ],
      },
      checklistTemplateId: "tpl_install",
      checklist: null,
      proofs: [
        { id: "pf1", name: "SitePhoto_01.jpg", uploadedAt: agoMins(30), visibility: "internal" },
      ],
      audit: [
        { id: "a1", at: agoMins(5000), actor: "System", action: "booking created", detail: "Channel: App" },
        { id: "a2", at: agoMins(25), actor: "Provider", action: "status updated", detail: "Started work" },
      ],
      notes: "Customer requested minimal downtime.",
    },
    {
      id: "BK-20010",
      customerName: "Ibrahim H.",
      customerEmail: "ibrahim@example.com",
      customerPhone: "+256 700 000 555",
      serviceName: "Consultation: Charging Strategy",
      status: "Disputed",
      scheduledAt: agoMins(2880),
      durationMins: 60,
      location: "Remote",
      currency: "USD",
      price: 160,
      createdAt: agoMins(4000),
      updatedAt: agoMins(70),
      responseDueAt: null,
      startDueAt: null,
      deliverables: [
        { id: "d1", title: "Call summary", status: "Delivered" },
        { id: "d2", title: "Recommendations PDF", status: "Delivered" },
      ],
      payment: {
        milestones: [
          { id: "p1", label: "Booking fee", amount: 160, status: "Paid", dueAt: agoMins(3900) },
        ],
      },
      checklistTemplateId: "tpl_consult",
      checklist: null,
      proofs: [
        { id: "pf1", name: "Summary.pdf", uploadedAt: agoMins(2800), visibility: "buyer" },
      ],
      audit: [
        { id: "a1", at: agoMins(4000), actor: "System", action: "booking created", detail: "Channel: Web" },
        { id: "a2", at: agoMins(70), actor: "System", action: "dispute opened", detail: "Reason: Service quality" },
      ],
      notes: "Customer claims recommendations were unclear.",
    },
  ];
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
          ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children, accent = "green" }) {
  const activeCls =
    accent === "orange"
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

function ToastCenter({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[80] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: 10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
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

function Modal({ open, title, subtitle, children, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[75] max-h-[90vh] w-[92vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="border-b border-slate-200/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
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
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Drawer({ open, title, subtitle, children, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[92vw] max-w-[520px] border-l border-slate-200/70 bg-white dark:bg-slate-900/92 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
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

function EmptyState({ title, message, action }: { title: string; message: string; action?: { label: string; onClick: () => void } }) {
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

function CalendarMonth({ month, onMonthChange, selectedYmd, onSelectYmd, countsByYmd }) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(first);

  // Week starts Monday
  const dow = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - dow);

  const days = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const title = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-black text-slate-900">Calendar</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Previous month" onClick={() => onMonthChange(new Date(y, m - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <IconButton label="Next month" onClick={() => onMonthChange(new Date(y, m + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 gap-2 text-[11px] font-extrabold text-slate-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-1">{d}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {days.map((d) => {
              const inMonth = d.getMonth() === m;
              const ymd = toYmd(d);
              const selected = selectedYmd === ymd;
              const count = countsByYmd[ymd] || 0;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => onSelectYmd(ymd)}
                  className={cx(
                    "rounded-2xl border p-2 text-left transition",
                    selected
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200/70 bg-white dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800",
                    !inMonth && "opacity-55"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className={cx("text-xs font-black", selected ? "text-emerald-900" : "text-slate-900")}>{d.getDate()}</div>
                    {count ? <Badge tone="slate">{count}</Badge> : <span className="h-4 w-4" />}
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-slate-100">
                    <div
                      className="h-1 rounded-full"
                      style={{ width: `${Math.min(100, count * 22)}%`, background: TOKENS.green }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-orange-900">Reschedule automation</div>
            <div className="mt-1 text-xs font-semibold text-orange-900/70">
              Premium idea: automatically suggest the next available slot when a client requests changes.
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900 transition",
        checked ? "border-emerald-200" : "border-slate-200/70"
      )}
    >
      {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
    </button>
  );
}

function BookingRow({ b, nowMs, selected, setSelected, onOpen }) {
  const meta = computeSlaMeta(b, nowMs);
  const checked = !!selected[b.id];

  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-3">
      <div className="col-span-1 flex items-center">
        <Checkbox checked={checked} onChange={(v) => setSelected((s) => ({ ...s, [b.id]: v }))} label={`Select ${b.id}`} />
      </div>

      <button
        type="button"
        onClick={() => onOpen(b.id)}
        className="col-span-5 flex items-center gap-3 rounded-2xl text-left"
      >
        <span className="relative h-10 w-10 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
          <img src={avatarSrc(b.customerName)} alt="" className="h-full w-full object-cover" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-900">{b.serviceName}</span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
            {b.id} · {b.customerName} · {b.location}
          </span>
        </span>
      </button>

      <div className="col-span-2 flex items-center">
        <div>
          <div className="text-sm font-black text-slate-900">{fmtDateTime(b.scheduledAt)}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{b.durationMins} mins</div>
        </div>
      </div>

      <div className="col-span-2 flex items-center">
        <div>
          <div className="text-sm font-black text-slate-900">{fmtMoney(b.price, b.currency)}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{b.payment?.milestones?.some((x) => x.status !== "Paid") ? "Milestones open" : "Paid"}</div>
        </div>
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Badge tone={statusTone(b.status)}>{b.status}</Badge>
        <Badge tone={slaTone(meta)}>{meta?.label || "SLA"}</Badge>
      </div>

      <div className="col-span-12 mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/60 px-3 py-2">
        <Clock className="h-4 w-4 text-slate-500" />
        <div className="text-[11px] font-extrabold text-slate-700">SLA timer</div>
        <div className="text-[11px] font-semibold text-slate-500">{meta?.mins === null ? "-" : humanizeMins(meta?.mins ?? null)}</div>
        <span className="ml-auto text-[11px] font-semibold text-slate-500">Updated {fmtDateTime(b.updatedAt)}</span>
      </div>
    </div>
  );
}

function BookingsPage({ bookings, setBookings, templates, setTemplates, navigate, pushToast, nowMs }) {
  const [view, setView] = useState("list"); // list | calendar
  const [status, setStatus] = useState("All");
  const [q, setQ] = useState("");
  const [service, setService] = useState("All");
  const [month, setMonth] = useState(() => new Date());
  const [selectedYmd, setSelectedYmd] = useState(() => toYmd(new Date()));

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const services = useMemo(() => {
    const set = new Set<string>(bookings.map((b) => b.serviceName));
    return ["All", ...Array.from(set)];
  }, [bookings]);

  const counts = useMemo(() => {
    const map = { All: bookings.length };
    STATUS_PIPE.filter((x) => x !== "All").forEach((s) => {
      map[s] = bookings.filter((b) => b.status === s).length;
    });
    return map;
  }, [bookings]);

  const countsByYmd = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const ymd = toYmd(b.scheduledAt);
      map[ymd] = (map[ymd] || 0) + 1;
    });
    return map;
  }, [bookings]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return bookings
      .filter((b) => (status === "All" ? true : b.status === status))
      .filter((b) => (service === "All" ? true : b.serviceName === service))
      .filter((b) => {
        if (!query) return true;
        const hay = `${b.id} ${b.customerName} ${b.customerEmail} ${b.customerPhone} ${b.serviceName} ${b.location} ${b.status}`.toLowerCase();
        return hay.includes(query);
      })
      .filter((b) => {
        if (view !== "calendar") return true;
        // In calendar view, filter to selected day
        return toYmd(b.scheduledAt) === selectedYmd;
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [bookings, q, status, service, view, selectedYmd]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((b) => selected[b.id]);
  const toggleAll = () => {
    if (!filtered.length) return;
    const next = { ...selected };
    if (allVisibleSelected) {
      filtered.forEach((b) => delete next[b.id]);
    } else {
      filtered.forEach((b) => (next[b.id] = true));
    }
    setSelected(next);
  };

  const [reschedOpen, setReschedOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [applyTplId, setApplyTplId] = useState(templates[0]?.id || "");
  const [proposedMinutes, setProposedMinutes] = useState(60);

  const applyTemplateToBooking = (booking, tpl) => {
    const tasks = (tpl?.tasks || []).map((t, idx) => ({ id: `t_${idx}`, text: t, done: false }));
    return {
      ...booking,
      checklistTemplateId: tpl?.id || null,
      checklist: tasks,
      updatedAt: new Date().toISOString(),
      audit: [{ id: makeId("a"), at: new Date().toISOString(), actor: "Provider", action: "checklist applied", detail: tpl?.name || "Template" }, ...(booking.audit || [])],
    };
  };

  const bulkUpdate = (kind) => {
    if (!selectedIds.length) {
      pushToast({ title: "Select bookings", message: "Choose one or more bookings first.", tone: "warning" });
      return;
    }

    if (kind === "Reschedule") {
      setReschedOpen(true);
      return;
    }

    if (kind === "Checklist") {
      setTplOpen(true);
      return;
    }

    const setStatusFromAction = (action) => {
      if (action === "Confirm") return "Confirmed";
      if (action === "Start") return "In Progress";
      if (action === "Complete") return "Completed";
      if (action === "Cancel") return "Cancelled";
      return null;
    };

    const nextStatus = setStatusFromAction(kind);
    if (!nextStatus) return;

    setBookings((prev) =>
      prev.map((b) => {
        if (!selectedIds.includes(b.id)) return b;
        return {
          ...b,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
          audit: [{ id: makeId("a"), at: new Date().toISOString(), actor: "Provider", action: "status updated", detail: `${b.status} → ${nextStatus}` }, ...(b.audit || [])],
        };
      })
    );

    setSelected({});
    pushToast({ title: "Bulk action applied", message: `${selectedIds.length} booking(s) updated.`, tone: "success" });
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">My Bookings</div>
              <Badge tone="slate">/provider/bookings</Badge>
              <Badge tone="slate">Provider</Badge>
              <Badge tone="slate">Premium</Badge>
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-500">List, calendar, SLA timers, reschedule automation, checklist templates.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => pushToast({ title: "Refreshed", message: "Latest booking signals loaded.", tone: "success" })}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <div className="inline-flex overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cx("px-4 py-2 text-xs font-extrabold", view === "list" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800")}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={cx("px-4 py-2 text-xs font-extrabold", view === "calendar" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800")}
              >
                Calendar
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const id = makeId("BK").replace("BK_", "BK-").slice(0, 9);
                pushToast({ title: "New booking", message: `Demo: create booking ${id}.`, tone: "default" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              New booking
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_PIPE.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                status === s ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
            >
              {s}
              <span className={cx("rounded-full px-2 py-0.5 text-[10px]", status === s ? "bg-white dark:bg-slate-900 text-slate-700" : "bg-slate-100 text-slate-700")}>
                {counts[s] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="grid gap-2 md:grid-cols-12 md:items-center">
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search booking ID, customer, service, location"
              className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
            />
          </div>

          <div className="md:col-span-4">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <div className="text-xs font-extrabold text-slate-700">Service</div>
              <div className="relative ml-auto">
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="h-9 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-xs font-extrabold text-slate-800 outline-none"
                >
                  {services.map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <Badge tone="slate">Showing {filtered.length}</Badge>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setService("All");
                setStatus("All");
                pushToast({ title: "Filters cleared", tone: "default" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
      </GlassCard>

      <AnimatePresence>
        {selectedIds.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.16 }}
            className="sticky top-[12px] z-30 mt-4"
          >
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800">
                  <CheckCheck className="h-4 w-4" />
                  {selectedIds.length} selected
                </div>

                {["Confirm", "Start", "Complete", "Cancel", "Reschedule", "Checklist"].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => bulkUpdate(a)}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold",
                      a === "Cancel" ? "border border-rose-200 bg-white dark:bg-slate-900 text-rose-700" : a === "Reschedule" || a === "Checklist" ? "border border-emerald-200 bg-white dark:bg-slate-900 text-emerald-800" : "text-white"
                    )}
                    style={a === "Cancel" || a === "Reschedule" || a === "Checklist" ? undefined : { background: TOKENS.green }}
                  >
                    <Check className="h-4 w-4" />
                    {a}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSelected({})}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear selection
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        {view === "calendar" ? (
          <div className="lg:col-span-4">
            <CalendarMonth
              month={month}
              onMonthChange={setMonth}
              selectedYmd={selectedYmd}
              onSelectYmd={setSelectedYmd}
              countsByYmd={countsByYmd}
            />
          </div>
        ) : null}

        <div className={cx(view === "calendar" ? "lg:col-span-8" : "lg:col-span-12")}>
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Bookings</div>
                  {view === "calendar" ? <Badge tone="slate">{selectedYmd}</Badge> : <Badge tone="slate">Queue</Badge>}
                </div>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Check className="h-4 w-4" />
                  {allVisibleSelected ? "Unselect all" : "Select all"}
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {filtered.map((b) => (
                <BookingRow
                  key={b.id}
                  b={b}
                  nowMs={nowMs}
                  selected={selected}
                  setSelected={setSelected}
                  onOpen={(id) => navigate(`/provider/bookings/${id}`)}
                />
              ))}

              {filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No bookings found"
                    message="Try changing filters or switching the calendar day."
                    action={{ label: "Reset filters", onClick: () => { setStatus("All"); setService("All"); setQ(""); } }}
                  />
                </div>
              ) : null}
            </div>
          </GlassCard>

          <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">Premium operations layer</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  SLA timers, reschedule automation, checklist templates, evidence capture, and dispute prevention.
                </div>
              </div>
              <Badge tone="slate">Ops</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule automation modal */}
      <Modal
        open={reschedOpen}
        title="Reschedule automation"
        subtitle="Propose a new time for selected bookings. Demo: shift by minutes and log an automated update."
        onClose={() => setReschedOpen(false)}
      >
        <div className="grid gap-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Shift schedule</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Applies to {selectedIds.length} booking(s)</div>
              </div>
              <Badge tone="slate">Automation</Badge>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="text-xs font-extrabold text-slate-700">Minutes</div>
              <input
                value={String(proposedMinutes)}
                onChange={(e) => setProposedMinutes(Number(e.target.value || 0))}
                className="h-10 w-28 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              />
              <Badge tone="slate">mins</Badge>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const shift = Number(proposedMinutes || 0) * 60_000;
              setBookings((prev) =>
                prev.map((b) => {
                  if (!selectedIds.includes(b.id)) return b;
                  const nextAt = new Date(new Date(b.scheduledAt).getTime() + shift).toISOString();
                  return {
                    ...b,
                    status: b.status === "Requested" ? "Confirmed" : b.status,
                    scheduledAt: nextAt,
                    startDueAt: nextAt,
                    updatedAt: new Date().toISOString(),
                    audit: [{ id: makeId("a"), at: new Date().toISOString(), actor: "System", action: "auto reschedule", detail: `Shifted by ${proposedMinutes} mins` }, ...(b.audit || [])],
                  };
                })
              );
              setSelected({});
              setReschedOpen(false);
              pushToast({ title: "Rescheduled", message: "Schedules updated (demo).", tone: "success" });
            }}
            className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            Apply reschedule
          </button>
        </div>
      </Modal>

      {/* Checklist templates drawer */}
      <Drawer
        open={tplOpen}
        title="Checklist templates"
        subtitle="Apply templates to selected bookings, or create new templates (demo)."
        onClose={() => setTplOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Apply template</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Applies to {selectedIds.length} booking(s)</div>
              </div>
              <Badge tone="slate">Templates</Badge>
            </div>

            <div className="mt-3">
              <div className="text-[11px] font-extrabold text-slate-600">Template</div>
              <div className="relative mt-2">
                <select
                  value={applyTplId}
                  onChange={(e) => setApplyTplId(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!selectedIds.length) {
                  pushToast({ title: "Select bookings", message: "Choose bookings before applying a template.", tone: "warning" });
                  return;
                }
                const tpl = templates.find((t) => t.id === applyTplId);
                setBookings((prev) => prev.map((b) => (selectedIds.includes(b.id) ? applyTemplateToBooking(b, tpl) : b)));
                setSelected({});
                setTplOpen(false);
                pushToast({ title: "Checklist applied", message: "Template applied to bookings.", tone: "success" });
              }}
              className="mt-4 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              Apply to selected
            </button>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-orange-900">Template builder</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">
                  Premium idea: create templates with sections, required proofs, and auto-messaging rules.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-700" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-900">{t.name}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{t.note}</div>
                  </div>
                  <Badge tone="slate">{t.tasks.length} tasks</Badge>
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                  {t.tasks.slice(0, 4).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setApplyTplId(t.id);
                      pushToast({ title: "Selected", message: `Ready to apply: ${t.name}`, tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Check className="h-4 w-4" />
                    Choose
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const copy = { ...t, id: makeId("tpl"), name: `${t.name} (Copy)` };
                      setTemplates((prev) => [copy, ...prev]);
                      pushToast({ title: "Duplicated", message: "Template duplicated (demo).", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <FileText className="h-4 w-4" />
                    Duplicate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function RiskPrompt({ tone, title, message, action }) {
  const border = tone === "danger" ? "border-rose-200 bg-rose-50/70" : tone === "orange" ? "border-orange-200 bg-orange-50/70" : "border-emerald-200 bg-emerald-50/70";
  const iconBg = tone === "danger" ? "bg-white dark:bg-slate-900 text-rose-700" : tone === "orange" ? "bg-white dark:bg-slate-900 text-orange-700" : "bg-white dark:bg-slate-900 text-emerald-700";
  const Icon = tone === "danger" ? AlertTriangle : tone === "orange" ? Clock : ShieldCheck;

  return (
    <div className={cx("rounded-3xl border p-4", border)}>
      <div className="flex items-start gap-3">
        <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-700">{message}</div>
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold"
              style={{ color: tone === "danger" ? "#B42318" : tone === "orange" ? "#B45309" : "#047857" }}
            >
              {action.label}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BookingDetailPage({ booking, templates, setBooking, navigate, pushToast, nowMs }) {
  const [tab, setTab] = useState("Overview");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTab("Overview");
  }, [booking?.id]);

  if (!booking) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/provider/bookings")}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <Badge tone="slate">/provider/bookings/:id</Badge>
        </div>
        <EmptyState title="Booking not found" message="Select a booking from My Bookings." action={{ label: "Go to bookings", onClick: () => navigate("/provider/bookings") }} />
      </div>
    );
  }

  const meta = computeSlaMeta(booking, nowMs);

  const checklist = booking.checklist || [];
  const deliverables = booking.deliverables || [];
  const milestones = booking.payment?.milestones || [];
  const proofs = booking.proofs || [];
  const audit = booking.audit || [];
  const template = templates.find((t) => t.id === booking.checklistTemplateId);

  const missingProofs = (booking.status === "In Progress" || booking.status === "Completed") && proofs.length === 0;
  const unpaidMilestones = milestones.filter((m) => m.status !== "Paid");

  const riskPrompts = useMemo<RiskPrompt[]>(() => {
    const list: RiskPrompt[] = [];
    if (meta?.state === "overdue") {
      list.push({
        tone: "danger",
        title: "SLA overdue",
        message: "Send a proactive update to reduce disputes. Also document any delays.",
        action: { label: "Generate update message", onClick: () => pushToast({ title: "Draft created", message: "Message draft generated (demo).", tone: "success" }) },
      });
    } else if (meta?.state === "risk" || meta?.state === "watch") {
      list.push({
        tone: "orange",
        title: "SLA attention",
        message: "A time-sensitive step is approaching. Confirm readiness and share ETA.",
        action: { label: "Open reschedule", onClick: () => pushToast({ title: "Reschedule", message: "Use the reschedule flow (demo).", tone: "default" }) },
      });
    }

    if (missingProofs) {
      list.push({
        tone: "orange",
        title: "Proofs missing",
        message: "Upload evidence to prevent chargebacks and quality disputes.",
        action: { label: "Upload proof", onClick: () => fileRef.current?.click?.() },
      });
    }

    if (unpaidMilestones.length) {
      list.push({
        tone: "orange",
        title: "Payment milestones open",
        message: "Confirm payment status and send invoice reminders when applicable.",
        action: { label: "Send reminder", onClick: () => pushToast({ title: "Reminder queued", message: "Reminder queued (demo).", tone: "success" }) },
      });
    }

    if (booking.status === "Disputed") {
      list.push({
        tone: "danger",
        title: "Dispute prevention",
        message: "Collect evidence, export an evidence pack, and respond with a clear timeline.",
        action: { label: "Export evidence pack", onClick: () => pushToast({ title: "Export started", message: "Evidence pack export started (demo).", tone: "success" }) },
      });
    }

    if (list.length === 0) {
      list.push({
        tone: "green",
        title: "Healthy booking",
        message: "Everything looks on track. Keep communication active and capture proofs as you deliver.",
        action: { label: "Open templates", onClick: () => pushToast({ title: "Templates", message: "Use templates for faster updates (demo).", tone: "default" }) },
      });
    }

    return list;
  }, [meta?.state, missingProofs, unpaidMilestones.length, booking.status, pushToast]);

  const updateBooking = (patch, auditEvent) => {
    const next = {
      ...booking,
      ...patch,
      updatedAt: new Date().toISOString(),
      audit: auditEvent
        ? [{ id: makeId("a"), at: new Date().toISOString(), actor: "Provider", ...auditEvent }, ...(booking.audit || [])]
        : booking.audit,
    };
    setBooking(next);
  };

  const toggleChecklist = (taskId) => {
    const next = (booking.checklist || []).map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
    updateBooking({ checklist: next }, { action: "checklist updated", detail: "Task toggled" });
  };

  const setMilestonePaid = (mid) => {
    const next = milestones.map((m) => (m.id === mid ? { ...m, status: "Paid" } : m));
    updateBooking({ payment: { ...booking.payment, milestones: next } }, { action: "payment updated", detail: "Milestone marked paid" });
    pushToast({ title: "Payment updated", message: "Milestone marked as paid.", tone: "success" });
  };

  const applyTemplate = () => {
    const tpl = template || templates[0];
    const tasks = (tpl?.tasks || []).map((t, idx) => ({ id: `t_${idx}`, text: t, done: false }));
    updateBooking({ checklistTemplateId: tpl?.id, checklist: tasks }, { action: "checklist applied", detail: tpl?.name || "Template" });
    pushToast({ title: "Checklist applied", message: "Template applied to booking.", tone: "success" });
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/provider/bookings")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Booking Detail</div>
              <Badge tone="slate">/provider/bookings/{booking.id}</Badge>
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Timeline, customer, deliverables, payment milestones, proofs, audit and dispute prevention.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(booking.status)}>{booking.status}</Badge>
            <Badge tone={slaTone(meta)}>{meta?.label || "SLA"}</Badge>
            <button
              type="button"
              onClick={() => pushToast({ title: "Message", message: "Open chat with customer (demo).", tone: "default" })}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </button>
            <button
              type="button"
              onClick={() => pushToast({ title: "Export", message: "Export booking summary (demo).", tone: "success" })}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.orange }}
            >
              <FileText className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["Overview", "Timeline", "Deliverables", "Payments", "Proofs", "Audit", "Risk"].map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>{t}</Chip>
        ))}
        <span className="ml-auto">
          <Badge tone="slate">Updated {fmtDateTime(booking.updatedAt)}</Badge>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">{tab}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Premium detail view with safe actions and evidence capture.</div>
                </div>
                <Badge tone="slate">{booking.id}</Badge>
              </div>
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.16 }}>
                  {tab === "Overview" ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                              <img src={avatarSrc(booking.customerName)} alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900 truncate">{booking.customerName}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500 truncate">{booking.customerEmail}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500 truncate">{booking.customerPhone}</div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-slate-700" />
                            <div className="text-xs font-extrabold text-slate-600">Schedule</div>
                            <span className="ml-auto"><Badge tone="slate">{booking.durationMins} mins</Badge></span>
                          </div>
                          <div className="mt-2 text-sm font-black text-slate-900">{fmtDateTime(booking.scheduledAt)}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{booking.location}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                updateBooking({ status: "In Progress" }, { action: "status updated", detail: "Started work" });
                                pushToast({ title: "Status updated", message: "Marked In Progress.", tone: "success" });
                              }}
                              className="rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              Start
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateBooking({ status: "Completed" }, { action: "status updated", detail: "Completed" });
                                pushToast({ title: "Completed", message: "Booking marked completed.", tone: "success" });
                              }}
                              className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              Complete
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-slate-700" />
                            <div className="text-xs font-extrabold text-slate-600">Pricing</div>
                            <span className="ml-auto"><Badge tone="slate">{booking.currency}</Badge></span>
                          </div>
                          <div className="mt-2 text-lg font-black text-slate-900">{fmtMoney(booking.price, booking.currency)}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{milestones.some((m) => m.status !== "Paid") ? "Milestones open" : "Paid"}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Invoice", message: "Invoice generation started (demo).", tone: "success" })}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.orange }}
                            >
                              <Receipt className="h-4 w-4" />
                              Invoice
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Checklist</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Template: {template?.name || "Not set"}</div>
                          </div>
                          <button
                            type="button"
                            onClick={applyTemplate}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800"
                          >
                            <ClipboardList className="h-4 w-4" />
                            Apply template
                          </button>
                        </div>

                        <div className="mt-3 space-y-2">
                          {checklist.length === 0 ? (
                            <div className="text-xs font-semibold text-slate-500">No checklist yet. Apply a template.</div>
                          ) : (
                            checklist.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleChecklist(t.id)}
                                className={cx(
                                  "flex w-full items-start gap-3 rounded-2xl border bg-white dark:bg-slate-900 p-3 text-left transition",
                                  t.done ? "border-emerald-200" : "border-slate-200/70 hover:bg-gray-50 dark:bg-slate-950"
                                )}
                              >
                                <div className={cx("grid h-9 w-9 place-items-center rounded-2xl border", t.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200/70 bg-white dark:bg-slate-900")}>
                                  {t.done ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={cx("text-xs font-extrabold", t.done ? "text-emerald-900" : "text-slate-800")}>{t.text}</div>
                                  <div className="mt-1 text-[11px] font-semibold text-slate-500">Tap to toggle</div>
                                </div>
                                <Badge tone={t.done ? "green" : "slate"}>{t.done ? "Done" : "Pending"}</Badge>
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      {booking.notes ? (
                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">Notes</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">{booking.notes}</div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {tab === "Timeline" ? (
                    <div className="space-y-2">
                      {[
                        { k: "Created", at: booking.createdAt, done: true, d: "Booking created" },
                        { k: "Confirmed", at: booking.status !== "Requested" ? booking.updatedAt : null, done: booking.status !== "Requested", d: "Schedule confirmed" },
                        { k: "In progress", at: booking.status === "In Progress" || booking.status === "Completed" ? booking.updatedAt : null, done: booking.status === "In Progress" || booking.status === "Completed", d: "Work started" },
                        { k: "Completed", at: booking.status === "Completed" ? booking.updatedAt : null, done: booking.status === "Completed", d: "Deliverables finalized" },
                      ].map((x) => (
                        <div key={x.k} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <div className={cx("grid h-10 w-10 place-items-center rounded-2xl border", x.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200/70 bg-white dark:bg-slate-900")}>
                              {x.done ? <Check className="h-4 w-4 text-emerald-700" /> : <Clock className="h-4 w-4 text-slate-500" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-black text-slate-900">{x.k}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                            </div>
                            <Badge tone={x.done ? "green" : "slate"}>{x.done ? "Done" : "Pending"}</Badge>
                          </div>
                          {x.at ? <div className="mt-2 text-[11px] font-semibold text-slate-500">{fmtDateTime(x.at)}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {tab === "Deliverables" ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Deliverables</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Outputs and acceptance statuses</div>
                        </div>
                        <Badge tone="slate">{deliverables.length}</Badge>
                      </div>
                      <div className="mt-4 space-y-2">
                        {deliverables.map((d) => (
                          <div key={d.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-black text-slate-900 truncate">{d.title}</div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Status: {d.status}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = deliverables.map((x) => (x.id === d.id ? { ...x, status: x.status === "Delivered" ? "Pending" : "Delivered" } : x));
                                updateBooking({ deliverables: next }, { action: "deliverable updated", detail: d.title });
                                pushToast({ title: "Deliverable updated", message: "Status toggled (demo).", tone: "success" });
                              }}
                              className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                            >
                              Toggle
                            </button>
                          </div>
                        ))}
                        {deliverables.length === 0 ? <div className="text-xs font-semibold text-slate-500">No deliverables yet.</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {tab === "Payments" ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Payment milestones</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Track payments by step</div>
                        </div>
                        <Badge tone="slate">{milestones.length}</Badge>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                        <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                          <div className="col-span-5">Milestone</div>
                          <div className="col-span-3">Due</div>
                          <div className="col-span-2">Amount</div>
                          <div className="col-span-2">Action</div>
                        </div>
                        <div className="divide-y divide-slate-200/70">
                          {milestones.map((m) => (
                            <div key={m.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                              <div className="col-span-5">
                                <div className="text-sm font-extrabold text-slate-900">{m.label}</div>
                                <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Status: {m.status}</div>
                              </div>
                              <div className="col-span-3 flex items-center text-slate-500">{m.dueAt ? fmtDateTime(m.dueAt) : "-"}</div>
                              <div className="col-span-2 flex items-center font-black text-slate-900">{fmtMoney(m.amount, booking.currency)}</div>
                              <div className="col-span-2 flex items-center justify-end">
                                {m.status === "Paid" ? (
                                  <Badge tone="green">Paid</Badge>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setMilestonePaid(m.id)}
                                    className="rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                                    style={{ background: TOKENS.green }}
                                  >
                                    Mark paid
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {milestones.length === 0 ? (
                            <div className="p-4"><div className="text-xs font-semibold text-slate-500">No milestones defined.</div></div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Premium: dispute prevention</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-reminders and evidence capture reduce payment disputes.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "Proofs" ? (
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Proof uploads</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Photos, PDFs, receipts, reports</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click?.()}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          <Upload className="h-4 w-4" />
                          Upload
                        </button>
                        <input
                          ref={fileRef}
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            const added = files.map((f) => ({ id: makeId("pf"), name: f.name, uploadedAt: new Date().toISOString(), visibility: "internal" }));
                            updateBooking({ proofs: [...added, ...(booking.proofs || [])] }, { action: "proof uploaded", detail: `${files.length} file(s)` });
                            pushToast({ title: "Proof uploaded", message: `${files.length} file(s) added (local).`, tone: "success" });
                            e.currentTarget.value = "";
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        {proofs.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-black text-slate-900">{p.name}</div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Uploaded {fmtDateTime(p.uploadedAt)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = proofs.map((x) => (x.id === p.id ? { ...x, visibility: x.visibility === "internal" ? "buyer" : "internal" } : x));
                                updateBooking({ proofs: next }, { action: "proof visibility", detail: p.name });
                              }}
                              className={cx(
                                "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                                p.visibility === "buyer" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                              )}
                            >
                              {p.visibility === "buyer" ? "Buyer can see" : "Internal"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = proofs.filter((x) => x.id !== p.id);
                                updateBooking({ proofs: next }, { action: "proof removed", detail: p.name });
                              }}
                              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                              aria-label="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {proofs.length === 0 ? <EmptyState title="No proofs yet" message="Upload evidence to prevent disputes." /> : null}
                      </div>
                    </div>
                  ) : null}

                  {tab === "Audit" ? (
                    <div className="space-y-2">
                      {audit.map((a) => (
                        <div key={a.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Badge tone="slate">{a.actor}</Badge>
                            <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtDateTime(a.at)}</span>
                          </div>
                          <div className="mt-2 text-sm font-black text-slate-900">{a.action}</div>
                          {a.detail ? <div className="mt-1 text-xs font-semibold text-slate-500">{a.detail}</div> : null}
                        </div>
                      ))}
                      {audit.length === 0 ? <EmptyState title="No audit events" message="Actions will appear here." /> : null}
                    </div>
                  ) : null}

                  {tab === "Risk" ? (
                    <div className="grid gap-3">
                      {riskPrompts.map((p) => (
                        <RiskPrompt key={p.title} tone={p.tone} title={p.title} message={p.message} action={p.action} />
                      ))}
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Dispute prevention</div>
                          <span className="ml-auto"><Badge tone="slate">Premium</Badge></span>
                        </div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                          <li>Keep customer messages clear and time-stamped</li>
                          <li>Upload proofs during delivery, not after</li>
                          <li>Mark milestones paid with evidence</li>
                          <li>Export evidence pack for disputes</li>
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-4">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">SLA and risk</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Live signals</div>
              </div>
              <Badge tone={slaTone(meta)}>{meta?.label || "On track"}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">SLA timer</div>
                  <span className="ml-auto"><Badge tone={slaTone(meta)}>{meta?.mins === null ? "-" : humanizeMins(meta?.mins ?? null)}</Badge></span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">This timer updates live in the list and detail.</div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Customer</div>
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-700">
                  {booking.customerName}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{booking.location}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Called", message: "Call started (demo).", tone: "default" })}
                    className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    Call
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Email", message: "Email draft created (demo).", tone: "success" })}
                    className="rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    Email
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Super premium</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">
                      Add smart reschedule suggestions, auto-checklists by service, and evidence pack export.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default function ProviderBookingsPreviewable() {
  const { path, navigate } = useHashRoute();

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getProviderBookings().then((payload) => {
      if (!active) return;
      const rows = Array.isArray((payload as { bookings?: unknown[] }).bookings)
        ? ((payload as { bookings?: Array<Record<string, unknown>> }).bookings ?? [])
        : [];
      const nextTemplates = Array.isArray((payload as { templates?: unknown[] }).templates)
        ? ((payload as { templates?: Array<Record<string, unknown>> }).templates ?? []).map((entry) => ({
            id: String(entry.id ?? ""),
            name: String(entry.name ?? "Checklist"),
            note: String(entry.note ?? ""),
            tasks: Array.isArray(entry.tasks) ? entry.tasks.map((item) => String(item)) : [],
          }))
        : [];
      setTemplates(nextTemplates);
      setBookings(
        rows.map((entry) => {
          const data = ((entry.data ?? {}) as Record<string, unknown>);
          return {
            id: String(entry.id ?? data.id ?? ""),
            customerName: String(data.customerName ?? "Customer"),
            customerEmail: String(data.customerEmail ?? ""),
            customerPhone: String(data.customerPhone ?? ""),
            serviceName: String(data.serviceName ?? "Service"),
            status: String(data.status ?? entry.status ?? "Requested"),
            scheduledAt: String(data.scheduledAt ?? entry.scheduledAt ?? new Date().toISOString()),
            durationMins: Number(data.durationMins ?? entry.durationMinutes ?? 0),
            location: String(data.location ?? ""),
            currency: String(data.currency ?? entry.currency ?? "USD"),
            price: Number(data.price ?? entry.amount ?? 0),
            createdAt: String(data.createdAt ?? entry.createdAt ?? new Date().toISOString()),
            updatedAt: String(data.updatedAt ?? entry.updatedAt ?? new Date().toISOString()),
            responseDueAt: data.responseDueAt ? String(data.responseDueAt) : null,
            startDueAt: data.startDueAt ? String(data.startDueAt) : null,
            deliverables: Array.isArray(data.deliverables) ? data.deliverables as Deliverable[] : [],
            payment: (data.payment as { milestones: PaymentMilestone[] } | undefined) ?? { milestones: [] },
            checklistTemplateId: data.checklistTemplateId ? String(data.checklistTemplateId) : null,
            checklist: Array.isArray(data.checklist) ? data.checklist as ChecklistItem[] : null,
            proofs: Array.isArray(data.proofs) ? data.proofs as Proof[] : [],
            audit: Array.isArray(data.audit) ? data.audit as AuditEntry[] : [],
            notes: String(data.notes ?? ""),
          } satisfies Booking;
        })
      );
    });

    return () => {
      active = false;
    };
  }, []);

  // Materialize checklist when opening the app (demo)
  useEffect(() => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.checklist && b.checklist.length) return b;
        const tpl = templates.find((t) => t.id === b.checklistTemplateId);
        if (!tpl) return b;
        return {
          ...b,
          checklist: tpl.tasks.map((t, idx) => ({ id: `t_${idx}`, text: t, done: false })),
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const isDetail = path.startsWith("/provider/bookings/");
  const bookingId = isDetail ? path.replace("/provider/bookings/", "").split("/")[0] : null;
  const booking = useMemo(() => bookings.find((b) => b.id === bookingId) || null, [bookings, bookingId]);

  const setBooking = (updated) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        <AnimatePresence mode="wait">
          <motion.div key={path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.16 }}>
            {!isDetail ? (
              <BookingsPage
                bookings={bookings}
                setBookings={setBookings}
                templates={templates}
                setTemplates={setTemplates}
                navigate={navigate}
                pushToast={pushToast}
                nowMs={nowMs}
              />
            ) : (
              <BookingDetailPage
                booking={booking}
                templates={templates}
                setBooking={setBooking}
                navigate={navigate}
                pushToast={pushToast}
                nowMs={nowMs}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
