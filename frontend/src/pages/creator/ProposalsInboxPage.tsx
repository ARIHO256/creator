import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import type { ProposalRecord } from "../../api/types";
import { useNotification } from "../../contexts/NotificationContext";
import { useProposalsQuery, useTransitionProposalMutation } from "../../hooks/api/useProposals";
import {
  canOpenProposalRoom,
  canRespondToProposal,
  formatMoney,
  getLatestProposalMessage,
  getProposalOriginBadgeClass,
  getProposalOriginLabel,
  getProposalStatusBadgeClass,
  getProposalStatusLabel,
  normalizeProposalOrigin,
  normalizeProposalStatus,
  proposalRoomPath
} from "../../utils/collaborationUi";

type ProposalTab = "all" | "from-sellers" | "my-pitches";
type StatusFilter =
  | "all"
  | "draft"
  | "sent_to_brand"
  | "in_negotiation"
  | "accepted"
  | "declined"
  | "contract_created"
  | "archived";

const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All statuses" },
  { id: "draft", label: "New / Draft" },
  { id: "sent_to_brand", label: "Sent to brand" },
  { id: "in_negotiation", label: "In negotiation" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
  { id: "contract_created", label: "Contract created" },
  { id: "archived", label: "Archived" }
];

const TABS: Array<{ id: ProposalTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "from-sellers", label: "From sellers" },
  { id: "my-pitches", label: "My pitches" }
];

