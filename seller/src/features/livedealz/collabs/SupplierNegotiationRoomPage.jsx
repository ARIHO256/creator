import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";

/**
 * SupplierNegotiationRoomPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: ProposalNegotiationRoomPage.tsx (Creator)
 *
 * Mirror-first preserved:
 * - PageHeader + premium top summary card
 * - Agreement status bar (Draft → Negotiating → Final review → Contract created)
 * - Deliverables summary list
 * - Main 2-col grid: Terms editor + risk hints (left) + chat thread (right)
 * - Mobile collapsible wrappers
 * - Attachment flow + auto-scroll chat
 *
 * Supplier adaptations (minimal + required):
 * - Supplier CAN edit terms (Creator sees changes).
 * - Primary actions: Save term updates, move to Final review, Create contract (supplier-side).
 * - Invite-only context: negotiation starts after creator ACCEPTS invite to collaborate.
 * - Campaign-level settings surfaced: Collaboration mode + Content approval mode.
 * - Edge cases supported: creator declines, supplier ends negotiation, renegotiation reopen.
 *
 * Runtime notes:
 * - Reads proposalId from URL query and loads negotiation room from backend.
 * - No external icon libs.
 */

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";

const STATUS_STEPS = ["Draft", "Negotiating", "Final review", "Contract created"];
const DEFAULT_TERMS = {
  deliverables:
    "• 1x 60–90 min live session\n• 3x short clips (15–30s)\n• 2x stories with CTA",
  schedule:
    "• Live date: To be agreed\n• Assets delivery: To be agreed\n• Payment timing: To be agreed",
  compensation:
    "• Flat fee: To be agreed\n• Commission: To be agreed\n• Payment terms: To be agreed"
};

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function initialsFromName(value, fallback = "CR") {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return initials || fallback;
}

function normalizeStage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "draft") return "Draft";
  if (normalized === "final review" || normalized === "final-review") return "Final review";
  if (normalized === "contract created" || normalized === "contract-created") return "Contract created";
  return "Negotiating";
}

function formatMessageTime(value) {
  if (!value) return "Now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Now";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseBulletList(value) {
  const raw = String(value || "");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[•-]\s*/, "").trim())
    .filter(Boolean);
}

function PageHeader({ pageTitle, badge, right }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="min-w-0 px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 truncate">{pageTitle}</div>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
        {right ? <div className="flex flex-wrap items-center justify-end gap-2">{right}</div> : null}
      </div>
    </header>
  );
}

function Pill({ tone = "neutral", children, title }) {
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
      className={cx("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", className = "", disabled, onClick, children, title }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "success"
        ? "border-transparent text-white hover:brightness-95"
        : tone === "ghost"
          ? "border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
          : tone === "danger"
            ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800";

  const style =
    tone === "primary" ? { background: ORANGE } : tone === "success" ? { background: GREEN } : undefined;

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(base, cls, className)}
      style={style}
    >
      {children}
    </button>
  );
}

