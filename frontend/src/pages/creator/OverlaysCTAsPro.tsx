import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, QrCode, Save, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { OverlayToolConfigRecord } from "../../api/types";
import { SupportButton, SupportInput, SupportPage, SupportSection, SupportSelect, SupportStat, SupportToggle, EmptyState, ErrorState, LoadingState } from "../../components/live/SupportSurface";
import { useNotification } from "../../contexts/NotificationContext";
import { useLiveSessionsQuery } from "../../hooks/api/useLiveRuntime";
import { useOverlaysToolQuery, useUpdateOverlaysToolMutation } from "../../hooks/api/useLiveSupportTools";

const VARIANT_OPTIONS = ["Variant A", "Variant B", "Variant C"];

const EMPTY_CONFIG: OverlayToolConfigRecord = {
  sessionId: "",
  variant: "Variant B",
  qrEnabled: true,
  qrLabel: "Scan to shop",
  qrUrl: "",
  destUrl: ""
};

export default function OverlaysCTAsPro() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useNotification();
  const toolQuery = useOverlaysToolQuery();
  const liveSessionsQuery = useLiveSessionsQuery({ pageSize: 50 });
  const updateToolMutation = useUpdateOverlaysToolMutation();

  const sessions = liveSessionsQuery.data?.items ?? [];
  const [formState, setFormState] = useState<OverlayToolConfigRecord>(EMPTY_CONFIG);
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
    qrState: formState.qrEnabled ? "On" : "Off",
    variant: formState.variant || "—",
    destinationSet: formState.destUrl ? "Ready" : "Missing",
    sessionStatus: selectedSession?.status || "Draft"
  }), [formState.destUrl, formState.qrEnabled, formState.variant, selectedSession?.status]);

  const handleSave = async () => {
    try {
      await updateToolMutation.mutateAsync({
        sessionId: formState.sessionId,
        variant: formState.variant,
        qrEnabled: Boolean(formState.qrEnabled),
        qrLabel: formState.qrLabel,
        qrUrl: formState.qrUrl,
        destUrl: formState.destUrl
      });
      showSuccess("Overlay and CTA settings saved to the backend.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save overlay settings.");
    }
  };

  if ((toolQuery.isLoading && !toolQuery.data) || (liveSessionsQuery.isLoading && sessions.length === 0)) {
    return (
      <SupportPage title="Overlays & CTAs">
        <LoadingState label="Loading overlay settings…" />
      </SupportPage>
    );
  }

  if ((toolQuery.error && !toolQuery.data) || (liveSessionsQuery.error && sessions.length === 0)) {
    return (
      <SupportPage title="Overlays & CTAs">
        <ErrorState message={(toolQuery.error || liveSessionsQuery.error) instanceof Error ? ((toolQuery.error || liveSessionsQuery.error) as Error).message : "Could not load the overlays workspace."} />
      </SupportPage>
    );
  }

  return (
    <SupportPage
      title="Overlays & CTAs"
      badge={<span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Backend-driven</span>}
      rightContent={<SupportButton tone="primary" onClick={handleSave} disabled={updateToolMutation.isPending}>{updateToolMutation.isPending ? "Saving…" : "Save overlays"}</SupportButton>}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <SupportStat label="QR code" value={stats.qrState} />
        <SupportStat label="Variant" value={stats.variant} accent />
        <SupportStat label="Destination" value={stats.destinationSet} />
        <SupportStat label="Session status" value={stats.sessionStatus} />
      </section>

      <SupportSection title="Session + CTA base settings" description="Overlay configuration now hydrates from and persists through the live tools backend.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_220px_140px]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Live session</label>
            <SupportSelect value={formState.sessionId || ""} onChange={(event) => setFormState((current) => ({ ...current, sessionId: event.target.value }))}>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.title} · {session.status}</option>
              ))}
            </SupportSelect>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Overlay variant</label>
            <SupportSelect value={formState.variant || "Variant B"} onChange={(event) => setFormState((current) => ({ ...current, variant: event.target.value }))}>
              {VARIANT_OPTIONS.map((variant) => (
                <option key={variant} value={variant}>{variant}</option>
              ))}
            </SupportSelect>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">QR enabled</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{formState.qrEnabled ? "Enabled" : "Disabled"}</span>
              <SupportToggle checked={Boolean(formState.qrEnabled)} onChange={(value) => setFormState((current) => ({ ...current, qrEnabled: value }))} />
            </div>
          </div>
        </div>
      </SupportSection>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_430px]">
        <SupportSection title="CTA content" description="These values now persist, so the studio and future runtime screens can hydrate the same chosen overlay setup.">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">QR label</label>
              <SupportInput value={formState.qrLabel || ""} onChange={(event) => setFormState((current) => ({ ...current, qrLabel: event.target.value }))} placeholder="Scan to shop" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">QR URL</label>
              <SupportInput value={formState.qrUrl || ""} onChange={(event) => setFormState((current) => ({ ...current, qrUrl: event.target.value }))} placeholder="https://go.mylivedealz.com/..." />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Primary destination URL</label>
            <SupportInput value={formState.destUrl || ""} onChange={(event) => setFormState((current) => ({ ...current, destUrl: event.target.value }))} placeholder="https://mldz.link/..." />
          </div>
        </SupportSection>

        <SupportSection title="Overlay preview" description="Quick summary of the persisted CTA payload.">
          {selectedSession ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Sparkles className="h-4 w-4 text-[#f77f00]" /> {selectedSession.title}</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Variant</div>
                  <div className="mt-1 font-semibold">{formState.variant}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><QrCode className="h-3.5 w-3.5" /> QR call-to-action</div>
                  <div className="mt-1 font-semibold">{formState.qrEnabled ? formState.qrLabel || "Scan to shop" : "QR disabled"}</div>
                  <div className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{formState.qrUrl || "No QR URL saved yet."}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><ExternalLink className="h-3.5 w-3.5" /> Destination</div>
                  <div className="mt-1 break-all text-sm font-semibold">{formState.destUrl || "No destination URL saved yet."}</div>
                </div>
              </div>
            </div>
          ) : <EmptyState message="Pick a live session to preview the saved overlay configuration." />}
        </SupportSection>
      </div>
    </SupportPage>
  );
}
