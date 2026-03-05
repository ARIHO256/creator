// Round 2 – Page 7: Proposals Inbox (Creator View)
// Purpose: Manage incoming and outgoing collaboration proposals in a layout
// similar to the "Invites from Sellers" page – top bar, header, tabs, filters,
// left list + right detail panel. Proposals here are more structured than invites
// and include terms like base fee, commission and deliverables.

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { PitchDrawer } from "../../components/PitchDrawer";
import { useNotification } from "../../contexts/NotificationContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { CircularProgress } from "@mui/material";

type ProposalStatus =
  | "Draft"
  | "New"
  | "In negotiation"
  | "Accepted"
  | "Declined"
  | "Expired";

type ProposalOrigin = "from-seller" | "my-pitch";

type Proposal = {
  id: string;
  brand: string;
  initials: string;
  campaign: string;
  origin: ProposalOrigin;
  offerType: string;
  category: string;
  region: string;
  baseFeeMin: number;
  baseFeeMax: number;
  currency: string;
  commissionPct: number;
  estimatedValue: number;
  status: ProposalStatus;
  lastActivity: string;
  notesShort: string;
};

const PROPOSALS: Proposal[] = [
  {
    id: "P-301",
    brand: "GlowUp Hub",
    initials: "GH",
    campaign: "Autumn Beauty Flash",
    origin: "from-seller",
    offerType: "Live + Clips package",
    category: "Beauty",
    region: "East Africa",
    baseFeeMin: 400,
    baseFeeMax: 600,
    currency: "USD",
    commissionPct: 5,
    estimatedValue: 1200,
    status: "In negotiation",
    lastActivity: "Countered terms · 2h ago",
    notesShort: "Brand proposed 60–90 min live + 3 clips and 5% commission during promo."
  },
  {
    id: "P-302",
    brand: "GadgetMart Africa",
    initials: "GA",
    campaign: "Tech Friday Mega Live",
    origin: "my-pitch",
    offerType: "Launch live series (3 episodes)",
    category: "Tech",
    region: "Africa / Asia",
    baseFeeMin: 900,
    baseFeeMax: 1400,
    currency: "USD",
    commissionPct: 0,
    estimatedValue: 1400,
    status: "New",
    lastActivity: "Sent to brand · Yesterday",
    notesShort: "You pitched a 3-episode Tech Friday series with mid-ticket gadgets."
  },
  {
    id: "P-303",
    brand: "Grace Living Store",
    initials: "GL",
    campaign: "Faith & Wellness Morning Dealz",
    origin: "my-pitch",
    offerType: "Morning lives + Shoppable Adz",
    category: "Faith-compatible",
    region: "Africa",
    baseFeeMin: 320,
    baseFeeMax: 480,
    currency: "USD",
    commissionPct: 0,
    estimatedValue: 480,
    status: "Draft",
    lastActivity: "Draft saved · 1 day ago",
    notesShort: "Draft proposal – you have not sent this to the brand yet."
  },
  {
    id: "P-304",
    brand: "ShopNow Foods",
    initials: "SF",
    campaign: "ShopNow Groceries – Soft Promo",
    origin: "from-seller",
    offerType: "Shoppable Adz",
    category: "Food",
    region: "Africa",
    baseFeeMin: 300,
    baseFeeMax: 300,
    currency: "USD",
    commissionPct: 3,
    estimatedValue: 450,
    status: "Accepted",
    lastActivity: "Accepted · 4 days ago",
    notesShort: "Accepted: soft groceries promo with flat fee and small commission."
  },
  {
    id: "P-305",
    brand: "EV Gadget World",
    initials: "EG",
    campaign: "EV Accessories Launch",
    origin: "from-seller",
    offerType: "Shoppable Adz + Live",
    category: "EV",
    region: "Global",
    baseFeeMin: 350,
    baseFeeMax: 500,
    currency: "USD",
    commissionPct: 4,
    estimatedValue: 600,
    status: "Declined",
    lastActivity: "Declined · last week",
    notesShort: "You declined due to timing and focus. Could be revisited later."
  }
];

const TABS = [
  { id: "all", label: "All" },
  { id: "from-sellers", label: "From Sellers & Providers" },
  { id: "my-pitches", label: "My Pitches" }
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_FILTERS: ("All" | ProposalStatus)[] = [
  "All",
  "Draft",
  "New",
  "In negotiation",
  "Accepted",
  "Declined",
  "Expired"
];

const CATEGORIES = [
  "All",
  "Beauty",
  "Tech",
  "Faith-compatible",
  "EV",
  "Food"
] as const;

type CategoryFilter = (typeof CATEGORIES)[number];

const currencyFormat = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0 });



