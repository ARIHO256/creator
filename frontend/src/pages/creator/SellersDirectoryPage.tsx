// Round 2 – Page 6: Suppliers Directory & Discovery Pool (Creator View)
// Purpose: Give creators a curated directory of suppliers to approach.
// EVzone / MyLiveDealz styling with primary orange #f77f00.

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useScrollLock } from "../../hooks/useScrollLock";
// import { useTheme } from "../../contexts/ThemeContext";
import { PageHeader } from "../../components/PageHeader";
import { useCreator } from "../../contexts/CreatorContext";
import type { PageId } from "../../layouts/CreatorShellLayout";
import { backendApi, type SellerRecord } from "../../lib/api";

type Trend = "up" | "down" | "flat";

type Seller = {
  id: number;
  name: string;
  initials: string;
  tagline: string;
  categories: string[];
  followers: number;
  livesCompleted: number;
  avgOrderValue: number;
  badge: string;
  collabStatus: string;
  rating: number;
  region: string;
  similarTo: string[];
  relationship: string;
  fitScore: number;
  fitReason: string;
  followersTrend: Trend;
  livesTrend: Trend;
  orderTrend: Trend;
  trustBadges: string[];

  lastActive: string;
  supplierType: "Seller" | "Provider";
  isActivelyCollaborating: boolean;
  hasActiveCampaigns: boolean;
  backendId?: string;
};

const mapSellerRecord = (entry: SellerRecord, index: number): Seller => {
  const category = entry.category || "General";
  const name = entry.name || `Seller ${index + 1}`;
  const initials = name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return {
    id: index + 1,
    backendId: entry.id,
    name,
    initials: initials || "SP",
    tagline: `${category} supplier on MyLiveDealz.`,
    categories: [category],
    followers: 10000 + index * 1500,
    livesCompleted: 5 + index * 2,
    avgOrderValue: 20 + index * 4,
    badge: entry.isVerified ? "Top Brand" : "New Seller",
    collabStatus: "Open to collabs",
    rating: Number(entry.rating || 0),
    region: entry.region || "Global",
    similarTo: [],
    relationship: "New",
    fitScore: Math.max(60, Math.min(98, Math.round((Number(entry.rating || 0) / 5) * 100))),
    fitReason: `Strong ${category} potential based on current profile fit.`,
    followersTrend: "up",
    livesTrend: "up",
    orderTrend: "flat",
    trustBadges: entry.isVerified ? ["Verified"] : [],
    lastActive: "Active recently",
    supplierType: String(entry.type || "Seller").toLowerCase().includes("provider") ? "Provider" : "Seller",
    isActivelyCollaborating: false,
    hasActiveCampaigns: true
  };
};


