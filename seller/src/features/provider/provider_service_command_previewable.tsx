import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSellerCompatState } from "../../lib/frontendState";
import { AnimatePresence, motion } from "framer-motion";
import { useThemeMode } from "../../theme/themeMode";
import { useNavigate } from "react-router-dom";
import {
  AlarmClock,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Flame,
  Gauge,
  Info,
  LineChart,
  Loader2,
  MessageCircle,
  PauseCircle,
  PhoneCall,
  Play,
  Search,
  Sparkles,
  User,
  Users,
  Wand2,
  X,
} from "lucide-react";

/**
 * Service Command (Provider)
 * Route: /provider/service-command
 * Core: today’s schedule, queue summaries, next actions
 * Super premium: productivity cockpit, recommended actions, utilization insights
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
type ScheduleItem = {
  id: string;
  title: string;
  customer: string;
  service: string;
  startAt: string;
  endAt: string;
  channel: string;
  location: string;
  status: string;
};
type QueueItem = {
  id: string;
  customer: string;
  request: string;
  service: string;
  status: "New" | "In progress" | "Awaiting" | "Escalated";
  priority: "High" | "Medium" | "Low";
  channel: string;
  slaDueAt: string;
  score: number;
};
type ActionCard = {
  key: string;
  tone: "danger" | "orange" | "slate";
  title: string;
  desc: string;
  icon: React.ElementType;
  cta: string;
};
type ProviderMode = "Available" | "Busy";
type DateScope = "Today" | "Tomorrow" | "Week";
type QueueTab = "All" | QueueItem["status"];

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
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function fmtDay(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit" });
}

function minutesUntil(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.round((t - Date.now()) / 60000);
}

function riskFromDue(dueAtIso: string) {
  const mins = minutesUntil(dueAtIso);
  if (mins <= 0) return { tone: "danger", label: "Overdue" };
  if (mins <= 30) return { tone: "danger", label: "< 30m" };
  if (mins <= 120) return { tone: "orange", label: "< 2h" };
  return { tone: "slate", label: "On track" };
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
  tone = "light",
  disabled,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  tone?: "light" | "dark";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        disabled && "cursor-not-allowed opacity-60",
        tone === "dark"
          ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function SegTab({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <span>{label}</span>
      {typeof badge === "number" ? (
        <span className={cx("rounded-full px-2 py-0.5 text-[10px]", active ? "bg-white dark:bg-slate-900 text-slate-700" : "bg-slate-100 text-slate-700")}>
          {badge}
        </span>
      ) : null}
    </button>
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
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[92vw] max-w-[560px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 px-4 py-3">
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

function Sparkline({ points }) {
  const w = 220;
  const h = 64;
  const pad = 6;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const ys = points.map((p) => {
    const t = max === min ? 0.5 : (p - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  });
  const d = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block text-slate-800">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function seedSchedule(): ScheduleItem[] {
  const now = Date.now();
  const at = (mins: number) => new Date(now + mins * 60000).toISOString();

  return [
    {
      id: "SCH-2201",
      title: "Site Survey: EV charger installation",
      customer: "Kampala Logistics Ltd",
      service: "Installation",
      startAt: at(20),
      endAt: at(80),
      channel: "EVzone",
      location: "Nsambya, Kampala",
      status: "Upcoming",
    },
    {
      id: "SCH-2200",
      title: "Consultation: Fleet charging strategy",
      customer: "GreenRide Fleet",
      service: "Consultation",
      startAt: at(105),
      endAt: at(165),
      channel: "Video Call",
      location: "Online",
      status: "Upcoming",
    },
    {
      id: "SCH-2199",
      title: "Maintenance follow-up: Wallbox diagnostics",
      customer: "Amina K.",
      service: "Maintenance",
      startAt: at(-90),
      endAt: at(-30),
      channel: "WhatsApp",
      location: "Online",
      status: "Completed",
    },
  ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

function seedQueue(): QueueItem[] {
  const now = Date.now();
  const due = (mins: number) => new Date(now + mins * 60000).toISOString();

  return [
    {
      id: "Q-4107",
      customer: "Ibrahim H.",
      request: "Urgent booking: charger installation",
      service: "Installation",
      status: "New",
      priority: "High",
      channel: "WhatsApp",
      slaDueAt: due(18),
      score: 92,
    },
    {
      id: "Q-4106",
      customer: "Chen L.",
      request: "Request quote: 12-port charging station",
      service: "Quotation",
      status: "Awaiting",
      priority: "Medium",
      channel: "API",
      slaDueAt: due(120),
      score: 68,
    },
    {
      id: "Q-4105",
      customer: "Sarah T.",
      request: "Support: OCPP connectivity troubleshooting",
      service: "Support",
      status: "In progress",
      priority: "High",
      channel: "EVzone",
      slaDueAt: due(-5),
      score: 88,
    },
    {
      id: "Q-4104",
      customer: "Moses N.",
      request: "Reschedule consultation",
      service: "Consultation",
      status: "New",
      priority: "Low",
      channel: "EVzone",
      slaDueAt: due(360),
      score: 41,
    },
    {
      id: "Q-4103",
      customer: "Joy A.",
      request: "Dispute: service scope mismatch",
      service: "Support",
      status: "Escalated",
      priority: "High",
      channel: "EVzone",
      slaDueAt: due(45),
      score: 97,
    },
  ];
}

function calcUtilization(schedule: ScheduleItem[]) {
  // Demo math: count upcoming minutes in next 6h
  const horizonMins = 360;
  const now = Date.now();
  const upcoming = schedule
    .filter((s) => new Date(s.endAt).getTime() > now)
    .map((s) => {
      const start = Math.max(now, new Date(s.startAt).getTime());
      const end = Math.min(now + horizonMins * 60000, new Date(s.endAt).getTime());
      return Math.max(0, Math.round((end - start) / 60000));
    })
    .reduce((a, b) => a + b, 0);
  return { horizonMins, bookedMins: clamp(upcoming, 0, horizonMins) };
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const csv = toCsv(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "green" | "orange" | "danger" | "slate";
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className={cx(
            "h-2 rounded-full",
            tone === "green" ? "bg-emerald-500" : tone === "orange" ? "bg-orange-500" : tone === "danger" ? "bg-rose-500" : "bg-slate-400"
          )}
          style={{ width: `${clamp(Number(value) || 0, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  tone,
  icon: Icon,
  ctaLabel,
  onClick,
}: {
  title: string;
  desc: string;
  tone: "danger" | "orange" | "slate";
  icon: React.ElementType;
  ctaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full rounded-3xl border p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
        tone === "danger"
          ? "border-rose-200 bg-rose-50/60"
          : tone === "orange"
          ? "border-orange-200 bg-orange-50/60"
          : "border-slate-200/70 bg-white dark:bg-slate-900/70"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-3xl",
            tone === "danger"
              ? "bg-white dark:bg-slate-900 text-rose-700"
              : tone === "orange"
              ? "bg-white dark:bg-slate-900 text-orange-700"
              : "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-600">{desc}</div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800">
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ProviderServiceCommandPage() {
  const navigate = useNavigate();
  const { resolvedMode } = useThemeMode();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) =>
    setToasts((s) => s.filter((x) => x.id !== id));

  const [mode, setMode] = useState<ProviderMode>("Available");
  const [accepting, setAccepting] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [dateScope, setDateScope] = useState<DateScope>("Today");
  const [serviceLine, setServiceLine] = useState("All services");

  const [schedule] = useSellerCompatState("provider.serviceCommand.schedule", seedSchedule());
  const [queue, setQueue] = useMockState<QueueItem[]>("provider.serviceCommand.queue", seedQueue());

  const queueCounts = useMemo(() => {
    const map = { All: queue.length, New: 0, "In progress": 0, Awaiting: 0, Escalated: 0 };
    queue.forEach((q) => {
      map[q.status] = (map[q.status] || 0) + 1;
    });
    return map;
  }, [queue]);

  const [queueTab, setQueueTab] = useState<QueueTab>("All");
  const [qSearch, setQSearch] = useState("");

  const filteredQueue = useMemo(() => {
    const query = qSearch.trim().toLowerCase();
    return queue
      .filter((x) => (queueTab === "All" ? true : x.status === queueTab))
      .filter((x) => (serviceLine === "All services" ? true : x.service === serviceLine))
      .filter((x) => {
        if (!query) return true;
        return `${x.id} ${x.customer} ${x.request} ${x.service} ${x.status} ${x.channel}`.toLowerCase().includes(query);
      })
      .sort((a, b) => b.score - a.score);
  }, [queue, queueTab, qSearch, serviceLine]);

  const utilization = useMemo(() => calcUtilization(schedule), [schedule]);
  const utilPct = Math.round((utilization.bookedMins / Math.max(1, utilization.horizonMins)) * 100);

  const cockpit = useMemo(
    () => ({
      utilization: utilPct,
      response: 78,
      csat: 92,
      throughput: 64,
      trend: [42, 46, 50, 47, 55, 58, 61, 62, 66, 70, 74, 78],
    }),
    [utilPct]
  );

  const recommended = useMemo(() => {
    const list: ActionCard[] = [];
    const overdue = queue.filter((x) => minutesUntil(x.slaDueAt) <= 0);
    const soon = queue.filter((x) => minutesUntil(x.slaDueAt) > 0 && minutesUntil(x.slaDueAt) <= 30);
    const escalations = queue.filter((x) => x.status === "Escalated");

    if (overdue.length) {
      list.push({
        key: "overdue",
        tone: "danger",
        title: "SLA overdue requests",
        desc: `${overdue.length} request(s) are overdue. Send an ETA and assign immediately.`,
        icon: AlertTriangle,
        cta: "Fix now",
      });
    }

    if (escalations.length) {
      list.push({
        key: "escal",
        tone: "orange",
        title: "Escalations need triage",
        desc: `${escalations.length} escalation(s). Open a playbook and document actions.`,
        icon: Flame,
        cta: "Triage",
      });
    }

    if (soon.length) {
      list.push({
        key: "soon",
        tone: "orange",
        title: "SLA due soon",
        desc: `${soon.length} request(s) due within 30 minutes. Reply or reschedule.`,
        icon: AlarmClock,
        cta: "Send ETAs",
      });
    }

    if (!list.length) {
      list.push({
        key: "ok",
        tone: "slate",
        title: "Everything looks healthy",
        desc: "Keep intake open and focus on the next scheduled session.",
        icon: CheckCheck,
        cta: "Review schedule",
      });
    }

    return list.slice(0, 3);
  }, [queue]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => queue.find((x) => x.id === activeId) || null, [queue, activeId]);
  const updateQueueItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const runAction = (title: string, message?: string, tone: ToastTone = "default") =>
    pushToast({ title, message, tone });

  const headerDate = useMemo(() => {
    const d = new Date();
    return `${fmtDay(d.toISOString())}`;
  }, []);

  const serviceOptions = useMemo(() => {
    const set = new Set(queue.map((x) => x.service));
    return ["All services", ...Array.from(set)];
  }, [queue]);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          resolvedMode === "dark"
            ? "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.16) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.11) 0%, rgba(247,127,0,0.0) 55%), linear-gradient(180deg, #050B17 0%, #081122 45%, #050B17 100%)"
            : "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Service Command</div>
                <Badge tone="slate">/provider/service-command</Badge>
                <Badge tone="slate">{headerDate}</Badge>
                <Badge tone={mode === "Available" ? "green" : "orange"}>{mode}</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Provider operating center with schedule, intake queue, next actions and utilization.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                {[
                  { k: "Today", label: "Today" },
                  { k: "Tomorrow", label: "Tomorrow" },
                  { k: "Week", label: "This week" },
                ].map((x) => (
                  <button
                    key={x.k}
                    type="button"
                    onClick={() => {
                      setDateScope(x.k as DateScope);
                      runAction("Scope set", `Viewing ${x.label}.`, "default");
                    }}
                    className={cx(
                      "px-4 py-2 text-xs font-extrabold",
                      dateScope === x.k ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {x.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = mode === "Available" ? "Busy" : "Available";
                  setMode(next);
                  runAction("Presence updated", `You are now ${next}.`, next === "Available" ? "success" : "warning");
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: mode === "Available" ? TOKENS.green : TOKENS.orange }}
              >
                {mode === "Available" ? <PauseCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {mode === "Available" ? "Pause intake" : "Go available"}
              </button>

              <IconButton
                label="Help"
                onClick={() => navigate("/help-support")}
              >
                <Info className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </div>

        {/* Command strip */}
        <GlassCard className="p-4">
          <div className="grid gap-3 md:grid-cols-12 md:items-center">
            <div className="md:col-span-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Gauge className="h-4 w-4 text-slate-600" />
                  <div className="text-xs font-extrabold text-slate-700">Utilization next 6h</div>
                  <span className="ml-1"><Badge tone={utilPct >= 75 ? "green" : utilPct >= 55 ? "orange" : "slate"}>{utilPct}%</Badge></span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Clock className="h-4 w-4 text-slate-600" />
                  <div className="text-xs font-extrabold text-slate-700">Next session</div>
                  <span className="ml-1"><Badge tone="slate">{fmtTime(schedule.find((s) => s.status === "Upcoming")?.startAt || new Date().toISOString())}</Badge></span>
                </div>
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                <Filter className="h-4 w-4 text-slate-600" />
                <div className="text-xs font-extrabold text-slate-700">Service line</div>
                <div className="relative ml-auto">
                  <select
                    value={serviceLine}
                    onChange={(e) => {
                      setServiceLine(e.target.value);
                      runAction("Filter", `Service line: ${e.target.value}`, "default");
                    }}
                    className="h-9 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                  >
                    {serviceOptions.map((x) => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-slate-700" />
                  <div className="text-xs font-extrabold text-slate-700">Automation</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccepting((v) => !v);
                      runAction("Intake", `Accepting new requests: ${!accepting ? "On" : "Off"}`, "default");
                    }}
                    className={cx(
                      "rounded-2xl border px-3 py-1.5 text-xs font-extrabold",
                      accepting ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                    )}
                  >
                    {accepting ? "Intake On" : "Intake Off"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAutoAssign((v) => !v);
                      runAction("Auto-assign", `Auto-assign: ${!autoAssign ? "On" : "Off"}`, "default");
                    }}
                    className={cx(
                      "rounded-2xl border px-3 py-1.5 text-xs font-extrabold",
                      autoAssign ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                    )}
                  >
                    {autoAssign ? "Auto On" : "Auto Off"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Schedule */}
          <GlassCard className="lg:col-span-5 overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Today’s schedule</div>
                </div>
                <Badge tone="slate">{schedule.length} items</Badge>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-2">
                {schedule.map((s) => {
                  const upcoming = s.status === "Upcoming";
                  const started = new Date(s.startAt).getTime() <= Date.now() && new Date(s.endAt).getTime() > Date.now();
                  const statusTone = s.status === "Completed" ? "green" : started ? "orange" : "slate";

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                      className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", started ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}
                        >
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{s.title}</div>
                            <Badge tone={statusTone}>{started ? "In session" : s.status}</Badge>
                            <span className="ml-auto"><Badge tone="slate">{fmtTime(s.startAt)} - {fmtTime(s.endAt)}</Badge></span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            {s.customer} · {s.service} · {s.channel} · {s.location}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/provider/bookings/${encodeURIComponent(s.id)}`)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <ChevronRight className="h-4 w-4" />
                              View
                            </button>

                            {upcoming ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/provider/bookings/${encodeURIComponent(s.id)}?tab=checklist`)}
                                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.green }}
                              >
                                <Check className="h-4 w-4" />
                                Preflight
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => navigate(`/messages?thread=${encodeURIComponent(s.id)}`)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Message
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Premium schedule intelligence</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">
                      Predict overruns, suggest buffer time, and auto-send reminders based on channel.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Queue */}
          <GlassCard className="lg:col-span-7 overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <ListIcon />
                  <div className="text-sm font-black text-slate-900">Queue summaries</div>
                  <Badge tone="slate">{filteredQueue.length} visible</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      placeholder="Search queue"
                      className="h-10 w-[240px] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-xs font-extrabold text-slate-800 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQSearch("");
                      setQueueTab("All");
                      runAction("Queue", "Filters cleared.", "default");
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { k: "All", label: "All" },
                  { k: "New", label: "New" },
                  { k: "In progress", label: "In progress" },
                  { k: "Awaiting", label: "Awaiting" },
                  { k: "Escalated", label: "Escalated" },
                ].map((t) => (
                  <SegTab
                    key={t.k}
                    label={t.label}
                    active={queueTab === t.k}
                    badge={queueCounts[t.k] ?? 0}
                    onClick={() => setQueueTab(t.k as QueueTab)}
                  />
                ))}
              </div>
            </div>

            <div className="p-4">
              <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-4">Request</div>
                  <div className="col-span-2">Service</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">SLA</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filteredQueue.map((q) => {
                    const r = riskFromDue(q.slaDueAt);
                    const scoreTone = q.score >= 85 ? "green" : q.score >= 65 ? "orange" : "slate";
                    const statusTone = q.status === "Escalated" ? "danger" : q.status === "In progress" ? "orange" : q.status === "New" ? "slate" : "slate";

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setActiveId(q.id);
                          setDetailOpen(true);
                        }}
                        className="grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                      >
                        <div className="col-span-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-extrabold text-slate-900">{q.customer}</div>
                            <Badge tone={scoreTone}>{q.score}</Badge>
                          </div>
                          <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">{q.request}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{q.id}</span>
                            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{q.channel}</span>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <Badge tone="slate">{q.service}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone={statusTone}>{q.status}</Badge>
                          <Badge tone={q.priority === "High" ? "danger" : q.priority === "Medium" ? "orange" : "slate"}>{q.priority}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone={r.tone === "danger" ? "danger" : r.tone === "orange" ? "orange" : "slate"}>{r.label}</Badge>
                          <span className="text-[11px] font-extrabold text-slate-500">due {fmtTime(q.slaDueAt)}</span>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <span className="hidden md:inline-flex rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800">
                            Open
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {filteredQueue.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                        <div className="flex items-start gap-3">
                          <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                            <Sparkles className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-lg font-black text-slate-900">No queue items</div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">Try changing filters or clearing search.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQueueTab("Escalated");
                    const first = queue.find((q) => q.status === "Escalated");
                    if (first) {
                      setActiveId(first.id);
                      setDetailOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Sparkles className="h-4 w-4" />
                  Auto-triage
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccepting(false);
                    runAction("Paused", "Intake paused for 15 minutes.", "warning");
                    window.setTimeout(() => {
                      setAccepting(true);
                      runAction("Resumed", "Intake resumed.", "success");
                    }, 15 * 60 * 1000);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                >
                  <PauseCircle className="h-4 w-4" />
                  Pause intake 15m
                </button>

                <button
                  type="button"
                  onClick={() => {
                    downloadCsv("provider-queue.csv", filteredQueue);
                    runAction("Export", "Queue exported.", "default");
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <LineChart className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Productivity cockpit */}
          <GlassCard className="lg:col-span-8 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Productivity cockpit</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Utilization, response, quality, and throughput signals.</div>
              </div>
              <Badge tone="slate">Premium</Badge>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Momentum</div>
                  <span className="ml-auto"><Badge tone="slate">Last 12h</Badge></span>
                </div>
                <div className="mt-3"><Sparkline points={cockpit.trend} /></div>
                <div className="mt-2 text-[11px] font-semibold text-slate-500">Demo: response score trend.</div>
              </div>

              <div className="grid gap-3">
                <MiniMetric label="Utilization" value={cockpit.utilization} tone={cockpit.utilization >= 75 ? "green" : cockpit.utilization >= 55 ? "orange" : "slate"} />
                <MiniMetric label="Response score" value={cockpit.response} tone={cockpit.response >= 85 ? "green" : cockpit.response >= 65 ? "orange" : "slate"} />
                <MiniMetric label="CSAT" value={cockpit.csat} tone={cockpit.csat >= 85 ? "green" : "orange"} />
                <MiniMetric label="Throughput" value={cockpit.throughput} tone={cockpit.throughput >= 70 ? "green" : "orange"} />
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-orange-900">Recommended actions</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">High-impact next steps based on SLA and priority.</div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {recommended.map((a) => (
                      <ActionCard
                        key={a.key}
                        title={a.title}
                        desc={a.desc}
                        tone={a.tone}
                        icon={a.icon}
                        ctaLabel={a.cta}
                        onClick={() => {
                          if (a.key === "overdue") setQueueTab("In progress");
                          else if (a.key === "escal") setQueueTab("Escalated");
                          else if (a.key === "soon") setQueueTab("New");
                          else navigate("/provider/bookings");
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Utilization insights */}
          <GlassCard className="lg:col-span-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Utilization insights</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Capacity, availability, and focus suggestions.</div>
              </div>
              <Badge tone={utilPct >= 75 ? "green" : utilPct >= 55 ? "orange" : "slate"}>{utilPct}%</Badge>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Next 6 hours</div>
              </div>
              <div className="mt-3 h-3 rounded-full bg-slate-100">
                <div
                  className="h-3 rounded-full"
                  style={{ width: `${utilPct}%`, background: utilPct >= 75 ? "#10B981" : utilPct >= 55 ? TOKENS.orange : "#94A3B8" }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>{utilization.bookedMins}m booked</span>
                <span>{utilization.horizonMins - utilization.bookedMins}m free</span>
              </div>

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/provider/consultations/queue?focus=30m")}
                  className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                      <AlarmClock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">Create focus block</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Protect time for quotes and escalations</div>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/provider/portfolio?availability=next-slot")}
                  className="w-full rounded-3xl px-4 py-3 text-left text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900/15 text-white">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black">Advertise next slot</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-white/80">Improve conversion by showing availability</div>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-white/80" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    downloadCsv("provider-utilization.csv", [
                      {
                        scope: dateScope,
                        utilizationPct: utilPct,
                        bookedMinutes: utilization.bookedMins,
                        freeMinutes: utilization.horizonMins - utilization.bookedMins,
                        responseScore: cockpit.response,
                        csat: cockpit.csat,
                        throughput: cockpit.throughput,
                      },
                    ]);
                    runAction("Insights", "Utilization report exported.", "default");
                  }}
                  className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">Export utilization report</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Share with management</div>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Team presence</div>
                <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { name: "You", role: "Provider", state: mode },
                  { name: "Assistant 1", role: "Support", state: "Available" },
                  { name: "Assistant 2", role: "Support", state: "Busy" },
                ].map((p) => (
                  <div key={p.name} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-900">{p.name}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{p.role}</div>
                    </div>
                    <Badge tone={p.state === "Available" ? "green" : "orange"}>{p.state}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Queue detail drawer */}
      <Drawer
        open={detailOpen}
        title={active ? `Request · ${active.id}` : "Request"}
        subtitle={active ? `${active.customer} · ${active.service} · ${active.channel}` : "Select a request"}
        onClose={() => setDetailOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-black text-slate-900">No request selected</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">Choose a request from the queue.</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-900">{active.request}</div>
                    <span className="ml-auto"><Badge tone={active.priority === "High" ? "danger" : active.priority === "Medium" ? "orange" : "slate"}>{active.priority}</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Recommended score: {active.score}</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateQueueItem(active.id, { status: "In progress" });
                        runAction("Accepted", "Request moved to In progress.", "success");
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Check className="h-4 w-4" />
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/messages?thread=${encodeURIComponent(active.id)}&mode=call`)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <PhoneCall className="h-4 w-4" />
                      Call
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/messages?thread=${encodeURIComponent(active.id)}`)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        updateQueueItem(active.id, { status: "Escalated" });
                        navigate("/provider/disputes");
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-800"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Escalate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">SLA</div>
                <span className="ml-auto"><Badge tone={riskFromDue(active.slaDueAt).tone === "danger" ? "danger" : riskFromDue(active.slaDueAt).tone === "orange" ? "orange" : "slate"}>{riskFromDue(active.slaDueAt).label}</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Due at {fmtTime(active.slaDueAt)}. Keep updates frequent to prevent disputes.</div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">AI suggestion</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">
                    Send a short ETA now, then propose two time slots. If the customer confirms, auto-create a schedule slot.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (active) updateQueueItem(active.id, { status: "Awaiting" });
                setDetailOpen(false);
                runAction("Done", "Request updated.", "success");
              }}
              className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              Mark done
            </button>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function ListIcon() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-xl bg-slate-100 text-slate-700">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M5.5 4h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M5.5 8h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M5.5 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M2.3 4h.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M2.3 8h.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M2.3 12h.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
