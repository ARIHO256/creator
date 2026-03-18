"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useNotification } from "../../contexts/NotificationContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useApiResource } from "../../hooks/useApiResource";
import { creatorApi } from "../../lib/creatorApi";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CheckCircle2,
  Copy,
  Flame,
  Info,
  Link2,
  MessageCircle,
  Phone,
  Send,
  Timer,
  X,
  XCircle,
  Zap,
} from "lucide-react";

/**
 * Live Alerts Manager (Premium)
 * Role: Creator
 * Surface: Creator App (primary), Creator Studio Web (secondary)
 * Placement: Creator App → Live Sessionz → Live Alerts
 *
 * Features:
 * - One-tap send: “We’re live”, “Flash deal”, “Last chance”
 * - Safeguardrails: frequency cap indicator, preview + confirm modal
 * - “Pin link to chat” helper per destination
 *
 * NOTE: Self-contained demo UI. Wire to backend for real sends, caps, and channel policies.
 */

type SessionStatus = "Draft" | "Scheduled" | "Live" | "Ended";
type ChannelKey = "whatsapp" | "telegram" | "line" | "viber" | "rcs";
type Channel = {
  key: ChannelKey;
  name: string;
  short: string;
  status: "Connected" | "Needs re-auth" | "Blocked";
  supportsPin: boolean;
  pinHint: string;
};

type AlertKey = "were_live" | "flash_deal" | "last_chance";
type AlertTemplate = {
  key: AlertKey;
  title: string;
  subtitle: string;
  minIntervalMinutes: number;
  icon: React.ReactNode;
  build: (ctx: { sessionTitle: string; link: string; dealName: string; endsIn: string }) => string;
};

