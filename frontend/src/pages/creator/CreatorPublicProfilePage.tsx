import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { usePublicCreatorProfileQuery } from "../../hooks/api/useWorkspace";

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:bg-slate-800 dark:text-slate-200">{children}</span>;
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{sub}</p> : null}
    </div>
  );
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CreatorPublicProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess } = useNotification();
  const [searchParams] = useSearchParams();
  const requestedHandle = searchParams.get("handle") || user?.creatorProfile?.handle || "ronald.creates";
  const profileQuery = usePublicCreatorProfileQuery(requestedHandle);
  const profile = profileQuery.data;

  const copyPublicLink = async () => {
    const url = `${window.location.origin}/profile-public?handle=${encodeURIComponent(requestedHandle)}`;
    await navigator.clipboard.writeText(url);
    showSuccess("Public profile link copied.");
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader
        pageTitle="Public Profile"
        mobileViewType="inline-right"
        rightContent={
          <button
            type="button"
            onClick={() => void copyPublicLink()}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Copy public link
          </button>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-6 sm:px-4 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f77f00]/10 text-2xl font-black text-[#f77f00]">
                {profile?.name?.split(" ").map((part) => part[0]).slice(0, 2).join("") || "MD"}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white">{profile?.name ?? "Loading profile…"}</h1>
                  {profile?.isKycVerified ? <Chip>KYC verified</Chip> : null}
                  <Chip>{profile?.tier ?? "Creator"}</Chip>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#f77f00]">@{profile?.handle ?? requestedHandle}</p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">{profile?.tagline ?? profile?.bio}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(profile?.categories ?? []).map((category) => (
                    <Chip key={category}>{category}</Chip>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/invites")}
                className="rounded-full bg-[#f77f00] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#dd7200]"
              >
                Open invites flow
              </button>
              <button
                type="button"
                onClick={() => navigate(`/creator-campaigns`)}
                className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                View creator campaigns
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Followers" value={Number(profile?.followers || 0).toLocaleString()} sub="Across connected channels" />
          <MetricCard label="Average live viewers" value={Number(profile?.avgViews || 0).toLocaleString()} sub="Typical creator session performance" />
          <MetricCard label="Sales driven" value={`$${Number(profile?.totalSalesDriven || 0).toLocaleString()}`} sub="Tracked collaboration outcome" />
          <MetricCard label="Rating" value={Number(profile?.rating || 0).toFixed(1)} sub={`${profile?.publicMetrics?.liveSessionsCompleted ?? 0} lives completed`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-6">
            <SectionShell title="About this creator">
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{profile?.bio}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Languages</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(profile?.languages ?? []).map((language) => <Chip key={language}>{language}</Chip>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Audience regions</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(profile?.regions ?? []).map((region) => <Chip key={region}>{region}</Chip>)}
                  </div>
                </div>
              </div>
            </SectionShell>

            <SectionShell title="Latest campaigns">
              <div className="space-y-3">
                {(profile?.latestCampaigns ?? []).map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => navigate("/creator-campaigns")}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{campaign.title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{campaign.seller}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{campaign.stage}</p>
                      <p className="mt-1 text-sm font-semibold text-[#f77f00]">${Number(campaign.value || 0).toLocaleString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            </SectionShell>

            <SectionShell title="Recent sessions and replays">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-3">
                  {(profile?.recentSessions ?? []).map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => navigate(session.route || "/live-dashboard-2")}
                      className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{session.title}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{session.seller}</p>
                      </div>
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {session.status}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {(profile?.recentReplays ?? []).map((replay) => (
                    <button
                      key={replay.id}
                      type="button"
                      onClick={() => navigate(replay.route || "/live-history")}
                      className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{replay.title}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{replay.views ?? 0} views · {replay.sales ?? 0} sales</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                        {replay.published ? "Published" : "Draft"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </SectionShell>
          </div>

          <div className="grid gap-6">
            <SectionShell title="Social footprint">
              <div className="space-y-3">
                {(profile?.socials ?? []).map((social) => (
                  <div key={social.id} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{social.label}</p>
                    <p className="text-sm font-semibold text-[#f77f00]">{social.followers.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </SectionShell>

            <SectionShell title="Reviews and trust signals">
              <div className="space-y-3">
                {(profile?.reviews ?? []).map((review) => (
                  <div key={review.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{review.dimension}</p>
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                        {review.score.toFixed(1)} / 5
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{review.note}</p>
                  </div>
                ))}
              </div>
            </SectionShell>
          </div>
        </section>
      </main>
    </div>
  );
}

export { CreatorPublicProfilePage };
