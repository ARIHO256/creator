import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  Globe,
  Image as ImageIcon,
  Info,
  Link2,
  Loader2,
  PauseCircle,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

/**
 * Provider Portfolio
 * Route: /provider/portfolio
 * Core: media grid, case studies, tags
 * Super premium: shareable portfolio link, featured reel mode
 *
 * Notes:
 * - Uses local demo data (no external assets).
 * - Designed to plug into your hash router (optional).
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
type MediaType = "video" | "image" | "doc";
type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  tags: string[];
  featured: boolean;
  usedAsCover: boolean;
  description: string;
  thumb: string;
  createdAt: string;
};
type CaseStudyHighlight = { k: string; v: string };
type CaseStudy = {
  id: string;
  title: string;
  client: string;
  scope: string;
  tags: string[];
  featured: boolean;
  createdAt: string;
  summary: string;
  highlights: CaseStudyHighlight[];
};
type CaseDraft = {
  title: string;
  client: string;
  scope: string;
  tags: string[];
  summary: string;
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function shortTime(iso) {
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

function hashCode(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function svgThumb(label, seed, size = 640) {
  const clean = String(label || "EV").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "EV";
  const hue = Math.abs(hashCode(seed || clean)) % 360;
  const bg1 = `hsl(${hue}, 80%, 56%)`;
  const bg2 = `hsl(${(hue + 28) % 360}, 80%, 48%)`;

  const svg = `\n    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n      <defs>\n        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n          <stop offset="0" stop-color="${bg1}"/>\n          <stop offset="1" stop-color="${bg2}"/>\n        </linearGradient>\n        <radialGradient id="r" cx="0.25" cy="0.18" r="0.9">\n          <stop offset="0" stop-color="rgba(255,255,255,0.26)"/>\n          <stop offset="1" stop-color="rgba(255,255,255,0)"/>\n        </radialGradient>\n      </defs>\n      <rect width="${size}" height="${size}" rx="48" fill="url(#g)"/>\n      <rect width="${size}" height="${size}" rx="48" fill="url(#r)"/>\n      <circle cx="${Math.round(size * 0.84)}" cy="${Math.round(size * 0.18)}" r="${Math.round(size * 0.08)}" fill="rgba(255,255,255,0.18)"/>\n      <circle cx="${Math.round(size * 0.18)}" cy="${Math.round(size * 0.78)}" r="${Math.round(size * 0.11)}" fill="rgba(255,255,255,0.10)"/>\n      <text x="50%" y="53%" text-anchor="middle" font-family="system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;" font-size="${Math.round(size * 0.13)}" font-weight="900" fill="rgba(255,255,255,0.95)">${clean}</text>\n      <text x="50%" y="62%" text-anchor="middle" font-family="system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;" font-size="${Math.round(size * 0.042)}" font-weight="800" fill="rgba(255,255,255,0.85)">Portfolio asset</text>\n    </svg>\n  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function pseudoQr(seed = "evzone") {
  const n = 21;
  const s = String(seed || "evzone");
  const bits = new Array(n * n).fill(false).map((_, i) => {
    const h = hashCode(`${s}_${i}`);
    return (Math.abs(h) % 7) < 3;
  });

  const finder = (x0, y0) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const idx = (y0 + y) * n + (x0 + x);
        const on = x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
        bits[idx] = on;
      }
    }
  };

  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);

  const cell = 6;
  const size = n * cell;

  const rects: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const on = bits[y * n + x];
      if (!on) continue;
      rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" rx="1.2"/>`);
    }
  }

  const svg = `\n    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n      <rect width="${size}" height="${size}" rx="16" fill="white"/>\n      <g fill="#0B0F14">${rects.join("\n")}</g>\n    </svg>\n  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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

function IconButton({ label, onClick, children, tone = "light" }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        tone === "dark"
          ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function SegTab({ label, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
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
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[720px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function Modal({
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
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[85] max-h-[90vh] w-[92vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="border-b border-slate-200/70 p-4">
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
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function buildMedia(): MediaItem[] {
  const base = Date.now();
  const ago = (m) => new Date(base - m * 60_000).toISOString();
  return [
    {
      id: "M-01",
      type: "video",
      title: "Featured Reel: EV Charger Install",
      tags: ["installation", "ev", "reel"],
      featured: true,
      usedAsCover: true,
      description: "Short highlight from an on-site charger installation."
        + " Includes safety checks and final commissioning.",
      thumb: svgThumb("VID", "M-01"),
      createdAt: ago(55),
    },
    {
      id: "M-02",
      type: "image",
      title: "Site survey photo set",
      tags: ["survey", "documentation"],
      featured: true,
      usedAsCover: false,
      description: "High signal photos that explain constraints and cabling plan.",
      thumb: svgThumb("IMG", "M-02"),
      createdAt: ago(120),
    },
    {
      id: "M-03",
      type: "image",
      title: "Before and after",
      tags: ["installation", "before-after"],
      featured: true,
      usedAsCover: false,
      description: "Clean before-after story for social sharing and credibility.",
      thumb: svgThumb("BA", "M-03"),
      createdAt: ago(260),
    },
    {
      id: "M-04",
      type: "doc",
      title: "Commissioning report (PDF)",
      tags: ["compliance", "report"],
      featured: false,
      usedAsCover: false,
      description: "Commissioning checklist and handover details.",
      thumb: svgThumb("PDF", "M-04"),
      createdAt: ago(420),
    },
    {
      id: "M-05",
      type: "video",
      title: "Maintenance walkthrough",
      tags: ["maintenance", "video"],
      featured: false,
      usedAsCover: false,
      description: "Short walkthrough showing periodic maintenance steps.",
      thumb: svgThumb("VID", "M-05"),
      createdAt: ago(720),
    },
    {
      id: "M-06",
      type: "image",
      title: "Client acceptance sign-off",
      tags: ["handover", "trust"],
      featured: false,
      usedAsCover: false,
      description: "Signature moment and proof of delivery.",
      thumb: svgThumb("OK", "M-06"),
      createdAt: ago(980),
    },
    {
      id: "M-07",
      type: "image",
      title: "Electrical panel labeling",
      tags: ["safety", "compliance"],
      featured: false,
      usedAsCover: false,
      description: "Clear labeling and load management overview.",
      thumb: svgThumb("EL", "M-07"),
      createdAt: ago(1200),
    },
    {
      id: "M-08",
      type: "image",
      title: "Team on site",
      tags: ["team", "installation"],
      featured: false,
      usedAsCover: false,
      description: "Professional team photo for credibility.",
      thumb: svgThumb("TM", "M-08"),
      createdAt: ago(1600),
    },
  ];
}

function buildCaseStudies(): CaseStudy[] {
  const base = Date.now();
  const ago = (h) => new Date(base - h * 3600_000).toISOString();
  return [
    {
      id: "CS-01",
      title: "Commercial EV Charger Deployment",
      client: "Kampala Business Park",
      scope: "Site survey, installation, commissioning",
      tags: ["installation", "commercial", "ev"],
      featured: true,
      createdAt: ago(18),
      summary:
        "Delivered a clean end-to-end installation with safety checks and clear handover documentation."
        + " Optimized cabling routes and ensured consistent labeling.",
      highlights: [
        { k: "Stations", v: "2" },
        { k: "Turnaround", v: "5 days" },
        { k: "Uptime", v: "99%" },
      ],
    },
    {
      id: "CS-02",
      title: "Preventive Maintenance Program",
      client: "Fleet Partner",
      scope: "Monthly inspection, logs, reporting",
      tags: ["maintenance", "report", "trust"],
      featured: false,
      createdAt: ago(52),
      summary:
        "Set up a preventive maintenance routine with clear logs and a simple performance snapshot."
        + " Reduced downtime and improved response time to minor faults.",
      highlights: [
        { k: "Checks", v: "12" },
        { k: "Response", v: "< 4h" },
        { k: "Incidents", v: "-28%" },
      ],
    },
    {
      id: "CS-03",
      title: "Documentation Pack for Compliance",
      client: "Institutional Buyer",
      scope: "Reports, diagrams, acceptance",
      tags: ["compliance", "documentation", "report"],
      featured: false,
      createdAt: ago(96),
      summary:
        "Produced a complete documentation pack to support internal approvals and audits."
        + " Structured the handover materials for easy review.",
      highlights: [
        { k: "Docs", v: "18" },
        { k: "Approval", v: "Fast" },
        { k: "Audit", v: "Ready" },
      ],
    },
  ];
}

function typePill(t) {
  if (t === "video") return { label: "Video", icon: Video, tone: "orange" };
  if (t === "doc") return { label: "Doc", icon: FileText, tone: "slate" };
  return { label: "Image", icon: ImageIcon, tone: "green" };
}

function StatCard({ label, value, icon: Icon, tone = "slate" }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle, label, hint, accent = "green" }) {
  const bg = accent === "green" ? "bg-emerald-50" : "bg-orange-50";
  const bd = accent === "green" ? "border-emerald-200" : "border-orange-200";
  const dot = accent === "green" ? "bg-emerald-600" : "bg-orange-600";

  return (
    <button
      type="button"
      onClick={() => onToggle(!on)}
      className={cx(
        "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
        on ? bd : "border-slate-200/70"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cx("mt-0.5 h-5 w-10 rounded-full border p-0.5", on ? cx(bd, bg) : "border-slate-200/70 bg-white dark:bg-slate-900")}>
          <div className={cx("h-4 w-4 rounded-full transition", on ? cx(dot, "translate-x-5") : "bg-slate-300")} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900">{label}</div>
          {hint ? <div className="mt-1 text-xs font-semibold text-slate-500">{hint}</div> : null}
        </div>
      </div>
    </button>
  );
}

function EmptyState({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
          {cta ? (
            <button
              type="button"
              onClick={cta.onClick}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              {cta.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReelModal({
  open,
  onClose,
  items,
  ctaLabel,
  onCta,
  pushToast,
}: {
  open: boolean;
  onClose: () => void;
  items: MediaItem[];
  ctaLabel?: string;
  onCta?: () => void;
  pushToast: (t: Omit<Toast, "id">) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [seconds, setSeconds] = useState(5);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setIdx(0);
    setPlaying(true);
    setSeconds(5);
  }, [open]);

  useEffect(() => {
    if (!open || !playing || items.length <= 1) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIdx((i) => (i + 1) % items.length);
    }, clamp(seconds, 2, 15) * 1000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open, playing, idx, seconds, items.length]);

  const active = items[idx] || null;

  const prev = () => setIdx((i) => (i - 1 + items.length) % items.length);
  const next = () => setIdx((i) => (i + 1) % items.length);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] bg-black/70 backdrop-blur"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[100] max-h-[90vh] w-[94vw] max-w-[980px] -translate-x-1/2 -translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-white/15 bg-black/70 shadow-2xl backdrop-blur">
              <div className="flex items-start gap-3 border-b border-white/10 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900/10 text-white">
                  <Video className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-white">Featured Reel</div>
                  <div className="mt-1 text-xs font-semibold text-white/70">A premium, shareable highlight mode (demo).</div>
                </div>
                <div className="flex items-center gap-2">
                  <IconButton label={playing ? "Pause" : "Play"} onClick={() => setPlaying((v) => !v)} tone="dark">
                    <PauseCircle className={cx("h-4 w-4", playing ? "opacity-100" : "opacity-60")} />
                  </IconButton>
                  <IconButton label="Close" onClick={onClose} tone="dark">
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {!active ? (
                  <div className="rounded-3xl border border-white/10 bg-white dark:bg-slate-900/5 p-6">
                    <div className="text-base font-black text-white">No featured items</div>
                    <div className="mt-1 text-sm font-semibold text-white/70">Mark at least one asset as Featured.</div>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white dark:bg-slate-900/5">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={active.id}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.99 }}
                            transition={{ duration: 0.18 }}
                            className="relative"
                          >
                            <img src={active.thumb} alt="" className="h-[360px] w-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone="orange">Featured</Badge>
                                <Badge tone="slate">{active.type.toUpperCase()}</Badge>
                                <span className="ml-auto text-[11px] font-extrabold text-white/70">{idx + 1} / {items.length}</span>
                              </div>
                              <div className="mt-2 text-lg font-black text-white">{active.title}</div>
                              <div className="mt-1 text-xs font-semibold text-white/70">{active.description}</div>
                            </div>
                          </motion.div>
                        </AnimatePresence>

                        <button
                          type="button"
                          onClick={prev}
                          className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white dark:bg-slate-900/10 text-white hover:bg-gray-50 dark:hover:bg-slate-800/15"
                          aria-label="Previous"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={next}
                          className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white dark:bg-slate-900/10 text-white hover:bg-gray-50 dark:hover:bg-slate-800/15"
                          aria-label="Next"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white dark:bg-slate-900/5 px-3 py-2 text-xs font-extrabold text-white">
                          <span className="text-white/70">Autoplay</span>
                          <button
                            type="button"
                            onClick={() => setPlaying((v) => !v)}
                            className={cx(
                              "rounded-xl border px-2 py-1",
                              playing ? "border-white/15 bg-white dark:bg-slate-900/10" : "border-white/10 bg-white dark:bg-slate-900/5"
                            )}
                          >
                            {playing ? "On" : "Off"}
                          </button>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white dark:bg-slate-900/5 px-3 py-2 text-xs font-extrabold text-white">
                          <span className="text-white/70">Speed</span>
                          <input
                            type="range"
                            min={2}
                            max={12}
                            value={seconds}
                            onChange={(e) => setSeconds(Number(e.target.value))}
                            className="w-[180px]"
                          />
                          <span className="text-white/80">{seconds}s</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            pushToast({ title: "Shared", message: "Reel link copied (demo).", tone: "success" });
                          }}
                          className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          <Link2 className="h-4 w-4" />
                          Share reel
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-4">
                      <div className="rounded-3xl border border-white/10 bg-white dark:bg-slate-900/5 p-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-white" />
                          <div className="text-sm font-black text-white">Landing CTA</div>
                          <span className="ml-auto"><Badge tone="orange">Premium</Badge></span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-white/70">
                          Use this CTA in the public portfolio view (demo).
                        </div>
                        <button
                          type="button"
                          onClick={onCta}
                          className="mt-3 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          {ctaLabel}
                        </button>
                      </div>

                      <div className="mt-3 rounded-3xl border border-white/10 bg-white dark:bg-slate-900/5 p-4">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-white" />
                          <div className="text-sm font-black text-white">Featured list</div>
                          <span className="ml-auto"><Badge tone="slate">{items.length}</Badge></span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {items.slice(0, 8).map((m, i) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setIdx(i)}
                              className={cx(
                                "w-full rounded-3xl border p-3 text-left transition",
                                i === idx ? "border-white/15 bg-white dark:bg-slate-900/10" : "border-white/10 bg-white dark:bg-slate-900/5 hover:bg-gray-50 dark:hover:bg-slate-800/10"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className="relative h-10 w-10 overflow-hidden rounded-2xl border border-white/10 bg-white dark:bg-slate-900/5">
                                  <img src={m.thumb} alt="" className="h-full w-full object-cover" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-xs font-black text-white">{m.title}</div>
                                  <div className="mt-0.5 truncate text-[11px] font-semibold text-white/70">{m.type.toUpperCase()} · {m.tags.join(", ")}</div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-white/60" />
                              </div>
                            </button>
                          ))}
                          {items.length === 0 ? <div className="text-xs font-semibold text-white/70">Nothing featured yet.</div> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export default function ProviderPortfolioPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState("Media");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [handle, setHandle] = useState("");
  const portfolioHydratedRef = useRef(false);
  const portfolioAutosaveRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    void sellerBackendApi
      .getProviderPortfolio()
      .then((payload) => {
        if (!active) return;
        const items = Array.isArray((payload as { items?: unknown[] }).items)
          ? ((payload as { items?: Array<Record<string, unknown>> }).items ?? [])
          : [];
        const studies = Array.isArray((payload as { caseStudies?: unknown[] }).caseStudies)
          ? ((payload as { caseStudies?: Array<Record<string, unknown>> }).caseStudies ?? [])
          : [];
        const settings =
          (payload as { settings?: Record<string, unknown> }).settings &&
          typeof (payload as { settings?: Record<string, unknown> }).settings === "object"
            ? (((payload as { settings?: Record<string, unknown> }).settings ?? {}) as Record<string, unknown>)
            : {};

        setMedia(
          items.map((entry) => {
            const data = ((entry.data ?? {}) as Record<string, unknown>);
            return {
              id: String(entry.id ?? data.id ?? ""),
              type: String(data.type ?? "image") as MediaType,
              title: String(entry.title ?? data.title ?? "Portfolio item"),
              tags: Array.isArray(data.tags) ? data.tags.map((item) => String(item)) : [],
              featured: Boolean(data.featured),
              usedAsCover: Boolean(data.usedAsCover),
              description: String(entry.description ?? data.description ?? ""),
              thumb: String(entry.mediaUrl ?? data.thumb ?? ""),
              createdAt: String(data.createdAt ?? entry.createdAt ?? new Date().toISOString()),
            } satisfies MediaItem;
          })
        );
        setCaseStudies(
          studies.map((entry) => ({
            id: String(entry.id ?? ""),
            title: String(entry.title ?? "Case study"),
            client: String(entry.client ?? "Client"),
            scope: String(entry.scope ?? ""),
            tags: Array.isArray(entry.tags) ? entry.tags.map((item) => String(item)) : [],
            featured: Boolean(entry.featured),
            createdAt: String(entry.createdAt ?? new Date().toISOString()),
            summary: String(entry.summary ?? ""),
            highlights: Array.isArray(entry.highlights)
              ? entry.highlights.map((item) => ({
                  k: String((item as { k?: unknown }).k ?? ""),
                  v: String((item as { v?: unknown }).v ?? ""),
                }))
              : [],
          }))
        );
        setCustomTags(
          Array.isArray(settings.customTags) ? settings.customTags.map((item) => String(item).toLowerCase()) : []
        );
        setIsPublic(settings.isPublic === undefined ? true : Boolean(settings.isPublic));
        setHandle(typeof settings.handle === "string" ? settings.handle : "");
        portfolioHydratedRef.current = true;
      })
      .catch(() => {
        portfolioHydratedRef.current = true;
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!portfolioHydratedRef.current) return;
    if (portfolioAutosaveRef.current) window.clearTimeout(portfolioAutosaveRef.current);
    portfolioAutosaveRef.current = window.setTimeout(() => {
      void sellerBackendApi.patchProviderPortfolio({
        items: media.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          mediaUrl: item.thumb,
          status: "active",
          data: {
            type: item.type,
            tags: item.tags,
            featured: item.featured,
            usedAsCover: item.usedAsCover,
            thumb: item.thumb,
            createdAt: item.createdAt,
          },
        })),
        caseStudies: caseStudies.map((study) => ({
          id: study.id,
          title: study.title,
          client: study.client,
          scope: study.scope,
          tags: study.tags,
          featured: study.featured,
          createdAt: study.createdAt,
          summary: study.summary,
          highlights: study.highlights,
        })),
        settings: {
          customTags,
          isPublic,
          handle,
        },
      }).catch(() => undefined);
    }, 450);

    return () => {
      if (portfolioAutosaveRef.current) window.clearTimeout(portfolioAutosaveRef.current);
    };
  }, [media, caseStudies, customTags, isPublic, handle]);

  // Tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    customTags.forEach((t) => set.add(t));
    media.forEach((m) => (m.tags || []).forEach((t) => set.add(t)));
    caseStudies.forEach((c) => (c.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [media, caseStudies, customTags]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allTags.forEach((t) => (counts[t] = 0));
    media.forEach((m) => {
      (m.tags || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    });
    caseStudies.forEach((c) => {
      (c.tags || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    });
    return counts;
  }, [allTags, media, caseStudies]);

  const [q, setQ] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState("Newest");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const filteredMedia = useMemo(() => {
    const query = q.trim().toLowerCase();
    const matchesTags = (tags) => (selectedTags.length ? selectedTags.every((t) => (tags || []).includes(t)) : true);

    const list = media
      .filter((m) => (featuredOnly ? !!m.featured : true))
      .filter((m) => matchesTags(m.tags))
      .filter((m) => {
        if (!query) return true;
        const hay = [m.title, m.type, ...(m.tags || [])].join(" ").toLowerCase();
        return hay.includes(query);
      });

    if (sort === "Featured") {
      list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    } else if (sort === "Type") {
      list.sort((a, b) => String(a.type).localeCompare(String(b.type)));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [media, q, selectedTags, sort, featuredOnly]);

  const filteredCases = useMemo(() => {
    const query = q.trim().toLowerCase();
    const matchesTags = (tags) => (selectedTags.length ? selectedTags.every((t) => (tags || []).includes(t)) : true);

    return caseStudies
      .filter((c) => matchesTags(c.tags))
      .filter((c) => {
        if (!query) return true;
        const hay = [c.title, c.client, c.scope, c.summary, ...(c.tags || [])].join(" ").toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [caseStudies, q, selectedTags]);

  const featuredMedia = useMemo(() => media.filter((m) => m.featured), [media]);

  // Shareable portfolio link
  const shareUrl = useMemo(() => `https://evzone.app/p/${handle}`, [handle]);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState(media[0]?.id || null);
  const activeMedia = useMemo(() => media.find((m) => m.id === activeMediaId) || null, [media, activeMediaId]);

  // Create case study modal
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [caseDraft, setCaseDraft] = useState<CaseDraft>({
    title: "",
    client: "",
    scope: "",
    tags: [],
    summary: "",
  });

  // Featured reel
  const [reelOpen, setReelOpen] = useState(false);

  const toggleTag = (t: string) => {
    setSelectedTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  };

  const addMedia = () => {
    const id = makeId("M");
    const types: MediaType[] = ["image", "video", "doc"];
    const type = types[Math.floor(Math.random() * types.length)];
    const next: MediaItem = {
      id,
      type,
      title: type === "video" ? "New highlight clip" : type === "doc" ? "New report" : "New photo",
      tags: ["new"],
      featured: false,
      usedAsCover: false,
      description: "New asset uploaded (demo).",
      thumb: svgThumb(type === "video" ? "VID" : type === "doc" ? "PDF" : "IMG", id),
      createdAt: new Date().toISOString(),
    };
    setMedia((s) => [next, ...s]);
    pushToast({ title: "Uploaded", message: "New media asset added (demo).", tone: "success" });
  };

  const addCaseStudy = () => {
    const title = caseDraft.title.trim();
    const client = caseDraft.client.trim();
    if (!title || !client) {
      pushToast({ title: "Missing details", message: "Add a title and client name.", tone: "warning" });
      return;
    }

    const next: CaseStudy = {
      id: makeId("CS"),
      title,
      client,
      scope: caseDraft.scope.trim() || "Project delivery",
      tags: (caseDraft.tags || []).length ? caseDraft.tags : ["case-study"],
      featured: false,
      createdAt: new Date().toISOString(),
      summary: caseDraft.summary.trim() || "Case study created (demo).",
      highlights: [
        { k: "Outcome", v: "Delivered" },
        { k: "Trust", v: "High" },
        { k: "Quality", v: "Premium" },
      ],
    };

    setCaseStudies((s) => [next, ...s]);
    setCaseDraft({ title: "", client: "", scope: "", tags: [], summary: "" });
    setCaseModalOpen(false);
    pushToast({ title: "Created", message: "New case study added.", tone: "success" });
  };

  const addCustomTag = (t: string) => {
    const v = String(t || "").trim().toLowerCase();
    if (!v) return;
    if (allTags.includes(v)) {
      pushToast({ title: "Tag exists", message: `"${v}" already exists.`, tone: "default" });
      return;
    }
    setCustomTags((s) => [v, ...s]);
    pushToast({ title: "Tag added", message: `"${v}" added.`, tone: "success" });
  };

  const tagInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-3">
              <div
                className="grid h-12 w-12 place-items-center rounded-3xl text-white"
                style={{ background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)` }}
              >
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">My Portfolio</div>
                  <Badge tone="slate">/provider/portfolio</Badge>
                  <Badge tone="green">Provider</Badge>
                  {isPublic ? <Badge tone="green">Public</Badge> : <Badge tone="orange">Private</Badge>}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-500">Media grid, case studies, tags, share link and featured reel mode.</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShareDrawerOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Link2 className="h-4 w-4" />
                Share
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!featuredMedia.length) {
                    pushToast({ title: "No featured assets", message: "Mark at least one asset as Featured.", tone: "warning" });
                    return;
                  }
                  setReelOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <Video className="h-4 w-4" />
                Featured reel
              </button>

              <button
                type="button"
                onClick={addMedia}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>

              <button
                type="button"
                onClick={() => setCaseModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                New case study
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <StatCard label="Media assets" value={String(media.length)} icon={ImageIcon} tone="slate" />
            <StatCard label="Featured" value={String(featuredMedia.length)} icon={Star} tone="orange" />
            <StatCard label="Case studies" value={String(caseStudies.length)} icon={FileText} tone="green" />
            <StatCard label="Tags" value={String(allTags.length)} icon={Tag} tone="slate" />
          </div>
        </div>

        {/* Top controls */}
        <GlassCard className="p-4">
          <div className="grid gap-2 md:grid-cols-12 md:items-center">
            <div className="relative md:col-span-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search assets, case studies, tags"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div className="md:col-span-3">
              <div className="flex flex-wrap items-center gap-2">
                <SegTab label="Media" active={tab === "Media"} onClick={() => setTab("Media")} icon={ImageIcon} />
                <SegTab label="Case studies" active={tab === "Case studies"} onClick={() => setTab("Case studies")} icon={FileText} />
              </div>
            </div>

            <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <div className="text-xs font-extrabold text-slate-700">Sort</div>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-9 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                  >
                    {["Newest", "Featured", "Type"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="min-w-[220px]">
                <Toggle
                  on={featuredOnly}
                  onToggle={setFeaturedOnly}
                  label="Featured only"
                  hint="Filter the view to featured items only."
                  accent="orange"
                />
              </div>
            </div>

            <div className="md:col-span-12 mt-1 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                <Tag className="h-4 w-4 text-slate-600" />
                <div className="text-xs font-extrabold text-slate-700">Tags</div>
                <Badge tone="slate">{selectedTags.length ? `${selectedTags.length} selected` : "All"}</Badge>
                {selectedTags.length ? (
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="ml-2 rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-extrabold text-slate-700"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 16).map((t) => {
                  const active = selectedTags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {t}
                      <span className={cx("rounded-full px-2 py-0.5 text-[10px]", active ? "bg-white dark:bg-slate-900 text-slate-700" : "bg-slate-100 text-slate-700")}>
                        {tagCounts[t] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              {allTags.length > 16 ? <Badge tone="slate">+{allTags.length - 16} more</Badge> : null}
            </div>
          </div>
        </GlassCard>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Main */}
          <div className="lg:col-span-8">
            <GlassCard className="p-4">
              {tab === "Media" ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Media grid</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Assets are used for your portfolio, proposals and featured reel.</div>
                    </div>
                    <Badge tone="slate">{filteredMedia.length} shown</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredMedia.map((m) => {
                      const meta = typePill(m.type);
                      const MetaIcon = meta.icon;
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.16 }}
                          className="group"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMediaId(m.id);
                              setDetailOpen(true);
                            }}
                            className="w-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800 hover:shadow-[0_18px_60px_rgba(2,16,23,0.10)]"
                          >
                            <div className="relative">
                              <img src={m.thumb} alt="" className="h-40 w-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
                              <div className="absolute left-3 top-3 flex items-center gap-2">
                                <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold", meta.tone === "orange" ? "bg-orange-50 text-orange-800" : meta.tone === "green" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-800")}>
                                  <MetaIcon className="h-3.5 w-3.5" />
                                  {meta.label}
                                </span>
                                {m.usedAsCover ? <Badge tone="green">Cover</Badge> : null}
                                {m.featured ? <Badge tone="orange">Featured</Badge> : null}
                              </div>

                              <div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMedia((s) => s.map((x) => (x.id === m.id ? { ...x, featured: !x.featured } : x)));
                                    pushToast({ title: "Updated", message: m.featured ? "Removed from featured." : "Marked as featured.", tone: "success" });
                                  }}
                                  className="grid h-9 w-9 place-items-center rounded-2xl border border-white/20 bg-white dark:bg-slate-900/15 text-white hover:bg-gray-50 dark:hover:bg-slate-800/20"
                                  aria-label="Toggle featured"
                                >
                                  <Star className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMedia((s) => s.filter((x) => x.id !== m.id));
                                    pushToast({ title: "Deleted", message: "Asset removed (demo).", tone: "warning" });
                                  }}
                                  className="grid h-9 w-9 place-items-center rounded-2xl border border-white/20 bg-white dark:bg-slate-900/15 text-white hover:bg-gray-50 dark:hover:bg-slate-800/20"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="p-3">
                              <div className="truncate text-sm font-black text-slate-900">{m.title}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                                <span>{shortTime(m.createdAt)}</span>
                                <span className="text-slate-300">•</span>
                                <span className="truncate">{(m.tags || []).slice(0, 3).join(", ")}{(m.tags || []).length > 3 ? "…" : ""}</span>
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      );
                    })}

                    {filteredMedia.length === 0 ? (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <EmptyState
                          title="No media found"
                          message="Try clearing filters or upload new assets."
                          cta={{ label: "Upload", onClick: addMedia }}
                        />
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Case studies</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Tell a clear story: scope, evidence and outcomes.</div>
                    </div>
                    <Badge tone="slate">{filteredCases.length} shown</Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {filteredCases.map((c) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.16 }}
                        className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-black text-slate-900">{c.title}</div>
                              {c.featured ? <Badge tone="orange">Featured</Badge> : null}
                              <span className="ml-auto text-[11px] font-extrabold text-slate-500">{shortTime(c.createdAt)}</span>
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Client: {c.client} · {c.scope}</div>
                            <div className="mt-3 text-sm font-semibold text-slate-700">{c.summary}</div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {(c.tags || []).map((t) => (
                                <Badge key={t} tone="slate">{t}</Badge>
                              ))}
                            </div>

                            <div className="mt-4 grid gap-2 md:grid-cols-3">
                              {(c.highlights || []).map((h) => (
                                <div key={h.k} className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                                  <div className="text-[11px] font-extrabold text-slate-600">{h.k}</div>
                                  <div className="mt-1 text-sm font-black text-slate-900">{h.v}</div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => pushToast({ title: "Public view", message: "Public case study view (demo).", tone: "default" })}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Globe className="h-4 w-4" />
                                View public
                              </button>
                              <button
                                type="button"
                                onClick={() => pushToast({ title: "Edit", message: "Edit case study (demo).", tone: "default" })}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCaseStudies((s) => s.map((x) => (x.id === c.id ? { ...x, featured: !x.featured } : x)));
                                  pushToast({ title: "Updated", message: c.featured ? "Removed from featured." : "Marked as featured.", tone: "success" });
                                }}
                                className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.green }}
                              >
                                <Star className="h-4 w-4" />
                                {c.featured ? "Unfeature" : "Feature"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {filteredCases.length === 0 ? (
                      <EmptyState
                        title="No case studies found"
                        message="Create a case study to show proof, outcomes and trust."
                        cta={{ label: "New case study", onClick: () => setCaseModalOpen(true) }}
                      />
                    ) : null}
                  </div>
                </>
              )}
            </GlassCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="space-y-4">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Shareable portfolio link</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Public link + QR and visibility settings.</div>
                  </div>
                  <Badge tone="orange">Premium</Badge>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-slate-700" />
                    <div className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-800">{shareUrl}</div>
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(shareUrl);
                        pushToast({ title: "Copied", message: "Portfolio link copied.", tone: "success" });
                      }}
                      className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                      aria-label="Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="text-[11px] font-extrabold text-slate-600">Visibility</div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPublic(true)}
                          className={cx(
                            "flex-1 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                            isPublic ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                          )}
                        >
                          Public
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPublic(false)}
                          className={cx(
                            "flex-1 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                            !isPublic ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                          )}
                        >
                          Private
                        </button>
                      </div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-500">
                        Private hides your public link (demo).
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="text-[11px] font-extrabold text-slate-600">QR</div>
                      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-2">
                        <img src={pseudoQr(shareUrl)} alt="QR" className="h-24 w-24" />
                      </div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-500">Scan to open link (demo).</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-[11px] font-extrabold text-slate-600">Handle</div>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      className="mt-2 h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                      placeholder="provider-yourname"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        pushToast({ title: "Public preview", message: "Public portfolio preview (demo).", tone: "default" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Globe className="h-4 w-4" />
                      Open preview
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareDrawerOpen(true)}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Settings className="h-4 w-4" />
                      Share settings
                    </button>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Tags manager</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Create tags and drive consistent filtering.</div>
                  </div>
                  <Badge tone="slate">{allTags.length}</Badge>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-slate-700" />
                    <input
                      ref={tagInputRef}
                      placeholder="Add a new tag"
                      className="h-10 flex-1 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = e.currentTarget.value;
                          e.currentTarget.value = "";
                          addCustomTag(v);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = tagInputRef.current;
                        if (!el) return;
                        const v = el.value;
                        el.value = "";
                        addCustomTag(v);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {allTags.slice(0, 18).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                          selectedTags.includes(t)
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                        )}
                      >
                        {t}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">{tagCounts[t] ?? 0}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Premium tip</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">Use tags for every asset and case study so your public portfolio stays consistent.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Featured reel setup</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Curate what a client sees first.</div>
                  </div>
                  <Badge tone="orange">Premium</Badge>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Featured assets</div>
                      <span className="ml-auto"><Badge tone={featuredMedia.length ? "green" : "orange"}>{featuredMedia.length}</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">Mark 3 to 8 assets as featured for the best reel experience.</div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!featuredMedia.length) {
                          pushToast({ title: "No featured assets", message: "Use the star on a media card to feature it.", tone: "warning" });
                          return;
                        }
                        setReelOpen(true);
                      }}
                      className="mt-3 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                      style={{ background: TOKENS.orange }}
                    >
                      Open featured reel
                    </button>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCheck className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Public portfolio readiness</div>
                      <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[{ ok: media.length >= 6, label: "At least 6 media assets" }, { ok: caseStudies.length >= 2, label: "At least 2 case studies" }, { ok: featuredMedia.length >= 3, label: "At least 3 featured assets" }].map((x) => (
                        <div key={x.label} className={cx("flex items-start gap-3 rounded-2xl border p-3", x.ok ? "border-emerald-200 bg-emerald-50/60" : "border-orange-200 bg-orange-50/60")}>
                          <div className={cx("grid h-9 w-9 place-items-center rounded-2xl bg-white dark:bg-slate-900", x.ok ? "text-emerald-700" : "text-orange-700")}>
                            {x.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className={cx("text-xs font-extrabold", x.ok ? "text-emerald-900" : "text-orange-900")}>{x.label}</div>
                            <div className={cx("mt-1 text-[11px] font-semibold", x.ok ? "text-emerald-900/70" : "text-orange-900/70")}>{x.ok ? "Looks good" : "Needs attention"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Media detail drawer */}
      <Drawer
        open={detailOpen}
        title={activeMedia ? `Asset · ${activeMedia.id}` : "Asset"}
        subtitle={activeMedia ? "Edit metadata, featured state, tags and cover." : "Select an asset"}
        onClose={() => setDetailOpen(false)}
      >
        {!activeMedia ? (
          <EmptyState title="No asset selected" message="Choose an asset from the media grid." />
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
              <img src={activeMedia.thumb} alt="" className="h-[280px] w-full object-cover" />
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Details</div>
                <span className="ml-auto"><Badge tone="slate">{activeMedia.type.toUpperCase()}</Badge></span>
              </div>

              <div className="mt-3 grid gap-3">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Title</div>
                  <input
                    value={activeMedia.title}
                    onChange={(e) => setMedia((s) => s.map((x) => (x.id === activeMedia.id ? { ...x, title: e.target.value } : x)))}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Description</div>
                  <textarea
                    value={activeMedia.description}
                    onChange={(e) => setMedia((s) => s.map((x) => (x.id === activeMedia.id ? { ...x, description: e.target.value } : x)))}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Tags</div>
                  <input
                    value={(activeMedia.tags || []).join(", ")}
                    onChange={(e) => {
                      const nextTags = e.target.value
                        .split(",")
                        .map((x) => x.trim().toLowerCase())
                        .filter(Boolean);
                      setMedia((s) => s.map((x) => (x.id === activeMedia.id ? { ...x, tags: nextTags } : x)));
                    }}
                    placeholder="installation, maintenance, report"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMedia((s) => s.map((x) => (x.id === activeMedia.id ? { ...x, featured: !x.featured } : x)));
                    pushToast({ title: "Updated", message: activeMedia.featured ? "Removed from featured." : "Marked as featured.", tone: "success" });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                  style={{ background: TOKENS.orange }}
                >
                  <Star className="h-5 w-5" />
                  {activeMedia.featured ? "Unfeature" : "Feature"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMedia((s) => s.map((x) => (x.id === activeMedia.id ? { ...x, usedAsCover: !x.usedAsCover } : x)));
                    pushToast({ title: "Updated", message: activeMedia.usedAsCover ? "Removed as cover." : "Set as cover.", tone: "success" });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-extrabold text-slate-800"
                >
                  <CheckCheck className="h-5 w-5" />
                  {activeMedia.usedAsCover ? "Unset cover" : "Set as cover"}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(JSON.stringify(activeMedia, null, 2));
                    pushToast({ title: "Copied", message: "Asset JSON copied.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy JSON
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMedia((s) => s.filter((x) => x.id !== activeMedia.id));
                    setDetailOpen(false);
                    pushToast({ title: "Deleted", message: "Asset removed (demo).", tone: "warning" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Share settings drawer */}
      <Drawer
        open={shareDrawerOpen}
        title="Share settings"
        subtitle="Configure link, visibility, and what is shown on the public portfolio."
        onClose={() => setShareDrawerOpen(false)}
      >
        <div className="space-y-3">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Public portfolio configuration</div>
              <span className="ml-auto"><Badge tone="orange">Premium</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              In production: connect this to provider profile settings, verification status, and approvals.
            </div>
          </GlassCard>

          <Toggle
            on={isPublic}
            onToggle={setIsPublic}
            label="Public portfolio"
            hint="When off, your link is hidden and only visible to invited clients (demo)."
            accent="green"
          />

          <GlassCard className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Landing mode</div>
              <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {[{ k: "reel", t: "Featured reel" }, { k: "grid", t: "Media grid" }, { k: "cases", t: "Case studies" }, { k: "mixed", t: "Mixed" }].map((x) => (
                <button
                  key={x.k}
                  type="button"
                  onClick={() => pushToast({ title: "Landing mode", message: `${x.t} set as landing (demo).`, tone: "success" })}
                  className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <div className="text-sm font-black text-slate-900">{x.t}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Choose what opens first for clients.</div>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Share kit</div>
              <span className="ml-auto"><Badge tone="orange">Premium</Badge></span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                <div className="text-[11px] font-extrabold text-slate-600">Link</div>
                <div className="mt-1 truncate text-sm font-black text-slate-900">{shareUrl}</div>
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(shareUrl);
                    pushToast({ title: "Copied", message: "Portfolio link copied.", tone: "success" });
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                <div className="text-[11px] font-extrabold text-slate-600">QR</div>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-2">
                  <img src={pseudoQr(shareUrl)} alt="QR" className="h-28 w-28" />
                </div>
                <div className="mt-2 text-[11px] font-semibold text-slate-500">Use on print and social posts.</div>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Privacy note</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Share link respects visibility settings. Private mode disables public access.</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </Drawer>

      {/* Create case study modal */}
      <Modal
        open={caseModalOpen}
        title="New case study"
        subtitle="Add a story with evidence and outcomes (demo)."
        onClose={() => setCaseModalOpen(false)}
      >
        <div className="grid gap-3">
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Title</div>
            <input
              value={caseDraft.title}
              onChange={(e) => setCaseDraft((s) => ({ ...s, title: e.target.value }))}
              placeholder="Example: EV Charger Installation for Client"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
            />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Client</div>
            <input
              value={caseDraft.client}
              onChange={(e) => setCaseDraft((s) => ({ ...s, client: e.target.value }))}
              placeholder="Client name"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
            />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Scope</div>
            <input
              value={caseDraft.scope}
              onChange={(e) => setCaseDraft((s) => ({ ...s, scope: e.target.value }))}
              placeholder="Scope summary"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
            />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Tags (comma separated)</div>
            <input
              value={(caseDraft.tags || []).join(", ")}
              onChange={(e) => setCaseDraft((s) => ({ ...s, tags: e.target.value.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) }))}
              placeholder="installation, ev, compliance"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
            />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Summary</div>
            <textarea
              value={caseDraft.summary}
              onChange={(e) => setCaseDraft((s) => ({ ...s, summary: e.target.value }))}
              rows={4}
              placeholder="What was done and what results were achieved?"
              className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addCaseStudy}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <CheckCheck className="h-4 w-4" />
              Create
            </button>
            <button
              type="button"
              onClick={() => setCaseModalOpen(false)}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Featured reel modal */}
      <ReelModal
        open={reelOpen}
        onClose={() => setReelOpen(false)}
        items={featuredMedia}
        ctaLabel="Request a quote"
        onCta={() => pushToast({ title: "CTA", message: "Request a quote action (demo).", tone: "success" })}
        pushToast={pushToast}
      />

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
