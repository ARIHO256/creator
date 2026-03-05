import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { jsPDF } from "jspdf";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import type { ContractRecord, TaskRecord } from "../../api/types";
import { useNotification } from "../../contexts/NotificationContext";
import { useContractQuery, useContractsQuery, useRequestContractTerminationMutation } from "../../hooks/api/useContracts";
import { useTasksQuery } from "../../hooks/api/useTasks";
import { formatMoney } from "../../utils/collaborationUi";

const CONTRACT_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "at_risk", label: "At risk" },
  { value: "completed", label: "Completed" },
  { value: "termination_requested", label: "Termination requested" }
] as const;

type ContractFilterValue = (typeof CONTRACT_FILTERS)[number]["value"];

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function getStatusLabel(value: string | null | undefined): string {
  switch (value) {
    case "active":
      return "Active";
    case "at_risk":
      return "At risk";
    case "completed":
      return "Completed";
    case "termination_requested":
      return "Termination requested";
    default:
      return "Active";
  }
}

function getStatusClasses(value: string | null | undefined): string {
  switch (value) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
    case "at_risk":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
    case "termination_requested":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}

function getHealthLabel(value: string | null | undefined): string {
  switch (value) {
    case "on_track":
      return "On track";
    case "at_risk":
      return "At risk";
    case "complete":
      return "Complete";
    default:
      return "On track";
  }
}

function getHealthProgress(value: string | null | undefined): number {
  switch (value) {
    case "on_track":
      return 84;
    case "at_risk":
      return 46;
    case "complete":
      return 100;
    default:
      return 68;
  }
}

function getHealthBarClass(value: string | null | undefined): string {
  switch (value) {
    case "on_track":
      return "bg-emerald-500";
    case "at_risk":
      return "bg-amber-500";
    case "complete":
      return "bg-blue-500";
    default:
      return "bg-slate-500";
  }
}

function buildPdf(contract: ContractRecord, linkedTasks: TaskRecord[]): void {
  const pdf = new jsPDF();
  const lines = [
    `Contract: ${contract.title}`,
    `Brand: ${contract.brand || contract.sellerName || "—"}`,
    `Seller: ${contract.sellerName || "—"}`,
    `Campaign: ${contract.campaignTitle || "—"}`,
    `Status: ${getStatusLabel(contract.status)}`,
    `Health: ${getHealthLabel(contract.health)}`,
    `Value: ${formatMoney(contract.value, contract.currency)}`,
    `Schedule: ${formatDateLabel(contract.startDate)} - ${formatDateLabel(contract.endDate)}`,
    `Deliverables completed: ${contract.deliverablesCompleted ?? 0}/${contract.deliverablesTotal ?? contract.deliverables?.length ?? 0}`,
    `Open linked tasks: ${contract.linkedTasksOpen ?? 0}`,
    "",
    "Timeline:"
  ];

  (contract.timeline ?? []).forEach((event) => {
    lines.push(`- ${formatDateLabel(event.when)}: ${event.what}`);
  });

  lines.push("", "Linked tasks:");
  linkedTasks.forEach((task) => {
    lines.push(`- ${task.title} [${task.column}] due ${formatDateLabel(task.dueAt)}`);
  });

  let y = 16;
  pdf.setFontSize(12);
  lines.forEach((line) => {
    if (y > 280) {
      pdf.addPage();
      y = 16;
    }
    pdf.text(line, 14, y);
    y += 7;
  });

  pdf.save(`${contract.id}.pdf`);
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</div> : null}
    </div>
  );
}

function TaskListItem({ task }: { task: TaskRecord }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{task.type} • due {task.dueLabel || formatDateLabel(task.dueAt)}</div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {task.column.replace(/_/g, " ")}
        </span>
      </div>
    </div>
  );
}

