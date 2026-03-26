// Round 2 – Page 9: My Contracts – Creator View
// Purpose: Overview of all contracts, their status, and payouts.
// Light mode, EVzone orange primary (#f77f00), premium layout.
// Features:
// • Contracts list with filters: Active, Upcoming, Completed, Terminated
// • Each row: brand, campaign, period, value, remaining tasks, payout status
// • Contract detail pane with summary, deliverables checklist, termination options, timeline
// • Premium extras: Gantt strip for deliverable schedule, Contract health bar

import React, { useState, useMemo } from "react";

import { PageHeader } from "../../components/PageHeader";
import { jsPDF } from "jspdf";
import { useApiResource } from "../../hooks/useApiResource";
import { creatorApi, type ContractRecord } from "../../lib/creatorApi";

const CONTRACT_FILTERS = ["All", "Active", "Upcoming", "Completed", "Terminated"] as const;

type ScheduleSegment = {
  label: string;
  start: number;
  end: number;
};

type Deliverable = {
  id: number;
  label: string;
  due: string;
  done: boolean;
};

type TimelineEvent = {
  date: string;
  label: string;
};

type Contract = {
  id: string;
  brand: string;
  campaign: string;
  period: string;
  status: string;
  value: number;
  currency: string;
  remainingTasks: number;
  totalTasks: number;
  payoutStatus: string;
  health: string;
  healthScore: number;
  schedule: ScheduleSegment[];
  deliverables: Deliverable[];
  timeline: TimelineEvent[];
};

function formatContractDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function mapContractStatus(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "COMPLETED") return "Completed";
  if (normalized === "TERMINATED" || normalized === "CANCELLED") return "Terminated";
  if (normalized === "PENDING" || normalized === "DRAFT" || normalized === "UPCOMING") return "Upcoming";
  return "Active";
}

function mapDeliverables(deliverables: unknown[], totalTasks: number): Deliverable[] {
  const mapped = deliverables
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const payload = item as Record<string, unknown>;
      return {
        id: Number(payload.id || index + 1),
        label: String(payload.label || payload.title || `Deliverable ${index + 1}`),
        due: String(payload.due || payload.dueAt || "TBD"),
        done: Boolean(payload.done || payload.completed)
      };
    })
    .filter((item): item is Deliverable => Boolean(item));

  if (mapped.length > 0) return mapped;

  return Array.from({ length: Math.max(0, totalTasks) }).map((_, index) => ({
    id: index + 1,
    label: `Deliverable ${index + 1}`,
    due: "TBD",
    done: false
  }));
}

function toContract(record: ContractRecord): Contract {
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const status = mapContractStatus(record.status);
  const totalTasks = Number(record.totalTasks || 0);
  const deliverables = mapDeliverables(Array.isArray(record.deliverables) ? record.deliverables : [], totalTasks);
  const completedTasks = deliverables.filter((item) => item.done).length;
  const schedule = Array.isArray((metadata as { schedule?: unknown[] }).schedule)
    ? ((metadata as { schedule?: unknown[] }).schedule as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const payload = item as Record<string, unknown>;
          return {
            label: String(payload.label || "Stage"),
            start: Number(payload.start || 0),
            end: Number(payload.end || 0)
          };
        })
        .filter((item): item is ScheduleSegment => Boolean(item))
    : [];
  const timeline = Array.isArray((metadata as { timeline?: unknown[] }).timeline)
    ? ((metadata as { timeline?: unknown[] }).timeline as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const payload = item as Record<string, unknown>;
          return {
            date: String(payload.date || formatContractDate(record.createdAt) || "—"),
            label: String(payload.label || "Contract updated")
          };
        })
        .filter((item): item is TimelineEvent => Boolean(item))
    : [];

  return {
    id: record.id,
    brand: String(record.brand || record.sellerName || record.seller || ""),
    campaign: String(record.campaignName || record.campaign || ""),
    period:
      String((metadata as { period?: unknown }).period || "").trim() ||
      [formatContractDate(record.createdAt), formatContractDate(record.updatedAt)].filter(Boolean).join(" – ") ||
      "Current term",
    status,
    value: Number(record.value || 0),
    currency: String(record.currency || "USD"),
    remainingTasks: Math.max(0, totalTasks - completedTasks),
    totalTasks,
    payoutStatus: String((metadata as { payoutStatus?: unknown }).payoutStatus || (status === "Completed" ? "Ready for payout" : "In progress")),
    health: String((metadata as { health?: unknown }).health || (status === "Completed" ? "Completed" : status === "Terminated" ? "Terminated" : "On track")),
    healthScore: Number((metadata as { healthScore?: unknown }).healthScore || (status === "Completed" ? 95 : status === "Terminated" ? 25 : 80)),
    schedule,
    deliverables,
    timeline
  };
}


