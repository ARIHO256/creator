import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SupplierInvitesFromCreatorsPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: InvitesFromSellersPage.tsx (Creator view)
 *
 * Mirror-first preserved:
 * - PageHeader + badge
 * - Summary actions row
 * - Tabs + filters row
 * - Main split layout: list (left) + detail (right)
 * - InviteRow + InviteDetailPanel visual hierarchy
 * - Drawer for negotiation (mirrors PitchDrawer patterns)
 * - Loading/empty/error states + async accept/decline
 *
 * Supplier adaptations:
 * - “Invites from Suppliers” → “Invites from Creators”
 * - Inbound invites are from Creators asking to collaborate with this Supplier
 * - Accepting an invite implies: Creator Usage = "I will use a Creator" and Collab Mode = Invite-Only
 * - Detail panel shows campaign-level controls relevant to Supplier: Content approval mode (Manual/Auto)
 *
 * Notes:
 * - Dependency-free (no MUI, no lucide-react) for canvas reliability.
 * - Replace navigate stubs with react-router in the full Vite project.
 */

const ORANGE = "#f77f00";
const ROUTES = {
  campaignsBoard: "/mldz/collab/campaigns"
};

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeNavTo(navigate, url) {
  if (!url) return;
  const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noreferrer");
    return;
  }
  navigate(target);
}

function money(n, currency = "USD") {
  try {
    return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-UG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}



/* -------------------------------- Toast -------------------------------- */

let __toastTimer = null;
function toast(message) {
  window.dispatchEvent(new CustomEvent("mldz-toast", { detail: message }));
}

function ToastArea() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setMsg(e.detail);
      if (__toastTimer) clearTimeout(__toastTimer);
      __toastTimer = setTimeout(() => setMsg(null), 1700);
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

/* ------------------------------ Async Helper ---------------------------- */

function useAsyncAction() {
  const [isPending, setIsPending] = useState(false);

  const run = async (fn, opts) => {
    setIsPending(true);
    try {
      await fn();
      if (opts?.successMessage) toast(opts.successMessage);
    } catch (e) {
      toast(opts?.errorMessage || "Action failed");
      // In production: log + surface error
      // console.error(e);
    } finally {
      setIsPending(false);
    }
  };

  return { run, isPending };
}

/* -------------------------------- Header ------------------------------- */

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

const TABS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" }
];

const STATUS_FILTERS = ["All", "New", "In discussion", "Accepted", "Declined", "Expired"];

const CATEGORIES = ["All", "Beauty", "Tech", "Faith-compatible", "EV"];

function currencyFormat(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });
}

/* ------------------------------ Drawer ---------------------------------- */

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

