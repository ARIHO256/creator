import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";

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

  const dismiss = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const show = useCallback((tone, message) => {
    setToast({ tone, message });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  return {
    toast,
    dismiss,
    showSuccess: useCallback((m) => show("success", m), [show]),
    showInfo: useCallback((m) => show("info", m), [show]),
    showWarning: useCallback((m) => show("warning", m), [show])
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

function normalizeLiveFeedPayload(payload) {
  return {
    supplierActsAsCreator: Boolean(payload?.supplierActsAsCreator),
    hero: {
      initials: payload?.hero?.initials || "SP",
      name: payload?.hero?.name || "Seller workspace",
      subtitle: payload?.hero?.subtitle || "Verified Supplier",
      tier: payload?.hero?.tier || "Supplier Tier · Pro",
      kpis: Array.isArray(payload?.hero?.kpis) ? payload.hero.kpis : []
    },
    todayItems: Array.isArray(payload?.todayItems) ? payload.todayItems : [],
    feedItems: Array.isArray(payload?.feedItems) ? payload.feedItems : [],
    followedCreators: Array.isArray(payload?.followedCreators) ? payload.followedCreators : [],
    pipeline: Array.isArray(payload?.pipeline?.stages) ? payload.pipeline.stages : [],
    crew: {
      title: payload?.crew?.title || "No scheduled live session",
      rows: Array.isArray(payload?.crew?.rows) ? payload.crew.rows : []
    },
    aiSuggestions: Array.isArray(payload?.aiSuggestions) ? payload.aiSuggestions : [],
    categoryInsights: Array.isArray(payload?.categoryInsights) ? payload.categoryInsights : [],
    topCategory: payload?.topCategory || "General"
  };
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

/* ----------------------------- Page Components ------------------------------ */

function HeroSummaryCard({ onChangePage, hero }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
            {hero.initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold dark:font-bold dark:text-slate-50">
              {hero.name}
            </div>
            <div className="text-sm leading-5 text-slate-500 dark:text-slate-300">
              {hero.subtitle}
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-sm lg:max-w-[28rem] lg:justify-end lg:self-start xl:max-w-none flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
            🏷️ {hero.tier}
          </span>
          <button
            onClick={() => onChangePage?.("supplier-settings")}
            className="px-4 py-0.5 rounded-lg bg-gradient-to-r from-[#f77f00] via-[#ff8c1a] to-[#f77f00] text-white text-sm font-medium hover:from-[#e26f00] hover:via-[#e67a0f] hover:to-[#e26f00] transition-all shadow-sm"
          >
            Supplier Profile
          </button>
          <button
            onClick={() => onChangePage?.("my-campaigns")}
            className="px-4 py-0.5 rounded-lg bg-[#f77f00] text-white text-sm font-medium hover:bg-[#e26f00]"
          >
            Create Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-sm">
        {hero.kpis.map((kpi) => (
          <HeroKpi key={kpi.label} label={kpi.label} value={kpi.value} sub={kpi.sub} />
        ))}
      </div>

      <div className="md:hidden flex items-center justify-end gap-1.5 mt-2">
        <button
          onClick={() => onChangePage?.("supplier-settings")}
          className="px-4 py-0.5 rounded-lg bg-gradient-to-r from-[#f77f00] via-[#ff8c1a] to-[#f77f00] text-white text-sm font-medium hover:from-[#e26f00] hover:via-[#e67a0f] hover:to-[#e26f00] transition-all shadow-sm"
        >
          Supplier Profile
        </button>
        <button
          onClick={() => onChangePage?.("my-campaigns")}
          className="px-4 py-0.5 rounded-lg bg-[#f77f00] text-white text-sm font-medium hover:bg-[#e26f00]"
        >
          Create Campaign
        </button>
      </div>
    </div>
  );
}

function HeroKpi({ label, value, sub }) {
  return (
    <div className="w-full aspect-square bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 rounded-xl transition-colors px-3 py-3 flex flex-col justify-between">
      <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{label}</div>
      <div className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">{value}</div>
      <div className="text-xs text-emerald-600 dark:text-emerald-400">{sub}</div>
    </div>
  );
}

function TodayAtGlanceCard({ items }) {
  return (
    <div className="w-full xl:w-[32rem] xl:shrink-0 xl:pl-4 xl:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between text-sm">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold dark:font-bold text-xs">Today at a glance</span>
          <span className="text-xs text-slate-500 dark:text-slate-300">Fri</span>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <TimelineItem
              key={`${item.time}-${item.label}`}
              time={item.time}
              label={item.label}
              badge={item.badge}
              badgeColor={item.badgeColor}
            />
          ))}
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

function PipelineCard({ stages }) {
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

function PipelineStage({ label, value, amount, progressPct, highlight }) {
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
            highlight ? "bg-[#f77f00]" : "bg-slate-500"
          )}
          style={{ width: `${Math.max(0, Math.min(100, Number(progressPct || 0)))}%` }}
        />
      </div>
    </div>
  );
}

function CrewCard({ onChangePage, crew }) {
  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 text-sm transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold dark:font-bold">Next execution crew</span>
        <span className="text-xs text-slate-500 dark:text-slate-300">{crew.title}</span>
      </div>
      <ul className="space-y-1.5">
        {crew.rows.map((row) => (
          <CrewRow key={row.role} role={row.role} name={row.name} status={row.status} />
        ))}
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

function AIAssistantCard({ suggestions, onAsk }) {
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
        {suggestions.map((entry) => (
          <AIAssistantSuggestion key={entry.title} title={entry.title} body={entry.body} />
        ))}
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

function CategoryInsightsCard({ insights, onChangePage }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">Product/Service line insights</span>
        <span className="text-xs text-slate-400 dark:text-slate-400">Last 90 days</span>
      </div>
      <div className="space-y-2">
        {insights.map((entry) => (
          <CategoryRow
            key={entry.label}
            label={entry.label}
            badge={entry.badge}
            badgeColor={
              entry.badgeTone === "sky"
                ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                : entry.badgeTone === "amber"
                  ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            }
          />
        ))}
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
  const [feedData, setFeedData] = useState(() => normalizeLiveFeedPayload({}));

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
  // Follow state (mirrors Creator useCreator + followedSellerIds pattern)
  const [followedCreatorIds, setFollowedCreatorIds] = useState<Array<string | number>>([]);
  const followedCreators = useMemo(
    () => feedData.followedCreators.filter((c) => followedCreatorIds.includes(c.id)),
    [feedData.followedCreators, followedCreatorIds]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await sellerBackendApi.getLiveFeedWorkspace();
        if (!active) return;
        const normalized = normalizeLiveFeedPayload(payload);
        setFeedData(normalized);
        setFollowedCreatorIds(normalized.followedCreators.map((creator) => creator.id));
      } catch {
        return;
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [showInfo]);

  const toggleFollowCreator = async (id) => {
    const following = followedCreatorIds.includes(id);
    try {
      await sellerBackendApi.followCreator(String(id), { follow: !following });
      setFollowedCreatorIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      showSuccess("Follow list updated");
    } catch {
      return;
    }
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

  const filteredFeed = feedData.feedItems.filter((item) => {
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
                hero={feedData.hero}
              />
              <TodayAtGlanceCard items={feedData.todayItems} />
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
                <PipelineCard stages={feedData.pipeline} />
                <CrewCard onChangePage={onChangePage} crew={feedData.crew} />
              </div>
            </section>

            {/* Right rail: Creator discovery + AI + insights */}
            <section className="space-y-3">
              <CreatorsDiscoveryCard onChangePage={onChangePage} />
              <AIAssistantCard
                suggestions={feedData.aiSuggestions}
                onAsk={() => showInfo("AI Assistant prompt sent (demo)")}
              />
              <CategoryInsightsCard insights={feedData.categoryInsights} onChangePage={onChangePage} />
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
