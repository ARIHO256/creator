import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { PitchDrawer } from "../../components/PitchDrawer";
import type { PitchFormSubmission } from "../../components/PitchForm";
import { useNotification } from "../../contexts/NotificationContext";
import { useCreateProposalMutation } from "../../hooks/api/useProposals";
import { useSellersQuery, useToggleSellerFollowMutation } from "../../hooks/api/useSellers";
import type { SellerRecord } from "../../api/types";
import type { PageId } from "../../layouts/CreatorShellLayout";
import {
  formatCompactNumber,
  formatMoney,
  getSellerRelationshipBadgeClass,
  getSellerRelationshipLabel,
  proposalRoomPath,
  sellerSupportsDiscovery
} from "../../utils/collaborationUi";

type SellersDirectoryPageProps = {
  onChangePage?: (page: PageId) => void;
};

type ViewTab = "all" | "followed" | "recommended";
type SortMode = "fit" | "followers" | "rating" | "lives";

function estimateProposalValue(seller: SellerRecord, model: PitchFormSubmission["collaborationModel"]): number {
  if (model === "Flat fee") return Math.round(seller.avgOrderValue * 18);
  if (model === "Commission") return Math.round(seller.avgOrderValue * 12);
  return Math.round(seller.avgOrderValue * 22);
}

