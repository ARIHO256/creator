import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sellerBackendApi as backendApi } from '../../../lib/backendApi';
import {
  buildCampaignBuilderPayload,
  buildCampaignPayload,
  mapCampaignBuilderRecord,
  mapCampaignWorkspace,
} from './runtime';
const ORANGE = '#f77f00';

declare global {
  interface Window {
    __MLDZ_TESTS__?: boolean;
  }
}

/* ------------------------- NEW: Retail vs Wholesale + Targeting + Compliance ------------------------- */

const COMMERCE_MODES = ['Retail', 'Wholesale'];

const BUNDLE_MODES = ['Single item', 'Bundle'];

const REGULATED_TAGS = ['None', 'Medical', 'Edu', 'Faith'];

const MARKET_REGIONS = [
  'East Africa',
  'West Africa',
  'Central Africa',
  'Southern Africa',
  'North Africa',
  'Pan-Africa',
  'Global',
];

const SHIPPING_CONSTRAINTS = [
  'Only deliver within country',
  'No remote areas',
  'Pickup only in selected cities',
];

const CONTENT_LANGUAGES = [
  'English',
  'French',
  'Arabic',
  'Swahili',
  'Portuguese',
  'Chinese (Simplified)',
  'Spanish',
];

const TIMEZONES = [
  'Africa/Kampala',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'UTC',
  'Europe/London',
  'America/New_York',
];

// Discount modes (used for Retail and Wholesale tiers)
const DISCOUNT_TYPE_OPTIONS = [
  { k: 'none', label: 'No discount' },
  { k: 'percent', label: '% off' },
  { k: 'amount', label: 'Amount off' },
  { k: 'final', label: 'Promo price' },
];

const GIVEAWAY_SUPPORTED_CAMPAIGN_TYPES = ['Live Sessionz', 'Live + Shoppables.'];
const SELLER_CAMPAIGN_BUILDER_ID = 'seller_campaign_builder_default';

function campaignTypeSupportsGiveaways(type) {
  return GIVEAWAY_SUPPORTED_CAMPAIGN_TYPES.includes(String(type || ''));
}

function positiveIntOrFallback(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const whole = Math.floor(n);
  return whole >= 1 ? whole : fallback;
}

function parsePositiveInt(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (!/^[0-9]+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function coercePickedImageAsset(payload) {
  const src = payload?.payload || payload;
  if (!src || typeof src !== 'object') return null;
  const id = typeof src.id === 'string' ? src.id : '';
  const title =
    (typeof src.title === 'string' && src.title) ||
    (typeof src.name === 'string' && src.name) ||
    (typeof src.label === 'string' && src.label) ||
    '';
  const previewUrl =
    (typeof src.previewUrl === 'string' && src.previewUrl) ||
    (typeof src.thumbnailUrl === 'string' && src.thumbnailUrl) ||
    (typeof src.imageUrl === 'string' && src.imageUrl) ||
    (typeof src.url === 'string' && src.url) ||
    '';
  const mediaType =
    (typeof src.mediaType === 'string' && src.mediaType) ||
    (typeof src.kind === 'string' && src.kind) ||
    (typeof src.type === 'string' && src.type) ||
    'image';

  if (!previewUrl) return null;
  if (String(mediaType).toLowerCase().includes('video')) return null;

  return { id, title, previewUrl };
}

function resolveCampaignGiveaway(giveaway, items: any[] = []) {
  const source =
    giveaway?.source === 'custom' ? 'custom' : giveaway?.linkedItemId ? 'featured' : 'custom';
  const linked =
    source === 'featured' ? (items || []).find((it) => it.id === giveaway?.linkedItemId) : null;
  const quantity = positiveIntOrFallback(giveaway?.quantity, 1);

  return {
    source,
    linked,
    quantity,
    title:
      source === 'featured'
        ? linked?.title || giveaway?.title || 'Featured item giveaway'
        : giveaway?.title || 'Custom giveaway',
    imageUrl:
      source === 'featured' ? linked?.avatar || giveaway?.imageUrl || '' : giveaway?.imageUrl || '',
  };
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function toggleInList<T>(list: T[] = [], value: T): T[] {
  const set = new Set(list || []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

function normalizedNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function numberOrEmpty(v) {
  const raw = String(v ?? '').trim();
  if (!raw) return '';
  const n = Number(raw);
  return Number.isFinite(n) ? n : '';
}

function makeTier(seed = 'T') {
  return {
    id: `${seed}-${Math.floor(100 + Math.random() * 900)}${Math.floor(10 + Math.random() * 89)}`,
    minQty: 1,
    maxQty: '',
    discountMode: 'percent',
    discountValue: 5,
  };
}

/* ------------------------- helpers ------------------------- */

function cx(...xs) {
  return xs.filter(Boolean).join(' ');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDaysUTC(ymd, days) {
  if (!ymd) return '';
  const [y, m, d] = String(ymd)
    .split('-')
    .map((x) => Number(x));
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function computeEndDate(startYMD, durationDays) {
  // inclusive duration: 1 day => end=start
  const dur = Number(durationDays || 1);
  if (!startYMD) return '';
  return addDaysUTC(startYMD, Math.max(0, dur - 1));
}

function money(currency, value) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${Number(value || 0).toLocaleString()}`;
  }
}

function clamp(n, min, max) {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function uid(prefix = 'C') {
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}${Math.floor(10 + Math.random() * 89)}`;
}

function go(path) {
  try {
    window.location.hash = path;
  } catch {
    // ignore
  }
}

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function calcDiscountedPrice(price, mode, value) {
  const p = Math.max(0, safeNum(price, 0));
  const v = Math.max(0, safeNum(value, 0));

  if (!mode || mode === 'none') return p;
  if (mode === 'percent') {
    const pct = clamp(v, 0, 100);
    return Math.max(0, p * (1 - pct / 100));
  }
  if (mode === 'amount') {
    return Math.max(0, p - v);
  }
  if (mode === 'final') {
    return Math.max(0, v);
  }
  return p;
}

function formatDiscount(mode, value, currency = 'USD') {
  const v = safeNum(value, 0);
  if (!mode || mode === 'none' || v <= 0) return 'No discount';
  if (mode === 'percent') return `${clamp(v, 0, 100)}% off`;
  if (mode === 'amount') return `${money(currency, v)} off`;
  if (mode === 'final') return `Final: ${money(currency, v)}`;
  return 'No discount';
}

function svgAvatarDataUrl(label, seed = 'A') {
  const letter = (label || seed || 'A').trim().slice(0, 1).toUpperCase();
  const h = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hue1 = (h * 17) % 360;
  const hue2 = (h * 29 + 90) % 360;
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='hsl(${hue1},80%,60%)'/>
        <stop offset='1' stop-color='hsl(${hue2},80%,55%)'/>
      </linearGradient>
    </defs>
    <rect width='64' height='64' rx='18' fill='url(#g)'/>
    <text x='32' y='40' font-size='28' font-family='Arial, sans-serif' text-anchor='middle' fill='white' font-weight='800'>${letter}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ------------------------- toast ------------------------- */

function useToasts() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; tone: string }>>([]);
  const push = (message, tone = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  return { toasts, push };
}

function ToastStack({ toasts }) {
  if (!toasts?.length) return null;
  return (
    <div className="fixed top-20 right-3 md:right-6 z-[90] flex flex-col gap-2 w-[min(420px,calc(100vw-24px))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'rounded-2xl border px-3 py-2 text-sm shadow-sm bg-white dark:bg-slate-900',
            t.tone === 'success'
              ? 'border-emerald-200 dark:border-emerald-800'
              : t.tone === 'warn'
                ? 'border-amber-200 dark:border-amber-800'
                : t.tone === 'error'
                  ? 'border-rose-200 dark:border-rose-800'
                  : 'border-slate-200 dark:border-slate-800'
          )}
        >
          <div className="flex items-start gap-2">
            <span
              className={cx(
                'mt-1.5 h-2 w-2 rounded-full',
                t.tone === 'success'
                  ? 'bg-emerald-500'
                  : t.tone === 'warn'
                    ? 'bg-amber-500'
                    : t.tone === 'error'
                      ? 'bg-rose-500'
                      : 'bg-slate-400'
              )}
            />
            <div className="text-slate-700 dark:text-slate-200">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------- UI atoms ------------------------- */

type PillProps = {
  tone?: string;
  children: React.ReactNode;
  title?: string;
};

type BtnProps = {
  tone?: 'neutral' | 'primary' | 'ghost' | 'danger';
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
};

function PageHeader({ title, badge, actions }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 truncate">
            {title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">{badge}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      </div>
    </header>
  );
}

function Pill({ tone = 'neutral', children, title }: PillProps) {
  const cls =
    tone === 'good'
      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400'
      : tone === 'warn'
        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-400'
        : tone === 'bad'
          ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-400'
          : tone === 'brand'
            ? 'text-white border-transparent'
            : 'bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold',
        cls
      )}
      style={tone === 'brand' ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({
  tone = 'neutral',
  className = '',
  onClick = () => {},
  disabled = false,
  children,
  title,
}: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed';
  const cls =
    tone === 'primary'
      ? 'border-transparent text-white hover:brightness-95'
      : tone === 'ghost'
        ? 'border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100'
        : tone === 'danger'
          ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800';

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(base, cls, className)}
      style={tone === 'primary' ? { background: ORANGE } : undefined}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, className = '', type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        'w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
        className
      )}
    />
  );
}

function Select({ value, onChange, children, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none text-slate-900 dark:text-slate-100',
        className
      )}
    >
      {children}
    </select>
  );
}

