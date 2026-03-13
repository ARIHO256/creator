import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";
import { buildAdzCampaignPayload, deriveMetricSeries, hashAdzCampaign, mapBackendAdzCampaign } from "./runtime";

/**
 * SupplierAdzManagerPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: AdzManager.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Sticky PageHeader with primary CTAs
 * - Filters bar: search + platform + supplier + offer type + selling mode
 * - Status tabs row
 * - Two-column layout: Ad list (left) + Detail (right)
 * - Detail: KPI snapshot cards, Overview card w/ actions, Offer Overview list, More tools card
 * - Drawer pattern: Schedule, Performance, Tracking, Templates, Builder
 * - Share link disabled until Generated
 *
 * Supplier adaptations (minimal, necessary):
 * - Adds campaign governance: hostRole + creatorUsage + collabMode + approvalMode
 * - Builder supports Supplier-specific creator usage decision logic
 * - Approval gating notes are Supplier-oriented (Manual vs Auto)
 *
 * Notes:
 * - Self-contained canvas version (no external imports like lucide-react).
 * - Replace toast-based safeNav() with react-router navigate() in app.
 */

const ORANGE = "#f77f00";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* --------------------------------- Helpers -------------------------------- */

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
  if (o.type !== "PRODUCT" || !o.wholesale?.tiers?.length) return null;
  const tiers = [...o.wholesale.tiers].sort((a, b) => a.minQty - b.minQty);
  let unit = tiers[0].unitPrice;
  for (const t of tiers) if (qty >= t.minQty) unit = t.unitPrice;
  return unit;
}

function compensationLabel(c) {
  if (!c) return "—";
  if (c.type === "Commission") return `Commission · ${Math.round((c.commissionRate || 0) * 100)}%`;
  if (c.type === "Flat fee") return `Flat fee · ${money(c.currency || "USD", c.flatFee || 0)}`;
  return `Hybrid · ${Math.round((c.commissionRate || 0) * 100)}% + ${money(c.currency || "USD", c.flatFee || 0)}`;
}

function statusPillTone(s) {
  if (s === "Live") return "good";
  if (s === "Scheduled" || s === "Pending approval") return "warn";
  if (s === "Rejected") return "bad";
  return "neutral";
}

/* --------------------------------- UI ------------------------------------- */

function PageHeader({ pageTitle, rightContent }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-neutral-200/60 dark:border-slate-800">
      <div className="w-full max-w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm sm:text-base font-extrabold text-neutral-900 dark:text-slate-100">
            {pageTitle}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-slate-400">
            Operational control center for Supplier Shoppable Adz: schedule, approvals, share links, and performance.
          </p>
        </div>
        <div className="shrink-0 flex flex-wrap items-center justify-end gap-2">{rightContent}</div>
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
      : tone === "danger"
        ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30"
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
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-colors border-l border-neutral-200 dark:border-slate-800">
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="text-[13px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          <button
            type="button"
            className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
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

function Avatar({ src, alt }) {
  return <img src={src} alt={alt} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-neutral-200 dark:ring-slate-700" />;
}

/* --------------------------------- Mock Data ------------------------------ */

const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

/* ------------------------------ Mini charts (no libs) ---------------------- */

function MiniTrend({ title, subtitle, seriesA, seriesB }) {
  const w = 560;
  const h = 140;
  const pad = 16;

  const all = [...(seriesA || []), ...(seriesB || [])];
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);

  const x = (i, n) => pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
  const y = (v) => {
    const t = (v - min) / Math.max(1e-9, max - min);
    return h - pad - t * (h - pad * 2);
  };

  const pathFor = (s) => s.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i, s.length).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");

  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="neutral"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ORANGE }} /> Impressions</Pill>
          <Pill tone="neutral"><span className="h-2.5 w-2.5 rounded-full bg-neutral-900/70 dark:bg-slate-100/70" /> Orders</Pill>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[140px] w-full">
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
          <path d={pathFor(seriesA)} fill="none" stroke={ORANGE} strokeWidth="3" strokeLinejoin="round" />
          <path d={pathFor(seriesB)} fill="none" className="stroke-neutral-900/70 dark:stroke-slate-100/70" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------ Page --------------------------------------- */

