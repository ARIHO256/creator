import React, { useEffect, useMemo, useRef, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import type { ProposalRecord, ProposalTermBlock } from "../../api/types";
import { useNotification } from "../../contexts/NotificationContext";
import {
  useProposalRoomQuery,
  useSendProposalMessageMutation,
  useTransitionProposalMutation,
  useUpdateProposalMutation
} from "../../hooks/api/useProposals";
import {
  canRespondToProposal,
  formatMoney,
  formatProposalMessageTime,
  getProposalOriginBadgeClass,
  getProposalOriginLabel,
  getProposalStatusBadgeClass,
  getProposalStatusLabel,
  normalizeProposalStatus
} from "../../utils/collaborationUi";

const STATUS_STEPS = ["Received", "Reviewing", "Negotiating", "Contract"] as const;

type ClauseSuggestion = {
  id: string;
  field: keyof ProposalTermBlock;
  title: string;
  value: string;
};

const CLAUSE_SUGGESTIONS: ClauseSuggestion[] = [
  {
    id: "kill-fee",
    field: "killFee",
    title: "Add kill fee",
    value: "50% of the agreed flat fee if the campaign is cancelled within 24 hours of go-live."
  },
  {
    id: "exclusivity-window",
    field: "exclusivityWindow",
    title: "Limit exclusivity",
    value: "7 days across direct category competitors only."
  },
  {
    id: "usage-rights",
    field: "compensation",
    title: "Clarify usage rights",
    value: "Includes 90-day brand usage rights for short clips and replay highlights."
  }
];

function buildRoomStepIndex(proposal: ProposalRecord): number {
  const status = normalizeProposalStatus(proposal.status);
  switch (status) {
    case "draft":
      return 0;
    case "sent_to_brand":
      return 1;
    case "in_negotiation":
      return 2;
    case "accepted":
    case "contract_created":
      return 3;
    case "declined":
    case "archived":
      return 1;
    default:
      return 0;
  }
}

function createTermsFromProposal(proposal: ProposalRecord | null | undefined): ProposalTermBlock {
  return {
    deliverables: proposal?.terms.deliverables ?? "",
    schedule: proposal?.terms.schedule ?? "",
    compensation: proposal?.terms.compensation ?? "",
    exclusivityWindow: proposal?.terms.exclusivityWindow ?? "",
    killFee: proposal?.terms.killFee ?? ""
  };
}

export function ProposalNegotiationRoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get("proposalId")?.trim();
  const { showError, showInfo, showSuccess } = useNotification();

  const proposalQuery = useProposalRoomQuery(proposalId);
  const sendMessageMutation = useSendProposalMessageMutation();
  const transitionMutation = useTransitionProposalMutation();
  const updateProposalMutation = useUpdateProposalMutation();

  const proposal = proposalQuery.data ?? null;
  const [termsDraft, setTermsDraft] = useState<ProposalTermBlock>(createTermsFromProposal(proposal));
  const [draftMessage, setDraftMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTermsDraft(createTermsFromProposal(proposal));
    setAppliedSuggestions([]);
  }, [
    proposal?.id,
    proposal?.terms.compensation,
    proposal?.terms.deliverables,
    proposal?.terms.exclusivityWindow,
    proposal?.terms.killFee,
    proposal?.terms.schedule
  ]);

  const hasLocalChanges = useMemo(() => {
    if (!proposal) return false;
    return JSON.stringify(termsDraft) !== JSON.stringify(createTermsFromProposal(proposal));
  }, [proposal, termsDraft]);

  const visibleSuggestions = useMemo(
    () => CLAUSE_SUGGESTIONS.filter((suggestion) => !appliedSuggestions.includes(suggestion.id)),
    [appliedSuggestions]
  );

  const riskHints = useMemo(() => {
    const hints: string[] = [];
    if (!termsDraft.schedule.toLowerCase().includes("payment")) {
      hints.push("Payment timing is not clearly stated in the schedule.");
    }
    if (!termsDraft.compensation.toLowerCase().includes("usage")) {
      hints.push("Usage rights are not clearly defined yet.");
    }
    if (!termsDraft.killFee.trim()) {
      hints.push("There is no kill fee recorded if the live is cancelled late.");
    }
    if (!termsDraft.exclusivityWindow.trim()) {
      hints.push("There is no exclusivity window for competing brands.");
    }
    return hints;
  }, [termsDraft]);

  const stepIndex = proposal ? buildRoomStepIndex(proposal) : 0;
  const statusLabel = proposal ? getProposalStatusLabel(proposal.status, proposal.origin) : "";
  const statusClass = proposal ? getProposalStatusBadgeClass(proposal.status) : "";
  const originLabel = proposal ? getProposalOriginLabel(proposal.origin) : "";
  const originClass = proposal ? getProposalOriginBadgeClass(proposal.origin) : "";
  const canRespond = proposal ? canRespondToProposal(proposal) : false;

  const handleSaveTerms = async () => {
    if (!proposal) return;
    try {
      await updateProposalMutation.mutateAsync({
        proposalId: proposal.id,
        payload: {
          terms: termsDraft
        }
      });
      showSuccess("Proposal terms saved.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save proposal terms.");
    }
  };

  const handleApplySuggestion = (suggestion: ClauseSuggestion) => {
    setTermsDraft((current) => ({
      ...current,
      [suggestion.field]: suggestion.value
    }));
    setAppliedSuggestions((current) => [...current, suggestion.id]);
  };

  const handleSendMessage = async () => {
    if (!proposal) return;
    const body = draftMessage.trim();
    if (!body && !attachedFile) return;

    let finalBody = body;
    if (attachedFile) {
      finalBody = `${finalBody}${finalBody ? "\n\n" : ""}[Attachment: ${attachedFile.name}]`;
    }

    try {
      await sendMessageMutation.mutateAsync({
        proposalId: proposal.id,
        payload: { body: finalBody || "[Attachment sent]" }
      });

      if (normalizeProposalStatus(proposal.status) === "draft") {
        await transitionMutation.mutateAsync({
          proposalId: proposal.id,
          payload: {
            status: "in_negotiation",
            note: proposal.notesShort
          }
        });
      }

      setDraftMessage("");
      setAttachedFile(null);
      showSuccess("Message sent.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not send message.");
    }
  };

  const handleTransition = async (status: "accepted" | "declined") => {
    if (!proposal) return;
    try {
      const result = await transitionMutation.mutateAsync({
        proposalId: proposal.id,
        payload: {
          status,
          note:
            status === "accepted"
              ? "Accepted from proposal room."
              : "Declined from proposal room."
        }
      });

      if (status === "accepted" && result.contract) {
        showSuccess(`Accepted. Contract ${result.contract.title} is now available.`);
      } else {
        showSuccess(status === "accepted" ? "Proposal accepted." : "Proposal declined.");
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update proposal status.");
    }
  };

  if (!proposalId) {
    return (
      <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
        <PageHeader pageTitle="Proposal Room" />
        <div className="mx-auto flex w-full max-w-[1200px] px-3 pt-4 sm:px-4 lg:px-8">
          <EmptyPanel
            title="No proposal selected"
            body="Open this page from Proposals Inbox or append ?proposalId=... to the URL to load a negotiation room."
          />
        </div>
      </div>
    );
  }

  if (proposalQuery.isLoading) {
    return (
      <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
        <PageHeader pageTitle="Proposal Room" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <CircularProgress size={28} />
        </div>
      </div>
    );
  }

  if (proposalQuery.isError || !proposal) {
    return (
      <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
        <PageHeader pageTitle="Proposal Room" />
        <div className="mx-auto flex w-full max-w-[1200px] px-3 pt-4 sm:px-4 lg:px-8">
          <EmptyPanel
            title="Proposal not found"
            body="This proposal could not be loaded. It may have been deleted, or the id in the URL may be wrong."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
      <PageHeader
        pageTitle="Proposal Room"
        rightContent={
          <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 xl:flex">
            <span>{proposal.brand}</span>
            <span>•</span>
            <span>{proposal.campaign}</span>
          </div>
        }
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 pt-4 sm:px-4 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-lg font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                {proposal.initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{proposal.brand}</h1>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${originClass}`}>
                    {originLabel}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>
                    {statusLabel}
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
                    onClick={() => void handleTransition("declined")}
                    disabled={transitionMutation.isPending}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/20"
                  >
                    {transitionMutation.isPending ? "Updating..." : "Decline"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTransition("accepted")}
                    disabled={transitionMutation.isPending}
                    className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {transitionMutation.isPending ? "Updating..." : "Accept"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => navigate("/proposals")}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back to inbox
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <MetricCard label="Base fee" value={formatMoney(proposal.baseFeeMax, proposal.currency)} />
            <MetricCard label="Commission" value={`${proposal.commissionPct}%`} />
            <MetricCard label="Estimated value" value={formatMoney(proposal.estimatedValue, proposal.currency)} />
            <MetricCard label="Messages" value={String(proposal.messages.length)} />
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            {STATUS_STEPS.map((label, index) => {
              const active = index <= stepIndex;
              const current = index === stepIndex;
              return (
                <div
                  key={label}
                  className={`rounded-2xl border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide ${
                    active
                      ? current
                        ? "border-[#f77f00] bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-200"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Term editor</h2>
                <button
                  type="button"
                  onClick={() => void handleSaveTerms()}
                  disabled={!hasLocalChanges || updateProposalMutation.isPending}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white transition ${
                    !hasLocalChanges || updateProposalMutation.isPending
                      ? "cursor-not-allowed bg-slate-300 dark:bg-slate-700"
                      : "bg-[#f77f00] hover:bg-[#e26f00]"
                  }`}
                >
                  {updateProposalMutation.isPending ? "Saving..." : hasLocalChanges ? "Save terms" : "Saved"}
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <TermEditor label="Deliverables" value={termsDraft.deliverables} onChange={(value) => setTermsDraft((current) => ({ ...current, deliverables: value }))} />
                <TermEditor label="Schedule" value={termsDraft.schedule} onChange={(value) => setTermsDraft((current) => ({ ...current, schedule: value }))} />
                <TermEditor label="Compensation" value={termsDraft.compensation} onChange={(value) => setTermsDraft((current) => ({ ...current, compensation: value }))} />
                <TermEditor label="Exclusivity window" value={termsDraft.exclusivityWindow} onChange={(value) => setTermsDraft((current) => ({ ...current, exclusivityWindow: value }))} />
                <TermEditor label="Kill fee" value={termsDraft.killFee} onChange={(value) => setTermsDraft((current) => ({ ...current, killFee: value }))} />
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Clause suggestions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {visibleSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {suggestion.title}
                    </button>
                  ))}
                  {visibleSuggestions.length === 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">All preset suggestions have been applied.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Negotiation risk check</h2>
              <div className="mt-4 space-y-2">
                {riskHints.length ? (
                  riskHints.map((hint) => (
                    <div
                      key={hint}
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                    >
                      {hint}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
                    The core commercial points are clearly covered in the current draft.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Room note</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Use this page to keep the commercial conversation in one place. Save terms first, then use the message thread to explain the revision or ask for confirmation.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Conversation</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">{proposal.messages.length} messages</span>
              </div>

              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {proposal.messages.length ? (
                  proposal.messages.map((message) => <MessageBubble key={message.id} message={message} />)
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    No messages yet. Use the composer below to open the negotiation thread.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <textarea
                  rows={5}
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Write your response, counter-offer, or clarification..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(event) => setAttachedFile(event.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Attach file
                    </button>
                    {attachedFile && (
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {attachedFile.name} ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={sendMessageMutation.isPending || (!draftMessage.trim() && !attachedFile)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition ${
                      sendMessageMutation.isPending || (!draftMessage.trim() && !attachedFile)
                        ? "cursor-not-allowed bg-slate-300 dark:bg-slate-700"
                        : "bg-[#f77f00] hover:bg-[#e26f00]"
                    }`}
                  >
                    {sendMessageMutation.isPending ? "Sending..." : "Send message"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick facts</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Offer type" value={proposal.offerType} />
                <MetricCard label="Category" value={proposal.category} />
                <MetricCard label="Region" value={proposal.region} />
                <MetricCard label="Status" value={statusLabel} />
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Short note</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {proposal.notesShort || "No summary note recorded yet."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function TermEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}

function MessageBubble({ message }: { message: ProposalRecord["messages"][number] }) {
  const isCreator = message.from === "creator";
  return (
    <div className={`flex ${isCreator ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl border px-4 py-3 ${
          isCreator
            ? "border-orange-200 bg-orange-50 text-slate-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-slate-100"
            : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        }`}
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <span>{message.name}</span>
          <span>•</span>
          <span>{formatProposalMessageTime(message.time)}</span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="w-full rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}
