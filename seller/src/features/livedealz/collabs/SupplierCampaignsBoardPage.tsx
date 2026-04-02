import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";

/**
 * SupplierCampaignsBoardPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * -----------------------------------------------
 * Primary blueprint: OpportunitiesBoardPage.tsx (Creator)
 *
 * ✅ Supplier upgrades included:
 * - Invite-only flow correction: creators respond by ACCEPTING invite to collaborate (not by proposal).
 * - Kept the simulation control: “Mark Accepted” in Invites table.
 * - Invite acceptance updates acceptedCreators and can advance stage to Negotiation (when stage is Draft/Invite-only).
 */

const ROUTES = {
  myCampaigns: "/mldz/campaigns",
  newCampaign: "/mldz/promos/new",
  creatorDirectory: "/mldz/creators/directory",
  campaignsBoard: "/mldz/collab/campaigns",
  proposals: "/mldz/collab/proposals",
  negotiationRoom: "/mldz/collab/negotiation-room",
  contracts: "/mldz/collab/contracts",
  taskBoard: "/mldz/deliverables/task-board",
  assetLibrary: "/mldz/deliverables/asset-library",
  linksHub: "/mldz/deliverables/links-hub",
  liveStudio: "/mldz/live/studio"
};

const cx = (...xs) => xs.filter(Boolean).join(" ");
const buildRoute = (base, params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || String(v) === "") return;
    sp.set(k, String(v));
  });
  const query = sp.toString();
  return query ? `${base}?${query}` : base;
};

function safeNavTo(navigate, url) {
  if (!url) return;
  const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noreferrer");
    return;
  }
  navigate(target);
}

function safeNav(url) {
  if (!url) return;
  const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noreferrer");
    return;
  }
  if (typeof window !== "undefined") window.location.assign(target);
}

