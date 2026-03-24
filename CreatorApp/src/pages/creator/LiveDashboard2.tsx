'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Link as LinkIcon,
  Plus,
  Search,
  Users,
  Video,
  X,
  Zap,
  Instagram,
  Facebook,
  Youtube,
  Twitch
} from "lucide-react";
import { useNotification } from "../../contexts/NotificationContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useApiResource } from "../../hooks/useApiResource";
import { creatorApi } from "../../lib/creatorApi";
import { CircularProgress } from "@mui/material";


import { LiveBuilderDrawer, type LivePlatform, type LiveStatus, type LiveDesktopMode } from "./LiveBuilder2";

/**
 * Live Sessionz — Live Dashboard (Premium) — TSX
 * ---------------------------------------------------------
 * Key goals:
 * - Operations dashboard for Live sessionz (draft/scheduled/live/ended)
 * - "New Live Session" onboarding → leads to Live Builder (page)
 * - Supports deep-link from Dealz Marketplace:
 *    /live-dashboard?dealId=...&drawer=liveBuilder
 *   (opens Live Builder drawer, with prefill from dealId)
 *
 * Notes:
 * - Self-contained styling (TailwindCSS assumed)
 */

const ORANGE = "#f77f00";

const ROUTES = {
  dealzMarketplace: "/dealz-marketplace",
  liveDashboard: "/live-dashboard-2",
  liveBuilder: "/live-studio", // Assuming Live Studio is the builder page

  // Live Sessionz Pro subpages (wired from this dashboard)
  streamToPlatforms: "/Stream-platform",
  audienceNotifications: "/audience-notification",
  liveAlertsManager: "/live-alert",
  overlaysCTAsPro: "/overlays-ctas",
  safetyModeration: "/safety-moderation",
  postLivePublisher: "/post-live"
};

const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

/* Navigation */
// function safeNav(url: string) {
//   if (typeof window === "undefined") return;
//   window.location.assign(url);
// }

