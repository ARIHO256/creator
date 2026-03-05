import React, { useEffect, useMemo, useState } from "react";
import { Bell, Link2, MessageCircle, Save, Timer } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { AudienceNotificationsToolConfigRecord } from "../../api/types";
import { SupportButton, SupportCheckbox, SupportInput, SupportPage, SupportSection, SupportSelect, SupportStat, SupportTextarea, EmptyState, ErrorState, LoadingState } from "../../components/live/SupportSurface";
import { useNotification } from "../../contexts/NotificationContext";
import { useLiveSessionsQuery } from "../../hooks/api/useLiveRuntime";
import { useAudienceNotificationsToolQuery, useUpdateAudienceNotificationsToolMutation } from "../../hooks/api/useLiveSupportTools";

const CHANNEL_OPTIONS = [
  { value: "WhatsApp", description: "Tap-to-start message journeys and reminders." },
  { value: "SMS", description: "Simple reminder fallback for urgent prompts." },
  { value: "Push", description: "App/device reminders for warm audiences." },
  { value: "Telegram", description: "Community-style reminders and announcements." },
  { value: "Email", description: "Replay-ready follow-up and reminder backup." }
] as const;

const REMINDER_OPTIONS = [
  { value: "T-24h", description: "Prime the audience the day before the session." },
  { value: "T-1h", description: "High-intent reminder an hour before go-live." },
  { value: "T-10m", description: "Final countdown reminder close to start time." },
  { value: "Live Now", description: "Immediate notification when the session starts." },
  { value: "Deal Drop", description: "Use when a major offer becomes available." },
  { value: "Replay Ready", description: "Promote the replay after the live ends." }
] as const;

const EMPTY_CONFIG: AudienceNotificationsToolConfigRecord = {
  enabledChannels: [],
  enabledReminders: [],
  replayDelayMinutes: 30,
  sessionId: ""
};

