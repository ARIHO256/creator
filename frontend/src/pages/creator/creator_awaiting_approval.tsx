import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Search,
  Send,
  Video,
  X,
  XCircle,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import {
  useContentApprovalsQuery,
  useCreateContentApprovalMutation,
  useNudgeContentApprovalMutation,
  useResubmitContentApprovalMutation,
  useWithdrawContentApprovalMutation
} from "../../hooks/api/useCreatorWorkflow";
import type { ContentApprovalRecord } from "../../api/types";

// MyLiveDealz · Creator Portal
// Page: Awaiting Approval (Submitted Content)

const ORANGE = "#f77f00";

type SupplierType = "Seller" | "Provider";

type Desk = "General" | "Faith" | "Medical" | "Education";

type SubmissionType = "Video" | "Image" | "Caption" | "Doc";

type SubmissionStatus =
  | "Pending"
  | "Under Review"
  | "Escalated"
  | "Changes Requested"
  | "Approved"
  | "Rejected";

type AuditEvent = { atISO: string; msg: string };

type Asset = { name: string; type: SubmissionType; size: string };

type Submission = {
  id: string;
  title: string;
  campaign: string;
  supplier: { name: string; type: SupplierType };
  channel: "Instagram" | "TikTok" | "YouTube" | "WhatsApp";
  type: SubmissionType;
  desk: Desk;
  status: SubmissionStatus;
  riskScore: number; // 0-100
  submittedAtISO: string;
  dueAtISO: string;
  notesFromCreator: string;
  caption: string;
  assets: Asset[];
  flags: {
    missingDisclosure: boolean;
    sensitiveClaim: boolean;
    brandRestriction: boolean;
  };
  lastUpdatedISO: string;
  audit: AuditEvent[];
};

type CreatorFilter = "Awaiting" | "Needs Changes" | "Approved" | "All";

type ViewState = "list" | "detail";

function nowISO() {
  return new Date().toISOString();
}

function minutesBetween(aISO: string, bISO: string) {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.round((b - a) / 60000);
}

function relTime(iso: string) {
  const m = minutesBetween(iso, nowISO());
  const abs = Math.abs(m);
  if (abs < 2) return "just now";
  if (abs < 60) return `${abs}m ${m < 0 ? "from now" : "ago"}`;
  const h = Math.round(abs / 60);
  if (h < 48) return `${h}h ${m < 0 ? "from now" : "ago"}`;
  const d = Math.round(abs / 1440);
  return `${d}d ${m < 0 ? "from now" : "ago"}`;
}

function slaLabel(dueAtISO: string) {
  const m = minutesBetween(nowISO(), dueAtISO); // remaining
  if (m >= 0) {
    if (m < 60) return `Due in ${m}m`;
    const h = Math.round(m / 60);
    if (h < 48) return `Due in ${h}h`;
    const d = Math.round(m / 1440);
    return `Due in ${d}d`;
  }
  const late = Math.abs(m);
  if (late < 60) return `Overdue ${late}m`;
  const h = Math.round(late / 60);
  if (h < 48) return `Overdue ${h}h`;
  const d = Math.round(late / 1440);
  return `Overdue ${d}d`;
}

function statusMeta(status: SubmissionStatus) {
  switch (status) {
    case "Pending":
      return {
        label: "Pending",
        pill: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700",
        icon: <Loader2 className="h-4 w-4 animate-spin" />
      };
    case "Under Review":
      return {
        label: "Under review",
        pill: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800",
        icon: <Eye className="h-4 w-4" />
      };
    case "Escalated":
      return {
        label: "Escalated",
        pill: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
        icon: <AlertTriangle className="h-4 w-4" />
      };
    case "Changes Requested":
      return {
        label: "Changes requested",
        pill: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800",
        icon: <AlertCircle className="h-4 w-4" />
      };
    case "Approved":
      return {
        label: "Approved",
        pill: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        icon: <CheckCircle2 className="h-4 w-4" />
      };
    case "Rejected":
      return {
        label: "Rejected",
        pill: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        icon: <XCircle className="h-4 w-4" />
      };
  }
}

function deskPill(desk: Desk) {
  if (desk === "Faith") return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800";
  if (desk === "Medical") return "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
  if (desk === "Education") return "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
  return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
}