export function SellersDirectoryPage({ onChangePage }: SellersDirectoryPageProps) {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [viewTab, setViewTab] = useState<ViewTab>("all");
  const [sortMode, setSortMode] = useState<SortMode>("fit");
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [pitchTarget, setPitchTarget] = useState<SellerRecord | null>(null);

  useEffect(() => {
    onChangePage?.("sellers");
  }, [onChangePage]);

  const sellersQuery = useSellersQuery(
    {
      q: search.trim() || undefined,
      region: regionFilter !== "All" ? regionFilter : undefined,
      openOnly: true
    },
    { staleTime: 30_000 }
  );
  const toggleFollowMutation = useToggleSellerFollowMutation();
  const createProposalMutation = useCreateProposalMutation();

  const allSellers = useMemo(() => sellersQuery.data?.items ?? [], [sellersQuery.data?.items]);

  const categories = useMemo(() => {
    const next = new Set<string>();
    allSellers.forEach((seller) => seller.categories.forEach((category) => next.add(category)));
    return ["All", ...Array.from(next).sort((left, right) => left.localeCompare(right))];
  }, [allSellers]);

  const regions = useMemo(() => {
    const next = new Set<string>();
    allSellers.forEach((seller) => next.add(seller.region));
    return ["All", ...Array.from(next).sort((left, right) => left.localeCompare(right))];
  }, [allSellers]);

  const filteredSellers = useMemo(() => {
    const base = allSellers.filter((seller) => sellerSupportsDiscovery(seller));
    const categoryFiltered =
      categoryFilter === "All" ? base : base.filter((seller) => seller.categories.includes(categoryFilter));

    const tabFiltered = categoryFiltered.filter((seller) => {
      if (viewTab === "followed") return seller.isFollowing;
      if (viewTab === "recommended") return seller.fitScore >= 85 || seller.badge.toLowerCase().includes("top");
      return true;
    });

    return [...tabFiltered].sort((left, right) => {
      if (sortMode === "followers") return right.followers - left.followers;
      if (sortMode === "rating") return right.rating - left.rating;
      if (sortMode === "lives") return right.livesCompleted - left.livesCompleted;
      if (right.fitScore !== left.fitScore) return right.fitScore - left.fitScore;
      if (right.rating !== left.rating) return right.rating - left.rating;
      return right.followers - left.followers;
    });
  }, [allSellers, categoryFilter, sortMode, viewTab]);

  useEffect(() => {
    if (!filteredSellers.length) {
      setSelectedSellerId(null);
      return;
    }

    setSelectedSellerId((current) => {
      if (current && filteredSellers.some((seller) => seller.id === current)) return current;
      return filteredSellers[0]?.id ?? null;
    });
  }, [filteredSellers]);

  const selectedSeller = useMemo(
    () => filteredSellers.find((seller) => seller.id === selectedSellerId) ?? filteredSellers[0] ?? null,
    [filteredSellers, selectedSellerId]
  );

  const stats = useMemo(() => {
    const followedCount = allSellers.filter((seller) => seller.isFollowing).length;
    const recommendedCount = allSellers.filter((seller) => seller.fitScore >= 85).length;
    return {
      total: allSellers.length,
      followedCount,
      recommendedCount
    };
  }, [allSellers]);

  const handleToggleFollow = async (seller: SellerRecord) => {
    try {
      const nextFollow = !seller.isFollowing;
      await toggleFollowMutation.mutateAsync({ sellerId: seller.id, follow: nextFollow });
      showSuccess(nextFollow ? `You are now following ${seller.name}.` : `You unfollowed ${seller.name}.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update follow state.");
    }
  };

  const handlePitchSubmit = async (payload: PitchFormSubmission) => {
    if (!pitchTarget) return;

    const estimatedValue = estimateProposalValue(pitchTarget, payload.collaborationModel);
    const proposal = await createProposalMutation.mutateAsync({
      sellerId: pitchTarget.id,
      campaign: `${pitchTarget.brand} creator pitch`,
      offerType:
        payload.collaborationModel === "Hybrid"
          ? "Hybrid live + ad pitch"
          : payload.collaborationModel === "Commission"
            ? "Commission-led creator pitch"
            : "Flat fee creator pitch",
      category: pitchTarget.categories[0] ?? "General",
      region: pitchTarget.region,
      baseFeeMin: Math.max(0, Math.round(estimatedValue * 0.7)),
      baseFeeMax: estimatedValue,
      currency: "USD",
      commissionPct: payload.collaborationModel === "Commission" || payload.collaborationModel === "Hybrid" ? 5 : 0,
      estimatedValue,
      origin: "creator",
      notesShort: payload.message,
      deliverables: "Creator-led live session, short clips, and CTA links",
      schedule: "Scheduling to be agreed with the seller",
      compensation:
        payload.collaborationModel === "Commission"
          ? "Commission-first proposal"
          : payload.collaborationModel === "Flat fee"
            ? "Flat-fee proposal"
            : "Hybrid proposal",
      exclusivityWindow: "To be negotiated",
      killFee: "To be negotiated"
    });

    showSuccess(`Proposal draft created for ${pitchTarget.name}.`);
    setPitchTarget(null);
    navigate(proposalRoomPath(proposal.id));
  };

  return (
    <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
      <PageHeader
        pageTitle="Sellers Directory"
        rightContent={
          <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 xl:flex">
            <span>{stats.total} discoverable sellers</span>
            <span>•</span>
            <span>{stats.followedCount} followed</span>
          </div>
        }
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 pt-4 sm:px-4 lg:px-8">
        <section className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Discoverable sellers" value={String(stats.total)} detail="Open or invite-only collaborations" />
          <SummaryCard label="Recommended for you" value={String(stats.recommendedCount)} detail="High-fit sellers based on your profile" />
          <SummaryCard label="Already followed" value={String(stats.followedCount)} detail="Quick shortlist for repeat outreach" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Search</span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search sellers, brand, region..."
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Category</span>
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Region</span>
                    <select
                      value={regionFilter}
                      onChange={(event) => setRegionFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Sort</span>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as SortMode)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="fit">Best fit</option>
                      <option value="followers">Followers</option>
                      <option value="rating">Rating</option>
                      <option value="lives">Lives completed</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "all", label: "All" },
                    { id: "followed", label: "Followed" },
                    { id: "recommended", label: "Recommended" }
                  ].map((tab) => {
                    const active = viewTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setViewTab(tab.id as ViewTab)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-[#f77f00] bg-[#f77f00] text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 min-h-[480px] space-y-3">
                {sellersQuery.isLoading ? (
                  <div className="flex h-[360px] items-center justify-center">
                    <CircularProgress size={28} />
                  </div>
                ) : filteredSellers.length === 0 ? (
                  <EmptyPanel
                    title="No sellers match this filter"
                    body="Adjust the category, region, or search terms to reveal more sellers."
                  />
                ) : (
                  filteredSellers.map((seller) => (
                    <SellerListRow
                      key={seller.id}
                      seller={seller}
                      selected={seller.id === selectedSeller?.id}
                      onSelect={() => setSelectedSellerId(seller.id)}
                      onToggleFollow={() => void handleToggleFollow(seller)}
                      isMutating={toggleFollowMutation.isPending && selectedSeller?.id === seller.id}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="min-h-[580px] rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              {selectedSeller ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-lg font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        {selectedSeller.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedSeller.name}</h2>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getSellerRelationshipBadgeClass(
                              selectedSeller.relationship
                            )}`}
                          >
                            {getSellerRelationshipLabel(selectedSeller.relationship)}
                          </span>
                          {selectedSeller.inviteOnly && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                              Invite only
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selectedSeller.tagline}</p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{selectedSeller.fitReason}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleFollow(selectedSeller)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {selectedSeller.isFollowing ? "Unfollow" : "Follow"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPitchTarget(selectedSeller)}
                        className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00]"
                      >
                        Start pitch
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onChangePage?.("opportunities");
                          navigate("/opportunities", { state: { sellerId: selectedSeller.id, sellerName: selectedSeller.name } });
                        }}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        View opportunities
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <DetailMetric label="Followers" value={formatCompactNumber(selectedSeller.followers)} />
                    <DetailMetric label="Rating" value={selectedSeller.rating.toFixed(1)} />
                    <DetailMetric label="Average order" value={formatMoney(selectedSeller.avgOrderValue, "USD")} />
                    <DetailMetric label="Lives completed" value={String(selectedSeller.livesCompleted)} />
                  </div>

                  <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Fit and positioning</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {selectedSeller.name} is currently {selectedSeller.openToCollabs ? "open to new creator collaborations" : "running invite-only collaborations"} in{" "}
                        {selectedSeller.region}. Their strongest categories are {selectedSeller.categories.join(", ")}.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <MiniBlock
                          title="Fit score"
                          body={`${selectedSeller.fitScore}/100 match based on your categories, sales profile, and audience overlap.`}
                        />
                        <MiniBlock
                          title="Collaboration status"
                          body={selectedSeller.collabStatus || "No current collaboration note provided."}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Trust and readiness</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedSeller.trustBadges.map((badge) => (
                          <span
                            key={badge}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recommended next move</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          {selectedSeller.inviteOnly
                            ? "Lead with a concise, value-first pitch and ask for access to the collaboration brief."
                            : "Open with a draft proposal so you can lock deliverables, timeline, and pricing in the proposal room."}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Categories and market</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{selectedSeller.region}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedSeller.categories.map((category) => (
                        <span
                          key={category}
                          className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <EmptyPanel title="Pick a seller" body="Select a seller from the list to inspect the brand, metrics, and collaboration options." />
              )}
            </div>
          </div>
        </section>
      </div>

      <PitchDrawer
        isOpen={Boolean(pitchTarget)}
        onClose={() => setPitchTarget(null)}
        recipientName={pitchTarget?.name ?? ""}
        recipientInitials={pitchTarget?.initials ?? ""}
        recipientRegion={pitchTarget?.region}
        defaultCategory={pitchTarget?.categories[0]}
        onSubmit={handlePitchSubmit}
        submitLabel={createProposalMutation.isPending ? "Creating draft..." : "Create proposal draft"}
      />
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{detail}</p>
    </div>
  );
}

function SellerListRow({
  seller,
  selected,
  onSelect,
  onToggleFollow,
  isMutating
}: {
  seller: SellerRecord;
  selected: boolean;
  onSelect: () => void;
  onToggleFollow: () => void;
  isMutating: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-3 text-left transition ${
        selected
          ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/20"
          : "border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {seller.initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{seller.name}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getSellerRelationshipBadgeClass(
                  seller.relationship
                )}`}
              >
                {getSellerRelationshipLabel(seller.relationship)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{seller.tagline}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{seller.region}</span>
              <span>•</span>
              <span>{formatCompactNumber(seller.followers)} followers</span>
              <span>•</span>
              <span>{seller.rating.toFixed(1)}★</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFollow();
          }}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {isMutating ? "..." : seller.isFollowing ? "Following" : "Follow"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {seller.categories.slice(0, 2).map((category) => (
          <span
            key={category}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {category}
          </span>
        ))}
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
          Fit {seller.fitScore}
        </span>
      </div>
    </button>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function MiniBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}
