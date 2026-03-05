import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { PitchDrawer } from "../../components/PitchDrawer";
import type { PitchFormSubmission } from "../../components/PitchForm";
import type { SellerRecord, ProposalRecord, ContractRecord } from "../../api/types";
import { useNotification } from "../../contexts/NotificationContext";
import { useContractsQuery } from "../../hooks/api/useContracts";
import { useCreateProposalMutation, useProposalsQuery } from "../../hooks/api/useProposals";
import { useMySellersQuery, useToggleSellerFollowMutation } from "../../hooks/api/useSellers";
import {
  formatCompactNumber,
  formatMoney,
  getProposalStatusLabel,
  getSellerRelationshipBadgeClass,
  getSellerRelationshipLabel,
  normalizeProposalStatus,
  normalizeSellerRelationship,
  proposalRoomPath
} from "../../utils/collaborationUi";

const PINNED_STORAGE_KEY = "mldz:my-sellers:pinned:v1";

type ViewTab = "all" | "active" | "past";

type SellerDashboardRecord = SellerRecord & {
  favourite: boolean;
  openProposals: number;
  activeContracts: number;
  activeValue: number;
  lifetimeValue: number;
  lastCampaign: string;
  lastProposal: ProposalRecord | null;
  nextAction: string;
  nextActionStatus: string;
};

function readPinnedSellerIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writePinnedSellerIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(ids));
}

function estimatePitchValue(seller: SellerRecord, model: PitchFormSubmission["collaborationModel"]): number {
  if (model === "Flat fee") return Math.round(seller.avgOrderValue * 18);
  if (model === "Commission") return Math.round(seller.avgOrderValue * 12);
  return Math.round(seller.avgOrderValue * 22);
}

function buildSellerProposalMap(proposals: ProposalRecord[]): Map<string, ProposalRecord[]> {
  const map = new Map<string, ProposalRecord[]>();
  proposals.forEach((proposal) => {
    const existing = map.get(proposal.sellerId) ?? [];
    existing.push(proposal);
    map.set(proposal.sellerId, existing);
  });
  return map;
}

function buildSellerContractMap(contracts: ContractRecord[]): Map<string, ContractRecord[]> {
  const map = new Map<string, ContractRecord[]>();
  contracts.forEach((contract) => {
    const existing = map.get(contract.sellerId) ?? [];
    existing.push(contract);
    map.set(contract.sellerId, existing);
  });
  return map;
}

function isActiveContract(contract: ContractRecord): boolean {
  return !["completed", "terminated"].includes(contract.status);
}

