import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";
import { buildAdzCampaignPayload, deriveMetricSeries, hashAdzCampaign, mapBackendAdzCampaign } from "./runtime";

/**
 * SupplierAdzDashboardPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: AdzDashboard.tsx (Creator)
 *
 * Mirror-first preserved:
 * - PageHeader with right CTAs (Adz Performance + New Ad)
 * - Search + filters bar: search, status, Wholesale-ready toggle, Calendar, Quick Links
 * - Top KPIs row
 * - Charts: Traffic trend (LineChart), Top campaigns (BarList), Offer mix (Donut), Ads by platform (Donut), Statuses (BarList)
 * - Your Adz list: selectable rows, multi-column grid, row actions (Performance, Edit, Copy link, Generate)
 * - Drawers: Calendar summary, Quick Links, Performance, Ad Builder
 *
 * Supplier adaptations (minimal, necessary):
 * - Adds campaign-level collaboration context pills (Creator usage, Collab mode, Approval mode)
 * - Host column supports Supplier-hosted vs Creator-hosted
 * - Messaging reflects Supplier ownership + approval gating notes
 * - Navigation is stubbed for canvas (replace safeNav with react-router navigate)
 */

const ORANGE = "#f77f00";

// Canonical sizes (mirrors creator file)
const HERO_IMAGE_REQUIRED = { width: 1920, height: 1080 };
const ITEM_POSTER_REQUIRED = { width: 500, height: 500 };

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* --------------------------------- Helpers -------------------------------- */

function money(currency, amount, isMobile) {
  const n = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      notation: isMobile ? "compact" : "standard"
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

function pct(n) {
  const v = Number.isFinite(n) ? n : 0;
  return `${(v * 100).toFixed(1)}%`;
}

function enabledModesForOffer(o) {
  if (o.type === "SERVICE") return ["RETAIL"];
  const ms = (o.sellingModes || []).filter(Boolean);
  return ms.length ? ms : ["RETAIL"];
}

function hasWholesale(o) {
  return o.type === "PRODUCT" && enabledModesForOffer(o).includes("WHOLESALE");
}

function hasRetail(o) {
  return enabledModesForOffer(o).includes("RETAIL");
}

function compensationLabel(c) {
  if (!c) return "—";
  if (c.type === "Commission") return `Commission · ${Math.round(c.commissionRate * 100)}%`;
  if (c.type === "Flat fee") return `Flat fee · ${money(c.currency, c.flatFee, false)}`;
  return `Hybrid · ${Math.round(c.commissionRate * 100)}% + ${money(c.currency, c.flatFee, false)}`;
}

/* --------------------------------- Toast ---------------------------------- */

function Toast({ tone, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [onClose]);

  const cls =
    tone === "success"
      ? "bg-emerald-600"
      : tone === "warning"
        ? "bg-amber-600"
        : tone === "error"
          ? "bg-rose-600"
          : "bg-slate-900";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] px-3">
      <div className={cx("max-w-[92vw] sm:max-w-xl rounded-2xl px-4 py-2.5 shadow-lg text-white", cls)}>
        <div className="flex items-start gap-3">
          <span className="text-sm">
            {tone === "success" ? "✅" : tone === "warning" ? "⚠️" : tone === "error" ? "⛔" : "ℹ️"}
          </span>
          <div className="flex-1 text-sm font-semibold">{message}</div>
          <button onClick={onClose} className="text-white/90 hover:text-white text-sm font-bold" aria-label="Dismiss">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function useToasts() {
  const [toast, setToast] = useState(null);
  const show = (tone, message) => setToast({ tone, message });
  return {
    toast,
    clear: () => setToast(null),
    success: (m) => show("success", m),
    warning: (m) => show("warning", m),
    error: (m) => show("error", m),
    info: (m) => show("info", m)
  };
}

/* ------------------------------- Async action ------------------------------ */

function useAsyncAction(toastApi) {
  const [isPending, setIsPending] = useState(false);

  const run = async (fn, opts = {}) => {
    const { successMessage = "Done", errorMessage = "Something went wrong", delay = 900 } = opts;
    setIsPending(true);
    try {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      const res = await fn();
      toastApi?.success?.(successMessage);
      return res;
    } catch (e) {
      toastApi?.error?.(errorMessage);
      return null;
    } finally {
      setIsPending(false);
    }
  };

  return { run, isPending };
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
            Supplier operations view for Shoppable Adz (performance, approvals, generation, and quick actions).
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

function Btn({ tone = "neutral", left, className, disabled, onClick, children, title, isPending }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-extrabold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-900 dark:text-neutral-100";
  return (
    <button
      type="button"
      className={cx(base, cls, className)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
      disabled={disabled || isPending}
      onClick={onClick}
      title={title}
    >
      {left}
      {children}
    </button>
  );
}

function Drawer({ open, title, onClose, children, zIndex }) {
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
    <div className="fixed inset-0" style={{ zIndex: zIndex || 120 }}>
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

/* -------------------------------- Charts ---------------------------------- */

function LineChart({ title, subtitle, seriesA, seriesB, aLabel, bLabel }) {
  const w = 640;
  const h = 160;
  const pad = 16;

  const all = [...seriesA, ...(seriesB || [])];
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);

  function x(i) {
    return pad + (i * (w - pad * 2)) / Math.max(1, seriesA.length - 1);
  }
  function y(v) {
    const t = (v - min) / Math.max(1e-9, max - min);
    return h - pad - t * (h - pad * 2);
  }

  function pathFor(s) {
    return s.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  }

  const pA = pathFor(seriesA);
  const pB = seriesB?.length ? pathFor(seriesB) : "";

  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{subtitle}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="neutral">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ORANGE }} />
            {aLabel}
          </Pill>
          {seriesB?.length ? (
            <Pill tone="neutral">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-900/70 dark:bg-slate-100/70" />
              {bLabel || "Series B"}
            </Pill>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[160px] w-full">
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={pad}
              y1={pad + t * (h - pad * 2)}
              x2={w - pad}
              y2={pad + t * (h - pad * 2)}
              strokeWidth="1"
              className="stroke-neutral-900/10 dark:stroke-slate-100/10"
            />
          ))}
          <path d={pA} fill="none" stroke={ORANGE} strokeWidth="3" strokeLinejoin="round" />
          {pB ? <path d={pB} fill="none" className="stroke-neutral-900/70 dark:stroke-slate-100/70" strokeWidth="3" strokeLinejoin="round" /> : null}
        </svg>
      </div>
    </div>
  );
}

