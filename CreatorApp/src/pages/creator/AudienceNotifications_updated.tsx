"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Info,
  Link2,
  Lock,
  MessageCircle,
  Phone,
  QrCode,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useApiResource } from "../../hooks/useApiResource";
import { creatorApi } from "../../lib/creatorApi";

/**
 * Audience Notifications (Tap-to-Start)
 * Role: Creator, Seller Manager
 * Surface: Creator Studio Web
 * Placement: Live Sessionz Pro → Audience Notifications
 *
 * IMPORTANT CHANGE (per request):
 * - Removed audience segment targeting and estimated reach/cost.
 * - This page now focuses on "initiation prompts" (links / QR codes / buttons)
 *   that viewers tap to start a messaging conversation (WhatsApp/Telegram/etc).
 *
 * WhatsApp Business API 24h Window Planner:
 * - The WA initiation prompt should go live at:
 *     (session_end + buffer) - 24h
 *   so that any user who initiates WhatsApp at/after that moment can receive
 *   reminders that remain valid until end + buffer.
 *
 * Reminders supported:
 * - T-24h (WA-adjusted initiation prompt timing)
 * - T-1h
 * - T-10m
 * - Live Now
 * - Deal Drop
 * - Replay Ready
 *
 * Preview:
 * - Phone mockups per channel in a drawer (WhatsApp, Telegram, RCS, Initiation Prompt).
 *
 * Notes:
 * - TailwindCSS assumed.
 */

const ORANGE = "#F77F00";

type SessionStatus = "Draft" | "Scheduled" | "Live" | "Ended";
type Plan = "Standard" | "Pro";
type ChannelKey = "whatsapp" | "telegram" | "line" | "viber" | "rcs";

type Channel = {
  key: ChannelKey;
  name: string;
  short: string;
  connected: "Connected" | "Needs re-auth" | "Blocked";
  proOnly?: boolean;
  supportsQr: boolean;
  supportsButtons: boolean;
  note?: string;
};

type ReminderKey = "t24h" | "t1h" | "t10m" | "live_now" | "deal_drop" | "replay_ready";
type Reminder = {
  key: ReminderKey;
  label: string;
  description: string;
  defaultEnabled: boolean;
};

type TemplatePack = {
  id: string;
  name: string;
  version: string;
  approved: boolean;
  channels: ChannelKey[];
  notes: string;
  proOnly?: boolean;
  templates: {
    initiationPrompt: string;
    t24h: string;
    t1h: string;
    t10m: string;
    live_now: string;
    deal_drop: string;
    replay_ready: string;
  };
};

