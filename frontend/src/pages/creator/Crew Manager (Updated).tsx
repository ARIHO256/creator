import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, Save, Trash2, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { CrewAssignmentRecord } from "../../api/types";
import { SupportButton, SupportInput, SupportPage, SupportSection, SupportSelect, SupportStat, EmptyState, ErrorState, LoadingState } from "../../components/live/SupportSurface";
import { useNotification } from "../../contexts/NotificationContext";
import { useCrewWorkspaceQuery, useUpdateCrewSessionMutation } from "../../hooks/api/useLiveSupportTools";

function formatWhen(iso?: string) {
  if (!iso) return "TBD";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "TBD" : date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function overlaps(startA?: string, endA?: string, startB?: string, endB?: string) {
  if (!startA || !endA || !startB || !endB) return false;
  const a1 = new Date(startA).getTime();
  const a2 = new Date(endA).getTime();
  const b1 = new Date(startB).getTime();
  const b2 = new Date(endB).getTime();
  if ([a1, a2, b1, b2].some(Number.isNaN)) return false;
  return Math.max(a1, b1) < Math.min(a2, b2);
}

const DEFAULT_ASSIGNMENT: CrewAssignmentRecord = { memberId: "", roleId: "" };

export default function CreatorLiveCrewCohostManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useNotification();
  const crewWorkspaceQuery = useCrewWorkspaceQuery();
  const updateCrewMutation = useUpdateCrewSessionMutation();

  const workspace = crewWorkspaceQuery.data;
  const sessions = workspace?.liveSessions ?? [];
  const roles = workspace?.roles ?? [];
  const members = workspace?.members ?? [];
  const availabilityByMember = workspace?.crew?.availabilityByMember ?? {};

  const initialSessionId = searchParams.get("sessionId")?.trim();
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId || "");
  const [draftAssignments, setDraftAssignments] = useState<CrewAssignmentRecord[]>([]);

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(initialSessionId && sessions.some((session) => session.id === initialSessionId) ? initialSessionId : sessions[0].id);
    }
  }, [initialSessionId, selectedSessionId, sessions]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  );

  const persistedAssignments = useMemo(
    () => workspace?.crew?.sessions.find((entry) => entry.sessionId === selectedSessionId)?.assignments ?? [],
    [selectedSessionId, workspace]
  );

  useEffect(() => {
    setDraftAssignments(persistedAssignments.length ? persistedAssignments : []);
  }, [persistedAssignments, selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("sessionId", selectedSessionId);
        return next;
      }, { replace: true });
    }
  }, [selectedSessionId, setSearchParams]);

  const conflicts = useMemo(() => {
    if (!selectedSession?.scheduledFor || !selectedSession.durationMin) return [] as string[];
    const startISO = selectedSession.scheduledFor;
    const endISO = new Date(new Date(selectedSession.scheduledFor).getTime() + Number(selectedSession.durationMin || 0) * 60_000).toISOString();

    return members
      .filter((member) => (availabilityByMember[member.id] ?? []).some((event) => overlaps(startISO, endISO, event.startISO, event.endISO)))
      .map((member) => member.id);
  }, [availabilityByMember, members, selectedSession]);

  const stats = useMemo(() => ({
    liveSessions: sessions.length,
    members: members.length,
    assignments: draftAssignments.filter((entry) => entry.memberId && entry.roleId).length,
    conflicts: conflicts.length
  }), [conflicts.length, draftAssignments, members.length, sessions.length]);

  const canSave = Boolean(selectedSessionId) && draftAssignments.every((entry) => entry.memberId && entry.roleId);

  const handleAssignmentChange = (index: number, key: keyof CrewAssignmentRecord, value: string) => {
    setDraftAssignments((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [key]: value } : entry)));
  };

  const handleAddAssignment = () => {
    setDraftAssignments((current) => [...current, { ...DEFAULT_ASSIGNMENT }]);
  };

  const handleRemoveAssignment = (index: number) => {
    setDraftAssignments((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  const handleSave = async () => {
    if (!selectedSessionId) return;
    if (!canSave) {
      showError("Please complete each crew assignment row before saving.");
      return;
    }

    try {
      await updateCrewMutation.mutateAsync({ sessionId: selectedSessionId, assignments: draftAssignments });
      showSuccess("Crew assignments saved to the backend.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save crew assignments.");
    }
  };

  if (crewWorkspaceQuery.isLoading && !workspace) {
    return (
      <SupportPage title="Crew Manager">
        <LoadingState label="Loading crew workspace…" />
      </SupportPage>
    );
  }

  if (crewWorkspaceQuery.error && !workspace) {
    return (
      <SupportPage title="Crew Manager">
        <ErrorState message={crewWorkspaceQuery.error instanceof Error ? crewWorkspaceQuery.error.message : "Could not load the crew workspace."} />
      </SupportPage>
    );
  }

  return (
    <SupportPage
      title="Crew Manager"
      badge={<span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Backend-driven</span>}
      rightContent={<SupportButton tone="primary" onClick={handleSave} disabled={!canSave || updateCrewMutation.isPending}>{updateCrewMutation.isPending ? "Saving…" : "Save crew"}</SupportButton>}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <SupportStat label="Live sessions" value={stats.liveSessions} />
        <SupportStat label="Team members" value={stats.members} />
        <SupportStat label="Session assignments" value={stats.assignments} accent />
        <SupportStat label="Availability conflicts" value={stats.conflicts} />
      </section>

      <SupportSection title="Session selector" description="Choose the live session whose crew you want to manage.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_1fr_1fr]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Live session</label>
            <SupportSelect value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.title} · {session.status}</option>
              ))}
            </SupportSelect>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Scheduled</div>
            <div className="mt-1 font-semibold">{formatWhen(selectedSession?.scheduledFor)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Campaign</div>
            <div className="mt-1 font-semibold">{selectedSession?.campaign || "No campaign linked"}</div>
          </div>
        </div>
      </SupportSection>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <SupportSection
          title="Crew assignments"
          description="Assignments on this screen now persist directly to backend crew session records."
          right={<SupportButton onClick={handleAddAssignment}><Plus className="h-4 w-4" /> Add row</SupportButton>}
        >
          {draftAssignments.length === 0 ? <EmptyState message="No crew is assigned yet for this session. Add at least one row to save producer, moderator, or co-host assignments." /> : null}

          <div className="space-y-3">
            {draftAssignments.map((assignment, index) => (
              <div key={`${assignment.memberId || "member"}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950 md:grid-cols-[minmax(0,1fr)_220px_48px]">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Team member</label>
                  <SupportSelect value={assignment.memberId} onChange={(event) => handleAssignmentChange(index, "memberId", event.target.value)}>
                    <option value="">Select a team member</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>{member.name || member.email || member.id} · {member.status || "Active"}</option>
                    ))}
                  </SupportSelect>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Role on this session</label>
                  <SupportSelect value={assignment.roleId} onChange={(event) => handleAssignmentChange(index, "roleId", event.target.value)}>
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </SupportSelect>
                </div>
                <div className="flex items-end">
                  <SupportButton onClick={() => handleRemoveAssignment(index)} tone="danger"><Trash2 className="h-4 w-4" /></SupportButton>
                </div>
              </div>
            ))}
          </div>
        </SupportSection>

        <div className="space-y-4">
          <SupportSection title="Availability overview" description="Crew availability is read from the backend workspace feed so scheduling conflicts are visible before you save.">
            {selectedSession ? (
              <div className="space-y-3">
                {members.map((member) => {
                  const events = availabilityByMember[member.id] ?? [];
                  const blocked = conflicts.includes(member.id);
                  return (
                    <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-50">{member.name || member.email || member.id}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{member.email || "No email"}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${blocked ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"}`}>
                          {blocked ? "Busy" : "Available"}
                        </span>
                      </div>
                      <div className="mt-2 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                        {events.length === 0 ? <div>No calendar blocks recorded.</div> : events.map((event) => (
                          <div key={event.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                            <div className="font-semibold text-slate-700 dark:text-slate-200">{event.title}</div>
                            <div>{formatWhen(event.startISO)} → {formatWhen(event.endISO)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState message="Select a session to review availability." />}
          </SupportSection>

          <SupportSection title="What is persisted" description="These values are now loaded from and saved back to the backend instead of remaining on this page only.">
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-[#f77f00]" /> Session crew assignments</li>
              <li className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#f77f00]" /> Team availability blocks</li>
              <li className="flex items-center gap-2"><Save className="h-4 w-4 text-[#f77f00]" /> Immediate cache refresh for live session screens</li>
            </ul>
          </SupportSection>
        </div>
      </div>
    </SupportPage>
  );
}
