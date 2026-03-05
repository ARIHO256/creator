import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Flame, Save, Send } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { LiveAlertsToolConfigRecord } from "../../api/types";
import { SupportButton, SupportCheckbox, SupportInput, SupportPage, SupportSection, SupportSelect, SupportStat, SupportTextarea, EmptyState, ErrorState, LoadingState } from "../../components/live/SupportSurface";
import { useNotification } from "../../contexts/NotificationContext";
import { useLiveSessionsQuery } from "../../hooks/api/useLiveRuntime";
import { useLiveAlertsToolQuery, useUpdateLiveAlertsToolMutation } from "../../hooks/api/useLiveSupportTools";

const DESTINATION_OPTIONS = [
  { value: "WhatsApp", description: "Fast broadcast-style alerts for high-intent viewers." },
  { value: "Telegram", description: "Great for community announcement drops." },
  { value: "Push", description: "Good for short live-now alerts." },
  { value: "SMS", description: "Use for limited, urgent last-chance prompts." },
  { value: "Email", description: "Longer-form reminder or replay notes." }
] as const;

const EMPTY_CONFIG: LiveAlertsToolConfigRecord = {
  sessionId: "",
  enabledDestinations: [],
  draftText: "",
  frequencyCapMinutes: 15
};

export default function LiveAlertsManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showInfo, showSuccess } = useNotification();
  const toolQuery = useLiveAlertsToolQuery();
  const liveSessionsQuery = useLiveSessionsQuery({ pageSize: 50 });
  const updateToolMutation = useUpdateLiveAlertsToolMutation();

  const sessions = liveSessionsQuery.data?.items ?? [];
  const [formState, setFormState] = useState<LiveAlertsToolConfigRecord>(EMPTY_CONFIG);
  const preferredSessionId = searchParams.get("sessionId")?.trim();

  useEffect(() => {
    if (!toolQuery.data) return;
    setFormState({
      ...EMPTY_CONFIG,
      ...toolQuery.data,
      sessionId: preferredSessionId || toolQuery.data.sessionId || sessions[0]?.id || ""
    });
  }, [preferredSessionId, sessions, toolQuery.data]);

  useEffect(() => {
    if (formState.sessionId) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("sessionId", formState.sessionId || "");
        return next;
      }, { replace: true });
    }
  }, [formState.sessionId, setSearchParams]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === formState.sessionId) ?? null,
    [formState.sessionId, sessions]
  );

  const stats = useMemo(() => ({
    destinations: formState.enabledDestinations?.length || 0,
    cap: formState.frequencyCapMinutes || 0,
    draftLength: formState.draftText?.trim().length || 0,
    status: selectedSession?.status || "Draft"
  }), [formState.draftText, formState.enabledDestinations, formState.frequencyCapMinutes, selectedSession?.status]);

  const handleToggleDestination = (value: string, enabled: boolean) => {
    setFormState((current) => {
      const next = new Set(current.enabledDestinations || []);
      if (enabled) next.add(value);
      else next.delete(value);
      return { ...current, enabledDestinations: Array.from(next) };
    });
  };

  const handleSave = async () => {
    try {
      await updateToolMutation.mutateAsync({
        sessionId: formState.sessionId,
        enabledDestinations: formState.enabledDestinations,
        draftText: formState.draftText,
        frequencyCapMinutes: Number(formState.frequencyCapMinutes || 0)
      });
      showSuccess("Live alert settings saved to the backend.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save the live alerts setup.");
    }
  };

  if ((toolQuery.isLoading && !toolQuery.data) || (liveSessionsQuery.isLoading && sessions.length === 0)) {
    return (
      <SupportPage title="Live Alerts">
        <LoadingState label="Loading live alert settings…" />
      </SupportPage>
    );
  }

  if ((toolQuery.error && !toolQuery.data) || (liveSessionsQuery.error && sessions.length === 0)) {
    return (
      <SupportPage title="Live Alerts">
        <ErrorState message={(toolQuery.error || liveSessionsQuery.error) instanceof Error ? ((toolQuery.error || liveSessionsQuery.error) as Error).message : "Could not load the live alerts page."} />
      </SupportPage>
    );
  }

  return (
    <SupportPage
      title="Live Alerts"
      badge={<span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Backend-driven</span>}
      rightContent={<SupportButton tone="primary" onClick={handleSave} disabled={updateToolMutation.isPending}>{updateToolMutation.isPending ? "Saving…" : "Save alerts"}</SupportButton>}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <SupportStat label="Destinations" value={stats.destinations} />
        <SupportStat label="Frequency cap" value={`${stats.cap} min`} accent />
        <SupportStat label="Message length" value={stats.draftLength} />
        <SupportStat label="Session status" value={stats.status} />
      </section>

      <SupportSection title="Session and alert rules" description="This page now reads and writes its main configuration against the live tools backend routes.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_200px]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Live session</label>
            <SupportSelect value={formState.sessionId || ""} onChange={(event) => setFormState((current) => ({ ...current, sessionId: event.target.value }))}>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.title} · {session.status}</option>
              ))}
            </SupportSelect>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Frequency cap (minutes)</label>
            <SupportInput
              type="number"
              min={1}
              value={String(formState.frequencyCapMinutes ?? 15)}
              onChange={(event) => setFormState((current) => ({ ...current, frequencyCapMinutes: Number(event.target.value || 0) }))}
            />
          </div>
        </div>
      </SupportSection>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_440px]">
        <SupportSection title="Enabled destinations" description="Choose where quick live alerts are allowed to go for the selected session.">
          <div className="grid gap-3 md:grid-cols-2">
            {DESTINATION_OPTIONS.map((option) => (
              <SupportCheckbox
                key={option.value}
                checked={(formState.enabledDestinations || []).includes(option.value)}
                onChange={(checked) => handleToggleDestination(option.value, checked)}
                label={option.value}
                description={option.description}
              />
            ))}
          </div>
        </SupportSection>

        <SupportSection title="Alert copy" description="Edit the message that the creator can fire during the live. It now persists through the backend config record.">
          <SupportTextarea
            rows={8}
            value={formState.draftText || ""}
            onChange={(event) => setFormState((current) => ({ ...current, draftText: event.target.value }))}
            placeholder="We're live. Join now and catch the deal drop before stock runs out."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <SupportButton onClick={() => showInfo("Preview only: the alert draft is saved, but this demo does not dispatch real outbound messages from the container.")}>Preview behavior</SupportButton>
            <SupportButton onClick={() => setFormState((current) => ({ ...current, draftText: "We’re live now — tap in before the best offers sell out." }))}>Use quick preset</SupportButton>
          </div>
        </SupportSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SupportSection title="Selected session preview" description="Use this summary to confirm that the alert payload is attached to the right live session.">
          {selectedSession ? (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="text-lg font-semibold">{selectedSession.title}</div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Campaign</div>
                  <div className="mt-1 font-medium">{selectedSession.campaign || "Not linked"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Supplier</div>
                  <div className="mt-1 font-medium">{selectedSession.seller || "Unassigned"}</div>
                </div>
              </div>
            </div>
          ) : <EmptyState message="Pick a live session to attach and preview alert settings." />}
        </SupportSection>

        <SupportSection title="What is now persisted" description="The key alert controls are no longer trapped inside page-only state.">
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2"><Bell className="h-4 w-4 text-[#f77f00]" /> Enabled destinations list</li>
            <li className="flex items-center gap-2"><Flame className="h-4 w-4 text-[#f77f00]" /> Frequency cap value</li>
            <li className="flex items-center gap-2"><Send className="h-4 w-4 text-[#f77f00]" /> Draft live alert copy</li>
            <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[#f77f00]" /> Session binding for later runtime hydration</li>
          </ul>
        </SupportSection>
      </div>
    </SupportPage>
  );
}
