import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Circle, ExternalLink, LayoutDashboard, Plus, Search, Video, Wand2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useLiveSessionsQuery } from "../../hooks/api/useLiveRuntime";
import type { LiveBuilderSessionRecord } from "../../api/types";
import { formatDateTime, getLiveHeroImage, getLivePlatforms, getLiveProducts, liveStatusLabel, statusTone } from "../../utils/runtimeData";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const toneClass =
    tone === "good"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
      : tone === "warn"
        ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
        : tone === "bad"
          ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300"
          : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", toneClass)}>{label}</span>;
}

function SummaryCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div>
    </div>
  );
}

function SessionCard({ session, onOpenBuilder, onOpenStudio, onOpenSchedule, onOpenPostLive }: {
  session: LiveBuilderSessionRecord;
  onOpenBuilder: () => void;
  onOpenStudio: () => void;
  onOpenSchedule: () => void;
  onOpenPostLive: () => void;
}) {
  const heroImage = getLiveHeroImage(session);
  const platforms = getLivePlatforms(session);
  const products = getLiveProducts(session);
  const status = liveStatusLabel(session.status);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="bg-slate-100 dark:bg-slate-800 min-h-[180px]">
          {heroImage ? (
            <img src={heroImage} alt={session.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center text-slate-400 dark:text-slate-500">
              <Video className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{session.title}</h2>
                <Pill label={status} tone={statusTone(session.status)} />
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {session.seller || "Unassigned seller"} · {session.campaign || "Unassigned campaign"}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatDateTime(session.scheduledFor)}</span>
                <span>•</span>
                <span>{session.location || "Remote studio"}</span>
                <span>•</span>
                <span>{session.productsCount ?? products.length} featured items</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {platforms.map((platform) => (
                <Pill key={platform} label={platform} />
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricTile label="Duration" value={`${session.durationMin ?? 0} min`} />
            <MetricTile label="Scripts" value={session.scriptsReady ? "Ready" : "Pending"} />
            <MetricTile label="Assets" value={session.assetsReady ? "Ready" : "Pending"} />
            <MetricTile label="Workload" value={`${session.workloadScore ?? 0}%`} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ActionButton onClick={onOpenBuilder} icon={<Wand2 className="h-4 w-4" />}>Open builder</ActionButton>
            <ActionButton onClick={onOpenStudio} icon={<Video className="h-4 w-4" />}>Open studio</ActionButton>
            <ActionButton onClick={onOpenSchedule} icon={<CalendarDays className="h-4 w-4" />}>Open schedule</ActionButton>
            {String(session.status).toLowerCase() === "ended" ? (
              <ActionButton onClick={onOpenPostLive} icon={<ExternalLink className="h-4 w-4" />}>Post-live</ActionButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function ActionButton({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
    >
      {icon}
      {children}
    </button>
  );
}

export default function LiveDashboard2(): JSX.Element {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const liveSessionsQuery = useLiveSessionsQuery();

  const sessions = liveSessionsQuery.data?.items ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesStatus = statusFilter === "all" || String(session.status).toLowerCase() === statusFilter;
      const haystack = [session.title, session.seller, session.campaign, ...(getLivePlatforms(session) || [])].join(" ").toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [query, sessions, statusFilter]);

  const counts = useMemo(() => {
    const scheduled = sessions.filter((session) => {
      const status = String(session.status).toLowerCase();
      return status === "scheduled" || status === "ready";
    }).length;
    const live = sessions.filter((session) => String(session.status).toLowerCase() === "live").length;
    const ended = sessions.filter((session) => String(session.status).toLowerCase() === "ended").length;
    return {
      total: sessions.length,
      scheduled,
      live,
      ended
    };
  }, [sessions]);

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Live Dashboard"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <LayoutDashboard className="h-4 w-4" />
            Published live sessions and runtime control
          </span>
        }
        rightContent={
          <button
            type="button"
            onClick={() => navigate("/live-builder")}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" />
            New live session
          </button>
        }
      />

      <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard title="All sessions" value={String(counts.total)} hint="Saved and published live sessions" />
          <SummaryCard title="Scheduled" value={String(counts.scheduled)} hint="Ready to go live" />
          <SummaryCard title="Live now" value={String(counts.live)} hint="Broadcasts currently active" />
          <SummaryCard title="Ended" value={String(counts.ended)} hint="Ready for replay and post-live" />
        </div>

        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sessions, sellers, campaigns, platforms"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: "All" },
                { value: "draft", label: "Draft" },
                { value: "scheduled", label: "Scheduled" },
                { value: "live", label: "Live" },
                { value: "ended", label: "Ended" }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={cx(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    statusFilter === option.value
                      ? "border-[#f77f00] bg-[#fff4e5] text-[#c26100] dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {liveSessionsQuery.isLoading ? (
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
            Loading live sessions from the backend…
          </section>
        ) : liveSessionsQuery.isError ? (
          <section className="rounded-3xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-8 text-sm text-rose-700 dark:text-rose-300 shadow-sm">
            The live runtime data could not be loaded right now.
          </section>
        ) : filtered.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
            No live sessions match the current filters.
          </section>
        ) : (
          <div className="space-y-4">
            {filtered.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onOpenBuilder={() => navigate(`/live-builder?sessionId=${encodeURIComponent(session.id)}`)}
                onOpenStudio={() => navigate(`/live-studio?sessionId=${encodeURIComponent(session.id)}`)}
                onOpenSchedule={() => navigate(`/live-schedule?sessionId=${encodeURIComponent(session.id)}`)}
                onOpenPostLive={() => navigate(`/post-live?sessionId=${encodeURIComponent(session.id)}`)}
              />
            ))}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
          <div className="flex items-start gap-3">
            <Circle className="mt-0.5 h-4 w-4 text-[#f77f00]" fill="currentColor" />
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">This dashboard is now backend-driven.</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Every card above is reading the published live session payloads from the MyLiveDealz API instead of the old local demo seed.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
