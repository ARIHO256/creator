import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SupplierTaskBoardPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: TaskBoardPage.tsx (Creator)
 *
 * Mirror-first preserved:
 * - PageHeader + orange badge
 * - Kanban columns (To do · In progress · Submitted · Approved · Needs changes)
 * - Horizontal scroll for columns on ALL screens
 * - Drag & drop between columns
 * - Task card layout (title, campaign, pills, due label, earnings, AI estimate)
 * - Side panel pattern (slide-in drawer) with notes, link, uploads, comments
 * - Auto-sort by urgency + overdue
 *
 * Supplier adaptations (minimal, necessary):
 * - Tasks represent deliverables across Supplier campaigns; assignee is the Creator (or Supplier-as-Creator)
 * - Side panel is role-aware:
 *   - If Supplier is the host (Not Use Creator): Supplier submits content (upload & links)
 *   - If Creator is the host (Use Creator): Supplier reviews submission (Approve / Request changes)
 * - Governance pills added: hostRole, creatorUsage, collabMode, approvalMode
 * - Overdue glow is implemented (red ring)
 *
 * ✅ Improvement added in this revision:
 * - “New task” button now opens a COMPLETE right side drawer (wizard-style) for task creation.
 *   - Linked to a contract/campaign OR internal task
 *   - Assignment (creator vs supplier team)
 *   - Timing (due date/time, reminders) + priority
 *   - Approvals (manual/auto, admin review requirement)
 *   - Checklist + dependencies + attachments + link pack
 *   - Create task into selected Kanban column + option “Create & open”
 *
 * Notes:
 * - Self-contained canvas version (no project imports). Replace toast-nav with router navigation in app.
 */

const ORANGE = "#f77f00";
const ROUTES = {
  assetLibrary: "/mldz/deliverables/asset-library",
  linksHub: "/mldz/deliverables/links-hub"
};

// Minimal, dependency-free className combiner.
function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* ----------------------------- Mock Contracts ----------------------------- */

const CONTRACTS = [
  {
    id: "C-901",
    status: "Active",
    campaign: "EV Charger Flash Drop",
    brand: "EV World Store",
    currency: "UGX",
    value: 7200000,
    totalTasks: 6,
    creator: { name: "Luna Ade", handle: "@lunaade", avatarUrl: "https://i.pravatar.cc/120?img=7" },
    governance: {
      hostRole: "Creator",
      creatorUsage: "I will use a Creator",
      collabMode: "Open for Collabs",
      approvalMode: "Manual"
    },
    deliverables: [
      { id: 1, label: "Live Session (EV charger demo)", done: false },
      { id: 2, label: "Video Clip (30s highlight)", done: false },
      { id: 3, label: "Story (countdown + CTA)", done: false },
      { id: 4, label: "Post (product grid)", done: true }
    ]
  },
  {
    id: "C-902",
    status: "Active",
    campaign: "Back-to-Work Essentials",
    brand: "Urban Supply",
    currency: "UGX",
    value: 5400000,
    totalTasks: 5,
    creator: { name: "Chris M.", handle: "@chris.finds", avatarUrl: "https://i.pravatar.cc/120?img=12" },
    governance: {
      hostRole: "Creator",
      creatorUsage: "I will use a Creator",
      collabMode: "Invite-Only",
      approvalMode: "Manual"
    },
    deliverables: [
      { id: 1, label: "Video Clip (unboxing)", done: false },
      { id: 2, label: "Story (3-item roundup)", done: false },
      { id: 3, label: "Post (bundle offer)", done: false }
    ]
  },
  {
    id: "C-903",
    status: "Active",
    campaign: "Home Essentials Drop",
    brand: "HomePro",
    currency: "UGX",
    value: 3600000,
    totalTasks: 4,
    creator: { name: "(Supplier-hosted)", handle: "@homepro", avatarUrl: "https://i.pravatar.cc/120?img=46" },
    governance: {
      hostRole: "Supplier",
      creatorUsage: "I will NOT use a Creator",
      collabMode: "(n/a)",
      approvalMode: "Manual"
    },
    deliverables: [
      { id: 1, label: "Live Session (kitchen bundle)", done: false },
      { id: 2, label: "Video Clip (best moments)", done: false },
      { id: 3, label: "Post (bundle pricing)", done: false }
    ]
  },
  {
    id: "C-904",
    status: "Terminated",
    campaign: "Old Campaign (terminated)",
    brand: "Do Not Show",
    currency: "UGX",
    value: 0,
    totalTasks: 0,
    creator: { name: "N/A", handle: "@na", avatarUrl: "https://i.pravatar.cc/120?img=20" },
    governance: {
      hostRole: "Creator",
      creatorUsage: "I will use a Creator",
      collabMode: "Open for Collabs",
      approvalMode: "Manual"
    },
    deliverables: []
  }
];

/* ----------------------------- Types / Config ----------------------------- */

const COLUMNS = [
  { id: "todo", label: "To do" },
  { id: "in-progress", label: "In progress" },
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "needs-changes", label: "Needs changes" }
];

function columnTone(columnId) {
  if (columnId === "approved") return "good";
  if (columnId === "submitted") return "warn";
  if (columnId === "needs-changes") return "bad";
  return "neutral";
}

const TYPE_CONFIG = {
  live: { icon: "📺", label: "Live" },
  vod: { icon: "🎬", label: "VOD" },
  story: { icon: "📱", label: "Story" },
  post: { icon: "📝", label: "Post" }
};

