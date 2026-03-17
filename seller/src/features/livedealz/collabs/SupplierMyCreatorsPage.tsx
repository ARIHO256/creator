import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";

/**
 * SupplierMyCreatorsPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: MySellersPage.tsx (Creator platform)
 * Secondary reference: 2_MyCreators.jsx (older Seller file)
 *
 * Mirror-first preserved:
 * - Same page sections: Header → Overview/Stats → Filters row → Main layout (list + detail)
 * - Same interaction model: select row highlights, mobile expands inline detail, desktop sticky detail
 * - Follow + Pin controls, quick nav chips (Workspace/Proposals/Contracts)
 * - Stop Collaboration confirmation modal
 *
 * Supplier adaptations (minimal + required):
 * - “My Suppliers” → “My Creators”
 * - Business rule: Creators listed here have accepted at least one collaboration with this Supplier
 * - Supplier-specific relationship signals: creator usage mode awareness + campaign stages
 * - Detail panel includes: creator performance, active campaigns, approvals queue hints, deliverables shortcuts
 * - Safety/permissions notes added in comments
 *
 * Notes:
 * - Dependency-free (no lucide-react) to avoid CDN issues.
 * - Replace navigation stubs with react-router links in your main Vite project.
 */

const ORANGE = "#f77f00";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function buildInitials(name, handle) {
  const label = String(name || "").trim();
  if (label) {
    const parts = label.split(/\s+/g).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
  }
  return String(handle || "").replace(/^@/, "").slice(0, 2).toUpperCase() || "CR";
}

function normalizeWorkspaceCreator(creator) {
  const activeCampaigns = Array.isArray(creator?.activeCampaigns) ? creator.activeCampaigns : [];
  const queues =
    creator?.queues && typeof creator.queues === "object"
      ? {
          pendingSupplier: Number(creator.queues.pendingSupplier || 0),
          pendingAdmin: Number(creator.queues.pendingAdmin || 0),
          changesRequested: Number(creator.queues.changesRequested || 0),
        }
      : { pendingSupplier: 0, pendingAdmin: 0, changesRequested: 0 };

  return {
    ...creator,
    id: String(creator?.id || ""),
    name: String(creator?.name || "Creator"),
    handle: String(creator?.handle || "@creator"),
    initials: String(creator?.initials || buildInitials(creator?.name, creator?.handle)),
    tagline: String(creator?.tagline || ""),
    categories: Array.isArray(creator?.categories) ? creator.categories.map(String) : [],
    rating: Number(creator?.rating || 0),
    relationship: String(creator?.relationship || "Past collab"),
    following: Boolean(creator?.following),
    favourite: Boolean(creator?.favourite),
    primaryContact: String(creator?.primaryContact || creator?.handle || "Not assigned"),
    nextLive: String(creator?.nextLive || "Not scheduled"),
    nextAction: String(creator?.nextAction || "No active deliverables"),
    lifetimeRevenue: Number(creator?.lifetimeRevenue || 0),
    currentValue: Number(creator?.currentValue || 0),
    avgConversion: Number(creator?.avgConversion ?? creator?.conversion ?? 0),
    campaignsCount: Number(creator?.campaignsCount ?? activeCampaigns.length),
    lastCampaign: String(creator?.lastCampaign || activeCampaigns?.[0]?.name || "No campaigns yet"),
    openProposals: Number(creator?.openProposals ?? queues.pendingSupplier ?? 0),
    activeContracts: Number(creator?.activeContracts || 0),
    activeCampaigns,
    queues,
    activeContractIds: Array.isArray(creator?.activeContractIds) ? creator.activeContractIds.map(String) : [],
  };
}

/* -------------------------------- Toast -------------------------------- */

let toastTimer = null;
function toast(message) {
  window.dispatchEvent(new CustomEvent("mldz-toast", { detail: message }));
}

function ToastArea() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setMsg(e.detail);
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setMsg(null), 1600);
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

