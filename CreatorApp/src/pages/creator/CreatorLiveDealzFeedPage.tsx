// Creator Standalone LiveDealz Feed Page
// Independent page for the Creator LiveDealz Feed (no global app shell)
// Combines hero summary, Today at a glance, LiveDealz feed, followed sellers/providers,
// collab pipeline, crew, AI Assistant and category insights.

import React, { useState, useMemo, useEffect } from "react";
import { useNotification } from "../../contexts/NotificationContext";
import {
  useNavigate
} from "react-router-dom";

import { useCreator } from "../../contexts/CreatorContext";
import { PageHeader } from "../../components/PageHeader";
import type { PageId } from "../../layouts/CreatorShellLayout";

type EntityType = "Seller" | "Provider";

type FollowedEntity = {
  id: number;
  name: string;
  type: EntityType;
  category: string;
  status: string;
  viewers: number | null;
};

type FeedType = "live" | "upcoming" | "replay";

type FeedItemProps = {
  type: FeedType;
  title: string;
  brand: string;
  viewers: string;
  time: string;
  tag: string;
  onChangePage?: (page: PageId) => void;
  isReminderSet?: boolean;
  isJoined?: boolean;
  onToggleReminder?: () => void;
  onJoin?: () => void;
};

type TypeConfig = {
  badge: string;
  badgeColor: string;
  pillColor: string;
};



