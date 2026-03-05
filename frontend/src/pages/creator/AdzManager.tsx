import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, ExternalLink, PauseCircle, PlayCircle, Search, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useNotification } from "../../contexts/NotificationContext";
import { useAdzCampaignQuery, useAdzCampaignsQuery, useAdzPerformanceQuery, useUpdateAdzCampaignMutation } from "../../hooks/api/useAdzRuntime";
import { adStatusLabel, formatCurrency, formatDateTime, getCampaignCurrency, getCampaignOffers, getCampaignPerformance, statusTone } from "../../utils/runtimeData";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

function parseAdId(search: string): string | undefined {
  const value = new URLSearchParams(search).get("adId") || undefined;
  return value?.trim() || undefined;
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

function ActionButton({
  onClick,
  icon,
  children,
  tone = "default",
  disabled = false
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
}) {
  const className =
    tone === "primary"
      ? "bg-[#f77f00] text-white hover:brightness-95"
      : tone === "danger"
        ? "bg-rose-600 text-white hover:brightness-95"
        : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx("inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60", className)}
    >
      {icon}
      {children}
    </button>
  );
}

export default function AdzManager(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useNotification();
  const initialAdId = useMemo(() => parseAdId(location.search), [location.search]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(initialAdId);

  const campaignsQuery = useAdzCampaignsQuery();
  const campaignQuery = useAdzCampaignQuery(selectedCampaignId, { enabled: Boolean(selectedCampaignId) });
  const performanceQuery = useAdzPerformanceQuery(selectedCampaignId, { enabled: Boolean(selectedCampaignId) });
  const updateCampaignMutation = useUpdateAdzCampaignMutation();

  const campaigns = campaignsQuery.data?.items ?? [];

  useEffect(() => {
    if (selectedCampaignId) return;
    if (!campaigns.length) return;
    setSelectedCampaignId(initialAdId || campaigns[0]?.id);
  }, [campaigns, initialAdId, selectedCampaignId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const matchesStatus = statusFilter === "all" || String(campaign.status).toLowerCase() === statusFilter;
      const haystack = [campaign.campaignName, campaign.campaignSubtitle, campaign.supplier?.name, ...(campaign.platforms || [])].join(" ").toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [campaigns, query, statusFilter]);

  const selectedCampaign = campaignQuery.data || campaigns.find((campaign) => campaign.id === selectedCampaignId);
  const performance = getCampaignPerformance(selectedCampaign);
  const performanceDetail = performanceQuery.data || performance;
  const currency = getCampaignCurrency(selectedCampaign);
  const offers = getCampaignOffers(selectedCampaign);

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    navigate(`/AdzManager?adId=${encodeURIComponent(campaignId)}`, { replace: true });
  };

  const patchStatus = async (status: string) => {
    if (!selectedCampaignId) return;
    try {
      await updateCampaignMutation.mutateAsync({
        campaignId: selectedCampaignId,
        payload: { status }
      });
      showSuccess(`Campaign moved to ${adStatusLabel(status)}.`);
    } catch {
      showError("Campaign status could not be updated.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Adz Manager"
        badge={
          selectedCampaign ? (
            <div className="flex flex-wrap items-center gap-2">
              <Pill label={adStatusLabel(selectedCampaign.status)} tone={statusTone(selectedCampaign.status)} />
              <Pill label={`${performance.clicks.toLocaleString()} clicks`} />
            </div>
          ) : undefined
        }
        rightContent={
          <div className="flex items-center gap-2">
            <ActionButton onClick={() => navigate("/ad-builder") } icon={<Sparkles className="h-4 w-4" />} tone="primary">
              New campaign
            </ActionButton>
          </div>
        }
      />

      <main className="grid grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
        <SectionCard title="Published campaigns" subtitle="Select a campaign to control its live execution and reporting state.">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search campaigns"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { value: "all", label: "All" },
              { value: "pending_approval", label: "Pending" },
              { value: "scheduled", label: "Scheduled" },
              { value: "live", label: "Live" },
              { value: "paused", label: "Paused" },
              { value: "completed", label: "Completed" }
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

          <div className="mt-4 space-y-3">
            {campaignsQuery.isLoading ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
                Loading campaign execution rows…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
                No campaigns match the current filters.
              </div>
            ) : (
              filtered.map((campaign) => {
                const campaignPerformance = getCampaignPerformance(campaign);
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => handleSelectCampaign(campaign.id)}
                    className={cx(
                      "w-full rounded-2xl border p-4 text-left transition-colors",
                      selectedCampaignId === campaign.id
                        ? "border-[#f77f00] bg-[#fff4e5] dark:border-amber-700 dark:bg-amber-900/10"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{campaign.campaignName}</div>
                      <Pill label={adStatusLabel(campaign.status)} tone={statusTone(campaign.status)} />
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{campaign.supplier?.name || "Unassigned seller"}</div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {campaignPerformance.clicks.toLocaleString()} clicks · {campaignPerformance.purchases.toLocaleString()} purchases · {formatCurrency(getCampaignCurrency(campaign), campaignPerformance.earnings)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SectionCard>

        <div className="space-y-6">
          {!selectedCampaign ? (
            <SectionCard title="No campaign selected" subtitle="Choose a published campaign from the left rail.">
              <div className="text-sm text-slate-500 dark:text-slate-400">The selected campaign runtime state will appear here.</div>
            </SectionCard>
          ) : campaignQuery.isLoading ? (
            <SectionCard title="Loading campaign runtime" subtitle="Fetching the selected campaign from the API.">
              <div className="text-sm text-slate-500 dark:text-slate-400">Preparing execution controls…</div>
            </SectionCard>
          ) : (
            <>
              <SectionCard title={selectedCampaign.campaignName} subtitle={`${selectedCampaign.supplier?.name || "Unassigned seller"} · ${selectedCampaign.campaignSubtitle || "Published ad payload"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill label={adStatusLabel(selectedCampaign.status)} tone={statusTone(selectedCampaign.status)} />
                  {(selectedCampaign.platforms || []).map((platform) => <Pill key={platform} label={platform} />)}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <MetricTile label="Start" value={formatDateTime(selectedCampaign.startISO)} />
                  <MetricTile label="End" value={formatDateTime(selectedCampaign.endISO)} />
                  <MetricTile label="Clicks" value={performanceDetail.clicks.toLocaleString()} />
                  <MetricTile label="Earnings" value={formatCurrency(currency, performanceDetail.earnings)} />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <ActionButton onClick={() => patchStatus("live")} icon={<PlayCircle className="h-4 w-4" />} tone="primary" disabled={updateCampaignMutation.isPending}>
                    Set live
                  </ActionButton>
                  <ActionButton onClick={() => patchStatus("paused")} icon={<PauseCircle className="h-4 w-4" />} disabled={updateCampaignMutation.isPending}>
                    Pause
                  </ActionButton>
                  <ActionButton onClick={() => patchStatus("scheduled")} icon={<PlayCircle className="h-4 w-4" />} disabled={updateCampaignMutation.isPending}>
                    Reschedule
                  </ActionButton>
                  <ActionButton onClick={() => patchStatus("completed")} icon={<BarChart3 className="h-4 w-4" />} disabled={updateCampaignMutation.isPending}>
                    Mark completed
                  </ActionButton>
                  <ActionButton onClick={() => navigate(`/ad-builder?adId=${encodeURIComponent(selectedCampaign.id)}`)} icon={<Wand2 className="h-4 w-4" />}>
                    Open builder
                  </ActionButton>
                  <ActionButton onClick={() => navigate(`/promo-ad-detail?promoId=${encodeURIComponent(selectedCampaign.id)}`)} icon={<ExternalLink className="h-4 w-4" />}>
                    Promo detail
                  </ActionButton>
                </div>
              </SectionCard>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_400px]">
                <SectionCard title="Performance reporting" subtitle="Directly from the campaign performance endpoint.">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <MetricTile label="Purchases" value={performanceDetail.purchases.toLocaleString()} />
                    <MetricTile label="Conversion" value={`${performanceDetail.conversionPct.toFixed(1)}%`} />
                    <MetricTile label="Earnings" value={formatCurrency(currency, performanceDetail.earnings)} />
                    <MetricTile label="Period" value={String(performanceDetail.period || "7d")} />
                  </div>

                  <div className="mt-5 space-y-3">
                    {(performanceDetail.byPlatform || []).length ? (
                      performanceDetail.byPlatform?.map((platform) => (
                        <div key={platform.platform} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{platform.platform}</div>
                              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{platform.clicks.toLocaleString()} clicks</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{platform.purchases.toLocaleString()} purchases</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
                        No platform breakdown is available for this campaign yet.
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Offers in this campaign" subtitle="Hydrated from the published ad builder payload.">
                  <div className="space-y-3">
                    {offers.length ? offers.map((offer, index) => (
                      <div key={String(offer.id || index)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{String(offer.name || `Offer ${index + 1}`)}</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {[offer.type, offer.currency && offer.price !== undefined ? `${offer.currency} ${offer.price}` : null, offer.stockLeft !== undefined ? `${offer.stockLeft} left` : null]
                            .filter(Boolean)
                            .join(" · ") || "Published builder offer"}
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
                        No offers were attached to this campaign.
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
