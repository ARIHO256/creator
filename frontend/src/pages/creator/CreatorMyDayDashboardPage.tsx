import React from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useMyDayWorkspaceQuery } from "../../hooks/api/useWorkspace";
import type { MyDayAgendaItemRecord, MyDayKpiRecord, MyDayReminderRecord } from "../../api/types";

function KpiCard({ item, onOpen }: { item: MyDayKpiRecord; onOpen: (target?: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.target)}
      className="rounded-[1.75rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#f77f00] dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.hint}</p>
    </button>
  );
}

function AgendaRow({ item, onOpen }: { item: MyDayAgendaItemRecord; onOpen: (target?: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.target)}
      className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.subtitle}</p>
      </div>
      <div className="text-right">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.kind}</p>
        <p className="mt-1 text-sm font-medium text-[#f77f00]">Open</p>
      </div>
    </button>
  );
}

function ReminderRow({ reminder, onOpen }: { reminder: MyDayReminderRecord; onOpen: (target?: string) => void }) {
  const toneClass =
    reminder.tone === "success"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
      : reminder.tone === "warning"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
        : "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200";

  return (
    <button
      type="button"
      onClick={() => onOpen(reminder.target)}
      className={`flex w-full items-center justify-between gap-4 rounded-3xl px-4 py-3 text-left text-sm font-semibold ${toneClass}`}
    >
      <span>{reminder.label}</span>
      <span>Open →</span>
    </button>
  );
}

function ListShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CreatorMyDayDashboardPage() {
  const navigate = useNavigate();
  const workspaceQuery = useMyDayWorkspaceQuery();
  const workspace = workspaceQuery.data;

  const open = (target?: string) => {
    if (!target) return;
    navigate(target);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader pageTitle="My Day" mobileViewType="hide" />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-6 sm:px-4 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Daily operating cockpit</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{workspace?.hero.title ?? "Loading your day…"}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">{workspace?.hero.subtitle}</p>
          <div className="mt-4 inline-flex rounded-full bg-[#f77f00]/10 px-4 py-2 text-sm font-semibold text-[#f77f00]">
            Focus: {workspace?.hero.focus ?? "No focus block yet"}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(workspace?.kpis ?? []).map((item) => (
            <KpiCard key={item.id} item={item} onOpen={open} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="grid gap-6">
            <ListShell title="Today’s agenda">
              <div className="space-y-3">
                {(workspace?.agenda ?? []).map((item) => (
                  <AgendaRow key={item.id} item={item} onOpen={open} />
                ))}
              </div>
            </ListShell>

            <ListShell title="Priority tasks">
              <div className="space-y-3">
                {(workspace?.tasks ?? []).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => open("/task-board")}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{task.brand || task.supplier || task.campaign}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{task.priority}</p>
                      <p className="mt-1 text-sm font-medium text-[#f77f00]">{task.dueLabel || task.column}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ListShell>
          </div>

          <div className="grid gap-6">
            <ListShell title="Upcoming live sessions">
              <div className="space-y-3">
                {(workspace?.sessions ?? []).map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => open(`/live-studio?sessionId=${encodeURIComponent(session.id)}`)}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{session.title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{session.seller}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-300">
                      <p>{session.time}</p>
                      <p className="mt-1 font-medium text-[#f77f00]">{session.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ListShell>

            <ListShell title="Active proposal threads">
              <div className="space-y-3">
                {(workspace?.proposals ?? []).map((proposal) => (
                  <button
                    key={proposal.id}
                    type="button"
                    onClick={() => open(`/proposal-room?proposalId=${encodeURIComponent(proposal.id)}`)}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{proposal.campaign}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{proposal.brand}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{proposal.origin}</p>
                      <p className="mt-1 text-sm font-medium text-[#f77f00]">{proposal.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ListShell>

            <ListShell title="Reminders">
              <div className="space-y-3">
                {(workspace?.reminders ?? []).map((reminder) => (
                  <ReminderRow key={`${reminder.label}-${reminder.target}`} reminder={reminder} onOpen={open} />
                ))}
              </div>
            </ListShell>
          </div>
        </section>
      </main>
    </div>
  );
}
