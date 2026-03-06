// Round 2 – Page 5: Opportunities Board – Campaigns Looking for Creators
// Purpose: Discover campaigns flagged by sellers as “Creator wanted”.
// Layout: Left filter column, right results grid (list on mobile).
// EVzone / MyLiveDealz styling with primary orange #f77f00.

import React, { useEffect, useMemo, useState } from "react";
// import { useTheme } from "../../contexts/ThemeContext";
import { PageHeader } from "../../components/PageHeader";
import { Tooltip } from "../../components/Tooltip";
import { PitchForm } from "../../components/PitchForm";
import { useNotification } from "../../contexts/NotificationContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { CircularProgress } from "@mui/material";
import { useLocation } from "react-router-dom";
import { backendApi, type OpportunityRecord } from "../../lib/api";


type Campaign = {
  id: number;
  seller: string;
  sellerInitials: string;
  rating: number;
  category: string;
  categories: string[];
  region: string;
  language: string;
  payBand: string;
  budgetMin: number;
  budgetMax: number;
  commission: number;
  matchScore: string;
  matchReason: string;
  deliverables: string[];
  liveWindow: string;
  timeline: string[];
  summary: string;

  tags: string[];
  supplierType: "Seller" | "Provider";
  collaborationStatus: "Not invited" | "Invited" | "Collaborating";
  opportunityStatus: "Open" | "Closed";
};

