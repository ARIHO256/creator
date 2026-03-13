import React, { useEffect, useMemo, useState } from "react";

/**
 * SupplierProposalsPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: ProposalsInboxPage.tsx (Creator platform)
 *
 * Mirror-first preserved:
 * - PageHeader + badge
 * - Header summary + actions row
 * - Tabs + filters panel (Status, Category, Min Est. Value) + reset
 * - Main layout: left list + right detail panel (desktop sticky)
 * - Row interaction: select + mobile expand inline detail panel
 * - Detail sections: Status & Health, Proposal Journey, Negotiation Room CTA, Proposal Details
 *
 * Supplier adaptations (minimal + mandatory):
 * - Counterparty is a *Creator* (not “brand”).
 * - Proposal origins: from-creator (incoming) vs my-proposal (outgoing).
 * - Accepting an incoming proposal implies:
 *   - Creator Usage Decision becomes “I will use a Creator” (if it was “Not sure”).
 *   - Collaboration Mode = Invite-Only (private), unless campaign is already Open for Collabs.
 * - Supplier campaign controls surfaced (read-only chips in this page):
 *   - Creator Usage Decision, Collab Mode, Content Approval (Manual/Auto).
 * - Includes supplier manual approval context and edge-case notes.
 *
 * Notes:
 * - Dependency-free: no MUI, no lucide-react, no external imports.
 * - Replace navigation stubs with react-router in the actual Vite project.
 */