function ContractsPage() {

  const [activeFilter, setActiveFilter] = useState("Active");
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const { data: contractRecords, setData: setContractRecords } = useApiResource({
    initialData: [] as ContractRecord[],
    loader: () => creatorApi.contracts()
  });
  const contracts = useMemo(() => contractRecords.map(toContract), [contractRecords]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (activeFilter === "All") return true;
      return c.status === activeFilter;
    });
  }, [contracts, activeFilter]);

  const selectedContract = contracts.find((c) => c.id === selectedContractId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      <PageHeader
        pageTitle="My Contracts"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-800 transition-colors">
            <span>📑</span>
            <span>Contracts & payouts</span>
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-4 items-start">
          {/* Contracts list */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-sm font-semibold dark:font-bold dark:text-slate-50">My contracts</h1>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Overview of active, upcoming, completed and terminated contracts.
                </p>
              </div>
              <div className="hidden md:flex flex-col items-end text-xs text-slate-500 dark:text-slate-300">
                <span>
                  Total contracts: <span className="font-semibold dark:font-bold">{contracts.length}</span>
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-1.5 text-xs bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-800 rounded-full transition-colors px-2 py-1.5">
              {CONTRACT_FILTERS.map((f) => {
                const isActive = f === activeFilter;
                return (
                  <button
                    key={f}
                    className={`px-2.5 py-0.5 rounded-full transition-colors ${isActive
                      ? "bg-[#f77f00] text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                      }`}
                    onClick={() => setActiveFilter(f)}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 transition-colors">
              {filteredContracts.length === 0 && (
                <p className="p-3 text-sm text-slate-500 dark:text-slate-300">
                  No contracts in this filter yet.
                </p>
              )}
              {filteredContracts.map((c) => (
                <ContractRow
                  key={c.id}
                  contract={c}
                  active={selectedContract && selectedContract.id === c.id}
                  onSelect={() => setSelectedContractId(c.id)}
                />
              ))}
            </div>
          </section>

          {/* Detail pane */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3 text-sm">
            {!selectedContract ? (
              <div className="flex flex-col items-center justify-center h-full text-sm text-slate-500 dark:text-slate-300">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-100 mb-1">
                  Select a contract to view details
                </p>
                <p className="text-xs max-w-xs text-center">
                  You will see the full scope, deliverable schedule, health and payout status for the selected contract.
                </p>
              </div>
            ) : (
              <ContractDetail
                contract={selectedContract}
                onTerminationRequested={() => {
                  setContractRecords((prev) =>
                    prev.map((item) =>
                      item.id === selectedContract.id
                        ? {
                            ...item,
                            status: "TERMINATED",
                            metadata: {
                              ...(item.metadata && typeof item.metadata === "object" ? item.metadata : {}),
                              health: "Terminated",
                              healthScore: 25,
                              payoutStatus: "Termination requested"
                            }
                          }
                        : item
                    )
                  );
                }}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

type ContractRowProps = {
  contract: Contract;
  active: boolean;
  onSelect: () => void;
};

function ContractRow({ contract, active, onSelect }: ContractRowProps) {
  const remainingLabel = `${contract.remainingTasks}/${contract.totalTasks} tasks`;

  return (
    <button
      className={`w-full text-left px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 transition-colors ${active ? "bg-white dark:bg-slate-800" : "hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
        }`}
      onClick={onSelect}
    >
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50">
            {contract.brand}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 transition-colors">
            {contract.status}
          </span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300">{contract.campaign}</span>
        <span className="text-xs text-slate-500 dark:text-slate-300">Period: {contract.period}</span>
        <span className="text-xs text-slate-500 dark:text-slate-300">
          Remaining: <span className="font-medium text-slate-700 dark:text-slate-100 transition-colors">{remainingLabel}</span>
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-300">
          Payout: <span className="font-medium text-slate-700 dark:text-slate-100 transition-colors">{contract.payoutStatus}</span>
        </span>
      </div>
      <div className="flex flex-col items-end gap-1 min-w-[120px]">
        <span className="text-xs text-slate-500 dark:text-slate-300">Total value</span>
        <span className="text-md font-semibold dark:font-bold text-slate-900 dark:text-slate-100">
          {contract.currency} {contract.value.toLocaleString()}
        </span>
        <ContractHealthPill health={contract.health} score={contract.healthScore} />
      </div>
    </button>
  );
}

type ContractHealthPillProps = {
  health: string;
  score: number;
};

function ContractHealthPill({ health, score }: ContractHealthPillProps) {
  let color = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";
  if (health === "On track") color = "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (health === "At risk") color = "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (health === "Overdue" || health === "Terminated")
    color = "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${color}`}
    >
      <span>📊</span>
      <span>{health}</span>
      <span className="text-tiny text-slate-500 dark:text-slate-300">{score}/100</span>
    </span>
  );
}

type ContractDetailProps = {
  contract: Contract;
  onTerminationRequested: () => void;
};

function ContractDetail({ contract, onTerminationRequested }: ContractDetailProps) {
  const [terminationReason, setTerminationReason] = useState("for-cause");
  const [terminationExplanation, setTerminationExplanation] = useState("");
  const [terminationError, setTerminationError] = useState("");
  const [isTerminationRequested, setIsTerminationRequested] = useState(false);

  const [terminationStatus, setTerminationStatus] = useState<"Idle" | "Requested" | "Acknowledged" | "Resolved">("Idle");
  const [notificationsSentTo, setNotificationsSentTo] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleRequestTermination = async () => {
    if (!terminationExplanation.trim()) {
      setTerminationError("Please provide a clear explanation before requesting termination.");
      return;
    }
    setTerminationError("");
    setIsSimulating(true);
    try {
      await creatorApi.terminateContract(contract.id, `${terminationReason}: ${terminationExplanation.trim()}`);
      setNotificationsSentTo(["Supplier", "EVzone Admin"]);
      setTerminationStatus("Requested");
      setIsTerminationRequested(true);
      onTerminationRequested();
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Use a standard font
    doc.setFont("helvetica", "normal");

    // Header
    doc.setFontSize(20);
    doc.text("CONTRACT AGREEMENT", 20, 20);

    doc.setFontSize(10);
    doc.text("Generated by MyLiveDealz", 20, 26);

    // Separator
    doc.setLineWidth(0.5);
    doc.line(20, 30, 190, 30);

    // Campaign Details
    doc.setFontSize(12);
    doc.text(`Campaign: ${contract.campaign}`, 20, 40);
    doc.text(`Brand: ${contract.brand}`, 20, 48);
    doc.text(`Term: ${contract.period}`, 20, 56);
    doc.text(`Value: ${contract.currency} ${contract.value.toLocaleString()}`, 20, 64);

    // Scope
    doc.setFontSize(14);
    doc.text("Scope of Work", 20, 80);
    doc.setFontSize(12);
    doc.text("- Lives + Shoppable Adz + reporting", 20, 88);

    // Deliverables
    doc.setFontSize(14);
    doc.text("Deliverables & Due Dates", 20, 105);
    doc.setFontSize(11);

    let yPos = 114;
    contract.deliverables.forEach((d) => {
      const status = d.done ? "(Completed)" : "(Pending)";
      doc.text(`- ${d.label}`, 20, yPos);
      doc.text(`Due: ${d.due} ${status}`, 140, yPos);
      yPos += 8;
    });

    // Signature Area
    yPos += 20;
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 80, yPos); // Brand line
    doc.line(120, yPos, 180, yPos); // Creator line

    yPos += 5;
    doc.setFontSize(10);
    doc.text(`Signed by ${contract.brand}`, 20, yPos);
    doc.text("Signed by Creator", 120, yPos);

    const dateStr = contract.timeline[0]?.date || "—";
    yPos += 5;
    doc.text(`Date: ${dateStr}`, 20, yPos);
    doc.text(`Date: ${dateStr}`, 120, yPos);

    // Save
    doc.save(`${contract.id}_Contract_${contract.brand.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="flex flex-col gap-3 h-full text-sm">
      {/* Summary card */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-slate-50 dark:bg-slate-800 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-0.5">{contract.campaign}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-200 mb-0.5">{contract.brand}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">Scope: Lives + Shoppable Adz + reporting.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleDownloadPDF}
              className="mb-1 text-xs px-3 py-1.5 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00] font-semibold transition-colors flex items-center gap-1 shadow-sm"
            >
              <span>📄</span>
              <span>Download Contract</span>
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-300">Contract term</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-50">
              {contract.period}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300 mt-1">Compensation</span>
            <span className="text-md font-semibold text-slate-900 dark:text-slate-100">
              {contract.currency} {contract.value.toLocaleString()}
            </span>
          </div>
        </div>
        <ContractHealthBar health={contract.health} score={contract.healthScore} />
      </div>

      {/* Gantt strip */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-white dark:bg-slate-800 transition-colors">
        <h3 className="text-xs font-semibold dark:font-bold mb-1">Deliverable schedule</h3>
        <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">
          Visual overview of when each block of work is expected across the contract period.
        </p>
        <GanttStrip schedule={contract.schedule} />
      </div>

      {/* Deliverables checklist */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 flex flex-col gap-2 transition-colors">
        <h3 className="text-xs font-semibold dark:font-bold mb-1">Deliverables checklist</h3>
        <DeliverablesChecklist deliverables={contract.deliverables} />
      </div>

      {/* Termination options + timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 flex flex-col gap-2 transition-colors relative overflow-hidden">
          {isSimulating && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-[#f77f00] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Dispatching notifications...</p>
            </div>
          )}

          <h3 className="text-xs font-semibold dark:font-bold mb-1">Termination Flow</h3>

          {terminationStatus === "Idle" ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Request to terminate this contract. Notifications will be sent to the Supplier and EVzone Admin.
              </p>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-100 mb-0.5">
                Reason
              </label>
              <select
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
              >
                <option value="for-cause">For cause (breach, non-payment, etc.)</option>
                <option value="without-cause">Without cause</option>
                <option value="mutual">Mutual agreement</option>
              </select>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-100 mt-1">
                Explanation (required)
              </label>
              <textarea
                rows={3}
                className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-[#f77f00] outline-none resize-none transition-colors"
                placeholder="Describe why you are requesting termination..."
                value={terminationExplanation}
                onChange={(e) => setTerminationExplanation(e.target.value)}
              />
              {terminationError && (
                <p className="text-xs text-red-500 dark:text-red-400">{terminationError}</p>
              )}
              <button
                className="mt-1 self-start px-4 py-2 rounded-full text-sm font-semibold bg-[#f77f00] text-white hover:bg-[#e26f00] transition-colors shadow-sm"
                onClick={handleRequestTermination}
              >
                Request termination
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px]">✓</span>
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Termination Request Sent</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-tiny uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">Simultaneous Notifications Sent To:</p>
                  <div className="flex flex-wrap gap-2">
                    {notificationsSentTo.map(target => (
                      <span key={target} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-tiny font-medium text-emerald-700 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {target}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="text-tiny uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">Status Tracker</h4>
                <div className="relative flex justify-between items-start pt-2 px-2">
                  {/* Progress Line */}
                  <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-1000"
                      style={{ width: terminationStatus === 'Requested' ? '0%' : terminationStatus === 'Acknowledged' ? '50%' : '100%' }}
                    />
                  </div>

                  {['Requested', 'Acknowledged', 'Resolved'].map((step, idx) => {
                    const isCompleted = ['Requested', 'Acknowledged', 'Resolved'].indexOf(terminationStatus) >= idx;
                    const isActive = terminationStatus === step;

                    return (
                      <div key={step} className="relative flex flex-col items-center gap-2 z-10 w-24 text-center">
                        <div className={`w-5 h-5 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          }`}>
                          {isCompleted ? <span className="text-[10px]">✓</span> : <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />}
                        </div>
                        <span className={`text-[10px] font-bold transition-colors ${isActive ? "text-[#f77f00]" : isCompleted ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
                          }`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 flex flex-col gap-2 transition-colors">
          <h3 className="text-xs font-semibold dark:font-bold dark:text-slate-50 mb-1">Timeline of events</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Key milestones from negotiation to lives, deliverables and payouts.
          </p>
          <TimelineEvents events={contract.timeline} />
        </div>
      </div>
    </div>
  );
}

type ContractHealthBarProps = {
  health: string;
  score: number;
};

function ContractHealthBar({ health, score }: ContractHealthBarProps) {
  let color = "bg-slate-200 dark:bg-slate-600";
  if (health === "On track") color = "bg-emerald-500";
  if (health === "At risk") color = "bg-amber-500";
  if (health === "Overdue" || health === "Terminated") color = "bg-red-500";

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300 mb-1">
        <span>Contract health</span>
        <span>
          {health} · {score}/100
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden transition-colors">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

type GanttStripProps = {
  schedule: ScheduleSegment[];
};

function GanttStrip({ schedule }: GanttStripProps) {
  return (
    <div className="w-full border border-slate-100 dark:border-slate-700 rounded-xl px-2 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          <div className="w-full h-px bg-slate-200 dark:bg-slate-600 transition-colors" />
        </div>
        {schedule.map((seg: ScheduleSegment, idx: number) => (
          <div
            key={idx}
            className="absolute h-3 rounded-full bg-[#f77f00]/20 border border-[#f77f00]/60 flex items-center justify-center"
            style={{ left: `${seg.start}%`, width: `${seg.end - seg.start}%` }}
          >
            <span className="text-tiny text-slate-700 dark:text-slate-100 px-1 truncate">
              {seg.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1 text-tiny text-slate-400 dark:text-slate-400">
        <span>Start</span>
        <span>Mid</span>
        <span>End</span>
      </div>
    </div>
  );
}

type DeliverablesChecklistProps = {
  deliverables: Deliverable[];
};

function DeliverablesChecklist({ deliverables }: DeliverablesChecklistProps) {
  const doneCount = deliverables.filter((d: Deliverable) => d.done).length;
  const total = deliverables.length || 1;
  const progress = (doneCount / total) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 dark:text-slate-300">
          {doneCount} of {total} deliverables completed
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-300">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2 transition-colors">
        <div
          className="h-full rounded-full bg-[#03cd8c]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="space-y-1">
        {deliverables.map((d: Deliverable) => (
          <li
            key={d.id}
            className="flex items-start justify-between gap-2 border border-slate-100 dark:border-slate-700 rounded-xl px-2 py-1 bg-white dark:bg-slate-800 transition-colors"
          >
            <div className="flex items-start gap-1.5">
              <span
                className={`mt-0.5 h-3 w-3 rounded border flex items-center justify-center text-tiny ${d.done
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-slate-300 dark:border-slate-600"
                  }`}
              >
                {d.done ? "✓" : ""}
              </span>
              <div>
                <p
                  className={`text-sm ${d.done ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"
                    }`}
                >
                  {d.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">Due: {d.due}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type TimelineEventsProps = {
  events: TimelineEvent[];
};

function TimelineEvents({ events }: TimelineEventsProps) {
  return (
    <div className="relative pl-4 border-l border-dashed border-slate-300 mt-1">
      {events.map((evt: TimelineEvent, idx: number) => (
        <div key={idx} className="mb-2 last:mb-0">
          <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 transition-colors" />
          <div className="ml-2">
            <div className="text-xs text-slate-500 dark:text-slate-300">{evt.date}</div>
            <div className="text-sm text-slate-800 dark:text-slate-50">{evt.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { ContractsPage };