// Main page component
export function ProposalsInboxPage(): JSX.Element {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>(PROPOSALS);
  const [tab, setTab] = useState<TabId>("all");
  const [statusFilter, setStatusFilter] = useState<"All" | ProposalStatus>("All");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [minBudget, setMinBudget] = useState<string>("");
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    PROPOSALS[0]?.id ?? null
  );
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null);
  const { showSuccess, showNotification } = useNotification();
  const { run, isPending } = useAsyncAction();

  const handleAcceptProposal = (id: string) => {
    run(async () => {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1000));
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Accepted", lastActivity: "Accepted · Just now" } : p))
      );
    }, { successMessage: "Proposal accepted!" });
  };

  const handleDeclineProposal = (id: string) => {
    run(async () => {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1000));
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Declined", lastActivity: "Declined · Just now" } : p))
      );
    }, { successMessage: "Proposal declined." });
  };



  const selectedProposal = useMemo<Proposal | null>(() => {
    if (!selectedProposalId) return proposals[0] ?? null;
    return proposals.find((p) => p.id === selectedProposalId) ?? proposals[0] ?? null;
  }, [selectedProposalId, proposals]);

  const filteredProposals = useMemo<Proposal[]>(() => {
    return proposals.filter((p) => {
      // Tab logic
      if (tab === "from-sellers" && p.origin !== "from-seller") return false;
      if (tab === "my-pitches" && p.origin !== "my-pitch") return false;
      // "all" shows both, no specific filter needed

      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (categoryFilter !== "All" && p.category !== categoryFilter) return false;

      if (minBudget) {
        const min = Number(minBudget) || 0;
        if (p.estimatedValue < min) return false;
      }
      return true;
    });
  }, [tab, statusFilter, categoryFilter, minBudget, proposals]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Proposals Inbox"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
            <span>📄</span>
            <span>Structured offers · Terms · Negotiations</span>
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full p-3 sm:p-4 md:p-6 lg:p-8 pt-8 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          {/* Header summary + actions */}
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                All structured proposals with terms – those you receive from brands and those you
                pitch them.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => navigate("/creator-campaigns")}
              >
                View Campaigns Board
              </button>
            </div>
          </section>

          {/* Tabs + filters */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-all shadow-sm p-4 md:p-6 flex flex-col gap-5 text-sm border border-transparent dark:border-slate-800">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
              <div className="flex flex-col gap-2.5 w-full xl:w-auto">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">View Selection</span>
                <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 transition-all w-fit">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${active
                          ? "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        onClick={() => setTab(t.id)}
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
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-all focus:ring-2 focus:ring-amber-500/20 outline-none cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ProposalStatus | "All")}
                  >
                    {STATUS_FILTERS.map((s) => (
                      <option key={s} value={s}>
                        {s === "All" ? "All statuses" : s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</span>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-all focus:ring-2 focus:ring-amber-500/20 outline-none cursor-pointer"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
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
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold transition-all focus:ring-2 focus:ring-amber-500/20 outline-none"
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
                <span className="font-bold">{proposals.length}</span> active proposals
              </span>
              <button
                className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                onClick={() => {
                  setTab("all");
                  setStatusFilter("All");
                  setCategoryFilter("All");
                  setMinBudget("");
                }}
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
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  Click a proposal to see terms and respond.
                </span>
              </div>
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
                    isPending={isPending && selectedProposalId === p.id}
                  />
                ))}
                {filteredProposals.length === 0 && (
                  <div className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                    No proposals match these filters yet.
                  </div>
                )}
              </div>
            </div>

            {/* Detail panel (Desktop only) */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 lg:sticky lg:top-20">
              <ProposalDetailPanel
                proposal={selectedProposal}
                onAccept={handleAcceptProposal}
                onDecline={handleDeclineProposal}
                isPending={isPending}
              />
            </div>
          </section>
        </div>
      </main>

    </div>
  );
}

type ProposalRowProps = {
  proposal: Proposal;
  selected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  isPending: boolean;
};

