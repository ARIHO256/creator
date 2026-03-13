import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SupplierLiveDashboardPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: LiveDashboard2.tsx (Creator)
 *
 * Mirror-first (preserved):
 * - PageHeader + right CTAs (Dealz Marketplace back + New Live Session)
 * - KPI/Trend column + Live Sessionz Pro Control Center
 * - Pro sidebar (session context + nav buttons with active highlight)
 * - Go‑Live readiness grid + CTA band
 * - Filters row (search + tab + supplier filter + advanced filters button)
 * - Sessionz table (rich rows, actions)
 * - Drawers: New Live Session, Session Details, Live Builder
 * - Deep-link behavior: ?drawer=liveBuilder&dealId=...
 *
 * Supplier adaptations (minimal, necessary):
 * - Routes point to /supplier/* conventions
 * - Campaigns include creatorUsage/collabMode/approvalMode; sessions display hostRole (Creator vs Supplier-hosted)
 * - Live Alerts Manager: primary surface depends on hostRole
 * - Buttons navigate via local safeNav() (replace with react-router navigate in production)
 */

const ORANGE = "#f77f00";

const ROUTES = {
  dealzMarketplace: "/supplier/dealz-marketplace",
  liveDashboard: "/supplier/live-dashboard",
  liveSchedule: "/supplier/live-schedule",
  liveStudio: "/supplier/live-studio",
  replaysClips: "/supplier/replays-clips",

  // Inward pages (not sidebar): 4c-4h flow under Live.
  streamToPlatforms: "/supplier/live/stream-to-platforms",
  audienceNotifications: "/supplier/live/audience-notifications",
  liveAlertsManager: "/supplier/live/live-alerts",
  overlaysCTAsPro: "/supplier/live/overlays-ctas-pro",
  safetyModeration: "/supplier/live/safety-moderation",
  postLivePublisher: "/supplier/live/post-live-publisher"
};

const cx = (...xs) => xs.filter(Boolean).join(" ");

/* --------------------------------- Helpers -------------------------------- */

function safeNav(url) {
  if (!url) return;
  const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noreferrer");
    return;
  }
  if (typeof window !== "undefined") window.location.assign(target);
}

