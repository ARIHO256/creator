import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  Info,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

/**
 * Ops Exports Center (Previewable)
 * Route: /ops/exports
 * Focus:
 * - Export jobs queue
 * - Templates
 * - Schedules
 * - Destinations
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = {
  id: string;
  title: string;
  message?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
};

type ExportJobStatus = "Queued" | "Running" | "Completed" | "Failed";
type ExportJob = {
  id: string;
  name: string;
  dataset: string;
  format: string;
  destination: string;
  status: ExportJobStatus;
  progress: number;
  createdAt: string;
  requestedBy: string;
  rows: number;
  size: string;
  expiresAt: string | null;
  params: Record<string, string>;
  logs: string[];
  error?: string | null;
};

type ExportTemplate = {
  id: string;
  name: string;
  dataset: string;
  format: string;
  destination: string;
  note: string;
  lastRunAt: string | null;
};

type ExportSchedule = {
  id: string;
  templateId: string;
  name: string;
  frequency: string;
  nextRunAt: string;
  enabled: boolean;
};

type CreateDraft = {
  dataset: string;
  format: string;
  destination: string;
  range: string;
  note: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "orange" | "danger" | "slate" }) {
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

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
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

function ProgressBar({ value, tone = "green" }: { value: number; tone?: "green" | "orange" | "danger" }) {
  const v = clamp(Number(value || 0), 0, 100);
  const bar = tone === "orange" ? "bg-orange-500" : tone === "danger" ? "bg-rose-500" : "bg-emerald-500";
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className={cx("h-2 rounded-full", bar)} style={{ width: `${v}%` }} />
    </div>
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

function buildJobs(): ExportJob[] {
  const now = Date.now();
  const agoM = (m: number) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "EXP-90218",
      name: "Orders - last 7 days",
      dataset: "Orders",
      format: "CSV",
      destination: "Download",
      status: "Completed",
      progress: 100,
      createdAt: agoM(22),
      requestedBy: "SellerSeller",
      rows: 1842,
      size: "2.3 MB",
      expiresAt: agoM(-60),
      params: { range: "7d", filters: "Status=All" },
      logs: ["Queued", "Processing", "Completed"],
    },
    {
      id: "EXP-90217",
      name: "Payout statement - monthly",
      dataset: "Finance",
      format: "PDF",
      destination: "Email",
      status: "Running",
      progress: 62,
      createdAt: agoM(14),
      requestedBy: "Finance Ops",
      rows: 0,
      size: "-",
      expiresAt: null,
      params: { month: "Current", filters: "Wallets=All" },
      logs: ["Queued", "Processing"],
    },
    {
      id: "EXP-90216",
      name: "Listings - compliance pack",
      dataset: "Compliance",
      format: "ZIP",
      destination: "SFTP",
      status: "Failed",
      progress: 18,
      createdAt: agoM(55),
      requestedBy: "Compliance Desk",
      rows: 0,
      size: "-",
      expiresAt: null,
      params: { marketplace: "EVmart", filters: "State=warn/issue" },
      error: "Missing permission for remote destination.",
      logs: ["Queued", "Processing", "Failed: Permission denied"],
    },
    {
      id: "EXP-90215",
      name: "Wholesale RFQs - urgent",
      dataset: "RFQs",
      format: "XLSX",
      destination: "Download",
      status: "Queued",
      progress: 0,
      createdAt: agoM(3),
      requestedBy: "SellerSeller",
      rows: 0,
      size: "-",
      expiresAt: null,
      params: { range: "24h", filters: "Urgent=true" },
      logs: ["Queued"],
    },
  ];
}

function buildTemplates(): ExportTemplate[] {
  return [
    {
      id: "TPL-1001",
      name: "Orders export - operations",
      dataset: "Orders",
      format: "CSV",
      destination: "Download",
      note: "Default ops export for reconciliation",
      lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: "TPL-1002",
      name: "Payout statement - monthly",
      dataset: "Finance",
      format: "PDF",
      destination: "Email",
      note: "Payout report for accounting",
      lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    },
    {
      id: "TPL-1003",
      name: "Listings compliance pack",
      dataset: "Compliance",
      format: "ZIP",
      destination: "SFTP",
      note: "Evidence pack for regulated desks",
      lastRunAt: null,
    },
  ];
}

function buildSchedules(): ExportSchedule[] {
  const now = Date.now();
  const inM = (m: number) => new Date(now + m * 60_000).toISOString();
  return [
    {
      id: "SCH-301",
      templateId: "TPL-1001",
      name: "Daily orders export",
      frequency: "Daily",
      nextRunAt: inM(680),
      enabled: true,
    },
    {
      id: "SCH-302",
      templateId: "TPL-1002",
      name: "Monthly payout statement",
      frequency: "Monthly",
      nextRunAt: inM(9800),
      enabled: true,
    },
    {
      id: "SCH-303",
      templateId: "TPL-1003",
      name: "Weekly compliance pack",
      frequency: "Weekly",
      nextRunAt: inM(2150),
      enabled: false,
    },
  ];
}

function statusTone(status: ExportJobStatus) {
  if (status === "Completed") return "green";
  if (status === "Failed") return "danger";
  if (status === "Running") return "orange";
  return "slate";
}

function datasetTone(dataset: string) {
  if (dataset === "Compliance") return "orange";
  if (dataset === "Finance") return "orange";
  return "slate";
}

function fmtPct(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0%";
  return `${Math.round(v)}%`;
}

function SegTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {label}
    </button>
  );
}

export default function OpsExportsCenterPreviewable() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState("Jobs");

  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getOpsExports().then((payload) => {
      if (!active) return;
      const rows = Array.isArray((payload as { jobs?: unknown[] }).jobs)
        ? ((payload as { jobs?: Array<Record<string, unknown>> }).jobs ?? [])
        : [];
      setJobs(
        rows.map((entry) => {
          const meta = ((entry.metadata ?? {}) as Record<string, unknown>);
          return {
            id: String(entry.id ?? ""),
            name: String(meta.name ?? entry.type ?? "Export job"),
            dataset: String(meta.dataset ?? entry.type ?? "Dataset"),
            format: String(entry.format ?? meta.format ?? "CSV"),
            destination: String(meta.destination ?? "Download"),
            status: String(entry.status ?? "Queued").charAt(0) + String(entry.status ?? "Queued").slice(1).toLowerCase(),
            progress: Number(meta.progress ?? 0),
            createdAt: String(entry.requestedAt ?? new Date().toISOString()),
            requestedBy: String(meta.requestedBy ?? "Seller"),
            rows: Number(meta.rows ?? 0),
            size: String(meta.size ?? "-"),
            expiresAt: meta.expiresAt ? String(meta.expiresAt) : null,
            params: (meta.params as Record<string, string> | undefined) ?? {},
            logs: Array.isArray(meta.logs) ? meta.logs.map((item) => String(item)) : [],
            error: meta.error ? String(meta.error) : null,
          } satisfies ExportJob;
        })
      );
      setTemplates(
        Array.isArray((payload as { templates?: unknown[] }).templates)
          ? ((payload as { templates?: Array<ExportTemplate> }).templates ?? [])
          : []
      );
      setSchedules(
        Array.isArray((payload as { schedules?: unknown[] }).schedules)
          ? ((payload as { schedules?: Array<ExportSchedule> }).schedules ?? [])
          : []
      );
    });

    return () => {
      active = false;
    };
  }, []);

  // Filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [dataset, setDataset] = useState("All");
  const [format, setFormat] = useState("All");

  const filteredJobs = useMemo(() => {
    const query = q.trim().toLowerCase();
    return jobs
      .filter((j) => (status === "All" ? true : j.status === status))
      .filter((j) => (dataset === "All" ? true : j.dataset === dataset))
      .filter((j) => (format === "All" ? true : j.format === format))
      .filter((j) => {
        if (!query) return true;
        const hay = [j.id, j.name, j.dataset, j.format, j.destination, j.status, j.requestedBy].join(" ").toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, q, status, dataset, format]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const queued = jobs.filter((x) => x.status === "Queued").length;
    const running = jobs.filter((x) => x.status === "Running").length;
    const completed = jobs.filter((x) => x.status === "Completed").length;
    const failed = jobs.filter((x) => x.status === "Failed").length;
    return { total, queued, running, completed, failed };
  }, [jobs]);

  // Job details drawer
  const [activeId, setActiveId] = useState<string | null>(jobs[0]?.id || null);
  const active = useMemo(() => jobs.find((j) => j.id === activeId) || null, [jobs, activeId]);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create export drawer
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createDraft, setCreateDraft] = useState<CreateDraft>({
    dataset: "Orders",
    format: "CSV",
    destination: "Download",
    range: "7d",
    note: "",
  });

  useEffect(() => {
    if (!createOpen) return;
    setCreateStep(1);
    setCreateDraft({ dataset: "Orders", format: "CSV", destination: "Download", range: "7d", note: "" });
  }, [createOpen]);

  const simulateRun = (jobId: string) => {
    // Light demo simulation: progress ticks then completes.
    let ticks = 0;
    const t = window.setInterval(() => {
      ticks += 1;
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== jobId) return j;
          const base = j.status === "Queued" ? 8 : j.progress || 0;
          const next = clamp(base + 16, 0, 100);
          const nextStatus = next >= 100 ? "Completed" : "Running";
          return {
            ...j,
            status: nextStatus,
            progress: next,
            logs: next >= 100 ? [...(j.logs || []), "Completed"] : [...(j.logs || []), "Processing"],
            rows: next >= 100 ? j.rows || Math.floor(500 + Math.random() * 3000) : j.rows,
            size: next >= 100 ? j.size || `${(1 + Math.random() * 6).toFixed(1)} MB` : j.size,
            expiresAt: next >= 100 ? new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() : j.expiresAt,
          };
        })
      );
      if (ticks >= 6) window.clearInterval(t);
    }, 420);
  };

  const createExport = () => {
    const id = `EXP-${Math.floor(90000 + Math.random() * 9999)}`;
    const name = `${createDraft.dataset} - ${createDraft.range}`;

    const job: ExportJob = {
      id,
      name,
      dataset: createDraft.dataset,
      format: createDraft.format,
      destination: createDraft.destination,
      status: "Queued",
      progress: 0,
      createdAt: new Date().toISOString(),
      requestedBy: "SellerSeller",
      rows: 0,
      size: "-",
      expiresAt: null,
      params: { range: createDraft.range, note: createDraft.note || "-" },
      logs: ["Queued"],
    };

    setJobs((s) => [job, ...s]);
    setCreateOpen(false);
    pushToast({
      title: "Export created",
      message: `${job.id} queued.`,
      tone: "success",
      action: {
        label: "Open",
        onClick: () => {
          setActiveId(job.id);
          setDetailOpen(true);
        },
      },
    });

    window.setTimeout(() => simulateRun(job.id), 350);
  };

  const refresh = () => {
    pushToast({ title: "Refreshed", message: "Latest export jobs loaded (demo).", tone: "success" });
    // Demo: nudge queued jobs
    setJobs((prev) =>
      prev.map((j) => {
        if (j.status !== "Queued") return j;
        return { ...j, progress: Math.min(10, j.progress || 0), logs: [...(j.logs || []), "Picked up by worker"] };
      })
    );
  };

  const clearFilters = () => {
    setQ("");
    setStatus("All");
    setDataset("All");
    setFormat("All");
    pushToast({ title: "Filters cleared", tone: "default" });
  };

  const bg =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Exports Center</div>
                <Badge tone="slate">/ops/exports</Badge>
                <Badge tone="slate">Ops</Badge>
                <Badge tone="orange">Premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Export jobs, templates, schedules and destinations. Safe actions only.
              </div>
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
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New export
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <GlassCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Total</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{stats.total}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Queued</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{stats.queued}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Running</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{stats.running}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Completed</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{stats.completed}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Failed</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{stats.failed}</div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {["Jobs", "Templates", "Schedules", "Destinations"].map((t) => (
              <SegTab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
            ))}
            <span className="ml-auto">
              <Badge tone="slate">Exports</Badge>
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
          >
            {tab === "Jobs" ? (
              <div className="grid gap-4 lg:grid-cols-12">
                {/* Left: filters + list */}
                <div className="lg:col-span-8">
                  <GlassCard className="p-4">
                    <div className="grid gap-3 md:grid-cols-12 md:items-center">
                      <div className="relative md:col-span-6">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Search job id, name, dataset, destination"
                          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="relative">
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["All", "Queued", "Running", "Completed", "Failed"].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="relative">
                          <select
                            value={dataset}
                            onChange={(e) => setDataset(e.target.value)}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["All", "Orders", "Listings", "RFQs", "Finance", "Compliance"].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="relative">
                          <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["All", "CSV", "XLSX", "PDF", "ZIP"].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>

                      <div className="md:col-span-12 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                          <X className="h-4 w-4" />
                          Clear filters
                        </button>

                        <div className="ml-auto">
                          <Badge tone="slate">{filteredJobs.length} shown</Badge>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="mt-3 overflow-hidden">
                    <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Export jobs</div>
                          <Badge tone="slate">Queue</Badge>
                        </div>
                        <div className="text-xs font-semibold text-slate-500">Open a job to view logs and actions</div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200/70">
                      {filteredJobs.map((j) => {
                        const isActive = j.id === activeId;
                        return (
                          <button
                            key={j.id}
                            type="button"
                            onClick={() => {
                              setActiveId(j.id);
                              setDetailOpen(true);
                            }}
                            className={cx(
                              "w-full px-4 py-4 text-left transition",
                              isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", j.status === "Failed" ? "bg-rose-50 text-rose-700" : j.status === "Running" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="truncate text-sm font-black text-slate-900">{j.name}</div>
                                  <Badge tone={datasetTone(j.dataset)}>{j.dataset}</Badge>
                                  <Badge tone="slate">{j.format}</Badge>
                                  <Badge tone="slate">{j.destination}</Badge>
                                  <Badge tone={statusTone(j.status)}>{j.status}</Badge>
                                  <span className="ml-auto text-[11px] font-semibold text-slate-500">{fmtTime(j.createdAt)}</span>
                                </div>

                                <div className="mt-2 grid gap-2 md:grid-cols-12 md:items-center">
                                  <div className="md:col-span-8">
                                    <ProgressBar value={j.progress} tone={statusTone(j.status) === "danger" ? "danger" : statusTone(j.status) === "orange" ? "orange" : "green"} />
                                  </div>
                                  <div className="md:col-span-4 flex items-center justify-between gap-2">
                                    <div className="text-[11px] font-extrabold text-slate-600">{fmtPct(j.progress)}</div>
                                    <div className="text-[11px] font-semibold text-slate-500">By {j.requestedBy}</div>
                                  </div>
                                </div>

                                {j.status === "Failed" ? (
                                  <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50/60 px-3 py-2 text-[11px] font-semibold text-rose-800">
                                    {j.error || "Export failed"}
                                  </div>
                                ) : null}

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      safeCopy(j.id);
                                      pushToast({ title: "Copied", message: "Job ID copied.", tone: "success" });
                                    }}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                  >
                                    <Copy className="h-4 w-4" />
                                    Copy ID
                                  </button>

                                  {j.status === "Completed" ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        pushToast({ title: "Download", message: "Downloading file (demo).", tone: "default" });
                                      }}
                                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                      style={{ background: TOKENS.green }}
                                    >
                                      <Download className="h-4 w-4" />
                                      Download
                                    </button>
                                  ) : j.status === "Failed" ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, status: "Queued", progress: 0, logs: ["Queued"], error: null } : x)));
                                        simulateRun(j.id);
                                        pushToast({ title: "Retry started", message: "Job re-queued (demo).", tone: "success" });
                                      }}
                                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                      style={{ background: TOKENS.orange }}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                      Retry
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        simulateRun(j.id);
                                        pushToast({ title: "Run", message: "Processing started (demo).", tone: "default" });
                                      }}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                      Run now
                                    </button>
                                  )}

                                  <span className="ml-auto"><ChevronRight className="h-4 w-4 text-slate-300" /></span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {filteredJobs.length === 0 ? (
                        <div className="p-6">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                            <div className="flex items-start gap-3">
                              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                                <Filter className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="text-lg font-black text-slate-900">No jobs found</div>
                                <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or creating a new export.</div>
                                <button
                                  type="button"
                                  onClick={() => setCreateOpen(true)}
                                  className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                                  style={{ background: TOKENS.green }}
                                >
                                  <Plus className="h-4 w-4" />
                                  New export
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </GlassCard>
                </div>

                {/* Right: tips */}
                <div className="lg:col-span-4">
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">Ops guidance</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Best practice and safe defaults</div>
                      </div>
                      <Badge tone="slate">Tips</Badge>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                            <Check className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-emerald-900">Keep exports minimal</div>
                            <div className="mt-1 text-xs font-semibold text-emerald-900/70">Use templates to keep columns consistent and reduce mistakes.</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Destination checks</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">Failed exports are often missing destination permissions. Check Destinations tab.</div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setTab("Templates");
                          pushToast({ title: "Templates", message: "Open templates to standardize exports.", tone: "default" });
                        }}
                        className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        Open templates
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTab("Schedules");
                          pushToast({ title: "Schedules", message: "Schedule recurring exports (demo).", tone: "default" });
                        }}
                        className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        Open schedules
                      </button>
                    </div>
                  </GlassCard>
                </div>
              </div>
            ) : null}

            {tab === "Templates" ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <GlassCard className="overflow-hidden">
                    <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Templates</div>
                          <Badge tone="slate">{templates.length}</Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const id = makeId("TPL");
                            const next = {
                              id: `TPL-${id.slice(-4)}`,
                              name: "New template",
                              dataset: "Orders",
                              format: "CSV",
                              destination: "Download",
                              note: "",
                              lastRunAt: null,
                            };
                            setTemplates((s) => [next, ...s]);
                            pushToast({ title: "Template created", message: "Edit it (demo).", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Plus className="h-4 w-4" />
                          New template
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200/70">
                      {templates.map((t) => (
                        <div key={t.id} className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-black text-slate-900">{t.name}</div>
                            <Badge tone={datasetTone(t.dataset)}>{t.dataset}</Badge>
                            <Badge tone="slate">{t.format}</Badge>
                            <Badge tone="slate">{t.destination}</Badge>
                            <span className="ml-auto text-[11px] font-semibold text-slate-500">
                              {t.lastRunAt ? `Last run ${fmtTime(t.lastRunAt)}` : "Never run"}
                            </span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-500">{t.note || "No note"}</div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const jobId = `EXP-${Math.floor(90000 + Math.random() * 9999)}`;
                                const job: ExportJob = {
                                  id: jobId,
                                  name: `From template: ${t.name}`,
                                  dataset: t.dataset,
                                  format: t.format,
                                  destination: t.destination,
                                  status: "Queued",
                                  progress: 0,
                                  createdAt: new Date().toISOString(),
                                  requestedBy: "SellerSeller",
                                  rows: 0,
                                  size: "-",
                                  expiresAt: null,
                                  params: { templateId: t.id },
                                  logs: ["Queued"],
                                };
                                setJobs((s) => [job, ...s]);
                                simulateRun(job.id);
                                pushToast({ title: "Template run", message: `${job.id} queued.`, tone: "success" });
                                setTab("Jobs");
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <RefreshCw className="h-4 w-4" />
                              Run
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(JSON.stringify(t, null, 2));
                                pushToast({ title: "Copied", message: "Template JSON copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy JSON
                            </button>

                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Edit", message: "Wire to template editor.", tone: "default" })}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Settings className="h-4 w-4" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSchedules((s) => [
                                  {
                                    id: `SCH-${Math.floor(300 + Math.random() * 900)}`,
                                    templateId: t.id,
                                    name: `Schedule: ${t.name}`,
                                    frequency: "Weekly",
                                    nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
                                    enabled: true,
                                  },
                                  ...s,
                                ]);
                                pushToast({ title: "Scheduled", message: "Weekly schedule created (demo).", tone: "success" });
                              }}
                              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                            >
                              <Calendar className="h-4 w-4" />
                              Schedule
                            </button>
                          </div>
                        </div>
                      ))}

                      {templates.length === 0 ? (
                        <div className="p-6">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                            <div className="text-lg font-black text-slate-900">No templates yet</div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">Create a template to standardize export columns and destinations.</div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </GlassCard>
                </div>

                <div className="lg:col-span-4">
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">Template rules</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Consistency wins</div>
                      </div>
                      <Badge tone="slate">Guide</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="text-sm font-black text-slate-900">1) Define columns once</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Keep the same schema for recurring exports.</div>
                      </div>
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="text-sm font-black text-slate-900">2) Use safe destinations</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Prefer Download or Email until SFTP permissions are verified.</div>
                      </div>
                      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Premium idea</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">Add approval rules for sensitive templates (payouts, personal data).</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>
            ) : null}

            {tab === "Schedules" ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <GlassCard className="overflow-hidden">
                    <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Schedules</div>
                          <Badge tone="slate">{schedules.length}</Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => pushToast({ title: "Schedule", message: "Wire schedule builder.", tone: "default" })}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Plus className="h-4 w-4" />
                          New schedule
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200/70">
                      {schedules.map((s) => {
                        const tpl = templates.find((t) => t.id === s.templateId);
                        return (
                          <div key={s.id} className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-black text-slate-900">{s.name}</div>
                              <Badge tone="slate">{s.frequency}</Badge>
                              {tpl ? <Badge tone={datasetTone(tpl.dataset)}>{tpl.dataset}</Badge> : <Badge tone="slate">Template</Badge>}
                              <span className="ml-auto"><Badge tone={s.enabled ? "green" : "orange"}>{s.enabled ? "Enabled" : "Disabled"}</Badge></span>
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Next run {fmtTime(s.nextRunAt)}</div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)));
                                  pushToast({ title: "Updated", message: s.enabled ? "Schedule disabled." : "Schedule enabled.", tone: "success" });
                                }}
                                className={cx(
                                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold",
                                  s.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-orange-200 bg-orange-50 text-orange-800"
                                )}
                              >
                                <Check className="h-4 w-4" />
                                {s.enabled ? "Disable" : "Enable"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!tpl) {
                                    pushToast({ title: "Missing template", message: "Template not found.", tone: "warning" });
                                    return;
                                  }
                                  const jobId = `EXP-${Math.floor(90000 + Math.random() * 9999)}`;
                                  const job: ExportJob = {
                                    id: jobId,
                                    name: `From schedule: ${s.name}`,
                                    dataset: tpl.dataset,
                                    format: tpl.format,
                                    destination: tpl.destination,
                                    status: "Queued",
                                    progress: 0,
                                    createdAt: new Date().toISOString(),
                                    requestedBy: "Scheduler",
                                    rows: 0,
                                    size: "-",
                                    expiresAt: null,
                                    params: { scheduleId: s.id, templateId: tpl.id },
                                    logs: ["Queued"],
                                  };
                                  setJobs((x) => [job, ...x]);
                                  simulateRun(job.id);
                                  pushToast({ title: "Run now", message: `${job.id} queued.`, tone: "success" });
                                  setTab("Jobs");
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.green }}
                              >
                                <RefreshCw className="h-4 w-4" />
                                Run now
                              </button>

                              <button
                                type="button"
                                onClick={() => pushToast({ title: "Edit schedule", message: "Wire schedule editor.", tone: "default" })}
                                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Settings className="h-4 w-4" />
                                Edit
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {schedules.length === 0 ? (
                        <div className="p-6">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                            <div className="text-lg font-black text-slate-900">No schedules yet</div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">Create a schedule to run exports automatically.</div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </GlassCard>
                </div>

                <div className="lg:col-span-4">
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">Scheduling hints</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Avoid surprises</div>
                      </div>
                      <Badge tone="slate">Ops</Badge>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="text-sm font-black text-slate-900">Use off-peak hours</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Run heavy exports when operations are quiet.</div>
                      </div>
                      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Premium idea</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">Add SLA alerts if an export fails repeatedly.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>
            ) : null}

            {tab === "Destinations" ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">Destinations</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Configure where exports are delivered</div>
                      </div>
                      <Badge tone="slate">Controls</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Download</div>
                          <span className="ml-auto"><Badge tone="green">Ready</Badge></span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-500">Exports are generated and can be downloaded securely.</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => pushToast({ title: "Download policy", message: "Wire retention and permissions.", tone: "default" })}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Settings className="h-4 w-4" />
                            Policies
                          </button>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Email</div>
                          <span className="ml-auto"><Badge tone="green">Connected</Badge></span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-500">Send exports to recipients and groups.</div>
                        <div className="mt-3">
                          <div className="text-[11px] font-extrabold text-slate-600">Default recipients</div>
                          <input
                            defaultValue="ops@evzone.com, finance@evzone.com"
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                          <div className="mt-2 text-[11px] font-semibold text-slate-500">Premium: approvals for sensitive exports.</div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-orange-700" />
                          <div className="text-sm font-black text-orange-900">SFTP</div>
                          <span className="ml-auto"><Badge tone="orange">Verify</Badge></span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-orange-900/70">Recommended for enterprise pipelines.</div>
                        <div className="mt-3 grid gap-2">
                          <input
                            defaultValue="sftp://example.com/exports"
                            className="h-11 w-full rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => pushToast({ title: "Test connection", message: "Connection test (demo).", tone: "default" })}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.orange }}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Test connection
                          </button>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Cloud storage</div>
                          <span className="ml-auto"><Badge tone="slate">Planned</Badge></span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-500">Google Drive, Dropbox, OneDrive connectors.</div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => pushToast({ title: "Connect", message: "Wire connector authorization.", tone: "default" })}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Plus className="h-4 w-4" />
                            Connect
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Destination safety</div>
                        <span className="ml-auto"><Badge tone="slate">Policy</Badge></span>
                      </div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                        <li>Do not export buyer budget caps or CorporatePay limits to suppliers.</li>
                        <li>Use role based access for Finance and Compliance exports.</li>
                        <li>Set retention rules for downloaded files and shared links.</li>
                      </ul>
                    </div>
                  </GlassCard>
                </div>

                <div className="lg:col-span-4">
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">Quick actions</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Common tasks</div>
                      </div>
                      <Badge tone="slate">Ops</Badge>
                    </div>

                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => setTab("Jobs")}
                        className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                            <FileText className="h-4 w-4 text-slate-700" />
                          </span>
                          Review jobs
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setTab("Templates")}
                        className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                            <Settings className="h-4 w-4 text-slate-700" />
                          </span>
                          Manage templates
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        New export
                      </button>
                    </div>
                  </GlassCard>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Job detail drawer */}
      <Drawer
        open={detailOpen}
        title={active ? `Export job · ${active.id}` : "Export job"}
        subtitle={active ? `${active.dataset} · ${active.format} · ${active.destination} · ${active.status}` : ""}
        onClose={() => setDetailOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a job first.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", active.status === "Failed" ? "bg-rose-50 text-rose-700" : active.status === "Running" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">{active.name}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Requested by {active.requestedBy} · {fmtTime(active.createdAt)}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={datasetTone(active.dataset)}>{active.dataset}</Badge>
                    <Badge tone="slate">{active.format}</Badge>
                    <Badge tone="slate">{active.destination}</Badge>
                    <Badge tone={statusTone(active.status)}>{active.status}</Badge>
                    {active.expiresAt ? <Badge tone="slate">Expires {fmtTime(active.expiresAt)}</Badge> : null}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar value={active.progress} tone={statusTone(active.status) === "danger" ? "danger" : statusTone(active.status) === "orange" ? "orange" : "green"} />
                <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Progress</span>
                  <span className="font-extrabold text-slate-700">{fmtPct(active.progress)}</span>
                </div>
              </div>

              {active.status === "Failed" ? (
                <div className="mt-3 rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-rose-700">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-rose-900">Failure reason</div>
                      <div className="mt-1 text-xs font-semibold text-rose-900/70">{active.error || "Export failed"}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(active.id);
                    pushToast({ title: "Copied", message: "Job ID copied.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy ID
                </button>

                {active.status === "Completed" ? (
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Download", message: "Downloading file (demo).", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                ) : null}

                {active.status === "Failed" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setJobs((prev) => prev.map((x) => (x.id === active.id ? { ...x, status: "Queued", progress: 0, logs: ["Queued"], error: null } : x)));
                      simulateRun(active.id);
                      pushToast({ title: "Retry started", message: "Job re-queued (demo).", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => pushToast({ title: "Share", message: "Wire share link policy.", tone: "default" })}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy share link
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Parameters</div>
                <span className="ml-auto"><Badge tone="slate">Safe</Badge></span>
              </div>
              <pre className="mt-3 overflow-auto rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-700">{JSON.stringify(active.params || {}, null, 2)}</pre>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Logs</div>
                <span className="ml-auto"><Badge tone="slate">{(active.logs || []).length}</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {(active.logs || []).slice(0, 20).map((l, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700">{l}</div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Premium note</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Add approval workflows for Finance and Compliance exports.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create export drawer */}
      <Drawer
        open={createOpen}
        title="New export"
        subtitle="Step based builder for datasets, format, destination and parameters"
        onClose={() => setCreateOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Step {createStep} of 3</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Safe defaults. Wire data scopes to backend.</div>
              </div>
              <Badge tone="slate">Builder</Badge>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCreateStep(s)}
                  className={cx(
                    "rounded-3xl border p-3 text-left",
                    createStep === s ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200/70 bg-white dark:bg-slate-900/70"
                  )}
                >
                  <div className="text-xs font-extrabold text-slate-700">{s === 1 ? "Dataset" : s === 2 ? "Destination" : "Review"}</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">{s === 1 ? "What to export" : s === 2 ? "Where it goes" : "Confirm and run"}</div>
                </button>
              ))}
            </div>
          </div>

          {createStep === 1 ? (
            <GlassCard className="p-4">
              <div className="text-sm font-black text-slate-900">Dataset and format</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Choose dataset, format and range.</div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Dataset</div>
                  <select
                    value={createDraft.dataset}
                    onChange={(e) => setCreateDraft((s) => ({ ...s, dataset: e.target.value }))}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
                  >
                    {["Orders", "Listings", "RFQs", "Finance", "Compliance"].map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Format</div>
                  <select
                    value={createDraft.format}
                    onChange={(e) => setCreateDraft((s) => ({ ...s, format: e.target.value }))}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
                  >
                    {["CSV", "XLSX", "PDF", "ZIP"].map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Range</div>
                  <select
                    value={createDraft.range}
                    onChange={(e) => setCreateDraft((s) => ({ ...s, range: e.target.value }))}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
                  >
                    {["24h", "7d", "30d", "90d"].map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-extrabold text-slate-600">Note</div>
                <input
                  value={createDraft.note}
                  onChange={(e) => setCreateDraft((s) => ({ ...s, note: e.target.value }))}
                  placeholder="Optional note for audit"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
            </GlassCard>
          ) : null}

          {createStep === 2 ? (
            <GlassCard className="p-4">
              <div className="text-sm font-black text-slate-900">Destination</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Choose where the export is delivered.</div>

              <div className="mt-4 flex flex-wrap gap-2">
                {["Download", "Email", "SFTP"].map((d) => (
                  <Chip
                    key={d}
                    active={createDraft.destination === d}
                    onClick={() => setCreateDraft((s) => ({ ...s, destination: d }))}
                    tone={d === "SFTP" ? "orange" : "green"}
                  >
                    {d}
                  </Chip>
                ))}
              </div>

              {createDraft.destination === "Email" ? (
                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="text-[11px] font-extrabold text-slate-600">Recipients</div>
                  <input
                    defaultValue="ops@evzone.com"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">Demo field. Wire to org settings.</div>
                </div>
              ) : null}

              {createDraft.destination === "SFTP" ? (
                <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Server className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">SFTP needs permissions</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">If this export fails, verify destination access in Destinations.</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </GlassCard>
          ) : null}

          {createStep === 3 ? (
            <GlassCard className="p-4">
              <div className="text-sm font-black text-slate-900">Review</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Confirm details then create the export job.</div>

              <div className="mt-4 grid gap-2">
                {[
                  { k: "Dataset", v: createDraft.dataset },
                  { k: "Format", v: createDraft.format },
                  { k: "Range", v: createDraft.range },
                  { k: "Destination", v: createDraft.destination },
                ].map((x) => (
                  <div key={x.k} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                    <div className="text-xs font-extrabold text-slate-600">{x.k}</div>
                    <div className="text-xs font-semibold text-slate-800">{x.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateStep((s) => Math.max(1, s - 1))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={createExport}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Create export
                </button>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">Privacy reminder</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Sensitive values must not be exported to suppliers. Enforce this in backend.</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ) : null}

          <div className="sticky bottom-0 -mx-4 mt-2 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Close
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateStep((s) => Math.max(1, s - 1))}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold",
                    createStep === 1 ? "cursor-not-allowed border-slate-100 text-slate-400" : "border-slate-200/70 text-slate-800"
                  )}
                  disabled={createStep === 1}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCreateStep((s) => Math.min(3, s + 1))}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                    createStep === 3 && "opacity-60"
                  )}
                  style={{ background: TOKENS.green }}
                  disabled={createStep === 3}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
