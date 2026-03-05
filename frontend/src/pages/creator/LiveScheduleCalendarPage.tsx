// Round 5 – Page 13: Live Schedule & Calendar (Creator View)
// Purpose: Calendar of all upcoming / co-hosted sessions.
// Views: Week + Agenda (simple week grid + list).
// Premium extras: AI suggestion row, conflict warnings, side drawer for details.

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../../components/PageHeader";
import { QRCodeCanvas } from "qrcode.react";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type WeekDay = typeof WEEK_DAYS[number];

type Session = {
  id: string;
  title: string;
  campaign: string;
  seller: string;
  weekday: WeekDay;
  dateLabel: string;
  time: string;
  location: string;
  simulcast: string;
  status: string;
  role: string;
  durationMin: number;
  scriptsReady: boolean;
  assetsReady: boolean;
  productsCount: number;
  workloadScore: number;
  conflict: boolean;
};

const SESSIONS: Session[] = [
  {
    id: "L-101",
    title: "Beauty Flash – Serum launch",
    campaign: "Autumn Beauty Flash",
    seller: "GlowUp Hub",
    weekday: "Thu",
    dateLabel: "Thu 10 Oct",
    time: "18:30–19:30",
    location: "MyLiveDealz",
    simulcast: "YouTube",
    status: "Confirmed",
    role: "Host",
    durationMin: 60,
    scriptsReady: true,
    assetsReady: false,
    productsCount: 8,
    workloadScore: 3,
    conflict: false
  },
  {
    id: "L-102",
    title: "Tech Friday – Gadgets Q&A",
    campaign: "Tech Friday Mega Live",
    seller: "GadgetMart Africa",
    weekday: "Fri",
    dateLabel: "Fri 11 Oct",
    time: "20:00–21:30",
    location: "MyLiveDealz",
    simulcast: "Facebook",
    status: "Draft",
    role: "Host",
    durationMin: 90,
    scriptsReady: false,
    assetsReady: false,
    productsCount: 12,
    workloadScore: 4,
    conflict: true // overlaps with prep window
  },
  {
    id: "L-103",
    title: "Faith & Wellness Morning Dealz",
    campaign: "Faith & Wellness Morning Dealz",
    seller: "Grace Living Store",
    weekday: "Sat",
    dateLabel: "Sat 12 Oct",
    time: "09:00–10:00",
    location: "MyLiveDealz",
    simulcast: "",
    status: "Confirmed",
    role: "Host",
    durationMin: 60,
    scriptsReady: true,
    assetsReady: true,
    productsCount: 6,
    workloadScore: 2,
    conflict: false
  },
  {
    id: "L-104",
    title: "Tech Friday – Clips replay",
    campaign: "Tech Friday Mega Live",
    seller: "GadgetMart Africa",
    weekday: "Sun",
    dateLabel: "Sun 13 Oct",
    time: "21:00–21:30",
    location: "Replays only",
    simulcast: "MyLiveDealz",
    status: "Scheduled",
    role: "Replay host",
    durationMin: 30,
    scriptsReady: false,
    assetsReady: true,
    productsCount: 4,
    workloadScore: 1,
    conflict: false
  }
];

const AI_SLOTS = [
  {
    id: 1,
    label: "Wed 20:00–21:00",
    reason: "Peak East Africa view time · 1.3× retention",
    recommendedFor: "Tech & Beauty"
  },
  {
    id: 2,
    label: "Fri 19:30–20:30",
    reason: "High intent just before weekend shopping",
    recommendedFor: "Gadgets & Flash dealz"
  },
  {
    id: 3,
    label: "Sun 09:00–10:00",
    reason: "Faith & Wellness audience spike",
    recommendedFor: "Faith-compatible shows"
  }

];

// Mock Toast for user feedback
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 px-4 py-2 rounded-full shadow-lg text-sm font-medium z-50 animate-fade-in-up">
      {message}
    </div>
  );
}

// Props interface removed as it's no longer needed

