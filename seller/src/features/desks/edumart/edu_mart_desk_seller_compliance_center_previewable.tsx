import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../../lib/backendApi";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Filter,
  GraduationCap,
  Info,
  Loader2,
  Lock,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Clock,
} from "lucide-react";

/**
 * EduMart Desk (Seller-facing)
 * Route suggestion: /regulatory/edumart
 * Purpose:
 * - Help Sellers and Providers submit education products, digital content, and services for review.
 * - Focus on child safety: age suitability, content rules, privacy, safeguarding, and advertising.
 *
 * Notes:
 * - This is NOT an admin approval UI. The seller can submit, upload evidence, respond to desk notes, and resubmit.
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
type BadgeTone = "green" | "orange" | "danger" | "slate";

type ComplianceState = "ok" | "warn" | "issue";
type ListingStatus = "Draft" | "In Review" | "Approved" | "Rejected";
type ListingKind = "Physical Product" | "Digital Content" | "Service";
type ListingRisk = "Low" | "Medium" | "High";

type ListingMedia = { images?: number };
type ListingDocs = {
  safetyCert?: boolean;
  policyAcknowledged?: boolean;
  copyrightProof?: boolean;
  providerKyc?: boolean;
  tutorCredentials?: boolean;
};
type ListingSafety = { ageLabel?: boolean; noAdultContent?: boolean; parentControls?: boolean };
type ListingPrivacy = { basic?: boolean };
type ListingSafeguarding = { basic?: boolean };
type DeskNote = { id: string; at: string; from: string; text: string };
type TimelineEvent = { id: string; at: string; label: string };
type ComplianceInfo = { state: ComplianceState; issues: string[]; lastScanAt: string | null };

type EduListing = {
  id: string;
  title: string;
  kind: ListingKind;
  category: string;
  ageBand: string;
  risk: ListingRisk;
  status: ListingStatus;
  updatedAt: string;
  media?: ListingMedia;
  docs?: ListingDocs;
  safety?: ListingSafety;
  privacy?: ListingPrivacy;
  safeguarding?: ListingSafeguarding;
  deskNotes?: DeskNote[];
  timeline?: TimelineEvent[];
  compliance?: ComplianceInfo;
  readiness?: number;
};

type ScanState = { running: boolean; last: string | null; flags: string[] };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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

function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  tone = "default",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  tone?: "default" | "edumart";
}) {
  const headerText = tone === "edumart" ? "text-white" : "text-slate-900";

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
              <div
                className={cx(
                  "border-b border-slate-200/70 px-4 py-3",
                  tone === "edumart" ? "bg-slate-900" : "bg-white/85 dark:bg-slate-900/90"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className={cx("text-sm font-black", headerText)}>{title}</div>
                    {subtitle ? (
                      <div className={cx("mt-1 text-xs font-semibold", tone === "edumart" ? "text-white/70" : "text-slate-500")}>{subtitle}</div>
                    ) : null}
                  </div>
                  <IconButton label="Close" onClick={onClose} tone={tone === "edumart" ? "dark" : "light"}>
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

function EmptyState({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta?: { label: string; onClick: () => void };
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

function complianceTone(state: ComplianceState | null | undefined): BadgeTone {
  if (state === "ok") return "green";
  if (state === "warn") return "orange";
  if (state === "issue") return "danger";
  return "slate";
}

function scoreForListing(l: EduListing) {
  // simple readiness score 0-100
  const issues = l.compliance?.issues || [];
  const base = 94;
  const penalty = Math.min(60, issues.length * 14);
  const ageOk = l.safety?.ageLabel ? 6 : 0;
  const privacyOk = l.privacy?.basic ? 6 : 0;
  const safeguardingOk = l.safeguarding?.basic ? 6 : 0;
  return clamp(base - penalty + ageOk + privacyOk + safeguardingOk, 18, 99);
}

function recomputeCompliance(l: EduListing): EduListing {
  const issues: string[] = [];

  // Cross-cutting
  if (!l.safety?.ageLabel) issues.push("Missing age suitability label");
  if (!l.docs?.policyAcknowledged) issues.push("Policy acknowledgement not confirmed");

  // Kind-based
  if (l.kind === "Physical Product") {
    if (!l.docs?.safetyCert) issues.push("Safety certificate not uploaded");
    if ((l.media?.images || 0) < 5) issues.push("Add at least 5 product images (clear packaging and warnings)");
  }

  if (l.kind === "Digital Content") {
    if (!l.docs?.copyrightProof) issues.push("Copyright or licensing proof missing");
    if (!l.privacy?.basic) issues.push("Privacy summary missing (child privacy)");
    if (!l.safety?.noAdultContent) issues.push("Content checklist not completed");
    if (!l.safety?.parentControls) issues.push("Parental controls not declared");
  }

  if (l.kind === "Service") {
    if (!l.docs?.providerKyc) issues.push("Provider KYC not completed");
    if (!l.docs?.tutorCredentials) issues.push("Tutor credentials not uploaded");
    if (!l.safeguarding?.basic) issues.push("Safeguarding policy not declared");
  }

  const state = issues.length === 0 ? "ok" : issues.length <= 2 ? "warn" : "issue";

  return {
    ...l,
    compliance: {
      state,
      issues,
      lastScanAt: l.compliance?.lastScanAt || null,
    },
    readiness: scoreForListing({ ...l, compliance: { state, issues, lastScanAt: l.compliance?.lastScanAt || null } }),
  };
}

function buildEduListings(): EduListing[] {
  const base = Date.now();
  const ago = (m: number) => new Date(base - m * 60_000).toISOString();

  const rows: EduListing[] = [
    {
      id: "EDU-2101",
      title: "Early Learning Flash Cards (Ages 3-5)",
      kind: "Physical Product",
      category: "Books & Learning Aids",
      ageBand: "3-5",
      risk: "Medium",
      status: "Draft",
      updatedAt: ago(44),
      media: { images: 3 },
      docs: { safetyCert: false, policyAcknowledged: false },
      safety: { ageLabel: true, noAdultContent: true, parentControls: true },
      privacy: { basic: true },
      safeguarding: { basic: true },
      deskNotes: [
        { id: "n1", at: ago(120), from: "EduMart Desk", text: "Add packaging warning photos and upload safety certificate before submission." },
      ],
      timeline: [
        { id: "t1", at: ago(44), label: "Draft updated" },
      ],
    },
    {
      id: "EDU-2102",
      title: "Kids Math App (Offline Practice)",
      kind: "Digital Content",
      category: "Apps & Digital Learning",
      ageBand: "6-9",
      risk: "High",
      status: "In Review",
      updatedAt: ago(18),
      media: { images: 7 },
      docs: { copyrightProof: true, policyAcknowledged: true },
      safety: { ageLabel: true, noAdultContent: true, parentControls: false },
      privacy: { basic: false },
      safeguarding: { basic: true },
      deskNotes: [
        { id: "n1", at: ago(35), from: "EduMart Desk", text: "Please add a simple privacy summary for parents and declare parental controls." },
      ],
      timeline: [
        { id: "t1", at: ago(90), label: "Submitted" },
        { id: "t2", at: ago(30), label: "Desk review started" },
      ],
    },
    {
      id: "EDU-2103",
      title: "STEM Building Blocks Set", 
      kind: "Physical Product",
      category: "Educational Toys",
      ageBand: "6-12",
      risk: "Low",
      status: "Approved",
      updatedAt: ago(260),
      media: { images: 9 },
      docs: { safetyCert: true, policyAcknowledged: true },
      safety: { ageLabel: true, noAdultContent: true, parentControls: true },
      privacy: { basic: true },
      safeguarding: { basic: true },
      deskNotes: [
        { id: "n1", at: ago(520), from: "EduMart Desk", text: "Approved. Keep safety certificate current and maintain age labeling." },
      ],
      timeline: [
        { id: "t1", at: ago(900), label: "Submitted" },
        { id: "t2", at: ago(610), label: "In review" },
        { id: "t3", at: ago(290), label: "Approved" },
      ],
    },
    {
      id: "EDU-2104",
      title: "Online Tutor: Primary English (1:1)",
      kind: "Service",
      category: "Tutoring & Coaching",
      ageBand: "6-12",
      risk: "High",
      status: "Rejected",
      updatedAt: ago(980),
      media: { images: 4 },
      docs: { providerKyc: true, tutorCredentials: false, policyAcknowledged: true },
      safety: { ageLabel: true, noAdultContent: true, parentControls: true },
      privacy: { basic: true },
      safeguarding: { basic: false },
      deskNotes: [
        { id: "n1", at: ago(980), from: "EduMart Desk", text: "Rejected: missing tutor credentials and safeguarding policy statement." },
      ],
      timeline: [
        { id: "t1", at: ago(1400), label: "Submitted" },
        { id: "t2", at: ago(1100), label: "Desk review" },
        { id: "t3", at: ago(980), label: "Rejected" },
      ],
    },
    {
      id: "EDU-2105",
      title: "Interactive Science Worksheets (Printable PDF)",
      kind: "Digital Content",
      category: "Books & Learning Aids",
      ageBand: "10-14",
      risk: "Medium",
      status: "Draft",
      updatedAt: ago(210),
      media: { images: 5 },
      docs: { copyrightProof: false, policyAcknowledged: true },
      safety: { ageLabel: false, noAdultContent: true, parentControls: true },
      privacy: { basic: true },
      safeguarding: { basic: true },
      deskNotes: [],
      timeline: [{ id: "t1", at: ago(210), label: "Draft created" }],
    },
  ];

  return rows.map((l) => recomputeCompliance(l));
}

function ScorePill({ score }: { score: number }) {
  const s = clamp(Number(score || 0), 0, 100);
  const tone = s >= 85 ? "green" : s >= 65 ? "orange" : "danger";
  return <Badge tone={tone}>{s}</Badge>;
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone?: BadgeTone }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className={cx(
            "h-2 rounded-full",
            tone === "green" ? "bg-emerald-500" : tone === "orange" ? "bg-orange-500" : "bg-rose-500"
          )}
          style={{ width: `${clamp(value, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function Stepper({ current = 1 }: { current?: number }) {
  const steps = [
    { k: 1, label: "Prepare" },
    { k: 2, label: "Preflight scan" },
    { k: 3, label: "Submit" },
    { k: 4, label: "Desk review" },
    { k: 5, label: "Decision" },
  ];

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-slate-700" />
        <div className="text-sm font-black text-slate-900">Submission path</div>
        <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-5">
        {steps.map((s) => {
          const done = s.k < current;
          const active = s.k === current;
          return (
            <div key={s.k} className={cx("rounded-2xl border p-3", active ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900")}
            >
              <div className="flex items-center gap-2">
                <div className={cx("grid h-8 w-8 place-items-center rounded-2xl border", done ? "border-emerald-200 bg-white dark:bg-slate-900" : active ? "border-emerald-200 bg-white dark:bg-slate-900" : "border-slate-200/70 bg-white dark:bg-slate-900")}
                >
                  {done ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="text-xs font-black text-slate-700">{s.k}</span>}
                </div>
                <div className="text-xs font-extrabold text-slate-800">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs font-semibold text-slate-500">
        Tip: complete the child-safety checklist and upload evidence before you submit.
      </div>
    </div>
  );
}

function EduListingDrawer({
  open,
  listing,
  onClose,
  onSave,
  pushToast,
}: {
  open: boolean;
  listing: EduListing | null;
  onClose: () => void;
  onSave: (listing: EduListing) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
}) {
  const [tab, setTab] = useState("Checklist");
  const [draft, setDraft] = useState<EduListing | null>(null);
  const [scan, setScan] = useState<ScanState>({ running: false, last: null, flags: [] });
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab("Checklist");
    setScan({ running: false, last: null, flags: [] });
    setMessage("");
    setDraft(listing ? JSON.parse(JSON.stringify(listing)) : null);
  }, [open, listing?.id]);

  if (!draft) {
    return (
      <Drawer open={open} title="EduMart Desk" subtitle="Select a submission" onClose={onClose} tone="edumart">
        <EmptyState title="No listing selected" message="Choose a listing from the table to manage compliance." />
      </Drawer>
    );
  }

  const setField = (path: string, value: unknown) => {
    setDraft((s) => {
      if (!s) return s;
      const next = JSON.parse(JSON.stringify(s)) as EduListing;
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        (cur as Record<string, unknown>)[k] = (cur as Record<string, unknown>)[k] || {};
        cur = (cur as Record<string, unknown>)[k] as EduListing;
      }
      (cur as Record<string, unknown>)[parts[parts.length - 1]] = value;
      return recomputeCompliance(next);
    });
  };

  const step = useMemo(() => {
    if (draft.status === "Draft") return 1;
    if (draft.status === "In Review") return 4;
    if (draft.status === "Approved" || draft.status === "Rejected") return 5;
    return 3;
  }, [draft.status]);

  const canSubmit = (draft.compliance?.issues || []).length === 0;

  const runPreflight = async () => {
    if (!draft) return;
    setScan({ running: true, last: null, flags: [] });
    pushToast({ title: "Preflight started", message: "Scanning content and policy readiness (demo).", tone: "default" });
    await new Promise((r) => setTimeout(r, 850));

    const flags: string[] = [];
    if (draft.kind === "Digital Content" && !draft.privacy?.basic) flags.push("Missing privacy summary for parents");
    if (draft.kind === "Digital Content" && !draft.safety?.parentControls) flags.push("Parental controls not declared");
    if ((draft.media?.images || 0) < 5) flags.push("Insufficient media: add packaging and safety label images");

    setDraft((s) =>
      s
        ? {
            ...s,
            compliance: {
              ...(s.compliance ?? { state: "issue", issues: [], lastScanAt: null }),
              lastScanAt: new Date().toISOString(),
            },
          }
        : s
    );

    setScan({ running: false, last: new Date().toISOString(), flags });

    pushToast({
      title: flags.length ? "Preflight flags" : "Preflight clean",
      message: flags.length ? `Found ${flags.length} issue(s) to fix.` : "No issues detected in this demo scan.",
      tone: flags.length ? "warning" : "success",
    });
  };

  const submit = () => {
    if (!draft) return;
    if (!canSubmit) {
      pushToast({ title: "Cannot submit", message: "Resolve all issues first.", tone: "warning" });
      setTab("Checklist");
      return;
    }
    const next: EduListing = {
      ...draft,
      status: "In Review",
      updatedAt: new Date().toISOString(),
      timeline: [{ id: makeId("t"), at: new Date().toISOString(), label: "Submitted to EduMart Desk" }, ...(draft.timeline || [])],
    };
    onSave(next);
    pushToast({ title: "Submitted", message: "Your submission is now in review.", tone: "success" });
    onClose();
  };

  const appeal = () => {
    pushToast({
      title: "Appeal sent",
      message: "Your request for reconsideration has been sent (demo).",
      tone: "default",
    });
  };

  return (
    <Drawer
      open={open}
      title={`EduMart Desk · ${draft.id}`}
      subtitle="Manage evidence, child-safety checks, and desk communication."
      onClose={onClose}
      tone="edumart"
    >
      <div className="space-y-3">
        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-sm font-black text-slate-900">{draft.title}</div>
                <Badge tone={draft.status === "Approved" ? "green" : draft.status === "In Review" ? "orange" : draft.status === "Rejected" ? "danger" : "slate"}>{draft.status}</Badge>
                <Badge tone={complianceTone(draft.compliance?.state)}>{String(draft.compliance?.state || "-").toUpperCase()}</Badge>
                <span className="ml-auto"><ScorePill score={draft.readiness ?? 0} /></span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Kind: {draft.kind} · Category: {draft.category} · Age band: {draft.ageBand} · Updated {fmtTime(draft.updatedAt)}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSave({ ...draft, updatedAt: new Date().toISOString() });
                    pushToast({ title: "Saved", message: "Changes saved.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <CheckCheck className="h-4 w-4" />
                  Save changes
                </button>

                <button
                  type="button"
                  onClick={runPreflight}
                  disabled={scan.running}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition",
                    scan.running ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  <RefreshCw className="h-4 w-4" />
                  Preflight scan
                </button>

                <button
                  type="button"
                  onClick={submit}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white",
                    !canSubmit && "opacity-60"
                  )}
                  style={{ background: TOKENS.orange }}
                >
                  <Send className="h-4 w-4" />
                  Submit to desk
                </button>

                {draft.status === "Rejected" ? (
                  <button
                    type="button"
                    onClick={appeal}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Appeal
                  </button>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="slate">Readiness {draft.readiness}</Badge>
                <Badge tone={canSubmit ? "green" : "orange"}>{canSubmit ? "Ready to submit" : "Action needed"}</Badge>
                {draft.compliance?.lastScanAt ? (
                  <Badge tone="slate">Last scan {fmtTime(draft.compliance?.lastScanAt || "")}</Badge>
                ) : (
                  <Badge tone="slate">No scan yet</Badge>
                )}
                <span className="ml-auto"><Badge tone="slate">Child safety</Badge></span>
              </div>
            </div>
          </div>
        </div>

        <Stepper current={step} />

        <div className="flex flex-wrap items-center gap-2">
          {["Checklist", "Evidence", "Desk notes", "Timeline"].map((t) => (
            <SegTab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
        </div>

        <GlassCard className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.16 }}
            >
              {tab === "Checklist" ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Child-safety checklist</div>
                      <span className="ml-auto"><Badge tone={complianceTone(draft.compliance?.state)}>{String(draft.compliance?.state || "-").toUpperCase()}</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">
                      This checklist helps ensure education materials and services are safe and appropriate for children.
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <ChecklistToggle
                        title="Age suitability label"
                        desc="Declare the age band clearly on listing and packaging (if physical)."
                        checked={!!draft.safety?.ageLabel}
                        onChange={(v) => setField("safety.ageLabel", v)}
                      />
                      <ChecklistToggle
                        title="No adult content"
                        desc="Confirm content is free from adult themes and unsuitable material."
                        checked={!!draft.safety?.noAdultContent}
                        onChange={(v) => setField("safety.noAdultContent", v)}
                      />
                      <ChecklistToggle
                        title="Parental controls declared"
                        desc="For apps and digital content: confirm parental controls or parent guidance."
                        checked={!!draft.safety?.parentControls}
                        onChange={(v) => setField("safety.parentControls", v)}
                      />
                      <ChecklistToggle
                        title="Basic privacy summary"
                        desc="Explain what data is collected and how parents can manage it."
                        checked={!!draft.privacy?.basic}
                        onChange={(v) => setField("privacy.basic", v)}
                      />
                      <ChecklistToggle
                        title="Safeguarding policy"
                        desc="For services: confirm child safeguarding and session conduct rules."
                        checked={!!draft.safeguarding?.basic}
                        onChange={(v) => setField("safeguarding.basic", v)}
                      />
                      <ChecklistToggle
                        title="Policies acknowledged"
                        desc="Confirm you have read and will follow EduMart Desk policies."
                        checked={!!draft.docs?.policyAcknowledged}
                        onChange={(v) => setField("docs.policyAcknowledged", v)}
                      />
                    </div>

                    <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Info className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-orange-900">Before you submit</div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                            <li>Complete the checklist for your listing kind.</li>
                            <li>Upload evidence documents in the Evidence tab.</li>
                            <li>Run preflight scan to catch common issues.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      {(draft.compliance?.issues || []).length === 0 ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white dark:bg-slate-900 text-emerald-700">
                            <CheckCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-emerald-900">No issues found</div>
                            <div className="mt-1 text-[11px] font-semibold text-emerald-900/70">You can submit to the EduMart Desk.</div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(draft.compliance?.issues || []).map((iss) => (
                            <div key={iss} className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50/60 p-3">
                              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white dark:bg-slate-900 text-orange-700">
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-orange-900">{iss}</div>
                                <div className="mt-1 text-[11px] font-semibold text-orange-900/70">Fix this item before submission.</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "Evidence" ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Evidence documents</div>
                      <span className="ml-auto"><Badge tone="slate">Uploads</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">
                      Upload supporting documents based on your listing kind. This is required because education materials are consumed by children.
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <DocToggle
                        title="Safety certificate"
                        desc="For physical products: safety and materials compliance proof."
                        checked={!!draft.docs?.safetyCert}
                        onChange={(v) => setField("docs.safetyCert", v)}
                        recommended={draft.kind === "Physical Product"}
                      />
                      <DocToggle
                        title="Copyright or license proof"
                        desc="For digital content: proof you can distribute the material."
                        checked={!!draft.docs?.copyrightProof}
                        onChange={(v) => setField("docs.copyrightProof", v)}
                        recommended={draft.kind === "Digital Content"}
                      />
                      <DocToggle
                        title="Provider KYC"
                        desc="For services: provider identity verification."
                        checked={!!draft.docs?.providerKyc}
                        onChange={(v) => setField("docs.providerKyc", v)}
                        recommended={draft.kind === "Service"}
                      />
                      <DocToggle
                        title="Tutor credentials"
                        desc="For services: credentials or portfolio proof for the tutor or trainer."
                        checked={!!draft.docs?.tutorCredentials}
                        onChange={(v) => setField("docs.tutorCredentials", v)}
                        recommended={draft.kind === "Service"}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click?.()}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.orange }}
                      >
                        <Upload className="h-4 w-4" />
                        Upload file
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          pushToast({ title: "Uploaded", message: `${files.length} file(s) added (local demo).`, tone: "success" });
                          e.currentTarget.value = "";
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setField("media.images", Number(draft.media?.images || 0) + 1);
                          pushToast({ title: "Media updated", message: "Added one image slot (demo).", tone: "default" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Plus className="h-4 w-4" />
                        Add image
                      </button>

                      <span className="ml-auto"><Badge tone={(draft.media?.images || 0) >= 5 ? "green" : "orange"}>Images: {draft.media?.images || 0}</Badge></span>
                    </div>

                    <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Privacy note</div>
                        <span className="ml-auto"><Badge tone="slate">Important</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">
                        Avoid collecting unnecessary personal data from children. If your content is digital, include a parent-friendly privacy summary.
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "Desk notes" ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Desk communication</div>
                      <span className="ml-auto"><Badge tone="slate">Thread</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">
                      Use this to respond to requests from the EduMart Desk and keep a clear record of compliance discussions.
                    </div>

                    <div className="mt-4 space-y-2">
                      {(draft.deskNotes || []).length === 0 ? (
                        <EmptyState title="No notes yet" message="Once you submit, the desk may request clarifications." />
                      ) : (
                        (draft.deskNotes || []).map((n) => (
                          <div key={n.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                            <div className="flex items-center gap-2">
                              <Badge tone="slate">{n.from}</Badge>
                              <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(n.at)}</span>
                            </div>
                            <div className="mt-2 text-sm font-semibold text-slate-800">{n.text}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder='Reply to "EduMart Desk"…'
                        className="h-11 flex-1 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!message.trim()) return;
                          const next = {
                            ...draft,
                            deskNotes: [{ id: makeId("msg"), at: new Date().toISOString(), from: "You", text: message.trim() }, ...(draft.deskNotes || [])],
                          };
                          setDraft(recomputeCompliance(next));
                          setMessage("");
                          pushToast({ title: "Sent", message: "Message saved (demo).", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Send className="h-4 w-4" />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "Timeline" ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Timeline</div>
                      <span className="ml-auto"><Badge tone="slate">History</Badge></span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(draft.timeline || []).length === 0 ? (
                        <EmptyState title="No events" message="Actions like submission and review will appear here." />
                      ) : (
                        (draft.timeline || []).map((ev) => (
                          <div key={ev.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                            <div className="flex items-center gap-2">
                              <Badge tone="slate">{fmtTime(ev.at)}</Badge>
                              <div className="text-sm font-black text-slate-900">{ev.label}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {scan.last ? (
                      <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Preflight scan summary</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">Last scan {fmtTime(scan.last)}</div>
                            {scan.flags.length ? (
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                                {scan.flags.map((f) => <li key={f}>{f}</li>)}
                              </ul>
                            ) : (
                              <div className="mt-2 text-xs font-semibold text-orange-900/80">No flags in this demo.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        <div className="sticky bottom-0 -mx-4 mt-3 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSave({ ...draft, updatedAt: new Date().toISOString() });
                pushToast({ title: "Saved", message: "Draft updated.", tone: "success" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <CheckCheck className="h-4 w-4" />
              Save
            </button>

            <button
              type="button"
              onClick={runPreflight}
              disabled={scan.running}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold transition",
                scan.running ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
            >
              <RefreshCw className="h-4 w-4" />
              Preflight
            </button>

            <button
              type="button"
              onClick={submit}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                !canSubmit && "opacity-60"
              )}
              style={{ background: TOKENS.orange }}
            >
              <Send className="h-4 w-4" />
              Submit
            </button>

            <button
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function ChecklistToggle({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "rounded-3xl border p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
        checked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900/70"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            checked ? "bg-white dark:bg-slate-900 text-emerald-700" : "bg-slate-100 text-slate-700"
          )}
        >
          {checked ? <CheckCheck className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{desc}</div>
          <div className="mt-3"><Badge tone={checked ? "green" : "slate"}>{checked ? "Completed" : "Not set"}</Badge></div>
        </div>
      </div>
    </button>
  );
}

function DocToggle({
  title,
  desc,
  checked,
  onChange,
  recommended,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "rounded-3xl border p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
        checked ? "border-emerald-200 bg-emerald-50/60" : recommended ? "border-orange-200 bg-orange-50/50" : "border-slate-200/70 bg-white dark:bg-slate-900/70"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", checked ? "bg-white dark:bg-slate-900 text-emerald-700" : "bg-slate-100 text-slate-700")}>
          {checked ? <CheckCheck className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-black text-slate-900">{title}</div>
            {recommended && !checked ? <Badge tone="orange">Recommended</Badge> : null}
            <span className="ml-auto"><Badge tone={checked ? "green" : "slate"}>{checked ? "Present" : "Missing"}</Badge></span>
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{desc}</div>
          <div className="mt-3 text-[11px] font-semibold text-slate-500">Click to toggle (demo). Use real uploads in production.</div>
        </div>
      </div>
    </button>
  );
}

export default function EduMartDeskSellerComplianceCenter() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState("Overview");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [kind, setKind] = useState("All");
  const [risk, setRisk] = useState("All");

  const [rows, setRows] = useState<EduListing[]>([]);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getRegulatoryDesk("edumart").then((payload) => {
      if (!active) return;
      const pageData = ((payload as { pageData?: Record<string, unknown> }).pageData ?? {}) as Record<string, unknown>;
      setRows(Array.isArray(pageData.rows) ? pageData.rows as EduListing[] : []);
    });

    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: rows.length };
    ["Draft", "In Review", "Approved", "Rejected", "Suspended"].forEach((s) => {
      map[s] = rows.filter((r) => r.status === s).length;
    });
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (status === "All" ? true : r.status === status))
      .filter((r) => (kind === "All" ? true : r.kind === kind))
      .filter((r) => (risk === "All" ? true : r.risk === risk))
      .filter((r) => {
        if (!q) return true;
        const hay = [r.id, r.title, r.kind, r.category, r.status, r.ageBand].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [rows, status, kind, risk, query]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const toggleAll = () => {
    const allSelected = filtered.length > 0 && filtered.every((r) => selected[r.id]);
    if (allSelected) {
      const next = { ...selected };
      filtered.forEach((r) => delete next[r.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      filtered.forEach((r) => (next[r.id] = true));
      setSelected(next);
    }
  };

  const [activeId, setActiveId] = useState<string | undefined>(() => rows[0]?.id);
  useEffect(() => {
    if (!rows.find((r) => r.id === activeId)) setActiveId(rows[0]?.id);
  }, [rows]);

  const active = useMemo(() => rows.find((r) => r.id === activeId) || null, [rows, activeId]);

  const [detailOpen, setDetailOpen] = useState(false);
  const openDetail = (id: string) => {
    setActiveId(id);
    setDetailOpen(true);
  };

  const saveListing = (updated: EduListing) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? recomputeCompliance(updated) : r)));
  };

  const bulkSubmit = () => {
    if (!selectedIds.length) {
      pushToast({ title: "Select submissions", message: "Choose one or more listings first.", tone: "warning" });
      return;
    }

    const blocked = rows
      .filter((r) => selectedIds.includes(r.id))
      .filter((r) => (r.compliance?.issues || []).length > 0);

    if (blocked.length) {
      pushToast({
        title: "Some cannot submit",
        message: `${blocked.length} listing(s) have issues. Fix them first.`,
        tone: "warning",
        action: { label: "Open first", onClick: () => openDetail(blocked[0].id) },
      });
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        selectedIds.includes(r.id)
          ? {
              ...r,
              status: "In Review",
              updatedAt: new Date().toISOString(),
              timeline: [{ id: makeId("t"), at: new Date().toISOString(), label: "Submitted to EduMart Desk" }, ...(r.timeline || [])],
            }
          : r
      )
    );

    setSelected({});
    pushToast({ title: "Submitted", message: `${selectedIds.length} listing(s) sent for review.`, tone: "success" });
  };

  const bulkExport = () => {
    if (!selectedIds.length) {
      pushToast({ title: "Select submissions", message: "Choose one or more listings first.", tone: "warning" });
      return;
    }
    pushToast({ title: "Export queued", message: "Evidence pack export will be generated (demo).", tone: "default" });
  };

  const health = useMemo(() => {
    const total = rows.length || 1;
    const ok = rows.filter((r) => r.compliance?.state === "ok").length;
    const warn = rows.filter((r) => r.compliance?.state === "warn").length;
    const issue = rows.filter((r) => r.compliance?.state === "issue").length;

    const readinessAvg = Math.round(rows.reduce((s, r) => s + (r.readiness || 0), 0) / total);
    const pctOk = Math.round((ok / total) * 100);
    const pctWarn = Math.round((warn / total) * 100);
    const pctIssue = Math.round((issue / total) * 100);

    return { readinessAvg, pctOk, pctWarn, pctIssue, ok, warn, issue, total };
  }, [rows]);

  const topIssues = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      (r.compliance?.issues || []).forEach((iss) => map.set(iss, (map.get(iss) || 0) + 1));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }));
  }, [rows]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected[r.id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">EduMart Desk</div>
                <Badge tone="slate">/regulatory/edumart</Badge>
                <Badge tone="slate">Seller facing</Badge>
                <Badge tone="slate">Child-safe compliance</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Submit education products, digital content, and services for review. Focus on child safety, privacy, and safeguarding.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Policies", message: "Open the Policies section inside a listing drawer (demo).", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <ShieldCheck className="h-4 w-4" />
                Policies
              </button>

              <button
                type="button"
                onClick={() => pushToast({ title: "Desk messages", message: "Messaging is shown inside each submission.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <MessageCircle className="h-4 w-4" />
                Desk messages
              </button>

              <button
                type="button"
                onClick={() => {
                  if (rows[0]) openDetail(rows[0].id);
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                Start submission
              </button>
            </div>
          </div>

          {/* Status pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {["All", "Draft", "In Review", "Approved", "Rejected", "Suspended"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setStatus(k)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                  status === k
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                {k}
                <span className={cx("rounded-full px-2 py-0.5 text-[10px]", status === k ? "bg-white dark:bg-slate-900 text-slate-700" : "bg-slate-100 text-slate-700")}>
                  {counts[k] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {["Overview", "Submissions", "Rules"].map((t) => (
            <SegTab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
        </div>

        {tab === "Overview" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-8">
              <div className="flex items-start gap-3">
                <div
                  className="grid h-12 w-12 place-items-center rounded-3xl text-white"
                  style={{ background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)` }}
                >
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-slate-900">Compliance health</div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">A clear view of what is ready and what needs action.</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge tone="slate">Total {health.total}</Badge>
                  <Badge tone={health.issue ? "orange" : "green"}>{health.issue ? "Action needed" : "Healthy"}</Badge>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <MiniMetric label="Average readiness" value={health.readinessAvg} tone={health.readinessAvg >= 85 ? "green" : health.readinessAvg >= 65 ? "orange" : "danger"} />
                <MiniMetric label="OK" value={health.pctOk} tone="green" />
                <MiniMetric label="Needs action" value={health.pctIssue} tone={health.pctIssue >= 25 ? "danger" : "orange"} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Top issues</div>
                    <span className="ml-auto"><Badge tone="slate">Auto</Badge></span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {topIssues.length === 0 ? (
                      <div className="text-xs font-semibold text-slate-500">No issues detected.</div>
                    ) : (
                      topIssues.map((x) => (
                        <div key={x.issue} className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                          <div className="mt-0.5"><Badge tone="orange">{x.count}</Badge></div>
                          <div className="text-xs font-extrabold text-slate-800">{x.issue}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Info className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-orange-900">Next steps</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">
                        1) Fix issues, 2) Upload evidence, 3) Run preflight, 4) Submit.
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const first = rows.find((r) => (r.compliance?.issues || []).length > 0) || rows[0];
                            if (first) openDetail(first.id);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          <ChevronRight className="h-4 w-4" />
                          Fix first issue
                        </button>
                        <button
                          type="button"
                          onClick={() => setTab("Submissions")}
                          className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                        >
                          <ClipboardList className="h-4 w-4" />
                          View submissions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">What the desk checks</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Built for child safety and trust</div>
                </div>
                <Badge tone="slate">Guide</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  { t: "Age suitability", d: "Age band is clear and consistent." },
                  { t: "Content safety", d: "No unsuitable content for children." },
                  { t: "Child privacy", d: "Parent-friendly privacy summary." },
                  { t: "Safeguarding", d: "Clear rules for services and tutors." },
                  { t: "Evidence", d: "Certificates and proof documents." },
                ].map((x) => (
                  <div key={x.t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="text-sm font-black text-slate-900">{x.t}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Privacy reminder</div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  Keep child data collection minimal. Provide parent controls where relevant.
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "Rules" ? (
          <GlassCard className="p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">EduMart Desk rules for sellers and providers</div>
              <span className="ml-auto"><Badge tone="slate">Reference</Badge></span>
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-500">
              These are practical guidelines for safer education listings. They are not legal advice.
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="text-sm font-black text-emerald-900">Do</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-emerald-900/80">
                  <li>Declare age suitability clearly on listings and packaging.</li>
                  <li>Provide parent-friendly summaries for digital products and services.</li>
                  <li>Upload certificates, licenses, and proof documents.</li>
                  <li>Use safe imagery and avoid unsafe demonstrations.</li>
                  <li>Keep advertising child-appropriate and transparent.</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-4">
                <div className="text-sm font-black text-rose-900">Do not</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-rose-900/80">
                  <li>Include adult content, hate, or unsuitable materials.</li>
                  <li>Collect unnecessary child personal data.</li>
                  <li>Allow open external chats for children without controls.</li>
                  <li>Misrepresent educational claims or certifications.</li>
                  <li>Hide paid endorsements or promotions.</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">Tip</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Use the listing drawer to complete the checklist and upload evidence. Preflight scan helps catch common issues.
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        ) : null}

        {tab === "Submissions" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-4 lg:col-span-12">
              <div className="grid gap-2 md:grid-cols-12 md:items-center">
                <div className="relative md:col-span-5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by ID, title, kind, age band"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="md:col-span-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <div className="text-xs font-extrabold text-slate-700">Kind</div>
                    <div className="relative ml-auto">
                      <select
                        value={kind}
                        onChange={(e) => setKind(e.target.value)}
                        className="h-9 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-xs font-extrabold text-slate-800"
                      >
                        {["All", "Physical Product", "Digital Content", "Service"].map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="relative">
                    <select
                      value={risk}
                      onChange={(e) => setRisk(e.target.value)}
                      className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                    >
                      {["All", "Low", "Medium", "High"].map((k) => (
                        <option key={k} value={k}>{k} risk</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setKind("All");
                      setRisk("All");
                      pushToast({ title: "Filters cleared", tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Refreshed", message: "Signals updated (demo).", tone: "success" })}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>
            </GlassCard>

            {selectedIds.length ? (
              <div className="lg:col-span-12 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800">
                    <CheckCheck className="h-4 w-4" />
                    {selectedIds.length} selected
                  </div>

                  <button
                    type="button"
                    onClick={bulkSubmit}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    <Send className="h-4 w-4" />
                    Submit to desk
                  </button>

                  <button
                    type="button"
                    onClick={bulkExport}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <FileText className="h-4 w-4" />
                    Export evidence pack
                  </button>

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
            ) : null}

            <GlassCard className="overflow-hidden lg:col-span-12">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Your EduMart submissions</div>
                    <Badge tone="slate">Seller actions</Badge>
                  </div>
                  <Badge tone="slate">{filtered.length} results</Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1020px]">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={toggleAll}
                        className={cx(
                          "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900 transition",
                          allVisibleSelected ? "border-emerald-200" : "border-slate-200/70"
                        )}
                        aria-label="Select all"
                      >
                        {allVisibleSelected ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="col-span-4">Title</div>
                    <div className="col-span-2">Kind</div>
                    <div className="col-span-1">Risk</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1">Compliance</div>
                    <div className="col-span-1">Score</div>
                    <div className="col-span-1">Updated</div>
                  </div>

                  <div className="divide-y divide-slate-200/70">
                    {filtered.map((r) => {
                      const checked = !!selected[r.id];
                      const isActive = r.id === activeId;
                      return (
                        <div
                          key={r.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setActiveId(r.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setActiveId(r.id);
                          }}
                          className={cx(
                            "grid grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold transition",
                            isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="col-span-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected((s) => ({ ...s, [r.id]: !checked }));
                              }}
                              className={cx(
                                "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900 transition",
                                checked ? "border-emerald-200" : "border-slate-200/70"
                              )}
                              aria-label={checked ? "Unselect" : "Select"}
                            >
                              {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                            </button>
                          </div>

                          <div className="col-span-4 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate font-extrabold text-slate-900">{r.title}</div>
                              <Badge tone="slate">{r.ageBand}</Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <span className="inline-flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{r.id}</span>
                              <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{r.category}</span>
                            </div>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <Badge tone="slate">{r.kind}</Badge>
                          </div>

                          <div className="col-span-1 flex items-center">
                            <Badge tone={r.risk === "High" ? "danger" : r.risk === "Medium" ? "orange" : "green"}>{r.risk}</Badge>
                          </div>

                          <div className="col-span-1 flex items-center">
                            <Badge tone={r.status === "Approved" ? "green" : r.status === "In Review" ? "orange" : r.status === "Rejected" ? "danger" : "slate"}>{r.status}</Badge>
                          </div>

                          <div className="col-span-1 flex items-center">
                            <Badge tone={complianceTone(r.compliance?.state)}>{String(r.compliance?.state || "-").toUpperCase()}</Badge>
                          </div>

                          <div className="col-span-1 flex items-center">
                            <ScorePill score={r.readiness ?? 0} />
                          </div>

                          <div className="col-span-1 flex items-center justify-between gap-2 text-slate-500">
                            <span>{fmtTime(r.updatedAt)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetail(r.id);
                              }}
                              className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                              aria-label="Open"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filtered.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="No submissions found"
                          message="Try changing filters, or clear search."
                          cta={{
                            label: "Reset",
                            onClick: () => {
                              setQuery("");
                              setKind("All");
                              setRisk("All");
                              setStatus("All");
                              pushToast({ title: "Reset", tone: "default" });
                            },
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Right quick panel */}
            <div className="lg:col-span-12 mt-4">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Selected submission</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Open details to complete checklist and submit.</div>
                  </div>
                  <Badge tone="slate">Quick actions</Badge>
                </div>

                {!active ? (
                  <div className="mt-4"><EmptyState title="Select a submission" message="Click a row to enable actions." /></div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="text-xs font-extrabold text-slate-600">Readiness</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">{active.readiness}</div>
                      <div className="mt-2"><Badge tone={complianceTone(active.compliance?.state)}>{String(active.compliance?.state || "-").toUpperCase()}</Badge></div>
                    </div>
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="text-xs font-extrabold text-slate-600">Most important fix</div>
                      <div className="mt-2 text-sm font-black text-slate-900">
                        {(active.compliance?.issues || ["No issues"][0])[0] || "No issues"}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Open the drawer to fix quickly.</div>
                    </div>
                    <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-orange-700" />
                        <div className="text-sm font-black text-orange-900">Submit strategy</div>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-orange-900/70">Submit only when compliance is OK to avoid delays.</div>
                      <button
                        type="button"
                        onClick={() => openDetail(active.id)}
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.orange }}
                      >
                        <ChevronRight className="h-4 w-4" />
                        Open details
                      </button>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        ) : null}
      </div>

      <EduListingDrawer
        open={detailOpen}
        listing={active}
        onClose={() => setDetailOpen(false)}
        onSave={saveListing}
        pushToast={pushToast}
      />

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
