import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Filter,
  Globe,
  Info,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  WifiOff,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * System Status (Previewable)
 * Route: /support/status
 * Core: outages, incidents, provider health
 * Super premium: incident timeline + postmortems (placeholder)
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

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
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesAgo(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  return mins;
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
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

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
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
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[820px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function ToastCenter({ toasts, dismiss }) {
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
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div> : null}
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

// ---------------- Data ----------------

const PROVIDER_STATUS = ["operational", "degraded", "partial_outage", "major_outage", "maintenance"];

function statusTone(status) {
  if (status === "operational") return "green";
  if (status === "maintenance") return "slate";
  if (status === "degraded") return "orange";
  if (status === "partial_outage" || status === "major_outage") return "danger";
  return "slate";
}

function statusLabel(status) {
  switch (status) {
    case "operational":
      return "Operational";
    case "degraded":
      return "Degraded";
    case "partial_outage":
      return "Partial outage";
    case "major_outage":
      return "Major outage";
    case "maintenance":
      return "Maintenance";
    default:
      return String(status);
  }
}

function severityTone(sev) {
  if (sev === "critical") return "danger";
  if (sev === "major") return "orange";
  return "slate";
}

function seedProviders() {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();
  return [
    {
      id: "p_api",
      name: "EVzone Core API",
      category: "Platform",
      status: "operational",
      region: "Global",
      latencyMs: 180,
      errorRate: 0.2,
      lastCheckAt: ago(2),
    },
    {
      id: "p_pay",
      name: "Payments",
      category: "Finance",
      status: "degraded",
      region: "Africa",
      latencyMs: 620,
      errorRate: 1.4,
      lastCheckAt: ago(3),
    },
    {
      id: "p_whatsapp",
      name: "WhatsApp Business API",
      category: "Messaging",
      status: "operational",
      region: "Global",
      latencyMs: 240,
      errorRate: 0.1,
      lastCheckAt: ago(4),
    },
    {
      id: "p_sms",
      name: "SMS Gateway",
      category: "Messaging",
      status: "operational",
      region: "Africa",
      latencyMs: 310,
      errorRate: 0.3,
      lastCheckAt: ago(5),
    },
    {
      id: "p_maps",
      name: "Maps and Geocoding",
      category: "Ops",
      status: "maintenance",
      region: "Global",
      latencyMs: 0,
      errorRate: 0,
      lastCheckAt: ago(8),
    },
  ];
}

function seedIncidents() {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "INC-24018",
      title: "Payment authorization delays",
      severity: "major",
      status: "monitoring", // investigating | identified | monitoring | resolved
      startedAt: ago(210),
      updatedAt: ago(8),
      resolvedAt: null,
      affected: ["Payments"],
      summary:
        "Some payment authorizations are taking longer than expected for certain routes. Checkout is still available, but may be slow.",
      updates: [
        {
          at: ago(210),
          state: "investigating",
          message: "We are investigating reports of elevated authorization latency.",
          by: "Support Ops",
        },
        {
          at: ago(140),
          state: "identified",
          message: "Root cause identified in upstream settlement queue. Mitigation in progress.",
          by: "Payments Team",
        },
        {
          at: ago(8),
          state: "monitoring",
          message: "Mitigation applied. We are monitoring recovery and will provide updates.",
          by: "Payments Team",
        },
      ],
      postmortem: { state: "pending", url: "" },
    },
    {
      id: "INC-24017",
      title: "Intermittent errors on EVzone Core API",
      severity: "minor",
      status: "resolved",
      startedAt: ago(1280),
      updatedAt: ago(1120),
      resolvedAt: ago(1118),
      affected: ["EVzone Core API"],
      summary:
        "A subset of API requests returned 5xx errors. The issue has been resolved and systems are stable.",
      updates: [
        { at: ago(1280), state: "investigating", message: "We are investigating elevated 5xx rates.", by: "SRE" },
        { at: ago(1205), state: "identified", message: "Cause identified: misconfigured cache layer. Rolling back.", by: "SRE" },
        { at: ago(1118), state: "resolved", message: "Rollback completed. Error rates back to normal.", by: "SRE" },
      ],
      postmortem: { state: "pending", url: "" },
    },
  ];
}