function FeedItem({
  type, title, brand, viewers, time, tag, onChangePage,
  isReminderSet, isJoined, onToggleReminder, onJoin
}: FeedItemProps) {
  const typeConfigMap: Record<FeedType, TypeConfig> = {
    live: { badge: "Live now", badgeColor: "bg-red-500", pillColor: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
    upcoming: {
      badge: "Upcoming",
      badgeColor: "bg-amber-500",
      pillColor: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
    },
    replay: {
      badge: "Replay",
      badgeColor: "bg-slate-500",
      pillColor: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors"
    }
  };
  const typeConfig = typeConfigMap[type];

  // Determine CTA label and action based on state
  let ctaLabel = "Watch";
  let ctaAction = () => onChangePage?.("live-history"); // Default replay action
  let isPrimary = false; // For styling active state

  if (type === "live") {
    if (isJoined) {
      ctaLabel = "Joined";
      ctaAction = () => { }; // No-op or maybe leave
      isPrimary = true;
    } else {
      ctaLabel = "Join";
      ctaAction = () => onJoin?.();
    }
  } else if (type === "upcoming") {
    if (isReminderSet) {
      ctaLabel = "Reminder On";
      ctaAction = () => { }; // No-op or toggle off
      isPrimary = true;
    } else {
      ctaLabel = "Remind me";
      ctaAction = () => onToggleReminder?.();
    }
  } else if (type === "replay") {
    ctaAction = () => onChangePage?.("AdzMarketplace"); // Default replay action
  }

  return (
    <article className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex gap-3 hover:border-slate-200 dark:border-slate-800">
      <div className="relative h-16 w-28 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm text-slate-600 dark:text-slate-200 font-medium transition-colors">
        <span>Video</span>
        <span
          className={`absolute bottom-1 left-1 text-tiny px-1.5 py-0.5 rounded-full text-white ${typeConfig.badgeColor}`}
        >
          {typeConfig.badge}
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-between text-sm">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="font-semibold dark:font-bold text-sm line-clamp-2 mr-2">
              {title}
            </h3>
            <div className="hidden md:flex gap-2">
              <button
                onClick={ctaAction}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${isPrimary
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900"
                  }`}
              >
                <span>{type === "live" ? "🔴" : type === "upcoming" ? "⏰" : "▶️"}</span>
                <span>{ctaLabel}</span>
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{brand}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            <span>👀 {viewers}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{time}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`px-2 py-0.5 rounded-full text-xs ${typeConfig.pillColor}`}>
            {tag}
          </span>
          <div className="md:hidden">
            <button
              onClick={() => {
                if (type === "replay") {
                  onChangePage?.("AdzMarketplace");
                } else {
                  ctaAction();
                }
              }}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${isPrimary
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900"
                }`}
            >
              <span>{type === "live" ? "🔴" : type === "upcoming" ? "⏰" : "▶️"}</span>
              <span>{ctaLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
/* Mock Feed Data */
const allFeedItems: (FeedItemProps & { id: number; category: string })[] = [
  {
    id: 101,
    type: "live",
    title: "Tech Friday Mega Live with GadgetMart",
    brand: "GadgetMart Africa",
    viewers: "842",
    time: "Live now · 32 min",
    tag: "High match · Tech",
    category: "Tech"
  },
  {
    id: 102,
    type: "upcoming",
    title: "Faith & Wellness Morning Dealz",
    brand: "Grace Living Store",
    viewers: "Scheduled",
    time: "Today · 10:00am",
    tag: "Recommended · Faith-compatible",
    category: "Wellness"
  },
  {
    id: 103,
    type: "replay",
    title: "Beauty Flash · 500 units sold in 45 mins",
    brand: "GlowUp Hub",
    viewers: "2.3k views",
    time: "Replay · 1 day ago",
    tag: "Your top converting category",
    category: "Beauty"
  }
];


export function CreatorLiveDealzFeedPage() {
  const { showSuccess, showNotification } = useNotification();
  const navigate = useNavigate();
  const onChangePage = (page: PageId) => {
    navigate("/" + page);
  };
  /* Shared Friend/Follow State */
  const { followedSellerIds, toggleFollowSeller } = useCreator();

  // Mock "Database" of entities - in a real app this would come from an API
  const allEntitiesDb: FollowedEntity[] = [
    {
      id: 1,
      name: "GlowUp Hub",
      type: "Seller",
      category: "Beauty & Skincare",
      status: "Live now · Beauty Flash",
      viewers: 320
    },
    {
      id: 2,
      name: "GadgetMart Africa",
      type: "Seller",
      category: "Tech & Gadgets",
      status: "Upcoming · Today 20:00",
      viewers: null
    },
    {
      id: 3,
      name: "Grace Living Store",
      type: "Seller",
      category: "Faith & Wellness",
      status: "Offline",
      viewers: null
    },
    {
      id: 4,
      name: "EV Gadget World",
      type: "Seller",
      category: "EV & Tech",
      status: "Offline",
      viewers: null
    },
    {
      id: 5,
      name: "ShopNow Foods",
      type: "Seller",
      category: "Food",
      status: "Offline",
      viewers: null
    }
  ];

  // Derive followed entities from the shared ID list
  const followedEntities = allEntitiesDb.filter(e => followedSellerIds.includes(e.id));

  const [activeTab, setActiveTab] = useState<string>("For You");
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const [joinedStreams, setJoinedStreams] = useState<Record<string, boolean>>({});

  // Interaction State

  const handleReminder = (id: number, time: string) => {
    setReminders(prev => ({ ...prev, [id]: true }));
    showSuccess(`Reminder set for ${time}`);
  };

  const handleJoin = (id: number) => {
    setJoinedStreams(prev => ({ ...prev, [id]: true }));
    showSuccess("Joined stream successfully");
    // Simulate navigation/action lag
    setTimeout(() => {
      // In a real app, this might redirect
    }, 1000);
  };

  /* Filter Logic with mocked data checks */
  const filteredFeed = allFeedItems.filter((item) => {
    if (activeTab === "For You") return true;
    if (activeTab === "My Campaigns") return ["live", "upcoming"].includes(item.type);
    if (activeTab === "Platform Highlights") return item.type === "replay";
    return true;
  });

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="LiveDealz Feed"
        badge={
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangePage?.("creator-campaigns")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <span>🧭</span>
              <span>Find Campaigns</span>
            </button>
            <button
              onClick={() => onChangePage?.("opportunities")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <span>✉️</span>
              <span>Send Pitches</span>
            </button>
            <button
              onClick={() => onChangePage?.("content-submission")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <span>📤</span>
              <span>Upload Deliverable</span>
            </button>
          </div>
        }
      />
      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          {/* Top hero row: profile summary + Today at a glance */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <HeroSummaryCard onChangePage={onChangePage} />
            <TodayAtGlanceCard />
          </div>

          {/* Workspace header */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold dark:font-bold text-slate-700 dark:text-slate-100 font-medium transition-colors">Your workspace</span>
              <span className="text-xs text-slate-500 dark:text-slate-300">
                Optimised for live · collab · earnings
              </span>
            </div>
            <div />
          </div>

          {/* Main grid: LiveDealz Feed + right rail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* LiveDealz Feed column */}
            <section className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50">LiveDealz Feed</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Personalised for you</span>
                  </span>
                </div>
                <div className="flex gap-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 transition-colors overflow-x-auto whitespace-nowrap scrollbar-hide">
                  {["For You", "My Campaigns", "Platform Highlights"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors flex-shrink-0 ${activeTab === tab
                        ? "bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-slate-100 font-medium"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feed items */}
              <div className="space-y-3">
                {filteredFeed.map((item) => (
                  <FeedItem
                    key={item.id}
                    {...item}
                    onChangePage={onChangePage}
                    isReminderSet={!!reminders[item.id]}
                    isJoined={!!joinedStreams[item.id]}
                    onToggleReminder={() => handleReminder(item.id, item.time)}
                    onJoin={() => handleJoin(item.id)}
                  />
                ))}
              </div>

              {/* Followed sellers & providers strip */}
              <FollowedLiveStrip
                entities={followedEntities}
                onToggleFollow={toggleFollowSeller}
                onChangePage={onChangePage}
              />

              {/* Collab pipeline + crew */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <PipelineCard />
                <CrewCard onChangePage={onChangePage} />
              </div>
            </section>

            {/* Right rail: AI Assistant + Category insights */}
            <section className="space-y-3">
              <ProvidersEducationCard onChangePage={onChangePage} />
              <AIAssistantCard />
              <CategoryInsightsCard onChangePage={onChangePage} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Hero row components ---------- */

type HeroSummaryCardProps = {
  onChangePage?: (page: PageId) => void;
};

function HeroSummaryCard({ onChangePage }: HeroSummaryCardProps) {
  return (
    <section className="flex-1 bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
            RI
          </div>
          <div>
            <div className="text-sm font-semibold dark:font-bold dark:text-slate-50">Ronald Isabirye</div>
            <div className="text-sm text-slate-500 dark:text-slate-300">
              Silver Creator · East Africa, Global
            </div>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end gap-1 text-sm">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
            ⭐ Silver Tier
          </span>
          <div className="flex gap-1.5">
            {onChangePage && (
              <button
                onClick={() => onChangePage("profile-public")}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-[#f77f00] via-[#ff8c1a] to-[#f77f00] text-white text-sm font-medium hover:from-[#e26f00] hover:via-[#e67a0f] hover:to-[#e26f00] transition-all shadow-sm"
              >
                My Public Profile
              </button>
            )}
            <button
              onClick={() => onChangePage && onChangePage("live-studio")}
              className="px-3 py-1 rounded-full bg-[#f77f00] text-white text-sm font-medium hover:bg-[#e26f00]"
            >
              Go Live Now
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-sm">
        <HeroKpi label="This month" value="$1,430" sub="+32% vs last month" />
        <HeroKpi label="Upcoming lives" value="3" sub="Next: Today 8:00pm" />
        <HeroKpi label="Open proposals" value="4" sub="2 need reply" />
      </div>
      <div className="md:hidden flex items-center justify-end gap-1.5 mt-2">
        {onChangePage && (
          <button
            onClick={() => onChangePage("profile-public")}
            className="px-3 py-1 rounded-full bg-gradient-to-r from-[#f77f00] via-[#ff8c1a] to-[#f77f00] text-white text-sm font-medium hover:from-[#e26f00] hover:via-[#e67a0f] hover:to-[#e26f00] transition-all shadow-sm"
          >
            My Public Profile
          </button>
        )}
        <button
          onClick={() => onChangePage && onChangePage("live-studio")}
          className="px-3 py-1 rounded-full bg-[#f77f00] text-white text-sm font-medium hover:bg-[#e26f00]"
        >
          Go Live Now
        </button>
      </div>
    </section>
  );
}

type HeroKpiProps = {
  label: string;
  value: string;
  sub: string;
};

function HeroKpi({ label, value, sub }: HeroKpiProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors px-3 py-2 flex flex-col justify-between">
      <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{label}</div>
      <div className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">{value}</div>
      <div className="text-xs text-emerald-600 dark:text-emerald-400">{sub}</div>
    </div>
  );
}

function TodayAtGlanceCard() {
  return (
    <section className="w-full md:w-72 bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col justify-between text-sm">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold dark:font-bold text-xs">Today at a glance</span>
          <span className="text-xs text-slate-500 dark:text-slate-300">Thu</span>
        </div>
        <ul className="space-y-1.5">
          <TimelineItem
            time="14:00"
            label="Prep assets for Beauty Flash"
            badge="Due soon"
            badgeColor="bg-emerald-500"
          />
          <TimelineItem
            time="18:30"
            label="Live · Beauty Flash Deal"
            badge="Live"
            badgeColor="bg-red-500"
          />
          <TimelineItem time="21:00" label="Submit gadget review clip" badge={undefined} badgeColor={undefined} />
        </ul>
      </div>
    </section>
  );
}

type TimelineItemProps = {
  time: string;
  label: string;
  badge?: string;
  badgeColor?: string;
};

function TimelineItem({ time, label, badge, badgeColor }: TimelineItemProps) {
  return (
    <li className="flex items-start gap-2">
      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300 w-10">{time}</div>
      <div className="flex-1">
        <div className="text-sm font-medium dark:text-slate-100">{label}</div>
        {badge && (
          <span
            className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-xs text-white ${badgeColor || "bg-slate-500"
              }`}
          >
            {badge}
          </span>
        )}
      </div>
    </li>
  );
}



/* ---------- LiveDealz Feed components ---------- */




type FollowedLiveStripProps = {
  entities: FollowedEntity[];
  onToggleFollow: (id: number) => void;
  onChangePage?: (page: PageId) => void;
};

function FollowedLiveStrip({ entities, onToggleFollow, onChangePage }: FollowedLiveStripProps) {
  return (
    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold dark:font-bold text-slate-800 dark:text-slate-50">
            Lives & updates from sellers and providers you follow
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            {entities.length} following
          </span>
        </div>
        <button
          onClick={() => onChangePage && onChangePage("sellers")}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
        >
          View all
        </button>
      </div>
      {entities.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-300">
          You’re not following any sellers or providers yet. Use the Sellers Discovery Pool to
          follow brands you want a live feed from.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {entities.map((e: FollowedEntity) => (
            <button
              key={e.id}
              onClick={() => onChangePage?.("sellers")}
              className={`min-w-[200px] max-w-xs border rounded-xl px-2.5 py-2 flex flex-col justify-between text-sm transition-colors text-left ${e.status.includes("Live")
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : e.status.includes("Upcoming")
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1 w-full">
                <div className="flex flex-col">
                  <span className="font-semibold dark:font-bold text-slate-800 dark:text-slate-50 truncate">
                    {e.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-300">
                    {e.type} · {e.category}
                  </span>
                </div>
                <div
                  className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors z-10"
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onToggleFollow(e.id);
                  }}
                >
                  Unfollow
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-200 font-medium">
                <span>{e.status}</span>
                {e.viewers != null && (
                  <span>👀 {e.viewers.toLocaleString()} watching</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Pipeline, crew, AI Assistant, category insights ---------- */

function PipelineCard() {
  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-900/60 text-sm transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold dark:font-bold">Collab pipeline</span>
        <span className="text-xs text-slate-500 dark:text-slate-300">This month</span>
      </div>
      <div className="space-y-2">
        <PipelineStage label="Leads" value="18" amount="$4.8k" progress="w-11/12" highlight={false} />
        <PipelineStage label="Pitches sent" value="12" amount="$3.2k" progress="w-9/12" highlight={false} />
        <PipelineStage label="Negotiating" value="6" amount="$2.1k" progress="w-7/12" highlight={false} />
        <PipelineStage label="Active contracts" value="3" amount="$1.4k" progress="w-5/12" highlight={true} />
      </div>
    </div>
  );
}

type PipelineStageProps = {
  label: string;
  value: string;
  amount: string;
  progress: string;
  highlight: boolean;
};

function PipelineStage({ label, value, amount, progress, highlight }: PipelineStageProps) {
  return (
    <div className="cursor-default">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-slate-600 dark:text-slate-200 font-medium">{label}</span>
        <span className="text-xs font-medium">
          {value} · {amount}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden transition-colors">
        <div
          className={`h-full rounded-full ${highlight ? "bg-[#f77f00]" : "bg-slate-500"} ${progress}`}
        />
      </div>
    </div>
  );
}

function CrewCard({ onChangePage }: { onChangePage?: (page: PageId) => void }) {
  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 text-sm transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold dark:font-bold">Tonight&apos;s live crew</span>
        <span className="text-xs text-slate-500 dark:text-slate-300">Beauty Flash Deal</span>
      </div>
      <ul className="space-y-1.5">
        <CrewRow role="Creator" name="Ronald" status="Confirmed" />
        <CrewRow role="Producer" name="Dacy" status="Assigned" />
        <CrewRow role="Moderator" name="Not assigned" status="Missing" />
      </ul>
      <button
        onClick={() => onChangePage?.("crew-manager")}
        className="mt-2 w-full text-xs py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
      >
        Manage Crew & Co-Hosts
      </button>
    </div>
  );
}

type CrewRowProps = {
  role: string;
  name: string;
  status: string;
};

function CrewRow({ role, name, status }: CrewRowProps) {
  const statusColor =
    status === "Confirmed"
      ? "text-emerald-600"
      : status === "Assigned"
        ? "text-sky-600"
        : "text-amber-600";

  const getInitials = (name: string) => {
    if (name === "Not assigned") return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(name);

  return (
    <li className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={`h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors ${initials ? "flex items-center justify-center text-tiny font-semibold text-slate-600 dark:text-slate-300" : ""}`}>
          {initials}
        </span>
        <div className="flex flex-col">
          <span className="font-medium">{role}</span>
          <span className="text-xs text-slate-500 dark:text-slate-300">{name}</span>
        </div>
      </div>
      <span className={`text-xs ${statusColor}`}>{status}</span>
    </li>
  );
}

function AIAssistantCard() {
  const { showNotification } = useNotification();
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">Creator AI Assistant</span>
        <span className="text-xs text-slate-400 dark:text-slate-400">Beta</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-200 mb-3">
        Here are smart moves you can make today based on your audience and campaigns.
      </p>
      <ul className="space-y-2">
        <AIAssistantSuggestion
          title="Pitch 2 campaigns in Beauty & Skincare"
          body="Creators like you see 85% acceptance on similar briefs."
        />
        <AIAssistantSuggestion
          title="Best time to go live: 20:00–21:00"
          body="Your followers in East Africa and China overlap here."
        />
        <AIAssistantSuggestion
          title="Try a 20% flash window mid-stream"
          body="Past streams showed 2.3× conversion during timed drops."
        />
      </ul>
      <button
        onClick={() => showNotification("AI Assistant is coming soon!")}
        className="mt-3 w-full text-sm py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
        Ask AI Assistant for a script idea
      </button>
    </div>
  );
}

function CategoryInsightsCard({ onChangePage }: { onChangePage?: (page: PageId) => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">Product/Service line insights</span>
        <span className="text-xs text-slate-400 dark:text-slate-400">Last 90 days</span>
      </div>
      <div className="space-y-2">
        <CategoryRow
          label="Beauty & Skincare"
          badge="3.1× platform conversion"
          badgeColor="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
        />
        <CategoryRow
          label="Tech & Gadgets"
          badge="1.4× platform conversion"
          badgeColor="bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
        />
        <CategoryRow
          label="Faith-compatible"
          badge="High trust · low return rate"
          badgeColor="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
        />
      </div>
      <button
        onClick={() => onChangePage?.("analytics")}
        className="mt-3 w-full text-sm py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
        View full analytics
      </button>
    </div>
  );
}

type CategoryRowProps = {
  label: string;
  badge: string;
  badgeColor: string;
};

function CategoryRow({ label, badge, badgeColor }: CategoryRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700 dark:text-slate-100 font-medium transition-colors">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
    </div>
  );
}

type AIAssistantSuggestionProps = {
  title: string;
  body: string;
};

function AIAssistantSuggestion({ title, body }: AIAssistantSuggestionProps) {
  return (
    <li className="border border-slate-100 dark:border-slate-800 rounded-xl p-2.5">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-xs">✨</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">{body}</p>
    </li>
  );
}

import { LiveDealzSuppliersCard } from "./LiveDealzSuppliersCard";

function ProvidersEducationCard({ onChangePage }: { onChangePage?: (page: PageId) => void }) {
  return (
    <LiveDealzSuppliersCard
      onExploreSuppliers={() => onChangePage?.("sellers")}
    />
  );
}