function LiveScheduleCalendarPage() {
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"week" | "month" | "agenda">("week");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => setToast(msg);

  const conflicts = useMemo(() => {
    const msgs: string[] = [];
    const heavyDays = SESSIONS.filter((s) => s.workloadScore >= 4);
    if (heavyDays.length > 0) {
      msgs.push(
        "You have heavy workload on Tech Friday. Consider spacing prep and lives."
      );
    }
    const conflictSessions = SESSIONS.filter((s) => s.conflict);
    if (conflictSessions.length > 0) {
      msgs.push(
        "Some sessionz may overlap with prep windows. Check Tech Friday schedule."
      );
    }
    return msgs;
  }, []);

  const sessionsByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    WEEK_DAYS.forEach((d) => {
      map[d] = [];
    });
    SESSIONS.forEach((s) => {
      if (!map[s.weekday]) map[s.weekday] = [];
      map[s.weekday].push(s);
    });
    return map;
  }, []);

  const agendaSessions = useMemo(() => {
    return [...SESSIONS].sort((a, b) => {
      const order = WEEK_DAYS.indexOf(a.weekday) - WEEK_DAYS.indexOf(b.weekday);
      if (order !== 0) return order;
      return a.time.localeCompare(b.time);
    });
  }, []);


  const [rescheduleSession, setRescheduleSession] = useState<Session | null>(null);

  const handleStartRehearsal = (session: Session): void => {
    showToast(`Entering rehearsal for "${session.title}"`);
    // Navigate to Live Studio
    setTimeout(() => {
      navigate("/live-studio");
    }, 1000);
  };

  const handleRequestReschedule = (session: Session): void => {
    setRescheduleSession(session);
  };

  const submitReschedule = (reason: string) => {
    showToast(`Reschedule request sent: "${reason}"`);
    setRescheduleSession(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Live Schedule & Calendar"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-800 transition-colors">
            <span>📅</span>
            <span>Week ahead · Live + replays</span>
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-y-auto overflow-x-hidden">
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
                    Based on your last 60 days of lives, timezone and regions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full transition-colors px-1 py-0.5">
                <button
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${viewMode === "week"
                    ? "bg-[#f77f00] text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  onClick={() => setViewMode("week")}
                >
                  Week
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${viewMode === "month"
                    ? "bg-[#f77f00] text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  onClick={() => setViewMode("month")}
                >
                  Month
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${viewMode === "agenda"
                    ? "bg-[#f77f00] text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  onClick={() => setViewMode("agenda")}
                >
                  Agenda
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
              {AI_SLOTS.map((slot) => (
                <div
                  key={slot.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-800 flex flex-col gap-0.5 transition-colors"
                >
                  <div className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50">
                    {slot.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-300">
                    {slot.reason}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-300">
                    Best for:{" "}
                    <span className="font-medium">
                      {slot.recommendedFor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Conflict warnings */}
          {conflicts.length > 0 && (
            <section className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-1 transition-colors">
              <div className="flex items-center gap-1">
                <span>⚠️</span>
                <span className="font-semibold dark:font-bold text-sm">
                  Potential conflicts & workload warnings
                </span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {conflicts.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Calendar + agenda */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-3 items-start text-sm">
            {/* Calendar View (Week, Month, or Agenda) */}
            {viewMode === "month" ? (
              <MonthView sessions={SESSIONS} onSelectSession={setSelectedSession} />
            ) : viewMode === "agenda" ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Full Agenda</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      All upcoming sessionz and rehearsals.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {agendaSessions.map((session) => (
                    <AgendaRow
                      key={session.id}
                      session={session}
                      onSelect={() => setSelectedSession(session)}
                      onStartRehearsal={() => handleStartRehearsal(session)}
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
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      Tap a session to see scripts, assets and products.
                    </p>
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
                          className="min-h-[120px] border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col transition-colors"
                        >
                          <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between">
                            <span>{day}</span>
                            <span className="text-tiny text-slate-400 dark:text-slate-400">
                              {daySessions.length} live
                            </span>
                          </div>
                          <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                            {daySessions.map((s: Session) => (
                              <button
                                key={s.id}
                                className={`w-full text-left rounded-lg px-1.5 py-1 border text-xs truncate transition-colors ${s.status === "Confirmed"
                                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                                  : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                                  }`}
                                onClick={() => setSelectedSession(s)}
                              >
                                <div className="font-medium truncate">
                                  {s.time}
                                </div>
                                <div className="truncate">{s.campaign}</div>
                              </button>
                            ))}
                            {daySessions.length === 0 && (
                              <div className="text-tiny text-slate-400 dark:text-slate-500 italic">
                                No sessions
                              </div>
                            )}
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
                {agendaSessions.map((session: Session) => (
                  <AgendaRow
                    key={session.id}
                    session={session}
                    onSelect={() => setSelectedSession(session)}
                    onStartRehearsal={() => handleStartRehearsal(session)}
                    onRequestReschedule={() =>
                      handleRequestReschedule(session)
                    }
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {selectedSession && (
        <SessionDetailDrawer
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onStartRehearsal={handleStartRehearsal}
          onRequestReschedule={handleRequestReschedule}
          showToast={showToast}
        />
      )}

      {rescheduleSession && (
        <RescheduleDrawer
          session={rescheduleSession}
          onClose={() => setRescheduleSession(null)}
          onSubmit={submitReschedule}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function MonthView({ sessions, onSelectSession }: { sessions: Session[], onSelectSession: (s: Session) => void }) {
  // Mock calendar grid for Oct 2026
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const startOffset = 3; // Starts on Thursday

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">October 2026</h3>
        <div className="flex gap-2">
          <button className="text-xs p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">◀</button>
          <button className="text-xs p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs mb-1">
        {WEEK_DAYS.map(d => <div key={d} className="text-center font-medium text-slate-500">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 h-[400px]">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg" />
        ))}
        {days.map(day => {
          // Find sessions for this day (Mock matching by day number in dateLabel string for simplicity in this mock data)
          // Real app would use actual Date objects
          const daySessions = sessions.filter(s => s.dateLabel.includes(` ${day} `));
          return (
            <div key={day} className="border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-1 flex flex-col gap-1 overflow-hidden transition-colors">
              <span className="text-xs font-medium text-slate-400">{day}</span>
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                {daySessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onSelectSession(s)}
                    className={`w-full text-left p-1 rounded text-tiny truncate border ${s.status === "Confirmed"
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

type AgendaRowProps = {
  session: Session;
  onSelect: () => void;
  onStartRehearsal: () => void;
  onRequestReschedule: () => void;
};

function AgendaRow({
  session,
  onSelect,
  onStartRehearsal,
  onRequestReschedule
}: AgendaRowProps) {
  const isConfirmed = session.status === "Confirmed";
  const statusColor = isConfirmed
    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
    : session.status === "Draft"
      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700"
      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  const locationLabel =
    session.location && session.simulcast
      ? `${session.location} + ${session.simulcast}`
      : session.location || session.simulcast || "MyLiveDealz";

  return (
    <div
      className="border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-800 flex flex-col sm:flex-row items-start justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
      onClick={onSelect}
    >
      <div className="w-full sm:flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-300 w-20 shrink-0">
            {session.dateLabel}
          </span>
          <span className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50 truncate">
            {session.title}
          </span>
        </div>
        <div className="ml-20 text-xs text-slate-500 dark:text-slate-300">
          {session.campaign} · {session.seller}
        </div>
        <div className="ml-20 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
          <span>{session.time}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{locationLabel}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-tiny ${statusColor}`}
          >
            <span>●</span>
            <span>{session.status}</span>
          </span>
        </div>
      </div>
      <div className="flex flex-row w-full justify-end gap-2 mt-2 sm:w-auto sm:flex-col sm:items-end sm:gap-1 sm:mt-0 sm:min-w-[110px]">
        <button
          className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onStartRehearsal();
          }}
        >
          Start rehearsal
        </button>
        <button
          className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
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

type RescheduleDrawerProps = {
  session: Session;
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

function RescheduleDrawer({ session, onClose, onSubmit }: RescheduleDrawerProps) {
  const [reason, setReason] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const handleSubmit = () => {
    if (!reason.trim() && !selectedSlot) return;
    const finalReason = selectedSlot
      ? `Preferred slot: ${AI_SLOTS.find(s => s.id === selectedSlot)?.label}. ${reason}`
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
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700 text-xs">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{session.title}</p>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{session.dateLabel} · {session.time}</p>
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
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🤖</span>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Suggested alternative slots</h4>
            </div>
            <div className="space-y-2">
              {AI_SLOTS.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id === selectedSlot ? null : slot.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-colors ${selectedSlot === slot.id
                    ? "bg-[#f77f00]/10 border-[#f77f00] ring-1 ring-[#f77f00]"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
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
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
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

type SessionDetailDrawerProps = {
  session: Session;
  onClose: () => void;
  onStartRehearsal: (session: Session) => void;
  onRequestReschedule: (session: Session) => void;
  showToast: (msg: string) => void;
};

function SessionDetailDrawer({
  session,
  onClose,
  onStartRehearsal,
  onRequestReschedule,
  showToast
}: SessionDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("overview"); // overview | scripts | assets | products
  const [qrOpen, setQrOpen] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://mylivedealz.com/live/${session.id}`);
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
              {session.seller
                .split(" ")
                .map((w: string) => w[0])
                .join("")}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold dark:font-bold">{session.title}</span>
              <span className="text-xs text-slate-500 dark:text-slate-300">
                {session.campaign} · {session.seller}
              </span>
            </div>
          </div>
          <button
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
                Duration:{" "}
                <span className="font-medium">{session.durationMin} min</span>
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>
                Role: <span className="font-medium">{session.role}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600 dark:text-slate-200 font-medium">
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs">
                MyLiveDealz Studio
              </span>
              {session.simulcast && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs transition-colors">
                  Simulcast: {session.simulcast}
                </span>
              )}
              {session.conflict && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-xs text-red-700 dark:text-red-400 transition-colors">
                  Potential conflict – check schedule
                </span>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold mb-1">Prep & actions</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold hover:bg-[#e26f00]"
                onClick={() => onStartRehearsal(session)}
              >
                Start rehearsal
              </button>
              <button
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
                onClick={() => onRequestReschedule(session)}
              >
                Request reschedule
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Share session:</span>
              <button
                className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={handleCopyLink}
              >
                <span>🔗</span> Copy Link
              </button>
              <div className="relative">
                <button
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors ${qrOpen
                    ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-50 dark:border-slate-50 dark:text-slate-900"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  onClick={() => setQrOpen(!qrOpen)}
                >
                  <span>📱</span> {qrOpen ? "Hide QR" : "QR Code"}
                </button>
              </div>
            </div>
            {qrOpen && (
              <div className="mt-3 flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl animate-fade-in-down mx-4">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <QRCodeCanvas
                    value={`https://mylivedealz.com/live/${session.id}`}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="Q"
                  />
                </div>
                <div className="text-sm font-medium mt-2 text-slate-800 dark:text-slate-200">
                  Scan to join as viewer
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Share this code with your audience
                </div>
              </div>
            )}

          </section>

          <section>
            <h3 className="text-xs font-semibold mb-1">Live workspace</h3>
            <div className="flex items-center gap-1 text-xs mb-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full px-1 py-0.5 transition-colors">
              {[
                { id: "overview", label: "Overview" },
                { id: "scripts", label: "Scripts" },
                { id: "assets", label: "Assets" },
                { id: "products", label: "Products" }
              ].map((t) => (
                <button
                  key={t.id}
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

            {activeTab === "overview" && (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
                <p>
                  This live will use your standard flash format. AI Assistant will surface scripts,
                  assets and products 30 minutes before start.
                </p>
              </div>
            )}
            {activeTab === "scripts" && (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
                <p className="mb-1">
                  Script status:{" "}
                  <span className="font-medium">
                    {session.scriptsReady ? "Ready" : "Drafting"}
                  </span>
                </p>
                <p>
                  In the full Studio, you’ll see segment-by-segment notes here, with timers and
                  prompts.
                </p>
              </div>
            )}
            {activeTab === "assets" && (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
                <p className="mb-1">
                  Assets ready:{" "}
                  <span className="font-medium">
                    {session.assetsReady ? "Yes" : "Some assets missing"}
                  </span>
                </p>
                <p>
                  Opener, hero slides and offer graphics will be pulled from your Asset Library and
                  Smart bundles.
                </p>
              </div>
            )}
            {activeTab === "products" && (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
                <p className="mb-1">
                  Products linked:{" "}
                  <span className="font-medium">{session.productsCount}</span>
                </p>
                <p>
                  In the full app, this tab shows your product carousel, price rules and stock
                  levels for the live.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export { LiveScheduleCalendarPage };
