import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { PitchDrawer } from "../../components/PitchDrawer";
import type { CampaignBoardRow } from "../../api/types";
import { useNotification } from "../../contexts/NotificationContext";
import { useCreateProposalMutation } from "../../hooks/api/useProposals";
import { useCampaignBoardQuery } from "../../hooks/api/useDiscoveryMarketplaces";

const STAGES = [
  { id: "leads", label: "Leads" },
  { id: "pitches_sent", label: "Pitches sent" },
  { id: "negotiating", label: "Negotiating" },
  { id: "active_contracts", label: "Active contracts" },
  { id: "completed", label: "Completed" },
  { id: "terminated", label: "Terminated" }
] as const;

type CampaignsBoardPageProps = {
  onChangePage?: (page: string) => void;
};

function humanizeStage(stage: string) {
  const match = STAGES.find((entry) => entry.id === stage);
  return match?.label || stage;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${currency || "USD"} ${Number(value || 0).toLocaleString()}`;
  }
}

function toneForHealth(health: string | undefined) {
  const value = String(health || "").toLowerCase();
  if (value.includes("risk")) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  if (value.includes("stalled") || value.includes("terminated")) return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
}

function originLabel(value: string) {
  return value === "seller-invite" ? "Seller invite" : "Creator pitch";
}

function sortCampaignRows(items: CampaignBoardRow[], sortKey: string) {
  const next = [...items];
  next.sort((left, right) => {
    if (sortKey === "value") return Number(right.estValue || 0) - Number(left.estValue || 0);
    if (sortKey === "seller") return String(left.seller || "").localeCompare(String(right.seller || ""));
    return String(left.lastActivity || "").localeCompare(String(right.lastActivity || "")) * -1;
  });
  return next;
}

export function CampaignsBoardPage({ onChangePage: _onChangePage }: CampaignsBoardPageProps = {}) {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"value" | "seller" | "activity">("value");
  const [pitchRow, setPitchRow] = useState<CampaignBoardRow | null>(null);

  const boardQuery = useCampaignBoardQuery({
    q: search || undefined,
    stage: stageFilter !== "all" ? stageFilter : undefined
  });
  const createProposalMutation = useCreateProposalMutation();

  const rows = useMemo(() => sortCampaignRows(boardQuery.data?.items ?? [], sortKey), [boardQuery.data?.items, sortKey]);
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.count += 1;
        acc.value += Number(row.estValue || 0);
        if (row.stage === "active_contracts") acc.active += 1;
        if (row.stage === "negotiating") acc.negotiating += 1;
        return acc;
      },
      { count: 0, value: 0, active: 0, negotiating: 0 }
    );
  }, [rows]);

  const rowsByStage = useMemo(() => {
    return STAGES.reduce<Record<string, CampaignBoardRow[]>>((acc, stage) => {
      acc[stage.id] = rows.filter((row) => row.stage === stage.id);
      return acc;
    }, {});
  }, [rows]);

  const handlePitchSubmit = async (payload: { collaborationModel: "Flat fee" | "Commission" | "Hybrid"; message: string }) => {
    if (!pitchRow) return;
    try {
      const proposal = await createProposalMutation.mutateAsync({
        sellerId: pitchRow.sellerId,
        campaign: pitchRow.title,
        offerType: pitchRow.type,
        category: "General",
        region: pitchRow.region || "Global",
        baseFeeMin: Number(pitchRow.estValue || 0),
        baseFeeMax: Number(pitchRow.estValue || 0),
        currency: pitchRow.currency || "USD",
        estimatedValue: Number(pitchRow.estValue || 0),
        origin: "creator",
        notesShort: payload.message,
        deliverables: pitchRow.type,
        compensation: `${payload.collaborationModel} · ${formatMoney(pitchRow.estValue || 0, pitchRow.currency || "USD")}`,
        schedule: pitchRow.nextAction || "To be agreed",
        exclusivityWindow: "To be agreed",
        killFee: "To be agreed"
      });
      showSuccess("Pitch created. Opening proposal room.");
      setPitchRow(null);
      navigate(`/proposal-room?proposalId=${encodeURIComponent(proposal.id)}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not create that pitch.");
    }
  };

  const openPrimaryAction = (row: CampaignBoardRow) => {
    if (row.proposalId) {
      navigate(`/proposal-room?proposalId=${encodeURIComponent(row.proposalId)}`);
      return;
    }
    if (row.contractId) {
      navigate(`/contracts?contractId=${encodeURIComponent(row.contractId)}`);
      return;
    }
    if (row.latestLiveSessionId) {
      navigate(`/live-studio?sessionId=${encodeURIComponent(row.latestLiveSessionId)}`);
      return;
    }
    if (row.latestAdCampaignId) {
      navigate(`/promo-ad-detail?promoId=${encodeURIComponent(row.latestAdCampaignId)}`);
      return;
    }
    navigate("/opportunities");
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader
        pageTitle="Campaigns Board"
        mobileViewType="inline-right"
        rightContent={
          <button
            type="button"
            onClick={() => navigate("/opportunities")}
            className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#df7300]"
          >
            + New pitch
          </button>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-6 sm:px-4 lg:px-8">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pipeline rows</p>
            <p className="mt-2 text-2xl font-bold">{totals.count}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estimated value</p>
            <p className="mt-2 text-2xl font-bold text-[#f77f00]">{formatMoney(totals.value, "USD")}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Negotiating</p>
            <p className="mt-2 text-2xl font-bold">{totals.negotiating}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active contracts</p>
            <p className="mt-2 text-2xl font-bold">{totals.active}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_220px_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search campaigns, sellers, next actions"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950"
            />
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="all">All stages</option>
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.label}</option>
              ))}
            </select>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as "value" | "seller" | "activity")} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="value">Sort by value</option>
              <option value="activity">Sort by activity</option>
              <option value="seller">Sort by seller</option>
            </select>
          </div>
        </section>

        {boardQuery.isLoading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Loading campaign pipeline…
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-6">
            {STAGES.map((stage) => (
              <div key={stage.id} className="min-h-[320px] rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <div>
                    <h2 className="text-sm font-semibold">{stage.label}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{rowsByStage[stage.id]?.length || 0} rows</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(rowsByStage[stage.id] || []).map((row) => (
                    <article key={row.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                          {originLabel(row.origin)}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneForHealth(row.health)}`}>
                          {row.health || "on-track"}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">{row.title}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{row.seller}</p>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{row.type}</p>

                      <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <p><span className="font-semibold">Value:</span> {formatMoney(row.estValue || 0, row.currency || "USD")}</p>
                        <p><span className="font-semibold">Next:</span> {row.nextAction || "Open pipeline row"}</p>
                        <p><span className="font-semibold">Live / Promo:</span> {row.liveCount || 0} / {row.promoCount || 0}</p>
                      </div>

                      <div className="mt-4 grid gap-2">
                        <button type="button" onClick={() => openPrimaryAction(row)} className="rounded-2xl bg-[#f77f00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#df7300]">
                          Open {humanizeStage(row.stage)}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setPitchRow(row)} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                            Pitch
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (row.contractId) navigate(`/contracts?contractId=${encodeURIComponent(row.contractId)}`);
                              else if (row.latestAdCampaignId) navigate(`/AdzManager?adId=${encodeURIComponent(row.latestAdCampaignId)}`);
                              else if (row.latestLiveSessionId) navigate(`/live-schedule?sessionId=${encodeURIComponent(row.latestLiveSessionId)}`);
                              else navigate("/opportunities");
                            }}
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            Next step
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}

                  {(rowsByStage[stage.id] || []).length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Nothing in {stage.label.toLowerCase()}.
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      <PitchDrawer
        isOpen={Boolean(pitchRow)}
        onClose={() => setPitchRow(null)}
        recipientName={pitchRow?.seller || ""}
        recipientInitials={(pitchRow?.seller || "").slice(0, 2).toUpperCase()}
        recipientRegion={pitchRow?.region}
        defaultCategory={pitchRow?.type}
        onSubmit={handlePitchSubmit}
        submitLabel="Create backend pitch"
      />
    </div>
  );
}
