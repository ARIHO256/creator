import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  FileText,
  Filter,
  Search,
  ShieldCheck,
} from "lucide-react";

const ORANGE = "#f77f00";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function getPrimaryAction(creator) {
  if (!creator) {
    return { label: "+ New Proposal", type: "proposal", disabled: false };
  }

  if (creator.relationship === "Past collab") {
    if (creator.collabInviteStatus === "pending") {
      return { label: "Awaiting Acceptance", type: "pending", disabled: true };
    }
    return { label: "Invite to Collaborate", type: "invite", disabled: false };
  }

  return { label: "+ New Proposal", type: "proposal", disabled: false };
}

function getStopAction(creator) {
  if (!creator || creator.relationship !== "Active collab") return null;
  if ((creator.activeContracts || 0) > 0) {
    return { label: "Terminate Contract", type: "terminate" };
  }
  return { label: "Stop Collaboration", type: "stop" };
}

const INITIAL_CREATORS = [
  {
    id: 1,
    name: "Amina K.",
    initials: "AK",
    handle: "@amina.dealz",
    tagline: "Beauty dealz, live routines, and product-first hooks.",
    categories: ["Beauty", "Skincare"],
    relationship: "Active collab",
    collabInviteStatus: "none",
    lifetimeRevenue: 4800,
    currentValue: 1400,
    avgConversion: 4.8,
    campaignsCount: 4,
    lastCampaign: "Autumn Beauty Flash",
    lastResult: "500 units sold in 45 mins",
    openProposals: 1,
    activeContracts: 1,
    rating: 4.8,
    trustBadges: ["Verified", "On-time delivery"],
    primaryContact: "Amina · WhatsApp",
    nextLive: "Today · 18:30",
    nextAction: "Approve caption + pin the hero offer",
    following: true,
    favourite: true,
    queues: { pendingSupplier: 2, pendingAdmin: 1, changesRequested: 1 },
    activeCampaigns: [
      { id: "CAMP-21", name: "GlowUp Serum Promo", type: "Shoppable Adz", stage: "Supplier Review", approvalMode: "Manual" },
      { id: "CAMP-11", name: "Beauty Flash Dealz", type: "Live Sessionz", stage: "Scheduled", approvalMode: "Manual" },
    ],
  },
  {
    id: 2,
    name: "Chris M.",
    initials: "CM",
    handle: "@chris.finds",
    tagline: "Tech demos, unboxings, and bundle-driven closes.",
    categories: ["Tech", "Gadgets"],
    relationship: "Active collab",
    collabInviteStatus: "none",
    lifetimeRevenue: 3900,
    currentValue: 2100,
    avgConversion: 4.2,
    campaignsCount: 3,
    lastCampaign: "Tech Friday Mega Live",
    lastResult: "Bundle upsells performed best",
    openProposals: 0,
    activeContracts: 1,
    rating: 4.7,
    trustBadges: ["Verified", "Low disputes"],
    primaryContact: "Chris · Telegram",
    nextLive: "Fri · 19:00",
    nextAction: "Review product order + delivery schedule",
    following: true,
    favourite: false,
    queues: { pendingSupplier: 1, pendingAdmin: 2, changesRequested: 0 },
    activeCampaigns: [
      { id: "CAMP-07", name: "Tech Friday Mega", type: "Live Sessionz", stage: "Admin Review", approvalMode: "Auto" },
      { id: "CAMP-31", name: "Gadget Unboxing Marathon", type: "Shoppable Adz", stage: "Content Submission", approvalMode: "Manual" },
    ],
  },
  {
    id: 3,
    name: "Grace W.",
    initials: "GW",
    handle: "@gracefaithwellness",
    tagline: "Faith-compatible wellness. Calm and trust-first storytelling.",
    categories: ["Faith", "Wellness"],
    relationship: "Past collab",
    collabInviteStatus: "none",
    lifetimeRevenue: 1200,
    currentValue: 0,
    avgConversion: 3.9,
    campaignsCount: 2,
    lastCampaign: "Faith & Wellness Morning Dealz",
    lastResult: "High trust; slower close",
    openProposals: 0,
    activeContracts: 0,
    rating: 4.9,
    trustBadges: ["High trust"],
    primaryContact: "Grace · WhatsApp",
    nextLive: "Not scheduled",
    nextAction: "Re-engage for Q3 wellness campaign",
    following: false,
    favourite: false,
    queues: { pendingSupplier: 0, pendingAdmin: 0, changesRequested: 0 },
    activeCampaigns: [],
  },
  {
    id: 4,
    name: "Ama S.",
    initials: "AS",
    handle: "@stylebyama",
    tagline: "Try-ons and fashion haul lives. Strong hooks, faster edits.",
    categories: ["Fashion"],
    relationship: "Active collab",
    collabInviteStatus: "none",
    lifetimeRevenue: 980,
    currentValue: 680,
    avgConversion: 2.7,
    campaignsCount: 1,
    lastCampaign: "Style Haul Weekend",
    lastResult: "High engagement; moderate conversion",
    openProposals: 1,
    activeContracts: 0,
    rating: 4.4,
    trustBadges: [],
    primaryContact: "Ama · Instagram DM",
    nextLive: "Sat · 16:00",
    nextAction: "No active contract · collaboration can be stopped if needed",
    following: false,
    favourite: false,
    queues: { pendingSupplier: 3, pendingAdmin: 0, changesRequested: 2 },
    activeCampaigns: [
      { id: "CAMP-44", name: "Style Bundle Promo", type: "Shoppable Adz", stage: "Supplier Review", approvalMode: "Manual" },
    ],
  },
];