function parseSearch() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDT(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function combineDateTime(dateISO: string, timeHHMM: string) {
  const [y, m, d] = dateISO.split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = timeHHMM.split(":").map((x) => parseInt(x, 10));
  const dt = new Date();
  dt.setFullYear(y, (m || 1) - 1, d || 1);
  dt.setHours(hh || 0, mm || 0, 0, 0);
  return dt.toISOString();
}

/* ---------------------------- Scroll time picker --------------------------- */

function buildTimeOptions(stepMinutes = 15) {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
}

function ScrollableTimePicker({
  value,
  onChange,
  disabled,
  stepMinutes = 15
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  stepMinutes?: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const options = useMemo(() => buildTimeOptions(stepMinutes), [stepMinutes]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const sel = listRef.current?.querySelector<HTMLButtonElement>(`button[data-time="${value}"]`);
    if (sel && listRef.current) {
      listRef.current.scrollTop = Math.max(0, sel.offsetTop - 72);
    }
  }, [open, value]);




  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((s) => !s)}
        className={cx(
          "mt-1 w-full px-3 py-2 rounded-2xl border text-[12px] text-left flex items-center justify-between transition-colors",
          disabled
            ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200",
        )}
      >
        <span>{value || "Select time"}</span>
        <ChevronDown className={cx("h-4 w-4 transition", open ? "rotate-180" : "rotate-0")} />
      </button>

      {open ? (
        <div className="absolute z-[130] mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden transition-colors">
          <div ref={listRef} className="max-h-64 overflow-y-auto p-2">
            {options.map((t) => (
              <button
                key={t}
                type="button"
                data-time={t}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={cx(
                  "w-full px-3 py-2 rounded-xl text-left text-[12px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                  t === value
                    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 font-semibold text-slate-900 dark:text-slate-100"
                    : "border border-transparent text-slate-700 dark:text-slate-300",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Mini chart UI ------------------------------ */

function MiniLineChart({ values, height = 64 }: { values: number[]; height?: number }) {
  const safe = values.length ? values : [0, 0, 0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = max - min || 1;

  const pts = safe.map((v, i) => {
    const x = (i / Math.max(1, safe.length - 1)) * 100;
    const y = 36 - ((v - min) / span) * 32; // 4..36
    return { x, y };
  });

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const area = `${d} L 100 40 L 0 40 Z`;

  return (
    <svg viewBox="0 0 100 40" className="w-full" style={{ height }}>
      <path d={area} fill={ORANGE} opacity={0.12} />
      <path d={d} fill="none" stroke={ORANGE} strokeWidth={2.2} strokeLinecap="round" />
      <line x1="0" y1="40" x2="100" y2="40" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
    </svg>
  );
}

function BarList({ items }: { items: { label: string; value: number; hint?: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const pct = Math.round((it.value / max) * 100);
        return (
          <div key={it.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-[13px] truncate text-slate-900 dark:text-slate-100">{it.label}</div>
                {it.hint ? <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{it.hint}</div> : null}
              </div>
              <div className="shrink-0 text-[12px] font-semibold text-slate-900 dark:text-slate-100">{Math.round(it.value).toLocaleString()}</div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ORANGE, opacity: 0.75 }} />
            </div>
          </div>
        );
      })}
      {!items.length ? <div className="text-[12px] text-slate-500 dark:text-slate-400">No data yet.</div> : null}
    </div>
  );
}

/* ---------------------------------- Types --------------------------------- */

type Supplier = { id: string; name: string; kind: "Seller" | "Provider"; avatarUrl?: string };
type Campaign = { id: string; supplierId: string; name: string };
type Host = { id: string; name: string; handle: string; avatarUrl?: string; followers?: string; verified?: boolean };

type LiveSession = {
  id: string;
  title: string;
  status: LiveStatus;
  supplierId: string;
  campaignId?: string;
  hostId: string;
  platforms: LivePlatform[];
  heroImageUrl: string;
  heroVideoUrl?: string;
  desktopMode: "modal" | "fullscreen";
  startISO: string;
  endISO: string;

  // KPI highlights (premium dashboard)
  peakViewers: number;
  avgWatchMin: number;
  chatRate: number; // msg/min
  gmv: number;
  crewConflicts?: number; // Count of conflicts
};

type LiveDashboardWorkspace = {
  sessions?: Array<Record<string, unknown>>;
  suppliers?: Supplier[];
  campaigns?: Campaign[];
  hosts?: Host[];
};

function toLiveSession(record: Record<string, unknown>): LiveSession {
  return {
    id: String(record.id || ""),
    title: String(record.title || ""),
    status: String(record.status || "Draft") as LiveStatus,
    supplierId: String(record.supplierId || ""),
    campaignId: typeof record.campaignId === "string" ? record.campaignId : undefined,
    hostId: String(record.hostId || ""),
    platforms: Array.isArray(record.platforms) ? record.platforms.map((item) => String(item)) as LivePlatform[] : [],
    heroImageUrl: String(record.heroImageUrl || ""),
    heroVideoUrl: typeof record.heroVideoUrl === "string" ? record.heroVideoUrl : undefined,
    desktopMode: record.desktopMode === "fullscreen" ? "fullscreen" : "modal",
    startISO: String(record.startISO || ""),
    endISO: String(record.endISO || ""),
    peakViewers: Number(record.peakViewers || 0),
    avgWatchMin: Number(record.avgWatchMin || 0),
    chatRate: Number(record.chatRate || 0),
    gmv: Number(record.gmv || 0),
    crewConflicts: Number(record.crewConflicts || 0),
  };
}

/* ------------------------------ UI primitives ----------------------------- */

function Pill({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "good" | "warn" | "danger" }) {
  const cls =
    tone === "good"
      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"
        : tone === "danger"
          ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300";
  return <span className={cx("px-2.5 py-1 rounded-full border text-[11px] font-semibold", cls)}>{text}</span>;
}

function SoftButton({
  children,
  onClick,
  disabled,
  className,
  title
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "px-4 py-2 rounded-2xl text-[12px] font-semibold inline-flex items-center gap-2 border transition-colors",
        disabled
          ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200",
        className,
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  title
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "px-4 py-2 rounded-2xl text-[12px] font-semibold inline-flex items-center gap-2 border border-transparent text-white",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:opacity-95",
        className
      )}
      style={{ background: ORANGE }}
    >
      {children}
    </button>
  );
}

function Card({
  title,
  subtitle,
  right,
  children
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = "max-w-[980px]",
  zIndex = 120,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  zIndex?: number;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cx("absolute right-0 top-0 h-full w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-colors", width)}>
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 transition-colors">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Video className="h-4 w-4" /> {title}
            </div>
            {subtitle ? <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------- New session wizard ------------------------------- */

function NewLiveSessionDrawer({
  open,
  onClose,
  suppliers,
  campaigns,
  hosts,
  onCreate,
  createPending
}: {
  open: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  campaigns: Campaign[];
  hosts: Host[];
  onCreate: (created: {
    title: string;
    supplierId: string;
    campaignId?: string;
    hostId: string;
    startISO: string;
    endISO: string;
    desktopMode: "modal" | "fullscreen";
    platforms: LivePlatform[];
  }) => Promise<boolean> | boolean;
  createPending?: boolean;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [hostId, setHostId] = useState("");
  const [title, setTitle] = useState("New Live Session");
  const [platforms, setPlatforms] = useState<LivePlatform[]>(["TikTok Live", "Instagram Live"]);
  const [startDateISO, setStartDateISO] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDateISO, setEndDateISO] = useState("");
  const [endTime, setEndTime] = useState("");

  const scopedCampaigns = useMemo(() => campaigns.filter((c) => c.supplierId === supplierId), [campaigns, supplierId]);
  const scheduleReady = useMemo(() => {
    if (!startDateISO || !startTime || !endDateISO || !endTime) return false;
    const start = new Date(`${startDateISO}T${startTime}`);
    const end = new Date(`${endDateISO}T${endTime}`);
    return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end.getTime() > start.getTime();
  }, [startDateISO, startTime, endDateISO, endTime]);

  useEffect(() => {
    if (!open) return;
    setSupplierId((prev) => (prev && suppliers.some((entry) => entry.id === prev) ? prev : ""));
    setHostId((prev) => (prev && hosts.some((entry) => entry.id === prev) ? prev : ""));
    setTitle("New Live Session");
    setPlatforms(["TikTok Live", "Instagram Live"]);
    setStartDateISO("");
    setStartTime("");
    setEndDateISO("");
    setEndTime("");
  }, [open, suppliers, hosts]);

  useEffect(() => {
    // reset campaign if not in scoped list
    if (!open) return;
    if (!scopedCampaigns.find((c) => c.id === campaignId)) setCampaignId("");
  }, [open, scopedCampaigns, campaignId]);

  const canCreate = Boolean(
    supplierId &&
      hostId &&
      title.trim() &&
      platforms.length &&
      scheduleReady,
  );

  return (
    <Drawer open={open} onClose={onClose} title="New Live Session" subtitle="Create a session and jump straight into Live Builder.">
      <div className="grid sm:grid-cols-2 gap-3">
        <Card title="Basics">
          <div className="grid gap-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Supplier (Seller / Provider)</div>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-semibold text-slate-900 dark:text-slate-100 transition-colors">
                {suppliers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.kind})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Campaign</div>
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-semibold text-slate-900 dark:text-slate-100 transition-colors">
                {scopedCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Supplier → Campaign ensures products/assets scope correctly.</div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Session title</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 transition-colors" />
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Host</div>
              <select value={hostId} onChange={(e) => setHostId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-semibold text-slate-900 dark:text-slate-100 transition-colors">
                {hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.handle})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Start date</div>
                <input type="date" value={startDateISO} onChange={(e) => setStartDateISO(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 transition-colors" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Start time</div>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 transition-colors" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">End date</div>
                <input type="date" value={endDateISO} onChange={(e) => setEndDateISO(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 transition-colors" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">End time</div>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 transition-colors" />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Platforms">
          <div className="grid gap-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Destinations</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["TikTok Live", "Instagram Live", "YouTube Live", "Facebook Live", "Twitch"] as LivePlatform[]).map((p) => {
                  const active = platforms.includes(p);
                  let Icon = Video;
                  if (p.includes("Instagram")) Icon = Instagram;
                  else if (p.includes("Facebook")) Icon = Facebook;
                  else if (p.includes("YouTube")) Icon = Youtube;
                  else if (p.includes("Twitch")) Icon = Twitch;

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatforms((prev) => (active ? prev.filter((x) => x !== p) : [...prev, p]))}
                      className={cx(
                        "px-3 py-2 rounded-2xl border text-[12px] font-semibold transition-colors flex items-center gap-2",
                        active ? "border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-100" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {p.replace(" Live", "")}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                Select where you intend to stream. You can configure keys in Live Builder.
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <SoftButton onClick={onClose}>Cancel</SoftButton>
        <PrimaryButton
          disabled={!canCreate || createPending}
          onClick={() => {
            const startISO = combineDateTime(startDateISO, startTime);
            const endISO = combineDateTime(endDateISO, endTime);
            void Promise.resolve(
              onCreate({
                title: title.trim(),
                supplierId,
                campaignId: campaignId || undefined,
                hostId,
                startISO,
                endISO,
                desktopMode: "modal",
                platforms,
              }),
            ).then((created) => {
              if (created) onClose();
            });
          }}
        >
          Create & Open Builder <Zap className="h-4 w-4" />
        </PrimaryButton>
      </div>
    </Drawer>
  );
}

/* ------------------------------- Session details ------------------------------ */

function SessionDetailsDrawer({
  open,
  onClose,
  session,
  supplier,
  campaign,
  host,
  onOpenBuilder
}: {
  open: boolean;
  onClose: () => void;
  session: LiveSession | null;
  supplier?: Supplier;
  campaign?: Campaign;
  host?: Host;
  onOpenBuilder: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { run, isPending } = useAsyncAction();
  if (!session) return null;
  function safeNav(url: string) {
    if (!url) return;
    navigate(url);
  }

  const statusTone = session.status === "Live" ? "good" : session.status === "Scheduled" ? "warn" : session.status === "Ended" ? "neutral" : "neutral";
  const startAt = new Date(session.startISO);
  const endAt = new Date(session.endISO);
  const hasValidSchedule = !Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime()) && endAt > startAt;
  const hasPlatforms = session.platforms.length > 0;
  const hasMedia = Boolean(session.heroImageUrl || session.heroVideoUrl);
  const detailsReady = hasValidSchedule && hasPlatforms && hasMedia;
  const missingReadiness: string[] = [];
  if (!hasValidSchedule) missingReadiness.push("Set valid schedule");
  if (!hasPlatforms) missingReadiness.push("Select platforms");
  if (!hasMedia) missingReadiness.push("Attach hero media");
  return (
    <Drawer open={open} onClose={onClose} title="Live session details" subtitle="Premium: details, readiness, quick actions.">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <Card
            title={session.title}
            subtitle={
              session.status === "Draft"
                ? "Schedule needed (configure in Builder)"
                : `${fmtDT(session.startISO)} → ${fmtDT(session.endISO)}`
            }
            right={<Pill text={session.status} tone={statusTone as "neutral" | "good" | "warn" | "danger"} />}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Supplier</div>
                <div className="text-[12px] font-semibold mt-1 text-slate-900 dark:text-slate-100">{supplier?.name || "—"}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{campaign?.name || "—"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Host</div>
                <div className="mt-1 flex items-center gap-2">
                  {host?.avatarUrl ? <img src={host.avatarUrl} className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" alt={host.name} /> : null}
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold truncate text-slate-900 dark:text-slate-100">{host?.name || "—"}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{host?.handle || "—"}</div>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Platforms</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {session.platforms.map((p) => (
                    <Pill key={p} text={p} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <PrimaryButton onClick={() => onOpenBuilder(session.id)}>
                Open Live Builder <ExternalLink className="h-4 w-4" />
              </PrimaryButton>

              <SoftButton
                onClick={() => safeNav(`${ROUTES.streamToPlatforms}?sessionId=${encodeURIComponent(session.id)}`)}
                title="Destinations, output profile, health, test stream"
              >
                Stream to Platforms <Zap className="h-4 w-4" />
              </SoftButton>

              <SoftButton
                onClick={() => safeNav(`${ROUTES.audienceNotifications}?sessionId=${encodeURIComponent(session.id)}`)}
                title="Tap-to-initiate prompts + reminder schedule"
              >
                Notifications <Bell className="h-4 w-4" />
              </SoftButton>

              <SoftButton
                onClick={() => safeNav(`${ROUTES.overlaysCTAsPro}?sessionId=${encodeURIComponent(session.id)}`)}
                title="QR overlays, countdown timers, CTAs"
              >
                Overlays <LinkIcon className="h-4 w-4" />
              </SoftButton>

              <SoftButton
                onClick={() => safeNav(`${ROUTES.safetyModeration}?sessionId=${encodeURIComponent(session.id)}`)}
                title="Chat tools, keyword filters, incident report"
              >
                Safety & Moderation <Users className="h-4 w-4" />
              </SoftButton>

              <SoftButton
                onClick={() => safeNav(`${ROUTES.postLivePublisher}?sessionId=${encodeURIComponent(session.id)}`)}
                title="Replay publish, clips, replay sends, boosters"
              >
                Post-Live <BarChart3 className="h-4 w-4" />
              </SoftButton>

              <SoftButton
                onClick={() => safeNav(`${ROUTES.liveAlertsManager}?sessionId=${encodeURIComponent(session.id)}`)}
                title="One-tap alerts during live (creator quick toggles)"
              >
                Live Alerts <AlertTriangle className="h-4 w-4" />
              </SoftButton>

              <SoftButton
                onClick={() => {
                  const sessionUrl = `${window.location.origin}${ROUTES.liveDashboard}?sessionId=${encodeURIComponent(session.id)}`;
                  void navigator.clipboard
                    .writeText(sessionUrl)
                    .then(() => showSuccess("Live session link copied to clipboard!"))
                    .catch(() => showError("Could not copy session link."));
                }}
              >
                Share <LinkIcon className="h-4 w-4" />
              </SoftButton>
            </div>
          </Card>

          <Card title="Media" subtitle="Preview image/video used for discovery cards.">
            <div className="aspect-[16/9] rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 overflow-hidden relative transition-colors">
              {session.heroVideoUrl ? (
                <video className="absolute inset-0 w-full h-full object-cover" src={session.heroVideoUrl} poster={session.heroImageUrl} controls />
              ) : session.heroImageUrl ? (
                <img className="absolute inset-0 w-full h-full object-cover" src={session.heroImageUrl} alt="Hero" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  Hero media not set yet
                </div>
              )}
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-black/55 border border-white/15 text-white text-[10px] font-semibold">LIVE</span>
                <span className="px-2 py-1 rounded-full bg-black/55 border border-white/15 text-white text-[10px] font-semibold">{session.desktopMode}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card title="KPIs" subtitle="Performance snapshot.">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Peak viewers</div>
                <div className="text-[16px] font-semibold mt-1 text-slate-900 dark:text-slate-100">{session.peakViewers ? session.peakViewers.toLocaleString() : "—"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Avg watch</div>
                <div className="text-[16px] font-semibold mt-1 text-slate-900 dark:text-slate-100">{session.avgWatchMin ? `${session.avgWatchMin.toFixed(1)}m` : "—"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Chat rate</div>
                <div className="text-[16px] font-semibold mt-1 text-slate-900 dark:text-slate-100">{session.chatRate ? `${session.chatRate}/min` : "—"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">GMV</div>
                <div className="text-[16px] font-semibold mt-1 text-slate-900 dark:text-slate-100">£{session.gmv.toLocaleString()}</div>
              </div>
            </div>
          </Card>

          <Card title="Readiness" subtitle="Preflight checks + lock windows.">
            <div
              className={cx(
                "rounded-2xl p-3 text-[11px] flex items-start gap-2 transition-colors",
                detailsReady
                  ? "border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200"
                  : "border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200",
              )}
            >
              {detailsReady ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5" />
              )}
              <div>
                <div className={cx("font-semibold", detailsReady ? "text-emerald-900 dark:text-emerald-100" : "text-amber-900 dark:text-amber-100")}>
                  {detailsReady ? "Ready" : "Needs attention"}
                </div>
                <div>
                  {detailsReady
                    ? "Schedule, platforms and hero media are configured."
                    : missingReadiness.join(" • ")}
                </div>
              </div>
            </div>
            <div className="mt-2 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2 transition-colors">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-100">Lock window</div>
                <div>Edits locked within 30 minutes of go-live (premium lock band).</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------------------------------- Page ---------------------------------- */

/* ---------------------------------- Page ---------------------------------- */

export default function LiveDashboardPage() {
  // const { theme } = useTheme();
  const navigate = useNavigate();
  const { showError } = useNotification();
  const { run, isPending } = useAsyncAction();
  const {
    data: workspace,
    loading: workspaceLoading,
    error: workspaceError,
    reload: reloadWorkspace,
  } = useApiResource({
    initialData: {} as LiveDashboardWorkspace,
    loader: () => creatorApi.liveDashboardWorkspace() as Promise<LiveDashboardWorkspace>,
    onError: () => showError("Could not load live dashboard data."),
  });
  const suppliers = useMemo(() => workspace.suppliers || [], [workspace.suppliers]);
  const campaigns = useMemo(() => workspace.campaigns || [], [workspace.campaigns]);
  const hosts = useMemo(() => workspace.hosts || [], [workspace.hosts]);
  const sessions = useMemo(
    () => (workspace.sessions || []).map(toLiveSession),
    [workspace.sessions],
  );


  function safeNav(url: string) {
    if (!url) return;
    navigate(url);
  }

  // Filters
  const [tab, setTab] = useState<"All" | "Upcoming" | "Live" | "Ended">("All");
  const [q, setQ] = useState("");
  const [supplierId, setSupplierId] = useState<string>("all");

  // Drawers
  const [newOpen, setNewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Live builder drawer (for deep links from Dealz Marketplace)
  const [builderOpen, setBuilderOpen] = useState(false);

  const [prefillDealId, setPrefillDealId] = useState<string | undefined>(undefined);
  const [builderSessionId, setBuilderSessionId] = useState<string | undefined>(undefined);

  // Live Sessionz Pro hub context (which session the Pro tool cards should act on)
  const [toolSessionId, setToolSessionId] = useState<string>("");

  // Sidebar active route (app-like nav highlight)
  const [pathname, setPathname] = useState<string>("");

  // Sidebar active highlighting (based on window.location.pathname)
  const currentPath = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  const isActivePath = (route: string) => {
    const base = route !== "/" && route.endsWith("/") ? route.slice(0, -1) : route;
    return Boolean(currentPath) && (currentPath === base || currentPath.startsWith(base + "/"));
  };

  const navBtnBase =
    "w-full px-3 py-2 rounded-2xl border text-[13px] font-bold flex items-center justify-between gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed";
  const navInactive = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100";
  // const navActive = "bg-slate-900 border-slate-900 text-white";
  const proActive = "bg-violet-600 border-violet-600 text-white";

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    // Keep toolkit session in sync when user opens details
    if (activeId) setToolSessionId(activeId);
  }, [activeId]);

  useEffect(() => {
    // Ensure selection remains valid after creating/removing sessions
    if (!sessions.length) {
      if (toolSessionId) setToolSessionId("");
      return;
    }
    if (toolSessionId && !sessions.find((s) => s.id === toolSessionId)) {
      setToolSessionId("");
    }
  }, [sessions, toolSessionId]);

  useEffect(() => {
    const sp = parseSearch();
    const drawer = sp.get("drawer");
    const dealId = sp.get("dealId") || undefined;
    if (drawer === "liveBuilder") {
      // Support existing deep-links: /live-dashboard?dealId=...&drawer=liveBuilder
      setPrefillDealId(dealId);
      setBuilderOpen(true);
    }
  }, []);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const okTab =
        tab === "All"
          ? true
          : tab === "Upcoming"
            ? s.status === "Scheduled" || s.status === "Ready" || s.status === "Draft"
            : tab === "Live"
              ? s.status === "Live"
              : s.status === "Ended";

      const okSupplier = supplierId === "all" ? true : s.supplierId === supplierId;
      const hay = `${s.title} ${s.id}`.toLowerCase();
      const okQ = q.trim() ? hay.includes(q.trim().toLowerCase()) : true;
      return okTab && okSupplier && okQ;
    });
  }, [sessions, tab, supplierId, q]);

  const active = useMemo(() => (activeId ? sessions.find((s) => s.id === activeId) || null : null), [sessions, activeId]);
  const activeSupplier = useMemo(() => (active ? suppliers.find((p) => p.id === active.supplierId) : undefined), [active, suppliers]);
  const activeCampaign = useMemo(() => (active?.campaignId ? campaigns.find((c) => c.id === active.campaignId) : undefined), [active, campaigns]);
  const activeHost = useMemo(() => (active ? hosts.find((h) => h.id === active.hostId) : undefined), [active, hosts]);

  const kpis = useMemo(() => {
    const live = sessions.filter((s) => s.status === "Live").length;
    const upcoming = sessions.filter((s) => s.status === "Scheduled" || s.status === "Ready").length;
    const drafts = sessions.filter((s) => s.status === "Draft").length;
    const gmv = sessions.reduce((a, s) => a + (s.gmv || 0), 0);
    return { live, upcoming, drafts, gmv };
  }, [sessions]);

  const avgPeakViewers = useMemo(() => {
    if (!sessions.length) return 0;
    return sessions.reduce((sum, entry) => sum + (entry.peakViewers || 0), 0) / sessions.length;
  }, [sessions]);
  const avgWatchMinutes = useMemo(() => {
    if (!sessions.length) return 0;
    return sessions.reduce((sum, entry) => sum + (entry.avgWatchMin || 0), 0) / sessions.length;
  }, [sessions]);
  const opsIncidents = useMemo(
    () => sessions.reduce((sum, entry) => sum + Math.max(0, entry.crewConflicts || 0), 0),
    [sessions],
  );

  const viewersTrend = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
      .slice(-14)
      .map((entry) => Math.max(0, Math.round(entry.peakViewers || 0)));
  }, [sessions]);

  const byPlatform = useMemo(() => {
    const m = new Map<string, number>();
    sessions.forEach((s) => {
      const split = s.platforms.length ? 1 / s.platforms.length : 1;
      s.platforms.forEach((p) => m.set(p, (m.get(p) || 0) + (s.peakViewers || 0) * split));
    });
    return Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((x) => ({ ...x, hint: "Peak viewers (weighted)" }));
  }, [sessions]);

  // Live Sessionz Pro — derived status for the selected toolkit session
  const toolSession = useMemo(() => sessions.find((s) => s.id === toolSessionId) || null, [sessions, toolSessionId]);
  const toolSupplier = useMemo(() => (toolSession ? suppliers.find((p) => p.id === toolSession.supplierId) : undefined), [toolSession, suppliers]);
  const toolHost = useMemo(() => (toolSession ? hosts.find((h) => h.id === toolSession.hostId) : undefined), [toolSession, hosts]);

  const waPrompt = useMemo(() => {
    if (!toolSession) return null;
    const end = new Date(toolSession.endISO);
    if (Number.isNaN(end.getTime())) return null;
    // Requirement: prompt time = (end + buffer) - 24h ; buffer default is 15 minutes
    return new Date(end.getTime() + 15 * 60 * 1000 - 24 * 60 * 60 * 1000);
  }, [toolSession]);

  const toolStatus = useMemo(() => {
    if (!toolSession) {
      return {
        stream: { label: "Select session", tone: "neutral" },
        notify: { label: "Select session", tone: "neutral" },
        overlays: { label: "Select session", tone: "neutral" },
        safety: { label: "Select session", tone: "neutral" },
        post: { label: "Select session", tone: "neutral" },
        alerts: { label: "Select session", tone: "neutral" }
      } as const;
    }

    const start = new Date(toolSession.startISO);
    const end = new Date(toolSession.endISO);
    const timeOk = end.getTime() > start.getTime();
    const basicsOk = Boolean(toolSession.title?.trim()) && Boolean(toolSession.hostId) && timeOk;

    const platformsOk = toolSession.platforms?.length > 0;
    const isLive = toolSession.status === "Live";
    const isScheduled = toolSession.status === "Scheduled" || toolSession.status === "Ready";
    const isEnded = toolSession.status === "Ended";

    return {
      stream: { label: platformsOk ? "Configured" : "Missing platforms", tone: platformsOk ? "good" : "warn" },
      notify: { label: isScheduled || isLive ? "Planned" : "Draft", tone: isScheduled || isLive ? "good" : "neutral" },
      overlays: { label: basicsOk ? "Available" : "Blocked", tone: basicsOk ? "neutral" : "warn" },
      safety: { label: isLive ? "Active" : "Set rules", tone: isLive ? "good" : "warn" },
      post: { label: isEnded ? "Publish" : "Plan", tone: isEnded ? "warn" : "neutral" },
      alerts: { label: isLive ? "Live" : "Standby", tone: isLive ? "good" : "neutral" }
    } as const;
  }, [toolSession]);

  const readiness = useMemo(() => {
    if (!toolSession) return { ok: false, items: [] as Array<{ label: string; ok: boolean; hint?: string }> };

    const start = new Date(toolSession.startISO);
    const end = new Date(toolSession.endISO);
    const timeOk = end.getTime() > start.getTime();
    const basicsOk = Boolean(toolSession.title?.trim()) && Boolean(toolSession.hostId) && timeOk;

    const platformsOk = toolSession.platforms?.length > 0;
    const heroOk = Boolean(toolSession.heroImageUrl);
    const waOk = !waPrompt ? false : waPrompt.getTime() < start.getTime(); // prompt must be before start
    const crewOk = (toolSession.crewConflicts || 0) === 0;

    const items = [
      { label: "Session basics complete", ok: basicsOk, hint: "Title, host, valid start/end" },
      { label: "Crew conflicts resolved", ok: crewOk, hint: crewOk ? "Roster is clear" : `${toolSession.crewConflicts} conflict(s) detected. Fix in Crew Manager.` },
      { label: "Platforms selected", ok: platformsOk, hint: platformsOk ? toolSession.platforms.join(", ") : "Select destinations in Stream to Platforms" },
      { label: "Hero media attached", ok: heroOk, hint: "Discovery uses hero image/video" },
      { label: "WhatsApp prompt time valid", ok: waOk, hint: waPrompt ? `Computed: ${fmtDT(waPrompt.toISOString())}` : "Compute after end time is set" },
    ];

    const ok = items.every((x) => x.ok);
    return { ok, items };
  }, [toolSession, waPrompt]);


  function openDetails(id: string) {
    setActiveId(id);
    setToolSessionId(id);
    setDetailsOpen(true);
  }

  function openBuilderPage(sessionId: string, dealId?: string) {
    setBuilderSessionId(sessionId);
    if (dealId) setPrefillDealId(dealId);
    setBuilderOpen(true);
  }

  async function onCreateSession(payload: {
    title: string;
    supplierId: string;
    campaignId?: string;
    hostId: string;
    startISO: string;
    endISO: string;
    desktopMode: "modal" | "fullscreen";
    platforms: LivePlatform[];
  }): Promise<boolean> {
    const createdId = await run(async () => {
      const created = await creatorApi.createLiveSession({
        status: "draft",
        title: payload.title,
        scheduledAt: payload.startISO,
        data: {
          title: payload.title,
          supplierId: payload.supplierId,
          campaignId: payload.campaignId || null,
          hostId: payload.hostId,
          platforms: payload.platforms,
          desktopMode: payload.desktopMode,
          startISO: payload.startISO,
          endISO: payload.endISO,
          heroImageUrl: "",
          heroVideoUrl: "",
          peakViewers: 0,
          avgWatchMin: 0,
          chatRate: 0,
          gmv: 0,
          crewConflicts: 0,
        },
      });
      await reloadWorkspace();
      return String(created.id || "");
    }, {
      successMessage: `Session "${payload.title}" created successfully!`,
      errorMessage: "Connection failed. Please check your network and try again.",
      delay: 200
    });
    if (typeof createdId === "string" && createdId) {
      openBuilderPage(createdId);
      return true;
    }
    return false;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Live Dashboard"
        rightContent={
          <div className="flex items-center gap-2">
            <SoftButton onClick={() => safeNav(ROUTES.dealzMarketplace)} title="Back to Dealz Marketplace">
              <ChevronLeft className="h-4 w-4" /> Dealz Marketplace
            </SoftButton>
            <PrimaryButton onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> New Live Session
            </PrimaryButton>
          </div>
        }
      />
      <div className="w-full max-w-full px-3 sm:px-4 md:px-5 lg:px-6 py-2.5">
        {/* Dashboard Summary */}
        <div className="mb-2.5 flex flex-col gap-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Premium operations view for Live Sessionz (schedule, readiness, performance).
          </div>
          {workspaceLoading ? (
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300">
              <CircularProgress size={12} />
              Syncing dashboard data...
            </div>
          ) : null}
          {workspaceError ? (
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 text-[11px] text-rose-700 dark:text-rose-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              Some data could not be refreshed.
            </div>
          ) : null}
        </div>

        {/* Dashboard (compact, premium) */}
        <div className="mt-3">
          {/* Main content */}
          <main className="min-w-0">
            {/* KPIs + charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3">
              <div className="lg:col-span-7 space-y-2.5">
                <Card title="Viewers trend" subtitle="Last 14 sessions">
                  <MiniLineChart values={viewersTrend} height={78} />
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 transition-colors">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total GMV</div>
                      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">£{kpis.gmv.toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 transition-colors">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Peak viewers (avg)</div>
                      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                        {avgPeakViewers > 0 ? Math.round(avgPeakViewers).toLocaleString() : "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg watch</div>
                      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                        {avgWatchMinutes > 0 ? `${avgWatchMinutes.toFixed(1)}m` : "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ops incidents</div>
                      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                        {opsIncidents.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Live Sessionz Pro — Control Center (moved here to be in same column) */}
                <Card title="Live Sessionz Pro — Control Center" subtitle="All premium tools wired to the selected live session (open as pages while keeping context).">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Active session</div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <select
                          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 transition-colors"
                          value={toolSessionId}
                          onChange={(e) => setToolSessionId(e.target.value)}
                        >
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title} • {s.id}
                            </option>
                          ))}
                        </select>

                        {toolSession ? (
                          <Pill
                            text={toolSession.status}
                            tone={(toolSession.status === "Live" ? "good" : toolSession.status === "Scheduled" ? "warn" : "neutral") as "neutral" | "good" | "warn" | "danger"}
                          />
                        ) : null}

                        {toolSupplier?.name ? <Pill text={toolSupplier.name} /> : null}
                        {toolHost?.handle ? <Pill text={toolHost.handle} /> : null}
                      </div>

                      {toolSession ? (
                        <div className="text-[11px] text-slate-500 mt-2">
                          {fmtDT(toolSession.startISO)} → {fmtDT(toolSession.endISO)} • Ends {fmtDT(toolSession.endISO)}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 mt-2">Select a session to open Pro tools.</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <SoftButton onClick={() => (toolSession ? openDetails(toolSession.id) : null)} disabled={!toolSession} title="Open details drawer">
                        Details <ExternalLink className="h-4 w-4" />
                      </SoftButton>
                      <PrimaryButton onClick={() => (toolSession ? openBuilderPage(toolSession.id) : null)} disabled={!toolSession}>
                        Open Live Builder <Video className="h-4 w-4" />
                      </PrimaryButton>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Stream to Platforms */}
                    {/* Stream to Platforms */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold">Stream to Platforms</div>
                          <div className="text-[11px] text-slate-500 mt-1">Destinations • quality profiles • health • test stream</div>
                        </div>
                        <Pill text={toolStatus.stream.label} tone={toolStatus.stream.tone as "neutral" | "good" | "warn" | "danger"} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <PrimaryButton
                          onClick={() => toolSession && safeNav(`${ROUTES.streamToPlatforms}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                          disabled={!toolSession}
                        >
                          Open <Zap className="h-4 w-4" />
                        </PrimaryButton>
                        <SoftButton
                          onClick={() => toolSession && safeNav(`${ROUTES.streamToPlatforms}?sessionId=${encodeURIComponent(toolSession.id)}&mode=test`)}
                          disabled={!toolSession}
                          title="Premium"
                        >
                          Test Stream <CheckCircle2 className="h-4 w-4" />
                        </SoftButton>
                      </div>
                    </div>

                    {/* Audience Notifications */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold">Audience Notifications</div>
                          <div className="text-[11px] text-slate-500 mt-1">Tap-to-initiate • QR/link prompts • reminder schedule</div>
                        </div>
                        <Pill text={toolStatus.notify.label} tone={toolStatus.notify.tone as "neutral" | "good" | "warn" | "danger"} />
                      </div>

                      <div className="mt-2 text-[11px] text-slate-600">
                        {waPrompt ? (
                          <>
                            WhatsApp prompt time (end + 15m − 24h): <span className="font-semibold">{fmtDT(waPrompt.toISOString())}</span>
                          </>
                        ) : (
                          <>WhatsApp prompt time will compute after an end time is set.</>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <PrimaryButton
                          onClick={() => toolSession && safeNav(`${ROUTES.audienceNotifications}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                          disabled={!toolSession}
                        >
                          Open <Bell className="h-4 w-4" />
                        </PrimaryButton>
                        <SoftButton
                          onClick={() => toolSession && safeNav(`${ROUTES.audienceNotifications}?sessionId=${encodeURIComponent(toolSession.id)}&tab=prompt`)}
                          disabled={!toolSession}
                          title="Jump to initiation prompt setup"
                        >
                          Prompts <ExternalLink className="h-4 w-4" />
                        </SoftButton>
                      </div>
                    </div>

                    {/* Overlays & CTAs */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold">Overlays & CTAs Pro</div>
                          <div className="text-[11px] text-slate-500 mt-1">QR overlay • short links • countdown • lower-thirds</div>
                        </div>
                        <Pill text={toolStatus.overlays.label} tone={toolStatus.overlays.tone as "neutral" | "good" | "warn" | "danger"} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <PrimaryButton
                          onClick={() => toolSession && safeNav(`${ROUTES.overlaysCTAsPro}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                          disabled={!toolSession}
                        >
                          Open <LinkIcon className="h-4 w-4" />
                        </PrimaryButton>
                        <SoftButton
                          onClick={() => run(async () => {
                            if (!toolSession) return;
                            await creatorApi.patchLiveTool("overlays", {
                              sessionId: toolSession.id,
                              lastAction: "export_pack",
                              exportedAt: new Date().toISOString(),
                            });
                          }, {
                            successMessage: "Overlays pack exported successfully!",
                            errorMessage: "Could not export overlays pack.",
                            delay: 200
                          })}
                          disabled={!toolSession || isPending}
                        >
                          Export pack <ExternalLink className="h-4 w-4" />
                        </SoftButton>
                      </div>
                    </div>

                    {/* Safety & Moderation */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold">Safety & Moderation</div>
                          <div className="text-[11px] text-slate-500 mt-1">Chat tools • keyword filters • incident report</div>
                        </div>
                        <Pill text={toolStatus.safety.label} tone={toolStatus.safety.tone as "neutral" | "good" | "warn" | "danger"} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <PrimaryButton
                          onClick={() => toolSession && safeNav(`${ROUTES.safetyModeration}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                          disabled={!toolSession}
                        >
                          Open <Users className="h-4 w-4" />
                        </PrimaryButton>
                        <SoftButton
                          onClick={() => run(async () => {
                            if (!toolSession) return;
                            await creatorApi.patchLiveTool("safety", {
                              sessionId: toolSession.id,
                              emergencyMute: true,
                              activatedAt: new Date().toISOString(),
                            });
                          }, {
                            successMessage: "Emergency mute activated for all chats!",
                            errorMessage: "Could not activate emergency mute.",
                            delay: 200
                          })}
                          disabled={!toolSession || isPending}
                        >
                          Emergency mute <AlertTriangle className="h-4 w-4" />
                        </SoftButton>
                      </div>
                    </div>

                    {/* Post-live */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold">Post‑Live Publisher</div>
                          <div className="text-[11px] text-slate-500 mt-1">Replay publish • clips • replay sends • boosters</div>
                        </div>
                        <Pill text={toolStatus.post.label} tone={toolStatus.post.tone as "neutral" | "good" | "warn" | "danger"} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <PrimaryButton
                          onClick={() => toolSession && safeNav(`${ROUTES.postLivePublisher}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                          disabled={!toolSession}
                        >
                          Open <BarChart3 className="h-4 w-4" />
                        </PrimaryButton>
                        <SoftButton
                          onClick={() => run(async () => {
                            if (!toolSession) return;
                            await creatorApi.patchLiveTool("post-live", {
                              sessionId: toolSession.id,
                              lastAction: "generate_share_cards",
                              generatedAt: new Date().toISOString(),
                            });
                          }, {
                            successMessage: "Replay share cards generated!",
                            errorMessage: "Could not generate replay cards.",
                            delay: 200
                          })}
                          disabled={!toolSession || isPending}
                        >
                          Generate cards <ExternalLink className="h-4 w-4" />
                        </SoftButton>
                      </div>
                    </div>

                    {/* Live Alerts Manager */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:col-span-2 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold">Live Alerts Manager</div>
                          <div className="text-[11px] text-slate-500 mt-1">One-tap alerts during a live (without disrupting stream)</div>
                        </div>
                        <Pill text={toolStatus.alerts.label} tone={toolStatus.alerts.tone as "neutral" | "good" | "warn" | "danger"} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <PrimaryButton
                          onClick={() => toolSession && safeNav(`${ROUTES.liveAlertsManager}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                          disabled={!toolSession}
                        >
                          Open <AlertTriangle className="h-4 w-4" />
                        </PrimaryButton>
                        <SoftButton disabled title="Primary in Creator App">
                          Creator App (primary)
                        </SoftButton>
                        <SoftButton onClick={() => toolSession && safeNav(`${ROUTES.liveAlertsManager}?sessionId=${encodeURIComponent(toolSession.id)}&mode=quick`)} disabled={!toolSession}>
                          Quick toggles <Zap className="h-4 w-4" />
                        </SoftButton>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-5 space-y-2.5">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[17px] font-bold text-slate-900 dark:text-slate-100">Live Sessionz Pro</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Premium tools for multistream + growth</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-semibold">
                      PRO
                    </span>
                  </div>

                  <div className="mt-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Applies to session</div>
                        <select
                          className="mt-2 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[13px] font-bold text-slate-900 dark:text-slate-100 transition-colors"
                          value={toolSessionId}
                          onChange={(e) => setToolSessionId(e.target.value)}
                        >
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title} • {s.id}
                            </option>
                          ))}
                        </select>

                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {toolSession ? (
                            <Pill
                              text={toolSession.status}
                              tone={(toolSession.status === "Live" ? "good" : toolSession.status === "Scheduled" ? "warn" : "neutral") as "neutral" | "good" | "warn" | "danger"}
                            />
                          ) : (
                            <Pill text="Select session" />
                          )}
                          {toolSupplier?.name ? <Pill text={toolSupplier.name} /> : null}
                        </div>

                        <div className="mt-2 text-[11px] text-slate-600">
                          WA prompt:{" "}
                          <span className="font-semibold text-slate-900">
                            {waPrompt ? fmtDT(waPrompt.toISOString()) : "—"}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Computed as (end + 15m) − 24h to keep WhatsApp valid until session end + buffer.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.streamToPlatforms) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.streamToPlatforms}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                      title={!toolSession ? "Select a session first" : "Stream to Platforms"}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Stream to Platforms
                      </span>
                      {isActivePath(ROUTES.streamToPlatforms) ? (
                        <span className="text-[11px] text-white/90">Active</span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.audienceNotifications) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.audienceNotifications}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                      title={!toolSession ? "Select a session first" : "Audience Notifications"}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Audience Notifications
                      </span>
                      {isActivePath(ROUTES.audienceNotifications) ? (
                        <span className="text-[11px] text-white/90">Active</span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.liveAlertsManager) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.liveAlertsManager}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                      title={!toolSession ? "Select a session first" : "Live Alerts Manager"}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Live Alerts Manager
                      </span>
                      {isActivePath(ROUTES.liveAlertsManager) ? (
                        <span className="text-[11px] text-white/90">Active</span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.overlaysCTAsPro) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.overlaysCTAsPro}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                      title={!toolSession ? "Select a session first" : "Overlays & CTAs Pro"}
                    >
                      <span className="inline-flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Overlays & CTAs Pro
                      </span>
                      {isActivePath(ROUTES.overlaysCTAsPro) ? (
                        <span className="text-[11px] text-white/90">Active</span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.safetyModeration) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.safetyModeration}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                      title={!toolSession ? "Select a session first" : "Safety & Moderation"}
                    >
                      <span className="inline-flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Safety & Moderation
                      </span>
                      {isActivePath(ROUTES.safetyModeration) ? (
                        <span className="text-[11px] text-white/90">Active</span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.postLivePublisher) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.postLivePublisher}?sessionId=${encodeURIComponent(toolSession.id)}`)}
                      title={!toolSession ? "Select a session first" : "Post-Live Publisher"}
                    >
                      <span className="inline-flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Post-Live
                      </span>
                      {isActivePath(ROUTES.postLivePublisher) ? (
                        <span className="text-[11px] text-white/90">Active</span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                    <div className="font-semibold">Tip</div>
                    <div className="mt-1">
                      Use “Stream to Platforms” for preflight + multistream health. Notifications uses the tap-to-start model (WhatsApp 24h window).
                    </div>
                  </div>
                </div>

                <Card title="Platforms" subtitle="Where viewers are coming from">
                  <BarList items={byPlatform} />
                </Card>
              </div>

              {/* Go-Live readiness (stretched to full width) */}
              <div className="lg:col-span-12">
                <Card title="Go‑Live readiness" subtitle="Lightweight preflight summary.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {readiness.items.map((it) => (
                      <div key={it.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex items-center justify-between gap-2 transition-colors">
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold truncate">{it.label}</div>
                          {it.hint ? <div className="text-[11px] text-slate-500 truncate">{it.hint}</div> : null}
                        </div>
                        <Pill text={it.ok ? "OK" : "Fix"} tone={it.ok ? "good" : "warn"} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold">Go Live Readiness Status</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Routes you to <span className="font-semibold">Stream to Platforms</span> where final preflight + per-destination errors are handled.
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Pill text={readiness.ok ? "Ready to stream" : "Preflight Blocked"} tone={readiness.ok ? "good" : "warn"} />
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
                        <div className="flex items-center gap-2">
                          <PrimaryButton
                            onClick={() => toolSession && safeNav(`${ROUTES.streamToPlatforms}?sessionId=${encodeURIComponent(toolSession.id)}&goLive=1`)}
                            disabled={!toolSession || !readiness.ok}
                            title={!readiness.ok ? "Fix readiness items first" : "Proceed"}
                          >
                            Go Live <Zap className="h-4 w-4" />
                          </PrimaryButton>

                          <SoftButton
                            onClick={() => (toolSession ? openBuilderPage(toolSession.id) : null)}
                            disabled={!toolSession}
                            title="Fix basics in Live Builder"
                          >
                            Fix in Builder <Video className="h-4 w-4" />
                          </SoftButton>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    Tip: Keep Safety & Moderation open on a second screen during high-traffic lives.
                  </div>
                </Card>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-2.5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors">
                  <Search className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search sessionz by title or ID…"
                    className="w-full text-[12px] outline-none bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-600"
                  />
                </div>

                <select
                  className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[12px] font-semibold text-slate-900 dark:text-slate-100 transition-colors cursor-pointer outline-none"
                  value={tab}
                  onChange={(e) => setTab(e.target.value as "All" | "Upcoming" | "Live" | "Ended")}
                >
                  <option value="All">All</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Live">Live</option>
                  <option value="Ended">Ended</option>
                </select>

                <select
                  className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[12px] font-semibold text-slate-900 dark:text-slate-100 transition-colors cursor-pointer outline-none"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="all">All suppliers</option>
                  {suppliers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <SoftButton
                  onClick={() =>
                    run(async () => {
                      await reloadWorkspace();
                    }, {
                      successMessage: "Dashboard data refreshed.",
                      errorMessage: "Could not refresh dashboard.",
                      delay: 150,
                    })
                  }
                  disabled={isPending}
                >
                  <Filter className="h-4 w-4" /> Refresh
                </SoftButton>
              </div>
            </div>

            {/* Sessionz table */}
            <div className="mt-2.5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="text-l7 font-bold text-slate-900 dark:text-slate-100">Sessionz</div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{filtered.length} shown</div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-[1300px] w-full">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr className="text-left text-[11px] text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2 font-semibold min-w-[260px]">Session</th>
                      <th className="px-3 py-2 font-semibold min-w-[200px]">Supplier</th>
                      <th className="px-3 py-2 font-semibold min-w-[150px]">Timing</th>
                      <th className="px-3 py-2 font-semibold min-w-[180px]">Platforms</th>
                      <th className="px-3 py-2 font-semibold min-w-[240px]">KPIs</th>
                      <th className="px-3 py-2 font-semibold text-right min-w-[220px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((s) => {
                      const p = suppliers.find((x) => x.id === s.supplierId);
                      const h = hosts.find((x) => x.id === s.hostId);
                      const tone = s.status === "Live" ? "good" : s.status === "Scheduled" ? "warn" : s.status === "Ended" ? "neutral" : "neutral";

                      return (
                        <tr key={s.id} className="transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                {s.heroImageUrl ? (
                                  <img src={s.heroImageUrl} alt={s.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                                    <Video className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="text-[12px] font-semibold truncate text-slate-900 dark:text-slate-100">{s.title}</div>
                                  <Pill text={s.status} tone={tone as "neutral" | "good" | "warn" | "danger"} />
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                  {h?.avatarUrl ? <img src={h.avatarUrl} className="h-5 w-5 rounded-full border border-slate-200 object-cover" alt={h.name} /> : null}
                                  <span className="truncate">{h ? `${h.name} (${h.handle})` : "—"}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{s.id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {p?.avatarUrl ? <img src={p.avatarUrl} className="h-7 w-7 rounded-full border border-slate-200 object-cover" alt={p.name} /> : null}
                              <div className="min-w-0">
                                <div className="text-[12px] font-semibold truncate text-slate-900 dark:text-slate-100">{p?.name || "—"}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{campaigns.find((c) => c.id === s.campaignId)?.name || "—"}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {s.status === "Draft" ? (
                              <Pill text="Schedule needed" tone="warn" />
                            ) : (
                              <>
                                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{fmtDT(s.startISO)}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">Ends {fmtDT(s.endISO)}</div>
                              </>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {s.platforms.map((pl) => (
                                <Pill key={pl} text={pl} />
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 transition-colors">
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">Peak</div>
                                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{s.peakViewers ? s.peakViewers.toLocaleString() : "—"}</div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 transition-colors">
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">GMV</div>
                                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">£{s.gmv.toLocaleString()}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <SoftButton onClick={() => openDetails(s.id)} title="Details">
                                Details <ChevronRight className="h-4 w-4" />
                              </SoftButton>
                              <PrimaryButton onClick={() => openBuilderPage(s.id)} title="Open Live Builder">
                                Build <ExternalLink className="h-4 w-4" />
                              </PrimaryButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {!filtered.length ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-[12px] text-slate-500">
                          No sessionz found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        <NewLiveSessionDrawer
          open={newOpen}
          onClose={() => setNewOpen(false)}
          suppliers={suppliers}
          campaigns={campaigns}
          hosts={hosts}
          onCreate={onCreateSession}
          createPending={isPending}
        />

        <SessionDetailsDrawer
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          session={active}
          supplier={activeSupplier}
          campaign={activeCampaign}
          host={activeHost}
          onOpenBuilder={(id) => openBuilderPage(id)}
        />

        {/* For deep links from Dealz Marketplace: open builder in a drawer */}
        <LiveBuilderDrawer
          open={builderOpen}
          onClose={() => {
            setBuilderOpen(false);
            setBuilderSessionId(undefined);
            setPrefillDealId(undefined);
          }}
          dealId={prefillDealId}
          sessionId={builderSessionId || (prefillDealId ? `ls_${prefillDealId}` : undefined)}
          zIndex={130}
        />
      </div>
    </div>
  );
}
