import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";

/**
 * SupplierLiveScheduleCalendarPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: LiveScheduleCalendarPage.tsx (Creator)
 *
 * Mirror-first preserved:
 * - PageHeader + badge
 * - AI suggestions row + view toggle (Week/Month/Agenda)
 * - Conflict warnings block
 * - Week grid calendar + MonthView + Agenda view
 * - Agenda list (right rail)
 * - SessionDetailDrawer (tabs: Overview/Scripts/Assets/Products) + QR toggle
 * - RescheduleDrawer with AI slots selection
 * - Toast feedback pattern
 *
 * Supplier adaptations (minimal, necessary):
 * - Sessions show Supplier-owned campaign context + Host Role (Creator-hosted vs Supplier-hosted)
 * - Actions route to Supplier Live Studio/Builder (router-safe actions for the app)
 * - Approval gating notes included (Manual vs Auto)
 */

const ORANGE = "#f77f00";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function normalizeScheduleWorkspace(payload) {
  return {
    sessions: Array.isArray(payload?.sessions) ? payload.sessions : [],
    aiSlots: Array.isArray(payload?.aiSlots) ? payload.aiSlots : []
  };
}

/**
 * Supplier session model (mirrors Creator file shape + adds Supplier context)
 *
 * hostRole:
 * - "Supplier" when Supplier chose “I will NOT use a Creator” (supplier acts as creator)
 * - "Creator" when Supplier is using a creator
 */

/* --------------------------------- Toast ---------------------------------- */

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2600);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-gray-50 dark:bg-slate-950 text-white dark:text-slate-900 px-4 py-2 rounded-full shadow-lg text-sm font-medium z-50 animate-fade-in-up">
      {message}
    </div>
  );
}

/* ------------------------------- Small UI Bits ------------------------------ */

function PageHeader({ pageTitle, badge, right }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-50 truncate">
            {pageTitle}
          </h1>
          <div className="mt-1">{badge}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}