type LiveAlertsPayload = {
  session?: {
    id?: string;
    title?: string;
    status?: SessionStatus;
    startedISO?: string;
    endsISO?: string;
  };
  channels?: Channel[];
  templates?: Array<{
    key: AlertKey;
    title: string;
    subtitle: string;
    minIntervalMinutes: number;
    template: string;
  }>;
  enabledDest?: Partial<Record<ChannelKey, boolean>>;
  dealName?: string;
  dealEndsMinutes?: number;
  lastSent?: Partial<Record<AlertKey, number>>;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtLocal(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function msToLabel(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

function buildLiveLink(sessionId: string) {
  return `/live/${encodeURIComponent(sessionId)}`;
}

function Pill({
  tone = "neutral",
  children,
  title,
}: {
  tone?: "neutral" | "good" | "warn" | "bad" | "pro";
  children: React.ReactNode;
  title?: string;
}) {
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
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold ring-1 whitespace-nowrap", cls)}>
      {children}
    </span>
  );
}

function Btn({
  tone = "neutral",
  disabled,
  left,
  onClick,
  children,
  title,
}: {
  tone?: "neutral" | "primary" | "ghost";
  disabled?: boolean;
  left?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "bg-[#F77F00] text-white hover:brightness-95 shadow-sm"
      : tone === "ghost"
        ? "bg-transparent text-neutral-900 dark:text-slate-50 hover:bg-neutral-100 dark:hover:bg-slate-800"
        : "bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800 shadow-sm";
  return (
    <button title={title} className={cn(base, cls)}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {disabled && tone === "primary" ? <CircularProgress size={16} color="inherit" /> : left}
      {children}
    </button>
  );
}

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => (!disabled ? onChange(!value) : undefined)}
      className={cn(
        "relative inline-flex h-5 w-10 sm:h-6 sm:w-11 items-center rounded-full transition",
        disabled ? "bg-neutral-200 dark:bg-slate-800 cursor-not-allowed" : value ? "bg-neutral-900 dark:bg-slate-100" : "bg-neutral-300 dark:bg-slate-700",
      )}
      aria-pressed={value}
    >
      <span className={cn("inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-sm transition", value ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-full max-w-2xl flex-col bg-white dark:bg-slate-950 shadow-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[32px] sm:rounded-3xl transition-all overflow-hidden border-t sm:border border-neutral-200 dark:border-slate-800">
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

export default function LiveAlertsManager() {
  const { showSuccess, showNotification } = useNotification();
  const { run, isPending } = useAsyncAction();
  const { data: payload } = useApiResource({
    initialData: {} as LiveAlertsPayload,
    loader: () => creatorApi.liveTool("live-alerts") as Promise<LiveAlertsPayload>,
  });
  const session = useMemo(
    () => ({
      id: payload.session?.id || "LS-20418",
      title: payload.session?.title || "Autumn Beauty Flash",
      status: payload.session?.status || ("Live" as SessionStatus),
      startedISO: payload.session?.startedISO || new Date(Date.now() - 9 * 60 * 1000).toISOString(),
      endsISO: payload.session?.endsISO || new Date(Date.now() + 51 * 60 * 1000).toISOString(),
    }),
    [payload.session],
  );

  const liveLink = useMemo(() => buildLiveLink(session.id), [session.id]);

  const channels: Channel[] = useMemo(
    () => payload.channels || [],
    [payload.channels],
  );

  const templates: AlertTemplate[] = useMemo(
    () =>
      (payload.templates || []).map((template) => ({
        key: template.key,
        title: template.title,
        subtitle: template.subtitle,
        minIntervalMinutes: template.minIntervalMinutes,
        icon:
          template.key === "flash_deal" ? <Flame className="h-4 w-4" /> : template.key === "last_chance" ? <Timer className="h-4 w-4" /> : <Bell className="h-4 w-4" />,
        build: ({ sessionTitle, link, dealName, endsIn }) =>
          template.template
            .replaceAll("{{sessionTitle}}", sessionTitle)
            .replaceAll("{{link}}", link)
            .replaceAll("{{dealName}}", dealName)
            .replaceAll("{{endsIn}}", endsIn),
      })),
    [payload.templates],
  );

  const [enabledDest, setEnabledDest] = useState<Record<ChannelKey, boolean>>({
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
  const [lastSent, setLastSent] = useState<Record<AlertKey, number>>({
    were_live: Date.now() - 11 * 60 * 1000,
    flash_deal: Date.now() - 20 * 60 * 1000,
    last_chance: Date.now() - 40 * 60 * 1000,
  });
  useEffect(() => {
    if (!Object.keys(payload).length) return;
    setEnabledDest((current) => ({ ...current, ...(payload.enabledDest || {}) }));
    setDealName(payload.dealName || "GlowUp Serum Bundle");
    setDealEndsMinutes(typeof payload.dealEndsMinutes === "number" ? payload.dealEndsMinutes : 10);
    setLastSent((current) => ({ ...current, ...(payload.lastSent || {}) }));
  }, [payload]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const canSend = React.useCallback((t: AlertTemplate) => Date.now() - (lastSent[t.key] ?? 0) >= t.minIntervalMinutes * 60 * 1000, [lastSent]);
  const nextWaitMs = (t: AlertTemplate) => Math.max(0, t.minIntervalMinutes * 60 * 1000 - (Date.now() - (lastSent[t.key] ?? 0)));

  const buildBody = (t: AlertTemplate) =>
    t.build({
      sessionTitle: session.title,
      link: liveLink,
      dealName,
      endsIn: `${dealEndsMinutes}m`,
    });

  const [active, setActive] = useState<AlertTemplate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  useEffect(() => {
    if (!templates.length) return;
    setActive((current) => current && templates.some((item) => item.key === current.key) ? templates.find((item) => item.key === current.key) || templates[0] : templates[0]);
  }, [templates]);


  const openConfirm = (t: AlertTemplate) => {
    setActive(t);
    setDraftText(buildBody(t));
    setConfirmOpen(true);
  };

  const preflightIssues = useMemo(() => {
    const _unusedTick = tick;
    const issues: string[] = [];
    if (enabledChannels.length === 0) issues.push("Enable at least one destination.");
    if (enabledChannels.some((c) => c.status !== "Connected")) issues.push("Some enabled destinations need re-auth or are blocked.");
    if (active && !canSend(active)) issues.push("Frequency cap active for this alert.");
    return issues;
  }, [enabledChannels, active, tick, canSend]);

  const blocked = preflightIssues.length > 0 || isPending;

  const send = () => {
    if (!active) return;
    run(async () => {
      setLastSent((s) => ({ ...s, [active.key]: Date.now() }));
      setConfirmOpen(false);
      await creatorApi.patchLiveTool("live-alerts", {
        session,
        channels,
        templates: (payload.templates || []),
        enabledDest,
        dealName,
        dealEndsMinutes,
        lastSent: { ...lastSent, [active.key]: Date.now() },
      });
    }, { successMessage: `Sent “${active.title}” to ${enabledChannels.length} destination(s)` });
  };

  const statusTone = (s: Channel["status"]) => (s === "Connected" ? "good" : s === "Needs re-auth" ? "warn" : "bad");

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
        <div className="w-full flex items-center justify-between gap-3 px-4 md:px-6 lg:px-8 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-neutral-500 dark:text-slate-400">
              <span className="font-medium text-neutral-700 dark:text-slate-300">Creator App</span>
              <span>•</span>
              <span className="text-neutral-900 dark:text-slate-200">Live Sessionz</span>
              <span>•</span>
              <span className="text-neutral-900 dark:text-slate-200">Live Alerts</span>
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
              </div>
            </div>
            <div className="mt-1 text-[10px] sm:text-xs text-neutral-600 dark:text-slate-400">
              Started <span className="font-semibold text-neutral-900 dark:text-slate-200">{fmtLocal(session.startedISO)}</span>{" "}
              <span className="text-neutral-300 dark:text-slate-700">•</span> Ends{" "}
              <span className="font-semibold text-neutral-900 dark:text-slate-200">{fmtLocal(session.endsISO)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <Btn
                tone="ghost"
                onClick={async () => {
                  await navigator.clipboard?.writeText(liveLink);
                  showSuccess("Copied live link");
                }}
                left={<Copy className="h-4 w-4" />}
              >
                Copy link
              </Btn>
            </div>
            <Btn tone="primary" onClick={() => templates[0] && openConfirm(templates[0])} disabled={!templates[0] || !canSend(templates[0])} left={<Zap className="h-4 w-4" />}>
              <span className="hidden sm:inline">Quick “We’re live”</span>
              <span className="sm:hidden">Alert</span>
            </Btn>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6">
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
                        {ok ? <span className="font-semibold text-emerald-700 dark:text-emerald-400">now</span> : <span className="font-semibold text-amber-800 dark:text-amber-400">in {msToLabel(waitMs)}</span>}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Btn tone="primary" disabled={!ok || isPending} onClick={() => openConfirm(t)} left={<Send className="h-4 w-4" />}>
                          {isPending && active.key === t.key ? "Sending..." : "Send"}
                        </Btn>
                        <button className="text-xs font-semibold text-neutral-700 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100 transition" onClick={() => setActive(t)}>
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
                    <input type="range" min={1} max={60} value={dealEndsMinutes} onChange={(e) => setDealEndsMinutes(Number(e.target.value))} className="w-full accent-[#F77F00]" />
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
                      <div className="mt-2 text-[11px] text-amber-900/80 dark:text-amber-400/80 opacity-80">Best practice: “We’re live” once, “Flash deal” when you drop, “Last chance” near end.</div>
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
                    <div key={c.key} className={cn("rounded-2xl p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition", enabled ? "bg-neutral-50 dark:bg-slate-800/50" : "bg-white dark:bg-slate-900")}>
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
                          <Toggle value={enabled} onChange={(v) => setEnabledDest((s) => ({ ...s, [c.key]: v }))} disabled={isBlocked} />
                          <Btn tone="ghost" onClick={() => showNotification("Manage account (demo)")} left={<Link2 className="h-4 w-4" />}>
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
                              await navigator.clipboard?.writeText(msg);
                              showSuccess("Copied pin message");
                            }}
                            left={<Copy className="h-4 w-4" />}
                          >
                            Copy <span className="hidden sm:inline">pin text</span>
                          </Btn>
                        </div>
                        <div className="mt-2 text-sm text-neutral-700 dark:text-slate-300">
                          {c.pinHint} <span className="text-neutral-500 dark:text-slate-500 italic text-xs block sm:inline mt-1 sm:mt-0">Suggested: “🔴 Live now: {liveLink}”</span>
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
                    <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">{active?.title || "Alert"}</div>
                    <Pill tone={!active || canSend(active) ? "good" : "warn"}>
                      {!active || canSend(active) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                      {!active || canSend(active) ? "Ready" : `Wait ${msToLabel(nextWaitMs(active))}`}
                    </Pill>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800 p-3 ring-1 ring-neutral-200 dark:ring-slate-700 transition">
                    <div className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-slate-100">{active ? buildBody(active) : ""}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn tone="primary" onClick={() => active && openConfirm(active)} disabled={!active || !canSend(active)} left={<Send className="h-4 w-4" />}>
                        Send with confirm
                      </Btn>
                      <Btn
                        onClick={async () => {
                          await navigator.clipboard?.writeText(active ? buildBody(active) : "");
                          showSuccess("Copied message body");
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
                        Reminder: avoid copyrighted media unless you have rights/licensing. Keep messages opt‑in compliant.
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
        <Modal open={confirmOpen && !!active} title={`Confirm send: ${active?.title || "Alert"}`} onClose={() => setConfirmOpen(false)}>
          <div className="space-y-4">
            <div className={cn("rounded-3xl p-4 ring-1 transition", blocked ? "bg-amber-50 dark:bg-amber-500/10 ring-amber-200 dark:ring-amber-500/20" : "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/20")}>
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

            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Preview + confirm</div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">Edit message if needed. Keep it short.</div>
                </div>
                <Pill>
                  <MessageCircle className="h-3.5 w-3.5" />
                  {enabledChannels.length} enabled
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
                    <span className={cn("font-semibold", draftText.length > 340 ? "text-rose-700 dark:text-rose-400" : "text-neutral-900 dark:text-slate-300")}>{draftText.length} chars</span>
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
                          await navigator.clipboard?.writeText(draftText);
                          showSuccess("Copied draft");
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy
                      </Btn>
                      <Btn tone="primary" onClick={send} disabled={blocked} left={<Send className="h-4 w-4" />}>
                        Confirm & Send
                      </Btn>
                    </div>

                    <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 transition">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 text-amber-800 dark:text-amber-400" />
                        <div className="text-xs text-amber-900 dark:text-amber-400">
                          “Pin link to chat” may require manual steps inside each destination.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 text-[10px] text-neutral-600 dark:text-slate-500 transition">
              Admin tip: enforce global send caps per creator + per channel to prevent bans.
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}
