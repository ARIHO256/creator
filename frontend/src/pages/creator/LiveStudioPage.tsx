import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, CalendarDays, CheckCircle2, Mic, MonitorUp, Plus, Radio, Search, Tv2, Video, Volume2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useApiCache } from "../../api/cache";
import { queryKeys } from "../../api/queryKeys";
import { useNotification } from "../../contexts/NotificationContext";
import { useCampaignsQuery } from "../../hooks/api/useCampaigns";
import {
  useAddLiveMomentMutation,
  useEndLiveSessionMutation,
  useLiveSessionsQuery,
  useLiveStudioDefaultQuery,
  useLiveStudioQuery,
  useStartLiveSessionMutation
} from "../../hooks/api/useLiveRuntime";
import { formatDateTime, getLivePlatforms, liveStatusLabel, statusTone } from "../../utils/runtimeData";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/**
 * Live Studio (Backend-driven)
 * ---------------------------
 * - Normal routed flow uses sessionId via: /live-studio?sessionId=...
 * - If opened without a sessionId, the page shows a backend-driven launchpad where the
 *   creator can pick the exact scheduled session (optionally scoped by campaign).
 * - A "Continue with next session" helper uses GET /api/live/studio/default.
 * - No legacy local / demo fallback is used.
 */

type StudioScene = { id: string; label: string };
type StudioProduct = { id: string; name: string; price?: string; stock?: string; tag?: string };
type StudioChat = { id: number | string; from: string; body: string; time?: string; system?: boolean };
type StudioMoment = { id: number | string; time: string; label: string };
type StudioCoHost = { id: number | string; name: string; status?: string };

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray<T extends object>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter((item): item is T => Boolean(item) && typeof item === "object")
    : [];
}

function Switch({ value, onChange, icon }: { value: boolean; onChange: (next: boolean) => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
          : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      )}
    >
      {icon}
      {value ? "On" : "Off"}
    </button>
  );
}

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

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SummaryTile({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div>
    </div>
  );
}

function parseQuerySessionId(search: string): string | undefined {
  const value = new URLSearchParams(search).get("sessionId") || undefined;
  return value?.trim() || undefined;
}

function parseQueryCampaignId(search: string): string | undefined {
  const value = new URLSearchParams(search).get("campaignId") || undefined;
  return value?.trim() || undefined;
}

function formatRuntimeTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours > 0 ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function currentMomentStamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-GB", { hour12: false });
}

type StudioStatusFilter = "upcoming" | "draft" | "ended" | "all";

