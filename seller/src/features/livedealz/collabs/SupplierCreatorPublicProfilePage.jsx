import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";

/**
 * SupplierCreatorProfilePage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: CreatorPublicProfilePage.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Same hero layout: gradient banner + profile card + stats + social mini-stats
 * - Same left column sections: About, Performance snapshot, Campaign portfolio,
 *   Upcoming & recent lives, Reviews
 * - Same right column cards: Social links, Past campaigns, Interest tags,
 *   Compatibility score, Quick collaboration facts
 * - Same visual language: rounded-2xl cards, light grey background, EVzone orange/green accents
 *
 * Supplier adaptations (minimal, required):
 * - CTA is supplier-centric: Invite to collaborate opens a full side drawer (invite builder).
 * - Invite-only correction: creators ACCEPT invites to collaborate (not proposal response).
 * - Drawer supports selecting a Supplier campaign (must be “Use Creator” or “Not sure yet”).
 * - Campaign governance surfaced: Collab Mode + Content Approval Mode (Manual/Auto).
 * - Simulation button kept: “Mark Accepted (demo)” to emulate acceptance → negotiation entry.
 *
 * Canvas-safe:
 * - No MUI. Uses lightweight toast + drawer.
 */

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function goTo(navigate, path) {
  if (!path) return;
  const target = /^https?:\/\//i.test(path) ? path : path.startsWith("/") ? path : `/${path}`;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noreferrer");
    return;
  }
  navigate(target);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function money(currency, value) {
  const v = Number(value || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0
    }).format(v);
  } catch {
    return `${currency || "USD"} ${v.toLocaleString()}`;
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/* ----------------------------- Toast ----------------------------- */

function Toast({ text, tone = "info", onClose }) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [text, onClose]);

  if (!text) return null;

  const dot =
    tone === "success" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : tone === "error" ? "bg-rose-500" : "bg-slate-400";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
      <div className="rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-semibold shadow-lg flex items-center gap-2">
        <span className={cx("h-2 w-2 rounded-full", dot)} />
        <span>{text}</span>
      </div>
    </div>
  );
}

/* ----------------------------- UI atoms ----------------------------- */

function PageHeader({ pageTitle, rightContent }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <button
            type="button"
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 transition-colors"
            title="Back to Creator Directory"
            onClick={() => goTo(navigate, "/supplier/collabs/creators")}
          >
            ←
          </button>
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 truncate">{pageTitle}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-300">Supplier view · Creator mini-site</div>
          </div>
        </div>
        <div className="flex items-center gap-2">{rightContent}</div>
      </div>
    </header>
  );
}

function Pill({ tone = "neutral", children, title, className = "" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-400"
        : tone === "bad"
          ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-400"
          : tone === "brand"
            ? "text-white border-transparent"
            : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200";

  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold", cls, className)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", onClick, disabled, children, title, className = "" }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "ghost"
        ? "border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
        : tone === "danger"
          ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800";

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(base, cls, className)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
    >
      {children}
    </button>
  );
}



