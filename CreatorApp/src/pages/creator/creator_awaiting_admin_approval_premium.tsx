import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  FileText,
  HelpCircle,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Upload
} from "lucide-react";
import { creatorApi } from "../../lib/creatorApi";
import { useTheme } from "../../contexts/ThemeContext";

// MyLiveDealz - Creator Awaiting Admin Approval (Premium)
// Based on the attached old version, redesigned to be more premium and fully interactive.
// Flow:
// - Statuses: Submitted → Under review → Action required → Resubmitted → Approved
// - Shows what to expect, ETA, notifications, and next steps
// - If Action required: shows admin feedback + checklist + attachments + resubmit
// - Uses localStorage to restore creator onboarding summary and to keep drafts

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";

const STORAGE_STATUS_KEY = "mldz_creator_approval_status";
const STORAGE_DRAFT_KEY = "mldz_creator_approval_draft";

const ONBOARDING_KEYS_TO_TRY = [
  "mldz_creator_onboarding_v2_3",
  "mldz_creator_onboarding_v2",
  "mldz_creator_onboarding_v2_2",
  "mldz_creator_onboarding_v2_1"
];

const STATUS_STEPS: StatusStep[] = [
  {
    key: "Submitted",
    label: "Application submitted",
    desc: "We received your creator onboarding details."
  },
  {
    key: "UnderReview",
    label: "Under review",
    desc: "Our team is checking your profile, samples, KYC and payout readiness."
  },
  {
    key: "SendBack",
    label: "Action required",
    desc: "We need a few updates. Please fix items and resubmit."
  },
  {
    key: "Resubmitted",
    label: "Back in review",
    desc: "We are verifying your updates."
  },
  {
    key: "Approved",
    label: "Approved",
    desc: "Creator tools are unlocked. Welcome to Creator Studio."
  }
];

function mapApprovalStatus(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "SendBack";
  if (normalized === "resubmitted") return "Resubmitted";
  if (normalized === "in_review") return "UnderReview";
  return "Submitted";
}

interface Toast {
  id: string;
  message: string;
  tone: "default" | "success" | "error";
}