function riskPill(score: number) {
  if (score >= 75) return "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
  if (score >= 45) return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800";
  return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
}

function typeIcon(type: SubmissionType) {
  if (type === "Video") return <Video className="h-4 w-4" />;
  if (type === "Image") return <ImageIcon className="h-4 w-4" />;
  if (type === "Doc") return <FileText className="h-4 w-4" />;
  return <MessageCircle className="h-4 w-4" />;
}

function statusStep(status: SubmissionStatus) {
  // 1 Submitted, 2 In review, 3 Decision, 4 Published
  if (status === "Pending") return 1;
  if (status === "Under Review" || status === "Escalated") return 2;
  if (status === "Changes Requested" || status === "Approved" || status === "Rejected") return 3;
  return 1;
}

function nextStepCopy(status: SubmissionStatus, desk: Desk) {
  if (status === "Pending") return "Reviewer will pick this up soon.";
  if (status === "Under Review") return "Supplier/Admin is reviewing your submission.";
  if (status === "Escalated") return `${desk} Desk is reviewing compliance.`;
  if (status === "Changes Requested") return "Update your content and resubmit.";
  if (status === "Approved") return "You may publish using approved assets/captions.";
  if (status === "Rejected") return "Review the reason, adjust, and resubmit.";
  return "";
}

function toSubmission(record: ContentApprovalRecord): Submission {
  return {
    id: record.id,
    title: record.title,
    campaign: record.campaign,
    supplier: {
      name: record.supplier?.name || "Unknown supplier",
      type: (record.supplier?.type === "Provider" ? "Provider" : "Seller") as SupplierType
    },
    channel: (["Instagram", "TikTok", "YouTube", "WhatsApp"].includes(record.channel) ? record.channel : "Instagram") as Submission["channel"],
    type: (["Video", "Image", "Caption", "Doc"].includes(record.type) ? record.type : "Video") as SubmissionType,
    desk: (["General", "Faith", "Medical", "Education"].includes(record.desk) ? record.desk : "General") as Desk,
    status: (["Pending", "Under Review", "Escalated", "Changes Requested", "Approved", "Rejected"].includes(record.status)
      ? record.status
      : "Pending") as SubmissionStatus,
    riskScore: Number(record.riskScore || 0),
    submittedAtISO: record.submittedAtISO || nowISO(),
    dueAtISO: record.dueAtISO || nowISO(),
    notesFromCreator: record.notesFromCreator || "",
    caption: record.caption || "",
    assets: Array.isArray(record.assets)
      ? record.assets.map((asset) => ({
        name: asset.name,
        type: (["Video", "Image", "Caption", "Doc"].includes(asset.type) ? asset.type : "Doc") as SubmissionType,
        size: asset.size
      }))
      : [],
    flags: {
      missingDisclosure: Boolean(record.flags?.missingDisclosure),
      sensitiveClaim: Boolean(record.flags?.sensitiveClaim),
      brandRestriction: Boolean(record.flags?.brandRestriction)
    },
    lastUpdatedISO: record.lastUpdatedISO || record.submittedAtISO || nowISO(),
    audit: Array.isArray(record.audit) ? record.audit.map((entry) => ({ atISO: entry.atISO, msg: entry.msg })) : []
  };
}

