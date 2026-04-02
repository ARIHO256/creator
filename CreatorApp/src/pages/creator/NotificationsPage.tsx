import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useNotification } from "../../contexts/NotificationContext";
import { creatorApi, type CreatorNotification } from "../../lib/creatorApi";
import { readAuthSession } from "../../lib/authSession";

// MyLiveDealz - Creator Notifications Panel
// Purpose: What the top-right notifications (bell) icon should bring.
// Pattern: Premium anchored panel (popover) with tabs + bulk actions.
// Primary accent: Orange #f77f00

import type { PageId } from "../../layouts/CreatorShellLayout";

type NotificationsPanelProps = {
  open: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  unreadCount?: number;
  onChangePage?: (page: PageId) => void;
};

type Tab = "all" | "proposal" | "invite" | "live" | "earnings" | "system";
type NotificationPriority = "high" | "normal" | "low";
type Notification = {
  id: string;
  type: Tab;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  priority: NotificationPriority;
  meta: { seller: string; campaign: string };
  cta: string;
};

function notificationTargetPage(type: Tab): PageId {
  const pageMap: Record<Tab, PageId> = {
    all: "settings",
    proposal: "proposals",
    invite: "invites",
    live: "live-studio",
    earnings: "earnings",
    system: "settings"
  };
  return pageMap[type] || "settings";
}

function notificationTargetPath(type: Tab): string {
  const page = notificationTargetPage(type);
  return `/${page}`;
}

function normalizePriority(priority: unknown): NotificationPriority {
  const normalized = String(priority || "").trim().toLowerCase();
  if (normalized === "high" || normalized === "urgent") return "high";
  if (normalized === "low") return "low";
  return "normal";
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Just now";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Just now";
  const diffMinutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function mapBackendNotification(notification: CreatorNotification): Notification {
  const metadata = notification.metadata || {};
  const priority =
    normalizePriority(
      metadata.priority ||
      (notification.type === "proposal" || notification.type === "live" ? "high" : "normal")
    );

  return {
    id: notification.id,
    type: (["proposal", "invite", "live", "earnings", "system"].includes(notification.type)
      ? notification.type
      : "system") as Tab,
    title: notification.title,
    message: notification.message,
    time: formatRelativeTime(notification.createdAt || notification.updatedAt),
    unread: !notification.read,
    priority,
    meta: {
      seller: notification.brand || "MyLiveDealz",
      campaign: notification.campaign || ""
    },
    cta:
      typeof metadata.cta === "string" && metadata.cta.trim()
        ? metadata.cta
        : notification.type === "proposal"
          ? "Review proposal"
          : notification.type === "invite"
            ? "Open invite"
            : notification.type === "live"
              ? "Open live studio"
              : notification.type === "earnings"
                ? "View earnings"
                : "Open settings"
  };
}

export function NotificationsPanel({ open, onClose, buttonRef, unreadCount: externalUnreadCount, onChangePage }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { showSuccess, showNotification } = useNotification();
  // const [selectedId, setSelectedId] = useState<number | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  // const [dnd, setDnd] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [allNotifs, setAllNotifs] = useState<Notification[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!open) return;
    if (!readAuthSession()) {
      setAllNotifs([]);
      setSyncError(null);
      return;
    }

    let cancelled = false;

    void creatorApi.notifications()
      .then((notifications) => {
        if (cancelled) return;
        setAllNotifs(notifications.map(mapBackendNotification));
        setSyncError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setSyncError("Using cached notifications while the backend is unavailable.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);



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

  const markAllRead = () => {
    setAllNotifs((current) => current.map((notification) => ({ ...notification, unread: false })));
    void creatorApi.markAllNotificationsRead().catch(() => {
      setSyncError("Failed to sync the read-all action.");
    });
    showSuccess("All notifications marked as read");
    setUnreadOnly(false);
    setActiveTab("all");
  };

  const openNotification = (notification: Notification) => {
    if (notification.unread) {
      setAllNotifs((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, unread: false } : item
        )
      );
      void creatorApi.markNotificationRead(notification.id).catch(() => {
        setSyncError("Failed to sync notification state.");
      });
      showNotification(`Marked “${notification.title}” as read`);
    }

    try {
      window.localStorage.setItem(
        "mldz:last-notification",
        JSON.stringify({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          time: Date.now()
        })
      );
    } catch {
      // Best effort only.
    }

    onClose();
    navigate(notificationTargetPath(notification.type));
  };

  const openSettings = () => {
    onClose();
    navigate("/settings");
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
              {syncError ? (
                <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">{syncError}</div>
              ) : null}
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
                      onOpen={() => openNotification(n)}
                      onToggleRead={(id) => {
                        const notif = allNotifs.find((notification) => notification.id === id);
                        if (!notif) return;

                        const nextUnread = !notif.unread;
                        setAllNotifs((current) =>
                          current.map((notification) =>
                            notification.id === id
                              ? { ...notification, unread: nextUnread }
                              : notification
                          )
                        );

                        const syncCall = nextUnread
                          ? creatorApi.markNotificationUnread(id)
                          : creatorApi.markNotificationRead(id);
                        void syncCall.catch(() => {
                          setSyncError("Failed to sync notification state.");
                        });
                      }}
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
                  navigate("/settings");
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
  const unreadCount = 0;

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

function NotificationAccordionRow({
  n,
  onOpen,
  onToggleRead
}: {
  n: Notification;
  onOpen: () => void;
  onToggleRead: (id: string) => void;
}) {
  const icon =
    n.type === "proposal"
      ? "📄"
      : n.type === "live"
        ? "🎥"
        : n.type === "earnings"
          ? "💰"
          : n.type === "invite"
            ? "🤝"
            : "🛡️";
  const ring =
    n.priority === "high"
      ? "ring-[#f77f00]/40 dark:ring-[#f77f00]/60"
      : "ring-slate-200 dark:ring-slate-700";
  const targetPage = notificationTargetPage(n.type);

  return (
    <div
      className="bg-white dark:bg-slate-900 transition-colors p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open notification: ${n.title}`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center ring-1 ${ring} transition-colors flex-shrink-0`}
        >
          <span aria-hidden>{icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50 line-clamp-1">
              {n.title}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {n.unread ? <span className="h-2 w-2 rounded-full bg-[#f77f00]" title="Unread" /> : null}
              <span className="text-xs text-slate-400 dark:text-slate-500">{n.time}</span>
              <span className="text-xs font-bold text-[#f77f00]">Open</span>
            </div>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">{n.message}</div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Opens <span className="font-semibold text-slate-700 dark:text-slate-200">{targetPage}</span> · {n.cta}
          </div>
          <div className="mt-1 flex items-center gap-1 text-tiny">
            <span className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              {n.meta.seller}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              {n.type}
            </span>
            {n.priority === "high" ? (
              <span className="px-2 py-0.5 rounded-full bg-[#fff4e5] dark:bg-[#8a4b00]/20 border border-[#ffd19a] dark:border-[#8a4b00] text-[#8a4b00] dark:text-[#ffd19a]">
                Urgent
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-2 ml-10 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
        <button
          className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00] text-xs font-medium transition-colors"
          onClick={onOpen}
        >
          Open now
        </button>
        <button
          className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 transition-colors"
          onClick={() => onToggleRead(n.id)}
        >
          {n.unread ? "Mark read" : "Mark unread"}
        </button>
      </div>
    </div>
  );
}
