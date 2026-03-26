import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { sellerBackendApi } from "../../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:livedealz/live/SupplierSafetyModerationPage").catch(() => undefined);

/**
 * SupplierSafetyModerationPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: SafetyModeration.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Sticky header with breadcrumbs + session meta + plan chip + role mode
 * - Destination tabs
 * - Chat moderation list with message-level actions (delete/timeout/ban)
 * - Advanced Guardrails grid (Auto-Pilot, Block Links, Slow Mode)
 * - Emergency Protocol per destination (mute chat)
 * - Broadcast Control (pause outgoing notifications)
 * - Smart Filters (keyword rules) + keyword drawer
 * - System Integrity (preflight)
 * - Action confirm modal + incident escalation modal + toast
 *
 * Supplier adaptations (minimal + required):
 * - Role mode becomes Supplier-aware:
 *   1) Supplier (Direct Control) -> supplier is hosting/acting as creator (full actions)
 *   2) Supplier (Using Creator) -> request-only moderation (actions become “requests”)
 *   3) Support Ops (Viewer) -> read-only
 * - Broadcast Control + Smart Filters remain editable by Supplier when not Viewer.
 * - Emergency mute + message actions are direct only in Supplier-hosted; request-only otherwise.
 *
 * Canvas-safe:
 * - No lucide-react. Inline SVG icons included.
 * - No router imports. `safeNav()` uses hash navigation for preview.
 */

const ORANGE = "#f77f00";

const ROUTES = {
  liveDashboard: "/supplier/live/dashboard",
  liveSchedule: "/supplier/live/schedule",
  liveStudio: "/supplier/live/studio",
  audienceNotifications: "/supplier/live/audience-notifications",
  overlaysCtas: "/supplier/live/overlays-ctas-pro",
  postLive: "/supplier/live/post-live-publisher",
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

function parseSearch() {
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

function fmtLocal(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
  });
}

function agoLabel(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
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

/* ------------------------------ Icons (inline) ------------------------------ */

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

const Ban = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M7 7l10 10" />
  </Icon>
);

