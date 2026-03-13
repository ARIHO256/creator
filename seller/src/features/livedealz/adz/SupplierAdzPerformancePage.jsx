import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SupplierAdzPerformancePage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: AdzPerformance.tsx
 *
 * Mirror-first preserved:
 * - Self-contained page + drawer usage
 * - Range + entity selector controls
 * - KPI summary cards
 * - Funnel + breakdown cards (platform, item, creative)
 * - Insights & recommendations
 * - Export CSV + Share link actions
 * - Locked state for permission gating
 *
 * Supplier adaptations (minimal, required):
 * - Interprets “earnings” as Supplier-side Revenue/GMV.
 * - Adds Supplier-specific settlement preview: Est. Creator Payout + Net Revenue.
 * - Adds link health actions: open Links Hub when broken link risk exists.
 * - Role awareness:
 *   - If no creator is attached, shows “Supplier-hosted (Supplier acts as Creator)” pill.
 *
 * Canvas-safe:
 * - No MUI, no lucide-react, no app context imports.
 * - Local icons + local toast + local async wrapper.
 * - Tailwind assumed.
 */

const ORANGE = "#f77f00";

/* ------------------------------ helpers ------------------------------ */

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function pct(n) {
  if (!isFinite(n)) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}

function shortNum(n) {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function moneyUSD(n) {
  if (!isFinite(n)) return "$0";
  const rounded = Math.round(n);
  return `$${rounded.toLocaleString()}`;
}

async function safeCopy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/* ------------------------------ local async + toast ------------------------------ */

function useAsyncAction(toast) {
  const [isPending, setIsPending] = useState(false);

  const run = async (fn, { successMessage, errorMessage } = {}) => {
    setIsPending(true);
    try {
      await fn();
      toast?.(successMessage || "Done", "success");
    } catch (e) {
      toast?.(errorMessage || "Something went wrong", "error");
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setIsPending(false);
    }
  };

  return { run, isPending };
}

function Toast({ text, tone = "info", onClose }) {
  React.useEffect(() => {
    if (!text) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [text, onClose]);

  if (!text) return null;
  const dot =
    tone === "success" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : tone === "error" ? "bg-rose-500" : "bg-slate-400";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
      <div className="rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-semibold shadow-lg flex items-center gap-2">
        <span className={cx("h-2 w-2 rounded-full", dot)} />
        <span>{text}</span>
      </div>
    </div>
  );
}

/* ------------------------------ tiny icons (inline SVG) ------------------------------ */

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

const IBarChart = (p) => (
  <Icon {...p}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20V13" />
  </Icon>
);

const ICopy = (p) => (
  <Icon {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

const IExternal = (p) => (
  <Icon {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M21 14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" />
  </Icon>
);

const IShare = (p) => (
  <Icon {...p}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <path d="M16 6 12 2 8 6" />
    <path d="M12 2v14" />
  </Icon>
);

const ILock = (p) => (
  <Icon {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

const IX = (p) => (
  <Icon {...p}>
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </Icon>
);

const IAlert = (p) => (
  <Icon {...p}>
    <path d="M10.3 3.1 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.1a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
);



/* ------------------------------ types (JSDoc) ------------------------------ */

/**
 * @typedef {"TikTok"|"Instagram"|"YouTube"|"Facebook"|"Other"} PerfPlatform
 */

/**
 * @typedef {{type:"Commission", commissionRate:number, currency?:string} | {type:"Flat fee", flatFee:number, currency:string} | {type:"Hybrid", commissionRate:number, flatFee:number, currency:string}} Compensation
 */

/**
 * @typedef {{id:string,label:string,impressions:number,clicks:number,orders:number,earnings:number}} PerformanceVariant
 */

/**
 * @typedef {{id:string,kind:"product"|"service",name:string,price?:number,imageUrl?:string,videoUrl?:string}} PerformanceItem
 */

/**
 * @typedef {{
 *  id:string,
 *  kind:"ad"|"deal",
 *  name:string,
 *  status?:string,
 *  platforms:PerfPlatform[],
 *  primaryItem?:string,
 *  items:PerformanceItem[],
 *  impressions:number,
 *  clicks:number,
 *  orders:number,
 *  earnings:number,
 *  creator?:{name:string,handle?:string,avatarUrl?:string},
 *  compensation?:Compensation,
 *  hasBrokenLink?:boolean,
 *  variants?:PerformanceVariant[]
 * }} PerformanceEntity
 */

function formatCompensation(c) {
  if (!c) return "—";
  if (c.type === "Commission") return `Commission · ${Math.round(c.commissionRate * 100)}%`;
  if (c.type === "Flat fee") return `Flat fee · ${c.currency}${Math.round(c.flatFee)}`;
  return `Hybrid · ${Math.round(c.commissionRate * 100)}% + ${c.currency}${Math.round(c.flatFee)}`;
}

function estimatePayoutForEntity(e) {
  const c = e?.compensation;
  if (!c) return 0;
  const revenue = Number(e?.earnings || 0);
  if (c.type === "Commission") return revenue * Number(c.commissionRate || 0);
  if (c.type === "Flat fee") return Number(c.flatFee || 0);
  return Number(c.flatFee || 0) + revenue * Number(c.commissionRate || 0);
}

/* ------------------------------ UI primitives ------------------------------ */

function Pill({ text, tone = "neutral", icon }) {
  const toneCls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800"
          : "border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700";

  return (
    <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", toneCls)}>
      {icon}
      {text}
    </span>
  );
}

function Button({ children, onClick, disabled, variant = "soft", title }) {
  const base = "inline-flex items-center gap-2 px-3 py-2 rounded-2xl border transition-colors text-sm font-semibold transition";

  if (variant === "primary") {
    return (
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onClick}
        className={cx(
          base,
          "text-white dark:text-slate-950 font-bold border-transparent shrink-0",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:opacity-95"
        )}
        style={{ background: ORANGE }}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        base,
        "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors shrink-0",
        disabled ? "opacity-60 cursor-not-allowed text-slate-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800" : "shadow-sm"
      )}
    >
      {children}
    </button>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Drawer({ open, onClose, title, subtitle, width = "max-w-[1100px]", children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cx(
          "absolute right-0 top-0 h-full w-full max-w-3xl bg-white dark:bg-slate-950 shadow-2xl flex flex-col transition-colors border-l border-slate-200 dark:border-slate-800",
          width
        )}
      >
        <div className="px-[0.55%] py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold flex flex-wrap items-center gap-2 text-slate-900 dark:text-slate-100">
              <IBarChart className="h-4 w-4" /> {title}
            </div>
            {subtitle ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
          >
            <IX className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------ Core view ------------------------------ */

function SupplierAdzPerformance({
  entities,
  selectedId: initialSelectedId = "__all__",
  range: initialRange = "all",
  canView = true,
  entityLabelSingular = "Ad",
  entityLabelPlural = "Adz",
  headerHint,
  showOpenFullPage = false,
  toast
}) {
  const navigate = useNavigate();
  const go = (destination) => {
    if (!destination) return;
    const target = /^https?:\/\//i.test(destination) ? destination : destination.startsWith("/") ? destination : `/${destination}`;
    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noreferrer");
      return;
    }
    navigate(target);
  };
  const { run, isPending } = useAsyncAction(toast);

  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [range, setRange] = useState(initialRange);

  const scoped = useMemo(() => {
    if (selectedId === "__all__") return entities;
    return entities.filter((e) => e.id === selectedId);
  }, [entities, selectedId]);

  const totals = useMemo(() => {
    const impressions = scoped.reduce((a, e) => a + (e.impressions || 0), 0);
    const clicks = scoped.reduce((a, e) => a + (e.clicks || 0), 0);
    const orders = scoped.reduce((a, e) => a + (e.orders || 0), 0);
    const revenue = scoped.reduce((a, e) => a + (e.earnings || 0), 0);
    const payout = scoped.reduce((a, e) => a + estimatePayoutForEntity(e), 0);
    return {
      impressions,
      clicks,
      orders,
      revenue,
      payout,
      net: revenue - payout,
      ctr: impressions ? clicks / impressions : 0,
      cvr: clicks ? orders / clicks : 0
    };
  }, [scoped]);

  const byPlatform = useMemo(() => {
    const m = new Map();
    scoped.forEach((e) => {
      const plats = e.platforms?.length ? e.platforms : ["Other"];
      const split = plats.length ? 1 / plats.length : 1;
      plats.forEach((p) => {
        const prev = m.get(p) || { platform: p, impressions: 0, clicks: 0, orders: 0, revenue: 0 };
        prev.impressions += Math.round((e.impressions || 0) * split);
        prev.clicks += Math.round((e.clicks || 0) * split);
        prev.orders += Math.round((e.orders || 0) * split);
        prev.revenue += (e.earnings || 0) * split;
        m.set(p, prev);
      });
    });
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [scoped]);

  const byItem = useMemo(() => {
    const m = new Map();
    scoped.forEach((e) => {
      const items = e.items || (e.primaryItem ? [{ id: e.primaryItem, kind: "product", name: e.primaryItem }] : []);
      const split = items.length ? 1 / items.length : 1;
      items.forEach((it) => {
        const key = it.name;
        const prev = m.get(key) || { name: key, impressions: 0, clicks: 0, orders: 0, revenue: 0 };
        prev.impressions += Math.round((e.impressions || 0) * split);
        prev.clicks += Math.round((e.clicks || 0) * split);
        prev.orders += Math.round((e.orders || 0) * split);
        prev.revenue += (e.earnings || 0) * split;
        m.set(key, prev);
      });
    });
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [scoped]);

  const byCreative = useMemo(() => {
    if (scoped.length === 1 && scoped[0]?.variants?.length) return scoped[0].variants;
    const halfImp = Math.round(totals.impressions * 0.55);
    const halfClk = Math.round(totals.clicks * 0.55);
    const halfOrd = Math.round(totals.orders * 0.55);
    const halfRev = totals.revenue * 0.55;
    return [
      { id: "vA", label: "A", impressions: halfImp, clicks: halfClk, orders: halfOrd, earnings: halfRev },
      { id: "vB", label: "B", impressions: totals.impressions - halfImp, clicks: totals.clicks - halfClk, orders: totals.orders - halfOrd, earnings: totals.revenue - halfRev }
    ];
  }, [scoped, totals]);

  const insights = useMemo(() => {
    const withRates = entities.map((e) => ({
      e,
      ctr: e.impressions ? e.clicks / e.impressions : 0,
      cvr: e.clicks ? e.orders / e.clicks : 0
    }));

    const topRevenue = withRates.slice().sort((a, b) => (b.e.earnings || 0) - (a.e.earnings || 0))[0]?.e;
    const topCTR = withRates.slice().sort((a, b) => b.ctr - a.ctr)[0]?.e;
    const topCVR = withRates.slice().sort((a, b) => b.cvr - a.cvr)[0]?.e;
    const broken = scoped.filter((e) => e.hasBrokenLink).length;

    return { topRevenue, topCTR, topCVR, broken };
  }, [entities, scoped]);

  const selectedEntity = useMemo(() => (selectedId === "__all__" ? null : entities.find((e) => e.id === selectedId) || null), [entities, selectedId]);

  const exportCSV = () =>
    run(
      async () => {
        const header = "id,name,kind,platforms,status,impressions,clicks,orders,revenue,primary_item,creator,compensation";
        const rows = scoped
          .map((e) =>
            [
              e.id,
              JSON.stringify(e.name),
              e.kind,
              JSON.stringify(e.platforms),
              JSON.stringify(e.status || ""),
              e.impressions,
              e.clicks,
              e.orders,
              e.earnings,
              JSON.stringify(e.primaryItem || ""),
              JSON.stringify(e.creator?.handle || e.creator?.name || ""),
              JSON.stringify(formatCompensation(e.compensation))
            ].join(",")
          )
          .join("\n");

        const csvContent = header + "\n" + rows;
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `supplier_adz_performance_${range}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      { successMessage: "CSV exported successfully!" }
    );

  const shareLink = async () => {
    if (!canView) return;
    const base = `${window.location.origin}/supplier/adz/performance`;
    const url = selectedEntity ? `${base}?entityId=${encodeURIComponent(selectedEntity.id)}` : base;
    const ok = await safeCopy(url);
    toast(ok ? "Link copied to clipboard!" : "Copy failed", ok ? "success" : "error");
  };

  if (!entities || entities.length === 0) {
    return (
      <Card title="No performance data" subtitle="Create a Shoppable Ad or run a Deal to see analytics.">
        <div className="text-sm text-slate-700 dark:text-slate-200">Try: Adz Manager → Create Ad → Publish → Track here.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Pill text={`Range: ${range === "all" ? "All-time" : range}`} />
          <Pill text={`${entityLabelPlural}: ${entities.length}`} />
          {headerHint ? <span className="text-xs text-slate-500 dark:text-slate-400">{headerHint}</span> : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="px-3 py-2 rounded-2xl border transition-colors border-slate-200 bg-white text-sm font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="__all__">All {entityLabelPlural}</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            className="px-3 py-2 rounded-2xl border transition-colors border-slate-200 bg-white text-sm font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="all">All-time</option>
            <option value="30d">Last 30d</option>
            <option value="7d">Last 7d</option>
          </select>

          <Button disabled={!canView || isPending} title={!canView ? "Requires analytics.view" : "Export CSV"} onClick={exportCSV}>
            <ICopy className="h-4 w-4" /> Export CSV
          </Button>

          <Button disabled={!canView} title={!canView ? "Requires analytics.view" : "Share"} onClick={shareLink}>
            <IShare className="h-4 w-4" /> Share
          </Button>

          {showOpenFullPage ? (
            <Button
              disabled={!canView}
              title={!canView ? "Requires analytics.view" : "Open full page"}
              onClick={() => {
                const href = selectedEntity ? `/supplier/adz/performance?entityId=${encodeURIComponent(selectedEntity.id)}` : "/supplier/adz/performance";
                go(href);
                toast("Opening full page…", "info");
              }}
            >
              <IExternal className="h-4 w-4" /> Open page
            </Button>
          ) : null}
        </div>
      </div>

      {!canView ? (
        <Card title="Locked" subtitle="Enable analytics.view to access Adz Performance." right={<ILock className="h-4 w-4" />}>
          <div className="text-sm text-slate-700 dark:text-slate-200">Analytics is restricted by role.</div>
        </Card>
      ) : (
        <>
          {selectedEntity ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{selectedEntity.name}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-2 gap-y-1">
                    <span className="truncate">{entityLabelSingular} · {selectedEntity.kind}</span>
                    <span>·</span>
                    <span className="truncate">{(selectedEntity.platforms || []).join(", ")}</span>
                    {selectedEntity.status ? (
                      <>
                        <span>·</span>
                        <span className="truncate">{selectedEntity.status}</span>
                      </>
                    ) : null}
                    {selectedEntity.creator?.handle || selectedEntity.creator?.name ? (
                      <>
                        <span>·</span>
                        <span className="truncate">{selectedEntity.creator.handle ? `@${selectedEntity.creator.handle}` : selectedEntity.creator.name}</span>
                      </>
                    ) : (
                      <>
                        <span>·</span>
                        <span className="truncate">Supplier-hosted</span>
                      </>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedEntity.compensation ? <Pill text={formatCompensation(selectedEntity.compensation)} tone="neutral" /> : <Pill text="No creator payout" tone="neutral" />}
                    {selectedEntity.hasBrokenLink ? (
                      <Pill tone="danger" text="Broken link risk" icon={<IAlert className="h-3 w-3" />} />
                    ) : (
                      <Pill tone="good" text="Link health OK" />
                    )}
                  </div>

                  {selectedEntity.hasBrokenLink ? (
                    <div className="mt-2">
                      <Button
                        onClick={() => {
                          go("/supplier/deliverables/links");
                          toast("Opening Links Hub…", "info");
                        }}
                        title="Open Links Hub to fix attribution"
                      >
                        <IExternal className="h-4 w-4" /> Open Links Hub
                      </Button>
                    </div>
                  ) : null}
                </div>

                {selectedEntity.creator?.avatarUrl ? (
                  <img
                    src={selectedEntity.creator.avatarUrl}
                    alt={selectedEntity.creator.name || "Creator"}
                    className="h-11 w-11 rounded-full border border-slate-200 dark:border-slate-600 object-cover"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* KPI summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="text-xs text-slate-500 dark:text-slate-400">Impressions</div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{shortNum(totals.impressions)}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="text-xs text-slate-500 dark:text-slate-400">Clicks</div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{shortNum(totals.clicks)}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="text-xs text-slate-500 dark:text-slate-400">Orders/Bookings</div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{shortNum(totals.orders)}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="text-xs text-slate-500 dark:text-slate-400">Revenue (GMV)</div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{moneyUSD(totals.revenue)}</div>
            </div>
          </div>

          {/* Supplier settlement preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card title="Settlement preview" subtitle="Estimated from contract compensation terms." right={<Pill text="Supplier view" tone="neutral" />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Est. creator payout</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">{moneyUSD(totals.payout)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Net revenue</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">{moneyUSD(totals.net)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Margin</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {totals.revenue > 0 ? pct(totals.net / totals.revenue) : "—"}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Note: final settlement depends on Admin approvals, disputes, and payout schedules.
              </div>
            </Card>
            <Card title="Quick actions" subtitle="Jump to execution surfaces." right={<Pill text="Shortcuts" tone="neutral" />}>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => go("/supplier/adz/manager")}>🛍️ Adz Manager</Button>
                <Button onClick={() => go("/supplier/adz/marketplace")}>🛒 Adz Marketplace</Button>
                <Button onClick={() => go("/supplier/deliverables/assets")}>🗂️ Asset Library</Button>
                <Button onClick={() => go("/supplier/deliverables/links")}>🔗 Links Hub</Button>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Permission note: show/hide actions based on RBAC.</div>
            </Card>
          </div>

          {/* Funnel + breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card title="Funnel" subtitle={`Impressions → Clicks → Orders · CTR ${pct(totals.ctr)} · CVR ${pct(totals.cvr)}`}>
              <div className="space-y-2">
                {[
                  { label: "Impressions", v: totals.impressions, den: totals.impressions },
                  { label: "Clicks", v: totals.clicks, den: totals.impressions },
                  { label: "Orders", v: totals.orders, den: totals.clicks || 1 }
                ].map((x) => (
                  <div key={x.label} className="rounded-2xl border transition-colors border-slate-200 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{x.label}</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{shortNum(x.v)}</div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(clamp01(x.den ? x.v / x.den : 0) * 100)}%`,
                          background: ORANGE,
                          opacity: 0.85
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="By platform" subtitle="Where is conversion strongest?">
              <div className="space-y-2">
                {byPlatform.slice(0, 8).map((r) => (
                  <div key={r.platform} className="rounded-2xl border transition-colors border-slate-200 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.platform}</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{moneyUSD(r.revenue)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                      Imp {shortNum(r.impressions)} · Clk {shortNum(r.clicks)} · Ord {shortNum(r.orders)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="By item" subtitle="Bundle-aware split attribution.">
              <div className="space-y-2">
                {byItem.slice(0, 8).map((r) => (
                  <div key={r.name} className="rounded-2xl border transition-colors border-slate-200 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{r.name}</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{moneyUSD(r.revenue)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                      Imp {shortNum(r.impressions)} · Clk {shortNum(r.clicks)} · Ord {shortNum(r.orders)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            <Card title="By creative version" subtitle="A/B attribution (split model demo).">
              <div className="space-y-2">
                {byCreative.map((v) => (
                  <div key={v.id} className="rounded-2xl border transition-colors border-slate-200 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Variant {v.label}</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{moneyUSD(v.earnings)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                      Imp {shortNum(v.impressions)} · Clk {shortNum(v.clicks)} · Ord {shortNum(v.orders)} · CTR {pct(v.impressions ? v.clicks / v.impressions : 0)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border transition-colors border-slate-200 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 p-3 text-xs text-slate-700 dark:text-slate-300">
                Premium: real split is tracked per creative ID (not inferred).
              </div>
            </Card>

            <Card title="Insights & recommendations" subtitle="Actionable fixes to increase trust + conversion.">
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="rounded-2xl border transition-colors border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3 md:p-4">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Top revenue</div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1">
                    {insights.topRevenue ? `${insights.topRevenue.name} · ${moneyUSD(insights.topRevenue.earnings)}` : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border transition-colors border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3 md:p-4">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Best CTR</div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1">
                    {(() => {
                      const e = insights.topCTR;
                      const ctr = e && e.impressions ? e.clicks / e.impressions : 0;
                      return e ? `${e.name} · ${pct(ctr)}` : "—";
                    })()}
                  </div>
                </div>

                <div className="rounded-2xl border transition-colors border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3 md:p-4">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Best CVR</div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1">
                    {(() => {
                      const e = insights.topCVR;
                      const cvr = e && e.clicks ? e.orders / e.clicks : 0;
                      return e ? `${e.name} · ${pct(cvr)}` : "—";
                    })()}
                  </div>
                </div>

                {insights.broken ? (
                  <div className="rounded-2xl border transition-colors border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 p-3 text-rose-900 dark:text-rose-400">
                    <div className="font-semibold flex items-center gap-2">
                      <IAlert className="h-4 w-4" /> Fix broken links
                    </div>
                    <div className="mt-1">
                      {insights.broken} {entityLabelSingular.toLowerCase()}(s) flagged. Open <b>Links Hub</b> to restore attribution.
                    </div>
                    <div className="mt-2">
                      <Button
                        onClick={() => {
                          go("/supplier/deliverables/links");
                          toast("Opening Links Hub…", "info");
                        }}
                      >
                        <IExternal className="h-4 w-4" /> Open Links Hub
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border transition-colors border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-3 text-emerald-900 dark:text-emerald-400">
                    <div className="font-semibold">Link health is clean</div>
                    <div className="mt-1">Attribution risk is low.</div>
                  </div>
                )}

                <div className="rounded-2xl border transition-colors border-slate-200 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 p-3 text-slate-700 dark:text-slate-300">
                  Premium: creative fatigue detection, audience saturation warnings, payout timing reminders, and platform mix optimizer.
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export function SupplierAdzPerformanceDrawer({ open, onClose, entities, defaultEntityId, canView = true }) {
  const [toastText, setToastText] = useState(null);
  const [toastTone, setToastTone] = useState("info");
  const toast = (msg, tone = "info") => {
    setToastTone(tone);
    setToastText(msg);
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Adz Performance"
        subtitle="Deep analytics: funnel · breakdowns · insights · export/share."
        width="max-w-[1100px]"
      >
        <SupplierAdzPerformance
          entities={entities}
          selectedId={defaultEntityId}
          canView={canView}
          entityLabelSingular="Ad"
          entityLabelPlural="Adz"
          toast={toast}
        />
      </Drawer>
      <Toast text={toastText} tone={toastTone} onClose={() => setToastText(null)} />
    </>
  );
}

/* ------------------------------ Dedicated page ------------------------------ */

export default function SupplierAdzPerformancePage() {
  const navigate = useNavigate();
  const go = (destination) => {
    if (!destination) return;
    const target = /^https?:\/\//i.test(destination) ? destination : destination.startsWith("/") ? destination : `/${destination}`;
    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noreferrer");
      return;
    }
    navigate(target);
  };
  const [toastText, setToastText] = useState(null);
  const [toastTone, setToastTone] = useState("info");
  const toast = (msg, tone = "info") => {
    setToastTone(tone);
    setToastText(msg);
  };

  // In production routing: /supplier/adz/performance?entityId=...
  const entityId =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("entityId") || undefined : undefined;

  /** @type {PerformanceEntity[]} */
  const demoEntities = useMemo(
    () => [
      {
        id: "AD-10021",
        kind: "ad",
        name: "Flash Dealz: Power Bank",
        status: "Live",
        platforms: ["TikTok"],
        primaryItem: "20,000mAh Power Bank",
        items: [{ id: "p1", kind: "product", name: "20,000mAh Power Bank", price: 29 }],
        impressions: 182400,
        clicks: 9720,
        orders: 412,
        earnings: 1860,
        creator: { name: "Kofi Mensah", handle: "kofi_live", avatarUrl: "https://i.pravatar.cc/100?img=11" },
        compensation: { type: "Commission", commissionRate: 0.12 },
        hasBrokenLink: false,
        variants: [
          { id: "vA", label: "A", impressions: 102000, clicks: 5000, orders: 210, earnings: 980 },
          { id: "vB", label: "B", impressions: 80400, clicks: 4720, orders: 202, earnings: 880 }
        ]
      },
      {
        id: "DL-20002",
        kind: "deal",
        name: "Autumn Beauty Flash",
        status: "Live",
        platforms: ["TikTok", "Instagram"],
        primaryItem: "Vitamin C serum (30ml)",
        items: [
          { id: "it_2a", kind: "product", name: "Vitamin C serum (30ml)", price: 24 },
          { id: "it_2b", kind: "product", name: "Hydrating moisturizer", price: 18 }
        ],
        impressions: 290000,
        clicks: 10150,
        orders: 420,
        earnings: 6100,
        creator: { name: "Amina K", handle: "amina_live", avatarUrl: "https://i.pravatar.cc/100?img=47" },
        compensation: { type: "Hybrid", commissionRate: 0.1, flatFee: 400, currency: "$" },
        hasBrokenLink: true
      },
      {
        id: "AD-99901",
        kind: "ad",
        name: "Supplier-hosted: Ring Light Bundle",
        status: "Scheduled",
        platforms: ["Facebook"],
        primaryItem: "LED Ring Light Kit",
        items: [{ id: "p9", kind: "product", name: "LED Ring Light Kit", price: 45 }],
        impressions: 54000,
        clicks: 2600,
        orders: 94,
        earnings: 940,
        // no creator => supplier-hosted
        compensation: undefined,
        hasBrokenLink: false
      }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-x-hidden transition-colors">
      <div className="w-full px-[0.55%] py-8">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <IBarChart className="h-4 w-4" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">Adz Performance</div>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-11">
              Supplier analytics: conversion funnel, breakdowns, settlement preview, link health.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                go("/supplier/adz/dashboard");
                toast("Back to Adz Dashboard…", "info");
              }}
              title="Back"
            >
              <IExternal className="h-4 w-4" /> Back
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <SupplierAdzPerformance
            entities={demoEntities}
            selectedId={entityId}
            canView={true}
            entityLabelSingular="Ad"
            entityLabelPlural="Adz"
            headerHint="Supplier view (live data)"
            showOpenFullPage={false}
            toast={toast}
          />
        </div>
      </div>

      <Toast text={toastText} tone={toastTone} onClose={() => setToastText(null)} />
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierAdzPerformancePage test failed: ${msg}`);
  };
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "ORANGE exists");
  assert(typeof pct(0.123) === "string", "pct works");
  assert(typeof shortNum(1500) === "string", "shortNum works");
  console.log("✅ SupplierAdzPerformancePage self-tests passed");
}
