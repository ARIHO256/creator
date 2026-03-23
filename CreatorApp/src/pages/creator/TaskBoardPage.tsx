"use client";

/**
 * TaskBoardPage (Creator) — Premium Regenerated
 * ------------------------------------------------
 * - Kanban deliverables across campaigns (Creator view)
 * - Horizontal scroll columns on ALL screens
 * - Drag & drop between columns
 * - Click task card → premium side panel (notes, uploads, link pack, comments)
 * - ✅ NEW: "New Task" button opens a COMPLETE right-side drawer (wizard-style)
 *   similar to the Supplier Task Board drawer pattern.
 *
 * Notes:
 * - Self-contained demo (no project imports). Replace toast-nav with router navigation in app.
 * - Styling: TailwindCSS classes + light/dark support.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { creatorApi, type ContractRecord, type TaskRecord } from "../../lib/creatorApi";

const ORANGE = "#f77f00";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/* -------------------------------- Types -------------------------------- */

type ColumnId = "todo" | "in-progress" | "submitted" | "approved" | "needs-changes";

type TaskType = "live" | "vod" | "story" | "post";
type Priority = "Low" | "Normal" | "High" | "Critical";

type Comment = {
  id: number;
  from: "Creator" | "Supplier" | "Admin" | "Ops";
  name: string;
  body: string;
  time: string;
};

type FileStub = { name: string; sizeLabel: string };

type Task = {
  id: string;
  title: string;
  campaign: string;
  supplier: string;
  supplierInitials: string;
  brand: string;

  type: TaskType;
  priority: Priority;

  dueLabel: string;
  dueDaysFromNow: number;
  overdue: boolean;

  earnings: number;
  currency: string;

  createdAtISO: string;
  linkedContractId?: string;
};

type Contract = {
  id: string;
  status: "Active" | "Paused" | "Terminated";
  campaign: string;
  brand: string;
  supplier: string;
  currency: string;
  value: number;
  totalTasks: number;
  creator: { name: string; handle: string; avatarUrl: string };
  deliverables: Array<{ id: number; label: string; done: boolean; type?: TaskType }>;
};

type ColumnsState = Record<ColumnId, Task[]>;

/* ----------------------------- Config ----------------------------- */

const COLUMNS: Array<{ id: ColumnId; label: string; hint?: string }> = [
  { id: "todo", label: "To do", hint: "Not started" },
  { id: "in-progress", label: "In progress", hint: "Work in motion" },
  { id: "submitted", label: "Submitted", hint: "Awaiting review" },
  { id: "approved", label: "Approved", hint: "Accepted / ready" },
  { id: "needs-changes", label: "Needs changes", hint: "Fixes required" },
];

const TYPE_CONFIG: Record<TaskType, { icon: string; label: string }> = {
  live: { icon: "📺", label: "Live" },
  vod: { icon: "🎬", label: "VOD" },
  story: { icon: "📱", label: "Story" },
  post: { icon: "📝", label: "Post" },
};

