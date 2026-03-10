import React, { useMemo, useState, useEffect } from "react";

/**
 * SupplierContractsPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: ContractsPage.tsx (Creator View)
 *
 * Mirror-first preserved:
 * - PageHeader + badge
 * - 2-column layout: left list (filters + rows) and right detail pane
 * - Same filter pill row: All / Active / Upcoming / Completed / Terminated
 * - Row content hierarchy + health pill
 * - Detail content blocks: Summary + health bar, Gantt strip, Deliverables checklist, Termination flow + Timeline
 *
 * Supplier adaptations (minimal + mandatory):
 * - Counterparty becomes the Creator (not Supplier/Brand)
 * - Termination notifications go to Creator + EVzone Admin
 * - Deliverables checklist includes supplier-side actions when Approval Mode is Manual:
 *   Approve / Request changes / Reject (with confirmation)
 * - “Download Contract” implemented as Print-to-PDF (browser print dialog)
 *
 * Notes:
 * - Dependency-free: no jsPDF, no external UI libs.
 * - Replace toast/navigation stubs with react-router + API in the Vite project.
 */

const ORANGE = "#f77f00";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function money(n, currency = "USD") {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-UG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(v);
  } catch {
    return `${currency} ${Math.round(v).toLocaleString()}`;
  }
}

/* -------------------------------- Toast -------------------------------- */

let __toastTimer = null;
function toast(message) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mldz-toast", { detail: message }));
}

function ToastArea() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      setMsg(e.detail);
      if (__toastTimer) clearTimeout(__toastTimer);
      __toastTimer = setTimeout(() => setMsg(null), 1700);
    };
    window.addEventListener("mldz-toast", handler);
    return () => window.removeEventListener("mldz-toast", handler);
  }, []);

  if (!msg) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
      <div className="px-4 py-2 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] shadow-lg border border-slate-800 dark:border-slate-200">
        {msg}
      </div>
    </div>
  );
}

/* -------------------------------- Header ------------------------------- */

