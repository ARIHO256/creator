"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Download,
  Eye,
  EyeOff,
  Filter,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Star,
  ThumbsUp,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { PermissionGate } from "../../components/PermissionGate";
import { useReviewsDashboardQuery } from "../../hooks/api/useReviews";
import type {
  ReviewRecord,
  ReviewTimeWindow,
  ReviewTransactionIntent,
  ReviewVisibilityScope
} from "../../api/types";

const ORANGE = "#f77f00";

type TransactionIntent = ReviewTransactionIntent;
type RatingCategory = "presentation" | "helpfulness" | "productKnowledge" | "interaction" | "trust";
type Scope = ReviewVisibilityScope;
type TimeWindow = ReviewTimeWindow;

type SessionSummary = {
  sessionId: string;
  sessionTitle: string;
  endedAt: string;
  reviewCount: number;
  avgRating: number;
  publicCount: number;
  joinAgainYes: number;
  topOutcome: string;
};

const CATEGORY_LABELS: Record<RatingCategory, string> = {
  presentation: "Presentation & energy",
  helpfulness: "Helpfulness",
  productKnowledge: "Product / service knowledge",
  interaction: "Audience interaction",
  trust: "Trust & clarity",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatIntent(intent: TransactionIntent) {
  switch (intent) {
    case "bought":
      return "Bought";
    case "added_to_cart":
      return "Added to cart";
    case "booked":
      return "Booked";
    case "requested_quote":
      return "Requested quote";
    case "just_watched":
      return "Just watched";
    default:
      return "No outcome";
  }
}

function formatDateTime(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function starsFor(value: number) {
  return Array.from({ length: 5 }).map((_, idx) => idx < Math.round(value));
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentage(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function csvEscape(v: string) {
  const needs = /[\n,"]/g.test(v);
  const clean = v.replace(/"/g, '""');
  return needs ? `"${clean}"` : clean;
}

function downloadCsv(filename: string, rows: Record<string, string | number | boolean>[]) {
  if (!rows.length || typeof window === "undefined") return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(String(row[h] ?? ""))).join(","));
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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-transparent text-white shadow-sm"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
      )}
      style={active ? { background: ORANGE } : undefined}
    >
      {label}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-50">{value}</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{subtext}</div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function RatingStars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const stars = starsFor(value);
  const sizeClass = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-1">
      {stars.map((filled, idx) => (
        <Star
          key={idx}
          className={cx(sizeClass, filled ? "fill-current text-amber-400" : "text-slate-300 dark:text-slate-700")}
        />
      ))}
    </div>
  );
}

export default function CreatorReviewsDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryCreatorId = (params.get("creatorId") || "").trim();

  const [scope, setScope] = useState<Scope>("all");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("90");
  const [minRating, setMinRating] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [creatorFilterId, setCreatorFilterId] = useState(queryCreatorId);

  useEffect(() => {
    setCreatorFilterId(queryCreatorId);
  }, [queryCreatorId]);

  const reviewFilters = useMemo(
    () => ({
      creatorId: creatorFilterId || undefined,
      scope,
      timeWindow,
      minRating: minRating > 0 ? minRating : undefined,
      q: search.trim() || undefined
    }),
    [creatorFilterId, minRating, scope, search, timeWindow]
  );

  const reviewsQuery = useReviewsDashboardQuery(reviewFilters, {
    staleTime: 20_000
  });

  const dashboard = reviewsQuery.data;
  const filteredReviews = dashboard?.reviews ?? [];
  const creatorIdentity = dashboard?.selectedCreator
    ? {
        creatorName: dashboard.selectedCreator.name,
        creatorHandle:
          dashboard.selectedCreator.handle === "workspace"
            ? "@workspace"
            : dashboard.selectedCreator.handle || "@creator"
      }
    : null;
  const loadError = reviewsQuery.isError
    ? reviewsQuery.error instanceof Error
      ? reviewsQuery.error.message
      : "Could not load reviews right now. Check your connection and retry."
    : null;
  const initialLoadDone = reviewsQuery.status === "success" || reviewsQuery.status === "error";
  const isPending = reviewsQuery.isFetching;

  const creatorName =
    creatorIdentity?.creatorName ||
    filteredReviews[0]?.creatorName ||
    (dashboard?.canViewWorkspace ? "Creator Team" : "Creator");
  const creatorHandle = creatorIdentity?.creatorHandle || filteredReviews[0]?.creatorHandle || "@creator";

  const creatorOptions = useMemo(() => {
    const baseOptions = dashboard?.creators ?? [];
    if (!dashboard?.canViewWorkspace) return baseOptions;
    const workspaceReviewCount = baseOptions.reduce((sum, option) => sum + Number(option.reviewCount || 0), 0);
    const weightedAverage = workspaceReviewCount
      ? Number(
          (
            baseOptions.reduce(
              (sum, option) => sum + Number(option.avgRating || 0) * Number(option.reviewCount || 0),
              0
            ) / workspaceReviewCount
          ).toFixed(1)
        )
      : 0;
    return [
      {
        id: "all",
        name: "Creator Team",
        handle: "@workspace",
        reviewCount: workspaceReviewCount,
        avgRating: dashboard && dashboard.selectedCreator?.id === "all" ? dashboard.selectedCreator.avgRating : weightedAverage,
        isWorkspace: true
      },
      ...baseOptions
    ];
  }, [dashboard?.canViewWorkspace, dashboard?.creators, dashboard?.selectedCreator]);

  function onChangeCreatorFilter(nextId: string) {
    setCreatorFilterId(nextId);
    const nextParams = new URLSearchParams(location.search);
    if (!nextId || nextId === "all") nextParams.delete("creatorId");
    else nextParams.set("creatorId", nextId);
    nextParams.delete("creatorName");
    const nextSearch = nextParams.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : ""
      },
      { replace: true }
    );
  }

  const avgOverall = useMemo(
    () => avg(filteredReviews.map((review) => review.overallRating)),
    [filteredReviews]
  );

  const joinAgainPct = useMemo(() => {
    const eligible = filteredReviews.filter((review) => review.wouldJoinAgain !== null);
    return percentage(eligible.filter((review) => review.wouldJoinAgain === true).length, eligible.length);
  }, [filteredReviews]);

  const publicPct = useMemo(
    () => percentage(filteredReviews.filter((review) => review.publicReview).length, filteredReviews.length),
    [filteredReviews]
  );

  const anonymousPct = useMemo(
    () => percentage(filteredReviews.filter((review) => review.anonymous).length, filteredReviews.length),
    [filteredReviews]
  );

  const ratingDistribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: filteredReviews.filter((review) => review.overallRating === rating).length,
    }));
  }, [filteredReviews]);

  const categoryAverages = useMemo(() => {
    return (Object.keys(CATEGORY_LABELS) as RatingCategory[]).map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      value: avg(filteredReviews.map((review) => review.categoryRatings[key] ?? 0)),
    }));
  }, [filteredReviews]);

  const topPositiveTags = useMemo(() => {
    const counts = new Map<string, number>();
    filteredReviews.forEach((review) => {
      review.quickTags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filteredReviews]);

  const topIssueTags = useMemo(() => {
    const counts = new Map<string, number>();
    filteredReviews.forEach((review) => {
      review.issueTags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filteredReviews]);

  const outcomeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    filteredReviews.forEach((review) => {
      const label = formatIntent(review.transactionIntent);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredReviews]);

  const sessionSummaries = useMemo<SessionSummary[]>(() => {
    const map = new Map<string, ReviewRecord[]>();
    filteredReviews.forEach((review) => {
      if (!map.has(review.sessionId)) map.set(review.sessionId, []);
      map.get(review.sessionId)!.push(review);
    });

    return Array.from(map.entries())
      .map(([sessionId, reviews]) => {
        const sample = reviews[0];
        const outcomes = new Map<string, number>();
        reviews.forEach((review) => {
          const label = formatIntent(review.transactionIntent);
          outcomes.set(label, (outcomes.get(label) || 0) + 1);
        });
        const topOutcome = Array.from(outcomes.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
        return {
          sessionId,
          sessionTitle: sample.sessionTitle,
          endedAt: sample.endedAt,
          reviewCount: reviews.length,
          avgRating: avg(reviews.map((review) => review.overallRating)),
          publicCount: reviews.filter((review) => review.publicReview).length,
          joinAgainYes: reviews.filter((review) => review.wouldJoinAgain === true).length,
          topOutcome,
        };
      })
      .sort((a, b) => +new Date(b.endedAt) - +new Date(a.endedAt));
  }, [filteredReviews]);

  const recentReviews = useMemo(
    () => [...filteredReviews].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 12),
    [filteredReviews]
  );

  const latestReviewDate = recentReviews[0]?.createdAt || filteredReviews[0]?.createdAt;

  function onExportCsv() {
    downloadCsv(
      `creator_reviews_${creatorName.toLowerCase().replace(/\s+/g, "-")}.csv`,
      filteredReviews.map((review) => ({
        sessionTitle: review.sessionTitle,
        createdAt: review.createdAt,
        overallRating: review.overallRating,
        publicReview: review.publicReview,
        anonymous: review.anonymous,
        wouldJoinAgain: review.wouldJoinAgain ?? "",
        transactionIntent: formatIntent(review.transactionIntent),
        reviewText: review.reviewText,
        quickTags: review.quickTags.join(" | "),
        issueTags: review.issueTags.join(" | "),
      }))
    );
  }

  const strongestCategory = [...categoryAverages].sort((a, b) => b.value - a.value)[0];
  const weakestCategory = [...categoryAverages].sort((a, b) => a.value - b.value)[0];

  return (
    <PermissionGate
      permission="reviews.view"
      pageTitle="Creator Reviews"
      subtitle="Reviews access is controlled from Roles & Permissions for your workspace."
    >
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      <PageHeader
        pageTitle="Creator Reviews"
        badge={
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Audience trust signal
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200">
              <MessageSquare className="h-3.5 w-3.5" />
              {filteredReviews.length} reviews
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200">
              {isPending && !initialLoadDone ? "Syncing..." : filteredReviews.length ? "Synced" : "No data"}
            </span>
          </div>
        }
        rightContent={
          <button
            onClick={onExportCsv}
            disabled={!filteredReviews.length || !initialLoadDone}
            className={cx(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
              !filteredReviews.length || !initialLoadDone
                ? "cursor-not-allowed bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        }
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          {!initialLoadDone ? (
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors">
              <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-600 dark:text-slate-300">
                <CircularProgress size={24} />
                <div className="text-sm font-medium">Loading review analytics from backend...</div>
              </div>
            </section>
          ) : (
            <>
              {loadError ? (
                <section className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-red-700 dark:text-red-300">{loadError}</div>
                    <button
                      type="button"
                      onClick={() => { void reviewsQuery.refetch(); }}
                      className="inline-flex items-center justify-center rounded-full border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </section>
              ) : null}

        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 md:p-5 shadow-sm transition-colors">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 min-w-0">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-400 to-amber-500 text-lg sm:text-xl font-bold text-white shadow-sm">
                {initials(creatorName)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                  <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-50">{creatorName}</h1>
                  <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                    {creatorHandle}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                    Reputation dashboard
                  </span>
                </div>
                <p className="mt-1 max-w-none sm:max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                  View all ratings and written feedback received after live sessions. Use this page to understand trust,
                  audience satisfaction, and what to improve before the next live.
                </p>
                <div className="mt-3 grid grid-cols-1 min-[460px]:grid-cols-2 gap-2">
                  <div className="inline-flex w-full items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
                    <div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{avgOverall.toFixed(1)}</div>
                      <RatingStars value={avgOverall} size="md" />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <div>Average rating</div>
                      <div>{filteredReviews.length} total reviews</div>
                    </div>
                  </div>
                  <div className="inline-flex w-full items-center justify-center min-[460px]:justify-start gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {joinAgainPct}% would join again
                  </div>
                  <div className="inline-flex w-full items-center justify-center min-[460px]:justify-start gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200">
                    <Eye className="h-3.5 w-3.5" />
                    {publicPct}% public reviews
                  </div>
                  <div className="inline-flex w-full items-center justify-center min-[460px]:justify-start gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200">
                    <UserRound className="h-3.5 w-3.5" />
                    {anonymousPct}% anonymous
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 min-[460px]:grid-cols-2 lg:grid-cols-3 gap-2 min-w-full lg:min-w-[420px] lg:max-w-[460px]">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Strongest category</div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{strongestCategory?.label || "—"}</div>
                <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{strongestCategory?.value.toFixed(1) || "0.0"}/5</div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Needs attention</div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{weakestCategory?.label || "—"}</div>
                <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">{weakestCategory?.value.toFixed(1) || "0.0"}/5</div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Last review</div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {latestReviewDate ? formatDateTime(latestReviewDate) : "No reviews yet"}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Keep this updated after every live.</div>
              </div>
            </div>
          </div>
        </section>

        <SectionCard title="Filter reviews" subtitle="Find feedback by visibility, timeframe, rating, or keyword.">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill active={scope === "all"} label="All reviews" onClick={() => setScope("all")} />
              <FilterPill active={scope === "public"} label="Public only" onClick={() => setScope("public")} />
              <FilterPill active={scope === "private"} label="Private only" onClick={() => setScope("private")} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dashboard?.canViewWorkspace && creatorOptions.length > 1 ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <UserRound className="h-3.5 w-3.5" />
                  <select
                    value={creatorFilterId || "all"}
                    onChange={(e) => onChangeCreatorFilter(e.target.value)}
                    className="bg-transparent outline-none"
                  >
                    {creatorOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} · {option.reviewCount} reviews
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
                <CalendarDays className="h-3.5 w-3.5" />
                <select
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
                  className="bg-transparent outline-none"
                >
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
                <Star className="h-3.5 w-3.5" />
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="bg-transparent outline-none"
                >
                  <option value={0}>Any rating</option>
                  <option value={5}>5 stars only</option>
                  <option value={4}>4 stars & up</option>
                  <option value={3}>3 stars & up</option>
                </select>
              </div>

              <label className="flex w-full items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 sm:min-w-[240px] sm:w-auto">
                <Filter className="h-3.5 w-3.5" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search session, tags, or review text"
                  className="w-full bg-transparent outline-none placeholder:text-slate-400"
                />
              </label>
            </div>
          </div>
        </SectionCard>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard
            icon={<Star className="h-5 w-5" />}
            label="Overall rating"
            value={`${avgOverall.toFixed(1)} / 5`}
            subtext="Combined average from all filtered live-session reviews."
          />
          <StatCard
            icon={<ThumbsUp className="h-5 w-5" />}
            label="Would join again"
            value={`${joinAgainPct}%`}
            subtext="Audience loyalty and repeat-live intent."
          />
          <StatCard
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Top outcome"
            value={outcomeBreakdown[0]?.[0] || "No data"}
            subtext="The most common result viewers reported after your live."
          />
          <StatCard
            icon={<BadgeCheck className="h-5 w-5" />}
            label="Trust signal"
            value={`${Math.round(((avgOverall / 5) * 100 + joinAgainPct) / 2)}%`}
            subtext="Simple blended trust score from ratings and repeat intent."
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-3 items-start">
          <SectionCard title="Rating distribution" subtitle="See how your star ratings are spread across the selected reviews.">
            <div className="space-y-3">
              {ratingDistribution.map((row) => {
                const pct = percentage(row.count, filteredReviews.length);
                return (
                  <div key={row.rating} className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-3">
                    <div className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <span>{row.rating}</span>
                      <Star className="h-4 w-4 fill-current text-amber-400" />
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ORANGE }} />
                    </div>
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">{row.count} ({pct}%)</div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Category scores" subtitle="How audiences rate your delivery across the main quality dimensions.">
            <div className="space-y-3">
              {categoryAverages.map((row) => {
                const pct = Math.round((row.value / 5) * 100);
                return (
                  <div key={row.key}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-700 dark:text-slate-200">{row.label}</div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{row.value.toFixed(1)} / 5</div>
                    </div>
                    <div className="mt-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 items-start">
          <SectionCard title="What people praise most" subtitle="Top positive tags pulled from submitted reviews.">
            {topPositiveTags.length ? (
              <div className="flex flex-wrap gap-2">
                {topPositiveTags.map(([tag, count]) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {tag}
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px]">{count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">No positive tags yet.</div>
            )}
          </SectionCard>

          <SectionCard title="Issues to watch" subtitle="Repeated complaints and friction points you may want to fix next.">
            {topIssueTags.length ? (
              <div className="flex flex-wrap gap-2">
                {topIssueTags.map(([tag, count]) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    {tag}
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px]">{count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">No recurring issue tags in this view.</div>
            )}
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-3 items-start">
          <SectionCard title="Recent review feed" subtitle="Latest audience feedback across your recent live sessions.">
            {recentReviews.length ? (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 md:max-h-[780px]">
                {recentReviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{review.sessionTitle}</div>
                          <span
                            className={cx(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              review.publicReview
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                            )}
                          >
                            {review.publicReview ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {review.publicReview ? "Public" : "Private"}
                          </span>
                          {review.anonymous ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                              <ShieldCheck className="h-3 w-3" />
                              Anonymous
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatDateTime(review.createdAt)}</span>
                          <span>•</span>
                          <span>{formatIntent(review.transactionIntent)}</span>
                          <span>•</span>
                          <span>{review.wouldJoinAgain === true ? "Would join again" : review.wouldJoinAgain === false ? "Would not join again" : "No repeat-answer"}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{review.overallRating}.0</div>
                        <RatingStars value={review.overallRating} />
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{review.reviewText}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.quickTags.map((tag) => (
                        <span
                          key={`${review.id}-${tag}`}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {review.issueTags.map((tag) => (
                        <span
                          key={`${review.id}-${tag}`}
                          className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No reviews match these filters yet.
              </div>
            )}
          </SectionCard>

          <div className="flex flex-col gap-3">
            <SectionCard title="Session-by-session summary" subtitle="Compare how each live session performed from a feedback point of view.">
              {sessionSummaries.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <th className="pb-2 pr-3 font-medium">Session</th>
                        <th className="pb-2 pr-3 font-medium">Date</th>
                        <th className="pb-2 pr-3 font-medium">Reviews</th>
                        <th className="pb-2 pr-3 font-medium">Avg</th>
                        <th className="pb-2 pr-3 font-medium">Join again</th>
                        <th className="pb-2 font-medium">Top outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionSummaries.map((session) => (
                        <tr key={session.sessionId} className="border-t border-slate-100 dark:border-slate-800 align-top">
                          <td className="py-3 pr-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-50">{session.sessionTitle}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{session.publicCount} public reviews</div>
                          </td>
                          <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">{formatDateOnly(session.endedAt)}</td>
                          <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">{session.reviewCount}</td>
                          <td className="py-3 pr-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                              <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                              {session.avgRating.toFixed(1)}
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                            {percentage(session.joinAgainYes, session.reviewCount)}%
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">{session.topOutcome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No session summaries available.</div>
              )}
            </SectionCard>

            <SectionCard title="What viewers did after the live" subtitle="Self-reported outcomes from the review flow.">
              <div className="space-y-3">
                {outcomeBreakdown.length ? (
                  outcomeBreakdown.map(([label, count]) => {
                    const pct = percentage(count, filteredReviews.length);
                    return (
                      <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)_48px] items-center gap-3 sm:grid-cols-[140px_minmax(0,1fr)_56px]">
                        <div className="text-sm text-slate-700 dark:text-slate-200">{label}</div>
                        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">{pct}%</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">No outcome data yet.</div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Recommended next moves" subtitle="Quick actions based on your current review patterns.">
              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="mt-0.5 h-8 w-8 rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">Double down on what already works</div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Your strongest audience signal is <span className="font-semibold">{strongestCategory?.label || "trust"}</span>.
                      Keep that visible in your opening minutes and pinned offer flow.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="mt-0.5 h-8 w-8 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 flex items-center justify-center">
                    <EyeOff className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">Tighten weaker areas</div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      The lowest scoring area right now is <span className="font-semibold">{weakestCategory?.label || "interaction"}</span>.
                      Consider a tighter Q&A structure, clearer pacing, or stronger end-of-live recap.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="mt-0.5 h-8 w-8 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">Use this in Analytics + Post Live</div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Reviews work best when compared with retention, conversion, replays, and clip performance. Pair this page with
                      Analytics and Post Live to decide what to repeat or fix.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </section>
            </>
          )}
        </div>
      </main>
    </div>
      </PermissionGate>
  );
}
