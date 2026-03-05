import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { PitchDrawer } from "../../components/PitchDrawer";
import type { OpportunityRecord } from "../../api/types";
import { useNotification } from "../../contexts/NotificationContext";
import { useCreateProposalMutation } from "../../hooks/api/useProposals";
import { useToggleSellerFollowMutation } from "../../hooks/api/useSellers";
import { useOpportunitiesQuery, useToggleOpportunitySavedMutation } from "../../hooks/api/useDiscoveryMarketplaces";

const COMMISSION_OPTIONS = ["Any", "0-5", "5-10", "10+"] as const;
const RATING_OPTIONS = ["Any", "4", "4.5"] as const;

type OpportunitiesBoardPageProps = {
  onChangePage?: (page: string) => void;
};

type OpportunitiesLocationState = {
  supplierName?: string;
  onlyCurrent?: boolean;
  source?: string;
};

function formatMoneyRange(min: number, max: number) {
  const safeMin = Number(min || 0);
  const safeMax = Number(max || 0);
  if (safeMin && safeMax) return `$${safeMin.toLocaleString()} - $${safeMax.toLocaleString()}`;
  if (safeMax) return `$${safeMax.toLocaleString()}`;
  if (safeMin) return `$${safeMin.toLocaleString()}`;
  return "TBD";
}

function stageTone(status: string | undefined) {
  const value = String(status || "open").toLowerCase();
  if (value.includes("invite")) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20";
  if (value.includes("closed")) return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/20";
  return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/20";
}

function scoreTone(score: number) {
  if (score >= 4.7) return "text-emerald-600 dark:text-emerald-300";
  if (score >= 4.4) return "text-amber-600 dark:text-amber-300";
  return "text-slate-500 dark:text-slate-300";
}

function buildPitchOfferType(opportunity: OpportunityRecord) {
  const deliverables = Array.isArray(opportunity.deliverables) ? opportunity.deliverables.filter(Boolean) : [];
  if (deliverables.length) return deliverables.join(" + ");
  return opportunity.supplierType || "Creator pitch";
}

function humanizeRelationship(value: string | undefined) {
  const raw = String(value || "");
  return raw || "Not linked yet";
}

