import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Bookmark,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Link2,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRolePageContent } from "../../data/pageContent";
import type { NotifCategory, NotifItem, NotifPriority, Watch } from "../../data/pageTypes";

/**
 * SupplierHub Notifications Page (Premium)
 * Route: /notifications
 * Core: full list, filters, bulk actions, deep links
 * Super premium: watch subscriptions, notification rule shortcuts
 */

type NavigateFn = (to: string) => void;

type RuleShortcut = {
  id: string;
  label: string;
  desc: string;
  apply: (set: {
    setOnlyUnread: (v: boolean) => void;
    setCat: (v: NotifCategory | "All") => void;
    setPriority: (v: NotifPriority | "All") => void;
    setQuery: (v: string) => void;
  }) => void;
};

type Toast = {
  id: string;
  tone?: "default" | "success" | "warning" | "danger";
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
};

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "orange" | "slate" | "danger" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "slate" && "bg-slate-100 text-slate-700",
        tone === "danger" && "bg-rose-50 text-rose-700"
      )}
    >
      {children}
    </span>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 text-slate-800 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function ToastCenter({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cx(
              "rounded-3xl border bg-white dark:bg-slate-900/95 p-4 shadow-[0_24px_80px_rgba(2,16,23,0.18)] backdrop-blur",
              t.tone === "success" && "border-emerald-200",
              t.tone === "warning" && "border-orange-200",
              t.tone === "danger" && "border-rose-200",
              (!t.tone || t.tone === "default") && "border-slate-200/70"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  t.tone === "success" && "bg-emerald-50 text-emerald-700",
                  t.tone === "warning" && "bg-orange-50 text-orange-700",
                  t.tone === "danger" && "bg-rose-50 text-rose-700",
                  (!t.tone || t.tone === "default") && "bg-slate-100 text-slate-700"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div> : null}
                {t.action ? (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                  >
                    {t.action.label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[92vw] max-w-[460px] border-l border-slate-200/70 bg-white dark:bg-slate-900/90 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <IconBtn label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function categoryTone(c: NotifCategory) {
  if (c === "Finance") return "green";
  if (c === "Security") return "danger";
  if (c === "MyLiveDealz") return "orange";
  return "slate";
}

function priorityTone(p: NotifPriority) {
  if (p === "high") return "danger";
  if (p === "medium") return "orange";
  return "slate";
}

export default function NotificationsPage({ onNavigate }: { onNavigate?: NavigateFn }) {
  const { role, content, updateContent } = useRolePageContent("notifications");

  const mapRoleRoute = (to: string) => {
    if (role !== "provider") return to;
    if (!to.startsWith("/")) return to;
    if (to.startsWith("/provider")) return to;

    const [path, query = ""] = to.split("?");
    const suffix = query ? `?${query}` : "";

    if (path.startsWith("/orders")) return `/provider/orders${suffix}`;
    if (path.startsWith("/listings")) {
      const sharedListingRoutes = [
        "/listings/wizard",
        "/listings/form-preview",
        "/listings/taxonomy",
        "/listings/new",
      ];
      if (sharedListingRoutes.some((p) => path.startsWith(p))) return `${path}${suffix}`;
      if (path === "/listings") return `/provider/listings${suffix}`;
      const rest = path.slice("/listings/".length);
      if (
        !rest ||
        rest.startsWith("new") ||
        rest.startsWith("bulk") ||
        rest.startsWith("AwaitingApproval")
      ) {
        return `/provider/listings${suffix}`;
      }
      return `/provider/listings/${rest}${suffix}`;
    }
    if (path.startsWith("/inventory")) return `/provider/inventory${suffix}`;
    if (path.startsWith("/ops/disputes") || path.startsWith("/ops/returns"))
      return `/provider/disputes${suffix}`;
    if (path.startsWith("/ops")) return `/provider/service-command${suffix}`;
    if (path.startsWith("/finance") || path.startsWith("/wallet")) return `/provider/quotes${suffix}`;
    if (path.startsWith("/wholesale")) return `/provider/quotes${suffix}`;
    if (path.startsWith("/expressmart")) return `/provider/bookings${suffix}`;

    return `${path}${suffix}`;
  };

  const rawNavigate: NavigateFn =
    onNavigate ??
    ((to: string) => {
      const cleaned = to.startsWith("/") ? to : `/${to}`;
      window.location.hash = cleaned;
    });

  const navigate: NavigateFn = (to) => rawNavigate(mapRoleRoute(to));

  const [items, setItems] = useState<NotifItem[]>(content.items);
  const [watches, setWatches] = useState<Watch[]>(content.watches);
  const setItemsPersist = (updater: ((prev: NotifItem[]) => NotifItem[]) | NotifItem[]) => {
    setItems((prev) => {
      const next = typeof updater === "function" ? (updater as (prev: NotifItem[]) => NotifItem[])(prev) : updater;
      updateContent((current) => ({ ...current, items: next }));
      return next;
    });
  };
  const setWatchesPersist = (updater: ((prev: Watch[]) => Watch[]) | Watch[]) => {
    setWatches((prev) => {
      const next = typeof updater === "function" ? (updater as (prev: Watch[]) => Watch[])(prev) : updater;
      updateContent((current) => ({ ...current, watches: next }));
      return next;
    });
  };

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<NotifCategory | "All">("All");
  const [priority, setPriority] = useState<NotifPriority | "All">("All");
  const [onlyUnread, setOnlyUnread] = useState(false);
  useEffect(() => {
    setItems(content.items);
    setWatches(content.watches);
    setCat("All");
    setPriority("All");
    setOnlyUnread(false);
  }, [content]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const [detail, setDetail] = useState<NotifItem | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((n) => (cat === "All" ? true : n.category === cat))
      .filter((n) => (priority === "All" ? true : n.priority === priority))
      .filter((n) => (onlyUnread ? n.unread : true))
      .filter((n) => {
        if (!q) return true;
        const hay = [n.title, n.message, n.category, n.priority, n.actor ?? ""].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        // unread first
        if (a.unread !== b.unread) return a.unread ? -1 : 1;
        // priority high first
        const rank = (p: NotifPriority) => (p === "high" ? 0 : p === "medium" ? 1 : 2);
        if (rank(a.priority) !== rank(b.priority)) return rank(a.priority) - rank(b.priority);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [items, query, cat, priority, onlyUnread]);

  const toggleAll = () => {
    const allSelected = filtered.length > 0 && filtered.every((n) => selected[n.id]);
    if (allSelected) {
      const next = { ...selected };
      filtered.forEach((n) => delete next[n.id]);
      setSelected(next);
      return;
    }
    const next = { ...selected };
    filtered.forEach((n) => (next[n.id] = true));
    setSelected(next);
  };

  const markSelected = (unread: boolean) => {
    if (!selectedIds.length) return;
    setItemsPersist((s) => s.map((n) => (selectedIds.includes(n.id) ? { ...n, unread } : n)));
    pushToast({
      title: unread ? "Marked as unread" : "Marked as read",
      message: `${selectedIds.length} updated.`,
      tone: unread ? "warning" : "success",
    });
    setSelected({});
  };

  const archiveSelected = () => {
    if (!selectedIds.length) return;
    const prev = items;
    setItemsPersist((s) => s.filter((n) => !selectedIds.includes(n.id)));
    pushToast({
      title: "Archived",
      message: `${selectedIds.length} removed from this view.`,
      tone: "default",
      action: { label: "Undo", onClick: () => setItemsPersist(prev) },
    });
    setSelected({});
  };

  const markAllRead = () => {
    setItemsPersist((s) => s.map((n) => ({ ...n, unread: false })));
    pushToast({ title: "All caught up", message: "All notifications marked as read.", tone: "success" });
  };

  const shortcuts: RuleShortcut[] = useMemo(
    () => [
      {
        id: "r1",
        label: "SLA risk",
        desc: "Show urgent system alerts and unread only.",
        apply: ({ setOnlyUnread, setCat, setPriority, setQuery }) => {
          setOnlyUnread(true);
          setCat("System");
          setPriority("high");
          setQuery("sla");
        },
      },
      {
        id: "r2",
        label: "Security focus",
        desc: "Filter to high-priority security items.",
        apply: ({ setOnlyUnread, setCat, setPriority, setQuery }) => {
          setOnlyUnread(false);
          setCat("Security");
          setPriority("high");
          setQuery("");
        },
      },
      {
        id: "r3",
        label: "Finance watch",
        desc: "Show finance updates only.",
        apply: ({ setOnlyUnread, setCat, setPriority, setQuery }) => {
          setOnlyUnread(false);
          setCat("Finance");
          setPriority("All");
          setQuery("");
        },
      },
      {
        id: "r4",
        label: "MyLiveDealz",
        desc: "Show MyLiveDealz activity and deep links.",
        apply: ({ setOnlyUnread, setCat, setPriority, setQuery }) => {
          setOnlyUnread(false);
          setCat("MyLiveDealz");
          setPriority("All");
          setQuery("");
        },
      },
    ],
    []
  );

  const unreadCount = useMemo(() => items.filter((i) => i.unread).length, [items]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Notifications</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Filters, bulk actions, deep links, subscriptions and rule shortcuts</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800">
              <Bell className="h-4 w-4" />
              Unread {unreadCount}
            </span>
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: list */}
        <div className="lg:col-span-8">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search notifications"
                      className="h-11 w-[68vw] max-w-[520px] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOnlyUnread((v) => !v)}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold",
                      onlyUnread ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-800"
                    )}
                  >
                    <Filter className="h-4 w-4" />
                    {onlyUnread ? "Unread" : "All"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value as NotifCategory | "All")}
                    className="h-9 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 text-xs font-extrabold text-slate-800"
                  >
                    <option value="All">All categories</option>
                    {content.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as NotifPriority | "All")}
                    className="h-9 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 text-xs font-extrabold text-slate-800"
                  >
                    <option value="All">All priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCat("All");
                      setPriority("All");
                      setOnlyUnread(false);
                      pushToast({ title: "Filters cleared", tone: "default" });
                    }}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>

              {/* bulk actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Check className="h-4 w-4" />
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => markSelected(false)}
                  disabled={!selectedIds.length}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition",
                    selectedIds.length ? "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:bg-slate-950" : "cursor-not-allowed border-slate-100 text-slate-400"
                  )}
                >
                  <CheckCheck className="h-4 w-4" />
                  Read
                </button>
                <button
                  type="button"
                  onClick={() => markSelected(true)}
                  disabled={!selectedIds.length}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition",
                    selectedIds.length ? "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:bg-slate-950" : "cursor-not-allowed border-slate-100 text-slate-400"
                  )}
                >
                  <Bell className="h-4 w-4" />
                  Unread
                </button>
                <button
                  type="button"
                  onClick={archiveSelected}
                  disabled={!selectedIds.length}
                  className={cx(
                    "ml-auto inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition",
                    selectedIds.length ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "cursor-not-allowed border-slate-100 text-slate-400"
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  Archive
                </button>
              </div>

              {/* premium shortcuts */}
              <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-700" />
                  <div className="text-xs font-extrabold text-slate-800">Rule shortcuts</div>
                  <span className="ml-auto"><Badge tone="green">Premium</Badge></span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {shortcuts.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        r.apply({ setOnlyUnread, setCat, setPriority, setQuery });
                        pushToast({ title: "Shortcut applied", message: r.label, tone: "success" });
                      }}
                      className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
                    >
                      {r.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPrefsOpen(true)}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Settings className="h-4 w-4" />
                    Preferences
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {filtered.map((n) => {
                const checked = !!selected[n.id];
                return (
                  <div key={n.id} className={cx("p-4", n.unread ? "bg-orange-50/30" : "bg-white dark:bg-slate-900/40")}>
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setSelected((s) => ({ ...s, [n.id]: !checked }))}
                        className={cx(
                          "grid h-10 w-10 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                          checked ? "border-emerald-200" : "border-slate-200/70"
                        )}
                        aria-label={checked ? "Unselect" : "Select"}
                      >
                        {checked ? <Check className="h-5 w-5 text-emerald-700" /> : <span className="h-5 w-5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetail(n)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{n.title}</div>
                          {n.unread ? <Badge tone="orange">Unread</Badge> : <Badge tone="slate">Read</Badge>}
                          <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(n.createdAt)}</span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-600 line-clamp-2">{n.message}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone={categoryTone(n.category)}>{n.category}</Badge>
                          <Badge tone={priorityTone(n.priority)}>{n.priority}</Badge>
                          {n.actor ? <span className="text-[11px] font-extrabold text-slate-400">{n.actor}</span> : null}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setItemsPersist((s) => s.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <CheckCheck className="h-4 w-4" />
                        Read
                      </button>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <Bell className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">No notifications</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Try changing filters or turning off unread-only.</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </GlassCard>
        </div>

        {/* Right: subscriptions */}
        <div className="lg:col-span-4">
          <div className="space-y-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Watch subscriptions</div>
                <span className="ml-auto"><Badge tone="green">Premium</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Control what you receive. Subscriptions can be shared across team roles.</div>

              <div className="mt-4 space-y-2">
                {watches.map((w) => (
                  <div key={w.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", w.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-extrabold text-slate-900">{w.name}</div>
                          <Badge tone={categoryTone(w.category)}>{w.category}</Badge>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{w.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWatchesPersist((s) => s.map((x) => (x.id === w.id ? { ...x, enabled: !x.enabled } : x)));
                          pushToast({ title: w.enabled ? "Watch paused" : "Watch enabled", message: w.name, tone: "default" });
                        }}
                        className={cx(
                          "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                          w.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                        )}
                      >
                        {w.enabled ? "On" : "Off"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const payload = { watches, exportedAt: new Date().toISOString() };
                  downloadText("watch_subscriptions.json", JSON.stringify(payload, null, 2));
                  pushToast({ title: "Exported", message: "Subscriptions downloaded as JSON.", tone: "success" });
                }}
                className="mt-4 inline-flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-700" />
                  Export subscriptions
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Deep link integrity</div>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Each notification includes a route that can open the relevant page or drawer.</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="green">Routes mapped</Badge>
                <Badge tone="slate">Bulk actions logged</Badge>
                <Badge tone="orange">SLA aware</Badge>
              </div>
              <button
                type="button"
                onClick={() => navigate("/status-center")}
                className="mt-4 inline-flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  Open Status Center
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={!!detail}
        title={detail ? detail.title : "Notification"}
        subtitle={detail ? `${detail.category} · ${detail.priority} · ${fmtTime(detail.createdAt)}` : undefined}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="text-xs font-extrabold text-slate-600">Message</div>
              <div className="mt-2 text-sm font-semibold text-slate-800">{detail.message}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={categoryTone(detail.category)}>{detail.category}</Badge>
                <Badge tone={priorityTone(detail.priority)}>{detail.priority}</Badge>
                {detail.unread ? <Badge tone="orange">Unread</Badge> : <Badge tone="slate">Read</Badge>}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-extrabold text-slate-900">Deep link</div>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Open the relevant page from this notification.</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setItemsPersist((s) => s.map((x) => (x.id === detail.id ? { ...x, unread: false } : x)));
                    if (detail.route) navigate(detail.route);
                    setDetail(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  Open
                  <ChevronRight className="h-4 w-4" />
                </button>
                {detail.route ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(detail.route || "").catch(() => undefined);
                      pushToast({ title: "Route copied", message: detail.route, tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    Copy route
                    <ChevronDown className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setItemsPersist((s) => s.map((x) => (x.id === detail.id ? { ...x, unread: !x.unread } : x)));
                pushToast({ title: "Updated", message: "Read state changed.", tone: "success" });
              }}
              className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <span className="flex items-center gap-3">
                <CheckCheck className="h-4 w-4 text-slate-700" />
                Toggle read or unread
              </span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </div>
        ) : null}
      </Drawer>

      {/* Preferences drawer */}
      <Drawer
        open={prefsOpen}
        title="Notification preferences"
        subtitle="Shortcuts to rules and deep links"
        onClose={() => setPrefsOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-extrabold text-slate-900">Shortcuts</div>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Open the full preferences page from Settings later.</div>
            <button
              type="button"
              onClick={() => {
                setPrefsOpen(false);
                navigate("/settings/notification-preferences");
              }}
              className="mt-3 inline-flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
            >
              <span>Open Notification Preferences</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-extrabold text-slate-900">Evidence export</div>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Export your current notification state for audits.</div>
            <button
              type="button"
              onClick={() => {
                downloadText("notifications_export.json", JSON.stringify({ items, exportedAt: new Date().toISOString() }, null, 2));
                pushToast({ title: "Exported", message: "Notifications downloaded.", tone: "success" });
              }}
              className="mt-3 inline-flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
            >
              <span>Download notifications</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