function Drawer({ open, title, subtitle, onClose, children, footer }) {
  return (
    <div className={cx("fixed inset-0 z-[70]", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        className={cx(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cx(
          "absolute top-0 right-0 h-full w-full sm:w-[560px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">{title}</div>
              {subtitle ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
            </div>
            <Btn tone="ghost" onClick={onClose}>✕</Btn>
          </div>
          <div className="flex-1 overflow-auto px-4 py-4">{children}</div>
          {footer ? (
            <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-900/30">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50">{children}</h2>
      {right}
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-medium transition-colors">
      {children}
    </span>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 flex flex-col justify-between transition-colors">
      <span className="text-xs text-slate-500 dark:text-slate-300 mb-0.5">{label}</span>
      <span className="text-sm font-semibold dark:text-slate-50 dark:font-bold mb-0.5">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-300">{sub}</span>
    </div>
  );
}

function PortfolioCard({ brand, category, title, body, onAction }) {
  return (
    <article className="border border-slate-100 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 flex flex-col gap-1 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            {brand} · {category}
          </span>
        </div>
        <button
          className="text-xs px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
          onClick={onAction}
        >
          View replay
        </button>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">{body}</p>
    </article>
  );
}

function LiveSlotCard({ label, title, time, cta, onAction }) {
  return (
    <div className="min-w-[180px] border border-slate-100 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 flex flex-col justify-between text-sm transition-colors">
      <div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 mb-1 transition-colors">
          {label}
        </span>
        <h3 className="text-sm font-semibold mb-0.5">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-300">{time}</p>
      </div>
      <button
        className="mt-2 w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        onClick={onAction}
      >
        {cta}
      </button>
    </div>
  );
}

function Review({ brand, quote }) {
  return (
    <li className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 flex flex-col gap-1 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{brand}</span>
        <span className="text-xs text-amber-500 dark:text-amber-400">★★★★★</span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">"{quote}"</p>
    </li>
  );
}

function SocialStat({ icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-1">
      <span>{icon}</span>
      <span className="text-xs text-slate-500 dark:text-slate-300">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/* ----------------------------- Supplier domain mocks ----------------------------- */

const MOCK_CAMPAIGNS = [
  {
    id: "S-201",
    name: "Beauty Flash Week (Combo)",
    stage: "Collabs",
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Invite-only",
    approvalMode: "Manual",
    currency: "USD",
    budget: 2400,
    region: "East Africa",
    type: "Live + Shoppables.",
    startDate: "2026-02-10",
    endDate: "2026-02-23"
  },
  {
    id: "S-204",
    name: "ShopNow Groceries Soft Promo",
    stage: "Collabs",
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Open for Collabs",
    approvalMode: "Auto",
    currency: "USD",
    budget: 1200,
    region: "East Africa",
    type: "Shoppable Adz",
    startDate: "2026-03-01",
    endDate: "2026-03-21"
  },
  {
    id: "S-203",
    name: "Supplier-only Promo Sprint",
    stage: "Execution",
    creatorUsageDecision: "I will NOT use a Creator",
    collabMode: "—",
    approvalMode: "Auto",
    currency: "USD",
    budget: 800,
    region: "East Africa",
    type: "Shoppable Adz",
    startDate: "2026-02-23",
    endDate: "2026-02-27"
  },
  {
    id: "S-212",
    name: "New Launch (Creator plan pending)",
    stage: "Draft",
    creatorUsageDecision: "I am NOT SURE yet",
    collabMode: "Open for Collabs",
    approvalMode: "Manual",
    currency: "USD",
    budget: 1600,
    region: "Africa / Asia",
    type: "Live Sessionz",
    startDate: todayYMD(),
    endDate: ""
  }
];

const DELIVERABLE_PACKS = [
  {
    id: "pack-live",
    name: "Live session pack",
    description: "1 live (60–90 mins) + 3 highlight clips",
    items: ["1x Live Session", "3x Clips (15–30s)"]
  },
  {
    id: "pack-ads",
    name: "Shoppable Adz bundle",
    description: "3 ad creatives + CTA + caption pack",
    items: ["3x Ad Creatives", "CTA + Captions", "Link Pack"]
  },
  {
    id: "pack-full",
    name: "Full launch package",
    description: "Live + 3 clips + 2 stories + 1 post",
    items: ["1x Live Session", "3x Clips", "2x Stories", "1x Post"]
  }
];

/* ----------------------------- Cards (Right column) ----------------------------- */

function SocialLinksCard({ onAction }) {
  const socials = [
    { id: "tiktok", name: "TikTok", handle: "@ronald.creates", tag: "TT", color: "bg-slate-900" },
    { id: "instagram", name: "Instagram", handle: "@ronald.creates", tag: "IG", color: "bg-pink-500" },
    { id: "youtube", name: "YouTube", handle: "Ronald Creates", tag: "YT", color: "bg-red-600" }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-sm font-semibold tracking-tight mb-2 uppercase text-slate-600 dark:text-slate-200 font-medium">Social links</h2>
      <div className="space-y-1.5">
        {socials.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-2.5 py-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            onClick={() => onAction?.(`Opening ${s.name} profile... ↗`)}
          >
            <div className="flex items-center gap-2">
              <div className={cx("h-7 w-7 rounded-full flex items-center justify-center text-sm font-semibold text-white", s.color)}>
                {s.tag}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-50">{s.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-300">{s.handle}</span>
              </div>
            </div>
            <button className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:text-slate-100 font-medium transition-colors">
              <span className="text-xs">↗</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PastCampaignsCard({ onAction }) {
  const campaigns = [
    { id: 1, title: "Glow Essentials – Serum + Toner Bundle", period: "Mar 14 – Mar 18 · Host", gmv: "$6,200", ctr: "4.1%", conv: "2.8%" },
    { id: 2, title: "Weekend Mask Bar Live", period: "Feb 3 – Feb 4 · Guest creator", gmv: "$4,200", ctr: "3.5%", conv: "2.2%" },
    { id: 3, title: "Black Friday Beauty Mega Stream", period: "Nov 23 – Nov 25 · Lead host", gmv: "$11,150", ctr: "4.8%", conv: "3.1%" }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold tracking-tight uppercase text-slate-600 dark:text-slate-200 font-medium">Past campaigns</h2>
        <span className="text-xs text-slate-500 dark:text-slate-300">{campaigns.length} Dealz</span>
      </div>
      <div className="space-y-1.5">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 flex items-start justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{c.period}</div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-200 font-medium">
                <span><span className="font-semibold">GMV {c.gmv}</span></span>
                <span>CTR {c.ctr}</span>
                <span>Conv {c.conv}</span>
              </div>
            </div>
            <button
              className="text-xs whitespace-nowrap px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-700 transition-colors"
              onClick={() => onAction?.("View Dealz")}
            >
              View Dealz ↗
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InterestTagsCard() {
  const tags = ["#EV", "#Tech", "#Live shopping", "#Discount hunts", "#Cross-border"];
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-sm font-semibold tracking-tight mb-2 uppercase text-slate-600 dark:text-slate-200 font-medium">Interest tags</h2>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-100 font-medium transition-colors">
            {tag}
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        These tags help MyLiveDealz match this creator with relevant Supplier campaigns.
      </p>
    </div>
  );
}

function CompatibilityCard({ onAction }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold">Compatibility score</h2>
        <span className="text-xs text-slate-400 dark:text-slate-400">Visible to you only</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">
        Based on category, region, audience match, and fulfillment risk.
      </p>
      <div className="flex items-center gap-3 mb-2">
        <div className="relative h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors">
          <div className="h-11 w-11 rounded-full bg-[#f77f00] text-white flex items-center justify-center text-sm font-semibold dark:text-slate-50 dark:font-bold">
            82%
          </div>
        </div>
        <div className="flex-1 text-xs text-slate-600 dark:text-slate-200 font-medium">
          <p className="mb-1">
            Strong fit for <span className="font-semibold">EV</span> and <span className="font-semibold">tech gadget</span> campaigns in East Africa and cross-border buyers.
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>High conversions in flash dealz.</li>
            <li>Audience overlap with your markets.</li>
          </ul>
        </div>
      </div>
      <button
        className="w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        onClick={() => onAction?.("Generating full report... 🧠")}
      >
        See full compatibility breakdown
      </button>
    </div>
  );
}

function QuickFactsCard({ onAction, onDownload }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-xs font-semibold mb-2">Quick collaboration facts</h2>
      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-200 font-medium">
        <li>Typical live duration: 60–90 minutes.</li>
        <li>Preferred collaboration: flat fee + performance bonus.</li>
        <li>Comfortable with multi-language guidance (EN + local notes).</li>
        <li>Open to long-term partnerships and product series.</li>
      </ul>
      <button
        className="mt-3 w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        onClick={onDownload || (() => onAction?.("Downloading deck... ⬇️"))}
      >
        Download description deck
      </button>
    </div>
  );
}

/* ----------------------------- Invite Drawer (Supplier) ----------------------------- */

function InviteDrawer({ open, onClose, creator, campaigns, onInviteSent, toast }) {
  const navigate = useNavigate();
  const go = (path) => goTo(navigate, path);
  const eligible = useMemo(() => {
    return (campaigns || []).filter((c) => c.creatorUsageDecision !== "I will NOT use a Creator" && c.stage !== "Completed" && c.stage !== "Terminated");
  }, [campaigns]);

  const [campaignId, setCampaignId] = useState(eligible[0]?.id || "");
  const selectedCampaign = useMemo(() => eligible.find((c) => c.id === campaignId) || null, [eligible, campaignId]);

  const [packId, setPackId] = useState("pack-live");
  const pack = useMemo(() => DELIVERABLE_PACKS.find((p) => p.id === packId) || DELIVERABLE_PACKS[0], [packId]);

  const [approvalMode, setApprovalMode] = useState("Manual");
  const [collabMode, setCollabMode] = useState("Invite-only");

  const [fee, setFee] = useState(400);
  const [commission, setCommission] = useState(5);
  const [paymentSplit, setPaymentSplit] = useState("50/50");
  const [exclusivityDays, setExclusivityDays] = useState(7);
  const [usageRightsDays, setUsageRightsDays] = useState(90);

  const [message, setMessage] = useState(
    `Hi ${creator?.name || ""},\n\nWe’d like to invite you to collaborate on an upcoming campaign. Please review the deliverables and terms, then ACCEPT the invite to collaborate to open negotiation.\n\nThank you.`
  );

  const [attachments, setAttachments] = useState([]);
  const fileRef = useRef(null);

  const [pending, setPending] = useState(false);
  const [inviteRecord, setInviteRecord] = useState(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    const firstId = eligible[0]?.id || "";
    setCampaignId(firstId);

    const sc = eligible.find((c) => c.id === firstId) || null;
    setApprovalMode(sc?.approvalMode || "Manual");
    setCollabMode(sc?.collabMode === "Open for Collabs" ? "Open for Collabs" : "Invite-only");

    setPackId("pack-live");
    setFee(400);
    setCommission(5);
    setPaymentSplit("50/50");
    setExclusivityDays(7);
    setUsageRightsDays(90);
    setMessage(
      `Hi ${creator?.name || ""},\n\nWe’d like to invite you to collaborate on “${sc?.name || "(campaign)"}”.\n\nPlease review the deliverables and terms, then ACCEPT the invite to collaborate to open the negotiation room.\n\nThank you.`
    );
    setAttachments([]);
    setInviteRecord(null);
    setPending(false);
  }, [open]);

  // When campaign changes, sync governance defaults
  useEffect(() => {
    if (!selectedCampaign) return;
    setApprovalMode(selectedCampaign.approvalMode || "Manual");
    setCollabMode(selectedCampaign.collabMode === "Open for Collabs" ? "Open for Collabs" : "Invite-only");
    setMessage(
      `Hi ${creator?.name || ""},\n\nWe’d like to invite you to collaborate on “${selectedCampaign.name}”.\n\nPlease review the deliverables and terms, then ACCEPT the invite to collaborate to open the negotiation room.\n\nThank you.`
    );
  }, [selectedCampaign?.id]);

  const requiresDecisionUpgrade = selectedCampaign?.creatorUsageDecision === "I am NOT SURE yet";

  const sendInvite = async () => {
    if (!selectedCampaign) {
      toast?.("Select a campaign first.", "error");
      return;
    }

    // Permission note (RBAC): In production, only Supplier Owner/Collabs Manager can send invites.

    setPending(true);
    try {
      const response = await sellerBackendApi.createCreatorInvite({
        creatorHandle: creator?.handle,
        campaignId: selectedCampaign.id,
        campaignTitle: selectedCampaign.name,
        title: `Invite to collaborate on ${selectedCampaign.name}`,
        message,
        type: pack.name,
        category: creator?.categories?.[0] || "General",
        region: creator?.region || "Global",
        baseFee: fee,
        currency: "USD",
        commissionPct: commission,
        estimatedValue: fee,
        fitScore: creator?.fitScore || 80,
        fitReason: creator?.fitReason || "Strong campaign and audience alignment.",
        messageShort: `Invitation from supplier for ${selectedCampaign.name}.`,
        supplierDescription: "Seller invite from MyLiveDealz supplier workspace.",
        metadata: {
          collabMode,
          approvalMode,
          creatorUsageDecision: selectedCampaign.creatorUsageDecision,
          paymentSplit,
          exclusivityDays,
          usageRightsDays,
          packId: pack.id,
          packName: pack.name,
          attachments
        }
      });

      const record = {
        id: String(response?.id || ""),
        campaignId: selectedCampaign.id,
        campaignName: selectedCampaign.name,
        status: "Pending acceptance",
        sentAt: new Date().toLocaleString(),
        collabMode,
        approvalMode,
        packName: pack.name,
        fee,
        commission
      };

      setInviteRecord(record);
      onInviteSent?.(record);
      toast?.("Invite sent. Waiting for creator to accept.", "success");
    } catch (error) {
      toast?.(error instanceof Error ? error.message : "Failed to send invite.", "error");
    } finally {
      setPending(false);
    }
  };

  const markAccepted = () => {
    if (!inviteRecord) return;
    const next = { ...inviteRecord, status: "Accepted" };
    setInviteRecord(next);
    toast?.("Invite accepted (demo). You can now negotiate terms.", "success");
  };

  const openNegotiation = () => {
    if (!inviteRecord) return;
    go(`/supplier/collabs/negotiation-room?campaign=${encodeURIComponent(inviteRecord.campaignId)}&creator=${encodeURIComponent(creator?.handle || "@creator")}`);
    toast?.("Opening Negotiation Room…", "info");
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Invite to collaborate"
      subtitle="Supplier invite builder · Creator accepts invite → Negotiation → Contract"
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {inviteRecord ? (
              <>
                Status: <span className="font-extrabold">{inviteRecord.status}</span> · {inviteRecord.id}
              </>
            ) : (
              "Draft"
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn onClick={onClose}>Close</Btn>
            <Btn tone="primary" onClick={sendInvite} disabled={pending} title="Send invite">
              {pending ? (
                <>
                  Sending…
                </>
              ) : (
                <>✉️ Send invite</>
              )}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Creator preview */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-extrabold text-slate-600 dark:text-slate-200">
              {String(creator?.initials || "CR")}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">{creator?.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-300 truncate">{creator?.handle} · {creator?.tier} · {creator?.region}</div>
            </div>
          </div>
        </div>

        {/* Campaign selection */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Select campaign</div>
          <div className="mt-2">
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none text-slate-900 dark:text-slate-100"
            >
              {eligible.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.name} · {c.type} · {c.stage}
                </option>
              ))}
            </select>
          </div>

          {selectedCampaign ? (
            <div className="mt-3 grid grid-cols-1 gap-2">
              <div className="flex flex-wrap gap-2">
                <Pill tone={selectedCampaign.creatorUsageDecision === "I will use a Creator" ? "good" : "warn"}>
                  {selectedCampaign.creatorUsageDecision}
                </Pill>
                <Pill tone="neutral">Collab: {collabMode}</Pill>
                <Pill tone={approvalMode === "Manual" ? "warn" : "good"}>Approval: {approvalMode}</Pill>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedCampaign.region} · Window: {selectedCampaign.startDate || "—"} → {selectedCampaign.endDate || "—"} · Budget: {money(selectedCampaign.currency, selectedCampaign.budget)}
              </div>

              {requiresDecisionUpgrade ? (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                  <div className="text-xs font-extrabold text-amber-900 dark:text-amber-300">Creator plan is pending</div>
                  <div className="mt-1 text-[11px] text-amber-900/80 dark:text-amber-300/80">
                    Sending an invite will set this campaign to “I will use a Creator”. You can still switch collaboration mode before content submission.
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Deliverables */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Deliverables package</div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Choose a starting pack (editable later in negotiation).</div>
            </div>
            <Pill tone="brand">Suggested</Pill>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2">
            {DELIVERABLE_PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPackId(p.id)}
                className={cx(
                  "w-full text-left rounded-2xl border p-3 transition",
                  packId === p.id
                    ? "border-[#f77f00] bg-amber-50/40 dark:bg-amber-900/15"
                    : "border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{p.name}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{p.description}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.items.map((it) => (
                        <Chip key={it}>{it}</Chip>
                      ))}
                    </div>
                  </div>
                  {packId === p.id ? <span className="text-sm">✓</span> : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Compensation & terms</div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Flat fee
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Commission (%)
              <input
                type="number"
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Payment split
              <select
                value={paymentSplit}
                onChange={(e) => setPaymentSplit(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              >
                <option value="50/50">50% upfront · 50% post-live</option>
                <option value="100-after">100% after delivery</option>
                <option value="100-upfront">100% upfront</option>
                <option value="custom">Custom (negotiate)</option>
              </select>
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Exclusivity (days)
              <input
                type="number"
                value={exclusivityDays}
                onChange={(e) => setExclusivityDays(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300 sm:col-span-2">
              Usage rights (days)
              <input
                type="number"
                value={usageRightsDays}
                onChange={(e) => setUsageRightsDays(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              />
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Brand may reuse clips/creatives across platforms during this window (if agreed in contract).</div>
            </label>
          </div>
        </div>

        {/* Message + attachments */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Invite message</div>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none resize-none"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const arr = Array.from(e.target.files || []);
                if (!arr.length) return;
                setAttachments((prev) => [...prev, ...arr]);
              }}
            />
            <Btn onClick={() => fileRef.current?.click()}>📎 Attach brief</Btn>
            {attachments.length ? (
              <Btn
                tone="danger"
                onClick={() => {
                  setAttachments([]);
                  toast?.("Attachments cleared", "info");
                }}
              >
                Clear
              </Btn>
            ) : null}
            <div className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
              {attachments.length ? `${attachments.length} attachment(s)` : "No attachments"}
            </div>
          </div>

          {attachments.length ? (
            <div className="mt-2 space-y-1">
              {attachments.slice(0, 5).map((f) => (
                <div
                  key={f.name}
                  className="flex items-center justify-between text-[11px] border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30"
                >
                  <span className="truncate max-w-[360px]">{f.name}</span>
                  <span className="text-slate-500">{Math.max(1, Math.round((f.size || 0) / (1024 * 1024)))}MB</span>
                </div>
              ))}
              {attachments.length > 5 ? <div className="text-[11px] text-slate-500">+{attachments.length - 5} more</div> : null}
            </div>
          ) : null}

          <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">
            <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Workflow reminder</div>
            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              Invite-only flow: Supplier sends invite → Creator ACCEPTS invite to collaborate → Negotiation Room opens → Contract → Content Submission → {approvalMode === "Manual" ? "Supplier approval" : "Auto"} → Admin approval → Execution.
            </div>
          </div>
        </div>

        {/* Simulation / next */}
        {inviteRecord ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">Invite created</div>
                <div className="mt-1 text-[11px] text-emerald-900/80 dark:text-emerald-300/80">
                  {inviteRecord.campaignName} · {inviteRecord.status} · Sent at {inviteRecord.sentAt}
                </div>
              </div>
              <Pill tone="good">{inviteRecord.id}</Pill>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {/* ✅ Keep simulation button */}
              <Btn onClick={markAccepted} disabled={inviteRecord.status === "Accepted"} title="Simulate creator acceptance">
                ✅ Mark Accepted (demo)
              </Btn>
              <Btn
                tone="primary"
                onClick={openNegotiation}
                disabled={inviteRecord.status !== "Accepted"}
                title="Open negotiation room"
              >
                🗣️ Open Negotiation Room
              </Btn>
              <Btn
                onClick={() => {
                  go("/supplier/collabs/invites");
                  toast?.("Opening Invites…", "info");
                }}
              >
                📥 View Invites
              </Btn>
            </div>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

/* ----------------------------- Main Page ----------------------------- */

export default function SupplierCreatorProfilePage() {
  const navigate = useNavigate();
  const go = (path) => goTo(navigate, path);
  const creator = useMemo(
    () => ({
      name: "Ronald Isabirye",
      handle: "@ronald.creates",
      tier: "Silver Tier",
      verified: true,
      region: "East Africa",
      initials: "RI"
    }),
    []
  );

  const [isFollowing, setIsFollowing] = useState(false);
  const [pendingFollow, setPendingFollow] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);

  const [toastText, setToastText] = useState(null);
  const [toastTone, setToastTone] = useState("info");

  const toast = (msg, tone = "info") => {
    setToastTone(tone);
    setToastText(msg);
  };

  const toggleFollow = async () => {
    setPendingFollow(true);
    await sleep(700);
    setPendingFollow(false);
    setIsFollowing((s) => !s);
    toast(!isFollowing ? "Creator saved to My Creators 🎉" : "Removed from My Creators", "success");
  };

  const handleDownloadDeck = async () => {
    toast("Preparing deck…", "info");
    await sleep(850);
    const dummyContent = `Creator Description Deck\n\nName: ${creator.name}\nHandle: ${creator.handle}\nTier: ${creator.tier}\n\nHighlights:\n- Live shopping + tech education\n- Strong East Africa conversions\n- Reliable delivery\n`;
    const blob = new Blob([dummyContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Creator_Deck.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast("Download complete ⬇️", "success");
  };

  const handleAction = (action) => {
    if (String(action).includes("View Dealz")) {
      go("/supplier/overview/dealz-marketplace");
      toast("Opening Dealz Marketplace…", "info");
    } else if (String(action).includes("View replay")) {
      go("/supplier/live/replays");
      toast("Opening Replays & Clips…", "info");
    } else if (String(action).includes("Calendar") || String(action).includes("Reminder")) {
      go("/supplier/live/schedule");
      toast("Opening Live Schedule…", "info");
    } else if (String(action).includes("compatibility")) {
      toast("Generating compatibility breakdown…", "info");
    } else if (String(action).includes("Download deck")) {
      handleDownloadDeck();
    } else {
      toast(action, "info");
    }
  };

  const followLabel = isFollowing ? "Unsave creator" : "Save creator";

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors relative">
      <PageHeader
        pageTitle="Creator Profile"
        rightContent={
          <button
            className={cx(
              "px-3 py-1 rounded-full border text-sm transition-colors flex items-center gap-2",
              isFollowing
                ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                : "border-slate-200 text-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100"
            )}
            onClick={toggleFollow}
            disabled={pendingFollow}
          >
            
            {followLabel}
          </button>
        }
      />

      {/* Hero section */}
      <main className="flex-1 flex flex-col pb-24">
        <section className="relative">
          {/* Banner */}
          <div className="h-20 md:h-24 bg-gradient-to-r from-[#f77f00] via-[#03cd8c] to-[#f77f00]" />
          {/* Hero card */}
          <div className="w-full max-w-full px-[0.55%] -mt-8 pb-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col md:flex-row gap-4 items-center md:items-end">
              <div className="flex items-end gap-3 w-full md:w-auto">
                <div className="relative">
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-4 border-white bg-slate-200 dark:bg-slate-600 transition-colors flex items-center justify-center text-lg md:text-xl font-semibold text-slate-600 dark:text-slate-300">
                    {creator.initials}
                  </div>
                  <span
                    className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center text-xs text-white"
                    style={{ background: GREEN }}
                    title="Verified"
                  >
                    ✓
                  </span>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base md:text-lg font-semibold dark:font-bold leading-tight">{creator.name}</h1>
                    <span className="text-sm text-slate-500 dark:text-slate-300">{creator.handle}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 transition-colors">
                      ⭐ {creator.tier}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 transition-colors">
                      ✓ KYC Verified
                    </span>
                    <span className="text-slate-500 dark:text-slate-300">EVs · Tech · Commerce</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Based in East Africa · Audience in Africa, Asia &amp; Global EV community
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Followers (all platforms)</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">128k+</span>
                  </div>
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Avg live viewers</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">3.2k</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    className="flex-1 md:flex-none px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]"
                    onClick={() => setInviteOpen(true)}
                    title="Invite this creator to collaborate on one of your campaigns"
                  >
                    Invite to collaborate
                  </button>

                  <button
                    className={cx(
                      "flex-1 md:flex-none px-3 py-1.5 rounded-full border text-sm transition-colors flex items-center justify-center gap-2",
                      isFollowing
                        ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                        : "border-slate-200 text-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100"
                    )}
                    onClick={toggleFollow}
                    disabled={pendingFollow}
                  >
                    
                    {followLabel}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-200 font-medium">
                  <SocialStat icon="📷" label="Instagram" value="48k" />
                  <SocialStat icon="🎵" label="TikTok" value="62k" />
                  <SocialStat icon="▶️" label="YouTube" value="18k" />
                </div>

                {/* Supplier-only quick CTA */}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <Pill tone="neutral" title="Supplier-side note">Supplier action: Invite → Accept → Negotiate → Contract</Pill>
                  <Btn
                    tone="ghost"
                    onClick={() => {
                      go("/supplier/collabs/my-creators");
                      toast("Opening My Creators…", "info");
                    }}
                    title="View saved creators"
                  >
                    👥 My Creators
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main body sections */}
        <section className="w-full max-w-full px-[0.55%] py-4 md:py-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-4 items-start">
            {/* Left column */}
            <div className="flex flex-col gap-4">
              {/* About */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle>About this creator</SectionTitle>
                <p className="text-sm text-slate-700 dark:text-slate-100 mb-2">
                  Ronald is a creator focused on electric mobility, tech and cross-border commerce.
                  He blends product education with live shopping to help brands launch into Africa
                  and Asia.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Languages &amp; markets</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">English, basic Swahili · East Africa, Southern Africa, China-facing buyers.</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Category focus</h3>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip>Beauty &amp; Skincare</Chip>
                      <Chip>Tech Gadgets</Chip>
                      <Chip>EV &amp; Mobility</Chip>
                      <Chip>Faith-compatible</Chip>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">
                  <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Supplier guidance</div>
                  <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    Tip: Invite creators only for campaigns marked “Use Creator” (or set “Not sure yet” campaigns to “Use Creator” before sending invites).
                    Content approval can be Manual (Supplier reviews) or Auto (goes to Admin).
                  </div>
                </div>
              </div>

              {/* Performance snapshot */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle>Performance snapshot</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <MetricCard label="Total sales driven" value="$180k+" sub="Across 40+ campaigns" />
                  <MetricCard label="Avg live viewers" value="3.2k" sub="Top 10% in region" />
                  <MetricCard label="Conversion rate" value="4.8%" sub="3.1× platform avg" />
                  <MetricCard label="Completed collabs" value="38" sub="Across 21 brands" />
                  <MetricCard label="Average rating" value="4.9/5" sub="23 supplier reviews" />
                  <MetricCard label="Return customer rate" value="62%" sub="Strong retention" />
                </div>
              </div>

              {/* Campaign portfolio */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle>Campaign portfolio</SectionTitle>
                <div className="space-y-2.5">
                  <PortfolioCard
                    brand="GlowUp Hub"
                    category="Beauty & Skincare"
                    title="Beauty Flash – 500 units in 45 mins"
                    body="Designed a timed flash segment with tiered bundles. Achieved 2.7× expected sell-through in the first run."
                    onAction={() => handleAction("View Dealz")}
                  />
                  <PortfolioCard
                    brand="GadgetMart Africa"
                    category="Tech & Gadgets"
                    title="Tech Friday Mega Live"
                    body="Weekly tech format focused on unboxings and Q&A. Added educational blocks on EV charging."
                    onAction={() => handleAction("View Dealz")}
                  />
                  <PortfolioCard
                    brand="Grace Living Store"
                    category="Faith-compatible wellness"
                    title="Faith & Wellness Morning Dealz"
                    body="Soft-sell morning sessionz for faith-compatible wellness products with high trust and low return rates."
                    onAction={() => handleAction("View Dealz")}
                  />
                </div>
              </div>

              {/* Upcoming & recent lives */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle
                  right={
                    <button
                      className="text-xs text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:text-slate-50"
                      onClick={() => handleAction("Calendar")}
                    >
                      View calendar
                    </button>
                  }
                >
                  Upcoming &amp; recent lives
                </SectionTitle>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  <LiveSlotCard label="Upcoming" title="Beauty Flash – Autumn drop" time="Fri · 20:00 EAT" cta="Set reminder" onAction={() => handleAction("Reminder set! ⏰")} />
                  <LiveSlotCard label="Upcoming" title="Tech Friday – EV gadgets" time="Sat · 19:30 EAT" cta="Set reminder" onAction={() => handleAction("Reminder set! ⏰")} />
                  <LiveSlotCard label="Replay" title="Faith & Wellness Morning Dealz" time="Last week · 10:00" cta="Watch replay" onAction={() => handleAction("View replay")} />
                </div>
              </div>

              {/* Reviews */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle
                  right={
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <span>★★★★★</span>
                      <span className="text-slate-500 dark:text-slate-300">4.9 average (23 reviews)</span>
                    </div>
                  }
                >
                  Reviews &amp; endorsements
                </SectionTitle>
                <ul className="space-y-2">
                  <Review brand="GlowUp Hub" quote="Ronald understands how to keep momentum and still honour our brand voice. Our launch exceeded expectations." />
                  <Review brand="GadgetMart Africa" quote="Great at explaining technical details in simple language. Viewers stayed engaged until the final call-to-action." />
                  <Review brand="Grace Living Store" quote="Very respectful of our faith-compatible guidelines and excellent with community Q&A." />
                </ul>
              </div>
            </div>

            {/* Right column */}
            <aside className="flex flex-col gap-4">
              <SocialLinksCard onAction={handleAction} />
              <PastCampaignsCard onAction={handleAction} />
              <InterestTagsCard />
              <CompatibilityCard onAction={() => handleAction("compatibility")} />
              <QuickFactsCard onAction={handleAction} onDownload={handleDownloadDeck} />
            </aside>
          </div>
        </section>
      </main>

      {/* Invite Drawer */}
      <InviteDrawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        creator={creator}
        campaigns={MOCK_CAMPAIGNS}
        onInviteSent={() => {
          // Optional: in production, update My Creators / Invites state stores
        }}
        toast={toast}
      />

      <Toast text={toastText} tone={toastTone} onClose={() => setToastText(null)} />
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`CreatorProfile test failed: ${msg}`);
  };
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "ORANGE exists");
  assert(typeof GREEN === "string" && GREEN.length > 0, "GREEN exists");
  assert(Array.isArray(MOCK_CAMPAIGNS) && MOCK_CAMPAIGNS.length > 0, "campaign mocks exist");
  assert(Array.isArray(DELIVERABLE_PACKS) && DELIVERABLE_PACKS.length > 0, "deliverable packs exist");
  console.log("✅ SupplierCreatorProfilePage self-tests passed");
}
