import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SupplierPostLivePublisher.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: PostLivePublisher.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Sticky header with breadcrumbs + session meta + plan chip + quick actions
 * - Replay page review card (cover + replay url + publish controls + toggles)
 * - Clips section with list + export actions + clip builder modal
 * - Send replay section: channels + audience + scheduling + estimates + preview + performance snapshot
 * - Conversion boosters section
 * - Right rail: post-live preflight + quick actions
 *
 * Supplier adaptations (minimal, required):
 * - Copy and routing adjusted to Supplier context (/supplier/live/*)
 * - Adds “Execution mode” (Creator-hosted vs Supplier-hosted)
 * - Adds “Admin review required” gate (common supplier compliance)
 * - If Creator-hosted, supplier can: approve + request publish (task) in addition to submitting to admin
 *
 * Canvas-safe:
 * - No MUI, no lucide-react, no external contexts.
 * - Replace stubs with your store + real APIs.
 */

const ORANGE = "#f77f00";

const ROUTES = {
  liveDashboard: "/supplier/live/dashboard",
  liveSchedule: "/supplier/live/schedule",
  liveStudio: "/supplier/live/studio",
  audienceNotifications: "/supplier/live/audience-notifications",
  overlaysCtas: "/supplier/live/overlays-ctas-pro",
  postLive: "/supplier/live/post-live-publisher",
  assetLibrary: "/supplier/deliverables/assets",
};

/* ------------------------------ utils ------------------------------ */

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeNavTo(navigate, url) {
  if (!url) return;
  const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noreferrer");
    return;
  }
  navigate(target);
}