function DonutChart({ title, subtitle, segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 44;
  const c = 60;
  const circ = 2 * Math.PI * r;
  let acc = 0;

  const colorFor = (tone) => {
    if (tone === "brand") return ORANGE;
    if (tone === "good") return "rgb(16 185 129)";
    if (tone === "warn") return "rgb(245 158 11)";
    if (tone === "bad") return "rgb(244 63 94)";
    if (tone === "pro") return "rgb(139 92 246)";
    return "rgba(17, 24, 39, 0.65)";
  };

  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 transition-colors">
      <div>
        <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
        {subtitle ? <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{subtitle}</div> : null}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
          <circle cx={c} cy={c} r={r} fill="none" className="stroke-neutral-900/10 dark:stroke-slate-100/10" strokeWidth="14" />
          {segments.map((s, idx) => {
            const frac = s.value / total;
            const dash = frac * circ;
            const gap = circ - dash;
            const offset = -acc * circ;
            acc += frac;
            return (
              <circle
                key={idx}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={colorFor(s.tone)}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${c} ${c})`}
              />
            );
          })}
          <text x="60" y="57" textAnchor="middle" className="fill-neutral-900 dark:fill-slate-100" style={{ fontSize: 12, fontWeight: 900 }}>
            Total
          </text>
          <text x="60" y="75" textAnchor="middle" className="fill-neutral-900 dark:fill-slate-100" style={{ fontSize: 14, fontWeight: 900 }}>
            {total.toLocaleString()}
          </text>
        </svg>

        <div className="min-w-0 flex-1 space-y-2">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(s.tone) }} />
                <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{s.label}</div>
              </div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
                {s.value.toLocaleString()} <span className="text-[11px] font-semibold text-neutral-500 dark:text-slate-400">({pct(s.value / total)})</span>
              </div>
            </div>
          ))}
          <div className="pt-1 text-[11px] text-neutral-600 dark:text-slate-400">
            Tip: Wholesale is product-only; services don’t participate in wholesale counts.
          </div>
        </div>
      </div>
    </div>
  );
}

function BarList({ title, subtitle, rows }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{subtitle}</div> : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{r.label}</div>
                {r.hint ? <div className="mt-0.5 text-[11px] text-neutral-600 dark:text-slate-400">{r.hint}</div> : null}
              </div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{r.value.toLocaleString()}</div>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-neutral-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: ORANGE }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Mock data -------------------------------- */

const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

/* ----------------------------- Performance drawer --------------------------- */

function PerformanceDrawer({ open, onClose, ad, allAds, toastApi, onOpenBuilder, onOpenMarketplace, onCopyLink }) {
  const [range, setRange] = useState("7d");
  const [platform, setPlatform] = useState("All");

  useEffect(() => {
    if (!open) return;
    setRange("7d");
    setPlatform("All");
  }, [open, ad?.id]);

  const sImpr = useMemo(
    () => deriveMetricSeries(Number(ad?.impressions7d ?? ad?.impressions ?? 0), 14, `${ad?.id || "drawer-impressions"}`),
    [ad?.id, ad?.impressions, ad?.impressions7d]
  );
  const sOrders = useMemo(
    () => deriveMetricSeries(Number(ad?.orders7d ?? ad?.orders ?? 0), 14, `${ad?.id || "drawer-orders"}-orders`),
    [ad?.id, ad?.orders, ad?.orders7d]
  );

  const kpis = useMemo(() => {
    if (!ad) return null;
    const clicks = ad.clicks7d || 0;
    const orders = ad.orders7d || 0;
    const impressions = ad.impressions7d || 0;
    const revenue = ad.revenue7d || 0;
    const ctr = impressions ? clicks / impressions : 0;
    const cvr = clicks ? orders / clicks : 0;
    const aov = orders ? revenue / orders : 0;
    return {
      impressions,
      clicks,
      orders,
      revenue,
      ctr,
      cvr,
      aov
    };
  }, [ad]);

  const offerRows = useMemo(() => {
    if (!ad) return [];
    return ad.offers.map((o, idx) => {
      const sold = Math.max(0, Number(o.sold ?? 0));
      const estClicks =
        Math.max(
          0,
          Number((o as Record<string, unknown>).clicks ?? 0)
            || Math.round((ad.clicks7d || 0) / Math.max(1, ad.offers.length))
        );
      const conv = estClicks ? sold / estClicks : 0;
      return {
        ...o,
        sold,
        estClicks,
        conv,
        note:
          o.type === "SERVICE"
            ? `Service · ${o.serviceMeta?.durationMins || 30} mins`
            : hasWholesale(o)
              ? `Wholesale enabled · MOQ ${o.wholesale?.moq || "—"}`
              : "Retail only"
      };
    });
  }, [ad]);

  const health = useMemo(() => {
    if (!ad) return [];
    return [
      { label: "Tracking link", ok: !ad.hasBrokenLink, hint: ad.hasBrokenLink ? "Link issue detected" : "Healthy" },
      { label: "Stock", ok: !ad.lowStock, hint: ad.lowStock ? "Low stock on at least one product" : "OK" },
      { label: "Edit lock", ok: !ad.lock?.locked, hint: ad.lock?.locked ? ad.lock.reason : "Editable" },
      { label: "Approval", ok: ad.status !== "Rejected", hint: ad.status === "Pending approval" ? "Awaiting review" : ad.status }
    ];
  }, [ad]);

  return (
    <Drawer open={open} title="Adz Performance (Supplier)" onClose={onClose} zIndex={140}>
      {!ad ? (
        <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[12px] font-extrabold">No ad selected</div>
          <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Select an ad row to view performance.</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100 truncate">{ad.campaignName}</div>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400 truncate">{ad.campaignSubtitle}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill tone={ad.status === "Live" ? "good" : ad.status === "Pending approval" ? "warn" : ad.status === "Rejected" ? "bad" : "neutral"}>
                    {ad.status === "Live" ? "🟢 Live" : ad.status}
                  </Pill>
                  <Pill tone={ad.hostRole === "Supplier" ? "warn" : "good"}>{ad.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}</Pill>
                  <Pill tone={ad.approvalMode === "Manual" ? "warn" : "good"}>Approval: {ad.approvalMode}</Pill>
                  <Pill tone="neutral">Platforms: {ad.platforms.join(", ")}</Pill>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold">
                  Range
                  <select
                    className="ml-2 bg-transparent outline-none"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                  >
                    <option value="7d">7d</option>
                    <option value="28d">28d</option>
                    <option value="90d">90d</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold">
                  Platform
                  <select
                    className="ml-2 bg-transparent outline-none"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    <option value="All">All</option>
                    {ad.platforms.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <Btn tone="neutral" left={<span>🧾</span>} onClick={() => toastApi.info("Export CSV (demo)")}>Export</Btn>
                <Btn tone="neutral" left={<span>🧩</span>} onClick={() => onOpenMarketplace(ad.id)}>Preview</Btn>
                <Btn tone="neutral" left={<span>🛠️</span>} onClick={() => onOpenBuilder(ad.id)} disabled={!!ad.lock?.locked} title={ad.lock?.locked ? ad.lock.reason : "Edit in Builder"}>Edit</Btn>
                <Btn tone="neutral" left={<span>🔗</span>} onClick={() => onCopyLink(ad)}>Copy link</Btn>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-neutral-600 dark:text-slate-400">
              Supplier note: For Manual approval campaigns, final publish may require Admin confirmation even after Supplier approves.
            </div>
          </div>

          {kpis ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Impressions", value: kpis.impressions.toLocaleString(), icon: "👀" },
                { label: "Clicks", value: kpis.clicks.toLocaleString(), icon: "🖱️" },
                { label: "Orders", value: kpis.orders.toLocaleString(), icon: "🧾" },
                { label: "Revenue", value: money(ad.currency, kpis.revenue, false), icon: "💰" },
                { label: "CTR", value: pct(kpis.ctr), icon: "📈" },
                { label: "CVR", value: pct(kpis.cvr), icon: "⚡" },
                { label: "AOV", value: money(ad.currency, kpis.aov, false), icon: "🧮" },
                { label: "Compensation", value: compensationLabel(ad.compensation), icon: "🤝" }
              ].map((k) => (
                <div key={k.label} className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-neutral-500 dark:text-slate-400 font-bold">{k.label}</div>
                    <span className="inline-grid h-9 w-9 place-items-center rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">{k.icon}</span>
                  </div>
                  <div className="mt-2 text-[15px] sm:text-[18px] font-extrabold text-neutral-900 dark:text-slate-100 truncate">{k.value}</div>
                  <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Range: {range} · {platform}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LineChart
              title="Traffic trend"
              subtitle="Impressions vs Orders (last 14 days, demo)"
              seriesA={sImpr}
              seriesB={sOrders}
              aLabel="Impressions"
              bLabel="Orders"
            />

            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Health & approvals</div>
                  <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Operational risks that block scaling</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {health.map((h) => (
                  <div key={h.label} className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] font-extrabold">{h.label}</div>
                      <Pill tone={h.ok ? "good" : "warn"}>{h.ok ? "OK" : "Fix"}</Pill>
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{h.hint}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
            <div className="p-4 border-b border-neutral-200 dark:border-slate-800">
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Offers performance</div>
              <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Per-offer breakdown (demo derived)</div>
            </div>

            <div className="p-3 overflow-auto">
              <div className="min-w-[920px]">
                <div className="grid grid-cols-[2.4fr_1fr_1fr_1fr_1.2fr_1.6fr] gap-3 px-3 py-2 text-[11px] font-extrabold text-neutral-500 dark:text-slate-400">
                  <div>Offer</div>
                  <div>Type</div>
                  <div>Price</div>
                  <div>Sold</div>
                  <div>Conv</div>
                  <div>Notes</div>
                </div>

                <div className="space-y-2">
                  {offerRows.map((o) => (
                    <div key={o.id} className="grid grid-cols-[2.4fr_1fr_1fr_1fr_1.2fr_1.6fr] gap-3 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 items-center">
                      <div className="min-w-0 flex items-center gap-3">
                        <img src={o.posterUrl} alt={o.name} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/20" />
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{o.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {o.type === "PRODUCT" ? (
                              <>
                                <Pill tone={hasWholesale(o) ? "pro" : "neutral"}>{hasWholesale(o) ? "Wholesale" : "Retail"}</Pill>
                                <Pill tone="neutral">Stock: {o.stockLeft < 0 ? "∞" : o.stockLeft}</Pill>
                              </>
                            ) : (
                              <Pill tone="neutral">Service</Pill>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-[12px] font-extrabold">{o.type}</div>
                      <div className="text-[12px] font-extrabold">{money(o.currency, o.price, false)}</div>
                      <div className="text-[12px] font-extrabold">{o.sold.toLocaleString()}</div>
                      <div className="text-[12px] font-extrabold">{pct(o.conv)}</div>
                      <div className="text-[11px] text-neutral-600 dark:text-slate-400">{o.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Supplier governance</div>
            <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
              • If campaign approval is <b>Manual</b>, Supplier must approve creator content before Admin review.<br />
              • If Supplier chose <b>Not Use Creator</b>, Supplier is the host and content follows Supplier path (no collab stages).<br />
              • Status transitions (Pending approval → Generated → Scheduled → Live) should follow the workflow draft.
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

/* ------------------------------- Builder drawer ----------------------------- */

function AdBuilderDrawer({ open, onClose, ad, toastApi, onSaveDraft, onGenerate }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(ad?.campaignName || "");
  const [subtitle, setSubtitle] = useState(ad?.campaignSubtitle || "");
  const [creatorUsage, setCreatorUsage] = useState(ad?.creatorUsage || "I will use a Creator");
  const [collabMode, setCollabMode] = useState(ad?.collabMode || "Open for Collabs");
  const [approvalMode, setApprovalMode] = useState(ad?.approvalMode || "Manual");
  const [platforms, setPlatforms] = useState(ad?.platforms || ["TikTok"]);
  const [startISO, setStartISO] = useState(ad?.startISO || new Date(Date.now() + 3600 * 1000).toISOString());
  const [endISO, setEndISO] = useState(ad?.endISO || new Date(Date.now() + 4 * 3600 * 1000).toISOString());

  const [utm, setUtm] = useState({ source: "mylivedealz", medium: "adz", campaign: ad?.id || "" });
  const [pixel, setPixel] = useState({ meta: "", tiktok: "", gtag: "" });

  const [heroOk, setHeroOk] = useState(true);
  const [postersOk, setPostersOk] = useState(true);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName(ad?.campaignName || "");
    setSubtitle(ad?.campaignSubtitle || "");
    setCreatorUsage(ad?.creatorUsage || "I will use a Creator");
    setCollabMode(ad?.collabMode || "Open for Collabs");
    setApprovalMode(ad?.approvalMode || "Manual");
    setPlatforms(ad?.platforms || ["TikTok"]);
    setStartISO(ad?.startISO || new Date(Date.now() + 3600 * 1000).toISOString());
    setEndISO(ad?.endISO || new Date(Date.now() + 4 * 3600 * 1000).toISOString());
    setUtm({ source: "mylivedealz", medium: "adz", campaign: ad?.id || "" });
    setPixel({ meta: "", tiktok: "", gtag: "" });
    setHeroOk(true);
    setPostersOk(true);
  }, [open, ad?.id]);

  const togglePlatform = (p) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const steps = [
    { id: 1, label: "Campaign" },
    { id: 2, label: "Offers" },
    { id: 3, label: "Tracking" },
    { id: 4, label: "Generate" }
  ];

  const stepBtnCls = (id) =>
    cx(
      "px-3 py-2 rounded-2xl border text-[12px] font-extrabold transition-colors",
      step === id
        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:bg-slate-900 dark:text-slate-900 dark:border-white"
        : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800 text-neutral-800 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800"
    );

  return (
    <Drawer open={open} title="Ad Builder (Supplier)" onClose={onClose} zIndex={150}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{ad ? `Editing: ${ad.id}` : "New Ad"}</div>
          <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
            Mirror of Creator builder surface. Replace local state with API + validations.
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Btn tone="neutral" left={<span>💾</span>} onClick={() => onSaveDraft({ name, subtitle, creatorUsage, collabMode, approvalMode, platforms, startISO, endISO, utm, pixel })}>
            Save draft
          </Btn>
          <Btn tone="primary" left={<span>✨</span>} onClick={() => onGenerate()}>
            Generate
          </Btn>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {steps.map((s) => (
          <button key={s.id} type="button" className={stepBtnCls(s.id)} onClick={() => setStep(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {step === 1 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Campaign basics</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Supplier’s Creator usage decision drives downstream behavior.
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Campaign name</div>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px]" placeholder="e.g. Valentine Glow Week" />
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Subtitle</div>
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px]" placeholder="Short hook and positioning" />
              </div>

              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Creator usage decision</div>
                <select value={creatorUsage} onChange={(e) => setCreatorUsage(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-extrabold">
                  <option>I will use a Creator</option>
                  <option>I will NOT use a Creator</option>
                  <option>I am NOT SURE yet</option>
                </select>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  If NOT using creator, Supplier becomes host and collab logic is skipped.
                </div>
              </div>

              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Collaboration mode</div>
                <select
                  value={collabMode}
                  onChange={(e) => setCollabMode(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-extrabold"
                  disabled={creatorUsage === "I will NOT use a Creator"}
                  title={creatorUsage === "I will NOT use a Creator" ? "Not applicable when Supplier hosts" : ""}
                >
                  <option>Open for Collabs</option>
                  <option>Invite-Only</option>
                </select>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  Default is Open for Collabs. Editable before content submission.
                </div>
              </div>

              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Content approval</div>
                <select value={approvalMode} onChange={(e) => setApprovalMode(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-extrabold">
                  <option>Manual</option>
                  <option>Auto</option>
                </select>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  Manual: Supplier approves before Admin review. Auto: goes straight to Admin.
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Start</div>
                  <input value={startISO} onChange={(e) => setStartISO(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px]" />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">End</div>
                  <input value={endISO} onChange={(e) => setEndISO(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px]" />
                </div>
                <div className="sm:col-span-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                  <div className="text-[11px] text-neutral-600 dark:text-slate-400">Preview</div>
                  <div className="text-[12px] font-extrabold">{fmtLocal(new Date(startISO))} → {fmtLocal(new Date(endISO))} · Africa/Kampala</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Offers & pricing</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Mirror: products may support Retail + Wholesale; services remain Retail only.
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {(ad?.offers || []).map((o) => (
                <div key={o.id} className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] font-extrabold truncate">{o.name}</div>
                      <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{o.type}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Pill tone="neutral">Price: {money(o.currency, o.price, false)}</Pill>
                        {o.type === "PRODUCT" ? (
                          <Pill tone={hasWholesale(o) ? "pro" : "neutral"}>{hasWholesale(o) ? "Wholesale enabled" : "Retail only"}</Pill>
                        ) : (
                          <Pill tone="neutral">Service</Pill>
                        )}
                      </div>
                    </div>
                    <img src={o.posterUrl} alt={o.name} className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/20" />
                  </div>

                  {o.type === "PRODUCT" && hasWholesale(o) ? (
                    <div className="mt-3 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <div className="text-[11px] font-extrabold">Wholesale tiers</div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {o.wholesale?.tiers?.map((t) => (
                          <div key={t.minQty} className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                            <div className="text-[10px] text-neutral-600 dark:text-slate-400">Min qty</div>
                            <div className="text-[12px] font-extrabold">{t.minQty}</div>
                            <div className="mt-1 text-[10px] text-neutral-600 dark:text-slate-400">Unit</div>
                            <div className="text-[12px] font-extrabold">{money(o.currency, t.unitPrice, false)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                        MOQ {o.wholesale?.moq} · Step {o.wholesale?.step} · {o.wholesale?.leadTimeLabel}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}

              {!ad?.offers?.length ? (
                <div className="text-[12px] text-neutral-600 dark:text-slate-400">No offers yet. Add offers from catalog in the full Builder.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Tracking & compliance</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Mirror: UTM + pixels + policy checks. Replace with real integrations.
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">UTM</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <InputRow label="utm_source" value={utm.source} onChange={(v) => setUtm((p) => ({ ...p, source: v }))} />
                  <InputRow label="utm_medium" value={utm.medium} onChange={(v) => setUtm((p) => ({ ...p, medium: v }))} />
                  <InputRow label="utm_campaign" value={utm.campaign} onChange={(v) => setUtm((p) => ({ ...p, campaign: v }))} />
                </div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                  Tip: keep utm_campaign equal to ad id for stable attribution.
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Pixels</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <InputRow label="Meta pixel" value={pixel.meta} placeholder="1234567890" onChange={(v) => setPixel((p) => ({ ...p, meta: v }))} />
                  <InputRow label="TikTok pixel" value={pixel.tiktok} placeholder="TT-XXXXX" onChange={(v) => setPixel((p) => ({ ...p, tiktok: v }))} />
                  <InputRow label="Google tag" value={pixel.gtag} placeholder="G-XXXXXXX" onChange={(v) => setPixel((p) => ({ ...p, gtag: v }))} />
                </div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                  Supplier note: share links are disabled until Generate completes.
                </div>
              </div>

              <div className="md:col-span-2 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Media validation (demo)</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 text-[12px] font-extrabold">
                    <input type="checkbox" checked={heroOk} onChange={(e) => setHeroOk(e.target.checked)} />
                    Hero is {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height}
                  </label>
                  <label className="inline-flex items-center gap-2 text-[12px] font-extrabold">
                    <input type="checkbox" checked={postersOk} onChange={(e) => setPostersOk(e.target.checked)} />
                    Posters are {ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}
                  </label>
                </div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                  In production: enforce canonical sizes, warn/auto-crop, and block publish if critical media is missing.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Generate & publish</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Generate builds share links, validates media, and prepares platform exports.
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Checklist</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CheckRow ok={Boolean(name.trim())} label="Campaign name" hint="Required" />
                  <CheckRow ok={platforms.length > 0} label="Platforms" hint={platforms.length ? platforms.join(", ") : "Select at least one"} />
                  <CheckRow ok={heroOk} label="Hero media" hint={`${HERO_IMAGE_REQUIRED.width}×${HERO_IMAGE_REQUIRED.height}`} />
                  <CheckRow ok={postersOk} label="Offer posters" hint={`${ITEM_POSTER_REQUIRED.width}×${ITEM_POSTER_REQUIRED.height}`} />
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Actions</div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                  Supplier note: if approval is Manual, your content goes through Supplier approval then Admin approval.
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Btn tone="primary" left={<span>✨</span>} onClick={() => onGenerate()}>
                    Generate now
                  </Btn>
                  <Btn tone="neutral" left={<span>🔎</span>} onClick={() => toastApi.info("Open preview surface (demo)")}>Preview surfaces</Btn>
                  <Btn tone="neutral" left={<span>📤</span>} onClick={() => toastApi.info("Submit for approvals (demo)")}>Submit for approvals</Btn>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

function InputRow({ label, value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">{label}</div>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px]"
      />
    </div>
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

/* --------------------------------- Page ----------------------------------- */

export default function SupplierAdzDashboardPage() {
  const navigate = useNavigate();
  const toastApi = useToasts();
  const { run, isPending } = useAsyncAction(toastApi);
  const syncedAdsRef = useRef<Record<string, string>>({});

  const isMobile = useMemo(() => (typeof window !== "undefined" ? window.innerWidth < 480 : false), []);

  const [drawer, setDrawer] = useState(null); // null | calendar | quickLinks | performance | builder
  const [drawerData, setDrawerData] = useState(undefined); // adId

  const [ads, setAds] = useState<Array<Record<string, any>>>([]);
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    let cancelled = false;

    void sellerBackendApi
      .getAdzCampaigns()
      .then((payload) => {
        if (cancelled) return;
        const nextAds = payload.map((entry) => mapBackendAdzCampaign(entry));
        if (nextAds.length) {
          setAds(nextAds as Array<Record<string, any>>);
          syncedAdsRef.current = Object.fromEntries(nextAds.map((ad) => [String(ad.id), hashAdzCampaign(ad)]));
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
      if (syncedAdsRef.current[String(ad.id)] === nextHash) return;
      syncedAdsRef.current[String(ad.id)] = nextHash;
      void sellerBackendApi.patchAdzCampaign(String(ad.id), buildAdzCampaignPayload(ad));
    });
  }, [ads]);

  useEffect(() => {
    if (!ads.length) return;
    if (!ads.find((ad) => ad.id === selectedId)) {
      setSelectedId(ads[0]?.id || "");
    }
  }, [ads, selectedId]);
  const selected = useMemo(() => ads.find((a) => a.id === selectedId) || ads[0] || null, [ads, selectedId]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [onlyWholesaleReady, setOnlyWholesaleReady] = useState(false);

  const [pendingGenerateId, setPendingGenerateId] = useState(null);

  const safeNav = (url) => {
    if (!url) return;
    const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noreferrer");
      return;
    }
    navigate(target);
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ads
      .filter((a) => (status === "All" ? true : a.status === status))
      .filter((a) => {
        if (!onlyWholesaleReady) return true;
        return a.offers.some((o) => hasWholesale(o));
      })
      .filter((a) => {
        if (!query) return true;
        return (
          String(a.campaignName).toLowerCase().includes(query) ||
          String(a.supplier?.name).toLowerCase().includes(query) ||
          String(a.creator?.handle).toLowerCase().includes(query) ||
          String(a.id).toLowerCase().includes(query)
        );
      });
  }, [ads, q, status, onlyWholesaleReady]);

  // Global dashboard analytics
  const seriesImpr = useMemo(
    () => deriveMetricSeries(ads.reduce((sum, ad) => sum + Number(ad.impressions7d ?? ad.impressions ?? 0), 0), 14, "dashboard-impressions"),
    [ads]
  );
  const seriesOrders = useMemo(
    () => deriveMetricSeries(ads.reduce((sum, ad) => sum + Number(ad.orders7d ?? ad.orders ?? 0), 0), 14, "dashboard-orders"),
    [ads]
  );

  const retailWholesaleSplit = useMemo(() => {
    let retail = 0;
    let wholesale = 0;
    let services = 0;
    ads.forEach((a) => {
      a.offers.forEach((o) => {
        if (o.type === "SERVICE") services += 1;
        else {
          if (hasRetail(o)) retail += 1;
          if (hasWholesale(o)) wholesale += 1;
        }
      });
    });
    return { retail, wholesale, services };
  }, [ads]);

  const platformCounts = useMemo(() => {
    const m = new Map();
    ads.forEach((a) => a.platforms.forEach((p) => m.set(p, (m.get(p) || 0) + 1)));
    return Array.from(m.entries()).map(([label, value]) => ({ label, value }));
  }, [ads]);

  const totalRevenue7d = useMemo(() => ads.reduce((s, a) => s + (a.revenue7d || 0), 0), [ads]);
  const totalOrders7d = useMemo(() => ads.reduce((s, a) => s + (a.orders7d || 0), 0), [ads]);
  const totalClicks7d = useMemo(() => ads.reduce((s, a) => s + (a.clicks7d || 0), 0), [ads]);
  const avgCvr = useMemo(() => (totalClicks7d ? totalOrders7d / totalClicks7d : 0), [totalClicks7d, totalOrders7d]);

  const topCampaigns = useMemo(() => {
    return [...ads]
      .sort((a, b) => (b.orders7d || 0) - (a.orders7d || 0))
      .slice(0, 5)
      .map((a) => ({
        label: a.campaignName,
        value: a.orders7d || 0,
        hint: `${a.platforms.join(", ")} · Supplier ${a.supplier.name}`
      }));
  }, [ads]);

  const statuses = useMemo(() => {
    const m = new Map();
    ads.forEach((a) => m.set(a.status, (m.get(a.status) || 0) + 1));
    return Array.from(m.entries()).map(([label, value]) => ({ label, value }));
  }, [ads]);

  function openAdBuilder(adId) {
    setDrawerData(adId);
    setDrawer("builder");
  }

  function openPerformance(adId) {
    setDrawerData(adId);
    setDrawer("performance");
  }

  function openMarketplace(adId) {
    safeNav(adId ? `/supplier/adz-marketplace?adId=${encodeURIComponent(adId)}` : "/supplier/adz-marketplace");
  }

  function openManager() {
    safeNav("/supplier/adz-manager");
  }

  function openAssets() {
    safeNav("/supplier/asset-library");
  }

  function copyShareLink(ad) {
    if (!ad?.generated) {
      toastApi.warning("Generate the ad first to enable share links.");
      return;
    }
    const link = `https://mldz.link/${encodeURIComponent(ad.id)}`;
    try {
      navigator.clipboard?.writeText(link);
    } catch {
      // ignore
    }
    toastApi.success("Share link copied (demo). ");
  }

  function generateAd(adId) {
    setPendingGenerateId(adId);
    run(
      async () => {
        setAds((prev) =>
          prev.map((a) =>
            a.id === adId
              ? { ...a, generated: true, status: a.status === "Draft" ? "Scheduled" : a.status }
              : a
          )
        );
        return true;
      },
      { successMessage: "Ad generated. Share buttons enabled.", delay: 1400 }
    ).finally(() => setPendingGenerateId(null));
  }

  const kpiCards = useMemo(
    () => [
      { label: "Revenue (7d)", value: money("UGX", totalRevenue7d, isMobile), icon: "📈" },
      { label: "Orders (7d)", value: totalOrders7d.toLocaleString(), icon: "🧾" },
      { label: "Clicks (7d)", value: totalClicks7d.toLocaleString(), icon: "🔗" },
      { label: "Avg CVR", value: pct(avgCvr), icon: "⚡" }
    ],
    [totalRevenue7d, isMobile, totalOrders7d, totalClicks7d, avgCvr]
  );

  const builderAd = useMemo(() => (drawerData ? ads.find((a) => a.id === drawerData) : null), [drawerData, ads]);
  const perfAd = useMemo(() => (drawerData ? ads.find((a) => a.id === drawerData) : null), [drawerData, ads]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Adz Dashboard"
        rightContent={
          <div className="flex items-center gap-2">
            <Btn tone="neutral" left={<span>📊</span>} onClick={() => selected && openPerformance(selected.id)}>
              Adz Performance
            </Btn>
            <Btn tone="primary" left={<span>＋</span>} onClick={() => openAdBuilder(undefined)}>
              New Ad
            </Btn>
          </div>
        }
      />

      {/* Search + filters */}
      <div className="border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="w-full max-w-full px-[0.55%] py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 transition-colors">
            <span className="text-neutral-500 dark:text-slate-400">🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by campaign, supplier, creator or ad id…"
              className="w-full bg-transparent outline-none text-[12px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold flex items-center gap-2 transition-colors">
              <span className="text-neutral-700 dark:text-slate-300">🧰</span>
              <span className="text-neutral-700 dark:text-slate-300">Status</span>
              <select
                className="bg-transparent outline-none text-neutral-900 dark:text-neutral-100 dark:bg-slate-900"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                  "All",
                  "Draft",
                  "Scheduled",
                  "Generated",
                  "Live",
                  "Paused",
                  "Pending approval",
                  "Rejected",
                  "Ended"
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={cx(
                "rounded-2xl border px-3 py-2 text-[12px] font-extrabold transition",
                onlyWholesaleReady
                  ? "border-transparent text-white dark:text-white"
                  : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-700"
              )}
              style={onlyWholesaleReady ? { background: ORANGE } : undefined}
              onClick={() => setOnlyWholesaleReady((v) => !v)}
              title="Show only ads that include at least one wholesale-capable product offer"
            >
              ✅ Wholesale-ready
            </button>

            <Btn tone="neutral" left={<span>📅</span>} onClick={() => setDrawer("calendar")}>Calendar</Btn>
            <Btn tone="neutral" left={<span>🌐</span>} onClick={() => setDrawer("quickLinks")}>Quick Links</Btn>
          </div>
        </div>
      </div>

      {/* Top KPIs + charts + list */}
      <div className="w-full max-w-full px-[0.55%] py-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map((k) => (
            <div key={k.label} className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-neutral-500 dark:text-slate-400 font-bold">{k.label}</div>
                <span className="inline-grid h-9 w-9 place-items-center rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
                  {k.icon}
                </span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-slate-100">{k.value}</div>
              <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Premium snapshot (demo)</div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-7 space-y-4">
          <LineChart
            title="Traffic trend"
            subtitle="Impressions vs Orders (last 14 days)"
            seriesA={seriesImpr}
            seriesB={seriesOrders}
            aLabel="Impressions"
            bLabel="Orders"
          />

          <BarList title="Top campaigns by orders" subtitle="Best performers (last 7 days)" rows={topCampaigns} />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <DonutChart
            title="Offer mix"
            subtitle="Retail vs Wholesale vs Services"
            segments={[
              { label: "Retail offers", value: retailWholesaleSplit.retail, tone: "brand" },
              { label: "Wholesale-enabled offers", value: retailWholesaleSplit.wholesale, tone: "pro" },
              { label: "Services", value: retailWholesaleSplit.services, tone: "neutral" }
            ]}
          />

          <DonutChart
            title="Ads by platform"
            subtitle="How your campaigns are distributed"
            segments={platformCounts.map((p, idx) => ({
              label: p.label,
              value: p.value,
              tone: idx === 0 ? "brand" : idx === 1 ? "pro" : "neutral"
            }))}
          />

          <BarList title="Statuses" subtitle="Pipeline health" rows={statuses.map((s) => ({ label: s.label, value: s.value }))} />
        </div>

        {/* Ads list */}
        <div className="lg:col-span-12 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
          <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition-colors">
            <div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Your Adz</div>
              <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                Select an ad for quick actions. Edit is done in Ad Builder. Deep analytics in Adz Performance.
              </div>
            </div>
            <Pill tone="neutral">{filtered.length} results</Pill>
          </div>

          <div className="p-3 overflow-auto">
            <div className="min-w-[1200px]">
              <div className="grid grid-cols-[3fr_2fr_1.5fr_2fr_0.8fr_3.2fr] gap-4 px-3 py-2 text-[11px] font-extrabold text-neutral-500 dark:text-slate-400">
                <div>Campaign</div>
                <div>Supplier</div>
                <div>Host</div>
                <div>Status</div>
                <div>Offers</div>
                <div className="text-right pr-2">Actions</div>
              </div>

              <div className="space-y-2">
                {filtered.map((a) => {
                  const active = a.id === selectedId;
                  const productCount = a.offers.filter((o) => o.type === "PRODUCT").length;
                  const serviceCount = a.offers.filter((o) => o.type === "SERVICE").length;
                  const wholesaleCount = a.offers.filter((o) => hasWholesale(o)).length;
                  const canEdit = !a.lock?.locked;
                  const canShare = a.generated;

                  const statusTone =
                    a.status === "Live"
                      ? "good"
                      : a.status === "Scheduled" || a.status === "Pending approval"
                        ? "warn"
                        : a.status === "Rejected"
                          ? "bad"
                          : "neutral";

                  return (
                    <div
                      key={a.id}
                      className={cx(
                        "grid grid-cols-[3fr_2fr_1.5fr_2fr_0.8fr_3.2fr] gap-4 rounded-3xl border p-3 transition items-center relative",
                        active
                          ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-900/10"
                          : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
                      )}
                      onClick={() => setSelectedId(a.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <img src={a.supplier.logoUrl} alt={a.supplier.name} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/20" />
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{a.campaignName}</div>
                            <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400">{a.campaignSubtitle}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-neutral-800 dark:text-slate-300">
                              <Pill tone="neutral" title="Compensation">{compensationLabel(a.compensation)}</Pill>
                              {wholesaleCount ? <Pill tone="pro">Wholesale</Pill> : <Pill tone="neutral">Retail</Pill>}
                              <Pill tone={a.creatorUsage === "I will NOT use a Creator" ? "warn" : a.creatorUsage === "I will use a Creator" ? "good" : "neutral"}>
                                {a.creatorUsage}
                              </Pill>
                              <Pill tone="neutral">Collab: {a.collabMode}</Pill>
                              <Pill tone={a.approvalMode === "Manual" ? "warn" : "good"}>Approval: {a.approvalMode}</Pill>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{a.supplier.name}</div>
                        <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400">{a.supplier.category}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <img src={a.creator.avatarUrl} alt={a.creator.name} className="h-8 w-8 rounded-2xl object-cover ring-1 ring-neutral-200" />
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{a.creator.handle}</div>
                            <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400">
                              {a.hostRole === "Supplier" ? "Supplier host" : a.creator.verified ? "Verified creator" : "Creator"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Pill tone={statusTone}>
                            {a.status === "Live" ? "🟢 Live" : a.status === "Scheduled" ? "🗓️ Scheduled" : a.status === "Generated" ? "✅ Generated" : a.status === "Pending approval" ? "⚠️ Pending" : a.status === "Rejected" ? "⛔ Rejected" : `⏱️ ${a.status}`}
                          </Pill>

                          {a.hasBrokenLink ? <Pill tone="warn" title="Tracking link issue detected">🔗 Link issue</Pill> : null}
                          {a.lowStock ? <Pill tone="warn" title="Low stock on at least one product">⚠️ Low stock</Pill> : null}
                          {a.lock?.locked ? <Pill tone="warn" title={a.lock.reason}>🔒 {a.lock.label}</Pill> : null}
                        </div>

                        <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                          {fmtLocal(new Date(a.startISO))} → {fmtLocal(new Date(a.endISO))} · {a.timezone}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{a.offers.length}</div>
                        <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                          {productCount ? `${productCount} prod` : ""}
                          {productCount && serviceCount ? " · " : ""}
                          {serviceCount ? `${serviceCount} svc` : ""}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Btn
                          tone="neutral"
                          left={<span>📊</span>}
                          onClick={(e) => {
                            e.stopPropagation();
                            openPerformance(a.id);
                          }}
                        >
                          Performance
                        </Btn>

                        <Btn
                          tone="neutral"
                          left={<span>🪄</span>}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEdit) openAdBuilder(a.id);
                            else toastApi.warning(a.lock?.reason || "Editing locked");
                          }}
                          disabled={!canEdit}
                          title={!canEdit ? a.lock?.reason : "Edit in Ad Builder"}
                        >
                          Edit
                        </Btn>

                        {canShare ? (
                          <button
                            type="button"
                            className="rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 px-3 py-2 text-[12px] font-extrabold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-slate-700 transition inline-flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyShareLink(a);
                            }}
                            title="Copy share link"
                          >
                            🔗 Copy link
                          </button>
                        ) : null}

                        {!a.generated ? (
                          <Btn
                            tone="primary"
                            left={<span>✨</span>}
                            onClick={(e) => {
                              e.stopPropagation();
                              generateAd(a.id);
                            }}
                            isPending={pendingGenerateId === a.id}
                            disabled={!!a.lock?.locked}
                            title={a.lock?.locked ? a.lock.reason : "Generate the ad to enable share"}
                            className="min-w-[120px]"
                          >
                            Generate
                          </Btn>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {!filtered.length ? (
                  <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-[12px] text-neutral-600 dark:text-slate-400">
                    No adz match your filters.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar drawer */}
      <Drawer open={drawer === "calendar"} title="Ad Calendar (Premium summary)" onClose={() => setDrawer(null)}>
        <div className="space-y-4">
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Upcoming schedule</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Summary view. Detailed scheduling is configured in Ad Builder.
            </div>

            <div className="mt-3 space-y-2">
              {ads
                .slice()
                .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
                .slice(0, 8)
                .map((a) => (
                  <div key={a.id} className="rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 p-3 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{a.campaignName}</div>
                        <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                          {fmtLocal(new Date(a.startISO))} → {fmtLocal(new Date(a.endISO))} · {a.timezone}
                        </div>
                      </div>
                      <Pill tone={a.status === "Generated" ? "good" : a.status === "Scheduled" ? "warn" : "neutral"}>{a.status}</Pill>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn tone="neutral" left={<span>🪄</span>} onClick={() => openAdBuilder(a.id)} disabled={!!a.lock?.locked} title={a.lock?.reason}>
                        Open in Builder
                      </Btn>
                      <Btn tone="neutral" left={<span>📊</span>} onClick={() => openPerformance(a.id)}>
                        Performance
                      </Btn>
                      <Btn tone="neutral" left={<span>🧩</span>} onClick={() => openMarketplace(a.id)}>
                        Preview
                      </Btn>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Premium note</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Week view + drag-to-reschedule + load meter can be added as a next premium upgrade.
            </div>
          </div>
        </div>
      </Drawer>

      {/* Quick links drawer */}
      <Drawer open={drawer === "quickLinks"} title="Quick links" onClose={() => setDrawer(null)}>
        <div className="space-y-3">
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Supplier workflow</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Btn tone="primary" left={<span>＋</span>} onClick={() => openAdBuilder(undefined)}>
                New Ad in Builder
              </Btn>
              <Btn tone="neutral" left={<span>🧩</span>} onClick={() => openMarketplace()}>
                Open Adz Marketplace
              </Btn>
              <Btn tone="neutral" left={<span>📊</span>} onClick={() => selected && openPerformance(selected.id)}>
                Open Adz Performance
              </Btn>
              <Btn tone="neutral" left={<span>👤</span>} onClick={() => openManager()}>
                Open Adz Manager
              </Btn>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Content</div>
            <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
              Content can come from Supplier catalogs, creator uploads, and curated asset bundles.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn tone="primary" left={<span>📁</span>} onClick={() => openAssets()}>
                Open Asset Library
              </Btn>
              <Pill tone="neutral" title="Canonical hero size">Hero: {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height}</Pill>
              <Pill tone="neutral" title="Offer poster size">Posters: {ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}</Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Retail & Wholesale guidance</div>
            <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
              Wholesale is enabled per Product offer and uses MOQ + tier pricing. Services remain unchanged and do not show wholesale controls.
            </div>
          </div>
        </div>
      </Drawer>

      {/* Performance drawer */}
      <PerformanceDrawer
        open={drawer === "performance"}
        onClose={() => setDrawer(null)}
        ad={perfAd || selected}
        allAds={ads}
        toastApi={toastApi}
        onOpenBuilder={(id) => openAdBuilder(id)}
        onOpenMarketplace={(id) => openMarketplace(id)}
        onCopyLink={(ad) => copyShareLink(ad)}
      />

      {/* Builder drawer */}
      <AdBuilderDrawer
        open={drawer === "builder"}
        onClose={() => setDrawer(null)}
        ad={builderAd}
        toastApi={toastApi}
        onSaveDraft={(payload) => toastApi.success(`Draft saved (demo): ${payload.name || "Untitled"}`)}
        onGenerate={() => {
          if (!builderAd) {
            toastApi.success("Generated (demo). Create will happen on save in production.");
            return;
          }
          generateAd(builderAd.id);
        }}
      />

      {toastApi.toast ? <Toast tone={toastApi.toast.tone} message={toastApi.toast.message} onClose={toastApi.clear} /> : null}
    </div>
  );
}