/* -------------------------------- UI ----------------------------------- */

function PageHeader({ pageTitle, badge, rightContent }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50">{pageTitle}</h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{rightContent}</div>
      </div>
    </header>
  );
}

function StatCard({ label, value, sub, money }) {
  return (
    <div className="relative overflow-hidden rounded-2xl px-3 py-2.5 flex flex-col justify-between bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
      <div className={cx("absolute inset-x-0 top-0 h-0.5", money ? "bg-[#f77f00]" : "bg-slate-200 dark:bg-slate-700")} />
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
        <span>{label}</span>
      </div>
      <div className={cx("text-sm font-semibold mb-1", money ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100")}>
        {value}
      </div>
      {sub ? <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div> : null}
    </div>
  );
}

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        : tone === "bad"
          ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
          : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  return <span className={cx("inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[10px] font-bold tracking-tight", cls)}>{children}</span>;
}

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmLabel, confirmClass }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</div>
          <button className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{message}</div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-[11px] font-extrabold"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={cx("px-4 py-2 rounded-full text-[11px] font-extrabold text-white", confirmClass || "bg-slate-900 hover:bg-black")}
              onClick={onConfirm}
              type="button"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Invite Drawer ------------------------------ */

function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

function InviteDrawer({ isOpen, onClose, creator, campaigns }) {
  useScrollLock(isOpen);
  const [campaignId, setCampaignId] = useState(campaigns?.[0]?.id ?? "");
  const [message, setMessage] = useState(
    creator
      ? `Hi ${creator.name}, we’d like to work with you on an upcoming campaign. Your performance and audience fit look strong.\n\nCan we align on deliverables and timeline?`
      : ""
  );

  // Mandatory campaign-level config (mirrors platform rule)
  const [creatorUsageDecision, setCreatorUsageDecision] = useState("I will use a Creator");
  const [collabMode, setCollabMode] = useState("Invite-Only");
  const [approvalMode, setApprovalMode] = useState("Manual");

  // Commercial terms (proposal)
  const [model, setModel] = useState("Hybrid");
  const [budget, setBudget] = useState("250");
  const [currency, setCurrency] = useState("USD");
  const [timeline, setTimeline] = useState("7");

  useEffect(() => {
    if (!isOpen) return;
    setCampaignId(campaigns?.[0]?.id ?? "");
    setCreatorUsageDecision("I will use a Creator");
    setCollabMode("Invite-Only");
    setApprovalMode("Manual");
    setModel("Hybrid");
    setBudget("250");
    setCurrency("USD");
    setTimeline("7");
    setMessage(
      creator
        ? `Hi ${creator.name}, we’d like to work with you on an upcoming campaign. Your performance and audience fit look strong.\n\nCan we align on deliverables and timeline?`
        : ""
    );
  }, [isOpen, creator, campaigns]);

  if (!isOpen) return null;

  const canInvite = creatorUsageDecision !== "I will NOT use a Creator";

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Invite Creator</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{creator ? `${creator.name} (${creator.handle})` : "Select a creator"}</div>
          </div>
          <button
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Campaign</div>
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-[#f77f00]"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900">
                  {c.name}
                </option>
              ))}
            </select>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Creator usage decision (mandatory)</div>
            <div className="grid grid-cols-1 gap-2">
              {["I will use a Creator", "I will NOT use a Creator", "I am NOT SURE yet"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={cx(
                    "px-3 py-2 rounded-2xl border text-[12px] font-extrabold text-left",
                    creatorUsageDecision === opt
                      ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/10 text-[#f77f00]"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  )}
                  onClick={() => setCreatorUsageDecision(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            {!canInvite ? (
              <div className="mt-2 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300">
                Supplier becomes the Creator. Collaboration invite is disabled for this configuration.
              </div>
            ) : null}
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Collaboration mode</div>
            <div className="flex flex-wrap gap-2">
              {["Open for Collabs", "Invite-Only"].map((m) => (
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
            <div className="mt-1 text-[11px] text-slate-500">Default is Open for Collabs, but this invite uses Invite-Only.</div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Content approval</div>
            <div className="flex flex-wrap gap-2">
              {["Manual", "Auto"].map((m) => (
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
                  {m} approval
                </button>
              ))}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Manual: you review creator assets before Admin review.</div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Commercial terms</div>
            <div className="flex flex-wrap gap-2">
              {["Flat fee", "Commission", "Hybrid"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                    model === m
                      ? "bg-[#f77f00] border-[#f77f00] text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  )}
                  onClick={() => setModel(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-[1fr_0.7fr] gap-2">
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Budget</div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-[#f77f00]"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                  <select
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-sm bg-white dark:bg-slate-900"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option className="bg-white dark:bg-slate-900" value="USD">USD</option>
                    <option className="bg-white dark:bg-slate-900" value="UGX">UGX</option>
                    <option className="bg-white dark:bg-slate-900" value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Timeline</div>
                <select
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-sm bg-white dark:bg-slate-900"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                >
                  <option className="bg-white dark:bg-slate-900" value="3">3 days</option>
                  <option className="bg-white dark:bg-slate-900" value="7">7 days</option>
                  <option className="bg-white dark:bg-slate-900" value="14">14 days</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Message</div>
            <textarea
              rows={5}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-slate-400"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </section>

          <div className="text-[10px] text-slate-500">
            Permission note: Only Supplier Owner/Admin roles should send invites that create proposal/contract obligations.
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50">
          <button
            className={cx(
              "w-full py-2.5 rounded-full text-white text-sm font-extrabold",
              canInvite ? "bg-[#f77f00] hover:bg-[#e26f00]" : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
            )}
            type="button"
            disabled={!canInvite}
            onClick={() => {
              if (!canInvite) return;
              toast(`Invite created · ${creator?.name || "Creator"} · ${campaignId} · ${model} ${currency}${budget}`);
              onClose();
            }}
          >
            Send invite
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Row + Detail ------------------------------- */

function CreatorRow({ creator, selected, isExpanded, onSelect, onToggle, onToggleFollow, onToggleFavourite, onInvite, onStopCollaboration, onNavigate }) {
  const relLabel = creator.relationship === "Active collab" ? "Active collab" : "Past collab";
  const relColor =
    creator.relationship === "Active collab"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
      : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  const actions = (
    <div className="flex flex-col items-end gap-2.5 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex gap-1.5">
        <button
          className={cx(
            "px-3 py-1 rounded-full border text-[10px] font-bold transition-all",
            creator.following
              ? "bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-700 text-white"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
          )}
          onClick={onToggleFollow}
          type="button"
        >
          {creator.following ? "Following" : "Follow"}
        </button>
        <button
          className={cx(
            "px-3 py-1 rounded-full border text-[10px] font-bold transition-all",
            creator.favourite
              ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
          )}
          onClick={onToggleFavourite}
          type="button"
        >
          {creator.favourite ? "Pinned" : "Pin"}
        </button>
      </div>

      <div className="text-[10px] text-slate-600 dark:text-slate-400 text-right leading-tight">
        <div className="mb-0.5">
          Next live: <span className="font-bold text-slate-900 dark:text-slate-100">{creator.nextLive || "Not scheduled"}</span>
        </div>
        <div>
          Next action: <span className="font-medium">{creator.nextAction}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-end mt-1">
        {["Workspace", "Proposals", "Contracts"].map((label) => (
          <button
            key={label}
            className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-[10px] font-bold text-[#f77f00] hover:text-[#e26f00] transition-colors border border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800"
            onClick={() => onNavigate(label.toLowerCase())}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-2.5 py-1 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00] text-[10px] font-bold"
          onClick={onInvite}
          type="button"
        >
          Invite
        </button>
        {creator.relationship === "Active collab" ? (
          <button
            className="px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/10"
            onClick={onStopCollaboration}
            type="button"
          >
            Stop
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <article
      className={cx(
        "py-3.5 px-3 md:px-5 flex flex-col gap-2 cursor-pointer transition-all duration-200 rounded-2xl border",
        selected
          ? "bg-amber-50/70 dark:bg-amber-900/30 border-amber-200 dark:border-amber-600 shadow-sm"
          : "bg-white dark:bg-slate-800 border-transparent dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700/50 hover:border-slate-100 dark:hover:border-slate-600"
      )}
      onClick={() => {
        onSelect();
        if (window.innerWidth < 1024) onToggle();
      }}
    >
      <div className="flex w-full items-start justify-between gap-6">
        <div className="flex gap-4 items-start min-w-0 flex-1">
          <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold transition-colors flex-shrink-0 border-2 border-white dark:border-slate-800 shadow-sm">
            {creator.initials}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{creator.name}</span>
              {creator.favourite ? <span className="text-xs text-amber-500 dark:text-amber-300">★</span> : null}
              <span className="text-xs text-amber-500 dark:text-amber-300">★ {creator.rating.toFixed(1)}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{creator.handle}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed max-w-md">{creator.tagline}</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {creator.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/50 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors border border-slate-100 dark:border-slate-700"
                >
                  {cat}
                </span>
              ))}
            </div>

            <span className={cx("mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[10px] font-bold tracking-tight transition-colors", relColor)}>
              <span>🤝</span>
              <span className="uppercase">{relLabel}</span>
            </span>
          </div>
        </div>

        <div className="hidden lg:block flex-shrink-0 pt-1">{actions}</div>

        <div className="lg:hidden text-slate-400 self-center pr-1">
          <span className={cx("transition-transform duration-300 inline-block", isExpanded ? "rotate-180 text-[#f77f00]" : "")}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 lg:hidden">
          <CreatorDetailPanel
            creator={creator}
            onNavigate={onNavigate}
            onInvite={onInvite}
            onStopCollaboration={onStopCollaboration}
            isInline
          />
        </div>
      ) : null}
    </article>
  );
}

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function QueueChip({ label, value, tone }) {
  const cls =
    tone === "warn"
      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
      : tone === "bad"
        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
        : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";

  return (
    <div className={cx("rounded-2xl border px-2.5 py-2", cls)}>
      <div className="text-[10px] font-extrabold">{label}</div>
      <div className="text-[14px] font-extrabold">{value}</div>
    </div>
  );
}

function CreatorDetailPanel({ creator, onNavigate, onInvite, onStopCollaboration, isInline }) {
  if (!creator) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 min-h-[260px]">
        <div className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 max-w-xs">
          <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">Select a creator</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Pick a creator on the left to see collaboration history, performance and next steps.</p>
        </div>
      </div>
    );
  }

  const canStop = creator.relationship === "Active collab" && !!onStopCollaboration;

  const relTone = creator.relationship === "Active collab" ? "good" : "neutral";

  const approvalsRisk = (creator.queues.pendingSupplier || 0) + (creator.queues.changesRequested || 0) >= 4;

  return (
    <div className={cx("flex flex-col gap-3 text-sm", isInline ? "p-0 bg-transparent border-none shadow-none" : "")}
    >
      {!isInline ? (
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold dark:font-bold">
              {creator.initials}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{creator.name}</span>
                <span className="text-xs text-amber-500 dark:text-amber-300">★ {creator.rating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-300">{creator.handle}</span>
              <span className="text-xs text-slate-500 dark:text-slate-300">{creator.tagline}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {creator.categories.map((cat) => (
                  <span key={cat} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    {cat}
                  </span>
                ))}
              </div>
              <div className="mt-1">
                <Pill tone={relTone}>
                  <span>🤝</span>
                  <span>{creator.relationship}</span>
                </Pill>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="text-xs text-slate-500 dark:text-slate-400">Primary contact</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{creator.primaryContact}</span>
          </div>
        </div>
      ) : null}

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Lifetime attributed revenue" value={formatMoney(creator.lifetimeRevenue)} sub={`~${formatMoney(creator.currentValue)} currently active`} money />
        <StatCard label="Avg conversion" value={`${creator.avgConversion.toFixed(1)}%`} sub="Across creator-led executions" />
        <StatCard label="Campaigns together" value={creator.campaignsCount} sub={`Last: ${creator.lastCampaign}`} />
        <StatCard label="Contracts" value={creator.activeContracts} sub={`${creator.openProposals} open proposal(s)`} />
      </div>

      {/* Operational queue */}
      <div className={cx("rounded-2xl border p-3", approvalsRisk ? "border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-900/10" : "border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/40")}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">Approvals & status queue</div>
          <span className="text-[10px] text-slate-500">Supplier review affects speed-to-live</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <QueueChip label="Pending Supplier" value={creator.queues.pendingSupplier} tone={creator.queues.pendingSupplier ? "warn" : "neutral"} />
          <QueueChip label="Pending Admin" value={creator.queues.pendingAdmin} tone={creator.queues.pendingAdmin ? "warn" : "neutral"} />
          <QueueChip label="Changes" value={creator.queues.changesRequested} tone={creator.queues.changesRequested ? "bad" : "neutral"} />
        </div>
        <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
          Tip: Approve or request changes within <span className="font-extrabold">6 hours</span> for scheduled Lives and high-performing Adz.
        </div>
      </div>

      {/* Active campaigns */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">Active campaigns</div>
          <button
            type="button"
            className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200"
            onClick={() => onNavigate?.("my-campaigns")}
          >
            Open My Campaigns
          </button>
        </div>

        {creator.activeCampaigns?.length ? (
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-[11px]">
              <thead className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/60">
                <tr className="text-left">
                  <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Campaign</th>
                  <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Type</th>
                  <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Stage</th>
                  <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Approval</th>
                  <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {creator.activeCampaigns.map((c) => (
                  <tr key={c.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <div className="font-extrabold">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.id}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-extrabold">{c.type}</td>
                    <td className="px-3 py-2">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full border text-[10px] font-extrabold",
                        c.stage.includes("Review")
                          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                          : c.stage === "Scheduled"
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                            : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      )}>
                        {c.stage}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-extrabold">{c.approvalMode}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-extrabold"
                          onClick={() => onNavigate?.("my-campaigns")}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold text-slate-700 dark:text-slate-200"
                          onClick={() => onNavigate?.("asset-library")}
                        >
                          Assets
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold text-slate-700 dark:text-slate-200"
                          onClick={() => onNavigate?.("links-hub")}
                        >
                          Links
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">No active campaigns with this creator.</div>
        )}

        <div className="mt-2 text-[10px] text-slate-500">
          Edge cases supported (system-wide): creator rejects proposal, renegotiation, multiple creators per campaign, switching collab mode before content submission.
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="px-3 py-2 rounded-2xl bg-[#f77f00] text-white hover:bg-[#e26f00] text-[11px] font-extrabold"
          type="button"
          onClick={onInvite}
        >
          Invite / Extend campaign
        </button>
        <button
          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-[11px] font-extrabold"
          type="button"
          onClick={() => onNavigate?.("proposals")}
        >
          💬 Message creator
        </button>
        <button
          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-[11px] font-extrabold"
          type="button"
          onClick={() => onNavigate?.("task-board")}
        >
          ✅ Task Board
        </button>
        <button
          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-[11px] font-extrabold"
          type="button"
          onClick={() => onNavigate?.("analytics")}
        >
          📈 Analytics
        </button>
      </div>

      {canStop ? (
        <button
          type="button"
          className="px-3 py-2 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-300 text-[11px] font-extrabold hover:bg-rose-100 dark:hover:bg-rose-900/20"
          onClick={onStopCollaboration}
        >
          Stop collaboration
        </button>
      ) : null}

      <div className="text-[10px] text-slate-500">
        Permissions note: Only Supplier Owners/Admins should stop collaborations, change contract terms, or override approval workflows.
      </div>
    </div>
  );
}

/* -------------------------------- Main ---------------------------------- */

export default function SupplierMyCreatorsPage() {
  const navigate = useNavigate();
  const [myCreators, setMyCreators] = useState<Array<Record<string, any>>>([]);
  const [search, setSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("All"); // All | Active collab | Past collab
  const [viewTab, setViewTab] = useState("all"); // all | active | past

  const [selectedCreatorId, setSelectedCreatorId] = useState(null);
  const [expandedCreatorId, setExpandedCreatorId] = useState(null);

  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRecipient, setInviteRecipient] = useState(null);
  const [supplierCampaigns, setSupplierCampaigns] = useState<Array<Record<string, any>>>([]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([sellerBackendApi.getMyCreatorsWorkspace(), sellerBackendApi.getCampaignWorkspace()])
      .then(([workspace, campaignWorkspace]) => {
        if (cancelled) return;
        const creators = Array.isArray(workspace?.creators) ? workspace.creators.map(normalizeWorkspaceCreator) : [];
        const campaigns = Array.isArray(campaignWorkspace?.campaigns) ? campaignWorkspace.campaigns : [];
        setMyCreators(creators);
        setSupplierCampaigns(
          campaigns.map((campaign) => ({
            id: String(campaign?.id || ""),
            name: String(campaign?.title || campaign?.name || "MyLiveDealz campaign"),
          }))
        );
      })
      .catch(() => {
        if (cancelled) return;
        setMyCreators([]);
        setSupplierCampaigns([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const active = myCreators.filter((c) => c.relationship === "Active collab");
    const past = myCreators.filter((c) => c.relationship === "Past collab");
    const lifetime = myCreators.reduce((sum, c) => sum + (Number(c.lifetimeRevenue) || 0), 0);
    const activeValue = active.reduce((sum, c) => sum + (Number(c.currentValue) || 0), 0);
    return {
      activeCount: active.length,
      pastCount: past.length,
      totalCount: myCreators.length,
      lifetime,
      activeValue
    };
  }, [myCreators]);

  const filteredCreators = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myCreators.filter((c) => {
      if (relationshipFilter !== "All" && c.relationship !== relationshipFilter) return false;
      if (viewTab === "active" && c.relationship !== "Active collab") return false;
      if (viewTab === "past" && c.relationship !== "Past collab") return false;
      if (q) {
        const inName = c.name.toLowerCase().includes(q);
        const inTagline = c.tagline.toLowerCase().includes(q);
        const inCategory = (c.categories || []).some((k) => k.toLowerCase().includes(q));
        const inHandle = (c.handle || "").toLowerCase().includes(q);
        if (!inName && !inTagline && !inCategory && !inHandle) return false;
      }
      return true;
    });
  }, [myCreators, search, relationshipFilter, viewTab]);

  const selectedCreator = useMemo(() => {
    if (selectedCreatorId == null) return filteredCreators[0] ?? null;
    return filteredCreators.find((c) => c.id === selectedCreatorId) ?? filteredCreators[0] ?? null;
  }, [filteredCreators, selectedCreatorId]);

  const toggleFollow = (id) => {
    const target = myCreators.find((creator) => creator.id === id);
    const nextFollow = !target?.following;
    setMyCreators((prev) => prev.map((c) => (c.id === id ? { ...c, following: nextFollow } : c)));
    void sellerBackendApi.followCreator(id, { follow: nextFollow }).catch(() => {
      setMyCreators((prev) => prev.map((c) => (c.id === id ? { ...c, following: !nextFollow } : c)));
    });
  };

  const toggleFavourite = (id) => {
    setMyCreators((prev) => prev.map((c) => (c.id === id ? { ...c, favourite: !c.favourite } : c)));
  };

  const stopCollaboration = (id) => {
    const creator = myCreators.find((entry) => entry.id === id);
    const activeContractIds = Array.isArray(creator?.activeContractIds) ? creator.activeContractIds : [];

    if (activeContractIds.length === 0) {
      setMyCreators((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                relationship: "Past collab",
                activeContracts: 0,
                currentValue: 0,
                nextLive: "Not scheduled",
                nextAction: "Collaboration stopped by supplier",
                queues: { pendingSupplier: 0, pendingAdmin: 0, changesRequested: 0 },
                activeCampaigns: [],
              }
            : c
        )
      );
      return;
    }

    void Promise.all(
      activeContractIds.map((contractId) =>
        sellerBackendApi.terminateCollaborationContract(contractId, { reason: "Stopped from My Creators workspace" })
      )
    )
      .then(() => {
        setMyCreators((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  relationship: "Past collab",
                  activeContracts: 0,
                  currentValue: 0,
                  nextLive: "Not scheduled",
                  nextAction: "Collaboration stopped by supplier",
                  queues: { pendingSupplier: 0, pendingAdmin: 0, changesRequested: 0 },
                  activeCampaigns: [],
                  activeContractIds: [],
                }
              : c
          )
        );
      })
      .catch(() => {
        toast("Unable to stop collaboration");
      });
  };

  const openInvite = (creator) => {
    setInviteRecipient(creator || selectedCreator || null);
    setInviteOpen(true);
  };

  const pageRouteMap = {
    "creator-directory": "/mldz/creators/directory",
    workspace: "/mldz/collab/campaigns",
    proposals: "/mldz/collab/proposals",
    contracts: "/mldz/collab/contracts",
    "task-board": "/mldz/deliverables/task-board",
    "asset-library": "/mldz/deliverables/asset-library",
    "links-hub": "/mldz/deliverables/links-hub",
    analytics: "/mldz/insights/analytics-status",
    "my-campaigns": "/mldz/campaigns"
  };

  const navigateToPage = (dest) => {
    const key = String(dest || "").trim();
    if (!key) return;
    const target = pageRouteMap[key] || (key.startsWith("/") ? key : `/mldz/${key}`);
    navigate(target);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="My Creators"
        badge={
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
            <span>🤝</span>
            <span>Only creators with accepted collaboration</span>
          </span>
        }
        rightContent={
          <>
            <span className="hidden md:inline-flex px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} /> Orange + Black
            </span>
            <button
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors"
              onClick={() => navigateToPage("creator-directory")}
              type="button"
            >
              Discover creators
            </button>
            <button className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00]" onClick={() => openInvite()} type="button">
              Invite Creator
            </button>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          {/* Overview + stats */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-3 text-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Creators who have accepted at least one collaboration with you – active and past.
                  If you choose “I will NOT use a Creator”, track those executions under My Campaigns.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => navigateToPage("creator-directory")}
                  type="button"
                >
                  Discover new creators
                </button>
                <button className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00]" onClick={() => openInvite()} type="button">
                  Invite Creators
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1 text-sm">
              <StatCard label="Active collaborators" value={stats.activeCount} sub="Current contracts or campaigns" />
              <StatCard label="Past collaborators" value={stats.pastCount} sub="Completed campaigns" />
              <StatCard label="Total My Creators" value={stats.totalCount} sub="Creators with accepted collabs" />
              <StatCard
                label="Lifetime attributed revenue from My Creators"
                value={formatMoney(stats.lifetime)}
                sub={`~${formatMoney(stats.activeValue)} currently active`}
                money
              />
            </div>
          </section>

          {/* Filters row */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
            <div className="flex flex-col md:flex-row gap-2 md:gap-3 items-stretch md:items-center">
              <div className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 transition-colors">
                <span>🔍</span>
                <input
                  className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  placeholder="Search by creator, handle, tagline or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <select
                  className="border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors cursor-pointer outline-none"
                  value={relationshipFilter}
                  onChange={(e) => setRelationshipFilter(e.target.value)}
                >
                  <option value="All" className="bg-white dark:bg-slate-800">All relationships</option>
                  <option value="Active collab" className="bg-white dark:bg-slate-800">Active collaborations</option>
                  <option value="Past collab" className="bg-white dark:bg-slate-800">Past collaborations</option>
                </select>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-300 mr-1">View:</span>
                  <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-0.5 transition-colors">
                    {[{ id: "all", label: "All" }, { id: "active", label: "Active" }, { id: "past", label: "Past" }].map((tab) => (
                      <button
                        key={tab.id}
                        className={cx(
                          "px-2.5 py-0.5 rounded-full transition-colors",
                          viewTab === tab.id
                            ? "bg-slate-900 dark:bg-slate-700 text-white"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                        onClick={() => setViewTab(tab.id)}
                        type="button"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
              <span>
                Showing <span className="font-semibold dark:font-bold">{filteredCreators.length}</span> of {myCreators.length} My Creators
              </span>
              <button
                className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                onClick={() => {
                  setSearch("");
                  setRelationshipFilter("All");
                  setViewTab("all");
                }}
                type="button"
              >
                Reset
              </button>
            </div>
          </section>

          {/* Main layout: list + detail */}
          <section className="flex flex-col-reverse lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] gap-4 items-start text-sm">
            {/* List */}
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">My Creators</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300 hidden sm:inline">These creators have already accepted collaboration with you.</span>
              </div>

              <div className="space-y-2">
                  {filteredCreators.map((c) => (
                    <CreatorRow
                      key={c.id}
                      creator={c}
                      selected={selectedCreator?.id === c.id}
                      isExpanded={expandedCreatorId === c.id}
                      onSelect={() => setSelectedCreatorId(c.id)}
                      onToggle={() => setExpandedCreatorId(expandedCreatorId === c.id ? null : c.id)}
                      onToggleFollow={() => toggleFollow(c.id)}
                      onToggleFavourite={() => toggleFavourite(c.id)}
                      onInvite={() => openInvite(c)}
                      onStopCollaboration={() => setIsStopModalOpen(true)}
                      onNavigate={navigateToPage}
                    />
                  ))}

                  {filteredCreators.length === 0 ? (
                    <div className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">No My Creators match this view yet.</div>
                  ) : null}
              </div>
            </div>

            {/* Detail panel (Desktop only) */}
            <div className="hidden lg:block w-full bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 lg:sticky lg:top-20">
              <CreatorDetailPanel
                creator={selectedCreator}
                onNavigate={navigateToPage}
                onInvite={() => openInvite(selectedCreator)}
                onStopCollaboration={() => setIsStopModalOpen(true)}
              />
            </div>
          </section>
        </div>
      </main>

      <ConfirmationModal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        onConfirm={() => {
          if (selectedCreator) {
            stopCollaboration(selectedCreator.id);
            setIsStopModalOpen(false);
            toast(`Collaboration stopped: ${selectedCreator.name}`);
          }
        }}
        title="Stop Collaboration?"
        message={`Are you sure you want to end your active collaboration with ${selectedCreator?.name}? This will move them to your past collaborators and clear any active schedules.`}
        confirmLabel="Stop Collaboration"
        confirmClass="bg-red-500 hover:bg-red-600 shadow-red-100 dark:shadow-none"
      />

      <InviteDrawer
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        creator={inviteRecipient}
        campaigns={supplierCampaigns}
      />

      <ToastArea />
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`MyCreators test failed: ${msg}`);
  };

  assert(cx("a", false && "b", "c") === "a c", "cx joins truthy");
  assert(formatMoney(1200) === "$1,200", "formatMoney formats" );

  console.log("✅ SupplierMyCreatorsPage self-tests passed");
}
