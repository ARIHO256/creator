import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useAdzMarketplaceQuery } from "../../hooks/api/useDiscoveryMarketplaces";

function formatDate(value?: string) {
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

function statusTone(status: string) {
  const raw = String(status || "").toLowerCase();
  if (raw === "live") return "text-rose-600 dark:text-rose-300";
  if (raw.includes("pending")) return "text-amber-600 dark:text-amber-300";
  if (raw.includes("draft")) return "text-slate-500 dark:text-slate-300";
  return "text-emerald-600 dark:text-emerald-300";
}

export default function AdzMarketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const marketplaceQuery = useAdzMarketplaceQuery({
    q: search || undefined,
    status: status !== "all" ? status : undefined
  });

  const rows = marketplaceQuery.data?.items ?? [];
  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc.clicks += Number(row.clicks || 0);
        acc.purchases += Number(row.purchases || 0);
        acc.earnings += Number(row.earnings || 0);
        if (row.lowStock) acc.lowStock += 1;
        return acc;
      },
      { total: 0, clicks: 0, purchases: 0, earnings: 0, lowStock: 0 }
    );
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader
        pageTitle="Adz Marketplace"
        mobileViewType="inline-right"
        rightContent={
          <button type="button" onClick={() => navigate("/ad-builder")} className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#df7300]">
            + New Shoppable Ad
          </button>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-6 sm:px-4 lg:px-8">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Campaigns</p>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Clicks</p>
            <p className="mt-2 text-2xl font-bold">{stats.clicks.toLocaleString()}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Purchases</p>
            <p className="mt-2 text-2xl font-bold">{stats.purchases.toLocaleString()}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Attributed earnings</p>
            <p className="mt-2 text-2xl font-bold text-[#f77f00]">{formatMoney(stats.earnings, "USD")}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search seller, campaign, platform"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950"
            />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending approval</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </section>

        {marketplaceQuery.isLoading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Loading Adz marketplace…
          </section>
        ) : rows.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No Adz campaigns matched this filter.
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{row.seller || row.supplier?.name || "Unknown seller"}</p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{row.campaignName}</h2>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${statusTone(row.status)}`}>{row.status}</p>
                    {row.lowStock ? <p className="mt-1 text-xs text-rose-500">Low stock attention</p> : null}
                  </div>
                </div>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{row.campaignSubtitle || "Backend-driven marketplace card."}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Starts</p>
                    <p className="mt-1 font-semibold">{formatDate(row.startISO)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Offers</p>
                    <p className="mt-1 font-semibold">{row.offerCount || row.offers?.length || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Linked links</p>
                    <p className="mt-1 font-semibold">{row.linkedLinks || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Earnings</p>
                    <p className="mt-1 font-semibold">{formatMoney(row.earnings, row.currency || row.compensation?.currency)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {(row.platforms || []).map((platform) => (
                    <span key={platform} className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{platform}</span>
                  ))}
                </div>

                <div className="mt-4 grid gap-2">
                  <button type="button" onClick={() => navigate(`/promo-ad-detail?promoId=${encodeURIComponent(row.id)}`)} className="rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#df7300]">
                    Preview ad
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => navigate(`/AdzManager?adId=${encodeURIComponent(row.id)}`)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                      Manage campaign
                    </button>
                    <button type="button" onClick={() => navigate(`/ad-builder?adId=${encodeURIComponent(row.id)}`)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                      Open builder
                    </button>
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