const SUPPLIER_CAMPAIGNS = [
  {
    id: "CMP-101",
    title: "Autumn Beauty Flash",
    subtitle: "Beauty & Skincare",
    summary: "Fast-moving promo focused on serum bundles, live education and audience-driven urgency.",
    type: "Shoppable Adz + Live",
    fitLabel: "Best for beauty creators",
    timelineLabel: "7 day cycle",
    suggestedFee: 400,
    suggestedCommission: 6,
  },
  {
    id: "CMP-202",
    title: "Tech Friday Mega Live",
    subtitle: "Tech & Gadgets",
    summary: "Creator-led live series for gadget launches, mid-session bundle pushes and stronger cart conversion.",
    type: "Live series",
    fitLabel: "Strong for demo-led creators",
    timelineLabel: "3 episode run",
    suggestedFee: 1200,
    suggestedCommission: 4,
  },
  {
    id: "CMP-303",
    title: "Creator Partnership Retainer",
    subtitle: "Always-on relationship",
    summary: "Use when you want to build a broader creator collaboration beyond one campaign, with recurring deliverables and approval loops.",
    type: "Ongoing partnership",
    fitLabel: "Long-term collaboration",
    timelineLabel: "Custom timing",
    suggestedFee: 800,
    suggestedCommission: 5,
  },
];

function currency(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function PageHeader({ title, badge }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/85 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200/70 dark:border-slate-800">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500 font-semibold">Supplier App</div>
          <h1 className="truncate text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-50">{title}</h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
      </div>
    </header>
  );
}

function StatCard({ label, value, sub, money }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-900/70 p-4 shadow-sm">
      <div className={cx("absolute inset-x-0 top-0 h-0.5", money ? "bg-[#f77f00]" : "bg-slate-200 dark:bg-slate-700")} />
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">{label}</div>
      <div className={cx("mt-2 text-2xl font-black", money ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100")}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div> : null}
    </div>
  );
}

function BadgePill({ tone = "neutral", children }) {
  const styles = {
    neutral: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700",
    good: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    warn: "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    brand: "text-white border-transparent",
  };

  return (
    <span className={cx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-tight", styles[tone])} style={tone === "brand" ? { background: ORANGE } : undefined}>
      {children}
    </span>
  );
}

function RowMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-3 py-2 shadow-sm">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">{value}</div>
    </div>
  );
}

