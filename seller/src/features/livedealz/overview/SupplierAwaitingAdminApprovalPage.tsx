import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";

/**
 * SupplierAwaitingAdminApprovalPremium.tsx (Previewable Canvas)
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------------------
 * Primary blueprint: creator_awaiting_admin_approval_premium.tsx
 *
 * Mirror-first preserved:
 * - Premium hero header with status-based title/desc + pill strip (ETA, submitted, flags)
 * - ToastStack + Modal system
 * - Step timeline: Submitted → Under review → Action required → Back in review → Approved
 * - Submission snapshot modal
 * - Notification preferences card + refresh status simulation
 * - “What we check” card + “While you wait” coaching card
 * - Action Required section: admin feedback, reference docs, checklist, message, uploads, resubmit gating
 * - Support footer hint + page footer
 *
 * Supplier adaptations (minimal, workflow-aligned):
 * - This page tracks ADMIN approval for a Supplier submission (typically a Campaign or Content package).
 * - Admin approval is mandatory before execution.
 * - If campaign uses Creators with Manual approval: Supplier approval should happen before Admin (not enforced here, shown as context).
 * - Copy and snapshot fields are supplier/campaign oriented (campaign id, promo type, surfaces, creator plan).
 *
 * Canvas-safe:
 * - No react-router, no lucide-react, no ThemeContext.
 * - Inline SVG icon set.
 * - `go()` uses hash navigation stub.
 */

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";

const SUBMISSION_KEYS_TO_TRY = [
  "mldz_supplier_campaign_submission_v1",
  "mldz_supplier_campaign_builder_v2",
  "mldz_supplier_campaign_draft",
  "mldz_supplier_campaign_current",
  "mldz_supplier_submission_snapshot"
];

type ApprovalStatus = "Submitted" | "UnderReview" | "SendBack" | "Resubmitted" | "Approved";

interface Toast {
  id: string;
  message: string;
  tone: "default" | "success" | "error";
}

interface StatusStep {
  key: ApprovalStatus;
  label: string;
  desc: string;
}