function Drawer({ open, title, subtitle, onClose, children, footer }) {
  return (
    <div className={cx('fixed inset-0 z-[70]', open ? '' : 'pointer-events-none')}>
      <div
        className={cx(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      <div
        className={cx(
          'absolute top-0 right-0 h-full w-full sm:w-[1098px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
              ) : null}
            </div>
            <Btn tone="ghost" onClick={onClose}>
              ✕
            </Btn>
          </div>
          <div className="flex-1 overflow-auto px-4 py-4">{children}</div>
          {footer ? (
            <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-900/30">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FullscreenModal({ open, title, subtitle, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[85] bg-white dark:bg-slate-900 flex flex-col">
      <div className="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur flex items-center justify-between px-[0.55%]">
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-extrabold truncate">{title}</div>
          {subtitle ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={onClose}>✕ Close</Btn>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-[0.55%] py-4 bg-gray-50 dark:bg-slate-950">
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-[0.55%] py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function RadioCard({ active, title, desc, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'w-full text-left rounded-3xl border p-3 transition shadow-sm',
        active
          ? 'border-[#f77f00] bg-amber-50/40 dark:bg-amber-900/20'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{title}</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{desc}</div>
        </div>
        {badge ? <Pill tone={active ? 'brand' : 'neutral'}>{badge}</Pill> : null}
      </div>
    </button>
  );
}

/* ------------------------- domain model (supplier) ------------------------- */

const STAGES = [
  'Draft',
  'Collabs',
  'Negotiating',
  'Contracted',
  'Execution',
  'Completed',
  'Terminated',
];

const USAGE_DECISIONS = ['I will use a Creator', 'I will NOT use a Creator', 'I am NOT SURE yet'];
const COLLAB_MODES = ['Open for Collabs', 'Invite-only'];
const APPROVAL_MODES = ['Manual', 'Auto']; // Manual means Supplier approves creator assets before Admin

const OFFER_SCOPES = [
  { k: 'Products', label: 'Products' },
  { k: 'Services', label: 'Services' },
  { k: 'Both', label: 'Products & Services' },
];

const PROMO_TYPES = [
  { k: 'Discount', label: 'Discount' },
  { k: 'Bundle', label: 'Bundle / Pack' },
  { k: 'Coupon', label: 'Coupon / Code' },
  { k: 'FreeShipping', label: 'Free Shipping' },
  { k: 'Gift', label: 'Gift / Bonus' },
  { k: 'Highlight', label: 'No Discount (Highlight)' },
];

const PROMO_ARRANGEMENTS = {
  Discount: [
    { k: 'PercentOff', label: '% off' },
    { k: 'AmountOff', label: 'Amount off' },
    { k: 'FinalPrice', label: 'Set final price' },
    { k: 'Tiered', label: 'Tiered / volume' },
    { k: 'Flash', label: 'Flash windows' },
  ],
  Bundle: [
    { k: 'BundlePrice', label: 'Bundle price' },
    { k: 'BuyXGetY', label: 'Buy X get Y' },
    { k: 'MixMatch', label: 'Mix & match' },
    { k: 'AddOn', label: 'Add-on deal' },
  ],
  Coupon: [
    { k: 'InfluencerCode', label: 'Influencer code' },
    { k: 'CheckoutCode', label: 'Checkout code' },
    { k: 'AutoApply', label: 'Auto-apply' },
  ],
  FreeShipping: [
    { k: 'OverThreshold', label: 'Over threshold' },
    { k: 'SelectedItems', label: 'Selected items' },
    { k: 'AllOrders', label: 'All orders' },
  ],
  Gift: [
    { k: 'GiftWithPurchase', label: 'Gift with purchase' },
    { k: 'BonusService', label: 'Bonus service' },
    { k: 'FreeUpgrade', label: 'Free upgrade' },
  ],
  Highlight: [{ k: 'Feature', label: 'Feature highlight' }],
};

const DISCOUNT_MODES = [
  { k: 'none', label: 'No discount' },
  { k: 'percent', label: '%' },
  { k: 'amount', label: 'Amount' },
  { k: 'final', label: 'Final price' },
];

const HEALTH = {
  'on-track': { dot: 'bg-emerald-500', label: 'On track' },
  'at-risk': { dot: 'bg-amber-500 animate-pulse', label: 'At risk' },
  stalled: { dot: 'bg-slate-400', label: 'Stalled' },
};

function statusTone(stage) {
  const map = {
    Draft:
      'bg-gray-50 dark:bg-slate-950 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    Collabs:
      'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700',
    Negotiating:
      'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
    Contracted:
      'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
    Execution:
      'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
    Completed:
      'bg-gray-50 dark:bg-slate-950 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    Terminated:
      'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700',
  };
  return map[stage] || map.Draft;
}

function canSwitchCollabMode(c) {
  if (c.creatorUsageDecision !== 'I will use a Creator') return false;
  return ['Draft', 'Collabs', 'Negotiating', 'Contracted'].includes(c.stage);
}

function inferLifecycleText(c) {
  if (c.creatorUsageDecision === 'I will NOT use a Creator') return 'Supplier acts as Creator';
  if (c.creatorUsageDecision === 'I am NOT SURE yet') return 'Creator plan pending';
  return c.collabMode;
}

function approvalText(c) {
  if (c.creatorUsageDecision === 'I will use a Creator')
    return c.approvalMode === 'Manual' ? 'Manual approval' : 'Auto approval';
  return c.approvalMode === 'Manual' ? 'Internal review' : 'Direct to Admin';
}

function approvalStatusPill(approvalStatus) {
  if (approvalStatus === 'Pending') return { tone: 'warn', label: 'Approval pending' };
  if (approvalStatus === 'Rejected') return { tone: 'bad', label: 'Rejected' };
  if (approvalStatus === 'Approved') return { tone: 'good', label: 'Approved' };
  return { tone: 'neutral', label: 'Not submitted' };
}

/* ------------------------- catalog dataset (preview) ------------------------- */

const CATALOG_ITEMS = [
  {
    id: 'P-1001',
    kind: 'Product',
    title: 'LED Ring Light Kit',
    category: 'Electronics',
    price: 45,
    region: 'Global',
    subtitle: 'Tripod + phone holder + carry bag',
    sku: 'RL-01',
  },
  {
    id: 'P-1002',
    kind: 'Product',
    title: 'Wireless Earbuds Pro',
    category: 'Electronics',
    price: 29,
    region: 'Africa / Asia',
    subtitle: 'Noise reduction, 24h battery',
    sku: 'EB-PRO',
  },
  {
    id: 'P-1003',
    kind: 'Product',
    title: 'Vitamin C Serum Bundle',
    category: 'Beauty',
    price: 18,
    region: 'East Africa',
    subtitle: 'Brightening + hydration',
    sku: 'BC-VC',
  },
  {
    id: 'P-1004',
    kind: 'Product',
    title: 'Men’s Sneakers (2026)',
    category: 'Fashion',
    price: 34,
    region: 'Global',
    subtitle: 'Lightweight, breathable',
    sku: 'SN-26',
  },
  {
    id: 'S-2001',
    kind: 'Service',
    title: 'WhatsApp Catalog Setup',
    category: 'Services',
    price: 120,
    region: 'Africa',
    subtitle: 'Upload items + tags + pricing',
    sku: 'SV-WA',
  },
  {
    id: 'S-2002',
    kind: 'Service',
    title: 'Influencer Script Writing',
    category: 'Creative',
    price: 80,
    region: 'Global',
    subtitle: 'Hooks + CTA + objections',
    sku: 'SV-SCR',
  },
  {
    id: 'S-2003',
    kind: 'Service',
    title: 'Product Photography',
    category: 'Creative',
    price: 150,
    region: 'East Africa',
    subtitle: '10 edits, studio lighting',
    sku: 'SV-PH',
  },
  {
    id: 'S-2004',
    kind: 'Service',
    title: 'Adz Media Buying',
    category: 'Marketing',
    price: 220,
    region: 'Global',
    subtitle: 'Setup + optimization',
    sku: 'SV-ADS',
  },
].map((it) => ({
  ...it,
  avatar: svgAvatarDataUrl(it.title, it.id),
}));

/* ------------------------- Catalog Page modal (selection) ------------------------- */

function CatalogCampaignPickerPage({
  catalogItems,
  open,
  onClose,
  initialKind,
  allowProducts,
  allowServices,
  campaignCurrency,
  promoDefaults,
  existingSelectedItems,
  onConfirm,
}) {
  const [activeKind, setActiveKind] = useState(initialKind || 'Product');
  const [q, setQ] = useState('');

  // draft map: id -> { selected, qty, discountMode, discountValue }
  const [draft, setDraft] = useState<Record<string, { selected: boolean; qty: number; discountMode: string; discountValue: number }>>({});

  useEffect(() => {
    if (!open) return;

    // init active tab
    if (initialKind === 'Product' && !allowProducts && allowServices) setActiveKind('Service');
    else if (initialKind === 'Service' && !allowServices && allowProducts) setActiveKind('Product');
    else setActiveKind(initialKind || (allowProducts ? 'Product' : 'Service'));

    // seed draft from existing selection + promo defaults
    const byId: Record<
      string,
      { selected: boolean; qty: number; discountMode: string; discountValue: number }
    > = {};
    (existingSelectedItems || []).forEach((sel) => {
      byId[sel.id] = {
        selected: true,
        qty: safeNum(sel.plannedQty, 1),
        discountMode: sel.discount?.mode || 'none',
        discountValue: safeNum(sel.discount?.value, 0),
      };
    });

    // ensure all visible items have state
    catalogItems.forEach((it) => {
      if (byId[it.id]) return;
      byId[it.id] = {
        selected: false,
        qty: 1,
        discountMode: promoDefaults?.defaultDiscountMode || 'none',
        discountValue: safeNum(promoDefaults?.defaultDiscountValue, 0),
      };
    });

    setDraft(byId);
    setQ('');
  }, [open, initialKind, allowProducts, allowServices, existingSelectedItems, promoDefaults, catalogItems]);

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return catalogItems.filter((it) => {
      if (activeKind === 'Product' && it.kind !== 'Product') return false;
      if (activeKind === 'Service' && it.kind !== 'Service') return false;
      if (!qq) return true;
      const hay = `${it.title} ${it.subtitle} ${it.category} ${it.region} ${it.sku}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [activeKind, q, catalogItems]);

  const selectedItems = useMemo(() => {
    const out: Array<any> = [];
    items.forEach((it) => {
      const s = draft[it.id];
      if (!s?.selected) return;
      const qty = clamp(s.qty, 1, 1000000);
      const discounted = calcDiscountedPrice(it.price, s.discountMode, s.discountValue);
      out.push({
        ...it,
        plannedQty: qty,
        discount: { mode: s.discountMode, value: safeNum(s.discountValue, 0) },
        discountedPrice: discounted,
        discountLabel: formatDiscount(s.discountMode, s.discountValue, campaignCurrency),
      });
    });
    return out;
  }, [items, draft, campaignCurrency]);

  const selectedCount = useMemo(() => {
    let n = 0;
    Object.keys(draft || {}).forEach((id) => {
      if (draft[id]?.selected) n += 1;
    });
    return n;
  }, [draft]);

  const totalPlanned = useMemo(() => {
    // sum of selected line totals for the current tab
    return selectedItems.reduce((sum, it) => sum + it.discountedPrice * it.plannedQty, 0);
  }, [selectedItems]);

  const footer = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Selected: <span className="font-extrabold">{selectedCount}</span> · Tab total:{' '}
        <span className="font-extrabold">{money(campaignCurrency, totalPlanned)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn
          tone="primary"
          disabled={selectedCount === 0}
          onClick={() => {
            onConfirm({ kind: activeKind, selected: selectedItems });
          }}
        >
          ✅ Add to Campaign
        </Btn>
      </div>
    </div>
  );

  return (
    <FullscreenModal
      open={open}
      title="Catalog"
      subtitle="Select campaign items: avatar + details + qty + price + discount + discounted price"
      onClose={onClose}
      footer={footer}
    >
      <div className="space-y-3">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Btn
            disabled={!allowProducts}
            onClick={() => setActiveKind('Product')}
            className={cx(activeKind === 'Product' ? 'border-transparent text-white' : '')}
            tone={activeKind === 'Product' ? 'primary' : 'neutral'}
            title={allowProducts ? 'Show Products' : 'Products disabled by scope'}
          >
            🧺 Products
          </Btn>
          <Btn
            disabled={!allowServices}
            onClick={() => setActiveKind('Service')}
            className={cx(activeKind === 'Service' ? 'border-transparent text-white' : '')}
            tone={activeKind === 'Service' ? 'primary' : 'neutral'}
            title={allowServices ? 'Show Services' : 'Services disabled by scope'}
          >
            🧩 Services
          </Btn>

          <div className="flex-1" />

          <div className="min-w-[240px]">
            <Input value={q} onChange={setQ} placeholder="Search catalog…" />
          </div>
        </div>

        {/* Promo helper */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold">Promo defaults</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                These defaults prefill discount fields for newly selected items. You can override
                per item.
              </div>
            </div>
            <Pill tone="brand">{promoDefaults?.promoTypeLabel || 'Promo'}</Pill>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill tone="neutral">
              Arrangement:{' '}
              <span className="font-extrabold">{promoDefaults?.promoArrangementLabel || '—'}</span>
            </Pill>
            <Pill tone="neutral">
              Default discount:{' '}
              <span className="font-extrabold">
                {formatDiscount(
                  promoDefaults?.defaultDiscountMode,
                  promoDefaults?.defaultDiscountValue,
                  campaignCurrency
                )}
              </span>
            </Pill>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Item
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Qty planned
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Current price
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Discounted price
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Add
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it) => {
                  const s = draft[it.id] || {
                    selected: false,
                    qty: 1,
                    discountMode: 'none',
                    discountValue: 0,
                  };
                  const discounted = calcDiscountedPrice(it.price, s.discountMode, s.discountValue);
                  const discountLabel = formatDiscount(
                    s.discountMode,
                    s.discountValue,
                    campaignCurrency
                  );
                  return (
                    <tr
                      key={it.id}
                      className={cx(
                        'hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800/30',
                        s.selected ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={it.avatar}
                            alt="avatar"
                            className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-700"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold truncate text-slate-900 dark:text-slate-50">
                              {it.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                              {it.subtitle} · {it.category} · {it.region} · {it.sku}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={s.qty}
                          onChange={(e) => {
                            const v = clamp(e.target.value, 1, 1000000);
                            setDraft((prev) => ({
                              ...prev,
                              [it.id]: { ...prev[it.id], qty: v },
                            }));
                          }}
                          className="w-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none"
                          title="Quantity planned for campaign"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                          {money(campaignCurrency, it.price)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Current
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={s.discountMode}
                            onChange={(e) => {
                              const nextMode = e.target.value;
                              setDraft((prev) => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], discountMode: nextMode },
                              }));
                            }}
                            className="w-32 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none"
                          >
                            {DISCOUNT_MODES.map((m) => (
                              <option key={m.k} value={m.k}>
                                {m.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            disabled={s.discountMode === 'none'}
                            value={s.discountValue}
                            onChange={(e) => {
                              const v = Math.max(0, safeNum(e.target.value, 0));
                              setDraft((prev) => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], discountValue: v },
                              }));
                            }}
                            className={cx(
                              'w-28 rounded-2xl border px-3 py-2 text-sm font-bold outline-none',
                              s.discountMode === 'none'
                                ? 'border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-slate-400'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                            )}
                            title="Discount value (% / amount / final price)"
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {discountLabel}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                          {money(campaignCurrency, discounted)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Line: {money(campaignCurrency, discounted * clamp(s.qty, 1, 1000000))}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={!!s.selected}
                            onChange={() => {
                              setDraft((prev) => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], selected: !prev[it.id]?.selected },
                              }));
                            }}
                          />
                          <span className="text-slate-700 dark:text-slate-200">Add</span>
                        </label>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                      No catalog items match your search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Integration note: In production, this is a real Catalog route. Selections are returned to
          Campaign Builder via router state, URL params, or global store.
        </div>
      </div>
    </FullscreenModal>
  );
}

/* ------------------------- seed campaigns ------------------------- */

const INIT_CAMPAIGNS = [
  {
    id: 'S-201',
    name: 'Beauty Flash Week (Combo)',
    stage: 'Execution',
    approvalStatus: 'Approved',
    creatorUsageDecision: 'I will use a Creator',
    collabMode: 'Open for Collabs',
    approvalMode: 'Manual',
    offerScope: 'Products',
    promoType: 'Discount',
    promoArrangement: 'PercentOff',
    currency: 'USD',
    estValue: 2400,
    region: 'East Africa',
    type: 'Live + Shoppables.',
    startDate: '2026-02-10',
    durationDays: 14,
    endDate: computeEndDate('2026-02-10', 14),
    items: [
      {
        ...CATALOG_ITEMS[2],
        plannedQty: 40,
        discount: { mode: 'percent', value: 15 },
        discountedPrice: calcDiscountedPrice(CATALOG_ITEMS[2].price, 'percent', 15),
        discountLabel: formatDiscount('percent', 15, 'USD'),
      },
      {
        ...CATALOG_ITEMS[3],
        plannedQty: 25,
        discount: { mode: 'amount', value: 5 },
        discountedPrice: calcDiscountedPrice(CATALOG_ITEMS[3].price, 'amount', 5),
        discountLabel: formatDiscount('amount', 5, 'USD'),
      },
    ],
    creatorsCount: 2,
    pitchesCount: 7,
    invitesSent: 0,
    invitesAccepted: 0,
    proposalsCount: 2,
    contractCount: 1,
    pendingSupplierApproval: true,
    pendingAdminApproval: false,
    adminRejected: false,
    creatorRejected: false,
    renegotiation: false,
    health: 'on-track',
    nextAction: 'Approve Creator Clip #3',
    lastActivity: 'Assets submitted · 2h',
    lastActivityAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: 'S-202',
    name: 'Tech Friday Mega Live',
    stage: 'Draft',
    approvalStatus: 'Pending',
    creatorUsageDecision: 'I will use a Creator',
    collabMode: 'Invite-only',
    approvalMode: 'Manual',
    offerScope: 'Products',
    promoType: 'Coupon',
    promoArrangement: 'InfluencerCode',
    promoCode: 'TECHFRIDAY',
    currency: 'USD',
    estValue: 3100,
    region: 'Africa / Asia',
    type: 'Live Sessionz',
    startDate: '2026-02-25',
    durationDays: 10,
    endDate: computeEndDate('2026-02-25', 10),
    items: [
      {
        ...CATALOG_ITEMS[1],
        plannedQty: 60,
        discount: { mode: 'percent', value: 10 },
        discountedPrice: calcDiscountedPrice(CATALOG_ITEMS[1].price, 'percent', 10),
        discountLabel: formatDiscount('percent', 10, 'USD'),
      },
    ],
    creatorsCount: 0,
    pitchesCount: 0,
    invitesSent: 0,
    invitesAccepted: 0,
    proposalsCount: 0,
    contractCount: 0,
    pendingSupplierApproval: false,
    pendingAdminApproval: true,
    adminRejected: false,
    creatorRejected: false,
    renegotiation: false,
    health: 'at-risk',
    nextAction: 'Await Admin approval',
    lastActivity: 'Submitted for approval · 1d',
    lastActivityAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    queuedStageAfterApproval: 'Collabs',
    queuedNextActionAfterApproval: 'Invite creators',
  },
];

export function seedSupplierCampaigns() {
  return JSON.parse(JSON.stringify(INIT_CAMPAIGNS));
}

export function seedSupplierCampaignBuilder() {
  return {
    name: '',
    type: 'Shoppable Adz',
    region: 'East Africa',
    currency: 'USD',
    estValue: 1000,
    internalReference: '',
    commerceMode: 'Retail',
    bundleMode: 'Single item',
    startDate: todayYMD(),
    durationDays: 7,
    startTime: '09:00',
    endTime: '21:00',
    timezone: 'Africa/Kampala',
    flashWindows: '',
    marketRegions: ['East Africa'],
    shippingConstraints: [],
    contentLanguages: ['English'],
    promoType: 'Discount',
    promoArrangement: 'PercentOff',
    promoCode: '',
    shippingThreshold: 0,
    giftNote: '',
    offerScope: 'Products',
    defaultDiscountMode: 'percent',
    defaultDiscountValue: 10,
    items: [],
    hasGiveaways: false,
    giveaways: [],
    regulatedDocsConfirmed: false,
    regulatedDisclaimersAccepted: false,
    regulatedDeskNotes: '',
    creatorUsageDecision: 'I will use a Creator',
    collabMode: 'Open for Collabs',
    approvalMode: 'Manual',
    allowMultiCreators: true,
    notes: '',
    internalOwner: 'Supplier Manager',
  };
}

const seedSupplierCampaignBuilderValue = seedSupplierCampaignBuilder();
const seedSupplierCampaignBuilderStep = 1;

/* ------------------------- main component ------------------------- */

export default function SupplierMyCampaignsPage() {
  const { toasts, push } = useToasts();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const [activeStageFilter, setActiveStageFilter] = useState('All');
  const [search, setSearch] = useState('');

  const [sortKey, setSortKey] = useState('estValue');
  const [sortOrder, setSortOrder] = useState('desc');

  const [builderOpen, setBuilderOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);

  // Catalog page state
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogKind, setCatalogKind] = useState('Product');
  const overlayOpen = builderOpen || detailsOpen || catalogOpen;

  const [builderStep, setBuilderStep] = useState(seedSupplierCampaignBuilderStep);
  const [builder, setBuilder] = useState<any>(seedSupplierCampaignBuilderValue);
  const builderHashRef = useRef('');

  const giveawaysSupported = useMemo(
    () => campaignTypeSupportsGiveaways(builder.type),
    [builder.type]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;

    if (!overlayOpen) {
      body.classList.remove('mldz-overlay-open');
      return;
    }

    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;

    body.classList.add('mldz-overlay-open');
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    return () => {
      body.classList.remove('mldz-overlay-open');
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
    };
  }, [overlayOpen]);
  const campaignGiveaways = useMemo(
    () => (Array.isArray(builder.giveaways) ? builder.giveaways : []),
    [builder.giveaways]
  );
  const totalGiveawayQty = useMemo(
    () => campaignGiveaways.reduce((sum, g) => sum + positiveIntOrFallback(g?.quantity, 1), 0),
    [campaignGiveaways]
  );

  const [giveawayAddMode, setGiveawayAddMode] = useState('featured');
  const [featuredGiveawayItemId, setFeaturedGiveawayItemId] = useState('');
  const [featuredGiveawayQuantity, setFeaturedGiveawayQuantity] = useState('1');
  const [customGiveawayDraft, setCustomGiveawayDraft] = useState({
    title: '',
    quantity: '1',
    imageUrl: '',
    posterAssetId: '',
    assetName: '',
  });

  const featuredGiveawayQtyValue = parsePositiveInt(featuredGiveawayQuantity);
  const customGiveawayQtyValue = parsePositiveInt(customGiveawayDraft.quantity);

  const builderDraftPayload = useMemo(
    () =>
      buildCampaignBuilderPayload({
        id: SELLER_CAMPAIGN_BUILDER_ID,
        builderStep,
        builder,
        giveawayUi: {
          giveawayAddMode,
          featuredGiveawayItemId,
          featuredGiveawayQuantity,
          customGiveawayDraft,
        },
      }),
    [
      builder,
      builderStep,
      customGiveawayDraft,
      featuredGiveawayItemId,
      featuredGiveawayQuantity,
      giveawayAddMode,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      setWorkspaceLoaded(false);
      setWorkspaceError(null);

      try {
        const [workspace, draft] = await Promise.all([
          backendApi.getCampaignWorkspace(),
          backendApi.getLiveBuilder(SELLER_CAMPAIGN_BUILDER_ID).catch(() => null),
        ]);

        if (cancelled) return;

        const mappedWorkspace = mapCampaignWorkspace(workspace);
        setCampaigns(mappedWorkspace.campaigns);
        setCatalogItems(mappedWorkspace.catalogItems);

        if (draft) {
          const mappedDraft = mapCampaignBuilderRecord(draft);
          if (mappedDraft.builder && Object.keys(mappedDraft.builder).length) {
            setBuilder(mappedDraft.builder);
          }
          if (mappedDraft.builderStep) {
            setBuilderStep(mappedDraft.builderStep);
          }
          const ui = mappedDraft.giveawayUi || {};
          if (ui.giveawayAddMode === 'featured' || ui.giveawayAddMode === 'custom') {
            setGiveawayAddMode(ui.giveawayAddMode);
          }
          if (typeof ui.featuredGiveawayItemId === 'string') {
            setFeaturedGiveawayItemId(ui.featuredGiveawayItemId);
          }
          if (typeof ui.featuredGiveawayQuantity === 'string') {
            setFeaturedGiveawayQuantity(ui.featuredGiveawayQuantity);
          }
          if (ui.customGiveawayDraft && typeof ui.customGiveawayDraft === 'object') {
            setCustomGiveawayDraft({
              title: typeof ui.customGiveawayDraft.title === 'string' ? ui.customGiveawayDraft.title : '',
              quantity: typeof ui.customGiveawayDraft.quantity === 'string' ? ui.customGiveawayDraft.quantity : '1',
              imageUrl: typeof ui.customGiveawayDraft.imageUrl === 'string' ? ui.customGiveawayDraft.imageUrl : '',
              posterAssetId:
                typeof ui.customGiveawayDraft.posterAssetId === 'string'
                  ? ui.customGiveawayDraft.posterAssetId
                  : '',
              assetName: typeof ui.customGiveawayDraft.assetName === 'string' ? ui.customGiveawayDraft.assetName : '',
            });
          }
          builderHashRef.current = JSON.stringify(
            buildCampaignBuilderPayload({
              id: mappedDraft.id,
              builderStep: mappedDraft.builderStep || 1,
              builder: mappedDraft.builder,
              giveawayUi: mappedDraft.giveawayUi,
            })
          );
        }
      } catch (error) {
        if (cancelled) return;
        setWorkspaceError(error instanceof Error ? error.message : 'Unable to load campaigns workspace');
        push('Unable to load campaigns workspace from backend.', 'error');
      } finally {
        if (!cancelled) {
          setWorkspaceLoaded(true);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [push]);

  useEffect(() => {
    if (!workspaceLoaded) return;
    const nextHash = JSON.stringify(builderDraftPayload);
    if (nextHash === builderHashRef.current) return;

    const timer = window.setTimeout(() => {
      void backendApi
        .saveLiveBuilder(builderDraftPayload)
        .then(() => {
          builderHashRef.current = nextHash;
        })
        .catch(() => {
          push('Unable to persist campaign builder draft.', 'error');
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [builderDraftPayload, push, workspaceLoaded]);

  useEffect(() => {
    if (!Array.isArray(builder.items) || builder.items.length === 0) {
      setFeaturedGiveawayItemId('');
      return;
    }
    if (featuredGiveawayItemId && builder.items.some((it) => it.id === featuredGiveawayItemId))
      return;
    setFeaturedGiveawayItemId(builder.items[0]?.id || '');
  }, [builder.items, featuredGiveawayItemId]);

  const persistBuilderForAssetPicker = useCallback(async () => {
    await backendApi.saveLiveBuilder(builderDraftPayload);
    builderHashRef.current = JSON.stringify(builderDraftPayload);
  }, [builderDraftPayload]);

  const buildReturnToUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const u = new URL(window.location.href);
    u.searchParams.set('restoreCampaignBuilder', '1');
    u.searchParams.delete('assetId');
    u.searchParams.delete('applyTo');
    return u.toString();
  }, []);

  const openAssetLibraryPicker = useCallback(
    async (applyTo = 'campaignGiveawayPoster') => {
      if (typeof window === 'undefined') return;
      await persistBuilderForAssetPicker();
      const picker = new URL('/supplier/deliverables/assets', window.location.origin);
      picker.searchParams.set('mode', 'picker');
      picker.searchParams.set('target', 'supplierCampaign');
      picker.searchParams.set('applyTo', applyTo);
      const returnTo = buildReturnToUrl();
      if (returnTo) picker.searchParams.set('returnTo', returnTo);
      window.location.assign(picker.toString());
    },
    [persistBuilderForAssetPicker, buildReturnToUrl]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sp = new URLSearchParams(window.location.search);
    const shouldRestore = sp.get('restoreCampaignBuilder') === '1' || sp.has('assetId');
    if (!shouldRestore) return;

    void (async () => {
      const saved = await backendApi.getLiveBuilder(SELLER_CAMPAIGN_BUILDER_ID).catch(() => null);
      const mapped = saved ? mapCampaignBuilderRecord(saved) : null;
      if (mapped?.builder && Object.keys(mapped.builder).length) {
        setBuilder(mapped.builder);
        if (mapped.builderStep) setBuilderStep(mapped.builderStep);
        setBuilderOpen(true);
      }

      const ui = mapped?.giveawayUi;
      if (ui && typeof ui === 'object') {
      if (ui.giveawayAddMode === 'featured' || ui.giveawayAddMode === 'custom')
        setGiveawayAddMode(ui.giveawayAddMode);
      if (typeof ui.featuredGiveawayItemId === 'string')
        setFeaturedGiveawayItemId(ui.featuredGiveawayItemId);
      if (typeof ui.featuredGiveawayQuantity === 'string')
        setFeaturedGiveawayQuantity(ui.featuredGiveawayQuantity);
      if (ui.customGiveawayDraft && typeof ui.customGiveawayDraft === 'object') {
        setCustomGiveawayDraft({
          title:
            typeof ui.customGiveawayDraft.title === 'string' ? ui.customGiveawayDraft.title : '',
          quantity:
            typeof ui.customGiveawayDraft.quantity === 'string'
              ? ui.customGiveawayDraft.quantity
              : '1',
          imageUrl:
            typeof ui.customGiveawayDraft.imageUrl === 'string'
              ? ui.customGiveawayDraft.imageUrl
              : '',
          posterAssetId:
            typeof ui.customGiveawayDraft.posterAssetId === 'string'
              ? ui.customGiveawayDraft.posterAssetId
              : '',
          assetName:
            typeof ui.customGiveawayDraft.assetName === 'string'
              ? ui.customGiveawayDraft.assetName
              : '',
        });
      }
      }

      const assetId = sp.get('assetId') || '';
      const applyTo = sp.get('applyTo') || '';
      if (assetId && applyTo === 'campaignGiveawayPoster') {
        const assets = await backendApi.getMediaAssets().catch(() => []);
        const rawAsset = assets.find((entry) => String(entry.id || '') === assetId);
        const asset = rawAsset
          ? coercePickedImageAsset({
              id: rawAsset.id,
              title: rawAsset.name,
              previewUrl: rawAsset.url,
            })
          : null;
        if (asset) {
          setCustomGiveawayDraft((prev) => ({
            ...prev,
            imageUrl: asset.previewUrl,
            posterAssetId: asset.id || prev.posterAssetId,
            assetName: asset.title || prev.assetName,
          }));
          push('Custom giveaway poster attached from Asset Library.', 'success');
        }
      }

      const clean = new URL(window.location.href);
      clean.searchParams.delete('restoreCampaignBuilder');
      clean.searchParams.delete('assetId');
      clean.searchParams.delete('applyTo');
      clean.searchParams.delete('returnTo');
      const qs = clean.searchParams.toString();
      window.history.replaceState({}, '', clean.pathname + (qs ? `?${qs}` : '') + clean.hash);
    })();
  }, [push]);

  function removeCampaignGiveaway(giveawayId) {
    setBuilder((p) => ({
      ...p,
      giveaways: (p.giveaways || []).filter((g) => g.id !== giveawayId),
    }));
  }

  function addFeaturedGiveaway() {
    const quantity = featuredGiveawayQtyValue;
    if (!featuredGiveawayItemId || !quantity) {
      push('Select a featured product/service and enter a valid quantity.', 'error');
      return;
    }

    const linkedItem = (builder.items || []).find((it) => it.id === featuredGiveawayItemId);
    if (!linkedItem) {
      push('That featured item is no longer available in this campaign.', 'error');
      return;
    }

    setBuilder((p) => {
      const next = Array.isArray(p.giveaways) ? [...p.giveaways] : [];
      const existingIndex = next.findIndex(
        (g) => g.source === 'featured' && g.linkedItemId === featuredGiveawayItemId
      );
      if (existingIndex >= 0) {
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: positiveIntOrFallback(next[existingIndex].quantity, 1) + quantity,
        };
      } else {
        next.push({
          id: uid('GW'),
          source: 'featured',
          linkedItemId: featuredGiveawayItemId,
          quantity,
        });
      }
      return { ...p, hasGiveaways: true, giveaways: next };
    });

    setFeaturedGiveawayQuantity('1');
    push('Featured-item giveaway added.', 'success');
  }

  function addCustomGiveaway() {
    const title = String(customGiveawayDraft.title || '').trim();
    const quantity = customGiveawayQtyValue;

    if (!title) {
      push('Enter the custom giveaway product/service name.', 'error');
      return;
    }
    if (!quantity) {
      push('Enter a valid custom giveaway quantity.', 'error');
      return;
    }
    if (!customGiveawayDraft.imageUrl) {
      push('Attach a poster image from Asset Library for the custom giveaway.', 'error');
      return;
    }

    setBuilder((p) => ({
      ...p,
      hasGiveaways: true,
      giveaways: [
        ...(Array.isArray(p.giveaways) ? p.giveaways : []),
        {
          id: uid('GW'),
          source: 'custom',
          title,
          quantity,
          imageUrl: customGiveawayDraft.imageUrl,
          posterAssetId: customGiveawayDraft.posterAssetId,
          assetName: customGiveawayDraft.assetName,
        },
      ],
    }));

    setCustomGiveawayDraft({
      title: '',
      quantity: '1',
      imageUrl: '',
      posterAssetId: '',
      assetName: '',
    });
    push('Custom giveaway added.', 'success');
  }

  const builderEndDate = useMemo(
    () => computeEndDate(builder.startDate, builder.durationDays),
    [builder.startDate, builder.durationDays]
  );

  const promoLabels = useMemo(() => {
    const promoTypeLabel =
      PROMO_TYPES.find((p) => p.k === builder.promoType)?.label || builder.promoType;
    const promoArrangementLabel =
      PROMO_ARRANGEMENTS[builder.promoType]?.find((a) => a.k === builder.promoArrangement)?.label ||
      builder.promoArrangement;
    return { promoTypeLabel, promoArrangementLabel };
  }, [builder.promoType, builder.promoArrangement]);

  const regulatedTags = useMemo(
    () => uniq((builder.items || []).map((it) => it.regulatedTag).filter((t) => t && t !== 'None')),
    [builder.items]
  );
  const hasRegulated = regulatedTags.length > 0;

  const totals = useMemo(() => {
    const totalValue = campaigns.reduce((sum, c) => sum + (Number(c.estValue) || 0), 0);
    const activeCount = campaigns.filter((c) =>
      ['Collabs', 'Negotiating', 'Contracted', 'Execution'].includes(c.stage)
    ).length;
    const pendingApprovals = campaigns.filter(
      (c) =>
        c.pendingSupplierApproval ||
        c.pendingAdminApproval ||
        c.adminRejected ||
        c.approvalStatus === 'Pending'
    ).length;
    const creatorsEngaged = campaigns.reduce((sum, c) => sum + (Number(c.creatorsCount) || 0), 0);
    return { totalValue, activeCount, pendingApprovals, creatorsEngaged };
  }, [campaigns]);

  const stageSummaries = useMemo(() => {
    const map = {};
    STAGES.forEach((s) => (map[s] = { count: 0, value: 0 }));
    campaigns.forEach((c) => {
      const s = c.stage;
      if (!map[s]) map[s] = { count: 0, value: 0 };
      map[s].count += 1;
      map[s].value += Number(c.estValue) || 0;
    });
    return map;
  }, [campaigns]);

  const modeSummaries = useMemo(() => {
    const base = {
      useCreator: { count: 0 },
      supplierAsCreator: { count: 0 },
      notSure: { count: 0 },
    };
    campaigns.forEach((c) => {
      if (c.creatorUsageDecision === 'I will use a Creator') base.useCreator.count += 1;
      else if (c.creatorUsageDecision === 'I will NOT use a Creator')
        base.supplierAsCreator.count += 1;
      else base.notSure.count += 1;
    });
    return base;
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = campaigns.filter((c) => {
      if (activeStageFilter !== 'All' && c.stage !== activeStageFilter) return false;
      if (q) {
        const hay =
          `${c.name} ${c.type} ${c.region} ${c.creatorUsageDecision} ${c.collabMode} ${c.startDate || ''} ${c.endDate || ''} ${c.approvalStatus || ''} ${c.promoType || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const numericKeys = new Set(['estValue', 'lastActivityAt']);
      if (numericKeys.has(sortKey)) {
        const na = Number(va) || 0;
        const nb = Number(vb) || 0;
        if (na < nb) return sortOrder === 'asc' ? -1 : 1;
        if (na > nb) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }
      const sa = String(va || '');
      const sb = String(vb || '');
      const cmp = sa.localeCompare(sb);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [campaigns, activeStageFilter, search, sortKey, sortOrder]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  function openCreate() {
    setBuilderStep(1);
    setGiveawayAddMode('featured');
    setFeaturedGiveawayItemId('');
    setFeaturedGiveawayQuantity('1');
    setCustomGiveawayDraft({
      title: '',
      quantity: '1',
      imageUrl: '',
      posterAssetId: '',
      assetName: '',
    });

    setBuilder((p) => ({
      ...p,
      name: '',
      estValue: 1000,

      internalReference: '',

      commerceMode: 'Retail',
      bundleMode: 'Single item',

      startDate: todayYMD(),
      durationDays: 7,

      startTime: '09:00',
      endTime: '21:00',
      timezone: 'Africa/Kampala',
      flashWindows: '',
      marketRegions: ['East Africa'],
      shippingConstraints: [],
      contentLanguages: ['English'],

      promoType: 'Discount',
      promoArrangement: 'PercentOff',
      promoCode: '',
      shippingThreshold: 0,
      giftNote: '',

      offerScope: 'Products',
      defaultDiscountMode: 'percent',
      defaultDiscountValue: 10,
      items: [],

      hasGiveaways: false,
      giveaways: [],

      regulatedDocsConfirmed: false,
      regulatedDisclaimersAccepted: false,
      regulatedDeskNotes: '',

      creatorUsageDecision: 'I will use a Creator',
      collabMode: 'Open for Collabs',
      approvalMode: 'Manual',
      allowMultiCreators: true,
      notes: '',
    }));
    setBuilderOpen(true);
  }

  function openDetails(c) {
    setActiveCampaign(c);
    setDetailsOpen(true);
  }

  function persistCampaignUpdate(campaign, patch) {
    setCampaigns((xs) =>
      xs.map((entry) => (entry.id === campaign.id ? { ...entry, ...patch } : entry))
    );
    void backendApi
      .patchCampaign(campaign.id, buildCampaignPayload({ ...campaign, ...patch }))
      .then((saved) => {
        setCampaigns((xs) => xs.map((entry) => (entry.id === campaign.id ? { ...entry, ...saved } : entry)));
      })
      .catch(() => push('Unable to persist campaign update.', 'error'));
  }

  function allowProducts(scope) {
    return scope === 'Products' || scope === 'Both';
  }

  function allowServices(scope) {
    return scope === 'Services' || scope === 'Both';
  }

  function openCatalog(kind) {
    // Open the catalog picker float on this page (no route navigation)
    push('Opening catalog picker…', 'info');
    setCatalogKind(kind);
    setBuilderOpen(true);
    setCatalogOpen(true);
  }

  // ------------------------- NEW: builder item helpers (Retail + Wholesale tiers) -------------------------

  function updateLineItem(itemId, patch) {
    setBuilder((p) => ({
      ...p,
      items: (p.items || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    }));
  }

  function removeLineItem(itemId) {
    setBuilder((p) => ({ ...p, items: (p.items || []).filter((it) => it.id !== itemId) }));
    push('Item removed.', 'success');
  }

  function updateLineItemDiscount(itemId, nextMode, nextValue) {
    setBuilder((p) => ({
      ...p,
      items: (p.items || []).map((it) => {
        if (it.id !== itemId) return it;
        const discountedPrice = calcDiscountedPrice(it.price, nextMode, nextValue);
        return {
          ...it,
          discount: { mode: nextMode, value: normalizedNum(nextValue, 0) },
          discountedPrice,
          discountLabel: formatDiscount(nextMode, nextValue, p.currency),
        };
      }),
    }));
  }

  function updateLineItemLimits(itemId, patch) {
    setBuilder((p) => ({
      ...p,
      items: (p.items || []).map((it) => {
        if (it.id !== itemId) return it;
        const prev = it.limits || { total: '', perBuyer: '' };
        return { ...it, limits: { ...prev, ...patch } };
      }),
    }));
  }

  function ensureWholesaleTiersForAll(items, ctx) {
    const mode = ctx?.defaultDiscountMode || 'percent';
    const val = normalizedNum(ctx?.defaultDiscountValue, 10);
    return (items || []).map((it) => {
      if (Array.isArray(it.wholesaleTiers) && it.wholesaleTiers.length) return it;
      return {
        ...it,
        wholesaleTiers: [
          {
            ...makeTier(it.id),
            discountMode: mode,
            discountValue: val,
          },
        ],
      };
    });
  }

  function addWholesaleTier(itemId) {
    setBuilder((p) => ({
      ...p,
      items: (p.items || []).map((it) => {
        if (it.id !== itemId) return it;
        const tiers = Array.isArray(it.wholesaleTiers) ? it.wholesaleTiers : [];
        if (tiers.length >= 4) return it;
        return {
          ...it,
          wholesaleTiers: [
            ...tiers,
            {
              ...makeTier(it.id),
              minQty: tiers[tiers.length - 1]?.maxQty
                ? normalizedNum(tiers[tiers.length - 1].maxQty, 1) + 1
                : normalizedNum(tiers[tiers.length - 1]?.minQty, 1) + 1,
              discountMode: p.defaultDiscountMode || 'percent',
              discountValue: normalizedNum(p.defaultDiscountValue, 10),
            },
          ],
        };
      }),
    }));
  }

  function removeWholesaleTier(itemId, tierId) {
    setBuilder((p) => ({
      ...p,
      items: (p.items || []).map((it) => {
        if (it.id !== itemId) return it;
        const tiers = Array.isArray(it.wholesaleTiers) ? it.wholesaleTiers : [];
        const next = tiers.filter((t) => t.id !== tierId);
        return { ...it, wholesaleTiers: next };
      }),
    }));
  }

  function updateWholesaleTier(itemId, tierId, patch) {
    setBuilder((p) => ({
      ...p,
      items: (p.items || []).map((it) => {
        if (it.id !== itemId) return it;
        const tiers = Array.isArray(it.wholesaleTiers) ? it.wholesaleTiers : [];
        return {
          ...it,
          wholesaleTiers: tiers.map((t) => (t.id === tierId ? { ...t, ...patch } : t)),
        };
      }),
    }));
  }

  function applyDefaultDiscountToSelected() {
    const mode = builder.defaultDiscountMode;
    const val = safeNum(builder.defaultDiscountValue, 0);

    setBuilder((p) => {
      const nextItems = (p.items || []).map((it) => {
        // Retail: set per-line discount
        if (p.commerceMode !== 'Wholesale') {
          const discountedPrice = calcDiscountedPrice(it.price, mode, val);
          return {
            ...it,
            discount: { mode, value: val },
            discountedPrice,
            discountLabel: formatDiscount(mode, val, p.currency),
          };
        }

        // Wholesale: apply default to every tier (per-line tiers)
        const tiers = Array.isArray(it.wholesaleTiers) ? it.wholesaleTiers : [];
        const nextTiers = (tiers.length ? tiers : [makeTier(it.id)]).map((t) => ({
          ...t,
          discountMode: mode,
          discountValue: val,
        }));

        return {
          ...it,
          wholesaleTiers: nextTiers,
        };
      });

      return { ...p, items: nextItems };
    });

    push('Default discount applied to selected items.', 'success');
  }

  function saveDraft() {
    void upsertCampaign({ submitForApproval: false });
  }

  function submitForApproval() {
    void upsertCampaign({ submitForApproval: true });
  }

  async function upsertCampaign({ submitForApproval }) {
    const name = String(builder.name || '').trim();
    if (!name) {
      push('Campaign name is required.', 'error');
      return;
    }

    // duration rules
    const durationDays = clamp(builder.durationDays, 1, 45);
    const startDate = builder.startDate;
    const endDate = computeEndDate(startDate, durationDays);
    const effectiveGiveaways =
      campaignTypeSupportsGiveaways(builder.type) && builder.hasGiveaways
        ? Array.isArray(builder.giveaways)
          ? builder.giveaways
          : []
        : [];

    if (submitForApproval) {
      if (!startDate) {
        push('Start date is required.', 'error');
        return;
      }
      if (!durationDays || durationDays < 1 || durationDays > 45) {
        push('Duration must be between 1 and 45 days.', 'error');
        return;
      }
      if (!Array.isArray(builder.items) || builder.items.length === 0) {
        push('Please add at least one Product or Service to the campaign.', 'error');
        return;
      }

      if (campaignTypeSupportsGiveaways(builder.type) && builder.hasGiveaways) {
        if (!effectiveGiveaways.length) {
          push(
            'Please add at least one giveaway item or switch giveaways off for this campaign.',
            'error'
          );
          return;
        }

        for (const giveaway of effectiveGiveaways) {
          const quantity = positiveIntOrFallback(giveaway?.quantity, 0);
          if (quantity < 1) {
            push('Each giveaway must have a valid quantity of 1 or more.', 'error');
            return;
          }

          if (
            (giveaway?.source === 'featured' || giveaway?.linkedItemId) &&
            !(builder.items || []).some((it) => it.id === giveaway?.linkedItemId)
          ) {
            push(
              'One or more featured-item giveaways no longer match the selected campaign items.',
              'error'
            );
            return;
          }

          if (
            (giveaway?.source === 'custom' || !giveaway?.linkedItemId) &&
            !String(giveaway?.title || '').trim()
          ) {
            push('Each custom giveaway must include the product or service name.', 'error');
            return;
          }

          if (
            (giveaway?.source === 'custom' || !giveaway?.linkedItemId) &&
            !String(giveaway?.imageUrl || '').trim()
          ) {
            push('Each custom giveaway must include a poster image from Asset Library.', 'error');
            return;
          }
        }
      }

      // Retail vs Wholesale requirement
      if (String(builder.commerceMode || 'Retail') === 'Wholesale') {
        const missingTiers = (builder.items || []).filter(
          (it) => !Array.isArray(it.wholesaleTiers) || it.wholesaleTiers.length === 0
        );
        if (missingTiers.length) {
          push(
            `Wholesale campaigns require quantity/price tiers (max 4). Missing tiers for: ${missingTiers
              .map((x) => x.title)
              .slice(0, 3)
              .join(', ')}${missingTiers.length > 3 ? '…' : ''}`,
            'error'
          );
          return;
        }
        const overLimit = (builder.items || []).filter(
          (it) => Array.isArray(it.wholesaleTiers) && it.wholesaleTiers.length > 4
        );
        if (overLimit.length) {
          push('Wholesale tier limit exceeded. Maximum is 4 tiers per item.', 'error');
          return;
        }

        for (const it of builder.items || []) {
          for (const t of it.wholesaleTiers || []) {
            const minQ = clamp(t.minQty, 1, 100000000);
            const maxRaw = t.maxQty;
            const maxQ =
              maxRaw === '' || maxRaw === null || typeof maxRaw === 'undefined'
                ? null
                : clamp(maxRaw, 1, 100000000);
            if (maxQ !== null && maxQ < minQ) {
              push(`Wholesale tier max qty must be ≥ min qty for “${it.title}”.`, 'error');
              return;
            }
          }
        }
      }

      // Regulated routing requirement
      const regulated = (builder.items || []).filter(
        (it) => it.regulatedTag && it.regulatedTag !== 'None'
      );
      if (regulated.length) {
        if (!builder.regulatedDocsConfirmed) {
          push('Regulated items detected. Please confirm required documents.', 'error');
          return;
        }
        if (!builder.regulatedDisclaimersAccepted) {
          push('Regulated items detected. Please accept the disclaimer.', 'error');
          return;
        }
      }
      if (!builder.promoType) {
        push('Promo type is required.', 'error');
        return;
      }
      if (!builder.promoArrangement) {
        push('Promo arrangement is required.', 'error');
        return;
      }
    }

    const id = uid('S');

    // after approval routing
    let queuedStageAfterApproval = 'Draft';
    let queuedNextActionAfterApproval = 'Complete setup';

    if (builder.creatorUsageDecision === 'I will NOT use a Creator') {
      queuedStageAfterApproval = 'Execution';
      queuedNextActionAfterApproval = 'Upload content (Supplier as Creator)';
    } else if (builder.creatorUsageDecision === 'I will use a Creator') {
      queuedStageAfterApproval = 'Collabs';
      queuedNextActionAfterApproval =
        builder.collabMode === 'Invite-only' ? 'Invite creators' : 'Await pitches';
    } else {
      queuedStageAfterApproval = 'Draft';
      queuedNextActionAfterApproval = 'Choose creator plan (pending)';
    }

    const newCampaign = {
      id,
      name,
      type: builder.type,
      region: builder.region,
      currency: builder.currency,
      estValue: clamp(builder.estValue, 0, 100000000),

      // internal reference + commerce
      internalReference: builder.internalReference,
      commerceMode: builder.commerceMode,
      bundleMode: builder.bundleMode,

      // timing + targeting
      startTime: builder.startTime,
      endTime: builder.endTime,
      timezone: builder.timezone,
      flashWindows: builder.flashWindows,
      marketRegions: builder.marketRegions,
      shippingConstraints: builder.shippingConstraints,
      contentLanguages: builder.contentLanguages,

      // compliance
      regulatedDocsConfirmed: builder.regulatedDocsConfirmed,
      regulatedDisclaimersAccepted: builder.regulatedDisclaimersAccepted,
      regulatedDeskNotes: builder.regulatedDeskNotes,

      // duration
      startDate,
      durationDays,
      endDate,

      // offer scope
      offerScope: builder.offerScope,

      // promo
      promoType: builder.promoType,
      promoArrangement: builder.promoArrangement,
      promoCode: builder.promoCode,
      shippingThreshold: builder.shippingThreshold,
      giftNote: builder.giftNote,

      // items
      items: Array.isArray(builder.items) ? builder.items : [],

      // giveaways (live-only campaign types)
      hasGiveaways: effectiveGiveaways.length > 0,
      giveaways: effectiveGiveaways,

      // flow
      creatorUsageDecision: builder.creatorUsageDecision,
      collabMode:
        builder.creatorUsageDecision === 'I will use a Creator' ? builder.collabMode : '—',
      approvalMode: builder.approvalMode,
      allowMultiCreators: builder.allowMultiCreators,

      // campaign approval gating
      approvalStatus: submitForApproval ? 'Pending' : 'NotSubmitted',
      pendingAdminApproval: submitForApproval,
      adminRejected: false,

      // stage is Draft until Admin approval
      stage: 'Draft',
      queuedStageAfterApproval,
      queuedNextActionAfterApproval,

      // activity
      creatorsCount: 0,
      pitchesCount: 0,
      invitesSent: 0,
      invitesAccepted: 0,
      proposalsCount: 0,
      contractCount: 0,
      pendingSupplierApproval: false,
      creatorRejected: false,
      renegotiation: false,
      health: submitForApproval ? 'on-track' : 'stalled',
      nextAction: submitForApproval ? 'Await Admin approval' : 'Complete setup',
      lastActivity: submitForApproval ? 'Submitted for approval · now' : 'Draft saved · now',
      lastActivityAt: Date.now(),

      notes: builder.notes,
      internalOwner: builder.internalOwner,
    };

    try {
      const savedCampaign = await backendApi.createCampaign(buildCampaignPayload(newCampaign));
      const nextCampaign = {
        ...newCampaign,
        ...savedCampaign,
      };
      setCampaigns((xs) => [nextCampaign, ...xs.filter((entry) => entry.id !== nextCampaign.id)]);
      setBuilderOpen(false);
      push(
        submitForApproval ? 'Campaign submitted for Admin approval.' : 'Draft saved.',
        submitForApproval ? 'success' : 'info'
      );
      setTimeout(() => {
        openDetails(nextCampaign);
      }, 0);
    } catch {
      push('Unable to persist campaign to backend.', 'error');
    }
  }

  function simulateAdminDecision(c, decision) {
    if (decision === 'approve') {
      const nextCampaign = {
        ...c,
        approvalStatus: 'Approved',
        pendingAdminApproval: false,
        stage: c.queuedStageAfterApproval || c.stage,
        nextAction: c.queuedNextActionAfterApproval || c.nextAction,
        lastActivity: 'Admin approved · now',
        lastActivityAt: Date.now(),
        health: 'on-track',
      };
      void backendApi
        .patchCampaign(c.id, buildCampaignPayload(nextCampaign))
        .then((saved) => {
          push('Admin approved (preview).', 'success');
          setCampaigns((xs) => xs.map((x) => (x.id === c.id ? { ...nextCampaign, ...saved } : x)));
        })
        .catch(() => push('Unable to persist admin approval.', 'error'));
      return;
    }

    const nextCampaign = {
      ...c,
      approvalStatus: 'Rejected',
      pendingAdminApproval: false,
      adminRejected: true,
      stage: 'Draft',
      nextAction: 'Fix and resubmit',
      lastActivity: 'Admin rejected · now',
      lastActivityAt: Date.now(),
      health: 'at-risk',
    };
    void backendApi
      .patchCampaign(c.id, buildCampaignPayload(nextCampaign))
      .then((saved) => {
        push('Admin rejected (preview).', 'warn');
        setCampaigns((xs) => xs.map((x) => (x.id === c.id ? { ...nextCampaign, ...saved } : x)));
      })
      .catch(() => push('Unable to persist admin rejection.', 'error'));
  }

  function resubmitAfterRejection(c) {
    const nextCampaign = {
      ...c,
      approvalStatus: 'Pending',
      pendingAdminApproval: true,
      adminRejected: false,
      nextAction: 'Await Admin approval',
      lastActivity: 'Resubmitted · now',
      lastActivityAt: Date.now(),
      health: 'on-track',
    };
    void backendApi
      .patchCampaign(c.id, buildCampaignPayload(nextCampaign))
      .then((saved) => {
        push('Resubmitted for approval (preview).', 'success');
        setCampaigns((xs) => xs.map((x) => (x.id === c.id ? { ...nextCampaign, ...saved } : x)));
      })
      .catch(() => push('Unable to persist resubmission.', 'error'));
  }

  const promoDefaultsForCatalog = useMemo(() => {
    return {
      promoTypeLabel:
        PROMO_TYPES.find((p) => p.k === builder.promoType)?.label || builder.promoType,
      promoArrangementLabel:
        PROMO_ARRANGEMENTS[builder.promoType]?.find((a) => a.k === builder.promoArrangement)
          ?.label || builder.promoArrangement,
      defaultDiscountMode: builder.defaultDiscountMode,
      defaultDiscountValue: builder.defaultDiscountValue,
    };
  }, [
    builder.promoType,
    builder.promoArrangement,
    builder.defaultDiscountMode,
    builder.defaultDiscountValue,
  ]);

  if (!workspaceLoaded) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 text-sm font-bold">
          Loading campaigns workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <ToastStack toasts={toasts} />

      <PageHeader
        title="My Campaigns"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
            <span>🧭</span>
            <span>Command Center · Lifecycle · Creators · Approvals</span>
          </span>
        }
        actions={
          <>
            <Btn
              tone="ghost"
              onClick={() => {
                push('Opening Live Schedule (preview).', 'info');
                go('/supplier/live/schedule');
              }}
              title="Go to Live Schedule"
            >
              📅 Live
            </Btn>
            <Btn
              tone="ghost"
              onClick={() => {
                push('Opening Adz Manager (preview).', 'info');
                go('/supplier/adz/manager');
              }}
              title="Go to Adz Manager"
            >
              🛍️ Adz
            </Btn>
            <Btn tone="primary" onClick={openCreate} title="Create a campaign">
              ➕ New Campaign
            </Btn>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-4 overflow-y-auto overflow-x-hidden">
        {workspaceError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {workspaceError}
          </div>
        ) : null}
        <div className="w-full max-w-full flex flex-col gap-3">
          {/* Summary */}
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
            <div>
              <h1 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-0.5">
                My Campaigns
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Track every campaign you own – from drafts to Admin approval, creator collabs,
                execution, and analytics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex flex-col min-w-[160px]">
                <span className="text-slate-500 dark:text-slate-300">Total planned budget</span>
                <span className="text-lg font-semibold text-[#f77f00] dark:text-[#f77f00]">
                  {money('USD', totals.totalValue)}
                </span>
              </div>
              <div className="flex flex-col min-w-[130px]">
                <span className="text-slate-500 dark:text-slate-300">Active</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  {totals.activeCount}
                </span>
              </div>
              <div className="flex flex-col min-w-[130px]">
                <span className="text-slate-500 dark:text-slate-300">Pending actions</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  {totals.pendingApprovals}
                </span>
              </div>
            </div>
          </section>

          {/* Quick split */}
          <section className="flex flex-wrap gap-2">
            <Pill tone="neutral">
              👥 Use Creator:{' '}
              <span className="font-extrabold">{modeSummaries.useCreator.count}</span>
            </Pill>
            <Pill tone="neutral">
              ✨ Supplier as Creator:{' '}
              <span className="font-extrabold">{modeSummaries.supplierAsCreator.count}</span>
            </Pill>
            <Pill tone="neutral">
              ⏳ Not sure: <span className="font-extrabold">{modeSummaries.notSure.count}</span>
            </Pill>
            <Pill tone="brand">
              🎬 Creators engaged: <span className="font-extrabold">{totals.creatorsEngaged}</span>
            </Pill>
          </section>

          {/* Filters */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-2 flex flex-col gap-2 text-sm">
            <div className="flex flex-col gap-3 p-2">
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 transition-colors">
                <span className="text-slate-400">🔍</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter campaigns by name, promo, type, region, approval…"
                  className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveStageFilter('All')}
                  className={cx(
                    'px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                    activeStageFilter === 'All'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md scale-105'
                      : 'bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700'
                  )}
                >
                  All Pipelines
                </button>

                {STAGES.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setActiveStageFilter(stage)}
                    className={cx(
                      'px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                      activeStageFilter === stage
                        ? 'bg-[#f77f00] text-white border-[#f77f00] shadow-md scale-105'
                        : 'bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700'
                    )}
                    title={`${stageSummaries[stage]?.count || 0} campaigns · ${money('USD', stageSummaries[stage]?.value || 0)}`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-all shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight">Campaign Pipelines</h2>
              <div className="flex gap-3">
                <Btn onClick={() => toggleSort('name')} title="Sort by name">
                  ↕ Name
                </Btn>
                <Btn onClick={() => toggleSort('estValue')} title="Sort by budget">
                  ↕ Budget
                </Btn>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Campaign
                      </span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Mode
                      </span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Budget
                      </span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Status
                      </span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Next Step
                      </span>
                    </th>
                    <th className="px-6 py-4 text-right">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Actions
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {filteredCampaigns.map((c) => (
                    <CampaignRow
                      key={c.id}
                      campaign={c}
                      onOpen={() => openDetails(c)}
                      onGo={(path) => {
                        push(`Navigate → ${path}`, 'info');
                        go(path);
                      }}
                      onSwitchMode={() => {
                        if (!canSwitchCollabMode(c)) {
                          push(
                            'Collaboration mode cannot be changed after content submission begins.',
                            'warn'
                          );
                          return;
                        }
                        const nextMode =
                          c.collabMode === 'Invite-only' ? 'Open for Collabs' : 'Invite-only';
                        persistCampaignUpdate(c, {
                          collabMode: nextMode,
                          lastActivity: `Collab mode switched → ${nextMode} · now`,
                          lastActivityAt: Date.now(),
                        });
                        push(`Collab mode switched to ${nextMode}.`, 'success');
                      }}
                      onUpdate={(patch) => persistCampaignUpdate(c, patch)}
                      push={push}
                    />
                  ))}

                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                        No campaigns match your current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Catalog page modal */}
      <CatalogCampaignPickerPage
        catalogItems={catalogItems}
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        initialKind={catalogKind}
        allowProducts={allowProducts(builder.offerScope)}
        allowServices={allowServices(builder.offerScope)}
        campaignCurrency={builder.currency}
        promoDefaults={{
          ...promoDefaultsForCatalog,
          promoTypeLabel: promoLabels.promoTypeLabel,
          promoArrangementLabel: promoLabels.promoArrangementLabel,
        }}
        existingSelectedItems={builder.items}
        onConfirm={({ kind, selected }) => {
          // Merge: replace items of this kind, keep other kind (supports scope=Both)
          // Supplier upgrades:
          // - Preserve per-line settings (regulated tag, limits, wholesale tiers) when re-opening catalog.
          // - Ensure new lines get defaults needed for Pricing + Compliance sections.
          const selectedCount = Array.isArray(selected) ? selected.length : 0;

          setBuilder((p) => {
            const existingById = {};
            (p.items || []).forEach((x) => {
              existingById[x.id] = x;
            });

            const isThisKind = (it) =>
              kind === 'Product' ? it.kind === 'Product' : it.kind === 'Service';
            const keepOtherKind = (p.items || []).filter((it) => !isThisKind(it));

            const normalizedSelected = (selected || []).map((it) => {
              const prev = existingById[it.id];

              const discountMode = it.discount?.mode || prev?.discount?.mode || 'none';
              const discountValue = normalizedNum(it.discount?.value ?? prev?.discount?.value, 0);
              const discountedPrice =
                typeof it.discountedPrice === 'number'
                  ? it.discountedPrice
                  : calcDiscountedPrice(it.price, discountMode, discountValue);

              const base = {
                ...prev,
                ...it,

                // Ensure fields expected by Pricing + Compliance surfaces exist:
                regulatedTag: prev?.regulatedTag || it.regulatedTag || 'None',
                limits: prev?.limits || it.limits || { total: '', perBuyer: '' },

                plannedQty: clamp(it.plannedQty ?? prev?.plannedQty ?? 1, 1, 100000000),
                discount: { mode: discountMode, value: discountValue },
                discountedPrice,
                discountLabel:
                  it.discountLabel || formatDiscount(discountMode, discountValue, p.currency),
              };

              // Wholesale: tiers required (max 4) — ensure at least Tier 1 exists
              if (String(p.commerceMode || 'Retail') === 'Wholesale') {
                return ensureWholesaleTiersForAll([base], p)[0];
              }

              // Retail: tiers not required, but if present we keep them (in case user switches back to Wholesale later)
              return base;
            });

            return { ...p, items: [...keepOtherKind, ...normalizedSelected] };
          });

          setCatalogOpen(false);
          if (selectedCount > 0) {
            push(
              `${selectedCount} ${kind === 'Product' ? 'product' : 'service'} item(s) added.`,
              'success'
            );
          }
        }}
      />

      {/* + New Campaign (Side Drawer) */}
      <Drawer
        open={builderOpen}
        title="+ New Campaign"
        subtitle="Build a campaign draft, attach products/services, plan pricing & targeting, then submit for Admin approval."
        onClose={() => setBuilderOpen(false)}
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Step <span className="font-extrabold">{builderStep}</span> of{' '}
              <span className="font-extrabold">4</span>
              <span className="text-slate-400"> · </span>
              <span className="text-slate-500 dark:text-slate-400">
                {builderStep === 1
                  ? 'Setup'
                  : builderStep === 2
                    ? 'Creator plan'
                    : builderStep === 3
                      ? 'Collabs & approval'
                      : 'Review & submit'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Btn onClick={() => setBuilderOpen(false)} title="Close without saving">
                Cancel
              </Btn>

              <Btn
                disabled={builderStep <= 1}
                onClick={() => setBuilderStep((s) => Math.max(1, s - 1))}
                title="Go back"
              >
                ← Back
              </Btn>

              {builderStep < 4 ? (
                <Btn
                  tone="primary"
                  onClick={() => setBuilderStep((s) => Math.min(4, s + 1))}
                  title="Next step"
                >
                  Next →
                </Btn>
              ) : (
                <Btn tone="primary" onClick={submitForApproval} title="Send to Admin for approval">
                  🚀 Submit for Approval
                </Btn>
              )}

              <Btn onClick={saveDraft} title="Save as draft (Admin approval not requested)">
                💾 Save Draft
              </Btn>
            </div>
          </div>
        }
      >
        {/* Stepper */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 p-3 mb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold">Campaign Builder</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Configure campaign identity, items, pricing, targeting, creator workflow, and
                approvals.
              </div>
            </div>
            <Pill tone="brand">Step {builderStep}/4</Pill>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { n: 1, label: 'Setup' },
              { n: 2, label: 'Creator plan' },
              { n: 3, label: 'Collabs' },
              { n: 4, label: 'Review' },
            ].map((s) => (
              <button
                key={s.n}
                type="button"
                onClick={() => setBuilderStep(s.n)}
                className={cx(
                  'px-3 py-2 rounded-2xl border text-xs font-extrabold transition text-left',
                  builderStep === s.n
                    ? 'border-[#f77f00] bg-white dark:bg-slate-900'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 dark:bg-slate-950/40 hover:bg-gray-50 dark:hover:bg-slate-950'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-900 dark:text-slate-50">{s.label}</span>
                  <span
                    className={cx(
                      'h-2 w-2 rounded-full',
                      builderStep === s.n ? 'bg-[#f77f00]' : 'bg-slate-300 dark:bg-slate-700'
                    )}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 1 */}
        {builderStep === 1 ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 p-3">
              <div className="text-sm font-bold">Campaign setup</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Define identity, commerce model, timing/targeting, promo mechanics, and your catalog
                lines. Final step is Submit for Admin approval.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Basics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Campaign name *
                  </div>
                  <div className="mt-2">
                    <Input
                      value={builder.name}
                      onChange={(v) => setBuilder((p) => ({ ...p, name: v }))}
                      placeholder="Example: Beauty Flash Week (Combo)"
                    />
                  </div>
                </div>

                {/* Internal reference (screenshot #1) */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Internal reference
                  </div>
                  <div className="mt-2">
                    <Input
                      value={builder.internalReference}
                      onChange={(v) => setBuilder((p) => ({ ...p, internalReference: v }))}
                      placeholder="Internal code for your team"
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Optional — helps your team track the Dealz across internal systems.
                  </div>
                </div>
              </div>

              {/* Campaign meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Campaign type
                  </div>
                  <div className="mt-2">
                    <Select
                      value={builder.type}
                      onChange={(v) => setBuilder((p) => ({ ...p, type: v }))}
                    >
                      <option value="Shoppable Adz">Shoppable Adz</option>
                      <option value="Live Sessionz">Live Sessionz</option>
                      <option value="Live + Shoppables.">Live + Shoppables.</option>
                    </Select>
                  </div>
                </div>

                {/* NEW: Retail vs Wholesale */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Campaign pricing model
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Retail uses line-level discounts. Wholesale requires quantity/price tiers
                        (max 4 tiers per line).
                      </div>
                    </div>
                    <Pill tone={builder.commerceMode === 'Wholesale' ? 'brand' : 'neutral'}>
                      {builder.commerceMode}
                    </Pill>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {COMMERCE_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setBuilder((p) => {
                            const next = { ...p, commerceMode: m };
                            if (m === 'Wholesale') {
                              return {
                                ...next,
                                items: ensureWholesaleTiersForAll(p.items || [], p),
                              };
                            }
                            return next;
                          });
                        }}
                        className={cx(
                          'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                          builder.commerceMode === m
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {builder.commerceMode === 'Wholesale' ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3 text-xs text-amber-900/80 dark:text-amber-200/80">
                      Wholesale campaigns will show tiered pricing on the buyer side. Plan up to{' '}
                      <span className="font-extrabold">4 tiers</span> per product/service.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Region (primary)
                  </div>
                  <div className="mt-2">
                    <Select
                      value={builder.region}
                      onChange={(v) =>
                        setBuilder((p) => ({
                          ...p,
                          region: v,
                          marketRegions: p.marketRegions?.length ? p.marketRegions : [v],
                        }))
                      }
                    >
                      <option value="East Africa">East Africa</option>
                      <option value="West Africa">West Africa</option>
                      <option value="Southern Africa">Southern Africa</option>
                      <option value="North Africa">North Africa</option>
                      <option value="Africa / Asia">Africa / Asia</option>
                      <option value="Global">Global</option>
                    </Select>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Currency
                  </div>
                  <div className="mt-2">
                    <Select
                      value={builder.currency}
                      onChange={(v) => setBuilder((p) => ({ ...p, currency: v }))}
                    >
                      <option value="USD">USD</option>
                      <option value="UGX">UGX</option>
                      <option value="KES">KES</option>
                      <option value="TZS">TZS</option>
                      <option value="EUR">EUR</option>
                    </Select>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:col-span-2">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Planned budget
                  </div>
                  <div className="mt-2">
                    <Input
                      type="number"
                      value={builder.estValue}
                      onChange={(v) =>
                        setBuilder((p) => ({ ...p, estValue: clamp(v, 0, 100000000) }))
                      }
                      placeholder="1000"
                    />
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Estimate until contracts are signed.
                    </div>
                  </div>
                </div>
              </div>

              {/* Timing & targeting (screenshot #4) */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">Timing and targeting</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Decide when this Dealz runs, which markets see it, and which languages are
                      used for creatives and live sessions.
                    </div>
                  </div>
                  <Pill tone="brand">Max 45 days</Pill>
                </div>

                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left column: schedule + timezone */}
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="opacity-70">🕒</span> <span>Schedule window</span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            Start
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={builder.startDate}
                              onChange={(e) =>
                                setBuilder((p) => ({ ...p, startDate: e.target.value }))
                              }
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                            />
                            <input
                              type="time"
                              value={builder.startTime}
                              onChange={(e) =>
                                setBuilder((p) => ({ ...p, startTime: e.target.value }))
                              }
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            End
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={builderEndDate}
                              disabled
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none text-slate-700 dark:text-slate-300"
                            />
                            <input
                              type="time"
                              value={builder.endTime}
                              onChange={(e) =>
                                setBuilder((p) => ({ ...p, endTime: e.target.value }))
                              }
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Duration (days) *
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={45}
                            value={builder.durationDays}
                            onChange={(e) => {
                              const v = clamp(e.target.value, 1, 45);
                              if (Number(e.target.value) !== v)
                                push('Duration must be between 1 and 45 days.', 'warn');
                              setBuilder((p) => ({ ...p, durationDays: v }));
                            }}
                            className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                          />
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            End date is auto-calculated (inclusive).
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Time zone
                          </div>
                          <Select
                            value={builder.timezone}
                            onChange={(v) => setBuilder((p) => ({ ...p, timezone: v }))}
                            className="mt-2"
                          >
                            {TIMEZONES.map((tz) => (
                              <option key={tz} value={tz}>
                                {tz}
                              </option>
                            ))}
                          </Select>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Live start times, countdown timers, and calendar invites will respect
                            this timezone.
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Flash sale windows (optional)
                        </div>
                        <Input
                          value={builder.flashWindows}
                          onChange={(v) => setBuilder((p) => ({ ...p, flashWindows: v }))}
                          placeholder="e.g. Daily 7–9pm local time, weekend only"
                          className="mt-2"
                        />
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Use this when you want extra urgency on top of the main window.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column: regions, shipping, languages */}
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="opacity-70">📍</span> <span>Regions / countries</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {MARKET_REGIONS.map((r) => {
                          const active = (builder.marketRegions || []).includes(r);
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() =>
                                setBuilder((p) => ({
                                  ...p,
                                  marketRegions: toggleInList(p.marketRegions || [], r),
                                }))
                              }
                              className={cx(
                                'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                                active
                                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800'
                              )}
                              title="Used for feed distribution, recommendation rules, and shipping eligibility."
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Used for feed distribution, recommendation rules, and shipping eligibility.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                      <div className="text-sm font-bold">Shipping constraints</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {SHIPPING_CONSTRAINTS.map((s) => {
                          const active = (builder.shippingConstraints || []).includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() =>
                                setBuilder((p) => ({
                                  ...p,
                                  shippingConstraints: toggleInList(p.shippingConstraints || [], s),
                                }))
                              }
                              className={cx(
                                'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                                active
                                  ? 'bg-[#f77f00] text-white border-[#f77f00]'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800'
                              )}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                      <div className="text-sm font-bold">Languages for content</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {CONTENT_LANGUAGES.map((l) => {
                          const active = (builder.contentLanguages || []).includes(l);
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() =>
                                setBuilder((p) => ({
                                  ...p,
                                  contentLanguages: toggleInList(p.contentLanguages || [], l),
                                }))
                              }
                              className={cx(
                                'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                                active
                                  ? 'bg-[#f77f00] text-white border-[#f77f00]'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800'
                              )}
                              title="Feeds into captions, translated promo copy, and live session overlays."
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Feeds into auto-generated captions, translated promo copy, and live session
                        overlays.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promo (kept from previous version) */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">Promo type & arrangement</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Define the promo mechanism (discount, coupon, bundle, etc.).
                    </div>
                  </div>
                  <Pill tone="brand">{promoLabels.promoTypeLabel}</Pill>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {PROMO_TYPES.map((pt) => (
                    <button
                      key={pt.k}
                      type="button"
                      onClick={() => {
                        const arrangements = PROMO_ARRANGEMENTS[pt.k] || [];
                        const nextArrangement = arrangements[0]?.k || '';
                        setBuilder((p) => ({
                          ...p,
                          promoType: pt.k,
                          promoArrangement: nextArrangement,
                          // sensible defaults
                          defaultDiscountMode:
                            pt.k === 'Discount' || pt.k === 'Coupon' ? 'percent' : 'none',
                          defaultDiscountValue: pt.k === 'Discount' || pt.k === 'Coupon' ? 10 : 0,
                        }));
                      }}
                      className={cx(
                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                        builder.promoType === pt.k
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800'
                      )}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Preferred arrangement
                    </div>
                    <Select
                      value={builder.promoArrangement}
                      onChange={(v) => setBuilder((p) => ({ ...p, promoArrangement: v }))}
                      className="mt-2"
                    >
                      {(PROMO_ARRANGEMENTS[builder.promoType] || []).map((a) => (
                        <option key={a.k} value={a.k}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Offer scope
                    </div>
                    <Select
                      value={builder.offerScope}
                      onChange={(v) => setBuilder((p) => ({ ...p, offerScope: v }))}
                      className="mt-2"
                    >
                      {OFFER_SCOPES.map((s) => (
                        <option key={s.k} value={s.k}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Promo extra fields */}
                {builder.promoType === 'Coupon' ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Promo / coupon code
                      </div>
                      <Input
                        value={builder.promoCode}
                        onChange={(v) => setBuilder((p) => ({ ...p, promoCode: v.toUpperCase() }))}
                        placeholder="Example: TECHFRIDAY"
                        className="mt-2"
                      />
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Creators can mention this code in content.
                      </div>
                    </div>
                  </div>
                ) : null}

                {builder.promoType === 'FreeShipping' ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Shipping threshold
                      </div>
                      <Input
                        type="number"
                        value={builder.shippingThreshold}
                        onChange={(v) =>
                          setBuilder((p) => ({ ...p, shippingThreshold: clamp(v, 0, 100000000) }))
                        }
                        placeholder="0"
                        className="mt-2"
                      />
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Example: free shipping over $50.
                      </div>
                    </div>
                  </div>
                ) : null}

                {builder.promoType === 'Gift' ? (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Gift / bonus note
                    </div>
                    <textarea
                      value={builder.giftNote}
                      onChange={(e) => setBuilder((p) => ({ ...p, giftNote: e.target.value }))}
                      className="mt-2 w-full min-h-[84px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none"
                      placeholder="Example: Free travel pouch with every bundle purchase"
                    />
                  </div>
                ) : null}

                <div className="mt-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold">Default discount (for catalog)</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Applies when selecting items, and can be overridden per item.
                      </div>
                    </div>
                    <Btn
                      onClick={applyDefaultDiscountToSelected}
                      title="Apply discount to items already selected"
                    >
                      ✨ Apply to selected
                    </Btn>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Default type
                      </div>
                      <Select
                        value={builder.defaultDiscountMode}
                        onChange={(v) => setBuilder((p) => ({ ...p, defaultDiscountMode: v }))}
                        className="mt-2"
                      >
                        {DISCOUNT_TYPE_OPTIONS.filter((d) => d.k !== 'final').map((m) => (
                          <option key={m.k} value={m.k}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Default value
                      </div>
                      <Input
                        type="number"
                        value={builder.defaultDiscountValue}
                        onChange={(v) =>
                          setBuilder((p) => ({
                            ...p,
                            defaultDiscountValue: clamp(v, 0, 100000000),
                          }))
                        }
                        placeholder="10"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Products and services (screenshot #2) */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold">Products and services</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Pull items from your EVzone catalog and decide if this Dealz is a single hero
                      item or a bundle.
                    </div>
                  </div>
                  <Pill tone="neutral">{(builder.items || []).length} selected</Pill>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    {BUNDLE_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setBuilder((p) => ({ ...p, bundleMode: m }))}
                        className={cx(
                          'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                          builder.bundleMode === m
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1" />

                  {/* Catalog buttons are contextual (Products/Services/Both) */}
                  <div className="flex flex-wrap gap-2">
                    {allowProducts(builder.offerScope) ? (
                      <button
                        type="button"
                        onClick={() => openCatalog('Product')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold text-white bg-[#f77f00] hover:opacity-95 transition"
                        title="Add products from catalog"
                      >
                        🔎 Add Products
                      </button>
                    ) : null}
                    {allowServices(builder.offerScope) ? (
                      <button
                        type="button"
                        onClick={() => openCatalog('Service')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold text-white bg-[#f77f00] hover:opacity-95 transition"
                        title="Add services from catalog"
                      >
                        🧰 Add Services
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-800/40 border-y border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Item
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Base price
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Category
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Regulated tag
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Planned qty
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                      {(builder.items || []).map((it) => (
                        <tr key={it.id} className="bg-white dark:bg-slate-900">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={it.avatar}
                                alt="avatar"
                                className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-700"
                              />
                              <div className="min-w-0 flex-1">
                                <input
                                  value={it.title}
                                  onChange={(e) => updateLineItem(it.id, { title: e.target.value })}
                                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                                />
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {it.kind} · {it.subtitle || it.region || '—'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              value={it.sku || '—'}
                              readOnly
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-slate-300"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={normalizedNum(it.price, 0)}
                              onChange={(e) => {
                                const nextPrice = clamp(e.target.value, 0, 100000000);
                                setBuilder((p) => ({
                                  ...p,
                                  items: (p.items || []).map((x) => {
                                    if (x.id !== it.id) return x;
                                    const mode = x.discount?.mode || 'none';
                                    const val = normalizedNum(x.discount?.value, 0);
                                    const discountedPrice = calcDiscountedPrice(
                                      nextPrice,
                                      mode,
                                      val
                                    );
                                    return {
                                      ...x,
                                      price: nextPrice,
                                      discount: { mode, value: val },
                                      discountedPrice,
                                      discountLabel: formatDiscount(mode, val, p.currency),
                                    };
                                  }),
                                }));
                              }}
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {it.category || '—'}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <Select
                              value={it.regulatedTag || 'None'}
                              onChange={(v) => updateLineItem(it.id, { regulatedTag: v })}
                            >
                              {REGULATED_TAGS.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </Select>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={normalizedNum(it.plannedQty, 1)}
                              onChange={(e) =>
                                updateLineItem(it.id, {
                                  plannedQty: clamp(e.target.value, 1, 100000000),
                                })
                              }
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                            />
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeLineItem(it.id)}
                              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}

                      {(builder.items || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">
                            No items selected yet. Use “Add Products” / “Add Services” to pull from
                            catalog.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Giveaways (live campaign types only) */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">Campaign giveaways</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Configure prizes the seller/provider will give out during live sessions.
                      Applies to <span className="font-extrabold">Live Sessionz</span> and{' '}
                      <span className="font-extrabold">Live + Shoppables.</span>, not Shoppable
                      Adz.
                    </div>
                  </div>
                  {!giveawaysSupported ? (
                    <Pill tone="neutral">Not available for this campaign type</Pill>
                  ) : builder.hasGiveaways ? (
                    <Pill tone="brand">
                      {campaignGiveaways.length} item(s) · Qty {totalGiveawayQty}
                    </Pill>
                  ) : (
                    <Pill tone="neutral">Optional</Pill>
                  )}
                </div>

                {!giveawaysSupported ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400">
                    Switch the campaign type to{' '}
                    <span className="font-extrabold">Live Sessionz</span> or{' '}
                    <span className="font-extrabold">Live + Shoppables.</span> to configure live
                    giveaway items.
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <RadioCard
                        active={!builder.hasGiveaways}
                        title="No giveaways in this campaign"
                        badge="No"
                        desc="Use this when the live campaign will not include any seller/provider giveaway items."
                        onClick={() => setBuilder((p) => ({ ...p, hasGiveaways: false }))}
                      />
                      <RadioCard
                        active={!!builder.hasGiveaways}
                        title="Yes — include giveaways"
                        badge="Yes"
                        desc="Add featured-item giveaways or custom giveaway products/services with their quantities."
                        onClick={() => setBuilder((p) => ({ ...p, hasGiveaways: true }))}
                      />
                    </div>

                    {builder.hasGiveaways ? (
                      <>
                        <div className="mt-3">
                          {campaignGiveaways.length ? (
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                              {campaignGiveaways.map((g, idx) => {
                                const meta = resolveCampaignGiveaway(g, builder.items || []);
                                return (
                                  <div
                                    key={g.id || idx}
                                    className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {meta.imageUrl ? (
                                        <img
                                          src={meta.imageUrl}
                                          alt={meta.title}
                                          className="h-11 w-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                                        />
                                      ) : (
                                        <div className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
                                          🎁
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="text-sm font-extrabold truncate">
                                          {meta.title}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                          <Pill tone="neutral">
                                            {meta.source === 'featured'
                                              ? 'From featured items'
                                              : 'Custom'}
                                          </Pill>
                                          <Pill tone="brand">Qty {meta.quantity}</Pill>
                                        </div>
                                      </div>
                                    </div>

                                    <Btn
                                      tone="ghost"
                                      onClick={() => removeCampaignGiveaway(g.id)}
                                      title="Remove giveaway"
                                    >
                                      ✕
                                    </Btn>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400">
                              No giveaway items added yet.
                            </div>
                          )}
                        </div>

                        <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-bold">Add giveaway item</div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setGiveawayAddMode('featured')}
                                className={cx(
                                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                                  giveawayAddMode === 'featured'
                                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800'
                                )}
                              >
                                From featured items
                              </button>
                              <button
                                type="button"
                                onClick={() => setGiveawayAddMode('custom')}
                                className={cx(
                                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                                  giveawayAddMode === 'custom'
                                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800'
                                )}
                              >
                                Custom
                              </button>
                            </div>
                          </div>

                          {giveawayAddMode === 'featured' ? (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px_auto] gap-3 items-end">
                              <div>
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                  Featured product / service
                                </div>
                                <Select
                                  value={featuredGiveawayItemId}
                                  onChange={(v) => setFeaturedGiveawayItemId(v)}
                                  className="mt-2"
                                >
                                  <option value="">Select a featured item</option>
                                  {(builder.items || []).map((it) => (
                                    <option key={it.id} value={it.id}>
                                      {it.title}
                                    </option>
                                  ))}
                                </Select>
                                {!(builder.items || []).length ? (
                                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Add Products or Services first so the supplier can select
                                    featured-item giveaways.
                                  </div>
                                ) : null}
                              </div>

                              <div>
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                  Quantity *
                                </div>
                                <Input
                                  type="number"
                                  value={featuredGiveawayQuantity}
                                  onChange={(v) =>
                                    setFeaturedGiveawayQuantity(String(v).replace(/[^0-9]/g, ''))
                                  }
                                  placeholder="1"
                                  className="mt-2"
                                />
                                {!featuredGiveawayQtyValue ? (
                                  <div className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                                    Enter a whole number of 1 or more.
                                  </div>
                                ) : null}
                              </div>

                              <Btn
                                tone="primary"
                                className="h-[42px]"
                                disabled={
                                  !(builder.items || []).length ||
                                  !featuredGiveawayItemId ||
                                  !featuredGiveawayQtyValue
                                }
                                onClick={addFeaturedGiveaway}
                              >
                                ➕ Add giveaway
                              </Btn>
                            </div>
                          ) : (
                            <div className="mt-3 grid grid-cols-1 gap-3">
                              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px] gap-3">
                                <div>
                                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    Custom giveaway product / service *
                                  </div>
                                  <Input
                                    value={customGiveawayDraft.title}
                                    onChange={(v) =>
                                      setCustomGiveawayDraft((p) => ({ ...p, title: v }))
                                    }
                                    placeholder="Example: VIP Skincare Gift Box"
                                    className="mt-2"
                                  />
                                </div>

                                <div>
                                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    Quantity *
                                  </div>
                                  <Input
                                    type="number"
                                    value={customGiveawayDraft.quantity}
                                    onChange={(v) =>
                                      setCustomGiveawayDraft((p) => ({
                                        ...p,
                                        quantity: String(v).replace(/[^0-9]/g, ''),
                                      }))
                                    }
                                    placeholder="1"
                                    className="mt-2"
                                  />
                                  {!customGiveawayQtyValue ? (
                                    <div className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                                      Enter a whole number of 1 or more.
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                      Poster image (500 × 500px) *
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      Choose an approved image from Asset Library or use that page
                                      to submit content for approval.
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Btn
                                      tone="primary"
                                      onClick={() =>
                                        openAssetLibraryPicker('campaignGiveawayPoster')
                                      }
                                    >
                                      🖼️ Choose poster
                                    </Btn>
                                    <Btn
                                      onClick={() =>
                                        setCustomGiveawayDraft((p) => ({
                                          ...p,
                                          imageUrl: '',
                                          posterAssetId: '',
                                          assetName: '',
                                        }))
                                      }
                                      disabled={!customGiveawayDraft.imageUrl}
                                    >
                                      Clear
                                    </Btn>
                                  </div>
                                </div>

                                <div className="mt-3 w-full max-w-[220px]">
                                  <div className="aspect-square rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                                    {customGiveawayDraft.imageUrl ? (
                                      <img
                                        src={customGiveawayDraft.imageUrl}
                                        alt={customGiveawayDraft.title || 'Custom giveaway poster'}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="px-4 text-center text-xs text-slate-500 dark:text-slate-400">
                                        No poster selected
                                      </div>
                                    )}
                                  </div>
                                  {customGiveawayDraft.assetName ? (
                                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                                      Selected: {customGiveawayDraft.assetName}
                                    </div>
                                  ) : null}
                                  {!customGiveawayDraft.imageUrl ? (
                                    <div className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                                      A poster image is required for custom giveaways.
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <Btn
                                  tone="primary"
                                  disabled={
                                    !String(customGiveawayDraft.title || '').trim() ||
                                    !customGiveawayQtyValue ||
                                    !customGiveawayDraft.imageUrl
                                  }
                                  onClick={addCustomGiveaway}
                                >
                                  ➕ Add custom giveaway
                                </Btn>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400">
                        Select “Yes — include giveaways” if this live campaign will give out
                        seller/provider prizes during the session.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Pricing and discounts (screenshot #3) */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">Pricing and discounts</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Configure how each line behaves. Promo price is auto-calculated for % and
                      amount discounts and can be set directly for promo price type.
                    </div>
                  </div>
                  <Pill tone={builder.commerceMode === 'Wholesale' ? 'brand' : 'neutral'}>
                    {builder.commerceMode}
                  </Pill>
                </div>

                {(builder.items || []).length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
                    Add at least one line item to configure pricing.
                  </div>
                ) : builder.commerceMode !== 'Wholesale' ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-800/40 border-y border-slate-100 dark:border-slate-800">
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Item
                          </th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Base price
                          </th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Discount type
                          </th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Discount value
                          </th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Promo price
                          </th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Limits
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                        {(builder.items || []).map((it) => {
                          const mode = it.discount?.mode || 'none';
                          const value = normalizedNum(it.discount?.value, 0);
                          const promo = calcDiscountedPrice(it.price, mode, value);
                          const limits = it.limits || { total: '', perBuyer: '' };
                          const isPromoPrice = mode === 'final';

                          return (
                            <tr key={it.id} className="bg-white dark:bg-slate-900">
                              <td className="px-4 py-3">
                                <div className="text-sm font-extrabold">{it.title}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {it.kind} · SKU {it.sku || '—'}
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="text-sm font-semibold">
                                  {money(builder.currency, normalizedNum(it.price, 0))}
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <Select
                                  value={mode}
                                  onChange={(v) => {
                                    const nextMode = v;
                                    const nextVal = nextMode === 'none' ? 0 : value;
                                    updateLineItemDiscount(it.id, nextMode, nextVal);
                                  }}
                                >
                                  {DISCOUNT_TYPE_OPTIONS.map((d) => (
                                    <option key={d.k} value={d.k}>
                                      {d.label}
                                    </option>
                                  ))}
                                </Select>
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={mode === 'none' ? '' : value}
                                  placeholder={
                                    mode === 'amount'
                                      ? 'Amount'
                                      : mode === 'percent'
                                        ? 'Percent'
                                        : mode === 'final'
                                          ? 'Promo price'
                                          : ''
                                  }
                                  onChange={(e) =>
                                    updateLineItemDiscount(
                                      it.id,
                                      mode,
                                      clamp(e.target.value, 0, 100000000)
                                    )
                                  }
                                  disabled={mode === 'none' || mode === 'final'}
                                  className={cx(
                                    'w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none',
                                    mode === 'none' || mode === 'final'
                                      ? 'border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                  )}
                                />
                                {mode === 'percent' ? (
                                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    0–100
                                  </div>
                                ) : null}
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={isPromoPrice ? value : Math.round(promo * 100) / 100}
                                  onChange={(e) => {
                                    if (!isPromoPrice) return;
                                    updateLineItemDiscount(
                                      it.id,
                                      'final',
                                      clamp(e.target.value, 0, 100000000)
                                    );
                                  }}
                                  disabled={!isPromoPrice}
                                  className={cx(
                                    'w-full rounded-xl border px-3 py-2 text-sm font-extrabold outline-none',
                                    isPromoPrice
                                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                      : 'border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                                  )}
                                />
                              </td>

                              <td className="px-4 py-3">
                                <div className="grid grid-cols-1 gap-2">
                                  <input
                                    type="number"
                                    value={limits.total}
                                    onChange={(e) =>
                                      updateLineItemLimits(it.id, {
                                        total: clamp(e.target.value, 0, 100000000),
                                      })
                                    }
                                    placeholder="Total"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none"
                                  />
                                  <input
                                    type="number"
                                    value={limits.perBuyer}
                                    onChange={(e) =>
                                      updateLineItemLimits(it.id, {
                                        perBuyer: clamp(e.target.value, 0, 100000000),
                                      })
                                    }
                                    placeholder="Per buyer"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-extrabold">%</span> You can mix discount types across
                      lines. For volume and BOGO offers, the buyer side will show a clean
                      mobile-first breakdown so shoppers instantly understand the value.
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {(builder.items || []).map((it) => {
                      const tiers = Array.isArray(it.wholesaleTiers) ? it.wholesaleTiers : [];
                      const limits = it.limits || { total: '', perBuyer: '' };

                      return (
                        <div
                          key={it.id}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold truncate">{it.title}</div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Base price:{' '}
                                <span className="font-bold">
                                  {money(builder.currency, normalizedNum(it.price, 0))}
                                </span>{' '}
                                · Max 4 tiers
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Btn
                                onClick={() => addWholesaleTier(it.id)}
                                disabled={(tiers || []).length >= 4}
                                title="Add tier (max 4)"
                              >
                                ➕ Tier
                              </Btn>
                            </div>
                          </div>

                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full min-w-[980px] text-left border-collapse">
                              <thead>
                                <tr className="border-y border-slate-200 dark:border-slate-800">
                                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Tier
                                  </th>
                                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Min qty
                                  </th>
                                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Max qty
                                  </th>
                                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Discount type
                                  </th>
                                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Value
                                  </th>
                                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Unit price
                                  </th>
                                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                                    Actions
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                                {(tiers.length
                                  ? tiers
                                  : ensureWholesaleTiersForAll([it], builder)[0].wholesaleTiers
                                ).map((t, idx) => {
                                  const mode = t.discountMode || 'percent';
                                  const val = normalizedNum(t.discountValue, 0);
                                  const unitPrice = calcDiscountedPrice(it.price, mode, val);

                                  return (
                                    <tr key={t.id} className="bg-white dark:bg-slate-900/70 dark:bg-slate-950/40">
                                      <td className="px-3 py-2 text-sm font-extrabold">
                                        T{idx + 1}
                                      </td>

                                      <td className="px-3 py-2">
                                        <input
                                          type="number"
                                          value={normalizedNum(t.minQty, 1)}
                                          onChange={(e) =>
                                            updateWholesaleTier(it.id, t.id, {
                                              minQty: clamp(e.target.value, 1, 100000000),
                                            })
                                          }
                                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                                        />
                                      </td>

                                      <td className="px-3 py-2">
                                        <input
                                          type="number"
                                          value={numberOrEmpty(t.maxQty)}
                                          onChange={(e) =>
                                            updateWholesaleTier(it.id, t.id, {
                                              maxQty:
                                                e.target.value === ''
                                                  ? ''
                                                  : clamp(e.target.value, 1, 100000000),
                                            })
                                          }
                                          placeholder="∞"
                                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                                        />
                                      </td>

                                      <td className="px-3 py-2">
                                        <Select
                                          value={mode}
                                          onChange={(v) =>
                                            updateWholesaleTier(it.id, t.id, { discountMode: v })
                                          }
                                        >
                                          {DISCOUNT_TYPE_OPTIONS.filter((d) => d.k !== 'none').map(
                                            (d) => (
                                              <option key={d.k} value={d.k}>
                                                {d.label}
                                              </option>
                                            )
                                          )}
                                        </Select>
                                      </td>

                                      <td className="px-3 py-2">
                                        <input
                                          type="number"
                                          value={val}
                                          onChange={(e) =>
                                            updateWholesaleTier(it.id, t.id, {
                                              discountValue: clamp(e.target.value, 0, 100000000),
                                            })
                                          }
                                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                                        />
                                      </td>

                                      <td className="px-3 py-2">
                                        <div className="text-sm font-extrabold">
                                          {money(
                                            builder.currency,
                                            Math.round(unitPrice * 100) / 100
                                          )}
                                        </div>
                                      </td>

                                      <td className="px-3 py-2 text-right">
                                        <Btn
                                          onClick={() => removeWholesaleTier(it.id, t.id)}
                                          title="Remove tier"
                                        >
                                          🗑️
                                        </Btn>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Limits
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <input
                                  type="number"
                                  value={limits.total}
                                  onChange={(e) =>
                                    updateLineItemLimits(it.id, {
                                      total: clamp(e.target.value, 0, 100000000),
                                    })
                                  }
                                  placeholder="Total"
                                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none"
                                />
                                <input
                                  type="number"
                                  value={limits.perBuyer}
                                  onChange={(e) =>
                                    updateLineItemLimits(it.id, {
                                      perBuyer: clamp(e.target.value, 0, 100000000),
                                    })
                                  }
                                  placeholder="Per buyer"
                                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none"
                                />
                              </div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Optional caps to prevent oversubscription.
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 dark:bg-slate-950/40 p-3 text-xs text-slate-600 dark:text-slate-300">
                              Wholesale tiers are displayed as a buyer-friendly breakdown. You can
                              mix discount types per tier (e.g., % off for Tier 1, promo price for
                              Tier 2).
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Regulated category check (screenshot #5) */}
              {hasRegulated ? (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                    <div className="flex items-start gap-2">
                      <div className="text-lg">🛡️</div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold">Regulated category check</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          MyLiveDealz automatically routes Med / Edu / Faith items to a dedicated
                          Regulated Desk queue for extra review before going live.
                        </div>
                        <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          This Dealz includes regulated items ({regulatedTags.join(', ')}). Please
                          confirm documentation and disclaimers below.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold">Required documents</div>
                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              I have uploaded all product labels, certifications, and supporting
                              documents.
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={!!builder.regulatedDocsConfirmed}
                            onChange={(e) =>
                              setBuilder((p) => ({
                                ...p,
                                regulatedDocsConfirmed: e.target.checked,
                              }))
                            }
                            className="mt-1 h-4 w-4"
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold">Disclaimers</div>
                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              I accept that this Dealz will not go live until the Regulated Desk has
                              approved all relevant items.
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={!!builder.regulatedDisclaimersAccepted}
                            onChange={(e) =>
                              setBuilder((p) => ({
                                ...p,
                                regulatedDisclaimersAccepted: e.target.checked,
                              }))
                            }
                            className="mt-1 h-4 w-4"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Routing preview
                      </div>
                      <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1">
                        <li>Standard items → Promo Studio queue for creative polish & approval.</li>
                        <li>Med / Edu / Faith items → Regulated Desk queue.</li>
                        <li>
                          The Dealz will only go fully live once all regulated items have been
                          cleared.
                        </li>
                      </ul>

                      <div className="mt-3">
                        <textarea
                          value={builder.regulatedDeskNotes}
                          onChange={(e) =>
                            setBuilder((p) => ({ ...p, regulatedDeskNotes: e.target.value }))
                          }
                          className="w-full min-h-[92px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none"
                          placeholder="Internal notes to Regulated Desk (optional) — e.g. source of products, prior approvals, internal ticket references."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Internal owner */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Internal owner
                </div>
                <div className="mt-2">
                  <Select
                    value={builder.internalOwner}
                    onChange={(v) => setBuilder((p) => ({ ...p, internalOwner: v }))}
                  >
                    <option value="Supplier Owner">Supplier Owner</option>
                    <option value="Supplier Manager">Supplier Manager</option>
                    <option value="Collabs Manager">Collabs Manager</option>
                    <option value="Adz Manager">Adz Manager</option>
                    <option value="Live Producer">Live Producer</option>
                  </Select>
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  (RBAC note) Sensitive actions should be limited to authorized roles.
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Notes (internal)
                </div>
                <textarea
                  value={builder.notes}
                  onChange={(e) => setBuilder((p) => ({ ...p, notes: e.target.value }))}
                  className="mt-2 w-full min-h-[96px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none"
                  placeholder="Context for your team or Admin reviewers (optional)."
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* STEP 2 */}
        {builderStep === 2 ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 p-3">
              <div className="text-sm font-bold">Creator plan (required)</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                This selection drives the workflow.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {USAGE_DECISIONS.map((v) => (
                <RadioCard
                  key={v}
                  active={builder.creatorUsageDecision === v}
                  title={v}
                  badge={
                    v === 'I will use a Creator'
                      ? 'Collabs'
                      : v === 'I will NOT use a Creator'
                        ? 'Supplier acts as creator'
                        : 'Decide later'
                  }
                  desc={
                    v === 'I will use a Creator'
                      ? 'Open Collabs: creators pitch. Invite-only: you invite creators and they accept the invite to collaborate, then negotiation and contract follow.'
                      : v === 'I will NOT use a Creator'
                        ? 'Skip collaboration logic. Start at Content Submission stage after Admin approves the campaign.'
                        : 'Create the campaign now and decide collaboration mode later (before content submission).'
                  }
                  onClick={() => {
                    setBuilder((p) => ({
                      ...p,
                      creatorUsageDecision: v,
                      collabMode: v === 'I will use a Creator' ? p.collabMode : 'Open for Collabs',
                      allowMultiCreators:
                        v === 'I will use a Creator' ? p.allowMultiCreators : false,
                    }));
                  }}
                />
              ))}
            </div>

            {builder.creatorUsageDecision === 'I will NOT use a Creator' ? (
              <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                <div className="text-sm font-bold text-amber-900 dark:text-amber-300">
                  Supplier acts as Creator
                </div>
                <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                  Collaboration logic is skipped. After Admin approves the campaign, you proceed to
                  content submission.
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* STEP 3 */}
        {builderStep === 3 ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 p-3">
              <div className="text-sm font-bold">Collaboration & content approval</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Editable per campaign until content submission.
              </div>
            </div>

            {builder.creatorUsageDecision === 'I will use a Creator' ? (
              <>
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold">Collaboration mode</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Default is Open for Collabs. Invite-only is private.
                      </div>
                    </div>
                    <Pill tone="brand">Default: Open</Pill>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {COLLAB_MODES.map((m) => (
                      <RadioCard
                        key={m}
                        active={builder.collabMode === m}
                        title={m}
                        badge={m === 'Open for Collabs' ? 'Public' : 'Private'}
                        desc={
                          m === 'Open for Collabs'
                            ? 'After Admin approval: campaign appears on Creator Opportunities Board. Creators pitch. You review, negotiate and contract.'
                            : 'After Admin approval: you invite creators. Creators ACCEPT invites to collaborate, then negotiation and contracts follow.'
                        }
                        onClick={() => setBuilder((p) => ({ ...p, collabMode: m }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-sm font-bold">Content approval</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Manual means you approve creator assets before Admin review.
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {APPROVAL_MODES.map((m) => (
                      <RadioCard
                        key={m}
                        active={builder.approvalMode === m}
                        title={m === 'Manual' ? 'Manual Content Approval' : 'Auto Approval'}
                        badge={m}
                        desc={
                          m === 'Manual'
                            ? 'Creator → Supplier review (approve/request changes/reject) → Admin review → scheduling/execution.'
                            : 'Creator → Admin review directly. Supplier can still monitor and comment in the record.'
                        }
                        onClick={() => setBuilder((p) => ({ ...p, approvalMode: m }))}
                      />
                    ))}
                  </div>

                  <div className="mt-3">
                    <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!builder.allowMultiCreators}
                        onChange={(e) =>
                          setBuilder((p) => ({ ...p, allowMultiCreators: e.target.checked }))
                        }
                      />
                      <span>
                        Allow multiple creators per campaign (split deliverables and partial
                        settlement supported).
                      </span>
                    </label>
                  </div>
                </div>
              </>
            ) : builder.creatorUsageDecision === 'I am NOT SURE yet' ? (
              <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                <div className="text-sm font-bold text-amber-900 dark:text-amber-300">
                  Collab mode can be selected later
                </div>
                <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                  You can submit for Admin approval now. Before content submission, select Open for
                  Collabs or Invite-only.
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-sm font-bold">Supplier acts as Creator</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Collaboration settings are skipped. You proceed to content submission after Admin
                  approval.
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  {APPROVAL_MODES.map((m) => (
                    <RadioCard
                      key={m}
                      active={builder.approvalMode === m}
                      title={m === 'Manual' ? 'Internal Review' : 'Direct to Admin'}
                      badge={m}
                      desc={
                        m === 'Manual'
                          ? 'Internal checks before sending to Admin.'
                          : 'Submit supplier content directly to Admin review.'
                      }
                      onClick={() => setBuilder((p) => ({ ...p, approvalMode: m }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* STEP 4 */}
        {builderStep === 4 ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 p-3">
              <div className="text-sm font-bold">Review & submit</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Confirm duration, promo, and items. Submitting triggers Admin approval.
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold truncate">
                    {builder.name || '(Campaign name)'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {builder.type} · {builder.region} · {builder.currency}
                  </div>
                </div>
                <Pill tone="brand">
                  {money(builder.currency, clamp(builder.estValue, 0, 100000000))}
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Duration
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {builder.startDate || '(start date missing)'} → {builderEndDate || '(end date)'}{' '}
                    · {clamp(builder.durationDays, 1, 45)} day(s)
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Promo</div>
                  <div className="mt-1 text-sm font-semibold">
                    {promoLabels.promoTypeLabel} ·{' '}
                    {
                      (PROMO_ARRANGEMENTS[builder.promoType] || []).find(
                        (a) => a.k === builder.promoArrangement
                      )?.label
                    }
                  </div>
                  {builder.promoType === 'Coupon' && builder.promoCode ? (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      Code: <span className="font-extrabold">{builder.promoCode}</span>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Products / Services
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {(builder.items || []).length === 0
                      ? '(no items selected)'
                      : `${builder.items.length} item(s) selected`}
                  </div>
                  {(builder.items || []).length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(builder.items || []).slice(0, 6).map((it) => (
                        <Pill key={it.id} tone="neutral">
                          {it.title}
                        </Pill>
                      ))}
                      {(builder.items || []).length > 6 ? (
                        <Pill tone="neutral">+{(builder.items || []).length - 6} more</Pill>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Campaign giveaways
                  </div>
                  {!campaignTypeSupportsGiveaways(builder.type) ? (
                    <div className="mt-1 text-sm font-semibold">
                      Not applicable for this campaign type
                    </div>
                  ) : !builder.hasGiveaways ? (
                    <div className="mt-1 text-sm font-semibold">No giveaways planned</div>
                  ) : (
                    <>
                      <div className="mt-1 text-sm font-semibold">
                        {campaignGiveaways.length} giveaway item(s) · Total qty {totalGiveawayQty}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {campaignGiveaways.map((g) => {
                          const meta = resolveCampaignGiveaway(g, builder.items || []);
                          return (
                            <Pill key={g.id} tone={meta.source === 'custom' ? 'warn' : 'neutral'}>
                              {meta.title} · Qty {meta.quantity}
                            </Pill>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Creator plan
                  </div>
                  <div className="mt-1 text-sm font-semibold">{builder.creatorUsageDecision}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                  <div className="text-sm font-bold text-amber-900 dark:text-amber-300">
                    Admin approval
                  </div>
                  <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                    Submitting sends this campaign to Admin for review. Once approved, the campaign
                    becomes active and can enter Collabs/Execution based on your selected workflow.
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Validation on submit: Start date, duration (1–45), promo type/arrangement, and at
                  least one item must be present.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Campaign Details Drawer */}
      <Drawer
        open={detailsOpen}
        title={activeCampaign ? `${activeCampaign.name}` : 'Campaign details'}
        subtitle={
          activeCampaign
            ? `${activeCampaign.id} · ${activeCampaign.type} · ${activeCampaign.region}`
            : ''
        }
        onClose={() => setDetailsOpen(false)}
        footer={
          activeCampaign ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pill tone="neutral">
                  Stage: <span className="font-extrabold">{activeCampaign.stage}</span>
                </Pill>
                <Pill tone={approvalStatusPill(activeCampaign.approvalStatus).tone}>
                  {approvalStatusPill(activeCampaign.approvalStatus).label}
                </Pill>
              </div>
              <div className="flex items-center gap-2">
                {activeCampaign.adminRejected ? (
                  <Btn tone="primary" onClick={() => resubmitAfterRejection(activeCampaign)}>
                    🔁 Resubmit
                  </Btn>
                ) : null}
                <Btn
                  tone="primary"
                  onClick={() => {
                    push('Opening campaign workspace (preview).', 'info');
                    go(`/supplier/overview/my-campaigns/${activeCampaign.id}`);
                  }}
                >
                  Open
                </Btn>
              </div>
            </div>
          ) : null
        }
      >
        {!activeCampaign ? null : (
          <div className="space-y-3">
            {/* Approval panel */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold">Admin approval</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Campaign must be approved before it becomes active in the creator ecosystem.
                  </div>
                </div>
                <Pill tone={approvalStatusPill(activeCampaign.approvalStatus).tone}>
                  {approvalStatusPill(activeCampaign.approvalStatus).label}
                </Pill>
              </div>

              {activeCampaign.approvalStatus === 'Pending' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn
                    tone="primary"
                    onClick={() => simulateAdminDecision(activeCampaign, 'approve')}
                  >
                    ✅ Simulate Approve
                  </Btn>
                  <Btn
                    tone="danger"
                    onClick={() => simulateAdminDecision(activeCampaign, 'reject')}
                  >
                    ❌ Simulate Reject
                  </Btn>
                </div>
              ) : activeCampaign.approvalStatus === 'Approved' ? (
                <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                  Approved. Next pipeline:{' '}
                  <span className="font-extrabold">{activeCampaign.stage}</span> →{' '}
                  {activeCampaign.nextAction}
                </div>
              ) : activeCampaign.approvalStatus === 'Rejected' ? (
                <div className="mt-3 text-xs text-rose-700 dark:text-rose-300">
                  Rejected. Fix issues and resubmit.
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                  Draft not submitted.
                </div>
              )}
            </div>

            {/* Campaign window + promo summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Window</div>
                <div className="mt-1 text-sm font-extrabold">
                  {activeCampaign.startDate || '—'} → {activeCampaign.endDate || '—'}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {activeCampaign.durationDays || '—'} days
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Promo</div>
                <div className="mt-1 text-sm font-extrabold">
                  {PROMO_TYPES.find((p) => p.k === activeCampaign.promoType)?.label ||
                    activeCampaign.promoType}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {
                    (PROMO_ARRANGEMENTS[activeCampaign.promoType] || []).find(
                      (a) => a.k === activeCampaign.promoArrangement
                    )?.label
                  }
                  {activeCampaign.promoType === 'Coupon' && activeCampaign.promoCode
                    ? ` · ${activeCampaign.promoCode}`
                    : ''}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Budget</div>
                <div className="mt-1 text-sm font-extrabold">
                  {money(activeCampaign.currency, activeCampaign.estValue)}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold">Products / Services</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Items attached to this campaign (qty + discount captured).
                  </div>
                </div>
                <Btn
                  onClick={() => {
                    push('Opening Catalog… (preview)', 'info');
                    go('/supplier/overview/dealz-marketplace?selectForCampaign=1');
                  }}
                >
                  🗂️ Open catalog
                </Btn>
              </div>

              <div className="mt-3">
                {(activeCampaign.items || []).length === 0 ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    No items attached.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {(activeCampaign.items || []).map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={it.avatar}
                            alt="avatar"
                            className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-700"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold truncate">{it.title}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Qty: {it.plannedQty || 1} · {it.discountLabel || 'No discount'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 dark:text-slate-400">Current</div>
                          <div className="text-sm font-extrabold">
                            {money(activeCampaign.currency, it.price)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Discounted
                          </div>
                          <div className="text-sm font-extrabold">
                            {money(activeCampaign.currency, it.discountedPrice ?? it.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Campaign giveaways */}
            {campaignTypeSupportsGiveaways(activeCampaign.type) ? (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold">Giveaways</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Giveaway items planned by the seller/provider for live sessions in this
                      campaign.
                    </div>
                  </div>
                  {Array.isArray(activeCampaign.giveaways) && activeCampaign.giveaways.length ? (
                    <Pill tone="brand">
                      {activeCampaign.giveaways.length} item(s) · Qty{' '}
                      {activeCampaign.giveaways.reduce(
                        (sum, g) => sum + positiveIntOrFallback(g?.quantity, 1),
                        0
                      )}
                    </Pill>
                  ) : (
                    <Pill tone="neutral">No giveaways</Pill>
                  )}
                </div>

                <div className="mt-3">
                  {Array.isArray(activeCampaign.giveaways) && activeCampaign.giveaways.length ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      {activeCampaign.giveaways.map((g, idx) => {
                        const meta = resolveCampaignGiveaway(g, activeCampaign.items || []);
                        return (
                          <div
                            key={g.id || idx}
                            className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {meta.imageUrl ? (
                                <img
                                  src={meta.imageUrl}
                                  alt={meta.title}
                                  className="h-11 w-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
                                  🎁
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold truncate">{meta.title}</div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <Pill tone="neutral">
                                    {meta.source === 'featured' ? 'From featured items' : 'Custom'}
                                  </Pill>
                                  <Pill tone="brand">Qty {meta.quantity}</Pill>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      No giveaway items attached to this campaign.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Invite-only note (kept) */}
            {activeCampaign.creatorUsageDecision === 'I will use a Creator' &&
            activeCampaign.collabMode === 'Invite-only' ? (
              <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300">
                  Invite-only flow
                </div>
                <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                  Creators respond by{' '}
                  <span className="font-extrabold">accepting the invite to collaborate</span>. After
                  acceptance, negotiation and contracts follow.
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="text-sm font-extrabold">Next action</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {activeCampaign.lastActivity}
              </div>
              <div className="mt-2 text-sm font-semibold">{activeCampaign.nextAction}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ------------------------- row component ------------------------- */

function CampaignRow({ campaign, onOpen, onGo, onSwitchMode, onUpdate, push }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const health = HEALTH[campaign.health] || HEALTH.stalled;
  const modeLabel = inferLifecycleText(campaign);
  const approvalLabel = approvalText(campaign);
  const needsAttention =
    campaign.pendingSupplierApproval ||
    campaign.pendingAdminApproval ||
    campaign.adminRejected ||
    campaign.approvalStatus === 'Pending';
  const itemsCount = Array.isArray(campaign.items) ? campaign.items.length : 0;

  const approvalP = approvalStatusPill(campaign.approvalStatus);

  const promoTypeLabel =
    PROMO_TYPES.find((p) => p.k === campaign.promoType)?.label || campaign.promoType || '—';

  const modeMeta = useMemo(() => {
    if (campaign.creatorUsageDecision !== 'I will use a Creator') {
      return `Items: ${itemsCount}`;
    }
    if (campaign.collabMode === 'Invite-only') {
      const sent = Number(campaign.invitesSent) || 0;
      const acc = Number(campaign.invitesAccepted) || 0;
      return `Invites: ${acc}/${sent} accepted · Items: ${itemsCount}`;
    }
    return `Pitches: ${Number(campaign.pitchesCount) || 0} · Items: ${itemsCount}`;
  }, [
    campaign.creatorUsageDecision,
    campaign.collabMode,
    campaign.invitesSent,
    campaign.invitesAccepted,
    campaign.pitchesCount,
    itemsCount,
  ]);

  const actions = {
    proposals: '/supplier/collabs/proposals',
    contracts: '/supplier/collabs/contracts',
    assets: '/supplier/deliverables/assets',
    links: '/supplier/deliverables/links',
    adz: '/supplier/adz/manager',
    live: '/supplier/live/schedule',
  };

  return (
    <tr className="hover:bg-gray-50 dark:bg-slate-950/80 dark:hover:bg-slate-800/40 transition-colors group">
      <td className="px-6 py-4">
        <button type="button" onClick={onOpen} className="w-full text-left">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 shadow-sm transition-transform group-hover:scale-110">
                {String(campaign.name || 'C')[0]}
              </div>
              <div
                className={cx(
                  'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900',
                  health.dot
                )}
              />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                {campaign.name}
              </span>
              <span className="text-[10px] font-bold text-[#f77f00] uppercase tracking-tighter">
                {campaign.id} · {campaign.type}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {campaign.region}
                {campaign.startDate && campaign.endDate
                  ? ` · ${campaign.startDate} → ${campaign.endDate}`
                  : ''}
                {promoTypeLabel ? ` · ${promoTypeLabel}` : ''}
              </span>
            </div>
          </div>
        </button>
      </td>

      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              {modeLabel}
            </span>
            <span
              className={cx(
                'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border',
                campaign.approvalMode === 'Manual'
                  ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              )}
            >
              {approvalLabel}
            </span>
            <span
              className={cx(
                'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border',
                approvalP.tone === 'warn'
                  ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                  : approvalP.tone === 'good'
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : approvalP.tone === 'bad'
                      ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                      : 'bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              )}
            >
              {approvalP.label}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">{modeMeta}</div>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {money(campaign.currency, campaign.estValue)}
          </span>
          <span className="text-[10px] text-slate-400 italic">Planned</span>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex flex-col gap-2">
          <span
            className={cx(
              'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
              statusTone(campaign.stage)
            )}
          >
            {campaign.stage}
          </span>

          {needsAttention ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
              Action needed
            </span>
          ) : null}
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex flex-col max-w-[220px]">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {campaign.nextAction}
          </span>
          <span className="text-[10px] text-slate-400 truncate">{campaign.lastActivity}</span>
        </div>
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onGo(actions.proposals)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-400 hover:text-[#f77f00] hover:border-[#f77f00] transition-all"
            title="Proposals"
          >
            📋
          </button>
          <button
            onClick={() => onGo(actions.contracts)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all font-bold"
            title="Contracts"
          >
            ✍️
          </button>
          <button
            onClick={() => onGo(actions.assets)}
            className={cx(
              'p-2 rounded-xl border bg-white dark:bg-slate-900 dark:bg-slate-800 transition-all',
              campaign.pendingSupplierApproval || campaign.adminRejected
                ? 'border-amber-200 dark:border-amber-800 text-amber-700 hover:border-amber-500'
                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700'
            )}
            title="Asset Library"
          >
            🗂️
          </button>

          <button
            onClick={() => setShowMenu((s) => !s)}
            className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all relative"
            title="More"
            ref={menuRef}
          >
            •••
            {showMenu ? (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  🧭 Open details
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGo(actions.links);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  🔗 Links Hub
                </button>

                {canSwitchCollabMode(campaign) ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwitchMode();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    🔁 Switch collab mode
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    push('Marked as at-risk (preview).', 'warn');
                    onUpdate({
                      health: 'at-risk',
                      lastActivity: 'Health flagged · now',
                      lastActivityAt: Date.now(),
                    });
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  ⚠️ Flag at-risk
                </button>

                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    push('Campaign terminated (preview).', 'warn');
                    onUpdate({
                      stage: 'Terminated',
                      health: 'stalled',
                      nextAction: 'Campaign ended',
                      lastActivity: 'Terminated · now',
                      lastActivityAt: Date.now(),
                    });
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center gap-2 text-rose-700 dark:text-rose-300"
                >
                  ⛔ Terminate
                </button>
              </div>
            ) : null}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== 'undefined' && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierMyCampaignsPage v3 test failed: ${msg}`);
  };

  assert(computeEndDate('2026-02-23', 1) === '2026-02-23', '1-day duration end date equals start');
  assert(computeEndDate('2026-02-23', 2) === '2026-02-24', '2-day duration end date is start+1');
  assert(calcDiscountedPrice(100, 'percent', 10) === 90, 'percent discount works');
  assert(calcDiscountedPrice(100, 'amount', 5) === 95, 'amount discount works');
  assert(calcDiscountedPrice(100, 'final', 70) === 70, 'final price works');
  assert(formatDiscount('none', 0, 'USD') === 'No discount', 'format no discount');

  console.log('✅ SupplierMyCampaignsPage v3 self-tests passed');
}
