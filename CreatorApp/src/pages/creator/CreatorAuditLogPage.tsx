import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Copy,
  Download,
  Filter,
  KeyRound,
  LayoutGrid,
  Lock,
  Search,
  Settings,
  ShieldCheck,
  User,
  X
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useApiResource } from "../../hooks/useApiResource";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { CircularProgress } from "@mui/material";
import { creatorApi, type AuditLogRecord } from "../../lib/creatorApi";

/**
 * Creator Platform – Audit Log (Premium)
 * -------------------------------------------------------------
 * Fix in this revision:
 * - ✅ Fix SyntaxError: Adjacent JSX elements must be wrapped
 *   by ensuring the component returns a single root element.
 *
 * Also keeps prior fix:
 * - ✅ nowLabel() exists and is used for exports.
 *
 * Includes:
 * - Filters (range/module/severity/outcome/actor/search)
 * - Selection + export JSON/CSV
 * - Details drawer with metadata JSON
 * - Responsive (table desktop, cards mobile)
 * - Lightweight self-tests (run once on mount)
 */

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";

type Tone = "default" | "success" | "warn" | "error";

type Severity = "Info" | "Warning" | "Critical";

type Outcome = "Success" | "Pending" | "Blocked" | "Failed";

type ModuleName =
  | "Shoppable Adz"
  | "Live Crew"
  | "Roles & Permissions"
  | "Onboarding"
  | "Settings & Safety"
  | "Partners & Guests"
  | "Payouts";

type AuditEvent = {
  id: string;
  ts: string; // ISO
  actor: { name: string; handle?: string; role?: string };
  module: ModuleName;
  action: string;
  entity: { type: string; id?: string; name?: string };
  severity: Severity;
  outcome: Outcome;
  ip?: string;
  location?: string;
  meta?: Record<string, any>;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function nowLabel() {
  return new Date().toISOString();
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function relTime(iso: string) {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function inRange(iso: string, range: "24h" | "7d" | "30d" | "all") {
  if (range === "all") return true;
  const t = new Date(iso).getTime();
  const now = Date.now();
  const delta = now - t;
  const day = 24 * 60 * 60 * 1000;
  if (range === "24h") return delta <= day;
  if (range === "7d") return delta <= 7 * day;
  return delta <= 30 * day;
}

function toCsv(rows: AuditEvent[]) {
  const cols = [
    "id",
    "ts",
    "actor",
    "actorRole",
    "module",
    "action",
    "entityType",
    "entityId",
    "entityName",
    "severity",
    "outcome",
    "ip",
    "location"
  ];

  const esc = (v: any) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\n") || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const lines = [cols.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.ts,
        r.actor?.handle || r.actor?.name,
        r.actor?.role || "",
        r.module,
        r.action,
        r.entity?.type,
        r.entity?.id || "",
        r.entity?.name || "",
        r.severity,
        r.outcome,
        r.ip || "",
        r.location || ""
      ]
        .map(esc)
        .join(",")
    );
  }
  return lines.join("\n");
}


function ToastStack({ items }: { items: Array<{ id: string; message: string; tone: Tone }> }) {
  return (
    <div className="fixed top-16 right-3 md:right-6 z-[80] flex flex-col gap-2 w-[min(380px,calc(100vw-24px))]">
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            "rounded-2xl border px-3 py-2 text-xs shadow-sm bg-white dark:bg-slate-800",
            t.tone === "success"
              ? "border-emerald-200 dark:border-emerald-900/50"
              : t.tone === "error"
                ? "border-rose-200 dark:border-rose-900/50"
                : t.tone === "warn"
                  ? "border-amber-200 dark:border-amber-900/50"
                  : "border-slate-200 dark:border-slate-700"
          )}
        >
          <div className="flex items-start gap-2">
            <span
              className={cx(
                "mt-1 h-2 w-2 rounded-full",
                t.tone === "success"
                  ? "bg-emerald-500"
                  : t.tone === "error"
                    ? "bg-rose-500"
                    : t.tone === "warn"
                      ? "bg-amber-500"
                      : "bg-slate-500"
              )}
            />
            <div className="text-slate-700 dark:text-slate-200">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Pill({
  icon,
  text,
  tone
}: {
  icon: React.ReactNode;
  text: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px]",
        tone === "good"
          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
          : tone === "warn"
            ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
            : tone === "bad"
              ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
              : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
      )}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function StatusPill({ value, kind }: { value: Severity | Outcome; kind: "severity" | "outcome" }) {
  const cls =
    kind === "severity"
      ? value === "Critical"
        ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
        : value === "Warning"
          ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
          : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
      : value === "Failed"
        ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
        : value === "Blocked"
          ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
          : value === "Pending"
            ? "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400";

  return <span className={cx("px-3 py-1 rounded-full border text-[11px] font-bold", cls)}>{value}</span>;
}

