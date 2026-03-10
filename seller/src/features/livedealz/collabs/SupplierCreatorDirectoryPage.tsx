import React, { useEffect, useMemo, useState } from "react";

/**
 * SupplierCreatorDirectoryPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: SellersDirectoryPage.tsx (Creator platform)
 * Secondary reference: 1_DiscoveryPool.jsx (older Seller creator discovery)
 *
 * Mirror-first preserved:
 * - Same layout sections: Top search bar + AI Suggest, Horizontal Filters, AI Hint banner,
 *   Master Grid header (tabs + result count + sort), Card grid, Empty state,
 *   Invite Drawer, AI Discovery Dialog.
 *
 * Supplier adaptations:
 * - Directory shows *Creators* (not suppliers).
 * - Save/Follow becomes “Save creator” (feeds “My Creators” page).
 * - Invite is “Invite to Campaign” with campaign context + mandatory campaign-level rules:
 *   Creator Usage Decision + Collaboration Mode + Content Approval Mode.
 * - Supports edge cases (demo states): creator rejects, changes requested, renegotiation.
 *
 * Notes:
 * - Dependency-free (no lucide-react). Emoji icons used to avoid CDN issues.
 * - Replace demo data with API data in the real project.
 */

const ORANGE = "#f77f00";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

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

