import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileText,
  Filter,
  Globe,
  Hash,
  Info,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Audit Log Explorer (Previewable)
 * Route: /settings/audit
 * Core:
 * - Browse audit events
 * - Filters
 * - Exports
 * Super premium:
 * - Evidence bundle generation
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
type AuditSeverity = "Low" | "Medium" | "High";
type AuditOutcome = "Success" | "Denied" | "Failed" | "Flagged";
type AuditModule = "Finance" | "Orders" | "Security" | "Ops" | "Listings" | "Provider";
type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  module: AuditModule;
  target: string;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  ip: string;
  device: string;
  location: string;
  meta: Record<string, string | number | boolean>;
};
type RangeKey = "24h" | "7d" | "30d" | "All";
type BundleOptions = {
  includeMeta: boolean;
  includeActorProfiles: boolean;
  includeDeviceSessions: boolean;
  includeTimeline: boolean;
  includeHashes: boolean;
};
type SelectedMap = Record<string, boolean>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function hashCode(str: string) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
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

function withinRange(iso: string, rangeKey: RangeKey) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const map = {
    "24h": day,
    "7d": 7 * day,
    "30d": 30 * day,
    All: Infinity,
  };
  const span = map[rangeKey] ?? map.All;
  return now - t <= span;
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
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
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

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        value ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <span
        className={cx(
          "relative inline-flex h-5 w-9 items-center rounded-full border transition",
          value ? "border-emerald-200 bg-emerald-500" : "border-slate-200 bg-slate-100"
        )}
      >
        <span
          className={cx(
            "absolute h-4 w-4 rounded-full bg-white dark:bg-slate-900 shadow-sm transition",
            value ? "left-[18px]" : "left-[2px]"
          )}
        />
      </span>
      {label}
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
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[760px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900 transition",
        checked ? "border-emerald-200" : "border-slate-200/70"
      )}
    >
      {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
    </button>
  );
}

function toneForSeverity(sev: AuditSeverity) {
  if (sev === "High") return "danger";
  if (sev === "Medium") return "orange";
  return "slate";
}

function toneForOutcome(outcome: AuditOutcome) {
  if (outcome === "Success") return "green";
  if (outcome === "Denied") return "danger";
  if (outcome === "Failed") return "danger";
  return "slate";
}

function buildAuditSnapshot(): AuditEvent[] {
  const now = Date.now();
  const agoMin = (m: number) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "AUD-90182",
      at: agoMin(7),
      actor: "Ronald Isabirye",
      role: "Owner",
      action: "Exported payouts",
      module: "Finance",
      target: "Finance - Wallets",
      outcome: "Success",
      severity: "Low",
      ip: "41.210.9.12",
      device: "Desktop",
      location: "Kampala, UG",
      meta: { format: "CSV", rows: 482, filters: "last 30 days" },
    },
    {
      id: "AUD-90181",
      at: agoMin(18),
      actor: "Ops Agent",
      role: "Team",
      action: "Updated order status",
      module: "Orders",
      target: "ORD-10512",
      outcome: "Success",
      severity: "Low",
      ip: "10.11.2.33",
      device: "Desktop",
      location: "Wuxi, CN",
      meta: { from: "Confirmed", to: "Packed" },
    },
    {
      id: "AUD-90180",
      at: agoMin(44),
      actor: "System",
      role: "System",
      action: "Risk rule triggered",
      module: "Security",
      target: "Login anomaly",
      outcome: "Flagged",
      severity: "High",
      ip: "103.66.1.90",
      device: "Mobile",
      location: "Unknown",
      meta: { rule: "impossible travel", confidence: 0.81 },
    },
    {
      id: "AUD-90179",
      at: agoMin(62),
      actor: "Finance Approver",
      role: "Team Lead",
      action: "Released payout hold",
      module: "Finance",
      target: "HOLD-1190",
      outcome: "Success",
      severity: "Medium",
      ip: "41.210.9.12",
      device: "Desktop",
      location: "Kampala, UG",
      meta: { reason: "KYC updated", amount: 1200, currency: "USD" },
    },
    {
      id: "AUD-90178",
      at: agoMin(95),
      actor: "Support",
      role: "Support",
      action: "Viewed dispute evidence",
      module: "Ops",
      target: "DSP-901",
      outcome: "Success",
      severity: "Medium",
      ip: "52.13.88.10",
      device: "Desktop",
      location: "Frankfurt, DE",
      meta: { evidenceCount: 3, exportable: true },
    },
    {
      id: "AUD-90177",
      at: agoMin(170),
      actor: "Seller Team",
      role: "Team",
      action: "Changed listing price",
      module: "Listings",
      target: "L-1002",
      outcome: "Success",
      severity: "Low",
      ip: "10.11.2.33",
      device: "Desktop",
      location: "Wuxi, CN",
      meta: { from: 280, to: 248, currency: "USD" },
    },
    {
      id: "AUD-90176",
      at: agoMin(240),
      actor: "Unknown",
      role: "Unknown",
      action: "Sign-in attempt",
      module: "Security",
      target: "Account",
      outcome: "Denied",
      severity: "High",
      ip: "185.21.44.9",
      device: "Mobile",
      location: "Unknown",
      meta: { reason: "2FA required", method: "OTP" },
    },
    {
      id: "AUD-90175",
      at: agoMin(420),
      actor: "Provider Manager",
      role: "Team",
      action: "Replied to review",
      module: "Provider",
      target: "REV-10090",
      outcome: "Success",
      severity: "Low",
      ip: "41.210.9.12",
      device: "Mobile",
      location: "Kampala, UG",
      meta: { visibility: "public" },
    },
  ];
}

