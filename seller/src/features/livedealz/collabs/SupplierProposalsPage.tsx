import React, { useEffect, useMemo, useRef, useState } from "react";

const ORANGE = "#f77f00";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function currencyFormat(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function money(currency, value) {
  return `${currency} ${currencyFormat(value)}`;
}

let __toastTimer = null;
function toast(message) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("supplier-proposals-toast", { detail: message }));
}

function ToastArea() {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    function handler(event) {
      setMessage(event.detail);
      if (__toastTimer) window.clearTimeout(__toastTimer);
      __toastTimer = window.setTimeout(() => setMessage(null), 1800);
    }

    window.addEventListener("supplier-proposals-toast", handler);
    return () => window.removeEventListener("supplier-proposals-toast", handler);
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

  return { run, isPending };
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

function PageHeader({ pageTitle, badge, right }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500 font-semibold">Supplier App</div>
          <h1 className="truncate text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50">{pageTitle}</h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}

const PROPOSALS = [
  {
    id: "SP-901",
    creator: "Lilian Beauty Plug",
    initials: "LB",
    campaign: "GlowUp Serum Promo",
    origin: "from-creator",
    offerType: "Live + Clips package",
    category: "Beauty",
    region: "East Africa",
    baseFeeMin: 320,
    baseFeeMax: 480,
    currency: "USD",
    commissionPct: 5,
    estimatedValue: 1200,
    status: "In negotiation",
    lastActivity: "Negotiation updated · 2h ago",
    notesShort: "Creator proposes 60–90 min live + 3 clips with 5% commission during flash dealz.",
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Open for Collabs",
    approvalMode: "Manual",
    proposalSource: "Open Collabs",
    deliverables: ["Live", "Clips", "Posts"],
    scheduleHint: "Next Friday",
    reviewSlaHours: 6,
  },
  {
    id: "SP-902",
    creator: "TechWithBrian",
    initials: "TB",
    campaign: "Tech Friday Mega",
    origin: "my-proposal",
    offerType: "Launch live series (3 episodes)",
    category: "Tech",
    region: "Africa / Asia",
    baseFeeMin: 900,
    baseFeeMax: 1400,
    currency: "USD",
    commissionPct: 0,
    estimatedValue: 1600,
    status: "New",
    lastActivity: "Proposal sent · Yesterday",
    notesShort: "You proposed a 3-episode Tech Friday series with mid-ticket gadgets and bundle closes.",
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Invite-Only",
    approvalMode: "Auto",
    proposalSource: "Invite-Only",
    deliverables: ["Live", "Posts"],
    scheduleHint: "Next week",
    reviewSlaHours: 6,
  },
  {
    id: "SP-903",
    creator: "Grace Faith Wellness",
    initials: "GW",
    campaign: "Faith & Wellness Morning Dealz",
    origin: "my-proposal",
    offerType: "Morning lives + Shoppable Adz",
    category: "Faith-compatible",
    region: "Africa",
    baseFeeMin: 260,
    baseFeeMax: 360,
    currency: "USD",
    commissionPct: 0,
    estimatedValue: 520,
    status: "Draft",
    lastActivity: "Draft saved · 1 day ago",
    notesShort: "Draft proposal – not yet sent. Waiting for campaign collaboration mode confirmation.",
    creatorUsageDecision: "I am NOT SURE yet",
    collabMode: "Open for Collabs",
    approvalMode: "Manual",
    proposalSource: "Open Collabs",
    deliverables: ["Live", "Adz"],
    scheduleHint: "This month",
    reviewSlaHours: 6,
  },
  {
    id: "SP-904",
    creator: "Amina K.",
    initials: "AK",
    campaign: "Beauty Flash Dealz",
    origin: "from-creator",
    offerType: "Live (1x) + 2 clips",
    category: "Beauty",
    region: "East Africa",
    baseFeeMin: 280,
    baseFeeMax: 280,
    currency: "USD",
    commissionPct: 6,
    estimatedValue: 950,
    status: "Accepted",
    lastActivity: "Accepted · 4 days ago",
    notesShort: "Accepted. Next step is Contract + scheduling. Creator requested faster approvals for clips.",
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Invite-Only",
    approvalMode: "Manual",
    proposalSource: "Invites from Creators",
    deliverables: ["Live", "Clips"],
    scheduleHint: "This week",
    reviewSlaHours: 6,
  },
  {
    id: "SP-905",
    creator: "EV Gadgets Daily",
    initials: "EG",
    campaign: "EV Accessories Launch",
    origin: "from-creator",
    offerType: "Shoppable Adz + Live",
    category: "EV",
    region: "Global",
    baseFeeMin: 350,
    baseFeeMax: 500,
    currency: "USD",
    commissionPct: 4,
    estimatedValue: 600,
    status: "Declined",
    lastActivity: "Declined · last week",
    notesShort: "Declined due to timing. Consider revisiting when supplier campaign window opens.",
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Open for Collabs",
    approvalMode: "Auto",
    proposalSource: "Open Collabs",
    deliverables: ["Adz", "Live"],
    scheduleHint: "Next quarter",
    reviewSlaHours: 6,
  },
  {
    id: "SP-906",
    creator: "Supplier-hosted opportunity",
    initials: "SO",
    campaign: "Supplier-hosted EV Accessories Showcase",
    origin: "from-creator",
    offerType: "Creator wants to join supplier-hosted live",
    category: "EV",
    region: "Global",
    baseFeeMin: 200,
    baseFeeMax: 350,
    currency: "USD",
    commissionPct: 3,
    estimatedValue: 480,
    status: "New",
    lastActivity: "New proposal · Today",
    notesShort: "This campaign is configured as supplier-hosted. You must switch Creator Usage to accept creator involvement.",
    creatorUsageDecision: "I will NOT use a Creator",
    collabMode: "n/a",
    approvalMode: "Manual",
    proposalSource: "N/A",
    deliverables: ["Live"],
    scheduleHint: "Next month",
    reviewSlaHours: 6,
  },
  {
    id: "SP-907",
    creator: "HomeWithRuth",
    initials: "HR",
    campaign: "Home & Living Weekend Push",
    origin: "my-proposal",
    offerType: "Creator-led demo bundle",
    category: "Home & Living",
    region: "East Africa",
    baseFeeMin: 180,
    baseFeeMax: 240,
    currency: "USD",
    commissionPct: 5,
    estimatedValue: 420,
    status: "Expired",
    lastActivity: "Expired · 10 days ago",
    notesShort: "Supplier never received a final response before the campaign timing closed.",
    creatorUsageDecision: "I will use a Creator",
    collabMode: "Invite-Only",
    approvalMode: "Manual",
    proposalSource: "Invite-Only",
    deliverables: ["Live", "Posts"],
    scheduleHint: "Closed",
    reviewSlaHours: 6,
  },
];

const CREATOR_META = {
  "Lilian Beauty Plug": {
    tagline: "Beauty creator focused on live tutorials, skincare routines and conversion-led product storytelling.",
    rating: 4.8,
    primaryContact: "Lilian · WhatsApp",
    trustBadges: ["Verified creator", "High beauty fit"],
    avgConversion: 4.9,
  },
  TechWithBrian: {
    tagline: "Tech creator specializing in live demos, bundle-driven closes and mid-ticket gadget education.",
    rating: 4.7,
    primaryContact: "Brian · Telegram",
    trustBadges: ["Series-ready creator", "Low disputes"],
    avgConversion: 4.2,
  },
  "Grace Faith Wellness": {
    tagline: "Faith-compatible wellness creator with calm, trust-first delivery and retention-friendly sessions.",
    rating: 4.9,
    primaryContact: "Grace · WhatsApp",
    trustBadges: ["Trusted creator"],
    avgConversion: 3.9,
  },
  "Amina K.": {
    tagline: "Beauty dealz, live routines and product-first hooks with fast turnaround.",
    rating: 4.8,
    primaryContact: "Amina · WhatsApp",
    trustBadges: ["Verified", "On-time delivery"],
    avgConversion: 4.8,
  },
  "EV Gadgets Daily": {
    tagline: "EV accessory creator focused on charging, interior tech and practical demo-led commerce.",
    rating: 4.3,
    primaryContact: "Dennis · WeChat",
    trustBadges: ["Niche specialist"],
    avgConversion: 3.8,
  },
  HomeWithRuth: {
    tagline: "Home & living creator with calm explainers and high-trust product demonstrations.",
    rating: 4.4,
    primaryContact: "Ruth · WhatsApp",
    trustBadges: ["Steady engagement"],
    avgConversion: 3.6,
  },
};

const SUPPLIER_CAMPAIGNS = [
  {
    id: "CMP-101",
    title: "Autumn Beauty Flash",
    subtitle: "Beauty & Skincare",
    summary: "Fast-moving promo focused on serum bundles, live education and audience-driven urgency.",
    type: "Shoppable Adz + Live",
    fitLabel: "Best for beauty creators",
    timelineLabel: "7 day cycle",
    suggestedFee: 400,
    suggestedCommission: 6,
  },
  {
    id: "CMP-202",
    title: "Tech Friday Mega Live",
    subtitle: "Tech & Gadgets",
    summary: "Creator-led live series for gadget launches, mid-session bundle pushes and stronger cart conversion.",
    type: "Live series",
    fitLabel: "Strong for demo-led creators",
    timelineLabel: "3 episode run",
    suggestedFee: 1200,
    suggestedCommission: 4,
  },
  {
    id: "CMP-303",
    title: "Creator Partnership Retainer",
    subtitle: "Always-on relationship",
    summary: "Use when you want to build a broader creator collaboration beyond one campaign, with recurring deliverables and approval loops.",
    type: "Ongoing partnership",
    fitLabel: "Long-term collaboration",
    timelineLabel: "Custom timing",
    suggestedFee: 800,
    suggestedCommission: 5,
  },
];

const TABS = [
  { id: "all", label: "All" },
  { id: "from-creators", label: "From Creators" },
  { id: "my-proposals", label: "My Proposals" },
];

const STATUS_FILTERS = ["All", "Draft", "New", "In negotiation", "Accepted", "Declined", "Expired"];
const CATEGORIES = ["All", "Beauty", "Tech", "Faith-compatible", "EV", "Home & Living"];

function buildCreatorsFromProposals(proposals) {
  const grouped = new Map();

  proposals.forEach((proposal) => {
    if (!proposal.creator || proposal.creator === "Supplier-hosted opportunity") return;

    const meta = CREATOR_META[proposal.creator] || {};
    if (!grouped.has(proposal.creator)) {
      grouped.set(proposal.creator, {
        id: proposal.creator,
        name: proposal.creator,
        initials: proposal.initials,
        tagline: meta.tagline || proposal.notesShort,
        categories: [proposal.category],
        relationship:
          proposal.status === "Accepted"
            ? "Accepted relationship"
            : proposal.origin === "my-proposal"
            ? "Existing negotiation"
            : "Incoming proposal",
        rating: meta.rating || 4.5,
        trustBadges: meta.trustBadges || ["Proposal context"],
        primaryContact: meta.primaryContact || `${proposal.creator} · Creator manager`,
        nextAction: proposal.lastActivity,
        lifetimeRevenue: proposal.estimatedValue * (proposal.status === "Accepted" ? 2 : 1),
        currentValue: proposal.status === "Declined" || proposal.status === "Expired" ? 0 : proposal.estimatedValue,
        avgConversion: meta.avgConversion || 4.2,
      });
      return;
    }

    const current = grouped.get(proposal.creator);
    current.categories = Array.from(new Set([...(current.categories || []), proposal.category]));
    current.lifetimeRevenue += proposal.estimatedValue;
    if (!["Declined", "Expired"].includes(proposal.status)) {
      current.currentValue += proposal.estimatedValue;
    }
    current.nextAction = proposal.lastActivity;
  });

  return Array.from(grouped.values());
}

function ProposalFieldShell({ label, hint, children }) {
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

function ProposalInput(props) {
  return (
    <input
      {...props}
      className={`w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20 ${props.className || ""}`}
    />
  );
}

function ProposalSelect(props) {
  return (
    <select
      {...props}
      className={`w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20 ${props.className || ""}`}
    />
  );
}

function ProposalTextArea(props) {
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

function BadgePill({ tone = "neutral", children }) {
  const styles = {
    neutral: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700",
    good: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    warn: "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    brand: "text-white border-transparent",
  };

  return (
    <span className={cx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-tight", styles[tone])} style={tone === "brand" ? { background: ORANGE } : undefined}>
      {children}
    </span>
  );
}

function ProposalDrawer({ open, onClose, creators, initialCreator, campaigns }) {
  useScrollLock(open);

  const fileRef = useRef(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState(initialCreator?.id || creators[0]?.id || "");
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id || "");
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

  const creator = useMemo(() => creators.find((item) => item.id === selectedCreatorId) || null, [creators, selectedCreatorId]);
  const campaign = useMemo(() => campaigns.find((item) => item.id === selectedCampaignId) || campaigns[0] || null, [campaigns, selectedCampaignId]);

  useEffect(() => {
    if (!open) return;
    const next = initialCreator || creators[0] || null;
    setSelectedCreatorId(next?.id || "");
    setSelectedCampaignId(campaigns[0]?.id || "");
    setScope("Hybrid");
    setPricingModel("Hybrid");
    setApprovalMode("Manual");
    setProposalTitle(next ? `${next.name} x Supplier Collaboration Proposal` : "");
    setDeliverables([
      "1 live session with pinned offer moments",
      "3 short-form teaser assets",
      "Post-live recap and conversion push",
    ]);
    setProposedFee(campaigns[0]?.suggestedFee ? String(campaigns[0].suggestedFee) : "");
    setCommission(campaigns[0]?.suggestedCommission ? String(campaigns[0].suggestedCommission) : "");
    setPreferredStart("2026-03-24");
    setDeliveryDate("2026-04-04");
    setResponseBy("2026-03-23");
    setNotes(next ? `Proposal for ${next.name} with campaign-linked collaboration scope, deliverables, approval steps, and commercial terms.` : "");
    setAttachments([
      { id: "deck", name: "campaign-brief.pdf", sizeLabel: "1.3 MB", typeLabel: "PDF" },
      { id: "rates", name: "creator-requirements.docx", sizeLabel: "320 KB", typeLabel: "DOCX" },
    ]);
    setSavingDraft(false);
    setSendingProposal(false);
    setBanner(null);
  }, [open, initialCreator, creators, campaigns]);

  useEffect(() => {
    if (!campaign) return;
    setProposedFee((prev) => (prev ? prev : campaign.suggestedFee ? String(campaign.suggestedFee) : ""));
    setCommission((prev) => (prev ? prev : campaign.suggestedCommission ? String(campaign.suggestedCommission) : ""));
  }, [campaign]);

  const canSend =
    !!creator &&
    !!campaign &&
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
      text: `Your draft proposal for ${creator?.name || "this creator"} is ready to revisit.`,
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
      text: `${creator?.name || "The creator"} will receive your proposal with linked campaign, scope, deliverables, pricing and timeline.`,
    });
  }

  if (!open) return null;

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
                Supplier terminology stays Proposal on this page. Use the linked campaign, define collaboration scope, attach deliverables and commercial terms, then save draft or send.
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
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select the creator you want to send a proposal to.</div>
                  </div>
                  <div className="rounded-full bg-orange-50 dark:bg-orange-900/20 px-3 py-1 text-[11px] font-bold text-[#f77f00] border border-orange-100 dark:border-orange-800">
                    Supplier-side Proposal
                  </div>
                </div>

                <div className="mt-4">
                  <ProposalFieldShell label="Creator">
                    <ProposalSelect value={selectedCreatorId} onChange={(e) => setSelectedCreatorId(e.target.value)}>
                      {creators.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </ProposalSelect>
                  </ProposalFieldShell>
                </div>

                {creator ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-950 to-slate-800 text-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-black">
                        {creator.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black truncate">{creator.name}</h3>
                          <span className="rounded-full bg-white/10 border border-white/10 px-2 py-0.5 text-[11px] font-bold">{creator.relationship}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-200">{creator.tagline}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <MiniMetric label="Primary contact" value={creator.primaryContact} />
                          <MiniMetric label="Next action" value={creator.nextAction} />
                          <MiniMetric label="Current value" value={money("USD", creator.currentValue)} />
                          <MiniMetric label="Rating" value={`${creator.rating}/5`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Linked campaign</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the supplier campaign this proposal should anchor to.</div>

                <div className="mt-4 space-y-3">
                  {campaigns.map((item) => {
                    const selected = item.id === selectedCampaignId;
                    return (
                      <button
                        key={item.id}
                        className={`w-full text-left rounded-2xl border p-4 transition-all ${
                          selected
                            ? "border-[#f77f00]/40 bg-orange-50/70 dark:bg-orange-950/10 shadow-[0_10px_24px_rgba(247,127,0,0.10)]"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                        onClick={() => setSelectedCampaignId(item.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {item.type}
                            </div>
                            <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">{item.title}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                          </div>
                          {selected ? <div className="rounded-full bg-[#f77f00] text-white h-7 w-7 flex items-center justify-center text-sm font-black">✓</div> : null}
                        </div>
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <BadgePill>{item.fitLabel}</BadgePill>
                          <BadgePill>{item.timelineLabel}</BadgePill>
                          {item.suggestedFee ? <BadgePill>{`Suggested fee ${money("USD", item.suggestedFee)}`}</BadgePill> : null}
                          {item.suggestedCommission ? <BadgePill>{`Suggested commission ${item.suggestedCommission}%`}</BadgePill> : null}
                        </div>
                      </button>
                    );
                  })}
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
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Proposal-grade depth aligned with the negotiation room information architecture.</div>

                <div className="mt-4 grid gap-4">
                  <ProposalFieldShell label="Proposal title" hint="Required">
                    <ProposalInput value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} placeholder="Enter a strong commercial title" />
                  </ProposalFieldShell>

                  <ProposalFieldShell label="Collaboration scope" hint="Required">
                    <ProposalSelect value={scope} onChange={(e) => setScope(e.target.value)}>
                      <option>Hybrid</option>
                      <option>Live Sessionz</option>
                      <option>Shoppable Adz</option>
                      <option>Long-term creator partnership</option>
                    </ProposalSelect>
                  </ProposalFieldShell>

                  <ProposalFieldShell label="Deliverables" hint="Add complete scope">
                    <div className="space-y-2">
                      {deliverables.map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <ProposalTextArea rows={2} value={item} onChange={(e) => updateDeliverable(index, e.target.value)} placeholder={`Deliverable ${index + 1}`} />
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
                  </ProposalFieldShell>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Commercial terms</div>
                <div className="mt-4 grid sm:grid-cols-3 gap-4">
                  <ProposalFieldShell label="Pricing / commission mode">
                    <ProposalSelect value={pricingModel} onChange={(e) => setPricingModel(e.target.value)}>
                      <option>Flat fee</option>
                      <option>Commission</option>
                      <option>Hybrid</option>
                    </ProposalSelect>
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Proposed fee">
                    <ProposalInput value={proposedFee} onChange={(e) => setProposedFee(e.target.value)} placeholder="e.g. 450" />
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Commission terms">
                    <ProposalInput value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="e.g. 8%" />
                  </ProposalFieldShell>
                </div>

                {campaign ? (
                  <div className="mt-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/70 dark:bg-orange-950/10 p-4">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-50">Selected campaign context</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{campaign.title} · {campaign.type}</div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Use this linked campaign to align commercial terms, approval expectations, and timeline realism.</div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Timeline, approval mode, attachments and notes</div>

                <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <ProposalFieldShell label="Preferred start">
                    <ProposalInput type="date" value={preferredStart} onChange={(e) => setPreferredStart(e.target.value)} />
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Preferred delivery">
                    <ProposalInput type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Response by">
                    <ProposalInput type="date" value={responseBy} onChange={(e) => setResponseBy(e.target.value)} />
                  </ProposalFieldShell>
                  <ProposalFieldShell label="Approval mode">
                    <ProposalSelect value={approvalMode} onChange={(e) => setApprovalMode(e.target.value)}>
                      <option>Manual</option>
                      <option>Auto after creator acceptance</option>
                      <option>Hybrid approval</option>
                    </ProposalSelect>
                  </ProposalFieldShell>
                </div>

                <div className="mt-4">
                  <ProposalFieldShell label="Attachments" hint="Campaign brief, deliverable guide, pricing sheet, audience notes">
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
                  </ProposalFieldShell>
                </div>

                <div className="mt-4">
                  <ProposalFieldShell label="Notes">
                    <ProposalTextArea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add collaboration notes, negotiation points, approval expectations, logistics, creator-specific requirements, gifting, usage rights, or anything else relevant." />
                  </ProposalFieldShell>
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

function NegotiationDrawer({ open, onClose, proposal, onSubmit }) {
  useScrollLock(open);

  const [approvalMode, setApprovalMode] = useState("Manual");
  const [pricingModel, setPricingModel] = useState("Hybrid");
  const [feeMin, setFeeMin] = useState("350");
  const [feeMax, setFeeMax] = useState("450");
  const [commissionPct, setCommissionPct] = useState("5");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [deliverables, setDeliverables] = useState({ Live: true, Clips: true, Posts: false, Adz: false });
  const [message, setMessage] = useState("");
  const [nextStep, setNextStep] = useState("Open negotiation thread");

  useEffect(() => {
    if (!open || !proposal) return;
    setApprovalMode(proposal.approvalMode || "Manual");
    setPricingModel(proposal.commissionPct ? "Hybrid" : "Flat fee");
    setFeeMin(String(proposal.baseFeeMin ?? 350));
    setFeeMax(String(proposal.baseFeeMax ?? 450));
    setCommissionPct(String(proposal.commissionPct ?? 0));
    setCurrencyCode(proposal.currency || "USD");
    setDeliverables({
      Live: (proposal.deliverables || []).includes("Live"),
      Clips: (proposal.deliverables || []).includes("Clips"),
      Posts: (proposal.deliverables || []).includes("Posts"),
      Adz: (proposal.deliverables || []).includes("Adz"),
    });
    setMessage(
      `Negotiation update for ${proposal.creator} on ${proposal.campaign}. Let’s align on deliverables, commercial terms, approval handling and response timing.`
    );
    setNextStep("Open negotiation thread");
  }, [open, proposal]);

  if (!open || !proposal) return null;

  const selectedDeliverables = Object.entries(deliverables)
    .filter(([, value]) => value)
    .map(([key]) => key);
  const canSubmit = !!message.trim();

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Negotiation Room</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {proposal.creator} · {proposal.campaign}
            </div>
            <div className="text-[11px] text-slate-500">Proposal ID {proposal.id}</div>
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
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">Current negotiation context</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold">Status: {proposal.status}</span>
              <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-extrabold">Source: {proposal.proposalSource}</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">Use Negotiate here to move into the negotiation workflow rather than a generic contact action.</div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Approval mode</div>
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
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Commercial model</div>
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

            <div className="mt-2 grid grid-cols-[1fr_1fr_0.8fr] gap-2">
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Fee min</div>
                <ProposalInput type="number" value={feeMin} onChange={(e) => setFeeMin(e.target.value)} className="h-10" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Fee max</div>
                <ProposalInput type="number" value={feeMax} onChange={(e) => setFeeMax(e.target.value)} className="h-10" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Currency</div>
                <ProposalSelect value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} className="h-10 px-2">
                  <option>USD</option>
                  <option>UGX</option>
                  <option>EUR</option>
                </ProposalSelect>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Commission %</div>
              <ProposalInput type="number" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} className="h-10" />
            </div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-2">Deliverables</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(deliverables).map((key) => (
                <label
                  key={key}
                  className={cx(
                    "flex items-center gap-2 px-3 py-2 rounded-2xl border cursor-pointer",
                    deliverables[key]
                      ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={deliverables[key]}
                    onChange={(e) => setDeliverables({ ...deliverables, [key]: e.target.checked })}
                  />
                  <span className="text-[12px] font-extrabold text-slate-700 dark:text-slate-200">{key}</span>
                </label>
              ))}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Selected: <span className="font-extrabold">{selectedDeliverables.join(", ") || "None"}</span></div>
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Negotiation message</div>
            <ProposalTextArea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the negotiation update that should go into the workflow…" />
          </section>

          <section>
            <div className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 mb-1">Next workflow step</div>
            <ProposalSelect value={nextStep} onChange={(e) => setNextStep(e.target.value)}>
              <option>Open negotiation thread</option>
              <option>Request revised deliverables</option>
              <option>Escalate to contract review</option>
              <option>Await creator response</option>
            </ProposalSelect>
          </section>

          <div className="text-[10px] text-slate-500">Permissions note: Only Supplier Owner/Admin roles should submit negotiation updates that change binding commercial terms.</div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
          <button
            type="button"
            className="w-full py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => toast(`Full Negotiation Room opened for ${proposal.creator} (demo)`)}
          >
            Open full negotiation workflow
          </button>
          <button
            type="button"
            className={cx(
              "w-full py-2.5 rounded-full text-white text-sm font-extrabold",
              canSubmit ? "bg-[#f77f00] hover:bg-[#e26f00]" : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
            )}
            disabled={!canSubmit}
            onClick={() => {
              onSubmit({
                approvalMode,
                pricingModel,
                currency: currencyCode,
                baseFeeMin: Number(feeMin) || 0,
                baseFeeMax: Number(feeMax) || 0,
                commissionPct: Number(commissionPct) || 0,
                deliverables: selectedDeliverables,
                message,
                nextStep,
              });
              onClose();
            }}
          >
            Send negotiation update
          </button>
        </div>
      </div>
    </div>
  );
}

function ProposalRow({
  proposal,
  selected,
  isExpanded,
  onSelect,
  onToggle,
  onOpenNegotiate,
  onAccept,
  onDecline,
  isPending,
}) {
  const statusColorMap = {
    Draft: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    New: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    "In negotiation": "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700",
    Accepted: "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 border-slate-900 dark:border-slate-600",
    Declined: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
    Expired: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  const originLabel = proposal.origin === "from-creator" ? "From creator" : "My proposal";
  const originClass =
    proposal.origin === "from-creator"
      ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700"
      : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700";

  const valueLabel =
    proposal.baseFeeMin === proposal.baseFeeMax
      ? `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}`
      : `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}–${currencyFormat(proposal.baseFeeMax)}`;

  const canNegotiate = !["Declined", "Expired"].includes(proposal.status);
  const canReviewIncoming =
    proposal.origin === "from-creator" &&
    ["New", "In negotiation"].includes(proposal.status);
  const blockedBySupplierHosted = proposal.creatorUsageDecision === "I will NOT use a Creator";

  return (
    <article
      className={cx(
        "py-3.5 px-3 md:px-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 rounded-2xl border",
        selected
          ? "bg-amber-50/70 dark:bg-amber-900/40 border-amber-200 dark:border-amber-600 shadow-sm"
          : "bg-white dark:bg-slate-900 border-transparent dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-100 dark:hover:border-slate-700"
      )}
      onClick={() => {
        onSelect();
        if (typeof window !== "undefined" && window.innerWidth < 1024) onToggle();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex flex-shrink-0 items-center justify-center text-sm font-black text-slate-900 dark:text-slate-100">
            {proposal.initials}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-black text-slate-900 dark:text-slate-50 truncate">{proposal.creator}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {proposal.campaign}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                {proposal.offerType} · {proposal.region}
              </span>
              <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter transition-colors", originClass)}>
                <span>🤝</span>
                <span>{originLabel}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic mt-0.5">“{proposal.notesShort}”</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right flex-shrink-0" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <span className={cx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all", statusColorMap[proposal.status] || statusColorMap.Draft)}>
              <span className="text-[6px]">●</span>
              <span>{proposal.status}</span>
            </span>
            <div className="lg:hidden text-slate-400 pl-1">
              <span className={cx("transition-transform duration-300 inline-block text-[10px]", isExpanded ? "rotate-180 text-[#f77f00]" : "")}>▼</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-[#f77f00]">
              {valueLabel}
              {proposal.commissionPct > 0 ? <span className="text-[9px] text-slate-400 ml-1 font-bold">+{proposal.commissionPct}%</span> : null}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{proposal.lastActivity}</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {canNegotiate ? (
              <button
                type="button"
                className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                onClick={onOpenNegotiate}
              >
                Negotiate
              </button>
            ) : null}
            {canReviewIncoming ? (
              <button
                type="button"
                className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold hover:bg-emerald-600 disabled:opacity-50"
                onClick={() => onAccept(proposal.id)}
                disabled={isPending || blockedBySupplierHosted}
                title={blockedBySupplierHosted ? "Campaign is supplier-hosted" : undefined}
              >
                {isPending ? <Spinner size={12} /> : "Accept"}
              </button>
            ) : null}
            {canReviewIncoming ? (
              <button
                type="button"
                className="px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-[10px] font-extrabold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/20 disabled:opacity-50"
                onClick={() => onDecline(proposal.id)}
                disabled={isPending}
              >
                Reject
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 lg:hidden">
          <ProposalDetailPanel
            proposal={proposal}
            onOpenNegotiate={onOpenNegotiate}
            onAccept={onAccept}
            onDecline={onDecline}
            isPending={isPending}
            isInline
          />
        </div>
      ) : null}
    </article>
  );
}

function ProposalDetailPanel({ proposal, onOpenNegotiate, onAccept, onDecline, isPending, isInline }) {
  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400 min-h-[260px]">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 max-w-xs transition-colors">
          <p className="text-sm font-medium dark:text-slate-100 mb-1">Select a proposal</p>
          <p className="text-xs dark:text-slate-300">Click a proposal to see full terms, negotiation status and next steps here.</p>
        </div>
      </div>
    );
  }

  const valueLabel =
    proposal.baseFeeMin === proposal.baseFeeMax
      ? `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}`
      : `${proposal.currency} ${currencyFormat(proposal.baseFeeMin)}–${currencyFormat(proposal.baseFeeMax)}`;

  const originLabel = proposal.origin === "from-creator" ? "From creator" : "My proposal";
  const isIncoming = proposal.origin === "from-creator";
  const canReviewIncoming = isIncoming && ["New", "In negotiation"].includes(proposal.status);
  const canNegotiate = !["Declined", "Expired"].includes(proposal.status);
  const blockedBySupplierHosted = proposal.creatorUsageDecision === "I will NOT use a Creator";

  const statusColorMap = {
    Draft: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    New: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    "In negotiation": "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700",
    Accepted: "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 border-slate-900 dark:border-slate-600",
    Declined: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
    Expired: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  let statusHint = "Review this proposal and decide whether to accept, negotiate or decline.";
  if (proposal.status === "Draft") statusHint = "Draft – refine your terms and send when ready.";
  if (proposal.status === "New") statusHint = isIncoming ? "New creator proposal – use Negotiate to enter the negotiation workflow or accept if it already aligns." : "Sent – waiting for creator response.";
  if (proposal.status === "In negotiation") statusHint = "Negotiation in progress – the next workflow step should continue through the negotiation flow rather than a generic contact action.";
  if (proposal.status === "Accepted") statusHint = "Accepted – next step is contract confirmation, scheduling and execution.";
  if (proposal.status === "Declined") statusHint = "Declined – you can still start a fresh proposal from the main + New Proposal action.";
  if (proposal.status === "Expired") statusHint = "Expired – timing closed. Start a fresh proposal if you want to reopen the commercial conversation.";

  return (
    <div className={cx("flex flex-col gap-5 text-sm", isInline ? "p-0 bg-transparent border-none shadow-none" : "")}> 
      {!isInline ? (
        <section className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex flex-shrink-0 items-center justify-center text-base font-black text-slate-900 dark:text-slate-100 shadow-sm transition-colors">
              {proposal.initials}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{proposal.creator}</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{proposal.campaign}</p>
              <span className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                🤝 {originLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fee range</span>
            <span className="text-2xl font-black text-[#f77f00] tracking-tighter">{valueLabel}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              Commission: {proposal.commissionPct > 0 ? `${proposal.commissionPct}% on sales` : "None"}
            </span>
          </div>
        </section>
      ) : null}

      {blockedBySupplierHosted ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300">
          This campaign is configured as <span className="font-extrabold">Supplier-hosted</span> (Creator Usage: “I will NOT use a Creator”).
          You must switch campaign settings before accepting creator proposals.
        </div>
      ) : null}

      <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-2 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800">
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status & Health</span>
        <div className="flex items-center gap-2">
          <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all", statusColorMap[proposal.status] || statusColorMap.Draft)}>
            <span className="text-[6px]">●</span>
            <span>{proposal.status}</span>
          </span>
          <span className="text-[10px] text-slate-400">· {proposal.lastActivity}</span>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{statusHint}</p>

        {isIncoming ? (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Proposal Journey</span>
                <div className="flex items-center gap-1 mt-1">
                  {["Received", "Reviewing", "Negotiating", "Finalizing"].map((step, idx) => {
                    const isCompleted =
                      ["Accepted", "Declined"].includes(proposal.status) ||
                      (proposal.status === "In negotiation" && idx < 2);
                    const isActive =
                      (proposal.status === "New" && idx === 0) ||
                      (proposal.status === "In negotiation" && idx === 2) ||
                      (proposal.status === "Accepted" && idx === 3);
                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div
                            className={cx(
                              "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                              isCompleted
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : isActive
                                ? "bg-[#f77f00] border-[#f77f00] text-white"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
                            )}
                          >
                            {isCompleted ? "✓" : idx + 1}
                          </div>
                          <span className={cx("text-[8px] font-bold uppercase tracking-tighter", isActive ? "text-[#f77f00]" : "text-slate-400")}>{step}</span>
                        </div>
                        {idx < 3 ? <div className={cx("h-0.5 flex-1 mb-4", isCompleted ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")} /> : null}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Proposal details</span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Supplier View</span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2.5 block">Deliverables</span>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex gap-2 font-black text-slate-900 dark:text-slate-100">
                <span className="text-[#f77f00]">●</span>
                {proposal.offerType}
              </li>
              {(proposal.deliverables || []).map((deliverable) => (
                <li key={deliverable} className="flex gap-2 font-medium">
                  <span className="text-slate-300 dark:text-slate-600">●</span>
                  {deliverable}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2.5 block">Target schedule</span>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex gap-2 font-bold">
                <span className="text-[#f77f00]">●</span>
                {proposal.scheduleHint || "TBD"}
              </li>
              <li className="flex gap-2 font-medium">
                <span className="text-slate-300 dark:text-slate-600">●</span>
                Supplier review SLA: {proposal.reviewSlaHours}h
              </li>
              <li className="flex gap-2 font-medium">
                <span className="text-slate-300 dark:text-slate-600">●</span>
                Approval mode: {proposal.approvalMode}
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2.5 block">Total value</span>
            <div className="flex flex-col gap-1.5">
              <span className="text-lg font-black text-[#f77f00] tracking-tighter">{valueLabel}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                {proposal.commissionPct > 0 ? `${proposal.commissionPct}% commission on sales` : "Flat fee only"}
              </span>
              <span className="text-[10px] text-slate-500">Est. campaign value: <span className="font-extrabold">{proposal.currency} {currencyFormat(proposal.estimatedValue)}</span></span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">Campaign-level controls (context)</div>
            <span className="text-[10px] text-slate-500">Source: {proposal.proposalSource || "—"}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={cx(
              "px-2.5 py-1 rounded-full border text-[10px] font-extrabold",
              proposal.creatorUsageDecision === "I will use a Creator"
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : proposal.creatorUsageDecision === "I will NOT use a Creator"
                ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
            )}>
              🎭 {proposal.creatorUsageDecision}
            </span>
            <span className={cx(
              "px-2.5 py-1 rounded-full border text-[10px] font-extrabold",
              proposal.collabMode === "Open for Collabs"
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : proposal.collabMode === "Invite-Only"
                ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            )}>
              🤝 {proposal.collabMode}
            </span>
            <span className={cx(
              "px-2.5 py-1 rounded-full border text-[10px] font-extrabold",
              proposal.approvalMode === "Manual"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            )}>
              🧾 {proposal.approvalMode}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Note: Collab mode switching is only allowed before content submission. Approval mode can be updated per campaign by Supplier Owner/Admin.</div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-5 mt-2">
        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">Current Lock State:</span>
          <span className={cx(
            "text-[11px] font-black tracking-widest",
            proposal.status === "Accepted"
              ? "text-emerald-500"
              : proposal.status === "Declined"
              ? "text-red-400"
              : proposal.status === "Expired"
              ? "text-slate-400"
              : "text-amber-500"
          )}>{String(proposal.status).toUpperCase()}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canReviewIncoming ? (
            <button
              type="button"
              className="px-4 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-sm font-black text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/20 disabled:opacity-50"
              onClick={() => onDecline(proposal.id)}
              disabled={isPending}
            >
              Reject
            </button>
          ) : null}

          {canNegotiate ? (
            <button
              type="button"
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={onOpenNegotiate}
            >
              Negotiate
            </button>
          ) : null}

          {canReviewIncoming ? (
            <button
              type="button"
              className="px-4 py-2.5 rounded-2xl bg-[#f77f00] text-white text-sm font-extrabold hover:bg-[#e26f00] disabled:opacity-50 flex items-center gap-2"
              onClick={() => onAccept(proposal.id)}
              disabled={isPending || blockedBySupplierHosted}
            >
              {isPending ? <Spinner size={14} /> : null}
              Accept
            </button>
          ) : null}

          {proposal.status === "Accepted" ? (
            <>
              <button
                type="button"
                className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => toast("Open Contracts (demo)")}
              >
                View Contract
              </button>
              <button
                type="button"
                className="px-4 py-2.5 rounded-2xl bg-[#f77f00] text-white text-sm font-extrabold hover:bg-[#e26f00]"
                onClick={() => toast("Generate / Confirm Contract (demo)")}
              >
                Generate Contract
              </button>
            </>
          ) : null}
        </div>
      </section>

      <div className="text-[10px] text-slate-500">Permissions note: Only Supplier Owner/Admin roles should accept or decline proposals, negotiate binding commercial terms, or generate contracts.</div>
    </div>
  );
}

export default function SupplierProposalsPreviewCanvas() {
  const [proposals, setProposals] = useState(PROPOSALS);
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [minBudget, setMinBudget] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState(PROPOSALS[0]?.id ?? null);
  const [expandedProposalId, setExpandedProposalId] = useState(null);
  const [negotiationDrawerOpen, setNegotiationDrawerOpen] = useState(false);
  const [negotiationProposalId, setNegotiationProposalId] = useState(null);
  const [proposalDrawerOpen, setProposalDrawerOpen] = useState(false);
  const [proposalRecipientId, setProposalRecipientId] = useState(null);
  const [dataState, setDataState] = useState("ready");
  const { run, isPending } = useAsyncAction();

  const creators = useMemo(() => buildCreatorsFromProposals(proposals), [proposals]);

  const selectedProposal = useMemo(() => {
    if (!selectedProposalId) return proposals[0] ?? null;
    return proposals.find((proposal) => proposal.id === selectedProposalId) ?? proposals[0] ?? null;
  }, [selectedProposalId, proposals]);

  const filteredProposals = useMemo(() => {
    return proposals.filter((proposal) => {
      if (tab === "from-creators" && proposal.origin !== "from-creator") return false;
      if (tab === "my-proposals" && proposal.origin !== "my-proposal") return false;
      if (statusFilter !== "All" && proposal.status !== statusFilter) return false;
      if (categoryFilter !== "All" && proposal.category !== categoryFilter) return false;
      if (minBudget) {
        const min = Number(minBudget) || 0;
        if ((proposal.estimatedValue || 0) < min) return false;
      }
      return true;
    });
  }, [proposals, tab, statusFilter, categoryFilter, minBudget]);

  const negotiationProposal = useMemo(() => proposals.find((proposal) => proposal.id === negotiationProposalId) ?? null, [proposals, negotiationProposalId]);

  useEffect(() => {
    if (selectedProposal) return;
    if (filteredProposals[0]) setSelectedProposalId(filteredProposals[0].id);
  }, [selectedProposal, filteredProposals]);

  function openNegotiation(proposal) {
    setNegotiationProposalId(proposal?.id ?? null);
    setNegotiationDrawerOpen(true);
    if (proposal) {
      toast(`Negotiation workflow opened for ${proposal.creator}.`);
    }
  }

  function openNewProposal(proposal) {
    const creatorName = proposal?.creator;
    const creator = creators.find((item) => item.name === creatorName) || creators[0] || null;
    setProposalRecipientId(creator?.id || null);
    setProposalDrawerOpen(true);
  }

  function handleAccept(id) {
    run(
      async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        setProposals((prev) =>
          prev.map((proposal) => {
            if (proposal.id !== id) return proposal;
            return {
              ...proposal,
              status: "Accepted",
              lastActivity: "Accepted · just now",
              creatorUsageDecision:
                proposal.creatorUsageDecision === "I am NOT SURE yet" ? "I will use a Creator" : proposal.creatorUsageDecision,
              collabMode: proposal.collabMode === "Open for Collabs" ? "Open for Collabs" : "Invite-Only",
            };
          })
        );
      },
      { successMessage: "Proposal accepted." }
    );
  }

  function handleDecline(id) {
    run(
      async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 750));
        setProposals((prev) =>
          prev.map((proposal) =>
            proposal.id === id ? { ...proposal, status: "Declined", lastActivity: "Declined · just now" } : proposal
          )
        );
      },
      { successMessage: "Proposal declined." }
    );
  }

  function applyNegotiation(id, payload) {
    setProposals((prev) =>
      prev.map((proposal) => {
        if (proposal.id !== id) return proposal;
        const shouldStayAccepted = proposal.status === "Accepted";
        return {
          ...proposal,
          status: shouldStayAccepted ? "Accepted" : "In negotiation",
          lastActivity: shouldStayAccepted ? "Negotiation updated · just now" : "Negotiation updated · just now",
          approvalMode: payload.approvalMode,
          baseFeeMin: payload.baseFeeMin,
          baseFeeMax: payload.baseFeeMax,
          commissionPct: payload.commissionPct,
          currency: payload.currency,
          deliverables: payload.deliverables,
          notesShort: payload.message.slice(0, 140) + (payload.message.length > 140 ? "…" : ""),
        };
      })
    );
    toast(`Negotiation update sent for ${negotiationProposal?.creator || "proposal"}.`);
  }

  const badge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
      <span>📄</span>
      <span>Structured offers · Terms · Negotiations</span>
    </span>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Proposals"
        badge={badge}
        right={
          <>
            <button
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => toast("Campaigns Board opened (demo)")}
              type="button"
            >
              View Campaigns Board
            </button>
            <button
              className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-extrabold hover:bg-[#e26f00]"
              onClick={() => openNewProposal(selectedProposal)}
              type="button"
            >
              + New Proposal
            </button>
            <button
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setDataState((state) => (state === "ready" ? "loading" : state === "loading" ? "error" : "ready"))}
              type="button"
            >
              Demo states
            </button>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full p-3 sm:p-4 md:p-6 lg:p-8 pt-8 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                All structured proposals with terms – those you receive from creators and those you send to them.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => toast("Contracts opened (demo)")}
                type="button"
              >
                Open Contracts
              </button>
              <button
                className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white font-extrabold hover:bg-[#e26f00]"
                onClick={() => openNewProposal(selectedProposal)}
                type="button"
              >
                + New Proposal
              </button>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-all shadow-sm p-4 md:p-6 flex flex-col gap-5 text-sm border border-transparent dark:border-slate-800">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
              <div className="flex flex-col gap-2.5 w-full xl:w-auto">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">View Selection</span>
                <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 transition-all w-fit">
                  {TABS.map((item) => {
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        className={cx(
                          "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                          active
                            ? "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                        onClick={() => setTab(item.id)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
                <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-all focus:ring-2 focus:ring-amber-500/20 outline-none cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_FILTERS.map((item) => (
                      <option key={item} value={item} className="bg-white dark:bg-slate-900">
                        {item === "All" ? "All statuses" : item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</span>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-all focus:ring-2 focus:ring-amber-500/20 outline-none cursor-pointer"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item} className="bg-white dark:bg-slate-900">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 flex-1 min-w-[160px]">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Min. Est. Value</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                    <input
                      type="number"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold transition-all focus:ring-2 focus:ring-amber-500/20 outline-none"
                      placeholder="e.g. 500"
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="font-medium">
                Showing <span className="text-slate-900 dark:text-slate-100 font-black">{filteredProposals.length}</span> of <span className="font-bold">{proposals.length}</span> proposals
              </span>
              <button
                className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                onClick={() => {
                  setTab("all");
                  setStatusFilter("All");
                  setCategoryFilter("All");
                  setMinBudget("");
                }}
                type="button"
              >
                Reset Filters
              </button>
            </div>
          </section>

          {dataState === "error" ? (
            <section className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/10 p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center">⚠️</div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Proposals failed to load</div>
                  <div className="text-xs text-rose-800 dark:text-rose-300 mt-1">Check connectivity or try again. (Demo error state)</div>
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
                      onClick={() => toast("AI helper opened (demo)")}
                    >
                      Open AI helper
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] gap-3 items-start text-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold dark:text-slate-50 mb-1">Proposals</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300">Click a proposal to see terms and move into negotiation.</span>
              </div>

              {dataState === "loading" ? (
                <div className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                  <span className="inline-flex items-center gap-2"><Spinner size={14} /> Loading proposals…</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProposals.map((proposal) => (
                    <ProposalRow
                      key={proposal.id}
                      proposal={proposal}
                      selected={selectedProposal?.id === proposal.id}
                      isExpanded={expandedProposalId === proposal.id}
                      onSelect={() => setSelectedProposalId(proposal.id)}
                      onToggle={() => setExpandedProposalId(expandedProposalId === proposal.id ? null : proposal.id)}
                      onOpenNegotiate={() => openNegotiation(proposal)}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      isPending={isPending && selectedProposal?.id === proposal.id}
                    />
                  ))}

                  {filteredProposals.length === 0 ? (
                    <div className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">No proposals match these filters yet.</div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 lg:sticky lg:top-20">
              <ProposalDetailPanel
                proposal={dataState === "ready" ? selectedProposal : null}
                onOpenNegotiate={() => selectedProposal && openNegotiation(selectedProposal)}
                onAccept={handleAccept}
                onDecline={handleDecline}
                isPending={isPending}
              />
            </div>
          </section>
        </div>
      </main>

      <NegotiationDrawer
        open={negotiationDrawerOpen}
        onClose={() => setNegotiationDrawerOpen(false)}
        proposal={negotiationProposal}
        onSubmit={(payload) => {
          if (!negotiationProposal) return;
          applyNegotiation(negotiationProposal.id, payload);
        }}
      />

      <ProposalDrawer
        open={proposalDrawerOpen}
        onClose={() => setProposalDrawerOpen(false)}
        creators={creators}
        initialCreator={creators.find((item) => item.id === proposalRecipientId) || creators[0] || null}
        campaigns={SUPPLIER_CAMPAIGNS}
      />

      <ToastArea />
    </div>
  );
}