const parseBudgetRange = (payBand?: string | null) => {
  const matches = String(payBand || "").match(/\d+(?:,\d+)?/g);
  if (!matches?.length) {
    return { min: 0, max: 0 };
  }
  const values = matches.map((item) => Number(item.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
  if (!values.length) {
    return { min: 0, max: 0 };
  }
  if (values.length === 1) {
    return { min: values[0], max: values[0] };
  }
  return { min: Math.min(values[0], values[1]), max: Math.max(values[0], values[1]) };
};

const initialsFromName = (name: string) =>
  name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "SP";

const mapOpportunityToCampaign = (entry: OpportunityRecord, index: number): Campaign => {
  const sellerName = entry.seller?.name || "Supplier";
  const sellerCategory = entry.seller?.category || "General";
  const budget = parseBudgetRange(entry.payBand);
  const commissionMatch = String(entry.payBand || "").match(/(\d+)\s*%/);
  const commission = commissionMatch ? Number(commissionMatch[1]) : 0;

  return {
    id: index + 1,
    seller: sellerName,
    sellerInitials: initialsFromName(sellerName),
    rating: Number(entry.seller?.rating || 0),
    category: sellerCategory,
    categories: [sellerCategory],
    region: entry.seller?.region || "Global",
    language: "English",
    payBand: entry.payBand || "$0",
    budgetMin: budget.min,
    budgetMax: budget.max,
    commission,
    matchScore: entry.status === "OPEN" ? "High" : "Medium",
    matchReason: entry.description || "Matched by category and audience fit.",
    deliverables: ["Live", "Posts"],
    liveWindow: "Flexible",
    timeline: ["Briefing", "Live session", "Post-campaign recap"],
    summary: entry.description || entry.title || "Creator collaboration opportunity",
    tags: [sellerCategory, String(entry.status || "OPEN")],
    supplierType: String(entry.seller?.type || "Seller").toLowerCase().includes("provider") ? "Provider" : "Seller",
    collaborationStatus: "Collaborating",
    opportunityStatus: entry.status === "CLOSED" ? "Closed" : "Open"
  };
};

type OpportunitiesBoardPageProps = {
  onChangePage?: (page: string) => void;
};

type OpportunitiesLocationState = {
  supplierName?: string;
  onlyCurrent?: boolean;
  source?: string;
};

function OpportunitiesBoardPage({ onChangePage: _onChangePage }: OpportunitiesBoardPageProps) {
  const { showSuccess, showNotification, showError } = useNotification();
  const { run, isPending } = useAsyncAction();
  const location = useLocation();
  const locationState = (location.state ?? {}) as OpportunitiesLocationState;
  const scopedSupplierName =
    typeof locationState.supplierName === "string" ? locationState.supplierName : "";
  const currentOnly = locationState.onlyCurrent !== false;
  // const { theme } = useTheme();
  const [filters, setFilters] = useState({
    category: "All",
    minBudget: "",
    maxBudget: "",
    commission: "Any", // Any | 0-5 | 5-10 | 10+
    region: "All",
    language: "Any",
    liveDate: "Any", // Any | This week | This month
    minRating: "Any" // Any | 4 | 4.5
  });

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [pitchMode, setPitchMode] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [savedCampaignIds, setSavedCampaignIds] = useState<number[]>([]);
  const [batchSelection, setBatchSelection] = useState<number[]>([]);
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [followedSellers, setFollowedSellers] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sample campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: 1,
      seller: "GlowUp Hub",
      sellerInitials: "GH",
      rating: 4.7,
      category: "Beauty & Skincare",
      categories: ["Beauty", "Skincare"],
      region: "Africa",
      language: "English",
      payBand: "$200–$400 + 5%",
      budgetMin: 200,
      budgetMax: 400,
      commission: 5,
      matchScore: "High",
      matchReason: "Strong performance in Beauty campaigns (3.1× conv.)",
      deliverables: ["Live", "VOD", "Posts"],
      liveWindow: "This Friday · 20:00–21:30",
      timeline: ["Brief call", "Asset handoff", "Live", "Post clips"],
      summary: "Launch live for new GlowUp serum line with flash dealz and limited bundlez.",
      tags: ["Flash dealz", "New launch", "High volume"],
      supplierType: "Seller",
      collaborationStatus: "Collaborating",
      opportunityStatus: "Open"
    },
    {
      id: 2,
      seller: "GadgetMart Africa",
      sellerInitials: "GA",
      rating: 4.5,
      category: "Tech & Gadgets",
      categories: ["Tech", "Gadgets"],
      region: "Africa / Asia",
      language: "English",
      payBand: "$600–$900 + 3%",
      budgetMin: 600,
      budgetMax: 900,
      commission: 3,
      matchScore: "Medium",
      matchReason: "Your Tech Friday lives perform above platform average.",
      deliverables: ["Live", "Posts"],
      liveWindow: "Next week · 2-part Tech Friday series",
      timeline: ["Script prep", "Series 1", "Series 2"],
      summary: "Two-part Tech Friday series focusing on EV-friendly gadgets and accessories.",
      tags: ["Series", "EV gadgets", "Q&A heavy"],
      supplierType: "Seller",
      collaborationStatus: "Not invited",
      opportunityStatus: "Open"
    },
    {
      id: 3,
      seller: "Grace Living Store",
      sellerInitials: "GL",
      rating: 4.9,
      category: "Faith-compatible wellness",
      categories: ["Faith", "Wellness"],
      region: "Africa",
      language: "English",
      payBand: "$150–$250 + 8%",
      budgetMin: 150,
      budgetMax: 250,
      commission: 8,
      matchScore: "High",
      matchReason: "Great fit with faith-compatible guidelines and high retention.",
      deliverables: ["Live", "VOD"],
      liveWindow: "Sunday mornings · Monthly slot",
      timeline: ["Morning live", "Replay edits"],
      summary: "Monthly Faith & Wellness morning live around soft-sell wellness products.",
      tags: ["Faith-compatible", "Low returns", "Community"],
      supplierType: "Provider",
      collaborationStatus: "Invited",
      opportunityStatus: "Open"
    },
    {
      id: 4,
      seller: "EV Gadget World",
      sellerInitials: "EG",
      rating: 4.2,
      category: "EV & Mobility",
      categories: ["EV", "Mobility", "Tech"],
      region: "Global",
      language: "English",
      payBand: "$800–$1,200 + 10%",
      budgetMin: 800,
      budgetMax: 1200,
      commission: 10,
      matchScore: "Low",
      matchReason: "Category fit but fewer past campaigns in this sub-niche.",
      deliverables: ["Live", "Posts", "VOD"],
      liveWindow: "This month · Flexible slot",
      timeline: ["Concept", "Live", "Follow-up clips"],
      summary: "EV accessories showcase live with follow-up evergreen content.",
      tags: ["EV", "Accessories", "Evergreen"],
      supplierType: "Seller",
      collaborationStatus: "Not invited",
      opportunityStatus: "Open"
    },
    {
      id: 5,
      seller: "GlowUp Hub",
      sellerInitials: "GH",
      rating: 4.7,
      category: "Beauty & Skincare",
      categories: ["Beauty", "Skincare"],
      region: "Africa",
      language: "English",
      payBand: "$200–$350 + 4%",
      budgetMin: 200,
      budgetMax: 350,
      commission: 4,
      matchScore: "High",
      matchReason: "Historical campaign kept for records only.",
      deliverables: ["Live", "Posts"],
      liveWindow: "Ended",
      timeline: ["Completed"],
      summary: "Archived seasonal beauty campaign from a past cycle.",
      tags: ["Archived", "Past campaign"],
      supplierType: "Seller",
      collaborationStatus: "Collaborating",
      opportunityStatus: "Closed"
    }
  ]);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOpportunities = async () => {
      setBackendError(null);
      try {
        const rows = await backendApi.getOpportunities();
        if (cancelled) return;
        const mapped = (Array.isArray(rows) ? rows : []).map(mapOpportunityToCampaign);
        if (mapped.length > 0) {
          setCampaigns(mapped);
        }
      } catch (error) {
        if (!cancelled) {
          setBackendError(error instanceof Error ? error.message : "Failed to load opportunities from backend");
        }
      }
    };

    void loadOpportunities();
    return () => {
      cancelled = true;
    };
  }, []);

  const scopedCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // "View New Opportunities" must only return currently available opportunities.
      if (currentOnly && c.opportunityStatus !== "Open") return false;

      // Supplier-scoped view from My Suppliers must include past collaborators too.
      if (scopedSupplierName && c.seller !== scopedSupplierName) return false;

      // Default board behavior: show opportunities from active collaborations.
      if (!scopedSupplierName && c.collaborationStatus !== "Collaborating") return false;
      return true;
    });
  }, [campaigns, currentOnly, scopedSupplierName]);

  const filteredCampaigns = useMemo(() => {
    return scopedCampaigns.filter((c) => {
      if (filters.category !== "All" && c.category !== filters.category) return false;
      if (filters.region !== "All" && c.region !== filters.region) return false;
      if (filters.language !== "Any" && c.language !== filters.language) return false;

      if (filters.minBudget) {
        const min = Number(filters.minBudget) || 0;
        if (c.budgetMax < min) return false;
      }
      if (filters.maxBudget) {
        const max = Number(filters.maxBudget) || 0;
        if (c.budgetMin > max) return false;
      }

      if (filters.commission !== "Any") {
        if (filters.commission === "0-5" && c.commission > 5) return false;
        if (
          filters.commission === "5-10" &&
          (c.commission <= 5 || c.commission > 10)
        )
          return false;
        if (filters.commission === "10+" && c.commission <= 10) return false;
      }

      if (filters.minRating !== "Any") {
        const min = Number(filters.minRating);
        if (c.rating < min) return false;
      }

      // For now, liveDate filter is informational only; in a real app we'd use campaign dates
      return true;
    });
  }, [scopedCampaigns, filters]);

  const toggleSaved = (id: number): void => {
    setSavedCampaignIds((prev) => {
      const isSaved = prev.includes(id);
      if (isSaved) {
        showNotification("Removed from saved opportunities");
        return prev.filter((x) => x !== id);
      } else {
        showSuccess("Opportunity saved!");
        return [...prev, id];
      }
    });
  };

  const toggleBatchSelection = (id: number): void => {
    setBatchSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleFollowSeller = (seller: string): void => {
    setFollowedSellers((prev) => {
      const isFollowing = prev.includes(seller);
      if (isFollowing) {
        showNotification(`Unfollowed ${seller}`);
        return prev.filter((s) => s !== seller);
      } else {
        showSuccess(`Now following ${seller}`);
        return [...prev, seller];
      }
    });
  };

  const openDetails = (campaign: Campaign, pitch = false): void => {
    setSelectedCampaign(campaign);
    setPitchMode(pitch);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedCampaign(null);
    setPitchMode(false);
    setAiSuggestion("");
  };

  const handleAskAi = () => {
    if (!selectedCampaign) return;
    setAiSuggestion(
      `Hi ${selectedCampaign.seller}, I’d love to host this campaign. Based on my past performance in ${selectedCampaign.category}, we can position your products with a clear story, timed flash offers, and Q&A segments to drive both trust and conversions.`
    );
  };

  const handleInviteToCollaborate = (id: number) => {
    run(async () => {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1000));
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, collaborationStatus: "Invited" } : c))
      );
    }, { successMessage: "Invitation sent successfully!" });
  };

  const batchCampaigns = scopedCampaigns.filter((c) => batchSelection.includes(c.id));

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      <PageHeader
        pageTitle="Opportunities Board"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Creator wanted campaigns</span>
          </span>
        }
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Left filter column */}
        <aside className="hidden xl:block w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 text-sm transition-colors">
          <h2 className="text-xs font-semibold dark:font-bold mb-2">Filters</h2>
          <FilterSection label="Product/Service line">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="All">All categories</option>
              <option value="Beauty & Skincare">Beauty & Skincare</option>
              <option value="Tech & Gadgets">Tech & Gadgets</option>
              <option value="Faith-compatible wellness">Faith-compatible wellness</option>
              <option value="EV & Mobility">EV & Mobility</option>
            </select>
          </FilterSection>

          <FilterSection label="Budget range (USD)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                className="w-1/2 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                value={filters.minBudget}
                onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
              />
              <input
                type="number"
                placeholder="Max"
                className="w-1/2 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                value={filters.maxBudget}
                onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
              />
            </div>
          </FilterSection>

          <FilterSection label="Commission %">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
              value={filters.commission}
              onChange={(e) => setFilters({ ...filters, commission: e.target.value })}
            >
              <option value="Any">Any</option>
              <option value="0-5">0–5%</option>
              <option value="5-10">5–10%</option>
              <option value="10+">10%+</option>
            </select>
          </FilterSection>

          <FilterSection label="Region">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
            >
              <option value="All">All regions</option>
              <option value="Africa">Africa</option>
              <option value="Africa / Asia">Africa / Asia</option>
              <option value="Global">Global</option>
            </select>
          </FilterSection>

          <FilterSection label="Language">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            >
              <option value="Any">Any</option>
              <option value="English">English</option>
            </select>
          </FilterSection>

          <FilterSection label="Live date">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
              value={filters.liveDate}
              onChange={(e) => setFilters({ ...filters, liveDate: e.target.value })}
            >
              <option value="Any">Any time</option>
              <option value="This week">This week</option>
              <option value="This month">This month</option>
            </select>
          </FilterSection>

          <FilterSection label="Supplier rating">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
            >
              <option value="Any">Any</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
            </select>
          </FilterSection>

          <button
            className="mt-3 w-full text-sm py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
            onClick={() =>
              setFilters({
                category: "All",
                minBudget: "",
                maxBudget: "",
                commission: "Any",
                region: "All",
                language: "Any",
                liveDate: "Any",
                minRating: "Any"
              })
            }
          >
            Reset filters
          </button>
        </aside>

        {/* Mobile filter modal */}
        {showMobileFilters && (
          <div
            className="fixed inset-0 z-50 xl:hidden bg-black/40 pt-16"
            onClick={() => setShowMobileFilters(false)}
          >
            <aside
              className="w-80 max-w-[90%] h-[calc(100%-4rem)] bg-white dark:bg-slate-900 overflow-y-auto p-4 text-sm transition-colors shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold dark:font-bold">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-2xl text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-50"
                >
                  ×
                </button>
              </div>

              <FilterSection label="Product/Service line">
                <select
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="All">All categories</option>
                  <option value="Beauty & Skincare">Beauty & Skincare</option>
                  <option value="Tech & Gadgets">Tech & Gadgets</option>
                  <option value="Faith-compatible wellness">Faith-compatible wellness</option>
                  <option value="EV & Mobility">EV & Mobility</option>
                </select>
              </FilterSection>

              <FilterSection label="Budget range (USD)">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-1/2 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                    value={filters.minBudget}
                    onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-1/2 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                    value={filters.maxBudget}
                    onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
                  />
                </div>
              </FilterSection>

              <FilterSection label="Commission %">
                <select
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
                  value={filters.commission}
                  onChange={(e) => setFilters({ ...filters, commission: e.target.value })}
                >
                  <option value="Any">Any</option>
                  <option value="0-5">0–5%</option>
                  <option value="5-10">5–10%</option>
                  <option value="10+">10%+</option>
                </select>
              </FilterSection>

              <FilterSection label="Region">
                <select
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
                  value={filters.region}
                  onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                >
                  <option value="All">All regions</option>
                  <option value="Africa">Africa</option>
                  <option value="Africa / Asia">Africa / Asia</option>
                  <option value="Global">Global</option>
                </select>
              </FilterSection>

              <FilterSection label="Language">
                <select
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                >
                  <option value="Any">Any</option>
                  <option value="English">English</option>
                </select>
              </FilterSection>

              <FilterSection label="Live date">
                <select
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
                  value={filters.liveDate}
                  onChange={(e) => setFilters({ ...filters, liveDate: e.target.value })}
                >
                  <option value="Any">Any time</option>
                  <option value="This week">This week</option>
                  <option value="This month">This month</option>
                </select>
              </FilterSection>

              <FilterSection label="Supplier rating">
                <select
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-sm transition-colors"
                  value={filters.minRating}
                  onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                >
                  <option value="Any">Any</option>
                  <option value="4">4.0+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </FilterSection>

              <button
                className="mt-3 w-full text-sm py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                onClick={() => {
                  setFilters({
                    category: "All",
                    minBudget: "",
                    maxBudget: "",
                    commission: "Any",
                    region: "All",
                    language: "Any",
                    liveDate: "Any",
                    minRating: "Any"
                  });
                  setShowMobileFilters(false);
                }}
              >
                Reset filters
              </button>
            </aside>
          </div>
        )}

        {/* Right content – campaigns list/grid */}
        <section className="flex-1 overflow-y-auto overflow-x-hidden w-full p-3 sm:p-4 md:p-6 lg:p-8 pt-8">
          <div className="w-full max-w-full flex flex-col gap-3">
            {backendError && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Backend request failed: {backendError}. Showing fallback opportunities.
              </div>
            )}
            {scopedSupplierName && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                Showing currently available opportunities from <span className="font-bold">{scopedSupplierName}</span>.
              </div>
            )}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {/* Title removed: now prominently in PageHeader */}
                  {/* Mobile filter button */}
                  <button
                    className="xl:hidden px-4 py-2 rounded-full bg-[#f77f00] hover:bg-[#e26f00] text-white text-sm font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    onClick={() => setShowMobileFilters(true)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>Filters</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end text-xs text-slate-500 dark:text-slate-300">
                <span>
                  Showing{" "}
                  <span className="font-semibold dark:font-bold">{filteredCampaigns.length}</span> of{" "}
                  {scopedCampaigns.length}
                </span>
                <button
                  className={`mt-1 px-4 py-1.5 rounded-full text-sm font-bold transition-all shadow-sm ${batchSelection.length > 0
                    ? "bg-[#f77f00] text-white hover:bg-[#e26f00] hover:shadow-md hover:-translate-y-0.5"
                    : "border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                  disabled={batchSelection.length === 0}
                  onClick={() => setShowBatchPanel(true)}
                >
                  Batch apply ({batchSelection.length})
                </button>
              </div>
            </div>

            {/* Mobile filters note */}
            <div className="xl:hidden mb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-200 font-medium">
                  Use desktop view to access full filters.
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-xs transition-colors">
                  {filteredCampaigns.length} matches
                </span>
              </div>
            </div>

            {/* Campaign table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              {filteredCampaigns.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-300 p-6">
                  No opportunities match these filters yet. Try broadening your search.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[1200px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-3 text-xs font-semibold dark:font-bold text-slate-600 dark:text-slate-300" style={{ width: '300px' }}>
                          Promo
                        </th>
                        <th className="text-left py-3 px-3 text-xs font-semibold dark:font-bold text-slate-600 dark:text-slate-300" style={{ width: '180px' }}>
                          Supplier & Line
                        </th>
                        <th className="text-left py-3 px-3 text-xs font-semibold dark:font-bold text-slate-600 dark:text-slate-300" style={{ width: '120px' }}>
                          Status
                        </th>
                        <th className="text-left py-3 px-3 text-xs font-semibold dark:font-bold text-slate-600 dark:text-slate-300" style={{ width: '140px' }}>
                          Comp
                        </th>
                        <th className="text-left py-3 px-3 text-xs font-semibold dark:font-bold text-slate-600 dark:text-slate-300" style={{ width: '280px' }}>
                          Earnings & performance
                        </th>
                        <th className="text-right py-3 px-3 text-xs font-semibold dark:font-bold text-slate-600 dark:text-slate-300" style={{ width: '180px' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCampaigns.map((c) => (
                        <CampaignRow
                          key={c.id}
                          campaign={c}
                          saved={savedCampaignIds.includes(c.id)}
                          selected={batchSelection.includes(c.id)}
                          onToggleSave={() => toggleSaved(c.id)}
                          onToggleSelect={() => toggleBatchSelection(c.id)}
                          onViewDetails={() => openDetails(c, false)}
                          onSendPitch={() => openDetails(c, true)}
                          followed={followedSellers.includes(c.seller)}
                          onToggleFollow={() => toggleFollowSeller(c.seller)}
                          onInvite={() => handleInviteToCollaborate(c.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Detail + pitch slide-over */}
      {showDetails && selectedCampaign && (
        <CampaignDetailSlideOver
          campaign={selectedCampaign}
          pitchMode={pitchMode}
          aiSuggestion={aiSuggestion}
          onAskAi={handleAskAi}
          onClose={closeDetails}
        />
      )}

      {/* Batch apply panel */}
      {showBatchPanel && batchCampaigns.length > 0 && (
        <BatchApplyPanel
          campaigns={batchCampaigns}
          onClose={() => setShowBatchPanel(false)}
        />
      )}
    </div>
  );
}

export { OpportunitiesBoardPage };

/* Filter section helper */
type FilterSectionProps = {
  label: string;
  children: React.ReactNode;
};

function FilterSection({ label, children }: FilterSectionProps) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 mb-1">{label}</div>
      {children}
    </div>
  );
}

/* Campaign row */
type CampaignRowProps = {
  campaign: Campaign;
  saved: boolean;
  selected: boolean;
  followed: boolean;
  onToggleSave: () => void;
  onToggleSelect: () => void;
  onToggleFollow: () => void;
  onViewDetails: () => void;
  onSendPitch: () => void;
  onInvite: () => void;
};

function CampaignRow({
  campaign,
  saved,
  selected,
  followed,
  onToggleSave,
  onToggleSelect,
  onToggleFollow,
  onViewDetails,
  onSendPitch,
  onInvite
}: CampaignRowProps) {
  const matchColor =
    campaign.matchScore === "High"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
      : campaign.matchScore === "Medium"
        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700"
        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* Promo column */}
      <td className="py-3 px-3 align-top" style={{ width: '300px' }}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-slate-300 dark:border-slate-600 flex-shrink-0"
              checked={selected}
              onChange={onToggleSelect}
            />
            <Tooltip content={`${campaign.seller} - ${campaign.category}`}>
              <h3 className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-100 cursor-help line-clamp-1">
                {campaign.seller} - {campaign.category}
              </h3>
            </Tooltip>
          </div>
          <Tooltip content={campaign.summary}>
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 cursor-help">
              {campaign.summary}
            </p>
          </Tooltip>
          <div className="flex flex-wrap gap-1 mt-1">
            {campaign.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </td>

      {/* supplier & Line column */}
      <td className="py-3 px-3 align-top" style={{ width: '180px' }}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold dark:font-bold flex-shrink-0">
              {campaign.sellerInitials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {campaign.seller}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="text-amber-500">★ {campaign.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
            {campaign.category}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {campaign.supplierType}
            </span>
            <button
              className={`px-2 py-0.5 rounded-full text-xs border w-fit ${followed
                ? "bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-700 text-white"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              onClick={onToggleFollow}
            >
              {followed ? "Following" : "Follow"}
            </button>
          </div>
        </div >
      </td >

      {/* Status column */}
      < td className="py-3 px-3 align-top" style={{ width: '120px' }
      }>
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs w-fit ${matchColor}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span>{campaign.matchScore === "High" ? "Active" : campaign.matchScore === "Medium" ? "Upcoming" : "Ended"}</span>
          </span>
        </div>
      </td >

      {/* Comp column */}
      < td className="py-3 px-3 align-top" style={{ width: '140px' }}>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <div className="font-medium">{campaign.commission}% commission</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {campaign.deliverables.join(", ")}
            </div>
          </div>
        </div>
      </td >

      {/* Earnings & performance column */}
      < td className="py-3 px-3 align-top" style={{ width: '280px' }}>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-100">
            {campaign.payBand}
          </div>
          <Tooltip content={campaign.matchReason}>
            <div className="text-xs text-slate-600 dark:text-slate-300 cursor-help line-clamp-2">
              {campaign.matchReason}
            </div>
          </Tooltip>
          <div className="flex flex-wrap gap-1 mt-1">
            {campaign.deliverables.includes("Live") && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs">
                🔴 Live
              </span>
            )}
            {campaign.deliverables.includes("VOD") && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs">
                🎬 VOD
              </span>
            )}
            {campaign.deliverables.includes("Posts") && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                📝 Posts
              </span>
            )}
          </div>
        </div>
      </td >

      {/* Actions column */}
      < td className="py-3 px-3 align-top" style={{ width: '180px' }}>
        <div className="flex flex-col items-end gap-1.5">
          <button
            className="text-lg"
            onClick={onToggleSave}
            aria-label="Save campaign"
          >
            {saved ? "★" : "☆"}
          </button>
          <div className="flex flex-col gap-1 w-full">
            {campaign.collaborationStatus === "Collaborating" ? (
              <div className="flex items-center gap-1.5 self-end px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Collaborating
              </div>
            ) : campaign.collaborationStatus === "Invited" ? (
              <button
                className="w-full px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed mb-1"
                disabled
              >
                Invite Sent
              </button>
            ) : (
              <button
                className="w-full px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mb-1 shadow-sm"
                onClick={onInvite}
              >
                Invite to Collaborate
              </button>
            )}

            <div className="flex gap-1 w-full">
              <button
                className="flex-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium transition-colors"
                onClick={onViewDetails}
              >
                View
              </button>

              <Tooltip
                content={campaign.collaborationStatus !== "Collaborating" ? "Pitching unlocks after collaboration is accepted" : "Pitch your idea"}
              >
                <div className="flex-1">
                  <button
                    className={`w-full px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${campaign.collaborationStatus === "Collaborating"
                      ? "bg-[#f77f00] text-white hover:bg-[#e26f00] hover:-translate-y-0.5"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-60"
                      }`}
                    onClick={campaign.collaborationStatus === "Collaborating" ? onSendPitch : undefined}
                    disabled={campaign.collaborationStatus !== "Collaborating"}
                  >
                    Pitch
                  </button>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </td >
    </tr >
  );
}