const PRIORITY: Array<{ k: Priority; pill: string }> = [
  { k: "Low", pill: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200" },
  { k: "Normal", pill: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" },
  { k: "High", pill: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300" },
  { k: "Critical", pill: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300" },
];

/* ----------------------------- Helpers ----------------------------- */

function seedInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "S";
  const b = parts[1]?.[0] || (parts[0]?.[1] || "U");
  return (a + b).toUpperCase();
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Deterministic due (demo)
function getDeterministicDue(seed: number) {
  // Range: -2 to 7 days
  const days = (seed % 10) - 2;
  return {
    days,
    label:
      days === 0
        ? "Today"
        : days === 1
          ? "Tomorrow"
          : days === -1
            ? "Yesterday"
            : days < 0
              ? `${Math.abs(days)}d overdue`
              : `In ${days}d`,
  };
}

function estimateTimeMinutes(task: Task) {
  // Super simple heuristic for UI only
  const base =
    task.type === "live" ? 90 : task.type === "vod" ? 45 : task.type === "story" ? 20 : 30;
  const pr =
    task.priority === "Critical" ? 1.2 : task.priority === "High" ? 1.1 : task.priority === "Low" ? 0.85 : 1.0;
  return Math.round(base * pr);
}

function fmtTimeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const d = Date.now() - t;
  const mins = Math.max(1, Math.round(d / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function getColumnTasks(columns: ColumnsState, colId: ColumnId) {
  const tasks = columns[colId] || [];
  return [...tasks].sort((a, b) => {
    if (a.overdue && !b.overdue) return -1;
    if (!a.overdue && b.overdue) return 1;
    return a.dueDaysFromNow - b.dueDaysFromNow;
  });
}

function flattenColumns(columns: ColumnsState) {
  return Object.values(columns).flat();
}

function normalizeTaskType(value?: string | null): TaskType {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "live") return "live";
  if (normalized === "vod" || normalized === "video") return "vod";
  if (normalized === "story") return "story";
  return "post";
}

function normalizePriority(value?: string | null): Priority {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critical") return "Critical";
  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Normal";
}

function taskColumnForStatus(value?: string | null): ColumnId {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "IN_PROGRESS") return "in-progress";
  if (normalized === "SUBMITTED" || normalized === "IN_REVIEW") return "submitted";
  if (normalized === "APPROVED" || normalized === "DONE" || normalized === "COMPLETED") return "approved";
  if (normalized === "NEEDS_CHANGES" || normalized === "CHANGES_REQUESTED") return "needs-changes";
  return "todo";
}

function toBoardContract(record: ContractRecord): Contract {
  const deliverables = Array.isArray(record.deliverables)
    ? record.deliverables.map((item, index) => {
        const payload = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          id: Number(payload.id || index + 1),
          label: String(payload.label || payload.title || `Deliverable ${index + 1}`),
          done: Boolean(payload.done || payload.completed),
          type: normalizeTaskType(String(payload.type || "post"))
        };
      })
    : [];

  return {
    id: record.id,
    status: mapContractStatus(String(record.status || "ACTIVE")),
    campaign: String(record.campaignName || record.campaign || ""),
    brand: String(record.brand || record.sellerName || record.seller || ""),
    supplier: String(record.sellerName || record.seller || record.brand || ""),
    currency: String(record.currency || "USD"),
    value: Number(record.value || 0),
    totalTasks: Number(record.totalTasks || deliverables.length || 0),
    creator: { name: String(record.creatorName || ""), handle: "", avatarUrl: "" },
    deliverables
  };
}

function mapContractStatus(value?: string | null): Contract["status"] {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "TERMINATED" || normalized === "CANCELLED") return "Terminated";
  if (normalized === "PAUSED") return "Paused";
  return "Active";
}

function formatDueLabel(date?: string | null) {
  if (!date) return "TBD";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  const diffDays = Math.ceil((parsed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  return `In ${diffDays}d`;
}

function dueOffset(date?: string | null) {
  if (!date) return 0;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.ceil((parsed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function taskStatusFromColumn(column: ColumnId): "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "APPROVED" | "BLOCKED" {
  if (column === "in-progress") return "IN_PROGRESS";
  if (column === "submitted") return "IN_REVIEW";
  if (column === "approved") return "APPROVED";
  if (column === "needs-changes") return "BLOCKED";
  return "TODO";
}

function taskPriorityToApi(priority: Priority): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  if (priority === "Low") return "LOW";
  if (priority === "High") return "HIGH";
  if (priority === "Critical") return "URGENT";
  return "MEDIUM";
}

function attachmentKindForFile(file: File): "IMAGE" | "VIDEO" | "DOCUMENT" {
  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}

function extensionFromFileName(name: string): string | undefined {
  const parts = name.split(".");
  if (parts.length < 2) return undefined;
  const ext = parts[parts.length - 1].trim().toLowerCase();
  return ext || undefined;
}

function commentFromActorRole(role?: string | null): Comment["from"] {
  const normalized = String(role || "").trim().toUpperCase();
  if (normalized === "ADMIN") return "Admin";
  if (normalized === "SUPPORT" || normalized === "OPS") return "Ops";
  if (normalized === "SELLER" || normalized === "PROVIDER") return "Supplier";
  return "Creator";
}

function toBoardTask(record: TaskRecord): { column: ColumnId; task: Task } {
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const contract = record.contract;
  const supplier =
    String(
      (record.campaign && typeof record.campaign === "object" && (record.campaign as { seller?: unknown }).seller) ||
      contract?.sellerName ||
      contract?.seller ||
      contract?.brand ||
      ""
    );
  const dueDaysFromNow = dueOffset(record.dueAt);

  return {
    column: taskColumnForStatus(record.status),
    task: {
      id: record.id,
      title: String(record.title || ""),
      campaign: String(contract?.campaignName || contract?.campaign || (metadata as { campaign?: unknown }).campaign || ""),
      supplier,
      supplierInitials: seedInitials(supplier),
      brand: String(contract?.brand || contract?.sellerName || contract?.seller || supplier),
      type: normalizeTaskType(String((metadata as { type?: unknown }).type || "post")),
      priority: normalizePriority(record.priority),
      dueLabel: formatDueLabel(record.dueAt),
      dueDaysFromNow,
      overdue: dueDaysFromNow < 0,
      earnings: Number((metadata as { earnings?: unknown }).earnings || 0),
      currency: String(contract?.currency || "USD"),
      createdAtISO: String(record.createdAt || new Date().toISOString()),
      linkedContractId: contract?.id || undefined
    }
  };
}

/* ----------------------------- UI atoms ----------------------------- */

function Btn({
  tone = "neutral",
  onClick,
  children,
  disabled,
  className,
  title,
}: {
  tone?: "neutral" | "brand" | "danger";
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold dark:font-bold border transition-colors";
  const cls =
    tone === "brand"
      ? "border-transparent text-white"
      : tone === "danger"
        ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/30"
        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 hover:bg-slate-50 dark:hover:bg-slate-800";
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cx(base, cls, className, disabled && "opacity-60 cursor-not-allowed")}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </button>
  );
}

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "brand" | "pro" }) {
  const cls =
    tone === "brand"
      ? "bg-[#f77f00] text-white border-transparent"
      : tone === "pro"
        ? "bg-violet-50 dark:bg-violet-900/20 text-violet-900 dark:text-violet-200 border-violet-200 dark:border-violet-800"
        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800";
  return (
    <span className={cx("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border", cls)}>
      {children}
    </span>
  );
}

function PageHeader({
  pageTitle,
  badge,
  right,
}: {
  pageTitle: string;
  badge?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="min-w-0 px-3 sm:px-4 md:px-6 lg:px-8 py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-50 truncate">
            {pageTitle}
          </h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
        {right ? <div className="flex flex-wrap items-center justify-end gap-2">{right}</div> : null}
      </div>
    </header>
  );
}

function Toast({ text, onClose }: { text: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [text, onClose]);

  if (!text) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100]">
      <div className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg">{text}</div>
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export function TaskBoardPage() {
  const navigate = useNavigate();
  const { run } = useAsyncAction();
  const [toast, setToast] = useState<string | null>(null);
  const { data: contractRecords } = useApiResource({
    initialData: [] as ContractRecord[],
    loader: () => creatorApi.contracts()
  });
  const { data: taskRecords, reload: reloadTasks } = useApiResource({
    initialData: [] as TaskRecord[],
    loader: () => creatorApi.tasks()
  });
  const contracts = useMemo(() => contractRecords.map(toBoardContract), [contractRecords]);

  // Seed tasks from backend tasks
  const seededColumns = useMemo<ColumnsState>(() => {
    const col: ColumnsState = {
      todo: [],
      "in-progress": [],
      submitted: [],
      approved: [],
      "needs-changes": [],
    };
    taskRecords.forEach((record) => {
      const mapped = toBoardTask(record);
      col[mapped.column].push(mapped.task);
    });
    return col;
  }, [taskRecords]);

  const [columns, setColumns] = useState<ColumnsState>(seededColumns);

  useEffect(() => {
    setColumns(seededColumns);
  }, [seededColumns]);

  const taskToColumn = useMemo(() => {
    const map = new Map<string, ColumnId>();
    (Object.keys(columns) as ColumnId[]).forEach((colId) => {
      columns[colId].forEach((t) => map.set(t.id, colId));
    });
    return map;
  }, [columns]);

  const allTasksFlat = useMemo(() => flattenColumns(columns), [columns]);

  // Filters
  const [q, setQ] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<TaskType | "All">("All");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const campaignOptions = useMemo(() => {
    const set = new Set<string>();
    allTasksFlat.forEach((t) => set.add(t.campaign));
    return ["All", ...Array.from(set)];
  }, [allTasksFlat]);

  // Selected task side panel
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const selectedTaskRecord = useMemo(
    () => taskRecords.find((record) => record.id === selectedTask?.id) || null,
    [taskRecords, selectedTask?.id]
  );

  // Side panel state
  const [uploadNote, setUploadNote] = useState("");
  const [contentLink, setContentLink] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [pendingOpenTaskId, setPendingOpenTaskId] = useState<string | null>(null);

  // ✅ New Task drawer
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  // Drag & drop
  const dragRef = useRef<{ taskId: string; fromCol: ColumnId } | null>(null);

  const uploadedFiles = useMemo<FileStub[]>(
    () =>
      Array.isArray(selectedTaskRecord?.attachments)
        ? selectedTaskRecord.attachments.map((attachment, index) => {
            const record = attachment && typeof attachment === "object" ? (attachment as Record<string, unknown>) : {};
            const sizeBytes = Number(record.sizeBytes || 0);
            return {
              name: String(record.name || `File ${index + 1}`),
              sizeLabel: sizeBytes > 0 ? `${Math.max(1, Math.round(sizeBytes / 1024))} KB` : "Unknown size"
            };
          })
        : [],
    [selectedTaskRecord?.attachments]
  );

  const comments = useMemo<Comment[]>(
    () =>
      Array.isArray(selectedTaskRecord?.comments)
        ? selectedTaskRecord.comments.map((comment, index) => {
            const record = comment && typeof comment === "object" ? (comment as Record<string, unknown>) : {};
            const author = record.author && typeof record.author === "object" ? (record.author as Record<string, unknown>) : {};
            const createdAt = typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString();
            return {
              id: index + 1,
              from: commentFromActorRole(typeof author.role === "string" ? author.role : null),
              name: String(author.name || "User"),
              body: String(record.body || ""),
              time: fmtTimeAgo(createdAt)
            };
          })
        : [],
    [selectedTaskRecord?.comments]
  );

  useEffect(() => {
    if (!pendingOpenTaskId) return;
    const task = allTasksFlat.find((entry) => entry.id === pendingOpenTaskId);
    if (!task) return;
    setSelectedTask(task);
    setPendingOpenTaskId(null);
  }, [allTasksFlat, pendingOpenTaskId]);

  function moveTask(taskId: string, toCol: ColumnId) {
    const from = taskToColumn.get(taskId);
    if (!from) return;

    if (from === toCol) return;

    setColumns((prev) => {
      const task = prev[from].find((t) => t.id === taskId);
      if (!task) return prev;

      return {
        ...prev,
        [from]: prev[from].filter((t) => t.id !== taskId),
        [toCol]: [task, ...prev[toCol]],
      };
    });

    void creatorApi
      .updateTask(taskId, { status: taskStatusFromColumn(toCol) })
      .catch(() => {
        setToast("Failed to move task.");
        void reloadTasks();
      });
  }

  function handleDragStart(taskId: string, fromCol: ColumnId) {
    dragRef.current = { taskId, fromCol };
  }

  function handleDrop(toCol: ColumnId) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    moveTask(d.taskId, toCol);
  }

  function handleCardClick(task: Task) {
    setSelectedTask(task);
    setUploadNote("");
    setContentLink("");
    setCommentDraft("");
  }

  function handleFileUpload(files: FileList | null) {
    if (!files || !selectedTask) return;
    const list = Array.from(files);
    run(
      async () => {
        await Promise.all(
          list.map((file) =>
            creatorApi.taskAttachment(selectedTask.id, {
              name: file.name,
              kind: attachmentKindForFile(file),
              mimeType: file.type || undefined,
              sizeBytes: file.size > 0 ? file.size : undefined,
              extension: extensionFromFileName(file.name),
              metadata: {
                source: "task-board",
                note: uploadNote || undefined
              }
            })
          )
        );
        await reloadTasks();
        setToast(`Added ${list.length} file(s)`);
      },
      {
        errorMessage: "Failed to upload files."
      }
    );
  }

  function handleAddComment() {
    const text = commentDraft.trim();
    if (!text || !selectedTask) return;
    run(
      async () => {
        await creatorApi.taskComment(selectedTask.id, { body: text });
        setCommentDraft("");
        await reloadTasks();
      },
      {
        errorMessage: "Failed to send comment."
      }
    );
  }

  async function addNewTaskToBoard(payload: NewTaskPayload) {
    const { task, column, openAfterCreate } = payload;
    const dueAt = new Date(Date.now() + task.dueDaysFromNow * 24 * 60 * 60 * 1000);
    const created = await creatorApi.createTask({
      contractId: task.linkedContractId,
      title: task.title,
      priority: taskPriorityToApi(task.priority),
      status: taskStatusFromColumn(column),
      dueAt: Number.isNaN(dueAt.getTime()) ? undefined : dueAt.toISOString(),
      metadata: {
        type: task.type,
        earnings: task.earnings,
        campaign: task.campaign,
        supplier: task.supplier,
        brand: task.brand,
        currency: task.currency
      }
    });
    await reloadTasks();
    setToast("Task created");
    if (openAfterCreate) {
      setPendingOpenTaskId(created.id);
    }
  }

  // Apply filters per column
  const filteredColumns = useMemo(() => {
    const query = q.trim().toLowerCase();

    const next: ColumnsState = {
      todo: [],
      "in-progress": [],
      submitted: [],
      approved: [],
      "needs-changes": [],
    };

    (Object.keys(columns) as ColumnId[]).forEach((colId) => {
      next[colId] = columns[colId].filter((t) => {
        if (onlyOverdue && !t.overdue) return false;
        if (campaignFilter !== "All" && t.campaign !== campaignFilter) return false;
        if (typeFilter !== "All" && t.type !== typeFilter) return false;
        if (!query) return true;
        return (
          t.title.toLowerCase().includes(query) ||
          t.campaign.toLowerCase().includes(query) ||
          t.supplier.toLowerCase().includes(query) ||
          t.brand.toLowerCase().includes(query)
        );
      });
    });

    return next;
  }, [columns, q, campaignFilter, typeFilter, onlyOverdue]);

  const stats = useMemo(() => {
    const flat = flattenColumns(filteredColumns);
    const overdue = flat.filter((t) => t.overdue).length;
    const dueToday = flat.filter((t) => t.dueDaysFromNow === 0).length;
    const inReview = filteredColumns.submitted.length;
    return { total: flat.length, overdue, dueToday, inReview };
  }, [filteredColumns]);

  function openAssetLibrary() {
    setSelectedTask(null);
    setNewTaskOpen(false);
    navigate("/asset-library");
  }

  function openLinksHub() {
    setSelectedTask(null);
    setNewTaskOpen(false);
    navigate("/link-tools");
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <style>{`
        @keyframes slideInRight { from { opacity:0; transform: translateX(18px);} to { opacity:1; transform: translateX(0);} }
        .animate-slide-in-right { animation: slideInRight .22s ease-out both; }
      `}</style>

      <PageHeader
        pageTitle="Task Board"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f77f00] text-white">
            <span>📦</span>
            <span>Kanban view · All deliverables</span>
          </span>
        }
        right={
          <>
            <Btn tone="neutral" onClick={openAssetLibrary}>
              Asset Library
            </Btn>
            <Btn tone="neutral" onClick={openLinksHub}>
              Links Hub
            </Btn>
            <Btn tone="brand" onClick={() => setNewTaskOpen(true)}>
              New task
            </Btn>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full p-3 sm:p-4 md:p-6 lg:p-8 pt-8 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Drag cards across columns. Overdue tasks glow red. Click a card for uploads, links, and comments.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone="slate">Total: {stats.total}</Pill>
                <Pill tone="pro">In review: {stats.inReview}</Pill>
                <Pill tone="brand">Due today: {stats.dueToday}</Pill>
                <Pill tone="slate">Overdue: {stats.overdue}</Pill>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-xs text-slate-500 dark:text-slate-300">Search</span>
                <input
                  className="bg-transparent outline-none text-xs w-44"
                  placeholder="Title, campaign, supplier…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-xs text-slate-500 dark:text-slate-300">Campaign</span>
                <select
                  className="bg-transparent outline-none text-xs"
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                >
                  {campaignOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-xs text-slate-500 dark:text-slate-300">Type</span>
                <select
                  className="bg-transparent outline-none text-xs"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TaskType | "All")}
                >
                  {["All", "live", "vod", "story", "post"].map((t) => (
                    <option key={t} value={t}>
                      {t === "All" ? "All" : TYPE_CONFIG[t as TaskType].label}
                    </option>
                  ))}
                </select>
              </div>

              <Btn
                tone={onlyOverdue ? "brand" : "neutral"}
                onClick={() => setOnlyOverdue((v) => !v)}
                title="Show only overdue tasks"
              >
                {onlyOverdue ? "Overdue only" : "All tasks"}
              </Btn>
            </div>
          </div>
        </div>

        {/* Kanban */}
        <div className="w-full max-w-full overflow-x-auto pb-2">
          <section className="min-w-[980px] w-max grid grid-cols-5 gap-3">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className="w-[320px] md:w-[340px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.id)}
              >
                <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold dark:font-bold">{col.label}</div>
                    {col.hint ? <div className="text-xs text-slate-500 dark:text-slate-300">{col.hint}</div> : null}
                  </div>
                  <Pill>{getColumnTasks(filteredColumns, col.id).length}</Pill>
                </div>

                <div className="p-2 flex-1 overflow-y-auto max-h-[70vh]">
                  {getColumnTasks(filteredColumns, col.id).map((task) => (
                    <div key={task.id} className="mb-2">
                      <TaskCard
                        task={task}
                        selected={selectedTask?.id === task.id}
                        onDragStart={() => handleDragStart(task.id, col.id)}
                        onClick={() => handleCardClick(task)}
                      />
                    </div>
                  ))}

                  {getColumnTasks(filteredColumns, col.id).length === 0 ? (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl m-1">
                      <p className="text-xs text-slate-400 dark:text-slate-600">Drop here</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>

      {/* Side panel */}
      {selectedTask ? (
        <TaskSidePanel
          task={selectedTask}
          currentColumn={taskToColumn.get(selectedTask.id) || "todo"}
          uploadNote={uploadNote}
          onUploadNoteChange={setUploadNote}
          contentLink={contentLink}
          onContentLinkChange={setContentLink}
          uploadedFiles={uploadedFiles}
          onFileUpload={handleFileUpload}
          comments={comments}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onAddComment={handleAddComment}
          onMove={(toCol) => moveTask(selectedTask.id, toCol)}
          setToast={setToast}
          onOpenAssetLibrary={openAssetLibrary}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}

      {/* ✅ New Task Drawer */}
      <NewTaskDrawer
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        contracts={contracts.filter((c) => c.status !== "Terminated")}
        existingTasks={allTasksFlat}
        onCreate={addNewTaskToBoard}
        setToast={setToast}
        onOpenAssetLibrary={openAssetLibrary}
      />

      <Toast text={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default TaskBoardPage;

/* ----------------------------- Card ----------------------------- */

function TaskCard({
  task,
  selected,
  onDragStart,
  onClick,
}: {
  task: Task;
  selected: boolean;
  onDragStart: () => void;
  onClick: () => void;
}) {
  const typeCfg = TYPE_CONFIG[task.type] || TYPE_CONFIG.post;
  const aiMinutes = estimateTimeMinutes(task);

  const overdueRing = task.overdue
    ? "border-rose-300 ring-2 ring-rose-300/70 shadow-[0_0_0_2px_rgba(244,63,94,0.15)]"
    : "border-slate-200 dark:border-slate-700";

  const pri = PRIORITY.find((p) => p.k === task.priority);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cx(
        "border rounded-xl px-2.5 py-2 bg-white dark:bg-slate-800 shadow cursor-move flex flex-col gap-1 transition-all",
        selected
          ? "border-[#f77f00] ring-1 ring-[#f77f00] dark:border-[#f77f00] dark:ring-[#f77f00]"
          : overdueRing + " hover:shadow-md",
      )}
      title={task.overdue ? "Overdue" : ""}
    >
      <div className="flex items-start gap-2 mb-1">
        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold dark:font-bold transition-colors mt-0.5">
          {task.supplierInitials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50 leading-snug break-words">
            {task.title}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300 leading-snug break-words mt-0.5">
            {task.campaign} · {task.supplier} · {task.brand}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs mt-auto">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-100 font-medium transition-colors">
          <span>{typeCfg.icon}</span>
          <span>{typeCfg.label}</span>
        </span>

        {pri ? <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold", pri.pill)}>{task.priority}</span> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs mt-1">
        <span className={cx("text-slate-500 dark:text-slate-300 whitespace-nowrap", task.overdue && "text-rose-600 dark:text-rose-300 font-semibold")}>
          Due: {task.dueLabel}
        </span>

        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-200 font-medium transition-colors whitespace-nowrap">
          <span>⏱</span>
          <span>AI: ~{aiMinutes} min</span>
        </span>
      </div>

      <div className="flex items-center justify-between text-xs mt-1 border-t border-slate-100 dark:border-slate-800 pt-2">
        <span className="text-slate-500 dark:text-slate-300">
          Est. payout:{" "}
          <span className="font-semibold dark:font-bold text-slate-800 dark:text-slate-50 whitespace-nowrap">
            {task.currency} {task.earnings.toLocaleString()}
          </span>
        </span>
        <span className="text-slate-400 dark:text-slate-500">{fmtTimeAgo(task.createdAtISO)}</span>
      </div>
    </article>
  );
}

/* ----------------------------- Side Panel ----------------------------- */

type TaskSidePanelProps = {
  task: Task;
  currentColumn: ColumnId;

  uploadNote: string;
  onUploadNoteChange: (s: string) => void;

  contentLink: string;
  onContentLinkChange: (s: string) => void;

  uploadedFiles: FileStub[];
  onFileUpload: (files: FileList | null) => void;

  comments: Comment[];
  commentDraft: string;
  onCommentDraftChange: (s: string) => void;
  onAddComment: () => void;

  onMove: (toCol: ColumnId) => void;
  setToast: (s: string) => void;
  onOpenAssetLibrary: () => void;

  onClose: () => void;
};

function TaskSidePanel({
  task,
  currentColumn,
  uploadNote,
  onUploadNoteChange,
  contentLink,
  onContentLinkChange,
  uploadedFiles,
  onFileUpload,
  comments,
  commentDraft,
  onCommentDraftChange,
  onAddComment,
  onMove,
  setToast,
  onOpenAssetLibrary,
  onClose,
}: TaskSidePanelProps) {
  const typeCfg = TYPE_CONFIG[task.type] || TYPE_CONFIG.post;
  const aiMinutes = estimateTimeMinutes(task);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lock background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-colors animate-slide-in-right pt-16 md:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold transition-colors shrink-0">
              {task.supplierInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{task.title}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {task.campaign} · {task.supplier}
              </div>
            </div>
          </div>

          <button
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-200 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 transition-colors">
                <span>{typeCfg.icon}</span>
                <span>{typeCfg.label}</span>
              </span>
              <Pill tone="brand">Due: {task.dueLabel}</Pill>
              <Pill>AI: ~{aiMinutes} min</Pill>
              <Pill tone="pro">Status: {COLUMNS.find((c) => c.id === currentColumn)?.label}</Pill>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Use this panel to upload assets, add links, and keep a conversation with the supplier about this deliverable.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold dark:font-bold">Move task</h3>
              <Pill>{task.priority}</Pill>
            </div>
            <div className="flex flex-wrap gap-2">
              {COLUMNS.map((c) => (
                <Btn
                  key={c.id}
                  tone={c.id === currentColumn ? "brand" : "neutral"}
                  onClick={() => {
                    if (c.id === currentColumn) return;
                    onMove(c.id);
                    setToast(`Moved to ${c.label}`);
                  }}
                >
                  {c.label}
                </Btn>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
            <h3 className="text-xs font-semibold dark:font-bold">Upload content</h3>

            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg px-2 py-3 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onFileUpload(e.target.files)}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold dark:font-bold text-slate-700 dark:text-slate-200">Drop files here</div>
                  <div className="text-[11px] mt-1">Or upload images/videos for this deliverable.</div>
                </div>
                <Btn tone="neutral" onClick={() => fileInputRef.current?.click()}>
                  Upload
                </Btn>
              </div>
            </div>

            {uploadedFiles.length ? (
              <div className="space-y-1">
                {uploadedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                    <span className="truncate">{f.name}</span>
                    <span className="text-slate-400 dark:text-slate-500">{f.sizeLabel}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <label className="text-xs font-semibold dark:font-bold">Upload note</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
              placeholder="Add context for your upload…"
              rows={3}
              value={uploadNote}
              onChange={(e) => onUploadNoteChange(e.target.value)}
            />
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
            <h3 className="text-xs font-semibold dark:font-bold">Content link</h3>
            <input
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
              placeholder="Paste final link (Drive/YouTube/short link)…"
              value={contentLink}
              onChange={(e) => onContentLinkChange(e.target.value)}
            />
            <div className="flex items-center justify-end">
              <Btn
                tone="neutral"
                onClick={async () => {
                  if (!contentLink.trim()) return setToast("Add a link first.");
                  try {
                    await navigator.clipboard.writeText(contentLink.trim());
                    setToast("Link copied.");
                  } catch {
                    setToast("Copy failed.");
                  }
                }}
              >
                Copy link
              </Btn>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
            <h3 className="text-xs font-semibold dark:font-bold">Comments</h3>

            <div className="space-y-2">
              {!comments.length ? (
                <div className="text-xs text-slate-500 dark:text-slate-300">No comments yet.</div>
              ) : null}
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-300">
                    <span className="font-semibold dark:font-bold">{c.name}</span>
                    <span>{c.time}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-700 dark:text-slate-100">{c.body}</div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 pt-1">
              <textarea
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                placeholder="Write a comment…"
                rows={2}
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
              />
              <Btn tone="brand" onClick={onAddComment}>
                Send
              </Btn>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 p-3 border-t border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur flex items-center justify-between gap-2">
          <Btn
            tone="neutral"
            onClick={onOpenAssetLibrary}
          >
            Asset Library
          </Btn>
          <Btn tone="danger" onClick={onClose}>
            Close
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- New Task Drawer ----------------------------- */

type NewTaskPayload = {
  task: Task;
  column: ColumnId;
  openAfterCreate?: boolean;
};

function NewTaskDrawer({
  open,
  onClose,
  contracts,
  existingTasks,
  onCreate,
  setToast,
  onOpenAssetLibrary,
}: {
  open: boolean;
  onClose: () => void;
  contracts: Contract[];
  existingTasks: Task[];
  onCreate: (payload: NewTaskPayload) => Promise<void> | void;
  setToast: (s: string) => void;
  onOpenAssetLibrary: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Wizard steps
  const [step, setStep] = useState<number>(1); // 1 Details, 2 Assignment, 3 Timing, 4 Review

  // Scope
  const [scope, setScope] = useState<"Linked" | "Internal">("Linked");
  const [contractId, setContractId] = useState<string>(contracts?.[0]?.id || "");

  // Task core
  const [title, setTitle] = useState<string>("");
  const [type, setType] = useState<TaskType>("vod");
  const [initialColumn, setInitialColumn] = useState<ColumnId>("todo");
  const [priority, setPriority] = useState<Priority>("Normal");

  const selectedContract = useMemo(() => {
    return (contracts || []).find((c) => c.id === contractId) || null;
  }, [contracts, contractId]);

  // Campaign / parties (filled from contract if linked)
  const [campaignOverride, setCampaignOverride] = useState<string>("");
  const [supplierOverride, setSupplierOverride] = useState<string>("");
  const [brandOverride, setBrandOverride] = useState<string>("");
  const [currency, setCurrency] = useState<string>(selectedContract?.currency || "UGX");
  const [payout, setPayout] = useState<string>("");

  // Assignment
  const [assignee, setAssignee] = useState<string>("@me");
  const [watchers, setWatchers] = useState<string[]>([]);
  const [watcherDraft, setWatcherDraft] = useState<string>("");

  // Timing
  const defaultDue = useMemo(() => toYMD(addDays(new Date(), 3)), []);
  const [dueDate, setDueDate] = useState<string>(defaultDue);
  const [dueTime, setDueTime] = useState<string>("18:00");
  const [reminder, setReminder] = useState<"none" | "1h" | "6h" | "24h">("6h");

  // Work plan
  const [description, setDescription] = useState<string>("");
  const [checklist, setChecklist] = useState<Array<{ id: string; text: string; done: boolean }>>([
    { id: "cl-1", text: "Confirm offer details", done: false },
    { id: "cl-2", text: "Attach assets (video/poster)", done: false },
  ]);
  const [checkDraft, setCheckDraft] = useState<string>("");

  // Dependencies (IDs)
  const [dependencyIds, setDependencyIds] = useState<string[]>([]);

  // Attachments + reference links
  const [refLinks, setRefLinks] = useState<string[]>([]);
  const [refDraft, setRefDraft] = useState<string>("");
  const [files, setFiles] = useState<FileStub[]>([]);

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setScope("Linked");

    const first = contracts?.[0]?.id || "";
    setContractId(first);

    setTitle("");
    setType("vod");
    setInitialColumn("todo");
    setPriority("Normal");

    setCampaignOverride("");
    setSupplierOverride("");
    setBrandOverride("");

    const sc = (contracts || []).find((c) => c.id === first) || null;
    setCurrency(sc?.currency || "UGX");
    setPayout("");

    setAssignee("@me");
    setWatchers([]);
    setWatcherDraft("");

    setDueDate(defaultDue);
    setDueTime("18:00");
    setReminder("6h");

    setDescription("");
    setChecklist([
      { id: "cl-1", text: "Confirm offer details", done: false },
      { id: "cl-2", text: "Attach assets (video/poster)", done: false },
    ]);
    setCheckDraft("");

    setDependencyIds([]);

    setRefLinks([]);
    setRefDraft("");
    setFiles([]);
  }, [open, contracts, defaultDue]);

  // Update currency when contract changes (linked mode)
  useEffect(() => {
    if (scope !== "Linked") return;
    const sc = (contracts || []).find((c) => c.id === contractId) || null;
    if (sc?.currency) setCurrency(sc.currency);
  }, [scope, contractId, contracts]);

  // Scroll lock + ESC close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Validation per step
  const campaignName =
    scope === "Linked"
      ? selectedContract?.campaign || "—"
      : campaignOverride.trim() || "—";

  const supplierName =
    scope === "Linked"
      ? selectedContract?.supplier || selectedContract?.brand || "—"
      : supplierOverride.trim() || "—";

  const brandName = scope === "Linked" ? selectedContract?.brand || "—" : brandOverride.trim() || "—";

  const canNext =
    step === 1
      ? title.trim().length >= 4
      : step === 2
        ? assignee.trim().length >= 2
        : step === 3
          ? !!dueDate && !!dueTime
          : true;

  function next() {
    if (!canNext) return;
    setStep((s) => Math.min(4, s + 1));
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function addWatcher() {
    const v = watcherDraft.trim();
    if (!v) return;
    if (watchers.includes(v)) return;
    setWatchers((p) => [...p, v]);
    setWatcherDraft("");
  }

  function addChecklistItem() {
    const v = checkDraft.trim();
    if (!v) return;
    setChecklist((p) => [...p, { id: `cl-${p.length + 1}`, text: v, done: false }]);
    setCheckDraft("");
  }

  function addRefLink() {
    const v = refDraft.trim();
    if (!v) return;
    setRefLinks((p) => [...p, v]);
    setRefDraft("");
  }

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map((f) => ({ name: f.name, sizeLabel: `${Math.max(1, Math.round(f.size / 1024))} KB` }));
    setFiles((p) => [...p, ...next]);
    setToast(`Attached ${next.length} file(s)`);
  }

  async function create(openAfterCreate: boolean) {
    // Compute due label from chosen date/time (simple, UI-only)
    const d = new Date(`${dueDate}T${dueTime}:00`);
    const diffDays = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const dueLabel =
      diffDays === 0
        ? "Today"
        : diffDays === 1
          ? "Tomorrow"
          : diffDays === -1
            ? "Yesterday"
            : diffDays < 0
              ? `${Math.abs(diffDays)}d overdue`
              : `In ${diffDays}d`;
    const newId = `T-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

    const supplierInitials = seedInitials(supplierName === "—" ? "Supplier" : supplierName);

    const task: Task = {
      id: newId,
      title: title.trim(),
      campaign: campaignName,
      supplier: supplierName,
      supplierInitials,
      brand: brandName === "—" ? supplierName : brandName,
      type,
      priority,
      dueLabel: dueLabel,
      dueDaysFromNow: diffDays,
      overdue: diffDays < 0,
      currency: (currency as any) || "UGX",
      earnings: payout.trim() ? Number(payout.replace(/[^0-9.]/g, "")) || 0 : 0,
      createdAtISO: new Date().toISOString(),
      linkedContractId: scope === "Linked" ? selectedContract?.id : undefined,
    };

    try {
      await onCreate({ task, column: initialColumn, openAfterCreate });
      onClose();
    } catch {
      setToast("Failed to create task.");
    }
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[640px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold dark:font-bold">New Task</div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                <span>✨</span>
                <span>Wizard</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                Step {step}/4
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              Create a deliverable task, link it to a campaign, assign, set due time and guardrails.
            </div>
          </div>

          <Btn tone="neutral" onClick={onClose}>
            Close
          </Btn>
        </div>

        {/* Stepper */}
        <div className="px-4 pt-3">
          <div className="grid grid-cols-4 gap-2 text-[11px]">
            {[
              { n: 1, t: "Details" },
              { n: 2, t: "Assignment" },
              { n: 3, t: "Timing" },
              { n: 4, t: "Review" },
            ].map((s) => (
              <div
                key={s.n}
                className={cx(
                  "rounded-xl border px-2 py-2 text-center font-semibold transition-colors",
                  step === s.n
                    ? "border-transparent text-white"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200",
                )}
                style={step === s.n ? { background: ORANGE } : undefined}
              >
                {s.t}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Step 1 */}
          {step === 1 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                <div className="text-xs font-semibold dark:font-bold text-slate-800 dark:text-slate-100">Scope</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["Linked", "Internal"] as const).map((k) => (
                    <button
                      type="button"
                      key={k}
                      onClick={() => setScope(k)}
                      className={cx(
                        "px-3 py-2 rounded-xl text-xs font-semibold border transition-colors",
                        scope === k
                          ? "border-transparent text-white"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                      style={scope === k ? { background: ORANGE } : undefined}
                    >
                      {k === "Linked" ? "Linked to Campaign" : "Internal Task"}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                  Linked tasks inherit campaign context; internal tasks are personal reminders.
                </div>
              </div>

              {scope === "Linked" ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold dark:font-bold">Campaign</div>
                    <Pill>Active</Pill>
                  </div>
                  <select
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                  >
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.campaign} · {c.supplier}
                      </option>
                    ))}
                  </select>

                  {selectedContract ? (
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                        <div className="text-[11px] text-slate-500">Supplier</div>
                        <div className="font-semibold dark:font-bold text-slate-800 dark:text-slate-100">{selectedContract.supplier}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                        <div className="text-[11px] text-slate-500">Brand</div>
                        <div className="font-semibold dark:font-bold text-slate-800 dark:text-slate-100">{selectedContract.brand}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                  <div className="text-xs font-semibold dark:font-bold">Campaign context (manual)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                      placeholder="Campaign name"
                      value={campaignOverride}
                      onChange={(e) => setCampaignOverride(e.target.value)}
                    />
                    <input
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                      placeholder="Supplier name"
                      value={supplierOverride}
                      onChange={(e) => setSupplierOverride(e.target.value)}
                    />
                    <input
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30 sm:col-span-2"
                      placeholder="Brand (optional)"
                      value={brandOverride}
                      onChange={(e) => setBrandOverride(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                <div className="text-xs font-semibold dark:font-bold">Task details</div>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                  placeholder="Task title (min 4 chars)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                    <div className="text-[11px] text-slate-500">Type</div>
                    <select
                      className="mt-1 w-full bg-transparent outline-none text-xs"
                      value={type}
                      onChange={(e) => setType(e.target.value as TaskType)}
                    >
                      {(["live", "vod", "story", "post"] as TaskType[]).map((t) => (
                        <option key={t} value={t}>
                          {TYPE_CONFIG[t].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                    <div className="text-[11px] text-slate-500">Initial column</div>
                    <select
                      className="mt-1 w-full bg-transparent outline-none text-xs"
                      value={initialColumn}
                      onChange={(e) => setInitialColumn(e.target.value as ColumnId)}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                  <div className="text-[11px] text-slate-500">Priority</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PRIORITY.map((p) => (
                      <button
                        key={p.k}
                        type="button"
                        onClick={() => setPriority(p.k)}
                        className={cx(
                          "px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors",
                          p.pill,
                          priority === p.k ? "ring-2 ring-[#f77f00]/40" : "hover:brightness-95",
                        )}
                      >
                        {p.k}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                  placeholder="Description (optional)"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          {/* Step 2 */}
          {step === 2 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                <div className="text-xs font-semibold dark:font-bold">Assignment</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                    <div className="text-[11px] text-slate-500">Assignee</div>
                    <select
                      className="mt-1 w-full bg-transparent outline-none text-xs"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                    >
                      <option value="@me">@me (Creator)</option>
                      <option value="@crew.editor">@crew.editor (Editor)</option>
                      <option value="@crew.pm">@crew.pm (PM)</option>
                    </select>
                    <div className="mt-1 text-[11px] text-slate-500">Who is responsible for completing this task.</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                    <div className="text-[11px] text-slate-500">Expected payout</div>
                    <div className="mt-1 flex items-center gap-2">
                      <select className="bg-transparent outline-none text-xs" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        <option value="UGX">UGX</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <input
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                        placeholder="0"
                        value={payout}
                        onChange={(e) => setPayout(e.target.value)}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">Optional, for estimates and planning.</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold dark:font-bold">Watchers</div>
                  <Pill>Optional</Pill>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                    placeholder="Add watcher handle (e.g. @supplier.manager)"
                    value={watcherDraft}
                    onChange={(e) => setWatcherDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addWatcher();
                      }
                    }}
                  />
                  <Btn tone="brand" onClick={addWatcher}>
                    Add
                  </Btn>
                </div>
                {watchers.length ? (
                  <div className="flex flex-wrap gap-2">
                    {watchers.map((w) => (
                      <span key={w} className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs">
                        {w}
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          onClick={() => setWatchers((p) => p.filter((x) => x !== w))}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-300">No watchers yet.</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                <div className="text-xs font-semibold dark:font-bold">Checklist</div>
                <div className="space-y-2">
                  {checklist.map((c) => (
                    <label key={c.id} className="flex items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={() => setChecklist((p) => p.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}
                      />
                      <span className={cx("mt-0.5", c.done && "line-through text-slate-400")}>{c.text}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                    placeholder="Add checklist item…"
                    value={checkDraft}
                    onChange={(e) => setCheckDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                  />
                  <Btn tone="neutral" onClick={addChecklistItem}>
                    Add
                  </Btn>
                </div>
              </div>
            </div>
          ) : null}

          {/* Step 3 */}
          {step === 3 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                <div className="text-xs font-semibold dark:font-bold">Due date & time</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                    <div className="text-[11px] text-slate-500">Date</div>
                    <input
                      type="date"
                      className="mt-1 w-full bg-transparent outline-none text-xs"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                    <div className="text-[11px] text-slate-500">Time</div>
                    <input
                      type="time"
                      className="mt-1 w-full bg-transparent outline-none text-xs"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                  <div className="text-[11px] text-slate-500">Reminder</div>
                  <select
                    className="mt-1 w-full bg-transparent outline-none text-xs"
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value as any)}
                  >
                    <option value="none">None</option>
                    <option value="1h">1 hour before</option>
                    <option value="6h">6 hours before</option>
                    <option value="24h">24 hours before</option>
                  </select>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Reminder preferences are saved with this task for follow-up workflows.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold dark:font-bold">Dependencies</div>
                  <Pill>Optional</Pill>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-300">
                  Select tasks that must be completed first.
                </div>

                <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 space-y-2">
                  {existingTasks.slice(0, 16).map((t) => {
                    const checked = dependencyIds.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-start gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setDependencyIds((p) => (checked ? p.filter((x) => x !== t.id) : [...p, t.id]))
                          }
                        />
                        <span className="mt-0.5">
                          <span className="font-semibold dark:font-bold text-slate-800 dark:text-slate-100">{t.title}</span>
                          <span className="text-slate-500 dark:text-slate-300"> · {t.campaign}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                <div className="text-xs font-semibold dark:font-bold">Attachments & reference links</div>

                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files)}
                />

                <div className="flex flex-wrap gap-2">
                  <Btn tone="neutral" onClick={() => fileRef.current?.click()}>
                    Attach files
                  </Btn>
                  <Btn tone="neutral" onClick={onOpenAssetLibrary}>
                    Pick from Asset Library
                  </Btn>
                </div>

                {files.length ? (
                  <div className="space-y-1">
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="truncate">{f.name}</span>
                        <span className="text-slate-400 dark:text-slate-500">{f.sizeLabel}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-300">No files attached.</div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <input
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#f77f00]/30"
                    placeholder="Add reference link (Drive, doc, brief…)"
                    value={refDraft}
                    onChange={(e) => setRefDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRefLink();
                      }
                    }}
                  />
                  <Btn tone="brand" onClick={addRefLink}>
                    Add
                  </Btn>
                </div>

                {refLinks.length ? (
                  <div className="space-y-1">
                    {refLinks.map((l, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                        <span className="truncate">{l}</span>
                        <button type="button" className="text-slate-500 hover:text-slate-800 dark:hover:text-white" onClick={() => setRefLinks((p) => p.filter((_, i) => i != idx))}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Step 4 */}
          {step === 4 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3">
                <div className="text-xs font-semibold dark:font-bold">Review</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                    <div className="text-[11px] text-slate-500">Campaign</div>
                    <div className="font-semibold dark:font-bold text-slate-800 dark:text-slate-100">{campaignName}</div>
                    <div className="mt-1 text-[11px] text-slate-500">Supplier: {supplierName}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
                    <div className="text-[11px] text-slate-500">Task</div>
                    <div className="font-semibold dark:font-bold text-slate-800 dark:text-slate-100">{title || "—"}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {TYPE_CONFIG[type].label} · {priority} · {COLUMNS.find((c) => c.id === initialColumn)?.label}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 sm:col-span-2">
                    <div className="text-[11px] text-slate-500">Due</div>
                    <div className="font-semibold dark:font-bold text-slate-800 dark:text-slate-100">
                      {dueDate} at {dueTime} · Reminder: {reminder}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">Assignee: {assignee}</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 sm:col-span-2">
                    <div className="text-[11px] text-slate-500">Checklist</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {checklist.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[11px]">
                          {c.done ? "✅" : "⬜"} {c.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-200">
                <div className="font-semibold dark:font-bold">Premium guardrail</div>
                <div className="mt-1">
                  Review due time, dependencies, and links before creating the task.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur flex items-center justify-between gap-2">
          <Btn tone="neutral" onClick={back} disabled={step === 1}>
            Back
          </Btn>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Btn tone={canNext ? "brand" : "neutral"} onClick={next} disabled={!canNext} title={!canNext ? "Complete required fields to continue" : "Next"}>
                Next
              </Btn>
            ) : (
              <>
                <Btn tone="neutral" onClick={() => void create(false)}>
                  Create
                </Btn>
                <Btn tone="brand" onClick={() => void create(true)}>
                  Create & open
                </Btn>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
