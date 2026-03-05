import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import type {
  ContractRecord,
  CreateTaskInput,
  TaskAttachmentRecord,
  TaskChecklistItem,
  TaskColumn,
  TaskPriority,
  TaskRecord
} from "../../api/types";
import { useNotification } from "../../contexts/NotificationContext";
import { useContractsQuery } from "../../hooks/api/useContracts";
import {
  useAddTaskAttachmentMutation,
  useAddTaskCommentMutation,
  useCreateTaskMutation,
  useTaskQuery,
  useTasksQuery,
  useUpdateTaskMutation
} from "../../hooks/api/useTasks";
import { formatMoney } from "../../utils/collaborationUi";

const TASK_COLUMNS: { value: TaskColumn; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "needs_changes", label: "Needs changes" }
];

const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "critical"];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getPriorityClasses(priority: string | null | undefined): string {
  switch (priority) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200";
    case "high":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
    case "medium":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}

function getColumnLabel(column: string | null | undefined): string {
  return TASK_COLUMNS.find((item) => item.value === column)?.label ?? String(column || "Task");
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</div> : null}
    </div>
  );
}

function TaskCard({ task, isActive, onSelect, onDragStart }: {
  task: TaskRecord;
  isActive: boolean;
  onSelect: () => void;
  onDragStart: (taskId: string) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={() => onDragStart(task.id)}
      onClick={onSelect}
      className={`w-full rounded-3xl border p-3 text-left transition ${isActive ? "border-[#f77f00] bg-orange-50/70 dark:border-[#f77f00] dark:bg-orange-950/20" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{task.campaign}</div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase ${getPriorityClasses(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div>Due {task.dueLabel || formatDateTime(task.dueAt)}</div>
        <div>{task.type} • {formatMoney(task.earnings, task.currency)}</div>
        <div>{task.comments.length} comments • {task.attachments.length} attachments</div>
      </div>
    </button>
  );
}

function CreateTaskDialog({
  open,
  contracts,
  onClose,
  onSubmit,
  isSubmitting
}: {
  open: boolean;
  contracts: ContractRecord[];
  onClose: () => void;
  onSubmit: (payload: CreateTaskInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [contractId, setContractId] = useState("");
  const [title, setTitle] = useState("");
  const [campaign, setCampaign] = useState("");
  const [supplier, setSupplier] = useState("");
  const [type, setType] = useState("task");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [column, setColumn] = useState<TaskColumn>("todo");
  const [dueAt, setDueAt] = useState("");
  const [earnings, setEarnings] = useState("0");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setContractId("");
    setTitle("");
    setCampaign("");
    setSupplier("");
    setType("task");
    setPriority("medium");
    setColumn("todo");
    setDueAt("");
    setEarnings("0");
    setDescription("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create task</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This writes directly to the backend task collection.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <form
          className="mt-5 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit({
              contractId: contractId || undefined,
              campaign: contractId ? undefined : campaign,
              supplier: contractId ? undefined : supplier,
              title,
              type,
              priority,
              column,
              dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
              earnings: Number(earnings || 0),
              description,
              currency: "USD"
            });
          }}
        >
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Contract (optional)
            <select
              value={contractId}
              onChange={(event) => setContractId(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">No linked contract</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.title} — {contract.brand || contract.sellerName}
                </option>
              ))}
            </select>
          </label>

          {!contractId ? (
            <>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Campaign
                <input
                  value={campaign}
                  onChange={(event) => setCampaign(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Supplier / seller
                <input
                  value={supplier}
                  onChange={(event) => setSupplier(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            </>
          ) : null}

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Type
            <input
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {PRIORITY_OPTIONS.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Column
            <select
              value={column}
              onChange={(event) => setColumn(event.target.value as TaskColumn)}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {TASK_COLUMNS.map((entry) => (
                <option key={entry.value} value={entry.value}>{entry.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Due at
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Earnings value
            <input
              type="number"
              min="0"
              value={earnings}
              onChange={(event) => setEarnings(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || (!contractId && (!campaign.trim() || !supplier.trim()))}
              className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailsPanel({
  task,
  onSave,
  onToggleChecklist,
  onAddComment,
  onAddAttachment,
  isSaving,
  onOpenAssetLibrary
}: {
  task: TaskRecord;
  onSave: (payload: Partial<TaskRecord>) => Promise<void>;
  onToggleChecklist: (item: TaskChecklistItem) => Promise<void>;
  onAddComment: (body: string) => Promise<void>;
  onAddAttachment: (payload: { name: string; url: string; note: string }) => Promise<void>;
  isSaving: boolean;
  onOpenAssetLibrary: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<TaskPriority | string>(task.priority);
  const [column, setColumn] = useState<TaskColumn | string>(task.column);
  const [dueAt, setDueAt] = useState(formatDateInputValue(task.dueAt));
  const [commentBody, setCommentBody] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentNote, setAttachmentNote] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setColumn(task.column);
    setDueAt(formatDateInputValue(task.dueAt));
    setCommentBody("");
    setAttachmentName("");
    setAttachmentUrl("");
    setAttachmentNote("");
  }, [task]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{task.title}</h2>
            <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase ${getPriorityClasses(task.priority)}`}>
              {task.priority}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{task.campaign} • {task.supplier}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due {task.dueLabel || formatDateTime(task.dueAt)} • {formatMoney(task.earnings, task.currency)}</p>
        </div>
        <button
          type="button"
          onClick={onOpenAssetLibrary}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Open Asset Library
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Column
          <select
            value={column}
            onChange={(event) => setColumn(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {TASK_COLUMNS.map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Priority
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {PRIORITY_OPTIONS.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
          Due at
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onSave({ title, description, priority, column, dueAt: dueAt ? new Date(dueAt).toISOString() : task.dueAt })}
          disabled={isSaving}
          className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Checklist</h3>
          <div className="mt-3 space-y-2">
            {(task.checklist ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No checklist items yet.</p>
            ) : (
              (task.checklist ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void onToggleChecklist(item)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${item.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"}`}>
                    {item.done ? "✓" : "•"}
                  </span>
                  <span className={`text-sm ${item.done ? "line-through text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>{item.text}</span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Comments</h3>
          <div className="mt-3 space-y-2">
            {task.comments.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No comments yet.</p> : null}
            {task.comments.map((comment) => (
              <div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{comment.author}</div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{comment.body}</div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(comment.createdAt)}</div>
              </div>
            ))}
          </div>
          <form
            className="mt-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void onAddComment(commentBody).then(() => setCommentBody(""));
            }}
          >
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              rows={3}
              placeholder="Add a task note or reviewer comment"
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!commentBody.trim()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Add comment
            </button>
          </form>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attachments</h3>
        <div className="mt-3 space-y-2">
          {task.attachments.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No attachments yet.</p> : null}
          {task.attachments.map((attachment: TaskAttachmentRecord) => (
            <div key={attachment.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{attachment.name}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{attachment.note || attachment.sizeLabel || attachment.kind || "Attachment"}</div>
                </div>
                {attachment.url ? (
                  <a href={attachment.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#f77f00] hover:underline">
                    Open
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <form
          className="mt-3 grid gap-2 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onAddAttachment({ name: attachmentName, url: attachmentUrl, note: attachmentNote }).then(() => {
              setAttachmentName("");
              setAttachmentUrl("");
              setAttachmentNote("");
            });
          }}
        >
          <input
            value={attachmentName}
            onChange={(event) => setAttachmentName(event.target.value)}
            placeholder="Attachment name"
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            value={attachmentUrl}
            onChange={(event) => setAttachmentUrl(event.target.value)}
            placeholder="https://..."
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            value={attachmentNote}
            onChange={(event) => setAttachmentNote(event.target.value)}
            placeholder="Optional note"
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={!attachmentName.trim() && !attachmentUrl.trim()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Add attachment
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function TaskBoardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showError, showSuccess } = useNotification();

  const initialContractId = searchParams.get("contractId")?.trim() || "";
  const initialTaskId = searchParams.get("taskId")?.trim() || "";

  const [search, setSearch] = useState("");
  const [contractFilter, setContractFilter] = useState(initialContractId);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(initialTaskId || undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const contractsQuery = useContractsQuery({ pageSize: 100 });
  const tasksQuery = useTasksQuery({
    q: search.trim() || undefined,
    contractId: contractFilter || undefined,
    overdueOnly: overdueOnly || undefined,
    pageSize: 200
  });

  const tasks = tasksQuery.data?.items ?? [];
  const groupedTasks = useMemo(() => {
    return TASK_COLUMNS.map((column) => ({
      ...column,
      tasks: tasks.filter((task) => task.column === column.value)
    }));
  }, [tasks]);

  useEffect(() => {
    if (tasks.length === 0) {
      setSelectedTaskId(undefined);
      return;
    }
    const stillExists = selectedTaskId && tasks.some((task) => task.id === selectedTaskId);
    if (!stillExists) {
      setSelectedTaskId(tasks[0]?.id);
    }
  }, [selectedTaskId, tasks]);

  const selectedTaskFromList = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );
  const taskDetailQuery = useTaskQuery(selectedTaskId, { enabled: Boolean(selectedTaskId) });
  const selectedTask = taskDetailQuery.data ?? selectedTaskFromList;

  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const addCommentMutation = useAddTaskCommentMutation();
  const addAttachmentMutation = useAddTaskAttachmentMutation();

  const totalOpenTasks = useMemo(
    () => tasks.filter((task) => task.column !== "approved").length,
    [tasks]
  );
  const overdueCount = useMemo(
    () => tasks.filter((task) => task.overdue).length,
    [tasks]
  );
  const pipelineValue = useMemo(
    () => tasks.reduce((sum, task) => sum + task.earnings, 0),
    [tasks]
  );

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    const next = new URLSearchParams(searchParams);
    next.set("taskId", taskId);
    if (contractFilter) next.set("contractId", contractFilter);
    void navigate({ search: next.toString() }, { replace: true });
  };

  const handleCreateTask = async (payload: CreateTaskInput) => {
    try {
      const task = await createTaskMutation.mutateAsync(payload);
      setCreateOpen(false);
      setSelectedTaskId(task.id);
      showSuccess("Task created.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not create task.");
    }
  };

  const handleMoveTask = async (taskId: string, column: TaskColumn) => {
    try {
      await updateTaskMutation.mutateAsync({ taskId, payload: { column } });
      showSuccess(`Task moved to ${getColumnLabel(column)}.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not move task.");
    }
  };

  const handleToggleChecklist = async (item: TaskChecklistItem) => {
    if (!selectedTask) return;
    try {
      await updateTaskMutation.mutateAsync({
        taskId: selectedTask.id,
        payload: {
          checklist: (selectedTask.checklist ?? []).map((entry) =>
            entry.id === item.id ? { ...entry, done: !entry.done } : entry
          )
        }
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update checklist.");
    }
  };

  return (
    <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
      <PageHeader
        pageTitle="Task Board"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Backend driven • drag, update, comment, attach
          </span>
        }
        rightContent={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00]"
          >
            New task
          </button>
        }
      />

      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-3 pt-4 sm:px-4 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Visible tasks" value={String(tasks.length)} helper="Current filtered board" />
            <SummaryCard label="Open tasks" value={String(totalOpenTasks)} helper="Excludes approved" />
            <SummaryCard label="Overdue" value={String(overdueCount)} helper="Needs attention" />
            <SummaryCard label="Pipeline value" value={formatMoney(pipelineValue, tasks[0]?.currency || "USD")} helper="Task-linked earnings" />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_160px_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search task title, campaign, brand"
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <select
              value={contractFilter}
              onChange={(event) => {
                const nextValue = event.target.value;
                setContractFilter(nextValue);
                const next = new URLSearchParams(searchParams);
                if (nextValue) next.set("contractId", nextValue);
                else next.delete("contractId");
                void navigate({ search: next.toString() }, { replace: true });
              }}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">All contracts</option>
              {(contractsQuery.data?.items ?? []).map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setOverdueOnly((current) => !current)}
              className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${overdueOnly ? "border-red-500 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200" : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}
            >
              {overdueOnly ? "Showing overdue" : "Overdue only"}
            </button>
            <button
              type="button"
              onClick={() => void navigate("/asset-library")}
              className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Open Asset Library
            </button>
          </div>
        </section>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {tasksQuery.isLoading ? (
              <div className="flex min-h-[45vh] items-center justify-center">
                <CircularProgress size={28} />
              </div>
            ) : tasks.length === 0 ? (
              <EmptyPanel title="No tasks found" body="Create a new task or relax the board filters to see more work items." />
            ) : (
              <div className="grid gap-4 xl:grid-cols-5">
                {groupedTasks.map((column) => (
                  <div
                    key={column.value}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const taskId = event.dataTransfer.getData("text/task-id") || draggedTaskId;
                      if (taskId) {
                        void handleMoveTask(taskId, column.value);
                        setDraggedTaskId(null);
                      }
                    }}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{column.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{column.tasks.length} tasks</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {column.tasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          Drop a task here
                        </div>
                      ) : (
                        column.tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            isActive={task.id === selectedTaskId}
                            onSelect={() => handleSelectTask(task.id)}
                            onDragStart={(taskId) => setDraggedTaskId(taskId)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            {selectedTask ? (
              taskDetailQuery.isLoading && !selectedTaskFromList ? (
                <div className="flex min-h-[45vh] items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <CircularProgress size={28} />
                </div>
              ) : (
                <TaskDetailsPanel
                  task={selectedTask}
                  isSaving={updateTaskMutation.isPending || addCommentMutation.isPending || addAttachmentMutation.isPending}
                  onSave={async (payload) => {
                    try {
                      await updateTaskMutation.mutateAsync({
                        taskId: selectedTask.id,
                        payload: {
                          title: payload.title,
                          description: payload.description,
                          priority: payload.priority,
                          column: payload.column,
                          dueAt: payload.dueAt
                        }
                      });
                      showSuccess("Task updated.");
                    } catch (error) {
                      showError(error instanceof Error ? error.message : "Could not update task.");
                    }
                  }}
                  onToggleChecklist={handleToggleChecklist}
                  onAddComment={async (body) => {
                    try {
                      await addCommentMutation.mutateAsync({ taskId: selectedTask.id, payload: { body } });
                      showSuccess("Comment added.");
                    } catch (error) {
                      showError(error instanceof Error ? error.message : "Could not add comment.");
                    }
                  }}
                  onAddAttachment={async ({ name, url, note }) => {
                    try {
                      await addAttachmentMutation.mutateAsync({
                        taskId: selectedTask.id,
                        payload: { name, url, note }
                      });
                      showSuccess("Attachment added.");
                    } catch (error) {
                      showError(error instanceof Error ? error.message : "Could not add attachment.");
                    }
                  }}
                  onOpenAssetLibrary={() => void navigate("/asset-library")}
                />
              )
            ) : (
              <EmptyPanel title="Select a task" body="Pick a task card to edit it, add comments, track attachments, and update its workflow state." />
            )}
          </section>
        </div>
      </div>

      <CreateTaskDialog
        open={createOpen}
        contracts={contractsQuery.data?.items ?? []}
        isSubmitting={createTaskMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}

export default TaskBoardPage;
