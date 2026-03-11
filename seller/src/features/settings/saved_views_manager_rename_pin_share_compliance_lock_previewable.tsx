import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Filter,
  Info,
  Link2,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Saved Views Manager (Previewable)
 * Route: /settings/saved-views
 * Core: rename, pin, delete saved views
 * Super premium: share views with team, lock views for compliance
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function buildViews() {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "view_urgent_rfqs",
      name: "RFQs: Urgent + CorporatePay",
      route: "/wholesale/rfq?urgency=urgent&rail=corporatepay",
      group: "RFQs",
      pinned: true,
      note: "Quick access for urgent corporate buyers",
      createdAt: ago(24 * 60),
      updatedAt: ago(45),
      createdBy: { name: "Ronald", role: "Owner" },
      sharing: {
        enabled: true,
        access: "view",
        link: "https://evzone.app/v/urgent_rfqs",
        team: [
          { id: "u1", name: "Ops Lead", email: "ops@evzone.com", role: "Viewer" },
          { id: "u2", name: "Finance", email: "finance@evzone.com", role: "Viewer" },
        ],
      },
      lock: {
        enabled: false,
        reason: "",
        by: "",
        at: null,
      },
    },
    {
      id: "view_orders_watch",
      name: "Orders: Watch + SLA",
      route: "/orders?risk=watch&group=warehouse",
      group: "Orders",
      pinned: true,
      note: "Warehouse grouping and SLA watch",
      createdAt: ago(6 * 24 * 60),
      updatedAt: ago(120),
      createdBy: { name: "Ops", role: "Admin" },
      sharing: { enabled: false, access: "view", link: "", team: [] },
      lock: { enabled: false, reason: "", by: "", at: null },
    },
    {
      id: "view_listings_ready",
      name: "Listings: Ready to Publish",
      route: "/listings?status=draft&qualityMin=80&compliance=ok",
      group: "Listings",
      pinned: false,
      note: "High quality drafts only",
      createdAt: ago(10 * 24 * 60),
      updatedAt: ago(260),
      createdBy: { name: "Catalog", role: "Editor" },
      sharing: {
        enabled: true,
        access: "edit",
        link: "https://evzone.app/v/listings_ready",
        team: [{ id: "u3", name: "Catalog Team", email: "catalog@evzone.com", role: "Editor" }],
      },
      lock: {
        enabled: true,
        reason: "Compliance approved publishing checklist",
        by: "Compliance Desk",
        at: ago(320),
      },
    },
    {
      id: "view_finance_weekly",
      name: "Finance: Weekly Settlements",
      route: "/finance/wallets?range=7d",
      group: "Finance",
      pinned: false,
      note: "Weekly payouts review",
      createdAt: ago(20 * 24 * 60),
      updatedAt: ago(680),
      createdBy: { name: "Finance", role: "Admin" },
      sharing: { enabled: false, access: "view", link: "", team: [] },
      lock: { enabled: false, reason: "", by: "", at: null },
    },
  ];
}

function normalizeViews(list) {
  const safe = Array.isArray(list) ? list : [];
  return safe
    .map((v) => ({
      id: String(v.id || makeId("view")),
      name: String(v.name || "Untitled view"),
      route: String(v.route || "/"),
      group: String(v.group || "Other"),
      pinned: !!v.pinned,
      note: v.note ? String(v.note) : "",
      createdAt: v.createdAt || new Date().toISOString(),
      updatedAt: v.updatedAt || new Date().toISOString(),
      createdBy: v.createdBy || { name: "System", role: "System" },
      sharing: {
        enabled: !!v.sharing?.enabled,
        access: v.sharing?.access === "edit" ? "edit" : "view",
        link: v.sharing?.link ? String(v.sharing.link) : "",
        team: Array.isArray(v.sharing?.team)
          ? v.sharing.team.map((m) => ({
              id: String(m.id || makeId("m")),
              name: String(m.name || "Member"),
              email: String(m.email || "member@evzone.com"),
              role: m.role === "Editor" ? "Editor" : "Viewer",
            }))
          : [],
      },
      lock: {
        enabled: !!v.lock?.enabled,
        reason: v.lock?.reason ? String(v.lock.reason) : "",
        by: v.lock?.by ? String(v.lock.by) : "",
        at: v.lock?.at || null,
      },
    }))
    .slice(0, 200);
}