interface AdminDoc {
  name: string;
  url: string;
  type: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface CampaignSubmission {
  campaignId?: string;
  campaignTitle?: string;
  promoType?: string;
  surfaces?: string[];
  region?: string;
  currency?: string;
  plannedBudget?: number;
  creatorUsageDecision?: "I will use a Creator" | "I will NOT use a Creator" | "I am NOT SURE yet";
  collabMode?: "Open for Collabs" | "Invite-only" | "—";
  contentApprovalMode?: "Manual" | "Auto";
  supplierApprovalComplete?: boolean;
  submittedAt?: string;
  notes?: string;
  itemsCount?: number;
  landingLinks?: { label: string; url: string }[];
  hasIssues?: boolean; // simulation hint
}

const STATUS_STEPS: StatusStep[] = [
  {
    key: "Submitted",
    label: "Submitted to Admin",
    desc: "We received your campaign submission for review."
  },
  {
    key: "UnderReview",
    label: "Under review",
    desc: "Admin is checking compliance, assets, pricing and scheduling readiness."
  },
  {
    key: "SendBack",
    label: "Action required",
    desc: "Admin needs a few updates. Fix items and resubmit."
  },
  {
    key: "Resubmitted",
    label: "Back in review",
    desc: "Admin is verifying your updates."
  },
  {
    key: "Approved",
    label: "Approved",
    desc: "Your campaign is cleared to execute (Live/Adz scheduling unlocked)."
  }
];

function cx(...xs: Array<string | boolean | undefined | null>): string {
  return xs.filter(Boolean).join(" ");
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeJsonParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function readApprovalQueryParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function createEmptySupplierAwaitingAdminApprovalSubmission(): CampaignSubmission {
  return {
    campaignId: "",
    campaignTitle: "",
    promoType: "",
    surfaces: [],
    region: "",
    currency: "",
    plannedBudget: 0,
    creatorUsageDecision: "I will NOT use a Creator",
    collabMode: "—",
    contentApprovalMode: "Auto",
    supplierApprovalComplete: false,
    submittedAt: "",
    itemsCount: 0,
    landingLinks: [],
  };
}

function createInitialSupplierAwaitingAdminApprovalStatus(): ApprovalStatus {
  return "UnderReview";
}

function createInitialSupplierAwaitingAdminApprovalEtaMin() {
  return 90;
}

function createInitialSupplierAwaitingAdminApprovalReason() {
  return "";
}

function createEmptySupplierAwaitingAdminApprovalDocs(): AdminDoc[] {
  return [];
}

function createEmptySupplierAwaitingAdminApprovalItems(): ChecklistItem[] {
  return [];
}

function createInitialSupplierAwaitingAdminApprovalNote() {
  return "";
}

function formatEta(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `~${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `~${h}h ${r}m` : `~${h}h`;
}

function goTo(navigate: (path: string) => void, path: string) {
  if (!path) return;
  const target = /^https?:\/\//i.test(path) ? path : path.startsWith("/") ? path : `/${path}`;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noreferrer");
    return;
  }
  navigate(target);
}

/* ------------------------------ Inline Icons ------------------------------ */

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "h-4 w-4"}>
      {children}
    </svg>
  );
}

const I = {
  ArrowRight: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Svg>
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  ),
  Clock: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </Svg>
  ),
  CalendarClock: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="16.5" r="3.5" />
      <path d="M16.5 15v1.8l1 1" />
    </Svg>
  ),
  BadgeCheck: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12l2.3 2.3L15.8 9.3" />
    </Svg>
  ),
  CircleAlert: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </Svg>
  ),
  FileText: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </Svg>
  ),
  HelpCircle: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
      <path d="M12 17h.01" />
    </Svg>
  ),
  Bell: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  ),
  Lock: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  ),
  Mail: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </Svg>
  ),
  MessageCircle: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 8.5 8.5 0 0 1-4-1l-4 1 1-4a8.5 8.5 0 0 1-1-4A8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
    </Svg>
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </Svg>
  ),
  Loader2: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M21 12a9 9 0 1 1-9-9" />
    </Svg>
  ),
  ShieldCheck: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M12 2 20 6v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4Z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  ),
  Sparkles: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M12 2l1.5 5 5 1.5-5 1.5L12 15l-1.5-5-5-1.5 5-1.5L12 2Z" />
      <path d="M19 13l.8 2.6L22 16l-2.2.4L19 19l-.8-2.6L16 16l2.2-.4L19 13Z" />
    </Svg>
  ),
  Rocket: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M5 19l4-1 8-8a7 7 0 0 0 2-5V3h-2a7 7 0 0 0-5 2l-8 8-1 4Z" />
      <path d="M9 18l-1-4" />
      <path d="M14 9l-4-1" />
      <circle cx="15" cy="9" r="1" />
    </Svg>
  ),
  Upload: ({ className }: { className?: string }) => (
    <Svg className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5-5 5 5" />
      <path d="M12 5v12" />
    </Svg>
  )
};

/* ------------------------------ Toasts ------------------------------ */

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (message: string, tone: "default" | "success" | "error" = "default") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  };

  return { toasts, push };
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-16 right-3 md:right-6 z-[60] flex flex-col gap-2 w-[min(360px,calc(100vw-24px))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "rounded-2xl border px-3 py-2 text-[12px] shadow-sm bg-white dark:bg-slate-900",
            t.tone === "success"
              ? "border-emerald-200 dark:border-emerald-800/50"
              : t.tone === "error"
                ? "border-rose-200 dark:border-rose-800/50"
                : "border-slate-200 dark:border-slate-700"
          )}
        >
          <div className="flex items-start gap-2">
            <span
              className={cx(
                "mt-1 h-2 w-2 rounded-full",
                t.tone === "success" ? "bg-emerald-500" : t.tone === "error" ? "bg-rose-500" : "bg-amber-500"
              )}
            />
            <div className="text-slate-700 dark:text-slate-200">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Modal ------------------------------ */

function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">{title}</div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-[12px] font-semibold hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------ Atoms ------------------------------ */

function StepRow({
  index,
  currentIndex,
  label,
  desc
}: {
  index: number;
  currentIndex: number;
  label: string;
  desc: string;
}) {
  const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "todo";
  const isDone = state === "done";
  const isActive = state === "active";

  return (
    <li
      className={cx(
        "relative pl-10 pr-3 py-3 rounded-2xl border",
        isActive
          ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      )}
    >
      <span
        className={cx(
          "absolute left-3 top-3 grid place-items-center h-7 w-7 rounded-full border",
          isDone
            ? "bg-emerald-500 border-emerald-500 text-white"
            : isActive
              ? "bg-white dark:bg-slate-900 dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400"
              : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
        )}
      >
        {isDone ? (
          <I.Check className="h-4 w-4" />
        ) : isActive ? (
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
        )}
      </span>

      <div className="flex items-center justify-between gap-2">
        <div
          className={cx(
            "text-base font-semibold",
            isActive ? "text-emerald-900 dark:text-emerald-50" : "text-slate-900 dark:text-slate-50"
          )}
        >
          {label}
        </div>
        {isActive ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
            CURRENT
          </span>
        ) : null}
      </div>
      <div
        className={cx(
          "text-sm",
          isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
        )}
      >
        {desc}
      </div>
    </li>
  );
}

function Pill({
  icon,
  text,
  tone = "default"
}: {
  icon: React.ReactNode;
  text: string;
  tone?: "good" | "warn" | "default";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-bold shadow-sm transition-colors",
        tone === "good"
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
          : tone === "warn"
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400"
            : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      )}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function Button({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
  className
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "dark" | "secondary";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-base font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

  const styles =
    variant === "primary"
      ? "bg-[#f77f00] text-white hover:bg-[#e26f00]"
      : variant === "dark"
        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-800"
        : "bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700";

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cx(base, styles, className)}>
      {children}
    </button>
  );
}

function UploadDropzone({
  files,
  setFiles,
  toast
}: {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  toast: (msg: string, tone?: "success" | "error") => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dnd, setDnd] = useState(false);
  const [info, setInfo] = useState("");

  const MAX_SIZE = 20 * 1024 * 1024;

  function addFiles(fileList: FileList | null | File[]) {
    const arr = Array.from(fileList || []);
    const accepted: File[] = [];
    let ignored = 0;

    for (const f of arr) {
      if (f.size > MAX_SIZE) {
        ignored++;
        continue;
      }
      accepted.push(f);
    }

    if (accepted.length) {
      setFiles((prev) => [...prev, ...accepted]);
      toast(`${accepted.length} file(s) added.`, "success");
    }

    if (ignored) {
      const msg = `${ignored} file(s) ignored (too large).`;
      setInfo(msg);
      toast(msg, "error");
    } else {
      setInfo(accepted.length ? "Files added" : "");
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function remove(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    toast("File removed.", "success");
  }

  function formatSize(bytes: number) {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(kb)} KB`;
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDnd(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDnd(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDnd(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDnd(false);
          if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
        }}
        className={cx(
          "rounded-2xl border-2 border-dashed p-5 text-center transition",
          dnd
            ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
            : "border-slate-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900"
        )}
      >
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">Drag and drop updated assets or documents</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">PDF, JPG, PNG, WEBP, video. Max 20 MB each.</div>
        <div className="mt-3">
          <Button onClick={() => inputRef.current?.click()} variant="secondary">
            <I.Upload className="h-4 w-4" /> Choose files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,image/*,video/*"
            className="hidden"
            onChange={onPick}
          />
        </div>
        {info ? <div className="mt-2 text-[11px] text-slate-600">{info}</div> : null}
      </div>

      {files.length ? (
        <ul className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
          {files.map((f, i) => (
            <li
              key={`${f.name}_${i}`}
              className="px-3 py-2 flex items-center justify-between gap-3 border-b last:border-b-0 border-slate-200/60 dark:border-slate-800"
            >
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50 truncate">{f.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatSize(f.size)}</div>
              </div>
              <button
                type="button"
                className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                onClick={() => remove(i)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "h-7 w-12 rounded-full border relative transition-all duration-300 ease-in-out",
        checked
          ? "bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 shadow-sm"
          : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 shadow-inner"
      )}
      aria-label="toggle"
    >
      <span
        className={cx(
          "absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300 ease-in-out shadow-md",
          checked ? "bg-white dark:bg-slate-900 left-6" : "bg-white dark:bg-slate-900 left-0.5"
        )}
      />
    </button>
  );
}

function MiniAction({
  icon,
  title,
  desc,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-white/10 bg-white dark:bg-slate-900/5 hover:bg-gray-50 dark:hover:bg-slate-800/10 px-3 py-2"
    >
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded-2xl bg-white dark:bg-slate-900/10 border border-white/10 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-[12px] font-semibold text-white">{title}</div>
          <div className="text-[11px] text-slate-300">{desc}</div>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function SupplierAwaitingAdminApprovalPremium() {
  const navigate = useNavigate();
  const go = (path: string) => goTo(navigate, path);
  const { toasts, push } = useToasts();

  const qp = useMemo<Record<string, string>>(() => readApprovalQueryParams(), []);
  const [submission, setSubmission] = useState<CampaignSubmission>(
    createEmptySupplierAwaitingAdminApprovalSubmission()
  );

  const displayTitle = submission?.campaignTitle || "Campaign";
  const campaignId = submission?.campaignId || "pending";
  const submittedAt = submission?.submittedAt || nowIso();

  // status
  const [status, setStatus] = useState<ApprovalStatus>(createInitialSupplierAwaitingAdminApprovalStatus());
  const [etaMin, setEtaMin] = useState<number>(createInitialSupplierAwaitingAdminApprovalEtaMin());
  const [adminReason, setAdminReason] = useState<string>(createInitialSupplierAwaitingAdminApprovalReason());
  const [adminDocs, setAdminDocs] = useState<AdminDoc[]>(createEmptySupplierAwaitingAdminApprovalDocs());
  const [items, setItems] = useState<ChecklistItem[]>(createEmptySupplierAwaitingAdminApprovalItems());

  const [newItem, setNewItem] = useState("");
  const [note, setNote] = useState<string>(createInitialSupplierAwaitingAdminApprovalNote());
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const [prefEmail, setPrefEmail] = useState(true);
  const [prefInApp, setPrefInApp] = useState(true);

  const [showSubmission, setShowSubmission] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const payload = await sellerBackendApi.getWorkflowScreenState(
          "supplier-awaiting-admin-approval"
        );
        if (cancelled || !payload || typeof payload !== "object") return;

        const nextSubmission =
          payload.submission && typeof payload.submission === "object"
            ? (payload.submission as CampaignSubmission)
            : null;
        const nextReview =
          payload.review && typeof payload.review === "object"
            ? (payload.review as Record<string, unknown>)
            : {};

        if (nextSubmission) {
          setSubmission((prev) => ({ ...prev, ...nextSubmission }));
        }
        setStatus(String(nextReview.status || "UnderReview") as ApprovalStatus);
        setEtaMin(Number(nextReview.etaMin || 90));
        setAdminReason(String(nextReview.adminReason || ""));
        setAdminDocs(Array.isArray(nextReview.adminDocs) ? (nextReview.adminDocs as AdminDoc[]) : []);
        setItems(Array.isArray(nextReview.items) ? (nextReview.items as ChecklistItem[]) : []);
        setNote(String(nextReview.note || ""));
        setPrefEmail(nextReview.prefEmail !== false);
        setPrefInApp(nextReview.prefInApp !== false);
      } catch {
        if (!cancelled) {
          push("Could not load approval state from the backend.", "error");
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [push]);

  const currentIndex = useMemo(() => {
    const map: Record<ApprovalStatus, number> = {
      Submitted: 0,
      UnderReview: 1,
      SendBack: 2,
      Resubmitted: 3,
      Approved: 4
    };
    return map[status] ?? 0;
  }, [status]);

  const allChecked = items.length === 0 || items.every((it) => it.done);
  const hasAttachmentOrNote = files.length > 0 || note.trim().length > 0;
  const canResubmit = status === "SendBack" && allChecked && hasAttachmentOrNote;

  // Seed sample admin feedback if Action required
  useEffect(() => {
    if (status !== "SendBack") return;

    if (!adminReason) {
      setAdminReason(
        "Please update your campaign offer details, confirm discount math, provide compliant creative assets, and verify your landing links."
      );
    }

    if (!items.length) {
      setItems([
        { id: "item-1", text: "Confirm discount amount/percentage and final price presentation", done: false },
        { id: "item-2", text: "Update creative to include required disclosures (terms, duration, stock limits)", done: false },
        { id: "item-3", text: "Validate landing links (campaign page + catalog) and ensure they load", done: false }
      ]);
    }

    if (!adminDocs.length) {
      setAdminDocs([
        { name: "Promotion & claims policy (PDF)", url: "#", type: "pdf" },
        { name: "Ad creative checklist (PDF)", url: "#", type: "pdf" }
      ]);
    }
  }, [status, adminReason, items.length, adminDocs.length]);

  useEffect(() => {
    if (!hydrated) return;
    const timeoutId = window.setTimeout(() => {
      void sellerBackendApi.patchWorkflowScreenState("supplier-awaiting-admin-approval", {
        submission: {
          ...submission,
          submittedAt,
        },
        review: {
          status,
          etaMin,
          adminReason,
          adminDocs,
          items,
          note,
          prefEmail,
          prefInApp,
        },
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [adminDocs, adminReason, etaMin, hydrated, items, note, prefEmail, prefInApp, status, submission, submittedAt]);

  function toggleItem(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }

  function addItem() {
    const t = newItem.trim();
    if (!t) return;
    setItems((prev) => [...prev, { id: `item-${Date.now()}`, text: t, done: false }]);
    setNewItem("");
    push("Checklist item added.", "success");
  }

  function computeShouldSendBack() {
    // simple simulation: if forced, or missing essentials
    if (qp.forceSendBack === "1") return true;
    if (submission?.hasIssues) return true;

    const missingLinks = !submission?.landingLinks || submission.landingLinks.length === 0;
    const missingOffer = !submission?.promoType;
    const missingItems = !Number.isFinite(submission?.itemsCount) || (submission?.itemsCount || 0) <= 0;

    // If campaign uses creators with manual approval but supplier approval incomplete,
    // admin may request supplier finalize it first (workflow alignment).
    const manualNeedsSupplier =
      submission?.creatorUsageDecision === "I will use a Creator" &&
      submission?.contentApprovalMode === "Manual" &&
      submission?.supplierApprovalComplete === false;

    return missingLinks || missingOffer || missingItems || manualNeedsSupplier;
  }

  async function refreshStatus() {
    setRefreshing(true);
    setNotice("");
    push("Refreshing status...", "success");

    await new Promise((r) => setTimeout(r, 700));

    if (status === "UnderReview") {
      const nextEta = Math.max(5, etaMin - 15);
      setEtaMin(nextEta);

      const shouldSendBack = computeShouldSendBack();

      if (nextEta <= 10 && !shouldSendBack) {
        setStatus("Approved");
        push("Approved. Campaign execution is unlocked.", "success");
      } else if (shouldSendBack) {
        setStatus("SendBack");
        setEtaMin(60);
        push("Action required. Please review admin feedback.", "error");
      } else {
        push("Still under review. Thanks for your patience.", "success");
      }
    } else if (status === "Resubmitted") {
      const nextEta = Math.max(5, etaMin - 15);
      setEtaMin(nextEta);
      if (nextEta <= 10) {
        setStatus("Approved");
        push("Approved. You can schedule and execute.", "success");
      } else {
        push("Back in review. We are checking your updates.", "success");
      }
    } else if (status === "SendBack") {
      push("Action required. Complete checklist and resubmit.", "error");
    } else {
      push("Status is up to date.", "success");
    }

    setRefreshing(false);
  }

  async function resubmit() {
    setNotice("");

    if (!canResubmit) {
      setNotice("Complete all required items and add a note or attach at least one file.");
      push("Cannot resubmit yet.", "error");
      return;
    }

    push("Submitting updates...", "success");
    await new Promise((r) => setTimeout(r, 800));

    setStatus("Resubmitted");
    setEtaMin(60);
    setFiles([]);
    push("Resubmitted. Back in review.", "success");
  }

  function clearDraft() {
    setNotice("");
    setFiles([]);
    setNote("");
    setNewItem("");
    setItems((prev) => prev.map((x) => ({ ...x, done: false })));
    push("Draft cleared.", "success");
  }

  const heroTitle =
    status === "Approved"
      ? "Approved. Campaign is cleared to run"
      : status === "SendBack"
        ? "Action required before approval"
        : "Your submission is awaiting Admin approval";

  const heroDesc =
    status === "Approved"
      ? "Scheduling and execution tools are now available for this campaign."
      : status === "SendBack"
        ? "Please address the requested updates, attach changes, and resubmit for review."
        : "Admin is reviewing your campaign. You will get updates here and by email.";

  const creatorPlanLabel = submission?.creatorUsageDecision || "I am NOT SURE yet";
  const collabModeLabel = submission?.collabMode || "—";
  const approvalModeLabel = submission?.contentApprovalMode || "Manual";

  const summaryPills = (
    <div className="mt-2 flex flex-wrap gap-2">
      <Pill
        icon={<I.Clock className="h-4 w-4" />}
        text={`ETA ${formatEta(etaMin)}`}
        tone={status === "Approved" ? "good" : status === "SendBack" ? "warn" : "default"}
      />
      <Pill
        icon={<I.CalendarClock className="h-4 w-4" />}
        text={`Submitted ${new Date(submittedAt).toLocaleDateString()}`}
      />
      {status === "Approved" ? (
        <Pill icon={<I.BadgeCheck className="h-4 w-4" />} text="Admin approved" tone="good" />
      ) : null}
      {status === "SendBack" ? (
        <Pill icon={<I.CircleAlert className="h-4 w-4" />} text="Action required" tone="warn" />
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors">
        <ToastStack toasts={toasts} />

        <Modal open={showSubmission} title="Submitted payload snapshot" onClose={() => setShowSubmission(false)}>
          <div className="text-[12px] text-slate-600 dark:text-slate-400">
            This preview is loaded from the backend approval workflow state.
          </div>
          <pre className="mt-3 text-[11px] bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 overflow-auto max-h-[420px] text-slate-700 dark:text-slate-300">
            {JSON.stringify(submission || { note: "No submission data found" }, null, 2)}
          </pre>
        </Modal>

        <Modal open={showSupport} title="Contact support" onClose={() => setShowSupport(false)}>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 p-3">
              <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">Fast options</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="dark"
                  onClick={() => {
                    push("Support chat opened.", "success");
                    setShowSupport(false);
                  }}
                >
                  <I.MessageCircle className="h-4 w-4" /> Live chat
                </Button>
                <Button
                  onClick={() => {
                    push("Email draft created.", "success");
                    setShowSupport(false);
                  }}
                >
                  <I.Mail className="h-4 w-4" /> Email support
                </Button>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Include your Campaign ID: <span className="font-mono text-slate-700 dark:text-slate-300">{campaignId}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">What to mention</div>
              <ul className="mt-2 list-disc pl-5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <li>Status: {status}</li>
                <li>Submitted: {new Date(submittedAt).toLocaleString()}</li>
                <li>Campaign: {displayTitle}</li>
              </ul>
            </div>
          </div>
        </Modal>

        {/* Header */}
        <header className="border-b border-orange-100 dark:border-orange-950 bg-white dark:bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:shadow-none">
          <div className="w-full px-[0.55%] py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <h1 className="text-[20px] sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white break-words">
                  {heroTitle}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">{heroDesc}</p>
                {summaryPills}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button onClick={() => setShowSupport(true)}>
                <I.HelpCircle className="h-4 w-4" /> Support
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  push("Back to My Campaigns.", "success");
                  go("/supplier/overview/my-campaigns");
                }}
              >
                Back to My Campaigns <I.ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="dark"
                onClick={() => {
                  setStatus("Approved");
                  push("Approved for testing.", "success");
                }}
              >
                Simulate Approved <I.ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="w-full px-[0.55%] py-8 space-y-6">
          {/* Summary */}
          <section className="rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="h-20 w-20 rounded-3xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                <span className="text-[24px] font-black" style={{ color: ORANGE }}>
                  {String(displayTitle || "C").charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight break-words">{displayTitle}</div>
                    <div className="text-lg font-bold text-slate-500 dark:text-slate-400 mt-0.5">Campaign · Awaiting Admin Approval</div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px] text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Campaign ID:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{campaignId}</span>
                      </div>
                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Region:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{submission?.region || "Not set"}</span>
                      </div>
                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Promo:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{submission?.promoType || "Not set"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Button
                      onClick={() => {
                        setShowSubmission(true);
                        push("Opened submission snapshot.", "success");
                      }}
                    >
                      <I.FileText className="h-4 w-4" /> View submission
                    </Button>
                    <Button
                      variant="dark"
                      onClick={() => {
                        push("Receipt generated.", "success");
                      }}
                    >
                      <I.ShieldCheck className="h-4 w-4" /> Download receipt
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4">
                  <div className="space-y-3">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">Review progress</div>
                    <ol className="space-y-2">
                      {STATUS_STEPS.map((s, i) => (
                        <StepRow key={s.key} index={i} currentIndex={currentIndex} label={s.label} desc={s.desc} />
                      ))}
                    </ol>

                    <div className="mt-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4">
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">Submission context</div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Creator plan</div>
                          <div className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">{creatorPlanLabel}</div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Collab mode</div>
                          <div className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">{collabModeLabel}</div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Content approval</div>
                          <div className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">{approvalModeLabel}</div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {submission?.creatorUsageDecision === "I will use a Creator" && submission?.contentApprovalMode === "Manual"
                              ? submission?.supplierApprovalComplete
                                ? "Supplier approval completed, Admin review active."
                                : "Supplier approval pending (Admin may send back until completed)."
                              : "Admin review is the gating step before execution."}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Items + links</div>
                          <div className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">
                            {submission?.itemsCount ?? 0} items · {(submission?.landingLinks || []).length} links
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-3">
                    {/* Notifications */}
                    <div className="rounded-[16px] border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 p-6 transition-all hover:shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tracking-tight">Notifications</div>
                          <div className="text-[12px] text-slate-500 dark:text-slate-400 leading-tight">Get updates when status changes.</div>
                        </div>
                        <I.Bell className="h-5 w-5" style={{ color: ORANGE } as React.CSSProperties} />
                      </div>