export function ProposalsInboxPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ProposalTab>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [minBudget, setMinBudget] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null);
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);

  const proposalsQuery = useProposalsQuery(
    {
      q: search.trim() || undefined,
      origin: tab === "all" ? undefined : tab === "from-sellers" ? "seller" : "creator",
      status: statusFilter === "all" ? undefined : statusFilter
    },
    { staleTime: 20_000 }
  );
  const transitionMutation = useTransitionProposalMutation();

  const proposals = useMemo(() => proposalsQuery.data?.items ?? [], [proposalsQuery.data?.items]);

  const categories = useMemo(() => {
    const next = new Set<string>();
    proposals.forEach((proposal) => next.add(proposal.category));
    return ["All", ...Array.from(next).sort((left, right) => left.localeCompare(right))];
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    return proposals.filter((proposal) => {
      if (categoryFilter !== "All" && proposal.category !== categoryFilter) return false;
      if (minBudget) {
        const numericBudget = Number(minBudget) || 0;
        if (proposal.baseFeeMax < numericBudget) return false;
      }
      return true;
    });
  }, [categoryFilter, minBudget, proposals]);

  useEffect(() => {
    if (!filteredProposals.length) {
      setSelectedProposalId(null);
      return;
    }
    setSelectedProposalId((current) => {
      if (current && filteredProposals.some((proposal) => proposal.id === current)) return current;
      return filteredProposals[0]?.id ?? null;
    });
  }, [filteredProposals]);

  const selectedProposal = useMemo(
    () => filteredProposals.find((proposal) => proposal.id === selectedProposalId) ?? filteredProposals[0] ?? null,
    [filteredProposals, selectedProposalId]
  );

  const stats = useMemo(() => {
    const sellerProposals = proposals.filter((proposal) => normalizeProposalOrigin(proposal.origin) === "seller").length;
    const inNegotiation = proposals.filter((proposal) => normalizeProposalStatus(proposal.status) === "in_negotiation").length;
    const accepted = proposals.filter((proposal) =>
      ["accepted", "contract_created"].includes(normalizeProposalStatus(proposal.status))
    ).length;
    return {
      total: proposals.length,
      sellerProposals,
      inNegotiation,
      accepted
    };
  }, [proposals]);

  const handleTransition = async (proposal: ProposalRecord, status: "accepted" | "declined") => {
    try {
      setPendingProposalId(proposal.id);
      const result = await transitionMutation.mutateAsync({
        proposalId: proposal.id,
        payload: {
          status,
          note: status === "accepted" ? "Accepted from proposal inbox." : "Declined from proposal inbox."
        }
      });
      showSuccess(
        status === "accepted"
          ? result.contract
            ? `Accepted. Contract ${result.contract.title} is now available.`
            : "Proposal accepted."
          : "Proposal declined."
      );
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update proposal state.");
    } finally {
      setPendingProposalId(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
      <PageHeader
        pageTitle="Proposals Inbox"
        rightContent={
          <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 xl:flex">
            <span>{stats.total} proposals</span>
            <span>•</span>
            <span>{stats.inNegotiation} in negotiation</span>
          </div>
        }
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 pt-4 sm:px-4 lg:px-8">
        <section className="grid gap-3 md:grid-cols-4">
          <SummaryCard label="Total proposals" value={String(stats.total)} detail="All inbound and outbound proposals" />
          <SummaryCard label="From sellers" value={String(stats.sellerProposals)} detail="Seller-originated proposal threads" />
          <SummaryCard label="Negotiating" value={String(stats.inNegotiation)} detail="Open conversations and revised terms" />
          <SummaryCard label="Accepted / contracted" value={String(stats.accepted)} detail="Accepted deals and auto-created contracts" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 xl:grid-cols-[minmax(340px,460px)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="space-y-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Search</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search seller, campaign, category..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {TABS.map((entry) => {
                    const active = tab === entry.id;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setTab(entry.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-[#f77f00] bg-[#f77f00] text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        {entry.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Status</span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Minimum budget</span>
                    <input
                      type="number"
                      value={minBudget}
                      onChange={(event) => setMinBudget(event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 min-h-[520px] space-y-3">
                {proposalsQuery.isLoading ? (
                  <div className="flex h-[360px] items-center justify-center">
                    <CircularProgress size={28} />
                  </div>
                ) : filteredProposals.length === 0 ? (
                  <EmptyPanel title="No proposals found" body="Adjust your filters or create a new pitch from the Sellers Directory." />
                ) : (
                  filteredProposals.map((proposal) => (
                    <ProposalListRow
                      key={proposal.id}
                      proposal={proposal}
                      selected={selectedProposal?.id === proposal.id}
                      expanded={expandedProposalId === proposal.id}
                      onSelect={() => setSelectedProposalId(proposal.id)}
                      onToggleExpand={() =>
                        setExpandedProposalId((current) => (current === proposal.id ? null : proposal.id))
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="min-h-[620px] rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              {selectedProposal ? (
                <ProposalDetailPanel
                  proposal={selectedProposal}
                  isPending={pendingProposalId === selectedProposal.id}
                  onAccept={() => void handleTransition(selectedProposal, "accepted")}
                  onDecline={() => void handleTransition(selectedProposal, "declined")}
                  onOpenRoom={() => navigate(proposalRoomPath(selectedProposal.id))}
                />
              ) : (
                <EmptyPanel title="Select a proposal" body="Choose a proposal from the inbox to inspect terms, budget, and next actions." />
              )}
            </div>
          </div>
        </section>
      </div>
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

function ProposalListRow({
  proposal,
  selected,
  expanded,
  onSelect,
  onToggleExpand
}: {
  proposal: ProposalRecord;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}) {
  const latestMessage = getLatestProposalMessage(proposal);
  return (
    <div
      className={`rounded-2xl border transition ${
        selected
          ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/20"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full p-3 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {proposal.initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{proposal.brand}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getProposalOriginBadgeClass(
                    proposal.origin
                  )}`}
                >
                  {getProposalOriginLabel(proposal.origin)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-300">{proposal.campaign}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{proposal.category}</span>
                <span>•</span>
                <span>{formatMoney(proposal.baseFeeMax, proposal.currency)}</span>
                <span>•</span>
                <span>{proposal.messages.length} messages</span>
              </div>
            </div>
          </div>

          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getProposalStatusBadgeClass(
              proposal.status
            )}`}
          >
            {getProposalStatusLabel(proposal.status, proposal.origin)}
          </span>
        </div>

        {latestMessage && (
          <p className="mt-3 truncate rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {latestMessage.name}: {latestMessage.body}
          </p>
        )}
      </button>

      <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-800">
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-xs font-semibold text-[#f77f00] hover:underline"
        >
          {expanded ? "Hide quick summary" : "Show quick summary"}
        </button>
        {expanded && <InlineProposalSummary proposal={proposal} />}
      </div>
    </div>
  );
}

function InlineProposalSummary({ proposal }: { proposal: ProposalRecord }) {
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-700 dark:text-slate-100">Offer</p>
          <p className="mt-1">{proposal.offerType}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700 dark:text-slate-100">Budget range</p>
          <p className="mt-1">
            {formatMoney(proposal.baseFeeMin, proposal.currency)} – {formatMoney(proposal.baseFeeMax, proposal.currency)}
          </p>
        </div>
      </div>
      <p className="mt-3 leading-6">{proposal.notesShort || "No summary note recorded yet."}</p>
    </div>
  );
}

function ProposalDetailPanel({
  proposal,
  isPending,
  onAccept,
  onDecline,
  onOpenRoom
}: {
  proposal: ProposalRecord;
  isPending: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onOpenRoom: () => void;
}) {
  const canRespond = canRespondToProposal(proposal);
  const canOpenRoomFlag = canOpenProposalRoom(proposal);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-lg font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {proposal.initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{proposal.brand}</h2>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getProposalOriginBadgeClass(
                  proposal.origin
                )}`}
              >
                {getProposalOriginLabel(proposal.origin)}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getProposalStatusBadgeClass(
                  proposal.status
                )}`}
              >
                {getProposalStatusLabel(proposal.status, proposal.origin)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{proposal.campaign}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{proposal.lastActivity}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canRespond && (
            <>
              <button
                type="button"
                onClick={onDecline}
                disabled={isPending}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/20"
              >
                {isPending ? "Updating..." : "Decline"}
              </button>
              <button
                type="button"
                onClick={onAccept}
                disabled={isPending}
                className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Updating..." : "Accept"}
              </button>
            </>
          )}
          {canOpenRoomFlag && (
            <button
              type="button"
              onClick={onOpenRoom}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Open proposal room
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <DetailMetric label="Base fee min" value={formatMoney(proposal.baseFeeMin, proposal.currency)} />
        <DetailMetric label="Base fee max" value={formatMoney(proposal.baseFeeMax, proposal.currency)} />
        <DetailMetric label="Commission" value={`${proposal.commissionPct}%`} />
        <DetailMetric label="Estimated value" value={formatMoney(proposal.estimatedValue, proposal.currency)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Proposal summary</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryBlock title="Offer type" body={proposal.offerType} />
            <SummaryBlock title="Category / region" body={`${proposal.category} • ${proposal.region}`} />
            <SummaryBlock title="Schedule" body={proposal.terms.schedule || "Not yet defined"} />
            <SummaryBlock title="Compensation" body={proposal.terms.compensation || "Not yet defined"} />
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Short note</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {proposal.notesShort || "No notes recorded yet."}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Terms snapshot</h3>
          <div className="mt-4 space-y-3">
            <SummaryBlock title="Deliverables" body={proposal.terms.deliverables || "Not yet defined"} />
            <SummaryBlock title="Exclusivity" body={proposal.terms.exclusivityWindow || "Not yet defined"} />
            <SummaryBlock title="Kill fee" body={proposal.terms.killFee || "Not yet defined"} />
            <SummaryBlock
              title="Conversation"
              body={
                proposal.messages.length
                  ? `${proposal.messages.length} message${proposal.messages.length === 1 ? "" : "s"} in the room`
                  : "No messages yet"
              }
            />
          </div>
        </section>
      </div>
    </div>
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

function SummaryBlock({ title, body }: { title: string; body: string }) {
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