export default function AudienceNotifications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useNotification();
  const toolQuery = useAudienceNotificationsToolQuery();
  const liveSessionsQuery = useLiveSessionsQuery({ pageSize: 50 });
  const updateToolMutation = useUpdateAudienceNotificationsToolMutation();

  const sessions = liveSessionsQuery.data?.items ?? [];
  const [formState, setFormState] = useState<AudienceNotificationsToolConfigRecord>(EMPTY_CONFIG);

  const preferredSessionId = searchParams.get("sessionId")?.trim();

  useEffect(() => {
    if (!toolQuery.data) return;
    const fallbackSessionId = preferredSessionId || toolQuery.data.sessionId || sessions[0]?.id || "";
    setFormState({
      ...EMPTY_CONFIG,
      ...toolQuery.data,
      sessionId: fallbackSessionId
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
    enabledChannels: formState.enabledChannels?.length || 0,
    enabledReminders: formState.enabledReminders?.length || 0,
    replayDelayMinutes: formState.replayDelayMinutes || 0,
    sessionStatus: selectedSession?.status || "Draft"
  }), [formState.enabledChannels, formState.enabledReminders, formState.replayDelayMinutes, selectedSession?.status]);

  const handleToggleListValue = (key: "enabledChannels" | "enabledReminders", value: string, enabled: boolean) => {
    setFormState((current) => {
      const currentValues = new Set(current[key] || []);
      if (enabled) currentValues.add(value);
      else currentValues.delete(value);
      return { ...current, [key]: Array.from(currentValues) };
    });
  };

  const handleSave = async () => {
    try {
      await updateToolMutation.mutateAsync({
        sessionId: formState.sessionId,
        enabledChannels: formState.enabledChannels,
        enabledReminders: formState.enabledReminders,
        replayDelayMinutes: Number(formState.replayDelayMinutes || 0)
      });
      showSuccess("Audience notification settings saved to the backend.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save audience notification settings.");
    }
  };

  if ((toolQuery.isLoading && !toolQuery.data) || (liveSessionsQuery.isLoading && sessions.length === 0)) {
    return (
      <SupportPage title="Audience Notifications">
        <LoadingState label="Loading audience notification settings…" />
      </SupportPage>
    );
  }

  if ((toolQuery.error && !toolQuery.data) || (liveSessionsQuery.error && sessions.length === 0)) {
    return (
      <SupportPage title="Audience Notifications">
        <ErrorState message={(toolQuery.error || liveSessionsQuery.error) instanceof Error ? ((toolQuery.error || liveSessionsQuery.error) as Error).message : "Could not load this page."} />
      </SupportPage>
    );
  }

  return (
    <SupportPage
      title="Audience Notifications"
      badge={<span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Backend-driven</span>}
      rightContent={<SupportButton tone="primary" onClick={handleSave} disabled={updateToolMutation.isPending}>{updateToolMutation.isPending ? "Saving…" : "Save settings"}</SupportButton>}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <SupportStat label="Enabled channels" value={stats.enabledChannels} />
        <SupportStat label="Reminder triggers" value={stats.enabledReminders} />
        <SupportStat label="Replay delay" value={`${stats.replayDelayMinutes} min`} accent />
        <SupportStat label="Session status" value={stats.sessionStatus} />
      </section>

      <SupportSection title="Session and reminder window" description="Audience notification settings now load from and save to the live tools backend payload.">
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Replay delay (minutes)</label>
            <SupportInput
              type="number"
              min={0}
              value={String(formState.replayDelayMinutes ?? 0)}
              onChange={(event) => setFormState((current) => ({ ...current, replayDelayMinutes: Number(event.target.value || 0) }))}
            />
          </div>
        </div>
      </SupportSection>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <SupportSection title="Channels" description="Choose where initiation prompts and reminders should run for the selected live session.">
          <div className="grid gap-3 md:grid-cols-2">
            {CHANNEL_OPTIONS.map((option) => (
              <SupportCheckbox
                key={option.value}
                checked={(formState.enabledChannels || []).includes(option.value)}
                onChange={(checked) => handleToggleListValue("enabledChannels", option.value, checked)}
                label={option.value}
                description={option.description}
              />
            ))}
          </div>
        </SupportSection>

        <SupportSection title="Reminder triggers" description="Turn reminder moments on or off. These selections are now persisted via the backend tool record.">
          <div className="space-y-3">
            {REMINDER_OPTIONS.map((option) => (
              <SupportCheckbox
                key={option.value}
                checked={(formState.enabledReminders || []).includes(option.value)}
                onChange={(checked) => handleToggleListValue("enabledReminders", option.value, checked)}
                label={option.value}
                description={option.description}
              />
            ))}
          </div>
        </SupportSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_460px]">
        <SupportSection title="Session preview" description="Use this summary to confirm which live session the reminder rules are attached to.">
          {selectedSession ? (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Session</div>
                <div className="mt-1 text-lg font-semibold">{selectedSession.title}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Campaign</div>
                  <div className="mt-1 text-sm font-medium">{selectedSession.campaign || "Not linked"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Supplier</div>
                  <div className="mt-1 text-sm font-medium">{selectedSession.seller || "Unassigned"}</div>
                </div>
              </div>
            </div>
          ) : <EmptyState message="Pick a live session to preview the reminder setup." />}
        </SupportSection>

        <SupportSection title="What is now saved" description="This page no longer depends on local-only state for its main workflow.">
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2"><Bell className="h-4 w-4 text-[#f77f00]" /> Enabled notification channels</li>
            <li className="flex items-center gap-2"><Timer className="h-4 w-4 text-[#f77f00]" /> Reminder trigger schedule</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[#f77f00]" /> Replay-delay setting used for follow-up timing</li>
            <li className="flex items-center gap-2"><Link2 className="h-4 w-4 text-[#f77f00]" /> Session linkage through backend session ids</li>
          </ul>
        </SupportSection>
      </div>
    </SupportPage>
  );
}
