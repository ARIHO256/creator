import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentRole } from '../../auth/roles';
import { clearSession, readSession, updateSession, useSession } from '../../auth/session';
import type { UserRole } from '../../types/roles';
import { useLocalization } from '../../localization/LocalizationProvider';
import { useMockState } from '../../mocks';
import { getPageContentByRole } from '../../data/pageContent';
import type { NotifCategory, NotifItem } from '../../data/pageTypes';
import { useThemeMode } from '../../theme/themeMode';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bookmark,
  Boxes,
  Briefcase,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Command,
  CreditCard,
  FileText,
  Flame,
  Globe,
  Handshake,
  HelpCircle,
  Home,
  KeyRound,
  Link2,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Monitor,
  Sun,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Truck,
  User,
  Users,
  Users2,
  Video,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react';

/**
 * Bug-proof icon:
 * Some lucide-react versions do not export Wand2.
 * We alias it to Sparkles so the app never crashes.
 */
const Wand2 = Sparkles;

type Role = UserRole;
const PRIMARY_SIDEBAR_WIDTH = 173;
const PRIMARY_SIDEBAR_COLLAPSED_WIDTH = 66;
const PRIMARY_SIDEBAR_WIDTH_FLUID = 'clamp(169px, 16.9vw, 231px)';
const PRIMARY_SIDEBAR_COLLAPSED_WIDTH_FLUID = 'clamp(68px, 5.2vw, 76px)';

function formatCountBadge(count?: number) {
  if (!count || count <= 0) return undefined;
  if (count > 99) return '99+';
  return String(count);
}

type NavItemDef = {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  noWrap?: boolean;
  roles?: Role[];
  badge?: string;
  badgeTone?: 'green' | 'orange' | 'slate' | 'danger';
  children?: NavItemDef[];
};

type NavGroupDef = {
  title: string;
  roles?: Role[];
  items: NavItemDef[];
};

type DomainGroup =
  | 'Orders'
  | 'Listings'
  | 'RFQs'
  | 'Quotes'
  | 'Bookings'
  | 'Creators'
  | 'Campaigns'
  | 'Contracts'
  | 'Ops'
  | 'Finance'
  | 'Desks'
  | 'Settings'
  | 'Support'
  | 'Other';

type SearchItemType = 'route' | 'action' | 'view';

type SearchIndexItem = {
  id: string;
  type: SearchItemType;
  group: DomainGroup;
  label: string;
  hint?: string;
  keywords?: string[];
  icon: React.ElementType;
  route?: string;
  actionKey?: string;
};

type SavedView = {
  id: string;
  name: string;
  route: string;
  group: DomainGroup;
  pinned?: boolean;
  note?: string;
};

type ToastAction = { label: string; onClick: () => void };

type Toast = {
  id: string;
  title: string;
  message?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  actions?: ToastAction[];
};

type NotificationCategory = NotifCategory | 'All';

type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
  route?: string;
};

type DeviceSession = {
  id: string;
  device: 'desktop' | 'mobile';
  location: string;
  ip: string;
  lastSeen: string;
  current?: boolean;
};

type Tone = 'orange' | 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet' | 'sky' | 'slate';

type ShellItem = {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  tone: Tone;
  badge?: string;
};

type ShellGroup = {
  title: string;
  tone: Tone;
  items: ShellItem[];
};

type ShellConfig = {
  title: string;
  subtitle: string;
  accent: Accent;
  headerBg: string;
  headerText: string;
  badge?: { text: string; tone: 'green' | 'orange' | 'slate' };
  icon: React.ElementType;
  groups: ShellGroup[];
};

type ShellKey =
  | 'core'
  | 'mldz'
  | 'wholesale'
  | 'ops'
  | 'finance'
  | 'desks'
  | 'settings'
  | 'support';

type Accent = 'green' | 'orange';
type ThemeMode = 'light' | 'dark';

const TOKENS = {
  green: '#03CD8C',
  greenDeep: '#02B77E',
  orange: '#F77F00',
  black: '#0B0F14',
};
const COLLAPSED_ICON_SCALE = 1.15;

const LS_KEYS = {
  RECENTS: 'evzone_supplierhub_recents_v9',
  FAVORITES: 'evzone_supplierhub_favorites_v9',
  SAVED_VIEWS: 'evzone_supplierhub_saved_views_v9',
  AUDIT: 'evzone_supplierhub_audit_v9',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  return safeParse<T>(window.localStorage.getItem(key), fallback);
}

function lsSet<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function useHashRoute() {
  const get = () => {
    const raw = typeof window !== 'undefined' ? window.location.hash : '';
    const path = raw.replace(/^#/, '');
    return path || '/dashboard';
  };

  const [path, setPath] = useState<string>(get);

  useEffect(() => {
    const onHash = () => setPath(get());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setHash = (to: string) => {
    const cleaned = to.startsWith('/') ? to : `/${to}`;
    if (typeof window !== 'undefined') window.location.hash = cleaned;
  };

  return { path, setHash };
}

function isActivePath(current: string, itemPath: string) {
  if (current === itemPath) return true;
  if (current.startsWith(itemPath + '/')) return true;

  // Keep core "Settings" entry active for legacy settings routes that live outside "/settings".
  // This mirrors getShellKey() which treats these paths as part of the Settings nested shell.
  if (itemPath === '/settings') {
    if (current === '/status-center') return true;
    if (current.startsWith('/templates')) return true;
  }

  return false;
}

function getShellKey(path: string): ShellKey {
  if (path.startsWith('/mldz')) return 'mldz';
  if (path.startsWith('/wholesale')) return 'wholesale';
  if (path.startsWith('/ops')) return 'ops';
  if (path.startsWith('/finance')) return 'finance';
  if (path.startsWith('/regulatory')) return 'desks';
  if (path.startsWith('/settings') || path === '/status-center' || path.startsWith('/templates'))
    return 'settings';
  if (path.startsWith('/support')) return 'support';
  return 'core';
}

function nowIso() {
  return new Date().toISOString();
}

function shortTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTitleFromPath(path: string) {
  const clean = path.replace(/^\//, '');
  if (!clean) return 'Dashboard';
  const parts = clean.split('/').filter(Boolean);
  return parts
    .slice(-2)
    .join(' · ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function domainGroupForPath(path: string): DomainGroup {
  if (path.includes('/orders') || path.includes('/expressmart')) return 'Orders';
  if (path.includes('/listings') || path.includes('/provider/listings')) return 'Listings';
  if (path.includes('/wholesale/rfq')) return 'RFQs';
  if (
    path.includes('/quotes') ||
    path.includes('/provider/new-quote') ||
    path.includes('/provider/joint-quote')
  )
    return 'Quotes';
  if (path.includes('/provider/bookings') || path.includes('/provider/service-command'))
    return 'Bookings';
  if (path.includes('/mldz/creators')) return 'Creators';
  if (path.includes('/mldz/collab/campaigns')) return 'Campaigns';
  if (path.includes('/mldz/collab/contracts')) return 'Contracts';
  if (path.startsWith('/ops')) return 'Ops';
  if (path.startsWith('/finance')) return 'Finance';
  if (path.startsWith('/regulatory')) return 'Desks';
  if (path.startsWith('/support')) return 'Support';
  if (path.startsWith('/settings') || path === '/status-center' || path === '/templates')
    return 'Settings';
  return 'Other';
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: unknown }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('App error', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full px-[0.55%] py-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/80 p-6 shadow-[0_16px_60px_rgba(2,16,23,0.10)]">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-rose-50 text-rose-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">Something went wrong</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">
                  Something went wrong
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <button
                type="button"
                onClick={() => window.location.assign('/dashboard')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </button>
            </div>

            <details className="mt-5 rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-4">
              <summary className="cursor-pointer text-sm font-extrabold text-slate-800">
                Technical details
              </summary>
              <pre className="mt-3 overflow-auto text-xs text-slate-700">
                {String(this.state.error ?? 'Unknown error')}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function IconButton({
  label,
  onClick,
  children,
  tone = 'light',
  badgeCount,
  badgeTone,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  tone?: 'light' | 'dark';
  badgeCount?: number;
  badgeTone?: 'green' | 'orange' | 'slate' | 'danger';
  className?: string;
}) {
  const badgeText = formatCountBadge(badgeCount);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition',
        tone === 'dark'
          ? 'border-white/30 bg-white/95 text-slate-900 hover:bg-white dark:border-white/25 dark:bg-slate-900/12 dark:text-white dark:hover:bg-slate-800/18'
          : 'border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800',
        className
      )}
    >
      {children}
      {badgeText ? (
        <span className="absolute -right-1 -top-1">
          <Badge tone={badgeTone ?? 'danger'} className="min-w-[18px] justify-center px-1.5 shadow">
            {badgeText}
          </Badge>
        </span>
      ) : null}
    </button>
  );
}

function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: React.ReactNode;
  tone?: 'green' | 'orange' | 'slate' | 'danger';
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold',
        tone === 'green' && 'bg-emerald-50 text-emerald-700',
        tone === 'orange' && 'bg-orange-50 text-orange-700',
        tone === 'slate' && 'bg-slate-100 text-slate-700',
        tone === 'danger' && 'bg-rose-500 text-white',
        className
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur',
        className
      )}
    >
      {children}
    </div>
  );
}

