// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * SupplierMyCampaignsPage.jsx (v3)
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * ✅ Requested upgrades (this revision):
 * 1) Final step button: “Submit for Approval” (Admin must approve campaign before it becomes active).
 * 2) “Add from Catalog” becomes contextual:
 *    - Show “Add Products”, “Add Services”, or BOTH depending on promoted items scope.
 *    - Clicking opens a Catalog Page experience with:
 *      • Avatar photo
 *      • Item details
 *      • Quantity planned for campaign
 *      • Current price
 *      • Discounted price OR % discount OR amount discount (supported)
 * 3) Campaign creation includes Promo Type + Preferred Promo Arrangement.
 *
 * Notes:
 * - This file is canvas-safe (no router imports). `go()` simulates navigation.
 * - In production:
 *   - Catalog is a real page/route (Dealz Marketplace) that returns selections.
 *   - Approval events are driven by backend + Admin workflows.
 */

const ORANGE = "#f77f00";

/* ------------------------- helpers ------------------------- */

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDaysUTC(ymd, days) {
  if (!ymd) return "";
  const [y, m, d] = String(ymd).split("-").map((x) => Number(x));
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function computeEndDate(startYMD, durationDays) {
  // inclusive duration: 1 day => end=start
  const dur = Number(durationDays || 1);
  if (!startYMD) return "";
  return addDaysUTC(startYMD, Math.max(0, dur - 1));
}

function money(currency, value) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    return `${currency || "USD"} ${Number(value || 0).toLocaleString()}`;
  }
}

function clamp(n, min, max) {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function uid(prefix = "C") {
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

  if (!mode || mode === "none") return p;
  if (mode === "percent") {
    const pct = clamp(v, 0, 100);
    return Math.max(0, p * (1 - pct / 100));
  }
  if (mode === "amount") {
    return Math.max(0, p - v);
  }
  if (mode === "final") {
    return Math.max(0, v);
  }
  return p;
}

function formatDiscount(mode, value, currency = "USD") {
  const v = safeNum(value, 0);
  if (!mode || mode === "none" || v <= 0) return "No discount";
  if (mode === "percent") return `${clamp(v, 0, 100)}% off`;
  if (mode === "amount") return `${money(currency, v)} off`;
  if (mode === "final") return `Final: ${money(currency, v)}`;
  return "No discount";
}

function svgAvatarDataUrl(label, seed = "A") {
  const letter = (label || seed || "A").trim().slice(0, 1).toUpperCase();
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
  const [toasts, setToasts] = useState([]);
  const push = (message, tone = "info") => {
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
            "rounded-2xl border px-3 py-2 text-sm shadow-sm bg-white dark:bg-slate-900",
            t.tone === "success"
              ? "border-emerald-200 dark:border-emerald-800"
              : t.tone === "warn"
                ? "border-amber-200 dark:border-amber-800"
                : t.tone === "error"
                  ? "border-rose-200 dark:border-rose-800"
                  : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="flex items-start gap-2">
            <span
              className={cx(
                "mt-1.5 h-2 w-2 rounded-full",
                t.tone === "success"
                  ? "bg-emerald-500"
                  : t.tone === "warn"
                    ? "bg-amber-500"
                    : t.tone === "error"
                      ? "bg-rose-500"
                      : "bg-slate-400"
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

function PageHeader({ title, badge, actions }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 truncate">{title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">{badge}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      </div>
    </header>
  );
}

function Pill({ tone = "neutral", children, title }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-400"
        : tone === "bad"
          ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-400"
          : tone === "brand"
            ? "text-white border-transparent"
            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200";

  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", className = "", onClick, disabled, children, title }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "ghost"
        ? "border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
        : tone === "danger"
          ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800";

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(base, cls, className)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, className = "", type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400",
        className
      )}
    />
  );
}

function Select({ value, onChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none text-slate-900 dark:text-slate-100",
        className
      )}
    >
      {children}
    </select>
  );
}

