import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMockState } from "../../mocks";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Plus,
  GraduationCap,
  HeartHandshake,
  Building2,
  CalendarClock,
  BadgeCheck,
} from "lucide-react";

/**
 * Regulatory Desks Home (Seller-facing)
 * Suggested route: /regulatory
 * Purpose: Give sellers/providers a single place to manage regulated products/services/content.
 * Core:
 * - Desk cards (HealthMart, EduMart, FaithMart)
 * - My submissions queue + filters + bulk actions
 * - Quick tasks + policy updates
 * Super premium:
 * - Explainable risk scoring
 * - Evidence pack builder
 * - New submission wizard (drawer)
 * - Submission detail drawer (timeline + docs + actions)
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

type DeskKey = "healthmart" | "edumart" | "faithmart";
type SubmissionStatus = "Draft" | "Submitted" | "Under review" | "Needs changes" | "Approved" | "Rejected";
type SubmissionType = "Product" | "Service" | "Content";
type SubmissionNote = { id: string; body: string; createdAt: string };
type Submission = {
  id: string;
  desk: DeskKey;
  subdesk?: string;
  type: SubmissionType;
  itemName: string;
  status: SubmissionStatus;
  risk: number;
  docsCompletePct: number;
  dueAt: string;
  updatedAt: string;
  notesCount: number;
  evidenceReady: boolean;
  signals: string[];
  uploadedDocs?: UploadedDoc[];
  notes?: SubmissionNote[];
};
type UploadedDoc = { id: string; name: string; uploadedAt: string; sizeLabel: string };
type PolicyUpdate = { id: string; desk: DeskKey | "all"; at: string; title: string; summary: string };
type Task = { id: string; desk: DeskKey; dueAt: string; tone: BadgeTone; title: string; cta: string };

type BadgeProps = { children: React.ReactNode; tone?: BadgeTone };
type GlassCardProps = { children: React.ReactNode; className?: string };
type ChipProps = { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "green" | "orange" };
type IconButtonProps = { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean };
type SwitchProps = { checked: boolean; onChange: (next: boolean) => void; label: string };
type DrawerProps = { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode };
type ToastCenterProps = { toasts: Toast[]; dismiss: (id: string) => void };

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
        active
          ? activeCls
          : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function IconButton({ label, onClick, children, danger }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white dark:bg-slate-900/85 transition",
        danger
          ? "border-rose-200 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          : "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 items-center rounded-full border transition",
        checked ? "border-emerald-200 bg-emerald-500" : "border-slate-200/70 bg-white dark:bg-slate-900"
      )}
    >
      <span
        className={cx(
          "absolute h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow-sm transition",
          checked ? "left-[22px]" : "left-[2px]"
        )}
      />
    </button>
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

function ToastCenter({ toasts, dismiss }: ToastCenterProps) {
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
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
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

// ---------------- Data ----------------

function seedData(): { submissions: Submission[]; policies: PolicyUpdate[]; tasks: Task[] } {
  const now = Date.now();
  const ago = (m: number) => new Date(now - m * 60_000).toISOString();
  const inD = (d: number) => new Date(now + d * 24 * 60_000).toISOString();

  const submissions: Submission[] = [
    {
      id: "SUB-22091",
      desk: "healthmart",
      subdesk: "Pharmacy",
      type: "Product",
      itemName: "OTC Pain Reliever Pack (Retail)",
      status: "Needs changes",
      risk: 72,
      docsCompletePct: 64,
      dueAt: inD(2),
      updatedAt: ago(90),
      notesCount: 2,
      evidenceReady: false,
      signals: ["Restricted category", "Labeling"],
    },
    {
      id: "SUB-22088",
      desk: "healthmart",
      subdesk: "Logistics",
      type: "Service",
      itemName: "Cold-chain delivery service",
      status: "Under review",
      risk: 44,
      docsCompletePct: 86,
      dueAt: inD(5),
      updatedAt: ago(45),
      notesCount: 1,
      evidenceReady: true,
      signals: ["License present", "Route coverage"],
    },
    {
      id: "SUB-22080",
      desk: "edumart",
      type: "Content",
      itemName: "Children STEM video course",
      status: "Submitted",
      risk: 38,
      docsCompletePct: 78,
      dueAt: inD(7),
      updatedAt: ago(240),
      notesCount: 0,
      evidenceReady: false,
      signals: ["Child-safe", "Age gating"],
    },
    {
      id: "SUB-22072",
      desk: "faithmart",
      type: "Content",
      itemName: "Community event poster pack",
      status: "Approved",
      risk: 12,
      docsCompletePct: 100,
      dueAt: inD(30),
      updatedAt: ago(1440),
      notesCount: 1,
      evidenceReady: true,
      signals: ["Policy match"],
    },
    {
      id: "SUB-22065",
      desk: "healthmart",
      subdesk: "Equipment",
      type: "Product",
      itemName: "Diagnostic scanner (import)",
      status: "Under review",
      risk: 58,
      docsCompletePct: 82,
      dueAt: inD(4),
      updatedAt: ago(120),
      notesCount: 0,
      evidenceReady: true,
      signals: ["Certificate review", "Import rules"],
    },
    {
      id: "SUB-22055",
      desk: "edumart",
      type: "Product",
      itemName: "Primary school workbooks",
      status: "Draft",
      risk: 26,
      docsCompletePct: 40,
      dueAt: inD(10),
      updatedAt: ago(15),
      notesCount: 0,
      evidenceReady: false,
      signals: ["Age suitability"],
    },
    {
      id: "SUB-22041",
      desk: "faithmart",
      type: "Service",
      itemName: "Community mentoring service",
      status: "Submitted",
      risk: 22,
      docsCompletePct: 72,
      dueAt: inD(9),
      updatedAt: ago(330),
      notesCount: 0,
      evidenceReady: false,
      signals: ["Community guidelines"],
    },
    {
      id: "SUB-22022",
      desk: "healthmart",
      subdesk: "Pharmacy",
      type: "Product",
      itemName: "Medical gloves (bulk)",
      status: "Approved",
      risk: 18,
      docsCompletePct: 100,
      dueAt: inD(45),
      updatedAt: ago(2880),
      notesCount: 0,
      evidenceReady: true,
      signals: ["Certificate ok"],
    },
  ];

  const policies: PolicyUpdate[] = [
    {
      id: "POL-901",
      desk: "healthmart",
      at: ago(320),
      title: "HealthMart: Updated labeling rules",
      summary: "Add batch/expiry fields on packaging photos for pharmacy items.",
    },
    {
      id: "POL-902",
      desk: "edumart",
      at: ago(980),
      title: "EduMart: Child content review checklist",
      summary: "Add age rating, content outline, and instructor bio for courses.",
    },
    {
      id: "POL-903",
      desk: "faithmart",
      at: ago(1600),
      title: "FaithMart: Community guideline reminder",
      summary: "No hate speech, no harassment, and respect local community rules.",
    },
    {
      id: "POL-904",
      desk: "all",
      at: ago(2400),
      title: "Evidence packs now supported",
      summary: "Generate an evidence bundle for approvals, audits, and disputes.",
    },
  ];

  const tasks: Task[] = [
    {
      id: "TSK-101",
      desk: "healthmart",
      dueAt: inD(2),
      tone: "danger",
      title: "Upload missing product license (Pharmacy)",
      cta: "Upload docs",
    },
    {
      id: "TSK-102",
      desk: "healthmart",
      dueAt: inD(3),
      tone: "orange",
      title: "Add import certificate (Equipment)",
      cta: "Attach certificate",
    },
    {
      id: "TSK-201",
      desk: "edumart",
      dueAt: inD(7),
      tone: "orange",
      title: "Add age rating + outline for course",
      cta: "Update submission",
    },
    {
      id: "TSK-301",
      desk: "faithmart",
      dueAt: inD(10),
      tone: "slate",
      title: "Add community moderation contact",
      cta: "Add details",
    },
  ];

  return { submissions, policies, tasks };
}

function deskMeta(desk: DeskKey) {
  if (desk === "healthmart") return { title: "HealthMart Desk", icon: Building2, accent: "orange" as const, subtitle: "Health products and services" };
  if (desk === "edumart") return { title: "EduMart Desk", icon: GraduationCap, accent: "green" as const, subtitle: "Education products and child-safe content" };
  return { title: "FaithMart Desk", icon: HeartHandshake, accent: "green" as const, subtitle: "Community services and content restrictions" };
}

function statusTone(status: SubmissionStatus) {
  if (status === "Approved") return "green";
  if (status === "Needs changes") return "danger";
  if (status === "Rejected") return "danger";
  if (status === "Under review" || status === "Submitted") return "orange";
  if (status === "Draft") return "slate";
  return "slate";
}

function riskTone(risk: number) {
  const r = clamp(Number(risk || 0), 0, 100);
  if (r >= 70) return "danger";
  if (r >= 45) return "orange";
  return "green";
}

function riskLabel(risk: number) {
  const r = clamp(Number(risk || 0), 0, 100);
  if (r >= 70) return "High";
  if (r >= 45) return "Medium";
  return "Low";
}

function MiniRow({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "orange" | "danger" | "green" }) {
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

function ProgressBar({ pct, tone }: { pct: number; tone: "green" | "orange" | "danger" }) {
  const v = clamp(Number(pct || 0), 0, 100);
  return (
    <div className="mt-2 h-2 rounded-full bg-slate-100">
      <div
        className={cx(
          "h-2 rounded-full",
          tone === "green" && "bg-emerald-500",
          tone === "orange" && "bg-orange-500",
          tone === "danger" && "bg-rose-500"
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

// ---------------- Page ----------------

export default function RegulatoryDesksHome() {
  const navigate = useNavigate();
  const [data, setData] = useMockState("desks.regulatory.overview", seedData());

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [desk, setDesk] = useState<DeskKey | "all">("all");
  const [status, setStatus] = useState<SubmissionStatus | "All">("All");
  const [subdesk, setSubdesk] = useState<string>("All");
  const [query, setQuery] = useState("");

  const desks: DeskKey[] = ["healthmart", "edumart", "faithmart"];

  const subdeskOptions = useMemo(() => {
    const set = new Set<string>();
    data.submissions
      .filter((s) => (desk === "all" ? true : s.desk === desk))
      .forEach((s) => {
        if (s.subdesk) set.add(s.subdesk);
      });
    return ["All", ...Array.from(set).sort()];
  }, [data.submissions, desk]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.submissions
      .filter((s) => (desk === "all" ? true : s.desk === desk))
      .filter((s) => (status === "All" ? true : s.status === status))
      .filter((s) => (subdesk === "All" ? true : (s.subdesk || "") === subdesk))
      .filter((s) => {
        if (!q) return true;
        const hay = [s.id, s.itemName, s.type, s.status, s.subdesk || "", s.signals.join(" ")].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [data.submissions, desk, status, subdesk, query]);

  const kpis = useMemo(() => {
    const list = data.submissions;
    const active = list.filter((s) => ["Draft", "Submitted", "Under review", "Needs changes"].includes(s.status)).length;
    const actionNeeded = list.filter((s) => s.status === "Needs changes").length;
    const approved = list.filter((s) => s.status === "Approved").length;
    const avgRisk = list.length ? Math.round(list.reduce((sum, s) => sum + s.risk, 0) / list.length) : 0;
    return { active, actionNeeded, approved, avgRisk };
  }, [data.submissions]);

  const deskCards = useMemo(() => {
    return desks.map((d) => {
      const list = data.submissions.filter((s) => s.desk === d);
      const pending = list.filter((s) => s.status === "Under review" || s.status === "Submitted").length;
      const action = list.filter((s) => s.status === "Needs changes").length;
      const approved = list.filter((s) => s.status === "Approved").length;
      const avg = list.length ? Math.round(list.reduce((sum, s) => sum + s.risk, 0) / list.length) : 0;
      return { d, pending, action, approved, avg, total: list.length };
    });
  }, [data.submissions]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedRows = useMemo(() => filtered.filter((s) => selectedIds.includes(s.id)), [filtered, selectedIds]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((s) => selected[s.id]);
  const toggleAll = () => {
    if (!filtered.length) return;
    const next = { ...selected };
    if (allVisibleSelected) {
      filtered.forEach((s) => delete next[s.id]);
    } else {
      filtered.forEach((s) => (next[s.id] = true));
    }
    setSelected(next);
  };

  // Drawers
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const active = useMemo(() => data.submissions.find((s) => s.id === detailId) || null, [data.submissions, detailId]);

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const [newOpen, setNewOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [draft, setDraft] = useState({
    desk: "healthmart" as DeskKey,
    subdesk: "Pharmacy",
    type: "Product" as SubmissionType,
    itemName: "",
    listingRef: "",
    docs: {
      license: false,
      certificate: false,
      labeling: false,
      ageRating: false,
      policyAck: true,
    },
  });

  useEffect(() => {
    if (!newOpen) return;
    setWizardStep(1);
    setDraft({
      desk: "healthmart",
      subdesk: "Pharmacy",
      type: "Product",
      itemName: "",
      listingRef: "",
      docs: { license: false, certificate: false, labeling: false, ageRating: false, policyAck: true },
    });
  }, [newOpen]);

  const computedDraftRisk = useMemo(() => {
    // Explainable risk model (seller-facing):
    // - Desk base risk
    // - Doc completeness
    // - Type
    const base = draft.desk === "healthmart" ? 45 : draft.desk === "edumart" ? 30 : 24;
    const docScore = Object.values(draft.docs).filter(Boolean).length / Object.keys(draft.docs).length;
    const docPenalty = Math.round((1 - docScore) * 45);
    const typeAdj = draft.type === "Product" ? 10 : draft.type === "Service" ? 6 : 12;

    const r = clamp(base + docPenalty + typeAdj, 0, 100);
    return {
      score: r,
      breakdown: [
        { k: "Desk baseline", v: base },
        { k: "Doc completeness penalty", v: docPenalty },
        { k: "Type adjustment", v: typeAdj },
      ],
    };
  }, [draft]);

  const computedDraftDocsPct = useMemo(() => {
    const total = Object.keys(draft.docs).length;
    const ok = Object.values(draft.docs).filter(Boolean).length;
    return Math.round((ok / total) * 100);
  }, [draft.docs]);

  const createSubmission = () => {
    if (!draft.itemName.trim()) {
      pushToast({ title: "Item name required", message: "Add an item name to continue.", tone: "warning" });
      return;
    }

    const id = `SUB-${Math.floor(23000 + Math.random() * 700)}`;
    const now = new Date().toISOString();

    const newS: Submission = {
      id,
      desk: draft.desk,
      subdesk: draft.desk === "healthmart" ? draft.subdesk : undefined,
      type: draft.type,
      itemName: draft.itemName,
      status: "Submitted",
      risk: computedDraftRisk.score,
      docsCompletePct: computedDraftDocsPct,
      dueAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now,
      notesCount: 0,
      evidenceReady: computedDraftDocsPct >= 80,
      signals:
        draft.desk === "healthmart"
          ? ["Regulated", draft.subdesk]
          : draft.desk === "edumart"
          ? ["Child-safe", "Age gating"]
          : ["Community guidelines"],
    };

    // Local add (demo)
    data.submissions.unshift(newS);

    setNewOpen(false);
    setDetailId(newS.id);
    setDetailOpen(true);
    pushToast({ title: "Submission created", message: `${id} submitted for review.`, tone: "success" });
  };

  const openUploadDocs = (submissionId: string) => {
    setUploadTargetId(submissionId);
    uploadInputRef.current?.click();
  };

  const handleUploadDocs = (files: FileList | null) => {
    if (!files?.length || !uploadTargetId) return;

    const now = new Date().toISOString();
    const added = Array.from(files).map((file) => ({
      id: makeId("doc"),
      name: file.name,
      uploadedAt: now,
      sizeLabel: file.size >= 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`,
    }));

    setData((prev) => ({
      ...prev,
      submissions: prev.submissions.map((submission) => {
        if (submission.id !== uploadTargetId) return submission;

        const docsCompletePct = clamp(
          Math.max(submission.docsCompletePct, Math.min(100, submission.docsCompletePct + added.length * 20)),
          0,
          100
        );
        const signals = submission.signals.includes("Docs uploaded")
          ? submission.signals
          : [...submission.signals, "Docs uploaded"];

        return {
          ...submission,
          uploadedDocs: [...added, ...(submission.uploadedDocs || [])],
          docsCompletePct,
          evidenceReady: docsCompletePct >= 80,
          updatedAt: now,
          notesCount: submission.notesCount + added.length,
          signals,
        };
      }),
    }));

    pushToast({
      title: "Upload complete",
      message: `${added.length} file${added.length === 1 ? "" : "s"} added to ${uploadTargetId}.`,
      tone: "success",
    });
    setUploadTargetId(null);
  };

  const addNoteToSubmission = (submissionId: string) => {
    if (typeof window === "undefined") return;
    const body = window.prompt("Add note");
    if (!body || !body.trim()) return;

    const now = new Date().toISOString();
    const note: SubmissionNote = {
      id: makeId("note"),
      body: body.trim(),
      createdAt: now,
    };

    setData((prev) => ({
      ...prev,
      submissions: prev.submissions.map((submission) =>
        submission.id === submissionId
          ? {
              ...submission,
              notes: [note, ...(submission.notes || [])],
              notesCount: submission.notesCount + 1,
              updatedAt: now,
            }
          : submission
      ),
    }));

    pushToast({ title: "Note added", message: "Submission note saved.", tone: "success" });
  };

  const generateEvidence = (rows: Submission[]) => {
    const bundle = {
      bundleId: `EVB-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`,
      createdAt: new Date().toISOString(),
      count: rows.length,
      items: rows.map((r) => ({ id: r.id, desk: r.desk, subdesk: r.subdesk || null, status: r.status, risk: r.risk })),
      note: "Demo evidence bundle. In production: PDFs, signatures, hashes, chain of custody.",
    };
    safeCopy(JSON.stringify(bundle, null, 2));
    pushToast({ title: "Evidence bundle ready", message: "Copied as JSON (demo).", tone: "success" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleUploadDocs(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Regulatory Desks</div>
                <Badge tone="slate">/regulatory</Badge>
                <Badge tone="slate">Seller-facing</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Manage regulated submissions and compliance evidence across desks.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!selectedIds.length) {
                    pushToast({ title: "Select submissions", message: "Choose one or more submissions first.", tone: "warning" });
                    return;
                  }
                  generateEvidence(selectedRows);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
              >
                <BadgeCheck className="h-4 w-4" />
                Evidence pack
              </button>

              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New submission
              </button>

              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest policy and queue loaded (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Sparkles className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard icon={ClipboardList} label="Active" value={kpis.active} tone="slate" />
          <KpiCard icon={AlertTriangle} label="Action needed" value={kpis.actionNeeded} tone="danger" />
          <KpiCard icon={ShieldCheck} label="Approved" value={kpis.approved} tone="green" />
          <KpiCard icon={Info} label="Avg risk" value={`${kpis.avgRisk}/100`} tone={riskTone(kpis.avgRisk)} />
        </div>

        {/* Desk cards */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {deskCards.map((c) => {
            const meta = deskMeta(c.d);
            const Icon = meta.icon;
            return (
              <button
                key={c.d}
                type="button"
                onClick={() => {
                  setDesk(c.d);
                  setStatus("All");
                  setSubdesk("All");
                  pushToast({ title: meta.title, message: "Filter applied.", tone: "default" });
                }}
                className={cx(
                  "rounded-3xl border bg-white dark:bg-slate-900/70 p-5 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                  desk === c.d ? "border-emerald-200" : "border-slate-200/70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cx(
                      "grid h-12 w-12 place-items-center rounded-3xl bg-white dark:bg-slate-900",
                      meta.accent === "orange" ? "text-orange-700" : "text-emerald-700"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-black text-slate-900">{meta.title}</div>
                      <span className="ml-auto"><Badge tone="slate">{c.total}</Badge></span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{meta.subtitle}</div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <MiniMetric label="Pending" value={c.pending} tone="orange" />
                      <MiniMetric label="Action" value={c.action} tone="danger" />
                      <MiniMetric label="Approved" value={c.approved} tone="green" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge tone={riskTone(c.avg)}>{riskLabel(c.avg)} risk</Badge>
                      <span className="text-[11px] font-semibold text-slate-500">Avg {c.avg}/100</span>
                      <span className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-800">
                        Open
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main layout */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Left: Submissions */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">My submissions</div>
                  <Badge tone="slate">{filtered.length}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search submissions"
                      className="h-10 w-[min(520px,82vw)] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setDesk("all");
                      setStatus("All");
                      setSubdesk("All");
                      setSelected({});
                      pushToast({ title: "Cleared", message: "Filters and selection cleared.", tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[{ k: "all", label: "All desks" }, ...desks.map((d) => ({ k: d, label: deskMeta(d).title }))].map((d) => (
                  <Chip
                    key={d.k}
                    active={desk === d.k}
                    onClick={() => setDesk(d.k as DeskKey | "all")}
                    tone={d.k === "healthmart" ? "orange" : "green"}
                  >
                    {d.label}
                  </Chip>
                ))}
                <span className="ml-auto"><Badge tone="slate">Bulk</Badge></span>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-12">
                <div className="md:col-span-6">
                  <div className="flex flex-wrap gap-2">
                    {["All", "Draft", "Submitted", "Under review", "Needs changes", "Approved", "Rejected", "Expired"].map((s) => (
                      <Chip key={s} active={status === s} onClick={() => setStatus(s as SubmissionStatus | "All")} tone={s === "Needs changes" ? "orange" : "green"}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-6 flex items-center justify-end gap-2">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <div className="text-xs font-extrabold text-slate-700">Health subdesk</div>
                    <div className="relative ml-auto">
                      <select
                        value={subdesk}
                        onChange={(e) => setSubdesk(e.target.value)}
                        className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                      >
                        {subdeskOptions.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleAll}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold",
                      allVisibleSelected ? "border-emerald-200 text-emerald-800" : "border-slate-200/70 text-slate-800"
                    )}
                  >
                    <Check className="h-4 w-4" />
                    {allVisibleSelected ? "Unselect" : "Select"}
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk bar */}
            <AnimatePresence initial={false}>
              {selectedIds.length ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.16 }}
                  className="border-b border-slate-200/70 bg-emerald-50/60 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="green">{selectedIds.length} selected</Badge>
                    <button
                      type="button"
                      onClick={() => generateEvidence(selectedRows)}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <BadgeCheck className="h-4 w-4" />
                      Evidence pack
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(JSON.stringify(selectedRows, null, 2));
                        pushToast({ title: "Copied", message: "Selection JSON copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected({});
                        pushToast({ title: "Selection cleared", tone: "default" });
                      }}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Table */}
            <div className="overflow-x-auto">
              <div className="min-w-[1120px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-1">Sel</div>
                  <div className="col-span-3">Submission</div>
                  <div className="col-span-2">Desk</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Risk</div>
                  <div className="col-span-1">Due</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((s) => {
                    const checked = !!selected[s.id];
                    const meta = deskMeta(s.desk);
                    const riskT = riskTone(s.risk);
                    const statusT = statusTone(s.status);
                    const needs = s.status === "Needs changes";
                    const dueSoon = new Date(s.dueAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => openDetail(s.id)}
                        className={cx(
                          "grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-700 transition hover:bg-gray-50 dark:hover:bg-slate-800",
                          needs && "bg-rose-50/30"
                        )}
                      >
                        <div className="col-span-1 flex items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected((m) => ({ ...m, [s.id]: !checked }));
                            }}
                            className={cx(
                              "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                              checked ? "border-emerald-200" : "border-slate-200/70"
                            )}
                            aria-label={checked ? "Unselect" : "Select"}
                          >
                            {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                          </button>
                        </div>

                        <div className="col-span-3 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{s.itemName}</div>
                            <Badge tone="slate">{s.id}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <Badge tone="slate">{s.type}</Badge>
                            {s.subdesk ? <Badge tone="slate">{s.subdesk}</Badge> : null}
                            <span className="ml-auto">Updated {fmtTime(s.updatedAt)}</span>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone={meta.accent === "orange" ? "orange" : "slate"}>{meta.title.replace(" Desk", "")}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone={statusT}>{s.status}</Badge>
                          {needs ? <Badge tone="danger">Fix required</Badge> : null}
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone={riskT}>{riskLabel(s.risk)}</Badge>
                          <span className="text-[11px] font-semibold text-slate-600">{s.risk}/100</span>
                        </div>

                        <div className="col-span-1 flex items-center">
                          <Badge tone={dueSoon ? "orange" : "slate"}>{fmtDate(s.dueAt)}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              safeCopy(s.id);
                              pushToast({ title: "Copied", message: "Submission ID copied.", tone: "success" });
                            }}
                            className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                            aria-label="Copy"
                            title="Copy"
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!s.evidenceReady) {
                                pushToast({ title: "Evidence not ready", message: "Complete documents first.", tone: "warning" });
                                return;
                              }
                              generateEvidence([s]);
                            }}
                            className={cx(
                              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-extrabold",
                              s.evidenceReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-400"
                            )}
                            aria-label="Evidence"
                            title="Evidence"
                          >
                            <BadgeCheck className="h-4 w-4" />
                            Evidence
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(s.id);
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                            aria-label="Open"
                            title="Open"
                          >
                            <ChevronRight className="h-4 w-4" />
                            Open
                          </button>
                        </div>
                      </button>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        title="No submissions"
                        message="Try clearing filters or create a new submission."
                        cta={{ label: "New submission", onClick: () => setNewOpen(true) }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Right: Tasks + Policy updates */}
          <div className="lg:col-span-4 space-y-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Quick tasks</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">What you should do next.</div>
                </div>
                <Badge tone="orange">Premium</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {data.tasks.map((t) => {
                  const meta = deskMeta(t.desk);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setDesk(t.desk);
                        pushToast({ title: "Task opened", message: t.title, tone: "default" });
                      }}
                      className={cx(
                        "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                        t.tone === "danger" ? "border-rose-200" : t.tone === "orange" ? "border-orange-200" : "border-slate-200/70"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cx("grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900", t.tone === "danger" ? "text-rose-700" : t.tone === "orange" ? "text-orange-700" : "text-slate-700")}>
                          <CalendarClock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{t.title}</div>
                            <span className="ml-auto"><Badge tone={t.tone === "danger" ? "danger" : t.tone === "orange" ? "orange" : "slate"}>{fmtDate(t.dueAt)}</Badge></span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{meta.title}</div>
                          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-800">
                            {t.cta}
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => pushToast({ title: "Compliance center", message: "Wire to /ops/compliance", tone: "default" })}
              className="mt-4 w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Open Compliance Center
              </button>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Policy updates</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">What changed and why it matters.</div>
                </div>
                <Badge tone="slate">Updates</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {data.policies.map((p) => {
                  const tone = p.desk === "healthmart" ? "orange" : p.desk === "all" ? "slate" : "green";
                  return (
                    <div key={p.id} className={cx("rounded-3xl border bg-white dark:bg-slate-900/70 p-4", p.desk === "healthmart" ? "border-orange-200" : "border-slate-200/70")}>
                      <div className="flex items-center gap-2">
                        <Badge tone={tone}>{p.desk === "all" ? "All desks" : deskMeta(p.desk).title.replace(" Desk", "")}</Badge>
                        <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(p.at)}</span>
                      </div>
                      <div className="mt-2 text-sm font-black text-slate-900">{p.title}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-600">{p.summary}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => pushToast({ title: "Saved", message: "Policy saved to bookmarks (demo).", tone: "success" })}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-800"
                        >
                          <CheckCheck className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => pushToast({ title: "Read", message: "Open policy article (demo).", tone: "default" })}
                          className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-[11px] font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          Read
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Submission details drawer */}
      <Drawer
        open={detailOpen}
        title={active ? `${active.itemName}` : "Submission"}
        subtitle={active ? `${active.id} · ${deskMeta(active.desk).title}${active.subdesk ? ` · ${active.subdesk}` : ""}` : ""}
        onClose={() => setDetailOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a submission.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className={cx("grid h-12 w-12 place-items-center rounded-3xl bg-white dark:bg-slate-900", riskTone(active.risk) === "danger" ? "text-rose-700" : riskTone(active.risk) === "orange" ? "text-orange-700" : "text-emerald-700")}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">Submission status</div>
                    <Badge tone={statusTone(active.status)}>{active.status}</Badge>
                    <Badge tone={riskTone(active.risk)}>{riskLabel(active.risk)} risk</Badge>
                    <span className="ml-auto"><Badge tone="slate">Due {fmtDate(active.dueAt)}</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Updated {fmtTime(active.updatedAt)} · Notes {active.notesCount}</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {active.signals.map((s) => (
                      <Badge key={s} tone="slate">{s}</Badge>
                    ))}
                    {active.evidenceReady ? <Badge tone="green">Evidence ready</Badge> : <Badge tone="orange">Evidence incomplete</Badge>}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="text-sm font-black text-slate-900">Doc completeness</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Improve this to reduce risk and speed approvals.</div>
                  <ProgressBar pct={active.docsCompletePct} tone={active.docsCompletePct >= 80 ? "green" : active.docsCompletePct >= 60 ? "orange" : "danger"} />
                  <div className="mt-2 text-xs font-semibold text-slate-700">{active.docsCompletePct}% complete</div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="text-sm font-black text-slate-900">Explainable risk score</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Why this submission is risky.</div>
                  <div className="mt-3 space-y-2">
                    {[
                      { k: "Desk baseline", v: active.desk === "healthmart" ? 45 : active.desk === "edumart" ? 30 : 24 },
                      { k: "Docs penalty", v: Math.round((1 - active.docsCompletePct / 100) * 45) },
                      { k: "Type adjustment", v: active.type === "Product" ? 10 : active.type === "Service" ? 6 : 12 },
                    ].map((x) => (
                      <MiniRow key={x.k} label={x.k} value={`${x.v}`} tone={x.v >= 30 ? "orange" : "slate"} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openUploadDocs(active.id);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Upload className="h-4 w-4" />
                  Upload docs
                </button>

                <button
                  type="button"
                  onClick={() => {
                    generateEvidence([active]);
                  }}
                  disabled={!active.evidenceReady}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold",
                    active.evidenceReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <BadgeCheck className="h-4 w-4" />
                  Evidence pack
                </button>

                <button
                  type="button"
                  onClick={() => {
                    safeCopy(active.id);
                    pushToast({ title: "Copied", message: "Submission ID copied.", tone: "success" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy ID
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Uploaded docs</div>
                <span className="ml-auto">
                  <Badge tone="slate">{active.uploadedDocs?.length || 0}</Badge>
                </span>
              </div>

              {active.uploadedDocs?.length ? (
                <div className="mt-3 space-y-2">
                  {active.uploadedDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-900">{doc.name}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          Uploaded {fmtTime(doc.uploadedAt)} · {doc.sizeLabel}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-3xl border border-dashed border-slate-200/70 bg-slate-50/70 p-4 text-xs font-semibold text-slate-500">
                  No documents uploaded yet. Use the `Upload docs` button above.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Seller-facing compliance</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">
                    This desk helps you meet regulation requirements before items are sold or content is consumed.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Timeline (demo)</div>
                <span className="ml-auto"><Badge tone="slate">Events</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { at: active.updatedAt, t: "Updated submission details" },
                  { at: new Date(new Date(active.updatedAt).getTime() - 6 * 60_000).toISOString(), t: "Desk review started" },
                  { at: new Date(new Date(active.updatedAt).getTime() - 28 * 60_000).toISOString(), t: "Submitted by you" },
                ].map((e, idx) => (
                  <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{fmtTime(e.at)}</Badge>
                      <div className="text-xs font-semibold text-slate-700">{e.t}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addNoteToSubmission(active.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Add note
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/settings/audit")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                >
                  <ClipboardList className="h-4 w-4" />
                  Log to audit
                </button>
              </div>

              {active.notes?.length ? (
                <div className="mt-3 space-y-2">
                  {active.notes.map((note) => (
                    <div key={note.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="flex items-center gap-2">
                        <Badge tone="slate">{fmtTime(note.createdAt)}</Badge>
                        <div className="text-xs font-semibold text-slate-700">{note.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Drawer>

      {/* New submission wizard drawer */}
      <Drawer
        open={newOpen}
        title="New submission"
        subtitle="Create a seller-facing regulatory intake"
        onClose={() => setNewOpen(false)}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4].map((n) => (
              <Chip key={n} active={wizardStep === n} onClick={() => setWizardStep(n)} tone={n === 4 ? "orange" : "green"}>
                Step {n}
              </Chip>
            ))}
            <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
          </div>

          {wizardStep === 1 ? (
            <GlassCard className="p-4">
              <div className="text-sm font-black text-slate-900">Desk</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Choose where this submission belongs.</div>

              <div className="mt-3 grid gap-2">
                {desks.map((d) => {
                  const meta = deskMeta(d);
                  const Icon = meta.icon;
                  const active = draft.desk === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDraft((s) => ({ ...s, desk: d }))}
                      className={cx(
                        "flex items-start gap-3 rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                        active ? "border-emerald-200" : "border-slate-200/70"
                      )}
                    >
                      <div className={cx("grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900", meta.accent === "orange" ? "text-orange-700" : "text-emerald-700")}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-black text-slate-900">{meta.title}</div>
                          <span className="ml-auto"><Badge tone={meta.accent === "orange" ? "orange" : "green"}>{meta.subtitle}</Badge></span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Seller-facing intake and policy checks.</div>
                        {d === "healthmart" ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {["Logistics", "Pharmacy", "Equipment"].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDraft((x) => ({ ...x, subdesk: s }));
                                }}
                                className={cx(
                                  "rounded-2xl border px-3 py-1.5 text-[11px] font-extrabold",
                                  draft.subdesk === s ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                                )}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          ) : null}

          {wizardStep === 2 ? (
            <GlassCard className="p-4">
              <div className="text-sm font-black text-slate-900">Item details</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Describe what you sell or provide.</div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Type</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Product", "Service", "Content"].map((t) => (
                      <Chip key={t} active={draft.type === t} onClick={() => setDraft((s) => ({ ...s, type: t as SubmissionType }))} tone={t === "Content" ? "orange" : "green"}>
                        {t}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Linked listing (optional)</div>
                  <input
                    value={draft.listingRef}
                    onChange={(e) => setDraft((s) => ({ ...s, listingRef: e.target.value }))}
                    placeholder="e.g., /listings/L-1002"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="text-[11px] font-extrabold text-slate-600">Item name</div>
                  <input
                    value={draft.itemName}
                    onChange={(e) => setDraft((s) => ({ ...s, itemName: e.target.value }))}
                    placeholder="Example: Medical gloves (bulk)"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Tip</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Add a listing reference so the desk can review media and pricing context.</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ) : null}

          {wizardStep === 3 ? (
            <GlassCard className="p-4">
              <div className="text-sm font-black text-slate-900">Documents and policy</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Tick what you have ready (demo). Upload flows wire later.</div>

              <div className="mt-4 grid gap-2">
                {[
                  { k: "license", t: "Business or category license" },
                  { k: "certificate", t: "Certificate / test report" },
                  { k: "labeling", t: "Labeling / packaging photos" },
                  { k: "ageRating", t: "Age rating and outline (EduMart / Content)" },
                  { k: "policyAck", t: "Policy acknowledgement" },
                ].map((x) => (
                  <div key={x.k} className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div>
                      <div className="text-sm font-black text-slate-900">{x.t}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Required depending on desk.</div>
                    </div>
                    <Switch
                      checked={!!draft.docs[x.k]}
                      onChange={(v) => setDraft((s) => ({ ...s, docs: { ...s.docs, [x.k]: v } }))}
                      label={x.t}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="text-sm font-black text-slate-900">Doc completeness</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Higher completeness reduces risk.</div>
                  <ProgressBar pct={computedDraftDocsPct} tone={computedDraftDocsPct >= 80 ? "green" : computedDraftDocsPct >= 60 ? "orange" : "danger"} />
                  <div className="mt-2 text-xs font-semibold text-slate-700">{computedDraftDocsPct}%</div>
                </div>
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="text-sm font-black text-slate-900">Risk score preview</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Explainable scoring.</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone={riskTone(computedDraftRisk.score)}>{riskLabel(computedDraftRisk.score)}</Badge>
                    <div className="text-sm font-black text-slate-900">{computedDraftRisk.score}/100</div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {computedDraftRisk.breakdown.map((b) => (
                      <MiniRow key={b.k} label={b.k} value={`${b.v}`} tone={b.v >= 30 ? "orange" : "slate"} />
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          ) : null}

          {wizardStep === 4 ? (
            <GlassCard className="p-4">
              <div className="text-sm font-black text-slate-900">Review and submit</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Confirm details before submitting.</div>

              <div className="mt-4 grid gap-2">
                <MiniRow label="Desk" value={deskMeta(draft.desk).title} tone={draft.desk === "healthmart" ? "orange" : "green"} />
                {draft.desk === "healthmart" ? <MiniRow label="Subdesk" value={draft.subdesk} tone="slate" /> : null}
                <MiniRow label="Type" value={draft.type} tone="slate" />
                <MiniRow label="Item" value={draft.itemName || "(not set)"} tone={draft.itemName ? "slate" : "danger"} />
                <MiniRow label="Docs" value={`${computedDraftDocsPct}% complete`} tone={computedDraftDocsPct >= 80 ? "green" : "orange"} />
                <MiniRow label="Risk" value={`${computedDraftRisk.score}/100 (${riskLabel(computedDraftRisk.score)})`} tone={riskTone(computedDraftRisk.score)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={createSubmission}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(JSON.stringify({ draft, computedDraftRisk, computedDraftDocsPct }, null, 2));
                    pushToast({ title: "Copied", message: "Draft JSON copied.", tone: "success" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy draft
                </button>
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">What happens next</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">You may be asked for changes. Evidence packs can be generated after docs are complete.</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ) : null}

          <div className="sticky bottom-0 -mx-4 border-t border-slate-200/70 bg-white dark:bg-slate-900/92 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                disabled={wizardStep === 1}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold",
                  wizardStep === 1 ? "cursor-not-allowed border-slate-100 bg-white dark:bg-slate-900 text-slate-400" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                )}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setWizardStep((s) => Math.min(4, s + 1))}
                disabled={wizardStep === 4}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                  wizardStep === 4 && "cursor-not-allowed opacity-60"
                )}
                style={{ background: TOKENS.orange }}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone = "slate" }) {
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
        <div>
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-[10px] font-extrabold text-slate-600">{label}</div>
      <div className={cx("mt-1 text-sm font-black", tone === "green" ? "text-emerald-700" : tone === "danger" ? "text-rose-700" : "text-orange-700")}>{value}</div>
    </div>
  );
}

function EmptyState({ title, message, cta }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
          {cta ? (
            <button
              type="button"
              onClick={cta.onClick}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              {cta.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
