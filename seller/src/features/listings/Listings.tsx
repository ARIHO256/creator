// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  Flame,
  Globe,
  Image as ImageIcon,
  Info,
  Layers,
  Link2,
  MessageCircle,
  Package,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Scan,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { sellerBackendApi } from '../../lib/backendApi';
import { useThemeMode } from '../../theme/themeMode';
import {
  buildListingPayload,
  mapBackendListing,
  mapListingVersions,
  SELLER_LISTINGS_LABELS,
} from './runtime';

/**
 * Listings Hub (Merged) v2
 * Route: /listings
 * - Fix: Plus icon imported (prevents ReferenceError: Plus is not defined)
 * - Super premium upgrades inside Edit Drawer:
 *   1) AI title suggestions
 *   2) Variant matrix editor (Products)
 *   3) Multi-language preview + translation editor
 *   4) Approval workflow (reviewers, request review, approve/reject, timeline)
 *
 * Still:
 * - "+ New Listing" stays, but /listings/new is handled separately.
 * - Listing detail is per-item (drawer) not a tab.
 */

const TOKENS = {
  green: '#03CD8C',
  greenDeep: '#02B77E',
  orange: '#F77F00',
  black: '#0B0F14',
};

const PAGE_BG_DARK =
  'radial-gradient(1200px 500px at 18% -10%, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(45,212,191,0.06) 0%, rgba(45,212,191,0.0) 55%), linear-gradient(180deg, #0B1220 0%, #0A1020 45%, #0B1220 100%)';
const PAGE_BG_LIGHT =
  'radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)';
const PAGE_BG_LOADING_DARK =
  'radial-gradient(1200px 500px at 18% -10%, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.0) 55%), linear-gradient(180deg, #0B1220 0%, #0A1020 45%, #0B1220 100%)';
const PAGE_BG_LOADING_LIGHT =
  'radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), var(--page-gradient-base)';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function makeId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtMoney(n, currency = 'USD') {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function buildShareEntry(draft) {
  const sku = String(draft?.variantMatrix?.variants?.[0]?.sku || draft?.sku || draft?.id || 'listing');
  return {
    sku,
    title: draft?.title || '',
    channel: draft?.marketplace || '',
    category: draft?.category || '',
    price: Number(draft?.retailPrice || 0),
    currency: draft?.currency || 'USD',
    description: draft?.description || '',
    inventory: Number(draft?.stock || 0),
    status: draft?.status || 'Draft',
    updated: draft?.updatedAt || new Date().toLocaleString(),
  };
}

function openSharePreview(draft, navigate) {
  const entry = buildShareEntry(draft);
  if (typeof window !== 'undefined') {
    navigate(`/p/${encodeURIComponent(entry.sku)}`);
  }
}

function Badge({ children, tone = 'slate' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold',
        tone === 'green' && 'bg-emerald-50 text-emerald-700',
        tone === 'orange' && 'bg-orange-50 text-orange-700',
        tone === 'danger' && 'bg-rose-50 text-rose-700',
        tone === 'slate' && 'bg-slate-100 text-slate-700'
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className }) {
  return (
    <div
      className={cx(
        'rounded-[10px] border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur',
        className
      )}
    >
      {children}
    </div>
  );
}

function IconButton({ label, onClick, children, tone = 'light' }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition',
        tone === 'dark'
          ? 'border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18'
          : 'border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
      )}
    >
      {children}
    </button>
  );
}

function SegTab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
      )}
    >
      {label}
    </button>
  );
}