function Badge({ children, tone = "slate" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className }) {
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

function IconButton({
  label,
  onClick,
  disabled = false,
  tone = "light",
  children,
}: {
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  tone?: "light" | "dark";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        disabled && "cursor-not-allowed opacity-55",
        tone === "dark"
          ? "border-white/20 bg-white dark:bg-slate-900/10 text-white hover:bg-gray-50 dark:hover:bg-slate-800/15"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children, tone = "green" }) {
  const activeCls = tone === "orange" ? "border-orange-200 bg-orange-50 text-orange-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? activeCls : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
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
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
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

function Modal({ open, title, subtitle, tone = "default", onClose, children, footer }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[85] max-h-[90vh] w-[92vw] max-w-[640px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="border-b border-slate-200/70 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cx(
                      "grid h-11 w-11 place-items-center rounded-3xl",
                      tone === "danger" && "bg-rose-50 text-rose-700",
                      tone === "warning" && "bg-orange-50 text-orange-700",
                      tone === "success" && "bg-emerald-50 text-emerald-700",
                      tone === "default" && "bg-slate-100 text-slate-700"
                    )}
                  >
                    {tone === "danger" ? <AlertTriangle className="h-5 w-5" /> : tone === "warning" ? <Info className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">{children}</div>

              {footer ? <div className="border-t border-slate-200/70 bg-white dark:bg-slate-900/80 p-3 backdrop-blur">{footer}</div> : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Drawer({ open, title, subtitle, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[760px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/90 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Bookmark className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function roleTone(role) {
  return role === "Editor" ? "green" : "slate";
}

export default function SavedViewsManagerPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [views, setViews] = useState<any[]>([]);
  const hydratedRef = useRef(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const payload = await sellerBackendApi.getSavedViews();
        if (!active) return;
        setViews(normalizeViews(Array.isArray(payload.views) ? payload.views : []));
        hydratedRef.current = true;
      } catch {
        if (!active) return;
        pushToast({ title: "Saved views unavailable", message: "Could not load saved views.", tone: "warning" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydratedRef.current) return;
    void sellerBackendApi.patchSavedViews({ views });
  }, [views]);

  // Filters
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [onlyShared, setOnlyShared] = useState(false);
  const [onlyLocked, setOnlyLocked] = useState(false);
  const [sort, setSort] = useState("Pinned first");

  const groups = useMemo(() => {
    const set = new Set(views.map((v) => v.group));
    const base = ["All", ...Array.from(set)];
    base.sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)));
    return base;
  }, [views]);

  const stats = useMemo(() => {
    const total = views.length;
    const pinned = views.filter((v) => v.pinned).length;
    const shared = views.filter((v) => v.sharing?.enabled).length;
    const locked = views.filter((v) => v.lock?.enabled).length;
    return { total, pinned, shared, locked };
  }, [views]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = [...views];

    if (group !== "All") list = list.filter((v) => v.group === group);
    if (onlyPinned) list = list.filter((v) => v.pinned);
    if (onlyShared) list = list.filter((v) => v.sharing?.enabled);
    if (onlyLocked) list = list.filter((v) => v.lock?.enabled);

    if (q) {
      list = list.filter((v) => {
        const hay = [v.name, v.route, v.group, v.note || ""].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    const byUpdated = (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

    if (sort === "Pinned first") {
      list.sort((a, b) => {
        const ap = a.pinned ? 1 : 0;
        const bp = b.pinned ? 1 : 0;
        if (bp !== ap) return bp - ap;
        return byUpdated(a, b);
      });
    } else if (sort === "Updated") {
      list.sort(byUpdated);
    } else if (sort === "Name") {
      list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    } else if (sort === "Locked first") {
      list.sort((a, b) => {
        const al = a.lock?.enabled ? 1 : 0;
        const bl = b.lock?.enabled ? 1 : 0;
        if (bl !== al) return bl - al;
        return byUpdated(a, b);
      });
    }

    return list;
  }, [views, query, group, onlyPinned, onlyShared, onlyLocked, sort]);

  // Selection + bulk actions
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  useEffect(() => {
    // Drop selections that are no longer visible
    if (!selectedIds.length) return;
    const visible = new Set(filtered.map((v) => v.id));
    const next = { ...selected };
    let changed = false;
    for (const id of selectedIds) {
      if (!visible.has(id)) {
        delete next[id];
        changed = true;
      }
    }
    if (changed) setSelected(next);
  }, [filtered]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((v) => selected[v.id]);
  const toggleAll = () => {
    if (!filtered.length) return;
    if (allVisibleSelected) {
      const next = { ...selected };
      filtered.forEach((v) => delete next[v.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      filtered.forEach((v) => (next[v.id] = true));
      setSelected(next);
    }
  };

  // Active view for drawers/modals
  const [activeId, setActiveId] = useState<string | null>(() => views[0]?.id ?? null);
  useEffect(() => {
    if (!views.find((v) => v.id === activeId)) setActiveId(views[0]?.id || null);
  }, [views]);

  const active = useMemo(() => views.find((v) => v.id === activeId) || null, [views, activeId]);

  // Modals + drawer
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockReason, setLockReason] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({ name: "", route: "", group: "Orders", note: "" });

  const [shareOpen, setShareOpen] = useState(false);

  // Load drafts when modal opens
  useEffect(() => {
    if (!renameOpen) return;
    if (!active) return;
    setRenameDraft(active.name || "");
  }, [renameOpen, active?.id]);

  useEffect(() => {
    if (!lockOpen) return;
    if (!active) return;
    setLockReason(active.lock?.reason || "");
  }, [lockOpen, active?.id]);

  const updateView = (id, patch) => {
    setViews((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : v
      )
    );
  };

  const guardLocked = (v, actionLabel) => {
    if (!v?.lock?.enabled) return false;
    pushToast({
      title: "View is locked",
      message: `${actionLabel} is blocked until unlocked for compliance.`,
      tone: "warning",
      action: { label: "Open details", onClick: () => setShareOpen(true) },
    });
    return true;
  };

  const togglePin = (v) => {
    if (!v) return;
    if (guardLocked(v, "Pin")) return;
    updateView(v.id, { pinned: !v.pinned });
    pushToast({ title: v.pinned ? "Unpinned" : "Pinned", message: v.name, tone: "success" });
  };

  const doRename = () => {
    if (!active) return;
    if (guardLocked(active, "Rename")) return;
    const name = renameDraft.trim();
    if (!name) {
      pushToast({ title: "Name required", message: "Enter a view name.", tone: "warning" });
      return;
    }
    updateView(active.id, { name });
    setRenameOpen(false);
    pushToast({ title: "Renamed", message: name, tone: "success" });
  };

  const doDelete = () => {
    if (!active) return;
    if (guardLocked(active, "Delete")) return;

    const snapshot = views;
    setViews((s) => s.filter((x) => x.id !== active.id));
    setDeleteOpen(false);

    pushToast({
      title: "Deleted",
      message: active.name,
      tone: "default",
      action: {
        label: "Undo",
        onClick: () => {
          setViews(snapshot);
          pushToast({ title: "Restored", message: active.name, tone: "success" });
        },
      },
    });
  };

  const doToggleLock = () => {
    if (!active) return;

    if (active.lock?.enabled) {
      // Unlock
      updateView(active.id, { lock: { enabled: false, reason: active.lock?.reason || "", by: "", at: null } });
      setLockOpen(false);
      pushToast({ title: "Unlocked", message: active.name, tone: "success" });
      return;
    }

    const reason = lockReason.trim();
    if (!reason) {
      pushToast({ title: "Reason required", message: "Provide a compliance reason to lock this view.", tone: "warning" });
      return;
    }

    updateView(active.id, {
      lock: {
        enabled: true,
        reason,
        by: "Compliance Desk",
        at: new Date().toISOString(),
      },
    });

    setLockOpen(false);
    pushToast({ title: "Locked for compliance", message: active.name, tone: "success" });
  };

  const doCreate = () => {
    const name = createDraft.name.trim();
    const route = createDraft.route.trim();
    const grp = String(createDraft.group || "Other");

    if (!name || !route) {
      pushToast({ title: "Missing fields", message: "Add a name and route.", tone: "warning" });
      return;
    }

    const v = normalizeViews([
      {
        id: makeId("view"),
        name,
        route,
        group: grp,
        pinned: false,
        note: createDraft.note || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: { name: "You", role: "Editor" },
        sharing: { enabled: false, access: "view", link: "", team: [] },
        lock: { enabled: false, reason: "", by: "", at: null },
      },
    ])[0];

    setViews((s) => [v, ...s]);
    setActiveId(v.id);
    setCreateOpen(false);
    setCreateDraft({ name: "", route: "", group: "Orders", note: "" });
    pushToast({ title: "Saved view created", message: v.name, tone: "success" });
  };

  const bulk = {
    pin: () => {
      if (!selectedIds.length) return;
      const lockedCount = views.filter((v) => selectedIds.includes(v.id) && v.lock?.enabled).length;
      if (lockedCount) {
        pushToast({ title: "Some views are locked", message: `${lockedCount} locked view(s) were skipped.`, tone: "warning" });
      }
      setViews((prev) =>
        prev.map((v) => (selectedIds.includes(v.id) && !v.lock?.enabled ? { ...v, pinned: true, updatedAt: new Date().toISOString() } : v))
      );
      setSelected({});
      pushToast({ title: "Pinned", message: `${selectedIds.length} selected`, tone: "success" });
    },
    unpin: () => {
      if (!selectedIds.length) return;
      const lockedCount = views.filter((v) => selectedIds.includes(v.id) && v.lock?.enabled).length;
      if (lockedCount) {
        pushToast({ title: "Some views are locked", message: `${lockedCount} locked view(s) were skipped.`, tone: "warning" });
      }
      setViews((prev) =>
        prev.map((v) => (selectedIds.includes(v.id) && !v.lock?.enabled ? { ...v, pinned: false, updatedAt: new Date().toISOString() } : v))
      );
      setSelected({});
      pushToast({ title: "Unpinned", message: `${selectedIds.length} selected`, tone: "success" });
    },
    delete: () => {
      if (!selectedIds.length) return;
      const lockedCount = views.filter((v) => selectedIds.includes(v.id) && v.lock?.enabled).length;
      if (lockedCount) {
        pushToast({ title: "Blocked by lock", message: `${lockedCount} locked view(s) cannot be deleted.`, tone: "warning" });
      }
      const snapshot = views;
      setViews((prev) => prev.filter((v) => !(selectedIds.includes(v.id) && !v.lock?.enabled)));
      setSelected({});
      pushToast({
        title: "Deleted",
        message: `Removed ${selectedIds.length - lockedCount} view(s).`,
        tone: "default",
        action: {
          label: "Undo",
          onClick: () => {
            setViews(snapshot);
            pushToast({ title: "Restored", message: "Views restored.", tone: "success" });
          },
        },
      });
    },
  };

  // Share drawer helpers
  const sharing = active?.sharing || { enabled: false, access: "view", link: "", team: [] };
  const canEditShare = active && !active.lock?.enabled;

  const setSharing = (patch) => {
    if (!active) return;
    if (!canEditShare) {
      pushToast({ title: "Locked", message: "Unlock view to change sharing settings.", tone: "warning" });
      return;
    }

    const next = { ...sharing, ...patch };
    if (next.enabled && !next.link) next.link = `https://evzone.app/v/${active.id}`;
    updateView(active.id, { sharing: next });
  };

  const addMember = (email, role) => {
    if (!active) return;
    if (!canEditShare) {
      pushToast({ title: "Locked", message: "Unlock view to add members.", tone: "warning" });
      return;
    }

    const e = String(email || "").trim();
    if (!e || !e.includes("@")) {
      pushToast({ title: "Invalid email", message: "Enter a valid email.", tone: "warning" });
      return;
    }

    const exists = (sharing.team || []).some((m) => String(m.email).toLowerCase() === e.toLowerCase());
    if (exists) {
      pushToast({ title: "Already added", message: e, tone: "default" });
      return;
    }

    const m = { id: makeId("m"), name: e.split("@")[0], email: e, role: role === "Editor" ? "Editor" : "Viewer" };
    setSharing({ team: [m, ...(sharing.team || [])] });
    pushToast({ title: "Member added", message: e, tone: "success" });
  };

  const updateMember = (id, patch) => {
    if (!active) return;
    if (!canEditShare) {
      pushToast({ title: "Locked", message: "Unlock view to edit members.", tone: "warning" });
      return;
    }
    setSharing({ team: (sharing.team || []).map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  };

  const removeMember = (id) => {
    if (!active) return;
    if (!canEditShare) {
      pushToast({ title: "Locked", message: "Unlock view to remove members.", tone: "warning" });
      return;
    }
    setSharing({ team: (sharing.team || []).filter((m) => m.id !== id) });
  };

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  useEffect(() => {
    if (!shareOpen) {
      setInviteEmail("");
      setInviteRole("Viewer");
    }
  }, [shareOpen]);

  const bg =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Saved Views Manager</div>
                <Badge tone="slate">/settings/saved-views</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Rename, pin, delete, share with team, and lock for compliance.</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-400">Persisted in seller settings backend</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New view
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected({});
                  void sellerBackendApi
                    .getSavedViews()
                    .then((payload) => {
                      setViews(normalizeViews(Array.isArray(payload.views) ? payload.views : []));
                      pushToast({ title: "Reset", message: "Saved views reloaded from backend.", tone: "success" });
                    })
                    .catch(() => {
                      pushToast({ title: "Reset failed", message: "Could not reload saved views.", tone: "warning" });
                    });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshIcon />
                Reset demo
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 md:grid-cols-4">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Bookmark className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Total views</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.total}</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <PinIcon />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Pinned</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.pinned}</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Shared</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.shared}</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Locked</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.locked}</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <GlassCard className="p-4 lg:col-span-8">
            <div className="grid gap-2 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, route, group"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Group</div>
                  <div className="relative ml-auto">
                    <select
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {groups.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Sort</div>
                  <div className="relative ml-auto">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {[
                        "Pinned first",
                        "Updated",
                        "Name",
                        "Locked first",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Chip active={onlyPinned} onClick={() => setOnlyPinned((v) => !v)}>
                Pinned
              </Chip>
              <Chip active={onlyShared} onClick={() => setOnlyShared((v) => !v)} tone="orange">
                Shared
              </Chip>
              <Chip active={onlyLocked} onClick={() => setOnlyLocked((v) => !v)}>
                Locked
              </Chip>

              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setGroup("All");
                  setOnlyPinned(false);
                  setOnlyShared(false);
                  setOnlyLocked(false);
                  setSort("Pinned first");
                  setSelected({});
                  pushToast({ title: "Cleared", message: "Filters reset.", tone: "default" });
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Compliance rule</div>
              <span className="ml-auto"><Badge tone="slate">Policy</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              Locked views cannot be renamed, pinned/unpinned, deleted, or edited for sharing.
            </div>
            <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-orange-900">Super premium</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Share with team and lock views for compliance.</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Bulk bar */}
        <AnimatePresence>
          {selectedIds.length ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.16 }}
              className="mt-3"
            >
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800">
                    <Check className="h-4 w-4" />
                    {selectedIds.length} selected
                  </div>

                  <button
                    type="button"
                    onClick={bulk.pin}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <PinIcon />
                    Pin
                  </button>

                  <button
                    type="button"
                    onClick={bulk.unpin}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                  >
                    <PinIcon />
                    Unpin
                  </button>

                  <button
                    type="button"
                    onClick={bulk.delete}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelected({})}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Table */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Saved views</div>
                  <Badge tone="slate">{filtered.length} shown</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Select a view for actions and sharing</div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No saved views"
                  message="Try clearing filters or create a new view."
                  action={{ label: "New view", onClick: () => setCreateOpen(true) }}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={toggleAll}
                        className={cx(
                          "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                          allVisibleSelected ? "border-emerald-200" : "border-slate-200/70"
                        )}
                        aria-label="Select all"
                      >
                        {allVisibleSelected ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-4">Route</div>
                    <div className="col-span-2">Badges</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>

                  <div className="divide-y divide-slate-200/70">
                    {filtered.map((v) => {
                      const isActive = v.id === activeId;
                      const locked = !!v.lock?.enabled;
                      const shared = !!v.sharing?.enabled;
                      const checked = !!selected[v.id];

                      return (
                        <div
                          key={v.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setActiveId(v.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setActiveId(v.id);
                          }}
                          className={cx(
                            "grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold transition",
                            isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="col-span-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected((s) => ({ ...s, [v.id]: !checked }));
                              }}
                              className={cx(
                                "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                                checked ? "border-emerald-200" : "border-slate-200/70"
                              )}
                              aria-label={checked ? "Unselect" : "Select"}
                            >
                              {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                            </button>
                          </div>

                          <div className="col-span-4 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-black text-slate-900">{v.name}</div>
                              {v.pinned ? <Badge tone="green">Pinned</Badge> : null}
                              {locked ? <Badge tone="orange">Locked</Badge> : null}
                              {shared ? <Badge tone="slate">Shared</Badge> : null}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <Badge tone="slate">{v.group}</Badge>
                              {v.note ? <span className="truncate">{v.note}</span> : <span className="text-slate-400">No note</span>}
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-400">Updated {fmtTime(v.updatedAt)}</div>
                          </div>

                          <div className="col-span-4 min-w-0">
                            <div className="truncate font-extrabold text-slate-800">{v.route}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  safeCopy(v.route);
                                  pushToast({ title: "Copied", message: "Route copied.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                                Copy
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  pushToast({ title: "Navigate", message: "Wire to router: open route in app shell.", tone: "default" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                              >
                                <ChevronRight className="h-4 w-4" />
                                Open
                              </button>
                            </div>
                          </div>

                          <div className="col-span-2 flex flex-wrap items-center gap-2">
                            <Badge tone="slate">Owner: {v.createdBy?.name || "System"}</Badge>
                            {v.sharing?.enabled ? <Badge tone="orange">{v.sharing.access === "edit" ? "Team edit" : "Team view"}</Badge> : <Badge tone="slate">Private</Badge>}
                          </div>

                          <div className="col-span-1 flex items-center justify-end gap-2">
                            <IconButton
                              label={v.pinned ? "Unpin" : "Pin"}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(v);
                              }}
                              disabled={locked}
                            >
                              <PinIcon className={cx("h-4 w-4", v.pinned ? "text-emerald-700" : "text-slate-700")} />
                            </IconButton>

                            <IconButton
                              label="Rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveId(v.id);
                                if (guardLocked(v, "Rename")) return;
                                setRenameOpen(true);
                              }}
                              disabled={locked}
                            >
                              <Pencil className="h-4 w-4" />
                            </IconButton>

                            <IconButton
                              label="Share"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveId(v.id);
                                setShareOpen(true);
                              }}
                            >
                              <Users className="h-4 w-4" />
                            </IconButton>

                            <IconButton
                              label={locked ? "Unlock" : "Lock"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveId(v.id);
                                setLockOpen(true);
                              }}
                            >
                              {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </IconButton>

                            <IconButton
                              label="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveId(v.id);
                                if (guardLocked(v, "Delete")) return;
                                setDeleteOpen(true);
                              }}
                              disabled={locked}
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Right panel */}
          <div className="lg:col-span-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Selected view</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Open sharing and compliance actions</div>
                </div>
                <Badge tone="slate">Settings</Badge>
              </div>

              {!active ? (
                <div className="mt-4">
                  <EmptyState title="Select a view" message="Click a row to see details." />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <Bookmark className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-900">{active.name}</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-500">{active.group} · Updated {fmtTime(active.updatedAt)}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {active.pinned ? <Badge tone="green">Pinned</Badge> : <Badge tone="slate">Not pinned</Badge>}
                          {active.sharing?.enabled ? <Badge tone="orange">Shared</Badge> : <Badge tone="slate">Private</Badge>}
                          {active.lock?.enabled ? <Badge tone="orange">Locked</Badge> : <Badge tone="green">Editable</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => togglePin(active)}
                        disabled={!!active.lock?.enabled}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white",
                          active.lock?.enabled && "cursor-not-allowed opacity-60"
                        )}
                        style={{ background: TOKENS.green }}
                      >
                        <PinIcon />
                        {active.pinned ? "Unpin" : "Pin"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (guardLocked(active, "Rename")) return;
                          setRenameOpen(true);
                        }}
                        disabled={!!active.lock?.enabled}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800",
                          active.lock?.enabled && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <Pencil className="h-4 w-4" />
                        Rename
                      </button>

                      <button
                        type="button"
                        onClick={() => setShareOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Users className="h-4 w-4" />
                        Share
                      </button>

                      <button
                        type="button"
                        onClick={() => setLockOpen(true)}
                        className={cx(
                          "ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white",
                          active.lock?.enabled ? "" : ""
                        )}
                        style={{ background: active.lock?.enabled ? TOKENS.orange : TOKENS.black }}
                      >
                        {active.lock?.enabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {active.lock?.enabled ? "Unlock" : "Lock"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Compliance lock</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">Lock a view when it must stay unchanged for audits.</div>
                        {active.lock?.enabled ? (
                          <div className="mt-2 text-xs font-semibold text-orange-900/80">
                            Locked by <span className="font-extrabold">{active.lock.by || "Compliance"}</span> · {fmtTime(active.lock.at)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        title="Create saved view"
        subtitle="Add a name and route. Group helps organize views in Command Palette."
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={doCreate}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              Save
            </button>
          </div>
        }
      >
        <div className="grid gap-3">
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Name</div>
            <input
              value={createDraft.name}
              onChange={(e) => setCreateDraft((s) => ({ ...s, name: e.target.value }))}
              placeholder='Example: "Orders: Watch + SLA"'
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
            />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Route</div>
            <input
              value={createDraft.route}
              onChange={(e) => setCreateDraft((s) => ({ ...s, route: e.target.value }))}
              placeholder="/orders?status=New"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-extrabold text-slate-600">Group</div>
              <div className="relative mt-2">
                <select
                  value={createDraft.group}
                  onChange={(e) => setCreateDraft((s) => ({ ...s, group: e.target.value }))}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {[
                    "Orders",
                    "Listings",
                    "RFQs",
                    "Quotes",
                    "Ops",
                    "Finance",
                    "Settings",
                    "Other",
                  ].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-extrabold text-slate-600">Note (optional)</div>
              <input
                value={createDraft.note}
                onChange={(e) => setCreateDraft((s) => ({ ...s, note: e.target.value }))}
                placeholder="Short description"
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Tip</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Use query params to represent filters. Example: /orders?status=Packed&warehouse=Kampala</div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal
        open={renameOpen}
        title="Rename saved view"
        subtitle={active ? `Selected: ${active.name}` : ""}
        onClose={() => setRenameOpen(false)}
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRenameOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={doRename}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        }
      >
        <div>
          <div className="text-[11px] font-extrabold text-slate-600">New name</div>
          <input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
            placeholder="Type a new name"
          />
          <div className="mt-2 text-xs font-semibold text-slate-500">Names appear in command palette and team sharing.</div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={deleteOpen}
        title="Delete saved view"
        subtitle={active ? `This cannot be undone (unless you use Undo).` : ""}
        tone="danger"
        onClose={() => setDeleteOpen(false)}
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={doDelete}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: "#E11D48" }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        }
      >
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-rose-900">Confirm deletion</div>
              <div className="mt-1 text-xs font-semibold text-rose-900/70">
                {active ? <span>Delete <span className="font-extrabold">{active.name}</span>?</span> : "Select a view first."}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Lock modal */}
      <Modal
        open={lockOpen}
        title={active?.lock?.enabled ? "Unlock view" : "Lock view for compliance"}
        subtitle={active ? `Selected: ${active.name}` : ""}
        tone={active?.lock?.enabled ? "default" : "warning"}
        onClose={() => setLockOpen(false)}
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLockOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={doToggleLock}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: active?.lock?.enabled ? TOKENS.green : TOKENS.orange }}
            >
              {active?.lock?.enabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {active?.lock?.enabled ? "Unlock" : "Lock"}
            </button>
          </div>
        }
      >
        {!active ? (
          <div className="text-sm font-semibold text-slate-600">Select a view first.</div>
        ) : active.lock?.enabled ? (
          <div className="grid gap-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Currently locked</div>
                <span className="ml-auto"><Badge tone="orange">Locked</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-600">Reason: {active.lock.reason || "-"}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Locked by {active.lock.by || "Compliance"} · {fmtTime(active.lock.at)}</div>
            </div>
            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="text-sm font-black text-orange-900">Unlock warning</div>
              <div className="mt-1 text-xs font-semibold text-orange-900/70">Unlocking allows renaming, deleting, and sharing changes.</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div>
              <div className="text-[11px] font-extrabold text-slate-600">Compliance reason</div>
              <textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                rows={4}
                placeholder="Example: Approved by compliance. Used in monthly audit review."
                className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">What lock does</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                    <li>Blocks rename, pin/unpin, delete</li>
                    <li>Blocks sharing changes (team access and members)</li>
                    <li>Preserves the view configuration for audits</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Share drawer */}
      <Drawer
        open={shareOpen}
        title={active ? `Share settings · ${active.name}` : "Share settings"}
        subtitle={active ? `${active.group} · ${active.route}` : "Select a view"}
        onClose={() => setShareOpen(false)}
      >
        {!active ? (
          <EmptyState title="Select a view" message="Close this drawer, then select a view from the table." />
        ) : (
          <div className="space-y-3">
            <div className={cx("rounded-3xl border p-4", active.lock?.enabled ? "border-orange-200 bg-orange-50/70" : "border-slate-200/70 bg-white dark:bg-slate-900/70")}>
              <div className="flex items-start gap-3">
                <div className={cx("grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900", active.lock?.enabled ? "text-orange-700" : "text-slate-700")}>
                  {active.lock?.enabled ? <Lock className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cx("text-sm font-black", active.lock?.enabled ? "text-orange-900" : "text-slate-900")}>
                    {active.lock?.enabled ? "Locked view" : "Team sharing"}
                  </div>
                  <div className={cx("mt-1 text-xs font-semibold", active.lock?.enabled ? "text-orange-900/70" : "text-slate-500")}>
                    {active.lock?.enabled
                      ? "Sharing changes are blocked until unlocked."
                      : "Share this view with your team and control access."}
                  </div>
                </div>
                <Badge tone={active.lock?.enabled ? "orange" : "slate"}>{active.lock?.enabled ? "Locked" : "Super premium"}</Badge>
              </div>
            </div>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Sharing</div>
                <span className="ml-auto"><Badge tone={sharing.enabled ? "orange" : "slate"}>{sharing.enabled ? "Enabled" : "Disabled"}</Badge></span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="text-[11px] font-extrabold text-slate-600">Shared with team</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSharing({ enabled: !sharing.enabled })}
                      className={cx(
                        "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                        sharing.enabled ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                      )}
                      disabled={!canEditShare}
                    >
                      {sharing.enabled ? "On" : "Off"}
                    </button>
                    <div className="ml-auto text-[11px] font-semibold text-slate-500">
                      {sharing.enabled ? "Visible to team" : "Private"}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">Locks prevent changing this.</div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="text-[11px] font-extrabold text-slate-600">Access level</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative w-full">
                      <select
                        value={sharing.access}
                        onChange={(e) => setSharing({ access: e.target.value === "edit" ? "edit" : "view" })}
                        className={cx(
                          "h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800",
                          !canEditShare && "opacity-60"
                        )}
                        disabled={!canEditShare}
                      >
                        <option value="view">View only</option>
                        <option value="edit">Edit</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">Edit allows team to update sharing members (demo).</div>
                </div>
              </div>

              <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Share link</div>
                  <span className="ml-auto"><Badge tone="slate">Copy</Badge></span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={sharing.link || (sharing.enabled ? `https://evzone.app/v/${active.id}` : "")}
                    readOnly
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 px-3 text-sm font-semibold text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const link = sharing.link || (sharing.enabled ? `https://evzone.app/v/${active.id}` : "");
                      safeCopy(link);
                      pushToast({ title: "Copied", message: "Share link copied.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <div className="mt-2 text-[11px] font-semibold text-slate-500">Wire this link to view presets and permissions in backend.</div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Team access</div>
                <span className="ml-auto"><Badge tone="slate">{(sharing.team || []).length} member(s)</Badge></span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Add members who can see this view when sharing is enabled.</div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="text-[11px] font-extrabold text-slate-600">Invite by email</div>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@company.com"
                    className={cx(
                      "mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300",
                      !canEditShare && "opacity-60"
                    )}
                    disabled={!canEditShare}
                  />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Role</div>
                  <div className="relative mt-2">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className={cx(
                        "h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800",
                        !canEditShare && "opacity-60"
                      )}
                      disabled={!canEditShare}
                    >
                      <option value="Viewer">Viewer</option>
                      <option value="Editor">Editor</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!sharing.enabled) {
                      pushToast({ title: "Enable sharing", message: "Turn on sharing first.", tone: "warning" });
                      return;
                    }
                    addMember(inviteEmail, inviteRole);
                    setInviteEmail("");
                    setInviteRole("Viewer");
                  }}
                  disabled={!canEditShare}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                    !canEditShare && "cursor-not-allowed opacity-60"
                  )}
                  style={{ background: TOKENS.green }}
                >
                  <Plus className="h-4 w-4" />
                  Add member
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInviteEmail("");
                    setInviteRole("Viewer");
                    pushToast({ title: "Cleared", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>

                <div className="ml-auto text-[11px] font-semibold text-slate-500">
                  {active.lock?.enabled ? "Locked" : "Editable"}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-5">Member</div>
                  <div className="col-span-4">Email</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-1 text-right">Remove</div>
                </div>
                <div className="divide-y divide-slate-200/70">
                  {(sharing.team || []).map((m) => (
                    <div key={m.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                      <div className="col-span-5 min-w-0">
                        <div className="truncate text-sm font-black text-slate-900">{m.name}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Team member</div>
                      </div>
                      <div className="col-span-4 min-w-0 flex items-center">
                        <div className="truncate">{m.email}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="relative">
                          <select
                            value={m.role}
                            onChange={(e) => updateMember(m.id, { role: e.target.value === "Editor" ? "Editor" : "Viewer" })}
                            className={cx(
                              "h-10 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800",
                              !canEditShare && "opacity-60"
                            )}
                            disabled={!canEditShare}
                          >
                            <option value="Viewer">Viewer</option>
                            <option value="Editor">Editor</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center justify-end">
                        <IconButton
                          label="Remove"
                          onClick={() => removeMember(m.id)}
                          disabled={!canEditShare}
                        >
                          <Trash2 className="h-4 w-4 text-rose-700" />
                        </IconButton>
                      </div>
                    </div>
                  ))}

                  {(sharing.team || []).length === 0 ? (
                    <div className="p-4">
                      <div className="text-xs font-semibold text-slate-500">No members added yet.</div>
                    </div>
                  ) : null}
                </div>
              </div>

              {sharing.enabled ? (
                <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Info className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Super premium note</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">In production, share changes should be audited and permissioned by role.</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Compliance controls</div>
                <span className="ml-auto"><Badge tone={active.lock?.enabled ? "orange" : "green"}>{active.lock?.enabled ? "Locked" : "Unlocked"}</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Lock views that must not change. Unlock to edit.</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLockOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: active.lock?.enabled ? TOKENS.orange : TOKENS.black }}
                >
                  {active.lock?.enabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {active.lock?.enabled ? "Unlock view" : "Lock view"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(JSON.stringify(active, null, 2));
                    pushToast({ title: "Copied", message: "View JSON copied.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy JSON
                </button>
              </div>

              {active.lock?.enabled ? (
                <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="text-sm font-black text-orange-900">Lock reason</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">{active.lock.reason || "-"}</div>
                  <div className="mt-2 text-[11px] font-semibold text-orange-900/70">By {active.lock.by || "Compliance"} · {fmtTime(active.lock.at)}</div>
                </div>
              ) : null}
            </GlassCard>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function RefreshIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2l8 8-2.5 2.5-3-3L10 16l3 3L10.5 21.5 2.5 13.5 5 11l3 3 6.5-6.5-3-3L14 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
