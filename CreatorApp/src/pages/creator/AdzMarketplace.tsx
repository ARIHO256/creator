
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { PageHeader } from "../../components/PageHeader";
import AdBuilder from "./AdBuilder";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Copy,
  ExternalLink,
  Filter,
  Heart,
  Info,
  LayoutGrid,
  Link2,
  Minus,
  Package,
  Play,
  Plus,
  Search,
  Share2,
  ShoppingCart,
  Sparkles,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";

/**
 * Adz Marketplace — Regenerated (Premium)
 * --------------------------------------
 * Buyer-preview-first marketplace for Shoppable Adz.
 *
 * Regeneration goals:
 * - Match the new Shoppable Ad preview rules (hero overlay countdown+save, cart/share top-right, cart badge increments, phone-sized scrollable preview)
 * - Support Products + Services, with Retail + Wholesale modes (Wholesale mainly for product offers)
 * - Offer posters: 500×500 (aspect-square), 2 offers per row
 * - Hero media: 1920×1080 (aspect 16:9)
 * - Cart (not “checkout”) dock inside preview, showing all added offers + mode badges and wholesale constraints (MOQ, step)
 * - Viewer (hero + offer) modal/fullscreen with overlays: Buy/Add, stock warnings, countdown, love/share + mode toggle (if applicable)
 *
 * Notes:
 * - This is a premium UI shell with mock data. Wire to your real API + routing as needed.
 * - Supplier naming is used (not Supplier).
 */

const ORANGE = "#f77f00";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type ViewerMode = "fullscreen" | "modal";
type CountdownState = "upcoming" | "live" | "ended";

type SellingMode = "RETAIL" | "WHOLESALE";
type OfferType = "PRODUCT" | "SERVICE";

type WholesaleTier = { minQty: number; unitPrice: number };
type WholesalePricing = {
  moq: number; // minimum order quantity
  step: number; // increments
  tiers: WholesaleTier[]; // minQty → unit price
  leadTimeLabel?: string;
  businessOnly?: boolean;
};

type Offer = {
  id: string;
  type: OfferType;
  name: string;

  // Retail price (default display)
  price: number;
  basePrice?: number;
  currency: "UGX" | "USD";

  // Stock mainly applies to retail products; services can use -1
  stockLeft: number; // -1 unlimited
  sold: number;

  // Media
  posterUrl: string; // 500×500 recommended (square)
  videoUrl?: string; // item video
  desktopMode?: ViewerMode; // viewer preference

  // Selling modes (products mainly)
  sellingModes?: SellingMode[]; // e.g., ["RETAIL","WHOLESALE"]
  defaultSellingMode?: SellingMode; // default for buyers
  wholesale?: WholesalePricing;
};

type Creator = { name: string; handle: string; avatarUrl: string; verified?: boolean };
type Supplier = { name: string; category: string; logoUrl: string };

type AdStatus = "Draft" | "Scheduled" | "Generated";

type Ad = {
  id: string;
  rank: number;
  status: AdStatus;

  campaignName: string;
  campaignSubtitle: string;

  supplier: Supplier;
  creator: Creator;

  platforms: string[];
  startISO: string;
  endISO: string;

  heroImageUrl: string; // 1920×1080 recommended
  heroIntroVideoUrl?: string;
  heroIntroVideoPosterUrl?: string;
  heroDesktopMode?: ViewerMode;

  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;

  offers: Offer[];

  kpis: Array<{ label: string; value: string }>;
};

type CartKey = string; // `${offerId}::${mode}`
type CartState = Record<CartKey, number>;

function cartKey(offerId: string, mode: SellingMode) {
  return `${offerId}::${mode}`;
}
function parseCartKey(key: string): { offerId: string; mode: SellingMode } {
  const parts = key.split("::");
  const offerId = parts[0] || "";
  const mode = (parts[1] as SellingMode) || "RETAIL";
  return { offerId, mode };
}

function enabledModesForOffer(o: Offer): SellingMode[] {
  if (o.type === "SERVICE") return ["RETAIL"];
  const ms = (o.sellingModes || []).filter(Boolean);
  return ms.length ? ms : ["RETAIL"];
}
function defaultModeForOffer(o: Offer): SellingMode {
  const ms = enabledModesForOffer(o);
  return o.defaultSellingMode && ms.includes(o.defaultSellingMode) ? o.defaultSellingMode : ms[0];
}
function wholesaleUnitPrice(o: Offer, qty: number): number | null {
  if (o.type !== "PRODUCT" || !o.wholesale || !o.wholesale.tiers?.length) return null;
  const tiers = [...o.wholesale.tiers].sort((a, b) => a.minQty - b.minQty);
  let unit = tiers[0].unitPrice;
  for (const t of tiers) if (qty >= t.minQty) unit = t.unitPrice;
  return unit;
}
function unitPriceFor(o: Offer, mode: SellingMode, qty: number): number {
  if (mode === "WHOLESALE") {
    return wholesaleUnitPrice(o, qty) ?? o.price;
  }
  return o.price;
}
function lineTotalFor(o: Offer, mode: SellingMode, qty: number): number {
  return unitPriceFor(o, mode, qty) * qty;
}
function nextQtyOnAdd(o: Offer, mode: SellingMode, currentQty: number): number {
  if (mode === "WHOLESALE" && o.type === "PRODUCT" && o.wholesale) {
    if (currentQty <= 0) return o.wholesale.moq;
    return currentQty + o.wholesale.step;
  }
  return currentQty + 1;
}
function nextQtyOnDec(o: Offer, mode: SellingMode, currentQty: number): number {
  if (mode === "WHOLESALE" && o.type === "PRODUCT" && o.wholesale) {
    const next = currentQty - o.wholesale.step;
    if (next < o.wholesale.moq) return 0; // remove line if below MOQ
    return next;
  }
  const next = currentQty - 1;
  return next < 0 ? 0 : next;
}

