// Round 2 – Page 4: Creator Dashboard "My Day"
// Operational cockpit for creators – Daily Work Hub
// EVzone colours: Orange #f77f00, Green #03cd8c, Light Grey #f2f2f2

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import type { PageId } from "../../layouts/CreatorShellLayout";
import { backendApi } from "../../lib/api";

type Toast = { message: string } | null;

type Task = {
  id: number;
  title: string;
  deal: string;
  due: string;
  status: "open" | "done";
  type: string;
  campaign: string;
};



type TopKpiCardProps = {
  label: string;
  value: string | number;
  sub: string;
  accent?: boolean;
  onClick?: () => void;
};

type SmartDayPlanProps = {
  expanded: boolean;
  onToggle: () => void;
  tasksDueToday: number;
  tasksCompletedToday: number;
};

type CrewRowProps = {
  role: string;
  name: string;
  status: string;
};

type LegendDotProps = {
  className: string;
  label: string;
};

type BurndownData = {
  label: string;
  livesRemaining: number;
  tasksRemaining: number;
  deliverablesRemaining: number;
  remainingTotal: number;
  total: number;
};

type BurnDownChartProps = {
  burndown: BurndownData[];
};

type TaskMiniBoardProps = {
  tasks: Task[];
  filteredNextTasks: Task[];
  filter: string;
  onFilterChange: (filter: string) => void;
  onToggleTask: (id: number) => void;
  onSnoozeTask: (id: number) => void;
  tasksDueToday: number;
  tasksCompletedToday: number;
  onChangePage?: (page: PageId) => void;
};

type Earnings = {
  today: number;
  todayFlat: number;
  todayCommission: number;
  todaySpark: number[];
  last7: number;
  last7Avg: number;
  last7Spark: number[];
  mtd: number;
  mtdGoal: number;
  mtdSpark: number[];
};

type EarningsGlanceProps = {
  earnings: Earnings;
  mtdProgress: number;
  onChangePage?: (page: PageId) => void;
};

type EarningsCardProps = {
  label: string;
  value: string;
  data: number[];
  extra?: string;
};

type TimelineSlot = {
  time: string;
  label: string;
  type: "light" | "medium" | "live";
};

type TimelineBlockProps = {
  slot: TimelineSlot;
};

type Proposal = {
  id: string | number;
  brand: string;
  campaign?: string;
  title?: string;
  budget?: string;
  status?: string;
  value?: string;
};

type ProposalsPanelProps = {
  proposals: Proposal[];
  onClose: () => void;
  onChangePage?: (page: PageId) => void;
};

const fallbackTasks: Task[] = [
  {
    id: 1,
    title: "Upload Beauty Flash teaser clip",
    deal: "GlowUp Hub · Beauty Flash",
    due: "Today · 16:00",
    status: "open",
    type: "post",
    campaign: "Beauty Flash"
  },
  {
    id: 2,
    title: "Draft script for Tech Friday intro",
    deal: "GadgetMart · Tech Friday",
    due: "Today · 18:00",
    status: "open",
    type: "prep",
    campaign: "Tech Friday"
  },
  {
    id: 3,
    title: "Confirm product list with Grace Living",
    deal: "Faith & Wellness Morning Dealz",
    due: "Tomorrow · 10:00",
    status: "open",
    type: "admin",
    campaign: "Faith & Wellness"
  },
  {
    id: 4,
    title: "Review 2 new proposals",
    deal: "Multiple brands",
    due: "Tomorrow · 14:00",
    status: "open",
    type: "proposal",
    campaign: "Multi"
  },
  {
    id: 5,
    title: "Send performance report to GlowUp",
    deal: "Beauty Flash recap",
    due: "In 2 days",
    status: "open",
    type: "report",
    campaign: "Beauty Flash"
  }
];

const fallbackProposals: Proposal[] = [
  {
    id: "P-101",
    brand: "GlowUp Hub",
    title: "Autumn Beauty Flash",
    budget: "$400 + 5% commission",
    status: "New"
  },
  {
    id: "P-102",
    brand: "GadgetMart",
    title: "Tech Friday Q4 series",
    budget: "$1,200 flat",
    status: "Awaiting reply"
  }
];

