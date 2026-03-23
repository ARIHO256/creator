// Round 2 – Page 8: Invites from Sellers (Creator View)
// Purpose: Show collaboration invites brands have sent to the Creator.
// Web-first, mobile-responsive, premium MyLiveDealz styling (primary orange #f77f00).

import React, { useState, useMemo } from "react";

import { PageHeader } from "../../components/PageHeader";
import { PitchDrawer } from "../../components/PitchDrawer";
import { useNavigate } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { CircularProgress } from "@mui/material";
import { creatorApi, type InviteRecord } from "../../lib/creatorApi";

type InviteStatus = "New" | "In discussion" | "Accepted" | "Declined" | "Expired";

type Invite = {
  id: string;
  brand: string;
  initials: string;
  campaign: string;
  inviteType: string;
  category: string;
  region: string;
  baseFee: number;
  currency: string;
  commissionPct: number;
  estimatedValue: number;
  status: InviteStatus;
  daysAgo: number;
  expiresIn: string;
  fitScore: number;
  fitReason: string;
  messageShort: string;
  lastActivity: string;
  supplierDescription: string;
  supplierRating?: number;
  logoUrl?: string;
};

const TABS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" }
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_FILTERS: ("All" | InviteStatus)[] = [
  "All",
  "New",
  "In discussion",
  "Accepted",
  "Declined",
  "Expired"
];

const CATEGORIES = ["All", "Beauty", "Tech", "Faith-compatible", "EV"] as const;

type CategoryFilter = (typeof CATEGORIES)[number];

const currencyFormat = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0 });

