import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useNotification } from "../../contexts/NotificationContext";
import type { NotificationRecord } from "../../api/types";
import type { PageId } from "../../layouts/CreatorShellLayout";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery
} from "../../hooks/api/useNotifications";

type NotificationsPanelProps = {
  open: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  unreadCount?: number;
  onChangePage?: (page: PageId) => void;
};

const PAGE_IDS: PageId[] = [
  "home",
  "onboarding",
  "awaiting-approval",
  "profile-public",
  "shell",
  "opportunities",
  "live-schedule",
  "live-studio",
  "reviews",
  "live-history",
  "sellers",
  "my-sellers",
  "invites",
  "creator-campaigns",
  "proposals",
  "proposal-room",
  "contracts",
  "task-board",
  "asset-library",
  "content-submission",
  "earnings",
  "analytics",
  "settings",
  "subscription",
  "AdzDashboard",
  "AdzManager",
  "AdzMarketplace",
  "link-tools",
  "link-tool",
  "link-editor",
  "request-payout",
  "payout-history",
  "payout-methods",
  "roles",
  "roles-permissions",
  "crew-manager",
  "dealz-marketplace",
  "live-dashboard-2",
  "audience-notification",
  "live-alert",
  "overlays-ctas",
  "post-live",
  "stream-platform",
  "safety-moderation",
  "audit-log",
  "promo-ad-detail"
];

function resolveNotificationTarget(notification: NotificationRecord): string {
  if (notification.link) return notification.link;

  switch (notification.type) {
    case "proposal":
      return "/proposals";
    case "contract":
    case "invite":
      return "/contracts";
    case "live":
      return "/live-dashboard-2";
    case "earnings":
      return "/earnings";
    default:
      return "/notifications";
  }
}

function routeToPageId(route: string): PageId | null {
  const cleaned = route.replace(/^\//, "").split("?")[0];
  if (cleaned === "Crew-manager") return "crew-manager";
  if (cleaned === "Stream-platform") return "stream-platform";
  if ((PAGE_IDS as string[]).includes(cleaned)) {
    return cleaned as PageId;
  }
  return null;
}

function formatCreatedAt(notification: NotificationRecord): string {
  const source = notification.createdAt || notification.time;
  if (!source) return "Just now";
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return String(source);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function NotificationTone({ notification }: { notification: NotificationRecord }) {
  const toneClass =
    notification.read !== true
      ? "bg-[#f77f00]/10 text-[#f77f00]"
      : notification.type === "earnings"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}>{notification.type}</span>;
}

function NotificationList({
  notifications,
  onOpen,
  emptyMessage
}: {
  notifications: NotificationRecord[];
  onOpen: (notification: NotificationRecord) => Promise<void> | void;
  emptyMessage: string;
}) {
  if (!notifications.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          type="button"
          onClick={() => void onOpen(notification)}
          className="flex w-full flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#f77f00] hover:bg-amber-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
        >
          <div className="flex w-full flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{notification.title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{notification.message}</p>
            </div>
            <NotificationTone notification={notification} />
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-400">
            <span>{notification.brand || notification.campaign || formatCreatedAt(notification)}</span>
            <span>{formatCreatedAt(notification)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function useNotificationActions(onChangePage?: (page: PageId) => void) {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllMutation = useMarkAllNotificationsReadMutation();

  const openNotification = async (notification: NotificationRecord) => {
    try {
      if (!notification.read) {
        await markReadMutation.mutateAsync(notification.id);
      }
      const target = resolveNotificationTarget(notification);
      const pageId = routeToPageId(target);
      if (pageId && onChangePage) {
        onChangePage(pageId);
      } else {
        navigate(target);
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not open this notification.");
    }
  };

  const markAllRead = async () => {
    try {
      const result = await markAllMutation.mutateAsync(undefined);
      if (result.updated > 0) {
        showSuccess("All notifications marked as read.");
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not mark notifications as read.");
    }
  };

  return { openNotification, markAllRead, isPending: markAllMutation.isPending || markReadMutation.isPending };
}

export function NotificationsPanel({ open, onClose, buttonRef, unreadCount: externalUnreadCount, onChangePage }: NotificationsPanelProps) {
  const notificationsQuery = useNotificationsQuery({ enabled: open, staleTime: 10_000 });
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { openNotification, markAllRead, isPending } = useNotificationActions(onChangePage);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open || !buttonRef?.current) {
      setButtonRect(null);
      return;
    }

    const updateRect = () => setButtonRect(buttonRef.current?.getBoundingClientRect() ?? null);
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [buttonRef, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef?.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [buttonRef, onClose, open]);

  const notifications = useMemo(() => {
    const items = notificationsQuery.data ?? [];
    return showUnreadOnly ? items.filter((item) => !item.read) : items;
  }, [notificationsQuery.data, showUnreadOnly]);

  const unread = externalUnreadCount ?? (notificationsQuery.data ?? []).filter((item) => !item.read).length;

  if (!open || !buttonRect) {
    return null;
  }

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: buttonRect.bottom + 12,
    right: Math.max(16, window.innerWidth - buttonRect.right),
    width: Math.min(420, window.innerWidth - 24),
    maxHeight: "70vh"
  };

  return (
    <div ref={panelRef} style={panelStyle} className="z-[1000] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{unread} unread</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUnreadOnly((value) => !value)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200"
          >
            {showUnreadOnly ? "Show all" : "Unread only"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => void markAllRead()}
            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Mark all read
          </button>
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-4">
        <NotificationList notifications={notifications.slice(0, 8)} onOpen={openNotification} emptyMessage="No notifications yet." />
      </div>
    </div>
  );
}

function NotificationsPage() {
  const notificationsQuery = useNotificationsQuery();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { openNotification, markAllRead, isPending } = useNotificationActions();

  const notifications = useMemo(() => {
    const items = notificationsQuery.data ?? [];
    return showUnreadOnly ? items.filter((item) => !item.read) : items;
  }, [notificationsQuery.data, showUnreadOnly]);

  const unreadCount = (notificationsQuery.data ?? []).filter((item) => !item.read).length;

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader
        pageTitle="Notifications"
        mobileViewType="inline-right"
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUnreadOnly((value) => !value)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-100"
            >
              {showUnreadOnly ? "Show all" : "Unread only"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void markAllRead()}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Mark all read
            </button>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-3 py-6 sm:px-4 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Backend-driven notification center</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">You have {unreadCount} unread workflow updates.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
            Proposal threads, live reminders, payout updates, and system notices now come directly from the backend notification stream.
          </p>
        </section>

        <NotificationList notifications={notifications} onOpen={openNotification} emptyMessage="You are all caught up." />
      </main>
    </div>
  );
}

export default NotificationsPage;
