// Round 2 – Page 8: Proposal & Negotiation Room (Creator)
// Purpose: Single workspace to review, chat, and adjust terms. Mirrors seller side.
// Light mode, EVzone orange primary (#f77f00), premium layout.

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
// import { useTheme } from "../../contexts/ThemeContext";
import { PageHeader } from "../../components/PageHeader";
import { creatorApi } from "../../lib/creatorApi";

const STATUS_STEPS = [
  "Draft",
  "Negotiating",
  "Final review",
  "Contract created"
] as const;

type Status = typeof STATUS_STEPS[number];

type Terms = {
  deliverables: string;
  schedule: string;
  compensation: string;
};

type Message = {
  id: number;
  from: "seller" | "creator";
  name: string;
  avatar: string;
  time: string;
  body: string;
};


function ProposalNegotiationRoomPage() {
  const location = useLocation();
  const origin = (location.state as { origin?: string })?.origin || "from-seller";
  const initialProposalId = (location.state as { proposalId?: string })?.proposalId;
  // const { theme } = useTheme();
  const [status, setStatus] = useState<Status>("Negotiating");
  const [proposalId, setProposalId] = useState<string | null>(initialProposalId || null);
  const [sellerName, setSellerName] = useState("GlowUp Hub");
  const [campaignTitle, setCampaignTitle] = useState("Autumn Beauty Flash · Serum Launch");
  const [campaignSummary, setCampaignSummary] = useState(
    "Live + Shoppable Adz campaign to push the new GlowUp serum across East Africa."
  );
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("2h ago");
  const [regionLabel, setRegionLabel] = useState("East Africa · Online only");

  const baseTerms = useMemo(
    () => ({
      deliverables: `• 1x 60–90 min live session (Autumn Beauty Flash)\n• 3x short clips (15–30s) for Shoppable Adz\n• 2x Instagram stories with swipe-up`,
      schedule: `• Live date: Friday, 20:00–21:30 EAT\n• Clips delivery: within 48 hours after live\n• Stories: 24 hours before and after live`,
      compensation: `• Flat fee: $400\n• Commission: 5% on live-driven sales\n• Payment terms: 50% upfront, 50% 7 days after live`
    }),
    []
  );

  const [terms, setTerms] = useState<Terms>(baseTerms);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      from: "seller",
      name: "GlowUp Hub",
      avatar: "GH",
      time: "10:14",
      body:
        "Hi Ronald, we’re excited to do the Autumn Beauty Flash with you. We’ve drafted the terms – feel free to adjust.",
    },
    {
      id: 2,
      from: "creator",
      name: "You",
      avatar: "RY",
      time: "10:20",
      body:
        "Thanks! I’d like to add a small clip package and clarify payment timing. See edits under Compensation.",
    },
    {
      id: 3,
      from: "seller",
      name: "GlowUp Hub",
      avatar: "GH",
      time: "10:32",
      body:
        "Looks good overall. Can we cap the commission only on live sales, not 7 days after?",
    }
  ]);

  const [draftMessage, setDraftMessage] = useState("");

  const hasChanges = {
    deliverables: terms.deliverables !== baseTerms.deliverables,
    schedule: terms.schedule !== baseTerms.schedule,
    compensation: terms.compensation !== baseTerms.compensation
  };

  const riskHints = useMemo(() => {
    const hints = [];
    if (!terms.schedule.toLowerCase().includes("payment")) {
      hints.push("Payment timing is not clearly defined in the schedule.");
    }
    if (!terms.deliverables.toLowerCase().includes("clips") &&
      !terms.deliverables.toLowerCase().includes("stories")) {
      hints.push("No evergreen or promo assets beyond the live are defined.");
    }
    if (!terms.compensation.toLowerCase().includes("kill fee")) {
      hints.push("No kill fee specified if campaign is cancelled last minute.");
    }
    if (!terms.compensation.toLowerCase().includes("exclusivity")) {
      hints.push("No exclusivity window set – consider limiting competitors.");
    }
    return hints;
  }, [terms]);

  const clauseSuggestions = [
    {
      id: "kill-fee",
      title: "Add kill fee",
      body: "In case of cancellation within 24 hours, a 50% kill fee is due."
    },
    {
      id: "exclusivity",
      title: "Limit exclusivity",
      body: "Exclusivity limited to 7 days for competing Beauty & Skincare lives."
    },
    {
      id: "usage-rights",
      title: "Clarify usage rights",
      body: "Brand may use live clips and assets for 90 days across social platforms."
    }
  ];

  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const mapStatus = (value: unknown): Status => {
      const normalized = String(value || "").toUpperCase();
      if (["APPROVED", "ACCEPTED", "CONTRACTED", "CONTRACT_CREATED"].includes(normalized)) return "Contract created";
      if (["FINAL_REVIEW", "FINAL REVIEW", "REVIEW"].includes(normalized)) return "Final review";
      if (["NEGOTIATING", "COUNTERED", "IN_NEGOTIATION"].includes(normalized)) return "Negotiating";
      return "Draft";
    };

    const pickDeliverables = (summary: string, metadata: Record<string, unknown>) => {
      const fromMeta = Array.isArray(metadata.deliverables)
        ? metadata.deliverables.map((entry) => String(entry))
        : [];
      if (fromMeta.length) {
        return fromMeta.map((entry) => `• ${entry}`).join("\n");
      }
      if (summary.trim()) {
        return `• ${summary.trim()}`;
      }
      return baseTerms.deliverables;
    };

    const load = async () => {
      try {
        let resolvedId = proposalId;
        if (!resolvedId) {
          const list = await creatorApi.proposals();
          resolvedId = list[0]?.id || null;
          if (resolvedId && !cancelled) {
            setProposalId(resolvedId);
          }
        }
        if (!resolvedId) return;

        const proposal = await creatorApi.proposal(resolvedId);
        if (cancelled) return;

        const metadata =
          proposal.metadata && typeof proposal.metadata === "object" && !Array.isArray(proposal.metadata)
            ? (proposal.metadata as Record<string, unknown>)
            : {};

        setStatus(mapStatus(proposal.status));
        setSellerName(String(proposal.sellerName || proposal.seller || "GlowUp Hub"));
        setCampaignTitle(String(proposal.campaignTitle || proposal.title || "Campaign"));
        setCampaignSummary(String(proposal.summary || campaignSummary));
        setLastUpdatedLabel("Synced from workspace");
        if (metadata.region) {
          setRegionLabel(String(metadata.region));
        }

        setTerms({
          deliverables: pickDeliverables(String(proposal.summary || ""), metadata),
          schedule: String(metadata.schedule || baseTerms.schedule),
          compensation: String(
            metadata.compensation ||
              (typeof proposal.amount === "number"
                ? `• Flat fee: ${proposal.currency || "USD"} ${proposal.amount.toLocaleString()}`
                : baseTerms.compensation)
          )
        });

        const nextMessages = Array.isArray(proposal.messages)
          ? proposal.messages.map((entry, index) => {
              const row = entry as Record<string, unknown>;
              const author = String(row.author || "");
              const from =
                /you/i.test(author) || /creator/i.test(author) || author === "" ? ("creator" as const) : ("seller" as const);
              return {
                id: index + 1,
                from,
                name: author || (from === "creator" ? "You" : sellerName),
                avatar: from === "creator" ? "RY" : "GH",
                time: row.createdAt ? new Date(String(row.createdAt)).toLocaleTimeString() : "Now",
                body: String(row.body || "")
              };
            })
          : [];

        if (nextMessages.length) {
          setMessages(nextMessages);
        }
      } catch {
        // Keep local UI fallback when API is unavailable.
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [baseTerms.compensation, baseTerms.schedule, proposalId, campaignSummary, sellerName]);

  // Filter out applied suggestions
  const visibleSuggestions = clauseSuggestions.filter(s => !appliedSuggestions.includes(s.id));

  const handleApplyClause = (suggestionId: string, text: string) => {
    const field: keyof Terms = "compensation";

    setTerms((prev) => ({
      ...prev,
      [field]: prev[field] + (prev[field].endsWith("\n") ? "" : "\n") + `• ${text}`
    }));
    setAppliedSuggestions(prev => [...prev, suggestionId]);
  };

  const handleTermChange = (field: keyof Terms, value: string): void => {
    setTerms((prev) => ({ ...prev, [field]: value }));
  };

  /* Attachment logic */
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleSendMessage = () => {
    const trimmed = draftMessage.trim();
    if (!trimmed && !attachedFile) return;

    const newMsg: Message = {
      id: messages.length + 1,
      from: "creator",
      name: "You",
      avatar: "RY",
      time: "Now",
      body: attachedFile
        ? `${trimmed}\n\n📎 Attached: ${attachedFile.name}`
        : trimmed
    };

    setMessages((prev) => [...prev, newMsg]);
    setDraftMessage("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (proposalId) {
      void creatorApi.proposalMessage(proposalId, {
        body: newMsg.body,
        messageType: attachedFile ? "file" : "text"
      });
    }
  };

  // const _currentStepIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Proposal & Negotiation Room"
        badge={
          <span className="text-xs text-slate-500 dark:text-slate-300">
            Proposal ID: {proposalId || "—"} · {campaignTitle}
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full p-2 sm:p-4 md:p-6 lg:p-8 pt-6 sm:pt-8 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          {/* Top summary + status bar */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 sm:p-4 flex flex-col gap-3 text-sm">
            <div className="flex flex-col xl:flex-row gap-3 md:gap-4 justify-between">
              <div className="flex-1 flex gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-md font-semibold dark:font-bold transition-colors">
                  GH
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-md font-semibold dark:font-bold">{sellerName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-white">
                      Top Brand · Beauty & Skincare
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-0.5">
                    {campaignTitle}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-0.5">
                    {campaignSummary}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300 mt-1">
                    <span>Live window: Friday · 20:00–21:30 EAT</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>Region: {regionLabel}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>Category: Beauty & Skincare</span>
                  </div>
                </div>
              </div>
              <div className="w-full xl:w-64 flex flex-col justify-between gap-2">
                {origin === "from-seller" && <AgreementStatusBar status={status} />}
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-200 mt-1">
                  <span>Last updated: {lastUpdatedLabel}</span>
                  <span>Owner: You</span>
                </div>
              </div>
            </div>
            <div className="mt-2 border-t border-slate-100 dark:border-slate-700 pt-2">
              <h3 className="text-xs font-semibold dark:font-bold mb-1">Proposed deliverables</h3>
              <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-slate-200 space-y-0.5">
                {(terms.deliverables || "")
                  .split("\n")
                  .map((line) => line.replace(/^[•\-\s]+/, "").trim())
                  .filter(Boolean)
                  .map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
              </ul>
            </div>
          </section>

          {/* Main grid: Terms editor + Chat + Extras */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)] gap-4 items-start">
            {/* Terms editor + risks */}
            <div className="flex flex-col gap-3">
              <div className="lg:hidden flex flex-col gap-2">
                <CollapsibleWrapper title="Terms Editor" defaultExpanded={false}>
                  <TermsEditor
                    terms={terms}
                    origin={origin}
                  />
                </CollapsibleWrapper>
                <CollapsibleWrapper title="Potential Risks" defaultExpanded={false}>
                  <RiskHints hints={riskHints} />
                </CollapsibleWrapper>
              </div>
              <div className="hidden lg:flex flex-col gap-3">
                <TermsEditor
                  terms={terms}
                  origin={origin}
                />
                <RiskHints hints={riskHints} />
              </div>

              {/* Action Buttons */}
              {origin === "from-seller" && (
                <div className="flex items-center gap-3 mt-2">
                  {status === "Final review" && (
                    <button
                      className="flex-1 py-2.5 rounded-xl bg-[#03cd8c] text-white font-bold text-sm hover:bg-[#02b075] transition-all shadow-sm flex items-center justify-center gap-2"
                      onClick={() => setStatus("Contract created")}
                    >
                      <span>✍️</span>
                      <span>Sign & Accept</span>
                    </button>
                  )}
                  {status === "Contract created" && (
                    <div className="flex-1 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
                      <span>✓</span>
                      <span>Contract Active</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat thread */}
            <div className="flex flex-col gap-3">
              <ChatThread
                messages={messages}
                draftMessage={draftMessage}
                onDraftChange={setDraftMessage}
                onSend={handleSendMessage}
                onAttach={handleAttachClick}
                attachedFile={attachedFile}
              />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* Agreement status bar */
type AgreementStatusBarProps = {
  status: Status;
};

function AgreementStatusBar({ status }: AgreementStatusBarProps) {
  const currentIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-xs transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold dark:font-bold">Agreement status</span>
        <span className="text-slate-500 dark:text-slate-300 hidden sm:inline">{status}</span>
      </div>
      <div className="flex items-center gap-1">
        {STATUS_STEPS.map((step, idx) => {
          const active = idx === currentIndex;
          const completed = idx < currentIndex;
          return (
            <div key={step} className="flex-1 flex items-center">
              <div
                className={`flex items-center justify-center h-6 w-6 rounded-full border text-xs font-semibold dark:font-bold ${completed
                  ? "bg-[#03cd8c] border-[#03cd8c] text-white"
                  : active
                    ? "bg-[#f77f00] border-[#f77f00] text-white"
                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-300"
                  }`}
              >
                {completed ? "✓" : idx + 1}
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 mx-1 transition-colors" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Terms editor */
type TermsEditorProps = {
  terms: Terms;
  baseTerms: Terms;
  hasChanges: Record<keyof Terms, boolean>;
  onTermChange: (field: keyof Terms, value: string) => void;
};

function TermsEditor({ terms, origin }: { terms: Terms; origin: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Locked Terms</h3>
        <span className="text-xs text-slate-500 dark:text-slate-300">
          {origin === "from-seller"
            ? "Only suppliers can edit terms in negotiation."
            : "Review your pitched terms. Brands will respond if they accept or wish to negotiate."}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <TermColumn
          title="Deliverables"
          value={terms.deliverables}
        />
        <TermColumn
          title="Schedule"
          value={terms.schedule}
        />
        <TermColumn
          title="Compensation"
          value={terms.compensation}
        />
      </div>
    </div>
  );
}

function TermColumn({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold dark:font-bold">{title}</span>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] border border-slate-200 dark:border-slate-700 transition-colors">
          Read Only
        </span>
      </div>
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 min-h-[120px] whitespace-pre-wrap transition-colors">
        {value}
      </div>
    </div>
  );
}

/* Risk hints */
type RiskHintsProps = {
  hints: string[];
};

function RiskHints({ hints }: RiskHintsProps) {
  if (!hints || hints.length === 0) return null;
  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-3 flex flex-col gap-1 text-xs text-amber-800 dark:text-amber-300 transition-colors">
      <div className="flex items-center gap-1 text-amber-800 mb-1">
        <span>⚠️</span>
        <span className="font-semibold dark:font-bold text-sm">Potential risks detected</span>
      </div>
      <ul className="list-disc pl-4 text-amber-900 space-y-0.5">
        {hints.map((hint, idx) => (
          <li key={idx}>{hint}</li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-amber-900">
        Address these points to protect both you and the brand before moving to Final review.
      </p>
    </div>
  );
}

/* Clause suggestions */
type ClauseSuggestion = {
  id: string;
  title: string;
  body: string;
};

type ClauseSuggestionsProps = {
  suggestions: ClauseSuggestion[];
  onApply: (id: string, text: string) => void;
};

function ClauseSuggestions({ suggestions, onApply }: ClauseSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Clause suggestions</h3>
        <span className="text-xs text-slate-500 dark:text-slate-300">Optional, but recommended</span>
      </div>
      <ul className="space-y-1.5">
        {suggestions.map((sugg: ClauseSuggestion) => (
          <li
            key={sugg.id}
            className="border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-800 flex items-start justify-between gap-2 transition-colors"
          >
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs">✨</span>
                <span className="text-sm font-medium">{sugg.title}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">{sugg.body}</p>
            </div>
            <button
              className="text-xs px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 whitespace-nowrap transition-colors"
              onClick={() => onApply(sugg.id, sugg.body)}
            >
              Apply
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Chat thread */
type ChatThreadProps = {
  messages: Message[];
  draftMessage: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onAttach: () => void;
  attachedFile: File | null;
};

function ChatThread({ messages, draftMessage, onDraftChange, onSend, onAttach, attachedFile }: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col h-[420px] md:h-[480px] text-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Negotiation chat</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Chat with the brand while you adjust terms. All changes are visible to both sides.
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300 hidden md:inline">
          Messages are kept with the contract record.
        </span>
      </div>
      <div className="flex-1 border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 overflow-y-auto space-y-2 transition-colors">
        {messages.map((msg: Message) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
        <span>Attach:</span>
        <button
          className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          onClick={onAttach}
        >
          Concept note
        </button>
        <button
          className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          onClick={onAttach}
        >
          Draft script
        </button>
        <button
          className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          onClick={onAttach}
        >
          File
        </button>
      </div>
      {attachedFile && (
        <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
          <span>📎 Attached: {attachedFile.name}</span>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <textarea
          rows={2}
          className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none resize-none transition-colors"
          placeholder="Type a message to the brand…"
          value={draftMessage}
          onChange={(e) => onDraftChange(e.target.value)}
        />
        <button
          className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold hover:bg-[#e26f00]"
          onClick={onSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}

type ChatMessageProps = {
  message: Message;
};

function ChatMessage({ message }: ChatMessageProps) {
  const isCreator = message.from === "creator";
  const alignment = isCreator ? "justify-end" : "justify-start";
  const bubbleColor = isCreator
    ? "bg-[#f77f00] text-white"
    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-colors";

  return (
    <div className={`flex ${alignment}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm shadow-sm ${bubbleColor}`}
      >
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold">
            {isCreator ? "You" : message.name}
          </span>
          <span className="text-tiny opacity-80">{message.time}</span>
        </div>
        <p className="text-sm whitespace-pre-line">{message.body}</p>
      </div>
    </div>
  );
}

/* Helper to wrap mobile collapsible sections */
function CollapsibleWrapper({ title, children, defaultExpanded = false }: { title: string; children: React.ReactNode; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <span>{title}</span>
        <span>{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded && <div className="p-0 border-t border-slate-50 dark:border-slate-800">{children}</div>}
    </div>
  );
}

export { ProposalNegotiationRoomPage };
