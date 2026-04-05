'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { useNotification } from '../../contexts/NotificationContext';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useApiResource } from '../../hooks/useApiResource';
import { creatorApi } from '../../lib/creatorApi';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Film,
  Info,
  Lock,
  MessageCircle,
  Phone,
  Plus,
  Scissors,
  Send,
  Sparkles,
  Timer,
  Trash2,
  X,
} from 'lucide-react';

/**
 * G. Post-Live Publisher
 * Role: Creator, Seller Manager
 * Surface: Creator Studio Web
 * Placement: Live Sessionz Pro → Post-Live
 *
 * Features:
 * • Replay page review + publish
 * • Clip selection and export plan
 * • “Send replay” to messaging channels
 * • Post-live conversion booster:
 *    - cart recovery reminders
 *    - price-drop messages
 *    - restock alerts
 *
 * Notes:
 * - TailwindCSS assumed.
 */

const ORANGE = '#f77f00';

const ROUTES = {
  liveDashboard: '/live-dashboard-2',
  liveBuilder: '/live-builder',
  audienceNotifications: '/audience-notifications',
  overlaysCtas: '/overlays-ctas-pro',
  postLive: '/post-live-publisher',
};

const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ');

function safeNav(url: string) {
  if (typeof window === 'undefined') return;
  window.location.assign(url);
}

function parseSearch() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

type SessionStatus = 'Draft' | 'Scheduled' | 'Live' | 'Ended';
type ChannelKey = 'whatsapp' | 'telegram' | 'line' | 'viber' | 'rcs';

type Channel = {
  key: ChannelKey;
  name: string;
  short: string;
  connected: 'Connected' | 'Needs re-auth' | 'Blocked';
  supportsRich: boolean;
  costPerMessageUSD: number;
};

type AudienceKey = 'past_buyers' | 'attendees' | 'vip_list' | 'category_interest';

type Clip = {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  format: '9:16' | '16:9' | '1:1';
  status: 'Draft' | 'Queued' | 'Exported';
};

type PostLivePayload = {
  session?: {
    id?: string;
    title?: string;
    status?: SessionStatus;
    endedISO?: string;
    replayUrl?: string;
    coverUrl?: string;
  };
  plan?: 'Standard' | 'Pro';
  published?: boolean;
  schedulePublish?: boolean;
  publishAt?: string;
  allowComments?: boolean;
  showProductStrip?: boolean;
  clips?: Clip[];
  channels?: Channel[];
  enabledChannels?: Partial<Record<ChannelKey, boolean>>;
  audience?: AudienceKey;
  scheduleSends?: boolean;
  sendNow?: boolean;
  templatePack?: 'Default' | 'VIP' | 'High intent';
  cartRecovery?: boolean;
  priceDrop?: boolean;
  restock?: boolean;
  metrics?: {
    viewers?: number;
    clicks?: number;
    orders?: number;
    gmv?: number;
    addToCart?: number;
    cartAbandon?: number;
    ctr?: number;
    conv?: number;
    ordersSeries?: number[];
  };
};