function Pill({ children, tone = "neutral" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"
        : tone === "danger"
          ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"
          : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", children, onClick, disabled, className }) {
  const cls =
    tone === "brand"
      ? "text-white"
      : tone === "ghost"
        ? "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100";

  const style = tone === "brand" ? { background: ORANGE } : undefined;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${cls} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className || ""}`}
    >
      {children}
    </button>
  );
}

/* ----------------------------- QR (No deps) -------------------------------- */

function QRCodeMock({ value, size = 160 }) {
  // Deterministic pseudo-QR pattern (visual only). Replace with real QR generator in app.
  const grid = 29;
  const cell = size / grid;

  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const seed = hash(value);

  const isFinder = (x, y) => {
    const inTL = x < 7 && y < 7;
    const inTR = x >= grid - 7 && y < 7;
    const inBL = x < 7 && y >= grid - 7;
    return inTL || inTR || inBL;
  };

  const cellOn = (x, y) => {
    if (isFinder(x, y)) {
      // finder rings
      const fx = x % 7;
      const fy = y % 7;
      const outer = fx === 0 || fy === 0 || fx === 6 || fy === 6;
      const inner = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
      return outer || inner;
    }
    // data pattern
    const n = (seed + x * 131 + y * 313) >>> 0;
    return (n & 1) === 1;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <rect x="0" y="0" width={size} height={size} fill="#ffffff" />
      {Array.from({ length: grid }).map((_, y) =>
        Array.from({ length: grid }).map((__, x) => {
          if (!cellOn(x, y)) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
              width={cell}
              height={cell}
              fill="#000000"
            />
          );
        })
      )}
    </svg>
  );
}

/* ------------------------------- Page -------------------------------------- */

export default function SupplierLiveScheduleCalendarPage() {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(() => normalizeScheduleWorkspace({}));
  const [viewMode, setViewMode] = useState("week"); // week | month | agenda
  const [selectedSession, setSelectedSession] = useState(null);
  const [toast, setToast] = useState(null);
  const [rescheduleSession, setRescheduleSession] = useState(null);

  const sessions = workspace.sessions;
  const aiSlots = workspace.aiSlots;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await sellerBackendApi.getLiveScheduleWorkspace();
        if (!active) return;
        setWorkspace(normalizeScheduleWorkspace(payload));
      } catch {
        if (!active) return;
        showToast("Unable to load live schedule");
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg) => setToast(msg);

  const safeNav = (url) => {
    if (!url) return;
    const target = /^https?:\/\//i.test(url) ? url : url.startsWith("/") ? url : `/${url}`;
    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noreferrer");
      return;
    }
    navigate(target);
  };

  const conflicts = useMemo(() => {
    const msgs = [];
    const heavy = sessions.filter((s) => s.workloadScore >= 4);
    if (heavy.length) {
      msgs.push("You have heavy workload on Tech Friday. Consider spacing prep and lives.");
    }

    const conflictSessions = sessions.filter((s) => s.conflict);
    if (conflictSessions.length) {
      msgs.push("Some sessionz may overlap with prep windows. Review supplier-hosted Tech Friday schedule.");
    }

    const pendingAssets = sessions.filter((s) => !s.assetsReady && s.status !== "Ended");
    if (pendingAssets.length) {
      msgs.push("Some sessionz are missing assets. If approval mode is Manual, delays can block Admin review.");
    }

    return msgs;
  }, [sessions]);

  const sessionsByDay = useMemo(() => {
    const map = {};
    WEEK_DAYS.forEach((d) => (map[d] = []));
    sessions.forEach((s) => {
      if (!map[s.weekday]) map[s.weekday] = [];
      map[s.weekday].push(s);
    });
    return map;
  }, [sessions]);

  const agendaSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const order = WEEK_DAYS.indexOf(a.weekday) - WEEK_DAYS.indexOf(b.weekday);
      if (order !== 0) return order;
      return a.time.localeCompare(b.time);
    });
  }, [sessions]);

  const handleStartRehearsal = (session) => {
    showToast(`Entering rehearsal for "${session.title}"`);
    setTimeout(() => {
      safeNav(`/supplier/live-studio?mode=rehearsal&sessionId=${encodeURIComponent(session.id)}`);
    }, 700);
  };

  const handleOpenBuilder = (session) => {
    showToast(`Opening Live Builder for "${session.title}"`);
    setTimeout(() => {
      safeNav(`/supplier/live-studio?tab=builder&sessionId=${encodeURIComponent(session.id)}`);
    }, 650);
  };

  const handleRequestReschedule = (session) => {
    setRescheduleSession(session);
  };

  const submitReschedule = (reason) => {
    showToast(`Reschedule request sent: "${reason}"`);
    setRescheduleSession(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Live Schedule"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-800 transition-colors">
            <span>📅</span>
            <span>Week ahead · Lives + replays</span>
          </span>
        }
        right={
          <>
            <Btn tone="ghost" onClick={() => safeNav("/supplier/live-dashboard")}>Live Dashboard</Btn>
            <Btn tone="ghost" onClick={() => safeNav("/supplier/dealz-marketplace")}>Dealz Marketplace</Btn>
            <Btn tone="brand" onClick={() => showToast("New live session" )}>New Live Session</Btn>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-6 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          {/* AI suggestions + view toggle */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <div>
                  <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-0.5">
                    Best slots this week for your audience
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Based on your last 60 days, timezone and regions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full transition-colors px-1 py-0.5">
                {[
                  { key: "week", label: "Week" },
                  { key: "month", label: "Month" },
                  { key: "agenda", label: "Agenda" }
                ].map((t) => (
                  <button
                    key={t.key}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${viewMode === t.key
                      ? "bg-[#f77f00] text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    onClick={() => setViewMode(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
              {aiSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 flex flex-col gap-0.5 transition-colors"
                >
                  <div className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50">
                    {slot.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-300">{slot.reason}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-300">
                    Best for: <span className="font-medium">{slot.recommendedFor}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Conflict warnings */}
          {conflicts.length > 0 ? (
            <section className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-1 transition-colors">
              <div className="flex items-center gap-1">
                <span>⚠️</span>
                <span className="font-semibold dark:font-bold text-sm">Potential conflicts & workload warnings</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {conflicts.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Calendar + agenda */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-3 items-start text-sm">
            {/* Calendar View (Week, Month, or Agenda) */}
            {viewMode === "month" ? (
              <MonthView sessions={sessions} onSelectSession={setSelectedSession} />
            ) : viewMode === "agenda" ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Full Agenda</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300">All upcoming sessionz and rehearsals.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {agendaSessions.map((session) => (
                    <AgendaRow
                      key={session.id}
                      session={session}
                      onSelect={() => setSelectedSession(session)}
                      onStartRehearsal={() => handleStartRehearsal(session)}
                      onOpenBuilder={() => handleOpenBuilder(session)}
                      onRequestReschedule={() => handleRequestReschedule(session)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Week view</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300">Tap a session to see scripts, assets and products.</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Confirmed</span>
                    <span className="h-2 w-2 rounded-full bg-amber-500 ml-2" />
                    <span>Draft / At risk</span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto pb-2">
                  <div className="grid grid-cols-7 gap-1 md:gap-1.5 text-xs min-w-[700px] md:min-w-0">
                    {WEEK_DAYS.map((day) => {
                      const daySessions = sessionsByDay[day] || [];
                      return (
                        <div
                          key={day}
                          className="min-h-[120px] border border-slate-100 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 flex flex-col transition-colors"
                        >
                          <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between">
                            <span>{day}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-400">{daySessions.length} live</span>
                          </div>
                          <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                            {daySessions.map((s) => (
                              <button
                                key={s.id}
                                className={`w-full text-left rounded-lg px-1.5 py-1 border text-xs truncate transition-colors ${s.status === "Confirmed"
                                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                                  : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                                  }`}
                                onClick={() => setSelectedSession(s)}
                              >
                                <div className="font-medium truncate">{s.time}</div>
                                <div className="truncate">{s.campaign}</div>
                                <div className="mt-0.5 flex items-center gap-1">
                                  <span className="text-[10px] opacity-90">{s.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}</span>
                                </div>
                              </button>
                            ))}

                            {daySessions.length === 0 ? (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 italic">No sessions</div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Agenda list */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Agenda</h3>
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  {agendaSessions.length} sessionz in the next 7 days
                </span>
              </div>

              <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
                {agendaSessions.map((session) => (
                  <AgendaRow
                    key={session.id}
                    session={session}
                    onSelect={() => setSelectedSession(session)}
                    onStartRehearsal={() => handleStartRehearsal(session)}
                    onOpenBuilder={() => handleOpenBuilder(session)}
                    onRequestReschedule={() => handleRequestReschedule(session)}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {selectedSession ? (
        <SessionDetailDrawer
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onStartRehearsal={handleStartRehearsal}
          onOpenBuilder={handleOpenBuilder}
          onRequestReschedule={handleRequestReschedule}
          showToast={showToast}
          safeNav={safeNav}
        />
      ) : null}

      {rescheduleSession ? (
        <RescheduleDrawer
          session={rescheduleSession}
          aiSlots={aiSlots}
          onClose={() => setRescheduleSession(null)}
          onSubmit={submitReschedule}
        />
      ) : null}

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

/* -------------------------------- Month View -------------------------------- */

function MonthView({ sessions, onSelectSession }) {
  // Mock calendar grid (October 2026)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const startOffset = 3; // starts on Thursday

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">October 2026</h3>
        <div className="flex gap-2">
          <button className="text-xs p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" type="button">◀</button>
          <button className="text-xs p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" type="button">▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs mb-1">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center font-medium text-slate-500 dark:text-slate-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 h-[400px]">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-800/30 rounded-lg" />
        ))}

        {days.map((day) => {
          // Mock: match by day number in dateLabel
          const daySessions = sessions.filter((s) => s.dateLabel.includes(` ${day} `));
          return (
            <div
              key={day}
              className="border border-slate-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 rounded-lg p-1 flex flex-col gap-1 overflow-hidden transition-colors"
            >
              <span className="text-xs font-medium text-slate-400">{day}</span>
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                {daySessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelectSession(s)}
                    type="button"
                    className={`w-full text-left p-1 rounded text-[10px] truncate border ${s.status === "Confirmed"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700"
                      : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700"
                      }`}
                  >
                    {s.time.split("–")[0]} {s.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- Agenda Row -------------------------------- */

function AgendaRow({ session, onSelect, onStartRehearsal, onOpenBuilder, onRequestReschedule }) {
  const isConfirmed = session.status === "Confirmed";

  const statusColor = isConfirmed
    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
    : session.status === "Draft"
      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700"
      : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  const locationLabel =
    session.location && session.simulcast
      ? `${session.location} + ${session.simulcast}`
      : session.location || session.simulcast || "MyLiveDealz";

  return (
    <div
      className="border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 dark:bg-slate-800 flex flex-col sm:flex-row items-start justify-between gap-2 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 cursor-pointer transition-colors"
      onClick={onSelect}
    >
      <div className="w-full sm:flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-300 w-20 shrink-0">{session.dateLabel}</span>
          <span className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50 truncate">{session.title}</span>
        </div>

        <div className="ml-20 text-xs text-slate-500 dark:text-slate-300">
          {session.campaign} · {session.supplier}
        </div>

        <div className="ml-20 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
          <span>{session.time}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{locationLabel}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] ${statusColor}`}>
            <span>●</span>
            <span>{session.status}</span>
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className="text-[10px]">{session.hostRole === "Supplier" ? "Supplier-hosted" : `Creator-hosted (${session.host})`}</span>
        </div>
      </div>

      <div className="flex flex-row w-full justify-end gap-2 mt-2 sm:w-auto sm:flex-col sm:items-end sm:gap-1 sm:mt-0 sm:min-w-[130px]">
        <button
          type="button"
          className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onOpenBuilder();
          }}
        >
          Open builder
        </button>
        <button
          type="button"
          className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onStartRehearsal();
          }}
        >
          Start rehearsal
        </button>
        <button
          type="button"
          className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRequestReschedule();
          }}
        >
          Request reschedule
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Reschedule Drawer ---------------------------- */