export default function SupplierAdzManagerPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [syncedAds, setSyncedAds] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const safeNav = (url) => {
    if (!url) return;
    const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noreferrer");
      return;
    }
    navigate(target);
  };

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
  const selected = useMemo(() => ads.find((a) => a.id === selectedId) || ads[0] || null, [ads, selectedId]);

  // Filters
  const [statusTab, setStatusTab] = useState("All");
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("All");
  const [supplier, setSupplier] = useState("All");
  const [offerKind, setOfferKind] = useState("All"); // All | PRODUCT | SERVICE
  const [sellingModeFilter, setSellingModeFilter] = useState("All"); // All | Retail | Wholesale | Both

  const platforms = useMemo(() => {
    const s = new Set();
    ads.forEach((a) => (a.platforms || []).forEach((p) => s.add(p)));
    return ["All", ...Array.from(s)];
  }, [ads]);

  const suppliers = useMemo(() => {
    const s = new Set();
    ads.forEach((a) => s.add(a.supplier?.name));
    return ["All", ...Array.from(s)];
  }, [ads]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return ads
      .filter((a) => (statusTab === "All" ? true : a.status === statusTab))
      .filter((a) => (platform === "All" ? true : (a.platforms || []).includes(platform)))
      .filter((a) => (supplier === "All" ? true : a.supplier?.name === supplier))
      .filter((a) => {
        if (offerKind === "All") return true;
        return (a.offers || []).some((o) => o.type === offerKind);
      })
      .filter((a) => {
        if (sellingModeFilter === "All") return true;
        const productOffers = (a.offers || []).filter((o) => o.type === "PRODUCT");
        if (!productOffers.length) return false;
        const flags = productOffers.map((o) => enabledModesForOffer(o));
        const hasRetail = flags.some((ms) => ms.includes("RETAIL"));
        const hasWholesale = flags.some((ms) => ms.includes("WHOLESALE"));
        if (sellingModeFilter === "Retail") return hasRetail && !hasWholesale;
        if (sellingModeFilter === "Wholesale") return hasWholesale && !hasRetail;
        return hasRetail && hasWholesale;
      })
      .filter((a) => {
        if (!query) return true;
        return (
          String(a.name || "").toLowerCase().includes(query) ||
          String(a.campaign?.name || "").toLowerCase().includes(query) ||
          String(a.supplier?.name || "").toLowerCase().includes(query) ||
          String(a.creator?.handle || "").toLowerCase().includes(query) ||
          String(a.id || "").toLowerCase().includes(query)
        );
      });
  }, [ads, statusTab, platform, supplier, q, offerKind, sellingModeFilter]);

  // Drawers
  const [drawer, setDrawer] = useState(null); // schedule | performance | tracking | templates | builder
  const [drawerData, setDrawerData] = useState(undefined); // adId

  // Offer mode defaults (manager view)
  const [modeByOffer, setModeByOffer] = useState({});
  useEffect(() => {
    if (!selected) return;
    const init = {};
    (selected.offers || []).forEach((o) => (init[o.id] = defaultModeForOffer(o)));
    setModeByOffer(init);
  }, [selected?.id]);

  const startsAt = useMemo(() => (selected ? new Date(selected.startISO) : new Date()), [selected?.startISO]);
  const endsAt = useMemo(() => (selected ? new Date(selected.endISO) : new Date(Date.now() + 3600 * 1000)), [selected?.endISO]);

  const listStatuses = ["All", "Draft", "Scheduled", "Live", "Paused", "Ended", "Pending approval", "Rejected"]; // expanded vs creator tabs

  function openBuilder(ad) {
    setDrawerData(ad?.id);
    setDrawer("builder");
  }

  function openPerformance(ad) {
    setDrawerData(ad?.id);
    setDrawer("performance");
  }

  function copyShareLink(ad) {
    if (!ad?.generated) {
      setToast("Generate the ad first to enable share links.");
      return;
    }
    const link = `https://mldz.link/${encodeURIComponent(ad.id)}`;
    try {
      navigator.clipboard?.writeText(link);
    } catch {
      // ignore
    }
    setToast("Share link copied.");
  }

  function generateAd(adId) {
    setAds((prev) =>
      prev.map((a) =>
        a.id === adId
          ? {
              ...a,
              status: a.status === "Draft" ? "Scheduled" : a.status,
              generated: true,
              needsApproval: a.approvalMode === "Manual" ? true : a.needsApproval
            }
          : a
      )
    );
    setToast("Ad generated. Share links are now enabled.");
  }

  function updateOfferDefaultMode(offerId, mode) {
    setModeByOffer((prev) => ({ ...prev, [offerId]: mode }));
    setToast(`Default mode set: ${offerId} → ${mode === "WHOLESALE" ? "Wholesale" : "Retail"}`);
  }

  function resubmitRejected(adId) {
    setAds((prev) => prev.map((a) => (a.id === adId ? { ...a, status: "Pending approval", needsApproval: true } : a)));
    setToast("Resubmitted for review.");
  }

  const trendImpr = useMemo(
    () => deriveMetricSeries(Number(selected?.impressions7d ?? selected?.impressions ?? 0), 14, `${selected?.id || "impressions"}`),
    [selected?.id, selected?.impressions, selected?.impressions7d]
  );
  const trendOrders = useMemo(
    () => deriveMetricSeries(Number(selected?.orders7d ?? selected?.orders ?? 0), 14, `${selected?.id || "orders"}-orders`),
    [selected?.id, selected?.orders, selected?.orders7d]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <style>{`
        .line-clamp-2{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .scrollbar-hide::-webkit-scrollbar{ display:none; }
        .scrollbar-hide{ -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>

      <PageHeader
        pageTitle="Adz Manager"
        rightContent={
          <>
            <Btn tone="neutral" left={<span>📊</span>} onClick={() => selected && openPerformance(selected)}>
              Adz Performance
            </Btn>
            <Btn tone="primary" left={<span>＋</span>} onClick={() => (selected ? openBuilder(selected) : openBuilder(null))}>
              New / Edit in Ad Builder
            </Btn>
          </>
        }
      />

      {/* Filters */}
      <div className="border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="w-full px-[0.55%] py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔎</span>
              <input
                type="text"
                placeholder="Search ads, campaigns…"
                className="w-full rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-10 py-2 text-[12px] font-extrabold focus:outline-none focus:ring-1 focus:ring-orange-500 dark:text-slate-100"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold focus:outline-none dark:text-slate-100"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {platforms.map((p) => (
                <option key={p} value={p}>
                  Platform: {p}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold focus:outline-none dark:text-slate-100"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            >
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  Supplier: {s}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold focus:outline-none dark:text-slate-100"
              value={offerKind}
              onChange={(e) => setOfferKind(e.target.value)}
            >
              <option value="All">Offer: All</option>
              <option value="PRODUCT">Offer: Product</option>
              <option value="SERVICE">Offer: Service</option>
            </select>

            <select
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold focus:outline-none dark:text-slate-100"
              value={sellingModeFilter}
              onChange={(e) => setSellingModeFilter(e.target.value)}
            >
              <option value="All">Mode: All</option>
              <option value="Retail">Mode: Retail only</option>
              <option value="Wholesale">Mode: Wholesale only</option>
              <option value="Both">Mode: Hybrid</option>
            </select>
          </div>

          {/* Status tabs */}
          <div className="flex flex-wrap gap-2">
            {listStatuses.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setStatusTab(t)}
                className={cx(
                  "rounded-2xl border px-3 py-2 text-[12px] font-extrabold transition",
                  statusTab === t
                    ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400"
                    : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-800"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="w-full px-[0.55%] py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List */}
        <div className="lg:col-span-5 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
          <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex items-start justify-between gap-2">
            <div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Your Adz</div>
              <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Select an ad to manage details.</div>
            </div>
            <Pill tone="neutral">{filtered.length} results</Pill>
          </div>

          <div className="p-3 max-h-[760px] overflow-auto space-y-2 scrollbar-hide">
            {filtered.map((a) => {
              const active = a.id === selectedId;
              const hasWholesale = (a.offers || []).some((o) => enabledModesForOffer(o).includes("WHOLESALE"));

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cx(
                    "w-full text-left rounded-3xl border p-3 transition",
                    active
                      ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-950 shadow-sm"
                      : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar src={a.creator.avatarUrl} alt={a.creator.name} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            className={cx(
                              "truncate text-[12px] font-extrabold",
                              active ? "text-orange-600 dark:text-orange-400" : "text-neutral-900 dark:text-slate-100"
                            )}
                          >
                            {a.name}
                          </div>
                          <Pill tone={active ? "brand" : statusPillTone(a.status)}>{a.status}</Pill>
                        </div>

                        <div
                          className={cx(
                            "mt-1 truncate text-[11px]",
                            active ? "text-orange-600/80 dark:text-orange-400/80" : "text-neutral-600 dark:text-slate-400"
                          )}
                        >
                          Campaign: {a.campaign?.name} · Supplier: {a.supplier?.name}
                        </div>

                        <div className={cx("mt-2 flex flex-wrap gap-2", active ? "text-orange-600/90" : "text-neutral-700 dark:text-slate-300")}
                        >
                          <Pill tone={active ? "brand" : "neutral"}>{(a.platforms || []).join(", ")}</Pill>
                          <Pill tone={a.hostRole === "Supplier" ? (active ? "brand" : "warn") : (active ? "brand" : "good")}>
                            {a.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}
                          </Pill>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Pill tone={a.approvalMode === "Manual" ? "warn" : "good"}>Approval: {a.approvalMode}</Pill>
                          <Pill tone="neutral">Collab: {a.collabMode}</Pill>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                      {a.lock?.locked ? <Pill tone={active ? "brand" : "warn"}>🔒 Locked</Pill> : null}
                      {a.needsApproval ? <Pill tone={active ? "brand" : "warn"}>⚠ Needs approval</Pill> : null}
                      {hasWholesale ? <Pill tone={active ? "brand" : "pro"}>Wholesale</Pill> : null}
                      {!a.generated ? <Pill tone={active ? "brand" : "neutral"}>Share disabled</Pill> : null}
                    </div>
                  </div>
                </button>
              );
            })}

            {!filtered.length ? (
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-[12px] text-neutral-600 dark:text-slate-400">
                No adz match your filters.
              </div>
            ) : null}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-7 space-y-4">
          {!selected ? (
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">No ad selected</div>
              <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Select an ad from the list to manage it.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Snapshot cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Impressions", value: (selected.impressions || 0).toLocaleString() },
                  { label: "Clicks", value: (selected.clicks || 0).toLocaleString() },
                  { label: "Orders", value: (selected.orders || 0).toLocaleString() },
                  { label: "Earnings", value: money(selected.earningsCurrency || "USD", selected.earnings || 0) }
                ].map((k) => (
                  <div key={k.label} className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">{k.label}</div>
                    <div className="mt-1 text-xl font-extrabold text-neutral-900 dark:text-slate-100">{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Overview */}
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{selected.name}</div>
                      <Pill tone={statusPillTone(selected.status)}>{selected.status}</Pill>
                      {selected.hasBrokenLink ? <Pill tone="warn">🔗 Link issue</Pill> : null}
                      {selected.lowStock ? <Pill tone="warn">⚠ Low stock</Pill> : null}
                    </div>

                    <div className="mt-1 text-[12px] text-neutral-600 dark:text-slate-400">
                      Campaign: <span className="font-bold text-neutral-900 dark:text-slate-100">{selected.campaign?.name}</span> · Supplier:{" "}
                      <span className="font-bold text-neutral-900 dark:text-slate-100">{selected.supplier?.name}</span> · Host:{" "}
                      <span className="font-bold text-neutral-900 dark:text-slate-100">
                        {selected.hostRole === "Supplier" ? "Supplier" : "Creator"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill tone="neutral">{compensationLabel(selected.compensation)}</Pill>
                      <Pill tone="neutral">⏱ {selected.timezone}</Pill>
                      <Pill tone={selected.creatorUsage === "I will NOT use a Creator" ? "warn" : selected.creatorUsage === "I will use a Creator" ? "good" : "neutral"}>
                        {selected.creatorUsage}
                      </Pill>
                      <Pill tone="neutral">Collab: {selected.collabMode}</Pill>
                      <Pill tone={selected.approvalMode === "Manual" ? "warn" : "good"}>Approval: {selected.approvalMode}</Pill>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                        <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Starts</div>
                        <div className="mt-1 font-extrabold text-neutral-900 dark:text-slate-100">{fmtLocal(startsAt)}</div>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                        <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Ends</div>
                        <div className="mt-1 font-extrabold text-neutral-900 dark:text-slate-100">{fmtLocal(endsAt)}</div>
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] text-neutral-600 dark:text-slate-400">
                      Supplier rule: If approval is <b>Manual</b>, content goes Supplier review → Admin review. Auto routes directly to Admin.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Btn
                      tone="primary"
                      left={<span>✨</span>}
                      onClick={() => generateAd(selected.id)}
                      disabled={selected.generated}
                      title={selected.generated ? "Already generated" : "Generate to enable share links"}
                    >
                      {selected.generated ? "Generated" : "Generate Ad"}
                    </Btn>

                    <Btn
                      tone="neutral"
                      left={<span>🧩</span>}
                      onClick={() => safeNav(`/supplier/adz-marketplace?adId=${encodeURIComponent(selected.id)}`)}
                    >
                      Buyer preview
                    </Btn>

                    <Btn
                      tone="neutral"
                      left={<span>🛠️</span>}
                      onClick={() => openBuilder(selected)}
                      disabled={!!selected.lock?.locked}
                      title={selected.lock?.locked ? selected.lock.reason : "Edit in Ad Builder"}
                    >
                      Edit
                    </Btn>

                    <Btn
                      tone="neutral"
                      left={<span>🔗</span>}
                      onClick={() => copyShareLink(selected)}
                      disabled={!selected.generated}
                      title={!selected.generated ? "Generate first" : "Copy share link"}
                    >
                      Copy link
                    </Btn>

                    {selected.status === "Rejected" ? (
                      <Btn tone="danger" left={<span>↻</span>} onClick={() => resubmitRejected(selected.id)}>
                        Resubmit
                      </Btn>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Offer Overview */}
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-slate-800">
                  <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Offer Overview</div>
                  <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                    Offers can be Products or Services. Wholesale affects Products (MOQ, tiers). Default selling mode per offer is editable.
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {(selected.offers || []).map((o) => {
                    const modes = enabledModesForOffer(o);
                    const activeMode = modeByOffer[o.id] || defaultModeForOffer(o);
                    const hasWholesale = modes.includes("WHOLESALE");

                    const unitForMoq =
                      o.type === "PRODUCT" && activeMode === "WHOLESALE" && o.wholesale ? wholesaleUnitPrice(o, o.wholesale.moq) : null;

                    const priceLine =
                      o.type === "SERVICE"
                        ? money(o.currency, o.price)
                        : activeMode === "WHOLESALE"
                          ? `${money(o.currency, unitForMoq ?? o.price)}/unit`
                          : money(o.currency, o.price);

                    const metaLine =
                      o.type === "PRODUCT" && activeMode === "WHOLESALE" && o.wholesale
                        ? `MOQ ${o.wholesale.moq} · Step ${o.wholesale.step}${o.wholesale.leadTimeLabel ? ` · ${o.wholesale.leadTimeLabel}` : ""}`
                        : o.type === "SERVICE"
                          ? `Service · ${o.serviceMeta?.durationMins || 30} mins · ${o.serviceMeta?.bookingType || "Instant"}`
                          : `Retail · Stock ${o.stockLeft < 0 ? "∞" : o.stockLeft}`;

                    return (
                      <div key={o.id} className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <img src={o.posterUrl} alt={o.name} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/20" />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="min-w-0 truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{o.name}</div>
                              <Pill tone="neutral">{o.type === "PRODUCT" ? "Product" : "Service"}</Pill>
                              {hasWholesale ? <Pill tone="pro">Wholesale</Pill> : null}
                              {o.type === "PRODUCT" && o.stockLeft === 0 ? <Pill tone="warn">Out of stock</Pill> : null}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{priceLine}</div>
                              {o.basePrice && o.basePrice > o.price && activeMode !== "WHOLESALE" ? (
                                <div className="text-[11px] font-semibold text-neutral-500 dark:text-slate-400 line-through">
                                  {money(o.currency, o.basePrice)}
                                </div>
                              ) : null}
                              <div className="text-[11px] text-neutral-600 dark:text-slate-400">{metaLine}</div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {modes.length > 1 ? (
                                <div className="flex items-center gap-2">
                                  <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Default mode</div>
                                  <button
                                    type="button"
                                    className={cx(
                                      "rounded-2xl border px-3 py-2 text-[12px] font-extrabold transition",
                                      activeMode === "RETAIL"
                                        ? "border-transparent text-white"
                                        : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-800"
                                    )}
                                    style={activeMode === "RETAIL" ? { background: ORANGE } : undefined}
                                    onClick={() => updateOfferDefaultMode(o.id, "RETAIL")}
                                  >
                                    Retail
                                  </button>
                                  <button
                                    type="button"
                                    className={cx(
                                      "rounded-2xl border px-3 py-2 text-[12px] font-extrabold transition",
                                      activeMode === "WHOLESALE"
                                        ? "border-transparent text-white"
                                        : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-800"
                                    )}
                                    style={activeMode === "WHOLESALE" ? { background: ORANGE } : undefined}
                                    onClick={() => updateOfferDefaultMode(o.id, "WHOLESALE")}
                                  >
                                    Wholesale
                                  </button>
                                </div>
                              ) : (
                                <Pill tone="neutral">{o.type === "SERVICE" ? "Services are Retail only" : "Retail only"}</Pill>
                              )}

                              <Btn tone="neutral" left={<span>🧩</span>} onClick={() => safeNav(`/supplier/adz-marketplace?adId=${encodeURIComponent(selected.id)}&offerId=${encodeURIComponent(o.id)}`)}>
                                Preview
                              </Btn>

                              {o.videoUrl ? (
                                <Btn tone="neutral" left={<span>▶</span>} onClick={() => setToast(`Play offer video: ${o.name}`)}>
                                  Watch
                                </Btn>
                              ) : null}

                              {hasWholesale && o.wholesale ? (
                                <Pill tone="neutral" title="Tier pricing applies automatically">
                                  Tiers: {o.wholesale.tiers?.length || 0}
                                </Pill>
                              ) : null}
                            </div>

                            {hasWholesale && o.wholesale ? (
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                                {(o.wholesale.tiers || []).slice(0, 3).map((t) => (
                                  <div key={t.minQty} className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Min qty</div>
                                    <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{t.minQty}</div>
                                    <div className="mt-1 text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Unit</div>
                                    <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{money(o.currency, t.unitPrice)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">More tools</div>
                    <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                      Open drawers for scheduling, performance, tracking and templates.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn tone="neutral" left={<span>📅</span>} onClick={() => setDrawer("schedule")}>
                      Schedule
                    </Btn>
                    <Btn tone="neutral" left={<span>📈</span>} onClick={() => setDrawer("performance")}>
                      Performance
                    </Btn>
                    <Btn tone="neutral" left={<span>🔗</span>} onClick={() => setDrawer("tracking")}>
                      Tracking
                    </Btn>
                    <Btn tone="neutral" left={<span>✨</span>} onClick={() => setDrawer("templates")}>
                      Templates
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule drawer */}
      <Drawer open={drawer === "schedule"} title="Schedule & Calendar" onClose={() => setDrawer(null)}>
        {selected ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Current schedule</div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-[12px] text-neutral-700 dark:text-slate-300">
                {[{ l: "Starts", v: fmtLocal(new Date(selected.startISO)) }, { l: "Ends", v: fmtLocal(new Date(selected.endISO)) }, { l: "Timezone", v: selected.timezone }].map((x) => (
                  <div key={x.l} className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
                    <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">{x.l}</div>
                    <div className="mt-1 font-extrabold text-neutral-900 dark:text-slate-100">{x.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-neutral-600 dark:text-slate-400">
                Scheduling edits should follow approval rules. If status is Live, scheduling is locked.
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Quick actions</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Btn
                  tone="primary"
                  left={<span>🛠️</span>}
                  onClick={() => {
                    setDrawer(null);
                    openBuilder(selected);
                  }}
                  disabled={!!selected.lock?.locked}
                  title={selected.lock?.locked ? selected.lock.reason : "Open builder scheduling"}
                >
                  Open Schedule in Builder
                </Btn>
                <Btn tone="neutral" left={<span>↗</span>} onClick={() => safeNav(`/supplier/live-schedule?adId=${encodeURIComponent(selected.id)}`)}>
                  Compare with Live Schedule
                </Btn>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Performance drawer */}
      <Drawer open={drawer === "performance"} title="Adz Performance" onClose={() => setDrawer(null)}>
        {selected ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Performance snapshot</div>
                  <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                    Light snapshot. Deep analytics belong in Analytics & Status (Supplier).
                  </div>
                </div>
                <Pill tone="brand">PRO</Pill>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: "Impressions", value: (selected.impressions || 0).toLocaleString() },
                  { label: "Clicks", value: (selected.clicks || 0).toLocaleString() },
                  { label: "Orders", value: (selected.orders || 0).toLocaleString() },
                  { label: "Earnings", value: money(selected.earningsCurrency || "USD", selected.earnings || 0) }
                ].map((k) => (
                  <div key={k.label} className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
                    <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">{k.label}</div>
                    <div className="mt-1 text-[14px] font-extrabold text-neutral-900 dark:text-slate-100">{k.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <MiniTrend title="Trend" subtitle="Impressions vs Orders (14 days)" seriesA={trendImpr} seriesB={trendOrders} />

            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Supplier notes</div>
              <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
                • If Creator-hosted + Manual approval, expect a longer cycle before publish.<br />
                • Fix broken links early; they harm conversion and can trigger Admin rejection.<br />
                • Low-stock products should be paused or swapped in Builder to prevent failed orders.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn tone="primary" left={<span>↗</span>} onClick={() => safeNav(`/supplier/analytics-status?entity=adz&adId=${encodeURIComponent(selected.id)}`)}>
                  Open Analytics & Status
                </Btn>
                <Btn tone="neutral" left={<span>🧩</span>} onClick={() => safeNav(`/supplier/adz-marketplace?adId=${encodeURIComponent(selected.id)}`)}>
                  Open Buyer Preview
                </Btn>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Tracking drawer */}
      <Drawer open={drawer === "tracking"} title="Tracking & Integrations" onClose={() => setDrawer(null)}>
        <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Premium tracking</div>
          <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
            Pixel status, short links, monitoring history, and payout timing reminders.
          </div>

          <div className="mt-3 grid gap-2">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Pixel status</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Connect Meta/TikTok/Google</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill tone="neutral">Meta: Not connected</Pill>
                <Pill tone="neutral">TikTok: Connected</Pill>
                <Pill tone="neutral">Google: Not connected</Pill>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Short links</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Auto-rotate + click health</div>
              <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                Links are enabled only after Generate. Broken link detection auto-pauses on repeated failures.
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Attribution notes</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Payout timing reminders</div>
              <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                For collab campaigns, payouts may be held until Admin approval and dispute windows end.
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Templates drawer */}
      <Drawer open={drawer === "templates"} title="Templates & Brand Kit" onClose={() => setDrawer(null)}>
        <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Templates & Brand Kit</div>
          <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
            Saved templates, brand rules (fonts/colors/voice), and Admin-approved copy packs.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone="pro">Pro</Pill>
            <Pill tone="neutral">Admin-approved packs</Pill>
            <Pill tone="neutral">Versioning + approvals</Pill>
          </div>

          <div className="mt-3 grid gap-2">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Start from template</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Create new ad from template</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Btn tone="primary" left={<span>＋</span>} onClick={() => setToast("Create from template")}>Use template</Btn>
                <Btn tone="neutral" left={<span>👁️</span>} onClick={() => setToast("Preview templates")}>Preview</Btn>
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Brand kit rules</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Fonts, colors, voice guidelines</div>
              <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                Enforced during Generate: banned claims, missing disclaimers, inconsistent tone.
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Builder drawer */}
      <AdBuilderDrawer
        open={drawer === "builder"}
        onClose={() => setDrawer(null)}
        initialAd={drawerData ? ads.find((a) => a.id === drawerData) : null}
        onSave={(payload) => {
          setAds((prev) => {
            if (payload?.id) {
              return prev.map((a) => (a.id === payload.id ? { ...a, ...payload } : a));
            }
            // New ad
            const id = `ADZ-${Math.floor(10000 + Math.random() * 89999)}`;
            const newAd = {
              ...payload,
              id,
              impressions: 0,
              clicks: 0,
              orders: 0,
              earnings: 0,
              earningsCurrency: "USD",
              generated: false
            };
            return [newAd, ...prev];
          });
          setToast(payload?.generated ? "Generated. Share links enabled." : "Draft saved." );
          setDrawer(null);
        }}
        onNavigate={safeNav}
      />

      {/* Toast */}
      {toast ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
          <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold shadow-sm text-neutral-900 dark:text-slate-100 transition-colors">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Builder (Premium, non-placeholder) ---------- */

function AdBuilderDrawer({ open, onClose, initialAd, onSave, onNavigate }) {
  const [step, setStep] = useState(1);

  const [name, setName] = useState(initialAd?.name || "");
  const [campaignName, setCampaignName] = useState(initialAd?.campaign?.name || "");
  const [campaignSubtitle, setCampaignSubtitle] = useState(initialAd?.campaign?.subtitle || "");

  const [creatorUsage, setCreatorUsage] = useState(initialAd?.creatorUsage || "I will use a Creator");
  const [collabMode, setCollabMode] = useState(initialAd?.collabMode || "Open for Collabs");
  const [approvalMode, setApprovalMode] = useState(initialAd?.approvalMode || "Manual");

  const [platforms, setPlatforms] = useState(initialAd?.platforms || ["TikTok"]);
  const [timezone, setTimezone] = useState(initialAd?.timezone || "Africa/Kampala");

  const [startISO, setStartISO] = useState(initialAd?.startISO || new Date(Date.now() + 6 * 3600 * 1000).toISOString());
  const [endISO, setEndISO] = useState(initialAd?.endISO || new Date(Date.now() + 30 * 3600 * 1000).toISOString());

  const [heroOk, setHeroOk] = useState(true);
  const [postersOk, setPostersOk] = useState(true);

  const [utm, setUtm] = useState({ source: "mylivedealz", medium: "adz", campaign: initialAd?.id || "" });
  const [pixels, setPixels] = useState({ meta: "", tiktok: "", gtag: "" });

  // offers edit (light)
  const [offers, setOffers] = useState(initialAd?.offers || []);

  const hostRole = creatorUsage === "I will NOT use a Creator" ? "Supplier" : "Creator";

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName(initialAd?.name || "");
    setCampaignName(initialAd?.campaign?.name || "");
    setCampaignSubtitle(initialAd?.campaign?.subtitle || "");
    setCreatorUsage(initialAd?.creatorUsage || "I will use a Creator");
    setCollabMode(initialAd?.collabMode || "Open for Collabs");
    setApprovalMode(initialAd?.approvalMode || "Manual");
    setPlatforms(initialAd?.platforms || ["TikTok"]);
    setTimezone(initialAd?.timezone || "Africa/Kampala");
    setStartISO(initialAd?.startISO || new Date(Date.now() + 6 * 3600 * 1000).toISOString());
    setEndISO(initialAd?.endISO || new Date(Date.now() + 30 * 3600 * 1000).toISOString());
    setHeroOk(true);
    setPostersOk(true);
    setUtm({ source: "mylivedealz", medium: "adz", campaign: initialAd?.id || "" });
    setPixels({ meta: "", tiktok: "", gtag: "" });
    setOffers(initialAd?.offers || []);
  }, [open, initialAd?.id]);

  useEffect(() => {
    if (creatorUsage === "I will NOT use a Creator") {
      setCollabMode("(n/a)");
    } else {
      if (collabMode === "(n/a)") setCollabMode("Open for Collabs");
    }
  }, [creatorUsage]);

  const steps = [
    { id: 1, label: "Basics" },
    { id: 2, label: "Creator & Approvals" },
    { id: 3, label: "Offers" },
    { id: 4, label: "Tracking" },
    { id: 5, label: "Generate" }
  ];

  const stepBtn = (id) =>
    cx(
      "px-3 py-2 rounded-2xl border text-[12px] font-extrabold transition-colors",
      step === id
        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:bg-slate-900 dark:text-slate-900 dark:border-white"
        : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800 text-neutral-800 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800"
    );

  const canGenerate = Boolean((name || "").trim()) && platforms.length > 0 && heroOk && postersOk;

  const togglePlatform = (p) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const upsertOffer = (offerId, patch) => {
    setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, ...patch } : o)));
  };

  const addOfferMock = () => {
    const id = `O-${Math.floor(100 + Math.random() * 900)}`;
    const newOffer = {
      id,
      type: "PRODUCT",
      name: "New Product Offer",
      currency: "UGX",
      price: 55000,
      stockLeft: 20,
      posterUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=900&auto=format&fit=crop",
      videoUrl: SAMPLE_VIDEO,
      desktopMode: "modal",
      sellingModes: ["RETAIL", "WHOLESALE"],
      defaultSellingMode: "RETAIL",
      wholesale: {
        moq: 10,
        step: 5,
        leadTimeLabel: "Ships in 3–5 days",
        tiers: [
          { minQty: 10, unitPrice: 49000 },
          { minQty: 25, unitPrice: 46500 },
          { minQty: 50, unitPrice: 44000 }
        ]
      }
    };
    setOffers((prev) => [newOffer, ...prev]);
  };

  const saveDraft = () => {
    onSave({
      ...(initialAd || {}),
      id: initialAd?.id,
      name: name || "Untitled Ad",
      status: initialAd?.status || "Draft",
      platforms,
      supplier: initialAd?.supplier || {
        name: "Your Supplier",
        category: "Mixed",
        logoUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=256&auto=format&fit=crop"
      },
      campaign: { name: campaignName || "Campaign", subtitle: campaignSubtitle || "" },
      startISO,
      endISO,
      timezone,
      heroImageUrl: initialAd?.heroImageUrl || "https://images.unsplash.com/photo-1520975692290-9d0a3d460c22?q=80&w=1600&auto=format&fit=crop",
      heroIntroVideoUrl: initialAd?.heroIntroVideoUrl || SAMPLE_VIDEO,
      heroDesktopMode: initialAd?.heroDesktopMode || "modal",
      creator: initialAd?.creator || {
        name: hostRole === "Supplier" ? "(Supplier-hosted)" : "Creator TBD",
        handle: hostRole === "Supplier" ? "@yoursupplier" : "@creator",
        avatarUrl: "https://i.pravatar.cc/100?img=12",
        verified: true
      },
      owner: initialAd?.owner || "Owner",
      compensation: initialAd?.compensation || { type: "Commission", commissionRate: 0.1 },
      offers,
      // governance
      hostRole,
      creatorUsage,
      collabMode,
      approvalMode,
      // flags
      hasBrokenLink: initialAd?.hasBrokenLink || false,
      lowStock: initialAd?.lowStock || false,
      needsApproval: approvalMode === "Manual" ? true : initialAd?.needsApproval || false,
      lock: initialAd?.lock || { locked: false, label: "", reason: "" },
      generated: initialAd?.generated || false
    });
  };

  const generateNow = () => {
    if (!canGenerate) return;
    onSave({
      ...(initialAd || {}),
      id: initialAd?.id,
      name: name || "Untitled Ad",
      status: initialAd?.status === "Draft" ? "Scheduled" : initialAd?.status || "Scheduled",
      platforms,
      supplier: initialAd?.supplier || {
        name: "Your Supplier",
        category: "Mixed",
        logoUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=256&auto=format&fit=crop"
      },
      campaign: { name: campaignName || "Campaign", subtitle: campaignSubtitle || "" },
      startISO,
      endISO,
      timezone,
      heroImageUrl: initialAd?.heroImageUrl || "https://images.unsplash.com/photo-1520975692290-9d0a3d460c22?q=80&w=1600&auto=format&fit=crop",
      heroIntroVideoUrl: initialAd?.heroIntroVideoUrl || SAMPLE_VIDEO,
      heroDesktopMode: initialAd?.heroDesktopMode || "modal",
      creator: initialAd?.creator || {
        name: hostRole === "Supplier" ? "(Supplier-hosted)" : "Creator TBD",
        handle: hostRole === "Supplier" ? "@yoursupplier" : "@creator",
        avatarUrl: "https://i.pravatar.cc/100?img=12",
        verified: true
      },
      owner: initialAd?.owner || "Owner",
      compensation: initialAd?.compensation || { type: "Commission", commissionRate: 0.1 },
      offers,
      hostRole,
      creatorUsage,
      collabMode,
      approvalMode,
      hasBrokenLink: false,
      lowStock: offers.some((o) => o.type === "PRODUCT" && o.stockLeft >= 0 && o.stockLeft <= 5),
      needsApproval: approvalMode === "Manual" ? true : false,
      lock: initialAd?.lock || { locked: false, label: "", reason: "" },
      generated: true
    });
  };

  return (
    <Drawer open={open} title="Ad Builder (Supplier)" onClose={onClose}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
            {initialAd?.id ? `Editing: ${initialAd.id}` : "Create new ad"}
          </div>
          <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
            Mirror builder flow. Minimal Supplier logic: creator usage decision + collab mode + approvals.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn tone="neutral" left={<span>💾</span>} onClick={saveDraft}>
            Save draft
          </Btn>
          <Btn
            tone="primary"
            left={<span>✨</span>}
            disabled={!canGenerate}
            title={!canGenerate ? "Fix checklist first" : "Generate ad"}
            onClick={generateNow}
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
            <div className="text-[12px] font-extrabold">Basics</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Configure campaign naming, schedule, timezone and platforms.
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Ad name" value={name} onChange={setName} placeholder="e.g. Flash Dealz: Power Bank" />
              <Field label="Campaign name" value={campaignName} onChange={setCampaignName} placeholder="e.g. Flash Dealz" />
              <Field label="Campaign subtitle" value={campaignSubtitle} onChange={setCampaignSubtitle} placeholder="Short hook" />
              <Field label="Timezone" value={timezone} onChange={setTimezone} placeholder="Africa/Kampala" />

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
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                  If multiple platforms are selected, exports and pixel setup are required per platform.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Start ISO" value={startISO} onChange={setStartISO} placeholder="2026-01-01T09:00:00.000Z" />
                <Field label="End ISO" value={endISO} onChange={setEndISO} placeholder="2026-01-01T10:00:00.000Z" />
                <div className="sm:col-span-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Preview</div>
                  <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
                    {fmtLocal(new Date(startISO))} → {fmtLocal(new Date(endISO))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Creator & Approvals</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Supplier governance settings. These affect collaboration flow and approvals routing.
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Creator usage decision</div>
                <select
                  value={creatorUsage}
                  onChange={(e) => setCreatorUsage(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-extrabold dark:text-slate-100"
                >
                  <option>I will use a Creator</option>
                  <option>I will NOT use a Creator</option>
                  <option>I am NOT SURE yet</option>
                </select>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  If NOT using creator: Supplier becomes host and collaboration stages are skipped.
                </div>
              </div>

              <div>
                <div className="text-[11px] font-extrabold text-neutral-700 dark:text-slate-300">Collaboration mode</div>
                <select
                  value={collabMode}
                  onChange={(e) => setCollabMode(e.target.value)}
                  disabled={creatorUsage === "I will NOT use a Creator"}
                  title={creatorUsage === "I will NOT use a Creator" ? "Not applicable" : ""}
                  className={cx(
                    "mt-1 w-full px-3 py-2 rounded-2xl border text-[12px] font-extrabold",
                    creatorUsage === "I will NOT use a Creator"
                      ? "border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-900 text-neutral-500 dark:text-slate-500"
                      : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100"
                  )}
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
                  className="mt-1 w-full px-3 py-2 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-extrabold dark:text-slate-100"
                >
                  <option>Manual</option>
                  <option>Auto</option>
                </select>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  Manual: Supplier approves before Admin. Auto: content goes directly to Admin.
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Outcome</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill tone={hostRole === "Supplier" ? "warn" : "good"}>{hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}</Pill>
                  <Pill tone={approvalMode === "Manual" ? "warn" : "good"}>Approval: {approvalMode}</Pill>
                  <Pill tone="neutral">Collab: {collabMode}</Pill>
                </div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                  Host impacts who uploads content and who must approve before Admin review.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[12px] font-extrabold">Offers</div>
                <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                  Products can support Retail + Wholesale tiers; Services remain Retail only.
                </div>
              </div>
              <Btn tone="primary" left={<span>＋</span>} onClick={addOfferMock}>
                Add offer
              </Btn>
            </div>

            <div className="mt-4 space-y-3">
              {offers.length ? (
                offers.map((o) => {
                  const modes = enabledModesForOffer(o);
                  const activeMode = defaultModeForOffer(o);
                  const isWholesale = activeMode === "WHOLESALE";
                  const unit = isWholesale && o.wholesale ? wholesaleUnitPrice(o, o.wholesale.moq) : null;
                  return (
                    <div key={o.id} className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <div className="flex items-start gap-3">
                        <img src={o.posterUrl} alt={o.name} className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/20" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{o.name}</div>
                            <Pill tone="neutral">{o.type}</Pill>
                            {modes.includes("WHOLESALE") ? <Pill tone="pro">Wholesale</Pill> : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">
                              {o.type === "SERVICE" ? money(o.currency, o.price) : isWholesale ? `${money(o.currency, unit ?? o.price)}/unit` : money(o.currency, o.price)}
                            </div>
                            <div className="text-[11px] text-neutral-600 dark:text-slate-400">
                              {o.type === "PRODUCT" ? `Stock ${o.stockLeft < 0 ? "∞" : o.stockLeft}` : `Duration ${o.serviceMeta?.durationMins || 30} mins`}
                            </div>
                          </div>

                          {o.type === "PRODUCT" ? (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Field label="Retail price" value={String(o.price)} onChange={(v) => upsertOffer(o.id, { price: Number(v) || 0 })} />
                              <Field label="Stock left" value={String(o.stockLeft)} onChange={(v) => upsertOffer(o.id, { stockLeft: Number(v) || 0 })} />
                            </div>
                          ) : (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Field label="Service price" value={String(o.price)} onChange={(v) => upsertOffer(o.id, { price: Number(v) || 0 })} />
                              <Field
                                label="Duration (mins)"
                                value={String(o.serviceMeta?.durationMins || 30)}
                                onChange={(v) => upsertOffer(o.id, { serviceMeta: { ...(o.serviceMeta || {}), durationMins: Number(v) || 30 } })}
                              />
                            </div>
                          )}

                          {o.type === "PRODUCT" && o.wholesale ? (
                            <div className="mt-3 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                              <div className="text-[11px] font-extrabold text-neutral-900 dark:text-slate-100">Wholesale settings</div>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <Field label="MOQ" value={String(o.wholesale.moq)} onChange={(v) => upsertOffer(o.id, { wholesale: { ...o.wholesale, moq: Number(v) || 1 } })} />
                                <Field label="Step" value={String(o.wholesale.step)} onChange={(v) => upsertOffer(o.id, { wholesale: { ...o.wholesale, step: Number(v) || 1 } })} />
                              </div>
                              <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                                Tier pricing is configured per product. In production, tiers are managed in a dedicated modal.
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Btn tone="neutral" left={<span>🧩</span>} onClick={() => onNavigate(`/supplier/adz-marketplace?offerId=${encodeURIComponent(o.id)}`)}>
                              Preview
                            </Btn>
                            {o.videoUrl ? <Btn tone="neutral" left={<span>▶</span>} onClick={() => onNavigate(`(play video) ${o.videoUrl}`)}>Watch</Btn> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-[12px] text-neutral-600 dark:text-slate-400">
                  No offers yet. Add an offer to continue.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Tracking</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Configure UTMs and pixels. Share links remain disabled until Generate completes.
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">UTM</div>
                <div className="mt-2 space-y-2">
                  <Field label="utm_source" value={utm.source} onChange={(v) => setUtm((p) => ({ ...p, source: v }))} />
                  <Field label="utm_medium" value={utm.medium} onChange={(v) => setUtm((p) => ({ ...p, medium: v }))} />
                  <Field label="utm_campaign" value={utm.campaign} onChange={(v) => setUtm((p) => ({ ...p, campaign: v }))} />
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Pixels</div>
                <div className="mt-2 space-y-2">
                  <Field label="Meta pixel" value={pixels.meta} onChange={(v) => setPixels((p) => ({ ...p, meta: v }))} placeholder="1234567890" />
                  <Field label="TikTok pixel" value={pixels.tiktok} onChange={(v) => setPixels((p) => ({ ...p, tiktok: v }))} placeholder="TT-XXXXX" />
                  <Field label="Google tag" value={pixels.gtag} onChange={(v) => setPixels((p) => ({ ...p, gtag: v }))} placeholder="G-XXXXXXX" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="text-[12px] font-extrabold">Generate</div>
            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
              Generating enables share links and prepares platform exports.
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Checklist</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CheckRow ok={Boolean((name || "").trim())} label="Ad name" hint="Required" />
                  <CheckRow ok={platforms.length > 0} label="Platforms" hint={platforms.length ? platforms.join(", ") : "Select at least one"} />
                  <CheckRow ok={heroOk} label="Hero media" hint="1920×1080" />
                  <CheckRow ok={postersOk} label="Offer posters" hint="500×500" />
                  <CheckRow ok={offers.length > 0} label="Offers" hint={offers.length ? `${offers.length} added` : "Add at least one"} />
                  <CheckRow ok={creatorUsage !== ""} label="Creator usage" hint={creatorUsage} />
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] font-extrabold">Actions</div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                  If approval is Manual, content will be queued for Supplier approval before Admin.
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Btn tone="primary" left={<span>✨</span>} disabled={!canGenerate || offers.length === 0} onClick={generateNow}>
                    Generate now
                  </Btn>
                  <Btn tone="neutral" left={<span>📤</span>} disabled={!canGenerate || offers.length === 0} onClick={() => onSave({ ...(initialAd || {}), id: initialAd?.id, status: "Pending approval", needsApproval: true, creatorUsage, collabMode, approvalMode, hostRole })}>
                    Submit for approvals
                  </Btn>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 text-[12px] font-extrabold">
                      <input type="checkbox" checked={heroOk} onChange={(e) => setHeroOk(e.target.checked)} />
                      Hero OK
                    </label>
                    <label className="inline-flex items-center gap-2 text-[12px] font-extrabold">
                      <input type="checkbox" checked={postersOk} onChange={(e) => setPostersOk(e.target.checked)} />
                      Posters OK
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
        Permission note: In production, only Supplier Owners/Admins can change approval mode; Managers can edit offers and schedule; Viewers are read-only.
      </div>
    </Drawer>
  );
}

function Field({ label, value, onChange, placeholder }) {
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