const PRIORITY = [
  { k: "Low", pill: "bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200" },
  { k: "Normal", pill: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" },
  { k: "High", pill: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300" },
  { k: "Critical", pill: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300" }
];

// Helper to get deterministic due date for demo based on a seed
const getDeterministicDue = (seed) => {
  // Range: -2 to 7 days
  const days = (seed % 10) - 2;
  return {
    days,
    label: days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 0 ? "Overdue" : `In ${days} days`
  };
};

// Simple AI time estimate based on deliverable type
function estimateTimeMinutes(task) {
  switch (task.type) {
    case "live":
      return 90;
    case "vod":
      return 45;
    case "story":
      return 15;
    case "post":
    default:
      return 25;
  }
}

function initialsFromHandle(handle) {
  const s = String(handle || "").replace(/[^a-zA-Z0-9]/g, "");
  const a = s.slice(0, 2).toUpperCase();
  return a || "NA";
}

function brandInitials(name) {
  const s = String(name || "").trim();
  if (!s) return "NA";
  const parts = s.split(/\s+/g);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYMD(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function daysFromNowForYMD(ymd) {
  if (!ymd) return 0;
  const [y, m, d] = String(ymd).split("-").map((x) => Number(x));
  const due = new Date(y, (m || 1) - 1, d || 1);
  const now = new Date();
  const ms = due.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function dueLabelFromDays(days) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return "Overdue";
  return `In ${days} days`;
}

function randomId(prefix = "T") {
  return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

/* ----------------------------- UI helpers ----------------------------- */

function PageHeader({ pageTitle, badge, right }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="min-w-0 px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-50 truncate">{pageTitle}</h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
        {right ? <div className="flex flex-wrap items-center justify-end gap-2">{right}</div> : null}
      </div>
    </header>
  );
}

function Btn({ tone = "neutral", children, onClick, disabled, title }) {
  const base = "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border";
  const cls =
    tone === "brand"
      ? "text-white border-transparent"
      : tone === "danger"
        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30"
        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800";
  const style = tone === "brand" ? { background: ORANGE } : undefined;
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={cx(base, cls, disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
}

function Pill({ tone = "neutral", children, title, className }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300"
        : tone === "bad"
          ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300"
          : tone === "brand"
            ? "text-white border-transparent"
            : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200";

  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold", cls, className)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="text-xs font-semibold dark:font-bold text-slate-700 dark:text-slate-200">{children}</div>
      {hint ? <div className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", min, max, disabled }) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-slate-900 focus:bg-white dark:bg-slate-900 focus:border-slate-400 outline-none transition-colors",
        disabled && "opacity-70 cursor-not-allowed bg-gray-50 dark:bg-slate-950 dark:bg-slate-900"
      )}
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-slate-900 outline-none transition-colors"
    >
      {children}
    </select>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-slate-900 outline-none resize-none transition-colors"
    />
  );
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      {label ? <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div> : null}
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

function Toast({ text, onClose }) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(onClose, 2400);
    return () => clearTimeout(t);
  }, [text, onClose]);

  if (!text) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
      <div className="rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-semibold shadow-lg">{text}</div>
    </div>
  );
}

/* ----------------------------- Main Page ----------------------------- */

export default function SupplierTaskBoardPage() {
  // 1) Derive all tasks from contracts
  const allDerivedTasks = useMemo(() => {
    const tasks = [];

    CONTRACTS.forEach((contract) => {
      if (contract.status === "Terminated") return;

      (contract.deliverables || []).forEach((d) => {
        // Map type
        let tType = "post";
        const low = String(d.label || "").toLowerCase();
        if (low.includes("live")) tType = "live";
        else if (low.includes("video") || low.includes("clip")) tType = "vod";
        else if (low.includes("story")) tType = "story";

        // Map due date (deterministic)
        const seed = String(contract.id).charCodeAt(String(contract.id).length - 1) + d.id * 7;
        const dueInfo = getDeterministicDue(seed);

        const creatorInitials = initialsFromHandle(contract.creator?.handle);
        const supplierInitials = brandInitials(contract.brand);

        const earnings = contract.totalTasks ? Math.round(contract.value / contract.totalTasks) : 0;

        tasks.push({
          id: `${contract.id}-${d.id}`,
          title: d.label,
          campaign: contract.campaign,
          brand: contract.brand,
          brandInitials: supplierInitials,
          // Keep original property names for layout mirroring
          seller: contract.creator?.handle || "@creator",
          sellerInitials: creatorInitials,
          type: tType,
          dueLabel: dueInfo.label,
          dueDaysFromNow: dueInfo.days,
          earnings,
          currency: contract.currency,
          overdue: !d.done && dueInfo.days < 0,

          // Supplier governance
          hostRole: contract.governance?.hostRole || "Creator",
          creatorUsage: contract.governance?.creatorUsage || "I will use a Creator",
          collabMode: contract.governance?.collabMode || "Open for Collabs",
          approvalMode: contract.governance?.approvalMode || "Manual",

          // Submission mocks
          submission: {
            status: d.done ? "Approved" : "In progress",
            link: `https://drive.example.com/${encodeURIComponent(contract.id)}/${d.id}`,
            files: [
              { name: `${tType}_draft_${d.id}.mp4`, size: "48MB" },
              { name: `caption_${d.id}.txt`, size: "2KB" }
            ]
          },

          // extra metadata used by New Task drawer (safe to ignore elsewhere)
          meta: {
            priority: "Normal",
            checklist: [],
            dependencies: [],
            watchers: [],
            reminders: "6h",
            requireAdminReview: true
          }
        });
      });
    });

    return tasks;
  }, []);

  // 2) Distribute into columns (mirrors creator logic)
  const [columns, setColumns] = useState(() => {
    const cols = {
      todo: [],
      "in-progress": [],
      submitted: [],
      approved: [],
      "needs-changes": []
    };

    allDerivedTasks.forEach((task, i) => {
      const mod = i % 5;
      if (mod === 0) cols.todo.push(task);
      else if (mod === 1) cols["in-progress"].push(task);
      else if (mod === 2) cols.submitted.push(task);
      else if (mod === 3) cols.approved.push(task);
      else cols["needs-changes"].push(task);
    });

    return cols;
  });

  const [dragging, setDragging] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Side panel state (mirrors creator)
  const [uploadNote, setUploadNote] = useState("");
  const [contentLink, setContentLink] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [comments, setComments] = useState([
    {
      id: 1,
      from: "creator",
      name: "@lunaade",
      body: "I added the ingredient highlight in the first 30 seconds as requested.",
      time: "Yesterday"
    },
    {
      id: 2,
      from: "supplier",
      name: "You",
      body: "Looks good. Please tighten the hook and add price overlay at 00:05.",
      time: "Yesterday"
    }
  ]);
  const [commentDraft, setCommentDraft] = useState("");

  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("list");

  // ✅ New Task drawer state
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const taskToColumn = useMemo(() => {
    const map = new Map();
    Object.entries(columns).forEach(([colId, tasks]) => {
      tasks.forEach((t) => map.set(t.id, colId));
    });
    return map;
  }, [columns]);

  const allTasksFlat = useMemo(() => {
    return Object.values(columns).flat();
  }, [columns]);

  const listRows = useMemo(() => {
    const rows = Object.entries(columns).flatMap(([columnId, tasks]) =>
      (tasks || []).map((task) => ({
        task,
        columnId,
        columnLabel: COLUMNS.find((col) => col.id === columnId)?.label || columnId
      }))
    );

    rows.sort((a, b) => {
      if (a.task.overdue && !b.task.overdue) return -1;
      if (!a.task.overdue && b.task.overdue) return 1;
      const dueDiff = Number(a.task.dueDaysFromNow || 0) - Number(b.task.dueDaysFromNow || 0);
      if (dueDiff !== 0) return dueDiff;
      return String(a.task.title || "").localeCompare(String(b.task.title || ""));
    });

    return rows;
  }, [columns]);

  function safeNav(url) {
    navigate(url);
  }

  const handleDragStart = (taskId, fromColumn) => {
    setDragging({ id: taskId, fromColumn });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const moveTask = (taskId, toColumn) => {
    const fromColumn = taskToColumn.get(taskId);
    if (!fromColumn || fromColumn === toColumn) return;

    setColumns((prev) => {
      const fromTasks = prev[fromColumn] || [];
      const toTasks = prev[toColumn] || [];
      const task = fromTasks.find((t) => t.id === taskId);
      if (!task) return prev;

      const updatedTask = { ...task };
      if (toColumn === "submitted" || toColumn === "approved") {
        updatedTask.overdue = false;
        updatedTask.dueLabel = toColumn === "submitted" ? "Submitted" : "Approved";
      } else if (toColumn === "needs-changes") {
        updatedTask.dueLabel = "Changes requested";
        updatedTask.overdue = false;
      }

      return {
        ...prev,
        [fromColumn]: fromTasks.filter((t) => t.id !== taskId),
        [toColumn]: [...toTasks, updatedTask]
      };
    });

    setToast(`Moved to “${COLUMNS.find((c) => c.id === toColumn)?.label || toColumn}”`);
  };

  const handleDrop = (toColumn) => {
    if (!dragging) return;
    const { id, fromColumn } = dragging;
    if (fromColumn === toColumn) {
      setDragging(null);
      return;
    }

    // Permission note (Supplier): in production restrict transitions.
    // Example: Supplier Reviewer may only move Submitted → Approved/Needs changes.
    moveTask(id, toColumn);
    setDragging(null);
  };

  const handleCardClick = (task) => {
    setSelectedTask(task);
    setUploadNote("");
    setContentLink(task?.submission?.link || "");
    setUploadedFiles([]);
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const handleAddComment = () => {
    const txt = commentDraft.trim();
    if (!txt) return;
    setComments((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        from: "supplier",
        name: "You",
        body: txt,
        time: "Now"
      }
    ]);
    setCommentDraft("");
  };

  const approveTask = (task) => {
    moveTask(task.id, "approved");
    setToast("Approved (Supplier). Next step: Admin review if required.");
  };

  const requestChanges = (task) => {
    moveTask(task.id, "needs-changes");
    setToast("Changes requested. Creator will resubmit.");
  };

  const submitTaskAsSupplier = (task) => {
    // Supplier-as-Creator path
    moveTask(task.id, "submitted");
    setToast("Submitted. Next step: Admin review (manual campaigns). ");
  };

  const addNewTaskToBoard = ({ task, initialColumn, openAfter }) => {
    const col = initialColumn || "todo";
    setColumns((prev) => ({
      ...prev,
      [col]: [...(prev[col] || []), task]
    }));

    setToast(`Task created in “${COLUMNS.find((c) => c.id === col)?.label || col}”`);

    // close drawer
    setNewTaskOpen(false);

    if (openAfter) {
      // open details panel
      setTimeout(() => {
        handleCardClick(task);
      }, 0);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <style>{`
        @keyframes slideInRight { from { opacity:0; transform: translateX(18px);} to { opacity:1; transform: translateX(0);} }
        .animate-slide-in-right { animation: slideInRight .22s ease-out both; }
      `}</style>

      <PageHeader
        pageTitle="Task Board"
        right={
          <>
            <Btn tone="neutral" onClick={() => safeNav(ROUTES.assetLibrary)}>Asset Library</Btn>
            <Btn tone="neutral" onClick={() => safeNav(ROUTES.linksHub)}>Links Hub</Btn>
            <Btn tone="brand" onClick={() => setNewTaskOpen(true)}>New task</Btn>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Drag cards across columns as work progresses. Overdue items glow red, and each card includes an AI time estimate.
                Supplier notes: approve submitted deliverables, request changes, or submit content when you are hosting.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="hidden md:flex items-center gap-2 text-slate-500 dark:text-slate-300">
                <span>Columns: To do · In progress · Submitted · Approved · Needs changes</span>
              </div>
              <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cx(
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                    viewMode === "list"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("board")}
                  className={cx(
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                    viewMode === "board"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  Board
                </button>
              </div>
            </div>
          </div>

          {viewMode === "board" ? (
            <section className="flex flex-wrap gap-4 items-start text-sm pb-4 h-full">
              {COLUMNS.map((col) => (
                <div
                  key={col.id}
                  className="w-full sm:w-[357px] flex flex-col bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-full transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(col.id)}
                >
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-inherit rounded-t-2xl z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-50">{col.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{getColumnTasks(columns, col.id).length}</span>
                    </div>
                  </div>

                  <div className="flex-1 px-2 py-2 space-y-2 overflow-y-auto min-h-[150px]">
                    {getColumnTasks(columns, col.id).map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        selected={selectedTask?.id === task.id}
                        onDragStart={() => handleDragStart(task.id, col.id)}
                        onClick={() => handleCardClick(task)}
                      />
                    ))}

                    {getColumnTasks(columns, col.id).length === 0 && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl m-1">
                        <p className="text-xs text-slate-400 dark:text-slate-600">Drop here</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Task List View</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{listRows.length} tasks</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Task</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Due</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Payout</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Governance</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {listRows.map(({ task, columnId, columnLabel }) => {
                      const typeCfg = TYPE_CONFIG[task.type] || TYPE_CONFIG.post;
                      return (
                        <tr
                          key={task.id}
                          onClick={() => handleCardClick(task)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">{task.campaign} · {task.seller} · {task.brand}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Pill tone={columnTone(columnId)}>{columnLabel}</Pill>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-medium">
                              <span>{typeCfg.icon}</span>
                              <span>{typeCfg.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cx("text-xs text-slate-600 dark:text-slate-300", task.overdue && "text-rose-600 dark:text-rose-300 font-semibold")}>
                              {task.dueLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {task.currency} {Number(task.earnings || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <Pill tone={task.hostRole === "Supplier" ? "warn" : "good"}>
                                {task.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}
                              </Pill>
                              <Pill tone={task.approvalMode === "Manual" ? "warn" : "good"}>Approval: {task.approvalMode}</Pill>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Btn
                              tone="neutral"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(task);
                              }}
                            >
                              Open
                            </Btn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>

      {selectedTask ? (
        <TaskSidePanel
          task={selectedTask}
          currentColumn={taskToColumn.get(selectedTask.id)}
          uploadNote={uploadNote}
          onUploadNoteChange={setUploadNote}
          contentLink={contentLink}
          uploadedFiles={uploadedFiles}
          onFileUpload={handleFileUpload}
          onContentLinkChange={setContentLink}
          comments={comments}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onAddComment={handleAddComment}
          onClose={() => setSelectedTask(null)}
          // Supplier actions
          onApprove={() => approveTask(selectedTask)}
          onRequestChanges={() => requestChanges(selectedTask)}
          onSubmitAsSupplier={() => submitTaskAsSupplier(selectedTask)}
          onMove={(toCol) => moveTask(selectedTask.id, toCol)}
          setToast={setToast}
        />
      ) : null}

      {/* ✅ New Task Drawer */}
      <NewTaskDrawer
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        contracts={CONTRACTS.filter((c) => c.status !== "Terminated")}
        existingTasks={allTasksFlat}
        onCreate={(payload) => addNewTaskToBoard(payload)}
        setToast={setToast}
      />

      <Toast text={toast} onClose={() => setToast(null)} />
    </div>
  );
}

/* ----------------------------- Sorting Helper ----------------------------- */

function getColumnTasks(columns, colId) {
  const tasks = columns[colId] || [];
  return [...tasks].sort((a, b) => {
    if (a.overdue && !b.overdue) return -1;
    if (!a.overdue && b.overdue) return 1;
    return a.dueDaysFromNow - b.dueDaysFromNow;
  });
}

/* ----------------------------- Card ----------------------------- */

function TaskCard({ task, selected, onDragStart, onClick }) {
  const typeCfg = TYPE_CONFIG[task.type] || TYPE_CONFIG.post;
  const aiMinutes = estimateTimeMinutes(task);

  const overdueRing = task.overdue
    ? "border-rose-300 ring-2 ring-rose-300/70 shadow-[0_0_0_2px_rgba(244,63,94,0.15)]"
    : "border-slate-200 dark:border-slate-700";

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cx(
        "border rounded-xl px-2.5 py-2 bg-white dark:bg-slate-900 dark:bg-slate-800 shadow cursor-move flex flex-col gap-1 transition-all",
        selected
          ? "border-[#f77f00] ring-1 ring-[#f77f00] dark:border-[#f77f00] dark:ring-[#f77f00]"
          : overdueRing + " hover:shadow-md"
      )}
      title={task.overdue ? "Overdue" : ""}
    >
      <div className="flex items-start gap-2 mb-1">
        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold dark:font-bold transition-colors mt-0.5">
          {task.sellerInitials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50 leading-snug break-words">{task.title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300 leading-snug break-words mt-0.5">
            {task.campaign} · {task.seller} · {task.brand}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs mt-auto">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-medium transition-colors">
          <span>{typeCfg.icon}</span>
          <span>{typeCfg.label}</span>
        </span>
        <span className={cx("text-slate-500 dark:text-slate-300 whitespace-nowrap", task.overdue && "text-rose-600 dark:text-rose-300 font-semibold")}>
          Due: {task.dueLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs mt-1 border-t border-slate-100 dark:border-slate-800 pt-2">
        <span className="text-slate-500 dark:text-slate-300">
          Est. payout:{" "}
          <span className="font-semibold dark:font-bold text-slate-800 dark:text-slate-50 whitespace-nowrap">
            {task.currency} {task.earnings.toLocaleString()}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-200 font-medium transition-colors whitespace-nowrap">
          <span>⏱</span>
          <span>AI: ~{aiMinutes} min</span>
        </span>
      </div>
    </article>
  );
}

/* ----------------------------- Side Panel ----------------------------- */

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
  onClose,
  onApprove,
  onRequestChanges,
  onSubmitAsSupplier,
  onMove,
  setToast
}) {
  const typeCfg = TYPE_CONFIG[task.type] || TYPE_CONFIG.post;
  const aiMinutes = estimateTimeMinutes(task);

  const fileInputRef = useRef(null);

  const supplierIsHost = task.hostRole === "Supplier" || task.creatorUsage === "I will NOT use a Creator";
  const canReview = !supplierIsHost;

  const showApproveActions = canReview && currentColumn === "submitted";
  const showResubmitActions =
    supplierIsHost && (currentColumn === "todo" || currentColumn === "in-progress" || currentColumn === "needs-changes");

  const governancePills = (
    <div className="flex flex-wrap gap-2 mt-2">
      <Pill tone={supplierIsHost ? "warn" : "good"}>{supplierIsHost ? "Supplier-hosted" : "Creator-hosted"}</Pill>
      <Pill
        tone={
          task.creatorUsage === "I will NOT use a Creator"
            ? "warn"
            : task.creatorUsage === "I will use a Creator"
              ? "good"
              : "neutral"
        }
      >
        {task.creatorUsage}
      </Pill>
      <Pill tone="neutral">Collab: {task.collabMode}</Pill>
      <Pill tone={task.approvalMode === "Manual" ? "warn" : "good"}>Approval: {task.approvalMode}</Pill>
      {task?.meta?.priority ? (
        <Pill
          tone={task.meta.priority === "Critical" ? "bad" : task.meta.priority === "High" ? "warn" : task.meta.priority === "Normal" ? "good" : "neutral"}
        >
          Priority: {task.meta.priority}
        </Pill>
      ) : null}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-colors animate-slide-in-right pt-16 md:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold transition-colors">
              {task.sellerInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{task.title}</span>
                <Pill tone="neutral" title="Current column">
                  {String(currentColumn || "—")}
                </Pill>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {task.campaign} · {task.brand} · Assigned to <span className="font-semibold">{task.seller}</span>
              </div>
              {governancePills}
            </div>
          </div>

          <button
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Action strip (supplier review / submission) */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/70 dark:bg-slate-900/60 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {showApproveActions ? (
              <>
                <Btn tone="brand" onClick={onApprove} title="Approve deliverable">
                  Approve
                </Btn>
                <Btn tone="danger" onClick={onRequestChanges} title="Request changes from creator">
                  Request changes
                </Btn>
                <Btn
                  tone="neutral"
                  onClick={() => {
                    setToast("Queued for Admin review (demo)");
                  }}
                  title="After supplier approval (manual), Admin review follows"
                >
                  Send to Admin
                </Btn>
              </>
            ) : null}

            {showResubmitActions ? (
              <>
                <Btn tone="brand" onClick={onSubmitAsSupplier} title="Submit content as Supplier host">
                  Submit content
                </Btn>
                <Btn tone="neutral" onClick={() => onMove("in-progress")}>Mark in progress</Btn>
              </>
            ) : null}

            {/* Always available */}
            <Btn tone="neutral" onClick={() => setToast("Open campaign (demo)")}>Open campaign</Btn>
            <Btn tone="neutral" onClick={() => setToast("Open contract (demo)")}>Open contract</Btn>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Permission note: In production, restrict transitions by role (Owner/Admin vs Manager vs Viewer) and by stage.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <section>
            <h3 className="text-xs font-semibold dark:font-bold mb-1">Deliverable details</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-200 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 transition-colors">
                <span>{typeCfg.icon}</span>
                <span>{typeCfg.label}</span>
              </span>
              <span>Due: {task.dueLabel}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>
                Est. payout: <span className="font-medium">{task.currency} {task.earnings.toLocaleString()}</span>
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>AI estimate: ~{aiMinutes} min</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {supplierIsHost
                ? "You are hosting this campaign. Upload your content and submit for review."
                : "A creator is producing this deliverable. Review submissions, approve or request changes."}
            </p>
          </section>

          {/* Submission / Upload section */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold dark:font-bold mb-1">Submission & review</h3>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold">Submission status</div>
                <Pill
                  tone={
                    currentColumn === "approved"
                      ? "good"
                      : currentColumn === "needs-changes"
                        ? "bad"
                        : currentColumn === "submitted"
                          ? "warn"
                          : "neutral"
                  }
                >
                  {currentColumn === "approved"
                    ? "Approved"
                    : currentColumn === "needs-changes"
                      ? "Needs changes"
                      : currentColumn === "submitted"
                        ? "Submitted"
                        : "Working"}
                </Pill>
              </div>

              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="font-semibold">Files</div>
                <div className="mt-1 space-y-1">
                  {(task.submission?.files || []).map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1"
                    >
                      <span className="truncate max-w-[220px]">{f.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{f.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Btn tone="neutral" onClick={() => setToast("Open preview player (demo)")}>Preview</Btn>
                <Btn
                  tone="neutral"
                  onClick={() => {
                    try {
                      navigator.clipboard?.writeText(task.submission?.link || "");
                    } catch {}
                    setToast("Submission link copied (demo)");
                  }}
                >
                  Copy link
                </Btn>
              </div>
            </div>

            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg px-2 py-3 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 mb-1 transition-colors">
              <input type="file" multiple className="hidden" ref={fileInputRef} onChange={onFileUpload} />
              <p>
                {supplierIsHost
                  ? "Drag & drop content files here, or click to upload."
                  : "Attach feedback files (optional), or upload replacement assets if you are acting as creator."}
              </p>
              <button
                type="button"
                className="mt-2 px-3 py-1 rounded-full border border-[#f77f00] bg-white dark:bg-slate-900 text-[#f77f00] hover:bg-[#fff5e8] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose files
              </button>
            </div>

            {uploadedFiles.length > 0 ? (
              <div className="flex flex-col gap-1 mb-2">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <span className="text-emerald-500">Attached</span>
                  </div>
                ))}
              </div>
            ) : null}

            <label className="text-xs font-medium text-slate-700 dark:text-slate-100 transition-colors">
              {supplierIsHost ? "Notes for Admin (what’s included)" : "Review notes for Creator (what to fix / what’s approved)"}
            </label>
            <textarea
              rows={2}
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 focus:bg-white dark:bg-slate-900 focus:border-slate-400 outline-none resize-none transition-colors"
              placeholder={supplierIsHost ? "e.g. Final clip with price overlay and CTA." : "e.g. Please tighten hook at 00:03 and add price overlay."}
              value={uploadNote}
              onChange={(e) => onUploadNoteChange(e.target.value)}
            />

            <label className="text-xs font-medium text-slate-700 dark:text-slate-100 mt-1">Content link</label>
            <input
              className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 focus:bg-white dark:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
              placeholder="https://…"
              value={contentLink}
              onChange={(e) => onContentLinkChange(e.target.value)}
            />
          </section>

          {/* Comments */}
          <section className="space-y-1">
            <h3 className="text-xs font-semibold dark:font-bold dark:text-slate-50 mb-1">Comments</h3>
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 max-h-40 overflow-y-auto space-y-1.5 transition-colors">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-300">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="font-semibold">{c.from === "supplier" ? "You" : c.name}</span>
                    <span className="text-slate-400 ml-1">· {c.time}</span>
                    <p className="text-slate-600 dark:text-slate-200 whitespace-pre-line">{c.body}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-1 mt-1">
              <textarea
                rows={2}
                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none resize-none transition-colors"
                placeholder="Add a comment…"
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
              />
              <button
                type="button"
                className="px-2.5 py-1 rounded-full bg-[#f77f00] text-white text-sm font-semibold hover:bg-[#e26f00]"
                onClick={onAddComment}
              >
                Send
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 p-2.5">
            <div className="text-xs font-semibold">Operational edge cases</div>
            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              • Creator rejects proposal / renegotiation: task may be paused and reassigned.<br />
              • Supplier rejects content: move to “Needs changes”.<br />
              • Admin rejects content: task reopens and requires changes before resubmission.<br />
              • Multiple creators per campaign: filter & assignment should be supported at board level.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- New Task Drawer ----------------------------- */

function NewTaskDrawer({ open, onClose, contracts, existingTasks, onCreate, setToast }) {
  const fileRef = useRef(null);

  // Wizard steps
  const [step, setStep] = useState(1); // 1 Details, 2 Assignment, 3 Timing, 4 Review

  // Scope
  const [scope, setScope] = useState("Linked"); // Linked | Internal
  const [contractId, setContractId] = useState(contracts?.[0]?.id || "");

  // Task core
  const [title, setTitle] = useState("");
  const [type, setType] = useState("vod");
  const [initialColumn, setInitialColumn] = useState("todo");
  const [priority, setPriority] = useState("Normal");

  // Campaign / parties (filled from contract if linked)
  const selectedContract = useMemo(() => {
    return (contracts || []).find((c) => c.id === contractId) || null;
  }, [contracts, contractId]);

  const [campaignOverride, setCampaignOverride] = useState("");
  const [brandOverride, setBrandOverride] = useState("");
  const [currency, setCurrency] = useState(selectedContract?.currency || "UGX");
  const [payout, setPayout] = useState("");

  // Governance (defaults from contract if linked)
  const [hostRole, setHostRole] = useState(selectedContract?.governance?.hostRole || "Creator");
  const [creatorUsage, setCreatorUsage] = useState(selectedContract?.governance?.creatorUsage || "I will use a Creator");
  const [collabMode, setCollabMode] = useState(selectedContract?.governance?.collabMode || "Open for Collabs");
  const [approvalMode, setApprovalMode] = useState(selectedContract?.governance?.approvalMode || "Manual");
  const [requireAdminReview, setRequireAdminReview] = useState(true);

  // Assignment
  const defaultAssignee = selectedContract?.creator?.handle || "@creator";
  const [assignee, setAssignee] = useState(defaultAssignee);
  const [watchers, setWatchers] = useState([]); // string[]
  const [watcherDraft, setWatcherDraft] = useState("");

  // Timing
  const defaultDue = useMemo(() => toYMD(addDays(new Date(), 3)), []);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [dueTime, setDueTime] = useState("18:00");
  const [reminder, setReminder] = useState("6h");

  // Work plan
  const [description, setDescription] = useState("");
  const [checklist, setChecklist] = useState([
    { id: "cl-1", text: "Confirm product/service details", done: false },
    { id: "cl-2", text: "Align on CTA + offer terms", done: false }
  ]);
  const [checkDraft, setCheckDraft] = useState("");

  // Dependencies
  const [dependencyIds, setDependencyIds] = useState([]);

  // Attachments + links
  const [contentLink, setContentLink] = useState("");
  const [refLinks, setRefLinks] = useState([]);
  const [refDraft, setRefDraft] = useState("");
  const [files, setFiles] = useState([]);

  // Reset on open
  useEffect(() => {
    if (!open) return;

    setStep(1);
    setScope("Linked");

    const firstId = contracts?.[0]?.id || "";
    setContractId(firstId);

    setTitle("");
    setType("vod");
    setInitialColumn("todo");
    setPriority("Normal");

    setCampaignOverride("");
    setBrandOverride("");

    const sc = (contracts || []).find((c) => c.id === firstId) || null;
    setCurrency(sc?.currency || "UGX");
    setPayout("");

    setHostRole(sc?.governance?.hostRole || "Creator");
    setCreatorUsage(sc?.governance?.creatorUsage || "I will use a Creator");
    setCollabMode(sc?.governance?.collabMode || "Open for Collabs");
    setApprovalMode(sc?.governance?.approvalMode || "Manual");
    setRequireAdminReview(true);

    setAssignee(sc?.creator?.handle || "@creator");
    setWatchers([]);
    setWatcherDraft("");

    setDueDate(toYMD(addDays(new Date(), 3)));
    setDueTime("18:00");
    setReminder("6h");

    setDescription("");
    setChecklist([
      { id: "cl-1", text: "Confirm product/service details", done: false },
      { id: "cl-2", text: "Align on CTA + offer terms", done: false }
    ]);
    setCheckDraft("");

    setDependencyIds([]);

    setContentLink("");
    setRefLinks([]);
    setRefDraft("");
    setFiles([]);
  }, [open, contracts]);

  // When contract changes, update defaults (but keep user's manual overrides where possible)
  useEffect(() => {
    if (!selectedContract) return;
    setCurrency(selectedContract.currency || "UGX");
    setHostRole(selectedContract?.governance?.hostRole || "Creator");
    setCreatorUsage(selectedContract?.governance?.creatorUsage || "I will use a Creator");
    setCollabMode(selectedContract?.governance?.collabMode || "Open for Collabs");
    setApprovalMode(selectedContract?.governance?.approvalMode || "Manual");
    setAssignee(selectedContract?.creator?.handle || "@creator");
  }, [selectedContract?.id]);

  const computedDays = useMemo(() => {
    if (initialColumn === "submitted") return 0;
    if (initialColumn === "approved") return 0;
    if (initialColumn === "needs-changes") return 0;
    return daysFromNowForYMD(dueDate);
  }, [dueDate, initialColumn]);

  const computedDueLabel = useMemo(() => {
    if (initialColumn === "submitted") return "Submitted";
    if (initialColumn === "approved") return "Approved";
    if (initialColumn === "needs-changes") return "Changes requested";
    return dueLabelFromDays(computedDays);
  }, [computedDays, initialColumn]);

  const supplierIsHost = hostRole === "Supplier" || creatorUsage === "I will NOT use a Creator";

  const canGoNext = useMemo(() => {
    if (step === 1) {
      if (!String(title || "").trim()) return false;
      if (scope === "Linked" && !contractId) return false;
      return true;
    }
    if (step === 2) {
      if (!String(assignee || "").trim()) return false;
      return true;
    }
    if (step === 3) {
      if (!dueDate && initialColumn !== "submitted" && initialColumn !== "approved" && initialColumn !== "needs-changes") return false;
      return true;
    }
    return true;
  }, [step, title, scope, contractId, assignee, dueDate, initialColumn]);

  const stepLabel = (n) => {
    if (n === 1) return "Details";
    if (n === 2) return "Assignment";
    if (n === 3) return "Timing";
    return "Review";
  };

  const createTask = ({ openAfter }) => {
    const t = String(title || "").trim();
    if (!t) {
      setToast?.("Task title is required");
      return;
    }

    if (scope === "Linked" && !contractId) {
      setToast?.("Select a contract/campaign");
      return;
    }

    const contract = selectedContract;

    const campaign = scope === "Linked" ? contract?.campaign || "(campaign)" : campaignOverride || "(internal)";
    const brand = scope === "Linked" ? contract?.brand || "(brand)" : brandOverride || "(team)";
    const cur = scope === "Linked" ? contract?.currency || currency : currency;

    const basePayout = scope === "Linked" && contract?.totalTasks ? Math.round((contract.value || 0) / (contract.totalTasks || 1)) : 0;
    const payoutNum = payout === "" ? basePayout : Math.max(0, Number(payout) || 0);

    const dueDays =
      initialColumn === "submitted" || initialColumn === "approved" || initialColumn === "needs-changes"
        ? 0
        : daysFromNowForYMD(dueDate);

    const overdue = initialColumn === "approved" ? false : initialColumn === "submitted" ? false : initialColumn === "needs-changes" ? false : dueDays < 0;

    const sellerHandle = String(assignee || "").trim().startsWith("@") ? String(assignee || "").trim() : `@${String(assignee || "").trim()}`;

    const task = {
      id: randomId("NT"),
      title: t,
      campaign,
      brand,
      brandInitials: brandInitials(brand),
      seller: sellerHandle,
      sellerInitials: initialsFromHandle(sellerHandle),
      type,
      dueLabel: computedDueLabel,
      dueDaysFromNow: dueDays,
      earnings: payoutNum,
      currency: cur,
      overdue,

      hostRole,
      creatorUsage,
      collabMode,
      approvalMode,

      submission: {
        status:
          initialColumn === "approved"
            ? "Approved"
            : initialColumn === "submitted"
              ? "Submitted"
              : initialColumn === "needs-changes"
                ? "Needs changes"
                : "In progress",
        link: contentLink || "",
        files: (files || []).slice(0, 6).map((f) => ({ name: f.name, size: `${Math.max(1, Math.round((f.size || 0) / (1024 * 1024)))}MB` }))
      },

      meta: {
        scope,
        contractId: scope === "Linked" ? contractId : null,
        dueDate,
        dueTime,
        reminder,
        priority,
        description,
        checklist,
        dependencies: dependencyIds,
        watchers,
        refLinks,
        requireAdminReview,
        // RBAC note: Only authorized roles should set these:
        // - approvalMode
        // - requireAdminReview
        // - hostRole/creatorUsage
        createdAt: Date.now()
      }
    };

    // Supplier logic notes (workflow):
    // - If Supplier is host: Supplier creates & submits content; approvals route to Admin (manual) or direct.
    // - If Creator is host: Creator produces; Supplier reviews (manual) or auto to Admin.

    onCreate?.({ task, initialColumn, openAfter });
  };

  const headerBadge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} />
      <span>New Task</span>
    </span>
  );

  return (
    <div className={cx("fixed inset-0 z-[75]", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        className={cx("absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />

      <div
        className={cx(
          "absolute top-0 right-0 h-full w-full sm:w-[560px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Create task</div>
                {headerBadge}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add a deliverable task for a creator, or create an internal task for your crew.
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {[1, 2, 3, 4].map((n) => {
                  const active = step === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      className={cx(
                        "px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors",
                        active
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                      )}
                      onClick={() => setStep(n)}
                    >
                      {n}. {stepLabel(n)}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Step 1: Details */}
            {step === 1 ? (
              <>
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Scope</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { k: "Linked", label: "Linked to Contract/Campaign", desc: "Best for creator deliverables and contract-governed tasks." },
                      { k: "Internal", label: "Internal (Crew)", desc: "Ops tasks: inventory, QA, media prep, scheduling." }
                    ].map((x) => (
                      <button
                        key={x.k}
                        type="button"
                        className={cx(
                          "flex-1 min-w-[220px] text-left rounded-2xl border p-3 transition",
                          scope === x.k
                            ? "border-[#f77f00] bg-orange-50/50 dark:bg-orange-900/10"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                        )}
                        onClick={() => setScope(x.k)}
                      >
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{x.label}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{x.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                {scope === "Linked" ? (
                  <section className="space-y-2">
                    <FieldLabel hint="Choose the campaign contract">Contract / Campaign *</FieldLabel>
                    <Select value={contractId} onChange={setContractId}>
                      {(contracts || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id} · {c.campaign} · {c.brand}
                        </option>
                      ))}
                    </Select>

                    {selectedContract ? (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">{selectedContract.campaign}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Brand: <span className="font-semibold">{selectedContract.brand}</span> · Creator: <span className="font-semibold">{selectedContract.creator?.handle}</span>
                            </div>
                          </div>
                          <Pill tone={selectedContract.governance?.hostRole === "Supplier" ? "warn" : "good"}>
                            {selectedContract.governance?.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}
                          </Pill>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Pill tone="neutral">Collab: {selectedContract.governance?.collabMode}</Pill>
                          <Pill tone={String(selectedContract.governance?.approvalMode) === "Manual" ? "warn" : "good"}>
                            Approval: {selectedContract.governance?.approvalMode}
                          </Pill>
                          <Pill tone="neutral">Currency: {selectedContract.currency}</Pill>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          Permission note: changing host/approval settings should be restricted to Supplier Owner/Admin in production.
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : (
                  <section className="space-y-2">
                    <FieldLabel hint="Used on cards">Campaign / Workspace</FieldLabel>
                    <Input value={campaignOverride} onChange={setCampaignOverride} placeholder="e.g. EV Accessories Promo Ops" />
                    <FieldLabel hint="Brand or team">Brand / Department</FieldLabel>
                    <Input value={brandOverride} onChange={setBrandOverride} placeholder="e.g. EV World Ops" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <FieldLabel>Currency</FieldLabel>
                        <Select value={currency} onChange={setCurrency}>
                          <option value="UGX">UGX</option>
                          <option value="USD">USD</option>
                          <option value="KES">KES</option>
                          <option value="TZS">TZS</option>
                        </Select>
                      </div>
                      <div>
                        <FieldLabel hint="Optional">Estimated payout</FieldLabel>
                        <Input value={payout} onChange={setPayout} placeholder="0" type="number" min={0} />
                      </div>
                    </div>
                  </section>
                )}

                <Divider label="Task" />

                <section className="space-y-2">
                  <FieldLabel hint="Required">Task title *</FieldLabel>
                  <Input value={title} onChange={setTitle} placeholder="e.g. 30s highlight clip with CTA overlay" />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>Type</FieldLabel>
                      <Select value={type} onChange={setType}>
                        <option value="live">Live</option>
                        <option value="vod">VOD / Clip</option>
                        <option value="story">Story</option>
                        <option value="post">Post</option>
                      </Select>
                    </div>

                    <div>
                      <FieldLabel>Initial column</FieldLabel>
                      <Select value={initialColumn} onChange={setInitialColumn}>
                        {COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <FieldLabel hint="Affects urgency sort">Priority</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY.map((p) => (
                      <button
                        key={p.k}
                        type="button"
                        onClick={() => setPriority(p.k)}
                        className={cx(
                          "px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors",
                          priority === p.k
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                            : p.pill
                        )}
                      >
                        {p.k}
                      </button>
                    ))}
                  </div>

                  <FieldLabel hint="Optional">Description / brief</FieldLabel>
                  <TextArea value={description} onChange={setDescription} placeholder="Short brief: angle, compliance notes, CTA, script hints…" rows={4} />
                </section>
              </>
            ) : null}

            {/* Step 2: Assignment */}
            {step === 2 ? (
              <>
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Assignment</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        For creator-hosted campaigns, assignee is usually the Creator. For supplier-hosted, assignee can be your crew.
                      </div>
                    </div>
                    <Pill tone={supplierIsHost ? "warn" : "good"}>{supplierIsHost ? "Supplier-hosted" : "Creator-hosted"}</Pill>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <FieldLabel hint="@handle or name">Assignee *</FieldLabel>
                    <Input value={assignee} onChange={setAssignee} placeholder={supplierIsHost ? "@your_team_member" : "@creator"} />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <FieldLabel>Host role</FieldLabel>
                        <Select value={hostRole} onChange={setHostRole}>
                          <option value="Creator">Creator</option>
                          <option value="Supplier">Supplier</option>
                        </Select>
                      </div>
                      <div>
                        <FieldLabel>Creator usage</FieldLabel>
                        <Select value={creatorUsage} onChange={setCreatorUsage}>
                          <option value="I will use a Creator">I will use a Creator</option>
                          <option value="I will NOT use a Creator">I will NOT use a Creator</option>
                          <option value="I am NOT SURE yet">I am NOT SURE yet</option>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <FieldLabel>Collab mode</FieldLabel>
                        <Select value={collabMode} onChange={setCollabMode}>
                          <option value="Open for Collabs">Open for Collabs</option>
                          <option value="Invite-Only">Invite-Only</option>
                          <option value="(n/a)">(n/a)</option>
                        </Select>
                      </div>
                      <div>
                        <FieldLabel>Approval mode</FieldLabel>
                        <Select value={approvalMode} onChange={setApprovalMode}>
                          <option value="Manual">Manual</option>
                          <option value="Auto">Auto</option>
                        </Select>
                      </div>
                    </div>

                    <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 mt-1">
                      <input
                        type="checkbox"
                        checked={!!requireAdminReview}
                        onChange={(e) => setRequireAdminReview(e.target.checked)}
                      />
                      <span>
                        Require Admin review after submission/approval (recommended for regulated categories).<br />
                        <span className="text-[11px] text-slate-500">(RBAC) Supplier Owner/Admin should control this in production.</span>
                      </span>
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">
                  <div className="text-xs font-semibold">Watchers</div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Optional: team members who should be notified on changes (comments, submission, approval, overdue).
                  </div>

                  <div className="mt-2 flex gap-2">
                    <Input value={watcherDraft} onChange={setWatcherDraft} placeholder="Add watcher (e.g. @adz_manager)" />
                    <Btn
                      tone="brand"
                      onClick={() => {
                        const v = String(watcherDraft || "").trim();
                        if (!v) return;
                        const safe = v.startsWith("@") ? v : `@${v}`;
                        setWatchers((prev) => (prev.includes(safe) ? prev : [...prev, safe]));
                        setWatcherDraft("");
                      }}
                    >
                      Add
                    </Btn>
                  </div>

                  {watchers.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {watchers.map((w) => (
                        <Pill key={w} tone="neutral" className="pr-1">
                          <span>{w}</span>
                          <button
                            type="button"
                            className="ml-1 h-5 w-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                            onClick={() => setWatchers((prev) => prev.filter((x) => x !== w))}
                            aria-label="Remove watcher"
                          >
                            ✕
                          </button>
                        </Pill>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-slate-500">No watchers added.</div>
                  )}
                </section>
              </>
            ) : null}

            {/* Step 3: Timing */}
            {step === 3 ? (
              <>
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Timing</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due date influences urgency sort. Overdue items glow red on cards.</div>
                    </div>
                    <Pill tone={computedDays < 0 ? "bad" : computedDays <= 1 ? "warn" : "good"}>{computedDueLabel}</Pill>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel hint="Recommended">Due date</FieldLabel>
                      <Input value={dueDate} onChange={setDueDate} type="date" disabled={initialColumn === "submitted" || initialColumn === "approved" || initialColumn === "needs-changes"} />
                      {(initialColumn === "submitted" || initialColumn === "approved" || initialColumn === "needs-changes") ? (
                        <div className="mt-1 text-[11px] text-slate-500">Due date disabled for non-working columns.</div>
                      ) : null}
                    </div>
                    <div>
                      <FieldLabel hint="Optional">Due time</FieldLabel>
                      <Input value={dueTime} onChange={setDueTime} type="time" disabled={initialColumn === "submitted" || initialColumn === "approved" || initialColumn === "needs-changes"} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <FieldLabel>Reminder</FieldLabel>
                    <Select value={reminder} onChange={setReminder}>
                      <option value="none">None</option>
                      <option value="24h">24 hours before</option>
                      <option value="6h">6 hours before</option>
                      <option value="1h">1 hour before</option>
                      <option value="15m">15 minutes before</option>
                    </Select>
                    <div className="mt-1 text-[11px] text-slate-500">
                      In production, reminders can send WhatsApp, email, or in-app notifications based on user preference.
                    </div>
                  </div>

                  <Divider label="Checklist" />

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">
                    <div className="text-xs font-semibold">Checklist</div>
                    <div className="mt-2 space-y-2">
                      {checklist.map((c) => (
                        <label key={c.id} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={!!c.done}
                            onChange={(e) => {
                              setChecklist((prev) => prev.map((x) => (x.id === c.id ? { ...x, done: e.target.checked } : x)));
                            }}
                          />
                          <span className={cx("leading-snug", c.done && "line-through text-slate-400")}>{c.text}</span>
                          <button
                            type="button"
                            className="ml-auto text-[11px] text-slate-500 hover:text-rose-600"
                            onClick={() => setChecklist((prev) => prev.filter((x) => x.id !== c.id))}
                          >
                            Remove
                          </button>
                        </label>
                      ))}

                      <div className="flex gap-2">
                        <Input value={checkDraft} onChange={setCheckDraft} placeholder="Add checklist item" />
                        <Btn
                          tone="brand"
                          onClick={() => {
                            const v = String(checkDraft || "").trim();
                            if (!v) return;
                            setChecklist((prev) => [...prev, { id: randomId("CL"), text: v, done: false }]);
                            setCheckDraft("");
                          }}
                        >
                          Add
                        </Btn>
                      </div>
                    </div>
                  </div>

                  <Divider label="Dependencies" />

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                    <div className="text-xs font-semibold">Depends on</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Optional: block execution until these tasks are completed.
                    </div>

                    <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      {(existingTasks || []).slice(0, 40).map((t) => {
                        const checked = dependencyIds.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className="flex items-start gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800/40 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setDependencyIds((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]));
                              }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{t.title}</div>
                              <div className="text-[11px] text-slate-500 truncate">{t.campaign} · {t.seller}</div>
                            </div>
                          </label>
                        );
                      })}
                      {(existingTasks || []).length === 0 ? (
                        <div className="px-3 py-6 text-center text-xs text-slate-500">No tasks available for dependencies.</div>
                      ) : null}
                    </div>

                    {dependencyIds.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {dependencyIds.slice(0, 6).map((id) => (
                          <Pill key={id} tone="neutral">Dep: {id}</Pill>
                        ))}
                        {dependencyIds.length > 6 ? <Pill tone="neutral">+{dependencyIds.length - 6} more</Pill> : null}
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-slate-500">No dependencies selected.</div>
                    )}
                  </div>
                </section>
              </>
            ) : null}

            {/* Step 4: Review */}
            {step === 4 ? (
              <>
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">{title || "(untitled task)"}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {scope === "Linked" ? `${selectedContract?.campaign || "(campaign)"} · ${selectedContract?.brand || "(brand)"}` : `${campaignOverride || "(internal)"} · ${brandOverride || "(team)"}`}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Pill tone="neutral">Type: {(TYPE_CONFIG[type] || TYPE_CONFIG.post).label}</Pill>
                        <Pill tone={priority === "Critical" ? "bad" : priority === "High" ? "warn" : priority === "Normal" ? "good" : "neutral"}>Priority: {priority}</Pill>
                        <Pill tone="neutral">Column: {COLUMNS.find((c) => c.id === initialColumn)?.label}</Pill>
                        <Pill tone={computedDays < 0 ? "bad" : computedDays <= 1 ? "warn" : "good"}>Due: {computedDueLabel}</Pill>
                      </div>
                    </div>
                  </div>

                  <Divider label="Governance" />

                  <div className="flex flex-wrap gap-2">
                    <Pill tone={supplierIsHost ? "warn" : "good"}>{supplierIsHost ? "Supplier-hosted" : "Creator-hosted"}</Pill>
                    <Pill tone="neutral">{creatorUsage}</Pill>
                    <Pill tone="neutral">Collab: {collabMode}</Pill>
                    <Pill tone={approvalMode === "Manual" ? "warn" : "good"}>Approval: {approvalMode}</Pill>
                    <Pill tone={requireAdminReview ? "warn" : "neutral"}>{requireAdminReview ? "Admin review required" : "Admin review optional"}</Pill>
                  </div>

                  <Divider label="Assignment" />

                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      Assignee: <span className="font-semibold text-slate-900 dark:text-slate-100">{assignee}</span>
                    </div>
                    <div>
                      Watchers: <span className="font-semibold">{watchers.length ? watchers.join(", ") : "None"}</span>
                    </div>
                    <div>
                      Reminder: <span className="font-semibold">{reminder}</span>
                    </div>
                  </div>

                  <Divider label="Work plan" />

                  <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{description || "(no description)"}</div>

                  <div className="mt-2">
                    <div className="text-xs font-semibold">Checklist</div>
                    <ul className="mt-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-0.5">
                      {checklist.length ? checklist.map((c) => (
                        <li key={c.id} className={cx(c.done && "line-through text-slate-400")}>{c.text}</li>
                      )) : <li className="text-slate-400">No checklist</li>}
                    </ul>
                  </div>

                  <Divider label="Links & files" />

                  <div className="space-y-2">
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Content link: <span className="font-semibold">{contentLink || "(none)"}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Reference links: <span className="font-semibold">{refLinks.length ? refLinks.length : 0}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Attachments: <span className="font-semibold">{files.length}</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                    <div className="text-xs font-semibold text-amber-900 dark:text-amber-300">Workflow note</div>
                    <div className="mt-1 text-[11px] text-amber-900/80 dark:text-amber-300/80">
                      {supplierIsHost
                        ? "Supplier-hosted: you’ll submit content; Admin review follows if required."
                        : approvalMode === "Manual"
                          ? "Creator-hosted (Manual): creator submits → supplier review → admin review (if required)."
                          : "Creator-hosted (Auto): creator submits → admin review directly (supplier monitors)."}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">
                  <div className="text-xs font-semibold">Attachments & link pack</div>
                  <div className="mt-2 space-y-2">
                    <FieldLabel hint="Optional">Content link</FieldLabel>
                    <Input value={contentLink} onChange={setContentLink} placeholder="https://drive/… or https://youtube/…" />

                    <FieldLabel hint="Optional">Add reference link</FieldLabel>
                    <div className="flex gap-2">
                      <Input value={refDraft} onChange={setRefDraft} placeholder="https://…" />
                      <Btn
                        tone="brand"
                        onClick={() => {
                          const v = String(refDraft || "").trim();
                          if (!v) return;
                          setRefLinks((prev) => [...prev, v]);
                          setRefDraft("");
                        }}
                      >
                        Add
                      </Btn>
                    </div>

                    {refLinks.length ? (
                      <div className="space-y-1">
                        {refLinks.slice(0, 5).map((l, idx) => (
                          <div key={`${l}_${idx}`} className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1">
                            <span className="truncate max-w-[360px]">{l}</span>
                            <button
                              type="button"
                              className="text-slate-500 hover:text-rose-600"
                              onClick={() => setRefLinks((prev) => prev.filter((x) => x !== l))}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        {refLinks.length > 5 ? <div className="text-[11px] text-slate-500">+{refLinks.length - 5} more</div> : null}
                      </div>
                    ) : null}

                    <Divider label="Files" />

                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const arr = Array.from(e.target.files || []);
                        if (!arr.length) return;
                        setFiles((prev) => [...prev, ...arr]);
                      }}
                    />

                    <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900">
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Attach files for briefs, scripts, product images, overlays, or compliance references.
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Btn tone="brand" onClick={() => fileRef.current?.click()}>Choose files</Btn>
                        {files.length ? (
                          <Btn
                            tone="danger"
                            onClick={() => {
                              setFiles([]);
                              setToast?.("Attachments cleared");
                            }}
                          >
                            Clear
                          </Btn>
                        ) : null}
                      </div>

                      {files.length ? (
                        <div className="mt-2 space-y-1">
                          {files.slice(0, 6).map((f) => (
                            <div key={f.name} className="flex items-center justify-between text-[11px] border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 bg-gray-50 dark:bg-slate-950/40">
                              <span className="truncate max-w-[360px]">{f.name}</span>
                              <span className="text-slate-500">{Math.max(1, Math.round((f.size || 0) / (1024 * 1024)))}MB</span>
                            </div>
                          ))}
                          {files.length > 6 ? <div className="text-[11px] text-slate-500">+{files.length - 6} more</div> : null}
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500">No files attached.</div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Step {step}/4 · {scope === "Linked" ? (selectedContract ? `${selectedContract.id} · ${selectedContract.campaign}` : "Select contract") : "Internal"}
              </div>

              <div className="flex items-center gap-2">
                <Btn
                  tone="neutral"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 1}
                >
                  ← Back
                </Btn>

                {step < 4 ? (
                  <Btn tone="brand" onClick={() => canGoNext && setStep((s) => Math.min(4, s + 1))} disabled={!canGoNext}>
                    Next →
                  </Btn>
                ) : (
                  <>
                    <Btn tone="neutral" onClick={() => createTask({ openAfter: false })}>
                      Create
                    </Btn>
                    <Btn tone="brand" onClick={() => createTask({ openAfter: true })}>
                      Create & open
                    </Btn>
                  </>
                )}
              </div>
            </div>

            {step < 4 && !canGoNext ? (
              <div className="mt-2 text-[11px] text-rose-600">Please fill required fields (*) to continue.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// These do NOT run by default. To run them in a dev console, set: window.__MLDZ_TESTS__ = true and reload.
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`TaskBoard test failed: ${msg}`);
  };

  // cx should join only truthy
  assert(cx("a", false && "b", "c") === "a c", "cx joins truthy values");

  // Sort helper: overdue comes first
  const sampleCols = {
    todo: [
      { id: "1", overdue: false, dueDaysFromNow: 2 },
      { id: "2", overdue: true, dueDaysFromNow: -1 },
      { id: "3", overdue: false, dueDaysFromNow: 0 }
    ]
  };
  const sorted = getColumnTasks(sampleCols, "todo");
  assert(sorted[0].id === "2", "overdue sorts first");
  assert(sorted[1].id === "3" && sorted[2].id === "1", "then by dueDaysFromNow");

  // estimator returns numbers
  assert(typeof estimateTimeMinutes({ type: "live" }) === "number", "estimateTimeMinutes returns number");

  // due calculation range sanity
  const d = getDeterministicDue(9);
  assert(d.days >= -2 && d.days <= 7, "getDeterministicDue is within range");

  // due label helper
  assert(dueLabelFromDays(0) === "Today", "dueLabelFromDays Today");
  assert(dueLabelFromDays(1) === "Tomorrow", "dueLabelFromDays Tomorrow");
  assert(dueLabelFromDays(-1) === "Overdue", "dueLabelFromDays Overdue");

  console.log("✅ SupplierTaskBoardPage self-tests passed");
}