export default function CreatorAwaitingApproval(): JSX.Element {
  const navigate = useNavigate();
  const contentApprovalsQuery = useContentApprovalsQuery();
  const createContentApprovalMutation = useCreateContentApprovalMutation();
  const nudgeContentApprovalMutation = useNudgeContentApprovalMutation();
  const withdrawContentApprovalMutation = useWithdrawContentApprovalMutation();
  const resubmitContentApprovalMutation = useResubmitContentApprovalMutation();

  const submissions = useMemo<Submission[]>(
    () => (contentApprovalsQuery.data || []).map((record) => toSubmission(record)),
    [contentApprovalsQuery.data]
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [filter, setFilter] = useState<CreatorFilter>("Awaiting");
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<ViewState>("list");

  useEffect(() => {
    if (!submissions.length) {
      if (selectedId) setSelectedId("");
      return;
    }

    if (!selectedId || !submissions.some((item) => item.id === selectedId)) {
      setSelectedId(submissions[0].id);
    }
  }, [selectedId, submissions]);

  // On large screens, always detail. On small, depends on state.
  // We handle this via CSS hiding/showing mostly, or conditional rendering.

  const selected = useMemo(
    () => submissions.find((s) => s.id === selectedId) || submissions[0] || null,
    [submissions, selectedId]
  );

  const counts = useMemo(() => {
    const awaiting = submissions.filter((s) => ["Pending", "Under Review", "Escalated"].includes(s.status)).length;
    const needs = submissions.filter((s) => s.status === "Changes Requested").length;
    const approved = submissions.filter((s) => s.status === "Approved").length;
    const risk = submissions.filter((s) => minutesBetween(nowISO(), s.dueAtISO) < 0 || s.riskScore >= 75).length;
    return { awaiting, needs, approved, risk };
  }, [submissions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const byFilter = submissions.filter((s) => {
      if (filter === "All") return true;
      if (filter === "Approved") return s.status === "Approved";
      if (filter === "Needs Changes") return s.status === "Changes Requested";
      return ["Pending", "Under Review", "Escalated"].includes(s.status);
    });

    if (!q) return byFilter;

    return byFilter.filter((s) => `${s.title} ${s.campaign} ${s.supplier.name} ${s.channel} ${s.type} ${s.status}`.toLowerCase().includes(q));
  }, [submissions, filter, query]);

  const handleCreateNew = async () => {
    try {
      const created = await createContentApprovalMutation.mutateAsync({
        title: "New submission",
        campaign: "Creator campaign",
        supplier: { name: "Pending supplier", type: "Seller" },
        channel: "Instagram",
        type: "Video",
        desk: "General",
        status: "Pending",
        notesFromCreator: "Add your latest creative notes here.",
        caption: "Draft caption awaiting creator edits.",
        assets: []
      });
      setSelectedId(created.id);
      setFilter("All");
      setMobileView("detail");
      toast("Submission created");
    } catch (error) {
      console.error(error);
      toast("Could not create submission");
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
    // Scroll to top of detail view (optional)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNudge = async (submissionId: string) => {
    try {
      await nudgeContentApprovalMutation.mutateAsync(submissionId);
      toast("Nudge sent");
    } catch (error) {
      console.error(error);
      toast("Could not send nudge");
    }
  };

  const handleWithdraw = async (submissionId: string) => {
    try {
      await withdrawContentApprovalMutation.mutateAsync(submissionId);
      toast("Withdrawn");
    } catch (error) {
      console.error(error);
      toast("Could not withdraw submission");
    }
  };

  const handleResubmit = async (submissionId: string) => {
    try {
      const current = submissions.find((item) => item.id === submissionId);
      await resubmitContentApprovalMutation.mutateAsync({
        submissionId,
        payload: {
          title: current?.title,
          campaign: current?.campaign,
          channel: current?.channel,
          type: current?.type,
          desk: current?.desk,
          notesFromCreator: current?.notesFromCreator,
          caption: current?.caption
        }
      });
      toast("Resubmitted");
    } catch (error) {
      console.error(error);
      toast("Could not resubmit submission");
    }
  };

  return (
    <div className="min-h-full w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      <PageHeader
        pageTitle="Submitted Content"
        badge={
          <span className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px]">
            <BadgeCheck className="h-4 w-4" />
            KYC Verified
          </span>
        }
      />

      <main className="flex-1 w-full max-w-full p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-x-hidden relative">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-6 items-start h-full">

          {/* Left: list */}
          <div className={`${mobileView === 'detail' ? 'hidden lg:block' : 'block'} space-y-6`}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold dark:text-slate-100">Submitted Content</div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Track approvals for your deliverables. suppliers = Sellers + Providers.
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    <Chip label={`Awaiting ${counts.awaiting}`} tone="dark" />
                    <Chip label={`Needs changes ${counts.needs}`} tone="warn" />
                    <Chip label={`Approved ${counts.approved}`} tone="ok" />
                    <Chip label={`SLA risk ${counts.risk}`} tone="danger" />
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-2xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-[11px] font-semibold inline-flex items-center gap-2 transition-colors"
                    onClick={handleCreateNew}
                  >
                    <Plus className="h-4 w-4" />
                    New submission
                  </button>
                </div>
              </div>

              {/* Mobile FAB for new submission if header button is hidden */}
              <button
                className="md:hidden mt-4 w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2"
                onClick={handleCreateNew}
              >
                <Plus className="h-4 w-4" />
                New Submission
              </button>


              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 text-[11px] transition-colors overflow-x-auto max-w-full">
                  <PillTab label="Awaiting" active={filter === "Awaiting"} onClick={() => setFilter("Awaiting")} />
                  <PillTab label="Needs Changes" active={filter === "Needs Changes"} onClick={() => setFilter("Needs Changes")} />
                  <PillTab label="Approved" active={filter === "Approved"} onClick={() => setFilter("Approved")} />
                  <PillTab label="All" active={filter === "All"} onClick={() => setFilter("All")} />
                </div>
                <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-2 bg-slate-50 dark:bg-slate-800 transition-colors">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    className="bg-transparent outline-none text-[11px] w-full sm:w-56 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                    placeholder="Search submissions…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-3 md:p-4 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-semibold dark:text-slate-100">Your items</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Select one to see timeline, preview and actions.</div>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{visible.length}</span></span>
              </div>

              <div className="mt-3 space-y-2">
                {contentApprovalsQuery.isLoading ? (
                  <EmptyState title="Loading submissions" subtitle="Fetching your latest approval queue from the backend." />
                ) : null}

                {visible.length === 0 ? (
                  <EmptyState title="No submissions" subtitle="Try changing filters or clearing the search." />
                ) : (
                  visible.map((s) => (
                    <SubmissionRow
                      key={s.id}
                      item={s}
                      active={s.id === selectedId}
                      onSelect={() => handleSelect(s.id)}
                      onNudge={() => {
                        void handleNudge(s.id);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: detail */}
          <div className={`${mobileView === 'list' ? 'hidden lg:block' : 'block'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-3 md:p-4 lg:sticky lg:top-4 transition-colors`}>

            {/* Mobile Back Button */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setMobileView("list")}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-500"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to list
              </button>
            </div>

            {!selected ? (
              <EmptyState title="Select a submission" subtitle="Choose one on the left to see details." />
            ) : (
              <Detail
                item={selected}
                onCopy={() => copyToClipboard(selected.caption)}
                onNudge={() => {
                  void handleNudge(selected.id);
                }}
                onWithdraw={() => {
                  void handleWithdraw(selected.id);
                }}
                onResubmit={() => {
                  void handleResubmit(selected.id);
                }}
              />
            )}
          </div>
        </div>
      </main>

      <ToastArea />
    </div>
  );
}

function SubmissionRow({
  item,
  active,
  onSelect,
  onNudge
}: {
  item: Submission;
  active: boolean;
  onSelect: () => void;
  onNudge: () => void;
}) {
  const meta = statusMeta(item.status);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-3 transition-colors ${active ? "border-[#f77f00] bg-orange-50/50 dark:bg-orange-900/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center">{typeIcon(item.type)}</span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {item.supplier.type}: {item.supplier.name} · {item.campaign}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <GlobeBadge channel={item.channel} />
              {item.channel}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${deskPill(item.desk)}`}>{item.desk} desk</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CalendarClock className="h-3.5 w-3.5" />
              {slaLabel(item.dueAtISO)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] border ${meta.pill} inline-flex items-center gap-2`}
          >
            {meta.icon}
            {meta.label}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNudge();
            }}
            className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] inline-flex items-center gap-2 text-slate-700 dark:text-slate-300"
            disabled={item.status === "Approved" || item.status === "Rejected"}
          >
            <Send className="h-4 w-4" />
            Nudge
          </button>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
        Submitted {relTime(item.submittedAtISO)} · Updated {relTime(item.lastUpdatedISO)}
      </div>
    </button>
  );
}

function Detail({
  item,
  onCopy,
  onNudge,
  onWithdraw,
  onResubmit
}: {
  item: Submission;
  onCopy: () => void;
  onNudge: () => void;
  onWithdraw: () => void;
  onResubmit: () => void;
}) {
  const meta = statusMeta(item.status);
  const step = statusStep(item.status);

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.supplier.type}: {item.supplier.name} · {item.campaign}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] border ${meta.pill} inline-flex items-center gap-2`}>{meta.icon}{meta.label}</span>
            <span className={`px-2.5 py-1 rounded-full text-[10px] border ${riskPill(item.riskScore)}`}>Risk {item.riskScore}</span>
            <span className={`px-2.5 py-1 rounded-full text-[10px] border ${deskPill(item.desk)}`}>{item.desk} desk</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              {slaLabel(item.dueAtISO)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
        <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Approval timeline</div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
          <StepChip label="Submitted" done={step >= 1} />
          <StepChip label="In review" done={step >= 2} />
          <StepChip label="Decision" done={step >= 3} />
          <StepChip label="Published" done={step >= 4} />
        </div>
        <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-400">Next: {nextStepCopy(item.status, item.desk)}</div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Preview</div>
          <div className="mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
            <div className="aspect-[9/16] rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-400">
              {item.type === "Video" ? "Vertical video" : item.type}
            </div>
            <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Creator notes: {item.notesFromCreator}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Caption</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Copy only after approval if required.</div>
            </div>
            <SmallBtn label="Copy" icon={<Copy className="h-4 w-4" />} onClick={onCopy} />
          </div>
          <div className="mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {item.caption}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <SmallBtn label="Nudge" icon={<Send className="h-4 w-4" />} onClick={onNudge} />
            {(item.status === "Pending" || item.status === "Under Review" || item.status === "Escalated") && (
              <SmallBtn label="Withdraw" icon={<X className="h-4 w-4" />} onClick={onWithdraw} tone="danger" />
            )}
            {item.status === "Changes Requested" && (
              <SmallBtn label="Resubmit" icon={<Check className="h-4 w-4" />} onClick={onResubmit} tone="ok" />
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Assets</div>
        <div className="mt-2 space-y-2">
          {item.assets.map((a) => (
            <div key={a.name} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center">{typeIcon(a.type)}</span>
                <div>
                  <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">{a.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{a.type} · {a.size}</div>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                onClick={() => {
                  // TODO: Link to actual Asset Preview Page when created
                  toast("(Asset Preview Page) soon coming");
                }}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Audit</div>
        <div className="mt-2 space-y-2">
          {item.audit.slice(0, 8).map((a, idx) => (
            <div key={idx} className="flex items-start justify-between gap-2">
              <div className="text-[11px] text-slate-700 dark:text-slate-300">{a.msg}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{relTime(a.atISO)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepChip({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`px-2 py-1 rounded-full border text-[10px] text-center ${done ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}>
      {label}
    </div>
  );
}

function PillTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full ${active ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
    >
      {label}
    </button>
  );
}

function Chip({ label, tone }: { label: string; tone: "dark" | "ok" | "warn" | "danger" }) {
  const cls =
    tone === "dark"
      ? "bg-slate-900 dark:bg-slate-700 text-white border-slate-900 dark:border-slate-700"
      : tone === "ok"
        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
        : tone === "warn"
          ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800"
          : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] ${cls}`}>{label}</span>;
}

function SmallBtn({
  label,
  icon,
  onClick,
  tone
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: "danger" | "ok";
}) {
  const cls =
    tone === "danger"
      ? "border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
      : tone === "ok"
        ? "border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
        : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-2xl text-[11px] font-semibold inline-flex items-center gap-2 ${cls}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 text-center transition-colors">
      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</div>
    </div>
  );
}

function GlobeBadge({ channel }: { channel: string }) {
  // tiny glyph
  return <span className="h-2 w-2 rounded-full" style={{ background: channel === "WhatsApp" ? "#16a34a" : ORANGE }} />;
}

/* ------------------------- Clipboard + toast ------------------------- */

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied!");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast("Copied!");
  }
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function toast(message: string) {
  const ev = new CustomEvent("mldz-toast", { detail: message });
  window.dispatchEvent(ev);
}

function ToastArea() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent<string>;
      setMsg(evt.detail);
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setMsg(null), 1700);
    };
    window.addEventListener("mldz-toast", handler);
    return () => window.removeEventListener("mldz-toast", handler);
  }, []);

  if (!msg) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="px-4 py-2 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[11px] shadow-lg border border-slate-800 dark:border-slate-600 animate-in fade-in slide-in-from-bottom-4 duration-200">{msg}</div>
    </div>
  );
}
