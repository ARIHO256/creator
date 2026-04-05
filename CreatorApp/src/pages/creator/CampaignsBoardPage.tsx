// Round 2 – Page 9: Campaigns Board (Creator View)
// Purpose: Pipeline view of all campaigns & Shoppable Adz the Creator is involved in.
// Stages: Leads · Pitches sent · Negotiating · Active contracts · Completed
// Premium extras: money-first summary, stage chips, Kanban-style columns, quick links
// into Proposals, Shoppable Adz, Live Schedule and Contracts. Also surfaces origin
// (from invites vs creator pitches) and simple pipeline health.

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../../components/PageHeader";
import { PitchDrawer } from "../../components/PitchDrawer";
import { useApiResource } from "../../hooks/useApiResource";
import { creatorApi, type CollaborationCampaignRecord } from "../../lib/creatorApi";

const STAGES = [
  "Leads",
  "Pitches sent",
  "Negotiating",
  "Active contracts",
  "Completed",
  "Terminated"
] as const;

type StageId = (typeof STAGES)[number];

type Origin = "seller-invite" | "creator-pitch";

type PipelineHealth = "on-track" | "at-risk" | "stalled";

type Campaign = {
  id: string;
  sellerId?: string;
  name: string;
  seller: string;
  stage: StageId;
  origin: Origin;
  estValue: number;
  currency: string;
  type: string;
  region: string;
  nextAction: string;
  promoCount: number;
  liveCount: number;
  health: PipelineHealth;
  lastActivity: string;
};

function mapCampaignStage(status?: string | null): StageId {
  const normalized = String(status || "").trim().toUpperCase();
  if (["ACTIVE", "APPROVED", "LIVE", "RUNNING", "IN_PROGRESS"].includes(normalized)) return "Active contracts";
  if (["COMPLETED", "DONE", "FINISHED"].includes(normalized)) return "Completed";
  if (["TERMINATED", "CANCELLED", "REJECTED"].includes(normalized)) return "Terminated";
  if (["NEGOTIATING", "NEGOTIATION", "COUNTERED"].includes(normalized)) return "Negotiating";
  if (["SUBMITTED", "PITCHED", "PROPOSED", "PENDING"].includes(normalized)) return "Pitches sent";
  return "Leads";
}

function mapCampaignOrigin(metadata: Record<string, unknown>): Origin {
  return String(metadata.origin || "").trim().toLowerCase() === "seller-invite" ? "seller-invite" : "creator-pitch";
}

function mapCampaignHealth(stage: StageId, metadata: Record<string, unknown>): PipelineHealth {
  const explicit = String(metadata.health || "").trim().toLowerCase();
  if (explicit === "on-track" || explicit === "at-risk" || explicit === "stalled") {
    return explicit as PipelineHealth;
  }
  if (stage === "Negotiating") return "at-risk";
  if (stage === "Terminated" || stage === "Leads") return "stalled";
  return "on-track";
}

function formatActivityLabel(value?: string | null) {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return `Updated · ${date.toLocaleDateString()}`;
}

function toCampaign(record: CollaborationCampaignRecord): Campaign {
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const stage = mapCampaignStage(record.status);

  return {
    id: record.id,
    sellerId: typeof record.sellerId === "string" ? record.sellerId : undefined,
    name: String(record.title || ""),
    seller: String(record.seller || ""),
    stage,
    origin: mapCampaignOrigin(metadata),
    estValue: Number(record.budget || 0),
    currency: String(record.currency || "USD"),
    type: String((metadata as { type?: unknown }).type || ""),
    region: String((metadata as { region?: unknown }).region || "Global"),
    nextAction: String(
      (metadata as { nextAction?: unknown }).nextAction || (stage === "Completed" ? "Review performance" : "Open campaign")
    ),
    promoCount: Number((metadata as { promoCount?: unknown }).promoCount || 0),
    liveCount: Number((metadata as { liveCount?: unknown }).liveCount || 0),
    health: mapCampaignHealth(stage, metadata),
    lastActivity: formatActivityLabel(record.updatedAt || record.createdAt)
  };
}

export type CampaignsBoardPageProps = {
  onChangePage?: (page: string) => void;
};