function overallFrom(providers, incidents) {
  const active = incidents.filter((i) => i.status !== "resolved");
  const hasCritical = active.some((i) => i.severity === "critical");
  const hasMajor = active.some((i) => i.severity === "major");

  const worstProvider = providers.reduce(
    (acc, p) => {
      const order = {
        operational: 0,
        maintenance: 1,
        degraded: 2,
        partial_outage: 3,
        major_outage: 4,
      };
      const v = order[p.status] ?? 0;
      return v > acc ? v : acc;
    },
    0
  );

  if (hasCritical) return { label: "Major outage", tone: "danger", icon: AlertTriangle };
  if (hasMajor) return { label: "Partial outage", tone: "warning", icon: AlertTriangle };
  if (worstProvider >= 2) return { label: "Degraded performance", tone: "warning", icon: WifiOff };
  return { label: "All systems operational", tone: "success", icon: Check };
}

function StatusPill({ status }) {
  return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>;
}

function IncidentStatePill({ state }) {
  const s = String(state || "").toLowerCase();
  const tone = s === "resolved" ? "green" : s === "monitoring" ? "orange" : s === "identified" ? "orange" : "slate";
  const label = s ? s.replace(/\b\w/g, (m) => m.toUpperCase()) : "-";
  return <Badge tone={tone}>{label}</Badge>;
}