function NegotiationDrawer({ isOpen, onClose, recipientName, recipientInitials, defaultCategory, aiSuggestion }) {
  useScrollLock(isOpen);

  const [message, setMessage] = useState(aiSuggestion || "");
  const [model, setModel] = useState("Hybrid");
  const [approvalMode, setApprovalMode] = useState("Manual");
  const [budget, setBudget] = useState("350");
  const [currency, setCurrency] = useState("USD");
  const [timeline, setTimeline] = useState("7");

  // Supplier mandatory rules (displayed; accepting invite implies these values)
  const creatorUsageDecision = "I will use a Creator";
  const collabMode = "Invite-Only";

  useEffect(() => {
    if (!isOpen) return;
    setMessage(aiSuggestion || "");
    setModel("Hybrid");
    setApprovalMode("Manual");
    setBudget("350");
    setCurrency("USD");
    setTimeline("7");
  }, [isOpen, aiSuggestion]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">{recipientInitials || "CR"}</div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Negotiate / Counter</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{recipientName || "Creator"}</div>
              <div className="text-[11px] text-slate-500">Category: {defaultCategory || "General"}</div>
            </div>
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
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3">
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Campaign rules (auto-set)</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold">
                Creator usage: {creatorUsageDecision}
              </span>
              <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold">
                Collab mode: {collabMode}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Note: Content approval mode can be Manual or Auto (campaign-level).
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Content approval mode</div>
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
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Commercial terms (counter)</div>
            <div className="flex flex-wrap gap-2">
              {["Flat fee", "Commission", "Hybrid"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                    model === m ? "bg-[#f77f00] border-[#f77f00] text-white" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
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
              rows={7}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:border-slate-400"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a counter proposal message…"
            />
            <div className="mt-1 text-[11px] text-slate-500">
              This counter will appear in <span className="font-extrabold">Proposals</span> and can later be converted to a <span className="font-extrabold">Contract</span>.
            </div>
          </section>

          <div className="text-[10px] text-slate-500">
            Permission note: Only Supplier Owner/Admin roles should submit counters that create binding commitments.
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50">
          <button
            type="button"
            className="w-full py-2.5 rounded-full bg-[#f77f00] text-white text-sm font-extrabold hover:bg-[#e26f00]"
            onClick={() => {
              toast(`Counter sent to ${recipientName || "Creator"} · ${model} · ${currency}${budget} · ${approvalMode}`);
              onClose();
            }}
            disabled={!message.trim()}
          >
            Send counter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Row + Detail ----------------------------- */

function InviteRow({ invite, selected, onSelect }) {
  const statusColorMap = {
    "New": "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    "In discussion": "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700",
    "Accepted": "bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-700 text-white dark:text-slate-100",
    "Declined": "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
    "Expired": "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  };

  const statusClass = statusColorMap[invite.status] || "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  return (
    <article
      className={cx(
        "py-2.5 px-2 md:px-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 cursor-pointer transition-colors",
        selected ? "bg-amber-50/60 dark:bg-amber-900/30" : "hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold dark:font-bold transition-colors">
          {invite.initials}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{invite.creator}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">· {invite.campaign}</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{invite.inviteType} · {invite.region}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{invite.messageShort}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 text-xs">
        <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] transition-colors", statusClass)}>
          <span>●</span>
          <span>{invite.status}</span>
        </span>
        <span className="text-slate-500 dark:text-slate-400">Est. value: {invite.currency} {currencyFormat(invite.estimatedValue)}</span>
        <span className="text-slate-400 dark:text-slate-500">{invite.lastActivity}</span>
      </div>
    </article>
  );
}

function InviteDetailPanel({ invite, onNegotiate, onAccept, onDecline, isPending }) {
  if (!invite) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 min-h-[260px]">
        <div className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 max-w-xs transition-colors">
          <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">Select an invite</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Click an invite to see full details, negotiate terms, accept or decline.
          </p>
        </div>
      </div>
    );
  }

  const forecastLabel = `${invite.currency} ${currencyFormat(invite.estimatedValue)}`;

  let statusHint = "Review this invite and decide whether to accept, negotiate or decline.";
  if (invite.status === "New") statusHint = "New invite – creators often expect quick replies.";
  if (invite.status === "In discussion") statusHint = "In discussion – clarify timelines, products and approvals.";
  if (invite.status === "Accepted") statusHint = "Accepted – focus shifts to scheduling, assets and execution.";
  if (invite.status === "Declined") statusHint = "Declined – you can still invite this creator later via Invite-Only.";
  if (invite.status === "Expired") statusHint = "Expired – you can reopen via a fresh proposal.";

  const isActionable = ["New", "In discussion"].includes(invite.status);

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Creator profile card */}
      <section className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-600 flex items-center justify-center text-xl font-black text-[#f77f00] overflow-hidden">
              {invite.avatarUrl ? <img src={invite.avatarUrl} alt={invite.creator} className="w-full h-full object-cover" /> : invite.initials}
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{invite.creator}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {invite.creatorRating ? (
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800 transition-colors">
                    <span className="text-amber-500 text-xs">★</span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{invite.creatorRating}</span>
                  </div>
                ) : null}
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Verified Creator</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-[#f77f00] hover:border-[#f77f00] dark:hover:text-[#f77f00] dark:hover:border-[#f77f00] transition-all shadow-sm group"
              title="View Creator"
              type="button"
              onClick={() => toast(`Open creator profile: ${invite.creator} (demo)`)}
            >
              <span className="text-sm group-hover:scale-110 transition-transform">👁️</span>
            </button>

            {isActionable ? (
              <>
                <button
                  onClick={onAccept}
                  disabled={isPending}
                  className="p-2 rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm group disabled:opacity-50"
                  title="Accept Invite"
                  type="button"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">✔️</span>
                </button>
                <button
                  onClick={onDecline}
                  disabled={isPending}
                  className="p-2 rounded-xl border border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm group disabled:opacity-50"
                  title="Decline Invite"
                  type="button"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">✖️</span>
                </button>
              </>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic border-t border-slate-100 dark:border-slate-700 pt-3">
          {invite.creatorBio}
        </p>
      </section>

      {/* Campaign highlights */}
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2 p-1">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{invite.campaign}</h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">{invite.inviteType} · {invite.category} · {invite.region}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Estimated Value</span>
            <span className="text-xl font-black text-[#f77f00]">{forecastLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Creator Requested Fee</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {invite.currency} {currencyFormat(invite.baseFee)}
              {invite.commissionPct > 0 ? <span className="text-[#f77f00] ml-1">+ {invite.commissionPct}% Comms</span> : null}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline/Expiry</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{invite.expiresIn}</span>
          </div>
        </div>

        {/* Supplier campaign-level implications */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">Supplier campaign settings (auto)</div>
            <span className="text-[10px] text-slate-500">Accepting sets collaboration to Invite-Only</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-[10px] font-extrabold">Creator usage: I will use a Creator</span>
            <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-[10px] font-extrabold">Collab mode: Invite-Only</span>
            <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-[10px] font-extrabold">Approval: Manual/Auto configurable</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Manual approval means the supplier reviews creator assets before Admin review. Auto skips supplier review.
          </div>
        </div>
      </section>

      {/* Fit */}
      <section className="border border-[#f77f00]/20 dark:border-[#f77f00]/30 rounded-2xl p-4 bg-amber-50/20 dark:bg-[#f77f00]/5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Match Score</span>
          <div className="h-px flex-1 bg-amber-100 dark:bg-slate-800" />
          <span className="text-xs font-black text-[#f77f00]">{invite.fitScore}/100</span>
        </div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{invite.fitReason}</p>
      </section>

      {/* Message */}
      <div className="group relative border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 flex flex-col gap-2 transition-all hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personal Message</span>
        <p className="text-sm text-slate-700 dark:text-slate-300 italic animate-in fade-in slide-in-from-left-2 duration-500">"{invite.messageShort}"</p>
        <div className="flex items-center gap-2 mt-1">
          <div
            className={cx(
              "w-2 h-2 rounded-full animate-pulse transition-colors",
              isActionable ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
            )}
          />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{statusHint}</span>
        </div>
      </div>

      {/* Footer CTAs */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Need help?</span>
          <button
            type="button"
            className="text-xs font-bold text-[#f77f00] hover:underline flex items-center gap-1"
            onClick={() => toast("AI Assistant opened (demo)")}
          >
            Ask AI Assistant 🪄
          </button>
        </div>

        {isActionable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm disabled:opacity-50"
              onClick={onDecline}
              disabled={isPending}
            >
              Decline
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
              onClick={onNegotiate}
            >
              Negotiate
            </button>
            <button
              type="button"
              className="px-6 py-2.5 rounded-2xl bg-[#f77f00] text-white text-xs font-black hover:bg-[#e26f00] transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={onAccept}
              disabled={isPending}
            >
              Start Collaboration
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
            <span className="text-xs font-bold text-slate-500 italic uppercase">● {invite.status}</span>
          </div>
        )}
      </section>

      <div className="text-[10px] text-slate-500">
        Permissions note: Only Supplier Owners/Admins should accept/decline invites that create binding proposal/contract flows.
      </div>
    </div>
  );
}

/* -------------------------------- Main ---------------------------------- */

export default function SupplierInvitesFromCreatorsPage() {
  const navigate = useNavigate();
  const safeNav = (url) => safeNavTo(navigate, url);
  // In production: fetch from /supplier/collabs/invites-from-creators
  const [invites, setInvites] = useState<Array<Record<string, any>>>([]);
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [minBudget, setMinBudget] = useState("");

  const [selectedInviteId, setSelectedInviteId] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInvite, setDrawerInvite] = useState(null);

  const { run, isPending } = useAsyncAction();

  const selectedInvite = useMemo(() => {
    if (!selectedInviteId) return invites[0] ?? null;
    return invites.find((i) => i.id === selectedInviteId) ?? invites[0] ?? null;
  }, [selectedInviteId, invites]);

  const filteredInvites = useMemo(() => {
    return invites.filter((inv) => {
      if (tab === "new" && inv.status !== "New") return false;
      if (tab === "active" && !["New", "In discussion", "Accepted"].includes(inv.status)) return false;
      if (tab === "archived" && !["Declined", "Expired"].includes(inv.status)) return false;

      if (statusFilter !== "All" && inv.status !== statusFilter) return false;
      if (categoryFilter !== "All" && inv.category !== categoryFilter) return false;

      if (minBudget) {
        const min = Number(minBudget) || 0;
        if (inv.estimatedValue < min) return false;
      }
      return true;
    });
  }, [tab, statusFilter, categoryFilter, minBudget, invites]);

  const openDrawer = (invite) => {
    setDrawerInvite(invite || null);
    setDrawerOpen(true);
  };

  const handleAccept = (id) => {
    run(
      async () => {
        await new Promise((r) => setTimeout(r, 900));
        setInvites((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: "Accepted", lastActivity: "Accepted · Just now" } : inv)));
      },
      { successMessage: "Invite accepted! Collaboration started." }
    );
  };

  const handleDecline = (id) => {
    run(
      async () => {
        await new Promise((r) => setTimeout(r, 900));
        setInvites((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: "Declined", lastActivity: "Declined · Just now" } : inv)));
      },
      { successMessage: "Invite declined." }
    );
  };

  const badge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
      <span>📨</span>
      <span>Direct invites · Creator-initiated</span>
    </span>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Invites from Creators"
        badge={badge}
        right={
          <>
            <span className="hidden md:inline-flex px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} /> Orange + Black
            </span>
            <button
              type="button"
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
              onClick={() => safeNav(ROUTES.campaignsBoard)}
            >
              View Campaigns Board
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-extrabold hover:bg-[#e26f00]"
              onClick={() => openDrawer(selectedInvite)}
            >
              Counter / Respond
            </button>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          {/* Summary + actions */}
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Creators who want to work with you. Review terms, negotiate/counter, accept or decline.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors"
                onClick={() => toast("Open Creator Directory (demo)")}
              >
                Open Creator Directory
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-extrabold hover:bg-[#e26f00]"
                onClick={() => openDrawer(selectedInvite)}
              >
                Start a counter
              </button>
            </div>
          </section>

          {/* Tabs + filters */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-300">View:</span>
                <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-0.5 transition-colors">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={cx(
                          "px-2.5 py-0.5 rounded-full transition-colors",
                          active
                            ? "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                        onClick={() => setTab(t.id)}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  className="border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s} value={s} className="bg-white dark:bg-slate-900">
                      {s === "All" ? "All statuses" : s}
                    </option>
                  ))}
                </select>

                <select
                  className="border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-white dark:bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-300">Budget ≥</span>
                  <input
                    type="number"
                    className="w-24 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs transition-colors"
                    placeholder="e.g. 500"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
              <span>
                Showing <span className="font-semibold dark:font-bold">{filteredInvites.length}</span> of {invites.length} invites
              </span>
              <button
                type="button"
                className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                onClick={() => {
                  setTab("new");
                  setStatusFilter("All");
                  setCategoryFilter("All");
                  setMinBudget("");
                }}
              >
                Reset
              </button>
            </div>
          </section>

          {/* Main layout: list + detail */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] gap-3 items-start text-sm">
            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">Invites</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300">Click an invite to see full details and respond.</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredInvites.map((inv) => (
                  <InviteRow key={inv.id} invite={inv} selected={selectedInviteId === inv.id} onSelect={() => setSelectedInviteId(inv.id)} />
                ))}

                {filteredInvites.length === 0 ? (
                  <div className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">No invites match these filters yet.</div>
                ) : null}
              </div>
            </div>

            {/* Detail */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <InviteDetailPanel
                invite={selectedInvite}
                onNegotiate={() => openDrawer(selectedInvite)}
                onAccept={() => selectedInvite && handleAccept(selectedInvite.id)}
                onDecline={() => selectedInvite && handleDecline(selectedInvite.id)}
                isPending={isPending}
              />
            </div>
          </section>
        </div>
      </main>

      <NegotiationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        recipientName={drawerInvite?.creator || ""}
        recipientInitials={drawerInvite?.initials || ""}
        defaultCategory={drawerInvite?.category || "General"}
        aiSuggestion={
          drawerInvite
            ? `Hi ${drawerInvite.creator}, thanks for reaching out about ${drawerInvite.campaign}. I’m interested. Here’s a counter proposal that aligns budget, deliverables, and approval workflow…`
            : undefined
        }
      />

      <ToastArea />
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`InvitesFromCreators test failed: ${msg}`);
  };

  assert(cx("a", false && "b", "c") === "a c", "cx joins truthy");
  assert(currencyFormat(1200) === "1,200" || currencyFormat(1200) === "1.200", "currencyFormat formats" );
  assert(money(1000, "USD").toLowerCase().includes("$") || money(1000, "USD").toLowerCase().includes("usd"), "money formats" );

  console.log("✅ SupplierInvitesFromCreatorsPage self-tests passed");
}