function sellerInitials(name?: string | null, fallback?: string | null) {
  if (fallback && fallback.trim()) return fallback.trim().slice(0, 3).toUpperCase();
  return (
    String(name || "SP")
      .split(" ")
      .map((part) => part.trim()[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "SP"
  );
}

function mapInviteStatus(value?: string | null): InviteStatus {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "ACCEPTED") return "Accepted";
  if (normalized === "DECLINED" || normalized === "REJECTED") return "Declined";
  if (normalized === "EXPIRED") return "Expired";
  if (normalized === "NEGOTIATING" || normalized === "COUNTERED" || normalized === "IN_DISCUSSION") return "In discussion";
  return "New";
}

function relativeDays(value?: string) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

function formatLastActivity(value?: string | null) {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `Updated · ${date.toLocaleDateString()}`;
}

function formatExpires(metadata: Record<string, unknown>, status: InviteStatus) {
  if (typeof metadata.expiresIn === "string" && metadata.expiresIn.trim()) return metadata.expiresIn;
  if (typeof metadata.expiresAt === "string" && metadata.expiresAt.trim()) {
    const date = new Date(metadata.expiresAt);
    if (!Number.isNaN(date.getTime())) {
      const days = Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (days <= 0) return "Expired";
      if (days === 1) return "1 day";
      return `${days} days`;
    }
  }
  if (status === "Accepted") return "Accepted";
  if (status === "Declined" || status === "Expired") return "Expired";
  return "Open";
}

function toInvite(record: InviteRecord): Invite {
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const status = mapInviteStatus(record.status);

  return {
    id: record.id,
    brand: String(record.seller || record.sender || ""),
    initials: sellerInitials(record.seller, record.sellerInitials),
    campaign: String(record.campaign || record.title || ""),
    inviteType: String(record.type || (metadata as { inviteType?: unknown }).inviteType || "Collaboration"),
    category: String(record.category || (metadata as { category?: unknown }).category || ""),
    region: String(record.region || (metadata as { region?: unknown }).region || "Global"),
    baseFee: Number(record.baseFee || 0),
    currency: String(record.currency || "USD"),
    commissionPct: Number(record.commissionPct || 0),
    estimatedValue: Number(record.estimatedValue || record.baseFee || 0),
    status,
    daysAgo: relativeDays(record.createdAt),
    expiresIn: formatExpires(metadata, status),
    fitScore: Number(record.fitScore || 0),
    fitReason: String(record.fitReason || (metadata as { fitReason?: unknown }).fitReason || "Good match for your audience."),
    messageShort: String(record.messageShort || record.message || "Review invite details and terms."),
    lastActivity: formatLastActivity(record.updatedAt || record.createdAt || record.lastActivity),
    supplierDescription: String(record.supplierDescription || record.message || "Supplier invite details are available in this workspace."),
    supplierRating: record.supplierRating == null ? undefined : Number(record.supplierRating),
    logoUrl: typeof (metadata as { logoUrl?: unknown }).logoUrl === "string" ? String((metadata as { logoUrl?: unknown }).logoUrl) : undefined
  };
}



// Main page component
export function InvitesFromSellersPage() {

  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("all");
  const [statusFilter, setStatusFilter] = useState<"All" | InviteStatus>("All");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [minBudget, setMinBudget] = useState<string>("");
  const [selectedInviteId, setSelectedInviteId] = useState<string | null>(null);
  const [isPitchDrawerOpen, setIsPitchDrawerOpen] = useState(false);
  const [pitchRecipient, setPitchRecipient] = useState<Invite | null>(null);
  const { run, isPending } = useAsyncAction();
  const {
    data: inviteRecords,
    setData: setInviteRecords,
    loading
  } = useApiResource({
    initialData: [] as InviteRecord[],
    loader: () => creatorApi.invites()
  });
  const invites = useMemo(() => inviteRecords.map(toInvite), [inviteRecords]);
  const categoryOptions = useMemo(
    () => ["All", ...Array.from(new Set(invites.map((invite) => invite.category).filter(Boolean)))],
    [invites]
  );

  const openPitchDrawer = (invite?: Invite) => {
    setPitchRecipient(invite || null);
    setIsPitchDrawerOpen(true);
  };

  // Actions
  const handleAccept = (id: string) => {
    run(async () => {
      const updated = await creatorApi.respondInvite(id, "ACCEPTED");
      setInviteRecords((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
    }, { successMessage: "Invite accepted! Collaboration started." });
  };

  const handleDecline = (id: string) => {
    run(async () => {
      const updated = await creatorApi.respondInvite(id, "DECLINED");
      setInviteRecords((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
    }, { successMessage: "Invite declined." });
  };

  const selectedInvite = useMemo<Invite | null>(() => {
    // Look up in the updated 'invites' state
    if (!selectedInviteId) return invites[0] ?? null;
    return invites.find((i) => i.id === selectedInviteId) ?? invites[0] ?? null;
  }, [selectedInviteId, invites]);

  const filteredInvites = useMemo<Invite[]>(() => {
    return invites.filter((inv) => {
      // Tab logic
      if (tab === "new" && inv.status !== "New") return false;
      if (tab === "active" && !["New", "In discussion", "Accepted"].includes(inv.status))
        return false;
      if (tab === "archived" && !["Declined", "Expired"].includes(inv.status))
        return false;
      // "all" tab shows everything (subject to other filters)

      if (statusFilter !== "All" && inv.status !== statusFilter) return false;
      if (categoryFilter !== "All" && inv.category !== categoryFilter) return false;

      if (minBudget) {
        const min = Number(minBudget) || 0;
        if (inv.estimatedValue < min) return false;
      }
      return true;
    });
  }, [tab, statusFilter, categoryFilter, minBudget, invites]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Invites from Suppliers"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
            <span>📨</span>
            <span>Direct invites · Priority campaigns</span>
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          {/* Header summary + actions */}
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Brands that want to work with you. Review terms, negotiate or accept.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => navigate("/opportunities")}
              >
                View Opportunities Board
              </button>
              <button
                className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-semibold hover:bg-[#e26f00]"
                onClick={() => openPitchDrawer()}
              >
                Start a new pitch
              </button>
            </div>
          </section>

          {/* Tabs + filters */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-300">View:</span>
                <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-0.5 transition-colors">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        className={`px-2.5 py-0.5 rounded-full transition-colors ${active
                          ? "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        onClick={() => setTab(t.id)}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  className="border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InviteStatus | "All")}
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s} value={s}>
                      {s === "All" ? "All statuses" : s}
                    </option>
                  ))}
                </select>
                <select
                  className="border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-300">Budget ≥</span>
                  <input
                    type="number"
                    className="w-20 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs transition-colors"
                    placeholder="e.g. 300"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
              <span>
                Showing <span className="font-semibold dark:font-bold">{filteredInvites.length}</span> of {""}
                {invites.length} invites
              </span>
              {loading ? <span>Loading…</span> : null}
              <button
                className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                onClick={() => {
                  setTab("new");
                  setStatusFilter("All");
                  setCategoryFilter("All");
                  setMinBudget("");
                }}
              >
                Reset
              </button>
            </div>
          </section>

          {/* Main layout: list + detail */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] gap-3 items-start text-sm">
            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">Invites</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  Click an invite to see full details and respond.
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredInvites.map((inv) => (
                  <InviteRow
                    key={inv.id}
                    invite={inv}
                    selected={selectedInviteId === inv.id}
                    onSelect={() => setSelectedInviteId(inv.id)}
                  />
                ))}
                {filteredInvites.length === 0 && (
                  <div className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                    No invites match these filters yet.
                  </div>
                )}
              </div>
            </div>

            {/* Detail panel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <InviteDetailPanel
                invite={selectedInvite}
                onNegotiate={() => openPitchDrawer(selectedInvite || undefined)}
                onAccept={() => selectedInvite && handleAccept(selectedInvite.id)}
                onDecline={() => selectedInvite && handleDecline(selectedInvite.id)}
                isPending={isPending}
              />
            </div>
          </section>
        </div>
      </main>

      {/* Pitch Drawer */}
      <PitchDrawer
        isOpen={isPitchDrawerOpen}
        onClose={() => setIsPitchDrawerOpen(false)}
        recipientName={pitchRecipient?.brand || ""}
        recipientInitials={pitchRecipient?.initials || ""}
        defaultCategory={pitchRecipient?.category || "General"}
        aiSuggestion={
          pitchRecipient
            ? `Hi ${pitchRecipient.brand}, thanks for the invite to ${pitchRecipient.campaign}. I’d love to propose a hybrid model...`
            : undefined
        }
      />
    </div>
  );
}

