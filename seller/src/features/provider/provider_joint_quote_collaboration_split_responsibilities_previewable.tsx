import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Link2,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Provider · Joint Quote
 * Route: /provider/joint-quote
 * Core: Collaboration builder + split responsibilities
 * Super premium: Approval workflow + versioning + auto-generated SOW
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
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(n, currency = "USD") {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "green" | "orange" | "danger" | "slate";
}) {
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
  disabled = false,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  tone?: "light" | "dark";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        disabled && "cursor-not-allowed opacity-60",
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

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
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
          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[85] max-h-[90vh] w-[92vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="border-b border-slate-200/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
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
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function StepPill({ active, label, hint, icon: Icon, onClick, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 rounded-3xl border px-3 py-2 text-left transition",
        active ? "border-emerald-200 bg-emerald-50" : "border-slate-200/70 bg-white dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <span
        className={cx(
          "grid h-9 w-9 place-items-center rounded-2xl",
          active ? "bg-white dark:bg-slate-900" : "bg-slate-100"
        )}
      >
        <Icon className={cx("h-4 w-4", tone === "orange" ? "text-orange-700" : active ? "text-emerald-700" : "text-slate-700")} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-extrabold text-slate-900">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{hint}</span>
      </span>
      <ChevronRight className={cx("h-4 w-4", active ? "text-emerald-700" : "text-slate-300")} />
    </button>
  );
}

function createEmptyQuote() {
  const now = Date.now();
  return {
    id: makeId("jq"),
    status: "Draft",
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    currency: "USD",
    title: "",
    buyer: {
      org: "",
      contact: "",
      email: "",
      location: "",
    },
    scope: "",
    collaborators: [],
    deliverables: [],
    milestones: [],
    pricing: {
      base: 0,
      platformFeePct: 0,
      taxesPct: 0,
      notes: "",
    },
    approvals: {
      internal: [],
      buyer: { id: "a3", label: "Buyer approval", status: "Not requested" },
      lastActionAt: null,
    },
    message: "",
  };
}

function mapBackendJointQuote(raw: Record<string, unknown>) {
  const emptyQuote = createEmptyQuote();
  const data = raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : {};
  return {
    quote: {
      ...emptyQuote,
      ...data,
      id: String(raw.id || data.id || emptyQuote.id),
      status: String(data.status || raw.status || emptyQuote.status),
      title: String(data.title || raw.title || emptyQuote.title),
      currency: String(raw.currency || data.currency || emptyQuote.currency),
      updatedAt: String(raw.updatedAt || data.updatedAt || emptyQuote.updatedAt),
      createdAt: String(raw.createdAt || data.createdAt || emptyQuote.createdAt),
    },
    sowText: typeof data.sowText === "string" ? data.sowText : buildSowText({ ...emptyQuote, ...data }),
    versions: Array.isArray(data.versions) ? data.versions : [],
  };
}

function calcCompleteness(q) {
  let score = 0;
  score += q.title?.trim()?.length >= 10 ? 15 : 5;
  score += q.scope?.trim()?.length >= 120 ? 15 : q.scope?.trim()?.length >= 60 ? 10 : 5;
  score += (q.collaborators?.length || 0) >= 2 ? 15 : 6;
  score += (q.deliverables?.length || 0) >= 2 ? 15 : 6;
  score += (q.milestones?.length || 0) >= 2 ? 10 : 4;
  score += Number(q.pricing?.base || 0) > 0 ? 10 : 0;
  const share = (q.deliverables || []).reduce((s, d) => s + Number(d.sharePct || 0), 0);
  score += share === 100 ? 20 : 6;
  return clamp(Math.round(score), 0, 100);
}

function buildSowText(q) {
  const buyer = q.buyer?.org ? `${q.buyer.org}` : "Buyer";
  const lines: string[] = [];
  lines.push(`STATEMENT OF WORK (SOW)`);
  lines.push(`Quote ID: ${q.id}`);
  lines.push(`Buyer: ${buyer}`);
  lines.push(`Created: ${fmtTime(q.createdAt)}`);
  lines.push("");
  lines.push("1. Project Summary");
  lines.push(q.title || "");
  lines.push("");
  lines.push("2. Scope");
  lines.push(q.scope || "");
  lines.push("");
  lines.push("3. Deliverables and Responsibilities");
  (q.deliverables || []).forEach((d, i) => {
    const owner = (q.collaborators || []).find((c) => c.id === d.ownerId)?.name || "Unassigned";
    lines.push(`${i + 1}. ${d.title} (Owner: ${owner}, Share: ${d.sharePct}%)`);
    if (d.acceptance) lines.push(`   Acceptance: ${d.acceptance}`);
  });
  lines.push("");
  lines.push("4. Milestones and Payment Plan");
  (q.milestones || []).forEach((m, i) => {
    const owner = (q.collaborators || []).find((c) => c.id === m.ownerId)?.name || "Unassigned";
    lines.push(`${i + 1}. ${m.title} (Due: ${fmtTime(m.dueAt)}, Share: ${m.amount}%, Owner: ${owner})`);
  });
  lines.push("");
  lines.push("5. Pricing");
  const base = Number(q.pricing?.base || 0);
  const fee = Math.round(base * (Number(q.pricing?.platformFeePct || 0) / 100) * 100) / 100;
  const taxes = Math.round(base * (Number(q.pricing?.taxesPct || 0) / 100) * 100) / 100;
  const total = Math.round((base + fee + taxes) * 100) / 100;
  lines.push(`Base: ${fmtMoney(base, q.currency)}`);
  lines.push(`Platform fee (${q.pricing?.platformFeePct || 0}%): ${fmtMoney(fee, q.currency)}`);
  lines.push(`Taxes (${q.pricing?.taxesPct || 0}%): ${fmtMoney(taxes, q.currency)}`);
  lines.push(`Total: ${fmtMoney(total, q.currency)}`);
  if (q.pricing?.notes) {
    lines.push("");
    lines.push("Notes:");
    lines.push(q.pricing.notes);
  }
  lines.push("");
  lines.push("6. Approvals");
  lines.push("This SOW becomes effective once internal approvals and buyer approval are completed.");
  lines.push("");
  lines.push("7. Sign-off");
  lines.push("Lead Provider: ____________________    Date: __________");
  lines.push("Partner Provider: ____________________  Date: __________");
  lines.push("Buyer: _____________________________   Date: __________");

  return lines.join("\n");
}

export default function ProviderJointQuotePage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [step, setStep] = useState("Overview");
  const [quote, setQuote] = useState(() => createEmptyQuote());
  const [dirty, setDirty] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const persistedRef = useRef(false);

  const [versions, setVersions] = useState<any[]>([]);

  const completeness = useMemo(() => calcCompleteness(quote), [quote]);

  const collaborators = quote.collaborators || [];
  const deliverables = quote.deliverables || [];
  const milestones = quote.milestones || [];

  const shareSum = useMemo(() => deliverables.reduce((s, d) => s + Number(d.sharePct || 0), 0), [deliverables]);

  const pricing = quote.pricing || { base: 0, platformFeePct: 0, taxesPct: 0 };
  const base = Number(pricing.base || 0);
  const fee = Math.round(base * (Number(pricing.platformFeePct || 0) / 100) * 100) / 100;
  const taxes = Math.round(base * (Number(pricing.taxesPct || 0) / 100) * 100) / 100;
  const total = Math.round((base + fee + taxes) * 100) / 100;

  const splits = useMemo(() => {
    const by = new Map();
    deliverables.forEach((d) => {
      const pct = Number(d.sharePct || 0);
      const k = d.ownerId || "unassigned";
      by.set(k, (by.get(k) || 0) + pct);
    });
    const rows = Array.from(by.entries()).map(([ownerId, pct]) => {
      const ownerName = collaborators.find((c) => c.id === ownerId)?.name || (ownerId === "unassigned" ? "Unassigned" : "Unknown");
      const amount = shareSum ? Math.round((total * (pct / shareSum)) * 100) / 100 : 0;
      return { ownerId, ownerName, pct: Math.round(pct), amount };
    });
    rows.sort((a, b) => b.pct - a.pct);
    return rows;
  }, [deliverables, collaborators, total, shareSum]);

  const steps = useMemo(
    () => [
      { key: "Overview", hint: "Buyer, scope, summary", icon: FileText, tone: "green" },
      { key: "Collaborators", hint: "Invite partners, roles", icon: Users, tone: "green" },
      { key: "Responsibilities", hint: "Deliverables + split shares", icon: ClipboardList, tone: "green" },
      { key: "Milestones", hint: "Timeline and payments", icon: Calendar, tone: "green" },
      { key: "Pricing", hint: "Totals and payout split", icon: Wallet, tone: "green" },
      { key: "Review & Send", hint: "Message and submit", icon: Send, tone: "orange" },
      { key: "Approvals", hint: "Super premium workflow", icon: ShieldCheck, tone: "orange" },
      { key: "Versions", hint: "Super premium history", icon: FileText, tone: "orange" },
      { key: "SOW", hint: "Auto-generated SOW", icon: Sparkles, tone: "orange" },
    ],
    []
  );

  const updateQuote = (patch) => {
    setQuote((q) => ({ ...q, ...patch, updatedAt: new Date().toISOString() }));
    setDirty(true);
  };

  const save = async () => {
    const snapshot = JSON.parse(JSON.stringify({ ...quote, status: "Draft" }));
    const nextVersions = [{ id: makeId("ver"), at: new Date().toISOString(), actor: "Provider", note: "Saved changes", snapshot }, ...versions].slice(0, 30);
    setVersions(nextVersions);
    try {
      const payload = {
        status: String(quote.status || "draft").toLowerCase().replace(/\s+/g, "_"),
        title: quote.title,
        buyer: typeof quote.buyer?.org === "string" ? quote.buyer.org : undefined,
        currency: quote.currency,
        amount: Number(quote.pricing?.base || 0),
        data: {
          ...quote,
          sowText,
          versions: nextVersions,
        },
      };
      const saved = persistedRef.current
        ? await sellerBackendApi.patchProviderJointQuote(quote.id, payload)
        : await sellerBackendApi.createProviderJointQuote(payload);
      const normalized = mapBackendJointQuote(saved);
      setQuote(normalized.quote as any);
      setVersions(normalized.versions.length ? (normalized.versions as any) : nextVersions);
      setSowText(normalized.sowText);
      persistedRef.current = true;
    } catch {
      pushToast({ title: "Save failed", message: "Could not persist joint quote.", tone: "danger" });
      return;
    }
    setDirty(false);
    pushToast({ title: "Saved", message: "Joint quote updated.", tone: "success" });
  };

  const requestApprovals = () => {
    updateQuote({
      approvals: {
        ...quote.approvals,
        internal: quote.approvals.internal.map((a) => ({ ...a, status: "Requested" })),
        buyer: { ...quote.approvals.buyer, status: "Requested" },
        lastActionAt: new Date().toISOString(),
      },
      status: "In Review",
    });
    pushToast({ title: "Approvals requested", message: "Internal and buyer approvals started.", tone: "default" });
  };

  const approveStep = (id) => {
    const next = JSON.parse(JSON.stringify(quote.approvals));
    const idx = next.internal.findIndex((x) => x.id === id);
    if (idx >= 0) next.internal[idx].status = "Approved";
    updateQuote({ approvals: { ...next, lastActionAt: new Date().toISOString() } });
    pushToast({ title: "Approved", message: "Approval step marked as approved.", tone: "success" });
  };

  const buyerApprove = () => {
    const next = JSON.parse(JSON.stringify(quote.approvals));
    next.buyer.status = "Approved";
    updateQuote({ approvals: { ...next, lastActionAt: new Date().toISOString() }, status: "Approved" });
    pushToast({ title: "Buyer approved", message: "Joint quote is approved.", tone: "success" });
  };

  const requestChanges = () => {
    updateQuote({
      approvals: {
        ...quote.approvals,
        buyer: { ...quote.approvals.buyer, status: "Changes requested" },
        lastActionAt: new Date().toISOString(),
      },
      status: "Changes Requested",
    });
    pushToast({ title: "Changes requested", message: "Buyer requested changes.", tone: "warning" });
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [newCollab, setNewCollab] = useState({ name: "", email: "", role: "Partner" });

  const addCollaborator = () => {
    if (!newCollab.name.trim() || !newCollab.email.trim()) {
      pushToast({ title: "Missing details", message: "Add name and email.", tone: "warning" });
      return;
    }
    const next = {
      id: makeId("p"),
      name: newCollab.name.trim(),
      email: newCollab.email.trim(),
      role: newCollab.role,
      status: "Invited",
    };
    updateQuote({ collaborators: [next, ...collaborators] });
    setInviteOpen(false);
    setNewCollab({ name: "", email: "", role: "Partner" });
    pushToast({ title: "Invite sent", message: "Collaborator invited.", tone: "success" });
  };

  const [deliverableOpen, setDeliverableOpen] = useState(false);
  const [newDeliv, setNewDeliv] = useState({ title: "", ownerId: collaborators[0]?.id || "", sharePct: 10, acceptance: "" });

  useEffect(() => {
    if (!deliverableOpen) return;
    setNewDeliv((s) => ({ ...s, ownerId: collaborators[0]?.id || "" }));
  }, [deliverableOpen, collaborators]);

  const addDeliverable = () => {
    if (!newDeliv.title.trim()) {
      pushToast({ title: "Missing title", message: "Add a deliverable title.", tone: "warning" });
      return;
    }
    const next = {
      id: makeId("d"),
      title: newDeliv.title.trim(),
      ownerId: newDeliv.ownerId || "",
      sharePct: clamp(Number(newDeliv.sharePct || 0), 0, 100),
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
      acceptance: newDeliv.acceptance.trim(),
    };
    updateQuote({ deliverables: [...deliverables, next] });
    setDeliverableOpen(false);
    setNewDeliv({ title: "", ownerId: collaborators[0]?.id || "", sharePct: 10, acceptance: "" });
    pushToast({ title: "Deliverable added", tone: "success" });
  };

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: "", ownerId: collaborators[0]?.id || "", amount: 10 });

  useEffect(() => {
    if (!milestoneOpen) return;
    setNewMilestone((s) => ({ ...s, ownerId: collaborators[0]?.id || "" }));
  }, [milestoneOpen, collaborators]);

  const addMilestone = () => {
    if (!newMilestone.title.trim()) {
      pushToast({ title: "Missing title", message: "Add a milestone title.", tone: "warning" });
      return;
    }
    const next = {
      id: makeId("m"),
      title: newMilestone.title.trim(),
      ownerId: newMilestone.ownerId || "",
      amount: clamp(Number(newMilestone.amount || 0), 0, 100),
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      status: "Draft",
    };
    updateQuote({ milestones: [...milestones, next] });
    setMilestoneOpen(false);
    setNewMilestone({ title: "", ownerId: collaborators[0]?.id || "", amount: 10 });
    pushToast({ title: "Milestone added", tone: "success" });
  };

  const [sowText, setSowText] = useState(() => buildSowText(createEmptyQuote()));
  useEffect(() => {
    setSowText(buildSowText(quote));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await sellerBackendApi.getProviderJointQuotes();
        if (cancelled) return;
        const rows = Array.isArray(payload.jointQuotes) ? payload.jointQuotes : [];
        if (rows[0]) {
          const normalized = mapBackendJointQuote(rows[0] as Record<string, unknown>);
          setQuote(normalized.quote as any);
          setVersions(
            normalized.versions.length
              ? (normalized.versions as any)
              : [{ id: makeId("ver"), at: new Date().toISOString(), actor: "System", note: "Initial draft", snapshot: JSON.parse(JSON.stringify(normalized.quote)) }]
          );
          setSowText(normalized.sowText);
          persistedRef.current = true;
        }
      } catch {
        setQuote(createEmptyQuote());
        setVersions([]);
        setSowText(buildSowText(createEmptyQuote()));
        pushToast({ title: "Backend unavailable", message: "Could not fetch joint quote.", tone: "warning" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [autosaveAt, setAutosaveAt] = useState<string | null>(null);
  const autosaveRef = useRef<number | null>(null);
  useEffect(() => {
    if (!dirty) return;
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      setAutosaveAt(new Date().toISOString());
    }, 700);
    return () => {
      if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    };
  }, [dirty, quote]);

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
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Back", message: "Route back to /provider/home (demo).", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Joint Quote</div>
                <Badge tone="slate">/provider/joint-quote</Badge>
                <Badge tone={quote.status === "Approved" ? "green" : quote.status === "In Review" ? "orange" : quote.status === "Changes Requested" ? "danger" : "slate"}>
                  {quote.status}
                </Badge>
                {loading ? <Badge tone="slate">Loading backend</Badge> : null}
                <span className="ml-auto" />
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Collaboration builder with split responsibilities, approvals, versioning and SOW.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-700">
                <Sparkles className="h-4 w-4" />
                Completeness <span className="ml-1"><Badge tone={completeness >= 85 ? "green" : completeness >= 65 ? "orange" : "danger"}>{completeness}%</Badge></span>
              </div>

              {dirty ? <Badge tone="orange">Unsaved</Badge> : <Badge tone="green">Saved</Badge>}
              {autosaveAt ? <Badge tone="slate">Autosaved {fmtTime(autosaveAt)}</Badge> : <Badge tone="slate">Autosave</Badge>}

              <button
                type="button"
                onClick={() => {
                  safeCopy(quote.id);
                  pushToast({ title: "Copied", message: "Quote ID copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy ID
              </button>

              <button
                type="button"
                onClick={save}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left steps */}
          <div className="lg:col-span-4">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Builder</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Steps for collaboration and approvals.</div>
                </div>
                <Badge tone="slate">{quote.id}</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {steps.map((s) => (
                  <StepPill
                    key={s.key}
                    active={step === s.key}
                    label={s.key}
                    hint={s.hint}
                    icon={s.icon}
                    tone={s.tone}
                    onClick={() => setStep(s.key)}
                  />
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-orange-900">Super premium</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Approvals, versioning and auto-generated SOW included.</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setStep("Approvals")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-800"
                      >
                        <ChevronRight className="h-4 w-4" />
                        Open approvals
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep("SOW")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate SOW
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Main content */}
          <div className="lg:col-span-8">
            <GlassCard className="overflow-hidden">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-900">{step}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Edit, save versions, request approvals and send to buyer.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {shareSum !== 100 ? <Badge tone="orange">Share {shareSum}%</Badge> : <Badge tone="green">Share 100%</Badge>}
                    <Badge tone="slate">Updated {fmtTime(quote.updatedAt)}</Badge>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.16 }}
                  >
                    {step === "Overview" ? (
                      <div className="grid gap-4">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-black text-slate-900">Quote summary</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Define scope and buyer-facing context.</div>

                              <div className="mt-4 grid gap-3">
                                <div>
                                  <div className="text-[11px] font-extrabold text-slate-600">Title</div>
                                  <input
                                    value={quote.title}
                                    onChange={(e) => updateQuote({ title: e.target.value })}
                                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                                  />
                                </div>

                                <div>
                                  <div className="text-[11px] font-extrabold text-slate-600">Scope</div>
                                  <textarea
                                    value={quote.scope}
                                    onChange={(e) => updateQuote({ scope: e.target.value })}
                                    rows={5}
                                    className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                                  />
                                  <div className="mt-1 text-[11px] font-semibold text-slate-500">Tip: include acceptance criteria and exclusions.</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Buyer</div>
                              <span className="ml-auto"><Badge tone="slate">Org</Badge></span>
                            </div>
                            <div className="mt-3 text-sm font-extrabold text-slate-900">{quote.buyer.org}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">{quote.buyer.contact} · {quote.buyer.location}</div>
                            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800">
                              <Link2 className="h-4 w-4" />
                              {quote.buyer.email}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Readiness checks</div>
                              <span className="ml-auto"><Badge tone={shareSum === 100 ? "green" : "orange"}>Status</Badge></span>
                            </div>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                              <li>At least 2 collaborators</li>
                              <li>Deliverables split totals 100%</li>
                              <li>Milestones sum to 100% (recommended)</li>
                              <li>Approvals requested before sending</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === "Collaborators" ? (
                      <div className="grid gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setInviteOpen(true)}
                            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <UserPlus className="h-4 w-4" />
                            Invite collaborator
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              pushToast({ title: "Permissions", message: "Fine-grained permissions can be added per collaborator.", tone: "default" });
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Permissions
                          </button>
                          <span className="ml-auto"><Badge tone="slate">{collaborators.length} collaborators</Badge></span>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Collaboration builder</div>
                            <span className="ml-auto"><Badge tone="slate">Core</Badge></span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-500">Invite providers, define roles, and set who owns which deliverables.</div>

                          <div className="mt-4 space-y-2">
                            {collaborators.map((c) => (
                              <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                                  <Users className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-black text-slate-900">{c.name}</div>
                                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{c.email}</div>
                                </div>
                                <Badge tone={c.role === "Lead" ? "green" : "slate"}>{c.role}</Badge>
                                <Badge tone={c.status === "Active" ? "green" : c.status === "Invited" ? "orange" : "slate"}>{c.status}</Badge>

                                <button
                                  type="button"
                                  onClick={() => {
                                    updateQuote({ collaborators: collaborators.map((x) => (x.id === c.id ? { ...x, status: x.status === "Active" ? "Invited" : "Active" } : x)) });
                                    pushToast({ title: "Updated", message: "Collaborator status toggled (demo).", tone: "success" });
                                  }}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                >
                                  <Check className="h-4 w-4" />
                                  Toggle status
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (c.role === "Lead") {
                                      pushToast({ title: "Not allowed", message: "Lead cannot be removed in this demo.", tone: "warning" });
                                      return;
                                    }
                                    updateQuote({
                                      collaborators: collaborators.filter((x) => x.id !== c.id),
                                      deliverables: deliverables.map((d) => (d.ownerId === c.id ? { ...d, ownerId: "" } : d)),
                                      milestones: milestones.map((m) => (m.ownerId === c.id ? { ...m, ownerId: "" } : m)),
                                    });
                                    pushToast({ title: "Removed", message: "Collaborator removed.", tone: "success" });
                                  }}
                                  className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                                  aria-label="Remove"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                            {collaborators.length === 0 ? (
                              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-6 text-sm font-semibold text-slate-600">No collaborators. Invite one to start splitting responsibilities.</div>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <MessageCircle className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">Premium extension</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">Add a collab chat, shared files, and role-based permissions per step.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === "Responsibilities" ? (
                      <div className="grid gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliverableOpen(true)}
                            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <Plus className="h-4 w-4" />
                            Add deliverable
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              // Auto-normalize to 100
                              const sum = deliverables.reduce((s, d) => s + Number(d.sharePct || 0), 0);
                              if (!deliverables.length || sum === 0) {
                                pushToast({ title: "Nothing to normalize", message: "Add deliverables first.", tone: "warning" });
                                return;
                              }
                              const next = deliverables.map((d) => {
                                const pct = Math.round((Number(d.sharePct || 0) / sum) * 100);
                                return { ...d, sharePct: pct };
                              });
                              // fix rounding drift
                              const drift = 100 - next.reduce((s, d) => s + d.sharePct, 0);
                              if (drift !== 0) next[0] = { ...next[0], sharePct: next[0].sharePct + drift };
                              updateQuote({ deliverables: next });
                              pushToast({ title: "Auto-split", message: "Shares normalized to 100%.", tone: "success" });
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Sparkles className="h-4 w-4" />
                            Auto-split to 100%
                          </button>

                          <span className="ml-auto"><Badge tone={shareSum === 100 ? "green" : "orange"}>Total share: {shareSum}%</Badge></span>
                        </div>

                        {shareSum !== 100 ? (
                          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                            <div className="flex items-start gap-3">
                              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-black text-orange-900">Split mismatch</div>
                                <div className="mt-1 text-xs font-semibold text-orange-900/70">Deliverable shares should total 100% for clean payouts and clear responsibilities.</div>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                          <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                            <div className="col-span-5">Deliverable</div>
                            <div className="col-span-3">Owner</div>
                            <div className="col-span-2">Share</div>
                            <div className="col-span-2">Actions</div>
                          </div>
                          <div className="divide-y divide-slate-200/70">
                            {deliverables.map((d) => {
                              const owner = collaborators.find((c) => c.id === d.ownerId);
                              return (
                                <div key={d.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                                  <div className="col-span-5">
                                    <div className="text-sm font-extrabold text-slate-900">{d.title}</div>
                                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Due {fmtTime(d.dueAt)}</div>
                                  </div>
                                  <div className="col-span-3">
                                    <div className="relative">
                                      <select
                                        value={d.ownerId || ""}
                                        onChange={(e) => {
                                          updateQuote({
                                            deliverables: deliverables.map((x) => (x.id === d.id ? { ...x, ownerId: e.target.value } : x)),
                                          });
                                        }}
                                        className="h-10 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                                      >
                                        <option value="">Unassigned</option>
                                        {collaborators.map((c) => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                      </select>
                                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                    {owner ? <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">{owner.role}</div> : null}
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      value={String(d.sharePct)}
                                      onChange={(e) => {
                                        const v = clamp(Number(e.target.value || 0), 0, 100);
                                        updateQuote({ deliverables: deliverables.map((x) => (x.id === d.id ? { ...x, sharePct: v } : x)) });
                                      }}
                                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-xs font-extrabold text-slate-800 outline-none"
                                    />
                                    <div className="mt-1 text-[11px] font-semibold text-slate-500">%</div>
                                  </div>
                                  <div className="col-span-2 flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        safeCopy(d.acceptance || d.title);
                                        pushToast({ title: "Copied", message: "Acceptance criteria copied.", tone: "success" });
                                      }}
                                      className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                                      aria-label="Copy"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateQuote({ deliverables: deliverables.filter((x) => x.id !== d.id) });
                                        pushToast({ title: "Removed", message: "Deliverable removed.", tone: "success" });
                                      }}
                                      className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                                      aria-label="Remove"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {deliverables.length === 0 ? (
                              <div className="p-6 text-sm font-semibold text-slate-600">No deliverables yet. Add one to start splitting responsibilities.</div>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Split preview</div>
                            <span className="ml-auto"><Badge tone="slate">From deliverables</Badge></span>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {splits.map((s) => (
                              <div key={s.ownerId} className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-xs font-extrabold text-slate-900">{s.ownerName}</div>
                                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Share {s.pct}%</div>
                                </div>
                                <div className="text-xs font-black text-slate-900">{fmtMoney(s.amount, quote.currency)}</div>
                              </div>
                            ))}
                            {splits.length === 0 ? <div className="text-xs font-semibold text-slate-500">Add deliverables to see split.</div> : null}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === "Milestones" ? (
                      <div className="grid gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setMilestoneOpen(true)}
                            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <Plus className="h-4 w-4" />
                            Add milestone
                          </button>
                          <span className="ml-auto"><Badge tone="slate">{milestones.length} milestones</Badge></span>
                        </div>

                        <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                          <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                            <div className="col-span-5">Milestone</div>
                            <div className="col-span-3">Owner</div>
                            <div className="col-span-2">Payment share</div>
                            <div className="col-span-2">Actions</div>
                          </div>
                          <div className="divide-y divide-slate-200/70">
                            {milestones.map((m) => {
                              const owner = collaborators.find((c) => c.id === m.ownerId);
                              return (
                                <div key={m.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                                  <div className="col-span-5">
                                    <div className="text-sm font-extrabold text-slate-900">{m.title}</div>
                                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Due {fmtTime(m.dueAt)}</div>
                                  </div>
                                  <div className="col-span-3">
                                    <div className="relative">
                                      <select
                                        value={m.ownerId || ""}
                                        onChange={(e) => {
                                          updateQuote({ milestones: milestones.map((x) => (x.id === m.id ? { ...x, ownerId: e.target.value } : x)) });
                                        }}
                                        className="h-10 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                                      >
                                        <option value="">Unassigned</option>
                                        {collaborators.map((c) => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                      </select>
                                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                    {owner ? <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">{owner.role}</div> : null}
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      value={String(m.amount)}
                                      onChange={(e) => {
                                        const v = clamp(Number(e.target.value || 0), 0, 100);
                                        updateQuote({ milestones: milestones.map((x) => (x.id === m.id ? { ...x, amount: v } : x)) });
                                      }}
                                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-xs font-extrabold text-slate-800 outline-none"
                                    />
                                    <div className="mt-1 text-[11px] font-semibold text-slate-500">%</div>
                                  </div>
                                  <div className="col-span-2 flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateQuote({ milestones: milestones.filter((x) => x.id !== m.id) });
                                        pushToast({ title: "Removed", message: "Milestone removed.", tone: "success" });
                                      }}
                                      className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                                      aria-label="Remove"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {milestones.length === 0 ? (
                              <div className="p-6 text-sm font-semibold text-slate-600">No milestones yet. Add one to structure payment releases.</div>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">Premium idea</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-align milestones to deliverable owners and prevent totals exceeding 100%.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === "Pricing" ? (
                      <div className="grid gap-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Totals</div>
                              <span className="ml-auto"><Badge tone="slate">{quote.currency}</Badge></span>
                            </div>

                            <div className="mt-4 grid gap-3">
                              <div>
                                <div className="text-[11px] font-extrabold text-slate-600">Base price</div>
                                <input
                                  value={String(pricing.base)}
                                  onChange={(e) => updateQuote({ pricing: { ...pricing, base: Number(e.target.value) } })}
                                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                />
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <div className="text-[11px] font-extrabold text-slate-600">Platform fee (%)</div>
                                  <input
                                    value={String(pricing.platformFeePct)}
                                    onChange={(e) => updateQuote({ pricing: { ...pricing, platformFeePct: Number(e.target.value) } })}
                                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                  />
                                </div>
                                <div>
                                  <div className="text-[11px] font-extrabold text-slate-600">Taxes (%)</div>
                                  <input
                                    value={String(pricing.taxesPct)}
                                    onChange={(e) => updateQuote({ pricing: { ...pricing, taxesPct: Number(e.target.value) } })}
                                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                  />
                                </div>
                              </div>

                              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700"><span>Base</span><span className="font-black">{fmtMoney(base, quote.currency)}</span></div>
                                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-700"><span>Platform fee</span><span className="font-black">{fmtMoney(fee, quote.currency)}</span></div>
                                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-700"><span>Taxes</span><span className="font-black">{fmtMoney(taxes, quote.currency)}</span></div>
                                <div className="mt-3 h-px bg-slate-200/70" />
                                <div className="mt-3 flex items-center justify-between text-xs font-extrabold text-slate-900"><span>Total</span><span>{fmtMoney(total, quote.currency)}</span></div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Payout split</div>
                              <span className="ml-auto"><Badge tone={shareSum === 100 ? "green" : "orange"}>{shareSum === 100 ? "Ready" : "Needs 100%"}</Badge></span>
                            </div>
                            <div className="mt-2 text-xs font-semibold text-slate-500">Calculated from deliverables shares. Adjust on Responsibilities step.</div>

                            <div className="mt-4 space-y-2">
                              {splits.map((s) => (
                                <div key={s.ownerId} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm font-black text-slate-900">{s.ownerName}</div>
                                      <div className="mt-1 text-xs font-semibold text-slate-500">{s.pct}% share</div>
                                    </div>
                                    <div className="text-sm font-black text-slate-900">{fmtMoney(s.amount, quote.currency)}</div>
                                  </div>
                                </div>
                              ))}
                              {splits.length === 0 ? <div className="text-sm font-semibold text-slate-600">No split available. Add deliverables first.</div> : null}
                            </div>

                            <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                              <div className="flex items-start gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                                  <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-black text-orange-900">Premium guardrails</div>
                                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Lock split after internal approvals. Changes create a new version automatically.</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === "Review & Send" ? (
                      <div className="grid gap-4">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Buyer message</div>
                            <span className="ml-auto"><Badge tone="slate">Submit</Badge></span>
                          </div>

                          <div className="mt-3 grid gap-3">
                            <div>
                              <div className="text-[11px] font-extrabold text-slate-600">Message</div>
                              <textarea
                                value={quote.message}
                                onChange={(e) => updateQuote({ message: e.target.value })}
                                rows={5}
                                className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSending(true);
                                  window.setTimeout(() => {
                                    setSending(false);
                                    pushToast({
                                      title: "Sent",
                                      message: "Quote shared with buyer (demo).",
                                      tone: "success",
                                      action: { label: "Open approvals", onClick: () => setStep("Approvals") },
                                    });
                                  }, 900);
                                }}
                                className={cx(
                                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                                  sending && "opacity-80"
                                )}
                                style={{ background: TOKENS.orange }}
                              >
                                <Send className="h-4 w-4" />
                                Send to buyer
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  safeCopy(JSON.stringify(quote, null, 2));
                                  pushToast({ title: "Copied", message: "Quote JSON copied.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                                Copy JSON
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  pushToast({ title: "Export", message: "Export PDF can be wired here.", tone: "default" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <FileText className="h-4 w-4" />
                                Export PDF
                              </button>

                              <span className="ml-auto"><Badge tone={quote.status === "In Review" ? "orange" : "slate"}>{quote.status}</Badge></span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">Recommended flow</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">Request approvals before sending to buyer for higher trust and fewer disputes.</div>
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() => setStep("Approvals")}
                                  className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-800"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                  Go to approvals
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === "Approvals" ? (
                      <div className="grid gap-4">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Approval workflow</div>
                            <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-500">Internal approvals first, then buyer approval. Any edits after approval should create a new version.</div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={requestApprovals}
                              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.orange }}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              Request approvals
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateQuote({ approvals: { ...quote.approvals, internal: quote.approvals.internal.map((a) => ({ ...a, status: "Pending" })), buyer: { ...quote.approvals.buyer, status: "Not requested" } }, status: "Draft" });
                                pushToast({ title: "Reset", message: "Approval statuses reset (demo).", tone: "default" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <X className="h-4 w-4" />
                              Reset
                            </button>
                            {quote.approvals?.lastActionAt ? <Badge tone="slate">Last action {fmtTime(quote.approvals.lastActionAt)}</Badge> : <Badge tone="slate">No actions</Badge>}
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="text-sm font-black text-slate-900">Internal approvals</div>
                            <div className="mt-2 space-y-2">
                              {quote.approvals.internal.map((a) => {
                                const actor = collaborators.find((c) => c.id === a.actorId)?.name || "Unknown";
                                const tone = a.status === "Approved" ? "green" : a.status === "Requested" ? "orange" : "slate";
                                return (
                                  <div key={a.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                                    <div className="flex items-center gap-2">
                                      <Badge tone={tone}>{a.status}</Badge>
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-xs font-extrabold text-slate-900">{a.label}</div>
                                        <div className="mt-1 text-[11px] font-semibold text-slate-500">Actor: {actor}</div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => approveStep(a.id)}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800"
                                      >
                                        <CheckCheck className="h-4 w-4" />
                                        Approve
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="text-sm font-black text-slate-900">Buyer approval</div>
                            <div className="mt-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                              <div className="flex items-center gap-2">
                                <Badge tone={quote.approvals.buyer.status === "Approved" ? "green" : quote.approvals.buyer.status === "Requested" ? "orange" : quote.approvals.buyer.status === "Changes requested" ? "danger" : "slate"}>
                                  {quote.approvals.buyer.status}
                                </Badge>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-xs font-extrabold text-slate-900">{quote.approvals.buyer.label}</div>
                                  <div className="mt-1 text-[11px] font-semibold text-slate-500">Buyer: {quote.buyer.org}</div>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={buyerApprove}
                                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                  style={{ background: TOKENS.green }}
                                >
                                  <CheckCheck className="h-4 w-4" />
                                  Mark approved
                                </button>
                                <button
                                  type="button"
                                  onClick={requestChanges}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-800"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                  Request changes
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                              <div className="flex items-start gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                                  <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-black text-orange-900">Premium automation</div>
                                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-lock payouts after buyer approval, and auto-generate a final SOW version.</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === "Versions" ? (
                      <div className="grid gap-4">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Version history</div>
                            <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-500">Every save creates a version. You can restore a prior version.</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                save();
                                pushToast({ title: "Version created", message: "Saved and versioned.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.orange }}
                            >
                              <Save className="h-4 w-4" />
                              Save as new version
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(JSON.stringify(versions[0]?.snapshot || {}, null, 2));
                                pushToast({ title: "Copied", message: "Latest version snapshot copied.", tone: "default" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy latest snapshot
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {versions.slice(0, 10).map((v, idx) => (
                            <div key={v.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                              <div className="flex items-center gap-2">
                                <Badge tone="slate">v{String(versions.length - idx)}</Badge>
                                <div className="text-xs font-extrabold text-slate-700">{fmtTime(v.at)}</div>
                                <span className="ml-auto"><Badge tone="slate">{v.actor}</Badge></span>
                              </div>
                              <div className="mt-2 text-sm font-black text-slate-900 truncate">{v.snapshot.title}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500 truncate">{v.note}</div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuote(JSON.parse(JSON.stringify(v.snapshot)));
                                    setDirty(false);
                                    pushToast({ title: "Restored", message: "Quote restored from version.", tone: "success" });
                                  }}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-800"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                  Restore
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    safeCopy(JSON.stringify(v.snapshot, null, 2));
                                    pushToast({ title: "Copied", message: "Version snapshot copied.", tone: "default" });
                                  }}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {step === "SOW" ? (
                      <div className="grid gap-4">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-orange-700" />
                            <div className="text-sm font-black text-slate-900">Auto-generated SOW</div>
                            <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-500">Generated from scope, deliverables, milestones, pricing, and approvals.</div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const t = buildSowText(quote);
                                setSowText(t);
                                pushToast({ title: "Regenerated", message: "SOW updated from the latest quote.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.orange }}
                            >
                              <Sparkles className="h-4 w-4" />
                              Regenerate
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(sowText);
                                pushToast({ title: "Copied", message: "SOW copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Export", message: "Export to PDF/DOCX can be wired here.", tone: "default" })}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <FileText className="h-4 w-4" />
                              Export
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-extrabold text-slate-600">SOW editor</div>
                            <Badge tone="slate">Editable</Badge>
                          </div>
                          <textarea
                            value={sowText}
                            onChange={(e) => setSowText(e.target.value)}
                            rows={18}
                            className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-[12px] font-semibold text-slate-800 outline-none focus:border-slate-300"
                          />
                        </div>

                        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                              <CheckCheck className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-emerald-900">SOW readiness</div>
                              <div className="mt-1 text-xs font-semibold text-emerald-900/70">When buyer is approved, you can finalize and lock this SOW.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer bar */}
              <div className="sticky bottom-0 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = steps.findIndex((s) => s.key === step);
                      const next = steps[Math.max(0, idx - 1)]?.key;
                      if (next) setStep(next);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const idx = steps.findIndex((s) => s.key === step);
                      const next = steps[Math.min(steps.length - 1, idx + 1)]?.key;
                      if (next) setStep(next);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <span className="ml-auto" />

                  <button
                    type="button"
                    onClick={() => {
                      if (shareSum !== 100) {
                        pushToast({ title: "Fix split", message: "Set deliverables to 100% before requesting approvals.", tone: "warning" });
                        setStep("Responsibilities");
                        return;
                      }
                      requestApprovals();
                      setStep("Approvals");
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Request approvals
                  </button>

                  <button
                    type="button"
                    onClick={save}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        open={inviteOpen}
        title="Invite collaborator"
        subtitle="Add a provider, assign role, and send an invite."
        onClose={() => setInviteOpen(false)}
      >
        <div className="grid gap-3">
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Name</div>
            <input
              value={newCollab.name}
              onChange={(e) => setNewCollab((s) => ({ ...s, name: e.target.value }))}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              placeholder="Partner Provider"
            />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Email</div>
            <input
              value={newCollab.email}
              onChange={(e) => setNewCollab((s) => ({ ...s, email: e.target.value }))}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              placeholder="partner@company.com"
            />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Role</div>
            <div className="relative mt-2">
              <select
                value={newCollab.role}
                onChange={(e) => setNewCollab((s) => ({ ...s, role: e.target.value }))}
                className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
              >
                <option>Partner</option>
                <option>Specialist</option>
                <option>Reviewer</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <button
            type="button"
            onClick={addCollaborator}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <UserPlus className="h-5 w-5" />
            Send invite
          </button>
        </div>
      </Modal>

      <Modal
        open={deliverableOpen}
        title="Add deliverable"
        subtitle="Define responsibility and share percentage."
        onClose={() => setDeliverableOpen(false)}
      >
        <div className="grid gap-3">
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Deliverable title</div>
            <input
              value={newDeliv.title}
              onChange={(e) => setNewDeliv((s) => ({ ...s, title: e.target.value }))}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              placeholder="e.g., Site survey and safety checklist"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-extrabold text-slate-600">Owner</div>
              <div className="relative mt-2">
                <select
                  value={newDeliv.ownerId}
                  onChange={(e) => setNewDeliv((s) => ({ ...s, ownerId: e.target.value }))}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  <option value="">Unassigned</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-extrabold text-slate-600">Share (%)</div>
              <input
                value={String(newDeliv.sharePct)}
                onChange={(e) => setNewDeliv((s) => ({ ...s, sharePct: Number(e.target.value) }))}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              />
              <div className="mt-1 text-[11px] font-semibold text-slate-500">Adjust later to total 100%.</div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Acceptance criteria</div>
            <textarea
              value={newDeliv.acceptance}
              onChange={(e) => setNewDeliv((s) => ({ ...s, acceptance: e.target.value }))}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
              placeholder="How the buyer will accept this deliverable"
            />
          </div>

          <button
            type="button"
            onClick={addDeliverable}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <Plus className="h-5 w-5" />
            Add deliverable
          </button>
        </div>
      </Modal>

      <Modal
        open={milestoneOpen}
        title="Add milestone"
        subtitle="Milestones help structure payment releases."
        onClose={() => setMilestoneOpen(false)}
      >
        <div className="grid gap-3">
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Milestone title</div>
            <input
              value={newMilestone.title}
              onChange={(e) => setNewMilestone((s) => ({ ...s, title: e.target.value }))}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              placeholder="e.g., Planning completed"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-extrabold text-slate-600">Owner</div>
              <div className="relative mt-2">
                <select
                  value={newMilestone.ownerId}
                  onChange={(e) => setNewMilestone((s) => ({ ...s, ownerId: e.target.value }))}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  <option value="">Unassigned</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-extrabold text-slate-600">Payment share (%)</div>
              <input
                value={String(newMilestone.amount)}
                onChange={(e) => setNewMilestone((s) => ({ ...s, amount: Number(e.target.value) }))}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              />
              <div className="mt-1 text-[11px] font-semibold text-slate-500">Milestones typically total 100%.</div>
            </div>
          </div>

          <button
            type="button"
            onClick={addMilestone}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <Plus className="h-5 w-5" />
            Add milestone
          </button>
        </div>
      </Modal>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