function Kpi({ icon: Icon, label, value, note, tone = "slate" }) {
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
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
          {note ? <div className="mt-1 text-[11px] font-semibold text-slate-500">{note}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function SupportSystemStatusPage() {
  const [toasts, setToasts] = useState([]);
  const pushToast = (t) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id) => setToasts((s) => s.filter((x) => x.id !== id));

  const [providers, setProviders] = useState(() => seedProviders());
  const [incidents, setIncidents] = useState(() => seedIncidents());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await sellerBackendApi.getStatusCenter();
        if (cancelled) return;
        if (Array.isArray(payload.providers)) setProviders(payload.providers as any);
        if (Array.isArray(payload.incidents)) setIncidents(payload.incidents as any);
      } catch {
        if (!cancelled) {
          pushToast({ title: "Backend unavailable", message: "Loaded seeded system status.", tone: "warning" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filters
  const [query, setQuery] = useState("");
  const [incidentFilter, setIncidentFilter] = useState("All"); // All | Active | Resolved
  const [severity, setSeverity] = useState("All"); // All | minor | major | critical
  const [providerFilter, setProviderFilter] = useState("All");

  // Subscribe
  const [sub, setSub] = useState({ email: true, sms: false, whatsapp: true });

  const providerNames = useMemo(() => ["All", ...Array.from(new Set(providers.map((p) => p.name)))], [providers]);

  const filteredIncidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents
      .filter((i) => {
        if (incidentFilter === "Active") return i.status !== "resolved";
        if (incidentFilter === "Resolved") return i.status === "resolved";
        return true;
      })
      .filter((i) => (severity === "All" ? true : i.severity === severity))
      .filter((i) => (providerFilter === "All" ? true : (i.affected || []).includes(providerFilter)))
      .filter((i) => {
        if (!q) return true;
        const hay = [i.id, i.title, i.status, i.severity, (i.affected || []).join(" "), i.summary].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [incidents, query, incidentFilter, severity, providerFilter]);

  const activeIncidents = useMemo(() => incidents.filter((i) => i.status !== "resolved"), [incidents]);

  const opsCount = useMemo(() => providers.filter((p) => p.status === "operational").length, [providers]);
  const degradedCount = useMemo(() => providers.filter((p) => p.status === "degraded").length, [providers]);
  const outageCount = useMemo(
    () => providers.filter((p) => p.status === "partial_outage" || p.status === "major_outage").length,
    [providers]
  );

  const overall = useMemo(() => overallFrom(providers, incidents), [providers, incidents]);

  // Incident drawer
  const [openId, setOpenId] = useState(null);
  const openIncident = useMemo(() => incidents.find((x) => x.id === openId) || null, [incidents, openId]);

  // “Refresh” demo
  const refresh = async () => {
    pushToast({ title: "Refreshing", message: "Fetching latest provider health and incidents.", tone: "default" });
    setLoading(true);
    try {
      const payload = await sellerBackendApi.getStatusCenter();
      if (Array.isArray(payload.providers)) setProviders(payload.providers as any);
      if (Array.isArray(payload.incidents)) setIncidents(payload.incidents as any);
      pushToast({ title: "Updated", message: "Status page updated.", tone: "success" });
    } catch {
      pushToast({ title: "Refresh failed", message: "Could not fetch status center.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  };

  // Close drawer if incident removed
  useEffect(() => {
    if (!openId) return;
    if (!incidents.find((i) => i.id === openId)) setOpenId(null);
  }, [openId, incidents]);

  const bg =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">System Status</div>
                <Badge tone="slate">/support/status</Badge>
                <Badge tone="orange">Super premium</Badge>
                {loading ? <Badge tone="slate">Loading backend</Badge> : null}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Outages, incidents and provider health. Timeline and postmortems are included as premium placeholders.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: "Subscribe",
                    message: "Wire this to your notification service (Email, SMS, WhatsApp).",
                    tone: "default",
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <MessageCircle className="h-4 w-4" />
                Subscribe
              </button>
            </div>
          </div>

          {/* Overall banner */}
          <div
            className={cx(
              "mt-4 rounded-3xl border p-4",
              overall.tone === "success" && "border-emerald-200 bg-emerald-50/60",
              overall.tone === "warning" && "border-orange-200 bg-orange-50/60",
              overall.tone === "danger" && "border-rose-200 bg-rose-50/60"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900",
                  overall.tone === "success" && "text-emerald-700",
                  overall.tone === "warning" && "text-orange-700",
                  overall.tone === "danger" && "text-rose-700"
                )}
              >
                {overall.tone === "success" ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cx(
                    "text-sm font-black",
                    overall.tone === "success" && "text-emerald-900",
                    overall.tone === "warning" && "text-orange-900",
                    overall.tone === "danger" && "text-rose-900"
                  )}
                >
                  {overall.label}
                </div>
                <div className={cx("mt-1 text-xs font-semibold", overall.tone === "success" ? "text-emerald-900/70" : overall.tone === "warning" ? "text-orange-900/70" : "text-rose-900/70")}>
                  Last updated: {fmtTime(new Date().toISOString())}. Active incidents: {activeIncidents.length}.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="slate">Status page</Badge>
                <Badge tone={overall.tone === "success" ? "green" : overall.tone === "warning" ? "orange" : "danger"}>{overall.label}</Badge>
              </div>
            </div>
          </div>

          {/* KPI */}
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Kpi icon={AlertTriangle} label="Active incidents" value={activeIncidents.length} note={activeIncidents.length ? "Monitoring in progress" : "None"} tone={activeIncidents.length ? "orange" : "green"} />
            <Kpi icon={ShieldCheck} label="Providers operational" value={`${opsCount}/${providers.length}`} note="Health checks" tone="green" />
            <Kpi icon={WifiOff} label="Degraded" value={degradedCount} note="Performance" tone={degradedCount ? "orange" : "slate"} />
            <Kpi icon={Globe} label="Outage" value={outageCount} note="Partial or major" tone={outageCount ? "danger" : "slate"} />
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
                  placeholder="Search incidents, provider, ID"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Incidents</div>
                  <div className="relative ml-auto">
                    <select
                      value={incidentFilter}
                      onChange={(e) => setIncidentFilter(e.target.value)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {["All", "Active", "Resolved"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Severity</div>
                  <div className="relative ml-auto">
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {["All", "minor", "major", "critical"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-12">
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Globe className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Provider</div>
                  <div className="relative ml-auto">
                    <select
                      value={providerFilter}
                      onChange={(e) => setProviderFilter(e.target.value)}
                      className="h-9 min-w-[240px] appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {providerNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setIncidentFilter("All");
                      setSeverity("All");
                      setProviderFilter("All");
                      pushToast({ title: "Cleared", message: "Filters reset.", tone: "default" });
                    }}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Subscriptions</div>
              <span className="ml-auto"><Badge tone="slate">Core</Badge></span>
            </div>
            <div className="mt-3 grid gap-2">
              {[
                { k: "email", label: "Email" },
                { k: "sms", label: "SMS" },
                { k: "whatsapp", label: "WhatsApp" },
              ].map((x) => (
                <button
                  key={x.k}
                  type="button"
                  onClick={() => setSub((s) => ({ ...s, [x.k]: !s[x.k] }))}
                  className={cx(
                    "flex items-center justify-between rounded-3xl border px-4 py-3 text-left text-sm font-extrabold",
                    sub[x.k] ? "border-emerald-200 bg-emerald-50/60 text-emerald-900" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-800"
                  )}
                >
                  <span>{x.label}</span>
                  <span className={cx("rounded-2xl px-3 py-1 text-xs", sub[x.k] ? "bg-white dark:bg-slate-900 text-emerald-800" : "bg-slate-100 text-slate-700")}>{sub[x.k] ? "On" : "Off"}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const enabled = Object.entries(sub)
                    .filter(([, v]) => !!v)
                    .map(([k]) => k.toUpperCase())
                    .join(", ");
                  pushToast({ title: "Subscription updated", message: enabled ? `Enabled: ${enabled}` : "No channels selected", tone: enabled ? "success" : "warning" });
                }}
                className="mt-1 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                Save subscription
              </button>
              <div className="text-[11px] font-semibold text-slate-500">Premium: webhook + Slack integrations later.</div>
            </div>
          </GlassCard>
        </div>

        {/* Main content */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Incidents */}
          <GlassCard className="overflow-hidden lg:col-span-7">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Incidents</div>
                  <Badge tone="slate">{filteredIncidents.length} shown</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Click an incident to view timeline</div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {filteredIncidents.map((i) => {
                const isActive = i.status !== "resolved";
                const mins = minutesAgo(i.updatedAt);
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setOpenId(i.id)}
                    className={cx(
                      "w-full px-4 py-4 text-left transition",
                      isActive ? "bg-orange-50/30 hover:bg-orange-50/40" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cx(
                          "grid h-11 w-11 place-items-center rounded-3xl",
                          i.severity === "critical" ? "bg-rose-50 text-rose-700" : i.severity === "major" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700"
                        )}
                      >
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{i.title}</div>
                          <Badge tone={severityTone(i.severity)}>{i.severity.toUpperCase()}</Badge>
                          <IncidentStatePill state={i.status} />
                          <span className="ml-auto text-[11px] font-semibold text-slate-500">
                            {mins === null ? "" : mins === 0 ? "Just now" : `${mins}m ago`}
                          </span>
                        </div>

                        <div className="mt-2 text-xs font-semibold text-slate-600" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {i.summary}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge tone="slate">{i.id}</Badge>
                          {(i.affected || []).slice(0, 4).map((a) => (
                            <Badge key={a} tone="slate">{a}</Badge>
                          ))}

                          <div className="ml-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                safeCopy(`#${i.id}`);
                                pushToast({ title: "Copied", message: "Incident reference copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredIncidents.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <Info className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">No incidents match</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing severity.</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </GlassCard>

          {/* Provider health */}
          <GlassCard className="overflow-hidden lg:col-span-5">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Provider health</div>
                  <Badge tone="slate">{providers.length}</Badge>
                </div>
                <Badge tone="slate">Core</Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[660px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-4">Provider</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Latency</div>
                  <div className="col-span-2">Errors</div>
                  <div className="col-span-2">Last check</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {providers.map((p) => (
                    <div key={p.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                      <div className="col-span-4 min-w-0">
                        <div className="truncate text-sm font-black text-slate-900">{p.name}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{p.category} · {p.region}</div>
                      </div>
                      <div className="col-span-2 flex items-center"><StatusPill status={p.status} /></div>
                      <div className="col-span-2 flex items-center font-extrabold text-slate-800">{p.latencyMs ? `${p.latencyMs}ms` : "-"}</div>
                      <div className="col-span-2 flex items-center">
                        <Badge tone={p.errorRate >= 2 ? "danger" : p.errorRate >= 1 ? "orange" : "slate"}>{p.errorRate.toFixed(1)}%</Badge>
                      </div>
                      <div className="col-span-2 flex items-center text-slate-500">{fmtTime(p.lastCheckAt)}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200/70 bg-gray-50 dark:bg-slate-950 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-slate-700">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900">Premium health insights</div>
                      <div className="mt-1 text-xs font-semibold text-slate-600">SLO burn rate, regional breakdown and anomaly detection can be added here.</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="slate">SLO</Badge>
                        <Badge tone="slate">Latency p95</Badge>
                        <Badge tone="slate">Error budget</Badge>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Incident detail drawer */}
      <Drawer
        open={!!openIncident}
        title={openIncident ? `Incident · ${openIncident.id}` : "Incident"}
        subtitle={openIncident ? `${openIncident.title} · Started ${fmtTime(openIncident.startedAt)}` : ""}
        onClose={() => setOpenId(null)}
      >
        {!openIncident ? null : (
          <div className="space-y-3">
            <div className={cx(
              "rounded-3xl border p-4",
              openIncident.status === "resolved" ? "border-emerald-200 bg-emerald-50/60" : "border-orange-200 bg-orange-50/60"
            )}>
              <div className="flex items-start gap-3">
                <div className={cx(
                  "grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900",
                  openIncident.status === "resolved" ? "text-emerald-700" : "text-orange-700"
                )}>
                  {openIncident.status === "resolved" ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{openIncident.title}</div>
                    <Badge tone={severityTone(openIncident.severity)}>{openIncident.severity.toUpperCase()}</Badge>
                    <IncidentStatePill state={openIncident.status} />
                    <span className="ml-auto"><Badge tone="slate">Super premium</Badge></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-700">{openIncident.summary}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(openIncident.affected || []).map((a) => (
                      <Badge key={a} tone="slate">{a}</Badge>
                    ))}
                    <span className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(`${window.location?.origin || ""}#${"/support/status"}?incident=${openIncident.id}`);
                          pushToast({ title: "Link copied", message: "Incident link copied (demo).", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                        Copy link
                      </button>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Incident timeline</div>
                <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Chronological updates. In production, this can include per-region status and subscriber notifications.</div>

              <div className="mt-4 space-y-2">
                {openIncident.updates.map((u, idx) => (
                  <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <IncidentStatePill state={u.state} />
                      <Badge tone="slate">{u.by}</Badge>
                      <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(u.at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{u.message}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Update posted", message: "Wire this to incident comms workflow.", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Post update
                </button>
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Subscriber notify", message: "Send update to Email/SMS/WhatsApp.", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  Notify subscribers
                </button>
              </div>
            </GlassCard>

            {/* Postmortem */}
            <div className={cx(
              "rounded-3xl border p-4",
              openIncident.status === "resolved" ? "border-orange-200 bg-orange-50/70" : "border-slate-200/70 bg-white dark:bg-slate-900/70"
            )}>
              <div className="flex items-start gap-3">
                <div className={cx("grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900", openIncident.status === "resolved" ? "text-orange-700" : "text-slate-700")}>
                  <Info className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-slate-900">Postmortem</div>
                    <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-600">
                    {openIncident.status === "resolved"
                      ? "Postmortem is planned. Add RCA, impact, timeline, corrective actions and prevention items here."
                      : "Postmortems appear after an incident is resolved."}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="slate">RCA</Badge>
                    <Badge tone="slate">Impact</Badge>
                    <Badge tone="slate">Action items</Badge>
                    <Badge tone="slate">Owners</Badge>
                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Postmortem", message: "Wire to docs / approvals workflow.", tone: "default" })}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.orange }}
                    >
                      <ChevronRight className="h-4 w-4" />
                      Create postmortem
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setIncidents((prev) =>
                    prev.map((x) =>
                      x.id === openIncident.id
                        ? {
                            ...x,
                            status: x.status === "resolved" ? "monitoring" : "resolved",
                            resolvedAt: x.status === "resolved" ? null : new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            updates: [
                              ...x.updates,
                              {
                                at: new Date().toISOString(),
                                state: x.status === "resolved" ? "monitoring" : "resolved",
                                message: x.status === "resolved" ? "Re-opened for monitoring (demo)." : "Marked resolved (demo).",
                                by: "Support Ops",
                              },
                            ],
                          }
                        : x
                    )
                  );
                  pushToast({ title: "Incident updated", message: "State changed (demo).", tone: "success" });
                }}
                className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                Toggle resolved
              </button>

              <button
                type="button"
                onClick={() => {
                  pushToast({ title: "Escalation", message: "Wire to on-call escalation and paging.", tone: "warning" });
                }}
                className="w-full rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700"
              >
                Escalate
              </button>
            </div>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