function money(currency: "UGX" | "USD", amount: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
function fmtLocal(d: Date) {
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function computeCountdownState(nowMs: number, startMs: number, endMs: number): CountdownState {
  if (nowMs < startMs) return "upcoming";
  if (nowMs >= startMs && nowMs <= endMs) return "live";
  return "ended";
}
function countdownParts(nowMs: number, startMs: number, endMs: number) {
  const st = computeCountdownState(nowMs, startMs, endMs);
  const target = st === "upcoming" ? startMs : st === "live" ? endMs : endMs;
  const diff = Math.max(0, target - nowMs);
  const s = Math.floor(diff / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return { st, hh, mm, ss };
}

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const update = () => setM(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return m;
}

function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "brand" | "good" | "warn" | "bad";
  children: React.ReactNode;
}) {
  const cls =
    tone === "brand"
      ? "bg-orange-500 text-white border-transparent"
      : tone === "good"
        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
        : tone === "warn"
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300"
          : tone === "bad"
            ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300"
            : "bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-800 dark:text-slate-300";
  return (
    <span
      className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-extrabold", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({
  tone = "neutral",
  left,
  className,
  disabled,
  onClick,
  children,
  title,
}: {
  tone?: "primary" | "neutral" | "ghost";
  left?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-extrabold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "ghost"
        ? "border-transparent bg-transparent hover:bg-white/10 text-white"
        : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-900 dark:text-neutral-100";
  return (
    <button
      type="button"
      className={cx(base, cls, className)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {left}
      {children}
    </button>
  );
}

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  mode: ViewerMode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (open) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="absolute inset-0 overflow-hidden bg-white dark:bg-slate-950 shadow-2xl flex flex-col transition-colors"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-neutral-200 dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{"Viewer"}</div>
          </div>
          <button
            type="button"
            className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100 hover:bg-neutral-200 dark:hover:bg-slate-800 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3 md:p-4">{children}</div>
      </div>
    </div>
  );
}

function PlayOverlayButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute inset-0 grid place-items-center"
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-white/85 shadow-md hover:bg-white">
        <Play className="h-6 w-6 text-neutral-900" />
      </span>
    </button>
  );
}

function ModeToggle({
  modes,
  value,
  onChange,
  compact,
}: {
  modes: SellingMode[];
  value: SellingMode;
  onChange: (m: SellingMode) => void;
  compact?: boolean;
}) {
  if (modes.length <= 1) return null;
  const btn = (m: SellingMode) => (
    <button
      key={m}
      type="button"
      onClick={() => onChange(m)}
      className={cx(
        "rounded-xl px-3 py-1.5 text-[11px] font-extrabold border transition",
        value === m ? "border-transparent text-white" : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-700",
      )}
      style={value === m ? { background: ORANGE } : undefined}
      title={m === "WHOLESALE" ? "Wholesale mode (MOQ / tiers may apply)" : "Retail mode"}
    >
      {m === "WHOLESALE" ? "Wholesale" : "Retail"}
    </button>
  );

  return (
    <div className={cx("flex items-center gap-2", compact && "gap-1")}>
      {modes.map(btn)}
    </div>
  );
}

/** ------------------------------ Viewer ------------------------------ */

type ViewerContext =
  | { kind: "hero"; title: string; videoUrl: string; posterUrl?: string; desktopMode?: ViewerMode }
  | { kind: "offer"; title: string; videoUrl: string; posterUrl?: string; desktopMode?: ViewerMode; offerId: string };