type InviteRowProps = {
  invite: Invite;
  selected: boolean;
  onSelect: () => void;
};

function InviteRow({ invite, selected, onSelect }: InviteRowProps) {
  const statusColorMap: Record<InviteStatus, string> = {
    New: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    "In discussion": "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700",
    Accepted: "bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-700 text-white dark:text-slate-100",
    Declined: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
    Expired: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  };

  const statusClass = statusColorMap[invite.status] ??
    "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  return (
    <article
      className={`py-2.5 px-2 md:px-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 cursor-pointer transition-colors ${selected ? "bg-amber-50/60 dark:bg-amber-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold dark:font-bold transition-colors">
          {invite.initials}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {invite.brand}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
              · {invite.campaign}
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {invite.inviteType} · {invite.region}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {invite.messageShort}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-xs">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-tiny transition-colors ${statusClass}`}
        >
          <span>●</span>
          <span>{invite.status}</span>
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          Est. value: {invite.currency} {currencyFormat(invite.estimatedValue)}
        </span>
        <span className="text-slate-400 dark:text-slate-500">{invite.lastActivity}</span>
      </div>
    </article>
  );
}

type InviteDetailPanelProps = {
  invite: Invite | null;

  onNegotiate?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  isPending?: boolean;
};

function InviteDetailPanel({ invite, onNegotiate, onAccept, onDecline, isPending }: InviteDetailPanelProps) {
  if (!invite) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 min-h-[260px]">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 max-w-xs transition-colors">
          <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">Select an invite</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            When you click an invite, you&apos;ll see full details here – deliverables, value, and
            next steps.
          </p>
        </div>
      </div>
    );
  }

  const forecastLabel = `${invite.currency} ${currencyFormat(invite.estimatedValue)}`;

  let statusHint = "Review this invite and decide whether to accept, negotiate or decline.";
  if (invite.status === "New") {
    statusHint = "New invite – brands often prioritise early replies.";
  } else if (invite.status === "In discussion") {
    statusHint = "You are currently in discussion with this brand. Clarify timelines and deliverables.";
  } else if (invite.status === "Accepted") {
    statusHint = "This invite has been accepted. Focus now shifts to planning and execution.";
  } else if (invite.status === "Declined") {
    statusHint = "This invite was declined. You can always pitch a different format later.";
  } else if (invite.status === "Expired") {
    statusHint = "This invite has expired. You may reach out to the brand with a fresh pitch.";
  }

  const isActionable = ["New", "In discussion"].includes(invite.status);

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Supplier Profile Card */}
      <section className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-600 flex items-center justify-center text-xl font-black text-[#f77f00] overflow-hidden">
              {invite.logoUrl ? (
                <img src={invite.logoUrl} alt={invite.brand} className="w-full h-full object-cover" />
              ) : (
                invite.initials
              )}
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {invite.brand}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {invite.supplierRating && (
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800 transition-colors">
                    <span className="text-amber-500 text-xs">★</span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                      {invite.supplierRating}
                    </span>
                  </div>
                )}
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Verified Supplier
                </span>
              </div>
            </div>
          </div>
          {/* Quick Actions Row */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-[#f77f00] hover:border-[#f77f00] dark:hover:text-[#f77f00] dark:hover:border-[#f77f00] transition-all shadow-sm group"
              title="View Supplier"
            >
              <span className="text-sm group-hover:scale-110 transition-transform">👁️</span>
            </button>
            {isActionable && (
              <>
                <button
                  onClick={onAccept}
                  disabled={isPending}
                  className="p-2 rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm group disabled:opacity-50"
                  title="Accept Invite"
                >
                  {isPending ? <CircularProgress size={14} color="inherit" /> : <span className="text-sm group-hover:scale-110 transition-transform">✔️</span>}
                </button>
                <button
                  onClick={onDecline}
                  disabled={isPending}
                  className="p-2 rounded-xl border border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm group disabled:opacity-50"
                  title="Decline Invite"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">✖️</span>
                </button>
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic border-t border-slate-100 dark:border-slate-700 pt-3">
          {invite.supplierDescription}
        </p>
      </section>

      {/* Campaign Highlights */}
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2 p-1">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{invite.campaign}</h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {invite.inviteType} · {invite.category} · {invite.region}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Estimated Value</span>
            <span className="text-xl font-black text-[#f77f00]">
              {forecastLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex flex-col gap-1 transition-all">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Compensation</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {invite.currency} {currencyFormat(invite.baseFee)}
              {invite.commissionPct > 0 && (
                <span className="text-[#f77f00] ml-1">
                  + {invite.commissionPct}% Comms
                </span>
              )}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex flex-col gap-1 transition-all">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline/Expiry</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{invite.expiresIn}</span>
          </div>
        </div>
      </section>

      <section className="border border-[#f77f00]/20 dark:border-[#f77f00]/30 rounded-2xl p-4 bg-amber-50/20 dark:bg-[#f77f00]/5 flex flex-col gap-2 transition-all">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Creator Match</span>
          <div className="h-px flex-1 bg-amber-100 dark:bg-slate-800" />
          <span className="text-xs font-black text-[#f77f00]">{invite.fitScore}/100</span>
        </div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{invite.fitReason}</p>
      </section>

      <div className="group relative border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 flex flex-col gap-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personal Message</span>
        <p className="text-sm text-slate-700 dark:text-slate-300 italic animate-in fade-in slide-in-from-left-2 duration-500">"{invite.messageShort}"</p>
        <div className="flex items-center gap-2 mt-1">
          <div className={`w-2 h-2 rounded-full animate-pulse transition-colors ${isActionable ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"}`} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{statusHint}</span>
        </div>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Need help?</span>
          <button className="text-xs font-bold text-[#f77f00] hover:underline flex items-center gap-1 transition-all">
            Ask AI Assistant 🪄
          </button>
        </div>
        {isActionable ? (
          <div className="flex items-center gap-2">
            <button
              className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm disabled:opacity-50"
              onClick={onDecline}
              disabled={isPending}
            >
              Decline Invite
            </button>
            <button
              className="px-6 py-2.5 rounded-2xl bg-[#f77f00] text-white text-xs font-black hover:bg-[#e26f00] transition-all shadow-lg hover:shadow-orange-200 dark:hover:shadow-none hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={onAccept}
              disabled={isPending}
            >
              {isPending ? <CircularProgress size={14} color="inherit" /> : null}
              Start Collaboration
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full transition-colors">
            <span className="text-xs font-bold text-slate-500 italic uppercase">● {invite.status}</span>
          </div>
        )}
      </section>
    </div>
  );
}