function normalizeStatus(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function matchesText(value: string, q: string) {
  if (!q) return true;
  return value.toLowerCase().includes(q);
}

function isUpcomingStatus(status: string) {
  return status === "live" || status === "scheduled" || status === "ready";
}

function sortByScheduledForAsc(a: any, b: any) {
  const aTime = a?.scheduledFor ? new Date(String(a.scheduledFor)).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b?.scheduledFor ? new Date(String(b.scheduledFor)).getTime() : Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;
  return String(a?.title || "").localeCompare(String(b?.title || ""));
}

function LiveStudioPage({ onChangePage }: { onChangePage?: (page: "live-schedule" | "home") => void }): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const cache = useApiCache();
  const { showNotification, showSuccess, showError } = useNotification();
  const sessionId = useMemo(() => parseQuerySessionId(location.search), [location.search]);
  const campaignIdFromQuery = useMemo(() => parseQueryCampaignId(location.search), [location.search]);
  const liveStudioQuery = useLiveStudioQuery(sessionId, { enabled: Boolean(sessionId), staleTime: 2_000 });
  const startLiveMutation = useStartLiveSessionMutation();
  const endLiveMutation = useEndLiveSessionMutation();
  const addMomentMutation = useAddLiveMomentMutation();

  // Launchpad data (only when no sessionId)
  const [campaignFilter, setCampaignFilter] = useState<string>(() => campaignIdFromQuery || "all");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StudioStatusFilter>("upcoming");
  const campaignsQuery = useCampaignsQuery({ pageSize: 100 }, { enabled: !sessionId, staleTime: 60_000 });
  const sessionsQuery = useLiveSessionsQuery({ pageSize: 100 }, { enabled: !sessionId, staleTime: 10_000 });
  const liveStudioDefaultQuery = useLiveStudioDefaultQuery({ enabled: false, staleTime: 2_000 });

  useEffect(() => {
    if (sessionId) return;
    if (!campaignIdFromQuery) return;
    setCampaignFilter(campaignIdFromQuery);
  }, [campaignIdFromQuery, sessionId]);

  const normalizedSearch = search.trim().toLowerCase();

  const sessions = useMemo(() => {
    const items = sessionsQuery.data?.items ?? [];
    const filtered = items
      .filter((entry) => {
        const status = normalizeStatus(entry.status);
        if (statusFilter === "upcoming") return isUpcomingStatus(status);
        if (statusFilter === "draft") return status === "draft";
        if (statusFilter === "ended") return status === "ended";
        return true;
      })
      .filter((entry) => {
        if (campaignFilter === "all") return true;
        if (campaignFilter === "unassigned") return !entry.campaignId;
        return String(entry.campaignId || "") === campaignFilter;
      })
      .filter((entry) => {
        if (!normalizedSearch) return true;
        const haystack = [entry.title, entry.seller, entry.campaign, ...(getLivePlatforms(entry) || [])]
          .filter(Boolean)
          .join(" ");
        return matchesText(haystack, normalizedSearch);
      })
      .sort(sortByScheduledForAsc);

    return filtered;
  }, [campaignFilter, normalizedSearch, sessionsQuery.data?.items, statusFilter]);

  const campaigns = useMemo(() => {
    const items = campaignsQuery.data?.items ?? [];
    const allSessions = sessionsQuery.data?.items ?? [];

    const enriched = items.map((campaign) => {
      const related = allSessions.filter((session) => String(session.campaignId || "") === String(campaign.id));
      const upcoming = related.filter((session) => isUpcomingStatus(normalizeStatus(session.status)));
      const nextSession = [...upcoming].sort(sortByScheduledForAsc)[0] || null;
      return {
        ...campaign,
        upcomingCount: upcoming.length,
        nextSession
      };
    });

    const filtered = enriched.filter((campaign) => {
      if (!normalizedSearch) return true;
      const haystack = [campaign.title, campaign.seller, campaign.type, campaign.stage].filter(Boolean).join(" ");
      return matchesText(haystack, normalizedSearch);
    });

    filtered.sort((a, b) => {
      const aTime = a.nextSession?.scheduledFor ? new Date(String(a.nextSession.scheduledFor)).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.nextSession?.scheduledFor ? new Date(String(b.nextSession.scheduledFor)).getTime() : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

    return filtered;
  }, [campaignsQuery.data?.items, normalizedSearch, sessionsQuery.data?.items]);

  const handleContinueWithRecommended = async () => {
    try {
      const workspace = await liveStudioDefaultQuery.refetch();
      const resolvedId = workspace?.session?.id;
      if (!resolvedId) {
        showError("No live session could be resolved.");
        return;
      }
      cache.setData(queryKeys.live.studio(resolvedId), workspace);
      navigate(`/live-studio?sessionId=${encodeURIComponent(resolvedId)}`);
    } catch {
      showError("Could not resolve a default live session.");
    }
  };

  const session = liveStudioQuery.data?.session;
  const studio = asObject(session?.studio);
  const platforms = getLivePlatforms(session);
  const scenes = asArray<StudioScene>(studio.scenes);
  const products = asArray<StudioProduct>(studio.products);
  const chat = asArray<StudioChat>(studio.chat);
  const moments = asArray<StudioMoment>(studio.momentMarkers);
  const coHosts = asArray<StudioCoHost>(studio.coHosts);
  const commerceGoal = asObject(studio.commerceGoal);
  const soldUnits = Number(commerceGoal.soldUnits || 0);
  const targetUnits = Number(commerceGoal.targetUnits || 0);
  const cartCount = Number(commerceGoal.cartCount || 0);
  const last5MinSales = Number(commerceGoal.last5MinSales || 0);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState("");
  const [momentLabel, setMomentLabel] = useState("");
  const [runtimeSeconds, setRuntimeSeconds] = useState(0);

  const statusLabel = liveStatusLabel(session?.status);
  const isLive = String(session?.status || "").toLowerCase() === "live";
  const isEnded = String(session?.status || "").toLowerCase() === "ended";

  useEffect(() => {
    setMicOn(Boolean(studio.micOn ?? true));
    setCamOn(Boolean(studio.camOn ?? true));
    setScreenShareOn(Boolean(studio.screenShareOn ?? false));
    setActiveSceneId(String(studio.activeSceneId || scenes[0]?.id || ""));
  }, [studio.activeSceneId, studio.camOn, studio.micOn, studio.screenShareOn, scenes]);

  useEffect(() => {
    if (!isLive) {
      setRuntimeSeconds(0);
      return;
    }
    const timer = window.setInterval(() => setRuntimeSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isLive]);

  const handleExit = () => {
    if (onChangePage) {
      onChangePage("live-schedule");
      return;
    }
    navigate("/live-schedule");
  };

  const handleStartLive = async () => {
    if (!sessionId) return;
    try {
      await startLiveMutation.mutateAsync({ sessionId });
      showSuccess("Live session started.");
    } catch {
      showError("Could not start this live session.");
    }
  };

  const handleEndLive = async () => {
    if (!sessionId) return;
    try {
      const result = await endLiveMutation.mutateAsync({ sessionId });
      showSuccess("Live session ended. Replay draft created.");
      navigate(`/post-live?sessionId=${encodeURIComponent(result.session.id)}`);
    } catch {
      showError("Could not end this live session.");
    }
  };

  const handleAddMoment = async () => {
    if (!sessionId || !momentLabel.trim()) return;
    try {
      await addMomentMutation.mutateAsync({
        sessionId,
        payload: {
          label: momentLabel.trim(),
          time: currentMomentStamp()
        }
      });
      setMomentLabel("");
      showNotification("Moment marker added.");
    } catch {
      showError("Could not add that moment marker.");
    }
  };

  if (!sessionId) {
    const allSessions = sessionsQuery.data?.items ?? [];
    const counts = {
      upcoming: allSessions.filter((entry) => isUpcomingStatus(normalizeStatus(entry.status))).length,
      draft: allSessions.filter((entry) => normalizeStatus(entry.status) === "draft").length,
      ended: allSessions.filter((entry) => normalizeStatus(entry.status) === "ended").length
    };

    return (
      <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
        <PageHeader
          pageTitle="Live Studio"
          badge={
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Select a scheduled session to enter studio controls
            </span>
          }
          rightContent={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/live-dashboard-2")}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                View dashboard
              </button>
              <button
                type="button"
                onClick={() => navigate("/live-builder")}
                className="rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
              >
                New live session
              </button>
            </div>
          }
        />

        <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryTile title="Upcoming" value={String(counts.upcoming)} hint="Live + scheduled + ready" />
            <SummaryTile title="Drafts" value={String(counts.draft)} hint="Not yet scheduled" />
            <SummaryTile title="Ended" value={String(counts.ended)} hint="Ready for post-live" />
          </section>

          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sessions or campaigns"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {([
                  { id: "upcoming", label: `Upcoming (${counts.upcoming})` },
                  { id: "draft", label: `Drafts (${counts.draft})` },
                  { id: "ended", label: `Ended (${counts.ended})` },
                  { id: "all", label: "All" }
                ] as Array<{ id: StudioStatusFilter; label: string }>).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStatusFilter(option.id)}
                    className={cx(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      statusFilter === option.id
                        ? "border-[#f77f00] bg-[#fff4e5] text-[#c26100] dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Campaign</span>
                <select
                  value={campaignFilter}
                  onChange={(event) => setCampaignFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="all">All campaigns</option>
                  <option value="unassigned">Unassigned</option>
                  {(campaignsQuery.data?.items ?? []).map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title} — {campaign.seller}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void handleContinueWithRecommended()}
                disabled={liveStudioDefaultQuery.isFetching}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-white shadow-sm transition",
                  liveStudioDefaultQuery.isFetching ? "bg-slate-400 cursor-not-allowed" : "bg-[#f77f00] hover:brightness-95"
                )}
              >
                <CalendarDays className="h-4 w-4" />
                {liveStudioDefaultQuery.isFetching ? "Resolving…" : "Continue with next session"}
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#f77f00]">Campaigns</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pick a campaign to narrow the scheduled sessions list.</div>
              </div>

              {campaignsQuery.isLoading ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
                  Loading campaigns…
                </div>
              ) : campaignsQuery.isError ? (
                <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-950 p-4 text-sm text-rose-700 dark:text-rose-300">
                  Campaigns could not be loaded.
                </div>
              ) : campaigns.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
                  No campaigns yet. You can still select a session directly.
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      type="button"
                      onClick={() => setCampaignFilter(campaign.id)}
                      className={cx(
                        "w-full rounded-3xl border p-4 text-left transition-colors",
                        campaignFilter === campaign.id
                          ? "border-[#f77f00] bg-[#fff4e5] dark:border-amber-700 dark:bg-amber-900/20"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{campaign.title}</div>
                          <div className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">{campaign.seller}</div>
                        </div>
                        <Pill label={`${campaign.upcomingCount} upcoming`} tone={campaign.upcomingCount > 0 ? "good" : "neutral"} />
                      </div>
                      {campaign.nextSession ? (
                        <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-950/40 p-3 text-xs text-slate-600 dark:text-slate-300">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Next: {campaign.nextSession.title}</div>
                          <div className="mt-1">{formatDateTime(campaign.nextSession.scheduledFor)}</div>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">No upcoming sessions in this campaign yet.</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#f77f00]">Live sessions</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Select the exact session you want to open in Live Studio.</div>
              </div>

              {sessionsQuery.isLoading ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
                  Loading live sessions…
                </div>
              ) : sessionsQuery.isError ? (
                <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-950 p-4 text-sm text-rose-700 dark:text-rose-300">
                  Live sessions could not be loaded.
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 text-sm text-slate-500 dark:text-slate-400">
                  No sessions match the current filters.
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => navigate("/live-builder")}
                      className="rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
                    >
                      Create a new live session
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{entry.title}</div>
                          <Pill label={liveStatusLabel(entry.status)} tone={statusTone(entry.status)} />
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {entry.seller || "Unassigned seller"} · {entry.campaign || "Unassigned campaign"}
                        </div>
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(entry.scheduledFor)}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/live-builder?sessionId=${encodeURIComponent(entry.id)}`)}
                          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Open builder
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/live-studio?sessionId=${encodeURIComponent(entry.id)}`)}
                          className="rounded-2xl bg-[#f77f00] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-95"
                        >
                          Open studio
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Live Studio"
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Pill label={statusLabel} tone={statusTone(session?.status)} />
            <Pill label={runtimeSeconds > 0 ? `Runtime ${formatRuntimeTime(runtimeSeconds)}` : "Waiting"} />
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/live-studio")}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Change session
            </button>
            <button
              type="button"
              onClick={() => navigate(`/live-builder?sessionId=${encodeURIComponent(sessionId)}`)}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Open builder
            </button>
            {isLive ? (
              <button
                type="button"
                onClick={() => void handleEndLive()}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
              >
                End live
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleStartLive()}
                className="rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
              >
                Go live
              </button>
            )}
          </div>
        }
      />

      <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {liveStudioQuery.isLoading ? (
          <SectionCard title="Loading live studio" subtitle="Fetching the published studio payload from the backend.">
            <div className="text-sm text-slate-500 dark:text-slate-400">Preparing the studio workspace…</div>
          </SectionCard>
        ) : liveStudioQuery.isError || !session ? (
          <SectionCard title="Studio unavailable" subtitle="The live session could not be loaded.">
            <div className="text-sm text-rose-700 dark:text-rose-300">Please return to the dashboard and reopen the studio.</div>
          </SectionCard>
        ) : (
          <>
            <SectionCard title={session.title} subtitle={`${session.seller || "Unassigned seller"} · ${session.campaign || "Unassigned campaign"}`}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-5 transition-colors">
                  <div className="flex h-full min-h-[320px] flex-col justify-between rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Main program output</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Scene: {activeSceneId || "Not selected"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch value={micOn} onChange={setMicOn} icon={<Mic className="h-3.5 w-3.5" />} />
                        <Switch value={camOn} onChange={setCamOn} icon={<Video className="h-3.5 w-3.5" />} />
                        <Switch value={screenShareOn} onChange={setScreenShareOn} icon={<MonitorUp className="h-3.5 w-3.5" />} />
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-900 px-5 py-8 text-slate-100 shadow-inner">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-bold">{session.title}</div>
                          <div className="mt-1 text-sm text-slate-300">{formatDateTime(session.scheduledFor)}</div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Radio className="h-4 w-4 text-rose-400" />
                          {isLive ? "Broadcasting" : isEnded ? "Ended" : "Standby"}
                        </div>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <RuntimeMetric label="Viewers" value={String(Number(studio.viewerCount || 0) || 0)} />
                        <RuntimeMetric label="Sold" value={String(soldUnits)} />
                        <RuntimeMetric label="Carts" value={String(cartCount)} />
                        <RuntimeMetric label="Last 5 min" value={String(last5MinSales)} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <SectionCard title="Published payload" subtitle="Hydrated directly from the saved builder output.">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoRow label="Schedule" value={formatDateTime(session.scheduledFor)} />
                      <InfoRow label="Location" value={session.location || "Remote studio"} />
                      <InfoRow label="Role" value={session.role || "Host"} />
                      <InfoRow label="Duration" value={`${session.durationMin ?? 0} min`} />
                      <InfoRow label="Products" value={`${session.productsCount ?? products.length}`} />
                      <InfoRow label="Platforms" value={platforms.length ? platforms.join(", ") : "No simulcast set"} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {platforms.map((platform) => (
                        <Pill key={platform} label={platform} />
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title="Run state" subtitle="Current studio health and automation flags.">
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <StateRow icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Scripts" value={session.scriptsReady ? "Ready" : "Pending"} />
                      <StateRow icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Assets" value={session.assetsReady ? "Ready" : "Pending"} />
                      <StateRow icon={<Volume2 className="h-4 w-4 text-slate-500" />} label="Audio" value={micOn ? "Mic live" : "Muted"} />
                      <StateRow icon={<Tv2 className="h-4 w-4 text-slate-500" />} label="Camera" value={camOn ? "Camera live" : "Camera off"} />
                      <StateRow icon={<AlertCircle className="h-4 w-4 text-slate-500" />} label="Goal" value={`${soldUnits}/${targetUnits} sold target`} />
                    </div>
                  </SectionCard>
                </div>
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr_1fr]">
              <SectionCard title="Scenes" subtitle="Current scene routing from the studio payload.">
                <div className="space-y-2">
                  {scenes.length ? scenes.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => setActiveSceneId(scene.id)}
                      className={cx(
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
                        activeSceneId === scene.id
                          ? "border-[#f77f00] bg-[#fff4e5] text-[#c26100] dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                      )}
                    >
                      <span>{scene.label}</span>
                      {activeSceneId === scene.id ? <Pill label="Active" tone="good" /> : null}
                    </button>
                  )) : <div className="text-sm text-slate-500 dark:text-slate-400">No scenes were stored for this session.</div>}
                </div>
              </SectionCard>

              <SectionCard title="Products" subtitle="Featured items brought over from the builder draft.">
                <div className="space-y-3">
                  {products.length ? products.map((product) => (
                    <div key={product.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {[product.price, product.stock, product.tag].filter(Boolean).join(" · ") || "No commerce metadata attached"}
                      </div>
                    </div>
                  )) : <div className="text-sm text-slate-500 dark:text-slate-400">No featured products were persisted for this session.</div>}
                </div>
              </SectionCard>

              <SectionCard title="Moment markers" subtitle="Saved to the backend during runtime.">
                <div className="flex gap-2">
                  <input
                    value={momentLabel}
                    onChange={(event) => setMomentLabel(event.target.value)}
                    placeholder="Add a highlight marker"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddMoment()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {moments.length ? moments.map((moment) => (
                    <div key={String(moment.id)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm transition-colors">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{moment.label}</div>
                      <div className="mt-1 text-slate-500 dark:text-slate-400">{moment.time}</div>
                    </div>
                  )) : <div className="text-sm text-slate-500 dark:text-slate-400">No moment markers saved yet.</div>}
                </div>
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,1fr)]">
              <SectionCard title="Live chat feed" subtitle="Hydrated from the current studio payload.">
                <div className="space-y-3">
                  {chat.length ? chat.map((message) => (
                    <div key={String(message.id)} className={cx(
                      "rounded-2xl border p-3 text-sm transition-colors",
                      message.system
                        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-300"
                        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    )}>
                      <div className="font-semibold">{message.from}</div>
                      <div className="mt-1">{message.body}</div>
                      {message.time ? <div className="mt-1 text-xs opacity-70">{message.time}</div> : null}
                    </div>
                  )) : <div className="text-sm text-slate-500 dark:text-slate-400">No chat events have been stored yet.</div>}
                </div>
              </SectionCard>

              <SectionCard title="Crew & handoff" subtitle="Support surfaces for the active runtime session.">
                <div className="space-y-3">
                  {coHosts.length ? coHosts.map((coHost) => (
                    <div key={String(coHost.id)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm transition-colors">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{coHost.name}</div>
                      <div className="mt-1 text-slate-500 dark:text-slate-400">{coHost.status || "Standby"}</div>
                    </div>
                  )) : <div className="text-sm text-slate-500 dark:text-slate-400">No co-host data was stored for this session.</div>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExit}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Back to schedule
                  </button>
                  {isEnded ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/post-live?sessionId=${encodeURIComponent(session.id)}`)}
                      className="rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
                    >
                      Open post-live
                    </button>
                  ) : null}
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function RuntimeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-50">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function StateRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 transition-colors">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
      </div>
      <span className="text-sm text-slate-500 dark:text-slate-400">{value}</span>
    </div>
  );
}

export { LiveStudioPage };

export function TipCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
      <div className="text-xl">{icon}</div>
      <div className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{title}</div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</div>
    </div>
  );
}