function MediaViewer({
  open,
  onClose,
  ctx,
  mode,
  countdownState,
  countdownLabel,
  stockLabel,
  priceLabel,
  ctaPrimary,
  ctaSecondary,
  onBuyNow,
  onAddToCart,
  onLove,
  loved,
  onShare,
  heroOffers,
  selectedHeroOfferId,
  onSelectHeroOfferId,
  // retail/wholesale
  modeOptions,
  activeMode,
  onChangeMode,
  modeMetaLabel,
}: {
  open: boolean;
  onClose: () => void;
  ctx: ViewerContext | null;
  mode: ViewerMode;
  countdownState: CountdownState;
  countdownLabel: string;
  stockLabel?: { tone: "warn" | "bad" | "neutral"; text: string } | null;
  priceLabel?: string;
  ctaPrimary: string;
  ctaSecondary: string;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onLove: () => void;
  loved: boolean;
  onShare: () => void;

  heroOffers?: Array<{ id: string; name: string; posterUrl: string; price: string; stockNote: string; kindLabel: string }>;
  selectedHeroOfferId?: string;
  onSelectHeroOfferId?: (id: string) => void;

  modeOptions?: SellingMode[];
  activeMode?: SellingMode;
  onChangeMode?: (m: SellingMode) => void;
  modeMetaLabel?: string;
}) {
  if (!ctx) return null;

  return (
    <Modal open={open} onClose={onClose} title={ctx.title} mode={mode}>
      <div className={cx("relative overflow-hidden rounded-3xl bg-black", mode === "fullscreen" ? "h-[70vh] md:h-[78vh]" : "aspect-video")}>
        <video src={ctx.videoUrl} poster={ctx.posterUrl} controls playsInline autoPlay className="absolute inset-0 h-full w-full object-contain bg-black" />

        {/* Overlays */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <Pill tone="brand">
              <Zap className="h-3.5 w-3.5" />
              Shoppable Adz
            </Pill>
            <Pill tone={countdownState === "live" ? "brand" : countdownState === "upcoming" ? "good" : "neutral"}>
              <Timer className="h-3.5 w-3.5" />
              {countdownLabel}
            </Pill>
            {stockLabel ? (
              <Pill tone={stockLabel.tone === "bad" ? "bad" : stockLabel.tone === "warn" ? "warn" : "neutral"}>
                <Info className="h-3.5 w-3.5" />
                {stockLabel.text}
              </Pill>
            ) : null}
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-2">
            <span className="pointer-events-auto">
              <Btn
                tone="ghost"
                onClick={onLove}
                left={<Heart className={cx("h-4 w-4", loved && "fill-red-500 text-red-500")} />}
              >
                {loved ? "Loved" : "Love"}
              </Btn>
            </span>
            <span className="pointer-events-auto">
              <Btn tone="ghost" onClick={onShare} left={<Share2 className="h-4 w-4" />}>
                Share
              </Btn>
            </span>
          </div>

          {/* Bottom info + mode + CTA */}
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
            {priceLabel ? (
              <div className="mb-2 text-white">
                <div className="text-xs text-white/80">Selected</div>
                <div className="text-base md:text-lg font-extrabold">{priceLabel}</div>
                {modeMetaLabel ? <div className="mt-1 text-[11px] text-white/75">{modeMetaLabel}</div> : null}
              </div>
            ) : null}

            {/* Mode toggle */}
            {modeOptions && activeMode && onChangeMode && modeOptions.length > 1 ? (
              <div className="mb-3 pointer-events-auto">
                <div className="text-xs font-bold text-white/80">Mode</div>
                <div className="mt-2">
                  <ModeToggle modes={modeOptions} value={activeMode} onChange={onChangeMode} />
                </div>
              </div>
            ) : null}

            {/* Hero: pick item */}
            {ctx.kind === "hero" && heroOffers?.length ? (
              <div className="mb-3">
                <div className="text-xs font-bold text-white/80">Choose item</div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {heroOffers.map((p) => {
                    const active = p.id === selectedHeroOfferId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectHeroOfferId?.(p.id)}
                        className={cx(
                          "pointer-events-auto flex min-w-[240px] items-center gap-2 rounded-2xl border px-2.5 py-2 text-left",
                          active ? "border-white bg-white/15" : "border-white/20 bg-white/10 hover:bg-white/15",
                        )}
                      >
                        <img src={p.posterUrl} className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10" alt={p.name} />
                        <div className="min-w-0 text-white">
                          <div className="truncate text-sm font-extrabold">{p.name}</div>
                          <div className="truncate text-xs text-white/80">
                            {p.kindLabel} · {p.price} · {p.stockNote}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-[11px] text-white/70">
                  The hero viewer lets buyers choose the exact item before {ctaPrimary}/{ctaSecondary}.
                </div>
              </div>
            ) : null}

            <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row">
              <Btn tone="primary" onClick={onBuyNow} left={<Zap className="h-4 w-4" />} className="w-full">
                {ctaPrimary}
              </Btn>
              <Btn tone="neutral" onClick={onAddToCart} left={<ShoppingCart className="h-4 w-4" />} className="w-full">
                {ctaSecondary}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** ------------------------------ Phone preview ------------------------------ */

function CountdownPill({ startsAt, endsAt }: { startsAt: Date; endsAt: Date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const { st, hh, mm, ss } = countdownParts(now, startsAt.getTime(), endsAt.getTime());
  const label = st === "upcoming" ? "Starts in" : st === "live" ? "Ends in" : "Ended";
  return (
    <Pill tone="brand">
      <Timer className="h-3.5 w-3.5" />
      {label} {pad2(hh)}:{pad2(mm)}:{pad2(ss)}
    </Pill>
  );
}

/** Full Shoppable Ad Preview (buyer-first; phone-sized; internal scroll) */
function ShoppableAdPreview({
  ad,
  cart,
  modeByOffer,
  onSetOfferMode,
  shareEnabled,
  onPlayHero,
  onPlayOffer,
  onBuy,
  onAdd,
  onDecCart,
  onClearCart,
  onShare,
}: {
  ad: Ad;
  cart: CartState;
  modeByOffer: Record<string, SellingMode>;
  onSetOfferMode: (offerId: string, mode: SellingMode) => void;

  shareEnabled?: boolean;
  onPlayHero: () => void;
  onPlayOffer: (offerId: string) => void;
  onBuy: (offerId: string, mode: SellingMode) => void;
  onAdd: (offerId: string, mode: SellingMode) => void;
  onDecCart: (offerId: string, mode: SellingMode) => void;
  onClearCart: () => void;
  onShare: () => void;
}) {
  const startsAt = useMemo(() => new Date(ad.startISO), [ad.startISO]);
  const endsAt = useMemo(() => new Date(ad.endISO), [ad.endISO]);

  const state = computeCountdownState(Date.now(), startsAt.getTime(), endsAt.getTime());

  const [saved, setSaved] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const cartLines = useMemo(() => {
    const byId = new Map(ad.offers.map((o) => [o.id, o]));
    return Object.entries(cart)
      .filter(([_k, qty]) => qty > 0)
      .map(([_k, qty]) => {
        const { offerId, mode } = parseCartKey(_k);
        const offer = byId.get(offerId);
        if (!offer) return null;
        return { offer, mode, qty };
      })
      .filter(Boolean) as Array<{ offer: Offer; mode: SellingMode; qty: number }>;
  }, [cart, ad.offers]);

  const cartCount = useMemo(() => cartLines.reduce((s, l) => s + l.qty, 0), [cartLines]);

  const currencySet = useMemo(() => new Set(cartLines.map((l) => l.offer.currency)), [cartLines]);
  const multiCurrency = currencySet.size > 1;
  const currency = cartLines[0]?.offer.currency || "USD";
  const cartTotal = useMemo(() => {
    if (multiCurrency) return 0;
    return cartLines.reduce((s, l) => s + lineTotalFor(l.offer, l.mode, l.qty), 0);
  }, [cartLines, multiCurrency]);

  return (
    <div className="w-full">
      {/* Phone-like frame */}
      <div className="mx-auto w-full max-w-[420px] rounded-[32px] bg-neutral-900 dark:bg-black p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition-colors">
        <div className="relative overflow-hidden rounded-[28px] bg-neutral-50 dark:bg-slate-950 transition-colors">
          <div className="h-[760px] flex flex-col">
            {/* Top bar (share + cart are top-right, as requested) */}
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-neutral-200 dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between gap-2 px-3 py-3">
                <button type="button" className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2 hover:bg-white dark:hover:bg-slate-800 text-neutral-900 dark:text-slate-100 transition-colors" aria-label="Back">
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1 text-center font-bold">
                  <div className="truncate text-[13px] font-extrabold text-neutral-900 dark:text-slate-100">{ad.campaignName}</div>
                  <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400 font-semibold">
                    Shared by {ad.creator.handle} · {ad.platforms.join(", ")}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={cx(
                      "rounded-xl border border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2 hover:bg-white dark:hover:bg-slate-800 text-neutral-900 dark:text-slate-100 transition-colors",
                      !shareEnabled && "opacity-50 cursor-not-allowed",
                    )}
                    aria-label="Share"
                    onClick={() => (shareEnabled ? onShare() : undefined)}
                    title={shareEnabled ? "Share" : "Generate first to enable share"}
                    disabled={!shareEnabled}
                  >
                    <Share2 className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    className="relative rounded-xl border border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2 hover:bg-white dark:hover:bg-slate-800 text-neutral-900 dark:text-slate-100 transition-colors"
                    aria-label="Open cart"
                    onClick={() => setCartOpen((v) => !v)}
                    title="Cart"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount ? (
                      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-[#f77f00] text-white text-[11px] font-extrabold grid place-items-center">
                        {cartCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-4 pb-6 scrollbar-hide">
              {/* Hero (1920×1080 = 16:9) */}
              <header className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors">
                <div className="relative aspect-[16/9] bg-neutral-200">
                  <img src={ad.heroImageUrl} alt="Hero" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

                  {ad.heroIntroVideoUrl ? (
                    <div className="absolute inset-0">
                      <PlayOverlayButton onClick={onPlayHero} label="Play intro video" />
                    </div>
                  ) : null}

                  {/* Countdown + status INSIDE hero (requested) */}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <Pill tone="brand">
                      <Zap className="h-3.5 w-3.5" />
                      Shoppable Adz
                    </Pill>
                    <CountdownPill startsAt={startsAt} endsAt={endsAt} />
                    {state === "live" ? (
                      <Pill tone="good">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Live
                      </Pill>
                    ) : state === "upcoming" ? (
                      <Pill tone="warn">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Scheduled
                      </Pill>
                    ) : (
                      <Pill tone="neutral">
                        <Timer className="h-3.5 w-3.5" />
                        Ended
                      </Pill>
                    )}
                  </div>

                  {/* Save icon INSIDE hero (requested) */}
                  <div className="absolute right-3 top-3">
                    <button
                      type="button"
                      onClick={() => setSaved((s) => !s)}
                      className={cx(
                        "rounded-full p-2 backdrop-blur ring-1",
                        saved ? "bg-white/35 ring-white/40" : "bg-white/20 ring-white/30 hover:bg-white/30",
                      )}
                      aria-label="Save"
                      title={saved ? "Saved" : "Save"}
                    >
                      <Heart className={cx("h-4 w-4 text-white", saved && "fill-white")} />
                    </button>
                  </div>
                </div>

                {/* Campaign-focused details */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{ad.campaignName}</div>
                      <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                        {ad.campaignSubtitle} · Supplier: <span className="font-bold text-neutral-900 dark:text-slate-100">{ad.supplier.name}</span> · {ad.supplier.category}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Pill tone="neutral">{ad.offers.length} items</Pill>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600">
                    <span className="rounded-full bg-neutral-50 px-3 py-1 ring-1 ring-neutral-200">
                      Starts: <span className="font-bold text-neutral-900">{fmtLocal(startsAt)}</span>
                    </span>
                    <span className="rounded-full bg-neutral-50 px-3 py-1 ring-1 ring-neutral-200">
                      Ends: <span className="font-bold text-neutral-900">{fmtLocal(endsAt)}</span>
                    </span>
                  </div>
                </div>
              </header>

              {/* Offers grid (2 per row; 500×500) */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {ad.offers.map((o) => {
                  const outOfStock = state === "live" && o.stockLeft === 0;
                  const lowStock = state === "live" && o.stockLeft > 0 && o.stockLeft <= 5;
                  const discount = o.basePrice && o.basePrice > o.price ? Math.round((1 - o.price / o.basePrice) * 100) : 0;

                  const modes = enabledModesForOffer(o);
                  const activeMode = modeByOffer[o.id] || defaultModeForOffer(o);
                  const unit = unitPriceFor(o, activeMode, o.type === "PRODUCT" && o.wholesale ? o.wholesale.moq : 1);
                  const priceLine =
                    o.type === "SERVICE"
                      ? money(o.currency, o.price)
                      : activeMode === "WHOLESALE"
                        ? `${money(o.currency, unit)}/unit`
                        : money(o.currency, o.price);

                  const metaLine =
                    o.type === "PRODUCT" && activeMode === "WHOLESALE" && o.wholesale
                      ? `MOQ ${o.wholesale.moq} · Step ${o.wholesale.step}${o.wholesale.leadTimeLabel ? ` · ${o.wholesale.leadTimeLabel}` : ""}`
                      : o.type === "SERVICE"
                        ? "Service offer"
                        : "Retail offer";

                  return (
                    <article key={o.id} className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition">
                      <div className="relative aspect-square bg-neutral-200">
                        <img src={o.posterUrl} alt={o.name} className="h-full w-full object-cover" />

                        {o.videoUrl ? (
                          <div className="absolute inset-0">
                            <div className="absolute inset-0 bg-black/10" />
                            <PlayOverlayButton onClick={() => onPlayOffer(o.id)} label={`Play ${o.name}`} />
                          </div>
                        ) : null}

                        <div className="absolute left-2 top-2 flex flex-wrap gap-2">
                          {discount > 0 ? <Pill tone="brand">-{discount}%</Pill> : null}
                          <Pill tone="neutral">{o.type === "SERVICE" ? "Service" : "Product"}</Pill>
                        </div>

                        <div className="absolute right-2 top-2 flex flex-col items-end gap-2">
                          {outOfStock ? (
                            <Pill tone="bad">
                              <Info className="h-3.5 w-3.5" />
                              Sold out
                            </Pill>
                          ) : lowStock ? (
                            <Pill tone="warn">
                              <Info className="h-3.5 w-3.5" />
                              Low stock
                            </Pill>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="line-clamp-2 text-sm font-extrabold text-neutral-900">{o.name}</div>

                        {/* Mode toggle (products that support wholesale) */}
                        {o.type === "PRODUCT" && modes.length > 1 ? (
                          <div className="mt-2">
                            <ModeToggle
                              modes={modes}
                              value={activeMode}
                              onChange={(m) => onSetOfferMode(o.id, m)}
                              compact
                            />
                          </div>
                        ) : null}

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-sm font-extrabold text-neutral-900">{priceLine}</div>
                          {o.basePrice && o.basePrice > o.price && activeMode !== "WHOLESALE" ? (
                            <div className="text-xs font-semibold text-neutral-500 line-through">{money(o.currency, o.basePrice)}</div>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-600">{metaLine}</div>

                        <div className="mt-3 grid gap-2">
                          <Btn tone="primary" left={<Zap className="h-4 w-4" />} onClick={() => onBuy(o.id, activeMode)}>
                            {ad.ctaPrimaryLabel}
                          </Btn>
                          <Btn
                            tone="neutral"
                            left={<ShoppingCart className="h-4 w-4" />}
                            onClick={() => onAdd(o.id, activeMode)}
                            disabled={outOfStock}
                            title={outOfStock ? "Sold out" : undefined}
                          >
                            {ad.ctaSecondaryLabel}
                          </Btn>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Cart dock (replaces checkout dock) */}
            <div className="border-t border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 py-3 transition-colors">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setCartOpen((v) => !v)}
                aria-label="Toggle cart"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <ShoppingCart className="h-5 w-5 text-neutral-800 dark:text-slate-200" />
                    {cartCount ? (
                      <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-[#f77f00] text-white text-[11px] font-extrabold grid place-items-center">
                        {cartCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-xs font-bold text-neutral-700 dark:text-slate-300">Cart</div>
                    <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">
                      {cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"} added` : "No items yet"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[11px] text-neutral-500 dark:text-slate-400">{multiCurrency ? "Multiple currencies" : "Subtotal"}</div>
                    <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{multiCurrency ? "—" : money(currency, cartTotal)}</div>
                  </div>
                  <ChevronDown className={cx("h-5 w-5 text-neutral-600 dark:text-slate-400 transition", cartOpen && "rotate-180")} />
                </div>
              </button>

              {cartOpen ? (
                <div className="mt-3 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                  {cartLines.length ? (
                    <div className="max-h-[220px] overflow-auto pr-1">
                      <div className="space-y-2">
                        {cartLines.map(({ offer, mode, qty }) => {
                          const unit = unitPriceFor(offer, mode, qty);
                          const line = lineTotalFor(offer, mode, qty);
                          const modeLabel = mode === "WHOLESALE" ? "Wholesale" : "Retail";
                          const moqNote = mode === "WHOLESALE" && offer.wholesale ? `MOQ ${offer.wholesale.moq}` : undefined;
                          return (
                            <div key={cartKey(offer.id, mode)} className="rounded-xl bg-neutral-50 dark:bg-slate-950 p-2 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-extrabold text-neutral-900 dark:text-slate-100">{offer.name}</div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <Pill tone="neutral">{modeLabel}</Pill>
                                    {moqNote ? <Pill tone="warn">{moqNote}</Pill> : null}
                                    <div className="text-[11px] text-neutral-600 dark:text-slate-400">
                                      {money(offer.currency, unit)}{mode === "WHOLESALE" && offer.type === "PRODUCT" ? " / unit" : ""} ·{" "}
                                      <span className="font-bold text-neutral-900 dark:text-slate-100">{money(offer.currency, line)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="rounded-lg border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-900 dark:text-slate-100 transition-colors"
                                    onClick={() => onDecCart(offer.id, mode)}
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <div className="w-10 text-center text-xs font-extrabold text-neutral-900 dark:text-slate-100">{qty}</div>
                                  <button
                                    type="button"
                                    className="rounded-lg border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-900 dark:text-slate-100 transition-colors"
                                    onClick={() => onAdd(offer.id, mode)}
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {mode === "WHOLESALE" && offer.wholesale ? (
                                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                                  Tier pricing applies automatically. Step: <span className="font-bold text-neutral-900 dark:text-slate-100">{offer.wholesale.step}</span>
                                  {offer.wholesale.leadTimeLabel ? (
                                    <>
                                      {" "}
                                      · Lead time: <span className="font-bold text-neutral-900 dark:text-slate-100">{offer.wholesale.leadTimeLabel}</span>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-neutral-50 dark:bg-slate-950 p-3 text-sm text-neutral-700 dark:text-slate-300 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                      Add items from the featured offers to build your cart.
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-xs font-bold text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200 transition-colors"
                      onClick={onClearCart}
                      disabled={!cartLines.length}
                    >
                      Clear cart
                    </button>
                    <Btn tone="primary" left={<Zap className="h-4 w-4" />} disabled={!cartLines.length} onClick={() => { }}>
                      Checkout
                    </Btn>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ------------------------------ Mock data ------------------------------ */

const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const DEMO_ADS: Ad[] = [
  {
    id: "ad_1",
    rank: 1,
    status: "Generated",
    campaignName: "Valentine Glow Week",
    campaignSubtitle: "GlowUp Hub · Limited-time drops",
    supplier: {
      name: "GlowUp Hub",
      category: "Beauty",
      logoUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=256&auto=format&fit=crop",
    },
    creator: {
      name: "Amina K.",
      handle: "@amina.dealz",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop",
      verified: true,
    },
    platforms: ["Instagram", "TikTok"],
    startISO: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    endISO: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
    heroImageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop",
    heroIntroVideoUrl: SAMPLE_VIDEO,
    heroIntroVideoPosterUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop",
    heroDesktopMode: "fullscreen",
    ctaPrimaryLabel: "Buy now",
    ctaSecondaryLabel: "Add to cart",
    kpis: [
      { label: "Views", value: "410K" },
      { label: "Saves", value: "18K" },
      { label: "CTR", value: "3.6%" },
    ],
    offers: [
      {
        id: "o1",
        type: "PRODUCT",
        name: "Glow Serum (30ml)",
        price: 38000,
        basePrice: 52000,
        currency: "UGX",
        stockLeft: 12,
        sold: 86,
        posterUrl: "https://images.unsplash.com/photo-1611930022073-84fb62f4ea9d?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL", "WHOLESALE"],
        defaultSellingMode: "RETAIL",
        wholesale: {
          moq: 10,
          step: 5,
          leadTimeLabel: "Ships in 3–5 days",
          tiers: [
            { minQty: 10, unitPrice: 32000 },
            { minQty: 25, unitPrice: 29500 },
            { minQty: 50, unitPrice: 27000 },
          ],
        },
      },
      {
        id: "o2",
        type: "PRODUCT",
        name: "Hydra Cleanser",
        price: 24000,
        basePrice: 32000,
        currency: "UGX",
        stockLeft: 5,
        sold: 123,
        posterUrl: "https://images.unsplash.com/photo-1601612628452-9e99ced43524?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL"],
        defaultSellingMode: "RETAIL",
      },
      {
        id: "o3",
        type: "SERVICE",
        name: "Skin consult (30min)",
        price: 60000,
        currency: "UGX",
        stockLeft: -1,
        sold: 44,
        posterUrl: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
      },
      {
        id: "o4",
        type: "PRODUCT",
        name: "Bundle: Glow Kit",
        price: 120000,
        basePrice: 160000,
        currency: "UGX",
        stockLeft: 0,
        sold: 210,
        posterUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL", "WHOLESALE"],
        defaultSellingMode: "WHOLESALE",
        wholesale: {
          moq: 6,
          step: 2,
          leadTimeLabel: "Ships in 5–7 days",
          tiers: [
            { minQty: 6, unitPrice: 98000 },
            { minQty: 12, unitPrice: 92000 },
            { minQty: 24, unitPrice: 88000 },
          ],
        },
      },
    ],
  },
  {
    id: "ad_2",
    rank: 2,
    status: "Scheduled",
    campaignName: "Back-to-Work Essentials",
    campaignSubtitle: "Urban Supply · Bags & Accessories",
    supplier: {
      name: "Urban Supply",
      category: "Accessories",
      logoUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=256&auto=format&fit=crop",
    },
    creator: {
      name: "Chris M.",
      handle: "@chris.finds",
      avatarUrl: "https://images.unsplash.com/photo-1520975958225-9277a0c1998f?q=80&w=256&auto=format&fit=crop",
      verified: false,
    },
    platforms: ["Instagram"],
    startISO: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    endISO: new Date(Date.now() + 40 * 3600 * 1000).toISOString(),
    heroImageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1600&auto=format&fit=crop",
    heroIntroVideoUrl: SAMPLE_VIDEO,
    heroIntroVideoPosterUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1600&auto=format&fit=crop",
    heroDesktopMode: "modal",
    ctaPrimaryLabel: "Buy now",
    ctaSecondaryLabel: "Add to cart",
    kpis: [
      { label: "Views", value: "92K" },
      { label: "Saves", value: "3.2K" },
      { label: "CTR", value: "2.1%" },
    ],
    offers: [
      {
        id: "o5",
        type: "PRODUCT",
        name: "Laptop Backpack",
        price: 180000,
        basePrice: 220000,
        currency: "UGX",
        stockLeft: 18,
        sold: 51,
        posterUrl: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL", "WHOLESALE"],
        defaultSellingMode: "RETAIL",
        wholesale: {
          moq: 5,
          step: 1,
          leadTimeLabel: "Ships in 2–4 days",
          tiers: [
            { minQty: 5, unitPrice: 155000 },
            { minQty: 10, unitPrice: 149000 },
            { minQty: 25, unitPrice: 139000 },
          ],
        },
      },
      {
        id: "o6",
        type: "PRODUCT",
        name: "Daily Tote",
        price: 95000,
        currency: "UGX",
        stockLeft: 4,
        sold: 98,
        posterUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL"],
        defaultSellingMode: "RETAIL",
      },
      {
        id: "o7",
        type: "SERVICE",
        name: "Personal styling consult",
        price: 120000,
        currency: "UGX",
        stockLeft: -1,
        sold: 12,
        posterUrl: "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
      },
      {
        id: "o8",
        type: "PRODUCT",
        name: "Gift Wrap (pack of 10)",
        price: 25000,
        currency: "UGX",
        stockLeft: -1,
        sold: 210,
        posterUrl: "https://images.unsplash.com/photo-1543332164-6e82f355bad1?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL", "WHOLESALE"],
        defaultSellingMode: "WHOLESALE",
        wholesale: {
          moq: 10,
          step: 10,
          leadTimeLabel: "Ships in 1–2 days",
          tiers: [
            { minQty: 10, unitPrice: 2000 },
            { minQty: 50, unitPrice: 1800 },
            { minQty: 200, unitPrice: 1600 },
          ],
        },
      },
    ],
  },
];

/** ------------------------------ Page ------------------------------ */

export default function AdzMarketplace() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const [ads] = useState<Ad[]>(DEMO_ADS);
  const [selectedId, setSelectedId] = useState<string>(DEMO_ADS[0]?.id || "");
  const selected = useMemo(() => ads.find((a) => a.id === selectedId) || ads[0], [ads, selectedId]);

  // Per-ad mode selections (Retail/Wholesale) for offers
  const [modeByOffer, setModeByOffer] = useState<Record<string, SellingMode>>({});
  useEffect(() => {
    if (!selected) return;
    const init: Record<string, SellingMode> = {};
    selected.offers.forEach((o) => (init[o.id] = defaultModeForOffer(o)));
    setModeByOffer(init);
  }, [selected]);

  // Cart state for the preview (per selected ad)
  const [cart, setCart] = useState<CartState>({});
  useEffect(() => {
    setCart({});
  }, [selectedId]);

  const offersById = useMemo(() => {
    const m = new Map<string, Offer>();
    selected?.offers.forEach((o) => m.set(o.id, o));
    return m;
  }, [selected]);

  function setOfferMode(offerId: string, mode: SellingMode) {
    setModeByOffer((prev) => ({ ...prev, [offerId]: mode }));
    const o = offersById.get(offerId);
    if (o?.type === "PRODUCT" && mode === "WHOLESALE") setToast("Wholesale mode enabled (MOQ & tier rules apply).");
  }

  function addToCart(offerId: string, mode: SellingMode) {
    if (!selected) return;
    const offer = offersById.get(offerId);
    if (!offer) return;

    setCart((prev) => {
      const k = cartKey(offerId, mode);
      const currentQty = prev[k] || 0;
      const nextQty = nextQtyOnAdd(offer, mode, currentQty);
      return { ...prev, [k]: nextQty };
    });

    const msg =
      offer.type === "PRODUCT" && mode === "WHOLESALE" && offer.wholesale
        ? `Added: ${offer.name} (Wholesale · MOQ ${offer.wholesale.moq})`
        : `Added: ${offer.name}`;
    setToast(msg);
  }

  function decCart(offerId: string, mode: SellingMode) {
    const offer = offersById.get(offerId);
    if (!offer) return;
    setCart((prev) => {
      const k = cartKey(offerId, mode);
      const currentQty = prev[k] || 0;
      const next = nextQtyOnDec(offer, mode, currentQty);
      const out = { ...prev };
      if (next <= 0) delete out[k];
      else out[k] = next;
      return out;
    });
  }

  function clearCart() {
    setCart({});
  }

  function buyNow(offerId: string, mode: SellingMode) {
    const offer = offersById.get(offerId);
    if (!offer) return;

    const qty =
      mode === "WHOLESALE" && offer.type === "PRODUCT" && offer.wholesale
        ? offer.wholesale.moq
        : 1;

    const url = `/checkout?offerId=${encodeURIComponent(offerId)}&mode=${encodeURIComponent(mode)}&qty=${encodeURIComponent(String(qty))}`;
    setToast(`Checkout → ${offer.name} (${mode}) · qty ${qty} · ${url} (demo)`);
  }

  function openAdBuilder(ad: Ad) {
    setDrawerData(ad.id);
    setDrawer("builder");
  }

  function shareAd(ad: Ad) {
    const base = `https://mldz.link/${encodeURIComponent(ad.id)}`;
    setToast(`Share link copied: ${base} (demo)`);
    try {
      navigator.clipboard?.writeText(base);
    } catch { /* ignore */ }
  }

  // filters
  const [query, setQuery] = useState("");
  const [onlyGenerated, setOnlyGenerated] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("All");

  const platformsAll = useMemo(() => {
    const s = new Set<string>();
    ads.forEach((a) => a.platforms.forEach((p) => s.add(p)));
    return ["All", ...Array.from(s)];
  }, [ads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ads
      .filter((a) => (onlyGenerated ? a.status === "Generated" : true))
      .filter((a) => (platformFilter === "All" ? true : a.platforms.includes(platformFilter)))
      .filter((a) => {
        if (!q) return true;
        return (
          a.campaignName.toLowerCase().includes(q) ||
          a.supplier.name.toLowerCase().includes(q) ||
          a.creator.handle.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.rank - b.rank);
  }, [ads, query, onlyGenerated, platformFilter]);

  // drawer state
  const [drawer, setDrawer] = useState<"builder" | null>(null);
  const [drawerData, setDrawerData] = useState<string | undefined>(undefined);

  // viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerCtx, setViewerCtx] = useState<ViewerContext | null>(null);
  const [loved, setLoved] = useState(false);
  const [selectedHeroOfferId, setSelectedHeroOfferId] = useState<string>("");

  useEffect(() => {
    if (!selected) return;
    if (!selectedHeroOfferId) setSelectedHeroOfferId(selected.offers[0]?.id || "");
  }, [selected, selectedHeroOfferId]);

  const startsAt = useMemo(() => (selected ? new Date(selected.startISO) : new Date()), [selected]);
  const endsAt = useMemo(() => (selected ? new Date(selected.endISO) : new Date(Date.now() + 3600 * 1000)), [selected]);
  const countdownState = useMemo(() => computeCountdownState(Date.now(), startsAt.getTime(), endsAt.getTime()), [startsAt, endsAt]);
  const countdownLabel = useMemo(
    () => (countdownState === "upcoming" ? "Starts in" : countdownState === "live" ? "Ends in" : "Session ended"),
    [countdownState],
  );

  const viewerMode = useMemo<ViewerMode>(() => {
    const preferred = viewerCtx?.desktopMode || "modal";
    if (isMobile) return "fullscreen";
    return preferred;
  }, [isMobile, viewerCtx?.desktopMode]);

  const stockLabelForOffer = useCallback((ad: Ad, offerId: string): { tone: "warn" | "bad" | "neutral"; text: string } | null => {
    const o = ad.offers.find((x) => x.id === offerId);
    if (!o) return null;
    if (countdownState === "ended") return { tone: "neutral", text: "Session ended" };
    if (countdownState === "upcoming") return { tone: "neutral", text: "Not started" };
    if (o.type === "SERVICE") return { tone: "neutral", text: "Service available" };
    if (o.stockLeft === 0) return { tone: "bad", text: "Sold out" };
    if (o.stockLeft > 0 && o.stockLeft <= 5) return { tone: "warn", text: `${o.stockLeft} left` };
    if (o.stockLeft < 0) return { tone: "neutral", text: "Unlimited" };
    return null;
  }, [countdownState]);

  const viewerOfferId = useMemo(() => {
    if (!viewerCtx || !selected) return "";
    return viewerCtx.kind === "hero" ? selectedHeroOfferId : viewerCtx.offerId;
  }, [viewerCtx, selectedHeroOfferId, selected]);

  const viewerOffer = useMemo(() => {
    if (!selected) return null;
    return selected.offers.find((o) => o.id === viewerOfferId) || null;
  }, [selected, viewerOfferId]);

  const viewerModeOptions = useMemo(() => (viewerOffer ? enabledModesForOffer(viewerOffer) : (["RETAIL"] as SellingMode[])), [viewerOffer]);
  const viewerActiveMode = useMemo(() => {
    if (!viewerOffer) return "RETAIL" as SellingMode;
    return modeByOffer[viewerOffer.id] || defaultModeForOffer(viewerOffer);
  }, [viewerOffer, modeByOffer]);

  const viewerModeMetaLabel = useMemo(() => {
    if (!viewerOffer) return "";
    if (viewerOffer.type === "SERVICE") return "Services are not sold as retail/wholesale.";
    if (viewerActiveMode === "WHOLESALE" && viewerOffer.wholesale) {
      return `MOQ ${viewerOffer.wholesale.moq} · Step ${viewerOffer.wholesale.step}${viewerOffer.wholesale.leadTimeLabel ? ` · ${viewerOffer.wholesale.leadTimeLabel}` : ""}`;
    }
    return "Retail checkout";
  }, [viewerOffer, viewerActiveMode]);

  const viewerPriceLabel = useMemo(() => {
    if (!viewerOffer) return "";
    if (viewerOffer.type === "SERVICE") return `${viewerOffer.name} · ${money(viewerOffer.currency, viewerOffer.price)}`;
    if (viewerActiveMode === "WHOLESALE" && viewerOffer.wholesale) {
      const unit = wholesaleUnitPrice(viewerOffer, viewerOffer.wholesale.moq) ?? viewerOffer.price;
      return `${viewerOffer.name} · Wholesale · ${money(viewerOffer.currency, unit)}/unit`;
    }
    return `${viewerOffer.name} · Retail · ${money(viewerOffer.currency, viewerOffer.price)}`;
  }, [viewerOffer, viewerActiveMode]);

  const viewerStockLabel = useMemo(() => {
    if (!viewerCtx || !selected) return null;
    return stockLabelForOffer(selected, viewerOfferId);
  }, [viewerCtx, viewerOfferId, selected, stockLabelForOffer]);

  const heroOffers = useMemo(() => {
    if (!selected) return [];
    return selected.offers.map((o) => {
      const stockNote =
        o.type === "SERVICE"
          ? "Service"
          : o.stockLeft === 0
            ? "Sold out"
            : o.stockLeft > 0 && o.stockLeft <= 5
              ? "Low stock"
              : o.stockLeft > 0
                ? `${o.stockLeft} left`
                : "Unlimited";
      return {
        id: o.id,
        name: o.name,
        posterUrl: o.posterUrl,
        price: money(o.currency, o.price),
        stockNote,
        kindLabel: o.type === "SERVICE" ? "Service" : "Product",
      };
    });
  }, [selected]);

  function openHeroViewer() {
    if (!selected?.heroIntroVideoUrl) return;
    setViewerCtx({
      kind: "hero",
      title: `${selected.campaignName} · Intro`,
      videoUrl: selected.heroIntroVideoUrl,
      posterUrl: selected.heroIntroVideoPosterUrl || selected.heroImageUrl,
      desktopMode: selected.heroDesktopMode,
    });
    setViewerOpen(true);
  }

  function openOfferViewer(offerId: string) {
    const offer = offersById.get(offerId);
    if (!offer?.videoUrl) return;
    setViewerCtx({
      kind: "offer",
      offerId,
      title: offer.name,
      videoUrl: offer.videoUrl,
      posterUrl: offer.posterUrl,
      desktopMode: offer.desktopMode,
    });
    setViewerOpen(true);
  }

  function viewerBuyNow() {
    if (!selected) return;
    const offerId = viewerCtx?.kind === "hero" ? selectedHeroOfferId : viewerCtx?.kind === "offer" ? viewerCtx.offerId : "";
    if (!offerId) {
      setToast("Choose an item first.");
      return;
    }
    const m = modeByOffer[offerId] || "RETAIL";
    buyNow(offerId, m);
  }

  function viewerAddToCart() {
    if (!selected) return;
    const offerId = viewerCtx?.kind === "hero" ? selectedHeroOfferId : viewerCtx?.kind === "offer" ? viewerCtx.offerId : "";
    if (!offerId) {
      setToast("Choose an item first.");
      return;
    }
    const m = modeByOffer[offerId] || "RETAIL";
    addToCart(offerId, m);
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <PageHeader
        pageTitle="Adz Marketplace"
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold hover:bg-neutral-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-900 dark:text-slate-100 transition-colors"
              onClick={() => navigate("/asset-library")}
            >
              <ExternalLink className="h-4 w-4" />
              Asset Library
            </button>
            <button
              type="button"
              className="rounded-2xl border border-transparent px-3 py-2 text-[12px] font-extrabold text-white flex items-center gap-2 hover:brightness-95"
              style={{ background: ORANGE }}
              onClick={() => {
                setDrawerData(undefined);
                setDrawer("builder");
              }}
            >
              <Plus className="h-4 w-4" />
              New Ad
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 px-3 py-2 transition-colors">
              <Search className="h-4 w-4 text-neutral-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by campaign, supplier, host..."
                className="w-full bg-transparent outline-none text-[12px] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-500 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold flex items-center gap-2 transition-colors">
                <Filter className="h-4 w-4 text-neutral-700 dark:text-slate-300" />
                <span className="text-neutral-700 dark:text-slate-300">Platform</span>
                <select
                  className="bg-transparent outline-none text-neutral-900 dark:text-slate-100 dark:bg-slate-900"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                >
                  {platformsAll.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={cx(
                  "rounded-2xl border px-3 py-2 text-[12px] font-extrabold transition",
                  onlyGenerated ? "border-transparent text-white" : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-800",
                )}
                style={onlyGenerated ? { background: ORANGE } : undefined}
                onClick={() => setOnlyGenerated((v) => !v)}
                title="Only show generated ads"
              >
                <CheckCircle2 className="h-4 w-4 inline-block mr-2" />
                Generated only
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: ad list */}
        <div className="lg:col-span-5 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
          <div className="p-4 border-b border-neutral-200 flex items-start justify-between gap-2">
            <div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Top Adz</div>
              <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Ranked by performance. Select one to preview.</div>
            </div>
            <Pill tone="neutral">{filtered.length} results</Pill>
          </div>

          <div className="max-h-[720px] overflow-auto p-3 space-y-2">
            {filtered.map((a) => {
              const active = a.id === selectedId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cx(
                    "w-full text-left rounded-3xl border p-3 transition",
                    active
                      ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-900/10"
                      : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cx(
                            "inline-grid h-8 w-8 place-items-center rounded-2xl",
                            active
                              ? "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                              : "bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-slate-100",
                          )}
                        >
                          <Package className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{a.campaignName}</div>
                          <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400">
                            Supplier: {a.supplier.name} · Creator: {a.creator.handle}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-neutral-700 dark:text-slate-300">
                        <Pill tone={active ? "brand" : "neutral"}>
                          <TrendingUp className="h-3.5 w-3.5" />
                          Rank #{a.rank}
                        </Pill>
                        <Pill tone={a.status === "Generated" ? "good" : a.status === "Scheduled" ? "warn" : "neutral"}>
                          {a.status === "Generated" ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Generated
                            </>
                          ) : a.status === "Scheduled" ? (
                            <>
                              <CalendarClock className="h-3.5 w-3.5" /> Scheduled
                            </>
                          ) : (
                            <>
                              <Info className="h-3.5 w-3.5" /> Draft
                            </>
                          )}
                        </Pill>
                        <Pill tone={active ? "brand" : "neutral"}>
                          <Link2 className="h-3.5 w-3.5" />
                          {a.platforms.join(", ")}
                        </Pill>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="text-[11px] font-extrabold text-neutral-900 dark:text-slate-100">KPIs</div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {a.kpis.slice(0, 3).map((k) => (
                          <span
                            key={k.label}
                            className={cx(
                              "rounded-xl px-2 py-1 text-[10px] font-extrabold border",
                              active
                                ? "border-orange-200 dark:border-orange-800 bg-orange-100 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100"
                                : "border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 text-neutral-800 dark:text-slate-200",
                            )}
                          >
                            {k.label}: {k.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: preview panel (buyer-first emphasis) */}
        <div className="lg:col-span-7">
          {selected ? (
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
              <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition-colors">
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Buyer Preview</div>
                  <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                    This is the Shoppable Ad preview buyers will experience (phone-sized, scrollable).
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn
                    tone="neutral"
                    left={<Copy className="h-4 w-4" />}
                    onClick={() => shareAd(selected)}
                    disabled={selected.status !== "Generated"}
                    title={selected.status !== "Generated" ? "Generate first" : "Copy share link"}
                  >
                    Copy link
                  </Btn>
                  <Btn tone="neutral" left={<ExternalLink className="h-4 w-4" />} onClick={() => openAdBuilder(selected)}>
                    Open in Ad Builder
                  </Btn>
                </div>
              </div>

              <div className="p-4">
                <div className="bg-neutral-50 dark:bg-slate-950 p-4 rounded-2xl transition-colors">
                  <ShoppableAdPreview
                    ad={selected}
                    cart={cart}
                    modeByOffer={modeByOffer}
                    onSetOfferMode={setOfferMode}
                    shareEnabled={selected.status === "Generated"}
                    onPlayHero={openHeroViewer}
                    onPlayOffer={openOfferViewer}
                    onBuy={buyNow}
                    onAdd={addToCart}
                    onDecCart={decCart}
                    onClearCart={clearCart}
                    onShare={() => shareAd(selected)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-colors">
              <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">No Ad selected</div>
              <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Choose an Ad from the list to preview.</div>
            </div>
          )}
        </div>
      </div>

      {/* Viewer */}
      <MediaViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        ctx={viewerCtx}
        mode={viewerMode}
        countdownState={countdownState}
        countdownLabel={countdownLabel}
        stockLabel={viewerStockLabel}
        priceLabel={viewerPriceLabel}
        ctaPrimary={selected?.ctaPrimaryLabel || "Buy now"}
        ctaSecondary={selected?.ctaSecondaryLabel || "Add to cart"}
        onBuyNow={viewerBuyNow}
        onAddToCart={viewerAddToCart}
        onLove={() => setLoved((s) => !s)}
        loved={loved}
        onShare={() => selected && shareAd(selected)}
        heroOffers={viewerCtx?.kind === "hero" ? heroOffers : undefined}
        selectedHeroOfferId={viewerCtx?.kind === "hero" ? selectedHeroOfferId : undefined}
        onSelectHeroOfferId={viewerCtx?.kind === "hero" ? setSelectedHeroOfferId : undefined}
        modeOptions={viewerModeOptions}
        activeMode={viewerActiveMode}
        onChangeMode={(m) => viewerOffer && setOfferMode(viewerOffer.id, m)}
        modeMetaLabel={viewerModeMetaLabel}
      />

      {toast ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
          <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-[12px] font-extrabold shadow-sm text-neutral-900 dark:text-slate-100">
            {toast}
          </div>
        </div>
      ) : null}

      {/* Ad Builder Drawer */}
      {drawer === "builder" ? (
        <AdBuilder isDrawer={true} onClose={() => setDrawer(null)} initialAdId={drawerData} />
      ) : null}
    </div>
  );
}
