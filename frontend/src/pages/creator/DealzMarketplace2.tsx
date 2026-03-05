import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import type { DealzMarketplaceRecord } from "../../api/types";
import { useDealzMarketplaceQuery } from "../../hooks/api/useDiscoveryMarketplaces";

function humanizeKind(kind: string) {
  if (kind === "hybrid") return "Live + Shoppable";
  if (kind === "shoppable") return "Shoppable Adz";
  return "Live Sessionz";
}

function kindTone(kind: string) {
  if (kind === "hybrid") return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200";
  if (kind === "shoppable") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200";
}

function statusTone(status: string) {
  const raw = String(status || "").toLowerCase();
  if (raw === "live") return "text-rose-600 dark:text-rose-300";
  if (raw.includes("scheduled")) return "text-emerald-600 dark:text-emerald-300";
  if (raw.includes("draft")) return "text-slate-500 dark:text-slate-300";
  return "text-amber-600 dark:text-amber-300";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(amount: number | undefined, currency: string | undefined) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(Number(amount || 0));
  } catch {
    return `${currency || "USD"} ${Number(amount || 0).toLocaleString()}`;
  }
}

function openRow(navigate: ReturnType<typeof useNavigate>, row: DealzMarketplaceRecord) {
  if (row.kind === "live" && row.liveSessionId) {
    navigate(`/live-builder?sessionId=${encodeURIComponent(row.liveSessionId)}`);
    return;
  }
  if (row.kind === "shoppable" && row.adCampaignId) {
    navigate(`/ad-builder?adId=${encodeURIComponent(row.adCampaignId)}`);
    return;
  }
  if (row.liveSessionId) {
    navigate(`/live-builder?sessionId=${encodeURIComponent(row.liveSessionId)}`);
    return;
  }
  if (row.adCampaignId) {
    navigate(`/ad-builder?adId=${encodeURIComponent(row.adCampaignId)}`);
  }
}

export default function DealzMarketplace2() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");

  const marketplaceQuery = useDealzMarketplaceQuery({
    q: search || undefined,
    kind: kind !== "all" ? kind : undefined,
    status: status !== "all" ? status : undefined
  });

  const rows = marketplaceQuery.data?.items ?? [];
  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.kind === "live") acc.live += 1;
        if (row.kind === "shoppable") acc.shoppable += 1;
        if (row.kind === "hybrid") acc.hybrid += 1;
        acc.earnings += Number(row.performance?.earnings || 0);
        return acc;
      },
      { total: 0, live: 0, shoppable: 0, hybrid: 0, earnings: 0 }
    );
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader
        pageTitle="Dealz Marketplace"
        mobileViewType="inline-right"
        rightContent={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate("/live-builder")} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
              + New Live Session
            </button>
            <button type="button" onClick={() => navigate("/ad-builder")} className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#df7300]">
              + New Shoppable Ad
            </button>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-6 sm:px-4 lg:px-8">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">All dealz</p>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Sessionz</p>
            <p className="mt-2 text-2xl font-bold">{stats.live}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Shoppable Adz</p>
            <p className="mt-2 text-2xl font-bold">{stats.shoppable}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Attributed earnings</p>
            <p className="mt-2 text-2xl font-bold text-[#f77f00]">{formatMoney(stats.earnings, "USD")}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_220px_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search campaign, seller, platform"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950"
            />
            <select value={kind} onChange={(event) => setKind(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="all">All kinds</option>
              <option value="live">Live Sessionz</option>
              <option value="shoppable">Shoppable Adz</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="pending_approval">Pending approval</option>
            </select>
          </div>
        </section>

        {marketplaceQuery.isLoading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Loading marketplace dealz…
          </section>
        ) : rows.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No marketplace rows matched your filters.
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${kindTone(row.kind)}`}>
                    {humanizeKind(row.kind)}
                  </span>
                  <span className={`text-xs font-semibold ${statusTone(row.status)}`}>{row.status}</span>
                  {row.sellerBadge ? (
                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">
                      {row.sellerBadge}
                    </span>
                  ) : null}
                </div>

                <button type="button" onClick={() => openRow(navigate, row)} className="mt-3 text-left">
                  <h2 className="text-lg font-semibold text-slate-900 hover:text-[#f77f00] dark:text-slate-50">{row.title}</h2>
                </button>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{row.sellerName}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{row.subtitle || "Backend-driven marketplace row."}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Starts</p>
                    <p className="mt-1 font-semibold">{formatDate(row.startsAtISO)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Platforms</p>
                    <p className="mt-1 font-semibold">{row.platforms.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Products</p>
                    <p className="mt-1 font-semibold">{row.productCount || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Clicks</p>
                    <p className="mt-1 font-semibold">{Number(row.performance?.clicks || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {row.platforms.map((platform) => (
                    <span key={platform} className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{platform}</span>
                  ))}
                </div>

                <div className="mt-4 grid gap-2">
                  <button type="button" onClick={() => openRow(navigate, row)} className="rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#df7300]">
                    Open builder
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    {row.liveSessionId ? (
                      <button type="button" onClick={() => navigate(`/live-studio?sessionId=${encodeURIComponent(row.liveSessionId || "")}`)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                        Open studio
                      </button>
                    ) : (
                      <button type="button" onClick={() => navigate(`/live-schedule${row.liveSessionId ? `?sessionId=${encodeURIComponent(row.liveSessionId)}` : ""}`)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                        View schedule
                      </button>
                    )}
                    {row.adCampaignId ? (
                      <button type="button" onClick={() => navigate(`/promo-ad-detail?promoId=${encodeURIComponent(row.adCampaignId || "")}`)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                        Preview ad
                      </button>
                    ) : (
                      <button type="button" onClick={() => navigate("/ad-builder")} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                        New ad
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
