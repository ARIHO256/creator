import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SupplierStreamToPlatformsPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: StreamToPlatforms.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Sticky top header w/ breadcrumbs, status select, Pro toggle, Test Stream, Copy Link, Go Live
 * - Destinations grid: enable toggles + status badges + fix banners + advanced modal
 * - Upload estimate + recheck
 * - Live health monitor (master trend + degrade mode + per-destination health table)
 * - Output profile (orientation, quality, latency, adaptive bitrate, advanced sliders)
 * - Preflight checklist gating
 * - Recording & replay controls
 * - Premium Tailwind structure and spacing
 *
 * Supplier adaptations (minimal + required):
 * - Execution ownership: Supplier-hosted (direct control) vs Creator-hosted (request-only)
 * - In Creator-hosted mode, all platform actions become "requests" (no direct toggles/Go Live)
 * - Requests are logged locally and reflected as “Pending request” badges
 *
 * Canvas-safe:
 * - No lucide-react, no MUI.
 * - No app-context hooks. Local toast + async simulation.
 * - Navigation uses hash routing stubs.
 */

const ORANGE = "#f77f00";
const GREEN = "#03CD8C";

const ROUTES = {
  dealzMarketplace: "/supplier/overview/dealz-marketplace",
  liveDashboard: "/supplier/live/dashboard",
  liveStudio: "/supplier/live/studio",
  liveSchedule: "/supplier/live/schedule",
  safetyModeration: "/supplier/live/safety-moderation",
};

const cx = (...xs) => xs.filter(Boolean).join(" ");

function safeNavTo(navigate, url) {
  if (!url) return;
  const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noreferrer");
    return;
  }
  navigate(target);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

/* ------------------------------ Local async + toasts ------------------------------ */

