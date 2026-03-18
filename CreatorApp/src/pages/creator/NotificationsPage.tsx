import React, { useEffect, useMemo, useRef, useState } from "react";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useNotification } from "../../contexts/NotificationContext";

// MyLiveDealz - Creator Notifications Panel
// Purpose: What the top-right notifications (bell) icon should bring.
// Pattern: Premium anchored panel (popover) with tabs + bulk actions.
// Primary accent: Orange #f77f00

const DEMO_NOTIFICATIONS = [
  {
    id: "N-9001",
    type: "proposal",
    priority: "high",
    unread: true,
    title: "New proposal from GlowUp Hub",
    message: "They updated terms: $450–$600 + 5% commission. Reply to keep the slot.",
    meta: { seller: "GlowUp Hub", campaign: "Autumn Beauty Flash" },
    time: "2h ago",
    cta: "Review proposal"
  },
  {
    id: "N-9002",
    type: "invite",
    priority: "medium",
    unread: true,
    title: "Invite accepted – contract draft ready",
    message: "GadgetMart Africa accepted your pitch. Confirm dates to generate contract.",
    meta: { seller: "GadgetMart Africa", campaign: "Tech Friday Mega Live" },
    time: "Yesterday",
    cta: "Open contract"
  },
  {
    id: "N-9003",
    type: "live",
    priority: "high",
    unread: true,
    title: "Live starts in 45 minutes",
    message: "Beauty Flash Live · Make sure products & overlays are ready.",
    meta: { seller: "GlowUp Hub", campaign: "Beauty Flash Live" },
    time: "Today",
    cta: "Open Live Studio"
  },
  {
    id: "N-9004",
    type: "earnings",
    priority: "medium",
    unread: false,
    title: "Payout scheduled",
    message: "USD 260 scheduled for Nov 15 via Bank transfer (GlowUp Hub).",
    meta: { seller: "GlowUp Hub", campaign: "Payout" },
    time: "2 days ago",
    cta: "View payouts"
  },
  {
    id: "N-9005",
    type: "system",
    priority: "low",
    unread: false,
    title: "Faith desk guideline update",
    message: "Updated wording restrictions for Faith-compatible campaigns. Review to stay compliant.",
    meta: { seller: "MyLiveDealz", campaign: "Compliance" },
    time: "Last week",
    cta: "View guidelines"
  },
  {
    id: "N-9006",
    type: "proposal",
    priority: "normal",
    unread: true,
    title: "Revised offer: Urban Kicks",
    message: "Urban Kicks responded to your counter-offer. They've increased the base rate by 15%.",
    meta: { seller: "Urban Kicks", campaign: "Spring Streetwear" },
    time: "3h ago",
    cta: "View revised proposal"
  },
  {
    id: "N-9007",
    type: "earnings",
    priority: "high",
    unread: true,
    title: "Bonus payment received!",
    message: "You've earned a $50 bonus for exceeding engagement targets on the 'Tech Friday' live.",
    meta: { seller: "GadgetMart Africa", campaign: "Tech Friday" },
    time: "5h ago",
    cta: "Check earnings"
  },
  {
    id: "N-9008",
    type: "invite",
    priority: "medium",
    unread: true,
    title: "New partnership request",
    message: "EcoHome Essentials wants to supplier with you for their sustainable living series.",
    meta: { seller: "EcoHome Essentials", campaign: "Green Living" },
    time: "Today",
    cta: "Review request"
  },
  {
    id: "N-9009",
    type: "live",
    priority: "normal",
    unread: false,
    title: "Clips from your last live are ready",
    message: "We've automatically generated 5 highlight clips from your 'Autumn Beauty' session.",
    meta: { seller: "GlowUp Hub", campaign: "Autumn Beauty" },
    time: "Yesterday",
    cta: "Review clips"
  },
  {
    id: "N-9010",
    type: "system",
    priority: "low",
    unread: false,
    title: "New feature: AI Script Assistant",
    message: "Try our new AI assistant to help you draft engaging scripts for your live sessions.",
    meta: { seller: "MyLiveDealz", campaign: "Platform Update" },
    time: "3 days ago",
    cta: "Try it now"
  }
];



import type { PageId } from "../../layouts/CreatorShellLayout";

type NotificationsPanelProps = {
  open: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  unreadCount?: number;
  onChangePage?: (page: PageId) => void;
};

type Tab = "all" | "proposal" | "invite" | "live" | "earnings" | "system";
type Notification = {
  id: number;
  type: Tab;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  priority: "high" | "normal" | "low";
  meta: { seller: string; campaign: string };
  cta: string;
};