function ToastCenter({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
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
                {t.action ? (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                  >
                    {t.action.label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
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

function Drawer({ open, title, subtitle, onClose, children, tone = 'default' }) {
  const headerBg = tone === 'mldz' ? TOKENS.black : 'rgba(255,255,255,0.85)';
  const headerText = tone === 'mldz' ? 'text-white' : 'text-slate-900';

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[760px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div
                className="border-b border-slate-200/70 px-4 py-3"
                style={{ background: headerBg }}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black" style={{ color: headerText }}>
                      {title}
                    </div>
                    {subtitle ? (
                      <div
                        className="mt-1 text-xs font-semibold"
                        style={{ color: tone === 'mldz' ? 'rgba(255,255,255,0.7)' : '#64748b' }}
                      >
                        {subtitle}
                      </div>
                    ) : null}
                  </div>
                  <IconButton
                    label="Close"
                    onClick={onClose}
                    tone={tone === 'mldz' ? 'dark' : 'light'}
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Sparkline({ points }) {
  const w = 220;
  const h = 64;
  const pad = 6;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const ys = points.map((p) => {
    const t = max === min ? 0.5 : (p - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  });
  const d = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block text-slate-800">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`}
        fill="currentColor"
        opacity="0.08"
      />
    </svg>
  );
}

function calcQuality(d) {
  let score = 46;
  score += d.title?.trim()?.length >= 12 ? 12 : 4;
  score += d.description?.trim()?.length >= 120 ? 14 : d.description?.trim()?.length >= 60 ? 8 : 2;
  score += (d.images || 0) >= 6 ? 12 : (d.images || 0) >= 3 ? 7 : 2;
  score += (d.translations || 0) >= 4 ? 10 : (d.translations || 0) >= 2 ? 6 : 2;
  score += d.category ? 6 : 0;
  score += d.retailPrice ? 6 : 0;
  score += d.moq ? 4 : 0;
  score += d.compliance?.issues?.length ? 0 : 6;
  return clamp(Math.round(score), 35, 99);
}

function normalizeListings(rows) {
  return rows.map((x) => ({ ...x, quality: calcQuality(x) }));
}

function complianceTone(state) {
  if (state === 'ok') return 'green';
  if (state === 'warn') return 'orange';
  return 'danger';
}

function ScorePill({ score }) {
  const s = clamp(Number(score || 0), 0, 100);
  const tone = s >= 85 ? 'green' : s >= 65 ? 'orange' : 'danger';
  return <Badge tone={tone}>{s}</Badge>;
}

function EmptyState({ title, message, cta }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-black">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
          {cta ? (
            <button
              type="button"
              onClick={cta.onClick}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              {cta.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900 transition',
        checked ? 'border-emerald-200' : 'border-slate-200/70'
      )}
    >
      {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
    </button>
  );
}

function KpiCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function PromoteCard({ title, desc, icon: Icon, primary, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-3xl border p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800',
        primary ? 'border-orange-200 bg-orange-50/60' : 'border-slate-200/70 bg-white dark:bg-slate-900/70'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            'grid h-11 w-11 place-items-center rounded-2xl',
            primary ? 'bg-white dark:bg-slate-900 text-orange-700' : 'bg-slate-100 text-slate-700'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black" style={{ color: primary ? '#9a3412' : '#0f172a' }}>
            {title}
          </div>
          <div
            className="mt-1 text-xs font-semibold"
            style={{ color: primary ? 'rgba(154,52,18,0.7)' : '#64748b' }}
          >
            {desc}
          </div>
        </div>
        <ChevronRight className="h-4 w-4" style={{ color: primary ? '#9a3412' : '#cbd5e1' }} />
      </div>
    </button>
  );
}

function InlineListingRail({ listing, versions, onEdit, onScan, pushToast, labels }) {
  const navigate = useNavigate();
  const [range, setRange] = useState('7d');

  if (!listing) {
    return <EmptyState title="Select a listing" message="Click a row to see all listing details here." />;
  }

  const inventoryRows = (listing.inventory || []).map((w) => ({
    ...w,
    available: Math.max(0, Number(w.onHand || 0) - Number(w.reserved || 0)),
  }));
  const lowStock = listing.kind === 'Product' && inventoryRows.some((r) => r.available <= 5);
  const latestVersion = (versions || [])[0] || null;

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-sm font-black text-slate-900">{listing.title}</div>
              <Badge
                tone={
                  listing.status === 'Live'
                    ? 'green'
                    : listing.status === 'Paused'
                      ? 'orange'
                      : 'slate'
                }
              >
                {listing.status}
              </Badge>
              <Badge tone={complianceTone(listing.compliance?.state)}>
                {String(listing.compliance?.state || '-').toUpperCase()}
              </Badge>
              <span className="ml-auto">
                <ScorePill score={listing.quality} />
              </span>
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              {listing.id} · {listing.marketplace} · {listing.kind} · {listing.category || 'No category'}
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              Updated {fmtTime(listing.updatedAt)} · {listing.translations} languages · {listing.images || 0} assets
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={onScan}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
          >
            <Scan className="h-4 w-4" />
            Scan
          </button>
          <button
            type="button"
            onClick={() => {
              safeCopy(listing.id);
              pushToast({ title: 'Copied', message: 'Listing ID copied.', tone: 'success' });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
          >
            <Copy className="h-4 w-4" />
            Copy ID
          </button>
          <button
            type="button"
            onClick={() => {
              safeCopy(JSON.stringify(listing, null, 2));
              pushToast({ title: 'Copied', message: 'Listing JSON copied.', tone: 'success' });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
          >
            <FileText className="h-4 w-4" />
            Copy JSON
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label={labels.kpiViewsLabel} value={String(listing.kpis?.views ?? 0)} icon={BarChart3} />
        <KpiCard label={labels.kpiAddLabel} value={String(listing.kpis?.addToCart ?? 0)} icon={Package} />
        <KpiCard label={labels.kpiOrdersLabel} value={String(listing.kpis?.orders ?? 0)} icon={Wallet} />
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-700" />
          <div className="text-sm font-black text-slate-900">Performance</div>
          <span className="ml-auto flex gap-2">
            {['7d', '30d', '90d'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={cx(
                  'rounded-2xl border px-3 py-1.5 text-[11px] font-extrabold transition',
                  range === option
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700'
                )}
              >
                {option}
              </button>
            ))}
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
            <div className="text-[11px] font-extrabold text-slate-600">Views trend</div>
            <div className="mt-3">
              <Sparkline points={listing.trend?.views || [1, 2, 3, 4]} />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
            <div className="text-[11px] font-extrabold text-slate-600">{labels.ordersTrendLabel}</div>
            <div className="mt-3">
              <Sparkline points={listing.trend?.orders || [1, 1, 2, 1]} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-700" />
          <div className="text-sm font-black text-slate-900">Pricing</div>
          <span className="ml-auto">
            <Badge tone="slate">{listing.currency}</Badge>
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
            <div className="text-[11px] font-extrabold text-slate-600">{labels.retailLabel}</div>
            <div className="mt-1 text-lg font-black text-slate-900">{fmtMoney(listing.retailPrice, listing.currency)}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              {labels.compareLabel} {fmtMoney(listing.compareAt, listing.currency)}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
            <div className="text-[11px] font-extrabold text-slate-600">{labels.wholesaleLabel}</div>
            <div className="mt-1 text-lg font-black text-slate-900">{labels.moqLabel} {listing.moq}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              Best tier {fmtMoney((listing.wholesaleTiers || [])[Math.max(0, (listing.wholesaleTiers || []).length - 1)]?.price, listing.currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-700" />
          <div className="text-sm font-black text-slate-900">Inventory</div>
          <span className="ml-auto">
            <Badge tone={lowStock ? 'danger' : 'green'}>
              {listing.kind === 'Product' ? (lowStock ? 'Low stock' : 'Stock OK') : 'Service'}
            </Badge>
          </span>
        </div>
        {listing.kind !== 'Product' ? (
          <div className="mt-3 text-xs font-semibold text-slate-500">
            Service listings do not track warehouse inventory.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {inventoryRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-500">
                No warehouse rows yet.
              </div>
            ) : (
              inventoryRows.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-700">
                  <div className="col-span-5 font-extrabold text-slate-900">{row.location}</div>
                  <div className="col-span-2">{row.onHand} on hand</div>
                  <div className="col-span-2">{row.reserved} reserved</div>
                  <div className="col-span-3">
                    <Badge tone={row.available <= 5 ? 'danger' : 'green'}>{row.available} available</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-700" />
          <div className="text-sm font-black text-slate-900">Compliance</div>
          <span className="ml-auto">
            <Badge tone={complianceTone(listing.compliance?.state)}>
              {String(listing.compliance?.state || '-').toUpperCase()}
            </Badge>
          </span>
        </div>
        <div className="mt-2 text-xs font-semibold text-slate-500">
          Last scan {listing.compliance?.lastScanAt ? fmtTime(listing.compliance.lastScanAt) : 'not available'}
        </div>
        <div className="mt-3 space-y-2">
          {(listing.compliance?.issues || []).length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs font-extrabold text-emerald-800">
              No compliance issues.
            </div>
          ) : (
            (listing.compliance?.issues || []).map((issue) => (
              <div key={issue} className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50/60 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-700" />
                <div className="text-xs font-extrabold text-orange-900">{issue}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-700" />
          <div className="text-sm font-black text-slate-900">Recent version</div>
          <span className="ml-auto">
            <Badge tone="slate">{(versions || []).length}</Badge>
          </span>
        </div>
        {!latestVersion ? (
          <div className="mt-3 text-xs font-semibold text-slate-500">No version history yet.</div>
        ) : (
          <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
            <div className="flex items-center gap-2">
              <Badge tone="slate">Latest</Badge>
              <div className="text-xs font-extrabold text-slate-900">{latestVersion.note || 'Saved version'}</div>
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              {latestVersion.actor || 'System'} · {fmtTime(latestVersion.at)}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
            <Flame className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-orange-900">Promote</div>
            <div className="mt-1 text-xs font-semibold text-orange-900/70">
              Quick jump into MyLiveDealz for Live and Adz.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/mldz/adz/dashboard')}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <Flame className="h-4 w-4" />
                Create Ad
              </button>
              <button
                type="button"
                onClick={() => navigate('/mldz/live/schedule')}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
              >
                <Calendar className="h-4 w-4" />
                Schedule Live
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingDetailDrawer({ open, listing, onClose, onEdit, pushToast, labels }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [range, setRange] = useState('7d');

  useEffect(() => {
    if (open) {
      setTab('Overview');
      setRange('7d');
    }
  }, [open]);

  if (!listing) {
    return (
      <Drawer open={open} title="Listing" subtitle="Select a listing" onClose={onClose}>
        <EmptyState title="No listing selected" message="Choose a listing from the table first." />
      </Drawer>
    );
  }

  const inventoryRows = (listing.inventory || []).map((w) => ({
    ...w,
    available: Math.max(0, Number(w.onHand || 0) - Number(w.reserved || 0)),
  }));
  const lowStock = listing.kind === 'Product' && inventoryRows.some((r) => r.available <= 5);

  return (
    <Drawer
      open={open}
      title={`Listing · ${listing.id}`}
      subtitle="Performance, inventory, pricing and compliance."
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-black text-slate-900">{listing.title}</div>
                <Badge
                  tone={
                    listing.status === 'Live'
                      ? 'green'
                      : listing.status === 'Paused'
                        ? 'orange'
                        : 'slate'
                  }
                >
                  {listing.status}
                </Badge>
                <Badge tone={complianceTone(listing.compliance?.state)}>
                  {String(listing.compliance?.state || '-').toUpperCase()}
                </Badge>
                <span className="ml-auto">
                  <ScorePill score={listing.quality} />
                </span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {listing.marketplace} · {listing.kind} · Category: {listing.category || '—'} ·
                Updated {fmtTime(listing.updatedAt)}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => {
                    pushToast({
                      title: 'Promote',
                      message: 'Jumping to MyLiveDealz…',
                      tone: 'default',
                    });
                    navigate('/mldz/feed');
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.orange }}
                >
                  <Flame className="h-4 w-4" />
                  Promote via MyLiveDealz
                </button>

                <button
                  type="button"
                  onClick={() => {
                    safeCopy(listing.id);
                    pushToast({ title: 'Copied', message: 'Listing ID copied.', tone: 'success' });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy ID
                </button>

                <button
                  type="button"
                  onClick={() => {
                    safeCopy(JSON.stringify(listing, null, 2));
                    pushToast({
                      title: 'Copied',
                      message: 'Listing JSON copied.',
                      tone: 'success',
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <FileText className="h-4 w-4" />
                  Copy JSON
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {lowStock ? (
                  <Badge tone="danger">Low stock</Badge>
                ) : (
                  <Badge tone="green">Stock OK</Badge>
                )}
                <Badge tone="slate">Range {range}</Badge>
                <div className="ml-auto flex flex-wrap gap-2">
                  {[
                    { k: '7d', label: '7d' },
                    { k: '30d', label: '30d' },
                    { k: '90d', label: '90d' },
                  ].map((r) => (
                    <button
                      key={r.k}
                      type="button"
                      onClick={() => setRange(r.k)}
                      className={cx(
                        'rounded-2xl border px-3 py-2 text-[11px] font-extrabold transition',
                        range === r.k
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['Overview', 'Performance', 'Inventory', 'Pricing', 'Compliance', 'Promote'].map((t) => (
            <SegTab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
        </div>

        <GlassCard className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.16 }}
            >
              {tab === 'Overview' ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <KpiCard
                      label={labels.kpiViewsLabel}
                      value={String(listing.kpis?.views ?? 0)}
                      icon={BarChart3}
                    />
                    <KpiCard
                      label={labels.kpiAddLabel}
                      value={String(listing.kpis?.addToCart ?? 0)}
                      icon={Package}
                    />
                    <KpiCard
                      label={labels.kpiOrdersLabel}
                      value={String(listing.kpis?.orders ?? 0)}
                      icon={Wallet}
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900">{labels.previewTitle}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {labels.previewSubtitle}
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                            <div className="text-[11px] font-extrabold text-slate-600">{labels.retailLabel}</div>
                            <div className="mt-1 text-lg font-black text-slate-900">
                              {fmtMoney(listing.retailPrice, listing.currency)}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              {labels.compareLabel} {fmtMoney(listing.compareAt, listing.currency)}
                            </div>
                          </div>
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                            <div className="text-[11px] font-extrabold text-slate-600">
                              {labels.wholesaleLabel}
                            </div>
                            <div className="mt-1 text-lg font-black text-slate-900">
                              {labels.moqLabel} {listing.moq}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              {labels.bestTierLabel}{' '}
                              {fmtMoney(
                                (listing.wholesaleTiers || [])[
                                  Math.max(0, (listing.wholesaleTiers || []).length - 1)
                                ]?.price,
                                listing.currency
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Info className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-orange-900">
                          MyLiveDealz shortcuts
                        </div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">
                          Boost this listing with Adz and Live.
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => (navigate('/mldz/adz/dashboard'))}
                            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.orange }}
                          >
                            <Flame className="h-4 w-4" />
                            Create Shoppable Ad
                          </button>
                          <button
                            type="button"
                            onClick={() => (navigate('/mldz/live/schedule'))}
                            className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                          >
                            <Calendar className="h-4 w-4" />
                            Schedule Live
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'Performance' ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Views trend</div>
                        <span className="ml-auto">
                          <Badge tone="slate">{range}</Badge>
                        </span>
                      </div>
                      <div className="mt-3">
                        <Sparkline points={listing.trend?.views || [1, 2, 3, 4]} />
                      </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">{labels.ordersTrendLabel}</div>
                        <span className="ml-auto">
                          <Badge tone="slate">{range}</Badge>
                        </span>
                      </div>
                      <div className="mt-3">
                        <Sparkline points={listing.trend?.orders || [1, 1, 2, 1]} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'Inventory' ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">Inventory</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          Warehouses, availability and reserved counts.
                        </div>
                      </div>
                      <Badge tone={lowStock ? 'danger' : 'green'}>
                        {lowStock ? 'Low stock' : 'Healthy'}
                      </Badge>
                    </div>

                    <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                        <div className="col-span-5">Location</div>
                        <div className="col-span-2">On hand</div>
                        <div className="col-span-2">Reserved</div>
                        <div className="col-span-3">Available</div>
                      </div>
                      <div className="divide-y divide-slate-200/70">
                        {inventoryRows.map((r) => (
                          <div
                            key={r.id}
                            className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700"
                          >
                            <div className="col-span-5 font-extrabold text-slate-900">
                              {r.location}
                            </div>
                            <div className="col-span-2">{r.onHand}</div>
                            <div className="col-span-2">{r.reserved}</div>
                            <div className="col-span-3">
                              <Badge tone={r.available <= 5 ? 'danger' : 'green'}>
                                {r.available}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'Pricing' ? (
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Retail pricing</div>
                      <span className="ml-auto">
                        <Badge tone="slate">{listing.currency}</Badge>
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                        <div className="text-[11px] font-extrabold text-slate-600">
                          Retail price
                        </div>
                        <div className="mt-1 text-lg font-black text-slate-900">
                          {fmtMoney(listing.retailPrice, listing.currency)}
                        </div>
                      </div>
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                        <div className="text-[11px] font-extrabold text-slate-600">Compare at</div>
                        <div className="mt-1 text-lg font-black text-slate-900">
                          {fmtMoney(listing.compareAt, listing.currency)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Wholesale tiers</div>
                      <span className="ml-auto">
                        <Badge tone="slate">MOQ {listing.moq}</Badge>
                      </span>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                        <div className="col-span-6">Quantity</div>
                        <div className="col-span-6">Price</div>
                      </div>
                      <div className="divide-y divide-slate-200/70">
                        {(listing.wholesaleTiers || []).map((t, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700"
                          >
                            <div className="col-span-6">{t.qty}+</div>
                            <div className="col-span-6 font-extrabold text-slate-900">
                              {fmtMoney(t.price, listing.currency)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'Compliance' ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Compliance</div>
                      <span className="ml-auto">
                        <Badge tone={complianceTone(listing.compliance?.state)}>
                          {String(listing.compliance?.state || '-').toUpperCase()}
                        </Badge>
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setField('compliance', {
                            ...listing.compliance,
                            state: 'ok',
                            issues: [],
                            lastScanAt: new Date().toISOString(),
                          });
                          pushToast({
                            title: 'Compliance updated',
                            message: 'Marked as OK (demo).',
                            tone: 'success',
                          });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <CheckCheck className="h-5 w-5" />
                        Mark compliant
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setField('compliance', {
                            ...listing.compliance,
                            state: 'warn',
                            issues: ['Missing document upload'],
                            lastScanAt: new Date().toISOString(),
                          });
                          pushToast({
                            title: 'Compliance updated',
                            message: 'Added a warning issue (demo).',
                            tone: 'warning',
                          });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-extrabold text-orange-800"
                      >
                        <AlertTriangle className="h-5 w-5" />
                        Add warning
                      </button>
                    </div>

                    <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="text-[11px] font-extrabold text-slate-600">Issues</div>
                      <div className="mt-2 space-y-2">
                        {(listing.compliance?.issues || []).length === 0 ? (
                          <div className="text-xs font-semibold text-slate-500">No issues.</div>
                        ) : (
                          (listing.compliance.issues || []).map((iss) => (
                            <div
                              key={iss}
                              className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50/60 p-3"
                            >
                              <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-700" />
                              <div className="text-xs font-extrabold text-orange-900">{iss}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'Promote' ? (
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-700" />
                      <div className="text-sm font-black text-slate-900">
                        Promote via MyLiveDealz
                      </div>
                      <span className="ml-auto">
                        <Badge tone="orange">Promo</Badge>
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">
                      One click entry points to the promo shell.
                    </div>
                  </div>

                  <PromoteCard
                    title="Create Shoppable Ad"
                    desc="Promote this listing inside MyLiveDealz Adz"
                    icon={Flame}
                    primary
                    onClick={() => (navigate('/mldz/adz/dashboard'))}
                  />
                  <PromoteCard
                    title="Schedule Live Session"
                    desc="Go live and sell with creator collabs"
                    icon={Calendar}
                    onClick={() => (navigate('/mldz/live/schedule'))}
                  />
                  <PromoteCard
                    title="Add to Dealz Marketplace"
                    desc="Feature it as a deal with stock counters"
                    icon={Store}
                    onClick={() => (navigate('/mldz/dealz-marketplace'))}
                  />
                  <PromoteCard
                    title="Open Asset Library"
                    desc="Upload posters, clips, and product media"
                    icon={Upload}
                    onClick={() => (navigate('/mldz/deliverables/asset-library'))}
                  />
                  <PromoteCard
                    title="Generate Links Hub"
                    desc="Create short links, QR codes, and share kits"
                    icon={Link2}
                    onClick={() => (navigate('/mldz/deliverables/links-hub'))}
                  />
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </div>
    </Drawer>
  );
}

function createDefaultLocalesFromDraft(d) {
  const baseTitle = String(d.title || '');
  const baseDesc = String(d.description || '');
  return {
    en: { title: baseTitle, description: baseDesc },
    fr: { title: '', description: '' },
    zh: { title: '', description: '' },
    ar: { title: '', description: '' },
    es: { title: '', description: '' },
  };
}

function computeTranslationsCount(locales) {
  if (!locales) return 0;
  const keys = Object.keys(locales).filter((k) => k !== 'en');
  let count = 1; // English baseline
  keys.forEach((k) => {
    const t = String(locales[k]?.title || '').trim();
    const d = String(locales[k]?.description || '').trim();
    if (t.length > 0 || d.length > 0) count += 1;
  });
  return count;
}

function makeAiTitleSuggestions(d) {
  const title = String(d.title || '').trim();
  const cat = String(d.category || '').trim();
  const mk = String(d.marketplace || '').trim();
  const tags = Array.isArray(d.tags) ? d.tags.slice(0, 3) : [];
  const tagLine = tags.length ? tags.join(' · ') : '';

  const base = title || `${cat || 'Listing'}`;

  if (String(d.kind) === 'Service') {
    return [
      `${base} — Professional delivery · ${mk}`,
      `${base} — Fast booking · Verified provider`,
      `${base} — Scope + timeline · Premium support`,
      `${base} — Package options · Transparent pricing`,
      `${base} — ${tagLine || 'Trusted service'}`,
    ].filter(Boolean);
  }

  return [
    `${base} — ${cat || 'Premium'} · ${tagLine || 'Top quality'}`,
    `${base} — Wholesale ready · MOQ ${d.moq || 1}`,
    `${base} — ${mk || 'Marketplace'} best seller · Fast shipping`,
    `${base} — Verified listing · Compliance ready`,
    `${base} — Retail + wholesale tiers · Limited stock`,
  ].filter(Boolean);
}

function cartesian(arrs, limit = 60) {
  if (!arrs.length) return [[]];
  let out = [[]];
  for (const a of arrs) {
    const next = [];
    for (const prev of out) {
      for (const v of a) {
        next.push([...prev, v]);
        if (next.length >= limit) break;
      }
      if (next.length >= limit) break;
    }
    out = next;
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeVariantMatrix(vm) {
  const safe = vm || { enabled: false, attributes: [], variants: [] };
  const attrs = Array.isArray(safe.attributes) ? safe.attributes : [];
  const normalizedAttrs = attrs
    .map((a) => ({
      name: String(a?.name || '').trim(),
      values: Array.isArray(a?.values) ? a.values.map((v) => String(v).trim()).filter(Boolean) : [],
    }))
    .filter((a) => a.name.length > 0);

  const vars = Array.isArray(safe.variants) ? safe.variants : [];
  const normalizedVars = vars.map((v) => ({
    id: String(v?.id || makeId('var')),
    key: String(v?.key || '').trim(),
    sku: String(v?.sku || '').trim(),
    priceDelta: Number(v?.priceDelta || 0),
    stock: Number(v?.stock || 0),
    active: v?.active !== false,
  }));

  return { enabled: !!safe.enabled, attributes: normalizedAttrs, variants: normalizedVars };
}

function generateVariantRows(attributes, existing, limit = 60) {
  const map = new Map();
  (existing || []).forEach((v) => map.set(v.key, v));

  const arrays = attributes.map((a) => a.values);
  const combos = cartesian(arrays, limit);

  return combos.map((combo) => {
    const key = combo.join(' / ');
    const prev = map.get(key);
    return {
      id: prev?.id || makeId('var'),
      key,
      sku: prev?.sku || '',
      priceDelta: Number(prev?.priceDelta || 0),
      stock: Number(prev?.stock || 0),
      active: prev?.active !== false,
    };
  });
}

function ensureApproval(d) {
  if (d.approval) return d;
  return {
    ...d,
    approval: {
      required: true,
      state: 'Draft',
      reviewers: ['Compliance Desk'],
      history: [
        {
          id: makeId('ap'),
          at: new Date().toISOString(),
          actor: 'System',
          action: 'Created',
          note: 'Approval workflow initialized',
        },
      ],
    },
  };
}

function ListingEditDrawer({ open, listing, onClose, onSave, pushToast, versions, onRollback }) {
  const [tab, setTab] = useState('Basics');
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [autosaveAt, setAutosaveAt] = useState(null);
  const autosaveRef = useRef(null);

  const [ai, setAi] = useState({ loading: false, suggestions: [] });

  useEffect(() => {
    if (!open) return;
    setTab('Basics');

    let copy = listing ? JSON.parse(JSON.stringify(listing)) : null;
    if (copy) {
      copy = ensureApproval(copy);
      copy.locales = copy.locales || createDefaultLocalesFromDraft(copy);
      copy.variantMatrix = normalizeVariantMatrix(copy.variantMatrix);
      copy.translations = computeTranslationsCount(copy.locales);
    }

    setDraft(copy);
    setDirty(false);
    setAutosaveAt(null);
    setAi({ loading: false, suggestions: [] });
  }, [open, listing?.id]);

  useEffect(() => {
    if (!open || !draft) return;
    setDirty(true);
    window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      setAutosaveAt(new Date().toISOString());
    }, 700);
    return () => window.clearTimeout(autosaveRef.current);
  }, [draft, open]);

  const approval = draft?.approval || { required: true, state: 'Draft', reviewers: [], history: [] };

  const policy = useMemo(() => {
    const safeDraft = draft || {};
    const q = calcQuality(safeDraft);
    const complianceState = safeDraft.compliance?.state || 'warn';
    const images = Number(safeDraft.images || 0);
    const trans = Number(safeDraft.translations || 1);
    const priceOk = Number(safeDraft.retailPrice || 0) > 0;

    return {
      qualityScore: q,
      checks: [
        { key: 'quality', label: 'Quality score ≥ 75', pass: q >= 75, note: `Score ${q}` },
        {
          key: 'compliance',
          label: 'No critical compliance issues',
          pass: complianceState !== 'issue',
          note: String(complianceState).toUpperCase(),
        },
        {
          key: 'media',
          label: 'At least 3 media assets',
          pass: images >= 3,
          note: `${images} asset(s)`,
        },
        {
          key: 'langs',
          label: 'At least 2 languages',
          pass: trans >= 2,
          note: `${trans} language(s)`,
        },
        {
          key: 'pricing',
          label: 'Retail price set',
          pass: priceOk,
          note: priceOk ? 'OK' : 'Missing',
        },
      ],
    };
  }, [draft]);

  const approvalRequired = !!approval.required;

  if (!draft) {
    return (
      <Drawer open={open} title="Edit listing" subtitle="Select a listing" onClose={onClose}>
        <EmptyState title="No listing selected" message="Choose a listing first." />
      </Drawer>
    );
  }

  const setField = (k, v) => {
    setDraft((s) => {
      const next = { ...s, [k]: v };
      // keep English locale in sync
      const locales = next.locales || createDefaultLocalesFromDraft(next);
      if (k === 'title') locales.en.title = String(v || '');
      if (k === 'description') locales.en.description = String(v || '');
      next.locales = locales;
      next.translations = computeTranslationsCount(locales);
      return next;
    });
  };

  const updateLocale = (lang, field, value) => {
    setDraft((s) => {
      const locales = { ...(s.locales || createDefaultLocalesFromDraft(s)) };
      locales[lang] = { ...(locales[lang] || { title: '', description: '' }), [field]: value };

      const next = { ...s, locales, translations: computeTranslationsCount(locales) };
      if (lang === 'en' && field === 'title') next.title = value;
      if (lang === 'en' && field === 'description') next.description = value;
      return next;
    });
  };

  const vm = draft.variantMatrix || normalizeVariantMatrix(null);

  const ensureVariantEnabled = () => {
    setDraft((s) => {
      const vm2 = normalizeVariantMatrix(s.variantMatrix);
      return { ...s, variantMatrix: { ...vm2, enabled: true } };
    });
  };

  const setVm = (nextVm) => {
    setDraft((s) => ({ ...s, variantMatrix: normalizeVariantMatrix(nextVm) }));
  };

  const tiers = Array.isArray(draft.wholesaleTiers) ? draft.wholesaleTiers : [];
  const addTier = () => {
    const lastQty = tiers.length ? Number(tiers[tiers.length - 1].qty) : Number(draft.moq || 1);
    const lastPrice = tiers.length
      ? Number(tiers[tiers.length - 1].price)
      : Number(draft.retailPrice || 0);
    setField('wholesaleTiers', [
      ...tiers,
      { qty: lastQty + 10, price: Math.max(1, Math.round(lastPrice * 0.95 * 100) / 100) },
    ]);
  };
  const removeTier = (idx) =>
    setField(
      'wholesaleTiers',
      tiers.filter((_, i) => i !== idx)
    );
  const updateTier = (idx, patch) =>
    setField(
      'wholesaleTiers',
      tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    );

  const editorTabs = [
    'Basics',
    draft.kind === 'Product' ? 'Variants' : null,
    'Localization',
    'Approvals',
    'Media',
    'Pricing',
    'Inventory',
    'Compliance',
    'Versions',
  ].filter(Boolean);

  const pushApprovalHistory = (actor, action, note) => {
    setDraft((s) => {
      const ap = s.approval || approval;
      const history = Array.isArray(ap.history) ? ap.history : [];
      const next = {
        ...s,
        approval: {
          ...ap,
          history: [
            { id: makeId('ap'), at: new Date().toISOString(), actor, action, note },
            ...history,
          ].slice(0, 40),
        },
      };
      return next;
    });
  };

  const requestReview = () => {
    setDraft((s) => {
      const ap = s.approval || approval;
      const next = {
        ...s,
        status: 'In Review',
        approval: { ...ap, state: 'In Review' },
      };
      return next;
    });
    pushApprovalHistory('Supplier', 'Requested review', 'Submitted for approval');
    pushToast({ title: 'Submitted', message: 'Sent for review (demo).', tone: 'default' });
  };

  const approveNow = () => {
    setDraft((s) => {
      const ap = s.approval || approval;
      const complianceState = s.compliance?.state || 'warn';
      const canPublish = complianceState !== 'issue';
      return {
        ...s,
        status: canPublish ? 'Live' : 'In Review',
        approval: { ...ap, state: 'Approved' },
      };
    });
    pushApprovalHistory('Reviewer', 'Approved', 'Approved for publishing');
    pushToast({ title: 'Approved', message: 'Approval granted (demo).', tone: 'success' });
  };

  const requestChanges = () => {
    setDraft((s) => ({
      ...s,
      status: 'Draft',
      approval: { ...(s.approval || approval), state: 'Draft' },
    }));
    pushApprovalHistory('Reviewer', 'Requested changes', 'Please address the flagged items');
    pushToast({
      title: 'Changes requested',
      message: 'Moved back to Draft (demo).',
      tone: 'warning',
    });
  };

  const rejectNow = () => {
    setDraft((s) => ({
      ...s,
      status: 'Rejected',
      approval: { ...(s.approval || approval), state: 'Rejected' },
    }));
    pushApprovalHistory('Reviewer', 'Rejected', 'Rejected with reasons');
    pushToast({ title: 'Rejected', message: 'Listing rejected (demo).', tone: 'danger' });
  };

  const headerRight = (
    <div className="flex flex-wrap items-center gap-2">
      {dirty ? <Badge tone="orange">Unsaved</Badge> : <Badge tone="green">Saved</Badge>}
      {autosaveAt ? (
        <Badge tone="slate">Autosaved {fmtTime(autosaveAt)}</Badge>
      ) : (
        <Badge tone="slate">Autosave</Badge>
      )}
    </div>
  );

  return (
    <Drawer
      open={open}
      title={`Edit · ${draft.id}`}
      subtitle="AI assist, variants, localization and approvals."
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {editorTabs.map((t) => (
            <SegTab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
          <span className="ml-auto">{headerRight}</span>
        </div>

        <GlassCard className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.16 }}
            >
              {tab === 'Basics' ? (
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Core details</div>
                      <span className="ml-auto">
                        <ScorePill score={calcQuality(draft)} />
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Title</div>
                        <input
                          value={draft.title}
                          onChange={(e) => setField('title', e.target.value)}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                          <Badge tone="slate">Length {String(draft.title || '').length}</Badge>
                          <Badge tone={String(draft.title || '').length >= 50 ? 'green' : 'orange'}>
                            SEO
                          </Badge>
                          <span className="text-slate-400">Tip: 50–70 chars for best results</span>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">
                            Marketplace
                          </div>
                          <div className="relative mt-2">
                            <select
                              value={draft.marketplace}
                              onChange={(e) => setField('marketplace', e.target.value)}
                              className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                            >
                              {['EVmart', 'ServiceMart', 'GadgetMart', 'ExpressMart'].map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Type</div>
                          <div className="relative mt-2">
                            <select
                              value={draft.kind}
                              onChange={(e) => setField('kind', e.target.value)}
                              className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                            >
                              {['Product', 'Service'].map((k) => (
                                <option key={k} value={k}>
                                  {k}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Category</div>
                          <input
                            value={draft.category || ''}
                            onChange={(e) => setField('category', e.target.value)}
                            placeholder="e.g., Chargers"
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Description</div>
                        <textarea
                          value={draft.description || ''}
                          onChange={(e) => setField('description', e.target.value)}
                          rows={5}
                          className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>

                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Tags</div>
                        <input
                          value={(draft.tags || []).join(', ')}
                          onChange={(e) =>
                            setField(
                              'tags',
                              e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean)
                            )
                          }
                          placeholder="tag1, tag2, tag3"
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI title suggestions */}
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-700" />
                      <div className="text-sm font-black text-emerald-900">
                        AI title suggestions
                      </div>
                      <span className="ml-auto">
                        <Badge tone="green">Premium</Badge>
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-emerald-900/70">
                      Generate better titles using category, tags, MOQ and marketplace context
                      (demo).
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAi({ loading: true, suggestions: [] });
                          window.setTimeout(() => {
                            setAi({ loading: false, suggestions: makeAiTitleSuggestions(draft) });
                            pushToast({
                              title: 'AI suggestions ready',
                              message: 'Pick one to apply.',
                              tone: 'success',
                            });
                          }, 420);
                        }}
                        className={cx(
                          'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white',
                          ai.loading && 'opacity-80'
                        )}
                        style={{ background: TOKENS.green }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const improved = String(draft.title || '')
                            .trim()
                            .replace(/\s+/g, ' ');
                          safeCopy(improved);
                          pushToast({
                            title: 'Copied',
                            message: 'Current title copied.',
                            tone: 'default',
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-emerald-800"
                      >
                        <Copy className="h-4 w-4" />
                        Copy title
                      </button>
                    </div>

                    {ai.suggestions.length ? (
                      <div className="mt-3 space-y-2">
                        {ai.suggestions.slice(0, 6).map((sugg) => (
                          <div
                            key={sugg}
                            className="flex items-start gap-2 rounded-3xl border border-emerald-200 bg-white dark:bg-slate-900 p-3"
                          >
                            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                              <Sparkles className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-extrabold text-slate-900">{sugg}</div>
                              <div className="mt-1 text-[11px] font-semibold text-slate-500">
                                Length {sugg.length}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setField('title', sugg)}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Check className="h-4 w-4" />
                              Use
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Info className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-orange-900">Premium checklist</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                          <li>Strong title + detailed description</li>
                          <li>6+ media assets</li>
                          <li>3+ languages</li>
                          <li>No compliance issues</li>
                          <li>Approval workflow completed</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Variant matrix */}
              {tab === 'Variants' ? (
                <div className="grid gap-3">
                  {draft.kind !== 'Product' ? (
                    <EmptyState
                      title="Variants are for products"
                      message="This listing is a service. Variant matrix is not applicable."
                    />
                  ) : (
                    <>
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Variant matrix</div>
                          <span className="ml-auto">
                            <Badge tone="slate">{vm.enabled ? 'Enabled' : 'Disabled'}</Badge>
                          </span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-500">
                          Define attributes (Color, Size) and generate variants with SKU, price
                          delta, and stock.
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = normalizeVariantMatrix(draft.variantMatrix);
                              setVm({ ...next, enabled: !next.enabled });
                            }}
                            className={cx(
                              'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold',
                              vm.enabled
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100'
                            )}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {vm.enabled ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (!vm.enabled) return ensureVariantEnabled();
                              const attrs = vm.attributes.length
                                ? vm.attributes
                                : [{ name: 'Color', values: ['Black', 'White'] }];
                              const rows = generateVariantRows(attrs, vm.variants, 60);
                              setVm({ ...vm, attributes: attrs, variants: rows });
                              pushToast({
                                title: 'Matrix generated',
                                message: `${rows.length} variants created (demo).`,
                                tone: 'success',
                              });
                            }}
                            className={cx(
                              'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white',
                              vm.enabled ? '' : 'opacity-50 cursor-not-allowed'
                            )}
                            style={{ background: TOKENS.green }}
                          >
                            <Layers className="h-4 w-4" />
                            Generate matrix
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const sum = (vm.variants || [])
                                .filter((v) => v.active !== false)
                                .reduce((s, v) => s + Number(v.stock || 0), 0);
                              setField('stock', sum);
                              pushToast({
                                title: 'Stock synced',
                                message: `Stock = ${sum}`,
                                tone: 'default',
                              });
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Sync stock
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="text-sm font-black text-slate-900">Attributes</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            Name + comma-separated values
                          </div>

                          <div className="mt-3 space-y-3">
                            {vm.attributes.map((a, idx) => (
                              <div
                                key={idx}
                                className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    value={a.name}
                                    onChange={(e) => {
                                      const next = vm.attributes.map((x, i) =>
                                        i === idx ? { ...x, name: e.target.value } : x
                                      );
                                      setVm({ ...next, attributes: next });
                                    }}
                                    placeholder="Attribute name"
                                    className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-xs font-extrabold text-slate-800 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = vm.attributes.filter((_, i) => i !== idx);
                                      setVm({ ...vm, attributes: next });
                                    }}
                                    className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                                    aria-label="Remove"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <input
                                  value={a.values.join(', ')}
                                  onChange={(e) => {
                                    const values = e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean);
                                    const next = vm.attributes.map((x, i) =>
                                      i === idx ? { ...x, values } : x
                                    );
                                    setVm({ ...vm, attributes: next });
                                  }}
                                  placeholder="Black, White"
                                  className="mt-2 h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 outline-none"
                                />
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() =>
                                setVm({
                                  ...vm,
                                  attributes: [...vm.attributes, { name: '', values: [] }],
                                })
                              }
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Plus className="h-4 w-4" />
                              Add attribute
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black text-slate-900">
                                Matrix summary
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">
                                Base price {fmtMoney(draft.retailPrice, draft.currency)}
                              </div>
                            </div>
                            <Badge tone="slate">{(vm.variants || []).length} variants</Badge>
                          </div>
                          <div className="mt-3 text-xs font-semibold text-slate-600">
                            Premium: variant-specific images, barcode, and warehouse routing can be
                            added later.
                          </div>
                          <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                            <div className="flex items-start gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                                <Info className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-sm font-black text-orange-900">Tip</div>
                                <div className="mt-1 text-xs font-semibold text-orange-900/70">
                                  Keep under 60 variants to avoid heavy UI.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Variants</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              SKU, price delta, stock and active state
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              safeCopy(JSON.stringify(vm, null, 2));
                              pushToast({
                                title: 'Copied',
                                message: 'Variant matrix copied.',
                                tone: 'default',
                              });
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </button>
                        </div>

                        {(vm.variants || []).length === 0 ? (
                          <div className="mt-3">
                            <EmptyState
                              title="No variants"
                              message="Add attributes and generate a matrix."
                            />
                          </div>
                        ) : (
                          <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                            <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                              <div className="col-span-4">Variant</div>
                              <div className="col-span-3">SKU</div>
                              <div className="col-span-2">Price Δ</div>
                              <div className="col-span-2">Stock</div>
                              <div className="col-span-1">On</div>
                            </div>
                            <div className="divide-y divide-slate-200/70">
                              {vm.variants.map((v, idx) => (
                                <div
                                  key={v.id}
                                  className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700"
                                >
                                  <div
                                    className="col-span-4 font-extrabold text-slate-900 truncate"
                                    title={v.key}
                                  >
                                    {v.key}
                                  </div>
                                  <div className="col-span-3">
                                    <input
                                      value={v.sku}
                                      onChange={(e) => {
                                        const next = vm.variants.map((x, i) =>
                                          i === idx ? { ...x, sku: e.target.value } : x
                                        );
                                        setVm({ ...vm, variants: next });
                                      }}
                                      placeholder="SKU"
                                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 outline-none"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      value={String(v.priceDelta)}
                                      onChange={(e) => {
                                        const next = vm.variants.map((x, i) =>
                                          i === idx
                                            ? { ...x, priceDelta: Number(e.target.value) }
                                            : x
                                        );
                                        setVm({ ...vm, variants: next });
                                      }}
                                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 outline-none"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      value={String(v.stock)}
                                      onChange={(e) => {
                                        const next = vm.variants.map((x, i) =>
                                          i === idx ? { ...x, stock: Number(e.target.value) } : x
                                        );
                                        setVm({ ...vm, variants: next });
                                      }}
                                      className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 outline-none"
                                    />
                                  </div>
                                  <div className="col-span-1 flex items-center justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = vm.variants.map((x, i) =>
                                          i === idx ? { ...x, active: !x.active } : x
                                        );
                                        setVm({ ...vm, variants: next });
                                      }}
                                      className={cx(
                                        'grid h-10 w-10 place-items-center rounded-2xl border',
                                        v.active
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                          : 'border-slate-200/70 bg-white dark:bg-slate-900 text-slate-500'
                                      )}
                                      aria-label="Toggle"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* Localization */}
              {tab === 'Localization' ? (
                <LocalizationPanel
                  draft={draft}
                  updateLocale={updateLocale}
                  setField={setField}
                  pushToast={pushToast}
                  labels={labels}
                />
              ) : null}

              {/* Approvals */}
              {tab === 'Approvals' ? (
                <ApprovalPanel
                  draft={draft}
                  setDraft={setDraft}
                  policy={policy}
                  approvalRequired={approvalRequired}
                  pushToast={pushToast}
                  requestReview={requestReview}
                  approveNow={approveNow}
                  requestChanges={requestChanges}
                  rejectNow={rejectNow}
                />
              ) : null}

              {tab === 'Media' ? (
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Media manager</div>
                      <span className="ml-auto">
                        <Badge tone="slate">{draft.images || 0} assets</Badge>
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setField('images', Number(draft.images || 0) + 1);
                          pushToast({
                            title: 'Uploaded',
                            message: 'Media added (demo).',
                            tone: 'success',
                          });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Upload className="h-5 w-5" />
                        Upload media
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          pushToast({
                            title: 'Media presets',
                            message: 'Auto-crop, background removal (later).',
                            tone: 'default',
                          })
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-extrabold text-slate-800"
                      >
                        <Sparkles className="h-5 w-5" />
                        Presets
                      </button>
                    </div>
                    <div className="mt-3 text-xs font-semibold text-slate-500">
                      Premium: variant-specific media, smart crops and templates later.
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'Pricing' ? (
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Retail</div>
                      <span className="ml-auto">
                        <Badge tone="slate">{draft.currency}</Badge>
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">
                          Retail price
                        </div>
                        <input
                          value={String(draft.retailPrice ?? '')}
                          onChange={(e) => setField('retailPrice', Number(e.target.value))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Compare at</div>
                        <input
                          value={String(draft.compareAt ?? '')}
                          onChange={(e) => setField('compareAt', Number(e.target.value))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Wholesale</div>
                      <span className="ml-auto">
                        <Badge tone="slate">MOQ</Badge>
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">MOQ</div>
                        <input
                          value={String(draft.moq ?? '')}
                          onChange={(e) => setField('moq', Number(e.target.value))}
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={addTier}
                          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Plus className="h-4 w-4" />
                          Add tier
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                        <div className="col-span-4">Qty</div>
                        <div className="col-span-5">Price</div>
                        <div className="col-span-3">Actions</div>
                      </div>
                      <div className="divide-y divide-slate-200/70">
                        {tiers.map((t, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700"
                          >
                            <div className="col-span-4">
                              <input
                                value={String(t.qty)}
                                onChange={(e) => updateTier(idx, { qty: Number(e.target.value) })}
                                className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                              />
                            </div>
                            <div className="col-span-5">
                              <input
                                value={String(t.price)}
                                onChange={(e) => updateTier(idx, { price: Number(e.target.value) })}
                                className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                              />
                            </div>
                            <div className="col-span-3 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => removeTier(idx)}
                                className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {tiers.length === 0 ? (
                          <div className="p-4">
                            <EmptyState
                              title="No tiers"
                              message="Add a tier to enable wholesale pricing."
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'Inventory' ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Inventory & capacity</div>
                      <span className="ml-auto">
                        <Badge tone="slate">{draft.kind}</Badge>
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">
                      {draft.kind === 'Product'
                        ? 'Edit stock for product listings.'
                        : 'Services use capacity (no stock).'}
                    </div>

                    {draft.kind === 'Product' ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Stock</div>
                          <input
                            value={String(draft.stock ?? '')}
                            onChange={(e) => setField('stock', Number(e.target.value))}
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                          {vm.enabled && (vm.variants || []).length ? (
                            <div className="mt-2 text-[11px] font-semibold text-slate-500">
                              Tip: Sync stock from variants in the Variants tab.
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">
                            Reserved (demo)
                          </div>
                          <input
                            value={String(draft.inventory?.[0]?.reserved ?? 0)}
                            onChange={(e) => {
                              const nextInv = (draft.inventory || []).map((w, idx) =>
                                idx === 0 ? { ...w, reserved: Number(e.target.value) } : w
                              );
                              setField('inventory', nextInv);
                            }}
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">
                              Service capacity
                            </div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">
                              Use availability schedules and bookings (handled in Provider pages).
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {tab === 'Compliance' ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Compliance</div>
                      <span className="ml-auto">
                        <Badge tone={complianceTone(draft.compliance?.state)}>
                          {String(draft.compliance?.state || '-').toUpperCase()}
                        </Badge>
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setField('compliance', {
                            ...draft.compliance,
                            state: 'ok',
                            issues: [],
                            lastScanAt: new Date().toISOString(),
                          });
                          pushToast({
                            title: 'Compliance updated',
                            message: 'Marked as OK (demo).',
                            tone: 'success',
                          });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <CheckCheck className="h-5 w-5" />
                        Mark compliant
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setField('compliance', {
                            ...draft.compliance,
                            state: 'warn',
                            issues: ['Missing document upload'],
                            lastScanAt: new Date().toISOString(),
                          });
                          pushToast({
                            title: 'Compliance updated',
                            message: 'Added a warning issue (demo).',
                            tone: 'warning',
                          });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-extrabold text-orange-800"
                      >
                        <AlertTriangle className="h-5 w-5" />
                        Add warning
                      </button>
                    </div>

                    <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="text-[11px] font-extrabold text-slate-600">Issues</div>
                      <div className="mt-2 space-y-2">
                        {(draft.compliance?.issues || []).length === 0 ? (
                          <div className="text-xs font-semibold text-slate-500">No issues.</div>
                        ) : (
                          (draft.compliance.issues || []).map((iss) => (
                            <div
                              key={iss}
                              className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50/60 p-3"
                            >
                              <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-700" />
                              <div className="text-xs font-extrabold text-orange-900">{iss}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'Versions' ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Version history</div>
                      <span className="ml-auto">
                        <Badge tone="slate">{(versions || []).length}</Badge>
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">
                      Rollback and approvals are tracked separately.
                    </div>

                    <div className="mt-3 space-y-2">
                      {(versions || []).slice(0, 8).map((v, idx) => (
                        <div
                          key={v.id}
                          className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4"
                        >
                          <div className="flex items-center gap-2">
                            <Badge tone="slate">v{(versions.length - idx).toString()}</Badge>
                            <div className="text-xs font-extrabold text-slate-700">
                              {fmtTime(v.at)}
                            </div>
                            <span className="ml-auto">
                              <Badge tone="slate">{v.actor}</Badge>
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-black text-slate-900 truncate">
                            {v.snapshot.title}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500 truncate">
                            {v.note}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onRollback(v.snapshot);
                                pushToast({
                                  title: 'Rolled back',
                                  message: 'Draft replaced with selected version (demo).',
                                  tone: 'success',
                                });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-800"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Rollback
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(JSON.stringify(v.snapshot, null, 2));
                                pushToast({
                                  title: 'Copied',
                                  message: 'Version snapshot copied.',
                                  tone: 'default',
                                });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                          </div>
                        </div>
                      ))}
                      {(versions || []).length === 0 ? (
                        <EmptyState
                          title="No versions"
                          message="Save changes to create versions."
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        {/* footer actions */}
        <div className="sticky bottom-0 -mx-4 mt-3 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const normalized = {
                  ...draft,
                  variantMatrix: normalizeVariantMatrix(draft.variantMatrix),
                  locales: draft.locales || createDefaultLocalesFromDraft(draft),
                  translations: computeTranslationsCount(
                    draft.locales || createDefaultLocalesFromDraft(draft)
                  ),
                  quality: calcQuality(draft),
                  updatedAt: new Date().toISOString(),
                };
                onSave(normalized);
                setDirty(false);
                pushToast({ title: 'Saved', message: 'Listing updated.', tone: 'success' });
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Save className="h-4 w-4" />
              Save
            </button>

            <button
              type="button"
              onClick={() => {
                requestReview();
                const normalized = {
                  ...draft,
                  status: 'In Review',
                  approval: { ...(draft.approval || approval), state: 'In Review' },
                  updatedAt: new Date().toISOString(),
                  quality: calcQuality(draft),
                };
                onSave(normalized);
                setDirty(false);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
              Submit for review
            </button>

            <button
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function LocalizationPanel({ draft, updateLocale, setField, pushToast, labels }) {
  const navigate = useNavigate();
  const [lang, setLang] = useState('en');

  useEffect(() => {
    setLang('en');
  }, [draft?.id]);

  const locales = draft.locales || createDefaultLocalesFromDraft(draft);
  const langMeta = {
    en: 'English',
    fr: 'French',
    zh: 'Chinese',
    ar: 'Arabic',
    es: 'Spanish',
  };

  const current = locales[lang] || { title: '', description: '' };

  const autoTranslate = () => {
    const baseT = String(locales.en?.title || draft.title || '');
    const baseD = String(locales.en?.description || draft.description || '');

    const next = { ...locales };
    Object.keys(langMeta).forEach((k) => {
      if (k === 'en') return;
      next[k] = {
        title: next[k]?.title?.trim() ? next[k].title : `[${k.toUpperCase()}] ${baseT}`,
        description: next[k]?.description?.trim()
          ? next[k].description
          : `[${k.toUpperCase()}] ${baseD}`,
      };
    });

    setField('locales', next);
    pushToast({
      title: 'Auto-translate',
      message: 'Draft translations generated (demo).',
      tone: 'success',
    });
  };

  return (
    <div className="grid gap-3">
      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-700" />
          <div className="text-sm font-black text-slate-900">Multi-language preview</div>
          <span className="ml-auto">
            <Badge tone="slate">{draft.translations} langs</Badge>
          </span>
        </div>
        <div className="mt-2 text-xs font-semibold text-slate-500">
          Edit translations and preview how buyers see your listing.
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(langMeta).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setLang(k)}
              className={cx(
                'rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                lang === k
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950'
              )}
            >
              {langMeta[k]}
            </button>
          ))}

          <button
            type="button"
            onClick={autoTranslate}
            className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <Sparkles className="h-4 w-4" />
            Auto-translate
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard className="p-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Edit translation</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Language: {langMeta[lang]}
              </div>
            </div>
            <Badge tone={lang === 'en' ? 'green' : 'slate'}>
              {lang === 'en' ? 'Primary' : 'Translation'}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3">
            <div>
              <div className="text-[11px] font-extrabold text-slate-600">Title</div>
              <input
                value={String(current.title || '')}
                onChange={(e) => updateLocale(lang, 'title', e.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <div className="text-[11px] font-extrabold text-slate-600">Description</div>
              <textarea
                value={String(current.description || '')}
                onChange={(e) => updateLocale(lang, 'description', e.target.value)}
                rows={6}
                className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  safeCopy(JSON.stringify(locales, null, 2));
                  pushToast({ title: 'Copied', message: 'Locales JSON copied.', tone: 'default' });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy locales
              </button>
              <button
                type="button"
                onClick={() =>
                  pushToast({ title: 'Preview', message: 'Preview updated.', tone: 'success' })
                }
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Apply
              </button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 lg:col-span-5">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-slate-700" />
            <div className="text-sm font-black text-slate-900">Buyer card preview</div>
            <span className="ml-auto">
              <Badge tone="slate">{lang.toUpperCase()}</Badge>
            </span>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-slate-900">
                  {current.title || '(title missing)'}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  {draft.marketplace} · {draft.kind}
                </div>
              </div>
            </div>

            <div className="mt-3 text-sm font-black text-slate-900">
              {fmtMoney(draft.retailPrice, draft.currency)}
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-600 line-clamp-3">
              {current.description || '(description missing)'}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="slate">MOQ {draft.moq || '-'}</Badge>
              <Badge
                tone={
                  draft.status === 'Live' ? 'green' : draft.status === 'Paused' ? 'orange' : 'slate'
                }
              >
                {draft.status}
              </Badge>
              <span className="ml-auto">
                <Badge tone="slate">Quality {calcQuality(draft)}</Badge>
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => openSharePreview(draft, navigate)}
                className="rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                {labels.primaryCtaLabel}
              </button>
              <button
                type="button"
                onClick={() => openSharePreview(draft, navigate)}
                className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                {labels.secondaryCtaLabel}
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-orange-900">Premium localization</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">
                  Add regional copy and compliance notes per market.
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ApprovalPanel({
  draft,
  setDraft,
  policy,
  approvalRequired,
  pushToast,
  requestReview,
  approveNow,
  requestChanges,
  rejectNow,
}) {
  const ap = draft.approval || { required: true, state: 'Draft', reviewers: [], history: [] };
  const [comment, setComment] = useState('');

  const reviewersCatalog = ['Compliance Desk', 'Ops Manager', 'Finance', 'Team Lead', 'Legal'];

  const stateTone =
    ap.state === 'Approved'
      ? 'green'
      : ap.state === 'Rejected'
        ? 'danger'
        : ap.state === 'In Review'
          ? 'orange'
          : 'slate';

  const toggleReviewer = (name) => {
    setDraft((s) => {
      const cur = s.approval || ap;
      const list = Array.isArray(cur.reviewers) ? cur.reviewers : [];
      const exists = list.includes(name);
      const next = exists ? list.filter((x) => x !== name) : [...list, name];
      return { ...s, approval: { ...cur, reviewers: next } };
    });
  };

  const addComment = () => {
    const c = String(comment || '').trim();
    if (!c) return;
    setComment('');

    setDraft((s) => {
      const cur = s.approval || ap;
      const hist = Array.isArray(cur.history) ? cur.history : [];
      const nextHist = [
        {
          id: makeId('ap'),
          at: new Date().toISOString(),
          actor: 'Supplier',
          action: 'Comment',
          note: c,
        },
        ...hist,
      ].slice(0, 50);
      return { ...s, approval: { ...cur, history: nextHist } };
    });
    pushToast({ title: 'Comment added', message: 'Added to approval timeline.', tone: 'default' });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <GlassCard className="p-5 lg:col-span-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">Approval workflow</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              Enterprise-grade control for publishing decisions.
            </div>
          </div>
          <Badge tone={stateTone}>{ap.state}</Badge>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Review required</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Enforce maker-checker before publishing.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft((s) => ({
                  ...s,
                  approval: { ...(s.approval || ap), required: !(s.approval || ap).required },
                }));
              }}
              className={cx(
                'rounded-2xl border px-3 py-2 text-xs font-extrabold',
                approvalRequired
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100'
              )}
            >
              {approvalRequired ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-700" />
            <div className="text-sm font-black text-slate-900">Reviewers</div>
            <span className="ml-auto">
              <Badge tone="slate">{(ap.reviewers || []).length}</Badge>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {reviewersCatalog.map((r) => {
              const active = (ap.reviewers || []).includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleReviewer(r)}
                  className={cx(
                    'rounded-2xl border px-3 py-2 text-xs font-extrabold',
                    active
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950'
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={requestReview}
            className="inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <ChevronRight className="h-5 w-5" />
            Request review
          </button>
          <button
            type="button"
            onClick={approveNow}
            className="inline-flex items-center justify-center gap-2 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-800"
          >
            <CheckCheck className="h-5 w-5" />
            Approve
          </button>
          <button
            type="button"
            onClick={requestChanges}
            className="inline-flex items-center justify-center gap-2 rounded-3xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-extrabold text-orange-800"
          >
            <AlertTriangle className="h-5 w-5" />
            Request changes
          </button>
          <button
            type="button"
            onClick={rejectNow}
            className="inline-flex items-center justify-center gap-2 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700"
          >
            <X className="h-5 w-5" />
            Reject
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-slate-700" />
            <div className="text-sm font-black text-slate-900">Comment</div>
            <span className="ml-auto">
              <Badge tone="slate">Timeline</Badge>
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note for reviewers…"
              className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
            />
            <button
              type="button"
              onClick={addComment}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-700" />
            <div className="text-sm font-black text-slate-900">Approval timeline</div>
            <span className="ml-auto">
              <Badge tone="slate">{(ap.history || []).length}</Badge>
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {(ap.history || []).slice(0, 10).map((h) => (
              <div key={h.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center gap-2">
                  <Badge tone="slate">{h.actor}</Badge>
                  <div className="text-xs font-extrabold text-slate-700">{h.action}</div>
                  <span className="ml-auto text-[10px] font-extrabold text-slate-400">
                    {fmtTime(h.at)}
                  </span>
                </div>
                {h.note ? (
                  <div className="mt-2 text-xs font-semibold text-slate-600">{h.note}</div>
                ) : null}
              </div>
            ))}
            {(ap.history || []).length === 0 ? (
              <EmptyState title="No activity" message="Request review to start workflow." />
            ) : null}
          </div>

          <button
            type="button"
            onClick={() =>
              pushToast({
                title: 'Evidence export',
                message: 'Export evidence pack (demo).',
                tone: 'default',
              })
            }
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-extrabold text-slate-800"
          >
            <FileText className="h-5 w-5" />
            Export evidence pack
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-5 lg:col-span-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">Publishing policy</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              Trust checks that must pass for approval
            </div>
          </div>
          <Badge tone="slate">Policy</Badge>
        </div>

        <div className="mt-4 space-y-2">
          {policy.checks.map((c) => (
            <div
              key={c.key}
              className={cx(
                'rounded-3xl border p-4',
                c.pass ? 'border-emerald-200 bg-emerald-50/60' : 'border-orange-200 bg-orange-50/60'
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cx(
                    'grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900',
                    c.pass ? 'text-emerald-700' : 'text-orange-700'
                  )}
                >
                  {c.pass ? (
                    <CheckCheck className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={cx(
                      'text-sm font-black',
                      c.pass ? 'text-emerald-900' : 'text-orange-900'
                    )}
                  >
                    {c.label}
                  </div>
                  <div
                    className={cx(
                      'mt-1 text-xs font-semibold',
                      c.pass ? 'text-emerald-900/70' : 'text-orange-900/70'
                    )}
                  >
                    {c.note}
                  </div>
                </div>
                <Badge tone={c.pass ? 'green' : 'orange'}>{c.pass ? 'Pass' : 'Needs work'}</Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-700" />
            <div className="text-sm font-black text-slate-900">Trust score</div>
            <span className="ml-auto">
              <Badge
                tone={
                  policy.qualityScore >= 85
                    ? 'green'
                    : policy.qualityScore >= 65
                      ? 'orange'
                      : 'danger'
                }
              >
                {policy.qualityScore}
              </Badge>
            </span>
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-500">
            Derived from quality + compliance + media + localization (demo).
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export default function ListingsHubMergedPageV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedMode } = useThemeMode();
  const isDark = resolvedMode === 'dark';
  const pageBackground = isDark ? PAGE_BG_DARK : PAGE_BG_LIGHT;
  const labels = SELLER_LISTINGS_LABELS;

  const [toasts, setToasts] = useState([]);
  const pushToast = useCallback((t) => {
    const id = makeId('toast');
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  }, []);
  const dismissToast = (id) => setToasts((s) => s.filter((x) => x.id !== id));

  const submissionState = location.state?.listingSubmitted;
  const submissionSummary = location.state?.submissionSummary;

  useEffect(() => {
    if (!submissionState) return;
    pushToast({
      title: submissionSummary?.title
        ? `${submissionSummary.title} submitted`
        : 'Listing submitted',
      message: 'The new listing is now visible on this page.',
      tone: 'success',
    });
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `${location.pathname}${location.search}`);
    }
  }, [submissionState, submissionSummary, location.pathname, location.search, pushToast]);

  const [pipeline, setPipeline] = useState('All');
  const [query, setQuery] = useState('');
  const [marketplace, setMarketplace] = useState('All');
  const [kind, setKind] = useState('All');
  const [qualityMin, setQualityMin] = useState(0);
  const [rows, setRows] = useState([]);
  const [versionsById, setVersionsById] = useState({});

  const loadListings = async () => {
    const payload = await sellerBackendApi.getSellerWorkspaceListings();
    const records = Array.isArray(payload) ? payload : [];
    const nextRows = records.map((entry) => mapBackendListing(entry, calcQuality));
    const nextVersionsById = {};
    records.forEach((entry) => {
      const listing = mapBackendListing(entry, calcQuality);
      const versions = mapListingVersions(entry);
      nextVersionsById[listing.id] =
        versions.length > 0
          ? versions
          : [
              {
                id: `ver_${listing.id}_initial`,
                at: listing.updatedAt,
                actor: 'System',
                note: 'Initial version',
                snapshot: JSON.parse(JSON.stringify(listing)),
              },
            ];
    });
    setRows(nextRows);
    setVersionsById(nextVersionsById);
  };

  useEffect(() => {
    void loadListings();
  }, []);

  const counts = useMemo(() => {
    const map = { All: rows.length };
    ['Draft', 'In Review', 'Live', 'Paused', 'Rejected'].forEach((s) => {
      map[s] = rows.filter((r) => r.status === s).length;
    });
    return map;
  }, [rows]);

  const marketOptions = useMemo(
    () => ['All', ...Array.from(new Set(rows.map((r) => r.marketplace)))],
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (pipeline === 'All' ? true : r.status === pipeline))
      .filter((r) => (marketplace === 'All' ? true : r.marketplace === marketplace))
      .filter((r) => (kind === 'All' ? true : r.kind === kind))
      .filter((r) => (r.quality || 0) >= qualityMin)
      .filter((r) => {
        if (!q) return true;
        const hay = [r.id, r.title, r.marketplace, r.kind, r.status, r.category]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [rows, pipeline, marketplace, kind, qualityMin, query]);

  const [selected, setSelected] = useState({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const toggleAll = () => {
    const allSelected = filtered.length > 0 && filtered.every((r) => selected[r.id]);
    if (allSelected) {
      const next = { ...selected };
      filtered.forEach((r) => delete next[r.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      filtered.forEach((r) => (next[r.id] = true));
      setSelected(next);
    }
  };

  const [activeId, setActiveId] = useState(() => rows[0]?.id);
  useEffect(() => {
    if (!rows.find((r) => r.id === activeId)) setActiveId(rows[0]?.id);
  }, [rows]);

  const active = useMemo(() => rows.find((r) => r.id === activeId) || null, [rows, activeId]);

  const [scanState, setScanState] = useState({ running: false, last: null });
  const runComplianceScan = async (ids) => {
    if (!ids.length) return;
    setScanState({ running: true, last: null });
    pushToast({
      title: 'Compliance scan started',
      message: `Scanning ${ids.length} listing(s).`,
      tone: 'default',
    });
    await new Promise((r) => setTimeout(r, 900));

    const updated = rows
      .filter((r) => ids.includes(r.id))
      .map((r) => {
        const state = r.compliance?.state;
        const issues = r.compliance?.issues || [];
        const improved = state === 'warn' ? issues.slice(0, 1) : issues;
        const nextState = improved.length === 0 ? 'ok' : state === 'issue' ? 'issue' : 'warn';
        const next = {
          ...r,
          compliance: {
            ...r.compliance,
            state: nextState,
            issues: improved,
            lastScanAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        };
        next.quality = calcQuality(next);
        return next;
      });

    await Promise.all(
      updated.map((listing) =>
        sellerBackendApi.patchSellerWorkspaceListing(
          listing.id,
          buildListingPayload(listing, versionsById[listing.id] || [])
        )
      )
    );
    await loadListings();

    setScanState({ running: false, last: new Date().toISOString() });
    pushToast({ title: 'Scan completed', message: 'Results updated.', tone: 'success' });
  };

  const bulkUpdateStatus = async (nextStatus) => {
    if (!selectedIds.length) return;
    const updated = rows
      .filter((r) => selectedIds.includes(r.id))
      .map((r) => {
        const next = {
          ...r,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
        next.quality = calcQuality(next);
        return next;
      });
    await Promise.all(
      updated.map((listing) =>
        sellerBackendApi.patchSellerWorkspaceListing(
          listing.id,
          buildListingPayload(listing, versionsById[listing.id] || [])
        )
      )
    );
    await loadListings();
    setSelected({});
    pushToast({
      title: 'Bulk update',
      message: `${selectedIds.length} set to ${nextStatus}.`,
      tone: 'success',
    });
  };

  const bulkDuplicate = async () => {
    if (!selectedIds.length) return;
    const copies = rows.filter((r) => selectedIds.includes(r.id)).map((r) => {
      const copy = {
        ...JSON.parse(JSON.stringify(r)),
        title: `${r.title} (Copy)`,
        status: 'Draft',
        updatedAt: new Date().toISOString(),
      };
      copy.quality = calcQuality(copy);
      const versions = [
        {
          id: makeId('ver'),
          at: copy.updatedAt,
          actor: 'Supplier',
          note: 'Initial version',
          snapshot: JSON.parse(JSON.stringify(copy)),
        },
      ];
      return sellerBackendApi.createSellerWorkspaceListing(buildListingPayload(copy, versions));
    });
    await Promise.all(copies);
    await loadListings();
    setSelected({});
    pushToast({ title: 'Duplicated', message: 'Copies created as Draft.', tone: 'success' });
  };

  const [editOpen, setEditOpen] = useState(false);

  const openEdit = (id) => {
    setActiveId(id);
    setEditOpen(true);
  };

  const saveListing = async (updated) => {
    const nextListing = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    nextListing.quality = calcQuality(nextListing);
    const current = versionsById[updated.id] || [];
    const nextVersions = [
      {
        id: makeId('ver'),
        at: nextListing.updatedAt,
        actor: 'Supplier',
        note: 'Saved changes',
        snapshot: JSON.parse(JSON.stringify(nextListing)),
      },
      ...current,
    ].slice(0, 20);
    await sellerBackendApi.patchSellerWorkspaceListing(
      updated.id,
      buildListingPayload(nextListing, nextVersions)
    );
    await loadListings();
  };

  const rollbackDraftInEditor = (snapshot) => {
    void saveListing({
      ...snapshot,
      updatedAt: new Date().toISOString(),
      quality: calcQuality(snapshot),
    });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: pageBackground,
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  {labels.hubTitle}
                </div>
                <Badge tone="slate">/listings</Badge>
                <Badge tone="slate">v2</Badge>
                <Badge tone="slate">AI + Variants + Localization + Approvals</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                {labels.hubSubtitle}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: 'Export',
                    message: 'Wire export to CSV/XLSX.',
                    tone: 'default',
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Export
              </button>

              <button
                type="button"
                onClick={() => navigate('/listings/new')}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                {labels.newListingLabel}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { k: 'All', label: 'All' },
              { k: 'Draft', label: 'Draft' },
              { k: 'In Review', label: 'In Review' },
              { k: 'Live', label: 'Live' },
              { k: 'Paused', label: 'Paused' },
              { k: 'Rejected', label: 'Rejected' },
            ].map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setPipeline(t.k)}
                className={cx(
                  'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                  pipeline === t.k
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                )}
              >
                {t.label}
                <span
                  className={cx(
                    'rounded-full px-2 py-0.5 text-[10px]',
                    pipeline === t.k ? 'bg-white dark:bg-slate-900 text-slate-700' : 'bg-slate-100 text-slate-700'
                  )}
                >
                  {counts[t.k] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <GlassCard className="p-4">
          <div className="grid gap-2 md:grid-cols-12 md:items-center">
            <div className="relative md:col-span-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by ID, title, status"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div className="md:col-span-2">
              <div className="relative">
                <select
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {marketOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="relative">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {['All', 'Product', 'Service'].map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <div className="text-xs font-extrabold text-slate-700">Quality ≥</div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={qualityMin}
                  onChange={(e) => setQualityMin(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs font-black text-slate-600">{qualityMin}</div>
              </div>
            </div>

            <div className="md:col-span-12 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setMarketplace('All');
                  setKind('All');
                  setQualityMin(0);
                  pushToast({ title: 'Filters cleared', tone: 'default' });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>
              <div className="ml-auto flex items-center gap-2">
                <Badge tone="slate">{filtered.length} results</Badge>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Bulk actions */}
        {selectedIds.length ? (
          <div className="mt-3 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800">
                <CheckCheck className="h-4 w-4" />
                {selectedIds.length} selected
              </div>

              <button
                type="button"
                onClick={() => bulkUpdateStatus('Live')}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Publish
              </button>

              <button
                type="button"
                onClick={() => bulkUpdateStatus('Paused')}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
              >
                <PauseCircle className="h-4 w-4" />
                Pause
              </button>

              <button
                type="button"
                onClick={bulkDuplicate}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>

              <button
                type="button"
                onClick={() => runComplianceScan(selectedIds)}
                disabled={scanState.running}
                className={cx(
                  'ml-auto inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition',
                  scanState.running
                    ? 'cursor-not-allowed border-slate-200 text-slate-400'
                    : 'border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:bg-slate-950'
                )}
              >
                <Scan className="h-4 w-4" />
                Compliance scan
              </button>

              <button
                type="button"
                onClick={() => setSelected({})}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Clear selection
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Table */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">{labels.listingsLabel}</div>
                    <Badge tone="slate">Seller core</Badge>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                  Click a row to load full details on the right
                  </div>
                </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-1">
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every((r) => selected[r.id])}
                      onChange={() => toggleAll()}
                      label="Select all"
                    />
                  </div>
                  <div className="col-span-4">Title</div>
                  <div className="col-span-1">Type</div>
                  <div className="col-span-2">Marketplace</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Quality</div>
                  <div className="col-span-1">Stock</div>
                  <div className="col-span-1">Updated</div>
                  <div className="col-span-1">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((r) => {
                    const isActive = r.id === activeId;
                    const isChecked = !!selected[r.id];
                    return (
                      <div
                        key={r.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveId(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setActiveId(r.id);
                        }}
                        className={cx(
                          'grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold transition',
                          isActive ? 'bg-emerald-50/60' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                        )}
                      >
                        <div className="col-span-1">
                          <Checkbox
                            checked={isChecked}
                            onChange={(v) => setSelected((s) => ({ ...s, [r.id]: v }))}
                            label={`Select ${r.id}`}
                          />
                        </div>

                        <div className="col-span-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate font-extrabold text-slate-900">{r.title}</div>
                            <Badge tone={complianceTone(r.compliance?.state)}>
                              {String(r.compliance?.state || '-').toUpperCase()}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Tag className="h-3.5 w-3.5" />
                              {r.id}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Package className="h-3.5 w-3.5" />
                              {fmtMoney(r.retailPrice, r.currency)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5" />
                              {r.translations} langs
                            </span>
                          </div>
                        </div>

                        <div className="col-span-1">{r.kind}</div>
                        <div className="col-span-2">{r.marketplace}</div>
                        <div className="col-span-1">
                          <Badge
                            tone={
                              r.status === 'Live'
                                ? 'green'
                                : r.status === 'Paused'
                                  ? 'orange'
                                  : 'slate'
                            }
                          >
                            {r.status}
                          </Badge>
                        </div>
                        <div className="col-span-1">
                          <ScorePill score={r.quality} />
                        </div>
                        <div className="col-span-1">{r.kind === 'Product' ? r.stock : '-'}</div>
                        <div className="col-span-1 text-slate-500">{fmtTime(r.updatedAt)}</div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(r.id);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        title={labels.emptyTitle}
                        message={labels.emptyMessage}
                        cta={{
                          label: labels.newListingLabel,
                          onClick: () => navigate('/listings/new'),
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Right panel */}
          <div className="lg:col-span-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">{labels.selectedListingLabel}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Full details, actions and health signals
                  </div>
                </div>
                <Badge tone="slate">Premium</Badge>
              </div>

              {!active ? (
                <div className="mt-4">
                  <EmptyState title="Select a listing" message="Click a row to load all listing details here." />
                </div>
              ) : (
                <InlineListingRail
                  listing={active}
                  versions={versionsById[active.id] || []}
                  onEdit={() => openEdit(active.id)}
                  onScan={() => runComplianceScan([active.id])}
                  pushToast={pushToast}
                  labels={labels}
                />
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <ListingEditDrawer
        open={editOpen}
        listing={active}
        onClose={() => setEditOpen(false)}
        onSave={saveListing}
        pushToast={pushToast}
        versions={active ? versionsById[active.id] || [] : []}
        onRollback={rollbackDraftInEditor}
      />

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function MiniMetric({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className={cx(
            'h-2 rounded-full',
            tone === 'green'
              ? 'bg-emerald-500'
              : tone === 'orange'
                ? 'bg-orange-500'
                : 'bg-rose-500'
          )}
          style={{ width: `${clamp(value, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}