interface StatusStep {
  key: string;
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

function cx(...xs: (string | boolean | undefined | null)[]): string {
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

function formatEta(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `~${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `~${h}h ${r}m` : `~${h}h`;
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (message: string, tone: "default" | "success" | "error" = "default") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
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
                t.tone === "success"
                  ? "bg-emerald-500"
                  : t.tone === "error"
                    ? "bg-rose-500"
                    : "bg-amber-500"
              )}
            />
            <div className="text-slate-700 dark:text-slate-200">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">{title}</div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
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

function StepRow({ index, currentIndex, label, desc }: { index: number; currentIndex: number; label: string; desc: string }) {
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
              ? "bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400"
              : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
        )}
      >
        {isDone ? <Check className="h-4 w-4" /> : isActive ? <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> : <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />}
      </span>

      <div className="flex items-center justify-between gap-2">
        <div className={cx("text-base font-semibold", isActive ? "text-emerald-900 dark:text-emerald-50" : "text-slate-900 dark:text-slate-50")}>{label}</div>
        {isActive ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">CURRENT</span>
        ) : null}
      </div>
      <div className={cx("text-sm", isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400")}>{desc}</div>
    </li>
  );
}

function Pill({ icon, text, tone = "default" }: { icon: React.ReactNode; text: string; tone?: "good" | "warn" | "default" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-bold shadow-sm transition-colors",
        tone === "good"
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
          : tone === "warn"
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400"
            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      )}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function Button({ children, onClick, variant = "secondary", disabled = false, className }: { children: React.ReactNode; onClick: () => void; variant?: "primary" | "dark" | "secondary"; disabled?: boolean; className?: string }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-base font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  const styles =
    variant === "primary"
      ? "bg-[#f77f00] text-white hover:bg-[#e26f00]"
      : variant === "dark"
        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white"
        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700";

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cx(base, styles, className)}
    >
      {children}
    </button>
  );
}

function UploadDropzone({ files, setFiles, toast }: { files: File[]; setFiles: React.Dispatch<React.SetStateAction<File[]>>; toast: (msg: string, tone?: "success" | "error") => void }) {
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
    if (e.target.files) {
      addFiles(e.target.files);
    }
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
          if (e.dataTransfer?.files) {
            addFiles(e.dataTransfer.files);
          }
        }}
        className={cx(
          "rounded-2xl border-2 border-dashed p-5 text-center transition",
          dnd ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20" : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
        )}
      >
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">Drag and drop updated samples or documents</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">PDF, JPG, PNG, WEBP, video. Max 20 MB each.</div>
        <div className="mt-3">
          <Button
            onClick={() => inputRef.current?.click()}
            variant="secondary"
          >
            <Upload className="h-4 w-4" /> Choose files
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
        <ul className="border border-slate-200 bg-white rounded-2xl overflow-hidden">
          {files.map((f, i) => (
            <li key={`${f.name}_${i}`} className="px-3 py-2 flex items-center justify-between gap-3 border-b last:border-b-0">
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

interface OnboardingData {
  profile?: {
    name?: string;
    handle?: string;
  };
  kyc?: {
    idUploaded?: boolean;
    selfieUploaded?: boolean;
  };
  preferences?: {
    lines?: string[];
  };
}

export default function CreatorAwaitingApprovalPremium() {
  const { toasts, push } = useToasts();
  const navigate = useNavigate();
  const [apiOnboarding, setApiOnboarding] = useState<OnboardingData | null>(null);

  const qp = useMemo<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    return Object.fromEntries(new URLSearchParams(window.location.search).entries());
  }, []);

  // Pull onboarding summary if available
  const onboarding = useMemo<OnboardingData | null>(() => {
    if (apiOnboarding) return apiOnboarding;
    if (typeof window === "undefined") return null;
    for (const k of ONBOARDING_KEYS_TO_TRY) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = safeJsonParse<OnboardingData | null>(raw, null);
        if (parsed && typeof parsed === "object") return parsed;
      }
    }
    return null;
  }, [apiOnboarding]);

  const displayName =
    qp.name || onboarding?.profile?.name || localStorage.getItem("creatorOnb.name") || "New Creator";

  const creatorHandle = qp.handle || onboarding?.profile?.handle || "";

  const creatorId =
    qp.creatorId || localStorage.getItem("creatorOnb.id") || "pending";

  const primaryLine =
    qp.niche || onboarding?.preferences?.lines?.[0] || localStorage.getItem("creatorOnb.niche") || "Not set";

  // status
  const [status, setStatus] = useState<string>(() => {
    if (typeof window === "undefined") return "UnderReview";
    return qp.status || localStorage.getItem(STORAGE_STATUS_KEY) || "UnderReview";
  });

  const [etaMin, setEtaMin] = useState(() => {
    const v = Number(qp.etaMin || localStorage.getItem("creatorOnb.etaMin") || 90);
    return Number.isFinite(v) ? v : 90;
  });

  const [submittedAt] = useState(() => {
    if (typeof window === "undefined") return nowIso();
    return localStorage.getItem("creatorOnb.submittedAt") || nowIso();
  });

  // Admin feedback and checklist (used for SendBack)
  const [adminReason, setAdminReason] = useState(() => {
    return qp.reason || localStorage.getItem("creatorOnb.adminReason") || "";
  });

  const [adminDocs, setAdminDocs] = useState<AdminDoc[]>(() => {
    if (typeof window === "undefined") return [];
    return safeJsonParse<AdminDoc[]>(localStorage.getItem("creatorOnb.adminDocs") || "[]", []);
  });

  const [items, setItems] = useState<ChecklistItem[]>(() => {
    if (typeof window === "undefined") return [];
    const cached = safeJsonParse<ChecklistItem[]>(localStorage.getItem("creatorOnb.items") || "[]", []);
    if (Array.isArray(cached) && cached.length) return cached;

    const itemsFromQ = (qp.items || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((t, i) => ({ id: `item-${i}`, text: t, done: false }));

    return itemsFromQ;
  });

  const [newItem, setNewItem] = useState("");
  const [note, setNote] = useState(() => localStorage.getItem("creatorOnb.note") || "");
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState("");

  const [prefEmail, setPrefEmail] = useState(true);
  const [prefInApp, setPrefInApp] = useState(true);

  const [showSubmission, setShowSubmission] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([creatorApi.onboarding(), creatorApi.accountApproval()])
      .then(([onboardingPayload, approval]) => {
        if (cancelled) return;
        const creatorForm =
          onboardingPayload &&
          typeof onboardingPayload === "object" &&
          (onboardingPayload as { metadata?: { creatorForm?: OnboardingData } }).metadata?.creatorForm
            ? (onboardingPayload as { metadata: { creatorForm: OnboardingData } }).metadata.creatorForm
            : null;
        if (creatorForm) {
          setApiOnboarding(creatorForm);
        }
        setStatus(mapApprovalStatus(approval.status));
        if (approval.submittedAt) {
          localStorage.setItem("creatorOnb.submittedAt", approval.submittedAt);
        }
        if (Array.isArray(approval.requiredActions) && approval.requiredActions.length > 0) {
          setItems(
            approval.requiredActions.map((item, index) => ({
              id: String(item.id || `item-${index}`),
              text: String(item.label || item.description || `Action ${index + 1}`),
              done: Boolean(item.completed)
            }))
          );
        }
        if (Array.isArray(approval.documents) && approval.documents.length > 0) {
          setAdminDocs(
            approval.documents.map((doc, index) => ({
              name: String(doc.type || `Document ${index + 1}`),
              url: "#",
              type: String(doc.status || "file")
            }))
          );
        }
        const metadata = approval.metadata && typeof approval.metadata === "object" ? approval.metadata : {};
        if (typeof (metadata as { note?: unknown }).note === "string") {
          setNote((metadata as { note: string }).note);
        }
        if (typeof approval.reviewNotes === "string" && approval.reviewNotes.trim()) {
          setAdminReason(approval.reviewNotes);
        }
        if (mapApprovalStatus(approval.status) === "Approved") {
          push("Approved. Opening your creator workspace.", "success");
          navigate("/auth", { replace: true });
        }
      })
      .catch(() => {
        // local fallback remains active
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentIndex = useMemo(() => {
    const map: Record<string, number> = {
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
        "Please refine your profile bio, upload at least 3 sample videos or images, and confirm the categories you will create for."
      );
    }

    if (!items.length) {
      setItems([
        { id: "item-1", text: "Refine your profile bio to clearly describe your content style", done: false },
        { id: "item-2", text: "Upload at least 3 sample contents (video or image)", done: false },
        { id: "item-3", text: "Confirm your primary content categories and regions", done: false }
      ]);
    }

    if (!adminDocs.length) {
      setAdminDocs([{ name: "Creator guidelines (PDF)", url: "#", type: "pdf" }]);
    }
  }, [status, adminReason, items.length, adminDocs.length]);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_STATUS_KEY, status);
      localStorage.setItem("creatorOnb.etaMin", String(etaMin));
      localStorage.setItem("creatorOnb.submittedAt", submittedAt);
      localStorage.setItem("creatorOnb.adminReason", adminReason || "");
      localStorage.setItem("creatorOnb.adminDocs", JSON.stringify(adminDocs || []));
      localStorage.setItem("creatorOnb.items", JSON.stringify(items || []));
      localStorage.setItem("creatorOnb.note", note || "");
      localStorage.setItem(
        STORAGE_DRAFT_KEY,
        JSON.stringify({ adminReason, adminDocs, items, note })
      );
    } catch {
      // ignore
    }
  }, [status, etaMin, submittedAt, adminReason, adminDocs, items, note]);

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

  async function refreshStatus() {
    setRefreshing(true);
    setNotice("");
    push("Refreshing status...", "success");

    try {
      const approval = await creatorApi.refreshAccountApproval();
      const nextStatus = mapApprovalStatus(approval.status);
      setStatus(nextStatus);
      if (typeof approval.reviewNotes === "string" && approval.reviewNotes.trim()) {
        setAdminReason(approval.reviewNotes);
      }
      if (nextStatus === "Approved") {
        push("Approved. Creator tools are unlocked.", "success");
        navigate("/auth", { replace: true });
      } else if (nextStatus === "SendBack") {
        push("Action required. Please review admin feedback.", "error");
      } else {
        push("Status is up to date.", "success");
      }
    } catch {
      push("Unable to refresh approval status right now.", "error");
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
    try {
      const approval = await creatorApi.resubmitAccountApproval({
        status: "resubmitted",
        reviewNotes: adminReason || note,
        requiredActions: items.map((item) => ({
          id: item.id,
          label: item.text,
          completed: item.done
        })),
        documents: [
          ...adminDocs.map((doc, index) => ({
            id: `doc-${index}`,
            type: doc.name,
            status: doc.type
          })),
          ...files.map((file, index) => ({
            id: `upload-${index}`,
            type: file.name,
            status: "uploaded"
          }))
        ],
        metadata: {
          note,
          attachments: files.map((file) => file.name)
        }
      });

      setStatus(mapApprovalStatus(approval.status));
      setEtaMin(60);
      setFiles([]);
      push("Resubmitted. Back in review.", "success");
    } catch {
      push("Could not resubmit updates right now.", "error");
    }
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
      ? "Approved. Welcome to Creator Studio"
      : status === "SendBack"
        ? "Action required before approval"
        : "Thanks, your creator onboarding is submitted";

  const heroDesc =
    status === "Approved"
      ? "Your creator tools are now unlocked. Start pitching, scheduling and going live."
      : status === "SendBack"
        ? "Please address the requested updates, attach changes, and resubmit for review."
        : "We are reviewing your application. You will get updates here and by email.";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors">
      <ToastStack toasts={toasts} />

      <Modal
        open={showSubmission}
        title="Submitted onboarding snapshot"
        onClose={() => setShowSubmission(false)}
      >
        <div className="text-[12px] text-slate-600 dark:text-slate-400">
          This preview is loaded from the backend when available, with local draft fallback if the API is offline.
        </div>
        <pre className="mt-3 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 overflow-auto max-h-[420px] text-slate-700 dark:text-slate-300">
          {JSON.stringify(onboarding || { note: "No onboarding data found" }, null, 2)}
        </pre>
      </Modal>

      <Modal
        open={showSupport}
        title="Contact support"
        onClose={() => setShowSupport(false)}
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">Fast options</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="dark"
                onClick={() => {
                  push("Support chat opened.", "success");
                  setShowSupport(false);
                }}
              >
                <MessageCircle className="h-4 w-4" /> Live chat
              </Button>
              <Button
                onClick={() => {
                  push("Email draft created.", "success");
                  setShowSupport(false);
                }}
              >
                <Mail className="h-4 w-4" /> Email support
              </Button>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Include your Creator ID: <span className="font-mono text-slate-700 dark:text-slate-300">{creatorId}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">What to mention</div>
            <ul className="mt-2 list-disc pl-5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <li>Status: {status}</li>
              <li>Submitted: {new Date(submittedAt).toLocaleString()}</li>
              <li>Primary line: {primaryLine}</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <header className="border-b border-orange-100 dark:border-orange-950 bg-white/80 dark:bg-slate-950/80 backdrop-blur shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:shadow-none">
        <div className="w-full px-4 md:px-8 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white break-words">{heroTitle}</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">{heroDesc}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill icon={<Clock className="h-4 w-4" />} text={`ETA ${formatEta(etaMin)}`} tone={status === "Approved" ? "good" : status === "SendBack" ? "warn" : "default"} />
                <Pill icon={<CalendarClock className="h-4 w-4" />} text={`Submitted ${new Date(submittedAt).toLocaleDateString()}`} />
                {status === "Approved" ? <Pill icon={<BadgeCheck className="h-4 w-4" />} text="Creator tools unlocked" tone="good" /> : null}
                {status === "SendBack" ? <Pill icon={<CircleAlert className="h-4 w-4" />} text="Action required" tone="warn" /> : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={useTheme().toggleTheme}
              className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {useTheme().theme === "light" ? "🌙" : "☀️"}
            </button>
            <Button onClick={() => setShowSupport(true)}>
              <HelpCircle className="h-4 w-4" /> Support
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                push("Returning to landing page.", "success");
                navigate("/");
              }}
            >
              Back to Dashboard <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="dark"
              onClick={() => {
                push("Refreshing your account session...", "success");
                navigate("/auth");
              }}
            >
              Go to Sign In <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 md:px-8 py-8 space-y-6">
        {/* Summary */}
        <section className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="h-20 w-20 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              <span className="text-[24px] font-black" style={{ color: ORANGE }}>
                {String(displayName || "C").charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight break-words">{displayName}</div>
                  <div className="text-lg font-bold text-slate-500 dark:text-slate-400 mt-0.5">{creatorHandle ? creatorHandle : "Creator"}</div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px] text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Creator ID:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{creatorId}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Primary line:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{primaryLine}</span>
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
                    <FileText className="h-4 w-4" /> View submission
                  </Button>
                  <Button
                    variant="dark"
                    onClick={() => {
                      push("Submission PDF generated.", "success");
                    }}
                  >
                    <ShieldCheck className="h-4 w-4" /> Download receipt
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4">
                <div className="space-y-3">
                  <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">Review progress</div>
                  <ol className="space-y-2">
                    {STATUS_STEPS.map((s, i) => (
                      <StepRow
                        key={s.key}
                        index={i}
                        currentIndex={currentIndex}
                        label={s.label}
                        desc={s.desc}
                      />
                    ))}
                  </ol>
                </div>

                <aside className="space-y-3">
                  <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 transition-all hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tracking-tight">Notifications</div>
                        <div className="text-[12px] text-slate-500 dark:text-slate-400 leading-tight">Get updates when status changes.</div>
                      </div>
                      <Bell className="h-5 w-5" style={{ color: ORANGE }} />
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
                      <Button
                        variant="primary"
                        onClick={refreshStatus}
                        disabled={refreshing}
                        className="w-full justify-center py-3"
                      >
                        {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refresh status
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tracking-tight">What we check</div>
                        <div className="text-[12px] text-slate-500 dark:text-slate-400 leading-tight">To protect creators, suppliers and buyers.</div>
                      </div>
                      <Lock className="h-5 w-5" style={{ color: GREEN }} />
                    </div>
                    <ul className="mt-5 list-disc pl-5 text-[12px] text-slate-600 dark:text-slate-300 space-y-2">
                      <li className="font-medium">Profile quality and niche clarity</li>
                      <li className="font-medium">KYC documents and selfie match</li>
                      <li className="font-medium">Payout method validity</li>
                      <li className="font-medium">Samples and content compliance</li>
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[12px] font-semibold text-white">While you wait</div>
                        <div className="text-[11px] text-slate-300">Boost your readiness for top campaigns.</div>
                      </div>
                      <Sparkles className="h-4 w-4" style={{ color: ORANGE }} />
                    </div>
                    <div className="mt-3 space-y-2">
                      <MiniAction
                        icon={<Rocket className="h-4 w-4" />}
                        title="Prepare your first Live Sessionz plan"
                        desc="Outline your intro, demo, FAQs and offer timing."
                        onClick={() => push("Live plan template opened.", "success")}
                      />
                      <MiniAction
                        icon={<ShieldCheck className="h-4 w-4" />}
                        title="Review creator guidelines"
                        desc="Avoid delays by meeting content rules."
                        onClick={() => push("Guidelines opened.", "success")}
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
                <div className="text-[14px] font-semibold text-emerald-900 dark:text-emerald-50">You are approved</div>
                <div className="text-[12px] text-emerald-800 dark:text-emerald-400">
                  You can now access Live Sessionz Studio, Shoppable Adz, Campaigns Board and Earnings.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    push("Opening Creator Home.", "success");
                    navigate("/home");
                  }}
                >
                  Open Creator Home <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => push("Opening Live Studio.", "success")}
                >
                  Open Live Studio
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
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900 text-orange-800 dark:text-orange-400">REVIEW NEEDED</span>
            </div>

            <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-[12px] font-semibold text-orange-900 dark:text-orange-100">Admin feedback</div>
              <div className="mt-1 text-[12px] text-orange-800 dark:text-orange-300">{adminReason}</div>

              {adminDocs.length ? (
                <div className="mt-3">
                  <div className="text-[11px] font-semibold text-orange-900 dark:text-orange-100">Reference documents</div>
                  <ul className="mt-2 space-y-2">
                    {adminDocs.map((d, i) => (
                      <li key={`${d.name}_${i}`} className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-900/40 px-3 py-2">
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
                  className="rounded-2xl border border-orange-200 bg-white px-3 py-2 text-[12px] h-24 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <UploadDropzone files={files} setFiles={setFiles} toast={push} />

              {notice ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-[12px]">{notice}</div>
              ) : null}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <Button onClick={clearDraft}>Clear draft</Button>
                <Button variant="primary" onClick={resubmit} disabled={!canResubmit}>
                  Resubmit application
                </Button>
              </div>

              <div className="text-[11px] text-orange-700">
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
              <div className="text-[12px] text-slate-600 dark:text-slate-400">If the review takes longer than expected, contact Creator Success with your Creator ID.</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => setShowSupport(true)}>
                <HelpCircle className="h-4 w-4" /> Contact support
              </Button>
              <Button
                variant="dark"
                onClick={() => {
                  push("Creator Success message sent.", "success");
                }}
              >
                <Mail className="h-4 w-4" /> Message Creator Success
              </Button>
            </div>
          </div>
        </section>

        <div className="text-[11px] text-slate-400">
          If you close this page, you can return any time. Your application status is saved. You will also get an email when your status changes.
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6">
        <div className="max-w-5xl mx-auto px-4 text-[12px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div>© {new Date().getFullYear()} MyLiveDealz. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              onClick={() => {
                push("Returning to landing page.", "success");
                navigate("/");
              }}
            >
              Go to dashboard
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <button
              type="button"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4"
              onClick={() => {
                push("Opening Sign In...", "success");
                navigate("/auth");
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
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
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300 ease-in-out shadow-md", checked ? "bg-white dark:bg-slate-900 left-6" : "bg-white left-0.5")} />
    </button>
  );
}

function MiniAction({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2"
    >
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
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