function PageHeader({ title, subtitle, right }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center">🤝</div>
            <div className="min-w-0">
              <h1 className="truncate text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50">{title}</h1>
              {subtitle ? <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</div> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}

function PresetChip({ label, active, onClick }) {
  return (
    <button
      className={cx(
        "px-4 py-1.5 rounded-xl border-2 text-xs font-bold transition-all",
        active
          ? "bg-[#f77f00] border-[#f77f00] text-white shadow-lg shadow-orange-500/20"
          : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200 shadow-sm"
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function StatItem({ label, value, trend }) {
  let trendSymbol = "";
  let trendColor = "text-slate-500 dark:text-slate-300";
  if (trend === "up") {
    trendSymbol = "↑";
    trendColor = "text-emerald-600";
  } else if (trend === "down") {
    trendSymbol = "↓";
    trendColor = "text-rose-500";
  } else {
    trendSymbol = "↔";
    trendColor = "text-slate-500 dark:text-slate-300";
  }

  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500 dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50">{value}</span>
        <span className={cx("text-[11px]", trendColor)}>{trendSymbol}</span>
      </div>
    </div>
  );
}

function SocialPlatformBadge({ platform }) {
  const map = {
    TikTok: "bg-black",
    YouTube: "bg-red-600",
    Instagram: "bg-gradient-to-tr from-purple-500 via-pink-500 to-yellow-500",
    Facebook: "bg-blue-600",
    Telegram: "bg-sky-600",
    WhatsApp: "bg-emerald-600"
  };
  const labelMap = {
    TikTok: "TT",
    YouTube: "YT",
    Instagram: "IG",
    Facebook: "f",
    Telegram: "TG",
    WhatsApp: "WA"
  };
  const bg = map[platform] || "bg-slate-900";
  const label = labelMap[platform] || (platform?.[0] ?? "?");
  return (
    <span className={cx("h-6 w-6 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center", bg)} title={platform}>
      {label}
    </span>
  );
}

function CreatorCard({ creator, saved, onToggleSave, onInvite, isRecommended, isSimilar, onQuickNavigate }) {
  const statusColor =
    creator.collabStatus === "Open to collabs"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
      : creator.collabStatus === "Invite only"
        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";

  return (
    <article className="h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 group ring-offset-2 focus-within:ring-2 ring-orange-500/50">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className={cx("h-12 w-12 rounded-2xl border flex items-center justify-center text-lg font-black transition-colors flex-shrink-0", creator.avatarBg)}>
            {creator.initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-[15px] font-bold dark:font-black text-slate-900 dark:text-slate-50 truncate leading-tight">{creator.name}</h3>
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 px-1.5 py-0.5 border border-slate-100 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-800/50 flex-shrink-0">
                {creator.tier}
              </span>
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 px-1.5 py-0.5 border border-slate-100 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-800/50 flex-shrink-0">
                Creator
              </span>
            </div>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">{creator.handle}</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-1 italic mt-1">{creator.tagline}</p>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          {isRecommended ? (
            <span className="px-2.5 py-1 rounded-full bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 animate-pulse">
              Recommended
            </span>
          ) : isSimilar ? (
            <span className="px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[9px] font-black uppercase tracking-widest">Similar match</span>
          ) : null}

          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">{creator.badge}</span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
            ⭐ {creator.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {creator.categories.map((cat) => (
          <span key={cat} className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-bold transition-colors">
            {cat}
          </span>
        ))}
      </div>

      {/* Regions + languages + platforms */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
          🌍 {creator.region}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
          🗣️ {creator.languages.join(", ")}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {creator.platforms.slice(0, 4).map((p) => (
            <SocialPlatformBadge key={p.platform} platform={p.platform} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-slate-100 dark:border-slate-800" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatItem label="Followers" value={`${(creator.followers / 1000).toFixed(1)}k`} trend={creator.followersTrend} />
        <StatItem label="Live dealz" value={creator.livesCompleted} trend={creator.livesTrend} />
        <StatItem label="Conv" value={`${creator.conversion.toFixed(1)}%`} trend={creator.orderTrend} />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col gap-3 mb-6">
        <div className="flex-1 bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1.5 shrink-0">
            <span className="text-md">✨</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#f77f00]">AI Compatibility Note</span>
          </div>
          <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">{creator.fitReason}</p>
        </div>

        <div className="flex flex-col gap-1.5 px-1 shrink-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-bold">Relationship</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold">{creator.relationship}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-bold">Last Active</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold">{creator.lastActive}</span>
          </div>
        </div>

        {creator.trustBadges?.length ? (
          <div className="flex flex-wrap gap-1.5 px-1">
            {creator.trustBadges.map((b) => (
              <span key={b} className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
                ✅ {b}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <div className={cx("px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5", statusColor)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {creator.collabStatus}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            className={cx(
              "px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
              saved
                ? "bg-slate-900 dark:bg-slate-700 text-white"
                : "bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-500 hover:text-slate-900 hover:border-slate-200"
            )}
            type="button"
          >
            {saved ? "Saved" : "+ Save"}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            className={cx(
              "flex-1 py-3 px-4 rounded-2xl text-white text-sm font-bold shadow-lg transition-all",
              creator.collabStatus === "Not seeking"
                ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                : "bg-[#f77f00] hover:bg-[#e26f00] shadow-orange-500/20 hover:shadow-orange-500/30"
            )}
            onClick={() => creator.collabStatus !== "Not seeking" && onInvite(creator)}
            disabled={creator.collabStatus === "Not seeking"}
            type="button"
          >
            Invite to campaign
          </button>

          {creator.isActivelyCollaborating && creator.hasActiveCampaigns ? (
            <button
              className="px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold"
              onClick={() => onQuickNavigate?.("my-creators")}
              title="View My Creators"
              type="button"
            >
              🚀
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function InviteModal({ creator, campaigns, onClose }) {
  const [message, setMessage] = useState(
    `Hi ${creator.name}, I’d like to collaborate with you on an upcoming MyLiveDealz campaign. Your audience fit looks strong for our offer.\n\nAre you available to discuss terms and timeline?`
  );

  // Mandatory campaign-level controls
  const [creatorUsageDecision, setCreatorUsageDecision] = useState("I will use a Creator");
  const [collabMode, setCollabMode] = useState("Open for Collabs");
  const [approvalMode, setApprovalMode] = useState("Manual");

  // Commercial terms
  const [model, setModel] = useState("Hybrid");
  const [budget, setBudget] = useState("250");
  const [currency, setCurrency] = useState("USD");
  const [deadline, setDeadline] = useState("7");

  // Campaign selection
  const [campaignId, setCampaignId] = useState(campaigns?.[0]?.id ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [simOutcome, setSimOutcome] = useState("sent"); // sent | rejected | changes | renegotiate

  useScrollLock(true);

  const canInvite = creatorUsageDecision === "I will use a Creator";

  const selectedCampaign = campaigns.find((c) => c.id === campaignId) || campaigns[0];

  const handleSendInvite = () => {
    if (!message.trim() || !canInvite) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => onClose(), 1600);
    }, 1200);
  };

  const outcomeCopy =
    simOutcome === "sent"
      ? "Invite sent!"
      : simOutcome === "rejected"
        ? "Creator declined"
        : simOutcome === "changes"
          ? "Changes requested"
          : "Renegotiation requested";

  const outcomeDesc =
    simOutcome === "sent"
      ? `${creator.name} has been notified. You can track the invite status in Proposals/Contracts.`
      : simOutcome === "rejected"
        ? `${creator.name} declined due to timing. Consider inviting another creator or adjusting deadlines.`
        : simOutcome === "changes"
          ? `${creator.name} requested changes to budget/deliverables. Continue in Negotiation Room.`
          : `${creator.name} wants to renegotiate payout terms. Continue in Negotiation Room.`;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="w-full md:max-w-2xl h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-transform duration-300 animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className={cx("h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors border", creator.avatarBg)}>
              {creator.initials}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Invite {creator.name}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300">{creator.region} · {creator.tier}</div>
            </div>
          </div>
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
              <div className={cx("h-16 w-16 rounded-full flex items-center justify-center mb-4", simOutcome === "sent" ? "bg-emerald-100 dark:bg-emerald-900/30" : simOutcome === "rejected" ? "bg-rose-100 dark:bg-rose-900/30" : "bg-amber-100 dark:bg-amber-900/30")}>
                <span className="text-3xl">{simOutcome === "sent" ? "🎉" : simOutcome === "rejected" ? "⛔" : "📝"}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{outcomeCopy}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">{outcomeDesc}</p>
            </div>
          ) : null}

          {/* Campaign context */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold dark:font-bold">Campaign</h3>
            <select
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-[#f77f00] transition-colors"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900">
                  {c.name}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500">Selected: <span className="font-extrabold text-slate-700 dark:text-slate-200">{selectedCampaign?.name}</span></div>
          </section>

          {/* Mandatory: Creator usage decision */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold dark:font-bold">Creator usage decision (mandatory)</h3>
            <div className="flex gap-2">
              {["I will use a Creator", "I will NOT use a Creator", "I am NOT SURE yet"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={cx(
                    "flex-1 whitespace-nowrap px-3 py-2 rounded-2xl border text-[12px] font-extrabold text-center transition-colors",
                    creatorUsageDecision === opt
                      ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/10 text-[#f77f00]"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
                  )}
                  onClick={() => setCreatorUsageDecision(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            {creatorUsageDecision === "I will NOT use a Creator" ? (
              <div className="mt-2 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300">
                Supplier becomes the Creator. Collaboration logic is skipped and you should proceed to Content Submission instead.
                This invite action is disabled.
              </div>
            ) : creatorUsageDecision === "I am NOT SURE yet" ? (
              <div className="mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 text-[11px] text-slate-600 dark:text-slate-300">
                You can create the campaign now and decide collaboration mode later, but you can still send a tentative invite.
              </div>
            ) : null}
          </section>

          {/* Mandatory: Collab mode */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold dark:font-bold">Collaboration mode (campaign-level)</h3>
            <div className="flex flex-wrap gap-1">
              {["Open for Collabs", "Invite-Only"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full text-[11px] border transition-colors font-extrabold",
                    collabMode === m
                      ? "bg-[#f77f00] border-[#f77f00] text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
                  )}
                  onClick={() => setCollabMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500">
              Default is <span className="font-extrabold">Open for Collabs</span>. Invite-Only keeps the campaign private.
            </div>
          </section>

          {/* Mandatory: Content approval */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold dark:font-bold">Content approval (campaign-level)</h3>
            <div className="flex flex-wrap gap-1">
              {["Manual", "Auto"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full text-[11px] border transition-colors font-extrabold",
                    approvalMode === m
                      ? "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white border-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
                  )}
                  onClick={() => setApprovalMode(m)}
                >
                  {m} Approval
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500">
              Manual: Supplier reviews before Admin. Auto: goes straight to Admin.
            </div>
          </section>

          {/* Commercial terms */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold dark:font-bold">Commercial terms (proposal)</h3>
            <div className="flex flex-wrap gap-1">
              {["Flat fee", "Commission", "Hybrid"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cx(
                    "px-2.5 py-1 rounded-full text-[11px] border transition-colors font-extrabold",
                    model === m
                      ? "bg-[#f77f00] border-[#f77f00] text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
                  )}
                  onClick={() => setModel(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-[1fr_0.7fr] gap-2">
              <div>
                <label className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 px-1">Budget</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-[#f77f00]"
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
                <label className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 px-1">Timeline</label>
                <select
                  className="mt-1 w-full border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-sm bg-white dark:bg-slate-900"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                >
                  <option className="bg-white dark:bg-slate-900" value="3">3 days</option>
                  <option className="bg-white dark:bg-slate-900" value="7">7 days</option>
                  <option className="bg-white dark:bg-slate-900" value="14">14 days</option>
                </select>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-slate-500">
              Budget in this invite is indicative. Final terms are agreed in Proposals/Contracts.
            </div>
          </section>

          {/* Message */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold">Invite message</h3>
            <textarea
              rows={5}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-400 transition-colors"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-300">
              Keep it concise. Creators can view your campaign brief, pinned offer, and tracking links.
            </p>
          </section>

          {/* Demo outcome selector (kept subtle) */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3">
            <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">Demo outcome</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[{ id: "sent", label: "Sent" }, { id: "rejected", label: "Creator rejects" }, { id: "changes", label: "Changes requested" }, { id: "renegotiate", label: "Renegotiation" }].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                    simOutcome === o.id
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  )}
                  onClick={() => setSimOutcome(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          <button
            className={cx(
              "w-full py-2.5 rounded-full text-white text-sm font-semibold transition-all",
              isSubmitting || !canInvite
                ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                : "bg-[#f77f00] hover:bg-[#e26f00]"
            )}
            onClick={() => {
              if (!canInvite) return;
              // simulate outcome mapping
              setIsSubmitting(true);
              setTimeout(() => {
                setIsSubmitting(false);
                setIsSuccess(true);
              }, 900);
            }}
            disabled={isSubmitting || !canInvite}
            type="button"
          >
            {isSubmitting ? "Sending invite..." : canInvite ? "Send invite" : "Invite disabled"}
          </button>

          {/* Permission comment */}
          <div className="text-[10px] text-slate-500">
            Permission note: Only Supplier Owner/Admin roles should be able to send invites that create proposal/contract obligations.
          </div>
        </div>
      </div>
    </div>
  );
}

function AiDiscoveryDialog({ creators, onClose, onViewCreator }) {
  const [stage, setStage] = useState("scanning"); // scanning | analyzing | results

  useEffect(() => {
    const t1 = setTimeout(() => setStage("analyzing"), 1200);
    const t2 = setTimeout(() => setStage("results"), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useScrollLock(true);

  const recommendedCreators = useMemo(() => {
    // Demo: pick top creators by fitScore then rating
    const arr = [...creators];
    arr.sort((a, b) => {
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.followers - a.followers;
    });
    return arr.slice(0, 3);
  }, [creators]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">AI Creator Discovery</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Supplier Intelligence™</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" type="button">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {stage === "scanning" ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="text-2xl">🔍</div>
              <div>
                <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">Scanning Creator Directory…</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Matching creators to your products, category, and region.</p>
              </div>
            </div>
          ) : null}

          {stage === "analyzing" ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-3xl animate-bounce">🧠</div>
              <div>
                <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">Analyzing Fit & Performance…</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Checking conversion history, audience alignment, and delivery reliability.</p>
              </div>
            </div>
          ) : null}

          {stage === "results" ? (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3 flex gap-2">
                <span className="text-lg">✨</span>
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Analysis complete</p>
                  <p className="text-sm text-emerald-900/80 dark:text-emerald-300 font-medium">Found {recommendedCreators.length} high-potential creators for your next campaign.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {recommendedCreators.map((c) => (
                  <div
                    key={c.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cx("h-10 w-10 rounded-full border flex items-center justify-center font-bold text-sm", c.avatarBg)}>
                        {c.initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm dark:text-slate-100 truncate">{c.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.categories.join(", ")} · {c.region}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onViewCreator(c)}
                      className="text-xs font-bold text-[#f77f00] hover:bg-orange-50 dark:hover:bg-orange-900/20 px-3 py-1.5 rounded-full transition-colors"
                      type="button"
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {stage === "results" ? (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 flex justify-end">
            <button onClick={onClose} className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold text-sm hover:bg-slate-800 transition-colors" type="button">
              Done
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SupplierCreatorDirectoryPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [languageFilter, setLanguageFilter] = useState("All");
  const [minFollowers, setMinFollowers] = useState("");
  const [minRating, setMinRating] = useState("Any");
  const [minTier, setMinTier] = useState("Any");

  const [viewTab, setViewTab] = useState("all"); // all | saved | new
  const [sortBy, setSortBy] = useState("relevance");
  const [presetFilter, setPresetFilter] = useState("none"); // none | live-first | faith | high-ticket

  const [aiHint, setAiHint] = useState("");
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [savedCreatorIds, setSavedCreatorIds] = useState([]);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  const [dataState, setDataState] = useState("loading"); // loading | ready | error

  useEffect(() => {
    const t = setTimeout(() => setDataState("ready"), 320);
    return () => clearTimeout(t);
  }, []);

  const creators = useMemo(
    () => [
      {
        id: "CR-001",
        name: "Lilian Beauty Plug",
        handle: "@lilianbeauty",
        initials: "LB",
        avatarBg: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-200 dark:border-pink-800",
        tagline: "Skincare routines, live tutorials, and product reviews.",
        categories: ["Beauty", "Skincare"],
        followers: 128000,
        livesCompleted: 22,
        ctr: 3.9,
        conversion: 2.4,
        rating: 4.8,
        tier: "Gold",
        badge: "Top Creator",
        collabStatus: "Open to collabs",
        region: "East Africa",
        languages: ["English", "Swahili"],
        relationship: "2 past campaigns",
        fitScore: 94,
        fitReason: "Strong Beauty conversion with clear CTA cadence. Great fit for time-bound Dealz.",
        followersTrend: "up",
        livesTrend: "up",
        orderTrend: "flat",
        trustBadges: ["Verified", "On-time delivery"],
        lastActive: "Active this week",
        platforms: [{ platform: "TikTok" }, { platform: "Instagram" }, { platform: "WhatsApp" }],
        isActivelyCollaborating: true,
        hasActiveCampaigns: true
      },
      {
        id: "CR-002",
        name: "TechWithBrian",
        handle: "@techwithbrian",
        initials: "TB",
        avatarBg: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800",
        tagline: "Unboxings, EV gadgets and smart home.",
        categories: ["Tech", "Gadgets", "EV"],
        followers: 210000,
        livesCompleted: 31,
        ctr: 4.4,
        conversion: 2.9,
        rating: 4.7,
        tier: "Gold",
        badge: "Top Creator",
        collabStatus: "Invite only",
        region: "Pan-Africa",
        languages: ["English"],
        relationship: "1 Tech Friday series",
        fitScore: 90,
        fitReason: "High CTR in Tech. Strong live demo rhythm and conversion consistency.",
        followersTrend: "up",
        livesTrend: "up",
        orderTrend: "up",
        trustBadges: ["Verified", "Low disputes"],
        lastActive: "Live 2 days ago",
        platforms: [{ platform: "YouTube" }, { platform: "TikTok" }, { platform: "Telegram" }],
        isActivelyCollaborating: true,
        hasActiveCampaigns: false
      },
      {
        id: "CR-003",
        name: "Grace Faith Wellness",
        handle: "@gracefaithwellness",
        initials: "GW",
        avatarBg: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800",
        tagline: "Faith-compatible wellness, calm routines, and lifestyle talk.",
        categories: ["Faith", "Wellness"],
        followers: 54000,
        livesCompleted: 14,
        ctr: 2.8,
        conversion: 3.1,
        rating: 4.9,
        tier: "Silver",
        badge: "High Trust",
        collabStatus: "Open to collabs",
        region: "East Africa",
        languages: ["English"],
        relationship: "New (no campaigns yet)",
        fitScore: 88,
        fitReason: "High retention and trust. Strong fit for faith-friendly product lines.",
        followersTrend: "up",
        livesTrend: "flat",
        orderTrend: "flat",
        trustBadges: ["Low return rate"],
        lastActive: "Active this week",
        platforms: [{ platform: "Facebook" }, { platform: "WhatsApp" }],
        isActivelyCollaborating: false,
        hasActiveCampaigns: true
      },
      {
        id: "CR-004",
        name: "StyleByAma",
        handle: "@stylebyama",
        initials: "SA",
        avatarBg: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800",
        tagline: "Try-ons, street style, and live haul sessions.",
        categories: ["Fashion"],
        followers: 72000,
        livesCompleted: 12,
        ctr: 3.1,
        conversion: 2.2,
        rating: 4.3,
        tier: "Silver",
        badge: "Style Specialist",
        collabStatus: "Open to collabs",
        region: "West Africa",
        languages: ["English", "French"],
        relationship: "New",
        fitScore: 76,
        fitReason: "Good reach and styling authority. Best for apparel launches and bundles.",
        followersTrend: "up",
        livesTrend: "up",
        orderTrend: "up",
        trustBadges: [],
        lastActive: "Active this month",
        platforms: [{ platform: "Instagram" }, { platform: "TikTok" }],
        isActivelyCollaborating: false,
        hasActiveCampaigns: false
      },
      {
        id: "CR-005",
        name: "NewWave Creator",
        handle: "@newwavecreator",
        initials: "NW",
        avatarBg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-200 dark:border-slate-800",
        tagline: "Short-form reviews and EV accessories.",
        categories: ["Tech", "EV"],
        followers: 12000,
        livesCompleted: 3,
        ctr: 4.0,
        conversion: 1.8,
        rating: 4.2,
        tier: "Bronze",
        badge: "Rising",
        collabStatus: "Open to collabs",
        region: "East Africa",
        languages: ["English"],
        relationship: "New",
        fitScore: 69,
        fitReason: "Rising creator with strong hooks; needs tighter offer framing to lift conversion.",
        followersTrend: "flat",
        livesTrend: "up",
        orderTrend: "flat",
        trustBadges: [],
        lastActive: "Active this week",
        platforms: [{ platform: "TikTok" }],
        isActivelyCollaborating: false,
        hasActiveCampaigns: false
      }
    ],
    []
  );

  const supplierCampaigns = useMemo(
    () => [
      { id: "CAMP-11", name: "Beauty Flash Dealz" },
      { id: "CAMP-07", name: "Tech Friday Mega" },
      { id: "CAMP-21", name: "GlowUp Serum Promo" },
      { id: "CAMP-33", name: "Repair Booking Offer" }
    ],
    []
  );

  const handleFilterChange = (setter, val) => {
    setIsTransitioning(true);
    setter(val);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const inName = c.name.toLowerCase().includes(q);
        const inHandle = c.handle.toLowerCase().includes(q);
        const inTagline = c.tagline.toLowerCase().includes(q);
        const inCategory = c.categories.some((k) => k.toLowerCase().includes(q));
        if (!inName && !inHandle && !inTagline && !inCategory) return false;
      }

      if (categoryFilter !== "All" && !c.categories.includes(categoryFilter)) return false;
      if (regionFilter !== "All" && c.region !== regionFilter) return false;
      if (languageFilter !== "All" && !c.languages.includes(languageFilter)) return false;

      if (minFollowers) {
        const min = Number(minFollowers) || 0;
        if (c.followers < min) return false;
      }

      if (minRating !== "Any") {
        const mr = Number(minRating);
        if (c.rating < mr) return false;
      }

      if (minTier !== "Any") {
        const order = { Gold: 3, Silver: 2, Bronze: 1 };
        if ((order[c.tier] || 0) < (order[minTier] || 0)) return false;
      }

      // Supplier should generally not see creators who are not seeking.
      // (In a fuller version, you can add a toggle to show unavailable profiles.)
      if (c.collabStatus === "Not seeking") return false;

      return true;
    });
  }, [creators, search, categoryFilter, regionFilter, languageFilter, minFollowers, minRating, minTier]);

  const presetFilteredCreators = useMemo(() => {
    let result = filteredCreators;
    if (presetFilter === "live-first") {
      result = result.filter((c) => c.livesCompleted >= 10);
    } else if (presetFilter === "faith") {
      result = result.filter((c) => c.categories.includes("Faith"));
    } else if (presetFilter === "high-ticket") {
      result = result.filter((c) => c.conversion >= 2.8);
    }
    return result;
  }, [filteredCreators, presetFilter]);

  const tabFilteredCreators = useMemo(() => {
    let result = presetFilteredCreators;
    if (viewTab === "saved") {
      result = result.filter((c) => savedCreatorIds.includes(c.id));
    } else if (viewTab === "new") {
      result = result.filter((c) => c.badge === "Rising" || c.relationship === "New");
    }
    return result;
  }, [presetFilteredCreators, viewTab, savedCreatorIds]);

  const sortedCreators = useMemo(() => {
    const arr = [...tabFilteredCreators];
    arr.sort((a, b) => {
      if (sortBy === "followers") return b.followers - a.followers;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "lives") return b.livesCompleted - a.livesCompleted;
      if (sortBy === "ctr") return b.ctr - a.ctr;
      if (sortBy === "conversion") return b.conversion - a.conversion;
      // relevance
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.followers - a.followers;
    });
    return arr;
  }, [tabFilteredCreators, sortBy]);

  const toggleSave = (creatorId) => {
    setSavedCreatorIds((prev) => (prev.includes(creatorId) ? prev.filter((x) => x !== creatorId) : [...prev, creatorId]));
  };

  const openInvite = (creator) => {
    setSelectedCreator(creator);
    setShowInvite(true);
  };

  const closeInvite = () => {
    setShowInvite(false);
    setSelectedCreator(null);
  };

  const togglePreset = (preset) => {
    setPresetFilter((current) => (current === preset ? "none" : preset));
  };

  const handleAiSuggest = () => {
    // Mirror behavior: show AI dialog + optionally set hint after closing
    setIsAiDialogOpen(true);
    setAiHint("Pick 2 creators: one high-CTR for reach, one high-conversion for revenue. Keep approval turnaround under 6 hours for best outcomes.");
  };

  const headerRight = (
    <>
      <span className="hidden md:inline-flex px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold border border-slate-800">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} /> Orange + Black
      </span>
      <button
        type="button"
        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-[11px] font-extrabold"
        onClick={() => setDataState((s) => (s === "error" ? "ready" : "error"))}
        title="Simulate error state (demo)"
      >
        ⚠️ Test
      </button>
    </>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <PageHeader title="Creator Directory" subtitle="Supplier · Discover creators for Live Sessionz and Shoppable Adz" right={headerRight} />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-8 overflow-y-auto overflow-x-hidden">
        <div className="w-full space-y-4">
          {/* Top Search Bar */}
          <div className="w-full max-w-full bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative w-full group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f77f00] transition-colors">🔍</span>
              <input
                className="w-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border-2 border-transparent focus:border-[#f77f00] dark:focus:border-[#f77f00] rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-bold"
                placeholder="Search by creator name, handle, category or niche..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className="w-full md:w-auto px-8 py-3 rounded-2xl bg-[#f77f00] hover:bg-[#e26f00] text-white text-sm font-black shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
              onClick={handleAiSuggest}
              type="button"
            >
              Suggest creators
            </button>
          </div>

          {/* Horizontal Filters */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Category</label>
                <select
                  className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-[#f77f00] outline-none transition-all cursor-pointer appearance-none"
                  value={categoryFilter}
                  onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
                >
                  {[
                    "All",
                    "Beauty",
                    "Skincare",
                    "Tech",
                    "Gadgets",
                    "EV",
                    "Faith",
                    "Wellness",
                    "Fashion"
                  ].map((opt) => (
                    <option key={opt} value={opt} className="bg-white dark:bg-slate-900">
                      {opt === "All" ? "All Categories" : opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[150px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Region</label>
                <select
                  className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-[#f77f00] outline-none transition-all cursor-pointer appearance-none"
                  value={regionFilter}
                  onChange={(e) => handleFilterChange(setRegionFilter, e.target.value)}
                >
                  {[
                    "All",
                    "East Africa",
                    "West Africa",
                    "Central Africa",
                    "Southern Africa",
                    "North Africa",
                    "Pan-Africa",
                    "Global"
                  ].map((opt) => (
                    <option key={opt} value={opt} className="bg-white dark:bg-slate-900">
                      {opt === "All" ? "All Regions" : opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[150px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Language</label>
                <select
                  className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-[#f77f00] outline-none transition-all cursor-pointer appearance-none"
                  value={languageFilter}
                  onChange={(e) => handleFilterChange(setLanguageFilter, e.target.value)}
                >
                  {[
                    "All",
                    "English",
                    "French",
                    "Arabic",
                    "Swahili",
                    "Portuguese",
                    "Chinese (Simplified)",
                    "Spanish"
                  ].map((opt) => (
                    <option key={opt} value={opt} className="bg-white dark:bg-slate-900">
                      {opt === "All" ? "All Languages" : opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Followers Min</label>
                <input
                  type="number"
                  className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-[#f77f00] outline-none transition-all"
                  placeholder="e.g. 5000"
                  value={minFollowers}
                  onChange={(e) => handleFilterChange(setMinFollowers, e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Rating</label>
                <select
                  className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-[#f77f00] outline-none transition-all cursor-pointer appearance-none"
                  value={minRating}
                  onChange={(e) => handleFilterChange(setMinRating, e.target.value)}
                >
                  <option value="Any" className="bg-white dark:bg-slate-900">Any Rating</option>
                  <option value="4" className="bg-white dark:bg-slate-900">★ 4.0+</option>
                  <option value="4.5" className="bg-white dark:bg-slate-900">★ 4.5+</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Tier</label>
                <select
                  className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-[#f77f00] outline-none transition-all cursor-pointer appearance-none"
                  value={minTier}
                  onChange={(e) => handleFilterChange(setMinTier, e.target.value)}
                >
                  <option value="Any" className="bg-white dark:bg-slate-900">Any Tier</option>
                  <option value="Gold" className="bg-white dark:bg-slate-900">Gold</option>
                  <option value="Silver" className="bg-white dark:bg-slate-900">Silver</option>
                  <option value="Bronze" className="bg-white dark:bg-slate-900">Bronze</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-[300px]">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 px-1">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  <PresetChip label="Live-first" active={presetFilter === "live-first"} onClick={() => togglePreset("live-first")} />
                  <PresetChip label="Faith-friendly" active={presetFilter === "faith"} onClick={() => togglePreset("faith")} />
                  <PresetChip label="High-conversion" active={presetFilter === "high-ticket"} onClick={() => togglePreset("high-ticket")} />

                  <button
                    className="ml-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#f77f00] hover:border-[#f77f00] transition-all"
                    onClick={() => {
                      setIsTransitioning(true);
                      setSearch("");
                      setCategoryFilter("All");
                      setRegionFilter("All");
                      setLanguageFilter("All");
                      setMinFollowers("");
                      setMinRating("Any");
                      setMinTier("Any");
                      setSortBy("relevance");
                      setPresetFilter("none");
                      setViewTab("all");
                      setTimeout(() => setIsTransitioning(false), 300);
                    }}
                    type="button"
                  >
                    Reset all
                  </button>
                </div>
              </div>
            </div>
          </div>

          {aiHint ? (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 max-w-2xl">
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-3xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-xl">✨</span>
                  <div>
                    <p className="text-[10px] font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest mb-0.5">AI Hint</p>
                    <p className="text-xs text-orange-900/80 dark:text-orange-300 font-medium leading-relaxed">{aiHint}</p>
                  </div>
                </div>
                <button onClick={() => setAiHint("")} className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded-full transition-colors" type="button">
                  <span className="text-orange-500 font-bold">✕</span>
                </button>
              </div>
            </div>
          ) : null}

          {dataState === "error" ? (
            <div className="rounded-3xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/10 p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center">⚠️</div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Creator directory failed to load</div>
                  <div className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                    Check network connectivity or try again. (Demo error state)
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-full bg-slate-900 text-white text-[11px] font-extrabold"
                      onClick={() => setDataState("ready")}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-full border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-[11px] font-extrabold text-rose-700 dark:text-rose-300"
                      onClick={() => setIsAiDialogOpen(true)}
                    >
                      Open AI helper
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={cx("transition-opacity duration-300", isTransitioning ? "opacity-0" : "opacity-100")}>
          <section className="flex-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  {[{ id: "all", label: "all" }, { id: "saved", label: "saved" }, { id: "new", label: "new" }].map((t) => (
                    <button
                      key={t.id}
                      className={cx(
                        "px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                        viewTab === t.id
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      )}
                      onClick={() => {
                        setIsTransitioning(true);
                        setViewTab(t.id);
                        setTimeout(() => setIsTransitioning(false), 300);
                      }}
                      type="button"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="h-4 border-l border-slate-200 dark:border-slate-700" />
                <span className="text-xs text-slate-400 font-medium">
                  <span className="text-slate-900 dark:text-slate-100 font-black">{sortedCreators.length}</span> results
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[10px] uppercase font-black text-slate-400">Sort By:</label>
                <select
                  className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none cursor-pointer appearance-none pr-6"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="relevance" className="bg-white dark:bg-slate-900">Relevance</option>
                  <option value="followers" className="bg-white dark:bg-slate-900">Followers</option>
                  <option value="rating" className="bg-white dark:bg-slate-900">Top Rated</option>
                  <option value="lives" className="bg-white dark:bg-slate-900">Live Dealz</option>
                  <option value="ctr" className="bg-white dark:bg-slate-900">High CTR</option>
                  <option value="conversion" className="bg-white dark:bg-slate-900">High Conversion</option>
                </select>
              </div>
            </div>

            {dataState === "ready" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                  {sortedCreators.map((c) => (
                    <CreatorCard
                      key={c.id}
                      creator={c}
                      saved={savedCreatorIds.includes(c.id)}
                      onToggleSave={() => toggleSave(c.id)}
                      onInvite={openInvite}
                      isRecommended={c.badge === "Top Creator" && c.fitScore >= 90}
                      isSimilar={c.categories.includes("Beauty")}
                      onQuickNavigate={(dest) => {
                        // In real app: navigate to /supplier/collabs/my-creators
                        setAiHint(dest === "my-creators" ? "Tip: Your saved creators appear on the My Creators page with active contract status." : aiHint);
                      }}
                    />
                  ))}
                </div>

                {sortedCreators.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[16px] p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">No matching creators</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-300 max-w-sm mx-auto">
                      Try adjusting filters or search terms to find more creators.
                    </p>
                    <button
                      className="mt-6 px-6 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-gray-50 dark:bg-slate-950"
                      onClick={() => {
                        setIsTransitioning(true);
                        setSearch("");
                        setCategoryFilter("All");
                        setRegionFilter("All");
                        setLanguageFilter("All");
                        setMinFollowers("");
                        setMinRating("Any");
                        setMinTier("Any");
                        setSortBy("relevance");
                        setPresetFilter("none");
                        setViewTab("all");
                        setTimeout(() => setIsTransitioning(false), 300);
                      }}
                      type="button"
                    >
                      Clear search
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </main>

      {showInvite && selectedCreator ? (
        <InviteModal creator={selectedCreator} campaigns={supplierCampaigns} onClose={closeInvite} />
      ) : null}

      {isAiDialogOpen ? (
        <AiDiscoveryDialog
          creators={sortedCreators.length ? sortedCreators : creators}
          onClose={() => setIsAiDialogOpen(false)}
          onViewCreator={(c) => {
            setIsAiDialogOpen(false);
            openInvite(c);
          }}
        />
      ) : null}
    </div>
  );
}