type DeliverableChipProps = {
  icon: string;
  label: string;
};

function DeliverableChip({ icon, label }: DeliverableChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-100 font-medium transition-colors">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

/* Detail + pitch slide-over */
type CampaignDetailSlideOverProps = {
  campaign: Campaign;
  pitchMode: boolean;
  aiSuggestion: string;
  onAskAi: () => void;
  onClose: () => void;
};

function CampaignDetailSlideOver({
  campaign,
  pitchMode,
  aiSuggestion,
  onAskAi,
  onClose
}: CampaignDetailSlideOverProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-transform duration-300 animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold dark:font-bold transition-colors">
              {campaign.sellerInitials}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold dark:font-bold">{campaign.seller}</span>
                <span className="text-xs text-amber-500">
                  ★ {campaign.rating.toFixed(1)}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300">
                {campaign.region} · {campaign.language}
              </div>
            </div>
          </div>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Brief */}
          <section>
            <h3 className="text-xs font-semibold dark:font-bold mb-1">Campaign brief</h3>
            <p className="text-sm text-slate-600 dark:text-slate-200 mb-1">{campaign.summary}</p>
            <div className="flex flex-wrap gap-1 mb-1">
              {campaign.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-100 font-medium transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 mb-1">
              Live window: <span className="font-medium">{campaign.liveWindow}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Pay band: <span className="font-medium">{campaign.payBand}</span> · Commission:{" "}
              <span className="font-medium">{campaign.commission}%</span>
            </p>
          </section>

          {/* Deliverables */}
          <section>
            <h3 className="text-xs font-semibold mb-1">Expected deliverables</h3>
            <div className="flex flex-wrap gap-1">
              {campaign.deliverables.includes("Live") && (
                <DeliverableChip icon="🔴" label="1–2 Live sessions" />
              )}
              {campaign.deliverables.includes("VOD") && (
                <DeliverableChip icon="🎬" label="Replay / VOD" />
              )}
              {campaign.deliverables.includes("Posts") && (
                <DeliverableChip icon="📝" label="Social posts" />
              )}
            </div>
          </section>

          {/* Pitch form */}
          <section>
            <h3 className="text-xs font-semibold mb-1">Send pitch</h3>
            <PitchForm
              recipientName={campaign.seller}
              defaultCategory={campaign.category}
              pitchMode={pitchMode}
              aiSuggestion={aiSuggestion}
              onAskAi={onAskAi}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

/* Batch apply panel */
function BatchApplyPanel({ campaigns, onClose }: { campaigns: Campaign[]; onClose: () => void }) {
  const { run, isPending: isSubmitting } = useAsyncAction();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleBatchSubmit = () => {
    run(async () => {
      await new Promise(r => setTimeout(r, 1500));
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }, { successMessage: "All pitches sent!" });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-transform duration-300 animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <span className="font-bold text-sm uppercase tracking-widest text-slate-400">Batch apply</span>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
          {isSuccess && (
            <div className="absolute inset-0 z-10 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <span className="text-3xl">📨</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Batch Sent!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Successfully sent pitches to {campaigns.length} campaigns.
              </p>
            </div>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-200 font-medium">
            You’re about to send pitches to{" "}
            <span className="font-semibold">{campaigns.length}</span> campaigns using your
            standard template. You can personalise messages later per campaign.
          </p>
          <ul className="space-y-1">
            {campaigns.map((c: Campaign) => (
              <li key={c.id} className="border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.seller}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-300">{c.payBand}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-300">{c.category}</div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-1 mt-2">
            <label className="text-xs font-medium">Standard pitch message</label>
            <textarea
              rows={4}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-slate-400 transition-colors"
              defaultValue="Hi, I’d love to collaborate on this campaign. I’ll bring an engaged audience, strong storytelling, and clear CTAs around your current promo structure."
            />
          </div>

          <button
            className={`mt-2 w-full py-2 rounded-full text-white text-sm font-semibold transition-all ${isSubmitting
              ? "bg-slate-300 dark:bg-slate-700 cursor-wait"
              : "bg-[#f77f00] hover:bg-[#e26f00]"
              }`}
            onClick={handleBatchSubmit}
            disabled={isSubmitting || isSuccess}
          >
            {isSubmitting ? "Queueing pitches..." : `Queue ${campaigns.length} tailored pitches`}
          </button>
        </div>
      </div>
    </div>
  );
}