function QueueChip({ label, value, tone }) {
  const cls =
    tone === "warn"
      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
      : tone === "bad"
      ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";

  return (
    <div className={cx("rounded-2xl border px-3 py-2.5 shadow-sm", cls)}>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em]">{label}</div>
      <div className="mt-1 text-[16px] font-extrabold">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">{label}</div>
      <div className="mt-1 text-xs font-bold text-white">{value}</div>
    </div>
  );
}

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmLabel, confirmClass }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">{title}</div>
          <button
            className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              className="px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-extrabold"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={cx("px-4 py-2.5 rounded-full text-sm font-extrabold text-white", confirmClass || "bg-slate-900 hover:bg-black")}
              onClick={onConfirm}
              type="button"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatorRow({
  creator,
  selected,
  isExpanded,
  onSelect,
  onToggle,
  onToggleFollow,
  onToggleFavourite,
  onOpenProposal,
  onInviteToCollaborate,
  onStopCollaboration,
  onTerminateContracts,
  onNavigate,
}) {
  const relTone = creator.relationship === "Active collab" ? "good" : "neutral";
  const primaryAction = getPrimaryAction(creator);
  const stopAction = getStopAction(creator);

  const triggerPrimaryAction = () => {
    if (primaryAction.type === "proposal") onOpenProposal();
    if (primaryAction.type === "invite") onInviteToCollaborate();
  };

  const actions = (
    <div className="flex flex-col items-end gap-2.5 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex gap-1.5">
        <button
          className={cx(
            "px-3 py-1 rounded-full border text-[10px] font-bold transition-all",
            creator.following
              ? "bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-700 text-white"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
          )}
          onClick={onToggleFollow}
          type="button"
        >
          {creator.following ? "Following" : "Follow"}
        </button>
        <button
          className={cx(
            "px-3 py-1 rounded-full border text-[10px] font-bold transition-all",
            creator.favourite
              ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
          )}
          onClick={onToggleFavourite}
          type="button"
        >
          {creator.favourite ? "Pinned" : "Pin"}
        </button>
      </div>

      <div className="text-[10px] text-slate-600 dark:text-slate-400 text-right leading-tight">
        <div className="mb-0.5">
          Next live: <span className="font-bold text-slate-900 dark:text-slate-100">{creator.nextLive || "Not scheduled"}</span>
        </div>
        <div>
          Next action: <span className="font-medium">{creator.nextAction}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-end mt-1">
        {[
          { label: "Proposals", key: "proposals", icon: <FileText className="h-3.5 w-3.5" /> },
          { label: "Contracts", key: "contracts", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
        ].map((item) => (
          <button
            key={item.key}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 text-[10px] font-bold text-[#f77f00] transition-colors border border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 inline-flex items-center gap-1"
            onClick={() => onNavigate(item.key)}
            type="button"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          className={cx(
            "px-3 py-1.5 rounded-full text-[10px] font-black shadow-sm",
            primaryAction.disabled
              ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              : primaryAction.type === "proposal"
              ? "bg-[#f77f00] text-white hover:bg-[#e26f00]"
              : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800",
          )}
          onClick={triggerPrimaryAction}
          disabled={primaryAction.disabled}
          type="button"
        >
          {primaryAction.label}
        </button>

        {stopAction?.type === "terminate" ? (
          <button
            className="px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/20"
            onClick={onTerminateContracts}
            type="button"
          >
            Terminate Contract
          </button>
        ) : null}

        {stopAction?.type === "stop" ? (
          <button
            className="px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/10"
            onClick={onStopCollaboration}
            type="button"
          >
            Stop Collaboration
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <article
      className={cx(
        "rounded-3xl border p-4 md:p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 shadow-sm",
        selected
          ? "bg-gradient-to-br from-white to-orange-50/70 dark:from-slate-900 dark:to-orange-950/10 border-[#f77f00]/45 shadow-[0_12px_28px_rgba(247,127,0,0.12)]"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700",
      )}
      onClick={() => {
        onSelect();
        if (window.innerWidth < 1024) onToggle();
      }}
    >
      <div className="flex w-full items-start justify-between gap-6">
        <div className="flex gap-4 items-start min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-black transition-colors flex-shrink-0 border-2 border-white dark:border-slate-800 shadow-sm">
            {creator.initials}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-slate-900 dark:text-slate-100 truncate">{creator.name}</span>
              {creator.favourite ? <span className="text-xs text-amber-500 dark:text-amber-300">★</span> : null}
              <span className="text-xs text-amber-500 dark:text-amber-300 font-bold">★ {creator.rating.toFixed(1)}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{creator.handle}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed max-w-md">{creator.tagline}</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {creator.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900/50 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors border border-slate-100 dark:border-slate-700"
                >
                  {cat}
                </span>
              ))}
              {creator.trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 transition-colors border border-emerald-100 dark:border-emerald-800"
                >
                  {badge}
                </span>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <BadgePill tone={relTone}>{creator.relationship}</BadgePill>
              {creator.collabInviteStatus === "pending" ? <BadgePill tone="warn">Invite Pending</BadgePill> : null}
            </div>
          </div>
        </div>

        <div className="hidden xl:block flex-shrink-0 pt-1">{actions}</div>

        <div className="xl:hidden text-slate-400 self-center pr-1">
          <span className={cx("transition-transform duration-300 inline-block", isExpanded ? "rotate-180 text-[#f77f00]" : "")}>▼</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 xl:hidden">
        <RowMetric label="Lifetime" value={currency(creator.lifetimeRevenue)} />
        <RowMetric label="Current value" value={currency(creator.currentValue)} />
        <RowMetric label="Conversion" value={`${creator.avgConversion}%`} />
        <RowMetric label="Rating" value={`${creator.rating}/5`} />
      </div>

      <div className="xl:hidden flex flex-wrap gap-2">
        <button
          className={cx(
            "px-3 py-2 rounded-full text-[11px] font-black shadow-sm",
            primaryAction.disabled
              ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              : primaryAction.type === "proposal"
              ? "bg-[#f77f00] text-white hover:bg-[#e26f00]"
              : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
          )}
          onClick={(e) => {
            e.stopPropagation();
            triggerPrimaryAction();
          }}
          disabled={primaryAction.disabled}
          type="button"
        >
          {primaryAction.label}
        </button>
        {stopAction?.type === "terminate" ? (
          <button
            className="px-3 py-2 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/20"
            onClick={(e) => {
              e.stopPropagation();
              onTerminateContracts();
            }}
            type="button"
          >
            Terminate Contract
          </button>
        ) : null}
        {stopAction?.type === "stop" ? (
          <button
            className="px-3 py-2 rounded-full border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/10"
            onClick={(e) => {
              e.stopPropagation();
              onStopCollaboration();
            }}
            type="button"
          >
            Stop Collaboration
          </button>
        ) : null}
        <button
          className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          type="button"
        >
          {isExpanded ? "Hide details" : "Quick details"}
        </button>
      </div>

      {isExpanded ? (
        <div className="mt-1 pt-4 border-t border-slate-100 dark:border-slate-700 xl:hidden">
          <CreatorDetailPanel
            creator={creator}
            onNavigate={onNavigate}
            onOpenProposal={onOpenProposal}
            onInviteToCollaborate={onInviteToCollaborate}
            onStopCollaboration={onStopCollaboration}
            onTerminateContracts={onTerminateContracts}
            isInline
          />
        </div>
      ) : null}
    </article>
  );
}

function CreatorDetailPanel({ creator, onNavigate, onOpenProposal, onInviteToCollaborate, onStopCollaboration, onTerminateContracts, isInline = false }) {
  if (!creator) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 min-h-[260px]">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 max-w-xs transition-colors">
          <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">Select a creator</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Pick a creator on the left to see collaboration history, performance and next steps.
          </p>
        </div>
      </div>
    );
  }

  const approvalsRisk = (creator.queues.pendingSupplier || 0) + (creator.queues.changesRequested || 0) >= 4;
  const primaryAction = getPrimaryAction(creator);
  const stopAction = getStopAction(creator);

  function triggerPrimaryAction() {
    if (primaryAction.type === "proposal") onOpenProposal?.();
    if (primaryAction.type === "invite") onInviteToCollaborate?.();
  }

  return (
    <div className={cx("flex flex-col gap-4 text-sm", isInline ? "p-0 bg-transparent border-none shadow-none" : "")}> 
      {!isInline ? (
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-black shadow-sm">
              {creator.initials}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-black text-slate-900 dark:text-slate-100 truncate">{creator.name}</span>
                <span className="text-xs text-amber-500 dark:text-amber-300 font-bold">★ {creator.rating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-300">{creator.handle}</span>
              <span className="text-xs text-slate-500 dark:text-slate-300">{creator.tagline}</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
            <div>Primary contact</div>
            <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{creator.primaryContact}</div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Lifetime attributed revenue" value={currency(creator.lifetimeRevenue)} sub={`~${currency(creator.currentValue)} currently active`} money />
        <StatCard label="Avg conversion" value={`${creator.avgConversion.toFixed(1)}%`} sub="Across creator-led executions" />
        <StatCard label="Campaigns together" value={creator.campaignsCount} sub={`Last: ${creator.lastCampaign}`} />
        <StatCard label="Contracts" value={creator.activeContracts} sub={`${creator.openProposals} open proposal(s)`} />
      </div>

      <div className={cx("rounded-2xl border p-4", approvalsRisk ? "border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-900/10" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40")}> 
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-900 dark:text-slate-100">Approvals & status queue</div>
          <span className="text-[10px] text-slate-500">Supplier review affects speed-to-live</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <QueueChip label="Pending supplier" value={creator.queues.pendingSupplier} tone={creator.queues.pendingSupplier ? "warn" : "neutral"} />
          <QueueChip label="Pending admin" value={creator.queues.pendingAdmin} tone={creator.queues.pendingAdmin ? "warn" : "neutral"} />
          <QueueChip label="Changes" value={creator.queues.changesRequested} tone={creator.queues.changesRequested ? "bad" : "neutral"} />
        </div>
        <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
          Proposal depth and delivery timing should align with the Negotiation Room information architecture.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-900 dark:text-slate-100">Active campaigns</div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-extrabold text-slate-700 dark:text-slate-200"
            onClick={() => onNavigate?.("my-campaigns")}
          >
            Open My Campaigns
          </button>
        </div>

        {creator.activeCampaigns?.length ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr className="text-left">
                  <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Campaign</th>
                  <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Type</th>
                  <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Stage</th>
                  <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Approval</th>
                </tr>
              </thead>
              <tbody>
                {creator.activeCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <div className="font-extrabold">{campaign.name}</div>
                      <div className="text-[10px] text-slate-500">{campaign.id}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-extrabold">{campaign.type}</td>
                    <td className="px-3 py-2">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full border text-[10px] font-extrabold",
                        campaign.stage.includes("Review")
                          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                          : campaign.stage === "Scheduled"
                          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200",
                      )}>{campaign.stage}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-extrabold">{campaign.approvalMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-300">No active campaigns with this creator.</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className={cx(
            "px-3 py-2 rounded-2xl text-[11px] font-extrabold",
            primaryAction.disabled
              ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              : primaryAction.type === "proposal"
              ? "bg-[#f77f00] text-white hover:bg-[#e26f00]"
              : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800",
          )}
          type="button"
          onClick={triggerPrimaryAction}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </button>
        <button
          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-extrabold"
          type="button"
          onClick={() => onNavigate?.("messages")}
        >
          Message creator
        </button>
        <button
          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-extrabold"
          type="button"
          onClick={() => onNavigate?.("task-board")}
        >
          Task Board
        </button>
        <button
          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-extrabold"
          type="button"
          onClick={() => onNavigate?.("analytics")}
        >
          Analytics
        </button>
      </div>

      {stopAction?.type === "terminate" ? (
        <button
          type="button"
          className="px-3 py-2 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold hover:bg-amber-100 dark:hover:bg-amber-900/20"
          onClick={onTerminateContracts}
        >
          Terminate Contract
        </button>
      ) : null}

      {stopAction?.type === "stop" ? (
        <button
          type="button"
          className="px-3 py-2 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-300 text-[11px] font-extrabold hover:bg-rose-100 dark:hover:bg-rose-900/20"
          onClick={onStopCollaboration}
        >
          Stop Collaboration
        </button>
      ) : null}
    </div>
  );
}

function ProposalFieldShell({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</span>
        {hint ? <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function ProposalInput(props) {
  return (
    <input
      {...props}
      className={`w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20 ${props.className || ""}`}
    />
  );
}

function ProposalSelect(props) {
  return (
    <select
      {...props}
      className={`w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20 ${props.className || ""}`}
    />
  );
}

function ProposalTextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20 ${props.className || ""}`}
    />
  );
}

function ProposalDrawer({ open, onClose, creators, initialCreator, campaigns }) {
  const fileRef = useRef(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState(initialCreator?.id || creators[0]?.id || 0);
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id || "");
  const [scope, setScope] = useState("Hybrid");
  const [pricingModel, setPricingModel] = useState("Hybrid");
  const [approvalMode, setApprovalMode] = useState("Manual");
  const [proposalTitle, setProposalTitle] = useState("");
  const [deliverables, setDeliverables] = useState([
    "1 live session with pinned offer moments",
    "3 short-form teaser assets",
    "Post-live recap and conversion push",
  ]);
  const [proposedFee, setProposedFee] = useState("");
  const [commission, setCommission] = useState("");
  const [preferredStart, setPreferredStart] = useState("2026-03-24");
  const [deliveryDate, setDeliveryDate] = useState("2026-04-04");
  const [responseBy, setResponseBy] = useState("2026-03-23");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState([
    { id: "deck", name: "campaign-brief.pdf", sizeLabel: "1.3 MB", typeLabel: "PDF" },
    { id: "rates", name: "creator-requirements.docx", sizeLabel: "320 KB", typeLabel: "DOCX" },
  ]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);
  const [banner, setBanner] = useState(null);

  const creator = useMemo(() => creators.find((item) => item.id === selectedCreatorId) || null, [creators, selectedCreatorId]);
  const campaign = useMemo(() => campaigns.find((item) => item.id === selectedCampaignId) || campaigns[0] || null, [campaigns, selectedCampaignId]);

  useEffect(() => {
    if (!open) return;
    const next = initialCreator || creators[0] || null;
    setSelectedCreatorId(next?.id || 0);
    setSelectedCampaignId(campaigns[0]?.id || "");
    setScope("Hybrid");
    setPricingModel("Hybrid");
    setApprovalMode("Manual");
    setProposalTitle(next ? `${next.name} x Supplier Collaboration Proposal` : "");
    setDeliverables([
      "1 live session with pinned offer moments",
      "3 short-form teaser assets",
      "Post-live recap and conversion push",
    ]);
    setProposedFee(campaigns[0]?.suggestedFee ? String(campaigns[0].suggestedFee) : "");
    setCommission(campaigns[0]?.suggestedCommission ? String(campaigns[0].suggestedCommission) : "");
    setPreferredStart("2026-03-24");
    setDeliveryDate("2026-04-04");
    setResponseBy("2026-03-23");
    setNotes(next ? `Proposal for ${next.name} with campaign-linked collaboration scope, deliverables, approval steps, and commercial terms.` : "");
    setAttachments([
      { id: "deck", name: "campaign-brief.pdf", sizeLabel: "1.3 MB", typeLabel: "PDF" },
      { id: "rates", name: "creator-requirements.docx", sizeLabel: "320 KB", typeLabel: "DOCX" },
    ]);
    setSavingDraft(false);
    setSendingProposal(false);
    setBanner(null);
  }, [open, initialCreator, creators, campaigns]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!campaign) return;
    setProposedFee((prev) => (prev ? prev : campaign.suggestedFee ? String(campaign.suggestedFee) : ""));
    setCommission((prev) => (prev ? prev : campaign.suggestedCommission ? String(campaign.suggestedCommission) : ""));
  }, [campaign]);

  const canSend =
    !!creator &&
    !!campaign &&
    proposalTitle.trim().length > 0 &&
    deliverables.some((item) => item.trim().length > 0) &&
    (proposedFee.trim().length > 0 || commission.trim().length > 0);

  function updateDeliverable(index, value) {
    setDeliverables((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addDeliverable() {
    setDeliverables((prev) => [...prev, ""]);
  }

  function removeDeliverable(index) {
    setDeliverables((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function addMockAttachment() {
    setAttachments((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: `proposal-attachment-${prev.length + 1}.pdf`,
        sizeLabel: "760 KB",
        typeLabel: "PDF",
      },
    ]);
  }

  function removeAttachment(id) {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }

  async function saveDraft() {
    setSavingDraft(true);
    setBanner(null);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setSavingDraft(false);
    setBanner({
      tone: "info",
      title: "Proposal draft saved",
      text: `Your draft proposal for ${creator?.name || "this creator"} is ready to revisit.`,
    });
  }

  async function sendProposal() {
    if (!canSend) return;
    setSendingProposal(true);
    setBanner(null);
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    setSendingProposal(false);
    setBanner({
      tone: "success",
      title: "Proposal sent",
      text: `${creator?.name || "The creator"} will receive your proposal with linked campaign, scope, deliverables, pricing and timeline.`,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] flex justify-end" onClick={onClose}>
      <aside
        className="w-full xl:max-w-[1040px] h-full bg-[#f8f7f5] dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-4 sm:px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-[#f77f00] text-[11px] tracking-[0.18em] uppercase font-black border border-amber-100 dark:border-amber-800">
                <span>+</span>
                <span>New Proposal</span>
              </div>
              <h2 className="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50">
                Start a negotiation-ready proposal
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300 max-w-3xl">
                Supplier terminology stays Proposal on this page. Use the linked campaign, define collaboration scope, attach deliverables and commercial terms, then save draft or send.
              </p>
            </div>
            <button
              className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5">
          <div className="grid xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-5">
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Creator summary</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select the creator you want to send a proposal to.</div>
                  </div>
                  <div className="rounded-full bg-orange-50 dark:bg-orange-900/20 px-3 py-1 text-[11px] font-bold text-[#f77f00] border border-orange-100 dark:border-orange-800">
                    Supplier-side Proposal
                  </div>
                </div>

                <div className="mt-4">
                  <ProposalFieldShell label="Creator">
                    <ProposalSelect value={selectedCreatorId} onChange={(e) => setSelectedCreatorId(Number(e.target.value))}>
                      {creators.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </ProposalSelect>
                  </ProposalFieldShell>
                </div>

                {creator ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-950 to-slate-800 text-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-black">
                        {creator.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black truncate">{creator.name}</h3>
                          <span className="rounded-full bg-white/10 border border-white/10 px-2 py-0.5 text-[11px] font-bold">{creator.relationship}</span>
                          {creator.collabInviteStatus === "pending" ? <span className="rounded-full bg-amber-400/20 border border-amber-300/30 px-2 py-0.5 text-[11px] font-bold text-amber-100">Invite Pending</span> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-200">{creator.tagline}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <MiniMetric label="Primary contact" value={creator.primaryContact} />
                          <MiniMetric label="Next action" value={creator.nextAction} />
                          <MiniMetric label="Current value" value={currency(creator.currentValue)} />
                          <MiniMetric label="Rating" value={`${creator.rating}/5`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Linked campaign</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the supplier campaign this proposal should anchor to.</div>

                <div className="mt-4 space-y-3">
                  {campaigns.map((item) => {
                    const selected = item.id === selectedCampaignId;
                    return (
                      <button
                        key={item.id}
                        className={`w-full text-left rounded-2xl border p-4 transition-all ${
                          selected
                            ? "border-[#f77f00]/40 bg-orange-50/70 dark:bg-orange-950/10 shadow-[0_10px_24px_rgba(247,127,0,0.10)]"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                        onClick={() => setSelectedCampaignId(item.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {item.type}
                            </div>
                            <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">{item.title}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                          </div>
                          {selected ? <div className="rounded-full bg-[#f77f00] text-white h-7 w-7 flex items-center justify-center text-sm font-black">✓</div> : null}
                        </div>
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <BadgePill>{item.fitLabel}</BadgePill>
                          <BadgePill>{item.timelineLabel}</BadgePill>
                          {item.suggestedFee ? <BadgePill>{`Suggested fee ${currency(item.suggestedFee)}`}</BadgePill> : null}
                          {item.suggestedCommission ? <BadgePill>{`Suggested commission ${item.suggestedCommission}%`}</BadgePill> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="space-y-5">
              {banner ? (
                <div className={`rounded-2xl border p-4 ${banner.tone === "success" ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20" : "border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20"}`}>
                  <div className="font-black text-slate-900 dark:text-slate-50">{banner.title}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{banner.text}</div>
                </div>
              ) : null}

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Proposal details</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Proposal-grade depth aligned with the negotiation room information architecture.</div>

                <div className="mt-4 grid gap-4">
                  <ProposalFieldShell label="Proposal title" hint="Required">
                    <ProposalInput value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} placeholder="Enter a strong commercial title" />
                  </ProposalFieldShell>

                  <ProposalFieldShell label="Collaboration scope" hint="Required">
                    <ProposalSelect value={scope} onChange={(e) => setScope(e.target.value)}>
                      <option>Hybrid</option>
                      <option>Live Sessionz</option>
                      <option>Shoppable Adz</option>
                      <option>Long-term creator partnership</option>
                    </ProposalSelect>
                  </ProposalFieldShell>

                  <ProposalFieldShell label="Deliverables" hint="Add complete scope">
                    <div className="space-y-2">
                      {deliverables.map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <ProposalTextArea rows={2} value={item} onChange={(e) => updateDeliverable(index, e.target.value)} placeholder={`Deliverable ${index + 1}`} />
                          {deliverables.length > 1 ? (
                            <button className="h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => removeDeliverable(index)} type="button">
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={addDeliverable} type="button">
                        + Add deliverable
                      </button>
                    </div>
                  </ProposalFieldShell>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Commercial terms</div>
                <div className="mt-4 grid sm:grid-cols-3 gap-4">
                  <ProposalFieldShell label="Pricing / commission mode">
                    <ProposalSelect value={pricingModel} onChange={(e) => setPricingModel(e.target.value)}>
                      <option>Flat fee</option>
                      <option>Commission</option>
                      <option>Hybrid</option>
                    </ProposalSelect>
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Proposed fee">
                    <ProposalInput value={proposedFee} onChange={(e) => setProposedFee(e.target.value)} placeholder="e.g. 450" />
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Commission terms">
                    <ProposalInput value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="e.g. 8%" />
                  </ProposalFieldShell>
                </div>

                {campaign ? (
                  <div className="mt-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/70 dark:bg-orange-950/10 p-4">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-50">Selected campaign context</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{campaign.title} · {campaign.type}</div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Use this linked campaign to align commercial terms, approval expectations, and timeline realism.</div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Timeline, approval mode, attachments and notes</div>

                <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <ProposalFieldShell label="Preferred start">
                    <ProposalInput type="date" value={preferredStart} onChange={(e) => setPreferredStart(e.target.value)} />
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Preferred delivery">
                    <ProposalInput type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Response by">
                    <ProposalInput type="date" value={responseBy} onChange={(e) => setResponseBy(e.target.value)} />
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Approval mode">
                    <ProposalSelect value={approvalMode} onChange={(e) => setApprovalMode(e.target.value)}>
                      <option>Manual</option>
                      <option>Auto after creator acceptance</option>
                      <option>Hybrid approval</option>
                    </ProposalSelect>
                  </ProposalFieldShell>
                </div>

                <div className="mt-4">
                  <ProposalFieldShell label="Attachments" hint="Campaign brief, deliverable guide, pricing sheet, audience notes">
                    <input ref={fileRef} type="file" className="hidden" />
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button className="px-3 py-2 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm font-bold" onClick={() => fileRef.current?.click()} type="button">
                          Upload files
                        </button>
                        <button className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800" onClick={addMockAttachment} type="button">
                          Add sample attachment
                        </button>
                      </div>

                      <div className="mt-3 space-y-2">
                        {attachments.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{item.typeLabel} · {item.sizeLabel}</div>
                            </div>
                            <button className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => removeAttachment(item.id)} type="button">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ProposalFieldShell>
                </div>

                <div className="mt-4">
                  <ProposalFieldShell label="Notes">
                    <ProposalTextArea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add collaboration notes, negotiation points, approval expectations, logistics, creator-specific requirements, gifting, usage rights, or anything else relevant." />
                  </ProposalFieldShell>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-4 sm:px-5 py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">Save draft to continue later, or send when title, deliverables, commercial terms and timeline are complete.</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60" onClick={saveDraft} disabled={savingDraft} type="button">
                {savingDraft ? "Saving draft..." : "Save draft"}
              </button>
              <button className="px-4 py-3 rounded-2xl bg-[#f77f00] text-white text-sm font-black hover:bg-[#e26f00] shadow-lg shadow-orange-100 dark:shadow-none disabled:opacity-60" onClick={sendProposal} disabled={!canSend || sendingProposal} type="button">
                {sendingProposal ? "Sending proposal..." : "Send proposal"}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function SupplierMyCreatorsPreviewCanvas() {
  const [creators, setCreators] = useState(INITIAL_CREATORS);
  const [search, setSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("All");
  const [viewTab, setViewTab] = useState("all");
  const [selectedCreatorId, setSelectedCreatorId] = useState(INITIAL_CREATORS[0]?.id ?? null);
  const [expandedCreatorId, setExpandedCreatorId] = useState(null);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [stopTarget, setStopTarget] = useState(null);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalRecipient, setProposalRecipient] = useState(INITIAL_CREATORS[0] || null);

  const stats = useMemo(() => {
    const active = creators.filter((c) => c.relationship === "Active collab");
    const past = creators.filter((c) => c.relationship === "Past collab");
    return {
      activeCount: active.length,
      pastCount: past.length,
      totalCount: creators.length,
      lifetime: creators.reduce((sum, c) => sum + (Number(c.lifetimeRevenue) || 0), 0),
      activeValue: active.reduce((sum, c) => sum + (Number(c.currentValue) || 0), 0),
    };
  }, [creators]);

  const filteredCreators = useMemo(() => {
    const q = search.trim().toLowerCase();
    return creators.filter((creator) => {
      if (relationshipFilter !== "All" && creator.relationship !== relationshipFilter) return false;
      if (viewTab === "active" && creator.relationship !== "Active collab") return false;
      if (viewTab === "past" && creator.relationship !== "Past collab") return false;
      if (!q) return true;
      return (
        creator.name.toLowerCase().includes(q) ||
        creator.handle.toLowerCase().includes(q) ||
        creator.tagline.toLowerCase().includes(q) ||
        creator.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    });
  }, [creators, search, relationshipFilter, viewTab]);

  const selectedCreator = useMemo(() => {
    if (selectedCreatorId == null) return filteredCreators[0] ?? null;
    return filteredCreators.find((creator) => creator.id === selectedCreatorId) ?? filteredCreators[0] ?? null;
  }, [filteredCreators, selectedCreatorId]);

  const selectedPrimaryAction = getPrimaryAction(selectedCreator);

  useEffect(() => {
    if (!selectedCreator && filteredCreators[0]) {
      setSelectedCreatorId(filteredCreators[0].id);
    }
  }, [selectedCreator, filteredCreators]);

  function toggleFollow(id) {
    setCreators((prev) => prev.map((creator) => (creator.id === id ? { ...creator, following: !creator.following } : creator)));
  }

  function toggleFavourite(id) {
    setCreators((prev) => prev.map((creator) => (creator.id === id ? { ...creator, favourite: !creator.favourite } : creator)));
  }

  function openProposal(creator) {
    const target = creator || selectedCreator || creators[0] || null;
    if (!target || getPrimaryAction(target).type !== "proposal") return;
    setProposalRecipient(target);
    setProposalOpen(true);
  }

  function openInviteModal(creator) {
    const target = creator || selectedCreator || null;
    if (!target) return;
    setSelectedCreatorId(target.id);
    setInviteTarget(target);
    setInviteModalOpen(true);
  }

  function closeInviteModal() {
    setInviteModalOpen(false);
    setInviteTarget(null);
  }

  function sendCollaborationInvite(id) {
    setCreators((prev) =>
      prev.map((creator) =>
        creator.id === id
          ? {
              ...creator,
              collabInviteStatus: "pending",
              nextAction: "Collaboration invite sent — awaiting creator acceptance",
            }
          : creator,
      ),
    );
  }

  function openStopModal(creator) {
    const target = creator || selectedCreator || null;
    if (!target) return;
    setSelectedCreatorId(target.id);
    setStopTarget(target);
    setStopModalOpen(true);
  }

  function closeStopModal() {
    setStopModalOpen(false);
    setStopTarget(null);
  }

  function openTerminateModal(creator) {
    const target = creator || selectedCreator || null;
    if (!target) return;
    setSelectedCreatorId(target.id);
    setTerminateTarget(target);
    setTerminateModalOpen(true);
  }

  function closeTerminateModal() {
    setTerminateModalOpen(false);
    setTerminateTarget(null);
  }

  function terminateContracts(id) {
    setCreators((prev) =>
      prev.map((creator) =>
        creator.id === id
          ? {
              ...creator,
              activeContracts: 0,
              currentValue: 0,
              nextLive: "Not scheduled",
              nextAction: "Contracts terminated. Stop Collaboration is now available.",
              activeCampaigns: [],
            }
          : creator,
      ),
    );
  }

  function stopCollaboration(id) {
    setCreators((prev) =>
      prev.map((creator) =>
        creator.id === id
          ? {
              ...creator,
              relationship: "Past collab",
              collabInviteStatus: "none",
              activeContracts: 0,
              currentValue: 0,
              nextLive: "Not scheduled",
              nextAction: "Re-invite to collaborate when ready",
              queues: { pendingSupplier: 0, pendingAdmin: 0, changesRequested: 0 },
              activeCampaigns: [],
            }
          : creator,
      ),
    );
  }

  function navigateStub(dest) {
    console.log(`Navigate to ${dest}`);
  }

  function triggerTopPrimaryAction() {
    if (!selectedCreator) return;
    if (selectedPrimaryAction.type === "proposal") openProposal(selectedCreator);
    if (selectedPrimaryAction.type === "invite") openInviteModal(selectedCreator);
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        title="My Creators"
        badge={
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors text-[11px] font-semibold">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Only creators with accepted collaboration</span>
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          <section className="bg-white dark:bg-slate-900 rounded-3xl transition-colors shadow-sm p-4 md:p-5 flex flex-col gap-4 text-sm border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500 font-bold">Controlled mirroring mode</div>
                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-50">Premium supplier-side creator relationships</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300 max-w-3xl">
                  Mirror the current My Creators structure, keep premium information density, and replace lightweight invite patterns with proposal or collaboration-invite logic based on creator relationship state.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold" type="button">
                  Discover creators
                </button>
                <button
                  className={cx(
                    "px-4 py-2 rounded-full shadow-sm font-black",
                    selectedPrimaryAction.disabled
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      : selectedPrimaryAction.type === "proposal"
                      ? "bg-[#f77f00] text-white hover:bg-[#e26f00]"
                      : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
                  )}
                  onClick={triggerTopPrimaryAction}
                  disabled={selectedPrimaryAction.disabled}
                  type="button"
                >
                  {selectedPrimaryAction.label}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Active collaborators" value={stats.activeCount} sub="Current contracts or campaigns" />
              <StatCard label="Past collaborators" value={stats.pastCount} sub="Completed campaigns" />
              <StatCard label="Total My Creators" value={stats.totalCount} sub="Creators with accepted collabs" />
              <StatCard label="Lifetime attributed revenue" value={currency(stats.lifetime)} sub={`~${currency(stats.activeValue)} currently active`} money />
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-3xl transition-colors shadow-sm p-4 md:p-5 flex flex-col gap-3 text-sm border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
              <div className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-slate-50 dark:bg-slate-800 transition-colors">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  placeholder="Search by creator, handle, tagline or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2 text-xs items-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filters</span>
                </div>
                <select
                  className="border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors cursor-pointer outline-none font-semibold"
                  value={relationshipFilter}
                  onChange={(e) => setRelationshipFilter(e.target.value)}
                >
                  <option value="All">All relationships</option>
                  <option value="Active collab">Active collaborations</option>
                  <option value="Past collab">Past collaborations</option>
                </select>
                <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-0.5 transition-colors">
                  {[
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "past", label: "Past" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      className={`px-3 py-1 rounded-full transition-colors font-semibold ${
                        viewTab === item.id
                          ? "bg-slate-900 dark:bg-slate-700 text-white"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                      onClick={() => setViewTab(item.id)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
              <span>
                Showing <span className="font-semibold dark:font-bold">{filteredCreators.length}</span> of {creators.length} My Creators
              </span>
              <button
                className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors font-semibold"
                onClick={() => {
                  setSearch("");
                  setRelationshipFilter("All");
                  setViewTab("all");
                }}
                type="button"
              >
                Reset
              </button>
            </div>
          </section>

          <section className="flex flex-col-reverse xl:grid xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1.08fr)] gap-4 items-start text-sm">
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl transition-colors shadow-sm p-4 md:p-5 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <h2 className="text-base font-black dark:text-slate-50">My Creators</h2>
                  <span className="text-xs text-slate-500 dark:text-slate-300">These creators have already accepted collaboration with you.</span>
                </div>
                <button
                  className={cx(
                    "px-4 py-2 rounded-full text-sm font-black shadow-sm",
                    selectedPrimaryAction.disabled
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      : selectedPrimaryAction.type === "proposal"
                      ? "bg-[#f77f00] text-white hover:bg-[#e26f00]"
                      : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
                  )}
                  onClick={triggerTopPrimaryAction}
                  disabled={selectedPrimaryAction.disabled}
                  type="button"
                >
                  {selectedPrimaryAction.label}
                </button>
              </div>

              <div className="space-y-3">
                {filteredCreators.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-10 text-center">
                    <div className="text-base font-black text-slate-900 dark:text-slate-50">No My Creators match this view yet</div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try resetting filters or search to surface your accepted creator relationships.</p>
                  </div>
                ) : (
                  filteredCreators.map((creator) => (
                    <CreatorRow
                      key={creator.id}
                      creator={creator}
                      selected={selectedCreator?.id === creator.id}
                      isExpanded={expandedCreatorId === creator.id}
                      onSelect={() => setSelectedCreatorId(creator.id)}
                      onToggle={() => setExpandedCreatorId(expandedCreatorId === creator.id ? null : creator.id)}
                      onToggleFollow={() => toggleFollow(creator.id)}
                      onToggleFavourite={() => toggleFavourite(creator.id)}
                      onOpenProposal={() => openProposal(creator)}
                      onInviteToCollaborate={() => openInviteModal(creator)}
                      onStopCollaboration={() => openStopModal(creator)}
                      onTerminateContracts={() => openTerminateModal(creator)}
                      onNavigate={navigateStub}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="w-full xl:sticky xl:top-24">
              <div className="bg-white dark:bg-slate-900 rounded-3xl transition-colors shadow-sm p-4 md:p-5 border border-slate-200/80 dark:border-slate-800">
                <CreatorDetailPanel
                  creator={selectedCreator}
                  onNavigate={navigateStub}
                  onOpenProposal={() => openProposal(selectedCreator)}
                  onInviteToCollaborate={() => openInviteModal(selectedCreator)}
                  onStopCollaboration={() => openStopModal(selectedCreator)}
                  onTerminateContracts={() => openTerminateModal(selectedCreator)}
                />
              </div>
            </div>
          </section>
        </div>
      </main>

      <ConfirmationModal
        isOpen={inviteModalOpen}
        onClose={closeInviteModal}
        onConfirm={() => {
          if (inviteTarget) {
            sendCollaborationInvite(inviteTarget.id);
          }
          closeInviteModal();
        }}
        title="Invite to collaborate?"
        message={`Send a new collaboration invitation to ${inviteTarget?.name || "this creator"}. The + New Proposal action will only appear after the creator accepts to collaborate.`}
        confirmLabel="Send Invite"
        confirmClass="bg-[#f77f00] hover:brightness-95"
      />

      <ConfirmationModal
        isOpen={terminateModalOpen}
        onClose={closeTerminateModal}
        onConfirm={() => {
          if (terminateTarget) {
            terminateContracts(terminateTarget.id);
          }
          closeTerminateModal();
        }}
        title="Terminate active contract?"
        message={`Terminate the active contract for ${terminateTarget?.name || "this creator"}. After termination, Stop Collaboration will become available.`}
        confirmLabel="Terminate Contract"
        confirmClass="bg-amber-600 hover:bg-amber-700"
      />

      <ConfirmationModal
        isOpen={stopModalOpen}
        onClose={closeStopModal}
        onConfirm={() => {
          if (stopTarget) {
            stopCollaboration(stopTarget.id);
          }
          closeStopModal();
        }}
        title="Stop collaboration?"
        message={`Are you sure you want to end your active collaboration with ${stopTarget?.name || "this creator"}? This will move them to your past collaborators and clear any active schedules.`}
        confirmLabel="Stop Collaboration"
        confirmClass="bg-red-500 hover:bg-red-600"
      />

      <ProposalDrawer
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        creators={creators}
        initialCreator={proposalRecipient}
        campaigns={SUPPLIER_CAMPAIGNS}
      />
    </div>
  );
}
