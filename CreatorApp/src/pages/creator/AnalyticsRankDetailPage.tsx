"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Download,
  LineChart as LineChartIcon,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useApiResource } from "../../hooks/useApiResource";
import { creatorApi } from "../../lib/creatorApi";

/**
 * AnalyticsRankDetailPage (Creator View)
 * Premium enhancements:
 * - Attributed performance trend (multi-line chart) inspired by B5
 * - Rank momentum mini chart + benchmark percentiles
 * - Conversions / sales by campaign chart
 * - CSV export
 *
 * No external charting libraries are required; charts are built with lightweight SVG.
 */

const TOKENS = {
  orange: "#F77F00",
  green: "#03CD8C",
  black: "#111827",
  border: "var(--border-color, #E2E8F0)",
  soft: "var(--soft-bg, #F8FAFC)",
  bg: "var(--page-bg, #f2f2f2)",
};

type Range = "7" | "30" | "90";
type Category = "All" | "Beauty" | "Tech" | "Faith";
type LeaderboardMode = "sales" | "engagement";

type Rank = {
  currentTier: "Bronze" | "Silver" | "Gold";
  nextTier: "Silver" | "Gold" | "Platinum";
  progressPercent: number;
  pointsCurrent: number;
  pointsToNext: number;
  benefits: Record<string, string[]>;
};

type Metrics = {
  avgViewers: number;
  ctr: number; // percent
  conversion: number; // percent
  salesDriven: number; // currency
};

type Benchmarks = {
  viewersPercentile: number;
  ctrPercentile: number;
  conversionPercentile: number;
  salesPercentile: number;
};

type CampaignRow = {
  id: number;
  campaignId: string;
  name: string;
  seller: string;
  category: Exclude<Category, "All">;
  sales: number;
  engagements: number;
  conversions: number;
  convRate: number;
};

type GoalRow = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: "viewers" | "%" | "USD";
};

type TrendPoint = {
  label: string;
  views: number;
  clicks: number;
  conversions: number;
  sales: number;
};

type AnalyticsSeed = {
  rank: Rank;
  metrics: Metrics;
  campaigns: CampaignRow[];
  goals: GoalRow[];
  benchmarks: Benchmarks;
  trend: TrendPoint[];
};

const EMPTY_ANALYTICS_SEED: AnalyticsSeed = {
  rank: {
    currentTier: "Bronze",
    nextTier: "Silver",
    progressPercent: 0,
    pointsCurrent: 0,
    pointsToNext: 1000,
    benefits: {
      Bronze: [],
      Silver: [],
      Gold: []
    }
  },
  metrics: {
    avgViewers: 0,
    ctr: 0,
    conversion: 0,
    salesDriven: 0
  },
  campaigns: [],
  goals: [],
  benchmarks: {
    viewersPercentile: 0,
    ctrPercentile: 0,
    conversionPercentile: 0,
    salesPercentile: 0
  },
  trend: []
};

