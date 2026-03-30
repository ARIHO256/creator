import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SupplierLiveDealzFeedPage (Controlled Mirroring Mode)
 *
 * Mirrors CreatorLiveDealzFeedPage structure, spacing, component hierarchy, and UI patterns.
 * Adapts logic for Supplier (Seller/Provider):
 * - Header CTAs: Create campaign, Browse creators, Upload/Review deliverables
 * - Follow strip: creators you follow
 * - Pipeline: supplier campaign/collab pipeline (open collabs + invite-only + supplier-as-creator)
 * - Crew: next live execution crew (supplier-hosted vs creator-hosted)
 * - AI assistant + insights are supplier-oriented
 *
 * Notes for integration:
 * - Replace onChangePage() with react-router navigate("/supplier/" + page) in your app shell.
 * - Wire pages to Supplier sidebar IDs: home, my-campaigns, dealz-marketplace, live-dashboard, live-schedule,
 *   live-studio, replays-clips, adz-dashboard, adz-marketplace, adz-manager, task-board, asset-library,
 *   links-hub, analytics-status, campaigns-board, creator-directory, my-creators, invites-from-creators,
 *   proposals, contracts, crew-manager, roles-permissions, supplier-settings.
 */

/* --------------------------------- Helpers -------------------------------- */

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = React.useRef(null);

  const dismiss = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast(null);
  };

  const show = (tone, message) => {
    setToast({ tone, message });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  return {
    toast,
    dismiss,
    showSuccess: (m) => show("success", m),
    showInfo: (m) => show("info", m),
    showWarning: (m) => show("warning", m)
  };
}