const fallbackEarnings: Earnings = {
  today: 120,
  todayFlat: 80,
  todayCommission: 40,
  last7: 890,
  last7Avg: 890 / 7,
  mtd: 2430,
  mtdGoal: 3000,
  todaySpark: [2, 5, 3, 4, 6, 4, 7],
  last7Spark: [3, 4, 5, 6, 5, 7, 8],
  mtdSpark: [2, 3, 5, 7, 6, 8, 9]
};

const mapDashboardTask = (entry: any, index: number): Task => {
  const dueAt = entry?.dueAt ? new Date(entry.dueAt) : null;
  const dueLabel = entry?.dueLabel || (dueAt ? dueAt.toLocaleString() : "Upcoming");
  const title = entry?.title || `Task ${index + 1}`;
  const campaign = entry?.campaign || "Campaign";
  const supplier = entry?.supplier || "Supplier";
  const status = String(entry?.column || "").toLowerCase().includes("approved") ? "done" : "open";

  return {
    id: index + 1,
    title,
    deal: `${supplier} · ${campaign}`,
    due: dueLabel,
    status,
    type: entry?.type || "task",
    campaign
  };
};

const mapProposal = (entry: any, index: number): Proposal => ({
  id: entry?.id || `P-${index + 1}`,
  brand: entry?.brand || "Supplier",
  title: entry?.campaign || "Campaign proposal",
  budget:
    typeof entry?.baseFeeMin === "number" && typeof entry?.baseFeeMax === "number"
      ? `$${entry.baseFeeMin} - $${entry.baseFeeMax}`
      : undefined,
  status: entry?.status ? String(entry.status).replace(/_/g, " ") : "Open"
});