function SoftButton({
  children,
  onClick,
  disabled,
  title,
  tone
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  tone?: "orange";
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      title={title}
      onClick={onClick}
      className={cx(
        "px-4 py-2 rounded-2xl text-xs font-semibold inline-flex items-center gap-2 border transition-all",
        disabled
          ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
      )}
      style={!disabled && tone === "orange" ? { borderColor: ORANGE, color: ORANGE } : undefined}
    >
      {children}
    </button>
  );
}

function Drawer({
  open,
  title,
  subtitle,
  children,
  onClose,
  width = "max-w-[980px]"
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cx("absolute right-0 top-0 h-full w-full", width, "bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300")}>
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold dark:text-slate-50">{title}</div>
              {subtitle ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
            </div>
            <button
              type="button"
              className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold dark:text-slate-50">{title}</div>
            {subtitle ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-4 max-h-[75vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function prettifyAction(value?: string | null) {
  return String(value || "Event")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase()) || "Event";
}

function mapModuleName(route?: string | null, entityType?: string | null, action?: string | null): ModuleName {
  const source = `${route || ""} ${entityType || ""} ${action || ""}`.toLowerCase();
  if (source.includes("role")) return "Roles & Permissions";
  if (source.includes("onboarding") || source.includes("approval")) return "Onboarding";
  if (source.includes("payout") || source.includes("earning")) return "Payouts";
  if (source.includes("setting") || source.includes("security") || source.includes("safety")) return "Settings & Safety";
  if (source.includes("guest") || source.includes("partner")) return "Partners & Guests";
  if (source.includes("crew") || source.includes("live")) return "Live Crew";
  return "Shoppable Adz";
}

function mapSeverity(record: AuditLogRecord): Severity {
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const explicit = String((metadata as { severity?: unknown }).severity || "").trim().toLowerCase();
  if (explicit === "critical") return "Critical";
  if (explicit === "warning" || explicit === "warn") return "Warning";
  const statusCode = Number(record.statusCode || 0);
  if (statusCode >= 500) return "Critical";
  if (statusCode >= 400) return "Warning";
  return "Info";
}

function mapOutcome(record: AuditLogRecord): Outcome {
  const statusCode = Number(record.statusCode || 0);
  if (!statusCode) return "Pending";
  if (statusCode >= 500) return "Failed";
  if (statusCode >= 400) return "Blocked";
  if (statusCode >= 200 && statusCode < 300) return "Success";
  return "Pending";
}

function toAuditEvent(record: AuditLogRecord): AuditEvent {
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const actorName = String(
    (metadata as { actorName?: unknown; userName?: unknown; email?: unknown }).actorName ||
    (metadata as { actorName?: unknown; userName?: unknown; email?: unknown }).userName ||
    (metadata as { actorName?: unknown; userName?: unknown; email?: unknown }).email ||
    "Workspace user"
  );
  const actorHandle = String(
    (metadata as { actorHandle?: unknown; username?: unknown }).actorHandle ||
    (metadata as { actorHandle?: unknown; username?: unknown }).username ||
    ""
  ).trim();

  return {
    id: record.id,
    ts: String(record.createdAt || new Date().toISOString()),
    actor: {
      name: actorName,
      handle: actorHandle || undefined,
      role: String((metadata as { actorRole?: unknown; role?: unknown }).actorRole || (metadata as { actorRole?: unknown; role?: unknown }).role || "")
    },
    module: mapModuleName(record.route, record.entityType, record.action),
    action: prettifyAction(record.action),
    entity: {
      type: String(record.entityType || "Record"),
      id: record.entityId ? String(record.entityId) : undefined,
      name: typeof (metadata as { entityName?: unknown }).entityName === "string" ? String((metadata as { entityName?: unknown }).entityName) : undefined
    },
    severity: mapSeverity(record),
    outcome: mapOutcome(record),
    ip: record.ipAddress ? String(record.ipAddress) : undefined,
    location: typeof (metadata as { location?: unknown }).location === "string" ? String((metadata as { location?: unknown }).location) : undefined,
    meta: metadata
  };
}

// Lightweight self-tests (run once)
function __selfTest() {
  const t = nowLabel();
  if (typeof t !== "string" || !t.includes("T")) throw new Error("nowLabel() must return an ISO string");

  const csv = toCsv([
    {
      id: "T-1",
      ts: nowLabel(),
      actor: { name: "Tester" },
      module: "Shoppable Adz",
      action: "Test",
      entity: { type: "Ad", id: "AD-1" },
      severity: "Info",
      outcome: "Success"
    }
  ]);
  if (!csv.includes("T-1") || !csv.includes("Shoppable Adz")) throw new Error("toCsv() self-test failed");

  const old = "2000-01-01T00:00:00.000Z";
  if (inRange(old, "30d")) throw new Error("inRange() self-test failed");
}

export default function CreatorAuditLogPage() {
  const { run, isPending: actionPending } = useAsyncAction();

  useEffect(() => {
    __selfTest();
  }, []);

  const [toasts, setToasts] = useState<Array<{ id: string; message: string; tone: Tone }>>([]);
  const pushToast = (message: string, tone: Tone = "default") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2600);
  };

  // Mock permissions (wire to Roles & Permissions)
  const [viewerPerms] = useState<Record<string, boolean>>({
    "audit.view": true,
    "audit.export": true,
    "audit.view_sensitive": true
  });

  const canView = !!viewerPerms["audit.view"];
  const canExport = !!viewerPerms["audit.export"];
  const canViewSensitive = !!viewerPerms["audit.view_sensitive"];
  const { data: auditRecords } = useApiResource({
    initialData: [] as AuditLogRecord[],
    loader: () => creatorApi.auditLogs()
  });
  const events = useMemo(() => auditRecords.map(toAuditEvent), [auditRecords]);

  // Filters
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [moduleFilter, setModuleFilter] = useState<"All" | ModuleName>("All");
  const [severity, setSeverity] = useState<"All" | Severity>("All");
  const [outcome, setOutcome] = useState<"All" | Outcome>("All");
  const [actor, setActor] = useState<string>("All");
  const [q, setQ] = useState<string>("");
  const [onlyMine, setOnlyMine] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drawer + export
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<"json" | "csv">("json");

  const meHandle = "@ronald";

  const actorOptions = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.actor?.handle || e.actor?.name || "Unknown"));
    return ["All", ...Array.from(set).sort()];
  }, [events]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return events
      .filter((e) => inRange(e.ts, range))
      .filter((e) => (moduleFilter === "All" ? true : e.module === moduleFilter))
      .filter((e) => (severity === "All" ? true : e.severity === severity))
      .filter((e) => (outcome === "All" ? true : e.outcome === outcome))
      .filter((e) => (actor === "All" ? true : (e.actor?.handle || e.actor?.name) === actor))
      .filter((e) => (onlyMine ? (e.actor?.handle || "") === meHandle : true))
      .filter((e) => {
        if (!s) return true;
        const text = [
          e.id,
          e.module,
          e.action,
          e.entity?.type,
          e.entity?.id,
          e.entity?.name,
          e.actor?.name,
          e.actor?.handle,
          e.outcome,
          e.severity
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(s);
      })
      .map((e) => {
        if (canViewSensitive) return e;
        return { ...e, ip: undefined, location: undefined, meta: { redacted: true } };
      });
  }, [events, range, moduleFilter, severity, outcome, actor, q, onlyMine, canViewSensitive]);

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      critical: filtered.filter((e) => e.severity === "Critical").length,
      pending: filtered.filter((e) => e.outcome === "Pending").length
    };
  }, [filtered]);

  const active = useMemo(() => filtered.find((e) => e.id === activeId) || null, [filtered, activeId]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((e) => next.add(e.id));
      return next;
    });
    pushToast("Selected visible events.", "success");
  }

  function clearSelection() {
    setSelected(new Set());
    pushToast("Selection cleared.", "success");
  }

  function openEvent(id: string) {
    setActiveId(id);
    setDrawerOpen(true);
  }

  function exportSelected(mode: "json" | "csv") {
    if (!canExport) {
      pushToast("Export is locked by role.", "warn");
      return;
    }
    setExportMode(mode);
    setExportOpen(true);
  }

  const selectedRows = useMemo(() => {
    if (selected.size === 0) return filtered;
    return filtered.filter((e) => selected.has(e.id));
  }, [filtered, selected]);

  const exportPayload = useMemo(() => {
    const rows = selectedRows;
    if (exportMode === "csv") return toCsv(rows);
    return JSON.stringify(
      {
        exportedAt: nowLabel(),
        range,
        filters: { module: moduleFilter, severity, outcome, actor, q, onlyMine },
        count: rows.length,
        rows
      },
      null,
      2
    );
  }, [selectedRows, exportMode, range, moduleFilter, severity, outcome, actor, q, onlyMine]);

  // IMPORTANT: Return a single root element to avoid Adjacent JSX errors.
  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      <ToastStack items={toasts} />
      <PageHeader
        pageTitle="Audit Log"
        mobileViewType="inline-right"
        badge={
          <div className="flex flex-wrap gap-2">
            <Pill icon={<BarChart3 className="h-4 w-4" />} text={`${stats.total} event(s)`} />
            {stats.critical ? (
              <Pill icon={<AlertTriangle className="h-4 w-4" />} text={`${stats.critical} critical`} tone="bad" />
            ) : null}
            <Pill icon={<Lock className="h-4 w-4" />} text={canViewSensitive ? "Sensitive visible" : "Sensitive hidden"} tone={canViewSensitive ? "good" : "warn"} />
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <SoftButton tone="orange" onClick={() => pushToast("Open Roles & Permissions to manage audit permissions.", "success")}>
              <Settings className="h-4 w-4" /> Permissions
            </SoftButton>
            <SoftButton disabled={!canExport} onClick={() => exportSelected("json")}>
              <Download className="h-4 w-4" /> Export
            </SoftButton>
          </div>
        }
      />

      {!canView ? (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl text-white flex items-center justify-center" style={{ background: ORANGE }}>
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold dark:text-slate-50">Access required</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">You need audit access to view this page.</div>
                <div className="mt-3">
                  <SoftButton tone="orange" onClick={() => pushToast("Ask Owner to grant audit.view.", "warn")}>
                    <KeyRound className="h-4 w-4" /> Request access
                  </SoftButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="sticky top-16 z-20 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
            <div className="w-full px-4 md:px-6 py-4 flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select className="text-xs bg-transparent outline-none dark:text-slate-200 cursor-pointer" value={range} onChange={(e) => setRange(e.target.value as any)}>
                    <option value="24h">Last 24h</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
                  <LayoutGrid className="h-4 w-4 text-slate-400" />
                  <select className="text-xs bg-transparent outline-none dark:text-slate-200 cursor-pointer" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value as any)}>
                    <option value="All">All modules</option>
                    <option value="Shoppable Adz">Shoppable Adz</option>
                    <option value="Live Crew">Live Crew</option>
                    <option value="Roles & Permissions">Roles & Permissions</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Settings & Safety">Settings & Safety</option>
                    <option value="Partners & Guests">Partners & Guests</option>
                    <option value="Payouts">Payouts</option>
                  </select>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
                  <AlertTriangle className="h-4 w-4 text-slate-400" />
                  <select className="text-xs bg-transparent outline-none dark:text-slate-200 cursor-pointer" value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                    <option value="All">All severity</option>
                    <option value="Info">Info</option>
                    <option value="Warning">Warning</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
                  <CheckCircle2 className="h-4 w-4 text-slate-400" />
                  <select className="text-xs bg-transparent outline-none dark:text-slate-200 cursor-pointer" value={outcome} onChange={(e) => setOutcome(e.target.value as any)}>
                    <option value="All">All outcomes</option>
                    <option value="Success">Success</option>
                    <option value="Pending">Pending</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
                  <User className="h-4 w-4 text-slate-400" />
                  <select className="text-xs bg-transparent outline-none dark:text-slate-200 cursor-pointer" value={actor} onChange={(e) => setActor(e.target.value)}>
                    {actorOptions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className={cx(
                    "px-3 py-2 rounded-2xl border text-xs font-semibold transition-all",
                    onlyMine ? "text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  )}
                  style={onlyMine ? { background: ORANGE, borderColor: ORANGE } : undefined}
                  onClick={() => setOnlyMine((v) => !v)}
                >
                  My actions
                </button>

                <SoftButton tone="orange" onClick={selectAllVisible}>
                  Select all
                </SoftButton>
                <SoftButton disabled={selected.size === 0} onClick={clearSelection} title={selected.size === 0 ? "Nothing selected" : "Clear"}>
                  Clear
                </SoftButton>

                <SoftButton disabled={!canExport} title={!canExport ? "Requires audit.export" : "Export CSV"} onClick={() => exportSelected("csv")}>
                  CSV
                </SoftButton>
              </div>

              <div className="flex-1" />

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-[min(520px,100%)]">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs dark:text-slate-100 transition-colors outline-none focus:ring-1 focus:ring-orange-500/30"
                    placeholder="Search events, ids, actors, modules"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <main className="w-full px-4 md:px-6 py-6 transition-all">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-colors">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <div className="text-sm font-semibold dark:text-slate-50">Events</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Click a row to view details.</div>
                </div>
                <Pill icon={<ShieldCheck className="h-4 w-4" style={{ color: GREEN }} />} text="Audit enabled" tone="good" />
              </div>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                <table className="w-full min-w-[1000px] text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Sel</th>
                      <th className="py-3">Time</th>
                      <th className="py-3">Actor</th>
                      <th className="py-3">Module</th>
                      <th className="py-3">Action</th>
                      <th className="py-3">Entity</th>
                      <th className="py-3">Severity</th>
                      <th className="py-3">Outcome</th>
                      <th className="py-3 text-right pr-4">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => openEvent(e.id)}>
                        <td className="py-4 px-4" onClick={(evt) => evt.stopPropagation()}>
                          <input type="checkbox" className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" checked={selected.has(e.id)} onChange={() => toggleSelected(e.id)} />
                        </td>
                        <td className="py-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{relTime(e.ts)}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{fmtDateTime(e.ts)}</div>
                        </td>
                        <td className="py-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{e.actor?.handle || e.actor?.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{e.actor?.role || ""}</div>
                        </td>
                        <td className="py-4 font-medium dark:text-slate-300">{e.module}</td>
                        <td className="py-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{e.action}</div>
                        </td>
                        <td className="py-4">
                          <div className="text-slate-700 dark:text-slate-300 font-medium">{e.entity?.type}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{e.entity?.id || e.entity?.name || "—"}</div>
                        </td>
                        <td className="py-4">
                          <StatusPill kind="severity" value={e.severity} />
                        </td>
                        <td className="py-4">
                          <StatusPill kind="outcome" value={e.outcome} />
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 inline" />
                        </td>
                      </tr>
                    ))}

                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-500">
                          No events match current filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

          </main>

          <Drawer open={drawerOpen} title={active ? active.action : "Event"} subtitle={active ? `${active.id} · ${active.module}` : undefined} onClose={() => setDrawerOpen(false)}>
            {!active ? (
              <div className="text-xs text-slate-500">No event selected.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-50">{active.action}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{fmtDateTime(active.ts)}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusPill kind="severity" value={active.severity} />
                        <StatusPill kind="outcome" value={active.outcome} />
                        <Pill icon={<LayoutGrid className="h-4 w-4" />} text={active.module} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Actor</div>
                      <div className="text-sm font-bold dark:text-slate-200">{active.actor?.handle || active.actor?.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{active.actor?.role || ""}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Entity</div>
                      <div className="text-sm font-bold dark:text-slate-200">{active.entity?.type}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{active.entity?.id || "—"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{active.entity?.name || ""}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Security</div>
                      <div className="text-sm font-bold dark:text-slate-200">{active.ip ? active.ip : "Hidden"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{active.location ? active.location : "Hidden"}</div>
                      {!canViewSensitive ? (
                        <div className="mt-2 text-[10px] text-amber-600 font-medium">Sensitive fields hidden.</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <SoftButton
                      tone="orange"
                      onClick={() => {
                        navigator.clipboard?.writeText(JSON.stringify(active, null, 2));
                        pushToast("Copied event JSON.", "success");
                      }}
                    >
                      <ClipboardCopy className="h-4 w-4" /> Copy JSON
                    </SoftButton>
                    <SoftButton
                      onClick={() => {
                        navigator.clipboard?.writeText(active.id);
                        pushToast("Copied event ID.", "success");
                      }}
                    >
                      <Copy className="h-4 w-4" /> Copy ID
                    </SoftButton>
                    <div className="flex-1" />
                    <SoftButton
                      disabled={!canExport}
                      title={!canExport ? "Requires audit.export" : "Export this event"}
                      onClick={() => {
                        setSelected(new Set([active.id]));
                        exportSelected("json");
                      }}
                    >
                      <Download className="h-4 w-4" /> Export
                    </SoftButton>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <div className="text-sm font-bold dark:text-slate-50">Metadata</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Raw event metadata.</div>
                  <pre className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] overflow-auto dark:text-slate-300">{JSON.stringify(active.meta || {}, null, 2)}</pre>
                </div>
              </div>
            )}
          </Drawer>

          <Modal open={exportOpen} title={exportMode === "json" ? "Export JSON" : "Export CSV"} subtitle={selected.size ? `${selected.size} selected` : `${filtered.length} visible`} onClose={() => setExportOpen(false)}>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="text-xs font-bold dark:text-slate-200">Export preview</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Mode: <span className="font-bold text-orange-600 dark:text-orange-400">{exportMode.toUpperCase()}</span> · Rows: <span className="font-bold text-slate-700 dark:text-slate-200">{selectedRows.length}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="text-xs font-bold dark:text-slate-200">Data</div>
                  <SoftButton
                    onClick={() => {
                      navigator.clipboard?.writeText(exportPayload);
                      pushToast("Copied export.", "success");
                    }}
                  >
                    <ClipboardCopy className="h-4 w-4" /> Copy
                  </SoftButton>
                </div>
                <pre className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] overflow-auto max-h-[40vh] dark:text-slate-300">{exportPayload}</pre>
              </div>
            </div>
          </Modal>

          <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
            <div className="w-full px-4 md:px-6 py-6 text-xs text-slate-500 dark:text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>© {new Date().getFullYear()} MyLiveDealz. Creator Platform Audit Log.</div>
              <button type="button" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 inline-flex items-center gap-2 transition-colors" onClick={() => pushToast("Back to Creator Home.", "success")}>
                Back to Creator Home <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
