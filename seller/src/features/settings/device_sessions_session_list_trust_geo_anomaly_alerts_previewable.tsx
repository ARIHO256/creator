import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Filter,
  LogOut,
  MapPin,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Device Sessions (Previewable)
 * Route: /settings/security/sessions
 * Core: session list, revoke, device trust
 * Super premium: geo anomaly alerts
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default" | "info";
type Toast = {
  id: string;
  tone?: ToastTone;
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
};
type SessionRisk = "ok" | "watch" | "risk";
type SessionAnomaly = { type: string; reason: string; severity: "High" | "Medium" | "Low" };
type DeviceType = "desktop" | "mobile";
type Session = {
  id: string;
  deviceType: DeviceType;
  deviceName: string;
  os: string;
  browser: string;
  ip: string;
  location: string;
  firstSeenAt: string;
  lastSeenAt: string;
  current: boolean;
  trusted: boolean;
  risk: SessionRisk;
  anomaly?: SessionAnomaly;
  signals: string[];
};
type FilterKey = "All" | "Current" | "Trusted" | "Untrusted" | "Flagged";
type ConfirmMode = "revoke" | "trust" | "untrust";
type SelectedMap = Record<string, boolean>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  return mins;
}

function timeAgoLabel(iso: string) {
  const mins = minutesAgo(iso);
  if (mins === null) return "";
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "green" | "orange" | "danger" | "slate";
}) {
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

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
  children,
  danger,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white dark:bg-slate-900/85 transition",
        danger
          ? "border-rose-200 text-rose-700 hover:bg-rose-50"
          : "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
  tone = "green",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "green" | "orange";
}) {
  const activeCls =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

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

function Toggle({
  on,
  setOn,
  label,
  hint,
  tone = "green",
}: {
  on: boolean;
  setOn: (next: boolean) => void;
  label: string;
  hint?: string;
  tone?: "green" | "orange";
}) {
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className={cx(
        "flex w-full items-start gap-3 rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
        on
          ? tone === "orange"
            ? "border-orange-200"
            : "border-emerald-200"
          : "border-slate-200/70"
      )}
    >
      <span
        className={cx(
          "mt-0.5 inline-flex h-6 w-10 items-center rounded-full border p-0.5",
          on
            ? tone === "orange"
              ? "border-orange-200 bg-orange-50"
              : "border-emerald-200 bg-emerald-50"
            : "border-slate-200/70 bg-white dark:bg-slate-900"
        )}
      >
        <span
          className={cx(
            "h-5 w-5 rounded-full transition",
            on
              ? tone === "orange"
                ? "translate-x-4 bg-orange-500"
                : "translate-x-4 bg-emerald-500"
              : "translate-x-0 bg-slate-300"
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-900">{label}</div>
        {hint ? <div className="mt-1 text-xs font-semibold text-slate-500">{hint}</div> : null}
      </span>
      <Badge tone={on ? (tone === "orange" ? "orange" : "green") : "slate"}>{on ? "On" : "Off"}</Badge>
    </button>
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

function Modal({ open, title, children, onClose }) {
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
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[85] max-h-[90vh] w-[92vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 p-4">
                <div>
                  <div className="text-sm font-black text-slate-900">{title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Sensitive actions require confirmation.</div>
                </div>
                <IconButton label="Close" onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function ToastCenter({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[95] flex w-[92vw] max-w-[420px] flex-col gap-2">
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

function riskTone(risk: SessionRisk) {
  if (risk === "risk") return "danger";
  if (risk === "watch") return "orange";
  return "green";
}

function riskLabel(risk: SessionRisk) {
  if (risk === "risk") return "High";
  if (risk === "watch") return "Watch";
  return "OK";
}

function buildSessions(): Session[] {
  const now = Date.now();
  const agoM = (m: number) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "SES-90021",
      deviceType: "desktop",
      deviceName: "MacBook Pro",
      os: "macOS",
      browser: "Chrome",
      ip: "41.210.9.12",
      location: "Kampala, UG",
      firstSeenAt: agoM(1200),
      lastSeenAt: agoM(2),
      current: true,
      trusted: true,
      risk: "ok",
      signals: ["2FA pending"],
    },
    {
      id: "SES-90020",
      deviceType: "mobile",
      deviceName: "iPhone 15",
      os: "iOS",
      browser: "Safari",
      ip: "10.11.2.33",
      location: "Wuxi, CN",
      firstSeenAt: agoM(210),
      lastSeenAt: agoM(12),
      current: false,
      trusted: false,
      risk: "risk",
      anomaly: {
        type: "New country",
        reason: "Sign-in from a new country not seen before.",
        severity: "High",
      },
      signals: ["New country", "New device"],
    },
    {
      id: "SES-90019",
      deviceType: "desktop",
      deviceName: "Windows PC",
      os: "Windows",
      browser: "Edge",
      ip: "197.239.12.9",
      location: "Nairobi, KE",
      firstSeenAt: agoM(8400),
      lastSeenAt: agoM(900),
      current: false,
      trusted: true,
      risk: "ok",
      signals: ["Trusted"],
    },
    {
      id: "SES-90018",
      deviceType: "mobile",
      deviceName: "Android",
      os: "Android",
      browser: "Chrome",
      ip: "102.88.44.21",
      location: "Lagos, NG",
      firstSeenAt: agoM(90),
      lastSeenAt: agoM(18),
      current: false,
      trusted: false,
      risk: "watch",
      anomaly: {
        type: "Impossible travel",
        reason: "Sign-in location changed too quickly based on recent activity.",
        severity: "Medium",
      },
      signals: ["Impossible travel"],
    },
    {
      id: "SES-90017",
      deviceType: "desktop",
      deviceName: "Linux Laptop",
      os: "Linux",
      browser: "Firefox",
      ip: "84.17.56.88",
      location: "Berlin, DE",
      firstSeenAt: agoM(32000),
      lastSeenAt: agoM(14800),
      current: false,
      trusted: false,
      risk: "ok",
      signals: ["Old session"],
    },
  ];
}

function deviceIcon(type: DeviceType) {
  return type === "mobile" ? Smartphone : Monitor;
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: "green" | "orange" | "danger" | "slate";
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "danger" && "bg-rose-50 text-rose-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function DeviceSessionsPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) =>
    setToasts((s) => s.filter((x) => x.id !== id));

  const [sessions, setSessions] = useState<Session[]>([]);
  const hydratedRef = useRef(false);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("All"); // All | Current | Trusted | Untrusted | Flagged

  const [selected, setSelected] = useState<SelectedMap>({});
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...sessions];

    if (filter === "Current") list = list.filter((s) => s.current);
    if (filter === "Trusted") list = list.filter((s) => s.trusted);
    if (filter === "Untrusted") list = list.filter((s) => !s.trusted);
    if (filter === "Flagged") list = list.filter((s) => s.risk !== "ok" || s.anomaly);

    if (q) {
      list = list.filter((s) => {
        const hay = [s.id, s.deviceName, s.os, s.browser, s.ip, s.location, (s.signals || []).join(" ")].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    // Sort: current first, then newest lastSeen
    list.sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    });

    return list;
  }, [sessions, query, filter]);

  const FILTER_OPTIONS: Array<{ k: FilterKey; t: string }> = [
    { k: "All", t: "All" },
    { k: "Current", t: "Current" },
    { k: "Trusted", t: "Trusted" },
    { k: "Untrusted", t: "Untrusted" },
    { k: "Flagged", t: "Flagged" },
  ];

  const counts = useMemo(() => {
    const total = sessions.length;
    const trusted = sessions.filter((s) => s.trusted).length;
    const flagged = sessions.filter((s) => s.risk !== "ok" || s.anomaly).length;
    const current = sessions.filter((s) => s.current).length;
    return { total, trusted, flagged, current };
  }, [sessions]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((s) => selected[s.id]);
  const toggleAllVisible = () => {
    if (!filtered.length) return;
    const next = { ...selected };
    if (allVisibleSelected) {
      filtered.forEach((s) => delete next[s.id]);
    } else {
      filtered.forEach((s) => (next[s.id] = true));
    }
    setSelected(next);
  };

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => sessions.find((s) => s.id === activeId) || null, [sessions, activeId]);

  const openDetails = (id: string) => {
    setActiveId(id);
    setDetailsOpen(true);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[]>([]);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>("revoke");

  const askConfirm = (mode: ConfirmMode, ids: string[]) => {
    setConfirmMode(mode);
    setConfirmIds(ids);
    setConfirmOpen(true);
  };

  const applyTrust = (ids: string[], v: boolean) => {
    if (!ids.length) return;
    setSessions((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, trusted: v } : s)));
    pushToast({
      title: v ? "Device trusted" : "Trust removed",
      message: `${ids.length} session(s) updated.`,
      tone: "success",
    });
  };

  const revokeSessions = (ids: string[]) => {
    if (!ids.length) return;
    const currentIds = new Set(sessions.filter((s) => s.current).map((s) => s.id));
    const denied = ids.filter((id) => currentIds.has(id));
    const allowed = ids.filter((id) => !currentIds.has(id));

    if (denied.length) {
      pushToast({ title: "Current session protected", message: "You cannot revoke the session you are using.", tone: "warning" });
    }

    if (!allowed.length) return;

    setSessions((prev) => prev.filter((s) => !allowed.includes(s.id)));
    setSelected((prev) => {
      const next = { ...prev };
      allowed.forEach((id) => delete next[id]);
      return next;
    });

    if (activeId && allowed.includes(activeId)) {
      setDetailsOpen(false);
      setActiveId(null);
    }

    pushToast({ title: "Session revoked", message: `${allowed.length} session(s) ended.`, tone: "success" });
  };

  // Super premium: geo anomaly alert rules
  const [geoAlertsOn, setGeoAlertsOn] = useState(true);
  const [alertNewCountry, setAlertNewCountry] = useState(true);
  const [alertImpossibleTravel, setAlertImpossibleTravel] = useState(true);
  const [sensitivity, setSensitivity] = useState(70); // 0-100
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const payload = await sellerBackendApi.getSecuritySettings();
        if (!active) return;
        const metadata = (payload.metadata as Record<string, unknown> | undefined) ?? {};
        setSessions(Array.isArray(metadata.sessionRoster) ? metadata.sessionRoster as Session[] : []);
        const geo = (metadata.geoAlerts as Record<string, unknown> | undefined) ?? {};
        setGeoAlertsOn(Boolean(geo.enabled ?? true));
        setAlertNewCountry(Boolean(geo.newCountry ?? true));
        setAlertImpossibleTravel(Boolean(geo.impossibleTravel ?? true));
        setSensitivity(Number(geo.sensitivity ?? 70));
        hydratedRef.current = true;
      } catch {
        if (!active) return;
        pushToast({ title: "Sessions unavailable", message: "Could not load device sessions.", tone: "warning" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydratedRef.current) return;
    void sellerBackendApi.patchSecuritySettings({
      metadata: {
        sessionRoster: sessions,
        geoAlerts: {
          enabled: geoAlertsOn,
          newCountry: alertNewCountry,
          impossibleTravel: alertImpossibleTravel,
          sensitivity,
        },
      },
    });
  }, [sessions, geoAlertsOn, alertNewCountry, alertImpossibleTravel, sensitivity]);

  const anomalies = useMemo(() => {
    if (!geoAlertsOn) return [];
    return sessions
      .filter((s) => !!s.anomaly)
      .filter((s) => {
        if (s.anomaly?.type === "New country" && !alertNewCountry) return false;
        if (s.anomaly?.type === "Impossible travel" && !alertImpossibleTravel) return false;
        // Fake sensitivity: hide medium alerts when sensitivity is low
        if ((s.anomaly?.severity || "").toLowerCase() === "medium" && sensitivity < 50) return false;
        return true;
      })
      .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  }, [sessions, geoAlertsOn, alertNewCountry, alertImpossibleTravel, sensitivity]);

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
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Device Sessions</div>
                <Badge tone="slate">/settings/security/sessions</Badge>
                <Badge tone="slate">Security</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Review active sessions, trust devices, revoke access and monitor geo anomalies.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest session signals loaded (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => askConfirm("revoke", sessions.filter((s) => !s.current).map((s) => s.id))}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <LogOut className="h-4 w-4" />
                End all other sessions
              </button>
            </div>
          </div>

          {/* KPI */}
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Kpi icon={ShieldCheck} label="Total sessions" value={counts.total} />
            <Kpi icon={Sparkles} label="Current sessions" value={counts.current} tone="green" />
            <Kpi icon={ShieldCheck} label="Trusted" value={counts.trusted} tone={counts.trusted ? "green" : "slate"} />
            <Kpi icon={AlertTriangle} label="Geo alerts" value={anomalies.length} tone={anomalies.length ? "orange" : "slate"} />
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-3 lg:grid-cols-12">
          <GlassCard className="p-4 lg:col-span-8">
            <div className="grid gap-2 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search device, location, IP, session ID"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-6 flex flex-wrap gap-2">
                {FILTER_OPTIONS.map((x) => (
                  <Chip
                    key={x.k}
                    active={filter === x.k}
                    onClick={() => setFilter(x.k)}
                    tone={x.k === "Flagged" ? "orange" : "green"}
                  >
                    {x.t}
                  </Chip>
                ))}
                <span className="ml-auto inline-flex items-center gap-2">
                  <Badge tone="slate">{filtered.length} shown</Badge>
                </span>
              </div>
            </div>

            {/* Bulk actions */}
            <AnimatePresence initial={false}>
              {selectedIds.length ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.16 }}
                  className="mt-3 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800">
                      <Check className="h-4 w-4" />
                      {selectedIds.length} selected
                    </div>

                    <button
                      type="button"
                      onClick={() => applyTrust(selectedIds, true)}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Trust
                    </button>

                    <button
                      type="button"
                      onClick={() => applyTrust(selectedIds, false)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Untrust
                    </button>

                    <button
                      type="button"
                      onClick={() => askConfirm("revoke", selectedIds)}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-rose-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Revoke
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelected({})}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Geo anomaly rules</div>
              <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
            </div>
            <div className="mt-3 space-y-2">
              <Toggle
                on={geoAlertsOn}
                setOn={setGeoAlertsOn}
                label="Geo anomaly alerts"
                hint="Detect unusual sign-ins and notify admins."
                tone="orange"
              />
              <Toggle
                on={alertNewCountry}
                setOn={setAlertNewCountry}
                label="Alert on new country"
                hint="Triggers when a new country appears for this account."
                tone="orange"
              />
              <Toggle
                on={alertImpossibleTravel}
                setOn={setAlertImpossibleTravel}
                label="Alert on impossible travel"
                hint="Triggers when locations change too quickly."
                tone="orange"
              />
            </div>

            <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Sensitivity</div>
                <span className="ml-auto"><Badge tone="slate">{sensitivity}</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Higher values show more alerts.</div>
              <input
                type="range"
                min={0}
                max={100}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="mt-3 w-full"
              />
            </div>
          </GlassCard>
        </div>

        {/* Main */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Sessions */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Active sessions</div>
                  <Badge tone="slate">{filtered.length}</Badge>
                </div>
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <Check className="h-4 w-4" />
                  {allVisibleSelected ? "Unselect all" : "Select all"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-1">Sel</div>
                  <div className="col-span-4">Device</div>
                  <div className="col-span-3">Location</div>
                  <div className="col-span-2">Last seen</div>
                  <div className="col-span-1">Trust</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((s) => {
                    const DevIcon = deviceIcon(s.deviceType);
                    const checked = !!selected[s.id];
                    const tone = riskTone(s.risk);

                    return (
                      <div
                        key={s.id}
                        className={cx(
                          "grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700",
                          (s.risk !== "ok" || s.anomaly) && "bg-orange-50/25"
                        )}
                      >
                        <div className="col-span-1 flex items-center">
                          <button
                            type="button"
                            onClick={() => setSelected((m) => ({ ...m, [s.id]: !checked }))}
                            className={cx(
                              "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                              checked ? "border-emerald-200" : "border-slate-200/70"
                            )}
                            aria-label={checked ? "Unselect" : "Select"}
                          >
                            {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => openDetails(s.id)}
                          className="col-span-4 flex items-center gap-3 rounded-2xl text-left"
                        >
                          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                            <DevIcon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-black text-slate-900">{s.deviceName}</span>
                              {s.current ? <Badge tone="green">Current</Badge> : null}
                              {s.anomaly ? <Badge tone="orange">Alert</Badge> : null}
                              <Badge tone={tone}>{riskLabel(s.risk)}</Badge>
                            </span>
                            <span className="mt-1 block truncate text-[11px] font-semibold text-slate-500">
                              {s.os} · {s.browser} · {s.id}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </button>

                        <div className="col-span-3 flex items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              <div className="truncate text-sm font-extrabold text-slate-900">{s.location}</div>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <span className="truncate">IP {s.ip}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  safeCopy(s.ip);
                                  pushToast({ title: "Copied", message: "IP address copied.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-extrabold text-slate-800"
                                aria-label="Copy IP"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <div>
                            <div className="text-sm font-extrabold text-slate-900">{fmtTime(s.lastSeenAt)}</div>
                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{timeAgoLabel(s.lastSeenAt)}</div>
                          </div>
                        </div>

                        <div className="col-span-1 flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (s.current) {
                                pushToast({ title: "Already trusted", message: "This is your current session.", tone: "default" });
                                return;
                              }
                              applyTrust([s.id], !s.trusted);
                            }}
                            className={cx(
                              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-extrabold",
                              s.trusted
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                            )}
                            title="Toggle trusted device"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {s.trusted ? "Trusted" : "Trust"}
                          </button>
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <IconButton
                            label="Revoke session"
                            danger
                            onClick={() => askConfirm("revoke", [s.id])}
                          >
                            <LogOut className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                        <div className="flex items-start gap-3">
                          <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                            <Filter className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-lg font-black text-slate-900">No sessions found</div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or adjusting the search.</div>
                            <button
                              type="button"
                              onClick={() => {
                                setQuery("");
                                setFilter("All");
                                setSelected({});
                                pushToast({ title: "Filters cleared", tone: "default" });
                              }}
                              className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Check className="h-4 w-4" />
                              Clear filters
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Geo alerts panel */}
          <GlassCard className="p-5 lg:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Geo anomaly alerts</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Review and resolve suspicious activity.</div>
              </div>
              <Badge tone="orange">Super premium</Badge>
            </div>

            <div className="mt-4 space-y-2">
              {!geoAlertsOn ? (
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-sm font-semibold text-slate-600">
                  Geo alerts are disabled.
                </div>
              ) : anomalies.length === 0 ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-emerald-900">No anomalies detected</div>
                      <div className="mt-1 text-xs font-semibold text-emerald-900/70">Session geography looks normal based on your rules.</div>
                    </div>
                  </div>
                </div>
              ) : (
                anomalies.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openDetails(s.id)}
                    className={cx(
                      "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                      s.anomaly?.severity === "High" ? "border-rose-200" : "border-orange-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cx(
                          "grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900",
                          s.anomaly?.severity === "High" ? "text-rose-700" : "text-orange-700"
                        )}
                      >
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{s.anomaly?.type}</div>
                          <Badge tone={s.anomaly?.severity === "High" ? "danger" : "orange"}>{s.anomaly?.severity}</Badge>
                          <span className="ml-auto text-[10px] font-extrabold text-slate-400">{timeAgoLabel(s.lastSeenAt)}</span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-600">{s.location} · {s.ip}</div>
                        <div
                          className="mt-2 text-xs font-semibold text-slate-500"
                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                        >
                          {s.anomaly?.reason}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge tone="slate">{s.deviceName}</Badge>
                          <span className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-800">
                            Review
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Recommended actions</div>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                <li>Trust devices you recognize to reduce false positives.</li>
                <li>Revoke unknown sessions and rotate your password.</li>
                <li>Enable 2FA for payouts and contract approvals.</li>
              </ul>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Details Drawer */}
      <Drawer
        open={detailsOpen}
        title={active ? `Session · ${active.id}` : "Session"}
        subtitle={active ? `${active.deviceName} · ${active.location} · Last seen ${fmtTime(active.lastSeenAt)}` : ""}
        onClose={() => setDetailsOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a session.</div>
        ) : (
          <div className="space-y-3">
            <div className={cx("rounded-3xl border p-4", active.anomaly ? "border-orange-200 bg-orange-50/70" : "border-slate-200/70 bg-white dark:bg-slate-900/70")}>
              <div className="flex items-start gap-3">
                <div className={cx("grid h-12 w-12 place-items-center rounded-3xl bg-white dark:bg-slate-900", active.anomaly ? "text-orange-700" : "text-slate-700")}>
                  {active.anomaly ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{active.deviceName}</div>
                    {active.current ? <Badge tone="green">Current</Badge> : null}
                    <Badge tone={active.trusted ? "green" : "slate"}>{active.trusted ? "Trusted" : "Untrusted"}</Badge>
                    <Badge tone={riskTone(active.risk)}>{riskLabel(active.risk)}</Badge>
                    {active.anomaly ? <Badge tone="orange">{active.anomaly.type}</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{active.os} · {active.browser}</div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="text-[11px] font-extrabold text-slate-600">Location</div>
                      <div className="mt-1 text-sm font-black text-slate-900">{active.location}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">IP {active.ip}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(active.ip);
                            pushToast({ title: "Copied", message: "IP copied.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy IP
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(active.id);
                            pushToast({ title: "Copied", message: "Session ID copied.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy ID
                        </button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="text-[11px] font-extrabold text-slate-600">Activity</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs font-extrabold text-slate-600">First seen</div>
                        <div className="text-xs font-semibold text-slate-800">{fmtTime(active.firstSeenAt)}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs font-extrabold text-slate-600">Last seen</div>
                        <div className="text-xs font-semibold text-slate-800">{fmtTime(active.lastSeenAt)}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(active.signals || []).map((sig) => (
                          <Badge key={sig} tone={sig.toLowerCase().includes("2fa") ? "orange" : "slate"}>{sig}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {active.anomaly ? (
                    <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-700" />
                        <div className="text-sm font-black text-orange-900">Geo anomaly</div>
                        <span className="ml-auto"><Badge tone={active.anomaly.severity === "High" ? "danger" : "orange"}>{active.anomaly.severity}</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-orange-900/80">{active.anomaly.reason}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            applyTrust([active.id], true);
                            pushToast({ title: "Marked trusted", message: "This device will be treated as safe.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Trust device
                        </button>
                        <button
                          type="button"
                          onClick={() => askConfirm("revoke", [active.id])}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-rose-700"
                        >
                          <LogOut className="h-4 w-4" />
                          Revoke session
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Quick actions</div>
                <span className="ml-auto"><Badge tone="slate">Safe</Badge></span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTrust([active.id], !active.trusted)}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold",
                    active.trusted ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                  )}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {active.trusted ? "Remove trust" : "Trust device"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    safeCopy(JSON.stringify(active, null, 2));
                    pushToast({ title: "Copied", message: "Session JSON copied.", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy JSON
                </button>

                <button
                  type="button"
                  onClick={() => askConfirm("revoke", [active.id])}
                  className={cx(
                    "ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                    active.current && "opacity-70"
                  )}
                  style={{ background: TOKENS.orange }}
                >
                  <LogOut className="h-4 w-4" />
                  Revoke
                </button>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-500">Revoke ends the session immediately. Current session is protected.</div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Confirm */}
      <Modal
        open={confirmOpen}
        title={confirmMode === "revoke" ? "Confirm revoke" : "Confirm"}
        onClose={() => setConfirmOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-rose-900">This will end access</div>
                <div className="mt-1 text-xs font-semibold text-rose-900/70">
                  You are revoking {confirmIds.length} session(s). This action should require re-auth in production.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-[11px] font-extrabold text-slate-600">Selected</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {confirmIds.slice(0, 6).map((id) => (
                <Badge key={id} tone="slate">{id}</Badge>
              ))}
              {confirmIds.length > 6 ? <Badge tone="slate">+{confirmIds.length - 6} more</Badge> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-extrabold text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                revokeSessions(confirmIds);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
              style={{ background: TOKENS.orange }}
            >
              <LogOut className="h-5 w-5" />
              Revoke
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500">Tip: add audit logging and require 2FA confirmation for revoking sessions.</div>
        </div>
      </Modal>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