function money(n: number, currency: "USD" | "UGX" = "USD") {
  try {
    return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-UG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function csvEscape(v: string) {
  const needs = /[\n,"]/g.test(v);
  const clean = v.replace(/"/g, '""');
  return needs ? `"${clean}"` : clean;
}

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(String(r[h] ?? ""))).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export default function AnalyticsRankDetailPage() {
  const [timeRange, setTimeRange] = useState<Range>("30");
  const [category, setCategory] = useState<Category>("All");
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>("sales");
  const { data: analyticsSeed, reload } = useApiResource<AnalyticsSeed>({
    initialData: EMPTY_ANALYTICS_SEED,
    loader: async () => {
      const payload = await creatorApi.analyticsRankDetail({
        range: timeRange,
        category
      });
      const normalizedCampaigns: CampaignRow[] = Array.isArray(payload.campaigns)
        ? payload.campaigns.map((campaign, index) => {
            const engagements = Number(campaign.engagements || 0) || 0;
            const convRate = Number(campaign.convRate || 0) || 0;
            const backendConversions = Number(campaign.conversions || 0) || 0;
            const conversions = backendConversions > 0 ? backendConversions : Math.round((engagements * convRate) / 100);
            return {
              id: Number(campaign.id || index + 1) || index + 1,
              campaignId: String(campaign.campaignId || ""),
              name: String(campaign.name || ""),
              seller: String(campaign.seller || ""),
              category: (String(campaign.category || "") as Exclude<Category, "All">),
              sales: Number(campaign.sales || 0) || 0,
              engagements,
              conversions,
              convRate
            };
          })
        : [];
      return {
        rank: payload.rank || EMPTY_ANALYTICS_SEED.rank,
        metrics: payload.metrics || EMPTY_ANALYTICS_SEED.metrics,
        campaigns: normalizedCampaigns,
        goals: Array.isArray(payload.goals) ? payload.goals : EMPTY_ANALYTICS_SEED.goals,
        benchmarks: payload.benchmarks || EMPTY_ANALYTICS_SEED.benchmarks,
        trend: Array.isArray(payload.trend) ? payload.trend : EMPTY_ANALYTICS_SEED.trend
      };
    }
  });
  React.useEffect(() => {
    void reload();
  }, [timeRange, category, reload]);

  const rank = analyticsSeed.rank;
  const metrics = analyticsSeed.metrics;
  const campaigns = analyticsSeed.campaigns;
  const goals = analyticsSeed.goals;
  const seedTrend = analyticsSeed.trend;
  const benchmarks = analyticsSeed.benchmarks;

  const filteredCampaigns = useMemo(() => {
    const arr = [...campaigns];
    const scoped = category === "All" ? arr : arr.filter((c) => c.category === category);
    scoped.sort((a, b) => {
      if (leaderboardMode === "engagement") return b.engagements - a.engagements;
      return b.sales - a.sales;
    });
    return scoped.slice(0, 6);
  }, [category, leaderboardMode]);

  const trend = useMemo<TrendPoint[]>(() => {
    const needed = timeRange === "7" ? 7 : timeRange === "30" ? 30 : 90;
    if (!seedTrend.length) return [];
    if (seedTrend.length <= needed) return seedTrend;
    return seedTrend.slice(seedTrend.length - needed);
  }, [seedTrend, timeRange]);

  const rankMomentum = useMemo(() => {
    let runningXp = 0;
    return trend.map((point) => {
      runningXp += point.conversions + point.sales / 20;
      return Math.round(runningXp);
    });
  }, [trend]);

  function onExport() {
    const rows: Record<string, string | number>[] = trend.map((t) => ({
      day: t.label,
      views: t.views,
      clicks: t.clicks,
      conversions: t.conversions,
      sales: t.sales,
    }));
    downloadCsv(`analytics_rank_${timeRange}d_${category.toLowerCase()}.csv`, rows);
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      {/* Top bar */}
      <header className="h-20 flex items-center justify-between px-2 sm:px-3 md:px-4 lg:px-6 pt-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <img src="/MyliveDealz PNG Icon 1.png" alt="LiveDealz" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">Analytics & Rank</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">Creator · Analytics & Rank Detail</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <LineChartIcon className="h-3.5 w-3.5" />
              <span>Trends</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <Trophy className="h-3.5 w-3.5" />
              <span>Rank</span>
            </span>
          </div>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-sm hover:bg-slate-800"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-2 sm:px-3 md:px-4 lg:px-6 py-6 gap-3 md:gap-4 overflow-y-auto bg-[#f2f2f2] dark:bg-slate-950">
        <div className="w-full flex flex-col gap-3">
          {/* Rank banner */}
          <RankBanner rank={rank} benchmarks={benchmarks} rankMomentum={rankMomentum} />

          {/* Trends + Benchmarks */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-3 items-start">
            <TrendsPanel
              trend={trend}
              timeRange={timeRange}
              onChangeTimeRange={setTimeRange}
              category={category}
              onChangeCategory={setCategory}
            />
            <BenchmarksPanel benchmarks={benchmarks} trend={trend} />
          </section>

          {/* Performance metrics + leaderboard */}
          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-3 items-start">
            <PerformanceMetricsPanel
              metrics={metrics}
              trend={trend}
              timeRange={timeRange}
              onChangeTimeRange={setTimeRange}
              category={category}
              onChangeCategory={setCategory}
            />
            <CampaignLeaderboard
              campaigns={filteredCampaigns}
              mode={leaderboardMode}
              onChangeMode={setLeaderboardMode}
            />
          </section>

          {/* Conversion chart */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] gap-3 items-start">
            <ConversionsByCampaignPanel campaigns={filteredCampaigns} mode={leaderboardMode} />
            <ImprovementSuggestions metrics={metrics} rank={rank} benchmarks={benchmarks} />
          </section>

          {/* Goals */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-3 items-start">
            <GoalsPanel goals={goals} />
            <CalloutPanel />
          </section>
        </div>
      </main>
    </div>
  );
}

function RankBanner({
  rank,
  benchmarks,
  rankMomentum,
}: {
  rank: Rank;
  benchmarks: Benchmarks;
  rankMomentum: number[];
}) {
  const progress = clamp(rank.progressPercent, 0, 100);
  const remaining = clamp(100 - progress, 0, 100);

  const maxLiveDurationLine =
    rank.currentTier === "Bronze"
      ? "Max live duration: 60 min"
      : rank.currentTier === "Silver"
      ? "Max live duration: 6 hrs"
      : "Max live duration: 24 hrs";

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 flex flex-col gap-3 text-xs transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow"
            style={{
              background: "linear-gradient(135deg, #FDE68A 0%, #F77F00 55%, #92400E 100%)",
            }}
            aria-label="Rank badge"
          >
            ⭐
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{rank.currentTier} Creator</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                {rank.pointsCurrent} Experience Points (XP) · {rank.nextTier} at {rank.pointsToNext} XP
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-0.5">{maxLiveDurationLine}</p>

            <p className="text-xs text-slate-500 mt-0.5 max-w-[72ch]">
              <span className="font-semibold text-slate-700 dark:text-slate-200">What is XP?</span>{" "}
              Experience Points (XP) are points you earn by hosting lives and delivering results. More XP unlocks higher
              tiers and better perks.
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                🥉 Bronze: 0–999 XP
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                🥈 Silver: 1000–2999 XP
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                🥇 Gold: 3000+ XP
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 max-w-[72ch]">
              You’re {remaining}% away from {rank.nextTier}. Keep hosting high-conversion lives and completing campaigns
              on time.
            </p>
          </div>
        </div>

        <div className="hidden md:block min-w-[240px]">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-200">
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              Rank momentum
            </span>
            <span className="text-slate-500 dark:text-slate-300">Last {rankMomentum.length} days</span>
          </div>
          <div className="mt-2 rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2">
            <MiniLineChart values={rankMomentum} height={54} color={TOKENS.orange} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
            <span>Viewer pct: {benchmarks.viewersPercentile}th</span>
            <span>Conv pct: {benchmarks.conversionPercentile}th</span>
          </div>
        </div>
      </div>

      <div className="mt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
            ✅ {progress}% complete
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs">
            ⏳ {remaining}% remaining
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: TOKENS.orange }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
          <span>{rank.currentTier === "Bronze" ? "Bronze (you)" : "Bronze"}</span>
          <span>{rank.currentTier === "Silver" ? "Silver (you)" : "Silver"}</span>
          <span>{rank.currentTier === "Gold" ? "Gold (you)" : "Gold"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
        <TierCard tier="Bronze" items={rank.benefits.Bronze} highlight={rank.currentTier === "Bronze"} />
        <TierCard tier="Silver" items={rank.benefits.Silver} highlight={rank.currentTier === "Silver"} />
        <TierCard tier="Gold" items={rank.benefits.Gold} highlight={rank.currentTier === "Gold"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
        <InfoCard title="How you earn XP" icon="✨">
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Hosting lives</li>
            <li>Generating sales</li>
            <li>High conversion rates</li>
            <li>Completing campaigns on time</li>
            <li>Strong engagement metrics</li>
          </ul>
        </InfoCard>

        <InfoCard title="How XP is calculated" icon="🧮">
          <ul className="list-disc pl-4 space-y-0.5">
            <li>
              <span className="font-semibold">Base:</span> +50 XP for going live (10+ minutes)
            </li>
            <li>
              <span className="font-semibold">Sales:</span> +1 XP per $10 attributed sales (cap per live)
            </li>
            <li>
              <span className="font-semibold">Conversion bonus:</span> tiered bonus (0 / +25 / +50 / +100)
            </li>
            <li>
              <span className="font-semibold">On-time completion:</span> +40 XP
            </li>
            <li>
              <span className="font-semibold">Engagement:</span> +1 XP per 10 interactions (cap per live)
            </li>
          </ul>
          <p className="text-xs text-slate-500 mt-2">
            Example: A strong 45-min live can earn ~200–300 XP.
          </p>
        </InfoCard>

        <InfoCard title="How to level up faster" icon="🚀">
          <ul className="list-disc pl-4 space-y-0.5">
            <li>High conversion rates</li>
            <li>Completing campaigns properly/on time</li>
            <li>Strong engagement</li>
            <li>Consistent performance</li>
          </ul>
        </InfoCard>

        <InfoCard title="What this means strategically" icon="🔎">
          <div className="space-y-2">
            <div>
              <div className="text-xs font-semibold">🥉 Bronze</div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Host lives (max 60 min)</li>
                <li>Participate in campaigns</li>
                <li>Start building data</li>
                <li>
                  <span className="font-semibold">But:</span> Growth phase; duration &amp; exposure limited
                </li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold">🥈 Silver</div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Longer lives (6 hrs)</li>
                <li>Better visibility</li>
                <li>Potentially larger campaigns</li>
                <li>Stronger trust badge</li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold">🥇 Gold</div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Premium creator</li>
                <li>High-budget campaigns eligible</li>
                <li>Possibly featured / priority placement</li>
              </ul>
            </div>
          </div>
        </InfoCard>
      </div>
    </section>
  );
}

function TierCard({
  tier,
  items,
  highlight,
}: {
  tier: "Bronze" | "Silver" | "Gold";
  items: string[];
  highlight?: boolean;
}) {
  const meta = {
    Bronze: {
      icon: "🥉",
      blurb: "Entry / early growth tier",
      durationLabel: "🔒 Max live duration: 60 min",
    },
    Silver: {
      icon: "🥈",
      blurb: "Mid-tier, more visibility & perks",
      durationLabel: "Max live duration: 6 hrs",
    },
    Gold: {
      icon: "🥇",
      blurb: "High-performing, premium tier",
      durationLabel: "Max live duration: 24 hrs",
    },
  } as const;

  const m = meta[tier];

  return (
    <div
      className={cx(
        "border rounded-2xl px-3 py-2 text-xs",
        highlight
          ? "border-[#f77f00] bg-amber-50/40 dark:bg-orange-500/10"
          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="text-3xl leading-none" aria-hidden="true">
            {m.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs font-semibold">{tier}</span>
              {highlight ? (
                <span className="px-2 py-0.5 rounded-full bg-[#f77f00] text-white text-xs">Current tier</span>
              ) : null}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">{m.blurb}</div>
          </div>
        </div>
      </div>

      <div className="mb-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
          {m.durationLabel}
        </span>
      </div>

      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-200">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
      <div className="flex items-start gap-2 mb-1">
        {icon ? (
          <div className="text-xl leading-none" aria-hidden="true">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
        </div>
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-200">{children}</div>
    </div>
  );
}

function TrendsPanel({
  trend,
  timeRange,
  onChangeTimeRange,
  category,
  onChangeCategory,
}: {
  trend: TrendPoint[];
  timeRange: Range;
  onChangeTimeRange: (v: Range) => void;
  category: Category;
  onChangeCategory: (v: Category) => void;
}) {
  const [showViews, setShowViews] = useState(true);
  const [showClicks, setShowClicks] = useState(true);
  const [showConversions, setShowConversions] = useState(true);

  const last = trend[trend.length - 1];
  const first = trend[0];
  const deltaViews = last && first ? last.views - first.views : 0;
  const deltaPct = first?.views ? (deltaViews / first.views) * 100 : 0;

  const series = useMemo(
    () =>
      [
        showViews
          ? { key: "views" as const, label: "Views", color: TOKENS.orange }
          : null,
        showClicks
          ? { key: "clicks" as const, label: "Clicks", color: TOKENS.black }
          : null,
        showConversions
          ? { key: "conversions" as const, label: "Conversions", color: TOKENS.green }
          : null,
      ].filter(Boolean) as { key: keyof TrendPoint; label: string; color: string }[],
    [showViews, showClicks, showConversions]
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 flex flex-col gap-2 text-xs transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Attributed performance trend</h3>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-200">
              <CalendarDays className="h-3.5 w-3.5" />
              Last {timeRange} days
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Views, clicks, and conversions attributed to your creator links.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-0.5">
            {(
              [
                { id: "7", label: "7d" },
                { id: "30", label: "30d" },
                { id: "90", label: "90d" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                className={cx(
                  "px-2.5 py-0.5 rounded-full text-xs",
                  timeRange === opt.id
                    ? "bg-[#f77f00] text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
                onClick={() => onChangeTimeRange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            className="border border-slate-200 dark:border-slate-800 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
            value={category}
            onChange={(e) => onChangeCategory(e.target.value as Category)}
          >
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="All">All categories</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="Beauty">Beauty & Skincare</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="Tech">Tech & Gadgets</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="Faith">Faith-compatible</option>
          </select>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <LegendToggle label="Views" color={TOKENS.orange} checked={showViews} onChange={setShowViews} />
          <LegendToggle label="Clicks" color={TOKENS.black} checked={showClicks} onChange={setShowClicks} />
          <LegendToggle label="Conversions" color={TOKENS.green} checked={showConversions} onChange={setShowConversions} />
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            Change: {deltaViews >= 0 ? "+" : ""}
            {deltaViews.toLocaleString()} views
          </span>
          <span
            className={cx(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs",
              deltaPct >= 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            )}
          >
            {deltaPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(deltaPct).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-2 rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2">
        <MultiLineChart
          data={trend}
          xKey="label"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          series={series as any}
          height={280}
        />
      </div>

      <div className="mt-2 rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 p-3 flex gap-2">
        <div className="h-8 w-8 rounded-2xl flex items-center justify-center bg-slate-900/5 dark:bg-slate-100/10">
          <Sparkles className="h-4 w-4 dark:text-slate-300" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Premium insight</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Best practice: keep your strongest product moment in the first 3 seconds. It consistently improves CTR and conversion.
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendToggle({
  label,
  color,
  checked,
  onChange,
}: {
  label: string;
  color: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs transition-colors",
        checked
          ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
      )}
      title={checked ? "Hide" : "Show"}
    >
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color, opacity: checked ? 1 : 0.25 }} />
      {label}
    </button>
  );
}

function BenchmarksPanel({ benchmarks, trend }: { benchmarks: Benchmarks; trend: TrendPoint[] }) {
  const last = trend[trend.length - 1];
  const sumViews = trend.reduce((a, b) => a + b.views, 0);
  const sumClicks = trend.reduce((a, b) => a + b.clicks, 0);
  const sumConv = trend.reduce((a, b) => a + b.conversions, 0);
  const ctr = sumViews ? (sumClicks / sumViews) * 100 : 0;
  const cvr = sumClicks ? (sumConv / sumClicks) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 flex flex-col gap-3 text-xs transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Benchmarks & distribution</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">How you rank vs similar creators in the same region & category.</p>
        </div>
      </div>

      <div className="space-y-2">
        <PercentileRow label="Viewers" pct={benchmarks.viewersPercentile} hint="Audience reach" />
        <PercentileRow label="CTR" pct={benchmarks.ctrPercentile} hint={`${ctr.toFixed(2)}%`}
        />
        <PercentileRow label="Conversion" pct={benchmarks.conversionPercentile} hint={`${cvr.toFixed(2)}%`} />
        <PercentileRow label="Sales" pct={benchmarks.salesPercentile} hint={money(last?.sales ?? 0)} />
      </div>

      <div className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
        <div className="text-sm font-semibold">Quick read</div>
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors p-3 md:p-4">
            <div className="text-xs text-slate-500 dark:text-slate-300">Total views</div>
            <div className="text-base font-semibold mt-0.5">{sumViews.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors p-3 md:p-4">
            <div className="text-xs text-slate-500 dark:text-slate-300">Total conversions</div>
            <div className="text-base font-semibold mt-0.5">{sumConv.toLocaleString()}</div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Tip: Your conversion percentile is strong — double down on campaigns that match your audience to climb to the next tier faster.
        </p>
      </div>
    </div>
  );
}

function PercentileRow({ label, pct, hint }: { label: string; pct: number; hint?: string }) {
  return (
    <div className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{label}</div>
          <div className="text-xs text-slate-500 truncate">{hint || `${pct}th percentile`}</div>
        </div>
        <div className="text-sm font-semibold">{pct}th</div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${clamp(pct, 0, 100)}%`, background: TOKENS.green }} />
      </div>
    </div>
  );
}

function PerformanceMetricsPanel({
  metrics,
  trend,
  timeRange,
  onChangeTimeRange,
  category,
  onChangeCategory,
}: {
  metrics: Metrics;
  trend: TrendPoint[];
  timeRange: Range;
  onChangeTimeRange: (v: Range) => void;
  category: Category;
  onChangeCategory: (v: Category) => void;
}) {
  const cards = [
    {
      id: "avgViewers",
      label: "Average viewers per live",
      value: metrics.avgViewers,
      unit: "viewers" as const,
      tagline: "Across hosted lives in this period.",
      series: "views" as const,
    },
    {
      id: "ctr",
      label: "Click-through rate",
      value: metrics.ctr,
      unit: "%" as const,
      tagline: "Clicks on highlighted products per viewer.",
      series: "clicks" as const,
    },
    {
      id: "conversion",
      label: "Conversion rate",
      value: metrics.conversion,
      unit: "%" as const,
      tagline: "Viewers who purchased at least once.",
      series: "conversions" as const,
    },
    {
      id: "sales",
      label: "Sales driven",
      value: metrics.salesDriven,
      unit: "USD" as const,
      tagline: "Attributed to your lives and Promo Adz.",
      series: "sales" as const,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 flex flex-col gap-3 text-xs transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Performance metrics</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">Understand how your shows are performing over time and by category.</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-0.5">
            {(
              [
                { id: "7", label: "7d" },
                { id: "30", label: "30d" },
                { id: "90", label: "90d" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                className={cx(
                  "px-2.5 py-0.5 rounded-full",
                  timeRange === opt.id
                    ? "bg-[#f77f00] text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
                onClick={() => onChangeTimeRange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            className="border border-slate-200 dark:border-slate-800 rounded-full px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
            value={category}
            onChange={(e) => onChangeCategory(e.target.value as Category)}
          >
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="All">All categories</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="Beauty">Beauty & Skincare</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="Tech">Tech & Gadgets</option>
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="Faith">Faith-compatible</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
        {cards.map((card) => (
          <MetricCard key={card.id} card={card} trend={trend} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  card,
  trend,
}: {
  card: {
    id: string;
    label: string;
    value: number;
    unit: "viewers" | "%" | "USD";
    tagline: string;
    series: "views" | "clicks" | "conversions" | "sales";
  };
  trend: TrendPoint[];
}) {
  const isMoney = card.unit === "USD";
  const valueLabel = isMoney
    ? money(card.value, "USD")
    : card.unit === "%"
      ? `${card.value.toFixed(2)}%`
      : card.value.toLocaleString();

  const sparkValues = useMemo(() => {
    if (!trend.length) return [];
    return trend.map((point) => point[card.series]);
  }, [card.series, trend]);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-300">{card.label}</span>
        <span className="text-xs text-slate-400">Last period</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{valueLabel}</span>
      </div>
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2">
        <MiniLineChart values={sparkValues} height={44} color={TOKENS.orange} />
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{card.tagline}</p>
    </div>
  );
}

function CampaignLeaderboard({
  campaigns,
  mode,
  onChangeMode,
}: {
  campaigns: CampaignRow[];
  mode: LeaderboardMode;
  onChangeMode: (m: LeaderboardMode) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 flex flex-col gap-2 text-xs transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold">Campaign leaderboard</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">Top campaigns by {mode === "sales" ? "sales" : "engagement"}.</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-0.5 text-xs text-slate-700 dark:text-slate-200">
          <button
            className={cx(
              "px-2.5 py-0.5 rounded-full",
              mode === "sales" ? "bg-[#f77f00] text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
            onClick={() => onChangeMode("sales")}
          >
            Sales
          </button>
          <button
            className={cx(
              "px-2.5 py-0.5 rounded-full",
              mode === "engagement" ? "bg-[#f77f00] text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
            onClick={() => onChangeMode("engagement")}
          >
            Engagement
          </button>
        </div>
      </div>
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50 overflow-x-auto">
        <table className="w-full text-xs text-slate-700 dark:text-slate-100">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium">Campaign</th>
              <th className="text-left px-2 py-1.5 font-medium">Seller</th>
              <th className="text-left px-2 py-1.5 font-medium">Category</th>
              <th className="text-right px-2 py-1.5 font-medium">Sales</th>
              <th className="text-right px-2 py-1.5 font-medium">Engagement</th>
              <th className="text-right px-2 py-1.5 font-medium">Conv%</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <td className="px-2 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                <td className="px-2 py-1.5 text-xs text-slate-600 dark:text-slate-200">{c.seller}</td>
                <td className="px-2 py-1.5 text-xs text-slate-600 dark:text-slate-200">{c.category}</td>
                <td className="px-2 py-1.5 text-xs text-right text-slate-800 dark:text-slate-100">{money(c.sales, "USD")}</td>
                <td className="px-2 py-1.5 text-xs text-right text-slate-600 dark:text-slate-200">{c.engagements.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-xs text-right text-slate-600 dark:text-slate-200">{c.convRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        Use your top 2–3 campaigns as templates for future shows – similar structures often convert best.
      </p>
    </div>
  );
}

function ConversionsByCampaignPanel({ campaigns, mode }: { campaigns: CampaignRow[]; mode: LeaderboardMode }) {
  // Convert to a chart-friendly series.
  const items = useMemo(() => {
    return campaigns.map((c) => {
      const conversions = Math.max(0, c.conversions);
      return {
        label: c.name,
        value: mode === "sales" ? c.sales : c.engagements,
        hint: `${conversions.toLocaleString()} conversions`,
      };
    });
  }, [campaigns, mode]);

  const title = mode === "sales" ? "Sales by campaign" : "Engagement by campaign";
  const subtitle = mode === "sales" ? "Compare top campaigns quickly." : "Which campaigns generate the most interactions.";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 flex flex-col gap-2 text-xs transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2">
        <BarChartVertical items={items} height={280} color={TOKENS.green} />
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-300">
        Tip: Open your best campaign structure and replicate the first 60 seconds (hook → value → offer → pin).
      </div>
    </div>
  );
}

function ImprovementSuggestions({ metrics, rank, benchmarks }: { metrics: Metrics; rank: Rank; benchmarks: Benchmarks }) {
  const avgViewers = metrics.avgViewers;
  const targetViewers = 950;
  const viewerDelta = targetViewers - avgViewers;

  const conv = metrics.conversion;
  const targetConv = 4.8;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 flex flex-col gap-2 text-xs transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold">Improvement suggestions</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">AI tips based on your performance, rank and benchmarks.</p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300">Benchmarks vs similar creators</span>
      </div>

      <div className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 flex flex-wrap items-center gap-2">
        <div className="h-9 w-9 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold dark:text-slate-100">Your audience is strong</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            You’re in the <span className="font-semibold">{benchmarks.viewersPercentile}th</span> percentile for viewers.
            Keep the hook tight, then pin your best offer early.
          </div>
        </div>
      </div>

      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 mt-1">
        <li>
          Increasing average watch time and keeping viewers until the offer can push conversion closer to Gold-tier creators.
          You’re currently in the <span className="font-semibold">{benchmarks.conversionPercentile}th</span> percentile for conversion.
        </li>
        <li>
          If you add roughly <span className="font-semibold">{viewerDelta > 0 ? viewerDelta : 0} more viewers</span> per live, you’ll be close to the next tier’s audience benchmark.
        </li>
        <li>
          Moving conversion from <span className="font-semibold">{conv.toFixed(1)}%</span> to <span className="font-semibold">{targetConv}%</span> would significantly improve your earnings and rank.
        </li>
        <li>
          Use your current tier ({rank.currentTier}) to negotiate better terms on high-impact campaigns (exclusivity, hybrid compensation, or boosted spend).
        </li>
      </ul>
    </div>
  );
}

function GoalsPanel({ goals }: { goals: GoalRow[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 flex flex-col gap-2 text-xs transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold">Goals & personal KPIs</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">Track progress against the targets you’ve set for yourself.</p>
        </div>
        <button className="text-xs px-2.5 py-0.5 rounded-full border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">Manage goals (soon)</button>
      </div>
      <div className="space-y-2">
        {goals.map((goal) => {
          const progress = Math.min(goal.current / (goal.target || 1), 1);
          const remaining = goal.target - goal.current;

          const formattedCurrent =
            goal.unit === "%"
              ? `${goal.current.toFixed(1)}%`
              : goal.unit === "USD"
                ? money(goal.current, "USD")
                : goal.current.toLocaleString();

          const formattedTarget =
            goal.unit === "%"
              ? `${goal.target.toFixed(1)}%`
              : goal.unit === "USD"
                ? money(goal.target, "USD")
                : goal.target.toLocaleString();

          return (
            <div key={goal.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 bg-slate-100 dark:bg-slate-800 flex flex-col gap-1 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-200">{goal.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  Target: <span className="font-medium">{formattedTarget}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Current: {formattedCurrent}</span>
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  {remaining > 0
                    ? `Need ${goal.unit === "%" ? remaining.toFixed(1) + "%" : remaining.toFixed(0)} more`
                    : "Goal reached or exceeded"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: TOKENS.green }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 mt-1">
        In the full product, you’ll be able to set custom goals (watch time, replays, new followers) and get alerts when you’re on track or falling behind.
      </p>
    </div>
  );
}

function CalloutPanel() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 flex flex-col gap-2 text-xs transition-colors">
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
          <Trophy className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">Rank playbook</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Small improvements that typically move creators up a tier.</div>
        </div>
      </div>
      <div className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 p-3 text-xs text-slate-700 dark:text-slate-300 space-y-2">
        <div>
          <div className="font-semibold">1) Improve your first 15 seconds</div>
          <div className="text-slate-600 mt-0.5">Lead with outcome + proof, then pin the hero offer. This boosts CTR.</div>
        </div>
        <div>
          <div className="font-semibold">2) Pin fewer items (but pin earlier)</div>
          <div className="text-slate-600 mt-0.5">Creators with 2–4 pinned items often convert better than 10+ items.</div>
        </div>
        <div>
          <div className="font-semibold">3) Use a consistent template</div>
          <div className="text-slate-600 mt-0.5">Repeat your best-performing campaign structure to reduce variance.</div>
        </div>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-300">More premium coaching and benchmarks will appear here.</div>
    </div>
  );
}

/* ------------------------------ Charts (SVG) ------------------------------ */

function MiniLineChart({ values, height = 64, color = TOKENS.orange }: { values: number[]; height?: number; color?: string }) {
  const safe = values.length ? values : [0, 0, 0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = max - min || 1;

  const pts = safe.map((v, i) => {
    const x = (i / Math.max(1, safe.length - 1)) * 100;
    const y = 36 - ((v - min) / span) * 32; // 4..36
    return { x, y };
  });

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const area = `${d} L 100 40 L 0 40 Z`;

  return (
    <svg viewBox="0 0 100 40" className="w-full" style={{ height }}>
      <path d={area} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <line x1="0" y1="40" x2="100" y2="40" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-800" />
    </svg>
  );
}

function MultiLineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 260,
}: {
  data: T[];
  xKey: keyof T;
  series: { key: keyof T; label: string; color: string }[];
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const n = data.length;

  const { minY, maxY } = useMemo(() => {
    let mn = Infinity;
    let mx = -Infinity;
    for (const row of data) {
      for (const s of series) {
        const v = Number(row[s.key]);
        if (!Number.isFinite(v)) continue;
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      }
    }
    if (!Number.isFinite(mn) || !Number.isFinite(mx)) return { minY: 0, maxY: 1 };
    if (mn === mx) return { minY: mn - 1, maxY: mx + 1 };
    const pad = (mx - mn) * 0.08;
    return { minY: mn - pad, maxY: mx + pad };
  }, [data, series]);

  const span = maxY - minY || 1;

  const ptsFor = (key: keyof T) => {
    return data.map((row, i) => {
      const x = (i / Math.max(1, n - 1)) * 100;
      const v = Number(row[key]);
      const y = 56 - ((v - minY) / span) * 52; // 4..56
      return { x, y, v };
    });
  };

  const paths = series.map((s) => {
    const pts = ptsFor(s.key);
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
    return { ...s, pts, d };
  });

  const hover = hoverIdx != null ? clamp(hoverIdx, 0, n - 1) : null;
  const hoverLabel = hover != null ? String(data[hover][xKey] ?? "") : "";

  const tooltip = hover != null
    ? series.map((s) => {
      const v = Number(data[hover][s.key] as number);
      return { label: s.label, color: s.color, value: v };
    })
    : [];

  function onMove(e: React.MouseEvent) {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = e.clientX - box.left;
    const pct = clamp(x / box.width, 0, 1);
    const idx = Math.round(pct * (n - 1));
    setHoverIdx(idx);
    setHoverX(x);
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseMove={onMove}
      onMouseLeave={() => setHoverIdx(null)}
      onTouchStart={() => setHoverIdx(null)}
    >
      <svg viewBox="0 0 100 60" className="w-full" style={{ height }}>
        {/* grid */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            x2="100"
            y1={(i / 3) * 56}
            y2={(i / 3) * 56}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-slate-200 dark:text-slate-800"
          />
        ))}

        {/* lines */}
        {paths.map((p) => (
          <path key={p.label} d={p.d} fill="none" stroke={p.color} strokeWidth={2.4} strokeLinecap="round" />
        ))}

        {/* hover */}
        {hover != null ? (
          <>
            <line x1={(hover / Math.max(1, n - 1)) * 100} x2={(hover / Math.max(1, n - 1)) * 100} y1="0" y2="56" stroke="currentColor" strokeWidth="0.8" className="text-slate-300 dark:text-slate-700" />
            {paths.map((p) => (
              <circle
                key={p.label}
                cx={p.pts[hover].x}
                cy={p.pts[hover].y}
                r={1.8}
                fill={p.color}
                stroke="#fff"
                strokeWidth="0.8"
              />
            ))}
          </>
        ) : null}

        {/* x baseline */}
        <line x1="0" y1="56" x2="100" y2="56" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-800" />
      </svg>

      {hover != null ? (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: clamp(hoverX + 10, 8, (wrapRef.current?.clientWidth ?? 320) - 220),
            top: 10,
          }}
        >
          <div className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl px-3 py-2 min-w-[200px] transition-colors">
            <div className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{hoverLabel}</div>
            <div className="mt-1 space-y-1">
              {tooltip.map((t) => (
                <div key={t.label} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                    <span className="text-slate-600 dark:text-slate-200">{t.label}</span>
                  </div>
                  <span className="font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{Number.isFinite(t.value) ? Math.round(t.value).toLocaleString() : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BarChartVertical({
  items,
  height = 240,
  color = TOKENS.green,
}: {
  items: { label: string; value: number; hint?: string }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const n = Math.max(1, items.length);

  // viewbox 100x60 with padding
  const padTop = 6;
  const padBottom = 12;
  const chartH = 60 - padTop - padBottom;

  return (
    <div className="w-full">
      <svg viewBox="0 0 100 60" className="w-full" style={{ height }}>
        <line x1="0" y1={60 - padBottom} x2="100" y2={60 - padBottom} stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-800" />
        {items.map((it, idx) => {
          const w = 100 / n;
          const x0 = idx * w + w * 0.18;
          const bw = w * 0.64;
          const h = (it.value / max) * chartH;
          const y0 = padTop + (chartH - h);
          return (
            <g key={it.label}>
              <rect x={x0} y={y0} width={bw} height={h} rx={2} fill={color} opacity={0.92} />
              <title>
                {it.label}: {it.value.toLocaleString()}
              </title>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.label} className="rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 transition-colors">
            <div className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{it.label}</div>
            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{it.value.toLocaleString()}</div>
            {it.hint ? <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">{it.hint}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