function useAsyncAction() {
  const [isPending, setIsPending] = useState(false);
  const run = async (fn, opts = {}) => {
    const { delay = 900, loadingMessage, successMessage, errorMessage } = opts;
    try {
      setIsPending(true);
      if (loadingMessage) opts.onNotify?.(loadingMessage, "info");
      await new Promise((r) => setTimeout(r, delay));
      await fn?.();
      if (successMessage) opts.onNotify?.(successMessage, "success");
    } catch (e) {
      opts.onNotify?.(errorMessage || "Something went wrong", "error");
    } finally {
      setIsPending(false);
    }
  };
  return { run, isPending };
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (message, tone = "info") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
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
          className={cx(
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
              className={cx(
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



/* ------------------------------ Icons (inline SVG) ------------------------------ */

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

const Activity = ({ className }) => (
  <Icon className={className}>
    <path d="M22 12h-4l-3 7-4-14-3 7H2" />
  </Icon>
);

const AlertTriangle = ({ className }) => (
  <Icon className={className}>
    <path d="M10.3 3.1 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.1a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
);

const ArrowRight = ({ className }) => (
  <Icon className={className}>
    <path d="M5 12h14" />
    <path d="m13 5 7 7-7 7" />
  </Icon>
);

const CheckCircle2 = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l2.5 2.5L16 9" />
  </Icon>
);

const ChevronDown = ({ className }) => (
  <Icon className={className}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

const Copy = ({ className }) => (
  <Icon className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

const ExternalLink = ({ className }) => (
  <Icon className={className}>
    <path d="M14 3h7v7" />
    <path d="M10 14 21 3" />
    <path d="M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
  </Icon>
);

const Eye = ({ className }) => (
  <Icon className={className}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const Gauge = ({ className }) => (
  <Icon className={className}>
    <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="M20 13a8 8 0 1 0-16 0" />
    <path d="M12 10l4-4" />
  </Icon>
);

const Info = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6" />
    <path d="M12 7h.01" />
  </Icon>
);

const LinkIcon = ({ className }) => (
  <Icon className={className}>
    <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
    <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
  </Icon>
);

const Lock = ({ className }) => (
  <Icon className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

const MonitorPlay = ({ className }) => (
  <Icon className={className}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8" />
    <path d="M12 16v4" />
    <path d="M11 8l5 3-5 3V8Z" />
  </Icon>
);

const PlusCircle = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </Icon>
);

const RefreshCw = ({ className }) => (
  <Icon className={className}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v6h-6" />
  </Icon>
);

const Settings = ({ className }) => (
  <Icon className={className}>
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-1.4 3.4h-.2a2 2 0 0 1-1.7-1l-.1-.2a1.7 1.7 0 0 0-1.8-.8 1.7 1.7 0 0 0-1.3 1.3l-.1.2a2 2 0 0 1-3.4 0l-.1-.2a1.7 1.7 0 0 0-1.3-1.3 1.7 1.7 0 0 0-1.8.8l-.1.2a2 2 0 0 1-1.7 1h-.2a2 2 0 0 1-1.4-3.4l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.4-1l-.2-.1a2 2 0 0 1 0-3.4l.2-.1a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 5.6 3.6h.2a2 2 0 0 1 1.7 1l.1.2a1.7 1.7 0 0 0 1.8.8 1.7 1.7 0 0 0 1.3-1.3l.1-.2a2 2 0 0 1 3.4 0l.1.2a1.7 1.7 0 0 0 1.3 1.3 1.7 1.7 0 0 0 1.8-.8l.1-.2a2 2 0 0 1 1.7-1h.2a2 2 0 0 1 1.4 3.4l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1l.2.1a2 2 0 0 1 0 3.4l-.2.1a1.7 1.7 0 0 0-1.4 1Z" />
  </Icon>
);

const Signal = ({ className }) => (
  <Icon className={className}>
    <path d="M4 20V14" />
    <path d="M8 20V10" />
    <path d="M12 20V6" />
    <path d="M16 20V8" />
    <path d="M20 20V12" />
  </Icon>
);

const SlidersHorizontal = ({ className }) => (
  <Icon className={className}>
    <path d="M21 4H14" />
    <path d="M10 4H3" />
    <path d="M21 12H12" />
    <path d="M8 12H3" />
    <path d="M21 20H16" />
    <path d="M12 20H3" />
    <path d="M12 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
    <path d="M12 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
    <path d="M16 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
  </Icon>
);

const Timer = ({ className }) => (
  <Icon className={className}>
    <path d="M10 2h4" />
    <path d="M12 14V8" />
    <circle cx="12" cy="14" r="8" />
  </Icon>
);

const Video = ({ className }) => (
  <Icon className={className}>
    <path d="M14 8H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" />
    <path d="M16 10l4-2v8l-4-2" />
  </Icon>
);

const Wifi = ({ className }) => (
  <Icon className={className}>
    <path d="M5 12.5a10 10 0 0 1 14 0" />
    <path d="M8.5 16a6 6 0 0 1 7 0" />
    <path d="M12 19h.01" />
  </Icon>
);

const X = ({ className }) => (
  <Icon className={className}>
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </Icon>
);

const Zap = ({ className }) => (
  <Icon className={className}>
    <path d="M13 2 3 14h8l-1 8 11-14h-8l1-6Z" />
  </Icon>
);

/* ------------------------------ UI atoms (mirrored) ------------------------------ */

function Badge({ tone, children, title }) {
  const cls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20"
        : tone === "red"
          ? "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20"
          : tone === "blue"
            ? "bg-blue-50 text-blue-700 ring-slate-400/40 dark:ring-slate-500/50 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-slate-400/40 dark:ring-slate-500/50/20"
            : tone === "purple"
              ? "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20"
              : "bg-gray-50 dark:bg-slate-950 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";

  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-bold ring-1 whitespace-nowrap",
        cls
      )}
    >
      {children}
    </span>
  );
}

function Pill({ active, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      className={cx(
        "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[10px] sm:text-xs font-semibold transition active:scale-[0.98]",
        active
          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 ring-1 ring-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cx(
        "relative inline-flex h-5 w-10 sm:h-6 sm:w-11 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600",
        disabled ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-50" : "cursor-pointer",
        checked ? "bg-emerald-500 dark:bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
      )}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={cx(
          "inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-slate-900 dark:bg-slate-100 shadow transition",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}

function Tooltip({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span className="absolute left-1/2 top-full z-[140] mt-2 w-64 -translate-x-1/2 rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-md">
          {label}
        </span>
      ) : null}
    </span>
  );
}

function MiniLine({ values, tone = "orange" }) {
  const w = 140;
  const h = 42;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = (v) => {
    const t = max === min ? 0.5 : (v - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  };
  const pts = values
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
      const y = norm(v);
      return `${x},${y}`;
    })
    .join(" ");

  const stroke = tone === "green" ? GREEN : tone === "blue" ? "#2563eb" : tone === "neutral" ? "#475569" : ORANGE;

  return (
    <svg width={w} height={h} className="overflow-visible transition-colors">
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-900 dark:text-slate-100"
        style={{ color: stroke }}
      />
      <circle
        cx={pad + ((values.length - 1) * (w - pad * 2)) / Math.max(1, values.length - 1)}
        cy={norm(values[values.length - 1])}
        r={3.5}
        fill="currentColor"
        className="text-slate-900 dark:text-slate-100"
        style={{ color: stroke }}
      />
    </svg>
  );
}

function Modal({ open, title, subtitle, onClose, children, wide }) {
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
      <div
        className={cx(
          "relative flex w-full flex-col bg-white dark:bg-slate-900 shadow-2xl transition-all h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800",
          wide ? "max-w-5xl" : "max-w-2xl"
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50">{title}</div>
            {subtitle ? <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, subtitle, right }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm transition">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold text-slate-900 dark:text-slate-50 leading-tight">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-normal">{subtitle}</div>
          ) : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/* ------------------------------ Domain helpers ------------------------------ */

const DEFAULT_TITLE = "GlowUp Hub: Autumn Beauty Flash Live";

function prettyKbps(kbps) {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps} Kbps`;
}

function computeRequiredUploadMbps(profile) {
  const overhead = profile.adaptiveBitrate ? 1.25 : 1.15;
  return (profile.bitrateKbps / 1000) * overhead;
}

function statusTone(s) {
  if (s === "Connected") return "green";
  if (s === "Live") return "blue";
  if (s === "Needs re-auth") return "orange";
  if (s === "Stream key missing") return "orange";
  if (s === "Blocked") return "red";
  return "neutral";
}

function statusLabel(s) {
  if (s === "Stream key missing") return "Stream key missing";
  if (s === "Needs re-auth") return "Needs re-auth";
  return s;
}

/* ------------------------------ Page ------------------------------ */

export default function SupplierStreamToPlatformsPage() {
  const navigate = useNavigate();
  const safeNav = (url) => safeNavTo(navigate, url);
  const { toasts, push } = useToasts();
  const { run, isPending } = useAsyncAction();

  // Supplier adaptation: execution owner
  const [executionOwner, setExecutionOwner] = useState("Supplier-hosted");
  const directControl = executionOwner === "Supplier-hosted";

  const [isPro, setIsPro] = useState(true);
  const [sessionStatus, setSessionStatus] = useState("Draft");
  const [selectedDestId, setSelectedDestId] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [profile, setProfile] = useState({
    orientation: "Auto",
    quality: "High",
    advancedOpen: false,
    resolution: "1080p",
    bitrateKbps: 4500,
    audio: "Stereo",
    gainDb: 0,
    latency: "Low",
    adaptiveBitrate: true,
  });

  const [degradeMode, setDegradeMode] = useState("Reduce quality, keep all destinations");

  const [recordMaster, setRecordMaster] = useState(true);
  const [autoReplay, setAutoReplay] = useState(true);
  const [autoHighlights, setAutoHighlights] = useState(false);
  const [downloadMasterAllowed, setDownloadMasterAllowed] = useState(false);

  const [estimatedUploadMbps, setEstimatedUploadMbps] = useState(12.4);

  // Supplier adaptation: request log
  const [pendingRequests, setPendingRequests] = useState({});
  const markRequested = (key, label) => {
    setPendingRequests((s) => ({
      ...s,
      [key]: {
        label,
        at: new Date().toLocaleString(),
      },
    }));
  };

  const [destinations, setDestinations] = useState(() => {
    const base = [
      {
        id: "yt",
        name: "YouTube Live",
        kind: "Video Live",
        status: "Connected",
        enabled: true,
        accountLabel: "Supplier Brand Channel",
        supportsStreamKey: true,
        supportsPrivacy: true,
        supportsCategory: true,
        supportsTags: true,
        supportsDelay: true,
        supportsAutoReconnect: true,
        proAdvanced: false,
        ownership: "Supplier",
        settings: {
          title: DEFAULT_TITLE,
          description: "Serum benefits, fit checks, and instant buy links.",
          privacy: "Public",
          category: "Beauty",
          tags: ["beauty", "serum", "flash"],
          delaySec: 0,
          autoReconnect: true,
        },
        health: { framesDropped: 0, reconnects: 0, lastAckSec: 2, outBitrateKbps: 4300 },
      },
      {
        id: "fb",
        name: "Facebook Live",
        kind: "Community Live",
        status: "Needs re-auth",
        enabled: false,
        accountLabel: "Supplier Page",
        supportsStreamKey: true,
        supportsPrivacy: true,
        supportsCategory: false,
        supportsTags: false,
        supportsDelay: false,
        supportsAutoReconnect: true,
        proAdvanced: false,
        ownership: "Supplier",
        errorTitle: "Your session expired",
        errorNext: "Re-authenticate the connected account to restore posting permissions.",
        settings: {
          title: DEFAULT_TITLE,
          description: "Live promo. Products pinned for instant checkout.",
          privacy: "Public",
          tags: ["live"],
          delaySec: 0,
          autoReconnect: true,
        },
        health: { framesDropped: 0, reconnects: 0, lastAckSec: 0, outBitrateKbps: 0 },
      },
      {
        id: "tt",
        name: "TikTok Live",
        kind: "Video Live",
        status: "Stream key missing",
        enabled: false,
        accountLabel: "Creator account",
        supportsStreamKey: true,
        supportsPrivacy: false,
        supportsCategory: false,
        supportsTags: false,
        supportsDelay: true,
        supportsAutoReconnect: true,
        proAdvanced: true,
        ownership: "Creator",
        errorTitle: "Stream key required",
        errorNext: "Add a stream key or connect via OAuth if supported in your region.",
        settings: {
          title: DEFAULT_TITLE,
          description: "Live now. Limited stock.",
          tags: ["tiktok"],
          delaySec: 0,
          autoReconnect: true,
        },
        health: { framesDropped: 0, reconnects: 0, lastAckSec: 0, outBitrateKbps: 0 },
      },
      {
        id: "ig",
        name: "Instagram Live",
        kind: "Video Live",
        status: "Connected",
        enabled: true,
        accountLabel: "Creator Studio",
        supportsStreamKey: false,
        supportsPrivacy: false,
        supportsCategory: false,
        supportsTags: false,
        supportsDelay: false,
        supportsAutoReconnect: true,
        proAdvanced: false,
        ownership: "Creator",
        settings: {
          title: DEFAULT_TITLE,
          description: "Quick demo + price breakdown + instant buy.",
          tags: ["beauty", "live"],
          delaySec: 0,
          autoReconnect: true,
        },
        health: { framesDropped: 1, reconnects: 0, lastAckSec: 3, outBitrateKbps: 3800 },
      },
      {
        id: "tw",
        name: "Twitch",
        kind: "Video Live",
        status: "Blocked",
        enabled: false,
        accountLabel: "Channel under review",
        supportsStreamKey: true,
        supportsPrivacy: false,
        supportsCategory: true,
        supportsTags: false,
        supportsDelay: true,
        supportsAutoReconnect: true,
        proAdvanced: false,
        ownership: "Supplier",
        errorTitle: "Destination blocked",
        errorNext: "Account flagged by platform policy. Contact support or switch destination.",
        settings: {
          title: DEFAULT_TITLE,
          description: "Live commerce stream.",
          category: "Just Chatting",
          tags: ["commerce"],
          delaySec: 0,
          autoReconnect: true,
        },
        health: { framesDropped: 0, reconnects: 0, lastAckSec: 0, outBitrateKbps: 0 },
      },
    ];
    return base;
  });

  const enabledDests = useMemo(() => destinations.filter((d) => d.enabled), [destinations]);
  const requiredUpload = useMemo(() => computeRequiredUploadMbps(profile), [profile]);

  const preflightItems = useMemo(() => {
    const items = [];

    const anyEnabled = enabledDests.length > 0;
    items.push({
      id: "dest-enabled",
      label: "At least one destination enabled",
      status: anyEnabled ? "Pass" : "Fail",
      fix: anyEnabled ? undefined : "Enable at least one destination for this session.",
    });

    const invalidAccounts = enabledDests.filter((d) => d.status === "Needs re-auth" || d.status === "Blocked");
    items.push({
      id: "accounts",
      label: "Connected accounts valid",
      status: invalidAccounts.length === 0 ? "Pass" : "Fail",
      detail: invalidAccounts.length ? `${invalidAccounts.map((x) => x.name).join(", ")}` : undefined,
      fix: invalidAccounts.length ? "Re-authenticate or remove blocked destinations." : undefined,
    });

    const missingKeys = enabledDests.filter((d) => d.supportsStreamKey && d.status === "Stream key missing");
    items.push({
      id: "keys",
      label: "Stream keys present where needed",
      status: missingKeys.length === 0 ? "Pass" : "Fail",
      detail: missingKeys.length ? `${missingKeys.map((x) => x.name).join(", ")}` : undefined,
      fix: missingKeys.length ? "Add stream keys or connect via OAuth where available." : undefined,
    });

    const risky = profile.quality === "Ultra" && enabledDests.some((d) => d.kind === "Community Live");
    items.push({
      id: "profile",
      label: "Output profile compatible",
      status: risky ? "Warn" : "Pass",
      detail: risky ? "Ultra quality may be rejected by some community destinations." : undefined,
      fix: risky ? "Switch to High quality or keep Ultra for video-only destinations." : undefined,
    });

    const bandwidthOk = estimatedUploadMbps >= requiredUpload;
    items.push({
      id: "bandwidth",
      label: "Estimated upload bandwidth check",
      status: bandwidthOk ? "Pass" : "Fail",
      detail: `Estimated ${estimatedUploadMbps.toFixed(1)} Mbps, required ${requiredUpload.toFixed(1)} Mbps`,
      fix: bandwidthOk ? undefined : "Reduce bitrate or enable adaptive bitrate.",
    });

    if (!directControl) {
      items.push({
        id: "ownership",
        label: "Host control mode",
        status: "Warn",
        detail: "Creator-hosted: actions are request-only on this page.",
        fix: "Switch to Supplier-hosted if you are the host, or coordinate with the Creator.",
      });
    }

    return items;
  }, [enabledDests, estimatedUploadMbps, profile.quality, requiredUpload, directControl]);

  const preflightPass = useMemo(() => preflightItems.every((i) => i.status === "Pass" || i.status === "Warn"), [preflightItems]);

  const goLiveDisabled = useMemo(() => {
    if (sessionStatus === "Live" || sessionStatus === "Ended") return true;
    if (!directControl) return false; // request-only mode
    return !preflightPass;
  }, [preflightPass, sessionStatus, directControl]);

  function setQuality(q) {
    setProfile((p) => {
      if (q === "Standard") return { ...p, quality: q, resolution: "720p", bitrateKbps: 2500 };
      if (q === "High") return { ...p, quality: q, resolution: "1080p", bitrateKbps: 4500 };
      return { ...p, quality: q, resolution: "1080p", bitrateKbps: 6500 };
    });
  }

  function toggleDest(id, v) {
    setDestinations((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        if (d.status === "Blocked" && v) return d;
        return { ...d, enabled: v };
      })
    );
  }

  function openAdvanced(id) {
    setSelectedDestId(id);
    setAdvancedOpen(true);
  }

  function updateDestSettings(id, patch) {
    setDestinations((prev) => prev.map((d) => (d.id === id ? { ...d, settings: { ...d.settings, ...patch } } : d)));
  }

  function runBandwidthTest() {
    const jitter = Math.random() * 10 - 3;
    const next = Math.max(1, Math.min(40, estimatedUploadMbps + jitter));
    setEstimatedUploadMbps(next);
    push("Bandwidth check updated", "success");
  }

  function handleTestStream() {
    if (!isPro) {
      push("Test Stream is a Pro feature", "error");
      return;
    }

    if (!directControl) {
      markRequested("test_stream", "Request: Test Stream");
      push("Test Stream request sent to Creator", "success");
      return;
    }

    run(
      async () => {
        // simulate
      },
      {
        delay: 1500,
        loadingMessage: "Test Stream started. Checking destinations...",
        successMessage: "Test Stream passed. Ready to go live.",
        onNotify: push,
      }
    );
  }

  function handleCopyProducerLink() {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://mylivedealz.com"}/supplier/producer/session/ABCD-1234`;
    copyText(url).then((ok) => {
      if (ok) push("Producer link copied", "success");
      else push("Could not copy", "error");
    });
  }

  function handleGoLive() {
    if (!directControl) {
      markRequested("go_live", "Request: Go Live");
      push("Go Live request sent to Creator", "success");
      return;
    }

    if (goLiveDisabled) {
      push("Preflight must pass before going live", "error");
      return;
    }

    run(
      async () => {
        setSessionStatus("Live");
        setDestinations((prev) =>
          prev.map((d) => (d.enabled && (d.status === "Connected" || d.status === "Live") ? { ...d, status: "Live" } : d))
        );
      },
      {
        delay: 2000,
        successMessage: "You are live",
        onNotify: push,
      }
    );
  }

  const selectedDest = useMemo(() => destinations.find((d) => d.id === selectedDestId) || null, [destinations, selectedDestId]);

  const healthSeries = useMemo(() => {
    const base = profile.bitrateKbps;
    return Array.from({ length: 12 }, (_, i) => {
      const wobble = Math.sin(i / 2) * 0.07 + (Math.random() * 0.06 - 0.03);
      return Math.max(0, Math.round(base * (0.86 + wobble)));
    });
  }, [profile.bitrateKbps]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <ToastStack toasts={toasts} />

      {/* Top header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
        <div className="w-full px-[0.55%] py-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                <button className="hover:text-slate-700 dark:hover:text-slate-200" onClick={() => safeNav(ROUTES.dealzMarketplace)}>
                  Dealz Marketplace
                </button>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <button className="hover:text-slate-700 dark:hover:text-slate-200" onClick={() => safeNav(ROUTES.liveDashboard)}>
                  Supplier Live Pro
                </button>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">Stream to Platforms</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Stream to Platforms</div>
                <Badge tone={sessionStatus === "Live" ? "blue" : sessionStatus === "Scheduled" ? "purple" : sessionStatus === "Ended" ? "neutral" : "orange"}>
                  <Signal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {sessionStatus}
                </Badge>
                <Badge tone={directControl ? "green" : "orange"}>
                  {directControl ? <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                  {directControl ? "Supplier-hosted" : "Creator-hosted"}
                </Badge>
              </div>
              <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                Connect destinations, tune quality, and monitor health. Preflight gates “Go Live”.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Supplier adaptation: execution ownership */}
              <div className="hidden md:flex items-center gap-2 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-800">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">Host</span>
                <select
                  value={executionOwner}
                  onChange={(e) => setExecutionOwner(e.target.value)}
                  className="h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <option>Supplier-hosted</option>
                  <option>Creator-hosted</option>
                </select>
              </div>

              <div className="hidden items-center gap-2 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-800 md:flex">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">Pro</span>
                <Toggle checked={isPro} onChange={setIsPro} />
              </div>

              <div className="relative">
                <select
                  value={sessionStatus}
                  onChange={(e) => setSessionStatus(e.target.value)}
                  className="h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 appearance-none"
                >
                  <option>Draft</option>
                  <option>Scheduled</option>
                  <option>Live</option>
                  <option>Ended</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              </div>

              <Tooltip
                label={
                  !isPro
                    ? "Locked: Upgrade to Pro to test stream health before going live."
                    : directControl
                      ? "Run a non-public test output to validate destinations and quality."
                      : "Creator-hosted: send a test stream request to the Creator."
                }
              >
                <button
                  onClick={handleTestStream}
                  disabled={isPending}
                  className={cx(
                    "inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-semibold shadow-sm ring-1 transition active:scale-[0.98]",
                    isPro
                      ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                      : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-slate-200 dark:ring-slate-800"
                  )}
                >
                  <Gauge className="h-4 w-4" />
                  <span className="hidden sm:inline">Test Stream</span>
                  {!isPro ? <Lock className="h-4 w-4" /> : null}
                </button>
              </Tooltip>

              <button
                onClick={handleCopyProducerLink}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition active:scale-[0.98]"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copy Link</span>
              </button>

              <Tooltip
                label={
                  directControl
                    ? goLiveDisabled
                      ? "Go Live is disabled until preflight passes. Fix failed items in the checklist."
                      : "Go live with the selected destinations."
                    : "Creator-hosted: send a Go Live request to the Creator."
                }
              >
                <button
                  onClick={handleGoLive}
                  disabled={goLiveDisabled || isPending}
                  className={cx(
                    "inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]",
                    goLiveDisabled
                      ? "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed"
                      : "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:opacity-95"
                  )}
                >
                  <Zap className="h-4 w-4" />
                  {directControl ? "Go Live" : "Request Go Live"}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full px-[0.55%] py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left main */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <SectionTitle
                icon={<MonitorPlay className="h-5 w-5" />}
                title="Destinations"
                subtitle="Enable the platforms you want to stream to for this session. Fix errors before going live."
                right={
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-800">
                      <Wifi className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
                      <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-400">Upload est.</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{estimatedUploadMbps.toFixed(1)} Mbps</span>
                      <button
                        type="button"
                        onClick={runBandwidthTest}
                        className="ml-1 inline-flex h-7 items-center gap-1 rounded-xl bg-white dark:bg-slate-900 px-2 text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition active:scale-[0.98]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Recheck
                      </button>
                    </div>
                  </div>
                }
              />

              {!directControl ? (
                <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <div className="text-[10px] sm:text-xs text-amber-900/90 dark:text-amber-300 font-semibold">
                      Creator-hosted session: destination toggles and advanced settings will create requests.
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {destinations.map((d) => {
                  const blocked = d.status === "Blocked";
                  const needsFix = d.status === "Needs re-auth" || d.status === "Stream key missing" || d.status === "Blocked";
                  const requestKey = `dest_${d.id}`;
                  const hasPending = Boolean(pendingRequests[requestKey]);

                  return (
                    <div
                      key={d.id}
                      className={cx(
                        "rounded-3xl border p-4 shadow-sm transition-all hover:shadow-md",
                        d.enabled
                          ? "border-slate-200 bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:border-slate-700 dark:bg-slate-800/40 dark:ring-slate-800"
                          : "border-slate-200/70 bg-gray-50 dark:bg-slate-950/50 dark:border-slate-800 dark:bg-slate-900/50",
                        blocked ? "opacity-90 grayscale-[0.5]" : ""
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm">
                              <Video className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">{d.name}</div>
                              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                                {d.kind} • {d.accountLabel}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <Badge tone={d.ownership === "Supplier" ? "green" : "purple"}>
                                  {d.ownership === "Supplier" ? "Supplier" : "Creator"}
                                </Badge>
                                {hasPending ? (
                                  <Badge tone="orange" title={pendingRequests[requestKey]?.at}>
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Pending request
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Badge tone={statusTone(d.status)}>
                            {d.status === "Connected" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : d.status === "Live" ? (
                              <Activity className="h-3.5 w-3.5" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            {statusLabel(d.status)}
                          </Badge>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400">Enable</span>
                            <Toggle
                              checked={d.enabled}
                              disabled={blocked || (!directControl && d.enabled === false && d.status !== "Connected" && d.status !== "Live")}
                              onChange={(v) => {
                                if (!directControl) {
                                  markRequested(requestKey, `Request: ${v ? "Enable" : "Disable"} ${d.name}`);
                                  push(`Request sent: ${v ? "Enable" : "Disable"} ${d.name}`, "success");
                                  return;
                                }
                                toggleDest(d.id, v);
                                if (blocked) push("This destination is blocked", "error");
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {needsFix ? (
                        <div className="mt-3 rounded-2xl bg-orange-50 dark:bg-amber-500/10 p-3 ring-1 ring-orange-200 dark:ring-amber-500/20 transition-colors">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-700 dark:text-amber-400" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-orange-800 dark:text-amber-300">{d.errorTitle || "Action required"}</div>
                              <div className="text-[10px] sm:text-xs text-orange-700 dark:text-amber-400">{d.errorNext || "Resolve the issue to enable this destination."}</div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  className="inline-flex h-8 items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 ring-1 ring-orange-200 dark:ring-slate-800 hover:bg-orange-50 dark:hover:bg-slate-800 transition active:scale-[0.98]"
                                  onClick={() => {
                                    if (!directControl) {
                                      markRequested(`manage_${d.id}`, `Request: Manage ${d.name}`);
                                      push(`Request sent: Manage ${d.name}`, "success");
                                      return;
                                    }
                                    push(`Open account management for ${d.name}`, "info");
                                  }}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Manage
                                </button>
                                {d.status === "Needs re-auth" ? (
                                  <button
                                    type="button"
                                    className="inline-flex h-8 items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-3 text-[10px] sm:text-xs font-semibold text-white dark:text-slate-900 hover:opacity-95 transition active:scale-[0.98]"
                                    onClick={() => {
                                      if (!directControl) {
                                        markRequested(`reauth_${d.id}`, `Request: Re-auth ${d.name}`);
                                        push(`Request sent: Re-auth ${d.name}`, "success");
                                        return;
                                      }
                                      setDestinations((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: "Connected", errorTitle: undefined, errorNext: undefined } : x)));
                                      push("Re-auth complete", "success");
                                    }}
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Re-auth now
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => openAdvanced(d.id)}
                          className="inline-flex h-9 items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition active:scale-[0.98] shadow-sm"
                        >
                          <Settings className="h-4 w-4" />
                          Advanced
                          {d.proAdvanced ? (
                            <Badge tone="purple">
                              <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              Pro
                            </Badge>
                          ) : null}
                        </button>

                        <button
                          type="button"
                          onClick={() => push(d.status === "Live" ? "Opening output preview..." : "Preview is available once live", "info")}
                          className={cx(
                            "inline-flex h-9 items-center gap-2 rounded-2xl px-3 text-[10px] sm:text-xs font-semibold ring-1 transition active:scale-[0.98] shadow-sm",
                            d.status === "Live"
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-slate-900 dark:ring-slate-100 hover:opacity-95"
                              : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-slate-800"
                          )}
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                      </div>

                      <div className="mt-3 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Title Override</div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-500">Per platform</span>
                        </div>
                        <div className="mt-1 line-clamp-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 italic">“{d.settings.title || DEFAULT_TITLE}”</div>
                      </div>

                      {/* Live thumbnail */}
                      {d.status === "Live" ? (
                        <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
                          <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-900">
                            <img
                              src={
                                d.thumbnailUrl ||
                                "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=60"
                              }
                              alt="preview"
                              className="h-full w-full object-cover transition-opacity hover:opacity-90"
                            />
                            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-white ring-1 ring-white/20">
                              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                              Live
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live health monitor */}
            <div className="mt-5 rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <SectionTitle
                icon={<Activity className="h-5 w-5" />}
                title="Live health monitor"
                subtitle={sessionStatus === "Live" ? "Real-time health from ingest and per destination acknowledgements." : "Health becomes active when your session is live."}
                right={
                  <div className="flex items-center gap-2">
                    <Badge tone={sessionStatus === "Live" ? "blue" : "neutral"}>
                      <Signal className="h-3.5 w-3.5" />
                      {sessionStatus === "Live" ? "Streaming" : "Idle"}
                    </Badge>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition active:scale-[0.98] shadow-sm"
                      onClick={() => push("Opening health details...", "info")}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">Details</span>
                    </button>
                  </div>
                }
              />

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <div className="rounded-3xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Master stream</div>
                        <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Output bitrate trend</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{prettyKbps(profile.bitrateKbps)}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-500">Target</div>
                      </div>
                    </div>

                    <div className={cx("mt-3", sessionStatus !== "Live" && "opacity-60")}>
                      <MiniLine values={healthSeries} tone={sessionStatus === "Live" ? "orange" : "neutral"} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge tone={estimatedUploadMbps >= requiredUpload ? "green" : "red"}>
                        <Wifi className="h-3.5 w-3.5" />
                        Upload {estimatedUploadMbps.toFixed(1)} Mbps
                      </Badge>
                      <Badge tone={profile.adaptiveBitrate ? "blue" : "neutral"}>
                        <Gauge className="h-3.5 w-3.5" />
                        Adaptive {profile.adaptiveBitrate ? "On" : "Off"}
                      </Badge>
                      <Badge tone={profile.latency === "Low" ? "purple" : "neutral"}>
                        <Timer className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">{profile.latency} latency</span>
                        <span className="xs:hidden">{profile.latency[0]}L</span>
                      </Badge>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white dark:bg-slate-900/80 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                      <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Degrade gracefully</div>
                      <div className="mt-2 grid gap-2">
                        {["Reduce quality, keep all destinations", "Stop failing destinations only"].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDegradeMode(m)}
                            className={cx(
                              "flex items-center justify-between rounded-xl px-3 py-2 text-[10px] sm:text-xs font-semibold ring-1 transition active:scale-[0.98]",
                              degradeMode === m
                                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-slate-900 dark:ring-slate-100"
                                : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300 ring-slate-200 dark:ring-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <span className="truncate">{m === "Reduce quality, keep all destinations" ? "Keep all" : "Stop failing"}</span>
                            <ArrowRight className={cx("h-3.5 w-3.5", degradeMode === m ? "text-white dark:text-slate-900" : "text-slate-400 dark:text-slate-600")} />
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-500">Recommended: reduce quality to keep reach across all destinations.</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
                    <div className="bg-white dark:bg-slate-900 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Per-destination health</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1">Frames dropped, reconnects, ACK freshness, bitrate</div>
                        </div>
                        <Badge tone={sessionStatus === "Live" ? "blue" : "neutral"}>
                          <Signal className="h-3.5 w-3.5" />
                          {sessionStatus === "Live" ? "Live metrics" : "Waiting"}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50">
                      <div className="grid grid-cols-12 gap-2 border-t border-slate-200 dark:border-slate-800 px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                        <div className="col-span-4">Platform</div>
                        <div className="col-span-2 text-center">Drop</div>
                        <div className="col-span-2 text-center">Rec</div>
                        <div className="col-span-2 text-center">ACK</div>
                        <div className="col-span-2 text-right">Rate</div>
                      </div>
                      <div className="divide-y divide-slate-200 dark:divide-slate-800">
                        {enabledDests.map((d) => (
                          <div key={d.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] sm:text-xs">
                            <div className="col-span-4 flex items-center gap-2">
                              <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm transition">
                                <Video className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-bold text-slate-900 dark:text-slate-100">{d.name}</div>
                                <div className="hidden sm:block truncate text-[10px] text-slate-500 dark:text-slate-500">{d.kind}</div>
                              </div>
                            </div>
                            <div className="col-span-2 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200">{d.status === "Live" ? d.health.framesDropped : "—"}</div>
                            <div className="col-span-2 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200">{d.status === "Live" ? d.health.reconnects : "—"}</div>
                            <div className="col-span-2 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200">{d.status === "Live" ? `${d.health.lastAckSec}s` : "—"}</div>
                            <div className="col-span-2 flex items-center justify-end font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {d.status === "Live" ? prettyKbps(d.health.outBitrateKbps).replace(" Mbps", "M").replace(" Kbps", "k") : "—"}
                            </div>
                          </div>
                        ))}
                        {enabledDests.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-600">No destinations enabled.</div>
                        ) : null}
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4">
                        <div className="flex items-start gap-2 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                          <Info className="mt-0.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
                          <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                            Degrade behavior: <span className="font-bold text-slate-900 dark:text-slate-100">{degradeMode}</span>. You can tune this during the stream.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right rail */}
          <div className="lg:col-span-4">
            {/* Output profile */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <SectionTitle
                icon={<SlidersHorizontal className="h-5 w-5" />}
                title="Output profile"
                subtitle="Orientation and quality presets with approachable defaults."
                right={<Badge tone="blue">Recommended</Badge>}
              />

              <div className="mt-6">
                <div className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Orientation</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Vertical", "Landscape", "Auto"].map((o) => (
                    <Pill key={o} active={profile.orientation === o} onClick={() => setProfile((p) => ({ ...p, orientation: o }))}>
                      {o}
                    </Pill>
                  ))}
                </div>
                <div className="mt-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-500">Recommended: Auto unless your content is strictly vertical.</div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Quality preset</div>
                  <Badge tone={profile.quality === "Ultra" ? "purple" : profile.quality === "High" ? "blue" : "neutral"}>
                    <Gauge className="h-3.5 w-3.5" />
                    {profile.quality}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Standard", "High", "Ultra"].map((q) => (
                    <Pill key={q} active={profile.quality === q} onClick={() => setQuality(q)}>
                      {q}
                    </Pill>
                  ))}
                </div>

                <div className="mt-3 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Resolution</div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-slate-50">{profile.resolution}</div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Target bitrate</div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-slate-50">{prettyKbps(profile.bitrateKbps)}</div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
                    <div className="text-[10px] text-slate-500 dark:text-slate-500">Required upload (est.)</div>
                    <div className={cx("text-[10px] font-bold", estimatedUploadMbps >= requiredUpload ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                      {requiredUpload.toFixed(1)} Mbps
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-800/20 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Latency</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Lower improves sync</div>
                  </div>
                  <div className="flex gap-1 rounded-full bg-slate-100 dark:bg-slate-900 p-1">
                    {["Low", "Normal"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setProfile((p) => ({ ...p, latency: m }))}
                        className={cx(
                          "rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold transition active:scale-95",
                          profile.latency === m
                            ? "bg-white dark:bg-slate-900 dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                            : "text-slate-500 dark:text-slate-500"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-800/20 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Adaptive bitrate</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Smoothes bandwidth dips</div>
                  </div>
                  <Toggle checked={profile.adaptiveBitrate} onChange={(v) => setProfile((p) => ({ ...p, adaptiveBitrate: v }))} />
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-800/20 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Audio</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Stereo recommended</div>
                  </div>
                  <div className="flex gap-1 rounded-full bg-slate-100 dark:bg-slate-900 p-1">
                    {["Mono", "Stereo"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setProfile((p) => ({ ...p, audio: m }))}
                        className={cx(
                          "rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold transition active:scale-95",
                          profile.audio === m
                            ? "bg-white dark:bg-slate-900 dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                            : "text-slate-500 dark:text-slate-500"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced */}
                <div className="rounded-3xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Advanced controls</div>
                      <div className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-500 truncate">Bitrate, gain, resolution</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfile((p) => ({ ...p, advancedOpen: !p.advancedOpen }))}
                      className="inline-flex h-8 items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition active:scale-[0.98] shadow-sm"
                    >
                      <Settings className="h-4 w-4" />
                      {profile.advancedOpen ? "Hide" : "Show"}
                    </button>
                  </div>

                  {profile.advancedOpen ? (
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl bg-white dark:bg-slate-900/80 p-3 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Bitrate (Kbps)</div>
                          <div className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-slate-100">{profile.bitrateKbps}</div>
                        </div>
                        <input
                          type="range"
                          min={1200}
                          max={9000}
                          step={100}
                          value={profile.bitrateKbps}
                          onChange={(e) => setProfile((p) => ({ ...p, bitrateKbps: parseInt(e.target.value, 10) }))}
                          className="mt-3 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100"
                        />
                      </div>

                      <div className="rounded-2xl bg-white dark:bg-slate-900/80 p-3 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Gain (dB)</div>
                          <div className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-slate-100">{profile.gainDb}</div>
                        </div>
                        <input
                          type="range"
                          min={-8}
                          max={8}
                          step={1}
                          value={profile.gainDb}
                          onChange={(e) => setProfile((p) => ({ ...p, gainDb: parseInt(e.target.value, 10) }))}
                          className="mt-3 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100"
                        />
                      </div>

                      <div className="rounded-2xl bg-white dark:bg-slate-900/80 p-3 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
                        <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Resolution</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {["720p", "1080p"].map((r) => (
                            <Pill key={r} active={profile.resolution === r} onClick={() => setProfile((p) => ({ ...p, resolution: r }))}>
                              {r}
                            </Pill>
                          ))}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-500">Best for premium brand sessions.</div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white dark:bg-slate-900/80 p-3 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
                    <Info className="mt-0.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      Recommended: <span className="font-bold text-slate-900 dark:text-slate-100">Auto</span> orientation, <span className="font-bold text-slate-900 dark:text-slate-100">High</span> quality, adaptive bitrate.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preflight checklist */}
            <div className="mt-5 rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <SectionTitle
                icon={<CheckCircle2 className="h-5 w-5" />}
                title="Preflight checklist"
                subtitle="Pass/fail checks with guided fixes. Go Live stays disabled until cleared."
                right={
                  <Badge tone={preflightPass ? "green" : "orange"}>
                    {preflightPass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {preflightPass ? "Ready" : "Review"}
                  </Badge>
                }
              />

              <div className="mt-4 grid gap-2">
                {preflightItems.map((i) => (
                  <div
                    key={i.id}
                    className={cx(
                      "rounded-2xl p-3 ring-1 transition-all",
                      i.status === "Pass"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/20"
                        : i.status === "Warn"
                          ? "bg-orange-50 dark:bg-amber-500/10 ring-orange-200 dark:ring-amber-500/20"
                          : "bg-rose-50 dark:bg-rose-500/10 ring-rose-200 dark:ring-rose-500/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {i.status === "Pass" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                          ) : (
                            <AlertTriangle className={cx("h-4 w-4", i.status === "Warn" ? "text-orange-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400")} />
                          )}
                          <div className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-slate-100">{i.label}</div>
                          <Badge tone={i.status === "Pass" ? "green" : i.status === "Warn" ? "orange" : "red"}>{i.status}</Badge>
                        </div>
                        {i.detail ? <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">{i.detail}</div> : null}
                        {i.fix ? <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">Fix: {i.fix}</div> : null}
                      </div>
                      {i.id === "bandwidth" ? (
                        <button
                          type="button"
                          onClick={runBandwidthTest}
                          className="inline-flex h-9 items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition active:scale-[0.98] shadow-sm"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span className="hidden xs:inline">Check</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}

                <div className="mt-2 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Premium policy hints</div>
                  <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Automatic restricted terms detection and platform policy hints.</div>
                </div>
              </div>
            </div>

            {/* Recording & replay */}
            <div className="mt-5 rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <SectionTitle
                icon={<Video className="h-5 w-5" />}
                title="Recording and replay"
                subtitle="Capture the master stream and generate replay assets."
                right={<Badge tone="blue">Pro-ready</Badge>}
              />

              <div className="mt-6 grid gap-3">
                <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-800/20 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Record master stream</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-500">Saved for replay and audit</div>
                  </div>
                  <Toggle checked={recordMaster} onChange={setRecordMaster} />
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-800/20 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Auto-generate replay page</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-500">Enable post-event playback</div>
                  </div>
                  <Toggle checked={autoReplay} onChange={setAutoReplay} />
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-800/20 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Auto-generate clips</div>
                      <Badge tone="purple">
                        <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        Pro
                      </Badge>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-500">Key moments for social sharing</div>
                  </div>
                  <Tooltip label={isPro ? "Generate highlight clips automatically." : "Locked: Upgrade to Pro to enable auto highlights."}>
                    <span>
                      <Toggle checked={autoHighlights} onChange={setAutoHighlights} disabled={!isPro} />
                    </span>
                  </Tooltip>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/40 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">Download master</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-500">Admin controlled permission</div>
                  </div>
                  <Toggle checked={downloadMasterAllowed} onChange={setDownloadMasterAllowed} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => push(downloadMasterAllowed ? "Preparing master download..." : "Download is restricted by admin", downloadMasterAllowed ? "info" : "warn")}
                    className={cx(
                      "inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-bold shadow-sm ring-1 transition active:scale-[0.98]",
                      downloadMasterAllowed
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-slate-900 dark:ring-slate-100 hover:opacity-95"
                        : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-slate-200 dark:ring-slate-800 cursor-not-allowed"
                    )}
                  >
                    <LinkIcon className="h-4 w-4" />
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={() => push("Opening replay page settings...", "info")}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-800 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition active:scale-[0.98]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced modal */}
      <Modal
        open={advancedOpen && !!selectedDest}
        title={selectedDest ? selectedDest.name : "Advanced"}
        subtitle={!directControl ? "Creator-hosted: changes become requests" : "Per destination settings"}
        onClose={() => setAdvancedOpen(false)}
        wide
      >
        {selectedDest ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-12">
              <div className="rounded-3xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/40 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Custom platform assets</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">These overrides only apply to this destination.</div>
                  </div>
                  {selectedDest.proAdvanced ? (
                    <Badge tone="purple">
                      <Lock className="h-3.5 w-3.5" />
                      Pro features
                    </Badge>
                  ) : (
                    <Badge tone="blue">Basic settings</Badge>
                  )}
                </div>

                {!directControl ? (
                  <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-400" />
                      <div className="text-[10px] sm:text-xs text-amber-900/90 dark:text-amber-300 font-semibold">
                        Request-only mode: saving will create a change request for the Creator and Ops to action.
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Title Override</div>
                      <input
                        value={selectedDest.settings.title}
                        onChange={(e) => updateDestSettings(selectedDest.id, { title: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition shadow-sm"
                        placeholder="Custom title"
                      />
                    </div>

                    <div>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Description Override</div>
                      <textarea
                        value={selectedDest.settings.description}
                        onChange={(e) => updateDestSettings(selectedDest.id, { description: e.target.value })}
                        className="mt-1.5 min-h-[120px] w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition shadow-sm resize-none"
                        placeholder="What should viewers expect on this platform?"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedDest.supportsPrivacy ? (
                      <div>
                        <div className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Privacy Setting</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {["Public", "Unlisted"].map((p) => (
                            <Pill
                              key={p}
                              active={selectedDest.settings.privacy === p}
                              onClick={() => updateDestSettings(selectedDest.id, { privacy: p })}
                            >
                              {p}
                            </Pill>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-white dark:bg-slate-900/50 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="flex items-start gap-2">
                          <Info className="mt-0.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
                          <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 italic">Privacy controls are not supported for this provider.</div>
                        </div>
                      </div>
                    )}

                    {selectedDest.supportsCategory ? (
                      <div>
                        <div className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Category</div>
                        <input
                          value={selectedDest.settings.category || ""}
                          onChange={(e) => updateDestSettings(selectedDest.id, { category: e.target.value })}
                          className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition shadow-sm"
                          placeholder="e.g., Entertainment"
                        />
                      </div>
                    ) : null}

                    {selectedDest.supportsTags ? (
                      <div>
                        <div className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Search Tags</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedDest.settings.tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition"
                            >
                              #{t}
                              <button
                                type="button"
                                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => updateDestSettings(selectedDest.id, { tags: selectedDest.settings.tags.filter((x) => x !== t) })}
                              >
                                <X className="h-3 w-3 text-slate-500" />
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const next = prompt("Add tag (without #)");
                              if (!next) return;
                              updateDestSettings(selectedDest.id, { tags: Array.from(new Set([...(selectedDest.settings.tags || []), next.trim()])) });
                            }}
                            className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-900 dark:bg-slate-100 px-3 text-[10px] sm:text-xs font-bold text-white dark:text-slate-900 hover:opacity-95 transition active:scale-[0.98] shadow-md"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Add tag
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Advanced Logic</div>
                      <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Delay and reliability settings.</div>
                    </div>
                    <Badge tone="neutral">Per destination</Badge>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Sync Delay</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Buffer output for this platform.</div>
                        </div>
                        {selectedDest.supportsDelay ? <Badge tone="blue">Supported</Badge> : <Badge tone="neutral">N/A</Badge>}
                      </div>

                      {selectedDest.supportsDelay ? (
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{selectedDest.settings.delaySec}s</div>
                            <Badge tone="purple">
                              <Lock className="h-3 w-3" />
                              Pro
                            </Badge>
                          </div>
                          <Tooltip label={isPro ? "Adjust destination delay to synchronize across multiple platforms." : "Upgrade to Pro to enable custom sync delays."}>
                            <div className="mt-2">
                              <input
                                type="range"
                                min={0}
                                max={20}
                                step={1}
                                value={selectedDest.settings.delaySec}
                                disabled={!isPro}
                                onChange={(e) => updateDestSettings(selectedDest.id, { delaySec: parseInt(e.target.value, 10) })}
                                className={cx(
                                  "w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100",
                                  !isPro && "opacity-40 grayscale"
                                )}
                              />
                            </div>
                          </Tooltip>
                          <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-500">Recommended: keep under 6s for interactivity.</div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-500 italic">This platform handles its own ingest delay.</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Auto-reconnect</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Attempts reconnection on drop</div>
                      </div>
                      {selectedDest.supportsAutoReconnect ? (
                        <Toggle
                          checked={selectedDest.settings.autoReconnect}
                          onChange={(v) => updateDestSettings(selectedDest.id, { autoReconnect: v })}
                        />
                      ) : (
                        <Badge tone="neutral">N/A</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-1 ring-orange-100 dark:ring-orange-500/20">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Dynamic guidance</div>
                        <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Guidance is contextual based on platform policies. Resolve issues before enabling.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-900 dark:bg-slate-100 p-4 sm:p-5 shadow-2xl transition">
                    <div className="text-sm font-bold text-white dark:text-slate-900">Review platform settings</div>
                    <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
                      {directControl
                        ? `Saving these changes will update session meta for ${selectedDest.name}.`
                        : `Submitting will create a change request for ${selectedDest.name}.`}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!directControl) {
                            markRequested(`adv_${selectedDest.id}`, `Request: Update advanced settings for ${selectedDest.name}`);
                            push(`Request sent: Advanced settings for ${selectedDest.name}`, "success");
                          } else {
                            push(`Saved advanced settings for ${selectedDest.name}`, "success");
                          }
                          setAdvancedOpen(false);
                        }}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-900 dark:text-slate-50 hover:brightness-95 transition active:scale-[0.98] shadow-md"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {directControl ? "Save Changes" : "Send Request"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdvancedOpen(false)}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/20 dark:border-slate-300 px-4 text-sm font-bold text-white dark:text-slate-900 hover:bg-gray-50 dark:hover:bg-slate-200 transition active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {!directControl ? (
                    <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800">
                      <div className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Supplier note</div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500 leading-relaxed">
                        In Creator-hosted mode, recommended workflow is: request changes here → Creator confirms → preflight passes → Creator goes live.
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierStreamToPlatformsPage test failed: ${msg}`);
  };
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "ORANGE exists");
  assert(typeof GREEN === "string" && GREEN.length > 0, "GREEN exists");
  console.log("✅ SupplierStreamToPlatformsPage self-tests passed");
}
