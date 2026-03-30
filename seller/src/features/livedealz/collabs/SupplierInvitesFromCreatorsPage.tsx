import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const ORANGE = "#f77f00";
const GENERAL_COLLAB_TITLE = "General collaboration invite";
const NO_CAMPAIGN_NOTE = "No specific campaign attached";
const ROUTES = {
  creatorProfile: "/mldz/creators/profile",
  myCreators: "/mldz/creators/my-creators",
  messages: "/messages",
};

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function money(currency, value) {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

function hasSpecificCampaign(invite) {
  return Boolean(invite?.campaign && invite.campaign.trim());
}

function getInviteContextTitle(invite) {
  return hasSpecificCampaign(invite) ? invite.campaign : GENERAL_COLLAB_TITLE;
}

function getInviteContextSubLabel(invite) {
  return hasSpecificCampaign(invite) ? null : NO_CAMPAIGN_NOTE;
}

const INVITES = [
  {
    id: "INV-C101",
    creator: "Lilian Beauty Plug",
    initials: "LB",
    campaign: "GlowUp Serum Promo",
    inviteType: "Live + Shoppable Adz",
    category: "Beauty",
    region: "East Africa",
    baseFee: 320,
    currency: "USD",
    commissionPct: 4,
    estimatedValue: 950,
    status: "New",
    daysAgo: 0,
    expiresIn: "3 days",
    fitScore: 92,
    fitReason: "Your Beauty products align with my audience. I convert strongly on skincare routines.",
    messageShort: "I’d love to host a 60 min Beauty Flash live and run 2 shoppable ad creatives for your serum.",
    lastActivity: "New invite · 2h ago",
    creatorBio:
      "Beauty creator focused on live tutorials and routine-based storytelling. Strong conversion when offers are pinned early.",
    creatorRating: 4.8,
  },
  {
    id: "INV-C102",
    creator: "TechWithBrian",
    initials: "TB",
    campaign: "Tech Friday Mega",
    inviteType: "Live series (3 episodes)",
    category: "Tech",
    region: "Africa / Asia",
    baseFee: 900,
    currency: "USD",
    commissionPct: 0,
    estimatedValue: 1600,
    status: "New",
    daysAgo: 1,
    expiresIn: "5 days",
    fitScore: 86,
    fitReason: "I have a proven format for mid-ticket gadgets and bundle closes.",
    messageShort: "I can host a 3-episode Tech Friday series if we align on products and delivery timeline.",
    lastActivity: "New invite · Yesterday",
    creatorBio: "Tech creator specializing in live demos, unboxings and bundle-driven closes.",
    creatorRating: 4.7,
  },
  {
    id: "INV-C103",
    creator: "Grace Faith Wellness",
    initials: "GW",
    campaign: "Faith & Wellness Morning Dealz",
    inviteType: "Morning lives",
    category: "Faith-compatible",
    region: "Africa",
    baseFee: 260,
    currency: "USD",
    commissionPct: 0,
    estimatedValue: 520,
    status: "Accepted",
    daysAgo: 3,
    expiresIn: "Starts next week",
    fitScore: 88,
    fitReason: "Your offers align with faith-based values. My audience responds well to trust-first messaging.",
    messageShort: "Thanks for accepting. Let’s finalize dates, deliverables and CTA phrasing.",
    lastActivity: "Accepted · 3 days ago",
    creatorBio: "Faith-compatible wellness creator with calm, trust-first delivery.",
    creatorRating: 4.9,
  },
  {
    id: "INV-C104",
    creator: "EV Gadgets Daily",
    initials: "EG",
    campaign: "EV Accessories Launch",
    inviteType: "Shoppable Adz + Live",
    category: "EV",
    region: "Global",
    baseFee: 300,
    currency: "USD",
    commissionPct: 3,
    estimatedValue: 640,
    status: "Declined",
    daysAgo: 7,
    expiresIn: "Closed",
    fitScore: 70,
    fitReason: "Good niche fit, but your current campaigns are scheduled for other categories.",
    messageShort: "Thanks for considering. Happy to revisit next quarter.",
    lastActivity: "Declined · 7 days ago",
    creatorBio: "EV accessory creator with a focus on charging, interior tech and practical demos.",
    creatorRating: 4.3,
  },
  {
    id: "INV-C105",
    creator: "Ama Style Studio",
    initials: "AS",
    campaign: "",
    inviteType: "Creator partnership",
    category: "Fashion",
    region: "Africa / GCC",
    baseFee: 650,
    currency: "USD",
    commissionPct: 6,
    estimatedValue: 950,
    status: "New",
    daysAgo: 0,
    expiresIn: "4 days",
    fitScore: 84,
    fitReason: "Strong creator-brand fit even before campaign scoping.",
    messageShort: "I want to collaborate with you and shape the best live or shoppable format together.",
    lastActivity: "New invite · 40m ago",
    creatorBio:
      "Fashion creator focused on styling, try-ons, and short-form demand generation. Open to shaping the right campaign model together.",
    creatorRating: 4.6,
  },
  {
    id: "INV-C106",
    creator: "HomeWithRuth",
    initials: "HR",
    campaign: "Living Essentials Weekend Push",
    inviteType: "Shoppable Adz",
    category: "Home & Living",
    region: "East Africa",
    baseFee: 180,
    currency: "USD",
    commissionPct: 5,
    estimatedValue: 420,
    status: "Declined",
    daysAgo: 10,
    expiresIn: "Closed",
    fitScore: 74,
    fitReason: "Good fit, but the response window closed before the brand acted.",
    messageShort: "Please let me know if you would like to reopen this later with a refreshed scope.",
    lastActivity: "Declined · 10 days ago",
    creatorBio: "Home & living creator with short-form product explainers and calm demo style.",
    creatorRating: 4.4,
  },
];

const TABS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

const STATUS_FILTERS = ["All", "New", "Accepted", "Declined"];
const CATEGORIES = ["All", "Beauty", "Tech", "Faith-compatible", "EV", "Fashion", "Home & Living"];

let __toastTimer = null;

function toast(message) {
  window.dispatchEvent(new CustomEvent("supplier-creator-invites-toast", { detail: message }));
}

function ToastArea() {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    function handler(event) {
      setMessage(event.detail);
      if (__toastTimer) window.clearTimeout(__toastTimer);
      __toastTimer = window.setTimeout(() => setMessage(null), 1800);
    }
    window.addEventListener("supplier-creator-invites-toast", handler);
    return () => window.removeEventListener("supplier-creator-invites-toast", handler);
  }, []);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
      <div className="px-4 py-2 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold shadow-lg border border-slate-800 dark:border-slate-200">
        {message}
      </div>
    </div>
  );
}