export function MySellersPage() {
  const navigate = useNavigate();
  const { showError, showInfo, showSuccess } = useNotification();
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("all");
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [pinnedSellerIds, setPinnedSellerIds] = useState<string[]>(readPinnedSellerIds);
  const [pitchTarget, setPitchTarget] = useState<SellerRecord | null>(null);

  const mySellersQuery = useMySellersQuery({ q: search.trim() || undefined }, { staleTime: 30_000 });
  const proposalsQuery = useProposalsQuery({}, { staleTime: 20_000 });
  const contractsQuery = useContractsQuery({}, { staleTime: 20_000 });
  const toggleFollowMutation = useToggleSellerFollowMutation();
  const createProposalMutation = useCreateProposalMutation();

  useEffect(() => {
    writePinnedSellerIds(pinnedSellerIds);
  }, [pinnedSellerIds]);

  const sellerProposalMap = useMemo(
    () => buildSellerProposalMap(proposalsQuery.data?.items ?? []),
    [proposalsQuery.data?.items]
  );
  const sellerContractMap = useMemo(
    () => buildSellerContractMap(contractsQuery.data?.items ?? []),
    [contractsQuery.data?.items]
  );

  const sellers = useMemo<SellerDashboardRecord[]>(() => {
    return (mySellersQuery.data?.items ?? []).map((seller) => {
      const proposals = sellerProposalMap.get(seller.id) ?? [];
      const contracts = sellerContractMap.get(seller.id) ?? [];
      const openProposals = proposals.filter((proposal) => {
        const status = normalizeProposalStatus(proposal.status);
        return ["draft", "sent_to_brand", "in_negotiation"].includes(status);
      }).length;
      const activeContracts = contracts.filter(isActiveContract).length;
      const activeValue = contracts.filter(isActiveContract).reduce((total, contract) => total + contract.value, 0);
      const lifetimeValue = contracts.reduce((total, contract) => total + contract.value, 0);
      const lastProposal = proposals[0] ?? null;

      let nextAction = "Start pitch";
      let nextActionStatus = "No active workflow";
      if (lastProposal) {
        nextAction = "Open proposal room";
        nextActionStatus = getProposalStatusLabel(lastProposal.status, lastProposal.origin);
      } else if (activeContracts > 0) {
        nextAction = "Review contracts";
        nextActionStatus = `${activeContracts} active contract${activeContracts === 1 ? "" : "s"}`;
      } else if (normalizeSellerRelationship(seller.relationship) === "past") {
        nextAction = "Re-engage seller";
        nextActionStatus = "Past collaboration";
      }

      return {
        ...seller,
        favourite: pinnedSellerIds.includes(seller.id),
        openProposals,
        activeContracts,
        activeValue,
        lifetimeValue,
        lastCampaign: lastProposal?.campaign ?? contracts[0]?.title ?? "No campaign yet",
        lastProposal,
        nextAction,
        nextActionStatus
      };
    });
  }, [contractsQuery.data?.items, mySellersQuery.data?.items, pinnedSellerIds, sellerContractMap, sellerProposalMap]);

  const filteredSellers = useMemo(() => {
    const base = [...sellers].sort((left, right) => {
      if (left.favourite !== right.favourite) return left.favourite ? -1 : 1;
      if (left.activeContracts !== right.activeContracts) return right.activeContracts - left.activeContracts;
      if (left.openProposals !== right.openProposals) return right.openProposals - left.openProposals;
      return right.followers - left.followers;
    });

    return base.filter((seller) => {
      if (viewTab === "active") {
        return normalizeSellerRelationship(seller.relationship) === "active" || seller.activeContracts > 0 || seller.openProposals > 0;
      }
      if (viewTab === "past") {
        return normalizeSellerRelationship(seller.relationship) === "past" && seller.activeContracts === 0 && seller.openProposals === 0;
      }
      return true;
    });
  }, [sellers, viewTab]);

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
    const activeSellerCount = sellers.filter((seller) => seller.activeContracts > 0 || seller.openProposals > 0).length;
    const activeValue = sellers.reduce((total, seller) => total + seller.activeValue, 0);
    const lifetimeValue = sellers.reduce((total, seller) => total + seller.lifetimeValue, 0);
    return {
      total: sellers.length,
      activeSellerCount,
      activeValue,
      lifetimeValue
    };
  }, [sellers]);

  const togglePinned = (sellerId: string) => {
    setPinnedSellerIds((current) =>
      current.includes(sellerId) ? current.filter((id) => id !== sellerId) : [sellerId, ...current]
    );
  };

  const handlePitchSubmit = async (payload: PitchFormSubmission) => {
    if (!pitchTarget) return;

    const estimatedValue = estimatePitchValue(pitchTarget, payload.collaborationModel);
    const proposal = await createProposalMutation.mutateAsync({
      sellerId: pitchTarget.id,
      campaign: `${pitchTarget.brand} follow-up campaign`,
      offerType:
        payload.collaborationModel === "Hybrid"
          ? "Hybrid retention pitch"
          : payload.collaborationModel === "Commission"
            ? "Commission-based renewal pitch"
            : "Flat-fee renewal pitch",
      category: pitchTarget.categories[0] ?? "General",
      region: pitchTarget.region,
      baseFeeMin: Math.max(0, Math.round(estimatedValue * 0.7)),
      baseFeeMax: estimatedValue,
      currency: "USD",
      commissionPct: payload.collaborationModel === "Flat fee" ? 0 : 5,
      estimatedValue,
      origin: "creator",
      notesShort: payload.message,
      deliverables: "Renewal live, clips, and post-live link assets",
      schedule: "To be aligned with the seller",
      compensation: `${payload.collaborationModel} proposal`,
      exclusivityWindow: "To be negotiated",
      killFee: "To be negotiated"
    });

    showSuccess(`Draft proposal created for ${pitchTarget.name}.`);
    setPitchTarget(null);
    navigate(proposalRoomPath(proposal.id));
  };

  const handleToggleFollow = async (seller: SellerRecord) => {
    try {
      const nextFollow = !seller.isFollowing;
      await toggleFollowMutation.mutateAsync({ sellerId: seller.id, follow: nextFollow });
      showSuccess(nextFollow ? `You are now following ${seller.name}.` : `You unfollowed ${seller.name}.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update follow state.");
    }
  };

  const isLoading =
    mySellersQuery.isLoading || proposalsQuery.isLoading || contractsQuery.isLoading;

  return (
    <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
      <PageHeader
        pageTitle="My Sellers"
        rightContent={
          <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 xl:flex">
            <span>{stats.total} sellers</span>
            <span>•</span>
            <span>{stats.activeSellerCount} active workflows</span>
          </div>
        }
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 pt-4 sm:px-4 lg:px-8">
        <section className="grid gap-3 md:grid-cols-4">
          <StatCard label="Tracked sellers" value={String(stats.total)} detail="Followed or already linked sellers" />
          <StatCard label="Active workflows" value={String(stats.activeSellerCount)} detail="Open proposals or active contracts" />
          <StatCard label="Active value" value={formatMoney(stats.activeValue, "USD")} detail="Value in live contracts now" />
          <StatCard label="Lifetime value" value={formatMoney(stats.lifetimeValue, "USD")} detail="Total signed contract value" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="space-y-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Search sellers</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search sellers, campaign, relationship..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "past", label: "Past" }
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

              <div className="mt-4 min-h-[500px] space-y-3">
                {isLoading ? (
                  <div className="flex h-[360px] items-center justify-center">
                    <CircularProgress size={28} />
                  </div>
                ) : filteredSellers.length === 0 ? (
                  <EmptyPanel title="No sellers here yet" body="Follow sellers from the directory or complete a collaboration to see them in this workspace." />
                ) : (
                  filteredSellers.map((seller) => (
                    <SellerWorkspaceRow
                      key={seller.id}
                      seller={seller}
                      selected={selectedSeller?.id === seller.id}
                      onSelect={() => setSelectedSellerId(seller.id)}
                      onTogglePin={() => togglePinned(seller.id)}
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
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedSeller.name}</h2>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getSellerRelationshipBadgeClass(
                              selectedSeller.relationship
                            )}`}
                          >
                            {getSellerRelationshipLabel(selectedSeller.relationship)}
                          </span>
                          {selectedSeller.favourite && (
                            <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[11px] font-semibold text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                              Pinned
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selectedSeller.tagline}</p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{selectedSeller.nextActionStatus}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => togglePinned(selectedSeller.id)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {selectedSeller.favourite ? "Unpin" : "Pin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPitchTarget(selectedSeller)}
                        className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00]"
                      >
                        New proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSeller.lastProposal) navigate(proposalRoomPath(selectedSeller.lastProposal.id));
                          else showInfo("Create a proposal first to open the proposal room.");
                        }}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Open workspace
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <MetricCard label="Followers" value={formatCompactNumber(selectedSeller.followers)} />
                    <MetricCard label="Open proposals" value={String(selectedSeller.openProposals)} />
                    <MetricCard label="Active contracts" value={String(selectedSeller.activeContracts)} />
                    <MetricCard label="Active value" value={formatMoney(selectedSeller.activeValue, "USD")} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Relationship overview</h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <InfoBlock title="Last campaign" body={selectedSeller.lastCampaign} />
                        <InfoBlock title="Next action" body={`${selectedSeller.nextAction} — ${selectedSeller.nextActionStatus}`} />
                        <InfoBlock title="Lifetime value" body={formatMoney(selectedSeller.lifetimeValue, "USD")} />
                        <InfoBlock title="Primary categories" body={selectedSeller.categories.join(", ")} />
                      </div>

                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Operational note</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          Contract closure, termination requests, and formal end-of-collaboration steps should happen in the Contracts workspace so the audit trail and payout logic stay accurate.
                        </p>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</h3>
                      <div className="mt-4 space-y-3">
                        <ActionRow
                          title="Proposal room"
                          body={
                            selectedSeller.lastProposal
                              ? `Open ${selectedSeller.lastProposal.campaign} to continue negotiation or messaging.`
                              : "No proposal exists yet. Create one to start the negotiation trail."
                          }
                          actionLabel={selectedSeller.lastProposal ? "Open room" : "Create proposal"}
                          onAction={() => {
                            if (selectedSeller.lastProposal) navigate(proposalRoomPath(selectedSeller.lastProposal.id));
                            else setPitchTarget(selectedSeller);
                          }}
                        />
                        <ActionRow
                          title="Contracts"
                          body="Review contract timelines, deliverables, and any termination or renewal work."
                          actionLabel="View contracts"
                          onAction={() => navigate("/contracts", { state: { sellerId: selectedSeller.id } })}
                        />
                        <ActionRow
                          title="Follow state"
                          body={selectedSeller.isFollowing ? "You are following this seller for quick rediscovery." : "Follow this seller to keep them in your shortlist."}
                          actionLabel={selectedSeller.isFollowing ? "Unfollow" : "Follow"}
                          onAction={() => void handleToggleFollow(selectedSeller)}
                        />
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                <EmptyPanel title="Select a seller" body="Choose a seller from the left to view active proposals, contract value, and the next workflow step." />
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

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{detail}</p>
    </div>
  );
}

function SellerWorkspaceRow({
  seller,
  selected,
  onSelect,
  onTogglePin
}: {
  seller: SellerDashboardRecord;
  selected: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
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
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{seller.lastCampaign}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{seller.openProposals} open proposals</span>
              <span>•</span>
              <span>{seller.activeContracts} active contracts</span>
              <span>•</span>
              <span>{formatMoney(seller.activeValue, "USD")}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTogglePin();
          }}
          className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {seller.favourite ? "★" : "☆"}
        </button>
      </div>
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}

function ActionRow({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-3 rounded-full bg-[#f77f00] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e26f00]"
      >
        {actionLabel}
      </button>
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