function SellersDirectoryPage({ onChangePage }: { onChangePage?: (page: PageId) => void }) {
  // const { theme } = useTheme();
  const [search, setSearch] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [minFollowers, setMinFollowers] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("Any");


  const { followedSellerIds: followedSellers, toggleFollowSeller } = useCreator();

  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [showInvite, setShowInvite] = useState<boolean>(false);

  const [viewTab, setViewTab] = useState("all"); // all | followed | new
  const [sortBy, setSortBy] = useState("relevance"); // relevance | followers | rating | lives
  const [aiHint, setAiHint] = useState("");
  const [presetFilter, setPresetFilter] = useState("none"); // none | live-first | faith | high-ticket
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSearchChange = (val: string) => {
    setSearch(val);
  };

  const handleFilterChange = (setter: (v: string) => void, val: string) => {
    setIsTransitioning(true);
    setter(val);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const fallbackSellers = useMemo<Seller[]>(
    () => [
      {
        id: 1,
        name: "GlowUp Hub",
        initials: "GH",
        tagline: "Beauty & skincare for glowing routines.",
        categories: ["Beauty", "Skincare"],
        followers: 42000,
        livesCompleted: 38,
        avgOrderValue: 22,
        badge: "Top Brand",
        collabStatus: "Open to collabs",
        rating: 4.8,
        region: "Africa",
        similarTo: ["Grace Living Store"],
        relationship: "2 past campaigns",
        fitScore: 93,
        fitReason: "You convert 3.1× platform avg in Beauty.",
        followersTrend: "up" as Trend,
        livesTrend: "up" as Trend,
        orderTrend: "flat" as Trend,
        trustBadges: ["Verified", "Fast payouts"],
        lastActive: "Active this week",
        supplierType: "Seller",
        isActivelyCollaborating: true,
        hasActiveCampaigns: true
      },
      {
        id: 2,
        name: "GadgetMart Africa",
        initials: "GA",
        tagline: "Everyday gadgets with an EV twist.",
        categories: ["Tech", "Gadgets"],
        followers: 35500,
        livesCompleted: 24,
        avgOrderValue: 45,
        badge: "Top Brand",
        collabStatus: "Open to collabs",
        rating: 4.5,
        region: "Africa / Asia",
        similarTo: ["EV Gadget World"],
        relationship: "1 past Tech Friday series",
        fitScore: 86,
        fitReason: "Strong Tech Friday performance with their niche.",
        followersTrend: "up" as Trend,
        livesTrend: "up" as Trend,
        orderTrend: "up" as Trend,
        trustBadges: ["Verified"],
        lastActive: "Live 2 days ago",
        supplierType: "Seller",
        isActivelyCollaborating: true,
        hasActiveCampaigns: false
      },
      {
        id: 3,
        name: "Grace Living Store",
        initials: "GL",
        tagline: "Faith-compatible wellness & lifestyle.",
        categories: ["Faith", "Wellness"],
        followers: 18800,
        livesCompleted: 17,
        avgOrderValue: 28,
        badge: "Faith friendly",
        collabStatus: "Invite only",
        rating: 4.9,
        region: "Africa",
        similarTo: ["GlowUp Hub"],
        relationship: "New (no campaigns yet)",
        fitScore: 88,
        fitReason: "High retention in Faith-compatible sessions.",
        followersTrend: "up" as Trend,
        livesTrend: "flat" as Trend,
        orderTrend: "flat" as Trend,
        trustBadges: ["Low return rate"],
        lastActive: "Active this week",
        supplierType: "Provider",
        isActivelyCollaborating: false,
        hasActiveCampaigns: true
      },
      {
        id: 4,
        name: "EV Gadget World",
        initials: "EG",
        tagline: "Accessories & gadgets for EV owners.",
        categories: ["EV", "Mobility", "Tech"],
        followers: 15200,
        livesCompleted: 9,
        avgOrderValue: 60,
        badge: "New Seller",
        collabStatus: "Open to collabs",
        rating: 4.2,
        region: "Global",
        similarTo: ["GadgetMart Africa"],
        relationship: "New EV-focused potential",
        fitScore: 72,
        fitReason: "Category match; limited collab history in this sub-niche.",
        followersTrend: "up" as Trend,
        livesTrend: "up" as Trend,
        orderTrend: "up" as Trend,
        trustBadges: ["Fast payouts"],
        lastActive: "Active this month",
        supplierType: "Seller",
        isActivelyCollaborating: false,
        hasActiveCampaigns: true
      },
      {
        id: 5,
        name: "ShopNow Foods",
        initials: "SF",
        tagline: "Groceries & pantry delivered same day.",
        categories: ["Food", "Groceries"],
        followers: 8600,
        livesCompleted: 5,
        avgOrderValue: 18,
        badge: "New Seller",
        collabStatus: "Not seeking",
        rating: 4.0,
        region: "Africa",
        similarTo: [],
        relationship: "New",
        fitScore: 60,
        fitReason: "Outside your top-performing categories.",
        followersTrend: "flat",
        livesTrend: "flat",
        orderTrend: "flat",
        trustBadges: [],
        lastActive: "Occasionally active",
        supplierType: "Seller",
        isActivelyCollaborating: false,
        hasActiveCampaigns: false
      }
    ],
    []
  );

  const [sellers, setSellers] = useState<Seller[]>(fallbackSellers);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSellers = async () => {
      setBackendError(null);
      try {
        const rows = await backendApi.getSellers();
        if (cancelled) return;
        const mapped = (Array.isArray(rows) ? rows : []).map(mapSellerRecord);
        if (mapped.length > 0) {
          setSellers(mapped);
        }
      } catch (error) {
        if (!cancelled) {
          setBackendError(error instanceof Error ? error.message : "Failed to load suppliers from backend");
          setSellers(fallbackSellers);
        }
      }
    };

    void loadSellers();
    return () => {
      cancelled = true;
    };
  }, [fallbackSellers]);


  const openInvite = (seller: Seller) => {
    setSelectedSeller(seller);
    setShowInvite(true);
  };

  const closeInvite = () => {
    setShowInvite(false);
    setSelectedSeller(null);
  };

  // Base filters: search, category, followers, rating
  const filteredSellers = useMemo(() => {
    return sellers.filter((s) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const inName = s.name.toLowerCase().includes(q);
        const inTagline = s.tagline.toLowerCase().includes(q);
        const inCategory = s.categories.some((c) =>
          c.toLowerCase().includes(q)
        );
        if (!inName && !inTagline && !inCategory) return false;
      }
      if (categoryFilter !== "All") {
        if (!s.categories.includes(categoryFilter)) return false;
      }
      if (minFollowers) {
        const min = Number(minFollowers) || 0;
        if (s.followers < min) return false;
      }
      if (minRating !== "Any") {
        const mr = Number(minRating);
        if (s.rating < mr) return false;
      }
      // Creators should only see opportunities from suppliers they can actually collab with.
      // Requirements: Hide opportunities from suppliers that are not open for collaboration or not linked to the creator.
      // Invite-only suppliers should not appear and request invite does not also apply here.
      if (s.collabStatus === "Invite only" || s.collabStatus === "Not seeking") return false;

      return true;
    });
  }, [sellers, search, categoryFilter, minFollowers, minRating]);

  // Preset filters (Live-first / Faith-friendly / High-ticket)
  const presetFilteredSellers = useMemo(() => {
    let result = filteredSellers;
    if (presetFilter === "live-first") {
      result = result.filter((s) => s.livesCompleted >= 10);
    } else if (presetFilter === "faith") {
      result = result.filter(
        (s) =>
          s.categories.includes("Faith") || s.badge === "Faith friendly"
      );
    } else if (presetFilter === "high-ticket") {
      result = result.filter((s) => s.avgOrderValue >= 50);
    }
    return result;
  }, [filteredSellers, presetFilter]);

  // Apply view tab (All / Followed / New)
  const tabFilteredSellers = useMemo(() => {
    let result = presetFilteredSellers;
    if (viewTab === "followed") {
      result = result.filter((s) => followedSellers.includes(s.id));
    } else if (viewTab === "new") {
      result = result.filter(
        (s) => s.badge === "New Seller" || s.relationship === "New"
      );
    }
    return result;
  }, [presetFilteredSellers, viewTab, followedSellers]);

  // Sorting logic
  const sortedSellers = useMemo(() => {
    const arr = [...tabFilteredSellers];
    arr.sort((a, b) => {
      if (sortBy === "followers") {
        return b.followers - a.followers;
      }
      if (sortBy === "rating") {
        return b.rating - a.rating;
      }
      if (sortBy === "lives") {
        return b.livesCompleted - a.livesCompleted;
      }
      // relevance – approximate by fitScore, then rating, then followers
      if (sortBy === "relevance") {
        if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.followers - a.followers;
      }
      return 0;
    });
    return arr;
  }, [tabFilteredSellers, sortBy]);

  const recommended = useMemo(() => sortedSellers.filter((s) => s.badge === "Top Brand"), [sortedSellers]);
  const similarBrands = useMemo(() => sortedSellers.filter((s) =>
    s.similarTo.includes("GlowUp Hub") || s.similarTo.includes("GadgetMart Africa")
  ), [sortedSellers]);

  const handleAiSuggest = () => {
    setIsAiDialogOpen(true);
  };

  const togglePreset = (preset: string) => {
    setPresetFilter((current) => (current === preset ? "none" : preset));
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader pageTitle="Supplier Directory" />

      <main className="flex-1 flex flex-col w-full p-3 sm:p-4 md:p-6 lg:p-8 pt-8 gap-8 overflow-y-auto overflow-x-hidden">
        <div className="w-full space-y-4">
          {backendError && (
            <div className="text-xs text-amber-600 dark:text-amber-400">
              Backend request failed: {backendError}. Showing fallback suppliers.
            </div>
          )}

          {/* Top Search Bar */}
          <div className="w-full max-w-full bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative w-full group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f77f00] transition-colors">🔍</span>
              <input
                className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-[#f77f00] dark:focus:border-[#f77f00] rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-bold"
                placeholder="Search by brand name, category or niche..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <button
              className="w-full md:w-auto px-8 py-3 rounded-2xl bg-[#f77f00] hover:bg-[#e26f00] text-white text-sm font-black shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
              onClick={handleAiSuggest}
            >
              Suggest brands
            </button>
          </div>

          {/* Top Horizontal Filters */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-end gap-6">
              {/* Category filter */}
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Category</label>
                <select
                  className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-[#f77f00] outline-none transition-all cursor-pointer appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f77f00'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                  value={categoryFilter}
                  onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
                >
                  <option value="All" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">All Categories</option>
                  <option value="Beauty" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Beauty</option>
                  <option value="Skincare" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Skincare</option>
                  <option value="Tech" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Tech</option>
                  <option value="Gadgets" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Gadgets</option>
                  <option value="Faith" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Faith</option>
                  <option value="Wellness" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Wellness</option>
                  <option value="EV" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">EV</option>
                  <option value="Mobility" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Mobility</option>
                  <option value="Food" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Food</option>
                  <option value="Groceries" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Groceries</option>
                </select>
              </div>

              {/* Followers Min filter */}
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Followers Min</label>
                <input
                  type="number"
                  className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-[#f77f00] outline-none transition-all"
                  placeholder="e.g. 5000"
                  value={minFollowers}
                  onChange={(e) => handleFilterChange(setMinFollowers, e.target.value)}
                />
              </div>

              {/* Rating filter */}
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Rating</label>
                <select
                  className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-[#f77f00] outline-none transition-all cursor-pointer appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f77f00'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                  value={minRating}
                  onChange={(e) => handleFilterChange(setMinRating, e.target.value)}
                >
                  <option value="Any" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Any Rating</option>
                  <option value="4" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">★ 4.0+</option>
                  <option value="4.5" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">★ 4.5+</option>
                </select>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[300px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  <PresetChip
                    label="Live-first"
                    active={presetFilter === "live-first"}
                    onClick={() => togglePreset("live-first")}
                  />
                  <PresetChip
                    label="Faith-friendly"
                    active={presetFilter === "faith"}
                    onClick={() => togglePreset("faith")}
                  />
                  <PresetChip
                    label="High-ticket"
                    active={presetFilter === "high-ticket"}
                    onClick={() => togglePreset("high-ticket")}
                  />
                  <button
                    className="ml-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#f77f00] hover:border-[#f77f00] transition-all"
                    onClick={() => {
                      setIsTransitioning(true);
                      setSearch("");
                      setCategoryFilter("All");
                      setMinFollowers("");
                      setMinRating("Any");
                      setSortBy("relevance");
                      setPresetFilter("none");
                      setViewTab("all");
                      setTimeout(() => setIsTransitioning(false), 300);
                    }}
                  >
                    Reset all
                  </button>
                </div>
              </div>
            </div>
          </div>
          {aiHint && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 max-w-2xl">
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-3xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-xl">✨</span>
                  <div>
                    <p className="text-[10px] font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest mb-0.5">AI Hint</p>
                    <p className="text-xs text-orange-900/80 dark:text-orange-300 font-medium leading-relaxed">{aiHint}</p>
                  </div>
                </div>
                <button
                  onClick={() => setAiHint("")}
                  className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded-full transition-colors"
                >
                  <span className="text-orange-500 font-bold">✕</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`transition - opacity duration - 300 ${isTransitioning ? "opacity-0" : "opacity-100"} `}>

          {/* Master Grid Area */}
          <section className="flex-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  {["all", "followed", "new"].map((tab) => (
                    <button
                      key={tab}
                      className={`px - 4 py - 1.5 rounded - lg text - [11px] font - black uppercase tracking - widest transition - all ${viewTab === tab
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        } `}
                      onClick={() => {
                        setIsTransitioning(true);
                        setViewTab(tab);
                        setTimeout(() => setIsTransitioning(false), 300);
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="h-4 border-l border-slate-200 dark:border-slate-700" />
                <span className="text-xs text-slate-400 font-medium">
                  <span className="text-slate-900 dark:text-slate-100 font-black">{sortedSellers.length}</span> results
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[10px] uppercase font-black text-slate-400">Sort By:</label>
                <select
                  className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none cursor-pointer appearance-none pr-6"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f77f00'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0px center', backgroundSize: '0.875rem' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="relevance" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold">Relevance</option>
                  <option value="followers" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold">Followers Count</option>
                  <option value="rating" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold">Top Rated</option>
                  <option value="lives" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold">Live Sessions</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {sortedSellers.map((s) => (
                <SellerCard
                  key={s.id}
                  seller={s}
                  followed={followedSellers.includes(s.id)}
                  onToggleFollow={() => toggleFollowSeller(s.id)}
                  onInvite={openInvite}
                  onChangePage={onChangePage}
                  isRecommended={s.badge === "Top Brand"}
                  isSimilar={s.similarTo.includes("GlowUp Hub") || s.similarTo.includes("GadgetMart Africa")}
                />
              ))}
            </div>

            {sortedSellers.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-[32px] p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">No matching suppliers</h3>
                <p className="text-sm text-slate-500 dark:text-slate-300 max-w-sm mx-auto">
                  Try adjusting your filters or search terms to find more suppliers in the directory.
                </p>
                <button
                  className="mt-6 px-6 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-slate-50"
                  onClick={() => {
                    setIsTransitioning(true);
                    setSearch("");
                    setCategoryFilter("All");
                    setMinFollowers("");
                    setMinRating("Any");
                    setSortBy("relevance");
                    setPresetFilter("none");
                    setViewTab("all");
                    setTimeout(() => setIsTransitioning(false), 300);
                  }}
                >
                  Clear search
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {showInvite && selectedSeller && (
        <InviteModal seller={selectedSeller} onClose={closeInvite} />
      )}

      {isAiDialogOpen && (
        <AiDiscoveryDialog
          sellers={sortedSellers}
          onClose={() => setIsAiDialogOpen(false)}
          onViewSeller={(seller) => {
            setIsAiDialogOpen(false);
            openInvite(seller);
          }}
        />
      )}
    </div>
  );
}

type PresetChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function PresetChip({ label, active, onClick }: PresetChipProps) {
  return (
    <button
      className={`px - 4 py - 1.5 rounded - xl border - 2 text - xs font - bold transition - all ${active
          ? "bg-[#f77f00] border-[#f77f00] text-white shadow-lg shadow-orange-500/20"
          : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200 shadow-sm"
        } `}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type SellerCardProps = {
  seller: Seller;
  compact?: boolean;
  followed: boolean;
  onToggleFollow: () => void;
  onInvite: (seller: Seller) => void;
  onChangePage?: (page: PageId) => void;
  isRecommended?: boolean;
  isSimilar?: boolean;
};

function SellerCard({ seller, followed, onToggleFollow, onInvite, onChangePage: _onChangePage, isRecommended, isSimilar }: SellerCardProps) {
  const navigate = useNavigate();
  const statusColor =
    seller.collabStatus === "Open to collabs"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  // Future-ready visibility gate for opportunity CTA.
  const canViewOpportunity = seller.hasActiveCampaigns || seller.isActivelyCollaborating;

  return (
    <article
      className="h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 group ring-offset-2 focus-within:ring-2 ring-orange-500/50"
    >
      {/* Header section */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-base font-bold text-[#f77f00] transition-colors flex-shrink-0">
            {seller.initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 truncate leading-tight">
                {seller.name}
              </h3>
              <span className="text-[10px] uppercase font-medium tracking-wide text-slate-500 px-1.5 py-0.5 border border-slate-100 dark:border-slate-700 rounded-md bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
                {seller.supplierType}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
              {seller.tagline}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          {isRecommended && (
            <span className="px-2.5 py-1 rounded-full bg-orange-500 text-white text-[10px] font-semibold uppercase tracking-wide shadow-lg shadow-orange-500/20">
              Recommended
            </span>
          )}
          {isSimilar && !isRecommended && (
            <span className="px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-semibold uppercase tracking-wide">
              Similar Match
            </span>
          )}
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium">
            {seller.badge}
          </span>
        </div>
      </div>

      {/* Categories area */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {seller.categories.map((cat: string) => (
            <span
              key={cat}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-medium transition-colors"
            >
              {cat}
            </span>
        ))}
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-slate-100 dark:border-slate-800" />

      {/* Main Stats sub-row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatItem
          label="Followers"
          value={`${(seller.followers / 1000).toFixed(1)} k`}
          trend={seller.followersTrend}
        />
        <StatItem
          label="Live sessions"
          value={seller.livesCompleted}
          trend={seller.livesTrend}
        />
        <StatItem
          label="Avg order"
          value={`$${seller.avgOrderValue} `}
          trend={seller.orderTrend}
        />
      </div>

      {/* Content Body - flex-1 to push footer down */}
      <div className="flex-1 flex flex-col gap-3 mb-6">
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1.5 shrink-0">
            <span className="text-md">✨</span>
            <span className="text-[11px] font-semibold text-[#f77f00]">AI Compatibility Note</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
            {seller.fitReason}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 px-1 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Relationship</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{seller.relationship}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Last Active</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{seller.lastActive}</span>
          </div>
        </div>
      </div>

      {/* Footer Actions - pinned at bottom */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <div className={`px-3 py-1 rounded-xl border text-xs font-medium flex items-center gap-1.5 ${statusColor}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {seller.collabStatus}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFollow();
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${followed
                ? "bg-slate-900 dark:bg-slate-700 text-white"
                : "bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-500 hover:text-slate-900 hover:border-slate-200"
              }`}
          >
            {followed ? "Following" : "+ Follow"}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[#f77f00] text-white text-sm font-semibold shadow-lg shadow-orange-500/20 hover:bg-[#e26f00] transition-all hover:shadow-orange-500/30"
            onClick={() => onInvite(seller)}
          >
            Invite to collaborate
          </button>

          {canViewOpportunity && (
            <button
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => {
                navigate("/opportunities", {
                  state: {
                    supplierName: seller.name,
                    onlyCurrent: true,
                    source: "supplier-directory"
                  }
                });
              }}
              title={`View current opportunities for ${seller.name}`}
            >
              View Opportunity
            </button>
          )}
        </div>
      </div>
    </article>
  );
}



type StatItemProps = {
  label: string;
  value: string | number;
  trend: Trend;
};

function StatItem({ label, value, trend }: StatItemProps) {
  let trendSymbol = "";
  let trendColor = "text-slate-500 dark:text-slate-300";
  if (trend === "up") {
    trendSymbol = "↑";
    trendColor = "text-emerald-600";
  } else if (trend === "down") {
    trendSymbol = "↓";
    trendColor = "text-red-500";
  } else if (trend === "flat") {
    trendSymbol = "↔";
    trendColor = "text-slate-500 dark:text-slate-300";
  }

  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500 dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50">
          {value}
        </span>
        {trend && (
          <span className={`text - tiny ${trendColor} `}>{trendSymbol}</span>
        )}
      </div>
    </div>
  );
}

type InviteModalProps = {
  seller: Seller;
  onClose: () => void;
};

function InviteModal({ seller, onClose }: InviteModalProps) {
  const [message, setMessage] = useState(
    `Hi ${seller.name}, I’d love to collaborate with you on upcoming lives.I believe my audience would resonate well with your brand.`
  );
  const [model, setModel] = useState("Hybrid");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Lock background scroll when drawer is open
  useScrollLock(true);

  const handleSendInvite = () => {
    if (!message.trim()) return;
    setIsSubmitting(true);
    // Simulate backend call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      // Auto close after showing success
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 1500);
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
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold dark:font-bold transition-colors">
              {seller.initials}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Invite {seller.name}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300">{seller.region}</div>
            </div>
          </div>
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
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Invite Sent!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                {seller.name} has been notified. We’ve routed your request to their supplier team.
              </p>
            </div>
          )}

          <section className="space-y-1">
            <h3 className="text-xs font-semibold dark:font-bold">Collaboration model</h3>
            <div className="flex flex-wrap gap-1">
              {["Flat fee", "Commission", "Hybrid"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`px - 2.5 py - 0.5 rounded - full text - xs border transition - colors ${model === m
                      ? "bg-[#f77f00] border-[#f77f00] text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    } `}
                  onClick={() => setModel(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-1">
            <h3 className="text-xs font-semibold">Invite message</h3>
            <textarea
              rows={4}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-400 transition-colors"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Keep it concise. Sellers can see your Creator profile and performance stats.
            </p>
          </section>

          <button
            className={`w - full py - 2 rounded - full text - white text - sm font - semibold transition - all ${isSubmitting
                ? "bg-slate-300 dark:bg-slate-700 cursor-wait"
                : "bg-[#f77f00] hover:bg-[#e26f00]"
              } `}
            onClick={handleSendInvite}
            disabled={isSubmitting || isSuccess}
          >
            {isSubmitting ? "Sending invite..." : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- New AI Discovery Dialog ---
function AiDiscoveryDialog({ sellers, onClose, onViewSeller }: { sellers: Seller[], onClose: () => void, onViewSeller: (s: Seller) => void }) {
  const [stage, setStage] = useState<"scanning" | "analyzing" | "results">("scanning");

  React.useEffect(() => {
    const timer1 = setTimeout(() => setStage("analyzing"), 1500);
    const timer2 = setTimeout(() => setStage("results"), 3000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Lock background scroll when dialog is open
  useScrollLock(true);

  const recommendedSellers = React.useMemo(() => {
    // Simple mock logic: pick top 3 from the passed list (or defaults if list empty)
    return sellers.slice(0, 3);
  }, [sellers]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">AI Discovery Assistant</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Creator Intelligence™</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {stage === "scanning" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-slate-100 dark:border-slate-800 animate-spin border-t-[#f77f00]"></div>
                <span className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">🔍</span>
              </div>
              <div>
                <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">Scanning Supplier Directory...</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Looking for brands matching your audience demographics.</p>
              </div>
            </div>
          )}

          {stage === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-3xl animate-bounce">
                🧠
              </div>
              <div>
                <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">Analyzing Compatibility...</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Checking historical conversion rates and brand affinity.</p>
              </div>
            </div>
          )}

          {stage === "results" && (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3 flex gap-2">
                <span className="text-lg">✨</span>
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Analysis Complete</p>
                  <p className="text-sm text-emerald-900/80 dark:text-emerald-300 font-medium">Found {recommendedSellers.length} high-potential suppliers for your next campaign.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {recommendedSellers.map(seller => (
                  <div key={seller.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm">
                        {seller.initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm dark:text-slate-100">{seller.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{seller.categories.join(", ")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onViewSeller(seller)}
                      className="text-xs font-bold text-[#f77f00] hover:bg-orange-50 dark:hover:bg-orange-900/20 px-3 py-1.5 rounded-full transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {stage === "results" && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { SellersDirectoryPage };