function ContractDetail({ contract, linkedTasks, onOpenTaskBoard, onDownloadPdf, onSubmitTermination, isSubmittingTermination }: {
  contract: ContractRecord;
  linkedTasks: TaskRecord[];
  onOpenTaskBoard: () => void;
  onDownloadPdf: () => void;
  onSubmitTermination: (reason: string, explanation: string) => Promise<void>;
  isSubmittingTermination: boolean;
}) {
  const [terminationReason, setTerminationReason] = useState("for_cause");
  const [terminationExplanation, setTerminationExplanation] = useState("");

  const deliverablesCompleted = contract.deliverablesCompleted ?? 0;
  const deliverablesTotal = contract.deliverablesTotal ?? contract.deliverables?.length ?? 0;
  const healthProgress = getHealthProgress(contract.health);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{contract.title}</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(contract.status)}`}>
                {getStatusLabel(contract.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{contract.brand || contract.sellerName || "Brand pending"}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {contract.campaignTitle || "Campaign not linked"} • {formatDateLabel(contract.startDate)} to {formatDateLabel(contract.endDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenTaskBoard}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Open task board
            </button>
            <button
              type="button"
              onClick={onDownloadPdf}
              className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00]"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Contract value" value={formatMoney(contract.value, contract.currency)} helper="Flat fee + commission summary" />
          <SummaryCard label="Deliverables" value={`${deliverablesCompleted}/${deliverablesTotal}`} helper="Completed vs required" />
          <SummaryCard label="Open tasks" value={String(contract.linkedTasksOpen ?? linkedTasks.filter((task) => task.column !== "approved").length)} helper="Still waiting on delivery" />
          <SummaryCard label="Health" value={getHealthLabel(contract.health)} helper={getStatusLabel(contract.status)} />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Health progress</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">This is a quick operational indicator from the backend state.</div>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{healthProgress}%</div>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className={`h-full rounded-full ${getHealthBarClass(contract.health)}`} style={{ width: `${healthProgress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col gap-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Deliverables</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Every deliverable below is coming directly from the contract record.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {(contract.deliverables ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No deliverables were recorded for this contract yet.</p>
              ) : (
                (contract.deliverables ?? []).map((deliverable) => (
                  <div key={deliverable.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${deliverable.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"}`}>
                      {deliverable.done ? "✓" : "•"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${deliverable.done ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                        {deliverable.label}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{deliverable.type || "deliverable"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Linked tasks</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Task Board is now reading the same backend record set.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {linkedTasks.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">There are no task records for this contract yet.</p>
              ) : (
                linkedTasks.slice(0, 6).map((task) => <TaskListItem key={task.id} task={task} />)
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Timeline</h3>
            <div className="mt-4 space-y-3">
              {(contract.timeline ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No timeline updates have been logged yet.</p>
              ) : (
                (contract.timeline ?? []).map((event, index) => (
                  <div key={`${event.when}-${event.what}-${index}`} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{formatDateLabel(event.when)}</div>
                    <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{event.what}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Termination request</h3>
            {contract.termination?.requested ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                <div className="font-semibold">Termination already requested</div>
                <div className="mt-2">Reason: {contract.termination.reason || "—"}</div>
                <div className="mt-1">Explanation: {contract.termination.explanation || "—"}</div>
              </div>
            ) : (
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onSubmitTermination(terminationReason, terminationExplanation);
                }}
              >
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Reason
                  <select
                    value={terminationReason}
                    onChange={(event) => setTerminationReason(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="for_cause">For cause</option>
                    <option value="scope_change">Scope changed</option>
                    <option value="timeline_breakdown">Timeline breakdown</option>
                    <option value="payment_issue">Payment issue</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Explanation
                  <textarea
                    value={terminationExplanation}
                    onChange={(event) => setTerminationExplanation(event.target.value)}
                    rows={4}
                    placeholder="Explain why this contract needs to be terminated."
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSubmittingTermination || !terminationExplanation.trim()}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingTermination ? "Submitting..." : "Submit termination request"}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ContractsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showError, showSuccess } = useNotification();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContractFilterValue>("all");
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>(searchParams.get("contractId")?.trim() || undefined);

  const contractsQuery = useContractsQuery({
    q: search.trim() || undefined,
    status: filter === "all" ? undefined : filter,
    pageSize: 100
  });

  const contracts = contractsQuery.data?.items ?? [];

  useEffect(() => {
    if (contracts.length === 0) {
      setSelectedContractId(undefined);
      return;
    }
    const hasSelection = selectedContractId && contracts.some((contract) => contract.id === selectedContractId);
    if (!hasSelection) {
      setSelectedContractId(contracts[0]?.id);
    }
  }, [contracts, selectedContractId]);

  const selectedListContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? null,
    [contracts, selectedContractId]
  );

  const contractDetailQuery = useContractQuery(selectedContractId, { enabled: Boolean(selectedContractId) });
  const selectedContract = contractDetailQuery.data ?? selectedListContract;

  const linkedTasksQuery = useTasksQuery(
    {
      contractId: selectedContract?.id,
      pageSize: 50
    },
    {
      enabled: Boolean(selectedContract?.id)
    }
  );

  const terminationMutation = useRequestContractTerminationMutation();

  const totalValue = useMemo(
    () => contracts.reduce((sum, contract) => sum + contract.value, 0),
    [contracts]
  );

  const handleSelectContract = (contractId: string) => {
    setSelectedContractId(contractId);
    const next = new URLSearchParams(searchParams);
    next.set("contractId", contractId);
    void navigate({ search: next.toString() }, { replace: true });
  };

  const handleSubmitTermination = async (reason: string, explanation: string) => {
    if (!selectedContract) return;
    try {
      await terminationMutation.mutateAsync({
        contractId: selectedContract.id,
        payload: { reason, explanation }
      });
      showSuccess("Termination request submitted.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not submit termination request.");
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedContract) return;
    buildPdf(selectedContract, linkedTasksQuery.data?.items ?? []);
  };

  return (
    <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
      <PageHeader
        pageTitle="Contracts"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Backend driven • contracts + tasks linked
          </span>
        }
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 pt-4 sm:px-4 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <SummaryCard label="Visible contracts" value={String(contracts.length)} helper="Current filtered list" />
            <SummaryCard label="Pipeline value" value={formatMoney(totalValue, contracts[0]?.currency || "USD")} helper="Filtered total" />
            <SummaryCard label="Active items" value={String(contracts.filter((item) => item.status === "active").length)} helper="Contracts in flight" />
            <SummaryCard label="At risk / termination" value={String(contracts.filter((item) => item.status === "at_risk" || item.status === "termination_requested").length)} helper="Need attention" />
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">My contracts</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">This list is now served from the collaboration API.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search brand, campaign, status"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <div className="flex flex-wrap gap-2">
                  {CONTRACT_FILTERS.map((entry) => (
                    <button
                      key={entry.value}
                      type="button"
                      onClick={() => setFilter(entry.value)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${filter === entry.value ? "bg-[#f77f00] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {contractsQuery.isLoading ? (
                <div className="flex min-h-[220px] items-center justify-center">
                  <CircularProgress size={28} />
                </div>
              ) : contracts.length === 0 ? (
                <EmptyPanel title="No contracts found" body="Adjust the search or filter to see a different contract set." />
              ) : (
                contracts.map((contract) => {
                  const isActive = contract.id === selectedContractId;
                  return (
                    <button
                      key={contract.id}
                      type="button"
                      onClick={() => handleSelectContract(contract.id)}
                      className={`w-full rounded-3xl border p-4 text-left transition ${isActive ? "border-[#f77f00] bg-orange-50/70 dark:border-[#f77f00] dark:bg-orange-950/20" : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-800/50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{contract.title}</div>
                            <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getStatusClasses(contract.status)}`}>
                              {getStatusLabel(contract.status)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{contract.brand || contract.sellerName || "Brand pending"}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{contract.campaignTitle || "No campaign linked"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(contract.value, contract.currency)}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateLabel(contract.startDate)} - {formatDateLabel(contract.endDate)}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          Deliverables: <span className="font-semibold text-slate-900 dark:text-slate-100">{contract.deliverablesCompleted ?? 0}/{contract.deliverablesTotal ?? contract.deliverables?.length ?? 0}</span>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          Open tasks: <span className="font-semibold text-slate-900 dark:text-slate-100">{contract.linkedTasksOpen ?? 0}</span>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          Health: <span className="font-semibold text-slate-900 dark:text-slate-100">{getHealthLabel(contract.health)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section>
            {selectedContract ? (
              contractDetailQuery.isLoading && !selectedListContract ? (
                <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <CircularProgress size={28} />
                </div>
              ) : (
                <ContractDetail
                  contract={selectedContract}
                  linkedTasks={linkedTasksQuery.data?.items ?? []}
                  onOpenTaskBoard={() => void navigate(`/task-board?contractId=${encodeURIComponent(selectedContract.id)}`)}
                  onDownloadPdf={handleDownloadPdf}
                  onSubmitTermination={handleSubmitTermination}
                  isSubmittingTermination={terminationMutation.isPending}
                />
              )
            ) : (
              <EmptyPanel title="Select a contract" body="Pick a contract from the left to inspect deliverables, timeline, linked tasks, and termination flow." />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export { ContractsPage };