function RescheduleDrawer({ session, aiSlots, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);

  const handleSubmit = () => {
    if (!reason.trim() && !selectedSlot) return;
    const finalReason = selectedSlot
      ? `Preferred slot: ${aiSlots.find((s) => s.id === selectedSlot)?.label}. ${reason}`
      : reason;
    onSubmit(finalReason);
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-colors transform transition-transform duration-300 pt-16 md:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold dark:text-white">Request Reschedule</h3>
          <button
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700 text-xs">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{session.title}</p>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{session.dateLabel} · {session.time}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={session.hostRole === "Supplier" ? "warn" : "good"}>{session.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}</Pill>
              <Pill tone={session.approvalMode === "Manual" ? "warn" : "good"}>Approval: {session.approvalMode}</Pill>
            </div>
          </div>

          <section>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">Why do you need to reschedule?</h4>
            <textarea
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#f77f00] outline-none transition-all resize-none"
              rows={3}
              placeholder="e.g. Conflict with another event..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Supplier note: if Creator-hosted, request is sent to the Creator + Admin; if Supplier-hosted, request is sent to Admin.
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🤖</span>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Suggested alternative slots</h4>
            </div>
            <div className="space-y-2">
              {aiSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlot(slot.id === selectedSlot ? null : slot.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-colors ${selectedSlot === slot.id
                    ? "bg-[#f77f00]/10 border-[#f77f00] ring-1 ring-[#f77f00]"
                    : "bg-white dark:bg-slate-900 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{slot.label}</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{slot.reason}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all ${!reason && !selectedSlot
                ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                : "bg-[#f77f00] hover:bg-[#e26f00] hover:scale-[1.02]"
                }`}
              onClick={handleSubmit}
              disabled={!reason && !selectedSlot}
            >
              Send Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Session Detail Drawer ------------------------ */

function SessionDetailDrawer({ session, onClose, onStartRehearsal, onOpenBuilder, onRequestReschedule, showToast, safeNav }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [qrOpen, setQrOpen] = useState(false);

  const sessionUrl = `https://mylivedealz.com/live/${session.id}`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard?.writeText(sessionUrl);
    } catch {
      // ignore
    }
    showToast("Session link copied to clipboard");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-colors transform transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 transition-colors">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold dark:font-bold transition-colors">
              {session.supplier
                .split(" ")
                .map((w) => w[0])
                .join("")}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold dark:font-bold">{session.title}</span>
              <span className="text-xs text-slate-500 dark:text-slate-300">
                {session.campaign} · {session.supplier}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <section>
            <h3 className="text-xs font-semibold dark:font-bold mb-1">Session overview</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-200 mb-1">
              <span>{session.dateLabel}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{session.time}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>
                Duration: <span className="font-medium">{session.durationMin} min</span>
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>
                Role: <span className="font-medium">{session.role}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600 dark:text-slate-200 font-medium">
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs">MyLiveDealz Studio</span>
              {session.simulcast ? (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs transition-colors">
                  Simulcast: {session.simulcast}
                </span>
              ) : null}
              <span className={`px-2 py-0.5 rounded-full border text-xs ${session.hostRole === "Supplier"
                ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                {session.hostRole === "Supplier" ? "Supplier-hosted" : `Creator-hosted · ${session.host}`}
              </span>
              <span className={`px-2 py-0.5 rounded-full border text-xs ${session.approvalMode === "Manual"
                ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                Approval: {session.approvalMode}
              </span>
              {session.conflict ? (
                <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-xs text-red-700 dark:text-red-400 transition-colors">
                  Potential conflict — check schedule
                </span>
              ) : null}
            </div>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Permission note: Supplier Owners/Admins can reschedule. Campaign Managers can start rehearsal and open builder.
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold mb-1">Prep & actions</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold hover:bg-[#e26f00]"
                onClick={() => onStartRehearsal(session)}
              >
                Start rehearsal
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                onClick={() => onOpenBuilder(session)}
              >
                Open builder
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                onClick={() => onRequestReschedule(session)}
              >
                Request reschedule
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Share session:</span>
              <button
                type="button"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
                onClick={handleCopyLink}
              >
                <span>🔗</span> Copy Link
              </button>
              <div className="relative">
                <button
                  type="button"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors ${qrOpen
                    ? "bg-slate-900 border-slate-900 text-white dark:bg-gray-50 dark:bg-slate-950 dark:border-slate-50 dark:text-slate-900"
                    : "border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                    }`}
                  onClick={() => setQrOpen(!qrOpen)}
                >
                  <span>📱</span> {qrOpen ? "Hide QR" : "QR Code"}
                </button>
              </div>
            </div>

            {qrOpen ? (
              <div className="mt-3 flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl animate-fade-in-down mx-4">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100">
                  <QRCodeMock value={sessionUrl} size={160} />
                </div>
                <div className="text-sm font-medium mt-2 text-slate-800 dark:text-slate-200">Scan to join as viewer</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Share this code with your audience</div>
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="text-xs font-semibold mb-1">Live workspace</h3>
            <div className="flex items-center gap-1 text-xs mb-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full px-1 py-0.5 transition-colors">
              {[
                { id: "overview", label: "Overview" },
                { id: "scripts", label: "Scripts" },
                { id: "assets", label: "Assets" },
                { id: "products", label: "Products" }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`px-2.5 py-0.5 rounded-full transition-colors ${activeTab === t.id
                    ? "bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" ? (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
                <p>
                  This live uses your flash format. AI Assistant surfaces scripts, assets and products 30 minutes before start.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill tone={session.creatorUsage === "I will NOT use a Creator" ? "warn" : session.creatorUsage === "I will use a Creator" ? "good" : "neutral"}>
                    {session.creatorUsage}
                  </Pill>
                  <Pill>Collab: {session.collabMode}</Pill>
                </div>
              </div>
            ) : null}

            {activeTab === "scripts" ? (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
                <p className="mb-1">
                  Script status: <span className="font-medium">{session.scriptsReady ? "Ready" : "Drafting"}</span>
                </p>
                <p>In Studio, you’ll see segment-by-segment notes here, with timers and prompts.</p>
              </div>
            ) : null}

            {activeTab === "assets" ? (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
                <p className="mb-1">
                  Assets ready: <span className="font-medium">{session.assetsReady ? "Yes" : "Some assets missing"}</span>
                </p>
                <p>Opener, hero slides and offer graphics pull from Asset Library and Smart bundles.</p>
              </div>
            ) : null}

            {activeTab === "products" ? (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
                <p className="mb-1">
                  Products linked: <span className="font-medium">{session.productsCount}</span>
                </p>
                <p>In app, this tab shows product carousel, price rules and stock levels for the live.</p>
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="text-xs font-semibold mb-1">Quick links</h3>
            <div className="flex flex-wrap gap-2">
              <Btn tone="ghost" onClick={() => safeNav(`/supplier/task-board?sessionId=${encodeURIComponent(session.id)}`)}>Task Board</Btn>
              <Btn tone="ghost" onClick={() => safeNav(`/supplier/asset-library?sessionId=${encodeURIComponent(session.id)}`)}>Asset Library</Btn>
              <Btn tone="ghost" onClick={() => safeNav(`/supplier/links-hub?sessionId=${encodeURIComponent(session.id)}`)}>Links Hub</Btn>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
