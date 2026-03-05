import React, { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { useAnalyticsOverviewQuery } from "../../hooks/api/useFinance";
import type {
  AnalyticsCampaignRecord,
  AnalyticsGoalRecord,
  AnalyticsMetricRecord,
  AnalyticsOverviewRecord,
  AnalyticsTrendPointRecord
} from "../../api/types";

type Range = "7" | "30" | "90";
type Category = "All" | "Beauty" | "Tech" | "Faith";
type LeaderboardMode = "sales" | "engagement";

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const columns = Object.keys(rows[0] || {});
  const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => JSON.stringify(row[column] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function selectMetrics(data: AnalyticsOverviewRecord | undefined, range: Range, category: Category): AnalyticsMetricRecord {
  if (!data) return { avgViewers: 0, ctr: 0, conversion: 0, salesDriven: 0 };
  return data.metricsByCategory?.[category]?.[range] || data.metricsByCategory?.All?.[range] || { avgViewers: 0, ctr: 0, conversion: 0, salesDriven: 0 };
}

function selectTrend(data: AnalyticsOverviewRecord | undefined, range: Range, category: Category): AnalyticsTrendPointRecord[] {
  if (!data?.trend?.length) return [];
  const limit = range === "7" ? 7 : range === "30" ? 30 : 90;
  const items = data.trend.slice(-limit);
  if (category === "All") return items;
  return items.map((item) => ({
    ...item,
    sales: item.categories?.[category]?.sales ?? item.sales,
    conversions: item.categories?.[category]?.conversions ?? item.conversions
  }));
}

function selectCampaigns(data: AnalyticsOverviewRecord | undefined, category: Category, mode: LeaderboardMode): AnalyticsCampaignRecord[] {
  const scoped = (data?.campaigns || []).filter((campaign) => category === "All" || campaign.category === category);
  return [...scoped].sort((left, right) => (mode === "engagement" ? right.engagements - left.engagements : right.sales - left.sales));
}

export default function AnalyticsRankDetailPage() {
  const analyticsQuery = useAnalyticsOverviewQuery();
  const [timeRange, setTimeRange] = useState<Range>("30");
  const [category, setCategory] = useState<Category>("All");
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>("sales");

  const analytics = analyticsQuery.data;
  const rank = analytics?.rank;
  const metrics = useMemo(() => selectMetrics(analytics, timeRange, category), [analytics, timeRange, category]);
  const trend = useMemo(() => selectTrend(analytics, timeRange, category), [analytics, timeRange, category]);
  const campaigns = useMemo(() => selectCampaigns(analytics, category, leaderboardMode), [analytics, category, leaderboardMode]);
  const goals: AnalyticsGoalRecord[] = analytics?.goals || [];
  const maxSales = Math.max(1, ...trend.map((point) => point.sales));
  const maxCampaignMetric = Math.max(1, ...campaigns.map((campaign) => (leaderboardMode === "engagement" ? campaign.engagements : campaign.sales)));

  const handleExport = () => {
    if (!trend.length) return;
    downloadCsv(`analytics-${timeRange}-${category.toLowerCase()}.csv`, trend.map((point) => ({
      label: point.label,
      views: point.views,
      clicks: point.clicks,
      conversions: point.conversions,
      sales: point.sales
    })));
  };

  if (analyticsQuery.isLoading && !analytics) {
    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
        <PageHeader pageTitle="Analytics & Rank" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 text-sm text-slate-500 dark:text-slate-300 shadow-sm">Loading analytics workspace…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      <PageHeader
        pageTitle="Analytics & Rank"
        badge={<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-medium border border-slate-200 dark:border-slate-800 transition-colors">📈 API-backed performance data</span>}
        rightContent={<button onClick={handleExport} className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-sm hover:bg-slate-800">Export</button>}
        mobileViewType="inline-right"
      />

      <main className="flex-1 flex flex-col px-2 sm:px-3 md:px-4 lg:px-6 py-6 gap-4 overflow-y-auto bg-[#f2f2f2] dark:bg-slate-950">
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">{rank?.currentTier || "Silver"} Creator</span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">Next tier: {rank?.nextTier || "Gold"}</span>
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">Performance rank and conversion view</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-3xl">This page is now fed by backend analytics payloads for rank, metrics, goals, campaigns, and trends.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0 lg:min-w-[420px]">
              <MetricTile label="XP" value={formatCompactNumber(rank?.pointsCurrent || 0)} />
              <MetricTile label="Progress" value={`${rank?.progressPercent || 0}%`} />
              <MetricTile label="Viewer pct" value={`${analytics?.benchmarks?.viewersPercentile || 0}th`} />
              <MetricTile label="Conv pct" value={`${analytics?.benchmarks?.conversionPercentile || 0}th`} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span>{rank?.pointsCurrent || 0} XP</span>
              <span>{rank?.pointsToNext || 0} XP target</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-[#f77f00]" style={{ width: `${Math.max(0, Math.min(100, rank?.progressPercent || 0))}%` }} />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Filters</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Switch ranges and categories using the backend analytics dataset.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["7", "30", "90"] as Range[]).map((range) => (
                <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${timeRange === range ? "bg-[#f77f00] border-[#f77f00] text-white" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>Last {range} days</button>
              ))}
              {(["All", "Beauty", "Tech", "Faith"] as Category[]).map((entry) => (
                <button key={entry} onClick={() => setCategory(entry)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${category === entry ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>{entry}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard label="Average viewers" value={formatCompactNumber(metrics.avgViewers)} helper="Typical live audience" />
            <MetricCard label="CTR" value={`${metrics.ctr.toFixed(1)}%`} helper="Click-through rate" />
            <MetricCard label="Conversion" value={`${metrics.conversion.toFixed(1)}%`} helper="Checkout conversion" />
            <MetricCard label="Sales driven" value={`$${formatCompactNumber(metrics.salesDriven)}`} helper="Attributed sales" />
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-4 items-start">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Trend snapshot</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Backend trend points for {category} over the last {timeRange} days.</p>
            </div>
            <div className="space-y-3">
              {trend.slice(-10).map((point) => (
                <div key={point.label} className="grid grid-cols-[72px_minmax(0,1fr)_90px] gap-3 items-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{point.label}</div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[#f77f00]" style={{ width: `${(point.sales / maxSales) * 100}%` }} />
                  </div>
                  <div className="text-right text-sm font-semibold text-slate-800 dark:text-slate-100">${formatCompactNumber(point.sales)}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Snapshot label="Latest views" value={formatCompactNumber(trend.at(-1)?.views || 0)} />
              <Snapshot label="Latest clicks" value={formatCompactNumber(trend.at(-1)?.clicks || 0)} />
              <Snapshot label="Latest conversions" value={String(trend.at(-1)?.conversions || 0)} />
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Campaign leaderboard</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ranked from backend campaign analytics.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setLeaderboardMode("sales")} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${leaderboardMode === "sales" ? "bg-[#f77f00] border-[#f77f00] text-white" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>Sales</button>
                <button onClick={() => setLeaderboardMode("engagement")} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${leaderboardMode === "engagement" ? "bg-[#f77f00] border-[#f77f00] text-white" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>Engagement</button>
              </div>
            </div>
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const value = leaderboardMode === "engagement" ? campaign.engagements : campaign.sales;
                return (
                  <div key={campaign.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{campaign.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{campaign.seller} • {campaign.category}</div>
                      </div>
                      <div className="text-sm font-semibold text-[#f77f00]">{leaderboardMode === "engagement" ? formatCompactNumber(value) : `$${formatCompactNumber(value)}`}</div>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(value / maxCampaignMetric) * 100}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Conv. {campaign.convRate.toFixed(1)}%</span>
                      <span>Sales ${formatCompactNumber(campaign.sales)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)] gap-4 items-start">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Goals</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Team goals from the backend analytics profile.</p>
            </div>
            <div className="space-y-4">
              {goals.map((goal) => {
                const progress = Math.max(0, Math.min(100, (goal.current / goal.target) * 100));
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{goal.label}</span>
                      <span className="text-slate-500 dark:text-slate-400">{goal.current} / {goal.target} {goal.unit}</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-[#f77f00]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recommendations & leaderboard</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">The page now reads backend suggestions and rank rows directly.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
              <div className="space-y-3">
                {(analytics?.recommendations || []).map((recommendation) => (
                  <div key={recommendation} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-600 dark:text-slate-300">• {recommendation}</div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Creator leaderboard</div>
                <div className="mt-3 space-y-3">
                  {(analytics?.leaderboard || []).map((row, index) => (
                    <div key={`${row.creator}-${row.score}`} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-100">#{index + 1} {row.creator}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{row.tier}</div>
                      </div>
                      <div className="font-semibold text-[#f77f00]">{row.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</div>
      <div className="mt-2 text-2xl font-bold text-[#f77f00]">{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</div>
    </div>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