function ProposalRow({ proposal, selected, isExpanded, onSelect, onToggle, onAccept, onDecline, isPending }: ProposalRowProps): JSX.Element {
  const statusColorMap: Record<ProposalStatus, string> = {
    Draft: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    New: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    "In negotiation": "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700",
    Accepted: "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 border-slate-900 dark:border-slate-600",
    Declined: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
    Expired: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  };

  const statusClass = statusColorMap[proposal.status] ??
    "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

  const originLabel = proposal.origin === "from-seller" ? "From supplier" : "My pitch";
  const originClass =
    proposal.origin === "from-seller"
      ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700"
      : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700";

  const valueLabel = proposal.baseFeeMin === proposal.baseFeeMax
    ? `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}`
    : `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}–${currencyFormat(proposal.baseFeeMax)}`;


  return (
    <article
      className={`py-3.5 px-3 md:px-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 rounded-2xl border ${selected
        ? "bg-amber-50/70 dark:bg-amber-900/40 border-amber-200 dark:border-amber-600 shadow-sm"
        : "bg-white dark:bg-slate-900 border-transparent dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-100 dark:hover:border-slate-700"
        }`}
      onClick={() => {
        onSelect();
        if (window.innerWidth < 1024) {
          onToggle();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex flex-shrink-0 items-center justify-center text-sm font-black text-slate-900 dark:text-slate-100">
            {proposal.initials}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-black text-slate-900 dark:text-slate-50 truncate">
                {proposal.brand}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {proposal.campaign}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                {proposal.offerType} · {proposal.region}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter transition-colors ${originClass}`}
              >
                <span>🤝</span>
                <span>{originLabel}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic mt-0.5">
              &quot;{proposal.notesShort}&quot;
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${statusClass}`}
            >
              <span className="text-[6px]">●</span>
              <span>{proposal.status}</span>
            </span>
            <div className="lg:hidden text-slate-400 pl-1">
              <span className={`transition-transform duration-300 inline-block text-[10px] ${isExpanded ? "rotate-180 text-[#f77f00]" : ""}`}>
                ▼
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-[#f77f00]">
              {valueLabel}
              {proposal.commissionPct > 0 && <span className="text-[9px] text-slate-400 ml-1 font-bold">+{proposal.commissionPct}%</span>}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{proposal.lastActivity}</span>
          </div>
        </div>
      </div>

      {/* Expanded content for mobile (Full Detail Panel) */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 lg:hidden">
          <ProposalDetailPanel
            proposal={proposal}
            isInline
            onAccept={onAccept}
            onDecline={onDecline}
            isPending={isPending}
          />
        </div>
      )}
    </article>
  );
}

type ProposalDetailPanelProps = {
  proposal: Proposal | null;
  isInline?: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  isPending: boolean;
};

function ProposalDetailPanel({ proposal, isInline, onAccept, onDecline, isPending }: ProposalDetailPanelProps): JSX.Element {
  const navigate = useNavigate();

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 min-h-[260px]">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 max-w-xs transition-colors">
          <p className="text-sm font-medium dark:text-slate-100 mb-1">Select a proposal</p>
          <p className="text-xs dark:text-slate-300">
            When you click a proposal, you&apos;ll see full terms, value and next steps here.
          </p>
        </div>
      </div>
    );
  }

  const originLabel = proposal.origin === "from-seller" ? "From supplier" : "My pitch";
  const originClass =
    proposal.origin === "from-seller"
      ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700"
      : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700";

  const valueLabel = proposal.baseFeeMin === proposal.baseFeeMax
    ? `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}`
    : `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}–${currencyFormat(proposal.baseFeeMax)}`;

  const statusColorMap: Record<ProposalStatus, string> = {
    Draft: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    New: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    "In negotiation": "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700",
    Accepted: "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 border-slate-900 dark:border-slate-600",
    Declined: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
    Expired: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  };

  const statusClass = statusColorMap[proposal.status] ??
    "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

  let statusHint = "Review this proposal and decide whether to accept, counter or decline.";
  if (proposal.status === "Draft") {
    statusHint = "Draft – refine your terms and send when ready.";
  } else if (proposal.status === "New") {
    statusHint = proposal.origin === "from-seller"
      ? "New proposal from brand – they are waiting for your response."
      : "You just sent this proposal – brand has not yet responded.";
  } else if (proposal.status === "In negotiation") {
    statusHint = "Negotiation in progress – clarify timelines, deliverables and any exclusivity.";
  } else if (proposal.status === "Accepted") {
    statusHint = "Accepted – a contract should now exist or be created from these terms.";
  } else if (proposal.status === "Declined") {
    statusHint = "Declined – you can reuse parts of this proposal as a template later.";
  } else if (proposal.status === "Expired") {
    statusHint = "Expired – the proposal window or campaign dates have passed.";
  }

  const isActionable = ["New", "In negotiation", "Draft"].includes(proposal.status);

  return (
    <div className={`flex flex-col gap-5 text-sm ${isInline ? "p-0 bg-transparent border-none shadow-none" : ""}`}>
      {!isInline && (
        <section className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex flex-shrink-0 items-center justify-center text-base font-black text-slate-900 dark:text-slate-100 shadow-sm transition-colors">
              {proposal.initials}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
                  {proposal.brand}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {proposal.campaign}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {proposal.offerType} · {proposal.category} · {proposal.region}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest mt-1.5 transition-colors w-fit ${originClass}`}
              >
                <span>🤝</span>
                <span>{originLabel}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fee range</span>
            <span className="text-2xl font-black text-[#f77f00] tracking-tighter">
              {valueLabel}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              Commission: {proposal.commissionPct > 0
                ? `${proposal.commissionPct}% on sales`
                : "None specified"}
            </span>
          </div>
        </section>
      )}

      <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-2 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800">
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status & Health</span>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${statusClass}`}>
            <span className="text-[6px]">●</span>
            <span>{proposal.status}</span>
          </span>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
          {statusHint}
        </p>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">{proposal.lastActivity}</span>

        {/* Requirements: Add Proposal Journey flow UI and Accept/Reject buttons for supplier proposals only */}
        {proposal.origin === "from-seller" && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : isActive ? "bg-[#f77f00] border-[#f77f00] text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"}`}>
                            {isCompleted ? "✓" : idx + 1}
                          </div>
                          <span className={`text-[8px] font-bold uppercase tracking-tighter ${isActive ? "text-[#f77f00]" : "text-slate-400"}`}>{step}</span>
                        </div>
                        {idx < 3 && <div className={`h-0.5 flex-1 mb-4 ${isCompleted ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {isActionable && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDecline(proposal.id)}
                      disabled={isPending}
                      className="flex-1 px-4 py-2 rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-[11px] hover:bg-red-100 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                    >
                      Reject Proposal
                    </button>
                    <button
                      onClick={() => onAccept(proposal.id)}
                      disabled={isPending}
                      className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-[11px] hover:bg-emerald-600 shadow-md shadow-emerald-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isPending ? <CircularProgress size={14} color="inherit" /> : null}
                      Accept Proposal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {proposal.status === "In negotiation" && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => navigate("/proposal-room", { state: { origin: proposal.origin } })}
              className="w-full px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 font-bold text-[11px] hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all"
            >
              Go to Negotiation Room
            </button>
          </div>
        )}
      </section>

      <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900/50 flex flex-col gap-4 transition-all shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Proposal details</span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Creator View</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2.5 block">Deliverables</span>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex gap-2 font-black text-slate-900 dark:text-slate-100">
                <span className="text-[#f77f00]">●</span>
                {proposal.offerType}
              </li>
              <li className="flex gap-2 font-medium">
                <span className="text-slate-300 dark:text-slate-600">●</span>
                1x 60–90 min live
              </li>
              <li className="flex gap-2 font-medium">
                <span className="text-slate-300 dark:text-slate-600">●</span>
                3x clips for Ads
              </li>
            </ul>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2.5 block">Target Schedule</span>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex gap-2 font-bold">
                <span className="text-[#f77f00]">●</span>
                Next Friday
              </li>
              <li className="flex gap-2 font-medium">
                <span className="text-slate-300 dark:text-slate-600">●</span>
                Review: 48h before
              </li>
            </ul>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2.5 block">Total Value</span>
            <div className="flex flex-col gap-1.5">
              <span className="text-lg font-black text-[#f77f00] tracking-tighter">{valueLabel}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                {proposal.commissionPct > 0 ? `${proposal.commissionPct}% commission on sales` : "Flat fee only"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {proposal.origin === "from-seller" && (
        <section className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5 mt-2">
          <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">Current Lock State:</span>
            <span className={`text-[11px] font-black tracking-widest ${proposal.status === 'Accepted' ? 'text-emerald-500' : proposal.status === 'Declined' ? 'text-red-400' : 'text-amber-500'}`}>
              {proposal.status.toUpperCase()}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