const money = (value, currency = "USD") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${currency} ${Math.round(value || 0).toLocaleString()}`;
  }
};

const clampNum = (v, min, max) => {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const formatRange = (min, max, currency = "USD") => {
  const a = Number(min || 0);
  const b = Number(max || 0);
  if (!a && !b) return "—";
  return `${money(a, currency)} – ${money(b, currency)}`;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function normalizeCampaignStage(status, collabMode, metadata) {
  const explicit = String(metadata?.stage || "").trim();
  if (explicit) return explicit;
  const normalizedStatus = String(status || "").trim().toUpperCase();
  if (normalizedStatus === "COMPLETED") return "Completed";
  if (normalizedStatus === "ACTIVE") return "Running";
  if (normalizedStatus === "DRAFT") return "Draft";
  if (String(collabMode || "").toLowerCase() === "open for collabs") return "Open for Collabs";
  if (String(collabMode || "").toLowerCase() === "invite-only") return "Invite-only";
  return "Draft";
}

function mapCampaignRecord(record, proposalRows, inviteRows) {
  const metadata = record?.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata : {};
  const campaignId = String(record?.id || "");
  const relatedProposals = proposalRows.filter((proposal) => String(proposal?.campaignId || "") === campaignId);
  const relatedInvites = inviteRows.filter((invite) => String(invite?.campaignId || "") === campaignId);
  const acceptedCreators = [
    ...relatedProposals
      .filter((proposal) => String(proposal?.status || "").toUpperCase() === "ACCEPTED")
      .map((proposal) => ({
        name: String(proposal?.creatorName || proposal?.creator || "Creator"),
        handle: String((proposal?.metadata && typeof proposal.metadata === "object" ? proposal.metadata.creatorHandle : "") || ""),
      })),
    ...relatedInvites
      .filter((invite) => String(invite?.status || "").toUpperCase() === "ACCEPTED")
      .map((invite) => ({
        name: String(invite?.sender || invite?.creatorName || "Creator"),
        handle: String((invite?.metadata && typeof invite.metadata === "object" ? invite.metadata.senderHandle : "") || ""),
      })),
  ];

  const collabMode = String(metadata?.collabMode || "Open for Collabs");
  const creatorUsageDecision = String(metadata?.creatorUsageDecision || "I will use a Creator");
  const approvalMode = String(metadata?.approvalMode || "Manual");
  const budget = toNumber(record?.budget);
  const budgetMin = toNumber(metadata?.budgetMin ?? metadata?.baseFeeMin ?? budget);
  const budgetMax = toNumber(metadata?.budgetMax ?? metadata?.baseFeeMax ?? budget);
  const commission = toNumber(metadata?.commission ?? metadata?.commissionPct);

  return {
    id: campaignId,
    code: String(metadata?.code || campaignId),
    name: String(record?.title || metadata?.name || "Campaign"),
    category: String(metadata?.category || "General"),
    categories: Array.isArray(metadata?.categories) ? metadata.categories.map((item) => String(item)) : [],
    region: String(metadata?.region || "Global"),
    language: String(metadata?.language || "English"),
    payBand: `${money(budgetMin, String(record?.currency || "USD"))} – ${money(budgetMax, String(record?.currency || "USD"))}`,
    budgetMin,
    budgetMax,
    commission,
    deliverables: Array.isArray(metadata?.deliverables)
      ? metadata.deliverables.map((item) => String(item))
      : Array.isArray(metadata?.deliverablesList)
        ? metadata.deliverablesList.map((item) => String(item))
        : [],
    liveWindow: String(metadata?.liveWindow || "To be scheduled"),
    timeline: Array.isArray(metadata?.timeline)
      ? metadata.timeline.map((item) => (typeof item === "string" ? item : String(item?.label || item?.title || "Timeline item")))
      : [],
    summary: String(record?.description || metadata?.summary || "Campaign summary"),
    tags: Array.isArray(metadata?.tags) ? metadata.tags.map((item) => String(item)) : [],
    creatorUsageDecision,
    collabMode,
    approvalMode,
    stage: normalizeCampaignStage(record?.status, collabMode, metadata),
    pitchesCount: relatedProposals.length,
    invitedCreators: relatedInvites.length,
    acceptedCreators,
    queue: {
      pendingSupplier: toNumber(metadata?.queue?.pendingSupplier),
      pendingAdmin: toNumber(metadata?.queue?.pendingAdmin),
      changes: toNumber(metadata?.queue?.changes),
    },
    kpis: {
      views: toNumber(metadata?.kpis?.views),
      ctr: toNumber(metadata?.kpis?.ctr),
      conv: toNumber(metadata?.kpis?.conv),
      sales: toNumber(metadata?.kpis?.sales),
    },
    pitches: Array.isArray(metadata?.pitches) ? metadata.pitches : [],
    invites: Array.isArray(metadata?.invites) ? metadata.invites : [],
  };
}

/* -------------------------- Toast (minimal) -------------------------- */

let __toastTimer = null;
function toast(message) {
  try {
    window.dispatchEvent(new CustomEvent("mldz-toast", { detail: message }));
  } catch {
    // ignore
  }
}

function ToastArea() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setMsg(e.detail);
      if (__toastTimer) window.clearTimeout(__toastTimer);
      __toastTimer = window.setTimeout(() => setMsg(null), 1900);
    };
    window.addEventListener("mldz-toast", handler);
    return () => window.removeEventListener("mldz-toast", handler);
  }, []);

  if (!msg) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
      <div className="px-4 py-2 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] shadow-lg border border-slate-800 dark:border-slate-200">
        {msg}
      </div>
    </div>
  );
}

/* ------------------------------ UI atoms ------------------------------ */



function PageHeader({ pageTitle, badge, right }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50">{pageTitle}</h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}

function FilterSection({ label, children }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Tooltip({ content, children }) {
  return (
    <span className="relative" title={content}>
      {children}
    </span>
  );
}

function DeliverableChip({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-100 font-medium transition-colors">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function stageColor(stage) {
  if (stage === "Draft") return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";
  if (stage === "Open for Collabs") return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700";
  if (stage === "Invite-only") return "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (stage === "Negotiation") return "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
  if (stage === "Contracted") return "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100";
  if (stage === "Content Submission") return "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  if (stage === "Supplier Review") return "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (stage === "Admin Review") return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";
  if (stage === "Scheduled") return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700";
  if (stage === "Running") return "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  if (stage === "Completed") return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";
}

function canSwitchCollabMode(stage) {
  // Allowed before content submission starts.
  return ["Draft", "Open for Collabs", "Invite-only", "Negotiation", "Contracted"].includes(stage);
}

function makeId(prefix = "ID") {
  return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

/* ----------------------------- Seed data ----------------------------- */

/* -------------------------- Row + KPI pills -------------------------- */

function KpiPill({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/40 px-2 py-1">
      <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100 truncate">{value}</div>
    </div>
  );
}

function QueuePill({ label, value, tone = "neutral" }) {
  const cls =
    tone === "warn"
      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
      : tone === "bad"
        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
        : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";
  return (
    <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="truncate">{label}: {value}</span>
    </span>
  );
}

function CampaignRow({ campaign, saved, selected, onToggleSave, onToggleSelect, onViewDetails, onPrimaryAction }) {
  const stageCls = stageColor(campaign.stage);

  const creatorUsagePill =
    campaign.creatorUsageDecision === "I will use a Creator"
      ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
      : campaign.creatorUsageDecision === "I will NOT use a Creator"
        ? "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300";

  const collabPill =
    campaign.collabMode === "Open for Collabs"
      ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
      : campaign.collabMode === "Invite-only"
        ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
        : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";

  const approvalPill =
    campaign.approvalMode === "Manual"
      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
      : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";

  const primaryLabel =
    campaign.creatorUsageDecision === "I will NOT use a Creator"
      ? "Supplier-hosted"
      : campaign.collabMode === "Open for Collabs"
        ? campaign.pitchesCount > 0
          ? `Review pitches (${campaign.pitchesCount})`
          : "Wait for pitches"
        : campaign.collabMode === "Invite-only"
          ? `Invite creators (${campaign.invitedCreators})`
          : "Manage";

  const primaryDisabled =
    campaign.creatorUsageDecision === "I will NOT use a Creator"
      ? true
      : campaign.collabMode === "Open for Collabs" && campaign.pitchesCount === 0
        ? true
        : false;

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800/50 transition-colors">
      <td className="py-3 px-3 align-top" style={{ width: "300px" }}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-slate-300 dark:border-slate-600 flex-shrink-0"
              checked={selected}
              onChange={onToggleSelect}
              aria-label="Select"
            />
            <Tooltip content={`${campaign.code} · ${campaign.category}`}>
              <h3 className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-100 cursor-help line-clamp-1">{campaign.name}</h3>
            </Tooltip>
          </div>
          <Tooltip content={campaign.summary}>
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 cursor-help">{campaign.summary}</p>
          </Tooltip>
          <div className="flex flex-wrap gap-1 mt-1">
            {campaign.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </td>

      <td className="py-3 px-3 align-top" style={{ width: "220px" }}>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{campaign.category}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{campaign.region} · {campaign.language}</div>
          </div>

          <div className="mt-1 flex flex-wrap gap-1">
            <span className={cx("px-2 py-0.5 rounded-full border text-[10px] font-extrabold", creatorUsagePill)}>
              🎭 {campaign.creatorUsageDecision === "I will use a Creator" ? "Using Creator" : campaign.creatorUsageDecision === "I will NOT use a Creator" ? "Supplier as Creator" : "Not sure"}
            </span>
            <span className={cx("px-2 py-0.5 rounded-full border text-[10px] font-extrabold", collabPill)}>
              🤝 {campaign.collabMode}
            </span>
            <span className={cx("px-2 py-0.5 rounded-full border text-[10px] font-extrabold", approvalPill)}>
              🧾 {campaign.approvalMode}
            </span>
          </div>

          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Live: <span className="font-medium">{campaign.liveWindow}</span>
          </div>
        </div>
      </td>

      <td className="py-3 px-3 align-top" style={{ width: "160px" }}>
        <div className="flex flex-col gap-1">
          <span className={cx("inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs w-fit", stageCls)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span>{campaign.stage}</span>
          </span>
          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
            <div>
              Accepted: <span className="font-extrabold">{campaign.acceptedCreators?.length || 0}</span>
            </div>
            <div>
              Pitches: <span className="font-extrabold">{campaign.pitchesCount}</span>
            </div>
            <div>
              Invited: <span className="font-extrabold">{campaign.invitedCreators}</span>
            </div>
          </div>
        </div>
      </td>

      <td className="py-3 px-3 align-top" style={{ width: "320px" }}>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-100">{campaign.payBand}</div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Budget: <span className="font-medium">{formatRange(campaign.budgetMin, campaign.budgetMax, "USD")}</span> · Comm: <span className="font-medium">{campaign.commission}%</span>
          </div>

          <div className="mt-1 flex flex-wrap gap-1">
            {campaign.deliverables.includes("Live") ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs">🔴 Live</span> : null}
            {campaign.deliverables.includes("VOD") ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs">🎬 VOD</span> : null}
            {campaign.deliverables.includes("Posts") ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">📝 Posts</span> : null}
          </div>

          <div className="mt-1 grid grid-cols-4 gap-1.5">
            <KpiPill label="Views" value={campaign.kpis?.views ? `${Math.round(campaign.kpis.views / 1000)}k` : "—"} />
            <KpiPill label="CTR" value={campaign.kpis?.ctr ? `${campaign.kpis.ctr.toFixed(1)}%` : "—"} />
            <KpiPill label="Conv" value={campaign.kpis?.conv ? `${campaign.kpis.conv.toFixed(1)}%` : "—"} />
            <KpiPill label="Sales" value={campaign.kpis?.sales ? money(campaign.kpis.sales, "USD") : "—"} />
          </div>

          <div className="mt-1 flex flex-wrap gap-1">
            <QueuePill tone={campaign.queue?.pendingSupplier ? "warn" : "neutral"} label="Pending Supplier" value={campaign.queue?.pendingSupplier || 0} />
            <QueuePill tone={campaign.queue?.pendingAdmin ? "warn" : "neutral"} label="Pending Admin" value={campaign.queue?.pendingAdmin || 0} />
            <QueuePill tone={campaign.queue?.changes ? "bad" : "neutral"} label="Changes" value={campaign.queue?.changes || 0} />
          </div>
        </div>
      </td>

      <td className="py-3 px-3 align-top" style={{ width: "200px" }}>
        <div className="flex flex-col items-end gap-1.5">
          <button className="text-lg" onClick={onToggleSave} aria-label="Save campaign" type="button">
            {saved ? "★" : "☆"}
          </button>

          <div className="flex flex-col gap-1 w-full">
            <button
              type="button"
              className={cx(
                "w-full px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm",
                primaryDisabled
                  ? "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-800 cursor-not-allowed"
                  : "bg-[#f77f00] text-white hover:bg-[#e26f00] hover:-translate-y-0.5"
              )}
              onClick={!primaryDisabled ? onPrimaryAction : undefined}
              disabled={primaryDisabled}
              title={campaign.creatorUsageDecision === "I will NOT use a Creator" ? "Supplier is acting as Creator for this campaign" : undefined}
            >
              {primaryLabel}
            </button>

            <div className="flex gap-1 w-full">
              <button
                type="button"
                className="flex-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium transition-colors"
                onClick={onViewDetails}
              >
                View
              </button>
              <button
                type="button"
                className="flex-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium transition-colors"
                onClick={() => safeNav(buildRoute(ROUTES.taskBoard, { campaignId: campaign.code, from: "campaigns-board" }))}
              >
                Deliver
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* -------------------------- Detail Slide-Over -------------------------- */

function CampaignDetailSlideOver({ campaign, onClose, onUpdateCampaign }) {
  const [tab, setTab] = useState("overview");
  const [aiSuggestion, setAiSuggestion] = useState("");

  const [inviteHandle, setInviteHandle] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  // Settings
  const [creatorUsageDecision, setCreatorUsageDecision] = useState(campaign.creatorUsageDecision);
  const [collabMode, setCollabMode] = useState(campaign.collabMode);
  const [approvalMode, setApprovalMode] = useState(campaign.approvalMode);

  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);
  const [switchIntent, setSwitchIntent] = useState(null);

  useEffect(() => {
    setTab("overview");
    setAiSuggestion("");
    setInviteHandle("");
    setInviteMessage("");
    setCreatorUsageDecision(campaign.creatorUsageDecision);
    setCollabMode(campaign.collabMode);
    setApprovalMode(campaign.approvalMode);
  }, [campaign.id]);

  const canSwitch = canSwitchCollabMode(campaign.stage);

  const acceptedCreatorsLabel = (campaign.acceptedCreators || []).length
    ? campaign.acceptedCreators.map((c) => c.handle || c.name).join(", ")
    : "None";

  const queueRisk = (campaign.queue?.pendingSupplier || 0) + (campaign.queue?.changes || 0) >= 4;

  const handleAskAi = () => {
    const base =
      tab === "pitches"
        ? "Write a short counter message that improves terms while keeping the creator motivated. Use a friendly but firm tone."
        : tab === "invites"
          ? `Write an invite message that includes deliverables, approval mode (${approvalMode}), and timeline.`
          : `Summarise next best actions to move this campaign from ${campaign.stage} to execution.`;

    setAiSuggestion(`AI Suggestion: ${base}