                      <div className="mt-5 space-y-3 text-[14px]">
                        <label className="flex items-center justify-between gap-4 cursor-pointer">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Email</span>
                          <Toggle checked={prefEmail} onChange={setPrefEmail} />
                        </label>
                        <label className="flex items-center justify-between gap-4 cursor-pointer">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">In-app</span>
                          <Toggle checked={prefInApp} onChange={setPrefInApp} />
                        </label>
                      </div>

                      <div className="mt-6">
                        <Button variant="primary" onClick={refreshStatus} disabled={refreshing} className="w-full justify-center py-3">
                          {refreshing ? <I.Loader2 className="h-4 w-4" /> : <I.RefreshCw className="h-4 w-4" />}
                          Refresh status
                        </Button>
                      </div>
                    </div>

                    {/* What we check */}
                    <div className="rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tracking-tight">What Admin checks</div>
                          <div className="text-[12px] text-slate-500 dark:text-slate-400 leading-tight">To protect buyers, creators, suppliers and platforms.</div>
                        </div>
                        <I.Lock className="h-5 w-5" style={{ color: GREEN } as React.CSSProperties} />
                      </div>
                      <ul className="mt-5 list-disc pl-5 text-[12px] text-slate-600 dark:text-slate-300 space-y-2">
                        <li className="font-medium">Offer clarity: discount math, duration, stock limits</li>
                        <li className="font-medium">Creative compliance: claims, disclosures, prohibited content</li>
                        <li className="font-medium">Landing links + catalog availability</li>
                        <li className="font-medium">Scheduling readiness (Live/Adz), region + targeting</li>
                      </ul>
                    </div>

