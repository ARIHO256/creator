import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import { PageHeader } from "../../components/PageHeader";
import { PitchDrawer } from "../../components/PitchDrawer";
import type { InviteRecord } from "../../api/types";
import { useNotification } from "../../contexts/NotificationContext";
import { useRespondInviteMutation, useInvitesQuery } from "../../hooks/api/useDiscoveryMarketplaces";
import { useCreateProposalMutation } from "../../hooks/api/useProposals";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "New" },
  { id: "negotiating", label: "In discussion" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" }
] as const;

type StatusTabId = (typeof STATUS_TABS)[number]["id"];

function formatMoney(value: number | undefined, currency = "USD") {
  if (!value) return "TBD";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function formatInviteStatus(status: InviteRecord["status"]) {
  if (status === "pending") return "New";
  if (status === "negotiating") return "In discussion";
  if (status === "accepted") return "Accepted";
  if (status === "declined") return "Declined";
  return "Expired";
}

function statusTone(status: InviteRecord["status"]) {
  if (status === "accepted") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  if (status === "negotiating") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  if (status === "declined" || status === "expired") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300";
  return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
}

function summaryFor(invites: InviteRecord[]) {
  return invites.reduce(
    (accumulator, invite) => {
      accumulator.total += 1;
      if (invite.status === "pending") accumulator.pending += 1;
      if (invite.status === "negotiating") accumulator.negotiating += 1;
      if (invite.status === "accepted") accumulator.accepted += 1;
      accumulator.pipelineValue += Number(invite.estimatedValue || invite.baseFee || 0);
      return accumulator;
    },
    { total: 0, pending: 0, negotiating: 0, accepted: 0, pipelineValue: 0 }
  );
}

export function InvitesFromSellersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showError, showSuccess } = useNotification();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTabId>("all");
  const [selectedInviteId, setSelectedInviteId] = useState<string | null>(null);
  const [pitchInvite, setPitchInvite] = useState<InviteRecord | null>(null);

  const invitesQuery = useInvitesQuery({
    q: search || undefined,
    status: activeTab !== "all" ? activeTab : undefined,
    pageSize: 100
  });
  const respondInviteMutation = useRespondInviteMutation();
  const createProposalMutation = useCreateProposalMutation();

  const invites = invitesQuery.data?.items ?? [];
  const totals = useMemo(() => summaryFor(invites), [invites]);
  const requestedInviteId = searchParams.get("inviteId");

  useEffect(() => {
    if (!invites.length) {
      setSelectedInviteId(null);
      return;
    }

    if (requestedInviteId && invites.some((invite) => invite.id === requestedInviteId)) {
      setSelectedInviteId(requestedInviteId);
      return;
    }

    if (!selectedInviteId || !invites.some((invite) => invite.id === selectedInviteId)) {
      setSelectedInviteId(invites[0].id);
    }
  }, [invites, requestedInviteId, selectedInviteId]);

  const selectedInvite = useMemo(() => invites.find((invite) => invite.id === selectedInviteId) ?? invites[0] ?? null, [invites, selectedInviteId]);

  const handleRespond = async (invite: InviteRecord, decision: "accepted" | "declined" | "negotiating") => {
    try {
      const updated = await respondInviteMutation.mutateAsync({ inviteId: invite.id, payload: { decision } });
      showSuccess(`Invite from ${updated.seller} marked ${formatInviteStatus(updated.status).toLowerCase()}.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update this invite.");
    }
  };

  const handleSendPitch = async (payload: { collaborationModel: "Flat fee" | "Commission" | "Hybrid"; message: string }) => {
    if (!pitchInvite) return;

    try {
      if (pitchInvite.status === "pending") {
        await respondInviteMutation.mutateAsync({ inviteId: pitchInvite.id, payload: { decision: "negotiating" } });
      }

      const estimatedValue = Number(pitchInvite.estimatedValue || pitchInvite.baseFee || 0);
      const proposal = await createProposalMutation.mutateAsync({
        sellerId: pitchInvite.sellerId,
        campaign: pitchInvite.campaign,
        offerType: pitchInvite.type,
        category: pitchInvite.category || "General",
        region: pitchInvite.region || "Global",
        baseFeeMin: Number(pitchInvite.baseFee || 0),
        baseFeeMax: Number(pitchInvite.estimatedValue || pitchInvite.baseFee || 0),
        currency: pitchInvite.currency || "USD",
        commissionPct: Number(pitchInvite.commissionPct || 0),
        estimatedValue,
        origin: "seller-invite",
        notesShort: payload.message,
        deliverables: pitchInvite.type,
        schedule: pitchInvite.timing || "To be agreed",
        compensation: `${payload.collaborationModel} · ${formatMoney(estimatedValue, pitchInvite.currency || "USD")}`,
        exclusivityWindow: "To be agreed",
        killFee: "To be agreed"
      });

      setPitchInvite(null);
      showSuccess("Pitch created. Opening the proposal room.");
      navigate(`/proposal-room?proposalId=${encodeURIComponent(proposal.id)}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not create this pitch.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader
        pageTitle="Invites from Suppliers"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            📨 Priority seller invites
          </span>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-6 sm:px-4 lg:px-8">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">All invites</p>
            <p className="mt-2 text-2xl font-bold">{totals.total}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Need response</p>
            <p className="mt-2 text-2xl font-bold text-[#f77f00]">{totals.pending}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">In discussion</p>
            <p className="mt-2 text-2xl font-bold">{totals.negotiating}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estimated pipeline</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-300">{formatMoney(totals.pipelineValue)}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-[#f77f00] bg-[#f77f00] text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search supplier, campaign or fit"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 sm:min-w-[280px]"
              />
              <button
                type="button"
                onClick={() => navigate("/opportunities")}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View opportunities
              </button>
            </div>
          </div>
        </section>

        {invitesQuery.isLoading ? (
          <section className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-300">
              <CircularProgress size={20} />
              Loading supplier invites...
            </div>
          </section>
        ) : invitesQuery.isError ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-6 text-sm text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300">
            Could not load invites right now.
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Invite queue</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Review direct supplier collaboration requests and respond quickly.</p>
                </div>
              </div>

              {!invites.length ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  No invites match these filters right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {invites.map((invite) => {
                    const selected = invite.id === selectedInvite?.id;
                    return (
                      <button
                        key={invite.id}
                        type="button"
                        onClick={() => setSelectedInviteId(invite.id)}
                        className={`w-full rounded-3xl border p-4 text-left transition ${
                          selected
                            ? "border-[#f77f00] bg-amber-50 shadow-sm dark:bg-[#f77f00]/10"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                {invite.sellerInitials || invite.seller.slice(0, 2).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{invite.seller}</p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{invite.campaign}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span>{invite.type}</span>
                              {invite.region ? <span>• {invite.region}</span> : null}
                              {invite.timing ? <span>• {invite.timing}</span> : null}
                            </div>
                            {invite.fitReason ? (
                              <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{invite.fitReason}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(invite.status)}`}>
                              {formatInviteStatus(invite.status)}
                            </span>
                            <span className="text-sm font-semibold text-[#f77f00]">{formatMoney(invite.estimatedValue || invite.baseFee, invite.currency || "USD")}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {!selectedInvite ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  Select an invite to view the full campaign context.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Selected invite</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{selectedInvite.campaign}</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedInvite.seller} • {selectedInvite.type}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(selectedInvite.status)}`}>
                      {formatInviteStatus(selectedInvite.status)}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Base fee</p>
                      <p className="mt-2 text-lg font-semibold">{formatMoney(selectedInvite.baseFee, selectedInvite.currency || "USD")}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Commission</p>
                      <p className="mt-2 text-lg font-semibold">{Number(selectedInvite.commissionPct || 0)}%</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Last activity</p>
                      <p className="mt-2 text-lg font-semibold">{selectedInvite.lastActivity || "Just now"}</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Why this fits you</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{selectedInvite.fitReason || "Supplier matched you to this campaign based on your niche and recent performance."}</p>
                    {selectedInvite.messageShort ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        “{selectedInvite.messageShort}”
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Supplier profile</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selectedInvite.seller}</p>
                      </div>
                      {selectedInvite.sellerRating ? (
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          ⭐ {selectedInvite.sellerRating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {selectedInvite.sellerDescription || "Trusted supplier looking for creator-led selling, tracked links, and live conversion support."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRespond(selectedInvite, "accepted")}
                      disabled={respondInviteMutation.isPending || selectedInvite.status === "accepted"}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Accept invite
                    </button>
                    <button
                      type="button"
                      onClick={() => setPitchInvite(selectedInvite)}
                      disabled={createProposalMutation.isPending}
                      className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e26f00] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Send counter pitch
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRespond(selectedInvite, "declined")}
                      disabled={respondInviteMutation.isPending || selectedInvite.status === "declined"}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/sellers?sellerId=${encodeURIComponent(selectedInvite.sellerId)}`)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Open supplier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <PitchDrawer
        isOpen={Boolean(pitchInvite)}
        onClose={() => setPitchInvite(null)}
        recipientName={pitchInvite?.seller || "Supplier"}
        recipientInitials={pitchInvite?.sellerInitials || "SP"}
        recipientRegion={pitchInvite?.region}
        defaultCategory={pitchInvite?.category}
        submitLabel="Send pitch"
        onSubmit={handleSendPitch}
      />
    </div>
  );
}