export function CreatorMyDayDashboardPage() {
  const navigate = useNavigate();
  const onChangePage = (page: PageId) => {
    navigate("/" + page);
  };
  // const { theme } = useTheme(); // Reserved for future use
  const [viewMode, setViewMode] = useState("today"); // today | launch | collab
  const [smartPlanExpanded, setSmartPlanExpanded] = useState(true);
  const [isLiveRunning] = useState(true);
  const [liveViewers] = useState(842);
  const [hasRecentLive] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>(fallbackTasks);
  const [proposals, setProposals] = useState<Proposal[]>(fallbackProposals);
  const [earnings, setEarnings] = useState<Earnings>(fallbackEarnings);

  const [taskFilter, setTaskFilter] = useState("all"); // all | today | proposals | beauty
  const [proposalsPanelOpen, setProposalsPanelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setBackendError(null);
      try {
        const [myDay, proposalsRows, summary] = await Promise.all([
          backendApi.getDashboardMyDay(),
          backendApi.getProposals(),
          backendApi.getEarningsSummary()
        ]);

        if (cancelled) return;

        const mappedTasks = (Array.isArray(myDay?.tasks) ? myDay.tasks : []).map(mapDashboardTask);
        if (mappedTasks.length > 0) {
          setTasks(mappedTasks);
        }

        const mappedProposals = (Array.isArray(proposalsRows) ? proposalsRows : []).map(mapProposal);
        if (mappedProposals.length > 0) {
          setProposals(mappedProposals);
        }

        const lifetime = Number(summary?.lifetime || fallbackEarnings.mtd);
        const pending = Number(summary?.pending || fallbackEarnings.todayCommission);
        const available = Number(summary?.available || fallbackEarnings.todayFlat);
        setEarnings((prev) => ({
          ...prev,
          today: available + pending,
          todayFlat: available,
          todayCommission: pending,
          last7: lifetime,
          last7Avg: Math.max(1, lifetime / 7),
          mtd: lifetime
        }));
      } catch (error) {
        if (!cancelled) {
          setBackendError(error instanceof Error ? error.message : "Failed to load My Day data from backend");
        }
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const openTasks = tasks.filter((t) => t.status === "open");
  const nextTasksAll = openTasks.slice(0, 5);

  const filteredNextTasks = nextTasksAll.filter((t) => {
    if (taskFilter === "today") return t.due.startsWith("Today");
    if (taskFilter === "proposals") return t.type === "proposal";
    if (taskFilter === "beauty") return t.campaign === "Beauty Flash";
    return true;
  });

  // Mock dynamic stats based on View Mode
  const getStats = () => {
    switch (viewMode) {
      case "launch":
        return { lives: 3, tasks: 12, proposals: 5, approvals: 2 };
      case "collab":
        return { lives: 0, tasks: 8, proposals: 8, approvals: 4 };
      default: // today
        return { lives: 1, tasks: openTasks.length, proposals: proposals.length, approvals: 1 };
    }
  };
  const currentStats = getStats();

  const mtdProgress = Math.min(earnings.mtd / earnings.mtdGoal, 1);

  // Build dynamic burndown from tasks + live state
  const burndown = buildBurndown(tasks, isLiveRunning);

  const timelineSlots: TimelineSlot[] = [
    { time: "09:00", label: "Inbox & messages", type: "light" },
    { time: "11:00", label: "Script writing", type: "medium" },
    { time: "14:00", label: "Assets prep", type: "medium" },
    { time: "18:30", label: "Beauty Flash live (GlowUp Hub)", type: "live" },
    { time: "21:00", label: "Clip uploads & tagging", type: "light" }
  ];

  const tasksDueToday = tasks.filter((t) => t.due.startsWith("Today")).length;
  const tasksCompletedToday = tasks.filter(
    (t) => t.status === "done" && t.due.startsWith("Today")
  ).length;

  const headerStatusLabel = isLiveRunning
    ? `Live · ${liveViewers.toLocaleString()} viewers`
    : "Online";

  const handleCompleteTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "open" ? "done" : "open" } : t
      )
    );
    // Determine the new status to show correct toast message
    const task = tasks.find((t) => t.id === id);
    const newStatus = task?.status === "open" ? "marked done" : "reopened";
    setToast({ message: `Task ${newStatus} successfully.` });
    setTimeout(() => setToast(null), 2200);
  };

  const handleSnoozeTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, due: "Tomorrow · 09:00" } : t
      )
    );
    setToast({ message: "Task snoozed to tomorrow." });
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="My Day"
        mobileViewType="hide"
        badge={
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${isLiveRunning
                ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700"
                : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
                } transition-colors`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isLiveRunning ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                  }`}
              />
              <span>{headerStatusLabel}</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300">
              Today: {currentStats.lives} live · {currentStats.tasks} tasks
            </span>
          </div>
        }
      />

      {/* Offline banner (simulated) */}
      {isOffline && (
        <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-b border-amber-200 dark:border-amber-700 px-4 md:px-6 py-1.5 text-sm flex items-center justify-between transition-colors">
          <span>
            You’re offline – changes will sync automatically when you reconnect.
          </span>
          <button
            className="text-xs underline"
            onClick={() => setIsOffline(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Recent live summary banner */}
      {hasRecentLive && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors px-4 md:px-6 pt-5 py-4 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <p className="text-sm font-medium">
                Last live: 3.1k peak viewers · 4.8% conversion · $620 sales
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                View full Analytics to see drop-off points and best-performing segments.
              </p>
            </div>
          </div>
          <button
            onClick={() => onChangePage?.("analytics")}
            className="hidden md:inline-flex px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors shadow-sm"
          >
            Open Analytics
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-16 inset-x-0 flex justify-center pointer-events-none z-30">
          <div className="pointer-events-auto bg-slate-900 text-white text-sm px-3 py-1.5 rounded-full shadow-lg">
            {toast.message}
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 space-y-4 overflow-y-auto overflow-x-hidden">
        {backendError ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-xs">
            Backend data fallback: {backendError}
          </section>
        ) : null}
        {/* Focus mode chips */}
        <section className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold dark:font-bold text-slate-700 dark:text-slate-100 font-medium transition-colors">
              Focus mode:
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 px-1 py-0.5 transition-colors">
              {[
                { id: "today", label: "Today" },
                { id: "launch", label: "Launch week" },
                { id: "collab", label: "Heavy collab" }
              ].map((m) => {
                const active = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setViewMode(m.id)}
                    className={`px-2.5 py-0.5 rounded-full text-xs ${active
                      ? "bg-[#f77f00] text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            className="text-xs text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:text-slate-50"
            onClick={() => setIsOffline((v) => !v)}
          >
            {isOffline ? "Simulate online" : "Simulate offline"}
          </button>
        </section>

        {/* Top KPI row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <TopKpiCard
            label="Today's schedule"
            value={`${currentStats.lives} live · ${currentStats.tasks} tasks`}
            sub="View timeline"
            accent={false}
            onClick={() => {
              const timeline = document.getElementById("todays-timeline");
              if (timeline) timeline.scrollIntoView({ behavior: 'smooth' });
            }}
          />
          <TopKpiCard
            label="Open tasks"
            value={`${currentStats.tasks}`}
            sub="Next 5 in focus"
            accent={false}
            onClick={() => {
              const tasks = document.getElementById("task-miniboard");
              if (tasks) tasks.scrollIntoView({ behavior: 'smooth' });
            }}
          />
          <TopKpiCard
            label="New proposals"
            value={currentStats.proposals}
            sub="Needs your reply"
            accent
            onClick={() => setProposalsPanelOpen(true)}
          />
          <TopKpiCard
            label="Pending approvals"
            value={currentStats.approvals}
            sub="From brands / desk"
            accent={false}
            onClick={() => onChangePage?.("contracts")}
          />
        </section>

        {/* Smart day plan + Quick actions + Crew */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)] gap-4 items-start">
          {/* Smart day plan */}
          <SmartDayPlan
            expanded={smartPlanExpanded}
            onToggle={() => setSmartPlanExpanded((p) => !p)}
            tasksDueToday={tasksDueToday}
            tasksCompletedToday={tasksCompletedToday}
          />

          {/* Quick actions + crew */}
          <div className="flex flex-col gap-3">
            <QuickActions onChangePage={onChangePage} />
            <CrewStrip onChangePage={onChangePage} />
          </div>
        </section>

        {/* Timeline + Task mini board + Earnings */}
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)] gap-4 items-start">
          {/* Timeline + burndown */}
          <div id="todays-timeline" className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-3 text-sm">
            {/* Next live strip */}
            <NextLiveStrip onChangePage={onChangePage} />

            <div className="flex items-center justify-between mb-1 mt-1">
              <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Today’s timeline</h3>
              <span className="text-xs text-slate-500 dark:text-slate-300">
                Local time · Africa/Kampala · Focus:{" "}
                <span className="font-medium">
                  {viewMode === "today"
                    ? "Today"
                    : viewMode === "launch"
                      ? "Launch week"
                      : "Collaboration"}
                </span>
              </span>
            </div>
            <div className="overflow-x-auto pb-1">
              <div className="flex items-stretch gap-2 min-w-max">
                {timelineSlots.map((slot) => (
                  <TimelineBlock key={slot.time} slot={slot} />
                ))}
              </div>
            </div>

            {/* Dynamic burn-down chart */}
            <BurnDownChart burndown={burndown} />
          </div>

          {/* Task mini board + earnings */}
          <div id="task-miniboard" className="flex flex-col gap-4">
            <TaskMiniBoard
              tasks={tasks}
              filteredNextTasks={filteredNextTasks}
              filter={taskFilter}
              onFilterChange={setTaskFilter}
              onToggleTask={handleCompleteTask}
              onSnoozeTask={handleSnoozeTask}
              tasksDueToday={tasksDueToday}
              tasksCompletedToday={tasksCompletedToday}
              onChangePage={onChangePage}
            />
            <EarningsGlance earnings={earnings} mtdProgress={mtdProgress} onChangePage={onChangePage} />
          </div>
        </section>
      </main>

      {/* Proposals slide-out panel */}
      {proposalsPanelOpen && (
        <ProposalsPanel
          proposals={proposals}
          onClose={() => setProposalsPanelOpen(false)}
          onChangePage={onChangePage}
        />
      )}
    </div>
  );
}

/* ---------- helpers & mini components ---------- */

function buildBurndown(tasks: Task[], isLiveRunning: boolean): BurndownData[] {
  // Initialise 4 days of data
  const days = [
    {
      label: "Today",
      livesRemaining: isLiveRunning ? 1 : 1,
      livesTotal: 1,
      tasksRemaining: 0,
      tasksTotal: 0,
      deliverablesRemaining: 0,
      deliverablesTotal: 0
    },
    {
      label: "+1",
      livesRemaining: 0,
      livesTotal: 0,
      tasksRemaining: 0,
      tasksTotal: 0,
      deliverablesRemaining: 0,
      deliverablesTotal: 0
    },
    {
      label: "+2",
      livesRemaining: 0,
      livesTotal: 0,
      tasksRemaining: 0,
      tasksTotal: 0,
      deliverablesRemaining: 0,
      deliverablesTotal: 0
    },
    {
      label: "+3",
      livesRemaining: 0,
      livesTotal: 0,
      tasksRemaining: 0,
      tasksTotal: 0,
      deliverablesRemaining: 0,
      deliverablesTotal: 0
    }
  ];

  const findIndexForDue = (due: string) => {
    if (!due) return 3;
    if (due.startsWith("Today")) return 0;
    if (due.startsWith("Tomorrow")) return 1;
    if (due.includes("2 days")) return 2;
    return 3;
  };

  tasks.forEach((t: Task) => {
    const idx = findIndexForDue(t.due);
    const day = days[idx];
    // All tasks count toward totals
    day.tasksTotal += 1;
    if (t.type === "post" || t.type === "report") {
      day.deliverablesTotal += 1;
    }
    // Only open tasks count toward remaining
    if (t.status === "open") {
      day.tasksRemaining += 1;
      if (t.type === "post" || t.type === "report") {
        day.deliverablesRemaining += 1;
      }
    }
  });

  // Compute totals per day
  return days.map((d) => {
    const remainingTotal =
      d.livesRemaining + d.tasksRemaining + d.deliverablesRemaining;
    const total =
      d.livesTotal + d.tasksTotal + d.deliverablesTotal || remainingTotal;
    return { ...d, remainingTotal, total };
  });
}

/* Focus / Smart day / crew / next live */

function TopKpiCard({ label, value, sub, accent, onClick }: TopKpiCardProps) {
  const content = (
    <div
      className={`rounded-2xl px-3 py-2.5 flex flex-col justify-between shadow-sm border ${accent ? "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-700" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 transition-colors"
        }`}
    >
      <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{label}</div>
      <div className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-300">{sub}</div>
    </div>
  );
  if (!onClick) return content;
  return (
    <button className="text-left" onClick={onClick}>
      {content}
    </button>
  );
}

function SmartDayPlan({
  expanded,
  onToggle,
  tasksDueToday,
  tasksCompletedToday
}: SmartDayPlanProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <div>
            <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Smart day plan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              AI-prioritised sequence to maximise today’s impact.
            </p>
          </div>
        </div>
        <button
          className="text-xs text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:text-slate-50"
          onClick={onToggle}
        >
          {expanded ? "Hide" : "Show"}
        </button>
      </div>
      {expanded && (
        <ol className="list-decimal pl-4 space-y-1 text-sm text-slate-700 dark:text-slate-100 font-medium transition-colors">
          <li>
            Finalise assets for
            <span className="font-semibold dark:font-bold"> Beauty Flash live</span>{" "}
            <span className="text-xs text-slate-500 dark:text-slate-300">
              (Skipping may reduce conversion by ~15% based on past lives.)
            </span>
            <div className="text-xs text-slate-500 dark:text-slate-300">
              Suggested duration: 45 min · Impact: ★★★★☆
            </div>
          </li>
          <li>
            Reply to <span className="font-semibold dark:font-bold">2 new proposals</span> in
            Tech & Beauty.{" "}
            <span className="text-xs text-slate-500 dark:text-slate-300">
              (Delaying could push campaigns to other creators.)
            </span>
            <div className="text-xs text-slate-500 dark:text-slate-300">
              Suggested duration: 30 min · Impact: ★★★★☆
            </div>
          </li>
          <li>
            Prepare <span className="font-semibold dark:font-bold">Tech Friday intro script</span>{" "}
            <span className="text-xs text-slate-500 dark:text-slate-300">
              (Stronger hooks usually add +20–30% watch time.)
            </span>
            <div className="text-xs text-slate-500 dark:text-slate-300">
              Suggested duration: 40 min · Impact: ★★★☆☆
            </div>
          </li>
          <li>
            Upload yesterday’s{" "}
            <span className="font-semibold dark:font-bold">Faith & Wellness clips</span> for
            evergreen views.{" "}
            <span className="text-xs text-slate-500 dark:text-slate-300">
              (Undone clips mean you’re missing passive sales.)
            </span>
            <div className="text-xs text-slate-500 dark:text-slate-300">
              Suggested duration: 30 min · Impact: ★★★☆☆
            </div>
          </li>
        </ol>
      )}
      {tasksDueToday > 0 && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
          You have{" "}
          <span className="font-semibold dark:font-bold">
            {Math.max(tasksDueToday - tasksCompletedToday, 0)}
          </span>{" "}
          remaining task(s) due today. Clearing them gets you to 100% for the day.
        </p>
      )}
    </div>
  );
}

function QuickActions({ onChangePage }: { onChangePage?: (page: PageId) => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col justify-between text-sm">
      <div className="text-left w-full">
        <h3 className="text-sm font-semibold dark:text-slate-50 dark:font-bold mb-2 text-left">Quick actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <QuickActionButton
            label="Go Live now"
            icon="🔴"
            primary
            onClick={() => onChangePage?.("live-studio")}
          />
          <QuickActionButton
            label="View Campaign Board"
            icon="🧭"
            primary={false}
            onClick={() => onChangePage?.("creator-campaigns")}
          />
          <QuickActionButton
            label="Send pitches"
            icon="✉️"
            primary={false}
            onClick={() => onChangePage?.("opportunities")}
          />
          <QuickActionButton
            label="Upload deliverable"
            icon="📤"
            primary={false}
            onClick={() => onChangePage?.("content-submission")}
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">
        Use quick actions to jump straight into execution. Long-form planning stays above.
      </p>
    </div>
  );
}

type QuickActionButtonProps = {
  label: string;
  icon: string;
  primary?: boolean;
  onClick?: () => void;
};

function QuickActionButton({ label, icon, primary, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-sm justify-center ${primary
        ? "bg-[#f77f00] border-[#f77f00] text-white hover:bg-[#e26f00]"
        : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
        }`}
    >
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function CrewStrip({ onChangePage }: { onChangePage?: (page: PageId) => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <h3 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Today’s crew</h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300">Beauty Flash live · 18:30</span>
      </div>
      <ul className="space-y-1.5">
        <CrewRow role="Creator" name="Ronald" status="Confirmed" />
        <CrewRow role="Producer" name="Dacy" status="Assigned" />
        <CrewRow role="Moderator" name="Not assigned" status="Missing" />
      </ul>
      <button
        onClick={() => onChangePage?.("crew-manager")}
        className="mt-2 w-full text-xs py-1.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
      >
        Manage Crew & Co-Hosts
      </button>
    </div>
  );
}

function CrewRow({ role, name, status }: CrewRowProps) {
  const statusColor =
    status === "Confirmed"
      ? "text-emerald-600"
      : status === "Assigned"
        ? "text-sky-600"
        : "text-amber-600";
  return (
    <li className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors" />
        <div className="flex flex-col">
          <span className="font-medium">{role}</span>
          <span className="text-xs text-slate-500 dark:text-slate-300">{name}</span>
        </div>
      </div>
      <span className={`text-xs ${statusColor}`}>{status}</span>
    </li>
  );
}

function NextLiveStrip({ onChangePage }: { onChangePage?: (page: PageId) => void }) {
  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-lg">📺</span>
        <div>
          <p className="text-sm font-semibold">Next live: Beauty Flash with GlowUp</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Starts in <span className="font-medium">02:13:45</span> · 18:30 EAT
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChangePage?.("task-board")}
          className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        >
          Open pre-live checklist
        </button>
        <button
          onClick={() => onChangePage?.("live-studio")}
          className="text-xs px-2.5 py-1 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00]"
        >
          Open Live Studio
        </button>
      </div>
    </div>
  );
}

/* Burn-down chart */

function LegendDot({ className, label }: LegendDotProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      <span>{label}</span>
    </span>
  );
}

function BurnDownChart({ burndown }: BurnDownChartProps) {
  const maxRemaining = Math.max(...burndown.map((d: BurndownData) => d.remainingTotal), 1);

  return (
    <div className="mt-6 pt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">Burn down – upcoming obligations</span>
        <span className="text-xs text-slate-500 dark:text-slate-300">Next 4 days</span>
      </div>
      <div className="flex items-end gap-3 h-40 pb-2">
        {burndown.map((d: BurndownData) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex flex-col justify-end h-16 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden transition-colors">
              <div
                className="w-full bg-red-500"
                style={{ height: `${(d.livesRemaining / maxRemaining) * 100}%` }}
              />
              <div
                className="w-full bg-[#f77f00]"
                style={{ height: `${(d.tasksRemaining / maxRemaining) * 100}%` }}
              />
              <div
                className="w-full bg-[#03cd8c]"
                style={{ height: `${(d.deliverablesRemaining / maxRemaining) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300">{d.label}</span>
            <span className="text-xs text-slate-600 dark:text-slate-200 font-medium">
              {d.remainingTotal} left of {d.total}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <LegendDot className="bg-red-500" label="Lives" />
          <LegendDot className="bg-[#f77f00]" label="Tasks" />
          <LegendDot className="bg-[#03cd8c]" label="Deliverables" />
        </div>
        <span>Goal: 0 obligations in 4 days</span>
      </div>
    </div>
  );
}

/* Task mini board & earnings */

function TaskMiniBoard({
  tasks: _tasks,
  filteredNextTasks,
  filter,
  onFilterChange,
  onToggleTask,
  onSnoozeTask,
  tasksDueToday,
  tasksCompletedToday,
  onChangePage
}: TaskMiniBoardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h3 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Next deliverables</h3>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 dark:text-slate-300">Filter:</span>
          <select
            className="border border-slate-200 dark:border-slate-800 rounded-full px-2 py-0.5 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="all">All</option>
            <option value="today">Due today</option>
            <option value="proposals">Proposals</option>
            <option value="beauty">Beauty Flash</option>
          </select>
        </div>
      </div>
      <ul className="space-y-1.5">
        {filteredNextTasks.map((t: Task) => (
          <li
            key={t.id}
            className="flex items-start justify-between gap-2 border border-slate-100 dark:border-slate-800 rounded-xl px-2.5 py-1.5"
          >
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <button
                  className={`h-4 w-4 rounded-full border flex items-center justify-center text-tiny ${t.status === "done"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-300 text-transparent"
                    }`}
                  onClick={() => onToggleTask(t.id)}
                >
                  ✓
                </button>
                <span
                  className={`text-sm ${t.status === "done" ? "line-through text-slate-400 dark:text-slate-400" : ""
                    }`}
                >
                  {t.title}
                </span>
              </div>
              <div className="ml-6 text-xs text-slate-500 dark:text-slate-300">
                {t.deal} · {t.due}
              </div>
              {t.type === "proposal" && (
                <button
                  onClick={() => onChangePage?.("proposals")}
                  className="ml-6 mt-0.5 text-xs text-[#f77f00] hover:underline">
                  View related proposals
                </button>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => onToggleTask(t.id)}
                className="text-xs px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
              >
                {t.status === "done" ? "Undo" : "Mark done"}
              </button>
              <button
                onClick={() => onSnoozeTask(t.id)}
                className="text-tiny px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                disabled={t.status === "done"}
              >
                Snooze to tomorrow
              </button>
            </div>
          </li>
        ))}
        {filteredNextTasks.length === 0 && (
          <li className="text-xs text-slate-500 dark:text-slate-300">
            No tasks match this filter. Try a different view.
          </li>
        )}
      </ul>
      {
        tasksDueToday > 0 && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
            End-of-day summary: you’ve completed{" "}
            <span className="font-semibold">{tasksCompletedToday}</span> of{" "}
            <span className="font-semibold">{tasksDueToday}</span> tasks due today.
          </p>
        )
      }
    </div >
  );
}

function EarningsGlance({ earnings, mtdProgress, onChangePage }: EarningsGlanceProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Earnings glance</h3>
          <span className="text-xs text-slate-500 dark:text-slate-300">USD · Creator share</span>
        </div>
        <button
          onClick={() => onChangePage?.("earnings")}
          className="text-xs px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        >
          View Promo Earnings
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <EarningsCard
          label="Today"
          value={`$${earnings.today}`}
          data={earnings.todaySpark}
          extra={`Flat: $${earnings.todayFlat} · Comm: $${earnings.todayCommission}`}
        />
        <EarningsCard
          label="Last 7 days"
          value={`$${earnings.last7}`}
          data={earnings.last7Spark}
          extra={`Avg/day: $${earnings.last7Avg.toFixed(0)}`}
        />
        <EarningsCard
          label="Month to date"
          value={`$${earnings.mtd}`}
          data={earnings.mtdSpark}
          extra={`Goal: $${earnings.mtdGoal} · ${Math.round(mtdProgress * 100)}%`}
        />
      </div>
      <div className="mt-2">
        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden transition-colors">
          <div
            className="h-full rounded-full bg-[#03cd8c]"
            style={{ width: `${mtdProgress * 100}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
          You’re{" "}
          <span className="font-semibold">
            ${Math.max(earnings.mtdGoal - earnings.mtd, 0).toFixed(0)}
          </span>{" "}
          away from your monthly goal.
        </p>
      </div>
    </div>
  );
}

function EarningsCard({ label, value, data, extra }: EarningsCardProps) {
  const max = Math.max(...data, 1);
  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-700/50 flex flex-col gap-1 transition-colors">
      <span className="text-xs text-slate-500 dark:text-slate-300">{label}</span>
      <span className="text-sm font-semibold dark:text-slate-50 dark:font-bold">{value}</span>
      <div className="flex items-end gap-0.5 h-8 mt-1">
        {data.map((v: number, idx: number) => (
          <div key={idx} className="flex-1 flex items-end">
            <div
              className="w-full rounded-t-sm bg-[#f77f00]"
              style={{ height: `${(v / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      {extra && <span className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">{extra}</span>}
    </div>
  );
}

/* Timeline */

function TimelineBlock({ slot }: TimelineBlockProps) {
  const colorMap: Record<"light" | "medium" | "live", string> = {
    light: "bg-slate-100 dark:bg-slate-700",
    medium: "bg-slate-200 dark:bg-slate-600",
    live: "bg-[#f77f00]/10 border-[#f77f00]"
  };
  const isLive = slot.type === "live";
  const base = colorMap[slot.type] || "bg-slate-100 dark:bg-slate-700";
  return (
    <div
      className={`min-w-[140px] rounded-xl border border-slate-200 px-2.5 py-2 flex flex-col gap-1 ${base}`}
    >
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300 mb-0.5">
        <span>{slot.time}</span>
        {isLive && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-tiny">
            <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-900 transition-colors" />
            Live
          </span>
        )}
      </div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-100 font-medium transition-colors">{slot.label}</div>
    </div>
  );
}

/* Proposals panel */

function ProposalsPanel({ proposals, onClose, onChangePage }: ProposalsPanelProps) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-colors">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700">
          <span className="font-semibold text-xs">New proposals</span>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>
        <div className="p-3 space-y-2 overflow-y-auto">
          {proposals.map((p: Proposal) => (
            <div
              key={p.id}
              className="border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{p.brand}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-medium transition-colors">
                  {p.status}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-200 font-medium">{p.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-300">Offer: {p.budget}</div>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => onChangePage?.("proposals")}
                  className="flex-1 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
                  View proposal
                </button>
                <button
                  onClick={() => navigate("/proposal-room", { state: { origin: "from-seller" } })}
                  className="px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