                    {/* While you wait */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold text-white">While you wait</div>
                          <div className="text-[11px] text-slate-300">Improve readiness and reduce send-backs.</div>
                        </div>
                        <I.Sparkles className="h-4 w-4" style={{ color: ORANGE } as React.CSSProperties} />
                      </div>
                      <div className="mt-3 space-y-2">
                        <MiniAction
                          icon={<I.Rocket className="h-4 w-4 text-white" />}
                          title="Prepare your Live Sessionz script"
                          desc="Intro, demo, FAQs, and offer timing."
                          onClick={() => push("Live plan template opened.", "success")}
                        />
                        <MiniAction
                          icon={<I.ShieldCheck className="h-4 w-4 text-white" />}
                          title="Run offer compliance checklist"
                          desc="Make sure claims and terms are visible."
                          onClick={() => push("Offer checklist opened.", "success")}
                        />
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </section>

          {/* Approved banner */}
          {status === "Approved" ? (
            <section className="rounded-3xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold text-emerald-900 dark:text-emerald-50">Approved</div>
                  <div className="text-[12px] text-emerald-800 dark:text-emerald-400">You can now schedule Live Sessionz, publish Shoppable Adz, and monitor performance.</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      push("Opening Live Schedule.", "success");
                      go("/supplier/live/schedule");
                    }}
                  >
                    Open Live Schedule <I.ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      push("Opening Adz Manager.", "success");
                      go("/supplier/adz/manager");
                    }}
                  >
                    Open Adz Manager
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {/* Action required block */}
          {status === "SendBack" ? (
            <section className="rounded-3xl border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold text-orange-900 dark:text-orange-100">Action required</div>
                  <div className="text-[12px] text-orange-800 dark:text-orange-300">Please fix the items below and resubmit.</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900 text-orange-800 dark:text-orange-400">
                  REVIEW NEEDED
                </span>
              </div>

              <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-[12px] font-semibold text-orange-900 dark:text-orange-100">Admin feedback</div>
                <div className="mt-1 text-[12px] text-orange-800 dark:text-orange-300">{adminReason}</div>

                {adminDocs.length ? (
                  <div className="mt-3">
                    <div className="text-[11px] font-semibold text-orange-900 dark:text-orange-100">Reference documents</div>
                    <ul className="mt-2 space-y-2">
                      {adminDocs.map((d, i) => (
                        <li
                          key={`${d.name}_${i}`}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-900/40 px-3 py-2"
                        >
                          <div className="text-[12px] text-orange-900 dark:text-orange-100 truncate">{d.name}</div>
                          <Button onClick={() => push("Document opened.", "success")}>Open</Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="text-[12px] font-semibold text-orange-900 dark:text-orange-100">Checklist</div>
                <div className="space-y-2">
                  {(items || []).map((it) => (
                    <label key={it.id} className="flex items-start gap-2 text-[12px] cursor-pointer">
                      <input type="checkbox" className="mt-0.5" checked={!!it.done} onChange={() => toggleItem(it.id)} />
                      <span className="text-orange-900 dark:text-orange-200">{it.text}</span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add another change you made (optional)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/30 text-[12px] text-orange-900 dark:text-orange-100 outline-none placeholder:text-orange-400 dark:placeholder:text-orange-600 focus:border-orange-400"
                  />
                  <Button onClick={addItem}>Add</Button>
                </div>

                <div className="grid gap-1">
                  <div className="text-[12px] font-semibold text-orange-900">Message to review team</div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Describe the updates you have made"
                    className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] h-24 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>

                <UploadDropzone files={files} setFiles={setFiles} toast={push} />

                {notice ? (
                  <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 px-3 py-2 text-[12px]">
                    {notice}
                  </div>
                ) : null}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <Button onClick={clearDraft}>Clear draft</Button>
                  <Button variant="primary" onClick={resubmit} disabled={!canResubmit}>
                    Resubmit
                  </Button>
                </div>

                <div className="text-[11px] text-orange-700 dark:text-orange-300">
                  Tip: Attach at least one updated file or add a clear note. Check all items to enable resubmit.
                </div>
              </div>
            </section>
          ) : null}

          {/* Support footer hint */}
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Need help?</div>
                <div className="text-[12px] text-slate-600 dark:text-slate-400">
                  If the review takes longer than expected, contact Support with your Campaign ID.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setShowSupport(true)}>
                  <I.HelpCircle className="h-4 w-4" /> Contact support
                </Button>
                <Button
                  variant="dark"
                  onClick={() => {
                    push("Support message queued.", "success");
                  }}
                >
                  <I.Mail className="h-4 w-4" /> Message Support
                </Button>
              </div>
            </div>
          </section>

          <div className="text-[11px] text-slate-400">
            If you close this page, you can return any time. Status is saved. You will also get email updates if enabled.
          </div>
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 py-6">
          <div className="w-full px-[0.55%] text-[12px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <div>© {new Date().getFullYear()} MyLiveDealz. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                onClick={() => {
                  push("Go to dashboard.", "success");
                  go("/supplier/overview/my-campaigns");
                }}
              >
                Go to My Campaigns
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <button
                type="button"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4"
                onClick={() => {
                  push("Opening Settings...", "success");
                  go("/supplier/settings");
                }}
              >
                Settings
              </button>
            </div>
          </div>
        </footer>
      </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof window !== "undefined" && (window as any).__MLDZ_TESTS__) {
  const assert = (cond: unknown, msg: string) => {
    if (!cond) throw new Error(`SupplierAwaitingAdminApprovalPremium test failed: ${msg}`);
  };
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "ORANGE exists");
  assert(Array.isArray(STATUS_STEPS) && STATUS_STEPS.length === 5, "STATUS_STEPS length ok");
  assert(formatEta(59).includes("min"), "formatEta minutes");
  assert(formatEta(60).includes("h"), "formatEta hours");
  // eslint-disable-next-line no-console
  console.log("✅ SupplierAwaitingAdminApprovalPremium self-tests passed");
}
