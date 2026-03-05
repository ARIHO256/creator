import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ExternalLink, Video } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useLiveSessionsQuery } from "../../hooks/api/useLiveRuntime";
import type { LiveBuilderSessionRecord } from "../../api/types";
import { formatDate, formatDateTime, liveStatusLabel, statusTone } from "../../utils/runtimeData";

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
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", toneClass)}>{label}</span>;
}

function groupSessionsByDay(sessions: LiveBuilderSessionRecord[]) {
  const map = new Map<string, LiveBuilderSessionRecord[]>();
  sessions.forEach((session) => {
    const label = formatDate(session.scheduledFor);
    const current = map.get(label) ?? [];
    current.push(session);
    map.set(label, current);
  });
  return Array.from(map.entries()).map(([day, entries]) => ({
    day,
    entries: entries.sort((left, right) => String(left.scheduledFor || "").localeCompare(String(right.scheduledFor || "")))
  }));
}

export function LiveScheduleCalendarPage(): JSX.Element {
  const navigate = useNavigate();
  const liveSessionsQuery = useLiveSessionsQuery();
  const sessions = liveSessionsQuery.data?.items ?? [];

  const grouped = useMemo(() => groupSessionsByDay(sessions), [sessions]);
  const conflicts = useMemo(
    () => sessions.filter((session) => Boolean(session.conflict)),
    [sessions]
  );

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Live Schedule"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <CalendarClock className="h-4 w-4" />
            Schedule from published live payloads
          </span>
        }
      />

      <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {conflicts.length > 0 ? (
          <section className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4 text-sm text-amber-900 dark:text-amber-300">
            {conflicts.length} live session{conflicts.length === 1 ? "" : "s"} flagged with schedule conflicts. Review them in the builder before going live.
          </section>
        ) : null}

        {liveSessionsQuery.isLoading ? (
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
            Loading the live calendar from the backend…
          </section>
        ) : liveSessionsQuery.isError ? (
          <section className="rounded-3xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-8 text-sm text-rose-700 dark:text-rose-300 shadow-sm">
            The live schedule could not be loaded right now.
          </section>
        ) : grouped.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
            No published or saved live sessions are available yet.
          </section>
        ) : (
          grouped.map((group) => (
            <section key={group.day} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{group.day}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{group.entries.length} session{group.entries.length === 1 ? "" : "s"}</p>
                </div>
              </div>

              <div className="space-y-3">
                {group.entries.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{session.title}</h3>
                          <Pill label={liveStatusLabel(session.status)} tone={statusTone(session.status)} />
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {session.seller || "Unassigned seller"} · {session.campaign || "Unassigned campaign"}
                        </div>
                        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          {formatDateTime(session.scheduledFor)} · {session.location || "Remote studio"}
                        </div>
                        {Array.isArray(session.simulcast) && session.simulcast.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {session.simulcast.map((platform) => (
                              <Pill key={platform} label={platform} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/live-builder?sessionId=${encodeURIComponent(session.id)}`)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          Edit timing
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/live-studio?sessionId=${encodeURIComponent(session.id)}`)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
                        >
                          <Video className="h-4 w-4" />
                          Open studio
                        </button>
                        {String(session.status).toLowerCase() === "ended" ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/post-live?sessionId=${encodeURIComponent(session.id)}`)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Post-live
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
