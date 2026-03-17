import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
 * - Simulation button kept: “Mark Accepted” to emulate acceptance → negotiation entry.
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

function resolveCreatorInitials(name, handle) {
  const label = String(name || "").trim();
  if (label) {
    const parts = label.split(/\s+/g).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
  }
  return String(handle || "").replace(/^@/, "").slice(0, 2).toUpperCase() || "CR";
}

function normalizeCreatorPayload(payload) {
  const creatorRecord = payload?.creator && typeof payload.creator === "object" ? payload.creator : {};
  const categories = Array.isArray(creatorRecord?.categories) ? creatorRecord.categories.map(String) : [];
  const languages = Array.isArray(creatorRecord?.languages) ? creatorRecord.languages.map(String) : [];
  const markets = Array.isArray(creatorRecord?.markets) ? creatorRecord.markets.map(String) : [];
  return {
    creator: {
      id: String(creatorRecord?.id || ""),
      profileId: String(creatorRecord?.profileId || ""),
      avatarUrl: String(creatorRecord?.avatarUrl || ""),
      name: String(creatorRecord?.name || "Creator"),
      handle: String(creatorRecord?.handle || "@creator"),
      tier: String(creatorRecord?.tier || "Bronze Tier"),
      verified: Boolean(creatorRecord?.verified),
      region: String(creatorRecord?.region || "Global"),
      initials: String(creatorRecord?.initials || resolveCreatorInitials(creatorRecord?.name, creatorRecord?.handle)),
      categories,
      tagline: String(creatorRecord?.tagline || ""),
      bio: String(creatorRecord?.bio || ""),
      languages,
      markets,
      followersLabel: String(creatorRecord?.followersLabel || "0"),
      avgLiveViewersLabel: String(creatorRecord?.avgLiveViewersLabel || "0"),
      reviewCount: Number(creatorRecord?.reviewCount || 0),
      isFollowing: Boolean(creatorRecord?.isFollowing),
    },
    performance: Array.isArray(payload?.performance) ? payload.performance : [],
    portfolio: Array.isArray(payload?.portfolio) ? payload.portfolio : [],
    liveSlots: Array.isArray(payload?.liveSlots) ? payload.liveSlots : [],
    reviews: Array.isArray(payload?.reviews) ? payload.reviews : [],
    socials: Array.isArray(payload?.socials) ? payload.socials : [],
    pastCampaigns: Array.isArray(payload?.pastCampaigns) ? payload.pastCampaigns : [],
    tags: Array.isArray(payload?.tags) ? payload.tags.map(String) : categories,
    compatibility:
      payload?.compatibility && typeof payload.compatibility === "object"
        ? payload.compatibility
        : { score: 0, summary: "", bullets: [] },
    quickFacts: Array.isArray(payload?.quickFacts) ? payload.quickFacts.map(String) : [],
    deckContent: String(payload?.deckContent || ""),
    deliverablePacks: Array.isArray(payload?.deliverablePacks) ? payload.deliverablePacks : [],
  };
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

/* ----------------------------- Cards (Right column) ----------------------------- */

function SocialLinksCard({ socials, onAction }) {
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

function PastCampaignsCard({ campaigns, onAction }) {
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

function InterestTagsCard({ tags }) {
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

function CompatibilityCard({ compatibility, onAction }) {
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
            {`${Math.round(Number(compatibility?.score || 0))}%`}
          </div>
        </div>
        <div className="flex-1 text-xs text-slate-600 dark:text-slate-200 font-medium">
          <p className="mb-1">
            {String(compatibility?.summary || "")}
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {(Array.isArray(compatibility?.bullets) ? compatibility.bullets : []).map((item) => (
              <li key={item}>{item}</li>
            ))}
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

function QuickFactsCard({ quickFacts, onAction, onDownload }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-xs font-semibold mb-2">Quick collaboration facts</h2>
      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-200 font-medium">
        {quickFacts.map((item) => (
          <li key={item}>{item}</li>
        ))}
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

function InviteDrawer({ open, onClose, creator, campaigns, deliverablePacks, onInviteSent, toast }) {
  const navigate = useNavigate();
  const go = (path) => goTo(navigate, path);
  const eligible = useMemo(() => {
    return (campaigns || []).filter((c) => c.creatorUsageDecision !== "I will NOT use a Creator" && c.stage !== "Completed" && c.stage !== "Terminated");
  }, [campaigns]);

  const [campaignId, setCampaignId] = useState(eligible[0]?.id || "");
  const selectedCampaign = useMemo(() => eligible.find((c) => c.id === campaignId) || null, [eligible, campaignId]);

  const [packId, setPackId] = useState(deliverablePacks?.[0]?.id || "");
  const pack = useMemo(
    () => deliverablePacks.find((p) => p.id === packId) || deliverablePacks[0] || null,
    [deliverablePacks, packId]
  );

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

    const firstPack = deliverablePacks[0] || null;
    setPackId(firstPack?.id || "");
    setFee(Number(firstPack?.fee || 400));
    setCommission(Number(firstPack?.commissionPct || 5));
    setPaymentSplit("50/50");
    setExclusivityDays(Number(firstPack?.exclusivityDays || 7));
    setUsageRightsDays(Number(firstPack?.usageRightsDays || 90));
    setMessage(
      `Hi ${creator?.name || ""},\n\nWe’d like to invite you to collaborate on “${sc?.name || "(campaign)"}”.\n\nPlease review the deliverables and terms, then ACCEPT the invite to collaborate to open the negotiation room.\n\nThank you.`
    );
    setAttachments([]);
    setInviteRecord(null);
    setPending(false);
  }, [deliverablePacks, open, creator?.name, eligible]);

  useEffect(() => {
    if (!pack) return;
    setFee(Number(pack?.fee || 0));
    setCommission(Number(pack?.commissionPct || 0));
    setPaymentSplit(String(pack?.paymentSplit || "50/50"));
    setExclusivityDays(Number(pack?.exclusivityDays || 0));
    setUsageRightsDays(Number(pack?.usageRightsDays || 0));
  }, [pack]);

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
    if (!pack) {
      toast?.("Select a deliverables package first.", "error");
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
          packId: pack?.id || "",
          packName: pack?.name || "",
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
        packName: pack?.name || "",
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
    toast?.("Invite accepted. You can now negotiate terms.", "success");
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
              {creator?.avatarUrl ? (
                <img src={creator.avatarUrl} alt={creator.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                String(creator?.initials || "CR")
              )}
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
            {deliverablePacks.map((p) => (
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
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{p.description || ""}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(Array.isArray(p.items) ? p.items : Array.isArray(p.deliverables) ? p.deliverables : []).map((it) => (
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
                ✅ Mark Accepted
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
  const location = useLocation();
  const navigate = useNavigate();
  const go = (path) => goTo(navigate, path);
  const [profileData, setProfileData] = useState(() => normalizeCreatorPayload({}));
  const [campaigns, setCampaigns] = useState([]);
  const [pendingFollow, setPendingFollow] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toastText, setToastText] = useState(null);
  const [toastTone, setToastTone] = useState("info");

  const toast = (msg, tone = "info") => {
    setToastTone(tone);
    setToastText(msg);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams(location.search);
        let creatorId = params.get("id") || params.get("handle") || "";
        if (!creatorId) {
          const creators = await sellerBackendApi.getAllCreators();
          creatorId = String((Array.isArray(creators) ? creators[0] : null)?.id || "");
        }

        const [profile, workspace] = await Promise.all([
          creatorId ? sellerBackendApi.getCreatorProfile(creatorId) : Promise.resolve({}),
          sellerBackendApi.getCampaignWorkspace()
        ]);

        if (cancelled) return;
        setProfileData(normalizeCreatorPayload(profile));
        const nextCampaigns = Array.isArray(workspace?.campaigns) ? workspace.campaigns : [];
        setCampaigns(
          nextCampaigns.map((campaign) => ({
            id: String(campaign?.id || ""),
            name: String(campaign?.title || campaign?.name || "MyLiveDealz campaign"),
            creatorUsageDecision: String(campaign?.metadata?.creatorUsageDecision || campaign?.creatorUsageDecision || "I will use a Creator"),
            collabMode: String(campaign?.metadata?.collabMode || campaign?.collabMode || "Open for Collabs"),
            approvalMode: String(campaign?.metadata?.approvalMode || campaign?.approvalMode || "Manual"),
            type: String(campaign?.type || campaign?.metadata?.type || "Campaign"),
            stage: String(campaign?.metadata?.stage || campaign?.stage || campaign?.status || "Draft"),
            region: String(campaign?.metadata?.region || campaign?.region || "Global"),
            startDate: String(campaign?.startAt || campaign?.metadata?.startDate || ""),
            endDate: String(campaign?.endAt || campaign?.metadata?.endDate || ""),
            budget: Number(campaign?.budget || campaign?.metadata?.estValue || 0),
            currency: String(campaign?.currency || campaign?.metadata?.currency || "USD")
          }))
        );
      } catch (error) {
        if (cancelled) return;
        toast(error instanceof Error ? error.message : "Failed to load creator profile.", "error");
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [location.search]);

  const creator = profileData.creator;

  const toggleFollow = async () => {
    setPendingFollow(true);
    const nextFollow = !creator.isFollowing;
    setProfileData((prev) => ({
      ...prev,
      creator: {
        ...prev.creator,
        isFollowing: nextFollow
      }
    }));
    try {
      await sellerBackendApi.followCreator(creator.id, { follow: nextFollow });
      toast(nextFollow ? "Creator saved to My Creators 🎉" : "Removed from My Creators", "success");
    } catch (error) {
      setProfileData((prev) => ({
        ...prev,
        creator: {
          ...prev.creator,
          isFollowing: !nextFollow
        }
      }));
      return;
    } finally {
      setPendingFollow(false);
    }
  };

  const handleDownloadDeck = async () => {
    toast("Preparing deck…", "info");
    await sleep(300);
    const blob = new Blob([profileData.deckContent || ""], { type: "text/plain" });
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

  const followLabel = creator.isFollowing ? "Unsave creator" : "Save creator";

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors relative">
      <PageHeader
        pageTitle="Creator Profile"
        rightContent={
          <button
            className={cx(
              "px-3 py-1 rounded-full border text-sm transition-colors flex items-center gap-2",
              creator.isFollowing
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
                    {creator.avatarUrl ? (
                      <img src={creator.avatarUrl} alt={creator.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      creator.initials
                    )}
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
                    <span className="text-slate-500 dark:text-slate-300">{creator.categories.join(" · ")}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Based in {creator.region} · Audience in {creator.markets.join(", ") || "Global markets"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Followers (all platforms)</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">{creator.followersLabel}</span>
                  </div>
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Avg live viewers</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">{creator.avgLiveViewersLabel}</span>
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
                      creator.isFollowing
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
                  {profileData.socials.slice(0, 3).map((social) => (
                    <SocialStat
                      key={social.id || social.name}
                      icon={social.name === "Instagram" ? "📷" : social.name === "TikTok" ? "🎵" : "▶️"}
                      label={social.name}
                      value={social.followers}
                    />
                  ))}
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
                <p className="text-sm text-slate-700 dark:text-slate-100 mb-2">{creator.bio}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Languages &amp; markets</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
                      {(creator.languages.length ? creator.languages : ["English"]).join(", ")} · {creator.markets.join(", ") || creator.region}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Category focus</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {creator.categories.map((category) => (
                        <Chip key={category}>{category}</Chip>
                      ))}
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
                  {profileData.performance.map((metric) => (
                    <MetricCard key={metric.label} label={metric.label} value={metric.value} sub={metric.sub} />
                  ))}
                </div>
              </div>

              {/* Campaign portfolio */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle>Campaign portfolio</SectionTitle>
                <div className="space-y-2.5">
                  {profileData.portfolio.map((item) => (
                    <PortfolioCard
                      key={item.id || item.title}
                      brand={item.brand}
                      category={item.category}
                      title={item.title}
                      body={item.body}
                      onAction={() => handleAction(item.actionLabel || "View Dealz")}
                    />
                  ))}
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
                  {profileData.liveSlots.map((slot) => (
                    <LiveSlotCard
                      key={slot.id || slot.title}
                      label={slot.label}
                      title={slot.title}
                      time={slot.time}
                      cta={slot.cta}
                      onAction={() => handleAction(slot.cta || "View replay")}
                    />
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle
                  right={
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <span>★★★★★</span>
                      <span className="text-slate-500 dark:text-slate-300">
                        {`${profileData.performance.find((metric) => metric.label === "Average rating")?.value || "0/5"} average (${creator.reviewCount} reviews)`}
                      </span>
                    </div>
                  }
                >
                  Reviews &amp; endorsements
                </SectionTitle>
                <ul className="space-y-2">
                  {profileData.reviews.map((review) => (
                    <Review key={review.id || review.brand} brand={review.brand} quote={review.quote} />
                  ))}
                </ul>
              </div>
            </div>

            {/* Right column */}
            <aside className="flex flex-col gap-4">
              <SocialLinksCard socials={profileData.socials} onAction={handleAction} />
              <PastCampaignsCard campaigns={profileData.pastCampaigns} onAction={handleAction} />
              <InterestTagsCard tags={profileData.tags} />
              <CompatibilityCard compatibility={profileData.compatibility} onAction={() => handleAction("compatibility")} />
              <QuickFactsCard quickFacts={profileData.quickFacts} onAction={handleAction} onDownload={handleDownloadDeck} />
            </aside>
          </div>
        </section>
      </main>

      {/* Invite Drawer */}
      <InviteDrawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        creator={creator}
        campaigns={campaigns}
        deliverablePacks={profileData.deliverablePacks}
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
  assert(typeof normalizeCreatorPayload === "function", "profile normalizer exists");
  console.log("✅ SupplierCreatorProfilePage self-tests passed");
}