function Spinner({ size = 14 }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}

function useAsyncAction() {
  const [isPending, setIsPending] = useState(false);

  const run = async (fn, opts) => {
    setIsPending(true);
    try {
      await fn();
      if (opts?.successMessage) toast(opts.successMessage);
    } catch (error) {
      toast(opts?.errorMessage || "Action failed");
    } finally {
      setIsPending(false);
    }
  };

  return { isPending, run };
}

function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

function PageHeader({ title, badge }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/85 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200/70 dark:border-slate-800">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500 font-semibold">Supplier App</div>
          <h1 className="truncate text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-50">{title}</h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
      </div>
    </header>
  );
}

function Pill({ children, tone = "neutral" }) {
  const styles = {
    neutral: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700",
    brand: "text-white border-transparent",
    good: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    warn: "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    bad: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  };

  return (
    <span className={cx("inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold", styles[tone])} style={tone === "brand" ? { background: ORANGE } : undefined}>
      {children}
    </span>
  );
}

function FieldShell({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</span>
        {hint ? <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20 ${props.className || ""}`}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={`w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20 ${props.className || ""}`}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20 ${props.className || ""}`}
    />
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">{label}</div>
      <div className="mt-1 text-xs font-bold text-white">{value}</div>
    </div>
  );
}

function NegotiationDrawer({ open, onClose, invite, onSendCounter }) {
  useScrollLock(open);

  const [approvalMode, setApprovalMode] = useState("Manual");
  const [pricingModel, setPricingModel] = useState("Hybrid");
  const [budget, setBudget] = useState("350");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [timeline, setTimeline] = useState("7");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setApprovalMode("Manual");
    setPricingModel(invite?.commissionPct ? "Hybrid" : "Flat fee");
    setBudget(String(invite?.baseFee || 350));
    setCurrencyCode(invite?.currency || "USD");
    setTimeline("7");
    setMessage(
      invite
        ? `Hi ${invite.creator}, thank you for reaching out about ${getInviteContextTitle(invite)}. I’m interested. Here is a counter structure covering scope, commercial terms, timing, and approval workflow.`
        : ""
    );
  }, [open, invite]);

  if (!open || !invite) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">
              {invite.initials}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Negotiation</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{invite.creator}</div>
              <div className="text-[11px] text-slate-500 truncate">{getInviteContextTitle(invite)}</div>
            </div>
          </div>
          <button
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Campaign rules (auto-set)</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold">Creator usage: I will use a Creator</span>
              <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold">Collab mode: Invite-Only</span>
            </div>
            {!hasSpecificCampaign(invite) ? (
              <div className="mt-2 inline-flex items-center rounded-full border border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1 text-[10px] font-black text-[#f77f00]">
                {NO_CAMPAIGN_NOTE}
              </div>
            ) : null}
            <div className="mt-2 text-[11px] text-slate-500">Manual approval means you review creator assets before Admin review. Auto skips supplier review.</div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Content approval mode</div>
            <div className="flex flex-wrap gap-2">
              {["Manual", "Auto"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                    approvalMode === mode
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  )}
                  onClick={() => setApprovalMode(mode)}
                >
                  {mode} approval
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Commercial terms (counter)</div>
            <div className="flex flex-wrap gap-2">
              {["Flat fee", "Commission", "Hybrid"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-[11px] font-extrabold",
                    pricingModel === mode
                      ? "bg-[#f77f00] border-[#f77f00] text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  )}
                  onClick={() => setPricingModel(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-[1fr_0.7fr] gap-2">
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Budget</div>
                <div className="flex gap-2">
                  <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="h-10" />
                  <Select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} className="w-[92px] h-10 px-2">
                    <option value="USD">USD</option>
                    <option value="UGX">UGX</option>
                    <option value="EUR">EUR</option>
                  </Select>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Timeline</div>
                <Select value={timeline} onChange={(e) => setTimeline(e.target.value)} className="h-10 px-2">
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                </Select>
              </div>
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Message</div>
            <TextArea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a counter proposal message…"
            />
            <div className="mt-1 text-[11px] text-slate-500">
              This counter will flow into the supplier-side proposal / contract workflow after collaboration is accepted.
            </div>
          </section>

          <div className="text-[10px] text-slate-500">
            Permission note: Only Supplier Owners/Admins should submit counters that create binding proposal or contract commitments.
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            className="w-full py-2.5 rounded-full bg-[#f77f00] text-white text-sm font-extrabold hover:bg-[#e26f00] disabled:opacity-60"
            onClick={() => {
              onSendCounter?.({
                inviteId: invite.id,
                pricingModel,
                budget,
                currencyCode,
                approvalMode,
              });
              toast(`Counter sent to ${invite.creator} · ${pricingModel} · ${currencyCode}${budget} · ${approvalMode}`);
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

function ProposalDrawer({ open, onClose, invite, onSendProposal }) {
  useScrollLock(open);

  const [linkedContext, setLinkedContext] = useState("invite");
  const [scope, setScope] = useState("Hybrid");
  const [pricingModel, setPricingModel] = useState("Hybrid");
  const [approvalMode, setApprovalMode] = useState("Manual");
  const [proposalTitle, setProposalTitle] = useState("");
  const [deliverables, setDeliverables] = useState([
    "1 live session with pinned offer moments",
    "3 short-form teaser assets",
    "Post-live recap and conversion push",
  ]);
  const [proposedFee, setProposedFee] = useState("");
  const [commission, setCommission] = useState("");
  const [preferredStart, setPreferredStart] = useState("2026-03-24");
  const [deliveryDate, setDeliveryDate] = useState("2026-04-04");
  const [responseBy, setResponseBy] = useState("2026-03-23");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState([
    { id: "deck", name: "campaign-brief.pdf", sizeLabel: "1.3 MB", typeLabel: "PDF" },
    { id: "rates", name: "creator-requirements.docx", sizeLabel: "320 KB", typeLabel: "DOCX" },
  ]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);
  const [banner, setBanner] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open || !invite) return;
    setLinkedContext("invite");
    setScope(hasSpecificCampaign(invite) ? invite.inviteType : "Creator partnership");
    setPricingModel(invite.commissionPct ? "Hybrid" : "Flat fee");
    setApprovalMode("Manual");
    setProposalTitle(`${invite.creator} x Supplier Collaboration Proposal`);
    setDeliverables([
      "1 live session with pinned offer moments",
      "3 short-form teaser assets",
      hasSpecificCampaign(invite)
        ? `Deliver around ${getInviteContextTitle(invite)} with creator-led conversion pushes`
        : "Shape the campaign scope collaboratively and define execution format",
    ]);
    setProposedFee(String(invite.baseFee || 0));
    setCommission(invite.commissionPct ? String(invite.commissionPct) : "");
    setPreferredStart("2026-03-24");
    setDeliveryDate("2026-04-04");
    setResponseBy("2026-03-23");
    setNotes(
      hasSpecificCampaign(invite)
        ? `Proposal anchored to ${getInviteContextTitle(invite)} after accepted creator invite.`
        : `Proposal opened after accepted general collaboration invite with no fixed campaign attached.`
    );
    setAttachments([
      { id: "deck", name: "campaign-brief.pdf", sizeLabel: "1.3 MB", typeLabel: "PDF" },
      { id: "rates", name: "creator-requirements.docx", sizeLabel: "320 KB", typeLabel: "DOCX" },
    ]);
    setSavingDraft(false);
    setSendingProposal(false);
    setBanner(null);
  }, [open, invite]);

  const canSend =
    !!invite &&
    proposalTitle.trim().length > 0 &&
    deliverables.some((item) => item.trim().length > 0) &&
    (proposedFee.trim().length > 0 || commission.trim().length > 0);

  function updateDeliverable(index, value) {
    setDeliverables((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addDeliverable() {
    setDeliverables((prev) => [...prev, ""]);
  }

  function removeDeliverable(index) {
    setDeliverables((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function addMockAttachment() {
    setAttachments((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: `proposal-attachment-${prev.length + 1}.pdf`,
        sizeLabel: "760 KB",
        typeLabel: "PDF",
      },
    ]);
  }

  function removeAttachment(id) {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }

  async function saveDraft() {
    setSavingDraft(true);
    setBanner(null);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setSavingDraft(false);
    setBanner({
      tone: "info",
      title: "Proposal draft saved",
      text: `Your draft proposal for ${invite?.creator || "this creator"} is ready to revisit.`,
    });
  }

  async function sendProposal() {
    if (!canSend) return;
    setSendingProposal(true);
    setBanner(null);
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    setSendingProposal(false);
    setBanner({
      tone: "success",
      title: "Proposal sent",
      text: `${invite?.creator || "The creator"} will receive your proposal with linked context, scope, deliverables, pricing and timeline.`,
    });
    onSendProposal?.(invite);
  }

  if (!open || !invite) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] flex justify-end" onClick={onClose}>
      <aside
        className="w-full xl:max-w-[1040px] h-full bg-[#f8f7f5] dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-4 sm:px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-[#f77f00] text-[11px] tracking-[0.18em] uppercase font-black border border-amber-100 dark:border-amber-800">
                <span>+</span>
                <span>New Proposal</span>
              </div>
              <h2 className="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50">
                Start a negotiation-ready proposal
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300 max-w-3xl">
                This supplier-side + New Proposal flow only unlocks after the creator invite is Accepted.
              </p>
            </div>
            <button
              className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5">
          <div className="grid xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-5">
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Creator summary</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Accepted invite creator context</div>
                  </div>
                  <div className="rounded-full bg-orange-50 dark:bg-orange-900/20 px-3 py-1 text-[11px] font-bold text-[#f77f00] border border-orange-100 dark:border-orange-800">
                    Supplier-side Proposal
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-950 to-slate-800 text-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-black">
                      {invite.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black truncate">{invite.creator}</h3>
                        <span className="rounded-full bg-white/10 border border-white/10 px-2 py-0.5 text-[11px] font-bold">{invite.status}</span>
                        {!hasSpecificCampaign(invite) ? <span className="rounded-full bg-amber-300/15 border border-amber-300/30 px-2 py-0.5 text-[11px] font-bold text-amber-100">{NO_CAMPAIGN_NOTE}</span> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-200">{invite.creatorBio}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <MiniMetric label="Invite type" value={invite.inviteType} />
                        <MiniMetric label="Creator rating" value={`${invite.creatorRating}/5`} />
                        <MiniMetric label="Est. value" value={money(invite.currency, invite.estimatedValue)} />
                        <MiniMetric label="Region" value={invite.region} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Linked context</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Anchor the proposal to this accepted creator invite.</div>

                <div className="mt-4 grid gap-4">
                  <FieldShell label="Context selector">
                    <Select value={linkedContext} onChange={(e) => setLinkedContext(e.target.value)}>
                      <option value="invite">Accepted invite context</option>
                      <option value="followup">Partnership follow-up</option>
                      <option value="custom">Custom supplier-defined scope</option>
                    </Select>
                  </FieldShell>

                  <div className="rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/70 dark:bg-orange-950/10 p-4">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-50">Selected context</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{getInviteContextTitle(invite)} · {invite.inviteType}</div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {linkedContext === "invite"
                        ? "Use the accepted invite as the primary proposal anchor."
                        : linkedContext === "followup"
                        ? "Use the accepted invite as a partnership continuation while broadening scope."
                        : "Use this accepted creator relationship, but redefine the commercial scope inside your proposal."}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-5">
              {banner ? (
                <div className={`rounded-2xl border p-4 ${banner.tone === "success" ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20" : "border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20"}`}>
                  <div className="font-black text-slate-900 dark:text-slate-50">{banner.title}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{banner.text}</div>
                </div>
              ) : null}

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Proposal details</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Supplier-side negotiation depth aligned with My Creators proposal structure.</div>

                <div className="mt-4 grid gap-4">
                  <FieldShell label="Proposal title" hint="Required">
                    <Input value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} placeholder="Enter a strong commercial title" />
                  </FieldShell>

                  <FieldShell label="Collaboration scope" hint="Required">
                    <Select value={scope} onChange={(e) => setScope(e.target.value)}>
                      <option>Hybrid</option>
                      <option>Live Sessionz</option>
                      <option>Shoppable Adz</option>
                      <option>Long-term creator partnership</option>
                    </Select>
                  </FieldShell>

                  <FieldShell label="Deliverables" hint="Add complete scope">
                    <div className="space-y-2">
                      {deliverables.map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <TextArea rows={2} value={item} onChange={(e) => updateDeliverable(index, e.target.value)} placeholder={`Deliverable ${index + 1}`} />
                          {deliverables.length > 1 ? (
                            <button className="h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => removeDeliverable(index)} type="button">
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={addDeliverable} type="button">
                        + Add deliverable
                      </button>
                    </div>
                  </FieldShell>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Commercial terms</div>
                <div className="mt-4 grid sm:grid-cols-3 gap-4">
                  <FieldShell label="Pricing / commission mode">
                    <Select value={pricingModel} onChange={(e) => setPricingModel(e.target.value)}>
                      <option>Flat fee</option>
                      <option>Commission</option>
                      <option>Hybrid</option>
                    </Select>
                  </FieldShell>
                  <FieldShell label="Proposed fee">
                    <Input value={proposedFee} onChange={(e) => setProposedFee(e.target.value)} placeholder="e.g. 450" />
                  </FieldShell>
                  <FieldShell label="Commission terms">
                    <Input value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="e.g. 8%" />
                  </FieldShell>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Timeline, approval mode, attachments and notes</div>

                <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <FieldShell label="Preferred start">
                    <Input type="date" value={preferredStart} onChange={(e) => setPreferredStart(e.target.value)} />
                  </FieldShell>
                  <FieldShell label="Preferred delivery">
                    <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  </FieldShell>
                  <FieldShell label="Response by">
                    <Input type="date" value={responseBy} onChange={(e) => setResponseBy(e.target.value)} />
                  </FieldShell>
                  <FieldShell label="Approval mode">
                    <Select value={approvalMode} onChange={(e) => setApprovalMode(e.target.value)}>
                      <option>Manual</option>
                      <option>Auto after creator acceptance</option>
                      <option>Hybrid approval</option>
                    </Select>
                  </FieldShell>
                </div>

                <div className="mt-4">
                  <FieldShell label="Attachments" hint="Campaign brief, deliverable guide, pricing sheet, audience notes">
                    <input ref={fileRef} type="file" className="hidden" />
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button className="px-3 py-2 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm font-bold" onClick={() => fileRef.current?.click()} type="button">
                          Upload files
                        </button>
                        <button className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800" onClick={addMockAttachment} type="button">
                          Add sample attachment
                        </button>
                      </div>

                      <div className="mt-3 space-y-2">
                        {attachments.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{item.typeLabel} · {item.sizeLabel}</div>
                            </div>
                            <button className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => removeAttachment(item.id)} type="button">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </FieldShell>
                </div>

                <div className="mt-4">
                  <FieldShell label="Notes">
                    <TextArea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add collaboration notes, negotiation points, approval expectations, logistics, creator-specific requirements, gifting, usage rights, or anything else relevant." />
                  </FieldShell>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-4 sm:px-5 py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">Save draft to continue later, or send when title, deliverables, commercial terms and timeline are complete.</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60" onClick={saveDraft} disabled={savingDraft} type="button">
                {savingDraft ? "Saving draft..." : "Save draft"}
              </button>
              <button className="px-4 py-3 rounded-2xl bg-[#f77f00] text-white text-sm font-black hover:bg-[#e26f00] shadow-lg shadow-orange-100 dark:shadow-none disabled:opacity-60" onClick={sendProposal} disabled={!canSend || sendingProposal} type="button">
                {sendingProposal ? "Sending proposal..." : "Send proposal"}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ConfirmDeclineModal({ open, invite, onCancel, onConfirm, isPending }) {
  if (!open || !invite) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center px-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white to-orange-50 dark:from-slate-950 dark:to-orange-950/10">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Confirm action</div>
          <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">Decline invite from {invite.creator}?</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Once declined, this creator invite moves to Declined and the collaboration path closes until the creator opens a fresh route.
          </p>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4">
            <div className="font-bold text-slate-900 dark:text-slate-50">{getInviteContextTitle(invite)}</div>
            <div className="mt-1 text-slate-500 dark:text-slate-400">{invite.inviteType} · {invite.region}</div>
            {!hasSpecificCampaign(invite) ? (
              <div className="mt-2 inline-flex items-center rounded-full border border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1 text-[10px] font-black text-[#f77f00]">
                {NO_CAMPAIGN_NOTE}
              </div>
            ) : null}
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 px-3 py-1 text-[11px] font-bold text-red-600 dark:text-red-300">
              This action will mark the invite as Declined
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
            onClick={onCancel}
            disabled={isPending}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-4 py-2.5 rounded-2xl bg-red-600 text-white text-sm font-black hover:bg-red-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={isPending}
            type="button"
          >
            {isPending ? "Declining..." : "Yes, Decline Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteRow({ invite, selected, onSelect }) {
  const statusColorMap = {
    New: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    Accepted: "bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-700 text-white dark:text-slate-100",
    Declined: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
  };

  const statusClass = statusColorMap[invite.status] || statusColorMap.Declined;
  const contextTitle = getInviteContextTitle(invite);
  const subLabel = getInviteContextSubLabel(invite);

  return (
    <article
      className={cx(
        "py-2.5 px-2 md:px-2.5 border rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-2 cursor-pointer transition-all",
        selected
          ? "bg-amber-50/60 dark:bg-amber-900/30 border-[#f77f00] shadow-[0_0_0_1px_rgba(247,127,0,0.12)]"
          : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold transition-colors">
          {invite.initials}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{invite.creator}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">· {contextTitle}</span>
            {subLabel ? (
              <span className="inline-flex items-center rounded-full border border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 text-[10px] font-bold text-[#f77f00]">
                {subLabel}
              </span>
            ) : null}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{invite.inviteType} · {invite.region}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{invite.messageShort}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-xs">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors ${statusClass}`}>
          <span>●</span>
          <span>{invite.status}</span>
        </span>
        <span className="text-slate-500 dark:text-slate-400">Est. value: {money(invite.currency, invite.estimatedValue)}</span>
        <span className="text-slate-400 dark:text-slate-500">{invite.lastActivity}</span>
      </div>
    </article>
  );
}

function InviteDetailPanel({
  invite,
  onOpenProposal,
  onAccept,
  onRequestDecline,
  onInviteToCollaborate,
  onOpenCreatorProfile,
  onOpenAiAssistant,
  onOpenMyCreators,
  isPending
}) {
  if (!invite) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 min-h-[260px]">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 max-w-xs transition-colors">
          <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">Select an invite</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">When you click an invite, you'll see full details here — creator fit, commercial ask, and next steps.</p>
        </div>
      </div>
    );
  }

  const forecastLabel = money(invite.currency, invite.estimatedValue);
  const canRespond = invite.status === "New";
  const accepted = invite.status === "Accepted";
  const archived = invite.status === "Declined";
  const contextTitle = getInviteContextTitle(invite);
  const subLabel = getInviteContextSubLabel(invite);

  let statusHint = "Review this invite and decide whether to accept, negotiate/counter or decline.";
  if (invite.status === "New" && !hasSpecificCampaign(invite)) {
    statusHint = "This creator is asking for a general collaboration without a fixed campaign yet. Accept first, then shape the supplier-side workflow from My Creators or Proposals.";
  }
  if (accepted && hasSpecificCampaign(invite)) {
    statusHint = "This creator relationship is active. + New Proposal is now available for this accepted creator invite.";
  }
  if (accepted && !hasSpecificCampaign(invite)) {
    statusHint = "This general creator collaboration is active. + New Proposal is now available so you can define the campaign structure yourself.";
  }
  if (archived) {
    statusHint = "This invite is closed. You can restart the relationship by sending an Invite to Collaborate.";
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <section className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-600 flex items-center justify-center text-xl font-black text-[#f77f00] overflow-hidden">
              {invite.initials}
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{invite.creator}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
          <div className="flex items-center gap-1.5 pt-1">
            <button
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-[#f77f00] hover:border-[#f77f00] transition-all shadow-sm"
              title="View Creator"
              type="button"
              onClick={() => onOpenCreatorProfile?.(invite)}
            >
              <span className="text-sm">👁️</span>
            </button>
            {accepted ? (
              <button
                onClick={onOpenProposal}
                className="px-3 py-2 rounded-xl border border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 text-[#f77f00] font-bold text-xs hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-all shadow-sm"
                type="button"
              >
                + New Proposal
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic border-t border-slate-100 dark:border-slate-700 pt-3">{invite.creatorBio}</p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2 p-1">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{contextTitle}</h4>
              {subLabel ? (
                <span className="inline-flex items-center rounded-full border border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 text-[10px] font-bold text-[#f77f00]">
                  {subLabel}
                </span>
              ) : null}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{invite.inviteType} · {invite.category} · {invite.region}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Estimated Value</span>
            <span className="text-xl font-black text-[#f77f00]">{forecastLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex flex-col gap-1 transition-all">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Creator requested fee</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{money(invite.currency, invite.baseFee)}{invite.commissionPct > 0 ? <span className="text-[#f77f00] ml-1">+ {invite.commissionPct}% Comms</span> : null}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex flex-col gap-1 transition-all">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline / state</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{invite.expiresIn}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">Supplier campaign settings (auto)</div>
            <span className="text-[10px] text-slate-500">Accepting sets collaboration to Invite-Only</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-extrabold">Creator usage: I will use a Creator</span>
            <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-extrabold">Collab mode: Invite-Only</span>
            <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-extrabold">Approval: Manual / Auto configurable</span>
          </div>
        </div>
      </section>

      <section className="border border-[#f77f00]/20 dark:border-[#f77f00]/30 rounded-2xl p-4 bg-amber-50/20 dark:bg-[#f77f00]/5 flex flex-col gap-2 transition-all">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Creator fit</span>
          <div className="h-px flex-1 bg-amber-100 dark:bg-slate-800" />
          <span className="text-xs font-black text-[#f77f00]">{invite.fitScore}/100</span>
        </div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{invite.fitReason}</p>
      </section>

      <div className="group relative border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 flex flex-col gap-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personal Message</span>
        <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{invite.messageShort}"</p>
        <div className="flex items-center gap-2 mt-1">
          <div className={cx("w-2 h-2 rounded-full animate-pulse", canRespond ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : accepted ? "bg-[#f77f00] shadow-[0_0_8px_rgba(247,127,0,0.45)]" : "bg-slate-300")} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{statusHint}</span>
        </div>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Need help?</span>
          <button className="text-xs font-bold text-[#f77f00] hover:underline flex items-center gap-1 transition-all" type="button" onClick={() => onOpenAiAssistant?.(invite)}>Ask AI Assistant 🪄</button>
        </div>

        {canRespond ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm disabled:opacity-50"
              onClick={onRequestDecline}
              disabled={isPending}
              type="button"
            >
              Decline Invite
            </button>
            <button
              className="px-6 py-2.5 rounded-2xl bg-[#f77f00] text-white text-xs font-black hover:bg-[#e26f00] transition-all shadow-lg hover:shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={onAccept}
              disabled={isPending}
              type="button"
            >
              {isPending ? <Spinner size={14} /> : null}
              Accept Invite
            </button>
          </div>
        ) : accepted ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full transition-colors">
              <span className="text-xs font-bold text-slate-500 italic uppercase">● {invite.status}</span>
            </div>
            <button className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm" type="button" onClick={onOpenMyCreators}>Open My Creators</button>
            <button className="px-5 py-2.5 rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 text-[#f77f00] font-black text-xs hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-all shadow-sm" onClick={onOpenProposal} type="button">+ New Proposal</button>
          </div>
        ) : archived ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full transition-colors">
              <span className="text-xs font-bold text-slate-500 italic uppercase">● {invite.status}</span>
            </div>
            <button
              className="px-5 py-2.5 rounded-2xl bg-[#f77f00] text-white text-xs font-black hover:bg-[#e26f00] transition-all shadow-lg hover:shadow-orange-200"
              onClick={onInviteToCollaborate}
              type="button"
            >
              Invite to Collaborate
            </button>
          </div>
        ) : null}
      </section>

      <div className="text-[10px] text-slate-500">Permissions note: Only Supplier Owners/Admins should accept/decline invites that create binding proposal/contract flows.</div>
    </div>
  );
}

export default function InvitesFromCreatorsPreviewCanvas() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState(INVITES);
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [minBudget, setMinBudget] = useState("");
  const [selectedInviteId, setSelectedInviteId] = useState(INVITES[0]?.id || null);
  const [counterDrawerOpen, setCounterDrawerOpen] = useState(false);
  const [counterInvite, setCounterInvite] = useState(null);
  const [proposalDrawerOpen, setProposalDrawerOpen] = useState(false);
  const [proposalInvite, setProposalInvite] = useState(null);
  const [declineConfirmId, setDeclineConfirmId] = useState(null);
  const { run, isPending } = useAsyncAction();

  const filteredInvites = useMemo(() => {
    return invites.filter((invite) => {
      if (tab === "new" && invite.status !== "New") return false;
      if (tab === "active" && !["New", "Accepted"].includes(invite.status)) return false;
      if (tab === "archived" && invite.status !== "Declined") return false;
      if (statusFilter !== "All" && invite.status !== statusFilter) return false;
      if (categoryFilter !== "All" && invite.category !== categoryFilter) return false;
      if (minBudget) {
        const min = Number(minBudget) || 0;
        if (invite.estimatedValue < min) return false;
      }
      return true;
    });
  }, [invites, tab, statusFilter, categoryFilter, minBudget]);

  const selectedInvite = useMemo(() => {
    if (!filteredInvites.length) return null;
    return filteredInvites.find((invite) => invite.id === selectedInviteId) || filteredInvites[0] || null;
  }, [filteredInvites, selectedInviteId]);

  const declineInvite = useMemo(() => invites.find((invite) => invite.id === declineConfirmId) || null, [invites, declineConfirmId]);

  useEffect(() => {
    if (selectedInvite) return;
    if (filteredInvites[0]) setSelectedInviteId(filteredInvites[0].id);
  }, [selectedInvite, filteredInvites]);

  function openProposalDrawer(invite) {
    if (!invite || invite.status !== "Accepted") return;
    setProposalInvite(invite);
    setProposalDrawerOpen(true);
  }

  function handleAccept(id) {
    run(
      async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        setInvites((prev) =>
          prev.map((invite) =>
            invite.id === id
              ? {
                  ...invite,
                  status: "Accepted",
                  lastActivity: "Accepted · just now",
                  expiresIn: hasSpecificCampaign(invite) ? "Starts next week" : "General collaboration active",
                }
              : invite
          )
        );
      },
      { successMessage: "Invite accepted. Collaboration started." }
    );
  }

  function handleDeclineConfirmed() {
    if (!declineConfirmId) return;
    const id = declineConfirmId;
    run(
      async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        setInvites((prev) =>
          prev.map((invite) =>
            invite.id === id
              ? { ...invite, status: "Declined", lastActivity: "Declined · just now", expiresIn: "Closed" }
              : invite
          )
        );
      },
      { successMessage: "Invite declined." }
    );
    setDeclineConfirmId(null);
  }

  function handleInviteToCollaborate(invite) {
    if (!invite || invite.status !== "Declined") return;
    run(
      async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        setInvites((prev) =>
          prev.map((item) =>
            item.id === invite.id
              ? {
                  ...item,
                  lastActivity: "Invite to Collaborate sent · just now",
                  expiresIn: "Awaiting creator response",
                }
              : item
          )
        );
      },
      { successMessage: `Invite to Collaborate sent to ${invite.creator}.` }
    );
  }

  function handleCounterSent(payload) {
    if (!payload?.inviteId) return;
    setInvites((prev) =>
      prev.map((invite) =>
        invite.id === payload.inviteId
          ? {
              ...invite,
              lastActivity: `Counter sent · just now`,
              expiresIn: "Awaiting creator response",
            }
          : invite
      )
    );
  }

  function handleProposalSent(invite) {
    if (!invite?.id) return;
    setInvites((prev) =>
      prev.map((item) =>
        item.id === invite.id
          ? {
              ...item,
              lastActivity: "Proposal sent · just now",
            }
          : item
      )
    );
  }

  function openCreatorProfile(invite) {
    if (!invite) return;
    const params = new URLSearchParams({
      creator: invite.creator,
      inviteId: invite.id,
      from: "invites-from-creators",
    });
    navigate(`${ROUTES.creatorProfile}?${params.toString()}`);
  }

  function openAiAssistant(invite) {
    const params = new URLSearchParams({
      source: "invites-from-creators",
      context: invite?.id || "",
      creator: invite?.creator || "",
    });
    navigate(`${ROUTES.messages}?${params.toString()}`);
  }

  function openMyCreators() {
    navigate(ROUTES.myCreators);
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        title="Invites from Creators"
        badge={<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"><span>📨</span><span>Direct invites · Creator-initiated</span></span>}
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Creators who want to work with you. Review terms, negotiate, accept or decline.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {selectedInvite?.status === "Accepted" ? (
                <button className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-extrabold hover:bg-[#e26f00]" type="button" onClick={() => openProposalDrawer(selectedInvite)}>+ New Proposal</button>
              ) : selectedInvite?.status === "Declined" ? (
                <button className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-extrabold hover:bg-[#e26f00]" type="button" onClick={() => handleInviteToCollaborate(selectedInvite)}>Invite to Collaborate</button>
              ) : null}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-300">View:</span>
                <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1 py-0.5 transition-colors">
                  {TABS.map((item) => {
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        className={`px-2.5 py-0.5 rounded-full transition-colors ${
                          active
                            ? "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                        onClick={() => setTab(item.id)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select className="border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {STATUS_FILTERS.map((item) => (
                    <option key={item} value={item}>{item === "All" ? "All statuses" : item}</option>
                  ))}
                </select>
                <select className="border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-300">Budget ≥</span>
                  <input type="number" className="w-20 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs transition-colors" placeholder="e.g. 300" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
              <span>Showing <span className="font-semibold">{filteredInvites.length}</span> of {invites.length} invites</span>
              <button className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors" onClick={() => {
                setTab("all");
                setStatusFilter("All");
                setCategoryFilter("All");
                setMinBudget("");
              }} type="button">Reset</button>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] gap-3 items-start text-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold dark:text-slate-50 mb-1">Invites</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300">Click an invite to see full details and respond.</span>
              </div>
              <div className="space-y-1.5">
                {filteredInvites.map((invite) => (
                  <InviteRow key={invite.id} invite={invite} selected={selectedInvite?.id === invite.id} onSelect={() => setSelectedInviteId(invite.id)} />
                ))}
                {filteredInvites.length === 0 ? (
                  <div className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">No invites match these filters yet.</div>
                ) : null}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <InviteDetailPanel
                invite={selectedInvite}
                onOpenProposal={() => openProposalDrawer(selectedInvite)}
                onAccept={() => selectedInvite && handleAccept(selectedInvite.id)}
                onRequestDecline={() => selectedInvite && setDeclineConfirmId(selectedInvite.id)}
                onInviteToCollaborate={() => selectedInvite && handleInviteToCollaborate(selectedInvite)}
                onOpenCreatorProfile={openCreatorProfile}
                onOpenAiAssistant={openAiAssistant}
                onOpenMyCreators={openMyCreators}
                isPending={isPending}
              />
            </div>
          </section>
        </div>
      </main>

      <NegotiationDrawer open={counterDrawerOpen} onClose={() => setCounterDrawerOpen(false)} invite={counterInvite} onSendCounter={handleCounterSent} />
      <ProposalDrawer open={proposalDrawerOpen} onClose={() => setProposalDrawerOpen(false)} invite={proposalInvite} onSendProposal={handleProposalSent} />

      <ConfirmDeclineModal
        open={!!declineConfirmId}
        invite={declineInvite}
        onCancel={() => setDeclineConfirmId(null)}
        onConfirm={handleDeclineConfirmed}
        isPending={isPending}
      />

      <ToastArea />
    </div>
  );
}
