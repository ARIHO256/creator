// Creator My Sellers Page (Accepted Collaborations Only)
// Business rule: Sellers listed here are brands/providers that have ALREADY
// accepted at least one collaboration with the Creator. No pure leads or
// warm-only brands appear here – those live in the Suppliers Directory or
// Campaigns Board.

import React, { useState, useMemo } from "react";
// import { useTheme } from "../../contexts/ThemeContext";
import { PageHeader } from "../../components/PageHeader";
import { PitchDrawer } from "../../components/PitchDrawer";
import { useNavigate } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import { creatorApi, type PublicSellerRecord } from "../../lib/creatorApi";

// Relationship reflects current state of collaboration with a seller that has
// already accepted at least one collab in the past.
// "Active collab"  – at least one current contract / agreement.
// "Past collab"    – no active contract now, but at least one completed.

type Relationship = "Active collab" | "Past collab";

type MySeller = {
  id: number;
  apiId: string;
  name: string;
  initials: string;
  tagline: string;
  categories: string[];
  relationship: Relationship;
  lifetimeRevenue: number;
  currentValue: number;
  avgConversion: number;
  campaignsCount: number;
  lastCampaign: string;
  lastResult: string;
  openProposals: number;
  activeContracts: number;
  rating: number;
  trustBadges: string[];
  primaryContact: string;
  nextLive: string;
  nextAction: string;
  following: boolean;
  favourite: boolean;
};

