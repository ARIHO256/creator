'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  BellOff,
  CheckCircle2,
  ChevronDown,
  Copy,
  Flag,
  Info,
  Link as LinkIcon,
  Lock,
  MessageSquare,
  PlusCircle,
  Search,
  Send,
  Settings,
  Shield,
  Timer,
  Trash2,
  VolumeX,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { creatorApi } from '../../lib/creatorApi';

/**
 * F. Safety & Moderation
 * Role: Creator, Support Ops (viewer)
 * Surface: Creator Studio Web
 * Placement: Live Sessionz Pro → Safety & Moderation
 *
 * Features:
 * • Chat moderation tools
 * • Keyword filters
 * • “Emergency mute chat” (per destination where possible)
 * • “Pause outgoing notifications” toggle
 * • Incident report button to Ops
 *
 * Notes:
 * - Backed by /tools/safety API for read/write state.
 * - TailwindCSS assumed.
 */

const ORANGE = '#f77f00';

const ROUTES = {
  liveDashboard: '/live-dashboard-2',
  liveBuilder: '/live-builder',
  streamToPlatforms: '/stream-to-platforms',
  audienceNotifications: '/audience-notifications',
  overlaysCtas: '/overlays-ctas-pro',
  postLive: '/post-live-publisher',
  safetyModeration: '/safety-moderation',
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
type RoleMode = 'creator' | 'ops_viewer';

type Destination = {
  id: string;
  name: string;
  type: 'Video Live' | 'Community Live';
  status: 'Connected' | 'Needs re-auth' | 'Blocked' | 'Stream key missing';
  liveState: 'Live' | 'Not live';
  supportsChat: boolean;
  supportsMuteChat: boolean;
  supportsEmergencyActions: boolean; // some platforms allow programmatic mute/slow-mode, etc.
};

type ChatMessage = {
  id: string;
  destId: string;
  userName: string;
  handle: string;
  avatarUrl?: string;
  text: string;
  atISO: string;
  flags: Array<'Spam' | 'Harassment' | 'Link' | 'Keyword'>;
};

type KeywordRule = {
  id: string;
  phrase: string;
  match: 'Contains' | 'Exact';
  action: 'Block' | 'Mask' | 'Flag';
  scope: 'All destinations' | 'Selected destinations';
  destinationIds?: string[];
  enabled: boolean;
};

type SafetyPayload = {
  plan?: 'Standard' | 'Pro';
  roleMode?: RoleMode;
  session?: {
    id?: string;
    title?: string;
    status?: SessionStatus;
    startedISO?: string;
    endsISO?: string;
  };
  destinations?: Destination[];
  messages?: ChatMessage[];
  keywordRules?: KeywordRule[];
  muteChat?: Record<string, boolean>;
  pauseNotifications?: boolean;
  autoModeration?: boolean;
  slowMode?: boolean;
  linkBlocking?: boolean;
  handledIds?: Record<string, boolean>;
};

function Pill({
  tone = 'neutral',
  children,
  title,
}: {
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'pro';
  children: React.ReactNode;
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
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold ring-1 whitespace-nowrap transition', cls)}>
      {children}
    </span>
  );
}

function Btn({
  tone = 'neutral',
  children,
  onClick,
  disabled,
  left,
  title,
}: {
  tone?: 'neutral' | 'primary' | 'ghost' | 'danger';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  left?: React.ReactNode;
  title?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
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
      className={cx(base, cls)}
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
      className={cx(
        'relative inline-flex h-5 w-10 sm:h-6 sm:w-11 items-center rounded-full transition-colors',
        disabled ? 'bg-slate-200 dark:bg-slate-800 cursor-not-allowed' : value ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700',
      )}
      aria-pressed={value}
    >
      <span
        className={cx(
          'inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-md transition',
          value ? 'translate-x-5' : 'translate-x-1',
        )}
      />
    </button>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
  right,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-x-0 bottom-0 top-0 mx-auto flex w-full flex-col bg-white dark:bg-slate-950 shadow-2xl transition sm:inset-y-12 sm:rounded-[2.5rem] sm:ring-1 sm:ring-slate-200 dark:sm:ring-slate-800 overflow-hidden" style={{ maxWidth: wide ? '1100px' : '700px' }}>
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

function Drawer({
  open,
  title,
  onClose,
  children,
  widthClass = 'max-w-xl',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
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
      <div className={cx('absolute right-0 top-0 h-full w-full bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-out sm:ring-1 sm:ring-slate-200 dark:sm:ring-slate-800', widthClass)}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</div>
            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
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

function fmtLocal(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' });
}

function agoLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export default function SafetyModerationPage() {
  const { data: payload } = useApiResource({
    initialData: {} as SafetyPayload,
    loader: () => creatorApi.liveTool('safety') as Promise<SafetyPayload>,
  });
  const sp = useMemo(() => parseSearch(), []);
  const sessionId = sp.get('sessionId') ?? 'session';

  const [plan, setPlan] = useState<'Standard' | 'Pro'>('Standard');
  const [roleMode, setRoleMode] = useState<RoleMode>('creator'); // Support Ops viewer mode disables actions

  const session = useMemo(
    () => ({
      id: payload.session?.id || sessionId,
      title: payload.session?.title || 'Live session',
      status: payload.session?.status || ('Draft' as SessionStatus),
      startedISO: payload.session?.startedISO || new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      endsISO: payload.session?.endsISO || new Date(Date.now() + 50 * 60 * 1000).toISOString(),
    }),
    [payload.session, sessionId],
  );

  const destinations: Destination[] = useMemo(
    () => (Array.isArray(payload.destinations) ? payload.destinations : []),
    [payload.destinations],
  );

  const [activeDestId, setActiveDestId] = useState('');
  useEffect(() => {
    if (!destinations.length) {
      if (activeDestId) setActiveDestId('');
      return;
    }
    if (!activeDestId || !destinations.some((entry) => entry.id === activeDestId)) {
      setActiveDestId(destinations[0].id);
    }
  }, [activeDestId, destinations]);

  const allMessages: ChatMessage[] = useMemo(
    () => (Array.isArray(payload.messages) ? payload.messages : []),
    [payload.messages],
  );

  const [search, setSearch] = useState('');
  const [hideHandled, setHideHandled] = useState(false);
  const [handledIds, setHandledIds] = useState<Record<string, boolean>>({});

  const filteredMessages = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allMessages
      .filter((m) => m.destId === activeDestId)
      .filter((m) => (hideHandled ? !handledIds[m.id] : true))
      .filter((m) => (s ? `${m.userName} ${m.handle} ${m.text}`.toLowerCase().includes(s) : true))
      .sort((a, b) => new Date(b.atISO).getTime() - new Date(a.atISO).getTime());
  }, [allMessages, activeDestId, search, hideHandled, handledIds]);

  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>([]);
  const [muteChat, setMuteChat] = useState<Record<string, boolean>>({});
  const [pauseNotifications, setPauseNotifications] = useState(false);

  // Premium controls
  const isPro = plan === 'Pro';
  const [autoModeration, setAutoModeration] = useState(false);
  const [slowMode, setSlowMode] = useState(false); // pro-only
  const [linkBlocking, setLinkBlocking] = useState(false);
  void autoModeration; void slowMode; void linkBlocking; // Suppress unused

  useEffect(() => {
    if (!payload || typeof payload !== 'object') return;
    if (payload.plan === 'Pro' || payload.plan === 'Standard') {
      setPlan(payload.plan);
    }
    if (payload.roleMode === 'creator' || payload.roleMode === 'ops_viewer') {
      setRoleMode(payload.roleMode);
    }
    if (Array.isArray(payload.keywordRules)) {
      setKeywordRules(payload.keywordRules);
    }
    if (payload.muteChat && typeof payload.muteChat === 'object' && !Array.isArray(payload.muteChat)) {
      setMuteChat(payload.muteChat);
    }
    if (typeof payload.pauseNotifications === 'boolean') {
      setPauseNotifications(payload.pauseNotifications);
    }
    if (typeof payload.autoModeration === 'boolean') {
      setAutoModeration(payload.autoModeration);
    }
    if (typeof payload.slowMode === 'boolean') {
      setSlowMode(payload.slowMode);
    }
    if (typeof payload.linkBlocking === 'boolean') {
      setLinkBlocking(payload.linkBlocking);
    }
    if (payload.handledIds && typeof payload.handledIds === 'object' && !Array.isArray(payload.handledIds)) {
      setHandledIds(payload.handledIds);
    }
  }, [payload]);

  const canAct = roleMode === 'creator';
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);
  const persistencePrimedRef = useRef(false);
  useEffect(() => {
    if (!persistencePrimedRef.current) {
      persistencePrimedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      void creatorApi.patchLiveTool('safety', {
        plan,
        roleMode,
        session,
        destinations,
        messages: allMessages,
        keywordRules,
        muteChat,
        pauseNotifications,
        autoModeration,
        slowMode,
        linkBlocking,
        handledIds,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    plan,
    roleMode,
    session,
    destinations,
    allMessages,
    keywordRules,
    muteChat,
    pauseNotifications,
    autoModeration,
    slowMode,
    linkBlocking,
    handledIds,
  ]);

  // Actions modal
  const [actionOpen, setActionOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'timeout' | 'ban' | null>(null);

  const openAction = (m: ChatMessage, t: 'delete' | 'timeout' | 'ban') => {
    setActionTarget(m);
    setActionType(t);
    setActionOpen(true);
  };

  const confirmAction = () => {
    if (!actionTarget || !actionType) return;
    setHandledIds((s) => ({ ...s, [actionTarget.id]: true }));
    setActionOpen(false);
    setToast(`Action applied: ${actionType.toUpperCase()} on ${actionTarget.handle}`);
  };

  // Incident report
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState<'Harassment' | 'Fraud/Scam' | 'Impersonation' | 'Safety Risk' | 'Other'>('Harassment');
  const [incidentSeverity, setIncidentSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [incidentText, setIncidentText] = useState('');
  const [includeLogs, setIncludeLogs] = useState(true);
  void incidentCategory; void incidentSeverity; void includeLogs; // Suppress unused

  // Keyword drawer
  const [keywordDrawer, setKeywordDrawer] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordAction, setNewKeywordAction] = useState<'Block' | 'Mask' | 'Flag'>('Flag');
  const [newKeywordMatch, setNewKeywordMatch] = useState<'Contains' | 'Exact'>('Contains');
  const [newKeywordScope, setNewKeywordScope] = useState<'All destinations' | 'Selected destinations'>('All destinations');
  const [newKeywordDestIds, setNewKeywordDestIds] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!destinations.length) return;
    setNewKeywordDestIds((prev) => {
      const next: Record<string, boolean> = {};
      destinations.forEach((destination) => {
        next[destination.id] = prev[destination.id] ?? true;
      });
      return next;
    });
  }, [destinations]);

  const addKeyword = () => {
    const phrase = newKeyword.trim();
    if (!phrase) return;
    const id = `k_${Date.now().toString(36)}`;
    const destIds =
      newKeywordScope === 'Selected destinations'
        ? Object.entries(newKeywordDestIds)
          .filter(([, v]) => v)
          .map(([k]) => k)
        : undefined;
    void addKeyword; // Suppress unused
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
    setNewKeyword('');
    setToast('Keyword rule added');
  };

  const preflight = useMemo(() => {
    const issues: Array<{ label: string; ok: boolean; detail?: string }> = [
      { label: 'At least 1 destination Live', ok: destinations.some((d) => d.liveState === 'Live') },
      { label: 'Keyword filters enabled', ok: keywordRules.some((k) => k.enabled) },
      { label: 'Notifications paused', ok: !pauseNotifications, detail: pauseNotifications ? 'Paused (sales impact risk)' : undefined },
    ];
    return issues;
  }, [destinations, keywordRules, pauseNotifications]);
  void preflight;

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
        <div className="w-full px-4 md:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <button className="hover:text-slate-900 dark:hover:text-slate-100 transition" onClick={() => safeNav(ROUTES.liveDashboard)}>
                  Live Sessionz Pro
                </button>
                <ChevronDown className="h-3 w-3 -rotate-90 text-slate-300 dark:text-slate-700" />
                <span className="text-slate-900 dark:text-slate-50">Safety & Moderation</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="truncate text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{session.title}</div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Pill tone={session.status === 'Live' ? 'good' : session.status === 'Scheduled' ? 'warn' : 'neutral'}>
                    <Timer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {session.status}
                  </Pill>
                  <Pill tone="neutral">
                    <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {session.id}
                  </Pill>
                  <Pill tone={isPro ? 'pro' : 'neutral'}>
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
                onClick={() => setPlan((p) => (p === 'Pro' ? 'Standard' : 'Pro'))}
                title="Toggle subscription plan"
              >
                <Zap className="h-4 w-4 text-amber-500" />
                Plan: {plan}
              </button>

              <select
                value={roleMode}
                onChange={(e) => setRoleMode(e.target.value as RoleMode)}
                className="h-10 rounded-xl bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                title="Role mode"
              >
                <option value="creator">Creator Mode</option>
                <option value="ops_viewer">Support Ops (Viewer)</option>
              </select>

              <Btn
                tone="ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(`https://mylivedealz.com/live/${session.id}`).catch(() => { });
                  setToast('Copied replay/live link');
                }}
                left={<Copy className="h-4 w-4" />}
                title="Copy direct stream link"
              >
                Link
              </Btn>

              <Btn tone="danger" onClick={() => setIncidentOpen(true)} left={<Flag className="h-4 w-4" />}>
                Escalate
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6">
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
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-800 focus-within:ring-2 focus-within:ring-slate-400 transition">
                      <Search className="h-4 w-4 text-slate-500 dark:text-slate-500" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search chat…"
                        className="w-full sm:w-40 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Hide handled</span>
                    <Toggle value={hideHandled} onChange={setHideHandled} />
                  </div>
                </div>
              </div>

              {/* Destination tabs */}
              <div className="mt-5 flex flex-wrap gap-2">
                {destinations.map((d) => {
                  const active = d.id === activeDestId;
                  const statusTone =
                    d.status === 'Connected' ? 'good' : d.status === 'Needs re-auth' || d.status === 'Stream key missing' ? 'warn' : 'bad';
                  return (
                    <button
                      key={d.id}
                      onClick={() => setActiveDestId(d.id)}
                      className={cx(
                        'flex items-center gap-2 rounded-2xl h-10 px-4 text-[10px] sm:text-xs font-bold ring-1 transition uppercase tracking-wider active:scale-[0.98]',
                        active
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-slate-900 dark:ring-slate-100 shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{d.name}</span>
                      <Pill tone={statusTone}>
                        {d.liveState === 'Live' ? <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-500" />}
                        {d.liveState}
                      </Pill>
                    </button>
                  );
                })}
              </div>

              {/* Messages */}
              <div className="mt-5 space-y-3">
                {filteredMessages.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-10 text-center text-sm font-bold text-slate-500 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    No active messages match your current filters.
                  </div>
                ) : (
                  filteredMessages.map((m) => {
                    const flagged = m.flags.length > 0;
                    const handled = Boolean(handledIds[m.id]);
                    return (
                      <div
                        key={m.id}
                        className={cx(
                          'rounded-2xl p-4 ring-1 transition-all group',
                          flagged
                            ? 'bg-orange-50 dark:bg-amber-500/10 ring-orange-200 dark:ring-amber-500/20'
                            : 'bg-white dark:bg-slate-800/20 ring-slate-200 dark:ring-slate-800',
                          handled ? 'opacity-50 grayscale' : 'hover:shadow-md'
                        )}
                      >
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{m.userName}</div>
                              <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500">{m.handle}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">{agoLabel(m.atISO)}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {m.flags.map((f) => (
                                  <Pill key={f} tone={f === 'Harassment' ? 'bad' : 'warn'}>
                                    <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    {f}
                                  </Pill>
                                ))}
                                {handled ? (
                                  <Pill tone="good">
                                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    Resolved
                                  </Pill>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">{m.text}</div>
                          </div>

                          <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0">
                            <Btn
                              tone="ghost"
                              disabled={!canAct || handled}
                              onClick={() => openAction(m, 'delete')}
                              left={<Trash2 className="h-4 w-4" />}
                            >
                              Delete
                            </Btn>
                            <Btn
                              tone="ghost"
                              disabled={!canAct || handled}
                              onClick={() => openAction(m, 'timeout')}
                              left={<VolumeX className="h-4 w-4" />}
                            >
                              Timeout
                            </Btn>
                            <Btn
                              tone="danger"
                              disabled={!canAct || handled}
                              onClick={() => openAction(m, 'ban')}
                              left={<Ban className="h-4 w-4" />}
                            >
                              Ban
                            </Btn>
                          </div>
                        </div>

                        {!canAct ? (
                          <div className="mt-2 text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-tight flex items-center gap-1.5 bg-orange-500/5 p-2 rounded-xl">
                            <Info className="h-3.5 w-3.5" />
                            Viewer mode (Read Only)
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Moderation controls */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight">Advanced Guardrails</div>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Automated rules to reduce overhead during surges.</div>
                </div>
                <Pill tone={isPro ? 'pro' : 'neutral'}>
                  {isPro ? <BadgeCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  PRO
                </Pill>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Auto-Pilot</div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Remove spam patterns & repeat offenders automatically.</div>
                    </div>
                    <Toggle value={autoModeration} onChange={setAutoModeration} disabled={!canAct} />
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Block Links</div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Suppress third-party URLs to prevent fraud and scams.</div>
                    </div>
                    <Toggle value={linkBlocking} onChange={setLinkBlocking} disabled={!canAct} />
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Slow Mode</div>
                        <BadgeCheck className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Limit chat frequency to 1 msg every 5s during peaks.</div>
                    </div>
                    <Toggle value={slowMode} onChange={setSlowMode} disabled={!canAct || !isPro} />
                  </div>
                  {!isPro ? <div className="mt-2 text-[10px] font-bold text-violet-600/60 dark:text-violet-400/40 uppercase tracking-tighter">Requires Pro Upgrade</div> : null}
                </div>

                <div className="flex flex-col justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20 transition">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-500 shrink-0" />
                    <div>
                      <div className="text-[11px] sm:text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-tight">Policy Reminder</div>
                      <div className="mt-1 text-[10px] sm:text-xs text-amber-800/80 dark:text-amber-500/70 leading-relaxed font-semibold">
                        Avoid removing legitimate buyer feedback. Only moderate harassment and harmful content.
                      </div>
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
                  const disabled = !canAct || !canMute;
                  return (
                    <div key={d.id} className="rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-3 sm:p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition group hover:shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{d.name}</div>
                            <div className="flex gap-1.5">
                              <Pill tone={d.liveState === 'Live' ? 'good' : 'warn'}>
                                {d.liveState === 'Live' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
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
                            {canMute ? 'Direct API link active' : 'Platform does not support remote mute'}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <Toggle
                            value={muted}
                            onChange={(v) => {
                              setMuteChat((s) => ({ ...s, [d.id]: v }));
                              setToast(v ? `Muted ${d.name}` : `Unmuted ${d.name}`);
                            }}
                            disabled={disabled}
                          />
                          {muted && <span className="text-[10px] font-black text-rose-500 uppercase">Silenced</span>}
                        </div>
                      </div>

                      {!canAct ? <div className="mt-3 text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tighter bg-orange-500/5 p-2 rounded-lg">Viewer Mode: Locked</div> : null}
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
                <Pill tone={pauseNotifications ? 'bad' : 'neutral'}>
                  <BellOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {pauseNotifications ? 'PAUSED' : 'ACTIVE'}
                </Pill>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Freeze Notifications</div>
                    <div className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 font-semibold leading-tight capitalize">Stops "Live Now", deal drops, and countdown pushes.</div>
                  </div>
                  <Toggle value={pauseNotifications} onChange={setPauseNotifications} disabled={!canAct} />
                </div>

                {pauseNotifications ? (
                  <div className="mt-4 rounded-2xl bg-rose-50 dark:bg-rose-500/5 p-4 ring-1 ring-rose-200 dark:ring-rose-500/20 text-xs text-rose-800 dark:text-rose-400">
                    <div className="font-black uppercase tracking-wider mb-1">Impact Warning</div>
                    <div className="font-semibold leading-relaxed">
                      Pausing broadcasts will likely reduce viewership and GMV participation for the next 15 minutes.
                    </div>
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
                  <Btn tone="primary" onClick={() => setKeywordDrawer(true)} left={<PlusCircle className="h-4 w-4" />} disabled={!canAct}>
                    Create
                  </Btn>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {keywordRules.map((k) => {
                  const scopeLabel =
                    k.scope === 'All destinations'
                      ? 'Global'
                      : `Sync: ${(k.destinationIds ?? [])
                        .map((id) => destinations.find((d) => d.id === id)?.name ?? id)
                        .join(', ')}`;
                  return (
                    <div key={k.id} className="rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition group hover:shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-black text-slate-900 dark:text-slate-100">"{k.phrase}"</div>
                            <div className="flex gap-1.5 flex-wrap">
                              <Pill tone="neutral">
                                <Settings className="h-3 w-3" />
                                {k.match}
                              </Pill>
                              <Pill tone={k.action === 'Block' ? 'bad' : k.action === 'Mask' ? 'warn' : 'good'}>
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
                            disabled={!canAct}
                          />
                          <button
                            disabled={!canAct}
                            onClick={() => {
                              setKeywordRules((s) => s.filter((x) => x.id !== k.id));
                              setToast('Rule archived');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition"
                            title="Remove filter rule"
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
                  Start new rules with <span className="underline decoration-amber-500/40 underline-offset-2">"Flag"</span> to validate accuracy before enabling "Block".
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
                <Pill tone={preflight.every((x) => x.ok) ? 'good' : 'warn'}>
                  {preflight.every((x) => x.ok) ? <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                  {preflight.every((x) => x.ok) ? 'LOCKED' : 'READY'}
                </Pill>
              </div>

              <div className="mt-4 space-y-2">
                {preflight.map((p) => (
                  <div key={p.label} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-3 sm:p-4 ring-1 ring-slate-200 dark:ring-slate-800 transition">
                    <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">{p.label}</div>
                    <Pill tone={p.ok ? 'good' : 'warn'}>
                      {p.ok ? <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                      {p.ok ? 'OK' : 'FIX'}
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
          title={
            actionType === 'delete'
              ? 'Delete message'
              : actionType === 'timeout'
                ? 'Timeout user'
                : actionType === 'ban'
                  ? 'Ban user'
                  : 'Action'
          }
          onClose={() => setActionOpen(false)}
          right={
            <Pill tone="neutral">
              <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              CONFIRMED
            </Pill>
          }
        >
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Selected Target</div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-50">{actionTarget?.userName}</div>
                  <div className="text-xs font-bold text-slate-500">{actionTarget?.handle}</div>
                </div>
                <BadgeCheck className="h-5 w-5 text-blue-500" />
              </div>
              <div className="mt-4 rounded-xl bg-white dark:bg-slate-900 p-4 text-sm font-medium text-slate-800 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm italic">
                "{actionTarget?.text}"
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/5 p-4 ring-1 ring-rose-200 dark:ring-rose-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-400 uppercase tracking-widest">Caution</div>
                  <div className="mt-1 text-xs text-rose-800/80 dark:text-rose-400/80 font-semibold leading-relaxed">
                    Actions will be pushed to the primary destination API immediately (latency ~100ms).
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Btn tone="ghost" onClick={() => setActionOpen(false)}>
                Cancel Request
              </Btn>
              <Btn tone={actionType === 'ban' ? 'danger' : 'primary'} onClick={confirmAction} disabled={!canAct}>
                {actionType === 'delete' ? 'Delete Permanently' : actionType === 'timeout' ? 'Silence 10m' : 'Permaban'}
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
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-5 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Category</div>
                  <select
                    value={incidentCategory}
                    onChange={(e) => setIncidentCategory(e.target.value as "Harassment" | "Fraud/Scam" | "Impersonation" | "Safety Risk" | "Other")}
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
                    onChange={(e) => setIncidentSeverity(e.target.value as 'Low' | 'Medium' | 'High' | 'Critical')}
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
                <Toggle value={includeLogs} onChange={setIncludeLogs} />
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/5 p-4 ring-1 ring-amber-200 dark:ring-amber-500/20">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-amber-700 dark:text-amber-500 shrink-0" />
                <div>
                  <div className="text-[10px] font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest">Confidentiality Trace</div>
                  <div className="mt-1 text-xs text-amber-800/80 dark:text-amber-500/70 font-semibold leading-relaxed">
                    Reports generate a high-priority ticket for our 24/7 Global Response Team. Include the minimum required data.
                  </div>
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
                  const payload = {
                    category: incidentCategory,
                    severity: incidentSeverity,
                    details: incidentText.trim(),
                    includeLogs,
                    createdAt: new Date().toISOString(),
                    sessionId: session.id,
                  };
                  void creatorApi
                    .patchLiveTool("safety", { incident: payload })
                    .then(() => {
                      setIncidentOpen(false);
                      setIncidentText("");
                      setToast("Incident escalated");
                    })
                    .catch(() => {
                      setToast("Unable to submit escalation");
                    });
                }}
                disabled={!incidentText.trim()}
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
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/20 p-5 ring-1 ring-slate-200 dark:ring-slate-800 transition">
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
                    onChange={(e) => setNewKeywordMatch(e.target.value as 'Contains' | 'Exact')}
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
                    onChange={(e) => setNewKeywordAction(e.target.value as 'Flag' | 'Mask' | 'Block')}
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
                    <div className="mt-1 text-xs text-amber-800/80 dark:text-amber-500/70 font-semibold leading-relaxed">
                      "Mask" replaces text with asterisks. "Block" drops the entire message before it hits any destination feed.
                    </div>
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
                  onChange={(e) => setNewKeywordScope(e.target.value as 'All destinations' | 'Selected destinations')}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 px-4 text-xs font-bold text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-800"
                >
                  <option>All destinations</option>
                  <option>Selected destinations</option>
                </select>
              </div>

              {newKeywordScope === 'Selected destinations' ? (
                <div className="mt-5 grid grid-cols-1 gap-2.5">
                  {destinations.map((d) => (
                    <label key={d.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/20 p-4 ring-1 ring-slate-200 dark:ring-slate-800 hover:shadow-sm transition group">
                      <div className="text-xs font-black text-slate-900 dark:text-slate-50 uppercase tracking-tight">{d.name}</div>
                      <Toggle value={Boolean(newKeywordDestIds[d.id])} onChange={(v) => setNewKeywordDestIds((s) => ({ ...s, [d.id]: v }))} />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-5 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl text-center">
                  Global Policy Enforcement: ON
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Btn tone="ghost" onClick={() => setKeywordDrawer(false)}>
                Discard
              </Btn>
              <Btn tone="primary" onClick={addKeyword} disabled={!newKeyword.trim()}>
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