function fmtInt(n: number) {
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function fmtLocal(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
            : "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold ring-1 whitespace-nowrap", cls)}>
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
}: {
  tone?: "neutral" | "primary" | "ghost" | "danger";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  left?: React.ReactNode;
  title?: string;
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
          : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm";
  return (
    <button
      title={title}
      className={cx(base, cls)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {disabled && tone === 'primary' ? <CircularProgress size={16} color="inherit" /> : left}
      {children}
    </button>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => (!disabled ? onChange(!value) : undefined)}
      className={cx(
        "relative inline-flex h-5 w-10 sm:h-6 sm:w-11 items-center rounded-full transition",
        disabled ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed" : value ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-300 dark:bg-slate-700",
      )}
      aria-pressed={value}
    >
      <span className={cx("inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-sm transition", value ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
  right,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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

function MiniSparkline({ data }: { data: number[] }) {
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

export default function PostLivePublisherPage() {
  const { showSuccess, showNotification } = useNotification();
  const { run, isPending } = useAsyncAction();
  const sp = useMemo(() => parseSearch(), []);
  const sessionId = sp.get('sessionId') ?? '';
  const { data: payload, loading, error } = useApiResource<PostLivePayload | null>({
    initialData: null,
    loader: () => creatorApi.liveTool("post-live") as Promise<PostLivePayload>,
  });

  const replayBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/replay/${encodeURIComponent(sessionId)}`;
  }, [sessionId]);
  const [plan, setPlan] = useState<'Standard' | 'Pro' | null>(null);
  const isPro = plan === 'Pro';

  const session = useMemo(
    () =>
      payload?.session
        ? {
            id: payload.session.id || sessionId,
            title: payload.session.title || '',
            status: payload.session.status || ('Draft' as SessionStatus),
            endedISO: payload.session.endedISO || '',
            replayUrl: payload.session.replayUrl || '',
            coverUrl: payload.session.coverUrl || '',
          }
        : null,
    [payload?.session, sessionId, replayBaseUrl],
  );

  // Replay/publish state
  const [published, setPublished] = useState(false);
  const [schedulePublish, setSchedulePublish] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [showProductStrip, setShowProductStrip] = useState(true);

  // Clips
  const [clips, setClips] = useState<Clip[]>([]);

  const [clipModal, setClipModal] = useState(false);
  const [clipTitle, setClipTitle] = useState('');
  const [clipStart, setClipStart] = useState(120);
  const [clipEnd, setClipEnd] = useState(160);
  const [clipFormat, setClipFormat] = useState<'9:16' | '16:9' | '1:1'>('9:16');

  const addClip = () => {
    const title = clipTitle.trim() || 'New clip';
    const id = `c_${Math.random().toString(16).slice(2)}`;
    setClips((s) => [{ id, title, startSec: Math.min(clipStart, clipEnd - 1), endSec: Math.max(clipEnd, clipStart + 1), format: clipFormat, status: 'Draft' }, ...s]);
    setClipModal(false);
    setClipTitle('');
  };

  const handleAutoHighlights = () => {
    const generated: Clip[] = [
      { id: `auto_${Date.now()}_1`, title: 'Top product moment', startSec: 45, endSec: 78, format: '9:16', status: 'Draft' },
      { id: `auto_${Date.now()}_2`, title: 'Audience Q&A highlight', startSec: 180, endSec: 212, format: '1:1', status: 'Draft' },
      { id: `auto_${Date.now()}_3`, title: 'Closing CTA', startSec: 320, endSec: 350, format: '16:9', status: 'Draft' },
    ];
    const nextClips = [...generated, ...clips].slice(0, 30);
    setClips(nextClips);
    void creatorApi.patchLiveTool("post-live", {
      session,
      plan,
      published,
      schedulePublish,
      publishAt,
      allowComments,
      showProductStrip,
      clips: nextClips,
      channels,
      enabledChannels,
      audience,
      scheduleSends,
      sendNow,
      templatePack,
      cartRecovery,
      priceDrop,
      restock,
      metrics,
    });
    showSuccess("Auto highlights generated.");
  };

  // Channels (send replay)
  const channels = useMemo(() => payload.channels || [], [payload.channels]);

  const [enabledChannels, setEnabledChannels] = useState<Record<ChannelKey, boolean>>({
    whatsapp: false,
    telegram: false,
    line: false,
    viber: false,
    rcs: false,
  });

  const [audience, setAudience] = useState<AudienceKey>('past_buyers');
  const [scheduleSends, setScheduleSends] = useState(false);
  const [sendNow, setSendNow] = useState(false);
  const [templatePack, setTemplatePack] = useState<'' | 'Default' | 'VIP' | 'High intent'>('');

  // Booster toggles
  const [cartRecovery, setCartRecovery] = useState(false);
  const [priceDrop, setPriceDrop] = useState(false);
  const [restock, setRestock] = useState(false);
  useEffect(() => {
    if (!payload) return;
    setPlan(payload.plan ?? null);
    setPublished(payload.published ?? false);
    setSchedulePublish(payload.schedulePublish ?? false);
    setPublishAt(payload.publishAt || '');
    setAllowComments(payload.allowComments ?? true);
    setShowProductStrip(payload.showProductStrip ?? true);
    setClips(payload.clips || []);
    setEnabledChannels((current) => ({ ...current, ...(payload.enabledChannels || {}) }));
    setAudience(payload.audience || 'past_buyers');
    setScheduleSends(payload.scheduleSends ?? false);
    setSendNow(payload.sendNow ?? false);
    setTemplatePack(payload.templatePack || '');
    setCartRecovery(payload.cartRecovery ?? false);
    setPriceDrop(payload.priceDrop ?? false);
    setRestock(payload.restock ?? false);
  }, [payload]);

  const metrics = useMemo(
    () =>
      payload?.metrics
        ? {
            viewers: payload.metrics.viewers || 0,
            clicks: payload.metrics.clicks || 0,
            orders: payload.metrics.orders || 0,
            gmv: payload.metrics.gmv || 0,
            addToCart: payload.metrics.addToCart || 0,
            cartAbandon: payload.metrics.cartAbandon || 0,
            ctr: payload.metrics.ctr || 0,
            conv: payload.metrics.conv || 0,
            ordersSeries: payload.metrics.ordersSeries || [],
          }
        : null,
    [payload?.metrics],
  );
  void metrics; // Suppress unused

  const enabledChannelList = useMemo(() => channels.filter((c) => enabledChannels[c.key]), [channels, enabledChannels]);

  const estimatedReach = useMemo(() => {
    return Math.max(0, metrics.viewers);
  }, [metrics.viewers]);

  const estimatedCost = useMemo(() => {
    const costPer = enabledChannelList.reduce((sum, c) => sum + c.costPerMessageUSD, 0);
    return estimatedReach * costPer;
  }, [estimatedReach, enabledChannelList]);

  const publishBlocked = (schedulePublish && !publishAt) || isPending;

  const preflight = useMemo(() => {
    const items: Array<{ label: string; ok: boolean; detail?: string }> = [
      { label: 'Replay cover + title ready', ok: true },
      { label: 'At least 1 clip selected (optional)', ok: clips.length >= 1, detail: clips.length ? `${clips.length} clip(s)` : 'None' },
      { label: 'Messaging channels connected', ok: enabledChannelList.every((c) => c.connected === 'Connected'), detail: enabledChannelList.some((c) => c.connected !== 'Connected') ? 'Reconnect required' : undefined },
    ];
    return items;
  }, [clips.length, enabledChannelList]);
  void preflight; // Suppress unused

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] dark:bg-slate-950 text-sm text-slate-600 dark:text-slate-300">
        Loading post-live publisher…
      </div>
    );
  }

  if (error || !payload || !plan || !session || !session.endedISO || !templatePack || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] dark:bg-slate-950 p-6">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-300">
          Post-live publisher data is unavailable.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
        <div className="w-full px-4 md:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                <button className="hover:text-slate-700 dark:hover:text-slate-200" onClick={() => safeNav(ROUTES.liveDashboard)}>
                  Live Sessionz Pro
                </button>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-slate-900 dark:text-slate-200">Post‑Live</span>
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
                </div>
              </div>

              <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                Ended <span className="font-semibold text-slate-900 dark:text-slate-200">{fmtLocal(session.endedISO)}</span> • Replay URL{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-200">{session.replayUrl}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 transition"
                type="button"
              >
                <Sparkles className="h-4 w-4" />
                Plan: {plan}
              </button>

              <div className="hidden sm:block">
                <Btn
                  tone="ghost"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(session.replayUrl);
                    showSuccess("Replay link copied");
                  }}
                  left={<Copy className="h-4 w-4" />}
                >
                  Copy replay link
                </Btn>
              </div>

              <Btn tone="neutral" onClick={() => safeNav(session.replayUrl)} left={<ExternalLink className="h-4 w-4" />}>
                Preview
              </Btn>

              <Btn
                tone="primary"
                disabled={publishBlocked}
                onClick={() => run(async () => {
                  setPublished(true);
                  await creatorApi.patchLiveTool("post-live", {
                    session,
                    plan,
                    published: true,
                    schedulePublish,
                    publishAt,
                    allowComments,
                    showProductStrip,
                    clips,
                    channels,
                    enabledChannels,
                    audience,
                    scheduleSends,
                    sendNow,
                    templatePack,
                    cartRecovery,
                    priceDrop,
                    restock,
                    metrics,
                  });
                }, { successMessage: "Replay published successfully!" })}
                left={<CheckCircle2 className="h-4 w-4" />}
              >
                {isPending ? "Publishing..." : "Publish"}
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6">
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
                <Pill tone={published ? "good" : "warn"}>
                  {published ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {published ? "Published" : "Not published"}
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-5">
                  <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
                    <img src={session.coverUrl} alt="Replay cover" className="aspect-[4/3] w-full object-cover" />
                  </div>
                  <div className="mt-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">Replay URL</div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{session.replayUrl}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn
                        tone="neutral"
                        onClick={async () => {
                          await navigator.clipboard?.writeText(session.replayUrl);
                          showSuccess("Copied replay URL");
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy
                      </Btn>
                      <Btn tone="ghost" onClick={() => safeNav(session.replayUrl)} left={<ExternalLink className="h-4 w-4" />}>
                        Open
                      </Btn>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-3">
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
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
                            className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition"
                          />
                        </div>
                      ) : null}

                      {!isPro ? (
                        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400 transition">
                          <div className="font-semibold">Why locked</div>
                          <div className="mt-1">Scheduled publishing is Pro.</div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Comments</div>
                        <Toggle value={allowComments} onChange={setAllowComments} />
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Allow replay comments (where supported).</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
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
                    onClick={handleAutoHighlights}
                    left={<Sparkles className="h-4 w-4" />}
                    disabled={!isPro}
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
                  <div key={c.id} className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
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
                            const nextClips = clips.map((x) => (x.id === c.id ? { ...x, status: x.status === "Draft" ? "Queued" : x.status } : x));
                            setClips(nextClips);
                            void creatorApi.patchLiveTool("post-live", {
                              session,
                              plan,
                              published,
                              schedulePublish,
                              publishAt,
                              allowComments,
                              showProductStrip,
                              clips: nextClips,
                              channels,
                              enabledChannels,
                              audience,
                              scheduleSends,
                              sendNow,
                              templatePack,
                              cartRecovery,
                              priceDrop,
                              restock,
                              metrics,
                            });
                            showNotification("Queued export");
                          }}
                          left={<Download className="h-4 w-4" />}
                          disabled={c.status !== "Draft"}
                        >
                          Export
                        </Btn>
                        <Btn
                          tone="ghost"
                          onClick={() => {
                            const nextClips = clips.filter((x) => x.id !== c.id);
                            setClips(nextClips);
                            void creatorApi.patchLiveTool("post-live", {
                              session,
                              plan,
                              published,
                              schedulePublish,
                              publishAt,
                              allowComments,
                              showProductStrip,
                              clips: nextClips,
                              channels,
                              enabledChannels,
                              audience,
                              scheduleSends,
                              sendNow,
                              templatePack,
                              cartRecovery,
                              priceDrop,
                              restock,
                              metrics,
                            });
                            showNotification("Clip removed");
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
                <div className="mt-2 text-[10px] text-white/50">In production: integrate with your asset library + approval workflow.</div>
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
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
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

                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-400">Audience</div>
                        <select
                          value={audience}
                          onChange={(e) => setAudience(e.target.value as AudienceKey)}
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
                          onChange={(e) => setTemplatePack(e.target.value as 'Default' | 'VIP' | 'High intent')}
                          className="mt-2 w-full rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition"
                        >
                          <option>Default</option>
                          <option>VIP</option>
                          <option>High intent</option>
                        </select>
                      </label>
                    </div>

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
                    <Btn
                      tone="neutral"
                      onClick={() => showNotification('Preview message')}
                      left={<Phone className="h-4 w-4" />}
                    >
                      Preview
                    </Btn>
                    <Btn
                      tone="primary"
                      onClick={() => run(async () => {
                        await creatorApi.patchLiveTool("post-live", {
                          session,
                          plan,
                          published,
                          schedulePublish,
                          publishAt,
                          allowComments,
                          showProductStrip,
                          clips,
                          channels,
                          enabledChannels,
                          audience,
                          scheduleSends,
                          sendNow,
                          templatePack,
                          cartRecovery,
                          priceDrop,
                          restock,
                          metrics,
                        });
                      }, { successMessage: "Replay notification queued!" })}
                      disabled={enabledChannelList.length === 0 || isPending}
                      left={<Send className="h-4 w-4" />}
                    >
                      {isPending ? "Queuing..." : "Queue sends"}
                    </Btn>
                  </div>
                </div>

                <div className="md:col-span-5 space-y-3">
                  <div className="rounded-3xl bg-slate-900 p-4 text-white">
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
                    <div className="mt-3 rounded-2xl bg-white/10 p-3 text-sm">
                      🎬 Replay ready: <span className="font-semibold">{session.title}</span>
                      <br />
                      Tap to watch + shop: <span className="underline">{session.replayUrl}</span>
                    </div>
                    <div className="mt-3 text-[10px] text-white/50">In production: admin-approved template packs + compliance rules.</div>
                  </div>

                  <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Performance snapshot</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-xs text-slate-600 dark:text-slate-400">Viewers</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{fmtInt(metrics.viewers)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-xs text-slate-600 dark:text-slate-400">Orders</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{fmtInt(metrics.orders)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-xs text-slate-600 dark:text-slate-400">CTR</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{(metrics.ctr * 100).toFixed(1)}%</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                        <div className="text-xs text-slate-600 dark:text-slate-400">GMV</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">${fmtInt(metrics.gmv)}</div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
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
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Cart recovery</div>
                    <Toggle value={cartRecovery} onChange={setCartRecovery} />
                  </div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Remind users who added to cart but didn’t checkout.</div>
                  <div className="mt-2 text-[10px] font-semibold text-slate-700 dark:text-slate-500">Recommended: T+2h, T+24h</div>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Price‑drop messages</div>
                    <Toggle value={priceDrop} onChange={setPriceDrop} disabled={!isPro} />
                  </div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Notify watchers when you drop price post‑live.</div>
                  {!isPro ? <div className="mt-2 text-[10px] text-amber-900/80 dark:text-amber-400/80">Why locked: price-drop automation is Pro.</div> : null}
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
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
                <Btn tone="ghost" onClick={() => showNotification('Preview booster plan')} left={<Phone className="h-4 w-4" />}>
                  Preview
                </Btn>
                <Btn tone="primary" onClick={() => run(async () => {
                  await creatorApi.patchLiveTool("post-live", {
                    session,
                    plan,
                    published,
                    schedulePublish,
                    publishAt,
                    allowComments,
                    showProductStrip,
                    clips,
                    channels,
                    enabledChannels,
                    audience,
                    scheduleSends,
                    sendNow,
                    templatePack,
                    cartRecovery,
                    priceDrop,
                    restock,
                    metrics,
                  });
                }, { successMessage: "Booster plan saved!" })} left={<CheckCircle2 className="h-4 w-4" />}>
                  {isPending ? "Saving..." : "Save booster plan"}
                </Btn>
              </div>
            </div>
          </div>

          {/* Right: Preflight + quick actions */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Post‑live preflight</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Recommended checks before publishing and sending.</div>
                </div>
                <Pill tone={preflight.every((x) => x.ok) ? "good" : "warn"}>
                  {preflight.every((x) => x.ok) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {preflight.every((x) => x.ok) ? "Ready" : "Review"}
                </Pill>
              </div>

              <div className="mt-3 space-y-2">
                {preflight.map((p) => (
                  <div key={p.label} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition">
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
                <Btn tone="neutral" onClick={() => safeNav(ROUTES.liveBuilder)} left={<ExternalLink className="h-4 w-4" />}>
                  Open Live Builder
                </Btn>
                <Btn tone="neutral" onClick={() => safeNav(ROUTES.audienceNotifications)} left={<ExternalLink className="h-4 w-4" />}>
                  Audience Notifications
                </Btn>
                <Btn tone="neutral" onClick={() => safeNav(ROUTES.overlaysCtas)} left={<ExternalLink className="h-4 w-4" />}>
                  Overlays & CTAs
                </Btn>
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-800 text-[10px] sm:text-xs text-slate-700 dark:text-slate-400 transition">
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
            <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">Clip details</div>

              <label className="mt-3 block">
                <div className="text-xs font-semibold text-slate-700">Title</div>
                <input
                  value={clipTitle}
                  onChange={(e) => setClipTitle(e.target.value)}
                  placeholder="e.g., Price drop moment"
                  className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label>
                  <div className="text-xs font-semibold text-slate-700">Format</div>
                  <select
                    value={clipFormat}
                    onChange={(e) => setClipFormat(e.target.value as "9:16" | "16:9" | "1:1")}
                    className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </label>

                <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-700">Duration</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{Math.max(1, Math.abs(clipEnd - clipStart))}s</div>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-700">Start (sec)</div>
                  <input type="range" min={0} max={3600} value={clipStart} onChange={(e) => setClipStart(Number(e.target.value))} className="mt-2 w-full" />
                  <div className="mt-1 text-sm font-semibold text-slate-900">{clipStart}s</div>
                </div>
                <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-700">End (sec)</div>
                  <input type="range" min={1} max={3600} value={clipEnd} onChange={(e) => setClipEnd(Number(e.target.value))} className="mt-2 w-full" />
                  <div className="mt-1 text-sm font-semibold text-slate-900">{clipEnd}s</div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200 text-sm text-amber-900">
                <div className="font-semibold">Publishing note</div>
                <div className="mt-1">Clips should use licensed audio and approved visuals (same compliance as replay).</div>
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
