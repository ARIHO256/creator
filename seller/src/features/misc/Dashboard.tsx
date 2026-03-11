import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bookmark,
  Boxes,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardList,
  CreditCard,
  Flame,
  Globe,
  Layers,
  Package,
  Plus,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  Tag,
  Truck,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRolePageContent } from '../../data/pageContent';
import type { DashboardQuickAction } from '../../data/pageTypes';
import type { UserRole } from '../../types/roles';
import { sellerBackendApi } from '../../lib/backendApi';

const TOKENS = {
  green: '#03CD8C',
  greenDeep: '#02B77E',
  orange: '#F77F00',
  blue: '#3B82F6',
  black: '#0B0F14',
};
const MIX_TREND_CARD_HEIGHT = 260;

type ViewFilters = {
  marketplaces: string[];
  warehouses: string[];
  channels: string[];
};

type CustomView = {
  id: string;
  name: string;
  range: string;
  filters: ViewFilters;
  custom?: { from: string; to: string };
};

type AskAnswer = { summary: string; drilldowns: Array<{ to: string; label: string }> };
type FilterToken = { key: string; label: string; tone: string; group: string; value?: string };
type AlertItem = {
  key: string;
  metric: string;
  level: string;
  valueLabel: string;
  deltaLabel: string;
  note: string;
  to: string;
  icon: React.ElementType;
};

type KpiFormat = 'money' | 'count' | 'percent' | 'rating';
type KpiVariant = 'light' | 'dark';
type KpiDrilldownBreakdown = { label: string; value: string; note?: string };
type KpiDrilldownAction = { label: string; to: string; icon: React.ElementType };
type KpiDrilldown = {
  headline: string;
  sub: string;
  breakdown: KpiDrilldownBreakdown[];
  actions: KpiDrilldownAction[];
};
type KpiInput = {
  id: string;
  label: string;
  format: KpiFormat;
  valueRaw: number;
  targetRaw: number;
  delta: number;
  variant: KpiVariant;
  stroke: string;
  seriesBase: number;
  drift: number;
  vol: number;
  seedAdd: number;
  drilldown: KpiDrilldown;
};
type Kpi = Omit<KpiInput, 'seriesBase' | 'drift' | 'vol' | 'seedAdd'> & { series: number[] };

type DonutTopItem = { label: string; value: string };
type DonutAction = { label: string; to: string; icon: React.ElementType };
type DonutSegment = {
  name: string;
  value: number;
  hint: string;
  to: string;
  top: DonutTopItem[];
  actions: DonutAction[];
};
type OpsStage = { key: string; label: string; count: number; sla: string; to: string };
type RiskItem = {
  key: string;
  label: string;
  score: number;
  count: number;
  hint: string;
  to: string;
};
type InventoryTopItem = { sku: string; note: string };
type InventoryItem = {
  key: string;
  label: string;
  count: number;
  hint: string;
  to: string;
  top: InventoryTopItem[];
};
type SettlementStage = {
  key: string;
  label: string;
  amount: number;
  date: string;
  hint: string;
  to: string;
};
type CashflowDay = { day: string; inflow: number; payout: number };
type FeeItem = { key: string; label: string; value: number; hint: string; to: string };

type DrawerState =
  | { kind: 'kpi'; kpi: Kpi }
  | { kind: 'donut'; seg: DonutSegment; currency: string }
  | { kind: 'ops'; stage: OpsStage }
  | { kind: 'risk'; item: RiskItem }
  | { kind: 'inventory'; item: InventoryItem }
  | { kind: 'settlement'; stage: SettlementStage; currency: string }
  | { kind: 'fee'; item: FeeItem; currency: string }
  | { kind: 'cashflow'; day: CashflowDay; currency: string };

type ChartComponent = React.ElementType;

const MARKETPLACE_OPTIONS = ['EVmart', 'GadgetMart', 'LivingMart', 'StyleMart', 'GeneralMart'];
const WAREHOUSE_OPTIONS = ['Warehouse A', 'Warehouse B', 'Preferred Warehouse'];
const CHANNEL_OPTIONS = ['Marketplace', 'MyLiveDealz', 'Wholesale', 'Social DM', 'Direct Calls'];