function parseSearch() {
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

function fmtInt(n) {
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function fmtLocal(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function safeCopy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/* ------------------------------ toast + async ------------------------------ */

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (message, tone = "info") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };
  return { toasts, push };
}

function ToastStack({ toasts }) {
  if (!toasts?.length) return null;
  return (
    <div className="fixed top-20 right-3 md:right-6 z-[120] flex flex-col gap-2 w-[min(420px,calc(100vw-24px))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-2xl border px-3 py-2 text-sm shadow-sm bg-white dark:bg-slate-900",
            t.tone === "success"
              ? "border-emerald-200 dark:border-emerald-800"
              : t.tone === "warn"
                ? "border-amber-200 dark:border-amber-800"
                : t.tone === "error"
                  ? "border-rose-200 dark:border-rose-800"
                  : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="flex items-start gap-2">
            <span
              className={cn(
                "mt-1.5 h-2 w-2 rounded-full",
                t.tone === "success"
                  ? "bg-emerald-500"
                  : t.tone === "warn"
                    ? "bg-amber-500"
                    : t.tone === "error"
                      ? "bg-rose-500"
                      : "bg-slate-400"
              )}
            />
            <div className="text-slate-700 dark:text-slate-200">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function useAsyncAction(toast) {
  const [isPending, setIsPending] = useState(false);
  const run = async (fn, { successMessage, errorMessage, tone } = {}) => {
    setIsPending(true);
    try {
      await fn();
      toast?.(successMessage || "Done", tone || "success");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast?.(errorMessage || "Something went wrong", "error");
    } finally {
      setIsPending(false);
    }
  };
  return { run, isPending };
}



/* ------------------------------ icons (inline) ------------------------------ */

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

const AlertTriangle = ({ className }) => (
  <Icon className={className}>
    <path d="M10.3 3.1 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.1a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
);

const BadgeCheck = ({ className }) => (
  <Icon className={className}>
    <path d="M12 2 9.8 3.6 7 4l-.4 2.7L5 9l1.6 2.3L7 14l2.8.4L12 16l2.2-1.6L17 14l.4-2.7L19 9l-1.6-2.3L17 4l-2.8-.4L12 2Z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);

const BarChart3 = ({ className }) => (
  <Icon className={className}>
    <path d="M3 3v18h18" />
    <path d="M7 14v5" />
    <path d="M12 10v9" />
    <path d="M17 6v13" />
  </Icon>
);

const CheckCircle2 = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l2.5 2.5L16 9" />
  </Icon>
);

const Copy = ({ className }) => (
  <Icon className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

const Download = ({ className }) => (
  <Icon className={className}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </Icon>
);

const ExternalLink = ({ className }) => (
  <Icon className={className}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M21 14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" />
  </Icon>
);

const Film = ({ className }) => (
  <Icon className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 4v16" />
    <path d="M17 4v16" />
    <path d="M2 8h5" />
    <path d="M2 16h5" />
    <path d="M17 8h5" />
    <path d="M17 16h5" />
  </Icon>
);

const Info = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6" />
    <path d="M12 7h.01" />
  </Icon>
);

const Lock = ({ className }) => (
  <Icon className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

const MessageCircle = ({ className }) => (
  <Icon className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5A8.5 8.5 0 0 1 21 11v.5z" />
  </Icon>
);

const Phone = ({ className }) => (
  <Icon className={className}>
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 18h2" />
  </Icon>
);

const Plus = ({ className }) => (
  <Icon className={className}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);

const Scissors = ({ className }) => (
  <Icon className={className}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4 8.6 15.4" />
    <path d="M20 20 8.6 8.6" />
  </Icon>
);

const Send = ({ className }) => (
  <Icon className={className}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </Icon>
);

const Sparkles = ({ className }) => (
  <Icon className={className}>
    <path d="M12 2l1.2 3.7L17 7l-3.8 1.3L12 12l-1.2-3.7L7 7l3.8-1.3L12 2z" />
    <path d="M5 12l.6 1.8L7.5 14l-1.9.7L5 16.5l-.6-1.8L2.5 14l1.9-.7L5 12z" />
    <path d="M19 12l.6 1.8 1.9.2-1.5 1.2.5 1.9-1.5-1.1-1.6 1.1.6-1.9-1.6-1.2 2-.2L19 12z" />
  </Icon>
);

const Timer = ({ className }) => (
  <Icon className={className}>
    <path d="M10 2h4" />
    <path d="M12 14V8" />
    <circle cx="12" cy="14" r="8" />
  </Icon>
);

const Trash2 = ({ className }) => (
  <Icon className={className}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </Icon>
);

const X = ({ className }) => (
  <Icon className={className}>
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </Icon>
);

/* ------------------------------ UI atoms ------------------------------ */

function Pill({ tone = "neutral", children, title }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20"
        : tone === "bad"
          ? "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20"
          : tone === "pro"
            ? "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20"
            : "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold ring-1 whitespace-nowrap", cls)}>
      {children}
    </span>
  );
}

function Btn({
  tone = "neutral",
  children,
  onClick,
  disabled,
  left,
  title,
  loading,
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "text-white hover:brightness-95 shadow-sm"
      : tone === "danger"
        ? "bg-rose-600 text-white hover:brightness-95 shadow-sm"
        : tone === "ghost"
          ? "bg-transparent text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800"
          : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 shadow-sm";
  return (
    <button
      title={title}
      className={cn(base, cls)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      type="button"
    >
      {left}
      {children}
    </button>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => (!disabled ? onChange(!value) : undefined)}
      className={cn(
        "relative inline-flex h-5 w-10 sm:h-6 sm:w-11 items-center rounded-full transition",
        disabled ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed" : value ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-300 dark:bg-slate-700"
      )}
      aria-pressed={value}
    >
      <span className={cn("inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-sm transition", value ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

function Modal({ open, title, onClose, children, right }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative flex w-full max-w-4xl flex-col bg-white dark:bg-slate-900 shadow-2xl transition-all h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</div>
          <div className="flex items-center gap-2">
            {right}
            <Btn tone="ghost" onClick={onClose} left={<X className="h-4 w-4" />}>
              Close
            </Btn>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function MiniSparkline({ data }) {
  const w = 240;
  const h = 80;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / Math.max(1e-6, max - min)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full transition-colors">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-900 dark:text-slate-100" />
      <polyline points={`${pts} ${w},${h} 0,${h}`} fill="currentColor" opacity="0.08" className="text-slate-900 dark:text-slate-100" />
    </svg>
  );
}

/* ------------------------------ page ------------------------------ */

export default function SupplierPostLivePublisherPage() {
  const navigate = useNavigate();
  const safeNav = (url) => safeNavTo(navigate, url);
  const { toasts, push } = useToasts();
  const { run, isPending } = useAsyncAction((m, t) => push(m, t));

  const sp = useMemo(() => parseSearch(), []);
  const sessionId = sp.get("sessionId") ?? "LS-20418";

  const [plan, setPlan] = useState("Pro");
  const isPro = plan === "Pro";

  // Supplier role awareness
  const [executionMode, setExecutionMode] = useState("creator_hosted"); // creator_hosted | supplier_hosted
  const [adminReviewRequired, setAdminReviewRequired] = useState(true);

  const session = useMemo(
    () => ({
      id: sessionId,
      title: "Autumn Beauty Flash",
      status: "Ended",
      endedISO: new Date(Date.now() - 33 * 60 * 1000).toISOString(),
      replayUrl: `https://mylivedealz.com/replay/${sessionId}`,
      coverUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=70",
    }),
    [sessionId]
  );

  // Replay publish & approvals
  const [published, setPublished] = useState(false);
  const [schedulePublish, setSchedulePublish] = useState(false);
  const [publishAt, setPublishAt] = useState(() => new Date(Date.now() + 30 * 60 * 1000).toISOString());
  const [allowComments, setAllowComments] = useState(true);
  const [showProductStrip, setShowProductStrip] = useState(true);

  const [supplierApproved, setSupplierApproved] = useState(executionMode === "supplier_hosted");
  const [submittedToAdmin, setSubmittedToAdmin] = useState(false);
  const [adminApproved, setAdminApproved] = useState(false);
  const [adminRejected, setAdminRejected] = useState(false);
  const [creatorPublishRequested, setCreatorPublishRequested] = useState(false);

  useEffect(() => {
    // keep a sensible default when switching mode
    if (executionMode === "supplier_hosted") {
      setSupplierApproved(true);
      setCreatorPublishRequested(false);
    } else {
      setSupplierApproved(false);
    }
  }, [executionMode]);

  const publishBlocked = (schedulePublish && !publishAt) || isPending;

  // Clips
  const [clips, setClips] = useState([
    { id: "c1", title: "GlowUp Bundle – Key benefits", startSec: 140, endSec: 210, format: "9:16", status: "Exported" },
    { id: "c2", title: "Price drop moment", startSec: 520, endSec: 560, format: "9:16", status: "Queued" },
    { id: "c3", title: "Buyer Q&A – shipping", startSec: 760, endSec: 840, format: "16:9", status: "Draft" },
  ]);

  const [clipModal, setClipModal] = useState(false);
  const [clipTitle, setClipTitle] = useState("");
  const [clipStart, setClipStart] = useState(120);
  const [clipEnd, setClipEnd] = useState(160);
  const [clipFormat, setClipFormat] = useState("9:16");

  const addClip = () => {
    const title = clipTitle.trim() || "New clip";
    const id = `c_${Math.random().toString(16).slice(2)}`;
    setClips((s) => [
      {
        id,
        title,
        startSec: Math.min(clipStart, clipEnd - 1),
        endSec: Math.max(clipEnd, clipStart + 1),
        format: clipFormat,
        status: "Draft",
      },
      ...s,
    ]);
    setClipModal(false);
    setClipTitle("");
    push("Clip created", "success");
  };

  // Channels
  const channels = useMemo(
    () => [
      { key: "whatsapp", name: "WhatsApp", short: "WA", connected: "Connected", supportsRich: true, costPerMessageUSD: 0.002 },
      { key: "telegram", name: "Telegram", short: "TG", connected: "Connected", supportsRich: true, costPerMessageUSD: 0.0 },
      { key: "line", name: "LINE", short: "LINE", connected: "Needs re-auth", supportsRich: true, costPerMessageUSD: 0.003 },
      { key: "viber", name: "Viber", short: "Viber", connected: "Connected", supportsRich: false, costPerMessageUSD: 0.0015 },
      { key: "rcs", name: "RCS", short: "RCS", connected: "Connected", supportsRich: false, costPerMessageUSD: 0.008 },
    ],
    []
  );

  const [enabledChannels, setEnabledChannels] = useState({
    whatsapp: true,
    telegram: true,
    line: false,
    viber: false,
    rcs: false,
  });

  const [audience, setAudience] = useState("past_buyers");
  const [scheduleSends, setScheduleSends] = useState(true);
  const [sendNow, setSendNow] = useState(false);
  const [templatePack, setTemplatePack] = useState("Default");

  // Supplier add-on: request creator amplification if creator-hosted
  const [requestCreatorAmplify, setRequestCreatorAmplify] = useState(executionMode === "creator_hosted");

  useEffect(() => {
    setRequestCreatorAmplify(executionMode === "creator_hosted");
  }, [executionMode]);

  // Booster toggles
  const [cartRecovery, setCartRecovery] = useState(true);
  const [priceDrop, setPriceDrop] = useState(false);
  const [restock, setRestock] = useState(true);

  const metrics = useMemo(
    () => ({
      viewers: 18420,
      clicks: 3120,
      orders: 284,
      gmv: 9210,
      addToCart: 740,
      cartAbandon: 310,
      ctr: 0.169,
      conv: 0.091,
      ordersSeries: [4, 6, 8, 10, 9, 12, 15, 14, 18, 17, 16, 19, 21, 18, 16],
    }),
    []
  );

  const enabledChannelList = useMemo(() => channels.filter((c) => enabledChannels[c.key]), [channels, enabledChannels]);

  const estimatedReach = useMemo(() => {
    return audience === "past_buyers" ? 3400 : audience === "attendees" ? 5200 : audience === "vip_list" ? 420 : 1800;
  }, [audience]);

  const estimatedCost = useMemo(() => {
    const costPer = enabledChannelList.reduce((sum, c) => sum + c.costPerMessageUSD, 0);
    return estimatedReach * costPer;
  }, [estimatedReach, enabledChannelList]);

  const preflight = useMemo(() => {
    const checks = [
      { label: "Replay cover + title ready", ok: true },
      { label: "At least 1 clip selected (optional)", ok: clips.length >= 1, detail: clips.length ? `${clips.length} clip(s)` : "None" },
      {
        label: "Messaging channels connected",
        ok: enabledChannelList.every((c) => c.connected === "Connected"),
        detail: enabledChannelList.some((c) => c.connected !== "Connected") ? "Reconnect required" : undefined,
      },
      {
        label: "Approval path clear",
        ok: !adminReviewRequired || adminApproved || submittedToAdmin,
        detail: adminReviewRequired ? (adminApproved ? "Admin approved" : submittedToAdmin ? "Pending admin review" : "Not submitted") : "No admin review",
      },
    ];
    return checks;
  }, [clips.length, enabledChannelList, adminReviewRequired, adminApproved, submittedToAdmin]);

  const ready = preflight.every((x) => x.ok);

  const publishPill = useMemo(() => {
    if (published) return { tone: "good", label: "Published" };
    if (adminRejected) return { tone: "bad", label: "Admin rejected" };
    if (adminReviewRequired && submittedToAdmin && !adminApproved) return { tone: "warn", label: "Pending admin" };
    if (executionMode === "creator_hosted" && creatorPublishRequested) return { tone: "warn", label: "Creator requested" };
    return { tone: "warn", label: "Not published" };
  }, [published, adminRejected, adminReviewRequired, submittedToAdmin, adminApproved, executionMode, creatorPublishRequested]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
        <div className="w-full px-[0.55%] py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                <button className="hover:text-slate-700 dark:hover:text-slate-200" onClick={() => safeNav(ROUTES.liveDashboard)}>
                  Supplier Live Pro
                </button>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-slate-900 dark:text-slate-200">Post‑Live Publisher</span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="truncate text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{session.title}</div>
                <div className="flex items-center gap-1.5">
                  <Pill tone="neutral">
                    <Timer className="h-3.5 w-3.5" />
                    {session.status}
                  </Pill>
                  <Pill tone="neutral">
                    <Film className="h-3.5 w-3.5" />
                    Replay
                  </Pill>
                  <Pill tone={isPro ? "pro" : "neutral"}>
                    {isPro ? <BadgeCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {plan}
                  </Pill>
                  <Pill tone={executionMode === "supplier_hosted" ? "good" : "pro"} title="Who hosted the live session">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {executionMode === "supplier_hosted" ? "Supplier-hosted" : "Creator-hosted"}
                  </Pill>
                </div>
              </div>

              <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                Ended <span className="font-semibold text-slate-900 dark:text-slate-200">{fmtLocal(session.endedISO)}</span> • Replay URL{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-200">{session.replayUrl}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                onClick={() => setPlan((p) => (p === "Pro" ? "Standard" : "Pro"))}
                title="Demo: toggle plan"
                type="button"
              >
                <Sparkles className="h-4 w-4" />
                Plan: {plan}
              </button>

              <button
                className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                onClick={() => setExecutionMode((m) => (m === "creator_hosted" ? "supplier_hosted" : "creator_hosted"))}
                title="Demo: switch execution mode"
                type="button"
              >
                <BadgeCheck className="h-4 w-4" />
                Mode: {executionMode === "creator_hosted" ? "Creator-hosted" : "Supplier-hosted"}
              </button>

              <div className="hidden sm:block">
                <Btn
                  tone="ghost"
                  onClick={async () => {
                    const ok = await safeCopy(session.replayUrl);
                    push(ok ? "Replay link copied" : "Copy failed", ok ? "success" : "error");
                  }}
                  left={<Copy className="h-4 w-4" />}
                >
                  Copy replay link
                </Btn>
              </div>

              <Btn tone="neutral" onClick={() => push("Preview replay page", "info")} left={<ExternalLink className="h-4 w-4" />}>
                Preview
              </Btn>

              <Btn
                tone="primary"
                disabled={publishBlocked}
                loading={isPending}
                onClick={() =>
                  run(
                    async () => {
                      if (published) return;
                      // Supplier workflow:
                      // - If admin review required: submit to admin.
                      // - If creator-hosted: supplier may also request creator to publish (task).
                      if (adminReviewRequired) {
                        setSubmittedToAdmin(true);
                        setAdminRejected(false);
                        setAdminApproved(false);
                        // demo: admin approves shortly after
                        await new Promise((r) => setTimeout(r, 450));
                        setAdminApproved(true);
                      }

                      if (executionMode === "creator_hosted") {
                        setSupplierApproved(true);
                        setCreatorPublishRequested(true);
                        // demo: creator publishes shortly after
                        await new Promise((r) => setTimeout(r, 350));
                      }

                      setPublished(true);
                    },
                    { successMessage: adminReviewRequired ? "Replay approved and published" : "Replay published" }
                  )
                }
                left={<CheckCircle2 className="h-4 w-4" />}
              >
                {isPending ? "Publishing..." : adminReviewRequired ? "Approve & Publish" : "Publish"}
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full px-[0.55%] py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-7 space-y-4">
            {/* Replay page review */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Replay page</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Review how the replay appears to buyers, then publish.</div>
                </div>
                <Pill tone={publishPill.tone}>
                  {publishPill.tone === "good" ? <CheckCircle2 className="h-3.5 w-3.5" /> : publishPill.tone === "bad" ? <AlertTriangle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {publishPill.label}
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-5">
                  <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
                    <img src={session.coverUrl} alt="Replay cover" className="aspect-[4/3] w-full object-cover" />
                  </div>
                  <div className="mt-2 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">Replay URL</div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{session.replayUrl}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn
                        tone="neutral"
                        onClick={async () => {
                          const ok = await safeCopy(session.replayUrl);
                          push(ok ? "Copied replay URL" : "Copy failed", ok ? "success" : "error");
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy
                      </Btn>
                      <Btn tone="ghost" onClick={() => push("Open replay", "info")} left={<ExternalLink className="h-4 w-4" />}>
                        Open
                      </Btn>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-3">
                  <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Publish controls</div>
                      <Pill tone={isPro ? "pro" : "neutral"}>
                        {isPro ? <BadgeCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        Pro
                      </Pill>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Publish replay page</div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Make the replay page visible to buyers.</div>
                        </div>
                        <Toggle value={published} onChange={setPublished} />
                      </div>

                      {/* Supplier compliance: admin review gate */}
                      <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Admin review required</div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Recommended for compliance and marketplace safety.</div>
                        </div>
                        <Toggle value={adminReviewRequired} onChange={setAdminReviewRequired} />
                      </div>

                      <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Schedule publish</div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Publish later (best for timed drops).</div>
                        </div>
                        <Toggle value={schedulePublish} onChange={setSchedulePublish} disabled={!isPro} />
                      </div>

                      {schedulePublish ? (
                        <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">Publish at</div>
                          <input
                            type="datetime-local"
                            value={new Date(publishAt).toISOString().slice(0, 16)}
                            onChange={(e) => setPublishAt(new Date(e.target.value).toISOString())}
                            className="mt-2 w-full rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition"
                          />
                        </div>
                      ) : null}

                      {executionMode === "creator_hosted" ? (
                        <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Request creator publish</div>
                              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                Creates a task for the assigned creator to publish the replay and pin link.
                              </div>
                            </div>
                            <Toggle value={creatorPublishRequested} onChange={setCreatorPublishRequested} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Btn
                              tone="ghost"
                              onClick={() => {
                                setCreatorPublishRequested(true);
                                push("Creator publish requested", "success");
                              }}
                              left={<Send className="h-4 w-4" />}
                            >
                              Create request
                            </Btn>
                            <Btn
                              tone="ghost"
                              onClick={() => {
                                push("Open Asset Library to track approvals", "info");
                                safeNav(ROUTES.assetLibrary);
                              }}
                              left={<ExternalLink className="h-4 w-4" />}
                            >
                              Asset Library
                            </Btn>
                          </div>
                        </div>
                      ) : null}

                      {!isPro ? (
                        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400 transition">
                          <div className="font-semibold">Why locked</div>
                          <div className="mt-1">Scheduled publishing is Pro.</div>
                        </div>
                      ) : null}

                      {adminReviewRequired ? (
                        <div className="rounded-2xl bg-slate-900 dark:bg-black p-3 text-white transition">
                          <div className="text-[10px] text-white/60">Approval timeline</div>
                          <div className="mt-1 text-sm font-semibold">
                            {adminRejected
                              ? "Admin rejected. Resolve feedback and resubmit."
                              : adminApproved
                                ? "Admin approved. Safe to publish."
                                : submittedToAdmin
                                  ? "Submitted to Admin. Pending review."
                                  : "Not yet submitted."}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Btn
                              tone="ghost"
                              onClick={() => {
                                setSubmittedToAdmin(true);
                                setAdminRejected(false);
                                setAdminApproved(false);
                                push("Submitted to Admin", "success");
                              }}
                              left={<Send className="h-4 w-4" />}
                            >
                              Submit
                            </Btn>
                            <Btn
                              tone="ghost"
                              onClick={() => {
                                setAdminApproved(true);
                                setAdminRejected(false);
                                push("Admin approved", "success");
                              }}
                              left={<CheckCircle2 className="h-4 w-4" />}
                            >
                              Mark approved
                            </Btn>
                            <Btn
                              tone="danger"
                              onClick={() => {
                                setAdminRejected(true);
                                setAdminApproved(false);
                                push("Admin rejected", "warn");
                              }}
                              left={<AlertTriangle className="h-4 w-4" />}
                            >
                              Mark rejected
                            </Btn>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Comments</div>
                        <Toggle value={allowComments} onChange={setAllowComments} />
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Allow replay comments (where supported).</div>
                    </div>

                    <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Product strip</div>
                        <Toggle value={showProductStrip} onChange={setShowProductStrip} />
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Show featured items under replay.</div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400 transition">
                    <div className="font-semibold text-xs sm:text-sm">Rights reminder</div>
                    <div className="mt-1 text-xs">Only publish replays that contain licensed music/video and approved assets.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clips */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Clips</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Select moments and generate an export plan.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Btn tone="neutral" onClick={() => setClipModal(true)} left={<Plus className="h-4 w-4" />}>
                    New clip
                  </Btn>
                  <Btn
                    tone="ghost"
                    onClick={() => push("Auto highlights", "info")}
                    left={<Sparkles className="h-4 w-4" />}
                    disabled={!isPro}
                    title={!isPro ? "Pro required" : ""}
                  >
                    Auto highlights
                  </Btn>
                </div>
              </div>

              {!isPro ? (
                <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400 transition">
                  <div className="font-semibold">Why locked</div>
                  <div className="mt-1">Auto highlight extraction is Pro.</div>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-2">
                {clips.map((c) => (
                  <div key={c.id} className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{c.title}</div>
                          <Pill tone="neutral">
                            <Scissors className="h-3.5 w-3.5" />
                            {c.format}
                          </Pill>
                          <Pill tone={c.status === "Exported" ? "good" : c.status === "Queued" ? "warn" : "neutral"}>
                            {c.status === "Exported" ? <CheckCircle2 className="h-3.5 w-3.5" /> : c.status === "Queued" ? <Timer className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                            {c.status}
                          </Pill>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {c.startSec}s → {c.endSec}s ({Math.max(1, c.endSec - c.startSec)}s)
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Btn
                          tone="ghost"
                          onClick={() => {
                            setClips((s) => s.map((x) => (x.id === c.id ? { ...x, status: x.status === "Draft" ? "Queued" : x.status } : x)));
                            push("Queued export", "success");
                          }}
                          left={<Download className="h-4 w-4" />}
                          disabled={c.status !== "Draft"}
                        >
                          Export
                        </Btn>
                        <Btn
                          tone="ghost"
                          onClick={() => {
                            setClips((s) => s.filter((x) => x.id !== c.id));
                            push("Clip removed", "info");
                          }}
                          left={<Trash2 className="h-4 w-4" />}
                        >
                          Remove
                        </Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl bg-slate-900 dark:bg-black p-3 text-white transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-white/60">Export plan</div>
                    <div className="mt-1 text-sm font-semibold">Recommended: TikTok/Shorts/Reels (9:16), YouTube (16:9), Catalog (1:1).</div>
                  </div>
                  <Pill tone="pro">
                    <Lock className="h-3.5 w-3.5" />
                    Pro
                  </Pill>
                </div>
                <div className="mt-2 text-[10px] text-white/50">
                  Supplier note: exported clips should be tracked in Asset Library; creator-hosted campaigns may require supplier approval.
                </div>
              </div>
            </div>

            {/* Send replay */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Send replay</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Notify audiences that the replay is ready.</div>
                </div>
                <Pill tone="neutral">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Messaging
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-7 space-y-3">
                  <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-400">Channels</div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {channels.map((c) => (
                        <div key={c.key} className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{c.name}</div>
                              <Pill tone={c.connected === "Connected" ? "good" : c.connected === "Needs re-auth" ? "warn" : "bad"}>
                                {c.connected === "Connected" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                {c.connected}
                              </Pill>
                            </div>
                            <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">{c.supportsRich ? "Rich preview supported" : "Plain text only"}</div>
                          </div>
                          <Toggle value={enabledChannels[c.key]} onChange={(v) => setEnabledChannels((s) => ({ ...s, [c.key]: v }))} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">Audience</div>
                        <select
                          value={audience}
                          onChange={(e) => setAudience(e.target.value)}
                          className="mt-2 w-full rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition"
                        >
                          <option value="past_buyers">Past buyers</option>
                          <option value="attendees">Live attendees</option>
                          <option value="vip_list">VIP list</option>
                          <option value="category_interest">Segment by interest</option>
                        </select>
                      </label>

                      <label>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">Template pack</div>
                        <select
                          value={templatePack}
                          onChange={(e) => setTemplatePack(e.target.value)}
                          className="mt-2 w-full rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition"
                        >
                          <option>Default</option>
                          <option>VIP</option>
                          <option>High intent</option>
                        </select>
                      </label>
                    </div>

                    {executionMode === "creator_hosted" ? (
                      <div className="mt-3 flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Request creator amplification</div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Optional: create a task asking creator to send replay to their audience.</div>
                        </div>
                        <Toggle value={requestCreatorAmplify} onChange={setRequestCreatorAmplify} />
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Schedule sends</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">T+10m and T+2h recommended for best attendance & sales.</div>
                      </div>
                      <Toggle value={scheduleSends} onChange={setScheduleSends} />
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Send now</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Use sparingly to avoid spam penalties.</div>
                      </div>
                      <Toggle value={sendNow} onChange={setSendNow} />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">Estimated reach</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{fmtInt(estimatedReach)}</div>
                        {!isPro ? <div className="mt-1 text-[10px] text-amber-900/80 dark:text-amber-400/80">Why locked: estimates are Pro.</div> : null}
                      </div>
                      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">Estimated cost</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{isPro ? `$${estimatedCost.toFixed(2)}` : "—"}</div>
                        {!isPro ? <div className="mt-1 text-[10px] text-amber-900/80 dark:text-amber-400/80">Upgrade to Pro to view costs.</div> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Btn tone="neutral" onClick={() => push("Preview message", "info")} left={<Phone className="h-4 w-4" />}>
                      Preview
                    </Btn>
                    <Btn
                      tone="primary"
                      onClick={() =>
                        run(
                          async () => {
                            // demo
                            await new Promise((r) => setTimeout(r, 450));
                          },
                          {
                            successMessage:
                              `Replay notification queued to ${enabledChannelList.length} channel(s)` +
                              (executionMode === "creator_hosted" && requestCreatorAmplify ? " + creator request created" : ""),
                          }
                        )
                      }
                      disabled={enabledChannelList.length === 0 || isPending}
                      left={<Send className="h-4 w-4" />}
                      loading={isPending}
                    >
                      {isPending ? "Queuing..." : "Queue sends"}
                    </Btn>
                  </div>
                </div>

                <div className="md:col-span-5 space-y-3">
                  <div className="rounded-3xl bg-slate-900 dark:bg-black p-4 text-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-white/80">Message preview</div>
                        <div className="mt-1 text-sm font-semibold">Replay is ready — tap to continue shopping.</div>
                      </div>
                      <Pill tone="neutral">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Template
                      </Pill>
                    </div>
                    <div className="mt-3 rounded-2xl bg-white dark:bg-slate-900/10 p-3 text-sm">
                      🎬 Replay ready: <span className="font-semibold">{session.title}</span>
                      <br />
                      Tap to watch + shop: <span className="underline">{session.replayUrl}</span>
                    </div>
                    <div className="mt-3 text-[10px] text-white/50">In production: admin-approved template packs + compliance rules.</div>
                  </div>

                  <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Performance snapshot</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-xs text-slate-600 dark:text-slate-400">Viewers</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{fmtInt(metrics.viewers)}</div>
                      </div>
                      <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-xs text-slate-600 dark:text-slate-400">Orders</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{fmtInt(metrics.orders)}</div>
                      </div>
                      <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-xs text-slate-600 dark:text-slate-400">CTR</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{(metrics.ctr * 100).toFixed(1)}%</div>
                      </div>
                      <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-xs text-slate-600 dark:text-slate-400">GMV</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">${fmtInt(metrics.gmv)}</div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">Orders trend</div>
                        <Pill tone="neutral">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Sparkline
                        </Pill>
                      </div>
                      <div className="mt-2 text-slate-900 dark:text-slate-100">
                        <MiniSparkline data={metrics.ordersSeries} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion boosters */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Post‑live conversion boosters</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Recover carts and re-engage shoppers after the stream.</div>
                </div>
                <Pill tone={isPro ? "pro" : "neutral"}>
                  {isPro ? <BadgeCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  Premium
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Cart recovery</div>
                    <Toggle value={cartRecovery} onChange={setCartRecovery} />
                  </div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Remind users who added to cart but didn’t checkout.</div>
                  <div className="mt-2 text-[10px] font-semibold text-slate-700 dark:text-slate-500">Recommended: T+2h, T+24h</div>
                </div>

                <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Price‑drop messages</div>
                    <Toggle value={priceDrop} onChange={setPriceDrop} disabled={!isPro} />
                  </div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Notify watchers when you drop price post‑live.</div>
                  {!isPro ? <div className="mt-2 text-[10px] text-amber-900/80 dark:text-amber-400/80">Why locked: price-drop automation is Pro.</div> : null}
                </div>

                <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Restock alerts</div>
                    <Toggle value={restock} onChange={setRestock} />
                  </div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Alert users when sold-out items return.</div>
                  <div className="mt-2 text-[10px] font-semibold text-slate-700 dark:text-slate-500">Recommended: “Restocked” + “Last chance”</div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400 transition">
                <div className="font-semibold text-xs sm:text-sm">Compliance</div>
                <div className="mt-1 text-xs">Use admin-approved templates and respect channel frequency caps to avoid deliverability issues.</div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <Btn tone="ghost" onClick={() => push("Preview booster plan", "info")} left={<Phone className="h-4 w-4" />}>
                  Preview
                </Btn>
                <Btn
                  tone="primary"
                  onClick={() => run(async () => await new Promise((r) => setTimeout(r, 450)), { successMessage: "Booster plan saved" })}
                  left={<CheckCircle2 className="h-4 w-4" />}
                  loading={isPending}
                >
                  {isPending ? "Saving..." : "Save booster plan"}
                </Btn>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Post‑live preflight</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Recommended checks before publishing and sending.</div>
                </div>
                <Pill tone={ready ? "good" : "warn"}>
                  {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {ready ? "Ready" : "Review"}
                </Pill>
              </div>

              <div className="mt-3 space-y-2">
                {preflight.map((p) => (
                  <div key={p.label} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{p.label}</div>
                      {p.detail ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{p.detail}</div> : null}
                    </div>
                    <Pill tone={p.ok ? "good" : "warn"}>
                      {p.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {p.ok ? "OK" : "Fix"}
                    </Pill>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Quick actions</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <Btn tone="neutral" onClick={() => safeNav(ROUTES.liveSchedule)} left={<ExternalLink className="h-4 w-4" />}>
                  Open Live Schedule
                </Btn>
                <Btn tone="neutral" onClick={() => safeNav(ROUTES.audienceNotifications)} left={<ExternalLink className="h-4 w-4" />}>
                  Audience Notifications
                </Btn>
                <Btn tone="neutral" onClick={() => safeNav(ROUTES.overlaysCtas)} left={<ExternalLink className="h-4 w-4" />}>
                  Overlays & CTAs
                </Btn>
              </div>

              <div className="mt-3 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 text-[10px] sm:text-xs text-slate-700 dark:text-slate-400 transition">
                Tip: publish replay first, then send replay notifications and booster reminders in that order.
              </div>
            </div>
          </div>
        </div>

        {/* Clip modal */}
        <Modal
          open={clipModal}
          title="Create clip"
          onClose={() => setClipModal(false)}
          right={
            <Pill tone="neutral">
              <Scissors className="h-3.5 w-3.5" />
              Clip builder
            </Pill>
          }
        >
          <div className="space-y-4">
            <div className="rounded-3xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-4 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Clip details</div>

              <label className="mt-3 block">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Title</div>
                <input
                  value={clipTitle}
                  onChange={(e) => setClipTitle(e.target.value)}
                  placeholder="e.g., Price drop moment"
                  className="mt-2 w-full rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                />
              </label>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Format</div>
                  <select
                    value={clipFormat}
                    onChange={(e) => setClipFormat(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                  >
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </label>

                <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Duration</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{Math.max(1, Math.abs(clipEnd - clipStart))}s</div>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Start (sec)</div>
                  <input type="range" min={0} max={3600} value={clipStart} onChange={(e) => setClipStart(Number(e.target.value))} className="mt-2 w-full accent-[#f77f00]" />
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{clipStart}s</div>
                </div>
                <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">End (sec)</div>
                  <input type="range" min={1} max={3600} value={clipEnd} onChange={(e) => setClipEnd(Number(e.target.value))} className="mt-2 w-full accent-[#f77f00]" />
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{clipEnd}s</div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400">
                <div className="font-semibold">Publishing note</div>
                <div className="mt-1 text-xs">Clips should use licensed audio and approved visuals (same compliance as replay).</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Btn tone="ghost" onClick={() => setClipModal(false)}>
                Cancel
              </Btn>
              <Btn tone="primary" onClick={addClip} left={<Plus className="h-4 w-4" />}>
                Add clip
              </Btn>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierPostLivePublisherPage test failed: ${msg}`);
  };
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "ORANGE exists");
  assert(typeof fmtInt(1234) === "string", "fmtInt returns string");
  console.log("✅ SupplierPostLivePublisherPage self-tests passed");
}