function OpportunitiesBoardPage({ onChangePage: _onChangePage }: OpportunitiesBoardPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useNotification();
  const locationState = (location.state ?? {}) as OpportunitiesLocationState;
  const scopedSupplierName = typeof locationState.supplierName === "string" ? locationState.supplierName : "";
  const currentOnly = locationState.onlyCurrent !== false;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [region, setRegion] = useState("All");
  const [language, setLanguage] = useState("Any");
  const [commission, setCommission] = useState<(typeof COMMISSION_OPTIONS)[number]>("Any");
  const [minRating, setMinRating] = useState<(typeof RATING_OPTIONS)[number]>("Any");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityRecord | null>(null);
  const [pitchOpportunity, setPitchOpportunity] = useState<OpportunityRecord | null>(null);

  const opportunitiesQuery = useOpportunitiesQuery({
    q: search || undefined,
    category: category !== "All" ? category : undefined,
    region: region !== "All" ? region : undefined,
    language: language !== "Any" ? language : undefined,
    commission: commission !== "Any" ? commission : undefined,
    minRating: minRating !== "Any" ? minRating : undefined,
    minBudget: minBudget || undefined,
    maxBudget: maxBudget || undefined,
    currentOnly
  });
  const createProposalMutation = useCreateProposalMutation();
  const toggleFollowMutation = useToggleSellerFollowMutation();
  const toggleSavedMutation = useToggleOpportunitySavedMutation();

  const allItems = opportunitiesQuery.data?.items ?? [];
  const opportunities = useMemo(() => {
    if (!scopedSupplierName) return allItems;
    return allItems.filter((item) => item.seller === scopedSupplierName);
  }, [allItems, scopedSupplierName]);

  const categoryOptions = useMemo(
    () => ["All", ...new Set(opportunities.map((item) => item.category).filter(Boolean))],
    [opportunities]
  );
  const regionOptions = useMemo(
    () => ["All", ...new Set(opportunities.map((item) => item.region).filter(Boolean))],
    [opportunities]
  );
  const languageOptions = useMemo(
    () => ["Any", ...new Set(opportunities.map((item) => item.language).filter(Boolean))],
    [opportunities]
  );

  const totals = useMemo(() => {
    return opportunities.reduce(
      (acc, item) => {
        acc.value += Number(item.budgetMax || 0);
        if (item.isSaved) acc.saved += 1;
        if (item.latestProposalId) acc.pitched += 1;
        return acc;
      },
      { count: opportunities.length, value: 0, saved: 0, pitched: 0 }
    );
  }, [opportunities]);

  const handleToggleFollow = async (item: OpportunityRecord) => {
    try {
      await toggleFollowMutation.mutateAsync({ sellerId: item.sellerId, follow: !item.isFollowing });
      showSuccess(item.isFollowing ? `Unfollowed ${item.seller}` : `Following ${item.seller}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update follow status.");
    }
  };

  const handleToggleSaved = async (item: OpportunityRecord) => {
    try {
      await toggleSavedMutation.mutateAsync({ opportunityId: item.id, saved: !item.isSaved });
      showSuccess(item.isSaved ? "Opportunity removed from saved list." : "Opportunity saved.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update saved state.");
    }
  };

  const handleSubmitPitch = async (payload: { collaborationModel: "Flat fee" | "Commission" | "Hybrid"; message: string }) => {
    if (!pitchOpportunity) return;

    try {
      const proposal = await createProposalMutation.mutateAsync({
        sellerId: pitchOpportunity.sellerId,
        campaign: pitchOpportunity.title,
        offerType: buildPitchOfferType(pitchOpportunity),
        category: pitchOpportunity.category,
        region: pitchOpportunity.region,
        baseFeeMin: Number(pitchOpportunity.budgetMin || 0),
        baseFeeMax: Number(pitchOpportunity.budgetMax || 0),
        currency: "USD",
        commissionPct: Number(pitchOpportunity.commission || 0),
        estimatedValue: Number(pitchOpportunity.budgetMax || pitchOpportunity.budgetMin || 0),
        origin: "creator",
        notesShort: payload.message,
        deliverables: pitchOpportunity.deliverables.join(", "),
        compensation: `${payload.collaborationModel} · ${pitchOpportunity.payBand}`,
        schedule: pitchOpportunity.liveWindow,
        exclusivityWindow: "To be agreed",
        killFee: "To be agreed"
      });
      showSuccess("Pitch created. Opening proposal room.");
      setPitchOpportunity(null);
      navigate(`/proposal-room?proposalId=${encodeURIComponent(proposal.id)}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not create this pitch.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader
        pageTitle="Opportunities"
        mobileViewType="hide"
        badge={
          scopedSupplierName ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Scoped to {scopedSupplierName}
            </span>
          ) : undefined
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-6 sm:px-4 lg:px-8">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Open opportunities</p>
            <p className="mt-2 text-2xl font-bold">{totals.count}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estimated max value</p>
            <p className="mt-2 text-2xl font-bold text-[#f77f00]">${totals.value.toLocaleString()}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Saved</p>
            <p className="mt-2 text-2xl font-bold">{totals.saved}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Already pitched</p>
            <p className="mt-2 text-2xl font-bold">{totals.pitched}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-7">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search seller, title, tags"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950"
            />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              {regionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              {languageOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select value={commission} onChange={(event) => setCommission(event.target.value as (typeof COMMISSION_OPTIONS)[number])} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              {COMMISSION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === "Any" ? "Any commission" : `${option}%`}</option>
              ))}
            </select>
            <select value={minRating} onChange={(event) => setMinRating(event.target.value as (typeof RATING_OPTIONS)[number])} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              {RATING_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === "Any" ? "Any rating" : `${option}+`}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input value={minBudget} onChange={(event) => setMinBudget(event.target.value)} placeholder="Min $" inputMode="numeric" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950" />
              <input value={maxBudget} onChange={(event) => setMaxBudget(event.target.value)} placeholder="Max $" inputMode="numeric" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950" />
            </div>
          </div>
        </section>

        {opportunitiesQuery.isLoading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Loading opportunities…
          </section>
        ) : opportunities.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No opportunities matched these filters.
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
            <div className="grid gap-4">
              {opportunities.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#f77f00]/40 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${stageTone(item.opportunityStatus)}`}>
                          {item.opportunityStatus || "Open"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {humanizeRelationship(item.collaborationStatus)}
                        </span>
                        {item.sellerBadge ? (
                          <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">
                            {item.sellerBadge}
                          </span>
                        ) : null}
                      </div>

                      <button type="button" onClick={() => setSelectedOpportunity(item)} className="mt-3 text-left">
                        <h2 className="text-lg font-semibold text-slate-900 hover:text-[#f77f00] dark:text-slate-50">{item.title}</h2>
                      </button>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        {item.seller} · {item.region} · {item.language}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.summary}</p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {item.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">#{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950 lg:max-w-[280px]">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Budget</p>
                          <p className="mt-1 font-semibold">{formatMoneyRange(item.budgetMin, item.budgetMax)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Commission</p>
                          <p className="mt-1 font-semibold">{Number(item.commission || 0)}%</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Seller rating</p>
                          <p className={`mt-1 font-semibold ${scoreTone(Number(item.sellerRating || 0))}`}>{Number(item.sellerRating || 0).toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Match</p>
                          <p className="mt-1 font-semibold">{item.matchScore}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                        <p><span className="font-semibold text-slate-700 dark:text-slate-200">Live window:</span> {item.liveWindow}</p>
                        <p><span className="font-semibold text-slate-700 dark:text-slate-200">Reason:</span> {item.matchReason}</p>
                      </div>

                      <div className="mt-4 grid gap-2">
                        <button type="button" onClick={() => setPitchOpportunity(item)} className="rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#df7300]">
                          Pitch this opportunity
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => void handleToggleSaved(item)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                            {item.isSaved ? "Unsave" : "Save"}
                          </button>
                          <button type="button" onClick={() => void handleToggleFollow(item)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                            {item.isFollowing ? "Following" : "Follow seller"}
                          </button>
                        </div>
                        {item.latestProposalId ? (
                          <button type="button" onClick={() => navigate(`/proposal-room?proposalId=${encodeURIComponent(item.latestProposalId || "")}`)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                            Open current proposal
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {selectedOpportunity ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected opportunity</p>
                    <h3 className="mt-2 text-lg font-semibold">{selectedOpportunity.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{selectedOpportunity.seller}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                    <p className="font-semibold text-slate-700 dark:text-slate-100">Deliverables</p>
                    <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                      {selectedOpportunity.deliverables.map((entry) => (
                        <li key={entry}>• {entry}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                    <p className="font-semibold text-slate-700 dark:text-slate-100">Timeline / tags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedOpportunity.timeline.map((entry) => (
                        <span key={entry} className="rounded-full bg-white px-2.5 py-1 text-xs dark:bg-slate-800">{entry}</span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                    <p className="font-semibold text-slate-700 dark:text-slate-100">Trust badges</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(selectedOpportunity.trustBadges || []).map((entry) => (
                        <span key={entry} className="rounded-full bg-white px-2.5 py-1 text-xs dark:bg-slate-800">{entry}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  Choose an opportunity to inspect the delivery expectations and trust context.
                </div>
              )}
            </aside>
          </section>
        )}
      </main>

      <PitchDrawer
        isOpen={Boolean(pitchOpportunity)}
        onClose={() => setPitchOpportunity(null)}
        recipientName={pitchOpportunity?.seller || ""}
        recipientInitials={pitchOpportunity?.sellerInitials || ""}
        recipientRegion={pitchOpportunity?.region}
        defaultCategory={pitchOpportunity?.category}
        onSubmit={handleSubmitPitch}
        submitLabel="Create backend pitch"
      />
    </div>
  );
}

export { OpportunitiesBoardPage };