function exportCsv(rows: AuditEvent[]) {
  const headers = ["id", "at", "actor", "role", "action", "module", "target", "outcome", "severity", "ip", "device", "location"]; 
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    const record = r as Record<string, unknown>;
    lines.push(headers.map((h) => escape(record[h])).join(","));
  });
  return lines.join("\n");
}

function JsonBox({
  title,
  obj,
  onCopy,
}: {
  title: string;
  obj: unknown;
  onCopy: () => void;
}) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return "{}";
    }
  }, [obj]);

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-700" />
        <div className="text-sm font-black text-slate-900">{title}</div>
        <button
          type="button"
          onClick={onCopy}
          className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
        >
          <Copy className="h-4 w-4" />
          Copy
        </button>
      </div>
      <pre className="mt-3 max-h-[320px] overflow-auto rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-800">
        {text}
      </pre>
    </div>
  );
}

export default function AuditLogExplorerPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) =>
    setToasts((s) => s.filter((x) => x.id !== id));

  const [events, setEvents] = useState<AuditEvent[]>([]);

  const [range, setRange] = useState<RangeKey>("24h");
  const [module, setModule] = useState<AuditModule | "All">("All");
  const [outcome, setOutcome] = useState<AuditOutcome | "All">("All");
  const [severity, setSeverity] = useState<AuditSeverity | "All">("All");
  const [query, setQuery] = useState("");

  const modules = useMemo(() => {
    const s = new Set(events.map((e) => e.module));
    return ["All", ...Array.from(s)];
  }, [events]);

  const rangeOptions: Array<{ k: RangeKey; label: string }> = [
    { k: "24h", label: "Last 24h" },
    { k: "7d", label: "Last 7d" },
    { k: "30d", label: "Last 30d" },
    { k: "All", label: "All" },
  ];

  const outcomes: Array<AuditOutcome | "All"> = [
    "All",
    "Success",
    "Denied",
    "Failed",
    "Flagged",
  ];
  const severities: Array<AuditSeverity | "All"> = [
    "All",
    "Low",
    "Medium",
    "High",
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => withinRange(e.at, range))
      .filter((e) => (module === "All" ? true : e.module === module))
      .filter((e) => (outcome === "All" ? true : e.outcome === outcome))
      .filter((e) => (severity === "All" ? true : e.severity === severity))
      .filter((e) => {
        if (!q) return true;
        const hay = [e.id, e.actor, e.role, e.action, e.module, e.target, e.outcome, e.ip, e.location].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [events, range, module, outcome, severity, query]);

  const [selected, setSelected] = useState<SelectedMap>({});
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );
  const selectedRows = useMemo(() => filtered.filter((e) => selectedIds.includes(e.id)), [filtered, selectedIds]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((e) => selected[e.id]);
  const toggleAll = () => {
    if (!filtered.length) return;
    const next = { ...selected };
    if (allVisibleSelected) {
      filtered.forEach((e) => delete next[e.id]);
    } else {
      filtered.forEach((e) => (next[e.id] = true));
    }
    setSelected(next);
  };

  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await sellerBackendApi.getAuditLogs();
        if (!active) return;
        setEvents(
          rows.map((row) => {
            const metadata = (row.metadata || {}) as Record<string, unknown>;
            const moduleLabel = String(metadata.module || row.entityType || "Ops");
            const severityLabel = String(metadata.severity || "info").toLowerCase();
            const statusCode = Number(row.statusCode || 200);
            const outcomeLabel = String(metadata.outcome || (statusCode >= 400 ? "failed" : "success")).toLowerCase();
            const role = String(row.role || "SELLER");
            return {
              id: String(row.id || makeId("audit")),
              at: String(row.createdAt || new Date().toISOString()),
              actor: role === "SELLER" ? "Supplier" : role,
              role,
              action: String(row.action || "unknown"),
              module:
                moduleLabel.includes("Finance")
                  ? "Finance"
                  : moduleLabel.includes("Order")
                    ? "Orders"
                    : moduleLabel.includes("Security")
                      ? "Security"
                      : moduleLabel.includes("Listing")
                        ? "Listings"
                        : moduleLabel.includes("Provider")
                          ? "Provider"
                          : "Ops",
              target: String(row.entityId || row.entityType || "workspace"),
              outcome:
                outcomeLabel.includes("denied")
                  ? "Denied"
                  : outcomeLabel.includes("flag")
                    ? "Flagged"
                    : outcomeLabel.includes("fail")
                      ? "Failed"
                      : "Success",
              severity:
                severityLabel.includes("high") || severityLabel.includes("critical")
                  ? "High"
                  : severityLabel.includes("warn") || severityLabel.includes("medium")
                    ? "Medium"
                    : "Low",
              ip: String(row.ip || "127.0.0.1"),
              device: String(row.userAgent || "Web"),
              location: String(metadata.location || "Kampala, UG"),
              meta: Object.fromEntries(
                Object.entries(metadata).map(([key, value]) => [key, typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : JSON.stringify(value)])
              ),
            } satisfies AuditEvent;
          })
        );
      } catch {
        return;
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!events.find((e) => e.id === activeId)) setActiveId(events[0]?.id ?? null);
  }, [events, activeId]);
  const active = useMemo(() => events.find((e) => e.id === activeId) || null, [events, activeId]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const high = filtered.filter((e) => e.severity === "High").length;
    const denied = filtered.filter((e) => e.outcome === "Denied").length;
    const security = filtered.filter((e) => e.module === "Security").length;
    return { total, high, denied, security };
  }, [filtered]);

  const [exportOpen, setExportOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);

  const bundleDraft = useMemo(() => {
    const base = {
      bundleId: `EVB-${String(hashCode(selectedIds.join("|")) % 1_000_000).padStart(6, "0")}`,
      createdAt: new Date().toISOString(),
      createdBy: "Audit Explorer",
      scope: {
        count: selectedRows.length,
        range,
        module,
        outcome,
        severity,
      },
      chainOfCustody: [
        { at: new Date().toISOString(), who: "System", step: "Bundle draft created" },
        { at: new Date().toISOString(), who: "Operator", step: "Awaiting generation" },
      ],
      events: selectedRows.map((e) => ({
        id: e.id,
        at: e.at,
        actor: e.actor,
        role: e.role,
        action: e.action,
        module: e.module,
        target: e.target,
        outcome: e.outcome,
        severity: e.severity,
        ip: e.ip,
        device: e.device,
        location: e.location,
        meta: e.meta,
      })),
    };

    const json = JSON.stringify(base);
    const digest = `SHA256-${String(hashCode(json)).padStart(10, "0")}`;
    return { ...base, digest };
  }, [selectedRows, selectedIds, range, module, outcome, severity]);

  const [bundleOptions, setBundleOptions] = useState<BundleOptions>({
    includeMeta: true,
    includeActorProfiles: true,
    includeDeviceSessions: true,
    includeTimeline: true,
    includeHashes: true,
  });

  useEffect(() => {
    if (!bundleOpen) return;
    setBundleOptions({
      includeMeta: true,
      includeActorProfiles: true,
      includeDeviceSessions: true,
      includeTimeline: true,
      includeHashes: true,
    });
  }, [bundleOpen]);

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
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Audit Log Explorer</div>
                <Badge tone="slate">/settings/audit</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Browse audit events, filter fast, export, and generate evidence bundles.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedIds.length) {
                    pushToast({ title: "Select events", message: "Pick one or more audit events first.", tone: "warning" });
                    return;
                  }
                  setBundleOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <ShieldCheck className="h-4 w-4" />
                Evidence bundle
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-4">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Events shown</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.total}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">High severity</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.high}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Denied</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.denied}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Security events</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.security}</div>
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
                  placeholder="Search actor, action, target, IP, outcome"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-6 flex flex-wrap items-center gap-2">
                {rangeOptions.map((r) => (
                  <button
                    key={r.k}
                    type="button"
                    onClick={() => setRange(r.k)}
                    className={cx(
                      "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                      range === r.k ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
                <span className="ml-auto"><Badge tone="slate">Filters</Badge></span>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Module</div>
                  <div className="relative ml-auto">
                    <select
                      value={module}
                      onChange={(e) =>
                        setModule(e.target.value as AuditModule | "All")
                      }
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {modules.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-4">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Outcome</div>
                  <div className="relative ml-auto">
                    <select
                      value={outcome}
                      onChange={(e) =>
                        setOutcome(e.target.value as AuditOutcome | "All")
                      }
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {outcomes.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-4">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Severity</div>
                  <div className="relative ml-auto">
                    <select
                      value={severity}
                      onChange={(e) =>
                        setSeverity(e.target.value as AuditSeverity | "All")
                      }
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {severities.map((s) => (
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

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setRange("24h");
                  setModule("All");
                  setOutcome("All");
                  setSeverity("All");
                  setSelected({});
                  pushToast({ title: "Cleared", message: "Filters and selection cleared.", tone: "default" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Clear
              </button>

              <span className="ml-auto flex items-center gap-2">
                <Badge tone="slate">Selected {selectedIds.length}</Badge>
                <Badge tone="slate">Showing {filtered.length}</Badge>
              </span>
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Premium evidence</div>
              <span className="ml-auto"><Badge tone="orange">Bundle</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              Evidence bundles include selected events, timeline, hashes and a chain-of-custody log.
            </div>
            <div className="mt-3 grid gap-2">
              {[
                { t: "Chain of custody", d: "Who touched what and when" },
                { t: "Bundle digest", d: "Integrity hash for verification" },
                { t: "Export pack", d: "PDF and JSON (demo wiring)" },
              ].map((x) => (
                <div key={x.t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                  <div className="text-xs font-extrabold text-slate-800">{x.t}</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">{x.d}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Main */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Audit events</div>
                  <Badge tone="slate">{filtered.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const csv = exportCsv(selectedRows.length ? selectedRows : filtered);
                      safeCopy(csv);
                      pushToast({
                        title: "CSV copied",
                        message: selectedRows.length ? "Selected events copied as CSV." : "Filtered events copied as CSV.",
                        tone: "success",
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                    Copy CSV
                  </button>
                  <Checkbox checked={allVisibleSelected} onChange={toggleAll} label="Select all" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1040px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-1">Sel</div>
                  <div className="col-span-2">Time</div>
                  <div className="col-span-2">Actor</div>
                  <div className="col-span-3">Action</div>
                  <div className="col-span-2">Target</div>
                  <div className="col-span-1">Outcome</div>
                  <div className="col-span-1 text-right">Severity</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((e) => {
                    const isActive = e.id === activeId;
                    const checked = !!selected[e.id];
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setActiveId(e.id)}
                        className={cx(
                          "grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold transition",
                          isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="col-span-1">
                          <Checkbox
                            checked={checked}
                            onChange={(v) => setSelected((s) => ({ ...s, [e.id]: v }))}
                            label={`Select ${e.id}`}
                          />
                        </div>

                        <div className="col-span-2 flex items-center gap-2 text-slate-700">
                          <Badge tone="slate">{fmtTime(e.at)}</Badge>
                        </div>

                        <div className="col-span-2 min-w-0">
                          <div className="truncate text-sm font-black text-slate-900">{e.actor}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{e.role}</div>
                        </div>

                        <div className="col-span-3 min-w-0">
                          <div className="truncate text-sm font-black text-slate-900">{e.action}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <Badge tone="slate">{e.module}</Badge>
                            <span className="inline-flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5" />
                              {e.location}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center min-w-0">
                          <div className="truncate text-slate-800">{e.target}</div>
                        </div>

                        <div className="col-span-1 flex items-center">
                          <Badge tone={toneForOutcome(e.outcome)}>{e.outcome}</Badge>
                        </div>

                        <div className="col-span-1 flex items-center justify-end">
                          <Badge tone={toneForSeverity(e.severity)}>{e.severity}</Badge>
                        </div>
                      </button>
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
                            <div className="text-lg font-black text-slate-900">No results</div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing the search text.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedIds.length ? (
              <div className="border-t border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="green">{selectedIds.length} selected</Badge>

                  <button
                    type="button"
                    onClick={() => {
                      const csv = exportCsv(selectedRows);
                      safeCopy(csv);
                      pushToast({ title: "Selection exported", message: "CSV copied for selected events.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Download className="h-4 w-4" />
                    Export selection
                  </button>

                  <button
                    type="button"
                    onClick={() => setBundleOpen(true)}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Build evidence bundle
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelected({});
                      pushToast({ title: "Selection cleared", tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>
            ) : null}
          </GlassCard>

          <div className="lg:col-span-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Inspector</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Open an event to view details and metadata.</div>
                </div>
                <Badge tone="slate">Premium</Badge>
              </div>

              {!active ? (
                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-sm font-semibold text-slate-600">Select an event to inspect.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <Hash className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{active.id}</div>
                          <span className="ml-auto"><Badge tone={toneForOutcome(active.outcome)}>{active.outcome}</Badge></span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{fmtTime(active.at)} · {active.module} · {active.severity}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone="slate">IP {active.ip}</Badge>
                          <Badge tone="slate">{active.device}</Badge>
                          <Badge tone="slate">{active.location}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="text-[11px] font-extrabold text-slate-600">Action</div>
                      <div className="mt-1 text-sm font-black text-slate-900">{active.action}</div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-600">Target</div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">{active.target}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(active.id);
                          pushToast({ title: "Copied", message: "Event ID copied.", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                        Copy ID
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelected((s) => ({ ...s, [active.id]: true }));
                          pushToast({ title: "Added to selection", message: "Event selected for bundle.", tone: "default" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Check className="h-4 w-4" />
                        Select
                      </button>
                    </div>
                  </div>

                  <JsonBox
                    title="Metadata"
                    obj={active.meta}
                    onCopy={() => {
                      safeCopy(JSON.stringify(active.meta, null, 2));
                      pushToast({ title: "Copied", message: "Metadata copied.", tone: "success" });
                    }}
                  />

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Super premium tip</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">
                          Use evidence bundles when handling disputes, security incidents, or payout investigations.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Export drawer */}
      <Drawer
        open={exportOpen}
        title="Export"
        subtitle="Export filtered events or selection (demo)."
        onClose={() => setExportOpen(false)}
      >
        <div className="grid gap-3">
          {[
            { k: "csv", t: "CSV", d: "Spreadsheet-friendly export" },
            { k: "json", t: "JSON", d: "API-friendly export" },
            { k: "pdf", t: "PDF", d: "Shareable report" },
          ].map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => {
                const rows = selectedRows.length ? selectedRows : filtered;
                if (x.k === "csv") safeCopy(exportCsv(rows));
                if (x.k === "json") safeCopy(JSON.stringify(rows, null, 2));
                setExportOpen(false);
                pushToast({
                  title: `Export ready (${x.t})`,
                  message: selectedRows.length ? "Selection copied." : "Filtered view copied.",
                  tone: "success",
                });
              }}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <Download className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">{x.t}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                  <div className="mt-2 text-[11px] font-extrabold text-slate-500">
                    {selectedRows.length ? `${selectedRows.length} selected` : `${filtered.length} filtered`}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </button>
          ))}

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Note</div>
              <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              In production, exports can be delivered as downloadable files, emailed reports, or pushed to a secure evidence vault.
            </div>
          </div>
        </div>
      </Drawer>

      {/* Evidence bundle drawer */}
      <Drawer
        open={bundleOpen}
        title="Evidence bundle"
        subtitle="Super premium evidence pack builder"
        onClose={() => setBundleOpen(false)}
      >
        {selectedRows.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">
            Select one or more events first.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-emerald-900">{bundleDraft.bundleId}</div>
                    <span className="ml-auto"><Badge tone="green">{selectedRows.length} events</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-emerald-900/70">Digest: {bundleDraft.digest}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(bundleDraft.bundleId);
                        pushToast({ title: "Copied", message: "Bundle ID copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy bundle ID
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(bundleDraft.digest);
                        pushToast({ title: "Copied", message: "Digest copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy digest
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Bundle options</div>
                <span className="ml-auto"><Badge tone="slate">Controls</Badge></span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Toggle value={bundleOptions.includeMeta} onChange={(v) => setBundleOptions((s) => ({ ...s, includeMeta: v }))} label="Include metadata" />
                <Toggle value={bundleOptions.includeActorProfiles} onChange={(v) => setBundleOptions((s) => ({ ...s, includeActorProfiles: v }))} label="Include actor profiles" />
                <Toggle value={bundleOptions.includeDeviceSessions} onChange={(v) => setBundleOptions((s) => ({ ...s, includeDeviceSessions: v }))} label="Include device sessions" />
                <Toggle value={bundleOptions.includeTimeline} onChange={(v) => setBundleOptions((s) => ({ ...s, includeTimeline: v }))} label="Include timeline" />
                <Toggle value={bundleOptions.includeHashes} onChange={(v) => setBundleOptions((s) => ({ ...s, includeHashes: v }))} label="Include hashes" />
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-500">Options affect what is included in the evidence pack (demo).</div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
              <div className="border-b border-slate-200/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Selected events</div>
                  <span className="ml-auto"><Badge tone="slate">{selectedRows.length}</Badge></span>
                </div>
              </div>
              <div className="divide-y divide-slate-200/70">
                {selectedRows.map((e) => (
                  <div key={e.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={toneForSeverity(e.severity)}>{e.severity}</Badge>
                      <div className="text-sm font-black text-slate-900">{e.action}</div>
                      <span className="ml-auto text-[11px] font-semibold text-slate-500">{fmtTime(e.at)}</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{e.id} · {e.actor} · {e.module} · {e.target}</div>
                  </div>
                ))}
              </div>
            </div>

            <JsonBox
              title="Bundle JSON (preview)"
              obj={{
                ...bundleDraft,
                included: bundleOptions,
              }}
              onCopy={() => {
                safeCopy(JSON.stringify({ ...bundleDraft, included: bundleOptions }, null, 2));
                pushToast({ title: "Copied", message: "Bundle JSON copied.", tone: "success" });
              }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  // Demo: generation
                  pushToast({
                    title: "Bundle generated",
                    message: `Evidence pack ${bundleDraft.bundleId} generated (demo).`,
                    tone: "success",
                    action: { label: "Copy digest", onClick: () => safeCopy(bundleDraft.digest) },
                  });
                  setBundleOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <ShieldCheck className="h-4 w-4" />
                Generate evidence pack
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelected({});
                  setBundleOpen(false);
                  pushToast({ title: "Selection cleared", message: "Bundle builder closed.", tone: "default" });
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Clear selection
              </button>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Super premium enhancements</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                    <li>Signed PDF with watermark and verification link</li>
                    <li>Evidence vault storage with retention rules</li>
                    <li>Redaction and role-based visibility</li>
                    <li>Cross-event correlation (same IP, same device fingerprint)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
