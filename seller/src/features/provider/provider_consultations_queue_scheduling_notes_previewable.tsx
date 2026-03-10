import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  FileText,
  Filter,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Video,
  X,
} from "lucide-react";

/**
 * Provider Consultations
 * Route: /provider/consultations
 * Core: consult queue, scheduling, notes
 * Super premium: summaries, convert consult to booking or quote
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
type SummaryRisk = "High" | "Medium" | "Low";
type ConsultSummary = {
  headline: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  risk: SummaryRisk;
};
type SummaryInput = {
  transcript: string;
  notes: string;
  topic: string;
  priority: string;
  status: string;
};
type Consult = {
  id: string;
  client: string;
  channel: string;
  topic: string;
  status: string;
  priority: string;
  createdAt: string;
  lastMessageAt: string;
  scheduledAt: string | null;
  tags: string[];
  transcript: string;
  notes: string;
  summary: ConsultSummary | null;
  summaryAt: string | null;
  lastConverted: { type: string; at: string } | null;
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "";
  return `${a}${b}`.toUpperCase().slice(0, 2);
}

function hashCode(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function avatarDataUri(label, seed) {
  const hue = Math.abs(hashCode(seed || label)) % 360;
  const bg1 = `hsl(${hue}, 78%, 56%)`;
  const bg2 = `hsl(${(hue + 22) % 360}, 78%, 48%)`;
  const txt = String(label || "EV").slice(0, 2).toUpperCase();
  const svg = `\n  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">\n    <defs>\n      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n        <stop offset="0" stop-color="${bg1}"/>\n        <stop offset="1" stop-color="${bg2}"/>\n      </linearGradient>\n    </defs>\n    <rect width="64" height="64" rx="18" fill="url(#g)"/>\n    <circle cx="54" cy="12" r="6" fill="rgba(255,255,255,0.22)"/>\n    <text x="32" y="40" text-anchor="middle" font-family="system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;" font-size="18" font-weight="900" fill="rgba(255,255,255,0.95)">${txt}</text>\n  </svg>\n  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function ToastCenter({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[80] flex w-[92vw] max-w-[420px] flex-col gap-2">
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
  const headerBg = tone === "accent" ? TOKENS.black : "rgba(255,255,255,0.85)";
  const headerText = tone === "accent" ? "text-white" : "text-slate-900";

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
            className="fixed right-0 top-0 z-[75] h-screen w-[92vw] max-w-[560px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 px-4 py-3" style={{ background: headerBg }}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className={cx("text-sm font-black", headerText)}>{title}</div>
                    {subtitle ? <div className={cx("mt-1 text-xs font-semibold", tone === "accent" ? "text-white/70" : "text-slate-500")}>{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose} tone={tone === "accent" ? "dark" : "light"}>
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

function Modal({ open, title, subtitle, onClose, children }) {
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

function seedConsultations(): Consult[] {
  const now = Date.now();
  const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  const inMins = (m: number) => new Date(now + m * 60_000).toISOString();
  const closedTranscript =
    "Walked through CPO onboarding, station registration, pricing models, and how operators track usage and transactions.";
  const closedNotes = "Sent onboarding checklist and CPMS setup steps.";

  return [
    {
      id: "CNS-4012",
      client: "Amina K.",
      channel: "EVzone",
      topic: "Website integration for WhatsApp Business API",
      status: "New",
      priority: "High",
      createdAt: minsAgo(55),
      lastMessageAt: minsAgo(12),
      scheduledAt: null,
      tags: ["integration", "whatsapp"],
      transcript:
        "Client wants to integrate WhatsApp Business API into their marketplace. Needs guidance on provider selection, template approvals, webhook reliability, and agent inbox routing.",
      notes: "",
      summary: null,
      summaryAt: null,
      lastConverted: null,
    },
    {
      id: "CNS-4011",
      client: "Kato S.",
      channel: "WhatsApp",
      topic: "Service pricing and quote structure",
      status: "Scheduled",
      priority: "Medium",
      createdAt: minsAgo(210),
      lastMessageAt: minsAgo(45),
      scheduledAt: inMins(180),
      tags: ["pricing", "quote"],
      transcript:
        "Discussed pricing tiers and how to present quotes. Client prefers clear packages and optional add-ons, plus taxes handling where applicable.",
      notes: "Share a quote template with 3 packages and 2 add-ons."
        + "\n" + "Confirm VAT applicability by client country.",
      summary: null,
      summaryAt: null,
      lastConverted: { type: "Quote", at: minsAgo(40) },
    },
    {
      id: "CNS-4010",
      client: "Sarah T.",
      channel: "EVzone",
      topic: "Consult about logistics to preferred warehouse",
      status: "Awaiting Notes",
      priority: "Medium",
      createdAt: minsAgo(540),
      lastMessageAt: minsAgo(95),
      scheduledAt: minsAgo(120),
      tags: ["logistics", "warehouse"],
      transcript:
        "Client wants a shipping method where goods are delivered to a preferred warehouse for further shipping. Clarify warehouse selection, fees, and handoff steps.",
      notes: "",
      summary: null,
      summaryAt: null,
      lastConverted: null,
    },
    {
      id: "CNS-4009",
      client: "Moses N.",
      channel: "API",
      topic: "Charge station operator account onboarding",
      status: "Closed",
      priority: "Low",
      createdAt: minsAgo(1440),
      lastMessageAt: minsAgo(1300),
      scheduledAt: minsAgo(1380),
      tags: ["charging", "onboarding"],
      transcript: closedTranscript,
      notes: closedNotes,
      summary: buildAiSummary({
        transcript: closedTranscript,
        notes: closedNotes,
        topic: "Charge station operator account onboarding",
        priority: "Low",
        status: "Closed",
      }),
      summaryAt: minsAgo(1320),
      lastConverted: { type: "Booking", at: minsAgo(1370) },
    },
  ];
}

function statusTone(status) {
  if (status === "New") return "orange";
  if (status === "Scheduled") return "green";
  if (status === "In Session") return "orange";
  if (status === "Awaiting Notes") return "orange";
  if (status === "Closed") return "slate";
  return "slate";
}

function priorityTone(p) {
  if (p === "High") return "danger";
  if (p === "Medium") return "orange";
  return "slate";
}

function buildAiSummary(c: SummaryInput): ConsultSummary {
  const raw = `${c.transcript || ""}\n${c.notes || ""}`.trim();
  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const keyPoints = sentences.slice(0, 3);
  const actionItems = [
    "Confirm scope and success criteria",
    "Share a short checklist and next steps",
    "Propose a date for follow-up",
  ];

  return {
    headline: c.topic,
    summary:
      keyPoints.length
        ? keyPoints.join(" ")
        : "No transcript provided yet. Add a short recap, then generate again.",
    keyPoints: keyPoints.length ? keyPoints : ["Capture the main request", "List constraints", "Agree on next step"],
    actionItems,
    risk: c.priority === "High" ? "High" : c.status === "Awaiting Notes" ? "Medium" : "Low",
  };
}

export default function ProviderConsultationsPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [rows, setRows] = useState<Consult[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getProviderConsultations().then((payload) => {
      if (!active) return;
      const items = Array.isArray((payload as { consultations?: unknown[] }).consultations)
        ? ((payload as { consultations?: Array<Record<string, unknown>> }).consultations ?? [])
        : [];
      setRows(
        items.map((entry) => {
          const data = ((entry.data ?? {}) as Record<string, unknown>);
          return {
            id: String(entry.id ?? data.id ?? ""),
            client: String(data.client ?? "Client"),
            channel: String(data.channel ?? "Seller"),
            topic: String(data.topic ?? "Consultation"),
            status: String(data.status ?? entry.status ?? "New"),
            priority: String(data.priority ?? "Medium"),
            createdAt: String(data.createdAt ?? entry.createdAt ?? new Date().toISOString()),
            lastMessageAt: String(data.lastMessageAt ?? entry.updatedAt ?? new Date().toISOString()),
            scheduledAt: data.scheduledAt ? String(data.scheduledAt) : null,
            tags: Array.isArray(data.tags) ? data.tags.map((item) => String(item)) : [],
            transcript: String(data.transcript ?? ""),
            notes: String(data.notes ?? ""),
            summary: (data.summary as ConsultSummary | null | undefined) ?? null,
            summaryAt: data.summaryAt ? String(data.summaryAt) : null,
            lastConverted: (data.lastConverted as { type: string; at: string } | null | undefined) ?? null,
          } satisfies Consult;
        })
      );
    });

    return () => {
      active = false;
    };
  }, []);
  const active = useMemo(() => rows.find((r) => r.id === activeId) || null, [rows, activeId]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Recent");

  const counts = useMemo(() => {
    const map = { All: rows.length };
    ["New", "Scheduled", "In Session", "Awaiting Notes", "Closed"].forEach((s) => {
      map[s] = rows.filter((r) => r.status === s).length;
    });
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = rows
      .filter((r) => (status === "All" ? true : r.status === status))
      .filter((r) => {
        if (!query) return true;
        const hay = [r.id, r.client, r.channel, r.topic, (r.tags || []).join(" ")].join(" ").toLowerCase();
        return hay.includes(query);
      });

    const sorted = [...list].sort((a, b) => {
      if (sort === "Priority") {
        const pr = { High: 3, Medium: 2, Low: 1 };
        return (pr[b.priority] || 0) - (pr[a.priority] || 0);
      }
      if (sort === "Scheduled") {
        const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
        const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
        return ta - tb;
      }
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    return sorted;
  }, [rows, q, status, sort]);

  useEffect(() => {
    if (!rows.find((r) => r.id === activeId)) {
      setActiveId(rows[0]?.id);
    }
  }, [rows, activeId]);

  const [detailTab, setDetailTab] = useState("Overview");
  useEffect(() => {
    setDetailTab("Overview");
  }, [activeId]);

  // Notes editing
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSavedAt, setNoteSavedAt] = useState<string | null>(null);
  const autosaveRef = useRef<number | null>(null);

  useEffect(() => {
    setNoteDraft(active?.notes || "");
    setNoteSavedAt(null);
  }, [active?.id]);

  useEffect(() => {
    if (!active) return;
    window.clearTimeout(autosaveRef.current ?? undefined);
    autosaveRef.current = window.setTimeout(() => {
      // autosave draft into row (demo)
      setRows((prev) => prev.map((r) => (r.id === active.id ? { ...r, notes: noteDraft } : r)));
      setNoteSavedAt(new Date().toISOString());
    }, 650);
    return () => window.clearTimeout(autosaveRef.current ?? undefined);
  }, [noteDraft, active?.id]);

  // Scheduling
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  useEffect(() => {
    if (!active) return;
    const d = active.scheduledAt ? new Date(active.scheduledAt) : null;
    if (d && !Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      setScheduleDate(`${yyyy}-${mm}-${dd}`);
      setScheduleTime(`${hh}:${mi}`);
    } else {
      const t = new Date(Date.now() + 60 * 60 * 1000);
      const yyyy = t.getFullYear();
      const mm = String(t.getMonth() + 1).padStart(2, "0");
      const dd = String(t.getDate()).padStart(2, "0");
      const hh = String(t.getHours()).padStart(2, "0");
      const mi = String(t.getMinutes()).padStart(2, "0");
      setScheduleDate(`${yyyy}-${mm}-${dd}`);
      setScheduleTime(`${hh}:${mi}`);
    }
  }, [scheduleOpen, active?.id]);

  // Convert
  const [bookingOpen, setBookingOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  // Booking form (demo)
  const [bkService, setBkService] = useState("Consultation Follow-up");
  const [bkPrice, setBkPrice] = useState("120");
  const [bkDeposit, setBkDeposit] = useState("30");

  // Quote form (demo)
  const [quoteItems, setQuoteItems] = useState(() => [
    { id: makeId("li"), name: "Discovery and scope", qty: 1, unit: 80 },
    { id: makeId("li"), name: "Integration setup", qty: 1, unit: 240 },
  ]);

  const quoteTotals = useMemo(() => {
    const subtotal = quoteItems.reduce((s, it) => s + Number(it.qty || 0) * Number(it.unit || 0), 0);
    const taxes = Math.round(subtotal * 0.02 * 100) / 100;
    const total = Math.round((subtotal + taxes) * 100) / 100;
    return { subtotal, taxes, total };
  }, [quoteItems]);

  const createSummary = () => {
    if (!active) return;
    const s = buildAiSummary(active);
    setRows((prev) => prev.map((r) => (r.id === active.id ? { ...r, summary: s, summaryAt: new Date().toISOString() } : r)));
    pushToast({ title: "Summary generated", message: "AI summary created (demo).", tone: "success" });
  };

  const convertToBooking = () => {
    if (!active) return;
    setBookingOpen(true);
  };

  const convertToQuote = () => {
    if (!active) return;
    setQuoteOpen(true);
  };

  const setStatusForActive = (next) => {
    if (!active) return;
    setRows((prev) => prev.map((r) => (r.id === active.id ? { ...r, status: next } : r)));
    pushToast({ title: "Status updated", message: `${active.id} set to ${next}.`, tone: "success" });
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
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Consultations</div>
                <Badge tone="slate">/provider/consultations</Badge>
                <Badge tone="green">Provider</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Queue, scheduling and notes. Premium: summaries and conversion to booking or quote.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "New consultation", message: "Wire create flow to intake form.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest consult signals loaded.", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Status chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {["All", "New", "Scheduled", "In Session", "Awaiting Notes", "Closed"].map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                {s}
                <span className="ml-2 text-slate-500">{counts[s] ?? 0}</span>
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Queue */}
          <GlassCard className="lg:col-span-4 overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Consult queue</div>
                </div>
                <Badge tone="slate">{filtered.length}</Badge>
              </div>

              <div className="mt-3 grid gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search client, topic, tag"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <div className="text-xs font-extrabold text-slate-700">Sort</div>
                    <div className="relative">
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="h-8 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-3 pr-8 text-xs font-extrabold text-slate-800"
                      >
                        {[
                          { k: "Recent", l: "Recent" },
                          { k: "Priority", l: "Priority" },
                          { k: "Scheduled", l: "Scheduled" },
                        ].map((x) => (
                          <option key={x.k} value={x.k}>
                            {x.l}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      setStatus("All");
                      setSort("Recent");
                      pushToast({ title: "Filters cleared", tone: "default" });
                    }}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {filtered.map((c) => {
                const isActive = c.id === activeId;
                const av = avatarDataUri(initials(c.client), c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={cx(
                      "w-full px-4 py-3 text-left transition",
                      isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="relative h-11 w-11 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                        <img src={av} alt="" className="h-full w-full object-cover" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{c.client}</div>
                          <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                          <span className="ml-auto"><Badge tone={priorityTone(c.priority)}>{c.priority}</Badge></span>
                        </div>
                        <div className="mt-1 truncate text-xs font-semibold text-slate-600">{c.topic}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{c.channel}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtTime(c.lastMessageAt)}</span>
                          {c.scheduledAt ? <Badge tone="slate">Scheduled {fmtTime(c.scheduledAt)}</Badge> : <Badge tone="slate">Not scheduled</Badge>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(c.tags || []).slice(0, 3).map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-2 py-1 text-[10px] font-extrabold text-slate-600">
                              <Tag className="h-3 w-3" />{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 text-slate-300" />
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="No consultations" message="Try changing filters or clearing search." />
                </div>
              ) : null}
            </div>
          </GlassCard>

          {/* Detail */}
          <GlassCard className="lg:col-span-8 overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-5 py-4">
              {!active ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Select a consultation</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Pick an item from the queue to view details, schedule and notes.</div>
                  </div>
                  <Badge tone="slate">Detail</Badge>
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-slate-900">{active.topic}</div>
                      <Badge tone="slate">{active.id}</Badge>
                      <Badge tone={statusTone(active.status)}>{active.status}</Badge>
                      <Badge tone={priorityTone(active.priority)}>{active.priority}</Badge>
                      <Badge tone="slate">Client: {active.client}</Badge>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      Created {fmtTime(active.createdAt)} · Last message {fmtTime(active.lastMessageAt)} · {active.scheduledAt ? `Scheduled ${fmtTime(active.scheduledAt)}` : "Not scheduled"}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Call", message: "Launching call (demo).", tone: "default" })}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </button>

                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Join", message: "Opening session link (demo).", tone: "default" })}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Video className="h-4 w-4" />
                      Join
                    </button>

                    <button
                      type="button"
                      onClick={() => setScheduleOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Calendar className="h-4 w-4" />
                      {active.scheduledAt ? "Reschedule" : "Schedule"}
                    </button>

                    <button
                      type="button"
                      onClick={createSummary}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.orange }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Summary
                    </button>

                    <div className="inline-flex overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={convertToBooking}
                        className="px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
                        title="Convert to booking"
                      >
                        Booking
                      </button>
                      <div className="w-px bg-slate-200/70" />
                      <button
                        type="button"
                        onClick={convertToQuote}
                        className="px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
                        title="Convert to quote"
                      >
                        Quote
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              {active ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {["Overview", "Schedule", "Notes", "Summary", "Convert"].map((t) => (
                    <Chip key={t} active={detailTab === t} onClick={() => setDetailTab(t)}>
                      {t}
                    </Chip>
                  ))}

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(active.id);
                        pushToast({ title: "Copied", message: "Consult ID copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy ID
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusForActive(active.status === "Closed" ? "New" : "Closed")}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <CheckCheck className="h-4 w-4" />
                      {active.status === "Closed" ? "Reopen" : "Close"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-5">
              {!active ? (
                <EmptyState title="No item selected" message="Select a consultation from the queue." />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={detailTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.16 }}
                  >
                    {detailTab === "Overview" ? (
                      <div className="grid gap-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-slate-700" />
                              <div className="text-xs font-extrabold text-slate-600">Channel</div>
                              <span className="ml-auto"><Badge tone="slate">{active.channel}</Badge></span>
                            </div>
                            <div className="mt-2 text-sm font-black text-slate-900">{active.channel}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Reply time influences ranking</div>
                          </div>

                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-700" />
                              <div className="text-xs font-extrabold text-slate-600">Schedule</div>
                              <span className="ml-auto"><Badge tone="slate">{active.scheduledAt ? "Set" : "Not set"}</Badge></span>
                            </div>
                            <div className="mt-2 text-sm font-black text-slate-900">{active.scheduledAt ? fmtTime(active.scheduledAt) : "Not scheduled"}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Use scheduling to reduce no-shows</div>
                          </div>

                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-700" />
                              <div className="text-xs font-extrabold text-slate-600">Notes</div>
                              <span className="ml-auto"><Badge tone={active.notes?.trim() ? "green" : "orange"}>{active.notes?.trim() ? "Captured" : "Missing"}</Badge></span>
                            </div>
                            <div className="mt-2 text-sm font-black text-slate-900">{active.notes?.trim() ? "Ready" : "Add notes"}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Notes help summaries and conversions</div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Consult recap</div>
                            <span className="ml-auto"><Badge tone="slate">Transcript</Badge></span>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-700">{active.transcript}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailTab("Notes");
                                pushToast({ title: "Tip", message: "Capture key decisions in Notes.", tone: "default" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <FileText className="h-4 w-4" />
                              Add notes
                            </button>
                            <button
                              type="button"
                              onClick={createSummary}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.orange }}
                            >
                              <Sparkles className="h-4 w-4" />
                              Generate summary
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-black text-orange-900">Super premium actions</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">Convert this consult into revenue: booking or quote.</div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={convertToBooking}
                                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                  style={{ background: TOKENS.green }}
                                >
                                  <Calendar className="h-4 w-4" />
                                  Convert to booking
                                </button>
                                <button
                                  type="button"
                                  onClick={convertToQuote}
                                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                  style={{ background: TOKENS.orange }}
                                >
                                  <FileText className="h-4 w-4" />
                                  Convert to quote
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {detailTab === "Schedule" ? (
                      <div className="grid gap-3">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black text-slate-900">Scheduling</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Set a time, send reminder, and keep notes aligned.</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setScheduleOpen(true)}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Calendar className="h-4 w-4" />
                              {active.scheduledAt ? "Reschedule" : "Schedule"}
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                              <div className="text-[11px] font-extrabold text-slate-600">Current slot</div>
                              <div className="mt-2 text-lg font-black text-slate-900">{active.scheduledAt ? fmtTime(active.scheduledAt) : "Not scheduled"}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Date: {active.scheduledAt ? fmtDate(active.scheduledAt) : "-"}</div>
                            </div>
                            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                              <div className="text-[11px] font-extrabold text-slate-600">Reminder</div>
                              <div className="mt-2 text-sm font-black text-slate-900">Auto reminders (demo)</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Email, SMS, WhatsApp based on client preference.</div>
                              <button
                                type="button"
                                onClick={() => pushToast({ title: "Reminder sent", message: "Reminder dispatched (demo).", tone: "success" })}
                                className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Check className="h-4 w-4" />
                                Send reminder now
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">Premium scheduling</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">Add availability rules, buffer times, and auto-reschedule suggestions.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {detailTab === "Notes" ? (
                      <div className="grid gap-3">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black text-slate-900">Notes</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Autosave is enabled. Notes improve summaries and faster conversion.</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {noteSavedAt ? <Badge tone="green">Saved {fmtTime(noteSavedAt)}</Badge> : <Badge tone="slate">Autosave</Badge>}
                              <button
                                type="button"
                                onClick={() => {
                                  setRows((prev) => prev.map((r) => (r.id === active.id ? { ...r, notes: noteDraft } : r)));
                                  setNoteSavedAt(new Date().toISOString());
                                  pushToast({ title: "Saved", message: "Notes updated.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.green }}
                              >
                                <CheckCheck className="h-4 w-4" />
                                Save
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {["Key decisions", "Scope", "Next steps", "Risks", "Pricing hints"].map((tpl) => (
                              <button
                                key={tpl}
                                type="button"
                                onClick={() => {
                                  setNoteDraft((s) => (s ? `${s}\n\n${tpl}: ` : `${tpl}: `));
                                }}
                                className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                {tpl}
                              </button>
                            ))}
                          </div>

                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            rows={10}
                            placeholder="Write notes here..."
                            className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                          />

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(noteDraft || "");
                                pushToast({ title: "Copied", message: "Notes copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy notes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                pushToast({ title: "Shared", message: "Notes shared with client (demo).", tone: "default" });
                              }}
                              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Share to client
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">Premium</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-generate notes from call transcript, and create action items as tasks.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {detailTab === "Summary" ? (
                      <div className="grid gap-3">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black text-slate-900">AI Summary</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Premium summaries from transcript and notes (demo).</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={createSummary}
                                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.orange }}
                              >
                                <Sparkles className="h-4 w-4" />
                                Generate
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!active.summary) return;
                                  safeCopy(JSON.stringify(active.summary, null, 2));
                                  pushToast({ title: "Copied", message: "Summary copied.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                                Copy
                              </button>
                            </div>
                          </div>

                          {!active.summary ? (
                            <div className="mt-4">
                              <EmptyState
                                title="No summary yet"
                                message="Generate a summary to capture key points, action items, and risk." 
                                action={{ label: "Generate summary", onClick: createSummary }}
                              />
                            </div>
                          ) : (
                            <div className="mt-4 space-y-3">
                              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-slate-700" />
                                  <div className="text-sm font-black text-slate-900">{active.summary.headline}</div>
                                  <span className="ml-auto"><Badge tone="slate">Generated {fmtTime(active.summaryAt)}</Badge></span>
                                </div>
                                <div className="mt-2 text-sm font-semibold text-slate-700">{active.summary.summary}</div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                  <div className="text-xs font-extrabold text-slate-600">Key points</div>
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
                                    {active.summary.keyPoints.map((k, idx) => (
                                      <li key={idx}>{k}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                  <div className="flex items-center gap-2">
                                    <CheckCheck className="h-4 w-4 text-slate-700" />
                                    <div className="text-xs font-extrabold text-slate-600">Action items</div>
                                    <span className="ml-auto"><Badge tone={active.summary.risk === "High" ? "danger" : active.summary.risk === "Medium" ? "orange" : "slate"}>Risk {active.summary.risk}</Badge></span>
                                  </div>
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
                                    {active.summary.actionItems.map((k, idx) => (
                                      <li key={idx}>{k}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">Super premium</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-summary from voice transcript, speaker separation, and multilingual output.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {detailTab === "Convert" ? (
                      <div className="grid gap-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={convertToBooking}
                            className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-start gap-3">
                              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                                <Calendar className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-slate-900">Convert to Booking</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">Turn this consult into a scheduled service booking.</div>
                                <div className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white" style={{ background: TOKENS.green }}>
                                  Create booking
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={convertToQuote}
                            className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-start gap-3">
                              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-slate-900">Convert to Quote</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">Create a professional quote with line items and taxes.</div>
                                <div className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white" style={{ background: TOKENS.orange }}>
                                  Create quote
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black text-slate-900">Conversion history</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Track how consults become bookings and quotes.</div>
                            </div>
                            <Badge tone="slate">Demo</Badge>
                          </div>

                          <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                            <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                              <div className="col-span-4">Consult</div>
                              <div className="col-span-4">Last conversion</div>
                              <div className="col-span-4">Updated</div>
                            </div>
                            <div className="divide-y divide-slate-200/70">
                              {rows.slice(0, 5).map((r) => (
                                <div key={r.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                                  <div className="col-span-4 font-extrabold text-slate-900">{r.id}</div>
                                  <div className="col-span-4">
                                    {r.lastConverted ? (
                                      <Badge tone={r.lastConverted.type === "Booking" ? "green" : "orange"}>
                                        {r.lastConverted.type} · {fmtTime(r.lastConverted.at)}
                                      </Badge>
                                    ) : (
                                      <Badge tone="slate">None</Badge>
                                    )}
                                  </div>
                                  <div className="col-span-4 text-slate-500">{fmtTime(r.lastMessageAt)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Schedule drawer */}
      <Drawer
        open={scheduleOpen}
        title="Schedule consultation"
        subtitle={active ? `For ${active.client} · ${active.id}` : ""}
        onClose={() => setScheduleOpen(false)}
      >
        {!active ? <EmptyState title="No consult" message="Select a consultation first." /> : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Pick date and time</div>
                <span className="ml-auto"><Badge tone="slate">Local time</Badge></span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Date</div>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Time</div>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!scheduleDate || !scheduleTime) {
                      pushToast({ title: "Missing", message: "Choose date and time.", tone: "warning" });
                      return;
                    }
                    const iso = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
                    setRows((prev) => prev.map((r) => (r.id === active.id ? { ...r, scheduledAt: iso, status: r.status === "New" ? "Scheduled" : r.status } : r)));
                    pushToast({ title: "Scheduled", message: `Set to ${fmtTime(iso)}.`, tone: "success" });
                    setScheduleOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <CheckCheck className="h-4 w-4" />
                  Save schedule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRows((prev) => prev.map((r) => (r.id === active.id ? { ...r, scheduledAt: null } : r)));
                    pushToast({ title: "Removed", message: "Schedule removed.", tone: "default" });
                    setScheduleOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Premium scheduling</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-suggest best slots using client timezone and your availability rules.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Booking modal */}
      <Modal
        open={bookingOpen}
        title="Convert to booking"
        subtitle={active ? `${active.client} · ${active.id}` : ""}
        onClose={() => setBookingOpen(false)}
      >
        {!active ? <EmptyState title="No consult" message="Select a consultation first." /> : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="text-sm font-black text-slate-900">Booking details (demo)</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Pre-filled from consult topic. Wire to Provider Bookings flow.</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-[11px] font-extrabold text-slate-600">Service</div>
                <input
                  value={bkService}
                  onChange={(e) => setBkService(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-slate-600">Slot</div>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <div className="text-sm font-semibold text-slate-800">{active.scheduledAt ? fmtTime(active.scheduledAt) : "Not scheduled"}</div>
                  <button
                    type="button"
                    onClick={() => { setBookingOpen(false); setScheduleOpen(true); }}
                    className="ml-auto rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-[11px] font-extrabold text-slate-600">Price</div>
                <input
                  value={bkPrice}
                  onChange={(e) => setBkPrice(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-slate-600">Deposit</div>
                <input
                  value={bkDeposit}
                  onChange={(e) => setBkDeposit(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRows((prev) => prev.map((r) => (r.id === active.id ? { ...r, lastConverted: { type: "Booking", at: new Date().toISOString() } } : r)));
                pushToast({ title: "Booking created", message: "Converted consult to booking (demo).", tone: "success" });
                setBookingOpen(false);
              }}
              className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              Create booking
            </button>
          </div>
        )}
      </Modal>

      {/* Quote modal */}
      <Modal
        open={quoteOpen}
        title="Convert to quote"
        subtitle={active ? `${active.client} · ${active.id}` : ""}
        onClose={() => setQuoteOpen(false)}
      >
        {!active ? <EmptyState title="No consult" message="Select a consultation first." /> : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="text-sm font-black text-slate-900">Quote builder (demo)</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Line items, taxes, and a send action. Wire to Provider Quotes flow.</div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                <div className="col-span-6">Item</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-3">Unit</div>
                <div className="col-span-1"> </div>
              </div>
              <div className="divide-y divide-slate-200/70">
                {quoteItems.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                    <div className="col-span-6">
                      <input
                        value={it.name}
                        onChange={(e) => setQuoteItems((s) => s.map((x) => (x.id === it.id ? { ...x, name: e.target.value } : x)))}
                        className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        value={String(it.qty)}
                        onChange={(e) => setQuoteItems((s) => s.map((x) => (x.id === it.id ? { ...x, qty: Number(e.target.value) } : x)))}
                        className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        value={String(it.unit)}
                        onChange={(e) => setQuoteItems((s) => s.map((x) => (x.id === it.id ? { ...x, unit: Number(e.target.value) } : x)))}
                        className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setQuoteItems((s) => s.filter((x) => x.id !== it.id))}
                        className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setQuoteItems((s) => [...s, { id: makeId("li"), name: "New line", qty: 1, unit: 0 }])}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                Add line
              </button>

              <div className="ml-auto rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3 text-xs font-semibold text-slate-700">
                <div className="flex items-center justify-between gap-6"><span>Subtotal</span><span className="font-black">{quoteTotals.subtotal.toFixed(2)}</span></div>
                <div className="mt-1 flex items-center justify-between gap-6"><span>Taxes</span><span className="font-black">{quoteTotals.taxes.toFixed(2)}</span></div>
                <div className="mt-2 h-px bg-slate-200/70" />
                <div className="mt-2 flex items-center justify-between gap-6"><span>Total</span><span className="font-black">{quoteTotals.total.toFixed(2)}</span></div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRows((prev) => prev.map((r) => (r.id === active.id ? { ...r, lastConverted: { type: "Quote", at: new Date().toISOString() } } : r)));
                pushToast({ title: "Quote created", message: "Converted consult to quote (demo).", tone: "success" });
                setQuoteOpen(false);
              }}
              className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
              style={{ background: TOKENS.orange }}
            >
              Create quote
            </button>
          </div>
        )}
      </Modal>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
