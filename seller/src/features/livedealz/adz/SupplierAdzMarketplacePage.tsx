import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";
import { buildAdzCampaignPayload, hashAdzCampaign, mapBackendAdzCampaign } from "./runtime";

/**
 * SupplierAdzMarketplacePage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: AdzMarketplace.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Ranked Ad list (left) + Buyer-preview phone shell (right)
 * - Search + platform filter + Generated-only toggle
 * - Buyer preview rules: hero overlays (countdown + save), share + cart top-right, cart badge increments
 * - Offers grid: 2 per row, 500×500 posters, mode toggle where applicable (Retail/Wholesale)
 * - Cart dock inside preview (not checkout dock), wholesale constraints (MOQ/step)
 * - Video viewer (hero/offer) with overlays: countdown, stock, love/share, mode toggle, CTA buttons
 * - Toast feedback
 * - Ad Builder drawer (premium stub) opened from header or preview
 *
 * Supplier adaptations (minimal, necessary):
 * - Adds Supplier campaign governance context: creatorUsage, collabMode, approvalMode, hostRole
 * - Routes are supplier-safe (stubbed as toasts for canvas; replace safeNav with react-router navigate)
 * - Copy link disabled until Generated; publishing/generation notes reflect Supplier approvals workflow
 */

const ORANGE = "#f77f00";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeNav(url) {
  if (!url) return;
  const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noreferrer");
    return;
  }
  if (typeof window !== "undefined") window.location.assign(target);
}

/* --------------------------------- Helpers -------------------------------- */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function money(currency, amount) {
  const n = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}

function fmtLocal(d) {
  try {
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(d);
  }
}

function computeCountdownState(nowMs, startMs, endMs) {
  if (nowMs < startMs) return "upcoming";
  if (nowMs >= startMs && nowMs <= endMs) return "live";
  return "ended";
}

function countdownParts(nowMs, startMs, endMs) {
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

/* --------------------------- Retail / Wholesale logic ---------------------- */

function enabledModesForOffer(o) {
  if (o.type === "SERVICE") return ["RETAIL"];
  const ms = (o.sellingModes || []).filter(Boolean);
  return ms.length ? ms : ["RETAIL"];
}

function defaultModeForOffer(o) {
  const ms = enabledModesForOffer(o);
  return o.defaultSellingMode && ms.includes(o.defaultSellingMode) ? o.defaultSellingMode : ms[0];
}

function wholesaleUnitPrice(o, qty) {
  if (o.type !== "PRODUCT" || !o.wholesale || !Array.isArray(o.wholesale.tiers) || !o.wholesale.tiers.length) return null;
  const tiers = [...o.wholesale.tiers].sort((a, b) => a.minQty - b.minQty);
  let unit = tiers[0].unitPrice;
  for (const t of tiers) if (qty >= t.minQty) unit = t.unitPrice;
  return unit;
}

function unitPriceFor(o, mode, qty) {
  if (mode === "WHOLESALE") return wholesaleUnitPrice(o, qty) ?? o.price;
  return o.price;
}

function lineTotalFor(o, mode, qty) {
  return unitPriceFor(o, mode, qty) * qty;
}

function nextQtyOnAdd(o, mode, currentQty) {
  if (mode === "WHOLESALE" && o.type === "PRODUCT" && o.wholesale) {
    if (currentQty <= 0) return o.wholesale.moq;
    return currentQty + o.wholesale.step;
  }
  return currentQty + 1;
}

function nextQtyOnDec(o, mode, currentQty) {
  if (mode === "WHOLESALE" && o.type === "PRODUCT" && o.wholesale) {
    const next = currentQty - o.wholesale.step;
    if (next < o.wholesale.moq) return 0;
    return next;
  }
  const next = currentQty - 1;
  return next < 0 ? 0 : next;
}

function cartKey(offerId, mode) {
  return `${offerId}::${mode}`;
}

function parseCartKey(key) {
  const parts = String(key || "").split("::");
  const offerId = parts[0] || "";
  const mode = parts[1] === "WHOLESALE" ? "WHOLESALE" : "RETAIL";
  return { offerId, mode };
}

/* --------------------------------- UI ------------------------------------- */

function PageHeader({ pageTitle, rightContent }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-neutral-200/60 dark:border-slate-800">
      <div className="w-full max-w-full px-[0.55%] py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm sm:text-base font-extrabold text-neutral-900 dark:text-slate-100">
            {pageTitle}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-slate-400">
            Preview-first marketplace for Shoppable Adz (Supplier). Validate buyer UX, offers, and share links.
          </p>
        </div>
        <div className="shrink-0">{rightContent}</div>
      </div>
    </header>
  );
}

function Pill({ tone = "neutral", children, title }) {
  const cls =
    tone === "brand"
      ? "bg-orange-500 text-white border-transparent"
      : tone === "good"
        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
        : tone === "warn"
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300"
          : tone === "bad"
            ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300"
            : tone === "pro"
              ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-300"
              : "bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-800 dark:text-slate-300";

  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-extrabold", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", left, className, disabled, onClick, children, title }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-extrabold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "ghost"
        ? "border-transparent bg-transparent hover:bg-gray-50 dark:hover:bg-slate-800/10 text-white"
        : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-900 dark:text-neutral-100";

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

function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-colors">
        <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-neutral-200 dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Viewer</div>
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

function PlayOverlayButton({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="absolute inset-0 grid place-items-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-white dark:bg-slate-900/85 shadow-md hover:bg-gray-50 dark:hover:bg-slate-800">
        <span className="text-xl text-neutral-900">▶</span>
      </span>
    </button>
  );
}