function parseSearch() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function pad2(n) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function fmtDT(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function combineDateTime(dateISO, timeHHMM) {
  const [y, m, d] = dateISO.split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = timeHHMM.split(":").map((x) => parseInt(x, 10));
  const dt = new Date();
  dt.setFullYear(y, (m || 1) - 1, d || 1);
  dt.setHours(hh || 0, mm || 0, 0, 0);
  return dt.toISOString();
}

function computeCountdownState(now, start, end) {
  if (now < start) return "upcoming";
  if (now >= end) return "ended";
  return "live";
}

/* --------------------------------- Toast ---------------------------------- */

function useToast() {
  const [toast, setToast] = useState(null);
  const tRef = useRef(null);

  const show = (tone, message) => {
    setToast({ tone, message });
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  const dismiss = () => {
    if (tRef.current) window.clearTimeout(tRef.current);
    setToast(null);
  };

  return {
    toast,
    dismiss,
    showSuccess: (m) => show("success", m),
    showError: (m) => show("error", m),
    showInfo: (m) => show("info", m),
    showWarning: (m) => show("warn", m)
  };
}

function Toast({ tone, message, onClose }) {
  const toneCls =
    tone === "success"
      ? "bg-emerald-600"
      : tone === "error"
        ? "bg-rose-600"
        : tone === "warn"
          ? "bg-amber-600"
          : "bg-slate-900";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] px-3">
      <div className={cx("max-w-[92vw] sm:max-w-xl rounded-2xl px-4 py-2.5 shadow-lg text-white", toneCls)}>
        <div className="flex items-start gap-3">
          <span className="text-sm">
            {tone === "success" ? "✅" : tone === "error" ? "⛔" : tone === "warn" ? "⚠️" : "ℹ️"}
          </span>
          <div className="flex-1 text-sm font-semibold">{message}</div>
          <button onClick={onClose} className="text-white/90 hover:text-white text-sm font-bold" aria-label="Dismiss">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Async helper ------------------------------ */

function useAsyncAction(toastApi) {
  const [isPending, setIsPending] = useState(false);

  const run = async (fn, opts = {}) => {
    const {
      successMessage = "Done",
      errorMessage = "Something went wrong",
      delay = 650
    } = opts;

    setIsPending(true);
    try {
      // local latency guard
      if (delay) await new Promise((r) => setTimeout(r, delay));
      const res = await fn();
      toastApi?.showSuccess?.(successMessage);
      return res;
    } catch (e) {
      toastApi?.showError?.(errorMessage);
      return null;
    } finally {
      setIsPending(false);
    }
  };

  return { run, isPending };
}

/* ---------------------------- Scroll time picker --------------------------- */

function buildTimeOptions(stepMinutes = 15) {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

function ScrollableTimePicker({ value, onChange, disabled, stepMinutes = 15 }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const options = useMemo(() => buildTimeOptions(stepMinutes), [stepMinutes]);

  useEffect(() => {
    function onDoc(e) {
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
    const sel = listRef.current?.querySelector?.(`button[data-time="${value}"]`);
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
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
        )}
      >
        <span>{value || "Select time"}</span>
        <span className={cx("text-xs transition", open ? "rotate-180" : "rotate-0")}>▾</span>
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
                  "w-full px-3 py-2 rounded-xl text-left text-[12px] hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors",
                  t === value
                    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 font-bold text-slate-900 dark:text-slate-100"
                    : "border border-transparent text-slate-700 dark:text-slate-300"
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

function MiniLineChart({ values, height = 64 }) {
  const safe = values.length ? values : [0, 0, 0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = max - min || 1;

  const pts = safe.map((v, i) => {
    const x = (i / Math.max(1, safe.length - 1)) * 100;
    const y = 36 - ((v - min) / span) * 32;
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

function BarList({ items }) {
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
              <div className="shrink-0 text-[12px] font-bold text-slate-900 dark:text-slate-100">{Math.round(it.value).toLocaleString()}</div>
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

function isoNowPlus(ms) {
  return new Date(Date.now() + ms).toISOString();
}

const SAMPLE_VIDEO_1 = "";

/* ------------------------------ UI primitives ------------------------------ */

function PageHeader({ pageTitle, rightContent }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full max-w-full px-3 sm:px-4 md:px-5 lg:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {pageTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Premium operations view for Live Sessionz (Supplier)
          </p>
        </div>
        <div className="shrink-0">{rightContent}</div>
      </div>
    </header>
  );
}

function Pill({ text, tone = "neutral" }) {
  const cls =
    tone === "good"
      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"
        : tone === "danger"
          ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
  return <span className={cx("px-2.5 py-1 rounded-full border text-[11px] font-bold", cls)}>{text}</span>;
}

function SoftButton({ children, onClick, disabled, className, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "px-4 py-2 rounded-2xl text-[12px] font-bold inline-flex items-center gap-2 border transition-colors",
        disabled
          ? "bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
          : "bg-white dark:bg-slate-900 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200",
        className
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled, className, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "px-4 py-2 rounded-2xl text-[12px] font-bold inline-flex items-center gap-2 border border-transparent text-white",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:opacity-95",
        className
      )}
      style={{ background: ORANGE }}
    >
      {children}
    </button>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[17px] font-bold text-slate-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function Drawer({ open, onClose, title, subtitle, width = "max-w-[980px]", zIndex = 120, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cx("absolute right-0 top-0 h-full w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-colors", width)}>
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 transition-colors">
          <div className="min-w-0">
            <div className="text-[14px] font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              🎥 {title}
            </div>
            {subtitle ? <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-2xl hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
            ✕
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------- New session wizard ------------------------------- */

function NewLiveSessionDrawer({ open, onClose, suppliers, campaigns, hosts, onCreate }) {
  const now = new Date();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [campaignId, setCampaignId] = useState("");
  const [hostId, setHostId] = useState(hosts[0]?.id || "");
  const [title, setTitle] = useState("New Live Session");
  const [platforms, setPlatforms] = useState(["TikTok Live", "Instagram Live"]);

  const scopedCampaigns = useMemo(() => campaigns.filter((c) => c.supplierId === supplierId), [campaigns, supplierId]);
  const selectedCampaign = useMemo(() => scopedCampaigns.find((c) => c.id === campaignId) || scopedCampaigns[0] || null, [scopedCampaigns, campaignId]);

  useEffect(() => {
    if (!open) return;
    setSupplierId(suppliers[0]?.id || "");
    setCampaignId(scopedCampaigns[0]?.id || "");
    setHostId(hosts[0]?.id || "");
    setTitle("New Live Session");
    setPlatforms(["TikTok Live", "Instagram Live"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!scopedCampaigns.find((c) => c.id === campaignId)) setCampaignId(scopedCampaigns[0]?.id || "");
  }, [scopedCampaigns, campaignId]);

  const availableHosts = useMemo(() => {
    const usage = selectedCampaign?.creatorUsage;
    if (usage === "I will NOT use a Creator") return hosts.filter((h) => h.role === "Supplier");
    if (usage === "I will use a Creator") return hosts.filter((h) => h.role === "Creator");
    return hosts; // not sure: allow both
  }, [hosts, selectedCampaign]);

  useEffect(() => {
    if (!availableHosts.find((h) => h.id === hostId)) setHostId(availableHosts[0]?.id || "");
  }, [availableHosts, hostId]);

  const togglePlatform = (p) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  return (
    <Drawer open={open} onClose={onClose} title="New Live Session" subtitle="Create a session and jump straight into Live Builder (Supplier).">
      <div className="grid sm:grid-cols-2 gap-3">
        <Card title="Basics">
          <div className="grid gap-3">
            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Supplier (Seller / Provider)</div>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-900 dark:text-slate-100 transition-colors">
                {suppliers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.kind})
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Demo: in production this list is your accessible business units.</div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Campaign</div>
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-900 dark:text-slate-100 transition-colors">
                {scopedCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {selectedCampaign ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill text={selectedCampaign.creatorUsage} tone={selectedCampaign.creatorUsage === "I will NOT use a Creator" ? "warn" : selectedCampaign.creatorUsage === "I will use a Creator" ? "good" : "neutral"} />
                  <Pill text={`Mode: ${selectedCampaign.collabMode}`} />
                  <Pill text={`Approval: ${selectedCampaign.approvalMode}`} tone={selectedCampaign.approvalMode === "Manual" ? "warn" : "good"} />
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Select a campaign to attach this session.</div>
              )}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Campaign context controls whether host is a Creator or Supplier-hosted.</div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Session title</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 transition-colors" />
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Host</div>
              <select value={hostId} onChange={(e) => setHostId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-900 dark:text-slate-100 transition-colors">
                {availableHosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.handle}) · {h.role}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Supplier note: Creator-hosted sessions follow collab contract rules; supplier-hosted skips creator negotiation.
              </div>
            </div>
          </div>
        </Card>

        <Card title="Platforms">
          <div className="grid gap-3">
            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Destinations</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["TikTok Live", "Instagram Live", "YouTube Live", "Facebook Live", "Twitch"].map((p) => {
                  const active = platforms.includes(p);
                  const icon = p.includes("TikTok") ? "🎵" : p.includes("Instagram") ? "📸" : p.includes("YouTube") ? "▶️" : p.includes("Facebook") ? "📘" : "🟪";
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={cx(
                        "px-3 py-2 rounded-2xl border text-[12px] font-bold transition-colors flex items-center gap-2",
                        active
                          ? "border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-100"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
                      )}
                    >
                      <span className="text-sm">{icon}</span>
                      {p.replace(" Live", "")}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">Select where you intend to stream. Keys and health checks are configured in Live Builder.</div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-auto pt-4">
              <SoftButton onClick={onClose}>Cancel</SoftButton>
              <PrimaryButton
                onClick={() => {
                  const id = `ls_${Math.random().toString(16).slice(2, 8)}`;
                  const startISO = new Date(Date.now() + 3600 * 1000).toISOString();
                  const endISO = new Date(Date.now() + 7200 * 1000).toISOString();
                  const host = hosts.find((h) => h.id === hostId);
                  onCreate({
                    id,
                    title,
                    supplierId,
                    campaignId,
                    hostId,
                    hostRole: host?.role || "Creator",
                    startISO,
                    endISO,
                    desktopMode: "modal",
                    platforms
                  });
                  onClose();
                }}
              >
                Create & open builder <span className="text-sm">⚡</span>
              </PrimaryButton>
            </div>
          </div>
        </Card>
      </div>
    </Drawer>

  );
}

/* ------------------------------- Session details ------------------------------ */

function SessionDetailsDrawer({ open, onClose, session, supplier, campaign, host, onOpenBuilder, onNav, toastApi, asyncApi }) {
  if (!session) return null;

  const statusTone = session.status === "Live" ? "good" : session.status === "Scheduled" ? "warn" : session.status === "Ended" ? "neutral" : "neutral";

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
            right={<Pill text={session.status} tone={statusTone} />}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Supplier</div>
                <div className="text-[12px] font-bold mt-1 text-slate-900 dark:text-slate-100">{supplier?.name || "—"}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{campaign?.name || "—"}</div>
                {campaign ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill text={campaign.creatorUsage} tone={campaign.creatorUsage === "I will NOT use a Creator" ? "warn" : campaign.creatorUsage === "I will use a Creator" ? "good" : "neutral"} />
                    <Pill text={`Approval: ${campaign.approvalMode}`} tone={campaign.approvalMode === "Manual" ? "warn" : "good"} />
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Host</div>
                <div className="mt-1 flex items-center gap-2">
                  {host?.avatarUrl ? <img src={host.avatarUrl} className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" alt={host.name} /> : null}
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold truncate text-slate-900 dark:text-slate-100">{host?.name || "—"}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{host?.handle || "—"} · {host?.role || session.hostRole}</div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3 transition-colors">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Platforms</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {session.platforms.map((p) => (
                    <Pill key={p} text={p} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <PrimaryButton onClick={() => onOpenBuilder(session.id)}>
                Open Live Builder <span className="text-sm">↗</span>
              </PrimaryButton>

              <SoftButton onClick={() => onNav(`${ROUTES.streamToPlatforms}&sessionId=${encodeURIComponent(session.id)}`)} title="Destinations, output profile, health, test stream">
                Stream to Platforms <span className="text-sm">⚡</span>
              </SoftButton>

              <SoftButton onClick={() => onNav(`${ROUTES.audienceNotifications}&sessionId=${encodeURIComponent(session.id)}`)} title="Tap-to-initiate prompts + reminder schedule">
                Notifications <span className="text-sm">🔔</span>
              </SoftButton>

              <SoftButton onClick={() => onNav(`${ROUTES.overlaysCTAsPro}&sessionId=${encodeURIComponent(session.id)}`)} title="QR overlays, countdown timers, CTAs">
                Overlays <span className="text-sm">🔗</span>
              </SoftButton>

              <SoftButton onClick={() => onNav(`${ROUTES.safetyModeration}&sessionId=${encodeURIComponent(session.id)}`)} title="Chat tools, keyword filters, incident report">
                Safety & Moderation <span className="text-sm">🛡️</span>
              </SoftButton>

              <SoftButton onClick={() => onNav(`${ROUTES.postLivePublisher}&sessionId=${encodeURIComponent(session.id)}`)} title="Replay publish, clips, replay sends, boosters">
                Post-Live <span className="text-sm">📈</span>
              </SoftButton>

              <SoftButton onClick={() => onNav(`${ROUTES.liveAlertsManager}&sessionId=${encodeURIComponent(session.id)}`)} title="Ops quick toggles during live">
                Live Alerts <span className="text-sm">🚨</span>
              </SoftButton>

              <SoftButton onClick={() => toastApi.showSuccess("Live session link copied to clipboard!")}>Share <span className="text-sm">🔗</span></SoftButton>
            </div>
          </Card>

          <Card title="Media" subtitle="Preview image/video used for discovery cards.">
            <div className="aspect-[16/9] rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 overflow-hidden relative transition-colors">
              {session.heroVideoUrl ? (
                <video className="absolute inset-0 w-full h-full object-cover" src={session.heroVideoUrl} poster={session.heroImageUrl} controls />
              ) : (
                <img className="absolute inset-0 w-full h-full object-cover" src={session.heroImageUrl} alt="Hero" />
              )}
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-black/55 border border-white/15 text-white text-[10px] font-bold">LIVE</span>
                <span className="px-2 py-1 rounded-full bg-black/55 border border-white/15 text-white text-[10px] font-bold">{session.desktopMode}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card title="KPIs" subtitle="Performance snapshot.">
            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="Peak viewers" value={session.peakViewers ? session.peakViewers.toLocaleString() : "—"} />
              <MetricBox label="Avg watch" value={session.avgWatchMin ? `${session.avgWatchMin.toFixed(1)}m` : "—"} />
              <MetricBox label="Chat rate" value={session.chatRate ? `${session.chatRate}/min` : "—"} />
              <MetricBox label="GMV" value={`$${session.gmv.toLocaleString()}`} />
            </div>
          </Card>

          <Card title="Readiness" subtitle="Premium: preflight checks + lock windows.">
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-[11px] text-emerald-800 dark:text-emerald-200 flex items-start gap-2 transition-colors">
              <span className="text-sm">✅</span>
              <div>
                <div className="font-bold text-emerald-900 dark:text-emerald-100">Ops-ready</div>
                <div>Assets approved. Stream outputs configured. Schedule set.</div>
              </div>
            </div>
            <div className="mt-2 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2 transition-colors">
              <span className="text-sm">⚠️</span>
              <div>
                <div className="font-bold text-amber-900 dark:text-amber-100">Lock window</div>
                <div>Edits locked within 30 minutes of go-live (premium lock band).</div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3 text-[11px] text-slate-700 dark:text-slate-200">
              <div className="font-bold">Supplier permissions note</div>
              <div className="mt-1">Campaign Managers can edit. View-only roles can monitor readiness and KPIs.</div>
            </div>
          </Card>
        </div>
      </div>
    </Drawer>
  );
}

function MetricBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3 transition-colors">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-[16px] font-bold mt-1 text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

/* ----------------------------- Live Builder Drawer -------------------------- */

export function LiveBuilderDrawer({
  open,
  onClose,
  dealId,
  session = undefined,
  campaign = undefined,
  toastApi = undefined,
  asyncApi = undefined,
  zIndex = 130,
}) {
  const safeAsyncApi = asyncApi ?? {
    isPending: false,
    run: async (fn) => {
      try {
        return await fn();
      } catch {
        return false;
      }
    },
  };
  const [tab, setTab] = useState("Basics");
  const [saving, setSaving] = useState(false);

  // Basics
  const [title, setTitle] = useState(session?.title || "");
  const [desktopMode, setDesktopMode] = useState(session?.desktopMode || "modal");
  const [platforms, setPlatforms] = useState(session?.platforms || []);

  // Schedule
  const [dateISO, setDateISO] = useState(toISODate(new Date(session?.startISO || Date.now() + 3600 * 1000)));
  const [startTime, setStartTime] = useState("20:00");
  const [endTime, setEndTime] = useState("21:00");

  // Streaming keys
  const [keys, setKeys] = useState({
    "TikTok Live": "",
    "Instagram Live": "",
    "YouTube Live": "",
    "Facebook Live": "",
    Twitch: ""
  });

  // Moderation
  const [keywordBlock, setKeywordBlock] = useState("spam\nscam\noff-platform");
  const [slowMode, setSlowMode] = useState(true);

  // Overlays
  const [ctaLabel, setCtaLabel] = useState("Shop now");
  const [ctaLink, setCtaLink] = useState("https://mldz.link/store/evworld");
  const [ctaPinned, setCtaPinned] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [clipsOpen, setClipsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab("Basics");
    setTitle(session?.title || "");
    setDesktopMode(session?.desktopMode || "modal");
    setPlatforms(session?.platforms || []);
    setDateISO(toISODate(new Date(session?.startISO || Date.now() + 3600 * 1000)));
    setStartTime("20:00");
    setEndTime("21:00");
    setKeys({ "TikTok Live": "", "Instagram Live": "", "YouTube Live": "", "Facebook Live": "", Twitch: "" });
    setKeywordBlock("spam\nscam\noff-platform");
    setSlowMode(true);
    setCtaLabel("Shop now");
    setCtaLink("https://mldz.link/store/evworld");
    setCtaPinned(false);
    setIncidentOpen(false);
    setClipsOpen(false);
  }, [open, session?.id]);

  const togglePlatform = (p) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const startISO = useMemo(() => combineDateTime(dateISO, startTime), [dateISO, startTime]);
  const endISO = useMemo(() => combineDateTime(dateISO, endTime), [dateISO, endTime]);

  const saveDraft = async () => {
    setSaving(true);
    await safeAsyncApi.run(
      async () => {
        // local validation
        if (!title.trim()) throw new Error("missing title");
        return true;
      },
      { successMessage: "Live Builder draft saved", errorMessage: "Save failed: fill required fields", delay: 800 }
    );
    setSaving(false);
  };

  const validate = async () => {
    await safeAsyncApi.run(
      async () => {
        if (!platforms.length) throw new Error("missing platforms");
        return true;
      },
      { successMessage: "Preflight OK", errorMessage: "Preflight blocked: choose at least one platform", delay: 900 }
    );
  };

  const publish = async () => {
    const submitted = await safeAsyncApi.run(
      async () => {
        // In production: enforce approvals and lock windows.
        return true;
      },
      { successMessage: "Submitted for approvals", errorMessage: "Submission failed", delay: 900 }
    );
    if (!submitted) return;
    onClose?.();
  };

  const tabBtn = (t) =>
    cx(
      "px-3 py-2 rounded-2xl border text-[12px] font-bold transition-colors",
      tab === t
        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:bg-slate-900 dark:text-slate-900 dark:border-white"
        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
    );

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Live Builder"
        subtitle={dealId ? `Prefilled from Deal: ${dealId}` : session?.id ? `Session: ${session.id}` : "Create & configure live"}
        width="max-w-[1180px]"
        zIndex={zIndex}
      >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Campaign context</div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {campaign ? (
              <>
                <Pill text={campaign.name} />
                <Pill text={campaign.creatorUsage} tone={campaign.creatorUsage === "I will NOT use a Creator" ? "warn" : campaign.creatorUsage === "I will use a Creator" ? "good" : "neutral"} />
                <Pill text={`Approval: ${campaign.approvalMode}`} tone={campaign.approvalMode === "Manual" ? "warn" : "good"} />
              </>
            ) : (
              <Pill text="No campaign attached" tone="warn" />
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Supplier note: scheduling is allowed after Admin approval (and Supplier approval if Manual mode).
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SoftButton onClick={validate} disabled={safeAsyncApi.isPending || saving} title="Run preflight checks">
            Preflight {safeAsyncApi.isPending ? "…" : "✓"}
          </SoftButton>
          <SoftButton onClick={saveDraft} disabled={saving || safeAsyncApi.isPending} title="Save changes">
            {saving ? "Saving…" : "Save"}
          </SoftButton>
          <PrimaryButton onClick={publish} disabled={safeAsyncApi.isPending} title="Submit for approvals">
            Submit
          </PrimaryButton>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {["Basics", "Stream", "Overlays", "Safety", "Schedule", "Post‑Live"].map((t) => (
          <button key={t} type="button" className={tabBtn(t)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {tab === "Basics" ? (
            <Card title="Basics" subtitle="Title, mode, and core identity">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Title</div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Desktop mode</div>
                  <select value={desktopMode} onChange={(e) => setDesktopMode(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-900 dark:text-slate-100">
                    <option value="modal">modal</option>
                    <option value="fullscreen">fullscreen</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Platforms</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["TikTok Live", "Instagram Live", "YouTube Live", "Facebook Live", "Twitch"].map((p) => {
                    const active = platforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={cx(
                          "px-3 py-2 rounded-2xl border text-[12px] font-bold transition-colors",
                          active
                            ? "border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-100"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
                        )}
                      >
                        {p.replace(" Live", "")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          ) : null}

          {tab === "Stream" ? (
            <Card title="Stream to Platforms" subtitle="Keys, outputs, and health">
              <div className="grid sm:grid-cols-2 gap-3">
                {platforms.length ? (
                  platforms.map((p) => (
                    <div key={p} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{p}</div>
                      <input
                        value={keys[p] || ""}
                        onChange={(e) => setKeys((prev) => ({ ...prev, [p]: e.target.value }))}
                        placeholder="Stream key / RTMP URL"
                        className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <SoftButton onClick={() => toastApi.showInfo(`Test stream started for ${p}`)}>
                          Test
                        </SoftButton>
                        <SoftButton onClick={() => toastApi.showSuccess(`Health check OK for ${p}`)}>
                          Health
                        </SoftButton>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">Select at least one platform under Basics.</div>
                )}
              </div>
            </Card>
          ) : null}

          {tab === "Overlays" ? (
            <Card title="Overlays & CTAs" subtitle="QR, short links, countdown, lower-thirds">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">CTA label</div>
                  <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">CTA link</div>
                  <input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100" />
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Preview</div>
                <div className="mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{ctaLabel}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[520px]">{ctaLink}</div>
                  </div>
                  <button
                    className="px-3 py-2 rounded-2xl text-white text-[12px] font-bold"
                    style={{ background: ORANGE }}
                    type="button"
                    onClick={() => setCtaPinned((prev) => !prev)}
                  >
                    {ctaPinned ? "Unpin CTA" : "Pin CTA"}
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Status: {ctaPinned ? "Pinned to overlay" : "Not pinned"}</div>
              </div>
            </Card>
          ) : null}

          {tab === "Safety" ? (
            <Card title="Safety & Moderation" subtitle="Keyword filters, slow mode, emergency controls">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Blocked keywords</div>
                  <textarea value={keywordBlock} onChange={(e) => setKeywordBlock(e.target.value)} rows={6} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100" />
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">One per line. Applied to live chat + comments (policy-based).</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Controls</div>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 text-[12px] font-bold text-slate-800 dark:text-slate-200">
                      <input type="checkbox" checked={slowMode} onChange={(e) => setSlowMode(e.target.checked)} />
                      Enable slow mode
                    </label>
                    <SoftButton onClick={() => safeAsyncApi.run(async () => true, { successMessage: "Emergency mute activated", delay: 700 })}>
                      Emergency mute
                    </SoftButton>
                    <SoftButton onClick={() => setIncidentOpen(true)}>Report incident</SoftButton>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {tab === "Schedule" ? (
            <Card title="Schedule" subtitle="Set go-live window and lock rules">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Date</div>
                  <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Start time</div>
                  <ScrollableTimePicker value={startTime} onChange={setStartTime} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">End time</div>
                  <ScrollableTimePicker value={endTime} onChange={setEndTime} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Computed window</div>
                  <div className="mt-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3">
                    <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{fmtDT(startISO)} → {fmtDT(endISO)}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Edits lock 30 minutes before start (policy).</div>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {tab === "Post‑Live" ? (
            <Card title="Post‑Live" subtitle="Replay publish, clips, replay sends, boosters">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">Replay publish</div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Auto publish to Replays & Clips once approved.</div>
                  <div className="mt-2 flex items-center gap-2">
                    <SoftButton onClick={() => toastApi.showSuccess("Replay publish scheduled")}>Schedule</SoftButton>
                    <SoftButton onClick={() => setClipsOpen(true)}>Generate clips</SoftButton>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">Boosters</div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Retarget with Shoppable Adz cutdowns.</div>
                  <div className="mt-2 flex items-center gap-2">
                    <SoftButton onClick={() => toastApi.showInfo("Create Adz Booster")}>Create booster</SoftButton>
                    <SoftButton onClick={() => toastApi.showInfo("Export share cards")}>Export cards</SoftButton>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-3">
          <Card title="Builder checklist" subtitle="Premium preflight summary">
            <div className="space-y-2">
              <CheckRow ok={Boolean(title.trim())} label="Title" hint="Required" />
              <CheckRow ok={platforms.length > 0} label="Platforms" hint={platforms.length ? platforms.join(", ") : "Select at least one"} />
              <CheckRow ok={Boolean(ctaLink.trim())} label="CTA link" hint="Recommended" />
              <CheckRow ok={Boolean(keywordBlock.trim())} label="Moderation baseline" hint="Recommended" />
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Next</div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">After approvals, go-live uses Stream to Platforms preflight and health checks.</div>
            </div>
          </Card>

          <Card title="Quick links" subtitle="Stays within Supplier sidebar">
            <div className="grid grid-cols-2 gap-2">
              <SoftButton onClick={() => safeNav(ROUTES.liveSchedule)} title="Supplier Live Schedule">Schedule</SoftButton>
              <SoftButton onClick={() => safeNav(ROUTES.replaysClips)} title="Replays & Clips">Replays</SoftButton>
              <SoftButton onClick={() => safeNav(ROUTES.dealzMarketplace)} title="Dealz Marketplace">Dealz</SoftButton>
              <SoftButton onClick={() => safeNav(ROUTES.liveStudio)} title="Live Studio">Studio</SoftButton>
            </div>
          </Card>
        </div>
      </div>
      </Drawer>

      <Drawer
        open={incidentOpen}
        onClose={() => setIncidentOpen(false)}
        title="Incident Report"
        subtitle="Capture moderation or stream issues for follow-up."
        width="max-w-[760px]"
        zIndex={zIndex + 1}
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3 text-[12px] text-slate-700 dark:text-slate-300">
            Session: <span className="font-bold text-slate-900 dark:text-slate-100">{session?.id || "N/A"}</span>
          </div>
          <textarea
            rows={6}
            placeholder="Describe what happened, when it happened, and what was affected."
            className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100"
          />
          <div className="flex items-center justify-end gap-2">
            <SoftButton onClick={() => setIncidentOpen(false)}>Cancel</SoftButton>
            <PrimaryButton
              onClick={() => {
                setIncidentOpen(false);
                toastApi.showSuccess("Incident report submitted");
              }}
            >
              Submit report
            </PrimaryButton>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={clipsOpen}
        onClose={() => setClipsOpen(false)}
        title="Clip Generator"
        subtitle="Choose clip moments and generate post-live snippets."
        width="max-w-[760px]"
        zIndex={zIndex + 1}
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3 text-[12px] text-slate-700 dark:text-slate-300">
            Use this to generate recap clips for replay and promo workflows.
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-[12px] font-bold text-slate-800 dark:text-slate-200">
              <input type="checkbox" defaultChecked />
              Intro hook clip
            </label>
            <label className="flex items-center gap-2 text-[12px] font-bold text-slate-800 dark:text-slate-200">
              <input type="checkbox" defaultChecked />
              Product demo clip
            </label>
            <label className="flex items-center gap-2 text-[12px] font-bold text-slate-800 dark:text-slate-200">
              <input type="checkbox" defaultChecked />
              Offer highlight clip
            </label>
            <label className="flex items-center gap-2 text-[12px] font-bold text-slate-800 dark:text-slate-200">
              <input type="checkbox" />
              FAQ clip
            </label>
          </div>
          <div className="flex items-center justify-end gap-2">
            <SoftButton onClick={() => setClipsOpen(false)}>Close</SoftButton>
            <PrimaryButton
              onClick={() => {
                setClipsOpen(false);
                toastApi.showSuccess("Clip generation started");
              }}
            >
              Generate clips
            </PrimaryButton>
          </div>
        </div>
      </Drawer>
    </>
  );
}

function CheckRow({ ok, label, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[13px] font-bold truncate text-slate-900 dark:text-slate-100">{label}</div>
        {hint ? <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{hint}</div> : null}
      </div>
      <Pill text={ok ? "OK" : "Fix"} tone={ok ? "good" : "warn"} />
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function SupplierLiveDashboardPage() {
  const navigate = useNavigate();
  const toastApi = useToast();
  const { run, isPending } = useAsyncAction(toastApi);

  const [sessions, setSessions] = useState<Array<Record<string, any>>>([]);
  const suppliers = useMemo<Array<Record<string, any>>>(() => [], []);
  const campaigns = useMemo<Array<Record<string, any>>>(() => [], []);
  const hosts = useMemo<Array<Record<string, any>>>(() => [], []);

  // Filters
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [supplierId, setSupplierId] = useState("all");

  // Drawers
  const [newOpen, setNewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // Builder drawer (deep links)
  const [builderOpen, setBuilderOpen] = useState(false);
  const [prefillDealId, setPrefillDealId] = useState(undefined);
  const [builderSessionId, setBuilderSessionId] = useState(undefined);

  // Pro hub context
  const [toolSessionId, setToolSessionId] = useState("");

  // Active path highlight (mirrors isActivePath behavior)
  const [pathname, setPathname] = useState("");
  const currentPath = pathname || (typeof window !== "undefined" ? window.location.pathname : "");

  const isActivePath = (route) => {
    if (!route) return false;
    // Normalize by stripping trailing slash
    const base = route !== "/" && route.endsWith("/") ? route.slice(0, -1) : route;
    const cur = currentPath || "";
    return Boolean(cur) && (cur === base || cur.startsWith(base + "/") || (route.includes("?") && cur.startsWith(route.split("?")[0])));
  };

  const navBtnBase =
    "w-full px-3 py-2 rounded-2xl border text-[13px] font-bold flex items-center justify-between gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed";
  const navInactive =
    "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100";
  const proActive = "bg-violet-600 border-violet-600 text-white";

  const safeNav = (url) => {
    if (!url) return;
    setPathname(url.split("?")[0]);
    const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noreferrer");
      return;
    }
    navigate(target);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    if (activeId) setToolSessionId(activeId);
  }, [activeId]);

  useEffect(() => {
    if (!sessions.length) return;
    if (!toolSessionId || !sessions.find((s) => s.id === toolSessionId)) {
      setToolSessionId(sessions[0].id);
    }
  }, [sessions, toolSessionId]);

  useEffect(() => {
    const sp = parseSearch();
    const drawer = sp.get("drawer");
    const dealId = sp.get("dealId") || undefined;
    if (drawer === "liveBuilder") {
      setPrefillDealId(dealId);
      setBuilderOpen(true);
      toastApi.showInfo("Deep-link: Live Builder opened");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const viewersTrend = useMemo(() => {
    if (!sessions.length) return Array.from({ length: 14 }, () => 0);
    const total = sessions.reduce((sum, session) => sum + Number(session.peakViewers || 0), 0);
    const average = Math.round(total / Math.max(1, sessions.length));
    return Array.from({ length: 14 }, (_, index) => Math.max(0, Math.round((average * (index + 1)) / 14)));
  }, [sessions]);

  const byPlatform = useMemo(() => {
    const m = new Map();
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

  const toolSession = useMemo(() => sessions.find((s) => s.id === toolSessionId) || null, [sessions, toolSessionId]);
  const toolSupplier = useMemo(() => (toolSession ? suppliers.find((p) => p.id === toolSession.supplierId) : undefined), [toolSession, suppliers]);
  const toolHost = useMemo(() => (toolSession ? hosts.find((h) => h.id === toolSession.hostId) : undefined), [toolSession, hosts]);
  const toolCampaign = useMemo(() => (toolSession?.campaignId ? campaigns.find((c) => c.id === toolSession.campaignId) : undefined), [toolSession, campaigns]);

  const waPrompt = useMemo(() => {
    if (!toolSession) return null;
    const end = new Date(toolSession.endISO);
    if (Number.isNaN(end.getTime())) return null;
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
      };
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
    };
  }, [toolSession]);

  const readiness = useMemo(() => {
    if (!toolSession) return { ok: false, items: [] };

    const start = new Date(toolSession.startISO);
    const end = new Date(toolSession.endISO);
    const timeOk = end.getTime() > start.getTime();
    const basicsOk = Boolean(toolSession.title?.trim()) && Boolean(toolSession.hostId) && timeOk;

    const platformsOk = toolSession.platforms?.length > 0;
    const heroOk = Boolean(toolSession.heroImageUrl);
    const waOk = !waPrompt ? false : waPrompt.getTime() < start.getTime();
    const crewOk = (toolSession.crewConflicts || 0) === 0;

    const items = [
      { label: "Session basics complete", ok: basicsOk, hint: "Title, host, valid start/end" },
      { label: "Crew conflicts resolved", ok: crewOk, hint: crewOk ? "Roster is clear" : `${toolSession.crewConflicts} conflict(s). Fix in Crew Manager.` },
      { label: "Platforms selected", ok: platformsOk, hint: platformsOk ? toolSession.platforms.join(", ") : "Select destinations" },
      { label: "Hero media attached", ok: heroOk, hint: "Discovery uses hero image/video" },
      { label: "WhatsApp prompt time valid", ok: waOk, hint: waPrompt ? `Computed: ${fmtDT(waPrompt.toISOString())}` : "Compute after end time is set" },
      { label: "Moderation baseline", ok: true, hint: "Keyword filters + emergency controls" },
      { label: "Post-live plan", ok: true, hint: "Replay publish + clips + replay sends" }
    ];

    const ok = items.slice(0, 5).every((x) => x.ok);
    return { ok, items };
  }, [toolSession, waPrompt]);

  function openDetails(id) {
    setActiveId(id);
    setToolSessionId(id);
    setDetailsOpen(true);
  }

  function openBuilderPage(sessionId, dealId) {
    setBuilderSessionId(sessionId);
    if (dealId) setPrefillDealId(dealId);
    setBuilderOpen(true);
  }

  async function onCreateSession(payload) {
    await run(
      async () => {
        const heroImageUrl = "https://images.unsplash.com/photo-1520975958225-82284e3d2e52?auto=format&fit=crop&w=1200&q=60";
        const created = {
          id: payload.id,
          title: payload.title,
          status: "Draft",
          supplierId: payload.supplierId,
          campaignId: payload.campaignId,
          hostId: payload.hostId,
          hostRole: payload.hostRole,
          platforms: payload.platforms,
          heroImageUrl,
          heroVideoUrl: SAMPLE_VIDEO_1,
          desktopMode: payload.desktopMode,
          startISO: payload.startISO,
          endISO: payload.endISO,
          peakViewers: 0,
          avgWatchMin: 0,
          chatRate: 0,
          gmv: 0,
          crewConflicts: 0
        };

        setSessions((prev) => [created, ...prev]);
        openBuilderPage(created.id);
      },
      {
        successMessage: `Session "${payload.title}" created successfully!`,
        errorMessage: "Connection failed. Please check your network and try again.",
        delay: 1100
      }
    );
  }

  const hostPrimaryLabel = toolHost?.role === "Supplier" ? "Supplier Studio (primary)" : "Creator App (primary)";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Live Dashboard"
        rightContent={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <SoftButton onClick={() => safeNav(ROUTES.dealzMarketplace)} title="Back to Dealz Marketplace">
              <span className="text-sm">←</span> Dealz Marketplace
            </SoftButton>
            <SoftButton onClick={() => safeNav(ROUTES.liveSchedule)} title="Open Live Schedule">
              Live Schedule <span className="text-sm">📅</span>
            </SoftButton>
            <PrimaryButton onClick={() => setNewOpen(true)}>
              New Live Session <span className="text-sm">＋</span>
            </PrimaryButton>
          </div>
        }
      />

      <div className="w-full max-w-full px-3 sm:px-4 md:px-5 lg:px-6 py-2.5">
        <div className="mb-2.5 flex flex-col gap-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            Premium operations view for Live Sessionz (schedule, readiness, performance).
          </div>
        </div>

        <div className="mt-3">
          <main className="min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3">
              <div className="lg:col-span-7 space-y-2.5">
                <Card title="Viewers trend" subtitle="Last 14 days">
                  <MiniLineChart values={viewersTrend} height={78} />
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <KpiTile label="Total GMV" value={`$${kpis.gmv.toLocaleString()}`} />
                    <KpiTile label="Live now" value={String(kpis.live)} />
                    <KpiTile label="Upcoming" value={String(kpis.upcoming)} />
                    <KpiTile label="Drafts" value={String(kpis.drafts)} />
                  </div>
                </Card>

                <Card title="Live Sessionz Pro — Control Center" subtitle="All premium tools wired to the selected live session (open as Live Studio tabs while keeping context).">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Active session</div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <select
                          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 transition-colors"
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
                            tone={toolSession.status === "Live" ? "good" : toolSession.status === "Scheduled" ? "warn" : "neutral"}
                          />
                        ) : null}

                        {toolSupplier?.name ? <Pill text={toolSupplier.name} /> : null}
                        {toolHost?.handle ? <Pill text={`${toolHost.handle} · ${toolHost.role}`} /> : null}
                      </div>

                      {toolSession ? (
                        <div className="text-[11px] text-slate-500 mt-2">
                          {fmtDT(toolSession.startISO)} → {fmtDT(toolSession.endISO)}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 mt-2">Select a session to open Pro tools.</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <SoftButton onClick={() => (toolSession ? openDetails(toolSession.id) : null)} disabled={!toolSession} title="Open details drawer">
                        Details <span className="text-sm">↗</span>
                      </SoftButton>
                      <PrimaryButton onClick={() => (toolSession ? openBuilderPage(toolSession.id) : null)} disabled={!toolSession}>
                        Open Live Builder <span className="text-sm">🎥</span>
                      </PrimaryButton>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <ProToolCard
                      title="Stream to Platforms"
                      desc="Destinations • quality profiles • health • test stream"
                      status={toolStatus.stream}
                      primary={{ label: "Open", onClick: () => toolSession && safeNav(`${ROUTES.streamToPlatforms}&sessionId=${encodeURIComponent(toolSession.id)}`) }}
                      secondary={{ label: "Test Stream", onClick: () => toolSession && safeNav(`${ROUTES.streamToPlatforms}&sessionId=${encodeURIComponent(toolSession.id)}&mode=test`) }}
                      disabled={!toolSession}
                    />

                    <ProToolCard
                      title="Audience Notifications"
                      desc="Tap-to-initiate • QR/link prompts • reminder schedule"
                      status={toolStatus.notify}
                      meta={
                        waPrompt ? (
                          <span>
                            WhatsApp prompt time: <span className="font-bold">{fmtDT(waPrompt.toISOString())}</span>
                          </span>
                        ) : (
                          "WhatsApp prompt time will compute after an end time is set."
                        )
                      }
                      primary={{ label: "Open", onClick: () => toolSession && safeNav(`${ROUTES.audienceNotifications}&sessionId=${encodeURIComponent(toolSession.id)}`) }}
                      secondary={{ label: "Prompts", onClick: () => toolSession && safeNav(`${ROUTES.audienceNotifications}&sessionId=${encodeURIComponent(toolSession.id)}&tab=prompt`) }}
                      disabled={!toolSession}
                    />

                    <ProToolCard
                      title="Overlays & CTAs Pro"
                      desc="QR overlay • short links • countdown • lower-thirds"
                      status={toolStatus.overlays}
                      primary={{ label: "Open", onClick: () => toolSession && safeNav(`${ROUTES.overlaysCTAsPro}&sessionId=${encodeURIComponent(toolSession.id)}`) }}
                      secondary={{
                        label: isPending ? "Exporting…" : "Export pack",
                        onClick: () => run(async () => true, { successMessage: "Overlays pack exported successfully!", delay: 800 })
                      }}
                      disabled={!toolSession}
                      secondaryDisabled={!toolSession || isPending}
                    />

                    <ProToolCard
                      title="Safety & Moderation"
                      desc="Chat tools • keyword filters • incident report"
                      status={toolStatus.safety}
                      primary={{ label: "Open", onClick: () => toolSession && safeNav(`${ROUTES.safetyModeration}&sessionId=${encodeURIComponent(toolSession.id)}`) }}
                      secondary={{
                        label: isPending ? "Muting…" : "Emergency mute",
                        onClick: () => run(async () => true, { successMessage: "Emergency mute activated for all chats!", delay: 900 })
                      }}
                      disabled={!toolSession}
                      secondaryDisabled={!toolSession || isPending}
                    />

                    <ProToolCard
                      title="Post‑Live Publisher"
                      desc="Replay publish • clips • replay sends • boosters"
                      status={toolStatus.post}
                      primary={{ label: "Open", onClick: () => toolSession && safeNav(`${ROUTES.postLivePublisher}&sessionId=${encodeURIComponent(toolSession.id)}`) }}
                      secondary={{
                        label: isPending ? "Generating…" : "Generate cards",
                        onClick: () => run(async () => true, { successMessage: "Replay share cards generated!", delay: 900 })
                      }}
                      disabled={!toolSession}
                      secondaryDisabled={!toolSession || isPending}
                    />

                    <ProToolCard
                      wide
                      title="Live Alerts Manager"
                      desc="One-tap alerts during a live (without disrupting stream)"
                      status={toolStatus.alerts}
                      primary={{ label: "Open", onClick: () => toolSession && safeNav(`${ROUTES.liveAlertsManager}&sessionId=${encodeURIComponent(toolSession.id)}`) }}
                      secondary={{ label: hostPrimaryLabel, onClick: () => {} }}
                      tertiary={{ label: "Quick toggles", onClick: () => toolSession && safeNav(`${ROUTES.liveAlertsManager}&sessionId=${encodeURIComponent(toolSession.id)}&mode=quick`) }}
                      disabled={!toolSession}
                      secondaryDisabled
                    />
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
                    <span className="px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-bold">
                      PRO
                    </span>
                  </div>

                  <div className="mt-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-2.5 transition-colors">
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
                          <Pill text={toolSession.status} tone={toolSession.status === "Live" ? "good" : toolSession.status === "Scheduled" ? "warn" : "neutral"} />
                        ) : (
                          <Pill text="Select session" />
                        )}
                        {toolSupplier?.name ? <Pill text={toolSupplier.name} /> : null}
                        {toolHost?.handle ? <Pill text={`${toolHost.handle} · ${toolHost.role}`} /> : null}
                      </div>

                      <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                        WA prompt: <span className="font-bold text-slate-900 dark:text-slate-100">{waPrompt ? fmtDT(waPrompt.toISOString()) : "—"}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Computed as (end + 15m) − 24h to keep WhatsApp valid until session end + buffer.
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.streamToPlatforms) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.streamToPlatforms}&sessionId=${encodeURIComponent(toolSession.id)}`)}
                    >
                      <span className="inline-flex items-center gap-2">⚡ Stream to Platforms</span>
                      {isActivePath(ROUTES.streamToPlatforms) ? <span className="text-[11px] text-white/90">Active</span> : <span className="text-slate-500">›</span>}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.audienceNotifications) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.audienceNotifications}&sessionId=${encodeURIComponent(toolSession.id)}`)}
                    >
                      <span className="inline-flex items-center gap-2">🔔 Audience Notifications</span>
                      {isActivePath(ROUTES.audienceNotifications) ? <span className="text-[11px] text-white/90">Active</span> : <span className="text-slate-500">›</span>}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.liveAlertsManager) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.liveAlertsManager}&sessionId=${encodeURIComponent(toolSession.id)}`)}
                    >
                      <span className="inline-flex items-center gap-2">🚨 Live Alerts Manager</span>
                      {isActivePath(ROUTES.liveAlertsManager) ? <span className="text-[11px] text-white/90">Active</span> : <span className="text-slate-500">›</span>}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.overlaysCTAsPro) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.overlaysCTAsPro}&sessionId=${encodeURIComponent(toolSession.id)}`)}
                    >
                      <span className="inline-flex items-center gap-2">🔗 Overlays & CTAs Pro</span>
                      {isActivePath(ROUTES.overlaysCTAsPro) ? <span className="text-[11px] text-white/90">Active</span> : <span className="text-slate-500">›</span>}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.safetyModeration) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.safetyModeration}&sessionId=${encodeURIComponent(toolSession.id)}`)}
                    >
                      <span className="inline-flex items-center gap-2">🛡️ Safety & Moderation</span>
                      {isActivePath(ROUTES.safetyModeration) ? <span className="text-[11px] text-white/90">Active</span> : <span className="text-slate-500">›</span>}
                    </button>

                    <button
                      type="button"
                      className={cx(navBtnBase, isActivePath(ROUTES.postLivePublisher) ? proActive : navInactive)}
                      disabled={!toolSession}
                      onClick={() => toolSession && safeNav(`${ROUTES.postLivePublisher}&sessionId=${encodeURIComponent(toolSession.id)}`)}
                    >
                      <span className="inline-flex items-center gap-2">📈 Post‑Live</span>
                      {isActivePath(ROUTES.postLivePublisher) ? <span className="text-[11px] text-white/90">Active</span> : <span className="text-slate-500">›</span>}
                    </button>
                  </div>

                  <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900 p-2.5 text-xs text-amber-900 dark:text-amber-100">
                    <div className="font-bold">Tip</div>
                    <div className="mt-1">
                      Use “Stream to Platforms” for preflight + multistream health. Notifications uses the tap-to-start model (WhatsApp 24h window).
                    </div>
                  </div>
                </div>

                <Card title="Platforms" subtitle="Where viewers are coming from">
                  <BarList items={byPlatform} />
                </Card>
              </div>

              <div className="lg:col-span-12">
                <Card title="Go‑Live readiness" subtitle="Lightweight preflight summary (demo logic).">
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

                  <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 p-3 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold">Go Live Readiness Status</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Routes you to <span className="font-bold">Stream to Platforms</span> where final preflight + per-destination errors are handled.
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Pill text={readiness.ok ? "Ready to stream" : "Preflight Blocked"} tone={readiness.ok ? "good" : "warn"} />
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
                        <div className="flex items-center gap-2">
                          <PrimaryButton
                            onClick={() => toolSession && safeNav(`${ROUTES.streamToPlatforms}&sessionId=${encodeURIComponent(toolSession.id)}&goLive=1`)}
                            disabled={!toolSession || !readiness.ok}
                            title={!readiness.ok ? "Fix readiness items first" : "Proceed"}
                          >
                            Go Live <span className="text-sm">⚡</span>
                          </PrimaryButton>

                          <SoftButton onClick={() => (toolSession ? openBuilderPage(toolSession.id) : null)} disabled={!toolSession} title="Fix basics in Live Builder">
                            Fix in Builder <span className="text-sm">🎥</span>
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

            <div className="mt-2.5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
                  <span className="text-slate-500 dark:text-slate-400">🔎</span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search sessionz by title or ID…"
                    className="w-full text-[12px] outline-none bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-600"
                  />
                </div>

                <select
                  className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-900 dark:text-slate-100 transition-colors cursor-pointer outline-none"
                  value={tab}
                  onChange={(e) => setTab(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Live">Live</option>
                  <option value="Ended">Ended</option>
                </select>

                <select
                  className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-900 dark:text-slate-100 transition-colors cursor-pointer outline-none"
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

                <SoftButton onClick={() => toastApi.showInfo("Advanced filters are being configured.")}>🧰 Filters</SoftButton>
              </div>
            </div>

            <div className="mt-2.5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="text-[17px] font-bold text-slate-900 dark:text-slate-100">Sessionz</div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{filtered.length} shown</div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-[1320px] w-full">
                  <thead className="bg-gray-50 dark:bg-slate-950">
                    <tr className="text-left text-[11px] text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2 font-bold min-w-[300px]">Session</th>
                      <th className="px-3 py-2 font-bold min-w-[210px]">Supplier</th>
                      <th className="px-3 py-2 font-bold min-w-[150px]">Timing</th>
                      <th className="px-3 py-2 font-bold min-w-[180px]">Platforms</th>
                      <th className="px-3 py-2 font-bold min-w-[260px]">KPIs</th>
                      <th className="px-3 py-2 font-bold text-right min-w-[240px]">Actions</th>
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
                                <img src={s.heroImageUrl} alt={s.title} className="h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="text-[12px] font-bold truncate text-slate-900 dark:text-slate-100">{s.title}</div>
                                  <Pill text={s.status} tone={tone} />
                                  <Pill text={s.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"} tone={s.hostRole === "Supplier" ? "warn" : "good"} />
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
                                <div className="text-[12px] font-bold truncate text-slate-900 dark:text-slate-100">{p?.name || "—"}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{campaigns.find((c) => c.id === s.campaignId)?.name || "—"}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {s.status === "Draft" ? (
                              <Pill text="Schedule needed" tone="warn" />
                            ) : (
                              <>
                                <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{fmtDT(s.startISO)}</div>
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
                              <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 transition-colors">
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">Peak</div>
                                <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{s.peakViewers ? s.peakViewers.toLocaleString() : "—"}</div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 transition-colors">
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">GMV</div>
                                <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">${s.gmv.toLocaleString()}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <SoftButton onClick={() => openDetails(s.id)} title="Details">
                                Details <span className="text-sm">›</span>
                              </SoftButton>
                              <PrimaryButton onClick={() => openBuilderPage(s.id)} title="Open Live Builder">
                                Build <span className="text-sm">↗</span>
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
        />

        <SessionDetailsDrawer
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          session={active}
          supplier={activeSupplier}
          campaign={activeCampaign}
          host={activeHost}
          onOpenBuilder={(id) => openBuilderPage(id)}
          onNav={safeNav}
          toastApi={toastApi}
          asyncApi={{ run, isPending }}
        />

        <LiveBuilderDrawer
          open={builderOpen}
          onClose={() => {
            setBuilderOpen(false);
            setBuilderSessionId(undefined);
            setPrefillDealId(undefined);
          }}
          dealId={prefillDealId}
          session={sessions.find((s) => s.id === (builderSessionId || "")) || null}
          campaign={
            builderSessionId
              ? campaigns.find((c) => c.id === sessions.find((s) => s.id === builderSessionId)?.campaignId)
              : null
          }
          toastApi={toastApi}
          asyncApi={{ run, isPending }}
          zIndex={130}
        />
      </div>

      {toastApi.toast ? (
        <Toast tone={toastApi.toast.tone} message={toastApi.toast.message} onClose={toastApi.dismiss} />
      ) : null}
    </div>
  );
}

function KpiTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-2.5 transition-colors">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function ProToolCard({ title, desc, status, meta, primary, secondary, tertiary, disabled, secondaryDisabled, wide }) {
  return (
    <div className={cx("rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors", wide ? "sm:col-span-2" : "")}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12px] font-bold">{title}</div>
          <div className="text-[11px] text-slate-500 mt-1">{desc}</div>
        </div>
        <Pill text={status.label} tone={status.tone === "good" ? "good" : status.tone === "warn" ? "warn" : "neutral"} />
      </div>

      {meta ? <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">{meta}</div> : null}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <PrimaryButton onClick={primary.onClick} disabled={disabled}>{primary.label} <span className="text-sm">↗</span></PrimaryButton>
        {secondary ? (
          <SoftButton onClick={secondary.onClick} disabled={secondaryDisabled || disabled} title={secondaryDisabled ? "Disabled" : undefined}>
            {secondary.label} <span className="text-sm">⤓</span>
          </SoftButton>
        ) : null}
        {tertiary ? (
          <SoftButton onClick={tertiary.onClick} disabled={disabled}>{tertiary.label} <span className="text-sm">⚡</span></SoftButton>
        ) : null}
      </div>
    </div>
  );
}
