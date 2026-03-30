import React, { useCallback, useEffect, useMemo, useState } from "react";

/**
 * SupplierLiveAlertsManagerPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: LiveAlertsManager.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Sticky header (breadcrumbs + session meta + quick actions)
 * - One-tap send tiles with frequency caps + wait countdown
 * - Flash deal context panel + safeguardrails panel
 * - Destinations list with toggles + per-channel “Pin link to chat” helper
 * - Preview panel (selected alert) + copy + send-with-confirm
 * - Recommended cadence cards
 * - Confirm modal with Preflight checks + editable draft + phone mock preview
 *
 * Supplier adaptations (minimal + required):
 * - Role copy: Supplier App → Live → Live Alerts Manager
 * - Adds Campaign context + optional “Also request Creator send” (creates a request/task instead of sending from Supplier channels).
 * - Keeps Supplier-side sends as primary; Creator request is an add-on for campaigns that use creators.
 *
 * Notes:
 * - Canvas-safe: no MUI, no lucide-react, no external contexts/hooks.
 * - Replace mock data with real Campaign/Session state from your store + routing.
 * - RBAC comments included where you’d gate send/manage actions.
 */

const ORANGE = "#F77F00";

/* ------------------------------ utilities ------------------------------ */

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
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

function msToLabel(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

function buildLiveLink(sessionId) {
  return `/live/${encodeURIComponent(sessionId)}`;
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

/* ------------------------------ toast ------------------------------ */

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
            "rounded-2xl border px-3 py-2 text-sm shadow-sm bg-white dark:bg-slate-950",
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

/* ------------------------------ async action ------------------------------ */

function useAsyncAction(toast) {
  const [isPending, setIsPending] = useState(false);

  const run = async (fn, { successMessage, errorMessage } = {}) => {
    setIsPending(true);
    try {
      await fn();
      toast?.(successMessage || "Done", "success");
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

/* ------------------------------ icons (inline svg) ------------------------------ */

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

const Bell = ({ className }) => (
  <Icon className={className}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
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

const Flame = ({ className }) => (
  <Icon className={className}>
    <path d="M12 2s4 4 4 9a4 4 0 0 1-8 0c0-2.5 1.5-4.5 3-6" />
    <path d="M12 22a6 6 0 0 0 6-6c0-2.5-1.3-4.4-3-6" />
  </Icon>
);

const Info = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6" />
    <path d="M12 7h.01" />
  </Icon>
);

const Link2 = ({ className }) => (
  <Icon className={className}>
    <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
    <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
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

const Send = ({ className }) => (
  <Icon className={className}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </Icon>
);

const Timer = ({ className }) => (
  <Icon className={className}>
    <path d="M10 2h4" />
    <path d="M12 14V8" />
    <circle cx="12" cy="14" r="8" />
  </Icon>
);

const X = ({ className }) => (
  <Icon className={className}>
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </Icon>
);

const XCircle = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9 9 15" />
    <path d="M9 9l6 6" />
  </Icon>
);

const Zap = ({ className }) => (
  <Icon className={className}>
    <path d="M13 2 3 14h8l-1 8 11-14h-8l1-6z" />
  </Icon>
);



/* ------------------------------ UI primitives ------------------------------ */

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
            : "bg-neutral-100 text-neutral-800 ring-neutral-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold ring-1 whitespace-nowrap",
        cls
      )}
    >
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", disabled, loading, left, onClick, children, title }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "bg-[#F77F00] text-white hover:brightness-95 shadow-sm"
      : tone === "ghost"
        ? "bg-transparent text-neutral-900 dark:text-slate-50 hover:bg-neutral-100 dark:hover:bg-slate-800"
        : "bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800 shadow-sm";

  return (
    <button title={title} className={cn(base, cls)} onClick={disabled ? undefined : onClick} disabled={disabled} type="button">
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
        disabled ? "bg-neutral-200 dark:bg-slate-800 cursor-not-allowed" : value ? "bg-neutral-900 dark:bg-slate-100" : "bg-neutral-300 dark:bg-slate-700"
      )}
      aria-pressed={value}
    >
      <span className={cn("inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-sm transition", value ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-full max-w-2xl flex-col bg-white dark:bg-slate-950 shadow-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[16px] sm:rounded-3xl transition-all overflow-hidden border-t sm:border border-neutral-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-slate-800 px-4 py-3">
          <div className="text-base font-semibold text-neutral-900 dark:text-slate-50">{title}</div>
          <Btn tone="ghost" onClick={onClose} left={<X className="h-4 w-4" />}>
            Close
          </Btn>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

export default function SupplierLiveAlertsManagerPage() {
  const { toasts, push } = useToasts();
  const { run, isPending } = useAsyncAction((msg, tone) => push(msg, tone));

  // Demo: Session + Campaign context
  const session = useMemo(
    () => ({
      id: "LS-20418",
      title: "Autumn Beauty Flash",
      status: "Live", // Draft | Scheduled | Live | Ended
      startedISO: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
      endsISO: new Date(Date.now() + 51 * 60 * 1000).toISOString(),
    }),
    []
  );

  const campaign = useMemo(
    () => ({
      id: "S-201",
      name: "Beauty Flash Week (Combo)",
      creatorUsageDecision: "I will use a Creator", // supplier flow hint
      creators: [
        { id: "CR-01", name: "Amina K", handle: "amina_live" },
        { id: "CR-02", name: "Kofi Mensah", handle: "kofi_live" },
      ],
    }),
    []
  );

  const liveLink = useMemo(() => buildLiveLink(session.id), [session.id]);

  // Supplier add-on: also request creators to send an alert to their own audience
  const [alsoRequestCreator, setAlsoRequestCreator] = useState(campaign.creatorUsageDecision === "I will use a Creator");
  const [selectedCreatorIds, setSelectedCreatorIds] = useState(() => campaign.creators.map((c) => c.id));

  const channels = useMemo(
    () => [
      {
        key: "whatsapp",
        name: "WhatsApp",
        short: "WA",
        status: "Connected",
        supportsPin: true,
        pinHint: "Pin the live link message so late joiners can tap it quickly.",
      },
      {
        key: "telegram",
        name: "Telegram",
        short: "TG",
        status: "Connected",
        supportsPin: true,
        pinHint: "Pin the latest message in the channel/group to keep the link visible.",
      },
      {
        key: "line",
        name: "LINE",
        short: "LINE",
        status: "Needs re-auth",
        supportsPin: true,
        pinHint: "Reconnect your LINE account, then pin the live link message.",
      },
      {
        key: "viber",
        name: "Viber",
        short: "Viber",
        status: "Connected",
        supportsPin: true,
        pinHint: "Pin one live link message so it stays visible while you’re live.",
      },
      {
        key: "rcs",
        name: "RCS",
        short: "RCS",
        status: "Connected",
        supportsPin: false,
        pinHint: "Pinning varies by device. Keep alerts spaced out and resend sparingly.",
      },
    ],
    []
  );

  const templates = useMemo(
    () => [
      {
        key: "were_live",
        title: "We’re live",
        subtitle: "Kick off attendance fast.",
        minIntervalMinutes: 8,
        icon: <Bell className="h-4 w-4" />,
        build: ({ sessionTitle, link }) => `🔴 We’re LIVE: ${sessionTitle}\nTap to join: ${link}`,
      },
      {
        key: "flash_deal",
        title: "Flash deal",
        subtitle: "Announce a drop (with caps).",
        minIntervalMinutes: 10,
        icon: <Flame className="h-4 w-4" />,
        build: ({ sessionTitle, link, dealName, endsIn }) =>
          `⚡ Flash deal: ${dealName}\nLive in: ${sessionTitle}\nEnds in ${endsIn} • Tap: ${link}`,
      },
      {
        key: "last_chance",
        title: "Last chance",
        subtitle: "Final push before end.",
        minIntervalMinutes: 12,
        icon: <Timer className="h-4 w-4" />,
        build: ({ sessionTitle, link, endsIn }) => `⏳ Last chance!\n${sessionTitle}\nEnding in ${endsIn} • Join: ${link}`,
      },
    ],
    []
  );

  const [enabledDest, setEnabledDest] = useState({
    whatsapp: true,
    telegram: true,
    line: false,
    viber: false,
    rcs: false,
  });

  const enabledChannels = useMemo(() => channels.filter((c) => enabledDest[c.key]), [channels, enabledDest]);

  const [dealName, setDealName] = useState("GlowUp Serum Bundle");
  const [dealEndsMinutes, setDealEndsMinutes] = useState(10);

  // cap timestamps (demo)
  const [lastSent, setLastSent] = useState({
    were_live: Date.now() - 11 * 60 * 1000,
    flash_deal: Date.now() - 20 * 60 * 1000,
    last_chance: Date.now() - 40 * 60 * 1000,
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const canSend = useCallback(
    (t) => Date.now() - (lastSent[t.key] ?? 0) >= t.minIntervalMinutes * 60 * 1000,
    [lastSent]
  );
  const nextWaitMs = (t) =>
    Math.max(0, t.minIntervalMinutes * 60 * 1000 - (Date.now() - (lastSent[t.key] ?? 0)));

  const buildBody = (t) =>
    t.build({
      sessionTitle: session.title,
      link: liveLink,
      dealName,
      endsIn: `${dealEndsMinutes}m`,
    });

  const [active, setActive] = useState(templates[0]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draftText, setDraftText] = useState("");

  const openConfirm = (t) => {
    setActive(t);
    setDraftText(buildBody(t));
    setConfirmOpen(true);
  };

  const selectedCreators = useMemo(
    () => campaign.creators.filter((c) => selectedCreatorIds.includes(c.id)),
    [campaign.creators, selectedCreatorIds]
  );

  const preflightIssues = useMemo(() => {
    const _unused = tick;
    const issues = [];
    // Live Alerts are intended for real-time.
    if (session.status !== "Live") issues.push("Session is not Live. Use Audience Notifications for scheduled alerts.");
    if (enabledChannels.length === 0) issues.push("Enable at least one destination.");
    if (enabledChannels.some((c) => c.status !== "Connected")) issues.push("Some enabled destinations need re-auth or are blocked.");
    if (!canSend(active)) issues.push("Frequency cap active for this alert.");

    if (campaign.creatorUsageDecision === "I will use a Creator" && alsoRequestCreator && selectedCreatorIds.length === 0) {
      issues.push("Select at least one creator to request a send.");
    }

    return issues;
  }, [enabledChannels, active, tick, canSend, session.status, alsoRequestCreator, selectedCreatorIds, campaign.creatorUsageDecision]);

  const blocked = preflightIssues.length > 0 || isPending;

  const send = () => {
    // RBAC: require supplier.live.alerts.send permission.
    run(
      async () => {
        // simulate network
        await new Promise((r) => setTimeout(r, 600));
        setLastSent((s) => ({ ...s, [active.key]: Date.now() }));

        // Supplier add-on: create creator request tasks (demo)
        if (campaign.creatorUsageDecision === "I will use a Creator" && alsoRequestCreator && selectedCreatorIds.length > 0) {
          await new Promise((r) => setTimeout(r, 250));
        }

        setConfirmOpen(false);
      },
      {
        successMessage: `Sent “${active.title}” to ${enabledChannels.length} destination(s)` +
          (campaign.creatorUsageDecision === "I will use a Creator" && alsoRequestCreator
            ? ` + requested ${selectedCreatorIds.length} creator(s)`
            : ""),
      }
    );
  };

  const statusTone = (s) => (s === "Connected" ? "good" : s === "Needs re-auth" ? "warn" : "bad");

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
        <div className="w-full flex items-center justify-between gap-3 px-[0.55%] py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-neutral-500 dark:text-slate-400">
              <span className="font-medium text-neutral-700 dark:text-slate-300">Supplier App</span>
              <span>•</span>
              <span className="text-neutral-900 dark:text-slate-200">Live</span>
              <span>•</span>
              <span className="text-neutral-900 dark:text-slate-200">Live Alerts Manager</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="truncate text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{session.title}</div>
              <div className="flex items-center gap-1.5">
                <Pill tone="good">
                  <Bell className="h-3.5 w-3.5" />
                  {session.status}
                </Pill>
                <Pill title={liveLink}>
                  <Link2 className="h-3.5 w-3.5" />
                  Link
                </Pill>
                <Pill tone={campaign.creatorUsageDecision === "I will use a Creator" ? "pro" : "neutral"} title="Campaign collaboration context">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {campaign.creatorUsageDecision === "I will use a Creator" ? "Using Creator" : "Supplier-hosted"}
                </Pill>
              </div>
            </div>

            <div className="mt-1 text-[10px] sm:text-xs text-neutral-600 dark:text-slate-400">
              Started <span className="font-semibold text-neutral-900 dark:text-slate-200">{fmtLocal(session.startedISO)}</span>{" "}
              <span className="text-neutral-300 dark:text-slate-700">•</span> Ends{" "}
              <span className="font-semibold text-neutral-900 dark:text-slate-200">{fmtLocal(session.endsISO)}</span>
              <span className="text-neutral-300 dark:text-slate-700">•</span>{" "}
              <span className="font-semibold text-neutral-900 dark:text-slate-200">Campaign:</span> {campaign.name}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <Btn
                tone="ghost"
                onClick={async () => {
                  const ok = await safeCopy(liveLink);
                  push(ok ? "Copied live link" : "Copy failed", ok ? "success" : "error");
                }}
                left={<Copy className="h-4 w-4" />}
              >
                Copy link
              </Btn>
            </div>
            <Btn
              tone="primary"
              onClick={() => openConfirm(templates[0])}
              disabled={!canSend(templates[0])}
              left={<Zap className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">Quick “We’re live”</span>
              <span className="sm:hidden">Alert</span>
            </Btn>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full px-[0.55%] py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-7 space-y-4">
            {/* One-tap tiles */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">One‑tap send</div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">Fast alerts with caps + confirm (keeps you safe while live).</div>
                </div>
                <Pill tone="pro">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Guardrails
                </Pill>
              </div>

              {/* Supplier addition: Creator request add-on */}
              {campaign.creatorUsageDecision === "I will use a Creator" ? (
                <div className="mt-3 rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-slate-50">Creator coordination</div>
                      <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                        Optional: request assigned creators to send this alert on their own channels (creates a task/request).
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill tone={alsoRequestCreator ? "good" : "neutral"}>
                        {alsoRequestCreator ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                        {alsoRequestCreator ? "Request ON" : "Request OFF"}
                      </Pill>
                      <Toggle value={alsoRequestCreator} onChange={setAlsoRequestCreator} />
                    </div>
                  </div>

                  {alsoRequestCreator ? (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {campaign.creators.map((cr) => {
                        const checked = selectedCreatorIds.includes(cr.id);
                        return (
                          <label
                            key={cr.id}
                            className={cn(
                              "flex items-start gap-2 rounded-2xl border px-3 py-2 cursor-pointer transition",
                              checked
                                ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-500/10"
                                : "border-neutral-200 bg-neutral-50 dark:border-slate-800 dark:bg-slate-900"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={checked}
                              onChange={() => {
                                setSelectedCreatorIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(cr.id)) next.delete(cr.id);
                                  else next.add(cr.id);
                                  return Array.from(next);
                                });
                              }}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50 truncate">{cr.name}</div>
                              <div className="text-[10px] text-neutral-600 dark:text-slate-400 truncate">@{cr.handle}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="mt-2 text-[10px] text-neutral-600 dark:text-slate-500">
                    Permission note: request-creation should be audited and gated (e.g., <b>collabs.request_create</b>).
                  </div>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {templates.map((t) => {
                  const ok = canSend(t);
                  const waitMs = nextWaitMs(t);
                  return (
                    <div key={t.key} className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-neutral-200 dark:ring-slate-800">
                            {t.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-neutral-900 dark:text-slate-50">{t.title}</div>
                            <div className="truncate text-[10px] text-neutral-600 dark:text-slate-400">{t.subtitle}</div>
                          </div>
                        </div>

                        <Pill tone={ok ? "good" : "warn"}>
                          {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                          {ok ? "Ready" : "Wait"}
                        </Pill>
                      </div>

                      <div className="mt-2 text-[11px] text-neutral-700 dark:text-slate-400">
                        Next send allowed{" "}
                        {ok ? (
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">now</span>
                        ) : (
                          <span className="font-semibold text-amber-800 dark:text-amber-400">in {msToLabel(waitMs)}</span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Btn
                          tone="primary"
                          disabled={!ok || isPending}
                          loading={isPending && active.key === t.key}
                          onClick={() => openConfirm(t)}
                          left={<Send className="h-4 w-4" />}
                        >
                          {isPending && active.key === t.key ? "Sending..." : "Send"}
                        </Btn>
                        <button
                          type="button"
                          className="text-xs font-semibold text-neutral-700 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100 transition"
                          onClick={() => setActive(t)}
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Flash deal context</div>
                    <Pill>
                      <Flame className="h-3.5 w-3.5" />
                      Optional
                    </Pill>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Deal name</label>
                    <input
                      value={dealName}
                      onChange={(e) => setDealName(e.target.value)}
                      className="rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                    />
                    <label className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Deal ends in</label>
                    <input
                      type="range"
                      min={1}
                      max={60}
                      value={dealEndsMinutes}
                      onChange={(e) => setDealEndsMinutes(Number(e.target.value))}
                      className="w-full accent-[#F77F00]"
                    />
                    <div className="flex items-center justify-between text-[10px] text-neutral-600 dark:text-slate-500">
                      <span>1m</span>
                      <span className="font-semibold text-neutral-900 dark:text-slate-300">{dealEndsMinutes}m</span>
                      <span>60m</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 transition">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-800 dark:text-amber-400" />
                    <div>
                      <div className="text-sm font-semibold text-amber-900 dark:text-amber-400">Safeguardrails</div>
                      <div className="mt-1 text-[13px] text-amber-900/80 dark:text-amber-400/80">
                        Your caps protect delivery + prevent “spam” penalties. Each send requires preview + confirm.
                      </div>
                      <div className="mt-2 text-[11px] text-amber-900/80 dark:text-amber-400/80 opacity-80">
                        Best practice: “We’re live” once, “Flash deal” when you drop, “Last chance” near end.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Destinations */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Destinations</div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">Enable destinations for sends. Each destination includes a pin helper.</div>
                </div>
                <Pill>
                  <MessageCircle className="h-3.5 w-3.5" />
                  {enabledChannels.length} enabled
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                {channels.map((c) => {
                  const enabled = enabledDest[c.key];
                  const isBlocked = c.status === "Blocked";
                  return (
                    <div
                      key={c.key}
                      className={cn(
                        "rounded-2xl p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition",
                        enabled ? "bg-neutral-50 dark:bg-slate-800/50" : "bg-white dark:bg-slate-900"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">{c.name}</div>
                            <Pill tone={statusTone(c.status)}>
                              {c.status === "Connected" ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : c.status === "Needs re-auth" ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                              {c.status}
                            </Pill>
                            {!c.supportsPin ? (
                              <Pill>
                                <Info className="h-3.5 w-3.5" />
                                No pin
                              </Pill>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                            {c.supportsPin ? "Pin helper available" : "Pin helper not supported on this channel"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Toggle
                            value={enabled}
                            onChange={(v) => setEnabledDest((s) => ({ ...s, [c.key]: v }))}
                            disabled={isBlocked}
                          />
                          <Btn
                            tone="ghost"
                            onClick={() => push("Manage account (demo)", "info")}
                            left={<Link2 className="h-4 w-4" />}
                            title="RBAC: supplier.live.alerts.manage"
                          >
                            Manage
                          </Btn>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-neutral-900 dark:text-slate-50">Pin link to chat</div>
                          <Btn
                            tone="neutral"
                            onClick={async () => {
                              const msg = `🔴 Live now: ${liveLink}`;
                              const ok = await safeCopy(msg);
                              push(ok ? "Copied pin message" : "Copy failed", ok ? "success" : "error");
                            }}
                            left={<Copy className="h-4 w-4" />}
                          >
                            Copy <span className="hidden sm:inline">pin text</span>
                          </Btn>
                        </div>
                        <div className="mt-2 text-sm text-neutral-700 dark:text-slate-300">
                          {c.pinHint}{" "}
                          <span className="text-neutral-500 dark:text-slate-500 italic text-xs block sm:inline mt-1 sm:mt-0">
                            Suggested: “🔴 Live now: {liveLink}”
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Preview (selected alert)</div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">What will be sent after confirmation.</div>
                </div>
                <Pill>
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </Pill>
              </div>

              <div className="mt-3 rounded-3xl bg-neutral-900 dark:bg-black p-3 transition">
                <div className="rounded-2xl bg-white dark:bg-slate-900 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">{active.title}</div>
                    <Pill tone={canSend(active) ? "good" : "warn"}>
                      {canSend(active) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                      {canSend(active) ? "Ready" : `Wait ${msToLabel(nextWaitMs(active))}`}
                    </Pill>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800 p-3 ring-1 ring-neutral-200 dark:ring-slate-700 transition">
                    <div className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-slate-100">{buildBody(active)}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn
                        tone="primary"
                        onClick={() => openConfirm(active)}
                        disabled={!canSend(active)}
                        left={<Send className="h-4 w-4" />}
                      >
                        Send with confirm
                      </Btn>
                      <Btn
                        onClick={async () => {
                          const ok = await safeCopy(buildBody(active));
                          push(ok ? "Copied message body" : "Copy failed", ok ? "success" : "error");
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy
                      </Btn>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 transition">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 text-amber-800 dark:text-amber-400" />
                      <div className="text-sm text-amber-900 dark:text-amber-400">
                        Reminder: keep messages opt‑in compliant. Use “Audience Notifications” for scheduled flows.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
              <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Recommended cadence</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">Minimal</div>
                  <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">We’re live → Flash deal (x1) → Last chance (x1)</div>
                </div>
                <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">High intent</div>
                  <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">We’re live → Flash deal (x2 spaced) → Last chance (x1)</div>
                </div>
              </div>
              <div className="mt-3 text-[10px] text-neutral-600 dark:text-slate-500">Guardrails enforce caps even if you tap repeatedly.</div>
            </div>
          </div>
        </div>

        {/* Confirm modal */}
        <Modal open={confirmOpen} title={`Confirm send: ${active.title}`} onClose={() => setConfirmOpen(false)}>
          <div className="space-y-4">
            <div
              className={cn(
                "rounded-3xl p-4 ring-1 transition",
                blocked
                  ? "bg-amber-50 dark:bg-amber-500/10 ring-amber-200 dark:ring-amber-500/20"
                  : "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/20"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">{blocked ? "Preflight: Fix items" : "Preflight: Ready"}</div>
                  <div className="mt-1 text-sm text-neutral-700 dark:text-slate-400">
                    {blocked ? "Some items block sending. Fix below." : "All checks passed. One more tap will send."}
                  </div>
                </div>
                <Pill tone={blocked ? "warn" : "good"}>
                  {blocked ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {blocked ? "Blocked" : "OK"}
                </Pill>
              </div>

              {preflightIssues.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-neutral-800 dark:text-slate-300">
                  {preflightIssues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* Delivery plan */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Delivery plan</div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">Supplier send + optional creator requests.</div>
                </div>
                <Pill>
                  <MessageCircle className="h-3.5 w-3.5" />
                  {enabledChannels.length} enabled
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-slate-200">Supplier destinations</div>
                  <div className="mt-1 text-sm font-semibold text-neutral-900 dark:text-slate-50">
                    {enabledChannels.length ? enabledChannels.map((c) => c.short).join(", ") : "None"}
                  </div>
                </div>
                <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-slate-200">Creator requests</div>
                  <div className="mt-1 text-sm font-semibold text-neutral-900 dark:text-slate-50">
                    {campaign.creatorUsageDecision === "I will use a Creator" && alsoRequestCreator
                      ? selectedCreators.length
                        ? selectedCreators.map((c) => `@${c.handle}`).join(", ")
                        : "None"
                      : "Off"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Preview + confirm</div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">Edit message if needed. Keep it short.</div>
                </div>
                <Pill>
                  <Phone className="h-3.5 w-3.5" />
                  Preview
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800 p-3 ring-1 ring-neutral-200 dark:ring-slate-700 transition">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">Message</div>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={9}
                    className="mt-2 w-full rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                  />
                  <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-600 dark:text-slate-500">
                    <span>Best practice: ≤ 300 chars.</span>
                    <span
                      className={cn(
                        "font-semibold",
                        draftText.length > 340 ? "text-rose-700 dark:text-rose-400" : "text-neutral-900 dark:text-slate-300"
                      )}
                    >
                      {draftText.length} chars
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-neutral-900 dark:bg-black p-3 transition">
                  <div className="rounded-2xl bg-white dark:bg-slate-900 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Phone mock</div>
                      <Pill>
                        <Phone className="h-3.5 w-3.5" />
                        Preview
                      </Pill>
                    </div>

                    <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800 p-3 ring-1 ring-neutral-200 dark:ring-slate-700 transition">
                      <div className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-slate-100">{draftText}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn
                        onClick={async () => {
                          const ok = await safeCopy(draftText);
                          push(ok ? "Copied draft" : "Copy failed", ok ? "success" : "error");
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy
                      </Btn>
                      <Btn tone="primary" onClick={send} disabled={blocked} loading={isPending} left={<Send className="h-4 w-4" />}>
                        Confirm & Send
                      </Btn>
                    </div>

                    <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 transition">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 text-amber-800 dark:text-amber-400" />
                        <div className="text-xs text-amber-900 dark:text-amber-400">“Pin link to chat” may require manual steps inside each destination.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 text-[10px] text-neutral-600 dark:text-slate-500 transition">
              Admin tip: enforce global send caps per supplier + per destination to prevent bans.
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
    if (!cond) throw new Error(`SupplierLiveAlertsManagerPage test failed: ${msg}`);
  };
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "ORANGE exists");
  assert(buildLiveLink("LS-1").includes("LS-1"), "buildLiveLink includes session id");
  console.log("✅ SupplierLiveAlertsManagerPage self-tests passed");
}
