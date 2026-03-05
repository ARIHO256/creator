import React from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useDashboardFeedQuery } from "../../hooks/api/useWorkspace";
import type {
  DashboardFeedActionRecord,
  DashboardFeedFollowedSellerRecord,
  DashboardFeedLiveItemRecord,
  DashboardFeedOpportunityRecord,
  DashboardFeedReplayRecord,
  DashboardQuickStatRecord
} from "../../api/types";

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatCard({ stat }: { stat: DashboardQuickStatRecord }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{stat.hint}</p>
    </div>
  );
}

function SessionCard({ item, onOpen }: { item: DashboardFeedLiveItemRecord; onOpen: (target?: string) => void }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.seller}</p>
        </div>
        <span className="rounded-full bg-[#f77f00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#f77f00]">
          {item.status ?? "scheduled"}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-300">
        <p>{item.campaign}</p>
        <p>{item.timeLabel ?? item.scheduledFor}</p>
        <p>{item.category}</p>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-300">
          {item.soldUnits ?? 0} / {item.targetUnits ?? 0} target units
        </span>
        <button
          type="button"
          onClick={() => onOpen(item.route)}
          className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Open
        </button>
      </div>
    </article>
  );
}

function ReplayCard({ item, onOpen }: { item: DashboardFeedReplayRecord; onOpen: (target?: string) => void }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.seller}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
        <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-800">{item.views ?? 0} views</span>
        <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-800">{item.sales ?? 0} sales</span>
        <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-800">{item.published ? "Published" : "Draft"}</span>
      </div>
      <button
        type="button"
        onClick={() => onOpen(item.route)}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        Review replay
      </button>
    </article>
  );
}

function RelationshipCard({ item, onOpen }: { item: DashboardFeedFollowedSellerRecord; onOpen: (target?: string) => void }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.category}</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          Following
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">{item.status}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">Fit score {item.fitScore ?? "—"}</p>
      <button
        type="button"
        onClick={() => onOpen(item.route)}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        Open relationship
      </button>
    </article>
  );
}

function OpportunityCard({ item, onOpen }: { item: DashboardFeedOpportunityRecord; onOpen: (target?: string) => void }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.seller}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
        <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-800">{item.category}</span>
        <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-800">{item.payBand}</span>
        <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-800">Match {item.matchScore}</span>
      </div>
      <button
        type="button"
        onClick={() => onOpen(item.route)}
        className="mt-4 rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#dd7200]"
      >
        Open opportunity
      </button>
    </article>
  );
}

function ActionCard({ item, onOpen }: { item: DashboardFeedActionRecord; onOpen: (target?: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.target)}
      className="flex w-full items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#f77f00] hover:bg-amber-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-[#f77f00] dark:hover:bg-slate-900"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.context}</p>
      </div>
      <span className="text-sm font-semibold text-[#f77f00]">Open →</span>
    </button>
  );
}

export function CreatorLiveDealzFeedPage() {
  const navigate = useNavigate();
  const feedQuery = useDashboardFeedQuery();
  const feed = feedQuery.data;

  const open = (target?: string) => {
    if (!target) return;
    navigate(target);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader pageTitle="LiveDealz Feed" mobileViewType="hide" />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-6 sm:px-4 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Backend-driven workspace feed</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">{feed?.hero.title ?? "Loading your creator feed…"}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">{feed?.hero.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(feed?.hero.categories ?? []).map((category) => (
                  <span key={category} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    {category}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => open("/live-dashboard-2")}
              className="rounded-full bg-[#f77f00] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#dd7200]"
            >
              Open live dashboard
            </button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(feed?.quickStats ?? []).map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="grid gap-6">
            <CardShell title="Live now and upcoming sessions">
              <div className="grid gap-4 lg:grid-cols-2">
                {feed?.liveNow.map((item) => <SessionCard key={item.id} item={item} onOpen={open} />)}
                {feed?.upcoming.map((item) => <SessionCard key={item.id} item={item} onOpen={open} />)}
              </div>
            </CardShell>

            <CardShell title="Featured replays">
              <div className="grid gap-4 lg:grid-cols-3">
                {feed?.featuredReplays.map((item) => <ReplayCard key={item.id} item={item} onOpen={open} />)}
              </div>
            </CardShell>

            <CardShell title="Open opportunities">
              <div className="grid gap-4 lg:grid-cols-2">
                {feed?.openOpportunities.map((item) => <OpportunityCard key={item.id} item={item} onOpen={open} />)}
              </div>
            </CardShell>
          </div>

          <div className="grid gap-6">
            <CardShell title="Followed suppliers">
              <div className="space-y-3">
                {feed?.followedSellers.map((item) => <RelationshipCard key={item.id} item={item} onOpen={open} />)}
              </div>
            </CardShell>

            <CardShell title="Recommended actions">
              <div className="space-y-3">
                {feed?.recommendedActions.map((item) => <ActionCard key={item.id} item={item} onOpen={open} />)}
              </div>
            </CardShell>

            <CardShell title="Pipeline snapshot">
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(feed?.pipeline ?? {}).map(([key, value]) => (
                  <div key={key} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-300">
                {(feed?.insights ?? []).map((insight) => (
                  <p key={insight} className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                    {insight}
                  </p>
                ))}
              </div>
            </CardShell>
          </div>
        </section>
      </main>
    </div>
  );
}