type AudienceNotificationsPayload = {
  plan?: Plan;
  sessionStatus?: SessionStatus;
  sessionTitle?: string;
  startLocal?: string;
  endLocal?: string;
  bufferMinutes?: number;
  waNumber?: string;
  sessionUrl?: string;
  templatePacks?: TemplatePack[];
  selectedPackId?: string;
  channels?: Channel[];
  enabledChannels?: Partial<Record<ChannelKey, boolean>>;
  reminders?: Array<Omit<Reminder, "defaultEnabled">>;
  enabledReminders?: Partial<Record<ReminderKey, boolean>>;
  replayDelayMinutes?: number;
  dealDropMode?: "manual" | "scheduled";
  dealDropAtOffsetMin?: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInputValue(d: Date) {
  // YYYY-MM-DDTHH:mm (local)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fromLocalInputValue(v: string) {
  if (!v || !v.includes("T")) return null;
  // v = YYYY-MM-DDTHH:mm
  const [datePart, timePart] = v.split("T");
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split("-").map((x) => Number(x));
  const [hh, mm] = timePart.split(":").map((x) => Number(x));
  if ([y, m, d, hh, mm].some((value) => !Number.isFinite(value))) return null;
  const parsed = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function fmtLocal(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

function msUntil(a: Date, b: Date) {
  return b.getTime() - a.getTime();
}

function makeQrUrl(data: string, size = 240) {
  const u = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${u}`;
}

function Pill({
  children,
  tone = 'neutral',
  title,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'pro';
  title?: string;
}) {
  const cls =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20'
        : tone === 'bad'
          ? 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20'
          : tone === 'pro'
            ? 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20'
            : 'bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-bold ring-1 whitespace-nowrap transition', cls)}>
      {children}
    </span>
  );
}

function Btn({
  children,
  onClick,
  tone = 'neutral',
  disabled,
  left,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'neutral' | 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  left?: React.ReactNode;
  title?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  const cls =
    tone === 'primary'
      ? 'text-white hover:brightness-95 shadow-md shadow-orange-500/20'
      : tone === 'danger'
        ? 'bg-rose-600 text-white hover:brightness-95 shadow-md shadow-rose-500/20'
        : tone === 'ghost'
          ? 'bg-transparent text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-900'
          : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm';

  return (
    <button
      title={title}
      className={cn(base, cls)}
      style={tone === 'primary' ? { background: ORANGE } : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {left}
      <span className="truncate">{children}</span>
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
      onClick={() => !disabled && onChange(!value)}
      className={cn(
        'relative inline-flex h-5 w-10 sm:h-6 sm:w-11 items-center rounded-full transition-colors',
        disabled ? 'bg-slate-200 dark:bg-slate-800 cursor-not-allowed' : value ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700',
      )}
      aria-pressed={value}
      aria-label={value ? 'Enabled' : 'Disabled'}
      title={disabled ? 'Locked' : undefined}
    >
      <span className={cn('inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-md transition', value ? 'translate-x-5' : 'translate-x-1')} />
    </button>
  );
}

function Drawer({
  open,
  title,
  onClose,
  children,
  widthClass = 'max-w-3xl',
  right,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
  right?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={cn('absolute right-0 top-0 h-full w-full bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-out sm:ring-1 sm:ring-slate-200 dark:sm:ring-slate-800', widthClass)}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-slate-900 dark:text-slate-50">{title}</div>
            </div>
            <div className="flex items-center gap-3">
              {right}
              <button
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; hint?: string; locked?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="w-full h-11 rounded-xl bg-white dark:bg-slate-900 px-4 text-left ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        onClick={() => setOpen((s) => !s)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">{selected?.label ?? 'Select'}</div>
            {selected?.hint ? <div className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-500">{selected.hint}</div> : null}
          </div>
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-[300px] overflow-y-auto">
            {options.map((o) => (
              <button
                key={o.value}
                className={cn(
                  'w-full px-4 py-3 text-left transition',
                  o.value === value ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  o.locked && 'opacity-60 cursor-not-allowed',
                )}
                onClick={() => {
                  if (o.locked) return;
                  onChange(o.value);
                  setOpen(false);
                }}
                disabled={o.locked}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">{o.label}</div>
                    {o.hint ? <div className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-500">{o.hint}</div> : null}
                  </div>
                  {o.locked ? (
                    <Pill tone="pro">
                      <Lock className="h-3 w-3" />
                      Pro
                    </Pill>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PhoneMock({
  title,
  subtitle,
  body,
  footer,
}: {
  title: string;
  subtitle?: string;
  body: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="relative overflow-hidden rounded-[40px] bg-slate-900 dark:bg-black p-3 shadow-2xl transition ring-1 ring-slate-800">
        <div className="flex flex-col rounded-[32px] bg-white dark:bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{subtitle ?? 'Preview'}</div>
            <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{title}</div>
          </div>
          <div className="flex-1 p-6">
            <div className="space-y-3">
              <div className="inline-block max-w-[95%] rounded-2xl bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 ring-1 ring-slate-100 dark:ring-white/5 shadow-sm">
                {body}
              </div>
              {footer ? <div className="pt-2">{footer}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildClickToChatLink(channel: ChannelKey, args: { waNumber: string; text: string; sessionUrl: string }) {
  const { waNumber, text, sessionUrl } = args;
  const encText = encodeURIComponent(text);
  if (channel === "whatsapp") {
    const num = waNumber.replace(/[^\d]/g, "");
    // Standard click-to-chat format. Replace with your WABA deep-link logic if needed.
    return `https://wa.me/${num}?text=${encText}`;
  }
  if (channel === "telegram") {
    return `https://t.me/share/url?url=${encodeURIComponent(sessionUrl)}&text=${encText}`;
  }
  if (channel === "line") {
    // LINE share (basic)
    return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(sessionUrl)}`;
  }
  if (channel === "viber") {
    // Viber share
    return `viber://forward?text=${encText}%0A${encodeURIComponent(sessionUrl)}`;
  }
  // RCS/SMS fallback
  return `sms:?&body=${encText}%0A${encodeURIComponent(sessionUrl)}`;
}

type PreviewTabKey = 'init' | 'whatsapp' | 'telegram' | 'rcs';

export default function AudienceNotifications() {
  const { data: payload, loading, error } = useApiResource<AudienceNotificationsPayload | null>({
    initialData: null,
    loader: () => creatorApi.liveTool("audience-notifications") as Promise<AudienceNotificationsPayload>,
  });
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("sessionId") || "";
  }, []);
  const baseSessionUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/live/${encodeURIComponent(sessionId)}`;
  }, [sessionId]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");

  // Scheduling inputs
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [waNumber, setWaNumber] = useState("");
  const [sessionUrl, setSessionUrl] = useState(baseSessionUrl);
  const templatePacks = useMemo(() => payload.templatePacks || [], [payload.templatePacks]);
  const channels = useMemo(() => payload.channels || [], [payload.channels]);

  const [enabledChannels, setEnabledChannels] = useState<Record<ChannelKey, boolean>>({
    whatsapp: false,
    telegram: false,
    line: false,
    viber: false,
    rcs: false,
  });
  const reminders = useMemo<Reminder[]>(
    () => (payload.reminders || []).map((item) => ({ ...item, defaultEnabled: Boolean(payload.enabledReminders?.[item.key]) })),
    [payload.enabledReminders, payload.reminders],
  );

  const [enabledReminders, setEnabledReminders] = useState<Record<ReminderKey, boolean>>({
    t24h: false,
    t1h: false,
    t10m: false,
    live_now: false,
    deal_drop: false,
    replay_ready: false,
  });

  const [replayDelayMinutes, setReplayDelayMinutes] = useState(0);
  const [dealDropMode, setDealDropMode] = useState<"manual" | "scheduled">("manual");
  const [dealDropAtOffsetMin, setDealDropAtOffsetMin] = useState(0); // if scheduled: minutes after start
  const [selectedPackId, setSelectedPackId] = useState("");
  const selectedPack = useMemo(
    () => templatePacks.find((p) => p.id === selectedPackId) ?? null,
    [templatePacks, selectedPackId],
  );
  const selectedTemplates = selectedPack?.templates;

  useEffect(() => {
    if (!payload) return;
    setPlan(payload.plan ?? null);
    setSessionStatus(payload.sessionStatus ?? null);
    setSessionTitle(payload.sessionTitle || "");
    setStartLocal(payload.startLocal || "");
    setEndLocal(payload.endLocal || "");
    setBufferMinutes(typeof payload.bufferMinutes === "number" ? payload.bufferMinutes : 0);
    setWaNumber(payload.waNumber || "");
    setSessionUrl(payload.sessionUrl || "");
    setSelectedPackId(payload.selectedPackId || "");
    setEnabledChannels((current) => ({ ...current, ...(payload.enabledChannels || {}) }));
    setEnabledReminders((current) => ({ ...current, ...(payload.enabledReminders || {}) }));
    setReplayDelayMinutes(typeof payload.replayDelayMinutes === "number" ? payload.replayDelayMinutes : 0);
    setDealDropMode(payload.dealDropMode === "scheduled" ? "scheduled" : "manual");
    setDealDropAtOffsetMin(typeof payload.dealDropAtOffsetMin === "number" ? payload.dealDropAtOffsetMin : 0);
  }, [payload, baseSessionUrl]);

  const start = useMemo(() => fromLocalInputValue(startLocal), [startLocal]);
  const end = useMemo(() => fromLocalInputValue(endLocal), [endLocal]);

  const durationMs = useMemo(() => (start && end ? Math.max(0, end.getTime() - start.getTime()) : 0), [start, end]);
  const bufferMs = useMemo(() => bufferMinutes * 60 * 1000, [bufferMinutes]);

  const waWindowEnd = useMemo(() => (end ? new Date(end.getTime() + bufferMs) : null), [end, bufferMs]);
  const waPromptTime = useMemo(() => (waWindowEnd ? new Date(waWindowEnd.getTime() - 24 * 60 * 60 * 1000) : null), [waWindowEnd]);

  const computedTimes = useMemo(() => {
    if (!start || !end || !waPromptTime) return null;
    const t24h = waPromptTime;
    const t1h = new Date(start.getTime() - 60 * 60 * 1000);
    const t10m = new Date(start.getTime() - 10 * 60 * 1000);
    const liveNow = start;
    const dealDrop = dealDropMode === "scheduled" ? new Date(start.getTime() + dealDropAtOffsetMin * 60 * 1000) : null;
    const replayReady = new Date(end.getTime() + replayDelayMinutes * 60 * 1000);
    return {
      t24h,
      t1h,
      t10m,
      live_now: liveNow,
      deal_drop: dealDrop,
      replay_ready: replayReady,
    } as const;
  }, [waPromptTime, start, end, replayDelayMinutes, dealDropMode, dealDropAtOffsetMin]);

  const waLeadTime = useMemo(() => (waPromptTime && start ? fmtDuration(msUntil(waPromptTime, start)) : ""), [waPromptTime, start]);
  const waCoverage = useMemo(() => {
    if (!waPromptTime || !waWindowEnd) return null;
    const windowEndIfInitiatedAtPrompt = new Date(waPromptTime.getTime() + 24 * 60 * 60 * 1000);
    const ok = Math.abs(windowEndIfInitiatedAtPrompt.getTime() - waWindowEnd.getTime()) < 60 * 1000;
    return { windowEndIfInitiatedAtPrompt, ok };
  }, [waPromptTime, waWindowEnd]);

  // Suppress unused vars
  void waLeadTime;
  void waCoverage;

  const isPro = plan === "Pro";

  // Prompt text and links
  const templateFill = (raw: string) =>
    raw
      .replaceAll("{{title}}", sessionTitle)
      .replaceAll("{{link}}", sessionUrl);

  const initiationPromptText = useMemo(() => templateFill(selectedTemplates?.initiationPrompt || ""), [selectedTemplates, sessionTitle, sessionUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const clickToChatLink = (channel: ChannelKey) =>
    buildClickToChatLink(channel, {
      waNumber,
      text: initiationPromptText,
      sessionUrl,
    });

  // Preview drawer
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<"init" | "whatsapp" | "telegram" | "rcs">("init");
  const [previewScenario, setPreviewScenario] = useState<ReminderKey>("t24h"); // which reminder to preview

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleChannel = (k: ChannelKey, v: boolean) => setEnabledChannels((s) => ({ ...s, [k]: v }));

  const enabledChannelList = useMemo(() => channels.filter((c) => enabledChannels[c.key]), [channels, enabledChannels]);
  const scheduleOk = useMemo(() => {
    const issues: string[] = [];
    if (!plan || !sessionStatus || !sessionTitle || !start || !end) issues.push("Core audience notification data is missing.");
    if (start && end && end.getTime() <= start.getTime()) issues.push("End time must be after start time.");
    if (enabledChannelList.length === 0) issues.push("Enable at least one channel.");
    if (selectedPack?.proOnly && !isPro) issues.push("Selected template pack is Pro.");
    // WhatsApp logic checks:
    const waOn = enabledChannels.whatsapp;
    if (waOn && waPromptTime && start) {
      if (waPromptTime.getTime() >= start.getTime()) issues.push("WhatsApp prompt time is not before session start. Reduce duration/buffer or split session.");
    }
    return { ok: issues.length === 0, issues };
  }, [end, start, enabledChannelList.length, selectedPack, isPro, enabledChannels.whatsapp, waPromptTime, plan, sessionStatus, sessionTitle]);

  const proLockReason = "Upgrade to Pro to enable this channel/feature.";
  void proLockReason;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] dark:bg-slate-950 text-sm text-slate-600 dark:text-slate-300">
        Loading audience notifications…
      </div>
    );
  }

  if (error || !payload || !plan || !sessionStatus || !sessionTitle || !start || !end || !computedTimes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] dark:bg-slate-950 p-6">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-300">
          Audience notification data is unavailable.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition">
        <div className="w-full flex flex-col gap-4 px-4 md:px-6 lg:px-8 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <span className="hover:text-slate-700 dark:hover:text-slate-200 transition cursor-default">Live Sessionz Pro</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-slate-900 dark:text-slate-100 italic">Audience Notifications</span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{sessionTitle}</div>
              <div className="flex gap-2">
                <Pill tone={sessionStatus === 'Live' ? 'good' : sessionStatus === 'Scheduled' ? 'warn' : 'neutral'}>
                  <Timer className="h-3.5 w-3.5" />
                  {sessionStatus.toUpperCase()}
                </Pill>
                <Pill tone={isPro ? 'pro' : 'neutral'}>
                  {isPro ? <BadgeCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {isPro ? 'PRO ACCESS' : 'STANDARD'}
                </Pill>
              </div>
            </div>

            <div className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                {fmtLocal(start)}
              </span>
              <span className="text-slate-200 dark:text-slate-800">|</span>
              <span className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-slate-400" />
                {fmtDuration(durationMs)} Scheduled
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 transition ring-1 ring-slate-200/50 dark:ring-slate-700/50"
              type="button"
            >
              <Sparkles className="h-4 w-4 text-orange-500" />
              Tier: {plan}
            </button>

            <div className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 p-1 ring-1 ring-slate-200/50 dark:ring-slate-800/50">
              <Btn tone="ghost" onClick={() => setPreviewOpen(true)} left={<Phone className="h-4 w-4" />}>
                Preview
              </Btn>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <Btn
                tone="primary"
                onClick={() => {
                  void creatorApi.patchLiveTool("audience-notifications", {
                    plan,
                    sessionStatus,
                    sessionTitle,
                    startLocal,
                    endLocal,
                    bufferMinutes,
                    waNumber,
                    sessionUrl,
                    templatePacks,
                    selectedPackId,
                    channels,
                    enabledChannels,
                    reminders: reminders.map(({ defaultEnabled, ...item }) => item),
                    enabledReminders,
                    replayDelayMinutes,
                    dealDropMode,
                    dealDropAtOffsetMin,
                  }).then(() => setToast("Notification Strategy Locked"));
                }}
                left={<CheckCircle2 className="h-4 w-4" />}
                disabled={!scheduleOk.ok}
              >
                Save
              </Btn>
            </div>
          </div>
        </div>

        {/* Preflight strip */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition">
          <div className="w-full px-4 md:px-6 lg:px-8 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Pill tone={scheduleOk.ok ? 'good' : 'warn'}>
                  {scheduleOk.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  SYSTEM CHECK
                </Pill>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                  {scheduleOk.ok
                    ? 'Strategy validated: Prompts and reminders ready for deployment.'
                    : 'System configuration required before broadcast activation.'}
                </span>
              </div>
              {!scheduleOk.ok ? (
                <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest bg-rose-500/5 px-2 py-0.5 rounded-md">
                  <XCircle className="h-3 w-3" />
                  {scheduleOk.issues.length} ISSUES DETECTED
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Sparkles className="h-3 w-3 text-orange-500" />
                  Optimized for WhatsApp API
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-7 space-y-4">
            {/* Session basics */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Phase Synchronization</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Configure core timing for automated message dispatch.</div>
                </div>
                <Pill tone="neutral">
                  <CalendarClock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  TIMING HUB
                </Pill>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">Broadcast Origin</div>
                  <input
                    type="datetime-local"
                    value={startLocal}
                    onChange={(e) => setStartLocal(e.target.value)}
                    className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-800/20 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                  />
                </label>
                <label className="block">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">Broadcast Termination</div>
                  <input
                    type="datetime-local"
                    value={endLocal}
                    onChange={(e) => setEndLocal(e.target.value)}
                    className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-800/20 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="block sm:col-span-2">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">Primary Session Identifier</div>
                  <input
                    value={sessionUrl}
                    onChange={(e) => setSessionUrl(e.target.value)}
                    className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-800/20 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="https://mylivedealz.com/..."
                  />
                </label>
                <label className="block">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">Lifecycle State</div>
                  <Select
                    value={sessionStatus}
                    onChange={(v) => setSessionStatus(v as SessionStatus)}
                    options={[
                      { value: 'Draft', label: 'Draft', hint: 'Hidden from public' },
                      { value: 'Scheduled', label: 'Scheduled', hint: 'Prompts active' },
                      { value: 'Live', label: 'Live Now', hint: 'Reminders active' },
                      { value: 'Ended', label: 'Archived', hint: 'Replay Ready ready' },
                    ]}
                  />
                </label>
              </div>
            </div>

            {/* Channel selection */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Active Channels</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Enable the platforms where your "Tap-to-Start" triggers will be deployed.
                  </div>
                </div>
                <Pill tone="good">
                  <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {enabledChannelList.length} SYNCED
                </Pill>
              </div>

              <div className="mt-5 space-y-3">
                {channels.map((c) => {
                  const locked = Boolean(c.proOnly) && !isPro;
                  const enabled = enabledChannels[c.key];
                  const statusTone = c.connected === 'Connected' ? 'good' : c.connected === 'Needs re-auth' ? 'warn' : 'bad';
                  return (
                    <div
                      key={c.key}
                      className={cn(
                        'rounded-2xl p-4 ring-1 transition group',
                        enabled
                          ? 'bg-slate-100 dark:bg-slate-800/40 ring-slate-200 dark:ring-slate-700 shadow-sm'
                          : 'bg-slate-50/50 dark:bg-slate-900 ring-slate-100 dark:ring-slate-800 opacity-70 hover:opacity-100',
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{c.name}</div>
                            <div className="flex gap-1.5 flex-wrap">
                              <Pill tone={statusTone}>
                                {c.connected === 'Connected' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                {c.connected.toUpperCase()}
                              </Pill>
                              {c.proOnly ? (
                                <Pill tone="pro">
                                  <Lock className="h-3 w-3" />
                                  PRO
                                </Pill>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-500 leading-tight">
                            {c.note}
                          </div>

                          {c.key === 'whatsapp' ? (
                            <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
                              <Zap className="h-3 w-3 text-orange-500 animate-pulse" />
                              WABA Trigger: {fmtLocal(computedTimes.t24h)}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <Toggle value={enabled} onChange={(v) => toggleChannel(c.key, v)} disabled={locked} />
                          {locked && <span className="text-[10px] font-black text-slate-400 uppercase">Pro Required</span>}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                        <Btn
                          tone="primary"
                          onClick={() => {
                            navigator.clipboard?.writeText(clickToChatLink(c.key)).catch(() => { });
                            setToast(`${c.name} Asset Link Copied`);
                          }}
                          disabled={locked}
                          left={<Copy className="h-4 w-4" />}
                        >
                          Copy link
                        </Btn>

                        <div className="flex-1" />

                        <Btn
                          tone="ghost"
                          onClick={() => {
                            setPreviewOpen(true);
                            setPreviewTab(c.key === 'whatsapp' ? 'whatsapp' : c.key === 'telegram' ? 'telegram' : 'rcs');
                          }}
                          disabled={locked}
                          left={<Phone className="h-4 w-4" />}
                        >
                          Preview
                        </Btn>

                        {c.supportsQr ? (
                          <Btn
                            tone="ghost"
                            onClick={() => {
                              navigator.clipboard?.writeText(makeQrUrl(clickToChatLink(c.key))).catch(() => { });
                              setToast('QR Hash Generated');
                            }}
                            disabled={locked}
                            left={<QrCode className="h-4 w-4" />}
                          >
                            QR Asset
                          </Btn>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20 text-xs text-amber-900 dark:text-amber-400">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                  <div>
                    <div className="font-black uppercase tracking-wider mb-1">Architecture Note</div>
                    <div className="font-semibold leading-relaxed">
                      "Tap-to-Start" is non-invasive. Viewers must explicitly trigger the chat prompt to receive reminders. This ensures 100% compliance across all messaging APIs.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp 24h planner */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">WhatsApp 24h Orchestration</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Precision timing to ensure the 24h messaging window covers the entire broadcast lifecycle.
                  </div>
                </div>
                <Pill tone="pro">
                  <BadgeCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  PREMIUM
                </Pill>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
                <div className="md:col-span-7 space-y-4">
                  <label className="block">
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">WhatsApp Business Identity</div>
                    <input
                      value={waNumber}
                      onChange={(e) => setWaNumber(e.target.value)}
                      className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-800/20 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                      placeholder="+256 700 000 000"
                    />
                  </label>

                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 ring-1 ring-slate-200 dark:ring-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-slate-900 dark:text-slate-50 uppercase tracking-widest">Active Retention Buffer</div>
                        <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-500">
                          Ensures reminders remain valid for <span className="text-slate-900 dark:text-slate-100 italic">{bufferMinutes} mins</span> post-session.
                        </div>
                      </div>
                      <Pill tone="neutral">
                        <Timer className="h-3 w-3" />
                        {bufferMinutes}M
                      </Pill>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={5}
                      value={bufferMinutes}
                      onChange={(e) => setBufferMinutes(Number(e.target.value))}
                      className="mt-4 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-center sm:text-left">
                      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-800">
                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase">Coverage End</div>
                        <div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-50">{fmtLocal(waWindowEnd)}</div>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-800">
                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase">Trigger Time</div>
                        <div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-50">{fmtLocal(waPromptTime)}</div>
                      </div>
                    </div>

                    {waPromptTime.getTime() >= start.getTime() ? (
                      <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-500/5 p-3 ring-1 ring-rose-200 dark:ring-rose-500/20 text-[10px] font-bold text-rose-800 dark:text-rose-400">
                        <div className="flex items-center gap-2 uppercase tracking-widest mb-1 text-rose-600 dark:text-rose-500">
                          <AlertTriangle className="h-3 w-3" />
                          Timing Violation
                        </div>
                        Protocol error: The 24h window is too narrow for this session duration + buffer. Please reduce buffer or shorten session.
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-slate-900 dark:bg-black p-4 text-white shadow-lg ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">Global Trigger Link</div>
                        <div className="mt-1 truncate text-xs font-bold text-white selection:bg-orange-500/50">{clickToChatLink('whatsapp')}</div>
                      </div>
                      <Btn
                        tone="primary"
                        onClick={() => {
                          navigator.clipboard?.writeText(clickToChatLink('whatsapp')).catch(() => { });
                          setToast('WABA Link Copied');
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy
                      </Btn>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5">
                  <div className="h-full rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">QR Manifest</div>
                        <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">Deploy this on all visual surfaces.</div>
                      </div>
                      <Pill tone="neutral">
                        <QrCode className="h-3 w-3" />
                        SVG
                      </Pill>
                    </div>

                    <div className="mt-4 flex aspect-square items-center justify-center rounded-2xl bg-white dark:bg-slate-900 p-6 ring-1 ring-slate-200 dark:ring-slate-800 shadow-inner">
                      <img
                        src={makeQrUrl(clickToChatLink('whatsapp'), 400)}
                        alt="WhatsApp QR"
                        className="h-full w-full rounded-lg object-contain dark:invert transition-all"
                      />
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-800">
                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase mb-1.5">Compliance String</div>
                        <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed italic">
                          "{initiationPromptText}"
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Btn
                          tone="ghost"
                          onClick={() => {
                            navigator.clipboard?.writeText(initiationPromptText).catch(() => { });
                            setToast('Prompt Text Copied');
                          }}
                          left={<Copy className="h-4 w-4" />}
                        >
                          Text
                        </Btn>
                        <Btn tone="ghost" onClick={() => setPreviewOpen(true)} left={<Phone className="h-4 w-4" />}>
                          Mock
                        </Btn>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reminder scheduling */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Transmission Timeline</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Define the lifecycle of automated notifications. WhatsApp requires prior user-initiated opt-in.
                  </div>
                </div>
                <Pill tone="neutral">
                  <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  DISPATCH LOGIC
                </Pill>
              </div>

              <div className="mt-5 space-y-3">
                {/* Deal drop controls */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 ring-1 ring-slate-200 dark:ring-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">Momentum Trigger: Deal Drop</div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Select manual deployment for tactical peak engagement.</div>
                    </div>
                    <div className="w-32">
                      <Select
                        value={dealDropMode}
                        onChange={(v) => setDealDropMode(v as "manual" | "scheduled")}
                        options={[
                          { value: 'manual', label: 'Manual', hint: 'Tactical' },
                          { value: 'scheduled', label: 'Scheduled', hint: 'Auto' },
                        ]}
                      />
                    </div>
                  </div>

                  {dealDropMode === 'scheduled' ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase mb-2">Lead Sync Offset</div>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          step={1}
                          value={dealDropAtOffsetMin}
                          onChange={(e) => setDealDropAtOffsetMin(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-50">{dealDropAtOffsetMin}M</span>
                          <span className="text-[10px] font-bold text-slate-500">{fmtLocal(new Date(start.getTime() + dealDropAtOffsetMin * 60 * 1000))}</span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase mb-2">Post-Live Replay Ready</div>
                        <input
                          type="range"
                          min={0}
                          max={240}
                          step={5}
                          value={replayDelayMinutes}
                          onChange={(e) => setReplayDelayMinutes(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-50">{replayDelayMinutes}M</span>
                          <span className="text-[10px] font-bold text-slate-500">{fmtLocal(new Date(end.getTime() + replayDelayMinutes * 60 * 1000))}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic">
                          "Manual mode active. Trigger during peak conversion windows (e.g., reveal, limited stock)."
                        </div>
                        <Btn
                          tone="primary"
                          onClick={() => setToast('Tactical Deal Drop Triggered')}
                          left={<Zap className="h-4 w-4" />}
                          disabled={sessionStatus !== 'Live'}
                        >
                          Fire Now
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>

                {reminders.map((r) => {
                  const enabled = enabledReminders[r.key];
                  const time =
                    r.key === 't24h'
                      ? computedTimes.t24h
                      : r.key === 't1h'
                        ? computedTimes.t1h
                        : r.key === 't10m'
                          ? computedTimes.t10m
                          : r.key === 'live_now'
                            ? computedTimes.live_now
                            : r.key === 'deal_drop'
                              ? computedTimes.deal_drop
                              : computedTimes.replay_ready;

                  const timeText = time ? fmtLocal(time) : 'Manual Trigger';
                  const isWaRule = r.key !== 't24h';
                  return (
                    <div
                      key={r.key}
                      className={cn(
                        'rounded-2xl p-4 ring-1 transition-all',
                        enabled ? 'bg-slate-100 dark:bg-slate-800/40 ring-slate-200 dark:ring-slate-700' : 'bg-transparent ring-slate-100 dark:ring-slate-800 opacity-60 hover:opacity-100',
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{r.label}</div>
                            <Pill tone="neutral">
                              <CalendarClock className="h-3 w-3" />
                              {timeText}
                            </Pill>
                            <Pill tone={enabled ? 'good' : 'neutral'}>
                              {enabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {enabled ? 'READY' : 'BYPASSED'}
                            </Pill>
                            {isWaRule && enabledChannels.whatsapp ? (
                              <Pill tone="warn" title="Protocol: Opt-in users only">
                                <AlertTriangle className="h-3 w-3" />
                                WABA SYNC
                              </Pill>
                            ) : null}
                          </div>

                          <div className="mt-2 text-[10px] font-bold text-slate-500 dark:text-slate-500 leading-tight">{r.description}</div>

                          {r.key === 't24h' ? (
                            <div className="mt-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 inline-block">
                              Calculation: (Termination + Buffer) − 24h Window
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-center">
                          <Toggle value={enabled} onChange={(v) => setEnabledReminders((s) => ({ ...s, [r.key]: v }))} />
                          <Btn
                            tone="ghost"
                            onClick={() => {
                              setPreviewOpen(true);
                              setPreviewScenario(r.key);
                              setPreviewTab(r.key === 't24h' ? 'init' : 'whatsapp');
                            }}
                            left={<Phone className="h-4 w-4" />}
                          >
                            Preview
                          </Btn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20 text-xs text-amber-900 dark:text-amber-400">
                <div className="font-black uppercase tracking-wider mb-1">Opt-In Protocol Warning</div>
                <div className="font-semibold leading-relaxed">
                  WhatsApp mandates that reminders can only be transmitted to recipients who have successfully initiated a conversation via your published prompt.
                </div>
              </div>
            </div>

            {/* Template packs */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Messaging Blueprint</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Select an approved communication framework. All templates are pre-validated for deliverability.
                  </div>
                </div>
                <Pill tone="neutral">
                  <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  PRE-VALIDATED
                </Pill>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {templatePacks.map((p) => {
                  const locked = Boolean(p.proOnly) && !isPro;
                  const selected = p.id === selectedPackId;
                  const channelLabel = p.channels.map((c) => channels.find((x) => x.key === c)?.short ?? c).join(', ');
                  return (
                    <button
                      key={p.id}
                      onClick={() => !locked && setSelectedPackId(p.id)}
                      className={cn(
                        'rounded-2xl p-4 text-left ring-1 transition-all group',
                        selected
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-slate-900 dark:ring-slate-100 shadow-lg shadow-slate-900/10'
                          : 'bg-white dark:bg-slate-800/40 text-slate-900 dark:text-slate-300 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
                        locked && 'opacity-60 cursor-not-allowed grayscale',
                      )}
                      disabled={locked}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-black uppercase tracking-tight">{p.name}</div>
                            <Pill tone={selected ? 'neutral' : 'neutral'}>
                              <BadgeCheck className="h-3 w-3" />
                              {p.version}
                            </Pill>
                            {p.proOnly ? (
                              <Pill tone="pro">
                                <Lock className="h-3 w-3" />
                                PRO
                              </Pill>
                            ) : null}
                          </div>
                          <div className={cn('mt-2 text-[10px] font-bold leading-tight transition', selected ? 'text-white/70 dark:text-slate-900/70' : 'text-slate-500 dark:text-slate-500')}>
                            {p.notes}
                          </div>
                          <div className={cn('mt-3 text-[10px] font-black uppercase tracking-widest transition', selected ? 'text-white/80 dark:text-slate-900/80' : 'text-slate-400 dark:text-slate-500')}>
                            Channels: {channelLabel}
                          </div>
                        </div>

                        {selected ? (
                          <div className="shrink-0 bg-white/20 dark:bg-black/20 p-1.5 rounded-full">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-5 ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-3">Active Blueprint Preview</div>
                <div className="whitespace-pre-wrap rounded-xl bg-white dark:bg-slate-900 p-4 text-[13px] font-bold text-slate-800 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-800 leading-relaxed shadow-inner">
                  {templateFill(selectedTemplates?.t1h || "")}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn
                    tone="primary"
                    onClick={() => {
                      navigator.clipboard?.writeText(templateFill(selectedTemplates?.t1h || "")).catch(() => { });
                      setToast('Template Copy Verified');
                    }}
                    left={<Copy className="h-4 w-4" />}
                  >
                    Copy example
                  </Btn>
                  <Btn tone="ghost" onClick={() => setPreviewOpen(true)} left={<Phone className="h-4 w-4" />}>
                    Target preview
                  </Btn>
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-5 space-y-4">
            {/* Prompt blocks */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Deployment Bricks</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Embed these assets on stickers, pinned posts, and storefronts.</div>
                </div>
                <Pill tone="neutral">
                  <Link2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  ASSET FEED
                </Pill>
              </div>

              <div className="mt-5 space-y-4">
                {enabledChannelList.map((c) => {
                  const locked = Boolean(c.proOnly) && !isPro;
                  const link = clickToChatLink(c.key);
                  return (
                    <div key={c.key} className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 ring-1 ring-slate-200 dark:ring-slate-700">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{c.name}</div>
                            <Pill tone="neutral">
                              <Link2 className="h-3 w-3" />
                              {c.short}
                            </Pill>
                          </div>
                          <div className="mt-1 truncate text-[10px] font-bold text-slate-500 dark:text-slate-500">{link}</div>
                        </div>

                        <div className="shrink-0">
                          <Btn
                            tone="primary"
                            onClick={() => {
                              navigator.clipboard?.writeText(link).catch(() => { });
                              setToast(`${c.name} Link Ready`);
                            }}
                            disabled={locked}
                            left={<Copy className="h-4 w-4" />}
                          >
                            Copy Asset
                          </Btn>
                        </div>
                      </div>

                      {c.supportsQr ? (
                        <div className="mt-4 flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl ring-1 ring-slate-200 dark:ring-slate-800">
                          <img
                            src={makeQrUrl(link, 140)}
                            alt={`${c.name} QR`}
                            className="h-[100px] w-[100px] rounded-lg object-contain dark:invert"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase mb-1.5">Surface Recommendations</div>
                            <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                              Optimal for Instagram Story stickers, pinned Discord channels, and YouTube bio links.
                            </div>
                            <div className="mt-2 text-right">
                              <Btn
                                tone="ghost"
                                onClick={() => {
                                  setPreviewOpen(true);
                                  setPreviewTab('init');
                                }}
                                left={<Phone className="h-4 w-4" />}
                              >
                                View Mockup
                              </Btn>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">
                          Channel limitation: Vector QR generation not available for this node in the current environment.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20 text-xs text-amber-900 dark:text-amber-400">
                <div className="font-black uppercase tracking-wider mb-1">Opt-In Sequence</div>
                <div className="font-semibold leading-relaxed text-[10px]">
                  Reminders are only dispatched after the recipient interacts with one of these assets. Do not broadcast to stale lists.
                </div>
              </div>
            </div>

            {/* Mini summary */}
            <div className="rounded-3xl bg-slate-900 dark:bg-black p-5 text-white shadow-2xl transition-all hover:scale-[1.01] ring-1 ring-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">Protocol Synopsis</div>
                  <div className="mt-1 text-sm font-black text-white uppercase tracking-tight">WABA Sync: {fmtLocal(computedTimes.t24h)}</div>
                  <div className="mt-1 text-[10px] font-bold text-white/60">
                    Transmission window terminates at <span className="font-black text-white italic">{fmtLocal(waWindowEnd)}</span>.
                  </div>
                </div>
                <Pill tone="pro">
                  <Timer className="h-3.5 w-3.5" />
                  ARCH-24H
                </Pill>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">Enabled Streams</div>
                  <div className="flex flex-wrap gap-2">
                    {enabledChannelList.length > 0 ? (
                      enabledChannelList.map((c) => (
                        <span key={c.key} className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black uppercase text-white ring-1 ring-white/5">
                          {c.short}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] font-bold text-white/30 italic">No channels synchronized</span>
                    )}
                  </div>

                  <div className="mt-4 text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">Active Timeline Nodes</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(enabledReminders)
                      .filter(([, v]) => v)
                      .map(([k]) => (
                        <span key={k} className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black uppercase text-white ring-1 ring-white/5">
                          {k.replaceAll('_', ' ')}
                        </span>
                      ))}
                    {Object.values(enabledReminders).every((v) => !v) && (
                      <span className="text-[10px] font-bold text-white/30 italic">No notifications scheduled</span>
                    )}
                  </div>
                </div>

                <div className="bg-orange-500/10 rounded-xl p-3 border border-orange-500/20">
                  <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">System Integrity</div>
                  <div className="text-[10px] font-bold text-orange-200/80 leading-tight">
                    All transmission timestamps have been validated against the broadcast origin and termination vectors.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phone preview drawer */}
        <Drawer
          open={previewOpen}
          title="Protocol Simulation"
          onClose={() => setPreviewOpen(false)}
          widthClass="max-w-5xl"
          right={
            <div className="flex gap-2">
              <Pill tone="pro">
                <CheckCircle2 className="h-3 w-3" />
                SYSTEM VALID
              </Pill>
            </div>
          }
        >
          <div className="flex flex-col h-full gap-6">
            <div className="rounded-3xl bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-6 ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="min-w-0">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5">Simulation Controller</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Choose a node to visualize the transmission strategy.</div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-2xl bg-white dark:bg-slate-900 p-1.5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
                    {([
                      { k: 'init', label: 'Prompt' },
                      { k: 'whatsapp', label: 'WABA' },
                      { k: 'telegram', label: 'T-Bot' },
                      { k: 'rcs', label: 'SMS' },
                    ] as const).map((t) => {
                      const active = previewTab === t.k;
                      return (
                        <button
                          key={t.k}
                          onClick={() => setPreviewTab(t.k as PreviewTabKey)}
                          className={cn(
                            'rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-tight transition-all',
                            active
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
                          )}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="w-full sm:w-48">
                    <Select
                      value={previewScenario}
                      onChange={(v) => setPreviewScenario(v as ReminderKey)}
                      options={[
                        { value: 't24h', label: 'T-24h (Prompt)', hint: 'Initiation' },
                        { value: 't1h', label: 'T-1h', hint: 'Phase 1' },
                        { value: 't10m', label: 'T-10m', hint: 'Phase 2' },
                        { value: 'live_now', label: 'Live Now', hint: 'Phase 3' },
                        { value: 'deal_drop', label: 'Deal Drop', hint: 'Phase 4' },
                        { value: 'replay_ready', label: 'Replay Ready', hint: 'Phase 5' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Render preview */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 flex-1">
              <div className="lg:col-span-12 xl:col-span-7">
                {previewTab === 'init' ? (
                  <PhoneMock
                    title="Initiation Prompt"
                    subtitle="Visual Delivery Payload"
                    body={
                      <div className="space-y-4">
                        <div className="whitespace-pre-wrap text-[13px] font-bold text-slate-800 dark:text-slate-200 leading-relaxed italic">
                          "{initiationPromptText}"
                        </div>
                        <div className="rounded-xl bg-orange-500 p-4 ring-1 ring-orange-600 shadow-lg shadow-orange-500/20 text-center transition hover:brightness-105 cursor-pointer">
                          <div className="flex items-center justify-center gap-2 text-sm font-black text-white uppercase tracking-widest">
                            <Link2 className="h-4 w-4" />
                            Launch Protocol
                          </div>
                        </div>
                      </div>
                    }
                    footer={
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-500 text-center">
                        Transmission Scheduled: <span className="text-slate-900 dark:text-slate-200">{fmtLocal(computedTimes.t24h)}</span>
                      </div>
                    }
                  />
                ) : null}

                {previewTab === 'whatsapp' ? (
                  <PhoneMock
                    title="WhatsApp Business"
                    subtitle={`Scenario: ${previewScenario.replaceAll('_', ' ')}`}
                    body={
                      <div className="space-y-4">
                        <div className="whitespace-pre-wrap text-[13px] font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                          {templateFill(
                            previewScenario === 't24h'
                              ? selectedTemplates?.t24h || ""
                              : previewScenario === 't1h'
                                ? selectedTemplates?.t1h || ""
                                : previewScenario === 't10m'
                                  ? selectedTemplates?.t10m || ""
                                  : previewScenario === 'live_now'
                                    ? selectedTemplates?.live_now || ""
                                    : previewScenario === 'deal_drop'
                                      ? selectedTemplates?.deal_drop || ""
                                      : selectedTemplates?.replay_ready || "",
                          )}
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 p-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700 transition">
                          <div className="flex items-center gap-2 uppercase tracking-widest mb-1 text-slate-900 dark:text-slate-300">
                            <ShieldCheck className="h-3 w-3" />
                            Delivery Protocol
                          </div>
                          Restricted to active opt-in sessionz only.
                        </div>
                      </div>
                    }
                    footer={
                      <div className="space-y-2">
                        <div className="flex gap-2 justify-center">
                          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-[10px] font-black text-slate-900 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700">
                            SYNC: {fmtLocal(computedTimes.t24h)}
                          </div>
                          <div className="rounded-lg bg-orange-500/10 px-3 py-1.5 text-[10px] font-black text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/20">
                            TTL: {fmtLocal(waWindowEnd)}
                          </div>
                        </div>
                      </div>
                    }
                  />
                ) : null}

                {previewTab === 'telegram' ? (
                  <PhoneMock
                    title="Telegram Notification"
                    subtitle={`Scenario: ${previewScenario.replaceAll('_', ' ')}`}
                    body={
                      <div className="space-y-4">
                        <div className="whitespace-pre-wrap text-[13px] font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                          {templateFill(
                            previewScenario === 't24h'
                              ? selectedTemplates?.t24h || ""
                              : previewScenario === 't1h'
                                ? selectedTemplates?.t1h || ""
                                : previewScenario === 't10m'
                                  ? selectedTemplates?.t10m || ""
                                  : previewScenario === 'live_now'
                                    ? selectedTemplates?.live_now || ""
                                    : previewScenario === 'deal_drop'
                                      ? selectedTemplates?.deal_drop || ""
                                      : selectedTemplates?.replay_ready || "",
                          )}
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-black px-4 py-2.5 text-xs font-black text-white uppercase tracking-widest shadow-lg">
                          <ExternalLink className="h-4 w-4" />
                          View Broadcast
                        </div>
                      </div>
                    }
                  />
                ) : null}

                {previewTab === 'rcs' ? (
                  <PhoneMock
                    title="RCS / SMS Payload"
                    subtitle="Universal Fallback Node"
                    body={
                      <div className="space-y-4">
                        <div className="whitespace-pre-wrap text-[13px] font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                          {templateFill(
                            previewScenario === 't24h'
                              ? selectedTemplates?.t24h || ""
                              : previewScenario === 't1h'
                                ? selectedTemplates?.t1h || ""
                                : previewScenario === 't10m'
                                  ? selectedTemplates?.t10m || ""
                                  : previewScenario === 'live_now'
                                    ? selectedTemplates?.live_now || ""
                                    : previewScenario === 'deal_drop'
                                      ? selectedTemplates?.deal_drop || ""
                                      : selectedTemplates?.replay_ready || "",
                          )}
                        </div>
                        <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700 italic">
                          Rich interaction cards may be truncated on legacy endpoints. Ensure links are explicitly visible.
                        </div>
                      </div>
                    }
                  />
                ) : null}
              </div>

              <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 sm:p-6 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-4">Preflight Checklist</div>
                  <div className="space-y-3">
                    {[
                      { label: 'Lifecycle Continuity', ok: end.getTime() > start.getTime() },
                      { label: 'Network Synchronization', ok: enabledChannelList.length > 0 },
                      { label: 'Blueprint Compatibility', ok: !(selectedPack?.proOnly && !isPro) },
                      { label: 'WABA Delivery Sync', ok: !enabledChannels.whatsapp || waPromptTime.getTime() < start.getTime() },
                    ].map((i) => (
                      <div key={i.label} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 ring-1 ring-slate-200 dark:ring-slate-700 transition">
                        <div className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{i.label}</div>
                        <Pill tone={i.ok ? 'good' : 'warn'}>
                          {i.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {i.ok ? 'VALID' : 'FIX'}
                        </Pill>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20 text-xs text-amber-900 dark:text-amber-400 transition">
                    <div className="font-black uppercase tracking-wider mb-1">Architecture Reminder</div>
                    <div className="font-semibold text-[10px] leading-relaxed">
                      All transmission nodes require an initial state transition (Prompt Interaction) to authorize automated messaging.
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-900 dark:bg-black p-5 sm:p-6 text-white shadow-2xl ring-1 ring-white/10 transition">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">Toolkit</div>
                      <div className="mt-1 text-sm font-black text-white uppercase tracking-tight">External Asset Export</div>
                    </div>
                    <Pill tone="pro">
                      <Download className="h-3 w-3" />
                      EXPORT
                    </Pill>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Btn
                      tone="primary"
                      onClick={() => {
                        navigator.clipboard?.writeText(clickToChatLink('whatsapp')).catch(() => { });
                        setToast('Global Link Captured');
                      }}
                      left={<Copy className="h-4 w-4" />}
                    >
                      Copy WABA Link
                    </Btn>
                    <Btn
                      tone="ghost"
                      onClick={() => {
                        navigator.clipboard?.writeText(initiationPromptText).catch(() => { });
                        setToast('Prompt Payload Captured');
                      }}
                      left={<Copy className="h-4 w-4" />}
                    >
                      Copy Prompt Text
                    </Btn>
                  </div>

                  <div className="mt-5 text-[10px] font-bold text-white/40 leading-relaxed italic">
                    Note: Export high-resolution manifest cards (Vector QR) for physical storefront and pinned social assets.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Drawer>

        {/* Toast */}
        {toast ? (
          <div className="fixed bottom-4 left-1/2 z-[99] -translate-x-1/2 transition-all">
            <div className="rounded-full bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 shadow-2xl ring-1 ring-white/10 dark:ring-black/10">
              {toast}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