function mySellerNumericId(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits) return Number(digits.slice(-9));
  return Array.from(value).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function mySellerInitials(name?: string | null) {
  return String(name ?? "")
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toMySeller(record: PublicSellerRecord): MySeller {
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const categories = Array.isArray(record.categories) && record.categories.length > 0
    ? record.categories
    : [String(record.category || "")].filter(Boolean);
  const activeContracts = Number((metadata as { activeContracts?: unknown }).activeContracts || 0);

  return {
    id: mySellerNumericId(String(record.id)),
    apiId: String(record.id),
    name: String(record.displayName || record.name || ""),
    initials: mySellerInitials(record.displayName || record.name),
    tagline: String(record.description || ""),
    categories,
    relationship: activeContracts > 0 ? "Active collab" : "Past collab",
    lifetimeRevenue: Number((metadata as { lifetimeRevenue?: unknown }).lifetimeRevenue || 0),
    currentValue: Number((metadata as { currentValue?: unknown }).currentValue || 0),
    avgConversion: Number((metadata as { avgConversion?: unknown }).avgConversion || 0),
    campaignsCount: Number((metadata as { campaignsCount?: unknown }).campaignsCount || 0),
    lastCampaign: String((metadata as { lastCampaign?: unknown }).lastCampaign || ""),
    lastResult: String((metadata as { lastResult?: unknown }).lastResult || ""),
    openProposals: Number((metadata as { openProposals?: unknown }).openProposals || 0),
    activeContracts,
    rating: Number(record.rating || 0),
    trustBadges: Array.isArray((metadata as { trustBadges?: unknown[] }).trustBadges) ? ((metadata as { trustBadges?: unknown[] }).trustBadges as unknown[]).map((item) => String(item)) : [],
    primaryContact: String((metadata as { primaryContact?: unknown }).primaryContact || ""),
    nextLive: String((metadata as { nextLive?: unknown }).nextLive || ""),
    nextAction: String((metadata as { nextAction?: unknown }).nextAction || ""),
    following: Boolean((metadata as { following?: unknown }).following),
    favourite: Boolean((metadata as { favourite?: unknown }).favourite)
  };
}

type MySellersPageProps = {
  onChangePage?: (page: string) => void;
};

export function MySellersPage({ onChangePage }: MySellersPageProps) {
  // const { theme } = useTheme();
  // const navigate = useNavigate();
  const { data: mySellerRecords } = useApiResource({
    initialData: [] as PublicSellerRecord[],
    loader: () => creatorApi.mySellers()
  });
  const [mySellers, setMySellers] = useState<MySeller[]>([]);
  const [search, setSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState<"All" | Relationship>("All");
  const [viewTab, setViewTab] = useState<"all" | "active" | "past">("all");
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [expandedSellerId, setExpandedSellerId] = useState<number | null>(null);
  const [isPitchDrawerOpen, setIsPitchDrawerOpen] = useState(false);
  const [pitchRecipient, setPitchRecipient] = useState<MySeller | null>(null);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);

  React.useEffect(() => {
    setMySellers(mySellerRecords.map(toMySeller));
  }, [mySellerRecords]);

  const openPitchDrawer = (seller?: MySeller) => {
    if (seller) {
      setPitchRecipient(seller);
    } else {
      // If global "Pitch Suppliers" is clicked, maybe pick selected or default
      setPitchRecipient(selectedSeller || mySellers[0] || null);
    }
    setIsPitchDrawerOpen(true);
  };

  const stats = useMemo(() => {
    const active = mySellers.filter((s) => s.relationship === "Active collab");
    const past = mySellers.filter((s) => s.relationship === "Past collab");
    const lifetime = mySellers.reduce((sum, s) => sum + s.lifetimeRevenue, 0);
    const activeValue = active.reduce((sum, s) => sum + s.currentValue, 0);
    return {
      activeCount: active.length,
      pastCount: past.length,
      totalCount: mySellers.length,
      lifetime,
      activeValue
    };
  }, [mySellers]);

  const filteredSellers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mySellers.filter((s) => {
      if (relationshipFilter !== "All" && s.relationship !== relationshipFilter) return false;
      if (viewTab === "active" && s.relationship !== "Active collab") return false;
      if (viewTab === "past" && s.relationship !== "Past collab") return false;
      if (q) {
        const inName = s.name.toLowerCase().includes(q);
        const inTagline = s.tagline.toLowerCase().includes(q);
        const inCategory = s.categories.some((c) => c.toLowerCase().includes(q));
        if (!inName && !inTagline && !inCategory) return false;
      }
      return true;
    });
  }, [mySellers, search, relationshipFilter, viewTab]);

  const selectedSeller = useMemo<MySeller | null>(() => {
    if (selectedSellerId == null) return filteredSellers[0] ?? null;
    return filteredSellers.find((s) => s.id === selectedSellerId) ?? filteredSellers[0] ?? null;
  }, [filteredSellers, selectedSellerId]);

  const toggleFollow = (id: number) => {
    setMySellers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        void creatorApi.followSeller(s.apiId, !s.following);
        return {
          ...s,
          following: !s.following
        };
      })
    );
  };

  const toggleFavourite = (id: number) => {
    setMySellers((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
            ...s,
            favourite: !s.favourite
          }
          : s
      )
    );
  };

  // Stop collaboration: turn Active collab into Past collab and reset active counters
  const stopCollaboration = (id: number) => {
    setMySellers((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
            ...s,
            relationship: "Past collab",
            activeContracts: 0,
            currentValue: 0,
            nextLive: "Not scheduled",
            nextAction: "Collaboration stopped by creator"
          }
          : s
      )
    );
  };

  const formatMoney = (value: number) => `$${value.toLocaleString()}`;

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="My Suppliers"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
            <span>🤝</span>
            <span>Only brands with accepted collaboration</span>
          </span>
        }
        mobileViewType="hide"
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          {/* Overview + stats */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-3 text-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  All brands that have accepted at least one collaboration with you – active and
                  past.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => onChangePage?.("sellers")}
                >
                  Discover new brands
                </button>
                <button
                  className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00]"
                  onClick={() => openPitchDrawer()}
                >
                  Pitch Suppliers
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1 text-sm">
              <StatCard
                label="Active collaborators"
                value={stats.activeCount}
                sub="Current contracts or campaigns"
              />
              <StatCard
                label="Past collaborators"
                value={stats.pastCount}
                sub="Completed campaigns"
              />
              <StatCard
                label="Total My Suppliers"
                value={stats.totalCount}
                sub="Brands with accepted collabs"
              />
              <StatCard
                label="Lifetime revenue from My Suppliers"
                value={formatMoney(stats.lifetime)}
                sub={`~${formatMoney(stats.activeValue)} currently active`}
                money
              />
            </div>
          </section>

          {/* Filters row */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
            <div className="flex flex-col md:flex-row gap-2 md:gap-3 items-stretch md:items-center">
              <div className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 transition-colors">
                <span>🔍</span>
                <input
                  className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  placeholder="Search by seller, tagline or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <select
                  className="border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors cursor-pointer outline-none"
                  value={relationshipFilter}
                  onChange={(e) =>
                    setRelationshipFilter(e.target.value as "All" | Relationship)
                  }
                >
                  <option value="All" className="bg-white dark:bg-slate-800">All relationships</option>
                  <option value="Active collab" className="bg-white dark:bg-slate-800">Active collaborations</option>
                  <option value="Past collab" className="bg-white dark:bg-slate-800">Past collaborations</option>
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-300 mr-1">View:</span>
                  <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-0.5 transition-colors">
                    {[
                      { id: "all", label: "All" },
                      { id: "active", label: "Active" },
                      { id: "past", label: "Past" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        className={`px-2.5 py-0.5 rounded-full transition-colors ${viewTab === tab.id
                          ? "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        onClick={() => setViewTab(tab.id as "all" | "active" | "past")}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
              <span>
                Showing <span className="font-semibold dark:font-bold">{filteredSellers.length}</span> of{" "}
                {mySellers.length} My Suppliers
              </span>
              <button
                className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                onClick={() => {
                  setSearch("");
                  setRelationshipFilter("All");
                  setViewTab("all");
                }}
              >
                Reset
              </button>
            </div>
          </section>

          {/* Main layout: list + detail */}
          <section className="flex flex-col-reverse lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] gap-4 items-start text-sm">
            {/* List */}
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">My Suppliers</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300 hidden sm:inline">
                  These brands have already accepted collaboration with you.
                </span>
              </div>
              <div className="space-y-2">
                {filteredSellers.map((s) => (
                  <SellerRow
                    key={s.id}
                    seller={s}
                    selected={selectedSeller?.id === s.id}
                    isExpanded={expandedSellerId === s.id}
                    onSelect={() => setSelectedSellerId(s.id)}
                    onToggle={() => setExpandedSellerId(expandedSellerId === s.id ? null : s.id)}
                    onToggleFollow={() => toggleFollow(s.id)}
                    onToggleFavourite={() => toggleFavourite(s.id)}
                    onChangePage={onChangePage}
                    onPitch={(seller) => openPitchDrawer(seller)}
                    onStopCollaboration={() => setIsStopModalOpen(true)}
                  />
                ))}
                {filteredSellers.length === 0 && (
                  <div className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                    No My Suppliers match this view yet.
                  </div>
                )}
              </div>
            </div>

            {/* Detail panel (Desktop only) */}
            <div id="seller-detail-panel" className="hidden lg:block w-full bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 lg:sticky lg:top-20">
              <SellerDetailPanel
                seller={selectedSeller}
                onChangePage={onChangePage}
                onPitch={(seller) => openPitchDrawer(seller)}
                onStopCollaboration={() => setIsStopModalOpen(true)}
              />
            </div>
          </section>
        </div>
      </main>

      <ConfirmationModal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        onConfirm={() => {
          if (selectedSeller) {
            stopCollaboration(selectedSeller.id);
            setIsStopModalOpen(false);
          }
        }}
        title="Stop Collaboration?"
        message={`Are you sure you want to end your active collaboration with ${selectedSeller?.name}? This will move them to your past collaborators and clear any active schedules.`}
        confirmLabel="Stop Collaboration"
        confirmClass="bg-red-500 hover:bg-red-600 shadow-red-100 dark:shadow-none"
      />

      {/* Pitch Drawer */}
      <PitchDrawer
        isOpen={isPitchDrawerOpen}
        onClose={() => setIsPitchDrawerOpen(false)}
        recipientName={pitchRecipient?.name || ""}
        recipientInitials={pitchRecipient?.initials || ""}
        defaultCategory={pitchRecipient?.categories?.[0] || ""}
      />
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  money?: boolean;
};

function StatCard({ label, value, sub, money }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl px-3 py-2.5 flex flex-col justify-between bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${money ? "bg-[#f77f00]" : "bg-slate-200 dark:bg-slate-700"
          }`}
      />
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
        <span>{label}</span>
      </div>
      <div
        className={`text-sm font-semibold mb-1 ${money ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100"
          }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

type SellerRowProps = {
  seller: MySeller;
  selected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onToggleFollow: () => void;
  onToggleFavourite: () => void;
  onChangePage?: (page: string) => void;
  onPitch: (seller: MySeller) => void;
  onStopCollaboration: () => void;
};

function SellerRow({
  seller,
  selected,
  isExpanded,
  onSelect,
  onToggle,
  onToggleFollow,
  onToggleFavourite,
  onChangePage,
  onPitch,
  onStopCollaboration
}: SellerRowProps) {
  const navigate = useNavigate();
  const openNewOpportunities = () => {
    navigate("/opportunities", {
      state: {
        supplierName: seller.name,
        onlyCurrent: true,
        source: "my-suppliers"
      }
    });
  };

  const relLabel = seller.relationship === "Active collab" ? "Active collab" : "Past collab";
  const relColor =
    seller.relationship === "Active collab"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  const actions = (
    <div
      className="flex flex-col items-end gap-2.5 min-w-[140px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-1.5">
        <button
          className={`px-3 py-1 rounded-full border text-[10px] font-bold transition-all ${seller.following
            ? "bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-700 text-white dark:text-slate-100"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          onClick={onToggleFollow}
        >
          {seller.following ? "Following" : "Follow"}
        </button>
        <button
          className={`px-3 py-1 rounded-full border text-[10px] font-bold transition-all ${seller.favourite
            ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          onClick={onToggleFavourite}
        >
          {seller.favourite ? "Pinned" : "Pin"}
        </button>
      </div>
      <div className="text-[10px] text-slate-600 dark:text-slate-400 text-right leading-tight">
        <div className="mb-0.5">
          Next live: <span className="font-bold text-slate-900 dark:text-slate-100">{seller.nextLive || "Not scheduled"}</span>
        </div>
        <div>
          Next action: <span className="font-medium">{seller.nextAction}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-end mt-1">
        <button
          className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 transition-colors border border-emerald-200 dark:border-emerald-700"
          onClick={openNewOpportunities}
          title={`View currently available opportunities from ${seller.name}`}
        >
          View New Opportunities
        </button>
        {[
          { label: "Workspace", path: "/proposal-negotiation" },
          { label: "Proposals", path: "/proposals" },
          { label: "Contracts", path: "/contracts" }
        ].map((link) => (
          <button
            key={link.label}
            className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-[10px] font-bold text-[#f77f00] hover:text-[#e26f00] transition-colors border border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800"
            onClick={() => navigate(link.path)}
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <article
      className={`py-3.5 px-3 md:px-5 flex flex-col gap-2 cursor-pointer transition-all duration-200 rounded-2xl border ${selected
        ? "bg-amber-50/70 dark:bg-amber-900/40 border-amber-200 dark:border-amber-600 shadow-sm"
        : "bg-white dark:bg-slate-800 border-transparent dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-100 dark:hover:border-slate-600"
        }`}
      onClick={() => {
        onSelect();
        if (window.innerWidth < 1024) {
          onToggle();
        }
      }}
    >
      <div className="flex w-full items-start justify-between gap-6">
        {/* Brand & relationship */}
        <div className="flex gap-4 items-start min-w-0 flex-1">
          <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold transition-colors flex-shrink-0 border-2 border-white dark:border-slate-800 shadow-sm">
            {seller.initials}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                {seller.name}
              </span>
              {seller.favourite && (
                <span className="text-xs text-amber-500 dark:text-amber-400">★</span>
              )}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed max-w-md">
              {seller.tagline}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {seller.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900/50 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors border border-slate-100 dark:border-slate-700"
                >
                  {cat}
                </span>
              ))}
            </div>
            <span
              className={`mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[10px] font-bold tracking-tight transition-colors ${relColor}`}
            >
              <span>🤝</span>
              <span className="uppercase">{relLabel}</span>
            </span>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden lg:block flex-shrink-0 pt-1">
          {actions}
        </div>

        {/* Mobile chevron */}
        <div className="lg:hidden text-slate-400 self-center pr-1">
          <span className={`transition-transform duration-300 inline-block ${isExpanded ? "rotate-180 text-[#f77f00]" : ""}`}>
            ▼
          </span>
        </div>
      </div>

      {/* Expanded content for mobile (Full Detail Panel) */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 lg:hidden">
          <SellerDetailPanel
            seller={seller}
            onChangePage={onChangePage}
            onPitch={onPitch}
            onStopCollaboration={onStopCollaboration}
            isInline
          />
        </div>
      )}
    </article>
  );
}

type SellerDetailPanelProps = {
  seller: MySeller | null;
  onStopCollaboration?: () => void;
  onPitch?: (seller: MySeller) => void;
  onChangePage?: (page: string) => void;
  isInline?: boolean;
};

function SellerDetailPanel({
  seller,
  onStopCollaboration,
  onPitch,
  onChangePage: _onChangePage,
  isInline
}: SellerDetailPanelProps) {
  const navigate = useNavigate();
  const openNewOpportunities = () => {
    if (!seller) return;
    navigate("/opportunities", {
      state: {
        supplierName: seller.name,
        onlyCurrent: true,
        source: "my-suppliers"
      }
    });
  };
  if (!seller) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 min-h-[260px]">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 max-w-xs transition-colors">
          <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">Select a seller</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            When you pick a seller on the left, you&apos;ll see relationship history, performance
            and next steps here.
          </p>
        </div>
      </div>
    );
  }

  const relColor =
    seller.relationship === "Active collab"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  const canStop = seller.relationship === "Active collab" && !!onStopCollaboration;

  return (
    <div className={`flex flex-col gap-3 text-sm ${isInline ? "p-0 bg-transparent border-none shadow-none" : ""}`}>
      {/* Header - hide on mobile inline if redundant, but keep for clarity here */}
      {!isInline && (
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold dark:font-bold transition-colors">
              {seller.initials}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {seller.name}
                </span>
                <span className="text-xs text-amber-500 dark:text-amber-400">
                  ★ {seller.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-300">{seller.tagline}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {seller.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {cat}
                  </span>
                ))}
              </div>
              <span
                className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-tiny transition-colors ${relColor}`}
              >
                <span>🤝</span>
                <span>{seller.relationship}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="text-xs text-slate-500 dark:text-slate-400">Primary contact</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{seller.primaryContact}</span>
          </div>
        </div>
      )}

      {/* Relationship details */}
      <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 flex flex-col gap-1 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Relationship summary</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Campaigns: <span className="font-medium">{seller.campaignsCount}</span>
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors">
            <div className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">Campaigns &amp; value</div>
            <div>Campaigns: {seller.campaignsCount}</div>
            <div>
              Lifetime revenue: <span className="font-medium">${seller.lifetimeRevenue.toLocaleString()}</span>
            </div>
            <div>
              Current active value: <span className="font-medium">${seller.currentValue.toLocaleString()}</span>
            </div>
            <div>
              Last campaign: <span className="font-medium">{seller.lastCampaign}</span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors">
            <div className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">Performance &amp; pipeline</div>
            <div>
              Avg. conversion: <span className="font-medium">{seller.avgConversion.toFixed(1)}%</span>
            </div>
            <div>
              Rating: <span className="font-medium">★ {seller.rating.toFixed(1)}</span>
            </div>
            <div className="mt-1 text-slate-500 dark:text-slate-400">
              Active contracts: <span className="font-medium">{seller.activeContracts}</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              Open proposals: <span className="font-medium">{seller.openProposals}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested next moves */}
      <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 transition-colors">
        <h3 className="text-sm font-semibold mb-1 text-slate-900 dark:text-slate-100">Suggested next moves</h3>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>
            Consider a follow-up live using the best-performing structure from <span className="font-medium">{seller.lastCampaign}</span>.
          </li>
          <li>
            Use your conversion ({seller.avgConversion.toFixed(1)}%) and rating to negotiate
            better terms on the next cycle.
          </li>
          <li>
            Add a quick note in your CRM about what worked well (and what didn&apos;t) in the last
            collaboration.
          </li>
        </ul>
      </div>

      {/* Quick links & Primary Actions */}
      <div className="flex flex-col gap-4 mt-2 border-t border-slate-100 dark:border-slate-800 pt-4">
        {seller.relationship === "Active collab" ? (
          <button
            className="w-full py-3 rounded-2xl bg-[#f77f00] text-white font-black text-sm hover:bg-[#e26f00] transition-all shadow-lg hover:shadow-orange-200 dark:hover:shadow-none hover:-translate-y-0.5"
            onClick={() => onPitch?.(seller)}
          >
            Pitch {seller.name}
          </button>
        ) : (
          <button
            className="w-full py-3 rounded-2xl bg-[#f77f00] text-white font-black text-sm hover:bg-[#e26f00] transition-all shadow-lg hover:shadow-orange-200 dark:hover:shadow-none hover:-translate-y-0.5"
            onClick={() => onPitch?.(seller)}
          >
            Invite to Collaborate
          </button>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            className="w-full px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold transition-colors shadow-sm"
            onClick={openNewOpportunities}
            title={`View currently available opportunities from ${seller.name}`}
          >
            View New Opportunities
          </button>
          <button
            className="flex-1 min-w-[120px] px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors shadow-sm"
            onClick={() => navigate("/proposal-negotiation")}
          >
            Collab workspace
          </button>
          <button
            className="flex-1 min-w-[120px] px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors shadow-sm"
            onClick={() => navigate("/proposals")}
          >
            Proposals
          </button>
          <button
            className="flex-1 min-w-[120px] px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors shadow-sm"
            onClick={() => navigate("/contracts")}
          >
            Contracts
          </button>
        </div>

        {canStop && (
          <div className="pt-2 border-t border-slate-50 dark:border-slate-800/50 mt-2">
            <button
              className="w-full py-2.5 rounded-2xl border border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 font-bold text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
              onClick={onStopCollaboration}
            >
              <span>⛔</span>
              Stop Collaboration with {seller.name}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2 italic px-4">
              Stopping collaboration will archive active contracts and move this brand to your past history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmLabel, confirmClass }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>
        <div className="flex items-center gap-3">
          <button
            className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`flex-1 px-4 py-2.5 rounded-2xl text-white font-black transition-all active:scale-95 shadow-lg ${confirmClass}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