function Toast({ tone, message, onClose }) {
  const toneStyles =
    tone === "success"
      ? "bg-emerald-600"
      : tone === "warning"
        ? "bg-amber-600"
        : "bg-slate-900";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3">
      <div
        className={classNames(
          "max-w-[92vw] sm:max-w-lg rounded-2xl px-4 py-2.5 shadow-lg text-white",
          toneStyles
        )}
      >
        <div className="flex items-start gap-3">
          <span className="text-sm">
            {tone === "success" ? "✅" : tone === "warning" ? "⚠️" : "ℹ️"}
          </span>
          <div className="flex-1 text-sm font-medium">{message}</div>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white text-sm font-semibold"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Feed Item -------------------------------- */

function FeedItem({
  type,
  title,
  brand,
  viewers,
  time,
  tag,
  onChangePage,
  isReminderSet,
  isJoined,
  onToggleReminder,
  onJoin
}) {
  const typeConfigMap = {
    live: {
      badge: "Live now",
      badgeColor: "bg-red-500",
      pillColor:
        "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
    },
    upcoming: {
      badge: "Upcoming",
      badgeColor: "bg-amber-500",
      pillColor:
        "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
    },
    replay: {
      badge: "Replay",
      badgeColor: "bg-slate-500",
      pillColor:
        "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors"
    }
  };

  const typeConfig = typeConfigMap[type];

  // Supplier CTA logic mirrors Creator structure, but uses supplier-relevant routes.
  let ctaLabel = "Watch";
  let ctaAction = () => onChangePage?.("replays-clips");
  let isPrimary = false;

  if (type === "live") {
    if (isJoined) {
      ctaLabel = "Joined";
      ctaAction = () => {};
      isPrimary = true;
    } else {
      ctaLabel = "Join";
      ctaAction = () => onJoin?.();
    }
  } else if (type === "upcoming") {
    if (isReminderSet) {
      ctaLabel = "Reminder On";
      ctaAction = () => {};
      isPrimary = true;
    } else {
      ctaLabel = "Remind me";
      ctaAction = () => onToggleReminder?.();
    }
  } else if (type === "replay") {
    ctaAction = () => onChangePage?.("replays-clips");
  }

  return (
    <article className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex gap-3 hover:border-slate-200 dark:border-slate-800">
      <div className="relative h-16 w-28 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm text-slate-600 dark:text-slate-200 font-medium transition-colors">
        <span>Video</span>
        <span
          className={classNames(
            "absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full text-white",
            typeConfig.badgeColor
          )}
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
                className={classNames(
                  "inline-flex items-center gap-1 px-4 py-0.5 rounded-lg text-xs font-medium transition-colors",
                  isPrimary
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900"
                )}
              >
                <span>
                  {type === "live" ? "🔴" : type === "upcoming" ? "⏰" : "▶️"}
                </span>
                <span>{ctaLabel}</span>
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">
            {brand}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            <span>👀 {viewers}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{time}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span
            className={classNames(
              "px-2 py-0.5 rounded-full text-xs",
              typeConfig.pillColor
            )}
          >
            {tag}
          </span>
          <div className="md:hidden">
            <button
              onClick={() => {
                if (type === "replay") {
                  onChangePage?.("replays-clips");
                } else {
                  ctaAction();
                }
              }}
              className={classNames(
                "inline-flex items-center gap-1 px-4 py-0.5 rounded-lg text-xs font-medium transition-colors",
                isPrimary
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900"
              )}
            >
              <span>
                {type === "live" ? "🔴" : type === "upcoming" ? "⏰" : "▶️"}
              </span>
              <span>{ctaLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------ Mock Feed Data ------------------------------ */

const allFeedItems = [
  {
    id: 201,
    type: "live",
    title: "Creator Spotlight: Tech Friday Mega Live (Cross-border orders)",
    brand: "@TechWithBrian · Creator",
    viewers: "842",
    time: "Live now · 32 min",
    tag: "High match · Tech",
    category: "Tech"
  },
  {
    id: 202,
    type: "upcoming",
    title: "Upcoming: Beauty Flash Dealz (Pitch window closes soon)",
    brand: "@GlowUpHub · Creator",
    viewers: "Scheduled",
    time: "Today · 18:30",
    tag: "Recommended · Beauty",
    category: "Beauty"
  },
  {
    id: 203,
    type: "replay",
    title: "Replay: EV Charger Deals · 500 units moved (B2B + Retail)",
    brand: "EV World Store · Supplier",
    viewers: "2.3k views",
    time: "Replay · 1 day ago",
    tag: "Your top converting line",
    category: "EV"
  }
];

/* ------------------------- Followed Creators "DB" -------------------------- */

const allCreatorsDb = [
  {
    id: 1,
    name: "TechWithBrian",
    type: "Creator",
    category: "Tech & Gadgets",
    status: "Live now · Tech Friday",
    viewers: 320
  },
  {
    id: 2,
    name: "GlowUpHub",
    type: "Creator",
    category: "Beauty & Skincare",
    status: "Upcoming · Today 18:30",
    viewers: null
  },
  {
    id: 3,
    name: "FaithWithGrace",
    type: "Creator",
    category: "Faith & Wellness",
    status: "Offline",
    viewers: null
  },
  {
    id: 4,
    name: "MotoDealsEast",
    type: "Creator",
    category: "Mobility & EV",
    status: "Offline",
    viewers: null
  }
];

/* ----------------------------- Page Components ------------------------------ */

function HeroSummaryCard({ onChangePage, supplierActsAsCreator }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
            EW
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold dark:font-bold dark:text-slate-50">
              EV World Store
            </div>
            <div className="text-sm leading-5 text-slate-500 dark:text-slate-300">
              Verified Supplier · East Africa, Global
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-sm lg:max-w-[28rem] lg:justify-end lg:self-start xl:max-w-none flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
            🏷️ Supplier Tier · Pro
          </span>
          <button
            onClick={() => onChangePage?.("supplier-public-profile")}
            className="px-4 py-0.5 rounded-lg bg-gradient-to-r from-[#f77f00] via-[#ff8c1a] to-[#f77f00] text-white text-sm font-medium hover:from-[#e26f00] hover:via-[#e67a0f] hover:to-[#e26f00] transition-all shadow-sm"
          >
            Supplier Profile
          </button>
          <button
            onClick={() => onChangePage?.("my-campaigns")}
            className="px-4 py-0.5 rounded-lg bg-[#f77f00] text-white text-sm font-medium hover:bg-[#e26f00]"
          >
            My Campaigns
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-sm">
        <HeroKpi label="Active campaigns" value="5" sub="2 in execution" />
        <HeroKpi
          label="Pending approvals"
          value={supplierActsAsCreator ? "1" : "3"}
          sub={supplierActsAsCreator ? "Self-content review" : "Creator deliverables"}
        />
        <HeroKpi label="Open collabs" value="4" sub="2 pitches need reply" />
      </div>

      <div className="md:hidden flex items-center justify-end gap-1.5 mt-2">
        <button
          onClick={() => onChangePage?.("supplier-public-profile")}
          className="px-4 py-0.5 rounded-lg bg-gradient-to-r from-[#f77f00] via-[#ff8c1a] to-[#f77f00] text-white text-sm font-medium hover:from-[#e26f00] hover:via-[#e67a0f] hover:to-[#e26f00] transition-all shadow-sm"
        >
          Supplier Profile
        </button>
        <button
          onClick={() => onChangePage?.("my-campaigns")}
          className="px-4 py-0.5 rounded-lg bg-[#f77f00] text-white text-sm font-medium hover:bg-[#e26f00]"
        >
          My Campaigns
        </button>
      </div>
    </div>
  );
}

function HeroKpi({ label, value, sub }) {
  return (
    <div className="w-full aspect-[20/7] bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors px-3 py-3 flex flex-col justify-between">
      <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{label}</div>
      <div className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">{value}</div>
      <div className="text-xs text-emerald-600 dark:text-emerald-400">{sub}</div>
    </div>
  );
}

function TodayAtGlanceCard() {
  return (
    <div className="w-full xl:w-[32rem] xl:shrink-0 xl:pl-4 xl:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between text-sm">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold dark:font-bold text-xs">Today at a glance</span>
          <span className="text-xs text-slate-500 dark:text-slate-300">Fri</span>
        </div>
        <ul className="space-y-2">
          <TimelineItem
            time="10:00"
            label="Review creator pitches (Open Collabs)"
            badge="Due soon"
            badgeColor="bg-emerald-500"
          />
          <TimelineItem
            time="14:00"
            label="Approve content (Manual approval campaigns)"
            badge="Approval"
            badgeColor="bg-amber-500"
          />
          <TimelineItem
            time="18:30"
            label="Schedule Live Sessionz (or publish Shoppable Adz)"
          />
        </ul>
      </div>
    </div>
  );
}

function TimelineItem({ time, label, badge, badgeColor }) {
  return (
    <li className="flex items-start gap-2">
      <div className="text-xs text-slate-500 dark:text-slate-300 w-10 shrink-0">{time}</div>
      <div className="min-w-0 flex-1 text-sm font-medium leading-5 dark:text-slate-100">
        {label}
      </div>
      {badge ? (
        <span
          className={classNames(
            "inline-flex ml-auto mt-0.5 px-2 py-0.5 rounded-full text-xs text-white shrink-0",
            badgeColor || "bg-slate-500"
          )}
        >
          {badge}
        </span>
      ) : null}
    </li>
  );
}

function FollowedCreatorsStrip({ creators, onToggleFollow, onChangePage }) {
  return (
    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold dark:font-bold text-slate-800 dark:text-slate-50">
            Lives & updates from creators you follow
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            {creators.length} following
          </span>
        </div>
        <button
          onClick={() => onChangePage?.("creator-directory")}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
        >
          View all
        </button>
      </div>

      {creators.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-300">
          You’re not following any creators yet. Open Creator Directory to follow
          creators for your product/service line.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {creators.map((c) => (
            <button
              key={c.id}
              onClick={() => onChangePage?.("creator-directory")}
              className={classNames(
                "border rounded-xl px-3.5 py-1.5 flex flex-col justify-between text-sm transition-colors text-left",
                c.status.includes("Live")
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                  : c.status.includes("Upcoming")
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1 w-full">
                <div className="flex flex-col">
                  <span className="font-semibold dark:font-bold text-slate-800 dark:text-slate-50 truncate">
                    @{c.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-300">
                    {c.type} · {c.category}
                  </span>
                </div>
                <div
                  className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors z-10"
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onToggleFollow?.(c.id);
                  }}
                >
                  Unfollow
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-200 font-medium">
                <span>{c.status}</span>
                {c.viewers != null ? (
                  <span>👀 {c.viewers.toLocaleString()} watching</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineCard({ supplierActsAsCreator }) {
  // Role-awareness note:
  // - If supplier acts as creator (campaign CreatorUsageDecision = "I will NOT use a Creator"),
  //   pipeline emphasizes self-production stages (content submission, scheduling, execution).
  // - Otherwise pipeline emphasizes collaboration stages (pitches, negotiation, contracts, approvals).
  const stages = supplierActsAsCreator
    ? [
        {
          label: "Briefs created",
          value: "7",
          amount: "$6.2k",
          progress: "w-10/12",
          highlight: false
        },
        {
          label: "Content in review",
          value: "2",
          amount: "$1.9k",
          progress: "w-7/12",
          highlight: true
        },
        {
          label: "Scheduled",
          value: "3",
          amount: "$2.8k",
          progress: "w-8/12",
          highlight: false
        },
        {
          label: "Executing",
          value: "2",
          amount: "$1.6k",
          progress: "w-6/12",
          highlight: false
        }
      ]
    : [
        {
          label: "Open collabs",
          value: "18",
          amount: "$8.4k",
          progress: "w-11/12",
          highlight: false
        },
        {
          label: "Pitches received",
          value: "12",
          amount: "$5.1k",
          progress: "w-9/12",
          highlight: false
        },
        {
          label: "Negotiating",
          value: "6",
          amount: "$3.2k",
          progress: "w-7/12",
          highlight: false
        },
        {
          label: "Active contracts",
          value: "3",
          amount: "$2.0k",
          progress: "w-5/12",
          highlight: true
        }
      ];

  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/60 text-sm transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold dark:font-bold">Promo pipeline</span>
        <span className="text-xs text-slate-500 dark:text-slate-300">This month</span>
      </div>
      <div className="space-y-2">
        {stages.map((s) => (
          <PipelineStage key={s.label} {...s} />
        ))}
      </div>
    </div>
  );
}

function PipelineStage({ label, value, amount, progress, highlight }) {
  return (
    <div className="cursor-default">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-slate-600 dark:text-slate-200 font-medium">
          {label}
        </span>
        <span className="text-xs font-medium">
          {value} · {amount}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden transition-colors">
        <div
          className={classNames(
            "h-full rounded-full",
            highlight ? "bg-[#f77f00]" : "bg-slate-500",
            progress
          )}
        />
      </div>
    </div>
  );
}

function CrewCard({ onChangePage, supplierActsAsCreator }) {
  // Permission note:
  // - Crew management should be visible to Supplier Owner/Admin and assigned Campaign Managers.
  // - Read-only roles can view assignments but cannot modify.
  const hostName = supplierActsAsCreator ? "You (Supplier acting as Creator)" : "Assigned Creator";

  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 text-sm transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold dark:font-bold">Next execution crew</span>
        <span className="text-xs text-slate-500 dark:text-slate-300">Tech Friday Mega Live</span>
      </div>
      <ul className="space-y-1.5">
        <CrewRow role="Host" name={hostName} status="Confirmed" />
        <CrewRow role="Producer" name="Dacy" status="Assigned" />
        <CrewRow role="Moderator" name="Not assigned" status="Missing" />
      </ul>
      <button
        onClick={() => onChangePage?.("crew-manager")}
        className="mt-2 inline-flex items-center px-4 text-xs py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
      >
        Manage Crew & Co-Hosts
      </button>
    </div>
  );
}

function CrewRow({ role, name, status }) {
  const statusColor =
    status === "Confirmed"
      ? "text-emerald-600"
      : status === "Assigned"
        ? "text-sky-600"
        : "text-amber-600";

  const getInitials = (n) => {
    if (!n || n === "Not assigned") return "";
    return n
      .split(" ")
      .map((x) => x[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(name);

  return (
    <li className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span
          className={classNames(
            "h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors",
            initials
              ? "flex items-center justify-center text-[10px] font-semibold text-slate-600 dark:text-slate-300"
              : ""
          )}
        >
          {initials}
        </span>
        <div className="flex flex-col">
          <span className="font-medium">{role}</span>
          <span className="text-xs text-slate-500 dark:text-slate-300">{name}</span>
        </div>
      </div>
      <span className={classNames("text-xs", statusColor)}>{status}</span>
    </li>
  );
}

function AIAssistantCard({ onAsk }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">Supplier AI Assistant</span>
        <span className="text-xs text-slate-400 dark:text-slate-400">Beta</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-200 mb-3">
        Smart moves you can make today based on your catalog and campaign performance.
      </p>
      <ul className="space-y-2">
        <AIAssistantSuggestion
          title="Open Collabs: respond to 2 pitches"
          body="Fast replies increase creator acceptance and reduce contract lag."
        />
        <AIAssistantSuggestion
          title="Best publish window: 20:00–21:00"
          body="High overlap between East Africa and diaspora buyers."
        />
        <AIAssistantSuggestion
          title="Add a 15% timed drop"
          body="Past flash windows boosted conversion by 1.9×."
        />
      </ul>
      <button
        onClick={onAsk}
        className="mt-3 inline-flex items-center px-4 text-sm py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
      >
        Ask AI Assistant for campaign angles
      </button>
    </div>
  );
}

function AIAssistantSuggestion({ title, body }) {
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

function CategoryInsightsCard({ onChangePage }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">Product/Service line insights</span>
        <span className="text-xs text-slate-400 dark:text-slate-400">Last 90 days</span>
      </div>
      <div className="space-y-2">
        <CategoryRow
          label="EV & Charging"
          badge="3.1× conversion"
          badgeColor="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
        />
        <CategoryRow
          label="Tech & Gadgets"
          badge="1.4× conversion"
          badgeColor="bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
        />
        <CategoryRow
          label="Beauty & Skincare"
          badge="High repeat orders"
          badgeColor="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
        />
      </div>
      <button
        onClick={() => onChangePage?.("analytics-status")}
        className="mt-3 inline-flex items-center px-4 text-sm py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
      >
        View full analytics
      </button>
    </div>
  );
}

function CategoryRow({ label, badge, badgeColor }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700 dark:text-slate-100 font-medium transition-colors">
        {label}
      </span>
      <span className={classNames("text-xs px-2 py-0.5 rounded-full", badgeColor)}>
        {badge}
      </span>
    </div>
  );
}

function CreatorsDiscoveryCard({ onChangePage }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">Creator discovery</span>
        <span className="text-xs text-slate-400 dark:text-slate-400">Supplier</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-200">
        Browse vetted creators by category, region, and performance to power your next
        Live Sessionz or Shoppable Adz.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onChangePage?.("creator-directory")}
          className="px-4 py-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
        >
          Open Creator Directory
        </button>
        <button
          onClick={() => onChangePage?.("campaigns-board")}
          className="px-4 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Campaigns Board
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- Main Page -------------------------------- */

export default function SupplierLiveDealzFeedPage() {
  const navigate = useNavigate();
  const { toast, showSuccess, showInfo, dismiss } = useToast();

  const [activePage, setActivePage] = useState("home");
  const pageRouteMap = {
    home: "/mldz/feed",
    "my-campaigns": "/mldz/campaigns",
    "dealz-marketplace": "/mldz/dealz-marketplace",
    "live-dashboard": "/mldz/live/dashboard",
    "live-schedule": "/mldz/live/schedule",
    "live-studio": "/mldz/live/studio",
    "replays-clips": "/mldz/live/replays",
    "adz-dashboard": "/mldz/adz/dashboard",
    "adz-marketplace": "/mldz/adz/marketplace",
    "adz-manager": "/mldz/adz/manager",
    "task-board": "/mldz/deliverables/task-board",
    "asset-library": "/mldz/deliverables/asset-library",
    "links-hub": "/mldz/deliverables/links-hub",
    "analytics-status": "/mldz/insights/analytics-status",
    "campaigns-board": "/mldz/collab/campaigns",
    "creator-directory": "/mldz/creators/directory",
    "my-creators": "/mldz/creators/my-creators",
    "invites-from-creators": "/mldz/creators/invites",
    proposals: "/mldz/collab/proposals",
    contracts: "/mldz/collab/contracts",
    "crew-manager": "/mldz/team/crew-manager",
    "roles-permissions": "/mldz/team/roles-permissions",
    "supplier-settings": "/mldz/settings/supplier-settings",
    "supplier-public-profile": "/mldz/overview/supplier-public-profile"
  };
  const onChangePage = (page) => {
    setActivePage(page);
    const target = pageRouteMap[page] || (page.startsWith("/") ? page : `/supplier/${page}`);
    try {
      navigate(target);
    } catch {
      showInfo(`Navigate → ${target}`);
    }
  };

  // Supplier role awareness: simulate "Supplier acting as Creator" toggle.
  // In the real app this is driven by campaign Creator Usage Decision.
  const [supplierActsAsCreator, setSupplierActsAsCreator] = useState(false);

  // Follow state (mirrors Creator useCreator + followedSellerIds pattern)
  const [followedCreatorIds, setFollowedCreatorIds] = useState([1, 2]);
  const followedCreators = useMemo(
    () => allCreatorsDb.filter((c) => followedCreatorIds.includes(c.id)),
    [followedCreatorIds]
  );

  const toggleFollowCreator = (id) => {
    setFollowedCreatorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    showSuccess("Follow list updated");
  };

  const [activeTab, setActiveTab] = useState("For You");
  const [reminders, setReminders] = useState({});
  const [joinedStreams, setJoinedStreams] = useState({});

  const handleReminder = (id, time) => {
    setReminders((prev) => ({ ...prev, [id]: true }));
    showSuccess(`Reminder set for ${time}`);
  };

  const handleJoin = (id) => {
    setJoinedStreams((prev) => ({ ...prev, [id]: true }));
    showSuccess("Joined stream successfully");
  };

  const filteredFeed = allFeedItems.filter((item) => {
    if (activeTab === "For You") return true;
    if (activeTab === "My Campaigns") return ["live", "upcoming"].includes(item.type);
    if (activeTab === "Platform Highlights") return item.type === "replay";
    return true;
  });

  // Scope button sizing rules to this route while mounted.
  useEffect(() => {
    const cls = "mldz-feed-button-fit";
    document.body.classList.add(cls);
    return () => {
      document.body.classList.remove(cls);
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          {/* Top hero row: profile summary + Today at a glance in one card */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4">
            <div className="flex flex-col xl:flex-row gap-4 items-start">
              <HeroSummaryCard
                onChangePage={onChangePage}
                supplierActsAsCreator={supplierActsAsCreator}
              />
              <TodayAtGlanceCard />
            </div>
          </section>

          {/* Workspace header */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold dark:font-bold text-slate-700 dark:text-slate-100 font-medium transition-colors">
                Your workspace
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-300">
                Optimised for campaigns · live · adz
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-300">
              Active page: <span className="font-semibold">{activePage}</span>
            </div>
          </div>

          {/* Main grid: LiveDealz Feed + right rail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* LiveDealz Feed column */}
            <section className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50">
                    LiveDealz Feed
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Personalised for your store</span>
                  </span>
                </div>

                <div className="flex gap-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 transition-colors overflow-x-auto whitespace-nowrap">
                  {["For You", "My Campaigns", "Platform Highlights"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={classNames(
                        "px-4 py-0.5 rounded-lg text-xs transition-colors flex-shrink-0",
                        activeTab === tab
                          ? "bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-slate-100 font-medium"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      )}
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

              {/* Followed creators strip */}
              <FollowedCreatorsStrip
                creators={followedCreators}
                onToggleFollow={toggleFollowCreator}
                onChangePage={onChangePage}
              />

              {/* Pipeline + crew */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <PipelineCard supplierActsAsCreator={supplierActsAsCreator} />
                <CrewCard
                  onChangePage={onChangePage}
                  supplierActsAsCreator={supplierActsAsCreator}
                />
              </div>
            </section>

            {/* Right rail: Creator discovery + AI + insights */}
            <section className="space-y-3">
              <CreatorsDiscoveryCard onChangePage={onChangePage} />
              <AIAssistantCard
                onAsk={() => showInfo("AI Assistant prompt sent (demo)")}
              />
              <CategoryInsightsCard onChangePage={onChangePage} />
            </section>
          </div>
        </div>
      </main>

      {toast ? (
        <Toast tone={toast.tone} message={toast.message} onClose={dismiss} />
      ) : null}
    </div>
  );
}