function ToastCenter({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[80] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: 10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cx(
              'rounded-3xl border bg-white dark:bg-slate-900/95 p-4 shadow-[0_24px_80px_rgba(2,16,23,0.18)] backdrop-blur',
              t.tone === 'success' && 'border-emerald-200',
              t.tone === 'warning' && 'border-orange-200',
              t.tone === 'danger' && 'border-rose-200',
              (!t.tone || t.tone === 'default') && 'border-slate-200/70'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  'grid h-10 w-10 place-items-center rounded-2xl',
                  t.tone === 'success' && 'bg-emerald-50 text-emerald-700',
                  t.tone === 'warning' && 'bg-orange-50 text-orange-700',
                  t.tone === 'danger' && 'bg-rose-50 text-rose-700',
                  (!t.tone || t.tone === 'default') && 'bg-slate-100 text-slate-700'
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? (
                  <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div>
                ) : null}
                {t.actions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.actions.map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={a.onClick}
                        className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  tone = 'light',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <div className={cx('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          'h-10 w-full appearance-none rounded-md border px-3 pr-8 text-xs font-semibold outline-none transition',
          tone === 'dark'
            ? 'border-white/25 bg-white/95 text-slate-900 focus:bg-white dark:bg-slate-900/16 dark:text-white'
            : 'border-slate-300 bg-white dark:bg-slate-900 text-slate-700 focus:border-slate-400'
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cx(
          'pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2',
          tone === 'dark' ? 'text-white/80' : 'text-slate-500'
        )}
      />
    </div>
  );
}

function RolePills({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-gray-50 dark:bg-slate-950 p-1">
      <button
        type="button"
        onClick={() => setRole('seller')}
        className={cx(
          'rounded px-3 py-1.5 text-xs font-semibold transition',
          role === 'seller'
            ? 'bg-white dark:bg-slate-900 text-slate-900 shadow-sm'
            : 'text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'
        )}
      >
        Seller
      </button>
      <button
        type="button"
        onClick={() => setRole('provider')}
        className={cx(
          'rounded px-3 py-1.5 text-xs font-semibold transition',
          role === 'provider'
            ? 'bg-white dark:bg-slate-900 text-slate-900 shadow-sm'
            : 'text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'
        )}
      >
        Provider
      </button>
    </div>
  );
}

function ShellChip({ shellKey }: { shellKey: ShellKey }) {
  if (shellKey === 'core') return null;
  const label =
    shellKey === 'mldz'
      ? 'MyLiveDealz'
      : shellKey === 'wholesale'
        ? 'Wholesale'
        : shellKey === 'ops'
          ? 'Ops Center'
          : shellKey === 'finance'
            ? 'Finance'
            : shellKey === 'desks'
              ? 'Desks'
              : shellKey === 'settings'
                ? 'Settings'
                : 'Support';

  const isMldz = shellKey === 'mldz';

  return (
    <div
      className={cx(
        'hidden lg:inline-flex h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold',
        isMldz
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-gray-50 dark:bg-slate-950 text-slate-700'
      )}
    >
      <span className={cx('h-2 w-2 rounded-full', isMldz ? 'bg-amber-500' : 'bg-emerald-500')} />
      {label}
    </div>
  );
}

function TopBar({
  role,
  setRole,
  onOpenMenu,
  onOpenCommand,
  navigate,
  shellKey,
  isFavorite,
  toggleFavorite,
  favoritesCount,
  unreadNotifs,
  unreadMessages,
  language,
  setLanguage,
  languageOptions,
  currency,
  setCurrency,
  themeMode,
  onToggleTheme,
  sidebarCollapsed,
}: {
  role: Role;
  setRole: (r: Role) => void;
  onOpenMenu: () => void;
  onOpenCommand: () => void;
  navigate: (to: string) => void;
  shellKey: ShellKey;
  isFavorite: boolean;
  toggleFavorite: () => void;
  favoritesCount: number;
  unreadNotifs: number;
  unreadMessages: number;
  language: string;
  setLanguage: (v: string) => void;
  languageOptions: { code: string; label: string }[];
  currency: string;
  setCurrency: (v: string) => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  sidebarCollapsed: boolean;
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const topTone: 'light' | 'dark' = themeMode === 'dark' ? 'dark' : 'light';
  const topBarBackground =
    themeMode === 'dark'
      ? 'linear-gradient(90deg, #0f172a 0%, #111827 40%, #020617 100%)'
      : `linear-gradient(90deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)`;

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = userMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  return (
    <div className="fixed left-0 right-0 top-0 z-40 lg:left-[var(--shell-sidebar-width)]">
      <div
        className={cx(
          'border-b',
          themeMode === 'dark' ? 'border-slate-700/70' : 'border-white/10'
        )}
        style={{
          background: topBarBackground,
        }}
      >
        <div className="shell-container flex items-center gap-2.5 px-2 py-3 md:px-4 xl:gap-3">
          <div className="flex items-center gap-2 lg:hidden">
            <IconButton label="Open menu" onClick={onOpenMenu} tone={topTone}>
              <Menu className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="hidden xl:flex items-center gap-2">
            <ShellChip shellKey={shellKey} />
          </div>

          <button
            type="button"
            onClick={onOpenCommand}
            className={cx(
              'relative min-w-0 flex-1 text-left',
              sidebarCollapsed
                ? 'lg:flex-[1_1_220px] lg:max-w-[420px] xl:max-w-[620px]'
                : 'lg:flex-[1_1_130px] lg:max-w-[260px] xl:max-w-[320px]'
            )}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <div className="flex h-10 w-full items-center justify-between overflow-hidden rounded-md border border-slate-300 bg-white dark:bg-slate-900 pl-9 pr-3 text-[13px] text-slate-600 shadow-sm">
                <span className="min-w-0 flex-1 truncate pr-2">Search anything (orders, RFQs, creators, contracts)</span>
                <span className="hidden shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-gray-50 dark:bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-slate-600 2xl:flex">
                  <Command className="h-3.5 w-3.5" />
                  Ctrl K
                </span>
              </div>
            </div>
          </button>

          <div
            className={cx(
              'hidden lg:ml-auto lg:flex lg:min-w-0 lg:items-center lg:justify-end',
              sidebarCollapsed ? 'lg:gap-2 xl:gap-2.5' : 'lg:gap-1.5 xl:gap-2'
            )}
          >
            <div className="flex shrink-0 items-center gap-2">
              <Select
                className="w-[128px] xl:w-[180px]"
                tone={topTone}
                value={language}
                onChange={setLanguage}
                options={languageOptions.map((option) => ({
                  label: option.label,
                  value: option.code,
                }))}
              />

              <Select
                className="w-[96px] xl:w-[132px]"
                tone={topTone}
                value={currency}
                onChange={setCurrency}
                options={[
                  { label: '¥ CNY', value: 'CNY' },
                  { label: '$ USD', value: 'USD' },
                  { label: '€ EUR', value: 'EUR' },
                  { label: 'UGX', value: 'UGX' },
                  { label: 'KES', value: 'KES' },
                  { label: 'NGN', value: 'NGN' },
                ]}
              />
            </div>

            <div
              className={cx(
                'h-6 w-px',
                themeMode === 'dark' ? 'bg-white dark:bg-slate-900/20' : 'bg-slate-200'
              )}
            />

            <div className="flex shrink-0 items-center gap-1">
              <IconButton
                label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                tone={topTone}
                onClick={onToggleTheme}
              >
                {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </IconButton>

              <div className={cx(sidebarCollapsed ? 'hidden xl:block' : 'hidden 2xl:block')}>
                <IconButton
                  label="Favorites"
                  tone={topTone}
                  onClick={toggleFavorite}
                  badgeCount={favoritesCount}
                >
                  <Star className={cx('h-4 w-4', isFavorite ? 'text-yellow-500' : 'text-slate-500')} />
                </IconButton>
              </div>

              <IconButton
                label="Notifications"
                tone={topTone}
                onClick={() => navigate('/notifications')}
                badgeCount={unreadNotifs}
                badgeTone="danger"
              >
                <Bell className="h-4 w-4" />
              </IconButton>

              <IconButton
                label="Messages"
                tone={topTone}
                onClick={() => navigate('/messages')}
                badgeCount={unreadMessages}
                badgeTone="danger"
              >
                <MessageCircle className="h-4 w-4" />
              </IconButton>
            </div>

            {/* Avatar */}
            <div className="relative ml-1 shrink-0" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className={cx(
                  'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-left transition',
                  themeMode === 'dark'
                    ? 'border-white/25 bg-white/95 text-slate-900 hover:bg-white dark:bg-slate-900/12 dark:text-white dark:hover:bg-slate-800/18'
                    : 'border-slate-200 bg-white text-gray-900 hover:bg-gray-50'
                )}
              >
                <div
                  className={cx(
                    'relative grid h-7 w-7 place-items-center rounded-md text-xs font-semibold',
                    themeMode === 'dark' ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'
                  )}
                >
                  S
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="hidden 2xl:block">
                  <div className="text-xs font-semibold">SellerSeller</div>
                  <div className={cx('text-[10px]', themeMode === 'dark' ? 'text-slate-300' : 'text-slate-500')}>
                    Supplier
                  </div>
                </div>
                <ChevronDown
                  className={cx(
                    'h-4 w-4 transition',
                    themeMode === 'dark' ? 'text-slate-300' : 'text-slate-500',
                    userMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ y: 8, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 8, opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-[92vw] max-w-[340px] overflow-hidden rounded-3xl border border-slate-200/60 bg-white dark:bg-slate-900/95 shadow-[0_24px_80px_rgba(2,16,23,0.22)] backdrop-blur"
                  >
                    <div className="border-b border-slate-200/60 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="grid h-10 w-10 place-items-center rounded-2xl text-white"
                          style={{
                            background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)`,
                          }}
                        >
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-900">
                            SellerSeller
                          </div>
                          <div className="truncate text-xs font-semibold text-slate-500">
                            Supplier account
                          </div>
                        </div>
                        <span className="ml-auto">
                          <Badge tone="green">Active</Badge>
                        </span>
                      </div>
                    </div>

                    <div className="p-2">
                      <MenuRow
                        label="Profile & Storefront"
                        icon={Store}
                        onClick={() => {
                          navigate('/settings/profile');
                          setUserMenuOpen(false);
                        }}
                      />
                      <MenuRow
                        label="KYC / KYB"
                        icon={ShieldCheck}
                        onClick={() => {
                          navigate('/settings/kyc');
                          setUserMenuOpen(false);
                        }}
                      />
                      <MenuRow
                        label="Teams & Roles"
                        icon={Users}
                        onClick={() => {
                          navigate('/settings/teams');
                          setUserMenuOpen(false);
                        }}
                      />
                      <MenuRow
                        label={role === 'seller' ? 'Wallets & Payouts' : 'Quotes & Earnings'}
                        icon={Wallet}
                        onClick={() => {
                          navigate(role === 'seller' ? '/finance' : '/provider/quotes');
                          setUserMenuOpen(false);
                        }}
                      />
                      <MenuRow
                        label="Status Center"
                        icon={ShieldCheck}
                        onClick={() => {
                          navigate('/status-center');
                          setUserMenuOpen(false);
                        }}
                      />
                      <div className="my-2 h-px bg-slate-200/60" />
                      <MenuRow
                        label="Help & Support"
                        icon={HelpCircle}
                        onClick={() => {
                          navigate('/support');
                          setUserMenuOpen(false);
                        }}
                      />
                      <MenuRow
                        label="Sign out"
                        icon={LogOut}
                        tone="danger"
                        onClick={() => {
                          clearSession();
                          setUserMenuOpen(false);
                          navigate('/auth');
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <IconButton label="Command" onClick={onOpenCommand} tone={topTone}>
              <Command className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={onToggleTheme}
              tone={topTone}
            >
              {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </IconButton>
            <IconButton
              label="Notifications"
              onClick={() => navigate('/notifications')}
              tone={topTone}
              badgeCount={unreadNotifs}
              badgeTone="danger"
            >
              <Bell className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Messages"
              onClick={() => navigate('/messages')}
              tone={topTone}
              badgeCount={unreadMessages}
              badgeTone="danger"
            >
              <MessageCircle className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  label,
  icon: Icon,
  onClick,
  tone = 'default',
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-extrabold transition',
        tone === 'danger'
          ? 'text-rose-700 hover:bg-rose-50'
          : 'text-slate-800 hover:bg-slate-100/70'
      )}
    >
      <span
        className={cx(
          'grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900',
          tone === 'danger' ? 'border-rose-200' : 'border-slate-200/70'
        )}
      >
        <Icon className={cx('h-4 w-4', tone === 'danger' ? 'text-rose-600' : 'text-slate-700')} />
      </span>
      <span className="truncate">{label}</span>
      <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
    </button>
  );
}

function BrandMark({
  compact,
  onClick,
  dark,
}: {
  compact?: boolean;
  onClick?: () => void;
  dark?: boolean;
}) {
  const logoSrc = compact ? (dark ? '/logo-single.png' : '/logo2.jpeg') : '/landscape.png';
  const logoClass = 'h-full w-full object-contain';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('flex items-center rounded-2xl p-1 text-left', !compact && 'min-w-0 flex-1')}
      aria-label="Go to home"
    >
      <div
        className={cx(
          'grid shrink-0 place-items-center overflow-hidden rounded-2xl shadow-sm',
          dark ? 'bg-[#04133a] ring-1 ring-[#0a2a72]/70' : 'bg-white dark:bg-slate-900',
          compact ? 'h-[52px] w-[52px] p-1' : 'h-14 w-full px-2'
        )}
      >
        <img
          src={logoSrc}
          alt="EVzone logo"
          className={logoClass}
          loading="eager"
          decoding="async"
        />
      </div>
    </button>
  );
}

function SectionTitle({
  children,
  themeMode,
}: {
  children: React.ReactNode;
  themeMode: ThemeMode;
}) {
  const isDark = themeMode === 'dark';
  return (
    <div
      className={cx(
        'px-3 pt-5 pb-2 text-[10px] font-extrabold uppercase tracking-wider',
        isDark ? 'text-slate-400' : 'text-slate-500'
      )}
    >
      {children}
    </div>
  );
}

function NavItem({
  item,
  active,
  collapsed,
  onClick,
  depth = 0,
  onPrefetch,
  themeMode,
}: {
  item: NavItemDef;
  active: boolean;
  collapsed?: boolean;
  onClick: () => void;
  depth?: number;
  onPrefetch?: () => void;
  themeMode: ThemeMode;
}) {
  const Icon = item.icon;
  const isDark = themeMode === 'dark';
  const iconStyle = collapsed ? ({ transform: `scale(${COLLAPSED_ICON_SCALE})` } as const) : undefined;
  return (
    <button
      type="button"
      onMouseEnter={onPrefetch}
      onClick={onClick}
      className={cx(
        'group flex w-full items-center gap-3 rounded-2xl py-2 text-left text-sm font-semibold transition',
        collapsed ? 'px-1.5' : 'px-3',
        isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100/70',
        active && (isDark ? 'bg-emerald-900/25' : 'bg-emerald-50'),
        collapsed && 'justify-center',
        depth > 0 && 'pl-11'
      )}
    >
      <span
        className={cx(
          'grid h-9 w-9 place-items-center rounded-2xl border transition',
          active
            ? isDark
              ? 'border-emerald-700/70 bg-slate-900'
              : 'border-emerald-200 bg-white dark:bg-slate-900'
            : isDark
              ? 'border-slate-700/70 bg-slate-900 group-hover:border-slate-600'
              : 'border-slate-200/70 bg-white dark:bg-slate-900 group-hover:border-slate-200'
        )}
        style={active ? { boxShadow: `0 10px 24px rgba(3, 205, 140, 0.14)` } : undefined}
      >
        <Icon
          className={cx('h-4 w-4', active ? 'text-emerald-400' : isDark ? 'text-slate-300' : 'text-slate-600')}
          style={iconStyle}
        />
      </span>

      {!collapsed && (
        <span
          className={cx(
            'flex min-w-0 flex-1 items-center gap-2',
            active ? (isDark ? 'text-slate-100' : 'text-slate-900') : isDark ? 'text-slate-300' : 'text-slate-700'
          )}
        >
          <span className="truncate whitespace-nowrap">
            {item.label}
          </span>
          {item.badge ? (
            /^\d+\+?$/.test(item.badge) ? (
              <span className="ml-auto">
                <Badge tone={item.badgeTone ?? 'slate'}>{item.badge}</Badge>
              </span>
            ) : (
              <span className={cx('ml-auto', isDark ? 'text-slate-400' : 'text-slate-500')}>{item.badge}</span>
            )
          ) : null}
        </span>
      )}

      {!collapsed && active && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />}
    </button>
  );
}

function NavGroup({
  group,
  role,
  path,
  navigate,
  collapsed,
  onPrefetch,
  themeMode,
}: {
  group: NavGroupDef;
  role: Role;
  path: string;
  navigate: (to: string) => void;
  collapsed?: boolean;
  onPrefetch: (to: string) => void;
  themeMode: ThemeMode;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isDark = themeMode === 'dark';

  const filtered = group.items.filter((it) => !it.roles || it.roles.includes(role));
  if (filtered.length === 0) return null;

  return (
    <div>
      {!collapsed && <SectionTitle themeMode={themeMode}>{group.title}</SectionTitle>}
      <div className={cx('flex flex-col gap-1', collapsed && 'px-1')}>
        {filtered.map((item) => {
          const active = isActivePath(path, item.path);
          const hasChildren = item.children && item.children.length > 0;
          const expanded = open[item.key] ?? active;

          return (
            <div key={item.key} className="relative">
              <div className="flex items-center">
                <div className="flex-1">
                  <NavItem
                    item={item}
                    active={active}
                    collapsed={collapsed}
                    onPrefetch={() => onPrefetch(item.path)}
                    themeMode={themeMode}
                    onClick={() => {
                      if (hasChildren) {
                        setOpen((s) => ({ ...s, [item.key]: !(s[item.key] ?? active) }));
                        if (!collapsed) return;
                      }
                      navigate(item.path);
                    }}
                  />
                </div>

                {!collapsed && hasChildren && (
                  <button
                    type="button"
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                    onClick={() => setOpen((s) => ({ ...s, [item.key]: !(s[item.key] ?? active) }))}
                    className={cx(
                      'mr-2 grid h-8 w-8 place-items-center rounded-xl border transition',
                      isDark
                        ? 'border-slate-700/70 bg-slate-900 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <ChevronDown className={cx('h-4 w-4 transition', expanded && 'rotate-180')} />
                  </button>
                )}
              </div>

              <AnimatePresence initial={false}>
                {!collapsed && hasChildren && expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 flex flex-col gap-1">
                      {item
                        .children!.filter((c) => !c.roles || c.roles.includes(role))
                        .map((child) => (
                          <NavItem
                            key={child.key}
                            item={child}
                            active={isActivePath(path, child.path)}
                            collapsed={collapsed}
                            onPrefetch={() => onPrefetch(child.path)}
                            themeMode={themeMode}
                            onClick={() => navigate(child.path)}
                            depth={1}
                          />
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DesktopSidebar({
  role,
  setRole,
  path,
  navigate,
  themeMode,
  collapsed,
  setCollapsed,
  onOpenCreate,
  onPrefetch,
  sidebarRef,
  onSidebarScroll,
  navBadges,
}: {
  role: Role;
  setRole: (r: Role) => void;
  path: string;
  navigate: (to: string) => void;
  themeMode: ThemeMode;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onOpenCreate: () => void;
  onPrefetch: (to: string) => void;
  sidebarRef?: React.RefObject<HTMLDivElement>;
  onSidebarScroll?: (value: number) => void;
  navBadges?: { messages?: number; notifications?: number; orders?: number; bookings?: number; reviews?: number };
}) {
  const groups = useSupplierNav(role, navBadges);
  const isDark = themeMode === 'dark';
  const sidebarWidth = collapsed ? PRIMARY_SIDEBAR_COLLAPSED_WIDTH_FLUID : PRIMARY_SIDEBAR_WIDTH_FLUID;

  return (
    <aside
      data-shell-sidebar
      className={cx(
        'hidden lg:flex h-screen flex-col border-r backdrop-blur transition-all duration-200 z-30',
        isDark ? 'border-slate-800/90 bg-slate-950' : 'border-slate-200/70 bg-white dark:bg-slate-900'
      )}
      style={{ width: sidebarWidth }}
    >
      <div className={cx('p-4', collapsed ? 'pb-2' : 'pb-3')}>
        <div className={cx('flex items-start', collapsed ? 'justify-center' : 'justify-between gap-3')}>
          <BrandMark
            compact={collapsed}
            dark={isDark}
            onClick={() => navigate('/dashboard')}
          />
          {!collapsed && (
            <IconButton
              label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
              className="h-10 w-10 rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
          )}
        </div>

        {collapsed && (
          <div className="mt-2 flex justify-center">
            <IconButton
              label="Expand sidebar"
              onClick={() => setCollapsed(false)}
              className="h-10 w-10 rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        )}

        {!collapsed && (
          <div
            className={cx(
              'mt-3 rounded-3xl border p-2',
              isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200/70 bg-white dark:bg-slate-900/70'
            )}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('seller')}
                className={cx(
                  'rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                  role === 'seller'
                    ? isDark
                      ? 'border-emerald-700/70 bg-emerald-900/30 text-emerald-200'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : isDark
                      ? 'border-slate-700/70 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200/70 bg-white text-slate-700 hover:bg-gray-50'
                )}
              >
                Seller
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={cx(
                  'rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                  role === 'provider'
                    ? isDark
                      ? 'border-emerald-700/70 bg-emerald-900/30 text-emerald-200'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : isDark
                      ? 'border-slate-700/70 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200/70 bg-white text-slate-700 hover:bg-gray-50'
                )}
              >
                Provider
              </button>
            </div>
          </div>
        )}

        <div className={cx('mt-3', collapsed && 'mt-2')}>
          <button
            type="button"
            onClick={onOpenCreate}
            className={cx(
              'group relative w-full overflow-hidden rounded-3xl px-4 py-3 text-left font-extrabold text-white shadow-sm transition',
              collapsed ? 'px-0 py-3' : '',
              'hover:shadow-[0_22px_60px_rgba(3,205,140,0.22)]'
            )}
            style={{
              background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)`,
            }}
          >
            <div className={cx('flex items-center gap-3', collapsed && 'justify-center')}>
              <span
                className={cx(
                  'grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900/15',
                  collapsed && 'h-11 w-11'
                )}
              >
                <Plus
                  className="h-5 w-5"
                  style={collapsed ? { transform: `scale(${COLLAPSED_ICON_SCALE})` } : undefined}
                />
              </span>
              {!collapsed && (
                <div>
                  <div className="text-sm">Create</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-white/80">
                    Product, service, Live, Adz
                  </div>
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute -right-12 -top-10 h-28 w-28 rounded-full bg-white dark:bg-slate-900/10 blur-2xl" />
          </button>
        </div>
      </div>

      <div
        ref={sidebarRef}
        data-shell-sidebar-scroll
        className={cx('flex-1 overflow-y-auto pb-6', collapsed ? 'px-1.5' : 'px-3')}
        onScroll={(event) => onSidebarScroll?.(event.currentTarget.scrollTop)}
      >
        <div className={cx('flex flex-col gap-4', collapsed && 'gap-3')}>
          {groups.map((g) => (
            <NavGroup
              key={g.title}
              group={g}
              role={role}
              path={path}
              navigate={navigate}
              collapsed={collapsed}
              onPrefetch={onPrefetch}
              themeMode={themeMode}
            />
          ))}
        </div>
      </div>

      <div className={cx('border-t p-3', isDark ? 'border-slate-700/70' : 'border-slate-200/70', collapsed && 'p-2')}>
        <button
          type="button"
          onClick={() => navigate('/settings/profile')}
          className={cx(
            'flex w-full items-center gap-3 rounded-3xl border px-3 py-3 text-left transition',
            isDark
              ? 'border-slate-700/70 bg-slate-900/70 hover:bg-slate-800'
              : 'border-slate-200/70 bg-white dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800',
            collapsed && 'justify-center'
          )}
        >
          <span
            className={cx(
              'grid h-10 w-10 place-items-center rounded-2xl border',
              isDark ? 'border-slate-700/70 bg-slate-900' : 'border-slate-200/70 bg-white dark:bg-slate-900'
            )}
          >
            <User
              className={cx('h-5 w-5', isDark ? 'text-slate-200' : 'text-slate-800')}
              style={collapsed ? { transform: `scale(${COLLAPSED_ICON_SCALE})` } : undefined}
            />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <div className={cx('text-sm font-extrabold leading-tight', isDark ? 'text-slate-100' : 'text-slate-900')}>
                SellerSeller
              </div>
              <div className={cx('text-xs font-semibold leading-tight', isDark ? 'text-slate-400' : 'text-slate-500')}>
                Supplier account
              </div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}

function MobileDrawer({
  open,
  onClose,
  role,
  setRole,
  path,
  navigate,
  themeMode,
  onOpenCreate,
  onPrefetch,
  navBadges,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  setRole: (r: Role) => void;
  path: string;
  navigate: (to: string) => void;
  themeMode: ThemeMode;
  onOpenCreate: () => void;
  onPrefetch: (to: string) => void;
  navBadges?: { messages?: number; notifications?: number; orders?: number; bookings?: number; reviews?: number };
}) {
  const groups = useSupplierNav(role, navBadges);
  const isDark = themeMode === 'dark';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -22, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -22, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cx(
              'fixed left-0 top-0 z-50 h-screen w-[88vw] max-w-[340px] overflow-hidden border-r shadow-2xl backdrop-blur lg:hidden',
              isDark ? 'border-slate-700/90 bg-slate-950' : 'border-slate-200/70 bg-white dark:bg-slate-900/90'
            )}
          >
            <div className="flex h-full flex-col">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <BrandMark dark={isDark} onClick={() => navigate('/dashboard')} />
                  <IconButton label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onOpenCreate();
                    onClose();
                  }}
                  className="mt-3 w-full rounded-3xl px-4 py-3 text-left text-sm font-extrabold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900/15">
                      <Plus className="h-5 w-5" />
                    </span>
                    <div>
                      <div>Create</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-white/80">
                        Product, service, Live, Adz
                      </div>
                    </div>
                  </div>
                </button>

                <div
                  className={cx(
                    'mt-3 rounded-3xl border p-2',
                    isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200/70 bg-white dark:bg-slate-900/70'
                  )}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('seller')}
                      className={cx(
                        'rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                        role === 'seller'
                          ? isDark
                            ? 'border-emerald-700/70 bg-emerald-900/30 text-emerald-200'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : isDark
                            ? 'border-slate-700/70 bg-slate-900 text-slate-300'
                            : 'border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700'
                      )}
                    >
                      Seller
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('provider')}
                      className={cx(
                        'rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                        role === 'provider'
                          ? isDark
                            ? 'border-emerald-700/70 bg-emerald-900/30 text-emerald-200'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : isDark
                            ? 'border-slate-700/70 bg-slate-900 text-slate-300'
                            : 'border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700'
                      )}
                    >
                      Provider
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-28">
                <div className="flex flex-col gap-4">
                  {groups.map((g) => (
                    <NavGroup
                      key={g.title}
                      group={g}
                      role={role}
                      path={path}
                      navigate={(to) => {
                        navigate(to);
                        onClose();
                      }}
                      onPrefetch={onPrefetch}
                      themeMode={themeMode}
                    />
                  ))}
                </div>
              </div>

              <div className={cx('mt-auto border-t p-3', isDark ? 'border-slate-700/70' : 'border-slate-200/70')}>
                <button
                  type="button"
                  className={cx(
                    'flex w-full items-center gap-3 rounded-3xl border px-3 py-3 text-left',
                    isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200/70 bg-white dark:bg-slate-900/70'
                  )}
                >
                  <span
                    className={cx(
                      'grid h-10 w-10 place-items-center rounded-2xl border',
                      isDark ? 'border-slate-700/70 bg-slate-900' : 'border-slate-200/70 bg-white dark:bg-slate-900'
                    )}
                  >
                    <User className={cx('h-5 w-5', isDark ? 'text-slate-200' : 'text-slate-800')} />
                  </span>
                  <div className="min-w-0">
                    <div className={cx('truncate text-sm font-extrabold', isDark ? 'text-slate-100' : 'text-slate-900')}>
                      SellerSeller
                    </div>
                    <div className={cx('truncate text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-500')}>
                      Supplier account
                    </div>
                  </div>
                  <LogOut className={cx('ml-auto h-4 w-4', isDark ? 'text-slate-500' : 'text-slate-400')} />
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function QuickCreate({
  open,
  onClose,
  role,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  onNavigate: (to: string) => void;
}) {
  const actions = useMemo(() => {
    const seller = [
      {
        label: 'New product listing',
        desc: 'Add products to your storefront',
        icon: Package,
        to: '/listings',
      },
      {
        label: 'Open Wholesale',
        desc: 'RFQs, quotes and price lists',
        icon: Building2,
        to: '/wholesale',
      },
      {
        label: 'Open Ops Center',
        desc: 'Fulfillment, inventory and compliance',
        icon: Truck,
        to: '/ops',
      },
      {
        label: 'Open Quotes',
        desc: 'Quotes, estimates and proposals',
        icon: Wallet,
        to: '/provider/quotes',
      },
      {
        label: 'Schedule Live',
        desc: 'MyLiveDealz Live Sessionz',
        icon: Video,
        to: '/mldz/live/schedule',
      },
      {
        label: 'Create Shoppable Ad',
        desc: 'MyLiveDealz Shoppable Adz',
        icon: Wand2,
        to: '/mldz/adz/dashboard',
      },
    ];

    const provider = [
      {
        label: 'Service Command',
        desc: 'Your provider operating center',
        icon: Briefcase,
        to: '/provider/service-command',
      },
      {
        label: 'My Bookings',
        desc: 'Manage bookings',
        icon: ClipboardList,
        to: '/provider/bookings',
      },
      {
        label: 'Consultations',
        desc: 'Calls, chats and sessions',
        icon: MessageCircle,
        to: '/provider/consultations',
      },
      { label: 'Open Finance', desc: 'Wallets, payouts and reports', icon: Wallet, to: '/finance' },
      {
        label: 'Schedule Live',
        desc: 'Showcase services via MyLiveDealz',
        icon: Video,
        to: '/mldz/live/schedule',
      },
      {
        label: 'Create Shoppable Ad',
        desc: 'Promote a service as an Ad',
        icon: Wand2,
        to: '/mldz/adz/dashboard',
      },
    ];

    return role === 'seller' ? seller : provider;
  }, [role]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-start p-4"
          >
            <div className="flex max-h-[90vh] w-[92vw] max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white dark:bg-slate-900/90 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-2xl text-white"
                    style={{
                      background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)`,
                    }}
                  >
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">Quick Create</div>
                    <div className="text-xs font-semibold text-slate-500">
                      Role-aware actions across SupplierHub + shells
                    </div>
                  </div>
                </div>
                <IconButton label="Close" onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>

              <div className="grid flex-1 gap-3 overflow-y-auto px-5 pb-5 md:grid-cols-2">
                {actions.map((a) => {
                  const Ico = a.icon;
                  return (
                    <Link
                      key={a.label}
                      to={a.to}
                      onClick={(e) => {
                        const isPlainLeftClick =
                          e.button === 0 && !e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey;
                        if (!isPlainLeftClick) {
                          onClose();
                          return;
                        }
                        e.preventDefault();
                        onNavigate(a.to);
                        onClose();
                      }}
                      className="group rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left no-underline transition hover:bg-gray-50 dark:hover:bg-slate-800 hover:shadow-[0_18px_50px_rgba(2,16,23,0.10)]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900"
                          style={{ boxShadow: '0 16px 30px rgba(3,205,140,0.10)' }}
                        >
                          <Ico className="h-5 w-5 text-slate-800" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 group-hover:text-slate-950">
                            {a.label}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{a.desc}</div>
                        </div>
                        <ChevronRight className="ml-auto mt-1 h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Breadcrumbs({
  crumbs,
  onNavigate,
}: {
  crumbs: Array<{ label: string; path?: string }>;
  onNavigate: (to: string) => void;
}) {
  if (!crumbs.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
      {crumbs.map((c, idx) => {
        const last = idx === crumbs.length - 1;
        return (
          <React.Fragment key={`${c.label}_${idx}`}>
            {c.path && !last ? (
              <button
                type="button"
                onClick={() => onNavigate(c.path!)}
                className="hover:text-slate-700"
              >
                {c.label}
              </button>
            ) : (
              <span className={cx(last ? 'text-slate-700' : '')}>{c.label}</span>
            )}
            {!last && <span className="text-slate-300">/</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Subnav({
  items,
  activePath,
  onNavigate,
  accent,
}: {
  items: Array<{ label: string; path: string }>;
  activePath: string;
  onNavigate: (to: string) => void;
  accent: Accent;
}) {
  if (!items.length) return null;
  return (
    <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
      {items.map((it) => {
        const active = isActivePath(activePath, it.path);
        const activeCls =
          accent === 'orange'
            ? 'border-orange-200 bg-orange-50 text-orange-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800';
        return (
          <button
            key={it.path}
            type="button"
            onClick={() => onNavigate(it.path)}
            className={cx(
              'whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
              active ? activeCls : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
        </div>
      </div>
    </div>
  );
}

function PaletteRow({
  item,
  onRun,
  active,
  themeMode,
}: {
  item: SearchIndexItem;
  onRun: () => void;
  active?: boolean;
  themeMode: ThemeMode;
}) {
  const Icon = item.icon;
  const isDark = themeMode === 'dark';
  return (
    <button
      type="button"
      onClick={onRun}
      className={cx(
        'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-extrabold transition',
        active
          ? isDark
            ? 'bg-slate-800'
            : 'bg-slate-100'
          : isDark
            ? 'hover:bg-slate-800/70'
            : 'hover:bg-slate-100/70'
      )}
    >
      <span
        className={cx(
          'grid h-9 w-9 place-items-center rounded-2xl border',
          isDark ? 'border-slate-700/70 bg-slate-900' : 'border-slate-200/70 bg-white dark:bg-slate-900'
        )}
      >
        <Icon className={cx('h-4 w-4', isDark ? 'text-slate-300' : 'text-slate-700')} />
      </span>
      <span className={cx('min-w-0 flex-1 truncate', isDark ? 'text-slate-100' : 'text-slate-800')}>
        {item.label}
      </span>
      {item.hint ? (
        <span
          className={cx(
            'hidden md:block truncate text-[11px] font-black',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )}
        >
          {item.hint}
        </span>
      ) : null}
      <ChevronRight className={cx('h-4 w-4', isDark ? 'text-slate-600' : 'text-slate-300')} />
    </button>
  );
}

function CommandPalette({
  open,
  onClose,
  themeMode,
  index,
  recents,
  favorites,
  savedViews,
  onRun,
}: {
  open: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  index: SearchIndexItem[];
  recents: SearchIndexItem[];
  favorites: SearchIndexItem[];
  savedViews: SavedView[];
  onRun: (item: SearchIndexItem) => void;
}) {
  const isDark = themeMode === 'dark';
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<DomainGroup | 'All'>('All');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setGroupFilter('All');
      setActiveIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return index
      .filter((it) => (groupFilter === 'All' ? true : it.group === groupFilter))
      .filter((it) => {
        if (!q) return true;
        const hay = [it.label, it.hint ?? '', ...(it.keywords ?? [])].join(' ').toLowerCase();
        return hay.includes(q);
      });
  }, [index, query, groupFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchIndexItem[]>();
    filtered.forEach((it) => {
      const k = it.group;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    });
    return Array.from(map.entries()).map(([k, v]) => ({ group: k as DomainGroup, items: v }));
  }, [filtered]);

  const flatList = useMemo(() => {
    const list: SearchIndexItem[] = [];
    if (!query.trim()) return list;
    grouped.forEach((g) => g.items.forEach((it) => list.push(it)));
    return list;
  }, [grouped, query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (!query.trim()) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(flatList.length - 1, i + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatList[activeIdx];
      if (item) onRun(item);
    }
  };

  const chips: Array<DomainGroup | 'All'> = [
    'All',
    'Orders',
    'Listings',
    'RFQs',
    'Quotes',
    'Bookings',
    'Ops',
    'Finance',
    'Desks',
    'Creators',
    'Campaigns',
    'Contracts',
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-[12vh] z-[85] w-[92vw] max-w-3xl -translate-x-1/2"
            onKeyDown={onKeyDown}
          >
            <div
              className={cx(
                'overflow-hidden rounded-3xl border shadow-[0_30px_120px_rgba(2,16,23,0.30)] backdrop-blur',
                isDark ? 'border-slate-700/70 bg-slate-900/95' : 'border-slate-200/60 bg-white dark:bg-slate-900/95'
              )}
            >
              <div className={cx('px-4 py-3', isDark ? 'border-b border-slate-700/70' : 'border-b border-slate-200/60')}>
                <div className="flex items-center gap-3">
                  <div
                    className={cx(
                      'grid h-10 w-10 place-items-center rounded-2xl',
                      isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    <Command className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cx('text-sm font-black', isDark ? 'text-slate-100' : 'text-slate-900')}>
                      Command Palette
                    </div>
                    <div className={cx('mt-0.5 text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-500')}>
                      Search anything, jump fast, run actions
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className={cx(
                      'grid h-9 w-9 place-items-center rounded-2xl border',
                      isDark
                        ? 'border-slate-700/70 bg-slate-900 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-200/70 bg-white text-slate-700 hover:bg-gray-50'
                    )}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <div className="relative">
                    <Search
                      className={cx(
                        'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2',
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      )}
                    />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveIdx(0);
                      }}
                      placeholder="Type to search (orders, desks, creators, campaigns...)"
                      className={cx(
                        'h-11 w-full rounded-2xl border pl-10 pr-3 text-sm font-semibold outline-none',
                        isDark
                          ? 'border-slate-700/70 bg-slate-900 text-slate-100 focus:border-slate-500'
                          : 'border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:border-slate-300'
                      )}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {chips.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setGroupFilter(c)}
                        className={cx(
                          'rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                          groupFilter === c
                            ? isDark
                              ? 'border-emerald-700/70 bg-emerald-900/30 text-emerald-200'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : isDark
                              ? 'border-slate-700/70 bg-slate-900 text-slate-300 hover:bg-slate-800'
                              : 'border-slate-200/70 bg-white text-slate-700 hover:bg-gray-50'
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="max-h-[56vh] overflow-y-auto p-3">
                {!query.trim() ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div
                      className={cx(
                        'rounded-3xl border p-4',
                        isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200/70 bg-white dark:bg-slate-900/70'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className={cx('h-4 w-4', isDark ? 'text-slate-300' : 'text-slate-700')} />
                        <div className={cx('text-sm font-extrabold', isDark ? 'text-slate-100' : 'text-slate-900')}>
                          Recents
                        </div>
                        <span className="ml-auto">
                          <span
                            className={cx(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {recents.length}
                          </span>
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-1">
                        {recents.slice(0, 6).map((it) => (
                          <PaletteRow key={it.id} item={it} onRun={() => onRun(it)} themeMode={themeMode} />
                        ))}
                        {recents.length === 0 ? (
                          <div className={cx('mt-2 text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-500')}>
                            No recent pages yet.
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={cx(
                        'rounded-3xl border p-4',
                        isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200/70 bg-white dark:bg-slate-900/70'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Star className={cx('h-4 w-4', isDark ? 'text-slate-300' : 'text-slate-700')} />
                        <div className={cx('text-sm font-extrabold', isDark ? 'text-slate-100' : 'text-slate-900')}>
                          Favorites
                        </div>
                        <span className="ml-auto">
                          <span
                            className={cx(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {favorites.length}
                          </span>
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-1">
                        {favorites.slice(0, 6).map((it) => (
                          <PaletteRow key={it.id} item={it} onRun={() => onRun(it)} themeMode={themeMode} />
                        ))}
                        {favorites.length === 0 ? (
                          <div className={cx('mt-2 text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-500')}>
                            Pin pages to appear here.
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={cx(
                        'rounded-3xl border p-4 md:col-span-2',
                        isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200/70 bg-white dark:bg-slate-900/70'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Bookmark className={cx('h-4 w-4', isDark ? 'text-slate-300' : 'text-slate-700')} />
                        <div className={cx('text-sm font-extrabold', isDark ? 'text-slate-100' : 'text-slate-900')}>
                          Saved Views
                        </div>
                        <span className="ml-auto">
                          <span
                            className={cx(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {savedViews.length}
                          </span>
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {savedViews.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              onRun({
                                id: `view_${v.id}`,
                                type: 'view',
                                group: v.group,
                                label: v.name,
                                hint: v.note,
                                icon: Bookmark,
                                route: v.route,
                              })
                            }
                            className={cx(
                              'rounded-3xl border p-4 text-left transition',
                              isDark
                                ? 'border-slate-700/70 bg-slate-900/70 hover:bg-slate-800'
                                : 'border-slate-200/70 bg-white dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cx(
                                  'grid h-11 w-11 place-items-center rounded-2xl border',
                                  isDark ? 'border-slate-700/70 bg-slate-900' : 'border-slate-200/70 bg-white dark:bg-slate-900'
                                )}
                              >
                                <Bookmark className={cx('h-5 w-5', isDark ? 'text-slate-300' : 'text-slate-800')} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={cx('text-sm font-black truncate', isDark ? 'text-slate-100' : 'text-slate-900')}>
                                  {v.name}
                                </div>
                                <div className={cx('mt-1 text-xs font-semibold truncate', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                  {v.note ?? v.route}
                                </div>
                              </div>
                              <ChevronRight className={cx('h-4 w-4', isDark ? 'text-slate-600' : 'text-slate-300')} />
                            </div>
                          </button>
                        ))}
                        {savedViews.length === 0 ? (
                          <div className={cx('text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-500')}>
                            Save a view from pages like RFQ or Orders.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : grouped.length === 0 ? (
                  <EmptyState
                    title="No matches"
                    message="Try different keywords or change the domain filter."
                  />
                ) : (
                  <div className="space-y-3">
                    {grouped.map((g) => (
                      <div
                        key={g.group}
                        className={cx(
                          'rounded-3xl border',
                          isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200/70 bg-white dark:bg-slate-900/70'
                        )}
                      >
                        <div
                          className={cx(
                            'flex items-center justify-between px-4 py-3',
                            isDark ? 'border-b border-slate-700/70' : 'border-b border-slate-200/70'
                          )}
                        >
                          <div
                            className={cx(
                              'text-xs font-extrabold uppercase tracking-wider',
                              isDark ? 'text-slate-400' : 'text-slate-600'
                            )}
                          >
                            {g.group}
                          </div>
                          <span
                            className={cx(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {g.items.length}
                          </span>
                        </div>
                        <div className="p-2">
                          {g.items.map((it) => {
                            const idx = flatList.findIndex((x) => x.id === it.id);
                            return (
                              <PaletteRow
                                key={it.id}
                                item={it}
                                active={idx === activeIdx}
                                themeMode={themeMode}
                                onRun={() => onRun(it)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={cx('p-3', isDark ? 'border-t border-slate-700/70' : 'border-t border-slate-200/60')}>
                <div className={cx('flex items-center gap-2 text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  <span
                    className={cx(
                      'inline-flex items-center gap-2 rounded-2xl border px-3 py-2',
                      isDark ? 'border-slate-700/70 bg-slate-900 text-slate-300' : 'border-slate-200/70 bg-white dark:bg-slate-900'
                    )}
                  >
                    <Command className="h-4 w-4" /> Ctrl/Cmd + K
                  </span>
                  <span className="ml-auto">Tip: use Ctrl/Cmd + K for faster navigation</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NotificationDrawer({
  open,
  onClose,
  items,
  setItems,
  categories,
  navigate,
  pushToast,
}: {
  open: boolean;
  onClose: () => void;
  items: NotifItem[];
  setItems: (v: NotifItem[]) => void;
  categories: NotifCategory[];
  navigate: (to: string) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
}) {
  const [tab, setTab] = useState<NotificationCategory>('All');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) {
      setSelected({});
      setOnlyUnread(false);
      setTab('All');
    }
  }, [open]);

  const filtered = useMemo(() => {
    return items
      .filter((n) => (tab === 'All' ? true : n.category === tab))
      .filter((n) => (onlyUnread ? n.unread : true));
  }, [items, tab, onlyUnread]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const toggleAll = () => {
    const allSelected = filtered.length > 0 && filtered.every((n) => selected[n.id]);
    if (allSelected) {
      const next = { ...selected };
      filtered.forEach((n) => delete next[n.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      filtered.forEach((n) => (next[n.id] = true));
      setSelected(next);
    }
  };

  const markSelected = (unread: boolean) => {
    if (!selectedIds.length) return;
    const next = items.map((n) => (selectedIds.includes(n.id) ? { ...n, unread } : n));
    setItems(next);
    pushToast({
      title: unread ? 'Marked as unread' : 'Marked as read',
      message: `${selectedIds.length} updated.`,
      tone: unread ? 'warning' : 'success',
    });
    setSelected({});
  };

  const clearSelected = () => {
    if (!selectedIds.length) return;
    const prev = items;
    setItems(items.filter((n) => !selectedIds.includes(n.id)));
    pushToast({
      title: 'Archived',
      message: `${selectedIds.length} removed from this view.`,
      tone: 'default',
      actions: [{ label: 'Undo', onClick: () => setItems(prev) }],
    });
    setSelected({});
  };

  const markAllRead = () => {
    setItems(items.map((n) => ({ ...n, unread: false })));
    pushToast({
      title: 'All caught up',
      message: 'All notifications marked as read.',
      tone: 'success',
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[92vw] max-w-[460px] border-l border-slate-200/70 bg-white dark:bg-slate-900/90 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        Notification Control Center
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        Tabs, bulk actions and preferences
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconButton label="Mark all read" onClick={markAllRead}>
                      <CheckCheck className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Close" onClick={onClose}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(['All', ...categories] as NotificationCategory[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={cx(
                        'rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                        tab === t
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOnlyUnread((v) => !v)}
                    className={cx(
                      'ml-auto rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                      onlyUnread
                        ? 'border-orange-200 bg-orange-50 text-orange-800'
                        : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                    )}
                  >
                    {onlyUnread ? 'Unread' : 'All'}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Check className="h-4 w-4" />
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => markSelected(false)}
                    disabled={!selectedIds.length}
                    className={cx(
                      'inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition',
                      selectedIds.length
                        ? 'border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:bg-slate-950'
                        : 'cursor-not-allowed border-slate-100 text-slate-400'
                    )}
                  >
                    <CheckCheck className="h-4 w-4" />
                    Read
                  </button>
                  <button
                    type="button"
                    onClick={() => markSelected(true)}
                    disabled={!selectedIds.length}
                    className={cx(
                      'inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition',
                      selectedIds.length
                        ? 'border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:bg-slate-950'
                        : 'cursor-not-allowed border-slate-100 text-slate-400'
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    Unread
                  </button>
                  <button
                    type="button"
                    onClick={clearSelected}
                    disabled={!selectedIds.length}
                    className={cx(
                      'ml-auto inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition',
                      selectedIds.length
                        ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                        : 'cursor-not-allowed border-slate-100 text-slate-400'
                    )}
                  >
                    <X className="h-4 w-4" />
                    Archive
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigate('/settings/notification-preferences');
                    onClose();
                  }}
                  className="mt-3 flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <Settings className="h-4 w-4 text-slate-700" />
                    </span>
                    Notification Preferences
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {filtered.length === 0 ? (
                  <EmptyState
                    title="No notifications here"
                    message="Try switching tabs or turning off the unread filter."
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {filtered.map((n) => {
                      const checked = !!selected[n.id];
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() =>
                            pushToast({
                              title: n.title,
                              message: n.message,
                              tone: n.unread ? 'warning' : 'default',
                            })
                          }
                          className={cx(
                            'rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800',
                            n.unread ? 'border-orange-200/70' : 'border-slate-200/70'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected((s) => ({ ...s, [n.id]: !checked }));
                              }}
                              className={cx(
                                'grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900',
                                checked ? 'border-emerald-200' : 'border-slate-200/70'
                              )}
                              aria-label={checked ? 'Unselect' : 'Select'}
                            >
                              {checked ? (
                                <Check className="h-4 w-4 text-emerald-700" />
                              ) : (
                                <span className="h-4 w-4" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-black text-slate-900">
                                  {n.title}
                                </div>
                                {n.unread && <Badge tone="orange">Unread</Badge>}
                                <span className="ml-auto text-[10px] font-extrabold text-slate-400">
                                  {shortTime(n.createdAt)}
                                </span>
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">
                                {n.message}
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <Badge tone="slate">{n.category}</Badge>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItems(
                                      items.map((x) =>
                                        x.id === n.id ? { ...x, unread: false } : x
                                      )
                                    );
                                  }}
                                  className="ml-auto rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                                >
                                  Mark read
                                </button>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200/70 p-3">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/status-center');
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <ShieldCheck className="h-4 w-4 text-slate-700" />
                    </span>
                    Open Status Center
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function StatusCenterPage({
  navigate,
  pushToast,
  audit,
  embedded,
}: {
  navigate: (to: string) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  audit: AuditEvent[];
  embedded?: boolean;
}) {
  const suspicious = true;
  const sessions: DeviceSession[] = [
    {
      id: 's1',
      device: 'desktop',
      location: 'Wuxi, CN',
      ip: '10.11.2.33',
      lastSeen: nowIso(),
      current: true,
    },
    {
      id: 's2',
      device: 'mobile',
      location: 'Kampala, UG',
      ip: '41.210.9.12',
      lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    },
  ];

  return (
    <div className={cx(!embedded && 'shell-container')}>
      <div className="mb-4">
        <Breadcrumbs
          crumbs={[
            { label: 'SupplierHub', path: '/dashboard' },
            { label: 'Settings', path: '/settings' },
            { label: 'Status Center' },
          ]}
          onNavigate={navigate}
        />
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Status Center
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-500">
              KYC, payouts, tax, integrations, compliance, outages, webhooks, security and audit
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: 'Status refreshed',
                  message: 'Latest checks loaded.',
                  tone: 'success',
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {suspicious && (
        <div className="mb-4 rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-rose-900">Suspicious login detected</div>
              <div className="mt-1 text-xs font-semibold text-rose-900/70">
                We noticed an unusual sign-in pattern. Review device sessions and enable 2FA.
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings/security')}
              className="rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-rose-700"
            >
              Review
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard className="p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Compliance and finance health</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Single place for trust signals
              </div>
            </div>
            <Badge tone="green">Healthy</Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <HealthTile
              title="KYC / KYB"
              value="75%"
              note="Documents pending"
              icon={ShieldCheck}
              tone="orange"
              onClick={() => navigate('/settings/kyc')}
            />
            <HealthTile
              title="Payouts"
              value="Active"
              note="Next settlement Fri"
              icon={Wallet}
              tone="green"
              onClick={() => navigate('/finance')}
            />
            <HealthTile
              title="Tax"
              value="Configured"
              note="VAT profiles ready"
              icon={Receipt}
              tone="green"
              onClick={() => navigate('/settings/tax')}
            />
            <HealthTile
              title="Integrations"
              value="3 connected"
              note="Webhooks OK"
              icon={Link2}
              tone="green"
              onClick={() => navigate('/settings/integrations')}
            />
            <HealthTile
              title="Compliance"
              value="OK"
              note="No holds"
              icon={ShieldCheck}
              tone="green"
              onClick={() => navigate('/ops')}
            />
            <HealthTile
              title="Outages"
              value="None"
              note="All systems normal"
              icon={WifiOff}
              tone="green"
              onClick={() =>
                pushToast({ title: 'No outages', message: 'All providers OK.', tone: 'success' })
              }
            />
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Security presence</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Sessions, 2FA and last login
              </div>
            </div>
            <Badge tone="danger">Review</Badge>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-extrabold text-slate-900">2FA</div>
              <span className="ml-auto">
                <Badge tone="orange">Not enabled</Badge>
              </span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              Enable 2FA to protect payouts and contracts.
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings/security')}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <ShieldCheck className="h-4 w-4" />
              Enable
            </button>
          </div>

          <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-extrabold text-slate-900">Device sessions</div>
              <span className="ml-auto">
                <Badge tone="slate">{sessions.length}</Badge>
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                    {s.device === 'desktop' ? (
                      <Monitor className="h-5 w-5" />
                    ) : (
                      <Smartphone className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 truncate">{s.location}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      {s.ip} · {shortTime(s.lastSeen)}
                    </div>
                  </div>
                  {s.current ? (
                    <Badge tone="green">Current</Badge>
                  ) : (
                    <Badge tone="slate">Past</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="mt-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Audit trail</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Entry points from payouts, contracts and listing edits
              </div>
            </div>
            <Badge tone="slate">{audit.length}</Badge>
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
              <div className="col-span-3">Time</div>
              <div className="col-span-2">Actor</div>
              <div className="col-span-3">Action</div>
              <div className="col-span-4">Detail</div>
            </div>
            <div className="divide-y divide-slate-200/70">
              {audit.slice(0, 12).map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700"
                >
                  <div className="col-span-3 text-slate-500">{shortTime(e.at)}</div>
                  <div className="col-span-2 font-extrabold text-slate-800">{e.actor}</div>
                  <div className="col-span-3">{e.action}</div>
                  <div className="col-span-4 text-slate-500 truncate">{e.detail ?? ''}</div>
                </div>
              ))}
              {audit.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No audit events yet"
                    message="Simulate an action from pages to populate the audit trail."
                  />
                </div>
              ) : null}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function HealthTile({
  title,
  value,
  note,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ElementType;
  tone: 'green' | 'orange';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            'grid h-11 w-11 place-items-center rounded-2xl',
            tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold text-slate-600">{title}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{note}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </button>
  );
}

function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  subnav,
  right,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: React.ReactNode;
  subnav?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      {breadcrumbs}
      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</div>
          ) : null}
          {subnav}
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
    </div>
  );
}

function TinyStat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
}) {
  const Icon = icon;
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
          <Icon className="h-5 w-5 text-slate-800" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
          {hint ? <div className="mt-1 text-xs font-semibold text-slate-500">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function SupplierPlaceholder({
  role,
  path,
  navigate,
  crumbs,
  pushToast,
  logAudit,
  saveView,
}: {
  role: Role;
  path: string;
  navigate: (to: string) => void;
  crumbs: Array<{ label: string; path?: string }>;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  logAudit: (e: Omit<AuditEvent, 'id' | 'at'>) => void;
  saveView: (v: Omit<SavedView, 'id'>) => void;
}) {
  const title = formatTitleFromPath(path);
  const subtitle =
    role === 'seller'
      ? 'Manage products, wholesale, operations, finance and MyLiveDealz in one place.'
      : 'Manage service command, bookings, quotes, consultations and MyLiveDealz in one place.';

  const showSaveView =
    path.startsWith('/orders') ||
    path.startsWith('/listings') ||
    path.startsWith('/provider') ||
    path.startsWith('/expressmart');

  return (
    <div className="shell-container">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={<Breadcrumbs crumbs={crumbs} onNavigate={navigate} />}
        right={
          <>
            {showSaveView ? (
              <button
                type="button"
                onClick={() => {
                  const group = domainGroupForPath(path);
                  saveView({
                    name: `Saved view: ${title}`,
                    route: path,
                    group,
                    pinned: false,
                    note: 'Pinned view',
                  });
                  pushToast({
                    title: 'View saved',
                    message: 'Open it later from Command Palette.',
                    tone: 'success',
                  });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Bookmark className="h-4 w-4" />
                Save view
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                logAudit({
                  actor: 'SellerSeller',
                  action: 'action simulated',
                  detail: 'Demo audit entry',
                  route: path,
                });
                pushToast({
                  title: 'Action recorded',
                  message: 'Added to audit trail.',
                  tone: 'default',
                  actions: [{ label: 'Open audit', onClick: () => navigate('/status-center') }],
                });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              Simulate audit
            </button>

            <button
              type="button"
              onClick={() => navigate('/status-center')}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <ShieldCheck className="h-4 w-4" />
              Status Center
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard className="p-5 lg:col-span-8">
          <div className="flex items-start gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-3xl text-white"
              style={{
                background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)`,
              }}
            >
              <Activity className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black text-slate-900">Today at a glance</div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Synced across SupplierHub and nested shells
              </div>
            </div>
            <div className="ml-auto hidden md:flex items-center gap-2">
              <Badge tone="green">Auto sync</Badge>
              <Badge tone="slate">Premium</Badge>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TinyStat
              label="Revenue"
              value={role === 'seller' ? 'CNY 9,480,000' : 'CNY 2,350,000'}
              hint="Storefront + marketplace"
              icon={Wallet}
            />
            <TinyStat
              label={role === 'seller' ? 'Active' : 'Bookings'}
              value={role === 'seller' ? '21 orders' : '12 bookings'}
              hint={role === 'seller' ? 'Open + in progress' : 'Open + upcoming'}
              icon={ClipboardList}
            />
            <TinyStat label="MyLiveDealz" value="6 active" hint="Live + Adz running" icon={Flame} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate(role === 'seller' ? '/orders' : '/provider/bookings')}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                  <ClipboardList className="h-5 w-5 text-slate-800" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {role === 'seller' ? 'Go to Orders' : 'Go to Bookings'}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-500">
                    {role === 'seller'
                      ? 'View and fulfill recent activity'
                      : 'Manage booking workflow'}
                  </div>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate(role === 'seller' ? '/wholesale' : '/provider/new-quote')}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                  <Building2 className="h-5 w-5 text-slate-800" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {role === 'seller' ? 'Open Wholesale' : 'New Quote'}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-500">
                    {role === 'seller'
                      ? 'RFQs, quotes and price lists'
                      : 'Send proposals to buyers'}
                  </div>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/mldz/feed')}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                  <Flame className="h-5 w-5 text-slate-800" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Open MyLiveDealz</div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-500">
                    Live + Adz + collabs
                  </div>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
              </div>
            </button>
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Next actions</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Keeps your supplier account healthy
              </div>
            </div>
            <Badge tone="slate">Status</Badge>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-extrabold text-slate-900">
                  Complete KYC verification
                </div>
                <Badge tone="orange">Required</Badge>
                <button
                  type="button"
                  onClick={() => navigate('/settings/kyc')}
                  className="ml-auto rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                >
                  Continue
                </button>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                Upload remaining documents so payouts are never delayed.
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-extrabold text-slate-900">Review regulated desks</div>
                <Badge tone="slate">Compliance</Badge>
                <button
                  type="button"
                  onClick={() => navigate('/regulatory')}
                  className="ml-auto rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                >
                  Open
                </button>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                HealthMart, EduMart and FaithMart workflows.
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-extrabold text-slate-900">Status Center</div>
                <Badge tone="green">Trust</Badge>
                <button
                  type="button"
                  onClick={() => navigate('/status-center')}
                  className="ml-auto rounded-2xl px-3 py-1.5 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  Open
                </button>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                KYC, payouts, integrations, webhooks and audit.
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function toneClasses(tone: Tone) {
  switch (tone) {
    case 'orange':
      return { bg: 'bg-orange-50', text: 'text-orange-700' };
    case 'indigo':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700' };
    case 'rose':
      return { bg: 'bg-rose-50', text: 'text-rose-700' };
    case 'emerald':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
    case 'amber':
      return { bg: 'bg-amber-50', text: 'text-amber-700' };
    case 'violet':
      return { bg: 'bg-violet-50', text: 'text-violet-700' };
    case 'sky':
      return { bg: 'bg-sky-50', text: 'text-sky-700' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}

function accentStyles(accent: Accent, isDark: boolean) {
  if (accent === 'orange') {
    return {
      activeBg: isDark ? 'bg-orange-900/30 ring-1 ring-orange-700/45' : 'bg-orange-50/80 ring-1 ring-orange-200/60',
      bar: 'bg-orange-500',
      arrow: isDark ? 'text-orange-300' : 'text-orange-600',
    };
  }
  return {
    activeBg: isDark ? 'bg-emerald-900/30 ring-1 ring-emerald-700/45' : 'bg-emerald-50/80 ring-1 ring-emerald-200/60',
    bar: 'bg-emerald-500',
    arrow: isDark ? 'text-emerald-300' : 'text-emerald-700',
  };
}

function ModuleNavItem({
  item,
  active,
  onClick,
  accent,
  themeMode,
}: {
  item: ShellItem;
  active: boolean;
  onClick: () => void;
  accent: Accent;
  themeMode: ThemeMode;
}) {
  const Icon = item.icon;
  const tone = toneClasses(item.tone);
  const isDark = themeMode === 'dark';
  const a = accentStyles(accent, isDark);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'relative flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition',
        active ? a.activeBg : isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-100/70'
      )}
    >
      {active && (
        <span
          className={cx('absolute left-1 top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-full', a.bar)}
        />
      )}
      <span
        className={cx(
          'grid h-9 w-9 place-items-center rounded-2xl',
          isDark ? 'bg-slate-800' : tone.bg
        )}
      >
        <Icon className={cx('h-4 w-4', isDark ? 'text-slate-200' : tone.text)} />
      </span>
      <span
        className={cx(
          'min-w-0 flex-1 truncate whitespace-nowrap',
          isDark ? (active ? 'text-slate-100' : 'text-slate-300') : active ? 'text-slate-900' : 'text-slate-800'
        )}
      >
        {item.label}
      </span>
      {item.badge ? (
        <span className={cx('text-[11px] font-extrabold', isDark ? 'text-slate-400' : 'text-slate-500')}>
          {item.badge}
        </span>
      ) : null}
      {active && <ChevronRight className={cx('h-4 w-4', a.arrow)} />}
    </button>
  );
}

function ShellSidebarCard({
  title,
  badge,
  headerBg,
  headerText,
  icon: Icon,
  groups,
  accent,
  path,
  navigate,
  themeMode,
  onBack,
  backLabel = 'Back to SupplierHub',
  compact,
}: {
  title: string;
  badge?: { text: string; tone: 'green' | 'orange' | 'slate' };
  headerBg: string;
  headerText: string;
  icon: React.ElementType;
  groups: ShellGroup[];
  accent: Accent;
  path: string;
  navigate: (to: string) => void;
  themeMode: ThemeMode;
  onBack?: () => void;
  backLabel?: string;
  compact?: boolean;
}) {
  const isDark = themeMode === 'dark';
  const backTone: 'light' | 'dark' = headerText.includes('white') ? 'dark' : 'light';

  return (
    <div
      className={cx(
        'overflow-hidden rounded-3xl border shadow-[0_18px_70px_rgba(2,16,23,0.08)] backdrop-blur',
        isDark ? 'border-slate-700/80 bg-slate-900/95' : 'border-slate-200/70 bg-white dark:bg-slate-900/70',
        compact && (isDark ? 'bg-slate-900' : 'bg-white dark:bg-slate-900/90')
      )}
    >
      <div
        className={cx('px-4 py-3', isDark ? 'border-b border-slate-700/70' : 'border-b border-slate-200/70')}
        style={{ background: headerBg }}
      >
        <div className="flex items-center gap-2">
          {onBack ? (
            <IconButton label={backLabel} onClick={onBack} tone={backTone}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
          ) : null}

          <div
            className={cx(
              'grid h-9 w-9 place-items-center rounded-2xl',
              headerText.includes('white')
                ? (isDark ? 'border border-white/20 bg-white/10' : 'border border-white/30 bg-white/15')
                : isDark
                  ? 'bg-slate-800'
                  : 'bg-slate-100'
            )}
          >
            <Icon className={cx('h-4 w-4', headerText)} />
          </div>
          <div className={cx('text-sm font-black', headerText)}>{title}</div>
          {badge ? (
            <span className="ml-auto">
              <Badge tone={badge.tone}>{badge.text}</Badge>
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cx(
          'max-h-[calc(100vh-190px)] overflow-y-auto p-3',
          compact && 'max-h-[calc(100vh-140px)]'
        )}
      >
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.title}>
              <div
                className={cx(
                  'px-2 pb-2 text-[10px] font-extrabold uppercase tracking-wider',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}
              >
                {g.title}
              </div>
              <div className="flex flex-col gap-2">
                {g.items.map((it) => (
                  <ModuleNavItem
                    key={it.key}
                    item={it}
                    active={isActivePath(path, it.path)}
                    onClick={() => navigate(it.path)}
                    accent={accent}
                    themeMode={themeMode}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShellMobileDrawer({
  open,
  onClose,
  onBack,
  title,
  badge,
  headerBg,
  headerText,
  icon,
  groups,
  accent,
  path,
  navigate,
  themeMode,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  badge?: { text: string; tone: 'green' | 'orange' | 'slate' };
  headerBg: string;
  headerText: string;
  icon: React.ElementType;
  groups: ShellGroup[];
  accent: Accent;
  path: string;
  navigate: (to: string) => void;
  themeMode: ThemeMode;
}) {
  const isDark = themeMode === 'dark';
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -22, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -22, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cx(
              'fixed left-0 top-0 z-[65] h-screen w-[88vw] max-w-[260px] overflow-hidden border-r shadow-2xl backdrop-blur lg:hidden',
              isDark ? 'border-slate-700/70 bg-slate-950/95' : 'border-slate-200/70 bg-white dark:bg-slate-900/95'
            )}
          >
            <div className="flex h-full flex-col">
              <div className={cx('flex items-center justify-between border-b p-3', isDark ? 'border-slate-700/70' : 'border-slate-200/70')}>
                <div className={cx('text-sm font-black', isDark ? 'text-slate-100' : 'text-slate-900')}>Module Menu</div>
                <IconButton label="Close" onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="flex-1 p-3">
                <ShellSidebarCard
                  title={title}
                  badge={badge}
                  headerBg={headerBg}
                  headerText={headerText}
                  icon={icon}
                  groups={groups}
                  accent={accent}
                  path={path}
                  themeMode={themeMode}
                  navigate={(to) => {
                    navigate(to);
                    onClose();
                  }}
                  onBack={() => {
                    onBack?.();
                    onClose();
                  }}
                  compact
                />
              </div>

              <div className={cx('border-t p-3', isDark ? 'border-slate-700/70' : 'border-slate-200/70')}>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/dashboard');
                    onClose();
                  }}
                  className={cx(
                    'flex w-full items-center justify-between rounded-3xl border px-4 py-3 text-left text-sm font-extrabold transition',
                    isDark
                      ? 'border-slate-700/70 bg-slate-900/70 text-slate-100 hover:bg-slate-800'
                      : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cx(
                        'grid h-10 w-10 place-items-center rounded-2xl border',
                        isDark ? 'border-slate-700/70 bg-slate-900' : 'border-slate-200/70 bg-white dark:bg-slate-900'
                      )}
                    >
                      <Home className={cx('h-4 w-4', isDark ? 'text-slate-300' : 'text-slate-700')} />
                    </span>
                    Back to SupplierHub
                  </span>
                  <ChevronLeft className={cx('h-4 w-4', isDark ? 'text-slate-500' : 'text-slate-300')} />
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ShellContentCard({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  navigate,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: { text: string; tone: 'green' | 'orange' | 'slate' };
  actions: Array<{ label: string; to: string; primary?: boolean; accent: Accent }>;
  navigate: (to: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">{title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div>
        </div>
        {badge ? (
          <span className="ml-auto">
            <Badge tone={badge.tone}>{badge.text}</Badge>
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.to}
            type="button"
            onClick={() => navigate(a.to)}
            className={cx(
              'rounded-2xl px-3 py-2 text-xs font-extrabold',
              a.primary ? 'text-white' : 'border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100'
            )}
            style={
              a.primary
                ? { background: a.accent === 'orange' ? TOKENS.orange : TOKENS.green }
                : undefined
            }
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GenericShell({
  shellTitle,
  shellSubtitle,
  accent,
  themeMode,
  sidebarHeader,
  sidebarBadge,
  sidebarIcon,
  groups,
  path,
  navigate,
  crumbs,
  subnavItems,
  rightActions,
  cards,
}: {
  shellTitle: string;
  shellSubtitle: string;
  accent: Accent;
  themeMode: ThemeMode;
  sidebarHeader: { bg: string; textClass: string };
  sidebarBadge?: { text: string; tone: 'green' | 'orange' | 'slate' };
  sidebarIcon: React.ElementType;
  groups: ShellGroup[];
  path: string;
  navigate: (to: string) => void;
  crumbs: Array<{ label: string; path?: string }>;
  subnavItems: Array<{ label: string; path: string }>;
  rightActions?: React.ReactNode;
  cards: Array<{
    title: string;
    subtitle: string;
    icon: React.ElementType;
    badge?: { text: string; tone: 'green' | 'orange' | 'slate' };
    actions: Array<{ label: string; to: string; primary?: boolean; accent: Accent }>;
  }>;
}) {
  const isDark = themeMode === 'dark';
  return (
    <div className="shell-container">
      <PageHeader
        title={shellTitle}
        subtitle={shellSubtitle}
        breadcrumbs={<Breadcrumbs crumbs={crumbs} onNavigate={navigate} />}
        subnav={
          <Subnav items={subnavItems} activePath={path} onNavigate={navigate} accent={accent} />
        }
        right={rightActions}
      />

      <div className="grid gap-2 lg:grid-cols-[minmax(0,clamp(180px,20vw,246px))_minmax(0,1fr)] xl:grid-cols-[minmax(0,clamp(190px,19vw,257px))_minmax(0,1fr)]">
        <div className="hidden min-w-0 lg:block">
          <div className="sticky top-[76px]">
            <ShellSidebarCard
              title={shellTitle}
              badge={sidebarBadge}
              headerBg={sidebarHeader.bg}
              headerText={sidebarHeader.textClass}
              icon={sidebarIcon}
              groups={groups}
              accent={accent}
              path={path}
              themeMode={themeMode}
              navigate={navigate}
              onBack={() => navigate('/dashboard')}
            />
          </div>
        </div>

        <div className="min-w-0">
          <GlassCard className="overflow-hidden">
            <div
              className={cx(
                'border-b px-5 py-4',
                isDark ? 'border-slate-700/70 bg-slate-900/70' : 'border-slate-200/70 bg-white dark:bg-slate-900/70'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className={cx('truncate text-sm font-black', isDark ? 'text-slate-100' : 'text-slate-900')}>
                    {formatTitleFromPath(path)}
                  </div>
                  <div className={cx('mt-1 text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    Nested shell active. Use module sidebar, Command Palette or subnav.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={accent === 'orange' ? 'orange' : 'green'}>
                    {accent === 'orange' ? 'MyLiveDealz' : 'SupplierHub'}
                  </Badge>
                  <Badge tone="slate">Nested shell</Badge>
                </div>
              </div>
            </div>

            <motion.div
              key={path}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              className="p-5"
            >
              <div className="grid gap-3 md:grid-cols-2">
                {cards.map((c) => (
                  <ShellContentCard
                    key={c.title}
                    title={c.title}
                    subtitle={c.subtitle}
                    icon={c.icon}
                    badge={c.badge}
                    actions={c.actions}
                    navigate={navigate}
                  />
                ))}
              </div>

              <div
                className={cx(
                  'mt-5 rounded-3xl border p-4',
                  accent === 'orange'
                    ? 'border-orange-200/60 bg-orange-50/60'
                    : 'border-emerald-200/60 bg-emerald-50/60'
                )}
              >
                <div className="flex items-center gap-2">
                  <Sparkles
                    className={cx(
                      'h-4 w-4',
                      accent === 'orange' ? 'text-orange-800' : 'text-emerald-800'
                    )}
                  />
                  <div
                    className={cx(
                      'text-sm font-extrabold',
                      accent === 'orange' ? 'text-orange-900' : 'text-emerald-900'
                    )}
                  >
                    Premium shell notes
                  </div>
                </div>
                <ul
                  className={cx(
                    'mt-2 list-disc space-y-1 pl-5 text-xs font-semibold',
                    accent === 'orange' ? 'text-orange-900/80' : 'text-emerald-900/80'
                  )}
                >
                  <li>Main sidebar auto-collapses inside nested shells for focus.</li>
                  <li>Module Menu (mobile) shows nested shell nav.</li>
                  <li>Nested pages are removed from the main sidebar to avoid duplicates.</li>
                </ul>
              </div>
            </motion.div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function buildShellBreadcrumbs(
  base: { label: string; path: string },
  path: string,
  groups: ShellGroup[]
) {
  const crumbs: Array<{ label: string; path?: string }> = [
    { label: 'SupplierHub', path: '/dashboard' },
    base,
  ];

  const group = groups.find((g) => g.items.some((i) => isActivePath(path, i.path)));
  if (group) {
    crumbs.push({ label: group.title });
    const item = group.items.find((i) => isActivePath(path, i.path));
    if (item) crumbs.push({ label: item.label });
    return crumbs;
  }

  crumbs.push({ label: formatTitleFromPath(path) });
  return crumbs;
}

function subnavFromGroups(path: string, groups: ShellGroup[]) {
  const group = groups.find((g) => g.items.some((i) => isActivePath(path, i.path)));
  if (!group) return [];
  return group.items.map((i) => ({ label: i.label, path: i.path }));
}

function buildSearchIndex(
  supplierNav: NavGroupDef[],
  mldzNav: ShellGroup[],
  wholesaleNav: ShellGroup[],
  opsNav: ShellGroup[],
  financeNav: ShellGroup[],
  desksNav: ShellGroup[],
  settingsNav: ShellGroup[],
  supportNav: ShellGroup[],
  role: Role
): SearchIndexItem[] {
  const items: SearchIndexItem[] = [];
  const seenRoutes = new Set<string>();

  const addRoute = (
    route: string,
    label: string,
    group: DomainGroup,
    hint: string,
    icon: React.ElementType,
    keywords?: string[]
  ) => {
    if (seenRoutes.has(route)) return;
    seenRoutes.add(route);
    items.push({ id: `route_${route}`, type: 'route', group, label, hint, icon, route, keywords });
  };

  const allowForRole = (roles?: Role[]) => !roles || roles.includes(role);

  supplierNav.forEach((g) => {
    if (!allowForRole(g.roles)) return;
    g.items.forEach((it) => {
      if (!allowForRole(it.roles)) return;
      addRoute(it.path, it.label, domainGroupForPath(it.path), g.title, it.icon, [g.title]);
      it.children?.forEach((c) => {
        if (!allowForRole(c.roles)) return;
        addRoute(
          c.path,
          c.label,
          domainGroupForPath(c.path),
          it.label,
          c.icon,
          [g.title, it.label]
        );
      });
    });
  });

  const addShellNav = (shellLabel: string, groups: ShellGroup[], roles?: Role[]) => {
    if (!allowForRole(roles)) return;
    groups.forEach((g) => {
      g.items.forEach((it) =>
        addRoute(
          it.path,
          it.label,
          domainGroupForPath(it.path),
          `${shellLabel} · ${g.title}`,
          it.icon,
          [shellLabel, g.title]
        )
      );
    });
  };

  addShellNav('MyLiveDealz', mldzNav);
  addShellNav('Wholesale', wholesaleNav, ['seller']);
  addShellNav('Ops Center', opsNav, ['seller']);
  addShellNav('Finance', financeNav, ['seller']);
  addShellNav('Regulatory Desks', desksNav);
  addShellNav('Settings', settingsNav);
  addShellNav('Support', supportNav);

  const actions: SearchIndexItem[] = [
    {
      id: 'act_open_notifs',
      type: 'action',
      group: 'Other',
      label: 'Open Notification Control Center',
      hint: 'Drawer',
      icon: Bell,
      actionKey: 'open_notifs',
    },
    {
      id: 'act_open_status',
      type: 'action',
      group: 'Settings',
      label: 'Open Status Center',
      hint: 'Trust signals',
      icon: ShieldCheck,
      actionKey: 'open_status',
    },
    {
      id: 'act_open_create',
      type: 'action',
      group: 'Other',
      label: 'Open Quick Create',
      hint: 'Create center',
      icon: Plus,
      actionKey: 'open_create',
    },
  ];

  return [...items, ...actions];
}

function useSupplierNav(
  role: Role,
  counts?: { messages?: number; notifications?: number; orders?: number; bookings?: number; reviews?: number }
): NavGroupDef[] {
  const ordersBadge = formatCountBadge(counts?.orders);
  const bookingsBadge = formatCountBadge(counts?.bookings);
  const reviewsBadge = formatCountBadge(counts?.reviews);
  return useMemo(() => {
    // NOTE: Nested shell sub-items are NOT shown in the main sidebar (per user request).
    const primary: NavGroupDef = {
      title: 'Primary',
      items: [
        { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: Home },
        {
          key: 'orders',
          label: 'Orders',
          path: '/orders',
          icon: Package,
          roles: ['seller'],
          badge: ordersBadge,
          badgeTone: 'danger',
        },
        { key: 'listings', label: 'Listings', path: '/listings', icon: Boxes, roles: ['seller'] },

        // Provider primary (independent items)
        {
          key: 'service-command',
          label: 'Service Command',
          path: '/provider/service-command',
          icon: Briefcase,
          roles: ['provider'],
        },
        {
          key: 'my-bookings',
          label: 'My Bookings',
          path: '/provider/bookings',
          icon: ClipboardList,
          roles: ['provider'],
          badge: bookingsBadge,
          badgeTone: 'danger',
        },
        {
          key: 'my-listing',
          label: 'My Listing',
          path: '/provider/listings',
          icon: Store,
          roles: ['provider'],
        },
        {
          key: 'my-portfolio',
          label: 'My Portfolio',
          path: '/provider/portfolio',
          icon: FileText,
          roles: ['provider'],
        },

        {
          key: 'reviews-home',
          label: 'Reviews',
          path: role === 'provider' ? '/provider/reviews' : '/seller/reviews',
          icon: Star,
          badge: reviewsBadge,
          badgeTone: 'danger',
        },
        { key: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3 },
      ],
    };

    const marketplaces: NavGroupDef = {
      title: 'Marketplaces',
      items: [
        { key: 'mldz', label: 'MyLiveDealz', path: '/mldz/feed', icon: Flame },
        {
          key: 'expressmart',
          label: 'ExpressMart',
          path: '/expressmart',
          icon: Truck,
          roles: ['seller'],
        },
        // Wholesale is a NESTED SHELL: no children here
        {
          key: 'wholesale',
          label: 'Wholesale',
          path: '/wholesale',
          icon: Building2,
          roles: ['seller'],
        },
      ],
    };

    // Secondary section (merged): Ops, Finance, Desks, Reviews, Settings, Support.
    const secondary: NavGroupDef = {
      title: 'SECONDARY',
      items: [
        {
          key: 'ops-home',
          label: 'Ops Center',
          path: role === 'provider' ? '/provider/service-command' : '/ops',
          icon: Truck,
        },
        {
          key: 'finance-home',
          label: 'Finance',
          path: role === 'provider' ? '/provider/quotes' : '/finance',
          icon: Wallet,
        },
        { key: 'desks-home', label: 'Regulatory Desks', path: '/regulatory', icon: ShieldCheck, noWrap: true },
        { key: 'settings-shell', label: 'Settings', path: '/settings', icon: Settings },
        { key: 'support-shell', label: 'Support', path: '/support', icon: HelpCircle },
      ],
    };

    return [primary, marketplaces, secondary];
  }, [bookingsBadge, ordersBadge, reviewsBadge, role]);
}

function useMldzNav(): ShellGroup[] {
  return useMemo(() => {
    const base = '/mldz';
    return [
      {
        title: 'OVERVIEW',
        tone: 'orange',
        items: [
          {
            key: 'feed',
            label: 'LiveDealz Feed',
            path: `${base}/feed`,
            icon: Flame,
            tone: 'orange',
          },
          {
            key: 'my-campaigns',
            label: 'My Campaigns',
            path: `${base}/campaigns`,
            icon: ClipboardList,
            tone: 'orange',
          },
          {
            key: 'dealz-marketplace',
            label: 'Dealz Marketplace',
            path: `${base}/dealz-marketplace`,
            icon: Store,
            tone: 'orange',
          },
        ],
      },
      {
        title: 'LIVE SESSIONZ',
        tone: 'indigo',
        items: [
          {
            key: 'live-dashboard',
            label: 'Live Dashboard',
            path: `${base}/live/dashboard`,
            icon: Video,
            tone: 'indigo',
          },
          {
            key: 'live-schedule',
            label: 'Live Schedule',
            path: `${base}/live/schedule`,
            icon: ClipboardList,
            tone: 'indigo',
          },
          {
            key: 'live-studio',
            label: 'Live Studio',
            path: `${base}/live/studio`,
            icon: Video,
            tone: 'indigo',
          },
          {
            key: 'replays',
            label: 'Replays & Clips',
            path: `${base}/live/replays`,
            icon: FileText,
            tone: 'indigo',
          },
        ],
      },
      {
        title: 'SHOPPABLE ADZ',
        tone: 'rose',
        items: [
          {
            key: 'adz-dashboard',
            label: 'Adz Dashboard',
            path: `${base}/adz/dashboard`,
            icon: Wand2,
            tone: 'rose',
          },
          {
            key: 'adz-marketplace',
            label: 'Adz Marketplace',
            path: `${base}/adz/marketplace`,
            icon: Store,
            tone: 'rose',
          },
          {
            key: 'adz-manager',
            label: 'Adz Manager',
            path: `${base}/adz/manager`,
            icon: SlidersHorizontal,
            tone: 'rose',
          },
        ],
      },
      {
        title: 'DELIVERABLES',
        tone: 'emerald',
        items: [
          {
            key: 'task-board',
            label: 'Task Board',
            path: `${base}/deliverables/task-board`,
            icon: ClipboardList,
            tone: 'emerald',
          },
          {
            key: 'asset-library',
            label: 'Asset Library',
            path: `${base}/deliverables/asset-library`,
            icon: Boxes,
            tone: 'emerald',
          },
          {
            key: 'links-hub',
            label: 'Links Hub',
            path: `${base}/deliverables/links-hub`,
            icon: Link2,
            tone: 'emerald',
          },
        ],
      },
      {
        title: 'INSIGHTS & STATUS',
        tone: 'amber',
        items: [
          {
            key: 'analytics-status',
            label: 'Analytics & Status',
            path: `${base}/insights/analytics-status`,
            icon: BarChart3,
            tone: 'amber',
          },
        ],
      },
      {
        title: 'CREATOR COLLABS',
        tone: 'violet',
        items: [
          {
            key: 'creator-directory',
            label: 'Creator Directory',
            path: `${base}/creators/directory`,
            icon: Users2,
            tone: 'violet',
          },
          {
            key: 'my-creators',
            label: 'My Creators',
            path: `${base}/creators/my-creators`,
            icon: Users,
            tone: 'violet',
          },
          {
            key: 'creator-invites',
            label: 'Invites from Creators',
            path: `${base}/creators/invites`,
            icon: MessageCircle,
            tone: 'violet',
          },
        ],
      },
      {
        title: 'COLLAB FLOWS',
        tone: 'sky',
        items: [
          {
            key: 'campaigns',
            label: 'Campaigns Board',
            path: `${base}/collab/campaigns`,
            icon: ClipboardList,
            tone: 'sky',
          },
          {
            key: 'proposals',
            label: 'Proposals',
            path: `${base}/collab/proposals`,
            icon: FileText,
            tone: 'sky',
          },
          {
            key: 'contracts',
            label: 'Contracts',
            path: `${base}/collab/contracts`,
            icon: Handshake,
            tone: 'sky',
          },
        ],
      },
      {
        title: 'TEAM',
        tone: 'slate',
        items: [
          {
            key: 'crew',
            label: 'Crew Manager',
            path: `${base}/team/crew-manager`,
            icon: Users,
            tone: 'slate',
          },
          {
            key: 'roles',
            label: 'Roles & Permissions',
            path: `${base}/team/roles-permissions`,
            icon: ShieldCheck,
            tone: 'slate',
          },
        ],
      },
      {
        title: 'SETTINGS',
        tone: 'slate',
        items: [
          {
            key: 'supplier-settings',
            label: 'Supplier Settings',
            path: `${base}/settings/supplier-settings`,
            icon: Settings,
            tone: 'slate',
          },
          {
            key: 'my-subscriptions',
            label: 'My subscriptions',
            path: `${base}/settings/my-subscriptions`,
            icon: CreditCard,
            tone: 'slate',
          },
        ],
      },
    ];
  }, []);
}

function useWholesaleNav(): ShellGroup[] {
  return useMemo(() => {
    return [
      {
        title: 'OVERVIEW',
        tone: 'emerald',
        items: [
          {
            key: 'wh-home',
            label: 'Wholesale Home',
            path: '/wholesale',
            icon: Building2,
            tone: 'emerald',
          },
        ],
      },
      {
        title: 'PRICING',
        tone: 'amber',
        items: [
          {
            key: 'wh-price',
            label: 'Price Lists',
            path: '/wholesale/price-lists',
            icon: Receipt,
            tone: 'amber',
          },
        ],
      },
      {
        title: 'REQUESTS',
        tone: 'sky',
        items: [
          {
            key: 'wh-rfq',
            label: 'RFQ Inbox',
            path: '/wholesale/rfq',
            icon: FileText,
            tone: 'sky',
          },
        ],
      },
      {
        title: 'QUOTES',
        tone: 'violet',
        items: [
          {
            key: 'wh-quotes',
            label: 'Quotes',
            path: '/wholesale/quotes',
            icon: FileText,
            tone: 'violet',
          },
        ],
      },
      {
        title: 'TOOLS',
        tone: 'slate',
        items: [
          {
            key: 'wh-templates',
            label: 'Templates',
            path: '/wholesale/templates',
            icon: Bookmark,
            tone: 'slate',
          },
          {
            key: 'wh-incoterms',
            label: 'Incoterms',
            path: '/wholesale/incoterms',
            icon: Globe,
            tone: 'slate',
          },
        ],
      },
    ];
  }, []);
}

function useOpsNav(): ShellGroup[] {
  return useMemo(() => {
    return [
      {
        title: 'OVERVIEW',
        tone: 'emerald',
        items: [
          { key: 'ops-home', label: 'Ops Center', path: '/ops', icon: Truck, tone: 'emerald' },
        ],
      },
      {
        title: 'FULFILLMENT',
        tone: 'sky',
        items: [
          {
            key: 'ops-ship',
            label: 'Shipping Profiles',
            path: '/ops/shipping-profiles',
            icon: Truck,
            tone: 'sky',
          },
          {
            key: 'ops-wh',
            label: 'Warehouses',
            path: '/ops/warehouses',
            icon: Building2,
            tone: 'sky',
          },
        ],
      },
      {
        title: 'INVENTORY',
        tone: 'amber',
        items: [
          {
            key: 'ops-inv',
            label: 'Inventory',
            path: '/ops/inventory',
            icon: Boxes,
            tone: 'amber',
          },
        ],
      },
      {
        title: 'CASES',
        tone: 'rose',
        items: [
          {
            key: 'ops-returns',
            label: 'Returns & RMAs',
            path: '/ops/returns',
            icon: ClipboardList,
            tone: 'rose',
          },
          {
            key: 'ops-disputes',
            label: 'Disputes',
            path: '/ops/disputes',
            icon: ShieldCheck,
            tone: 'rose',
          },
        ],
      },
      {
        title: 'DOCS & EXPORTS',
        tone: 'slate',
        items: [
          {
            key: 'ops-docs',
            label: 'Documents Center',
            path: '/ops/documents',
            icon: FileText,
            tone: 'slate',
          },
          { key: 'ops-exp', label: 'Exports', path: '/ops/exports', icon: Globe, tone: 'slate' },
        ],
      },
      {
        title: 'COMPLIANCE',
        tone: 'violet',
        items: [
          {
            key: 'ops-comp',
            label: 'Compliance Center',
            path: '/ops/compliance',
            icon: ShieldCheck,
            tone: 'violet',
          },
        ],
      },
    ];
  }, []);
}

function useFinanceNav(): ShellGroup[] {
  return useMemo(() => {
    return [
      {
        title: 'OVERVIEW',
        tone: 'emerald',
        items: [
          {
            key: 'fin-home',
            label: 'Finance Home',
            path: '/finance',
            icon: Wallet,
            tone: 'emerald',
          },
        ],
      },
      {
        title: 'WALLETS',
        tone: 'sky',
        items: [
          {
            key: 'fin-wallets',
            label: 'Wallets & Payouts',
            path: '/finance/wallets',
            icon: Wallet,
            tone: 'sky',
          },
        ],
      },
      {
        title: 'CONTROLS',
        tone: 'rose',
        items: [
          {
            key: 'fin-holds',
            label: 'Payout Holds',
            path: '/finance/holds',
            icon: AlertTriangle,
            tone: 'rose',
          },
        ],
      },
      {
        title: 'REPORTING',
        tone: 'amber',
        items: [
          {
            key: 'fin-invoices',
            label: 'Invoices',
            path: '/finance/invoices',
            icon: Receipt,
            tone: 'amber',
          },
          {
            key: 'fin-statements',
            label: 'Statements',
            path: '/finance/statements',
            icon: FileText,
            tone: 'amber',
          },
          {
            key: 'fin-tax',
            label: 'Tax Reports',
            path: '/finance/tax-reports',
            icon: Receipt,
            tone: 'amber',
          },
        ],
      },
    ];
  }, []);
}

function useDesksNav(): ShellGroup[] {
  return useMemo(() => {
    return [
      {
        title: 'OVERVIEW',
        tone: 'emerald',
        items: [
          {
            key: 'desk-home',
            label: 'Desks Home',
            path: '/regulatory',
            icon: ShieldCheck,
            tone: 'emerald',
          },
          // Optional entry point for the desk overview page
          {
            key: 'desk-health-overview',
            label: 'HealthMart Desk',
            path: '/regulatory/healthmart',
            icon: ShieldCheck,
            tone: 'emerald',
          },
        ],
      },
      {
        // Requirement: group title must be HEALTHMART DESK
        title: 'HEALTHMART DESK',
        tone: 'sky',
        // Requirement: remove the HealthMart item under this group
        items: [
          {
            key: 'desk-health-log',
            label: 'Logistics',
            path: '/regulatory/healthmart/logistics',
            icon: Truck,
            tone: 'sky',
          },
          {
            key: 'desk-health-pharm',
            label: 'Pharmacy',
            path: '/regulatory/healthmart/pharmacy',
            icon: Package,
            tone: 'sky',
          },
          {
            key: 'desk-health-eq',
            label: 'Equipment',
            path: '/regulatory/healthmart/equipment',
            icon: Boxes,
            tone: 'sky',
          },
        ],
      },
      {
        title: 'OTHER DESKS',
        tone: 'slate',
        items: [
          {
            key: 'desk-edu',
            label: 'EduMart Desk',
            path: '/regulatory/edumart',
            icon: Building2,
            tone: 'slate',
          },
          {
            key: 'desk-faith',
            label: 'FaithMart Desk',
            path: '/regulatory/faithmart',
            icon: Users2,
            tone: 'slate',
          },
        ],
      },
    ];
  }, []);
}

function useSettingsNav(): ShellGroup[] {
  return useMemo(() => {
    return [
      {
        title: 'OVERVIEW',
        tone: 'emerald',
        items: [
          {
            key: 'settings-home',
            label: 'Settings Overview',
            path: '/settings',
            icon: Settings,
            tone: 'emerald',
          },
        ],
      },
      {
        title: 'ACCOUNT',
        tone: 'slate',
        items: [
          {
            key: 'settings-profile',
            label: 'Profile & Storefront',
            path: '/settings/profile',
            icon: Store,
            tone: 'slate',
          },
          {
            key: 'settings-kyc',
            label: 'KYC / KYB',
            path: '/settings/kyc',
            icon: ShieldCheck,
            tone: 'amber',
          },
          {
            key: 'settings-teams',
            label: 'Teams & Roles',
            path: '/settings/teams',
            icon: Users,
            tone: 'sky',
          },
        ],
      },
      {
        title: 'PAYOUTS & TAX',
        tone: 'amber',
        items: [
          {
            key: 'settings-payout-methods',
            label: 'Payout Methods',
            path: '/settings/payout-methods',
            icon: CreditCard,
            tone: 'amber',
          },
          {
            key: 'settings-tax',
            label: 'Tax Hub',
            path: '/settings/tax',
            icon: Receipt,
            tone: 'amber',
          },
        ],
      },
      {
        title: 'PREFERENCES',
        tone: 'sky',
        items: [
          {
            key: 'settings-preferences',
            label: 'Preferences',
            path: '/settings/preferences',
            icon: SlidersHorizontal,
            tone: 'sky',
          },
          {
            key: 'settings-notification-preferences',
            label: 'Notification Preferences',
            path: '/settings/notification-preferences',
            icon: Bell,
            tone: 'sky',
          },
        ],
      },
      {
        title: 'SECURITY',
        tone: 'rose',
        items: [
          {
            key: 'settings-security',
            label: 'Security',
            path: '/settings/security',
            icon: KeyRound,
            tone: 'rose',
          },
          {
            key: 'settings-audit',
            label: 'Audit Log',
            path: '/settings/audit',
            icon: FileText,
            tone: 'rose',
          },
        ],
      },
      {
        title: 'TOOLS',
        tone: 'violet',
        items: [
          {
            key: 'settings-integrations',
            label: 'Integrations',
            path: '/settings/integrations',
            icon: Link2,
            tone: 'violet',
          },
          {
            key: 'settings-saved-views',
            label: 'Saved Views',
            path: '/settings/saved-views',
            icon: Bookmark,
            tone: 'slate',
          },
          {
            key: 'settings-templates',
            label: 'Templates Hub',
            path: '/templates',
            icon: Bookmark,
            tone: 'violet',
          },
        ],
      },
      {
        title: 'TRUST',
        tone: 'emerald',
        items: [
          {
            key: 'settings-status-center',
            label: 'Status Center',
            path: '/status-center',
            icon: ShieldCheck,
            tone: 'emerald',
          },
        ],
      },
    ];
  }, []);
}

function useSupportNav(): ShellGroup[] {
  return useMemo(() => {
    return [
      {
        title: 'HELP',
        tone: 'emerald',
        items: [
          {
            key: 'support-home',
            label: 'Support Center',
            path: '/support',
            icon: HelpCircle,
            tone: 'emerald',
          },
        ],
      },
      {
        title: 'SYSTEM',
        tone: 'slate',
        items: [
          {
            key: 'support-status',
            label: 'System Status',
            path: '/support/status',
            icon: WifiOff,
            tone: 'amber',
          },
          {
            key: 'support-changelog',
            label: 'Changelog',
            path: '/support/changelog',
            icon: FileText,
            tone: 'slate',
          },
        ],
      },
    ];
  }, []);
}

function MobileBottomNav({
  role,
  shellKey,
  path,
  navigate,
  onOpenCreate,
  onOpenMenu,
  themeMode,
}: {
  role: Role;
  shellKey: ShellKey;
  path: string;
  navigate: (to: string) => void;
  onOpenCreate: () => void;
  onOpenMenu: () => void;
  themeMode: ThemeMode;
}) {
  const accent: Accent = shellKey === 'mldz' ? 'orange' : 'green';
  const isDark = themeMode === 'dark';

  const items = useMemo(() => {
    if (shellKey === 'mldz') {
      return [
        { key: 'feed', label: 'Feed', icon: Flame, to: '/mldz/feed' },
        { key: 'live', label: 'Live', icon: Video, to: '/mldz/live/schedule' },
        { key: 'create', label: 'Create', icon: Plus, to: '__create__' },
        { key: 'adz', label: 'Adz', icon: Wand2, to: '/mldz/adz/dashboard' },
        { key: 'menu', label: 'Menu', icon: Menu, to: '__menu__' },
      ];
    }
    if (shellKey === 'wholesale') {
      return [
        { key: 'home', label: 'Home', icon: Building2, to: '/wholesale' },
        { key: 'rfq', label: 'RFQs', icon: FileText, to: '/wholesale/rfq' },
        { key: 'create', label: 'Create', icon: Plus, to: '__create__' },
        { key: 'quotes', label: 'Quotes', icon: FileText, to: '/wholesale/quotes' },
        { key: 'menu', label: 'Menu', icon: Menu, to: '__menu__' },
      ];
    }
    if (shellKey === 'ops') {
      return [
        { key: 'home', label: 'Ops', icon: Truck, to: '/ops' },
        { key: 'warehouses', label: 'Warehouses', icon: Building2, to: '/ops/warehouses' },
        { key: 'create', label: 'Create', icon: Plus, to: '__create__' },
        { key: 'cases', label: 'Disputes', icon: ShieldCheck, to: '/ops/disputes' },
        { key: 'menu', label: 'Menu', icon: Menu, to: '__menu__' },
      ];
    }
    if (shellKey === 'finance') {
      return [
        { key: 'home', label: 'Finance', icon: Wallet, to: '/finance' },
        { key: 'wallets', label: 'Wallets', icon: Wallet, to: '/finance/wallets' },
        { key: 'holds', label: 'Holds', icon: AlertTriangle, to: '/finance/holds' },
        { key: 'reports', label: 'Reports', icon: Receipt, to: '/finance/invoices' },
        { key: 'menu', label: 'Menu', icon: Menu, to: '__menu__' },
      ];
    }
    if (shellKey === 'desks') {
      return [
        { key: 'home', label: 'Desks', icon: ShieldCheck, to: '/regulatory' },
        { key: 'health', label: 'Health', icon: Truck, to: '/regulatory/healthmart/logistics' },
        { key: 'edu', label: 'Edu', icon: Building2, to: '/regulatory/edumart' },
        { key: 'faith', label: 'Faith', icon: Users2, to: '/regulatory/faithmart' },
        { key: 'menu', label: 'Menu', icon: Menu, to: '__menu__' },
      ];
    }

    if (shellKey === 'settings') {
      return [
        { key: 'home', label: 'Settings', icon: Settings, to: '/settings' },
        { key: 'security', label: 'Security', icon: KeyRound, to: '/settings/security' },
        { key: 'create', label: 'Create', icon: Plus, to: '__create__' },
        { key: 'status', label: 'Status', icon: ShieldCheck, to: '/status-center' },
        { key: 'menu', label: 'Menu', icon: Menu, to: '__menu__' },
      ];
    }

    if (shellKey === 'support') {
      return [
        { key: 'help', label: 'Help', icon: HelpCircle, to: '/support' },
        { key: 'status', label: 'Status', icon: WifiOff, to: '/support/status' },
        { key: 'create', label: 'Create', icon: Plus, to: '__create__' },
        { key: 'updates', label: 'Updates', icon: FileText, to: '/support/changelog' },
        { key: 'menu', label: 'Menu', icon: Menu, to: '__menu__' },
      ];
    }

    // core
    const second = role === 'seller' ? '/orders' : '/provider/bookings';
    const secondLabel = role === 'seller' ? 'Orders' : 'Bookings';
    const secondIcon = role === 'seller' ? Package : ClipboardList;

    return [
      { key: 'home', label: 'Home', icon: Home, to: '/dashboard' },
      { key: 'second', label: secondLabel, icon: secondIcon, to: second },
      { key: 'create', label: 'Create', icon: Plus, to: '__create__' },
      { key: 'mldz', label: 'MyLiveDealz', icon: Flame, to: '/mldz/feed' },
      { key: 'menu', label: 'Menu', icon: Menu, to: '__menu__' },
    ];
  }, [shellKey, role]);

  const activeCls =
    accent === 'orange'
      ? isDark
        ? 'bg-orange-900/35 text-orange-200'
        : 'bg-orange-50 text-orange-800'
      : isDark
        ? 'bg-emerald-900/35 text-emerald-200'
        : 'bg-emerald-50 text-emerald-800';
  const activeBorder =
    accent === 'orange'
      ? isDark
        ? 'border-orange-700/70'
        : 'border-orange-200'
      : isDark
        ? 'border-emerald-700/70'
        : 'border-emerald-200';
  const activeIcon =
    accent === 'orange'
      ? isDark
        ? 'text-orange-300'
        : 'text-orange-700'
      : isDark
        ? 'text-emerald-300'
        : 'text-emerald-700';

  return (
    <div
      className={cx(
        'fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur lg:hidden',
        isDark ? 'border-slate-700/80 bg-slate-950/95' : 'border-slate-200/70 bg-white dark:bg-slate-900/80'
      )}
    >
      <div className="w-full grid grid-cols-5 gap-1 px-2 py-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active =
            it.to !== '__create__' && it.to !== '__menu__' && isActivePath(path, it.to);

          return (
            <button
              key={it.key}
              type="button"
              onClick={() => {
                if (it.to === '__create__') return onOpenCreate();
                if (it.to === '__menu__') return onOpenMenu();
                navigate(it.to);
              }}
              className={cx(
                'relative flex flex-col items-center justify-center gap-1 rounded-3xl px-2 py-2 text-[10px] font-extrabold transition',
                active ? activeCls : isDark ? 'text-slate-400 hover:bg-slate-800/70' : 'text-slate-600 hover:bg-slate-100/70'
              )}
            >
              <span
                className={cx(
                  'grid h-10 w-10 place-items-center rounded-2xl border transition',
                  it.key === 'create'
                    ? cx(activeBorder, isDark ? 'bg-slate-900' : 'bg-white dark:bg-slate-900')
                    : active
                      ? cx(activeBorder, isDark ? 'bg-slate-900' : 'bg-white dark:bg-slate-900')
                      : isDark
                        ? 'border-slate-700/70 bg-slate-900'
                        : 'border-slate-200/70 bg-white dark:bg-slate-900'
                )}
                style={
                  it.key === 'create'
                    ? {
                        boxShadow:
                          accent === 'orange'
                            ? `0 18px 40px rgba(247,127,0,0.18)`
                            : `0 18px 40px rgba(3,205,140,0.18)`,
                      }
                    : undefined
                }
              >
                <Icon
                  className={cx(
                    'h-4 w-4',
                    it.key === 'create' ? activeIcon : active ? activeIcon : isDark ? 'text-slate-300' : 'text-slate-700'
                  )}
                />
              </span>
              <span className="truncate">{it.label}</span>
              {active && (
                <span
                  className={cx(
                    'absolute -top-0.5 h-1.5 w-1.5 rounded-full',
                    accent === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type AppShellProps = {
  children?: React.ReactNode;
  sidebarRef?: React.RefObject<HTMLDivElement>;
  onSidebarScroll?: (value: number) => void;
};

export default function EVzoneSupplierHubAppShellV9({
  children,
  sidebarRef,
  onSidebarScroll,
}: AppShellProps) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const path = location.pathname || '/dashboard';

  const session = useSession();
  const role = getCurrentRole(session);
  const setRole = useCallback(
    (next: Role) => {
      const current = readSession() || {};
      const currentRoles = Array.isArray(current.roles) ? current.roles.slice() : [];
      const nextRoles =
        next === 'provider'
          ? Array.from(new Set([...currentRoles.filter((r) => r !== 'seller'), 'provider']))
          : currentRoles.filter((r) => r !== 'provider');
      updateSession({ role: next, roles: nextRoles as Role[] });
    },
    []
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { resolvedMode: themeMode, toggleMode: toggleThemeMode } = useThemeMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shellMenuOpen, setShellMenuOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const shellContentRef = useRef<HTMLDivElement | null>(null);
  const { language, setLanguage, currency, setCurrency, languageOptions } = useLocalization();

  const shellKey = getShellKey(path);

  const prefetchedRef = useRef<Set<string>>(new Set());

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = makeId('toast');
    const next: Toast = { id, ...t };
    setToasts((s) => [next, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  }, []);
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [audit, setAudit] = useState<AuditEvent[]>(() => lsGet<AuditEvent[]>(LS_KEYS.AUDIT, []));
  useEffect(() => lsSet(LS_KEYS.AUDIT, audit), [audit]);
  const logAudit = useCallback((e: Omit<AuditEvent, 'id' | 'at'>) => {
    setAudit((s) => [{ id: makeId('audit'), at: nowIso(), ...e }, ...s].slice(0, 200));
  }, []);

  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    const existing = lsGet<SavedView[]>(LS_KEYS.SAVED_VIEWS, []);
    if (existing.length) return existing;
    return [
      {
        id: makeId('view'),
        name: 'Wholesale RFQs: last 7 days · urgent',
        route: '/wholesale/rfq',
        group: 'RFQs',
        pinned: true,
        note: 'Quick access view',
      },
    ];
  });
  useEffect(() => lsSet(LS_KEYS.SAVED_VIEWS, savedViews), [savedViews]);
  const saveView = useCallback((v: Omit<SavedView, 'id'>) => {
    setSavedViews((s) => [{ id: makeId('view'), ...v }, ...s].slice(0, 30));
  }, []);

  const [favorites, setFavorites] = useMockState<string[]>(
    'shell.favorites',
    lsGet<string[]>(LS_KEYS.FAVORITES, [])
  );
  const isFavorite = favorites.includes(path);
  const toggleFavorite = () => {
    setFavorites((s) => {
      const next = s.includes(path) ? s.filter((p) => p !== path) : [path, ...s];
      pushToast({
        title: s.includes(path) ? 'Removed from favorites' : 'Added to favorites',
        tone: 'default',
      });
      return next.slice(0, 40);
    });
  };

  const [recents, setRecents] = useState<string[]>(() => lsGet<string[]>(LS_KEYS.RECENTS, []));
  useEffect(() => lsSet(LS_KEYS.RECENTS, recents), [recents]);

  useEffect(() => {
    const raw = location.hash?.replace(/^#/, '');
    if (!raw || !raw.startsWith('/')) return;
    const idx = raw.indexOf('?');
    const hashPath = idx >= 0 ? raw.slice(0, idx) : raw;
    const hashQuery = idx >= 0 ? raw.slice(idx + 1) : '';
    if (!hashPath) return;
    const next = hashQuery ? `${hashPath}?${hashQuery}` : hashPath;
    const current = `${location.pathname}${location.search}`;
    if (next !== current) {
      routerNavigate(next, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, routerNavigate]);

  const navigate = useCallback(
    (to: string) => {
      const cleaned = to.startsWith('/') ? to : `/${to}`;
      if (getShellKey(cleaned) !== 'core') {
        setSecondarySidebarOpen(true);
      }
      setRecents((s) => [cleaned, ...s.filter((x) => x !== cleaned)].slice(0, 20));
      routerNavigate(cleaned);
      setShellMenuOpen(false);
    },
    [routerNavigate]
  );

  const prefetch = useCallback((to: string) => {
    const cleaned = to.startsWith('/') ? to : `/${to}`;
    prefetchedRef.current.add(cleaned);
  }, []);

  // Ctrl/Cmd + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const notificationsContent = useMemo(() => getPageContentByRole('notifications', role), [role]);
  const [notifItems, setNotifItems] = useState<NotifItem[]>(() => notificationsContent.items);
  useEffect(() => {
    setNotifItems(notificationsContent.items);
  }, [notificationsContent]);
  const notifCategories = notificationsContent.categories;

  const unreadNotifs = useMemo(() => notifItems.filter((n) => n.unread).length, [notifItems]);
  const notifBadgeCount = useMemo(
    () => (unreadNotifs > 0 ? unreadNotifs : notifItems.length),
    [unreadNotifs, notifItems]
  );
  const unreadMessages = useMemo(() => {
    const content = getPageContentByRole('messages', role);
    return content.threads.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0);
  }, [role]);
  const ordersContent = useMemo(() => getPageContentByRole('orders', role), [role]);
  const ordersCount = ordersContent.orders?.length ?? 0;
  const bookingsCount = ordersContent.bookings?.length ?? 0;
  const reviewsCount = useMemo(() => {
    if (role === 'provider') {
      const providerReviews = lsGet<Array<unknown>>('provider.reviews', []);
      return providerReviews.length || 6;
    }
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('seller.reviews.count') : null;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 21;
  }, [role, path]);

  const supplierNav = useSupplierNav(role, {
    messages: unreadMessages,
    notifications: notifBadgeCount,
    orders: ordersCount,
    bookings: bookingsCount,
    reviews: reviewsCount,
  });
  const mldzNav = useMldzNav();
  const wholesaleNav = useWholesaleNav();
  const opsNav = useOpsNav();
  const financeNav = useFinanceNav();
  const desksNav = useDesksNav();
  const settingsNav = useSettingsNav();
  const supportNav = useSupportNav();

  const index = useMemo(
    () =>
      buildSearchIndex(
        supplierNav,
        mldzNav,
        wholesaleNav,
        opsNav,
        financeNav,
        desksNav,
        settingsNav,
        supportNav,
        role
      ),
    [
      supplierNav,
      mldzNav,
      wholesaleNav,
      opsNav,
      financeNav,
      desksNav,
      settingsNav,
      supportNav,
      role,
    ]
  );

  // Provider redirect: keep provider off seller-only areas
  useEffect(() => {
    if (role !== 'provider') return;
    const providerSharedListings = [
      '/listings/wizard',
      '/listings/form-preview',
      '/listings/taxonomy',
      '/listings/new',
    ];
    const isSharedListingRoute = providerSharedListings.some((p) => path.startsWith(p));
    if (
      path === '/orders' ||
      path.startsWith('/wholesale') ||
      path.startsWith('/expressmart') ||
      (path.startsWith('/listings') && !isSharedListingRoute)
    ) {
      navigate('/provider/service-command');
    }
  }, [role, path, navigate]);

  const openContextMenu = () => {
    if (shellKey === 'core') setMobileMenuOpen(true);
    else setShellMenuOpen(true);
  };

  const favoritesIndexItems = useMemo(() => {
    const set = new Set(favorites);
    return index.filter((it) => it.type === 'route' && it.route && set.has(it.route));
  }, [index, favorites]);

  const recentsIndexItems = useMemo(() => {
    const set = new Set(recents);
    const ordered = recents
      .map((p) => index.find((it) => it.type === 'route' && it.route === p))
      .filter(Boolean) as SearchIndexItem[];
    const missing = index.filter(
      (it) =>
        it.type === 'route' && it.route && set.has(it.route) && !ordered.find((o) => o.id === it.id)
    );
    return [...ordered, ...missing].slice(0, 12);
  }, [index, recents]);

  const runCommand = (item: SearchIndexItem) => {
    if (item.type === 'route' && item.route) {
      navigate(item.route);
      setCommandOpen(false);
      return;
    }
    if (item.type === 'view' && item.route) {
      navigate(item.route);
      setCommandOpen(false);
      return;
    }
    if (item.type === 'action' && item.actionKey) {
      switch (item.actionKey) {
        case 'open_notifs':
          setNotifsOpen(true);
          setCommandOpen(false);
          return;
        case 'open_status':
          navigate('/status-center');
          setCommandOpen(false);
          return;
        case 'open_create':
          setQuickCreateOpen(true);
          setCommandOpen(false);
          return;
        default:
          break;
      }
    }
  };

  const defaultShellHeaderBg =
    themeMode === 'dark' ? 'rgba(2,6,23,0.96)' : 'rgba(255,255,255,0.85)';
  const defaultShellHeaderText = themeMode === 'dark' ? 'text-slate-100' : 'text-slate-800';

  // Shell-specific crumbs + subnav
  const { shellCrumbs, shellSubnav, shellConfig } = useMemo(() => {
    if (shellKey === 'mldz') {
      const base = { label: 'MyLiveDealz', path: '/mldz/feed' };
      return {
        shellCrumbs: buildShellBreadcrumbs(base, path, mldzNav),
        shellSubnav: subnavFromGroups(path, mldzNav),
        shellConfig: {
          title: 'MyLiveDealz',
          subtitle: 'Live Sessionz, Shoppable Adz, deliverables and collaboration flows',
          accent: 'orange' as Accent,
          headerBg: TOKENS.black,
          headerText: 'text-white',
          badge: { text: 'Promo', tone: 'orange' as const },
          icon: Flame,
          groups: mldzNav,
        },
      };
    }
    if (shellKey === 'wholesale') {
      const base = { label: 'Wholesale', path: '/wholesale' };
      return {
        shellCrumbs: buildShellBreadcrumbs(base, path, wholesaleNav),
        shellSubnav: subnavFromGroups(path, wholesaleNav),
        shellConfig: {
          title: 'Wholesale',
          subtitle: 'RFQs, quotes, price lists and B2B workflows',
          accent: 'green' as Accent,
          headerBg: defaultShellHeaderBg,
          headerText: defaultShellHeaderText,
          badge: { text: 'B2B', tone: 'slate' as const },
          icon: Building2,
          groups: wholesaleNav,
        },
      };
    }
    if (shellKey === 'ops') {
      const base = { label: 'Ops Center', path: '/ops' };
      return {
        shellCrumbs: buildShellBreadcrumbs(base, path, opsNav),
        shellSubnav: subnavFromGroups(path, opsNav),
        shellConfig: {
          title: 'Ops Center',
          subtitle: 'Fulfillment, inventory, returns, disputes, documents and compliance',
          accent: 'green' as Accent,
          headerBg: defaultShellHeaderBg,
          headerText: defaultShellHeaderText,
          badge: { text: 'Ops', tone: 'slate' as const },
          icon: Truck,
          groups: opsNav,
        },
      };
    }
    if (shellKey === 'finance') {
      const base = { label: 'Finance', path: '/finance' };
      return {
        shellCrumbs: buildShellBreadcrumbs(base, path, financeNav),
        shellSubnav: subnavFromGroups(path, financeNav),
        shellConfig: {
          title: 'Finance',
          subtitle: 'Wallets, payouts, holds and reports',
          accent: 'green' as Accent,
          headerBg: defaultShellHeaderBg,
          headerText: defaultShellHeaderText,
          badge: { text: 'Trust', tone: 'green' as const },
          icon: Wallet,
          groups: financeNav,
        },
      };
    }
    if (shellKey === 'desks') {
      const base = { label: 'Regulatory Desks', path: '/regulatory' };
      return {
        shellCrumbs: buildShellBreadcrumbs(base, path, desksNav),
        shellSubnav: subnavFromGroups(path, desksNav),
        shellConfig: {
          title: 'Regulatory Desks',
          subtitle: 'HealthMart, EduMart and FaithMart compliance workflows',
          accent: 'green' as Accent,
          headerBg: defaultShellHeaderBg,
          headerText: defaultShellHeaderText,
          badge: { text: 'Compliance', tone: 'slate' as const },
          icon: ShieldCheck,
          groups: desksNav,
        },
      };
    }

    if (shellKey === 'settings') {
      const base = { label: 'Settings', path: '/settings' };
      return {
        shellCrumbs: buildShellBreadcrumbs(base, path, settingsNav),
        shellSubnav: subnavFromGroups(path, settingsNav),
        shellConfig: {
          title: 'Settings',
          subtitle: 'Profile, verification, payouts, preferences and security',
          accent: 'green' as Accent,
          headerBg: defaultShellHeaderBg,
          headerText: defaultShellHeaderText,
          badge: { text: 'Account', tone: 'slate' as const },
          icon: Settings,
          groups: settingsNav,
        },
      };
    }

    if (shellKey === 'support') {
      const base = { label: 'Support', path: '/support' };
      return {
        shellCrumbs: buildShellBreadcrumbs(base, path, supportNav),
        shellSubnav: subnavFromGroups(path, supportNav),
        shellConfig: {
          title: 'Support',
          subtitle: 'Help center, system status and product updates',
          accent: 'green' as Accent,
          headerBg: defaultShellHeaderBg,
          headerText: defaultShellHeaderText,
          badge: { text: 'Help', tone: 'slate' as const },
          icon: HelpCircle,
          groups: supportNav,
        },
      };
    }

    // core
    return {
      shellCrumbs: [
        { label: 'SupplierHub', path: '/dashboard' },
        { label: formatTitleFromPath(path) },
      ],
      shellSubnav: [] as Array<{ label: string; path: string }>,
      shellConfig: null as ShellConfig | null,
    };
  }, [
    shellKey,
    path,
    themeMode,
    defaultShellHeaderBg,
    defaultShellHeaderText,
    mldzNav,
    wholesaleNav,
    opsNav,
    financeNav,
    desksNav,
    settingsNav,
    supportNav,
  ]);

  const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(false);
  const prevShellKeyRef = useRef<ShellKey | null>(null);
  const prevSecondarySidebarOpenRef = useRef(false);

  useEffect(() => {
    if (!shellConfig) {
      setSecondarySidebarOpen(false);
      prevShellKeyRef.current = shellKey;
      return;
    }
    if (prevShellKeyRef.current !== shellKey) {
      setSecondarySidebarOpen(true);
    }
    prevShellKeyRef.current = shellKey;
  }, [shellKey, shellConfig]);

  const closeSecondarySidebar = useCallback(() => {
    setSecondarySidebarOpen(false);
  }, []);

  // The dashboard home should always show the main sidebar expanded and no secondary rail.
  useEffect(() => {
    if (path !== '/dashboard') return;
    setSecondarySidebarOpen(false);
    setSidebarCollapsed(false);
  }, [path]);

  // Collapse primary once when secondary opens; user can reopen primary manually anytime.
  useEffect(() => {
    if (secondarySidebarOpen && !prevSecondarySidebarOpenRef.current) {
      setSidebarCollapsed(true);
    }
    prevSecondarySidebarOpenRef.current = secondarySidebarOpen;
  }, [secondarySidebarOpen]);

  const shellCards = useMemo(() => {
    if (!shellConfig) return [];

    if (shellKey === 'mldz') {
      return [
        {
          title: 'Live Sessionz',
          subtitle: 'Dashboard, schedule, studio and replays',
          icon: Video,
          badge: { text: 'Realtime', tone: 'orange' as const },
          actions: [
            { label: 'Live Dashboard', to: '/mldz/live/dashboard', accent: 'orange' as Accent },
            { label: 'Live Schedule', to: '/mldz/live/schedule', accent: 'orange' as Accent },
            {
              label: 'Live Studio',
              to: '/mldz/live/studio',
              accent: 'orange' as Accent,
              primary: true,
            },
          ],
        },
        {
          title: 'Shoppable Adz',
          subtitle: 'Create Adz, manage placements and performance',
          icon: Wand2,
          badge: { text: 'Conversion', tone: 'orange' as const },
          actions: [
            { label: 'Adz Dashboard', to: '/mldz/adz/dashboard', accent: 'orange' as Accent },
            { label: 'Adz Marketplace', to: '/mldz/adz/marketplace', accent: 'orange' as Accent },
            {
              label: 'Adz Manager',
              to: '/mldz/adz/manager',
              accent: 'orange' as Accent,
              primary: true,
            },
          ],
        },
      ];
    }

    if (shellKey === 'wholesale') {
      return [
        {
          title: 'RFQ Inbox',
          subtitle: 'Respond faster with templates and negotiation history',
          icon: FileText,
          badge: { text: 'B2B', tone: 'slate' as const },
          actions: [
            { label: 'Open RFQs', to: '/wholesale/rfq', accent: 'green' as Accent, primary: true },
            { label: 'Price Lists', to: '/wholesale/price-lists', accent: 'green' as Accent },
            { label: 'Quotes', to: '/wholesale/quotes', accent: 'green' as Accent },
          ],
        },
        {
          title: 'Tools',
          subtitle: 'Templates and Incoterms',
          icon: Bookmark,
          badge: { text: 'Pro', tone: 'green' as const },
          actions: [
            {
              label: 'Templates',
              to: '/wholesale/templates',
              accent: 'green' as Accent,
              primary: true,
            },
            { label: 'Incoterms', to: '/wholesale/incoterms', accent: 'green' as Accent },
          ],
        },
      ];
    }

    if (shellKey === 'ops') {
      return [
        {
          title: 'Fulfillment',
          subtitle: 'Shipping profiles and warehouses',
          icon: Truck,
          badge: { text: 'Ops', tone: 'slate' as const },
          actions: [
            { label: 'Shipping', to: '/ops/shipping-profiles', accent: 'green' as Accent },
            {
              label: 'Warehouses',
              to: '/ops/warehouses',
              accent: 'green' as Accent,
              primary: true,
            },
          ],
        },
        {
          title: 'Cases',
          subtitle: 'Returns and disputes',
          icon: ShieldCheck,
          badge: { text: 'Risk', tone: 'orange' as const },
          actions: [
            { label: 'Returns', to: '/ops/returns', accent: 'green' as Accent },
            { label: 'Disputes', to: '/ops/disputes', accent: 'green' as Accent, primary: true },
          ],
        },
      ];
    }

    if (shellKey === 'finance') {
      return [
        {
          title: 'Wallets & Payouts',
          subtitle: 'Balances, transactions and schedules',
          icon: Wallet,
          badge: { text: 'Bank', tone: 'slate' as const },
          actions: [
            { label: 'Wallets', to: '/finance/wallets', accent: 'green' as Accent, primary: true },
            { label: 'Holds', to: '/finance/holds', accent: 'green' as Accent },
          ],
        },
        {
          title: 'Reporting',
          subtitle: 'Invoices, statements and tax',
          icon: Receipt,
          badge: { text: 'Reports', tone: 'slate' as const },
          actions: [
            { label: 'Invoices', to: '/finance/invoices', accent: 'green' as Accent },
            { label: 'Statements', to: '/finance/statements', accent: 'green' as Accent },
            {
              label: 'Tax Reports',
              to: '/finance/tax-reports',
              accent: 'green' as Accent,
              primary: true,
            },
          ],
        },
      ];
    }

    if (shellKey === 'desks') {
      return [
        {
          title: 'HealthMart Desk',
          subtitle: 'Logistics, Pharmacy, Equipment',
          icon: ShieldCheck,
          badge: { text: 'Regulated', tone: 'orange' as const },
          actions: [
            {
              label: 'Logistics',
              to: '/regulatory/healthmart/logistics',
              accent: 'green' as Accent,
            },
            { label: 'Pharmacy', to: '/regulatory/healthmart/pharmacy', accent: 'green' as Accent },
            {
              label: 'Equipment',
              to: '/regulatory/healthmart/equipment',
              accent: 'green' as Accent,
              primary: true,
            },
          ],
        },
        {
          title: 'Other Desks',
          subtitle: 'Education and Faith workflows',
          icon: Users2,
          badge: { text: 'Policies', tone: 'slate' as const },
          actions: [
            { label: 'EduMart', to: '/regulatory/edumart', accent: 'green' as Accent },
            {
              label: 'FaithMart',
              to: '/regulatory/faithmart',
              accent: 'green' as Accent,
              primary: true,
            },
          ],
        },
      ];
    }

    if (shellKey === 'settings') {
      return [
        {
          title: 'Account Setup',
          subtitle: 'Profile, verification and team access',
          icon: Settings,
          badge: { text: 'Account', tone: 'slate' as const },
          actions: [
            { label: 'Profile', to: '/settings/profile', accent: 'green' as Accent },
            { label: 'KYC / KYB', to: '/settings/kyc', accent: 'green' as Accent, primary: true },
            { label: 'Teams', to: '/settings/teams', accent: 'green' as Accent },
          ],
        },
        {
          title: 'Payouts & Tax',
          subtitle: 'Settlement methods, tax profiles and trust',
          icon: Receipt,
          badge: { text: 'Finance', tone: 'slate' as const },
          actions: [
            {
              label: 'Payout Methods',
              to: '/settings/payout-methods',
              accent: 'green' as Accent,
              primary: true,
            },
            { label: 'Tax Hub', to: '/settings/tax', accent: 'green' as Accent },
            { label: 'Status Center', to: '/status-center', accent: 'green' as Accent },
          ],
        },
        {
          title: 'Security & Tools',
          subtitle: 'Security, integrations, templates and audit',
          icon: KeyRound,
          badge: { text: 'Control', tone: 'orange' as const },
          actions: [
            {
              label: 'Security',
              to: '/settings/security',
              accent: 'green' as Accent,
              primary: true,
            },
            { label: 'Integrations', to: '/settings/integrations', accent: 'green' as Accent },
            { label: 'Templates', to: '/templates', accent: 'green' as Accent },
          ],
        },
      ];
    }

    if (shellKey === 'support') {
      return [
        {
          title: 'Support Center',
          subtitle: 'Help, status and product updates',
          icon: HelpCircle,
          badge: { text: 'Help', tone: 'slate' as const },
          actions: [
            { label: 'Open Support', to: '/support', accent: 'green' as Accent, primary: true },
            { label: 'System Status', to: '/support/status', accent: 'green' as Accent },
            { label: 'Changelog', to: '/support/changelog', accent: 'green' as Accent },
          ],
        },
      ];
    }

    return [];
  }, [shellKey, shellConfig]);

  const shellDrawerProps = useMemo(() => {
    if (!shellConfig) return null;
    return {
      title: shellConfig.title,
      badge: shellConfig.badge,
      headerBg: shellConfig.headerBg,
      headerText: shellConfig.headerText,
      icon: shellConfig.icon,
      groups: shellConfig.groups,
      accent: shellConfig.accent,
    };
  }, [shellConfig]);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          themeMode === 'dark'
            ? 'radial-gradient(1200px 500px at 18% -10%, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(45,212,191,0.06) 0%, rgba(45,212,191,0.0) 55%), linear-gradient(180deg, #0B1220 0%, #0A1020 45%, #0B1220 100%)'
            : 'radial-gradient(1200px 500px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(2,183,126,0.08) 0%, rgba(2,183,126,0.0) 55%), var(--page-gradient-base)',
      }}
    >
      <AppErrorBoundary>
        <div className="flex min-h-screen w-full min-w-0">
          <DesktopSidebar
            role={role}
            setRole={setRole}
            path={path}
            navigate={navigate}
            themeMode={themeMode}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            onOpenCreate={() => setQuickCreateOpen(true)}
            onPrefetch={prefetch}
            sidebarRef={sidebarRef}
            onSidebarScroll={onSidebarScroll}
            navBadges={{
              messages: unreadMessages,
              notifications: notifBadgeCount,
              orders: ordersCount,
              bookings: bookingsCount,
              reviews: reviewsCount,
            }}
          />

          <MobileDrawer
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            role={role}
            setRole={setRole}
            path={path}
            navigate={navigate}
            themeMode={themeMode}
            onOpenCreate={() => setQuickCreateOpen(true)}
            onPrefetch={prefetch}
            navBadges={{
              messages: unreadMessages,
              notifications: notifBadgeCount,
              orders: ordersCount,
              bookings: bookingsCount,
              reviews: reviewsCount,
            }}
          />

          {shellDrawerProps ? (
            <ShellMobileDrawer
              open={shellMenuOpen}
              onClose={() => setShellMenuOpen(false)}
              onBack={closeSecondarySidebar}
              title={shellDrawerProps.title}
              badge={shellDrawerProps.badge}
              headerBg={shellDrawerProps.headerBg}
              headerText={shellDrawerProps.headerText}
              icon={shellDrawerProps.icon}
              groups={shellDrawerProps.groups}
              accent={shellDrawerProps.accent}
              path={path}
              navigate={navigate}
              themeMode={themeMode}
            />
          ) : null}

          <div
            data-shell-main
            className="relative z-10 flex w-full min-w-0 flex-1 flex-col"
            style={
              {
                '--shell-sidebar-width': sidebarCollapsed
                  ? PRIMARY_SIDEBAR_COLLAPSED_WIDTH_FLUID
                  : PRIMARY_SIDEBAR_WIDTH_FLUID,
              } as React.CSSProperties
            }
          >
            <TopBar
              role={role}
              setRole={setRole}
              onOpenMenu={openContextMenu}
              onOpenCommand={() => setCommandOpen(true)}
              navigate={navigate}
              shellKey={shellKey}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
              favoritesCount={favorites.length}
              unreadNotifs={notifBadgeCount}
              unreadMessages={unreadMessages}
              language={language}
              setLanguage={setLanguage}
              languageOptions={languageOptions}
              currency={currency}
              setCurrency={setCurrency}
              themeMode={themeMode}
              onToggleTheme={toggleThemeMode}
              sidebarCollapsed={sidebarCollapsed}
            />
            <div aria-hidden className="h-[72px] md:h-[76px]" />

            <div data-shell-content ref={shellContentRef} className="flex-1 px-0 py-3 pb-24 md:px-0 md:py-5 lg:pb-8">
              {shellConfig && secondarySidebarOpen ? (
                <div className={cx('shell-container', sidebarCollapsed ? 'lg:pl-2' : 'lg:pl-8')}>
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,clamp(172px,18vw,236px))_minmax(0,1fr)] xl:grid-cols-[minmax(0,clamp(184px,18vw,248px))_minmax(0,1fr)]">
                    <div className="min-w-0 md:self-start md:sticky md:top-[84px]">
                      <div>
                        <ShellSidebarCard
                          title={shellConfig.title}
                          badge={shellConfig.badge}
                          headerBg={shellConfig.headerBg}
                          headerText={shellConfig.headerText}
                          icon={shellConfig.icon}
                          groups={shellConfig.groups}
                          accent={shellConfig.accent}
                          path={path}
                          themeMode={themeMode}
                          navigate={navigate}
                          onBack={closeSecondarySidebar}
                        />
                      </div>
                    </div>
                    <div className="min-w-0">{children}</div>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>

        <MobileBottomNav
          role={role}
          shellKey={shellKey}
          path={path}
          navigate={navigate}
          onOpenCreate={() => setQuickCreateOpen(true)}
          onOpenMenu={openContextMenu}
          themeMode={themeMode}
        />

        <QuickCreate
          open={quickCreateOpen}
          onClose={() => setQuickCreateOpen(false)}
          role={role}
          onNavigate={navigate}
        />

        <CommandPalette
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          themeMode={themeMode}
          index={index}
          recents={recentsIndexItems}
          favorites={favoritesIndexItems}
          savedViews={savedViews}
          onRun={runCommand}
        />

        <NotificationDrawer
          open={notifsOpen}
          onClose={() => setNotifsOpen(false)}
          items={notifItems}
          setItems={setNotifItems}
          categories={notifCategories}
          navigate={navigate}
          pushToast={pushToast}
        />

        <ToastCenter toasts={toasts} dismiss={dismissToast} />
      </AppErrorBoundary>
    </div>
  );
}