const ORANGE = "#f77f00";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function currencyFormat(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

/* ------------------------------ Async Helper ---------------------------- */

function useAsyncAction() {
  const [isPending, setIsPending] = useState(false);

  const run = async (fn, opts) => {
    setIsPending(true);
    try {
      await fn();
      if (opts?.successMessage) toast(opts.successMessage);
    } catch (e) {
      toast(opts?.errorMessage || "Action failed");
    } finally {
      setIsPending(false);
    }
  };

  return { run, isPending };
}

/* -------------------------------- Header ------------------------------- */

function PageHeader({ pageTitle, badge, right }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
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

/* ------------------------------- Data ----------------------------------- */

const PROPOSALS: Array<Record<string, any>> = [];

const TABS = [
  { id: "all", label: "All" },
  { id: "from-creators", label: "From Creators" },
  { id: "my-proposals", label: "My Proposals" }
];

const STATUS_FILTERS = ["All", "Draft", "New", "In negotiation", "Accepted", "Declined", "Expired"];
const CATEGORIES = ["All", "Beauty", "Tech", "Faith-compatible", "EV", "Food"];

/* ------------------------------ Drawer ---------------------------------- */

function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

function CounterDrawer({ isOpen, onClose, proposal, onSubmit }) {
  useScrollLock(isOpen);

  const [approvalMode, setApprovalMode] = useState("Manual");
  const [model, setModel] = useState("Hybrid");
  const [feeMin, setFeeMin] = useState("350");
  const [feeMax, setFeeMax] = useState("450");
  const [commissionPct, setCommissionPct] = useState("5");
  const [currency, setCurrency] = useState("USD");
  const [deliverables, setDeliverables] = useState({ Live: true, Clips: true, Posts: false, Adz: false });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const p = proposal;
    setApprovalMode(p?.approvalMode || "Manual");
    setCurrency(p?.currency || "USD");
    setFeeMin(String(p?.baseFeeMin ?? 350));
    setFeeMax(String(p?.baseFeeMax ?? 450));
    setCommissionPct(String(p?.commissionPct ?? 5));

    setDeliverables({
      Live: (p?.deliverables || []).includes("Live"),
      Clips: (p?.deliverables || []).includes("Clips"),
      Posts: (p?.deliverables || []).includes("Posts"),
      Adz: (p?.deliverables || []).includes("Adz")
    });

    setMessage(
      p
        ? `Hi ${p.creator}, thanks for the proposal for “${p.campaign}”. Here’s a counter offer that aligns deliverables, approval mode (${p.approvalMode}), and timeline.`
        : ""
    );
    setModel("Hybrid");
  }, [isOpen, proposal]);

  if (!isOpen) return null;

  const selectedDeliverables = Object.entries(deliverables)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const canSubmit = !!message.trim();

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Counter / Negotiate</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {proposal ? `${proposal.creator} · ${proposal.campaign}` : "Proposal"}
            </div>
          </div>
          <button
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/40 p-3">
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Campaign rules (context)</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold">
                Creator usage: {proposal?.creatorUsageDecision || "—"}
              </span>
              <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold">
                Collab mode: {proposal?.collabMode || "—"}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Approval mode here affects whether you review assets before Admin review.
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Approval mode</div>
            <div className="flex flex-wrap gap-2">
              {["Manual", "Auto"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                    approvalMode === m
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  )}
                  onClick={() => setApprovalMode(m)}
                >
                  {m} approval
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Commercial model</div>
            <div className="flex flex-wrap gap-2">
              {["Flat fee", "Commission", "Hybrid"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                    model === m
                      ? "bg-[#f77f00] border-[#f77f00] text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  )}
                  onClick={() => setModel(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-[1fr_1fr_0.8fr] gap-2">
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Fee min</div>
                <input
                  type="number"
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-[#f77f00]"
                  value={feeMin}
                  onChange={(e) => setFeeMin(e.target.value)}
                />
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Fee max</div>
                <input
                  type="number"
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-[#f77f00]"
                  value={feeMax}
                  onChange={(e) => setFeeMax(e.target.value)}
                />
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Currency</div>
                <select
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-sm bg-white dark:bg-slate-900"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option className="bg-white dark:bg-slate-900" value="USD">USD</option>
                  <option className="bg-white dark:bg-slate-900" value="UGX">UGX</option>
                  <option className="bg-white dark:bg-slate-900" value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Commission %</div>
              <input
                type="number"
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-[#f77f00]"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
              />
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Deliverables</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(deliverables).map((k) => (
                <label
                  key={k}
                  className={cx(
                    "flex items-center gap-2 px-3 py-2 rounded-2xl border cursor-pointer",
                    deliverables[k]
                      ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={deliverables[k]}
                    onChange={(e) => setDeliverables({ ...deliverables, [k]: e.target.checked })}
                  />
                  <span className="text-[12px] font-extrabold text-slate-700 dark:text-slate-200">{k}</span>
                </label>
              ))}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Selected: <span className="font-extrabold">{selectedDeliverables.join(", ") || "None"}</span></div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Message</div>
            <textarea
              rows={6}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-slate-400"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="mt-1 text-[11px] text-slate-500">
              Tip: confirm approval mode (<span className="font-extrabold">{approvalMode}</span>) and timeline in the message.
            </div>
          </section>

          <div className="text-[10px] text-slate-500">
            Permission note: Only Supplier Owner/Admin should submit counters that create binding commitments.
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50">
          <button
            type="button"
            className={cx(
              "w-full py-2.5 rounded-full text-white text-sm font-extrabold",
              canSubmit ? "bg-[#f77f00] hover:bg-[#e26f00]" : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
            )}
            disabled={!canSubmit}
            onClick={() => {
              const payload = {
                approvalMode,
                model,
                currency,
                baseFeeMin: Number(feeMin) || 0,
                baseFeeMax: Number(feeMax) || 0,
                commissionPct: Number(commissionPct) || 0,
                deliverables: selectedDeliverables,
                message
              };
              onSubmit(payload);
              onClose();
            }}
          >
            Send counter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Row + Detail ----------------------------- */

function ProposalRow({ proposal, selected, isExpanded, onSelect, onToggle, onAccept, onDecline, onOpenDrawer, isPending }) {
  const statusColorMap = {
    Draft: "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    New: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    "In negotiation": "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700",
    Accepted: "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 border-slate-900 dark:border-slate-600",
    Declined: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
    Expired: "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  };

  const statusClass = statusColorMap[proposal.status] || statusColorMap.Draft;

  const originLabel = proposal.origin === "from-creator" ? "From creator" : proposal.origin === "my-proposal" ? "My proposal" : "—";
  const originClass =
    proposal.origin === "from-creator"
      ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700"
      : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700";

  const valueLabel =
    proposal.baseFeeMin === proposal.baseFeeMax
      ? `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}`
      : `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}–${currencyFormat(proposal.baseFeeMax)}`;

  return (
    <article
      className={cx(
        "py-3.5 px-3 md:px-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 rounded-2xl border",
        selected
          ? "bg-amber-50/70 dark:bg-amber-900/40 border-amber-200 dark:border-amber-600 shadow-sm"
          : "bg-white dark:bg-slate-900 border-transparent dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800/50 hover:border-slate-100 dark:hover:border-slate-700"
      )}
      onClick={() => {
        onSelect();
        if (typeof window !== "undefined" && window.innerWidth < 1024) onToggle();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex flex-shrink-0 items-center justify-center text-sm font-black text-slate-900 dark:text-slate-100">
            {proposal.initials}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-black text-slate-900 dark:text-slate-50 truncate">{proposal.creator}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {proposal.campaign}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                {proposal.offerType} · {proposal.region}
              </span>
              <span
                className={cx(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter transition-colors",
                  originClass
                )}
              >
                <span>🤝</span>
                <span>{originLabel}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic mt-0.5">“{proposal.notesShort}”</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <span className={cx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all", statusClass)}>
              <span className="text-[6px]">●</span>
              <span>{proposal.status}</span>
            </span>
            <div className="lg:hidden text-slate-400 pl-1">
              <span className={cx("transition-transform duration-300 inline-block text-[10px]", isExpanded ? "rotate-180 text-[#f77f00]" : "")}>▼</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-[#f77f00]">
              {valueLabel}
              {proposal.commissionPct > 0 ? <span className="text-[9px] text-slate-400 ml-1 font-bold">+{proposal.commissionPct}%</span> : null}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{proposal.lastActivity}</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
              onClick={onOpenDrawer}
            >
              Counter
            </button>
            {proposal.origin === "from-creator" && ["New", "In negotiation"].includes(proposal.status) ? (
              <button
                type="button"
                className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold hover:bg-emerald-600"
                onClick={() => onAccept(proposal.id)}
                disabled={isPending}
                title={proposal.creatorUsageDecision === "I will NOT use a Creator" ? "Campaign is supplier-hosted" : undefined}
              >
                Accept
              </button>
            ) : null}
            {proposal.origin === "from-creator" && ["New", "In negotiation"].includes(proposal.status) ? (
              <button
                type="button"
                className="px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-[10px] font-extrabold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/20"
                onClick={() => onDecline(proposal.id)}
                disabled={isPending}
              >
                Reject
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 lg:hidden">
          <ProposalDetailPanel proposal={proposal} isInline onAccept={onAccept} onDecline={onDecline} onOpenDrawer={onOpenDrawer} isPending={isPending} />
        </div>
      ) : null}
    </article>
  );
}

function ProposalDetailPanel({ proposal, isInline, onAccept, onDecline, onOpenDrawer, isPending }) {
  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 min-h-[260px]">
        <div className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 max-w-xs transition-colors">
          <p className="text-sm font-medium dark:text-slate-100 mb-1">Select a proposal</p>
          <p className="text-xs dark:text-slate-300">Click a proposal to see full terms, value and next steps here.</p>
        </div>
      </div>
    );
  }

  const valueLabel =
    proposal.baseFeeMin === proposal.baseFeeMax
      ? `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}`
      : `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}–${currencyFormat(proposal.baseFeeMax)}`;

  const originLabel = proposal.origin === "from-creator" ? "From creator" : "My proposal";

  const statusColorMap = {
    Draft: "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    New: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    "In negotiation": "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700",
    Accepted: "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 border-slate-900 dark:border-slate-600",
    Declined: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
    Expired: "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  };
  const statusClass = statusColorMap[proposal.status] || statusColorMap.Draft;

  const isActionable = ["New", "In negotiation", "Draft"].includes(proposal.status);
  const isIncoming = proposal.origin === "from-creator";

  let statusHint = "Review this proposal and decide whether to accept, counter or decline.";
  if (proposal.status === "Draft") statusHint = "Draft – refine your terms and send when ready.";
  if (proposal.status === "New") statusHint = isIncoming ? "New proposal from creator – respond quickly for best conversion." : "Sent – waiting for creator response.";
  if (proposal.status === "In negotiation") statusHint = "Negotiation in progress – clarify timelines, deliverables, and approvals.";
  if (proposal.status === "Accepted") statusHint = "Accepted – next step: create/confirm contract, then schedule and execute.";
  if (proposal.status === "Declined") statusHint = "Declined – you can reuse this as a template later.";
  if (proposal.status === "Expired") statusHint = "Expired – campaign dates passed; create a fresh proposal.";

  const supplierHostedLock = proposal.creatorUsageDecision === "I will NOT use a Creator";

  return (
    <div className={cx("flex flex-col gap-5 text-sm", isInline ? "p-0 bg-transparent border-none shadow-none" : "")}
    >
      {!isInline ? (
        <section className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex flex-shrink-0 items-center justify-center text-base font-black text-slate-900 dark:text-slate-100 shadow-sm transition-colors">
              {proposal.initials}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{proposal.creator}</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{proposal.campaign}</p>
              <span className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                🤝 {originLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fee range</span>
            <span className="text-2xl font-black text-[#f77f00] tracking-tighter">{valueLabel}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              Commission: {proposal.commissionPct > 0 ? `${proposal.commissionPct}% on sales` : "None"}
            </span>
          </div>
        </section>
      ) : null}

      {supplierHostedLock ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300">
          This campaign is configured as <span className="font-extrabold">Supplier-hosted</span> (Creator Usage: “I will NOT use a Creator”).
          You must switch campaign settings before accepting creator proposals.
        </div>
      ) : null}

      <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 flex flex-col gap-2 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800">
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status & Health</span>
        <div className="flex items-center gap-2">
          <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all", statusClass)}>
            <span className="text-[6px]">●</span>
            <span>{proposal.status}</span>
          </span>
          <span className="text-[10px] text-slate-400">· {proposal.lastActivity}</span>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{statusHint}</p>

        {/* Proposal Journey (for incoming proposals) */}
        {isIncoming ? (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Proposal Journey</span>
                <div className="flex items-center gap-1 mt-1">
                  {["Received", "Reviewing", "Negotiating", "Finalizing"].map((step, idx) => {
                    const isCompleted = ["Accepted", "Declined"].includes(proposal.status) || (proposal.status === "In negotiation" && idx < 2);
                    const isActive = (proposal.status === "New" && idx === 0) || (proposal.status === "In negotiation" && idx === 2);
                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div
                            className={cx(
                              "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                              isCompleted
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : isActive
                                  ? "bg-[#f77f00] border-[#f77f00] text-white"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
                            )}
                          >
                            {isCompleted ? "✓" : idx + 1}
                          </div>
                          <span className={cx("text-[8px] font-bold uppercase tracking-tighter", isActive ? "text-[#f77f00]" : "text-slate-400")}>{step}</span>
                        </div>
                        {idx < 3 ? <div className={cx("h-0.5 flex-1 mb-4", isCompleted ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")} /> : null}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {isActionable ? (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDecline(proposal.id)}
                      disabled={isPending || supplierHostedLock}
                      className="flex-1 px-4 py-2 rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-[11px] hover:bg-red-100 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                      type="button"
                    >
                      Reject Proposal
                    </button>
                    <button
                      onClick={() => onAccept(proposal.id)}
                      disabled={isPending || supplierHostedLock}
                      className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-[11px] hover:bg-emerald-600 shadow-md shadow-emerald-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      type="button"
                    >
                      Accept Proposal
                    </button>
                  </div>

                  <button
                    type="button"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-[11px] hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                    onClick={onOpenDrawer}
                    disabled={supplierHostedLock}
                  >
                    Counter / Negotiate
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {proposal.status === "In negotiation" ? (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toast("Go to Negotiation Room (demo)")}
              className="w-full px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 font-bold text-[11px] hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all"
              type="button"
            >
              Go to Negotiation Room
            </button>
          </div>
        ) : null}
      </section>

      {/* Proposal details */}
      <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900/50 flex flex-col gap-4 transition-all shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Proposal details</span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Supplier View</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2.5 block">Deliverables</span>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex gap-2 font-black text-slate-900 dark:text-slate-100">
                <span className="text-[#f77f00]">●</span>
                {proposal.offerType}
              </li>
              {(proposal.deliverables || []).map((d) => (
                <li key={d} className="flex gap-2 font-medium">
                  <span className="text-slate-300 dark:text-slate-600">●</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2.5 block">Target Schedule</span>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex gap-2 font-bold">
                <span className="text-[#f77f00]">●</span>
                {proposal.scheduleHint || "TBD"}
              </li>
              <li className="flex gap-2 font-medium">
                <span className="text-slate-300 dark:text-slate-600">●</span>
                Supplier review SLA: {proposal.reviewSlaHours}h
              </li>
              <li className="flex gap-2 font-medium">
                <span className="text-slate-300 dark:text-slate-600">●</span>
                Approval mode: {proposal.approvalMode}
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2.5 block">Total Value</span>
            <div className="flex flex-col gap-1.5">
              <span className="text-lg font-black text-[#f77f00] tracking-tighter">{valueLabel}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                {proposal.commissionPct > 0 ? `${proposal.commissionPct}% commission on sales` : "Flat fee only"}
              </span>
              <span className="text-[10px] text-slate-500">Est. campaign value: <span className="font-extrabold">{proposal.currency} {currencyFormat(proposal.estimatedValue)}</span></span>
            </div>
          </div>
        </div>

        {/* Supplier campaign controls (surface, not a full editor in this page) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">Campaign-level controls (context)</div>
            <span className="text-[10px] text-slate-500">Source: {proposal.proposalSource || "—"}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={cx(
              "px-2.5 py-1 rounded-full border text-[10px] font-extrabold",
              proposal.creatorUsageDecision === "I will use a Creator"
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : proposal.creatorUsageDecision === "I will NOT use a Creator"
                  ? "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
            )}>
              🎭 {proposal.creatorUsageDecision}
            </span>
            <span className={cx(
              "px-2.5 py-1 rounded-full border text-[10px] font-extrabold",
              proposal.collabMode === "Open for Collabs"
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : proposal.collabMode === "Invite-Only" || proposal.collabMode === "Invite-Only"
                  ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                  : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            )}>
              🤝 {proposal.collabMode}
            </span>
            <span className={cx(
              "px-2.5 py-1 rounded-full border text-[10px] font-extrabold",
              proposal.approvalMode === "Manual"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            )}>
              🧾 {proposal.approvalMode}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Note: Collab mode switching is only allowed before content submission. Approval mode can be updated per campaign by Supplier Owner/Admin.
          </div>
        </div>

        {/* Contract action */}
        {proposal.status === "Accepted" ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
              onClick={() => toast("Open Contracts (demo)")}
            >
              View Contract
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-2xl bg-[#f77f00] text-white text-[11px] font-extrabold hover:bg-[#e26f00]"
              onClick={() => toast("Generate Contract from proposal (demo)")}
            >
              Generate / Confirm Contract
            </button>
          </div>
        ) : null}
      </section>

      {/* Lock state footer */}
      <section className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5 mt-2">
        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">Current Lock State:</span>
          <span
            className={cx(
              "text-[11px] font-black tracking-widest",
              proposal.status === "Accepted" ? "text-emerald-500" : proposal.status === "Declined" ? "text-red-400" : "text-amber-500"
            )}
          >
            {String(proposal.status).toUpperCase()}
          </span>
        </div>
      </section>

      <div className="text-[10px] text-slate-500">
        Permissions note: Only Supplier Owner/Admin roles should accept/decline proposals, counter terms, or generate contracts.
      </div>
    </div>
  );
}

/* -------------------------------- Main ---------------------------------- */

export default function SupplierProposalsPage() {
  const [proposals, setProposals] = useState<Array<Record<string, any>>>(PROPOSALS);
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [minBudget, setMinBudget] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState(PROPOSALS[0]?.id ?? null);
  const [expandedProposalId, setExpandedProposalId] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProposalId, setDrawerProposalId] = useState(null);

  const { run, isPending } = useAsyncAction();

  const selectedProposal = useMemo(() => {
    if (!selectedProposalId) return proposals[0] ?? null;
    return proposals.find((p) => p.id === selectedProposalId) ?? proposals[0] ?? null;
  }, [selectedProposalId, proposals]);

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (tab === "from-creators" && p.origin !== "from-creator") return false;
      if (tab === "my-proposals" && p.origin !== "my-proposal") return false;

      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (categoryFilter !== "All" && p.category !== categoryFilter) return false;

      if (minBudget) {
        const min = Number(minBudget) || 0;
        if ((p.estimatedValue || 0) < min) return false;
      }
      return true;
    });
  }, [tab, statusFilter, categoryFilter, minBudget, proposals]);

  const drawerProposal = useMemo(() => proposals.find((p) => p.id === drawerProposalId) ?? null, [drawerProposalId, proposals]);

  const setStatus = (id, status, lastActivity) => {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status, lastActivity } : p)));
  };

  const handleAcceptProposal = (id) => {
    run(
      async () => {
        await new Promise((r) => setTimeout(r, 950));
        setProposals((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;

            // If campaign decision was "Not sure", accepting forces "Use a Creator".
            const nextDecision = p.creatorUsageDecision === "I am NOT SURE yet" ? "I will use a Creator" : p.creatorUsageDecision;

            // Accept implies Invite-Only when proposal becomes binding (unless already open collabs).
            const nextCollab = p.collabMode === "Open for Collabs" ? "Open for Collabs" : "Invite-Only";

            return {
              ...p,
              status: "Accepted",
              lastActivity: "Accepted · Just now",
              creatorUsageDecision: nextDecision,
              collabMode: nextCollab
            };
          })
        );
      },
      { successMessage: "Proposal accepted!" }
    );
  };

  const handleDeclineProposal = (id) => {
    run(
      async () => {
        await new Promise((r) => setTimeout(r, 950));
        setStatus(id, "Declined", "Declined · Just now");
      },
      { successMessage: "Proposal declined." }
    );
  };

  const openDrawer = (proposal) => {
    setDrawerProposalId(proposal?.id ?? null);
    setDrawerOpen(true);
  };

  const applyCounter = (id, payload) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newMin = payload.baseFeeMin;
        const newMax = payload.baseFeeMax;
        const newEst = Math.max(p.estimatedValue || 0, Math.round((newMin + newMax) / 2) * 2);

        return {
          ...p,
          status: "In negotiation",
          lastActivity: "Counter sent · Just now",
          approvalMode: payload.approvalMode,
          baseFeeMin: newMin,
          baseFeeMax: newMax,
          commissionPct: payload.commissionPct,
          currency: payload.currency,
          estimatedValue: newEst,
          notesShort: payload.message.slice(0, 120) + (payload.message.length > 120 ? "…" : ""),
          deliverables: payload.deliverables
        };
      })
    );
  };

  const badge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
      <span>📄</span>
      <span>Structured offers · Terms · Negotiations</span>
    </span>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Proposals"
        badge={badge}
        right={
          <>
            <span className="hidden md:inline-flex px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} /> Orange + Black
            </span>
            <button
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors"
              onClick={() => toast("Open Campaigns Board (demo)")}
              type="button"
            >
              View Campaigns Board
            </button>
            <button
              className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-extrabold hover:bg-[#e26f00]"
              onClick={() => selectedProposal && openDrawer(selectedProposal)}
              disabled={!selectedProposal}
              type="button"
            >
              Counter / Negotiate
            </button>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          {/* Header summary + actions */}
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                All structured proposals with terms – those you receive from creators and those you send to them.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors"
                onClick={() => toast("Open Contracts (demo)")}
                type="button"
              >
                Open Contracts
              </button>
            </div>
          </section>

          {/* Tabs + filters */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-all shadow-sm p-4 md:p-6 flex flex-col gap-5 text-sm border border-transparent dark:border-slate-800">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
              <div className="flex flex-col gap-2.5 w-full xl:w-auto">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">View Selection</span>
                <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 transition-all w-fit">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        className={cx(
                          "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                          active
                            ? "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                        onClick={() => setTab(t.id)}
                        type="button"
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
                <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-all focus:ring-2 focus:ring-amber-500/20 outline-none cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_FILTERS.map((s) => (
                      <option key={s} value={s} className="bg-white dark:bg-slate-900">
                        {s === "All" ? "All statuses" : s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</span>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-all focus:ring-2 focus:ring-amber-500/20 outline-none cursor-pointer"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-white dark:bg-slate-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 flex-1 min-w-[160px]">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Min. Est. Value</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                    <input
                      type="number"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold transition-all focus:ring-2 focus:ring-amber-500/20 outline-none"
                      placeholder="e.g. 500"
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="font-medium">
                Showing <span className="text-slate-900 dark:text-slate-100 font-black">{filteredProposals.length}</span> of{" "}
                <span className="font-bold">{proposals.length}</span> proposals
              </span>
              <button
                className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                onClick={() => {
                  setTab("all");
                  setStatusFilter("All");
                  setCategoryFilter("All");
                  setMinBudget("");
                }}
                type="button"
              >
                Reset Filters
              </button>
            </div>
          </section>

          {/* Main layout: list + detail */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] gap-3 items-start text-sm">
            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">Proposals</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300">Click a proposal to see terms and respond.</span>
              </div>

              {
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProposals.map((p) => (
                    <ProposalRow
                      key={p.id}
                      proposal={p}
                      selected={selectedProposalId === p.id}
                      isExpanded={expandedProposalId === p.id}
                      onSelect={() => setSelectedProposalId(p.id)}
                      onToggle={() => setExpandedProposalId(expandedProposalId === p.id ? null : p.id)}
                      onAccept={handleAcceptProposal}
                      onDecline={handleDeclineProposal}
                      onOpenDrawer={() => openDrawer(p)}
                      isPending={isPending && selectedProposalId === p.id}
                    />
                  ))}

                  {filteredProposals.length === 0 ? (
                    <div className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">No proposals match these filters yet.</div>
                  ) : null}
                </div>
              }
            </div>

            {/* Detail panel (Desktop only) */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 lg:sticky lg:top-20">
              <ProposalDetailPanel
                proposal={selectedProposal}
                onAccept={handleAcceptProposal}
                onDecline={handleDeclineProposal}
                onOpenDrawer={() => selectedProposal && openDrawer(selectedProposal)}
                isPending={isPending}
              />
            </div>
          </section>
        </div>
      </main>

      <CounterDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        proposal={drawerProposal}
        onSubmit={(payload) => {
          if (!drawerProposal) return;
          applyCounter(drawerProposal.id, payload);
        }}
      />

      <ToastArea />
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierProposalsPage test failed: ${msg}`);
  };

  assert(cx("a", false && "b", "c") === "a c", "cx joins truthy");
  assert(currencyFormat(1200).length > 0, "currencyFormat formats");

  console.log("✅ SupplierProposalsPage self-tests passed");
}