export function NotificationsPanel({ open, onClose, buttonRef, unreadCount: externalUnreadCount, onChangePage }: NotificationsPanelProps) {
  const { showSuccess, showNotification } = useNotification();
  // const [selectedId, setSelectedId] = useState<number | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  // const [dnd, setDnd] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const panelRef = useRef<HTMLDivElement>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  // Lock background scroll when open
  useScrollLock(open);

  useEffect(() => {
    if (open && buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect(rect);
    } else {
      setButtonRect(null);
    }
  }, [open, buttonRef]);

  // Update position on window resize
  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      if (buttonRef?.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonRect(rect);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, buttonRef]);

  const allNotifs: Notification[] = useMemo(() => [
    {
      id: 1,
      type: "proposal",
      title: "New proposal from GlowUp Hub",
      message:
        "They updated terms: $450–$600 + 5% commission. Reply to keep the slot.",
      time: "2h ago",
      unread: true,
      priority: "high",
      meta: { seller: "GlowUp Hub", campaign: "Autumn Beauty Flash" },
      cta: "Review proposal"
    },
    {
      id: 2,
      type: "invite",
      title: "Invite accepted",
      message:
        "GadgetMart Africa accepted your pitch. Confirm dates and deliverables.",
      time: "Yesterday",
      unread: true,
      priority: "normal",
      meta: { seller: "GadgetMart Africa", campaign: "Tech Fest 2025" },
      cta: "Confirm collaboration"
    },
    {
      id: 3,
      type: "live",
      title: "Live starts in 30 mins",
      message:
        "Beauty Flash Live · Make sure products & overlays are ready. Check your mic.",
      time: "Today",
      unread: false,
      priority: "high",
      meta: { seller: "GlowUp Hub", campaign: "Beauty Flash Live" },
      cta: "Open Live Studio"
    },
    {
      id: 4,
      type: "earnings",
      title: "Payout scheduled",
      message:
        "USD 260 scheduled for Nov 15 via Bank transfer. Track in Earnings.",
      time: "2 days ago",
      unread: false,
      priority: "normal",
      meta: { seller: "GlowUp Hub", campaign: "Oct Earnings" },
      cta: "View payout details"
    },
    {
      id: 5,
      type: "system",
      title: "Faith desk guidelines updated",
      message:
        "Updated wording restrictions for Faith-compatible campaigns. Review changes.",
      time: "Last week",
      unread: false,
      priority: "normal",
      meta: { seller: "MyLiveDealz", campaign: "Platform Updates" },
      cta: "Read guidelines"
    },
    {
      id: 6,
      type: "proposal",
      title: "Revised offer: Urban Kicks",
      message: "Urban Kicks increased the base rate by 15% in response to your counter.",
      time: "3h ago",
      unread: true,
      priority: "normal",
      meta: { seller: "Urban Kicks", campaign: "Spring Streetwear" },
      cta: "Review proposal"
    },
    {
      id: 7,
      type: "earnings",
      title: "Bonus payment received!",
      message: "You earned a $50 bonus for the 'Tech Friday' live engagement.",
      time: "5h ago",
      unread: true,
      priority: "high",
      meta: { seller: "GadgetMart Africa", campaign: "Tech Friday" },
      cta: "Check earnings"
    },
    {
      id: 8,
      type: "invite",
      title: "New partnership request",
      message: "EcoHome Essentials wants to supplier for 'Green Living' series.",
      time: "Today",
      unread: true,
      priority: "normal",
      meta: { seller: "EcoHome Essentials", campaign: "Green Living" },
      cta: "Review request"
    },
    {
      id: 9,
      type: "live",
      title: "Live clips ready",
      message: "5 highlight clips from your last session are ready to review.",
      time: "Yesterday",
      unread: false,
      priority: "normal",
      meta: { seller: "GlowUp Hub", campaign: "Autumn Beauty" },
      cta: "Review clips"
    },
    {
      id: 10,
      type: "system",
      title: "New feature: AI Script Assistant",
      message: "Draft engaging scripts for your live sessionz with our new AI.",
      time: "3 days ago",
      unread: false,
      priority: "normal",
      meta: { seller: "MyLiveDealz", campaign: "Platform Update" },
      cta: "Try it now"
    }
  ], []); // Empty dependency array to ensure allNotifs is stable



  const notifications = useMemo(() => {
    let result = allNotifs;
    if (activeTab !== "all") {
      result = result.filter((n) => n.type === activeTab);
    }
    if (unreadOnly) {
      result = result.filter((n) => n.unread);
    }
    return result;
  }, [allNotifs, activeTab, unreadOnly]);

  const unreadCount = useMemo(
    () => externalUnreadCount ?? allNotifs.filter((n) => n.unread).length,
    [externalUnreadCount, allNotifs]
  );

  const urgentCount = useMemo(
    () => allNotifs.filter((n) => n.unread && n.priority === "high").length,
    [allNotifs]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef?.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, buttonRef]);

  useEffect(() => {
    // Reset expanded if current expanded notification is filtered out
    if (expandedId && !notifications.some((n) => n.id === expandedId)) {
      setExpandedId(null);
    }
  }, [notifications, expandedId]);

  const markAllRead = () => {
    // Mark all notifications as read
    allNotifs.forEach(n => n.unread = false);
    showSuccess("All notifications marked as read");
    // Force re-render to update unread counts and filtered lists
    setExpandedId(null);
    setUnreadOnly(false);
    setActiveTab("all");
  };

  const handleToggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Mark as read when expanded
      const notif = allNotifs.find(n => n.id === id);
      if (notif && notif.unread) {
        notif.unread = false;
        showNotification(`Marked “${notif.title}” as read`);
        // Force re-render to update unread counts
        setUnreadOnly(prev => prev); // Trigger state update
      }
    }
  };

  const openSettings = () => {
    onClose();
    onChangePage?.("settings");
  };

  return (
    <div className={`fixed inset-0 z-[10000] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* anchored panel - positioned below button and MoneyBar */}
      {open && buttonRect && (
        <div
          className="fixed z-[10001]"
          style={{
            // Responsive positioning for all screen sizes
            ...(window.innerWidth < 640
              ? {
                // Mobile (< 640px): Full width with small margins
                left: '0.5rem',
                right: '0.5rem',
                top: `${Math.max(buttonRect.bottom + 8, 80)}px`,
                bottom: '4.5rem',
              }
              : window.innerWidth < 1024
                ? {
                  // Tablets (640-1024px): Positioned from right
                  right: '1rem',
                  top: `${Math.max(buttonRect.bottom + 8, 80)}px`,
                  bottom: '2rem',
                  width: '380px',
                  maxWidth: 'calc(100vw - 2rem)',
                }
                : {
                  // Large screens (>= 1024px): Positioned relative to button
                  right: `${Math.max(window.innerWidth - buttonRect.right, 20)}px`,
                  top: `${Math.max(buttonRect.bottom + 8, 80)}px`,
                  bottom: '2rem',
                  width: '420px',
                })
          }}
        >
          <div
            ref={panelRef}
            className={`w-full h-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transform transition-all duration-150 ${open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"} transition-colors flex flex-col`}
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header - Fixed at top */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 transition-colors flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-50">
                  Notifications
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-[#f77f00] font-semibold">
                    {urgentCount}
                  </span>{" "}
                  urgent ·{" "}
                  <span className="font-semibold">
                    {unreadCount}
                  </span>{" "}
                  unread
                </div>
              </div>
              <div className="flex items-center gap-1 relative">
                {/* Filter dropdown */}
                <div className="relative">
                  <button
                    className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 transition-colors whitespace-nowrap flex items-center gap-1"
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                  >
                    {unreadOnly ? "Unread only" : "All"}
                    <span className="text-[10px]">▼</span>
                  </button>
                  {showFilterMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                        onClick={() => {
                          setUnreadOnly(false);
                          setShowFilterMenu(false);
                        }}
                      >
                        Show all
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                        onClick={() => {
                          setUnreadOnly(true);
                          setShowFilterMenu(false);
                        }}
                      >
                        Unread only
                      </button>
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                        onClick={() => {
                          markAllRead();
                          setShowFilterMenu(false);
                        }}
                      >
                        Mark all read
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={openSettings}
                  title="Notification settings"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors flex-shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {(["all", "proposal", "invite", "live", "earnings", "system"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors whitespace-nowrap ${activeTab === tab
                      ? "bg-[#f77f00] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Body - Scrollable accordion list */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                  No notifications for this view.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.slice(0, visibleCount).map((n) => (
                    <NotificationAccordionRow
                      key={n.id}
                      n={n}
                      expanded={expandedId === n.id}
                      onToggle={() => handleToggleExpand(n.id)}
                      onClose={onClose}
                      onToggleRead={(id) => {
                        const notif = allNotifs.find(n => n.id === id);
                        if (notif) {
                          notif.unread = !notif.unread;
                          // Force re-render
                          setExpandedId(null);
                          setTimeout(() => setExpandedId(id), 0);
                        }
                      }}
                      onChangePage={onChangePage}
                    />
                  ))}
                  {notifications.length > visibleCount && (
                    <button
                      className="w-full p-3 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                      onClick={() => setVisibleCount((prev) => prev + 5)}
                    >
                      Load more notifications
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center gap-2 text-xs transition-colors flex-shrink-0">
              <button
                className="px-4 py-2 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00] transition-colors whitespace-nowrap font-medium"
                onClick={() => {
                  onClose();
                  onChangePage?.("settings");
                  // Auto-scroll to notification preferences section
                  setTimeout(() => {
                    window.location.hash = 'notifications';
                  }, 100);
                }}
              >
                Notification Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone demo page (for testing)
export default function CreatorNotificationsPanelDemo() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const unreadCount = DEMO_NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      {/* Demo top bar */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 md:px-6 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[#f77f00] text-white font-bold text-sm flex items-center justify-center">
            LD
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">MyLiveDealz</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Creator · Shell</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            ref={btnRef}
            className="relative h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Notifications"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <span aria-hidden>🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-[#f77f00] text-white text-xs flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300" title="Avatar placeholder">
            RI
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 transition-colors">
          <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Demo page</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Click the bell icon to open the Notifications panel.
          </div>
        </div>
      </main>

      <NotificationsPanel open={open} onClose={() => setOpen(false)} buttonRef={btnRef} unreadCount={unreadCount} />
    </div>
  );
}

function NotificationAccordionRow({ n, expanded, onToggle, onToggleRead, onClose, onChangePage }: {
  n: Notification;
  expanded: boolean;
  onToggle: () => void;
  onToggleRead: (id: number) => void;
  onClose: () => void;
  onChangePage?: (page: PageId) => void;
}) {
  const icon = n.type === "proposal" ? "📄" : n.type === "live" ? "🎥" : n.type === "earnings" ? "💰" : n.type === "invite" ? "🤝" : "🛡️";
  const ring = n.priority === "high" ? "ring-[#f77f00]/40 dark:ring-[#f77f00]/60" : "ring-slate-200 dark:ring-slate-700";

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors">
      {/* Notification header - clickable */}
      <button
        className={`w-full text-left p-3 flex items-start gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${expanded ? "bg-slate-50 dark:bg-slate-800" : ""
          }`}
        onClick={onToggle}
        type="button"
      >
        <div className={`h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center ring-1 ${ring} transition-colors flex-shrink-0`}>
          <span aria-hidden>{icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50 line-clamp-1">{n.title}</div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {n.unread ? <span className="h-2 w-2 rounded-full bg-[#f77f00]" title="Unread" /> : null}
              <span className="text-xs text-slate-400 dark:text-slate-500">{n.time}</span>
              <span className="text-slate-400 dark:text-slate-500">{expanded ? "▲" : "▼"}</span>
            </div>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">{n.message}</div>
          <div className="mt-1 flex items-center gap-1 text-tiny">
            <span className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{n.meta.seller}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{n.type}</span>
            {n.priority === "high" ? (
              <span className="px-2 py-0.5 rounded-full bg-[#fff4e5] dark:bg-[#8a4b00]/20 border border-[#ffd19a] dark:border-[#8a4b00] text-[#8a4b00] dark:text-[#ffd19a]">Urgent</span>
            ) : null}
          </div>
        </div>
      </button>

      {/* Expandable details */}
      <div
        className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div className="px-3 pb-3 pt-1 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words whitespace-pre-wrap mb-3">
            {n.message}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 transition-colors">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Recommended action</div>
            <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50 mb-3">{n.cta}</div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <button
                className="px-4 py-2 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00] text-sm font-medium transition-colors flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(); // Close panel before navigating
                  // Navigate based on notification type
                  const pageMap: Record<string, PageId> = {
                    proposal: "proposals",
                    invite: "invites",
                    live: "live-studio",
                    earnings: "earnings",
                    system: "settings"
                  };
                  const targetPage = pageMap[n.type];

                  if (targetPage) {
                    onChangePage?.(targetPage);
                    console.log(`Open ${n.type} -> ${targetPage}`);
                  } else {
                    // Fallback or do nothing if page doesn't exist
                    console.log("No specific page for this notification type");
                  }
                }}
              >
                Open
              </button>
              <button
                className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 transition-colors flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRead(n.id);
                }}
              >
                {n.unread ? "Mark read" : "Mark unread"}
              </button>
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Tip: High-value items (proposals, payout events, live countdowns) should be prioritised.
          </div>
        </div>
      </div>
    </div >
  );
}