Campaign: ${campaign.name} (${campaign.category})
Mode: ${creatorUsageDecision} · ${collabMode} · ${approvalMode}`);
  };

  const confirmSwitch = (field, value) => {
    setSwitchIntent({ field, value });
    setShowConfirmSwitch(true);
  };

  const applySwitch = () => {
    if (!switchIntent) return;

    const { field, value } = switchIntent;

    if (field === "creatorUsageDecision") {
      setCreatorUsageDecision(value);
      if (value === "I will NOT use a Creator") setCollabMode("n/a");
    }

    if (field === "collabMode") setCollabMode(value);
    if (field === "approvalMode") setApprovalMode(value);

    onUpdateCampaign({
      ...campaign,
      creatorUsageDecision: field === "creatorUsageDecision" ? value : creatorUsageDecision,
      collabMode: field === "collabMode" ? value : collabMode,
      approvalMode: field === "approvalMode" ? value : approvalMode
    });

    setShowConfirmSwitch(false);
    setSwitchIntent(null);
    toast("Campaign setting updated");
  };

  const updatePitchStatus = (pitchId, status) => {
    const next = {
      ...campaign,
      pitches: (campaign.pitches || []).map((p) => (p.id === pitchId ? { ...p, status } : p))
    };
    onUpdateCampaign(next);
    toast(`Pitch ${String(status || "").toLowerCase()}`);
  };

  const updateInviteStatus = (inviteId, status) => {
    const inv = (campaign.invites || []).find((x) => x.id === inviteId);
    const nextInvites = (campaign.invites || []).map((x) => (x.id === inviteId ? { ...x, status } : x));

    const key = (h) => String(h || "").toLowerCase();
    let nextAccepted = [...(campaign.acceptedCreators || [])];

    if (inv) {
      if (status === "Accepted") {
        const exists = nextAccepted.some((c) => key(c.handle) === key(inv.handle));
        if (!exists) nextAccepted.push({ name: inv.creator, handle: inv.handle });
      } else {
        // simulation: if moving away from Accepted, remove
        nextAccepted = nextAccepted.filter((c) => key(c.handle) !== key(inv.handle));
      }
    }

    const nextStage = status === "Accepted" && ["Invite-only", "Draft"].includes(campaign.stage) ? "Negotiation" : campaign.stage;

    onUpdateCampaign({
      ...campaign,
      invites: nextInvites,
      invitedCreators: Math.max(campaign.invitedCreators || 0, nextInvites.length),
      acceptedCreators: nextAccepted,
      stage: nextStage
    });

    toast(`Invite ${String(status || "").toLowerCase()}`);
  };

  const sendInvite = () => {
    if (!inviteHandle.trim()) return;

    const handle = inviteHandle.trim();
    const safeHandle = handle.startsWith("@") ? handle : `@${handle}`;

    const next = {
      ...campaign,
      invites: [
        ...(campaign.invites || []),
        { id: makeId("I"), creator: safeHandle.replace(/^@/, ""), handle: safeHandle, status: "Pending" }
      ],
      invitedCreators: (campaign.invitedCreators || 0) + 1
    };

    onUpdateCampaign(next);
    setInviteHandle("");
    setInviteMessage("");
    toast("Invite sent");
  };

  const isSupplierAsCreator = creatorUsageDecision === "I will NOT use a Creator";

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "pitches", label: `Pitches (${campaign.pitches?.length || 0})` },
    { id: "invites", label: `Invites (${campaign.invites?.length || 0})` },
    { id: "settings", label: "Settings" }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="w-full md:max-w-[520px] h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-transform duration-300 animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700">
          <div className="min-w-0">
            <div className="text-[11px] uppercase font-black tracking-widest text-slate-400">{campaign.code}</div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{campaign.name}</span>
              <span className={cx("px-2 py-0.5 rounded-full border text-[10px] font-extrabold", stageColor(campaign.stage))}>{campaign.stage}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-300 truncate">{campaign.category} · {campaign.region} · {campaign.language}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-full bg-[#f77f00] hover:bg-[#e26f00] text-white text-xs font-extrabold"
              type="button"
              onClick={handleAskAi}
            >
              Ask AI
            </button>
            <button
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              onClick={onClose}
              type="button"
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/30">
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={cx(
                    "px-3 py-1 rounded-full text-[11px] font-extrabold border transition-colors",
                    active
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {aiSuggestion ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/40 p-3">
              <div className="text-[11px] font-extrabold">AI Suggestion</div>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-700 dark:text-slate-200">{aiSuggestion}</pre>
            </div>
          ) : null}

          {/* Overview tab */}
          {tab === "overview" ? (
            <>
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold">Supplier campaign snapshot</div>
                    <div className="text-[11px] text-slate-500">Mode, approvals, and queue overview.</div>
                  </div>
                  <span className="text-[10px] text-slate-500">Approval mode: <span className="font-extrabold">{approvalMode}</span></span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  <div className={cx(
                    "rounded-2xl border p-3",
                    queueRisk
                      ? "border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-900/10"
                      : "border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/40"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-extrabold">Approvals & queue</div>
                      <span className="text-[10px] text-slate-500">Approval mode: <span className="font-extrabold">{approvalMode}</span></span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <QueuePill label="Pending Supplier" value={campaign.queue?.pendingSupplier || 0} tone={campaign.queue?.pendingSupplier ? "warn" : "neutral"} />
                      <QueuePill label="Pending Admin" value={campaign.queue?.pendingAdmin || 0} tone={campaign.queue?.pendingAdmin ? "warn" : "neutral"} />
                      <QueuePill label="Changes" value={campaign.queue?.changes || 0} tone={campaign.queue?.changes ? "bad" : "neutral"} />
                    </div>
                    <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                      Tip: Manual approval gives you control but can delay scheduling. Aim to review within <span className="font-extrabold">6 hours</span> for scheduled lives.
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-extrabold"
                        onClick={() => safeNav(buildRoute(ROUTES.assetLibrary, { campaignId: campaign.code, from: "campaigns-board" }))}
                      >
                        Open Asset Library
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-extrabold"
                        onClick={() => safeNav(buildRoute(ROUTES.linksHub, { campaignId: campaign.code, from: "campaigns-board" }))}
                      >
                        Open Links Hub
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-extrabold"
                        onClick={() => safeNav(buildRoute(ROUTES.taskBoard, { campaignId: campaign.code, from: "campaigns-board" }))}
                      >
                        Open Task Board
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-extrabold">Collaboration snapshot</div>
                      <span className="text-[10px] text-slate-500">
                        Accepted creators: <span className="font-extrabold">{campaign.acceptedCreators?.length || 0}</span>
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        Accepted: <span className="font-extrabold">{acceptedCreatorsLabel}</span>
                      </div>
                      <div>
                        Pitches: <span className="font-extrabold">{campaign.pitchesCount}</span> · Invites:{" "}
                        <span className="font-extrabold">{campaign.invitedCreators}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Edge cases supported: creator rejects, supplier/admin rejects content, renegotiation, multiple creators per campaign, collab mode switching (pre-submission).
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold mb-1">Expected deliverables</h3>
                <div className="flex flex-wrap gap-1">
                  {campaign.deliverables.includes("Live") ? <DeliverableChip icon="🔴" label="1–2 Live sessions" /> : null}
                  {campaign.deliverables.includes("VOD") ? <DeliverableChip icon="🎬" label="Replay / VOD" /> : null}
                  {campaign.deliverables.includes("Posts") ? <DeliverableChip icon="📝" label="Social posts" /> : null}
                </div>
              </section>
            </>
          ) : null}

          {/* Pitches tab (unchanged from original blueprint) */}
          {tab === "pitches" ? (
            <>
              {isSupplierAsCreator ? (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300">
                  Supplier is acting as Creator for this campaign. Pitches are not applicable.
                </div>
              ) : campaign.collabMode !== "Open for Collabs" ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/40 p-3 text-[11px] text-slate-600 dark:text-slate-300">
                  This campaign is not open for public collabs. Use the Invites tab to manage invite-only creators.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold">Pitches</div>
                      <div className="text-[11px] text-slate-500">Review pitches, counter, accept, or reject.</div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-full bg-[#f77f00] hover:bg-[#e26f00] text-white text-[11px] font-extrabold"
                      onClick={() => safeNav(buildRoute(ROUTES.negotiationRoom, { campaignId: campaign.code, from: "campaigns-board", tab: "pitches" }))}
                    >
                      Negotiation Room
                    </button>
                  </div>

                  {(campaign.pitches || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-6 text-center">
                      <div className="text-3xl">🧾</div>
                      <div className="mt-2 text-sm font-extrabold">No pitches yet</div>
                      <div className="mt-1 text-xs text-slate-500">This campaign will appear on the Creator Opportunities Board until you close collabs.</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {campaign.pitches.map((p) => (
                        <div key={p.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                                {p.creator} <span className="text-xs text-slate-500">{p.handle}</span>
                              </div>
                              <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{p.message}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proposed</div>
                              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                                {money(p.fee, p.currency)} <span className="text-xs text-slate-500">+ {p.commissionPct}%</span>
                              </div>
                              <span
                                className={cx(
                                  "mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold",
                                  p.status === "New"
                                    ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                                    : p.status === "Countered"
                                      ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                                      : String(p.status).toLowerCase().includes("reject")
                                        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                                        : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                                )}
                              >
                                ● {p.status}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-full bg-[#f77f00] hover:bg-[#e26f00] text-white text-[11px] font-extrabold"
                              onClick={() => updatePitchStatus(p.id, "Accepted")}
                              disabled={p.status === "Accepted"}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-extrabold"
                              onClick={() => updatePitchStatus(p.id, "Countered")}
                            >
                              Counter
                            </button>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-[11px] font-extrabold text-rose-700 dark:text-rose-300"
                              onClick={() => updatePitchStatus(p.id, "Rejected")}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="ml-auto px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-extrabold"
                              onClick={() => safeNav(buildRoute(ROUTES.proposals, { campaignId: campaign.code, creator: p.handle, from: "campaigns-board" }))}
                            >
                              Create Proposal
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}

          {/* Invites tab (UPDATED) */}
          {tab === "invites" ? (
            <>
              {campaign.creatorUsageDecision === "I will NOT use a Creator" ? (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300">
                  Supplier is acting as Creator. Invites are not applicable.
                </div>
              ) : campaign.collabMode !== "Invite-only" ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/40 p-3 text-[11px] text-slate-600 dark:text-slate-300">
                  This campaign is open for collabs. You can still switch to Invite-only in Settings (before submission), then invite specific creators.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold">Invite-only creators</div>
                      <div className="text-[11px] text-slate-500">Send invites, track status, and follow up.</div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-extrabold"
                      onClick={() => safeNav(buildRoute(ROUTES.creatorDirectory, { campaignId: campaign.code, from: "campaigns-board" }))}
                    >
                      Open Creator Directory
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                    <div className="text-[11px] font-extrabold">Send invite</div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <input
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 outline-none focus:border-[#f77f00]"
                        placeholder="Creator handle (e.g. @amina.dealz)"
                        value={inviteHandle}
                        onChange={(e) => setInviteHandle(e.target.value)}
                      />
                      <textarea
                        rows={4}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 outline-none focus:border-slate-400"
                        placeholder="Message (optional)"
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                      />
                      <button
                        type="button"
                        className={cx(
                          "w-full py-2.5 rounded-full text-white text-sm font-extrabold",
                          inviteHandle.trim() ? "bg-[#f77f00] hover:bg-[#e26f00]" : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                        )}
                        onClick={sendInvite}
                        disabled={!inviteHandle.trim()}
                      >
                        Send invite
                      </button>
                      <div className="text-[10px] text-slate-500">
                        Creators respond by accepting the invite to collaborate. After acceptance: Negotiation → Contract → Content Submission → Approvals. Permission note: Supplier Owner/Admin only.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                    <div className="text-[11px] font-extrabold">Invites</div>
                    {(campaign.invites || []).length === 0 ? (
                      <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">No invites yet.</div>
                    ) : (
                      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-[11px]">
                          <thead className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/60">
                            <tr className="text-left">
                              <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Creator</th>
                              <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Status</th>
                              <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campaign.invites.map((inv) => (
                              <tr key={inv.id} className="border-t border-slate-200 dark:border-slate-800">
                                <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                                  <div className="font-extrabold">{inv.creator}</div>
                                  <div className="text-[10px] text-slate-500">{inv.handle}</div>
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={cx(
                                      "px-2 py-0.5 rounded-full border text-[10px] font-extrabold",
                                      inv.status === "Accepted"
                                        ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                                        : inv.status === "Declined"
                                          ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                                          : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                                    )}
                                  >
                                    ● {inv.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      className="px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-extrabold"
                                      onClick={() => safeNav(buildRoute(ROUTES.negotiationRoom, { campaignId: campaign.code, creator: inv.handle, mode: "message", from: "campaigns-board" }))}
                                    >
                                      Message
                                    </button>

                                    {inv.status === "Pending" ? (
                                      <>
                                        <button
                                          type="button"
                                          className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold"
                                          onClick={() => toast(`Invite resent to ${inv.handle}`)}
                                        >
                                          Resend
                                        </button>
                                        <button
                                          type="button"
                                          className="px-2.5 py-1 rounded-full bg-[#f77f00] hover:bg-[#e26f00] text-white text-[10px] font-extrabold"
                                          onClick={() => updateInviteStatus(inv.id, "Accepted")}
                                          title="Simulation: mark as accepted by creator"
                                        >
                                          Mark Accepted
                                        </button>
                                        <button
                                          type="button"
                                          className="px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-[10px] font-extrabold text-rose-700 dark:text-rose-300"
                                          onClick={() => updateInviteStatus(inv.id, "Declined")}
                                          title="Simulation: mark as declined by creator"
                                        >
                                          Mark Declined
                                        </button>
                                      </>
                                    ) : inv.status === "Accepted" ? (
                                      <>
                                        <button
                                          type="button"
                                          className="px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-extrabold"
                                          onClick={() => safeNav(buildRoute(ROUTES.negotiationRoom, { campaignId: campaign.code, creator: inv.handle, from: "campaigns-board" }))}
                                        >
                                          Negotiation
                                        </button>
                                        <button
                                          type="button"
                                          className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold"
                                          onClick={() => safeNav(buildRoute(ROUTES.contracts, { campaignId: campaign.code, creator: inv.handle, from: "campaigns-board" }))}
                                        >
                                          Draft Contract
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold"
                                        onClick={() => updateInviteStatus(inv.id, "Pending")}
                                      >
                                        Re-invite
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : null}

          {/* Settings tab (unchanged simplified) */}
          {tab === "settings" ? (
            <>
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-sm font-extrabold">Campaign-level settings</div>
                <div className="mt-1 text-[11px] text-slate-500">Only Supplier Owner/Admin should change these settings (RBAC + audit log in production).</div>

                <div className="mt-3 space-y-4">
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">Creator usage decision</div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      {["I will use a Creator", "I will NOT use a Creator", "I am NOT SURE yet"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={cx(
                            "px-3 py-2 rounded-2xl border text-[12px] font-extrabold text-left",
                            creatorUsageDecision === opt
                              ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/10 text-[#f77f00]"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
                          )}
                          onClick={() => {
                            if (opt === creatorUsageDecision) return;
                            confirmSwitch("creatorUsageDecision", opt);
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {creatorUsageDecision === "I will NOT use a Creator" ? (
                      <div className="mt-2 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300">
                        Supplier becomes the Creator. Collaboration logic is skipped and the campaign starts at Content Submission.
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">Collaboration mode</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["Open for Collabs", "Invite-only"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={cx(
                            "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                            collabMode === m
                              ? "bg-[#f77f00] border-[#f77f00] text-white"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
                          )}
                          onClick={() => {
                            if (m === collabMode) return;
                            if (!canSwitch) {
                              toast("Collab mode is locked after submission starts");
                              return;
                            }
                            confirmSwitch("collabMode", m);
                          }}
                          disabled={creatorUsageDecision === "I will NOT use a Creator"}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Default is Open for Collabs. Invite-only keeps campaign private. Switching is allowed <span className="font-extrabold">before submission</span>.
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">Content approval</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["Manual", "Auto"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={cx(
                            "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                            approvalMode === m
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
                          )}
                          onClick={() => {
                            if (m === approvalMode) return;
                            confirmSwitch("approvalMode", m);
                          }}
                        >
                          {m} approval
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">Manual: Supplier approves before Admin review. Auto: content goes directly to Admin.</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/40 p-3">
                    <div className="text-[11px] font-extrabold">Switching guardrails</div>
                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      Collab mode switching is only allowed before content submission. Current stage: <span className="font-extrabold">{campaign.stage}</span>.
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/30">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-full bg-[#f77f00] text-white text-xs font-extrabold hover:bg-[#e26f00]"
              onClick={() => safeNav(ROUTES.myCampaigns)}
            >
              Open My Campaigns
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-700 dark:text-slate-200"
              onClick={() => safeNav(buildRoute(ROUTES.proposals, { campaignId: campaign.code, from: "campaigns-board" }))}
            >
              Proposals
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-700 dark:text-slate-200"
              onClick={() => safeNav(buildRoute(ROUTES.contracts, { campaignId: campaign.code, from: "campaigns-board" }))}
            >
              Contracts
            </button>
            <span className="ml-auto text-[10px] text-slate-500">
              Selected creator(s): <span className="font-extrabold">{acceptedCreatorsLabel}</span>
            </span>
          </div>
        </div>

        {/* Confirm modal */}
        {showConfirmSwitch ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmSwitch(false)}>
            <div
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-sm font-extrabold">Confirm change</div>
                <button
                  className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                  onClick={() => setShowConfirmSwitch(false)}
                  type="button"
                >
                  ✕
                </button>
              </div>
              <div className="px-4 py-4">
                <div className="text-[12px] text-slate-600 dark:text-slate-300">
                  You are about to change <span className="font-extrabold">{switchIntent?.field}</span> to {" "}
                  <span className="font-extrabold">{switchIntent?.value}</span>.
                  {switchIntent?.field === "collabMode" && !canSwitch ? (
                    <div className="mt-2 text-rose-600">This campaign stage locks collab mode changes.</div>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-[11px] font-extrabold"
                    onClick={() => setShowConfirmSwitch(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={cx("px-4 py-2 rounded-full text-[11px] font-extrabold text-white", "bg-slate-900 hover:bg-black")}
                    onClick={() => {
                      if (switchIntent?.field === "collabMode" && !canSwitch) {
                        toast("Collab mode change not allowed at this stage");
                        setShowConfirmSwitch(false);
                        return;
                      }
                      applySwitch();
                    }}
                    type="button"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------- Batch Actions Panel ------------------------- */

function BatchActionPanel({ campaigns, onClose, onApply }) {
  const [action, setAction] = useState("remind");
  const [message, setMessage] = useState(
    "Hi, quick reminder: please confirm your availability and submit your latest assets for review. Thank you."
  );
  const [approvalMode, setApprovalMode] = useState("Manual");
  const [collabMode, setCollabMode] = useState("Open for Collabs");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const actionableCount = campaigns.length;

  const run = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1100));
    setIsSubmitting(false);
    setIsSuccess(true);
    onApply({ action, message, approvalMode, collabMode });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <span className="font-bold text-sm uppercase tracking-widest text-slate-400">Batch actions</span>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
            onClick={onClose}
            aria-label="Close drawer"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
          {isSuccess ? (
            <div className="absolute inset-0 z-10 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Applied!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Batch action applied to {actionableCount} campaign(s).</p>
            </div>
          ) : null}

          <p className="text-sm text-slate-600 dark:text-slate-200 font-medium">
            You’re about to apply an action to <span className="font-semibold">{actionableCount}</span> campaign(s).
          </p>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/40 p-3">
            <div className="text-[11px] font-extrabold">Selected campaigns</div>
            <ul className="mt-2 space-y-1">
              {campaigns.map((c) => (
                <li key={c.code} className="border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{c.name}</span>
                    <span className="text-xs text-slate-500">{c.stage}</span>
                  </div>
                  <div className="text-xs text-slate-500">{c.code} · {c.collabMode} · {c.approvalMode}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] font-extrabold">Action</div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {[
                { id: "remind", label: "Send reminder to creators" },
                { id: "approval", label: "Set approval mode" },
                { id: "collab", label: "Switch collab mode (pre-submission only)" },
                { id: "close", label: "Close collabs" }
              ].map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={cx(
                    "px-3 py-2 rounded-2xl border text-[12px] font-extrabold text-left",
                    action === a.id
                      ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/10 text-[#f77f00]"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  )}
                  onClick={() => setAction(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {action === "remind" ? (
              <div className="mt-3">
                <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Message</div>
                <textarea
                  rows={5}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 outline-none focus:border-slate-400"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            ) : null}

            {action === "approval" ? (
              <div className="mt-3">
                <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Approval mode</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Manual",
                    "Auto"
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={cx(
                        "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                        approvalMode === m
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      )}
                      onClick={() => setApprovalMode(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Manual: supplier review before admin. Auto: goes straight to admin.</div>
              </div>
            ) : null}

            {action === "collab" ? (
              <div className="mt-3">
                <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Collab mode</div>
                <div className="flex flex-wrap gap-2">
                  {["Open for Collabs", "Invite-only"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={cx(
                        "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                        collabMode === m
                          ? "bg-[#f77f00] border-[#f77f00] text-white"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      )}
                      onClick={() => setCollabMode(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Only applies to campaigns that are still pre-submission.</div>
              </div>
            ) : null}

            {action === "close" ? (
              <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300">
                Closing collabs stops new pitches and locks the creator selection surface.
              </div>
            ) : null}

            <div className="mt-3 text-[10px] text-slate-500">Permission note: Batch actions are restricted to Supplier Owner/Admin roles.</div>
          </div>

          <button
            className={cx(
              "mt-2 w-full py-2 rounded-full text-white text-sm font-extrabold transition-all",
              isSubmitting ? "bg-slate-300 dark:bg-slate-700 cursor-wait" : "bg-[#f77f00] hover:bg-[#e26f00]"
            )}
            onClick={run}
            disabled={isSubmitting || isSuccess}
            type="button"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                Applying...
              </span>
            ) : (
              "Apply"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Main Page ------------------------------ */

export default function SupplierCampaignsBoardPage() {
  const navigate = useNavigate();
  const safeNav = (url) => safeNavTo(navigate, url);
  const [filters, setFilters] = useState({
    category: "All",
    minBudget: "",
    maxBudget: "",
    commission: "Any",
    region: "All",
    language: "Any",
    stage: "Any",
    collabMode: "Any",
    creatorUsageDecision: "Any",
    approvalMode: "Any",
    minPitches: ""
  });

  const [campaigns, setCampaigns] = useState([]);
  const [dataState, setDataState] = useState("loading");

  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [savedCampaignIds, setSavedCampaignIds] = useState([]);
  const [batchSelection, setBatchSelection] = useState([]);
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  async function loadCampaignsBoard() {
    const [campaignRows, proposalRows, inviteRows] = await Promise.all([
      sellerBackendApi.getCampaigns(),
      sellerBackendApi.getCollaborationProposals(),
      sellerBackendApi.getInvites(),
    ]);
    const campaignsList = Array.isArray(campaignRows) ? campaignRows : [];
    const proposalsList = Array.isArray(proposalRows) ? proposalRows : [];
    const invitesList = Array.isArray(inviteRows) ? inviteRows : [];
    const mapped = campaignsList.map((campaign) => mapCampaignRecord(campaign, proposalsList, invitesList));
    setCampaigns(mapped);
    setSelectedCampaign((prev) => {
      if (!prev) return mapped[0] || null;
      return mapped.find((entry) => entry.id === prev.id) || mapped[0] || null;
    });
  }

  useEffect(() => {
    let mounted = true;
    setDataState("loading");
    loadCampaignsBoard()
      .then(() => {
        if (!mounted) return;
        setDataState("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setCampaigns([]);
        setSelectedCampaign(null);
        setDataState("error");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (filters.category !== "All" && c.category !== filters.category) return false;
      if (filters.region !== "All" && c.region !== filters.region) return false;
      if (filters.language !== "Any" && c.language !== filters.language) return false;

      if (filters.stage !== "Any" && c.stage !== filters.stage) return false;
      if (filters.collabMode !== "Any" && c.collabMode !== filters.collabMode) return false;
      if (filters.creatorUsageDecision !== "Any" && c.creatorUsageDecision !== filters.creatorUsageDecision) return false;
      if (filters.approvalMode !== "Any" && c.approvalMode !== filters.approvalMode) return false;

      if (filters.minBudget) {
        const min = Number(filters.minBudget) || 0;
        if (c.budgetMax < min) return false;
      }
      if (filters.maxBudget) {
        const max = Number(filters.maxBudget) || 0;
        if (c.budgetMin > max) return false;
      }

      if (filters.commission !== "Any") {
        if (filters.commission === "0-5" && c.commission > 5) return false;
        if (filters.commission === "5-10" && (c.commission <= 5 || c.commission > 10)) return false;
        if (filters.commission === "10+" && c.commission <= 10) return false;
      }

      if (filters.minPitches) {
        const min = Number(filters.minPitches) || 0;
        if ((c.pitchesCount || 0) < min) return false;
      }

      return true;
    });
  }, [campaigns, filters]);

  const toggleSaved = (id) => {
    setSavedCampaignIds((prev) => {
      const isSaved = prev.includes(id);
      if (isSaved) {
        toast("Removed from saved campaigns");
        return prev.filter((x) => x !== id);
      }
      toast("Campaign saved");
      return [...prev, id];
    });
  };

  const toggleBatchSelection = (id) => {
    setBatchSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openDetails = (campaign) => {
    setSelectedCampaign(campaign);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedCampaign(null);
  };

  const updateCampaign = (nextCampaign) => {
    setCampaigns((prev) => prev.map((c) => (c.id === nextCampaign.id ? nextCampaign : c)));
    setSelectedCampaign(nextCampaign);
    sellerBackendApi.patchCampaign(String(nextCampaign.id), {
      title: nextCampaign.name,
      description: nextCampaign.summary,
      metadata: {
        category: nextCampaign.category,
        categories: nextCampaign.categories,
        region: nextCampaign.region,
        language: nextCampaign.language,
        budgetMin: nextCampaign.budgetMin,
        budgetMax: nextCampaign.budgetMax,
        commission: nextCampaign.commission,
        deliverables: nextCampaign.deliverables,
        liveWindow: nextCampaign.liveWindow,
        timeline: nextCampaign.timeline,
        tags: nextCampaign.tags,
        creatorUsageDecision: nextCampaign.creatorUsageDecision,
        collabMode: nextCampaign.collabMode,
        approvalMode: nextCampaign.approvalMode,
        stage: nextCampaign.stage,
        queue: nextCampaign.queue,
        kpis: nextCampaign.kpis,
        pitches: nextCampaign.pitches,
        invites: nextCampaign.invites,
      },
    }).catch(() => {
      toast("Campaign update failed to sync.");
    });
  };

  const handlePrimaryAction = (campaign) => {
    if (campaign.creatorUsageDecision === "I will NOT use a Creator") {
      safeNav(buildRoute(ROUTES.liveStudio, { campaignId: campaign.code, from: "campaigns-board" }));
      return;
    }

    if (campaign.collabMode === "Open for Collabs") {
      if ((campaign.pitchesCount || 0) === 0) {
        toast("No pitches yet");
        return;
      }
      openDetails(campaign);
      setTimeout(() => {
        toast("Tip: Use the Pitches tab to review and accept");
      }, 50);
      return;
    }

    if (campaign.collabMode === "Invite-only") {
      openDetails(campaign);
      toast("Tip: Use the Invites tab to add creators");
      return;
    }

    openDetails(campaign);
  };

  const batchCampaigns = campaigns.filter((c) => batchSelection.includes(c.id));

  const badge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span>Supplier collab pipeline</span>
    </span>
  );

  const topRight = (
    <>
      <button
        type="button"
        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
        onClick={() => safeNav(ROUTES.myCampaigns)}
      >
        My Campaigns
      </button>
      <button
        type="button"
        className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-extrabold hover:bg-[#e26f00]"
        onClick={() => safeNav(buildRoute(ROUTES.newCampaign, { create: 1, from: "campaigns-board" }))}
      >
        New Campaign
      </button>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors">
      <ToastArea />
      <PageHeader pageTitle="Campaigns Board" badge={badge} right={topRight} />

      <main className="flex-1 flex overflow-hidden">
        {/* Left filter column */}
        <aside className="hidden xl:block w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 text-sm transition-colors">
          <h2 className="text-xs font-semibold dark:font-bold mb-2">Filters</h2>

          <FilterSection label="Category / Line">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="All">All categories</option>
              <option value="Beauty & Skincare">Beauty & Skincare</option>
              <option value="Tech & Gadgets">Tech & Gadgets</option>
              <option value="Services / Consultations">Services / Consultations</option>
              <option value="Fashion">Fashion</option>
              <option value="EV & Mobility">EV & Mobility</option>
            </select>
          </FilterSection>

          <FilterSection label="Creator usage decision">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
              value={filters.creatorUsageDecision}
              onChange={(e) => setFilters({ ...filters, creatorUsageDecision: e.target.value })}
            >
              <option value="Any">Any</option>
              <option value="I will use a Creator">Use a Creator</option>
              <option value="I will NOT use a Creator">Supplier as Creator</option>
              <option value="I am NOT SURE yet">Not sure</option>
            </select>
          </FilterSection>

          <FilterSection label="Collaboration mode">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
              value={filters.collabMode}
              onChange={(e) => setFilters({ ...filters, collabMode: e.target.value })}
            >
              <option value="Any">Any</option>
              <option value="Open for Collabs">Open for Collabs</option>
              <option value="Invite-only">Invite-only</option>
              <option value="n/a">n/a</option>
            </select>
          </FilterSection>

          <FilterSection label="Stage">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
              value={filters.stage}
              onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
            >
              <option value="Any">Any</option>
              {[
                "Draft",
                "Open for Collabs",
                "Invite-only",
                "Negotiation",
                "Contracted",
                "Content Submission",
                "Supplier Review",
                "Admin Review",
                "Scheduled",
                "Running",
                "Completed"
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FilterSection>

          <FilterSection label="Approval mode">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
              value={filters.approvalMode}
              onChange={(e) => setFilters({ ...filters, approvalMode: e.target.value })}
            >
              <option value="Any">Any</option>
              <option value="Manual">Manual</option>
              <option value="Auto">Auto</option>
            </select>
          </FilterSection>

          <FilterSection label="Budget range (USD)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                className="w-1/2 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                value={filters.minBudget}
                onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
              />
              <input
                type="number"
                placeholder="Max"
                className="w-1/2 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                value={filters.maxBudget}
                onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
              />
            </div>
          </FilterSection>

          <FilterSection label="Commission %">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
              value={filters.commission}
              onChange={(e) => setFilters({ ...filters, commission: e.target.value })}
            >
              <option value="Any">Any</option>
              <option value="0-5">0–5%</option>
              <option value="5-10">5–10%</option>
              <option value="10+">10%+</option>
            </select>
          </FilterSection>

          <FilterSection label="Region">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
            >
              <option value="All">All regions</option>
              <option value="Africa">Africa</option>
              <option value="Africa / Asia">Africa / Asia</option>
              <option value="Global">Global</option>
            </select>
          </FilterSection>

          <FilterSection label="Language">
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            >
              <option value="Any">Any</option>
              <option value="English">English</option>
              <option value="French">French</option>
              <option value="Arabic">Arabic</option>
            </select>
          </FilterSection>

          <FilterSection label="Minimum pitches">
            <input
              type="number"
              placeholder="0"
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
              value={filters.minPitches}
              onChange={(e) => setFilters({ ...filters, minPitches: e.target.value })}
            />
          </FilterSection>

          <button
            type="button"
            className="mt-2 w-full px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
            onClick={() => {
              setFilters({
                category: "All",
                minBudget: "",
                maxBudget: "",
                commission: "Any",
                region: "All",
                language: "Any",
                stage: "Any",
                collabMode: "Any",
                creatorUsageDecision: "Any",
                approvalMode: "Any",
                minPitches: ""
              });
              toast("Filters reset");
            }}
          >
            Reset filters
          </button>
        </aside>

        {/* Right content */}
        <section className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold">Supplier Campaigns Board</div>
                <div className="text-[11px] text-slate-500">
                  Track campaign collaboration posture (Open Collabs / Invite-only), approvals and readiness.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="xl:hidden px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold"
                  onClick={() => setShowMobileFilters(true)}
                >
                  Filters
                </button>
                <button
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-xs font-extrabold",
                    batchSelection.length
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
                  )}
                  onClick={() => batchSelection.length && setShowBatchPanel(true)}
                  disabled={!batchSelection.length}
                >
                  Batch actions ({batchSelection.length})
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="min-w-[1100px]">
              {dataState === "error" ? (
                <div className="mx-4 md:mx-6 mt-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                  Unable to load campaigns from the database.
                </div>
              ) : null}
              <div className="px-4 md:px-6 py-3 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="grid grid-cols-6 gap-2">
                  <div>Campaign</div>
                  <div>Mode</div>
                  <div>Pipeline</div>
                  <div>KPIs</div>
                  <div>Actions</div>
                  <div className="text-right">&nbsp;</div>
                </div>
              </div>

              <table className="w-full">
                <tbody>
                  {filteredCampaigns.map((c) => (
                    <CampaignRow
                      key={c.id}
                      campaign={c}
                      saved={savedCampaignIds.includes(c.id)}
                      selected={batchSelection.includes(c.id)}
                      onToggleSave={() => toggleSaved(c.id)}
                      onToggleSelect={() => toggleBatchSelection(c.id)}
                      onViewDetails={() => openDetails(c)}
                      onPrimaryAction={() => handlePrimaryAction(c)}
                    />
                  ))}

                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td className="px-6 py-14 text-center text-sm text-slate-500" colSpan={6}>
                        {dataState === "loading" ? "Loading campaigns…" : "No campaigns match your filters."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile filters */}
      {showMobileFilters ? (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px] flex" onClick={() => setShowMobileFilters(false)}>
          <div
            className="w-[92vw] max-w-sm h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-extrabold">Filters</div>
              <button
                type="button"
                className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                onClick={() => setShowMobileFilters(false)}
              >
                ✕
              </button>
            </div>

            {/* Reuse same filter controls (condensed) */}
            <FilterSection label="Category / Line">
              <select
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="All">All categories</option>
                <option value="Beauty & Skincare">Beauty & Skincare</option>
                <option value="Tech & Gadgets">Tech & Gadgets</option>
                <option value="Services / Consultations">Services / Consultations</option>
                <option value="Fashion">Fashion</option>
                <option value="EV & Mobility">EV & Mobility</option>
              </select>
            </FilterSection>

            <FilterSection label="Creator usage decision">
              <select
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-sm transition-colors"
                value={filters.creatorUsageDecision}
                onChange={(e) => setFilters({ ...filters, creatorUsageDecision: e.target.value })}
              >
                <option value="Any">Any</option>
                <option value="I will use a Creator">Use a Creator</option>
                <option value="I will NOT use a Creator">Supplier as Creator</option>
                <option value="I am NOT SURE yet">Not sure</option>
              </select>
            </FilterSection>

            <button
              type="button"
              className="mt-2 w-full px-3 py-2 rounded-full bg-[#f77f00] text-white text-xs font-extrabold hover:bg-[#e26f00]"
              onClick={() => setShowMobileFilters(false)}
            >
              Apply filters
            </button>
          </div>
        </div>
      ) : null}

      {/* Detail drawer */}
      {showDetails && selectedCampaign ? (
        <CampaignDetailSlideOver campaign={selectedCampaign} onClose={closeDetails} onUpdateCampaign={updateCampaign} />
      ) : null}

      {/* Batch panel */}
      {showBatchPanel ? (
        <BatchActionPanel
          campaigns={batchCampaigns}
          onClose={() => setShowBatchPanel(false)}
          onApply={(payload) => {
            toast(`Batch action applied: ${payload.action}`);
            setShowBatchPanel(false);
          }}
        />
      ) : null}

      {/* Lightweight self-tests */}
      {typeof window !== "undefined" && window.__MLDZ_TESTS__ ? (
        <div className="hidden" />
      ) : null}

      {/* NOTE: In production, plug into RBAC + audit logs for approvals & switches. */}
    </div>
  );
}

/* ------------------------------ Self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierCampaignsBoardPage test failed: ${msg}`);
  };

  assert(typeof cx("a", false && "b", "c") === "string", "cx works");
  assert(typeof formatRange === "function", "formatRange exists");
  assert(canSwitchCollabMode("Draft") === true, "canSwitchCollabMode draft");
  assert(canSwitchCollabMode("Supplier Review") === false, "canSwitchCollabMode supplier review");

  console.log("✅ SupplierCampaignsBoardPage self-tests passed");
}