function PageHeader({ pageTitle, badge, right }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50">{pageTitle}</h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}



function ConfirmModal({ isOpen, title, message, confirmText = "Confirm", confirmClass = "bg-slate-900 hover:bg-black", onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</div>
          <button className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800" onClick={onClose} type="button">
            ✕
          </button>
        </div>
        <div className="px-4 py-4">
          <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{message}</div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-[11px] font-extrabold"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button className={cx("px-4 py-2 rounded-full text-[11px] font-extrabold text-white", confirmClass)} onClick={onConfirm} type="button">
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Data ----------------------------------- */

const CONTRACT_FILTERS = ["All", "Active", "Upcoming", "Completed", "Terminated"];

const MOCK_CONTRACTS = [
  {
    id: "SC-201",
    creator: "Lilian Beauty Plug",
    campaign: "GlowUp Serum Promo",
    period: "Feb 25 – Mar 20, 2026",
    status: "Active",
    currency: "USD",
    value: 1200,
    remainingTasks: 2,
    totalTasks: 7,
    payoutStatus: "Milestone 1 paid · Milestone 2 pending",
    health: "On track",
    healthScore: 84,

    // Supplier campaign-level context
    approvalMode: "Manual", // Manual | Auto
    collabMode: "Open for Collabs",
    creatorUsageDecision: "I will use a Creator",
    multiCreatorCampaign: true,

    deliverables: [
      { id: "D-01", label: "Product brief sync call", due: "Feb 25", status: "Approved" },
      { id: "D-02", label: "Live outline + CTA plan", due: "Feb 27", status: "Approved" },
      { id: "D-03", label: "Clip #1 (hook + offer)", due: "Feb 29", status: "Submitted" },
      { id: "D-04", label: "Clip #2 (routine demo)", due: "Mar 02", status: "Changes Requested" },
      { id: "D-05", label: "Live session (60–75 mins)", due: "Mar 05", status: "Pending" },
      { id: "D-06", label: "Replay captions + timestamps", due: "Mar 06", status: "Pending" },
      { id: "D-07", label: "Performance report (48h post-live)", due: "Mar 08", status: "Pending" }
    ],

    schedule: [
      { label: "Brief", start: 4, end: 18 },
      { label: "Asset build", start: 18, end: 44 },
      { label: "Live", start: 44, end: 56 },
      { label: "Post", start: 56, end: 70 },
      { label: "Reporting", start: 70, end: 86 }
    ],

    timeline: [
      { date: "Feb 24", label: "Proposal accepted" },
      { date: "Feb 25", label: "Contract signed + kickoff" },
      { date: "Feb 27", label: "Outline approved" },
      { date: "Feb 29", label: "Clip #1 submitted" },
      { date: "Mar 02", label: "Changes requested on Clip #2" },
      { date: "Mar 05", label: "Live scheduled" }
    ]
  },
  {
    id: "SC-202",
    creator: "TechWithBrian",
    campaign: "Tech Friday Mega",
    period: "Mar 01 – Apr 05, 2026",
    status: "Upcoming",
    currency: "USD",
    value: 1600,
    remainingTasks: 5,
    totalTasks: 9,
    payoutStatus: "Deposit pending",
    health: "At risk",
    healthScore: 63,

    approvalMode: "Auto",
    collabMode: "Invite-Only",
    creatorUsageDecision: "I will use a Creator",
    multiCreatorCampaign: false,

    deliverables: [
      { id: "D-11", label: "Product list confirmation", due: "Mar 01", status: "Pending" },
      { id: "D-12", label: "Episode #1 run-sheet", due: "Mar 03", status: "Pending" },
      { id: "D-13", label: "Episode #1 live", due: "Mar 06", status: "Pending" },
      { id: "D-14", label: "Episode #2 live", due: "Mar 13", status: "Pending" },
      { id: "D-15", label: "Episode #3 live", due: "Mar 20", status: "Pending" },
      { id: "D-16", label: "Series recap clip", due: "Mar 22", status: "Pending" },
      { id: "D-17", label: "Final performance report", due: "Mar 25", status: "Pending" }
    ],

    schedule: [
      { label: "Prep", start: 8, end: 28 },
      { label: "Series", start: 28, end: 74 },
      { label: "Recap", start: 74, end: 84 }
    ],

    timeline: [
      { date: "Feb 20", label: "Invite accepted" },
      { date: "Feb 22", label: "Contract drafted" },
      { date: "Feb 25", label: "Awaiting deposit" }
    ]
  },
  {
    id: "SC-203",
    creator: "Amina K.",
    campaign: "Beauty Flash Dealz",
    period: "Feb 10 – Feb 18, 2026",
    status: "Completed",
    currency: "USD",
    value: 950,
    remainingTasks: 0,
    totalTasks: 6,
    payoutStatus: "Fully paid",
    health: "On track",
    healthScore: 96,

    approvalMode: "Manual",
    collabMode: "Invite-Only",
    creatorUsageDecision: "I will use a Creator",
    multiCreatorCampaign: false,

    deliverables: [
      { id: "D-21", label: "Kickoff call", due: "Feb 10", status: "Approved" },
      { id: "D-22", label: "Live outline", due: "Feb 11", status: "Approved" },
      { id: "D-23", label: "Live session", due: "Feb 12", status: "Approved" },
      { id: "D-24", label: "Clip #1", due: "Feb 13", status: "Approved" },
      { id: "D-25", label: "Clip #2", due: "Feb 14", status: "Approved" },
      { id: "D-26", label: "Final report", due: "Feb 16", status: "Approved" }
    ],

    schedule: [
      { label: "Prep", start: 10, end: 30 },
      { label: "Live", start: 30, end: 45 },
      { label: "Post", start: 45, end: 70 },
      { label: "Report", start: 70, end: 85 }
    ],

    timeline: [
      { date: "Feb 09", label: "Proposal accepted" },
      { date: "Feb 10", label: "Contract signed" },
      { date: "Feb 12", label: "Live executed" },
      { date: "Feb 16", label: "Report delivered" },
      { date: "Feb 18", label: "Payout settled" }
    ]
  },
  {
    id: "SC-204",
    creator: "EV Gadgets Daily",
    campaign: "EV Accessories Launch",
    period: "Jan 20 – Feb 01, 2026",
    status: "Terminated",
    currency: "USD",
    value: 600,
    remainingTasks: 0,
    totalTasks: 5,
    payoutStatus: "Partial pay · Dispute resolved",
    health: "Terminated",
    healthScore: 28,

    approvalMode: "Manual",
    collabMode: "Open for Collabs",
    creatorUsageDecision: "I will use a Creator",
    multiCreatorCampaign: true,

    deliverables: [
      { id: "D-31", label: "Kickoff", due: "Jan 20", status: "Approved" },
      { id: "D-32", label: "Ad Creative #1", due: "Jan 22", status: "Rejected" },
      { id: "D-33", label: "Ad Creative #2", due: "Jan 24", status: "Rejected" },
      { id: "D-34", label: "Live demo", due: "Jan 28", status: "Pending" },
      { id: "D-35", label: "Close-out report", due: "Jan 30", status: "Pending" }
    ],

    schedule: [
      { label: "Prep", start: 6, end: 26 },
      { label: "Assets", start: 26, end: 48 },
      { label: "Live", start: 48, end: 60 }
    ],

    timeline: [
      { date: "Jan 19", label: "Contract signed" },
      { date: "Jan 22", label: "Creative rejected" },
      { date: "Jan 25", label: "Renegotiation started" },
      { date: "Jan 31", label: "Termination resolved" }
    ]
  }
];

/* ----------------------------- Subcomponents ---------------------------- */

function ContractHealthPill({ health, score }) {
  let color = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";
  if (health === "On track") color = "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (health === "At risk") color = "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (health === "Overdue" || health === "Terminated") color = "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";

  return (
    <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs", color)}>
      <span>📊</span>
      <span>{health}</span>
      <span className="text-[10px] text-slate-500 dark:text-slate-300">{score}/100</span>
    </span>
  );
}

function ContractHealthBar({ health, score }) {
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
        <div className={cx("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

function GanttStrip({ schedule }) {
  return (
    <div className="w-full border border-slate-100 dark:border-slate-700 rounded-xl px-2 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          <div className="w-full h-px bg-slate-200 dark:bg-slate-600 transition-colors" />
        </div>
        {schedule.map((seg, idx) => (
          <div
            key={idx}
            className="absolute h-3 rounded-full bg-[#f77f00]/20 border border-[#f77f00]/60 flex items-center justify-center"
            style={{ left: `${seg.start}%`, width: `${Math.max(0, seg.end - seg.start)}%` }}
          >
            <span className="text-[10px] text-slate-700 dark:text-slate-100 px-1 truncate">{seg.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 dark:text-slate-400">
        <span>Start</span>
        <span>Mid</span>
        <span>End</span>
      </div>
    </div>
  );
}

function statusToTone(status) {
  if (status === "Approved") return "good";
  if (status === "Submitted") return "warn";
  if (status === "Changes Requested") return "bad";
  if (status === "Rejected") return "bad";
  return "neutral";
}

function DeliverableStatusPill({ status }) {
  const tone = statusToTone(status);
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        : tone === "bad"
          ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
          : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  return <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold", cls)}>● {status}</span>;
}

function DeliverablesChecklist({ deliverables, approvalMode, onUpdateDeliverable }) {
  const approvedCount = deliverables.filter((d) => d.status === "Approved").length;
  const total = deliverables.length || 1;
  const progress = (approvedCount / total) * 100;

  const pendingSupplier = deliverables.filter((d) => d.status === "Submitted" || d.status === "Changes Requested").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 dark:text-slate-300">
          {approvedCount} of {total} deliverables approved
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-300">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2 transition-colors">
        <div className="h-full rounded-full bg-[#03cd8c]" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-300 mb-2">
        <span>
          Approval mode: <span className="font-extrabold">{approvalMode}</span>
        </span>
        <span>
          Pending supplier review: <span className={cx("font-extrabold", pendingSupplier ? "text-[#f77f00]" : "")}>{pendingSupplier}</span>
        </span>
      </div>

      <ul className="space-y-1">
        {deliverables.map((d) => {
          const isApproved = d.status === "Approved";
          const canAct = approvalMode === "Manual" && (d.status === "Submitted" || d.status === "Changes Requested");

          return (
            <li
              key={d.id}
              className="flex items-start justify-between gap-2 border border-slate-100 dark:border-slate-700 rounded-xl px-2 py-1 bg-white dark:bg-slate-900 dark:bg-slate-800 transition-colors"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span
                  className={cx(
                    "mt-0.5 h-3 w-3 rounded border flex items-center justify-center text-[10px]",
                    isApproved ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"
                  )}
                >
                  {isApproved ? "✓" : ""}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cx("text-sm truncate", isApproved ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200")}>{d.label}</p>
                    <DeliverableStatusPill status={d.status} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300">Due: {d.due}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                {canAct ? (
                  <div className="flex flex-wrap gap-1 justify-end">
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-extrabold"
                      onClick={() => onUpdateDeliverable(d.id, "Approved")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-[10px] font-extrabold text-amber-800 dark:text-amber-300"
                      onClick={() => onUpdateDeliverable(d.id, "Changes Requested")}
                    >
                      Changes
                    </button>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-[10px] font-extrabold text-rose-700 dark:text-rose-300"
                      onClick={() => onUpdateDeliverable(d.id, "Rejected")}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">{approvalMode === "Auto" ? "Auto-flow" : ""}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 text-[10px] text-slate-500">
        Permission note: Only Supplier Owners/Admins should approve/reject creator deliverables or request changes.
      </div>
    </div>
  );
}

function TimelineEvents({ events }) {
  return (
    <div className="relative pl-4 border-l border-dashed border-slate-300 dark:border-slate-700 mt-1">
      {events.map((evt, idx) => (
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

/* --------------------------- Row + Detail ------------------------------- */

function ContractRow({ contract, active, onSelect }) {
  const remainingLabel = `${contract.remainingTasks}/${contract.totalTasks} tasks`;

  return (
    <button
      className={cx(
        "w-full text-left px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 transition-colors",
        active ? "bg-white dark:bg-slate-900 dark:bg-slate-800" : "hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50">{contract.creator}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 transition-colors">{contract.status}</span>
          {contract.approvalMode ? (
            <span className={cx(
              "text-[10px] px-2 py-0.5 rounded-full border font-extrabold",
              contract.approvalMode === "Manual"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            )}>
              🧾 {contract.approvalMode}
            </span>
          ) : null}
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
      <div className="flex flex-col items-end gap-1 min-w-[140px]">
        <span className="text-xs text-slate-500 dark:text-slate-300">Total value</span>
        <span className="text-md font-semibold dark:font-bold text-slate-900 dark:text-slate-100">{contract.currency} {contract.value.toLocaleString()}</span>
        <ContractHealthPill health={contract.health} score={contract.healthScore} />
      </div>
    </button>
  );
}

function ContractDetail({ contract, onUpdateContract }) {
  const [terminationReason, setTerminationReason] = useState("for-cause");
  const [terminationExplanation, setTerminationExplanation] = useState("");
  const [terminationError, setTerminationError] = useState("");

  const [terminationStatus, setTerminationStatus] = useState("Idle"); // Idle | Requested | Acknowledged | Resolved
  const [notificationsSentTo, setNotificationsSentTo] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const [rejectId, setRejectId] = useState(null);

  const handleRequestTermination = async () => {
    if (!terminationExplanation.trim()) {
      setTerminationError("Please provide a clear explanation before requesting termination.");
      return;
    }
    setTerminationError("");
    setIsSimulating(true);

    setTimeout(() => {
      // Supplier-side: notify Creator + EVzone Admin
      setNotificationsSentTo(["Creator", "EVzone Admin"]);
      setTerminationStatus("Requested");
      setIsSimulating(false);
      toast("Termination request sent");
    }, 1200);
  };

  const printContract = () => {
    if (typeof window === "undefined") return;

    const html = `
      <html>
        <head>
          <title>${contract.id} Contract</title>
          <style>
            body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"; padding:24px;}
            h1{margin:0 0 6px 0;}
            .muted{color:#555; font-size:12px;}
            .box{border:1px solid #ddd; padding:12px; border-radius:12px; margin-top:12px;}
            table{width:100%; border-collapse:collapse; margin-top:8px;}
            td,th{border-bottom:1px solid #eee; padding:8px; font-size:12px; text-align:left;}
            .sig{margin-top:24px; display:flex; justify-content:space-between; gap:24px;}
            .line{border-top:1px solid #333; width:220px; padding-top:6px; font-size:12px;}
          </style>
        </head>
        <body>
          <h1>CONTRACT AGREEMENT</h1>
          <div class="muted">Generated by MyLiveDealz (Supplier Platform)</div>
          <div class="box">
            <div><strong>Campaign:</strong> ${contract.campaign}</div>
            <div><strong>Creator:</strong> ${contract.creator}</div>
            <div><strong>Term:</strong> ${contract.period}</div>
            <div><strong>Value:</strong> ${money(contract.value, contract.currency)}</div>
            <div><strong>Approval Mode:</strong> ${contract.approvalMode}</div>
            <div><strong>Collab Mode:</strong> ${contract.collabMode}</div>
          </div>
          <div class="box">
            <div><strong>Scope of Work</strong></div>
            <div class="muted">Lives + Shoppable Adz + reporting (as applicable per campaign).</div>
          </div>
          <div class="box">
            <div><strong>Deliverables & Due Dates</strong></div>
            <table>
              <thead><tr><th>Deliverable</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                ${contract.deliverables
                  .map((d) => `<tr><td>${d.label}</td><td>${d.due}</td><td>${d.status}</td></tr>`)
                  .join("")}
              </tbody>
            </table>
          </div>
          <div class="sig">
            <div class="line">Signed by Supplier</div>
            <div class="line">Signed by Creator</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      toast("Popup blocked. Allow popups to print/save as PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast("Print dialog opened. Choose Save as PDF.");
  };

  const updateDeliverable = (deliverableId, nextStatus) => {
    if (nextStatus === "Rejected") {
      setRejectId(deliverableId);
      return;
    }
    const next = {
      ...contract,
      deliverables: contract.deliverables.map((d) => (d.id === deliverableId ? { ...d, status: nextStatus } : d))
    };
    onUpdateContract(next);
    toast(`Deliverable updated: ${nextStatus}`);
  };

  const approvedCount = contract.deliverables.filter((d) => d.status === "Approved").length;
  const total = contract.deliverables.length || 1;

  return (
    <div className="flex flex-col gap-3 h-full text-sm">
      {/* Summary card */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 transition-colors">
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-0.5 truncate">{contract.campaign}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-200 mb-0.5 truncate">Creator: {contract.creator}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">Scope: Lives + Shoppable Adz + reporting.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={cx(
                "text-[10px] px-2 py-0.5 rounded-full border font-extrabold",
                contract.creatorUsageDecision === "I will use a Creator"
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
              )}>
                🎭 {contract.creatorUsageDecision}
              </span>
              <span className={cx(
                "text-[10px] px-2 py-0.5 rounded-full border font-extrabold",
                contract.collabMode === "Open for Collabs"
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
              )}>
                🤝 {contract.collabMode}
              </span>
              <span className={cx(
                "text-[10px] px-2 py-0.5 rounded-full border font-extrabold",
                contract.approvalMode === "Manual"
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                  : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              )}>
                🧾 {contract.approvalMode}
              </span>
              {contract.multiCreatorCampaign ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-extrabold">
                  👥 Multi-creator campaign
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 min-w-[170px]">
            <button
              onClick={printContract}
              className="mb-1 text-xs px-3 py-1.5 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00] font-semibold transition-colors flex items-center gap-1 shadow-sm"
              type="button"
              title="Opens print dialog (Save as PDF)"
            >
              <span>📄</span>
              <span>Download Contract</span>
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-300">Contract term</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-50">{contract.period}</span>
            <span className="text-xs text-slate-500 dark:text-slate-300 mt-1">Compensation</span>
            <span className="text-md font-semibold text-slate-900 dark:text-slate-100">{contract.currency} {contract.value.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-1">Payout: <span className="font-extrabold">{contract.payoutStatus}</span></span>
          </div>
        </div>

        <ContractHealthBar health={contract.health} score={contract.healthScore} />
      </div>

      {/* Gantt strip */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-white dark:bg-slate-900 dark:bg-slate-800 transition-colors">
        <h3 className="text-xs font-semibold dark:font-bold mb-1">Deliverable schedule</h3>
        <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">Visual overview of expected work blocks across the contract period.</p>
        <GanttStrip schedule={contract.schedule} />
      </div>

      {/* Deliverables checklist */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 flex flex-col gap-2 transition-colors">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold dark:font-bold">Deliverables checklist</h3>
          <span className="text-[10px] text-slate-500">
            Approved: <span className="font-extrabold">{approvedCount}</span> / {total}
          </span>
        </div>
        <DeliverablesChecklist deliverables={contract.deliverables} approvalMode={contract.approvalMode} onUpdateDeliverable={updateDeliverable} />
      </div>

      {/* Termination options + timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 flex flex-col gap-2 transition-colors relative overflow-hidden">
          {isSimulating ? (
            <div className="absolute inset-0 bg-white dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Dispatching notifications...</p>
            </div>
          ) : null}

          <h3 className="text-xs font-semibold dark:font-bold mb-1">Termination Flow</h3>

          {terminationStatus === "Idle" ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Request to terminate this contract. Notifications will be sent to the <span className="font-extrabold">Creator</span> and <span className="font-extrabold">EVzone Admin</span>.
              </p>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-100 mb-0.5">Reason</label>
              <select
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
              >
                <option value="for-cause">For cause (breach, fraud, missed deadlines)</option>
                <option value="without-cause">Without cause</option>
                <option value="mutual">Mutual agreement</option>
              </select>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-100 mt-1">Explanation (required)</label>
              <textarea
                rows={3}
                className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-900 focus:border-[#f77f00] outline-none resize-none transition-colors"
                placeholder="Describe why you are requesting termination..."
                value={terminationExplanation}
                onChange={(e) => setTerminationExplanation(e.target.value)}
              />
              {terminationError ? <p className="text-xs text-red-500 dark:text-red-400">{terminationError}</p> : null}
              <button
                className="mt-1 self-start px-4 py-2 rounded-full text-sm font-semibold bg-[#f77f00] text-white hover:bg-[#e26f00] transition-colors shadow-sm"
                onClick={handleRequestTermination}
                type="button"
              >
                Request termination
              </button>
              <div className="text-[10px] text-slate-500">Permission note: Only Supplier Owner/Admin should request termination.</div>
            </>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px]">✓</span>
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Termination Request Sent</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">Simultaneous notifications sent to:</p>
                  <div className="flex flex-wrap gap-2">
                    {notificationsSentTo.map((target) => (
                      <span
                        key={target}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {target}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">Status tracker</h4>
                <div className="relative flex justify-between items-start pt-2 px-2">
                  <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-1000"
                      style={{
                        width:
                          terminationStatus === "Requested" ? "0%" : terminationStatus === "Acknowledged" ? "50%" : terminationStatus === "Resolved" ? "100%" : "0%"
                      }}
                    />
                  </div>

                  {["Requested", "Acknowledged", "Resolved"].map((step, idx) => {
                    const stepIndex = ["Requested", "Acknowledged", "Resolved"].indexOf(terminationStatus);
                    const isCompleted = stepIndex >= idx;
                    const isActive = terminationStatus === step;
                    return (
                      <div key={step} className="relative flex flex-col items-center gap-2 z-10 w-24 text-center">
                        <div
                          className={cx(
                            "w-5 h-5 rounded-full border-2 transition-all duration-500 flex items-center justify-center",
                            isCompleted
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          )}
                        >
                          {isCompleted ? <span className="text-[10px]">✓</span> : <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />}
                        </div>
                        <span className={cx("text-[10px] font-bold transition-colors", isActive ? "text-[#f77f00]" : isCompleted ? "text-slate-700 dark:text-slate-300" : "text-slate-400")}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-extrabold"
                    onClick={() => setTerminationStatus("Acknowledged")}
                    disabled={terminationStatus !== "Requested"}
                  >
                    Simulate Acknowledged
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-extrabold"
                    onClick={() => {
                      setTerminationStatus("Resolved");
                      toast("Termination resolved (demo)");
                    }}
                    disabled={terminationStatus === "Resolved"}
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="ml-auto px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-[11px] font-extrabold text-rose-700 dark:text-rose-300"
                    onClick={() => {
                      setTerminationStatus("Idle");
                      setNotificationsSentTo([]);
                      setTerminationExplanation("");
                      setTerminationReason("for-cause");
                      toast("Termination flow reset (demo)");
                    }}
                  >
                    Reset
                  </button>
                </div>

                <div className="text-[10px] text-slate-500">
                  Edge cases: creator disputes termination, admin mediation, partial payout settlement, contract amendments.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 flex flex-col gap-2 transition-colors">
          <h3 className="text-xs font-semibold dark:font-bold dark:text-slate-50 mb-1">Timeline of events</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">Key milestones from proposal to deliverables and payouts.</p>
          <TimelineEvents events={contract.timeline} />
        </div>
      </div>

      <ConfirmModal
        isOpen={!!rejectId}
        title="Reject deliverable?"
        message="Rejecting a deliverable will notify the creator and may trigger renegotiation or contract dispute handling. Continue?"
        confirmText="Reject"
        confirmClass="bg-red-500 hover:bg-red-600"
        onClose={() => setRejectId(null)}
        onConfirm={() => {
          const id = rejectId;
          setRejectId(null);
          const next = {
            ...contract,
            deliverables: contract.deliverables.map((d) => (d.id === id ? { ...d, status: "Rejected" } : d))
          };
          onUpdateContract(next);
          toast("Deliverable rejected");
        }}
      />
    </div>
  );
}

/* -------------------------------- Main ---------------------------------- */

export default function SupplierContractsPage() {
  const [activeFilter, setActiveFilter] = useState("Active");
  const [selectedContractId, setSelectedContractId] = useState("SC-201");

  const [dataState, setDataState] = useState("ready"); // ready | loading | error

  const [contracts, setContracts] = useState(MOCK_CONTRACTS);

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (activeFilter === "All") return true;
      return c.status === activeFilter;
    });
  }, [contracts, activeFilter]);

  const selectedContract =
    contracts.find((c) => c.id === selectedContractId) || filteredContracts[0] || null;

  const updateContract = (next) => {
    setContracts((prev) => prev.map((c) => (c.id === next.id ? next : c)));
  };

  const badge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-800 transition-colors">
      <span>📑</span>
      <span>Contracts & payouts</span>
    </span>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors">
      <PageHeader
        pageTitle="Contracts"
        badge={badge}
        right={
          <>
            <span className="hidden md:inline-flex px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} /> Orange + Black
            </span>
            <button
              type="button"
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
              onClick={() => toast("Open Proposals (demo)")}
            >
              Proposals
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-extrabold hover:bg-[#e26f00]"
              onClick={() => toast("Create contract (demo)")}
            >
              New Contract
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
              onClick={() => {
                setDataState((s) => (s === "ready" ? "loading" : s === "loading" ? "error" : "ready"));
                toast("Toggled data state (demo)");
              }}
              title="Toggle loading/error (demo)"
            >
              ⚙️
            </button>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-4 items-start">
          {/* Contracts list */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Contracts</h1>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Overview of active, upcoming, completed and terminated contracts with creators.
                </p>
              </div>
              <div className="hidden md:flex flex-col items-end text-xs text-slate-500 dark:text-slate-300">
                <span>
                  Total contracts: <span className="font-semibold dark:font-bold">{contracts.length}</span>
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-1.5 text-xs bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-800 rounded-full transition-colors px-2 py-1.5">
              {CONTRACT_FILTERS.map((f) => {
                const isActive = f === activeFilter;
                return (
                  <button
                    key={f}
                    className={cx(
                      "px-2.5 py-0.5 rounded-full transition-colors",
                      isActive
                        ? "bg-[#f77f00] text-white"
                        : "text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    )}
                    onClick={() => setActiveFilter(f)}
                    type="button"
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            {/* Error / loading */}
            {dataState === "error" ? (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/10 p-3">
                <div className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Contracts failed to load</div>
                <div className="text-xs text-rose-800 dark:text-rose-300 mt-1">Check connectivity or retry. (Demo error state)</div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-slate-900 text-white text-[11px] font-extrabold"
                    onClick={() => setDataState("ready")}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-[11px] font-extrabold text-rose-700 dark:text-rose-300"
                    onClick={() => toast("Open AI helper (demo)")}
                  >
                    Open AI helper
                  </button>
                </div>
              </div>
            ) : null}

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-2xl border border-slate-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 transition-colors">
              {filteredContracts.length === 0 ? (
                <p className="p-3 text-sm text-slate-500 dark:text-slate-300">No contracts in this filter yet.</p>
              ) : (
                filteredContracts.map((c) => (
                  <ContractRow
                    key={c.id}
                    contract={c}
                    active={selectedContract && selectedContract.id === c.id}
                    onSelect={() => setSelectedContractId(c.id)}
                  />
                ))
              )}
            </div>

            <div className="text-[10px] text-slate-500">
              Permissions note: Staff roles may view contracts; only Supplier Owner/Admin should download contracts or trigger termination.
            </div>
          </section>

          {/* Detail pane */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3 text-sm">
            {!selectedContract || dataState !== "ready" ? (
              <div className="flex flex-col items-center justify-center h-full text-sm text-slate-500 dark:text-slate-300">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-100 mb-1">Select a contract to view details</p>
                <p className="text-xs max-w-xs text-center">You will see scope, deliverable schedule, health and payout status for the selected contract.</p>
              </div>
            ) : (
              <ContractDetail contract={selectedContract} onUpdateContract={updateContract} />
            )}
          </section>
        </div>
      </main>

      <ToastArea />
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierContractsPage test failed: ${msg}`);
  };

  assert(cx("a", false && "b", "c") === "a c", "cx joins truthy");
  assert(Array.isArray(MOCK_CONTRACTS) && MOCK_CONTRACTS.length > 0, "mock contracts exist");

  console.log("✅ SupplierContractsPage self-tests passed");
}