function Drawer({ open, title, subtitle, onClose, children, footer }) {
  return (
    <div className={cx("fixed inset-0 z-[70]", open ? "" : "pointer-events-none")}>
      <div
        className={cx(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cx(
          "absolute top-0 right-0 h-full w-full sm:w-[560px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">{title}</div>
              {subtitle ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
            </div>
            <Btn tone="ghost" onClick={onClose}>
              ✕
            </Btn>
          </div>
          <div className="flex-1 overflow-auto px-4 py-4">{children}</div>
          {footer ? (
            <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30">
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
    <div className="fixed inset-0 z-[85] bg-white dark:bg-slate-950 flex flex-col">
      <div className="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/70 backdrop-blur flex items-center justify-between px-3 sm:px-4 md:px-6">
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-extrabold truncate">{title}</div>
          {subtitle ? <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={onClose}>✕ Close</Btn>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 sm:px-4 md:px-6 py-4 bg-[#f2f2f2] dark:bg-slate-950">{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 sm:px-4 md:px-6 py-3">
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
        "w-full text-left rounded-3xl border p-3 transition shadow-sm",
        active
          ? "border-[#f77f00] bg-amber-50/40 dark:bg-amber-900/20"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{title}</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{desc}</div>
        </div>
        {badge ? <Pill tone={active ? "brand" : "neutral"}>{badge}</Pill> : null}
      </div>
    </button>
  );
}

/* ------------------------- domain model (supplier) ------------------------- */

const STAGES = ["Draft", "Collabs", "Negotiating", "Contracted", "Execution", "Completed", "Terminated"];

const USAGE_DECISIONS = ["I will use a Creator", "I will NOT use a Creator", "I am NOT SURE yet"];
const COLLAB_MODES = ["Open for Collabs", "Invite-only"];
const APPROVAL_MODES = ["Manual", "Auto"]; // Manual means Supplier approves creator assets before Admin

const OFFER_SCOPES = [
  { k: "Products", label: "Products" },
  { k: "Services", label: "Services" },
  { k: "Both", label: "Products & Services" }
];

const PROMO_TYPES = [
  { k: "Discount", label: "Discount" },
  { k: "Bundle", label: "Bundle / Pack" },
  { k: "Coupon", label: "Coupon / Code" },
  { k: "FreeShipping", label: "Free Shipping" },
  { k: "Gift", label: "Gift / Bonus" },
  { k: "Highlight", label: "No Discount (Highlight)" }
];

const PROMO_ARRANGEMENTS = {
  Discount: [
    { k: "PercentOff", label: "% off" },
    { k: "AmountOff", label: "Amount off" },
    { k: "FinalPrice", label: "Set final price" },
    { k: "Tiered", label: "Tiered / volume" },
    { k: "Flash", label: "Flash windows" }
  ],
  Bundle: [
    { k: "BundlePrice", label: "Bundle price" },
    { k: "BuyXGetY", label: "Buy X get Y" },
    { k: "MixMatch", label: "Mix & match" },
    { k: "AddOn", label: "Add-on deal" }
  ],
  Coupon: [
    { k: "InfluencerCode", label: "Influencer code" },
    { k: "CheckoutCode", label: "Checkout code" },
    { k: "AutoApply", label: "Auto-apply" }
  ],
  FreeShipping: [
    { k: "OverThreshold", label: "Over threshold" },
    { k: "SelectedItems", label: "Selected items" },
    { k: "AllOrders", label: "All orders" }
  ],
  Gift: [
    { k: "GiftWithPurchase", label: "Gift with purchase" },
    { k: "BonusService", label: "Bonus service" },
    { k: "FreeUpgrade", label: "Free upgrade" }
  ],
  Highlight: [{ k: "Feature", label: "Feature highlight" }]
};

const DISCOUNT_MODES = [
  { k: "none", label: "No discount" },
  { k: "percent", label: "%" },
  { k: "amount", label: "Amount" },
  { k: "final", label: "Final price" }
];

const HEALTH = {
  "on-track": { dot: "bg-emerald-500", label: "On track" },
  "at-risk": { dot: "bg-amber-500 animate-pulse", label: "At risk" },
  stalled: { dot: "bg-slate-400", label: "Stalled" }
};

function statusTone(stage) {
  const map = {
    Draft: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    Collabs: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700",
    Negotiating: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    Contracted: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
    Execution: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
    Completed: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    Terminated: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700"
  };
  return map[stage] || map.Draft;
}

function canSwitchCollabMode(c) {
  if (c.creatorUsageDecision !== "I will use a Creator") return false;
  return ["Draft", "Collabs", "Negotiating", "Contracted"].includes(c.stage);
}

function inferLifecycleText(c) {
  if (c.creatorUsageDecision === "I will NOT use a Creator") return "Supplier acts as Creator";
  if (c.creatorUsageDecision === "I am NOT SURE yet") return "Creator plan pending";
  return c.collabMode;
}

function approvalText(c) {
  if (c.creatorUsageDecision === "I will use a Creator") return c.approvalMode === "Manual" ? "Manual approval" : "Auto approval";
  return c.approvalMode === "Manual" ? "Internal review" : "Direct to Admin";
}

function approvalStatusPill(approvalStatus) {
  if (approvalStatus === "Pending") return { tone: "warn", label: "Approval pending" };
  if (approvalStatus === "Rejected") return { tone: "bad", label: "Rejected" };
  if (approvalStatus === "Approved") return { tone: "good", label: "Approved" };
  return { tone: "neutral", label: "Not submitted" };
}


/* ------------------------- giveaway source-of-truth helpers ------------------------- */

const GIVEAWAY_PRESETS_BY_SKU = {
  "BC-VC": {
    enabled: true,
    total: 60,
    used: 18,
    allocated: 12,
    lowThreshold: 10,
    updatedAt: "Today · 11:24",
    notes: "Supplier-owned giveaway source of truth for Beauty live sessions.",
    audit: [
      { id: "ga1", at: "Today · 11:24", actor: "Supplier Manager", event: "Raised total stock", delta: "+10", detail: "Expanded giveaway pool for upcoming Live Sessionz." },
      { id: "ga2", at: "Today · 09:10", actor: "Creator Live Builder", event: "Reserved for upcoming live", delta: "-12 available", detail: "Reserved across 2 upcoming sessions." },
      { id: "ga3", at: "Yesterday · 17:45", actor: "Live Studio", event: "Claimed by winners", delta: "-18 used", detail: "Winners confirmed in previous live." }
    ]
  },
  "SN-26": {
    enabled: true,
    total: 20,
    used: 5,
    allocated: 10,
    lowThreshold: 8,
    updatedAt: "Today · 10:03",
    notes: "Running low because 10 units are already reserved for the weekend live.",
    audit: [
      { id: "ga4", at: "Today · 10:03", actor: "Creator Live Builder", event: "Reserved for weekend live", delta: "-10 available", detail: "Reserved by Featured Items > + Add Giveaway." },
      { id: "ga5", at: "Yesterday · 15:10", actor: "Live Studio", event: "Claimed by winners", delta: "-5 used", detail: "Confirmed claims after live." }
    ]
  },
  "SV-SCR": {
    enabled: false,
    total: 0,
    used: 0,
    allocated: 0,
    lowThreshold: 2,
    updatedAt: "Not configured",
    notes: "Supplier has not enabled service giveaway slots yet.",
    audit: []
  },
  "EB-PRO": {
    enabled: true,
    total: 15,
    used: 0,
    allocated: 4,
    lowThreshold: 5,
    updatedAt: "Yesterday · 18:40",
    notes: "Ready to sync to Creator Builder after campaign approval.",
    audit: [
      { id: "ga6", at: "Yesterday · 18:40", actor: "Supplier Owner", event: "Initialized giveaway stock", delta: "+15", detail: "Prepared before approval." },
      { id: "ga7", at: "Yesterday · 18:55", actor: "Creator Live Builder", event: "Pre-reserved draft", delta: "-4 available", detail: "Draft live allocation preview." }
    ]
  },
  "SV-WA": {
    enabled: true,
    total: 6,
    used: 1,
    allocated: 2,
    lowThreshold: 2,
    updatedAt: "Yesterday · 16:15",
    notes: "Service giveaway works as limited slots / vouchers.",
    audit: [
      { id: "ga8", at: "Yesterday · 16:15", actor: "Supplier Manager", event: "Configured service slots", delta: "+6", detail: "Service giveaway slot model enabled." },
      { id: "ga9", at: "Yesterday · 16:50", actor: "Live Studio", event: "Claimed slot", delta: "-1 used", detail: "One service voucher already won." }
    ]
  }
};

function cloneGiveawayAudit(entries) {
  return Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : [];
}

function defaultGiveawayPreset(item) {
  const preset = GIVEAWAY_PRESETS_BY_SKU[item?.sku] || null;
  if (preset) {
    return { ...preset, audit: cloneGiveawayAudit(preset.audit) };
  }

  return {
    enabled: false,
    total: 0,
    used: 0,
    allocated: 0,
    lowThreshold: item?.kind === "Service" ? 2 : 5,
    updatedAt: "Not configured",
    notes: item?.kind === "Service" ? "Service giveaway slots not yet configured." : "Giveaway stock not yet enabled.",
    audit: []
  };
}

function giveawayAvailability(item) {
  return Math.max(
    0,
    Number(item?.giveaway?.total || 0) - Number(item?.giveaway?.used || 0) - Number(item?.giveaway?.allocated || 0)
  );
}

function giveawayHealthTone(item) {
  const available = Number(item?.giveaway?.total || 0) - Number(item?.giveaway?.used || 0) - Number(item?.giveaway?.allocated || 0);
  if (!item?.giveaway?.enabled) return { tone: "neutral", label: "Disabled" };
  if (available < 0) return { tone: "bad", label: "Over-allocated" };
  if (available <= Number(item?.giveaway?.lowThreshold || 0)) return { tone: "warn", label: "Low availability" };
  return { tone: "good", label: "Healthy" };
}

function ensureGiveaway(item) {
  if (!item) return item;
  const fallback = defaultGiveawayPreset(item);
  const merged = {
    ...fallback,
    ...(item.giveaway || {})
  };
  return {
    ...item,
    giveaway: {
      ...merged,
      total: Math.max(0, Number(merged.total || 0)),
      used: Math.max(0, Number(merged.used || 0)),
      allocated: Math.max(0, Number(merged.allocated || 0)),
      lowThreshold: Math.max(0, Number(merged.lowThreshold || 0)),
      updatedAt: merged.updatedAt || "Now",
      notes: merged.notes || "",
      audit: cloneGiveawayAudit(merged.audit)
    }
  };
}

function ensureGiveawayExtra(item) {
  if (!item) return item;
  const fallback = defaultGiveawayPreset(item);
  const merged = {
    ...fallback,
    ...(item.giveaway || {})
  };
  const assetPreview = item.assetPreview || item.avatar || svgAvatarDataUrl(item.title || "G", item.id || item.title || "G");
  return {
    ...item,
    isGiveawayExtra: true,
    sourceType: item.sourceType || "external",
    sourceLabel:
      item.sourceLabel ||
      (item.sourceType === "inventory"
        ? "Inventory item"
        : item.sourceType === "featured"
          ? "Featured campaign item"
          : "External giveaway item"),
    linkedCatalogItemId: item.linkedCatalogItemId || "",
    linkedCampaignItemId: item.linkedCampaignItemId || "",
    assetId: item.assetId || "",
    assetTitle: item.assetTitle || "",
    assetDimensions: item.assetDimensions || "",
    assetPreview,
    avatar: assetPreview,
    plannedQty: Math.max(1, Number(item.plannedQty || 1)),
    price: Math.max(0, Number(item.price || 0)),
    discountedPrice: Math.max(0, Number(item.discountedPrice || 0)),
    discountLabel: item.discountLabel || "Giveaway only",
    giveaway: {
      ...merged,
      enabled: merged.enabled !== false,
      total: Math.max(0, Number(merged.total || 0)),
      used: Math.max(0, Number(merged.used || 0)),
      allocated: Math.max(0, Number(merged.allocated || 0)),
      lowThreshold: Math.max(0, Number(merged.lowThreshold || 0)),
      updatedAt: merged.updatedAt || "Now",
      notes: merged.notes || "",
      audit: cloneGiveawayAudit(merged.audit)
    }
  };
}

function getCampaignGiveawayNodes(campaign) {
  if (!campaign) return [];
  const itemNodes = Array.isArray(campaign.items)
    ? campaign.items.map((item) => {
        const normalized = ensureGiveaway(item);
        return {
          ...normalized,
          isGiveawayExtra: false,
          sourceType: "campaign-item",
          sourceLabel: "Campaign item",
          linkedCampaignItemId: normalized.id,
          assetId: normalized.assetId || "",
          assetTitle: normalized.assetTitle || "",
          assetDimensions: normalized.assetDimensions || "",
          assetPreview: normalized.assetPreview || normalized.avatar || ""
        };
      })
    : [];
  const extraNodes = Array.isArray(campaign.giveawayExtras) ? campaign.giveawayExtras.map((item) => ensureGiveawayExtra(item)) : [];
  return [...itemNodes, ...extraNodes];
}

function hydrateCampaignGiveaway(campaign) {
  if (!campaign) return campaign;
  return {
    ...campaign,
    items: Array.isArray(campaign.items) ? campaign.items.map((item) => ensureGiveaway(item)) : [],
    giveawayExtras: Array.isArray(campaign.giveawayExtras) ? campaign.giveawayExtras.map((item) => ensureGiveawayExtra(item)) : []
  };
}

function calcCampaignGiveawayTotals(campaign) {
  const empty = { total: 0, used: 0, allocated: 0, available: 0, enabledCount: 0 };
  const nodes = getCampaignGiveawayNodes(campaign);
  if (!nodes.length) return empty;
  return nodes.reduce((acc, item) => {
    acc.total += Number(item?.giveaway?.total || 0);
    acc.used += Number(item?.giveaway?.used || 0);
    acc.allocated += Number(item?.giveaway?.allocated || 0);
    acc.available += giveawayAvailability(item);
    if (item?.giveaway?.enabled) acc.enabledCount += 1;
    return acc;
  }, empty);
}

function sumAllGiveawayTotals(campaigns) {
  return (campaigns || []).reduce(
    (acc, campaign) => {
      const totals = calcCampaignGiveawayTotals(campaign);
      acc.total += totals.total;
      acc.used += totals.used;
      acc.allocated += totals.allocated;
      acc.available += totals.available;
      acc.enabledCount += totals.enabledCount;
      return acc;
    },
    { total: 0, used: 0, allocated: 0, available: 0, enabledCount: 0 }
  );
}

function buildCreatorGiveawayPayload(campaign, item) {
  if (!campaign || !item) return null;
  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    itemId: item.id,
    itemTitle: item.title,
    itemKind: item.kind,
    sourceType: item.isGiveawayExtra ? item.sourceType : "campaign-item",
    sourceLabel: item.sourceLabel || (item.isGiveawayExtra ? "Standalone giveaway item" : "Campaign item"),
    linkedCatalogItemId: item.linkedCatalogItemId || "",
    linkedCampaignItemId: item.linkedCampaignItemId || "",
    assetId: item.assetId || "",
    assetTitle: item.assetTitle || "",
    assetDimensions: item.assetDimensions || "",
    imagePoster: item.assetPreview || item.avatar || "",
    giveawayEnabled: !!item?.giveaway?.enabled,
    totalGiveawayQuantity: Number(item?.giveaway?.total || 0),
    usedGiveawayQuantity: Number(item?.giveaway?.used || 0),
    allocatedGiveawayQuantity: Number(item?.giveaway?.allocated || 0),
    currentlyAvailableQuantity: giveawayAvailability(item),
    lowAvailabilityThreshold: Number(item?.giveaway?.lowThreshold || 0),
    supplierLastUpdatedAt: item?.giveaway?.updatedAt || "Now",
    notes: item?.giveaway?.notes || ""
  };
}


/* ------------------------- catalog dataset (preview) ------------------------- */

const CATALOG_ITEMS = [
  {
    id: "P-1001",
    kind: "Product",
    title: "LED Ring Light Kit",
    category: "Electronics",
    price: 45,
    region: "Global",
    subtitle: "Tripod + phone holder + carry bag",
    sku: "RL-01"
  },
  {
    id: "P-1002",
    kind: "Product",
    title: "Wireless Earbuds Pro",
    category: "Electronics",
    price: 29,
    region: "Africa / Asia",
    subtitle: "Noise reduction, 24h battery",
    sku: "EB-PRO"
  },
  {
    id: "P-1003",
    kind: "Product",
    title: "Vitamin C Serum Bundle",
    category: "Beauty",
    price: 18,
    region: "East Africa",
    subtitle: "Brightening + hydration",
    sku: "BC-VC"
  },
  {
    id: "P-1004",
    kind: "Product",
    title: "Men’s Sneakers (2026)",
    category: "Fashion",
    price: 34,
    region: "Global",
    subtitle: "Lightweight, breathable",
    sku: "SN-26"
  },
  {
    id: "S-2001",
    kind: "Service",
    title: "WhatsApp Catalog Setup",
    category: "Services",
    price: 120,
    region: "Africa",
    subtitle: "Upload items + tags + pricing",
    sku: "SV-WA"
  },
  {
    id: "S-2002",
    kind: "Service",
    title: "Influencer Script Writing",
    category: "Creative",
    price: 80,
    region: "Global",
    subtitle: "Hooks + CTA + objections",
    sku: "SV-SCR"
  },
  {
    id: "S-2003",
    kind: "Service",
    title: "Product Photography",
    category: "Creative",
    price: 150,
    region: "East Africa",
    subtitle: "10 edits, studio lighting",
    sku: "SV-PH"
  },
  {
    id: "S-2004",
    kind: "Service",
    title: "Adz Media Buying",
    category: "Marketing",
    price: 220,
    region: "Global",
    subtitle: "Setup + optimization",
    sku: "SV-ADS"
  }
].map((it) => ({
  ...it,
  avatar: svgAvatarDataUrl(it.title, it.id)
}));

const APPROVED_ASSET_LIBRARY = [
  {
    id: "AS-501",
    title: "Approved Serum Giveaway Poster",
    kind: "Poster",
    dimensions: "500 × 500 px",
    linkedCatalogItemId: "P-1003",
    preview: svgAvatarDataUrl("Serum", "AS-501"),
    status: "Approved"
  },
  {
    id: "AS-502",
    title: "Approved Ring Light Poster",
    kind: "Poster",
    dimensions: "500 × 500 px",
    linkedCatalogItemId: "P-1001",
    preview: svgAvatarDataUrl("Ring", "AS-502"),
    status: "Approved"
  },
  {
    id: "AS-503",
    title: "Approved Earbuds Poster",
    kind: "Poster",
    dimensions: "500 × 500 px",
    linkedCatalogItemId: "P-1002",
    preview: svgAvatarDataUrl("Earbuds", "AS-503"),
    status: "Approved"
  },
  {
    id: "AS-504",
    title: "Approved VIP Giveaway Bundle Poster",
    kind: "Poster",
    dimensions: "500 × 500 px",
    linkedCatalogItemId: "",
    preview: svgAvatarDataUrl("VIP", "AS-504"),
    status: "Approved"
  },
  {
    id: "AS-505",
    title: "Approved Service Voucher Poster",
    kind: "Poster",
    dimensions: "480 × 480 px",
    linkedCatalogItemId: "S-2001",
    preview: svgAvatarDataUrl("Voucher", "AS-505"),
    status: "Approved"
  }
];

function getApprovedAssetById(id) {
  return APPROVED_ASSET_LIBRARY.find((asset) => asset.id === id) || null;
}

function getApprovedAssetForCatalogItem(catalogItemId) {
  if (!catalogItemId) return null;
  return APPROVED_ASSET_LIBRARY.find((asset) => asset.linkedCatalogItemId === catalogItemId) || null;
}

/* ------------------------- Catalog Page modal (selection) ------------------------- */

function CatalogCampaignPickerPage({
  open,
  onClose,
  initialKind,
  allowProducts,
  allowServices,
  campaignCurrency,
  promoDefaults,
  existingSelectedItems,
  onConfirm
}) {
  const [activeKind, setActiveKind] = useState(initialKind || "Product");
  const [q, setQ] = useState("");

  // draft map: id -> { selected, qty, discountMode, discountValue }
  const [draft, setDraft] = useState({});

  useEffect(() => {
    if (!open) return;

    // init active tab
    if (initialKind === "Product" && !allowProducts && allowServices) setActiveKind("Service");
    else if (initialKind === "Service" && !allowServices && allowProducts) setActiveKind("Product");
    else setActiveKind(initialKind || (allowProducts ? "Product" : "Service"));

    // seed draft from existing selection + promo defaults
    const byId = {};
    (existingSelectedItems || []).forEach((sel) => {
      byId[sel.id] = {
        selected: true,
        qty: safeNum(sel.plannedQty, 1),
        discountMode: sel.discount?.mode || "none",
        discountValue: safeNum(sel.discount?.value, 0)
      };
    });

    // ensure all visible items have state
    CATALOG_ITEMS.forEach((it) => {
      if (byId[it.id]) return;
      byId[it.id] = {
        selected: false,
        qty: 1,
        discountMode: promoDefaults?.defaultDiscountMode || "none",
        discountValue: safeNum(promoDefaults?.defaultDiscountValue, 0)
      };
    });

    setDraft(byId);
    setQ("");
  }, [open, initialKind, allowProducts, allowServices, existingSelectedItems, promoDefaults]);

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return CATALOG_ITEMS.filter((it) => {
      if (activeKind === "Product" && it.kind !== "Product") return false;
      if (activeKind === "Service" && it.kind !== "Service") return false;
      if (!qq) return true;
      const hay = `${it.title} ${it.subtitle} ${it.category} ${it.region} ${it.sku}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [activeKind, q]);

  const selectedItems = useMemo(() => {
    const out = [];
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
        discountLabel: formatDiscount(s.discountMode, s.discountValue, campaignCurrency)
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
        Selected: <span className="font-extrabold">{selectedCount}</span> · Tab total: <span className="font-extrabold">{money(campaignCurrency, totalPlanned)}</span>
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
            onClick={() => setActiveKind("Product")}
            className={cx(activeKind === "Product" ? "border-transparent text-white" : "")}
            tone={activeKind === "Product" ? "primary" : "neutral"}
            title={allowProducts ? "Show Products" : "Products disabled by scope"}
          >
            🧺 Products
          </Btn>
          <Btn
            disabled={!allowServices}
            onClick={() => setActiveKind("Service")}
            className={cx(activeKind === "Service" ? "border-transparent text-white" : "")}
            tone={activeKind === "Service" ? "primary" : "neutral"}
            title={allowServices ? "Show Services" : "Services disabled by scope"}
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
                These defaults prefill discount fields for newly selected items. You can override per item.
              </div>
            </div>
            <Pill tone="brand">{promoDefaults?.promoTypeLabel || "Promo"}</Pill>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill tone="neutral">Arrangement: <span className="font-extrabold">{promoDefaults?.promoArrangementLabel || "—"}</span></Pill>
            <Pill tone="neutral">Default discount: <span className="font-extrabold">{formatDiscount(promoDefaults?.defaultDiscountMode, promoDefaults?.defaultDiscountValue, campaignCurrency)}</span></Pill>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Item</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Qty planned</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Current price</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Discount</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Discounted price</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Add</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it) => {
                  const s = draft[it.id] || { selected: false, qty: 1, discountMode: "none", discountValue: 0 };
                  const discounted = calcDiscountedPrice(it.price, s.discountMode, s.discountValue);
                  const discountLabel = formatDiscount(s.discountMode, s.discountValue, campaignCurrency);
                  return (
                    <tr key={it.id} className={cx("hover:bg-slate-50 dark:hover:bg-slate-800/30", s.selected ? "bg-amber-50/30 dark:bg-amber-900/10" : "")}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={it.avatar} alt="avatar" className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-700" />
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold truncate text-slate-900 dark:text-slate-50">{it.title}</div>
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
                              [it.id]: { ...prev[it.id], qty: v }
                            }));
                          }}
                          className="w-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-bold outline-none"
                          title="Quantity planned for campaign"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{money(campaignCurrency, it.price)}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Current</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={s.discountMode}
                            onChange={(e) => {
                              const nextMode = e.target.value;
                              setDraft((prev) => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], discountMode: nextMode }
                              }));
                            }}
                            className="w-32 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-bold outline-none"
                          >
                            {DISCOUNT_MODES.map((m) => (
                              <option key={m.k} value={m.k}>
                                {m.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            disabled={s.discountMode === "none"}
                            value={s.discountValue}
                            onChange={(e) => {
                              const v = Math.max(0, safeNum(e.target.value, 0));
                              setDraft((prev) => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], discountValue: v }
                              }));
                            }}
                            className={cx(
                              "w-28 rounded-2xl border px-3 py-2 text-sm font-bold outline-none",
                              s.discountMode === "none"
                                ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                            )}
                            title="Discount value (% / amount / final price)"
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{discountLabel}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{money(campaignCurrency, discounted)}</div>
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
                                [it.id]: { ...prev[it.id], selected: !prev[it.id]?.selected }
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
          Integration note: In production, this is a real Catalog route. Selections are returned to Campaign Builder via router state, URL params, or global store.
        </div>
      </div>
    </FullscreenModal>
  );
}

/* ------------------------- seed campaigns ------------------------- */

const INIT_CAMPAIGNS = [
  {
    id: "S-201",
    name: "Beauty Flash Week (Combo)",
    stage: "Execution",
    approvalStatus: "Approved",
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Open for Collabs",
    approvalMode: "Manual",
    offerScope: "Products",
    promoType: "Discount",
    promoArrangement: "PercentOff",
    currency: "USD",
    estValue: 2400,
    region: "East Africa",
    type: "Shoppable Adz + Live",
    startDate: "2026-02-10",
    durationDays: 14,
    endDate: computeEndDate("2026-02-10", 14),
    items: [
      {
        ...CATALOG_ITEMS[2],
        plannedQty: 40,
        discount: { mode: "percent", value: 15 },
        discountedPrice: calcDiscountedPrice(CATALOG_ITEMS[2].price, "percent", 15),
        discountLabel: formatDiscount("percent", 15, "USD")
      },
      {
        ...CATALOG_ITEMS[3],
        plannedQty: 25,
        discount: { mode: "amount", value: 5 },
        discountedPrice: calcDiscountedPrice(CATALOG_ITEMS[3].price, "amount", 5),
        discountLabel: formatDiscount("amount", 5, "USD")
      }
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
    health: "on-track",
    nextAction: "Approve Creator Clip #3",
    lastActivity: "Assets submitted · 2h",
    lastActivityAt: Date.now() - 2 * 60 * 60 * 1000
  },
  {
    id: "S-202",
    name: "Tech Friday Mega Live",
    stage: "Draft",
    approvalStatus: "Pending",
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Invite-only",
    approvalMode: "Manual",
    offerScope: "Products",
    promoType: "Coupon",
    promoArrangement: "InfluencerCode",
    promoCode: "TECHFRIDAY",
    currency: "USD",
    estValue: 3100,
    region: "Africa / Asia",
    type: "Live Sessionz",
    startDate: "2026-02-25",
    durationDays: 10,
    endDate: computeEndDate("2026-02-25", 10),
    items: [
      {
        ...CATALOG_ITEMS[1],
        plannedQty: 60,
        discount: { mode: "percent", value: 10 },
        discountedPrice: calcDiscountedPrice(CATALOG_ITEMS[1].price, "percent", 10),
        discountLabel: formatDiscount("percent", 10, "USD")
      }
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
    health: "at-risk",
    nextAction: "Await Admin approval",
    lastActivity: "Submitted for approval · 1d",
    lastActivityAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    queuedStageAfterApproval: "Collabs",
    queuedNextActionAfterApproval: "Invite creators"
  }
];

/* ------------------------- main component ------------------------- */

export default function SupplierMyCampaignsPage() {
  const { toasts, push } = useToasts();

  const [campaigns, setCampaigns] = useState(() => INIT_CAMPAIGNS.map((campaign) => hydrateCampaignGiveaway(campaign)));

  const [activeStageFilter, setActiveStageFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [sortKey, setSortKey] = useState("estValue");
  const [sortOrder, setSortOrder] = useState("desc");

  const [builderOpen, setBuilderOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [giveawayEditorOpen, setGiveawayEditorOpen] = useState(false);
  const [giveawayEditorCampaignId, setGiveawayEditorCampaignId] = useState(null);
  const [giveawayEditorItemId, setGiveawayEditorItemId] = useState(null);
  const [giveawayDraftEnabled, setGiveawayDraftEnabled] = useState(false);
  const [giveawayDraftTotal, setGiveawayDraftTotal] = useState("0");
  const [giveawayDraftLowThreshold, setGiveawayDraftLowThreshold] = useState("0");
  const [giveawayDraftNotes, setGiveawayDraftNotes] = useState("");
  const [savingGiveaway, setSavingGiveaway] = useState(false);
  const [giveawayAddOpen, setGiveawayAddOpen] = useState(false);
  const [giveawayAddCampaignId, setGiveawayAddCampaignId] = useState(null);
  const [giveawayAddSource, setGiveawayAddSource] = useState("featured");
  const [giveawayAddFeaturedItemId, setGiveawayAddFeaturedItemId] = useState("");
  const [giveawayAddCatalogItemId, setGiveawayAddCatalogItemId] = useState("");
  const [giveawayAddExternalTitle, setGiveawayAddExternalTitle] = useState("");
  const [giveawayAddExternalSubtitle, setGiveawayAddExternalSubtitle] = useState("");
  const [giveawayAddExternalKind, setGiveawayAddExternalKind] = useState("Product");
  const [giveawayAddExternalSku, setGiveawayAddExternalSku] = useState("");
  const [giveawayAddAssetId, setGiveawayAddAssetId] = useState("");
  const [giveawayAddTotal, setGiveawayAddTotal] = useState("10");
  const [giveawayAddLowThreshold, setGiveawayAddLowThreshold] = useState("2");
  const [giveawayAddNotes, setGiveawayAddNotes] = useState("Use an approved Asset Library poster for this giveaway item.");
  const [savingGiveawayAdd, setSavingGiveawayAdd] = useState(false);

  // Catalog page state
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogKind, setCatalogKind] = useState("Product");

  const [builderStep, setBuilderStep] = useState(1);
  const [builder, setBuilder] = useState(() => ({
    name: "",
    type: "Shoppable Adz",
    region: "East Africa",
    currency: "USD",
    estValue: 1000,

    // duration
    startDate: todayYMD(),
    durationDays: 7, // min 1 max 45

    // promo
    promoType: "Discount",
    promoArrangement: "PercentOff",
    promoCode: "",
    shippingThreshold: 0,
    giftNote: "",

    // offer scope
    offerScope: "Products",

    // discount defaults (used by catalog)
    defaultDiscountMode: "percent",
    defaultDiscountValue: 10,

    // selected items (campaign catalog)
    items: [],

    // flow
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Open for Collabs",
    approvalMode: "Manual",
    allowMultiCreators: true,

    notes: "",
    internalOwner: "Supplier Manager"
  }));

  const builderEndDate = useMemo(() => computeEndDate(builder.startDate, builder.durationDays), [builder.startDate, builder.durationDays]);

  const promoLabels = useMemo(() => {
    const promoTypeLabel = (PROMO_TYPES.find((p) => p.k === builder.promoType)?.label) || builder.promoType;
    const promoArrangementLabel =
      (PROMO_ARRANGEMENTS[builder.promoType]?.find((a) => a.k === builder.promoArrangement)?.label) || builder.promoArrangement;
    return { promoTypeLabel, promoArrangementLabel };
  }, [builder.promoType, builder.promoArrangement]);

  const totals = useMemo(() => {
    const totalValue = campaigns.reduce((sum, c) => sum + (Number(c.estValue) || 0), 0);
    const activeCount = campaigns.filter((c) => ["Collabs", "Negotiating", "Contracted", "Execution"].includes(c.stage)).length;
    const pendingApprovals = campaigns.filter(
      (c) => c.pendingSupplierApproval || c.pendingAdminApproval || c.adminRejected || c.approvalStatus === "Pending"
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
      notSure: { count: 0 }
    };
    campaigns.forEach((c) => {
      if (c.creatorUsageDecision === "I will use a Creator") base.useCreator.count += 1;
      else if (c.creatorUsageDecision === "I will NOT use a Creator") base.supplierAsCreator.count += 1;
      else base.notSure.count += 1;
    });
    return base;
  }, [campaigns]);

  useEffect(() => {
    if (!activeCampaign?.id) return;
    const fresh = campaigns.find((campaign) => campaign.id === activeCampaign.id);
    if (fresh && fresh !== activeCampaign) {
      setActiveCampaign(fresh);
    }
  }, [campaigns, activeCampaign?.id]);

  const overallGiveawayTotals = useMemo(() => sumAllGiveawayTotals(campaigns), [campaigns]);
  const activeCampaignGiveawayTotals = useMemo(
    () => (activeCampaign ? calcCampaignGiveawayTotals(activeCampaign) : { total: 0, used: 0, allocated: 0, available: 0, enabledCount: 0 }),
    [activeCampaign]
  );
  const activeCampaignGiveawayNodes = useMemo(() => getCampaignGiveawayNodes(activeCampaign), [activeCampaign]);
  const giveawayEditorCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === giveawayEditorCampaignId) || null,
    [campaigns, giveawayEditorCampaignId]
  );
  const giveawayEditorItem = useMemo(
    () => getCampaignGiveawayNodes(giveawayEditorCampaign).find((item) => item.id === giveawayEditorItemId) || null,
    [giveawayEditorCampaign, giveawayEditorItemId]
  );
  const giveawayCommittedQty = useMemo(
    () => Number(giveawayEditorItem?.giveaway?.used || 0) + Number(giveawayEditorItem?.giveaway?.allocated || 0),
    [giveawayEditorItem]
  );
  const giveawayCreatorPayload = useMemo(
    () => buildCreatorGiveawayPayload(giveawayEditorCampaign, giveawayEditorItem),
    [giveawayEditorCampaign, giveawayEditorItem]
  );

  useEffect(() => {
    if (!giveawayEditorItem) return;
    setGiveawayDraftEnabled(!!giveawayEditorItem.giveaway?.enabled);
    setGiveawayDraftTotal(String(giveawayEditorItem.giveaway?.total ?? 0));
    setGiveawayDraftLowThreshold(String(giveawayEditorItem.giveaway?.lowThreshold ?? (giveawayEditorItem.kind === "Service" ? 2 : 5)));
    setGiveawayDraftNotes(giveawayEditorItem.giveaway?.notes || "");
  }, [giveawayEditorItem]);

  const giveawayAddCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === giveawayAddCampaignId) || null,
    [campaigns, giveawayAddCampaignId]
  );
  const giveawayAddFeaturedCandidates = useMemo(
    () => (giveawayAddCampaign?.items || []).map((item) => ensureGiveaway(item)),
    [giveawayAddCampaign]
  );
  const giveawayAddFeaturedItem = useMemo(
    () => giveawayAddFeaturedCandidates.find((item) => item.id === giveawayAddFeaturedItemId) || null,
    [giveawayAddFeaturedCandidates, giveawayAddFeaturedItemId]
  );
  const giveawayAddInventoryCandidates = useMemo(() => {
    const attachedIds = new Set((giveawayAddCampaign?.items || []).map((item) => item.id));
    return CATALOG_ITEMS.filter((item) => !attachedIds.has(item.id));
  }, [giveawayAddCampaign]);
  const giveawayAddCatalogItem = useMemo(
    () => giveawayAddInventoryCandidates.find((item) => item.id === giveawayAddCatalogItemId) || null,
    [giveawayAddInventoryCandidates, giveawayAddCatalogItemId]
  );
  const giveawayAddAsset = useMemo(() => getApprovedAssetById(giveawayAddAssetId), [giveawayAddAssetId]);
  const giveawayAddCommittedQty = useMemo(
    () => (giveawayAddSource === "featured" && giveawayAddFeaturedItem ? Number(giveawayAddFeaturedItem.giveaway?.used || 0) + Number(giveawayAddFeaturedItem.giveaway?.allocated || 0) : 0),
    [giveawayAddSource, giveawayAddFeaturedItem]
  );

  useEffect(() => {
    if (!giveawayAddOpen) return;
    if (!giveawayAddAssetId && giveawayAddSource === "inventory" && giveawayAddCatalogItem) {
      const suggested = getApprovedAssetForCatalogItem(giveawayAddCatalogItem.id);
      if (suggested) setGiveawayAddAssetId(suggested.id);
    }
    if (!giveawayAddAssetId && giveawayAddSource === "featured" && giveawayAddFeaturedItem) {
      const suggested = getApprovedAssetForCatalogItem(giveawayAddFeaturedItem.id);
      if (suggested) setGiveawayAddAssetId(suggested.id);
    }
  }, [giveawayAddOpen, giveawayAddSource, giveawayAddCatalogItem, giveawayAddFeaturedItem, giveawayAddAssetId]);

  const parsedGiveawayDraftTotal = Number(giveawayDraftTotal || 0);
  const parsedGiveawayLowThreshold = Number(giveawayDraftLowThreshold || 0);
  const giveawayDraftInvalid =
    giveawayDraftEnabled &&
    (Number.isNaN(parsedGiveawayDraftTotal) ||
      parsedGiveawayDraftTotal < giveawayCommittedQty ||
      parsedGiveawayDraftTotal < 0 ||
      Number.isNaN(parsedGiveawayLowThreshold) ||
      parsedGiveawayLowThreshold < 0);

  const parsedGiveawayAddTotal = Number(giveawayAddTotal || 0);
  const parsedGiveawayAddLowThreshold = Number(giveawayAddLowThreshold || 0);
  const giveawayAddRequiresAsset = giveawayAddSource === "inventory" || giveawayAddSource === "external";
  const giveawayAddInvalid =
    !giveawayAddCampaign ||
    Number.isNaN(parsedGiveawayAddTotal) ||
    parsedGiveawayAddTotal < giveawayAddCommittedQty ||
    parsedGiveawayAddTotal < 0 ||
    Number.isNaN(parsedGiveawayAddLowThreshold) ||
    parsedGiveawayAddLowThreshold < 0 ||
    (giveawayAddSource === "featured" && !giveawayAddFeaturedItem) ||
    (giveawayAddSource === "inventory" && !giveawayAddCatalogItem) ||
    (giveawayAddSource === "external" && !String(giveawayAddExternalTitle || "").trim()) ||
    (giveawayAddRequiresAsset && !giveawayAddAsset);

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = campaigns.filter((c) => {
      if (activeStageFilter !== "All" && c.stage !== activeStageFilter) return false;
      if (q) {
        const hay = `${c.name} ${c.type} ${c.region} ${c.creatorUsageDecision} ${c.collabMode} ${c.startDate || ""} ${c.endDate || ""} ${c.approvalStatus || ""} ${c.promoType || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const numericKeys = new Set(["estValue", "lastActivityAt"]);
      if (numericKeys.has(sortKey)) {
        const na = Number(va) || 0;
        const nb = Number(vb) || 0;
        if (na < nb) return sortOrder === "asc" ? -1 : 1;
        if (na > nb) return sortOrder === "asc" ? 1 : -1;
        return 0;
      }
      const sa = String(va || "");
      const sb = String(vb || "");
      const cmp = sa.localeCompare(sb);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [campaigns, activeStageFilter, search, sortKey, sortOrder]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  function openCreate() {
    setBuilderStep(1);
    setBuilder((p) => ({
      ...p,
      name: "",
      estValue: 1000,
      startDate: todayYMD(),
      durationDays: 7,
      promoType: "Discount",
      promoArrangement: "PercentOff",
      promoCode: "",
      shippingThreshold: 0,
      giftNote: "",
      offerScope: "Products",
      defaultDiscountMode: "percent",
      defaultDiscountValue: 10,
      items: [],
      creatorUsageDecision: "I will use a Creator",
      collabMode: "Open for Collabs",
      approvalMode: "Manual",
      allowMultiCreators: true,
      notes: ""
    }));
    setBuilderOpen(true);
  }

  function openDetails(c) {
    setActiveCampaign(c);
    setDetailsOpen(true);
  }

  function allowProducts(scope) {
    return scope === "Products" || scope === "Both";
  }

  function allowServices(scope) {
    return scope === "Services" || scope === "Both";
  }

  function openCatalog(kind) {
    // Navigate to real catalog page (preview stub) + open in-app catalog page modal
    push("Opening Catalog page… (preview)", "info");
    go(`/supplier/overview/dealz-marketplace?selectForCampaign=1&kind=${kind}`);
    setCatalogKind(kind);
    setCatalogOpen(true);
  }

  function applyDefaultDiscountToSelected() {
    const mode = builder.defaultDiscountMode;
    const val = safeNum(builder.defaultDiscountValue, 0);
    setBuilder((p) => ({
      ...p,
      items: (p.items || []).map((it) => {
        const discountedPrice = calcDiscountedPrice(it.price, mode, val);
        return {
          ...it,
          discount: { mode, value: val },
          discountedPrice,
          discountLabel: formatDiscount(mode, val, p.currency)
        };
      })
    }));
    push("Default discount applied to selected items.", "success");
  }

  function saveDraft() {
    upsertCampaign({ submitForApproval: false });
  }

  function submitForApproval() {
    upsertCampaign({ submitForApproval: true });
  }

  function upsertCampaign({ submitForApproval }) {
    const name = String(builder.name || "").trim();
    if (!name) {
      push("Campaign name is required.", "error");
      return;
    }

    // duration rules
    const durationDays = clamp(builder.durationDays, 1, 45);
    const startDate = builder.startDate;
    const endDate = computeEndDate(startDate, durationDays);

    if (submitForApproval) {
      if (!startDate) {
        push("Start date is required.", "error");
        return;
      }
      if (!durationDays || durationDays < 1 || durationDays > 45) {
        push("Duration must be between 1 and 45 days.", "error");
        return;
      }
      if (!Array.isArray(builder.items) || builder.items.length === 0) {
        push("Please add at least one Product or Service to the campaign.", "error");
        return;
      }
      if (!builder.promoType) {
        push("Promo type is required.", "error");
        return;
      }
      if (!builder.promoArrangement) {
        push("Promo arrangement is required.", "error");
        return;
      }
    }

    const id = uid("S");

    // after approval routing
    let queuedStageAfterApproval = "Draft";
    let queuedNextActionAfterApproval = "Complete setup";

    if (builder.creatorUsageDecision === "I will NOT use a Creator") {
      queuedStageAfterApproval = "Execution";
      queuedNextActionAfterApproval = "Upload content (Supplier as Creator)";
    } else if (builder.creatorUsageDecision === "I will use a Creator") {
      queuedStageAfterApproval = "Collabs";
      queuedNextActionAfterApproval = builder.collabMode === "Invite-only" ? "Invite creators" : "Await pitches";
    } else {
      queuedStageAfterApproval = "Draft";
      queuedNextActionAfterApproval = "Choose creator plan (pending)";
    }

    const newCampaign = {
      id,
      name,
      type: builder.type,
      region: builder.region,
      currency: builder.currency,
      estValue: clamp(builder.estValue, 0, 100000000),

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
      giveawayExtras: [],

      // flow
      creatorUsageDecision: builder.creatorUsageDecision,
      collabMode: builder.creatorUsageDecision === "I will use a Creator" ? builder.collabMode : "—",
      approvalMode: builder.approvalMode,
      allowMultiCreators: builder.allowMultiCreators,

      // campaign approval gating
      approvalStatus: submitForApproval ? "Pending" : "NotSubmitted",
      pendingAdminApproval: submitForApproval,
      adminRejected: false,

      // stage is Draft until Admin approval
      stage: "Draft",
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
      health: submitForApproval ? "on-track" : "stalled",
      nextAction: submitForApproval ? "Await Admin approval" : "Complete setup",
      lastActivity: submitForApproval ? "Submitted for approval · now" : "Draft saved · now",
      lastActivityAt: Date.now(),

      notes: builder.notes,
      internalOwner: builder.internalOwner
    };

    const hydratedNewCampaign = hydrateCampaignGiveaway(newCampaign);
    setCampaigns((xs) => [hydratedNewCampaign, ...xs]);
    setBuilderOpen(false);
    push(submitForApproval ? "Campaign submitted for Admin approval." : "Draft saved.", submitForApproval ? "success" : "info");

    setTimeout(() => {
      openDetails(hydratedNewCampaign);
    }, 0);
  }

  function simulateAdminDecision(c, decision) {
    if (decision === "approve") {
      push("Admin approved (preview).", "success");
      setCampaigns((xs) =>
        xs.map((x) => {
          if (x.id !== c.id) return x;
          return {
            ...x,
            approvalStatus: "Approved",
            pendingAdminApproval: false,
            stage: x.queuedStageAfterApproval || x.stage,
            nextAction: x.queuedNextActionAfterApproval || x.nextAction,
            lastActivity: "Admin approved · now",
            lastActivityAt: Date.now(),
            health: "on-track"
          };
        })
      );
      return;
    }

    push("Admin rejected (preview).", "warn");
    setCampaigns((xs) =>
      xs.map((x) => {
        if (x.id !== c.id) return x;
        return {
          ...x,
          approvalStatus: "Rejected",
          pendingAdminApproval: false,
          adminRejected: true,
          stage: "Draft",
          nextAction: "Fix and resubmit",
          lastActivity: "Admin rejected · now",
          lastActivityAt: Date.now(),
          health: "at-risk"
        };
      })
    );
  }

  function resubmitAfterRejection(c) {
    push("Resubmitted for approval (preview).", "success");
    setCampaigns((xs) =>
      xs.map((x) => {
        if (x.id !== c.id) return x;
        return {
          ...x,
          approvalStatus: "Pending",
          pendingAdminApproval: true,
          adminRejected: false,
          nextAction: "Await Admin approval",
          lastActivity: "Resubmitted · now",
          lastActivityAt: Date.now(),
          health: "on-track"
        };
      })
    );
  }


  function openGiveawayEditor(campaign, item) {
    if (!campaign || !item) return;
    setGiveawayEditorCampaignId(campaign.id);
    setGiveawayEditorItemId(item.id);
    setGiveawayEditorOpen(true);
  }

  function openGiveawayAdd(campaign) {
    if (!campaign) return;
    const firstFeatured = (campaign.items || [])[0] || null;
    const firstInventory = CATALOG_ITEMS.find((item) => !(campaign.items || []).some((attached) => attached.id === item.id)) || CATALOG_ITEMS[0] || null;
    const defaultSource = firstFeatured ? "featured" : firstInventory ? "inventory" : "external";
    setGiveawayAddCampaignId(campaign.id);
    setGiveawayAddSource(defaultSource);
    setGiveawayAddFeaturedItemId(firstFeatured?.id || "");
    setGiveawayAddCatalogItemId(firstInventory?.id || "");
    setGiveawayAddExternalTitle("");
    setGiveawayAddExternalSubtitle("");
    setGiveawayAddExternalKind("Product");
    setGiveawayAddExternalSku("");
    const defaultAsset = getApprovedAssetForCatalogItem(firstFeatured?.id || firstInventory?.id || "") || APPROVED_ASSET_LIBRARY[0] || null;
    setGiveawayAddAssetId(defaultAsset?.id || "");
    setGiveawayAddTotal(String(firstFeatured ? Math.max(10, Number(firstFeatured.giveaway?.total || 0)) : 10));
    setGiveawayAddLowThreshold(String(firstFeatured?.kind === "Service" ? 2 : 5));
    setGiveawayAddNotes("Use approved Asset Library poster or image only. If the right visual is missing, add it from Asset Library first.");
    setGiveawayAddOpen(true);
  }

  function openApprovedAssetLibrary() {
    push("Open Asset Library (approved only). If the poster or image is missing, add it there first, then return here to select it.", "info");
    go("/supplier/overview/asset-library?status=approved&purpose=giveaway-visual");
  }

  async function saveGiveawayItem() {
    if (!giveawayAddCampaign || giveawayAddInvalid) {
      push("Complete the giveaway item setup before saving.", "error");
      return;
    }

    const total = Math.max(0, Number(giveawayAddTotal || 0));
    const lowThreshold = Math.max(0, Number(giveawayAddLowThreshold || 0));
    const asset = giveawayAddAsset;
    const nowLabel = "Now";
    const auditEntry = {
      id: `audit_${Date.now()}`,
      at: nowLabel,
      actor: "Supplier giveaway owner",
      event: giveawayAddSource === "featured" ? "Configured featured giveaway item" : "Added giveaway item",
      delta: `Total ${total}`,
      detail:
        giveawayAddSource === "featured"
          ? "Configured giveaway stock for an existing featured campaign item."
          : giveawayAddSource === "inventory"
            ? "Added supplier inventory item as a standalone giveaway entry with an approved Asset Library poster."
            : "Added external giveaway item with an approved Asset Library poster."
    };

    setSavingGiveawayAdd(true);
    await new Promise((resolve) => window.setTimeout(resolve, 650));

    if (giveawayAddSource === "featured" && giveawayAddFeaturedItem) {
      setCampaigns((prev) =>
        prev.map((campaign) => {
          if (campaign.id !== giveawayAddCampaign.id) return campaign;
          return {
            ...campaign,
            lastActivity: "Featured giveaway source updated · now",
            lastActivityAt: Date.now(),
            items: (campaign.items || []).map((item) =>
              item.id !== giveawayAddFeaturedItem.id
                ? item
                : {
                    ...item,
                    assetId: asset?.id || item.assetId || "",
                    assetTitle: asset?.title || item.assetTitle || "",
                    assetDimensions: asset?.dimensions || item.assetDimensions || "",
                    assetPreview: asset?.preview || item.assetPreview || item.avatar,
                    giveaway: {
                      ...(item.giveaway || {}),
                      enabled: true,
                      total,
                      lowThreshold,
                      notes: giveawayAddNotes,
                      updatedAt: nowLabel,
                      audit: [auditEntry, ...((item.giveaway && item.giveaway.audit) || [])]
                    }
                  }
            )
          };
        })
      );
      setSavingGiveawayAdd(false);
      setGiveawayAddOpen(false);
      push("Featured giveaway item configured and synced.", "success");
      return;
    }

    if (giveawayAddSource === "inventory") {
      const alreadyExists = (giveawayAddCampaign.giveawayExtras || []).some((entry) => entry.linkedCatalogItemId === giveawayAddCatalogItem?.id);
      if (alreadyExists) {
        setSavingGiveawayAdd(false);
        push("That inventory item already exists as a standalone giveaway entry for this campaign.", "warn");
        return;
      }
    }

    const baseItem = giveawayAddSource === "inventory" && giveawayAddCatalogItem
      ? {
          ...giveawayAddCatalogItem,
          sourceType: "inventory",
          sourceLabel: "Inventory item",
          linkedCatalogItemId: giveawayAddCatalogItem.id,
          linkedCampaignItemId: "",
          title: giveawayAddCatalogItem.title,
          subtitle: giveawayAddCatalogItem.subtitle,
          kind: giveawayAddCatalogItem.kind,
          sku: giveawayAddCatalogItem.sku,
          price: giveawayAddCatalogItem.price,
          plannedQty: 1,
          discountLabel: "Giveaway only",
          discountedPrice: 0
        }
      : {
          id: uid("GX"),
          sourceType: "external",
          sourceLabel: "External giveaway item",
          linkedCatalogItemId: "",
          linkedCampaignItemId: "",
          kind: giveawayAddExternalKind,
          title: String(giveawayAddExternalTitle || "").trim(),
          subtitle: String(giveawayAddExternalSubtitle || "").trim() || "Custom supplier-defined giveaway entry",
          sku: String(giveawayAddExternalSku || "").trim() || "EXT-GIVEAWAY",
          price: 0,
          plannedQty: 1,
          discountLabel: "Giveaway only",
          discountedPrice: 0
        };

    const newEntry = ensureGiveawayExtra({
      ...baseItem,
      id: giveawayAddSource === "inventory" ? uid("GX") : baseItem.id,
      assetId: asset?.id || "",
      assetTitle: asset?.title || "",
      assetDimensions: asset?.dimensions || "",
      assetPreview: asset?.preview || svgAvatarDataUrl(baseItem.title, baseItem.id || baseItem.title),
      giveaway: {
        enabled: true,
        total,
        used: 0,
        allocated: 0,
        lowThreshold,
        updatedAt: nowLabel,
        notes: giveawayAddNotes,
        audit: [auditEntry]
      }
    });

    setCampaigns((prev) =>
      prev.map((campaign) => {
        if (campaign.id !== giveawayAddCampaign.id) return campaign;
        return {
          ...campaign,
          lastActivity: "Standalone giveaway item added · now",
          lastActivityAt: Date.now(),
          giveawayExtras: [...(campaign.giveawayExtras || []), newEntry]
        };
      })
    );

    setSavingGiveawayAdd(false);
    setGiveawayAddOpen(false);
    push("Standalone giveaway item added and synced to Creator Builder preview.", "success");
  }

  async function saveGiveawayConfig() {
    if (!giveawayEditorCampaign || !giveawayEditorItem) return;
    if (giveawayDraftInvalid) {
      push(`Giveaway total cannot be lower than committed stock (${giveawayCommittedQty}).`, "error");
      return;
    }

    setSavingGiveaway(true);
    await new Promise((resolve) => window.setTimeout(resolve, 650));

    const nextTotal = giveawayDraftEnabled ? Math.max(0, Number(giveawayDraftTotal || 0)) : 0;
    const nextThreshold = giveawayDraftEnabled ? Math.max(0, Number(giveawayDraftLowThreshold || 0)) : 0;
    const nextUpdatedAt = "Now";
    const auditEntry = {
      id: `audit_${Date.now()}`,
      at: "Now",
      actor: "Supplier giveaway owner",
      event: giveawayDraftEnabled ? "Updated source-of-truth config" : "Disabled giveaway source",
      delta: giveawayDraftEnabled ? `Total ${nextTotal}` : "Disabled",
      detail: giveawayDraftEnabled
        ? "Saved supplier-owned giveaway stock that powers Creator App > Live Builder > Featured Items > + Add Giveaway."
        : "Creator Builder can no longer draw giveaway stock from this item."
    };

    setCampaigns((xs) =>
      xs.map((campaign) => {
        if (campaign.id !== giveawayEditorCampaign.id) return campaign;
        return {
          ...campaign,
          lastActivity: "Giveaway stock updated · now",
          lastActivityAt: Date.now(),
          items: (campaign.items || []).map((item) =>
            item.id !== giveawayEditorItem.id
              ? item
              : {
                  ...item,
                  giveaway: {
                    ...item.giveaway,
                    enabled: giveawayDraftEnabled,
                    total: nextTotal,
                    lowThreshold: nextThreshold,
                    notes: giveawayDraftNotes,
                    updatedAt: nextUpdatedAt,
                    audit: [auditEntry, ...(item.giveaway?.audit || [])]
                  }
                }
          )
        };
      })
    );

    setSavingGiveaway(false);
    push("Giveaway stock source saved and synced to Creator Builder preview.", "success");
    setGiveawayEditorOpen(false);
  }

  const promoDefaultsForCatalog = useMemo(() => {
    return {
      promoTypeLabel: (PROMO_TYPES.find((p) => p.k === builder.promoType)?.label) || builder.promoType,
      promoArrangementLabel:
        (PROMO_ARRANGEMENTS[builder.promoType]?.find((a) => a.k === builder.promoArrangement)?.label) || builder.promoArrangement,
      defaultDiscountMode: builder.defaultDiscountMode,
      defaultDiscountValue: builder.defaultDiscountValue
    };
  }, [builder.promoType, builder.promoArrangement, builder.defaultDiscountMode, builder.defaultDiscountValue]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
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
                push("Opening Live Schedule (preview).", "info");
                go("/supplier/live/schedule");
              }}
              title="Go to Live Schedule"
            >
              📅 Live
            </Btn>
            <Btn
              tone="ghost"
              onClick={() => {
                push("Opening Adz Manager (preview).", "info");
                go("/supplier/adz/manager");
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

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          {/* Summary */}
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
            <div>
              <h1 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-0.5">My Campaigns</h1>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Track every campaign you own – from drafts to Admin approval, creator collabs, execution, and analytics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex flex-col min-w-[160px]">
                <span className="text-slate-500 dark:text-slate-300">Total planned budget</span>
                <span className="text-lg font-semibold text-[#f77f00] dark:text-[#f77f00]">{money("USD", totals.totalValue)}</span>
              </div>
              <div className="flex flex-col min-w-[130px]">
                <span className="text-slate-500 dark:text-slate-300">Active</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">{totals.activeCount}</span>
              </div>
              <div className="flex flex-col min-w-[130px]">
                <span className="text-slate-500 dark:text-slate-300">Pending actions</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">{totals.pendingApprovals}</span>
              </div>
            </div>
          </section>

          {/* Quick split */}
          <section className="flex flex-wrap gap-2">
            <Pill tone="neutral">👥 Use Creator: <span className="font-extrabold">{modeSummaries.useCreator.count}</span></Pill>
            <Pill tone="neutral">✨ Supplier as Creator: <span className="font-extrabold">{modeSummaries.supplierAsCreator.count}</span></Pill>
            <Pill tone="neutral">⏳ Not sure: <span className="font-extrabold">{modeSummaries.notSure.count}</span></Pill>
            <Pill tone="brand">🎬 Creators engaged: <span className="font-extrabold">{totals.creatorsEngaged}</span></Pill>
          </section>

          {/* Giveaway source-of-truth summary */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Configured giveaway items</div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{overallGiveawayTotals.enabledCount}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Products or services with giveaway enabled</div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Total giveaway pool</div>
              <div className="mt-2 text-2xl font-black text-[#f77f00]">{overallGiveawayTotals.total}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Supplier-defined quantity across campaigns</div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Used</div>
              <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">{overallGiveawayTotals.used}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Already claimed in previous live sessions</div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Allocated</div>
              <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{overallGiveawayTotals.allocated}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Reserved by upcoming creator sessions</div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Currently available</div>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{overallGiveawayTotals.available}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">What Creator Live Builder can still allocate</div>
            </div>
          </section>

          <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            Giveaway stock is supplier-owned source of truth. The same total, used, allocated and available values power Creator App &gt; Live Builder &gt; Featured Items &gt; + Add Giveaway.
          </div>

          {/* Filters */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-2 flex flex-col gap-2 text-sm">
            <div className="flex flex-col gap-3 p-2">
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-slate-50 dark:bg-slate-800 transition-colors">
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
                  onClick={() => setActiveStageFilter("All")}
                  className={cx(
                    "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                    activeStageFilter === "All"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md scale-105"
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                >
                  All Pipelines
                </button>

                {STAGES.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setActiveStageFilter(stage)}
                    className={cx(
                      "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                      activeStageFilter === stage
                        ? "bg-[#f77f00] text-white border-[#f77f00] shadow-md scale-105"
                        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    )}
                    title={`${stageSummaries[stage]?.count || 0} campaigns · ${money("USD", stageSummaries[stage]?.value || 0)}`}
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
                <Btn onClick={() => toggleSort("name")} title="Sort by name">↕ Name</Btn>
                <Btn onClick={() => toggleSort("estValue")} title="Sort by budget">↕ Budget</Btn>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Campaign</span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode</span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Budget</span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Step</span>
                    </th>
                    <th className="px-6 py-4 text-right">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</span>
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
                        push(`Navigate → ${path}`, "info");
                        go(path);
                      }}
                      onSwitchMode={() => {
                        if (!canSwitchCollabMode(c)) {
                          push("Collaboration mode cannot be changed after content submission begins.", "warn");
                          return;
                        }
                        const nextMode = c.collabMode === "Invite-only" ? "Open for Collabs" : "Invite-only";
                        setCampaigns((xs) =>
                          xs.map((x) =>
                            x.id === c.id
                              ? { ...x, collabMode: nextMode, lastActivity: `Collab mode switched → ${nextMode} · now`, lastActivityAt: Date.now() }
                              : x
                          )
                        );
                        push(`Collab mode switched to ${nextMode}.`, "success");
                      }}
                      onUpdate={(patch) => setCampaigns((xs) => xs.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))}
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
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        initialKind={catalogKind}
        allowProducts={allowProducts(builder.offerScope)}
        allowServices={allowServices(builder.offerScope)}
        campaignCurrency={builder.currency}
        promoDefaults={{
          ...promoDefaultsForCatalog,
          promoTypeLabel: promoLabels.promoTypeLabel,
          promoArrangementLabel: promoLabels.promoArrangementLabel
        }}
        existingSelectedItems={builder.items}
        onConfirm={({ kind, selected }) => {
          // merge: replace items of this kind, keep other kind (supports scope=Both)
          setBuilder((p) => {
            const keep = (p.items || []).filter((it) => it.kind !== kind);
            const merged = [...keep, ...selected];
            return { ...p, items: merged };
          });
          setCatalogOpen(false);
          push(`Added ${selected.length} ${kind === "Product" ? "product" : "service"}(s) to campaign.`, "success");
        }}
      />

      {/* Campaign Builder Drawer */}
      <Drawer
        open={builderOpen}
        title="New Campaign"
        subtitle="Campaign Builder · Promo + Catalog · Submit for Admin approval"
        onClose={() => setBuilderOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">Step {builderStep} / 4</div>
            <div className="flex items-center gap-2">
              <Btn onClick={() => setBuilderStep((s) => Math.max(1, s - 1))} disabled={builderStep === 1}>
                ← Back
              </Btn>
              {builderStep < 4 ? (
                <Btn
                  tone="primary"
                  onClick={() => {
                    if (builderStep === 1 && !String(builder.name || "").trim()) {
                      push("Campaign name is required.", "error");
                      return;
                    }
                    setBuilderStep((s) => Math.min(4, s + 1));
                  }}
                >
                  Next →
                </Btn>
              ) : (
                <>
                  <Btn onClick={saveDraft} title="Save draft">📝 Save draft</Btn>
                  <Btn tone="primary" onClick={submitForApproval} title="Submit to Admin for approval">
                    📨 Submit for Approval
                  </Btn>
                </>
              )}
            </div>
          </div>
        }
      >
        {/* STEP 1 */}
        {builderStep === 1 ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-3">
              <div className="text-sm font-bold">Basics + Promo + Catalog</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Define identity, duration, promo design, and items to promote.</div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Campaign name *</div>
                <div className="mt-2">
                  <Input
                    value={builder.name}
                    onChange={(v) => setBuilder((p) => ({ ...p, name: v }))}
                    placeholder="Example: Beauty Flash Week (Combo)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Campaign type</div>
                  <div className="mt-2">
                    <Select value={builder.type} onChange={(v) => setBuilder((p) => ({ ...p, type: v }))}>
                      <option value="Shoppable Adz">Shoppable Adz</option>
                      <option value="Live Sessionz">Live Sessionz</option>
                      <option value="Shoppable Adz + Live">Shoppable Adz + Live</option>
                      <option value="Live + Clips">Live + Clips</option>
                    </Select>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Region</div>
                  <div className="mt-2">
                    <Select value={builder.region} onChange={(v) => setBuilder((p) => ({ ...p, region: v }))}>
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
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Currency</div>
                  <div className="mt-2">
                    <Select value={builder.currency} onChange={(v) => setBuilder((p) => ({ ...p, currency: v }))}>
                      <option value="USD">USD</option>
                      <option value="UGX">UGX</option>
                      <option value="KES">KES</option>
                      <option value="TZS">TZS</option>
                      <option value="EUR">EUR</option>
                    </Select>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Planned budget</div>
                  <div className="mt-2">
                    <Input
                      type="number"
                      value={builder.estValue}
                      onChange={(v) => setBuilder((p) => ({ ...p, estValue: clamp(v, 0, 100000000) }))}
                      placeholder="1000"
                    />
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Estimate until contracts are signed.</div>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">Campaign duration</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Min 1 day, max 45 days. End date is auto-calculated.</div>
                  </div>
                  <Pill tone="brand">Max 45 days</Pill>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Start date *</div>
                    <input
                      type="date"
                      value={builder.startDate}
                      onChange={(e) => setBuilder((p) => ({ ...p, startDate: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Duration (days) *</div>
                    <input
                      type="number"
                      min={1}
                      max={45}
                      value={builder.durationDays}
                      onChange={(e) => {
                        const v = clamp(e.target.value, 1, 45);
                        if (Number(e.target.value) !== v) push("Duration must be between 1 and 45 days.", "warn");
                        setBuilder((p) => ({ ...p, durationDays: v }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">End date (auto)</div>
                    <input
                      type="date"
                      value={builderEndDate}
                      disabled
                      className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Promo */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">Promo type & arrangement</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Define the promo mechanism (discount, coupon, bundle, etc.).</div>
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
                        const nextArrangement = arrangements[0]?.k || "";
                        setBuilder((p) => ({
                          ...p,
                          promoType: pt.k,
                          promoArrangement: nextArrangement,
                          // sensible defaults
                          defaultDiscountMode: pt.k === "Discount" || pt.k === "Coupon" ? "percent" : "none",
                          defaultDiscountValue: pt.k === "Discount" || pt.k === "Coupon" ? 10 : 0
                        }));
                      }}
                      className={cx(
                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                        builder.promoType === pt.k
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Preferred arrangement</div>
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
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Offer scope</div>
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
                {builder.promoType === "Coupon" ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Promo / coupon code</div>
                      <Input
                        value={builder.promoCode}
                        onChange={(v) => setBuilder((p) => ({ ...p, promoCode: v.toUpperCase() }))}
                        placeholder="Example: TECHFRIDAY"
                        className="mt-2"
                      />
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Creators can mention this code in content.</div>
                    </div>
                  </div>
                ) : null}

                {builder.promoType === "FreeShipping" ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Shipping threshold</div>
                      <Input
                        type="number"
                        value={builder.shippingThreshold}
                        onChange={(v) => setBuilder((p) => ({ ...p, shippingThreshold: clamp(v, 0, 100000000) }))}
                        placeholder="0"
                        className="mt-2"
                      />
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Example: free shipping over $50.</div>
                    </div>
                  </div>
                ) : null}

                {builder.promoType === "Gift" ? (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Gift / bonus note</div>
                    <textarea
                      value={builder.giftNote}
                      onChange={(e) => setBuilder((p) => ({ ...p, giftNote: e.target.value }))}
                      className="mt-2 w-full min-h-[84px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none"
                      placeholder="Example: Free travel pouch with every bundle purchase"
                    />
                  </div>
                ) : null}

                <div className="mt-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold">Default discount (for catalog)</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Applies when selecting items, and can be overridden per item.
                      </div>
                    </div>
                    <Btn onClick={applyDefaultDiscountToSelected} title="Apply discount to items already selected">
                      ✨ Apply to selected
                    </Btn>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Default mode</div>
                      <Select
                        value={builder.defaultDiscountMode}
                        onChange={(v) => setBuilder((p) => ({ ...p, defaultDiscountMode: v }))}
                        className="mt-2"
                      >
                        {DISCOUNT_MODES.map((m) => (
                          <option key={m.k} value={m.k}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Default value</div>
                      <Input
                        type="number"
                        value={builder.defaultDiscountValue}
                        onChange={(v) => setBuilder((p) => ({ ...p, defaultDiscountValue: Math.max(0, safeNum(v, 0)) }))}
                        className="mt-2"
                        placeholder="10"
                      />
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDiscount(builder.defaultDiscountMode, builder.defaultDiscountValue, builder.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">Products / Services</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Select items from Catalog. Each item can have its own planned quantity and discount.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {allowProducts(builder.offerScope) ? (
                      <Btn tone="primary" onClick={() => openCatalog("Product")}>➕ Add Products</Btn>
                    ) : null}
                    {allowServices(builder.offerScope) ? (
                      <Btn tone={allowProducts(builder.offerScope) ? "neutral" : "primary"} onClick={() => openCatalog("Service")}>
                        ➕ Add Services
                      </Btn>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3">
                  {(builder.items || []).length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-500 dark:text-slate-400">
                      No items selected yet.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      {(builder.items || []).map((it) => (
                        <div
                          key={it.id}
                          className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={it.avatar} alt="avatar" className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-700" />
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold truncate">{it.title}</div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                                {it.kind} · Qty: <span className="font-bold">{it.plannedQty || 1}</span> · {it.discountLabel || "No discount"}
                              </div>
                              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                Price: {money(builder.currency, it.price)} → <span className="font-extrabold">{money(builder.currency, it.discountedPrice ?? it.price)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Btn
                              onClick={() => {
                                // open catalog focused on the item kind
                                openCatalog(it.kind);
                              }}
                            >
                              ✏️ Edit
                            </Btn>
                            <Btn
                              onClick={() => {
                                setBuilder((p) => ({ ...p, items: (p.items || []).filter((x) => x.id !== it.id) }));
                                push("Item removed.", "success");
                              }}
                            >
                              🗑️ Remove
                            </Btn>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Catalog requirement: avatar, details, qty, current price, discount, and discounted price are captured per item.
                </div>
              </div>

              {/* Internal owner */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Internal owner</div>
                <div className="mt-2">
                  <Select value={builder.internalOwner} onChange={(v) => setBuilder((p) => ({ ...p, internalOwner: v }))}>
                    <option value="Supplier Owner">Supplier Owner</option>
                    <option value="Supplier Manager">Supplier Manager</option>
                    <option value="Collabs Manager">Collabs Manager</option>
                    <option value="Adz Manager">Adz Manager</option>
                    <option value="Live Producer">Live Producer</option>
                  </Select>
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">(RBAC note) Sensitive actions should be limited to authorized roles.</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* STEP 2 */}
        {builderStep === 2 ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-3">
              <div className="text-sm font-bold">Creator plan (required)</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">This selection drives the workflow.</div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {USAGE_DECISIONS.map((v) => (
                <RadioCard
                  key={v}
                  active={builder.creatorUsageDecision === v}
                  title={v}
                  badge={v === "I will use a Creator" ? "Collabs" : v === "I will NOT use a Creator" ? "Supplier acts as creator" : "Decide later"}
                  desc={
                    v === "I will use a Creator"
                      ? "Open Collabs: creators pitch. Invite-only: you invite creators and they accept the invite to collaborate, then negotiation and contract follow."
                      : v === "I will NOT use a Creator"
                        ? "Skip collaboration logic. Start at Content Submission stage after Admin approves the campaign."
                        : "Create the campaign now and decide collaboration mode later (before content submission)."
                  }
                  onClick={() => {
                    setBuilder((p) => ({
                      ...p,
                      creatorUsageDecision: v,
                      collabMode: v === "I will use a Creator" ? p.collabMode : "Open for Collabs",
                      allowMultiCreators: v === "I will use a Creator" ? p.allowMultiCreators : false
                    }));
                  }}
                />
              ))}
            </div>

            {builder.creatorUsageDecision === "I will NOT use a Creator" ? (
              <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                <div className="text-sm font-bold text-amber-900 dark:text-amber-300">Supplier acts as Creator</div>
                <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                  Collaboration logic is skipped. After Admin approves the campaign, you proceed to content submission.
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* STEP 3 */}
        {builderStep === 3 ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-3">
              <div className="text-sm font-bold">Collaboration & content approval</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Editable per campaign until content submission.</div>
            </div>

            {builder.creatorUsageDecision === "I will use a Creator" ? (
              <>
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold">Collaboration mode</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Default is Open for Collabs. Invite-only is private.</div>
                    </div>
                    <Pill tone="brand">Default: Open</Pill>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {COLLAB_MODES.map((m) => (
                      <RadioCard
                        key={m}
                        active={builder.collabMode === m}
                        title={m}
                        badge={m === "Open for Collabs" ? "Public" : "Private"}
                        desc={
                          m === "Open for Collabs"
                            ? "After Admin approval: campaign appears on Creator Opportunities Board. Creators pitch. You review, negotiate and contract."
                            : "After Admin approval: you invite creators. Creators ACCEPT invites to collaborate, then negotiation and contracts follow."
                        }
                        onClick={() => setBuilder((p) => ({ ...p, collabMode: m }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-sm font-bold">Content approval</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Manual means you approve creator assets before Admin review.</div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {APPROVAL_MODES.map((m) => (
                      <RadioCard
                        key={m}
                        active={builder.approvalMode === m}
                        title={m === "Manual" ? "Manual Content Approval" : "Auto Approval"}
                        badge={m}
                        desc={
                          m === "Manual"
                            ? "Creator → Supplier review (approve/request changes/reject) → Admin review → scheduling/execution."
                            : "Creator → Admin review directly. Supplier can still monitor and comment in the record."
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
                        onChange={(e) => setBuilder((p) => ({ ...p, allowMultiCreators: e.target.checked }))}
                      />
                      <span>Allow multiple creators per campaign (split deliverables and partial settlement supported).</span>
                    </label>
                  </div>
                </div>
              </>
            ) : builder.creatorUsageDecision === "I am NOT SURE yet" ? (
              <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                <div className="text-sm font-bold text-amber-900 dark:text-amber-300">Collab mode can be selected later</div>
                <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                  You can submit for Admin approval now. Before content submission, select Open for Collabs or Invite-only.
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-sm font-bold">Supplier acts as Creator</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Collaboration settings are skipped. You proceed to content submission after Admin approval.</div>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  {APPROVAL_MODES.map((m) => (
                    <RadioCard
                      key={m}
                      active={builder.approvalMode === m}
                      title={m === "Manual" ? "Internal Review" : "Direct to Admin"}
                      badge={m}
                      desc={m === "Manual" ? "Internal checks before sending to Admin." : "Submit supplier content directly to Admin review."}
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
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-3">
              <div className="text-sm font-bold">Review & submit</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Confirm duration, promo, and items. Submitting triggers Admin approval.
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold truncate">{builder.name || "(Campaign name)"}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {builder.type} · {builder.region} · {builder.currency}
                  </div>
                </div>
                <Pill tone="brand">{money(builder.currency, clamp(builder.estValue, 0, 100000000))}</Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Duration</div>
                  <div className="mt-1 text-sm font-semibold">
                    {builder.startDate || "(start date missing)"} → {builderEndDate || "(end date)"} · {clamp(builder.durationDays, 1, 45)} day(s)
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Promo</div>
                  <div className="mt-1 text-sm font-semibold">
                    {promoLabels.promoTypeLabel} · {(PROMO_ARRANGEMENTS[builder.promoType] || []).find((a) => a.k === builder.promoArrangement)?.label}
                  </div>
                  {builder.promoType === "Coupon" && builder.promoCode ? (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">Code: <span className="font-extrabold">{builder.promoCode}</span></div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Products / Services</div>
                  <div className="mt-1 text-sm font-semibold">
                    {(builder.items || []).length === 0 ? "(no items selected)" : `${builder.items.length} item(s) selected`}
                  </div>
                  {(builder.items || []).length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(builder.items || []).slice(0, 6).map((it) => (
                        <Pill key={it.id} tone="neutral">{it.title}</Pill>
                      ))}
                      {(builder.items || []).length > 6 ? <Pill tone="neutral">+{(builder.items || []).length - 6} more</Pill> : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Creator plan</div>
                  <div className="mt-1 text-sm font-semibold">{builder.creatorUsageDecision}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                  <div className="text-sm font-bold text-amber-900 dark:text-amber-300">Admin approval</div>
                  <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                    Submitting sends this campaign to Admin for review. Once approved, the campaign becomes active and can enter Collabs/Execution based on your selected workflow.
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Validation on submit: Start date, duration (1–45), promo type/arrangement, and at least one item must be present.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Campaign Details Drawer */}
      <Drawer
        open={detailsOpen}
        title={activeCampaign ? `${activeCampaign.name}` : "Campaign details"}
        subtitle={activeCampaign ? `${activeCampaign.id} · ${activeCampaign.type} · ${activeCampaign.region}` : ""}
        onClose={() => setDetailsOpen(false)}
        footer={
          activeCampaign ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="neutral">Stage: <span className="font-extrabold">{activeCampaign.stage}</span></Pill>
                <Pill tone={approvalStatusPill(activeCampaign.approvalStatus).tone}>
                  {approvalStatusPill(activeCampaign.approvalStatus).label}
                </Pill>
                <Pill tone="brand">Giveaway available: <span className="font-extrabold">{activeCampaignGiveawayTotals.available}</span></Pill>
              </div>
              <div className="flex items-center gap-2">
                {activeCampaign.adminRejected ? (
                  <Btn tone="primary" onClick={() => resubmitAfterRejection(activeCampaign)}>🔁 Resubmit</Btn>
                ) : null}
                <Btn
                  onClick={() => {
                    push("Opening giveaway source-of-truth workspace (preview).", "info");
                  }}
                >
                  🎁 Giveaway stock
                </Btn>
                <Btn
                  tone="primary"
                  onClick={() => {
                    push("Opening campaign workspace (preview).", "info");
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

              {activeCampaign.approvalStatus === "Pending" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn tone="primary" onClick={() => simulateAdminDecision(activeCampaign, "approve")}>
                    ✅ Simulate Approve
                  </Btn>
                  <Btn tone="danger" onClick={() => simulateAdminDecision(activeCampaign, "reject")}>
                    ❌ Simulate Reject
                  </Btn>
                </div>
              ) : activeCampaign.approvalStatus === "Approved" ? (
                <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                  Approved. Next pipeline: <span className="font-extrabold">{activeCampaign.stage}</span> → {activeCampaign.nextAction}
                </div>
              ) : activeCampaign.approvalStatus === "Rejected" ? (
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
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Window</div>
                <div className="mt-1 text-sm font-extrabold">{activeCampaign.startDate || "—"} → {activeCampaign.endDate || "—"}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activeCampaign.durationDays || "—"} days</div>
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Promo</div>
                <div className="mt-1 text-sm font-extrabold">{(PROMO_TYPES.find((p) => p.k === activeCampaign.promoType)?.label) || activeCampaign.promoType}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {(PROMO_ARRANGEMENTS[activeCampaign.promoType] || []).find((a) => a.k === activeCampaign.promoArrangement)?.label}
                  {activeCampaign.promoType === "Coupon" && activeCampaign.promoCode ? ` · ${activeCampaign.promoCode}` : ""}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Budget</div>
                <div className="mt-1 text-sm font-extrabold">{money(activeCampaign.currency, activeCampaign.estValue)}</div>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold">Products / Services</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Items attached to this campaign (qty + discount captured), now combined with giveaway stock source-of-truth.</div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Use <span className="font-extrabold">+ Giveaway Item</span> when the giveaway should come from an existing featured campaign item, another supplier inventory item, or a totally external giveaway item.</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Btn
                    onClick={() => {
                      push("Opening Catalog… (preview)", "info");
                      go("/supplier/overview/dealz-marketplace?selectForCampaign=1");
                    }}
                  >
                    🗂️ Open catalog
                  </Btn>
                  <Btn tone="primary" onClick={() => openGiveawayAdd(activeCampaign)}>
                    ➕ Giveaway Item
                  </Btn>
                </div>
              </div>

              <div className="mt-3">
                {(activeCampaign.items || []).length === 0 ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">No items attached.</div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {(activeCampaign.items || []).map((it) => {
                      const health = giveawayHealthTone(it);
                      return (
                        <div key={it.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={it.avatar} alt="avatar" className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-700" />
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold truncate">{it.title}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Qty: {it.plannedQty || 1} · {it.discountLabel || "No discount"}</div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <Pill tone={it.giveaway?.enabled ? "good" : "neutral"}>{it.giveaway?.enabled ? "Giveaway enabled" : "Giveaway disabled"}</Pill>
                                  <Pill tone={health.tone}>{health.label}</Pill>
                                  <Pill tone="neutral">Available: <span className="font-extrabold">{giveawayAvailability(it)}</span></Pill>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500 dark:text-slate-400">Current</div>
                              <div className="text-sm font-extrabold">{money(activeCampaign.currency, it.price)}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Discounted</div>
                              <div className="text-sm font-extrabold">{money(activeCampaign.currency, it.discountedPrice ?? it.price)}</div>
                              <div className="mt-2">
                                <Btn tone="primary" onClick={() => openGiveawayEditor(activeCampaign, it)}>Configure Giveaway</Btn>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Giveaway stock source-of-truth */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">Giveaway stock source of truth</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Supplier defines total giveaway stock per campaign item, inventory-only giveaway item, or external giveaway item here. Creator App &gt; Live Builder consumes the same total, used, allocated and currently available quantities.
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Images or posters for standalone giveaway items must come from the <span className="font-extrabold">approved Asset Library</span>. If the right visual is not there, the supplier adds it there first, not from this page.</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="brand">Creator dependency locked here</Pill>
                  <Btn tone="primary" onClick={() => openGiveawayAdd(activeCampaign)}>➕ Giveaway Item</Btn>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-bold">Configured items</div>
                  <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{activeCampaignGiveawayTotals.enabledCount}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-bold">Total pool</div>
                  <div className="mt-2 text-xl font-black text-[#f77f00]">{activeCampaignGiveawayTotals.total}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-bold">Used + allocated</div>
                  <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{activeCampaignGiveawayTotals.used + activeCampaignGiveawayTotals.allocated}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-bold">Currently available</div>
                  <div className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{activeCampaignGiveawayTotals.available}</div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">Item / Service</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">Mode</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">Total</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">Used</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">Allocated</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">Available</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">Health</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-slate-400 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCampaignGiveawayNodes.map((item) => {
                      const health = giveawayHealthTone(item);
                      return (
                        <tr key={item.id} className="border-t border-slate-200 dark:border-slate-800">
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <img src={item.assetPreview || item.avatar} alt={item.title} className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-700 object-cover" />
                              <div>
                                <div className="font-extrabold text-slate-900 dark:text-slate-100">{item.title}</div>
                                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{item.kind} · {item.subtitle} · {item.sku}</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Pill tone={item.isGiveawayExtra ? "warn" : "neutral"}>{item.sourceLabel}</Pill>
                                  {item.assetTitle ? <Pill tone="good">Asset: {item.assetTitle}</Pill> : null}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Pill tone={item.giveaway?.enabled ? "good" : "neutral"}>{item.giveaway?.enabled ? "Enabled" : "Disabled"}</Pill>
                          </td>
                          <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">{item.giveaway?.total || 0}</td>
                          <td className="px-4 py-3 font-extrabold text-rose-600 dark:text-rose-400">{item.giveaway?.used || 0}</td>
                          <td className="px-4 py-3 font-extrabold text-amber-600 dark:text-amber-400">{item.giveaway?.allocated || 0}</td>
                          <td className="px-4 py-3 font-extrabold text-emerald-600 dark:text-emerald-400">{giveawayAvailability(item)}</td>
                          <td className="px-4 py-3"><Pill tone={health.tone}>{health.label}</Pill></td>
                          <td className="px-4 py-3 text-right">
                            <Btn tone="primary" onClick={() => openGiveawayEditor(activeCampaign, item)}>Configure</Btn>
                          </td>
                        </tr>
                      );
                    })}
                    {activeCampaignGiveawayNodes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No giveaway entries configured yet. Use + Giveaway Item to add from featured items, inventory or external sources.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invite-only note (kept) */}
            {activeCampaign.creatorUsageDecision === "I will use a Creator" && activeCampaign.collabMode === "Invite-only" ? (
              <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300">Invite-only flow</div>
                <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                  Creators respond by <span className="font-extrabold">accepting the invite to collaborate</span>. After acceptance, negotiation and contracts follow.
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="text-sm font-extrabold">Next action</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activeCampaign.lastActivity}</div>
              <div className="mt-2 text-sm font-semibold">{activeCampaign.nextAction}</div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Giveaway item add drawer */}
      <Drawer
        open={giveawayAddOpen}
        title={giveawayAddCampaign ? `+ Giveaway Item` : `+ Giveaway Item`}
        subtitle={giveawayAddCampaign ? `${giveawayAddCampaign.name} · featured item, inventory item or totally external giveaway item` : ""}
        onClose={() => setGiveawayAddOpen(false)}
        widthClass="sm:w-[820px]"
        footer={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">Use approved Asset Library visuals only. If the right poster or image is missing, add it from Asset Library first, then return here.</div>
            <div className="flex items-center gap-2">
              <Btn onClick={() => setGiveawayAddOpen(false)}>Cancel</Btn>
              <Btn tone="primary" onClick={saveGiveawayItem} disabled={savingGiveawayAdd || giveawayAddInvalid}>{savingGiveawayAdd ? "Saving..." : "Add giveaway item"}</Btn>
            </div>
          </div>
        }
      >
        {!giveawayAddCampaign ? null : (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="text-sm font-extrabold">Giveaway source</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Support three paths: featured campaign item, another supplier inventory item, or a totally external giveaway item.</div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: "featured", title: "Featured campaign item", sub: "Choose from items already attached to this campaign." },
                  { id: "inventory", title: "Supplier inventory item", sub: "Choose from inventory / catalog items not currently featured in this campaign." },
                  { id: "external", title: "External giveaway item", sub: "Create a standalone giveaway entry that exists outside current inventory." },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setGiveawayAddSource(option.id)}
                    className={cx(
                      "rounded-2xl border p-4 text-left transition-all",
                      giveawayAddSource === option.id
                        ? "border-[#f77f00]/40 bg-orange-50/70 dark:bg-orange-950/10 shadow-[0_10px_24px_rgba(247,127,0,0.10)]"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{option.title}</div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{option.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {giveawayAddSource === "featured" ? (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <FieldShell label="Featured campaign item">
                  <Select value={giveawayAddFeaturedItemId} onChange={(e) => setGiveawayAddFeaturedItemId(e.target.value)}>
                    {(giveawayAddFeaturedCandidates || []).map((item) => (
                      <option key={item.id} value={item.id}>{item.title} · {item.kind}</option>
                    ))}
                  </Select>
                </FieldShell>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">This path reuses an existing featured campaign item and configures giveaway stock on that same item without creating a duplicate entry.</div>
              </div>
            ) : null}

            {giveawayAddSource === "inventory" ? (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <FieldShell label="Supplier inventory item">
                  <Select value={giveawayAddCatalogItemId} onChange={(e) => setGiveawayAddCatalogItemId(e.target.value)}>
                    {(giveawayAddInventoryCandidates || []).map((item) => (
                      <option key={item.id} value={item.id}>{item.title} · {item.kind} · {item.sku}</option>
                    ))}
                  </Select>
                </FieldShell>
                {giveawayAddCatalogItem ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100">{giveawayAddCatalogItem.title}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{giveawayAddCatalogItem.kind} · {giveawayAddCatalogItem.subtitle} · {giveawayAddCatalogItem.sku}</div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {giveawayAddSource === "external" ? (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldShell label="External giveaway title" hint="Required">
                    <Input value={giveawayAddExternalTitle} onChange={(e) => setGiveawayAddExternalTitle(e.target.value)} placeholder="e.g. VIP Winner Bundle" />
                  </FieldShell>
                  <FieldShell label="Item type">
                    <Select value={giveawayAddExternalKind} onChange={(e) => setGiveawayAddExternalKind(e.target.value)}>
                      <option>Product</option>
                      <option>Service</option>
                    </Select>
                  </FieldShell>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FieldShell label="Subtitle / description">
                    <Input value={giveawayAddExternalSubtitle} onChange={(e) => setGiveawayAddExternalSubtitle(e.target.value)} placeholder="Short giveaway description" />
                  </FieldShell>
                  <FieldShell label="Reference SKU / code">
                    <Input value={giveawayAddExternalSku} onChange={(e) => setGiveawayAddExternalSku(e.target.value)} placeholder="e.g. EXT-GIVEAWAY" />
                  </FieldShell>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="text-sm font-extrabold">Approved Asset Library visual</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pick an approved image or poster from Asset Library only. Local upload is intentionally blocked here.</div>
                <div className="mt-4 flex flex-col gap-3">
                  <FieldShell label="Approved poster / image" hint={giveawayAddRequiresAsset ? "Required" : "Optional for featured items"}>
                    <Select value={giveawayAddAssetId} onChange={(e) => setGiveawayAddAssetId(e.target.value)}>
                      <option value="">Select approved asset</option>
                      {APPROVED_ASSET_LIBRARY.map((asset) => (
                        <option key={asset.id} value={asset.id}>{asset.title} · {asset.dimensions}</option>
                      ))}
                    </Select>
                  </FieldShell>
                  <Btn onClick={openApprovedAssetLibrary}>📚 Open Asset Library</Btn>
                  {giveawayAddAsset ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3 flex items-center gap-3">
                      <img src={giveawayAddAsset.preview} alt={giveawayAddAsset.title} className="h-16 w-16 rounded-2xl border border-slate-200 dark:border-slate-700 object-cover" />
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">{giveawayAddAsset.title}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{giveawayAddAsset.kind} · {giveawayAddAsset.dimensions} · {giveawayAddAsset.status}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="text-sm font-extrabold">Initial giveaway stock</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Set the supplier-owned stock object that Creator Builder will consume.</div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Total giveaway quantity</div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Committed stock cannot exceed this number.</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Btn onClick={() => setGiveawayAddTotal(String(Math.max(giveawayAddCommittedQty, Number(giveawayAddTotal || 0) - 1)))} disabled={Number(giveawayAddTotal || 0) <= giveawayAddCommittedQty}>−</Btn>
                        <Input type="number" value={String(giveawayAddTotal ?? "")} onChange={setGiveawayAddTotal} className="w-24 text-center" />
                        <Btn onClick={() => setGiveawayAddTotal(String(Math.min(9999, Number(giveawayAddTotal || 0) + 1)))}>＋</Btn>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Low-availability threshold</div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Warn when remaining stock is at or below this number.</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Btn onClick={() => setGiveawayAddLowThreshold(String(Math.max(0, Number(giveawayAddLowThreshold || 0) - 1)))} disabled={Number(giveawayAddLowThreshold || 0) <= 0}>−</Btn>
                        <Input type="number" value={String(giveawayAddLowThreshold ?? "")} onChange={setGiveawayAddLowThreshold} className="w-24 text-center" />
                        <Btn onClick={() => setGiveawayAddLowThreshold(String(Math.min(999, Number(giveawayAddLowThreshold || 0) + 1)))}>＋</Btn>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
                    <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Resulting available quantity</div>
                    <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{Math.max(0, Number(giveawayAddTotal || 0) - giveawayAddCommittedQty)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Used or allocated quantity already committed: {giveawayAddCommittedQty}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <FieldShell label="Source-of-truth notes">
                <TextArea rows={4} value={giveawayAddNotes} onChange={(e) => setGiveawayAddNotes(e.target.value)} placeholder="Add supplier-side notes, audit context, Creator Builder sync notes or restrictions for this giveaway item." />
              </FieldShell>
              {giveawayAddInvalid ? (
                <div className="mt-3 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                  Complete all required source, stock and approved asset fields. Total giveaway quantity cannot be lower than already committed quantity ({giveawayAddCommittedQty}).
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Drawer>

      {/* Giveaway stock editor drawer */}
      <Drawer
        open={giveawayEditorOpen}
        title={giveawayEditorItem ? `Configure giveaway stock` : "Configure giveaway stock"}
        subtitle={giveawayEditorItem ? `${giveawayEditorItem.title} · ${giveawayEditorItem.kind} · supplier-owned source of truth` : ""}
        onClose={() => setGiveawayEditorOpen(false)}
        footer={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Creator App &gt; Live Builder &gt; Featured Items &gt; + Add Giveaway uses this exact stock object.
            </div>
            <div className="flex items-center gap-2">
              <Btn onClick={() => setGiveawayEditorOpen(false)}>Cancel</Btn>
              <Btn tone="primary" onClick={saveGiveawayConfig} disabled={savingGiveaway || giveawayDraftInvalid}>
                {savingGiveaway ? "Saving..." : "Save source of truth"}
              </Btn>
            </div>
          </div>
        }
      >
        {!giveawayEditorItem ? null : (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">{giveawayEditorItem.title}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {giveawayEditorItem.kind} · {giveawayEditorItem.subtitle} · SKU {giveawayEditorItem.sku} · Planned qty {giveawayEditorItem.plannedQty}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill tone={giveawayEditorItem.isGiveawayExtra ? "warn" : "neutral"}>{giveawayEditorItem.sourceLabel || "Campaign item"}</Pill>
                    {giveawayEditorItem.assetTitle ? <Pill tone="good">Approved Asset: {giveawayEditorItem.assetTitle}</Pill> : <Pill tone="neutral">No approved asset override</Pill>}
                  </div>
                </div>
                <Pill tone={giveawayDraftEnabled ? "good" : "neutral"}>{giveawayDraftEnabled ? "Giveaway enabled" : "Giveaway disabled"}</Pill>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Btn tone={giveawayDraftEnabled ? "danger" : "primary"} onClick={() => setGiveawayDraftEnabled((prev) => !prev)}>
                  {giveawayDraftEnabled ? "Disable giveaway" : "Enable giveaway"}
                </Btn>
                <Pill tone="neutral">Current price {money(giveawayEditorCampaign?.currency, giveawayEditorItem.price)}</Pill>
                <Pill tone="neutral">Used + allocated committed {giveawayCommittedQty}</Pill>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Total giveaway {giveawayEditorItem.kind === "Service" ? "slots" : "quantity"}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Supplier-defined stock that Creator Builder can consume.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Btn onClick={() => setGiveawayDraftTotal(String(Math.max(0, Number(giveawayDraftTotal || 0) - 1)))} disabled={!giveawayDraftEnabled || Number(giveawayDraftTotal || 0) <= 0}>−</Btn>
                    <Input type="number" value={String(giveawayDraftTotal ?? "")} onChange={setGiveawayDraftTotal} className="w-24 text-center" />
                    <Btn onClick={() => setGiveawayDraftTotal(String(Math.min(9999, Number(giveawayDraftTotal || 0) + 1)))} disabled={!giveawayDraftEnabled}>＋</Btn>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Low-availability threshold</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Warn supplier and creator when remaining stock drops to this level or lower.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Btn onClick={() => setGiveawayDraftLowThreshold(String(Math.max(0, Number(giveawayDraftLowThreshold || 0) - 1)))} disabled={!giveawayDraftEnabled || Number(giveawayDraftLowThreshold || 0) <= 0}>−</Btn>
                    <Input type="number" value={String(giveawayDraftLowThreshold ?? "")} onChange={setGiveawayDraftLowThreshold} className="w-24 text-center" />
                    <Btn onClick={() => setGiveawayDraftLowThreshold(String(Math.min(999, Number(giveawayDraftLowThreshold || 0) + 1)))} disabled={!giveawayDraftEnabled}>＋</Btn>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-900/10 p-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400 font-bold">Used</div>
                <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300">{giveawayEditorItem.giveaway?.used || 0}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Claimed by previous winners</div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-900/10 p-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300 font-bold">Allocated</div>
                <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{giveawayEditorItem.giveaway?.allocated || 0}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Reserved by future creator sessions</div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-900/10 p-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300 font-bold">Available</div>
                <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {giveawayDraftEnabled ? Math.max(0, Number(giveawayDraftTotal || 0) - giveawayCommittedQty) : 0}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">What Creator Live Builder can still allocate</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="text-sm font-extrabold">Availability breakdown</div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Used {giveawayEditorItem.giveaway?.used || 0}</span>
                  <span>Allocated {giveawayEditorItem.giveaway?.allocated || 0}</span>
                  <span>Available {giveawayDraftEnabled ? Math.max(0, Number(giveawayDraftTotal || 0) - giveawayCommittedQty) : 0}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex">
                  <div
                    className="h-full bg-rose-400"
                    style={{
                      width: `${Math.min(100, Number(giveawayDraftTotal || 0) ? ((giveawayEditorItem.giveaway?.used || 0) / Number(giveawayDraftTotal || 0)) * 100 : 0)}%`
                    }}
                  />
                  <div
                    className="h-full bg-amber-400"
                    style={{
                      width: `${Math.min(100, Number(giveawayDraftTotal || 0) ? ((giveawayEditorItem.giveaway?.allocated || 0) / Number(giveawayDraftTotal || 0)) * 100 : 0)}%`
                    }}
                  />
                  <div
                    className="h-full bg-emerald-400"
                    style={{
                      width: `${Math.min(100, Number(giveawayDraftTotal || 0) ? ((Math.max(0, Number(giveawayDraftTotal || 0) - giveawayCommittedQty)) / Number(giveawayDraftTotal || 0)) * 100 : 0)}%`
                    }}
                  />
                </div>
              </div>

              {giveawayDraftInvalid ? (
                <div className="mt-3 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                  Validation failed: total giveaway quantity cannot be lower than already committed stock ({giveawayCommittedQty}). Reduce future allocations first or increase total stock.
                </div>
              ) : giveawayDraftEnabled && Number(giveawayDraftTotal || 0) - giveawayCommittedQty <= Number(giveawayDraftLowThreshold || 0) ? (
                <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                  Low-availability warning: remaining stock will appear as low in the Supplier view and the Creator Builder preview.
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="text-sm font-extrabold">Source-of-truth notes</div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Use this field for supplier-side audit context, ops instructions or Creator Builder sync notes.</div>
              <textarea
                value={giveawayDraftNotes}
                onChange={(e) => setGiveawayDraftNotes(e.target.value)}
                rows={4}
                className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100"
                placeholder="Add supplier-side notes about how this giveaway stock should be used."
              />
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 shadow-sm">
              <div className="text-sm font-extrabold">Creator Live Builder handoff preview</div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">This is the same supplier-owned object the creator giveaway selector consumes.</div>
              <pre className="mt-3 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 text-[11px] p-3 leading-5">
{JSON.stringify(
  {
    ...giveawayCreatorPayload,
    giveawayEnabled: giveawayDraftEnabled,
    totalGiveawayQuantity: giveawayDraftEnabled ? Number(giveawayDraftTotal || 0) : 0,
    currentlyAvailableQuantity: giveawayDraftEnabled ? Math.max(0, Number(giveawayDraftTotal || 0) - giveawayCommittedQty) : 0,
    lowAvailabilityThreshold: giveawayDraftEnabled ? Number(giveawayDraftLowThreshold || 0) : 0,
    notes: giveawayDraftNotes
  },
  null,
  2
)}
              </pre>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-extrabold">Audit trail</div>
                <Pill tone="neutral">Explicit + auditable</Pill>
              </div>
              <div className="mt-3 space-y-2">
                {(giveawayEditorItem.giveaway?.audit || []).length === 0 ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400">No giveaway audit events yet.</div>
                ) : (
                  (giveawayEditorItem.giveaway?.audit || []).map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{entry.event}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{entry.at}</div>
                      </div>
                      <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">{entry.actor} · {entry.delta}</div>
                      <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{entry.detail}</div>
                    </div>
                  ))
                )}
              </div>
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
  const needsAttention = campaign.pendingSupplierApproval || campaign.pendingAdminApproval || campaign.adminRejected || campaign.approvalStatus === "Pending";
  const itemsCount = Array.isArray(campaign.items) ? campaign.items.length : 0;

  const approvalP = approvalStatusPill(campaign.approvalStatus);

  const promoTypeLabel = (PROMO_TYPES.find((p) => p.k === campaign.promoType)?.label) || campaign.promoType || "—";

  const modeMeta = useMemo(() => {
    if (campaign.creatorUsageDecision !== "I will use a Creator") {
      return `Items: ${itemsCount}`;
    }
    if (campaign.collabMode === "Invite-only") {
      const sent = Number(campaign.invitesSent) || 0;
      const acc = Number(campaign.invitesAccepted) || 0;
      return `Invites: ${acc}/${sent} accepted · Items: ${itemsCount}`;
    }
    return `Pitches: ${Number(campaign.pitchesCount) || 0} · Items: ${itemsCount}`;
  }, [campaign.creatorUsageDecision, campaign.collabMode, campaign.invitesSent, campaign.invitesAccepted, campaign.pitchesCount, itemsCount]);

  const actions = {
    proposals: "/supplier/collabs/proposals",
    contracts: "/supplier/collabs/contracts",
    assets: "/supplier/deliverables/assets",
    links: "/supplier/deliverables/links",
    adz: "/supplier/adz/manager",
    live: "/supplier/live/schedule"
  };

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
      <td className="px-6 py-4">
        <button type="button" onClick={onOpen} className="w-full text-left">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 shadow-sm transition-transform group-hover:scale-110">
                {String(campaign.name || "C")[0]}
              </div>
              <div className={cx("absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900", health.dot)} />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">{campaign.name}</span>
              <span className="text-[10px] font-bold text-[#f77f00] uppercase tracking-tighter">
                {campaign.id} · {campaign.type}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {campaign.region}
                {campaign.startDate && campaign.endDate ? ` · ${campaign.startDate} → ${campaign.endDate}` : ""}
                {promoTypeLabel ? ` · ${promoTypeLabel}` : ""}
              </span>
            </div>
          </div>
        </button>
      </td>

      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              {modeLabel}
            </span>
            <span
              className={cx(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                campaign.approvalMode === "Manual"
                  ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                  : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              )}
            >
              {approvalLabel}
            </span>
            <span
              className={cx(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                approvalP.tone === "warn"
                  ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300"
                  : approvalP.tone === "good"
                    ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : approvalP.tone === "bad"
                      ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                      : "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
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
          <span className="text-sm font-black text-slate-900 dark:text-white">{money(campaign.currency, campaign.estValue)}</span>
          <span className="text-[10px] text-slate-400 italic">Planned</span>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex flex-col gap-2">
          <span className={cx("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all", statusTone(campaign.stage))}>
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
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{campaign.nextAction}</span>
          <span className="text-[10px] text-slate-400 truncate">{campaign.lastActivity}</span>
        </div>
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onGo(actions.proposals)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-[#f77f00] hover:border-[#f77f00] transition-all"
            title="Proposals"
          >
            📋
          </button>
          <button
            onClick={() => onGo(actions.contracts)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all font-bold"
            title="Contracts"
          >
            ✍️
          </button>
          <button
            onClick={() => onGo(actions.assets)}
            className={cx(
              "p-2 rounded-xl border bg-white dark:bg-slate-800 transition-all",
              campaign.pendingSupplierApproval || campaign.adminRejected
                ? "border-amber-200 dark:border-amber-800 text-amber-700 hover:border-amber-500"
                : "border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700"
            )}
            title="Asset Library"
          >
            🗂️
          </button>

          <button
            onClick={() => setShowMenu((s) => !s)}
            className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all relative"
            title="More"
            ref={menuRef}
          >
            •••

            {showMenu ? (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
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
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
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
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    🔁 Switch collab mode
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    push("Marked as at-risk (preview).", "warn");
                    onUpdate({ health: "at-risk", lastActivity: "Health flagged · now", lastActivityAt: Date.now() });
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  ⚠️ Flag at-risk
                </button>

                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    push("Campaign terminated (preview).", "warn");
                    onUpdate({ stage: "Terminated", health: "stalled", nextAction: "Campaign ended", lastActivity: "Terminated · now", lastActivityAt: Date.now() });
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
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierMyCampaignsPage v3 test failed: ${msg}`);
  };

  assert(computeEndDate("2026-02-23", 1) === "2026-02-23", "1-day duration end date equals start");
  assert(computeEndDate("2026-02-23", 2) === "2026-02-24", "2-day duration end date is start+1");
  assert(calcDiscountedPrice(100, "percent", 10) === 90, "percent discount works");
  assert(calcDiscountedPrice(100, "amount", 5) === 95, "amount discount works");
  assert(calcDiscountedPrice(100, "final", 70) === 70, "final price works");
  assert(formatDiscount("none", 0, "USD") === "No discount", "format no discount");

  console.log("✅ SupplierMyCampaignsPage v3 self-tests passed");
}
