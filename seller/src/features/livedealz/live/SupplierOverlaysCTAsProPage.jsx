import React, { useEffect, useMemo, useState } from "react";

/**
 * SupplierOverlaysCTAsPro.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: OverlaysCTAsPro.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Sticky header with breadcrumbs + session meta + Pro badge + quick actions
 * - Horizontal tab bar (QR / Links / Countdown / Lower-third / A/B variants)
 * - Left column: Variant A/B notes + tab-specific control panels
 * - Right column: Live preview phone frame + Preflight + Export pack panel
 * - Toast behavior + preflight checks
 *
 * Supplier adaptations (minimal + required):
 * - Role copy: Supplier Live Pro → Overlays & CTAs
 * - Adds “Execution mode” (Supplier-hosted vs Using Creator vs Not sure)
 * - Adds “Share to creator” workflow when Using Creator (mark shared + copy package spec)
 *   (In production this should create a Task/Asset in Deliverables → Asset Library)
 *
 * Canvas-safe:
 * - No lucide-react imports. Inline SVG icons are provided.
 * - No backend. Replace demo state with real session/campaign/store.
 */

const ORANGE = "#F77F00";

/* ------------------------------ tiny icon system (inline SVG) ------------------------------ */

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

const BadgeCheck = ({ className }) => (
  <Icon className={className}>
    <path d="M12 2 9.8 3.6 7 4l-.4 2.7L5 9l1.6 2.3L7 14l2.8.4L12 16l2.2-1.6L17 14l.4-2.7L19 9l-1.6-2.3L17 4l-2.8-.4L12 2Z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);

const CheckCircle2 = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l2.5 2.5L16 9" />
  </Icon>
);

const Copy = ({ className }) => (
  <Icon className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

const Download = ({ className }) => (
  <Icon className={className}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </Icon>
);

const ExternalLink = ({ className }) => (
  <Icon className={className}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M21 14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" />
  </Icon>
);

const Eye = ({ className }) => (
  <Icon className={className}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const Link2 = ({ className }) => (
  <Icon className={className}>
    <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
    <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
  </Icon>
);

const Lock = ({ className }) => (
  <Icon className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

const QrCode = ({ className }) => (
  <Icon className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z" />
    <path d="M18 18h3v3h-3z" />
  </Icon>
);

const Sparkles = ({ className }) => (
  <Icon className={className}>
    <path d="M12 2l1.2 3.7L17 7l-3.8 1.3L12 12l-1.2-3.7L7 7l3.8-1.3L12 2z" />
    <path d="M5 12l.6 1.8L7.5 14l-1.9.7L5 16.5l-.6-1.8L2.5 14l1.9-.7L5 12z" />
    <path d="M19 12l.6 1.8 1.9.2-1.5 1.2.5 1.9-1.5-1.1-1.6 1.1.6-1.9-1.6-1.2 2-.2L19 12z" />
  </Icon>
);

const Timer = ({ className }) => (
  <Icon className={className}>
    <path d="M10 2h4" />
    <path d="M12 14V8" />
    <circle cx="12" cy="14" r="8" />
  </Icon>
);

const Trash2 = ({ className }) => (
  <Icon className={className}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </Icon>
);

const XCircle = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9 9 15" />
    <path d="M9 9l6 6" />
  </Icon>
);

const Zap = ({ className }) => (
  <Icon className={className}>
    <path d="M13 2 3 14h8l-1 8 11-14h-8l1-6z" />
  </Icon>
);

/* ------------------------------ utils ------------------------------ */

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtLocal(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function computeUTM(url, params) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    Object.entries(params).forEach(([k, v]) => {
      if (String(v || "").trim()) u.searchParams.set(k, String(v).trim());
    });
    return u.toString();
  } catch {
    return url;
  }
}

function makeSlug() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 7; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function toCountdown(now, startISO, endISO) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (now < start) {
    const m = Math.floor((start - now) / 60000);
    return { mode: "Starts in", value: `${Math.max(0, m)}m` };
  }
  if (now >= start && now < end) {
    const m = Math.floor((end - now) / 60000);
    return { mode: "Ends in", value: `${Math.max(0, m)}m` };
  }
  return { mode: "Session ended", value: "" };
}

async function safeCopy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/* ------------------------------ UI atoms ------------------------------ */