const PRESET_VIEWS: CustomView[] = [
  {
    id: 'all',
    name: 'All Channels',
    range: '7d',
    filters: { marketplaces: [], warehouses: [], channels: [] },
  },
  {
    id: 'mldz',
    name: 'MyLiveDealz Focus',
    range: '7d',
    filters: {
      marketplaces: ['EVmart'],
      warehouses: [],
      channels: ['MyLiveDealz'],
    },
  },
  {
    id: 'wholesale',
    name: 'Wholesale Focus',
    range: '30d',
    filters: {
      marketplaces: ['GeneralMart'],
      warehouses: ['Warehouse A'],
      channels: ['Wholesale'],
    },
  },
  {
    id: 'risk',
    name: 'At-Risk Ops',
    range: '7d',
    filters: {
      marketplaces: ['EVmart', 'GadgetMart'],
      warehouses: ['Warehouse A'],
      channels: ['Marketplace'],
    },
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(n) {
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(1)}%`;
}

function formatMoney(n, currency) {
  const sign = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
  const abs = Math.abs(n);
  const compact =
    abs >= 1_000_000
      ? `${(n / 1_000_000).toFixed(2)}M`
      : abs >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : `${n.toFixed(0)}`;
  if (currency === 'UGX' || currency === 'KES' || currency === 'NGN')
    return `${currency} ${compact}`;
  return `${sign}${compact}`;
}

function formatCount(n) {
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function formatPercent(n) {
  return `${Math.round(n)}%`;
}

function formatRating(n) {
  return n.toFixed(1);
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function hashStr(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function rand() {
    // eslint-disable-next-line no-param-reassign
    seed |= 0;
    // eslint-disable-next-line no-param-reassign
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSeries(points, base, drift, volatility, seed) {
  const rand = mulberry32(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < points; i += 1) {
    const noise = (rand() - 0.5) * volatility;
    v = v + drift + noise;
    out.push(Math.max(0, v));
  }
  return out;
}

function computeRangeMeta(range, customFrom, customTo) {
  const rangeScaleMap = {
    today: 0.18,
    '7d': 1,
    '30d': 4.2,
    ytd: 18,
    custom: 1,
  };

  const sparkPointsMap = { today: 8, '7d': 7, '30d': 10, ytd: 12, custom: 8 };
  const trendPointsMap = { today: 12, '7d': 7, '30d': 14, ytd: 12, custom: 10 };

  let customDays = 7;
  if (range === 'custom') {
    const from = new Date(customFrom || isoDaysAgo(7));
    const to = new Date(customTo || todayISO());
    const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    customDays = clamp(diff || 7, 1, 365);
  }

  const scale = range === 'custom' ? clamp(customDays / 7, 0.15, 30) : rangeScaleMap[range];
  const sparkPoints =
    range === 'custom' ? clamp(Math.round(customDays / 2), 6, 14) : sparkPointsMap[range];
  const trendPoints =
    range === 'custom' ? clamp(Math.round(customDays / 3), 8, 16) : trendPointsMap[range];

  const label =
    range === 'today'
      ? 'Today'
      : range === '7d'
        ? '7 days'
        : range === '30d'
          ? '30 days'
          : range === 'ytd'
            ? 'YTD'
            : 'Custom';

  return { scale, sparkPoints, trendPoints, label, customDays };
}

function computeFilterMeta(filters) {
  const mk = filters.marketplaces.length;
  const wh = filters.warehouses.length;
  const ch = filters.channels.length;

  let scale = 1 + mk * 0.045 + wh * 0.05 + ch * 0.055;

  const hasMLDZ = filters.channels.includes('MyLiveDealz');
  const hasWholesale = filters.channels.includes('Wholesale');
  const hasWarehouseA = filters.warehouses.includes('Warehouse A');

  if (hasMLDZ) scale += 0.12;
  if (hasWholesale) scale += 0.08;

  const riskBoost = clamp(
    (hasWarehouseA ? 0.18 : 0) + (filters.channels.includes('Marketplace') ? 0.08 : 0),
    0,
    0.35
  );

  return { scale, riskBoost, hasMLDZ, hasWholesale, hasWarehouseA };
}

function safeJsonParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function parseCommaList(v) {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isTimeRangeKey(v: string | null | undefined): v is string {
  return v === 'today' || v === '7d' || v === '30d' || v === 'ytd' || v === 'custom';
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
}

function stdev(arr) {
  const m = mean(arr);
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, arr.length);
  return Math.sqrt(v);
}

function getShareParamsFromLocation() {
  if (typeof window === 'undefined') return new URLSearchParams();
  const url = new URL(window.location.href);
  const out = new URLSearchParams(url.search);
  const hash = url.hash || '';
  const qIdx = hash.indexOf('?');
  if (qIdx >= 0) {
    const hashQuery = hash.slice(qIdx + 1);
    const hp = new URLSearchParams(hashQuery);
    hp.forEach((v, k) => out.set(k, v));
  }
  return out;
}

function formatKpiValue(kpi: Kpi, currency: string) {
  if (kpi.format === 'money') return formatMoney(kpi.valueRaw, currency);
  if (kpi.format === 'count') return formatCount(kpi.valueRaw);
  if (kpi.format === 'percent') return formatPercent(kpi.valueRaw);
  return formatRating(kpi.valueRaw);
}

function formatKpiTarget(kpi: Kpi, currency: string) {
  if (kpi.format === 'money') return formatMoney(kpi.targetRaw, currency);
  if (kpi.format === 'count') return formatCount(kpi.targetRaw);
  if (kpi.format === 'percent') return formatPercent(kpi.targetRaw);
  return formatRating(kpi.targetRaw);
}

function formatKpiRemaining(kpi: Kpi, currency: string) {
  const rem = kpi.targetRaw - kpi.valueRaw;
  const safe = rem <= 0 ? 0 : rem;
  if (kpi.format === 'money') return formatMoney(safe, currency);
  if (kpi.format === 'count') return formatCount(safe);
  if (kpi.format === 'percent') return formatPercent(safe);
  return formatRating(safe);
}

function Chip({ active, label, onClick, tone }) {
  const base = 'rounded-full px-3 py-2 text-[12px] font-extrabold transition whitespace-nowrap';
  const inactive = 'border border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800';

  const activeStyle =
    tone === 'orange'
      ? 'border border-white/10 bg-[rgba(247,127,0,0.14)] text-slate-900'
      : tone === 'slate'
        ? 'border border-slate-200/70 bg-slate-100 text-slate-900'
        : 'border border-white/10 bg-[rgba(3,205,140,0.18)] text-slate-900';

  return React.createElement(
    'button',
    { type: 'button', onClick: onClick, className: cx(base, active ? activeStyle : inactive) },
    label
  );
}

function FilterPill({ label, tone = 'slate', onRemove }) {
  const base =
    'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-extrabold';
  const style =
    tone === 'orange'
      ? 'border-orange-200/60 bg-orange-50 text-orange-900'
      : tone === 'green'
        ? 'border-emerald-200/60 bg-emerald-50 text-emerald-900'
        : 'border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100';

  return React.createElement(
    'button',
    { type: 'button', onClick: onRemove, className: cx(base, style) },
    React.createElement('span', { className: 'truncate' }, label),
    React.createElement(X, { className: 'h-3.5 w-3.5 opacity-70' })
  );
}

function ProgressLight({ label, value }) {
  const v = clamp(value, 0, 100);
  return React.createElement(
    'div',
    {},
    React.createElement(
      'div',
      { className: 'flex items-center justify-between text-[11px] font-extrabold text-slate-600' },
      React.createElement('span', {}, label),
      React.createElement('span', { className: 'text-slate-800' }, Math.round(v), '%')
    ),
    React.createElement(
      'div',
      { className: 'mt-1 h-2 rounded-full bg-slate-100' },
      React.createElement('div', {
        className: 'h-2 rounded-full',
        style: { width: `${v}%`, background: TOKENS.green },
      })
    )
  );
}

function StatusBadge({ status }) {
  const cls =
    status === 'Verified'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
      : status === 'Submitted'
        ? 'bg-sky-50 text-sky-700 border-sky-200/60'
        : status === 'In review'
          ? 'bg-amber-50 text-amber-800 border-amber-200/60'
          : 'bg-rose-50 text-rose-700 border-rose-200/60';
  return React.createElement(
    'span',
    {
      className: cx(
        'inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-extrabold',
        cls
      ),
    },
    status
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return React.createElement(
    'div',
    { className: 'fixed inset-0 z-[96] evz-no-print' },
    React.createElement('div', {
      className: 'fixed inset-0 bg-black/40 backdrop-blur-sm',
      onClick: onClose,
    }),
    React.createElement(
      'div',
      { className: 'fixed inset-0 flex items-center justify-center p-4' },
      React.createElement(
        'div',
        {
          className:
            'w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-[13px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-2xl',
        },
        React.createElement(
          'div',
          { className: 'flex items-start justify-between gap-3' },
          React.createElement(
            'div',
            {},
            React.createElement(
              'div',
              { className: 'text-[14px] font-black text-slate-900' },
              title
            ),
            React.createElement(
              'div',
              { className: 'mt-1 text-[12px] font-semibold text-slate-500' },
              'Save your current filters, range, and layout as a reusable view.'
            )
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: onClose,
              className:
                'grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950',
              'aria-label': 'Close',
            },

            React.createElement(X, { className: 'h-4 w-4' })
          )
        ),
        React.createElement('div', { className: 'mt-4' }, children)
      )
    )
  );
}

function Segmented({ value, onChange, options }) {
  return React.createElement(
    'div',
    { className: 'flex flex-wrap items-center gap-2' },
    options.map((o) =>
      React.createElement(
        'button',
        {
          key: o.key,
          type: 'button',
          onClick: () => onChange(o.key),
          className: cx(
            'rounded-full px-3 py-2 text-[12px] font-extrabold transition',
            value === o.key
              ? 'border border-white/10 bg-[rgba(3,205,140,0.18)] text-slate-900'
              : 'border border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
          ),
        },

        o.label
      )
    )
  );
}

function MiniSparkline({ data, stroke }) {
  const rows = data.map((v, i) => ({ i, v }));
  return React.createElement(
    'div',
    { className: 'h-[34px] w-[104px]' },
    React.createElement(
      ResponsiveContainer as ChartComponent,
      { width: '100%', height: '100%' },
      React.createElement(
        LineChart,
        { data: rows, margin: { top: 6, right: 4, bottom: 0, left: 4 } },
        React.createElement(Line as ChartComponent, {
          type: 'monotone',
          dataKey: 'v',
          stroke: stroke,
          strokeWidth: 2.4,
          dot: false,
        })
      )
    )
  );
}

function StatCard({ kpi, currency, onOpen }) {
  const up = kpi.delta >= 0;
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight;
  const valueStr = formatKpiValue(kpi, currency);
  const targetStr = formatKpiTarget(kpi, currency);
  const remainingStr = formatKpiRemaining(kpi, currency);
  const progress = clamp((kpi.valueRaw / Math.max(1, kpi.targetRaw)) * 100, 0, 120);

  return React.createElement(
    'button',
    {
      type: 'button',
      onClick: onOpen,
      className: cx(
        'h-full w-full rounded-[11px] p-4 text-left shadow-[0_18px_55px_rgba(2,16,23,0.08)] transition',
        'hover:-translate-y-[1px] hover:shadow-[0_26px_70px_rgba(2,16,23,0.12)]',
        kpi.variant === 'dark'
          ? 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] text-white'
          : 'border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-900'
      ),
      'aria-label': `${kpi.label} details`,
    },

    React.createElement(
      'div',
      { className: 'flex items-start justify-between gap-4' },
      React.createElement(
        'div',
        { className: 'min-w-0' },
        React.createElement(
          'div',
          {
            className: cx(
              'text-[12px] font-extrabold',
              kpi.variant === 'dark' ? 'text-white/70' : 'text-slate-500'
            ),
          },
          kpi.label
        ),
        React.createElement(
          'div',
          {
            className: cx(
              'mt-2 text-[30px] font-black leading-none tracking-tight',
              kpi.variant === 'dark' ? 'text-white' : 'text-slate-900'
            ),
          },

          valueStr
        ),

        /* goals + remaining */
        React.createElement(
          'div',
          {
            className: cx(
              'mt-2 text-[11px] font-semibold',
              kpi.variant === 'dark' ? 'text-white/60' : 'text-slate-500'
            ),
          },
          'Target: ',
          React.createElement(
            'span',
            { className: kpi.variant === 'dark' ? 'text-white' : 'text-slate-900' },
            targetStr
          ),
          React.createElement('span', { className: 'mx-2 text-slate-300' }, '•'),
          'Remaining: ',
          React.createElement(
            'span',
            { className: kpi.variant === 'dark' ? 'text-white' : 'text-slate-900' },
            remainingStr
          )
        ),

        React.createElement(
          'div',
          {
            className: cx(
              'mt-2 h-2 rounded-full',
              kpi.variant === 'dark' ? 'bg-white dark:bg-slate-900/10' : 'bg-slate-100'
            ),
          },
          React.createElement('div', {
            className: 'h-2 rounded-full',
            style: {
              width: `${clamp(progress, 0, 100)}%`,
              background: kpi.variant === 'dark' ? TOKENS.green : kpi.stroke,
            },
          })
        ),

        React.createElement(
          'div',
          { className: 'mt-3 flex items-center gap-2' },
          React.createElement(
            'span',
            {
              className: cx(
                'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold',
                up
                  ? kpi.variant === 'dark'
                    ? 'bg-emerald-500/15 text-emerald-200'
                    : 'bg-emerald-50 text-emerald-700'
                  : kpi.variant === 'dark'
                    ? 'bg-rose-500/15 text-rose-200'
                    : 'bg-rose-50 text-rose-700'
              ),
            },

            React.createElement(DeltaIcon, {
              className: cx('h-4 w-4', up ? 'text-emerald-400' : 'text-rose-400'),
            }),
            pct(kpi.delta)
          ),
          React.createElement(
            'span',
            {
              className: cx(
                'text-[11px] font-semibold',
                kpi.variant === 'dark' ? 'text-white/60' : 'text-slate-500'
              ),
            },
            'vs previous'
          ),
          React.createElement(
            'span',
            {
              className: cx(
                'ml-auto inline-flex items-center gap-1 text-[11px] font-extrabold',
                kpi.variant === 'dark' ? 'text-white/60' : 'text-slate-500'
              ),
            },
            'Drill down',

            React.createElement(ChevronRight, { className: 'h-4 w-4' })
          )
        )
      ),

      React.createElement(MiniSparkline, { data: kpi.series, stroke: kpi.stroke })
    )
  );
}

function Dot({ active = false }: { active?: boolean }) {
  return React.createElement('span', {
    className: cx(
      'h-2 w-2 rounded-full',
      active ? 'bg-[rgba(15,23,42,0.9)]' : 'bg-[rgba(15,23,42,0.3)]'
    ),
  });
}

function Drawer({ open, onClose, title, children }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = window.requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = 'hidden';
      return () => window.cancelAnimationFrame(raf);
    }

    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 200);
    document.body.style.overflow = '';
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!mounted) return null;

  return React.createElement(
    'div',
    { className: 'fixed inset-0 z-[90] evz-no-print' },
    React.createElement('div', {
      className: cx(
        'absolute inset-0 bg-black/35 backdrop-blur-sm transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0'
      ),
      onClick: onClose,
    }),

    React.createElement(
      'aside',
      {
        className: cx(
          'absolute right-0 top-0 h-full w-[92vw] max-w-[620px] border-l border-slate-200/70 bg-white dark:bg-slate-900/90 shadow-2xl backdrop-blur',
          'transition-transform duration-200',
          visible ? 'translate-x-0' : 'translate-x-full'
        ),
        role: 'dialog',
        'aria-modal': 'true',
      },

      React.createElement(
        'div',
        { className: 'flex h-full flex-col' },
        React.createElement(
          'div',
          { className: 'border-b border-slate-200/70 p-4' },
          React.createElement(
            'div',
            { className: 'flex items-start justify-between gap-3' },
            React.createElement(
              'div',
              {},
              React.createElement('div', { className: 'text-sm font-black text-slate-900' }, title),
              React.createElement(
                'div',
                { className: 'mt-1 text-xs font-semibold text-slate-500' },
                'Drilldown details and next actions'
              )
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: onClose,
                className:
                  'grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950',
                'aria-label': 'Close',
              },

              React.createElement(X, { className: 'h-4 w-4' })
            )
          )
        ),

        React.createElement('div', { className: 'flex-1 overflow-y-auto p-4' }, children)
      )
    )
  );
}

function Toast({ show, text }) {
  return React.createElement(
    'div',
    {
      className: cx(
        'pointer-events-none fixed bottom-5 left-1/2 z-[95] -translate-x-1/2 evz-no-print',
        'transition-all duration-200',
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      ),
    },

    React.createElement(
      'div',
      {
        className:
          'pointer-events-none rounded-full border border-white/10 bg-black/85 px-4 py-3 text-[12px] font-extrabold text-white shadow-2xl',
      },
      text
    )
  );
}

function ProgressDark({ label, value }) {
  const v = clamp(value, 0, 100);
  return React.createElement(
    'div',
    {},
    React.createElement(
      'div',
      { className: 'flex items-center justify-between text-[11px] font-extrabold text-white/70' },
      React.createElement('span', {}, label),
      React.createElement('span', { className: 'text-white/60' }, Math.round(v), '%')
    ),
    React.createElement(
      'div',
      { className: 'mt-1 h-2 rounded-full bg-white dark:bg-slate-900/10' },
      React.createElement('div', {
        className: 'h-2 rounded-full',
        style: { width: `${v}%`, background: TOKENS.green },
      })
    )
  );
}

type DashboardProps = {
  role?: UserRole;
  currency?: string;
  onNavigate?: (to: string) => void;
};

export default function SupplierHubDashboardPage({
  role: roleOverride = 'seller',
  currency = 'CNY',
  onNavigate,
}: DashboardProps) {
  const { role, content } = useRolePageContent('dashboard', roleOverride);
  const mapRoleRoute = (to: string) => {
    if (role !== 'provider') return to;
    if (!to.startsWith('/')) return to;
    if (to.startsWith('/provider')) return to;

    const [path, query = ''] = to.split('?');
    const suffix = query ? `?${query}` : '';

    if (path.startsWith('/orders')) return `/provider/orders${suffix}`;

    if (path.startsWith('/listings')) {
      const sharedListingRoutes = [
        '/listings/wizard',
        '/listings/form-preview',
        '/listings/taxonomy',
        '/listings/new',
      ];
      if (sharedListingRoutes.some((p) => path.startsWith(p))) return `${path}${suffix}`;

      if (path === '/listings') return `/provider/listings${suffix}`;

      const rest = path.slice('/listings/'.length);
      if (
        !rest ||
        rest.startsWith('new') ||
        rest.startsWith('bulk') ||
        rest.startsWith('AwaitingApproval')
      ) {
        return `/provider/listings${suffix}`;
      }
      return `/provider/listings/${rest}${suffix}`;
    }

    if (path.startsWith('/inventory')) return `/provider/inventory${suffix}`;

    if (path.startsWith('/ops/disputes') || path.startsWith('/ops/returns'))
      return `/provider/disputes${suffix}`;
    if (path.startsWith('/ops')) return `/provider/service-command${suffix}`;

    if (path.startsWith('/finance') || path.startsWith('/wallet'))
      return `/provider/quotes${suffix}`;

    if (path.startsWith('/wholesale')) return `/provider/quotes${suffix}`;
    if (path.startsWith('/expressmart')) return `/provider/bookings${suffix}`;

    return `${path}${suffix}`;
  };

  const routerNavigate = useNavigate();
  const rawNavigate = onNavigate ?? ((to: string) => routerNavigate(to));

  const navigate = (to: string) => rawNavigate(mapRoleRoute(to));

  // Global controls
  const [viewId, setViewId] = useState('all');
  const [defaultViewId, setDefaultViewId] = useState('all');
  const [customViews, setCustomViews] = useState<CustomView[]>([]);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [insightsTab, setInsightsTab] = useState('recommended');
  const [askPrompt, setAskPrompt] = useState('');
  const [askAnswer, setAskAnswer] = useState<AskAnswer | null>(null);
  const [proofs, setProofs] = useState<Record<string, string[]>>({});
  const [range, setRange] = useState('7d');
  const [customFrom, setCustomFrom] = useState(isoDaysAgo(14));
  const [customTo, setCustomTo] = useState(todayISO());
  const [filters, setFilters] = useState<ViewFilters>({
    marketplaces: [],
    warehouses: [],
    channels: [],
  });
  const applyingView = useRef(false);

  // Drawer
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; text: string }>({
    show: false,
    text: '',
  });
  const toastTimer = useRef<number | null>(null);

  const showToast = (text) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ show: true, text });
    toastTimer.current = window.setTimeout(() => setToast({ show: false, text: '' }), 1800);
  };

  useEffect(() => {
    let active = true;

    void Promise.all([
      sellerBackendApi.getSavedViews().catch(() => ({ views: [] })),
      sellerBackendApi.getUiState().catch(() => ({})),
    ]).then(([savedViewsPayload, uiStatePayload]) => {
      if (!active) return;

      const safeCustom: CustomView[] = Array.isArray(savedViewsPayload.views)
        ? (savedViewsPayload.views as CustomView[])
        : [];
      setCustomViews(safeCustom);

      const savedDefault = String((uiStatePayload.dashboard as { defaultViewId?: string } | undefined)?.defaultViewId || 'all');
      const universe = [...PRESET_VIEWS, ...safeCustom];
      const resolvedDefault =
        savedDefault && universe.some((v) => v.id === savedDefault) ? savedDefault : 'all';
      setDefaultViewId(resolvedDefault);
      setViewId(resolvedDefault);

      const params = getShareParamsFromLocation();
      const hasShare =
        params.has('range') ||
        params.has('from') ||
        params.has('to') ||
        params.has('m') ||
        params.has('w') ||
        params.has('c');
      if (hasShare) {
        applyingView.current = true;

        const nextRange = params.get('range');
        if (isTimeRangeKey(nextRange)) setRange(nextRange);

        const from = params.get('from');
        const to = params.get('to');
        if (from) setCustomFrom(from);
        if (to) setCustomTo(to);

        setFilters({
          marketplaces: parseCommaList(params.get('m')),
          warehouses: parseCommaList(params.get('w')),
          channels: parseCommaList(params.get('c')),
        });

        setViewId('custom');
        window.setTimeout(() => {
          applyingView.current = false;
        }, 0);
        showToast('View loaded from link');
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void sellerBackendApi.patchSavedViews({ views: customViews }).catch(() => undefined);
  }, [customViews]);
  // Apply preset views (and treat any manual change as a "custom" view)
  useEffect(() => {
    const v = ([...PRESET_VIEWS, ...customViews] as CustomView[]).find((x) => x.id === viewId);
    if (!v) return;
    applyingView.current = true;
    setRange(v.range);
    setFilters(v.filters);
    if (v.range === 'custom' && v.custom) {
      setCustomFrom(v.custom.from);
      setCustomTo(v.custom.to);
    }
    window.setTimeout(() => {
      applyingView.current = false;
    }, 0);
  }, [viewId, customViews]);

  const rangeMeta = useMemo(
    () => computeRangeMeta(range, customFrom, customTo),
    [range, customFrom, customTo]
  );
  const filterMeta = useMemo(() => computeFilterMeta(filters), [filters]);
  const allViews = useMemo(() => [...PRESET_VIEWS, ...customViews] as CustomView[], [customViews]);

  // Data model (reactive to controls)
  const model = useMemo(() => {
    const seedBase = hashStr(
      `${role}|${currency}|${range}|${customFrom}|${customTo}|${filters.marketplaces.join(',')}|${filters.warehouses.join(',')}|${filters.channels.join(',')}`
    );

    const scale = rangeMeta.scale * filterMeta.scale;
    const riskBoost = filterMeta.riskBoost;

    const makeKpi = (k: KpiInput): Kpi => {
      const series = generateSeries(
        rangeMeta.sparkPoints,
        k.seriesBase,
        k.drift,
        k.vol,
        seedBase + k.seedAdd
      );
      const { seriesBase, drift, vol, seedAdd, ...rest } = k;
      return { ...rest, series };
    };

    const quickActionIconByKey: Record<string, LucideIcon> = {
      'create-listing': Store,
      'new-shipment': Truck,
      'request-payout': Wallet,
      'start-promo': Flame,
      'create-rma': Boxes,
      'new-booking': CalendarRange,
    };

    const quickActions = content.quickActions.map((action: DashboardQuickAction) => ({
      ...action,
      icon: quickActionIconByKey[action.key] ?? Plus,
    }));

    // HERO
    const hero = {
      title: 'Congratulations',
      name: content.hero.name,
      sub: content.hero.sub,
      cta: { label: content.hero.ctaLabel, to: content.hero.ctaTo },
      miniBar: generateSeries(6, 10 * scale, 1.2, 2.4, seedBase + 11).map((n) => Math.round(n)),
      chip: {
        label: 'MyLiveDealz',
        value: filterMeta.hasMLDZ ? content.hero.chipWhenMLDZ : content.hero.chipWhenNoMLDZ,
      },
    };

    const featured = {
      title: content.featured.title,
      sub: content.featured.sub,
      cta: { label: content.featured.ctaLabel, to: content.featured.ctaTo },
    };

    // KPI values that actually move with controls
    const revenueBase = content.bases.revenueBase;
    const ordersBase = content.bases.ordersBase;
    const trustBase = content.bases.trustBase;

    const revenueRaw = revenueBase * scale;
    const ordersRaw = Math.max(
      1,
      Math.round(ordersBase * Math.max(0.4, rangeMeta.scale) * filterMeta.scale)
    );
    const trustRaw = clamp(trustBase + (filterMeta.hasMLDZ ? 3 : 0) - riskBoost * 10, 55, 98);

    const kpis =
      role === 'provider'
        ? [
            makeKpi({
              id: 'bookings',
              label: 'Bookings',
              format: 'count',
              valueRaw: ordersRaw,
              targetRaw: Math.max(ordersRaw + 3, 15),
              delta: 9.4,
              variant: 'light',
              stroke: TOKENS.green,
              seriesBase: 8 * scale,
              drift: 0.45,
              vol: 1.2,
              seedAdd: 21,
              drilldown: {
                headline: 'Bookings are increasing',
                sub: 'Improve response speed to keep acceptance high.',
                breakdown: [
                  { label: 'New requests', value: `${Math.round(ordersRaw * 0.32)}` },
                  { label: 'Confirmed', value: `${Math.round(ordersRaw * 0.52)}` },
                  { label: 'In progress', value: `${Math.round(ordersRaw * 0.16)}` },
                ],
                actions: [
                  { label: 'My Bookings', to: '/provider/bookings', icon: ClipboardList },
                  { label: 'Service Command', to: '/provider/service-command', icon: Activity },
                  { label: 'Messages', to: '/messages', icon: Globe },
                ],
              },
            }),
            makeKpi({
              id: 'quotes',
              label: 'Quotes',
              format: 'count',
              valueRaw: Math.max(2, Math.round(ordersRaw * 0.6)),
              targetRaw: Math.max(10, Math.round(ordersRaw * 0.75) + 2),
              delta: 6.1,
              variant: 'light',
              stroke: TOKENS.greenDeep,
              seriesBase: 4 * scale,
              drift: 0.35,
              vol: 1.0,
              seedAdd: 22,
              drilldown: {
                headline: 'Quotes are converting',
                sub: 'Follow up quickly to improve acceptance.',
                breakdown: [
                  { label: 'New', value: `${Math.max(1, Math.round(ordersRaw * 0.15))}` },
                  { label: 'Negotiating', value: `${Math.max(1, Math.round(ordersRaw * 0.25))}` },
                  { label: 'Accepted', value: `${Math.max(1, Math.round(ordersRaw * 0.2))}` },
                ],
                actions: [
                  { label: 'Provider Quotes', to: '/provider/quotes', icon: BarChart3 },
                  { label: 'Messages', to: '/messages', icon: Globe },
                  { label: 'Payouts', to: '/finance/wallets', icon: Wallet },
                ],
              },
            }),
            makeKpi({
              id: 'trust',
              label: 'Trust readiness',
              format: 'percent',
              valueRaw: trustRaw,
              targetRaw: 90,
              delta: -1.2,
              variant: 'dark',
              stroke: TOKENS.orange,
              seriesBase: trustRaw,
              drift: -0.2,
              vol: 1.0,
              seedAdd: 23,
              drilldown: {
                headline: 'Protect payouts and ranking',
                sub: 'Complete identity and maintain response quality.',
                breakdown: [
                  { label: 'KYC / KYB', value: 'In review', note: '1 item pending' },
                  { label: 'Response time', value: 'Good', note: '< 2h avg' },
                  { label: 'Disputes', value: 'Low', note: '0 open' },
                ],
                actions: [
                  { label: 'Security', to: '/settings/security', icon: ShieldCheck },
                  { label: 'KYC', to: '/settings/kyc', icon: BadgeCheck },
                  { label: 'Support', to: '/support', icon: AlertTriangle },
                ],
              },
            }),
          ]
        : [
            makeKpi({
              id: 'revenue',
              label: 'Revenue',
              format: 'money',
              valueRaw: revenueRaw,
              targetRaw: revenueRaw * 1.18,
              delta: 12.7,
              variant: 'light',
              stroke: TOKENS.green,
              seriesBase: 10 * scale,
              drift: 0.8,
              vol: 2.5,
              seedAdd: 31,
              drilldown: {
                headline: 'Revenue is trending up',
                sub: 'Drivers are marketplace conversions, wholesale pipeline, and promo uplift.',
                breakdown: [
                  {
                    label: 'Marketplace orders',
                    value: formatMoney(6_140_000 * scale, currency),
                    note: '~65%',
                  },
                  {
                    label: 'Wholesale pipeline',
                    value: formatMoney(2_520_000 * scale, currency),
                    note: '~27%',
                  },
                  {
                    label: 'MyLiveDealz uplift',
                    value: formatMoney(820_000 * scale, currency),
                    note: '~8%',
                  },
                ],
                actions: [
                  { label: 'Open Orders', to: '/orders', icon: Package },
                  { label: 'Open Wholesale', to: '/wholesale', icon: Globe },
                  { label: 'Open Finance', to: '/finance/wallets', icon: Wallet },
                ],
              },
            }),
            makeKpi({
              id: 'orders',
              label: 'Active orders',
              format: 'count',
              valueRaw: ordersRaw,
              targetRaw: Math.max(30, ordersRaw + 10),
              delta: 4.1,
              variant: 'light',
              stroke: TOKENS.greenDeep,
              seriesBase: 18 * Math.max(0.6, rangeMeta.scale),
              drift: 0.3,
              vol: 1.6,
              seedAdd: 32,
              drilldown: {
                headline: 'Order flow is healthy',
                sub: 'Prioritize the items near SLA risk to protect delivery rate.',
                breakdown: [
                  {
                    label: 'Pending confirmation',
                    value: `${Math.max(1, Math.round(ordersRaw * 0.28))}`,
                  },
                  { label: 'Packed', value: `${Math.max(1, Math.round(ordersRaw * 0.42))}` },
                  { label: 'In transit', value: `${Math.max(1, Math.round(ordersRaw * 0.3))}` },
                ],
                actions: [
                  { label: 'Go to Orders', to: '/orders', icon: ClipboardList },
                  { label: 'Ops Center', to: '/ops', icon: Truck },
                  { label: 'Disputes', to: '/ops/disputes', icon: ShieldCheck },
                ],
              },
            }),
            makeKpi({
              id: 'trust',
              label: 'Trust readiness',
              format: 'percent',
              valueRaw: trustRaw,
              targetRaw: 90,
              delta: -2.0,
              variant: 'dark',
              stroke: TOKENS.orange,
              seriesBase: trustRaw,
              drift: -0.35,
              vol: 1.3,
              seedAdd: 33,
              drilldown: {
                headline: 'Resolve blockers to protect payouts',
                sub: 'KYC is incomplete and one integration is degraded.',
                breakdown: [
                  { label: 'KYC / KYB', value: 'Pending', note: 'Upload 2 docs' },
                  { label: 'Payout method', value: 'Configured', note: 'OK' },
                  { label: 'Webhooks', value: 'Degraded', note: 'Retry failed' },
                ],
                actions: [
                  { label: 'Open KYC', to: '/settings/kyc', icon: ShieldCheck },
                  { label: 'Status Center', to: '/status-center', icon: Activity },
                  { label: 'Integrations', to: '/settings/integrations', icon: Globe },
                ],
              },
            }),
          ];

    // Donut segments (clickable)
    const donutBase =
      role === 'provider'
        ? [
            {
              name: 'New',
              value: Math.max(1, Math.round(ordersRaw * 0.25)),
              hint: 'Requests waiting for first response',
              to: '/provider/quotes?stage=new',
              top: [
                { label: 'Top source', value: filterMeta.hasMLDZ ? 'MyLiveDealz' : 'Marketplace' },
                { label: 'Avg response', value: '1h 18m' },
              ],
              actions: [
                { label: 'Open new quotes', to: '/provider/quotes?stage=new', icon: BarChart3 },
                { label: 'Open messages', to: '/messages', icon: Globe },
              ],
            },
            {
              name: 'Negotiating',
              value: Math.max(1, Math.round(ordersRaw * 0.38)),
              hint: 'Active negotiations',
              to: '/provider/quotes?stage=negotiating',
              top: [
                { label: 'Most asked', value: 'Delivery time' },
                { label: 'Win rate', value: '43%' },
              ],
              actions: [
                {
                  label: 'Open negotiations',
                  to: '/provider/quotes?stage=negotiating',
                  icon: Globe,
                },
                { label: 'Pricing tips', to: '/provider/quotes', icon: Tag },
              ],
            },
            {
              name: 'Accepted',
              value: Math.max(1, Math.round(ordersRaw * 0.22)),
              hint: 'Ready to fulfill',
              to: '/provider/bookings?status=confirmed',
              top: [
                { label: 'SLA', value: '92%' },
                { label: 'Next payout', value: 'In 2 days' },
              ],
              actions: [
                { label: 'Go to bookings', to: '/provider/bookings', icon: ClipboardList },
                { label: 'Open wallet', to: '/finance/wallets', icon: Wallet },
              ],
            },
          ]
        : [
            {
              name: 'Marketplace orders',
              value: 6_140_000 * scale,
              hint: 'Direct purchases',
              to: '/orders?source=marketplace',
              top: [
                { label: 'Conversion', value: filterMeta.hasMLDZ ? '3.1%' : '2.4%' },
                { label: 'Top region', value: 'East Africa' },
              ],
              actions: [
                { label: 'View orders', to: '/orders', icon: Package },
                { label: 'Improve listings', to: '/listings', icon: Store },
              ],
            },
            {
              name: 'Wholesale pipeline',
              value: 2_520_000 * scale,
              hint: 'Quotes and RFQs',
              to: '/wholesale',
              top: [
                { label: 'Open RFQs', value: '9' },
                { label: 'Avg ticket', value: formatMoney(320000 * scale, currency) },
              ],
              actions: [
                { label: 'Open wholesale', to: '/wholesale', icon: Globe },
                { label: 'Quotes received', to: '/wholesale/quotes', icon: BarChart3 },
              ],
            },
            {
              name: 'MyLiveDealz uplift',
              value: 820_000 * scale,
              hint: 'Live + Adz impact',
              to: '/mldz/ads',
              top: [
                { label: 'Active promos', value: filterMeta.hasMLDZ ? 'Focused' : '6' },
                { label: 'CTR', value: '4.8%' },
              ],
              actions: [
                { label: 'Start promo', to: '/mldz/promos/new', icon: Flame },
                { label: 'Adz performance', to: '/mldz/adz-performance', icon: BarChart3 },
              ],
            },
          ];

    // Trend chart (clickable)
    const trendTitle = range === 'ytd' ? 'Yearly sales' : 'Sales trend';
    const trendLabels =
      range === 'today'
        ? Array.from({ length: rangeMeta.trendPoints }, (_, i) => `${i + 1}h`)
        : range === '7d'
          ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          : range === '30d'
            ? Array.from({ length: rangeMeta.trendPoints }, (_, i) => `W${i + 1}`)
            : range === 'ytd'
              ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              : Array.from({ length: rangeMeta.trendPoints }, (_, i) => `P${i + 1}`);

    const trend = trendLabels.map((m, i) => {
      const income = Math.round(
        (revenueBase * 0.06 + i * revenueBase * 0.005) * scale * (0.9 + (i % 3) * 0.07)
      );
      const expense = Math.round(income * (0.38 + (i % 2) * 0.05));
      return { m, income, expense };
    });

    // Operational Command Center
    const opsPipeline = [
      {
        key: 'orders',
        label: 'Orders',
        count: Math.max(1, Math.round(ordersRaw * (1.1 + riskBoost))),
        sla: '< 2h',
        to: '/orders',
      },
      {
        key: 'packed',
        label: 'Packed',
        count: Math.max(1, Math.round(ordersRaw * 0.45)),
        sla: '6h avg',
        to: '/orders',
      },
      {
        key: 'shipped',
        label: 'Shipped',
        count: Math.max(1, Math.round(ordersRaw * 0.35)),
        sla: '18h avg',
        to: '/ops/shipping',
      },
      {
        key: 'delivered',
        label: 'Delivered',
        count: Math.max(1, Math.round(ordersRaw * 0.65 * rangeMeta.scale)),
        sla: '2.4d avg',
        to: '/orders',
      },
    ];

    const riskItems = [
      {
        key: 'sla',
        label: 'SLA risk',
        score: clamp(35 + riskBoost * 140, 10, 92),
        count: Math.max(1, Math.round(4 + riskBoost * 10)),
        hint: 'Orders approaching breach',
        to: '/orders?filter=sla_risk',
      },
      {
        key: 'disputes',
        label: 'Disputes',
        score: clamp(18 + riskBoost * 90, 5, 80),
        count: Math.max(0, Math.round(1 + riskBoost * 6)),
        hint: 'Open cases and escalations',
        to: '/ops/disputes',
      },
      {
        key: 'returns',
        label: 'Returns',
        score: clamp(22 + riskBoost * 70, 6, 75),
        count: Math.max(0, Math.round(2 + riskBoost * 6)),
        hint: 'RMAs pending action',
        to: '/ops/returns',
      },
      {
        key: 'stockouts',
        label: 'Stockouts',
        score: clamp(
          28 + riskBoost * 80 + (filters.marketplaces.includes('GadgetMart') ? 8 : 0),
          6,
          86
        ),
        count: Math.max(0, Math.round(3 + riskBoost * 8)),
        hint: 'Low stock items',
        to: '/inventory?filter=low_stock',
      },
      {
        key: 'holds',
        label: 'Payment holds',
        score: clamp(14 + riskBoost * 60 + (trustRaw < 75 ? 10 : 0), 4, 78),
        count: Math.max(0, Math.round(trustRaw < 75 ? 2 : 1)),
        hint: 'Payout or compliance holds',
        to: '/finance/holds',
      },
    ];

    const inventoryRisk = [
      {
        key: 'low',
        label: 'Low stock',
        count: Math.max(0, Math.round(6 + riskBoost * 10)),
        hint: 'Restock fast movers',
        to: '/inventory?filter=low_stock',
        top: [
          { sku: 'EVCS-220', note: '< 5 units' },
          { sku: 'E-BIKE-NT', note: '< 8 units' },
          { sku: 'GAD-USB-C', note: '< 12 units' },
        ],
      },
      {
        key: 'over',
        label: 'Overstock',
        count: Math.max(0, Math.round(3 + (filterMeta.hasWholesale ? 2 : 1))),
        hint: 'Discount or bundle',
        to: '/inventory?filter=overstock',
        top: [
          { sku: 'GEN-CABLE', note: '+420 units' },
          { sku: 'LIV-LAMP', note: '+180 units' },
          { sku: 'STY-SHOE', note: '+90 units' },
        ],
      },
      {
        key: 'fast',
        label: 'Fast movers',
        count: Math.max(0, Math.round(4 + (filterMeta.hasMLDZ ? 3 : 1))),
        hint: 'Prioritize reorders',
        to: '/inventory?filter=fast_movers',
        top: [
          { sku: 'EV-ACC-01', note: 'High demand' },
          { sku: 'GAD-EAR-02', note: 'Trend spike' },
          { sku: 'GEN-KITCH', note: 'Repeat buyers' },
        ],
      },
      {
        key: 'dead',
        label: 'Dead stock',
        count: Math.max(0, Math.round(2 + (filters.marketplaces.includes('LivingMart') ? 2 : 0))),
        hint: 'Clearance campaign',
        to: '/inventory?filter=dead_stock',
        top: [
          { sku: 'LIV-DECOR-9', note: '90d no sales' },
          { sku: 'GEN-OLD-1', note: '120d no sales' },
        ],
      },
    ];

    // Finance layer
    const settlementStages = [
      {
        key: 'pending',
        label: 'Pending settlement',
        amount: revenueRaw * 0.18,
        date: isoDaysAgo(0),
        hint: 'Awaiting confirmation',
        to: '/finance/statements?status=pending',
      },
      {
        key: 'processing',
        label: 'Processing',
        amount: revenueRaw * 0.11,
        date: isoDaysAgo(1),
        hint: 'Bank processing',
        to: '/finance/statements?status=processing',
      },
      {
        key: 'paid',
        label: 'Paid out',
        amount: revenueRaw * 0.46,
        date: isoDaysAgo(5),
        hint: 'Completed payouts',
        to: '/finance/statements?status=paid',
      },
    ];

    const cashflow = Array.from({ length: 7 }).map((_, i) => {
      const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
      const inflow = Math.round(revenueBase * 0.05 * scale * (0.85 + (i % 3) * 0.11));
      const payout = Math.round(inflow * (0.42 + (i % 2) * 0.08));
      return { day, inflow, payout };
    });

    const feeBreakdown = [
      {
        key: 'platform',
        label: 'Platform fees',
        value: revenueRaw * 0.025,
        hint: 'Listing + service charges',
        to: '/finance/statements?type=platform',
      },
      {
        key: 'logistics',
        label: 'Logistics',
        value: revenueRaw * (filterMeta.hasWarehouseA ? 0.032 : 0.026),
        hint: 'Warehousing + shipping',
        to: '/finance/statements?type=logistics',
      },
      {
        key: 'payments',
        label: 'Payment fees',
        value: revenueRaw * 0.014,
        hint: 'Processor charges',
        to: '/finance/statements?type=payments',
      },
      {
        key: 'tax',
        label: 'Taxes',
        value: revenueRaw * 0.018,
        hint: 'VAT/withholding where applicable',
        to: '/finance/tax-reports',
      },
    ];

    const totalFees = feeBreakdown.reduce((sum, fee) => sum + fee.value, 0);
    const avgOrderValue = revenueRaw / Math.max(1, ordersRaw);
    const nextPayout = settlementStages[0]?.amount ?? revenueRaw * 0.1;
    const financeHighlights = [
      {
        key: 'available',
        label: 'Available balance',
        value: formatMoney(revenueRaw * 0.22, currency),
        hint: 'Across wallets',
        icon: Wallet,
        tone: 'emerald',
      },
      {
        key: 'next_payout',
        label: 'Next payout',
        value: formatMoney(nextPayout, currency),
        hint: settlementStages[0]?.date ?? 'Next batch',
        icon: CalendarRange,
        tone: 'slate',
      },
      {
        key: 'fees',
        label: 'Fees this period',
        value: formatMoney(totalFees, currency),
        hint: 'Platform + logistics',
        icon: Receipt,
        tone: 'orange',
      },
      {
        key: 'aov',
        label: 'Avg order value',
        value: formatMoney(avgOrderValue, currency),
        hint: `${ordersRaw} active orders`,
        icon: TrendingUp,
        tone: 'blue',
      },
    ];

    // Insights (role + risk aware)
    const insights =
      role === 'provider'
        ? [
            {
              icon: Clock,
              title: '2 quotes waiting for reply',
              detail: 'Reply within 2 hours to keep acceptance high.',
              action: { label: 'Open', to: '/messages' },
            },
            {
              icon: ShieldCheck,
              title: 'Enable 2FA for higher trust',
              detail: 'Security improves ranking and payout confidence.',
              action: { label: 'Enable', to: '/settings/security' },
            },
            {
              icon: Boxes,
              title: 'Upgrade your listing',
              detail: 'Add portfolio proof and availability to rank higher.',
              action: { label: 'Improve', to: '/provider/listings' },
            },
          ]
        : [
            {
              icon: ShieldCheck,
              title: 'KYC pending',
              detail: 'Upload documents to prevent payout delays.',
              action: { label: 'Continue', to: '/settings/kyc' },
            },
            {
              icon: AlertTriangle,
              title: `${riskItems.find((r) => r.key === 'sla')?.count ?? 4} orders near SLA risk`,
              detail: 'Prioritize packing and handover for top-risk orders.',
              action: { label: 'Open', to: '/orders?filter=sla_risk' },
            },
            {
              icon: Store,
              title: 'Regulated desk check',
              detail: 'HealthMart Desk may require extra proofs for pharmacy items.',
              action: { label: 'Review', to: '/regulatory' },
            },
          ];

    // Health snapshot
    const health = {
      trust: clamp(trustRaw, 0, 100),
      response: clamp(88 - riskBoost * 18 + (filterMeta.hasMLDZ ? 3 : 0), 50, 99),
      sla: clamp(84 - riskBoost * 20, 40, 98),
    };

    // Tools
    const tools =
      role === 'provider'
        ? [
            { label: 'Bookings', icon: ClipboardList, to: '/provider/bookings' },
            { label: 'Quotes', icon: Globe, to: '/provider/quotes' },
            { label: 'Wallet', icon: Wallet, to: '/finance/wallets' },
            { label: 'Portfolio', icon: Boxes, to: '/provider/portfolio' },
            { label: 'Security', icon: ShieldCheck, to: '/settings/security' },
            { label: 'Support', icon: AlertTriangle, to: '/support' },
          ]
        : [
            { label: 'Orders', icon: Package, to: '/orders' },
            { label: 'Finance', icon: Wallet, to: '/finance' },
            { label: 'MyLiveDealz', icon: Flame, to: '/mldz/feed' },
            { label: 'Inventory', icon: Boxes, to: '/inventory' },
            { label: 'Regulatory', icon: ShieldCheck, to: '/regulatory' },
            { label: 'Support', icon: Globe, to: '/support' },
          ];

    const donutValue = (v) => (role === 'provider' ? `${Math.round(v)}` : formatMoney(v, currency));

    const totalIncome = trend.reduce((a, r) => a + r.income, 0);
    const totalExpense = trend.reduce((a, r) => a + r.expense, 0);

    // --- AI-grade (but practical) Smart Insights ---
    const primaryId = role === 'provider' ? 'income' : 'revenue';
    const volumeId = role === 'provider' ? 'bookings' : 'orders';
    const primarySeries = kpis.find((k) => k.id === primaryId)?.series ?? [];
    const volumeSeries = kpis.find((k) => k.id === volumeId)?.series ?? [];

    const primaryNow = primarySeries[primarySeries.length - 1] ?? revenueRaw;
    const primaryPrev = primarySeries[primarySeries.length - 2] ?? primaryNow;
    const primaryDeltaPct = ((primaryNow - primaryPrev) / Math.max(1, primaryPrev)) * 100;

    const volumeNow = Math.max(1, Math.round(volumeSeries[volumeSeries.length - 1] ?? ordersRaw));
    const volumePrev = Math.max(1, Math.round(volumeSeries[volumeSeries.length - 2] ?? volumeNow));
    const aov = primaryNow / Math.max(1, volumeNow);

    const conversionSeries = generateSeries(
      rangeMeta.sparkPoints,
      filterMeta.hasMLDZ ? 3.2 : 2.6,
      filterMeta.hasMLDZ ? 0.02 : -0.01,
      0.18 + riskBoost * 0.35,
      seedBase + 91
    ).map((n) => clamp(n, 0.4, 12));

    const cancelRateSeries = generateSeries(
      rangeMeta.sparkPoints,
      5.1 + riskBoost * 4.2,
      -0.01,
      0.38 + riskBoost * 0.7,
      seedBase + 92
    ).map((n) => clamp(n, 1.2, 18));
    const disputeRateSeries = generateSeries(
      rangeMeta.sparkPoints,
      1.2 + riskBoost * 2.0,
      0.0,
      0.18 + riskBoost * 0.5,
      seedBase + 93
    ).map((n) => clamp(n, 0.2, 7));

    const cancellationsSeries = volumeSeries.length
      ? volumeSeries.map((o, i) =>
          Math.max(
            0,
            Math.round(
              (o * (cancelRateSeries[i] ?? cancelRateSeries[cancelRateSeries.length - 1])) / 100
            )
          )
        )
      : generateSeries(
          rangeMeta.sparkPoints,
          Math.max(1, volumeNow * 0.06),
          0.2,
          2.4 + riskBoost * 4,
          seedBase + 94
        ).map((n) => Math.round(n));

    const disputesSeries = volumeSeries.length
      ? volumeSeries.map((o, i) =>
          Math.max(
            0,
            Math.round(
              (o * (disputeRateSeries[i] ?? disputeRateSeries[disputeRateSeries.length - 1])) / 100
            )
          )
        )
      : generateSeries(
          rangeMeta.sparkPoints,
          Math.max(0, volumeNow * 0.012),
          0.08,
          1.2 + riskBoost * 2,
          seedBase + 95
        ).map((n) => Math.round(n));

    const convNow = conversionSeries[conversionSeries.length - 1] ?? 0;
    const convPrev = conversionSeries[conversionSeries.length - 2] ?? convNow;
    const cancelNow = cancellationsSeries[cancellationsSeries.length - 1] ?? 0;
    const cancelPrev = cancellationsSeries[cancellationsSeries.length - 2] ?? cancelNow;
    const disputeNow = disputesSeries[disputesSeries.length - 1] ?? 0;
    const disputePrev = disputesSeries[disputesSeries.length - 2] ?? disputeNow;

    // Driver impact estimates (very lightweight model: traffic × conversion; then subtract cancels/disputes)
    const trafficPrev = volumePrev / Math.max(0.0001, convPrev / 100);
    const ordersImpactFromConv = trafficPrev * ((convNow - convPrev) / 100);
    const revenueImpactFromConv = ordersImpactFromConv * aov;
    const revenueImpactFromCancel = -(cancelNow - cancelPrev) * aov;
    const revenueImpactFromDispute = -(disputeNow - disputePrev) * aov * 0.6;

    const drivers = [
      {
        key: 'conv',
        label: 'Conversion rate',
        deltaLabel: `${convNow.toFixed(1)}% (${convNow - convPrev >= 0 ? '+' : ''}${(convNow - convPrev).toFixed(1)}pp)`,
        impactLabel: `${formatMoney(revenueImpactFromConv, currency)} est.`,
        impactRaw: revenueImpactFromConv,
        note: filterMeta.hasMLDZ
          ? 'MyLiveDealz traffic can amplify swings.'
          : 'Check listing quality + stock availability.',
        to: '/analytics?metric=conversion',
        icon: Activity,
      },
      {
        key: 'cancel',
        label: 'Cancellations',
        deltaLabel: `${cancelNow} (${cancelNow - cancelPrev >= 0 ? '+' : ''}${cancelNow - cancelPrev})`,
        impactLabel: `${formatMoney(revenueImpactFromCancel, currency)} est.`,
        impactRaw: revenueImpactFromCancel,
        note: 'Look for stockouts, address issues, and courier capacity.',
        to: '/orders?filter=cancelled',
        icon: AlertTriangle,
      },
      {
        key: 'dispute',
        label: 'Disputes / chargebacks',
        deltaLabel: `${disputeNow} (${disputeNow - disputePrev >= 0 ? '+' : ''}${disputeNow - disputePrev})`,
        impactLabel: `${formatMoney(revenueImpactFromDispute, currency)} est.`,
        impactRaw: revenueImpactFromDispute,
        note: 'Prioritize response time and proof uploads to resolve faster.',
        to: '/ops/disputes',
        icon: ShieldCheck,
      },
    ].sort((a, b) => Math.abs(b.impactRaw) - Math.abs(a.impactRaw));

    const makeAlert = (args: {
      key: string;
      metric: string;
      series: number[];
      to: string;
      icon: React.ElementType;
      valueFmt: (v: number) => string;
      deltaFmt: (d: number) => string;
    }): AlertItem | null => {
      const { key, metric, series, to, icon, valueFmt, deltaFmt } = args;
      if (series.length < 4) return null;
      const last = series[series.length - 1] ?? 0;
      const prev = series.slice(0, -1);
      const m = mean(prev);
      const sd = stdev(prev) || 1;
      const z = (last - m) / sd;
      const abs = Math.abs(z);
      if (abs < 2) return null;
      const level = abs >= 3 ? 'critical' : 'warning';
      const delta = last - m;
      return {
        key,
        metric,
        level,
        valueLabel: valueFmt(last),
        deltaLabel: deltaFmt(delta),
        note: z >= 0 ? 'Spike vs baseline' : 'Drop vs baseline',
        to,
        icon,
      };
    };

    const alerts = [
      makeAlert({
        key: 'a_conv',
        metric: 'Conversion',
        series: conversionSeries,
        to: '/analytics?metric=conversion',
        icon: Activity,
        valueFmt: (v) => `${v.toFixed(1)}%`,
        deltaFmt: (d) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`,
      }),
      makeAlert({
        key: 'a_cancel',
        metric: 'Cancellations',
        series: cancellationsSeries,
        to: '/orders?filter=cancelled',
        icon: AlertTriangle,
        valueFmt: (v) => `${Math.round(v)}`,
        deltaFmt: (d) => `${d >= 0 ? '+' : ''}${Math.round(d)}`,
      }),
      makeAlert({
        key: 'a_dispute',
        metric: 'Disputes',
        series: disputesSeries,
        to: '/ops/disputes',
        icon: ShieldCheck,
        valueFmt: (v) => `${Math.round(v)}`,
        deltaFmt: (d) => `${d >= 0 ? '+' : ''}${Math.round(d)}`,
      }),
    ].filter((a): a is AlertItem => Boolean(a));

    const convRecover = Math.max(0, -revenueImpactFromConv);
    const cancelRecover = Math.max(0, (cancelNow - cancelPrev) * aov);
    const disputeRecover = Math.max(0, (disputeNow - disputePrev) * aov * 0.6);
    const slaRisk = riskItems.find((r) => r.key === 'sla')?.count ?? 0;
    const invRiskTop = inventoryRisk[0]?.count ?? 0;

    const actionsBase = [
      {
        key: 'act_conv',
        label: 'Improve conversion on top listings',
        score: clamp(
          55 +
            Math.max(0, convPrev - convNow) * 26 +
            (alerts.some((a) => a.metric === 'Conversion') ? 10 : 0),
          0,
          100
        ),
        impact: convRecover
          ? `Recover ~${formatMoney(convRecover, currency)}/day`
          : 'Stabilize conversion',
        effort: 'Low',
        reason: 'Conversion movement is the fastest lever to regain volume.',
        to: '/analytics?metric=conversion&drilldown=sku',
        icon: BarChart3,
      },
      {
        key: 'act_cancel',
        label: 'Reduce cancellations (stockouts / address issues)',
        score: clamp(
          52 + Math.max(0, cancelNow - cancelPrev) * 3 + Math.min(18, invRiskTop * 0.6),
          0,
          100
        ),
        impact: cancelRecover
          ? `Save ~${formatMoney(cancelRecover, currency)}/day`
          : 'Keep cancellations low',
        effort: 'Med',
        reason: 'Cancellations directly leak revenue and harm trust score.',
        to: '/inventory?filter=low_stock',
        icon: Boxes,
      },
      {
        key: 'act_dispute',
        label: 'Triage disputes & upload proofs',
        score: clamp(
          48 +
            Math.max(0, disputeNow - disputePrev) * 8 +
            (alerts.some((a) => a.metric === 'Disputes') ? 12 : 0),
          0,
          100
        ),
        impact: disputeRecover
          ? `Protect ~${formatMoney(disputeRecover, currency)}/day`
          : 'Prevent chargebacks',
        effort: 'Low',
        reason: 'Fast dispute response reduces chargebacks and payout holds.',
        to: '/ops/disputes',
        icon: ShieldCheck,
      },
      {
        key: 'act_sla',
        label: 'Ship SLA‑risk orders first',
        score: clamp(40 + slaRisk * 1.6, 0, 100),
        impact: slaRisk ? `Protect ${slaRisk} orders` : 'Maintain SLA',
        effort: 'Med',
        reason: 'Meeting SLA prevents late penalties and ranking drops.',
        to: '/orders?filter=sla_risk',
        icon: Truck,
      },
      {
        key: 'act_reg',
        label: 'Upload compliance proofs (regulated desk)',
        score: clamp(38 + (health.trust < 80 ? 18 : 0) + (riskBoost > 0.14 ? 10 : 0), 0, 100),
        impact: 'Reduce payout / listing risk',
        effort: 'Low',
        reason: 'Premium marketplaces require verified docs for regulated categories.',
        to: '/regulatory',
        icon: BadgeCheck,
      },
    ];
    const actions = [...actionsBase].sort((a, b) => b.score - a.score).slice(0, 4);

    const disputeRatePct = (disputeNow / Math.max(1, volumeNow)) * 100;
    const trustBreakdown = {
      kyc: clamp(86 - riskBoost * 14 + (role === 'provider' ? 2 : 0), 40, 100),
      shippingSla: clamp(health.sla, 0, 100),
      disputeRate: clamp(100 - disputeRatePct * 14 - riskBoost * 6, 30, 100),
      responseTime: clamp(health.response, 0, 100),
      productQuality: clamp(90 - riskBoost * 12 + (filterMeta.hasMLDZ ? 2 : 0), 40, 100),
      score: 0,
    };
    trustBreakdown.score = Math.round(
      trustBreakdown.kyc * 0.25 +
        trustBreakdown.shippingSla * 0.25 +
        trustBreakdown.disputeRate * 0.2 +
        trustBreakdown.responseTime * 0.15 +
        trustBreakdown.productQuality * 0.15
    );

    const regulatory = [
      {
        key: 'healthmart',
        category: 'HealthMart (regulated)',
        desk: 'HealthMart Desk',
        status: trustBreakdown.kyc < 80 ? 'Needs proof' : 'In review',
        note: 'Upload seller license + batch COA (where required).',
        to: '/regulatory?desk=healthmart',
        required: true,
      },
      {
        key: 'ev_goods',
        category: 'EV goods (batteries)',
        desk: 'EV Desk',
        status: trustBreakdown.shippingSla > 82 ? 'Verified' : 'In review',
        note: 'UN38.3 / transport compliance for lithium items.',
        to: '/regulatory?desk=ev',
        required: true,
      },
      {
        key: 'quality',
        category: 'Product quality / returns',
        desk: 'Quality Desk',
        status: trustBreakdown.productQuality > 84 ? 'Verified' : 'In review',
        note: 'Keep defect rate low; track RMAs and complaints.',
        to: '/ops/returns',
        required: false,
      },
    ];

    const timeline = [
      {
        key: 'audit_scan',
        date: isoDaysAgo(1),
        title: 'Automated policy scan completed',
        detail: 'No blocking issues detected.',
        tone: 'good',
      },
      {
        key: 'sla_event',
        date: isoDaysAgo(2),
        title: 'SLA watchlist updated',
        detail: `${slaRisk} orders flagged for attention.`,
        tone: slaRisk > 6 ? 'warn' : 'good',
      },
      {
        key: 'kyc_event',
        date: isoDaysAgo(4),
        title: trustBreakdown.kyc < 80 ? 'KYC refresh requested' : 'KYC status verified',
        detail:
          trustBreakdown.kyc < 80
            ? 'Upload missing documents to prevent payout holds.'
            : 'Docs accepted and verified.',
        tone: trustBreakdown.kyc < 80 ? 'warn' : 'good',
      },
      {
        key: 'payout_event',
        date: isoDaysAgo(7),
        title: riskBoost > 0.18 ? 'Payout review triggered' : 'Payout schedule updated',
        detail:
          riskBoost > 0.18
            ? 'Review active due to elevated disputes / SLA risk.'
            : 'No holds. Normal processing.',
        tone: riskBoost > 0.18 ? 'warn' : 'good',
      },
      {
        key: 'desk_event',
        date: isoDaysAgo(10),
        title: 'Regulatory desk status changed',
        detail: 'HealthMart / EV desk checks refreshed.',
        tone: trustBreakdown.kyc < 80 ? 'warn' : 'good',
      },
      {
        key: 'policy_flag',
        date: isoDaysAgo(14),
        title: riskBoost > 0.2 ? 'Policy flag raised' : 'Routine audit event',
        detail:
          riskBoost > 0.2 ? 'One listing requires additional proof.' : 'Standard quarterly audit.',
        tone: riskBoost > 0.2 ? 'bad' : 'good',
      },
    ];

    const smart = {
      headline: `${primaryDeltaPct >= 0 ? '+' : ''}${primaryDeltaPct.toFixed(1)}% ${role === 'provider' ? 'income' : 'revenue'} vs yesterday`,
      drivers,
      alerts,
      actions,
      metrics: {
        conversionNow: convNow,
        cancellationsNow: cancelNow,
        disputesNow: disputeNow,
      },
    };

    const trustSignals = {
      breakdown: trustBreakdown,
      regulatory,
      timeline,
    };

    return {
      hero,
      featured,
      seedBase,
      smart,
      trustSignals,
      quickActions,
      kpis,
      donutTitle: role === 'provider' ? 'Quotes by stage' : 'Revenue mix',
      donut: donutBase,
      donutValue,
      trendTitle,
      totalIncome: formatMoney(totalIncome, currency),
      totalExpense: formatMoney(totalExpense, currency),
      trend,
      insights,
      health,
      tools,
      opsPipeline,
      riskItems,
      inventoryRisk,
      settlementStages,
      cashflow,
      feeBreakdown,
      financeHighlights,
    };
  }, [role, content, currency, range, customFrom, customTo, filters, rangeMeta, filterMeta]);

  const donutColors = [TOKENS.green, TOKENS.orange, '#94A3B8'];
  const feeColors = [TOKENS.green, '#64748B', TOKENS.orange, '#94A3B8'];
  const opsTotalCount = model.opsPipeline.reduce((sum, stage) => sum + stage.count, 0);
  const deliveredCount = model.opsPipeline.find((stage) => stage.key === 'delivered')?.count ?? 0;
  const opsSlaRiskCount = model.riskItems.find((item) => item.key === 'sla')?.count ?? 0;
  const opsDeliveredPct = Math.round((deliveredCount / Math.max(1, opsTotalCount)) * 100);
  const inventoryTotalRisk = model.inventoryRisk.reduce((sum, item) => sum + item.count, 0);
  const inventoryLowStock = model.inventoryRisk.find((item) => item.key === 'low')?.count ?? 0;
  const inventoryFastMovers = model.inventoryRisk.find((item) => item.key === 'fast')?.count ?? 0;
  const inventoryDeadStock = model.inventoryRisk.find((item) => item.key === 'dead')?.count ?? 0;

  const toggleIn = (key, value) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);
      const next = exists ? prev[key].filter((v) => v !== value) : [...prev[key], value];
      return { ...prev, [key]: next };
    });
    if (!applyingView.current) setViewId('custom');
  };

  const clearFilters = () => {
    setFilters({ marketplaces: [], warehouses: [], channels: [] });
    if (!applyingView.current) setViewId('custom');
  };

  const setDefaultView = () => {
    const v = allViews.some((x) => x.id === viewId) ? viewId : 'all';
    setDefaultViewId(v);
    void sellerBackendApi.patchUiState({ dashboard: { defaultViewId: v } }).catch(() => undefined);
    showToast('Default view saved');
  };

  const resetToDefault = () => {
    setViewId(defaultViewId);
    showToast('View reset');
  };

  // Range changes should be treated as custom unless applying preset
  const setRangeSafe = (next) => {
    setRange(next);
    if (!applyingView.current) setViewId('custom');
  };

  const buildShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);

    const p = new URLSearchParams();
    if (range !== '7d') p.set('range', range);
    if (range === 'custom') {
      if (customFrom) p.set('from', customFrom);
      if (customTo) p.set('to', customTo);
    }
    if (filters.marketplaces.length) p.set('m', filters.marketplaces.join(','));
    if (filters.warehouses.length) p.set('w', filters.warehouses.join(','));
    if (filters.channels.length) p.set('c', filters.channels.join(','));

    // Update search params (works for non-hash routers)
    ['range', 'from', 'to', 'm', 'w', 'c'].forEach((k) => url.searchParams.delete(k));
    p.forEach((v, k) => url.searchParams.set(k, v));

    // Update hash query (works for hash routers)
    if (url.hash) {
      const hash = url.hash;
      const idx = hash.indexOf('?');
      const path = idx >= 0 ? hash.slice(0, idx) : hash;
      const hp = new URLSearchParams(idx >= 0 ? hash.slice(idx + 1) : '');
      ['range', 'from', 'to', 'm', 'w', 'c'].forEach((k) => hp.delete(k));
      p.forEach((v, k) => hp.set(k, v));
      const qs = hp.toString();
      url.hash = qs ? `${path}?${qs}` : path;
    }

    return url.toString();
  };

  const shareLink = async () => {
    const url = buildShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Share link copied');
    } catch {
      // Fallback for older browsers / permission blocks
      window.prompt('Copy this dashboard link:', url);
    }
  };

  const exportPdf = () => {
    if (typeof window === 'undefined') return;
    showToast('Print dialog opened — choose “Save as PDF”');
    window.print();
  };

  const startSaveView = () => {
    setSaveViewName('');
    setSaveViewOpen(true);
  };

  const commitSaveView = () => {
    const name = (saveViewName || '').trim() || `View ${customViews.length + 1}`;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `user_${crypto.randomUUID()}`
        : `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const next = {
      id,
      name,
      range,
      filters: {
        marketplaces: [...filters.marketplaces],
        warehouses: [...filters.warehouses],
        channels: [...filters.channels],
      },
      custom: range === 'custom' ? { from: customFrom, to: customTo } : undefined,
    };

    setCustomViews((prev) => {
      const merged = [next, ...prev.filter((v) => v.id !== id)];
      return merged.slice(0, 24);
    });
    setViewId(id);
    setSaveViewOpen(false);
    showToast('Saved as new view');
  };

  const activeFilterTokens = useMemo(() => {
    const tokens: FilterToken[] = [];

    if (range !== '7d') {
      tokens.push({
        key: 'range',
        label:
          range === 'custom' ? `Range: ${customFrom} → ${customTo}` : `Range: ${rangeMeta.label}`,
        tone: 'slate',
        group: 'range',
      });
    }

    filters.marketplaces.forEach((m) =>
      tokens.push({
        key: `m:${m}`,
        label: `Marketplace: ${m}`,
        tone: 'slate',
        group: 'marketplaces',
        value: m,
      })
    );
    filters.warehouses.forEach((w) =>
      tokens.push({
        key: `w:${w}`,
        label: `Warehouse: ${w}`,
        tone: 'green',
        group: 'warehouses',
        value: w,
      })
    );
    filters.channels.forEach((c) =>
      tokens.push({
        key: `c:${c}`,
        label: `Channel: ${c}`,
        tone: c === 'MyLiveDealz' ? 'orange' : 'green',
        group: 'channels',
        value: c,
      })
    );

    return tokens;
  }, [range, customFrom, customTo, filters, rangeMeta.label]);

  const removeToken = (t) => {
    if (t.group === 'range') {
      setRangeSafe('7d');
      return;
    }
    if (!t.value) return;
    if (t.group === 'marketplaces') toggleIn('marketplaces', t.value);
    if (t.group === 'warehouses') toggleIn('warehouses', t.value);
    if (t.group === 'channels') toggleIn('channels', t.value);
  };

  const runAskAi = () => {
    const q = askPrompt.trim();
    if (!q) {
      setAskAnswer(null);
      showToast('Type a question first');
      return;
    }

    // No backend here—return a practical, deterministic “AI-like” suggestion based on current signals
    const drivers = model.smart?.drivers?.slice(0, 3) ?? [];
    const alerts = model.smart?.alerts?.slice(0, 3) ?? [];

    const drilldowns = [
      ...drivers.map((d) => ({ label: d.label, to: d.to })),
      ...alerts.map((a) => ({ label: a.metric, to: a.to })),
      { label: 'Break down by marketplace', to: '/analytics?breakdown=marketplace' },
      { label: 'Check cancellations & disputes', to: '/ops/disputes' },
    ].slice(0, 4);

    const summary =
      drivers.length || alerts.length
        ? `Likely drivers: ${drivers
            .map((d) => d.deltaLabel)
            .slice(0, 3)
            .join(' • ')}.`
        : 'Try checking conversion, cancellations, and disputes by marketplace and warehouse.';

    setAskAnswer({ summary, drilldowns });
    showToast('Suggested drilldowns ready');
  };

  // Drawer title
  const drawerTitle =
    drawer?.kind === 'kpi'
      ? drawer.kpi.label
      : drawer?.kind === 'donut'
        ? drawer.seg.name
        : drawer?.kind === 'ops'
          ? `Ops: ${drawer.stage.label}`
          : drawer?.kind === 'risk'
            ? `Risk: ${drawer.item.label}`
            : drawer?.kind === 'inventory'
              ? `Inventory: ${drawer.item.label}`
              : drawer?.kind === 'settlement'
                ? `Settlement: ${drawer.stage.label}`
                : drawer?.kind === 'fee'
                  ? `Fees: ${drawer.item.label}`
                  : drawer?.kind === 'cashflow'
                    ? `Cashflow: ${drawer.day.day}`
                    : 'Details';
  const singleSmartAction = model.smart.actions.length === 1;
  const singleSmartAlert = model.smart.alerts.length === 1;

  return React.createElement(
    'div',
    { className: 'relative w-full overflow-hidden rounded-[14px]' },
    React.createElement(
      'style',
      {},
      `
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .evz-no-print {
            display: none !important;
          }
          .evz-print-hide-bg {
            display: none !important;
          }
        }
        [data-shell-theme='light'] .evz-hero-lock-card {
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        [data-shell-theme='light'] .evz-hero-lock-main {
          background: linear-gradient(120deg, #0b0f14, #0d2b35) !important;
          box-shadow: 0 26px 70px rgba(2, 16, 23, 0.3) !important;
        }
        [data-shell-theme='light'] .evz-hero-lock-featured {
          background: linear-gradient(135deg, #0a3b2e, #0b0f14) !important;
          box-shadow: 0 26px 70px rgba(2, 16, 23, 0.34) !important;
        }
      `
    ),

    React.createElement(
      Modal as ChartComponent,
      {
        open: saveViewOpen,
        title: 'Save current as new view',
        onClose: () => setSaveViewOpen(false),
      },
      React.createElement(
        'div',
        { className: 'space-y-3' },
        React.createElement(
          'div',
          {},
          React.createElement(
            'div',
            { className: 'text-[12px] font-extrabold text-slate-700' },
            'View name'
          ),
          React.createElement('input', {
            value: saveViewName,
            onChange: (e) => setSaveViewName(e.target.value),
            onKeyDown: (e) => {
              if (e.key === 'Enter') commitSaveView();
            },
            placeholder: 'e.g., EVmart • Warehouse A • 30d',
            className:
              'mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-[13px] font-extrabold text-slate-900 outline-none placeholder:text-slate-400',
          })
        ),

        React.createElement(
          'div',
          {
            className:
              'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-[11px] font-semibold text-slate-600',
          },
          'Includes: ',
          React.createElement(
            'span',
            { className: 'font-extrabold text-slate-900' },
            rangeMeta.label
          ),
          React.createElement('span', { className: 'mx-2 text-slate-300' }, '•'),
          filters.marketplaces.length,
          ' marketplaces',
          React.createElement('span', { className: 'mx-2 text-slate-300' }, '•'),
          filters.warehouses.length,
          ' warehouses',
          React.createElement('span', { className: 'mx-2 text-slate-300' }, '•'),
          filters.channels.length,
          ' channels'
        ),

        React.createElement(
          'div',
          { className: 'flex items-center justify-end gap-2' },
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => setSaveViewOpen(false),
              className:
                'rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-700 hover:bg-gray-50 dark:bg-slate-950',
            },
            'Cancel'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: commitSaveView,
              className:
                'rounded-full border border-white/10 bg-[rgba(3,205,140,0.20)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(3,205,140,0.26)]',
            },
            'Save view'
          )
        )
      )
    ),

    /* Background: light base + diagonal dark wedge (pixel-closer to screenshot) */
    React.createElement('div', { className: 'absolute inset-0 bg-[#F6F7FB] evz-print-hide-bg' }),
    React.createElement('div', {
      className: 'absolute inset-0 evz-print-hide-bg',
      style: {
        background:
          'radial-gradient(1200px 500px at 18% 10%, rgba(3,205,140,0.16), transparent 55%), radial-gradient(900px 520px at 92% 40%, rgba(247,127,0,0.10), transparent 60%)',
      },
    }),
    React.createElement('div', {
      className: 'absolute inset-0 evz-print-hide-bg',
      style: {
        clipPath: 'polygon(54% 0, 100% 0, 100% 100%, 38% 100%)',
        background: 'linear-gradient(180deg, rgba(11,15,20,0.98), rgba(11,15,20,0.92))',
      },
    }),

    React.createElement(
      'div',
      { className: 'relative p-4 lg:p-5' },
      React.createElement(
        'div',
        { className: 'grid auto-rows-min grid-cols-12 items-stretch gap-2' },
        /* HERO: Congratulations */
        React.createElement(
          'div',
          { className: 'col-span-12 lg:col-span-8' },
          React.createElement(
            'div',
            {
              className:
                'evz-hero-lock-card evz-hero-lock-main relative h-full min-h-[248px] overflow-hidden rounded-[11px] border border-white/10 bg-[linear-gradient(120deg,#0B0F14,#0D2B35)] p-6 text-white shadow-[0_26px_70px_rgba(2,16,23,0.30)] lg:p-7',
            },
            React.createElement(
              'div',
              { className: 'relative grid grid-cols-12 gap-7' },
              React.createElement(
                'div',
                { className: 'col-span-12 md:col-span-6 flex min-h-[200px] flex-col justify-between' },
                React.createElement(
                  'div',
                  { className: 'text-[13px] font-extrabold text-white/75' },
                  model.hero.title
                ),
                React.createElement(
                  'div',
                  { className: 'mt-2 text-[34px] font-black leading-[1.05] tracking-tight' },
                  model.hero.name,
                  ' Company!'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-3 max-w-[56ch] text-[16px] font-semibold leading-[1.3] text-white/75' },
                  model.hero.sub
                ),

                React.createElement(
                  'div',
                  { className: 'mt-6 flex flex-nowrap items-center gap-2 whitespace-nowrap' },
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => navigate(model.hero.cta.to),
                      className:
                        'shrink-0 rounded-full px-4 py-2 text-[12px] font-extrabold text-black shadow-[0_12px_30px_rgba(3,205,140,0.25)]',
                      style: { background: TOKENS.green },
                    },

                    model.hero.cta.label
                  ),

                  React.createElement(
                    'div',
                    {
                      className:
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-[rgba(255,255,255,0.06)] px-3 py-2 text-[11px] font-extrabold text-white/80 backdrop-blur-sm whitespace-nowrap',
                    },
                    React.createElement('span', {
                      className: 'h-2 w-2 rounded-full',
                      style: { background: TOKENS.green },
                    }),
                    model.hero.chip.label,
                    ': ',
                    React.createElement('span', { className: 'text-white' }, model.hero.chip.value)
                  ),

                  React.createElement(
                    'div',
                    {
                      className:
                        'hidden shrink-0 items-center gap-1 rounded-full border border-white/15 bg-[rgba(255,255,255,0.06)] px-3 py-2 text-[11px] font-extrabold text-white/80 backdrop-blur-sm whitespace-nowrap lg:inline-flex',
                    },
                    React.createElement(CalendarRange, { className: 'h-4 w-4' }),
                    rangeMeta.label
                  ),

                  React.createElement(
                    'div',
                    {
                      className:
                        'hidden shrink-0 items-center gap-1 rounded-full border border-white/15 bg-[rgba(255,255,255,0.06)] px-3 py-2 text-[11px] font-extrabold text-white/80 backdrop-blur-sm whitespace-nowrap lg:inline-flex',
                    },
                    React.createElement(Flame, {
                      className: 'h-4 w-4',
                      style: { color: TOKENS.orange },
                    }),
                    React.createElement('span', { className: 'font-extrabold text-white/70' }, 'Promo lift'),
                    React.createElement('span', { className: 'font-black text-white' }, 'Active')
                  )
                )
              ),

              /* Right illustration area (chart + soft blob) */
              React.createElement(
                'div',
                { className: 'col-span-12 md:col-span-6' },
                React.createElement(
                  'div',
                  { className: 'relative flex h-full min-h-[190px] items-stretch justify-end md:min-h-[210px]' },
                  React.createElement('div', {
                    className: 'absolute -right-10 -top-10 h-40 w-40 rounded-full blur-2xl',
                    style: {
                      background:
                        'radial-gradient(circle at 30% 30%, rgba(3,205,140,0.60), rgba(3,205,140,0.0) 60%)',
                    },
                  }),
                  React.createElement('div', {
                    className: 'absolute -right-14 top-8 h-36 w-36 rounded-full blur-2xl',
                    style: {
                      background:
                        'radial-gradient(circle at 30% 30%, rgba(247,127,0,0.35), rgba(247,127,0,0.0) 60%)',
                    },
                  }),

                  React.createElement(
                    'div',
                    {
                      className:
                        'relative z-[1] flex h-full w-full flex-col justify-between rounded-[9px] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5 backdrop-blur-sm',
                    },
                    React.createElement(
                      'div',
                      { className: 'text-[13px] font-extrabold text-white/70' },
                      'Momentum'
                    ),
                    React.createElement(
                      'div',
                      { className: 'mt-3 h-full min-h-[140px]' },
                      React.createElement(
                        ResponsiveContainer as ChartComponent,
                        { width: '100%', height: '100%' },
                        React.createElement(
                          BarChart,
                          {
                            data: model.hero.miniBar.map((v, i) => ({ i, v })),
                            margin: { top: 8, right: 6, bottom: 0, left: 6 },
                          },
                          React.createElement(Bar as unknown as ChartComponent, {
                            dataKey: 'v',
                            radius: [8, 8, 8, 8],
                            fill: TOKENS.green,
                          })
                        )
                      )
                    )
                  ),

                )
              )
            ),

            React.createElement('div', {
              className: 'pointer-events-none absolute inset-0',
              style: {
                background:
                  'linear-gradient(135deg, rgba(3,205,140,0.10) 0%, rgba(3,205,140,0.00) 45%), linear-gradient(225deg, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.00) 55%)',
              },
            })
          )
        ),

        /* HERO: Featured */
        React.createElement(
          'div',
          { className: 'col-span-12 md:col-span-6 lg:col-span-4' },
          React.createElement(
            'div',
            {
              className:
                'evz-hero-lock-card evz-hero-lock-featured relative h-full overflow-hidden rounded-[11px] border border-white/10 bg-[linear-gradient(135deg,#0A3B2E,#0B0F14)] p-6 text-white shadow-[0_26px_70px_rgba(2,16,23,0.34)]',
            },
            React.createElement('div', {
              className:
                'absolute -right-8 -top-10 h-44 w-64 rotate-[-12deg] rounded-[14px] bg-[rgba(255,255,255,0.06)] backdrop-blur-sm',
            }),
            React.createElement('div', {
              className: 'absolute -right-14 -top-16 h-56 w-56 rounded-full blur-2xl',
              style: {
                background:
                  'radial-gradient(circle at 30% 30%, rgba(3,205,140,0.55), rgba(3,205,140,0.0) 60%)',
              },
            }),

            React.createElement(
              'div',
              { className: 'relative' },
              React.createElement(
                'div',
                { className: 'text-[11px] font-extrabold text-white/70' },
                'FEATURED'
              ),
              React.createElement(
                'div',
                { className: 'mt-3 text-[18px] font-black tracking-tight' },
                model.featured.title
              ),
              React.createElement(
                'div',
                { className: 'mt-2 text-[12px] font-semibold text-white/70' },
                model.featured.sub
              ),

              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => navigate(model.featured.cta.to),
                  className: 'mt-5 rounded-full px-4 py-2 text-[12px] font-extrabold text-black',
                  style: { background: TOKENS.green },
                },

                model.featured.cta.label
              ),

              React.createElement(
                'div',
                { className: 'mt-6 flex items-center gap-2' },
                React.createElement(Dot, { active: true }),
                React.createElement(Dot, {}),
                React.createElement(Dot, {})
              )
            )
          )
        ),

        /* KPI Row */
        model.kpis.map((k) =>
          React.createElement(
            'div',
            { key: k.id, className: 'col-span-12 lg:col-span-4' },
            React.createElement(StatCard, {
              currency: currency,
              kpi: k,
              onOpen: () => setDrawer({ kind: 'kpi', kpi: k }),
            })
          )
        ),

        /* Donut + Trend + Insights + Finance */
        React.createElement(
          'div',
          {
            className:
              'col-span-12 grid grid-cols-12 items-stretch gap-1.5 lg:grid-rows-[260px_minmax(0,1fr)]',
          },
          /* Donut (clickable) */
          React.createElement(
            'div',
            { className: 'col-span-12 md:col-span-6 lg:col-span-4' },
            React.createElement(
              'div',
              {
                className:
                  'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)] flex flex-col',
                style: { height: MIX_TREND_CARD_HEIGHT },
              },
              React.createElement(
                'div',
                { className: 'flex items-center justify-between' },
                React.createElement(
                  'div',
                  { className: 'text-[12px] font-extrabold text-slate-500' },
                  model.donutTitle
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => showToast('Tip: click a segment for details'),
                    className:
                      'rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1 text-[11px] font-extrabold text-slate-700 hover:bg-gray-50 dark:bg-slate-950',
                  },
                  'Click segments'
                )
              ),

              React.createElement(
                'div',
                { className: 'mt-4 grid grid-cols-12 gap-4' },
                React.createElement(
                  'div',
                  { className: 'col-span-7' },
                  React.createElement(
                    'div',
                    { className: 'h-full min-h-[170px]' },
                    React.createElement(
                      ResponsiveContainer as ChartComponent,
                      { width: '100%', height: '100%' },
                      React.createElement(
                        PieChart,
                        {},
                        React.createElement(
                          Pie as unknown as ChartComponent,
                          {
                            data: model.donut,
                            dataKey: 'value',
                            nameKey: 'name',
                            innerRadius: 56,
                            outerRadius: 78,
                            paddingAngle: 3,
                            onClick: (data, idx) => {
                              const seg = model.donut[idx];
                              if (seg) setDrawer({ kind: 'donut', seg, currency });
                            },
                          },

                          model.donut.map((_, i) =>
                            React.createElement(Cell, {
                              key: i,
                              fill: donutColors[i % donutColors.length],
                            })
                          )
                        ),
                        React.createElement(Tooltip as ChartComponent, {
                          contentStyle: {
                            background: 'rgba(255,255,255,0.95)',
                            border: '1px solid rgba(148,163,184,0.35)',
                            borderRadius: 14,
                            fontSize: 12,
                            fontWeight: 700,
                          },
                          formatter: (v) => model.donutValue(Number(v)),
                        })
                      )
                    )
                  )
                ),

                React.createElement(
                  'div',
                  { className: 'col-span-5' },
                  React.createElement(
                    'div',
                    { className: 'flex h-full flex-col gap-2' },
                    model.donut.map((d, i) =>
                      React.createElement(
                        'button',
                        {
                          key: d.name,
                          type: 'button',
                          onClick: () => setDrawer({ kind: 'donut', seg: d, currency }),
                          className:
                            'flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 px-3 py-2 text-left hover:bg-slate-100',
                        },

                        React.createElement('span', {
                          className: 'h-2.5 w-2.5 rounded-full',
                          style: { background: donutColors[i % donutColors.length] },
                        }),
                        React.createElement(
                          'div',
                          { className: 'min-w-0 flex-1' },
                          React.createElement(
                            'div',
                            { className: 'truncate text-[11px] font-extrabold text-slate-900' },
                            d.name
                          ),
                          React.createElement(
                            'div',
                            { className: 'text-[11px] font-semibold text-slate-500' },
                            model.donutValue(Number(d.value))
                          )
                        ),
                        React.createElement(ChevronRight, { className: 'h-4 w-4 text-slate-300' })
                      )
                    )
                  )
                )
              )
            )
          ),

          /* Trend (clickable) */
          React.createElement(
            'div',
            { className: 'col-span-12 md:col-span-6 lg:col-span-4' },
            React.createElement(
              'div',
              {
                className:
                  'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)] flex flex-col',
                style: { height: MIX_TREND_CARD_HEIGHT },
              },
              React.createElement(
                'div',
                { className: 'text-[12px] font-extrabold text-slate-500' },
                model.trendTitle
              ),

              React.createElement(
                'div',
                { className: 'mt-4 grid grid-cols-2 gap-4' },
                React.createElement(
                  'div',
                  {},
                  React.createElement(
                    'div',
                    { className: 'text-[11px] font-extrabold text-slate-500' },
                    'Total income'
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-[18px] font-black text-slate-900' },
                    model.totalIncome
                  )
                ),
                React.createElement(
                  'div',
                  {},
                  React.createElement(
                    'div',
                    { className: 'text-[11px] font-extrabold text-slate-500' },
                    'Total expenses'
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-[18px] font-black text-slate-900' },
                    model.totalExpense
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'mt-4 min-h-[140px]' },
                React.createElement(
                  ResponsiveContainer as ChartComponent,
                  { width: '100%', height: '100%' },
                  React.createElement(
                    AreaChart,
                    {
                      data: model.trend,
                      margin: { top: 10, right: 10, bottom: 0, left: 0 },
                      onClick: (state) => {
                        if (state?.activePayload?.[0]?.payload) {
                          const p = state.activePayload[0].payload;
                          showToast(`Opened ${p.m}`);
                          setDrawer({
                            kind: 'cashflow',
                            day: { day: p.m, inflow: p.income, payout: p.expense },
                            currency,
                          });
                        }
                      },
                    },

                    React.createElement(Area as unknown as ChartComponent, {
                      type: 'monotone',
                      dataKey: 'income',
                      stroke: TOKENS.green,
                      fill: TOKENS.green,
                      fillOpacity: 0.15,
                      strokeWidth: 2.2,
                    }),
                    React.createElement(Area as unknown as ChartComponent, {
                      type: 'monotone',
                      dataKey: 'expense',
                      stroke: TOKENS.orange,
                      fill: TOKENS.orange,
                      fillOpacity: 0.1,
                      strokeWidth: 2.0,
                    }),
                    React.createElement(Tooltip as ChartComponent, {
                      contentStyle: {
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(148,163,184,0.35)',
                        borderRadius: 14,
                        fontSize: 12,
                        fontWeight: 700,
                      },
                      formatter: (v) => formatMoney(Number(v), currency),
                      labelFormatter: (l) => `${l}`,
                    })
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'mt-3 flex items-center gap-3 text-[10px] font-semibold' },
                React.createElement(
                  'span',
                  { className: 'inline-flex items-center gap-2 text-slate-500' },
                  React.createElement('span', {
                    className: 'h-2.5 w-2.5 rounded-full',
                    style: { background: TOKENS.green },
                  }),
                  'Income'
                ),
                React.createElement(
                  'span',
                  { className: 'inline-flex items-center gap-2 text-slate-500' },
                  React.createElement('span', {
                    className: 'h-2.5 w-2.5 rounded-full',
                    style: { background: TOKENS.orange },
                  }),
                  'Expenses'
                ),
                React.createElement(
                  'span',
                  { className: 'ml-auto text-[10px] font-semibold text-slate-500' },
                  'Click chart'
                )
              )
            )
          ),

          /* Insights + Tools (dark) */
          React.createElement(
            'div',
            { className: 'col-span-12 lg:col-span-4 lg:row-span-2' },
            React.createElement(
              'div',
              {
                className:
                  'rounded-[11px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 text-white shadow-[0_26px_70px_rgba(2,16,23,0.36)] flex flex-col overflow-hidden lg:self-start lg:min-h-0 lg:max-h-[748px]',
                style: { minHeight: MIX_TREND_CARD_HEIGHT },
              },
              React.createElement(
                'div',
                { className: 'flex items-start justify-between gap-3' },
                React.createElement(
                  'div',
                  {},
                  React.createElement(
                    'div',
                    { className: 'text-[12px] font-extrabold text-white/70' },
                    'Smart insights'
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-[16px] font-black' },
                    insightsTab === 'recommended'
                      ? 'Next-best actions'
                      : insightsTab === 'changed'
                        ? 'What changed since yesterday'
                        : insightsTab === 'alerts'
                          ? 'Anomaly alerts'
                          : 'Ask EVzone AI'
                  )
                ),
                React.createElement(
                  'div',
                  { className: 'grid h-10 w-10 place-items-center rounded-2xl bg-slate-900/20' },
                  insightsTab === 'ask'
                    ? React.createElement(ClipboardList, {
                        className: 'h-5 w-5',
                        style: { color: TOKENS.green },
                      })
                    : insightsTab === 'alerts'
                      ? React.createElement(AlertTriangle, {
                          className: 'h-5 w-5',
                          style: { color: TOKENS.orange },
                        })
                      : insightsTab === 'changed'
                        ? React.createElement(Activity, {
                            className: 'h-5 w-5',
                            style: { color: TOKENS.blue },
                          })
                        : React.createElement(Flame, {
                            className: 'h-5 w-5',
                            style: { color: TOKENS.green },
                          })
                )
              ),

              React.createElement(
                'div',
                { className: 'mt-4 flex flex-wrap gap-2 evz-no-print' },
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => setInsightsTab('recommended'),
                    className: cx(
                      'rounded-full border px-3 py-2 text-[11px] font-extrabold',
                      insightsTab === 'recommended'
                        ? 'border-white/20 bg-slate-900/20 text-white'
                        : 'border-white/10 bg-slate-900/10 text-white/70 hover:bg-slate-800/25'
                    ),
                  },
                  'Actions'
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => setInsightsTab('changed'),
                    className: cx(
                      'rounded-full border px-3 py-2 text-[11px] font-extrabold',
                      insightsTab === 'changed'
                        ? 'border-white/20 bg-slate-900/20 text-white'
                        : 'border-white/10 bg-slate-900/10 text-white/70 hover:bg-slate-800/25'
                    ),
                  },
                  'Since yesterday'
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => setInsightsTab('alerts'),
                    className: cx(
                      'rounded-full border px-3 py-2 text-[11px] font-extrabold',
                      insightsTab === 'alerts'
                        ? 'border-white/20 bg-slate-900/20 text-white'
                        : 'border-white/10 bg-slate-900/10 text-white/70 hover:bg-slate-800/25'
                    ),
                  },
                  'Alerts'
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => setInsightsTab('ask'),
                    className: cx(
                      'rounded-full border px-3 py-2 text-[11px] font-extrabold',
                      insightsTab === 'ask'
                        ? 'border-white/20 bg-slate-900/20 text-white'
                        : 'border-white/10 bg-slate-900/10 text-white/70 hover:bg-slate-800/25'
                    ),
                  },
                  'Ask AI'
                )
              ),

              insightsTab === 'recommended'
                ? React.createElement(
                    'div',
                    {
                      className: 'mt-4 flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto pr-1',
                    },
                    model.smart.actions.map((a) => {
                      const Icon = a.icon;
                      return React.createElement(
                        'div',
                        {
                          key: a.key,
                          className: cx(
                            'rounded-[9px] border border-white/10 bg-slate-900/10 p-3',
                            singleSmartAction && 'flex-1'
                          ),
                        },
                        React.createElement(
                          'div',
                          { className: 'flex items-start gap-3' },
                          React.createElement(
                            'div',
                            {
                              className:
                                'grid h-10 w-10 place-items-center rounded-2xl bg-slate-900/20',
                            },
                            React.createElement(Icon, {
                              className: 'h-5 w-5',
                              style: { color: TOKENS.green },
                            })
                          ),
                          React.createElement(
                            'div',
                            { className: 'min-w-0 flex-1' },
                            React.createElement(
                              'div',
                              { className: 'flex items-center gap-2' },
                              React.createElement(
                                'div',
                                { className: 'truncate text-[12px] font-extrabold text-white' },
                                a.label
                              ),
                              React.createElement(
                                'span',
                                {
                                  className:
                                    'ml-auto rounded-full border border-white/15 bg-slate-900/20 px-2 py-1 text-[10px] font-extrabold text-white',
                                },
                                Math.round(a.score)
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'mt-1 text-[11px] font-semibold text-white/70' },
                              a.reason
                            ),
                            React.createElement(
                              'div',
                              {
                                className:
                                  'mt-2 flex flex-wrap items-center gap-2 text-[10px] font-extrabold text-white/70',
                              },
                              React.createElement(
                                'span',
                                {
                                  className:
                                    'rounded-full border border-white/10 bg-slate-900/10 px-2 py-1',
                                },
                                a.impact
                              ),
                              React.createElement(
                                'span',
                                {
                                  className:
                                    'rounded-full border border-white/10 bg-slate-900/10 px-2 py-1',
                                },
                                'Effort: ',
                                a.effort
                              )
                            )
                          ),
                          React.createElement(
                            'button',
                            {
                              type: 'button',
                              onClick: () => navigate(a.to),
                              className:
                                'shrink-0 rounded-full border border-white/15 bg-slate-900/20 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-slate-800/25',
                            },
                            'Open'
                          )
                        )
                      );
                    })
                  )
                : insightsTab === 'changed'
                  ? React.createElement(
                      'div',
                      {
                        className:
                          'mt-4 flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto pr-1',
                      },
                      React.createElement(
                        'div',
                        { className: 'rounded-[9px] border border-white/10 bg-slate-900/10 p-3' },
                        React.createElement(
                          'div',
                          { className: 'text-[11px] font-extrabold text-white/70' },
                          'What changed since yesterday?'
                        ),
                        React.createElement(
                          'div',
                          { className: 'mt-2 text-[14px] font-black text-white' },
                          model.smart.headline
                        ),
                        React.createElement(
                          'div',
                          { className: 'mt-1 text-[11px] font-semibold text-white/60' },
                          'Top 3 drivers: conversion, cancellations, disputes.'
                        )
                      ),

                      model.smart.drivers.slice(0, 3).map((d) => {
                        const Icon = d.icon;
                        return React.createElement(
                          'button',
                          {
                            key: d.key,
                            type: 'button',
                            onClick: () => navigate(d.to),
                            className:
                              'w-full rounded-[9px] border border-white/10 bg-slate-900/10 p-3 text-left hover:bg-slate-800/25',
                          },

                          React.createElement(
                            'div',
                            { className: 'flex items-start gap-3' },
                            React.createElement(
                              'div',
                              {
                                className:
                                  'grid h-10 w-10 place-items-center rounded-2xl bg-slate-900/20',
                              },
                              React.createElement(Icon, {
                                className: 'h-5 w-5',
                                style: {
                                  color:
                                    d.key === 'cancel'
                                      ? TOKENS.orange
                                      : d.key === 'dispute'
                                        ? TOKENS.blue
                                        : TOKENS.green,
                                },
                              })
                            ),
                            React.createElement(
                              'div',
                              { className: 'min-w-0 flex-1' },
                              React.createElement(
                                'div',
                                { className: 'flex items-center justify-between gap-2' },
                                React.createElement(
                                  'div',
                                  { className: 'truncate text-[12px] font-extrabold text-white' },
                                  d.label
                                ),
                                React.createElement(
                                  'div',
                                  { className: 'text-[10px] font-extrabold text-white/70' },
                                  d.impactLabel
                                )
                              ),
                              React.createElement(
                                'div',
                                {
                                  className:
                                    'mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/70',
                                },
                                React.createElement(
                                  'span',
                                  {
                                    className:
                                      'rounded-full border border-white/10 bg-slate-900/10 px-2 py-1',
                                  },
                                  d.deltaLabel
                                ),
                                React.createElement(
                                  'span',
                                  { className: 'truncate text-white/60' },
                                  d.note
                                )
                              )
                            ),
                            React.createElement(ChevronRight, {
                              className: 'h-4 w-4 text-white/50',
                            })
                          )
                        );
                      })
                    )
                  : insightsTab === 'alerts'
                    ? React.createElement(
                        'div',
                        {
                          className:
                            'mt-4 flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto pr-1',
                        },
                        model.smart.alerts.length
                          ? model.smart.alerts.map((a) => {
                              const Icon = a.icon;
                              const badge =
                                a.level === 'critical'
                                  ? 'border-rose-500/30 bg-rose-500/20 text-rose-100'
                                  : a.level === 'warning'
                                    ? 'border-amber-500/30 bg-amber-500/20 text-amber-100'
                                    : 'border-sky-500/30 bg-sky-500/20 text-sky-100';
                              return React.createElement(
                                'button',
                                {
                                  key: a.key,
                                  type: 'button',
                                  onClick: () => navigate(a.to),
                                  className: cx(
                                    'w-full rounded-[9px] border border-white/10 bg-slate-900/10 p-3 text-left hover:bg-slate-800/25',
                                    singleSmartAlert && 'flex-1'
                                  ),
                                },

                                React.createElement(
                                  'div',
                                  { className: 'flex items-start gap-3' },
                                  React.createElement(
                                    'div',
                                    {
                                      className:
                                        'grid h-10 w-10 place-items-center rounded-2xl bg-slate-900/20',
                                    },
                                    React.createElement(Icon, {
                                      className: 'h-5 w-5',
                                      style: {
                                        color:
                                          a.level === 'critical' ? TOKENS.orange : TOKENS.green,
                                      },
                                    })
                                  ),
                                  React.createElement(
                                    'div',
                                    { className: 'min-w-0 flex-1' },
                                    React.createElement(
                                      'div',
                                      { className: 'flex items-center justify-between gap-2' },
                                      React.createElement(
                                        'div',
                                        {
                                          className:
                                            'truncate text-[12px] font-extrabold text-white',
                                        },
                                        a.metric
                                      ),
                                      React.createElement(
                                        'span',
                                        {
                                          className: cx(
                                            'rounded-full border px-2 py-1 text-[10px] font-extrabold',
                                            badge
                                          ),
                                        },
                                        a.level
                                      )
                                    ),
                                    React.createElement(
                                      'div',
                                      {
                                        className:
                                          'mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/70',
                                      },
                                      React.createElement(
                                        'span',
                                        {
                                          className:
                                            'rounded-full border border-white/10 bg-slate-900/10 px-2 py-1',
                                        },
                                        'Now: ',
                                        a.valueLabel
                                      ),
                                      React.createElement(
                                        'span',
                                        {
                                          className:
                                            'rounded-full border border-white/10 bg-slate-900/10 px-2 py-1',
                                        },
                                        'Δ: ',
                                        a.deltaLabel
                                      )
                                    ),
                                    React.createElement(
                                      'div',
                                      { className: 'mt-2 text-[11px] font-semibold text-white/60' },
                                      a.note
                                    )
                                  ),
                                  React.createElement(ChevronRight, {
                                    className: 'h-4 w-4 text-white/50',
                                  })
                                )
                              );
                            })
                          : React.createElement(
                              'div',
                              { className: 'rounded-[9px] border border-white/10 bg-slate-900/10 p-3' },
                              React.createElement(
                                'div',
                                {
                                  className:
                                    'flex items-center gap-2 text-[12px] font-extrabold text-white',
                                },
                                React.createElement(CheckCircle2, {
                                  className: 'h-4 w-4',
                                  style: { color: TOKENS.green },
                                }),
                                'No anomalies detected'
                              ),
                              React.createElement(
                                'div',
                                { className: 'mt-1 text-[11px] font-semibold text-white/60' },
                                'We’ll flag spikes/drops for conversion, cancellations, and disputes.'
                              )
                            )
                      )
                    : React.createElement(
                        'div',
                        {
                          className: 'mt-4 flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto',
                        },
                        React.createElement(
                          'div',
                          { className: 'rounded-[9px] border border-white/10 bg-slate-900/10 p-3' },
                          React.createElement(
                            'div',
                            { className: 'text-[11px] font-extrabold text-white/70' },
                            'Ask EVzone AI'
                          ),
                          React.createElement(
                            'div',
                            { className: 'mt-3 flex gap-2' },
                            React.createElement('input', {
                              value: askPrompt,
                              onChange: (e) => setAskPrompt(e.target.value),
                              onKeyDown: (e) => {
                                if (e.key === 'Enter') runAskAi();
                              },
                              placeholder: 'Why did orders drop?',
                              className:
                                'w-full rounded-2xl border border-white/10 bg-slate-900/20 px-4 py-3 text-[12px] font-extrabold text-white outline-none placeholder:text-white/40',
                            }),
                            React.createElement(
                              'button',
                              {
                                type: 'button',
                                onClick: runAskAi,
                                className:
                                  'rounded-2xl border border-white/15 bg-slate-900/20 px-4 py-3 text-[12px] font-extrabold text-white hover:bg-slate-800/25',
                              },
                              'Ask'
                            )
                          ),

                          askAnswer
                            ? React.createElement(
                                'div',
                                {
                                  className:
                                    'mt-3 rounded-[8px] border border-white/10 bg-slate-900/10 p-3',
                                },
                                React.createElement(
                                  'div',
                                  { className: 'text-[11px] font-semibold text-white/80' },
                                  askAnswer.summary
                                ),
                                React.createElement(
                                  'div',
                                  { className: 'mt-3 flex flex-wrap gap-2' },
                                  askAnswer.drilldowns.map((d) =>
                                    React.createElement(
                                      'button',
                                      {
                                        key: d.to,
                                        type: 'button',
                                        onClick: () => navigate(d.to),
                                        className:
                                          'rounded-full border border-white/15 bg-slate-900/20 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-slate-800/25',
                                      },

                                      d.label
                                    )
                                  )
                                )
                              )
                            : React.createElement(
                                'div',
                                { className: 'mt-3 text-[11px] font-semibold text-white/60' },
                                'Try: “What should I do first to recover revenue?”'
                              )
                        )
                      ),

              /* Health snapshot */
              React.createElement(
                'div',
                { className: 'mt-5 rounded-[9px] border border-white/10 bg-slate-900/10 p-3' },
                React.createElement(
                  'div',
                  { className: 'flex items-center gap-2' },
                  React.createElement(Activity, { className: 'h-4 w-4 text-white/70' }),
                  React.createElement(
                    'div',
                    { className: 'text-[12px] font-extrabold text-white/80' },
                    'Health snapshot'
                  ),
                  React.createElement(
                    'span',
                    { className: 'ml-auto text-[10px] font-extrabold text-white/50' },
                    'Auto'
                  )
                ),
                React.createElement(
                  'div',
                  { className: 'mt-3 space-y-2' },
                  React.createElement(ProgressDark, {
                    label: 'Trust readiness',
                    value: model.health.trust,
                  }),
                  React.createElement(ProgressDark, {
                    label: 'Response speed',
                    value: model.health.response,
                  }),
                  React.createElement(ProgressDark, {
                    label: 'SLA stability',
                    value: model.health.sla,
                  })
                ),
                React.createElement(
                  'div',
                  { className: 'mt-3 text-[11px] font-semibold text-white/60' },
                  'Tip: improving trust raises ranking and conversion.'
                )
              ),

              /* Tools grid */
              React.createElement(
                'div',
                { className: 'mt-5 grid grid-cols-3 gap-1' },
                model.tools.map((t) => {
                  const Ico = t.icon;
                  return React.createElement(
                    'button',
                    {
                      key: t.label,
                      type: 'button',
                      onClick: () => navigate(t.to),
                      className:
                        'group rounded-[9px] border border-white/10 bg-slate-900/10 p-2.5 text-left hover:bg-slate-800/25',
                    },

                    React.createElement(
                      'div',
                      { className: 'flex items-center gap-2' },
                      React.createElement(
                        'div',
                        {
                          className: 'grid h-10 w-10 place-items-center rounded-2xl',
                          style: {
                            background:
                              'linear-gradient(135deg, rgba(3,205,140,0.22), rgba(247,127,0,0.10))',
                          },
                        },

                        React.createElement(Ico, { className: 'h-5 w-5 text-white' })
                      ),
                      React.createElement(
                        'div',
                        { className: 'min-w-0' },
                        React.createElement(
                          'div',
                          { className: 'truncate text-[11px] font-extrabold text-white' },
                          t.label
                        ),
                        React.createElement(
                          'div',
                          { className: 'text-[10px] font-semibold text-white/55' },
                          'Open'
                        )
                      )
                    )
                  );
                })
              )
            )
          ),

          /* Finance Layer */
          React.createElement(
            'div',
            { className: 'col-span-12 lg:col-span-8 lg:-mt-6 lg:h-full lg:pr-2' },
            React.createElement(
              'div',
              {
                className:
                  'grid grid-cols-12 items-stretch gap-1.5 lg:h-full lg:content-start lg:grid-rows-[auto_auto_auto]',
              },
              React.createElement(
                'div',
                { className: 'col-span-12' },
                React.createElement(
                  'div',
                  { className: 'mt-1 text-[12px] font-extrabold text-slate-500' },
                  'Finance'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-1 text-[18px] font-black text-slate-900' },
                  'Settlement, cashflow, and fees'
                )
              ),
              // Added compact finance stats so the section fills out naturally without blank gaps.
              React.createElement(
                'div',
                { className: 'col-span-12 grid grid-cols-12 gap-1.5' },
                model.financeHighlights.map((h) => {
                  const Icon = h.icon;
                  const toneClass =
                    h.tone === 'emerald'
                      ? 'bg-emerald-50 text-emerald-700'
                      : h.tone === 'orange'
                        ? 'bg-orange-50 text-orange-700'
                        : h.tone === 'blue'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-700';
                  return React.createElement(
                    'div',
                    { key: h.key, className: 'col-span-12 sm:col-span-6 lg:col-span-3 lg:px-0.5' },
                    React.createElement(
                      'div',
                      {
                        className:
                          'rounded-[10px] border border-slate-200/70 bg-white dark:bg-slate-900 p-4 shadow-[0_12px_30px_rgba(2,16,23,0.08)]',
                      },
                      React.createElement(
                        'div',
                        { className: 'flex items-center justify-between gap-3' },
                        React.createElement(
                          'div',
                          { className: 'min-w-0' },
                          React.createElement(
                            'div',
                            { className: 'text-[11px] font-extrabold text-slate-500' },
                            h.label
                          ),
                          React.createElement(
                            'div',
                            { className: 'mt-1 truncate text-[16px] font-black text-slate-900' },
                            h.value
                          )
                        ),
                        React.createElement(
                          'div',
                          { className: `grid h-9 w-9 place-items-center rounded-2xl ${toneClass}` },
                          React.createElement(Icon, { className: 'h-4 w-4' })
                        )
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-2 text-[11px] font-semibold text-slate-500' },
                        h.hint
                      )
                    )
                  );
                })
              ),

              /* Settlement timeline */
              React.createElement(
                'div',
                { className: 'col-span-12 lg:col-span-6 lg:px-0.5' },
                React.createElement(
                  'div',
                  {
                    className:
                      'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)] flex flex-col',
                  },
                  React.createElement(
                    'div',
                    { className: 'flex items-center justify-between' },
                    React.createElement(
                      'div',
                      {},
                      React.createElement(
                        'div',
                        { className: 'text-[12px] font-extrabold text-slate-500' },
                        'Settlement timeline'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[16px] font-black text-slate-900' },
                        'Where money is right now'
                      )
                    ),
                    React.createElement(
                      'div',
                      {
                        className:
                          'grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700',
                      },
                      React.createElement(Banknote, { className: 'h-5 w-5' })
                    )
                  ),

                  React.createElement(
                    'div',
                    { className: 'mt-4 grid gap-2' },
                    model.settlementStages.map((s, i) =>
                      React.createElement(
                        'button',
                        {
                          key: s.key,
                          type: 'button',
                          onClick: () => setDrawer({ kind: 'settlement', stage: s, currency }),
                          className:
                            'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left hover:bg-gray-50 dark:bg-slate-950',
                        },

                        React.createElement(
                          'div',
                          { className: 'flex items-center justify-between' },
                          React.createElement(
                            'div',
                            { className: 'flex items-center gap-2' },
                            React.createElement('span', {
                              className: 'h-2.5 w-2.5 rounded-full',
                              style: {
                                background:
                                  i === 0 ? TOKENS.orange : i === 1 ? '#64748B' : TOKENS.green,
                              },
                            }),
                            React.createElement(
                              'div',
                              { className: 'text-[12px] font-extrabold text-slate-900' },
                              s.label
                            )
                          ),
                          React.createElement(
                            'div',
                            { className: 'text-[12px] font-black text-slate-900' },
                            formatMoney(s.amount, currency)
                          )
                        ),
                        React.createElement(
                          'div',
                          { className: 'mt-1 text-[11px] font-semibold text-slate-500' },
                          s.date,
                          ' • ',
                          s.hint
                        )
                      )
                    )
                  ),

                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => navigate('/finance/statements'),
                      className:
                        'mt-auto w-full rounded-full border border-white/10 bg-[rgba(3,205,140,0.18)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(3,205,140,0.24)]',
                    },
                    'Open Settlements'
                  )
                )
              ),

              /* Cashflow preview */
              React.createElement(
                'div',
                { className: 'col-span-12 lg:col-span-6 lg:px-0.5' },
                React.createElement(
                  'div',
                  {
                    className:
                      'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)] flex flex-col',
                  },
                  React.createElement(
                    'div',
                    { className: 'flex items-center justify-between' },
                    React.createElement(
                      'div',
                      {},
                      React.createElement(
                        'div',
                        { className: 'text-[12px] font-extrabold text-slate-500' },
                        'Cashflow preview'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[16px] font-black text-slate-900' },
                        'Next 7 days'
                      )
                    ),
                    React.createElement(
                      'div',
                      {
                        className:
                          'grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700',
                      },
                      React.createElement(CreditCard, { className: 'h-5 w-5' })
                    )
                  ),

                  React.createElement(
                    'div',
                    { className: 'mt-4 h-[190px]' },
                    React.createElement(
                      ResponsiveContainer as ChartComponent,
                      { width: '100%', height: '100%' },
                      React.createElement(
                        BarChart,
                        {
                          data: model.cashflow,
                          margin: { top: 10, right: 10, bottom: 0, left: 0 },
                        },
                        React.createElement(Tooltip as ChartComponent, {
                          contentStyle: {
                            background: 'rgba(255,255,255,0.95)',
                            border: '1px solid rgba(148,163,184,0.35)',
                            borderRadius: 14,
                            fontSize: 12,
                            fontWeight: 700,
                          },
                          formatter: (v) => formatMoney(Number(v), currency),
                          labelFormatter: (l) => `Day: ${l}`,
                        }),
                        React.createElement(Bar as unknown as ChartComponent, {
                          dataKey: 'inflow',
                          radius: [8, 8, 8, 8],
                          fill: TOKENS.green,
                          onClick: (data) => {
                            if (data?.payload)
                              setDrawer({ kind: 'cashflow', day: data.payload, currency });
                          },
                        }),
                        React.createElement(Bar as unknown as ChartComponent, {
                          dataKey: 'payout',
                          radius: [8, 8, 8, 8],
                          fill: TOKENS.orange,
                          onClick: (data) => {
                            if (data?.payload)
                              setDrawer({ kind: 'cashflow', day: data.payload, currency });
                          },
                        })
                      )
                    )
                  ),

                  React.createElement(
                    'div',
                    { className: 'mt-auto flex items-center gap-3 text-[11px] font-extrabold' },
                    React.createElement(
                      'span',
                      { className: 'inline-flex items-center gap-2 text-slate-600' },
                      React.createElement('span', {
                        className: 'h-2.5 w-2.5 rounded-full',
                        style: { background: TOKENS.green },
                      }),
                      'Inflows'
                    ),
                    React.createElement(
                      'span',
                      { className: 'inline-flex items-center gap-2 text-slate-600' },
                      React.createElement('span', {
                        className: 'h-2.5 w-2.5 rounded-full',
                        style: { background: TOKENS.orange },
                      }),
                      'Payouts'
                    ),
                    React.createElement(
                      'span',
                      { className: 'ml-auto text-[11px] font-extrabold text-slate-500' },
                      'Click bars'
                    )
                  )
                )
              ),

            )
          )
        ),

        /* Operational Command Center */
        React.createElement(
          'div',
          { className: 'col-span-12' },
          React.createElement(
            'div',
            { className: 'mt-1 text-[12px] font-extrabold text-slate-500' },
            'Operational Command Center'
          ),
          React.createElement(
            'div',
            { className: 'mt-1 text-[18px] font-black text-slate-900' },
            'Fulfillment, risks, and inventory control'
          )
        ),

        /* Ops Pipeline */
        React.createElement(
          'div',
          { className: 'col-span-12 lg:col-span-4' },
          React.createElement(
            'div',
            {
              className:
                'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)]',
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement(
                'div',
                {},
                React.createElement(
                  'div',
                  { className: 'text-[12px] font-extrabold text-slate-500' },
                  'Ops pipeline'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-1 text-[16px] font-black text-slate-900' },
                  'Orders → Delivery'
                )
              ),
              React.createElement(
                'div',
                {
                  className:
                    'grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700',
                },
                React.createElement(Truck, { className: 'h-5 w-5' })
              )
            ),

            React.createElement(
              'div',
              { className: 'mt-4 grid gap-3' },
              model.opsPipeline.map((s, idx) =>
                React.createElement(
                  'button',
                  {
                    key: s.key,
                    type: 'button',
                    onClick: () => setDrawer({ kind: 'ops', stage: s }),
                    className:
                      'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left hover:bg-gray-50 dark:bg-slate-950',
                  },

                  React.createElement(
                    'div',
                    { className: 'flex items-center justify-between' },
                    React.createElement(
                      'div',
                      { className: 'flex items-center gap-2' },
                      React.createElement('span', {
                        className: 'h-2.5 w-2.5 rounded-full',
                        style: {
                          background:
                            idx === 0
                              ? TOKENS.green
                              : idx === 1
                                ? '#64748B'
                                : idx === 2
                                  ? TOKENS.orange
                                  : '#94A3B8',
                        },
                      }),
                      React.createElement(
                        'div',
                        { className: 'text-[12px] font-extrabold text-slate-900' },
                        s.label
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'text-[12px] font-black text-slate-900' },
                      formatCount(s.count)
                    )
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-[11px] font-semibold text-slate-500' },
                    'SLA: ',
                    s.sla
                  )
                )
              )
            ),

            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => navigate('/ops'),
                className:
                  'mt-4 w-full rounded-full border border-white/10 bg-[rgba(3,205,140,0.18)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(3,205,140,0.24)]',
              },
              'Open Ops Center'
            ),

            React.createElement(
              'div',
              { className: 'mt-3 grid grid-cols-3 gap-2' },
              [
                { label: 'In pipeline', value: formatCount(opsTotalCount) },
                { label: 'SLA risk', value: formatCount(opsSlaRiskCount) },
                { label: 'Delivered', value: `${opsDeliveredPct}%` },
              ].map((stat) =>
                React.createElement(
                  'div',
                  {
                    key: stat.label,
                    className:
                      'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 px-2 py-2 text-center',
                  },
                  React.createElement(
                    'div',
                    { className: 'text-[10px] font-extrabold text-slate-500' },
                    stat.label
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-[12px] font-black text-slate-900' },
                    stat.value
                  )
                )
              )
            )
          )
        ),

        /* Risk Radar */
        React.createElement(
          'div',
          { className: 'col-span-12 lg:col-span-4' },
          React.createElement(
            'div',
            {
              className:
                'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)]',
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement(
                'div',
                {},
                React.createElement(
                  'div',
                  { className: 'text-[12px] font-extrabold text-slate-500' },
                  'Risk radar'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-1 text-[16px] font-black text-slate-900' },
                  'Where attention is needed'
                )
              ),
              React.createElement(
                'div',
                {
                  className:
                    'grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-700',
                },
                React.createElement(AlertTriangle, { className: 'h-5 w-5' })
              )
            ),

            React.createElement(
              'div',
              { className: 'mt-4 h-[170px]' },
              React.createElement(
                ResponsiveContainer as ChartComponent,
                { width: '100%', height: '100%' },
                React.createElement(
                  RadarChart,
                  { data: model.riskItems.map((r) => ({ subject: r.label, score: r.score })) },
                  React.createElement(PolarGrid, {}),
                  React.createElement(PolarAngleAxis as ChartComponent, {
                    dataKey: 'subject',
                    tick: { fontSize: 10, fontWeight: 800 },
                  }),
                  React.createElement(Radar as unknown as ChartComponent, {
                    dataKey: 'score',
                    stroke: TOKENS.orange,
                    fill: TOKENS.orange,
                    fillOpacity: 0.12,
                  }),
                  React.createElement(Tooltip as ChartComponent, {
                    contentStyle: {
                      background: 'rgba(255,255,255,0.95)',
                      border: '1px solid rgba(148,163,184,0.35)',
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 700,
                    },
                  })
                )
              )
            ),

            React.createElement(
              'div',
              { className: 'mt-3 grid gap-2' },
              model.riskItems.map((r) =>
                React.createElement(
                  'button',
                  {
                    key: r.key,
                    type: 'button',
                    onClick: () => setDrawer({ kind: 'risk', item: r }),
                    className:
                      'flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left hover:bg-gray-50 dark:bg-slate-950',
                  },

                  React.createElement(
                    'div',
                    {
                      className:
                        'grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700',
                    },
                    React.createElement(BarChart3, { className: 'h-5 w-5' })
                  ),
                  React.createElement(
                    'div',
                    { className: 'min-w-0 flex-1' },
                    React.createElement(
                      'div',
                      { className: 'text-[12px] font-extrabold text-slate-900' },
                      r.label
                    ),
                    React.createElement(
                      'div',
                      { className: 'mt-0.5 text-[11px] font-semibold text-slate-500' },
                      r.hint
                    )
                  ),
                  React.createElement(
                    'div',
                    { className: 'text-right' },
                    React.createElement(
                      'div',
                      { className: 'text-[12px] font-black text-slate-900' },
                      r.count
                    ),
                    React.createElement(
                      'div',
                      { className: 'text-[11px] font-extrabold text-slate-500' },
                      Math.round(r.score),
                      '/100'
                    )
                  ),
                  React.createElement(ChevronRight, { className: 'h-4 w-4 text-slate-300' })
                )
              )
            )
          )
        ),

        /* Inventory Risk */
        React.createElement(
          'div',
          { className: 'col-span-12 lg:col-span-4' },
          React.createElement(
            'div',
            {
              className:
                'h-full rounded-[11px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 text-white shadow-[0_26px_70px_rgba(2,16,23,0.36)] flex flex-col',
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement(
                'div',
                {},
                React.createElement(
                  'div',
                  { className: 'text-[12px] font-extrabold text-white/70' },
                  'Inventory risk'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-1 text-[16px] font-black' },
                  'Stock signals'
                )
              ),
              React.createElement(
                'div',
                { className: 'grid h-10 w-10 place-items-center rounded-2xl bg-slate-900/20' },
                React.createElement(Boxes, { className: 'h-5 w-5', style: { color: TOKENS.green } })
              )
            ),

            React.createElement(
              'div',
              { className: 'mt-4 flex flex-1 flex-col justify-between gap-3' },
              model.inventoryRisk.map((it) =>
                React.createElement(
                  'button',
                  {
                    key: it.key,
                    type: 'button',
                    onClick: () => setDrawer({ kind: 'inventory', item: it }),
                    className:
                      'rounded-3xl border border-white/10 bg-slate-900/10 px-4 py-3 text-left hover:bg-slate-800/25',
                  },

                  React.createElement(
                    'div',
                    { className: 'flex items-center justify-between' },
                    React.createElement(
                      'div',
                      {},
                      React.createElement(
                        'div',
                        { className: 'text-[12px] font-extrabold text-white' },
                        it.label
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-0.5 text-[11px] font-semibold text-white/70' },
                        it.hint
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'text-[13px] font-black text-white' },
                      it.count
                    )
                  )
                )
              )
            ),

            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => navigate('/inventory'),
                className:
                  'mt-4 w-full rounded-full border border-white/10 bg-slate-900/20 px-4 py-2 text-[12px] font-extrabold text-white hover:bg-slate-800/25',
              },
              'Open Inventory'
            ),

            React.createElement(
              'div',
              { className: 'mt-3 grid grid-cols-2 gap-2' },
              [
                { label: 'At-risk SKUs', value: formatCount(inventoryTotalRisk) },
                { label: 'Low stock', value: formatCount(inventoryLowStock) },
                { label: 'Fast movers', value: formatCount(inventoryFastMovers) },
                { label: 'Dead stock', value: formatCount(inventoryDeadStock) },
              ].map((stat) =>
                React.createElement(
                  'div',
                  {
                    key: stat.label,
                    className:
                      'rounded-2xl border border-white/10 bg-slate-900/10 px-3 py-2 text-center',
                  },
                  React.createElement(
                    'div',
                    { className: 'text-[10px] font-extrabold text-white/60' },
                    stat.label
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-[12px] font-black text-white' },
                    stat.value
                  )
                )
              )
            )
          )
        ),

        /* Trust, compliance, and quality */
        React.createElement(
          'div',
          { className: 'col-span-12' },
          React.createElement(
            'div',
            { className: 'mt-1 text-[12px] font-extrabold text-slate-500' },
            'Trust & compliance'
          ),
          React.createElement(
            'div',
            { className: 'mt-1 text-[18px] font-black text-slate-900' },
            'Trust score, regulatory desks, and account health'
          )
        ),

        /* Trust score breakdown */
        React.createElement(
          'div',
          { className: 'col-span-12 lg:col-span-4' },
          React.createElement(
            'div',
            {
              className:
                'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)]',
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement(
                'div',
                {},
                React.createElement(
                  'div',
                  { className: 'text-[12px] font-extrabold text-slate-500' },
                  'Trust score'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-1 text-[16px] font-black text-slate-900' },
                  'Marketplace readiness'
                )
              ),
              React.createElement(
                'div',
                {
                  className:
                    'grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700',
                },
                React.createElement(BadgeCheck, { className: 'h-5 w-5' })
              )
            ),

            React.createElement(
              'div',
              { className: 'mt-4 rounded-[9px] border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-end justify-between' },
                React.createElement(
                  'div',
                  {},
                  React.createElement(
                    'div',
                    { className: 'text-[11px] font-extrabold text-slate-500' },
                    'Overall'
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-[28px] font-black text-slate-900' },
                    model.trustSignals.breakdown.score
                  )
                ),
                React.createElement(
                  'div',
                  { className: 'text-right' },
                  React.createElement(
                    'div',
                    { className: 'text-[11px] font-extrabold text-slate-500' },
                    'Target'
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-[12px] font-black text-slate-900' },
                    '85+'
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'mt-3 text-[11px] font-semibold text-slate-600' },
                'Higher trust unlocks premium placement, faster payouts, and fewer policy checks.'
              )
            ),

            React.createElement(
              'div',
              { className: 'mt-4 grid gap-3' },
              React.createElement(ProgressLight, {
                label: 'KYC',
                value: model.trustSignals.breakdown.kyc,
              }),
              React.createElement(ProgressLight, {
                label: 'Shipping SLA',
                value: model.trustSignals.breakdown.shippingSla,
              }),
              React.createElement(ProgressLight, {
                label: 'Dispute rate',
                value: model.trustSignals.breakdown.disputeRate,
              }),
              React.createElement(ProgressLight, {
                label: 'Response time',
                value: model.trustSignals.breakdown.responseTime,
              }),
              React.createElement(ProgressLight, {
                label: 'Product quality',
                value: model.trustSignals.breakdown.productQuality,
              })
            ),

            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => navigate('/trust'),
                className:
                  'mt-4 w-full rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950',
              },
              'Open Trust details'
            )
          )
        ),

        /* Regulatory desk status */
        React.createElement(
          'div',
          { className: 'col-span-12 lg:col-span-4' },
          React.createElement(
            'div',
            {
              className:
                'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)]',
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement(
                'div',
                {},
                React.createElement(
                  'div',
                  { className: 'text-[12px] font-extrabold text-slate-500' },
                  'Regulatory desks'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-1 text-[16px] font-black text-slate-900' },
                  'Category compliance'
                )
              ),
              React.createElement(
                'div',
                {
                  className:
                    'grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700',
                },
                React.createElement(ShieldCheck, { className: 'h-5 w-5' })
              )
            ),

            React.createElement(
              'div',
              { className: 'mt-4 grid gap-3' },
              model.trustSignals.regulatory.map((st) => {
                const uploaded = proofs[st.key]?.length ?? 0;
                const derivedStatus = uploaded && st.required ? 'Submitted' : st.status;
                return React.createElement(
                  'div',
                  { key: st.key, className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
                  React.createElement(
                    'div',
                    { className: 'flex items-start justify-between gap-3' },
                    React.createElement(
                      'div',
                      { className: 'min-w-0' },
                      React.createElement(
                        'div',
                        { className: 'text-[12px] font-extrabold text-slate-900' },
                        st.category
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[11px] font-semibold text-slate-500' },
                        st.note
                      ),
                      uploaded
                        ? React.createElement(
                            'div',
                            { className: 'mt-2 text-[10px] font-extrabold text-slate-600' },
                            'Attached: ',
                            proofs[st.key]?.join(', ')
                          )
                        : null
                    ),
                    React.createElement(
                      'div',
                      { className: 'flex shrink-0 flex-col items-end gap-2' },
                      React.createElement(StatusBadge, { status: derivedStatus }),
                      st.required
                        ? React.createElement(
                            'label',
                            {
                              className:
                                'cursor-pointer rounded-full border border-slate-200/70 bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-slate-800',
                            },
                            React.createElement('input', {
                              type: 'file',
                              multiple: true,
                              className: 'hidden',
                              onChange: (e) => {
                                const files = Array.from(e.target.files || []).map((f) => f.name);
                                if (!files.length) return;
                                setProofs((prev) => ({ ...prev, [st.key]: files }));
                                showToast('Proofs attached (local)');
                              },
                            }),
                            'Upload proofs'
                          )
                        : React.createElement(
                            'button',
                            {
                              type: 'button',
                              onClick: () => navigate(st.to),
                              className:
                                'rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950',
                            },
                            'Open'
                          )
                    )
                  )
                );
              })
            ),

            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => navigate('/regulatory'),
                className:
                  'mt-4 w-full rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950',
              },
              'Open Regulatory center'
            )
          )
        ),

        /* Account health timeline */
        React.createElement(
          'div',
          { className: 'col-span-12 lg:col-span-4' },
          React.createElement(
            'div',
            {
              className:
                'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)]',
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement(
                'div',
                {},
                React.createElement(
                  'div',
                  { className: 'text-[12px] font-extrabold text-slate-500' },
                  'Account health'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-1 text-[16px] font-black text-slate-900' },
                  'Audit timeline'
                )
              ),
              React.createElement(
                'div',
                {
                  className:
                    'grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700',
                },
                React.createElement(Clock, { className: 'h-5 w-5' })
              )
            ),

            React.createElement(
              'div',
              { className: 'mt-4 space-y-3' },
              model.trustSignals.timeline.map((ev) =>
                React.createElement(
                  'div',
                  { key: ev.key, className: 'flex items-start gap-3' },
                  React.createElement('div', {
                    className: 'mt-1 h-2.5 w-2.5 rounded-full',
                    style: {
                      background:
                        ev.tone === 'good'
                          ? TOKENS.green
                          : ev.tone === 'warn'
                            ? TOKENS.orange
                            : '#F43F5E',
                    },
                  }),
                  React.createElement(
                    'div',
                    { className: 'min-w-0 flex-1' },
                    React.createElement(
                      'div',
                      { className: 'flex items-center justify-between gap-2' },
                      React.createElement(
                        'div',
                        { className: 'truncate text-[12px] font-extrabold text-slate-900' },
                        ev.title
                      ),
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        ev.date
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'mt-1 text-[11px] font-semibold text-slate-500' },
                      ev.detail
                    )
                  )
                )
              )
            ),

            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => navigate('/account/health'),
                className:
                  'mt-4 w-full rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950',
              },
              'View audit log'
            )
          )
        ),

        /* QUICK ACTIONS */
        React.createElement(
          'div',
          { className: 'col-span-12' },
          React.createElement(
            'div',
            {
              className:
                'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900/80 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)]',
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between' },
              React.createElement(
                'div',
                {},
                React.createElement(
                  'div',
                  { className: 'text-[12px] font-extrabold text-slate-500' },
                  'Quick actions'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-1 text-[16px] font-black text-slate-900' },
                  'Do the next best step instantly'
                )
              ),
              React.createElement(
                'div',
                {
                  className:
                    'grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700',
                },
                React.createElement(Plus, { className: 'h-5 w-5' })
              )
            ),

            React.createElement(
              'div',
              { className: 'mt-4 flex flex-wrap gap-2' },
              model.quickActions.map((a) => {
                const Ico = a.icon;
                return React.createElement(
                  'button',
                  {
                    key: a.label,
                    type: 'button',
                    onClick: () => navigate(a.to),
                    className:
                      'inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(3,205,140,0.16)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(3,205,140,0.22)]',
                  },

                  React.createElement(Ico, { className: 'h-4 w-4' }),
                  a.label
                );
              })
            )
          )
        ),

        /* GLOBAL CONTROLS */
        React.createElement(
          'div',
          { className: 'col-span-12' },
          React.createElement(
            'div',
            {
              className:
                'h-full rounded-[11px] border border-slate-200/70 bg-white dark:bg-slate-900/80 p-5 shadow-[0_18px_55px_rgba(2,16,23,0.08)]',
            },
            React.createElement(
              'div',
              { className: 'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between' },
              React.createElement(
                'div',
                { className: 'flex flex-wrap items-center gap-3' },
                React.createElement(
                  'div',
                  {
                    className:
                      'inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2',
                  },
                  React.createElement(Bookmark, { className: 'h-4 w-4 text-slate-500' }),
                  React.createElement(
                    'div',
                    { className: 'text-[12px] font-extrabold text-slate-700' },
                    'Saved view'
                  ),
                  React.createElement(
                    'select',
                    {
                      value: viewId,
                      onChange: (e) => setViewId(e.target.value),
                      className:
                        'ml-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1 text-[12px] font-extrabold text-slate-900 outline-none',
                    },

                    React.createElement(
                      'optgroup',
                      { label: 'Presets' },
                      PRESET_VIEWS.map((v) =>
                        React.createElement('option', { key: v.id, value: v.id }, v.name)
                      )
                    ),
                    customViews.length
                      ? React.createElement(
                          'optgroup',
                          { label: 'My views' },
                          customViews.map((v) =>
                            React.createElement('option', { key: v.id, value: v.id }, v.name)
                          )
                        )
                      : null,
                    React.createElement('option', { value: 'custom' }, 'Custom (unsaved)')
                  ),

                  React.createElement(
                    'div',
                    {
                      className:
                        'ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700',
                    },
                    React.createElement(CalendarRange, { className: 'h-4 w-4' }),
                    rangeMeta.label
                  ),

                  viewId === defaultViewId
                    ? React.createElement(
                        'div',
                        {
                          className:
                            'ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700',
                        },
                        React.createElement(Star, { className: 'h-4 w-4' }),
                        'Default'
                      )
                    : null
                ),

                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: setDefaultView,
                    className:
                      'inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(3,205,140,0.20)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(3,205,140,0.26)]',
                  },

                  React.createElement(Star, { className: 'h-4 w-4' }),
                  'Set default view'
                ),

                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: resetToDefault,
                    className:
                      'inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950',
                  },

                  React.createElement(RefreshCcw, { className: 'h-4 w-4' }),
                  'Reset'
                ),

                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: startSaveView,
                    className:
                      'inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950 evz-no-print',
                  },

                  React.createElement(Plus, { className: 'h-4 w-4' }),
                  'Save current as new view'
                ),

                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: shareLink,
                    className:
                      'inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950 evz-no-print',
                  },

                  React.createElement(Globe, { className: 'h-4 w-4' }),
                  'Share link'
                ),

                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: exportPdf,
                    className:
                      'inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950 evz-no-print',
                  },

                  React.createElement(Receipt, { className: 'h-4 w-4' }),
                  'Export PDF'
                )
              ),

              React.createElement(
                'div',
                { className: 'flex flex-wrap items-center gap-3' },
                React.createElement(
                  'div',
                  {
                    className:
                      'inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2',
                  },
                  React.createElement(SlidersHorizontal, { className: 'h-4 w-4 text-slate-500' }),
                  React.createElement(
                    'div',
                    { className: 'text-[12px] font-extrabold text-slate-700' },
                    'Time range'
                  )
                ),

                React.createElement(Segmented, {
                  value: range,
                  onChange: setRangeSafe,
                  options: [
                    { key: 'today', label: 'Today' },
                    { key: '7d', label: '7d' },
                    { key: '30d', label: '30d' },
                    { key: 'ytd', label: 'YTD' },
                    { key: 'custom', label: 'Custom' },
                  ],
                }),

                range === 'custom'
                  ? React.createElement(
                      'div',
                      { className: 'flex flex-wrap items-center gap-2' },
                      React.createElement('input', {
                        type: 'date',
                        value: customFrom,
                        onChange: (e) => {
                          setCustomFrom(e.target.value);
                          if (!applyingView.current) setViewId('custom');
                        },
                        className:
                          'rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-slate-900 outline-none',
                      }),
                      React.createElement(
                        'span',
                        { className: 'text-[12px] font-extrabold text-slate-500' },
                        'to'
                      ),
                      React.createElement('input', {
                        type: 'date',
                        value: customTo,
                        onChange: (e) => {
                          setCustomTo(e.target.value);
                          if (!applyingView.current) setViewId('custom');
                        },
                        className:
                          'rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-slate-900 outline-none',
                      })
                    )
                  : null
              )
            ),

            /* Filter chips */
            React.createElement(
              'div',
              { className: 'mt-4 grid gap-3 lg:grid-cols-12' },
              React.createElement(
                'div',
                { className: 'lg:col-span-4' },
                React.createElement(
                  'div',
                  {
                    className:
                      'mb-2 flex items-center gap-2 text-[12px] font-extrabold text-slate-600',
                  },
                  React.createElement(Layers, { className: 'h-4 w-4' }),
                  'Marketplaces'
                ),
                React.createElement(
                  'div',
                  { className: 'flex flex-wrap gap-2' },
                  MARKETPLACE_OPTIONS.map((m) =>
                    React.createElement(Chip, {
                      key: m,
                      active: filters.marketplaces.includes(m),
                      label: m,
                      onClick: () => toggleIn('marketplaces', m),
                      tone: 'slate',
                    })
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'lg:col-span-4' },
                React.createElement(
                  'div',
                  {
                    className:
                      'mb-2 flex items-center gap-2 text-[12px] font-extrabold text-slate-600',
                  },
                  React.createElement(Truck, { className: 'h-4 w-4' }),
                  'Warehouses'
                ),
                React.createElement(
                  'div',
                  { className: 'flex flex-wrap gap-2' },
                  WAREHOUSE_OPTIONS.map((w) =>
                    React.createElement(Chip, {
                      key: w,
                      active: filters.warehouses.includes(w),
                      label: w,
                      onClick: () => toggleIn('warehouses', w),
                      tone: 'green',
                    })
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'lg:col-span-4' },
                React.createElement(
                  'div',
                  {
                    className:
                      'mb-2 flex items-center gap-2 text-[12px] font-extrabold text-slate-600',
                  },
                  React.createElement(Tag, { className: 'h-4 w-4' }),
                  'Channels'
                ),
                React.createElement(
                  'div',
                  { className: 'flex flex-wrap gap-2' },
                  CHANNEL_OPTIONS.map((c) =>
                    React.createElement(Chip, {
                      key: c,
                      active: filters.channels.includes(c),
                      label: c,
                      onClick: () => toggleIn('channels', c),
                      tone: c === 'MyLiveDealz' ? 'orange' : 'green',
                    })
                  ),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: clearFilters,
                      className:
                        'rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-slate-700 hover:bg-gray-50 dark:bg-slate-950',
                    },
                    'Clear'
                  )
                )
              )
            ),

            /* Active filters breadcrumb strip */
            React.createElement(
              'div',
              {
                className:
                  'mt-4 rounded-[9px] border border-slate-200/70 bg-gray-50 dark:bg-slate-950/70 px-4 py-3',
              },
              React.createElement(
                'div',
                { className: 'flex flex-wrap items-center gap-2' },
                React.createElement(
                  'div',
                  {
                    className:
                      'inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-700',
                  },
                  React.createElement(Tag, { className: 'h-4 w-4 text-slate-500' }),
                  'Active filters'
                ),

                activeFilterTokens.length
                  ? React.createElement(
                      'div',
                      { className: 'flex flex-wrap items-center gap-2' },
                      activeFilterTokens.map((t) =>
                        React.createElement(FilterPill, {
                          key: t.key,
                          label: t.label,
                          tone: t.tone,
                          onRemove: () => removeToken(t),
                        })
                      )
                    )
                  : React.createElement(
                      'div',
                      { className: 'text-[11px] font-semibold text-slate-500' },
                      'None'
                    ),

                activeFilterTokens.length
                  ? React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: clearFilters,
                        className:
                          'ml-auto rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-700 hover:bg-gray-50 dark:bg-slate-950',
                      },
                      'Clear filters'
                    )
                  : null
              )
            )
          )
        )
      )
    ),

    /* Drawer (KPI / Segment / Ops / Finance) */
    React.createElement(
      Drawer as ChartComponent,
      { open: !!drawer, onClose: () => setDrawer(null), title: drawerTitle },
      drawer?.kind === 'kpi'
        ? React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-start gap-3' },
                React.createElement(
                  'div',
                  {
                    className: 'grid h-12 w-12 place-items-center rounded-3xl text-white',
                    style: {
                      background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)`,
                    },
                  },

                  React.createElement(BarChart3, { className: 'h-6 w-6' })
                ),
                React.createElement(
                  'div',
                  { className: 'min-w-0 flex-1' },
                  React.createElement(
                    'div',
                    { className: 'text-lg font-black text-slate-900' },
                    drawer.kpi.drilldown.headline
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-sm font-semibold text-slate-600' },
                    drawer.kpi.drilldown.sub
                  ),

                  React.createElement(
                    'div',
                    { className: 'mt-3 grid grid-cols-3 gap-2' },
                    React.createElement(
                      'div',
                      { className: 'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        'Current'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[14px] font-black text-slate-900' },
                        formatKpiValue(drawer.kpi, currency)
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        'Target'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[14px] font-black text-slate-900' },
                        formatKpiTarget(drawer.kpi, currency)
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        'Remaining'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[14px] font-black text-slate-900' },
                        formatKpiRemaining(drawer.kpi, currency)
                      )
                    )
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
                React.createElement(
                  'div',
                  { className: 'flex items-center justify-between' },
                  React.createElement(
                    'div',
                    { className: 'text-sm font-extrabold text-slate-800' },
                    'Trend'
                  ),
                  React.createElement(
                    'div',
                    { className: 'text-[11px] font-extrabold text-slate-500' },
                    'Selected range'
                  )
                ),
                React.createElement(
                  'div',
                  { className: 'mt-3 h-[140px]' },
                  React.createElement(
                    ResponsiveContainer as ChartComponent,
                    { width: '100%', height: '100%' },
                    React.createElement(
                      LineChart,
                      {
                        data: drawer.kpi.series.map((v, i) => ({ i, v })),
                        margin: { top: 10, right: 10, bottom: 0, left: 0 },
                      },
                      React.createElement(Line as ChartComponent, {
                        type: 'monotone',
                        dataKey: 'v',
                        stroke: TOKENS.green,
                        strokeWidth: 2.4,
                        dot: false,
                      }),
                      React.createElement(Tooltip as ChartComponent, {
                        contentStyle: {
                          background: 'rgba(255,255,255,0.95)',
                          border: '1px solid rgba(148,163,184,0.35)',
                          borderRadius: 14,
                          fontSize: 12,
                          fontWeight: 700,
                        },
                        formatter: (v) => v,
                      })
                    )
                  )
                )
              )
            ),

            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-center justify-between' },
                React.createElement(
                  'div',
                  { className: 'text-sm font-black text-slate-900' },
                  'Breakdown'
                ),
                React.createElement(
                  'div',
                  { className: 'text-[11px] font-extrabold text-slate-500' },
                  'Insights'
                )
              ),
              React.createElement(
                'div',
                { className: 'mt-3 space-y-2' },
                drawer.kpi.drilldown.breakdown.map((b) =>
                  React.createElement(
                    'div',
                    {
                      key: b.label,
                      className:
                        'flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3',
                    },
                    React.createElement(
                      'div',
                      {
                        className:
                          'grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700',
                      },
                      React.createElement(BarChart3, { className: 'h-5 w-5' })
                    ),
                    React.createElement(
                      'div',
                      { className: 'min-w-0 flex-1' },
                      React.createElement(
                        'div',
                        { className: 'text-xs font-extrabold text-slate-800' },
                        b.label
                      ),
                      b.note
                        ? React.createElement(
                            'div',
                            { className: 'mt-0.5 text-[11px] font-semibold text-slate-500' },
                            b.note
                          )
                        : null
                    ),
                    React.createElement(
                      'div',
                      { className: 'text-sm font-black text-slate-900' },
                      b.value
                    )
                  )
                )
              )
            ),

            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-center justify-between' },
                React.createElement(
                  'div',
                  { className: 'text-sm font-black text-slate-900' },
                  'Recommended actions'
                ),
                React.createElement(
                  'div',
                  { className: 'text-[11px] font-extrabold', style: { color: TOKENS.green } },
                  'Do next'
                )
              ),
              React.createElement(
                'div',
                { className: 'mt-3 grid gap-2' },
                drawer.kpi.drilldown.actions.map((a) => {
                  const Ico = a.icon;
                  return React.createElement(
                    'button',
                    {
                      key: a.to,
                      type: 'button',
                      onClick: () => {
                        navigate(a.to);
                        setDrawer(null);
                      },
                      className:
                        'flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800',
                    },

                    React.createElement(
                      'span',
                      {
                        className:
                          'grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700',
                      },
                      React.createElement(Ico, { className: 'h-5 w-5' })
                    ),
                    React.createElement(
                      'span',
                      {
                        className: 'min-w-0 flex-1 truncate text-sm font-extrabold text-slate-900',
                      },
                      a.label
                    ),
                    React.createElement(ChevronRight, { className: 'h-4 w-4 text-slate-300' })
                  );
                })
              )
            )
          )
        : null,

      drawer?.kind === 'donut'
        ? React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-start gap-3' },
                React.createElement(
                  'div',
                  {
                    className:
                      'grid h-12 w-12 place-items-center rounded-3xl bg-emerald-50 text-emerald-700',
                  },
                  React.createElement(Layers, { className: 'h-6 w-6' })
                ),
                React.createElement(
                  'div',
                  { className: 'min-w-0 flex-1' },
                  React.createElement(
                    'div',
                    { className: 'text-lg font-black text-slate-900' },
                    drawer.seg.name
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-sm font-semibold text-slate-600' },
                    drawer.seg.hint
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-3 rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                    React.createElement(
                      'div',
                      { className: 'text-[11px] font-extrabold text-slate-500' },
                      'Value'
                    ),
                    React.createElement(
                      'div',
                      { className: 'mt-1 text-[18px] font-black text-slate-900' },
                      typeof drawer.seg.value === 'number'
                        ? drawer.currency
                          ? formatMoney(drawer.seg.value, drawer.currency)
                          : drawer.seg.value
                        : ''
                    )
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'mt-4 grid gap-2' },
                drawer.seg.top.map((t) =>
                  React.createElement(
                    'div',
                    {
                      key: t.label,
                      className:
                        'flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3',
                    },
                    React.createElement(
                      'div',
                      { className: 'text-[12px] font-extrabold text-slate-800' },
                      t.label
                    ),
                    React.createElement(
                      'div',
                      { className: 'text-[12px] font-black text-slate-900' },
                      t.value
                    )
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'mt-4 grid gap-2' },
                drawer.seg.actions.map((a) => {
                  const Ico = a.icon;
                  return React.createElement(
                    'button',
                    {
                      key: a.to,
                      type: 'button',
                      onClick: () => {
                        navigate(a.to);
                        setDrawer(null);
                      },
                      className:
                        'flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left hover:bg-gray-50 dark:bg-slate-950',
                    },

                    React.createElement(
                      'span',
                      {
                        className:
                          'grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700',
                      },
                      React.createElement(Ico, { className: 'h-5 w-5' })
                    ),
                    React.createElement(
                      'span',
                      {
                        className: 'min-w-0 flex-1 truncate text-sm font-extrabold text-slate-900',
                      },
                      a.label
                    ),
                    React.createElement(ChevronRight, { className: 'h-4 w-4 text-slate-300' })
                  );
                })
              ),

              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    navigate(drawer.seg.to);
                    setDrawer(null);
                  },
                  className:
                    'mt-4 w-full rounded-full border border-white/10 bg-[rgba(3,205,140,0.18)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(3,205,140,0.24)]',
                },
                'Open ',
                drawer.seg.name
              )
            )
          )
        : null,

      drawer?.kind === 'ops'
        ? React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-start gap-3' },
                React.createElement(
                  'div',
                  {
                    className:
                      'grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700',
                  },
                  React.createElement(Truck, { className: 'h-6 w-6' })
                ),
                React.createElement(
                  'div',
                  { className: 'min-w-0 flex-1' },
                  React.createElement(
                    'div',
                    { className: 'text-lg font-black text-slate-900' },
                    drawer.stage.label
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-sm font-semibold text-slate-600' },
                    'Current count: ',
                    formatCount(drawer.stage.count)
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-sm font-semibold text-slate-600' },
                    'SLA: ',
                    drawer.stage.sla
                  )
                )
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    navigate(drawer.stage.to);
                    setDrawer(null);
                  },
                  className:
                    'mt-4 w-full rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-gray-50 dark:bg-slate-950',
                },
                'Open ',
                drawer.stage.label
              )
            )
          )
        : null,

      drawer?.kind === 'risk'
        ? React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-start gap-3' },
                React.createElement(
                  'div',
                  {
                    className:
                      'grid h-12 w-12 place-items-center rounded-3xl bg-rose-50 text-rose-700',
                  },
                  React.createElement(AlertTriangle, { className: 'h-6 w-6' })
                ),
                React.createElement(
                  'div',
                  { className: 'min-w-0 flex-1' },
                  React.createElement(
                    'div',
                    { className: 'text-lg font-black text-slate-900' },
                    drawer.item.label
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-sm font-semibold text-slate-600' },
                    drawer.item.hint
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-3 grid grid-cols-2 gap-2' },
                    React.createElement(
                      'div',
                      { className: 'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        'Open items'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[14px] font-black text-slate-900' },
                        drawer.item.count
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        'Risk score'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[14px] font-black text-slate-900' },
                        Math.round(drawer.item.score),
                        '/100'
                      )
                    )
                  )
                )
              ),

              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    navigate(drawer.item.to);
                    setDrawer(null);
                  },
                  className:
                    'mt-4 w-full rounded-full border border-white/10 bg-[rgba(247,127,0,0.14)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(247,127,0,0.20)]',
                },
                'Open ',
                drawer.item.label
              )
            )
          )
        : null,

      drawer?.kind === 'inventory'
        ? React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-start gap-3' },
                React.createElement(
                  'div',
                  {
                    className:
                      'grid h-12 w-12 place-items-center rounded-3xl bg-emerald-50 text-emerald-700',
                  },
                  React.createElement(Boxes, { className: 'h-6 w-6' })
                ),
                React.createElement(
                  'div',
                  { className: 'min-w-0 flex-1' },
                  React.createElement(
                    'div',
                    { className: 'text-lg font-black text-slate-900' },
                    drawer.item.label
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-sm font-semibold text-slate-600' },
                    drawer.item.hint
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'mt-4 rounded-3xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-4' },
                React.createElement(
                  'div',
                  { className: 'text-sm font-black text-slate-900' },
                  'Top items'
                ),
                React.createElement(
                  'div',
                  { className: 'mt-3 grid gap-2' },
                  drawer.item.top.map((t) =>
                    React.createElement(
                      'div',
                      {
                        key: t.sku,
                        className:
                          'flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3',
                      },
                      React.createElement(
                        'div',
                        { className: 'text-[12px] font-extrabold text-slate-800' },
                        t.sku
                      ),
                      React.createElement(
                        'div',
                        { className: 'text-[12px] font-black text-slate-900' },
                        t.note
                      )
                    )
                  )
                )
              ),

              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    navigate(drawer.item.to);
                    setDrawer(null);
                  },
                  className:
                    'mt-4 w-full rounded-full border border-white/10 bg-[rgba(3,205,140,0.18)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(3,205,140,0.24)]',
                },
                'Open inventory list'
              )
            )
          )
        : null,

      drawer?.kind === 'settlement'
        ? React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-start gap-3' },
                React.createElement(
                  'div',
                  {
                    className:
                      'grid h-12 w-12 place-items-center rounded-3xl bg-emerald-50 text-emerald-700',
                  },
                  React.createElement(Banknote, { className: 'h-6 w-6' })
                ),
                React.createElement(
                  'div',
                  { className: 'min-w-0 flex-1' },
                  React.createElement(
                    'div',
                    { className: 'text-lg font-black text-slate-900' },
                    drawer.stage.label
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-sm font-semibold text-slate-600' },
                    drawer.stage.hint
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-3 grid grid-cols-2 gap-2' },
                    React.createElement(
                      'div',
                      { className: 'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        'Amount'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[14px] font-black text-slate-900' },
                        formatMoney(drawer.stage.amount, drawer.currency)
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        'Date'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[14px] font-black text-slate-900' },
                        drawer.stage.date
                      )
                    )
                  )
                )
              ),

              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    navigate(drawer.stage.to);
                    setDrawer(null);
                  },
                  className:
                    'mt-4 w-full rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-gray-50 dark:bg-slate-950',
                },
                'Open settlement items'
              )
            )
          )
        : null,

      drawer?.kind === 'fee'
        ? React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-start gap-3' },
                React.createElement(
                  'div',
                  {
                    className:
                      'grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700',
                  },
                  React.createElement(Receipt, { className: 'h-6 w-6' })
                ),
                React.createElement(
                  'div',
                  { className: 'min-w-0 flex-1' },
                  React.createElement(
                    'div',
                    { className: 'text-lg font-black text-slate-900' },
                    drawer.item.label
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-sm font-semibold text-slate-600' },
                    drawer.item.hint
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-3 rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                    React.createElement(
                      'div',
                      { className: 'text-[11px] font-extrabold text-slate-500' },
                      'Amount'
                    ),
                    React.createElement(
                      'div',
                      { className: 'mt-1 text-[16px] font-black text-slate-900' },
                      formatMoney(drawer.item.value, drawer.currency)
                    )
                  )
                )
              ),

              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    navigate(drawer.item.to);
                    setDrawer(null);
                  },
                  className:
                    'mt-4 w-full rounded-full border border-white/10 bg-[rgba(247,127,0,0.14)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(247,127,0,0.20)]',
                },
                'Open ',
                drawer.item.label
              )
            )
          )
        : null,

      drawer?.kind === 'cashflow'
        ? React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(
              'div',
              { className: 'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4' },
              React.createElement(
                'div',
                { className: 'flex items-start gap-3' },
                React.createElement(
                  'div',
                  {
                    className:
                      'grid h-12 w-12 place-items-center rounded-3xl bg-emerald-50 text-emerald-700',
                  },
                  React.createElement(TrendingUp, { className: 'h-6 w-6' })
                ),
                React.createElement(
                  'div',
                  { className: 'min-w-0 flex-1' },
                  React.createElement(
                    'div',
                    { className: 'text-lg font-black text-slate-900' },
                    drawer.day.day
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-1 text-sm font-semibold text-slate-600' },
                    'Inflow vs payout'
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-3 grid grid-cols-2 gap-2' },
                    React.createElement(
                      'div',
                      { className: 'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        'Inflow'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[14px] font-black text-slate-900' },
                        formatMoney(drawer.day.inflow, drawer.currency)
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-3' },
                      React.createElement(
                        'div',
                        { className: 'text-[11px] font-extrabold text-slate-500' },
                        'Payout'
                      ),
                      React.createElement(
                        'div',
                        { className: 'mt-1 text-[14px] font-black text-slate-900' },
                        formatMoney(drawer.day.payout, drawer.currency)
                      )
                    )
                  )
                )
              ),

              React.createElement(
                'div',
                { className: 'mt-4 flex gap-2' },
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => {
                      navigate('/finance/wallets');
                      setDrawer(null);
                    },
                    className:
                      'flex-1 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-gray-50 dark:bg-slate-950',
                  },
                  'Open wallets'
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => {
                      navigate('/finance/wallets');
                      setDrawer(null);
                    },
                    className:
                      'flex-1 rounded-full border border-white/10 bg-[rgba(3,205,140,0.18)] px-4 py-2 text-[12px] font-extrabold text-slate-900 hover:bg-[rgba(3,205,140,0.24)]',
                  },
                  'Manage payouts'
                )
              )
            )
          )
        : null
    ),

    React.createElement(Toast, { show: toast.show, text: toast.text })
  );
}
