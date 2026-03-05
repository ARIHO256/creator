import React, { useEffect, useMemo, useState } from "react";
import { Radio, Save, Settings2, Video } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { StreamingToolConfigRecord } from "../../api/types";
import { SupportButton, SupportCheckbox, SupportPage, SupportSection, SupportSelect, SupportStat, SupportToggle, EmptyState, ErrorState, LoadingState } from "../../components/live/SupportSurface";
import { useNotification } from "../../contexts/NotificationContext";
import { useLiveSessionsQuery } from "../../hooks/api/useLiveRuntime";
import { useStreamingToolQuery, useUpdateStreamingToolMutation } from "../../hooks/api/useLiveSupportTools";

const DESTINATION_OPTIONS = [
  { value: "TikTok Live", description: "High-reach short-form live destination." },
  { value: "Instagram Live", description: "Core live shopping surface for followers." },
  { value: "YouTube Live", description: "Great for longer-form and replay discovery." },
  { value: "Facebook Live", description: "Useful for mature brand communities." },
  { value: "Telegram Live", description: "Community-centric broadcast flow." }
] as const;

const EMPTY_CONFIG: StreamingToolConfigRecord = {
  sessionId: "",
  selectedDestinations: [],
  advancedOpen: false,
  recordMaster: true,
  autoReplay: true,
  autoHighlights: true
};

export default function StreamToPlatformsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useNotification();
  const toolQuery = useStreamingToolQuery();
  const liveSessionsQuery = useLiveSessionsQuery({ pageSize: 50 });
  const updateToolMutation = useUpdateStreamingToolMutation();

  const sessions = liveSessionsQuery.data?.items ?? [];
  const [formState, setFormState] = useState<StreamingToolConfigRecord>(EMPTY_CONFIG);
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
    destinations: formState.selectedDestinations?.length || 0,
    master: formState.recordMaster ? "On" : "Off",
    replay: formState.autoReplay ? "On" : "Off",
    highlights: formState.autoHighlights ? "On" : "Off"
  }), [formState.autoHighlights, formState.autoReplay, formState.recordMaster, formState.selectedDestinations]);

  const handleToggleDestination = (value: string, enabled: boolean) => {
    setFormState((current) => {
      const next = new Set(current.selectedDestinations || []);
      if (enabled) next.add(value);
      else next.delete(value);
      return { ...current, selectedDestinations: Array.from(next) };
    });
  };

  const handleSave = async () => {
    try {
      await updateToolMutation.mutateAsync({
        sessionId: formState.sessionId,
        selectedDestinations: formState.selectedDestinations,
        advancedOpen: Boolean(formState.advancedOpen),
        recordMaster: Boolean(formState.recordMaster),
        autoReplay: Boolean(formState.autoReplay),
        autoHighlights: Boolean(formState.autoHighlights)
      });
      showSuccess("Streaming destination settings saved to the backend.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save streaming settings.");
    }
  };

  if ((toolQuery.isLoading && !toolQuery.data) || (liveSessionsQuery.isLoading && sessions.length === 0)) {
    return (
      <SupportPage title="Stream to Platforms">
        <LoadingState label="Loading stream destination settings…" />
      </SupportPage>
    );
  }

  if ((toolQuery.error && !toolQuery.data) || (liveSessionsQuery.error && sessions.length === 0)) {
    return (
      <SupportPage title="Stream to Platforms">
        <ErrorState message={(toolQuery.error || liveSessionsQuery.error) instanceof Error ? ((toolQuery.error || liveSessionsQuery.error) as Error).message : "Could not load the stream destination surface."} />
      </SupportPage>
    );
  }

  return (
    <SupportPage
      title="Stream to Platforms"
      badge={<span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Backend-driven</span>}
      rightContent={<SupportButton tone="primary" onClick={handleSave} disabled={updateToolMutation.isPending}>{updateToolMutation.isPending ? "Saving…" : "Save destinations"}</SupportButton>}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <SupportStat label="Selected destinations" value={stats.destinations} accent />
        <SupportStat label="Record master" value={stats.master} />
        <SupportStat label="Auto replay" value={stats.replay} />
        <SupportStat label="Auto highlights" value={stats.highlights} />
      </section>

      <SupportSection title="Session and stream mode" description="Destination and post-stream automation settings now persist directly to backend tool records.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_220px]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Live session</label>
            <SupportSelect value={formState.sessionId || ""} onChange={(event) => setFormState((current) => ({ ...current, sessionId: event.target.value }))}>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.title} · {session.status}</option>
              ))}
            </SupportSelect>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Advanced settings</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{formState.advancedOpen ? "Open" : "Collapsed"}</span>
              <SupportToggle checked={Boolean(formState.advancedOpen)} onChange={(value) => setFormState((current) => ({ ...current, advancedOpen: value }))} />
            </div>
          </div>
        </div>
      </SupportSection>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <SupportSection title="Destinations" description="Pick which stream destinations are enabled for the selected live session.">
          <div className="grid gap-3 md:grid-cols-2">
            {DESTINATION_OPTIONS.map((option) => (
              <SupportCheckbox
                key={option.value}
                checked={(formState.selectedDestinations || []).includes(option.value)}
                onChange={(checked) => handleToggleDestination(option.value, checked)}
                label={option.value}
                description={option.description}
              />
            ))}
          </div>
        </SupportSection>

        <SupportSection title="Automation toggles" description="These flags are part of the same backend payload used by later live runtime screens.">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <div>
                <div className="font-semibold">Record master stream</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Keep a clean master recording even while simulcasting.</div>
              </div>
              <SupportToggle checked={Boolean(formState.recordMaster)} onChange={(value) => setFormState((current) => ({ ...current, recordMaster: value }))} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <div>
                <div className="font-semibold">Auto-create replay</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Hand the finished live to the replay flow when the session ends.</div>
              </div>
              <SupportToggle checked={Boolean(formState.autoReplay)} onChange={(value) => setFormState((current) => ({ ...current, autoReplay: value }))} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <div>
                <div className="font-semibold">Auto-generate highlights</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Create highlight clips for the replay workspace after the live.</div>
              </div>
              <SupportToggle checked={Boolean(formState.autoHighlights)} onChange={(value) => setFormState((current) => ({ ...current, autoHighlights: value }))} />
            </div>
          </div>
        </SupportSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SupportSection title="Session preview" description="Quick check that the saved stream setup is attached to the correct live session.">
          {selectedSession ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-lg font-semibold"><Video className="h-4 w-4 text-[#f77f00]" /> {selectedSession.title}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
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
          ) : <EmptyState message="Pick a live session to preview the saved stream routing." />}
        </SupportSection>

        <SupportSection title="What is now persisted" description="These controls are no longer just local toggles on the page.">
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2"><Radio className="h-4 w-4 text-[#f77f00]" /> Selected stream destinations</li>
            <li className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-[#f77f00]" /> Advanced/collapsed panel preference</li>
            <li className="flex items-center gap-2"><Video className="h-4 w-4 text-[#f77f00]" /> Master record flag</li>
            <li className="flex items-center gap-2"><Save className="h-4 w-4 text-[#f77f00]" /> Auto replay and auto highlights toggles</li>
          </ul>
        </SupportSection>
      </div>
    </SupportPage>
  );
}