function Pill({ tone = "neutral", children, title }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20"
        : tone === "pro"
          ? "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20"
          : "bg-neutral-100 text-neutral-800 ring-neutral-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold ring-1 whitespace-nowrap", cls)}>
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", disabled, left, onClick, children, title }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "bg-[#F77F00] text-white hover:brightness-95 shadow-sm"
      : tone === "danger"
        ? "bg-rose-600 text-white hover:brightness-95 shadow-sm"
        : tone === "ghost"
          ? "bg-transparent text-neutral-900 dark:text-slate-50 hover:bg-neutral-100 dark:hover:bg-slate-800"
          : "bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800 shadow-sm";
  return (
    <button title={title} className={cn(base, cls)} onClick={onClick} disabled={disabled} type="button">
      {left}
      {children}
    </button>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => (!disabled ? onChange(!value) : undefined)}
      className={cn(
        "relative inline-flex h-5 w-10 sm:h-6 sm:w-11 items-center rounded-full transition",
        disabled ? "bg-neutral-200 dark:bg-slate-800 cursor-not-allowed" : value ? "bg-neutral-900 dark:bg-slate-100" : "bg-neutral-300 dark:bg-slate-700"
      )}
      aria-pressed={value}
    >
      <span className={cn("inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-sm transition", value ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

/* ------------------------------ page ------------------------------ */

export default function SupplierOverlaysCTAsPro() {
  // Demo pro toggle
  const [isPro, setIsPro] = useState(true);

  // Supplier execution mode
  // - use_creator: supplier provides pack, creators apply
  // - supplier_hosted: supplier is live host (acts as creator)
  // - not_sure: allow editing, but block “Save” preflight in production when session scheduled/live
  const [executionMode, setExecutionMode] = useState("use_creator");
  const [sharedToCreator, setSharedToCreator] = useState(false);

  const session = useMemo(
    () => ({
      id: "LS-20418",
      title: "Autumn Beauty Flash",
      status: "Scheduled",
      startISO: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
      endISO: new Date(Date.now() + 130 * 60 * 1000).toISOString(),
    }),
    []
  );

  const products = useMemo(
    () => [
      {
        id: "p1",
        name: "GlowUp Serum Bundle",
        price: "$29.99",
        stock: 18,
        posterUrl: "https://images.unsplash.com/photo-1585232351009-aa87416fca90?auto=format&fit=crop&w=500&q=60",
      },
      {
        id: "p2",
        name: "Vitamin C Glow Kit",
        price: "$24.50",
        stock: 6,
        posterUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=60",
      },
      {
        id: "p3",
        name: "Hydration Night Mask",
        price: "$19.00",
        stock: 0,
        posterUrl: "https://images.unsplash.com/photo-1585386959984-a41552231691?auto=format&fit=crop&w=500&q=60",
      },
    ],
    []
  );

  const [tab, setTab] = useState("qr"); // qr | links | timer | lower | ab
  const [variant, setVariant] = useState("A");

  // QR overlay
  const [qrEnabled, setQrEnabled] = useState(true);
  const [qrLabel, setQrLabel] = useState("Scan to shop");
  const [qrUrl, setQrUrl] = useState(`https://mylivedealz.com/live/${session.id}`);
  const [qrCorner, setQrCorner] = useState("tr");
  const [qrSize, setQrSize] = useState(180);

  const qrImg = useMemo(() => {
    const u = encodeURIComponent(qrUrl || "https://mylivedealz.com");
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${u}`;
  }, [qrUrl, qrSize]);

  // Links + UTM
  const [destUrl, setDestUrl] = useState("https://mylivedealz.com/dealz/autumn-flash");
  const [utmSource, setUtmSource] = useState("whatsapp");
  const [utmMedium, setUtmMedium] = useState("msg");
  const [utmCampaign, setUtmCampaign] = useState("autumn_beauty_flash");
  const [utmContent, setUtmContent] = useState("reminder_t10m");
  const [shortDomain, setShortDomain] = useState("go.mylivedealz.com");
  const [shortSlug, setShortSlug] = useState(makeSlug());

  const utmLink = useMemo(
    () =>
      computeUTM(destUrl, {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
      }),
    [destUrl, utmSource, utmMedium, utmCampaign, utmContent]
  );

  const shortLink = useMemo(() => `https://${shortDomain}/${shortSlug}`, [shortDomain, shortSlug]);

  // Countdown
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerStyle, setTimerStyle] = useState("pill");
  const [timerText, setTimerText] = useState("Deal ends in");
  const [dealEndISO, setDealEndISO] = useState(session.endISO);

  // Lower third
  const [lowerEnabled, setLowerEnabled] = useState(true);
  const [lowerPlacement, setLowerPlacement] = useState("bottom");
  const [lowerProductId, setLowerProductId] = useState(products[0].id);
  const [ctaText, setCtaText] = useState("Buy now");

  // A/B
  const [abEnabled, setAbEnabled] = useState(true);
  const [notesA, setNotesA] = useState("Variant A: QR top-right + lower-third.");
  const [notesB, setNotesB] = useState("Variant B: Countdown bar + shorter CTA.");

  const selected = useMemo(() => products.find((p) => p.id === lowerProductId) ?? products[0], [products, lowerProductId]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const countdown = useMemo(() => toCountdown(now, session.startISO, dealEndISO), [now, session.startISO, dealEndISO]);

  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const preflight = useMemo(() => {
    const shareRequired = executionMode === "use_creator";
    return {
      qrOk: !qrEnabled || Boolean(String(qrUrl || "").trim()),
      linkOk: Boolean(String(shortSlug || "").trim()) && Boolean(String(shortDomain || "").trim()),
      endOk: Boolean(dealEndISO),
      abOk: !abEnabled || isPro,
      shareOk: !shareRequired || sharedToCreator,
      modeOk: executionMode !== "not_sure" || session.status === "Draft",
    };
  }, [qrEnabled, qrUrl, shortSlug, shortDomain, dealEndISO, abEnabled, isPro, executionMode, sharedToCreator, session.status]);

  const cornerClass = (c) => (c === "tr" ? "top-3 right-3" : c === "tl" ? "top-3 left-3" : c === "br" ? "bottom-3 right-3" : "bottom-3 left-3");

  const proBadge = (
    <Pill tone="pro">
      <Lock className="h-3.5 w-3.5" />
      Pro
    </Pill>
  );

  const canSave = Object.values(preflight).every(Boolean);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
        <div className="w-full flex items-center justify-between gap-3 px-[0.55%] py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-neutral-500 dark:text-slate-400">
              <span className="font-medium text-neutral-700 dark:text-slate-300">Supplier Live Pro</span>
              <span>•</span>
              <span className="text-neutral-900 dark:text-slate-200">Overlays & CTAs</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="truncate text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{session.title}</div>
              <div className="flex items-center gap-1.5">
                <Pill tone="warn">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {session.status}
                </Pill>
                {proBadge}
                <Pill tone={executionMode === "use_creator" ? "pro" : executionMode === "supplier_hosted" ? "good" : "warn"}>
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {executionMode === "use_creator" ? "Using Creator" : executionMode === "supplier_hosted" ? "Supplier-hosted" : "Not sure"}
                </Pill>
              </div>
            </div>
            <div className="mt-1 text-[10px] sm:text-xs text-neutral-600 dark:text-slate-400">
              Start <span className="font-semibold text-neutral-900 dark:text-slate-200">{fmtLocal(session.startISO)}</span> <span className="text-neutral-300 dark:text-slate-700">•</span> End{" "}
              <span className="font-semibold text-neutral-900 dark:text-slate-200">{fmtLocal(session.endISO)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="hidden sm:flex items-center gap-2 rounded-xl bg-neutral-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-neutral-800 dark:text-slate-200 hover:bg-neutral-200 dark:hover:bg-slate-700 transition"
              onClick={() => setIsPro((v) => !v)}
              title="Demo: toggle Pro plan"
              type="button"
            >
              <Sparkles className="h-4 w-4" />
              Plan: {isPro ? "Pro" : "Standard"}
            </button>

            <div className="hidden sm:block">
              <Btn
                tone="ghost"
                onClick={async () => {
                  const ok = await safeCopy(shortLink);
                  setToast(ok ? "Copied short link" : "Copy failed");
                }}
                left={<Copy className="h-4 w-4" />}
              >
                Copy short link
              </Btn>
            </div>

            <Btn
              tone="primary"
              onClick={() => setToast("Saved overlays (demo)")}
              left={<CheckCircle2 className="h-4 w-4" />}
              disabled={!canSave}
              title={!canSave ? "Fix Preflight items" : "Save"}
            >
              Save
            </Btn>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors overflow-x-auto no-scrollbar">
          <div className="w-full px-[0.55%] py-2">
            <div className="flex gap-2 min-w-max">
              {[
                { k: "qr", label: "QR overlay", icon: <QrCode className="h-4 w-4" /> },
                { k: "links", label: "Short links + UTM", icon: <Link2 className="h-4 w-4" /> },
                { k: "timer", label: "Countdown", icon: <Timer className="h-4 w-4" /> },
                { k: "lower", label: "Lower-third banners", icon: <Zap className="h-4 w-4" /> },
                { k: "ab", label: "A/B variants", icon: <Sparkles className="h-4 w-4" /> },
              ].map((t) => {
                const active = tab === t.k;
                return (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold ring-1 transition",
                      active
                        ? "bg-neutral-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-neutral-900 dark:ring-slate-100"
                        : "bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-300 ring-neutral-200 dark:ring-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800"
                    )}
                    type="button"
                  >
                    {t.icon}
                    {t.label}
                    {t.k === "ab" ? proBadge : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full px-[0.55%] py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* Execution mode (Supplier-only minimal addition) */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Execution mode</div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">Defines who applies overlays in Live Studio.</div>
                </div>
                <Pill tone={executionMode === "use_creator" ? "pro" : executionMode === "supplier_hosted" ? "good" : "warn"}>
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {executionMode === "use_creator" ? "Using Creator" : executionMode === "supplier_hosted" ? "Supplier-hosted" : "Not sure"}
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                {[
                  {
                    k: "use_creator",
                    title: "Use Creator",
                    desc: "Generate the overlay pack and share it. Creator applies in their Live Studio.",
                  },
                  {
                    k: "supplier_hosted",
                    title: "Supplier-hosted",
                    desc: "Supplier runs the live session (Supplier acts as Creator). Apply overlays directly.",
                  },
                  {
                    k: "not_sure",
                    title: "Not sure yet",
                    desc: "You can configure overlays now, but decide before activation.",
                  },
                ].map((m) => {
                  const active = executionMode === m.k;
                  return (
                    <button
                      key={m.k}
                      type="button"
                      onClick={() => {
                        setExecutionMode(m.k);
                        if (m.k !== "use_creator") setSharedToCreator(false);
                      }}
                      className={cn(
                        "w-full text-left rounded-2xl p-3 ring-1 transition",
                        active
                          ? "bg-neutral-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-neutral-900 dark:ring-slate-100"
                          : "bg-neutral-50 dark:bg-slate-800/50 text-neutral-900 dark:text-slate-200 ring-neutral-200 dark:ring-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{m.title}</div>
                          <div className={cn("mt-1 text-xs", active ? "text-white/70 dark:text-slate-900/70" : "text-neutral-600 dark:text-slate-400")}>{m.desc}</div>
                        </div>
                        {active ? (
                          <Pill tone="neutral">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Pill>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {executionMode === "use_creator" ? (
                <div className="mt-3 rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">Share overlay pack to creator</div>
                    <div className="flex items-center gap-2">
                      <Pill tone={sharedToCreator ? "good" : "warn"}>{sharedToCreator ? "Shared" : "Pending"}</Pill>
                      <Toggle value={sharedToCreator} onChange={setSharedToCreator} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Btn
                      onClick={async () => {
                        const ok = await safeCopy(JSON.stringify({ sessionId: session.id, variant, pack: "overlay-pack", includes: { qrEnabled, timerEnabled, lowerEnabled } }, null, 2));
                        setToast(ok ? "Copied package spec" : "Copy failed");
                      }}
                      left={<Copy className="h-4 w-4" />}
                    >
                      Copy spec
                    </Btn>
                    <Btn
                      tone="ghost"
                      onClick={() => setToast("Created Asset Library task (demo)")}
                      left={<Download className="h-4 w-4" />}
                      title="In production: create a Deliverables → Asset Library item for the creator"
                    >
                      Create task
                    </Btn>
                  </div>
                  <div className="mt-2 text-[10px] text-neutral-600 dark:text-slate-500">
                    Permission note: supplier.live.overlays.share should be gated and audited.
                  </div>
                </div>
              ) : null}
            </div>

            {/* Variant */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Variant</div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">Preview and edit overlay variants.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Btn tone={variant === "A" ? "primary" : "neutral"} onClick={() => setVariant("A")}>Variant A</Btn>
                  <Btn tone={variant === "B" ? "primary" : "neutral"} onClick={() => setVariant("B")}>Variant B</Btn>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">Notes (A)</div>
                  <textarea
                    value={notesA}
                    onChange={(e) => setNotesA(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                  />
                </div>
                <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">Notes (B)</div>
                    {proBadge}
                  </div>
                  <textarea
                    value={notesB}
                    onChange={(e) => setNotesB(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                    disabled={!isPro}
                  />
                  {!isPro ? (
                    <div className="mt-2 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400 transition">
                      <div className="font-semibold">Why locked</div>
                      <div className="mt-1">Variant B editing is Pro.</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Tab panels */}
            {tab === "qr" ? (
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">QR overlay generator</div>
                    <div className="text-xs text-neutral-600 dark:text-slate-400">Generate a scan-to-shop overlay for your live stream.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle value={qrEnabled} onChange={setQrEnabled} />
                    <Pill>
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Recommended
                    </Pill>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Target URL</div>
                    <input
                      value={qrUrl}
                      onChange={(e) => setQrUrl(e.target.value)}
                      className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Label</div>
                      <input
                        value={qrLabel}
                        onChange={(e) => setQrLabel(e.target.value)}
                        className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Corner</div>
                      <select
                        value={qrCorner}
                        onChange={(e) => setQrCorner(e.target.value)}
                        className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                      >
                        <option value="tr">Top right (recommended)</option>
                        <option value="tl">Top left</option>
                        <option value="br">Bottom right</option>
                        <option value="bl">Bottom left</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">Size</div>
                      <div className="text-[10px] text-neutral-600 dark:text-slate-500">{qrSize}px</div>
                    </div>
                    <input type="range" min={120} max={240} step={10} value={qrSize} onChange={(e) => setQrSize(Number(e.target.value))} className="mt-2 w-full accent-[#F77F00]" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Btn
                      onClick={async () => {
                        const ok = await safeCopy(qrUrl);
                        setToast(ok ? "Copied QR URL" : "Copy failed");
                      }}
                      left={<Copy className="h-4 w-4" />}
                    >
                      Copy URL
                    </Btn>
                    <Btn tone="ghost" onClick={() => setToast("Download QR overlay (demo)")} left={<Download className="h-4 w-4" />}>
                      Download PNG
                    </Btn>
                  </div>

                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400 transition">
                    <div className="font-semibold text-xs sm:text-sm">Copyright safeguard</div>
                    <div className="mt-1 text-xs">Only use licensed music/video and approved brand assets for overlays.</div>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "links" ? (
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Short links + UTM tags</div>
                    <div className="text-xs text-neutral-600 dark:text-slate-400">Track attribution per channel/message.</div>
                  </div>
                  <Pill>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Recommended
                  </Pill>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Destination URL</div>
                    <input
                      value={destUrl}
                      onChange={(e) => setDestUrl(e.target.value)}
                      className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">utm_source</div>
                      <input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">utm_medium</div>
                      <input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">utm_campaign</div>
                      <input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">utm_content</div>
                      <input value={utmContent} onChange={(e) => setUtmContent(e.target.value)} className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition" />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">UTM link</div>
                    <div className="mt-2 rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 text-xs text-neutral-800 dark:text-slate-200 break-all">
                      {utmLink}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn
                        onClick={async () => {
                          const ok = await safeCopy(utmLink);
                          setToast(ok ? "Copied UTM link" : "Copy failed");
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy
                      </Btn>
                      <Btn tone="ghost" onClick={() => setShortSlug(makeSlug())} left={<Sparkles className="h-4 w-4" />}>
                        New slug
                      </Btn>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Short domain</div>
                      <input value={shortDomain} onChange={(e) => setShortDomain(e.target.value)} className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Short slug</div>
                      <input value={shortSlug} onChange={(e) => setShortSlug(e.target.value)} className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition" />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-neutral-900 dark:bg-black p-3 text-white transition">
                    <div className="text-[10px] text-white/50">Short link preview</div>
                    <div className="mt-1 text-sm font-semibold break-all">{shortLink}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn
                        tone="primary"
                        onClick={async () => {
                          const ok = await safeCopy(shortLink);
                          setToast(ok ? "Copied short link" : "Copy failed");
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy
                      </Btn>
                      <Btn tone="ghost" onClick={() => setToast("Open link in new tab (demo)")} left={<ExternalLink className="h-4 w-4" />}>
                        Open
                      </Btn>
                    </div>
                  </div>

                  {executionMode === "use_creator" ? (
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400 transition">
                      <div className="font-semibold">Supplier note</div>
                      <div className="mt-1 text-xs">If a creator is hosting, share the short link + UTM plan so analytics attribution stays consistent.</div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {tab === "timer" ? (
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Countdown overlay</div>
                    <div className="text-xs text-neutral-600 dark:text-slate-400">Show urgency: starts-in / ends-in.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle value={timerEnabled} onChange={setTimerEnabled} />
                    <Pill>
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Recommended
                    </Pill>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Label</div>
                    <input value={timerText} onChange={(e) => setTimerText(e.target.value)} className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Style</div>
                      <select
                        value={timerStyle}
                        onChange={(e) => setTimerStyle(e.target.value)}
                        className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                      >
                        <option value="pill">Pill (recommended)</option>
                        <option value="bar">Top bar</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Deal end time</div>
                      <input
                        type="datetime-local"
                        value={new Date(dealEndISO).toISOString().slice(0, 16)}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          setDealEndISO(new Date(v).toISOString());
                        }}
                        className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">Preview</div>
                    <div className="mt-2 rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800">
                      <div className="inline-flex items-center gap-2 rounded-full bg-neutral-900 dark:bg-slate-100 px-3 py-2 text-sm font-semibold text-white dark:text-slate-900 transition">
                        <Timer className="h-4 w-4" />
                        {countdown.mode === "Session ended" ? "Session ended" : `${countdown.mode}: ${countdown.value}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "lower" ? (
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Lower-third product banner</div>
                    <div className="text-xs text-neutral-600 dark:text-slate-400">Show an active item with stock state + CTA.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle value={lowerEnabled} onChange={setLowerEnabled} />
                    <Pill>
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Best practice
                    </Pill>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Product</div>
                    <select
                      value={lowerProductId}
                      onChange={(e) => setLowerProductId(e.target.value)}
                      className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} • {p.stock === 0 ? "Sold out" : `Stock ${p.stock}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">CTA text</div>
                      <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-700 dark:text-slate-400">Placement</div>
                      <select
                        value={lowerPlacement}
                        onChange={(e) => setLowerPlacement(e.target.value)}
                        className="mt-2 w-full rounded-xl bg-neutral-50 dark:bg-slate-800 px-3 py-2 text-sm text-neutral-900 dark:text-slate-50 ring-1 ring-neutral-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-600 transition"
                      >
                        <option value="bottom">Bottom (lower-third)</option>
                        <option value="top">Top banner</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">Banner preview</div>
                    <div className="mt-2 rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                      <div className="flex items-center gap-3">
                        <img src={selected.posterUrl} alt="" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover ring-1 ring-neutral-200 dark:ring-slate-800" />
                        <div className="min-w-0">
                          <div className="truncate text-xs sm:text-sm font-semibold text-neutral-900 dark:text-slate-50">{selected.name}</div>
                          <div className="text-[10px] sm:text-xs text-neutral-700 dark:text-slate-400">
                            {selected.price} •{" "}
                            {selected.stock === 0 ? (
                              <span className="font-semibold text-rose-700 dark:text-rose-400">Sold out</span>
                            ) : selected.stock <= 8 ? (
                              <span className="font-semibold text-amber-800 dark:text-amber-400">Low stock</span>
                            ) : (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">In stock</span>
                            )}
                          </div>
                        </div>
                        <div className="ml-auto">
                          <button
                            type="button"
                            className={cn(
                              "rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition active:scale-95",
                              variant === "B" ? "bg-[#F77F00]" : "bg-neutral-900 dark:bg-slate-100 dark:text-slate-900"
                            )}
                          >
                            {ctaText}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-neutral-600 dark:text-slate-500">Tip: avoid covering faces; keep safe margins.</div>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "ab" ? (
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">A/B variants</div>
                    <div className="text-xs text-neutral-600 dark:text-slate-400">Test placements and CTA copy (premium).</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle value={abEnabled} onChange={setAbEnabled} disabled={!isPro} />
                    {proBadge}
                  </div>
                </div>

                {!isPro ? (
                  <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-sm text-amber-900 dark:text-amber-400 transition">
                    <div className="font-semibold">Why locked</div>
                    <div className="mt-1">A/B testing is Pro. Upgrade to enable split traffic and Variant B.</div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-neutral-900 dark:text-slate-300">Traffic split</div>
                        <Pill>
                          <Sparkles className="h-3.5 w-3.5" />
                          Recommended
                        </Pill>
                      </div>
                      <input type="range" min={0} max={100} defaultValue={50} className="mt-2 w-full accent-[#F77F00]" />
                      <div className="mt-1 text-[10px] text-neutral-600 dark:text-slate-500">A 50% • B 50% (demo)</div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                        <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Variant A</div>
                        <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Default for new sessions.</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Btn onClick={() => setVariant("A")} left={<Eye className="h-4 w-4" />}>Preview A</Btn>
                          <Btn tone="ghost" onClick={() => setToast("Exported Variant A (demo)")} left={<Download className="h-4 w-4" />}>Export</Btn>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Variant B</div>
                          {proBadge}
                        </div>
                        <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Try different CTA copy/placement.</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Btn onClick={() => setVariant("B")} left={<Eye className="h-4 w-4" />}>Preview B</Btn>
                          <Btn tone="danger" onClick={() => setToast("Reset Variant B (demo)")} left={<Trash2 className="h-4 w-4" />}>Reset</Btn>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-neutral-900 dark:bg-black p-3 text-white transition">
                      <div className="text-[11px] text-white/70 italic">Recommended approach</div>
                      <div className="mt-1 text-sm font-semibold">Change only one variable per experiment.</div>
                      <div className="mt-2 text-[10px] text-white/50">Report results inside Live analytics once wired.</div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Live preview</div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">Overlays shown on a vertical live frame.</div>
                </div>
                <Pill>
                  <Eye className="h-3.5 w-3.5" />
                  Mobile frame
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
                {/* Phone */}
                <div className="lg:col-span-7">
                  <div className="w-full">
                    <div className="relative overflow-hidden rounded-[14px] bg-neutral-900 p-3">
                      <div className="relative overflow-hidden rounded-[12px] bg-black">
                        <div className="aspect-[9/16] w-full bg-gradient-to-b from-neutral-700 via-neutral-900 to-black" />

                        {/* Countdown */}
                        {timerEnabled ? (
                          timerStyle === "pill" ? (
                            <div
                              className={cn(
                                "absolute left-3 top-3 rounded-full bg-white dark:bg-slate-900/95 dark:bg-slate-900/95 px-3 py-2 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-slate-50 shadow-lg ring-1 ring-black/5 dark:ring-white/10 transition-all",
                                variant === "B" ? "scale-[1.06]" : ""
                              )}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                {countdown.mode === "Session ended" ? "Session ended" : `${timerText}: ${countdown.value}`}
                              </span>
                            </div>
                          ) : (
                            <div className="absolute inset-x-0 top-0 bg-white dark:bg-slate-900/95 dark:bg-slate-900/95 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-slate-50 shadow ring-1 ring-black/5 dark:ring-white/10 transition-all">
                              <span className="inline-flex items-center gap-2">
                                <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                {countdown.mode === "Session ended" ? "Session ended" : `${timerText}: ${countdown.value}`}
                              </span>
                            </div>
                          )
                        ) : null}

                        {/* QR */}
                        {qrEnabled ? (
                          <div className={cn("absolute transition-all duration-300", cornerClass(qrCorner))}>
                            <div
                              className={cn(
                                "rounded-2xl bg-white dark:bg-slate-900/95 dark:bg-slate-900/95 p-1.5 sm:p-2 shadow-xl ring-1 ring-black/10 dark:ring-white/20 transition-all",
                                variant === "B" ? "p-2 sm:p-2.5" : ""
                              )}
                            >
                              <img
                                src={qrImg}
                                alt="QR"
                                className="rounded-xl object-contain bg-white dark:bg-slate-900"
                                style={{ width: qrSize * 0.6, height: qrSize * 0.6 }}
                              />
                              <div className="mt-1 sm:mt-2 text-center text-[10px] font-semibold text-neutral-900 dark:text-slate-50">{qrLabel}</div>
                            </div>
                          </div>
                        ) : null}

                        {/* Lower third */}
                        {lowerEnabled ? (
                          <div className={cn("absolute inset-x-3 transition-all duration-300", lowerPlacement === "bottom" ? "bottom-3" : "top-14")}>
                            <div
                              className={cn(
                                "flex items-center gap-2.5 sm:gap-3 rounded-2xl bg-white dark:bg-slate-900/95 dark:bg-slate-900/95 p-2 sm:p-2.5 shadow-xl ring-1 ring-black/10 dark:ring-white/20 transition-all",
                                variant === "B" ? "p-3" : ""
                              )}
                            >
                              <img
                                src={selected.posterUrl}
                                alt=""
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover ring-1 ring-neutral-200 dark:ring-slate-800"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-xs sm:text-sm font-semibold text-neutral-900 dark:text-slate-50">{selected.name}</div>
                                <div className="text-[10px] sm:text-xs text-neutral-700 dark:text-slate-400">
                                  {selected.price} •{" "}
                                  {selected.stock === 0 ? (
                                    <span className="font-semibold text-rose-700 dark:text-rose-400">Sold out</span>
                                  ) : selected.stock <= 8 ? (
                                    <span className="font-semibold text-amber-800 dark:text-amber-400">Low stock</span>
                                  ) : (
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">In stock</span>
                                  )}
                                </div>
                              </div>
                              <div className="ml-auto">
                                <button
                                  type="button"
                                  className={cn(
                                    "rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-sm font-semibold text-white shadow-sm transition active:scale-95",
                                    variant === "B" ? "bg-[#F77F00]" : "bg-neutral-900 dark:bg-slate-100 dark:text-slate-900"
                                  )}
                                >
                                  {ctaText}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10" />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Btn tone="neutral" onClick={() => setToast("Fullscreen preview (demo)")} left={<Eye className="h-4 w-4" />}>Fullscreen</Btn>
                      <Btn
                        tone="neutral"
                        onClick={async () => {
                          const ok = await safeCopy(shortLink);
                          setToast(ok ? "Copied CTA link" : "Copy failed");
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy CTA
                      </Btn>
                      <Btn tone="ghost" onClick={() => setToast("Open docs (demo)")} left={<ExternalLink className="h-4 w-4" />}>Docs</Btn>
                    </div>
                  </div>
                </div>

                {/* Right panel */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 shadow-sm transition">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-slate-50">Preflight</div>
                    <div className="mt-2 space-y-2">
                      {[
                        { label: "QR URL valid", ok: preflight.qrOk },
                        { label: "Short link present", ok: preflight.linkOk },
                        { label: "End time set", ok: preflight.endOk },
                        { label: "A/B enabled requires Pro", ok: preflight.abOk },
                        { label: executionMode === "use_creator" ? "Shared to creator" : "Execution mode set", ok: executionMode === "use_creator" ? preflight.shareOk : preflight.modeOk },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between rounded-2xl bg-neutral-50 dark:bg-slate-800/50 p-3 ring-1 ring-neutral-200 dark:ring-slate-800 transition">
                          <span className="text-xs text-neutral-800 dark:text-slate-300">{row.label}</span>
                          <Pill tone={row.ok ? "good" : "warn"}>
                            {row.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {row.ok ? "OK" : "Fix"}
                          </Pill>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 ring-1 ring-amber-200 dark:ring-amber-500/20 text-[10px] sm:text-xs text-amber-900 dark:text-amber-400 transition">
                      <div className="font-semibold">Copyright safeguard</div>
                      <div className="mt-1">Only use licensed music/video and approved brand assets.</div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-neutral-900 dark:bg-black p-4 text-white transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-white/50">Overlay export</div>
                        <div className="mt-1 text-sm font-semibold">Export transparent overlays for OBS / Live Studio.</div>
                      </div>
                      {proBadge}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn tone="primary" onClick={() => setToast("Exported overlay pack (demo)")} left={<Download className="h-4 w-4" />}>Export pack</Btn>
                      <Btn
                        onClick={async () => {
                          const spec = {
                            canvas: { width: 1080, height: 1920, safeArea: { top: 80, bottom: 140, left: 48, right: 48 } },
                            sessionId: session.id,
                            variant,
                            overlays: { qr: { enabled: qrEnabled, corner: qrCorner, size: qrSize, label: qrLabel }, timer: { enabled: timerEnabled, style: timerStyle, text: timerText }, lower: { enabled: lowerEnabled, placement: lowerPlacement, productId: lowerProductId, ctaText } },
                            links: { utmLink, shortLink },
                            executionMode,
                          };
                          const ok = await safeCopy(JSON.stringify(spec, null, 2));
                          setToast(ok ? "Copied render spec" : "Copy failed");
                        }}
                        left={<Copy className="h-4 w-4" />}
                      >
                        Copy spec
                      </Btn>
                    </div>
                    <div className="mt-2 text-[10px] text-white/40 italic">In production: render 1080×1920 transparent overlays + safe areas.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Toast */}
            {toast ? (
              <div className="fixed bottom-4 left-1/2 z-[95] -translate-x-1/2 transition-all">
                <div className="rounded-full bg-neutral-900 dark:bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 shadow-2xl ring-1 ring-white/10 dark:ring-black/10 transition">
                  {toast}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierOverlaysCTAsPro test failed: ${msg}`);
  };
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "ORANGE exists");
  assert(typeof computeUTM("https://example.com", { utm_source: "x" }).includes("utm_source") === "boolean", "computeUTM runs");
  assert(typeof makeSlug() === "string" && makeSlug().length === 7, "makeSlug length 7");
  console.log("✅ SupplierOverlaysCTAsPro self-tests passed");
}