function ModeToggle({ modes, value, onChange, compact }) {
  if (!modes || modes.length <= 1) return null;
  return (
    <div className={cx("flex items-center gap-2", compact && "gap-1")}> 
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cx(
            "rounded-xl px-3 py-1.5 text-[11px] font-extrabold border transition",
            value === m
              ? "border-transparent text-white"
              : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-700"
          )}
          style={value === m ? { background: ORANGE } : undefined}
          title={m === "WHOLESALE" ? "Wholesale mode (MOQ / tiers may apply)" : "Retail mode"}
        >
          {m === "WHOLESALE" ? "Wholesale" : "Retail"}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Viewer ------------------------------------- */

function MediaViewer({
  open,
  onClose,
  ctx,
  viewerMode,
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
  modeOptions,
  activeMode,
  onChangeMode,
  modeMetaLabel
}) {
  if (!ctx) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className={cx("relative overflow-hidden rounded-3xl bg-black", viewerMode === "fullscreen" ? "h-[70vh] md:h-[78vh]" : "aspect-video")}>
        <video
          src={ctx.videoUrl}
          poster={ctx.posterUrl}
          controls
          playsInline
          autoPlay
          className="absolute inset-0 h-full w-full object-contain bg-black"
        />

        {/* overlays */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <Pill tone="brand">⚡ Shoppable Adz</Pill>
            <Pill tone={countdownState === "live" ? "brand" : countdownState === "upcoming" ? "good" : "neutral"}>
              ⏱ {countdownLabel}
            </Pill>
            {stockLabel ? (
              <Pill tone={stockLabel.tone === "bad" ? "bad" : stockLabel.tone === "warn" ? "warn" : "neutral"}>
                ℹ {stockLabel.text}
              </Pill>
            ) : null}
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-2">
            <span className="pointer-events-auto">
              <Btn tone="ghost" onClick={onLove} left={<span className={cx("text-base", loved ? "text-red-400" : "text-white")}>♥</span>}>
                {loved ? "Loved" : "Love"}
              </Btn>
            </span>
            <span className="pointer-events-auto">
              <Btn tone="ghost" onClick={onShare} left={<span className="text-base">↗</span>}>
                Share
              </Btn>
            </span>
          </div>

          {/* bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
            {priceLabel ? (
              <div className="mb-2 text-white">
                <div className="text-xs text-white/80">Selected</div>
                <div className="text-base md:text-lg font-extrabold">{priceLabel}</div>
                {modeMetaLabel ? <div className="mt-1 text-[11px] text-white/75">{modeMetaLabel}</div> : null}
              </div>
            ) : null}

            {modeOptions && activeMode && onChangeMode && modeOptions.length > 1 ? (
              <div className="mb-3 pointer-events-auto">
                <div className="text-xs font-bold text-white/80">Mode</div>
                <div className="mt-2">
                  <ModeToggle modes={modeOptions} value={activeMode} onChange={onChangeMode} />
                </div>
              </div>
            ) : null}

            {ctx.kind === "hero" && Array.isArray(heroOffers) && heroOffers.length ? (
              <div className="mb-3">
                <div className="text-xs font-bold text-white/80">Choose item</div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {heroOffers.map((p) => {
                    const active = p.id === selectedHeroOfferId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectHeroOfferId && onSelectHeroOfferId(p.id)}
                        className={cx(
                          "pointer-events-auto flex min-w-[240px] items-center gap-2 rounded-2xl border px-2.5 py-2 text-left",
                          active ? "border-white bg-white dark:bg-slate-900/15" : "border-white/20 bg-white dark:bg-slate-900/10 hover:bg-gray-50 dark:hover:bg-slate-800/15"
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
                  Buyers can pick an item from the hero preview before Buy/Add.
                </div>
              </div>
            ) : null}

            <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row">
              <Btn tone="primary" onClick={onBuyNow} left={<span>⚡</span>} className="w-full">
                {ctaPrimary}
              </Btn>
              <Btn tone="neutral" onClick={onAddToCart} left={<span>🛒</span>} className="w-full">
                {ctaSecondary}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CountdownPill({ startsAt, endsAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const { st, hh, mm, ss } = countdownParts(now, startsAt.getTime(), endsAt.getTime());
  const label = st === "upcoming" ? "Starts in" : st === "live" ? "Ends in" : "Ended";
  return (
    <Pill tone="brand">
      ⏱ {label} {pad2(hh)}:{pad2(mm)}:{pad2(ss)}
    </Pill>
  );
}

/* ------------------------------ Phone preview ------------------------------ */

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
  supplierContextPills
}) {
  const startsAt = useMemo(() => new Date(ad.startISO), [ad.startISO]);
  const endsAt = useMemo(() => new Date(ad.endISO), [ad.endISO]);
  const state = computeCountdownState(Date.now(), startsAt.getTime(), endsAt.getTime());

  const [saved, setSaved] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const cartLines = useMemo(() => {
    const byId = new Map(ad.offers.map((o) => [o.id, o]));
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([k, qty]) => {
        const { offerId, mode } = parseCartKey(k);
        const offer = byId.get(offerId);
        if (!offer) return null;
        return { offer, mode, qty };
      })
      .filter(Boolean);
  }, [cart, ad.offers]);

  const cartCount = useMemo(() => cartLines.reduce((s, l) => s + (l?.qty || 0), 0), [cartLines]);

  const currencySet = useMemo(() => new Set(cartLines.map((l) => l.offer.currency)), [cartLines]);
  const multiCurrency = currencySet.size > 1;
  const currency = cartLines[0]?.offer.currency || "USD";
  const cartTotal = useMemo(() => {
    if (multiCurrency) return 0;
    return cartLines.reduce((s, l) => s + lineTotalFor(l.offer, l.mode, l.qty), 0);
  }, [cartLines, multiCurrency]);

  return (
    <div className="w-full rounded-[28px] bg-[#d9d9d9] p-3">
      <div className="mx-auto w-full max-w-[430px] rounded-[44px] bg-neutral-900 p-[10px] shadow-[0_26px_70px_rgba(0,0,0,0.38)]">
        <div className="relative overflow-hidden rounded-[34px] bg-[#f3f3f3] ring-1 ring-white/20">
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-neutral-900/95" />
          <div className="h-[760px] flex flex-col">
            <div className="sticky top-0 z-10 border-b border-[#e4e4e4] bg-[#f5f5f5]/95 px-3 pb-3 pt-6 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-[#d7d7d7] bg-[#efefef] text-[20px] text-neutral-700" aria-label="Back">
                  ‹
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="truncate text-[27px] font-extrabold leading-none text-neutral-900">{ad.campaignName}</div>
                  <div className="mt-1 truncate text-[11px] font-semibold text-neutral-600">Shared by {ad.creator.handle} · {ad.platforms.join(", ")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={cx("grid h-9 w-9 place-items-center rounded-xl border border-[#d7d7d7] bg-[#efefef] text-[16px] text-neutral-700", !shareEnabled && "opacity-50 cursor-not-allowed")}
                    onClick={() => (shareEnabled ? onShare() : undefined)}
                    title={shareEnabled ? "Share" : "Generate first to enable share"}
                    disabled={!shareEnabled}
                    aria-label="Share"
                  >
                    ↗
                  </button>
                  <button type="button" className="relative grid h-9 w-9 place-items-center rounded-xl border border-[#d7d7d7] bg-[#efefef] text-[16px] text-neutral-700" onClick={() => setCartOpen((v) => !v)} aria-label="Cart">
                    🛒
                    {cartCount ? (
                      <span className="absolute -right-1 -top-1 h-4 min-w-[16px] rounded-full bg-[#f77f00] px-1 text-[10px] font-extrabold leading-4 text-white">
                        {cartCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                {ad.offers.map((o) => {
                  const outOfStock = state === "live" && o.stockLeft === 0;
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

                  return (
                    <article key={o.id} className="overflow-hidden rounded-[18px] border border-[#d6d6d6] bg-[#efefef] shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
                      <div className="relative aspect-[4/3] bg-[#d0d0d0]">
                        <img src={o.posterUrl} alt={o.name} className="h-full w-full object-cover" />
                        {o.videoUrl ? <PlayOverlayButton onClick={() => onPlayOffer(o.id)} label={`Play ${o.name}`} /> : null}
                        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                          {discount > 0 ? <span className="rounded-full bg-[#f77f00] px-2.5 py-1 text-[11px] font-black text-white">-{discount}%</span> : null}
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-neutral-800">{o.type === "SERVICE" ? "Service" : "Product"}</span>
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="line-clamp-1 text-[17px] font-extrabold text-neutral-900">{o.name}</div>
                        {o.type === "PRODUCT" && modes.length > 1 ? (
                          <div className="mt-2 flex items-center gap-2">
                            {modes.map((m) => (
                              <button
                                key={m}
                                type="button"
                                className={cx("rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ring-inset", activeMode === m ? "bg-[#f77f00] text-white ring-[#f77f00]" : "bg-white text-neutral-800 ring-[#d6d6d6]")}
                                onClick={() => onSetOfferMode(o.id, m)}
                              >
                                {m === "WHOLESALE" ? "Wholesale" : "Retail"}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-2 flex items-center gap-2">
                          <div className="text-[17px] font-extrabold text-neutral-900">{priceLine}</div>
                          {o.basePrice && o.basePrice > o.price && activeMode !== "WHOLESALE" ? (
                            <div className="text-[11px] font-semibold text-neutral-500 line-through">{money(o.currency, o.basePrice)}</div>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-neutral-600">{o.type === "SERVICE" ? "Service offer" : activeMode === "WHOLESALE" ? "Wholesale offer" : "Retail offer"}</div>

                        <div className="mt-3 space-y-2">
                          <button type="button" className="w-full rounded-full bg-[#f77f00] px-3 py-2 text-[13px] font-black text-white" onClick={() => onBuy(o.id, activeMode)}>
                            ⚡ {ad.ctaPrimaryLabel}
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-full border border-[#d6d6d6] bg-[#f3f3f3] px-3 py-2 text-[13px] font-black text-neutral-800"
                            onClick={() => onAdd(o.id, activeMode)}
                            disabled={outOfStock}
                          >
                            🛒 {ad.ctaSecondaryLabel}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#d8d8d8] bg-[#f3f3f3] p-3">
              <button type="button" className="w-full rounded-2xl border border-[#d4d4d4] bg-[#ececec] px-3 py-2" onClick={() => setCartOpen((v) => !v)} aria-label="Toggle cart">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-left">
                    <div className="text-[12px] font-bold text-neutral-700">🛒 Cart</div>
                    <div className="truncate text-[28px] font-extrabold leading-none text-neutral-900">{cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"}` : "No items yet"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-neutral-500">{multiCurrency ? "Multiple currencies" : "Subtotal"}</div>
                    <div className="text-[28px] font-black leading-none text-neutral-900">{multiCurrency ? "—" : money(currency, cartTotal)}</div>
                    <div className="mt-1 text-xs text-neutral-700">{cartOpen ? "▴" : "▾"}</div>
                  </div>
                </div>
              </button>

              {cartOpen ? (
                <div className="mt-2 rounded-xl border border-[#d4d4d4] bg-[#f0f0f0] p-2">
                  {cartLines.length ? (
                    <div className="max-h-[168px] space-y-2 overflow-auto pr-1">
                      {cartLines.map(({ offer, mode, qty }) => (
                        <div key={cartKey(offer.id, mode)} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs">
                          <div className="min-w-0">
                            <div className="truncate font-bold text-neutral-900">{offer.name}</div>
                            <div className="text-neutral-600">{mode === "WHOLESALE" ? "Wholesale" : "Retail"} · {money(offer.currency, lineTotalFor(offer, mode, qty))}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" className="h-6 w-6 rounded border border-neutral-300 text-sm font-bold" onClick={() => onDecCart(offer.id, mode)}>−</button>
                            <span className="w-5 text-center font-extrabold">{qty}</span>
                            <button type="button" className="h-6 w-6 rounded border border-neutral-300 text-sm font-bold" onClick={() => onAdd(offer.id, mode)}>+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-neutral-600">Add items from cards to populate cart.</div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <button type="button" className="text-xs font-bold text-neutral-600" onClick={onClearCart} disabled={!cartLines.length}>Clear cart</button>
                    <button
                      type="button"
                      className="rounded-full bg-[#f77f00] px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                      disabled={!cartLines.length}
                      onClick={() => {
                        const first = cartLines[0];
                        if (!first) return;
                        safeNav(`/checkout?offerId=${encodeURIComponent(first.offer.id)}&mode=${encodeURIComponent(first.mode)}&qty=${encodeURIComponent(String(first.qty))}`);
                      }}
                    >
                      Checkout
                    </button>
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

/* ------------------------------ Builder drawer (premium stub) -------------- */

function Drawer({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 shadow-2xl flex flex-col transition-colors">
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="text-[13px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          <button
            type="button"
            className="rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 px-3 py-2 text-[12px] font-extrabold hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-900 dark:text-slate-100 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">{label}</div>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-neutral-900 dark:text-slate-100"
      />
    </div>
  );
}

function AdBuilderDrawer({ open, onClose, initialAd, onSave }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialAd?.campaignName || "New Shoppable Ad");
  const [subtitle, setSubtitle] = useState(initialAd?.campaignSubtitle || "Premium buyer preview" );
  const [creatorUsage, setCreatorUsage] = useState(initialAd?.creatorUsage || "I will use a Creator");
  const [collabMode, setCollabMode] = useState(initialAd?.collabMode || "Open for Collabs");
  const [approvalMode, setApprovalMode] = useState(initialAd?.approvalMode || "Manual");
  const [platforms, setPlatforms] = useState(initialAd?.platforms || ["TikTok"]);
  const [heroOk, setHeroOk] = useState(true);
  const [postersOk, setPostersOk] = useState(true);
  const [status, setStatus] = useState(initialAd?.status || "Draft");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName(initialAd?.campaignName || "New Shoppable Ad");
    setSubtitle(initialAd?.campaignSubtitle || "Premium buyer preview" );
    setCreatorUsage(initialAd?.creatorUsage || "I will use a Creator");
    setCollabMode(initialAd?.collabMode || "Open for Collabs");
    setApprovalMode(initialAd?.approvalMode || "Manual");
    setPlatforms(initialAd?.platforms || ["TikTok"]);
    setHeroOk(true);
    setPostersOk(true);
    setStatus(initialAd?.status || "Draft");
  }, [open, initialAd?.id]);

  useEffect(() => {
    if (creatorUsage === "I will NOT use a Creator") {
      setCollabMode("(n/a)");
    } else if (collabMode === "(n/a)") {
      setCollabMode("Open for Collabs");
    }
  }, [creatorUsage]);

  const togglePlatform = (p) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const steps = [
    { id: 1, label: "Campaign" },
    { id: 2, label: "Media" },
    { id: 3, label: "Tracking" },
    { id: 4, label: "Generate" }
  ];

  const stepBtn = (id) =>
    cx(
      "px-3 py-2 rounded-2xl border text-[12px] font-extrabold transition-colors",
      step === id
        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:bg-slate-900 dark:text-slate-900 dark:border-white"
        : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800 text-neutral-800 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800"
    );

  const canGenerate = Boolean(name.trim()) && platforms.length > 0 && heroOk && postersOk;

  return (
    <Drawer open={open} title="Ad Builder (Supplier)" onClose={onClose}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
            {initialAd?.id ? `Editing: ${initialAd.id}` : "Create new ad"}
          </div>
          <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
            Supplier governance is enforced here: creator usage, collaboration mode, and approvals.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn tone="neutral" left={<span>💾</span>} onClick={() => onSave({ name, subtitle, creatorUsage, collabMode, approvalMode, platforms, status: "Draft" })}>
            Save draft
          </Btn>
          <Btn
            tone="primary"
            left={<span>✨</span>}
            disabled={!canGenerate}
            title={!canGenerate ? "Fix checklist first" : "Generate ad"}
            onClick={() => {
              setStatus("Generated");
              onSave({ name, subtitle, creatorUsage, collabMode, approvalMode, platforms, status: "Generated" });
            }}
          >
            Generate
          </Btn>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {steps.map((s) => (
          <button key={s.id} type="button" className={stepBtn(s.id)} onClick={() => setStep(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {step === 1 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Campaign basics</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Mirror: supplier chooses creator usage decision. If NOT using a creator, supplier becomes the host.
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Campaign name" value={name} onChange={setName} placeholder="e.g. Valentine Glow Week" />
              <Input label="Subtitle" value={subtitle} onChange={setSubtitle} placeholder="Short hook" />

              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Creator usage decision</div>
                <select
                  value={creatorUsage}
                  onChange={(e) => setCreatorUsage(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-extrabold"
                >
                  <option>I will use a Creator</option>
                  <option>I will NOT use a Creator</option>
                  <option>I am NOT SURE yet</option>
                </select>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  “Not sure yet” allows creating the campaign now and selecting collaboration later (before submission).
                </div>
              </div>

              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Collaboration mode</div>
                <select
                  value={collabMode}
                  onChange={(e) => setCollabMode(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-extrabold"
                  disabled={creatorUsage === "I will NOT use a Creator"}
                  title={creatorUsage === "I will NOT use a Creator" ? "Not applicable" : ""}
                >
                  <option>Open for Collabs</option>
                  <option>Invite-Only</option>
                  <option>(n/a)</option>
                </select>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  Default is Open for Collabs. Editable per campaign before content submission.
                </div>
              </div>

              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Content approval</div>
                <select
                  value={approvalMode}
                  onChange={(e) => setApprovalMode(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-extrabold"
                >
                  <option>Manual</option>
                  <option>Auto</option>
                </select>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  Manual: Supplier approves before Admin. Auto: goes straight to Admin.
                </div>
              </div>

              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Platforms</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["TikTok", "Instagram", "YouTube", "Facebook"].map((p) => {
                    const active = platforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={cx(
                          "px-3 py-2 rounded-2xl border text-[12px] font-extrabold transition-colors",
                          active
                            ? "border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-100"
                            : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-900 dark:text-slate-100"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Outcome</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill tone={creatorUsage === "I will NOT use a Creator" ? "warn" : creatorUsage === "I will use a Creator" ? "good" : "neutral"}>{creatorUsage}</Pill>
                  <Pill tone="neutral">Collab: {collabMode}</Pill>
                  <Pill tone={approvalMode === "Manual" ? "warn" : "good"}>Approval: {approvalMode}</Pill>
                  <Pill tone={status === "Generated" ? "good" : status === "Scheduled" ? "warn" : "neutral"}>Status: {status}</Pill>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Media validation</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Mirror rules: hero media should be 1920×1080 and offer posters should be 500×500.
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="inline-flex items-center gap-2 text-[12px] font-extrabold">
                <input type="checkbox" checked={heroOk} onChange={(e) => setHeroOk(e.target.checked)} />
                Hero is 1920×1080 (16:9)
              </label>
              <label className="inline-flex items-center gap-2 text-[12px] font-extrabold">
                <input type="checkbox" checked={postersOk} onChange={(e) => setPostersOk(e.target.checked)} />
                Posters are 500×500 (square)
              </label>
              <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-[11px] text-neutral-700 dark:text-slate-300">
                In production: warn/auto-crop, block submission if critical media is missing.
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Tracking & compliance</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Mirror: UTMs + pixels + compliance checks. Replace with real integrations.
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">UTM</div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">utm_source=mylivedealz · utm_medium=adz · utm_campaign={initialAd?.id || "new"}</div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">Tip: Keep utm_campaign stable for attribution.</div>
              </div>
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Pixels</div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">Meta / TikTok / Google tags supported.</div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">Share links remain disabled until Generate completes.</div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Generate</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Generating creates share links, exports, and finalizes buyer preview surfaces.
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Checklist</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CheckRow ok={Boolean(name.trim())} label="Campaign name" hint="Required" />
                  <CheckRow ok={platforms.length > 0} label="Platforms" hint={platforms.length ? platforms.join(", ") : "Select at least one"} />
                  <CheckRow ok={heroOk} label="Hero media" hint="1920×1080" />
                  <CheckRow ok={postersOk} label="Offer posters" hint="500×500" />
                </div>
              </div>
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Actions</div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                  Supplier note: Manual approval routes content to Supplier review then Admin. Auto routes to Admin.
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Btn tone="primary" left={<span>✨</span>} disabled={!canGenerate} onClick={() => {
                    setStatus("Generated");
                    onSave({ name, subtitle, creatorUsage, collabMode, approvalMode, platforms, status: "Generated" });
                  }}>
                    Generate now
                  </Btn>
                  <Btn tone="neutral" left={<span>📤</span>} disabled={!canGenerate} onClick={() => onSave({ name, subtitle, creatorUsage, collabMode, approvalMode, platforms, status: "Scheduled" })}>
                    Submit for approvals
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

function CheckRow({ ok, label, hint }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[13px] font-extrabold truncate text-neutral-900 dark:text-slate-100">{label}</div>
        {hint ? <div className="text-[11px] text-neutral-600 dark:text-slate-400 truncate">{hint}</div> : null}
      </div>
      <Pill tone={ok ? "good" : "warn"}>{ok ? "OK" : "Fix"}</Pill>
    </div>
  );
}

/* --------------------------------- Mock data ------------------------------ */

const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const DEMO_ADS: Array<Record<string, any>> = [];

/* --------------------------------- Page ----------------------------------- */

export default function SupplierAdzMarketplacePage() {
  const navigate = useNavigate();
  const [syncedAds, setSyncedAds] = useState<Record<string, string>>({});
  const safeNav = (url) => {
    if (!url) return;
    const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noreferrer");
      return;
    }
    navigate(target);
  };

  const isMobile = useIsMobile();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const [ads, setAds] = useState<typeof DEMO_ADS>([]);
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    let cancelled = false;

    void sellerBackendApi
      .getAdzMarketplace()
      .then((payload) => {
        if (cancelled) return;
        const nextAds = payload.map((entry) => mapBackendAdzCampaign(entry));
        if (nextAds.length) {
          setAds(nextAds as typeof DEMO_ADS);
          setSyncedAds(Object.fromEntries(nextAds.map((ad) => [String(ad.id), hashAdzCampaign(ad)])));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    ads.forEach((ad) => {
      const nextHash = hashAdzCampaign(ad);
      if (syncedAds[String(ad.id)] === nextHash) return;
      setSyncedAds((prev) => ({ ...prev, [String(ad.id)]: nextHash }));
      void sellerBackendApi.patchAdzCampaign(String(ad.id), buildAdzCampaignPayload(ad));
    });
  }, [ads, syncedAds]);

  useEffect(() => {
    if (!ads.length) return;
    if (!ads.find((ad) => ad.id === selectedId)) {
      setSelectedId(ads[0]?.id || "");
    }
  }, [ads, selectedId]);
  const selected = useMemo(() => ads.find((a) => a.id === selectedId) || ads[0], [ads, selectedId]);

  const [modeByOffer, setModeByOffer] = useState({});
  useEffect(() => {
    if (!selected) return;
    const init = {};
    selected.offers.forEach((o) => (init[o.id] = defaultModeForOffer(o)));
    setModeByOffer(init);
  }, [selected]);

  const [cart, setCart] = useState({});
  useEffect(() => setCart({}), [selectedId]);

  const offersById = useMemo(() => {
    const m = new Map();
    (selected?.offers || []).forEach((o) => m.set(o.id, o));
    return m;
  }, [selected]);

  const setOfferMode = (offerId, mode) => {
    setModeByOffer((prev) => ({ ...prev, [offerId]: mode }));
    const o = offersById.get(offerId);
    if (o?.type === "PRODUCT" && mode === "WHOLESALE") setToast("Wholesale mode enabled (MOQ & tier rules apply)." );
  };

  const addToCart = (offerId, mode) => {
    const offer = offersById.get(offerId);
    if (!offer) return;

    setCart((prev) => {
      const k = cartKey(offerId, mode);
      const currentQty = prev[k] || 0;
      const nextQty = nextQtyOnAdd(offer, mode, currentQty);
      return { ...prev, [k]: nextQty };
    });

    const msg = offer.type === "PRODUCT" && mode === "WHOLESALE" && offer.wholesale
      ? `Added: ${offer.name} (Wholesale · MOQ ${offer.wholesale.moq})`
      : `Added: ${offer.name}`;
    setToast(msg);
  };

  const decCart = (offerId, mode) => {
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
  };

  const clearCart = () => setCart({});

  const buyNow = (offerId, mode) => {
    const offer = offersById.get(offerId);
    if (!offer) return;

    const qty = mode === "WHOLESALE" && offer.type === "PRODUCT" && offer.wholesale ? offer.wholesale.moq : 1;
    const url = `/checkout?offerId=${encodeURIComponent(offerId)}&mode=${encodeURIComponent(mode)}&qty=${encodeURIComponent(String(qty))}`;
    setToast(`Buyer checkout preview → ${offer.name} (${mode}) · qty ${qty} · ${url} (demo)`);
  };

  const shareAd = (ad) => {
    if (ad.status !== "Generated") {
      setToast("Generate first to enable share links.");
      return;
    }
    const base = `https://mldz.link/${encodeURIComponent(ad.id)}`;
    setToast(`Share link copied: ${base} (demo)`);
    try {
      navigator.clipboard?.writeText(base);
    } catch {
      // ignore
    }
  };

  // Filters
  const [query, setQuery] = useState("");
  const [onlyGenerated, setOnlyGenerated] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("All");

  const platformsAll = useMemo(() => {
    const s = new Set();
    ads.forEach((a) => (a.platforms || []).forEach((p) => s.add(p)));
    return ["All", ...Array.from(s)];
  }, [ads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...ads]
      .filter((a) => (onlyGenerated ? a.status === "Generated" : true))
      .filter((a) => (platformFilter === "All" ? true : (a.platforms || []).includes(platformFilter)))
      .filter((a) => {
        if (!q) return true;
        return (
          String(a.campaignName || "").toLowerCase().includes(q) ||
          String(a.supplier?.name || "").toLowerCase().includes(q) ||
          String(a.creator?.handle || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }, [ads, query, onlyGenerated, platformFilter]);

  // Builder drawer
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderAdId, setBuilderAdId] = useState(undefined);

  const openBuilder = (ad) => {
    setBuilderAdId(ad?.id);
    setBuilderOpen(true);
  };

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerCtx, setViewerCtx] = useState(null);
  const [loved, setLoved] = useState(false);
  const [selectedHeroOfferId, setSelectedHeroOfferId] = useState("");

  useEffect(() => {
    if (!selected) return;
    if (!selectedHeroOfferId) setSelectedHeroOfferId(selected.offers?.[0]?.id || "");
  }, [selected, selectedHeroOfferId]);

  const startsAt = useMemo(() => (selected ? new Date(selected.startISO) : new Date()), [selected]);
  const endsAt = useMemo(() => (selected ? new Date(selected.endISO) : new Date(Date.now() + 3600 * 1000)), [selected]);
  const countdownState = useMemo(() => computeCountdownState(Date.now(), startsAt.getTime(), endsAt.getTime()), [startsAt, endsAt]);
  const countdownLabel = useMemo(
    () => (countdownState === "upcoming" ? "Starts in" : countdownState === "live" ? "Ends in" : "Session ended"),
    [countdownState]
  );

  const viewerMode = useMemo(() => {
    const preferred = viewerCtx?.desktopMode || "modal";
    if (isMobile) return "fullscreen";
    return preferred;
  }, [isMobile, viewerCtx?.desktopMode]);

  const stockLabelForOffer = useCallback(
    (ad, offerId) => {
      const o = (ad.offers || []).find((x) => x.id === offerId);
      if (!o) return null;
      if (countdownState === "ended") return { tone: "neutral", text: "Session ended" };
      if (countdownState === "upcoming") return { tone: "neutral", text: "Not started" };
      if (o.type === "SERVICE") return { tone: "neutral", text: "Service available" };
      if (o.stockLeft === 0) return { tone: "bad", text: "Sold out" };
      if (o.stockLeft > 0 && o.stockLeft <= 5) return { tone: "warn", text: `${o.stockLeft} left` };
      if (o.stockLeft < 0) return { tone: "neutral", text: "Unlimited" };
      return null;
    },
    [countdownState]
  );

  const viewerOfferId = useMemo(() => {
    if (!viewerCtx || !selected) return "";
    return viewerCtx.kind === "hero" ? selectedHeroOfferId : viewerCtx.offerId;
  }, [viewerCtx, selectedHeroOfferId, selected]);

  const viewerOffer = useMemo(() => {
    if (!selected) return null;
    return selected.offers.find((o) => o.id === viewerOfferId) || null;
  }, [selected, viewerOfferId]);

  const viewerModeOptions = useMemo(() => (viewerOffer ? enabledModesForOffer(viewerOffer) : ["RETAIL"]), [viewerOffer]);
  const viewerActiveMode = useMemo(() => {
    if (!viewerOffer) return "RETAIL";
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
      const stockNote = o.type === "SERVICE" ? "Service" : o.stockLeft === 0 ? "Sold out" : o.stockLeft > 0 && o.stockLeft <= 5 ? "Low stock" : o.stockLeft > 0 ? `${o.stockLeft} left` : "Unlimited";
      return {
        id: o.id,
        name: o.name,
        posterUrl: o.posterUrl,
        price: money(o.currency, o.price),
        stockNote,
        kindLabel: o.type === "SERVICE" ? "Service" : "Product"
      };
    });
  }, [selected]);

  const openHeroViewer = () => {
    if (!selected?.heroIntroVideoUrl) return;
    setViewerCtx({
      kind: "hero",
      title: `${selected.campaignName} · Intro`,
      videoUrl: selected.heroIntroVideoUrl,
      posterUrl: selected.heroIntroVideoPosterUrl || selected.heroImageUrl,
      desktopMode: selected.heroDesktopMode
    });
    setViewerOpen(true);
  };

  const openOfferViewer = (offerId) => {
    const offer = offersById.get(offerId);
    if (!offer?.videoUrl) return;
    setViewerCtx({
      kind: "offer",
      offerId,
      title: offer.name,
      videoUrl: offer.videoUrl,
      posterUrl: offer.posterUrl,
      desktopMode: offer.desktopMode
    });
    setViewerOpen(true);
  };

  const viewerBuyNow = () => {
    if (!selected) return;
    const offerId = viewerCtx?.kind === "hero" ? selectedHeroOfferId : viewerCtx?.kind === "offer" ? viewerCtx.offerId : "";
    if (!offerId) {
      setToast("Choose an item first.");
      return;
    }
    const m = modeByOffer[offerId] || "RETAIL";
    buyNow(offerId, m);
  };

  const viewerAddToCart = () => {
    if (!selected) return;
    const offerId = viewerCtx?.kind === "hero" ? selectedHeroOfferId : viewerCtx?.kind === "offer" ? viewerCtx.offerId : "";
    if (!offerId) {
      setToast("Choose an item first.");
      return;
    }
    const m = modeByOffer[offerId] || "RETAIL";
    addToCart(offerId, m);
  };

  const supplierContextPills = useMemo(() => {
    if (!selected) return null;
    return (
      <>
        <Pill tone={selected.hostRole === "Supplier" ? "warn" : "good"}>{selected.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}</Pill>
        <Pill tone={selected.creatorUsage === "I will NOT use a Creator" ? "warn" : selected.creatorUsage === "I will use a Creator" ? "good" : "neutral"}>{selected.creatorUsage}</Pill>
        <Pill tone="neutral">Collab: {selected.collabMode}</Pill>
        <Pill tone={selected.approvalMode === "Manual" ? "warn" : "good"}>Approval: {selected.approvalMode}</Pill>
      </>
    );
  }, [selected]);

  const builderInitialAd = useMemo(() => (builderAdId ? ads.find((a) => a.id === builderAdId) : null), [builderAdId, ads]);

  const handleSaveBuilder = (payload) => {
    setToast(payload.status === "Generated" ? "Generated successfully. Share enabled." : "Draft saved." );

    setAds((prev) => {
      if (builderAdId) {
        return prev.map((a) =>
          a.id === builderAdId
            ? {
                ...a,
                campaignName: payload.name,
                campaignSubtitle: payload.subtitle,
                creatorUsage: payload.creatorUsage,
                collabMode: payload.collabMode,
                approvalMode: payload.approvalMode,
                platforms: payload.platforms,
                status: payload.status || a.status,
                hostRole: payload.creatorUsage === "I will NOT use a Creator" ? "Supplier" : "Creator"
              }
            : a
        );
      }

      // new ad
      const id = `ad_${Math.random().toString(16).slice(2, 7)}`;
      const rank = Math.max(...prev.map((x) => x.rank || 0), 0) + 1;
      const newAd = {
        id,
        rank,
        status: payload.status || "Draft",
        campaignName: payload.name || "New Shoppable Ad",
        campaignSubtitle: payload.subtitle || "Premium buyer preview",
        supplier: {
          name: "Your Supplier",
          category: "Mixed",
          logoUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=256&auto=format&fit=crop"
        },
        creator: {
          name: payload.creatorUsage === "I will NOT use a Creator" ? "(Supplier-hosted)" : "Creator TBD",
          handle: payload.creatorUsage === "I will NOT use a Creator" ? "@yoursupplier" : "@creator",
          avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop",
          verified: true
        },
        hostRole: payload.creatorUsage === "I will NOT use a Creator" ? "Supplier" : "Creator",
        creatorUsage: payload.creatorUsage,
        collabMode: payload.collabMode,
        approvalMode: payload.approvalMode,
        platforms: payload.platforms,
        startISO: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        endISO: new Date(Date.now() + 30 * 3600 * 1000).toISOString(),
        heroImageUrl: "https://images.unsplash.com/photo-1520975692290-9d0a3d460c22?q=80&w=1600&auto=format&fit=crop",
        heroIntroVideoUrl: SAMPLE_VIDEO,
        heroIntroVideoPosterUrl: "https://images.unsplash.com/photo-1520975692290-9d0a3d460c22?q=80&w=1600&auto=format&fit=crop",
        heroDesktopMode: "modal",
        ctaPrimaryLabel: "Buy now",
        ctaSecondaryLabel: "Add to cart",
        kpis: [
          { label: "Views", value: "—" },
          { label: "Saves", value: "—" },
          { label: "CTR", value: "—" }
        ],
        offers: prev[0]?.offers?.slice?.(0, 4) || []
      };
      return [newAd, ...prev];
    });

    setBuilderOpen(false);
    setBuilderAdId(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar{ display:none; }
        .scrollbar-hide{ -ms-overflow-style:none; scrollbar-width:none; }
        .line-clamp-2{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>

      <PageHeader
        pageTitle="Adz Marketplace"
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold hover:bg-neutral-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-900 dark:text-slate-100 transition-colors"
              onClick={() => safeNav("/supplier/asset-library")}
            >
              <span className="text-base">↗</span>
              Asset Library
            </button>
            <button
              type="button"
              className="rounded-2xl border border-transparent px-3 py-2 text-[12px] font-extrabold text-white flex items-center gap-2 hover:brightness-95"
              style={{ background: ORANGE }}
              onClick={() => {
                setBuilderAdId(undefined);
                setBuilderOpen(true);
              }}
            >
              <span className="text-base">＋</span>
              New Ad
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="w-full max-w-full px-[0.55%] py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 transition-colors">
              <span className="text-neutral-500 dark:text-slate-400">🔎</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by campaign, supplier, host…"
                className="w-full bg-transparent outline-none text-[12px] text-neutral-900 dark:text-slate-100 placeholder:text-neutral-500 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold flex items-center gap-2 transition-colors">
                <span className="text-neutral-700 dark:text-slate-300">🧰</span>
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
                  onlyGenerated
                    ? "border-transparent text-white"
                    : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-800"
                )}
                style={onlyGenerated ? { background: ORANGE } : undefined}
                onClick={() => setOnlyGenerated((v) => !v)}
                title="Only show generated ads"
              >
                <span className="mr-2">✅</span>
                Generated only
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="w-full max-w-full px-[0.55%] py-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: ad list */}
        <div className="lg:col-span-5 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
          <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex items-start justify-between gap-2">
            <div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Top Adz</div>
              <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Ranked by performance. Select one to preview.</div>
            </div>
            <Pill tone="neutral">{filtered.length} results</Pill>
          </div>

          <div className="max-h-[720px] overflow-auto p-3 space-y-2 scrollbar-hide">
            {filtered.map((a) => {
              const active = a.id === selectedId;
              const statusTone = a.status === "Generated" ? "good" : a.status === "Scheduled" ? "warn" : "neutral";
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cx(
                    "w-full text-left rounded-3xl border p-3 transition",
                    active
                      ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-900/10"
                      : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800"
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
                              : "bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-slate-100"
                          )}
                        >
                          📦
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{a.campaignName}</div>
                          <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400">
                            Supplier: {a.supplier.name} · Host: {a.creator.handle}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-neutral-700 dark:text-slate-300">
                        <Pill tone={active ? "brand" : "neutral"}>📈 Rank #{a.rank}</Pill>
                        <Pill tone={statusTone}>
                          {a.status === "Generated" ? "✅ Generated" : a.status === "Scheduled" ? "📅 Scheduled" : "ℹ Draft"}
                        </Pill>
                        <Pill tone={active ? "brand" : "neutral"}>🔗 {a.platforms.join(", ")}</Pill>
                      </div>

                      {/* Supplier context (minimal) */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Pill tone={a.hostRole === "Supplier" ? "warn" : "good"}>{a.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}</Pill>
                        <Pill tone={a.creatorUsage === "I will NOT use a Creator" ? "warn" : a.creatorUsage === "I will use a Creator" ? "good" : "neutral"}>{a.creatorUsage}</Pill>
                        <Pill tone="neutral">Collab: {a.collabMode}</Pill>
                        <Pill tone={a.approvalMode === "Manual" ? "warn" : "good"}>Approval: {a.approvalMode}</Pill>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="text-[11px] font-extrabold text-neutral-900 dark:text-slate-100">KPIs</div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {(a.kpis || []).slice(0, 3).map((k) => (
                          <span
                            key={k.label}
                            className={cx(
                              "rounded-xl px-2 py-1 text-[10px] font-extrabold border",
                              active
                                ? "border-orange-200 dark:border-orange-800 bg-orange-100 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100"
                                : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200"
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

        {/* Right: buyer preview */}
        <div className="lg:col-span-7 lg:flex lg:justify-center">
          {selected ? (
            <div className="w-full lg:max-w-[560px] rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
              <div className="px-3 py-3 border-b border-neutral-200 dark:border-slate-800 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between transition-colors">
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Buyer Preview</div>
                  <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                    This is the phone-sized, scrollable Shoppable Ad buyers will experience.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn
                    tone="neutral"
                    left={<span>📋</span>}
                    onClick={() => shareAd(selected)}
                    disabled={selected.status !== "Generated"}
                    title={selected.status !== "Generated" ? "Generate first" : "Copy share link"}
                    className="px-2.5 py-1.5 text-[11px]"
                  >
                    Copy link
                  </Btn>
                  <Btn tone="neutral" left={<span>🛠️</span>} onClick={() => openBuilder(selected)} className="px-2.5 py-1.5 text-[11px]">
                    Open in Ad Builder
                  </Btn>
                </div>
              </div>

              <div className="p-3">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl transition-colors">
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
                    supplierContextPills={supplierContextPills}
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
        viewerMode={viewerMode}
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

      {/* Toast */}
      {toast ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
          <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold shadow-sm text-neutral-900 dark:text-slate-100">
            {toast}
          </div>
        </div>
      ) : null}

      {/* Builder Drawer */}
      <AdBuilderDrawer
        open={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setBuilderAdId(undefined);
        }}
        initialAd={builderInitialAd}
        onSave={handleSaveBuilder}
      />
    </div>
  );
}