export function CampaignsBoardPage({ onChangePage: _onChangePage }: CampaignsBoardPageProps = {}) {
  const navigate = useNavigate();
  // const { theme } = useTheme();
  const [activeStageFilter, setActiveStageFilter] = useState<StageId | "All">("All");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Campaign>("estValue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isPitchDrawerOpen, setIsPitchDrawerOpen] = useState(false);
  const [pitchRecipient, setPitchRecipient] = useState<Campaign | null>(null);
  const { data: campaignRecords } = useApiResource({
    initialData: [] as CollaborationCampaignRecord[],
    loader: () => creatorApi.campaigns()
  });
  const campaigns = useMemo(() => campaignRecords.map(toCampaign), [campaignRecords]);

  const openPitchDrawer = (campaign?: Campaign) => {
    setPitchRecipient(campaign || null);
    setIsPitchDrawerOpen(true);
  };

  const totalValue = useMemo(() => {
    return campaigns.reduce((sum, c) => sum + c.estValue, 0);
  }, [campaigns]);

  const stageSummaries = useMemo(() => {
    const map: Record<StageId, { count: number; value: number }> = {
      Leads: { count: 0, value: 0 },
      "Pitches sent": { count: 0, value: 0 },
      Negotiating: { count: 0, value: 0 },
      "Active contracts": { count: 0, value: 0 },
      Completed: { count: 0, value: 0 },
      Terminated: { count: 0, value: 0 }
    };
    campaigns.forEach((c) => {
      map[c.stage].count += 1;
      map[c.stage].value += c.estValue;
    });
    return map;
  }, [campaigns]);

  const originSummaries = useMemo(() => {
    const base = {
      "seller-invite": { count: 0, value: 0 },
      "creator-pitch": { count: 0, value: 0 }
    };
    campaigns.forEach((c) => {
      base[c.origin].count += 1;
      base[c.origin].value += c.estValue;
    });
    return base;
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = campaigns.filter((c) => {
      if (activeStageFilter !== "All" && c.stage !== activeStageFilter) return false;
      if (q) {
        const inName = c.name.toLowerCase().includes(q);
        const inSeller = c.seller.toLowerCase().includes(q);
        const inType = c.type.toLowerCase().includes(q);
        if (!inName && !inSeller && !inType) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [activeStageFilter, campaigns, search, sortKey, sortOrder]);

  const toggleSort = (key: keyof Campaign) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const formatMoney = (value: number) => `$${value.toLocaleString()}`;

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Campaigns Board"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
            <span>📊</span>
            <span>Leads · Pitches · Negotiations · Contracts</span>
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          {/* Header + money summary */}
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
            <div>
              <h1 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-0.5">Campaigns Board</h1>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Track all live &amp; Promo Ad campaigns as a pipeline – from leads to active
                contracts and completed work.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex flex-col min-w-[140px]">
                <span className="text-slate-500 dark:text-slate-300">Total estimated value</span>
                <span className="text-lg font-semibold text-[#f77f00] dark:text-[#f77f00]">
                  {formatMoney(totalValue)}
                </span>
              </div>
              <button
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => openPitchDrawer()}
              >
                ➕ New pitch
              </button>
            </div>
          </section>

          {/* Filters row */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-2 flex flex-col gap-2 text-sm">
            <div className="flex flex-col gap-3 p-2">
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-slate-50 dark:bg-slate-800 transition-colors">
                <span className="text-slate-400">🔍</span>
                <input
                  className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  placeholder="Filter campaigns by name, brand or type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveStageFilter("All")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${activeStageFilter === "All"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md scale-105"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                >
                  All Pipelines
                </button>
                {(["Leads", "Pitches sent", "Negotiating", "Active contracts", "Completed", "Terminated"] as const).map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setActiveStageFilter(stage)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${activeStageFilter === stage
                      ? "bg-[#f77f00] text-white border-[#f77f00] shadow-md scale-105"
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Table Pipeline */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-all shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight">Active Pipelines</h2>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-bold text-slate-400">HEALTHY</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <span className="text-[10px] font-bold text-slate-400">WARNING</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        Campaign & Brand {sortKey === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</span>
                    </th>
                    <th className="px-6 py-4">
                      <button onClick={() => toggleSort("estValue")} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        Value {sortKey === "estValue" && (sortOrder === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Status</span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Step</span>
                    </th>
                    <th className="px-6 py-4 text-right">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {filteredCampaigns.map((c) => (
                    <CampaignTableRow key={c.id} campaign={c} />
                  ))}
                  {filteredCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                        No campaigns matches your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Pitch Drawer */}
      <PitchDrawer
        isOpen={isPitchDrawerOpen}
        onClose={() => setIsPitchDrawerOpen(false)}
        recipientName={pitchRecipient?.seller || "New Supplier"}
        recipientInitials={pitchRecipient?.seller?.slice(0, 2).toUpperCase() || "??"}
        defaultCategory={pitchRecipient?.type || ""}
        campaignId={pitchRecipient?.id}
        campaignTitle={pitchRecipient?.name}
        sellerId={pitchRecipient?.sellerId}
      />
    </div>
  );
}

function CampaignTableRow({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const statusColors: Record<StageId, string> = {
    Leads: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
    "Pitches sent": "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700",
    Negotiating: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    "Active contracts": "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
    Completed: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    Terminated: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700"
  };

  const healthClasses: Record<PipelineHealth, string> = {
    "on-track": "bg-emerald-500",
    "at-risk": "bg-amber-500 animate-pulse",
    stalled: "bg-slate-400"
  };

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 shadow-sm transition-transform group-hover:scale-110">
              {campaign.seller[0]}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${healthClasses[campaign.health]}`} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
              {campaign.name}
            </span>
            <span className="text-[10px] font-bold text-[#f77f00] uppercase tracking-tighter">
              {campaign.seller}
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{campaign.type}</span>
          <span className="text-[10px] text-slate-400">{campaign.region}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {campaign.currency} {campaign.estValue.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 italic">Estimated</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${statusColors[campaign.stage]}`}>
          {campaign.stage}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col max-w-[180px]">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{campaign.nextAction}</span>
          <span className="text-[10px] text-slate-400 truncate">{campaign.lastActivity}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => navigate("/proposals")}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-[#f77f00] hover:border-[#f77f00] dark:hover:text-[#f77f00] dark:hover:border-[#f77f00] transition-all"
            title="View Proposals"
          >
            📋
          </button>
          <button
            onClick={() => navigate("/contracts")}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all font-bold"
            title="Contracts"
          >
            ✍️
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all relative"
            title="More options"
          >
            •••
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/AdzDashboard");
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  🛍️ Shoppable Adz
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/live-schedule");
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  📅 Live Schedule
                </button>
              </div>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