const BellOff = ({ className }) => (
  <Icon className={className}>
    <path d="M9 18h6" />
    <path d="M10 5a2 2 0 1 1 4 0" />
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
    <path d="M3 3l18 18" />
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

const Flag = ({ className }) => (
  <Icon className={className}>
    <path d="M4 22V4" />
    <path d="M4 4h12l-1 4 1 4H4" />
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

const MessageSquare = ({ className }) => (
  <Icon className={className}>
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </Icon>
);

const PlusCircle = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </Icon>
);

const Search = ({ className }) => (
  <Icon className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Icon>
);

const Send = ({ className }) => (
  <Icon className={className}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </Icon>
);

const Settings = ({ className }) => (
  <Icon className={className}>
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-1.4 3.4h-.2a2 2 0 0 1-1.7-1l-.1-.2a1.7 1.7 0 0 0-1.8-.8 1.7 1.7 0 0 0-1.3 1.3l-.1.2a2 2 0 0 1-3.4 0l-.1-.2a1.7 1.7 0 0 0-1.3-1.3 1.7 1.7 0 0 0-1.8.8l-.1.2a2 2 0 0 1-1.7 1h-.2a2 2 0 0 1-1.4-3.4l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.4-1l-.2-.1a2 2 0 0 1 0-3.4l.2-.1a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 5.6 3.6h.2a2 2 0 0 1 1.7 1l.1.2a1.7 1.7 0 0 0 1.8.8 1.7 1.7 0 0 0 1.3-1.3l.1-.2a2 2 0 0 1 3.4 0l.1.2a1.7 1.7 0 0 0 1.3 1.3 1.7 1.7 0 0 0 1.8-.8l.1-.2a2 2 0 0 1 1.7-1h.2a2 2 0 0 1 1.4 3.4l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1l.2.1a2 2 0 0 1 0 3.4l-.2.1a1.7 1.7 0 0 0-1.4 1Z" />
  </Icon>
);

const Shield = ({ className }) => (
  <Icon className={className}>
    <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4Z" />
    <path d="M12 7v10" />
    <path d="M8.5 10.5 12 7l3.5 3.5" />
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

const VolumeX = ({ className }) => (
  <Icon className={className}>
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="M23 9l-6 6" />
    <path d="M17 9l6 6" />
  </Icon>
);

const Wand2 = ({ className }) => (
  <Icon className={className}>
    <path d="M15 4 4 15" />
    <path d="M10 9l5 5" />
    <path d="M16 2l1 3" />
    <path d="M20 6l-3-1" />
    <path d="M18 10l2 2" />
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
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold ring-1 whitespace-nowrap transition", cls)}>
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", children, onClick, disabled, left, title }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "text-white hover:brightness-95 shadow-md shadow-orange-500/20"
      : tone === "danger"
        ? "bg-rose-600 text-white hover:brightness-95 shadow-md shadow-rose-500/20"
        : tone === "ghost"
          ? "bg-transparent text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-900"
          : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 shadow-sm";
  return (
    <button
      title={title}
      className={cx(base, cls)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      type="button"
    >
      {left}
      <span className="truncate">{children}</span>
    </button>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => (!disabled ? onChange(!value) : undefined)}
      className={cx(
        "relative inline-flex h-5 w-10 sm:h-6 sm:w-11 items-center rounded-full transition-colors",
        disabled ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed" : value ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-300 dark:bg-slate-700"
      )}
      aria-pressed={value}
    >
      <span className={cx("inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-md transition", value ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

function Modal({ open, title, onClose, children, right, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-x-0 bottom-0 top-0 mx-auto flex w-full flex-col bg-white dark:bg-slate-950 shadow-2xl transition sm:inset-y-12 sm:rounded-[1.25rem] sm:ring-1 sm:ring-slate-200 dark:sm:ring-slate-800 overflow-hidden"
        style={{ maxWidth: wide ? "1100px" : "700px" }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm sm:hidden" onClick={onClose} />
        <div className="relative flex flex-col h-full bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</div>
            </div>
            <div className="flex items-center gap-3">
              {right}
              <button
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>

      <div className="fixed inset-0 -z-10 bg-slate-900/40 backdrop-blur-sm hidden sm:block" onClick={onClose} />
    </div>
  );
}

function Drawer({ open, title, onClose, children, widthClass = "max-w-xl" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={cx("absolute right-0 top-0 h-full w-full bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-out sm:ring-1 sm:ring-slate-200 dark:sm:ring-slate-800", widthClass)}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</div>
            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function SupplierSafetyModerationPage() {
  const navigate = useNavigate();
  const safeNav = (url) => safeNavTo(navigate, url);
  const sp = useMemo(() => parseSearch(), []);
  const sessionId = sp.get("sessionId") ?? "LS-20418";

  const [plan, setPlan] = useState("Pro");
  const isPro = plan === "Pro";

  // Supplier-aware role modes
  // - supplier_hosted: Supplier is hosting (acts as creator) -> direct actions
  // - using_creator: Creator is hosting -> request-only actions
  // - ops_viewer: read-only
  const [roleMode, setRoleMode] = useState("supplier_hosted");
  const canModerateDirect = roleMode === "supplier_hosted";
  const canModerateRequest = roleMode === "using_creator";
  const canEditPolicies = roleMode !== "ops_viewer";

  const session = useMemo(
    () => ({
      id: sessionId,
      title: "Autumn Beauty Flash",
      status: "Live",
      startedISO: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      endsISO: new Date(Date.now() + 58 * 60 * 1000).toISOString(),
    }),
    [sessionId]
  );

  const destinations = useMemo(
    () => [
      { id: "yt", name: "YouTube Live", type: "Video Live", status: "Connected", liveState: "Live", supportsChat: true, supportsMuteChat: true, supportsEmergencyActions: true },
      { id: "tt", name: "TikTok Live", type: "Video Live", status: "Connected", liveState: "Live", supportsChat: true, supportsMuteChat: false, supportsEmergencyActions: false },
      { id: "ig", name: "Instagram Live", type: "Community Live", status: "Needs re-auth", liveState: "Not live", supportsChat: true, supportsMuteChat: false, supportsEmergencyActions: false },
      { id: "fb", name: "Facebook Live", type: "Video Live", status: "Connected", liveState: "Live", supportsChat: true, supportsMuteChat: true, supportsEmergencyActions: true },
    ],
    []
  );

  const [activeDestId, setActiveDestId] = useState(destinations[0].id);

  const allMessages = useMemo(
    () => [
      { id: "m1", destId: "yt", userName: "Amara K.", handle: "@amarak", text: "Is the GlowUp bundle available for delivery today?", atISO: new Date(Date.now() - 2 * 60 * 1000).toISOString(), flags: [] },
      { id: "m2", destId: "yt", userName: "DealHunter", handle: "@dealhunter", text: "FREE iPhone here 👉 http://bit.ly/scam", atISO: new Date(Date.now() - 3 * 60 * 1000).toISOString(), flags: ["Link", "Spam"] },
      { id: "m3", destId: "tt", userName: "Kato", handle: "@kato_ug", text: "🔥🔥 price drop please!", atISO: new Date(Date.now() - 4 * 60 * 1000).toISOString(), flags: [] },
      { id: "m4", destId: "fb", userName: "Sarah N.", handle: "@sarahn", text: "This is fake, you people are thieves 😡", atISO: new Date(Date.now() - 6 * 60 * 1000).toISOString(), flags: ["Harassment"] },
      { id: "m5", destId: "fb", userName: "VIP Buyer", handle: "@vipbuyer", text: "Added to cart. waiting for checkout link!", atISO: new Date(Date.now() - 8 * 60 * 1000).toISOString(), flags: [] },
      { id: "m6", destId: "tt", userName: "Spammy", handle: "@spammy", text: "follow me for dealz, follow follow follow", atISO: new Date(Date.now() - 9 * 60 * 1000).toISOString(), flags: ["Spam"] },
    ],
    []
  );

  const [search, setSearch] = useState("");
  const [hideHandled, setHideHandled] = useState(false);

  // handled map: none|requested|resolved
  const [handled, setHandled] = useState({});

  const filteredMessages = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allMessages
      .filter((m) => m.destId === activeDestId)
      .filter((m) => (hideHandled ? Boolean(handled[m.id]) === false : true))
      .filter((m) => (s ? `${m.userName} ${m.handle} ${m.text}`.toLowerCase().includes(s) : true))
      .sort((a, b) => new Date(b.atISO).getTime() - new Date(a.atISO).getTime());
  }, [allMessages, activeDestId, search, hideHandled, handled]);

  const [keywordRules, setKeywordRules] = useState([
    { id: "k1", phrase: "http://", match: "Contains", action: "Flag", scope: "All destinations", destinationIds: undefined, enabled: true },
    { id: "k2", phrase: "free iphone", match: "Contains", action: "Block", scope: "All destinations", destinationIds: undefined, enabled: true },
    { id: "k3", phrase: "thieves", match: "Exact", action: "Mask", scope: "Selected destinations", destinationIds: ["fb"], enabled: true },
  ]);

  const [muteChat, setMuteChat] = useState({ yt: false, tt: false, ig: false, fb: false });
  const [pauseNotifications, setPauseNotifications] = useState(false);

  const [autoModeration, setAutoModeration] = useState(true);
  const [slowMode, setSlowMode] = useState(false);
  const [linkBlocking, setLinkBlocking] = useState(true);

  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Actions modal
  const [actionOpen, setActionOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState(null); // delete|timeout|ban

  const openAction = (m, t) => {
    setActionTarget(m);
    setActionType(t);
    setActionOpen(true);
  };

  const confirmAction = () => {
    if (!actionTarget || !actionType) return;

    // Supplier-hosted: resolved immediately. Using creator: request logged.
    const status = canModerateDirect ? "resolved" : "requested";
    setHandled((s) => ({ ...s, [actionTarget.id]: { status, action: actionType, atISO: new Date().toISOString() } }));
    setActionOpen(false);
    setToast(`${status === "resolved" ? "Action applied" : "Request sent"}: ${actionType.toUpperCase()} on ${actionTarget.handle}`);
  };

  // Incident
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState("Harassment");
  const [incidentSeverity, setIncidentSeverity] = useState("Medium");
  const [incidentText, setIncidentText] = useState("");
  const [includeLogs, setIncludeLogs] = useState(true);

  // Keyword drawer
  const [keywordDrawer, setKeywordDrawer] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordAction, setNewKeywordAction] = useState("Flag");
  const [newKeywordMatch, setNewKeywordMatch] = useState("Contains");
  const [newKeywordScope, setNewKeywordScope] = useState("All destinations");
  const [newKeywordDestIds, setNewKeywordDestIds] = useState({ yt: true, tt: true, ig: true, fb: true });

  const addKeyword = () => {
    const phrase = newKeyword.trim();
    if (!phrase) return;
    const id = `k_${Math.random().toString(16).slice(2)}`;
    const destIds =
      newKeywordScope === "Selected destinations"
        ? Object.entries(newKeywordDestIds)
            .filter(([, v]) => v)
            .map(([k]) => k)
        : undefined;

    setKeywordRules((s) => [
      {
        id,
        phrase,
        match: newKeywordMatch,
        action: newKeywordAction,
        scope: newKeywordScope,
        destinationIds: destIds,
        enabled: true,
      },
      ...s,
    ]);

    setKeywordDrawer(false);
    setNewKeyword("");
    setToast("Keyword rule added");
  };

  const preflight = useMemo(() => {
    return [
      { label: "At least 1 destination Live", ok: destinations.some((d) => d.liveState === "Live") },
      { label: "Keyword filters enabled", ok: keywordRules.some((k) => k.enabled) },
      { label: "Notifications active", ok: !pauseNotifications, detail: pauseNotifications ? "Paused (sales impact risk)" : undefined },
      ...(roleMode === "using_creator" ? [{ label: "Creator escalation channel", ok: true, detail: "Requests routed to Creator + Ops" }] : []),
    ];
  }, [destinations, keywordRules, pauseNotifications, roleMode]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
        <div className="w-full px-[0.55%] py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <button className="hover:text-slate-900 dark:hover:text-slate-100 transition" onClick={() => safeNav(ROUTES.liveDashboard)}>
                  Supplier Live Pro
                </button>
                <ChevronDown className="h-3 w-3 -rotate-90 text-slate-300 dark:text-slate-700" />
                <span className="text-slate-900 dark:text-slate-50">Safety & Moderation</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="truncate text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{session.title}</div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Pill tone={session.status === "Live" ? "good" : session.status === "Scheduled" ? "warn" : "neutral"}>
                    <Timer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {session.status}
                  </Pill>
                  <Pill tone="neutral">
                    <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {session.id}
                  </Pill>
                  <Pill tone={isPro ? "pro" : "neutral"}>
                    {isPro ? <BadgeCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                    {plan}
                  </Pill>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Start:</span>
                  <span className="text-slate-700 dark:text-slate-300">{fmtLocal(session.startedISO)}</span>
                </div>
                <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">End:</span>
                  <span className="text-slate-700 dark:text-slate-300">{fmtLocal(session.endsISO)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 px-3 py-2 text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition shadow-sm"
                onClick={() => setPlan((p) => (p === "Pro" ? "Standard" : "Pro"))}
                title="Demo: toggle plan"
                type="button"
              >
                <Zap className="h-4 w-4 text-amber-500" />
                Plan: {plan}
              </button>

              <select
                value={roleMode}
                onChange={(e) => setRoleMode(e.target.value)}
                className="h-10 rounded-xl bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                title="Role mode"
              >
                <option value="supplier_hosted">Supplier (Direct Control)</option>
                <option value="using_creator">Supplier (Using Creator)</option>
                <option value="ops_viewer">Support Ops (Viewer)</option>
              </select>

              <Btn
                tone="ghost"
                onClick={async () => {
                  const ok = await safeCopy(`https://mylivedealz.com/live/${session.id}`);
                  setToast(ok ? "Copied replay/live link" : "Copy failed");
                }}
                left={<Copy className="h-4 w-4" />}
                title="Copy direct stream link"
              >
                Link
              </Btn>

              <Btn tone="danger" onClick={() => setIncidentOpen(true)} left={<Flag className="h-4 w-4" />} disabled={!canEditPolicies}>
                Escalate
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full px-[0.55%] py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Chat moderation */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Chat moderation</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Manage real-time interactions and enforce safety rules.</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-800 focus-within:ring-2 focus-within:ring-slate-400 transition">
                      <Search className="h-4 w-4 text-slate-500 dark:text-slate-500" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search chat…"
                        className="w-full sm:w-40 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Hide handled</span>
                    <Toggle value={hideHandled} onChange={setHideHandled} />
                  </div>
                </div>
              </div>

              {/* Destination tabs */}
              <div className="mt-5 flex flex-wrap gap-2">
                {destinations.map((d) => {
                  const active = d.id === activeDestId;
                  const statusTone = d.status === "Connected" ? "good" : d.status === "Needs re-auth" || d.status === "Stream key missing" ? "warn" : "bad";
                  return (
                    <button
                      key={d.id}
                      onClick={() => setActiveDestId(d.id)}
                      className={cx(
                        "flex items-center gap-2 rounded-2xl h-10 px-4 text-[10px] sm:text-xs font-bold ring-1 transition uppercase tracking-wider active:scale-[0.98]",
                        active
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-slate-900 dark:ring-slate-100 shadow-md"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
                      )}
                      type="button"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{d.name}</span>
                      <Pill tone={statusTone}>{d.status}</Pill>
                    </button>
                  );
                })}
              </div>

              {/* Chat list */}
              <div className="mt-5 space-y-3">
                {filteredMessages.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-6 ring-1 ring-slate-200 dark:ring-slate-800 text-center">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-50">No messages</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try another destination or clear filters.</div>
                  </div>
                ) : null}

                {filteredMessages.map((m) => {
                  const handledState = handled[m.id]?.status;
                  const isHandled = Boolean(handledState);
                  const requestOrResolvedLabel =
                    handledState === "requested" ? "Requested" : handledState === "resolved" ? "Resolved" : null;

                  return (
                    <div key={m.id} className={cx("rounded-2xl bg-white dark:bg-slate-950 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition", isHandled ? "opacity-80" : "")}> 
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{m.userName}</div>
                            <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500">{m.handle}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{agoLabel(m.atISO)}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {m.flags.map((f) => (
                                <Pill key={f} tone={f === "Harassment" ? "bad" : "warn"}>
                                  <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  {f}
                                </Pill>
                              ))}
                              {requestOrResolvedLabel ? (
                                <Pill tone={handledState === "resolved" ? "good" : "warn"}>
                                  {handledState === "resolved" ? <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                                  {requestOrResolvedLabel}
                                </Pill>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">{m.text}</div>

                          {roleMode === "using_creator" ? (
                            <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-tight flex items-center gap-1.5 bg-amber-500/10 p-2 rounded-xl">
                              <Info className="h-3.5 w-3.5" />
                              Creator-hosted: actions are requests
                            </div>
                          ) : roleMode === "ops_viewer" ? (
                            <div className="mt-2 text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-tight flex items-center gap-1.5 bg-orange-500/5 p-2 rounded-xl">
                              <Info className="h-3.5 w-3.5" />
                              Viewer mode (Read Only)
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0">
                          <Btn
                            tone="ghost"
                            disabled={(!canModerateDirect && !canModerateRequest) || isHandled}
                            onClick={() => openAction(m, "delete")}
                            left={<Trash2 className="h-4 w-4" />}
                          >
                            {canModerateRequest ? "Request delete" : "Delete"}
                          </Btn>
                          <Btn
                            tone="ghost"
                            disabled={(!canModerateDirect && !canModerateRequest) || isHandled}
                            onClick={() => openAction(m, "timeout")}
                            left={<VolumeX className="h-4 w-4" />}
                          >
                            {canModerateRequest ? "Request timeout" : "Timeout"}
                          </Btn>
                          <Btn
                            tone="danger"
                            disabled={(!canModerateDirect && !canModerateRequest) || isHandled}
                            onClick={() => openAction(m, "ban")}
                            left={<Ban className="h-4 w-4" />}
                          >
                            {canModerateRequest ? "Request ban" : "Ban"}
                          </Btn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Moderation controls */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Advanced Guardrails</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Automated rules to reduce overhead during surges.</div>
                </div>
                <Pill tone={isPro ? "pro" : "neutral"}>
                  {isPro ? <BadgeCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  PRO
                </Pill>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col justify-between rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Auto-Pilot</div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Remove spam patterns & repeat offenders automatically.</div>
                    </div>
                    <Toggle value={autoModeration} onChange={setAutoModeration} disabled={!canEditPolicies} />
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Block Links</div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Suppress third-party URLs to prevent fraud and scams.</div>
                    </div>
                    <Toggle value={linkBlocking} onChange={setLinkBlocking} disabled={!canEditPolicies} />
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Slow Mode</div>
                        <BadgeCheck className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Limit chat frequency to 1 msg every 5s during peaks.</div>
                    </div>
                    <Toggle value={slowMode} onChange={setSlowMode} disabled={!canEditPolicies || !isPro} />
                  </div>
                  {!isPro ? <div className="mt-2 text-[10px] font-bold text-violet-600/60 dark:text-violet-400/40 uppercase tracking-tighter">Requires Pro Upgrade</div> : null}
                </div>

                <div className="flex flex-col justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20 transition">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-500 shrink-0" />
                    <div>
                      <div className="text-[11px] sm:text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-tight">Policy Reminder</div>
                      <div className="mt-1 text-[10px] sm:text-xs text-amber-800/80 dark:text-amber-500/70 leading-relaxed font-semibold">Avoid removing legitimate buyer feedback. Only moderate harassment and harmful content.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Emergency actions */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Emergency Protocol</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Instantly silence chat feeds during incidents.</div>
                </div>
                <Pill tone="warn">
                  <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  HIGH RISK
                </Pill>
              </div>

              <div className="mt-4 space-y-2.5">
                {destinations.map((d) => {
                  const canMute = d.supportsMuteChat && d.supportsChat;
                  const muted = Boolean(muteChat[d.id]);
                  const disabledDirect = !canModerateDirect || !canMute;

                  return (
                    <div key={d.id} className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-3 sm:p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition group hover:shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{d.name}</div>
                            <div className="flex gap-1.5">
                              <Pill tone={d.liveState === "Live" ? "good" : "warn"}>
                                {d.liveState === "Live" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                {d.liveState}
                              </Pill>
                              {!canMute ? (
                                <Pill tone="neutral">
                                  <Info className="h-3 w-3" />
                                  Unsupported
                                </Pill>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-1 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-tight">
                            {canMute ? "Direct API link active" : "Platform does not support remote mute"}
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <Toggle
                            value={muted}
                            onChange={(v) => {
                              // direct mute only if supplier-hosted
                              if (!canModerateDirect) return;
                              setMuteChat((s) => ({ ...s, [d.id]: v }));
                              setToast(v ? `Muted ${d.name}` : `Unmuted ${d.name}`);
                            }}
                            disabled={disabledDirect}
                          />
                          {muted ? <span className="text-[10px] font-black text-rose-500 uppercase">Silenced</span> : null}
                        </div>
                      </div>

                      {roleMode === "using_creator" && canMute ? (
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20">
                          <div className="text-[10px] sm:text-xs font-bold text-amber-900 dark:text-amber-400">
                            Creator-hosted: use “Request” for emergency actions.
                          </div>
                          <Btn
                            tone="primary"
                            disabled={!canModerateRequest}
                            onClick={() => setToast(`Mute request sent to Creator for ${d.name}`)}
                            left={<AlertTriangle className="h-4 w-4" />}
                          >
                            Request mute
                          </Btn>
                        </div>
                      ) : roleMode === "ops_viewer" ? (
                        <div className="mt-3 text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tighter bg-orange-500/5 p-2 rounded-lg">Viewer Mode: Locked</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pause notifications */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Broadcast Control</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Halt outgoing push notifications instantly.</div>
                </div>
                <Pill tone={pauseNotifications ? "bad" : "neutral"}>
                  <BellOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {pauseNotifications ? "PAUSED" : "ACTIVE"}
                </Pill>
              </div>

              <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Freeze Notifications</div>
                    <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 font-semibold leading-tight capitalize">
                      Stops "Live Now", deal drops, and countdown pushes.
                    </div>
                  </div>
                  <Toggle value={pauseNotifications} onChange={setPauseNotifications} disabled={!canEditPolicies} />
                </div>

                {pauseNotifications ? (
                  <div className="mt-4 rounded-2xl bg-rose-50 dark:bg-rose-500/5 p-4 ring-1 ring-rose-200 dark:ring-rose-500/20 text-xs text-rose-800 dark:text-rose-400">
                    <div className="font-black uppercase tracking-wider mb-1">Impact Warning</div>
                    <div className="font-semibold leading-relaxed">Pausing broadcasts will likely reduce viewership and GMV participation for the next 15 minutes.</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Keyword filters */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Smart Filters</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Mask or block specific phrases across your chat rooms.</div>
                </div>

                <div className="flex items-center gap-2">
                  <Btn tone="primary" onClick={() => setKeywordDrawer(true)} left={<PlusCircle className="h-4 w-4" />} disabled={!canEditPolicies}>
                    Create
                  </Btn>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {keywordRules.map((k) => {
                  const scopeLabel =
                    k.scope === "All destinations"
                      ? "Global"
                      : `Sync: ${(k.destinationIds ?? [])
                          .map((id) => destinations.find((d) => d.id === id)?.name ?? id)
                          .join(", ")}`;

                  return (
                    <div key={k.id} className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition group hover:shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-black text-slate-900 dark:text-slate-100">&quot;{k.phrase}&quot;</div>
                            <div className="flex gap-1.5 flex-wrap">
                              <Pill tone="neutral">
                                <Settings className="h-3 w-3" />
                                {k.match}
                              </Pill>
                              <Pill tone={k.action === "Block" ? "bad" : k.action === "Mask" ? "warn" : "good"}>
                                <Wand2 className="h-3 w-3" />
                                {k.action}
                              </Pill>
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight flex items-center gap-2">
                            <LinkIcon className="h-3 w-3" />
                            {scopeLabel}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <Toggle
                            value={k.enabled}
                            onChange={(v) => setKeywordRules((s) => s.map((x) => (x.id === k.id ? { ...x, enabled: v } : x)))}
                            disabled={!canEditPolicies}
                          />
                          <button
                            disabled={!canEditPolicies}
                            onClick={() => {
                              setKeywordRules((s) => s.filter((x) => x.id !== k.id));
                              setToast("Rule archived");
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition"
                            title="Remove filter rule"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20 text-xs text-amber-900 dark:text-amber-400">
                <div className="font-black uppercase tracking-wider mb-1">Optimizer Tip</div>
                <div className="font-semibold leading-relaxed">
                  Start new rules with <span className="underline decoration-amber-500/40 underline-offset-2">&quot;Flag&quot;</span> to validate accuracy before enabling &quot;Block&quot;.
                </div>
              </div>
            </div>

            {/* Preflight */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">System Integrity</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Vital checks for a secure and stable broadcast.</div>
                </div>
                <Pill tone={preflight.every((x) => x.ok) ? "good" : "warn"}>
                  {preflight.every((x) => x.ok) ? <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                  {preflight.every((x) => x.ok) ? "LOCKED" : "READY"}
                </Pill>
              </div>

              <div className="mt-4 space-y-2">
                {preflight.map((p) => (
                  <div key={p.label} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-3 sm:p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                      {p.label}
                      {p.detail ? <span className="ml-2 text-[10px] font-bold text-slate-500 dark:text-slate-500 normal-case">({p.detail})</span> : null}
                    </div>
                    <Pill tone={p.ok ? "good" : "warn"}>
                      {p.ok ? <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                      {p.ok ? "OK" : "FIX"}
                    </Pill>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action modal */}
        <Modal
          open={actionOpen}
          title={actionType === "delete" ? "Delete message" : actionType === "timeout" ? "Timeout user" : actionType === "ban" ? "Ban user" : "Action"}
          onClose={() => setActionOpen(false)}
          right={
            <Pill tone="neutral">
              <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              CONFIRMED
            </Pill>
          }
        >
          <div className="space-y-6">
            <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Selected Target</div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-50">{actionTarget?.userName}</div>
                  <div className="text-xs font-bold text-slate-500">{actionTarget?.handle}</div>
                </div>
                <BadgeCheck className="h-5 w-5 text-blue-500" />
              </div>
              <div className="mt-4 rounded-xl bg-white dark:bg-slate-900 p-4 text-sm font-medium text-slate-800 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm italic">&quot;{actionTarget?.text}&quot;</div>
            </div>

            <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/5 p-4 ring-1 ring-rose-200 dark:ring-rose-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-400 uppercase tracking-widest">Caution</div>
                  <div className="mt-1 text-xs text-rose-800/80 dark:text-rose-400/80 font-semibold leading-relaxed">
                    {canModerateDirect
                      ? "Actions will be pushed to the primary destination API immediately."
                      : "This will create a moderation request for the host (Creator) and Support Ops."}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Btn tone="ghost" onClick={() => setActionOpen(false)}>
                Cancel
              </Btn>
              <Btn tone={actionType === "ban" ? "danger" : "primary"} onClick={confirmAction} disabled={!canModerateDirect && !canModerateRequest}>
                {canModerateRequest
                  ? "Send request"
                  : actionType === "delete"
                    ? "Delete Permanently"
                    : actionType === "timeout"
                      ? "Silence 10m"
                      : "Permaban"}
              </Btn>
            </div>
          </div>
        </Modal>

        {/* Incident report modal */}
        <Modal
          open={incidentOpen}
          title="Escalation Portal"
          onClose={() => setIncidentOpen(false)}
          right={
            <Pill tone="bad">
              <Flag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              PRIORITY: OPS
            </Pill>
          }
        >
          <div className="space-y-6">
            <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-5 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Category</div>
                  <select
                    value={incidentCategory}
                    onChange={(e) => setIncidentCategory(e.target.value)}
                    className="w-full h-10 rounded-xl bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                  >
                    <option>Harassment</option>
                    <option>Fraud/Scam</option>
                    <option>Impersonation</option>
                    <option>Safety Risk</option>
                    <option>Other</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Severity</div>
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value)}
                    className="w-full h-10 rounded-xl bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </label>
              </div>

              <label className="mt-5 block">
                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Detailed incident log</div>
                <textarea
                  value={incidentText}
                  onChange={(e) => setIncidentText(e.target.value)}
                  rows={4}
                  placeholder="Describe the threat, users involved, and desired outcome from Support Ops..."
                  className="w-full rounded-xl bg-white dark:bg-slate-900 p-4 text-sm font-semibold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
                />
              </label>

              <div className="mt-5 flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Attach Environment Snapshot</div>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight">Recent chat log + meta analysis</div>
                </div>
                <Toggle value={includeLogs} onChange={setIncludeLogs} disabled={!canEditPolicies} />
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-amber-700 dark:text-amber-500 shrink-0" />
                <div>
                  <div className="text-[10px] font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest">Confidentiality Trace</div>
                  <div className="mt-1 text-xs text-amber-800/80 dark:text-amber-500/70 font-semibold leading-relaxed">Reports generate a high-priority ticket for our 24/7 Global Response Team. Include the minimum required data.</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Btn tone="ghost" onClick={() => setIncidentOpen(false)}>
                Dismiss
              </Btn>
              <Btn
                tone="primary"
                onClick={() => {
                  setIncidentOpen(false);
                  setIncidentText("");
                  setToast("Awaiting Ops Response");
                }}
                disabled={!incidentText.trim() || !canEditPolicies}
                left={<Send className="h-4 w-4" />}
              >
                Launch Escalation
              </Btn>
            </div>
          </div>
        </Modal>

        {/* Keyword drawer */}
        <Drawer open={keywordDrawer} title="Construct New Guardrail" onClose={() => setKeywordDrawer(false)} widthClass="max-w-2xl">
          <div className="space-y-6">
            <div className="rounded-2xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-5 ring-1 ring-slate-200 dark:ring-slate-800 transition">
              <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Rule Intelligence</div>

              <label className="block">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Trigger Phrase</div>
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="e.g., free crypto, discord link"
                  className="mt-2 w-full h-11 rounded-xl bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                />
              </label>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Match Precision</div>
                  <select
                    value={newKeywordMatch}
                    onChange={(e) => setNewKeywordMatch(e.target.value)}
                    className="mt-2 w-full h-10 rounded-xl bg-white dark:bg-slate-900 px-4 text-xs font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                  >
                    <option>Contains</option>
                    <option>Exact</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Intervention</div>
                  <select
                    value={newKeywordAction}
                    onChange={(e) => setNewKeywordAction(e.target.value)}
                    className="mt-2 w-full h-10 rounded-xl bg-white dark:bg-slate-900 px-4 text-xs font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                  >
                    <option>Flag</option>
                    <option>Mask</option>
                    <option>Block</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                  <div>
                    <div className="text-[10px] font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest">Efficiency Tip</div>
                    <div className="mt-1 text-xs text-amber-800/80 dark:text-amber-500/70 font-semibold leading-relaxed">"Mask" replaces text with asterisks. "Block" drops the entire message before it hits any destination feed.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Scope Synchronization</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Target specific platforms or apply globally.</div>
                </div>

                <select
                  value={newKeywordScope}
                  onChange={(e) => setNewKeywordScope(e.target.value)}
                  className="h-10 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 px-4 text-xs font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800"
                >
                  <option>All destinations</option>
                  <option>Selected destinations</option>
                </select>
              </div>

              {newKeywordScope === "Selected destinations" ? (
                <div className="mt-5 grid grid-cols-1 gap-2.5">
                  {destinations.map((d) => (
                    <label key={d.id} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 hover:shadow-sm transition group">
                      <div className="text-xs font-black text-slate-900 dark:text-slate-50 uppercase tracking-tight">{d.name}</div>
                      <Toggle value={Boolean(newKeywordDestIds[d.id])} onChange={(v) => setNewKeywordDestIds((s) => ({ ...s, [d.id]: v }))} disabled={!canEditPolicies} />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-5 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/20 p-4 rounded-xl text-center">
                  Global Policy Enforcement: ON
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Btn tone="ghost" onClick={() => setKeywordDrawer(false)}>
                Discard
              </Btn>
              <Btn tone="primary" onClick={addKeyword} disabled={!newKeyword.trim() || !canEditPolicies}>
                Activate Rule
              </Btn>
            </div>
          </div>
        </Drawer>

        {/* Toast */}
        {toast ? (
          <div className="fixed bottom-6 left-1/2 z-[150] -translate-x-1/2">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 dark:bg-slate-100 px-6 py-3 text-sm font-black text-white dark:text-slate-900 shadow-2xl uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-300">
              {toast}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierSafetyModerationPage test failed: ${msg}`);
  };
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "ORANGE exists");
  console.log("✅ SupplierSafetyModerationPage self-tests passed");
}