function Toast({ text, tone = "info", onClose }) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [text, onClose]);

  if (!text) return null;
  const dot =
    tone === "success" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : tone === "error" ? "bg-rose-500" : "bg-slate-400";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
      <div className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-xs font-semibold shadow-lg flex items-center gap-2">
        <span className={cx("h-2 w-2 rounded-full", dot)} />
        <span>{text}</span>
      </div>
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function SupplierNegotiationRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const proposalId = asString(searchParams.get("proposalId"));
  const queryCampaign = asString(searchParams.get("campaign"), "Campaign");
  const queryCreator = asString(searchParams.get("creator"), "Creator");

  const [entry, setEntry] = useState("direct");
  const [creatorUsageDecision, setCreatorUsageDecision] = useState("I will use a Creator");
  const [collabMode, setCollabMode] = useState("Invite-only");
  const [approvalMode, setApprovalMode] = useState("Manual");
  const [status, setStatus] = useState("Negotiating");
  const [closedReason, setClosedReason] = useState(null);
  const [baseTerms, setBaseTerms] = useState(DEFAULT_TERMS);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [messages, setMessages] = useState([]);
  const [proposalRoom, setProposalRoom] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState("");
  const [savingTerms, setSavingTerms] = useState(false);
  const [syncingRoom, setSyncingRoom] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastTone, setToastTone] = useState("info");
  const [appliedSuggestions, setAppliedSuggestions] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const requestRef = useRef(0);

  const supplierAsCreator = creatorUsageDecision === "I will NOT use a Creator";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toastIt = (msg, tone = "info") => {
    setToastTone(tone);
    setToast(msg);
  };

  const loadNegotiationRoom = async (opts = {}) => {
    const silent = opts.silent === true;
    if (!proposalId) {
      setLoadingRoom(false);
      setRoomError("Missing proposalId. Open this page from Proposals to load live negotiation data.");
      setProposalRoom(null);
      setMessages([]);
      return null;
    }
    if (!silent) setLoadingRoom(true);
    setRoomError("");
    const requestId = ++requestRef.current;
    try {
      const payload = await sellerBackendApi.getCollaborationProposalNegotiationRoom(proposalId);
      if (requestId !== requestRef.current) return null;

      const room = asRecord(payload);
      const summary = asRecord(room.summary);
      const metadata = asRecord(room.metadata);
      const roomTerms = asRecord(room.terms);
      const creatorName = asString(summary.creatorName, queryCreator);
      const sellerName = asString(summary.sellerName, "Supplier");
      const mappedTerms = {
        deliverables: asString(roomTerms.deliverables, DEFAULT_TERMS.deliverables),
        schedule: asString(roomTerms.schedule, DEFAULT_TERMS.schedule),
        compensation: asString(roomTerms.compensation, DEFAULT_TERMS.compensation)
      };
      const roomMessages = Array.isArray(room.messages) ? room.messages : [];
      const mappedMessages = roomMessages
        .map((entryMessage, index) => {
          const messageRecord = asRecord(entryMessage);
          const messageType = asString(messageRecord.messageType, "COMMENT").toUpperCase();
          const author = asString(messageRecord.author);
          let from = "creator";
          if (messageType === "SYSTEM") from = "system";
          if (author && author.toLowerCase() === sellerName.toLowerCase()) from = "supplier";
          return {
            id: asString(messageRecord.id, `${index + 1}`),
            from,
            name: from === "system" ? "System" : from === "supplier" ? "You (Supplier)" : author || creatorName || "Creator",
            time: formatMessageTime(messageRecord.createdAt),
            body: asString(messageRecord.body)
          };
        })
        .filter((entryMessage) => entryMessage.body);

      setProposalRoom({
        ...room,
        summary,
        metadata
      });
      setEntry(asString(room.entryContext, "direct"));
      setCreatorUsageDecision(asString(room.creatorUsageDecision, "I will use a Creator"));
      setCollabMode(asString(room.collabMode, "Invite-only"));
      setApprovalMode(asString(room.approvalMode, "Manual"));
      setStatus(normalizeStage(room.stage));
      setClosedReason(asString(room.closedReason) || null);
      setBaseTerms(mappedTerms);
      setTerms(mappedTerms);
      setMessages(mappedMessages);
      setAppliedSuggestions([]);
      setLoadingRoom(false);
      return room;
    } catch (error) {
      if (requestId !== requestRef.current) return null;
      setLoadingRoom(false);
      setProposalRoom(null);
      setRoomError(error instanceof Error ? error.message : "Failed to load negotiation room from database.");
      return null;
    }
  };

  useEffect(() => {
    void loadNegotiationRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const hasChanges = useMemo(
    () => ({
      deliverables: terms.deliverables !== baseTerms.deliverables,
      schedule: terms.schedule !== baseTerms.schedule,
      compensation: terms.compensation !== baseTerms.compensation
    }),
    [terms, baseTerms]
  );

  const riskHints = useMemo(() => {
    const hints = [];
    const schedule = (terms.schedule || "").toLowerCase();
    const deliverables = (terms.deliverables || "").toLowerCase();
    const comp = (terms.compensation || "").toLowerCase();

    if (!schedule.includes("payment")) hints.push("Payment timing is not clearly defined in the schedule.");
    if (!deliverables.includes("clips") && !deliverables.includes("stories"))
      hints.push("No evergreen/promo assets beyond the live are defined.");
    if (!comp.includes("kill fee")) hints.push("No kill fee specified if campaign is cancelled last minute.");
    if (!comp.includes("exclusivity")) hints.push("No exclusivity window set – consider limiting competitors.");
    if (approvalMode === "Auto")
      hints.push("Auto approval enabled: ensure brand compliance rules are covered to avoid Admin rejections.");

    return hints;
  }, [terms, approvalMode]);

  const clauseSuggestions = useMemo(
    () => [
      { id: "kill-fee", title: "Add kill fee", body: "In case of cancellation within 24 hours, a 50% kill fee is due." },
      { id: "exclusivity", title: "Limit exclusivity", body: "Exclusivity limited to 7 days for competing Beauty & Skincare lives." },
      { id: "usage-rights", title: "Clarify usage rights", body: "Brand may use live clips and assets for 90 days across social platforms." }
    ],
    []
  );

  const visibleSuggestions = useMemo(
    () => clauseSuggestions.filter((s) => !appliedSuggestions.includes(s.id)),
    [clauseSuggestions, appliedSuggestions]
  );

  const applyClause = (id, text) => {
    if (supplierAsCreator) return;
    setTerms((prev) => ({
      ...prev,
      compensation: prev.compensation + (String(prev.compensation || "").endsWith("\n") ? "" : "\n") + `• ${text}`
    }));
    setAppliedSuggestions((current) => [...current, id]);
  };

  const updateRoomSettings = async (patch, successMessage) => {
    if (!proposalId) {
      toastIt("Missing proposalId. Open this page from Proposals to sync changes.", "warn");
      return;
    }
    setSyncingRoom(true);
    try {
      await sellerBackendApi.updateCollaborationProposalNegotiationRoom(proposalId, patch);
      await loadNegotiationRoom({ silent: true });
      if (successMessage) toastIt(successMessage, "success");
    } catch (error) {
      toastIt(error instanceof Error ? error.message : "Failed to update negotiation room.", "error");
    } finally {
      setSyncingRoom(false);
    }
  };

  const canEditTerms = !supplierAsCreator && !closedReason && !savingTerms;

  const saveTermUpdates = async () => {
    if (!canEditTerms) return;
    if (!proposalId) {
      toastIt("Missing proposalId. Cannot save live negotiation terms.", "error");
      return;
    }
    setSavingTerms(true);
    try {
      await sellerBackendApi.updateCollaborationProposalNegotiationRoom(proposalId, { terms });
      await loadNegotiationRoom({ silent: true });
      toastIt("Terms update saved", "success");
    } catch (error) {
      toastIt(error instanceof Error ? error.message : "Failed to save terms.", "error");
    } finally {
      setSavingTerms(false);
    }
  };

  const moveToFinalReview = async () => {
    if (closedReason) return;
    setStatus("Final review");
    await updateRoomSettings({ stage: "Final review" }, "Moved to Final review");
  };

  const createContract = async () => {
    if (closedReason) return;
    if (!proposalId) {
      toastIt("Missing proposalId. Cannot create contract.", "error");
      return;
    }
    setSyncingRoom(true);
    try {
      await sellerBackendApi.transitionCollaborationProposal(proposalId, { status: "ACCEPTED" });
      await loadNegotiationRoom({ silent: true });
      toastIt("Contract created", "success");
    } catch (error) {
      toastIt(error instanceof Error ? error.message : "Failed to create contract.", "error");
    } finally {
      setSyncingRoom(false);
    }
  };

  const endNegotiation = async (reason) => {
    if (!proposalId) {
      toastIt("Missing proposalId. Cannot close negotiation.", "error");
      return;
    }
    setSyncingRoom(true);
    try {
      await sellerBackendApi.closeCollaborationProposalNegotiationRoom(proposalId, { reason });
      await loadNegotiationRoom({ silent: true });
      toastIt("Negotiation closed", "warn");
    } catch (error) {
      toastIt(error instanceof Error ? error.message : "Failed to close negotiation.", "error");
    } finally {
      setSyncingRoom(false);
    }
  };

  const reopenNegotiation = async () => {
    if (!proposalId) {
      toastIt("Missing proposalId. Cannot reopen negotiation.", "error");
      return;
    }
    setSyncingRoom(true);
    try {
      await sellerBackendApi.reopenCollaborationProposalNegotiationRoom(proposalId);
      await loadNegotiationRoom({ silent: true });
      toastIt("Renegotiation reopened", "success");
    } catch (error) {
      toastIt(error instanceof Error ? error.message : "Failed to reopen negotiation.", "error");
    } finally {
      setSyncingRoom(false);
    }
  };

  const sendMessage = async () => {
    if (closedReason) return;
    const trimmed = String(draftMessage || "").trim();
    if (!trimmed && !attachedFile) return;
    if (!proposalId) {
      toastIt("Missing proposalId. Cannot send live negotiation message.", "error");
      return;
    }

    const body = attachedFile
      ? `${trimmed}${trimmed ? "\n\n" : ""}Attached file: ${attachedFile.name}`
      : trimmed;
    setSendingMessage(true);
    try {
      const created = await sellerBackendApi.createCollaborationProposalMessage(proposalId, {
        body,
        messageType: "COMMENT"
      });
      const createdRecord = asRecord(created);
      setMessages((prev) => [
        ...prev,
        {
          id: asString(createdRecord.id, `${Date.now()}`),
          from: "supplier",
          name: "You (Supplier)",
          time: formatMessageTime(createdRecord.createdAt),
          body: asString(createdRecord.body, body)
        }
      ]);
      setDraftMessage("");
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toastIt("Message sent", "success");
    } catch (error) {
      toastIt(error instanceof Error ? error.message : "Failed to send message.", "error");
    } finally {
      setSendingMessage(false);
    }
  };

  const summary = asRecord(proposalRoom?.summary);
  const metadata = asRecord(proposalRoom?.metadata);
  const creatorName = asString(summary.creatorName, queryCreator || "Creator");
  const creatorHandle = asString(summary.creatorHandle, "@creator");
  const sellerName = asString(summary.sellerName, "Supplier");
  const campaignTitle = asString(summary.campaignTitle, queryCampaign || "Campaign");
  const campaignDescription = asString(
    metadata.campaignSummary,
    asString(metadata.messageShort, "Negotiation details synchronized from proposal data.")
  );
  const liveWindow = asString(metadata.scheduleHint, "Schedule in terms panel");
  const region = asString(metadata.region, "Region not set");
  const category = asString(metadata.category, "General");
  const lastUpdatedAt = asString(proposalRoom?.updatedAt);
  const lastUpdatedLabel = (() => {
    if (!lastUpdatedAt) return "Last updated: —";
    const parsed = new Date(lastUpdatedAt);
    return Number.isNaN(parsed.getTime()) ? `Last updated: ${lastUpdatedAt}` : `Last updated: ${parsed.toLocaleString()}`;
  })();
  const deliverableHighlights = parseBulletList(terms.deliverables);

  const pageBadge = (
    <span className="text-xs text-slate-500 dark:text-slate-300">
      {`Proposal: ${proposalId || "—"} · ${campaignTitle} · ${collabMode} collaboration`}
    </span>
  );

  const headerRight = (
    <>
      <Btn
        tone="ghost"
        onClick={() => navigate("/mldz/collab/proposals")}
        title="Back to proposals"
      >
        ← Proposals
      </Btn>
      <Btn
        tone="ghost"
        onClick={() => navigate("/mldz/collab/contracts")}
        title="Open contracts"
      >
        ✍️ Contracts
      </Btn>
      {closedReason ? (
        <Btn tone="primary" onClick={() => void reopenNegotiation()} title="Reopen negotiation" disabled={syncingRoom}>
          🔁 Reopen
        </Btn>
      ) : (
        <EndNegotiationMenu onEnd={(reason) => void endNegotiation(reason)} disabled={syncingRoom} />
      )}
    </>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <PageHeader pageTitle="Negotiation Room" badge={pageBadge} right={headerRight} />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          {roomError ? (
            <section className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3 text-sm text-amber-900 dark:text-amber-300">
              {roomError}
            </section>
          ) : null}

          {loadingRoom ? (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm text-slate-600 dark:text-slate-300">
              Loading negotiation room from database…
            </section>
          ) : null}

          {/* Top summary + status bar */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 sm:p-4 flex flex-col gap-3 text-sm">
            <div className="flex flex-col xl:flex-row gap-3 md:gap-4 justify-between">
              <div className="flex-1 flex gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-md font-semibold dark:font-bold transition-colors">
                  {initialsFromName(creatorName)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-md font-semibold dark:font-bold">{creatorName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-white">{creatorHandle}</span>
                  </div>
                  <p className="text-sm font-medium mb-0.5">{campaignTitle}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-0.5">
                    {campaignDescription}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300 mt-1">
                    <span>{`Live window: ${liveWindow}`}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{`Region: ${region}`}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{`Category: ${category}`}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill tone={creatorUsageDecision === "I will use a Creator" ? "good" : creatorUsageDecision === "I will NOT use a Creator" ? "warn" : "neutral"}>
                      {creatorUsageDecision}
                    </Pill>
                    <Pill tone="neutral">Collab: {collabMode}</Pill>
                    <Pill tone={approvalMode === "Manual" ? "warn" : "good"}>Content approval: {approvalMode}</Pill>
                    <Pill tone={entry === "invite-accepted" ? "good" : "neutral"} title="How this room was opened">
                      Entry: {entry === "invite-accepted" ? "Invite accepted" : entry === "open-collabs-pitch" ? "Open collabs pitch" : "Direct"}
                    </Pill>
                    <Pill tone={proposalId ? "good" : "warn"} title="Negotiation data source">
                      {proposalId ? "Live DB source" : "No DB source"}
                    </Pill>
                  </div>
                </div>
              </div>

              <div className="w-full xl:w-72 flex flex-col justify-between gap-2">
                <AgreementStatusBar
                  status={status}
                  onStep={(step) => {
                    if (closedReason) return;
                    setStatus(step);
                    void updateRoomSettings({ stage: step }, "Agreement stage updated");
                  }}
                />

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-200 mt-1">
                  <span>{lastUpdatedLabel}</span>
                  <span>{`Owner: ${sellerName}`}</span>
                </div>

                {closedReason ? (
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-300">Negotiation closed</div>
                    <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">Reason: {closedReason}</div>
                    <div className="mt-2 text-[11px] text-amber-900/80 dark:text-amber-300/80">
                      Reopen if you want to renegotiate.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-2 border-t border-slate-100 dark:border-slate-700 pt-2">
              <h3 className="text-xs font-semibold dark:font-bold mb-1">Proposed deliverables</h3>
              <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-slate-200 space-y-0.5">
                {(deliverableHighlights.length ? deliverableHighlights : ["Deliverables not defined yet."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Supplier-as-Creator guardrail (still mirrors layout, but warns) */}
          {supplierAsCreator ? (
            <section className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-amber-900 dark:text-amber-300">Supplier-hosted campaign</div>
                  <div className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                    This campaign is set to “I will NOT use a Creator”, so negotiation is typically not required.
                    You can still keep internal terms as a record, but collaboration chat should be disabled.
                  </div>
                </div>
                <Pill tone="warn">Supplier acts as Creator</Pill>
              </div>
            </section>
          ) : null}

          {/* Main grid: Terms editor + Chat */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)] gap-4 items-start">
            {/* Terms editor + risks */}
            <div className="flex flex-col gap-3">
              <div className="lg:hidden flex flex-col gap-2">
                <CollapsibleWrapper title="Terms Editor" defaultExpanded>
                  <TermsEditor
                    terms={terms}
                    baseTerms={baseTerms}
                    hasChanges={hasChanges}
                    canEdit={canEditTerms}
                    onTermChange={(field, value) => setTerms((p) => ({ ...p, [field]: value }))}
                    onReset={() => setTerms(baseTerms)}
                    onSave={saveTermUpdates}
                  />
                </CollapsibleWrapper>
                <CollapsibleWrapper title="Potential Risks" defaultExpanded={false}>
                  <RiskHints hints={riskHints} />
                </CollapsibleWrapper>
                <CollapsibleWrapper title="Clause suggestions" defaultExpanded={false}>
                  <ClauseSuggestions suggestions={visibleSuggestions} onApply={applyClause} disabled={!canEditTerms} />
                </CollapsibleWrapper>
              </div>

              <div className="hidden lg:flex flex-col gap-3">
                <TermsEditor
                  terms={terms}
                  baseTerms={baseTerms}
                  hasChanges={hasChanges}
                  canEdit={canEditTerms}
                  onTermChange={(field, value) => setTerms((p) => ({ ...p, [field]: value }))}
                  onReset={() => setTerms(baseTerms)}
                  onSave={saveTermUpdates}
                />
                <RiskHints hints={riskHints} />
                <ClauseSuggestions suggestions={visibleSuggestions} onApply={applyClause} disabled={!canEditTerms} />

                {/* Action Buttons */}
                {!closedReason ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1">
                    <Btn
                      tone="success"
                      className="flex-1"
                      onClick={() => {
                        if (!proposalId) {
                          toastIt("Missing proposalId. Cannot notify creator.", "warn");
                          return;
                        }
                        void sellerBackendApi
                          .createCollaborationProposalMessage(proposalId, {
                            body: "Supplier requested a quick call to finalize details.",
                            messageType: "COMMENT"
                          })
                          .then(() => {
                            toastIt("Call request sent", "success");
                            return loadNegotiationRoom({ silent: true });
                          })
                          .catch((error) => {
                            toastIt(error instanceof Error ? error.message : "Failed to send call request.", "error");
                          });
                      }}
                      title="Request a quick call"
                      disabled={supplierAsCreator || syncingRoom}
                    >
                      📞 Request call
                    </Btn>

                    {status !== "Contract created" ? (
                      <Btn
                        tone="primary"
                        className="flex-1"
                        onClick={() => void (status === "Final review" ? createContract() : moveToFinalReview())}
                        disabled={supplierAsCreator || syncingRoom}
                        title={status === "Final review" ? "Create contract" : "Move to Final review"}
                      >
                        {status === "Final review" ? (
                          <>
                            <span>✍️</span>
                            <span>Create contract</span>
                          </>
                        ) : (
                          <>
                            <span>✅</span>
                            <span>Send to Final review</span>
                          </>
                        )}
                      </Btn>
                    ) : (
                      <div className="flex-1 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
                        <span>✓</span>
                        <span>Contract Active</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Chat thread */}
            <div className="flex flex-col gap-3">
              <ChatThread
                disabled={!!closedReason || supplierAsCreator || sendingMessage || syncingRoom}
                disabledReason={supplierAsCreator ? "Campaign is Supplier-hosted (no creator involved)." : closedReason ? "Negotiation closed." : ""}
                messages={messages}
                draftMessage={draftMessage}
                onDraftChange={setDraftMessage}
                onSend={() => void sendMessage()}
                onAttach={() => fileInputRef.current?.click()}
                attachedFile={attachedFile}
                messagesEndRef={messagesEndRef}
              />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setAttachedFile(e.target.files[0]);
                }}
              />

              {/* Negotiation room controls */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Room settings</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-slate-500">Entry</div>
                    <select
                      value={entry}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEntry(next);
                        void updateRoomSettings({ entryContext: next }, "Entry context updated");
                      }}
                      className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                    >
                      <option value="invite-accepted">Invite accepted</option>
                      <option value="open-collabs-pitch">Open collabs pitch</option>
                      <option value="direct">Direct</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-500">Content approval</div>
                    <select
                      value={approvalMode}
                      onChange={(e) => {
                        const next = e.target.value;
                        setApprovalMode(next);
                        void updateRoomSettings({ approvalMode: next }, "Approval mode updated");
                      }}
                      className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                    >
                      <option value="Manual">Manual</option>
                      <option value="Auto">Auto</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-500">Creator usage</div>
                    <select
                      value={creatorUsageDecision}
                      onChange={(e) => {
                        const next = e.target.value;
                        setCreatorUsageDecision(next);
                        void updateRoomSettings({ creatorUsageDecision: next }, "Creator usage updated");
                      }}
                      className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                    >
                      <option value="I will use a Creator">I will use a Creator</option>
                      <option value="I will NOT use a Creator">I will NOT use a Creator</option>
                      <option value="I am NOT SURE yet">I am NOT SURE yet</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-500">Collab mode</div>
                    <select
                      value={collabMode}
                      onChange={(e) => {
                        const next = e.target.value;
                        setCollabMode(next);
                        void updateRoomSettings({ collabMode: next }, "Collab mode updated");
                      }}
                      className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none"
                    >
                      <option value="Open for Collabs">Open for Collabs</option>
                      <option value="Invite-only">Invite-only</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-500">
                  Permission note: only Supplier Owner/Admin should change governance settings.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Toast text={toast} tone={toastTone} onClose={() => setToast(null)} />
    </div>
  );
}

/* ----------------------------- Agreement status bar ----------------------------- */

function AgreementStatusBar({ status, onStep }) {
  const currentIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-xs transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold dark:font-bold">Agreement status</span>
        <span className="text-slate-500 dark:text-slate-300 hidden sm:inline">{status}</span>
      </div>

      <div className="flex items-center gap-1">
        {STATUS_STEPS.map((step, idx) => {
          const active = idx === currentIndex;
          const completed = idx < currentIndex;
          const circleClass = completed
            ? "bg-[#03cd8c] border-[#03cd8c] text-white"
            : active
              ? "bg-[#f77f00] border-[#f77f00] text-white"
              : "bg-white dark:bg-slate-900 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-300";

          return (
            <div key={step} className="flex-1 flex items-center">
              <button
                type="button"
                className={cx(
                  "flex items-center justify-center h-6 w-6 rounded-full border text-xs font-semibold dark:font-bold transition-colors",
                  circleClass
                )}
                onClick={() => onStep?.(step)}
                title="Set agreement status"
              >
                {completed ? "✓" : idx + 1}
              </button>
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

/* ----------------------------- Terms editor ----------------------------- */

function TermsEditor({ terms, baseTerms, hasChanges, canEdit, onTermChange, onReset, onSave }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Terms Editor</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
            Supplier can edit terms during negotiation. Creator sees updates and can counter in chat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Btn
            tone="ghost"
            onClick={onReset}
            disabled={!canEdit || (!hasChanges.deliverables && !hasChanges.schedule && !hasChanges.compensation)}
            title="Reset to baseline"
          >
            ↺ Reset
          </Btn>
          <Btn
            tone="primary"
            onClick={onSave}
            disabled={!canEdit || (!hasChanges.deliverables && !hasChanges.schedule && !hasChanges.compensation)}
            title="Save term updates"
          >
            💾 Save
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <TermColumn
          title="Deliverables"
          value={terms.deliverables}
          changed={hasChanges.deliverables}
          canEdit={canEdit}
          placeholder={baseTerms.deliverables}
          onChange={(v) => onTermChange("deliverables", v)}
        />
        <TermColumn
          title="Schedule"
          value={terms.schedule}
          changed={hasChanges.schedule}
          canEdit={canEdit}
          placeholder={baseTerms.schedule}
          onChange={(v) => onTermChange("schedule", v)}
        />
        <TermColumn
          title="Compensation"
          value={terms.compensation}
          changed={hasChanges.compensation}
          canEdit={canEdit}
          placeholder={baseTerms.compensation}
          onChange={(v) => onTermChange("compensation", v)}
        />
      </div>

      {!canEdit ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3 text-xs text-amber-900 dark:text-amber-300">
          Editing is disabled (negotiation closed or supplier-hosted campaign).
        </div>
      ) : null}
    </div>
  );
}

function TermColumn({ title, value, changed, canEdit, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold dark:font-bold">{title}</span>
        {changed ? (
          <Pill tone="brand" title="Edited in this session">
            Edited
          </Pill>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] border border-slate-200 dark:border-slate-700 transition-colors">
            {canEdit ? "Live" : "Locked"}
          </span>
        )}
      </div>

      <textarea
        rows={7}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={!canEdit}
        className={cx(
          "border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 min-h-[140px] whitespace-pre-wrap transition-colors outline-none resize-none",
          canEdit ? "focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-400" : "opacity-75"
        )}
      />
    </div>
  );
}

/* ----------------------------- Risk hints ----------------------------- */

function RiskHints({ hints }) {
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
        Address these points to reduce Admin rejection risk and avoid last-minute renegotiation.
      </p>
    </div>
  );
}

/* ----------------------------- Clause suggestions ----------------------------- */

function ClauseSuggestions({ suggestions, onApply, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Clause suggestions</h3>
        <span className="text-xs text-slate-500 dark:text-slate-300">Optional, but recommended</span>
      </div>
      <ul className="space-y-1.5">
        {suggestions.map((sugg) => (
          <li
            key={sugg.id}
            className="border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-white dark:bg-slate-900 dark:bg-slate-800 flex items-start justify-between gap-2 transition-colors"
          >
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs">✨</span>
                <span className="text-sm font-medium">{sugg.title}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">{sugg.body}</p>
            </div>
            <Btn tone="ghost" disabled={disabled} onClick={() => onApply(sugg.id, sugg.body)} title="Apply to compensation">
              Apply
            </Btn>
          </li>
        ))}
      </ul>
      {disabled ? (
        <div className="mt-2 text-[11px] text-slate-500">Suggestions disabled (negotiation closed or supplier-hosted).</div>
      ) : null}
    </div>
  );
}

/* ----------------------------- Chat thread ----------------------------- */

function ChatThread({
  messages,
  draftMessage,
  onDraftChange,
  onSend,
  onAttach,
  attachedFile,
  messagesEndRef,
  disabled,
  disabledReason
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col h-[420px] md:h-[480px] text-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Negotiation chat</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Chat while adjusting terms. All messages stay with the contract record.
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300 hidden md:inline">Audit-safe</span>
      </div>

      <div className="flex-1 border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 overflow-y-auto space-y-2 transition-colors">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
        <span>Attach:</span>
        <button
          className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
          onClick={onAttach}
          disabled={disabled}
        >
          Concept note
        </button>
        <button
          className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
          onClick={onAttach}
          disabled={disabled}
        >
          Draft script
        </button>
        <button
          className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
          onClick={onAttach}
          disabled={disabled}
        >
          File
        </button>
      </div>

      {attachedFile && (
        <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
          <span>📎 Attached: {attachedFile.name}</span>
        </div>
      )}

      {disabled ? (
        <div className="mt-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-300">
          Chat disabled. {disabledReason}
        </div>
      ) : null}

      <div className="mt-2 flex items-center gap-2">
        <textarea
          rows={2}
          className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none resize-none transition-colors disabled:opacity-60"
          placeholder={disabled ? "Chat disabled" : "Type a message…"}
          value={draftMessage}
          onChange={(e) => onDraftChange(e.target.value)}
          disabled={disabled}
        />
        <button
          className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold hover:bg-[#e26f00] disabled:opacity-50"
          onClick={onSend}
          disabled={disabled}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  const isSupplier = message.from === "supplier";
  const isSystem = message.from === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[92%] rounded-full px-3 py-1 text-[11px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300">
          {message.body}
        </div>
      </div>
    );
  }

  const alignment = isSupplier ? "justify-end" : "justify-start";
  const bubbleColor = isSupplier
    ? "bg-[#f77f00] text-white"
    : "bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200";

  return (
    <div className={cx("flex", alignment)}>
      <div className={cx("max-w-[80%] rounded-2xl px-3 py-1.5 text-sm shadow-sm", bubbleColor)}>
        <div className="flex items-center justify-between mb-0.5 gap-3">
          <span className="text-xs font-semibold truncate">{isSupplier ? "You" : message.name}</span>
          <span className="text-[10px] opacity-80 whitespace-nowrap">{message.time}</span>
        </div>
        <p className="text-sm whitespace-pre-line">{message.body}</p>
      </div>
    </div>
  );
}

/* ----------------------------- Helper: mobile collapsible wrapper ----------------------------- */

function CollapsibleWrapper({ title, children, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
      >
        <span>{title}</span>
        <span>{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded ? <div className="p-0 border-t border-slate-50 dark:border-slate-800">{children}</div> : null}
    </div>
  );
}

/* ----------------------------- End negotiation menu (inline) ----------------------------- */

function EndNegotiationMenu({ onEnd, disabled = false }) {
  const [open, setOpen] = useState(false);

  const reasons = [
    "Budget mismatch",
    "Timeline not feasible",
    "Creator declined",
    "Compliance risk",
    "Switching to another creator"
  ];

  return (
    <div className="relative">
      <Btn
        tone="danger"
        onClick={() => setOpen((s) => !s)}
        title="End negotiation"
        disabled={disabled}
      >
        ⛔ End
      </Btn>

      {open ? (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-2 z-[80]">
          <div className="px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200">End negotiation</div>
          <div className="px-2 pb-2 text-[11px] text-slate-500">Select a reason (logged in audit trail).</div>
          <div className="space-y-1">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-sm"
                onClick={() => {
                  if (disabled) return;
                  setOpen(false);
                  onEnd?.(r);
                }}
                disabled={disabled}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-sm text-slate-600"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`NegotiationRoom test failed: ${msg}`);
  };
  assert(cx("a", false && "b", "c") === "a c", "cx joins truthy");
  assert(Array.isArray(STATUS_STEPS) && STATUS_STEPS.length === 4, "STATUS_STEPS length");
  console.log("✅ SupplierNegotiationRoomPage self-tests passed");
}
